# SPEC — Per-Fish Catch Log (Catch Logger v2)

**Status:** Draft — one blocking open item (§3.2)
**Date:** 2026-07-12
**Supersedes:** bulk pounds-per-species entry in v1.0.0

---

## 1. Problem

v1 logs **bulk pounds per species per day**. Four consequences:

1. The under-12 lb split (`u`) is eyeballed and typed by hand — and it directly moves the Fisherman's bill.
2. **Fish count is not captured**, though it is a legal record requirement.
3. There is no catch journal — no time, no notes, no per-fish record.
4. **Value-added is modeled wrong** (see §3.3). The 15 lb minimum is a per-fish rule, not a pooled-pounds rule, and v1 prices value-added the processor would refuse to perform.

## 2. Goal

Replace bulk entry with a **per-fish log**: one row per fish — species, whole weight, time, notes, and (where eligible) a value-added allocation. The row is simultaneously the compliance record, the journal entry, and the input to the processing-cost engine.

---

## 3. Rules (confirmed in design review, 2026-07-12)

| Rule | Decision |
|---|---|
| Disposition (kept/released/crew) | **Not modeled.** Only kept-and-killed fish are logged. Every logged fish bills. |
| Bulk entry escape hatch | **Removed.** Every fish gets a row, always. |
| Weight basis | **Whole fish weight** — the basis the processor bills on. |
| Under-12 tier | **Species-gated** (§3.1). Not a pure weight rule. |
| Value-added | **Allocated from an individual fish** (§3.3). Not a pooled per-day pounds figure. |
| VA minimum | **15 lb per allocation, per fish** — smoke, jerky, **and canning**. |

### 3.1 Tier — species-gated

A fish prices at the Fisherman's under-12 rate only if **its species is under-12 eligible** *and* the fish weighs under 12 lb. A 10 lb Wahoo never gets the small rate.

```
tier = (species.u12 && fish.lb < 12) ? small : big
```

**Pricing note:** tier only moves the **Fisherman's** number — `$1.95` big / `$2.80` small (under-12 fish cost *more* per pound). Five Star is flat `$1.97` for both, so tiering is a no-op there.

**Corollary:** any fish carrying value-added is by definition ≥ 15 lb, therefore ≥ 12 lb, therefore its fillet remainder **always** bills at the big rate. **Tier only ever matters for fish with no value-added.**

### 3.2 Species table

| key | Species | Under-12 eligible | Smoke | Jerky | Can |
|---|---|:--:|:--:|:--:|:--:|
| `yt` | Yellowtail | ✅ | ✅ | — | — |
| `bft` | Bluefin Tuna | ❌ | ✅ | ✅ | ✅ |
| `yft` | Yellowfin Tuna | ✅ | ✅ | ✅ | ✅ |
| `wahoo` | Wahoo | ❌ | ✅ | — | — |
| `rock` | Rockfish | ✅ | — | — | — |
| `ling` | Lingcod | ✅ | — | — | — |
| `dorado` | Dorado | ✅ | — | — | — |
| `wsb` | White Seabass | ❌ | — | — | — |
| `hali` | Halibut | ✅ | — | — | — |
| `other` | *custom name* | **user picks at creation** | — | — | — |

Only Yellowtail, Bluefin, Yellowfin, and Wahoo carry any value-added eligibility. Every other species — including all custom ones — is fillet-only, and shows **no** value-added affordance.

When creating an `other` species the user supplies a name and an under-12 eligibility toggle. Custom species never get value-added.

### 3.3 Value-added — the corrected model

**v1 is wrong.** It pools value-added pounds per species per day and applies the 15 lb minimum to that pool. Under v1, two 10 lb yellowfin (20 lb pooled) can be billed as 20 lb of smoke — value-added the processor **will not do**.

**The actual rule: value-added is drawn from an individual fish.**

For each fish, for each treatment `t ∈ {smoke, jerky, can}`:

```
allocation(t) = 0  OR  allocation(t) >= 15 lb          (per-treatment minimum)
Σ allocation(t)  <=  fish.lb                            (can't allocate more than the fish)
species must be eligible for t                          (§3.2)
fillet remainder = fish.lb − Σ allocation(t)            (prices at the fish's tier rate)
```

That's the whole rule. Three properties fall out of it, and each one matches Ed's stated cases:

| Case | Result | Why |
|---|---|---|
| One 10 lb yellowfin | **No VA possible** | Can't draw 15 lb from a 10 lb fish |
| Two 10 lb yellowfin (20 lb) | **Still no VA** | Pounds don't pool across fish |
| One 15 lb + one 10 lb | 15 lb fish → smoke **or** jerky | Not an "or" rule — a 15 lb fish simply can't fund two 15 lb allocations |
| One 35 lb bluefin | smoke 15 + jerky 20 ✅ | Both clear the minimum; sum ≤ 35 |
| One 90 lb bluefin | smoke 15 + jerky 15 + can 15, 45 lb fillet ✅ | Multiple treatments from one fish are allowed |

**The "≥ 15 lb fish" eligibility gate is not a separate rule** — it falls out of the arithmetic. A fish under 15 lb cannot source a 15 lb allocation. Do not code it twice.

**Practical note:** Ed typically applies value-added to **one or two fish per trip** — it's expensive. The UI should treat VA as an exceptional action on a fish, not a field every fish carries.

**Two v1 bugs this fixes:**
1. **Pooled minimum** — priced VA that can't be performed (above).
2. **Canning had no minimum at all.** `spCost()` applies `VAMIN` to smoke and jerky but assigns `ec = cn` directly, with no check. Canning carries the same 15 lb minimum. A 5 lb canning entry currently bills `$27.50` that the processor would never charge.

### 3.4 Consequences beyond this app

The Numbers calculator and the Saltwater Trip Planner webpage implement the **same wrong pooled model**. Fixing it here breaks the penny-for-penny parity v1 was built to guarantee.

That is the correct trade — parity with a wrong number is worthless — but **the fix must propagate to both other artifacts** or the three will disagree. Tracked as follow-on work, out of scope for this build.

---

## 4. Data model — `catchlogger.v2`

```js
state = {
  v: 2,
  days: [{
    date: '',            // e.g. "Sep 5" — free text, unchanged
    pay: 'cash',         // cash | card
    fish: [{
      id,                // monotonic, for edit/delete
      sp,                // species key, incl. custom 'c1', 'c2'…
      lb,                // whole fish weight; decimals allowed
      t,                 // 'HH:MM' — defaults to now, editable/back-fillable
      notes,             // free text — the journal
      va: { sm:0, jk:0, cn:0 }   // pounds drawn from THIS fish; each 0 or >=15
    }],
    collars: '', gillgut: '', boxes: ''   // day-level, not species-specific
  }],
  cur: 0,
  custom: [ { k:'c1', n:'Cabrilla', u12:false } ],
  actual: {...}, actualProc: '', invoice: '',   // Dock tab — unchanged (bulk, from invoice)
  rates: {...}                                   // unchanged
}
```

**Day is never inferred from `t`.** A 1:15 am bluefin belongs to whichever Day is selected. Timestamp is metadata only.

**The day-level VA panel on the At-sea tab is deleted.** VA now lives on the fish. `collars`, `gillgut`, and `boxes` stay at the day level — they aren't species-specific.

### 4.1 Engine

`spCost()` is **replaced** by a per-fish function. The new engine is *shorter* than the old one:

```js
function fishCost(f, R) {
  var sp = SPECIES[f.sp], va = f.va || {};
  var sm = (sp.sm && num(va.sm) >= VAMIN) ? num(va.sm) : 0;
  var jk = (sp.jk && num(va.jk) >= VAMIN) ? num(va.jk) : 0;
  var cn = (sp.cn && num(va.cn) >= VAMIN) ? num(va.cn) : 0;   // canning now honors VAMIN
  var fillet = Math.max(0, f.lb - (sm + jk + cn));
  var rate = (sp.u12 && f.lb < 12) ? R.small : R.big;
  return fillet * rate + sm * R.smoke + jk * R.jerky + cn * R.can;
}

function setProc(day, R) {
  return day.fish.reduce((p, f) => p + fishCost(f, R), 0)
       + num(day.collars) * R.collar
       + num(day.gillgut) * R.gillgut;
}
```

`setShip()`, `quote()` (card fee, $100 Fisherman's deposit applied once at trip level), and `money()` are **unchanged**.

Gone entirely: the `{c, u, sm, jk, cn}` species aggregate, the `sub` branch, the `tier:'small'` branch, and the "VA deducted from big fish first" ambiguity. **We now know exactly which fish went to smoke**, so tier accounting is exact rather than inferred.

### 4.2 Migration from v1

**No lossy conversion.** v1 bulk pounds cannot be faithfully expanded into fish rows (a 180 lb yellowtail total is not one 180 lb fish), and v1's VA figures may encode pricing the processor won't honor.

On first v2 load:
1. Copy `catchlogger.v1` to `catchlogger.v1.backup`.
2. Offer a one-tap **JSON download** of the v1 state.
3. Start v2 with a clean trip.

Safe: the Shogun trip is **Aug 20–28, 2026**. No live trip data is at risk.

---

## 5. UI — the Catch page

Replaces the species-row grid on the **At sea** tab. Day navigation (`‹ Day 1 of X ›`) is reused unchanged.

**Entry — two taps, not a dropdown.**
A **species tile grid**. Tap a tile → weight numpad opens → time pre-filled with now (editable) → optional notes → **Save**, or **Save & add another** (species stays locked, for a run of fish).

A `<select>` is a precision tap on a rolling deck with wet hands. Tiles are large targets. A 14-fish yellowtail day must not cost 40+ taps.

**Value-added — an exceptional action on a fish, not a field on every row.**
A fish row shows a **"+ Value-added"** affordance only when `fish.lb >= 15` **and** its species is VA-eligible. Tapping opens an allocation sheet:

- Sliders/inputs for the eligible treatments only.
- Each input is **0 or ≥ 15 lb** — the minimum is stated inline and enforced, not discovered.
- Live **remaining allowance** (`35 lb fish · 15 lb smoked · 20 lb left`).
- The fillet remainder and its rate shown as you allocate.

VA'd fish carry a badge in the list. Expect one or two per trip.

**Sections — fixed order, never reordered.**
All species render in a **stable order**. Zero-fish species collapse to a single muted line; the first fish expands it. Same shape every day — muscle memory holds.

Section header: **count · total lb · under-12 lb**.
Fish row: `time · weight · U12 badge · VA badge · notes snippet`. Tap to edit, swipe to delete, with undo.

**Borderline flag.**
Fish between **10.0 and 14.0 lb** get a `~` marker; the section header shows `n borderline`. Rail estimates run 15–25% high and a fish near the 12 lb line flips rate tiers. Surface the uncertainty rather than implying false precision. *(Only meaningful for under-12-eligible species.)*

**Sticky bottom bar (always visible).**
`Day: n fish · X lb · $Y est` — `Trip: $Z` — tap-through to Summary. No fourth nav tab; the running total lives on the page you're already working on.

---

## 6. Dock reconciliation — count integrity

The Dock tab gains an optional **fish count** field per species alongside the actual weights.

Because every fish is now a row:

> Logged: **23 fish / 412 lb** · Processor: **21 fish / 358 lb** · **⚠ 2 fish unaccounted for**

Pounds drift by nature. **Count does not.** A count mismatch means a fish went missing between the rail and the scale, and only the count will ever tell you.

### 6.1 Estimate bias (Phase 2 — scope TBD)

The Dock tab already captures the processor's actual weights. Compared against logged estimates, they yield a **per-species bias factor** (`actual ÷ estimated`), stored across trips.

Random per-fish error partially cancels across 40 fish. **Systematic bias does not** — anglers estimate high. Next trip: *"your yellowtail estimates ran 18% high last trip."* Highest-value thing the per-fish data unlocks; nearly free once count/weight comparison exists. Requires cross-trip storage, which v2 does not have.

---

## 7. Durability

The app now holds an irreplaceable journal, not 30 recomputable numbers.

- `navigator.storage.persist()` on load.
- Prompt an **end-of-day backup** (JSON + CSV to Files).
- **No photos in localStorage** (5 MB cap). Note the time in `notes`; let the camera roll hold the image.

A 5-day, 100-fish trip is ~20 KB. Storage is not a constraint.

---

## 8. Export

CSV gains:
- **Per-species-per-day count and weight table** — the compliance record.
- **Fish-level detail sheet** (`day, date, time, species, lb, u12, va_smoke, va_jerky, va_can, notes`) — the journal, exportable to Day One / Open Brain.

---

## 9. Rollout

| Item | Change |
|---|---|
| Storage key | `catchlogger.v1` → `catchlogger.v2` |
| Service worker cache | `catch-logger-v1` → `catch-logger-v2` |
| Version | `1.0.0` → `2.0.0` (breaking) |
| CHANGELOG | new entry, incl. the two VA bug fixes |
| README | At-sea tab description, engine section, remove "penny-for-penny" claim pending §3.4 |

Branding: Teal-Sage — brand `#2C7A6B`, navy `#2B4C7E`; Fraunces / Inter / IBM Plex Mono. Data green/red stays separate from brand teal.

> **Note:** `BRAND.md` and `brand-tokens.css` are referenced by the project instructions but are **not present** in the project folder. Working from the global Teal-Sage tokens until added.

---

## 10. Acceptance criteria

1. A 10 lb Wahoo prices at the **big** rate (`$19.50` fp). A 10 lb Yellowtail prices at the **small** rate (`$28.00` fp).
2. A VA allocation under 15 lb is **blocked at input**, with the minimum shown before the user hits it — never silently zeroed (the v1 failure).
3. Two 10 lb yellowfin offer **no** VA affordance. A 15 lb yellowfin offers smoke *or* jerky, but the second allocation is blocked once the first consumes the fish.
4. A 35 lb bluefin accepts smoke 15 + jerky 20 → `$142.50` fp / `$116.25` fs.
5. Canning under 15 lb is blocked (v1 bug fix).
6. Deleting a fish immediately updates day pounds, under-12 pounds, day cost, and trip cost.
7. Time is editable; changing it never moves a fish between days.
8. App loads and logs a fish with the network disabled.
9. Trip-level: card fee and the single $100 Fisherman's deposit are applied exactly as in v1.

---

## 11. Open items

- [x] §3.2 under-12 eligibility — **resolved 2026-07-12.** Dorado ✅, Halibut ✅, White Seabass ❌, custom `other` = user picks at creation.
- [x] Weight granularity — **resolved.** Decimals allowed; numpad defaults to whole pounds.
- [ ] Borderline band of 10.0–14.0 lb — confirm or adjust (defaulting to 10–14 unless told otherwise).
- [ ] Phase 2 bias tracking — in or out of scope for this build? (Defaulting to **out**.)
- [ ] Follow-on: propagate the VA fix to the Numbers calculator and the planner webpage (§3.4).
