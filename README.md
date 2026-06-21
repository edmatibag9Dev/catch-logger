# Catch Logger

An offline, installable web app for logging a saltwater fishing trip's catch and estimating fish‑processing cost at sea — no internet required once installed. Companion to the Saltwater Trip Planner; uses the same processing‑cost engine as the planner webpage and the Numbers calculator (verified penny‑for‑penny).

## What it does

- **At sea** — log pounds per species, per fishing day. Value‑added services (smoke, jerky, canning, collars, gill & gut, shipping boxes) are tucked behind an optional panel. Each day shows the cheaper processor and a running trip estimate. Saves automatically to the phone.
- **Dock** — enter the processor's actual whole‑trip weights by species (one drop‑off) plus the real invoice you paid; it reconciles invoice vs. computed cost.
- **Summary** — estimate vs. actual side by side (pounds and cost), then export a CSV, copy a trip summary, or save a full JSON backup. Rates are editable here if pricing changes.

Two processors are compared: Fisherman's Processing and Five Star Fish Processing (published rates, June 2026). All data stays in the browser's local storage on the device — nothing is uploaded.

## Install on iPhone / iPad (one‑time, on wifi)

1. Open the hosted URL in **Safari** (not an in‑app browser or file preview — JavaScript and Add‑to‑Home‑Screen only work in real Safari).
2. Tap **Share → Add to Home Screen**.
3. Launch it once from the home‑screen icon while still on wifi. The service worker caches everything.
4. From then on it runs **fully offline** — open it at sea with no signal.

Tip: log a test day, fully close the app, and reopen to confirm the data persists before your trip.

## End‑of‑trip workflow

At the dock, fill in actual weights + invoice, then **Summary → Export CSV** and share it to yourself. The CSV becomes your Numbers archive, a Day One journal entry, and an Open Brain note.

## Files

| File | Purpose |
|---|---|
| `index.html` | The app (self‑contained: engine, UI, storage) |
| `sw.js` | Service worker — offline caching |
| `manifest.webmanifest` | Web app manifest (name, icons, standalone display) |
| `icon-180.png`, `icon-512.png` | Home‑screen / app icons |

## Updating rates

Open the **Summary** tab → Rates panel, or edit `DEFAULT_RATES` in `index.html`. After changing `index.html`, bump the cache name in `sw.js` (`catch-logger-v1` → `-v2`) so installed devices pick up the new version on next online load.
