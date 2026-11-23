/* ═══ v2.3.5340: THE FRAME AS NAMED STEPS, HELD (grand plan step 5.4, card M PR 1) ═══
 *
 * src/game/frameSteps.js names the steps of the game's loop (`gameLoop` in
 * BroTown.jsx, found by system: ./lib/filesOf.mjs, step 5.2b): `legacy`
 * (the body before the six calls at its end), then `visual`, `arrows`,
 * `slime`, `cleanup`, `render`, `afterFrame`.  This guard holds:
 *
 *   1. frameSteps.js imports nothing (node tests it; any file may ask it);
 *   2. the runner: the names in order, the sums by a fake clock, the window
 *      kept at 600 frames, a step's throw counted and its FIRST reported once
 *      (later ones counted only), a report that throws never reaching the
 *      game, and no closure, array or object made by a mark (a frame makes no
 *      garbage);
 *   3. the loop: legacy's marks open the try and close before the first call;
 *      each call between its own step's marks, in the list's order; the catch
 *      asks `fault`; `?framesteps=0` makes no steps (sw('framesteps')).
 *      v2.3.5341 (card M PR 2): the ten steps inside legacy (`to(a, b)`):
 *      every mark walked in line order, each `to` leaving the step that is
 *      open, each step entered once in the list's order (3b: a mark taken
 *      out is caught);
 *   4. the crash ring: 'frame-step' is quiet (crashTrap.js `_QUIET`): it
 *      rides with the next real upload, never sends alone;
 *   5. THE CENSUS (the plan's rule 3): the code lines inside `legacy`, between
 *      its two marks, by four-lines' rule (a line esbuild's map points at;
 *      comments and blank lines are not code), the lines of the steps inside
 *      it aside.  It only falls: a step named inside legacy (card M PR 2:
 *      1555 -> 1531) takes its lines with it.
 *      Only the gatekeeper lowers LEGACY_LINE.
 *      BREAK PROOF (rule 8): one code line added inside legacy (`var _x = 1;`
 *      just under `_steps.begin(0)`) turns check 5 red; the guard makes that
 *      change in memory and asks it (check 5b).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { findIn } from './lib/filesOf.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const read = (f) => readFileSync(join(ROOT, f), 'utf8');
let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail)));
};

/* ═══ THE LINE ═══  legacy's code lines on the day (v2.3.5340).  Only falls;
   only the gatekeeper lowers it, in a PR of its own. */
const LEGACY_LINE = 1531;   /* 1555 on the day; v2.3.6260: 1531 after card M's #2127 (ten single calls named as steps; the gatekeeper's sitting 46) */

const STEPS_FILE = 'src/game/frameSteps.js';
/* the loop's file, found by system (step 5.2b: a suite never names a big file
   by its path; the day the loop moves, this still finds it) */
const loopAt = findIn('ui', /var _gameLoop = function gameLoop\(/);
const LOOP_FILE = loopAt.length === 1 ? loopAt[0].file : null;
const stepsSrc = read(STEPS_FILE);
const FS = await import(pathToFileURL(join(ROOT, STEPS_FILE)).href);
/* v2.3.5341: + the ten steps inside legacy, in their places (card M PR 2) */
/* v2.3.6541: + 'input' (game/stickZones.js stickFrame, card CT PR 2); the runner's checks below read
   their steps' places from this list (MON, REN, IN), so a step added does not move them */
const WANT = ['legacy', 'tap', 'input', 'sound', 'ride', 'zone', 'farm', 'townsfolk', 'monsters', 'weaponFeel', 'loot', 'peers',
  'visual', 'arrows', 'slime', 'cleanup', 'render', 'afterFrame'];
const N = WANT.length;
const MON = WANT.indexOf('monsters'), REN = WANT.indexOf('render'), IN = FS.STEPS.filter((s) => s.inLegacy).length;

/* ── 1. no imports ── */
check('1: frameSteps.js imports nothing', !/^\s*(import\b|export\s[^;]*\bfrom\b)/m.test(stepsSrc));

/* ── 2. the runner ── */
{
  check(`2: the steps, in order: legacy, the ${IN} inside it, then the six calls`, JSON.stringify(FS.STEP_NAMES) === JSON.stringify(WANT), FS.STEP_NAMES);
  check(`2: each step after legacy names its calls; the ${IN} inside legacy say so, the six after it do not`,
    FS.STEPS[0].calls.length === 0 && FS.STEPS.slice(1).every((s, i) => s.calls.length > 0 && s.calls.every((c) => /^\w+$/.test(c)) && !!s.inLegacy === (i < IN)));
  const allCalls = FS.STEPS.flatMap((s) => s.calls);
  check('2: no call in two steps', new Set(allCalls).size === allCalls.length, allCalls);
  check('2: the window is 600 frames', FS.WINDOW === 600);

  let t = 0;
  const reports = [];
  let st = FS.makeFrameSteps({ now: () => t, report: (n, m) => reports.push(n + ': ' + m), window: 3 });
  /* a frame as the loop marks it: legacy, out to each step inside it and back
     (one clock read a mark), then the six; ms[i] is step i's time, legacy's
     split in two around the steps inside it */
  const frame = (ms) => {
    st.begin(0); t += ms[0] / 2;
    for (let i = 1; i <= IN; i++) { st.to(0, i); t += ms[i]; st.to(i, 0); }
    t += ms[0] / 2; st.end(0);
    for (let i = IN + 1; i < N; i++) { st.begin(i); t += ms[i]; st.end(i); }
  };
  const A = WANT.map((n, i) => (i === 0 ? 4 : i === MON ? 3 : i === REN ? 8 : 1));
  frame(A);
  frame(A);
  let r = st.read();
  check('2: before a whole window, no last sums and the window being summed', r.on === true && r.ms === null && r.now.frames === 2 && r.now.ms[0] === 8 && r.now.ms[MON] === 6 && r.now.ms[REN] === 16, r);
  frame(A);
  frame(WANT.map(() => 2));
  r = st.read();
  check('2: a whole window kept as the last sums when the next begins', r.frames === 3 && JSON.stringify(r.ms) === JSON.stringify(A.map((v) => 3 * v)) && r.now.frames === 1 && r.now.ms.every((v) => v === 2), r);
  check('2: each step\'s runs counted; legacy opened again is not a new run (its runs are the frames)', r.runs.every((n) => n === 4), r.runs);
  /* `to` reads the clock once */
  let reads = 0;
  const one = FS.makeFrameSteps({ now: () => { reads++; return 0; } });
  one.begin(0); reads = 0; one.to(0, MON);
  check('2: to(a, b) ends a and begins b on one clock read', reads === 1 && one.read().open === 'monsters');

  /* a throw in `render`: counted, its time so far summed, reported once (a
     fresh runner, its window wider than these frames) */
  reports.length = 0;
  t = 0;
  st = FS.makeFrameSteps({ now: () => t, report: (n, m) => reports.push(n + ': ' + m) });
  st.begin(0); t += 2; st.end(0); st.begin(REN); t += 3;
  const name = st.fault(new Error('boom'));
  st.begin(0); t += 2; st.end(0); st.begin(REN); t += 3;
  st.fault(new Error('again'));
  st.begin(0); t += 2; st.to(0, MON); t += 1;
  const name2 = st.fault('a string thrown');
  r = st.read();
  check('2: fault names the step that was open (one of the six; one inside legacy)', name === 'render' && name2 === 'monsters', [name, name2]);
  check('2: each throw counted', r.throws[REN] === 2 && r.throws[MON] === 1 && r.throws[0] === 0, r.throws);
  check('2: a step\'s FIRST throw reported, once; later ones counted only', JSON.stringify(reports) === JSON.stringify(['render: boom', 'monsters: a string thrown']), reports);
  check('2: the open step\'s time up to its throw is summed', r.now.ms[REN] === 6 && r.now.ms[0] === 6 && r.now.ms[MON] === 1, r.now.ms);
  check('2: no step open after a fault', r.open === null && st.fault(new Error('x')) === null);

  const loud = FS.makeFrameSteps({ now: () => 0, report: () => { throw new Error('ring full'); } });
  let threw = false;
  try { loud.begin(2); loud.fault(new Error('x')); } catch { threw = true; }
  check('2: a report that throws never reaches the game', !threw);

  /* the marks make nothing: no closure, array or object literal, no `new` */
  const making = /\bnew\b|=>|\bfunction\b|\[\s*\]|\{\s*\}|\.(map|slice|concat|filter)\(/;
  const marks = /function begin\(i\) \{([\s\S]*?)\n  \}\n  function end\(i\) \{([\s\S]*?)\n  \}[\s\S]*?function to\(a, b\) \{([\s\S]*?)\n  \}/.exec(stepsSrc);
  check('2: begin, end and to make nothing a frame (the sums are typed arrays made once)',
    !!marks && !making.test(marks[1]) && !making.test(marks[2]) && !making.test(marks[3]) && /new Float64Array\(n\)/.test(stepsSrc), marks ? [marks[1], marks[2], marks[3]] : 'not found');
}

/* ── 3. the loop ── */
check('3: one gameLoop, in the ui system\'s files', LOOP_FILE !== null, loopAt);
const loopSrc = LOOP_FILE ? read(LOOP_FILE) : '';
const lines = loopSrc.split('\n');
const lineOf = (re) => { const at = []; lines.forEach((l, i) => { if (re.test(l)) at.push(i); }); return at; };
const b0 = lineOf(/_steps\.begin\(0\)/);
const e0 = lineOf(/_steps\.end\(0\)/);
/* v2.3.5341: every mark in the file, in line order, walked: `begin(0)` opens a
   frame's legacy; `to(a, b)` needs `a` open (each step inside legacy entered
   once, in the list's order, legacy opened again after it); `end(0)` closes
   legacy; then each of the six at the end `begin(k)` ... `end(k)`.  Returns
   the problems and each step's span (the lines from its opening mark to its
   closing one). */
function walk(ls) {
  const marks = [];
  ls.forEach((l, i) => {
    for (const m of l.matchAll(/_steps\.(begin|end|to)\((\d+)(?:,\s*(\d+))?\)/g)) marks.push({ line: i, op: m[1], a: +m[2], b: m[3] === undefined ? null : +m[3] });
  });
  const bad = [];
  const span = new Map();
  let open = -1, next = 1, frames = 0;
  for (const k of marks) {
    const where = 'line ' + (k.line + 1) + ' ' + k.op + '(' + k.a + (k.b === null ? '' : ', ' + k.b) + ')';
    if (k.op === 'begin') {
      if (k.a === 0) { frames++; if (open !== -1 || frames > 1) bad.push(where + ': a second frame begins'); open = 0; span.set(0, [k.line, null]); continue; }
      if (open !== -1 || k.a !== next || FS.STEPS[k.a].inLegacy) bad.push(where + ': not the next of the six (' + next + '), or a step still open (' + open + ')');
      open = k.a; next = k.a + 1; span.set(k.a, [k.line, null]);
    } else if (k.op === 'end') {
      if (open !== k.a) bad.push(where + ': step ' + k.a + ' is not the one open (' + open + ')');
      if (span.has(k.a)) span.get(k.a)[1] = k.line;
      open = -1;
    } else {
      if (open !== k.a) bad.push(where + ': step ' + k.a + ' is not the one open (' + open + ')');
      if (k.b !== 0) {
        if (k.b !== next || !FS.STEPS[k.b] || !FS.STEPS[k.b].inLegacy) bad.push(where + ': step ' + k.b + ' is not the next step inside legacy (' + next + ')');
        next = k.b + 1; span.set(k.b, [k.line, null]);
      } else if (k.a === 0) bad.push(where + ': legacy to legacy');
      if (k.a !== 0 && span.has(k.a)) span.get(k.a)[1] = k.line;
      open = k.b;
    }
  }
  if (open !== -1) bad.push('a step is still open after the last mark (' + open + ')');
  if (next !== FS.STEPS.length) bad.push('the steps from ' + next + ' on are never marked');
  return { bad, span, marks };
}
const W = walk(lines);
{
  check('3: one begin(0) and one end(0)', b0.length === 1 && e0.length === 1, { b0, e0 });
  check('3: begin(0) is the first line of the loop\'s try', b0.length === 1 && /^\s*try \{\s*$/.test(lines[b0[0] - 1]), lines[b0[0] - 1]);
  check(`3: the marks (${W.marks.length}) open and close the ${FS.STEPS.length} steps in the list's order, each once, legacy around the ones inside it`, W.bad.length === 0, W.bad);
  for (let i = 1; i < FS.STEPS.length; i++) {
    const st = FS.STEPS[i];
    const sp = W.span.get(i) || [-1, -1];
    const off = [];
    for (const call of st.calls) {
      const at = lineOf(new RegExp('(^|[^\\w.])' + call + '\\(S\\b'));
      if (at.length !== 1 || at[0] < sp[0] || at[0] > sp[1]) off.push(call + ' ' + JSON.stringify({ at: at.map((n) => n + 1), span: sp.map((n) => n + 1) }));
    }
    check(`3: step ${i} (${st.name}): ${st.calls.join(', ')} called once, between its marks`, off.length === 0, off);
  }
  const last = W.marks.length ? W.marks[W.marks.length - 1].line : -1;
  const catchAt = lines.findIndex((l, i) => i > last && /\} catch \(gameLoopErr\) \{/.test(l));
  check('3: the loop\'s catch asks which step threw (fault)', catchAt > 0 && lines.slice(catchAt, catchAt + 4).some((l) => /_steps\.fault\(gameLoopErr\)/.test(l)));
  check('3: `?framesteps=0` makes no steps (no marks, no ring entry)', /var _steps = sw\('framesteps'\) \? null : makeFrameSteps\(/.test(loopSrc));
  check('3: the first throw goes to the ring as \'frame-step\'', /recordCrash\('frame-step', name \+ ': ' \+ msg\)/.test(loopSrc));
  /* 3b. the walk's break proof: the tap step's opening mark taken out (its
     call left in legacy) turns the walk red */
  const broke = lines.map((l) => l.replace('if (_steps) _steps.to(0, 1); settleTapPress', 'settleTapPress'));
  check('3b: the break proof: a step\'s opening mark taken out is caught', broke.join('\n') !== loopSrc && walk(broke).bad.length > 0, walk(broke).bad.slice(0, 2));
  check('3: the probe window.__btSteps', /window\.__btSteps = function \(\) \{ return _steps \? _steps\.read\(\) : \{ on: false \}; \};/.test(loopSrc));
}

/* ── 4. the crash ring ── */
{
  const q = /const _QUIET = new Set\(\[([^\]]*)\]\)/.exec(read('src/debug/crashTrap.js'));
  check('4: \'frame-step\' is quiet in the crash ring (rides along, never sends alone)', !!q && /'frame-step'/.test(q[1]), q && q[1]);
}

/* ── 5. the census: legacy's code lines ── */
let _esbuild = null;
function esbuild() {
  if (_esbuild) return _esbuild;
  for (const pkg of ['server/package.json', 'package.json']) {
    try { _esbuild = createRequire(join(ROOT, pkg))('esbuild'); return _esbuild; } catch { /* the next */ }
  }
  throw new Error('esbuild not found: run `npm install` in server/ (wrangler brings it)');
}
/* the source lines (0-based) esbuild's map points at: four-lines' code lines */
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function codeLines(src) {
  const out = esbuild().transformSync(src, { jsx: 'transform', legalComments: 'none', format: 'esm', target: 'esnext', loader: 'jsx', sourcemap: 'external', sourcefile: 'x.jsx' });
  const map = JSON.parse(out.map);
  const set = new Set();
  let srcLine = 0;
  for (const line of map.mappings.split(';')) {
    for (const seg of line.split(',')) {
      if (!seg) continue;
      const v = [];
      let n = 0, shift = 0;
      for (const ch of seg) {
        const d = B64.indexOf(ch);
        n += (d & 31) << shift;
        if (d & 32) { shift += 5; continue; }
        v.push(n & 1 ? -(n >> 1) : n >> 1);
        n = 0; shift = 0;
      }
      if (v.length >= 4) { srcLine += v[2]; set.add(srcLine); }
    }
  }
  return set;
}
function legacyLines(src) {
  const ls = src.split('\n');
  const from = ls.findIndex((l) => /_steps\.begin\(0\)/.test(l));
  const to = ls.findIndex((l) => /_steps\.end\(0\)/.test(l));
  if (from < 0 || to <= from) return -1;
  /* v2.3.5341: the lines of the steps inside legacy are theirs, not legacy's */
  const { span } = walk(ls);
  const inStep = (l) => FS.STEPS.some((st, i) => st.inLegacy && span.has(i) && l >= span.get(i)[0] && l <= span.get(i)[1]);
  let n = 0;
  for (const l of codeLines(src)) if (l > from && l < to && !inStep(l)) n++;
  return n;
}
{
  const n = legacyLines(loopSrc);
  check(`5: legacy's code lines at or under its line (${n} of ${LEGACY_LINE}; only falls)`, n >= 0 && n <= LEGACY_LINE, n);
  if (n >= 0 && n < LEGACY_LINE) console.log(`     room the gatekeeper may take back: legacy ${n} (its line ${LEGACY_LINE})`);
  /* 5b. the break proof: one line added inside legacy */
  const broken = lines.slice();
  broken.splice(b0[0] + 1, 0, '        var _x = 1;');
  const nb = legacyLines(broken.join('\n'));
  check('5b: the break proof: one code line added inside legacy is counted (turns 5 red at the line)', nb === n + 1, { n, nb });
}

console.log(failed ? `\n${failed} failed` : '\nall green');
process.exit(failed ? 1 : 0);
