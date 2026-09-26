/* ═══ v2.3.2930: A STUCK ARROW IS PINNED TO THE ART, AND RIDES THE ANIMATION ═══
 *
 * Owner: "All of the arrows stuck in the monsters will need to be matched up
 * to the sprite art frames.  Right now it's sticking in invisible spots on
 * the skeleton.  The arrow stuck areas should also follow the monster
 * animation.  So if it is stuck in the arm and the arm swings with the
 * animation it should swing with it."
 *
 * WHAT IT WAS.  projectiles.js stores a stuck arrow as a fixed WORLD offset
 * from the monster's feet (ox, oy), taken where the arrow's path ended.  That
 * point is wherever the flight line crossed the monster's box -- between a
 * skeleton's ribs, beside a thin arm -- and it never moved: the arm swung
 * away and the arrow stayed in the air.
 *
 * WHAT IT IS.  The first time a stuck arrow is drawn on a body sprite it is
 * PINNED to a texel of the frame on screen: the impact point is taken into the
 * sprite's own texel space, then walked ON along the flight line until it
 * meets opaque art (the arrow kept going into the body), or failing that, the
 * nearest opaque texel.  From then on it is carried frame to frame: whenever
 * the sprite shows a different frame, the little patch of art round the pin
 * is looked for in the new frame near where it was (sum of differences over
 * alpha and brightness, a small window) -- the arm moved, so the pin moves
 * with the arm -- and it is snapped back onto opaque art if the best match
 * fell off it.  The pin is kept in TEXEL space, so the monster's own
 * transform (its walk, its bob, a mirror when it turns, the depth curve)
 * carries the arrow for free; a mirrored turn also mirrors the shaft's angle.
 *
 * Pixels are read once per animation frame (alpha + brightness only, never the
 * whole RGBA) and kept for the last FRAME_CACHE frames.
 */
import { Matrix } from 'pixi.js';
import { relMatrix } from './arrowWound.js';

const FRAME_CACHE = 160;
const _frames = new Map();   /* texture uid -> { w, h, a: Uint8Array, l: Uint8Array } */
const _M = new Matrix();

function frameData(tex) {
  if (!tex || !tex.source) return null;
  const key = tex.uid;
  let fd = _frames.get(key);
  if (fd) { _frames.delete(key); _frames.set(key, fd); return fd; }   /* LRU touch */
  const src = tex.source.resource, fr = tex.frame;
  if (!src || !fr || typeof document === 'undefined') return null;
  const w = Math.round(fr.width), h = Math.round(fr.height);
  if (w < 2 || h < 2) return null;
  let px;
  try {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(src, Math.round(fr.x), Math.round(fr.y), w, h, 0, 0, w, h);
    px = g.getImageData(0, 0, w, h).data;
  } catch (e) { return null; }
  const a = new Uint8Array(w * h), l = new Uint8Array(w * h);
  for (let i = 0, j = 0; j < a.length; i += 4, j++) {
    a[j] = px[i + 3];
    l[j] = (px[i] * 77 + px[i + 1] * 150 + px[i + 2] * 29) >> 8;
  }
  fd = { w, h, a, l };
  _frames.set(key, fd);
  if (_frames.size > FRAME_CACHE) _frames.delete(_frames.keys().next().value);
  return fd;
}

const solid = (fd, x, y) => x >= 0 && y >= 0 && x < fd.w && y < fd.h && fd.a[(y | 0) * fd.w + (x | 0)] > 150;

/* the nearest opaque texel to (x, y), out to R; null if none */
function nearestSolid(fd, x, y, R) {
  const cx = Math.round(x), cy = Math.round(y);
  if (solid(fd, cx, cy)) return [cx, cy];
  for (let r = 1; r <= R; r++) {
    let best = null, bd = Infinity;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      if (!solid(fd, cx + dx, cy + dy)) continue;
      const d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = [cx + dx, cy + dy]; }
    }
    if (best) return best;
  }
  return null;
}

/* where the patch round (u, v) in `from` went in `to`, searched within R */
function track(from, to, u, v, R) {
  const P = 4;
  let best = null, bs = Infinity;
  const U = Math.round(u), V = Math.round(v);
  for (let dy = -R; dy <= R; dy++) {
    for (let dx = -R; dx <= R; dx++) {
      let sad = 0;
      for (let py = -P; py <= P; py++) {
        const fy = V + py, ty = V + dy + py;
        for (let px = -P; px <= P; px++) {
          const fx = U + px, tx = U + dx + px;
          const fi = (fy >= 0 && fx >= 0 && fy < from.h && fx < from.w) ? fy * from.w + fx : -1;
          const ti = (ty >= 0 && tx >= 0 && ty < to.h && tx < to.w) ? ty * to.w + tx : -1;
          const fa = fi >= 0 ? from.a[fi] : 0, ta = ti >= 0 ? to.a[ti] : 0;
          const fl = fi >= 0 ? from.l[fi] : 0, tl = ti >= 0 ? to.l[ti] : 0;
          sad += Math.abs(fa - ta) * 1.5 + (fa > 100 && ta > 100 ? Math.abs(fl - tl) : 0);
        }
        if (sad >= bs) break;
      }
      /* a small preference for staying put, so a flat patch does not wander */
      sad += (dx * dx + dy * dy) * 6;
      if (sad < bs) { bs = sad; best = [U + dx, V + dy]; }
    }
  }
  return best;
}

/* texel (u, v) of `tex` -> the sprite's local space */
function texelToLocal(body, tex, u, v) {
  const ow = (tex.orig && tex.orig.width) || tex.frame.width, oh = (tex.orig && tex.orig.height) || tex.frame.height;
  const tx = tex.trim ? tex.trim.x : 0, ty = tex.trim ? tex.trim.y : 0;
  const ax = body.anchor ? body.anchor.x : 0, ay = body.anchor ? body.anchor.y : 0;
  return [u + 0.5 + tx - ax * ow, v + 0.5 + ty - ay * oh];
}

/**
 * Place stuck arrow `sa` on `body` this frame.  (wx, wy) is where the arrow
 * would be drawn without a pin (the monster's feet + its stored offset), in
 * `layer`'s space.  Returns { x, y, ang } in `layer` space, or null to keep
 * the unpinned placement (no pixels yet, nothing opaque near it).
 */
export function pinnedArrow(sa, body, layer, wx, wy) {
  const tex = body && body.texture;
  if (!tex || !tex.source || !layer) return null;
  if (!relMatrix(body, layer, _M)) return null;
  const fd = frameData(tex);
  if (!fd) return null;
  const flipNow = (_M.a * _M.d - _M.b * _M.c) < 0;
  let pin = sa._pin;
  if (!pin) {
    /* world -> texel: invert the body's transform */
    const inv = _M.clone().invert();
    const lx = inv.a * wx + inv.c * wy + inv.tx, ly = inv.b * wx + inv.d * wy + inv.ty;
    const ow = (tex.orig && tex.orig.width) || tex.frame.width, oh = (tex.orig && tex.orig.height) || tex.frame.height;
    const tx0 = tex.trim ? tex.trim.x : 0, ty0 = tex.trim ? tex.trim.y : 0;
    const ax = body.anchor ? body.anchor.x : 0, ay = body.anchor ? body.anchor.y : 0;
    let u = lx - tx0 + ax * ow - 0.5, v = ly - ty0 + ay * oh - 0.5;
    /* on along the flight line into the body (in texel space) */
    const dwx = Math.cos(sa.ang), dwy = Math.sin(sa.ang);
    let du = inv.a * dwx + inv.c * dwy, dv = inv.b * dwx + inv.d * dwy;
    const dl = Math.hypot(du, dv) || 1; du /= dl; dv /= dl;
    let hit = null;
    const reach = Math.max(12, Math.round(fd.h * 0.35));
    for (let s = 0; s <= reach && !hit; s++) {
      const x = u + du * s, y = v + dv * s;
      if (solid(fd, x, y)) hit = [Math.round(x), Math.round(y)];
    }
    if (!hit) hit = nearestSolid(fd, u, v, Math.max(10, Math.round(fd.h * 0.3)));
    if (!hit) return null;
    /* a little way INTO the art, so the shaft's cut end is not on the rim */
    const deeper = [hit[0] + Math.round(du * 1.5), hit[1] + Math.round(dv * 1.5)];
    pin = sa._pin = { tex, u: solid(fd, deeper[0], deeper[1]) ? deeper[0] : hit[0], v: solid(fd, deeper[0], deeper[1]) ? deeper[1] : hit[1], flip: flipNow };
  } else if (pin.tex !== tex) {
    /* the frame changed: carry the pin with the art */
    const from = frameData(pin.tex);
    let nu = pin.u, nv = pin.v;
    if (from) {
      const R = Math.max(5, Math.min(18, Math.round(fd.h * 0.09)));
      const t = track(from, fd, pin.u, pin.v, R);
      if (t) { nu = t[0]; nv = t[1]; }
    } else {
      /* the old frame fell out of the cache: same texel, scaled if the frame size changed */
      nu = pin.u; nv = pin.v;
    }
    const on = nearestSolid(fd, nu, nv, Math.max(6, Math.round(fd.h * 0.12)));
    if (on) { nu = on[0]; nv = on[1]; }
    pin.tex = tex; pin.u = nu; pin.v = nv;
  }
  const [lx, ly] = texelToLocal(body, tex, pin.u, pin.v);
  const x = _M.a * lx + _M.c * ly + _M.tx, y = _M.b * lx + _M.d * ly + _M.ty;
  /* turned round since it was pinned: the shaft turns with the body */
  const ang = (flipNow !== pin.flip) ? Math.PI - sa.ang : sa.ang;
  return { x, y, ang };
}

/** QA probe: how many frames are cached. */
export function arrowPinStats() { return { frames: _frames.size }; }
/** QA probe: is this arrow's pin on opaque art in the frame it is pinned to? */
export function arrowPinOnArt(sa) {
  const pin = sa && sa._pin;
  if (!pin) return null;
  const fd = frameData(pin.tex);
  return fd ? { u: pin.u, v: pin.v, tex: pin.tex.uid, onArt: solid(fd, pin.u, pin.v) } : null;
}
