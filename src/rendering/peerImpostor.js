/* ═══ v2.3.4885: ONE PICTURE PER PLAYER, STAGE 1 -- THE PAINTER ═══
 *
 * Who becomes a picture, and the whole-pixel arithmetic: src/game/onePic.js
 * (node-tested).  This file is the Pixi half.  OFF unless `?onepic=1`.
 *
 * A standing player past the nearest ten (and not your party, target, duel or
 * whoever is fighting you) is drawn as ONE sprite cut from a shared picture
 * (`bt-onepic`, one RenderTexture), instead of their ~31-43 layers.
 *
 * THE FIGURE STAYS WHERE IT IS.  Their display Container is left in its world
 * layer, posed every frame by the peer loop as before, so everything that
 * reads it -- the shadows (lightfx/casters.js), the glint, the depth pass,
 * jumpFx / emoteFx / swimFx, the stand-ins' geometry -- reads it unchanged.
 * It is only not DRAWN: made its own render group once, as it first becomes
 * a picture, and `renderable = false` while it is one.  Pixi 8.17.1, measured
 * in the prototype (docs/specs/crowd-lanes.md): a render group's root is
 * painted with `renderer.render({ container, target, transform })` whatever
 * its `renderable` says; the first enableRenderGroup is one rebuild of its
 * layer's draw list, every later paint none; 40 such hidden groups cost the
 * layer nothing a frame.
 *
 * PAINTED ONLY WHEN IT CHANGES.  Pixi's own change counters over the whole
 * figure (`checkChildrenDidChange`: every piece's transform, texture,
 * visibility, tint, alpha, and any piece added or taken away), its own scale,
 * where it falls inside a device pixel, and a slow refresh (ONE_PIC.REFRESH_MS,
 * staggered) for a change no counter sees.  A player who moves by whole device
 * pixels only has their sprite moved (TRAPS §223: a shift is a shift).
 *
 * TO THE PIXEL.  The camera sits on whole device pixels (TRAPS §231), so the
 * figure is painted into its slot at the same fraction of a pixel it is drawn
 * at, and the sprite is put on the whole device pixel the slot starts on, at
 * one texel a device pixel ('nearest').  The prototype: 0 of 160,000 pixels
 * differ.
 *
 * Every paint is a render pass into the picture (TRAPS §221), so they all
 * happen in one place, after every pass that moves a figure and just before
 * the frame is drawn (pixiRenderer.js), a few a frame at most for players
 * arriving (ONE_PIC.PAINTS_A_FRAME; a picture already shown that changed is
 * always painted that frame).
 *
 * The picture is made behind the loading screen (pixiRenderer.js makes this
 * object as the scene is built), never on the first crowd: PRELOADING IS LAW.
 * Its size is ONE_PIC.SLOTS slots of SLOT_CSS_W x SLOT_CSS_H CSS px at the
 * device's pixel ratio (`window.__btOnePic().bytes`).
 */
import { Container, Graphics, Matrix, Rectangle, RenderTexture, Sprite, Texture, checkChildrenDidChange } from 'pixi.js';
import { ONE_PIC, onePicFromQuery, onePicNearFromQuery, calmFigure, gradedWire, pickPictures, deviceSplit, slotGrid, sheetBytes } from '../game/onePic.js';

const _search = typeof location !== 'undefined' ? (location.search || '') : '';

export class PeerImpostors {
  constructor(renderer, layers) {
    this.renderer = renderer;
    this.layers = layers || {};
    this.on = onePicFromQuery(_search);
    this.near = onePicNearFromQuery(_search);
    this.recs = new Map();          /* id -> its picture (client-supplied ids: a Map, CLAUDE.md) */
    this.free = [];
    this.sheet = null;
    this.grid = null;
    this._dpr = 0;
    this._cands = [];
    this._pool = [];
    this._pick = new Set();
    this._fig = {};
    this._todo = [];
    this._m = new Matrix();
    this._eraseRoot = null;
    this._eraser = null;
    this._tooBigUntil = new Map();
    this.stats = { pictures: 0, shown: 0, paints: 0, paintsLastFrame: 0, tooBig: 0, refreshes: 0 };
    if (this.on) this._makeSheet();
    if (typeof window !== 'undefined') {
      /* QA: what the crowd is drawn as (mp-crowdbots reports it) */
      window.__btOnePic = () => ({
        on: this.on, near: this.near, pictures: this.recs.size, shown: this.stats.shown,
        paints: this.stats.paints, paintsLastFrame: this.stats.paintsLastFrame, refreshes: this.stats.refreshes,
        tooBig: this.stats.tooBig, slots: this.grid ? this.grid.n : 0, free: this.free.length,
        slotW: this.grid ? this.grid.sw : 0, slotH: this.grid ? this.grid.sh : 0, bytes: sheetBytes(this.grid),
        ids: [...this.recs.keys()].filter((id) => this.recs.get(id).painted),
      });
      /* QA: the same scene both ways (mp-onepic compares a standing player
         drawn as a picture and as layers, pixel for pixel) */
      window.__btOnePicSet = (on) => {
        if (!on) { this.revertAll(); this.on = false; return true; }
        this.on = true;
        if (!this.sheet) this._makeSheet();
        return !!this.sheet;
      };
    }
  }

  _makeSheet() {
    const R = this.renderer;
    const dpr = R && R.resolution ? R.resolution : 1;
    this._dpr = dpr;
    const sw = Math.ceil(ONE_PIC.SLOT_CSS_W * dpr), sh = Math.ceil(ONE_PIC.SLOT_CSS_H * dpr);
    let maxTex = 4096;
    try { const gl = R && R.gl; if (gl) maxTex = Math.min(maxTex, gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096); } catch (e) { /* keep 4096 */ }
    const g = slotGrid(ONE_PIC.SLOTS, sw, sh, Math.min(2048, maxTex), maxTex);
    if (!g) { this.on = false; return; }
    this.grid = { ...g, n: g.cols * g.rows < ONE_PIC.SLOTS ? g.cols * g.rows : ONE_PIC.SLOTS, sw, sh };
    this.sheet = RenderTexture.create({ width: g.W, height: g.H, resolution: 1, scaleMode: 'nearest', antialias: false });
    this.sheet.source.label = 'bt-onepic';
    this.free.length = 0;
    for (let i = this.grid.n - 1; i >= 0; i--) this.free.push(i);
    this._eraseRoot = new Container();
    this._eraser = new Graphics();
    this._eraser.blendMode = 'erase';
    this._eraseRoot.addChild(this._eraser);
    /* the whole picture cleared once, so a slot never shows what the chip held before */
    try { R.render({ container: new Container(), target: this.sheet, clear: true, clearColor: [0, 0, 0, 0] }); } catch (e) { /* first paint clears its slot anyway */ }
  }

  _slotXY(slot) {
    const g = this.grid;
    return { x: (slot % g.cols) * g.sw, y: Math.floor(slot / g.cols) * g.sh };
  }

  /** Before the depth pass: who is a picture this frame, and every picture's
      sprite stood where its figure stands, so the depth pass sorts it there. */
  place(S, er, now) {
    if (!this.on) return;
    if (!this.sheet || (this.renderer && this.renderer.resolution !== this._dpr)) {
      this.revertAll();
      if (this.sheet) { this.sheet.destroy(true); this.sheet = null; }
      this._makeSheet();
      if (!this.sheet) return;
    }
    const displays = er && er.otherPlayerDisplays;
    if (!displays || !S) { this.revertAll(); return; }
    const others = S.others || {};
    const me = S.player || {};
    const notDrawn = S._peersNotDrawn;
    const ent = this.layers.entities, front = this.layers.gatherNodesFront;
    const cands = this._cands;
    cands.length = 0;
    let n = 0;
    for (const [id, d] of displays) {
      const o = others[id];
      if (!o || !d || d.destroyed || !d.visible || d._farHidden) continue;
      if (notDrawn && notDrawn.has(id)) continue;
      const c = this._pool[n] || (this._pool[n] = { id: '', d2: 0, always: false, calm: false });
      n++;
      const dx = (o.renderX != null ? o.renderX : (o.x || 0)) - (me.x || 0);
      const dy = (o.renderY != null ? o.renderY : (o.y || 0)) - (me.y || 0);
      c.id = id;
      c.d2 = dx * dx + dy * dy;
      c.always = !!(er.peerAlwaysDrawn && er.peerAlwaysDrawn(S, id, o, now));
      const f = this._fig;
      f.pose = d._animPose; f.moving = !!d._remoteMoving; f.held = !!o._po; f.gathering = !!o._ex;
      f.riding = !!o._brd; f.swimming = d._swimK > 0; f.masked = !!d.mask; f.graded = gradedWire(o._eqg);
      f.standIn = !d.visible; f.faded = d.alpha < 1; f.layerOk = d.parent === ent || d.parent === front;
      const tb = this._tooBigUntil.get(id);
      c.calm = calmFigure(f) && !(tb && now < tb);
      cands.push(c);
    }
    const pick = pickPictures(cands, this.near, this.grid.n, this._pick);
    cands.length = 0;
    for (const [id, r] of this.recs) {
      if (!pick.has(id) || displays.get(id) !== r.display || r.display.destroyed) this._leave(id, r);
    }
    for (const id of pick) {
      let r = this.recs.get(id);
      if (!r) r = this._enter(id, displays.get(id));
      if (!r) continue;
      const d = r.display, sp = r.sprite;
      if (sp.parent !== d.parent) d.parent.addChild(sp);   /* the depth pass moved the figure between its two layers */
      /* sorted on the figure's own ground line (depthSort.js groundOf) */
      sp._groundDy = (d.y + (d._groundDy || 0)) - sp.y;
    }
    this.stats.pictures = this.recs.size;
  }

  _enter(id, d) {
    if (!d || !this.free.length) return null;
    const slot = this.free.pop();
    const xy = this._slotXY(slot);
    /* the figure is its own render group while it is a picture (one rebuild of
       its layer now, none for any paint after -- the prototype's Q1/Q3) */
    const wasGroup = !!d.isRenderGroup;
    if (!wasGroup) d.enableRenderGroup();
    const tex = new Texture({ source: this.sheet.source, frame: new Rectangle(xy.x, xy.y, this.grid.sw, this.grid.sh) });
    const sp = new Sprite(tex);
    sp.label = 'onepic_' + id;
    sp.alpha = 0;   /* nothing to show until its first paint (pixiRenderer: paint, below) */
    sp._btOnePic = true;
    d.parent.addChild(sp);
    const r = {
      id, display: d, slot, sx: xy.x, sy: xy.y, sprite: sp, tex, wasGroup,
      cache: { data: [], index: 0, didChange: false },
      painted: false, paintedAt: 0, refreshAt: 0,
      k: 0, a: 0, b: 0, c: 0, d: 0, fx: -1, fy: -1, padX: 0, padY: 0,
    };
    this.recs.set(id, r);
    return r;
  }

  _leave(id, r) {
    const d = r.display;
    if (d && !d.destroyed) {
      d.renderable = true;
      /* drawn as a plain part of its layer again, exactly as before it was a
         picture: the layer's own batchers and figure shades (sharpPixels.js,
         formShade.js, sheenBatch.js) see its pieces as they always did */
      if (d.isRenderGroup && !r.wasGroup) d.disableRenderGroup();
    }
    const sp = r.sprite;
    if (sp && !sp.destroyed) {
      if (sp.parent) sp.parent.removeChild(sp);
      sp.destroy({ texture: false });
    }
    if (r.tex && !r.tex.destroyed) r.tex.destroy(false);   /* the frame only, never the shared picture */
    this.free.push(r.slot);
    this.recs.delete(id);
  }

  revertAll() {
    for (const [id, r] of this.recs) this._leave(id, r);
    this.stats.pictures = 0;
    this.stats.shown = 0;
  }

  /** After every pass that moves or dresses a figure, just before the frame is
      drawn: paint the pictures that changed, then put every sprite on its
      whole device pixel. */
  paint(now) {
    this.stats.paintsLastFrame = 0;
    if (!this.on || !this.sheet || !this.recs.size) return;
    const R = this.renderer;
    const todo = this._todo;
    todo.length = 0;
    let fresh = 0;
    const dpr = this._dpr || 1;
    for (const r of this.recs.values()) {
      const d = r.display;
      if (!d || d.destroyed || !d.parent) continue;
      /* where Pixi will draw the figure this frame, in device px: its whole
         transform up to the stage (CSS px) times the pixel ratio.  Not the
         layer's scale times the figure's place, which missed what sits above
         the layers and left the picture a device pixel off its figure (the
         first mp-onepic run: the outline differed all round) */
      const G = d.getGlobalTransform(r.g || (r.g = new Matrix()));
      const a = G.a * dpr, b = G.b * dpr, c = G.c * dpr, dd = G.d * dpr;
      const sx = deviceSplit(G.tx, dpr), sy = deviceSplit(G.ty, dpr);
      r.cache.index = 0;
      r.cache.didChange = false;
      const changed = checkChildrenDidChange(d, r.cache);
      const moved = a !== r.a || b !== r.b || c !== r.c || dd !== r.d
        || Math.abs(sx.f - r.fx) > 1 / 64 || Math.abs(sy.f - r.fy) > 1 / 64;
      const due = r.painted && now >= r.refreshAt;
      r._ix = sx.i; r._iy = sy.i; r._fx = sx.f; r._fy = sy.f;
      r._a = a; r._b = b; r._c = c; r._d = dd;
      if (!r.painted) { if (fresh < ONE_PIC.PAINTS_A_FRAME) { fresh++; todo.push(r); } }
      else if (changed || moved || due) { if (due && !changed && !moved) this.stats.refreshes++; todo.push(r); }
      else this._put(r);
    }
    if (!todo.length) return;
    /* the slots about to be painted, emptied first: one pass */
    const er = this._eraser;
    er.clear();
    for (const r of todo) er.rect(r.sx, r.sy, this.grid.sw, this.grid.sh);
    er.fill(0xffffff);
    R.render({ container: this._eraseRoot, target: this.sheet, clear: false });
    for (const r of todo) {
      const d = r.display;
      /* the figure's bounds, in device px about its own origin */
      const b = d.getLocalBounds();
      const xs = [b.minX, b.maxX, b.minX, b.maxX], ys = [b.minY, b.minY, b.maxY, b.maxY];
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (let i = 0; i < 4; i++) {
        const px = r._a * xs[i] + r._c * ys[i], py = r._b * xs[i] + r._d * ys[i];
        if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
      }
      const padX = Math.ceil(-x0) + 1, padY = Math.ceil(-y0) + 1;
      if (!Number.isFinite(x0) || padX < 1 || padY < 1 || Math.ceil(x1) + padX + 2 > this.grid.sw || Math.ceil(y1) + padY + 2 > this.grid.sh) {
        /* does not fit its slot: layered, and not asked again for a while */
        this.stats.tooBig++;
        this._tooBigUntil.set(r.id, now + 5000);
        this._leave(r.id, r);
        continue;
      }
      /* the render replaces the figure's own transform with this one
         (RenderGroupSystem.render), so it carries the figure's whole device
         transform, its origin moved into the slot at the same fraction */
      const m = this._m;
      m.set(r._a, r._b, r._c, r._d, r.sx + padX + r._fx, r.sy + padY + r._fy);
      R.render({ container: d, target: this.sheet, transform: m, clear: false });
      r.padX = padX; r.padY = padY;
      r.a = r._a; r.b = r._b; r.c = r._c; r.d = r._d; r.fx = r._fx; r.fy = r._fy;
      /* staggered by slot so the refreshes never all fall in one frame */
      r.refreshAt = now + ONE_PIC.REFRESH_MS + (r.slot * 97) % 1000;
      r.paintedAt = now;
      /* the counters as they stand after the paint (a piece that sets its own
         alpha as it is drawn, `_lookResidue`, bumps one: painted once more) */
      r.cache.index = 0; r.cache.didChange = false;
      checkChildrenDidChange(d, r.cache);
      this.stats.paints++;
      this.stats.paintsLastFrame++;
      if (!r.painted) {
        r.painted = true;
        r.sprite.alpha = 1;
        d.renderable = false;
        this.stats.shown++;
      }
      this._put(r);
    }
    this.stats.shown = 0;
    for (const r of this.recs.values()) if (r.painted) this.stats.shown++;
  }

  /* the sprite on the whole device pixel its slot starts on, one texel a
     device px: that device pixel taken back through its layer's own whole
     transform (the layers are scaled, never turned) */
  _put(r) {
    const sp = r.sprite, P = sp && sp.parent;
    if (!sp || sp.destroyed || !P) return;
    const dpr = this._dpr || 1;
    const GP = P.getGlobalTransform(this._gp || (this._gp = new Matrix()));
    const gx = (r._ix - r.padX) / dpr, gy = (r._iy - r.padY) / dpr;
    /* the inverse of a scale-and-shift */
    const x = (gx - GP.tx) / GP.a, y = (gy - GP.ty) / GP.d;
    if (sp.x !== x || sp.y !== y) sp.position.set(x, y);
    const sX = 1 / (dpr * GP.a), sY = 1 / (dpr * GP.d);
    if (sp.scale.x !== sX || sp.scale.y !== sY) sp.scale.set(sX, sY);
    const d = r.display;
    sp._groundDy = (d.y + (d._groundDy || 0)) - y;
  }

  destroy() {
    this.revertAll();
    if (this.sheet) { this.sheet.destroy(true); this.sheet = null; }
    if (this._eraseRoot) { this._eraseRoot.destroy({ children: true }); this._eraseRoot = null; }
  }
}
