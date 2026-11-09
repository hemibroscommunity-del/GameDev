/* ═══ v2.3.4355: A STEADY STEP ON A STEADY SCREEN ═══
 *
 * src/game/frameClock.js.  The owner's iPhone 14 Pro Max, riding the
 * skateboard with the frame meter on: "it was saying 60fps but the screen
 * looked gritty like it was 30fps or worse", its meter reading "avg 16.7 p95
 * 19.0 max 24.0".  The step a frame was that frame's own measured length,
 * which wobbles round the screen's steady refresh.  Checked:
 *   1. a steady screen: the step is the screen's own frame, exactly;
 *   2. THE PHONE'S WOBBLE (every frame shown on time, the game's code
 *      starting up to 7 ms late): the old step is up to a third out a frame;
 *      the steady step is within a twentieth -- and covers the same ground;
 *   3. Safari's whole-ms clock (16, 17, 17 ...): within a fiftieth;
 *   4. a frame the screen really dropped (33 ms): no jolt, nothing lost;
 *   5. a break (a tab coming back, a stall past the 3-frame cap): taken as it
 *      is, as before, and the mean starts again -- so under 20 frames a
 *      second (the QA box) the step is exactly what it was;
 *   6. other screens: 120 Hz, 30 frames a second, and a change from one to
 *      the other settle on their own frame, the ground covered the same;
 *   7. the off-ramp `?dtsmooth=0`;
 *   8. the game loop really steps by it (BroTown.jsx).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeFrameClock, frameSmoothOn, SMOOTH_FRAMES, SMOOTH_MAX_MS } from '../../src/game/frameClock.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 500))); }
}
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const F = 1000 / 60;
const run = (raws) => { const c = makeFrameClock(); return raws.map((r) => c.step(r)); };
const sum = (a) => a.reduce((x, y) => x + y, 0);
const worst = (a, ideal, from = 0) => Math.max(...a.slice(from).map((v) => Math.abs(v - ideal) / ideal));
/* a seeded wobble, the same every run */
function rng(seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }

/* 1 */
{
  const out = run(new Array(120).fill(F));
  check('1. a steady 60 Hz screen: every step is the screen\'s frame', out.every((v) => Math.abs(v - F) < 1e-9));
}

/* 2: the phone.  Frame n is shown at n x 16.667 ms; the game's code starts `late` after that: mostly under a ms, one
   frame in ten 2 ms late, one in fifty 5 to 7 ms late -- lengths of avg 16.7, p95 ~19, max ~24, the owner's meter */
{
  const r = rng(20261109);
  const starts = [];
  for (let n = 0; n < 600; n++) {
    const u = r();
    const late = u < 0.02 ? 5 + r() * 2.4 : u < 0.12 ? 1.5 + r() * 1.2 : r() * 0.8;
    starts.push(n * F + late);
  }
  const raws = [];
  for (let n = 1; n < starts.length; n++) raws.push(starts[n] - starts[n - 1]);
  const sorted = [...raws].sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)], max = sorted[sorted.length - 1], avg = sum(raws) / raws.length;
  check('2. the wobble played is the phone\'s meter: avg 16.7, p95 18 to 19, max 22 to 24 ms', Math.abs(avg - F) < 0.05 && p95 > 17.5 && p95 < 19.5 && max > 21.5 && max < 24.5,
    { avg: +avg.toFixed(2), p95: +p95.toFixed(1), max: +max.toFixed(1) });
  const out = run(raws);
  const wRaw = worst(raws, F), wOut = worst(out, F, SMOOTH_FRAMES);
  check('2b. the old step (the frame\'s own length) is up to a third out, frame to frame', wRaw > 0.3, +wRaw.toFixed(3));
  check('2c. the steady step is never more than a twentieth out', wOut < 0.05, +wOut.toFixed(4));
  /* frame to frame: the jump from one step to the next, which is what the eye follows */
  const hop = (a) => { let m = 0; for (let i = SMOOTH_FRAMES + 1; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - a[i - 1])); return m; };
  check('2d. ...and from one frame to the next the step changes by under 1.5 ms (it changed by up to 13)', hop(out) < 1.5 && hop(raws) > 10, { steady: +hop(out).toFixed(2), old: +hop(raws).toFixed(2) });
  check('2e. the same ground is covered: the steps add up to the clock, within one frame', Math.abs(sum(out) - sum(raws)) < F, +(sum(out) - sum(raws)).toFixed(2));
}

/* 3 */
{
  const raws = [];
  for (let n = 0, prev = 0; n < 300; n++) { const t = Math.round((n + 1) * F); raws.push(t - prev); prev = t; }
  const out = run(raws);
  check('3. Safari\'s whole-ms clock (16, 17, 17 ...): the step within a fiftieth of the screen\'s frame', new Set(raws).size === 2 && worst(out, F, SMOOTH_FRAMES) < 0.02, +worst(out, F, SMOOTH_FRAMES).toFixed(4));
}

/* 4 */
{
  const raws = new Array(60).fill(F);
  raws[30] = 2 * F;
  const out = run(raws);
  check('4. a frame the screen dropped (33 ms): no step past 20 ms -- its time is spent a tenth a frame', Math.max(...out) < 20 && out[30] > F, +Math.max(...out).toFixed(2));
  check('4b. ...and none of it is lost', Math.abs(sum(out) - sum(raws)) < 1e-6, sum(out) - sum(raws));
}

/* 5 */
{
  const c = makeFrameClock();
  for (let i = 0; i < 20; i++) c.step(F);
  const a = c.step(400), b = c.step(18), d = c.step(15);
  check('5. a break (400 ms) is taken as it is, as before', a === 400);
  check('5b. ...and the mean starts again after it (18 alone, then 18 and 15)', b === 18 && Math.abs(d - 16.5) < 1e-9, { b, d });
  const slow = [83, 250, 120, 90, 60, 51];
  const outSlow = run(slow);
  check('5c. past the 3-frame cap every frame is its own length: under 20 frames a second nothing changes', outSlow.every((v, i) => v === slow[i]) && SMOOTH_MAX_MS === 50, outSlow);
  const odd = run([0, -3, NaN]);
  check('5d. no length (a first frame, a clock that went back) is passed on as it is for the loop\'s own fallback', odd[0] === 0 && odd[1] === -3 && Number.isNaN(odd[2]));
}

/* 6 */
{
  const hz120 = run(new Array(80).fill(1000 / 120));
  check('6. a 120 Hz screen: 8.33 ms a step', hz120.every((v) => Math.abs(v - 1000 / 120) < 1e-9));
  const fps30 = run(new Array(80).fill(1000 / 30));
  check('6b. 30 frames a second: 33.3 ms a step', fps30.every((v) => Math.abs(v - 1000 / 30) < 1e-9));
  const change = new Array(40).fill(F).concat(new Array(40).fill(2 * F));
  const out = run(change);
  check('6c. a change from 60 to 30: settled on the new frame within ten frames, climbing all the way', Math.abs(out[40 + SMOOTH_FRAMES] - 2 * F) < 1e-6 && out.slice(40, 50).every((v, i, a) => i === 0 || v > a[i - 1]));
  check('6d. ...the ground covered is the clock\'s, less what the mean still holds (under five frames\' worth)', sum(change) - sum(out) >= 0 && sum(change) - sum(out) < 5 * F, +(sum(change) - sum(out)).toFixed(1));
}

/* 7 */
check('7. on unless the address says dtsmooth=0', frameSmoothOn('') && frameSmoothOn('?perf=1') && frameSmoothOn(null) && !frameSmoothOn('?dtsmooth=0') && !frameSmoothOn('?perf=1&dtsmooth=0&res=2') && !frameSmoothOn('?dtsmooth=off') && frameSmoothOn('?dtsmooth=1') && frameSmoothOn('?xdtsmooth=0'));

/* 8 */
{
  const bt = readFileSync(join(ROOT, 'src/ui/BroTown.jsx'), 'utf8');
  check('8. the game loop steps by the clock', /var _stepMs = _frameClock \? _frameClock\.step\(_perfDelta\) : _perfDelta;\s*S\._dtScale = Math\.max\(0\.2, Math\.min\(3, \(_stepMs \|\| 16\.667\) \/ 16\.667\)\);/.test(bt));
  check('8b. ...one clock a loop, none with the off-ramp', /if \(frameSmoothOn\(window\.location\.search \|\| ''\)\) _frameClock = makeFrameClock\(\);/.test(bt));
  check('8c. ...and nothing else in the loop makes the step from the frame\'s own length', (bt.match(/S\._dtScale = /g) || []).length === 1 && !/S\._dtScale = [^;]*_perfDelta/.test(bt));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
