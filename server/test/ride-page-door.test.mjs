/* ═══ v2.3.5530: THE RIDE'S PAGE DOOR -- YOUR BOARD ON THE PHONE, ITS ONE WRITER (card L PR 5) ═══
 * (docs/specs/ride-page-door.md; src/game/ride.js rideTo)
 *
 * Your board on the phone is one record, `S._ride`, its phase its `on`;
 * the record and its `on` are written only by rideTo (make, apply, forget).
 * This suite:
 *   1. the door's own rules, the phase and the switch;
 *   2. A SECOND WRITER FAILS: a write of S._ride, or of a ride record's
 *      `on`, anywhere in src/ outside rideTo; every way has its caller;
 *   3. the real steps: rideApply (the worker's ride_state) and clearRide.
 *
 * Break proof, tried by hand: `r.on = !!p.on;` back in rideApply -> FAIL 2.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { rideTo, ridePhase, RIDE_PAGE_WAYS, rideApply, clearRide } from '../../src/game/ride.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}
const setSearch = (s) => { globalThis.location = { search: s }; };
setSearch('');

{
  check('1. the ways', JSON.stringify(RIDE_PAGE_WAYS) === JSON.stringify({ make: 'off', apply: 'word', forget: 'none' }));
  const S = {};
  check('1. nothing: off', ridePhase(S) === 'off');
  check('1. apply with no record is refused', rideTo(S, true, 'apply') === false && S._ride === undefined);
  check('1. make: a fresh record, off', rideTo(S, null, 'make') === true && S._ride && S._ride.on === false && ridePhase(S) === 'off');
  const rec = S._ride;
  check('1. make over a live record is refused (it stands)', rideTo(S, null, 'make') === false && S._ride === rec);
  check('1. apply: the worker\'s word', rideTo(S, 1, 'apply') === true && S._ride.on === true && ridePhase(S) === 'on' && rideTo(S, 0, 'apply') === true && S._ride.on === false);
  check('1. forget: none', rideTo(S, null, 'forget') === true && S._ride === null && ridePhase(S) === 'off');
  check('1. an unknown way, one off the prototype, no S: refused', rideTo(S, 1, 'nope') === false && rideTo(S, 1, 'constructor') === false && rideTo(null, 1, 'make') === false);
  setSearch('?ridedoor=0');
  rideTo(S, null, 'make');
  const r1 = S._ride;
  check('1. ?ridedoor=0: a fresh record over a live one, as before', rideTo(S, null, 'make') === true && S._ride !== r1);
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
  const WRITE = /(?:\._ride\b(?:\.on\b)?|\[\s*['"]_ride['"]\s*\])\s*(?:[-+*/]?=(?!=)|\+\+|--)|delete\s+[\w$.]+\._ride\b|Object\.assign\(\s*[\w$.]+\s*,[^)]*\{[^}]*\b_ride\s*:/;
  /* the ride's own file names its record `r`: a write of `r.on` there is the phase too */
  const RON = /\br\.on\s*(?:[-+*/]?=(?!=))/;
  const outside = [];
  let doorWrites = 0;
  for (const f of files) {
    const raw = read(f);
    if (!/_ride\b/.test(raw)) continue;
    const lines = strip(raw).split('\n');
    let inDoor = false;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      const own = f === 'src/game/ride.js';
      if (own) {
        if (/^export function rideTo\(S, on, way\) \{/.test(l)) inDoor = true;
        else if (inDoor && /^\}\s*$/.test(l)) inDoor = false;
      }
      if (!(WRITE.test(l) || (own && RON.test(l)))) continue;
      if (inDoor) { doorWrites++; continue; }
      outside.push(f + ':' + (i + 1) + '  ' + l.trim().slice(0, 100));
    }
  }
  check('2. rideTo writes the record and its on (three writes: forget, make, apply)', doorWrites === 3, doorWrites);
  check('2. no write of S._ride or its on in src/ outside rideTo', outside.length === 0, outside);
  const ways = [...new Set(files.flatMap((f) => [...strip(read(f)).matchAll(/rideTo\(S, [^,]+, '(make|apply|forget)'\)/g)].map((m) => m[1])))].sort();
  check('2. every way has its caller', ways.join() === 'apply,forget,make', ways);
}

{
  const S = { channel: null };
  rideApply(S, { on: 1, why: null }, 1000);
  check('3. the worker\'s ride_state puts you on, through the door', ridePhase(S) === 'on' && S._ride.n === 1);
  rideApply(S, { on: 0, why: 'edge' }, 2000);
  check('3. ...and off', ridePhase(S) === 'off' && S._ride.why === 'edge');
  clearRide(S);
  check('3. clearRide forgets the board', S._ride === null);
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
