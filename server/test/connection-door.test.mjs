/* ═══ v2.3.5528: THE CONNECTION DOOR -- THE PHONE'S SOCKET PHASE, ITS ONE WRITER (card L PR 5) ═══
 * (docs/specs/connection-door.md; src/game/connectionDoor.js)
 *
 * The phone's socket phase is one field, `S._realtimeStatus`, written only
 * by connTo, a word of CONN_PHASES.  This suite:
 *
 *   1. the door's own rules: every phase, a word that is none, no S, the
 *      switch;
 *   2. A SECOND WRITER FAILS: a write of S._realtimeStatus anywhere in src/
 *      outside connTo (the phase table's guard reads the same off the tree:
 *      DOOR_SUITES); every word a caller writes is a phase of the list; the
 *      callers are the wire system's (found by system, no big file named).
 *
 * Break proof, tried by hand: `S._realtimeStatus = 'idle';` back in the
 * socket's file -> FAIL 2.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { connTo, CONN_PHASES } from '../../src/game/connectionDoor.js';
import { filesOf } from '../../tools/guards/lib/filesOf.mjs';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}
const setSearch = (s) => { globalThis.location = { search: s }; };
setSearch('');

/* ── 1. the door's own rules ── */
{
  check('1. the phases', CONN_PHASES.join() === 'connecting,connected,disconnected,idle,linger,full,device,key,locked,origin,rejected,superseded,verify,frozen');
  const S = {};
  check('1. every phase is written', CONN_PHASES.every((p) => connTo(S, p) === true && S._realtimeStatus === p));
  connTo(S, 'connected');
  let bad = 0;
  for (const w of ['online', '', null, undefined, 7, '__proto__', 'constructor', 'CONNECTED']) if (connTo(S, w) !== false || S._realtimeStatus !== 'connected') bad++;
  check('1. a word that is no phase is refused, and the phase stands', bad === 0, bad);
  check('1. no S is refused', connTo(null, 'idle') === false && connTo(undefined, 'idle') === false);
  setSearch('?conndoor=0');
  check('1. ?conndoor=0: any word a caller writes, as before', connTo(S, 'online') === true && S._realtimeStatus === 'online');
  setSearch('');
}

/* ── 2. no second writer ── */
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
  const WRITE = /(?:\._realtimeStatus\b|\[\s*['"]_realtimeStatus['"]\s*\])\s*(?:[-+*/]?=(?!=)|\+\+|--)|delete\s+[\w$.]+\._realtimeStatus\b|Object\.assign\(\s*[\w$.]+\s*,[^)]*\{[^}]*\b_realtimeStatus\s*:/;
  const outside = [];
  let doorWrites = 0;
  for (const f of files) {
    const raw = read(f);
    if (!/_realtimeStatus/.test(raw)) continue;
    const lines = strip(raw).split('\n');
    let inDoor = false;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (f === 'src/game/connectionDoor.js') {
        if (/^export function connTo\(S, phase\) \{/.test(l)) inDoor = true;
        else if (inDoor && /^\}\s*$/.test(l)) inDoor = false;
      }
      if (!WRITE.test(l)) continue;
      if (inDoor) { doorWrites++; continue; }
      outside.push(f + ':' + (i + 1) + '  ' + l.trim().slice(0, 100));
    }
  }
  check('2. connTo writes the phase (one write)', doorWrites === 1, doorWrites);
  check('2. no write of S._realtimeStatus in src/ outside connTo', outside.length === 0, outside);
  const callers = files.filter((f) => !/connectionDoor\.js$/.test(f) && /\bconnTo\(/.test(strip(read(f))));
  const wire = new Set(filesOf('wire'));
  check('2. its callers are the wire system\'s', callers.length >= 1 && callers.every((f) => wire.has(f)), callers);
  const words = callers.flatMap((f) => [...strip(read(f)).matchAll(/connTo\(S, ([^)]*)\)/g)].map((m) => m[1].trim()));
  const off = words.filter((w) => !/^'[a-z]+'$/.test(w) || !CONN_PHASES.includes(w.slice(1, -1)));
  check(`2. every call writes a word of the list (${words.length} calls)`, words.length >= 21 && off.length === 0, off);
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
