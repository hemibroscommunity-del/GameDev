/**
 * FPS + NET overlay — DOM div in document.body, z-index 99999, sits
 * above the React UI.  Two lines:
 *   FPS 60   min 60   (16ms)
 *   NET 33ms p95 41ms  last 28ms  stalls 0
 *
 * Console commands for compact perf logs (paste-friendly):
 *   bt_fps()         summary of last 30s rendering
 *   bt_fps(secs)     same, custom window
 *   bt_net()         summary of last 30s server tick stream
 *   bt_net(secs)     same, custom window
 *   bt_fps_reset()   clear FPS buffer
 *
 * The "NET" line is server-tick arrival jitter, NOT round-trip
 * ping.  Without a server-side change to echo a client-stamped ping
 * back, true RTT can't be measured client-only.  Tick-interval
 * jitter is the best client-only proxy for "is the connection
 * making the game feel laggy" — every visible lag spike (other
 * players freezing, monsters teleporting) corresponds to a gap in
 * the tick stream.
 */
import { getTickTimes, getTickSizes } from '../../networking/wsClient.js';

const FPS_WINDOW_MS = 1000;
const REDISPLAY_MS = 250;
const HISTORY_MS = 5 * 60 * 1000;

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
      'font:13px/1.25 ui-monospace,Menlo,Consolas,monospace',
      'font-weight:700',
      'background:rgba(0,0,0,0.55)',
      'padding:3px 6px',
      'border-radius:3px',
      'text-shadow:0 0 2px #000',
      'user-select:none',
      'white-space:pre',
    ].join(';');
    this.fpsLine = document.createElement('div');
    this.fpsLine.style.color = '#7fff7f';
    this.fpsLine.textContent = 'FPS …';
    this.netLine = document.createElement('div');
    this.netLine.style.color = '#7fff7f';
    this.netLine.textContent = 'NET …';
    this.div.appendChild(this.fpsLine);
    this.div.appendChild(this.netLine);
    document.body.appendChild(this.div);

    this.frameTimes = [];
    this.lastDisplay = 0;

    if (typeof window !== 'undefined') {
      window.bt_fps = (secs = 30) => this.fpsSummary(secs);
      window.bt_net = (secs = 30) => this.netSummary(secs);
      window.bt_fps_reset = () => { this.frameTimes = []; return 'fps buffer cleared'; };
    }
  }

  /** Call once per render frame.  `now` is Date.now() or performance.now()
   *  — internally we just compare timestamps against each other so the
   *  source doesn't matter as long as it's monotonic. */
  update(now) {
    this.frameTimes.push(now);
    const cutoff = now - HISTORY_MS;
    if (this.frameTimes.length && this.frameTimes[0] < cutoff) {
      let i = 0;
      while (i < this.frameTimes.length && this.frameTimes[i] < cutoff) i++;
      if (i > 0) this.frameTimes.splice(0, i);
    }

    if (now - this.lastDisplay < REDISPLAY_MS) return;
    this.lastDisplay = now;

    this._renderFps(now);
    this._renderNet();
  }

  _renderFps(now) {
    const start = now - FPS_WINDOW_MS;
    let firstIdx = this.frameTimes.length - 1;
    while (firstIdx > 0 && this.frameTimes[firstIdx - 1] >= start) firstIdx--;
    const live = this.frameTimes.slice(firstIdx);
    const n = live.length;
    if (n < 2) return;

    const elapsed = live[n - 1] - live[0];
    const fps = (n - 1) / (elapsed / 1000);
    let maxGap = 0;
    for (let i = 1; i < n; i++) {
      const g = live[i] - live[i - 1];
      if (g > maxGap) maxGap = g;
    }
    const minFps = maxGap > 0 ? 1000 / maxGap : 0;

    this.fpsLine.textContent = `FPS ${fps.toFixed(0)}  min ${minFps.toFixed(0)}  (${maxGap.toFixed(0)}ms)`;
    if (fps < 50) this.fpsLine.style.color = '#ff6b6b';
    else if (fps < 58) this.fpsLine.style.color = '#ffd24a';
    else this.fpsLine.style.color = '#7fff7f';
  }

  _renderNet() {
    const ticks = getTickTimes();
    if (!ticks.length) {
      this.netLine.textContent = 'NET …';
      this.netLine.style.color = '#999';
      return;
    }
    const now = performance.now();
    const last = ticks[ticks.length - 1];
    const lastAge = now - last;

    /* p50 / p95 over the last 5 s of ticks (responsive while still big
     * enough to be statistically sane at 30Hz = 150 samples). */
    const winStart = now - 5000;
    let firstIdx = ticks.length - 1;
    while (firstIdx > 0 && ticks[firstIdx - 1] >= winStart) firstIdx--;
    const win = ticks.slice(firstIdx);
    const gaps = [];
    for (let i = 1; i < win.length; i++) gaps.push(win[i] - win[i - 1]);

    /* Stalls in the last 30 s. */
    const stallStart = now - 30000;
    let sIdx = ticks.length - 1;
    while (sIdx > 0 && ticks[sIdx - 1] >= stallStart) sIdx--;
    let stalls = 0;
    for (let i = sIdx + 1; i < ticks.length; i++) {
      if (ticks[i] - ticks[i - 1] > 1000) stalls++;
    }

    if (gaps.length === 0) {
      this.netLine.textContent = `NET --     last ${lastAge.toFixed(0)}ms`;
    } else {
      const sorted = gaps.slice().sort((a, b) => a - b);
      const p50 = sorted[Math.floor(sorted.length * 0.50)];
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      this.netLine.textContent = `NET ${p50.toFixed(0)}ms p95 ${p95.toFixed(0)}ms  last ${lastAge.toFixed(0)}ms  stalls ${stalls}`;
    }

    if (lastAge > 500 || stalls > 0) this.netLine.style.color = '#ff6b6b';
    else if (lastAge > 100) this.netLine.style.color = '#ffd24a';
    else this.netLine.style.color = '#7fff7f';
  }

  fpsSummary(secs = 30) {
    if (!this.frameTimes.length) return '[bt_fps] no samples yet';
    const lastT = this.frameTimes[this.frameTimes.length - 1];
    const cutoff = lastT - secs * 1000;
    let i = this.frameTimes.length - 1;
    while (i > 0 && this.frameTimes[i - 1] >= cutoff) i--;
    const win = this.frameTimes.slice(i);
    const n = win.length;
    if (n < 2) return `[bt_fps] need >=2 samples in last ${secs}s, have ${n}`;

    const gaps = [];
    for (let j = 1; j < n; j++) gaps.push(win[j] - win[j - 1]);
    gaps.sort((a, b) => a - b);
    const fpsFromGap = (ms) => (ms > 0 ? 1000 / ms : 0);

    const totalElapsed = win[n - 1] - win[0];
    const avg = (n - 1) / (totalElapsed / 1000);
    const p50 = fpsFromGap(gaps[Math.floor(gaps.length * 0.50)]);
    const p95 = fpsFromGap(gaps[Math.floor(gaps.length * 0.95)]);
    const worst = gaps[gaps.length - 1];
    const minFps = fpsFromGap(worst);
    let dipsUnder50 = 0, dipsUnder30 = 0;
    for (const g of gaps) {
      if (g > 1000 / 50) dipsUnder50++;
      if (g > 1000 / 30) dipsUnder30++;
    }
    const out = `[bt_fps] window=${secs}s samples=${n} avg=${avg.toFixed(1)} p50=${p50.toFixed(0)} p95=${p95.toFixed(0)} min=${minFps.toFixed(0)} worst=${worst.toFixed(0)}ms dips<50=${dipsUnder50}(${(100 * dipsUnder50 / gaps.length).toFixed(1)}%) dips<30=${dipsUnder30}(${(100 * dipsUnder30 / gaps.length).toFixed(1)}%)`;
    console.log(out);
    return out;
  }

  netSummary(secs = 30) {
    const ticks = getTickTimes();
    const sizes = getTickSizes();
    if (ticks.length < 2) return `[bt_net] need >=2 ticks, have ${ticks.length}`;
    const lastT = ticks[ticks.length - 1];
    const cutoff = lastT - secs * 1000;
    let i = ticks.length - 1;
    while (i > 0 && ticks[i - 1] >= cutoff) i--;
    const winT = ticks.slice(i);
    const winS = sizes.slice(i);
    const n = winT.length;
    if (n < 2) return `[bt_net] need >=2 ticks in last ${secs}s, have ${n}`;

    const gaps = [];
    for (let j = 1; j < n; j++) gaps.push(winT[j] - winT[j - 1]);
    const sorted = gaps.slice().sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.50)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const worst = sorted[sorted.length - 1];
    const meanGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    let stalls200 = 0, stalls1000 = 0;
    for (const g of gaps) {
      if (g > 200) stalls200++;
      if (g > 1000) stalls1000++;
    }
    const totalBytes = winS.reduce((a, b) => a + b, 0);
    const kbps = (totalBytes / 1024) / Math.max(1e-3, (winT[n - 1] - winT[0]) / 1000);
    const out = `[bt_net] window=${secs}s ticks=${n} mean-gap=${meanGap.toFixed(0)}ms p50=${p50.toFixed(0)} p95=${p95.toFixed(0)} worst=${worst.toFixed(0)}ms stalls>200=${stalls200} stalls>1000=${stalls1000} ${kbps.toFixed(1)}KB/s`;
    console.log(out);
    return out;
  }

  destroy() {
    if (this.div && this.div.parentNode) this.div.parentNode.removeChild(this.div);
    if (typeof window !== 'undefined') {
      delete window.bt_fps;
      delete window.bt_net;
      delete window.bt_fps_reset;
    }
  }
}
