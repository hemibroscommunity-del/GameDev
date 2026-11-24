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
 * v2.3.6526, sitting 59's hold (the class, not the spellings): two more
 * checks.
 *   5. THE ORDER: the walk to a fixed point re-read only a file whose
 *      written import named a changed file, so `src/game/aaHand.js` with
 *      `import(DIR + 'common.js')`, sorted before common.js, was read once,
 *      too early, and never again (src/a/ green, src/z/ red).  The graph is
 *      now walked until no export changes, whatever the order, then every
 *      file is read against the final exports (a walk that does not settle
 *      throws).  Check 5 reads the real files in the reverse order and asks
 *      for the same census and edges; check 3 plays the reviewer's three
 *      files in all six orders.
 *   6. THE GETTER'S IMPORTERS, AN ALLOW LIST: a file whose exports bear the
 *      hand (a getter, a hand, an object or class holding one: debugBus's
 *      `{ getState }`) may be imported without a row only by a named import
 *      of names that bear nothing; every other edge into it, and every
 *      `import()` of a path the guard cannot read, is a row of IMPORTERS
 *      (lib/openHandKnown.mjs, by file, only falls: 37 rows, 37 edges).  So
 *      a new importer is red in ANY form, whatever happens after the
 *      import.  Check 3 plays sitting 59's three (`debugBus.getState()` from
 *      a new file, `{ getState = () => null } = await import(..)`, `const
 *      loading = import(..)` then `.then(C => C.getState())`) and card WL's
 *      own (a class's static getter, an array of getters, `import('@/zz' +
 *      'HandA.js')`, a middle file's default object): each red.
 *
 *   node tools/guards/open-hand.test.mjs            the verdict
 *   node tools/guards/open-hand.test.mjs --write    lowers the lists (KNOWN and
 *                                                   IMPORTERS) to what is found;
 *                                                   it never adds a row
 *
 * Run from the repository's root (cd server && npm test runs it with every
 * other guard and suite).  About twenty seconds (babel's scopes, read to a fixed
 * point, twice: the second in the reverse order).
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/systems.mjs';
import { loadBabel, openHandCensus, realSources, renderKnown, KNOWN_PATH } from './lib/openHand.mjs';
import { KNOWN, LINE, FILES_LINE, IMPORTERS } from './lib/openHandKnown.mjs';

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

/* ── 6. v2.3.6526 (sitting 59): the getter's importers, an ALLOW list ──
   A file whose exports bear the hand (a getter, a hand, an object or class
   holding one) may be imported without a row in ONE form: a named import of
   names that bear nothing.  Every other edge into it (a bearing name, the
   default when it bears, a namespace, `export * from`, any `import()` of it)
   and every `import()` of a path the guard cannot read is a row of IMPORTERS
   (by file; it only falls): a new importer in any form is red, a new file
   included, whatever the guard can or cannot follow after the import. */
const edges = census.edges;
const imp = Object.create(null);
for (const [rel, es] of edges) imp[rel] = es.length;
{
  let over6 = 0, n6 = 0;
  for (const rel of Object.keys(imp).sort()) {
    n6 += imp[rel];
    const row = IMPORTERS[rel] || 0;
    if (imp[rel] > row) {
      over6++;
      bad(`6 ${rel}: ${imp[rel]} edge(s) into a file that bears the hand, its row ${row ? 'allows ' + row : 'is none (a new importer)'}: ${edges.get(rel).map((e) => e.line + ' ' + e.how + ' (' + e.to + ')').join(', ')}`);
    }
  }
  const line6 = Object.values(IMPORTERS).reduce((a, b) => a + b, 0);
  if (!over6) ok(`6 the getter's importers: ${n6} edge(s) in ${Object.keys(imp).length} files, the list ${line6} in ${Object.keys(IMPORTERS).length} rows (by file; it only falls)`);
}

/* ── 5. v2.3.6526 (sitting 59's ORDER bug): the walk does not hang on the
   files' order.  The real files read in the reverse order give the same
   census and the same edges, file by file. */
{
  const rev = new Map([...realSources(ROOT)].reverse());
  const r = openHandCensus(babel, rev);
  const diff = [];
  for (const rel of new Set([...census.keys(), ...r.keys()])) {
    const a = census.has(rel) ? census.get(rel).size : 0, b = r.has(rel) ? r.get(rel).size : 0;
    if (a !== b) diff.push(`${rel} ${a} vs ${b}`);
  }
  for (const rel of new Set([...edges.keys(), ...r.edges.keys()])) {
    const a = edges.has(rel) ? edges.get(rel).length : 0, b = r.edges.has(rel) ? r.edges.get(rel).length : 0;
    if (a !== b) diff.push(`${rel} edges ${a} vs ${b}`);
  }
  if (diff.length) bad(`5 the census hangs on the files' order (sorted vs reversed): ${diff.slice(0, 8).join('; ')}`);
  else ok(`5 the census and the edges are the same in the reverse order (${census.size} files, ${[...edges.values()].reduce((t, e) => t + e.length, 0)} edges)`);
}

if (process.argv.includes('--write')) {
  const rows = {};
  for (const k of Object.keys(KNOWN)) if (found[k]) rows[k] = Math.min(KNOWN[k], found[k]);
  const sum = Object.values(rows).reduce((a, b) => a + b, 0);
  const impRows = {};
  for (const k of Object.keys(IMPORTERS)) if (imp[k]) impRows[k] = Math.min(IMPORTERS[k], imp[k]);
  writeFileSync(join(ROOT, KNOWN_PATH), renderKnown(rows, Math.min(LINE, sum), Math.min(FILES_LINE, Object.keys(rows).length), impRows));
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
  /* v2.3.6526: sitting 59's (each green before) and card WL's own three (not designed for): a
     reach in the importer, or an edge into a file that bears the hand (check 6), either is red */
  const caught = (r, rel) => (r.has(rel) && r.get(rel).size >= 1) || (r.edges.has(rel) && r.edges.get(rel).length >= 1);
  const HELD = [
    ['an object holding the getter (debugBus.getState())', "const getState = () => window._gameState.current;\nexport const debugBus = { getState };",
      "import { debugBus } from '@/zzHandA.js';\nexport const p = () => debugBus.getState().rpg;"],
    ['a destructure with a default, of await import()', GET,
      "export async function p() {\n  const { getState = () => null } = await import('@/zzHandA.js');\n  return getState().rpg;\n}"],
    ['import() kept, then .then(C => C.getState())', GET,
      "const loading = import('@/zzHandA.js');\nexport const p = () => loading.then((C) => C.getState());"],
    /* card WL's own */
    ['a class with a static getter', 'export class Bus { static get S() { return window._gameState.current; } }',
      "import { Bus } from '@/zzHandA.js';\nexport const p = () => Bus.S.rpg;"],
    ['an array of getters', 'const g = () => window._gameState;\nexport const GETS = [g];',
      "import { GETS } from '@/zzHandA.js';\nexport const p = () => GETS[0]().current;"],
    ['import() of a path that adds up', GET, "export const p = () => import('@/zz' + 'HandA.js').then((C) => C.getState());"],
  ];
  for (const [name, a, b] of HELD) {
    const r = two(a, b);
    if (!caught(r, B)) { missed++; bad(`3 the plant "${name}" adds no reach and no edge in the importer`); }
  }
  /* a middle file hands it on under its default: the reader's import is an edge */
  {
    const r = openHandCensus(babel, new Map([[A, GET], [M, "import { getState } from '@/zzHandA.js';\nexport default { getState };"],
      [C3, "import Mid from './zzHandM.js';\nexport const p = () => Mid.getState().rpg;"]]));
    if (!caught(r, C3)) { missed++; bad('3 the plant "a default object of a middle file holding the getter" adds no reach and no edge in the reader'); }
  }
  /* sitting 59's ORDER bug: a file sorted before the getter's, reaching it by a path that adds up,
     in every order of the three files */
  {
    const files = [['src/game/aaHand.js', "const DIR = '../ui/zzdash/';\nexport const p = () => import(DIR + 'common.js').then((C) => C.getState().rpg);"],
      ['src/ui/zzdash/common.js', GET], ['src/zzz.js', 'export const z = 1;']];
    const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
    const seen = perms.map((o) => { const r = openHandCensus(babel, new Map(o.map((i) => files[i]))); return caught(r, 'src/game/aaHand.js'); });
    if (!seen.every(Boolean)) { missed++; bad(`3 the order plant (aaHand.js before the getter's file) is caught in ${seen.filter(Boolean).length} of 6 orders`); }
  }
  ACROSS_N += HELD.length + 2;
}
if (!missed) ok(`3 every plant (${PLANTS.length + 2 + ACROSS_N}) adds a reach`);

process.exit(failed ? 1 : 0);
