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
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { framePaceOn, refreshOf, makeFramePacer, noteDrawn, whenDrawn, WHEN_DRAWN_TRIES, PACE_FAST_MS, PACE_FLOOR_MS, UP_WAIT_MS, UP_WAIT_MAX_MS, JUDGE_RUNS } from '../../src/game/framePacer.js';

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

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
