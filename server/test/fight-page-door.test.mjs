/* ═══ v2.3.5533: THE FIGHT'S PAGE DOOR -- YOUR SKULL ON THE PHONE, ITS ONE WRITER (card L PR 5) ═══
 * (docs/specs/fight-page-door.md; src/game/skullDoor.js)
 *
 * Your skull on the phone is one field, `S._pvpSkullType` (none, red,
 * white), its time `S._pvpSkullUntil` written beside it by the same call:
 * only skullTo (threat, issue, nml).  This suite:
 *   1. the door's own rules, the phase and the switch;
 *   2. A SECOND WRITER FAILS: a write of either anywhere in src/ outside
 *      skullTo; every way has its caller.
 *
 * Break proof, tried by hand: `S._pvpSkullType = null;` back in
 * noMansLand.js -> FAIL 2.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { skullTo, skullPhase, SKULL_WAYS } from '../../src/game/skullDoor.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}
const setSearch = (s) => { globalThis.location = { search: s }; };
setSearch('');

{
  check('1. the ways', JSON.stringify(SKULL_WAYS) === JSON.stringify({ threat: 'threat', issue: 'issue', nml: 'nml' }));
  const S = {};
  check('1. nothing: free', skullPhase(S) === 'free');
  check('1. red with its time', skullTo(S, 'red', 5000, 'issue') === true && S._pvpSkullType === 'red' && S._pvpSkullUntil === 5000 && skullPhase(S) === 'red');
  check('1. white with its time', skullTo(S, 'white', 7000, 'threat') === true && S._pvpSkullType === 'white' && S._pvpSkullUntil === 7000 && skullPhase(S) === 'white');
  check('1. none: the time back to 0', skullTo(S, null, 999, 'nml') === true && S._pvpSkullType === null && S._pvpSkullUntil === 0 && skullPhase(S) === 'free');
  skullTo(S, 'red', 5000, 'nml');
  let bad = 0;
  for (const [t, u, w] of [['black', 1, 'nml'], ['red', NaN, 'threat'], ['red', '120000abc', 'threat'], ['white', undefined, 'threat'], ['red', 1, 'nope'], ['red', 1, 'constructor']]) if (skullTo(S, t, u, w) !== false || S._pvpSkullType !== 'red' || S._pvpSkullUntil !== 5000) bad++;
  check('1. a kind that is no skull, a time that is no number, an unknown way: refused, the skull stands', bad === 0, bad);
  check('1. no S is refused', skullTo(null, 'red', 1, 'nml') === false);
  setSearch('?skulldoor=0');
  check('1. ?skulldoor=0: what a caller asks, as before', skullTo(S, 'red', '12x', 'threat') === true && S._pvpSkullUntil === '12x');
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
  const N = '_pvpSkullType|_pvpSkullUntil';
  const WRITE = new RegExp(`(?:\\.(?:${N})\\b|\\[\\s*['"](?:${N})['"]\\s*\\])\\s*(?:[-+*/]?=(?!=)|\\+\\+|--)|delete\\s+[\\w$.]+\\.(?:${N})\\b|Object\\.assign\\(\\s*[\\w$.]+\\s*,[^)]*\\{[^}]*\\b(?:${N})\\s*:`);
  const outside = [];
  let doorWrites = 0;
  for (const f of files) {
    const raw = read(f);
    if (!new RegExp(N).test(raw)) continue;
    const lines = strip(raw).split('\n');
    let inDoor = false;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (f === 'src/game/skullDoor.js') {
        if (/^export function skullTo\(S, type, until, way\) \{/.test(l)) inDoor = true;
        else if (inDoor && /^\}\s*$/.test(l)) inDoor = false;
      }
      if (!WRITE.test(l)) continue;
      if (inDoor) { doorWrites++; continue; }
      outside.push(f + ':' + (i + 1) + '  ' + l.trim().slice(0, 100));
    }
  }
  check('2. skullTo writes the skull and its time (four writes)', doorWrites === 4, doorWrites);
  check('2. no write of the skull or its time in src/ outside skullTo', outside.length === 0, outside);
  const ways = [...new Set(files.flatMap((f) => [...strip(read(f)).matchAll(/skullTo\(S, [^;]*?'(threat|issue|nml)'\)/g)].map((m) => m[1])))].sort();
  check('2. every way has its caller', ways.join() === 'issue,nml,threat', ways);
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
