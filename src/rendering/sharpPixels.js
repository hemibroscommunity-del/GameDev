/* ═══ v2.3.2758: SHARP PIXELS ON THE CHARACTERS, AT NO MEMORY COST ═══
 *
 * Owner: "The character also looks soft compared to the art he's wearing like
 * sword or shirt.  That's probably a result of lower res textures to save
 * memory, but is there an enhancement you can do for that?"
 *
 * MEASURED (window.__btSelfSprites): the body and clothes are 128px textures
 * (DISPLAY_DS = 2, the v2.3.1408 memory fix for the iPhone OOM kills), drawn
 * at ~2.6 device pixels per texel on a 3x phone.  The GPU's linear filter
 * blends every texel into its neighbours across those 2.6 pixels, so the
 * artist's crisp outlines arrive as a soft ramp.  The sword is a 256px texture
 * at ~1.3x, which is why it reads sharper beside him.
 *
 * Doubling the textures back (DS = 1) is the one fix that costs memory, and it
 * is the exact memory the OOM fix bought back.  This spends none: it changes
 * how the same 128px texture is SAMPLED.  "Sharp bilinear" -- the standard
 * treatment for pixel art at a non-integer zoom -- keeps each texel a flat
 * square and blends only across a band one SCREEN pixel wide at the seam
 * between texels, instead of across the whole texel.  The result is the
 * artist's pixels, crisp, with a 1px anti-aliased edge -- no stair-step
 * shimmer when the figure moves by fractions of a pixel (the v2.3.1121 /
 * v2.3.1237 jog-shimmer reports are why nearest filtering is not the answer).
 *
 * HOW.  Pixi 8 routes each sprite to a named Batcher, and a batcher owns its
 * shader.  This registers a 'sharp' batcher: the default sprite batcher with
 * one change, the texture-sampling bit of its fragment shader.  Sprites that
 * belong to a character (the same marks formShade.js reads: a container's
 * `_vShadeKids`, and the stand-ins' `_vShade`, plus `_sharp` for anything
 * else) are sent to it; everything else -- painted maps, props, UI, text --
 * stays on the default and keeps its smooth filtering, which is right for
 * painted art (sharp sampling would make a painting look blocky).
 * Cost: a batch break into and out of each figure, a couple of draw calls.
 *
 * WebGL2 only (textureSize / textureGrad); on anything else it never turns on.
 * Off switches: `?sharp=0` (per load), `window.__btSharpOff = true` (live).
 * Probe: `window.__btSharp()`.
 */
import {
  BatcherPipe, DefaultBatcher, ExtensionType, extensions, Shader, GlProgram,
  compileHighShaderGl, compileHighShaderGpuProgram, vertexGlTemplate, fragmentGlTemplate,
  globalUniformsBitGl, colorBitGl, colorBit, roundPixelsBitGl, roundPixelsBit, generateTextureBatchBit,
  getBatchSamplersUniformGroup, getMaxTexturesPerBatch,
} from 'pixi.js';

let _enabled = false;
let _maxTex = 0;
let _routed = 0;
let _urlOff = false;
try { if (typeof location !== 'undefined' && /[?&]sharp=0\b/.test(location.search)) _urlOff = true; } catch (e) { /* on */ }

/* The texture bit, GL flavour: identical to Pixi's generateTextureBatchBitGl
   except that each texture is read through sharpSample(). */
function sharpTextureBitGl(maxTextures) {
  const src = [];
  for (let i = 0; i < maxTextures; i++) {
    if (i > 0) src.push('else');
    if (i < maxTextures - 1) src.push(`if(vTextureId < ${i}.5)`);
    src.push('{');
    src.push(`  outColor = sharpSample(uTextures[${i}], vUV, uvDx, uvDy);`);
    src.push('}');
  }
  return {
    name: 'texture-batch-bit',
    vertex: {
      header: `
                in vec2 aTextureIdAndRound;
                out float vTextureId;
            `,
      main: `
                vTextureId = aTextureIdAndRound.y;
            `,
      end: `
                if(aTextureIdAndRound.x == 1.)
                {
                    gl_Position.xy = roundPixels(gl_Position.xy, uResolution);
                }
            `,
    },
    fragment: {
      header: `
                in float vTextureId;
                uniform sampler2D uTextures[${maxTextures}];

                /* sharp bilinear: flat texels, a one-screen-pixel blend at
                   each seam.  Only when the texture is MAGNIFIED -- minified,
                   it is the plain sample (and the mip chain) as before.  The
                   ORIGINAL uv derivatives go to textureGrad so mip selection
                   is unchanged by the uv remap. */
                vec4 sharpSample(sampler2D tex, vec2 uv, vec2 dx, vec2 dy)
                {
                    vec2 ts = vec2(textureSize(tex, 0));
                    vec2 tpp = vec2(length(vec2(dx.x, dy.x)), length(vec2(dx.y, dy.y))) * ts;
                    vec2 scale = 1.0 / max(tpp, vec2(1e-4));
                    vec2 px = uv * ts;
                    vec2 base = floor(px - 0.5) + 0.5;
                    vec2 f = clamp((px - base - 0.5) * scale + 0.5, 0.0, 1.0);
                    vec2 uv2 = (base + f) / ts;
                    uv2 = mix(uv, uv2, step(1.0, min(scale.x, scale.y)));
                    return textureGrad(tex, uv2, dx, dy);
                }
            `,
      main: `
                vec2 uvDx = dFdx(vUV);
                vec2 uvDy = dFdy(vUV);
                ${src.join('\n')}
            `,
    },
  };
}

let _shader = null;
function sharpShader(maxTextures) {
  if (_shader) return _shader;
  /* ═══ ES 3.00, EXPLICITLY ═══
     Pixi compiles its batch shader as GLSL ES 1.00 even on WebGL2 (no
     `#version` line, so GlProgram adds the WebGL1 compatibility defines),
     and textureSize / textureGrad do not exist there -- the first build of
     this failed to compile exactly that way.  A `#version 300 es` line in
     the template is Pixi's own switch (GlProgram's isES300): it keeps the
     version, skips the ES1 defines, and the template is already ES3 syntax
     (in/out, texture(), an `out vec4 finalColor`). */
  const src = compileHighShaderGl({
    template: { vertex: '#version 300 es\n' + vertexGlTemplate, fragment: '#version 300 es\n' + fragmentGlTemplate },
    bits: [globalUniformsBitGl, colorBitGl, sharpTextureBitGl(maxTextures), roundPixelsBitGl],
  });
  const glProgram = new GlProgram({ name: 'batch-sharp', ...src });
  /* WebGPU is never selected (pixiApp prefers webgl); the default program
     keeps the class complete if that ever changes */
  const gpuProgram = compileHighShaderGpuProgram({
    name: 'batch-sharp',
    bits: [colorBit, generateTextureBatchBit(maxTextures), roundPixelsBit],
  });
  _shader = new Shader({ glProgram, gpuProgram, resources: { batchSamplers: getBatchSamplersUniformGroup(maxTextures) } });
  _shader.maxTextures = maxTextures;
  return _shader;
}

class SharpBatcher extends DefaultBatcher {
  constructor(options) {
    const maxTextures = (options && options.maxTextures) || _maxTex || getMaxTexturesPerBatch();
    super({ ...(options || {}), maxTextures });
    this.name = 'sharp';
    this.shader = sharpShader(maxTextures);
  }
}
SharpBatcher.extension = { type: [ExtensionType.Batcher], name: 'sharp' };

/* Is this sprite a piece of a character? */
function wantsSharp(r) {
  if (!r || r._noSharp) return false;
  if (r._sharp || r._vShade === _figureSpec) return true;
  const p = r.parent;
  if (!p) return false;
  if (p._vShadeKids) return true;
  const g = p.parent;
  return !!(g && g._vShadeKids && p !== g._uiLayer);
}
let _figureSpec = null;

/** Call once, after app.init.  `figureSpec` is formShade's SHADE.figure, so a
 *  stand-in marked as figure-shaded is also sharpened (props are not). */
export function installSharpPixels(app, figureSpec) {
  if (_enabled || _urlOff) return false;
  try {
    const r = app && app.renderer;
    const v = r && r.context && r.context.webGLVersion;
    if (v !== 2) return false;
    _maxTex = (r.limits && r.limits.maxBatchableTextures) || getMaxTexturesPerBatch();
    _figureSpec = figureSpec || null;
    sharpShader(_maxTex);   /* compile up front, not on the first figure */
    extensions.add(SharpBatcher);
    const orig = BatcherPipe.prototype.addToBatch;
    BatcherPipe.prototype.addToBatch = function (obj, instructionSet) {
      if (obj && obj.packAsQuad) {
        const on = !(typeof window !== 'undefined' && window.__btSharpOff) && wantsSharp(obj.renderable);
        obj.batcherName = on ? 'sharp' : 'default';
        if (on) _routed++;
      }
      return orig.call(this, obj, instructionSet);
    };
    _enabled = true;
    return true;
  } catch (e) {
    try { console.warn('[sharp] not installed', e && e.message); } catch (_e) { /* ignore */ }
    return false;
  }
}

if (typeof window !== 'undefined') {
  window.__btSharp = () => ({ enabled: _enabled, off: !!window.__btSharpOff, urlOff: _urlOff, routedTotal: _routed, maxTextures: _maxTex });
}
