/* ═══ v2.3.3707: A MONSTER HIDDEN BEHIND A THING IS SEEN AS ITS SILHOUETTE ═══
 *
 * The owner: "have a monster shadows silhouette appear behind props if
 * they're hiding behind them."
 *
 * Depth is drawn by the ground-contact line (depthSort.js): a monster whose
 * feet are north of a tree's or a building's is drawn under it, and a big one
 * can hide it whole -- a goblin walking up behind the Town Hall, a snowman
 * behind a pine.  Now such a monster is shown OVER the thing as a dark
 * see-through silhouette of its own frame, only where the thing covers it.
 *
 * HOW, IN ONE PASS OF THE FRAME, NOTHING NEW LOADED:
 *  - each frame (pixiRenderer.js, after everything has moved and before the
 *    depth pass) every monster drawn is tested against the things drawn near
 *    it (the Wheel's objects, the resources' trees and rocks): the nearest
 *    thing whose foot is south of the monster's and whose picture's box
 *    covers at least COVER_MIN of the monster's box;
 *  - the silhouette is a Container RIDING on that thing (depthSort `_ridesOn`,
 *    as buildingFire.js and landAuras.js ride): in its layer, a quarter step
 *    after it -- over the thing, under anything standing in front of it;
 *  - in it, the monster's own sprite again (its texture and transform this
 *    frame), tinted near black, at ALPHA; and its MASK, a copy of the thing's
 *    picture drawn into the stencil only (hairClip.js `_btClipAlpha`: its own
 *    colours' program or its colour numbers', each throwing away the texels
 *    less than half there) -- so the dark shape shows only where the thing's
 *    picture is, which is exactly where the monster is hidden;
 *  - no texture is made: both sprites draw textures already on the chip.
 *  - at most MAX at once, the monsters nearest you first; a silhouette not
 *    wanted for KEEP_MS is destroyed (CLAUDE.md, "Memory is budgeted").
 *    Each costs the frame a batch and a switch of program (its mask's own:
 *    mp-onebatch's fight counted 8 more of each with 8 at once), so 4, and
 *    only a monster at least about a third hidden (COVER_MIN): one less
 *    covered is seen well enough as it is.
 *
 * The cost on the chip: a stencil mask is drawn into, used and cleared, three
 * small draws a silhouette, in the frame's own pass (never a filter: TRAPS
 * §221).  Only where a monster is hidden behind something.
 *
 * `?nosilhouette` is the game as it was; `window.__btSilhouettes()` the probe
 * (and `.set(on)`, live, for the QA's pictures both ways).  Off where the
 * stencil clip is not installed (`?alphaclip`, or WebGL1). */
import { Container, Sprite, Matrix, Texture } from 'pixi.js';
import { hairClipStencilOn } from './hairClip.js';
import { paletteClipMade, paletteOn, makePaletteSource } from './paletteTex.js';

export const MAX = 4;
export const ALPHA = 0.5;
export const TINT = 0x0b0d14;
export const COVER_MIN = 0.35;
export const KEEP_MS = 1500;

let _on = true;
try { if (typeof location !== 'undefined' && /[?&]nosilhouette\b/.test(location.search || '')) _on = false; } catch (e) { /* on */ }
/* the probe's list of what each frame drew, kept only where the QA asks
   (its pages set __btProbe before the game loads): nothing made a frame */
const _probe = typeof window !== 'undefined' && !!window.__btProbe;

/** The share of box `b` that box `a` covers (each {x0, y0, x1, y1}). */
export function coverOf(a, b) {
  const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
  const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
  if (w <= 0 || h <= 0) return 0;
  const area = (b.x1 - b.x0) * (b.y1 - b.y0);
  return area > 0 ? (w * h) / area : 0;
}

/** Which thing hides a monster standing at foot `gy` with body box `box`:
 *  the one whose foot is south of the monster's (drawn after it) and whose
 *  picture's box covers the most of it, at least COVER_MIN; or null.
 *  `things[0..n)` each {foot, x0, y0, x1, y1}: its ground line and its
 *  picture's box in the world. */
export function hiderOf(things, n, gy, box) {
  let best = null, bestK = COVER_MIN;
  for (let i = 0; i < n; i++) {
    const t = things[i];
    if (!(t.foot > gy + 1)) continue;   /* drawn before the monster, not over it */
    if (t.x1 < box.x0 || t.x0 > box.x1 || t.y1 < box.y0 || t.y0 > box.y1) continue;
    const k = coverOf(t, box);
    if (k > bestK || (k === bestK && best && t.foot < best.foot)) { best = t; bestK = k; }
  }
  return best;
}

/** QA: the box a monster's body is drawn in, in the world (null if none). */
export function monsterBodyBox(d) {
  const sb = d && d._spriteBody;
  return sb && sb.texture ? bodyBox(d, sb, { x0: 0, y0: 0, x1: 0, y1: 0 }) : null;
}

/* the box a monster's body is drawn in, in the world (its sprite's frame,
   through its own and its display's offset and scale; no turn, which no
   monster's body takes) */
function bodyBox(d, sb, out) {
  const tex = sb.texture, fr = tex && (tex.orig || tex.frame);
  if (!fr) return null;
  const fw = fr.width, fh = fr.height;
  const ax = sb.anchor ? sb.anchor.x : 0, ay = sb.anchor ? sb.anchor.y : 0;
  const us = [-ax * fw, (1 - ax) * fw], vs = [-ay * fh, (1 - ay) * fh];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const u of us) {
    for (const v of vs) {
      const px = sb.x + sb.scale.x * u, py = sb.y + sb.scale.y * v;
      const X = d.x + d.scale.x * px, Y = d.y + d.scale.y * py;
      if (X < x0) x0 = X; if (X > x1) x1 = X; if (Y < y0) y0 = Y; if (Y > y1) y1 = Y;
    }
  }
  out.x0 = x0; out.y0 = y0; out.x1 = x1; out.y1 = y1;
  return out;
}

const byDist = (a, b) => a.dist - b.dist;

export class MonsterSilhouettes {
  constructor() {
    this.recs = new Map();   /* monster id -> { root, body, box, pic, host, seen } */
    this.stats = { drawn: 0, made: 0, freed: 0, tested: 0 };
    this._m = new Matrix();
    this._things = [];       /* reused records, one a thing drawn: no garbage a frame */
    this._n = 0;
    this._cands = [];        /* reused records, one a monster drawn */
    this._nc = 0;
    this._seen = new Set();
    this._box = { x0: 0, y0: 0, x1: 0, y1: 0 };
    this._add = (s, pic, foot, x0, y0, x1, y1) => {
      if (!s || s.destroyed || !s.parent || !pic || pic.destroyed || !pic.texture) return;
      let t = this._things[this._n];
      if (!t) t = this._things[this._n] = { s: null, pic: null, foot: 0, x0: 0, y0: 0, x1: 0, y1: 0 };
      t.s = s; t.pic = pic; t.foot = foot; t.x0 = x0; t.y0 = y0; t.x1 = x1; t.y1 = y1;
      this._n++;
    };
    this.last = [];          /* what the last frame drew, for the probe */
  }

  static on() { return _on && hairClipStencilOn() && paletteClipMade(); }

  /** One frame.  `displays` the monsters' displays (entityRenderer's Map),
   *  `alive` a Set of the live monsters' ids, `eachThing(add)` calls
   *  add(sprite, picture, foot, x0, y0, x1, y1) for each thing drawn near the
   *  view, `px, py` your position (the nearest monsters first). */
  update(displays, alive, eachThing, px, py, now) {
    this.last.length = 0;
    if (!MonsterSilhouettes.on() || !displays || !displays.size) { if (this.recs.size) this._sweep(now, null); return; }
    /* the monsters drawn, nearest you first */
    const cands = this._cands;
    let nc = 0;
    for (const [id, d] of displays) {
      if (!d || d.destroyed || !d.visible || d.renderable === false || !d.parent || d._deathFx || (alive && !alive.has(id))) continue;
      const sb = d._spriteBody;
      if (!sb || sb.destroyed || !sb.visible || !sb.texture || sb.texture === Texture.EMPTY || !sb.texture.source) continue;
      const dx = d.x - px, dy = d.y - py;
      let c = cands[nc];
      if (!c) c = cands[nc] = { id: null, d: null, sb: null, dist: 0 };
      c.id = id; c.d = d; c.sb = sb; c.dist = dx * dx + dy * dy;
      nc++;
    }
    this._nc = nc;
    if (!nc) { if (this.recs.size) this._sweep(now, null); return; }
    this._n = 0;
    eachThing(this._add);
    const seen = this._seen;
    seen.clear();
    if (this._n) {
      /* nearest first; the spare records past nc (a frame with fewer
         monsters) kept for the next, sorted last */
      for (let i = nc; i < cands.length; i++) cands[i].dist = Infinity;
      cands.sort(byDist);
      for (let i = 0; i < nc && seen.size < MAX; i++) {
        const { id, d, sb } = cands[i];
        const box = bodyBox(d, sb, this._box);
        if (!box) continue;
        this.stats.tested++;
        const gy = d.y + (d._groundDy || 0);
        const t = hiderOf(this._things, this._n, gy, box);
        if (!t) continue;
        if (this._place(id, d, sb, t, now)) {
          seen.add(id);
          if (_probe) {
            this.last.push({ id, thing: t.s.label || 'thing', foot: Math.round(t.foot), box: [Math.round(t.x0), Math.round(t.y0), Math.round(t.x1), Math.round(t.y1)],
              mx: Math.round(d.x), my: Math.round(gy), cover: +coverOf(t, box).toFixed(2) });
          }
        }
      }
    }
    /* hold no sprite or display past the frame */
    for (let i = 0; i < this._n; i++) { const t = this._things[i]; t.s = null; t.pic = null; }
    for (let i = 0; i < nc; i++) { const c = cands[i]; c.d = null; c.sb = null; }
    this.stats.drawn = seen.size;
    this._sweep(now, seen);
  }

  _rec(id) {
    let r = this.recs.get(id);
    if (r && !r.root.destroyed) return r;
    const root = new Container();
    root.label = 'monsterSilhouette';
    const box = new Container();
    box.label = 'monsterSilhouetteMask';
    const pic = new Sprite();
    pic._btClipAlpha = true;
    box.addChild(pic);
    const body = new Sprite();
    body.tint = TINT;
    body.alpha = ALPHA;
    body._noSharp = true;
    root.addChild(box);
    root.addChild(body);
    body.mask = box;
    r = { root, body, box, pic, host: null, seen: 0 };
    this.recs.set(id, r);
    this.stats.made++;
    return r;
  }

  _place(id, d, sb, t, now) {
    const r = this._rec(id);
    const host = t.s, hostPic = t.pic;
    const root = r.root;
    /* ride the thing: its layer, its ground line, a quarter step after it */
    if (root.parent !== host.parent) host.parent.addChild(root);
    root.x = host.x; root.y = host.y;
    root._groundDy = host._groundDy || 0;
    if (host._propGround !== undefined) root._propGround = host._propGround;
    if (root._ridesOn !== host) root._ridesOn = host;
    r.host = host;
    const m = this._m;
    /* the mask: the thing's own picture where the thing draws it */
    host.updateLocalTransform();
    m.copyFrom(host.localTransform);
    m.tx -= root.x; m.ty -= root.y;
    if (hostPic !== host) {
      let c = hostPic;
      const chain = [];
      while (c && c !== host) { chain.push(c); c = c.parent; }
      if (c !== host) return false;
      for (let k = chain.length - 1; k >= 0; k--) { chain[k].updateLocalTransform(); m.append(chain[k].localTransform); }
    }
    const pic = r.pic;
    if (pic.texture !== hostPic.texture) pic.texture = hostPic.texture;
    pic.anchor.set(hostPic.anchor.x, hostPic.anchor.y);
    pic.setFromMatrix(m);
    /* the monster's own frame, where it is drawn: its display's transform and
       every container down to its body */
    d.updateLocalTransform();
    m.copyFrom(d.localTransform);
    m.tx -= root.x; m.ty -= root.y;
    let c = sb;
    const chain = [];
    while (c && c !== d) { chain.push(c); c = c.parent; }
    if (c !== d) return false;
    for (let k = chain.length - 1; k >= 0; k--) { chain[k].updateLocalTransform(); m.append(chain[k].localTransform); }
    const body = r.body;
    if (body.texture !== sb.texture) body.texture = sb.texture;
    body.anchor.set(sb.anchor.x, sb.anchor.y);
    body.setFromMatrix(m);
    /* as see-through as the monster (arriving, fading) and as its thing (a
       tree you stand behind is seen through: tierTrees.js behindTree) */
    body.alpha = ALPHA * Math.max(0, Math.min(1, d.alpha * sb.alpha * (hostPic.alpha == null ? 1 : hostPic.alpha) * (host !== hostPic && host.alpha != null ? host.alpha : 1)));
    if (!root.visible) root.visible = true;
    r.seen = now;
    return true;
  }

  /* hide what was not wanted this frame (`seen` the ones that were, or
     null); destroy what has not been for KEEP_MS, or whose thing is gone */
  _sweep(now, seen) {
    for (const [id, r] of this.recs) {
      if (seen && seen.has(id)) continue;
      if (r.root.destroyed) { this.recs.delete(id); continue; }
      if (r.root.visible) r.root.visible = false;
      /* a thing gone (its page freed, broken) takes its rider with it */
      const gone = !r.host || r.host.destroyed;
      if (gone || now - r.seen > KEEP_MS) {
        this._free(r);
        this.recs.delete(id);
      }
    }
  }

  _free(r) {
    try {
      r.body.mask = null;
      if (r.root.parent) r.root.parent.removeChild(r.root);
      /* the sprites draw textures that are not theirs: never destroy those */
      r.root.destroy({ children: true, texture: false, textureSource: false });
    } catch (e) { /* gone */ }
    this.stats.freed++;
  }

  clear() {
    for (const r of this.recs.values()) this._free(r);
    this.recs.clear();
    this.last = [];
  }

  destroy() { this.clear(); }
}

/** Behind the loading screen (pixiRenderer.js): both stencil programs drawn
 *  once, nearly see-through, so the first silhouette compiles nothing --
 *  a coloured picture's shape, and a colour-numbers picture's where those are
 *  drawn.  Returns whether it ran. */
export function warmSilhouettes(renderer) {
  if (!MonsterSilhouettes.on() || !renderer) return false;
  const root = new Container();
  const made = [];
  let palSrc = null;
  try {
    const add = (maskTex) => {
      const box = new Container();
      const pic = new Sprite(maskTex);
      pic._btClipAlpha = true;
      pic.width = 4; pic.height = 4;
      box.addChild(pic);
      const body = new Sprite(Texture.WHITE);
      body.width = 4; body.height = 4;
      body.tint = TINT;
      root.addChild(box);
      root.addChild(body);
      body.mask = box;
      made.push(body);
    };
    add(Texture.WHITE);
    /* a 1 x 1 colour-numbers picture, made and freed as paletteTex.js's own
       prewarm makes and frees its */
    if (paletteOn()) {
      palSrc = makePaletteSource({
        idx: new Uint8Array([1, 1, 1, 1]), w: 1, h: 1, stride: 4,
        rgba: new Uint8Array([0, 0, 0, 0, 255, 255, 255, 255]), alphaMode: 'premultiplied-alpha', label: 'bt-silhouette-prewarm',
      });
      if (palSrc) add(new Texture({ source: palSrc }));
    }
    root.alpha = 0.001;
    renderer.render({ container: root });
    return true;
  } catch (e) {
    return false;
  } finally {
    for (const b of made) { try { b.mask = null; } catch (e) { /* gone */ } }
    try { root.destroy({ children: true, texture: false, textureSource: false }); } catch (e) { /* gone */ }
    try { if (palSrc) palSrc.destroy(); } catch (e) { /* gone */ }
  }
}

/** QA: on or off for this page, live (pictures both ways). */
export function setSilhouettes(on) { _on = !!on; return MonsterSilhouettes.on(); }
