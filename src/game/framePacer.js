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
 */

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

const CB_KEEP = 180;      /* the browser's calls the refresh is read from */
const REFRESH_EVERY = 30; /* ...and how often it is read again */

/** Is the pacer on?  The address: `pace=0` (or off, false) is the old way. */
export function framePaceOn(search) {
  return !/(^|[?&])pace=(0|off|false)(&|$)/.test(typeof search === 'string' ? search : '');
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
export function makeFramePacer() {
  const gaps = new Float64Array(CB_KEEP);
  let gapN = 0, gapAt = 0, calls = 0;
  let last = null, lastRun = null;
  let refresh = null, every = 1, most = 1;
  let runs = 0, lates = 0, bad = 0;
  let trial = false, wasUp = false, changedAt = 0, upWait = UP_WAIT_MS, changes = 0;
  let lastShare = null;
  const clearJudge = () => { runs = 0; lates = 0; };
  const change = (n, ts) => { if (n !== every) { every = n; changedAt = ts; changes++; } clearJudge(); };
  /* a step down.  One that follows a step UP means the faster rate did not
     hold (at once, or a few seconds on): the next try waits twice as long */
  const down = (ts) => {
    if (wasUp) { upWait = Math.min(UP_WAIT_MAX_MS, upWait * 2); wasUp = false; }
    trial = false; bad = 0;
    change(Math.min(most, every + 1), ts);
  };
  const verdict = (ts) => {
    const share = lates / runs;
    lastShare = share;
    clearJudge();
    if (share > LATE_DOWN) {
      /* a try up is judged on its first verdict; the rate it settled on, on two running */
      if (trial) down(ts);
      else if (++bad >= DOWN_VERDICTS) { bad = 0; if (every < most) down(ts); }
      return;
    }
    bad = 0; trial = false;
    /* the faster rate has held a whole wait: the device has really come back, so the waits start afresh */
    if (wasUp && ts - changedAt >= upWait) { wasUp = false; upWait = UP_WAIT_MS; }
    if (share <= LATE_CLEAN && every > 1 && ts - changedAt >= upWait) { trial = true; wasUp = true; change(every - 1, ts); }
  };
  return {
    take(ts, judge = true) {
      if (last == null) { last = ts; lastRun = ts; return true; }
      const gap = ts - last;
      last = ts;
      if (!(gap > 0) || gap > PACE_BREAK_MS) { clearJudge(); lastRun = ts; return true; }
      gaps[gapAt] = gap;
      gapAt = (gapAt + 1) % CB_KEEP;
      if (gapN < CB_KEEP) gapN++;
      if (refresh == null || ++calls % REFRESH_EVERY === 0) {
        const r = refreshOf(gapN < CB_KEEP ? gaps.subarray(0, gapN) : gaps);
        if (r != null) refresh = r;
      }
      if (refresh == null || refresh >= PACE_FAST_MS) {
        /* not a fast screen (or not known yet): every refresh, as ever */
        if (every !== 1) { trial = false; wasUp = false; bad = 0; change(1, ts); }
        most = 1;
        lastRun = ts;
        return true;
      }
      most = Math.max(1, Math.floor((PACE_FLOOR_MS + 0.5) / refresh));
      if (every > most) change(most, ts);
      const frame = every * refresh;
      if (every > 1 && ts - lastRun < frame - refresh / 2) return false;
      const ran = ts - lastRun;
      lastRun = ts;
      if (!judge) { clearJudge(); return true; }
      runs++;
      if (ran > frame + refresh / 2) lates++;
      if (runs >= JUDGE_RUNS) verdict(ts);
      return true;
    },
    /* the frame meter's line, and the tests' */
    read() {
      return { refresh, every, most, trial, upWait, changes, lateShare: lastShare,
        hz: refresh ? Math.round(1000 / refresh) : null, rate: refresh ? Math.round(1000 / (refresh * every)) : null };
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
