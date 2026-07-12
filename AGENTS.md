# AGENTS.md — guide for AI agents working in this repo

This file is the canonical entry point for any AI agent (Claude Code, Cowork, Codex, etc.)
asked to **use, reference, extend, or rebuild** this project. Read it before acting.

## What this repo is

An offline, installable web app (PWA) for logging a saltwater fishing trip **fish by fish** and
estimating the fish-processing bill **at sea, with no internet**. Companion to the Saltwater Trip
Planner. Hosted on GitHub Pages; installed via Safari → Add to Home Screen.

Design in one line: **`index.html` + `engine.js` + a service worker that log every kept fish
individually, compare two San Diego processors, and reconcile estimate vs. actual — all in
device-local storage, nothing uploaded.**

Every logged fish is one that was kept and killed, so **every logged fish bills**. One row serves as
the legal count record, the catch journal, and the cost input simultaneously.

## 🚩 READ THIS BEFORE TOUCHING THE COST MATH

**The v1 cost model was wrong, and the old AGENTS.md told agents to preserve it.** Do not restore it.

v1 kept the engine inline in `index.html`, and the same model was independently re-implemented in the
Numbers spreadsheet (`Saltwater_Fish_Processing_Calculator.xlsx`) and the planner webpage. All three
were verified "penny-for-penny" against each other. That proved only that the three copies **agreed** —
never that any of them was **right**. They weren't:

1. **The 15 lb value-added minimum was applied to a POOLED per-species-per-day total, not per fish.**
   That let two 10 lb yellowfin (20 lb pooled) bill as 20 lb of smoke — value-added the processor will
   not perform. **Pounds do not pool across fish.**
2. **Canning had no minimum at all.** `VAMIN` was checked for smoke and jerky and simply omitted for
   canning — in the JavaScript *and* in the spreadsheet formulas (`L18=SUM(F18)`). The rates sheet
   label even read *"Value-added minimum (smoke/jerky)"*.

**Therefore: "parity with the spreadsheet / the planner webpage" is NOT a correctness criterion and
must never again be written down as one.** Those two artifacts still carry the bugs as of 2026-07-12.
They disagree with this app, and **this app is the correct one.** If asked to make them agree, fix
*them* — do not regress this.

The single source of truth is **`engine.js`**, guarded by `test-engine.js`. If another artifact needs
this math, it reads `engine.js`. **Never copy the engine.**

## The cost model (authoritative)

**Weight is whole-fish weight** — the basis the processor bills on, not fillet yield.

**Tier is species-gated, not weight-derived.** A fish prices at Fisherman's under-12 rate ($2.80/lb —
*higher* than the $1.95 12 lb+ rate) only if its species is under-12 eligible **and** it weighs
under 12 lb.

| Under-12 eligible | Always 12 lb+ rate |
|---|---|
| Yellowtail, Yellowfin, Rockfish, Lingcod, Dorado, Halibut | **Bluefin, Wahoo, White Seabass** |

Five Star is flat $1.97 either way, so tier only ever moves the Fisherman's number.

**Value-added is drawn from an individual fish:**

```
each allocation     = 0, or >= 15 lb        (VAMIN — smoke, jerky, AND canning)
sum of allocations <= that fish's weight
remainder           = fillet, at that fish's tier rate
```

The "must be a ≥15 lb fish" gate is **not coded separately** — it falls out of the arithmetic, since a
10 lb fish cannot source a 15 lb allocation. Do not add it twice.

Consequences to preserve:
- A 15 lb fish can be smoked *or* jerkied, not both — it only has 15 lb to give. That "or" is
  arithmetic, not a rule. Do not hard-code it.
- A 35 lb bluefin can split 15 smoked / 20 jerky. Multiple treatments from one fish are legal.
- Any fish carrying value-added is ≥ 15 lb, hence ≥ 12 lb, so its fillet remainder **always** bills at
  the big rate. **Tier only ever matters for fish with no value-added.**

**Value-added eligibility:** Yellowtail (smoke), Wahoo (smoke), Bluefin (all three), Yellowfin (all
three). **Every other species — including all custom ones — is fillet-only.**

**Sub-minimum allocations must be blocked at input**, with the minimum shown. v1 silently zeroed them
and billed the pounds as plain fillet with nothing on screen to say so. That is the failure mode to
never reproduce.

## File map

| Path | Committed? | Purpose |
|---|---|---|
| `AGENTS.md` | yes | This guide. |
| `README.md` | yes | Human quickstart, install, cost model, and end-of-trip workflow. |
| `CONTRIBUTING.md` | yes | Canonical commit + README standard. |
| `CHANGELOG.md` | yes | Version history. |
| `SPEC-catch-log.md` | yes | Design spec for the per-fish model and the corrected cost rules. |
| `engine.js` | yes | **The cost engine — SINGLE SOURCE OF TRUTH.** Do not duplicate this math. |
| `index.html` | yes | The app — UI, tabs, and local-storage persistence. Loads `engine.js`. |
| `test-engine.js` | yes | Engine regression suite, 61 assertions. `node test-engine.js` |
| `test-dom.js` | yes | UI smoke test, 33 assertions. `node test-dom.js` (needs `jsdom`) |
| `sw.js` | yes | Service worker — offline caching. **Bump the cache name on every app change.** |
| `manifest.webmanifest` | yes | PWA manifest (name, icons, standalone display). |
| `icon-180.png` / `icon-512.png` | yes | iOS home-screen icon + maskable app icon. |
| `LICENSE` | yes | Usage terms. |

## The data contract (device-local trip state + exports)

State lives in the browser's local storage under **`catchlogger.v2`**; there is no server.

```js
state = {
  v: 2,
  days: [{
    date, pay,                                   // 'cash' | 'card'
    fish: [{ id, sp, lb, t, notes, va:{sm,jk,cn} }],   // one row per kept fish
    collars, gillgut, boxes                      // day-level, not species-specific
  }],
  cur,                                           // selected day index
  custom: [{ k, n, u12 }],                       // "Other" species created this trip
  actual: { sp:{}, cnt:{}, collars, gillgut, boxes, pay },   // dock: bulk, off the invoice
  actualProc, invoice,
  rates                                          // device-local override of DEFAULT_RATES
}
```

Rules an agent must preserve:

- **The day is explicit, never inferred from the timestamp.** A 1:15 am bluefin belongs to whichever
  Day is selected. `t` is metadata only.
- **`lb` is whole-fish weight.** Under-12 pounds and fish counts are **derived**, never stored or typed.
- **Offline-first, on-device only.** No network calls for data; nothing is uploaded.
- **Every logged fish bills.** Disposition (released / crew / galley) is deliberately not modeled.
- **Time is back-fillable.** Nobody logs fish during a wide-open bite.
- Two processors are compared (Fisherman's, Five Star) from published rates; the "cheaper processor"
  call depends on the engine being right.

## How it works

1. First load on wifi in **real Safari** registers `sw.js`, which caches the app shell + `engine.js`.
2. Launched from the home-screen icon it runs fully offline; every entry auto-saves to local storage.
3. At the dock the user enters actual weights, **fish counts**, and the invoice; the app reconciles
   invoice vs. computed cost and flags any fish that went missing between the rail and the scale.
4. Export CSV / JSON to move the trip off-device (→ Numbers archive, Day One entry, Open Brain note).

## How to extend

- **Processor rates:** Summary → Rates panel (device), or edit `DEFAULT_RATES` in `engine.js`.
- **Add a species:** add to `SPECIES` in `engine.js` with its `u12` and `sm`/`jk`/`cn` flags. The UI
  picks it up automatically. Add a test to `test-engine.js`.
- **Change cached assets:** update `ASSETS` in `sw.js` **and bump the cache name** (`catch-logger-v2`
  → `-v3`), or installed devices will keep serving the old app forever.
- **Breaking data-model change:** new storage key + a migration path. Do **not** lossily convert — see
  `load()` in `index.html`, which preserves v1 verbatim under `catchlogger.v1.backup` and offers it as
  a download rather than fabricating fish rows from bulk pounds.

## Privacy — hard rules

- All trip data stays in device local storage; the app never uploads. Do not add analytics, remote
  logging, or network sync without Ed's explicit sign-off.
- Public repo → never commit keys or personal identifiers.

## Verification gates (run before declaring a change done)

1. `node test-engine.js` — **61/61 green.** Any change to the cost math needs a new assertion here.
2. `node test-dom.js` — **33/33 green.**
3. Open the hosted URL in **real Safari** (not an in-app browser): species tiles render, a fish can be
   logged, and the day total updates.
4. Log a test day → fully close the app → reopen: the fish are still there, offline.
5. A value-added allocation under 15 lb is **blocked at input**, with the minimum shown — not silently
   zeroed.
6. CSV export and JSON backup round-trip cleanly.
7. `sw.js` cache name bumped if any cached asset changed.
8. Commit follows `CONTRIBUTING.md`; README + CHANGELOG updated on any `feat` / `fix`.

**Gate 3 from the old version — "matches the Trip Planner + Numbers calculator penny-for-penny" — has
been deleted on purpose. It is how the bug survived.** Correctness is defined by `test-engine.js` and
by Fisherman's actual stated policy, not by agreement with other copies.
