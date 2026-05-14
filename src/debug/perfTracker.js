/**
 * Per-frame performance tracker that surfaces what the FPS HUD averages
 * away: individual long frames ("freezes") and which sub-stage of the
 * frame they came from.
 *
 *   bt-perf / bt-frame-split / bt-render-split write to console only —
 *   on mobile the user can't see those, so freezes are invisible.  This
 *   module captures the same data into ring buffers that the Debug
 *   overlay's Perf tab renders as a chart + tables.
 *
 *   Cheap on hot path: each record() is one array slot write and a few
 *   numeric updates.  No emit / no React re-render.  The Perf panel
 *   pulls snapshots on its own ~4 Hz timer while it's mounted.
 *
 *   Long-task observation uses the PerformanceObserver API where
 *   available (Chromium-based, including mobile Chrome / iOS 17+ Safari).
 *   It surfaces ANY main-thread task > 50 ms, including ones outside our
 *   RAF callback — useful for catching React commits, asset decodes,
 *   GC pauses, third-party script bursts, etc.
 */

const RING_SIZE = 600;            // ~10 s @ 60 fps
const LONG_FRAME_BUFFER = 60;
const LONG_TASK_BUFFER = 80;
const LONG_FRAME_THRESHOLD_MS = 30;
const FREEZE_THRESHOLD_MS = 100;

const ring = new Array(RING_SIZE);
let ringIdx = 0;
let ringCount = 0;

const longFrames = [];
const longTasks = [];
const extEvents = [];      // Slow non-RAF events: ws handler, custom timers.
const EXT_BUFFER = 60;

const makeZoneStats = (zoneId, t) => ({
  zone: zoneId,
  startT: t,
  totalFrames: 0,
  slowFrames: 0,
  freezeFrames: 0,
  maxMs: 0,
  sumMs: 0,
});

let zoneStats = makeZoneStats('?', 0);

/* Throttled spike log so the user's existing console copy-paste
   workflow surfaces stage attribution without needing to open the
   Perf tab.  Fires at most every 500 ms on the worst frame seen in
   that window when totalMs > LONG_FRAME_THRESHOLD_MS. */
let spikeLastT = 0;
let spikeWorst = null;

let longTaskObserver = null;
const initLongTaskObserver = () => {
  if (longTaskObserver) return;
  if (typeof PerformanceObserver === 'undefined') return;
  try {
    const supports = PerformanceObserver.supportedEntryTypes || [];
    if (!supports.includes('longtask')) return;
    longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        longTasks.push({
          t: entry.startTime,
          durationMs: entry.duration,
          name: entry.name || 'task',
        });
        if (longTasks.length > LONG_TASK_BUFFER) longTasks.shift();
      }
    });
    longTaskObserver.observe({ entryTypes: ['longtask'] });
  } catch {
    longTaskObserver = null;
  }
};

/* Wrap setInterval / setTimeout globally so we can time the actual
 * callbacks they fire.  When a callback takes > 5 ms we push an
 * extEvent tagged 'setInterval(<period>ms)' or 'setTimeout(<delay>ms)'.
 * That gives direct attribution for the rhythmic between-RAF stutter
 * captured in v2.1.65 (every long frame was "outside" the RAF) when
 * WS handler instrumentation in v2.1.66 came up clean — the next
 * most likely cause is one of the dashboard's 200-1000 ms force-re-
 * render setIntervals doing a heavy React commit. */
let timersHooked = false;
const initTimerHooks = () => {
  if (timersHooked) return;
  if (typeof window === 'undefined') return;
  timersHooked = true;
  const origSetInterval = window.setInterval;
  const origSetTimeout = window.setTimeout;
  window.setInterval = function (fn, period) {
    const rest = Array.prototype.slice.call(arguments, 2);
    const wrapped = function () {
      const t0 = performance.now();
      try { return fn.apply(this, arguments); }
      finally {
        const dt = performance.now() - t0;
        if (dt > 5) {
          extEvents.push({ t: t0, name: 'setInterval(' + (period | 0) + 'ms)', ms: dt });
          if (extEvents.length > EXT_BUFFER) extEvents.shift();
        }
      }
    };
    return origSetInterval.apply(this, [wrapped, period].concat(rest));
  };
  window.setTimeout = function (fn, delay) {
    if (typeof fn !== 'function') {
      return origSetTimeout.apply(this, arguments);
    }
    const rest = Array.prototype.slice.call(arguments, 2);
    const wrapped = function () {
      const t0 = performance.now();
      try { return fn.apply(this, arguments); }
      finally {
        const dt = performance.now() - t0;
        if (dt > 10) {
          extEvents.push({ t: t0, name: 'setTimeout(' + (delay | 0) + 'ms)', ms: dt });
          if (extEvents.length > EXT_BUFFER) extEvents.shift();
        }
      }
    };
    return origSetTimeout.apply(this, [wrapped, delay].concat(rest));
  };
};

/* Hook timers at module load so setInterval / setTimeout calls that
   happen BEFORE BroTown's useEffect runs perfTracker.init() are also
   wrapped.  Many React components register their setInterval in
   useEffect on first mount, which can fire before our init. */
initTimerHooks();

export const perfTracker = {
  init: initLongTaskObserver,

  setZone(zoneId) {
    if (!zoneId || zoneStats.zone === zoneId) return;
    zoneStats = makeZoneStats(zoneId, performance.now());
  },

  /** Called every frame from BroTown.jsx after sim + render are timed.
   *  sample: { t, intervalMs, workMs, simMs, renderMs, tileMs, entityMs,
   *            effectsMs, fpsMs, appMs, zone, monsters, ... }
   *
   *  intervalMs = gap between consecutive RAF callbacks (what the user
   *  PERCEIVES as a frozen frame — includes browser composite, GC,
   *  style recalc, third-party handlers between our callbacks).
   *  workMs    = time spent INSIDE our RAF callback (sim + pixi update).
   *  When intervalMs >> workMs the slow part is in the browser between
   *  our callbacks, not in our code.  This was the bug in v2.1.61-63:
   *  we were tracking workMs and missing the browser-side gaps that
   *  feel like stutter.
   *
   *  Auto-resets per-zone counters when sample.zone changes. */
  record(sample) {
    if (sample.zone && sample.zone !== zoneStats.zone) {
      zoneStats = makeZoneStats(sample.zone, sample.t || performance.now());
    }
    ring[ringIdx] = sample;
    ringIdx = (ringIdx + 1) % RING_SIZE;
    if (ringCount < RING_SIZE) ringCount++;
    /* totalMs == intervalMs (user-perceived frame time).  We keep
       totalMs as the field name so existing chart / stats code that
       reads sample.totalMs doesn't need to change. */
    const ms = sample.totalMs;
    zoneStats.totalFrames++;
    zoneStats.sumMs += ms;
    if (ms > zoneStats.maxMs) zoneStats.maxMs = ms;
    if (ms > LONG_FRAME_THRESHOLD_MS) {
      zoneStats.slowFrames++;
      if (ms > FREEZE_THRESHOLD_MS) zoneStats.freezeFrames++;
      longFrames.push(sample);
      if (longFrames.length > LONG_FRAME_BUFFER) longFrames.shift();
      /* Surface the worst spike per 500 ms window into the console
         with full stage attribution.  This is the data needed to
         answer "which sub-stage is slow" — sim vs tile vs entity vs
         effects vs fps vs app.render.  Throttled identically to
         [bt-perf] / [bt-frame-split] so it doesn't spam. */
      if (!spikeWorst || ms > spikeWorst.totalMs) spikeWorst = sample;
      const tNow = sample.t || performance.now();
      if (tNow - spikeLastT > 500 && spikeWorst) {
        /* eslint-disable no-console */
        const _interval = +spikeWorst.totalMs.toFixed(1);
        const _work     = +(spikeWorst.workMs || 0).toFixed(1);
        const _outside  = +(spikeWorst.totalMs - (spikeWorst.workMs || 0)).toFixed(1);
        console.warn('[bt-spike]', {
          /* intervalMs is what the user FEELS as a freeze.  workMs is
             what our RAF callback spent.  outsideMs is browser-side
             work between our callbacks (composite, GC, style, etc.).
             If outsideMs is the bulk, the freeze is NOT our code. */
          intervalMs: _interval,
          workMs:     _work,
          outsideMs:  _outside,
          simMs:    +spikeWorst.simMs.toFixed(1),
          renderMs: +spikeWorst.renderMs.toFixed(1),
          tileMs:   +spikeWorst.tileMs.toFixed(1),
          entityMs: +spikeWorst.entityMs.toFixed(1),
          effectsMs:+spikeWorst.effectsMs.toFixed(1),
          fpsMs:    +spikeWorst.fpsMs.toFixed(1),
          appMs:    +spikeWorst.appMs.toFixed(1),
          zone:     spikeWorst.zone,
          monsters: spikeWorst.monsters,
          particles:spikeWorst.hitParticles,
          splatter: spikeWorst.groundSplatter,
          dmgNums:  spikeWorst.dmgNumbers,
        });
        /* eslint-enable no-console */
        spikeLastT = tNow;
        spikeWorst = null;
      }
    }
  },

  getSamples() {
    if (ringCount < RING_SIZE) return ring.slice(0, ringCount);
    return ring.slice(ringIdx).concat(ring.slice(0, ringIdx));
  },

  getLongFrames() { return longFrames.slice(); },
  getLongTasks() { return longTasks.slice(); },
  getExtEvents() { return extEvents.slice(); },
  getZoneStats() { return { ...zoneStats }; },
  hasLongTaskObserver() { return !!longTaskObserver; },

  /** Push a slow non-RAF event (e.g. WS handler took 40 ms).  Used to
   *  attribute the "outside ms" gap between RAF callbacks — when an
   *  external handler runs slowly between RAFs, the next RAF is
   *  delayed and the user feels a freeze.  Caller decides the
   *  threshold (this just records what it gets). */
  recordExternal(name, ms) {
    extEvents.push({ t: performance.now(), name: name, ms: ms });
    if (extEvents.length > EXT_BUFFER) extEvents.shift();
  },

  /** Compute distribution stats over the last `nFrames` samples. */
  summary(nFrames) {
    const all = this.getSamples();
    const n = Math.min(nFrames || all.length, all.length);
    if (!n) return { count: 0, p50: 0, p95: 0, p99: 0, max: 0, mean: 0 };
    const slice = all.slice(-n).map(s => s.totalMs);
    slice.sort((a, b) => a - b);
    const pick = (q) => slice[Math.min(slice.length - 1, Math.floor(q * slice.length))];
    let sum = 0;
    for (const x of slice) sum += x;
    return {
      count: n,
      p50: pick(0.50),
      p95: pick(0.95),
      p99: pick(0.99),
      max: slice[slice.length - 1],
      mean: sum / n,
    };
  },

  reset() {
    ringIdx = 0;
    ringCount = 0;
    longFrames.length = 0;
    longTasks.length = 0;
    extEvents.length = 0;
    zoneStats = makeZoneStats(zoneStats.zone, performance.now());
  },
};

if (typeof window !== 'undefined') {
  window.perfTracker = perfTracker;
}
