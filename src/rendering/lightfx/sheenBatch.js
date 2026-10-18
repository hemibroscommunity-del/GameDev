/* ═══ v2.3.3375: THE METAL SHINE IS DRAWN IN THE FRAME, NOT IN A PASS A PIECE ═══
 *
 * The owner, 2026-10-18: "iterate on what best improves framerate without
 * loss of quality (or negligible loss) for phone gameplay (iPhone, android)".
 *
 * Since v2.3.2887 every piece of metal on screen -- a sword, a torso,
 * greaves, on you and on everyone else -- shines, and each did it through a
 * FILTER of its own (glint.js): the piece drawn into a picture of its own,
 * the shine worked out over that picture, the result drawn back.  A filter is
 * a render pass: the graphics chip stops drawing the frame, draws the piece
 * somewhere else and comes back.  On a phone's chip (tile-based: every iPhone,
 * most Androids) that means the frame so far written out of the chip's own
 * memory and read back in, for each piece, every frame -- three for a player
 * in plate, greaves and a sword, dozens with a few armoured players about
 * (docs/specs/speed-test.md's list: "one filter pass a piece of metal, a
 * frame, for every armoured player on screen").
 *
 * So the ordinary shine -- the permanent sheen (v2.3.2864) on a piece with no
 * grade -- is worked out where the piece is drawn, by a batcher of its own:
 * the 'sharp' batcher's read of a figure's pixels (sharpPixels.js), then the
 * filter's own lines on the colour it drew (glint.js SHEEN_LIFT, one text for
 * both).  What the filter knew, each piece carries in its corners:
 *   - the box the filter laid its shine across: the piece's whole frame (a
 *     sprite's bounds are its `orig`, placed by its anchor) through its
 *     group's transform, then -- on the graphics chip, where the camera is --
 *     through the group's matrix, the box round it clipped to the screen and
 *     widened to whole device pixels, as Pixi's FilterSystem does
 *     (_calculateFilterArea, _calculateFilterBounds: fitBounds, scale, ceil);
 *   - the figure's frame inside it (uFig), the metal's shine colour and the
 *     sheen's strength, the sun's side, and the tint it is drawn with.
 *
 * THE SAME PICTURE, TO A LEVEL.  The filter read its piece back from an 8-bit
 * picture; here the colour is used as drawn, unrounded, so a pixel of metal
 * can come out a level (of 255) apart.  mp-sheenbatch draws one held frame
 * both ways and counts them.
 *
 * STILL A PASS OF ITS OWN (glint.js decides): a piece wearing a GRADE (its
 * edge needs the pixels round it, which only a picture of its own has), a
 * pinned sweep (QA), a piece the sharp batcher would not draw, a sprite some
 * other effect filters -- and every piece with `?sheenpass` in the address.
 * Probe: window.__btSheenBatch().
 */
import {
  DefaultBatcher, ExtensionType, extensions, Shader, GlProgram, Geometry, Buffer, BufferUsage,
  compileHighShaderGl, compileHighShaderGpuProgram, vertexGlTemplate, fragmentGlTemplate,
  globalUniformsBitGl, colorBitGl, colorBit, roundPixelsBitGl, roundPixelsBit, generateTextureBatchBit,
  getBatchSamplersUniformGroup, getMaxTexturesPerBatch, Sprite, Texture,
} from 'pixi.js';
import { sharpTextureBitGl, sharpMaxTextures, setSheenBatcher } from '../sharpPixels.js';
import { SHEEN_LIFT } from './sheenLift.js';

export const SHEEN_BATCHER = 'sheen';
/* floats a vertex: Pixi's six (position, uv, colour, texture id and round)
   then the box (4), the figure (4), the shine (4), the sun (2), the tint (1) */
const VS = 21;

let _urlOff = false;
try { if (typeof location !== 'undefined' && /[?&]sheenpass(=|&|$)/.test(location.search || '')) _urlOff = true; } catch (e) { /* on */ }
let _passAll = false;   /* QA: window.__btSheenPass(true), every piece in a pass of its own */
let _built = false;     /* the program made (warmSheenBatch, behind the loading screen) */
let _packed = 0;        /* pieces packed */

/** Should the shine be drawn in the frame?  glint.js asks this once a frame. */
export function sheenBatchOn() {
  return !_urlOff && !_passAll && sharpMaxTextures() > 0
    && !(typeof window !== 'undefined' && window.__btSharpOff);
}

class SheenGeometry extends Geometry {
  constructor() {
    const attributeBuffer = new Buffer({
      data: new Float32Array(1), label: 'attribute-sheen-buffer',
      usage: BufferUsage.VERTEX | BufferUsage.COPY_DST, shrinkToFit: false,
    });
    const indexBuffer = new Buffer({
      data: new Uint32Array(1), label: 'index-sheen-buffer',
      usage: BufferUsage.INDEX | BufferUsage.COPY_DST, shrinkToFit: false,
    });
    const stride = VS * 4;
    super({
      attributes: {
        aPosition: { buffer: attributeBuffer, format: 'float32x2', stride, offset: 0 },
        aUV: { buffer: attributeBuffer, format: 'float32x2', stride, offset: 2 * 4 },
        aColor: { buffer: attributeBuffer, format: 'unorm8x4', stride, offset: 4 * 4 },
        aTextureIdAndRound: { buffer: attributeBuffer, format: 'uint16x2', stride, offset: 5 * 4 },
        aSheenBox: { buffer: attributeBuffer, format: 'float32x4', stride, offset: 6 * 4 },
        aSheenFig: { buffer: attributeBuffer, format: 'float32x4', stride, offset: 10 * 4 },
        aSheenColor: { buffer: attributeBuffer, format: 'float32x4', stride, offset: 14 * 4 },
        aSheenSun: { buffer: attributeBuffer, format: 'float32x2', stride, offset: 18 * 4 },
        aSheenTint: { buffer: attributeBuffer, format: 'unorm8x4', stride, offset: 20 * 4 },
      },
      indexBuffer,
    });
  }
}

/* The shine, GL flavour.  The vertex works out the filter's box from the
   piece's frame box (group space) through the group's matrix -- per vertex,
   as the camera moves the box without moving the piece in its group -- and
   where this corner lies in it (`p`, the filter's own 0-1 across its output
   frame, laid out linearly as the filter's quad was).  The fragment runs the
   filter's lines on the colour drawn. */
const sheenBitGl = {
  name: 'sheen-bit',
  vertex: {
    header: `
                in vec4 aSheenBox;
                in vec4 aSheenFig;
                in vec4 aSheenColor;
                in vec2 aSheenSun;
                in vec4 aSheenTint;
                out highp vec2 vSheenP;
                flat out vec4 vSheenFig;
                flat out vec4 vSheenColor;
                flat out vec2 vSheenSun;
                flat out vec3 vSheenTint;
            `,
    main: `
                {
                    /* the frame's box through the group's matrix, the box
                       round its four corners (Bounds.applyMatrix) */
                    vec2 c0 = (worldTransformMatrix * vec3(aSheenBox.xy, 1.0)).xy;
                    vec2 c1 = (worldTransformMatrix * vec3(aSheenBox.zy, 1.0)).xy;
                    vec2 c2 = (worldTransformMatrix * vec3(aSheenBox.xw, 1.0)).xy;
                    vec2 c3 = (worldTransformMatrix * vec3(aSheenBox.zw, 1.0)).xy;
                    vec2 lo = min(min(c0, c1), min(c2, c3));
                    vec2 hi = max(max(c0, c1), max(c2, c3));
                    /* the screen in CSS px off the projection, its pixels a
                       CSS px off the target's size: fitBounds to the screen,
                       then scale, ceil (min down, max up) and scale back */
                    vec2 view = vec2(2.0 / uProjectionMatrix[0][0], 2.0 / abs(uProjectionMatrix[1][1]));
                    float res = uResolution.x / view.x;
                    lo = max(lo, vec2(0.0));
                    hi = min(hi, view);
                    lo = floor(lo * res) / res;
                    hi = ceil(hi * res) / res;
                    vec2 g = (worldTransformMatrix * vec3(position, 1.0)).xy;
                    vSheenP = (g - lo) / max(hi - lo, vec2(1e-6));
                    vSheenFig = aSheenFig;
                    vSheenColor = aSheenColor;
                    vSheenSun = aSheenSun;
                    vSheenTint = aSheenTint.rgb;
                }
            `,
  },
  fragment: {
    header: `
                in highp vec2 vSheenP;
                flat in vec4 vSheenFig;
                flat in vec4 vSheenColor;
                flat in vec2 vSheenSun;
                flat in vec3 vSheenTint;
                /* the filter's names for what this batcher carries in its corners */
                #define uTint vSheenTint
                #define uFig vSheenFig
                #define uSun vSheenSun
                #define uSheen vSheenColor.a
                #define uColor vSheenColor.rgb
                const float SHEEN_CEIL = 0.92;
            `,
    end: `
                {
                    vec4 c = finalColor;
                    vec2 p = vSheenP;
${SHEEN_LIFT}
                    /* the sweep's band is the filter's (it is never drawn here) */
                    col = min(col, vec3(1.0));
                    finalColor = vec4(col * c.a, c.a);
                }
            `,
  },
};

let _shader = null;
function sheenShader(maxTextures) {
  if (_shader) return _shader;
  /* ES 3.00, as sharpPixels.js explains: textureSize / textureGrad, and
     `flat` */
  const src = compileHighShaderGl({
    template: { vertex: '#version 300 es\n' + vertexGlTemplate, fragment: '#version 300 es\n' + fragmentGlTemplate },
    bits: [globalUniformsBitGl, colorBitGl, sharpTextureBitGl(maxTextures), sheenBitGl, roundPixelsBitGl],
  });
  const glProgram = new GlProgram({ name: 'batch-sheen', ...src });
  /* WebGPU is never selected (pixiApp prefers webgl) */
  const gpuProgram = compileHighShaderGpuProgram({
    name: 'batch-sheen',
    bits: [colorBit, generateTextureBatchBit(maxTextures), roundPixelsBit],
  });
  _shader = new Shader({ glProgram, gpuProgram, resources: { batchSamplers: getBatchSamplersUniformGroup(maxTextures) } });
  _shader.maxTextures = maxTextures;
  return _shader;
}

/* Pixi's six floats of a quad's corner, packed once into these (formShade.js's
   corner colours included: it patches DefaultBatcher's packQuadAttributes),
   then copied out at this batcher's stride with the shine after them */
const _sf32 = new Float32Array(24);
const _su32 = new Uint32Array(_sf32.buffer);

class SheenBatcher extends DefaultBatcher {
  constructor(options) {
    const maxTextures = (options && options.maxTextures) || sharpMaxTextures() || getMaxTexturesPerBatch();
    super({ ...(options || {}), maxTextures });
    this.name = SHEEN_BATCHER;
    this.vertexSize = VS;
    /* its own vertex layout; the default one DefaultBatcher just made is let
       go (the batcher destroys only the geometry it ends with) */
    const made = this.geometry;
    this.geometry = new SheenGeometry();
    try { if (made) made.destroy(true); } catch (e) { /* never uploaded */ }
    this.shader = sheenShader(maxTextures);
  }

  packQuadAttributes(el, f32, u32, idx, tid) {
    DefaultBatcher.prototype.packQuadAttributes.call(this, el, _sf32, _su32, 0, tid);
    const r = el.renderable;
    const sh = r && r._btSheen;
    /* the frame's box in the group: the sprite's bounds (Sprite.updateBounds:
       its whole `orig`, placed by its anchor) through its group transform */
    const t = el.texture;
    const o = t && (t.orig || t.frame);
    const an = r && r.anchor;
    const ax = an ? an._x : 0, ay = an ? an._y : 0;
    const w = o ? o.width : 0, h = o ? o.height : 0;
    const x0 = -ax * w, y0 = -ay * h, x1 = x0 + w, y1 = y0 + h;
    const m = el.transform;
    const a = m.a, b = m.b, c = m.c, d = m.d, tx = m.tx, ty = m.ty;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let k = 0; k < 4; k++) {
      const x = (k & 1) ? x1 : x0, y = (k & 2) ? y1 : y0;
      const gx = a * x + c * y + tx, gy = b * x + d * y + ty;
      if (gx < minX) minX = gx;
      if (gx > maxX) maxX = gx;
      if (gy < minY) minY = gy;
      if (gy > maxY) maxY = gy;
    }
    const fig = sh ? sh.fig : null;
    const tint = sh ? sh.tintPacked : 0xffffffff;
    for (let v = 0; v < 4; v++) {
      const s = v * 6, q = idx + v * VS;
      f32[q] = _sf32[s];
      f32[q + 1] = _sf32[s + 1];
      f32[q + 2] = _sf32[s + 2];
      f32[q + 3] = _sf32[s + 3];
      u32[q + 4] = _su32[s + 4];
      u32[q + 5] = _su32[s + 5];
      f32[q + 6] = minX; f32[q + 7] = minY; f32[q + 8] = maxX; f32[q + 9] = maxY;
      f32[q + 10] = fig ? fig[0] : 0; f32[q + 11] = fig ? fig[1] : 0;
      f32[q + 12] = fig ? fig[2] : 0; f32[q + 13] = fig ? fig[3] : 0;
      f32[q + 14] = sh ? sh.r : 0; f32[q + 15] = sh ? sh.g : 0; f32[q + 16] = sh ? sh.b : 0;
      f32[q + 17] = sh ? sh.k : 0;
      f32[q + 18] = sh ? sh.sx : 0; f32[q + 19] = sh ? sh.sy : 0;
      u32[q + 20] = tint;
    }
    _packed++;
  }

  /* one shader for every batcher of this kind (sharpPixels' rule) */
  _updateMaxTextures() {}

  destroy() {
    this.shader = null;
    super.destroy();
  }
}
SheenBatcher.extension = { type: [ExtensionType.Batcher], name: SHEEN_BATCHER };

/* ═══ WHICH PIECES: THE ONES THE SHARP BATCHER WOULD DRAW ═══
   The sharp batcher's own routing (sharpPixels.js setSheenBatcher) sends a
   piece glint.js marked (`_btSheen.on`) here instead of to itself -- decided
   there, in the outermost hook, so no hook inside it can take the piece.
   Marking or unmarking a piece rebuilds its layer's draw list (glint.js), so
   the choice is made again for it. */
let _installed = false;
export function installSheenBatch() {
  if (_installed) return false;
  _installed = true;
  extensions.add(SheenBatcher);
  setSheenBatcher(SHEEN_BATCHER);
  return true;
}

/* Built behind the loading screen: a piece drawn through it once, so its
   program is compiled and linked before the first armoured player shows up
   (the animation-preload law, CLAUDE.md; glint.js prewarmGlintPipe does the
   filter's).  The sprite is marked as a figure piece (`_sharp`) so the sharp
   batcher takes it, and carries a shine, so this one does. */
export function warmSheenBatch(renderer) {
  if (!renderer || _built || !sheenBatchOn()) return false;
  let spr = null;
  try {
    spr = new Sprite(Texture.WHITE);
    spr.width = 8; spr.height = 8;
    spr.alpha = 0.001;
    spr._sharp = true;
    spr._btSheen = sheenParams(null);
    spr._btSheen.on = true;
    spr._btSheen.k = 1;
    renderer.render({ container: spr });
    _built = true;
  } catch (e) { _built = false; }
  try { if (spr) spr.destroy(); } catch (e) { /* best-effort */ }
  return _built;
}

/** Every piece in a pass of its own (true), as before v2.3.3375, or the
 *  ordinary ones drawn in the frame (false) -- for this page only: the
 *  Speed test's step (game/speedTest.js) and QA (window.__btSheenPass).
 *  glint.js re-routes the pieces on its next update. */
export function setSheenPass(on) { _passAll = !!on; }

/** A piece's shine as this batcher reads it (one object a sprite, reused). */
export function sheenParams(prev) {
  return prev || { on: false, r: 1, g: 1, b: 1, k: 0, sx: 0, sy: 0, fig: new Float32Array(4), tintPacked: 0xffffffff };
}

/* at load, as paletteTex.js registers its batcher */
if (!_urlOff) installSheenBatch();

if (typeof window !== 'undefined') {
  window.__btSheenBatch = () => ({ on: sheenBatchOn(), urlOff: _urlOff, passAll: _passAll, built: _built, packed: _packed });
  /* QA: every piece in a pass of its own (true) or drawn in the frame (false),
     this page -- glint.js re-routes them on its next update */
  window.__btSheenPass = (v) => setSheenPass(v);
}
