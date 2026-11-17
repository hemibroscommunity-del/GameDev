/* ═══ v2.3.5529: THE DUEL'S PAGE DOOR -- THE PHONE'S DUEL, ITS ONE WRITER (card L PR 5) ═══
 * (docs/specs/duel-page-door.md; src/game/duelDoor.js)
 *
 * The phone's duel is one field, `S._inDuel`, its note `S._activeDuel`
 * written beside it, both only by duelTo, by a way of DUEL_PAGE_WAYS
 * (start, resume, pending, drop, end, rejoin).  This suite:
 *   1. the door's own rules: each way, the note left or written, what is
 *      refused, the phase, the switch;
 *   2. A SECOND WRITER FAILS: a write of S._inDuel or S._activeDuel anywhere
 *      in src/ outside duelTo (the phase table's guard reads S._inDuel off
 *      the tree); each way has its caller;
 *   3. the real callers: the Accept tap's pending duel and its drop
 *      (duelPending.js), a rejoin's clear and a resume (rejoinSlots.js).
 *
 * Break proof, tried by hand: `S._inDuel = null;` back in rejoinClear ->
 * FAIL 2.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { duelTo, duelPhase, DUEL_PAGE_WAYS } from '../../src/game/duelDoor.js';
import { enterPendingDuel } from '../../src/game/duelPending.js';
import { rejoinClear, duelResume } from '../../src/game/rejoinSlots.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}
const setSearch = (s) => { globalThis.location = { search: s }; };
setSearch('');

{
  check('1. the ways', JSON.stringify(DUEL_PAGE_WAYS) === JSON.stringify({ start: 'on', resume: 'on', pending: 'on', drop: 'back', end: 'none', rejoin: 'none' }));
  const S = {};
  const d = { opponent: 'b', wager: 0 };
  const note = { partnerId: 'b', startTs: 1 };
  check('1. nothing: none', duelPhase(S) === 'none');
  check('1. start writes the duel and its note', duelTo(S, d, 'start', note) === true && S._inDuel === d && S._activeDuel === note && duelPhase(S) === 'on');
  check('1. end clears both', duelTo(S, null, 'end', null) === true && S._inDuel === null && S._activeDuel === null && duelPhase(S) === 'none');
  const p = { opponent: 'c', settleBy: 9 };
  S._activeDuel = note;
  check('1. pending writes the duel alone (the note left)', duelTo(S, p, 'pending') === true && S._inDuel === p && S._activeDuel === note && duelPhase(S) === 'pending');
  check('1. drop goes back (and clears the note when asked)', duelTo(S, null, 'drop', null) === true && S._inDuel === null && S._activeDuel === null);
  check('1. resume writes both', duelTo(S, d, 'resume', note) === true && S._inDuel === d && S._activeDuel === note);
  let bad = 0;
  for (const [x, w, n] of [[null, 'start', note], [{}, 'start', note], [d, 'end', null], [null, 'end', note], [null, 'rejoin', note], [7, 'drop', null], [d, 'nope', null], [d, '__proto__', null]]) if (duelTo(S, x, w, n) !== false || S._inDuel !== d) bad++;
  check('1. a duel with no opponent, an end that leaves one, an unknown way: refused, the duel stands', bad === 0, bad);
  check('1. no S is refused', duelTo(null, d, 'start', note) === false);
  setSearch('?dueldoor=0');
  check('1. ?dueldoor=0: what a caller asks, as before', duelTo(S, d, 'end', note) === true && S._inDuel === d);
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
  const N = '_inDuel|_activeDuel';
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
      if (f === 'src/game/duelDoor.js') {
        if (/^export function duelTo\(S, duel, way, note\) \{/.test(l)) inDoor = true;
        else if (inDoor && /^\}\s*$/.test(l)) inDoor = false;
      }
      if (!WRITE.test(l)) continue;
      if (inDoor) { doorWrites++; continue; }
      outside.push(f + ':' + (i + 1) + '  ' + l.trim().slice(0, 100));
    }
  }
  check('2. duelTo writes the duel and its note (two writes)', doorWrites === 2, doorWrites);
  check('2. no write of S._inDuel or S._activeDuel in src/ outside duelTo', outside.length === 0, outside);
  const callers = files.filter((f) => !/duelDoor\.js$/.test(f) && /\bduelTo\(/.test(strip(read(f))));
  const ways = [...new Set(callers.flatMap((f) => [...strip(read(f)).matchAll(/, '(start|resume|pending|drop|end|rejoin)'[,)]/g)].map((m) => m[1])))].sort();
  check('2. every way has its caller', ways.join() === 'drop,end,pending,rejoin,resume,start', { ways, callers });
}

{
  const S = { myId: 'a', lockedTarget: null, others: {} };
  enterPendingDuel(S, 'b', 'Bee', 0, 1000);
  check('3. the Accept tap: a pending duel through the door', duelPhase(S) === 'pending' && S._inDuel.opponent === 'b');
  duelResume(S, { foe: 'b', foeName: 'Bee', wager: 5 }, 2000);
  check('3. a resume: the duel and its note', duelPhase(S) === 'on' && S._activeDuel && S._activeDuel.partnerId === 'b');
  rejoinClear(S, 9, () => {}, () => {});
  check('3. a rejoin clears both', S._inDuel === null && S._activeDuel === null);
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
