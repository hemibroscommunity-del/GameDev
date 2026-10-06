/* ═══ v2.3.2943: THE WHEEL'S GROUND — laid on the phone, a piece at a time ═══
 *
 * The `?trial=wheel` twin of chunkGround.js.  The world trial streams pieces
 * a bake already made; here nothing was made ahead: every piece is laid from
 * the owner's swatches, on this device, by the ground worker
 * (src/game/wheelTrial.js asks, public/tools/world/core/ground-worker.js
 * lays), exactly as the Ground Studio's preview lays them.  The same rule
 * for what is kept:
 *
 *   NEEDED   every piece the view touches, plus MARGIN game px beyond it --
 *            asked for nearest-first, at most MAX_IN_FLIGHT at a time (the
 *            worker lays one at a time; two keeps it busy)
 *   KEPT     anything within KEEP_PX more game px of that (half a piece:
 *            a step back across a line does not lay the piece again)
 *   FREED    everything else: sprite and texture destroyed (the ZONE-ASSET
 *            rule in CLAUDE.md: drop the reference, don't hide it)
 *
 * A piece is 192 game px square at the swatches' own sharpness -- 2 px a
 * game px, 384 px, ~0.6 MB of colours, and as much again on the GPU -- so a
 * portrait phone (about 585 x 1270 game px of view) holds 28 of them standing
 * and up to ~48 on the move (mp-wheeltrial): 16-30 MB of colours.  That is
 * the price of the sharpness, and the readout shows it;
 * the way to a quarter of it is pieces kept as palette numbers and coloured
 * on the GPU (docs/WORLD-MAP-PIPELINE.md, the Wheel trial).  (v2.3.3076: the
 * colours are on the GPU only -- the page's copy goes once a piece is
 * uploaded, _toGpu below.)  Under them lies
 * the whole Wheel, small, in the plan's colours, so a piece still being laid
 * shows as its colour, not a hole.
 *
 * SMOOTH (linear) scaling, NOT the nearest sampling every painted zone uses:
 * 2 ground px a game px against a phone's ~2.5 device px is a small,
 * uneven blow-up, and nearest would draw some ground pixels one device pixel
 * wide and some two -- the "soft and gritty" look's other half.  The owner
 * judged the swatches in the Ground Studio drawn smooth ("looks good",
 * v2.3.2942), and this draws them the same way.  Each piece is laid one art
 * px (3 ground px) past its edges and shows half a game px of that, so the
 * smoothing at a join reads the true neighbour and pieces overlap by a hair
 * instead of leaving one.  (v2.3.3019: three art px, for the water's swell,
 * which reads the picture up to 4 game px away; still half a game px shown.)
 */
import { Container, Sprite, Texture, Rectangle, BufferImageSource, CanvasSource } from 'pixi.js';
import { wheelInfo, wheelStart, wheelChunk, wheelIsWarm, wheelDropWarm, wheelOverview, wheelStats, wheelOnGot } from '../game/wheelTrial.js';
import { worldTrialLeft } from '../game/worldTrial.js';
import { WheelWater } from './wheelWater.js';   /* v2.3.3019: the water moves */

const MAX_IN_FLIGHT = 3;
const MARGIN = 96;
const KEEP_PX = 96;
/* Ahead of a moving camera: lay the ground where it will be AHEAD_MS from
   now (never more than AHEAD_MAX game px on), as well as round where it is.
   A fast run crosses a 192 px piece in half a second; a margin the same all
   round would have to be a whole screen wide to keep up, and cost that much
   memory on every side instead of one. */
const AHEAD_MS = 700;
const AHEAD_MAX = 480;
/* Pieces the zone gate laid round the arrival and this view never took (a
   wide desktop view is shaped differently from the phone's) are let go this
   long after arriving, rather than held until the worker stops. */
const WARM_KEEP_MS = 3000;

/* v2.3.3076: a piece's colours, let go of.  Both of a source's holds: its
   `resource`, and the constructor's `options`, which Pixi keeps whole
   (TextureSource: this.options = options; nothing reads it back for a buffer)
   -- with the first gone the second still held every piece's colours, and a
   destroyed source something still points at kept them too (main: 84 pieces'
   colours alive after a walk with 50 standing; both 0 with this, mp-groundcopy). */
function letGoOfColours(src) {
  if (!src) return;
  src.resource = null;
  if (src.options) src.options.resource = null;
}

export class WheelGround {
  /* v2.3.3076: `app`, the Pixi application (tileRenderer's), to put each
     piece on the GPU as it is placed (_toGpu) */
  constructor(parent, app) {
    this._app = app || null;
    this.root = new Container();
    this.root.label = 'wheelGround';
    parent.addChild(this.root);
    /* v2.3.3019: the pieces in a container of their own, so the water's
       motion over them (wheelWater.js) stays above every piece laid later */
    this.pieceRoot = new Container();
    this.pieceRoot.label = 'wheelGroundPieces';
    this.root.addChild(this.pieceRoot);
    this.water = WheelWater.on() ? new WheelWater(this.root) : null;
    this.under = null;
    this.pieces = new Map();   /* "i,j" -> { i, j, sprite, ready, popped } */
    this.inFlight = 0;
    /* v2.3.2959: pieces laid short of a picture (ground-worker.js,
       DOWNLOADS THAT CANNOT STOP THE GROUND) show what they have, plan
       colour for the rest, and are laid again -- one at a time, after any
       new piece -- when the worker says the picture has come: never on a
       timer, so one that never comes costs nothing */
    this.relays = 0;
    this._offGot = wheelOnGot((k) => {
      for (const rec of this.pieces.values()) if (rec.lacking && rec.lacking.indexOf(k) >= 0) rec.due = true;
    });
    this.dead = false;
    this._vx = 0; this._vy = 0;   /* the camera's speed, game px a ms, smoothed */
    this._lastT = null;
    this._born = performance.now();
    this._warmDropped = false;
  }

  _placeUnder(info) {
    if (this.under) return;
    const c = wheelOverview();
    if (!c || !c.width) return;
    /* a fresh source, never Texture.from(canvas): that one is cached by the
       canvas, and a second WheelGround (a same-zone rebuild) would be handed
       the texture this one destroyed */
    /* size and resolution given, or CanvasSource divides the canvas's width
       by an undefined resolution and resizes the canvas to NaN -- blank */
    const tex = new Texture({ source: new CanvasSource({ resource: c, width: c.width, height: c.height, resolution: 1, scaleMode: 'linear' }) });
    const s = new Sprite(tex);
    s.x = 0; s.y = 0; s.width = info.worldW; s.height = info.worldH;
    this.pieceRoot.addChildAt(s, 0);
    this.under = s;
  }

  update(cx, cy, viewW, viewH) {
    if (this.dead) return;
    const info = wheelInfo();
    if (!info) { wheelStart().catch(() => {}); return; }
    /* a camera that jumped more than a screen is still settling: ask for
       nothing until it lands (chunkGround.js) */
    const now = performance.now();
    if (!this._warmDropped && now - this._born > WARM_KEEP_MS) { wheelDropWarm(); this._warmDropped = true; }
    const jumped = this._lastCx != null && Math.abs(cx - this._lastCx) + Math.abs(cy - this._lastCy) > 400;
    if (this._lastT != null && !jumped) {
      const dt = Math.max(1, now - this._lastT), k = Math.min(1, dt / 250);
      this._vx += ((cx - this._lastCx) / dt - this._vx) * k;
      this._vy += ((cy - this._lastCy) / dt - this._vy) * k;
    }
    this._lastCx = cx; this._lastCy = cy; this._lastT = now;
    this._placeUnder(info);
    if (this.water) this.water.tick(now);
    const cs = info.chunk.gamePx, C = info.chunk.cols, R = info.chunk.rows;
    const clampI = (v) => Math.max(0, Math.min(C - 1, v));
    const clampJ = (v) => Math.max(0, Math.min(R - 1, v));
    const ax = Math.max(-AHEAD_MAX, Math.min(AHEAD_MAX, this._vx * AHEAD_MS));
    const ay = Math.max(-AHEAD_MAX, Math.min(AHEAD_MAX, this._vy * AHEAD_MS));
    /* the view and its margin, stretched the way the camera is going */
    const nx0 = cx - MARGIN + Math.min(0, ax), nx1 = cx + viewW + MARGIN + Math.max(0, ax);
    const ny0 = cy - MARGIN + Math.min(0, ay), ny1 = cy + viewH + MARGIN + Math.max(0, ay);
    const i0 = clampI(Math.floor(nx0 / cs)), i1 = clampI(Math.floor(nx1 / cs));
    const j0 = clampJ(Math.floor(ny0 / cs)), j1 = clampJ(Math.floor(ny1 / cs));
    const vi0 = clampI(Math.floor(cx / cs)), vi1 = clampI(Math.floor((cx + viewW) / cs));
    const vj0 = clampJ(Math.floor(cy / cs)), vj1 = clampJ(Math.floor((cy + viewH) / cs));
    const mx = cx + viewW / 2 + ax / 2, my = cy + viewH / 2 + ay / 2;

    const want = [];
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const rec = this.pieces.get(i + ',' + j);
      const onScreen = i >= vi0 && i <= vi1 && j >= vj0 && j <= vj1;
      if (!rec) {
        const dx = (i + 0.5) * cs - mx, dy = (j + 0.5) * cs - my;
        want.push({ i, j, on: onScreen ? 0 : 1, d: dx * dx + dy * dy });
      } else if (!jumped && !rec.ready && !rec.popped && onScreen) {
        rec.popped = true;
        wheelStats.popIns++;
      }
    }
    /* what is on screen first, then nearest where the camera is heading */
    want.sort((a, b) => a.on - b.on || a.d - b.d);
    if (jumped) want.length = 0;
    for (const w of want) {
      /* a piece laid ahead by the zone gate costs nothing to take */
      if (this.inFlight >= MAX_IN_FLIGHT && !wheelIsWarm(w.i, w.j)) continue;
      this._load(w.i, w.j, info, w.on === 0);
    }
    /* v2.3.2959: then, with room to spare, a short piece whose picture has
       come -- on screen first */
    if (!this.relays && this.inFlight < MAX_IN_FLIGHT) {
      let best = null, bestOn = false;
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const rec = this.pieces.get(i + ',' + j);
        if (!rec || !rec.ready || !rec.due) continue;
        const on = i >= vi0 && i <= vi1 && j >= vj0 && j <= vj1;
        if (!best || (on && !bestOn)) { best = rec; bestOn = on; }
      }
      if (best) this._relay(best.i + ',' + best.j, best, info);
    }

    const k0 = Math.floor((nx0 - KEEP_PX) / cs), k1 = Math.floor((nx1 + KEEP_PX) / cs);
    const l0 = Math.floor((ny0 - KEEP_PX) / cs), l1 = Math.floor((ny1 + KEEP_PX) / cs);
    let resident = 0, short = 0;
    for (const [key, rec] of this.pieces) {
      if (rec.i < k0 || rec.i > k1 || rec.j < l0 || rec.j > l1) this._free(key, rec);
      else if (rec.ready) { resident++; if (rec.lacking) short++; }
    }
    wheelStats.resident = resident;
    wheelStats.short = short;
    wheelStats.loading = this.inFlight;
  }

  _load(i, j, info, onScreen) {
    const key = i + ',' + j;
    const warm = wheelIsWarm(i, j);
    const rec = { i, j, sprite: null, ready: false, popped: false };
    if (onScreen && !warm) { rec.popped = true; wheelStats.popIns++; }
    this.pieces.set(key, rec);
    if (!warm) this.inFlight++;
    wheelChunk(i, j).then((m) => {
      if (!warm) this.inFlight--;
      /* freed, or the whole ground torn down, while it was being laid --
         v2.3.3076: or its renderer gone (_orphaned) */
      if (this.dead || this._orphaned() || this.pieces.get(key) !== rec) return;
      rec.sprite = this._sprite(m, info, i, j);
      rec.ready = true;
      if (this.water) this.water.set(key, i, j, m.wf, info, rec.sprite.texture);
      this._short(rec, m);
    }).catch(() => {
      if (!warm) this.inFlight--;
      if (this.pieces.get(key) === rec) this.pieces.delete(key);
    });
  }

  /* the sprite of a piece the worker laid: one ground px of the apron shown
     each side, half a game px */
  _sprite(m, info, i, j) {
    const src = new BufferImageSource({
      resource: m.data, width: m.w, height: m.h,
      format: 'rgba8unorm', scaleMode: 'linear', alphaMode: 'no-premultiply-alpha',
    });
    const a = info.chunk.apronPx - 1, cs = info.chunk.gamePx, half = cs / info.chunk.px;
    const tex = new Texture({ source: src, frame: new Rectangle(a, a, m.w - 2 * a, m.h - 2 * a) });
    const s = new Sprite(tex);
    s.x = i * cs - half; s.y = j * cs - half;
    s.width = cs + 2 * half; s.height = cs + 2 * half;
    this.pieceRoot.addChild(s);
    this._toGpu(src);
    return s;
  }

  /* v2.3.3076: the renderer this ground was made for is gone (Pixi's
     Application.destroy nulls `renderer`): a black screen's rebuild made a new
     one, with a ground of its own.  A piece the worker brings this one now is
     drawn by nothing and could not be uploaded (_toGpu), so it is not placed
     -- otherwise its colours stayed with this ground for as long as anything
     held it (mp-groundcopy: two a rebuild, the pieces in flight). */
  _orphaned() { return !!this._app && !this._app.renderer; }

  /* ═══ v2.3.3076: THE PIECE'S COLOURS LIVE ON THE GPU ONLY ═══
     A piece was kept twice: on the GPU, where it is drawn from, and in the
     page as its texture's source (m.data, 402 x 402 colours, 0.62 MB) -- 54
     pieces standing, 34 MB, and more on the move (docs/MEMORY-PLAN.md).  Pixi
     reads the source again only to upload the piece a second time: when its
     size changes (never: a piece is laid once and replaced whole, _relay) or
     after a lost context.  And the game never draws on a context that came
     back: every loss is rebuilt, renderer and ground alike, 2.5 s later,
     restored or not (crashTrap watchContextLoss, v2.3.773 -- render textures
     do not survive it), and the new WheelGround asks the worker for every
     piece again.  Pixi's texture GC never unloads a buffer source either
     (autoGarbageCollect is false but for pictures from a file).  So upload it
     now, as it is placed (the frame that shows it would anyway), and let go
     of the colours.  Byte for byte the same on the GPU: mp-groundcopy reads
     the pieces back and compares them with the worker's own.
     Kept when there is no renderer to upload with, or its context is lost
     (an upload there would not count), or the upload throws -- the piece is
     then uploaded the usual way, from its source, when first drawn. */
  _toGpu(src) {
    const r = this._app && this._app.renderer;
    if (!r || !r.texture || typeof r.texture.initSource !== 'function') return;
    try {
      const gl = r.gl;
      if (gl && typeof gl.isContextLost === 'function' && gl.isContextLost()) return;
      r.texture.initSource(src);
    } catch (e) { return; }
    letGoOfColours(src);
  }

  /* v2.3.2959: which pictures the piece went without, if any */
  _short(rec, m) {
    rec.lacking = m.partial && m.lacking && m.lacking.length ? m.lacking : null;
    rec.due = false;
  }

  /* v2.3.2959: lay a short piece again; the new one replaces it once laid,
     so the ground never blinks.  Not counted in `loading`: nothing is
     missing from the screen while it is laid. */
  _relay(key, rec, info) {
    this.relays++;
    rec.due = false;
    wheelChunk(rec.i, rec.j, true).then((m) => {
      this.relays--;
      if (this.dead || this._orphaned() || this.pieces.get(key) !== rec) return;
      const old = rec.sprite;
      rec.sprite = this._sprite(m, info, rec.i, rec.j);
      /* (the water moves the new picture before the old one goes) */
      if (this.water) this.water.set(key, rec.i, rec.j, m.wf, info, rec.sprite.texture);
      if (old) {
        const was = old.texture && old.texture.source;
        try { old.destroy({ texture: true, textureSource: true }); } catch (e) { /* gone */ }
        letGoOfColours(was);   /* v2.3.3076 */
      }
      wheelStats.relaid++;
      if (!m.partial) wheelStats.mended++;
      /* a 'got' that came while it was being laid again still counts */
      const due = rec.due;
      this._short(rec, m);
      rec.due = due && !!rec.lacking;
    }).catch(() => {
      this.relays--;
      if (this.pieces.get(key) === rec) rec.due = true;
    });
  }

  _free(key, rec) {
    this.pieces.delete(key);
    if (this.water) this.water.drop(key);
    if (rec.sprite) {
      /* the texture is this piece's alone: destroy it with its source, which
         lets go of the GPU copy and the colours */
      const src = rec.sprite.texture && rec.sprite.texture.source;
      try { rec.sprite.destroy({ texture: true, textureSource: true }); } catch (e) { /* already gone */ }
      letGoOfColours(src);   /* v2.3.3076: a piece that kept its own (_toGpu) */
      rec.sprite = null;
    }
  }

  /* v2.3.3074: `keepTrial` -- the RENDERER is going (a black screen's
     rebuild), not the player: the trial stays entered (worldTrialLeft would
     make the zone gate treat the Wheel as unloaded and raise its overlay). */
  destroy(opts) {
    if (this.dead) return;
    this.dead = true;
    if (this._offGot) { this._offGot(); this._offGot = null; }
    for (const [key, rec] of [...this.pieces]) this._free(key, rec);
    if (this.water) { this.water.destroy(); this.water = null; }
    if (this.under) { try { this.under.destroy({ texture: true, textureSource: true }); } catch (e) { /* ignore */ } this.under = null; }
    try { this.root.destroy(); } catch (e) { /* ignore */ }
    wheelStats.resident = 0;
    wheelStats.loading = 0;
    wheelStats.short = 0;
    if (!(opts && opts.keepTrial)) worldTrialLeft();
  }
}
