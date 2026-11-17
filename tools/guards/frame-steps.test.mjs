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
 *      asks `fault`; `?framesteps=0` makes no steps (sw('framesteps'));
 *   4. the crash ring: 'frame-step' is quiet (crashTrap.js `_QUIET`): it
 *      rides with the next real upload, never sends alone;
 *   5. THE CENSUS (the plan's rule 3): the code lines inside `legacy`, between
 *      its two marks, by four-lines' rule (a line esbuild's map points at;
 *      comments and blank lines are not code).  It only falls: a step that
 *      leaves legacy (the monsters', card M PR 2) takes its lines with it.
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
const LEGACY_LINE = 1555;

const STEPS_FILE = 'src/game/frameSteps.js';
/* the loop's file, found by system (step 5.2b: a suite never names a big file
   by its path; the day the loop moves, this still finds it) */
const loopAt = findIn('ui', /var _gameLoop = function gameLoop\(/);
const LOOP_FILE = loopAt.length === 1 ? loopAt[0].file : null;
const stepsSrc = read(STEPS_FILE);
const FS = await import(pathToFileURL(join(ROOT, STEPS_FILE)).href);
const WANT = ['legacy', 'visual', 'arrows', 'slime', 'cleanup', 'render', 'afterFrame'];

/* ── 1. no imports ── */
check('1: frameSteps.js imports nothing', !/^\s*(import\b|export\s[^;]*\bfrom\b)/m.test(stepsSrc));

/* ── 2. the runner ── */
{
  check('2: the steps, in order: legacy then the six calls', JSON.stringify(FS.STEP_NAMES) === JSON.stringify(WANT), FS.STEP_NAMES);
  check('2: each step after legacy names its call',
    FS.STEPS[0].call === null && FS.STEPS.slice(1).every((s) => typeof s.call === 'string' && /^\w+$/.test(s.call)));
  check('2: the window is 600 frames', FS.WINDOW === 600);

  let t = 0;
  const reports = [];
  let st = FS.makeFrameSteps({ now: () => t, report: (n, m) => reports.push(n + ': ' + m), window: 3 });
  const frame = (ms) => { for (let i = 0; i < 7; i++) { st.begin(i); t += ms[i]; st.end(i); } };
  frame([5, 1, 0, 0, 0, 8, 1]);
  frame([5, 1, 0, 0, 0, 8, 1]);
  let r = st.read();
  check('2: before a whole window, no last sums and the window being summed', r.on === true && r.ms === null && r.now.frames === 2 && r.now.ms[0] === 10 && r.now.ms[5] === 16, r);
  frame([5, 1, 0, 0, 0, 8, 1]);
  frame([1, 1, 1, 1, 1, 1, 1]);
  r = st.read();
  check('2: a whole window kept as the last sums when the next begins', r.frames === 3 && JSON.stringify(r.ms) === JSON.stringify([15, 3, 0, 0, 0, 24, 3]) && r.now.frames === 1 && r.now.ms[0] === 1, r);
  check('2: each step\'s runs counted', r.runs.every((n) => n === 4), r.runs);

  /* a throw in `render`: counted, its time so far summed, reported once (a
     fresh runner, its window wider than these frames) */
  reports.length = 0;
  t = 0;
  st = FS.makeFrameSteps({ now: () => t, report: (n, m) => reports.push(n + ': ' + m) });
  st.begin(0); t += 2; st.end(0); st.begin(5); t += 3;
  const name = st.fault(new Error('boom'));
  st.begin(0); t += 2; st.end(0); st.begin(5); t += 3;
  st.fault(new Error('again'));
  st.begin(0); t += 2; st.end(0); st.begin(1);
  st.fault('a string thrown');
  r = st.read();
  check('2: fault names the step that was open', name === 'render');
  check('2: each throw counted', r.throws[5] === 2 && r.throws[1] === 1 && r.throws[0] === 0, r.throws);
  check('2: a step\'s FIRST throw reported, once; later ones counted only', JSON.stringify(reports) === JSON.stringify(['render: boom', 'visual: a string thrown']), reports);
  check('2: the open step\'s time up to its throw is summed', r.now.ms[5] === 6 && r.now.ms[0] === 6, r.now.ms);
  check('2: no step open after a fault', r.open === null && st.fault(new Error('x')) === null);

  const loud = FS.makeFrameSteps({ now: () => 0, report: () => { throw new Error('ring full'); } });
  let threw = false;
  try { loud.begin(2); loud.fault(new Error('x')); } catch { threw = true; }
  check('2: a report that throws never reaches the game', !threw);

  /* the marks make nothing: no closure, array or object literal, no `new` */
  const making = /\bnew\b|=>|\bfunction\b|\[\s*\]|\{\s*\}|\.(map|slice|concat|filter)\(/;
  const marks = /function begin\(i\) \{([\s\S]*?)\n  \}\n  function end\(i\) \{([\s\S]*?)\n  \}/.exec(stepsSrc);
  check('2: begin and end make nothing a frame (the sums are typed arrays made once)',
    !!marks && !making.test(marks[1]) && !making.test(marks[2]) && /new Float64Array\(n\)/.test(stepsSrc), marks ? [marks[1], marks[2]] : 'not found');
}

/* ── 3. the loop ── */
check('3: one gameLoop, in the ui system\'s files', LOOP_FILE !== null, loopAt);
const loopSrc = LOOP_FILE ? read(LOOP_FILE) : '';
const lines = loopSrc.split('\n');
const lineOf = (re) => { const at = []; lines.forEach((l, i) => { if (re.test(l)) at.push(i); }); return at; };
const b0 = lineOf(/_steps\.begin\(0\)/);
const e0 = lineOf(/_steps\.end\(0\)/);
{
  check('3: one begin(0) and one end(0)', b0.length === 1 && e0.length === 1, { b0, e0 });
  check('3: begin(0) is the first line of the loop\'s try', b0.length === 1 && /^\s*try \{\s*$/.test(lines[b0[0] - 1]), lines[b0[0] - 1]);
  let prev = e0[0] === undefined ? -1 : e0[0] - 1;
  const order = [];
  for (let i = 1; i < FS.STEPS.length; i++) {
    const call = FS.STEPS[i].call;
    const re = new RegExp('_steps\\.begin\\(' + i + '\\);?\\s*\\}?\\s*' + call + '\\(S\\b.*\\);\\s*if \\(_steps\\) _steps\\.end\\(' + i + '\\);');
    const at = lineOf(re);
    const calls = lineOf(new RegExp('(^|[^\\w.])' + call + '\\(S\\b'));
    const ok = at.length === 1 && calls.length === 1 && at[0] > prev;
    order.push(call + (ok ? '' : ' (not between its marks, or out of order, or called twice: ' + JSON.stringify({ at, calls }) + ')'));
    check(`3: ${call} between step ${i}'s marks (${FS.STEPS[i].name}), after the step before`, ok, order[order.length - 1]);
    if (at.length) prev = at[0];
  }
  check('3: legacy ends where the first call\'s step begins', e0.length === 1 && /_steps\.end\(0\);\s*_steps\.begin\(1\);/.test(lines[e0[0]]), lines[e0[0]]);
  const catchAt = lines.findIndex((l, i) => i > prev && /\} catch \(gameLoopErr\) \{/.test(l));
  check('3: the loop\'s catch asks which step threw (fault)', catchAt > 0 && lines.slice(catchAt, catchAt + 4).some((l) => /_steps\.fault\(gameLoopErr\)/.test(l)));
  check('3: `?framesteps=0` makes no steps (no marks, no ring entry)', /var _steps = sw\('framesteps'\) \? null : makeFrameSteps\(/.test(loopSrc));
  check('3: the first throw goes to the ring as \'frame-step\'', /recordCrash\('frame-step', name \+ ': ' \+ msg\)/.test(loopSrc));
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
  let n = 0;
  for (const l of codeLines(src)) if (l > from && l < to) n++;
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
