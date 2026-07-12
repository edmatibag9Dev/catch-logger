/* ============================================================================
   Catch Logger — cost engine (v2)
   SINGLE SOURCE OF TRUTH for fish-processing cost. Do not duplicate this math.

   v2 corrects two errors carried by v1, the Numbers calculator, and the
   planner webpage alike (all three agreed with each other, and all three
   were wrong):

     1. POOLED VALUE-ADDED MINIMUM.  v1 pooled value-added pounds per species
        per day and tested that pool against the 15 lb minimum. That let two
        10 lb yellowfin (20 lb pooled) bill as 20 lb of smoke — value-added
        the processor will not perform. The minimum is per FISH, per treatment.
        Pounds do not pool across fish.

     2. CANNING HAD NO MINIMUM.  v1 applied VAMIN to smoke and jerky but
        passed canning straight through unchecked (the rates sheet label even
        said "Value-added minimum (smoke/jerky)"). Canning carries the same
        15 lb minimum.

   Value-added is drawn from an INDIVIDUAL FISH:
     - each treatment allocation is 0, or >= VAMIN (15 lb)
     - the sum of allocations cannot exceed that fish's weight
     - the remainder is fillet, priced at that fish's tier rate
   The ">= 15 lb fish" eligibility gate is not coded separately: it falls out
   of the arithmetic, since a 10 lb fish cannot source a 15 lb allocation.
   ========================================================================== */
"use strict";

var VAMIN = 15;      // lb — minimum per value-added treatment, per fish
var U12   = 12;      // lb — Fisherman's under-12 tier threshold

var DEFAULT_RATES = {
  fp: { name:"Fisherman's", big:1.95, small:2.80, smoke:3.50, jerky:4.50, can:5.50,
        collar:5.00, gillgut:1.55, deposit:100, ccfee:0.03,   box:65, handling:75, extrabox:10, ship:true },
  fs: { name:"Five Star",   big:1.97, small:1.97, smoke:2.75, jerky:3.75, can:5.50,
        collar:5.19, gillgut:1.50, deposit:0,   ccfee:0.0395, box:0,  handling:0,  extrabox:0,  ship:false }
};

/* u12 : may price at Fisherman's under-12 rate when the fish is under 12 lb.
         Wahoo, Bluefin and White Seabass never do — species-gated, not a weight rule.
   sm/jk/cn : value-added eligibility. Only YT, BFT, YFT, Wahoo carry any. */
var SPECIES = [
  { k:'yt',     n:'Yellowtail',     u12:true,  sm:true,  jk:false, cn:false },
  { k:'bft',    n:'Bluefin Tuna',   u12:false, sm:true,  jk:true,  cn:true  },
  { k:'yft',    n:'Yellowfin Tuna', u12:true,  sm:true,  jk:true,  cn:true  },
  { k:'wahoo',  n:'Wahoo',          u12:false, sm:true,  jk:false, cn:false },
  { k:'dorado', n:'Dorado',         u12:true,  sm:false, jk:false, cn:false },
  { k:'wsb',    n:'White Seabass',  u12:false, sm:false, jk:false, cn:false },
  { k:'hali',   n:'Halibut',        u12:true,  sm:false, jk:false, cn:false },
  { k:'ling',   n:'Lingcod',        u12:true,  sm:false, jk:false, cn:false },
  { k:'rock',   n:'Rockfish',       u12:true,  sm:false, jk:false, cn:false }
];

var VA_TYPES = [
  { k:'sm', n:'Smoked', rate:'smoke' },
  { k:'jk', n:'Jerky',  rate:'jerky' },
  { k:'cn', n:'Canned', rate:'can'   }
];

function num(x){ x = parseFloat(x); return (isNaN(x) || x < 0) ? 0 : x; }

/* Resolve a species key against the built-in table plus any custom species.
   Custom species are always fillet-only; the user picks their u12 eligibility. */
function spec(key, custom){
  for (var i = 0; i < SPECIES.length; i++) if (SPECIES[i].k === key) return SPECIES[i];
  custom = custom || [];
  for (var j = 0; j < custom.length; j++) {
    if (custom[j].k === key) {
      return { k:custom[j].k, n:custom[j].n, u12:!!custom[j].u12,
               sm:false, jk:false, cn:false, custom:true };
    }
  }
  return null;
}

function hasVA(sp){ return !!(sp && (sp.sm || sp.jk || sp.cn)); }

/* Can this fish carry any value-added at all?
   Needs an eligible species AND enough weight to source one full allocation. */
function vaEligible(f, sp){ return hasVA(sp) && num(f.lb) >= VAMIN; }

/* Pounds of a fish actually accepted for each treatment. An allocation below
   VAMIN is not performed by the processor, so it is NOT charged at the
   value-added rate — it falls back into fillet. The UI must block this at
   input rather than let it happen silently (that was the v1 failure). */
function vaApplied(f, sp){
  var va = f.va || {};
  return {
    sm: (sp.sm && num(va.sm) >= VAMIN) ? num(va.sm) : 0,
    jk: (sp.jk && num(va.jk) >= VAMIN) ? num(va.jk) : 0,
    cn: (sp.cn && num(va.cn) >= VAMIN) ? num(va.cn) : 0
  };
}

/* Validation — returns [] when the allocation is legal. */
function vaErrors(f, sp){
  var va = f.va || {}, errs = [], total = 0, i, t, v;
  for (i = 0; i < VA_TYPES.length; i++) {
    t = VA_TYPES[i]; v = num(va[t.k]);
    if (!v) continue;
    if (!sp[t.k]) errs.push(sp.n + ' cannot be ' + t.n.toLowerCase());
    else if (v < VAMIN) errs.push(t.n + ' ' + v + ' lb is under the ' + VAMIN + ' lb minimum');
    total += v;
  }
  if (total > num(f.lb) + 1e-9) {
    errs.push('Allocated ' + total + ' lb from a ' + num(f.lb) + ' lb fish');
  }
  return errs;
}

/* True when this fish prices at Fisherman's under-12 rate. */
function isUnder12(f, sp){ return !!(sp && sp.u12 && num(f.lb) < U12); }

/* ---- Cost of ONE fish -----------------------------------------------------
   Any fish carrying value-added is >= 15 lb, hence >= 12 lb, so its fillet
   remainder always prices at the big rate. Tier only ever matters for fish
   carrying no value-added. */
function fishCost(f, R, custom){
  var sp = spec(f.sp, custom);
  if (!sp) return 0;
  var a = vaApplied(f, sp);
  var fillet = Math.max(0, num(f.lb) - (a.sm + a.jk + a.cn));
  var rate = isUnder12(f, sp) ? R.small : R.big;
  return fillet * rate + a.sm * R.smoke + a.jk * R.jerky + a.cn * R.can;
}

/* ---- A day's processing subtotal (excludes deposit; applied once per trip) */
function setProc(day, R, custom){
  var p = 0, fish = (day && day.fish) || [];
  for (var i = 0; i < fish.length; i++) p += fishCost(fish[i], R, custom);
  return p + num(day.collars) * R.collar + num(day.gillgut) * R.gillgut;
}

/* ---- Shipping (Fisherman's only) ---- unchanged from v1 */
function setShip(day, R){
  var b = num(day && day.boxes);
  return (b > 0 && R.ship) ? (b * R.box + R.handling + Math.max(0, b - 2) * R.extrabox) : 0;
}

/* ---- Quote across a list of days (1 for actuals, N for the estimate) ------
   Card fee and the single prepaid deposit are applied once, at trip level.
   Unchanged from v1. */
function quote(days, R, pay, custom){
  var proc = 0, ship = 0;
  for (var i = 0; i < days.length; i++) { proc += setProc(days[i], R, custom); ship += setShip(days[i], R); }
  var fee = (pay === 'card') ? proc * R.ccfee : 0;
  var est = proc + fee;
  return { proc:proc, fee:fee, est:est, net:est - R.deposit, ship:ship };
}

/* ---- Aggregations for display / export ---------------------------------- */
function dayStats(day, custom){
  var fish = (day && day.fish) || [], out = { n:fish.length, lb:0, u12lb:0, borderline:0 };
  for (var i = 0; i < fish.length; i++) {
    var f = fish[i], sp = spec(f.sp, custom), lb = num(f.lb);
    out.lb += lb;
    if (isUnder12(f, sp)) out.u12lb += lb;
    if (sp && sp.u12 && lb >= 10 && lb <= 14) out.borderline++;
  }
  return out;
}

function speciesStats(days, key, custom){
  var out = { n:0, lb:0, u12lb:0, borderline:0, va:{ sm:0, jk:0, cn:0 } };
  var sp = spec(key, custom);
  for (var d = 0; d < days.length; d++) {
    var fish = days[d].fish || [];
    for (var i = 0; i < fish.length; i++) {
      var f = fish[i];
      if (f.sp !== key) continue;
      var lb = num(f.lb), a = vaApplied(f, sp);
      out.n++; out.lb += lb;
      if (isUnder12(f, sp)) out.u12lb += lb;
      if (sp.u12 && lb >= 10 && lb <= 14) out.borderline++;
      out.va.sm += a.sm; out.va.jk += a.jk; out.va.cn += a.cn;
    }
  }
  return out;
}

function money(n){
  return '$' + (Math.round(n * 100) / 100).toLocaleString('en-US',
    { minimumFractionDigits:2, maximumFractionDigits:2 });
}
function lbs(n){ return (Math.round(n * 10) / 10).toLocaleString('en-US'); }

function cheaper(a, b){
  return a < b - 0.005 ? "Fisherman's" : (b < a - 0.005 ? "Five Star" : "— tie —");
}

/* Node export for the regression suite; harmless in the browser. */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { VAMIN:VAMIN, U12:U12, DEFAULT_RATES:DEFAULT_RATES, SPECIES:SPECIES,
    VA_TYPES:VA_TYPES, num:num, spec:spec, hasVA:hasVA, vaEligible:vaEligible,
    vaApplied:vaApplied, vaErrors:vaErrors, isUnder12:isUnder12, fishCost:fishCost,
    setProc:setProc, setShip:setShip, quote:quote, dayStats:dayStats,
    speciesStats:speciesStats, money:money, lbs:lbs, cheaper:cheaper };
}
