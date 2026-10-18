/* ═══ v2.3.3346: EACH LAND'S TREES AND ROCKS LOOK LIKE THEIR LAND ═══
 *
 * The owner, 2026-10-18: a wood's tree and a metal's rock are ONE picture in
 * every land (so a tier's colour is the same everywhere: tierTrees.js,
 * tierOre.js), and "Maybe you add effects to a pine tree to make it look like
 * it belongs in that elemental zone but the wood logs stay the same?", "keep
 * in mind there are actually 10 elemental zones (dark, light, floral, poison,
 * wind, ice, fire, water, electric, stone)".
 *
 * So each resource in a land wears its element, drawn in code over its
 * picture -- the picture itself never changes:
 *
 *   frost    snow shaken off the crown, a glint of rime now and then
 *   ember    embers rising off it, flickering out, a warm glow at its foot
 *   sky      sand streaming off it downwind
 *   hollows  dust sifting down, crystal glints on it
 *   thunder  sparks crackling, a little arc jumping now and then, a
 *            flickering glow at its foot
 *   tidal    drips falling from it, a breath of mist
 *   mist     green spores rising and wobbling, a sickly haze at its foot
 *   verdant  petals drifting down, a firefly or two
 *   dark     shadow wisps rising   } the realms past the far gates: not
 *   light    motes of light rising } built yet, their looks ready for them
 *
 * SEEN ON A PHONE.  The first cut drew 1.5-2.5 px squares, a handful a tree:
 * at the Wheel's scale (0.6 CSS px a world px) a speck was one or two device
 * pixels, and the phone pictures showed the trees bare.  So each kind has a
 * shape of its own -- a flake, a streak, a drop, a petal, a glint, a glow --
 * 3 to 10 world px, and the lights (embers, sparks, spores, fireflies, glints)
 * are drawn ADDED to what is under them, so they shine on any ground.  Still
 * a breath, not a storm: about a dozen at a time on a tree, fewer on a rock.
 *
 * THE DRAWING: each resource near the view that is in a land gets a Container
 * that RIDES on its picture (depthSort `_ridesOn`, as buildingFire.js): in
 * its layer, a quarter step after it, so its specks are drawn just in front
 * of it and behind anyone south of it, wherever the depth pass moves it; at
 * its alpha, so a tree you stand behind is seen through with its specks.
 * At most AURA_MAX alive, PER_MAX on one resource; specks let go are pooled.
 * A resource mined out stops making them and its last ones finish; one that
 * leaves the view lets them go at once.
 *
 * THE TEXTURES are seven small canvases (under 10 KB in all) made behind the
 * Wheel's loading screen (landAurasWarm, from worldTrial.preloadWheel, as
 * the buildings' life: wheelLife.js) and destroyed on leaving the Wheel
 * (landAurasFree, wheelOnStop) -- every sprite drawing them first.  Without
 * them nothing is drawn.
 *
 * `?noauras` leaves the resources plain.
 */
import { Container, Sprite, Texture, CanvasSource } from 'pixi.js';
import { treeGeom } from '../game/tierTrees.js';
import { oreGeom } from '../game/tierOre.js';
import { wheelOnStop } from '../game/wheelTrial.js';

/* at most this many specks alive, all resources together, and on one */
export const AURA_MAX = 260;
export const PER_MAX = 36;
export const AURAS_ON = (() => {
  try { return !/(^|[?&])noauras(&|$)/.test(window.location.search || ''); } catch (e) { return true; }
})();

/* A resource's land: the worker names its Wheel nodes `wn-<land>-<k>`
   (wheelzone.js _wheelSpawnNodes); the commons is no land */
export function auraLandOf(node) {
  const m = node && /^wn-([a-z]+)-/.exec(String(node.id));
  return m ? m[1] : null;
}

/* ── each land's specks ──
   rate     specks a second for a resource 100 world px across (a bigger one
            makes more, a smaller fewer)
   parts    the kinds it makes, each its share `w` of them:
     tex      the shape (the textures below)
     life     ms, [min, max]
     from     where in the resource's box it starts: 'crown' (its upper two
              thirds), 'top' (its upper quarter), 'all', 'low' (its lower half)
     v        world px a second, [vx, vy], each +/- `jit`; `g` adds to vy each
              second (a drop falls faster)
     sway     a sideways wander, px
     colors   picked at random
     size     world px across, [min, max] (a streak's length)
     thick    a streak's thickness, world px, [min, max]
     add      drawn added to what is under it (a light)
     blink    how often a frame dims it (sparks, embers)
     spin     turns as it goes, radians a second (petals, flakes)
     still    stays where it starts (a glint)
     fade     'in-out', 'out', or 'pulse' (up and down once)
     zap      an arc: this many specks along a jagged line, all at once
   base     a glow at its foot: colour, [min, max] alpha, its width and
            height as shares of the resource's width, added or not */
export const LAND_AURAS = Object.freeze({
  frost: { rate: 5.5, parts: [
    { w: 0.85, tex: 'flake', life: [2200, 3400], from: 'crown', v: [4, 15], jit: [5, 4], sway: 9, colors: [0xffffff, 0xeef7ff, 0xdcefff], size: [5, 7], spin: 1.2, fade: 'in-out' },
    { w: 0.15, tex: 'glint', life: [500, 900], from: 'all', v: [0, 0], jit: [0, 0], colors: [0xf4fbff, 0xd8f0ff], size: [11, 15], add: true, still: true, fade: 'pulse' },
  ] },
  ember: { rate: 6, base: { color: 0xffa848, alpha: [0.22, 0.42], w: 1.0, h: 0.36, add: true }, parts: [
    { w: 0.8, tex: 'glow', life: [900, 1700], from: 'top', v: [0, -30], jit: [10, 8], sway: 6, colors: [0xffb347, 0xff8a34, 0xffd36a], size: [12, 17], add: true, blink: 0.22, fade: 'out' },
    { w: 0.2, tex: 'dot', life: [1600, 2600], from: 'crown', v: [3, 12], jit: [6, 4], sway: 5, colors: [0x4a4440, 0x6b625a], size: [3, 4.5], spin: 2, fade: 'in-out' },
  ] },
  sky: { rate: 8, parts: [
    { w: 1, tex: 'streak', life: [600, 1100], from: 'all', v: [-75, 5], jit: [22, 6], sway: 2, colors: [0xead6a0, 0xd9bf7e, 0xf6e8bf], size: [11, 16], thick: [2.4, 3.2], fade: 'in-out' },
  ] },
  hollows: { rate: 4.5, parts: [
    { w: 0.65, tex: 'dot', life: [1600, 2600], from: 'all', v: [0, 9], jit: [3, 3], sway: 3, colors: [0xcdbfa8, 0xb8a990, 0xe3d6c0], size: [3, 4.5], fade: 'in-out' },
    { w: 0.35, tex: 'glint', life: [600, 1000], from: 'all', v: [0, 0], jit: [0, 0], colors: [0xc9ecff, 0xe2d4ff, 0xffffff], size: [11, 15], add: true, still: true, fade: 'pulse' },
  ] },
  thunder: { rate: 10, base: { color: 0xb8a8ff, alpha: [0.1, 0.42], w: 0.9, h: 0.32, add: true, flicker: true }, parts: [
    { w: 0.85, tex: 'glow', life: [160, 380], from: 'all', v: [0, 0], jit: [40, 40], colors: [0xfff6a8, 0xd8c8ff, 0xffffff], size: [10, 14], add: true, blink: 0.45, fade: 'out' },
    { w: 0.15, tex: 'dot', life: [110, 200], from: 'all', v: [0, 0], jit: [0, 0], colors: [0xf4f0ff, 0xfff8c0], size: [3, 4], add: true, still: true, fade: 'out', zap: 6 },
  ] },
  tidal: { rate: 6, parts: [
    { w: 0.8, tex: 'drop', life: [650, 1050], from: 'low', v: [0, 30], jit: [1, 8], g: 90, colors: [0xc8eeff, 0x96d8f2, 0xeefaff], size: [5, 6.5], fade: 'out' },
    { w: 0.2, tex: 'glow', life: [1800, 2800], from: 'crown', v: [4, -4], jit: [4, 3], sway: 6, colors: [0xd6f4ff, 0xbfe9f7], size: [20, 30], alpha: 0.3, fade: 'in-out' },
  ] },
  mist: { rate: 5, base: { color: 0x9cff6a, alpha: [0.1, 0.24], w: 1.0, h: 0.32, add: true }, parts: [
    { w: 1, tex: 'glow', life: [1700, 2900], from: 'crown', v: [0, -13], jit: [5, 4], sway: 8, colors: [0xb6f07a, 0x92e25c, 0xdcff9e], size: [10, 14], add: true, fade: 'in-out' },
  ] },
  verdant: { rate: 4, parts: [
    { w: 0.72, tex: 'petal', life: [2200, 3400], from: 'crown', v: [7, 14], jit: [6, 4], sway: 10, colors: [0xffbfd6, 0xfff2f6, 0xffe27a, 0xf59ac0], size: [6, 8], spin: 2.4, fade: 'in-out' },
    { w: 0.28, tex: 'glow', life: [2400, 3800], from: 'all', v: [0, 0], jit: [0, 0], colors: [0xf4ff8a, 0xd6ff70], size: [10, 13], add: true, fly: true, fade: 'in-out' },
  ] },
  /* the owner's other two elements: the Dark and Light realms past the far
     gates are not built yet, so nothing wears these until a resource there
     has an id that names them (`wn-dark-<k>`, `wn-light-<k>`) */
  dark: { rate: 4, base: { color: 0x2a1a3a, alpha: [0.2, 0.34], w: 1.0, h: 0.36, add: false }, parts: [
    { w: 1, tex: 'glow', life: [1700, 2700], from: 'crown', v: [0, -12], jit: [5, 4], sway: 6, colors: [0x3a2a4a, 0x241a30, 0x5a3f73], size: [14, 20], alpha: 0.7, fade: 'in-out' },
  ] },
  light: { rate: 4, base: { color: 0xfff1b0, alpha: [0.14, 0.28], w: 1.0, h: 0.32, add: true }, parts: [
    { w: 1, tex: 'glow', life: [1500, 2500], from: 'all', v: [0, -16], jit: [4, 3], sway: 4, colors: [0xfff8d0, 0xffffff, 0xffe9a0], size: [10, 14], add: true, blink: 0.1, fade: 'in-out' },
  ] },
});

/* ── the textures: made behind the Wheel's loading screen, freed on leaving ── */
let _tex = null;
const _live = new Set();   /* every LandAuras, so the textures' end lets their sprites go first */
function canvasTexture(w, h, draw, linear) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  return new Texture({ source: new CanvasSource({ resource: c, width: w, height: h, resolution: 1, scaleMode: linear ? 'linear' : 'nearest' }) });
}
/* Made once a visit (worldTrial.preloadWheel).  Safe to call again. */
export function landAurasWarm() {
  if (_tex || !AURAS_ON || typeof document === 'undefined') return;
  try {
    _tex = {
      /* a speck: a square, its edge a little dimmer (the buildings' spark) */
      dot: canvasTexture(4, 4, (g) => {
        g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(0, 0, 4, 4);
        g.fillStyle = '#fff'; g.fillRect(1, 1, 2, 2);
      }),
      /* a light: a solid heart a quarter of it across, then soft to nothing
         (soft all the way in, an ember 8 world px across read as a smudge of
         2 px on a phone: the phone pictures showed no embers at all) */
      glow: canvasTexture(32, 32, (g) => {
        const rg = g.createRadialGradient(16, 16, 0, 16, 16, 16);
        rg.addColorStop(0, 'rgba(255,255,255,1)');
        rg.addColorStop(0.26, 'rgba(255,255,255,1)');
        rg.addColorStop(0.42, 'rgba(255,255,255,0.5)');
        rg.addColorStop(0.68, 'rgba(255,255,255,0.14)');
        rg.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = rg; g.fillRect(0, 0, 32, 32);
      }, true),
      /* a snowflake: a plus with its corners dim, pixel-drawn */
      flake: canvasTexture(5, 5, (g) => {
        g.fillStyle = 'rgba(255,255,255,0.45)';
        g.fillRect(0, 0, 1, 1); g.fillRect(4, 0, 1, 1); g.fillRect(0, 4, 1, 1); g.fillRect(4, 4, 1, 1);
        g.fillStyle = '#fff';
        g.fillRect(2, 0, 1, 5); g.fillRect(0, 2, 5, 1); g.fillRect(1, 1, 3, 3);
      }),
      /* a grain of sand blown along: bright at its head, its tail fading */
      streak: canvasTexture(8, 2, (g) => {
        for (let x = 0; x < 8; x++) { g.fillStyle = `rgba(255,255,255,${(0.15 + 0.85 * (1 - x / 7)).toFixed(2)})`; g.fillRect(x, 0, 1, 2); }
      }),
      /* a drop: rounder at its foot, a highlight at its top */
      drop: canvasTexture(3, 6, (g) => {
        g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(1, 0, 1, 2);
        g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(0, 2, 3, 3); g.fillRect(1, 5, 1, 1);
        g.fillStyle = '#fff'; g.fillRect(1, 1, 1, 3);
      }),
      /* a petal: an oval with a darker heel */
      petal: canvasTexture(5, 4, (g) => {
        g.fillStyle = '#fff'; g.fillRect(1, 0, 3, 4); g.fillRect(0, 1, 5, 2);
        g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, 2, 2, 1); g.fillRect(1, 3, 1, 1);
      }),
      /* a glint: a four-pointed star (the buildings' glint, smaller) */
      glint: canvasTexture(11, 11, (g) => {
        g.fillStyle = 'rgba(255,255,255,0.5)';
        g.fillRect(5, 0, 1, 11); g.fillRect(0, 5, 11, 1);
        g.fillStyle = '#fff';
        g.fillRect(5, 2, 1, 7); g.fillRect(2, 5, 7, 1);
        g.fillRect(4, 4, 3, 3);
      }),
    };
  } catch (e) {
    _tex = null;
  }
}
/* Leaving the Wheel: every sprite drawing them let go, then the textures */
export function landAurasFree() {
  for (const a of _live) { try { a.clear(); a._emptyPool(); } catch (e) { /* gone */ } }
  if (!_tex) return;
  for (const t of Object.values(_tex)) { try { t.destroy(true); } catch (e) { /* gone */ } }
  _tex = null;
}
export function landAurasReady() { return !!_tex; }
wheelOnStop(landAurasFree);

/* the box a resource's specks start in, world px, and its foot's offset from
   the node's point (its container stands there, for the depth pass) */
function boxOf(node) {
  if (node.nodeType === 'tree') {
    const g = treeGeom(node);
    return { l: g.left, r: g.right, t: g.top, b: g.footY, foot: g.footY - node.y };
  }
  if (node.nodeType === 'oreVein') {
    const g = oreGeom(node);
    return { l: g.left, r: g.right, t: g.top, b: g.footY, foot: g.footY - node.y };
  }
  return null;
}

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[(Math.random() * a.length) | 0];
function pickPart(parts) {
  let r = Math.random();
  for (const p of parts) { r -= p.w; if (r <= 0) return p; }
  return parts[parts.length - 1];
}

export class LandAuras {
  constructor(layer) {
    this.layer = layer;       /* where a resource with no picture any more finishes its specks */
    this.at = new Map();      /* node -> { c, land, box, acc, made, parts: [], base } */
    this.pool = [];           /* specks let go, to be used again */
    this.live = 0;
    this.stats = { made: 0 };
    _live.add(this);
  }

  _make(node, land) {
    const box = boxOf(node);
    if (!box) return null;
    const c = new Container();
    c.label = 'landAura';
    c.x = node.x; c.y = node.y;
    c._groundDy = box.foot;
    this.layer.addChild(c);
    const e = { c, land, box, acc: Math.random(), made: 0, parts: [], base: null, ph: Math.random() * 6.283 };
    const B = LAND_AURAS[land].base;
    if (B && _tex) {
      const s = new Sprite(_tex.glow);
      s.anchor.set(0.5);
      s.tint = B.color;
      if (B.add) s.blendMode = 'add';
      const w = (box.r - box.l) * B.w;
      s.scale.set(w / 32, Math.max(10, w * B.h) / 32);
      s.x = (box.l + box.r) / 2 - node.x;
      s.y = box.foot;
      s.alpha = B.alpha[0];
      c.addChild(s);
      e.base = s;
    }
    return e;
  }

  /* ride on the resource's picture: in its layer, on its ground line, a
     quarter step after it (depthSort `_ridesOn`, as buildingFire.js does) --
     the depth pass moves a tree between layers as you walk round it */
  _ride(e, host) {
    const c = e.c;
    if (!host || host.destroyed || !host.parent) { c._ridesOn = null; return; }
    if (c.parent !== host.parent) host.parent.addChild(c);
    c.x = host.x; c.y = host.y;
    c._groundDy = host._groundDy || 0;
    if (c._ridesOn !== host) c._ridesOn = host;
    /* a tree you stand behind is seen through (effectsRenderer
       _treeSeeThrough): so are its specks */
    if (c.alpha !== host.alpha) c.alpha = host.alpha;
  }

  /** `nodes`: the resources near the view this frame (the effects renderer's
   *  own list); `dt` ms since the last frame. */
  update(nodes, dt) {
    if (!_tex) { if (this.at.size) this.clear(); return; }
    const keep = new Set();
    const step = Math.min(100, Math.max(0, dt)) / 1000;
    for (let k = 0; k < nodes.length; k++) {
      const node = nodes[k];
      if (!node || (node.nodeType !== 'tree' && node.nodeType !== 'oreVein')) continue;
      const land = auraLandOf(node);
      const A = land && LAND_AURAS[land];
      if (!A) continue;
      let e = this.at.get(node);
      if (!e || e.c.destroyed) {
        if (!node.alive || !node._pixiSprite) continue;
        e = this._make(node, land);
        if (!e) continue;
        this.at.set(node, e);
      }
      keep.add(node);
      this._ride(e, node._pixiSprite);
      /* made by the resource's width, while it stands -- a rock as if 70 px
         across at the least (the copper's 58 made almost none) */
      if (node.alive) {
        e.acc += A.rate * (Math.max(70, e.box.r - e.box.l) / 100) * step;
        while (e.acc >= 1) {
          e.acc -= 1;
          if (this.live >= AURA_MAX || e.parts.length >= PER_MAX) { e.acc = 0; break; }
          this._spawn(e, pickPart(A.parts), node);
        }
      }
      this._move(e, step);
      if (e.base) {
        const B = A.base;
        e.ph += step * (B.flicker ? 9 : 1.6);
        const k2 = B.flicker ? (Math.random() < 0.3 ? Math.random() : 0.5 + 0.5 * Math.sin(e.ph)) : 0.5 + 0.5 * Math.sin(e.ph);
        e.base.alpha = node.alive ? B.alpha[0] + (B.alpha[1] - B.alpha[0]) * k2 : Math.max(0, e.base.alpha - step);
      }
    }
    for (const [node, e] of this.at) {
      if (keep.has(node) && (node.alive || e.parts.length)) continue;
      this._drop(e);
      this.at.delete(node);
    }
  }

  _sprite(P) {
    const s = this.pool.pop() || new Sprite(_tex[P.tex]);
    if (s.texture !== _tex[P.tex]) s.texture = _tex[P.tex];
    s.anchor.set(0.5);
    s.blendMode = P.add ? 'add' : 'normal';
    s.tint = pick(P.colors);
    s.rotation = 0;
    s.alpha = 0;
    s.visible = true;
    return s;
  }

  _spawn(e, P, node) {
    const b = e.box, h = b.b - b.t, w = b.r - b.l;
    let x, y;
    if (P.from === 'top') { x = rnd(b.l + w * 0.2, b.r - w * 0.2); y = b.t + rnd(0, h * 0.25); }
    else if (P.from === 'crown') { x = rnd(b.l + w * 0.1, b.r - w * 0.1); y = b.t + rnd(0, h * 0.66); }
    else if (P.from === 'low') { x = rnd(b.l + w * 0.12, b.r - w * 0.12); y = b.t + rnd(h * 0.35, h * 0.75); }
    else { x = rnd(b.l + w * 0.1, b.r - w * 0.1); y = b.t + rnd(h * 0.1, h * 0.95); }
    const n = P.zap ? Math.min(P.zap, AURA_MAX - this.live, PER_MAX - e.parts.length) : 1;
    /* an arc: specks along a jagged line from here, a short way in a random
       direction, all lit at once */
    const ang = Math.random() * 6.283, len = rnd(14, 26);
    for (let i = 0; i < n; i++) {
      const s = this._sprite(P);
      const tx = n > 1 ? (i / (n - 1)) : 0;
      const px = x + Math.cos(ang) * len * tx + (n > 1 ? rnd(-3, 3) : 0);
      const py = y + Math.sin(ang) * len * tx + (n > 1 ? rnd(-3, 3) : 0);
      const size = rnd(P.size[0], P.size[1]);
      const tw = s.texture.width || 1;
      s.scale.set(size / tw);
      if (P.thick) s.scale.y = rnd(P.thick[0], P.thick[1]) / (s.texture.height || 1);
      e.c.addChild(s);
      e.parts.push({ s, P, size, k: size / tw, x: px - node.x, y: py - node.y,
        vx: P.v[0] + rnd(-P.jit[0], P.jit[0]), vy: P.v[1] + rnd(-P.jit[1], P.jit[1]),
        t: 0, life: rnd(P.life[0], P.life[1]), ph: Math.random() * 6.283, spin: P.spin ? rnd(-P.spin, P.spin) : 0 });
      this.live++;
      this.stats.made++;
      e.made++;
    }
  }

  _free(s) {
    if (s.parent) s.parent.removeChild(s);
    if (this.pool.length < AURA_MAX) this.pool.push(s); else s.destroy();
  }

  _move(e, step) {
    for (let i = e.parts.length - 1; i >= 0; i--) {
      const p = e.parts[i], P = p.P;
      p.t += step * 1000;
      if (p.t >= p.life) { this._free(p.s); e.parts.splice(i, 1); this.live--; continue; }
      const q = p.t / p.life;
      if (P.fly) {
        /* a firefly: a slow wander */
        p.x += Math.cos(p.ph + p.t / 700) * 12 * step;
        p.y += Math.sin(p.ph * 1.3 + p.t / 900) * 9 * step;
      } else if (!P.still) {
        if (P.g) p.vy += P.g * step;
        p.x += p.vx * step; p.y += p.vy * step;
      }
      const sway = P.sway ? Math.sin(p.ph + p.t / 420) * P.sway : 0;
      p.s.x = p.x + sway; p.s.y = p.y;
      if (p.spin) {
        p.s.rotation += p.spin * step;
        /* a petal or a flake turning over: narrower as it shows its edge */
        if (P.tex === 'petal') p.s.scale.x = p.k * (0.35 + 0.65 * Math.abs(Math.cos(p.ph + p.t / 260)));
      }
      let a = P.fade === 'out' ? 1 - q : P.fade === 'pulse' ? Math.sin(q * Math.PI) : (q < 0.18 ? q / 0.18 : q > 0.72 ? (1 - q) / 0.28 : 1);
      if (P.blink && Math.random() < P.blink) a *= 0.3;
      if (P.fade === 'pulse' && P.tex === 'glint') p.s.scale.set(p.k * (0.5 + 0.7 * a));
      if (P.fly) a *= 0.45 + 0.55 * Math.max(0, Math.sin(p.t / 170 + p.ph));
      p.s.alpha = Math.max(0, Math.min(1, a)) * (P.alpha != null ? P.alpha : 1);
    }
  }

  _drop(e) {
    for (const p of e.parts) this._free(p.s);
    this.live -= e.parts.length;
    e.parts.length = 0;
    if (e.base && !e.base.destroyed) { e.base.destroy(); }
    e.base = null;
    if (!e.c.destroyed) { if (e.c.parent) e.c.parent.removeChild(e.c); e.c.destroy({ children: true }); }
  }

  _emptyPool() {
    for (const s of this.pool) { try { s.destroy(); } catch (e) { /* gone */ } }
    this.pool.length = 0;
  }

  /** One resource's specks, for the tests (mp-landauras): its land, how many
   *  alive and made since it came into view, of which kinds, whether they ride
   *  on its picture, and how many lie outside its box grown by `pad` world px
   *  (the sand blows ~80 px downwind). */
  nodeProbe(id, pad = 120) {
    for (const [node, e] of this.at) {
      if (node.id !== id) continue;
      const host = node._pixiSprite;
      let outside = 0;
      const kinds = Object.create(null);
      for (const p of e.parts) {
        const x = e.c.x + p.s.x, y = e.c.y + p.s.y;
        if (x < e.box.l - pad || x > e.box.r + pad || y < e.box.t - pad || y > e.box.b + pad) outside++;
        kinds[p.P.tex] = (kinds[p.P.tex] || 0) + 1;
      }
      return { land: e.land, parts: e.parts.length, made: e.made, kinds, base: !!e.base, outside,
        rides: !!host && e.c._ridesOn === host && e.c.parent === host.parent };
    }
    return null;
  }

  /** what is alive, for the tests */
  probe() {
    const by = Object.create(null);
    for (const e of this.at.values()) by[e.land] = (by[e.land] || 0) + e.parts.length;
    return { live: this.live, resources: this.at.size, byLand: by, made: this.stats.made, pooled: this.pool.length, ready: !!_tex };
  }

  clear() {
    for (const e of this.at.values()) this._drop(e);
    this.at.clear();
    this.live = 0;
  }

  destroy() {
    this.clear();
    this._emptyPool();
    _live.delete(this);
  }
}
