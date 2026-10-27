/* ═══ v2.3.3679: A SLIME'S BLAST LEAVES SOOT ON THE GROUND ═══
 *
 * The owner, 2026-10-27: "It would also be funny if the slime explosions left
 * black soot explosion mark on the ground for a while".
 *
 * (v2.3.2226 took away a "minted radial blob sized to the blast" -- the owner:
 * "remove code drawn impact areas for slime death".  That was a flat disc the
 * size of the hit, read as a warning ring after the fact.  This is the
 * opposite on purpose: a scorch, black at its heart, ragged at its edge, with
 * streaks thrown out from the middle and flecks of char beyond them, lying
 * flat on the ground -- the mess the blast made, not where it could hurt.)
 *
 * ONE picture drawn in code behind the loading screen (warmSootMarks, the
 * global manifest: blue slimes go off in the lands and in the dungeons), kept
 * as an image of itself (keepAsImage, TRAPS §253), 192 px, 144 KB decoded.
 * Each mark is that picture in a Container squashed to lie on the ground, the
 * picture turned inside it so no two look alike, on `groundDetails` (under the
 * kill splats, the shadows and every figure).  SOOT.MAX at once, the oldest
 * gone for a new one; each SOOT.MS on the ground (`?sootms=` for the tests),
 * fading over its last SOOT.FADE_MS.  A mark is born and gone by `visible`
 * alone, its alpha moved between (a structural change at a blast and at its
 * end, never a frame: TRAPS §218).  A mark belongs to the zone it went off in.
 */
import { Container, Sprite, Texture, Cache } from 'pixi.js';
import { keepAsImage } from './keepAsImage.js';

const qs = (() => { try { return new URLSearchParams(window.location.search); } catch (e) { return null; } })();
const qnum = (k, d) => { const v = qs && qs.get(k); const n = v != null ? Number(v) : NaN; return Number.isFinite(n) && n >= 0 ? n : d; };

export const SOOT = Object.freeze({
  PX: 192,                         /* the picture's side */
  MS: qnum('sootms', 60000),       /* on the ground a minute */
  FADE_MS: 15000,                  /* the last quarter of it fading */
  ALPHA: 0.86,
  MAX: 10,
  ACROSS: 2.3,                     /* the mark's width over the blast's radius */
  SQUASH: 0.6,                     /* lying on the ground: as tall as this of its width */
});

let _tex = null;

/* a seeded random, so the picture is the same every visit */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* the scorch, drawn once: a ragged black heart, its charred rim, streaks out
   from the middle, flecks beyond them */
function drawSoot(g, S) {
  const R = rng(3679);
  const c = S / 2;
  /* the heart's edge: a radius that wanders round the circle (a few waves of
     random phase), so it is never a disc */
  const waves = [];
  for (let i = 0; i < 6; i++) waves.push({ k: 2 + i * 2 + Math.floor(R() * 2), a: (0.05 + R() * 0.07) / (1 + i * 0.5), p: R() * Math.PI * 2 });
  const edge = (t, base) => {
    let f = 1;
    for (const w of waves) f += w.a * Math.sin(w.k * t + w.p);
    return base * f;
  };
  const blob = (base, fill) => {
    g.beginPath();
    for (let i = 0; i <= 96; i++) {
      const t = (i / 96) * Math.PI * 2;
      const r = edge(t, base);
      const x = c + Math.cos(t) * r, y = c + Math.sin(t) * r;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath();
    g.fillStyle = fill;
    g.fill();
  };
  /* the charred rim, brown-black, a little past the heart */
  const rim = g.createRadialGradient(c, c, S * 0.08, c, c, S * 0.4);
  rim.addColorStop(0, 'rgba(26,18,12,0.85)');
  rim.addColorStop(0.7, 'rgba(44,30,18,0.45)');
  rim.addColorStop(1, 'rgba(52,36,22,0)');
  blob(S * 0.36, rim);
  /* the heart: near black, thinning to its ragged edge */
  const heart = g.createRadialGradient(c, c, 0, c, c, S * 0.3);
  heart.addColorStop(0, 'rgba(6,5,4,0.96)');
  heart.addColorStop(0.55, 'rgba(10,8,6,0.9)');
  heart.addColorStop(1, 'rgba(16,12,9,0.5)');
  blob(S * 0.27, heart);
  /* the streaks: thrown out from the middle, each tapering to nothing */
  const n = 19;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2 + (R() - 0.5) * 0.28;
    const r0 = S * (0.14 + R() * 0.06);
    const r1 = S * (0.33 + R() * 0.15);
    const w = S * (0.018 + R() * 0.03);
    const ux = Math.cos(t), uy = Math.sin(t), nx = -uy, ny = ux;
    const grad = g.createLinearGradient(c + ux * r0, c + uy * r0, c + ux * r1, c + uy * r1);
    grad.addColorStop(0, 'rgba(10,8,6,0.82)');
    grad.addColorStop(0.6, 'rgba(18,13,9,0.5)');
    grad.addColorStop(1, 'rgba(24,18,12,0)');
    g.beginPath();
    g.moveTo(c + ux * r0 + nx * w, c + uy * r0 + ny * w);
    g.lineTo(c + ux * r1, c + uy * r1);
    g.lineTo(c + ux * r0 - nx * w, c + uy * r0 - ny * w);
    g.closePath();
    g.fillStyle = grad;
    g.fill();
  }
  /* flecks of char beyond the streaks */
  for (let i = 0; i < 46; i++) {
    const t = R() * Math.PI * 2;
    const r = S * (0.3 + R() * 0.17);
    const s = 0.8 + R() * 2.4;
    g.beginPath();
    g.arc(c + Math.cos(t) * r, c + Math.sin(t) * r, s, 0, Math.PI * 2);
    g.fillStyle = 'rgba(14,10,7,' + (0.35 + R() * 0.45).toFixed(2) + ')';
    g.fill();
  }
}

/** Behind the loading screen (preloadWorldAnimations): the picture, once. */
export function warmSootMarks() {
  if (_tex || typeof document === 'undefined') return;
  try {
    const cv = document.createElement('canvas');
    cv.width = SOOT.PX; cv.height = SOOT.PX;
    drawSoot(cv.getContext('2d'), SOOT.PX);
    const t = Texture.from(cv);
    if (t && t.source) keepAsImage(t.source, Cache);
    _tex = t;
  } catch (e) { _tex = null; }
}

export class SootMarks {
  constructor(layer) {
    this.layer = layer;
    this.box = null;
    this.marks = [];      /* { c, sp, at, zone, x, y, r } */
    this.made = 0;
  }

  _mark() {
    if (!this.box) {
      this.box = new Container();
      this.box.label = 'soot-marks';
      this.layer.addChildAt(this.box, 0);
    }
    const c = new Container();
    const sp = new Sprite(_tex);
    sp.anchor.set(0.5);
    c.addChild(sp);
    c.visible = false;
    this.box.addChild(c);
    return { c, sp, at: 0, zone: null, x: 0, y: 0, r: 0, live: false };
  }

  /** A blast at (x, y), radius r, in `zone`. */
  add(x, y, r, zone, at) {
    if (!_tex) warmSootMarks();
    if (!_tex || !this.layer || !Number.isFinite(x) || !Number.isFinite(y)) return;
    let m = this.marks.find((q) => !q.live);
    if (!m) {
      if (this.marks.length < SOOT.MAX) { m = this._mark(); this.marks.push(m); }
      else m = this.marks.reduce((a, b) => (a.at <= b.at ? a : b));   /* the oldest makes way */
    }
    const w = Math.max(40, Math.min(1400, (r || 110) * SOOT.ACROSS));
    const k = w / SOOT.PX;
    m.c.x = x; m.c.y = y;
    m.c.scale.set(k, k * SOOT.SQUASH);
    m.sp.rotation = ((this.made * 2.399963) % (Math.PI * 2));   /* the golden angle: each one turned differently */
    m.sp.scale.x = this.made % 2 ? -1 : 1;
    m.c.alpha = SOOT.ALPHA;
    if (!m.c.visible) m.c.visible = true;
    Object.assign(m, { at: at || Date.now(), zone, x, y, r, live: true });
    this.made++;
  }

  /** Once a frame: take the new blasts, fade the old, end what is done. */
  update(S, now) {
    const q = S && S._sootQueue;
    if (q && q.length) {
      for (const b of q) this.add(b.x, b.y, b.r, b.zone, b.at);
      q.length = 0;
    }
    const zone = S && S.currentZone;
    for (const m of this.marks) {
      if (!m.live) continue;
      const age = now - m.at;
      if (age >= SOOT.MS || m.zone !== zone) {
        m.live = false;
        if (m.c.visible) m.c.visible = false;
        continue;
      }
      /* the fade is the last quarter at most (a short `?sootms=` fades as a
         minute does, not from its first frame) */
      const fade = Math.min(SOOT.FADE_MS, SOOT.MS * 0.25);
      const left = SOOT.MS - age;
      const a = left < fade ? SOOT.ALPHA * (left / fade) : SOOT.ALPHA;
      if (Math.abs(m.c.alpha - a) > 0.004) m.c.alpha = a;
    }
  }

  probe() {
    const L = this.layer;
    let g = null;
    try { const m0 = this.marks.find((m) => m.live); if (m0) { const p = m0.c.getGlobalPosition(); g = { x: Math.round(p.x), y: Math.round(p.y), worldVisible: !!m0.c.visible && !!(this.box && this.box.visible) && !!(L && L.visible), texW: _tex ? _tex.width : 0, texValid: !!(_tex && _tex.source && _tex.source.width) }; } } catch (e) { g = { err: String(e && e.message) }; }
    return {
      texture: !!_tex, ms: SOOT.MS, made: this.made, layer: L ? { label: L.label || null, visible: L.visible, renderable: L.renderable, children: L.children.length, idx: this.box && L.children.indexOf(this.box) } : null, global: g,
      marks: this.marks.filter((m) => m.live).map((m) => ({ x: Math.round(m.x), y: Math.round(m.y), r: m.r, zone: m.zone,
        alpha: +m.c.alpha.toFixed(3), w: Math.round(m.c.width), h: Math.round(m.c.height), visible: m.c.visible, inLayer: !!m.c.parent })),
    };
  }

  destroy() {
    try { if (this.box) this.box.destroy({ children: true }); } catch (e) { /* gone */ }
    this.box = null;
    this.marks = [];
  }
}
