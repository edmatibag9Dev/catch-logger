# Changelog

All notable changes to Catch Logger are recorded here.

## [2.0.0] — 2026-07-12

Per-fish catch logging. **Breaking** — new storage key, new cost model, and two
corrections to the processing math that change what you'll be quoted.

### Fixed — the value-added model was wrong

Both errors were carried identically by v1, the Numbers calculator, and the planner
webpage. All three agreed with each other, and all three were wrong — which is
exactly why penny-for-penny parity checks never caught it.

- **The 15 lb value-added minimum is per FISH, not a pooled per-species total.**
  v1 pooled a species' value-added pounds for the day and tested that pool against
  the minimum, so two 10 lb yellowfin (20 lb pooled) could bill as 20 lb of smoke —
  value-added the processor will not perform. Pounds do not pool across fish. A
  15 lb allocation must come from a single fish of at least 15 lb.
- **Canning had no minimum at all.** `spCost()` applied the minimum to smoke and
  jerky but passed canning straight through unchecked; the rates sheet label even
  read *"Value-added minimum (smoke/jerky)"*. Canning carries the same 15 lb
  minimum. A 5 lb canning entry used to bill $27.50 that would never appear on a
  real invoice.
- **Sub-minimum value-added is now blocked at input.** v1 silently zeroed it and
  billed those pounds as plain fillet, with nothing on screen to say so.

### Changed — tier is species-gated

- Under-12 pricing now depends on the species *and* the fish's weight. Wahoo,
  Bluefin, and White Seabass never price at Fisherman's under-12 rate no matter how
  small the fish. Yellowtail, Yellowfin, Rockfish, Lingcod, Dorado, and Halibut do.
- Because every value-added fish is ≥ 15 lb (hence ≥ 12 lb), its fillet remainder
  always bills at the 12 lb+ rate. **Tier now only matters for fish carrying no
  value-added.**

### Added

- **Per-fish logging.** Every fish gets a row: species, whole weight, time, notes.
  One entry serves as the legal count record, the catch journal, and the cost input.
- **Fish count** — captured for the first time, and required by law. Pounds drift;
  count doesn't.
- **Under-12 pounds are now derived, never typed.** The most error-prone field in
  v1 is gone.
- **Value-added is allocated from a specific fish.** The affordance appears only on
  a fish that can actually source it (≥ 15 lb, eligible species), with a live
  remaining-allowance readout and the minimum stated before you hit it.
- Species tile grid — two taps to log a fish. No dropdown on a rolling deck.
- Four new species: **Dorado, White Seabass, Halibut, Lingcod**, plus **Other**
  (custom name + under-12 toggle; custom species never carry value-added).
- Borderline flag (`~`) on fish between 10–14 lb, where a rail estimate can flip
  rate tiers.
- Sticky day/trip totals bar on the log page.
- **Count-integrity check at the Dock** — fish logged vs. fish the processor scaled.
- `navigator.storage.persist()`, and a richer CSV export (compliance count table +
  fish-by-fish journal detail).
- Cost engine extracted to **`engine.js`** — one source of truth, no more copies to
  drift.
- Test suites: `test-engine.js` (61 assertions) and `test-dom.js` (33 assertions).

### Removed

- Bulk pounds-per-species entry, and the hand-typed under-12 field.
- The day-level value-added panel on the At-sea tab — value-added lives on the fish now.
- The `sub` and `tier` species flags, and the "value-added comes off the big fish
  first" ambiguity. We now know exactly which fish went to smoke.

### Migration

v1 data is **not** converted. Bulk pounds cannot be faithfully expanded into fish
rows (a 180 lb yellowtail total is not one 180 lb fish), and v1's value-added
figures may encode pricing the processor won't honor. On first load, v1 state is
preserved under `catchlogger.v1.backup` and offered as a JSON download from the
Summary tab. v2 starts with a clean trip.

### Known follow-on

The Numbers calculator (`Saltwater_Fish_Processing_Calculator.xlsx`) and the planner
webpage still carry the old pooled minimum and the missing canning minimum. **Until
they're fixed they will disagree with this app — and this app is the correct one.**
`Catch_Logger.html` in the project root is a stale v1 clone and should be deleted.

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
