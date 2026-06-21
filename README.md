# Catch Logger

An offline, installable web app for logging a saltwater fishing trip's catch and estimating fish‑processing cost — at sea, with no internet. Companion to the **Saltwater Trip Planner**; uses the same processing‑cost engine as the planner webpage and the Numbers calculator (verified penny‑for‑penny).

> **Live app:** hosted on GitHub Pages → open the repo's Pages URL in Safari, then **Add to Home Screen**. Runs fully offline after the first load.

## What it does

| Tab | Purpose |
|---|---|
| **At sea** | Log pounds per species, per fishing day. Optional value‑added (smoke, jerky, canning, collars, gill & gut, shipping). Shows the cheaper processor + a running trip estimate. Auto‑saves. |
| **Dock** | Enter the processor's actual whole‑trip weights by species (one drop‑off) plus the real invoice paid; reconciles invoice vs. computed cost. |
| **Summary** | Estimate vs. actual side by side (pounds + cost). Export CSV, copy a trip summary, save a full JSON backup. Editable rates panel. |

Two San Diego processors are compared — **Fisherman's Processing** and **Five Star Fish Processing** (published rates, June 2026). All data lives in the device's local storage; nothing is uploaded.

## Install on iPhone / iPad (one‑time, on wifi)

1. Open the hosted URL in **Safari** — not an in‑app browser or a file preview. (JavaScript and Add‑to‑Home‑Screen only work in real Safari; a preview shows the styling but the species rows stay blank.)
2. Tap **Share → Add to Home Screen**.
3. Launch it once from the home‑screen icon while still on wifi so the service worker caches everything.
4. From then on it runs **fully offline** — open it at sea with no signal.

Before a trip: log a test day, fully close the app, reopen, and confirm the data persists. Then **Summary → Start a new trip** to sail with a clean log.

## End‑of‑trip workflow

At the dock, fill in actual weights + invoice, then **Summary → Export CSV** and share it to yourself. The CSV becomes a Numbers archive row, a Day One journal entry, and an Open Brain note.

## Project structure

```
index.html              The app — self-contained (engine, UI, local storage)
sw.js                   Service worker — offline caching
manifest.webmanifest    PWA manifest (name, icons, standalone display)
icon-180.png            Home-screen icon (iOS)
icon-512.png            App icon (maskable)
README.md               This file
CHANGELOG.md            Version history
LICENSE                 Usage terms
```

## Updating

- **Rates:** Summary tab → Rates panel (stored on device), or edit `DEFAULT_RATES` in `index.html`.
- **App code:** edit `index.html`, then bump the cache name in `sw.js` (`catch-logger-v1` → `-v2`) so installed devices re‑cache on their next online load.

## Engine

The cost engine in `index.html` mirrors the Saltwater Trip Planner webpage and the Numbers calculator exactly: 12 lb+ / under‑12 fillet tiers, the under‑12 split for yellowtail & yellowfin, smoke/jerky/canning value‑added (15 lb minimum), collars, gill & gut, cash‑vs‑card fees, Fisherman's $100 prepaid deposit, and shipping. Estimates only — always confirm at drop‑off.
