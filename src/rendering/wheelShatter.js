/* ═══ v2.3.2995: AN OBJECT SHATTERS INTO ITS OWN PIECES ═══
 *
 * Owner, 2026-10-03: "Maybe after too many shots it shatters into pieces
 * using code."  When one of the Wheel's objects breaks (src/game/wheelBreak.js)
 * its picture is cut, here, into shards of itself -- the art it was drawn
 * with, cut along irregular lines -- which fly apart from where the last blow
 * landed, fall, bounce and lie in a heap where it stood until it is mended.
 *
 *   THE CUT     a Voronoi split of the picture: seeds scattered over its
 *               solid pixels, thicker round the blow, each shard the part of
 *               the picture nearer its seed than any other.  Each shard is
 *               drawn ONCE into one canvas for the whole break (so they
 *               share one texture and draw in one batch), with a hairline of
 *               shadow along its cut edges so the pieces read as pieces.
 *   THE FALL    every shard starts exactly where it was in the picture,
 *               at its height above the ground, and falls under gravity in
 *               the 3/4 view (a height above a ground point, like the hit
 *               debris in hitMaterialFx.js): pushed away from the blow, out
 *               from the middle, up a little -- a building mostly comes
 *               DOWN.  Each lands on a ground point spread over the object's
 *               own footprint, the high pieces furthest back, bounces once
 *               and settles, lying a little flatter.
 *   THE HEAP    stays while the object is broken, sorted into the scene by
 *               where each piece lies (the depth pass reads `_groundDy`, the
 *               way a figure's feet are found), a shade darker, dusty.
 *   THE DUST    a cloud of soft puffs in the material's colour rolls out
 *               from the foot -- for a building, a big one.
 *   THE MENDING fades the heap away (wheelObjects fades the object in).
 *
 * Memory: one canvas a break, as big as the shards' boxes (about 1.3x the
 * picture); all of them together are held under HEAP_PX pixels, the oldest
 * heap fading early past that.  Everything goes on leaving the Wheel.
 */
import { Container, Sprite, Texture, Rectangle, CanvasSource } from 'pixi.js';

const G = 0.42;              /* gravity, world px per frame^2 at 60 Hz */
const HEAP_PX = 6e6;         /* every heap's canvases together, pixels */
const FADE_MS = 1200;        /* a heap fading at its mending */
const PAD = 2;               /* px between shards in the canvas */
const DEPTH = 0.55;          /* ground-plane foreshortening, as hitMaterialFx */
const DUST_FRONT = 40;       /* the dust sorts this far in front of the heap */

let _puff = null;
function puffTex() {
  if (_puff && !_puff.destroyed) return _puff;
  const c = document.createElement('canvas'); c.width = c.height = 48;
  const g = c.getContext('2d');
  for (const [x, y, r] of [[19, 27, 15], [30, 25, 16], [24, 17, 14]]) {
    const rg = g.createRadialGradient(x, y - 4, 1, x, y, r);
    rg.addColorStop(0, 'rgba(255,255,255,0.95)');
    rg.addColorStop(0.7, 'rgba(228,226,222,0.75)');
    rg.addColorStop(1, 'rgba(210,208,204,0)');
    g.fillStyle = rg; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  _puff = new Texture({ source: new CanvasSource({ resource: c, width: 48, height: 48, resolution: 1, scaleMode: 'linear' }) });
  return _puff;
}

/* the frame of `tex` in its source's own pixels (a page made at meta.scale 2
   holds two pixels for every unit of its frames: Spritesheet divides) */
export function framePx(tex) {
  const fr = tex && tex.frame, src = tex && tex.source;
  if (!fr || !src) return null;
  const r = src.resolution || 1;
  return { x: Math.round(fr.x * r), y: Math.round(fr.y * r), w: Math.round(fr.width * r), h: Math.round(fr.height * r), res: r };
}

/* ── the cut ── */
/* clip convex polygon `poly` ([[x,y]...]) to the half-plane a*x + b*y <= c */
function clipHalf(poly, a, b, c) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    const dp = a * p[0] + b * p[1] - c, dq = a * q[0] + b * q[1] - c;
    if (dp <= 0) out.push(p);
    if ((dp < 0 && dq > 0) || (dp > 0 && dq < 0)) {
      const t = dp / (dp - dq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  }
  return out;
}
/* every seed's cell within the w x h rectangle */
function voronoi(seeds, w, h) {
  const cells = [];
  for (let i = 0; i < seeds.length; i++) {
    let poly = [[0, 0], [w, 0], [w, h], [0, h]];
    const si = seeds[i];
    for (let j = 0; j < seeds.length && poly.length; j++) {
      if (j === i) continue;
      const sj = seeds[j];
      /* nearer si than sj:  (sj - si) . p <= (|sj|^2 - |si|^2) / 2 */
      const a = sj[0] - si[0], b = sj[1] - si[1];
      const c = (sj[0] * sj[0] + sj[1] * sj[1] - si[0] * si[0] - si[1] * si[1]) / 2;
      poly = clipHalf(poly, a, b, c);
    }
    if (poly.length >= 3) cells.push({ poly, seed: si });
  }
  return cells;
}

/**
 * Cut the picture `tex` into shards.  `n` how many; (hu, hv) the blow, in the
 * frame's own pixels (null: none).  Returns { canvas, shards: [{ rect, cx, cy,
 * area }] } -- each shard's box in the canvas and its middle in the frame --
 * or null when the picture cannot be read.
 */
function cutPicture(tex, n, hu, hv) {
  const fp = framePx(tex);
  const src = tex && tex.source && tex.source.resource;
  if (!fp || !src || fp.w < 4 || fp.h < 4 || typeof document === 'undefined') return null;
  const FW = fp.w, FH = fp.h;
  const pic = document.createElement('canvas'); pic.width = FW; pic.height = FH;
  const pg = pic.getContext('2d');
  try { pg.drawImage(src, fp.x, fp.y, FW, FH, 0, 0, FW, FH); } catch (e) { return null; }
  /* where the picture is solid, at a quarter size (seeds and empty cells) */
  const Q = 4, qw = Math.max(1, Math.ceil(FW / Q)), qh = Math.max(1, Math.ceil(FH / Q));
  let alpha;
  try {
    const qc = document.createElement('canvas'); qc.width = qw; qc.height = qh;
    const qg = qc.getContext('2d', { willReadFrequently: true });
    qg.drawImage(pic, 0, 0, qw, qh);
    const d = qg.getImageData(0, 0, qw, qh).data;
    alpha = new Uint8Array(qw * qh);
    for (let i = 0; i < alpha.length; i++) alpha[i] = d[i * 4 + 3];
  } catch (e) { return null; }
  const solid = (x, y) => { const qx = (x / Q) | 0, qy = (y / Q) | 0; return qx >= 0 && qy >= 0 && qx < qw && qy < qh && alpha[qy * qw + qx] > 120; };
  /* the seeds: on solid art, a third of them crowded round the blow */
  const seeds = [];
  const near = hu != null && hv != null ? Math.round(n * 0.35) : 0;
  const R = Math.max(FW, FH) * 0.22;
  for (let tries = 0; seeds.length < n && tries < n * 60; tries++) {
    let x, y;
    if (seeds.length < near) {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * R;
      x = hu + Math.cos(a) * r; y = hv + Math.sin(a) * r;
    } else { x = Math.random() * FW; y = Math.random() * FH; }
    if (x < 0 || y < 0 || x >= FW || y >= FH || !solid(x, y)) continue;
    seeds.push([x, y]);
  }
  if (seeds.length < 2) return null;
  const cells = voronoi(seeds, FW, FH);
  /* each cell's box, kept if any of it is solid */
  const keep = [];
  for (const c of cells) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of c.poly) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
    x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0));
    x1 = Math.min(FW, Math.ceil(x1)); y1 = Math.min(FH, Math.ceil(y1));
    if (x1 - x0 < 2 || y1 - y0 < 2) continue;
    let on = 0, sx = 0, sy = 0;
    for (let y = y0; y < y1; y += Q) for (let x = x0; x < x1; x += Q) if (solid(x, y)) { on++; sx += x; sy += y; }
    if (!on) continue;
    keep.push({ poly: c.poly, x0, y0, w: x1 - x0, h: y1 - y0, cx: sx / on, cy: sy / on, area: on * Q * Q });
  }
  if (!keep.length) return null;
  /* pack the boxes into one canvas, tallest first, in shelves */
  keep.sort((a, b) => b.h - a.h);
  const W = Math.min(4096, Math.max(64, Math.ceil(Math.sqrt(keep.reduce((s, k) => s + (k.w + PAD) * (k.h + PAD), 0)) * 1.15)));
  let x = PAD, y = PAD, rowH = 0;
  for (const k of keep) {
    if (x + k.w + PAD > W) { x = PAD; y += rowH + PAD; rowH = 0; }
    k.ax = x; k.ay = y;
    x += k.w + PAD; rowH = Math.max(rowH, k.h);
  }
  const H = Math.min(4096, y + rowH + PAD);
  const can = document.createElement('canvas'); can.width = W; can.height = H;
  const g = can.getContext('2d');
  for (const k of keep) {
    if (k.ay + k.h > H) continue;
    g.save();
    g.translate(k.ax - k.x0, k.ay - k.y0);
    g.beginPath();
    k.poly.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py)));
    g.closePath();
    g.save(); g.clip();
    g.drawImage(pic, 0, 0);
    g.restore();
    /* the cut edge: a hairline of shadow on the shard's own pixels only */
    g.globalCompositeOperation = 'source-atop';
    g.lineWidth = Math.max(1.5, FH / 220);
    g.strokeStyle = 'rgba(20,14,10,0.42)';
    g.stroke();
    g.restore();
    k.ok = true;
  }
  return { canvas: can, shards: keep.filter((k) => k.ok), FW, FH, res: fp.res };
}

/**
 * The heaps, one per broken object.  `layer` is the sorted entity layer.
 */
export class WheelShatter {
  constructor(layer) {
    this.layer = layer;
    this.heaps = new Map();      /* object index -> heap */
    this.stats = { breaks: 0, shards: 0, px: 0, cutMs: 0, live: 0 };
  }

  /**
   * Break object `oi`, drawn with `tex`.  `o`: { x, y (its foot), ax (the
   * anchor across the picture), ks (its scale), flip, hitX, hitY (the blow,
   * world; null for none), ang (the blow's heading), weapon, as ('building' |
   * 'tree' | 'big' | 'small'), depth (its footprint's depth), dust (a tint) }.
   */
  add(oi, tex, o) {
    this.remove(oi, true);
    const t0 = performance.now();
    const fp = framePx(tex);
    if (!fp) return false;
    const ks = o.ks || 1, res = fp.res;
    const cs = ks / res;                       /* world px per picture pixel */
    const sx = o.flip ? -cs : cs;
    const W = fp.w, H = fp.h;
    /* the blow, in the picture's pixels */
    let hu = null, hv = null;
    if (Number.isFinite(o.hitX) && Number.isFinite(o.hitY)) {
      hu = (o.hitX - o.x) / sx + o.ax * W;
      hv = (o.hitY - o.y) / cs + H;
    }
    /* how many shards: a building into enough to read as rubble, not as a
       picture in a few big pieces (22 did -- the owner's bank lay in slabs) */
    const n = o.as === 'building' ? 32 : o.as === 'tree' ? 14 : o.as === 'big' ? 12 : (H * cs > 70 ? 9 : 6);
    const cut = cutPicture(tex, n, hu, hv);
    if (!cut) return false;
    const px = cut.canvas.width * cut.canvas.height;
    this._makeRoom(px);
    const source = new CanvasSource({ resource: cut.canvas, width: cut.canvas.width, height: cut.canvas.height, resolution: 1, scaleMode: 'linear' });
    const heap = { oi, source, px, t0: performance.now(), fadeAt: 0, shards: [], dust: [], x: o.x, y: o.y };
    const D = Math.max(6, o.depth || 12);
    const dir = Number.isFinite(o.ang) ? o.ang : -Math.PI / 2;
    const push = o.weapon === 'bolt' ? 2.6 : o.weapon === 'sword' ? 2.0 : 1.6;
    const tall = H * cs;
    for (const k of cut.shards) {
      const tex2 = new Texture({ source, frame: new Rectangle(k.ax, k.ay, k.w, k.h) });
      const spr = new Sprite(tex2);
      spr.label = 'wheelShard';
      spr.anchor.set(((k.cx - k.x0) / k.w), ((k.cy - k.y0) / k.h));
      spr.scale.set(sx, cs);
      /* where this piece is in the world now: its middle, as drawn */
      const wx = o.x + (k.cx - o.ax * W) * sx;
      const wy = o.y + (k.cy - H) * cs;
      const up = o.y - wy;                     /* its height above the foot line */
      /* where it will lie: spread over the footprint, high pieces further back */
      const back = Math.random() * D * Math.min(1, up / Math.max(1, tall));
      /* (never north of where it is drawn now: it would have to start below
         the ground) */
      const gy = Math.max(wy, o.y - back + (Math.random() - 0.35) * Math.min(26, D * 0.6));
      const s = { spr, x: wx, gy, z: Math.max(0, gy - wy), vx: 0, vy: 0, vz: 0, rot: 0, vr: 0, landed: false, bounced: false, sy: 1 };
      /* away from the blow and out from the middle, a little up */
      const mx = wx - (o.x + (W * (0.5 - o.ax)) * sx);
      const out = Math.sign(mx || (Math.random() - 0.5)) * (0.4 + Math.random() * 0.9) * (o.as === 'building' ? 0.7 : 1);
      let bx = 0, by = 0;
      if (hu != null) {
        const hx = o.x + (hu - o.ax * W) * sx, hy = o.y + (hv - H) * cs;
        const dx = wx - hx, dy = wy - hy, dl = Math.hypot(dx, dy) || 1;
        const near = Math.max(0, 1 - dl / Math.max(40, tall * 0.6));
        bx = (dx / dl) * push * (0.4 + near * 1.6) + Math.cos(dir + Math.PI) * push * near;
        by = Math.sin(dir + Math.PI) * push * near * DEPTH;
      }
      s.vx = out + bx + (Math.random() - 0.5) * 0.8;
      s.vy = by + (Math.random() - 0.4) * 0.9 * DEPTH;
      s.vz = (o.as === 'building' ? 0.3 : 1.2) + Math.random() * (o.as === 'building' ? 1.2 : 2.6);
      s.vr = (Math.random() - 0.5) * (o.as === 'building' ? 0.06 : 0.18);
      spr.x = s.x; spr.y = s.gy - s.z; spr._groundDy = s.z;
      this.layer.addChild(spr);
      heap.shards.push(s);
    }
    /* the dust that rolls out from its foot -- sorted IN FRONT of the heap
       (DUST_FRONT past its foot line), or the shards falling through it hide
       it: the first collapse showed none */
    const nd = o.as === 'building' ? 18 : o.as === 'tree' || o.as === 'big' ? 9 : 5;
    const span = Math.max(16, W * cs * 0.5);
    for (let i = 0; i < nd; i++) {
      const spr = new Sprite(puffTex());
      spr.anchor.set(0.5);
      spr.tint = o.dust != null ? o.dust : 0xd6d0c4;
      spr.alpha = 0;
      const d = { spr, x: o.x + (Math.random() * 2 - 1) * span, gy: o.y + (Math.random() - 0.2) * 22,
        z: Math.random() * Math.min(tall * 0.45, 70), vx: (Math.random() * 2 - 1) * 0.7, vz: 0.2 + Math.random() * 0.35,
        r0: (o.as === 'building' ? 34 : o.as === 'small' ? 11 : 18) * (0.7 + Math.random() * 0.6),
        life: 1600 + Math.random() * 1800, delay: Math.random() * (o.as === 'building' ? 600 : 200) };
      d.x0 = d.x;
      spr.x = d.x; spr.y = d.gy - d.z; spr._groundDy = d.z + DUST_FRONT;
      this.layer.addChild(spr);
      heap.dust.push(d);
    }
    this.heaps.set(oi, heap);
    this.stats.breaks++;
    this.stats.shards += heap.shards.length;
    this.stats.cutMs = Math.round((performance.now() - t0) * 10) / 10;
    this._count();
    return true;
  }

  /* past HEAP_PX, the oldest heaps fade early */
  _makeRoom(px) {
    let tot = px;
    for (const h of this.heaps.values()) if (!h.fadeAt) tot += h.px;
    if (tot <= HEAP_PX) return;
    const old = [...this.heaps.values()].filter((h) => !h.fadeAt).sort((a, b) => a.t0 - b.t0);
    for (const h of old) {
      if (tot <= HEAP_PX) break;
      h.fadeAt = performance.now();
      tot -= h.px;
    }
  }

  /** The object is mended: its heap fades (`now`: at once). */
  remove(oi, now) {
    const h = this.heaps.get(oi);
    if (!h) return;
    if (now) { this._destroy(h); this.heaps.delete(oi); this._count(); return; }
    if (!h.fadeAt) h.fadeAt = performance.now();
  }

  update(dtMs) {
    if (!this.heaps.size) return;
    const f = Math.min(3, Math.max(0, dtMs) / 16.667);
    const now = performance.now();
    for (const [oi, h] of this.heaps) {
      const fade = h.fadeAt ? Math.max(0, 1 - (now - h.fadeAt) / FADE_MS) : 1;
      if (h.fadeAt && fade <= 0) { this._destroy(h); this.heaps.delete(oi); continue; }
      for (const s of h.shards) {
        if (!s.landed) {
          s.vz -= G * f;
          s.x += s.vx * f; s.gy += s.vy * f; s.z += s.vz * f;
          s.rot += s.vr * f;
          if (s.z <= 0) {
            s.z = 0;
            if (!s.bounced && s.vz < -2.2) {
              /* one bounce, slower, skidding */
              s.bounced = true; s.vz = -s.vz * 0.22; s.vx *= 0.5; s.vy *= 0.5; s.vr *= 0.5;
            } else {
              s.landed = true; s.vz = 0; s.vx *= 0.3; s.vy *= 0.3;
            }
          }
        } else if (s.vx || s.vy) {
          const k = Math.pow(0.82, f);
          s.vx *= k; s.vy *= k; s.vr *= k;
          s.x += s.vx * f; s.gy += s.vy * f; s.rot += s.vr * f;
          if (Math.abs(s.vx) + Math.abs(s.vy) < 0.03) { s.vx = 0; s.vy = 0; }
        }
        /* lying on the ground it is seen a little flatter, and dusty */
        if (s.landed && s.sy > 0.8) s.sy = Math.max(0.8, s.sy - 0.02 * f);
        const spr = s.spr;
        spr.x = s.x; spr.y = s.gy - s.z; spr._groundDy = s.z;
        spr.rotation = s.rot;
        spr.scale.y = Math.abs(spr.scale.x) * s.sy;
        if (s.landed && spr.tint !== 0xd9d4cc) spr.tint = 0xd9d4cc;
        spr.alpha = fade;
      }
      for (let i = h.dust.length - 1; i >= 0; i--) {
        const d = h.dust[i];
        const age = now - h.t0 - d.delay;
        if (age < 0) continue;
        if (age >= d.life) { d.spr.destroy(); h.dust.splice(i, 1); continue; }
        const t = age / d.life;
        d.x = d.x0 + d.vx * age * 0.06;
        d.z += d.vz * f * (1 - t);
        const sc = (d.r0 * (1 + t * 1.6)) / 24;
        d.spr.scale.set(sc, sc * 0.8);
        d.spr.x = d.x; d.spr.y = d.gy - d.z; d.spr._groundDy = d.z + DUST_FRONT;
        d.spr.alpha = (t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85) * 0.72 * fade;
      }
    }
    this._count();
  }

  _destroy(h) {
    for (const s of h.shards) {
      const t = s.spr.texture;
      try { s.spr.destroy(); } catch (e) { /* gone */ }
      try { if (t) t.destroy(false); } catch (e) { /* gone */ }
    }
    for (const d of h.dust) { try { d.spr.destroy(); } catch (e) { /* gone */ } }
    h.shards.length = 0; h.dust.length = 0;
    try { h.source.destroy(); } catch (e) { /* gone */ }
  }

  _count() {
    let px = 0, live = 0;
    for (const h of this.heaps.values()) { px += h.px; live += h.shards.length; }
    this.stats.px = px; this.stats.live = live;
  }

  /** What is lying where, for the tests: per heap, its shards' state. */
  probe() {
    const out = [];
    for (const [oi, h] of this.heaps) {
      let landed = 0, minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity, layers = new Set();
      for (const s of h.shards) {
        if (s.landed) landed++;
        if (s.gy < minY) minY = s.gy; if (s.gy > maxY) maxY = s.gy;
        if (s.x < minX) minX = s.x; if (s.x > maxX) maxX = s.x;
        if (s.spr.parent) layers.add(s.spr.parent.label || '?');
      }
      out.push({ oi, shards: h.shards.length, landed, dust: h.dust.length, fading: !!h.fadeAt, px: h.px,
        x: h.x, y: h.y, spanX: [Math.round(minX), Math.round(maxX)], spanY: [Math.round(minY), Math.round(maxY)], layers: [...layers] });
    }
    return out;
  }

  clear() {
    for (const h of this.heaps.values()) this._destroy(h);
    this.heaps.clear();
    this._count();
  }

  destroy() {
    this.clear();
    if (_puff) { try { _puff.destroy(true); } catch (e) { /* gone */ } _puff = null; }
  }
}
