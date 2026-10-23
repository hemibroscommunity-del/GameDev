/* ═══ v2.3.3577: A SPRITE DRAWN IN ONE COLOUR, ITS LIGHT AND SHADE KEPT ═══
 *
 * The owner: "The indicator that the enemies are within the whirlwind active
 * radius needs to be more obvious.  Maybe change the whole color of the enemy
 * to be in a certain tint of color and make it flash a bit."
 *
 * A sprite's tint MULTIPLIES its picture, so it can only take colour away: an
 * amber tint turned a blue slime a dark olive and left a red fire goblin red
 * (mp-whirltint's pictures).  To paint a monster in a colour, whatever its own,
 * the picture's colour has to go and only its shape and its light stay.
 *
 * This batcher is Pixi's own sprite program with a few lines added after the
 * texture is read: each pixel's brightness (its luma) becomes a grey, lifted
 * so a dark monster still comes out a full colour (0.5 + 0.8 x luma, at most
 * 1: its outline a deep shade of the colour, its shine the colour itself),
 * which the template's `finalColor = outColor * vColor` then paints in the
 * sprite's tint at its alpha.  A flat shape (only the alpha kept) was the
 * first cut: a blob with nothing inside it at full strength, and mixed with
 * the monster's own colours at less, a blue slime went grey before it went
 * amber.  No picture is made: a sprite drawn this way uses the very texture
 * it would have drawn, so its animation frames are the monster's own (one
 * sheet, no draw list rebuilt as they change -- TRAPS §218).
 *
 * A sprite takes it with `_btFill = true` (and keeps it): its batchable is
 * pinned to this batcher, whatever the other routing hooks (sharpPixels.js,
 * paletteTex.js) decide, as they run in an order set by when each was
 * installed.  Installed after app.init; its program is compiled behind the
 * loading screen by drawing one sprite with it (warmFillBatch, the preload
 * law); `?fill=0` leaves it out, and nothing is drawn this way.  Probe:
 * window.__btFill(). */
import {
  BatcherPipe, DefaultBatcher, ExtensionType, extensions, Shader, Sprite, Texture,
  compileHighShaderGlProgram, compileHighShaderGpuProgram,
  colorBitGl, colorBit, generateTextureBatchBitGl, generateTextureBatchBit, roundPixelsBitGl, roundPixelsBit,
  getBatchSamplersUniformGroup, getMaxTexturesPerBatch,
} from 'pixi.js';

export const FILL_BATCHER = 'fill';

let _on = false;
let _urlOff = false;
let _pinned = 0;
let _built = false;
try { if (typeof location !== 'undefined' && /[?&]fill=0\b/.test(location.search)) _urlOff = true; } catch (e) { /* on */ }

/* after the texture read (premultiplied), before the template's tint: the
   pixel's luma, lifted, as a grey of its own alpha -- its shape and light,
   none of its colour */
const fillBitGl = {
  name: 'fill-bit',
  fragment: {
    main: `
      float btA = outColor.a;
      vec3 btC = btA > 0.0 ? outColor.rgb / btA : vec3(0.0);
      float btL = clamp(0.5 + 0.8 * dot(btC, vec3(0.299, 0.587, 0.114)), 0.0, 1.0);
      outColor = vec4(vec3(btL * btA), btA);
    `,
  },
};

let _shader = null;
function fillShader(maxTextures) {
  if (_shader) return _shader;
  const glProgram = compileHighShaderGlProgram({
    name: 'batch-fill',
    bits: [colorBitGl, generateTextureBatchBitGl(maxTextures), fillBitGl, roundPixelsBitGl],
  });
  /* WebGPU is never selected (pixiApp prefers webgl); Pixi's own program keeps
     the class whole if that ever changes (sharpPixels.js does the same) */
  const gpuProgram = compileHighShaderGpuProgram({
    name: 'batch-fill',
    bits: [colorBit, generateTextureBatchBit(maxTextures), roundPixelsBit],
  });
  _shader = new Shader({ glProgram, gpuProgram, resources: { batchSamplers: getBatchSamplersUniformGroup(maxTextures) } });
  _shader.maxTextures = maxTextures;
  return _shader;
}

let _maxTex = 0;
class FillBatcher extends DefaultBatcher {
  constructor(options) {
    const maxTextures = (options && options.maxTextures) || _maxTex || getMaxTexturesPerBatch();
    super({ ...(options || {}), maxTextures });
    this.name = FILL_BATCHER;
    this.shader = fillShader(maxTextures);
  }
}
FillBatcher.extension = { type: [ExtensionType.Batcher], name: FILL_BATCHER };

/** Is the one-colour batcher in?  (A caller draws with it only then.) */
export const fillBatchOn = () => _on;

/** Call once, after app.init. */
export function installFillBatch(app) {
  if (_on || _urlOff) return _on;
  try {
    const r = app && app.renderer;
    if (!r || !r.gl) return false;
    _maxTex = (r.limits && r.limits.maxBatchableTextures) || getMaxTexturesPerBatch();
    fillShader(_maxTex);   /* built here, not on the first sprite drawn with it */
    extensions.add(FillBatcher);
    /* the pin: the first time a `_btFill` sprite's batchable meets the
       batcher pipe, its batcher name answers this one while it draws a
       `_btFill` sprite -- every routing hook's assignment is kept aside, so
       whichever runs first, this has the last word.  Asked of the batchable's
       CURRENT sprite every time: Pixi pools a destroyed sprite's batchable
       (SpritePipe, BigPool) and hands it to the next sprite, which must not
       inherit the one colour. */
    const orig = BatcherPipe.prototype.addToBatch;
    BatcherPipe.prototype.addToBatch = function (obj, instructionSet) {
      const rr = obj && obj.renderable;
      if (rr && rr._btFill && obj.packAsQuad && !obj._btFillPin) {
        const was = obj.batcherName;
        Object.defineProperty(obj, 'batcherName', {
          configurable: true, enumerable: true,
          get() { return (this.renderable && this.renderable._btFill) ? FILL_BATCHER : this._btBatcher; },
          set(v) { this._btBatcher = v; },
        });
        obj._btBatcher = was;
        obj._btFillPin = true;
        _pinned++;
      }
      return orig.call(this, obj, instructionSet);
    };
    _on = true;
  } catch (e) {
    try { console.warn('[fill] not installed', e && e.message); } catch (_e) { /* ignore */ }
    _on = false;
  }
  return _on;
}

/** Draw one see-through sprite with it off screen, behind the loading screen:
 *  a program is compiled the first time it is drawn, and that must not be
 *  the first whirlwind of the session (sheenBatch.js warmSheenBatch, the same
 *  way). */
export function warmFillBatch(renderer) {
  if (!renderer || _built || !_on) return false;
  let spr = null;
  try {
    spr = new Sprite(Texture.WHITE);
    spr.width = 8; spr.height = 8;
    spr.alpha = 0.001;
    spr._btFill = true;
    spr._noSharp = true;
    renderer.render({ container: spr });
    _built = true;
  } catch (e) { _built = false; }
  try { if (spr) spr.destroy(); } catch (e) { /* best-effort */ }
  return _built;
}

if (typeof window !== 'undefined') {
  window.__btFill = () => ({ on: _on, urlOff: _urlOff, built: _built, pinned: _pinned, maxTextures: _maxTex });
}
