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
 * v2.3.5224, THE RATE IS A KNOB (card O PR 4):
 *  18. a 60 screen too hot for 60 steps to a steady 30 (the ladder's rate
 *      rung: every second refresh) and back once cool, with no see-saw; a
 *      120 screen is never paced below 40 a second by the rung (the planning
 *      session's (a)); `?ladderrate=0` is the rate as before; and the rate is
 *      read through laneKnob.
 *  19. THE LIVE KNOBS (the gatekeeper's sitting 11 on #1794, verified by a
 *      probe: the governor counted every knob, read or not, so after a hot
 *      sitting a cool 60 phone climbed back one 20 s try a rung through
 *      rungs nothing read, the rate last -- minutes at 30, a whole sitting
 *      where a pixel rung waited for a veil): it walks only the rungs of
 *      knobs marked moved; a kept rung is loaded only under the live set it
 *      was kept with, trimmed to what it changes; a cool phone after a hot
 *      sitting is back at 60 in ONE try; rungDepth counts live rungs; and a
 *      try up that moves the pixels waits for its veil while the other axis
 *      tries.  v2.3.5225 (the planning session's (A), card O PR 5): a kept
 *      rung loads WITHOUT its pixel rungs, the rate and the passes kept
 *      (19g).  v2.3.5229, (A) REVISED (the planning session, card O PR 9):
 *      the chip axis keeps the rate only, its passes start drawn (19g; 19c
 *      as written, with the passes live).
 *  20. THE OWNER'S SWITCH (v2.3.5235): `govern` on the Test panel's list
 *      (clientOff.js), every phone, live: off, back to the lane's row at the
 *      next verdict and no step (a pixel rung at the next veil); the row is
 *      kept; on again, it steps again; a hot phone switched off all sitting
 *      is never paced.
 *  21. THE GATEKEEPER'S SITTING 12 (v2.3.5225): the pixels are an axis of
 *      their own, tried up LAST -- a cooled phone gets its rate back in play
 *      before its next veil, the pixels at it (the gatekeeper's probe); a
 *      pixel step wanted before the tab hid is dropped at its return; a
 *      work-bound phone never reaches the pixels; `?ladderrate=0` and
 *      `?ladderpix=0` take their knobs off the governor's live set.
 *  22. THE GATEKEEPER'S SITTING 15 (v2.3.5226, on #1836): a crowd rung whose
 *      cap is at or above the players near hides no one and is passed (the
 *      governor compares what the screen sees, drawLanes.js knobSeen): 10
 *      near, the rate first; 20, the 15-step then the rate; 40, both crowd
 *      steps then the rate; cooled with 10 near, back in one try.
 *  24. v2.3.6503 (card PH PR 4): THE GOVERNOR ON A PHONE THAT HEATS WITH ITS
 *      WORK (the review's model, tools/dev/plants/govsim.mjs, here as the
 *      suite's own): at 60 and 120, five heats, each settling in 3 and 10
 *      minutes -- at most two rate changes in the second half hour; the
 *      higher rate for no less of the hour than the phone drawing every
 *      refresh it can; the screen's beat read right (a hot phone's missed
 *      frames never a slower screen); a phone that cools comes back; a cool
 *      one is never stepped; the two off-ramps (`?govcool=0`, `?beathold=0`)
 *      are today's, and fail the same phones (24d).
 *      v2.3.6507 (the gatekeeper's sitting 60): A STEP THE CHIP CAUSED COMES
 *      BACK (24k: the chip's cost x1.8 or x2.6 for minutes 5 to 15, the work
 *      unchanged, at 60 and 120, and at the edge with the work up 10 to 30%:
 *      at the top rate from minute 17, no flutter, the doubled wait holding
 *      the hot ten minutes); a step the work caused waits for its margin
 *      (24l, 24m: heatSeen); §13 runs `?govcool=0` too (the doubling).
 *
 * BREAK PROOF (rule 8), tried by hand 2026-11-14:
 *  13. framePacer.js makeGovernor down(): `upWait = Math.min(UP_WAIT_MAX_MS, upWait * 2)`
 *      as `upWait = Math.min(UP_WAIT_MAX_MS, upWait)` (the doubling taken out)
 *                                  -> FAIL 13 at 60, both seeds (17 and 13 failed tries: a see-saw; not settled)
 *      v2.3.6507: since PR 4's margin its phone never tries up while hot, so the plant is red only in §13's
 *      `?govcool=0` run: FAIL 13 at 60 `?govcool=0`, both seeds (38 failed tries), and 24k (below)
 *  14. makeGovernor step(): `if (!veil && movesPixels(ladderRung(), to))` as
 *      `if (false && movesPixels(ladderRung(), to))`   -> FAIL 14 (both seeds) and 14b
 *  17. `setRung(1, 0);` at the end of src/game/speedTest.js -> FAIL 17
 *  18. framePacer.js take(): `const want = rateOn ? ... : 1;` as `const want = 1;` -> FAIL 18b (never a steady 30)
 *      ...and the fast screen's `(PACE_FLOOR_MS + 0.5)` as `(rateAt + 0.5)` -> FAIL 18c (a 120 screen to 30), 18e
 *  19. makeGovernor `vec` over every knob (the old KNOB_NAMES) in place of liveKnobs()
 *                                  -> FAIL 19b (empty steps through the crowd's rungs) and 19c (6 and 7 tries up, 127 and 149 s)
 *      ...load() without `v[2] === liveKey()` (v2.3.5225: `v[3]`) -> FAIL 19d (both); `if (pending) { back = ... }` taken out -> FAIL 19f;
 *      apply() without trim(to) -> FAIL 19c ([3,0]: back at 60 but the strip still says work 2)
 *  21. (v2.3.5225, the gatekeeper's sitting 12) the up order without `stack[i] !== 'pixels'` (the pixels not last)
 *                                  -> FAIL 21a (the rate never back before the veil) and 19f
 *      ...veil() without `if (pending && pending.hides !== _hides) pending = null;` -> FAIL 21b
 *      ...a work-bound order `['work', 'chip', 'pixels']` -> FAIL 21c; liveKnobs() unfiltered by the switches -> FAIL 21d
 *      v2.3.5225: load() taking the kept pixel count (`pixels: 0` as the kept `v[2]`: (A) undone)
 *                                  -> FAIL 19g and 19c ([0,4,2], [3,4,2]: no step up in three cool minutes, no veil)
 *      v2.3.5229 (the gatekeeper's sitting 17): the work-bound order `['work', 'chip']` again
 *                                  -> FAIL 21c (work rate, then chip shine, shadows, water) and 22c (4 tries up)
 *      v2.3.5229: load() keeping the whole chip axis (`CHIP_KEPT` as `AXES.chip.length`: (A)'s revision undone)
 *                                  -> FAIL 19c ([0,4,2], [3,4,2]: 4 tries up, 60 at 85 s) and 19g (the passes kept)
 *  22. (v2.3.5226, the gatekeeper's sitting 15) vec() without knobSeen (the knob's value, not what the screen sees)
 *                                  -> FAIL 22a (crowd, crowd, rate: the rate at 27 s), 22b, 22c (3 tries up)
 *  20. verdict() without `if (switchedOff()) { rest(ts, false); return; }` -> FAIL 20a, 20b, 20d, 20e (a step taken, a rung kept)
 *      ...rest() with `const to = row;` (the pixels in play) -> FAIL 20d
 *  24. (v2.3.6503, card PH PR 4; tried by hand 2026-11-24)
 *      cooledFrom() as `return true;` (no margin, the pacer's and the governor's) -> FAIL 24a (60/1.6: 10 changes) and 24g
 *      ...the governor's `if (coolOn && !cooledFrom(hotWork, workNow)) return;` taken out -> FAIL 24a (60/1.6: 10 changes)
 *      ...the pacer's rate try without `&& cooledFrom(hotRate, heat())` -> FAIL 24a (a fast screen's own see-saw)
 *      keptBeat() as `return r;` (every reading believed) -> FAIL 24c (a hot 120 read as a 60), 24h, 24j
 *  13 and 24k. (v2.3.6507, the gatekeeper's sitting 60, review-z60 on #2318; tried by hand 2026-11-24)
 *      the governor's down() as `if (done && wasUp) { wasUp = false; }` (the doubling taken out: green on 1ede9800,
 *      the margin masking it) -> FAIL 13 at 60 `?govcool=0`, both seeds (38 failed tries), and 24k (52 steps a chip-hot ten minutes)
 *      the governor's down() `hotWork = workNow` (the margin on the work alone, PR 4's line)
 *                                  -> FAIL 24k (60: at 30 from minute 5 to the end) and 24m (no try up on the wait)
 *      the pacer's down() `hotRate = w` (the same, a fast screen's own rate) -> FAIL 24k (120: 0% and 38% at 120 from minute 17)
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { framePaceOn, refreshOf, makeFramePacer, noteDrawn, whenDrawn, WHEN_DRAWN_TRIES, PACE_FAST_MS, PACE_FLOOR_MS, UP_WAIT_MS, UP_WAIT_MAX_MS, JUDGE_RUNS,
  lateOver, governOn, makeGovernor, useFrameSamples, holdLadder, lateSplit, LATE_DOWN, ladderRateOn, _tabHid } from '../../src/game/framePacer.js';
import { readdirSync, statSync } from 'node:fs';
import { AXES, KNOBS, KNOB_NAMES, knobAt, ladderRung, rungDepth, useDevClass, drawLane, _resetLanes, liveKnobs, _liveKnobs, MOVED_KNOBS, LADDER_KNOBS } from '../../src/game/drawLanes.js';
import { noteCrowdNear } from '../../src/game/crowdCap.js';   /* v2.3.5226: the players near (§22) -- what the screen sees of a crowd cap */
import { setClientOff, _resetClientOff, CLIENT_SAVERS } from '../../src/game/clientOff.js';   /* v2.3.5235: the owner's switch */   /* v2.3.5222; v2.3.5224 the live knobs */

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
  /* v2.3.5342: the address from the page's one reader (game/switches.js pageAddress; card M PR 3, the planning session's answer) */
  check('10c. `?pace=0` makes no pacer; the steady step starts again when the rate changes', /if \(framePaceOn\(pageAddress\(\)\)\) _framePacer = makeFramePacer\(\);/.test(bt)
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
  const { P } = play(B60, mk(), 60000, { pacer: makeFramePacer({ gov, rateOn: false }), judge: (t) => t > 2000 });
  check('12b. a 60 screen is judged (a verdict a few seconds), and its own rate is not paced: every refresh, as before (the rate\'s knob aside: §18)',
    P.read().every === 1 && P.read().changes === 0 && P.read().lateShare > LATE_DOWN, P.read());
  check('12c. ...and the governor stepped down on it (a 60 screen: no rate of its own to step)', rungDepth() > 0, gov.read());
  _resetLanes();
}

/* 13: THE MODEL.  A screen refreshing every b ms; a drawn frame costs work + chip ms (the chip part keeps the page
   waiting), times the heat, times a spread like the owner's meter (seven frames in ten near the mean, a quarter a
   good deal longer, one in twenty much longer); the next call is the first refresh after it.  Each rung lowers what
   its knob would: a crowd rung the work by a fifth, the shine, the shadows, the water a share of the chip, a pixel
   rung a quarter of it.  The RATE's rung is the pacer's own (v2.3.5224: a 60 screen's every second refresh; nothing on
   a 30 screen, nothing below 40 on a fast one).  v2.3.5224: §13 to §16 play the WHOLE ladder live (every knob, as card
   O's PRs will move them: the governor's own walk); §19 plays today's (the knobs marked moved).  The frame meter's samples are the model's own: each drawn frame's gap, and the work of
   the frame before it.  Loading screens (`veil`) now and then: the governor loads its kept rung at the first, and
   moves the pixels only behind one. */
const EFFECT = { crowd: [1, 0.8, 0.64], shine: [1, 0.86], shadows: [1, 0.8], water: [1, 0.9], pixels: [1, 0.78, 0.56] };
const stepOf = (k, r) => KNOBS[k].steps.indexOf(knobAt('full', k, r));
const costAt = (base, r) => { const v = (k) => EFFECT[k][stepOf(k, r)]; return { work: base.work * v('crowd'), chip: base.chip * v('shine') * v('shadows') * v('water') * v('pixels') }; };
function model(b, base, heat, ms, { veil = () => false, seed = 1, store = memStore(), cool } = {}) {
  const G = makeGovernor({ on: true, store, cool });   /* v2.3.6507: cool false, `?govcool=0` (§13 runs both) */
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
_liveKnobs(KNOB_NAMES);   /* v2.3.5224: §13 to §16, the whole ladder (above) */
{
  const runs = [
    { name: '30', b: 1000 / 30, base: { work: 11, chip: 13 }, hot: 2.0 },
    { name: '60', b: B60, base: { work: 5, chip: 6 }, hot: 2.1 },
    { name: '120', b: B120, base: { work: 2.6, chip: 3.4 }, hot: 5.4 },
  ];
  /* v2.3.6507 (the gatekeeper's sitting 60 on #2318, A CARD DODGE GREEN): with the cooling margin (PR 4) this phone
     never tries up while hot, so the margin masked the doubled wait -- the doubling taken out was green here, and break
     proof 13 no longer true.  The doubling is what holds a see-saw wherever the margin does not (`?govcool=0`, one switch
     thrown; a step the chip caused: 24k), so §13 runs both configurations: all new, and `?govcool=0` */
  for (const R of runs) {
    for (const [seed, cool] of [[7, undefined], [8, undefined], [7, false], [8, false]]) {
      _resetLanes();
      const { P, G, steps } = model(R.b, R.base, heatOf(R.hot), 40 * MIN, { veil: loadings, seed, cool });
      const tag = `at ${R.name} a second (seed ${seed}${cool === false ? ', `?govcool=0`' : ''})`;
      check(`13. ${tag}: it steps down as the phone heats (${steps.filter((x) => x.dir < 0 && x.t < 9 * MIN).length} steps by minute 9)`, steps.some((x) => x.dir < 0 && x.t < 9 * MIN), steps.slice(0, 8));
      /* settled: the last five minutes at steady heat (15 to 20) on one rung, but for tries up that come back down: every
         step there is a try up whose next step is back down its axis, or that step back (its try perhaps just before) */
      const last = steps.filter((x) => x.t >= 15 * MIN && x.t < 20 * MIN);
      const settled = last.every((x) => {
        const i = steps.indexOf(x);
        if (x.dir > 0) { const back = steps[i + 1]; return !!back && back.dir < 0 && back.axis === x.axis; }
        const tried = steps[i - 1]; return !!tried && tried.dir > 0 && tried.axis === x.axis;
      });
      check(`13. ${tag}: SETTLED -- the last five minutes at steady heat on one rung, but for ${last.filter((x) => x.dir > 0).length} try(s) up, each back down`, settled, last);
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
  /* v2.3.5224: a 30 screen (its rate has no rung: the chip axis goes on past it), a phone whose cost is the chip */
  const veilAt = (t) => t < 2000 || [3, 6, 9].some((m) => t >= m * MIN && t < m * MIN + 2000);
  for (const seed of [11, 12]) {
    _resetLanes();
    const { steps } = model(1000 / 30, { work: 2, chip: 26 }, () => 1.8, 11 * MIN, { veil: veilAt, seed });
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
  for (let i = 0; i < 10; i++) g2.verdict(0.9, 2000 + i, { axis: 'chip', atFloor: true });   /* shadows, water, then the pixels (v2.3.5225: their own axis): wanted */
  const waiting = g2.read();
  g2.veil(3000);
  const after = g2.read();
  check('14b. a pixel step wanted in play waits (the strip says so), and is taken at the next veil', waiting.pending && waiting.pending.dir < 0 && waiting.pending.axis === 'pixels' && knobAt('full', 'pixels', waiting) === 1
    && !after.pending && knobAt('full', 'pixels', after) === 0.75 && after.pixels === 1, { waiting, after });
  _resetLanes();
}
/* 15: a full memory */
{
  _resetLanes();
  const g = makeGovernor({ on: true, store: memStore() });
  g.veil(0);
  const was = KNOB_NAMES.map((k) => knobAt('full', k, ladderRung()));
  /* v2.3.5681: a memory rung waits MEM_SETTLE_MS after the last (40 s apart here) */
  for (let i = 0; i < 12; i++) g.verdict(0, 40000 * (i + 1), { axis: 'chip', atFloor: true, memFull: true });
  const st = g.read();
  /* v2.3.5231 (card O PR 11; the planner's): the memory's own axis -- the caches, then the crowd */
  check(`15. a full memory steps the memory's own axis (the caches, then the crowd), never the chip's or the work's: ${st.steps.map((x) => x.axis + ' ' + x.knobs.join('+')).join(', ')}`,
    st.steps.length === 3 && st.steps.every((x) => x.axis === 'mem') && st.steps.map((x) => x.knobs.join('+')).join() === 'caches,crowd,crowd' && st.chip === 0 && st.work === 0
    && knobAt('full', 'pixels', ladderRung()) === was[KNOB_NAMES.indexOf('pixels')] && knobAt('full', 'caches', ladderRung()) === 0.5, st);
  check('15. ...and no memory rung is a pixel rung (a full memory frees, never resizes)', AXES.mem.every((r) => r.knob !== 'pixels') && AXES.mem.map((r) => r.knob).join() === 'caches,crowd,crowd');
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
  check('16d. the rung is kept by lane (localStorage, here a model of it), with the live knobs it was kept under (v2.3.5224)', JSON.stringify(store.peek()) === JSON.stringify({ full: [1, 0, 0, KNOB_NAMES.join(',')] }), store.peek());   /* v2.3.5225: three axes */
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
_liveKnobs(null);   /* v2.3.5224: from here, today's live knobs */
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
  /* v2.3.5222 (the gatekeeper's sitting 12): the rung is a module object's property (`LANE._rung`), so card L's phase
     guard reads its writes off the syntax tree (DOOR_SUITES); this reads the text, beside it */
  const writes = [...dl.matchAll(/\b_rung\s*=(?!=)/g)].length;
  check('17. ...and the rung (`LANE._rung`) is written in setRung, and reset for the tests (_resetLanes), nowhere else', writes === 2
    && /const LANE = \{ _rung: ROW \};/.test(dl)
    && /export function setRung\([^)]*\) \{[\s\S]*?LANE\._rung = w === 0 && c === 0 && p === 0 && m === 0 \? ROW : Object\.freeze/.test(dl) && /export function _resetLanes\(\) \{[^}]*LANE\._rung = ROW;/.test(dl), writes);
  const fp = strip(readFileSync(join(ROOT, 'src/game/framePacer.js'), 'utf8'));
  /* v2.3.5235: and the owner's switch's list (clientOff.js), a leaf too */
  const co = strip(readFileSync(join(ROOT, 'src/game/clientOff.js'), 'utf8'));
  check('17b. the pacer imports the lanes\' table, the page\'s one reader and the owner\'s switches alone (leaves: the table imports the reader alone, v2.3.5232)', [...fp.matchAll(/^import .* from '([^']+)';/gm)].map((m) => m[1]).join() === './drawLanes.js,./switches.js,./clientOff.js'
    && [...dl.matchAll(/^import .* from '([^']+)';/gm)].map((m) => m[1]).join() === './switches.js' && ![...co.matchAll(/^import /gm)].length);
  const pt = readFileSync(join(ROOT, 'src/debug/perfTracker.js'), 'utf8');
  check('17c. the frame meter hands the pacer its samples by a setter (no import into the pacer)', /useFrameSamples\(eachSince, busyIn\);/.test(pt));
  const st = readFileSync(join(ROOT, 'src/game/speedTest.js'), 'utf8');
  check('17d. the Speed test holds the ladder while it runs, and lets it go in its finally', /holdLadder\(true\);/.test(st) && /finally \{\s*restore\(was\);\s*holdLadder\(false\);/.test(st));
  const bt = readFileSync(join(ROOT, 'src/ui/BroTown.jsx'), 'utf8');
  /* v2.3.5233 (card O PR 13): its one knob read is the step's cap (laneKnob('step'), the 30 lane) */
  const btKnobs = [...new Set([...bt.matchAll(/(?<![\w$.])laneKnob\(\s*'([a-z]+)'/g)].map((m) => m[1]))];
  check('17e. no new loop and no step of the frame: BroTown.jsx makes the pacer as before and knows nothing of the governor (its one knob, the step\'s cap)', !/makeGovernor|holdLadder|setRung/.test(bt) && btKnobs.length === 1 && btKnobs[0] === 'step' && /_framePacer = makeFramePacer\(\);/.test(bt), btKnobs);
}

/* 18: the rate is a knob (v2.3.5224) */
{
  /* a 60 screen too hot for 60 (frames of 17 to 26 ms, the owner's spread), cool again later */
  const hot60 = { work: 3, chip: 8 };
  for (const seed of [7, 8]) {
    _resetLanes();
    const heat = (t) => (t < MIN ? 1 : t < 3 * MIN ? 1 + 0.9 * (t - MIN) / (2 * MIN) : t < 12 * MIN ? 1.9 : t < 14 * MIN ? 1.9 - 0.9 * (t - 12 * MIN) / (2 * MIN) : 1);
    /* the model's own pacer: read its rate at minute 11 (steady heat) by a veil-free probe of the governor */
    const { P, G, steps } = model(B60, hot60, heat, 30 * MIN, { veil: (t) => t < 2000 || [20, 23, 26].some((m) => t >= m * MIN && t < m * MIN + 2000), seed });
    const rateSteps = steps.filter((x) => x.knobs.includes('rate'));
    const firstRate = rateSteps.find((x) => x.dir < 0);
    const fails = failedTries(steps, 3 * MIN, 12 * MIN);
    check(`18. at 60 (seed ${seed}): the phone too hot for 60 takes the rate's rung first (a steady 30: ${firstRate ? Math.round(firstRate.t / 1000) + ' s' : 'never'}), before any softer picture`,
      !!firstRate && steps.filter((x) => x.dir < 0)[0] === firstRate && firstRate.axis === 'chip', steps.slice(0, 6));
    check(`18. at 60 (seed ${seed}): ...and back to 60 once cool, every refresh (${P.read().every}), no see-saw (${fails.length} failed tries in 9 minutes of steady heat, ${triesAllowed(9 * MIN)} allowed)`,
      P.read().every === 1 && G.read().depth === 0 && rateSteps.some((x) => x.dir > 0) && fails.length <= triesAllowed(9 * MIN), { pace: P.read(), fails: fails.map((x) => Math.round(x.t / 1000)) });
  }
  /* at the rung, a 60 screen is drawn every second refresh: steady */
  _resetLanes();
  {
    const g = makeGovernor({ on: true, store: memStore() });
    const P = makeFramePacer({ gov: g });
    const r = rng(5);
    const drawn = [];
    let k = 0;
    g.veil(0);
    while (k * B60 < 90000) {
      const t = k * B60;
      if (P.take(t, t > 1000)) { drawn.push(t); k += Math.max(1, Math.ceil((r() < 0.6 ? 12 : 20) / B60 - 1e-9)); } else k += 1;
    }
    const l = lens(drawn, 60000);
    check(`18b. at the rate's rung a 60 screen draws every second refresh: ${(shareOf(l, 2 * B60) * 100).toFixed(0)}% of frames the same 33 ms (a steady 30), the rest of the ladder untouched`,
      P.read().every === 2 && P.read().rate === 30 && shareOf(l, 2 * B60) >= 0.9 && knobAt('full', 'rate', ladderRung()) === 34 && ladderRung().chip === 1 && ladderRung().work === 0, { pace: P.read(), rung: ladderRung() });
  }
  /* a 120 screen: the rung changes nothing there (the planning session's (a)) */
  _resetLanes();
  {
    const r = rng(6);
    const { P, G, steps } = model(B120, { work: 3, chip: 5 }, () => 4.5, 6 * MIN, { veil: (t) => t < 2000, seed: 6 });
    check(`18c. a 120 screen too hot for 40 is never paced below 40 a second by the rung (every ${P.read().every} at most ${P.read().most}; the rung taken: ${steps.some((x) => x.knobs.includes('rate'))})`,
      P.read().most <= 3 && P.read().every <= 3 && steps.some((x) => x.knobs.includes('rate')), { pace: P.read(), steps: steps.slice(0, 4) });
  }
  /* ?ladderrate=0: the rate as before */
  _resetLanes();
  {
    const g = makeGovernor({ on: true, store: memStore() });
    const P = makeFramePacer({ gov: g, rateOn: false });
    g.veil(0);
    let k = 0;
    const r = rng(9);
    while (k * B60 < 60000) { const t = k * B60; if (P.take(t, t > 1000)) k += Math.max(1, Math.ceil((r() < 0.6 ? 12 : 20) / B60 - 1e-9)); else k += 1; }
    check('18d. `?ladderrate=0`: the rung taken, the rate as before -- a 60 screen never paced', ladderRung().chip >= 1 && P.read().every === 1 && P.read().changes === 0
      && !ladderRateOn('?ladderrate=0') && ladderRateOn('') && ladderRateOn('?ladderrate=1'), { pace: P.read(), rung: ladderRung() });
  }
  _resetLanes();
  const fp = readFileSync(join(ROOT, 'src/game/framePacer.js'), 'utf8');
  check('18e. the rate is read through the lanes\' one reader (laneKnob(\'rate\')), and `full`\'s row is the pacer\'s own floor (PACE_FLOOR_MS), a fast screen\'s whatever the lane',
    /laneKnob\('rate'\)/.test(fp) && /most = Math\.max\(1, Math\.floor\(\(PACE_FLOOR_MS \+ 0\.5\) \/ refresh\)\);/.test(fp) && knobAt('full', 'rate', null) === PACE_FLOOR_MS);
}

/* 19: THE LIVE KNOBS (v2.3.5224, the gatekeeper's sitting 11 on #1794): the governor walks only rungs whose knob
   something reads (marked moved), keeps a rung with the live set it was kept under, and a cool phone after a hot
   sitting is back at 60 in one try */
{
  _liveKnobs(null);
  /* v2.3.5228: ...and on an axis (the program and the look are moved, chosen
     once behind the loading screen, never a rung: card O PR 8) */
  const onAxis = new Set(Object.values(AXES).flat().map((r) => r.knob));
  const allMoved = KNOB_NAMES.filter((k) => KNOBS[k].reader && KNOBS[k].reader.moved);
  const moved = allMoved.filter((k) => onAxis.has(k));
  check(`19. the live knobs are those marked moved, on the ladder (${liveKnobs().join(', ')}; ${allMoved.length - moved.length} moved off it)`,
    liveKnobs().join() === moved.join() && LADDER_KNOBS.join() === moved.join() && MOVED_KNOBS.join() === allMoved.join() && moved.includes('rate')
    && !liveKnobs().includes('program') && !liveKnobs().includes('look'), liveKnobs());
  const live = new Set(liveKnobs());
  /* a hot 60 phone, the chip its cost, then the game's work: every step changes a live knob, and none passes beyond */
  for (const [name, base] of [['the chip', { work: 3, chip: 8 }], ['its own work', { work: 13, chip: 2 }]]) {
    _resetLanes();
    const { G, steps } = model(B60, base, () => 2.3, 6 * MIN, { veil: (t) => t < 2000, seed: 4 });
    const end = G.read();
    check(`19b. a hot 60 phone (${name} its cost) steps only rungs it reads: ${steps.map((x) => x.axis + ' ' + x.knobs.join('+')).join(', ') || 'none'}; ${end.depth} rung(s) below the row`,
      steps.length >= 1 && steps.every((x) => x.knobs.length >= 1 && x.knobs.every((k) => live.has(k))) && end.depth <= live.size && end.depth === rungDepth(), { steps: steps.slice(0, 6), end });
  }
  /* the gatekeeper's story: a hot sitting kept a deep rung; the next sitting's phone is cool */
  const key = liveKnobs().join(',');
  const back = (kept, seed) => {
    _resetLanes();
    const store = memStore();
    store.set({ full: kept });
    const { P, G, steps } = model(B60, { work: 3, chip: 5 }, () => 1, 3 * MIN, { veil: (t) => t < 2000, seed, store });
    const ups = steps.filter((x) => x.dir > 0);
    return { P, G, steps, ups, first: steps.length ? steps[0] : null };
  };
  /* v2.3.5225: kept as [work, chip, pixels]; (A) loads none of the pixels */
  for (const kept of [[0, 4, 2], [3, 0, 0], [3, 4, 2]]) {
    /* v2.3.5226: the rungs the kept one loads that change something (the crowd's are live since card O's PR 6): one try
       each, the rate's FIRST -- back at 60 on the first try, the rest one by one; none through a rung nothing reads */
    _resetLanes();
    const lst = memStore(); lst.set({ full: [...kept, key] });
    const lg = makeGovernor({ on: true, store: lst }); lg.veil(0);
    const want = lg.read().depth;
    _resetLanes();
    const r2 = back([...kept, key], 5);
    const firstUp = r2.ups.length ? r2.ups[0] : null;
    check(`19c. kept [${kept}] after a hot sitting (${want} live rung(s) loaded), a cool 60 phone is back at 60 on its FIRST try (${firstUp ? firstUp.knobs.join('+') + ' at ' + Math.round(firstUp.t / 1000) + ' s' : '-'}), then one try a live rung (${r2.ups.length} in all), none through a rung nothing reads`,
      !!firstUp && firstUp.knobs.includes('rate') && firstUp.t <= 2000 + UP_WAIT_MS + 10000 && r2.ups.length === want && r2.ups.every((x) => x.knobs.length >= 1)
      && r2.G.read().depth === 0 && r2.G.read().work === 0 && r2.G.read().chip === 0 && r2.P.read().every === 1 && r2.steps.every((x) => x.dir > 0), { want, steps: r2.steps, end: r2.G.read() });
  }
  /* a rung kept under another live set (the governor's first version: no set; a knob moved since) is not loaded */
  for (const kept of [[0, 6], [0, 1, 'rate,crowd'], [0, 1, key]]) {   /* v2.3.5225: + a rung kept as two axes */
    const r = back(kept, 6);
    check(`19d. a rung kept under another live set ([${kept}]) starts at the row: nothing to try up`, r.steps.length === 0 && r.G.read().depth === 0 && r.P.read().every === 1, { steps: r.steps, end: r.G.read() });
  }
  check('19e. rungDepth counts the rungs that change a live knob (the report\'s `rung`): the crowd\'s two count none while it is not read',
    rungDepth({ work: 2, chip: 0, pixels: 0 }) === ['crowd', 'crowd'].filter((k) => live.has(k)).length
    && rungDepth({ work: 0, chip: AXES.chip.length, pixels: AXES.pixels.length }) === AXES.chip.concat(AXES.pixels).filter((x) => live.has(x.knob)).length);
  /* v2.3.5225, the planning session's (A): a kept rung loads WITHOUT its pixel rungs, the rest kept */
  const loaded = (kept) => {
    _resetLanes();
    const st = memStore();
    st.set({ full: kept });
    const g = makeGovernor({ on: true, store: st });
    g.veil(0);
    const r = { ...ladderRung() };
    return { r, pixels: knobAt('full', 'pixels', r), rate: knobAt('full', 'rate', r), knobs: KNOB_NAMES.map((k) => knobAt('full', k, r)) };
  };
  const today = loaded([0, AXES.chip.length, AXES.pixels.length, liveKnobs().join(',')]);
  _liveKnobs(KNOB_NAMES);
  const whole = loaded([2, AXES.chip.length, AXES.pixels.length, KNOB_NAMES.join(',')]);
  /* v2.3.5229, (A) revised: the chip axis through the rate's rung only, the passes drawn */
  const rateAt = AXES.chip.map((x) => x.knob).lastIndexOf('rate') + 1;
  const wantWhole = KNOB_NAMES.map((k) => knobAt('full', k, { work: 2, chip: rateAt, pixels: 0 }));
  _liveKnobs(null);
  const passesAt = (x) => ['shine', 'shadows', 'water'].map((k) => knobAt('full', k, x.r)).join('/');
  check(`19g. a kept rung loads WITHOUT its pixel rungs or its passes (the planning session's (A), revised for card O PR 9): kept [0,${AXES.chip.length},${AXES.pixels.length}] loads ${today.r.work}/${today.r.chip}/${today.r.pixels}, the pixels ${today.pixels}, the passes ${passesAt(today)} and the rate kept (${today.rate}); the whole ladder's [2,${AXES.chip.length},${AXES.pixels.length}] loads ${whole.r.work}/${whole.r.chip}/${whole.r.pixels}, the work's and the rate's kept`,
    liveKnobs().includes('pixels') && today.pixels === 1 && today.rate === 34 && today.r.pixels === 0 && today.r.chip === rateAt && passesAt(today) === 'on/on/moving'
    && whole.pixels === 1 && whole.r.work === 2 && whole.r.chip === rateAt && whole.r.pixels === 0 && passesAt(whole) === 'on/on/moving' && whole.knobs.join() === wantWhole.join(), { today, whole });
  /* the whole ladder: a try up that moves the pixels waits for its veil, and every other axis comes back meanwhile, in
     play (v2.3.5225: the pixels last -- the rate before them) */
  _liveKnobs(KNOB_NAMES);
  _resetLanes();
  const g = makeGovernor({ on: true, store: memStore() });
  g.veil(0);
  /* down by its own steps (two bad verdicts a step): the work axis's two crowd rungs, then the chip's to the pixels,
     each pixel rung at a veil */
  let t = 0;
  const bad = (axis, n) => { for (let i = 0; i < n; i++) g.verdict(0.9, t += 1000, { axis, atFloor: true }); };
  bad('work', 4);
  bad('chip', 8);
  bad('chip', 2); g.veil(t += 1000);
  bad('chip', 2); g.veil(t += 1000);
  const at0 = { ...ladderRung() };
  /* cool: a clean verdict a second for five minutes, no veil */
  for (let i = 0; i < 300; i++) g.verdict(0, t += 1000, { axis: 'chip', atFloor: true });
  const mid = g.read();
  g.veil(t += 1000);
  const after = g.read();
  check(`19f. (the whole ladder) cooled from ${at0.work}/${at0.chip}/${at0.pixels}: every axis but the pixels' comes back in play (${mid.work}/${mid.chip}/${mid.pixels}, the rate ${knobAt('full', 'rate', mid)}), the pixels' try waits (${!!mid.pending}) and is taken at the veil (${after.work}/${after.chip}/${after.pixels})`,
    at0.work === 2 && at0.chip === AXES.chip.length && at0.pixels === AXES.pixels.length && mid.work === 0 && mid.chip === 0 && mid.pixels === AXES.pixels.length
    && knobAt('full', 'rate', mid) === PACE_FLOOR_MS && mid.pending && mid.pending.dir > 0 && mid.pending.axis === 'pixels' && after.pixels === AXES.pixels.length - 1, { at0, mid, after });
  _liveKnobs(null);
  _resetLanes();
}

/* 20: THE OWNER'S SWITCH (v2.3.5235; the planning session's word in place of the card's cap `ladder`): `govern` on the
   Test panel's list (clientOff.js), every phone, live -- off, the ladder goes back to the lane's row and takes no step;
   a pixel rung waits for its veil; on again, it steps again */
{
  _resetClientOff();
  check('20. the switch is a row of the Test panel\'s list, followed live (one name: `off_govern` on the worker, `?govern=0` on the page)',
    CLIENT_SAVERS.some((c) => c.id === 'govern' && c.live === true));
  /* a 60 phone at the rate's rung (today's knobs) */
  _resetLanes();
  const store = memStore();
  const g = makeGovernor({ on: true, store });
  g.veil(0);
  let t = 0;
  const bad = (G, axis, n) => { for (let i = 0; i < n; i++) G.verdict(0.9, t += 1000, { axis, atFloor: true }); };
  bad(g, 'chip', 2);
  const at = rungDepth();
  setClientOff('govern');
  g.verdict(0.9, t += 1000, { axis: 'chip', atFloor: true });
  const offNow = { ...ladderRung(), off: g.read().off };
  bad(g, 'chip', 8);
  bad(g, 'work', 8);
  const still = rungDepth();
  check(`20a. switched off, a phone at the rate's rung (${at} below) is back at the lane's row at its next verdict, and takes no step however late the frames (${still} below after 16 bad verdicts)`,
    at === 1 && offNow.work === 0 && offNow.chip === 0 && offNow.off === true && still === 0, { at, offNow, still });
  check('20b. ...and the row is what it keeps for the next sitting', JSON.stringify(store.peek()) === JSON.stringify({ full: [0, 0, 0, liveKnobs().join(',')] }), store.peek());
  setClientOff('');
  bad(g, 'chip', 2);
  check(`20c. switched on again, it steps again (${rungDepth()} below)`, rungDepth() === 1 && g.read().off === false, ladderRung());
  /* the whole ladder: a pixel rung waits for its veil, the rest of its axis with it; the work axis at once */
  _liveKnobs(KNOB_NAMES);
  _resetLanes();
  const g2 = makeGovernor({ on: true, store: memStore() });
  g2.veil(0);
  bad(g2, 'work', 4);
  bad(g2, 'chip', 8);
  bad(g2, 'chip', 2); g2.veil(t += 1000);
  const deep = { ...ladderRung() };
  setClientOff('govern');
  g2.verdict(0.9, t += 1000, { axis: 'chip', atFloor: true });
  const inPlay = { ...ladderRung() };
  g2.veil(t += 1000);
  const atVeil = { ...ladderRung() };
  check(`20d. (the whole ladder) switched off on a pixel rung (${deep.work}/${deep.chip}/${deep.pixels}): the work's and the chip's axes back at once (${inPlay.work}/${inPlay.chip}/${inPlay.pixels}: the rate too), the pixels at the next veil (${atVeil.work}/${atVeil.chip}/${atVeil.pixels})`,
    deep.work === 2 && deep.chip === AXES.chip.length && deep.pixels === 1 && knobAt('full', 'pixels', deep) < 1 && inPlay.work === 0 && inPlay.chip === 0 && inPlay.pixels === deep.pixels
    && atVeil.work === 0 && atVeil.chip === 0 && atVeil.pixels === 0, { deep, inPlay, atVeil });
  /* a whole sitting of a hot 60 phone, switched off from the start: never paced, never a step */
  _liveKnobs(null);
  _resetLanes();
  const { P, steps } = model(B60, { work: 3, chip: 8 }, () => 2.2, 4 * MIN, { veil: (x) => x < 2000, seed: 3 });
  check(`20e. a hot 60 phone with the switch off all sitting: every refresh drawn (${P.read().every}), no step (${steps.length})`, P.read().every === 1 && steps.length === 0, { pace: P.read(), steps });
  _resetClientOff();
  _resetLanes();
}

/* 21: THE GATEKEEPER'S SITTING 12 (v2.3.5225), on today's knobs (the rate, the pixels) */
{
  _liveKnobs(null);
  /* a: the gatekeeper's probe -- a 60 phone that cannot keep 30 takes the rate, then the pixels at a veil; cooled, the
     rate comes back IN PLAY, before the next veil, and the pixels at it (before: the pixels' try up waited for a veil
     and stopped the rate's, a cooled phone at 30 until its next loading screen) */
  const heat = (t) => (t < 9 * MIN ? 2 : 0.6);
  const veils = (t) => t < 2000 || [6, 15].some((m) => t >= m * MIN && t < m * MIN + 2000);
  const run = (ms) => { _resetLanes(); return model(B60, { work: 3, chip: 20 }, heat, ms, { veil: veils, seed: 21 }); };
  const before = run(14.5 * MIN);
  const b = { ...before.G.read(), every: before.P.read().every };
  const afterRun = run(16 * MIN);
  const a = afterRun.G.read();
  const pxDown = before.steps.find((x) => x.dir < 0 && x.knobs.includes('pixels'));
  const rateUp = before.steps.find((x) => x.dir > 0 && x.knobs.includes('rate') && x.t > 9 * MIN);
  check(`21a. the gatekeeper's probe: a 60 phone that cannot keep 30 takes the pixels at a veil (${pxDown ? Math.round(pxDown.t / 1000) + ' s' : 'never'}); cooled, the rate comes back in play (${rateUp ? Math.round(rateUp.t / 1000) + ' s' : 'never'}, every refresh at 14.5 min: ${b.every}) before the next veil, its pixels still down (${b.pixels}) and waiting; at the veil, a pixel rung up (${a.pixels})`,
    !!pxDown && pxDown.veil && !!rateUp && rateUp.t < 15 * MIN && b.every === 1 && b.pixels >= 1 && b.pending && b.pending.dir > 0 && a.pixels < b.pixels, { b, a, steps: before.steps.slice(-6) });
  /* b: a pixel step wanted before the tab hid is dropped at its return, not taken however long it was away */
  _resetLanes();
  const g = makeGovernor({ on: true, store: memStore() });
  g.veil(0);
  let t = 0;
  const bad = (n) => { for (let i = 0; i < n; i++) g.verdict(0.9, t += 1000, { axis: 'chip', atFloor: true }); };
  /* v2.3.5229: the chip axis's live rungs first (the rate; with card O PR 9
     the shine, the shadows, still water), then the pixels: wanted */
  const chipLive = AXES.chip.filter((x) => liveKnobs().includes(x.knob)).length;
  bad(2 * chipLive);      /* the rate (and the passes) */
  bad(2);                 /* the pixels: wanted */
  const wanted = g.read().pending;
  _tabHid();
  g.veil(t += 600000);    /* back ten minutes later */
  const dropped = g.read();
  bad(2);
  g.veil(t += 1000);      /* a veil with no hide between: taken */
  const taken = g.read();
  check(`21b. a pixel step wanted before the tab hid is dropped at the return (${dropped.pixels} pixel rungs, waiting ${!!dropped.pending}); one wanted after it is taken at the next veil (${taken.pixels})`,
    !!wanted && wanted.dir < 0 && dropped.pixels === 0 && !dropped.pending && taken.pixels === 1, { wanted, dropped, taken });
  /* c: a phone whose own work is the cost never reaches the pixels (the crowd's rungs are not live yet: it took the rate,
     then fell to the pixels) */
  _resetLanes();
  const wb = model(B60, { work: 22, chip: 3 }, () => 2, 12 * MIN, { veil: (x) => x < 2000 || [2, 4, 6, 8, 10].some((m) => x >= m * MIN && x < m * MIN + 2000), seed: 22 });
  /* v2.3.5229 (the gatekeeper's sitting 17): ...nor the passes (the chip's axis only on the chip's verdict) */
  check(`21c. a phone whose own work is the cost takes the rate (${wb.steps.filter((x) => x.dir < 0).map((x) => x.axis + ' ' + x.knobs.join('+')).join(', ')}) and NEVER the pixels or a pass, through five veils`,
    wb.steps.some((x) => x.dir < 0 && x.knobs.includes('rate')) && !wb.steps.some((x) => x.knobs.includes('pixels'))
    && !wb.steps.some((x) => x.knobs.some((k) => ['shine', 'shadows', 'water'].includes(k))) && wb.G.read().chip === 0
    && wb.G.read().pixels === 0 && !wb.G.read().pending, { steps: wb.steps.slice(0, 8), end: wb.G.read() });
  /* d: a knob's ladder switch takes its rungs out of the governor's reach */
  const hadLoc = Object.prototype.hasOwnProperty.call(globalThis, 'location');
  const was = globalThis.location;
  const at = (search) => { globalThis.location = { search }; _resetLanes(); return liveKnobs().slice(); };
  const noPix = at('?ladderpix=0');
  const px = model(B60, { work: 3, chip: 20 }, (x) => (x < 4 * MIN ? 2 : 0.6), 8 * MIN, { veil: (x) => x < 2000 || [3, 5].some((m) => x >= m * MIN && x < m * MIN + 2000), seed: 23 });
  const noRate = at('?ladderrate=0');
  /* v2.3.5229: and `?ladderpass=0` the passes (card O PR 9) */
  const noPass = at('?ladderpass=0');
  const both = at('?ladderrate=0&ladderpix=0&ladderpass=0');
  if (hadLoc) globalThis.location = was; else delete globalThis.location;
  _resetLanes();
  check(`21d. \`?ladderpix=0\`, \`?ladderrate=0\` and \`?ladderpass=0\` take their knobs off the governor's live set (${noPix.join('+')}; ${noRate.join('+')}; ${noPass.join('+')}; all three: ${both.join('+') || 'none'}: v2.3.5226, the crowd stays); with \`?ladderpix=0\` a chip-bound phone takes no pixel rung, and cooled its rate comes back (every ${px.P.read().every})`,
    !noPix.includes('pixels') && noPix.includes('rate') && !noRate.includes('rate') && noRate.includes('pixels')
    && noPass.includes('rate') && noPass.includes('pixels') && !['shine', 'shadows', 'water'].some((k) => noPass.includes(k))
    && !both.includes('rate') && !both.includes('pixels') && !['shine', 'shadows', 'water'].some((k) => both.includes(k))
    && !px.steps.some((x) => x.axis === 'pixels') && !px.G.read().pending && px.G.read().depth === 0 && px.P.read().every === 1, { noPix, noRate, both, steps: px.steps.slice(0, 6), end: px.G.read() });
  _resetLanes();
}

/* 22: THE GATEKEEPER'S SITTING 15 (v2.3.5226, on #1836; the planning session's word): a crowd rung whose cap is at or
   above the players near hides no one and is passed -- a hot spell with 30 or fewer around goes straight to the rate,
   as before the crowd was a knob; with 40 around the crowd's two rungs come first, as the table orders them */
{
  const work = (near, heat) => {
    _resetLanes();
    noteCrowdNear(near);
    const r = model(B60, { work: 22, chip: 3 }, heat, 3 * MIN, { veil: (x) => x < 2000, seed: 31 });
    const out = { steps: r.steps, end: r.G.read(), every: r.P.read().every };
    noteCrowdNear(Infinity);
    return out;
  };
  const hot = () => 2;
  const downs = (r) => r.steps.filter((x) => x.dir < 0).map((x) => x.knobs.join('+'));
  const few = work(10, hot), mid = work(20, hot), many = work(40, hot), none = work(Infinity, hot);
  const rateT = (r) => { const x = r.steps.find((y) => y.dir < 0 && y.knobs.includes('rate')); return x ? x.t : null; };
  check(`22a. 10 players near: the first step is the rate's (${downs(few).join(', ')}), at ${(rateT(few) / 1000).toFixed(1)} s -- where the crowd's steps counted with no one near, the rate came at ${(rateT(none) / 1000).toFixed(1)} s`,
    downs(few)[0] === 'rate' && !downs(few).includes('crowd') && rateT(few) != null && rateT(none) != null && rateT(few) < rateT(none), { few: few.steps.slice(0, 4), none: none.steps.slice(0, 4) });
  check(`22b. 20 near: the 30-step hides no one and is passed, the 15-step taken (${downs(mid).join(', ')}); 40 near: both, then the rate (${downs(many).join(', ')})`,
    downs(mid)[0] === 'crowd' && downs(mid)[1] === 'rate' && mid.steps[0].work === 2
    && downs(many).slice(0, 3).join() === 'crowd,crowd,rate', { mid: mid.steps.slice(0, 4), many: many.steps.slice(0, 4) });
  const cooled = work(10, (x) => (x < 1 * MIN ? 2 : 0.3));
  const ups = cooled.steps.filter((x) => x.dir > 0);
  /* v2.3.5229 (the gatekeeper's sitting 17): back to ONE try -- a work-bound phone never takes the passes (the work's
     axis alone on the work's verdict), so nothing but the rate is given back */
  check(`22c. ...and cooled with 10 near, back at the row in ONE try (${ups.length} up), no try spent on a crowd step (every ${cooled.every})`,
    ups.length === 1 && cooled.end.depth === 0 && cooled.end.work === 0 && cooled.every === 1, { steps: cooled.steps, end: cooled.end });
}

/* ── 23. v2.3.5231 (card O PR 11): THE MEMORY'S VERDICT AND THE CACHES ──
   The pacer's lines are the memory check's (a copy, held here); a count over
   one is a full memory; the chip's count is judged only where it is handed
   in (a phone or a tablet: debug/report.js); the two caches' caps are a
   share of their own and a rung taken trims them at once.
   v2.3.6501 (card PH PR 2; the shape review's item 17): the alarm is the
   game's own TOTAL over a number of its own (MEM_ALARM), no longer a copy of
   the memory check's two lines -- the art's never fired (79.3 against 11 to
   16 read).  23a and 23b hold it; 23i is the node model of a phone filling.
   BREAKS (rule 8), tried by hand once, 2026-11-17:
     - report.js's `fineInput() ? null :` taken out      -> FAIL 23c
     - maskedEvict.js trimMasked's `maskedCap(cap)` made `cap` -> FAIL 23d */
{
  const { MEMORY_BUDGET } = await import('../../tools/qa/mp/memory-budget.mjs');
  const FP = await import('../../src/game/framePacer.js');
  /* v2.3.6501 (card PH PR 2): a trigger of its own, on the game's own total, just above what the game reads in a
     crowded fight (MEM_ALARM.READ, measured on the test box: docs/plan/census/PH-phone.md), well under where an
     iPhone's page dies (about 250 MB, the whole page), and no copy of the memory check's lines */
  const A = FP.MEM_ALARM.MB;
  check('23a. the alarm is a number of its own, just above the game\'s own total in a crowded fight and under the phone\'s 250 MB; the memory check\'s lines are no longer copied',
    A > FP.MEM_ALARM.READ && A <= FP.MEM_ALARM.READ * 1.25 && A < 200 && !('MEM_LINES' in FP)
      && A !== MEMORY_BUDGET.artCache.mb && A !== MEMORY_BUDGET.gpu.mb, { alarm: FP.MEM_ALARM });
  const L = FP.MEM_LINES_OLD;
  check('23b. the game\'s own total -- art, the chip\'s where handed in, sound -- over the alarm is a full memory; at it, not',
    FP.memTotal([10, 70, 18]) === 98 && FP.memTotal([10, null, 18]) === 28 && FP.memTotal(null) === null
    && !FP.memOver([0, A, 0]) && FP.memOver([0, A + 0.5, 0]) && FP.memOver([A / 3, A / 3, A / 3 + 1]) && FP.memOver([A, null, 1])
    && !FP.memOver([0, null, 0]) && !FP.memOver(null));
  check('23b. `?memalarm=0`: the two old lines, frozen (art 79.3, the chip 109.3, the sound never), on that phone',
    FP.memAlarmOld('?memalarm=0') && !FP.memAlarmOld('') && !FP.memAlarmOld('?memalarm=1') && L.artCache === 79.3 && L.gpu === 109.3
    && !FP.memOver([L.artCache, L.gpu, 999], true) && FP.memOver([L.artCache + 1, 0, 0], true) && FP.memOver([0, L.gpu + 1, 0], true) && !FP.memOver([0, null, 0], true));
  const rp = readFileSync(join(ROOT, 'src/debug/report.js'), 'utf8');
  check('23c. debug/report.js hands its count in: the report\'s three reads, the chip\'s only with no fine pointer (a phone or a tablet)',
    /try \{ useMemCount\(memCount\); \}/.test(rp) && /const g = fineInput\(\) \? null : (?:\(window\.__btGpuTex && window\.__btGpuTex\(\)\)|gpuMb\(\));/.test(rp));
  /* v2.3.6243 (card HB PR 4, the planning session's one-off yes): the chip's count may be the total alone
     (report.js gpuMb, pixiApp.js __btGpuMb: the same number as __btGpuTex().mb without its table); the gate on a
     fine pointer is held as before */
  /* v2.3.5681 (the gatekeeper's sitting 27): the count is read only while the governor judges; memory rungs wait MEM_SETTLE_MS */
  const fpSrc = readFileSync(join(ROOT, 'src/game/framePacer.js'), 'utf8');
  check('23g. the pacer reads the memory\'s count only while the governor judges (on, a lane, not switched off): a phone with it off never walks the chip\'s textures',
    /memFull: \(!gov\.judging \|\| gov\.judging\(\)\) && memFull\(ts\)/.test(fpSrc) && /judging\(\) \{ return on && lane != null && !switchedOff\(\); \}/.test(fpSrc));
  {
    _resetLanes();
    const g = makeGovernor({ on: true, store: memStore() });
    g.veil(0);
    for (let i = 0; i < 12; i++) g.verdict(0, 1000 * (i + 1), { axis: 'chip', atFloor: true, memFull: true });
    const one = g.read().mem;
    for (let i = 0; i < 4; i++) g.verdict(0, 2000 + FP.MEM_SETTLE_MS + 1000 * i, { axis: 'chip', atFloor: true, memFull: true });
    const two = g.read().mem;
    check('23h. a memory rung waits MEM_SETTLE_MS (past the 30 s deferred destroy) after the last: 12 s of a full memory take one, the next only after the wait', FP.MEM_SETTLE_MS > 30000 && one === 1 && two === 2, { one, two });
    _resetLanes();
  }
  /* 23i. v2.3.6501 (card PH PR 2): THE NODE MODEL OF A FILLING PHONE.  The game's own count read as the pacer reads
     it (every MEM_READ_MS, a verdict about every 1.4 s): the art held at what the trip reads (11 to 16 MB), the
     sound at 18, the chip's textures filling from 60 MB by 0.2 MB a second -- a crowd gathering.  The alarm must
     take the memory's rung within two verdicts of the total crossing it, and none before; today's trigger (the
     memory check's two lines, `?memalarm=0`) takes none until the chip alone passes 109.3 -- the break proof.
     v2.3.6501 (the gatekeeper's sitting 57, review-z57): the model rides THE PACER'S OWN READ, memFull, through the
     count handed in (useMemCount) and the address (`?memalarm=0` thrown, and not): it modelled memOver alone, so a
     memFull that never asked the switch, or always slept on the old lines, stayed green.
     BREAKS, tried 2026-11-24 on the test box:
       framePacer.js memFull: `memOver(m)` (the switch never asked)          -> FAIL 23i (the second)
       framePacer.js memFull: `memOver(m, true)` (the alarm asleep)         -> FAIL 23i (the first)
       framePacer.js memFull: `memOver(m, memAlarmOld())` (the address dropped; node's page has none) -> FAIL 23i (the second)
       framePacer.js memFull: `if (ts - _memAt < MEM_READ_MS) return true;` -> FAIL 23i (both) */
  {
    const ride = (old) => {
      _resetLanes();
      const g = makeGovernor({ on: true, store: memStore() });
      g.veil(0);
      let first = null, crossedAt = null, m = null;
      FP.useMemCount(() => m.slice());
      for (let t = 1400; t <= 600000; t += 1400) {
        m = [14, 60 + 0.0002 * t, 18];
        if (crossedAt == null && FP.memTotal(m) > A) crossedAt = t;
        g.verdict(0, t, { axis: 'chip', atFloor: true, memFull: FP.memFull(t, old ? '?memalarm=0' : '') });
        if (first == null && g.read().mem > 0) first = { t, total: +FP.memTotal(m).toFixed(1), chip: +m[1].toFixed(1) };
      }
      FP.useMemCount(null);
      _resetLanes();
      return { first, crossedAt };
    };
    const now = ride(false), was = ride(true);
    check('23i. a filling phone trips the alarm: the memory\'s rung within two verdicts and a read of the total crossing it, never before',
      now.first && now.crossedAt != null && now.first.t >= now.crossedAt && now.first.t - now.crossedAt <= FP.MEM_READ_MS + 3 * 1400, { now, alarm: A });
    check('23i. ...where the old trigger slept on until the chip alone passed 109.3 MB (the break proof: art 14 never reaches 79.3)',
      was.first && was.first.chip > L.gpu && was.first.total > A + 20, { was });
  }
  /* 23j. v2.3.6501 (the gatekeeper's sitting 58, review-z58): THE PAGE'S OWN ADDRESS.  23i hands memFull its address;
     the page's pacer calls memFull(ts) with none, so `memFull(ts, search = '')` (or the pacer's call as
     `memFull(ts, '')`) left `?memalarm=0` read nowhere, green in four suites.  Here the pacer itself runs, on a stand-in
     page whose address is `?memalarm=0` and then none, and the memory's word it hands the governor is read: a total
     of 131.5 MB (art 14, the chip 100, sound 17.5) is over the alarm's 120 but under both old lines.
       framePacer.js memFull: `export function memFull(ts, search = '')`   -> FAIL 23j (the switch thrown)
       framePacer.js take(): `memFull(ts, '')` in the governor's verdict      -> FAIL 23j (the switch thrown) */
  {
    const hadLoc = Object.prototype.hasOwnProperty.call(globalThis, 'location');
    const was = globalThis.location;
    const pageSays = (search) => {
      globalThis.location = { search };
      const words = [];
      const gov = { verdict: (share, ts, ctx) => { words.push(!!(ctx && ctx.memFull)); }, veil() {}, skip() {}, judging: () => true, read: () => ({}) };
      FP.useMemCount(() => [14, 100, 17.5]);
      const P = makeFramePacer({ gov });
      for (let k = 0; k < 2400; k++) P.take(k * B60);   /* 40 s of a 60 screen: verdicts every 80 frames */
      FP.useMemCount(null);
      return words;
    };
    const thrown = pageSays('?memalarm=0'), none = pageSays('');
    if (hadLoc) globalThis.location = was; else delete globalThis.location;
    check('23j. the PAGE\'S pacer reads its own address: with `?memalarm=0` the memory is never full at 131.5 MB (the old lines); without it, full (over 120)',
      thrown.length >= 10 && none.length >= 10 && thrown.every((x) => x === false) && none.slice(2).every((x) => x === true), { thrown: thrown.slice(0, 12), none: none.slice(0, 12) });
  }
  const ME = await import('../../src/rendering/maskedEvict.js');
  const DL = await import('../../src/game/drawLanes.js');
  _resetLanes();
  const cache = new Map(); for (let i = 0; i < 900; i++) cache.set('u' + i + '|x|6', i);
  const dropped = [];
  DL.setRung(0, 0, 0, 1);   /* the memory axis's first rung: the caches at half */
  ME.trimMasked(cache, 900, () => cache.keys().next().value, (o) => dropped.push(o));
  check('23d. on the memory axis\'s first rung the masked frames\' cap is half its own (450), the oldest let go', ME.maskedCap(900) === 450 && cache.size === 450 && dropped.length === 450 && dropped[0] === 0, { size: cache.size });
  let told = 0; ME.onCachesTrim(() => { told++; });
  DL.setRung(0, 0, 0, 0); DL.setRung(0, 0, 0, 1);
  check('23e. a rung taken or given back tells the caches at once (onKnob), and given back the cap is its own', told === 2 && (DL.setRung(0, 0, 0, 0), ME.maskedCap(900) === 900), { told });
  const gn = readFileSync(join(ROOT, 'src/rendering/gearNumbers.js'), 'utf8');
  check('23f. the walking armour\'s sheets and frames (gearNumbers.js) keep a share of their caps and trim when told',
    /const sheetCap = \(\) => Math\.max\(1, Math\.round\(SHEET_CAP \* _share\(\)\)\);/.test(gn) && /const frameCap = \(\) => Math\.max\(1, Math\.round\(FRAME_CAP \* _share\(\)\)\);/.test(gn)
    && /onKnob\('caches', \(\) => \{ trimSheets\(\); trimFrames\(\); \}\)/.test(gn));
  _resetLanes();
}

/* 24. v2.3.6503 (card PH PR 4): THE GOVERNOR ON A PHONE THAT HEATS WITH ITS WORK.  The review's model
   (tools/dev/plants/govsim.mjs, the shape review's item 19): §13's phone, with ONE change -- the heat is a STATE
   the phone's own work drives (less drawn, cooler), not a function of the clock -- at 60 and 120, counted from the
   frames really drawn.  Today's governor (main b966af81) see-sawed on a 60 screen 5% too slow when hot: 10 to 14
   rate changes in the second half hour; and the pacer read a hot phone's missed frames as a SLOWER SCREEN (a hot
   120 as a 60 for 68 to 90% of the hour; a hot 60 as a 30, the owner's lane `thirty`).  The mends: a try up only
   once the game's own work a frame has fallen COOL_MARGIN below the last step down's (both the ladder's and a fast
   screen's own rate), and the screen's beat held (keptBeat).  Readings: docs/plan/census/PH-phone.md. */
{
  const { COOL_MARGIN, LATE_CLEAN, cooledFrom, heatSeen, keptBeat, beatHoldOn, govCoolOn, _tabShown } = await import('../../src/game/framePacer.js');
  _resetLanes(); _liveKnobs(null); _resetClientOff(); holdLadder(false); useFrameSamples(null, null);
  const memStore = () => { let v = null; return { get: () => (v ? JSON.parse(JSON.stringify(v)) : null), set: (x) => { v = JSON.parse(JSON.stringify(x)); } }; };
  const EFFECT = { shine: [1, 0.86], shadows: [1, 0.8], water: [1, 0.9], pixels: [1, 0.78, 0.56] };   /* §13's own */
  /* base: { work, chip } ms a frame cool; hot: the factor at full heat (or hotAt(t)); tau: the heat's time to settle.
     opts: cool, beatHold (the switches), gov false (the governor off, the pacer its own), pace false (every refresh
     the phone can: no pacer, no governor) */
  /* v2.3.6507 (the gatekeeper's sitting 60): chipAt / workAt, a factor on the chip's cost alone or the work's alone
     (the scene, not the heat); after, the share at the top rate and the rate changes from that minute on */
  const heatRun = ({ b, base, hot, hotAt = null, chipAt = null, workAt = null, after = 0, tau, mins = 60, seed = 7, cool = true, beatHold = true, gov = true, pace = true }) => {
    _resetLanes(); _liveKnobs(null);
    const live = new Set(liveKnobs());
    const eff = (k, r) => (live.has(k) && EFFECT[k] ? EFFECT[k][KNOBS[k].steps.indexOf(knobAt('full', k, r))] : 1);
    const G = makeGovernor({ on: gov, store: memStore(), cool });
    const P = makeFramePacer({ gov: G, beatHold });
    const ring = [];
    useFrameSamples((fromT, fn) => { let i = ring.length; while (i > 0 && ring[i - 1].t > fromT) i--; for (let j = i; j < ring.length; j++) fn(ring[j]); return ring.length ? ring[ring.length - 1].t : fromT; }, null);
    const r = rng(seed);
    const ms = mins * 60000, nominal = base.work + base.chip, WIN = 10000, win = [];
    let T = 0, k = 0, prevT = null, prevWork = 0, lastT = 0, misMs = 0;
    while (k * b < ms) {
      const t = k * b;
      let did = 0;
      if (!pace || P.take(t, t >= 2000)) {
        if (prevT != null) { ring.push({ t, totalMs: t - prevT, workMs: prevWork }); if (ring.length > 600) ring.shift(); }
        const u = r();
        const m = (1 + ((hotAt ? hotAt(t) : hot) - 1) * T) * (u < 0.7 ? 0.85 + 0.2 * r() : u < 0.95 ? 1.05 + 0.3 * r() : 1.35 + 0.35 * r());
        const rg = ladderRung();
        const work = base.work * (workAt ? workAt(t) : 1);
        const chip = base.chip * eff('shine', rg) * eff('shadows', rg) * eff('water', rg) * eff('pixels', rg) * (chipAt ? chipAt(t) : 1);
        prevWork = work * m; prevT = t;
        k += Math.max(1, Math.ceil((work + chip) * m / b - 1e-9));
        did = work + chip;
        const w = Math.floor(t / WIN); win[w] = win[w] || { n: 0 }; win[w].n++;
      } else k += 1;
      const now = k * b, dt = now - lastT;
      T += (Math.min(1.3, (did / dt) / (nominal / b)) - T) * Math.min(1, dt / tau);
      const rd = P.read();
      if (pace && rd.refresh && Math.abs(rd.refresh - b) > 2) misMs += dt;
      lastT = now;
    }
    useFrameSamples(null, null);
    const snap = (f) => [120, 60, 40, 30, 24, 20].reduce((a, x) => (Math.abs(x - f) < Math.abs(a - f) ? x : a), 120);
    const rates = win.map((w) => snap((w ? w.n : 0) / (WIN / 1000)));
    const half = Math.floor(rates.length / 2);
    let chg2 = 0; for (let i = half + 1; i < rates.length; i++) if (rates[i] !== rates[i - 1]) chg2++;
    const top = Math.round(1000 / b);
    const shareAt = (from, to) => Math.round(100 * rates.slice(from, to).filter((x) => x === top).length / Math.max(1, rates.slice(from, to).length));
    const from = Math.floor(after / WIN);
    let chgA = 0; for (let i = from + 1; i < rates.length; i++) if (rates[i] !== rates[i - 1]) chgA++;
    const out = { hz: top, hot: hotAt ? 'turns' : hot, tauS: tau / 1000, chg2, top: shareAt(0), top2: shareAt(half), mis: Math.round(100 * misMs / ms), steps: G.read().stepsN, changes: P.read().changes,
      topA: shareAt(from), chgA, rates };
    _resetLanes();
    return out;
  };
  const B60M = { b: B60, base: { work: 5, chip: 6 } }, B120M = { b: B120, base: { work: 2.6, chip: 3.4 } };
  /* the census's runs: a 60 screen 5% too slow when hot (1.6), §13's own (2.1), very hot (3.2); a 120 screen the
     owner's (2.4: "Prefer Page Rendering Updates near 60fps" off) and §13's own (5.4); each heat settling in 3 and 10 minutes */
  const RUNS = [];
  for (const [M, hot] of [[B60M, 1.6], [B60M, 2.1], [B60M, 3.2], [B120M, 2.4], [B120M, 5.4]]) for (const tau of [180000, 600000]) RUNS.push({ ...M, hot, tau });
  const mended = RUNS.map((R) => ({ R, x: heatRun(R), free: heatRun({ ...R, gov: false, pace: false }), old: heatRun({ ...R, cool: false, beatHold: false }) }));
  if (process.env.FP_SAY) console.log(JSON.stringify(mended.map(({ x, free, old }) => ({ x, free: free.top, old: [old.chg2, old.top, old.mis] }))));
  const say = (L) => L.map(({ x }) => `${x.hz}/${x.hot}/${x.tauS}s: ${x.chg2} changes, top ${x.top}%, misread ${x.mis}%`);
  check('24a. a phone that heats with its work SETTLES: at most two rate changes in the second half hour, at 60 and 120, every heat (today\'s: 10 and 14 at 60/1.6)',
    mended.every(({ x }) => x.chg2 <= 2), say(mended));
  check('24b. ...and holds the higher rate for the share of the time its phone can: no less than drawing every refresh it can, with no pacer and no governor (3 points\' slack)',
    mended.every(({ x, free }) => x.top >= free.top - 3), mended.map(({ x, free }) => `${x.hz}/${x.hot}/${x.tauS}s: ${x.top}% (free ${free.top}%)`));
  check('24c. the pacer reads the screen it is on: a hot phone\'s missed frames are never a slower screen (misread at most 1% of the hour; today\'s up to 90%)',
    mended.every(({ x }) => x.mis <= 1), say(mended));
  /* THE BREAK PROOF, in the suite: the same phones with both switches thrown are today's governor and pacer */
  check('24d. THE BREAK PROOF: today\'s (`?govcool=0` and `?beathold=0`) fails 24a and 24c on the same phones -- the see-saw at 60/1.6 (8 or more changes), the hot 120 read as a 60',
    mended.filter(({ R }) => R.b === B60 && R.hot === 1.6).every(({ old }) => old.chg2 >= 8) && mended.filter(({ R }) => R.b === B120 && R.hot === 2.4).every(({ old }) => old.mis >= 50),
    mended.map(({ old }) => `${old.hz}/${old.hot}/${old.tauS}s: ${old.chg2} changes, misread ${old.mis}%`));
  /* COMES BACK: the margin is the work's, so a phone that cools (a fight over, the scene lighter) tries again; a cool one is never stepped */
  const back = [
    heatRun({ ...B60M, hot: 2.1, hotAt: (t) => (t < 1200000 ? 2.1 : 1.15), tau: 180000 }),
    heatRun({ ...B60M, hot: 1.6, hotAt: (t) => (t < 1200000 ? 1.6 : 1.2), tau: 600000 }),
    heatRun({ ...B120M, hot: 5.4, hotAt: (t) => (t < 1200000 ? 5.4 : 1.2), tau: 180000 }),
  ];
  check('24e. ...and COMES BACK: a phone hot for 20 minutes, then cooler, holds the higher rate most of the second half hour (60: 95%, 120: 70%)',
    back.every((x) => x.top2 >= (x.hz === 60 ? 95 : 70)), back.map((x) => `${x.hz}/${x.tauS}s: ${x.top2}% of the second half, ${x.chg2} changes`));
  const coolP = [heatRun({ ...B60M, hot: 1.2, tau: 180000 }), heatRun({ ...B120M, hot: 1.2, tau: 180000 })];
  check('24f. a cool phone: a 60 never stepped; a 120 at its edge (1.2) at 120 four fifths of the hour, its long cycle the phone\'s own heat',
    coolP[0].top === 100 && coolP[0].steps === 0 && coolP[1].top >= 80, coolP.map((x) => `${x.hz}: top ${x.top}%, ${x.chg2} changes, ${x.steps} rungs`));
  /* v2.3.6507 (the gatekeeper's sitting 60 on #2318, A BUG IN BEHAVIOUR): the margin read the game's own work, so a step
     down the CHIP caused never came back -- the probe: the suite's phone, the chip's cost x1.8 or x2.6 for minutes 5 to 15
     (a scene heavy for the chip), the work unchanged, took the rate at 304 s and was still at 30 half an hour after the
     scene went light (`?govcool=0`: 58.4).  The mend (heatSeen): the margin only where the work rose past it */
  const MINS = 60000, scene = (f) => (t) => (t >= 5 * MINS && t < 15 * MINS ? f : 1);
  const chipRuns = [];
  for (const [M, f] of [[B60M, 1.8], [B60M, 2.6], [B120M, 1.8], [B120M, 2.6]]) for (const seed of [7, 8]) chipRuns.push({ M, f, seed, x: heatRun({ ...M, hot: 1, chipAt: scene(f), tau: 180000, mins: 45, after: 17 * MINS, seed }) });
  /* ...and AT THE EDGE (heatSeen's line, the work up 17%): the chip x2.6 with the work x1.1, x1.2 and x1.3 as well */
  for (const [M, w] of [[B60M, 1.1], [B60M, 1.2], [B60M, 1.3], [B120M, 1.1], [B120M, 1.2], [B120M, 1.3]]) chipRuns.push({ M, f: `2.6+work x${w}`, seed: 9, x: heatRun({ ...M, hot: 1, chipAt: scene(2.6), workAt: scene(w), tau: 180000, mins: 45, after: 17 * MINS, seed: 9 }) });
  const sayC = (L) => L.map(({ x, f, seed }) => `${x.hz}/chip x${f}/seed ${seed}: ${x.steps} steps, ${x.changes} rate changes, top ${x.topA}% from minute 17, ${x.chgA} changes`);
  check('24k. A STEP THE CHIP CAUSED COMES BACK: the chip x1.8 or x2.6 for minutes 5 to 15, the work unchanged (or up 10 to 30%: the edge) -- stepped down, and at the top rate from minute 17 on (98%), at 60 and 120',
    chipRuns.every(({ x }) => x.steps + x.changes >= 1 && x.topA >= 98), sayC(chipRuns));
  /* the chip's step now tries on the wait alone, so the DOUBLED wait is what holds a see-saw while the chip stays hot:
     a try up and its fall back are two steps (the ladder's) or two changes (a fast screen's own rate) */
  const hotSteps = 2 * triesAllowed(10 * MINS) + 2;
  check(`24k. ...and no flutter: at most one rate change from minute 17 on (the climb back), and no see-saw while the chip is hot (the doubled wait: at most ${hotSteps} steps in all)`,
    chipRuns.every(({ x }) => x.chgA <= 1 && Math.max(x.steps, x.changes) <= hotSteps), sayC(chipRuns));
  /* a work-caused one: the same ten minutes with the WORK x1.8 (the chip's cost unchanged) -- it waits for its margin, and comes back once the work falls */
  const workRuns = [7, 8].map((seed) => heatRun({ ...B60M, hot: 1, workAt: scene(2.2), tau: 180000, mins: 45, after: 17 * MINS, seed }));
  check('24l. a step the WORK caused (the work x2.2 for minutes 5 to 15) comes back once the work falls (98% from minute 17), with no flutter',
    workRuns.every((x) => x.steps + x.changes >= 1 && x.topA >= 98 && x.chgA <= 1), workRuns.map((x) => `${x.hz}: ${x.steps} steps, top ${x.topA}% from minute 17, ${x.chgA} changes`));
  {
    /* the governor itself, verdict by verdict: samples of a known work a frame (late frames 30 ms apart) */
    const ring = [];
    let t = 0;
    useFrameSamples((fromT, fn) => { let i = ring.length; while (i > 0 && ring[i - 1].t > fromT) i--; for (let j = i; j < ring.length; j++) fn(ring[j]); return ring.length ? ring[ring.length - 1].t : fromT; }, null);
    const feed = (work, late) => { for (let i = 0; i < 80; i++) { t += late ? 30 : B60; ring.push({ t, totalMs: late ? 30 : B60, workMs: work }); if (ring.length > 600) ring.shift(); } };
    const run = (stepWork, coolWork) => {
      _resetLanes(); _liveKnobs(null); ring.length = 0; t = 0;
      const G = makeGovernor({ on: true, store: memStore(), cool: true });
      G.veil(0);
      for (let i = 0; i < 6; i++) { feed(5, false); G.verdict(0, t, { refresh: B60, every: 1, atFloor: true }); }   /* the full row's rest: 5 ms */
      for (let i = 0; i < 2; i++) { feed(stepWork, true); G.verdict(0.9, t, { refresh: B60, every: 1, atFloor: true }); }
      const down = G.read();
      const at = t;
      let upAt = null;
      while (t - at < 4 * UP_WAIT_MS && upAt == null) { feed(coolWork, false); G.verdict(0, t, { refresh: B60, every: 2, atFloor: true }); if (G.read().depth === 0) upAt = t - at; }
      return { down: down.depth, hot: down.hotWorkMs, rest: down.restWorkMs, upAt };
    };
    const chipStep = run(5.1, 5.1), workStep = run(9, 8.5), workCool = run(9, 8.2);
    check('24m. the governor: a step down whose work never rose (5 -> 5.1, the chip\'s) keeps no work to wait on, and tries up on the wait alone',
      chipStep.down > 0 && chipStep.rest === 5 && chipStep.hot === null && chipStep.upAt != null && chipStep.upAt >= UP_WAIT_MS && chipStep.upAt < UP_WAIT_MS + 2000, chipStep);
    check('24m. ...one whose work rose (5 -> 9) waits for its margin: at 8.5 never (two waits and more), at 8.2 (8% under 9) at the wait',
      workStep.down > 0 && workStep.hot === 9 && workStep.upAt === null && workCool.upAt != null && workCool.upAt < UP_WAIT_MS + 2000, { workStep, workCool });
    const edge = 5 * (1 + COOL_MARGIN) / (1 - COOL_MARGIN);
    check('24m. heatSeen: the work at the step kept only where it rose past the line (its mark a margin over the rest); unknown rest, kept; no work, none',
      heatSeen(9, 5) === 9 && heatSeen(5.1, 5) === null && heatSeen(edge, 5) === edge && heatSeen(edge - 0.01, 5) === null && heatSeen(7, null) === 7 && heatSeen(null, 5) === null);
    /* v2.3.6507: the rest is the full row's own -- read on a clean verdict (LATE_CLEAN itself clean), no rung, every
       refresh, and a work read (20 samples); never a late verdict's, a rung's, a fast screen's paced rate's; a lane's own */
    {
      _resetLanes(); _liveKnobs(null); ring.length = 0; t = 0;
      const G = makeGovernor({ on: true, store: memStore(), cool: true });
      const ctx = (every) => ({ refresh: B60, every, atFloor: true });
      const rest = () => G.read().restWorkMs;
      G.veil(0);
      feed(6, false); G.verdict(LATE_CLEAN, t, ctx(1));
      const r0 = rest();
      feed(5, false); G.verdict(0, t, ctx(1));
      const r1 = rest();
      feed(4, false); G.verdict(0, t, ctx(2));                     /* a fast screen at half its rate: not the row's */
      const r2 = rest();
      for (let i = 0; i < 10; i++) { t += B60; ring.push({ t, totalMs: B60, workMs: 1 }); }
      G.verdict(0, t, ctx(1));                                     /* ten samples: no work read */
      const r3 = rest();
      feed(4, true); G.verdict(0.9, t, ctx(1));                    /* late, and a lighter work */
      feed(4, false); G.verdict(0.1, t, ctx(1));                   /* neither late nor clean (0.1), and lighter */
      const r4 = rest();
      for (let i = 0; i < 2; i++) { feed(9, true); G.verdict(0.9, t, ctx(1)); }   /* the step down */
      const stepped = G.read().depth > 0;
      feed(3, false); G.verdict(0, t, ctx(2));                     /* a rung held: not the row's */
      const r5 = rest();
      check('24n. the rest: the clean full row\'s lowest work a frame (6, then 5), never at half the rate (4), on too few samples, late (4), or a rung held (3)',
        r0 === 6 && r1 === 5 && r2 === 5 && r3 === 5 && r4 === 5 && stepped && r5 === 5 && G.read().hotWorkMs === 9, { r0, r1, r2, r3, r4, r5, stepped });
      /* a memory rung is no heat's: it keeps no work to wait on */
      _resetLanes(); ring.length = 0;
      const M = makeGovernor({ on: true, store: memStore(), cool: true });
      M.veil(t);
      feed(5, false); M.verdict(0, t, ctx(1));
      for (let i = 0; i < 2; i++) { feed(9, false); M.verdict(0, t, { ...ctx(1), memFull: true }); }
      const mem = M.read();
      feed(3, false); M.verdict(0, t, ctx(1));                     /* a memory rung held, every refresh: not the row's */
      const memRest = M.read().restWorkMs;
      useDevClass(() => ({ hz: 30 }));
      M.veil(t + 1);
      check('24n. ...a memory rung taken keeps no work to wait on (its work 9); a rung held at every refresh reads no rest (3); a new lane (a 30 screen) starts with none',
        mem.mem > 0 && mem.hotWorkMs === null && mem.restWorkMs === 5 && memRest === 5 && M.read().lane === 'thirty' && M.read().restWorkMs === null, { mem, now: M.read() });
      _resetLanes();
    }
    useFrameSamples(null, null);
  }
  /* the rules themselves */
  check('24g. cooledFrom: a try up only COOL_MARGIN below the step down\'s work a frame; unknown on either side, yes',
    COOL_MARGIN > 0 && COOL_MARGIN < 0.2 && cooledFrom(10, 10 * (1 - COOL_MARGIN)) && !cooledFrom(10, 10 * (1 - COOL_MARGIN) + 0.01) && cooledFrom(null, 5) && cooledFrom(10, null));
  check('24h. keptBeat: a reading twice or three times the held one is missed frames (held); a faster one, the first one, or one no whole number of times it (another screen) is believed',
    keptBeat(B120, B60) === B120 && keptBeat(B120, 25) === B120 && keptBeat(B60, 33.4) === B60 && keptBeat(null, B60) === B60 && keptBeat(B60, B120) === B120
    && keptBeat(B60, 1000 / 144) === 1000 / 144 && keptBeat(1000 / 144, B60) === B60 && keptBeat(B60, 16.9) === 16.9);
  check('24i. the two off-ramps: `?beathold=0` and `?govcool=0`, each alone', beatHoldOn('') && !beatHoldOn('?beathold=0') && govCoolOn('') && !govCoolOn('?govcool=0') && beatHoldOn('?govcool=0') && govCoolOn('?beathold=0'));
  /* a tab's return reads the beat afresh: Low Power Mode is turned on in the Settings, which hides the page */
  {
    _resetLanes();
    const P = makeFramePacer({ gov: makeGovernor({ on: false, store: memStore() }) });
    let t = 0;
    for (let i = 0; i < 400; i++) { P.take(t); t += B60; }
    const was = P.read().refresh;
    for (let i = 0; i < 400; i++) { P.take(t); t += 2 * B60; }
    const held = P.read().refresh;
    const near = (a, b2) => a != null && Math.abs(a - b2) <= 0.35;
    check('24j. a 60 screen whose page then draws every second refresh is still a 60 screen (no tab hidden: missed frames)', near(was, B60) && near(held, B60), { was, held });
    _tabHid(); _tabShown(); t += 5000;
    for (let i = 0; i < 400; i++) { P.take(t); t += 2 * B60; }
    const after = P.read().refresh;
    check('24j. ...and after a tab\'s return the beat is read afresh: a screen really slowed (Low Power Mode, turned on in the Settings) is believed', near(after, 2 * B60), { after });
  }
  _resetLanes();
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
