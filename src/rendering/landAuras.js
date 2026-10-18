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
 *   frost    snow drifting down through the crown, a glint of rime on a rock
 *   ember    embers rising, flickering out
 *   sky      grains of sand streaming off downwind
 *   hollows  dust sifting down, crystal glints on the stone
 *   thunder  sparks crackling, a jump at a time
 *   tidal    drips falling from the leaves, a breath of mist
 *   mist     green spores rising, wobbling
 *   verdant  petals drifting down, a firefly or two
 *   dark     shadow wisps rising   } the realms past the far gates: not
 *   light    motes of light rising } built yet, their looks ready for them
 *
 * SUBTLE ON PURPOSE, as the buildings' life (wheelLife.js): a handful of
 * specks a resource, low alphas, nothing fast but the sand and the sparks.
 * The commons and BroTown wear nothing.
 *
 * THE DRAWING: each resource near the view that is in a land gets a Container
 * standing at its foot like any other prop, so the depth pass (depthSort.js)
 * draws its specks just in front of it and behind anyone south of it.  Every
 * speck is a sprite of ONE 2 x 2 white texture, tinted (the pixel look: square
 * specks, no blur), so they all draw in one batch; at most AURA_MAX alive.
 * A resource mined out stops making them and its last ones finish; one that
 * leaves the view lets them go at once.
 *
 * `?noauras` leaves the resources plain.
 */
import { Container, Sprite, Texture, CanvasSource } from 'pixi.js';
import { treeGeom } from '../game/tierTrees.js';
import { oreGeom } from '../game/tierOre.js';

/* at most this many specks alive, all resources together */
export const AURA_MAX = 180;
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
   rate     specks a second for a resource of 100 world px across (a bigger
            one makes more, a smaller fewer)
   life     ms, [min, max]
   from     where in the resource's box a speck starts: 'crown' (anywhere in
            its picture's upper two thirds), 'top' (its upper edge), 'all'
   v        world px a second: [vx, vy], each +/- `jit`
   sway     a sideways wander, px
   colors   picked at random
   size     px (a speck is a square: the pixel look)
   blink    a speck flickers (sparks, fireflies)
   fade     'in-out' or 'out' */
export const LAND_AURAS = Object.freeze({
  frost:   { rate: 2.2, life: [1800, 3000], from: 'crown', v: [4, 18], jit: [6, 4], sway: 6, colors: [0xffffff, 0xe8f6ff, 0xd4ecff], size: [1.5, 2.5], fade: 'in-out' },
  ember:   { rate: 2.0, life: [900, 1700], from: 'top', v: [0, -26], jit: [8, 8], sway: 4, colors: [0xffb347, 0xff7a2e, 0xffe08a], size: [1.5, 2], blink: 0.35, fade: 'out' },
  sky:     { rate: 2.6, life: [700, 1200], from: 'crown', v: [-58, 4], jit: [14, 4], sway: 2, colors: [0xe8d39a, 0xd9be7a, 0xf3e4b8], size: [1, 1.5], fade: 'in-out' },
  hollows: { rate: 1.4, life: [1500, 2600], from: 'all', v: [0, 8], jit: [3, 3], sway: 2, colors: [0xc9bba6, 0xb5a690, 0xe0f4ff], size: [1, 1.5], glint: 0.25, fade: 'in-out' },
  thunder: { rate: 2.4, life: [180, 420], from: 'all', v: [0, 0], jit: [30, 30], sway: 0, colors: [0xfff6a8, 0xd8c8ff, 0xffffff], size: [1.5, 2], blink: 0.6, fade: 'out' },
  tidal:   { rate: 1.8, life: [700, 1100], from: 'crown', v: [0, 46], jit: [1, 8], sway: 0, colors: [0xbfe8ff, 0x8fd4f0, 0xeaf8ff], size: [1, 1.5], fade: 'out' },
  mist:    { rate: 1.6, life: [1600, 2800], from: 'crown', v: [0, -12], jit: [5, 4], sway: 7, colors: [0xb6f07a, 0x8ee05a, 0xd8ff9e], size: [1.5, 2.5], fade: 'in-out' },
  verdant: { rate: 1.4, life: [2000, 3400], from: 'crown', v: [6, 14], jit: [6, 4], sway: 9, colors: [0xffc0d8, 0xffffff, 0xffe27a], size: [1.5, 2.5], firefly: 0.3, fade: 'in-out' },
  /* the owner's other two elements: the Dark and Light realms past the far
     gates are not built yet, so nothing wears these until a resource there
     has an id that names them (`wn-dark-<k>`, `wn-light-<k>`) */
  dark:    { rate: 1.6, life: [1600, 2600], from: 'crown', v: [0, -10], jit: [4, 3], sway: 5, colors: [0x3a2a4a, 0x241a30, 0x5a3f73], size: [1.5, 2.5], fade: 'in-out' },
  light:   { rate: 1.6, life: [1400, 2400], from: 'all', v: [0, -14], jit: [4, 3], sway: 4, colors: [0xfff8d0, 0xffffff, 0xffe9a0], size: [1, 2], blink: 0.15, fade: 'in-out' },
});

/* ── the one texture: a 2 x 2 white square, crisp ── */
let _speck = null;
function speckTex() {
  if (_speck && !_speck.destroyed) return _speck;
  const c = document.createElement('canvas');
  c.width = c.height = 2;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.fillRect(0, 0, 2, 2);
  _speck = new Texture({ source: new CanvasSource({ resource: c, width: 2, height: 2, resolution: 1, scaleMode: 'nearest' }) });
  return _speck;
}

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

export class LandAuras {
  constructor(layer) {
    this.layer = layer;       /* where a resource with no picture any more finishes its specks */
    this.at = new Map();      /* node -> { c, land, box, acc, parts: [] } */
    this.pool = [];           /* specks let go, to be used again */
    this.live = 0;
    this.stats = { made: 0 };
  }

  _make(node, land) {
    const box = boxOf(node);
    if (!box) return null;
    const c = new Container();
    c.label = 'landAura';
    c.x = node.x; c.y = node.y;
    c._groundDy = box.foot;
    this.layer.addChild(c);
    return { c, land, box, acc: Math.random(), parts: [] };
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
      /* made by the resource's width, while it stands */
      if (node.alive) {
        e.acc += A.rate * ((e.box.r - e.box.l) / 100) * step;
        while (e.acc >= 1) {
          e.acc -= 1;
          if (this.live >= AURA_MAX) { e.acc = 0; break; }
          this._spawn(e, A, node);
        }
      }
      this._move(e, A, step);
    }
    for (const [node, e] of this.at) {
      if (keep.has(node) && (node.alive || e.parts.length)) continue;
      this._drop(e);
      this.at.delete(node);
    }
  }

  _spawn(e, A, node) {
    const b = e.box, h = b.b - b.t, w = b.r - b.l;
    let x, y;
    if (A.from === 'top') { x = rnd(b.l + w * 0.2, b.r - w * 0.2); y = b.t + rnd(0, h * 0.25); }
    else if (A.from === 'crown') { x = rnd(b.l + w * 0.1, b.r - w * 0.1); y = b.t + rnd(0, h * 0.66); }
    else { x = rnd(b.l + w * 0.1, b.r - w * 0.1); y = b.t + rnd(h * 0.1, h * 0.95); }
    const s = this.pool.pop() || new Sprite(speckTex());
    s.anchor.set(0.5);
    const size = rnd(A.size[0], A.size[1]);
    s.scale.set(size / 2);
    s.tint = pick(A.colors);
    s.alpha = 0;
    s.visible = true;
    e.c.addChild(s);
    e.parts.push({ s, size, x: x - node.x, y: y - node.y, vx: A.v[0] + rnd(-A.jit[0], A.jit[0]), vy: A.v[1] + rnd(-A.jit[1], A.jit[1]),
      t: 0, life: rnd(A.life[0], A.life[1]), ph: Math.random() * 6.283,
      glint: !!(A.glint && Math.random() < A.glint), fly: !!(A.firefly && Math.random() < A.firefly) });
    this.live++;
    this.stats.made++;
  }

  _free(s) {
    if (s.parent) s.parent.removeChild(s);
    if (this.pool.length < AURA_MAX) this.pool.push(s); else s.destroy();
  }

  _move(e, A, step) {
    for (let i = e.parts.length - 1; i >= 0; i--) {
      const p = e.parts[i];
      p.t += step * 1000;
      if (p.t >= p.life) { this._free(p.s); e.parts.splice(i, 1); this.live--; continue; }
      const q = p.t / p.life;
      if (p.fly) {
        /* a firefly: a slow wander, blinking */
        p.x += Math.cos(p.ph + p.t / 700) * 10 * step;
        p.y += Math.sin(p.ph * 1.3 + p.t / 900) * 8 * step;
      } else if (!p.glint) {
        p.x += p.vx * step; p.y += p.vy * step;
      }
      const sway = A.sway ? Math.sin(p.ph + p.t / 420) * A.sway : 0;
      p.s.x = p.x + sway; p.s.y = p.y;
      let a = A.fade === 'out' ? 1 - q : (q < 0.2 ? q / 0.2 : q > 0.75 ? (1 - q) / 0.25 : 1);
      if (A.blink && Math.random() < A.blink) a *= 0.25;
      if (p.glint) { a = Math.sin(q * Math.PI); p.s.scale.set((p.size / 2) * (1 + 1.5 * a)); }
      if (p.fly) a *= 0.55 + 0.45 * Math.sin(p.t / 160 + p.ph);
      p.s.alpha = Math.max(0, Math.min(1, a)) * 0.85;
    }
  }

  _drop(e) {
    for (const p of e.parts) this._free(p.s);
    this.live -= e.parts.length;
    e.parts.length = 0;
    if (!e.c.destroyed) { if (e.c.parent) e.c.parent.removeChild(e.c); e.c.destroy({ children: true }); }
  }

  /** One resource's specks, for the tests (mp-landauras): its land, how many,
   *  whether they ride on its picture, and how many lie outside its box grown
   *  by `pad` world px (the sand drifts ~90 px downwind). */
  nodeProbe(id, pad = 120) {
    for (const [node, e] of this.at) {
      if (node.id !== id) continue;
      const host = node._pixiSprite;
      let outside = 0;
      for (const p of e.parts) {
        const x = e.c.x + p.s.x, y = e.c.y + p.s.y;
        if (x < e.box.l - pad || x > e.box.r + pad || y < e.box.t - pad || y > e.box.b + pad) outside++;
      }
      return { land: e.land, parts: e.parts.length, outside,
        rides: !!host && e.c._ridesOn === host && e.c.parent === host.parent };
    }
    return null;
  }

  /** what is alive, for the tests */
  probe() {
    const by = Object.create(null);
    for (const e of this.at.values()) by[e.land] = (by[e.land] || 0) + e.parts.length;
    return { live: this.live, resources: this.at.size, byLand: by, made: this.stats.made, pooled: this.pool.length };
  }

  clear() {
    for (const e of this.at.values()) this._drop(e);
    this.at.clear();
    this.live = 0;
  }

  destroy() {
    this.clear();
    for (const s of this.pool) { try { s.destroy(); } catch (e) { /* gone */ } }
    this.pool.length = 0;
    if (_speck) { try { _speck.destroy(true); } catch (e) { /* gone */ } _speck = null; }
  }
}
