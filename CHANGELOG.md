# Changelog

All notable changes to Catch Logger are recorded here.

## [1.0.0] — 2026-06-21

### Added
- Initial release: offline, installable PWA for logging a saltwater trip's catch
  and estimating fish‑processing cost with no internet at sea.
- **At sea** tab — per‑day catch log by species (pounds), optional value‑added panel
  (smoke / jerky / canning, collars, gill & gut, shipping boxes), per‑day cheaper‑
  processor result, running trip estimate, auto‑save to local storage.
- **Dock** tab — whole‑trip actual weights by species (one drop‑off), processor
  selection, real invoice entry, and invoice‑vs‑computed reconciliation.
- **Summary** tab — estimate vs. actual (pounds + cost), CSV export via iOS share
  sheet, copy‑to‑clipboard trip summary, full JSON backup, and an editable rates panel.
- Cost engine mirrors the Saltwater Trip Planner webpage and Numbers calculator
  penny‑for‑penny (12 lb+ / under‑12 tiers, under‑12 split for yellowtail & yellowfin,
  value‑added 15 lb minimum, collars, gill & gut, cash/card fees, $100 deposit, shipping).
- Service worker for full offline operation after first load; web manifest and
  branded home‑screen icons (180 / 512).
- Two processors with June 2026 published rates: Fisherman's Processing, Five Star.

### Notes
- Deposit applied once at the trip level (cleaner than the Numbers sheet's per‑day display).
- All catch data stays on the device; only the blank app is hosted.
