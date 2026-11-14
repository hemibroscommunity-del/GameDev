/* ═══ v2.3.4400: A STEADY RATE ON A SCREEN THE GAME CANNOT KEEP UP WITH ═══
 *
 * The owner's iPhone 14 Pro Max, Safari offering the page the screen's own
 * 120 a second, twenty-four minutes into a session: "Still performance
 * issues", the meter reading "fps ~51  frame avg 19.6 p95 26.0 max 32.0".
 * Its frames were on the glass for two refreshes, then three, then two, then
 * four: an uneven speed however steady the step.  src/game/framePacer.js
 * draws on a whole number of refreshes instead.  Checked, on a model of a
 * screen and a device (a frame that costs c ms is next called at the first
 * refresh c ms on; a refresh the pacer passes costs nothing):
 *   1. the address: `pace=0` is the old way;
 *   2. refreshOf: the screen's beat from the gaps between calls -- a 120
 *      screen kept up with, one never kept up with (16.7 and 25: 8.3 apart),
 *      Safari's whole-ms clock, 60, 90 and 144 screens; a clock that wobbles
 *      says nothing;
 *   3. THE FAULT, with `?pace=0`'s every-refresh rule: the owner's phone
 *      draws frames of two, three and four refreshes mixed;
 *   4. the pacer on the same phone settles on every third refresh: nine
 *      frames in ten the same length, and no slower on the whole than 40;
 *   5. a phone that only just misses 120 settles on a steady 60;
 *   6. a phone that keeps up is never paced (every refresh drawn), nor is
 *      one that misses now and then (the owner's cool phone, 106 a second);
 *   7. a 60 screen is never paced, however slow the device (its only whole
 *      step down is 30); nor the QA box's few frames a second; nor a clock
 *      that wobbles (mp-steadystep's);
 *   8. it comes back: the phone cools, and after the wait it draws every
 *      refresh again; a phone that stays hot is tried again only at 20 s,
 *      then 40, then 80...;
 *   9. a break (a hidden tab) is drawn at once and judged by nothing; a
 *      loading screen is not judged;
 *  10. the wiring, read from the source;
 *  11. whoever reads the canvas reads a refresh the game DREW (whenDrawn):
 *      a WebGL canvas reads as empty on a refresh the pacer passes, and the
 *      black-screen watchdog counted that as a dark screen (two strikes
 *      rebuild the renderer) -- found by mp-steadypace, its page saying
 *      "watchdog-dark screen 0% lit, strike 1".
 * The phone half is tools/qa/mp/mp-steadypace.mjs.
 *
 * v2.3.5222, THE GOVERNOR (card O PR 2; the grand plan's 2.3: the pacer,
 * grown, moves the ladder of game/drawLanes.js):
 *  12. one verdict, every screen: lateOver is the one rule, judged at 120,
 *      60 and 30; the rate's own steps stay a fast screen's;
 *  13. THE MODEL (2.3's own words): a phone whose frames cost more as it
 *      heats over minutes and less as it cools, at 30, 60 and 120 -- it
 *      SETTLES (the last five minutes at steady heat on one rung, but for
 *      tries up that go straight back), COMES BACK (the lane's row, every
 *      refresh, once cool) and does not SEE-SAW (each try up after a failed
 *      one waits twice as long, to UP_WAIT_MAX_MS); the late frames' split
 *      picks the axis;
 *  14. pixels only behind a veil (a loading screen, a tab's return): a
 *      phone whose chip is the cost reaches the pixel rungs, and each such
 *      step falls inside a veil, the wanted one waiting meanwhile;
 *  15. a full memory takes the work axis's rungs, never the chip's (never
 *      the pixels);
 *  16. off in the test box (`?lane=` holds it, `?govern=1` asks for it,
 *      `?govern=0` turns it off), held by the Speed test, and kept by lane
 *      for the next sitting (loaded at a veil);
 *  17. THE DOOR: the rung (drawLanes.js `_rung`) has one writer, setRung,
 *      and setRung one caller, the governor in framePacer.js; the wiring.
 *
 * BREAK PROOF (rule 8), tried by hand 2026-11-14:
 *  13. framePacer.js makeGovernor down(): `upWait = Math.min(UP_WAIT_MAX_MS, upWait * 2)`
 *      as `upWait = Math.min(UP_WAIT_MAX_MS, upWait)` (the doubling taken out)
 *                                  -> FAIL 13 at 60, both seeds (17 and 13 failed tries: a see-saw; not settled)
 *  14. makeGovernor step(): `if (!veil && movesPixels(ladderRung(), to))` as
 *      `if (false && movesPixels(ladderRung(), to))`   -> FAIL 14 (both seeds) and 14b
 *  17. `setRung(1, 0);` at the end of src/game/speedTest.js -> FAIL 17
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { framePaceOn, refreshOf, makeFramePacer, noteDrawn, whenDrawn, WHEN_DRAWN_TRIES, PACE_FAST_MS, PACE_FLOOR_MS, UP_WAIT_MS, UP_WAIT_MAX_MS, JUDGE_RUNS,
  lateOver, governOn, makeGovernor, useFrameSamples, holdLadder, lateSplit, LATE_DOWN } from '../../src/game/framePacer.js';
import { readdirSync, statSync } from 'node:fs';
import { AXES, KNOBS, KNOB_NAMES, knobAt, ladderRung, rungDepth, useDevClass, drawLane, _resetLanes } from '../../src/game/drawLanes.js';   /* v2.3.5222 */

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const rng = (seed) => { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };

/* A screen refreshing every `b` ms and a device whose frames cost cost(tMs) ms.  The browser calls at a refresh; a
   drawn frame's next call is the first refresh at least its cost later.  `stamp` rounds the time the page is handed
   (Safari: whole ms).  Returns the drawn frames' times (true ms) and the pacer. */
function play(b, cost, ms, { pace = true, stamp = (t) => t, judge = () => true, pacer = null } = {}) {
  const P = pacer || makeFramePacer();
  const drawn = [];
  let k = 0;                      /* the refresh's number */
  while (k * b < ms) {
    const t = k * b;
    const run = pace ? P.take(stamp(t), judge(t)) : true;
    if (run) { drawn.push(t); k += Math.max(1, Math.ceil(cost(t) / b - 1e-9)); }
    else k += 1;
  }
  return { drawn, P };
}
const lens = (drawn, fromMs = 0) => { const out = []; for (let i = 1; i < drawn.length; i++) if (drawn[i - 1] >= fromMs) out.push(drawn[i] - drawn[i - 1]); return out; };
const shareOf = (a, v, tol = 0.6) => a.filter((x) => Math.abs(x - v) <= tol).length / Math.max(1, a.length);
const mean = (a) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
const B120 = 1000 / 120, B60 = 1000 / 60;

/* the owner's hot phone: 65% of frames inside two refreshes, 30% three, 5% four (avg 19.6 ms as the meter read) */
const hot = () => { const r = rng(20261110); return () => { const u = r(); return u < 0.65 ? 9 + r() * 7 : u < 0.95 ? 17.2 + r() * 7 : 25.5 + r() * 7; }; };

/* 1 */
check('1. the address: pace=0, off and false are the old way; anything else is on', !framePaceOn('?pace=0') && !framePaceOn('?perf=1&pace=off') && !framePaceOn('?pace=false&x=1')
  && framePaceOn('') && framePaceOn('?perf=1') && framePaceOn('?pace=1') && framePaceOn('?space=0') && framePaceOn(undefined));

/* 2 */
{
  const gapsOf = (drawn) => lens(drawn);
  const near = (a, b2, tol = 0.35) => a != null && Math.abs(a - b2) <= tol;
  const cool = play(B120, () => 5, 3000, { pace: false });
  check('2. a 120 screen kept up with: 8.3 ms', near(refreshOf(gapsOf(cool.drawn)), B120), refreshOf(gapsOf(cool.drawn)));
  const never = play(B120, hot(), 6000, { pace: false });
  const g = gapsOf(never.drawn);
  check('2b. ...and one never kept up with (no frame inside one refresh): still 8.3, from how far apart its frames stand', Math.min(...g) > 16 && near(refreshOf(g), B120), { min: Math.min(...g), r: refreshOf(g) });
  const whole = gapsOf(never.drawn.map((t) => Math.round(t)));
  check('2c. ...read from Safari\'s whole-ms clock', near(refreshOf(whole), B120, 0.5), refreshOf(whole));
  check('2d. a 60 screen is 16.7 ms, kept up with or not', near(refreshOf(gapsOf(play(B60, () => 6, 4000, { pace: false }).drawn)), B60)
    && near(refreshOf(gapsOf(play(B60, (() => { const r = rng(7); return () => (r() < 0.6 ? 10 : 22); })(), 6000, { pace: false }).drawn)), B60));
  check('2e. 90 and 144 screens', near(refreshOf(gapsOf(play(1000 / 90, () => 4, 3000, { pace: false }).drawn)), 1000 / 90) && near(refreshOf(gapsOf(play(1000 / 144, () => 3, 3000, { pace: false }).drawn)), 1000 / 144));
  check('2f. too few calls say nothing', refreshOf([8.3, 8.3, 8.4]) === null && refreshOf([]) === null);
  /* a clock read when the code runs, not the refresh's: 16.7 give or take a few ms, all the way between */
  const r = rng(99), wob = [];
  for (let i = 0; i < 180; i++) wob.push(11.5 + r() * 10.5);
  const w = refreshOf(wob);
  check('2g. a clock that wobbles between its frames is no screen\'s beat: nothing said, or not a fast screen', w === null || w >= PACE_FAST_MS, w);
}

/* 3: the fault */
{
  const { drawn } = play(B120, hot(), 60000, { pace: false });
  const l = lens(drawn, 20000);
  const two = shareOf(l, 2 * B120), three = shareOf(l, 3 * B120), four = shareOf(l, 4 * B120);
  check(`3. THE FAULT (every refresh the browser offers): the owner's phone draws ${(two * 100).toFixed(0)}% of frames for two refreshes, ${(three * 100).toFixed(0)}% for three, ${(four * 100).toFixed(0)}% for four -- avg ${mean(l).toFixed(1)} ms (the meter: 19.6)`,
    two > 0.5 && two < 0.75 && three > 0.2 && four > 0.02 && Math.abs(mean(l) - 19.6) < 1.2, { two, three, four, mean: mean(l) });
}
/* 4 */
{
  const { drawn, P } = play(B120, hot(), 60000);
  const l = lens(drawn, 20000);
  const st = P.read();
  const three = shareOf(l, 3 * B120);
  check(`4. the pacer on that phone: every third refresh (${st.rate} a second on a ${st.hz} screen) -- ${(three * 100).toFixed(0)}% of frames the same 25 ms (at least 90%)`, st.every === 3 && st.hz === 120 && st.rate === 40 && three >= 0.9, { st, three });
  check(`4b. ...${(1000 / mean(l)).toFixed(1)} frames a second on the whole (at least 38: the phone's own average was 51, unevenly)`, 1000 / mean(l) >= 38, { mean: mean(l) });
  const first = lens(drawn).findIndex((x, i, a) => i > 5 && a.slice(i, i + 20).every((y) => y > 24 && y < 26));
  check(`4c. ...within ${(drawn[Math.max(0, first)] / 1000).toFixed(1)} s of starting (at most 12 s)`, first > 0 && drawn[first] <= 12000, { first, at: drawn[Math.max(0, first)] });
}
/* 5 */
{
  /* frames of 9 to 15 ms: never inside one refresh, always inside two.  That phone is ALREADY steady (every frame two
     refreshes), so there is nothing to pace and nothing is */
  const mk = () => { const r = rng(5); return () => 9 + r() * 6; };
  const { drawn, P } = play(B120, mk(), 30000);
  check('5. a phone whose every frame takes two refreshes is steady already (60): left alone', shareOf(lens(drawn, 10000), 2 * B120) >= 0.99 && P.read().every === 1 && P.read().changes === 0, P.read());
  /* a phone that makes one refresh for six frames in ten: a mix of 8.3 and 16.7 becomes a steady 16.7 */
  const mk2 = () => { const r = rng(6); return () => (r() < 0.6 ? 6 : 11); };
  const free = lens(play(B120, mk2(), 30000, { pace: false }).drawn, 10000);
  const paced = play(B120, mk2(), 30000);
  const ps = shareOf(lens(paced.drawn, 10000), 2 * B120);
  check(`5b. one that makes a refresh for six frames in ten (the old way: ${(shareOf(free, B120) * 100).toFixed(0)}% at 8.3 ms, ${(shareOf(free, 2 * B120) * 100).toFixed(0)}% at 16.7) is paced to a steady 60 (${(ps * 100).toFixed(0)}% at 16.7)`,
    shareOf(free, B120) > 0.5 && shareOf(free, 2 * B120) > 0.3 && paced.P.read().every === 2 && paced.P.read().rate === 60 && ps >= 0.9, paced.P.read());
}
/* 6 */
{
  const fast = play(B120, () => 5, 30000);
  check('6. a phone that keeps up is never paced: every refresh drawn', fast.P.read().every === 1 && fast.P.read().changes === 0 && fast.drawn.length === Math.ceil(30000 / B120), { st: fast.P.read(), n: fast.drawn.length });
  /* the owner's cool phone: 106 a second, one frame in seven a refresh late */
  const mk = () => { const r = rng(8); return () => (r() < 0.14 ? 11 : 5); };
  const cool = play(B120, mk(), 60000);
  check(`6b. ...nor one that misses now and then (the owner's cool phone: ${(1000 / mean(lens(cool.drawn))).toFixed(0)} a second)`, cool.P.read().every === 1 && cool.P.read().changes === 0 && Math.abs(1000 / mean(lens(cool.drawn)) - 106) < 4, cool.P.read());
}
/* 7 */
{
  const mk = () => { const r = rng(9); return () => (r() < 0.5 ? 12 : 24); };
  const slow60 = play(B60, mk(), 60000);
  const free60 = play(B60, mk(), 60000, { pace: false });
  check('7. a 60 screen is never paced, however slow the device: frame for frame as the old way', slow60.P.read().every === 1 && slow60.P.read().changes === 0 && slow60.drawn.length === free60.drawn.length, { st: slow60.P.read(), a: slow60.drawn.length, b: free60.drawn.length });
  const box = play(1000 / 60, (() => { const r = rng(10); return () => 180 + r() * 240; })(), 120000);
  check('7b. nor the QA box (a few frames a second): every call drawn', box.P.read().every === 1 && box.P.read().changes === 0, box.P.read());
  /* mp-steadystep's clock: 60 a second read when the code runs, a few ms either side */
  const P = makeFramePacer();
  const r = rng(20261109);
  let t = 0, all = true;
  for (let i = 0; i < 4000; i++) { const u = r(); t += B60 + (u < 0.02 ? 6 : u < 0.12 ? 2.4 : 0.6) * (r() - 0.5) * 2; if (!P.take(t)) all = false; }
  check('7c. nor a 60 clock that wobbles (mp-steadystep\'s): every call drawn', all && P.read().every === 1, P.read());
  const s75 = play(1000 / 75, (() => { const r2 = rng(11); return () => (r2() < 0.5 ? 9 : 20); })(), 60000);
  check('7d. nor a 75 screen (its step down would be 37 a second, under the floor)', s75.P.read().every === 1 && 2 * (1000 / 75) > PACE_FLOOR_MS, s75.P.read());
  const mk144 = () => { const r2 = rng(12); return () => (r2() < 0.55 ? 5 : 10); };
  const s144 = play(1000 / 144, mk144(), 30000);
  check(`7e. a 144 screen kept up with for half its frames is paced to a whole step (${s144.P.read().rate} a second)`, s144.P.read().every === 2 && s144.P.read().rate === 72 && shareOf(lens(s144.drawn, 10000), 2000 / 144) >= 0.9, s144.P.read());
  const slow240 = play(1000 / 240, () => 60, 30000), free240 = play(1000 / 240, () => 60, 30000, { pace: false });
  check('7f. frames of 60 ms on a 240 screen: every call still drawn, as the old way', slow240.drawn.length === free240.drawn.length && slow240.P.read().every === 1, { st: slow240.P.read(), n: slow240.drawn.length });
  /* never under the floor: frames a little over three refreshes of a 120 screen (the next whole step would be 30 a second) */
  const over = play(B120, (() => { const r2 = rng(13); return () => (r2() < 0.5 ? 20 : 27); })(), 60000);
  check(`7g. never slower than the floor: at most every third refresh of a 120 screen (${over.P.read().every}), about 40 a second`, over.P.read().every <= 3 && over.P.read().most === 3 && over.P.read().every * over.P.read().refresh <= PACE_FLOOR_MS, over.P.read());
}
/* 8 */
{
  /* hot for 60 s, then cool */
  const h = hot();
  const { drawn, P } = play(B120, (t) => (t < 60000 ? h() : 5), 60000 + UP_WAIT_MS * 3 + 10000);
  const tail = lens(drawn, drawn[drawn.length - 1] - 5000);
  check('8. it comes back: the phone cools, and it draws every refresh again', P.read().every === 1 && shareOf(tail, B120) >= 0.98, { st: P.read(), share: shareOf(tail, B120) });
  /* a phone that stays hot: the tries up are 20 s apart, then 40, then 80 ... */
  const stay = makeFramePacer();
  const h2 = hot();
  const tries = [];
  let k = 0, was = 1;
  const END = 16 * 60000;
  while (k * B120 < END) {
    const t = k * B120;
    if (stay.take(t)) k += Math.max(1, Math.ceil(h2() / B120 - 1e-9)); else k += 1;
    const e = stay.read().every;
    if (e < was && was === 3) tries.push(Math.round(t / 1000));
    was = e;
  }
  const gaps = tries.slice(1).map((t, i) => t - tries[i]);
  check(`8b. a phone that stays hot is tried a step faster ${tries.length} times in 16 minutes, further apart each time (${gaps.join(', ')} s; the last no more than ${UP_WAIT_MAX_MS / 1000} s apart)`,
    tries.length >= 4 && tries.length <= 7 && gaps.every((g, i) => i === 0 || g >= Math.min(UP_WAIT_MAX_MS / 1000 - 4, gaps[i - 1] * 1.6)) && Math.max(...gaps) <= UP_WAIT_MAX_MS / 1000 + 8, { tries, gaps });
  /* ...and each try costs little: the share of the 16 minutes not at 25 ms */
  const r2 = play(B120, hot(), 16 * 60000);
  check(`8c. ...and nine frames in ten are still the same length over those 16 minutes (${(shareOf(lens(r2.drawn, 15000), 3 * B120) * 100).toFixed(1)}%)`, shareOf(lens(r2.drawn, 15000), 3 * B120) >= 0.9);
}
/* 9 */
{
  const P = makeFramePacer();
  let t = 0, took = true;
  for (let i = 0; i < 600; i++) { t += B120; if (!P.take(t)) took = false; }
  const before = P.read();
  t += 4000;                                   /* the tab hidden four seconds */
  const back = P.take(t);
  check('9. a break (a tab hidden four seconds) is drawn at once and changes nothing', took && back && P.read().every === before.every && P.read().changes === before.changes && P.read().refresh === before.refresh, P.read());
  /* a loading screen: every frame late, none judged */
  const load = play(B120, hot(), 40000, { judge: () => false });
  check('9b. behind a loading screen nothing is judged: no pacing however late the frames', load.P.read().every === 1 && load.P.read().changes === 0, load.P.read());
  const then = play(B120, hot(), 20000, { pacer: load.P });
  check('9c. ...and once it lifts, the play is', then.P.read().every === 3, then.P.read());
}
/* 10 */
{
  const bt = readFileSync(join(ROOT, 'src/ui/BroTown.jsx'), 'utf8');
  const loop = bt.slice(bt.indexOf('var _gameLoop = function gameLoop('), bt.indexOf('var _gameLoop = function gameLoop(') + 1800);
  check('10. the game loop asks the pacer first, with the animation frame\'s own timestamp, before it counts or draws a frame', /var _gameLoop = function gameLoop\(_rafT\) \{\s*frameRef\.current = requestAnimationFrame\(_gameLoop\);/.test(loop)
    && /if \(_framePacer && !_framePacer\.take\(typeof _rafT === 'number' \? _rafT : performance\.now\(\), [^)]*\)\) return;/.test(loop)
    && loop.indexOf('_framePacer.take(') < loop.indexOf('S._frameCount++'));
  check('10b. ...not judged behind a loading screen', /_framePacer\.take\([^;]*!S\._zoneLoading[^;]*S\.__introLiftedAt/.test(loop));
  check('10c. `?pace=0` makes no pacer; the steady step starts again when the rate changes', /if \(framePaceOn\(window\.location\.search \|\| ''\)\) _framePacer = makeFramePacer\(\);/.test(bt)
    && /_frameClock\.reset\(\)/.test(bt));
  check('10d. the meter can read it', /window\.__btPace = /.test(bt) && /__btPace/.test(readFileSync(join(ROOT, 'src/debug/perfHud.js'), 'utf8')));
  check('10e. the numbers: a fast screen is over 70 a second, the floor about 40, a verdict from ' + JUDGE_RUNS + ' frames', PACE_FAST_MS === 14 && PACE_FLOOR_MS === 26 && UP_WAIT_MS === 20000);
}

/* 11 */
{
  /* frames by hand: `loop(ts)` is the game's callback (it runs first, as in the browser: it asked for the frame
     first), then whoever asked with whenDrawn */
  let n = 0;                     /* a frame's timestamp never comes twice, here as in a browser */
  const mk = () => {
    let q = [];
    const raf = (cb) => { q.push(cb); };
    /* one frame: drawn or passed */
    const frame = (drawn) => { const ts = ++n * 8.33; if (drawn) noteDrawn(ts); const now = q; q = []; for (const cb of now) cb(ts); return ts; };
    return { raf, frame };
  };
  {
    const { raf, frame } = mk();
    let at = 0, f = 0;
    whenDrawn(() => { at = f; }, raf);
    f = 1; frame(true);
    check('11. a reader that asks is called in the next frame, when the game draws in it', at === 1, at);
  }
  {
    /* drawn every third refresh: asked during a drawn frame, the next two are passed */
    const { raf, frame } = mk();
    const got = [];
    for (let k = 0; k < 9; k++) {
      let called = -1, f = 0;
      whenDrawn(() => { called = f; }, raf);
      const drawnIn = [];
      for (let i = 1; i <= 6 && called < 0; i++) { f = i; const d = (k + i) % 3 === 0; if (d) drawnIn.push(i); frame(d); }
      got.push(called === drawnIn[0]);
    }
    check('11b. paced to every third refresh: never in a passed one, always in the first drawn one', got.every(Boolean), got);
  }
  {
    const { raf, frame } = mk();
    let at = 0, f = 0;
    whenDrawn(() => { at = f; }, raf);
    for (let i = 1; i <= WHEN_DRAWN_TRIES + 3 && !at; i++) { f = i; frame(false); }
    check(`11c. a loop that draws nothing at all is still read, after ${WHEN_DRAWN_TRIES} frames (the dark screen the watchdog exists to find)`, at === WHEN_DRAWN_TRIES, at);
  }
  const bt = readFileSync(join(ROOT, 'src/ui/BroTown.jsx'), 'utf8');
  const loop = bt.slice(bt.indexOf('var _gameLoop = function gameLoop('), bt.indexOf('var _gameLoop = function gameLoop(') + 1800);
  check('11d. the loop says which refresh it draws in, once the pacer has taken it', /_framePacer\.take\([^\n]*\) return;\s*(\/\*[^*]*\*\/\s*)?noteDrawn\(_rafT\);/.test(loop));
  const wd = bt.slice(bt.indexOf('function _sampleLit(done)'), bt.indexOf('window.__btWdSample = function'));
  check('11e. the watchdog asks for a drawn refresh: its sample, its late copy, the screen probe after a rebuild, and QA\'s own sample',
    /if \(document\.visibilityState === 'visible'\) \{\s*(\/\*[\s\S]{0,260}?\*\/\s*)?whenDrawn\(function \(\) \{/.test(bt)
    && /_wdThumbDrop\(job\); whenDrawn\(oldWay\); return;/.test(wd)
    && /superseded by a newer rebuild \*\/\s*try \{\s*(\/\*[^*]*\*\/\s*)?whenDrawn\(function \(\) \{/.test(bt)
    && /window\.__btWdSample = function \(\) \{\s*return new Promise\(function \(res\) \{\s*whenDrawn\(function \(\) \{/.test(bt));
  /* nothing reads the game's canvas in an animation frame of its own any more */
  const own = (bt.match(/requestAnimationFrame\(function \(\) \{[\s\S]{0,400}?drawImage\((canvas|cv), 0, 0, 32, 18\)/g) || []).length;
  check('11f. ...and no 32 x 18 read of the canvas is left in an animation frame of its own', own === 0, own);
}

/* ═══ v2.3.5222: THE GOVERNOR ═══ */
const memStore = () => { let v = null; return { get: () => (v ? JSON.parse(JSON.stringify(v)) : null), set: (x) => { v = JSON.parse(JSON.stringify(x)); }, peek: () => v }; };
/* 12 */
{
  check('12. the one rule of a late frame: more than half a refresh past its frame, at 120, 60 and 30',
    Math.abs(lateOver(B120, 1) - 12.5) < 1e-9 && Math.abs(lateOver(B60, 1) - 25) < 1e-9 && Math.abs(lateOver(1000 / 30, 1) - 50) < 1e-9 && Math.abs(lateOver(B120, 3) - 29.1667) < 1e-3);
  /* a 60 screen: judged now (the governor's), its own rate untouched */
  _resetLanes();
  const store = memStore();
  const gov = makeGovernor({ on: true, store });
  const mk = () => { const r = rng(21); return () => (r() < 0.6 ? 22 : 12); };
  const { P } = play(B60, mk(), 60000, { pacer: makeFramePacer({ gov }), judge: (t) => t > 2000 });
  check('12b. a 60 screen is judged (a verdict a few seconds), and its rate is not paced: every refresh, as before',
    P.read().every === 1 && P.read().changes === 0 && P.read().lateShare > LATE_DOWN, P.read());
  check('12c. ...and the governor stepped down on it (a 60 screen: no rate of its own to step)', rungDepth() > 0, gov.read());
  _resetLanes();
}

/* 13: THE MODEL.  A screen refreshing every b ms; a drawn frame costs work + chip ms (the chip part keeps the page
   waiting), times the heat, times a spread like the owner's meter (seven frames in ten near the mean, a quarter a
   good deal longer, one in twenty much longer); the next call is the first refresh after it.  Each rung lowers what
   its knob would: a crowd rung the work by a fifth, the shine, the shadows, the water a share of the chip, a pixel
   rung a quarter of it.  The RATE's rung is modelled as nothing (it becomes a knob in card O's PR 4), so the ladder
   must settle without it.  The frame meter's samples are the model's own: each drawn frame's gap, and the work of
   the frame before it.  Loading screens (`veil`) now and then: the governor loads its kept rung at the first, and
   moves the pixels only behind one. */
const EFFECT = { crowd: [1, 0.8, 0.64], shine: [1, 0.86], shadows: [1, 0.8], water: [1, 0.9], pixels: [1, 0.78, 0.56] };
const stepOf = (k, r) => KNOBS[k].steps.indexOf(knobAt('full', k, r));
const costAt = (base, r) => { const v = (k) => EFFECT[k][stepOf(k, r)]; return { work: base.work * v('crowd'), chip: base.chip * v('shine') * v('shadows') * v('water') * v('pixels') }; };
function model(b, base, heat, ms, { veil = () => false, seed = 1 } = {}) {
  const G = makeGovernor({ on: true, store: memStore() });
  const P = makeFramePacer({ gov: G });
  const ring = [];
  useFrameSamples((fromT, fn) => { let i = ring.length; while (i > 0 && ring[i - 1].t > fromT) i--; for (let j = i; j < ring.length; j++) fn(ring[j]); return ring.length ? ring[ring.length - 1].t : fromT; }, null);
  const r = rng(seed);
  const steps = [];
  let seen = 0, k = 0, prevT = null, prevWork = 0;
  while (k * b < ms) {
    const t = k * b;
    const v = veil(t);
    if (P.take(t, !v)) {
      if (prevT != null) { ring.push({ t, totalMs: t - prevT, workMs: prevWork }); if (ring.length > 600) ring.shift(); }
      const u = r();
      const m = heat(t) * (u < 0.7 ? 0.85 + 0.2 * r() : u < 0.95 ? 1.05 + 0.3 * r() : 1.35 + 0.35 * r());
      const c = costAt(base, ladderRung());
      prevWork = c.work * m; prevT = t;
      k += Math.max(1, Math.ceil((c.work + c.chip) * m / b - 1e-9));
    } else k += 1;
    const L = G.read();
    if (L.stepsN > seen) { for (const st of L.steps.slice(-(L.stepsN - seen))) steps.push({ ...st, veil: v }); seen = L.stepsN; }
  }
  useFrameSamples(null, null);
  return { P, G, steps };
}
/* heat: cool a minute, up to `hot` by minute 4, steady to minute 20, cool again by minute 22, cool to minute 40 */
const MIN = 60000;
const heatOf = (hot) => (t) => (t < MIN ? 1 : t < 4 * MIN ? 1 + (hot - 1) * (t - MIN) / (3 * MIN) : t < 20 * MIN ? hot : t < 22 * MIN ? hot - (hot - 1) * (t - 20 * MIN) / (2 * MIN) : 1);
const loadings = (t) => t < 2000 || [5, 9, 13, 24, 28, 31, 34, 37].some((m) => t >= m * MIN && t < m * MIN + 3000);
/* a failed try: a step up whose very next step is back down the same axis */
const failedTries = (steps, from, to) => steps.filter((x, i) => x.dir > 0 && x.t >= from && x.t < to && steps[i + 1] && steps[i + 1].dir < 0 && steps[i + 1].axis === x.axis);
/* the most failed tries the doubled waits allow on a stretch of `ms`: 20, 40, 80, 160 s, then one each 320 s, and one */
const triesAllowed = (ms) => { let n = 1, w = UP_WAIT_MS, t = 0; while (t + w <= ms) { t += w; n++; w = Math.min(UP_WAIT_MAX_MS, w * 2); } return n; };
{
  const runs = [
    { name: '30', b: 1000 / 30, base: { work: 11, chip: 13 }, hot: 2.0 },
    { name: '60', b: B60, base: { work: 5, chip: 6 }, hot: 2.1 },
    { name: '120', b: B120, base: { work: 2.6, chip: 3.4 }, hot: 5.4 },
  ];
  for (const R of runs) {
    for (const seed of [7, 8]) {
      _resetLanes();
      const { P, G, steps } = model(R.b, R.base, heatOf(R.hot), 40 * MIN, { veil: loadings, seed });
      const tag = `at ${R.name} a second (seed ${seed})`;
      check(`13. ${tag}: it steps down as the phone heats (${steps.filter((x) => x.dir < 0 && x.t < 9 * MIN).length} steps by minute 9)`, steps.some((x) => x.dir < 0 && x.t < 9 * MIN), steps.slice(0, 8));
      /* settled: the last five minutes at steady heat (15 to 20), one rung but for tries up that go straight back */
      const last = steps.filter((x) => x.t >= 15 * MIN && x.t < 20 * MIN);
      let settled = true;
      for (let i = 0; i < last.length; i++) {
        const x = last[i], back = last[i + 1];
        if (x.dir > 0 && back && back.dir < 0 && back.axis === x.axis) i++;
        else settled = false;
      }
      check(`13. ${tag}: SETTLED -- the last five minutes at steady heat on one rung, but for ${last.filter((x) => x.dir > 0).length} try(s) up, each straight back`, settled, last);
      /* no see-saw: on the 16 minutes of steady heat, no more failed tries than the doubled waits allow */
      const fails = failedTries(steps, 4 * MIN, 20 * MIN);
      const allowed = triesAllowed(16 * MIN);
      check(`13. ${tag}: NO SEE-SAW -- ${fails.length} failed tries up in 16 minutes of steady heat (the doubled waits allow ${allowed}), never two inside UP_WAIT_MS`,
        fails.length <= allowed && fails.every((x, i) => i === 0 || x.t - fails[i - 1].t >= UP_WAIT_MS), fails.map((x) => Math.round(x.t / 1000)));
      const end = G.read();
      check(`13. ${tag}: BACK -- cool again, the lane's row (${end.work} work, ${end.chip} chip) and every refresh (${P.read().every})`, end.depth === 0 && P.read().every === 1, { end, pace: P.read() });
      if (R.name === '120') check(`13. ${tag}: the screen's own rate stepped first (${P.read().changes} changes of the rate)`, P.read().changes >= 2, P.read());
    }
  }
  /* the split picks the axis: frames late for the game's own work take the work axis */
  _resetLanes();
  const workHeavy = model(B60, { work: 13, chip: 2 }, () => 1.3, 3 * MIN, { veil: (t) => t < 2000, seed: 3 });
  _resetLanes();
  const chipHeavy = model(B60, { work: 2, chip: 13 }, () => 1.3, 3 * MIN, { veil: (t) => t < 2000, seed: 3 });
  check('13b. the late frames\' split picks the axis: the game\'s own work steps the work axis (the crowd first), waiting for the chip the chip axis',
    workHeavy.steps.length > 0 && workHeavy.steps[0].axis === 'work' && workHeavy.steps[0].knobs.includes('crowd') && chipHeavy.steps.length > 0 && chipHeavy.steps[0].axis === 'chip',
    { work: workHeavy.steps.slice(0, 2), chip: chipHeavy.steps.slice(0, 2) });
  const sp = lateSplit([{ t: 100, totalMs: 40, workMs: 30 }, { t: 140, totalMs: 16, workMs: 10 }, { t: 180, totalMs: 40, workMs: 5 }], 25, null);
  check('13c. ...and the split itself: the late frames\' own work against the rest (lateSplit)', sp.late === 2 && sp.work === 35 && sp.chip === 45, sp);
  const spb = lateSplit([{ t: 100, totalMs: 40, workMs: 10 }], 25, () => 12);
  check('13c. ...and where the busy beat runs, only the time the page WAITED is the chip\'s (the busy part is neither\'s)', spb.work === 10 && spb.chip === 18, spb);
}
/* 14: pixels only behind a veil */
{
  _resetLanes();
  const veilAt = (t) => t < 2000 || [3, 6, 9].some((m) => t >= m * MIN && t < m * MIN + 2000);
  for (const seed of [11, 12]) {
    _resetLanes();
    const { steps } = model(B60, { work: 1, chip: 13 }, () => 1.8, 11 * MIN, { veil: veilAt, seed });
    const px = steps.filter((x) => x.knobs.includes('pixels'));
    check(`14. a phone whose cost is the chip reaches the pixel rungs (seed ${seed}: ${px.length} step(s) moved the pixels)`, px.length >= 1, steps);
    check('14. ...and each of them was taken behind a veil (a loading screen), never in play', px.length >= 1 && px.every((x) => x.veil), px);
    check('14. ...and no other kind of step waited for one (the shine, the shadows, the water move in play)', steps.filter((x) => !x.knobs.includes('pixels')).some((x) => !x.veil), steps);
  }
  /* a wanted pixel step waits: the governor says so, and a tab's return is a veil too (veil(), as the pacer calls it) */
  _resetLanes();
  const g2 = makeGovernor({ on: true, store: memStore() });
  g2.veil(0);
  for (let i = 0; i < 4; i++) g2.verdict(0.9, 1000 + i, { axis: 'chip', atFloor: true });   /* the rate rung, then the shine */
  for (let i = 0; i < 10; i++) g2.verdict(0.9, 2000 + i, { axis: 'chip', atFloor: true });   /* shadows, water, then the pixels: wanted */
  const waiting = g2.read();
  g2.veil(3000);
  const after = g2.read();
  check('14b. a pixel step wanted in play waits (the strip says so), and is taken at the next veil', waiting.pending && waiting.pending.dir < 0 && knobAt('full', 'pixels', { work: waiting.work, chip: waiting.chip }) === 1
    && !after.pending && knobAt('full', 'pixels', { work: after.work, chip: after.chip }) === 0.75, { waiting, after });
  _resetLanes();
}
/* 15: a full memory */
{
  _resetLanes();
  const g = makeGovernor({ on: true, store: memStore() });
  g.veil(0);
  const was = KNOB_NAMES.map((k) => knobAt('full', k, ladderRung()));
  for (let i = 0; i < 12; i++) g.verdict(0, 1000 * (i + 1), { axis: 'chip', atFloor: true, memFull: true });
  const st = g.read();
  check(`15. a full memory steps the work axis (the crowd), never the chip's: ${st.steps.map((x) => x.axis + ' ' + x.knobs.join('+')).join(', ')}`,
    st.steps.length >= 2 && st.steps.every((x) => x.axis === 'work') && st.chip === 0 && knobAt('full', 'pixels', ladderRung()) === was[KNOB_NAMES.indexOf('pixels')], st);
  check('15. ...and no work rung is a pixel rung (a full memory frees, never resizes)', AXES.work.every((r) => r.knob !== 'pixels'));
  _resetLanes();
}
/* 16 */
{
  check('16. on by default; `?lane=` holds it (a test\'s page); `?govern=1` asks for it; `?govern=0` turns it off',
    governOn('') && governOn('?perf=1') && !governOn('?lane=full') && governOn('?lane=full&govern=1') && !governOn('?govern=0') && !governOn('?x=1&govern=0&lane=light'));
  _resetLanes();
  const off = makeGovernor({ on: false, store: memStore() });
  off.veil(0);
  for (let i = 0; i < 6; i++) off.verdict(0.9, 1000 + i, { axis: 'chip', atFloor: true });
  check('16b. off: the ladder stands at the lane\'s row however late the frames', rungDepth() === 0 && !off.read().on);
  const store = memStore();
  const g = makeGovernor({ on: true, store });
  g.veil(0);
  holdLadder(true);
  for (let i = 0; i < 6; i++) g.verdict(0.9, 1000 + i, { axis: 'work', atFloor: true });
  const held = rungDepth();
  holdLadder(false);
  for (let i = 0; i < 2; i++) g.verdict(0.9, 2000 + i, { axis: 'work', atFloor: true });
  check('16c. held by the Speed test: no step while it runs; let go, it steps', held === 0 && rungDepth() === 1, { held, now: ladderRung() });
  check('16d. the rung is kept by lane (localStorage, here a model of it)', JSON.stringify(store.peek()) === JSON.stringify({ full: [1, 0] }), store.peek());
  _resetLanes();
  const next = makeGovernor({ on: true, store });
  const before = rungDepth();
  next.veil(5000);
  check('16e. the next sitting starts where the last settled, loaded at its first veil (the loading screen)', before === 0 && ladderRung().work === 1 && ladderRung().chip === 0 && next.read().lane === 'full', ladderRung());
  for (let i = 0; i < 3; i++) next.verdict(0, 5000 + UP_WAIT_MS + i, { axis: 'work', atFloor: true });
  check('16f. ...and tries up from there after UP_WAIT_MS of clean frames', rungDepth() === 0, ladderRung());
  /* a 30 screen's lane keeps its own */
  _resetLanes();
  useDevClass(() => ({ hz: 30 }));
  const g30 = makeGovernor({ on: true, store });
  g30.veil(0);
  check('16g. a 30 screen (the `thirty` lane) keeps a rung of its own, not full\'s', drawLane() === 'thirty' && g30.read().lane === 'thirty' && rungDepth() === 0, { lane: drawLane(), rung: ladderRung() });
  _resetLanes();
}
/* 17: the door */
{
  const strip = (x) => x.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length));
  const files = [];
  (function walk(dir) {
    for (const name of readdirSync(join(ROOT, dir))) {
      const rel = dir + '/' + name;
      if (statSync(join(ROOT, rel)).isDirectory()) walk(rel);
      else if (/\.(js|jsx|mjs)$/.test(name)) files.push(rel);
    }
  })('src');
  const callers = files.filter((f) => /\bsetRung\s*\(/.test(strip(readFileSync(join(ROOT, f), 'utf8'))));
  check('17. THE DOOR: setRung (the rung\'s one writer) is called by the governor alone (game/framePacer.js), defined in drawLanes.js',
    callers.sort().join() === 'src/game/drawLanes.js,src/game/framePacer.js', callers);
  const dl = strip(readFileSync(join(ROOT, 'src/game/drawLanes.js'), 'utf8'));
  const writes = [...dl.matchAll(/\b_rung\s*=(?!=)/g)].length;
  check('17. ...and `_rung` is written in setRung, and reset for the tests (_resetLanes), nowhere else', writes === 3
    && /export function setRung\([^)]*\) \{[\s\S]*?_rung = w === 0 && c === 0 \? ROW : Object\.freeze/.test(dl) && /export function _resetLanes\(\) \{[^}]*_rung = ROW;/.test(dl), writes);
  const fp = strip(readFileSync(join(ROOT, 'src/game/framePacer.js'), 'utf8'));
  check('17b. the pacer imports the lanes\' table alone (a leaf with no imports)', [...fp.matchAll(/^import .* from '([^']+)';/gm)].map((m) => m[1]).join() === './drawLanes.js'
    && ![...dl.matchAll(/^import /gm)].length);
  const pt = readFileSync(join(ROOT, 'src/debug/perfTracker.js'), 'utf8');
  check('17c. the frame meter hands the pacer its samples by a setter (no import into the pacer)', /useFrameSamples\(eachSince, busyIn\);/.test(pt));
  const st = readFileSync(join(ROOT, 'src/game/speedTest.js'), 'utf8');
  check('17d. the Speed test holds the ladder while it runs, and lets it go in its finally', /holdLadder\(true\);/.test(st) && /finally \{\s*restore\(was\);\s*holdLadder\(false\);/.test(st));
  const bt = readFileSync(join(ROOT, 'src/ui/BroTown.jsx'), 'utf8');
  check('17e. no new loop and no step of the frame: BroTown.jsx makes the pacer as before and knows nothing of the governor', !/makeGovernor|holdLadder|setRung|laneKnob/.test(bt) && /_framePacer = makeFramePacer\(\);/.test(bt));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
