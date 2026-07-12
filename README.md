# Catch Logger

Offline, installable iPhone web app that logs a saltwater fishing trip **fish by fish** and estimates the fish‑processing bill — at sea, with no internet.

## Overview / Purpose

On a San Diego long‑range trip there is no signal, and the processing bill is one of the largest costs of the trip after the ticket. Two San Diego processors — **Fisherman's Processing** and **Five Star Fish Processing** — price the same catch very differently depending on fish size and what you have smoked, jerkied, or canned. Deciding which one to use, and roughly what you'll pay, has to happen *before* you dock.

Catch Logger is the tool for that. It is the companion to the **Saltwater Trip Planner** (which answers *"which boats return Tuesday morning?"*). This app answers *"what is my bill going to be, and which processor should I use?"*

Every fish you keep gets one row. That single row does three jobs at once:

1. **The legal record** — fish count by species and day, which you're required to keep.
2. **The catch journal** — time, weight, and a free‑text note on how it ate.
3. **The cost estimate** — the input to the processing engine.

Built for Ed Matibag. Runs entirely on the phone; nothing is uploaded.

## Features

- **Per‑fish logging** — species, whole weight, time, notes. Two taps per fish via a species tile grid (no dropdown on a rolling deck). **Save & add another** keeps the species locked for a run of fish.
- **Fish count captured** — required by law, and the only field that reliably catches a discrepancy at the dock. Pounds drift; count doesn't.
- **Under‑12 pounds derived, never typed** — the most error‑prone field in v1 is gone.
- **Value‑added allocated from a specific fish** — the affordance only appears on a fish that can actually source it (≥ 15 lb, eligible species), with a live remaining‑allowance readout.
- **Live two‑processor comparison** — per day and per trip, with the cheaper one named. The winner can flip once smoking is involved.
- **Count‑integrity check at the dock** — logged fish vs. the processor's scaled count, with any missing fish flagged.
- **Invoice reconciliation** — the real invoice vs. the computed cost.
- **Borderline flag** (`~`) on fish 10–14 lb, where a rail estimate can flip rate tiers.
- **Fully offline** after first load; auto‑saves every entry to device storage.
- **Exports** — CSV (compliance count table + fish‑by‑fish journal), JSON backup, clipboard trip summary.
- **Editable rates** stored on device, so a mid‑season price change doesn't need a code push.
- Ten species: Yellowtail, Bluefin, Yellowfin, Wahoo, Dorado, White Seabass, Halibut, Lingcod, Rockfish, plus **Other** (custom name + under‑12 toggle).

## Files

| File | Purpose |
|---|---|
| `index.html` | The app — UI, tabs, and local‑storage persistence. |
| `engine.js` | **The cost engine. Single source of truth. Do not duplicate this math.** |
| `test-engine.js` | Engine regression suite — 61 assertions. `node test-engine.js` |
| `test-dom.js` | UI smoke test — 33 assertions. `node test-dom.js` (needs `jsdom`) |
| `sw.js` | Service worker — offline caching of the app shell. |
| `manifest.webmanifest` | PWA manifest (name, icons, standalone display). |
| `icon-180.png` / `icon-512.png` | iOS home‑screen icon / maskable app icon. |
| `SPEC-catch-log.md` | Design spec for the per‑fish model and the corrected cost rules. |
| `AGENTS.md` | Canonical guide for AI agents working in this repo. |
| `CONTRIBUTING.md` | Commit + README standard. |
| `CHANGELOG.md` | Version history. |
| `LICENSE` | Usage terms. |

## How to Use

### Install (one‑time, on wifi)

1. Open the Pages URL in **real Safari** — not an in‑app browser, not a file preview. (JavaScript and Add‑to‑Home‑Screen only work in real Safari; a preview renders the styling but nothing works.)
2. **Share → Add to Home Screen.**
3. Launch it once from the home‑screen icon **while still on wifi** so the service worker caches everything.
4. **Shake it down before you sail:** log a test day, fully close the app, reopen, confirm the fish are still there. Then **Summary → Start a new trip** to sail with a clean log.

### At sea

- Use **‹ Day N of X ›** to pick the fishing day. Add or remove days as the trip runs.
- Tap a **species tile** → type the whole weight → **Save**, or **Save & add another**.
- **Time defaults to now but is editable.** You will not log fish during a wide‑open bite — log in a lull or at the end of the day and back‑fill the times.
- **The day is whichever Day you have selected**, never inferred from the timestamp. A 1:15 am bluefin lands on the day you say it does.
- On a fish of **15 lb or more** in an eligible species, a **Value‑added** panel appears. Allocate pounds to smoke / jerky / canning; the app shows what's left and blocks anything under the minimum.
- Tap any fish row to **edit or delete** it. Deletes are undoable.
- The **sticky bar** shows the day's fish, pounds, and the running trip estimate.

### Dock

Enter the processor's **actual scale weights and fish counts** by species, pick the processor, and enter the **invoice paid**. The app reconciles invoice vs. computed cost, and — more importantly — tells you if you logged 23 fish and only 21 got scaled.

### Summary

Estimate vs. actual (fish, pounds, cost). **Export CSV**, copy a trip summary, save a JSON backup, or edit rates.

## Data Sources

- **Processing rates:** published price sheets from [Fisherman's Processing](https://www.fishermansprocessing.com/) and [Five Star Fish Processing](https://www.fivestarfishprocessing.com/), **as of June 2026**. Stored in `DEFAULT_RATES` in `engine.js` and overridable per‑device in the Summary → Rates panel.
- **Cost rules** (tier gating, value‑added minimums): confirmed directly with Ed against Fisherman's stated policy, July 2026. See `SPEC-catch-log.md` §3.
- **Catch data:** entered by hand at sea. Nothing is fetched, and nothing is uploaded.

Rates change. Confirm them before each trip and update the Rates panel if they've moved.

## Known Limitations / Workarounds

- **Rail weights are guesses.** Anglers estimate high — commonly 15–25%. The processor's scale is the truth. Everything this app produces is an *estimate*; confirm at drop‑off.
- **The 12 lb line is doing real money work on a guessed number.** An 11.5 lb vs 12.5 lb yellowtail flips the Fisherman's rate ($2.80 vs $1.95 — the *small* fish costs more). Fish in the 10–14 lb band are flagged `~` for exactly this reason.
- **iOS can evict local storage.** The app calls `navigator.storage.persist()`, but the real protection is: install to the Home Screen (not a bookmark), and **export a JSON/CSV backup at the end of each day.**
- **No photos.** Local storage caps around 5 MB. Note the time in a fish's notes and let the camera roll hold the image.
- **Released fish are not modeled.** Only kept‑and‑killed fish are logged, so every logged fish bills.
- **The Numbers calculator and the planner webpage still carry the v1 cost bugs** (see below). Until they're fixed they will disagree with this app — **and this app is the correct one.**

## Build Notes

**Stack:** plain HTML/CSS/JS. No framework, no build step, no dependencies. `index.html` + `engine.js` + a service worker, served as static files from GitHub Pages. Brand: Teal‑Sage (`#2C7A6B` / navy `#2B4C7E`; Fraunces / Inter / IBM Plex Mono).

**The engine is a separate file on purpose.** v1 kept the cost math inline, and the same model was independently re‑implemented in the Numbers spreadsheet and the planner webpage. Those three copies were verified "penny‑for‑penny" against each other — which proved only that they *agreed*, never that they were *right*. They weren't:

- The **15 lb value‑added minimum was applied to a pooled per‑species total**, not per fish. That let two 10 lb yellowfin (20 lb pooled) bill as 20 lb of smoke — value‑added the processor will not perform. **Pounds do not pool across fish.**
- **Canning had no minimum at all.** The check was applied to smoke and jerky and simply omitted for canning, in both the JavaScript and the spreadsheet formulas.

v2 fixes both, and extracts the engine so the mistake cannot be made again. **If another artifact needs this math, it reads `engine.js`.** Never copy it.

**Cost model:** weight is whole‑fish weight (the processor's billing basis). Tier is **species‑gated** — Yellowtail, Yellowfin, Rockfish, Lingcod, Dorado, and Halibut can price at Fisherman's under‑12 rate; Bluefin, Wahoo, and White Seabass never do, regardless of weight. Value‑added is drawn from an individual fish: each allocation is `0 or ≥ 15 lb`, the sum can't exceed that fish's weight, and the remainder is fillet. Only Yellowtail (smoke), Wahoo (smoke), Bluefin and Yellowfin (all three) are value‑added eligible.

## Update / Refresh Instructions

**Rates:** Summary → Rates panel (device‑local, no push needed), or edit `DEFAULT_RATES` in `engine.js` to change the shipped defaults.

**App code:**

1. Edit `index.html` / `engine.js`.
2. **Run both test suites** — `node test-engine.js` and `node test-dom.js`. Both must be green.
3. **Bump the cache name in `sw.js`** (`catch-logger-v2` → `-v3`). Installed devices only re‑cache when this changes; skip it and your phone keeps serving the old app.
4. Push to `main`. GitHub Pages redeploys automatically.
5. On the phone, open the app **while online once** so the service worker fetches the new shell.

**Storage version:** the state key is `catchlogger.v2`. A breaking change to the data model needs a new key plus a migration path — see `load()` in `index.html` for how v1 was preserved rather than lossily converted.
