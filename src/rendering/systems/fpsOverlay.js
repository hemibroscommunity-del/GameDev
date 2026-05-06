/**
 * FPS overlay — small Pixi text in the HUD layer that shows current
 * frame rate plus a rolling minimum over the last ~1s so dips are
 * visible.  Hooked from pixiRenderer.update() once per frame.
 */
import { Text, TextStyle } from 'pixi.js';

const STYLE = new TextStyle({
  fontFamily: 'VT323, monospace',
  fontSize: 14,
  fontWeight: '700',
  fill: '#7fff7f',
  stroke: { color: '#000000', width: 3 },
});

const SAMPLE_WINDOW_MS = 1000;   // rolling window for min-fps
const REDISPLAY_MS = 250;         // throttle text mutation to 4/s

export class FpsOverlay {
  constructor(hudLayer) {
    this.text = new Text({ text: 'FPS …', style: STYLE });
    this.text.x = 4;
    this.text.y = 4;
    hudLayer.addChild(this.text);

    this.frameTimes = [];   // timestamps of recent frames
    this.lastDisplay = 0;
  }

  /** Call once per render frame.  `now` should be Date.now() or performance.now(). */
  update(now) {
    this.frameTimes.push(now);
    const cutoff = now - SAMPLE_WINDOW_MS;
    while (this.frameTimes.length && this.frameTimes[0] < cutoff) {
      this.frameTimes.shift();
    }

    if (now - this.lastDisplay < REDISPLAY_MS) return;
    this.lastDisplay = now;

    const n = this.frameTimes.length;
    if (n < 2) return;

    const elapsed = this.frameTimes[n - 1] - this.frameTimes[0];
    const fps = (n - 1) / (elapsed / 1000);

    // Worst single-frame interval in the window — a 50ms gap = a 20fps spike.
    let maxGap = 0;
    for (let i = 1; i < n; i++) {
      const gap = this.frameTimes[i] - this.frameTimes[i - 1];
      if (gap > maxGap) maxGap = gap;
    }
    const minFps = maxGap > 0 ? 1000 / maxGap : 0;

    this.text.text = `FPS ${fps.toFixed(0)}  min ${minFps.toFixed(0)}  (${maxGap.toFixed(0)}ms)`;

    // Color hint: red below 50, amber 50-58, green at 60.
    if (fps < 50) this.text.style.fill = '#ff6b6b';
    else if (fps < 58) this.text.style.fill = '#ffd24a';
    else this.text.style.fill = '#7fff7f';
  }

  destroy() {
    this.text.destroy();
  }
}
