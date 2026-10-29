/* ═══ v2.3.3852: EVERY FRAME, IS EACH HEAD PIECE YOU WEAR DRAWN? ═══
 *
 * The owner, 2026-10-29: "For disappearing traits sometimes it's a flicker",
 * and "keep trying to patch the causes of any flicker or missing traits
 * first."  The head-piece watch (entityRenderer _watchOwnHead, v2.3.3689)
 * reports a piece hidden for 2.5 s; a flicker is one frame, or a few.  So,
 * on a QA page (`?headframes` in the address; nothing at all otherwise), the
 * moment before each frame is drawn (pixiRenderer, beside app.render, the
 * renderer's own clock) this asks of your bro's every worn piece -- the hat,
 * the hair, the beard, the glasses, the eye style -- whether it is on screen:
 *   - on the walking figure, or on the stand-in that draws you while you
 *     swing, shoot or gather (effectsRenderer.skillTraits) -- either counts;
 *   - shown all the way up (every parent visible, renderable, not see-through),
 *   - with a picture that can draw (not freed, not the empty one, not 0 x 0,
 *     its source not freed).
 * A facing the piece does not ship ('design': a beard from behind) and a
 * roll frame with no head (flipHead.js) are not counted, nor a frame where
 * the whole bro is not drawn (a death, a zone's loading).  Every miss is
 * counted by its piece and its reason, the last 60 kept with the pose,
 * facing and frame: `window.__btHeadFrames()`, `window.__btHeadFrames(true)`
 * to start again.  mp-headframes plays a phone through it.
 */
import { Texture } from 'pixi.js';

export const HEAD_FRAMES_ON = typeof window !== 'undefined' && /[?&]headframes(=|&|$)/.test((window.location && window.location.search) || '');

/* the walking figure's sprite -> the stand-in set's (effectsRenderer) */
const PIECES = [
  ['headwear', '_headwearSprite', 'hat'],
  ['hair', '_hairSprite', 'hair'],
  ['facialhair', '_facialHairSprite', 'beard'],
  ['eyewear', '_eyewearSprite', 'eyewear'],
  ['eyestyle', '_eyeStyleSprite', 'eyestyle'],
];
const _hf = { frames: 0, counted: 0, missed: 0, byWhy: Object.create(null), log: [], bodyGone: 0 };

/* why `sp` draws nothing this frame, or null when it draws */
function whyNotDrawn(sp, stage) {
  if (!sp || sp.destroyed) return 'gone';
  if (!sp.visible) return 'hidden:' + (sp._btHide || '?');
  for (let p = sp.parent; p; p = p.parent) {
    if (!p.visible || p.renderable === false) return 'parent';
    if (p.alpha <= 0) return 'parent-alpha';
    if (p === stage) break;
  }
  if (!sp.parent) return 'unparented';
  if (sp.alpha <= 0.01) return 'alpha';
  const t = sp.texture;
  if (!t || t === Texture.EMPTY) return 'tex-empty';
  if (t.destroyed) return 'tex-freed';
  const s = t.source;
  if (!s || s.destroyed) return 'src-freed';
  if (!(t.frame && t.frame.width > 1 && t.frame.height > 1) || !(s.width > 1 && s.height > 1)) return 'tex-0';
  return null;
}

/**
 * Once a frame, before app.render.  `worn`: { headwear, hair, facialhair,
 * eyewear, eyestyle } -> id (entityRenderer's getters).
 */
export function headFrameTick(entityRenderer, effectsRenderer, stage, worn) {
  if (!HEAD_FRAMES_ON) return;
  const d = entityRenderer && entityRenderer.playerDisplay;
  if (!d || d.destroyed || !d._btHeadAt) return;
  _hf.frames++;
  const at = d._btHeadAt;
  const body = d._spriteBody;
  const standIn = effectsRenderer && effectsRenderer.skillTraits;
  /* the bro himself drawn? a walking body, or a stand-in carrying his pieces */
  const standInOn = !!standIn && PIECES.some(([, , k]) => standIn[k] && standIn[k].visible);
  if (!(body && body.visible && !whyNotDrawn(body, stage)) && !standInOn) { _hf.bodyGone++; return; }
  for (const [cat, field, sk] of PIECES) {
    const id = worn[cat];
    if (!id || id === 'none') continue;
    const sp = d[field];
    const hide = sp && sp._btHide;
    if (hide === 'design' || hide === 'dodge') continue;   /* not shipped / no head on this roll frame */
    _hf.counted++;
    const why = whyNotDrawn(sp, stage);
    if (!why) continue;
    const alt = standIn && standIn[sk];
    if (alt && !whyNotDrawn(alt, stage)) continue;   /* the stand-in draws it */
    /* the stand-in is drawing you, in its own facing, which this piece does not ship */
    if (standInOn && alt && !alt.visible && alt._btHide === 'design') continue;
    _hf.missed++;
    const k = cat + ' ' + why;
    _hf.byWhy[k] = (_hf.byWhy[k] || 0) + 1;
    _hf.log.push({ f: _hf.frames, cat, id, why, standIn: alt ? whyNotDrawn(alt, stage) : null, pose: at.pose, dir: at.dir, mirror: at.mirror, frame: at.frameIdx, t: Math.round(performance.now()) });
    if (_hf.log.length > 60) _hf.log.shift();
  }
}

/* ═══ ...AND EVERY OTHER BRO ON SCREEN, AND THE TOWNSFOLK ═══
 * The same question of each other player's walking figure and each
 * townsperson drawn live (lookFolk.js), on the frames that figure's body is
 * drawn and was placed this frame (a peer swinging is drawn by a stand-in of
 * its own: his walking body is hidden then, and not counted). */
const _oth = { frames: 0, counted: 0, missed: 0, byWhy: Object.create(null), log: [], figures: 0 };
export function othersFrameTick(entityRenderer, stage, now) {
  if (!HEAD_FRAMES_ON || !entityRenderer) return;
  _oth.frames++;
  const figs = [];
  if (entityRenderer.otherPlayerDisplays) for (const [id, dsp] of entityRenderer.otherPlayerDisplays) figs.push(['peer ' + id, dsp]);
  if (entityRenderer.npcDisplays) for (const [id, dsp] of entityRenderer.npcDisplays) if (dsp && dsp._folk) figs.push(['folk ' + id, dsp._folk]);
  _oth.figures = figs.length;
  for (const [who, dsp] of figs) {
    if (!dsp || dsp.destroyed) continue;
    const at = dsp._btHeadAt;
    if (!at || at.now !== now) continue;   /* not placed this frame (off screen, culled) */
    const body = dsp._spriteBody;
    if (!body || whyNotDrawn(body, stage)) continue;
    for (const [cat, field] of PIECES) {
      const id = at.worn[cat];
      if (!id || id === 'none') continue;
      const sp = dsp[field];
      const hide = sp && sp._btHide;
      if (hide === 'design' || hide === 'dodge') continue;
      _oth.counted++;
      const why = whyNotDrawn(sp, stage);
      if (!why) continue;
      _oth.missed++;
      const k = cat + ' ' + why;
      _oth.byWhy[k] = (_oth.byWhy[k] || 0) + 1;
      _oth.log.push({ f: _oth.frames, who, cat, id, why, pose: at.pose, dir: at.dir, mirror: at.mirror, frame: at.frameIdx });
      if (_oth.log.length > 60) _oth.log.shift();
    }
  }
}

if (HEAD_FRAMES_ON && typeof window !== 'undefined') {
  window.__btHeadOthers = (reset) => {
    const out = { frames: _oth.frames, figures: _oth.figures, counted: _oth.counted, missed: _oth.missed, byWhy: { ..._oth.byWhy }, log: _oth.log.slice() };
    if (reset) { _oth.frames = 0; _oth.counted = 0; _oth.missed = 0; _oth.byWhy = Object.create(null); _oth.log = []; }
    return out;
  };
  window.__btHeadFrames = (reset) => {
    const out = { on: true, frames: _hf.frames, counted: _hf.counted, missed: _hf.missed, bodyGone: _hf.bodyGone, byWhy: { ..._hf.byWhy }, log: _hf.log.slice() };
    if (reset) { _hf.frames = 0; _hf.counted = 0; _hf.missed = 0; _hf.bodyGone = 0; _hf.byWhy = Object.create(null); _hf.log = []; }
    return out;
  };
}

/* ═══ ...AND WHAT REACHED THE SCREEN ═══
 * A piece can be shown, with a good picture, and still draw nothing -- a
 * stale draw list, a clip that is not ready, a colour row rewritten.  So
 * right after the frame is drawn (pixiRenderer, after app.render) the pixels
 * inside each shown piece's box are read back off the drawing buffer and
 * those in the piece's colour counted (the test names the colours:
 * `window.__btHeadTargets = { headwear: [r, g, b], ... }`).  A frame whose
 * count falls under a quarter of that piece's usual count in the same pose
 * and facing (its running middle value) is a frame it did not reach the
 * screen: counted in `pixelDrops`, the last 40 kept. */
const _px = { frames: 0, looked: 0, drops: 0, byCat: Object.create(null), log: [], base: Object.create(null), shots: [] };
function inColour(r, g, b, t) {
  const tm = Math.max(t[0], t[1], t[2]);
  if (tm < 70) return Math.max(r, g, b) < 80;   /* a dark colour: dark */
  const m = Math.max(r, g, b);
  if (m < 30) return false;
  return Math.abs(r / m - t[0] / tm) + Math.abs(g / m - t[1] / tm) + Math.abs(b / m - t[2] / tm) < 0.3;
}
/* on a dropped frame: what else is drawn over the piece's box -- every shown
   sprite outside your own figure whose bounds cross it, in drawing order (the
   later, the more on top), named by its field, label or picture */
function overlapping(stage, d, sp, box) {
  const out = [];
  let seenSp = false;
  const name = (c) => {
    if (c.label) return c.label;
    for (let p = c.parent; p; p = p.parent) {
      for (const k of Object.keys(p)) { if (k[0] === '_' || k === 'parent') continue; try { if (p[k] === c) return k; } catch (e) { /* none */ } }
      if (p.label) return p.label + '/?';
    }
    const t = c.texture, src = t && t.source;
    return String((src && (src.label || (src.resource && src.resource.src))) || '?').slice(-40);
  };
  const walk = (c) => {
    if (!c || !c.visible || c.renderable === false || c.alpha <= 0 || out.length >= 8) return;
    if (c === sp) { seenSp = true; return; }
    if (c !== d && c !== stage && ((c.texture && c.texture.source) || (c.context && !(c.children && c.children.length)))) {
      let mine = false;
      for (let p = c.parent; p; p = p.parent) if (p === d) { mine = true; break; }
      if (!mine) {
        let b;
        try { b = c.getBounds(); } catch (e) { b = null; }
        if (b && b.maxX > box[0] && b.minX < box[2] && b.maxY > box[1] && b.minY < box[3]) out.push((seenSp ? 'over: ' : 'under: ') + name(c));
      }
    }
    const k = c.children;
    if (k) for (let i = 0; i < k.length; i++) walk(k[i]);
  };
  walk(stage);
  return out.filter((x) => x.startsWith('over')).slice(0, 6);
}
export function headPixelsTick(entityRenderer, effectsRenderer, renderer) {
  if (!HEAD_FRAMES_ON) return;
  const targets = typeof window !== 'undefined' && window.__btHeadTargets;
  const d = entityRenderer && entityRenderer.playerDisplay;
  const gl = renderer && renderer.gl;
  if (!targets || !d || d.destroyed || !gl || !d._btHeadAt) return;
  _px.frames++;
  const at = d._btHeadAt, res = renderer.resolution || 1;
  const H = gl.drawingBufferHeight, W = gl.drawingBufferWidth;
  const standIn = effectsRenderer && effectsRenderer.skillTraits;
  for (const [cat, field, sk] of PIECES) {
    const t = targets[cat];
    /* the walking figure's piece, or the stand-in's while it draws you */
    const own = d[field];
    const alt = standIn && standIn[sk];
    const stage = d.parent && (function top(c) { while (c.parent) c = c.parent; return c; })(d);
    const sp = own && !whyNotDrawn(own, stage) ? own : (alt && !whyNotDrawn(alt, stage) ? alt : null);
    if (!t || !sp) continue;
    const who = sp === own ? '' : 'stand-in ';
    let b;
    try { b = sp.getBounds(); } catch (e) { continue; }
    const x0 = Math.max(0, Math.floor(b.minX * res)), x1 = Math.min(W, Math.ceil(b.maxX * res));
    const y0 = Math.max(0, Math.floor(b.minY * res)), y1 = Math.min(H, Math.ceil(b.maxY * res));
    const w = x1 - x0, h = y1 - y0;
    if (w < 2 || h < 2 || w * h > 250000) continue;
    const buf = new Uint8Array(w * h * 4);
    gl.readPixels(x0, H - y1, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    let n = 0;
    for (let i = 0; i < buf.length; i += 4) if (inColour(buf[i], buf[i + 1], buf[i + 2], t)) n++;
    _px.looked++;
    const key = who + cat + '|' + at.pose + '|' + at.dir + '|' + (at.mirror ? 'm' : '');
    const hist = _px.base[key] || (_px.base[key] = []);
    const mid = hist.length >= 3 ? hist.slice().sort((p, q) => p - q)[hist.length >> 1] : null;
    if (mid != null && mid >= 12 && n < mid * 0.25) {
      _px.drops++;
      _px.byCat[who + cat] = (_px.byCat[who + cat] || 0) + 1;
      _px.log.push({ f: _px.frames, cat: who + cat, n, usual: mid, pose: at.pose, dir: at.dir, mirror: at.mirror, frame: at.frameIdx, box: [x0, y0, w, h], t: Math.round(performance.now()),
        over: overlapping(stage, d, sp, [x0 / res, y0 / res, x1 / res, y1 / res]),
        /* a tint (a hit's flash) turns the piece's colour, not its presence */
        tint: (sp.groupColorAlpha >>> 0).toString(16), figureTint: (d.groupColorAlpha >>> 0).toString(16) });
      if (_px.log.length > 40) _px.log.shift();
      /* the first few: a picture of the head and round it, as drawn */
      if (_px.shots.length < 4) {
        const cx = (x0 + x1) >> 1, cy = (y0 + y1) >> 1, R = 120;
        const sx = Math.max(0, cx - R), sy = Math.max(0, cy - R), sw = Math.min(W, cx + R) - sx, sh = Math.min(H, cy + R) - sy;
        const big = new Uint8Array(sw * sh * 4);
        gl.readPixels(sx, H - (sy + sh), sw, sh, gl.RGBA, gl.UNSIGNED_BYTE, big);
        const cv = document.createElement('canvas');
        cv.width = sw; cv.height = sh;
        const g = cv.getContext('2d'), im = g.createImageData(sw, sh);
        for (let yy = 0; yy < sh; yy++) im.data.set(big.subarray((sh - 1 - yy) * sw * 4, (sh - yy) * sw * 4), yy * sw * 4);
        g.putImageData(im, 0, 0);
        _px.shots.push({ f: _px.frames, cat: who + cat, url: cv.toDataURL('image/png') });
      }
    } else {
      hist.push(n);
      if (hist.length > 15) hist.shift();
    }
  }
}
if (HEAD_FRAMES_ON && typeof window !== 'undefined') {
  window.__btHeadPixels = (reset) => {
    const out = { frames: _px.frames, looked: _px.looked, drops: _px.drops, byCat: { ..._px.byCat }, log: _px.log.slice(), shots: _px.shots.slice() };
    if (reset) { _px.frames = 0; _px.looked = 0; _px.drops = 0; _px.byCat = Object.create(null); _px.log = []; _px.shots = []; }
    return out;
  };
}
