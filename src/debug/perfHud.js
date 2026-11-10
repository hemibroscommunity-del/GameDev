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
import { frameSmoothOn } from '../game/frameClock.js';   /* v2.3.4400: which step this tab moves by */
import { startBusyBeat, busyIn } from './busyBeat.js';   /* v2.3.4400: was the page busy, or waiting? */

/* ═══ v2.3.4400: THE HITCHES THE AVERAGES HIDE, AND THE THUMB ═══
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

/* v2.3.4400: WHAT IS DRAWING IT -- so one screenshot from any computer says
   which machine it was: the graphics chip as the browser names it, the
   canvas's own pixels, and whether characters' looks are drawn from the
   shared colour numbers (`palette`) or baked one by one (`baked`, and why:
   Windows and a Mac bake, game/lookPaletteChoice.js).
   The chip is asked once.  The LOOKS are asked every time: the first cut
   asked once, as the strip first drew, which is before the palette's sheets
   have loaded -- so the owner's iPhone read "looks baked (default)" all
   session while it drew from the palette.  And "baked" now says which of
   the palette's own conditions is not met. */
let _chip = null;
const looksLine = () => {
  const lp = window.__btLookPalette ? window.__btLookPalette() : null;
  if (!lp) return '?';
  if (lp.on) return 'palette';
  if (!lp.wanted) return 'baked (' + (lp.why || 'off') + ')';
  /* wanted here, and not drawing: why (rendering/lookPalette.js lookPaletteOn) */
  return 'baked (' + (lp.ok === false ? 'the program did not build' : !lp.sheets ? 'sheets not loaded yet' : !lp.renderer ? 'no renderer yet' : 'switched off or no WebGL2') + ')';
};
const machineLine = () => {
  try {
    const R = window._pixiRenderer && window._pixiRenderer.app && window._pixiRenderer.app.renderer;
    const gl = R && R.gl;
    if (!gl) return '';
    if (_chip == null) {
      let chip = '';
      try { const e = gl.getExtension('WEBGL_debug_renderer_info'); chip = String((e && gl.getParameter(e.UNMASKED_RENDERER_WEBGL)) || gl.getParameter(gl.RENDERER) || ''); } catch (e2) { chip = ''; }
      _chip = chip.replace(/^ANGLE \(/, '').replace(/\)$/, '').replace(/Direct3D11 vs_\S+ ps_\S+,?\s*/, 'D3D11 ').slice(0, 58);
    }
    const cv = gl.canvas;
    return `\n${_chip}\ncanvas ${cv.width}x${cv.height} at ${window.devicePixelRatio || 1}x  looks ${looksLine()}`;
  } catch (e) { return ''; }
};

/* v2.3.4400: THE SCREEN'S RATE AND THE GAME'S (game/framePacer.js): the
   refresh the browser offers, every how many of them a frame is drawn, and
   how the last ten seconds' frames were shared out between whole numbers of
   refreshes -- "17 ms 62%  25 ms 33%" is an uneven 51 a second, however the
   average reads. */
const ORD = ['', 'every', 'every 2nd', 'every 3rd', 'every 4th', 'every 5th', 'every 6th'];
const paceLines = (win) => {
  try {
    const p = window.__btPace ? window.__btPace() : null;
    let out = '';
    const refresh = p && p.refresh;
    if (!p) out += '\nscreen ?  pace off (?pace=0)';
    else if (!refresh) out += '\nscreen ?  every refresh';
    else out += `\nscreen ${p.hz}/s  drawn ${ORD[p.every] || 'every ' + p.every + 'th'} refresh` + (p.every > 1 ? ` (${p.rate}/s)` : '') + (p.trial ? '  trying faster' : '');
    /* the frames' lengths, to the nearest whole refresh (the screen's, or a 60 screen's when it is not known) */
    const unit = refresh || 1000 / 60;
    const by = new Map();
    for (const x of win) { const k = Math.max(1, Math.round((x.totalMs || 0) / unit)); by.set(k, (by.get(k) || 0) + 1); }
    const rows = [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).filter((r) => r[1] / win.length >= 0.02).sort((a, b) => a[0] - b[0]);
    /* (told only where it means something: a known screen, or frames quick enough to be refreshes of one) */
    const quick = win.length && win.reduce((a, x) => a + (x.totalMs || 0), 0) / win.length < 40;
    if (rows.length && (refresh || quick)) out += '\nframes ' + rows.map(([k, n]) => `${Math.round(k * unit)} ms ${Math.round(100 * n / win.length)}%`).join('  ');
    return out;
  } catch (e) { return ''; }
};

/* v2.3.4400: of the time outside the game's frames, how much the page was
   BUSY (something ran: debug/busyBeat.js) and how much it was WAITING to be
   called (the graphics chip, the phone).  For one frame: `at` is its sample,
   `prev` the one before (whose own work opens the gap). */
const frameOf = (x) => [x.t - (x.workMs || 0), x.t];
const outsideSplit = (x, prev) => {
  const start = x.t - (x.workMs || 0);
  const busy = busyIn(start - (x.totalMs || 0), start, prev ? [frameOf(prev)] : null);
  if (busy == null) return null;
  const outside = Math.max(0, (x.totalMs || 0) - (prev ? prev.workMs || 0 : 0));
  const b = Math.min(outside, busy);
  return { busy: b, wait: Math.max(0, outside - b) };
};

/* v2.3.4400: see THE HITCHES THE AVERAGES HIDE, above.  Short lines: a phone
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
    /* the average frame's time outside, split (the last two seconds) */
    try {
      const rec = win.slice(-120);
      if (rec.length > 10) {
        const t0 = rec[0].t, t1 = rec[rec.length - 1].t - (rec[rec.length - 1].workMs || 0);
        const busy = busyIn(t0, t1, rec.map(frameOf));
        if (busy != null) {
          const n = rec.length - 1;
          let outside = 0;
          for (let i = 1; i < rec.length; i++) outside += Math.max(0, (rec[i].totalMs || 0) - (rec[i - 1].workMs || 0));
          const b = Math.min(outside, busy) / n;
          out += `\noutside: page busy ${f1(b)} + waiting ${f1(Math.max(0, outside / n - b))} ms a frame`;
        }
      }
    } catch (e3) { /* the old line stands */ }
    if (worst) {
      const w = worst.workMs || 0;
      const wi = win.indexOf(worst);
      const sp = outsideSplit(worst, wi > 0 ? win[wi - 1] : null);
      out += `\nworst ${f1(worst.totalMs)} = game ${f1(w)} + ` + (sp ? `busy ${f1(sp.busy)} + waiting ${f1(Math.max(0, worst.totalMs - w - sp.busy))}` : `outside ${f1(Math.max(0, worst.totalMs - w))}`)
        + `\n  sim ${f1(worst.simMs || 0)} tile ${f1(worst.tileMs || 0)} ent ${f1(worst.entityMs || 0)} fx ${f1(worst.effectsMs || 0)} pixi ${f1(worst.appMs || 0)}`;
    }
    const now = performance.now();
    let slow = null;
    for (const e of perfTracker.getExtEvents()) if (now - e.t < 10000 && (!slow || e.ms > slow.ms)) slow = e;
    if (slow) out += `\nbetween frames: ${slow.name} ${f1(slow.ms)} ms`;
    if (_stickOn) out += `\nstick ${_stickLo.toFixed(2)} to ${_stickHi.toFixed(2)}`;
    _stickLo = 1; _stickHi = 0; _stickOn = false;
    out += paceLines(win);
    out += machineLine();
  } catch (e) { /* the strip's first lines stand */ }
  return out;
};

export const installPerfHud = () => {
  if (!shouldActivate()) return;
  try { perfTracker.init(); } catch (e) { /* long-task observer optional */ }
  const start = () => { mount(); setInterval(tick, 500); requestAnimationFrame(sampleStick); startBusyBeat(); };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
};
