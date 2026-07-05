# AGENTS.md — guide for AI agents working in this repo

This file is the canonical entry point for any AI agent (Claude Code, Cowork, Codex, etc.)
asked to **use, reference, extend, or rebuild** this project. Read it before acting.

## What this repo is

An offline, installable web app (PWA) for logging a saltwater fishing trip's catch and estimating
fish-processing cost **at sea, with no internet**. It is the companion to the Saltwater Trip Planner
and uses the same processing-cost engine (verified penny-for-penny against the planner webpage and the
Numbers calculator). Hosted on GitHub Pages; installed via Safari → Add to Home Screen.

Design in one line: **a single self-contained `index.html` + service worker that logs per-species
pounds per day, compares two San Diego processors, and reconciles estimate vs. actual — all in
device-local storage, nothing uploaded.**

## File map

| Path | Committed? | Purpose |
|---|---|---|
| `AGENTS.md` | yes | This guide. |
| `README.md` | yes | Human quickstart, install, and end-of-trip workflow. |
| `CONTRIBUTING.md` | yes | Canonical commit + README standard. |
| `CHANGELOG.md` | yes | Version history. |
| `index.html` | yes | The entire app — cost engine, UI, and local-storage persistence, inline. |
| `sw.js` | yes | Service worker — offline caching of the app shell. |
| `manifest.webmanifest` | yes | PWA manifest (name, icons, standalone display). |
| `icon-180.png` / `icon-512.png` | yes | Home-screen (iOS) + maskable app icons. |
| `LICENSE` | yes | Usage terms. |

## The data contract (device-local trip state + exports)

State is held in the browser's local storage on the device; there is no server. The user-facing
contract is the three tabs and the exports:

- **At sea:** pounds per species per fishing day, plus optional value-added services (smoke, jerky,
  canning, collars, gill & gut, shipping). Shows the cheaper processor and a running trip estimate.
- **Dock:** the processor's actual whole-trip weights per species (one drop-off) + the real invoice paid.
- **Summary:** estimate vs. actual (pounds + cost) side by side; **CSV export**, copy-a-trip-summary,
  and a full **JSON backup**. Rates are editable and stored on device.

Rules an agent must preserve:
- **Offline-first, on-device only.** No network calls for data; nothing is uploaded. Local storage is
  the source of truth for a trip.
- **Cost engine parity.** The processing-cost math must stay penny-for-penny identical to the Saltwater
  Trip Planner and the Numbers calculator — this app is not allowed to diverge.
- **Two processors** are compared (Fisherman's Processing, Five Star Fish Processing) from published
  rates; the "cheaper processor" call depends on that math.
- **Self-contained** — all engine/UI/state live in `index.html`; no external dependencies, no build step.

## How it works

1. First load on wifi in **real Safari** registers `sw.js`, which caches the app shell.
2. Launched from the home-screen icon, it runs fully offline; every entry auto-saves to local storage.
3. At the dock, the user enters actual weights + invoice; the Summary reconciles estimate vs. actual.
4. Export CSV / JSON to move the trip off-device (→ Numbers archive row, Day One entry, Open Brain note).

## How to extend

- **Processor rates:** Summary → Rates panel (device), or edit `DEFAULT_RATES` in `index.html`.
- **Add a species / value-added service:** edit the species list + engine in `index.html`; keep the
  cost math aligned with the planner.
- **Change cached assets:** update the cache list in `sw.js` and bump its cache version so clients refresh.

## Privacy — hard rules

- All trip data stays in device local storage; the app never uploads. Do not add analytics, remote
  logging, or a network sync without Ed's explicit sign-off.
- Public repo → never commit real keys or personal identifiers (there are none today; keep it that way).

## Verification gates (run before declaring a change done)
1. Open the hosted URL in real Safari (not an in-app browser); species rows render and are editable.
2. Log a test day → fully close → reopen: data persists offline (service worker cached the shell).
3. Processing-cost output matches the Trip Planner + Numbers calculator penny-for-penny.
4. CSV export and JSON backup round-trip cleanly.
5. Commit follows `CONTRIBUTING.md`; README/CHANGELOG updated on feat/fix.
