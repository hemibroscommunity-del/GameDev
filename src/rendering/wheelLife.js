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
import { Container, Sprite, Texture, CanvasSource } from 'pixi.js';
import { BUILDING_LIFE } from '../data/buildingLife.js';

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
  constructor(id, w, h, ax, k = 1) {
    this.view = new Container();
    this.view.label = 'wheelLife';
    this.k = k;
    this.emitters = [];
    const x0 = -ax * w, y0 = -h;
    for (const e of BUILDING_LIFE[id] || []) {
      const x = x0 + e.u * w, y = y0 + e.v * h;
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
    let n = 0;
    for (const em of this.emitters) {
      if (em.fx === 'glow') n += em.s.alpha > 0 ? 1 : 0;
      else for (const p of em.parts) if (p.live) n++;
    }
    return n;
  }
}
