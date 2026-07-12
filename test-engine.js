/* Catch Logger — engine regression suite
   Run:  node test-engine.js
   Covers SPEC-catch-log.md §10 acceptance criteria and Ed's worked examples. */
"use strict";
var E = require('./engine.js');
var FP = E.DEFAULT_RATES.fp, FS = E.DEFAULT_RATES.fs;

var pass = 0, fail = 0;
function ok(name, cond, detail){
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (detail ? '\n      ' + detail : '')); }
}
function eq(name, got, want){
  var g = Math.round(got * 100) / 100, w = Math.round(want * 100) / 100;
  ok(name + '  = $' + g.toFixed(2), g === w, 'expected $' + w.toFixed(2) + ', got $' + g.toFixed(2));
}
function fish(sp, lb, va){ return { sp:sp, lb:lb, va:va || {} }; }
function errs(f){ return E.vaErrors(f, E.spec(f.sp)); }
function head(s){ console.log('\n' + s); }

/* ---- AC1 — tier is species-gated, not weight-derived -------------------- */
head('AC1  Tier is species-gated');
eq('10 lb Wahoo → big rate (never small)', E.fishCost(fish('wahoo', 10), FP), 10 * 1.95);
eq('10 lb Yellowtail → small rate',        E.fishCost(fish('yt', 10), FP),    10 * 2.80);
eq('10 lb Bluefin → big rate',             E.fishCost(fish('bft', 10), FP),   10 * 1.95);
eq('10 lb White Seabass → big rate',       E.fishCost(fish('wsb', 10), FP),   10 * 1.95);
eq('10 lb Dorado → small rate',            E.fishCost(fish('dorado', 10), FP),10 * 2.80);
eq('10 lb Halibut → small rate',           E.fishCost(fish('hali', 10), FP),  10 * 2.80);
eq('6 lb Rockfish → small rate',           E.fishCost(fish('rock', 6), FP),    6 * 2.80);
eq('20 lb Yellowtail → big rate',          E.fishCost(fish('yt', 20), FP),    20 * 1.95);
ok('11.9 lb YT is under-12',  E.isUnder12(fish('yt', 11.9), E.spec('yt')));
ok('12.0 lb YT is NOT under-12', !E.isUnder12(fish('yt', 12), E.spec('yt')));
eq('Five Star ignores tier (flat 1.97)', E.fishCost(fish('yt', 10), FS), 10 * 1.97);

/* ---- AC2 — sub-minimum VA is blocked at input, never silently zeroed ---- */
head('AC2  Value-added below 15 lb is blocked');
ok('smoke 10 lb on a 35 lb bluefin → blocked', errs(fish('bft', 35, { sm:10 })).length === 1);
ok('  … and the message names the minimum',
   /15 lb minimum/.test(errs(fish('bft', 35, { sm:10 }))[0]),
   errs(fish('bft', 35, { sm:10 }))[0]);
ok('smoke 15 lb on a 35 lb bluefin → legal', errs(fish('bft', 35, { sm:15 })).length === 0);

/* ---- AC3 — Ed's worked examples: pounds do not pool across fish --------- */
head("AC3  Ed's examples — VA is drawn from an individual fish");
ok('one 10 lb YFT offers no VA', !E.vaEligible(fish('yft', 10), E.spec('yft')));
ok('two 10 lb YFT (20 lb pooled) — neither is VA-eligible',
   !E.vaEligible(fish('yft', 10), E.spec('yft')) && !E.vaEligible(fish('yft', 10), E.spec('yft')));
eq('  … each still bills as plain fillet', E.fishCost(fish('yft', 10), FP), 10 * 2.80);
ok('15 lb YFT IS VA-eligible', E.vaEligible(fish('yft', 15), E.spec('yft')));
eq('15 lb YFT → smoke 15 (whole fish)', E.fishCost(fish('yft', 15, { sm:15 }), FP), 15 * 3.50);
eq('15 lb YFT → jerky 15 (whole fish)', E.fishCost(fish('yft', 15, { jk:15 }), FP), 15 * 4.50);
ok('15 lb YFT → smoke 15 + jerky 15 → blocked (only 15 lb of fish)',
   errs(fish('yft', 15, { sm:15, jk:15 })).length === 1);
ok('  … "or" is arithmetic, not a rule',
   /Allocated 30 lb from a 15 lb fish/.test(errs(fish('yft', 15, { sm:15, jk:15 }))[0]),
   errs(fish('yft', 15, { sm:15, jk:15 }))[0]);

/* ---- AC4 — splitting a large fish across treatments --------------------- */
head('AC4  A large fish splits across treatments');
eq('35 lb BFT → smoke 15 + jerky 20  (fp)', E.fishCost(fish('bft', 35, { sm:15, jk:20 }), FP), 15*3.50 + 20*4.50);
eq('35 lb BFT → smoke 15 + jerky 20  (fs)', E.fishCost(fish('bft', 35, { sm:15, jk:20 }), FS), 15*2.75 + 20*3.75);
eq('35 lb BFT → smoke 15, 20 lb fillet',   E.fishCost(fish('bft', 35, { sm:15 }), FP),        20*1.95 + 15*3.50);
eq('90 lb BFT → 15/15/15, 45 lb fillet',   E.fishCost(fish('bft', 90, { sm:15, jk:15, cn:15 }), FP), 45*1.95 + 15*3.50 + 15*4.50 + 15*5.50);
ok('35 lb BFT → smoke 20 + jerky 20 → blocked (40 > 35)', errs(fish('bft', 35, { sm:20, jk:20 })).length === 1);

/* ---- AC5 — v1 bug: canning had no minimum ------------------------------- */
head('AC5  v1 bug — canning now honors the 15 lb minimum');
ok('canning 5 lb on a 20 lb YFT → blocked', errs(fish('yft', 20, { cn:5 })).length === 1);
console.log('      v1 billed this as $' + (15*1.95 + 5*5.50).toFixed(2) + ' — value-added the processor will not do');
eq('canning 15 lb on a 20 lb YFT → legal', E.fishCost(fish('yft', 20, { cn:15 }), FP), 5*1.95 + 15*5.50);

/* ---- VA eligibility by species ------------------------------------------ */
head('Value-added eligibility');
ok('Yellowtail: smoke only',  E.spec('yt').sm && !E.spec('yt').jk && !E.spec('yt').cn);
ok('Wahoo: smoke only',       E.spec('wahoo').sm && !E.spec('wahoo').jk && !E.spec('wahoo').cn);
ok('Bluefin: all three',      E.spec('bft').sm && E.spec('bft').jk && E.spec('bft').cn);
ok('Yellowfin: all three',    E.spec('yft').sm && E.spec('yft').jk && E.spec('yft').cn);
['dorado','wsb','hali','ling','rock'].forEach(function(k){
  ok(E.spec(k).n + ': no value-added', !E.hasVA(E.spec(k)));
});
ok('30 lb Rockfish still offers no VA', !E.vaEligible(fish('rock', 30), E.spec('rock')));
ok('jerky on a Wahoo → blocked', errs(fish('wahoo', 40, { jk:20 })).length === 1);

/* ---- Custom species ------------------------------------------------------ */
head('Custom species');
var custom = [{ k:'c1', n:'Cabrilla', u12:true }, { k:'c2', n:'Grouper', u12:false }];
eq('8 lb Cabrilla (u12 on) → small rate',  E.fishCost(fish('c1', 8), FP, custom), 8 * 2.80);
eq('8 lb Grouper  (u12 off) → big rate',   E.fishCost(fish('c2', 8), FP, custom), 8 * 1.95);
ok('custom species never carry VA', !E.hasVA(E.spec('c1', custom)));

/* ---- AC9 — trip-level: card fee and the single deposit ------------------ */
head('AC9  Trip level — card fee and one deposit');
var days = [
  { fish:[fish('yft', 30), fish('yt', 10)], collars:2, gillgut:0,  boxes:0 },
  { fish:[fish('bft', 60, { sm:15 })],      collars:0, gillgut:10, boxes:3 }
];
var d1 = 30*1.95 + 10*2.80 + 2*5.00;
var d2 = 45*1.95 + 15*3.50 + 10*1.55;
eq('day 1 processing', E.setProc(days[0], FP), d1);
eq('day 2 processing', E.setProc(days[1], FP), d2);
var qc = E.quote(days, FP, 'cash');
var qd = E.quote(days, FP, 'card');
eq('trip processing (cash)', qc.proc, d1 + d2);
eq('no card fee on cash',    qc.fee,  0);
eq('card fee = 3% of processing', qd.fee, (d1 + d2) * 0.03);
eq('deposit applied ONCE at trip level', qc.est - qc.net, 100);
eq('shipping: 3 boxes = 3×65 + 75 handling + 1 extra×10', E.setShip(days[1], FP), 3*65 + 75 + 1*10);
eq('Five Star does not ship', E.setShip(days[1], FS), 0);
eq('Five Star deposit is 0', E.quote(days, FS, 'cash').est - E.quote(days, FS, 'cash').net, 0);

/* ---- Aggregations -------------------------------------------------------- */
head('Aggregations');
var day = { fish:[fish('yt', 8), fish('yt', 25), fish('yt', 11.5), fish('bft', 40)], collars:0, gillgut:0, boxes:0 };
var s = E.dayStats(day);
ok('day count = 4',            s.n === 4);
ok('day pounds = 84.5',        Math.abs(s.lb - 84.5) < 1e-9, 'got ' + s.lb);
ok('under-12 pounds = 19.5',   Math.abs(s.u12lb - 19.5) < 1e-9, 'got ' + s.u12lb);
ok('borderline (10–14 lb) = 1', s.borderline === 1, 'got ' + s.borderline);
var ss = E.speciesStats([day], 'yt');
ok('YT: 3 fish / 44.5 lb', ss.n === 3 && Math.abs(ss.lb - 44.5) < 1e-9);

/* ---- Guards -------------------------------------------------------------- */
head('Guards');
eq('negative weight → 0', E.fishCost(fish('yt', -5), FP), 0);
eq('garbage weight → 0',  E.fishCost(fish('yt', 'abc'), FP), 0);
eq('unknown species → 0', E.fishCost(fish('zzz', 20), FP), 0);
eq('empty day → 0',       E.setProc({ fish:[] }, FP), 0);

console.log('\n' + '='.repeat(56));
console.log(fail === 0 ? '  ALL ' + pass + ' TESTS PASSED' : '  ' + pass + ' passed, ' + fail + ' FAILED');
console.log('='.repeat(56) + '\n');
process.exit(fail ? 1 : 0);
