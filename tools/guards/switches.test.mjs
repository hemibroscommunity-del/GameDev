/* ═══ v2.3.5301: THE SWITCH TABLE HOLDS (grand plan step 7.1, card T PR 1) ═══
 *
 * The table is tools/guards/lib/switches.mjs; the names in the code are the
 * scanner's (tools/guards/lib/switchScan.mjs); docs/SWITCHES.md is made from
 * the table.  The rules: docs/specs/switch-table.md.  This guard holds (the
 * plan's rule 3: a census, made strict by the gatekeeper alone):
 *
 *   1. every name the scanner finds is a row, or counted as UNLISTED: the
 *      count only falls (UNLISTED_LINE);
 *   2. a read in a shape the scanner does not know is counted apart: only
 *      falls (UNKNOWN_LINE); and every excuse it keeps (DYNAMIC, NOT_ADDRESS,
 *      NOT_A_FLAG) is still found, so none excuses a new line;
 *   3. every row is still found by the scanner (a switch removed takes its
 *      row with it);
 *   4. every row has every column, each of its kind;
 *   5. no name is in two rows;
 *   6. every `system` is in card B's map;
 *   7. `born: 'unknown'` only falls (BORN_UNKNOWN_LINE);
 *   8. docs/SWITCHES.md is what the table makes;
 *   9. every shape the scanner knows finds its fixture's names (SHAPES
 *      below: v2.3.5302, after the gatekeeper's review of sitting 8 found
 *      shapes that hid a switch).  Each fixture is a break proof that runs
 *      on every PR.
 *  10. every row is in its place: by side, then by name (v2.3.5304:
 *      the gatekeeper's sitting 11; a new row goes where its name puts
 *      it, so two row-adding PRs meet only when their names are neighbours).
 *  11. rule 4 (v2.3.5304): every need is a row; no switch needs itself,
 *      however far round; a worker row with needs names its reader, which
 *      reads each need (switchScan.mjs readsOf: directly or through the
 *      functions it calls); a row that may never go off needs no switch
 *      still in the table;
 *  12. the fallback hold (v2.3.5305): while a fallback's trigger is still
 *      in its file, its row stays (with the same fallback) and its read is
 *      still found; an entry whose trigger is gone leaves FALLBACKS (and its
 *      row's fallback goes to 'no') in that PR; the list only shrinks
 *      (FALLBACK_LINE, the gatekeeper's).  Check 4 holds each switch row's
 *      `on` (the end date: a day, 'off', or 'unknown' with its born).
 *  13. the page's one reader (src/game/switches.js) holds the table's forms
 *      and needs between its markers (v2.3.5306; --write writes them).
 *
 * BREAK PROOF (rule 8), each tried by hand once, 2026-11-14:
 *   - a method `_zzz() { if (this._flagOn('zzz')) return; }` in
 *     server/src/dice.js                 -> FAIL 1 (196 unlisted; zzz no row)
 *   - `const Z = /[?&]zzz=0/.test(location.search);` at the end of
 *     src/game/dice.js                   -> FAIL 1 (196 unlisted)
 *   - `risk: ''` on the `farm` row       -> FAIL 4 (and 8)
 *   - a method `_zzk(k) { const f = this._liveFlags; return f[k + 1]; }` in
 *     server/src/dice.js                 -> FAIL 2 (a read in no known shape)
 *   - the `bosschest` row named `bosschest2`
 *                                        -> FAIL 1 (bosschest no row), FAIL 3
 *   (v2.3.5302, each tried by hand once, 2026-11-14, in switchScan.mjs:)
 *   - the `(flags || {}).x` rule's regex made never to match
 *                                        -> FAIL 9 (W5)
 *   - a local followed 8 lines, not its function
 *                                        -> FAIL 9 (W8)
 *   - only the first name of a `[?&](a|b)` group kept
 *                                        -> FAIL 9 (P5)
 *   (v2.3.5304, tried by hand once, 2026-11-14:)
 *   - the `farm` row moved above `accuracy`
 *                                        -> FAIL 10 (accuracy is after farm)
 *   - `_lastPlaceOn` (server/src/lastplace.js) made to `return true` in place
 *     of `this._moveBudgetOn()`: a need left unread in its reader
 *                                        -> FAIL 11 (lastplace's reader does
 *                                           not read movebudget)
 *   (v2.3.5305, tried by hand once, 2026-11-14:)
 *   - `?onebatch`'s read in src/rendering/paletteTex.js renamed away,
 *     SOFTWARE_GL kept                   -> FAIL 12 (its read is gone while
 *                                           SOFTWARE_GL still uses its old
 *                                           way), and 1, 3
 *   - the same, with the `?onebatch` row deleted too
 *                                        -> FAIL 12 (its row is gone)
 *   - SOFTWARE_GL renamed away in that file, the list kept
 *                                        -> FAIL 12 (its trigger is gone)
 *   (v2.3.5307, tried by hand once, 2026-11-15:)
 *   - a `cold-flags.test.mjs: FAIL 1. x` line in `farm`'s thrownFails
 *                                        -> FAIL 4 (a canary suite named)
 *   Rehearsed: two branches from one table, one adding `?aardvark`, the
 *   other `?minnow`, each in its place: merged in both orders, clean, and
 *   the merged page is what --write makes.
 *
 * Run from the repository's root:
 *   node tools/guards/switches.test.mjs              the checks
 *   node tools/guards/switches.test.mjs --write      write docs/SWITCHES.md from the table
 *   node tools/guards/switches.test.mjs --list farm  a system's rows (`unlisted`: the names with no row)
 *   node tools/guards/switches.test.mjs --where farm where the code reads a name
 *   node tools/guards/switches.test.mjs --due [YYYY-MM-DD]
 *                                                    the rows the end date's rule would let go, and
 *                                                    why (today, or the day given); in no CI and
 *                                                    no precheck, and it changes nothing
 * (cd server && npm test runs it with every other guard and suite).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { SWITCHES, SIDES, KINDS, RISKS, COLUMNS, OPTIONAL, FALLBACKS } from './lib/switches.mjs';
import { census, scanWorker, scanPage, readsOf, blankComments, pageForm, DYNAMIC, NOT_ADDRESS, NOT_A_FLAG, ROOT } from './lib/switchScan.mjs';
import { SYSTEMS } from './lib/systems.mjs';

/* the census lines: each only falls, and only the gatekeeper lowers one */
const UNLISTED_LINE = 0;        /* every name a row since card T's PR 3: the gatekeeper may make it strict */
const UNKNOWN_LINE = 0;
const BORN_UNKNOWN_LINE = 2;    /* ?debug, ?nodebug: April commits with no tag in the commit, its body or its merge */

const FALLBACK_LINE = 5;       /* FALLBACKS (lib/switches.mjs): the list only shrinks, the gatekeeper's */
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const DUE_DAYS = 28;            /* the plan's rule: four weeks on for everyone */

/* a fallback's trigger, read: its names and its file, and whether each name
   is still in the file's code (comments blanked) */
function trigger(fb) {
  const m = /^(.+) in (\S+)$/.exec(fb);
  /* a note in brackets is words, not a trigger (v2.3.5305: card O's
     v2.3.5228 wrote where the overrides now live) */
  const names = m[1].replace(/\([^)]*\)/g, '').split(',').map((s) => s.trim()).filter(Boolean);
  const path = join(ROOT, m[2]);
  const code = existsSync(path) ? blankComments(readFileSync(path, 'utf8')) : '';
  const lives = names.filter((n) => new RegExp('(^|[^\\w$])' + n.replace(/[$]/g, '\\$') + '([^\\w$]|$)').test(code));
  return { names, file: m[2], lives };
}
function fallbackHold(found) {
  const by = new Map(SWITCHES.map((r) => [r.name, r]));
  const held = [], stale = [], added = [];
  for (const [name, fb] of Object.entries(FALLBACKS)) {
    const t = trigger(fb);
    if (!t.lives.length) { stale.push(`${name}: its trigger (${fb}) is gone: take it from FALLBACKS, and the row's fallback to 'no'`); continue; }
    const r = by.get(name);
    if (!r) held.push(`${name}: its row is gone while ${t.lives.join(', ')} still in ${t.file} uses its old way`);
    else if (r.fallback !== fb) held.push(`${name}: its row says fallback ${JSON.stringify(r.fallback)}, the list ${JSON.stringify(fb)}, while the trigger lives`);
    else if (!found.has(name)) held.push(`${name}: its read is gone while ${t.lives.join(', ')} still in ${t.file} uses its old way`);
  }
  for (const r of SWITCHES) if (r.fallback !== 'no' && !Object.hasOwn(FALLBACKS, r.name)) added.push(`${r.name}: ${r.fallback}`);
  return { held, stale, added };
}

/* ── v2.3.5306: the page's one reader (src/game/switches.js).  Its forms and
   needs are the table's, written between its markers by --write and held
   equal (check 13): one source (the plan's rule 2) ── */
const READER = join(ROOT, 'src/game/switches.js');
const READER_OPEN = '/* @@switch-forms */';
const READER_CLOSE = '/* @@end */';
function readerBlockText() {
  const pageRows = SWITCHES.filter((r) => r.side !== 'worker');
  const seen = new Set(pageRows.map((r) => r.name.replace(/^\?/, '')));
  const q = (s) => "'" + s + "'";
  const forms = pageRows.map((r) => `  ${q(r.name.replace(/^\?/, ''))}: ${q(pageForm(r))},`);
  const needs = pageRows.map((r) => [r.name.replace(/^\?/, ''), r.needs.map((n) => n.replace(/^\?/, '')).filter((n) => seen.has(n))])
    .filter(([, n]) => n.length).map(([k, n]) => `  ${q(k)}: [${n.map(q).join(', ')}],`);
  return [READER_OPEN, 'const FORMS = {', ...forms, '};', 'const NEEDS = {', ...needs, '};', READER_CLOSE].join('\n');
}
function readerWith(src) {
  const a = src.indexOf(READER_OPEN), b = src.indexOf(READER_CLOSE);
  if (a < 0 || b < a) return null;
  return src.slice(0, a) + readerBlockText() + src.slice(b + READER_CLOSE.length);
}

/* ── --due: the rows the end date's rule would let go, and why.  It runs in
   no CI and no precheck, and changes nothing: reaping is a later card's
   (7.3), a batch a PR, each merged by the owner ── */
function due(asOf) {
  const day = (s) => Date.parse(s + 'T00:00:00Z');
  const now = asOf ? day(asOf) : Date.now();
  const by = new Map(SWITCHES.map((r) => [r.name, r]));
  const neededBy = new Map();
  for (const r of SWITCHES) for (const n of r.needs) { if (!neededBy.has(n)) neededBy.set(n, []); neededBy.get(n).push(r.name); }
  const go = [], stay = { young: [], device: [], fallback: [], off: [], never: [], other: [] };
  for (const r of SWITCHES.filter((x) => x.kind === 'switch')) {
    const dep = (neededBy.get(r.name) || []).filter((n) => by.has(n));
    if (r.never !== undefined) { stay.never.push(`${r.name}: may never go off (${r.never})`); continue; }
    if (!DAY.test(r.on)) { stay.off.push(`${r.name}: on ${r.on}`); continue; }
    if (r.fallback !== 'no') { stay.fallback.push(`${r.name}: its trigger lives (${r.fallback})`); continue; }
    if (r.risk === 'memory' || r.risk === 'chip') { stay.device.push(`${r.name}: a ${r.risk} off-ramp, kept while its risk is live (the owner's call, never by age)`); continue; }
    const days = Math.floor((now - day(r.on)) / 864e5);
    if (days < DUE_DAYS) { stay.young.push(`${r.name}: on ${r.on}, ${days} days (due at ${DUE_DAYS})`); continue; }
    go.push(`${r.name.padEnd(22)} ${r.side.padEnd(6)} on ${r.on}${r.onBy ? ' (v2.3.' + r.onBy + ')' : ''}, ${days} days${dep.length ? '; needed by ' + dep.join(', ') + ' (each one\'s reader asks it: the reap changes them in the same PR)' : ''}`);
  }
  const asText = asOf || new Date(now).toISOString().slice(0, 10);
  console.log(`THE END DATE (docs/specs/switch-table.md), as of ${asText}: a logic switch ${DUE_DAYS} days on for everyone, with no revert, may let its old way go.`);
  console.log('Nothing here is reaped: reaping is a later card\'s, a batch a PR, each merged by the owner.');
  console.log('"No revert" is checked by hand before a reap: no commit on main since `on` turned its default back (`git log --since=<on> -S<name>`),');
  console.log('and the owner\'s live flags (the Test panel) not holding it thrown: the repository cannot see them.\n');
  console.log(`MAY GO (${go.length}):`);
  for (const l of go) console.log('  ' + l);
  const say = (t, l) => { console.log(`\nSTAYS, ${t} (${l.length}):`); for (const x of l) console.log('  ' + x); };
  say('not yet four weeks on', stay.young);
  say('a device off-ramp', stay.device);
  say('its fallback\'s trigger lives', stay.fallback);
  say('not on for everyone (an opt-in) or no day known', stay.off);
  say('may never go off', stay.never);
}

const PAGE = join(ROOT, 'docs/SWITCHES.md');

function rowsBySystem(rows = SWITCHES) {
  const by = new Map();
  for (const r of rows) { if (!by.has(r.system)) by.set(r.system, []); by.get(r.system).push(r); }
  /* sorted by name (its `?` aside), whatever the table file's order */
  const key = (r) => r.name.replace(/^\?/, '').toLowerCase() + (r.name.startsWith('?') ? ' ?' : '');
  for (const list of by.values()) list.sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));
  return by;
}

/* ── the page: the table, by system; never where a name is read (that moves
   with every edit of a file: --where) ── */
const cell = (s) => String(s).replace(/\|/g, '\\|');
function makePage(rows = SWITCHES) {
  const L = [];
  L.push('# The switch table');
  L.push('');
  L.push('MADE by `node tools/guards/switches.test.mjs --write` from `tools/guards/lib/switches.mjs`. Never edit it by hand:');
  L.push('`tools/guards/switches.test.mjs` fails a page that is not what the table makes. The rules are');
  L.push('`docs/specs/switch-table.md` (grand plan step 7.1, card T).');
  L.push('');
  L.push('Every switch of the game, one row a name: every live flag the worker reads (set from the Test panel, `liveops.js`)');
  L.push('and every `?name=` the page reads. **Where** each is read is the scanner\'s (`tools/guards/lib/switchScan.mjs`), not');
  L.push('this page\'s: `node tools/guards/switches.test.mjs --where <name>` prints it.');
  L.push('');
  L.push('- **name**: as it is thrown. A live flag by its name (`farm`); a page switch with its `?`; a memory saver by its id');
  L.push('  (`sfxcache`: `off_sfxcache` on the worker and `?sfxcache=0` on the page are one row).');
  L.push('- **kind**: `switch` (a way of the game turned off or on), `value` (a number to try) or `lever` (a test\'s or the owner\'s tool).');
  L.push('- **born**: the change that made it (v2.3.N). **on**: the day its way went on for everyone (a switch\'s; `off`: an opt-in,');
  L.push('  not on for everyone yet; the change that turned it on, where it is not its birth). **thrown**: what throws it (on the');
  L.push('  worker the value; on the page its form).');
  L.push('- **risk**: what the old way guards against: `logic`, `memory`, `chip` (`none` for a lever). **needs**: the switches it');
  L.push('  turns off with. **fallback**: the trigger that still uses its old way, or no.');
  L.push('');
  L.push('**Out of reach** (no row, said here): the QA pages (`src/*-harness.html`, `public/tools/`), the phone scenarios\' own');
  L.push('addresses (`tools/qa/`), `localStorage` toggles, and the worker\'s `env` settings. A cap is a row only where the worker');
  L.push('reads it as a flag or a comment promises it as a kill switch; any other cap\'s override is the emergency lever of');
  L.push('`docs/specs/liveops.md` ("Caps override").');
  L.push('');
  const by = rowsBySystem(rows);
  const names = [...by.keys()].sort();
  /* v2.3.5302 (the gatekeeper's sitting 9): no count and no total on the
     page.  A count changes with every row added anywhere, so any two PRs
     that each add a row conflicted on it, and one merged a sitting.  Rows
     are one a line, sorted by name within their system: a row added to one
     place touches nothing else.  The counts are the guard's to print, and
     the scoreboard's (tools/dev/scoreboard/switch-rows.mjs). */
  L.push('How many there are: `node tools/guards/switches.test.mjs` prints the count, and `node tools/dev/scoreboard.mjs` its row.');
  L.push('');
  for (const sys of names) {
    L.push(`## ${sys}`);
    L.push('');
    L.push('| name | side | kind | born | on | thrown | risk | needs | fallback | off |');
    L.push('|---|---|---|---|---|---|---|---|---|---|');
    for (const r of by.get(sys)) {
      L.push(`| \`${cell(r.name)}\` | ${r.side} | ${r.kind} | ${typeof r.born === 'number' ? 'v2.3.' + r.born : r.born} | ${r.on === undefined ? '' : r.on + (r.onBy ? ' (v2.3.' + r.onBy + ')' : '')} | ${cell(r.thrown)} | ${r.risk} | ${r.needs.length ? r.needs.map((n) => '`' + n + '`').join(', ') : ''} | ${cell(r.fallback)} | ${cell(r.off)} |`);
    }
    L.push('');
  }
  return L.join('\n');
}

/* ── the scanner's shapes, each a fixture (v2.3.5302, the gatekeeper's review,
   sitting 8: "several read shapes hide a switch").  A fixture is code the
   scanner reads as if it were a file: the names it must find, and how many
   reads it must count as unknown.  Each is a break proof that runs on every
   PR: drop the rule for its shape from switchScan.mjs and check 9 names it. ── */
const W = 'server/src/zz_shape.js', P = 'src/zz_shape.js';
export const SHAPES = [
  { id: 'W1 a call', side: 'w', code: "m() { return this._flagOn('wa'); }", names: ['wa'] },
  { id: 'W2 a call in double quotes', side: 'w', code: 'm() { return this._flagOn("wb"); }', names: ['wb'] },
  { id: 'W3 a call at a constant\'s field', side: 'w', code: "const K = { FLAG_OFF: 'wc' };\nconst o = { m() { return this._flagOn(K.FLAG_OFF); } };", names: ['wc'] },
  { id: 'W4 a call at anything else', side: 'w', code: "const o = { m(x) { return this._flagOn(x + 'y'); } };", names: [], unknown: 1 },
  { id: 'W5 (flags || {}).x', side: 'w', code: 'const o = { m() { return (this._liveFlags || {}).we; } };', names: ['we'] },
  { id: 'W6 destructured', side: 'w', code: 'const o = { m() { const { wf, wg: h } = this._liveFlags || {}; return wf && h; } };', names: ['wf', 'wg'] },
  { id: 'W7 f?.x', side: 'w', code: 'const o = { m() { const f = this._liveFlags; return f?.wh; } };', names: ['wh'] },
  { id: 'W8 a local read far below', side: 'w', code: 'const o = { m() {\n  const f = this._liveFlags;\n' + '  let a = 1;\n'.repeat(12) + '  return f.wi;\n} };', names: ['wi'] },
  { id: 'W9 the flags handed on', side: 'w', code: 'const o = { m() { return send(this._liveFlags); } };', names: [], unknown: 1 },
  { id: 'W10 the flags through _liveFlagsEnsure()', side: 'w', code: 'const o = { m() { return this._liveFlagsEnsure().then((f) => f.wj); } };', names: [], unknown: 1 },
  { id: 'W11 a local handed on', side: 'w', code: 'const o = { m() { const f = this._liveFlags; return send(f); } };', names: [], unknown: 1 },
  { id: 'W12 a new door that takes the name', side: 'w', code: "export const m = {\n  _xFlagOff(name) {\n    return !!(this._liveFlags && this._liveFlags[name]);\n  },\n  a() { return this._xFlagOff('wk'); },\n  b(k) { return this._xFlagOff(k + 1); },\n};", names: ['wk'], unknown: 1 },
  { id: 'W13 presence tests read nothing', side: 'w', code: "export const o = {\n m() {\n  if (!this._liveFlags) return;\n  if (this._liveFlags) x();\n  const f = this._liveFlags;\n  if (f && typeof f === 'object' && own(f, 'wl') && !f.wl) return;\n },\n};", names: ['wl'] },
  { id: 'P1 (?:^|&) over search.slice(1)', side: 'p', code: 'const a = /(?:^|&)pa=0(?:&|$)/.test(location.search.slice(1));', names: ['pa'] },
  { id: 'P2 .get("x")', side: 'p', code: 'const a = new URLSearchParams(location.search).get("pb");', names: ['pb'] },
  { id: 'P3 searchParams', side: 'p', code: "const a = new URL(location.href).searchParams.get('pc');\nconst sp = new URL(location.href).searchParams;\nconst b = sp.has('pd');", names: ['pc', 'pd'] },
  { id: 'P4 .includes(\'x=1\')', side: 'p', code: "const a = location.search.includes('pe=1');", names: ['pe'] },
  { id: 'P5 every name of a group', side: 'p', code: 'const a = /[?&](pf|pg)=0/.test(location.search);', names: ['pf', 'pg'] },
  { id: 'P6 clientOff(\'x\')', side: 'p', code: "const a = clientOff('ph');", names: [], off: ['ph'] },
  { id: 'P8 the one reader\'s calls', side: 'p', code: "import { sw, swHas, swValue } from './game/switches.js';\nconst a = sw('pi'); const b = swHas('?pj'); const c = swValue(\"pk\");", names: ['pi', 'pj', 'pk'] },
  { id: 'P7 .get(a variable)', side: 'p', code: 'const q = new URLSearchParams(location.search);\nfor (const k of K) q.get(k);', names: [], unknown: 1 },
];
function shapeCheck(sh) {
  const src = new Map([[sh.side === 'w' ? W : P, sh.code]]);
  const r = sh.side === 'w' ? scanWorker([W], { source: src }) : scanPage([P], { source: src });
  const got = [...r.names.keys()].sort().join(',');
  const want = [...sh.names].sort().join(',');
  const off = sh.side === 'p' ? [...r.offNames.keys()].sort().join(',') : '';
  const bad = [];
  if (got !== want) bad.push(`names ${got || '(none)'}, want ${want || '(none)'}`);
  if (r.unknown.length !== (sh.unknown || 0)) bad.push(`unknown ${r.unknown.length}, want ${sh.unknown || 0}`);
  if (sh.off && off !== sh.off.join(',')) bad.push(`clientOff ${off || '(none)'}, want ${sh.off.join(',')}`);
  return bad.length ? `${sh.id}: ${bad.join('; ')}` : null;
}

/* ── a row's place (v2.3.5304, the gatekeeper's sitting 11) ──
   The table's rows run by side (both, worker, page) and, in each, by name
   (its `?` aside, lower case).  Returns one line a row out of its place,
   naming the row it should follow. */
const SIDE_ORDER = ['both', 'worker', 'page'];
export const placeKey = (r) => r.name.replace(/^\?/, '').toLowerCase();
export function placeFaults(rows) {
  const bad = [];
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1], b = rows[i];
    const sa = SIDE_ORDER.indexOf(a.side), sb = SIDE_ORDER.indexOf(b.side);
    if (sb < sa || (sb === sa && placeKey(b) < placeKey(a))) {
      const after = rows.filter((r) => SIDE_ORDER.indexOf(r.side) === sb && placeKey(r) < placeKey(b)).pop();
      bad.push(`${b.name} (${b.side}) is after ${a.name}: it belongs ${after ? 'after ' + after.name : 'first in its side'}`);
    }
  }
  return bad;
}

/* ── command lines ── */
const argv = process.argv.slice(2);
await main();

async function main() {
  if (argv.includes('--write')) {
    writeFileSync(PAGE, makePage());
    const r = readerWith(readFileSync(READER, 'utf8'));
    if (r === null) { console.error('src/game/switches.js has no markers'); process.exit(2); }
    writeFileSync(READER, r);
    console.log('wrote docs/SWITCHES.md and src/game/switches.js\'s forms');
    process.exit(0);
  }
  const li = argv.indexOf('--list');
  if (li >= 0) {
    const want = argv[li + 1];
    if (want === 'unlisted') {
      const { found } = await census();
      const rows = new Set(SWITCHES.map((r) => r.name));
      for (const [n, v] of found) if (!rows.has(n)) console.log(`${n}  (${v.side}) ${v.reads.map((x) => x.file + ':' + x.line).slice(0, 3).join(', ')}`);
      process.exit(0);
    }
    const rows = SWITCHES.filter((r) => r.system === want);
    if (!rows.length && !Object.hasOwn(SYSTEMS, want)) { console.error(`no system "${want}": ${Object.keys(SYSTEMS).join(', ')}, unlisted`); process.exit(2); }
    for (const r of rows) console.log(`${r.name.padEnd(22)} ${r.side.padEnd(6)} ${r.kind.padEnd(6)} ${String(r.born).padEnd(7)} ${r.risk.padEnd(6)} ${r.thrown}  -- ${r.off}`);
    process.exit(0);
  }
  const di = argv.indexOf('--due');
  if (di >= 0) {
    const asOf = argv[di + 1] && DAY.test(argv[di + 1]) ? argv[di + 1] : null;
    due(asOf);
    process.exit(0);
  }
  const wi = argv.indexOf('--where');
  if (wi >= 0) {
    const want = argv[wi + 1];
    const { found } = await census();
    const v = found.get(want);
    if (!v) { console.error(`the scanner finds no "${want}" (a page switch is written with its ?: ?guest)`); process.exit(2); }
    for (const x of v.reads) console.log(`${x.file}:${x.line}  ${x.shape}`);
    process.exit(0);
  }
  await checks();
}

async function checks() {
  let failed = 0;
  const check = (name, ok, detail) => {
    if (!ok) failed++;
    console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 900)));
  };
  const { worker, page, found } = await census();
  const rowNames = new Set(SWITCHES.map((r) => r.name));

  /* 1. every name found is a row, or unlisted (only falls) */
  {
    const unlisted = [...found.keys()].filter((n) => !rowNames.has(n));
    const wk = unlisted.filter((n) => found.get(n).side !== 'page');
    check(`1: every name found is a row or unlisted: ${unlisted.length} unlisted, the line ${UNLISTED_LINE} (a new switch adds its row: tools/guards/lib/switches.mjs)`,
      unlisted.length <= UNLISTED_LINE, unlisted.slice(-12));
    if (unlisted.length < UNLISTED_LINE) console.log(`     (room: ${unlisted.length} under the line ${UNLISTED_LINE}; the gatekeeper may lower it)`);
    check(`1: every worker name is a row (${wk.length} not)`, wk.length === 0, wk);
  }

  /* 2. reads in no known shape (only falls), and no stale excuse */
  {
    const unknown = [...worker.unknown, ...page.unknown];
    check(`2: reads in a shape the scanner does not know: ${unknown.length}, the line ${UNKNOWN_LINE}`, unknown.length <= UNKNOWN_LINE,
      unknown.map((u) => `${u.file}:${u.line} ${u.text}`));
    const stale = [...worker.staleDynamic.map((d) => `DYNAMIC ${d.file} ${d.fn}`), ...page.staleNotAddress.map((x) => `NOT_ADDRESS ${x.name} ${x.file}`),
      ...worker.staleNotAFlag.map((x) => `NOT_A_FLAG ${x.name}`), ...(page.staleOwnEntries ? ['keepSwitches.js\'s own entries'] : []), ...(page.staleReader ? ['the one reader, src/game/switches.js'] : [])];
    check(`2: every excuse the scanner keeps is still used (${DYNAMIC.length} functions, ${NOT_ADDRESS.length} not the address, ${NOT_A_FLAG.length} not a flag, keepSwitches.js's own entries)`, stale.length === 0, stale);
  }

  /* 3. every row is still found, on its side */
  {
    const lost = SWITCHES.filter((r) => !found.has(r.name)).map((r) => r.name);
    const wrongSide = SWITCHES.filter((r) => found.has(r.name) && found.get(r.name).side !== r.side).map((r) => `${r.name}: the table says ${r.side}, the scanner ${found.get(r.name).side}`);
    check(`3: every row's name is found by the scanner (${SWITCHES.length} rows)`, lost.length === 0, lost);
    check('3: ...on the side the row says', wrongSide.length === 0, wrongSide);
  }

  /* 4. every column, each of its kind */
  {
    const bad = [];
    const str = (v) => typeof v === 'string' && v.trim().length > 0;
    for (const r of SWITCHES) {
      const why = [];
      for (const c of COLUMNS) if (!Object.hasOwn(r, c)) why.push('no ' + c);
      for (const c of Object.keys(r)) if (!COLUMNS.includes(c) && !OPTIONAL.includes(c)) why.push('an unknown column ' + c);
      if (!str(r.name)) why.push('name');
      if (!SIDES.includes(r.side)) why.push('side');
      if (!str(r.system)) why.push('system');
      if (!KINDS.includes(r.kind)) why.push('kind');
      if (!(Number.isInteger(r.born) && r.born > 0) && r.born !== 'unknown') why.push('born');
      if (!str(r.thrown)) why.push('thrown');
      if (!RISKS.includes(r.risk)) why.push('risk');
      if ((r.kind === 'lever') !== (r.risk === 'none')) why.push('risk none is a lever\'s alone');
      if (!Array.isArray(r.needs) || !r.needs.every(str)) why.push('needs');
      if (!(r.fallback === 'no' || (str(r.fallback) && / in \S+$/.test(r.fallback)))) why.push('fallback (no, or "<trigger> in <file>")');
      if (!str(r.off)) why.push('off');
      /* v2.3.5305: the end date.  A switch row says when its way went on
         for everyone (a day, 'off', or 'unknown' with its born); no other
         row has a way to date */
      if (r.kind === 'switch') {
        if (!(DAY.test(r.on) || r.on === 'off' || (r.on === 'unknown' && r.born === 'unknown'))) why.push('on (a day YYYY-MM-DD, \'off\', or \'unknown\' where born is)');
      } else if (r.on !== undefined) why.push('on is a switch row\'s alone');
      /* v2.3.5307: a check the thrown run's preload once broke by itself (a
         cold start, a global set before a module loads) is never a switch's
         own fail: the preload no longer touches them (switches-thrown's
         canaries), so such a line only ever recorded the old artifact */
      if (Array.isArray(r.thrownFails) && r.thrownFails.some((w) => /^(?:cold-flags|tick-pace)\.test\.mjs\b/.test(String(w)))) why.push('thrownFails names a canary suite (cold-flags, tick-pace): the v2.3.5304 preload\'s artifact, never the switch\'s own');
      if (r.onBy !== undefined && !(Number.isInteger(r.onBy) && DAY.test(r.on) && Number.isInteger(r.born) && r.onBy > r.born)) why.push('onBy (the later tag that turned it on, with its day in on)');
      if (why.length) bad.push(`${r.name || '?'}: ${why.join(', ')}`);
    }
    check(`4: every row has every column (${COLUMNS.join(', ')})`, bad.length === 0, bad);
  }

  /* 5. one row a name */
  {
    const seen = new Set(), twice = [];
    for (const r of SWITCHES) { if (seen.has(r.name)) twice.push(r.name); seen.add(r.name); }
    check('5: no name is in two rows', twice.length === 0, twice);
  }

  /* 6. B's systems */
  {
    const bad = SWITCHES.filter((r) => !Object.hasOwn(SYSTEMS, r.system)).map((r) => `${r.name}: ${r.system}`);
    check('6: every system is in card B\'s map (tools/guards/lib/systems.mjs)', bad.length === 0, bad);
  }

  /* 7. born unknown only falls */
  {
    const n = SWITCHES.filter((r) => r.born === 'unknown').length;
    check(`7: rows born 'unknown': ${n}, the line ${BORN_UNKNOWN_LINE}`, n <= BORN_UNKNOWN_LINE);
  }

  /* 8. the page */
  {
    const want = makePage();
    const have = existsSync(PAGE) ? readFileSync(PAGE, 'utf8') : '';
    check('8: docs/SWITCHES.md is what the table makes (node tools/guards/switches.test.mjs --write)', have === want, have ? 'stale' : 'missing');
  }

  /* 9. every shape the scanner knows, on its fixture */
  {
    const bad = SHAPES.map(shapeCheck).filter(Boolean);
    check(`9: the scanner reads each of its ${SHAPES.length} shapes (the fixtures above)`, bad.length === 0, bad);
  }

  /* 10. every row in its place: by side (both, worker, page), then by name */
  {
    const bad = placeFaults(SWITCHES);
    check('10: every row is in its place in the table (by side, then by name: a new row goes where its name puts it)', bad.length === 0, bad);
  }

  /* 11. rule 4: what a switch needs (v2.3.5304) */
  {
    const by = new Map(SWITCHES.map((r) => [r.name, r]));
    const unknownNeed = SWITCHES.flatMap((r) => r.needs.filter((n) => !by.has(n)).map((n) => `${r.name} needs ${n}, which is no row`));
    check('11: every need is a row', unknownNeed.length === 0, unknownNeed);
    const cycles = [];
    for (const r of SWITCHES) {
      const stack = [[r.name, [r.name]]];
      const seen = new Set();
      while (stack.length) {
        const [n, path] = stack.pop();
        for (const m of (by.get(n) || { needs: [] }).needs) {
          if (m === r.name) { cycles.push(path.concat(m).join(' -> ')); continue; }
          if (!seen.has(m)) { seen.add(m); stack.push([m, path.concat(m)]); }
        }
      }
    }
    check('11: no switch needs itself, however far round', cycles.length === 0, [...new Set(cycles)].slice(0, 6));
    const badReader = [];
    for (const r of SWITCHES) {
      if (r.side !== 'worker' || !r.needs.length) { if (r.reader !== undefined && r.side !== 'worker') badReader.push(`${r.name}: a reader is a worker row's`); continue; }
      const m = /^([A-Za-z_$][\w$]*) in (server\/src\/\S+)$/.exec(r.reader || '');
      if (!m) { badReader.push(`${r.name}: needs ${r.needs.join(', ')} but names no reader ("fn in server/src/file.js")`); continue; }
      const got = readsOf(m[2], m[1]);
      const miss = r.needs.filter((n) => !got.has(n));
      if (miss.length) badReader.push(`${r.name}: its reader ${r.reader} does not read ${miss.join(', ')}`);
    }
    check('11: every worker row with needs names its reader, and the reader reads each need', badReader.length === 0, badReader);
    const never = SWITCHES.filter((r) => r.never !== undefined);
    const badNever = never.filter((r) => typeof r.never !== 'string' || !r.never.trim() || r.needs.some((n) => by.has(n)))
      .map((r) => `${r.name} may never go off (${r.never}) but needs ${r.needs.filter((n) => by.has(n)).join(', ')}: the switch beneath is removed first`);
    check(`11: a row that may never go off needs no switch still in the table (${never.length} such rows)`, badNever.length === 0, badNever);
  }

  /* 12. the fallback hold (v2.3.5305): a fallback leaves only with its
     trigger.  While a trigger is still in its file, its row stays, says
     the same, and its read is still found; the list only shrinks */
  {
    const { held, stale, added } = fallbackHold(found);
    check(`12: a fallback's read stays while its trigger lives (${Object.keys(FALLBACKS).length} fallbacks, the line ${FALLBACK_LINE})`, held.length === 0, held);
    check('12: every fallback in the list still has its trigger (one whose trigger is gone leaves the list, with its row\'s fallback, in that PR)', stale.length === 0, stale);
    check(`12: the list of fallbacks only shrinks (a new fallback is the gatekeeper's to add: FALLBACKS in tools/guards/lib/switches.mjs)`, added.length === 0 && Object.keys(FALLBACKS).length <= FALLBACK_LINE, added);
  }

  /* 13. the page's one reader holds the table's forms and needs (v2.3.5306) */
  {
    const have = existsSync(READER) ? readFileSync(READER, 'utf8') : '';
    const want = have ? readerWith(have) : null;
    check('13: src/game/switches.js holds the table\'s forms and needs (node tools/guards/switches.test.mjs --write)', !!have && want === have, !have ? 'missing' : want === null ? 'no markers' : 'stale');
  }

  const sw = SWITCHES.filter((r) => r.kind === 'switch').length;
  console.log(`\n${SWITCHES.length} rows (${sw} switches); ${found.size} names found.`);
  console.log(failed ? `${failed} FAILED` : 'all green');
  process.exit(failed ? 1 : 0);
}
