/* ═══ v2.3.5531: THE ARENA'S PAGE DOOR -- YOUR ARENA ON THE PHONE, ITS ONE WRITER (card L PR 5) ═══
 * (docs/specs/arena-page-door.md; src/game/arenaDoor.js)
 *
 * Your arena on the phone is one field, `S._arenaMatch` (none, or your live
 * match), its notes `S._arenaInvolved` and `S._arenaTournamentId` written
 * beside it by the same call: only arenaTo, by the poll.  This suite:
 *   1. the door's own rules, the phase and the switch;
 *   2. A SECOND WRITER FAILS: a write of any of the three anywhere in src/
 *      outside arenaTo; the poll is its one caller, in the ui system.
 *
 * Break proof, tried by hand: `S3._arenaMatch = null;` back in the screen's
 * poll -> FAIL 2.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { arenaTo, arenaPhase, ARENA_PAGE_WAYS } from '../../src/game/arenaDoor.js';
import { filesOf } from '../../tools/guards/lib/filesOf.mjs';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}
const setSearch = (s) => { globalThis.location = { search: s }; };
setSearch('');

{
  check('1. the ways', JSON.stringify(ARENA_PAGE_WAYS) === JSON.stringify({ poll: 'poll' }));
  const S = {};
  check('1. nothing: none', arenaPhase(S) === 'none');
  check('1. queued, no match: involved', arenaTo(S, 'poll', true, null) === true && S._arenaInvolved === true && S._arenaMatch === null && arenaPhase(S) === 'involved');
  const m = { id: 'm1', p1: 'a', p2: 'b' };
  check('1. a live match: fighting, with its tournament', arenaTo(S, 'poll', true, m, 't7') === true && S._arenaMatch === m && S._arenaTournamentId === 't7' && arenaPhase(S) === 'fighting');
  check('1. the match over: its tournament id kept, as the poll left it', arenaTo(S, 'poll', true, null, undefined) === true && S._arenaMatch === null && S._arenaTournamentId === 't7');
  check('1. out of it: none', arenaTo(S, 'poll', false, null) === true && arenaPhase(S) === 'none');
  check('1. a match that is no record, an unknown way, no S: refused',
    arenaTo(S, 'poll', true, 'm1', 't') === false && arenaTo(S, 'nope', true, m, 't') === false && arenaTo(S, 'constructor', true, m, 't') === false && arenaTo(null, 'poll', true, m, 't') === false && arenaPhase(S) === 'none');
  setSearch('?arenadoor=0');
  check('1. ?arenadoor=0: what the poll asks, as before', arenaTo(S, 'poll', true, 'm1', 't') === true && S._arenaMatch === 'm1');
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
  const N = '_arenaMatch|_arenaInvolved|_arenaTournamentId';
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
      if (f === 'src/game/arenaDoor.js') {
        if (/^export function arenaTo\(S, way, involved, match, tid\) \{/.test(l)) inDoor = true;
        else if (inDoor && /^\}\s*$/.test(l)) inDoor = false;
      }
      if (!WRITE.test(l)) continue;
      if (inDoor) { doorWrites++; continue; }
      outside.push(f + ':' + (i + 1) + '  ' + l.trim().slice(0, 100));
    }
  }
  check('2. arenaTo writes the match and its notes (four writes)', doorWrites === 4, doorWrites);
  check('2. no write of the three in src/ outside arenaTo', outside.length === 0, outside);
  const callers = files.filter((f) => !/arenaDoor\.js$/.test(f) && /\barenaTo\(/.test(strip(read(f))));
  const ui = new Set(filesOf('ui'));
  check('2. the poll is its one caller, the ui system\'s screen', callers.length === 1 && ui.has(callers[0]) && /arenaTo\(S3, 'poll',/.test(strip(read(callers[0]))), callers);
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
