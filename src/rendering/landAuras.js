/* ═══ v2.3.3402: EACH LAND'S TREES AND ROCKS LOOK LIKE THEIR LAND ═══
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
 *   ember    embers thrown up off it, rising faster as they cool and go out,
 *            smoke, a coal popping at its foot, a glow there like coals
 *   sky      sand streaming off it downwind
 *   hollows  dust sifting down; on a rock, crystal glints and a crumb of
 *            stone falling
 *   thunder  sparks thrown off in bursts, a little arc jumping now and then,
 *            a flickering glow at its foot
 *   tidal    drops forming on the crown's lower edge and falling to the
 *            ground in a splash, a low mist at its foot, wet glints; a rock
 *            stands in a tide pool, rings spreading from it
 *   mist     green spores rising and wobbling, a sickly haze at its foot
 *   verdant  petals drifting down, a firefly or two
 *   dark     shadow wisps rising   } the realms past the far gates: not
 *   light    motes of light rising } built yet, their looks ready for them
 *
 * The table is src/data/landAuras.js (no imports: the server's suite reads it,
 * server/test/land-auras.test.mjs).
 *
 * SEEN ON A PHONE.  The first cut drew 1.5-2.5 px squares, a handful a tree:
 * at the Wheel's scale (0.6 CSS px a world px) a speck was one or two device
 * pixels, and the phone pictures showed the trees bare.  So each kind has a
 * shape of its own -- a flake, a streak, a drop, a petal, a glint, a glow --
 * 3 to 10 world px, and the lights (embers, sparks, spores, fireflies, glints)
 * are drawn ADDED to what is under them, so they shine on any ground.  Still
 * a breath, not a storm: about a dozen at a time on a tree, fewer on a rock.
 *
 * ═══ v2.3.3511: FIRE THAT RISES, WATER THAT FALLS ═══
 * The owner, after a playtest (2026-10-19): "land tree effects: fire looks like
 * sparkles, water looks like sweating".  Both were true, and why:
 *   - an EMBER was a big round light with a hard bright heart, rising at one
 *     slow speed, swaying, and every frame a fifth of them dimmed at random:
 *     a point that twinkles -- a star, not fire.  Now an ember is a short
 *     STREAK in a soft glow of its own colour (a coal glows), pointed the way
 *     it flies (`orient`), thrown up off the crown and RISING FASTER as it
 *     goes, as hot air carries it (`g` below 0), curling more as it climbs
 *     (`curl`), cooling from white-yellow through orange to
 *     a dull red (`ramp`) as it shrinks and goes out, with a smooth flicker
 *     in place of the random blink; soft dark smoke swells as it climbs; now
 *     and then a coal pops at the foot and drops back; and the foot's glow
 *     flickers like coals, two slow waves (`coal`), not one;
 *   - a DRIP was born a third to three quarters of the way down the picture
 *     -- inside the leaves -- slid a little way slowly and faded where it
 *     was, never reaching the ground, and pale puffs sat on the crown like
 *     steam: beads of sweat.  Now a drop FORMS on the crown's lower edge (the
 *     picture's own, measured: tierTrees.js treeCrownEdge), hangs there a
 *     moment as it swells, lets go and falls fast, stretched as it speeds,
 *     and ENDS AT THE GROUND on the tree's foot line in a splash -- a ring
 *     spreading over the ground and two droplets jumping (`kind: 'drip'`);
 *     a low mist drifts along the ground at the foot, and wet glints wink on
 *     the leaves.  A rock of the Water Caves has no leaves to drip from: it
 *     stands in a tide pool, glints on it and rings spreading from its foot;
 *   - the same eye on the rest: the Electric Foundry's sparks were round
 *     lights flown at random and blinking at random -- twinkles -- and are
 *     now bursts of streaks thrown from one point that arc down and die (the
 *     arcs stay); the Stone Hollows' crystal glints winked all over its TREES
 *     and are a rock's alone now, with a crumb of stone falling off it.
 *     Frost's rime glints, the spores, the petals and the fireflies twinkle
 *     on purpose, and are as they were.
 *
 * THE DRAWING: each resource near the view that is in a land gets a Container
 * that RIDES on its picture (depthSort `_ridesOn`, as buildingFire.js): in
 * its layer, a quarter step after it, so its specks are drawn just in front
 * of it and behind anyone south of it, wherever the depth pass moves it; at
 * its alpha, so a tree you stand behind is seen through with its specks.
 * At most AURA_MAX alive, all resources together.  A resource mined out stops
 * making them and its last ones finish; one that leaves the view lets them go
 * at once.
 *
 * ═══ v2.3.3511: AND NOTHING IS REBUILT A FRAME ═══
 * CLAUDE.md "A STRUCTURAL CHANGE REBUILDS ITS LAYER'S DRAW LIST" (TRAPS §218):
 * every speck was a sprite added to its resource's container as it was born
 * and taken out as it died, its blend and visibility set each time -- each one
 * an addChild or a removeChild in the depth-sorted layer, whose whole draw
 * list Pixi rebuilt for it, several times a second a resource.  Now a
 * resource's specks are a POOL made with its container BEFORE the container
 * joins the layer (one change, as it comes into view): each sprite is one
 * kind's for good, its picture and blend set once, in an order that keeps the
 * blends together (normal first, then added), and a speck born or gone only
 * moves and changes its alpha -- an idle one waits at 0.  How many a kind
 * keeps is what its rate keeps alive and a third more (auraPoolPlan), the
 * kinds the rate makes held to PER_MAX on one resource.  Only a resource
 * coming into view, leaving it, or carried to another layer by the depth pass
 * changes the layer (`stats.structural` counts them; mp-landauras counts what
 * Pixi was asked to do).  And a resource's specks are made only while its
 * picture is near the screen (AURA_VIEW_IN): the node view reaches 480 px past
 * it, and specks were made out there that no one saw.
 *
 * THE TEXTURES are eleven small canvases (about 20 KB in all) made behind the
 * Wheel's loading screen (landAurasWarm, from worldTrial.preloadWheel, as
 * the buildings' life: wheelLife.js) and destroyed on leaving the Wheel
 * (landAurasFree, wheelOnStop) -- every sprite drawing them first.  Without
 * them nothing is drawn.
 *
 * `?noauras` leaves the resources plain.
 */
import { Container, Sprite, Texture, CanvasSource } from 'pixi.js';
import { treeGeom, treeCrownEdge } from '../game/tierTrees.js';
import { oreGeom } from '../game/tierOre.js';
import { wheelOnStop } from '../game/wheelTrial.js';
import {
  LAND_AURAS, AURA_MAX, PER_MAX, AURA_VIEW_IN, AURA_VIEW_OUT, AURA_TEX,
  auraLandOf, auraPartsFor, auraPoolPlan, auraRampAt, auraFade,
} from '../data/landAuras.js';   /* v2.3.3511: the table, as data */

export { LAND_AURAS, AURA_MAX, PER_MAX, auraLandOf };
export const AURAS_ON = (() => {
  try { return !/(^|[?&])noauras(&|$)/.test(window.location.search || ''); } catch (e) { return true; }
})();

/* ── the textures: made behind the Wheel's loading screen, freed on leaving ── */
let _tex = null;
const _live = new Set();   /* every LandAuras, so the textures' end lets their sprites go first */
function canvasTexture(w, h, draw, linear) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  return new Texture({ source: new CanvasSource({ resource: c, width: w, height: h, resolution: 1, scaleMode: linear ? 'linear' : 'nearest' }) });
}
/* v2.3.3511: a streak flying along +x, 24 x 8: its core two rows in the
   middle, `pow` how fast it fades back to its tail, `glow` the three rows'
   strengths either side of it (the glow reaches past the head as well), `rgb`
   its colour t of the way from tail (0) to head (1) */
const STREAK_W = 24, STREAK_H = 8, STREAK_HEAD = 19;
function streakTexture(pow, glow, rgb) {
  return canvasTexture(STREAK_W, STREAK_H, (g) => {
    const mid = STREAK_H / 2;
    for (let x = 0; x < STREAK_W; x++) {
      const t = Math.min(1, x / STREAK_HEAD);
      const past = x > STREAK_HEAD ? (x - STREAK_HEAD) / (STREAK_W - STREAK_HEAD) : 0;   /* 0..1 beyond the head */
      const [r, gr, b] = rgb(t).map((v) => Math.round(Math.max(0, Math.min(255, v))));
      const fill = (a, y, n) => { g.fillStyle = `rgba(${r},${gr},${b},${Math.max(0, Math.min(1, a)).toFixed(3)})`; g.fillRect(x, y, 1, n); };
      const core = Math.pow(t, pow) * (1 - past);
      fill(past ? 0.55 * (1 - past) : core, mid - 1, 2);
      const lit = Math.pow(t, pow + 0.2) * (1 - 0.65 * past);
      for (let i = 0; i < glow.length; i++) {
        fill(glow[i] * lit, mid - 2 - i, 1);
        fill(glow[i] * lit, mid + 1 + i, 1);
      }
    }
  }, true);
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
      /* v2.3.3511: a drop of water, a teardrop: a point at its top (where it
         hangs from the leaf), round at its foot, a highlight on its shoulder
         (was a 3 x 6 bar) */
      drop: canvasTexture(4, 7, (g) => {
        g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(1, 0, 2, 1);
        g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(1, 1, 2, 2);
        g.fillRect(0, 3, 4, 3); g.fillRect(1, 6, 2, 1);
        g.fillStyle = '#fff'; g.fillRect(1, 3, 1, 2);
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
      /* v2.3.3511: an EMBER, head first along +x: a tapered streak, its head
         hot white-yellow, its tail an orange that fades to nothing -- drawn
         stretched along the way it flies, tinted cooler as it ages -- in a
         soft GLOW of its own colour, round the head too: a bare line read as a
         scratch of light in the phone pictures, and a coal glows.  The core
         is the middle quarter of its height (`thick` in the table is the
         glow's), the head at 19 of its 24 columns */
      ember: streakTexture(1.1, [0.6, 0.28, 0.1], (t) => [255, 150 + 105 * Math.pow(t, 1.3), 70 + 170 * Math.pow(t, 2.2)]),
      /* v2.3.3511: an electric SPARK, head first along +x: a white streak,
         fading to its tail (the ramp gives it its colour), in a fainter
         glow than the ember's */
      spark: streakTexture(1.2, [0.42, 0.16, 0.05], () => [255, 255, 255]),
      /* v2.3.3511: a PUFF: soft all the way out (smoke, the mist at a foot) --
         the glow's hard heart would read as a light */
      puff: canvasTexture(32, 32, (g) => {
        const rg = g.createRadialGradient(16, 16, 0, 16, 16, 16);
        rg.addColorStop(0, 'rgba(255,255,255,0.9)');
        rg.addColorStop(0.35, 'rgba(255,255,255,0.55)');
        rg.addColorStop(0.7, 'rgba(255,255,255,0.18)');
        rg.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = rg; g.fillRect(0, 0, 32, 32);
      }, true),
      /* v2.3.3511: a RING, drawn squashed to lie on the ground: a splash's,
         a ripple's */
      ring: canvasTexture(32, 32, (g) => {
        g.beginPath(); g.arc(16, 16, 12.5, 0, Math.PI * 2);
        g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,0.95)'; g.stroke();
        g.beginPath(); g.arc(16, 16, 14.6, 0, Math.PI * 2);
        g.lineWidth = 1.6; g.strokeStyle = 'rgba(255,255,255,0.3)'; g.stroke();
      }, true),
    };
  } catch (e) {
    _tex = null;
  }
}
/* Leaving the Wheel: every sprite drawing them let go, then the textures */
export function landAurasFree() {
  for (const a of _live) { try { a.clear(); } catch (e) { /* gone */ } }
  if (!_tex) return;
  for (const t of Object.values(_tex)) { try { t.destroy(true); } catch (e) { /* gone */ } }
  _tex = null;
}
export function landAurasReady() { return !!_tex; }
/* v2.3.3511: every shape the table names, made (the probe's) */
export function landAuraTextures() { return _tex ? AURA_TEX.filter((k) => !!_tex[k]) : []; }
wheelOnStop(landAurasFree);

/* the box a resource's specks start in, world px, its foot's offset from the
   node's point (its container stands there, for the depth pass), the middle
   of its foot and how far either side a speck at its foot starts */
function boxOf(node) {
  if (node.nodeType === 'tree') {
    const g = treeGeom(node);
    return { type: 'tree', l: g.left, r: g.right, t: g.top, b: g.footY, foot: g.footY - node.y, fx: g.footX, half: Math.max(6, g.trunk * 1.6) };
  }
  if (node.nodeType === 'oreVein') {
    const g = oreGeom(node);
    return { type: 'rock', l: g.left, r: g.right, t: g.top, b: g.footY, foot: g.footY - node.y, fx: (g.left + g.right) / 2, half: (g.right - g.left) * 0.3 };
  }
  return null;
}
/* v2.3.3511: whether a box is within `m` world px of the view */
function nearView(b, view, m) {
  return !view || (b.r >= view.x0 - m && b.l <= view.x1 + m && b.b >= view.y0 - m && b.t <= view.y1 + m);
}

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[(Math.random() * a.length) | 0];
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

export class LandAuras {
  constructor(layer) {
    this.layer = layer;       /* where a resource with no picture any more finishes its specks */
    this.at = new Map();      /* node -> its entry (_make) */
    this.live = 0;
    this.serial = 0;
    /* v2.3.3511: `structural` -- every change this made to a layer (a
       resource's specks coming, going or carried to another layer) */
    this.stats = { made: 0, structural: 0 };
    _live.add(this);
  }

  /* v2.3.3511: a resource's container and its pool, built BEFORE it joins
     the layer (one change to the layer, not one a sprite) */
  _make(node, land, box) {
    const c = new Container();
    c.label = 'landAura';
    c.x = node.x; c.y = node.y;
    c._groundDy = box.foot;
    const parts = auraPartsFor(land, box.type);
    const f = Math.max(70, box.r - box.l) / 100;
    const plan = auraPoolPlan(land, box.type, f);
    const kinds = parts.filter((P) => P.w > 0);
    const byId = Object.create(null);
    for (const P of parts) byId[P.id] = P;
    const e = { c, land, box, f, acc: Math.random(), made: 0, parts: [], free: Object.create(null), kinds, byId,
      sumW: kinds.reduce((s, P) => s + P.w, 0) || 1, base: null, ph: Math.random() * 6.283, sprites: 0,
      edge: box.type === 'tree' ? treeCrownEdge(node) : null,
      drips: { formed: 0, fell: 0, landed: 0, lost: 0, starts: [], lands: [] } };
    const B = LAND_AURAS[land].base;
    const pool = (P) => {
      const list = e.free[P.id] = [];
      for (let i = 0; i < plan[P.id]; i++) {
        const s = new Sprite(_tex[P.tex]);
        s.anchor.set(P.anchor ? P.anchor[0] : 0.5, P.anchor ? P.anchor[1] : 0.5);
        if (P.add) s.blendMode = 'add';
        s.alpha = 0;
        c.addChild(s);
        list.push(s);
        e.sprites++;
      }
    };
    /* normal blends first, then the glow at the foot, then the added lights:
       each run one batch */
    for (const P of parts) if (!P.add) pool(P);
    if (B) {
      const s = new Sprite(_tex.glow);
      s.anchor.set(0.5);
      s.tint = B.color;
      if (B.add) s.blendMode = 'add';
      const w = (box.r - box.l) * B.w;
      s.scale.set(w / 32, Math.max(10, w * B.h) / 32);
      s.x = (box.l + box.r) / 2 - node.x;
      s.y = box.foot;
      s.alpha = B.alpha[0];
      if (B.add) c.addChild(s); else c.addChildAt(s, 0);
      e.base = s;
    }
    for (const P of parts) if (P.add) pool(P);
    /* straight into the layer its picture is in (the depth pass's), so the
       first ride moves nothing */
    const host = node._pixiSprite;
    (host && host.parent ? host.parent : this.layer).addChild(c);
    this.stats.structural++;
    return e;
  }

  /* ride on the resource's picture: in its layer, on its ground line, a
     quarter step after it (depthSort `_ridesOn`, as buildingFire.js does) --
     the depth pass moves a tree between layers as you walk round it */
  _ride(e, host) {
    const c = e.c;
    if (!host || host.destroyed || !host.parent) { c._ridesOn = null; return; }
    if (c.parent !== host.parent) { host.parent.addChild(c); this.stats.structural++; }
    c.x = host.x; c.y = host.y;
    c._groundDy = host._groundDy || 0;
    if (c._ridesOn !== host) c._ridesOn = host;
    /* a tree you stand behind is seen through (effectsRenderer
       _treeSeeThrough): so are its specks */
    if (c.alpha !== host.alpha) c.alpha = host.alpha;
  }

  /** `nodes`: the resources near the view this frame (the effects renderer's
   *  own list); `dt` ms since the last frame; `view` the screen in world px
   *  ({x0, y0, x1, y1}), or null for all of them. */
  update(nodes, dt, view) {
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
      if (e && e.c.destroyed) { this.at.delete(node); this.live -= e.parts.length; e = null; }
      /* v2.3.3511: made near the screen, let go further out (not kept: the
         sweep below lets it go) */
      if (e) {
        if (!nearView(e.box, view, AURA_VIEW_OUT)) continue;
      } else {
        if (!node.alive || !node._pixiSprite) continue;
        const box = boxOf(node);
        if (!box || !nearView(box, view, AURA_VIEW_IN)) continue;
        e = this._make(node, land, box);
        this.at.set(node, e);
      }
      keep.add(node);
      this._ride(e, node._pixiSprite);
      /* made by the resource's width, while it stands -- a rock as if 70 px
         across at the least (the copper's 58 made almost none) */
      if (node.alive) {
        e.acc += A.rate * e.f * step;
        while (e.acc >= 1) {
          e.acc -= 1;
          if (this.live >= AURA_MAX) { e.acc = 0; break; }
          this._spawn(e, this._pick(e), node);
        }
      }
      this._move(e, step);
      if (e.base) {
        const B = A.base;
        e.ph += step;
        /* electric at random; v2.3.3511: coals in two slow waves (one was a
           lamp breathing) */
        const k2 = B.flicker ? (Math.random() < 0.3 ? Math.random() : 0.5 + 0.5 * Math.sin(e.ph * 9))
          : B.coal ? 0.55 + 0.3 * Math.sin(e.ph * 4.7) + 0.15 * Math.sin(e.ph * 11.3 + 1.7)
            : 0.5 + 0.5 * Math.sin(e.ph * 1.6);
        e.base.alpha = node.alive ? B.alpha[0] + (B.alpha[1] - B.alpha[0]) * clamp01(k2) : Math.max(0, e.base.alpha - step);
      }
    }
    for (const [node, e] of this.at) {
      if (keep.has(node) && (node.alive || e.parts.length)) continue;
      this._drop(e);
      this.at.delete(node);
    }
  }

  _pick(e) {
    let r = Math.random() * e.sumW;
    for (const P of e.kinds) { r -= P.w; if (r <= 0) return P; }
    return e.kinds[e.kinds.length - 1];
  }

  /* where a speck of kind P starts, world px */
  _from(e, P) {
    const b = e.box, h = b.b - b.t, w = b.r - b.l;
    switch (P.from) {
      case 'top': return [rnd(b.l + w * 0.2, b.r - w * 0.2), b.t + rnd(0, h * 0.25)];
      case 'crown': return [rnd(b.l + w * 0.1, b.r - w * 0.1), b.t + rnd(0, h * 0.66)];
      case 'low': return [rnd(b.l + w * 0.12, b.r - w * 0.12), b.t + rnd(h * 0.35, h * 0.75)];
      case 'foot': return [b.fx + rnd(-1, 1) * (P.spread ? w * P.spread : b.half), b.b + rnd(-4, 4)];
      case 'crownEdge': {
        /* v2.3.3511: on the crown's lower edge, as the picture has it */
        if (e.edge && e.edge.length) { const s = pick(e.edge); return [rnd(s.x0, s.x1), s.y, s.y]; }
        return [rnd(b.l + w * 0.12, b.r - w * 0.12), b.t + rnd(h * 0.35, h * 0.75)];
      }
      default: return [rnd(b.l + w * 0.1, b.r - w * 0.1), b.t + rnd(h * 0.1, h * 0.95)];
    }
  }

  /* a speck (or a burst, an arc) of kind P: sprites from its pool, each only
     moved and shown -- never added, its blend never set */
  _spawn(e, P, node) {
    const free = e.free[P.id];
    if (!free || !free.length) return;
    const [x, y, edgeY] = this._from(e, P);
    const n = P.zap ? Math.min(P.zap, free.length, AURA_MAX - this.live)
      : P.burst ? Math.min(P.burst[0] + ((Math.random() * (P.burst[1] - P.burst[0] + 1)) | 0), free.length, AURA_MAX - this.live) : 1;
    /* an arc: specks along a jagged line from here, a short way in a random
       direction, all lit at once */
    const ang = Math.random() * 6.283, len = rnd(14, 26);
    for (let i = 0; i < n; i++) {
      const tx = P.zap && n > 1 ? i / (n - 1) : 0;
      const px = x + (P.zap ? Math.cos(ang) * len * tx + (n > 1 ? rnd(-3, 3) : 0) : 0);
      const py = y + (P.zap ? Math.sin(ang) * len * tx + (n > 1 ? rnd(-3, 3) : 0) : 0);
      this._start(e, P, px - node.x, py - node.y, edgeY != null ? edgeY - node.y : null);
    }
  }

  /* one speck of kind P at (x, y) in the resource's own px */
  _start(e, P, x, y, edgeY) {
    const free = e.free[P.id];
    if (!free || !free.length || this.live >= AURA_MAX) return null;
    const s = free.pop();
    const size = rnd(P.size[0], P.size[1]);
    const tw = s.texture.width || 1, th = s.texture.height || 1;
    const k = size / tw;
    const ky = P.thick ? rnd(P.thick[0], P.thick[1]) / th : k;
    const vx = P.kind === 'drip' ? 0 : P.v ? P.v[0] + rnd(-P.jit[0], P.jit[0]) : 0;
    const vy = P.kind === 'drip' ? 0 : P.v ? P.v[1] + rnd(-P.jit[1], P.jit[1]) : 0;
    const p = { n: ++this.serial, s, P, size, k, ky, x, y, vx, vy, t: 0, qi: 0,
      life: P.kind === 'drip' ? 4000 : rnd(P.life[0], P.life[1]), ph: Math.random() * 6.283,
      spin: P.spin ? rnd(-P.spin, P.spin) : 0, rot: Math.atan2(vy, vx), spd: Math.hypot(vx, vy), lx: x, ly: y,
      /* where it meets the ground: the foot's line, give or take (a drop from
         the back of the crown lands a little north of one from its front) */
      gy: Math.max(y + 1, e.box.foot + rnd(-5, 7)), state: 0, hang: P.hang ? rnd(P.hang[0], P.hang[1]) : 0 };
    s.tint = P.ramp ? P.ramp[0] : pick(P.colors);
    s.rotation = P.orient ? p.rot : 0;
    s.scale.set(k, P.thick ? ky : k * (P.squash || 1));
    s.x = x; s.y = y;
    s.alpha = 0;
    e.parts.push(p);
    this.live++;
    this.stats.made++;
    e.made++;
    if (P.kind === 'drip') {
      const D = e.drips;
      D.formed++;
      D.starts.push({ x: e.c.x + x, y: e.c.y + y, edge: edgeY != null ? e.c.y + edgeY : null });
      if (D.starts.length > 16) D.starts.shift();
    }
    return p;
  }

  /* a speck gone: back to its pool, unseen (swap-removed: the list is walked
     from its end) */
  _free(e, i) {
    const p = e.parts[i];
    p.s.alpha = 0;
    e.free[p.P.id].push(p.s);
    const last = e.parts.pop();
    if (i < e.parts.length) e.parts[i] = last;
    this.live--;
  }

  /* v2.3.3511: a drop that reached the ground: a ring spreading over it and
     droplets jumping */
  _splash(e, p) {
    for (const [id, n] of p.P.splash || []) {
      const P = e.byId[id];
      if (!P) continue;
      for (let i = 0; i < n; i++) {
        const q = this._start(e, P, p.x + (P.kind === 'ring' ? 0 : rnd(-2, 2)), p.gy - (P.kind === 'ring' ? 0 : 1), null);
        if (q) q.gy = p.gy + 1;
      }
    }
  }

  /* v2.3.3511: a drip: it hangs from the crown's edge, swelling, then falls
     (stretched as it speeds) to the ground and splashes.  True when done. */
  _drip(e, p, step) {
    const s = p.s, P = p.P, D = e.drips;
    if (p.state === 0) {
      const h = Math.min(1, p.t / p.hang);
      s.x = p.x; s.y = p.y;
      s.scale.set(p.k * (0.45 + 0.5 * h), p.k * (0.4 + 0.75 * h));
      s.alpha = 0.3 + 0.62 * h;
      if (h >= 1) { p.state = 1; p.vy = rnd(4, 14); D.fell++; }
      return false;
    }
    p.vy += P.g * step;
    p.y += p.vy * step;
    if (p.y >= p.gy) {
      p.y = p.gy;
      D.landed++;
      D.lands.push({ x: e.c.x + p.x, y: e.c.y + p.y, foot: e.c.y + e.box.foot });
      if (D.lands.length > 16) D.lands.shift();
      this._splash(e, p);
      return true;
    }
    if (p.t >= p.life) { D.lost++; return true; }
    const st = Math.min(1.1, p.vy * 0.0024);
    s.y = p.y;
    s.scale.set(p.k * 0.95 * (1 - Math.min(0.32, p.vy * 0.0006)), p.k * 1.15 * (1 + st));
    s.alpha = 0.92;
    return false;
  }

  _move(e, step) {
    for (let i = e.parts.length - 1; i >= 0; i--) {
      const p = e.parts[i], P = p.P, s = p.s;
      p.t += step * 1000;
      if (P.kind === 'drip') { if (this._drip(e, p, step)) this._free(e, i); continue; }
      if (p.t >= p.life) { this._free(e, i); continue; }
      const q = p.t / p.life;
      if (P.kind === 'ring') {
        /* spreading over the ground, quick then slow */
        const gr = P.grow[0] + (P.grow[1] - P.grow[0]) * (1 - (1 - q) * (1 - q));
        s.scale.set(p.k * gr, p.k * gr * (P.squash || 1));
        s.alpha = clamp01(auraFade(P.fade, q)) * (P.alpha != null ? P.alpha : 1);
        continue;
      }
      if (P.fly) {
        /* a firefly: a slow wander */
        p.x += Math.cos(p.ph + p.t / 700) * 12 * step;
        p.y += Math.sin(p.ph * 1.3 + p.t / 900) * 9 * step;
      } else if (!P.still) {
        if (P.g) p.vy += P.g * step;
        p.x += p.vx * step; p.y += p.vy * step;
      }
      /* v2.3.3511: a coal or a crumb ends where it comes down on the ground */
      if (P.toGround && p.vy > 0 && p.y >= p.gy) { this._free(e, i); continue; }
      /* v2.3.3511: `curl` -- the wander grows as it climbs, and quicker */
      const sway = P.sway ? Math.sin(p.ph + p.t / (P.curl ? 260 : 420)) * P.sway * (P.curl ? 0.25 + 0.75 * q : 1) : 0;
      const nx = p.x + sway, ny = p.y;
      let len = 1;
      if (P.orient) {
        /* v2.3.3511: head first, the way it really moved this frame */
        const dx = nx - p.lx, dy = ny - p.ly;
        if (dx * dx + dy * dy > 1e-4 && step > 0) { p.rot = Math.atan2(dy, dx); p.spd = Math.sqrt(dx * dx + dy * dy) / step; }
        s.rotation = p.rot;
        if (P.stretch) len = 1 + p.spd * P.stretch;
      } else if (p.spin) {
        s.rotation += p.spin * step;
      }
      p.lx = nx; p.ly = ny;
      s.x = nx; s.y = ny;
      const gr = P.grow ? P.grow[0] + (P.grow[1] - P.grow[0]) * q : 1;
      let a = auraFade(P.fade, q);
      if (P.thick) s.scale.set(p.k * gr * len, p.ky * gr);
      /* a petal turning over: narrower as it shows its edge */
      else if (p.spin && P.tex === 'petal') s.scale.set(p.k * gr * (0.35 + 0.65 * Math.abs(Math.cos(p.ph + p.t / 260))), p.k * gr);
      else if (P.fade === 'pulse' && P.tex === 'glint') s.scale.set(p.k * (0.5 + 0.7 * a));
      else s.scale.set(p.k * gr, p.k * gr * (P.squash || 1));
      /* v2.3.3511: cooling as it ages -- in 24 steps of its life, each a
         colour worked out once (not every frame) */
      if (P.ramp) {
        const qi = (q * 24) | 0;
        if (qi !== p.qi) { p.qi = qi; s.tint = auraRampAt(P.ramp, qi / 24); }
      }
      if (P.blink && Math.random() < P.blink) a *= 0.3;
      /* v2.3.3511: a smooth flicker, about nine times a second (an ember's
         was a fifth of its frames dimmed at random: a twinkle) */
      if (P.flick) a *= 1 - P.flick * (0.5 + 0.5 * Math.sin(p.t * 0.0565 + p.ph));
      if (P.fly) a *= 0.45 + 0.55 * Math.max(0, Math.sin(p.t / 170 + p.ph));
      s.alpha = clamp01(a) * (P.alpha != null ? P.alpha : 1);
    }
  }

  _drop(e) {
    this.live -= e.parts.length;
    e.parts.length = 0;
    e.base = null;
    if (!e.c.destroyed) {
      if (e.c.parent) { e.c.parent.removeChild(e.c); this.stats.structural++; }
      e.c.destroy({ children: true });
    }
  }

  /** One resource's specks, for the tests (mp-landauras): its land, how many
   *  alive and made since it came into view, of which shapes (`kinds`) and
   *  kinds (`parts`), whether they ride on its picture, and how many lie
   *  outside its box grown by `pad` world px (the sand blows ~80 px
   *  downwind).  v2.3.3511: + its pool (`sprites`, every one made with it),
   *  a sample of the living (`live`: each one's serial, kind, place, turn,
   *  speed and how far through its life), and its drips (`drips`: formed,
   *  fallen, landed on the ground, lost in the air, and where the last ones
   *  started and landed, world px). */
  nodeProbe(id, pad = 120) {
    for (const [node, e] of this.at) {
      if (node.id !== id) continue;
      const host = node._pixiSprite;
      let outside = 0;
      const kinds = Object.create(null), parts = Object.create(null), live = [];
      for (const p of e.parts) {
        const x = e.c.x + p.s.x, y = e.c.y + p.s.y;
        if (x < e.box.l - pad || x > e.box.r + pad || y < e.box.t - pad || y > e.box.b + pad) outside++;
        kinds[p.P.tex] = (kinds[p.P.tex] || 0) + 1;
        parts[p.P.id] = (parts[p.P.id] || 0) + 1;
        if (live.length < 40) live.push({ n: p.n, id: p.P.id, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10,
          rot: Math.round(p.s.rotation * 1000) / 1000, vx: Math.round(p.vx), vy: Math.round(p.vy),
          q: Math.round((p.t / p.life) * 100) / 100, a: Math.round(p.s.alpha * 100) / 100, state: p.state,
          len: Math.round(p.s.scale.x * p.s.texture.width * 10) / 10, tint: p.s.tint });
      }
      const D = e.drips;
      return { land: e.land, type: e.box.type, parts: e.parts.length, made: e.made, kinds, kindsById: parts, base: !!e.base, outside,
        rides: !!host && e.c._ridesOn === host && e.c.parent === host.parent,
        sprites: e.sprites, live, foot: e.c.y + e.box.foot,
        drips: { formed: D.formed, fell: D.fell, landed: D.landed, lost: D.lost, starts: D.starts.slice(), lands: D.lands.slice() } };
    }
    return null;
  }

  /** what is alive, for the tests -- v2.3.3511: + every sprite the pools hold
   *  (`sprites`), and every change made to a layer (`structural`) */
  probe() {
    const by = Object.create(null);
    let sprites = 0;
    for (const e of this.at.values()) { by[e.land] = (by[e.land] || 0) + e.parts.length; sprites += e.sprites; }
    return { live: this.live, resources: this.at.size, byLand: by, made: this.stats.made, sprites, pooled: sprites - this.live,
      structural: this.stats.structural, ready: !!_tex, textures: landAuraTextures() };
  }

  clear() {
    for (const e of this.at.values()) this._drop(e);
    this.at.clear();
    this.live = 0;
  }

  destroy() {
    this.clear();
    _live.delete(this);
  }
}
