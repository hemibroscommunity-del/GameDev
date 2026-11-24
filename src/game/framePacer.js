/* ═══ v2.3.4400: A STEADY RATE ON A SCREEN THE GAME CANNOT KEEP UP WITH ═══
 *
 * The owner, 2026-11-10, an iPhone 14 Pro Max with Safari's "Prefer Page
 * Rendering Updates near 60fps" turned off (so the page is offered the
 * screen's own 120 a second), twenty-four minutes into a session: "Still
 * performance issues", the frame meter reading
 *
 *     fps ~51   frame avg 19.6 p95 26.0 max 32.0 ms
 *     work 6.8 (sim 0.8 / render 6.0)   outside 12.8 ms
 *
 * where the ride before it, the phone cool, read "fps ~106  frame avg 9.5".
 * The phone could no longer finish a frame inside one refresh (8.3 ms), nor
 * always inside two: its frames were shown for two refreshes, then three,
 * then two, then four -- 16.7, 25, 16.7, 33 ms.  The steady step
 * (frameClock.js) moves you the same distance every frame; shown for
 * unequal times that is an unequal SPEED on the glass, frame to frame, which
 * the eye reads as grit however high the average.  A steady 60, or a steady
 * 40, is smoother than an uneven 51, and it is less work, so a hot phone
 * cools instead of being driven harder.
 *
 * THE RULE.  On a FAST screen only (one that refreshes more often than
 * every PACE_FAST_MS: 90, 120, 144 a second -- an Android phone, a gaming
 * laptop, a ProMotion iPhone with that flag off), the game draws on every
 * refresh while it keeps up.  When more than LATE_DOWN of its frames come a
 * refresh or more late, on two verdicts running (about three seconds), it
 * draws on every SECOND refresh instead, and then every third: an exact
 * whole number of refreshes a frame, so every frame is on the glass for the
 * same time.  Never slower than PACE_FLOOR_MS a frame (about 40 a second):
 * a 60-a-second screen -- every iPhone as Safari ships, most computers -- is
 * never paced at all, its only whole step down being 30.  After UP_WAIT_MS
 * of clean frames it tries one step faster; a try that fails goes straight
 * back and waits twice as long before the next (to UP_WAIT_MAX_MS), so a
 * phone that is simply too hot is not shaken every few seconds.
 *
 * It reads the screen's rate from the times the browser calls it (its
 * animation frame's own timestamp, which is the refresh's, not the moment
 * the code got to run).  A page that cannot keep up never SEES a single
 * refresh, only twos and threes; the smallest gap between those is the
 * refresh (refreshOf).  A gap past PACE_BREAK_MS is a hidden tab or a
 * freeze: drawn at once, not judged.  Nothing is judged behind a loading
 * screen (`judge` false): that is not the frame rate the play will have.
 *
 * `?pace=0` in the address is the old way for one tab: every refresh the
 * browser offers.  The QA box draws a few frames a second, so it is never a
 * fast screen and every phone test runs as before.  No imports: node tests
 * it (server/test/frame-pacer.test.mjs).
 *
 * v2.3.5222 (card O PR 2, the grand plan's 2.3): THE GOVERNOR IS THE PACER,
 * GROWN -- see THE GOVERNOR below.  It imports one leaf, ./drawLanes.js (the
 * lanes' table, itself import-free), and node still tests it.
 */
import { AXES, AXIS_NAMES, knobAt, knobSeen, drawLane, ladderRung, setRung, rungDepth, laneKnob, liveKnobs, ladderRateOn as laneRateOn } from './drawLanes.js';
import { readerFor, sw, swValue } from './switches.js';   /* v2.3.5232 (card O PR 12): the off-ramps through the page's one reader */
import { clientOff } from './clientOff.js';   /* v2.3.5235: the owner's switch for every phone (`govern`): a leaf with no imports */

/* a refresh shorter than this is a fast screen (over about 70 a second) */
export const PACE_FAST_MS = 14;
/* never paced to a frame longer than this (about 40 a second) */
export const PACE_FLOOR_MS = 26;
/* a gap this long is a break, not a frame */
export const PACE_BREAK_MS = 100;
/* how many drawn frames a verdict is made from */
export const JUDGE_RUNS = 80;
/* this share of them late: a bad verdict; two running, a step down */
export const LATE_DOWN = 0.25;
export const DOWN_VERDICTS = 2;
/* at most this share late: clean enough to try a step up */
export const LATE_CLEAN = 0.05;
/* clean for this long before a try up; doubled by each try that fails */
export const UP_WAIT_MS = 20000;
export const UP_WAIT_MAX_MS = 320000;

/* v2.3.6503 (card PH PR 4): a try up waits until the game's own work a frame
   has fallen this share below what it was at the last step down (THE
   GOVERNOR, below: COOLED BY A MARGIN) */
export const COOL_MARGIN = 0.08;

/** v2.3.6503: has the phone cooled by the margin since it was too slow?  `hot`
 *  the game's own work a frame (ms) at the step down, `now` the last
 *  verdict's; either unknown (null), yes.  Pure.
 *  v2.3.6507 (the gatekeeper's sitting 60): `hot` is null too where the work
 *  never rose (heatSeen): a step the CHIP caused is the wait's alone. */
export function cooledFrom(hot, now) {
  return hot == null || now == null || now <= hot * (1 - COOL_MARGIN);
}

/** v2.3.6507 (the gatekeeper's sitting 60 on #2318): the work a frame a step
 *  down waits on, or null -- the wait alone.  `w` the game's own work a frame
 *  at the step, `rest` the coolest the full row ever read (a clean verdict,
 *  every refresh, no rung; null unknown).  The margin is kept only where the
 *  work ROSE past it: where its mark (COOL_MARGIN under `w`) is still a margin
 *  over `rest`, so a cooled phone's own scatter (a verdict's mean, about 2%
 *  either way; `rest` the lowest of them) reaches it.  The first cut, "the
 *  mark at or over the rest", left a 120 phone at 60 for 23 minutes: a step
 *  read 2.79 ms over a rest of 2.56 (scatter, the work unchanged), a mark of
 *  2.567 that a cool phone read once in many minutes.
 *  A step the CHIP caused (the work unchanged, the chip's cost up: a scene
 *  heavy for the chip) left the work where it was, so "the work fell 8%" never
 *  came: the gatekeeper's probe (the chip x1.8 and x2.6 for minutes 5 to 15)
 *  took the rate at 304 s and was still at 30 half an hour after the scene
 *  went light.  The chip's cost cannot be read below its rate (its frames are
 *  all in time), so such a step waits on the doubled wait, as before PR 4.
 *  No edge to flutter on: a work just past the line waits for a mark a
 *  margin over the rest, just short of it the doubled wait.  Pure. */
export function heatSeen(w, rest) {
  if (w == null) return null;
  return rest == null || w * (1 - COOL_MARGIN) >= rest * (1 + COOL_MARGIN) ? w : null;
}

const CB_KEEP = 180;      /* the browser's calls the refresh is read from */
const REFRESH_EVERY = 30; /* ...and how often it is read again */

/** v2.3.5222: THE ONE RULE of a late frame, on every screen (120, 60, 30):
 *  a frame drawn every `every` refreshes is late past this many ms --
 *  more than half a refresh past its frame.  The pacer judges by it; the
 *  report's `late` (debug/report.js) and the governor's split read it here,
 *  never a copy. */
export function lateOver(refresh, every) {
  return (every || 1) * refresh + refresh / 2;
}

/** v2.3.5224: does the ladder move the rate (card O PR 4)?  `ladderrate=0`
 *  in the address: the rate as before it, whatever the rung. */
export function ladderRateOn(search) {
  /* v2.3.5225: read in drawLanes.js, where it also takes the rate's rungs out of the governor's reach */
  return laneRateOn(search);
}

/** Is the pacer on?  The address: `pace=0` (or off, false) is the old way. */
export function framePaceOn(search) {
  return !(typeof search === 'string' ? readerFor(search).sw('pace') : sw('pace'));   /* v2.3.5232: the page's one reader */
}

/** v2.3.6503 (card PH PR 4): `?beathold=0` -- the screen's beat read afresh
 *  every time, a slower reading believed (the reading before card PH). */
export function beatHoldOn(search) {
  return !(typeof search === 'string' ? readerFor(search).sw('beathold') : sw('beathold'));
}

/** v2.3.6503 (card PH PR 4): THE SCREEN'S BEAT IS HELD.  `held` the refresh
 *  in hand (ms, or null), `r` a new reading: what the pacer keeps.  A
 *  reading a whole number of times SLOWER than the one in hand (twice, three
 *  times) is the phone missing frames, not a slower screen: a hot 120 phone
 *  whose every frame takes two refreshes is called every 16.7 ms, and its
 *  gaps cannot be told from a 60 screen's.  The heat model (frame-pacer.test
 *  §24; docs/plan/census/PH-phone.md) read a hot 120 as a 60 for 68 to 90%
 *  of an hour, and a 60 phone drawing 45 read as a 30 screen is the owner's
 *  lane `thirty` with Low Power Mode off (2026-11-24: "Low power mode was not
 *  on during test").  A faster reading, the same one, or one no whole
 *  number of times the held (a window moved to another screen) is
 *  believed; a tab's return reads the beat afresh (Low Power Mode is turned
 *  on in the Settings, which hides the page).  Pure. */
export function keptBeat(held, r) {
  if (held == null || !(r > held + 0.5)) return r;
  const k = r / held;
  if (Math.round(k) >= 2 && Math.abs(k - Math.round(k)) <= 0.2) return held;
  return r;
}

/** The screen's refresh, in ms, from the gaps between the browser's calls
 *  (ms each), or null when there are too few to say.  The gaps bunch at
 *  whole numbers of refreshes; the lowest bunch is one refresh -- unless the
 *  page never made a single one, when the bunches stand a refresh APART (a
 *  120 screen kept up with at 16.7 and 25: 8.3 between them). */
export function refreshOf(gaps) {
  const v = [];
  for (const g of gaps) if (g > 2 && g <= PACE_BREAK_MS) v.push(g);
  if (v.length < 20) return null;
  v.sort((a, b) => a - b);
  /* bunches: gaps within 2 ms of their bunch's mean */
  const bunches = [];
  let cur = null;
  for (const g of v) {
    if (cur && g - cur.sum / cur.n <= 2) { cur.sum += g; cur.n++; }
    else { cur = { sum: g, n: 1 }; bunches.push(cur); }
  }
  const need = Math.max(3, v.length * 0.04);
  const kept = bunches.filter((b) => b.n >= need).map((b) => b.sum / b.n);
  if (!kept.length) return null;
  const low = kept[0];
  let apart = Infinity;
  for (let i = 1; i < kept.length; i++) apart = Math.min(apart, kept[i] - kept[i - 1]);
  let r = low;
  if (apart >= 4 && apart < low - 2) {
    const k = low / apart;
    if (Math.abs(k - Math.round(k)) <= 0.2) r = apart;
  }
  /* every bunch a whole number of refreshes, or this is not a screen's beat
     at all (a clock that wobbles, a page called off its frame): nothing is
     said, and nothing is paced on a guess */
  for (const m of kept) { const k = m / r; if (k < 0.8 || Math.abs(k - Math.round(k)) > 0.2) return null; }
  return r;
}

/**
 * A pacer for one game loop.  take(ts, judge) is called in EVERY animation
 * frame with its timestamp: true, draw this one; false, not this refresh.
 * `judge` false while a loading screen is up.
 */
export function makeFramePacer(opts) {
  /* v2.3.5222: the governor (opts: the tests' { gov } in place of the page's own) */
  const gov = (opts && opts.gov) || makeGovernor();
  /* ═══ v2.3.5224: THE RATE IS A KNOB (card O PR 4; docs/LANES.md `rate`) ═══
     On a screen of 60 or slower, the slowest frame the pacer holds a steady
     rate at is the lane's knob at its rung, read through the lanes' one
     reader: the row's 26 ms (PACE_FLOOR_MS, `full`'s) is every refresh, as
     ever; the rung's 34 ms is a whole number of refreshes on a 60 screen,
     every second one -- a steady 30 -- and on a 30 screen still every one
     (no rung).  ON A FAST SCREEN (90, 120, 144) NOTHING CHANGES: the
     pacer's own steps, down to about 40 a second (PACE_FLOOR_MS), whatever
     the lane or the rung -- the planning session's (a), 2026-11-14: a rate
     rung for fast screens would be a decision of its own, not an accident.
     Read again where the rung or the lane can change: after the governor's
     verdict and at a veil.  `?ladderrate=0` is the rate as before (opts:
     the tests' { rateOn }). */
  const rateOn = opts && opts.rateOn !== undefined ? !!opts.rateOn : ladderRateOn();
  /* v2.3.6503: the screen's beat held (keptBeat; opts: the tests' { beatHold }) */
  const beatHold = opts && opts.beatHold !== undefined ? !!opts.beatHold : beatHoldOn();
  let rateAt = PACE_FLOOR_MS;
  const readRate = () => {
    try { const a = laneKnob('rate'); rateAt = typeof a === 'number' && a > 0 ? a : PACE_FLOOR_MS; } catch (e) { rateAt = PACE_FLOOR_MS; }
  };
  readRate();
  const gaps = new Float64Array(CB_KEEP);
  let gapN = 0, gapAt = 0, calls = 0;
  let last = null, lastRun = null;
  let refresh = null, every = 1, most = 1;
  let runs = 0, lates = 0, bad = 0;
  let trial = false, wasUp = false, changedAt = 0, upWait = UP_WAIT_MS, changes = 0;
  let lastShare = null;
  let hotRate = null;   /* v2.3.6503: the game's work a frame at the rate's last step down (cooledFrom) */
  const heat = () => { try { return gov.heat ? gov.heat() : null; } catch (e) { return null; } };
  const clearJudge = () => { runs = 0; lates = 0; };
  const change = (n, ts) => { if (n !== every) { every = n; changedAt = ts; changes++; } clearJudge(); };
  /* a step down.  One that follows a step UP means the faster rate did not
     hold (at once, or a few seconds on): the next try waits twice as long */
  const down = (ts) => {
    if (wasUp) { upWait = Math.min(UP_WAIT_MAX_MS, upWait * 2); wasUp = false; }
    trial = false; bad = 0;
    const w = heat(); if (w != null) hotRate = gov.heatSeen ? gov.heatSeen(w) : w;   /* v2.3.6503; v2.3.6507: null where the work never rose (the chip's step) */
    change(Math.min(most, every + 1), ts);
  };
  /* the rate's own steps: a fast screen's alone (most is 1 on any other, so
     nothing here moves there), as before v2.3.5222 */
  const rateVerdict = (share, ts) => {
    if (share > LATE_DOWN) {
      /* a try up is judged on its first verdict; the rate it settled on, on two running */
      if (trial) down(ts);
      else if (++bad >= DOWN_VERDICTS) { bad = 0; if (every < most) down(ts); }
      return;
    }
    bad = 0; trial = false;
    /* the faster rate has held a whole wait: the device has really come back, so the waits start afresh */
    if (wasUp && ts - changedAt >= upWait) { wasUp = false; upWait = UP_WAIT_MS; }
    if (every <= 1) hotRate = null;
    /* v2.3.6503 (card PH PR 4): COOLED BY A MARGIN, as the governor's (below): a fast screen's own rate too */
    if (share <= LATE_CLEAN && every > 1 && ts - changedAt >= upWait && cooledFrom(hotRate, heat())) { trial = true; wasUp = true; change(every - 1, ts); }
  };
  const verdict = (ts) => {
    const share = lates / runs;
    lastShare = share;
    clearJudge();
    const was = changes;
    /* v2.3.5224: the rate's own steps are a fast screen's alone; any other's
       rate is the knob's (take(), below) */
    if (refresh != null && refresh < PACE_FAST_MS) rateVerdict(share, ts);
    else { bad = 0; trial = false; }
    /* v2.3.5222: then the ladder, on the same verdict (THE GOVERNOR): it
       steps down only once this screen's own rate is at its floor, and never
       on a verdict the rate itself stepped on (one step a verdict) */
    gov.verdict(share, ts, { refresh, every, atFloor: every >= most, rateMoved: changes !== was, memFull: (!gov.judging || gov.judging()) && memFull(ts) });   /* v2.3.5231: the memory's count (card O PR 11); v2.3.5681 read only while the governor judges */
    readRate();   /* v2.3.5224: the rung may have moved the rate */
  };
  return {
    take(ts, judge = true) {
      /* v2.3.5222: a veil (a loading screen; a tab's return): where the
         governor may move pixels, and keeps its rung for the lane */
      if (!judge) { gov.veil(ts); readRate(); }
      else if (_returned) {
        _returned = false; gov.veil(ts); readRate();
        /* v2.3.6503: a tab's return reads the screen's beat afresh (keptBeat) */
        if (beatHold) { refresh = null; gapN = 0; gapAt = 0; }
      }
      if (last == null) { last = ts; lastRun = ts; return true; }
      const gap = ts - last;
      last = ts;
      if (!(gap > 0) || gap > PACE_BREAK_MS) { clearJudge(); gov.skip(); lastRun = ts; return true; }
      gaps[gapAt] = gap;
      gapAt = (gapAt + 1) % CB_KEEP;
      if (gapN < CB_KEEP) gapN++;
      if (refresh == null || ++calls % REFRESH_EVERY === 0) {
        const r = refreshOf(gapN < CB_KEEP ? gaps.subarray(0, gapN) : gaps);
        if (r != null) refresh = beatHold ? keptBeat(refresh, r) : r;   /* v2.3.6503: held */
      }
      if (refresh == null) {
        /* the screen's rate not known yet: every refresh, as ever, and nothing judged */
        if (every !== 1) { trial = false; wasUp = false; bad = 0; change(1, ts); }
        most = 1;
        lastRun = ts;
        clearJudge();
        return true;
      }
      if (refresh >= PACE_FAST_MS) {
        /* not a fast screen: every refresh, as ever -- but v2.3.5222, JUDGED
           (one verdict, every screen: the governor's); v2.3.5224, the rate's
           knob at its rung: a whole number of refreshes (a 60 screen's rung,
           every second one: a steady 30) */
        const want = rateOn ? Math.max(1, Math.floor((rateAt + 0.5) / refresh)) : 1;
        if (every !== want) { trial = false; wasUp = false; bad = 0; change(want, ts); }
        most = want;
      } else {
        /* a fast screen: its own steps as before, whatever the lane or the rung (v2.3.5224, (a)) */
        most = Math.max(1, Math.floor((PACE_FLOOR_MS + 0.5) / refresh));
        if (every > most) change(most, ts);
      }
      const frame = every * refresh;
      if (every > 1 && ts - lastRun < frame - refresh / 2) return false;
      const ran = ts - lastRun;
      lastRun = ts;
      if (!judge) { clearJudge(); gov.skip(); return true; }
      runs++;
      if (ran > lateOver(refresh, every)) lates++;
      if (runs >= JUDGE_RUNS) verdict(ts);
      return true;
    },
    /* the frame meter's line, and the tests' */
    read() {
      return { refresh, every, most, trial, upWait, changes, lateShare: lastShare,
        hz: refresh ? Math.round(1000 / refresh) : null, rate: refresh ? Math.round(1000 / (refresh * every)) : null,
        /* v2.3.5222: the governor's, for the strip, the report and QA -- a
           getter: the loop reads `read().every` every frame (BroTown.jsx),
           and builds nothing of the ladder's for it */
        get ladder() { return gov.read(); } };
    },
  };
}

/* ═══ v2.3.5222: THE GOVERNOR -- THE PACER, GROWN (card O PR 2; the grand plan's 2.3) ═══
 *
 * A hot phone was met one fix at a time; nothing in the game lowered a
 * quality, a cap or a crowd because frames were late, and the pacer gave a
 * verdict only on a screen faster than 70 a second.  Now the pacer judges on
 * EVERY screen whose refresh it knows (120, 60, 30), by one rule (lateOver),
 * and the same verdict moves the LADDER (game/drawLanes.js: the rungs below
 * a lane's row, on two axes; v2.3.5225 three, the pixels their own).  One state machine, one table; the governor
 * alone writes the rung (drawLanes.js setRung).  It MOVES NO KNOB YET: each
 * knob reads laneKnob in its own PR (card O's 4 to 13), and until then the
 * rung shows only on the strip, in the report and to QA.
 *
 *   THE AXIS.  Of the late frames' time since the last verdict, from the
 *     samples the frame meter already keeps (debug/perfTracker.js hands them
 *     here: useFrameSamples): the game's own work (`workMs`, sim to app)
 *     against the rest -- or, where the busy beat runs (`?perf=1`), against
 *     the time the page WAITED (the busy part is neither's: lowering the
 *     crowd or the pixels does not shorten it).  The more of it: work -> the
 *     work axis's next rung (the crowd, then the rate); waiting -> the
 *     chip's (the rate, then the shine, the shadows, the water, the pixels).
 *     Nothing new is timed and nothing is measured inside the frame.
 *   DOWN AND UP, as the pacer: two bad verdicts running (over LATE_DOWN of
 *     JUDGE_RUNS frames late), a step down; clean (LATE_CLEAN) for
 *     UP_WAIT_MS, a try up, undoing the last step down; a try that fails
 *     goes back down and doubles the wait, to UP_WAIT_MAX_MS.  One rung of
 *     one axis a step (a rung the other axis already holds -- the rate's --
 *     is passed through to the next).  On a fast screen the pacer's own
 *     rate steps first: the ladder steps down only once that rate is at its
 *     floor, and never on a verdict the rate stepped on.
 *   COOLED BY A MARGIN (v2.3.6503, card PH PR 4): a try up -- the ladder's,
 *     and a fast screen's own rate's -- waits, past the wait, until the
 *     game's own work a frame (the samples' `workMs`, the verdict's mean: a
 *     hot phone's CPU slows with its chip) is COOL_MARGIN below what it was
 *     at the last step down.  In the heat model (frame-pacer.test §24) a 60
 *     phone 5% too slow when hot cooled enough at 30 to pass the clean wait,
 *     tried 60, held it a minute as it heated and fell back: 10 to 14 rate
 *     changes a half hour.  Now none, and a phone that cools (a fight over)
 *     is back at once.  No work read (no samples), or `?govcool=0`: the wait
 *     alone, as before.  v2.3.6507 (the gatekeeper's sitting 60): only a
 *     step whose work ROSE waits on the margin (heatSeen, against the full
 *     row's rest); a step the CHIP caused, the work unchanged, waits on the
 *     doubled wait alone -- the margin had nothing to see fall, and a 60
 *     phone stayed at 30 half an hour after its scene went light.
 *   THE SCREEN'S BEAT IS HELD (v2.3.6503): see keptBeat -- a hot phone's
 *     missed frames are no slower screen (the lane `thirty`, the strip's hz).
 *   PIXELS ONLY BEHIND A VEIL: a step that would change the pixels (a live
 *     resize rebuilds the crowd's shared picture, the worst moment) waits
 *     for a loading screen (`judge` false) or a tab's return; a clean
 *     verdict meanwhile drops a wanted step down, a bad one a wanted step up.
 *     A window covering the world is not one: no one field says so (the
 *     phase table's `window` row is todo; card O's status file).
 *   A FULL MEMORY (memFull; its count is card O's PR 11) takes the work
 *     axis's next rung, never the chip's: it frees, never resizes.
 *   KEPT: the rung is the device's, not the zone's: kept by lane in
 *     localStorage (a convenience: every read and write in a try, and the
 *     page right without it), loaded at a veil, so the next sitting starts
 *     where the last settled and tries up as above.
 *   OFF IN THE TEST BOX: with `?lane=` in the address the ladder holds
 *     still (the lane's row), unless `?govern=1`; `?govern=0` turns it off
 *     on one phone.  The Speed test holds it still while it runs
 *     (holdLadder): two controllers of the same knobs would fight.
 *   COMBAT AND LOADING are never on the ladder (drawLanes.js; its guard).
 *
 * It runs inside the loop's one take(ts, judge) call: no loop of its own and
 * no step of the frame; its verdict comes once in JUDGE_RUNS frames and
 * walks at most a verdict's samples.
 */
export const LADDER_KEY = 'bt_rung';
const STEPS_KEPT = 8;

/** v2.3.6503 (card PH PR 4): `?govcool=0` -- a try up as before, on the wait
 *  alone (COOL_MARGIN not asked). */
export function govCoolOn(search) {
  return !(typeof search === 'string' ? readerFor(search).sw('govcool') : sw('govcool'));
}

/** Does the governor move the ladder on this page?  `govern=0` no, `govern=1`
 *  yes; else not where the address names a lane (a test's page), else yes. */
export function governOn(search) {
  /* v2.3.5232 (card O PR 12): through the page's one reader; `?lane` in
     the address at all holds the ladder (`?lane=` did, as before; a bare
     `?lane`, which the old test let through, now holds it too: the reader
     cannot tell the two apart) */
  const r = typeof search === 'string' ? readerFor(search) : { swValue };
  const g = r.swValue('govern');
  if (g === '0' || g === '1') return g === '1';
  return r.swValue('lane') === null;
}

/* the frame meter's samples, handed in (perfTracker.js): each(fromT, fn)
   walks the samples recorded after fromT and returns the newest's time;
   busyIn the busy beat's (`?perf=1`), or none */
let _samples = null, _busyIn = null;
/* ═══ v2.3.5231 (card O PR 11): THE MEMORY'S VERDICT ═══
   The game's own count -- the report's `mem` [art from files, the chip's
   textures, decoded sound] in MB, handed in (useMemCount: debug/report.js;
   no import into the pacer).  The planner's, 2026-11-17: the chip's count
   only where deviceProfile.js says a phone or a tablet (a computer's
   screen-sized pictures are no fault: the counter hands in no chip count
   there).  Read at most every MEM_READ_MS.

   v2.3.6501 (card PH PR 2; the shape review's item 17): THE ALARM HAS A
   TRIGGER OF ITS OWN.  It was two of the memory check's lines, copied
   (MEM_LINES: art 79.3, chip 109.3; frame-pacer.test 23a held them equal):
   art read 11 to 16 MB in play, so its half could never fire, and the
   chip's fired only some 27 MB over the trip's peak.  Now ONE number, the
   game's own TOTAL -- art + the chip's (a phone or a tablet) + sound -- over
   MEM_ALARM.MB, set just above what the game reads in a crowded fight
   (DECIDED FOR THE OWNER WHILE AWAY, not the owner's yes: call 3 of
   docs/plan/finish.md part 9 went unanswered, and the planning session set
   it on 2026-11-23; if the owner answers, their words win.  The readings:
   docs/plan/census/PH-phone.md).  The memory check's lines are no longer
   its business (card PH's PR 3 lowers them to the readings).  `?govern=0`
   stops it as before (the count is read only while the governor judges).
   THE OFF-RAMP `?memalarm=0`: the two old lines, frozen as they were
   (MEM_LINES_OLD), on this phone. */
/* READ: the game's own total at its highest, ON THE TEST BOX (2026-11-23): mp-membudget 106.4 (the third trip, home
   again); a 10-bot fight at the Flame Fields 104.9 (the chip 75.7, art 11.7, sound 17.5); 30 bots could not be read
   there (the page stopped answering).  MB: 13% over it, half an iPhone's ~250 MB page, and 21 MB before the old
   trigger could fire.  Decided for the owner while away (call 3; the planning session, 2026-11-23, tag 5058):
   `?memalarm=0` the old lines.  The phone's own count waits on the field report's (card PH PR 1). */
export const MEM_ALARM = Object.freeze({ READ: 106.4, MB: 120 });
export const MEM_LINES_OLD = Object.freeze({ artCache: 79.3, gpu: 109.3 });   /* v2.3.6501: the old trigger, frozen (v2.3.5981, v2.3.6202: the memory check's lines then) */
export const MEM_READ_MS = 5000;
/* v2.3.5681 (the gatekeeper's sitting 27): the wait between memory rungs,
   past the masked frames' 30 s deferred destroy (maskedEvict.js) */
export const MEM_SETTLE_MS = 35000;
let _memCount = null, _memAt = -Infinity, _memWas = false, _memTotal = null, _memForce = 0;
/** debug/report.js hands its count here: fn() -> [tex, gpu or null, snd] MB. */
export function useMemCount(fn) { _memCount = typeof fn === 'function' ? fn : null; _memAt = -Infinity; }
/** v2.3.6501: the game's own total, MB: art + the chip's (where handed in) + sound; null for no count. */
export function memTotal(m) {
  if (!Array.isArray(m)) return null;
  const n = (v) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0);
  return n(m[0]) + n(m[1]) + n(m[2]);
}
/** Is the game's memory over its alarm?  [tex, gpu, snd].  v2.3.6501: the
 *  total over MEM_ALARM.MB; with `old` (`?memalarm=0`) the two frozen lines
 *  as before (a null gpu not judged, the sound never). */
export function memOver(m, old) {
  if (!Array.isArray(m)) return false;
  if (old) return m[0] > MEM_LINES_OLD.artCache || (m[1] != null && m[1] > MEM_LINES_OLD.gpu);
  return memTotal(m) > MEM_ALARM.MB;
}
/** v2.3.6501: `?memalarm=0` -- the old two lines on this phone. */
export function memAlarmOld(search) {
  return !!(typeof search === 'string' ? readerFor(search).sw('memalarm') : sw('memalarm'));
}
/** Is the memory full, read as the governor reads it (at most every
 *  MEM_READ_MS, through the count handed in)?  v2.3.6501 (the gatekeeper's
 *  sitting 57): exported, and `search` (an address, as framePaceOn's) stands
 *  for the page's own, so node runs THIS read with `?memalarm=0` thrown and
 *  not (frame-pacer.test 23i): a memFull that never asked the switch, or
 *  always slept on the old lines, was green before. */
export function memFull(ts, search) {
  if (!_memCount) return false;
  if (ts - _memAt < MEM_READ_MS) return _memWas;
  _memAt = ts;
  try {
    const m = _memCount();
    if (Array.isArray(m) && _memForce > 0) m[0] = (Number(m[0]) || 0) + _memForce;   /* QA only: __btMemAlarm.force */
    _memTotal = memTotal(m);
    _memWas = memOver(m, memAlarmOld(search));
  } catch (e) { _memWas = false; }
  return _memWas;
}
/* QA: the alarm, the last total read, and a forced addition to the count
   (mp-memalarm: the total pushed over the line frees the caches) */
if (typeof window !== 'undefined') {
  window.__btMemAlarm = (opt) => {
    if (opt && typeof opt.force === 'number') { _memForce = Math.max(0, opt.force); _memAt = -Infinity; }
    return { mb: MEM_ALARM.MB, old: memAlarmOld(), total: _memTotal, over: _memWas, force: _memForce };
  };
}

/** debug/perfTracker.js hands its ring here: no import into the pacer. */
export function useFrameSamples(each, busyIn) {
  _samples = typeof each === 'function' ? each : null;
  _busyIn = typeof busyIn === 'function' ? busyIn : null;
}

/* the Speed test holds the ladder still while it runs (game/speedTest.js) */
let _held = false;
/** game/speedTest.js: hold the ladder still (true), or let it go (false). */
export function holdLadder(on) { _held = !!on; }

/* a tab's return is a veil: hidden, then shown again.  v2.3.5225 (the
   gatekeeper's sitting 12): every hide is counted -- a pixel step wanted
   before it is dropped, not taken at the return however long the tab was
   away (_tabHid, the tests') */
let _wasHidden = false, _returned = false, _hides = 0;
/** The tab hid (the page's listener; the tests'). */
export function _tabHid() { _wasHidden = true; _hides++; }
/** v2.3.6503: the tab shown again (the page's listener; the tests'): a veil, and the screen's beat read afresh. */
export function _tabShown() { if (_wasHidden) { _wasHidden = false; _returned = true; } }
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
  try {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') _tabHid();
      else _tabShown();
    });
  } catch (e) { /* no veil from a tab's return: the loading screen's still is one */ }
}

/** The late frames' split, from samples (each: { t, totalMs, workMs }) since
 *  the last verdict: { late, work, chip }.  Late by lateOver; `chip` the
 *  time outside the game's frame -- the time the page WAITED where busyIn
 *  can say (the busy beat), else all of it.  Pure but for busyIn (the
 *  model's, and the page's). */
export function lateSplit(samples, lateMs, busyIn) {
  let late = 0, work = 0, chip = 0;
  let prev = null;
  for (const x of samples) {
    const total = (x && x.totalMs) || 0;
    if (total > lateMs && total <= PACE_BREAK_MS) {
      late++;
      const w = Math.max(0, Math.min(total, x.workMs || 0));
      const outside = total - w;
      let wait = outside;
      if (busyIn) {
        const start = x.t - w;
        const b = busyIn(start - total, start, prev ? [[prev.t - (prev.workMs || 0), prev.t]] : null);
        if (b != null) wait = Math.max(0, outside - Math.min(outside, b));
      }
      work += w; chip += wait;
    }
    prev = x;
  }
  return { late, work, chip };
}

/* the kept rungs, by lane: { full: [work, chip], ... } (a convenience) */
function _pageStore() {
  return {
    get() { try { const v = typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem(LADDER_KEY) || 'null') : null; return v && typeof v === 'object' ? v : null; } catch (e) { return null; } },
    set(v) { try { if (typeof localStorage !== 'undefined') localStorage.setItem(LADDER_KEY, JSON.stringify(v)); } catch (e) { /* this sitting only */ } },
  };
}

/**
 * The governor: one per pacer.  opts (the tests'): { on, store } in place of
 * the address's switch and localStorage.
 */
export function makeGovernor(opts) {
  const o = opts || {};
  const on = o.on !== undefined ? !!o.on : governOn();
  const store = o.store !== undefined ? o.store : _pageStore();
  /* v2.3.6503 (card PH PR 4): COOLED BY A MARGIN (`?govcool=0` the try up as before; opts: the tests' { cool }) */
  const coolOn = o.cool !== undefined ? !!o.cool : govCoolOn();
  let workNow = null;           /* the game's own work a frame (ms), the mean of the last verdict's samples; null: too few */
  let hotWork = null;           /* ...at the last step down on a late verdict: a try up waits for COOL_MARGIN below it */
  let restWork = null;          /* v2.3.6507: the coolest work a frame the full row read (heatSeen); null: none yet */
  let lane = null;              /* the lane its rung is kept for; null: none loaded yet (a veil loads it) */
  let bad = 0, trial = false, wasUp = false, changedAt = 0, upWait = UP_WAIT_MS;
  let memAt = -Infinity;        /* v2.3.5681: the last memory rung taken (MEM_SETTLE_MS) */
  let stack = [];               /* the axes stepped down, in order: a try up undoes the last */
  let pending = null;           /* a step that moves the pixels, waiting for a veil: { axis, dir, hides } */
  let fromT = -Infinity;        /* the samples already judged */
  let lastAxis = null, lastSplit = null;
  const steps = [];             /* the last STEPS_KEPT steps, for the strip: { t, axis, dir, knobs, work, chip, pixels } */
  let stepsN = 0;

  /* v2.3.5224: the LIVE knobs only (drawLanes.js liveKnobs: those a PR
     reads through laneKnob) -- a rung that changes no knob anything reads is
     passed, going down and coming back (the gatekeeper's sitting 11) */
  /* v2.3.5226 (the gatekeeper's sitting 15): what the SCREEN sees of each
     value (drawLanes.js knobSeen: a crowd cap at or above the players near
     is the players near), so a rung that changes nothing drawn is passed */
  const vec = (r) => liveKnobs().map((k) => knobSeen(k, knobAt(lane || drawLane(), k, r)));
  const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
  const movesPixels = (a, b) => liveKnobs().includes('pixels') && knobAt(lane || drawLane(), 'pixels', a) !== knobAt(lane || drawLane(), 'pixels', b);
  /* the live set, as a word: a rung kept under another (a knob moved since,
     or the governor's first version, which counted every knob) is not
     loaded -- its rungs meant something else */
  const liveKey = () => liveKnobs().join(',');
  /* the shallowest rung that changes the same: the rungs past an axis's last
     live change are let go (rungDepth's count, and a try up that has
     something to undo) */
  const trim = (r) => {
    const t = { work: r.work | 0, chip: r.chip | 0, pixels: r.pixels | 0, mem: r.mem | 0 };   /* v2.3.5231: the memory's axis */
    for (const a of AXIS_NAMES) while (t[a] > 0 && same(vec(t), vec({ ...t, [a]: t[a] - 1 }))) t[a]--;
    return t;
  };
  /* the rung one effective step from `r` on `axis` (down: dir -1, a rung
     more; up: dir +1, a rung less), passing rungs that change nothing; null:
     none that changes anything */
  const next = (r, axis, dir) => {
    const before = vec(r);
    let n = r[axis];
    for (;;) {
      n += dir < 0 ? 1 : -1;
      if (n < 0 || n > AXES[axis].length) return null;
      const to = { ...r, [axis]: n };
      if (!same(before, vec(to))) return to;
    }
  };
  const save = () => {
    if (!store || !lane) return;
    try { const all = store.get() || {}; const r = ladderRung(); all[lane] = [r.work, r.chip, r.pixels, liveKey()]; store.set(all); } catch (e) { /* this sitting only */ }
  };
  const apply = (to, axis, dir, ts) => {
    const before = vec(ladderRung());
    const t = trim(to);
    setRung(t.work, t.chip, t.pixels, t.mem);
    const after = vec(ladderRung());
    const knobs = liveKnobs().filter((k, i) => before[i] !== after[i]);
    if (dir < 0) stack.push(axis);
    else { const i = stack.lastIndexOf(axis); if (i >= 0) stack.splice(i, 1); }
    steps.push({ t: ts, axis, dir, knobs, work: t.work, chip: t.chip, pixels: t.pixels, mem: t.mem });
    if (steps.length > STEPS_KEPT) steps.shift();
    stepsN++;
    changedAt = ts;
    save();
  };
  /* one step on `axis` (dir -1 down, +1 up), at a veil or not: a step that
     moves the pixels in play waits for the next veil */
  const step = (axis, dir, ts, veil) => {
    const to = next(ladderRung(), axis, dir);
    if (!to) return false;
    if (!veil && movesPixels(ladderRung(), to)) { pending = { axis, dir, hides: _hides }; return 'pending'; }
    apply(to, axis, dir, ts);
    return true;
  };
  /* a step down, as the pacer's own: one that follows a step UP means the
     faster rung did not hold (at once, or a few verdicts on), so the next try
     waits twice as long -- the doubling that keeps a hot phone from see-sawing */
  const down = (axis, ts) => {
    trial = false; bad = 0;
    const done = step(axis, -1, ts, false);
    /* v2.3.6503: the work a frame where it was too slow (a memory rung is no heat's) */
    if (done && axis !== 'mem' && workNow != null) hotWork = heatSeen(workNow, restWork);   /* v2.3.6507: null where the work never rose (the chip's step) */
    if (done && wasUp) { upWait = Math.min(UP_WAIT_MAX_MS, upWait * 2); wasUp = false; }
    return done;
  };
  /* the lane's kept rung, loaded (at a veil).  v2.3.5224: only a rung kept
     under today's live knobs (a kept rung from before is the row), and
     trimmed to what it changes; v2.3.5225, without its pixel rungs */
  /* v2.3.5229: the chip axis's rungs a kept rung may hold: through the
     rate's last rung (data: AXES.chip), never a pass's */
  const CHIP_KEPT = (() => { let n = 0; AXES.chip.forEach((r, i) => { if (r.knob === 'rate') n = i + 1; }); return n; })();
  const load = (L, ts) => {
    lane = L;
    let w = 0, c = 0;
    /* v2.3.5225: kept as [work, chip, pixels, live set]; a rung kept as two axes is not loaded */
    try { const all = store && store.get(); const v = all && all[L]; if (Array.isArray(v) && v.length === 4 && v[3] === liveKey()) { w = v[0]; c = v[1]; } } catch (e) { w = 0; c = 0; }
    /* v2.3.5225 (the planning session's (A), 2026-11-14): a kept rung loads
       WITHOUT its pixel rungs -- the rate and the passes kept.  A pixel rung
       moves only behind a veil, both ways, so a kept one would hold a cool
       phone on a softer picture (and 30) until its next loading screen or
       tab's return: in the Wheel, a whole sitting, for the last sitting's
       heat.  If the phone is still hot, the pixels are taken again at the
       next veil.  The card's "the next sitting starts there", for pixels
       only.  (The pixels are an axis of their own: the kept pixel count is
       not read at all.)
       v2.3.5229: (A) REVISED (the planning session, 2026-11-14, card O PR 9):
       a kept rung keeps THE RATE ONLY on the chip axis -- its passes (the
       shine, the shadows, still water: the chip axis's rungs after the
       rate) start drawn, as its pixels do.  A rung is an axis's first n and
       comes back last-taken first, so a kept chip 4 gave back three passes,
       one 20 s try each, before its rate: a cool 60 phone at 30 for ~85 s
       after a hot sitting (sitting 11's hold, live rungs this time).  Still
       hot, the passes are taken again within the sitting (~2 s a step
       down).  §19c holds as written. */
    const t = trim({ work: Math.max(0, Math.min(AXES.work.length, Math.floor(Number(w) || 0))), chip: Math.max(0, Math.min(CHIP_KEPT, Math.floor(Number(c) || 0))), pixels: 0, mem: 0 });   /* v2.3.5231: a memory rung is the sitting's own, never kept */
    setRung(t.work, t.chip, t.pixels, 0);
    const r = ladderRung();
    stack = [];
    if (r.work > 0) stack.push('work');
    if (r.chip > 0) stack.push('chip');
    pending = null; bad = 0; trial = false; wasUp = false; upWait = UP_WAIT_MS; changedAt = ts; hotWork = null; restWork = null;
  };
  /* v2.3.5235: THE OWNER'S SWITCH (clientOff 'govern': the Test panel's
     list, every phone, live, no deploy -- the planning session's word in
     place of the card's cap `ladder`).  Off: back to the lane's row and no
     step.  At once, but a pixel rung (and with it the rest of its axis)
     waits for a veil, as every pixel step does; the row is kept for the
     next sitting. */
  const switchedOff = () => { try { return clientOff('govern'); } catch (e) { return false; } };
  const rest = (ts, veil) => {
    pending = null; bad = 0; trial = false; wasUp = false; upWait = UP_WAIT_MS; hotWork = null;
    const r = ladderRung();
    const row = { work: 0, chip: 0, pixels: 0, mem: 0 };
    if (r.work === 0 && r.chip === 0 && r.pixels === 0 && !(r.mem > 0)) return;
    /* v2.3.5225: the pixels are an axis of their own -- the work's and the chip's at once, the pixels' at a veil */
    const to = veil || !movesPixels(r, row) ? row : { work: 0, chip: 0, pixels: r.pixels, mem: 0 };
    if (to.work === r.work && to.chip === r.chip && to.pixels === r.pixels && to.mem === (r.mem | 0)) return;
    apply(to, to.chip !== r.chip ? 'chip' : to.work !== r.work ? 'work' : to.mem !== (r.mem | 0) ? 'mem' : 'pixels', +1, ts);
    stack = ladderRung().pixels > 0 ? ['pixels'] : [];
  };
  /* the axis the late frames' time says, or null (no samples handed in) */
  const axisNow = (refresh, every) => {
    if (!_samples || !refresh) return null;
    const list = [];
    let newest = fromT;
    try { newest = _samples(fromT, (x) => { list.push(x); }); } catch (e) { return null; }
    if (typeof newest === 'number') fromT = newest;
    /* v2.3.6503: the game's own work a frame, the heat's one reading (a hot phone's CPU slows with its chip) */
    if (list.length >= 20) { let w = 0; for (const x of list) w += (x && x.workMs) || 0; workNow = w / list.length; } else workNow = null;
    const sp = lateSplit(list, lateOver(refresh, every), _busyIn);
    lastSplit = sp;
    if (!sp.late) return null;
    return sp.work > sp.chip ? 'work' : 'chip';
  };

  return {
    /** A veil (a loading screen, a tab's return): the lane's kept rung is
     *  loaded if the lane is new, and a step that waited for one is taken. */
    veil(ts) {
      if (!on) return;
      try {
        const L = drawLane();
        if (L !== lane) { load(L, ts); if (switchedOff()) rest(ts, true); return; }
        if (switchedOff()) { rest(ts, true); return; }   /* v2.3.5235: the owner's switch */
        /* v2.3.5225: a step wanted before the tab hid is dropped, not taken (the gatekeeper's sitting 12) */
        if (pending && pending.hides !== _hides) pending = null;
        if (pending && !_held) { const p = pending; pending = null; step(p.axis, p.dir, ts, true); }
      } catch (e) { /* the ladder stands */ }
    },
    /** Frames not judged (a break, behind a loading screen): their samples are not the play's. */
    skip() {
      if (!on || !_samples) return;
      try { const n = _samples(Infinity, () => {}); if (typeof n === 'number') fromT = n; } catch (e) { /* the next verdict reads them */ }
    },
    /** The pacer's verdict: `share` of the frames late.  ctx: { refresh,
     *  every, atFloor (the screen's own rate can go no lower), rateMoved
     *  (the rate stepped on this verdict), memFull, axis (the tests') }. */
    /** v2.3.5681: is it judging at all (on, a lane loaded, not switched off)?
     *  The pacer reads the memory's count only then. */
    judging() { return on && lane != null && !switchedOff(); },
    /** v2.3.6503: the game's own work a frame at the last verdict (ms), the
     *  pacer's reading of the heat for its own rate's tries; null unknown,
     *  or `?govcool=0`. */
    heat() { return coolOn && on ? workNow : null; },
    /** v2.3.6507: the work a frame a step down of the screen's own rate
     *  waits on (heatSeen against the full row's rest): null, the wait alone. */
    heatSeen(w) { return heatSeen(w, restWork); },
    verdict(share, ts, ctx) {
      const c = ctx || {};
      if (!on || lane == null) return;
      if (switchedOff()) { rest(ts, false); return; }   /* v2.3.5235: the owner's switch: the row, no step */
      if (_held) { bad = 0; return; }
      let axis = c.axis !== undefined ? c.axis : axisNow(c.refresh, c.every);
      if (axis) lastAxis = axis;
      /* a full memory (card O PR 11's count): a bad verdict whose step is
         the memory's own axis (v2.3.5231: caches, then the crowd), never
         the chip's -- it frees, never resizes -- and no try up while it lasts */
      const mem = !!c.memFull;
      if (mem) axis = 'mem';
      if (share > LATE_DOWN || mem) {
        if (pending && pending.dir > 0) pending = null;
        if (trial) {
          /* the try up did not hold: back down the axis it tried at once (judged on its first verdict) */
          const back = steps.length ? steps[steps.length - 1].axis : (axis || 'chip');
          down(back, ts);
          return;
        }
        if (++bad < DOWN_VERDICTS) return;
        bad = 0;
        if (mem) {
          /* v2.3.5681 (the gatekeeper's sitting 27): a rung's frames are let go
             30 s on (maskedEvict.js), so the count shows a trim only then: the
             next memory rung waits MEM_SETTLE_MS, never stepping past what the
             last one frees */
          if (ts - memAt < MEM_SETTLE_MS) return;
          if (down('mem', ts)) memAt = ts;
          return;
        }
        if (!c.atFloor || c.rateMoved) return;   /* the screen's own rate first: one step a verdict */
        /* v2.3.5225 (the gatekeeper's sitting 12): the axes in the order the
           late frames' split says -- the chip's, then the pixels' (behind a
           veil), then the work's; the work's, then the chip's, and NEVER the
           pixels: a phone whose own work is the cost is not helped by fewer
           pixels (the crowd's rungs are not live until card O's PR 6, and a
           work-bound phone fell to the pixel rungs) */
        /* v2.3.5229 (the gatekeeper's sitting 17, a verified medium on #1850):
           the work's axis ALONE for a phone whose own work is the cost.  With
           the passes live on the chip axis, ['work', 'chip'] took a work-bound
           phone still late at 30 on to the shine, the shadows and still water,
           which save it no work, and it came back 66 s later (4 tries up).
           The grand plan's 2.3: work, the crowd and the rate; the chip, the
           passes and the pixels -- the chip's axis only on the chip's verdict
           (the rate is on both axes, so a work-bound phone still reaches it) */
        const first = axis || lastAxis || 'chip';
        const order = first === 'work' ? ['work'] : ['chip', 'pixels', 'work'];
        for (const a of order) if (down(a, ts)) break;
        return;
      }
      bad = 0; trial = false;
      if (pending && pending.dir < 0) pending = null;
      if (wasUp && ts - changedAt >= upWait) { wasUp = false; upWait = UP_WAIT_MS; }
      if (rungDepth() === 0) hotWork = null;
      /* v2.3.6507: the full row's rest -- a clean verdict, no rung, every refresh (a fast screen's own rate up) */
      if (share <= LATE_CLEAN && rungDepth() === 0 && (c.every == null || c.every === 1) && workNow != null) restWork = restWork == null ? workNow : Math.min(restWork, workNow);
      if (c.rateMoved || share > LATE_CLEAN || rungDepth() === 0 || ts - changedAt < upWait) return;
      /* v2.3.6503 (card PH PR 4): COOLED BY A MARGIN -- a try up only once the
         game's own work a frame has fallen COOL_MARGIN below what it was at
         the last step down.  The heat model (frame-pacer.test §24): a 60
         phone 5% too slow when hot cooled enough at 30 to pass the clean
         wait, tried 60, held it a minute while it heated, and fell back --
         10 to 14 rate changes a half hour, the doubled wait undone each time
         the faster rate held a whole wait.  Where no samples are handed in
         (no work read), or with `?govcool=0`, the try up is as before */
      if (coolOn && !cooledFrom(hotWork, workNow)) return;
      /* the axis to try: the last stepped down that has a rung to undo, else
         whichever has (the chip's first).  v2.3.5225: THE PIXELS LAST -- a
         pixel try up waits for its veil, so every other axis comes back
         first, in play: the rate before the pixels (the gatekeeper's sitting
         12; before, a cooled phone sat at 30 until its next veil) */
      const r = ladderRung();
      let back = null;
      for (let i = stack.length - 1; i >= 0 && !back; i--) if (stack[i] !== 'pixels' && r[stack[i]] > 0) back = stack[i];
      if (!back) back = r.chip > 0 ? 'chip' : r.work > 0 ? 'work' : r.mem > 0 ? 'mem' : r.pixels > 0 ? 'pixels' : null;
      if (!back || (pending && pending.axis === back)) return;   /* the pixels' try waits for its veil */
      const done = step(back, +1, ts, false);
      if (done === true) { trial = true; wasUp = true; }
    },
    /** The strip, the report and QA. */
    read() {
      const r = ladderRung();
      return { on, off: switchedOff(), held: _held, lane, work: r.work, chip: r.chip, pixels: r.pixels, mem: r.mem | 0, depth: rungDepth(), pending: pending ? { ...pending } : null,
        trial, upWait, bad, steps: steps.slice(), stepsN, axis: lastAxis, split: lastSplit,
        workMs: workNow == null ? null : +workNow.toFixed(2), hotWorkMs: hotWork == null ? null : +hotWork.toFixed(2), restWorkMs: restWork == null ? null : +restWork.toFixed(2) };   /* v2.3.6503; v2.3.6507 the rest */
    },
  };
}

/* ═══ v2.3.4400: WHOEVER READS THE CANVAS READS A REFRESH THE GAME DREW ═══
   A WebGL canvas keeps its picture only until it is shown: on a refresh the
   pacer passes, the canvas READS as empty.  The black-screen watchdog
   (BroTown.jsx _sampleLit) samples "in an animation frame after the
   world's", which was every frame until there was a pacer; on a passed
   refresh it read 0% lit, counted a strike, and two strikes rebuild the
   renderer -- found by mp-steadypace run straight after another scenario
   (a rebuilt game mid-ride: the board gone, a fresh pacer), its page saying
   "watchdog-dark screen 0% lit, strike 1".
   So the loop says which refresh it drew in (noteDrawn, the animation
   frame's own timestamp: every callback of one frame is handed the same),
   and a reader asks for one (whenDrawn).  A loop that draws nothing at all
   for WHEN_DRAWN_TRIES frames is not pacing (it passes five refreshes at
   the most): the reader is called anyway, as it always was, and reads the
   dark screen the watchdog exists to find. */
export const WHEN_DRAWN_TRIES = 12;
let _drawnAt = null;
/** The game loop: this animation frame (its timestamp) is one it draws in. */
export function noteDrawn(ts) { _drawnAt = ts; }
/** Call fn in an animation frame the game has drawn in, after its draw:
 *  the next one that is.  `raf` for tests. */
export function whenDrawn(fn, raf) {
  const ask = raf || ((cb) => requestAnimationFrame(cb));
  let tries = WHEN_DRAWN_TRIES;
  const again = (ts) => {
    if (ts === _drawnAt || --tries <= 0) { fn(); return; }
    ask(again);
  };
  ask(again);
}

/* ═══ v2.3.4470: A READ THAT WAITS FOR THE GRAPHICS CHIP IS TAKEN BEFORE THE FRAME IS DRAWN ═══
   The black-screen watchdog collects a 32 x 18 copy of the canvas a few
   frames after asking for it (BroTown.jsx _wdThumbCollect).  The collect is
   one of the few calls that makes the page WAIT -- for the graphics side to
   work through everything the page has sent it -- and it ran in an animation
   frame AFTER the world's, so what it waited for was the whole frame just
   sent: the sweep (mp-heldsweep) found it the second-longest hold in the
   game on the QA box, 110 to 206 ms each, 18 of them on one tour.  Taken at
   the TOP of the next frame, before that frame's drawing is sent, a chip
   that keeps up (any phone's) has nothing left to work through.  (The QA
   box's chip is software and does NOT keep up: there the collect waits as
   long at the top of the frame, 83 to 165 ms -- this move cannot be proved
   on it, and the screen check stays on the sweep's debt list.)  The loop
   runs these first (runBeforeDraw); one not run within `lateMs` (a loop that
   has stopped) runs by itself, as it always did. */
const _before = [];
/** Run `fn` once at the top of the game loop's next animation frame, before
 *  anything of that frame is drawn. */
export function beforeDraw(fn, lateMs = 500) {
  const job = { fn, t: 0 };
  job.t = setTimeout(() => { const i = _before.indexOf(job); if (i >= 0) { _before.splice(i, 1); try { fn(); } catch (e) { /* its own */ } } }, lateMs);
  _before.push(job);
}
/** The game loop, first thing in its animation frame. */
export function runBeforeDraw() {
  if (!_before.length) return;
  const list = _before.splice(0);
  for (const job of list) { clearTimeout(job.t); try { job.fn(); } catch (e) { /* its own */ } }
}
