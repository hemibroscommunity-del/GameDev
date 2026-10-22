/* ═══ v2.3.3567: THE GOO GROTTO MOVES ═══
 *
 * The owner, of their four pictures of the Goo Grotto in the game (v2.3.3566,
 * docs/specs/dungeon-art.md): "You can use code to make those a bit more
 * animated for the water effects and such. Maybe a little Breeze for the
 * ferns?"  The pictures never change; this draws over them, in code, where the
 * art tool read each one moves (tools/world/add-dungeon-art.mjs, src/data/
 * dungeonArt.js `drips`, `wet`, `fire`, `caps`, `gold`):
 *
 *   DRIPS    a drop swells at the tip of the slime hanging in the cave's mouth
 *            or running down the arena's wall, lets go, falls, and splashes
 *            where it lands -- a ring and two droplets -- then another forms;
 *   BUBBLES  a pool of slime (the mouth's floor and what spills out of it, each
 *            puddle, the junk heap's) swells a bubble now and then and pops it,
 *            and its surface glints; the heap's coins glint gold;
 *   FIRE     each torch post's iron basket burns, the campfire's own pixel
 *            flames (campfireFx.js, nothing new to load), with sparks and a warm
 *            light on the floor round it;
 *   SPORES   the mushrooms' caps let glowing spores float up;
 *   FERNS    sway in the world's wind, by worldLife.js's own springs: the arena's
 *            two ferns, and the entrance's four, cut out of its picture by the
 *            tool to move on their own (rendering/wheelDoors.js) -- each is
 *            listed here (addGrottoSwayer) for worldLife to lean.
 *
 * Every piece is a Sprite made once and only ever moved, scaled and faded --
 * never added, removed, hidden or given a new picture from another source --
 * so a drop forming or a bubble popping changes nothing Pixi has to rebuild in
 * the depth-sorted layer it rides in (TRAPS §218; the torch's flame steps
 * through frames of ONE picture, which is no rebuild either).  The drops,
 * bubbles, glints and spores are a tiny picture minted per slime's colours
 * (mintGrottoFx: ~40 x 7 px, a few hundred bytes) with the art it belongs to,
 * behind the same loading as that art, and freed with it.  Under the QA
 * harness's calm switch (window.__btAmbienceOff) nothing moves: the drops,
 * bubbles, glints, sparks and spores are gone and the torches hold one frame.
 *
 * No game imports: rendering/wheelDoors.js, rendering/arenaWorld.js and
 * game/dungeonArt.js use it, and worldLife.js reads its ferns.
 */
import { Container, Sprite, Texture, Rectangle } from 'pixi.js';
import { emberColor, FLAME_W, FLAME_FRAMES } from './campfireArt.js';

/* game px a texel: the pictures' own pixel (2 picture px a game px) */
export const FX_TEXEL = 0.5;
/* the glints and spores a little bigger: a light, read at a phone's size */
const GLINT_TEXEL = 0.7, SPORE_TEXEL = 0.9;
/* a drop's fall (game px / s^2) and a splash's droplets' */
const DROP_G = 520, DOT_G = 420;

const rnd = Math.random;
const between = (a, b) => a + (b - a) * rnd();
const calmNow = () => typeof window !== 'undefined' && window.__btAmbienceOff === true;

/* ── the little pictures ──
   Each shape a few rows of letters: d its rim, m its body, l its sheen, s its
   light, h a highlight (the light half way to white), w white, x white at
   half strength; '.' nothing.  Drawn in the slime's own colours, so a drop
   from the mouth's deep blue and one from the wall's teal are each their
   picture's.  The white ones (glint, spore) are tinted where they are used. */
const SHAPES = {
  drop: ['..l..', '..m..', '.mlm.', 'mhslm', 'mhlmd', 'mlmmd', '.mdd.'],
  bubble: ['..lll..', '.lhsll.', 'lhsllmd', 'lsllmmd', 'llmmmmd', '.lmmmd.', '..ddd..'],
  ring: ['...sssss...', '.ss.....ss.', 's.........s', '.ss.....ss.', '...sssss...'],
  dot: ['sl', 'lm'],
  glint: ['..x..', '..w..', 'xwwwx', '..w..', '..x..'],
  spore: ['.x.', 'xwx', '.x.'],
};

function hexRgb(c) { return [(c >> 16) & 255, (c >> 8) & 255, c & 255]; }
function toward(c, w, k) { return c.map((v, i) => Math.round(v + (w[i] - v) * k)); }

/** Mint the drops', bubbles' and lights' pictures in one slime's colours
    (`slime`: [rim, body, sheen, light], src/data/dungeonArt.js).  Returns
    { base, drop, bubble, ring, dot, glint, spore }, or null without a page. */
export function mintGrottoFx(slime) {
  if (typeof document === 'undefined' || !slime || slime.length < 4) return null;
  const [d, m, l, s] = slime.map(hexRgb);
  const ink = { d, m, l, s, h: toward(s, [255, 255, 255], 0.55), w: [255, 255, 255], x: [255, 255, 255] };
  const keys = Object.keys(SHAPES);
  let W = 1, H = 1;
  const at = {};
  for (const k of keys) { at[k] = W; W += SHAPES[k][0].length + 1; H = Math.max(H, SHAPES[k].length + 2); }
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const img = g.createImageData(W, H);
  for (const k of keys) {
    SHAPES[k].forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === '.') continue;
        const c = ink[ch], o = ((y + 1) * W + at[k] + x) * 4;
        img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2];
        img.data[o + 3] = ch === 'x' ? 128 : 255;
      }
    });
  }
  g.putImageData(img, 0, 0);
  const base = Texture.from(cv);
  /* a texel is a pixel of the pictures beside it, a hard square at any zoom */
  base.source.scaleMode = 'nearest';
  const out = { base };
  for (const k of keys) out[k] = new Texture({ source: base.source, frame: new Rectangle(at[k], 1, SHAPES[k][0].length, SHAPES[k].length) });
  return out;
}

/** Let a minted set go: its frames, then its picture. */
export function freeGrottoFx(fx) {
  if (!fx || fx._freed) return;
  fx._freed = true;
  for (const k of Object.keys(SHAPES)) { try { if (fx[k]) fx[k].destroy(false); } catch (e) { /* gone */ } }
  try { fx.base.destroy(true); } catch (e) { /* gone */ }
}

/* ── what is running, for the probe ── */
const _live = new Set();
const _stats = () => {
  const o = { sets: _live.size, drips: 0, forming: 0, falling: 0, splashing: 0, pools: 0, bubbles: 0, glints: 0, fires: 0, sparks: 0, spores: 0, shown: 0, swayers: _swayers.size, calm: calmNow() };
  for (const f of _live) { f._count(o); o.shown += shownIn(f.c || f.sparkC); }
  return o;
};
/* how many of a set's pieces are showing now (not faded right out) */
function shownIn(c) {
  let n = 0;
  if (c && !c.destroyed) for (const k of c.children) if (k.alpha > 0.01) n++;
  return n;
}
if (typeof window !== 'undefined') window.__btGrottoFx = _stats;

function piece(parent, tex, ax, ay, texel) {
  const sp = new Sprite(tex);
  sp.anchor.set(ax, ay);
  sp.scale.set(texel);
  sp.alpha = 0;
  parent.addChild(sp);
  return sp;
}

/* a splash's ring and two droplets, shared by a drip's landing and a
   bubble's pop: `k` 0..1 through it, at (x, y) */
function splash(sp, x, y, k, size, vx) {
  const { ring, dots } = sp;
  ring.x = x; ring.y = y;
  ring.scale.set(FX_TEXEL * size * (0.35 + 0.75 * k), FX_TEXEL * size * (0.35 + 0.75 * k));
  ring.alpha = 0.85 * (1 - k);
  const t = k * 0.36;
  for (let i = 0; i < dots.length; i++) {
    const dir = i ? 1 : -1, v = vx[i];
    dots[i].x = x + dir * v * t;
    dots[i].y = y - (size * 46 * t - 0.5 * DOT_G * t * t);
    dots[i].alpha = k < 0.85 ? 1 : (1 - k) / 0.15;
  }
}
function hideSplash(sp) {
  sp.ring.alpha = 0;
  for (const d of sp.dots) d.alpha = 0;
}

/* ═══ DRIPS ═══
   `tips` [{ x, y, land }]: a drop forms hanging under (x, y) and lands on
   row `land`, all in `parent`'s game px; `every` [min, max] seconds a tip
   waits between drops. */
export class Drips {
  constructor(parent, tips, fx, opt = {}) {
    this.kind = 'drips';
    this.c = new Container();
    this.c.label = 'grottoDrips';
    parent.addChild(this.c);
    const every = opt.every || [1.6, 5.5];
    this.every = every;
    this.size = opt.size || 1;
    this.d = tips.map((t) => {
      const drop = piece(this.c, fx.drop, 0.5, 0, FX_TEXEL * this.size);
      const ring = piece(this.c, fx.ring, 0.5, 0.5, FX_TEXEL);
      const dots = [piece(this.c, fx.dot, 0.5, 0.5, FX_TEXEL), piece(this.c, fx.dot, 0.5, 0.5, FX_TEXEL)];
      /* `shade(y)`: the form shading of the picture they belong to at a
         height (formShade.js's own-quad `_vShade`), so a drop is no brighter
         than the painted drip it forms on */
      if (opt.shade) { drop._vShade = opt.shade(t.y); ring._vShade = dots[0]._vShade = dots[1]._vShade = opt.shade(t.land); }
      /* each tip starts somewhere in its wait, so they never drop together */
      return { x: t.x, y: t.y, land: Math.max(t.y + 4, t.land), drop, sp: { ring, dots }, ph: 'wait', t: 0, dur: between(0, every[1]), yy: t.y, vy: 0, vx: [0, 0] };
    });
    _live.add(this);
  }

  step(dt) {
    if (calmNow()) { for (const d of this.d) { d.drop.alpha = 0; hideSplash(d.sp); } return; }
    for (const d of this.d) {
      d.t += dt;
      if (d.ph === 'wait') {
        if (d.t >= d.dur) { d.ph = 'grow'; d.t = 0; d.dur = between(1.1, 2.4); }
        continue;
      }
      if (d.ph === 'grow') {
        /* it swells under the tip, and stretches as it is about to go */
        const k = Math.min(1, d.t / d.dur), e = 1 - (1 - k) * (1 - k);
        const s = FX_TEXEL * this.size * (0.3 + 0.7 * e);
        d.drop.x = d.x; d.drop.y = d.y - 1;
        d.drop.scale.set(s, s * (1 + 0.3 * k * k * k));
        d.drop.alpha = 1;
        if (k >= 1) { d.ph = 'fall'; d.t = 0; d.yy = d.y - 1; d.vy = 0; }
        continue;
      }
      if (d.ph === 'fall') {
        d.vy += DROP_G * dt;
        d.yy += d.vy * dt;
        const s = FX_TEXEL * this.size;
        d.drop.y = d.yy;
        d.drop.scale.set(s * 0.9, s * 1.25);
        if (d.yy + 3 * s >= d.land) {
          d.ph = 'splash'; d.t = 0; d.dur = 0.38;
          d.drop.alpha = 0;
          d.vx = [between(14, 26), between(14, 26)];
        }
        continue;
      }
      if (d.ph === 'splash') {
        const k = Math.min(1, d.t / d.dur);
        splash(d.sp, d.x, d.land, k, this.size, d.vx);
        if (k >= 1) { hideSplash(d.sp); d.ph = 'wait'; d.t = 0; d.dur = between(this.every[0], this.every[1]); }
      }
    }
  }

  _count(o) {
    for (const d of this.d) {
      o.drips++;
      if (d.ph === 'grow') o.forming++;
      else if (d.ph === 'fall') o.falling++;
      else if (d.ph === 'splash') o.splashing++;
    }
  }

  destroy() {
    _live.delete(this);
    try { this.c.destroy({ children: true, texture: false, textureSource: false }); } catch (e) { /* gone */ }
  }
}

/* ═══ BUBBLES AND GLINTS ═══
   `pts` [[x, y]] spots on a pool's surface in `parent`'s game px; `bubbles`
   and `glints` how many of each may be up at once; `gold` [[x, y]] coins that
   glint gold (the junk heap's). */
export class Bubbles {
  constructor(parent, pts, fx, opt = {}) {
    this.kind = 'bubbles';
    this.c = new Container();
    this.c.label = 'grottoBubbles';
    parent.addChild(this.c);
    this.pts = pts;
    this.gold = opt.gold || [];
    this.size = opt.size || 1;
    this.b = [];
    for (let i = 0; i < (opt.bubbles != null ? opt.bubbles : 2) && pts.length; i++) {
      const bub = piece(this.c, fx.bubble, 0.5, 1, FX_TEXEL);
      const ring = piece(this.c, fx.ring, 0.5, 0.5, FX_TEXEL);
      const dots = [piece(this.c, fx.dot, 0.5, 0.5, FX_TEXEL), piece(this.c, fx.dot, 0.5, 0.5, FX_TEXEL)];
      this.b.push({ bub, sp: { ring, dots }, ph: 'wait', t: 0, dur: between(0.3, 4), at: pts[0], big: 1, vx: [0, 0] });
    }
    this.g = [];
    const glints = (opt.glints != null ? opt.glints : 2) * (pts.length ? 1 : 0);
    for (let i = 0; i < glints + (this.gold.length ? 1 : 0); i++) {
      const sp = piece(this.c, fx.glint, 0.5, 0.5, GLINT_TEXEL);
      const gold = i >= glints;
      sp.tint = gold ? 0xffe39a : 0xffffff;
      this.g.push({ sp, gold, t: 0, dur: between(0.2, 2.5), on: false, at: (gold ? this.gold : pts)[0] });
    }
    _live.add(this);
  }

  step(dt) {
    if (calmNow()) {
      for (const b of this.b) { b.bub.alpha = 0; hideSplash(b.sp); }
      for (const g of this.g) g.sp.alpha = 0;
      return;
    }
    for (const b of this.b) {
      b.t += dt;
      if (b.ph === 'wait') {
        if (b.t >= b.dur) {
          b.ph = 'grow'; b.t = 0; b.dur = between(0.6, 1.4);
          b.at = this.pts[(rnd() * this.pts.length) | 0];
          b.big = this.size * between(0.75, 1.3);
        }
        continue;
      }
      if (b.ph === 'grow') {
        const k = Math.min(1, b.t / b.dur);
        b.bub.x = b.at[0]; b.bub.y = b.at[1] + 1.5 * b.big;
        const s = FX_TEXEL * b.big * (0.15 + 0.85 * Math.pow(k, 0.7));
        b.bub.scale.set(s, s);
        b.bub.alpha = 1;
        if (k >= 1) { b.ph = 'pop'; b.t = 0; b.dur = 0.32; b.bub.alpha = 0; b.vx = [between(8, 16), between(8, 16)]; }
        continue;
      }
      const k = Math.min(1, b.t / b.dur);
      splash(b.sp, b.at[0], b.at[1], k, 0.75 * b.big, b.vx);
      if (k >= 1) { hideSplash(b.sp); b.ph = 'wait'; b.t = 0; b.dur = between(0.9, 4.2); }
    }
    for (const g of this.g) {
      g.t += dt;
      if (!g.on) {
        g.sp.alpha = 0;
        if (g.t >= g.dur) {
          const set = g.gold ? this.gold : this.pts;
          g.at = set[(rnd() * set.length) | 0];
          g.on = true; g.t = 0; g.dur = between(0.32, 0.5);
        }
        continue;
      }
      const k = Math.min(1, g.t / g.dur), a = Math.sin(Math.PI * k);
      g.sp.x = g.at[0]; g.sp.y = g.at[1];
      g.sp.scale.set(GLINT_TEXEL * (0.4 + 0.7 * a));
      g.sp.alpha = a;
      if (k >= 1) { g.on = false; g.sp.alpha = 0; g.t = 0; g.dur = g.gold ? between(1.2, 3.5) : between(0.4, 2.6); }
    }
  }

  _count(o) {
    o.pools++;
    for (const b of this.b) if (b.ph !== 'wait') o.bubbles++;
    for (const g of this.g) if (g.on) o.glints++;
  }

  destroy() {
    _live.delete(this);
    try { this.c.destroy({ children: true, texture: false, textureSource: false }); } catch (e) { /* gone */ }
  }
}

/* ═══ A TORCH'S FIRE ═══
   `holder` stands where the torch post does and is sorted just before it, so
   the basket's front bars draw over the flame; `fire` [x, y, w] the basket's
   middle, its floor and its width in the holder's game px; `cf` the campfire's
   pictures (campfireFx.campfireAtlas()); `ground` the floor's layer for the
   light round its foot (null for none), at (gx, gy) there. */
/* campfireFx.js FLAME_MS: the campfire's 12.5 frames a second (that module
   is not imported here: it brings the entity renderer with it) */
const FLAME_MS = 80, SPARKS = 6;
export class TorchFire {
  constructor(holder, fire, cf, ground, gx, gy) {
    const [x, y, w] = fire;
    this.kind = 'fire';
    this.holder = holder;
    this.x = x; this.y = y;
    /* game px a flame texel: the flame a little wider than the basket's
       inside, so it climbs out over its rim -- one as wide as the basket
       stayed inside it, behind its bars, a faint orange glint */
    this.u = Math.max(0.6, Math.min(2.2, (w * 1.25) / FLAME_W));
    this.cf = cf;
    this.phase = (rnd() * FLAME_FRAMES * FLAME_MS) | 0;
    this.seed = rnd() * 100;
    this.halo = new Sprite(cf.halo);
    this.halo.anchor.set(0.5, 0.5);
    this.halo.blendMode = 'add';
    this.halo.tint = 0xffa650;
    this.flame = new Sprite(cf.flame[3][0]);
    this.flame.anchor.set(0.5, 1);
    this.flame.scale.set(this.u);
    this.flame.x = x; this.flame.y = y + this.u;
    this.sparkC = new Container();
    holder.addChild(this.halo, this.flame, this.sparkC);
    this.sparks = [];
    for (let i = 0; i < SPARKS; i++) {
      const sp = new Sprite(cf.sq);
      sp.anchor.set(0.5, 0.5);
      sp.scale.set(this.u * 0.9);
      sp.alpha = 0;
      this.sparkC.addChild(sp);
      this.sparks.push({ sp, life: 0, age: 1, x: 0, y: 0, vx: 0, vy: 0, ph: rnd() * 6.28 });
    }
    this.glow = null;
    if (ground) {
      this.glow = new Sprite(cf.glow);
      this.glow.anchor.set(0.5, 0.5);
      this.glow.blendMode = 'add';
      this.glow.tint = 0xff9a3c;
      this.glow.scale.set(1.9, 2.4);
      this.glow.x = gx; this.glow.y = gy;
      ground.addChild(this.glow);
    }
    this._acc = 0;
    this.frame = 0;
    _live.add(this);
  }

  step(dt, now) {
    const calm = calmNow();
    /* the campfire's flame loop, each torch on its own clock */
    const frame = calm ? 0 : Math.floor((now + this.phase) / FLAME_MS) % FLAME_FRAMES;
    const ft = this.cf.flame[3][frame];
    if (this.flame.texture !== ft) this.flame.texture = ft;
    this.frame = frame;
    const flick = calm ? 0.85 : 0.78 + 0.12 * Math.sin(now / 97 + this.seed) + 0.1 * Math.sin(now / 41 + 1.3);
    this.halo.x = this.x; this.halo.y = this.y - 9 * this.u;
    this.halo.scale.set(this.u * 2.1);
    this.halo.alpha = 0.36 * flick;
    if (this.glow) this.glow.alpha = 0.46 * flick;
    /* sparks leave the flame's top and climb, cooling as they go */
    if (!calm) {
      this._acc += dt * 4.5;
      while (this._acc >= 1) {
        this._acc -= 1;
        const s = this.sparks.find((e) => e.age >= e.life);
        if (!s) break;
        s.age = 0; s.life = between(0.5, 1.1);
        s.x = this.x + between(-2.5, 2.5) * this.u; s.y = this.y - 16 * this.u;
        s.vx = between(-8, 8); s.vy = -between(22, 40);
      }
    }
    for (const s of this.sparks) {
      if (calm || s.age >= s.life) { s.sp.alpha = 0; continue; }
      s.age += dt;
      s.vx += Math.sin(s.age * 7 + s.ph) * 14 * dt;
      s.x += s.vx * dt; s.y += s.vy * dt;
      const k = s.age / s.life;
      s.sp.x = s.x; s.sp.y = s.y;
      s.sp.tint = emberColor(k);
      s.sp.alpha = k > 0.88 && ((now / 60 + s.ph) | 0) % 2 ? 0 : 1;
    }
  }

  _count(o) {
    o.fires++;
    for (const s of this.sparks) if (s.age < s.life) o.sparks++;
  }

  destroy() {
    _live.delete(this);
    for (const o of [this.halo, this.flame, this.sparkC, this.glow]) {
      if (!o) continue;
      try { o.destroy({ children: true, texture: false, textureSource: false }); } catch (e) { /* gone */ }
    }
  }
}

/* ═══ SPORES ═══
   `caps` [[x, y]] on a mushroom cluster's caps in `parent`'s game px; `n` how
   many float at once.  Glowing motes that drift up and sway, and go out. */
export class Spores {
  constructor(parent, caps, fx, n = 3) {
    this.kind = 'spores';
    this.c = new Container();
    this.c.label = 'grottoSpores';
    parent.addChild(this.c);
    this.caps = caps;
    this.s = [];
    for (let i = 0; i < n && caps.length; i++) {
      const sp = piece(this.c, fx.spore, 0.5, 0.5, SPORE_TEXEL);
      sp.tint = 0xc6f8ff;
      sp.blendMode = 'add';
      this.s.push({ sp, age: 0, life: 0, wait: between(0, 3), x: 0, y: 0, vy: 0, ph: rnd() * 6.28 });
    }
    _live.add(this);
  }

  step(dt) {
    if (calmNow()) { for (const s of this.s) s.sp.alpha = 0; return; }
    for (const s of this.s) {
      if (s.age >= s.life) {
        s.sp.alpha = 0;
        s.wait -= dt;
        if (s.wait > 0) continue;
        const at = this.caps[(rnd() * this.caps.length) | 0];
        s.x = at[0] + between(-2, 2); s.y = at[1];
        s.vy = -between(6, 11); s.age = 0; s.life = between(2.2, 3.8); s.wait = between(0.4, 2.6);
      }
      s.age += dt;
      const k = s.age / s.life;
      s.y += s.vy * dt;
      s.sp.x = s.x + Math.sin(s.age * 1.7 + s.ph) * 2.2;
      s.sp.y = s.y;
      s.sp.alpha = k < 0.15 ? k / 0.15 * 0.9 : k > 0.55 ? 0.9 * (1 - (k - 0.55) / 0.45) : 0.9;
    }
  }

  _count(o) { for (const s of this.s) if (s.age < s.life) o.spores++; }

  destroy() {
    _live.delete(this);
    try { this.c.destroy({ children: true, texture: false, textureSource: false }); } catch (e) { /* gone */ }
  }
}

/* ═══ THE FERNS THAT SWAY ═══
   worldLife.js leans each by its own spring in the world's wind, about its
   anchor (its base): `x`, `y` where it stands in the world, for the spring's
   own phase and the gusts. */
const _swayers = new Set();
export function addGrottoSwayer(spr, x, y) {
  spr._grottoAt = [x, y];
  _swayers.add(spr);
}
export function removeGrottoSwayer(spr) {
  _swayers.delete(spr);
}
/** Each fern still drawn: `fn(sprite, x, y)`. */
export function forEachGrottoSwayer(fn) {
  for (const s of _swayers) {
    if (!s || s.destroyed) { _swayers.delete(s); continue; }
    if (!s.parent) continue;
    fn(s, s._grottoAt[0], s._grottoAt[1]);
  }
}
