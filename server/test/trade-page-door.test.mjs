/* ═══ v2.3.5530: THE TRADE'S PAGE DOOR -- THE PHONE'S TRADE, ITS ONE WRITER (card L PR 5) ═══
 * (docs/specs/trade-page-door.md; src/game/tradeSlot.js t2LiveTo)
 *
 * The phone's trade is one field, `S._t2Live` (none, or the open trade's
 * id), written only by t2LiveTo (open, close, rejoin).  This suite:
 *   1. the door's own rules, the phase and the switch;
 *   2. A SECOND WRITER FAILS: a write of S._t2Live anywhere in src/ outside
 *      t2LiveTo; every way has its caller;
 *   3. the real rejoin clears it (rejoinSlots.js rejoinClear).
 *
 * Break proof, tried by hand: `S._t2Live = null;` back in rejoinClear ->
 * FAIL 2.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { t2LiveTo, tradePhase, TRADE_PAGE_WAYS } from '../../src/game/tradeSlot.js';
import { rejoinClear } from '../../src/game/rejoinSlots.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}
const setSearch = (s) => { globalThis.location = { search: s }; };
setSearch('');

{
  check('1. the ways', JSON.stringify(TRADE_PAGE_WAYS) === JSON.stringify({ open: 'open', close: 'none', rejoin: 'none' }));
  const S = {};
  check('1. nothing: none', tradePhase(S) === 'none');
  check('1. open writes the id', t2LiveTo(S, 't9', 'open') === true && S._t2Live === 't9' && tradePhase(S) === 'open');
  check('1. ...or true when the worker sent none', t2LiveTo(S, true, 'open') === true && S._t2Live === true);
  check('1. close clears it', t2LiveTo(S, null, 'close') === true && S._t2Live === null && tradePhase(S) === 'none');
  t2LiveTo(S, 't9', 'open');
  let bad = 0;
  for (const [x, w] of [[null, 'open'], ['', 'open'], [{}, 'open'], ['t1', 'close'], ['t1', 'rejoin'], ['t1', 'nope'], ['t1', 'constructor']]) if (t2LiveTo(S, x, w) !== false || S._t2Live !== 't9') bad++;
  check('1. an open with no id, a clear that carries one, an unknown way: refused, the trade stands', bad === 0, bad);
  check('1. no S is refused', t2LiveTo(null, 't1', 'open') === false);
  setSearch('?tradedoor=0');
  check('1. ?tradedoor=0: what a caller asks, as before', t2LiveTo(S, 't1', 'close') === true && S._t2Live === 't1');
  setSearch('');
}

{
  const ROOT = new URL('../../', import.meta.url);
  const read = (f) => readFileSync(new URL(f, ROOT), 'utf8');
  const files = [];
  (function walk(rel) {
    for (const n of readdirSync(new URL(rel, ROOT))) {
      const r = rel + n;
      if (statSync(new URL(r, ROOT)).isDirectory()) walk(r + '/');
      else if (/\.(js|jsx|mjs)$/.test(n)) files.push(r);
    }
  })('src/');
  const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');
  const WRITE = /(?:\._t2Live\b|\[\s*['"]_t2Live['"]\s*\])\s*(?:[-+*/]?=(?!=)|\+\+|--)|delete\s+[\w$.]+\._t2Live\b|Object\.assign\(\s*[\w$.]+\s*,[^)]*\{[^}]*\b_t2Live\s*:/;
  const outside = [];
  let doorWrites = 0;
  for (const f of files) {
    const raw = read(f);
    if (!/_t2Live/.test(raw)) continue;
    const lines = strip(raw).split('\n');
    let inDoor = false;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (f === 'src/game/tradeSlot.js') {
        if (/^export function t2LiveTo\(S, id, way\) \{/.test(l)) inDoor = true;
        else if (inDoor && /^\}\s*$/.test(l)) inDoor = false;
      }
      if (!WRITE.test(l)) continue;
      if (inDoor) { doorWrites++; continue; }
      outside.push(f + ':' + (i + 1) + '  ' + l.trim().slice(0, 100));
    }
  }
  check('2. t2LiveTo writes the trade (one write)', doorWrites === 1, doorWrites);
  check('2. no write of S._t2Live in src/ outside t2LiveTo', outside.length === 0, outside);
  /* the way may be chosen in the call (open or close by the worker's state): every way word inside a call counts */
  const ways = [...new Set(files.flatMap((f) => [...strip(read(f)).matchAll(/t2LiveTo\(S,[^;]*;/g)].flatMap((m) => [...m[0].matchAll(/'(open|close|rejoin)'/g)].map((w) => w[1]))))].sort();
  check('2. every way has its caller', ways.join() === 'close,open,rejoin', ways);
}

{
  const S = { _t2Live: 't3' };
  rejoinClear(S, 9, () => {}, () => {});
  check('3. a rejoin clears the trade, through the door', S._t2Live === null);
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
