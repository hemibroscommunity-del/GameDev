/* ═══ v2.3.3716: THE BODY KEPT ONCE, COLOURED ON THE GRAPHICS CHIP BY ITS LOOK ═══
 *
 * The owner: "The game needs to be extremely memory efficient."  Every look --
 * a skin, trousers, boots, an eye colour -- gets its own recoloured copy of the
 * body's sheets today (playerSkins.js recolorBodyToCanvas): a phone with
 * twenty differently dressed players on it holds twenty copies of the walking
 * body, ~5.8 MB on the graphics chip each, and the old path never lets one go.
 * This keeps each stand and jog sheet ONCE, as colour numbers, and colours it
 * as it is drawn: a look is one ROW of role colours (1 KB) in paletteTex.js's
 * atlas, freed when no one has worn it for a while.
 *
 * ON by default since the owner's word (below); `?lookpalette=0` in the
 * address is the old path, exactly as before, for that page.  The plan for the rest -- every pose, the shirts,
 * the armour and the body under it, the head pieces -- is
 * docs/specs/look-palette.md.
 *
 * WHAT A SHEET IS (tools/art/role-bake.mjs makes them, public/sprites/look/):
 * one RG8 texture (two bytes a texel):
 *   rows [0, n)   a 16-bit colour NUMBER a texel: the jog sheets one a DISPLAY
 *                 texel (ds 1, laid out cell for cell as the old path's packed
 *                 sheet), the stand sheets one a SOURCE pixel, four to a display
 *                 texel (ds 2: the old path shrinks the 256 stand art by a 2x2
 *                 box -- measured, Chromium's 'high' halving IS that box), so
 *                 the four are coloured and averaged here as the canvas did;
 *   then          its TABLE, two texels an entry: the art's own colour,
 *                 straight (r, g | b, a), entries sorted by ROLE;
 *   last row      its header: ds, n, the table's first row, and where each
 *                 role's entries end.
 * The ROLES (the bake decides them by running the game's own recolour):
 *   0 keep, 1 skin, 2 trousers, 3 boots, 4-7 an iris over roles 0-3.
 * A LOOK'S ROW: entry 1 the skin's target, 2 the trousers', 3 the boots', 4
 * the eye's, each (r, g, b, 255) or all 0 for "as drawn".  The shader is
 * recolorBodyToCanvas's own arithmetic: min(255, round(target x luminance /
 * ref)) with the refs 149 / 112 / 75, the iris replaced by the eye colour, the
 * result premultiplied as the canvas keeps it.
 *
 * HOW IT IS SAMPLED: the body is drawn with sharpPixels.js's "sharp" read (or
 * Pixi's plain one, `?sharp=0`) from a mipmapped texture.  A texture of
 * numbers cannot be filtered by the chip, so the shader does it: the four
 * display texels round the point, each coloured, blended with the chip's own
 * weights; minified, the mip chain's first level (a 2x2 box of display
 * texels, which is what the chip's own mipmaps are) and the blend between
 * them.  Below half size it stays on that level (the chip would go deeper):
 * docs/specs/look-palette.md.
 *
 * DRAWN BY ITS OWN BATCHER, LOOK_BATCHER, routed by the texture as
 * paletteTex.js routes its own (BatcherPipe.addToBatch, inside sharpPixels'
 * hook): the slot, the look's row and the sharp flag ride in the vertex's
 * texture id (slot + 16 x (2 x (row + 1) + sharp)).  Every batch binds the
 * atlas after its pictures.
 *
 * Probe: window.__btLookPalette().
 */
import { BatcherPipe, DefaultBatcher, ExtensionType, extensions, BufferImageSource, Texture, Rectangle, Sprite, Container, GlProgram, Shader, UniformGroup, SpritePipe, glUploadBufferImageResource } from 'pixi.js';
import { paletteAtlasSource, takePaletteRow, givePaletteRow, paletteRendererOf } from './paletteTex.js';
import { clientOff } from '../game/clientOff.js';   /* v2.3.3716: the Test panel's live off switch (lane D's clientOff.js) */

export const LOOK_BATCHER = 'bt-look';
const SLOTS = 4;                  /* sheets a batch (a figure draws one); the atlas is the unit after */
const LOOK_POSES = Object.freeze({ stand: true, jog: true });
const IDLE_MS = 30000;            /* a look no one drew for this long gives its row back */
const SWEEP_MS = 5000;

/* ── the switch ── */
/* v2.3.3716: ON by default -- the owner, 2026-10-28: "I think including the
   new memory change work by default would be better. I can always revert the
   change if I don't like it or it doesn't work well."  `?lookpalette=0` is the
   old path, for one page. */
function wantedByAddress() {
  try { return !/(^|[?&])lookpalette=0(&|$)/.test(window.location.search || ''); } catch (e) { return true; }
}
const _wanted = wantedByAddress();
/** The body's stand and jog drawn from the numbers (`?lookpalette=0`: not). */
export function lookPaletteWanted() { return _wanted; }

let _manifest = null;             /* roles.json */
const _sheets = Object.create(null);   /* 'jog-east' -> { src, frames: [{frame, trim}], ds } */
let _loading = null;
let _ok = null;                   /* the program: null not tried, true linked, false not here */
const _stats = { sheets: 0, sheetBytes: 0, looksMade: 0, looksFreed: 0, rowsFull: 0, linkError: null, loadError: null, drawn: 0 };

function webgl2(r) { return !!(r && r.gl && r.context && r.context.webGLVersion === 2); }
/** Drawn from the numbers here: wanted, the sheets in, WebGL2, the program not refused. */
export function lookPaletteOn() {
  /* clientOff: "Characters coloured on the chip" off for every phone, live,
     from the Test panel -- the body is then drawn the old way (a copy baked
     for each look on first sight, as before) */
  return _wanted && _ok !== false && _stats.sheets > 0 && webgl2(paletteRendererOf()) && !clientOff('lookpalette');
}
/** This pose has sheets of numbers (stand, jog). */
export function lookPose(pose) { return !!LOOK_POSES[pose]; }

/* ═══ THE SHEETS ═══ */
function loadPng(url) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error('no ' + url));
    im.src = url;
  });
}
function buildSheet(name, m, img) {
  const W = m.w, n = m.h, T = m.tableRows;
  if (img.naturalWidth !== W || img.naturalHeight !== n + T) throw new Error(name + ': ' + img.naturalWidth + 'x' + img.naturalHeight);
  /* the header goes in the last row, and the stand's texture (resolution 2)
     is an even number of rows */
  let rows = n + T + 1;
  if (m.ds === 2 && (rows & 1)) rows++;
  /* every pixel's red and green are a texel's two bytes (the PNG is opaque,
     so they decode exactly) -- made again from the <img> whenever the chip
     needs them (lookUpload: the bytes are let go of once uploaded) */
  const make = () => {
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = n + T;
    const g = cv.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    const px = g.getImageData(0, 0, W, n + T).data;
    cv.width = 0; cv.height = 0;   /* Safari: hand the backing store back now */
    const out = new Uint8Array(W * rows * 2);
    for (let q = 0, o = 0; q < W * (n + T); q++, o += 2) { out[o] = px[q * 4]; out[o + 1] = px[q * 4 + 1]; }
    const head = [m.ds, n, n, ...m.ends];
    const h0 = (rows - 1) * W * 2;
    head.forEach((v, i) => { out[h0 + i * 2] = v & 255; out[h0 + i * 2 + 1] = (v >> 8) & 255; });
    return out;
  };
  const data = make();
  const src = new BufferImageSource({
    resource: data, width: W / m.ds, height: rows / m.ds, resolution: m.ds,
    format: 'rg8unorm', scaleMode: 'nearest', alphaMode: 'premultiplied-alpha',
    autoGenerateMipmaps: false, autoGarbageCollect: false, label: 'bt-look:' + name,
  });
  src._btLook = { ds: m.ds, w: W, rows, make };
  const frames = m.cells.map(([ax, ay, tx, ty, w, h], i) => {
    const r = { i, n: m.cells.length };
    /* in display texels, which are the source's points (a ds 2 sheet is
       resolution 2): the old path's own cells */
    if (tx < 0) r.frame = new Rectangle(ax, ay, w, h);
    else { r.frame = new Rectangle(ax, ay, w, h); r.orig = new Rectangle(0, 0, 128, 128); r.trim = new Rectangle(tx, ty, w, h); }
    return r;
  });
  _sheets[name] = { src, frames, ds: m.ds };
  _stats.sheets++;
  _stats.sheetBytes += data.length;
}
/** The sheets, behind the loading screen (playerSkins.preloadBodyAll awaits
 *  this) -- and the program built there once a renderer exists.  Resolves
 *  whatever happens: a failure leaves the body on the old path. */
export function preloadLookSheets() {
  if (!_wanted) return Promise.resolve(false);
  prewarmProgram();
  if (_loading) return _loading;
  _loading = (async () => {
    try {
      const v = 'v2.3.3716';
      const res = await fetch('/sprites/look/roles.json?v=' + v);
      if (!res.ok) throw new Error('roles.json ' + res.status);
      _manifest = await res.json();
      await Promise.all(Object.keys(_manifest.sheets).map(async (name) => {
        const img = await loadPng('/sprites/look/' + name + '.png?v=' + v + '.' + _manifest.sheets[name].art);
        buildSheet(name, _manifest.sheets[name], img);
      }));
      prewarmProgram();
      return true;
    } catch (e) {
      _stats.loadError = String((e && e.message) || e);
      for (const k of Object.keys(_sheets)) { try { _sheets[k].src.destroy(); } catch (er) { /* gone */ } delete _sheets[k]; }
      _stats.sheets = 0;
      return false;
    }
  })();
  return _loading;
}

/* ═══ THE LOOKS ═══ */
const _looks = new Map();          /* key -> look */
const tkey = (t) => (t ? t[0] + ',' + t[1] + ',' + t[2] : '-');
function lookRow(look) {
  const rgba = new Uint8Array(256 * 4);
  [look.skin, look.pants, look.shoes, look.eye].forEach((t, i) => {
    if (t) rgba.set([t[0], t[1], t[2], 255], (i + 1) * 4);
  });
  return rgba;
}
let _sweepAt = 0;
function sweep(now) {
  if (now < _sweepAt) return;
  _sweepAt = now + SWEEP_MS;
  for (const [k, look] of _looks) {
    if (now - look.used < IDLE_MS) continue;
    /* a sprite still holding one of its textures (a player off screen, not
       drawn) draws the art's own colours until it is given a frame again:
       the row may already be another look's */
    look.row = -1;
    givePaletteRow(look.rowHeld);
    /* its frames let go of the sheet (a Texture listens to its source's
       resize, so one dropped without this stays reachable from the sheet
       forever: a look a player who passed by) -- the sheet itself stays */
    for (const k of Object.keys(look.tex)) for (const t of look.tex[k]) { try { t.destroy(false); } catch (e) { /* gone */ } }
    look.tex = Object.create(null);
    look.rowHeld = -1;
    _looks.delete(k);
    _stats.looksFreed++;
  }
}
/**
 * The frame of a stand or jog sheet drawn in this look, or null (the switch
 * off, the sheets not in, the look the art's own, or no atlas row free: the
 * caller draws the old way).  Targets as playerSkins resolves them ([r, g, b]
 * or null), the eye's only on a sheet with an eye.
 */
export function getLookFrame(pose, dir, frameIdx, skinT, pantsT, shoesT, eyeT) {
  if (!lookPaletteOn() || !LOOK_POSES[pose]) return null;
  if (_ok === null) prewarmProgram();   /* not built behind the loading screen (no renderer then): now */
  if (!skinT && !pantsT && !shoesT && !eyeT) return null;
  const sh = _sheets[pose + '-' + dir];
  if (!sh) return null;
  const key = tkey(skinT) + '/' + tkey(pantsT) + '/' + tkey(shoesT) + '/' + tkey(eyeT);
  const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  let look = _looks.get(key);
  if (!look) {
    look = { key, skin: skinT, pants: pantsT, shoes: shoesT, eye: eyeT, row: -1, rowHeld: -1, used: now, tex: Object.create(null) };
    const row = takePaletteRow(lookRow(look));
    if (row < 0) { _stats.rowsFull++; return null; }
    look.row = row; look.rowHeld = row;
    _looks.set(key, look);
    _stats.looksMade++;
  }
  look.used = now;
  sweep(now);
  const name = pose + '-' + dir;
  let list = look.tex[name];
  if (!list) {
    list = look.tex[name] = sh.frames.map((f) => {
      const t = new Texture({ source: sh.src, frame: f.frame, orig: f.orig, trim: f.trim });
      t._btLook = look;
      t.__btIx = f.i; t.__btN = f.n;
      return t;
    });
  }
  return list[((frameIdx % list.length) + list.length) % list.length];
}

/* ═══ THE SHADER ═══ */
const VERT = `#version 300 es
in vec2 aPosition;
in vec2 aUV;
in vec4 aColor;
in vec2 aTextureIdAndRound;
out vec4 vColor;
out vec2 vUV;
flat out float vTextureId;
flat out float vLook;
flat out float vSharp;
uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform vec4 uWorldColorAlpha;
uniform vec2 uResolution;
vec2 roundPixels(vec2 position, vec2 targetSize)
{
    return (floor(((position * 0.5 + 0.5) * targetSize) + 0.5) / targetSize) * 2.0 - 1.0;
}
void main(void){
    mat3 worldTransformMatrix = uWorldTransformMatrix;
    mat3 modelMatrix = mat3(
        1.0, 0.0, 0.0,
        0.0, 1.0, 0.0,
        0.0, 0.0, 1.0
      );
    vec2 position = aPosition;
    vec2 uv = aUV;
    vColor = vec4(1.);
    vColor *= vec4(aColor.rgb * aColor.a, aColor.a);
    /* v2.3.3716: slot + 16 x (2 x look + sharp), look = the row + 1 (0: as drawn) */
    float tid = aTextureIdAndRound.y;
    float code = floor(tid / 16.0 + 0.001);
    vTextureId = tid - code * 16.0;
    vLook = floor(code / 2.0 + 0.001);
    vSharp = code - vLook * 2.0;
    vUV = uv;
    mat3 modelViewProjectionMatrix = uProjectionMatrix * worldTransformMatrix * modelMatrix;
    gl_Position = vec4((modelViewProjectionMatrix * vec3(position, 1.0)).xy, 0.0, 1.0);
    vColor *= uWorldColorAlpha;
    if(aTextureIdAndRound.x == 1.)
    {
        gl_Position.xy = roundPixels(gl_Position.xy, uResolution);
    }
}
`;

/* ONE copy of the reading below, whichever slot the sprite's sheet is in:
   GLSL ES 3.00 picks a sampler of an array by a constant only, so a chain of
   SLOTS reads is the one place the slot is chosen (fetchT), and every other
   line is written once.  (The first cut wrapped the whole reading in the
   chain, as Pixi's own batch shader does its one read: fifteen inlined copies
   of it, and the software chip this box draws with spent minutes building the
   program behind the loading screen.) */
function fetchChain(fn) {
  const out = [];
  for (let t = 0; t < SLOTS; t++) {
    if (t < SLOTS - 1) out.push(`    ${t > 0 ? 'else ' : ''}if (vTextureId < ${t}.5) return ${fn(t)};`);
    else out.push(`    return ${fn(t)};`);
  }
  return out.join('\n');
}
const FRAG = `#version 300 es
in vec4 vColor;
in vec2 vUV;
flat in float vTextureId;
flat in float vLook;
flat in float vSharp;
out vec4 finalColor;
uniform highp sampler2D uTextures[${SLOTS}];
uniform highp sampler2D uPalAtlas;
highp vec4 fetchT(highp ivec2 p)
{
${fetchChain((t) => `texelFetch(uTextures[${t}], p, 0)`)}
}
highp ivec2 sizeT()
{
${fetchChain((t) => `textureSize(uTextures[${t}], 0)`)}
}
highp int num(highp ivec2 p)
{
    highp vec2 v = fetchT(p).rg;
    return int(v.r * 255.0 + 0.5) + 256 * int(v.g * 255.0 + 0.5);
}
/* the sheet (its header, the last row) and the look (its row), read once a pixel */
highp int sDs, sN, sW, sT0;
highp int sE[8];
highp ivec2 sDisp;
highp vec4 lT[5];
void readSheet()
{
    highp ivec2 sz = sizeT();
    highp int hy = sz.y - 1;
    sDs = num(ivec2(0, hy));
    sN = num(ivec2(1, hy));
    sT0 = num(ivec2(2, hy));
    for (int r = 0; r < 8; r++) sE[r] = num(ivec2(3 + r, hy));
    sW = sz.x;
    sDisp = ivec2(sz.x / sDs, sN / sDs);
}
/* entry k's colour in this look, premultiplied, 0..255 as the canvas kept it:
   recolorBodyToCanvas's _retint, and the iris painted after it */
highp vec4 entry(highp int k)
{
    if (k == 0) return vec4(0.0);
    highp int t = 2 * k;
    highp ivec2 p = ivec2(t % sW, sT0 + t / sW);
    highp vec4 c = floor(vec4(fetchT(p).rg, fetchT(p + ivec2(1, 0)).rg) * 255.0 + 0.5);
    highp int role = 0;
    for (int r = 0; r < 7; r++) if (k >= sE[r]) role = r + 1;
    highp int base = role >= 4 ? role - 4 : role;
    if (role >= 4 && lT[4].a > 0.5) c.rgb = lT[4].rgb;
    else if (base > 0) {
        highp vec4 T = base == 1 ? lT[1] : (base == 2 ? lT[2] : lT[3]);
        if (T.a > 0.5) {
            highp float ref = base == 1 ? 149.0 : (base == 2 ? 112.0 : 75.0);
            highp float lum = (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / ref;
            c.rgb = min(vec3(255.0), floor(T.rgb * lum + 0.5));
        }
    }
    return vec4(floor(c.rgb * c.a / 255.0 + 0.5), c.a);
}
/* a display texel: level 0 of the old texture (the stand's: its 2x2 box) */
highp vec4 dispTexel(highp ivec2 q)
{
    q = clamp(q, ivec2(0), sDisp - 1);
    if (sDs == 1) return entry(num(q));
    highp ivec2 o = q * 2;
    highp int k0 = num(o);
    highp vec4 sum = vec4(0.0);
    bool same = true;
    for (int i = 1; i < 4; i++) {
        highp int k = num(o + ivec2(i & 1, i >> 1));
        if (k != k0) same = false;
        sum += entry(k);
    }
    if (same) return entry(k0);
    /* the canvas's 'high' halving: the box of the premultiplied bytes,
       truncated (measured in Chromium) */
    return floor((sum + entry(k0)) / 4.0);
}
/* a texel of the mip chain's first level: a 2x2 box of display texels */
highp vec4 mipTexel(highp ivec2 q)
{
    q = clamp(q, ivec2(0), (sDisp + 1) / 2 - 1);
    highp vec4 sum = vec4(0.0);
    for (int i = 0; i < 4; i++) sum += dispTexel(q * 2 + ivec2(i & 1, i >> 1));
    return floor(sum / 4.0 + 0.5);
}
highp vec4 bilinear(highp vec2 P, bool level1)
{
    highp vec2 tc = (level1 ? P * 0.5 : P) - 0.5;
    highp vec2 fl = floor(tc);
    highp vec2 f = tc - fl;
    highp ivec2 a = ivec2(fl);
    highp vec4 c[4];
    if (!level1 && sDs == 1) {
        /* the four numbers first: one colour where they are one (most of a
           figure's quad is see-through round it) */
        highp int k[4];
        for (int i = 0; i < 4; i++) k[i] = num(clamp(a + ivec2(i & 1, i >> 1), ivec2(0), sDisp - 1));
        if (k[0] == k[1] && k[0] == k[2] && k[0] == k[3]) return entry(k[0]);
        for (int i = 0; i < 4; i++) c[i] = entry(k[i]);
    } else {
        for (int i = 0; i < 4; i++) c[i] = level1 ? mipTexel(a + ivec2(i & 1, i >> 1)) : dispTexel(a + ivec2(i & 1, i >> 1));
    }
    return mix(mix(c[0], c[1], f.x), mix(c[2], c[3], f.x), f.y);
}
void main(void) {
    highp vec2 dx = dFdx(vUV);
    highp vec2 dy = dFdy(vUV);
    highp int row = int(vLook + 0.5) - 1;
    for (int i = 0; i < 5; i++) lT[i] = row >= 0 ? floor(texelFetch(uPalAtlas, ivec2(i, row), 0) * 255.0 + 0.5) : vec4(0.0);
    readSheet();
    /* the body as the chip drew it: sharpPixels.js's sharpSample (or Pixi's
       plain read) on a mipmapped texture, done by hand on the coloured texels */
    highp vec2 ts = vec2(sizeT()) / float(sDs);   /* in display texels */
    highp vec2 px = vUV * ts;
    highp vec2 P = px;
    if (vSharp > 0.5) {
        highp vec2 tpp = vec2(length(vec2(dx.x, dy.x)), length(vec2(dx.y, dy.y))) * ts;
        highp vec2 scale = 1.0 / max(tpp, vec2(1e-4));
        highp vec2 base = floor(px - 0.5) + 0.5;
        highp vec2 f = clamp((px - base - 0.5) * scale + 0.5, 0.0, 1.0);
        P = mix(px, base + f, step(1.0, min(scale.x, scale.y)));
    }
    highp float rho = max(length(dx * ts), length(dy * ts));
    highp float lod = log2(max(rho, 1e-6));
    highp vec4 c = bilinear(P, false);
    if (lod > 0.0) c = mix(c, bilinear(P, true), min(lod, 1.0));
    finalColor = (c / 255.0) * vColor;
}
`;

let _shader = null;
function lookShader() {
  if (_shader) return _shader;
  const units = new Int32Array(SLOTS);
  for (let i = 0; i < SLOTS; i++) units[i] = i;
  _shader = new Shader({
    glProgram: GlProgram.from({ vertex: VERT, fragment: FRAG, name: 'bt-look-batch' }),
    resources: {
      lookSamplers: new UniformGroup({
        uTextures: { value: units, type: 'i32', size: SLOTS },
        uPalAtlas: { value: SLOTS, type: 'i32' },
      }, { isStatic: true }),
    },
  });
  return _shader;
}

function packedId(el, slot) {
  const t = el.texture;
  const look = t && t._btLook;
  const lk = look && look.row >= 0 ? look.row + 1 : 0;
  return (((slot + 16 * (lk * 2 + (el._btLookSharp ? 1 : 0))) << 16) | (el.roundPixels & 65535)) >>> 0;
}
class LookBatcher extends DefaultBatcher {
  constructor() {
    super({ maxTextures: SLOTS });
    this.name = LOOK_BATCHER;
    this.shader = lookShader();
  }
  packQuadAttributes(el, f32, u32, idx, slot) {
    super.packQuadAttributes(el, f32, u32, idx, slot);
    const v = packedId(el, slot);
    u32[idx + 5] = v; u32[idx + 11] = v; u32[idx + 17] = v; u32[idx + 23] = v;
    _stats.drawn++;
  }
  packAttributes(el, f32, u32, idx, slot) {
    super.packAttributes(el, f32, u32, idx, slot);
    const v = packedId(el, slot);
    for (let i = 0, n = el.attributeSize; i < n; i++) u32[idx + i * 6 + 5] = v;
  }
  _finishBatch(batch, indexStart, indexSize, textureBatch, blendMode, topology, instructionSet, action, elements) {
    const empty = Texture.EMPTY.source;
    for (let k = textureBatch.count; k < SLOTS; k++) textureBatch.textures[k] = empty;
    textureBatch.textures[SLOTS] = paletteAtlasSource();
    textureBatch.count = SLOTS + 1;
    super._finishBatch(batch, indexStart, indexSize, textureBatch, blendMode, topology, instructionSet, action, elements);
  }
  _updateMaxTextures() {}
  destroy() {
    this.shader = null;
    super.destroy();
  }
}
LookBatcher.extension = { type: [ExtensionType.Batcher], name: LOOK_BATCHER };

/* ═══ WHICH BATCHER: BY THE TEXTURE (not with `?lookpalette=0`) ═══
   Inside sharpPixels' hook (installed at app.init, after this) and outside
   paletteTex's: sharp decides 'sharp' or 'default' first, this sends a look's
   texture here (keeping which read sharp chose), and paletteTex's routing
   leaves a name it does not know alone. */
const lookTex = (tex) => !!(tex && tex._source && tex._source._btLook && !tex._source.destroyed);
let _patched = false;
function patchPipes() {
  if (_patched) return;
  _patched = true;
  extensions.add(LookBatcher);
  {
    const P = BatcherPipe.prototype;
    const add = P.addToBatch;
    P.addToBatch = function (obj, instructionSet) {
      if (obj) {
        if (lookTex(obj.texture)) {
          if (obj.batcherName !== LOOK_BATCHER) obj._btLookSharp = obj.batcherName !== 'default';
          obj.batcherName = LOOK_BATCHER;
        } else if (obj.batcherName === LOOK_BATCHER) obj.batcherName = 'default';
      }
      return add.call(this, obj, instructionSet);
    };
  }
  {
    const P = SpritePipe.prototype;
    const valid = P.validateRenderable;
    P.validateRenderable = function (sprite) {
      const b = this._getGpuSprite(sprite);
      if ((b.batcherName === LOOK_BATCHER) !== lookTex(sprite._texture)) return true;
      return valid.call(this, sprite);
    };
  }
  /* uploaded at its size in pixels (Pixi uses points; the stand's are
     resolution 2), as paletteTex.js does for its own */
  {
    const U = glUploadBufferImageResource;
    const up = U.upload;
    U.upload = function (source, glTexture, gl, webGLVersion, targetOverride, forceAllocation = false) {
      if (!source || !source._btLook) return up.call(this, source, glTexture, gl, webGLVersion, targetOverride, forceAllocation);
      const target = targetOverride || glTexture.target;
      const w = source.pixelWidth, h = source.pixelHeight;
      /* v2.3.3716 (the owner put this on by default): the bytes are let go of
         once on the chip, as the Wheel's ground lets go of its colours
         (wheelGround.js _toGpu) -- 2.6 MB the page would keep for good, over
         the memory check's buffers line -- and made again from the sheet's
         <img> for the rare second upload (a rebuilt renderer after a black
         screen).  The decoded <img> is the browser's to drop and decode
         again. */
      const res = source.resource || source._btLook.make();
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 2);
      if (!forceAllocation && glTexture.width === w && glTexture.height === h) {
        gl.texSubImage2D(target, 0, 0, 0, w, h, glTexture.format, glTexture.type, res);
      } else {
        gl.texImage2D(target, 0, glTexture.internalFormat, w, h, 0, glTexture.format, glTexture.type, res);
      }
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
      glTexture.width = w;
      glTexture.height = h;
      source.resource = null;
      if (source.options) source.options.resource = null;
    };
  }
}

/* at load, so this hook is inside sharpPixels' (installed at app.init) */
if (_wanted) patchPipes();

function programLinked(r, program) {
  try {
    const gl = r && r.gl;
    const pd = r && r.shader && typeof r.shader._getProgramData === 'function' ? r.shader._getProgramData(program) : null;
    if (!gl || !pd || !pd.program) return false;
    return !!gl.getProgramParameter(pd.program, gl.LINK_STATUS);
  } catch (e) { return false; }
}
/* built behind the loading screen: one tiny look sprite drawn nearly
   see-through (the v2.3.2904 rule: a program is compiled where it is first
   drawn) */
let _prewarmedFor = null;
function prewarmProgram() {
  const r = paletteRendererOf();
  if (!_wanted || !r || _prewarmedFor === r || !_stats.sheets) return;
  if (!webgl2(r)) { _ok = false; return; }
  _prewarmedFor = r;
  /* every sheet on the chip now, behind the loading screen, and its bytes let
     go of (the upload, below): a sheet first drawn only when someone wears a
     look held its 2.6 MB in the page until then -- measured, the memory
     check's phone (the default look) read 23.0 MB of buffers at home against
     20.3 with `?lookpalette=0`.  As the Wheel's ground does (wheelGround.js
     _toGpu); a context that is lost uploads as it is first drawn instead. */
  try {
    const gl = r.gl;
    if (!(gl && typeof gl.isContextLost === 'function' && gl.isContextLost()) && r.texture && typeof r.texture.initSource === 'function') {
      for (const k of Object.keys(_sheets)) { try { r.texture.initSource(_sheets[k].src); } catch (e) { /* drawn the usual way */ } }
    }
  } catch (e) { /* drawn the usual way */ }
  let box = null;
  try {
    const name = Object.keys(_sheets)[0];
    const t = getLookFrameRaw(name);
    box = new Container();
    const s = new Sprite(t);
    s.width = 2; s.height = 2;
    box.addChild(s);
    box.alpha = 0.001;
    r.render({ container: box });
    _ok = programLinked(r, lookShader().glProgram);
  } catch (e) {
    _ok = false;
    _stats.linkError = String((e && e.message) || e);
  }
  if (!_ok && !_stats.linkError) _stats.linkError = 'the look program did not build on this device';
  try { if (box) box.destroy({ children: true }); } catch (e) { /* gone */ }
}
/* a sheet's first frame, in the art's own colours (the prewarm, QA) */
function getLookFrameRaw(name) {
  const sh = _sheets[name];
  const f = sh.frames[0];
  return new Texture({ source: sh.src, frame: f.frame, orig: f.orig, trim: f.trim });
}

/* QA probe, house style */
if (typeof window !== 'undefined') {
  window.__btLookPalette = () => {
    let rows = 0;
    for (const l of _looks.values()) if (l.row >= 0) rows++;
    return { wanted: _wanted, on: lookPaletteOn(), ok: _ok, renderer: !!paletteRendererOf(), prewarmed: !!_prewarmedFor, ..._stats, looks: _looks.size, rows,
      sheetMB: +(_stats.sheetBytes / 1048576).toFixed(2), manifest: _manifest ? _manifest.version : null };
  };
}
