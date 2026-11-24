/* ═══ v2.3.6523: THE OPEN HAND IS COUNTED (card WL PR 4; grand plan step 5.7) ═══
 *
 * BroTown.jsx hands the whole game to the page (`window._gameState =
 * stateRef`, `window._gameFns = {...}`), and code under src/ reaches through
 * that hand instead of being handed what it needs.  Nothing counted the
 * readers (the shape review, part 3 item 15: "OPEN and uncounted"), so a new
 * one was free.  Closing the hand is step 5.7, not this guard: this one
 * refuses a NEW reach, and its count only falls (the plan's rule 3).
 *
 * What a reach is, read off the syntax tree (@babel, the root's or
 * server/'s, as phase-table does; finish.md part 5 rule 2): lib/openHand.mjs's
 * header.  In short: the hand named off the global by any of its names
 * (`window`, `globalThis`, `self`, `window.window`, a name given the global),
 * by a key written out or one that adds up to it, taken apart
 * (`const { _gameState } = window`), asked for (`Reflect.get`, `in`, the
 * bare global), or reached through a name the file holds for it (a
 * module-level alias, a function that hands it back, each call; an import
 * of either from another file under src/, followed file to file).
 *
 * The census on 2026-11-24 (main at 0aec6482): 225 code lines in 84 files.
 * The shape review counted 96 lines in 53 files by the text
 * `window._gameState`; the tree finds 89 direct reaches in 52 files, and 32
 * more files that reach it through a getter another file exports
 * (`getState()` of src/ui/mobile/dash/common.js, `() =>
 * window._gameState.current`): each call is a reach (136 lines).
 *
 * It fails:
 *   1. a file whose reaches are more than its row of the frozen list
 *      (lib/openHandKnown.mjs), or a file with none listed: the lines are
 *      named;
 *   2. the reaches over LINE, or the files over FILES_LINE;
 *   3. its own plants, played every run on a fixture in memory: each of the
 *      tired spellings below must add a reach to a clean fixture, and the
 *      clean fixture (a comment, a string, a name that is not the global)
 *      must hold none (so a scan made blind fails here, not only by hand);
 *   4. @babel not found (npm install at the root or in server/).
 *
 * BREAK PROOF (rule 8), tried by hand on scratch edits, 2026-11-24 (and put back):
 *   a. src/ui/mobile/dash/GuildPanel.jsx, in its component: `const zz =
 *      window._gameState;`                                      -> FAIL 1, 2
 *   b. src/ui/mobile/dash/GuildPanel.jsx: a second `getState()` call on a
 *      new line (the getter of common.js)                       -> FAIL 1, 2
 *   c. a new file src/ui/zzHand.jsx: `import { getState } from
 *      './mobile/dash/common.js'; export const zz = () => getState().rpg;`
 *                                                     -> FAIL 1 (a new file), 2
 *   d. src/debug/crashTrap.js: its reach spelt `globalThis['_game' +
 *      'State']`                                     -> passes (the same line)
 *   e. lib/openHandKnown.mjs: LINE one lower                      -> FAIL 2
 *   (and check 3 plays the spellings below every run.)
 * NOT CAUGHT, and why: a new read through a name a FUNCTION holds (`const S
 * = getState()` is one reach; every later line reading S is not counted, or
 * each panel line would be a FAIL while 5.7 is open: the census counts where
 * the hand is TAKEN, which is what 5.7 changes); the global handed to a
 * function as an argument and read off its parameter; a key held in a
 * variable that changes; `eval`, `Function`; a walk over the global's keys;
 * `export * as C from` (a namespace handed on: not followed); a SECOND
 * reach on a line already counted (the census counts lines, by its rule:
 * two reads on one line are one line, as the line it holds is one).
 * v2.3.6523, sitting 57's spellings, each green before and now played by
 * check 3 every run: `import * as C` then `C.getState()` or `C.HAND`; an
 * imported getter given a new name (`const gs = getState`); a named
 * re-export (`export { getState } from`, renamed too) and `export * from`,
 * read by a third file.
 * v2.3.6523, sitting 58's spellings, each green before (the scan knew
 * spellings; it now FOLLOWS a namespace and judges every use of a getter,
 * and a form it cannot follow is a reach, lib/openHand.mjs's 'g'): `await
 * import()` (a name, taken apart, `.then`), a namespace taken apart,
 * `getState.bind` / `.call`, `{ getState }`, `useMemo(getState, [])`, a
 * namespace handed to a function or read by a key it cannot read, and an
 * `import(u)` of a path it cannot read: each played by check 3 every run.
 * The new reading finds two reaches that were there all along, so the
 * census is set by it in this PR (225 -> 227 lines, 84 -> 85 files):
 * debugBus.js 4 -> 5 (its `getState` put in the debug bus's object) and
 * lazyPanel.js 1 (its `import(url)` of a panel by a path it cannot read).
 *
 *   node tools/guards/open-hand.test.mjs            the verdict
 *   node tools/guards/open-hand.test.mjs --write    lowers the list to what is
 *                                                   found; it never adds a row
 *
 * Run from the repository's root (cd server && npm test runs it with every
 * other guard and suite).  About five seconds (babel's scopes on ~85 files).
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/systems.mjs';
import { loadBabel, openHandCensus, realSources, renderKnown, KNOWN_PATH } from './lib/openHand.mjs';
import { KNOWN, LINE, FILES_LINE } from './lib/openHandKnown.mjs';

let failed = 0;
const ok = (m) => console.log('ok   ' + m);
const bad = (m) => { failed++; console.log('FAIL ' + m); };

const babel = loadBabel(ROOT);
if (!babel) {
  bad('4 @babel/parser and @babel/traverse load from neither the root nor server/ (npm install in one of them)');
  process.exit(1);
}
ok('4 @babel loads');

/* ── 1 and 2: the real files ─────────────────────────────────────────── */
const census = openHandCensus(babel, realSources(ROOT));
let total = 0;
const found = Object.create(null);
for (const [rel, lines] of census) { found[rel] = lines.size; total += lines.size; }
let over = 0;
for (const rel of Object.keys(found).sort()) {
  const row = KNOWN[rel] || 0;
  if (found[rel] > row) {
    over++;
    const ls = [...census.get(rel).keys()].sort((a, b) => a - b);
    bad(`1 ${rel}: ${found[rel]} lines reach the open hand, its row ${row ? 'allows ' + row : 'is none (a new reader)'}; lines ${ls.slice(0, 12).join(', ')}${ls.length > 12 ? ', ...' : ''}.  Hand the code what it needs (the state it is given, a function of its system) instead of window._gameState / _gameFns (grand plan 5.7)`);
  }
}
if (!over) ok(`1 no file reaches the open hand more than its row (${Object.keys(found).length} files)`);
const files = Object.keys(found).length;
if (total > LINE) bad(`2 ${total} code lines reach the open hand, over the line ${LINE}`);
else if (files > FILES_LINE) bad(`2 ${files} files reach the open hand, over the line ${FILES_LINE}`);
else ok(`2 ${total} of ${LINE} lines, ${files} of ${FILES_LINE} files${total < LINE || files < FILES_LINE ? ' -- room: run --write to lower the list' : ''}`);

if (process.argv.includes('--write')) {
  const rows = {};
  for (const k of Object.keys(KNOWN)) if (found[k]) rows[k] = Math.min(KNOWN[k], found[k]);
  const sum = Object.values(rows).reduce((a, b) => a + b, 0);
  writeFileSync(join(ROOT, KNOWN_PATH), renderKnown(rows, Math.min(LINE, sum), Math.min(FILES_LINE, Object.keys(rows).length)));
  console.log(`wrote ${KNOWN_PATH}: ${sum} lines, ${Object.keys(rows).length} files (it never adds a row)`);
}

/* ── 3: the plants, on a fixture in memory ──────────────────────────── */
const CLEAN = [
  "// window._gameState is the open hand: a comment names it",
  "/* window._gameFns.foo() */",
  "export function f(S) { const x = 'window._gameState'; console.log('_gameState', x); return S.rpg; }",
  "export function g(win) { return win.devicePixelRatio + window.innerWidth; }",
  "const w0 = window; export const dpr = w0.devicePixelRatio;",
].join('\n');
const PLANTS = [
  ['an alias', 'export function p() { const g = window._gameState; return g.current; }'],
  ['globalThis', 'export function p() { return globalThis._gameState.current.rpg; }'],
  ['self, a bracket key', "export function p() { return self['_gameFns'].say(); }"],
  ['a key that adds up', "export function p() { return window['_game' + 'State']; }"],
  ['a key in a const', "const K = '_gameState'; export function p() { return window[K]; }"],
  ['a template key', 'export function p() { return window[`_gameFns`]; }'],
  ['window.window', 'export function p() { return window.window._gameState; }'],
  ['?. off the global', 'export function p() { return window?._gameState?.current; }'],
  ['a destructure', 'export function p() { const { _gameState } = window; return _gameState; }'],
  ['a destructure, renamed', 'export function p() { const { _gameFns: f } = globalThis; return f; }'],
  ['a destructure, nested', 'export function p() { const { window: { _gameState: h } } = globalThis; return h; }'],
  ['a name for the global', 'const w = window; export function p() { return w._gameState; }'],
  ['a guarded name for it', "const w = typeof window !== 'undefined' ? window : globalThis; export function p() { return w._gameState; }"],
  ['Reflect.get', "export function p() { return Reflect.get(window, '_gameState'); }"],
  ['in', "export function p() { return '_gameFns' in window; }"],
  ['the bare global', 'export function p() { return _gameState.current; }'],
  ['a module-level alias read in a new function', 'const H = window._gameState;\nexport function p() {\n  return H.current.rpg;\n}', 2],
  ['a getter, called', 'function gs() { return window._gameState.current; }\nexport function p() {\n  return gs().rpg;\n}', 2],
];
const FIX = 'src/zzOpenHandFixture.js';
const base = openHandCensus(babel, new Map([[FIX, CLEAN]]));
if (base.size) bad(`3 the clean fixture holds a reach (lines ${[...base.get(FIX).keys()].join(', ')}): the scan counts a comment, a string or a name that is not the global`);
else ok('3 the clean fixture (a comment, a string, a parameter, a name for the global used for something else) holds none');
let missed = 0;
for (const [name, code, atLeast = 1] of PLANTS) {
  const c = openHandCensus(babel, new Map([[FIX, CLEAN + '\n' + code]]));
  const n = c.has(FIX) ? c.get(FIX).size : 0;
  if (n < atLeast) { missed++; bad(`3 the plant "${name}" adds ${n} reaches (wants ${atLeast}): ${code.split('\n')[0]}`); }
}
/* across files: a getter exported, imported and called; an alias the same */
let ACROSS_N = 0;
{
  const A = 'src/zzHandA.js';
  const B = 'src/ui/zzHandB.jsx';
  const two = (a, b) => openHandCensus(babel, new Map([[A, a], [B, b]]));
  const g = two("export const getS = () => window._gameState.current;\nexport const HAND = window._gameFns;",
    "import { getS, HAND } from '@/zzHandA.js';\nexport function p() {\n  return getS().rpg;\n}\nexport function q() {\n  return HAND.say();\n}");
  const nb = g.has(B) ? g.get(B).size : 0;
  if (nb < 2) { missed++; bad(`3 the plant "an exported getter and alias, imported" adds ${nb} reaches in the importer (wants 2)`); }
  const h = two('export default function () { return window._gameState; }',
    "import pick from '../zzHandA.js';\nexport const p = () => pick().current;");
  if (!(h.has(B) && h.get(B).size >= 1)) { missed++; bad('3 the plant "a default-exported getter, imported by a relative path" adds no reach in the importer'); }
  /* v2.3.6523: sitting 57's spellings (each green before), every run */
  const GET = "export const getState = () => window._gameState.current;";
  const ACROSS = [
    ['a namespace import, its getter called', GET, "import * as C from '@/zzHandA.js';\nexport function p() {\n  return C.getState().rpg;\n}"],
    ['a namespace import, its alias read', 'export const HAND = window._gameFns;', "import * as C from '../zzHandA.js';\nexport const p = () => C.HAND.say();"],
    ['an imported getter given a new name', GET, "import { getState } from '@/zzHandA.js';\nconst gs = getState;\nexport function p() {\n  return gs().rpg;\n}"],
    /* v2.3.6523: sitting 58's (each green before): the namespace and the getter followed as a class */
    ['await import(), its getter called', GET, "export async function p() {\n  const C = await import('@/zzHandA.js');\n  return C.getState().rpg;\n}"],
    ['await import(), taken apart', GET, "export async function p() {\n  const { getState } = await import('../zzHandA.js');\n  return getState().rpg;\n}"],
    ['import().then, taken apart', GET, "export const p = () => import('@/zzHandA.js').then(({ getState }) => getState());"],
    ['a namespace taken apart', GET, "import * as C from '@/zzHandA.js';\nconst { getState } = C;\nexport const p = () => getState().rpg;"],
    ['getState.bind', GET, "import { getState } from '@/zzHandA.js';\nexport const p = getState.bind(null);"],
    ['getState.call', GET, "import { getState } from '@/zzHandA.js';\nexport const p = () => getState.call(null).rpg;"],
    ['a getter in an object', GET, "import { getState } from '@/zzHandA.js';\nexport const p = { getState };"],
    ['useMemo(getState)', GET, "import { useMemo } from 'react';\nimport { getState } from '@/zzHandA.js';\nexport function P() {\n  return useMemo(getState, []);\n}"],
    ['a namespace handed on', GET, "import * as C from '@/zzHandA.js';\nimport { use } from './zzElse.js';\nexport const p = use(C);"],
    ['a namespace by a key it cannot read', GET, "import * as C from '@/zzHandA.js';\nexport const p = (k) => C[k];"],
  ];
  /* a dynamic import whose path it cannot read: a form it cannot follow */
  {
    const r = two(GET, 'export const p = (u) => import(u);');
    if (!(r.has(B) && r.get(B).size >= 1)) { missed++; bad('3 the plant "import() of a path it cannot read" adds no reach'); }
    const ok2 = two(GET, "import * as C from '@/zzHandA.js';\nexport const p = () => C.other;");
    if (ok2.has(B)) { missed++; bad('3 a namespace read for a name that holds no hand is counted (it should not be)'); }
  }
  for (const [name, a, b] of ACROSS) {
    const r = two(a, b);
    if (!(r.has(B) && r.get(B).size >= 1)) { missed++; bad(`3 the plant "${name}" adds no reach in the importer`); }
  }
  /* a re-export in a middle file, read by a third */
  const M = 'src/ui/zzHandM.js';
  const C3 = 'src/ui/zzHandC.jsx';
  for (const [name, mid] of [['a named re-export', "export { getState } from '@/zzHandA.js';"], ['a named re-export, renamed', "export { getState as gs } from '@/zzHandA.js';"], ['export * from', "export * from '@/zzHandA.js';"]]) {
    const call = name.endsWith('renamed') ? 'gs' : 'getState';
    const r = openHandCensus(babel, new Map([[A, GET], [M, mid], [C3, `import { ${call} } from './zzHandM.js';\nexport const p = () => ${call}().rpg;`]]));
    if (!(r.has(C3) && r.get(C3).size >= 1)) { missed++; bad(`3 the plant "${name}" adds no reach in the reader`); }
  }
  ACROSS_N = ACROSS.length + 4;
}
if (!missed) ok(`3 every plant (${PLANTS.length + 2 + ACROSS_N}) adds a reach`);

process.exit(failed ? 1 : 0);
