/* ═══ v2.3.5526: THE WINDOW DOOR -- WHAT IS OPEN OVER THE WORLD, ITS ONE WRITER (card L PR 5) ═══
 * (docs/specs/window-door.md; src/game/windowDoor.js)
 *
 * What is open over the world is one field, `S._windows` (a Map from the
 * reason to its hold), written only by windowTo, which also writes each
 * reason's old field (S._uiBusy, S._npcProxLatch) for its readers.  This
 * suite:
 *
 *   1. the door's own rules: each reason, a hold and a lift, the old field
 *      written as before (the panel's lift is false, the townsperson's
 *      null), the phase, a reason that is none, the switch;
 *   2. A SECOND WRITER FAILS: a write of S._windows or of a reason's old
 *      field anywhere in src/ outside windowTo (the phase table's guard
 *      reads S._windows off the tree too: DOOR_SUITES); every reason has its
 *      callers in the one screen that holds them (found by system).
 *
 * Break proof, tried by hand: `S._npcProxLatch = null;` back in the screen's
 * gameLoop -> FAIL 2.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { windowTo, windowPhase, WINDOW_WHYS } from '../../src/game/windowDoor.js';
import { filesOf } from '../../tools/guards/lib/filesOf.mjs';   /* the screens read by system, never by a big file's path */

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}
const setSearch = (s) => { globalThis.location = { search: s }; };
setSearch('');

/* ── 1. the door's own rules ── */
{
  check('1. the reasons and their old fields', JSON.stringify(WINDOW_WHYS) === JSON.stringify({ panel: '_uiBusy', npc: '_npcProxLatch' }));
  const S = {};
  check('1. nothing open: none', windowPhase(S) === 'none');
  const latch = { npc: { name: 'Mayor' }, ready: false };
  check('1. a panel opens: S._uiBusy true, in S._windows', windowTo(S, 'panel', true) === true && S._uiBusy === true && S._windows.get('panel') === true && windowPhase(S) === 'open');
  check('1. a townsperson\'s prompt: S._npcProxLatch its record', windowTo(S, 'npc', latch) === true && S._npcProxLatch === latch && S._windows.size === 2);
  windowTo(S, 'panel', false);
  check('1. the panel closes: S._uiBusy false (as before), still open by the prompt', S._uiBusy === false && windowPhase(S) === 'open' && S._windows.size === 1);
  windowTo(S, 'npc', null);
  check('1. the prompt released: S._npcProxLatch null, none', S._npcProxLatch === null && windowPhase(S) === 'none');
  windowTo(S, 'panel', undefined);
  check('1. a hold of undefined is a lift (false, as the old line\'s !!)', S._uiBusy === false && windowPhase(S) === 'none');
  check('1. a reason that is none, one off the prototype, or no S is refused',
    windowTo(S, 'guard', true) === false && windowTo(S, 'constructor', true) === false && windowTo(S, '__proto__', true) === false && windowTo(null, 'panel', true) === false && windowPhase(S) === 'none');
  setSearch('?windowdoor=0');
  const T = {};
  check('1. ?windowdoor=0: the old field alone, as before', windowTo(T, 'panel', true) === true && T._uiBusy === true && T._windows === undefined);
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
  const NAMES = '_windows|_uiBusy|_npcProxLatch';
  const WRITE = new RegExp(`(?:\\.(?:${NAMES})\\b|\\[\\s*['"](?:${NAMES})['"]\\s*\\])\\s*(?:[-+*/]?=(?!=)|\\+\\+|--)|delete\\s+[\\w$.]+\\.(?:${NAMES})\\b|Object\\.assign\\(\\s*[\\w$.]+\\s*,[^)]*\\{[^}]*\\b(?:${NAMES})\\s*:`);
  const outside = [];
  let doorWrites = 0;
  for (const f of files) {
    const raw = read(f);
    if (!new RegExp(NAMES).test(raw)) continue;
    const lines = strip(raw).split('\n');
    let inDoor = false;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (f === 'src/game/windowDoor.js') {
        if (/^export function windowTo\(S, why, hold\) \{/.test(l)) inDoor = true;
        else if (inDoor && /^\}\s*$/.test(l)) inDoor = false;
      }
      if (!WRITE.test(l)) continue;
      if (inDoor) { doorWrites++; continue; }
      outside.push(f + ':' + (i + 1) + '  ' + l.trim().slice(0, 100));
    }
  }
  check('2. windowTo makes S._windows (one write) and writes the old field by its reason',
    doorWrites === 1 && /S\[WINDOW_WHYS\[why\]\] = /.test(read('src/game/windowDoor.js')), doorWrites);
  check('2. no write of S._windows or a window\'s old field in src/ outside windowTo', outside.length === 0, outside);
  const callers = files.filter((f) => !/windowDoor\.js$/.test(f) && /\bwindowTo\(/.test(strip(read(f))));
  const ui = new Set(filesOf('ui'));
  check('2. one file calls windowTo, the ui system\'s screen', callers.length === 1 && ui.has(callers[0]), callers);
  const bt = callers.length ? strip(read(callers[0])) : '';
  const calls = [...bt.matchAll(/windowTo\((?:S|stateRef\.current), '([a-z]+)', ([^;]*?)\);/g)].map((m) => m[1] + (/^null$/.test(m[2].trim()) ? '-' : '+'));
  check('2. it writes the panel (every render, its own any-open) and holds and releases the townsperson\'s prompt',
    calls.includes('panel+') && calls.includes('npc+') && calls.includes('npc-') && calls.filter((c) => c === 'npc+').length === 4, calls);
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
