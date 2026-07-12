const fs=require('fs'),path=require('path');const {JSDOM}=require('jsdom');
const dir=__dirname;
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const engine=fs.readFileSync(path.join(dir,'engine.js'),'utf8');
const doc=html.replace('<script src="engine.js"></script>',()=>'<script>'+engine+'<\/script>');
const errors=[];let pass=0,fail=0;
const dom=new JSDOM(doc,{runScripts:'dangerously',pretendToBeVisual:true,
  beforeParse(w){
    w.addEventListener('error',e=>{if(!/Not implemented/.test(e.message))errors.push(e.message);});
    const store={};
    Object.defineProperty(w,'localStorage',{value:{getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v);},removeItem:k=>{delete store[k];}}});
  }});
dom.virtualConsole.on('jsdomError',e=>{if(!/Not implemented/.test(e.message))errors.push(e.message);});
setTimeout(()=>{
  const w=dom.window,d=w.document;
  const t=(n,c,x)=>{c?(pass++,console.log('  ✓ '+n)):(fail++,console.log('  ✗ '+n+(x?'  → '+x:'')));};
  const fire=(el,ev)=>el.dispatchEvent(new w.Event(ev,{bubbles:true}));
  console.log('\nDOM SMOKE TEST');
  t('no script errors on load',errors.length===0,errors[0]);
  t('10 species tiles (9 + Other)',d.querySelectorAll('#tiles .tile').length===10,d.querySelectorAll('#tiles .tile').length);
  t('9 day-log sections, all collapsed',d.querySelectorAll('#daylog .spsec.empty').length===9);
  t('sticky bar visible on At-sea',!d.getElementById('stick').classList.contains('hide'));

  d.querySelectorAll('#tiles .tile')[0].click();
  t('fish sheet opens',!d.getElementById('scrim').classList.contains('hide'));
  const lb=d.getElementById('f-lb'); lb.value='25'; fire(lb,'input');
  t('VA panel appears on a 25 lb Yellowtail',!!d.querySelector('#f-vaslot [data-va="sm"]'));
  t('  … smoke only (no jerky/can for YT)',!d.querySelector('#f-vaslot [data-va="jk"]'));
  d.getElementById('f-save').click();
  t('sheet closes on save',d.getElementById('scrim').classList.contains('hide'));
  t('1 fish row rendered',d.querySelectorAll('#daylog .fishrow').length===1);
  t('day est = $48.75 (25 × 1.95)',d.getElementById('d-est').textContent==='$48.75',d.getElementById('d-est').textContent);
  t('sticky shows 1 fish',/>1<\/b> fish/.test(d.getElementById('stick-l').innerHTML));

  d.querySelectorAll('#daylog .fishrow')[0].click();
  const smi=d.querySelector('#f-vaslot [data-va="sm"]');
  smi.value='10'; fire(smi,'input');
  t('AC2: smoke 10 lb → error shown',!d.getElementById('f-err').classList.contains('hide'));
  t('AC2: smoke 10 lb → Save DISABLED',d.getElementById('f-save').disabled===true);
  t('AC2: message names the minimum',/15 lb minimum/.test(d.getElementById('f-err').textContent),d.getElementById('f-err').textContent);
  smi.value='15'; fire(smi,'input');
  t('smoke 15 lb → Save enabled',d.getElementById('f-save').disabled===false);
  t('allowance bar reads out the split',/15 lb value-added/.test(d.getElementById('f-allow').textContent),d.getElementById('f-allow').textContent);
  d.getElementById('f-save').click();
  // fp = 10×1.95 + 15×3.50 = $72.00 ; fs = 10×1.97 + 15×2.75 = $60.95 → Five Star wins once smoking is involved
  t('VA fish → cheaper processor = $60.95 (Five Star)',d.getElementById('d-est').textContent==='$60.95',d.getElementById('d-est').textContent);
  t("  … and Fisherman's shows $72.00",/\$72\.00/.test(d.getElementById('d-fp').textContent),d.getElementById('d-fp').textContent);
  t('  … cheaper label says Five Star',d.getElementById('d-cheap').textContent==='Five Star',d.getElementById('d-cheap').textContent);
  t('VA badge on the row',d.querySelectorAll('#daylog .badge.b-va').length===1);

  d.querySelectorAll('#tiles .tile')[2].click();
  const l2=d.getElementById('f-lb'); l2.value='10'; fire(l2,'input');
  t('AC3: 10 lb Yellowfin offers NO VA inputs',!d.querySelector('#f-vaslot [data-va]'));
  t("AC3: … and says pounds don't pool",/pool/.test(d.getElementById('f-vaslot').textContent));
  d.getElementById('f-save').click();
  t('U12 badge on the 10 lb yellowfin',d.querySelectorAll('#daylog .badge.b-u12').length===1);
  t('borderline ~ badge too (10–14 lb)',d.querySelectorAll('#daylog .badge.b-bl').length===1);

  d.querySelectorAll('#tiles .tile')[3].click();
  const l3=d.getElementById('f-lb'); l3.value='40'; fire(l3,'input');
  t('Wahoo: smoke offered, jerky not',!!d.querySelector('#f-vaslot [data-va="sm"]')&&!d.querySelector('#f-vaslot [data-va="jk"]'));
  d.getElementById('f-cancel').click();
  d.querySelectorAll('#tiles .tile')[8].click();
  const l4=d.getElementById('f-lb'); l4.value='30'; fire(l4,'input');
  t('30 lb Rockfish: no VA affordance at all',!d.querySelector('#f-vaslot [data-va]')&&d.getElementById('f-vaslot').textContent==='');
  d.getElementById('f-cancel').click();

  d.querySelector('[data-view="summary"]').click();
  t('Summary renders rows',d.querySelectorAll('#cmp-body tr').length>0);
  t('sticky hides off At-sea',d.getElementById('stick').classList.contains('hide'));
  d.querySelector('[data-view="actual"]').click();
  t('Dock renders count check',d.getElementById('a-count').innerHTML.length>0);
  t('Dock: YT under-12 input enabled',!!d.querySelector('#a-sprows [data-a="u"][data-k="yt"]'));
  t('Dock: Wahoo under-12 input DISABLED',!d.querySelector('#a-sprows [data-a="u"][data-k="wahoo"]'));
  const cnt=d.querySelector('#a-sprows [data-a="cnt"][data-k="yt"]');
  cnt.value='1'; fire(cnt,'input');
  t('count mismatch flagged (logged 2 YT, scaled 1)',/unaccounted for/.test(d.getElementById('a-count').innerHTML));

  t('no errors after full interaction',errors.length===0,errors[0]);
  console.log('\n'+'='.repeat(52));
  console.log(fail===0?'  ALL '+pass+' DOM TESTS PASSED':'  '+pass+' passed, '+fail+' FAILED');
  console.log('='.repeat(52)+'\n');
  process.exit(fail?1:0);
},500);
