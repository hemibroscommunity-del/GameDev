/* Vanilla-JS on-screen perf HUD.
 *
 * Reads perfTracker's ring buffers and paints the frame-time breakdown
 * into a fixed strip at the top of the screen.  It does NOT hook console
 * (so no double-interceptor conflict with debugBus -- that was why the
 * old diagBanner was pulled), and it's plain DOM, not React, so it
 * survives the React DebugOverlay disappearing after PLAY.
 *
 * Activates only with `?perf=1` (or `?debug=1`) in the URL.  Pure
 * read-only diagnostic; safe to leave in.
 *
 * What it shows (averaged over the last ~2 s):
 *   fps          frames/sec from the perceived frame interval
 *   frame        avg / p95 / max interval ms  (what the user FEELS)
 *   work         time inside our RAF callback (sim + render)
 *   sim / render split of work
 *   outside      browser-side time between callbacks (composite/GC/throttle)
 *                -- if this is the bulk, the slowdown is NOT our code
 *   counts       monsters / others / projectiles / particles + zone
 */
import { perfTracker } from './perfTracker.js';

const shouldActivate = () => {
  try {
    const p = new URLSearchParams(window.location.search);
    return p.get('perf') === '1' || p.get('debug') === '1';
  } catch {
    return false;
  }
};

let el = null;

const mount = () => {
  if (el || typeof document === 'undefined' || !document.body) return;
  el = document.createElement('div');
  el.id = 'bt-perf-hud';
  el.style.cssText = [
    'position:fixed',
    'top:0',
    'left:0',
    'right:0',
    'z-index:2147483647',
    'background:rgba(0,0,0,.78)',
    'color:#7CFC9B',
    'font:11px/1.3 ui-monospace,Menlo,Consolas,monospace',
    'padding:3px 6px',
    'white-space:pre',
    'pointer-events:none',          // never blocks taps on the game
    'text-shadow:0 1px 1px #000',
  ].join(';');
  document.body.appendChild(el);
};

const avg = (samples, key) => {
  if (!samples.length) return 0;
  let s = 0;
  for (const x of samples) s += (x[key] || 0);
  return s / samples.length;
};

const f1 = (n) => (Math.round(n * 10) / 10).toFixed(1);

const tick = () => {
  if (!el) return;
  const all = perfTracker.getSamples();
  if (!all.length) { el.textContent = '[perf] warming up…'; return; }
  const recent = all.slice(-120);               // ~2 s @ 60 fps
  const last = recent[recent.length - 1];
  const sum = perfTracker.summary(120);         // p50/p95/max over totalMs
  const fps = sum.mean ? Math.round(1000 / sum.mean) : 0;
  const work = avg(recent, 'workMs');
  const sim = avg(recent, 'simMs');
  const render = avg(recent, 'renderMs');
  const outside = Math.max(0, sum.mean - work); // browser-side between RAFs
  /* Colour cue: red if the bottleneck is browser-side (outside > work),
     amber if our render dominates, green otherwise. */
  el.style.color = outside > work ? '#ff7b7b' : (render > sim ? '#ffd24a' : '#7CFC9B');
  el.textContent =
    `fps ~${fps}   frame avg ${f1(sum.mean)} p95 ${f1(sum.p95)} max ${f1(sum.max)} ms\n` +
    `work ${f1(work)} (sim ${f1(sim)} / render ${f1(render)})   outside ${f1(outside)} ms` +
    (outside > work ? '  <- browser-side, not our code' : '') + '\n' +
    `mon ${last.monsters || 0}  oth ${last.others || 0}  proj ${last.projectiles || 0}  ` +
    `part ${last.hitParticles || 0}  zone ${last.zone || '?'}`;
};

export const installPerfHud = () => {
  if (!shouldActivate()) return;
  try { perfTracker.init(); } catch (e) { /* long-task observer optional */ }
  const start = () => { mount(); setInterval(tick, 500); };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
};
