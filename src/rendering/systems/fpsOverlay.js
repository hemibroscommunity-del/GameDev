/**
 * FPS overlay — DOM div, not Pixi.  React UI panels are HTML over the
 * canvas, so a Pixi overlay gets covered by them no matter what
 * Pixi z-order says.  This sits in document.body with z-index 99999
 * so it always wins.
 *
 * Also exposes two console commands for logging perf:
 *   bt_fps()         — print compact summary of last 30s
 *   bt_fps(secs)     — print summary of last <secs> seconds
 *   bt_fps_reset()   — clear the buffer and start fresh
 */

const SAMPLE_WINDOW_MS = 1000;     // rolling window for the live "min" display
const REDISPLAY_MS = 250;          // throttle text updates to 4/s
const HISTORY_MS = 5 * 60 * 1000;  // keep up to 5 min of frame timestamps for bt_fps()

export class FpsOverlay {
  constructor() {
    this.div = document.createElement('div');
    this.div.id = 'bt-fps-overlay';
    this.div.style.cssText = [
      'position:fixed',
      'top:6px',
      'left:6px',
      'z-index:99999',
      'pointer-events:none',
      'font:13px/1.2 ui-monospace,Menlo,Consolas,monospace',
      'font-weight:700',
      'color:#7fff7f',
      'background:rgba(0,0,0,0.55)',
      'padding:3px 6px',
      'border-radius:3px',
      'text-shadow:0 0 2px #000',
      'user-select:none',
    ].join(';');
    this.div.textContent = 'FPS …';
    document.body.appendChild(this.div);

    this.frameTimes = [];   // rolling timestamps (ms)
    this.lastDisplay = 0;

    // Expose console commands.  Called like `bt_fps()` or `bt_fps(60)`.
    if (typeof window !== 'undefined') {
      window.bt_fps = (secs = 30) => this.summary(secs);
      window.bt_fps_reset = () => { this.frameTimes = []; return 'fps buffer cleared'; };
    }
  }

  /** Call once per render frame.  `now` is Date.now() or performance.now(). */
  update(now) {
    this.frameTimes.push(now);
    // Trim history older than HISTORY_MS so the buffer can't grow unbounded.
    const cutoff = now - HISTORY_MS;
    if (this.frameTimes[0] < cutoff) {
      let i = 0;
      while (i < this.frameTimes.length && this.frameTimes[i] < cutoff) i++;
      if (i > 0) this.frameTimes.splice(0, i);
    }

    if (now - this.lastDisplay < REDISPLAY_MS) return;
    this.lastDisplay = now;

    // Live readout uses only the last 1s for responsiveness.
    const windowStart = now - SAMPLE_WINDOW_MS;
    let firstIdx = this.frameTimes.length - 1;
    while (firstIdx > 0 && this.frameTimes[firstIdx - 1] >= windowStart) firstIdx--;
    const liveTimes = this.frameTimes.slice(firstIdx);
    const n = liveTimes.length;
    if (n < 2) return;

    const elapsed = liveTimes[n - 1] - liveTimes[0];
    const fps = (n - 1) / (elapsed / 1000);
    let maxGap = 0;
    for (let i = 1; i < n; i++) {
      const g = liveTimes[i] - liveTimes[i - 1];
      if (g > maxGap) maxGap = g;
    }
    const minFps = maxGap > 0 ? 1000 / maxGap : 0;

    this.div.textContent = `FPS ${fps.toFixed(0)}  min ${minFps.toFixed(0)}  (${maxGap.toFixed(0)}ms)`;
    if (fps < 50) this.div.style.color = '#ff6b6b';
    else if (fps < 58) this.div.style.color = '#ffd24a';
    else this.div.style.color = '#7fff7f';
  }

  /** Compact one-line summary for the last `secs` seconds.  Logs to console
   *  AND returns the string so it works at the devtools prompt. */
  summary(secs = 30) {
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    // frameTimes uses Date.now()-style values from update(); align on now-style by
    // using the same source.  Date.now() ≈ performance.now()'s anchor differs but
    // both monotonically increase — we just need recent timestamps.  Use the last
    // sample's clock as "now" so we don't mismatch sources:
    if (!this.frameTimes.length) return '[bt_fps] no samples yet';
    const lastT = this.frameTimes[this.frameTimes.length - 1];
    const cutoff = lastT - secs * 1000;
    let i = this.frameTimes.length - 1;
    while (i > 0 && this.frameTimes[i - 1] >= cutoff) i--;
    const window = this.frameTimes.slice(i);
    const n = window.length;
    if (n < 2) return `[bt_fps] need ≥2 samples in last ${secs}s, have ${n}`;

    // Per-frame intervals (ms) and FPS.
    const gaps = [];
    for (let j = 1; j < n; j++) gaps.push(window[j] - window[j - 1]);
    gaps.sort((a, b) => a - b);
    const fpsFromGap = (ms) => (ms > 0 ? 1000 / ms : 0);

    const totalElapsed = window[n - 1] - window[0];
    const avgFps = (n - 1) / (totalElapsed / 1000);
    const p50Gap = gaps[Math.floor(gaps.length * 0.50)];
    const p95Gap = gaps[Math.floor(gaps.length * 0.95)];
    const worstGap = gaps[gaps.length - 1];
    const minFps = fpsFromGap(worstGap);
    const p50 = fpsFromGap(p50Gap);
    const p95 = fpsFromGap(p95Gap);

    let dipsUnder50 = 0, dipsUnder30 = 0;
    for (const g of gaps) {
      if (g > 1000 / 50) dipsUnder50++;
      if (g > 1000 / 30) dipsUnder30++;
    }
    const dipPct50 = (100 * dipsUnder50 / gaps.length).toFixed(1);
    const dipPct30 = (100 * dipsUnder30 / gaps.length).toFixed(1);

    const out = `[bt_fps] window=${secs}s samples=${n} avg=${avgFps.toFixed(1)} p50=${p50.toFixed(0)} p95=${p95.toFixed(0)} min=${minFps.toFixed(0)} worst=${worstGap.toFixed(0)}ms dips<50=${dipsUnder50}(${dipPct50}%) dips<30=${dipsUnder30}(${dipPct30}%)`;
    console.log(out);
    return out;
  }

  destroy() {
    if (this.div && this.div.parentNode) this.div.parentNode.removeChild(this.div);
    if (typeof window !== 'undefined') {
      delete window.bt_fps;
      delete window.bt_fps_reset;
    }
  }
}
