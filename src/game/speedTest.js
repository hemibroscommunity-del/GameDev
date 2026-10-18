/* ═══ v2.3.3339: THE SPEED TEST ═══
 *
 * The owner, 2026-10-18: "Not so sure about the performance. The framerate is
 * definitely not totally smooth. It appears to be around 30fps to 40ish fps".
 *
 * On a phone what makes a frame slow is mostly the graphics chip -- the screen
 * drawn at three canvas pixels a CSS pixel, the shadow layer's pass, a pass
 * for each piece of shining metal, the moving water -- and no machine here has
 * one: the QA box draws in software, a few frames a second.  So the measuring
 * is done on the phone itself.  The test panel's Speed test (DevPanel) closes
 * the panel and, while you stand still, times the frames for a few seconds:
 *   - with everything on, as you play;
 *   - with the shadows (and the shine) off, then the metal shine alone, then
 *     the water still, then at a lower resolution (2x, a phone above 2x only);
 *   - v2.3.3440: and the sprites drawn the old way, by three programs instead
 *     of one (paletteTex.js), which says what the one saves on that phone --
 *     or that it costs (a note, never "the biggest gain");
 *   - then all of those off at once;
 * and puts everything back -- for this page only, nothing is saved, so a page
 * that dies mid-test comes back as it was.  A card shows the frames a second
 * for each (and how long the slowest frames took, the game's own work a frame,
 * and how many times a frame the graphics chip had to stop and switch to
 * another picture -- each one costs a phone), so a screenshot of it says what
 * costs the most on that phone.
 *
 * Nothing is sent.  `window.__btSpeedTest` is the last result (QA:
 * mp-speedtest); `?speedms=<ms>` shortens each step for a slow test machine.
 */
import { COL } from '@/ui/mobile/dash/common.js';
import { lightFxOn, setLightFx } from '@/rendering/lightfx/lightFx.js';
import { sheenOn, setSheen } from '@/rendering/lightfx/glint.js';
import { oneBatchOn, setOneBatchLive } from '@/rendering/paletteTex.js';   /* v2.3.3440 */
import { renderDpr, setRenderResLive } from './renderRes.js';

const SETTLE_MS = 1500;
const MEASURE_MS = 4000;
const LOW_RES = 2;

function stepMs() {
  try {
    const m = /[?&]speedms=([0-9]+)\b/.exec(location.search || '');
    if (m) return Math.max(300, Math.min(20000, +m[1]));
  } catch (e) { /* default */ }
  return MEASURE_MS;
}

function waves() {
  return (typeof window !== 'undefined' && window.__btWaves) || null;
}

/* the steps: what each switches off.  `can` says whether it means anything
   here (no water module, no resolution to lower). */
function steps() {
  const dev = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  const w = waves();
  const list = [
    { k: 'all', label: 'Everything on (as you play)', off: {} },
    { k: 'noshadow', label: 'No shadows (and no shine)', off: { light: true } },
    { k: 'noshine', label: 'No metal shine', off: { shine: true } },
  ];
  /* v2.3.3440: the sprites drawn the old way, by three programs instead of
     one (paletteTex.js ONE_BATCHER), so the card says what the one saves on
     this phone */
  if (oneBatchOn()) list.push({ k: 'threeprog', label: 'Three drawing programs (the old way)', off: { threeProg: true }, old: true });
  if (w && w.off && w.on) list.push({ k: 'still', label: 'Still water', off: { water: true } });
  if (dev > LOW_RES + 0.01) list.push({ k: 'res2', label: 'Lower resolution (' + LOW_RES + 'x, not ' + (Math.round(dev * 10) / 10) + 'x)', off: { res: true } });
  list.push({ k: 'bare', label: 'All of those off', off: { light: true, shine: true, water: !!(w && w.off), res: dev > LOW_RES + 0.01 } });
  return list;
}

/* what the page had, to put back (the water's live switch as it was: a QA
   page may have it off) */
function snapshot() {
  const w = waves();
  let water = true;
  try { water = !(w && w.probe) || !!w.probe().on; } catch (e) { water = true; }
  return { light: lightFxOn(), shine: sheenOn(), water, one: oneBatchOn() };
}

function setWater(w, on) {
  if (!w || !w.on || !w.off) return;
  if (on) w.on(); else w.off();
}

function apply(off, was) {
  setLightFx(off.light ? false : was.light, false);
  setSheen(off.shine ? false : was.shine, false);
  setWater(waves(), off.water ? false : was.water);
  setRenderResLive(off.res ? LOW_RES : 0);
  if (was.one) setOneBatchLive(!off.threeProg);
}

function restore(was) {
  setLightFx(was.light, false);
  setSheen(was.shine, false);
  setWater(waves(), was.water);
  setRenderResLive(0);
  if (was.one) setOneBatchLive(true);
}

/* count what the graphics chip is asked to do, a frame */
function glCounter() {
  const R = window._pixiRenderer && window._pixiRenderer.app && window._pixiRenderer.app.renderer;
  const gl = R && R.gl;
  const c = { binds: 0, draws: 0 };
  if (!gl) return { c, stop() {} };
  const fb = gl.bindFramebuffer, de = gl.drawElements, da = gl.drawArrays;
  gl.bindFramebuffer = function (t, f) { c.binds++; return fb.call(this, t, f); };
  gl.drawElements = function () { c.draws++; return de.apply(this, arguments); };
  gl.drawArrays = function () { c.draws++; return da.apply(this, arguments); };
  return {
    c,
    stop() { gl.bindFramebuffer = fb; gl.drawElements = de; gl.drawArrays = da; },
  };
}

/* time the frames for `ms` */
function measure(ms) {
  return new Promise((resolve) => {
    const t = [];
    const counter = glCounter();
    const t0 = performance.now();
    const f = (now) => {
      t.push(now);
      if (now - t0 < ms) requestAnimationFrame(f);
      else {
        counter.stop();
        const d = [];
        for (let i = 1; i < t.length; i++) d.push(t[i] - t[i - 1]);
        d.sort((a, b) => a - b);
        const secs = (t[t.length - 1] - t[0]) / 1000;
        const frames = Math.max(1, t.length - 1);
        let work = null;
        try {
          const s = (window.perfTracker && window.perfTracker.getSamples && window.perfTracker.getSamples()) || [];
          const inWin = s.filter((x) => x && x.t >= t0 && x.t <= t[t.length - 1] && typeof x.workMs === 'number');
          if (inWin.length) work = inWin.reduce((a, x) => a + x.workMs, 0) / inWin.length;
        } catch (e) { /* none */ }
        resolve({
          fps: secs > 0 ? frames / secs : 0,
          p50: d.length ? d[Math.floor(d.length * 0.5)] : 0,
          p95: d.length ? d[Math.min(d.length - 1, Math.floor(d.length * 0.95))] : 0,
          work,
          passes: counter.c.binds / frames / 2,   /* a pass is a switch away and back */
          draws: counter.c.draws / frames,
          frames,
          res: renderDpr(),
          cw: ((typeof document !== 'undefined' && document.querySelector('.brotown-canvas')) || {}).width || 0,
        });
      }
    };
    requestAnimationFrame(f);
  });
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* ── the card ── */
let _card = null;
function card() {
  if (_card && _card.isConnected) return _card;
  const el = document.createElement('div');
  el.setAttribute('data-speed-test', '');
  el.style.cssText = 'position:fixed;left:50%;top:calc(env(safe-area-inset-top, 0px) + 64px);transform:translateX(-50%);'
    + 'z-index:70;width:min(352px, calc(100vw - 24px));box-sizing:border-box;padding:12px 13px;border-radius:12px;'
    + 'background:' + COL.bg + ';border:1px solid ' + COL.edgeWarm + ';color:' + COL.text + ';'
    + 'font:12.5px/1.35 system-ui,-apple-system,sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.45);pointer-events:auto';
  document.body.appendChild(el);
  _card = el;
  return el;
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function showProgress(i, n, label) {
  const el = card();
  el.innerHTML = '<div style="font-weight:700;color:' + COL.accent + ';margin-bottom:4px">Speed test ' + (i + 1) + ' of ' + n + '</div>'
    + '<div>' + esc(label) + '</div>'
    + '<div style="color:' + COL.muted + ';margin-top:4px">Stand still and leave the screen alone.</div>';
}

function showResult(r) {
  const el = card();
  const rows = r.rows.map((x) => '<tr data-speed-row="' + x.k + '">'
    + '<td style="padding:3px 6px 3px 0">' + esc(x.label) + '</td>'
    + '<td style="padding:3px 6px;text-align:right;font-weight:700;color:' + COL.text + '">' + x.fps.toFixed(0) + '</td>'
    + '<td style="padding:3px 0 3px 6px;text-align:right;color:' + COL.text2 + '">' + x.p95.toFixed(0) + '</td>'
    + '</tr>').join('');
  el.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">'
    + '<b style="color:' + COL.accent + '">Speed test</b>'
    + '<button type="button" data-speed-close style="min-width:44px;min-height:36px;border-radius:8px;border:1px solid ' + COL.border
    + ';background:' + COL.raised + ';color:' + COL.text + ';font-weight:700">Close</button></div>'
    + '<table style="width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums">'
    + '<tr style="color:' + COL.muted + ';font-size:11px"><td>Setting</td><td style="text-align:right">frames/s</td><td style="text-align:right">slowest ms</td></tr>'
    + rows + '</table>'
    + '<div style="color:' + COL.text2 + ';margin-top:7px">' + r.notes.map(esc).join('<br>') + '</div>'
    + '<div style="color:' + COL.muted + ';margin-top:6px;font-size:11px">' + esc(r.device) + '</div>';
  const b = el.querySelector('[data-speed-close]');
  if (b) b.addEventListener('click', () => { try { el.remove(); } catch (e) { /* gone */ } _card = null; });
}

let _running = false;

/* which side holds the frame, in words -- v2.3.3383: never the graphics chip
   at the screen's own pace.  The owner's first run read 60 frames a second in
   every step, 17 ms each, and was told "Most of each frame (17 ms) is the
   graphics chip's": the 17 ms there is only the screen's own refresh (a
   frame at 60 Hz is 16.7 ms however little is drawn), so a frame much longer
   than the game's own work says the chip (or the screen) is the wait only
   when the frame rate is under the screen's. */
const AT_SCREEN_PACE_FPS = 55;
export function frameNote(base) {
  if (!base || base.work == null || !(base.p50 > 0)) return null;
  if (base.fps >= AT_SCREEN_PACE_FPS) {
    return 'Every frame is ready in time for the screen (' + Math.round(base.fps) + ' a second, the game\'s code ' + base.work.toFixed(1)
      + ' ms of each): nothing is holding the frame rate back here.';
  }
  return base.work < 0.5 * base.p50
    ? 'Most of each frame (' + base.p50.toFixed(0) + ' ms) is the graphics chip\'s, not the game\'s code: drawing less helps most.'
    : 'The game\'s own code takes most of each frame (' + base.p50.toFixed(0) + ' ms): the code is what to speed up.';
}

/** Run it: about 35 s.  Resolves with the result (also window.__btSpeedTest). */
export async function runSpeedTest() {
  if (_running) return null;
  _running = true;
  const was = snapshot();
  const list = steps();
  const ms = stepMs();
  const rows = [];
  try {
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      showProgress(i, list.length, s.label);
      apply(s.off, was);
      await wait(Math.min(SETTLE_MS, ms));
      const m = await measure(ms);
      rows.push({ k: s.k, label: s.label, ...m });
    }
  } finally {
    restore(was);
    _running = false;
  }
  const base = rows[0];
  const notes = [];
  /* v2.3.3440: a step that puts back an old way is not a setting to switch
     off, so it is never "the biggest gain"; it says what the new way saves */
  const isOld = (x) => !!(list.find((st) => st.k === x.k) || {}).old;
  const best = rows.slice(1).filter((x) => !isOld(x)).reduce((a, x) => (!a || x.fps > a.fps ? x : a), null);
  const oldProg = rows.find((x) => x.k === 'threeprog');
  if (base && best && best.fps - base.fps >= 4) notes.push('The biggest gain: ' + best.label.toLowerCase() + ' (+' + (best.fps - base.fps).toFixed(0) + ' frames a second).');
  if (base && oldProg && base.fps - oldProg.fps >= 2) {
    notes.push('Drawing with one program instead of three saves ' + (base.fps - oldProg.fps).toFixed(0) + ' frames a second here ('
      + base.draws.toFixed(0) + ' draws a frame, the old way ' + oldProg.draws.toFixed(0) + ').');
  } else if (base && oldProg && oldProg.fps - base.fps >= 2) {
    notes.push('The old way (three programs) was ' + (oldProg.fps - base.fps).toFixed(0) + ' frames a second faster here: please send this card.');
  }
  if (rows.length && rows.every((x) => x.fps < 33) && Math.max(...rows.map((x) => x.fps)) - Math.min(...rows.map((x) => x.fps)) < 4) {
    notes.push('Every setting ran at about 30: Low Power Mode, or a hot phone, may be holding the frame rate at 30.');
  }
  if (base) {
    notes.push('The game\'s own work: ' + (base.work != null ? base.work.toFixed(1) + ' ms a frame' : 'not measured')
      + '; the graphics chip switched pictures ' + base.passes.toFixed(1) + ' times a frame, with ' + base.draws.toFixed(0) + ' draws.');
    const held = frameNote(base);
    if (held) notes.push(held);
  }
  const dev = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  const cv = document.querySelector('.brotown-canvas');
  const device = 'Screen ' + window.innerWidth + ' x ' + window.innerHeight + ' at ' + dev + 'x'
    + (cv ? ', drawn ' + cv.width + ' x ' + cv.height + ' px' : '')
    + (renderDpr() < dev ? ' (lowered to ' + renderDpr() + 'x)' : '')
    + (/iPhone|iPad/.test(navigator.userAgent || '') ? ', iOS' : '');
  const result = { rows, notes, device, at: Date.now() };
  try { window.__btSpeedTest = result; } catch (e) { /* QA only */ }
  showResult(result);
  return result;
}

export function speedTestRunning() { return _running; }
