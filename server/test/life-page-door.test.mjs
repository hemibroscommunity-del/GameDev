/* ═══ v2.3.5534: THE LIFE'S PAGE DOOR -- YOUR DYING SECONDS, THEIR ONE WRITER (card L PR 5) ═══
 * (docs/specs/life-page-door.md; src/game/dyingDoor.js)
 *
 * Your dying seconds on the phone are one field, `S._dying` (alive, dying),
 * its start `S._deathStart` written beside it by the same call: only
 * dyingTo (die, seed, respawn).  This suite:
 *   1. the door's own rules, the phase and the switch;
 *   2. A SECOND WRITER FAILS: a write of either anywhere in src/ outside
 *      dyingTo (the renderer's posed-picture copy is the guard's besides);
 *      every way has its caller.
 *
 * Break proof, tried by hand: `S._dying = false;` back in respawn.js ->
 * FAIL 2.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dyingTo, dyingPhase, DYING_WAYS } from '../../src/game/dyingDoor.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}
const setSearch = (s) => { globalThis.location = { search: s }; };
setSearch('');

{
  check('1. the ways', JSON.stringify(DYING_WAYS) === JSON.stringify({ die: 'dying', seed: 'start', respawn: 'alive' }));
  const S = {};
  check('1. nothing: alive', dyingPhase(S) === 'alive');
  check('1. seed: the start alone', dyingTo(S, 'seed', 500) === true && S._deathStart === 500 && !S._dying && dyingPhase(S) === 'alive');
  check('1. die: dying, from its start', dyingTo(S, 'die', 900) === true && S._dying === true && S._deathStart === 900 && dyingPhase(S) === 'dying');
  check('1. respawn: alive, the start back to 0', dyingTo(S, 'respawn') === true && S._dying === false && S._deathStart === 0 && dyingPhase(S) === 'alive');
  let bad = 0;
  for (const [w, st] of [['die', undefined], ['die', 'now'], ['seed', NaN], ['nope', 1], ['constructor', 1]]) if (dyingTo(S, w, st) !== false || S._dying !== false || S._deathStart !== 0) bad++;
  check('1. a start that is no number, an unknown way: refused, the life stands', bad === 0, bad);
  check('1. no S is refused', dyingTo(null, 'die', 1) === false);
  setSearch('?dyingdoor=0');
  check('1. ?dyingdoor=0: what a caller asks, as before', dyingTo(S, 'die', 'x') === true && S._dying === true && S._deathStart === 'x');
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
  const N = '_dying|_deathStart';
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
      if (f === 'src/game/dyingDoor.js') {
        if (/^export function dyingTo\(S, way, start\) \{/.test(l)) inDoor = true;
        else if (inDoor && /^\}\s*$/.test(l)) inDoor = false;
      }
      if (!WRITE.test(l)) continue;
      if (inDoor) { doorWrites++; continue; }
      outside.push(f + ':' + (i + 1) + '  ' + l.trim().slice(0, 100));
    }
  }
  check('2. dyingTo writes the life and its start (four writes)', doorWrites === 4, doorWrites);
  check('2. no write of S._dying or S._deathStart in src/ outside dyingTo', outside.length === 0, outside);
  const ways = [...new Set(files.flatMap((f) => [...strip(read(f)).matchAll(/dyingTo\(S, '(die|seed|respawn)'/g)].map((m) => m[1])))].sort();
  check('2. every way has its caller', ways.join() === 'die,respawn,seed', ways);
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
