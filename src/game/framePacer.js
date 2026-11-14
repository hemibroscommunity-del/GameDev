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
import { AXES, AXIS_NAMES, KNOB_NAMES, knobAt, drawLane, ladderRung, setRung, rungDepth } from './drawLanes.js';

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

/** v2.3.5222: THE ONE RULE of a late frame, on every screen (120, 60, 30):
 *  a frame drawn every `every` refreshes is late past this many ms --
 *  more than half a refresh past its frame.  The pacer judges by it; the
 *  report's `late` (debug/report.js) and the governor's split read it here,
 *  never a copy. */
export function lateOver(refresh, every) {
  return (every || 1) * refresh + refresh / 2;
}

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
export function makeFramePacer(opts) {
  /* v2.3.5222: the governor (opts: the tests' { gov } in place of the page's own) */
  const gov = (opts && opts.gov) || makeGovernor();
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
    if (share <= LATE_CLEAN && every > 1 && ts - changedAt >= upWait) { trial = true; wasUp = true; change(every - 1, ts); }
  };
  const verdict = (ts) => {
    const share = lates / runs;
    lastShare = share;
    clearJudge();
    const was = changes;
    rateVerdict(share, ts);
    /* v2.3.5222: then the ladder, on the same verdict (THE GOVERNOR): it
       steps down only once this screen's own rate is at its floor, and never
       on a verdict the rate itself stepped on (one step a verdict) */
    gov.verdict(share, ts, { refresh, every, atFloor: every >= most, rateMoved: changes !== was });
  };
  return {
    take(ts, judge = true) {
      /* v2.3.5222: a veil (a loading screen; a tab's return): where the
         governor may move pixels, and keeps its rung for the lane */
      if (!judge) gov.veil(ts);
      else if (_returned) { _returned = false; gov.veil(ts); }
      if (last == null) { last = ts; lastRun = ts; return true; }
      const gap = ts - last;
      last = ts;
      if (!(gap > 0) || gap > PACE_BREAK_MS) { clearJudge(); gov.skip(); lastRun = ts; return true; }
      gaps[gapAt] = gap;
      gapAt = (gapAt + 1) % CB_KEEP;
      if (gapN < CB_KEEP) gapN++;
      if (refresh == null || ++calls % REFRESH_EVERY === 0) {
        const r = refreshOf(gapN < CB_KEEP ? gaps.subarray(0, gapN) : gaps);
        if (r != null) refresh = r;
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
           (one verdict, every screen: the governor's) */
        if (every !== 1) { trial = false; wasUp = false; bad = 0; change(1, ts); }
        most = 1;
      } else {
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
 * a lane's row, on two axes).  One state machine, one table; the governor
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

/** Does the governor move the ladder on this page?  `govern=0` no, `govern=1`
 *  yes; else not where the address names a lane (a test's page), else yes. */
export function governOn(search) {
  const s = typeof search === 'string' ? search : '';
  const m = /(?:^|[?&])govern=([01])(?:&|$)/.exec(s);
  if (m) return m[1] === '1';
  return !/(?:^|[?&])lane=/.test(s);
}

/* the frame meter's samples, handed in (perfTracker.js): each(fromT, fn)
   walks the samples recorded after fromT and returns the newest's time;
   busyIn the busy beat's (`?perf=1`), or none */
let _samples = null, _busyIn = null;
/** debug/perfTracker.js hands its ring here: no import into the pacer. */
export function useFrameSamples(each, busyIn) {
  _samples = typeof each === 'function' ? each : null;
  _busyIn = typeof busyIn === 'function' ? busyIn : null;
}

/* the Speed test holds the ladder still while it runs (game/speedTest.js) */
let _held = false;
/** game/speedTest.js: hold the ladder still (true), or let it go (false). */
export function holdLadder(on) { _held = !!on; }

/* a tab's return is a veil: hidden, then shown again */
let _wasHidden = false, _returned = false;
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
  try {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') _wasHidden = true;
      else if (_wasHidden) { _wasHidden = false; _returned = true; }
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

function _search() {
  try { return (typeof location !== 'undefined' && location.search) || ''; } catch (e) { return ''; }
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
  const on = o.on !== undefined ? !!o.on : governOn(_search());
  const store = o.store !== undefined ? o.store : _pageStore();
  let lane = null;              /* the lane its rung is kept for; null: none loaded yet (a veil loads it) */
  let bad = 0, trial = false, wasUp = false, changedAt = 0, upWait = UP_WAIT_MS;
  let stack = [];               /* the axes stepped down, in order: a try up undoes the last */
  let pending = null;           /* a step that moves the pixels, waiting for a veil: { axis, dir } */
  let fromT = -Infinity;        /* the samples already judged */
  let lastAxis = null, lastSplit = null;
  const steps = [];             /* the last STEPS_KEPT steps, for the strip: { t, axis, dir, knobs, work, chip } */
  let stepsN = 0;

  const vec = (r) => KNOB_NAMES.map((k) => knobAt(lane || drawLane(), k, r));
  const same = (a, b) => a.every((v, i) => v === b[i]);
  const movesPixels = (a, b) => knobAt(lane || drawLane(), 'pixels', a) !== knobAt(lane || drawLane(), 'pixels', b);
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
    try { const all = store.get() || {}; const r = ladderRung(); all[lane] = [r.work, r.chip]; store.set(all); } catch (e) { /* this sitting only */ }
  };
  const apply = (to, axis, dir, ts) => {
    const before = vec(ladderRung());
    setRung(to.work, to.chip);
    const after = vec(ladderRung());
    const knobs = KNOB_NAMES.filter((k, i) => before[i] !== after[i]);
    if (dir < 0) stack.push(axis);
    else { const i = stack.lastIndexOf(axis); if (i >= 0) stack.splice(i, 1); }
    steps.push({ t: ts, axis, dir, knobs, work: to.work, chip: to.chip });
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
    if (!veil && movesPixels(ladderRung(), to)) { pending = { axis, dir }; return 'pending'; }
    apply(to, axis, dir, ts);
    return true;
  };
  /* a step down, as the pacer's own: one that follows a step UP means the
     faster rung did not hold (at once, or a few verdicts on), so the next try
     waits twice as long -- the doubling that keeps a hot phone from see-sawing */
  const down = (axis, ts) => {
    trial = false; bad = 0;
    const done = step(axis, -1, ts, false);
    if (done && wasUp) { upWait = Math.min(UP_WAIT_MAX_MS, upWait * 2); wasUp = false; }
    return done;
  };
  /* the lane's kept rung, loaded (at a veil: it may move the pixels) */
  const load = (L, ts) => {
    lane = L;
    let w = 0, c = 0;
    try { const all = store && store.get(); const v = all && all[L]; if (Array.isArray(v)) { w = v[0]; c = v[1]; } } catch (e) { w = 0; c = 0; }
    setRung(w, c);
    const r = ladderRung();
    stack = [];
    for (let i = 0; i < r.work; i++) stack.push('work');
    for (let i = 0; i < r.chip; i++) stack.push('chip');
    pending = null; bad = 0; trial = false; wasUp = false; upWait = UP_WAIT_MS; changedAt = ts;
  };
  /* the axis the late frames' time says, or null (no samples handed in) */
  const axisNow = (refresh, every) => {
    if (!_samples || !refresh) return null;
    const list = [];
    let newest = fromT;
    try { newest = _samples(fromT, (x) => { list.push(x); }); } catch (e) { return null; }
    if (typeof newest === 'number') fromT = newest;
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
        if (L !== lane) { load(L, ts); return; }
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
    verdict(share, ts, ctx) {
      const c = ctx || {};
      if (!on || lane == null) return;
      if (_held) { bad = 0; return; }
      let axis = c.axis !== undefined ? c.axis : axisNow(c.refresh, c.every);
      if (axis) lastAxis = axis;
      /* a full memory (card O PR 11's count): a bad verdict whose step is
         the work axis's, never the chip's -- it frees, never resizes -- and
         no try up while it lasts */
      const mem = !!c.memFull;
      if (mem) axis = 'work';
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
        if (mem) { down('work', ts); return; }
        if (!c.atFloor || c.rateMoved) return;   /* the screen's own rate first: one step a verdict */
        const first = axis || lastAxis || 'chip';
        const other = first === 'work' ? 'chip' : 'work';
        if (!down(first, ts)) down(other, ts);
        return;
      }
      bad = 0; trial = false;
      if (pending && pending.dir < 0) pending = null;
      if (wasUp && ts - changedAt >= upWait) { wasUp = false; upWait = UP_WAIT_MS; }
      if (c.rateMoved || share > LATE_CLEAN || rungDepth() === 0 || pending || ts - changedAt < upWait) return;
      const back = stack.length ? stack[stack.length - 1] : (ladderRung().chip > 0 ? 'chip' : 'work');
      const done = step(back, +1, ts, false);
      if (done === true) { trial = true; wasUp = true; }
    },
    /** The strip, the report and QA. */
    read() {
      const r = ladderRung();
      return { on, held: _held, lane, work: r.work, chip: r.chip, depth: rungDepth(), pending: pending ? { ...pending } : null,
        trial, upWait, bad, steps: steps.slice(), stepsN, axis: lastAxis, split: lastSplit };
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
