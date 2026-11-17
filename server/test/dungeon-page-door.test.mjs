/* ═══ v2.3.5535: THE DUNGEON'S PAGE DOOR -- YOUR RUN ON THE PHONE, ITS ONE WRITER (card L PR 5) ═══
 * (docs/specs/dungeon-page-door.md; src/game/dungeonDoor.js)
 *
 * Your run on the phone is one field, `S._inDungeon`, its notes
 * `S._inCustomDungeon` and `S._dungeonComplete` written beside it by the
 * same call: only dungeonTo (enter, complete, leave), each call naming the
 * fields its site wrote.  This suite:
 *   1. the door's own rules, the phase and the switch;
 *   2. A SECOND WRITER FAILS: a write of any of the three anywhere in src/
 *      outside dungeonTo; every way has its caller.
 *
 * Break proof, tried by hand: `S._inDungeon = false;` back in respawn.js ->
 * FAIL 2.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dungeonTo, dungeonPhase, DUNGEON_PAGE_WAYS } from '../../src/game/dungeonDoor.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}
const setSearch = (s) => { globalThis.location = { search: s }; };
setSearch('');

{
  check('1. the ways', JSON.stringify(DUNGEON_PAGE_WAYS) === JSON.stringify({ enter: 'in', complete: 'complete', leave: 'out' }));
  const S = {};
  check('1. nothing: none', dungeonPhase(S) === 'none');
  check('1. enter: in, custom, not complete', dungeonTo(S, 'enter', { in: true, custom: true, complete: false }) === true && S._inDungeon === true && S._inCustomDungeon === true && S._dungeonComplete === false && dungeonPhase(S) === 'in');
  check('1. complete: the last wave beaten', dungeonTo(S, 'complete', { complete: true }) === true && S._dungeonComplete === true && dungeonPhase(S) === 'complete');
  check('1. a leave writes only what it names (complete kept, as the old site kept it)', dungeonTo(S, 'leave', { in: false, custom: false }) === true && S._inDungeon === false && S._inCustomDungeon === false && S._dungeonComplete === true && dungeonPhase(S) === 'none');
  check('1. ...and a full leave clears all three', dungeonTo(S, 'leave', { in: false, custom: false, complete: false }) === true && S._dungeonComplete === false);
  dungeonTo(S, 'enter', { in: true, custom: true, complete: false });
  let bad = 0;
  for (const [w, f] of [['enter', { in: false }], ['complete', { complete: false }], ['leave', { in: true }], ['leave', {}], ['leave', null], ['leave', { in: 0 }], ['leave', { bossy: false }], ['nope', { in: false }], ['constructor', { in: false }]]) {
    if (dungeonTo(S, w, f) !== false || S._inDungeon !== true || S._dungeonComplete !== false) bad++;
  }
  check('1. a way writing what it may not, no fields, a field that is no boolean or none of the three, an unknown way: refused, the run stands', bad === 0, bad);
  check('1. no S is refused', dungeonTo(null, 'leave', { in: false }) === false);
  setSearch('?dungeondoor=0');
  check('1. ?dungeondoor=0: what a caller asks, as before (the fields still booleans)', dungeonTo(S, 'leave', { in: true, custom: false }) === true && S._inDungeon === true && S._inCustomDungeon === false);
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
  const N = '_inDungeon|_inCustomDungeon|_dungeonComplete';
  const WRITE = new RegExp(`(?:\\.(?:${N})\\b|\\[\\s*['"](?:${N})['"]\\s*\\])\\s*(?:[-+*/]?=(?!=)|\\+\\+|--)|delete\\s+[\\w$.]+\\.(?:${N})\\b|Object\\.assign\\(\\s*S\\s*,[^)]*\\{[^}]*\\b(?:${N})\\s*:`);
  const outside = [];
  let doorWrites = 0;
  for (const f of files) {
    const raw = read(f);
    if (!new RegExp(N).test(raw)) continue;
    const lines = strip(raw).split('\n');
    let inDoor = false;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (f === 'src/game/dungeonDoor.js') {
        if (/^export function dungeonTo\(S, way, fields\) \{/.test(l)) inDoor = true;
        else if (inDoor && /^\}\s*$/.test(l)) inDoor = false;
      }
      if (!WRITE.test(l)) continue;
      if (inDoor) { doorWrites++; continue; }
      outside.push(f + ':' + (i + 1) + '  ' + l.trim().slice(0, 100));
    }
  }
  check('2. dungeonTo writes the three, each by its name (three writes)', doorWrites === 3, doorWrites);
  check('2. no write of the three in src/ outside dungeonTo', outside.length === 0, outside);
  const ways = [...new Set(files.flatMap((f) => [...strip(read(f)).matchAll(/dungeonTo\((?:S|st), '(enter|complete|leave)'/g)].map((m) => m[1])))].sort();
  check('2. every way has its caller', ways.join() === 'complete,enter,leave', ways);
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
