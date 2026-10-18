/* ═══ v2.3.2710: SHADOWS CAST BY EACH MAP'S OWN SUN ═══
 *
 * Owner: "subtle shadowing to make things pop" -- and, from the depth work
 * before it, "the elliptical shadows put in the game looked worse than
 * nothing so those need to be out" (v2.3.2632).  Both are satisfied by the
 * same design, and the second is why it is built the way it is.
 *
 * WHAT A SHADOW IS HERE.  Every piece of a figure that is on screen this frame
 * -- body, armour, hair, hat, cape, weapon, the swing stand-in when one is up --
 * is drawn a second time into the `shadows` layer, under everything that
 * stands on the ground, projected onto the ground along the zone's light
 * (zoneLight.js).  So the shadow IS the figure: it swings the sword, lifts the
 * shield and flaps the cape because the figure does, and it points the way
 * the painting's own shadows point -- which is the property the ellipse could
 * never have (docs/DEPTH-ROADMAP.md, "Why the ellipse was removed").
 *
 * THE PROJECTION.  A point `h` pixels above the figure's feet lands at
 * (lx*h, ly*h) from them; the feet stay put.  That is one affine map per
 * figure, pivoted on its ground point:
 *
 *     x' = x - lx*(y - py)          y' = py - ly*(y - py)
 *
 * applied on top of each piece's own transform.  Nothing is rasterised on the
 * CPU and no texture is made: a shadow piece is a Sprite sharing the figure
 * piece's texture, so it batches with every other shadow piece.
 *
 * ONE PASS FOR THE WHOLE LAYER.  The pieces are drawn opaque and the layer
 * carries a single filter that turns "covered" into the shade colour at the
 * zone's alpha.  Doing the alpha per piece instead would darken every overlap
 * -- the arm over the torso, two players standing together -- and a shadow
 * with darker patches inside it reads as a stain, not a shadow.  The filter
 * also softens the edge by a pixel, and it runs at CSS resolution (the Pixi
 * default), so on a 3x iPhone it touches a ninth of the pixels a full-res
 * pass would.  No shadows on screen -> no filter -> no pass at all.
 *
 * ═══ v2.3.3149: THE SHADOWS ARE DRAWN ON THE WORLD'S GRID, THEN SLID ═══
 * Owner: "the shadows look a bit flickery when you move on some of the props".
 * That CSS-resolution pass is a grid of its own: one texel a CSS px, three
 * device px on an iPhone.  The camera slides in fractions of a pixel, so every
 * frame each shadow was drawn again at a new fraction of that coarse grid --
 * its vertices snapped to the nearest texel (roundPixels), its edges sampled
 * at a new phase -- while the prop casting it moved smoothly a device pixel at
 * a time.  The shadow crawled against its own prop, worst on the thin ones (a
 * lamp post, a fence rail, a sign).  Measured on a phone-sized page, the
 * camera stepped one device pixel at a time and each frame lined up with the
 * world: the shadows moved off the world by ~2% of their darkness a step, a
 * full-resolution pass by 0.3% (mp-shadowlock; TRAPS §141) -- but that pass costs
 * a 2048 x 4096 texture from Pixi's pool, ~32 MB of graphics memory on a 3x
 * phone, which the black screens cannot afford.
 *   So the layer is drawn on a grid that does not move with the camera's
 * fraction: it is offset by minus that fraction (`lockToWorldGrid`), so the
 * shadows are rasterised at the same phase every frame -- only ever shifted by
 * whole texels -- and the filter slides the finished picture back by the
 * fraction (`uShift`, a linear sample between two texels), which is smooth.
 * Same texture, same pass, same cost.  `?shadowlock=0` is the layer as it was.
 *
 * ═══ v2.3.3338: ...AND NEVER SNAPPED TO A GRID THAT IS NOT THE PIXELS ═══
 * Owner, again: "I like the game's shadows but prop shadows right now still
 * flicker as you run around."  The lock above was measured stepping the camera
 * one device pixel at a time, seven steps -- two whole CSS px crossed -- and
 * between crossings the locked picture cannot change, so the crossings were
 * watered down.  At each crossing two things broke it:
 *   - PIXI SNAPS TO THE WRONG GRID INSIDE A FILTER.  pixiApp's roundPixels
 *     snaps every vertex to a whole pixel of the target, using the global
 *     `uResolution` -- the render target's FULL size.  A filter draws into a
 *     texture from Pixi's pool, a power of two (512 x 1024 for a 394 x 848
 *     frame on a 390 x 844 phone), and only into its frame (RenderTargetSystem
 *     sets the viewport to it), so the "pixels" it snapped to were 0.77 x 0.83
 *     of a texel, anchored to the screen's edge.  Every crossing re-snapped
 *     every corner and every column of every shadow by a different amount: up
 *     to ~1.4 device px off its prop, jumping up to ~2.2 between frames, while
 *     the prop (snapped on the screen's own grid, exactly one device px) stood
 *     still.  The lock already draws each shadow at the same fraction of a
 *     texel every frame, so snapping adds nothing: the pieces here are drawn
 *     where they are (`_btNoSnap`, cleared in `installNoSnap`'s batcher hook).
 *   - THE FILTER READ ITS PICTURE AT HALF PRECISION ON AN IPHONE.  Pixi gives
 *     a fragment shader `mediump` unless asked, and on an iPhone that is a
 *     half float: the coordinate the picture is read at moved in steps of a
 *     quarter to half a texel (0.75-1.5 device px), so the lock's smooth slide
 *     back (uShift) became a staircase.  A desktop (and the QA box's software
 *     GL) runs mediump at full precision, which is why no test here could see
 *     it.  It is `highp` now, as the water's shader is (wheelWater.js).
 * Same texture, same pass, same cost.  `?shadowsnap=1` puts Pixi's snapping
 * back and `?shadowhp=0` the half precision, to compare on a phone;
 * `window.__btShadowSnap()` says which is on.  mp-shadowlock steps the camera
 * a whole CSS px at a time, across and down, so every step is a crossing.
 *
 * ═══ v2.3.3408: ...AND DRAWN BEFORE THE FRAME, NOT IN THE MIDDLE OF IT ═══
 * The owner: "iterate on what best improves framerate without loss of quality
 * (or negligible loss) for phone gameplay (iPhone, android)".  A filter is a
 * render pass, and this one ran in the MIDDLE of the frame: the ground was
 * already drawn when the graphics chip stopped, drew the shadow pieces into a
 * picture of their own, and went back to the screen to draw the shade.  A
 * phone's chip (tile-based: every iPhone, most Androids) holds the frame in
 * its own small memory while it draws, so stopping writes the frame out to
 * main memory and going back reads it in again -- colour and stencil, ~15 MB
 * each way at 3x on a big iPhone, every frame, for every player in the Wheel
 * (TRAPS §221 says the same of the metal shine's passes).
 *   So the pieces are drawn into their picture FIRST, before the frame starts
 * (`_prepass`, at the end of update -- the last world pass, so the camera and
 * every figure are where they will be drawn), and the frame then draws the
 * shade from it as one more quad in the shadows layer's place (`this.shade`,
 * a mesh with the filter's own fragment program).  The chip draws the frame
 * in one go.  THE SAME PICTURE: the pieces live in a container of their own
 * (`this.cast`, never in the scene), moved back by the camera's fraction of a
 * pixel as the layer was (`castIn`), and drawn with the world's transform plus
 * PAD into a picture of the screen's size in CSS px plus PAD a side -- the
 * same numbers the filter's picture was drawn with when its bounds reach the
 * screen's edges, as they do in the Wheel -- and the quad reads it at the
 * same points (uShift, the soft edge, highp).  `?shadowpass` is the filter, in
 * the middle of the frame, as it was; the Speed test times it as a step of
 * its own (setShadowPrepass), and mp-shadowprepass draws one held frame both
 * ways.
 */
import { BatcherPipe, Container, Filter, GlProgram, Matrix, Mesh, MeshGeometry, MeshSimple, RenderTexture, Shader, Sprite, Texture, UniformGroup } from 'pixi.js';
import { profileAtU } from '../propGround.js';
import { healAfterRenderThrow } from '../renderHeal.js';   /* v2.3.3408: a pre-pass that throws leaves nothing open */

/* v2.3.3149: on unless `?shadowlock=0` (see the header) -- read once */
let _lockOn = null;
function lockOn() {
  if (_lockOn !== null) return _lockOn;
  _lockOn = true;
  try { if (typeof location !== 'undefined' && /[?&]shadowlock=0\b/.test(location.search || '')) _lockOn = false; } catch (e) { /* on */ }
  return _lockOn;
}

/* v2.3.3338: `?shadowsnap=1` -- Pixi's snapping back on the shadow pieces;
   `?shadowhp=0` -- the filter at the half precision it had (see the header).
   Read once. */
const _q = (re) => { try { return typeof location !== 'undefined' && re.test(location.search || ''); } catch (e) { return false; } };
const SNAP_OLD = _q(/[?&]shadowsnap=1\b/);
const HP_ON = !_q(/[?&]shadowhp=0\b/);
/* v2.3.3408: `?shadowpass` -- the filter in the middle of the frame, as it
   was (see the header); setShadowPrepass flips it live, for this page only */
let _prepassOn = !_q(/[?&]shadowpass\b/);
/* the room round the screen the pieces' picture keeps, a side, in CSS px: the
   filter's own `padding`, so a piece just off the screen still softens its
   edge as it did */
const PAD = 2;
/* v2.3.3408: how far past the pieces' bounds the shade can reach, in the
   picture's texels: the soft edge's one, the slide's one (uShift < 1), and one
   for the bounds' own rounding */
const SHADE_REACH = 3;

/* ═══ v2.3.3338: THE SHADOW PIECES ARE DRAWN WHERE THEY ARE ═══
   Every batched sprite or mesh meets its batcher in BatcherPipe.addToBatch,
   carrying `roundPixels` (Pixi's own: the renderer's, set once when its GPU
   data is made; sharpPixels.js sets it again there for every quad).  A piece
   marked `_btNoSnap` is set to 0 AFTER the rest of the chain has had its say
   -- its attributes are packed only when the batch breaks, later -- so the
   order this and sharpPixels' hook were installed in does not matter.  Only
   batched pieces pass here, and every shadow piece is batched: a sprite, a
   34-vertex building mesh, a 45-vertex cut-out grid, a 27-vertex flag (a mesh
   of more than 100 would be drawn on its own, and would snap). */
let _noSnapOn = false;
let _unsnapped = 0;
function installNoSnap() {
  if (_noSnapOn || SNAP_OLD) return;
  _noSnapOn = true;
  const P = BatcherPipe.prototype;
  const add = P.addToBatch;
  P.addToBatch = function (obj, instructionSet) {
    const r = add.call(this, obj, instructionSet);
    if (obj && obj.renderable && obj.renderable._btNoSnap && obj.roundPixels) { obj.roundPixels = 0; _unsnapped++; }
    return r;
  };
}
if (typeof window !== 'undefined') {
  window.__btShadowSnap = () => ({ hooked: _noSnapOn, snapOld: SNAP_OLD, highp: HP_ON, unsnapped: _unsnapped });
}

const FRAG = `
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
/* highp: the vertex stage declares the same uniform at highp, and a uniform
   whose precision differs between the two stages fails to LINK -- which Pixi
   reports only as "Could not initialize shader" and then draws nothing. */
uniform highp vec4 uInputSize;
uniform float uAlpha;
uniform vec3 uColor;
uniform float uSoft;
/* v2.3.3149: the camera's fraction of a pixel the layer was drawn without,
   in CSS px (lockToWorldGrid): the picture is read that far back */
uniform vec2 uShift;

void main()
{
    vec2 d = uInputSize.zw * uSoft;
    vec2 uv = vTextureCoord - uShift * uInputSize.zw;
    float a = texture(uTexture, uv).a * 0.36;
    a += texture(uTexture, uv + vec2(d.x, 0.0)).a * 0.16;
    a += texture(uTexture, uv - vec2(d.x, 0.0)).a * 0.16;
    a += texture(uTexture, uv + vec2(0.0, d.y)).a * 0.16;
    a += texture(uTexture, uv - vec2(0.0, d.y)).a * 0.16;
    a = min(a, 1.0) * uAlpha;
    finalColor = vec4(uColor * a, a);
}
`;
const VERT = `
in vec2 aPosition;
out vec2 vTextureCoord;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition( void )
{
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0*uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
    return vec4(position, 0.0, 1.0);
}

void main(void)
{
    gl_Position = filterVertexPosition();
    vTextureCoord = aPosition * (uOutputFrame.zw * uInputSize.zw);
}
`;

function makeShadowFilter() {
  return Filter.from({
    /* v2.3.3338: highp -- see the header.  (Pixi caches a program by its
       source alone, so the two must never both be asked for in one page:
       HP_ON is read once, at load.) */
    gl: HP_ON
      ? { vertex: VERT, fragment: FRAG, name: 'bt-shadow-filter', preferredFragmentPrecision: 'highp' }
      : { vertex: VERT, fragment: FRAG, name: 'bt-shadow-filter' },
    resources: {
      shadowUniforms: {
        uAlpha: { value: 0.3, type: 'f32' },
        uColor: { value: new Float32Array([0, 0, 0]), type: 'vec3<f32>' },
        uSoft: { value: 0.5, type: 'f32' },
        uShift: { value: new Float32Array([0, 0]), type: 'vec2<f32>' },   /* v2.3.3149 */
      },
    },
    /* The blur reaches one texel past the covered area, so the filter needs
       that much room or the soft edge is clipped flat on the frame's side. */
    padding: 2,
  });
}

/* ═══ v2.3.3408: THE SHADE, DRAWN FROM THE PIECES' PICTURE (the header) ═══
   The filter's own fragment program (FRAG), on a quad over the screen: the
   same reads at the same points.  Its vertex stage is a mesh's, as the moving
   water's is (wheelWater.js): the quad is laid in screen CSS px and placed in
   the world by the inverse of the world's transform, which puts it back over
   the screen.  (uInputSize is the fragment stage's alone here, so the
   precision rule FRAG's comment gives cannot bite.)  One program a page:
   Pixi caches it by its source, and HP_ON is read once. */
const SHADE_VERT = `
in vec2 aPosition;
in vec2 aUV;
out vec2 vTextureCoord;

uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform mat3 uTransformMatrix;

void main(void)
{
    mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
    gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
    vTextureCoord = aUV;
}
`;
let _shadeProgram = null;
function shadeProgram() {
  if (!_shadeProgram) {
    _shadeProgram = GlProgram.from(HP_ON
      ? { vertex: SHADE_VERT, fragment: FRAG, name: 'bt-shadow-shade', preferredFragmentPrecision: 'highp' }
      : { vertex: SHADE_VERT, fragment: FRAG, name: 'bt-shadow-shade' });
  }
  return _shadeProgram;
}

/* How long a figure's last shadow is held when the figure has vanished but
   its owner has not -- a stand-in this module does not know about yet (a new
   cast pose, say) hides the body for a moment, and a shadow that blinks off
   every attack is worse than one that holds still for that moment. */
const HOLD_MS = 1500;

/* Walk from `node` up to `root`, returning node's transform in root's space,
   or null if the node is hidden anywhere on the way (or is not under root).
   Walked by hand rather than via getGlobalTransform twice and an inverse:
   the layers sit directly under the world container with identity
   transforms, so stopping there IS world space, and it is half the work. */
const _chain = [];
function relTransform(node, root, out) {
  _chain.length = 0;
  let cur = node;
  while (cur && cur !== root) {
    if (!cur.visible || cur.renderable === false || cur.alpha <= 0.02) return null;
    _chain.push(cur);
    cur = cur.parent;
  }
  if (cur !== root) return null;
  out.identity();
  for (let i = _chain.length - 1; i >= 0; i--) {
    const c = _chain[i];
    c.updateLocalTransform();
    out.append(c.localTransform);
  }
  return out;
}

function usableTexture(t) {
  return !!(t && t !== Texture.EMPTY && !t.destroyed && t.source && !t.source.destroyed);
}

/* v2.3.2817: where the building's own shadow mesh (placeDepth: 17 column
   edges, a top and a bottom vertex each, two triangles a column) puts the
   point (tx, ty) of its picture, in the picture's px -- the same affine map
   the GPU applies to that triangle, so a piece cut out of the building casts
   exactly where its pixels did when they were part of it.  `V` is that
   mesh's vertex array; a point off the picture's edge uses the edge column. */
function castOnBuilding(V, fw, fh, tx, ty, out) {
  const q = (tx / fw) * 16, vv = ty / fh;
  const i = Math.max(0, Math.min(15, Math.floor(q)));
  const sx = q - i;
  const a = i * 4, b = a + 4;
  const TLx = V[a], TLy = V[a + 1], BLx = V[a + 2], BLy = V[a + 3];
  const TRx = V[b], TRy = V[b + 1], BRx = V[b + 2], BRy = V[b + 3];
  if (sx + vv <= 1) {
    out.x = TLx + sx * (TRx - TLx) + vv * (BLx - TLx);
    out.y = TLy + sx * (TRy - TLy) + vv * (BLy - TLy);
  } else {
    out.x = BRx + (1 - sx) * (BLx - BRx) + (1 - vv) * (TRx - BRx);
    out.y = BRy + (1 - sx) * (BLy - BRy) + (1 - vv) * (TRy - BRy);
  }
}
/* One vertex of a piece: piece-local (px, py) -> its building's picture px
   (the piece's local transform T) -> its shadow, into v[i]. */
function castPiecePoint(T, px, py, V, fw, fh, P, v, i) {
  castOnBuilding(V, fw, fh, T.a * px + T.c * py + T.tx, T.b * px + T.d * py + T.ty, P);
  v[i * 2] = P.x; v[i * 2 + 1] = P.y;
}

/* ═══ v2.3.3000: A FREED SHEET LEAVES NO SHADOW BEHIND ═══
   The Wheel's objects cast from their sprite sheets' own textures, and those
   sheets load as you walk toward them and are freed behind you
   (wheelObjects.js).  A pooled shadow piece only HIDES when it is not used
   this frame -- it keeps its texture, the v2.3.2651 shape (CLAUDE.md, the
   zone-asset exception; TRAPS §126).  So the Wheel calls this before it lets
   a sheet go, and every shadow pool drops every texture; the pieces still
   wanted are placed again on the next frame. */
const _systems = new Set();
export function releaseShadowTextures() {
  for (const sys of _systems) { try { sys.clear(); } catch (e) { /* one pool's trouble */ } }
}
/* v2.3.3152: QA -- how many shadow systems the module holds (one a renderer) */
export function shadowSystemCount() { return _systems.size; }

/* ═══ v2.3.3408: BEFORE THE FRAME (true) OR IN THE MIDDLE OF IT, LIVE ═══
   For this page only: the Speed test's "the old way" step (game/speedTest.js)
   and mp-shadowprepass's held frame drawn both ways.  Each system moves its
   pieces to where they are drawn from, at once; the next frame draws the
   other way. */
export function shadowPrepassOn() { return _prepassOn; }
export function setShadowPrepass(on) {
  _prepassOn = !!on;
  for (const sys of _systems) { try { sys._rehome(); } catch (e) { /* that system's next update */ } }
  return _prepassOn;
}
if (typeof window !== 'undefined') {
  window.__btShadowPrepass = {
    on: () => _prepassOn,
    set: (on) => setShadowPrepass(on),
    /* QA (mp-palette, mp-shadowprepass): the pieces' picture drawn again for
       the world where it stands NOW -- a test that moves the camera and
       renders without a frame of the game in between */
    redraw: () => { let n = 0; for (const sys of _systems) { try { if (sys._redraw()) n++; } catch (e) { /* one system's trouble */ } } return n; },
    stats: () => { const out = []; for (const sys of _systems) out.push({ prepass: sys.stats.prepass, fails: sys._preFails, rt: sys.rt ? [sys.rt.width, sys.rt.height] : null, home: sys._homeIsCast ? 'cast' : 'layer', shade: !!(sys.shade && sys.shade.visible), area: sys.stats.shadeArea != null ? +sys.stats.shadeArea.toFixed(3) : null }); return out; },
    /* the pieces' own containers, where they are drawn from now (mp-palette
       hides some of them before a redraw) */
    casts: () => { const out = []; for (const sys of _systems) if (sys._homeIsCast) out.push(sys.cast); return out; },
  };
}

export class ShadowSystem {
  /* v2.3.3408: `renderer` -- the pieces' picture is drawn before the frame
     with it (_prepass); without one, the filter, in the middle of the frame */
  constructor(layer, root, renderer = null) {
    _systems.add(this);
    installNoSnap();   /* v2.3.3338: once, for every renderer's shadows */
    this.layer = layer;
    this.root = root;
    this.renderer = renderer;
    /* v2.3.3408: the pieces' own container, never in the scene: drawn into
       `rt` before the frame, and `shade` draws that picture in the layer's
       place.  The pieces live in it, or in the layer for the filter
       (`_homeIsCast` says which; _rehome moves them) */
    this.cast = new Container();
    this.cast.label = 'shadowCast';
    /* the pieces' parent inside it, moved back by the lock's fraction as the
       layer is for the filter (lockToWorldGrid), so each piece's corners come
       out of the same arithmetic the filter's did: the fraction taken off in
       the piece's own numbers, the world's transform on the chip -- put into
       the cast's transform instead, it rounded differently by a few
       thousandths of a pixel, and the pieces' pictures are read pixel by
       pixel, so a shadow's edge texel flipped here and there (up to 15
       levels of 255 on the QA phone) */
    this.castIn = new Container();
    this.castIn.label = 'shadowCastLock';
    this.cast.addChild(this.castIn);
    this._homeIsCast = false;
    this.rt = null;
    this.shade = null;
    this._preOk = true;          /* false after the pre-pass threw: the filter for the rest of the visit */
    this._preFails = 0;
    this._T = new Matrix();
    this._I = new Matrix();
    this._last = null;           /* the last shade's light: what _redraw draws again */
    this.pool = [];
    this.used = 0;
    this.meshPool = [];          /* v2.3.2749: the buildings' depth-aware shadows (placeDepth) */
    this.meshUsed = 0;
    this._pieceMeshes = new Map();   /* v2.3.2817: a building's cut-out piece -> its shadow mesh */
    this._pieceList = [];
    this._frame = 0;
    this._lastPieces = 0;
    this.filter = null;
    this._held = new Map();      /* caster key -> { t, items: [{tex, ax, ay, m}] } */
    this._m = new Matrix();
    this._p = new Matrix();
    this._f = new Matrix();
    /* v2.3.2749: `keys` -- EVERY caster drawn this frame, by key, so a test
       can ask "does each monster on screen cast" without the 16-entry cap on
       `list`.  One array, cleared and refilled in place: the keys are strings
       the casters already carry, so this allocates nothing per frame. */
    this.stats = { casters: 0, pieces: 0, held: 0, self: null, list: [], keys: [], lifePieces: 0, lock: null, prepass: false };   /* v2.3.3149: + lock, the fraction the layer is drawn back by; v2.3.3408: + prepass, drawn before the frame */
    this._rehome();
  }

  /* v2.3.3408: drawn before the frame (the cast), or through the filter (the
     layer) */
  _wantsCast() { return _prepassOn && this._preOk && !!this.renderer && !this.renderer.destroyed; }
  get home() { return this._homeIsCast ? this.castIn : this.layer; }

  /* every pooled piece to the container it is drawn from (the switch, or the
     pre-pass giving up), and the other way's drawing put away */
  _rehome() {
    const toCast = this._wantsCast();
    if (toCast === this._homeIsCast) return;
    const dst = toCast ? this.castIn : this.layer;
    const move = (o) => { if (o && !o.destroyed && o.parent !== dst) dst.addChild(o); };
    for (let i = 0; i < this.pool.length; i++) move(this.pool[i]);
    for (let i = 0; i < this.meshPool.length; i++) move(this.meshPool[i]);
    for (let i = 0; i < this._pieceList.length; i++) move(this._pieceList[i].mesh);
    this._homeIsCast = toCast;
    if (toCast) {
      if (this.layer.filters) this.layer.filters = null;
      if (this.layer.x !== 0 || this.layer.y !== 0) this.layer.position.set(0, 0);
    } else if (this.shade && this.shade.visible) {
      this.shade.visible = false;
    }
  }

  _piece() {
    let s = this.pool[this.used];
    if (!s) {
      s = new Sprite();
      s._btNoSnap = true;   /* v2.3.3338: drawn where it is (installNoSnap) */
      this.home.addChild(s);   /* v2.3.3408: the cast, or the layer (_rehome) */
      this.pool.push(s);
    }
    this.used++;
    return s;
  }

  /* Place one shadow piece: texture + anchor from the source, transform =
     projection (about the pivot) x the source's world transform. */
  _place(tex, ax, ay, world, proj) {
    const s = this._piece();
    if (s.texture !== tex) s.texture = tex;
    if (s.anchor.x !== ax || s.anchor.y !== ay) s.anchor.set(ax, ay);
    this._f.copyFrom(proj).append(world);
    s.setFromMatrix(this._f);
    if (!s.visible) s.visible = true;
  }

  /* ═══ v2.3.2749: A BUILDING'S SHADOW, COLUMN BY COLUMN ═══
     A figure is a billboard: every pixel of it stands on the same spot, so
     one projection pivoted on its feet is right.  A building is not.  Its
     picture is a front wall at the bottom and a roof, towers and signs
     higher up that stand over ground up to 220 px further BACK -- and the
     picture cannot say how far back any one pixel is.  One pivot for all of
     it put the auction house's back-left tower's shadow on the cobble in
     front of its sunlit left wall: pushed forward by the depth it was
     wrongly assumed not to have.

     So each column of the picture gets its own ground, and it moves up the
     column: a pixel on the column's base row stands on the base the art
     shows there (propGround.profileAtU -- the diamond's V), and the column's
     top stands on the footprint's BACK edge, with the rows between moving
     back in step.  Front walls cast from the front, roofs and towers from
     further back, and nothing is ever lifted less than zero, so no shadow
     can fall toward the sun.  Linear in y within a column, so a two-row mesh
     is exact: (cols + 1) x 2 vertices, recomputed per frame from the sprite
     (it only moves when its zone does).  The pieces are MeshSimple sharing
     the building's own texture, in the same filtered layer as the figures,
     so a figure standing in a building's shadow darkens nothing twice. */
  /* v2.3.3028: `floor` -- the Wheel's low things cast through this too, each
     column a billboard on its OWN base (back = Infinity: the column's top
     stands on its base), and `floor` is how far back a base may be read:
     the middle of the thing's footprint, where it pivoted before -- so a
     rail, a seat or a sign, whose column's lowest pixel is high in the
     picture, casts from there and not from mid-air.  Absent for a building,
     which is unchanged. */
  placeDepth(spr, g, back, lx, ly, pieces, floor) {
    const tex = spr.texture;
    if (!usableTexture(tex) || !g) return false;
    const COLS = 16;
    let m = this.meshPool[this.meshUsed];
    if (!m) {
      const n = (COLS + 1) * 2;
      const uvs = new Float32Array(n * 2);
      const idx = new Uint32Array(COLS * 6);
      for (let i = 0; i <= COLS; i++) {
        uvs[i * 4] = i / COLS; uvs[i * 4 + 1] = 0;        /* top of the column */
        uvs[i * 4 + 2] = i / COLS; uvs[i * 4 + 3] = 1;    /* bottom */
        if (i < COLS) {
          const a = i * 2;
          idx.set([a, a + 1, a + 2, a + 1, a + 3, a + 2], i * 6);
        }
      }
      m = new MeshSimple({ texture: tex, vertices: new Float32Array(n * 2), uvs, indices: idx });
      m._btNoSnap = true;   /* v2.3.3338 */
      this.home.addChild(m);   /* v2.3.3408 */
      this.meshPool.push(m);
    }
    this.meshUsed++;
    if (m.texture !== tex) m.texture = tex;
    const v = m.vertices;
    const fw = tex.frame.width, fh = tex.frame.height;
    const sx = spr.scale.x, sy = spr.scale.y;
    const yB = spr.y;                                  /* anchor (0.5, 1): the frame's bottom */
    const yT = spr.y - fh * sy;                        /* ...and its top */
    for (let i = 0; i <= COLS; i++) {
      const u = i / COLS;
      const x = spr.x + (u - 0.5) * fw * sx;           /* a mirrored prop maps mirrored */
      const f0 = profileAtU(g, u);                     /* this TEXTURE column's base, off the art */
      const f = floor != null && f0 < floor ? floor : f0;   /* v2.3.3028: never further back than `floor` */
      const b = Math.min(back, f);
      /* the ground under a pixel at y moves from f (base row) to b (frame
         top), linearly; its height is ground - y; its shadow is ground +
         (lx, ly) * height */
      const r = (f - yT) > 1 ? (f - b) / (f - yT) : 0;
      const zT = b, hT = zT - yT;
      const zB = f + (yB - f) * r, hB = zB - yB;       /* below the base row: empty art, extrapolated */
      v[i * 4] = x + lx * hT;     v[i * 4 + 1] = zT + ly * hT;
      v[i * 4 + 2] = x + lx * hB; v[i * 4 + 3] = zB + ly * hB;
    }
    if (!m.visible) m.visible = true;
    if (pieces) this._lastPieces = this._placePieces(v, fw, fh, pieces);
    return true;
  }

  /* ═══ v2.3.2817: THE PIECES CUT OUT OF A BUILDING CAST TOO ═══
     worldLife (v2.3.2811-2816) draws a building's signs, banner, scales,
     crate and flags as pieces of their own, so they can swing and wave -- and
     cut them out of the picture this shadow is cast from.  The auction
     house's long sign shadow on the cobble went with them: mp-worldshadow
     read 5 where the building's shaded side used to darken past 6.  So each
     piece casts through the SAME column model as its building -- its pixels
     stand on the grounds placeDepth gave that building's columns --
     at where it hangs THIS frame: each of its vertices lands exactly where
     the building's own mesh puts that point of the picture.  The shadow
     joins the building's and swings and waves with the piece.

     A piece is anything with a texture and a local transform that maps it
     into its building's TEXTURE pixels (0..W across, 0..H down, which is how
     worldLife's rider builds them): a Sprite casts a small grid, so a
     rotated sign still follows the columns, and a Mesh (a flag) casts its
     own vertices, wave and all.  `host._lifePieces` is the list. */
  _placePieces(V, fw, fh, list) {
    let n = 0;
    const P = this._pp || (this._pp = { x: 0, y: 0 });
    for (let k = 0; k < list.length; k++) {
      const o = list[k];
      if (!o || o.destroyed || o.visible === false || !usableTexture(o.texture)) continue;
      const src = o.geometry && o.geometry.positions;
      let m = this._pieceMeshes.get(o);
      if (!m) {
        let uvs, idx, count;
        if (src) {
          uvs = o.geometry.uvs; idx = o.geometry.indices; count = src.length / 2;
        } else {
          const GX = 8, GY = 4;
          count = (GX + 1) * (GY + 1);
          uvs = new Float32Array(count * 2);
          idx = new Uint32Array(GX * GY * 6);
          for (let j = 0; j <= GY; j++) for (let i = 0; i <= GX; i++) {
            uvs[(j * (GX + 1) + i) * 2] = i / GX; uvs[(j * (GX + 1) + i) * 2 + 1] = j / GY;
          }
          for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) {
            const a = j * (GX + 1) + i, b = a + GX + 1;
            idx.set([a, a + 1, b, a + 1, b + 1, b], (j * GX + i) * 6);
          }
        }
        const mesh = new MeshSimple({ texture: o.texture, vertices: new Float32Array(count * 2), uvs, indices: idx });
        mesh._btNoSnap = true;   /* v2.3.3338 */
        this.home.addChild(mesh);   /* v2.3.3408 */
        m = { mesh, grid: src ? null : [8, 4] };
        this._pieceMeshes.set(o, m);
        this._pieceList.push(m);
      }
      const mesh = m.mesh;
      if (mesh.texture !== o.texture) mesh.texture = o.texture;
      o.updateLocalTransform();
      const T = o.localTransform;
      const v = mesh.vertices;
      if (src) {
        for (let i = 0; i < src.length / 2; i++) castPiecePoint(T, src[i * 2], src[i * 2 + 1], V, fw, fh, P, v, i);
      } else {
        const GX = m.grid[0], GY = m.grid[1];
        const tw = o.texture.orig.width, th = o.texture.orig.height;
        const ax = o.anchor ? o.anchor.x : 0, ay = o.anchor ? o.anchor.y : 0;
        for (let j = 0; j <= GY; j++) for (let i = 0; i <= GX; i++) {
          castPiecePoint(T, (i / GX - ax) * tw, (j / GY - ay) * th, V, fw, fh, P, v, j * (GX + 1) + i);
        }
      }
      m.used = this._frame;
      if (!mesh.visible) mesh.visible = true;
      n++;
    }
    return n;
  }

  /* ═══ v2.3.3152: A RENDERER'S SHADOWS GO WITH IT ═══
     Every ShadowSystem joins the module's list (releaseShadowTextures) and
     nothing took one out: a black screen's rebuild made a new one and the old
     one stayed for the visit -- its pools, its held casters' textures, its
     filter and its old world container -- and every sheet the Wheel freed
     cleared them all again.  Found by the leak hunt (mp-sceneleak: one
     system after two rebuilds, not three). */
  destroy() {
    _systems.delete(this);
    try { this.clear(); } catch (e) { /* its layer may be gone already */ }
    this._held.clear();
    this.pool = [];
    this.meshPool = [];
    this._pieceMeshes.clear();
    this._pieceList = [];
    if (this.filter) { try { this.filter.destroy(); } catch (e) { /* gone */ } this.filter = null; }
    /* v2.3.3408: the pre-pass's own things -- its picture, the shade's quad
       (its geometry and bindings are its own; the program is shared), and
       the cast with the pieces in it (their textures are the figures', never
       ours) */
    if (this.shade) {
      const g = this.shade.geometry, sh = this.shade.shader;
      try { this.shade.destroy(); } catch (e) { /* gone */ }
      try { if (g) g.destroy(true); } catch (e) { /* gone */ }
      try { if (sh) sh.destroy(false); } catch (e) { /* gone */ }
      this.shade = null;
    }
    if (this.rt) { try { this.rt.destroy(true); } catch (e) { /* gone */ } this.rt = null; }
    try { this.cast.destroy({ children: true, texture: false, textureSource: false }); } catch (e) { /* gone */ }
    this.renderer = null;
  }

  clear() {
    /* Hidden is not enough: drop the texture too.  clear() runs on every zone
       change, and a zone's monster art is FREED on exit (preloadZoneAssets /
       freeZoneMap) -- a pooled piece still holding it is the v2.3.2651 shape
       (CLAUDE.md, the zone-asset exception), where a hidden sprite came back
       on the next visit pointing at a destroyed source. */
    for (let i = 0; i < this.pool.length; i++) {
      const s = this.pool[i];
      s.visible = false;
      if (s.texture !== Texture.EMPTY) s.texture = Texture.EMPTY;
    }
    this.used = 0;
    for (let i = 0; i < this.meshPool.length; i++) {
      const m = this.meshPool[i];
      m.visible = false;
      if (m.texture !== Texture.EMPTY) m.texture = Texture.EMPTY;
    }
    this.meshUsed = 0;
    /* v2.3.2817: the buildings' cut-out pieces too (their art is global, but
       the rule above is "hidden is not enough", and it costs nothing) */
    for (let i = 0; i < this._pieceList.length; i++) {
      const m = this._pieceList[i].mesh;
      m.visible = false;
      if (m.texture !== Texture.EMPTY) m.texture = Texture.EMPTY;
    }
    if (this.layer.filters) this.layer.filters = null;
    if (this.shade && this.shade.visible) this.shade.visible = false;   /* v2.3.3408 */
    this._last = null;
    this._held.clear();
    this.stats.casters = 0; this.stats.pieces = 0; this.stats.held = 0; this.stats.self = null; this.stats.list.length = 0; this.stats.keys.length = 0;
    this.stats.lifePieces = 0;
    this.stats.prepass = false;
  }

  /**
   * @param {Array} casters  [{ key, px, py, sprites: Sprite[], alive }]
   * @param {object|null} light  zoneLight() entry
   * @param {number} fade  sunLeft(), 0-1
   * @param {number} now
   */
  update(casters, light, fade, now) {
    this._rehome();   /* v2.3.3408: where the pieces are drawn from, this frame */
    this.used = 0;
    this.meshUsed = 0;
    this._frame++;
    const st = this.stats;
    st.casters = 0; st.pieces = 0; st.held = 0; st.self = null; st.list.length = 0; st.keys.length = 0;
    st.lifePieces = 0;
    if (!light || !(fade > 0.02) || !casters || !casters.length) {
      this.clear();
      return;
    }
    const { lx, ly } = light;
    const P = this._p, M = this._m;
    for (let c = 0; c < casters.length; c++) {
      const cs = casters[c];
      if (cs.depth) {
        /* v2.3.2749: a building -- see placeDepth.  v2.3.2817: with the
           pieces cut out of it (see _placePieces) */
        this._lastPieces = 0;
        if (this.placeDepth(cs.depth.spr, cs.depth.g, cs.depth.back, lx, ly, cs.depth.pieces, cs.depth.floor)) {
          const np = this._lastPieces;
          st.casters++; st.pieces += 1 + np; st.lifePieces += np; st.keys.push(cs.key);
          if (st.list.length < 16) st.list.push({ key: cs.key, px: cs.depth.spr.x, py: Number.isFinite(cs.depth.back) ? cs.depth.back : cs.depth.g.base, pieces: 1 + np });
        }
        continue;
      }
      const px = cs.px, py = cs.py;
      if (!Number.isFinite(px) || !Number.isFinite(py)) continue;
      /* the ground projection about this figure's feet (see header) */
      P.set(1, 0, -lx, -ly, lx * py, py * (1 + ly));
      let placed = 0;
      /* v2.3.3000: a caster that never vanishes for a moment (the Wheel's
         objects: drawn or gone) keeps nothing to hold -- a hundred of them
         would otherwise make a hundred matrices a frame for the collector */
      const items = cs.noHold ? null : [];
      const list = cs.sprites || [];
      for (let i = 0; i < list.length; i++) {
        const sp = list[i];
        if (!sp || sp.destroyed || !usableTexture(sp.texture)) continue;
        /* a sprite doing duty as a MASK (the hair-under-hat clip, the hood
           clip) is not part of the figure -- Pixi flags it exactly this way
           when it is assigned -- and a glow drawn additively is light, not
           something that stops it */
        if (sp.includeInBuild === false) continue;
        if (sp.blendMode === 'add' || sp.blendMode === 'screen') continue;
        if (!relTransform(sp, this.root, M)) continue;
        this._place(sp.texture, sp.anchor.x, sp.anchor.y, M, P);
        placed++;
        /* remembered relative to the feet, so a held shadow follows the
           figure if it moves while its body is hidden */
        if (items) items.push({ tex: sp.texture, ax: sp.anchor.x, ay: sp.anchor.y,
          m: new Matrix(M.a, M.b, M.c, M.d, M.tx - px, M.ty - py) });
      }
      if (placed) {
        if (items) this._held.set(cs.key, { t: now, items });
        st.casters++; st.pieces += placed; st.keys.push(cs.key);
        if (cs.key === 'self') st.self = { px, py, pieces: placed, held: false, standIns: cs.standIns || 0 };
        if (st.list.length < 16) st.list.push({ key: cs.key, px, py, pieces: placed });
        continue;
      }
      /* nothing visible: hold the last shadow for a moment if the owner is
         still here (see HOLD_MS) */
      const h = cs.alive ? this._held.get(cs.key) : null;
      if (h && now - h.t < HOLD_MS) {
        for (let i = 0; i < h.items.length; i++) {
          const it = h.items[i];
          if (!usableTexture(it.tex)) continue;
          M.set(it.m.a, it.m.b, it.m.c, it.m.d, it.m.tx + px, it.m.ty + py);
          this._place(it.tex, it.ax, it.ay, M, P);
          st.pieces++;
        }
        st.casters++; st.held++; st.keys.push(cs.key);
        if (cs.key === 'self') st.self = { px, py, pieces: h.items.length, held: true };
      } else if (h) {
        this._held.delete(cs.key);
      }
    }
    for (let i = this.used; i < this.pool.length; i++) {
      if (this.pool[i].visible) this.pool[i].visible = false;
    }
    for (let i = this.meshUsed; i < this.meshPool.length; i++) {
      if (this.meshPool[i].visible) this.meshPool[i].visible = false;
    }
    for (let i = 0; i < this._pieceList.length; i++) {
      const m = this._pieceList[i];
      if (m.used !== this._frame && m.mesh.visible) m.mesh.visible = false;
    }
    if (!this.used && !this.meshUsed) {
      if (this.layer.filters) this.layer.filters = null;
      if (this.shade && this.shade.visible) this.shade.visible = false;   /* v2.3.3408 */
      st.prepass = false;
      return;
    }
    this._drawShade(Math.max(0, Math.min(1, light.alpha * fade)), light.color >>> 0);
    /* forget figures that have been gone longer than the hold */
    if (this._held.size > casters.length + 8) {
      for (const [k, h] of this._held) if (now - h.t > HOLD_MS) this._held.delete(k);
    }
  }

  /* ═══ v2.3.3408: THE PIECES DRAWN BEFORE THE FRAME (the header) ═══
     Into `rt`: the screen's size in CSS px plus PAD a side, at resolution 1
     (one texel a CSS px, as the filter's picture), cleared, the pieces drawn
     moved back by the camera's fraction of a pixel (`castIn`, the lock below)
     with the world's transform plus PAD -- so each lands on the same phase of
     the same grid as in the filter's picture, whose corner is a whole CSS px.
     Then the shade's quad over the screen reads it back by that fraction
     (uShift).
     Runs at the end of update: the last world pass, after the camera and
     every figure have moved (pixiRenderer), right before the frame is drawn.
     The world's transform is the world container's own (the stage stays at
     the identity, as lockToWorldGrid has always assumed).  False when it
     cannot (no renderer, a screen of no size); a throw gives up on it for
     the visit (`_preOk`): the filter, as before. */
  _prepass(alpha, col) {
    const r = this.renderer, root = this.root;
    if (!r || r.destroyed || !root) return false;
    const scr = r.screen;
    const W = Math.ceil(scr.width) + 2 * PAD, H = Math.ceil(scr.height) + 2 * PAD;
    if (!(W > 2 * PAD + 1 && H > 2 * PAD + 1)) return false;
    try {
      if (!this.rt) this.rt = RenderTexture.create({ width: W, height: H, resolution: 1, antialias: false, label: 'bt-shadow-pieces' });
      else if (this.rt.width !== W || this.rt.height !== H) this.rt.resize(W, H, 1);
      root.updateLocalTransform();
      const m = root.localTransform;
      const lock = lockOn();
      const fx = lock ? m.tx - Math.floor(m.tx) : 0, fy = lock ? m.ty - Math.floor(m.ty) : 0;
      /* lockToWorldGrid's own numbers, on the pieces' parent (see castIn) */
      const kx = root.scale.x || 1, ky = root.scale.y || 1;
      const lx = -fx / kx, ly = -fy / ky;
      if (this.castIn.x !== lx || this.castIn.y !== ly) this.castIn.position.set(lx, ly);
      this._T.set(m.a, m.b, m.c, m.d, m.tx + PAD, m.ty + PAD);
      r.render({ container: this.cast, target: this.rt, clear: true, transform: this._T });
      /* the shade only over what the pieces cover, as the filter was drawn
         over its layer's bounds on the screen: their bounds, onto the
         picture's texels, out by the reach of the soft edge and the slide
         (the shade is nothing further out, so the picture is the same; the
         rest of the screen costs no fill) */
      const b = this.castIn.getLocalBounds();
      let rx0 = 0, ry0 = 0, rx1 = 0, ry1 = 0;
      if (b.maxX > b.minX && b.maxY > b.minY) {
        const T = this._T;
        const ax = b.minX + lx, bx = b.maxX + lx, ay = b.minY + ly, by = b.maxY + ly;
        const xs0 = T.a * ax + T.c * ay, xs1 = T.a * bx + T.c * ay, xs2 = T.a * ax + T.c * by, xs3 = T.a * bx + T.c * by;
        const ys0 = T.b * ax + T.d * ay, ys1 = T.b * bx + T.d * ay, ys2 = T.b * ax + T.d * by, ys3 = T.b * bx + T.d * by;
        rx0 = Math.max(0, Math.floor(Math.min(xs0, xs1, xs2, xs3) + T.tx) - SHADE_REACH);
        rx1 = Math.min(W, Math.ceil(Math.max(xs0, xs1, xs2, xs3) + T.tx) + SHADE_REACH);
        ry0 = Math.max(0, Math.floor(Math.min(ys0, ys1, ys2, ys3) + T.ty) - SHADE_REACH);
        ry1 = Math.min(H, Math.ceil(Math.max(ys0, ys1, ys2, ys3) + T.ty) + SHADE_REACH);
      }
      const q = this._shadeQuad(W, H, rx0, ry0, rx1, ry1);
      q.setFromMatrix(this._I.copyFrom(m).invert());
      const u = q.shader.resources.shadeUniforms.uniforms;
      u.uAlpha = alpha;
      u.uColor[0] = ((col >> 16) & 255) / 255;
      u.uColor[1] = ((col >> 8) & 255) / 255;
      u.uColor[2] = (col & 255) / 255;
      u.uShift[0] = fx; u.uShift[1] = fy;
      const on = rx1 > rx0 && ry1 > ry0;   /* none on the screen: nothing to shade */
      if (q.visible !== on) q.visible = on;
      if (this.layer.x !== 0 || this.layer.y !== 0) this.layer.position.set(0, 0);
      if (lock) {
        const L = this.stats.lock || (this.stats.lock = { fx: 0, fy: 0 });
        L.fx = fx; L.fy = fy;
      } else {
        this.stats.lock = null;
      }
      return true;
    } catch (e) {
      this._preFails++;
      this._preOk = false;
      if (this.shade) this.shade.visible = false;
      /* Pixi carries its masks' and targets' state from one render to the
         next (renderHeal.js): put it back, so the frame after is drawn */
      try { healAfterRenderThrow(r); } catch (e2) { /* never */ }
      try { console.error('[shadows] the pieces could not be drawn before the frame; the filter instead', e && e.message); } catch (e2) { /* never */ }
      return false;
    }
  }

  /* v2.3.3408: this frame's pieces made into the shade -- drawn before the
     frame and read back by the shade's quad (the header), or, where that
     cannot be done, through the filter in the middle of the frame as before.
     `_last` keeps what it was given, for _redraw. */
  _drawShade(alpha, col) {
    const L = this._last || (this._last = { alpha: 0, col: 0 });
    L.alpha = alpha; L.col = col;
    this.stats.prepass = this._homeIsCast && this._prepass(alpha, col);
    if (this.stats.prepass) return;
    if (this._homeIsCast) this._rehome();   /* it gave up: the pieces to the layer */
    if (!this.filter) this.filter = makeShadowFilter();
    const u = this.filter.resources.shadowUniforms.uniforms;
    u.uAlpha = alpha;
    u.uColor[0] = ((col >> 16) & 255) / 255;
    u.uColor[1] = ((col >> 8) & 255) / 255;
    u.uColor[2] = (col & 255) / 255;
    if (!this.layer.filters || this.layer.filters[0] !== this.filter) this.layer.filters = [this.filter];
    this.lockToWorldGrid(u);
  }

  /* QA (window.__btShadowPrepass.redraw): this frame's pieces made into the
     shade again, the way the switch now says, for the world where it stands
     now -- the same pieces, no update (a held frame drawn both ways) */
  _redraw() {
    if (!this._last || !(this.used || this.meshUsed)) return false;
    this._rehome();
    this._drawShade(this._last.alpha, this._last.col);
    return true;
  }

  /* the shade's quad: laid in screen CSS px over the texels (x0, y0)-(x1,
     y1) of the picture (W x H, its corner PAD px off the screen's), with
     those texels' coordinates; made once, its corners written in place */
  _shadeQuad(W, H, x0, y0, x1, y1) {
    let q = this.shade;
    if (!q) {
      const uni = new UniformGroup({
        uInputSize: { value: new Float32Array([W, H, 1 / W, 1 / H]), type: 'vec4<f32>' },
        uAlpha: { value: 0.3, type: 'f32' },
        uColor: { value: new Float32Array([0, 0, 0]), type: 'vec3<f32>' },
        uSoft: { value: 0.5, type: 'f32' },   /* the filter's own */
        uShift: { value: new Float32Array([0, 0]), type: 'vec2<f32>' },
      });
      const geometry = new MeshGeometry({
        positions: new Float32Array(8),
        uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
        indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
      });
      const shader = new Shader({ glProgram: shadeProgram(), resources: { uTexture: this.rt.source, shadeUniforms: uni } });
      q = this.shade = new Mesh({ geometry, shader });
      q.label = 'shadowShade';
      q._btW = 0; q._btH = 0;
      this.layer.addChild(q);
    }
    if (q._btW !== W || q._btH !== H) {
      const z = q.shader.resources.shadeUniforms.uniforms.uInputSize;
      z[0] = W; z[1] = H; z[2] = 1 / W; z[3] = 1 / H;
      q._btW = W; q._btH = H;
      q._btR = null;
    }
    const R = q._btR;
    if (!R || R[0] !== x0 || R[1] !== y0 || R[2] !== x1 || R[3] !== y1) {
      const g = q.geometry, P = g.positions, U = g.uvs;
      P[0] = x0 - PAD; P[1] = y0 - PAD; P[2] = x1 - PAD; P[3] = y0 - PAD;
      P[4] = x1 - PAD; P[5] = y1 - PAD; P[6] = x0 - PAD; P[7] = y1 - PAD;
      U[0] = x0 / W; U[1] = y0 / H; U[2] = x1 / W; U[3] = y0 / H;
      U[4] = x1 / W; U[5] = y1 / H; U[6] = x0 / W; U[7] = y1 / H;
      g.getBuffer('aPosition').update();
      g.getBuffer('aUV').update();
      q._btR = [x0, y0, x1, y1];
      this.stats.shadeArea = (x1 - x0) * (y1 - y0) / (W * H);
    }
    return q;
  }

  /* ═══ v2.3.3149: DRAWN AT A WHOLE PIXEL OF ITS OWN GRID (the header) ═══
     The world's container sits at the camera's position, a fraction of a CSS
     px off the filter's grid (one texel a CSS px at its resolution of 1).  The
     layer is moved back by that fraction, so the pieces land at the same
     phase of the grid every frame and only ever move by whole texels; the
     filter reads its picture the same fraction back (uShift), a linear sample
     between two texels -- so on screen the shadows are exactly where the
     world is, gliding with it.  Called every frame the layer is drawn: the
     camera has set the world's place for this frame before the light runs
     (pixiRenderer). */
  lockToWorldGrid(u) {
    const sh = u.uShift;
    const root = this.root;
    if (!lockOn() || !root) {
      if (this.layer.x !== 0 || this.layer.y !== 0) this.layer.position.set(0, 0);
      sh[0] = 0; sh[1] = 0;
      this.stats.lock = null;
      return;
    }
    const res = typeof this.filter.resolution === 'number' && this.filter.resolution > 0 ? this.filter.resolution : 1;
    const fx = root.x - Math.floor(root.x * res) / res, fy = root.y - Math.floor(root.y * res) / res;
    const kx = root.scale.x || 1, ky = root.scale.y || 1;
    this.layer.position.set(-fx / kx, -fy / ky);
    sh[0] = fx; sh[1] = fy;
    const L = this.stats.lock || (this.stats.lock = { fx: 0, fy: 0 });
    L.fx = fx; L.fy = fy;
  }
}
