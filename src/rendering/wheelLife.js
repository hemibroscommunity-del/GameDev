/* ═══ v2.3.2983: A LITTLE LIFE ON EACH BUILDING ═══
 *
 * Owner, 2026-10-02: "Also add effects just using code to each building to
 * make subtle liveliness effects".
 *
 * Every building in the Wheel's town gets the small things that say someone
 * is home, drawn in code over its picture where src/data/buildingLife.js says
 * (shares of the picture, so they follow it at any size):
 *
 *   smoke   a soft puff every second or so off each chimney, rising,
 *           drifting with the wind and fading -- a few alive at a time
 *   glow    each lamp's warm light, breathing and flickering a little
 *   sparks  the Blacksmith's forge spitting a spark or two
 *   glint   a star of light now and then on gold, gems, glass and the bell
 *   chaff   a speck of hay drifting down from the Feed & Seed's loft
 *   flag    v2.3.3347: the Town Hall's flag waving from its pole (FLAG below)
 *
 * SUBTLE ON PURPOSE: low alphas, a handful of sprites a building, nothing
 * that moves fast.  The Wheel is always daylight for now (timeOfDay.js), so a
 * lamp's glow is a breath of warmth, not a pool of light.
 *
 * THE DRAWING: each building that has life is drawn as a Container -- its
 * picture, then its life over it -- standing at its foot like any other prop,
 * so the depth pass (depthSort.js) moves the building and its life together:
 * walk behind the Hotel and its roof AND its lanterns are drawn over you.
 *
 * THE TEXTURES are five small canvases made here, once a visit, on the way in
 * behind the zone overlay (wheelLifeWarm, called by wheelObjectsWarm -- the
 * preloading law's ZONE-ASSET clause), and destroyed on the way out
 * (wheelLifeFree, with the objects' pages).  A building that comes into view
 * without them (they are made in a few ms, before anything is drawn) simply
 * has no life until they are.
 *
 * `?trial=wheel&nolife` leaves the buildings still (wheelTrial.js wheelLifeOn).
 */
import { Container, Sprite, Texture, CanvasSource, MeshPlane, Rectangle } from 'pixi.js';
import { BUILDING_LIFE } from '../data/buildingLife.js';
import { makePaletteSource, isPaletteSource, paletteStride } from './paletteTex.js';   /* v2.3.3347: the flag's cloth */

/* ═══ v2.3.3347: THE TOWN HALL'S FLAG WAVES ═══
 *
 * The owner: "Also make the town square flag wave using code it looks silly
 * being still".  There is no flag object: the flag is painted into the Town
 * Hall's picture.  So its cloth is CUT OUT of the picture, once a page load:
 *   - its colour numbers copied into a little picture of its own, on the same
 *     colours (makePaletteSource), so it is drawn by the same lookup and
 *     comes out the same pixels at rest;
 *   - then set see-through in the page itself (its numbers, uploaded again),
 *     so the painted cloth is never seen behind the moving one.
 * The cloth is a MeshPlane in the building's life, hung from the pole and
 * waved by worldLife.js (_updateWheelFlags) with the old map's flags' own
 * motion (v2.3.2816): the wind's strength (timeOfDay.js windAt), its gusts,
 * and the QA calm switch, __btAmbienceOff, under which it lies exactly where
 * it was painted.
 *
 * WHERE: src/data/buildingLife.js's `flag` entry, on the picture's own pixels
 * (`box`, `keep`, `pole`).  A page whose cloth does not count `n` -- a picture
 * drawn again -- is never cut, so a flag that moved stays still rather than
 * leaving a hole (tools/world/test-world-core says what moved).  Not cut
 * either: a page that is not colour numbers (`?nopalette`, WebGL1), or with
 * `?nolife` (no life at all).  Once per page SOURCE: a building mended after
 * it shattered is built again and finds the cut made; the cloth's picture
 * goes with the page.  The cloth casts no shadow (the building's own shadow
 * is cast from its picture, now without it).
 *
 * Probe: window.__btWheelFlags(). */
const TAU = Math.PI * 2;
const FLAG_COLS = 9, FLAG_ROWS = 4;
/* the free end's swing, in the cloth's pixels a unit of the old flags' (which
   were drawn at a game px a texel: these are 2 a game px, and a little more
   for the town's centrepiece) */
const FLAG_AMP = 3;
const _flagCuts = new WeakMap();   /* page source -> its cut, or { bad: true } */
const _flags = new Set();          /* the live flags' records (QA) */
const _flagStats = { cuts: 0, refused: 0, lastRefused: null };

/* The cloth of entry `e` out of picture `tex` (a frame of a page), once per
   page source: its own little picture, and the page's pixels see-through. */
function cutFlag(tex, e) {
  const src = tex && tex.source;
  if (!isPaletteSource(src) || !e || !Array.isArray(e.box) || !(e.n > 0)) return null;
  const had = _flagCuts.get(src);
  if (had) return had.bad ? null : had;
  const refuse = (why) => { _flagCuts.set(src, { bad: true }); _flagStats.refused++; _flagStats.lastRefused = why; return null; };
  const P = src._btPal, idx = src.resource;
  const res = src.resolution || 1, fr = tex.frame;
  const ox = Math.round(fr.x * res), oy = Math.round(fr.y * res);
  if (!idx || tex.rotate || Math.round(fr.width * res) !== e.pw || Math.round(fr.height * res) !== e.ph) return refuse('picture');
  let clear = -1;
  for (let k = 0; k < 256; k++) if (P.rgba[k * 4 + 3] === 0) { clear = k; break; }
  if (clear < 0) return refuse('no see-through colour');
  const [x0, y0, x1, y1] = e.box;
  const cw = x1 - x0, ch = y1 - y0, cst = paletteStride(cw);
  if (!(cw > 1 && ch > 1) || ox + x1 > P.w || oy + y1 > P.h) return refuse('box');
  const keep = Array.isArray(e.keep) ? e.keep : [];
  const kept = (x, y) => { for (const r of keep) if (x >= r[0] && x < r[2] && y >= r[1] && y < r[3]) return true; return false; };
  /* the cloth's numbers; everything else (and the rows' padding) see-through,
     as the page round it is */
  const cloth = new Uint8Array(cst * ch).fill(clear);
  let n = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const v = idx[(oy + y) * P.stride + ox + x];
      if (v === clear || P.rgba[v * 4 + 3] === 0 || kept(x, y)) continue;
      cloth[(y - y0) * cst + (x - x0)] = v;
      n++;
    }
  }
  if (Math.abs(n - e.n) > Math.max(8, e.n * 0.01)) return refuse('cloth ' + n + ' px, not ' + e.n);
  const csrc = makePaletteSource({ idx: cloth, w: cw, h: ch, stride: cst, rgba: P.rgba, alphaMode: src.alphaMode, label: 'bt-wheel-flag' });
  if (!csrc) return refuse('palette full');
  /* only now, with the cloth safe in its own picture: out of the page */
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (cloth[(y - y0) * cst + (x - x0)] !== clear) idx[(oy + y) * P.stride + ox + x] = clear;
    }
  }
  try { src.update(); } catch (er) { /* uploaded at its first draw anyway */ }
  const cut = { tex: new Texture({ source: csrc, frame: new Rectangle(0, 0, cw, ch) }), cw, ch, x0, y0, pole: Math.max(0, (e.pole || x0) - x0), n };
  _flagCuts.set(src, cut);
  _flagStats.cuts++;
  src.once('destroy', () => {
    try { cut.tex.destroy(true); } catch (er) { /* gone */ }
    _flagCuts.delete(src);
  });
  return cut;
}

/* ── the textures ── */
let _tex = null;
function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  return new Texture({ source: new CanvasSource({ resource: c, width: w, height: h, resolution: 1, scaleMode: 'linear' }) });
}
/* Made once a visit, behind the way in's overlay.  Safe to call again. */
export function wheelLifeWarm() {
  if (_tex || typeof document === 'undefined') return;
  try {
    _tex = {
      /* a puff of smoke: three round lobes, their edges soft only at the
         very rim, a shade darker underneath -- it has to read over pale
         sand as well as over a slate roof (the first puffs, soft all the
         way in, vanished over the town's dirt) */
      puff: canvasTexture(40, 30, (g) => {
        for (const [x, y, r] of [[14, 18, 10], [25, 16, 11], [20, 11, 9]]) {
          const rg = g.createRadialGradient(x, y - 3, 1, x, y, r);
          rg.addColorStop(0, 'rgba(255,255,255,1)');
          rg.addColorStop(0.75, 'rgba(226,224,220,0.95)');
          rg.addColorStop(1, 'rgba(200,198,194,0)');
          g.fillStyle = rg;
          g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
        }
      }),
      /* light: white in the middle, nothing at the edge (tinted warm) */
      glow: canvasTexture(64, 64, (g) => {
        const rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        rg.addColorStop(0, 'rgba(255,255,255,1)');
        rg.addColorStop(0.35, 'rgba(255,255,255,0.45)');
        rg.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = rg;
        g.fillRect(0, 0, 64, 64);
      }),
      /* a spark: a bright square, its edge a little dimmer */
      spark: canvasTexture(4, 4, (g) => {
        g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(0, 0, 4, 4);
        g.fillStyle = '#fff'; g.fillRect(1, 1, 2, 2);
      }),
      /* a glint: a four-pointed star, pixel-drawn */
      glint: canvasTexture(17, 17, (g) => {
        g.fillStyle = 'rgba(255,255,255,0.5)';
        g.fillRect(8, 0, 1, 17); g.fillRect(0, 8, 17, 1);
        g.fillStyle = '#fff';
        g.fillRect(8, 3, 1, 11); g.fillRect(3, 8, 11, 1);
        g.fillRect(7, 7, 3, 3);
      }),
      /* a speck of chaff */
      chaff: canvasTexture(3, 2, (g) => { g.fillStyle = '#fff'; g.fillRect(0, 0, 3, 2); }),
    };
  } catch (e) {
    _tex = null;
  }
}
/* Leaving the Wheel: every texture let go.  A building still holding one is
   destroyed first (wheelObjects.js, its sprites go before its pages). */
export function wheelLifeFree() {
  if (!_tex) return;
  for (const t of Object.values(_tex)) { try { t.destroy(true); } catch (e) { /* gone */ } }
  _tex = null;
}
export function wheelLifeReady() { return !!_tex; }
/* Whether a building has any life to draw. */
export function hasLife(id) { return !!(BUILDING_LIFE[id] && BUILDING_LIFE[id].length); }

const rand = (a, b) => a + Math.random() * (b - a);
const SMOKE_TINT = 0xd9d7d3, GLOW_TINT = 0xffc874, SPARK_TINTS = [0xffd27a, 0xffa640, 0xff7a2a], GLINT_TINT = 0xfff4cf, CHAFF_TINT = 0xe6c66c;

/* ── one building's life ──
   `w`, `h` its picture's size in game px as drawn, `ax` where along its
   width it stands, `k` how many times its picture's size it is drawn (the
   big-town preview) -- distances and sizes grow with it.  Everything is in
   the building's own space: (0, 0) its foot. */
export class BuildingLife {
  /* v2.3.3347: + `pic`, the building's picture -- the flag's cloth is cut out
     of it (FLAG above) and follows it if it is drawn mirrored */
  constructor(id, w, h, ax, k = 1, pic = null) {
    this.view = new Container();
    this.view.label = 'wheelLife';
    this.k = k;
    this.emitters = [];
    this.flag = null;
    const x0 = -ax * w, y0 = -h;
    for (const e of BUILDING_LIFE[id] || []) {
      const x = x0 + e.u * w, y = y0 + e.v * h;
      if (e.fx === 'flag') {
        try { this._makeFlag(e, pic, w, h, ax, k); } catch (er) { this.flag = null; }
        continue;
      }
      if (e.fx === 'glow') {
        const s = new Sprite(_tex.glow);
        s.anchor.set(0.5);
        s.blendMode = 'add';
        s.tint = GLOW_TINT;
        s.x = x; s.y = y;
        /* the light's reach: a little past the lamp itself */
        const r = Math.max(7, (e.s || 0.04) * w * 2.1);
        s.scale.set((2 * r) / 64);
        s.alpha = 0;
        this.view.addChild(s);
        this.emitters.push({ fx: 'glow', s, ph: rand(0, 6.28), ph2: rand(0, 6.28), t: 0 });
      } else {
        this.emitters.push({ fx: e.fx, x, y, str: e.s || 1, next: rand(0.1, 1.6), parts: [], t: 0, on: null });
      }
    }
  }

  /* v2.3.3347: the flag's cloth, cut out of the picture and hung where it
     was painted: a cloth pixel is 1/res of a picture's point, and the
     picture is drawn k times its points, anchored at (ax, 1) */
  _makeFlag(e, pic, w, h, ax, k) {
    if (!pic || !pic.texture) return;
    const cut = cutFlag(pic.texture, e);
    if (!cut) return;
    const res = (pic.texture.source && pic.texture.source.resolution) || 1;
    const mesh = new MeshPlane({ texture: cut.tex, verticesX: FLAG_COLS, verticesY: FLAG_ROWS });
    mesh.label = 'wheelFlag';
    mesh.x = (cut.x0 / res) * k - ax * w;
    mesh.y = (cut.y0 / res) * k - h;
    mesh.scale.set(k / res);
    const holder = new Container();
    holder.label = 'wheelFlagPole';
    if (pic.scale && pic.scale.x < 0) holder.scale.x = -1;   /* a mirrored building flies its flag mirrored */
    holder.addChild(mesh);
    this.view.addChildAt(holder, 0);
    const pos = mesh.geometry.positions;
    const rec = this.flag = { mesh, pic, base: Float32Array.from(pos), w: cut.cw, h: cut.ch, pole: cut.pole, ph: Math.random() * TAU, rest: true, amp: 0, tipDy: 0, gust: 0, t: 0 };
    _flags.add(rec);
    /* gone with its building (walked away from, or shattered): out of the
       probe's list at once, never kept "until the page closes" */
    mesh.once('destroyed', () => { _flags.delete(rec); });
  }

  /* v2.3.3347: one step of the flag's wave, from worldLife's clock and wind
     (`g` the gust here, 0..1).  The old map's flags' motion: a wave running
     from the pole to the free end, its swing growing along the cloth, the
     cloth a little shorter as it ripples; calm, it lies as it was painted. */
  waveFlag(dt, wind, g, calm) {
    const F = this.flag;
    if (!F || F.mesh.destroyed) return;
    const geo = F.mesh.geometry, pos = geo.positions, base = F.base;
    if (calm) {
      if (!F.rest) { pos.set(base); geo.getBuffer('aPosition').update(); F.rest = true; }
      F.amp = 0; F.tipDy = 0; F.gust = 0;
      return;
    }
    F.rest = false;
    const sp = Math.max(0, Math.min(1, ((wind ? wind.speed : 14) - 9) / 10));
    F.ph += TAU * (1.15 + 0.85 * sp + 0.6 * g) * dt;
    F.t += dt;
    const A = FLAG_AMP * (1.5 + 1.2 * sp + 1.6 * g);
    const n = pos.length / 2, span = Math.max(1, F.w - F.pole);
    for (let i = 0; i < n; i++) {
      const bx = base[i * 2], by = base[i * 2 + 1];
      const u = Math.max(0, (bx - F.pole) / span);
      const v = by / F.h;
      const env = Math.pow(u, 1.25);
      const ph = F.ph - u * TAU * 1.05 - v * 0.5;
      pos[i * 2] = bx - A * 0.35 * env * (1 - Math.cos(ph));
      pos[i * 2 + 1] = by + A * env * Math.sin(ph);
    }
    geo.getBuffer('aPosition').update();
    F.amp = A; F.gust = g;
    F.tipDy = pos[(FLAG_COLS - 1) * 2 + 1] - base[(FLAG_COLS - 1) * 2 + 1];
  }

  /* a particle sprite from the emitter's own spares, or a new one */
  _part(em, tex) {
    for (const p of em.parts) if (!p.live) { p.live = true; p.s.visible = true; return p; }
    const s = new Sprite(tex);
    s.anchor.set(0.5);
    this.view.addChild(s);
    const p = { s, live: true };
    em.parts.push(p);
    return p;
  }

  update(dt) {
    const k = this.k;
    for (const em of this.emitters) {
      em.t += dt;
      if (em.fx === 'glow') {
        /* a slow breath, a quicker waver, and now and then a dip */
        const b = 0.6 * Math.sin(em.t * 1.7 + em.ph) + 0.4 * Math.sin(em.t * 5.3 + em.ph2);
        const dip = Math.sin(em.t * 11.3 + em.ph * 3) > 0.96 ? -0.05 : 0;
        em.s.alpha = Math.max(0, 0.3 + 0.08 * b + dip);
        continue;
      }
      if (em.fx === 'smoke') {
        em.next -= dt;
        if (em.next <= 0 && em.parts.filter((p) => p.live).length < 5) {
          em.next = rand(0.9, 1.5) / (0.6 + 0.4 * em.str);
          const p = this._part(em, _tex.puff);
          p.t = 0; p.life = rand(3.0, 3.8);
          p.rise = rand(44, 60) * k * (0.7 + 0.3 * em.str);
          p.drift = rand(9, 16) * k; p.ph = rand(0, 6.28);
          p.size = (0.55 + 0.45 * em.str) * k;
          p.s.tint = SMOKE_TINT;
        }
        for (const p of em.parts) {
          if (!p.live) continue;
          p.t += dt;
          const u = p.t / p.life;
          if (u >= 1) { p.live = false; p.s.visible = false; continue; }
          p.s.x = em.x + p.drift * u + Math.sin(u * 6.28 + p.ph) * 2 * k;
          p.s.y = em.y - p.rise * u;
          p.s.scale.set(p.size * (0.32 + 0.85 * u));
          p.s.alpha = 0.62 * (u < 0.12 ? u / 0.12 : Math.pow((1 - u) / 0.88, 1.3));
        }
        continue;
      }
      if (em.fx === 'sparks') {
        em.next -= dt;
        if (em.next <= 0) {
          em.next = rand(0.25, 0.75);
          const n = Math.random() < 0.35 ? 2 : 1;
          for (let q = 0; q < n && em.parts.filter((p) => p.live).length < 10; q++) {
            const p = this._part(em, _tex.spark);
            p.s.blendMode = 'add';
            p.s.tint = SPARK_TINTS[(Math.random() * SPARK_TINTS.length) | 0];
            p.t = 0; p.life = rand(0.45, 0.8);
            p.x = em.x + rand(-4, 4) * k; p.y = em.y;
            p.vx = rand(-18, 18) * k; p.vy = rand(-58, -30) * k;
            p.s.scale.set(k * rand(0.5, 0.8));
          }
        }
        for (const p of em.parts) {
          if (!p.live) continue;
          p.t += dt;
          if (p.t >= p.life) { p.live = false; p.s.visible = false; continue; }
          p.vy += 95 * k * dt;
          p.x += p.vx * dt; p.y += p.vy * dt;
          p.s.x = p.x; p.s.y = p.y;
          p.s.alpha = 0.95 * (1 - p.t / p.life);
        }
        continue;
      }
      if (em.fx === 'glint') {
        if (!em.on) {
          em.next -= dt;
          if (em.next <= 0) {
            const p = this._part(em, _tex.glint);
            p.s.blendMode = 'add';
            p.s.tint = GLINT_TINT;
            p.s.x = em.x; p.s.y = em.y;
            p.t = 0; p.life = rand(0.55, 0.8); p.size = rand(0.75, 1.05) * k;
            em.on = p;
          }
        }
        const p = em.on;
        if (p) {
          p.t += dt;
          const u = p.t / p.life;
          if (u >= 1) { p.live = false; p.s.visible = false; em.on = null; em.next = rand(2.5, 6.5); continue; }
          const a = Math.sin(u * Math.PI);
          p.s.scale.set(p.size * (0.3 + 0.7 * a));
          p.s.rotation = u * 0.6;
          p.s.alpha = 0.85 * a;
        }
        continue;
      }
      if (em.fx === 'chaff') {
        em.next -= dt;
        if (em.next <= 0 && em.parts.filter((p) => p.live).length < 4) {
          em.next = rand(0.9, 1.8);
          const p = this._part(em, _tex.chaff);
          p.s.tint = CHAFF_TINT;
          p.t = 0; p.life = rand(2.0, 2.8);
          p.x0 = em.x + rand(-10, 10) * k; p.fall = rand(18, 28) * k; p.ph = rand(0, 6.28);
          p.s.scale.set(k);
        }
        for (const p of em.parts) {
          if (!p.live) continue;
          p.t += dt;
          const u = p.t / p.life;
          if (u >= 1) { p.live = false; p.s.visible = false; continue; }
          p.s.x = p.x0 + Math.sin(u * 9 + p.ph) * 3 * k;
          p.s.y = em.y + p.fall * u;
          p.s.rotation = Math.sin(u * 7 + p.ph);
          p.s.alpha = 0.9 * (u < 0.1 ? u / 0.1 : 1 - Math.max(0, (u - 0.6) / 0.4));
        }
      }
    }
  }

  /* how many of its sprites are showing (QA) */
  count() {
    let n = this.flag && !this.flag.mesh.destroyed ? 1 : 0;
    for (const em of this.emitters) {
      if (em.fx === 'glow') n += em.s.alpha > 0 ? 1 : 0;
      else for (const p of em.parts) if (p.live) n++;
    }
    return n;
  }
}

/* v2.3.3347: the flags' probe (QA, mp-flagwave): each live flag's swing at
   its free end, its rest, where the cloth and its building are on the screen
   (CSS px), and how many pages were cut or refused; .hide(true) hides the
   cloth, to see that none of it is left painted behind */
try {
  if (typeof window !== 'undefined') {
    const box = (o) => { try { const b = o.getBounds(); return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; } catch (e) { return null; } };
    const live = () => { for (const F of _flags) if (!F.mesh || F.mesh.destroyed) _flags.delete(F); return [..._flags]; };
    window.__btWheelFlags = () => ({
      flags: live().map((F) => ({ amp: +F.amp.toFixed(2), tipDy: +F.tipDy.toFixed(2), rest: F.rest, gust: +F.gust.toFixed(2), w: F.w, h: F.h, t: +F.t.toFixed(2),
        shown: F.mesh.visible, mesh: box(F.mesh), pic: F.pic && !F.pic.destroyed ? box(F.pic) : null })),
      cuts: _flagStats.cuts, refused: _flagStats.refused, lastRefused: _flagStats.lastRefused,
    });
    window.__btWheelFlags.hide = (on) => { for (const F of live()) F.mesh.visible = !on; return live().length; };
  }
} catch (e) { /* probe only */ }
