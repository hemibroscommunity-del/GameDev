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

export const perfTracker = {
  init: initLongTaskObserver,

  setZone(zoneId) {
    if (!zoneId || zoneStats.zone === zoneId) return;
    zoneStats = makeZoneStats(zoneId, performance.now());
  },

  /** Called every frame from BroTown.jsx after sim + render are timed.
   *  sample: { t, totalMs, simMs, renderMs, tileMs, entityMs,
   *            effectsMs, fpsMs, appMs, zone, monsters, ... }
   *
   *  Auto-resets per-zone counters when sample.zone changes — saves
   *  threading setZone() calls through every zone-mutation site
   *  (respawns, dungeon warps, clan-war joins, etc.). */
  record(sample) {
    if (sample.zone && sample.zone !== zoneStats.zone) {
      zoneStats = makeZoneStats(sample.zone, sample.t || performance.now());
    }
    ring[ringIdx] = sample;
    ringIdx = (ringIdx + 1) % RING_SIZE;
    if (ringCount < RING_SIZE) ringCount++;
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
        console.warn('[bt-spike]', {
          totalMs:  +spikeWorst.totalMs.toFixed(1),
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
  getZoneStats() { return { ...zoneStats }; },
  hasLongTaskObserver() { return !!longTaskObserver; },

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
    zoneStats = makeZoneStats(zoneStats.zone, performance.now());
  },
};

if (typeof window !== 'undefined') {
  window.perfTracker = perfTracker;
}
