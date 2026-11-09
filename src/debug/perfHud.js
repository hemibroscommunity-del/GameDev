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
import { frameSmoothOn } from '../game/frameClock.js';   /* v2.3.4355: which step this tab moves by */

/* ═══ v2.3.4355: THE HITCHES THE AVERAGES HIDE, AND THE THUMB ═══
   The owner's iPhone on the skateboard, after the step was made steady: "a
   little smoother but it's still gritty looking", the strip reading "fps ~59
   frame avg 16.8 p95 17.0 max 38.0".  Nineteen frames in twenty were on
   time, and one of the last two seconds' took 38 ms: two refreshes missed.
   A few of those a second read as grit, and an average cannot show them.
   So the strip also says, over the last ten seconds:
     - how many frames came a refresh or more late, and the worst one's
       split: the game's own work (and its stages) against the time outside
       it, which is the browser's or the graphics chip's;
     - the slowest thing that ran between two frames (a message from the
       worker: wsClient's recordExternal), if any was slow;
     - how hard the thumb held the stick over the last half second, least to
       most: the stick is analog, so a thumb short of the rim moves you at a
       speed that wavers with it;
     - `step steady` or `step raw` (`?dtsmooth=0`): which way this tab steps.
   Read-only, and only with `?perf=1`. */
let _stickLo = 1, _stickHi = 0, _stickOn = false;
const sampleStick = () => {
  try {
    const S = window._gameState && window._gameState.current;
    if (S) {
      const m = Math.hypot(S.stickX || 0, S.stickY || 0);
      if (m > 0) { _stickOn = true; if (m < _stickLo) _stickLo = m; if (m > _stickHi) _stickHi = m; }
    }
  } catch (e) { /* no game yet */ }
  requestAnimationFrame(sampleStick);
};

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
    `part ${last.hitParticles || 0}  zone ${last.zone || '?'}` + (() => {
      /* armor bake spikes (entityRenderer._maskedBodyFrame cache misses)
         accumulated since the last HUD repaint -- read + reset. */
      const b = window.__btBakeStats;
      if (!b || !b.count) return '';
      const s = `\nbakes ${b.count} (${f1(b.ms)} ms since last repaint)`;
      b.count = 0; b.ms = 0;
      return s;
    })() + hitchLines(all);
};

/* v2.3.4355: see THE HITCHES THE AVERAGES HIDE, above.  Short lines: a phone
   shows about sixty characters. */
const hitchLines = (all) => {
  let out = '';
  try {
    const win = all.slice(-600);
    const sorted = win.map((x) => x.totalMs || 0).sort((a, b) => a - b);
    const mid = sorted[sorted.length >> 1] || 16.7;
    const late = mid * 1.5;                       /* a refresh or more late */
    let n = 0, worst = null;
    for (const x of win) if ((x.totalMs || 0) > late) { n++; if (!worst || x.totalMs > worst.totalMs) worst = x; }
    const secs = Math.max(1, Math.round(win.reduce((a, x) => a + (x.totalMs || 0), 0) / 1000));
    out += `\nlate frames ${n} in ${secs}s  step ${frameSmoothOn(window.location.search || '') ? 'steady' : 'raw'}`;
    if (worst) {
      const w = worst.workMs || 0;
      out += `\nworst ${f1(worst.totalMs)} = game ${f1(w)} + outside ${f1(Math.max(0, worst.totalMs - w))}`
        + `\n  sim ${f1(worst.simMs || 0)} tile ${f1(worst.tileMs || 0)} ent ${f1(worst.entityMs || 0)} fx ${f1(worst.effectsMs || 0)} pixi ${f1(worst.appMs || 0)}`;
    }
    const now = performance.now();
    let slow = null;
    for (const e of perfTracker.getExtEvents()) if (now - e.t < 10000 && (!slow || e.ms > slow.ms)) slow = e;
    if (slow) out += `\nbetween frames: ${slow.name} ${f1(slow.ms)} ms`;
    if (_stickOn) out += `\nstick ${_stickLo.toFixed(2)} to ${_stickHi.toFixed(2)}`;
    _stickLo = 1; _stickHi = 0; _stickOn = false;
  } catch (e) { /* the strip's first lines stand */ }
  return out;
};

export const installPerfHud = () => {
  if (!shouldActivate()) return;
  try { perfTracker.init(); } catch (e) { /* long-task observer optional */ }
  const start = () => { mount(); setInterval(tick, 500); requestAnimationFrame(sampleStick); };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
};
