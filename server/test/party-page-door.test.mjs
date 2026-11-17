/* ═══ v2.3.5529: THE PARTY'S PAGE DOOR -- THE PHONE'S PARTY, ITS ONE WRITER (card L PR 5) ═══
 * (docs/specs/party-page-door.md; src/game/partyDoor.js)
 *
 * The phone's party is one field, `S._party`, written only by partyTo, by a
 * way of PARTY_PAGE_WAYS (state, gone, rejoin).  This suite:
 *   1. the door's own rules: a roster in, a clear out, what is refused, the
 *      switch;
 *   2. A SECOND WRITER FAILS: a write of S._party anywhere in src/ outside
 *      partyTo (the phase table's guard reads the same off the tree); each
 *      way has its caller, in the wire system's files.
 *
 * Break proof, tried by hand: `S._party = payload;` back in the event
 * switch -> FAIL 2.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { partyTo, partyPhase, PARTY_PAGE_WAYS } from '../../src/game/partyDoor.js';
import { filesOf } from '../../tools/guards/lib/filesOf.mjs';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}
const setSearch = (s) => { globalThis.location = { search: s }; };
setSearch('');

{
  check('1. the ways', JSON.stringify(PARTY_PAGE_WAYS) === JSON.stringify({ state: 'member', gone: 'none', rejoin: 'none' }));
  const S = {};
  const roster = { id: 'p1', leader: 'a', members: [] };
  check('1. nothing: none', partyPhase(S) === 'none');
  check('1. the worker\'s roster: member', partyTo(S, roster, 'state') === true && S._party === roster && partyPhase(S) === 'member');
  check('1. gone: none', partyTo(S, null, 'gone') === true && S._party === null && partyPhase(S) === 'none');
  partyTo(S, roster, 'state');
  check('1. a rejoin clears it', partyTo(S, null, 'rejoin') === true && S._party === null);
  partyTo(S, roster, 'state');
  let bad = 0;
  for (const [p, w] of [[null, 'state'], ['p1', 'state'], [roster, 'gone'], [roster, 'rejoin'], [roster, 'nope'], [roster, 'constructor']]) if (partyTo(S, p, w) !== false || S._party !== roster) bad++;
  check('1. a roster that is no record, a clear that carries one, an unknown way: refused, the party stands', bad === 0, bad);
  check('1. no S is refused', partyTo(null, roster, 'state') === false);
  setSearch('?partydoor=0');
  check('1. ?partydoor=0: what a caller asks, as before', partyTo(S, 'x', 'state') === true && S._party === 'x');
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
  const WRITE = /(?:\._party\b|\[\s*['"]_party['"]\s*\])\s*(?:[-+*/]?=(?!=)|\+\+|--)|delete\s+[\w$.]+\._party\b|Object\.assign\(\s*[\w$.]+\s*,[^)]*\{[^}]*\b_party\s*:/;
  const outside = [];
  let doorWrites = 0;
  for (const f of files) {
    const raw = read(f);
    if (!/\b_party\b/.test(raw)) continue;
    const lines = strip(raw).split('\n');
    let inDoor = false;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (f === 'src/game/partyDoor.js') {
        if (/^export function partyTo\(S, party, way\) \{/.test(l)) inDoor = true;
        else if (inDoor && /^\}\s*$/.test(l)) inDoor = false;
      }
      if (!WRITE.test(l)) continue;
      if (inDoor) { doorWrites++; continue; }
      outside.push(f + ':' + (i + 1) + '  ' + l.trim().slice(0, 100));
    }
  }
  check('2. partyTo writes the party (one write)', doorWrites === 1, doorWrites);
  check('2. no write of S._party in src/ outside partyTo', outside.length === 0, outside);
  const callers = files.filter((f) => !/partyDoor\.js$/.test(f) && /\bpartyTo\(/.test(strip(read(f))));
  const wire = new Set(filesOf('wire'));
  const ways = callers.flatMap((f) => [...strip(read(f)).matchAll(/partyTo\(S, [^,]+, '([a-z]+)'\)/g)].map((m) => m[1])).sort();
  check('2. each way has its caller, in the wire system\'s files', callers.every((f) => wire.has(f)) && ways.join() === 'gone,rejoin,state', { callers, ways });
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
