/* ═══ v2.3.2923: AN ARROW GOES INTO SOMETHING ═══
 *
 * Owner: "Arrows that stick in monsters need to have their material around
 * the arrow injection site. like slimes especially need some kind of effect
 * because it looks like a headless arrow was just stickered on top of the
 * slime. I want it to look like the arrows are actually puncturing the enemy."
 *
 * WHAT IT WAS.  v2.3.1765 buried the head (a tip drawn over the body it is
 * embedded in is the one place it can never be seen) and v2.3.1825 pinned the
 * headless pine shaft by its cut end on the impact point.  Right as far as it
 * went -- but nothing marked the surface, so the cut end of the shaft sat on
 * top of the monster's art like a sticker.
 *
 * WHAT IT IS NOW.  Two passes round every stuck shaft, in the monster's own
 * material (the HIT_MATERIALS `fx`/`kind` and hitFxTintOf colour the hit
 * spray already uses, so a recoloured slime's wound follows its recolour):
 *   THE WOUND, under the shaft: the crater the arrow punched -- a collar of
 *   displaced material, a darker dimple, the hole itself -- plus what that
 *   material does next: goo and blood drip and run down, snow crumbles at the
 *   rim, bone and stone crack outward, linen frays, the goblin's embers glow.
 *   THE LIP, over the shaft: a little of the material climbing the shaft at
 *   the entry, so the shaft reads as going IN rather than stopping at a line.
 *   The slime's gel collar wobbles for the first half-second -- the hit
 *   landing in something soft.
 *
 * Every irregular piece (crack angles, rim chips, drip lengths) is seeded per
 * arrow, so a wound holds its shape frame to frame and no two look the same.
 *
 * NOTHING TO PRELOAD: Graphics calls and a render texture minted at runtime --
 * the animation-preloading law has nothing to register.  LEAF MODULE: imports
 * no renderer system; effectsRenderer owns the baker. */
import { Container, Graphics, Matrix, RenderTexture, Sprite } from 'pixi.js';

const WOUND_SCALE = 1.45;

/* ═══ v2.3.2923b: AT THE MONSTER'S RESOLUTION, NOT THE ARROW'S ═══
 * Owner, on the first cut of this: "the enemy is at a lower resolution so it
 * looks very artificial having higher resolution art and injury site tacked
 * on top."  Measured: the slime is drawn at 0.75 world px per texel with a
 * one-texel keyline and soft shading; the pine shaft at 0.41 with a three-texel
 * keyline; and the wound was vector ellipses with no pixel grid at all.
 *
 * So the shaft, its wound and its lip are no longer drawn straight to the
 * screen.  Each monster carrying arrows gets a small offscreen texture laid on
 * ITS texel grid (one texture pixel = one pixel of the monster's own sheet,
 * aligned to the sheet's pixel edges); the injury is drawn into that and the
 * texture is scaled up exactly as the body is, with the body's own filtering.
 * Whatever is in it -- crisp shaft, vector wound -- lands on screen at the
 * monster's resolution and softness, so it reads as part of the same drawing.
 * (Not clipped to the body's silhouette: a sprite mask inside the offscreen
 * render landed in the wrong place and ate the wounds -- measured, not
 * guessed -- and shots land inside the body since v2.3.2844 anyway.)
 *
 * One small texture render per monster with arrows in it, per frame (a slime's
 * is ~60 x 60 px).  Falls back to the direct draw when there is no renderer or
 * no body sprite (the procedural stand-in body). */
let _renderer = null;
export function setArrowWoundRenderer(r) { _renderer = r; }
export function arrowWoundBakeReady() { return !!(_renderer && _renderer.render); }

const MAX_TEX = 384;
const _M = new Matrix(), _A = new Matrix(), _B = new Matrix();

/* `node`'s transform up to (not including) `stop`, from each level's FRESH
   local transform.  worldTransform is the last render's: the entity pass has
   already moved a walking monster this frame, and a clip taken from it would
   trail the arrows (which read m.x) by a frame. */
function chainTo(node, stop, out) {
  out.identity();
  const list = [];
  for (let n = node; n && n !== stop; n = n.parent) list.push(n);
  for (let i = list.length - 1; i >= 0; i--) { list[i].updateLocalTransform(); out.append(list[i].localTransform); }
  return out;
}
/* body-local -> layer-local, through their nearest shared ancestor */
export function relMatrix(body, layer, out) {   /* v2.3.2930: exported for arrowPin.js */
  const up = new Set();
  for (let n = layer; n; n = n.parent) up.add(n);
  let anc = body;
  while (anc && !up.has(anc)) anc = anc.parent;
  if (!anc) return null;
  chainTo(layer, anc, _A).invert();
  chainTo(body, anc, _B);
  return out.copyFrom(_A).append(_B);
}

export class StuckArrowBaker {
  constructor(layer) {
    this.layer = layer;
    this.entries = new Map();   /* monster id -> entry (Map: ids are server strings) */
    this.stats = { baked: 0, texel: 0, w: 0, h: 0 };
  }

  _entry(key) {
    let e = this.entries.get(key);
    if (e) return e;
    const root = new Container();
    const woundG = new Graphics();
    const shafts = new Container();
    const lipG = new Graphics();
    root.addChild(woundG, shafts, lipG);
    const show = new Sprite();
    show.label = 'stuck-arrow-bake';
    this.layer.addChild(show);
    e = { root, woundG, shafts, lipG, show, rt: null, w: 0, h: 0, seen: 0 };
    this.entries.set(key, e);
    return e;
  }

  /** Bake one monster's arrows.  `body` is its drawn sprite; every arrow is
   *  { x, y, ang, k, mat, tint, age, seed } in this layer's (world) space, plus
   *  the shaft's texture and world scale.  Returns false to ask for the direct
   *  draw instead. */
  bake(key, body, arrows, shaftTex, now) {
    if (!_renderer || !body || !body.texture || !shaftTex || !arrows.length) return false;
    const tex = body.texture;
    /* body-local -> this layer: the same numbers the body is drawn with */
    if (!relMatrix(body, this.layer, _M)) return false;
    const T = Math.hypot(_M.a, _M.b) / ((tex.source && tex.source.resolution) || 1);
    if (!(T > 0.08 && T < 4) || !isFinite(_M.tx)) return false;
    const ow = (tex.orig && tex.orig.width) || tex.width, oh = (tex.orig && tex.orig.height) || tex.height;
    const ax = body.anchor ? body.anchor.x : 0, ay = body.anchor ? body.anchor.y : 0;
    const L = -ax * ow, Tp = -ay * oh;
    /* the extent: each wound and each shaft out to its tail (not the body's
       whole frame -- mostly air, and a 256-px goblin frame at 0.375 would
       overflow the cap) */
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const add = (x, y) => { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; };
    for (const a of arrows) {
      const len = a.shaftLen + 4;
      add(a.x - Math.cos(a.ang) * len - 4, a.y - Math.sin(a.ang) * len - 4);
      add(a.x - Math.cos(a.ang) * len + 4, a.y - Math.sin(a.ang) * len + 4);
      add(a.x - 14 * a.k, a.y - 14 * a.k); add(a.x + 14 * a.k, a.y + 20 * a.k);   /* wound + drips, at WOUND_SCALE */
    }
    /* snapped to the body's own pixel edges, so texture pixel == sheet pixel
       (the corner of texel (0,0) is where local (L, Tp) lands) */
    const gx = _M.a * L + _M.c * Tp + _M.tx, gy = _M.b * L + _M.d * Tp + _M.ty;
    x0 = gx + Math.floor((x0 - gx) / T - 1) * T; y0 = gy + Math.floor((y0 - gy) / T - 1) * T;
    const W = Math.min(MAX_TEX, Math.ceil((x1 - x0) / T) + 2), H = Math.min(MAX_TEX, Math.ceil((y1 - y0) / T) + 2);
    if (W < 2 || H < 2 || (x1 - x0) / T + 2 > MAX_TEX || (y1 - y0) / T + 2 > MAX_TEX) return false;   /* too big to bake: draw directly */
    const e = this._entry(key);
    e.seen = now;
    if (!e.rt || e.w !== W || e.h !== H) {
      if (e.rt) { try { e.rt.destroy(true); } catch (err) { /* gone */ } }
      e.rt = RenderTexture.create({ width: W, height: H, resolution: 1, antialias: false });
      e.w = W; e.h = H;
      e.show.texture = e.rt;
    }
    /* the body's filtering: a nearest-sampled sheet stays blocky, a linear one soft */
    try {
      const sm = (tex.source && (tex.source.scaleMode || (tex.source.style && tex.source.style.scaleMode))) || 'linear';
      if (e.rt.source.scaleMode !== sm) e.rt.source.scaleMode = sm;
    } catch (err) { /* older pixi shape */ }
    const g = e.woundG, lg = e.lipG;
    g.clear(); lg.clear();
    let n = 0;
    for (const a of arrows) {
      drawArrowWound(g, a.x, a.y, a.ang, a.k, a.mat, a.tint, a.age, a.seed, T);   /* v2.3.2929b: + one texel of the monster */
      let sp = e.shafts.children[n];
      if (!sp) { sp = new Sprite(shaftTex); sp.anchor.set(1, 0.5); e.shafts.addChild(sp); }
      if (sp.texture !== shaftTex) sp.texture = shaftTex;
      sp.visible = true;
      sp.position.set(a.x, a.y);
      sp.rotation = a.ang;
      sp.scale.set(a.shaftScale);
      sp.alpha = 0.95;
      drawArrowWoundLip(lg, a.x, a.y, a.ang, a.k, a.mat, a.tint, a.age, T, a.seed);
      n++;
    }
    for (let i = n; i < e.shafts.children.length; i++) e.shafts.children[i].visible = false;
    /* world units in, texture pixels out */
    e.root.scale.set(1 / T);
    e.root.position.set(-x0 / T, -y0 / T);
    _renderer.render({ container: e.root, target: e.rt, clear: true });
    e.show.position.set(x0, y0);
    e.show.scale.set(T);
    e.show.visible = true;
    this.stats.baked++; this.stats.texel = +T.toFixed(4); this.stats.w = W; this.stats.h = H;
    return true;
  }

  /** After the frame's bakes: hide the unused, free the long-gone. */
  end(now) {
    for (const [key, e] of this.entries) {
      if (e.seen === now) continue;
      e.show.visible = false;
      if (now - e.seen > 3000) {
        try { e.show.destroy(); } catch (err) { /* gone */ }
        try { e.root.destroy({ children: true }); } catch (err) { /* gone */ }
        if (e.rt) { try { e.rt.destroy(true); } catch (err) { /* gone */ } }
        this.entries.delete(key);
      }
    }
  }

  probe() {
    let live = 0;
    for (const e of this.entries.values()) if (e.show.visible) live++;
    return { live, entries: this.entries.size, ...this.stats };
  }
}

function mix(a, b, t) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (((ar + (br - ar) * t) | 0) << 16) | (((ag + (bg - ag) * t) | 0) << 8) | ((ab + (bb - ab) * t) | 0);
}
const darker = (c, t) => mix(c, 0x000000, t);

/* A small deterministic sequence from the arrow's seed (xorshift-ish). */
function seq(seed) {
  let s = ((seed * 2147483647) | 0) || 0x2f6b1d;
  return () => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}

function line(gfx, x0, y0, x1, y1, w, color, alpha) {
  gfx.moveTo(x0, y0);
  gfx.lineTo(x1, y1);
  gfx.stroke({ color, width: w, alpha, cap: 'round' });
}

/* A drip running DOWN the screen from the wound: grows over ~1.4 s, then holds
   (a monster does not bleed out through one arrow). */
function drip(gfx, x, y, k, age, rand, color) {
  const n = rand() < 0.45 ? 2 : 1;
  for (let i = 0; i < n; i++) {
    const dx = (rand() - 0.5) * 3.2 * k;
    const maxLen = (3.5 + rand() * 4.5) * k;
    const t = Math.min(1, Math.max(0, (age - 60 - i * 260) / 1400));
    const len = maxLen * (1 - (1 - t) * (1 - t));
    if (len < 0.4 * k) continue;
    line(gfx, x + dx, y + 1.2 * k, x + dx, y + 1.2 * k + len, 1.35 * k, color, 0.9);
    gfx.circle(x + dx, y + 1.2 * k + len, 1.05 * k);
    gfx.fill({ color, alpha: 0.95 });
  }
}

/* ═══ v2.3.2929b: THE MONSTER'S OWN ART, A TORN HOLE AND A FINE KEYLINE ═══
   Owner: "Run the same treatment over arrow hit sites.  Small pixel outline
   kinda how you fixed the zig zag."  The same move the death cuts made
   (monsterDeathFx v2.3.2928c): the v2.3.2923 wound PAINTED over the monster
   -- a slime's bulging collar and wet highlight, snow bricks round a crater,
   bone chips, a disc of lip over the shaft -- in flat vector ellipses that
   read as a sticker of another art style.  Now the monster's own pixels run
   right up to a small TORN opening (a jagged outline, seeded per arrow), the
   hole is the material's darkest shade, and it is closed off by one texel of
   dark keyline -- the colour the cuts and the sprites' own outlines use.
   Where the shaft goes in, a short jagged arc of the same keyline over it
   (the torn edge standing in front of the shaft) is the whole "lip".  What is
   material and not paint stays: a slime or goblin still drips, an ember's
   hole still glows, stone and bone crack -- in one-texel hairlines of the
   keyline.  `px` is one of the MONSTER's texels in the units drawn in (the
   baker passes its texel size; the direct draw falls back to the monster's
   draw scale), so the keyline is a pixel of the monster, not of the screen. */
const KEY = 0x1e1812;
function tornRing(cx, cy, rx, ry, rot, rand, jag) {
  const pts = [];
  const N = 11;
  const c = Math.cos(rot), s = Math.sin(rot);
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 + (rand() - 0.5) * 0.35;
    const k = 1 - jag * 0.5 + jag * rand() * (i % 2 ? 1 : 0.55);
    const ex = Math.cos(a) * rx * k, ey = Math.sin(a) * ry * k;
    pts.push(cx + ex * c - ey * s, cy + ex * s + ey * c);
  }
  return pts;
}
/** The wound under the shaft.  (x, y) is the impact point, `ang` the flight
 *  angle (the shaft runs back out along ang + PI), `k` the monster's draw
 *  scale, `mat` its HIT_MATERIALS entry, `tint` its hit-fx colour, `age` ms
 *  since the arrow landed, `px` one monster texel (see above). */
export function drawArrowWound(gfx, x, y, ang, k0, mat, tint, age, seed, px) {
  const k = k0 * WOUND_SCALE;
  const P = px > 0 ? px : Math.max(0.6, k0);
  const kind = (mat && (mat.fx || mat.kind)) || 'goo';
  const rand = seq(seed == null ? 0.37 : seed);
  const rot = ang;
  const bx = x - Math.cos(ang) * 0.6 * k, by = y - Math.sin(ang) * 0.6 * k;
  /* the hole's own colour: the material's darkest shade */
  const inside = kind === 'goblin' ? 0x3b0704
    : kind === 'ember' ? 0x5c1d0b
    : kind === 'snow' ? 0x6e8fbc
    : kind === 'bone' ? 0x3a2c1e
    : kind === 'ash' ? 0x2b261e
    : darker(tint, kind === 'stone' ? 0.7 : 0.62);
  const hole = tornRing(bx, by, 2.3 * k, 1.7 * k, rot, rand, 0.45);
  gfx.poly(hole).fill({ color: inside, alpha: 0.95 });
  if (kind === 'ember') {
    /* a hot wound still glows from inside */
    const glow = 0.55 + 0.25 * Math.sin(age / 140 + (seed || 0) * 6);
    gfx.poly(tornRing(bx, by, 1.4 * k, 1.0 * k, rot, rand, 0.3)).fill({ color: 0xffc451, alpha: glow });
  }
  if (kind === 'bone' || kind === 'stone') {
    /* hairline cracks out of the hole, each with a kink, one texel wide */
    const n = 2 + Math.floor(rand() * 3);
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2;
      const r0 = 2.0 * k, r1 = r0 + (1.2 + rand() * 1.6) * k, r2 = r1 + (0.8 + rand() * 1.6) * k;
      const a2 = a + (rand() - 0.5) * 0.9;
      gfx.moveTo(bx + Math.cos(a) * r0, by + Math.sin(a) * r0 * 0.75)
        .lineTo(bx + Math.cos(a) * r1, by + Math.sin(a) * r1 * 0.75)
        .lineTo(bx + Math.cos(a2) * r2, by + Math.sin(a2) * r2 * 0.75);
    }
    gfx.stroke({ color: KEY, width: P, alpha: 0.8, join: 'miter', cap: 'butt' });
  }
  /* the torn edge: one texel of keyline round the opening */
  gfx.poly(hole).stroke({ color: KEY, width: P, alpha: 0.9, join: 'miter' });
  if (kind === 'goo') drip(gfx, bx, by, k, age, rand, darker(tint, 0.25));
  else if (kind === 'goblin') drip(gfx, bx, by, k, age, rand, 0x9e1c10);
}

/** The lip over the shaft: the torn edge in FRONT of the shaft where it
 *  goes in -- a short jagged arc of keyline, so the cut end disappears into
 *  the body instead of stopping on it. */
export function drawArrowWoundLip(gfx, x, y, ang, k0, mat, tint, age, px, seed) {
  const k = k0 * WOUND_SCALE;
  const P = px > 0 ? px : Math.max(0.6, k0);
  const rand = seq((seed == null ? 0.37 : seed) + 0.5);
  const c = Math.cos(ang), s = Math.sin(ang);
  /* across the shaft, a little way back up it from the impact point */
  const lx = x - c * 1.1 * k, ly = y - s * 1.1 * k;
  const nx = -s, ny = c;
  const half = 2.1 * k;
  const N = 6;
  for (let i = 0; i <= N; i++) {
    const f = -1 + (2 * i) / N;
    const bulge = (1 - f * f) * 0.7 * k;                 /* bowed toward the camera side of the shaft */
    const j = (rand() - 0.5) * 0.6 * k;
    const px2 = lx + nx * f * half - c * (bulge + j), py2 = ly + ny * f * half - s * (bulge + j);
    if (i === 0) gfx.moveTo(px2, py2); else gfx.lineTo(px2, py2);
  }
  gfx.stroke({ color: KEY, width: P, alpha: 0.9, join: 'miter', cap: 'butt' });
}
