/* ═══ v2.3.3190: PICTURES KEPT AS COLOUR NUMBERS, COLOURED ON THE GPU ═══
 *
 * Owner, 2026-10-12: "Could you recreate byte for byte everything using pure
 * code instead of needing to load assets in memory?"  Not that: a picture
 * made by code costs the graphics chip exactly what a loaded one does (four
 * bytes a pixel, the grid it draws from), and the Wheel's ground is made by
 * code already and still takes ~34 MB there.  What does work, offered and
 * answered "Yes": the Wheel's ground and its objects are drawn on 256
 * colours or fewer each (the art law, docs/WORLD-BIBLE.md §6: each swatch
 * and object on 64 of its own), so each pixel can be kept as ONE byte -- its
 * colour's number -- and a few lines on the graphics chip look the colour up
 * as it draws.  The same picture, a quarter of the memory.
 *
 * WHAT IS KEPT WHERE
 *   a picture   an R8 texture (one byte a pixel), its rows padded to a
 *               multiple of 4 bytes (WebGL's row alignment) with copies of
 *               each row's last pixel -- so its right edge reads what the
 *               picture's own edge reads (clamp to edge)
 *   its colours one row of ONE shared 256 x 256 RGBA texture (the atlas,
 *               256 KB): entry k is colour k.  Premultiplied where the
 *               picture is (the objects, see-through round them), straight
 *               where it is not (the ground, opaque)
 *
 * HOW IT IS DRAWN.  Pixi's sprites and small meshes are drawn by its batcher,
 * a texture lookup each pixel.  This adds a second batcher, PAL_BATCHER, used
 * by exactly the sprites and meshes whose texture is one of these (picked by
 * the texture where Pixi hands each to its batcher, below, so nothing
 * that draws an object's picture -- the object, its shadow column by column,
 * a mirrored copy -- needs telling).  Its shader is Pixi's own batch shader
 * (positions, colours, round-pixels, the formShade corners: packQuadAttributes
 * is DefaultBatcher's) with the lookup replaced:
 *
 *   the four texels round the point, read as numbers (texelFetch), the four
 *   colours looked up, and blended with the weights the chip's own smooth
 *   (linear) sampling uses -- the same arithmetic, done in the shader (and
 *   where the four numbers are one, that colour looked up once: BLEND).
 *
 * The chip's own blend is fixed-function, with its own rounding, so where
 * four DIFFERENT colours meet a pixel can come out one level (of 255) apart
 * from the old way; inside a patch of one colour it is the same colour,
 * exactly.  `mp-palette` measures the difference on a phone screen, frame for
 * frame against `?nopalette` (the old way, still all there).
 *
 * The texture's slot and its colours' row ride in the vertex's texture id
 * (id + 16 x row; Pixi's is 16 bits), and every batch binds the atlas in the
 * slot after the last of its 15 pictures -- so pictures with different
 * colours still share one draw call, as they did.
 *
 * NOT HERE: anything that is not WebGL2, or `?nopalette` in the address --
 * then everything is uploaded at four bytes a pixel, exactly as before (and
 * the ground worker is never asked for numbers).  Pictures read on the CPU at
 * their own size (a hit's chips, a burn mark, a shatter's shards) read the
 * numbers through drawSourceRect (paletteDraw.js), never `source.resource`,
 * which is numbers; a shadow's base, read by SCALING a frame down, is read off
 * the sheet's own <img> as its page loads (wheelObjects.js readPageBottoms --
 * a browser scales an <img> and a canvas of the same pixels differently).
 *
 * MEASURED (mp-palette, a phone at dpr 3 against `?nopalette` at the same
 * spot): BroTown's arrival 104 -> 72 MB of GPU textures and 156 -> 125 MB of
 * asset cache; on screen 0.03% of the pixels one level of 255 apart, none
 * more.  mp-membudget's highest readings: GPU 132.5 -> 95 MB, art 172.4 ->
 * 147.8 MB, the page's buffers +8.7 MB (the sheets' numbers, kept for the CPU
 * readers above and to upload again: a quarter of the picture the asset
 * cache held).
 *
 * COST: eight small reads a pixel where the chip did one smooth one (two
 * where the four numbers are one), and an object's batch ends where it meets
 * a sprite drawn the other way (a few more draw calls a frame).  mp-palette
 * times the whole frame, drawn and finished, on its software chip, the other
 * page held still, three runs: BroTown's arrival 20-27% longer than the
 * old way, the water among the trees 14-21%, and 40 / 32 and 76 / 55 draw
 * calls.  A software chip does every read in code; what a phone's chip
 * spends is not measured here (on a phone, `?nopalette` is the comparison).
 *
 * Probe: window.__btPalette().
 */
import { BatcherPipe, DefaultBatcher, ExtensionType, extensions, BufferImageSource, Texture, Sprite, MeshSimple, GlProgram, Shader, UniformGroup, SpritePipe, MeshPipe, GlMeshAdaptor, Container, Matrix, glUploadBufferImageResource } from 'pixi.js';
import { setWheelPalette } from '../game/wheelTrial.js';
import { isPaletteSource } from './paletteDraw.js';
export { isPaletteSource, drawSourceRect, paletteRegionRGBA } from './paletteDraw.js';

export const PAL_BATCHER = 'bt-palette';
const SLOTS = 15;                       /* pictures a batch; the atlas is the 16th unit */
const ATLAS_W = 256, ATLAS_ROWS = 256;

/* ── the switch ── */
function wantedByAddress() {
  try { return !/(^|[?&])nopalette(=|&|$)/.test(window.location.search || ''); } catch (e) { return true; }
}
const _wanted = wantedByAddress();
let _renderer = null;
let _ok = null;              /* null: not built; true: built and linked; false: this device cannot */
/* made / freed: palette sources; rowsFull: pictures drawn the old way for
   want of an atlas row; pieces / pages: ground pieces and object pages kept
   as numbers, piecesRgba / pagesRgba the ones that went as colours (over 256
   colours, or a file that did not read), expanded: pieces sent as numbers
   turned back into colours here; pieceColours(Max): the last and most
   colours a piece had */
const _stats = {
  made: 0, freed: 0, rowsFull: 0, prewarmed: false, linkError: null,
  pieces: 0, piecesRgba: 0, pieceColours: 0, pieceColoursMax: 0, expanded: 0, pages: 0, pagesRgba: 0,
};
const _live = new Set();     /* every palette source alive: the probe counts them */

/** `?nopalette` in the address: everything at four bytes a pixel, as before. */
export function paletteWanted() { return _wanted; }
function webgl2(r) { return !!(r && r.gl && r.context && r.context.webGLVersion === 2); }
/** Draw pictures as colour numbers here: wanted, WebGL2, and the program built. */
export function paletteOn() { return _wanted && _ok === true && webgl2(_renderer); }
export function paletteStats() { return _stats; }

/* ── the atlas: every picture's colours, a row each ── */
let _atlas = null;
function atlas() {
  if (_atlas && !_atlas.source.destroyed) return _atlas;
  const data = new Uint8Array(ATLAS_W * ATLAS_ROWS * 4);
  const source = new BufferImageSource({
    resource: data, width: ATLAS_W, height: ATLAS_ROWS,
    format: 'rgba8unorm', scaleMode: 'nearest', alphaMode: 'premultiplied-alpha', label: 'bt-palette-atlas',
  });
  _atlas = { data, source, free: [], next: 0, used: 0 };
  return _atlas;
}
export function paletteAtlasSource() { return atlas().source; }
function takeRow(rgba) {
  const A = atlas();
  const row = A.free.length ? A.free.pop() : (A.next < ATLAS_ROWS ? A.next++ : -1);
  if (row < 0) { _stats.rowsFull++; return -1; }
  const o = row * ATLAS_W * 4;
  A.data.fill(0, o, o + ATLAS_W * 4);
  A.data.set(rgba.subarray(0, Math.min(rgba.length, ATLAS_W * 4)), o);
  A.used++;
  A.source.update();
  return row;
}
function giveRow(row) {
  if (!_atlas || row < 0) return;
  _atlas.free.push(row);
  _atlas.used--;
}

/* the 4-byte row a picture's width needs (WebGL unpacks rows 4-aligned) */
export function paletteStride(w) { return (w + 3) & ~3; }

/**
 * A texture source of colour numbers: `idx` (stride bytes a row, h rows),
 * `w` x `h` the picture, `rgba` its colours (4 bytes each, up to 256).
 * `alphaMode` as the picture would have had ('no-premultiply-alpha' for the
 * opaque ground, 'premultiplied-alpha' for the objects -- their colours
 * already premultiplied), so the blend is the one it always was.  Null when
 * the atlas is full: the caller then draws it the old way.
 */
export function makePaletteSource({ idx, w, h, stride, rgba, alphaMode, label, autoGarbageCollect = false }) {
  const st = stride || paletteStride(w);
  const row = takeRow(rgba);
  if (row < 0) return null;
  const src = new BufferImageSource({
    resource: idx, width: st, height: h,
    format: 'r8unorm', scaleMode: 'linear', alphaMode: alphaMode || 'premultiplied-alpha',
    label: label || 'bt-palette', autoGarbageCollect,
  });
  src._btPal = { row, w, h, stride: st, rgba };
  _live.add(src);
  _stats.made++;
  src.once('destroy', () => {
    _live.delete(src);
    _stats.freed++;
    giveRow(row);
    /* its numbers let go of from both of a source's holds: Pixi keeps the
       constructor's options whole (wheelGround.js letGoOfColours, v2.3.3076),
       and a destroyed source something still points at would keep them */
    if (src.options) src.options.resource = null;
    src._btPal = null;
  });
  return src;
}

/* ═══ THE BATCHER ═══ */

const VERT = `#version 300 es
in vec2 aPosition;
in vec2 aUV;
in vec4 aColor;
in vec2 aTextureIdAndRound;
out vec4 vColor;
out vec2 vUV;
flat out float vTextureId;
flat out float vPalRow;
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
    /* v2.3.3190: the slot and the colours' row, packed as slot + 16 x row */
    float tid = aTextureIdAndRound.y;
    vPalRow = floor(tid / 16.0 + 0.001);
    vTextureId = tid - vPalRow * 16.0;
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

/* the four numbers round uv in picture `t` (constant index: GLSL ES 3.00
   indexes sampler arrays by constants only) */
function pick(t) {
  return `{
        highp ivec2 sz = textureSize(uTextures[${t}], 0);
        highp vec2 tc = uv * vec2(sz) - 0.5;
        highp vec2 fl = floor(tc);
        f = tc - fl;
        highp ivec2 mx = sz - 1;
        highp ivec2 a = clamp(ivec2(fl), ivec2(0), mx);
        highp ivec2 b = clamp(ivec2(fl) + 1, ivec2(0), mx);
        n00 = texelFetch(uTextures[${t}], a, 0).r;
        n10 = texelFetch(uTextures[${t}], ivec2(b.x, a.y), 0).r;
        n01 = texelFetch(uTextures[${t}], ivec2(a.x, b.y), 0).r;
        n11 = texelFetch(uTextures[${t}], b, 0).r;
    }`;
}
function chain() {
  const out = [];
  for (let t = 0; t < SLOTS; t++) {
    if (t > 0) out.push('else');
    if (t < SLOTS - 1) out.push(`if (vTextureId < ${t}.5)`);
    out.push(pick(t));
  }
  return out.join('\n');
}
/* the four colours blended as the chip's smooth sampling blends them -- or,
   where the four numbers are one (the see-through round every object, a flat
   patch), that colour, read once: the blend of four equal colours IS that
   colour, as the chip's own filtering gives it, so no pixel changes, and three
   of the four lookups are saved where most of an object's quad is clear */
const BLEND = `    highp vec4 c;
    if (n00 == n10 && n00 == n01 && n00 == n11) c = colourOf(n00, row);
    else c = mix(mix(colourOf(n00, row), colourOf(n10, row), f.x),
                 mix(colourOf(n01, row), colourOf(n11, row), f.x), f.y);`;
/* (vUV keeps the default float precision -- mediump, as Pixi's own batch
   shader reads it -- so the point sampled is the point the old way sampled;
   the arithmetic after it is highp, as the chip's own filtering is exact) */
const FRAG = `#version 300 es
in vec4 vColor;
in vec2 vUV;
flat in float vTextureId;
flat in float vPalRow;
out vec4 finalColor;
uniform highp sampler2D uTextures[${SLOTS}];
uniform highp sampler2D uPalAtlas;
highp vec4 colourOf(highp float n, highp int row)
{
    return texelFetch(uPalAtlas, ivec2(int(n * 255.0 + 0.5), row), 0);
}
void main(void) {
    highp vec2 uv = vUV;
    highp vec2 f = vec2(0.0);
    highp float n00 = 0.0, n10 = 0.0, n01 = 0.0, n11 = 0.0;
${chain()}
    highp int row = int(vPalRow + 0.5);
${BLEND}
    vec4 outColor = c;
    finalColor = outColor * vColor;
}
`;

let _batchShader = null;
function batchShader() {
  if (_batchShader) return _batchShader;
  const units = new Int32Array(SLOTS);
  for (let i = 0; i < SLOTS; i++) units[i] = i;
  _batchShader = new Shader({
    glProgram: GlProgram.from({ vertex: VERT, fragment: FRAG, name: 'bt-palette-batch' }),
    resources: {
      paletteSamplers: new UniformGroup({
        uTextures: { value: units, type: 'i32', size: SLOTS },
        uPalAtlas: { value: SLOTS, type: 'i32' },
      }, { isStatic: true }),
    },
  });
  return _batchShader;
}

/* the slot and the colours' row, in the vertex's 16-bit texture id */
function packedId(el, slot) {
  const src = el.texture && el.texture._source;
  const row = src && src._btPal ? src._btPal.row : 0;
  return (((slot + 16 * row) << 16) | (el.roundPixels & 65535)) >>> 0;
}

class PaletteBatcher extends DefaultBatcher {
  constructor() {
    super({ maxTextures: SLOTS });
    this.name = PAL_BATCHER;
    this.shader = batchShader();
  }
  packQuadAttributes(el, f32, u32, idx, slot) {
    /* DefaultBatcher's -- and so formShade's corners (formShade.js patches it) */
    super.packQuadAttributes(el, f32, u32, idx, slot);
    const v = packedId(el, slot);
    u32[idx + 5] = v; u32[idx + 11] = v; u32[idx + 17] = v; u32[idx + 23] = v;
  }
  packAttributes(el, f32, u32, idx, slot) {
    super.packAttributes(el, f32, u32, idx, slot);
    const v = packedId(el, slot);
    for (let i = 0, n = el.attributeSize; i < n; i++) u32[idx + i * 6 + 5] = v;
  }
  /* every batch: its pictures in slots 0.., the empty texture in any left,
     the atlas in the slot after (GlBatchAdaptor binds slot i to unit i) */
  _finishBatch(batch, indexStart, indexSize, textureBatch, blendMode, topology, instructionSet, action, elements) {
    const empty = Texture.EMPTY.source;
    for (let k = textureBatch.count; k < SLOTS; k++) textureBatch.textures[k] = empty;
    textureBatch.textures[SLOTS] = atlas().source;
    textureBatch.count = SLOTS + 1;
    super._finishBatch(batch, indexStart, indexSize, textureBatch, blendMode, topology, instructionSet, action, elements);
  }
  /* (one shader for every batcher of this kind: never Pixi's to resize) */
  _updateMaxTextures() {}
  destroy() {
    this.shader = null;
    super.destroy();
  }
}
PaletteBatcher.extension = { type: [ExtensionType.Batcher], name: PAL_BATCHER };
extensions.add(PaletteBatcher);

/* ═══ WHICH BATCHER DRAWS A SPRITE OR A MESH: BY ITS TEXTURE ═══
   Decided where every batchable meets the batcher (BatcherPipe.addToBatch),
   which is also where sharpPixels.js sends a figure's quads to its 'sharp'
   batcher: that wraps this (it is installed later, after app.init), so it
   decides first and this has the last word -- a picture kept as numbers can
   be drawn by nothing else.  A texture swapped to or from one of these
   rebuilds the frame's draw list (validateRenderable true), as a swap to a
   texture outside the batch already does; only a swap ACROSS that line does
   (a figure's every frame is a swap, and must not rebuild). */
const palTex = (tex) => !!(tex && tex._source && tex._source._btPal && !tex._source.destroyed);
let _patched = false;
function patchPipes() {
  if (_patched) return;
  _patched = true;
  {
    const P = BatcherPipe.prototype;
    const add = P.addToBatch;
    P.addToBatch = function (obj, instructionSet) {
      if (obj) {
        if (palTex(obj.texture)) obj.batcherName = PAL_BATCHER;
        else if (obj.batcherName === PAL_BATCHER) obj.batcherName = 'default';
      }
      return add.call(this, obj, instructionSet);
    };
  }
  {
    const P = SpritePipe.prototype;
    const valid = P.validateRenderable;
    P.validateRenderable = function (sprite) {
      const b = this._getGpuSprite(sprite);
      if ((b.batcherName === PAL_BATCHER) !== palTex(sprite._texture)) return true;
      return valid.call(this, sprite);
    };
  }
  {
    const P = MeshPipe.prototype;
    const valid = P.validateRenderable;
    P.validateRenderable = function (mesh) {
      const md = this._getMeshData(mesh);
      if (md.batched && mesh.batched) {
        const b = this._getBatchableMesh(mesh);
        if ((b.batcherName === PAL_BATCHER) !== palTex(mesh._texture)) return true;
      }
      return valid.call(this, mesh);
    };
  }
  /* ═══ UPLOADED AT ITS SIZE IN PIXELS ═══
     Pixi uploads a buffer at the source's width and height in POINTS -- its
     pixels over its resolution -- which is right only at resolution 1.  An
     object page is resolution 2 (its sheet's meta.scale, as the picture it
     was), so it went up as a quarter of itself read with half its rows'
     length: every row sheared (the first phone picture of this, every
     building in diagonal streaks).  One of these is uploaded at its pixels;
     every other buffer exactly as Pixi does it. */
  {
    const U = glUploadBufferImageResource;
    const up = U.upload;
    U.upload = function (source, glTexture, gl, webGLVersion, targetOverride, forceAllocation = false) {
      if (!source || !source._btPal) return up.call(this, source, glTexture, gl, webGLVersion, targetOverride, forceAllocation);
      const target = targetOverride || glTexture.target;
      const w = source.pixelWidth, h = source.pixelHeight;
      if (!forceAllocation && glTexture.width === w && glTexture.height === h) {
        gl.texSubImage2D(target, 0, 0, 0, w, h, glTexture.format, glTexture.type, source.resource);
      } else {
        gl.texImage2D(target, 0, glTexture.internalFormat, w, h, 0, glTexture.format, glTexture.type, source.resource);
      }
      glTexture.width = w;
      glTexture.height = h;
    };
  }
  /* a mesh too big to batch (over 100 points) is drawn on its own by
     GlMeshAdaptor's shader: one of these is drawn by its palette twin */
  {
    const P = GlMeshAdaptor.prototype;
    const exec = P.execute;
    P.execute = function (meshPipe, mesh) {
      if (!mesh._shader && mesh.texture && isPaletteSource(mesh.texture.source)) return paletteMeshExecute(meshPipe, mesh);
      return exec.call(this, meshPipe, mesh);
    };
  }
}
patchPipes();

/* ── the unbatched mesh (Pixi's mesh shader, the lookup replaced) ── */
const MESH_VERT = `#version 300 es
in vec2 aPosition;
in vec2 aUV;
out vec4 vColor;
out vec2 vUV;
uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform vec4 uWorldColorAlpha;
uniform vec2 uResolution;
uniform mat3 uTransformMatrix;
uniform vec4 uColor;
uniform float uRound;
uniform mat3 uTextureMatrix;
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
    vColor *= uColor;
    modelMatrix = uTransformMatrix;
    uv = (uTextureMatrix * vec3(uv, 1.0)).xy;
    vUV = uv;
    mat3 modelViewProjectionMatrix = uProjectionMatrix * worldTransformMatrix * modelMatrix;
    gl_Position = vec4((modelViewProjectionMatrix * vec3(position, 1.0)).xy, 0.0, 1.0);
    vColor *= uWorldColorAlpha;
    if(uRound == 1.)
    {
        gl_Position.xy = roundPixels(gl_Position.xy, uResolution);
    }
}
`;
const MESH_FRAG = `#version 300 es
in vec4 vColor;
in vec2 vUV;
out vec4 finalColor;
uniform highp sampler2D uTexture;
uniform highp sampler2D uPalAtlas;
uniform highp float uPalRow;
highp vec4 colourOf(highp float n, highp int row)
{
    return texelFetch(uPalAtlas, ivec2(int(n * 255.0 + 0.5), row), 0);
}
void main(void) {
    highp vec2 uv = vUV;
    highp vec2 f = vec2(0.0);
    highp float n00 = 0.0, n10 = 0.0, n01 = 0.0, n11 = 0.0;
    {
        highp ivec2 sz = textureSize(uTexture, 0);
        highp vec2 tc = uv * vec2(sz) - 0.5;
        highp vec2 fl = floor(tc);
        f = tc - fl;
        highp ivec2 mx = sz - 1;
        highp ivec2 a = clamp(ivec2(fl), ivec2(0), mx);
        highp ivec2 b = clamp(ivec2(fl) + 1, ivec2(0), mx);
        n00 = texelFetch(uTexture, a, 0).r;
        n10 = texelFetch(uTexture, ivec2(b.x, a.y), 0).r;
        n01 = texelFetch(uTexture, ivec2(a.x, b.y), 0).r;
        n11 = texelFetch(uTexture, b, 0).r;
    }
    highp int row = int(uPalRow + 0.5);
${BLEND}
    vec4 outColor = c;
    finalColor = outColor * vColor;
}
`;
let _meshShader = null;
function meshShader() {
  if (_meshShader) return _meshShader;
  _meshShader = new Shader({
    glProgram: GlProgram.from({ vertex: MESH_VERT, fragment: MESH_FRAG, name: 'bt-palette-mesh' }),
    resources: {
      uTexture: Texture.EMPTY.source,
      uPalAtlas: Texture.EMPTY.source,
      textureUniforms: { uTextureMatrix: { type: 'mat3x3<f32>', value: new Matrix() } },
      paletteUniforms: { uPalRow: { type: 'f32', value: 0 } },
    },
  });
  return _meshShader;
}
function paletteMeshExecute(meshPipe, mesh) {
  const renderer = meshPipe.renderer;
  const shader = meshShader();
  const texture = mesh.texture, source = texture.source;
  shader.resources.uTexture = source;
  shader.resources.uSampler = source.style;
  shader.resources.uPalAtlas = atlas().source;
  shader.resources.textureUniforms.uniforms.uTextureMatrix = texture.textureMatrix.mapCoord;
  shader.resources.paletteUniforms.uniforms.uPalRow = source._btPal.row;
  shader.groups[100] = renderer.globalUniforms.bindGroup;
  shader.groups[101] = meshPipe.localUniformsBindGroup;
  renderer.encoder.draw({ geometry: mesh._geometry, shader, state: mesh.state });
}

/* ═══ BUILT BEHIND THE LOADING SCREEN ═══
   A program is compiled the first time it is drawn (the v2.3.2904 rule), so
   one tiny palette sprite and one unbatched palette mesh are drawn, nearly
   see-through, as the renderer is made -- behind the loading screen -- and
   whether both linked says whether this device draws pictures as numbers. */
function programLinked(r, program) {
  try {
    const gl = r && r.gl;
    const pd = r && r.shader && typeof r.shader._getProgramData === 'function' ? r.shader._getProgramData(program) : null;
    if (!gl || !pd || !pd.program) return false;
    return !!gl.getProgramParameter(pd.program, gl.LINK_STATUS);
  } catch (e) { return false; }
}

/** The renderer, as it is made (pixiRenderer.js): builds the programs here,
 *  and says whether pictures are drawn as numbers. */
export function setPaletteRenderer(r) {
  _renderer = r || null;
  _ok = null;
  if (!_wanted || !webgl2(_renderer)) { _ok = false; setWheelPalette(false); return false; }
  let box = null, src = null, mesh = null;
  try {
    src = makePaletteSource({
      idx: new Uint8Array([1, 1, 1, 1]), w: 1, h: 1, stride: 4,
      rgba: new Uint8Array([0, 0, 0, 0, 255, 255, 255, 255]), alphaMode: 'premultiplied-alpha', label: 'bt-palette-prewarm',
    });
    if (!src) throw new Error('no atlas row');
    const tex = new Texture({ source: src });
    box = new Container();
    const s = new Sprite(tex);
    s.width = 2; s.height = 2;
    box.addChild(s);
    /* 101 points: too many to batch, so drawn by the mesh twin */
    const n = 101;
    const v = new Float32Array(n * 2), uv = new Float32Array(n * 2), ix = new Uint32Array((n - 2) * 3);
    for (let i = 0; i < n; i++) { v[i * 2] = (i % 2) * 2; v[i * 2 + 1] = Math.floor(i / 2) * 0.02; uv[i * 2] = i % 2; uv[i * 2 + 1] = 0.5; }
    for (let i = 0; i < n - 2; i++) ix.set([i, i + 1, i + 2], i * 3);
    mesh = new MeshSimple({ texture: tex, vertices: v, uvs: uv, indices: ix });
    box.addChild(mesh);
    box.alpha = 0.001;
    _renderer.render({ container: box });
    _ok = programLinked(_renderer, batchShader().glProgram) && programLinked(_renderer, meshShader().glProgram);
  } catch (e) {
    _ok = false;
    _stats.linkError = String((e && e.message) || e);
  }
  if (!_ok && !_stats.linkError) _stats.linkError = 'the palette programs did not build on this device';
  /* the Wheel's ground worker, started later, sends pieces as numbers only
     where they are drawn so (a worker already running keeps what it was told:
     a piece it sends as numbers that this cannot draw is turned back into
     colours, wheelGround.js _source) */
  setWheelPalette(paletteOn());
  const geo = mesh && mesh.geometry;
  try { if (box) box.destroy({ children: true }); } catch (e) { /* gone */ }
  try { if (geo) geo.destroy(true); } catch (e) { /* gone */ }
  try { if (src) src.destroy(); } catch (e) { /* gone */ }
  _stats.prewarmed = true;
  return _ok;
}

/* QA probe, house style */
if (typeof window !== 'undefined') {
  window.__btPalette = () => {
    let bytes = 0, n = 0, pieces = 0, pages = 0, farm = 0, farmBytes = 0;
    for (const s of _live) {
      if (s.destroyed || !s._btPal) continue;
      n++;
      const b = s._btPal.stride * s._btPal.h;
      bytes += b;
      /* v2.3.3451: the farm's own (paletteLoad.js) -- its ground, its
         pictures and its copies of the sheets' pages (`?farm=1`) */
      if (/[?&]farm=1|\/world\/farm\/|\/maps\/farm_/.test(s.label)) { farm++; farmBytes += b; }
      else if (/^wheel-ground/.test(s.label)) pieces++;
      else if (/world\/objects\//.test(s.label)) pages++;
    }
    return { ..._stats, on: paletteOn(), wanted: _wanted, ok: _ok, webgl2: webgl2(_renderer),
      live: n, livePieces: pieces, livePages: pages, liveMB: +(bytes / 1048576).toFixed(2),
      liveFarm: farm, liveFarmMB: +(farmBytes / 1048576).toFixed(2),
      rowsUsed: _atlas ? _atlas.used : 0, rowsMax: ATLAS_ROWS };
  };
}
