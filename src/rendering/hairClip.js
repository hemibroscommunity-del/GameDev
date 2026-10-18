/* ═══ v2.3.3436: THE HAIR CLIPPED BY THE STENCIL, NOT IN A PASS OF ITS OWN ═══
 *
 * The owner: "iterate on what best improves framerate without loss of quality
 * (or negligible loss) for phone gameplay (iPhone, android)".
 *
 * Under a hat that `clipsHair` (31 of the 40), and under a cape's hood, the
 * hair is cut to the hat's or the hood's silhouette (entityRenderer.js
 * _clipHairToHat, v2.3.364 and v2.3.2186) by making a sprite of that
 * silhouette the hair's MASK.  A sprite mask is Pixi's alpha mask, and an
 * alpha mask is a FILTER (AlphaMaskPipe, MaskFilter): every frame, for every
 * figure wearing one, the graphics chip stopped drawing the frame, drew the
 * hair into a picture of its own, and went back to draw it multiplied by the
 * silhouette.  On a phone's tile-based chip each such stop writes the half-
 * drawn frame out to memory and reads it back in (TRAPS §221, the metal
 * shine's passes; §223's shadows) -- one for you in a hat, one more for every
 * hatted player on the screen.
 *
 * A mask that is any other container is Pixi's STENCIL mask (StencilMaskPipe):
 * its contents drawn into the stencil buffer only, in the frame's own pass, and
 * the hair drawn where the stencil is set -- no picture of its own, no stop.
 * So the silhouette sprite is put in a box of its own (`clipBox`), the box is
 * the hair's mask, and the silhouette is drawn by a batcher that keeps its
 * opaque part only (CLIP_BATCHER: Pixi's own batch program, a fragment whose
 * silhouette is less than half there discarded).  THE SAME LINE: the alpha
 * mask multiplied the hair by the silhouette's `a * r` (MaskFilter: the
 * silhouettes are white, so a squared), smooth over the one texel the
 * silhouette's edge is sampled across; the stencil keeps the hair where that
 * is at least half, so the cut falls on the same line and is crisp instead of
 * a one-texel blend -- on a 3x phone about one device pixel at the hat's edge
 * (mp-hairclip counts them).  `?alphaclip` is the alpha mask, as it was.
 *
 * The box is made the first time a silhouette clips anything, where the
 * silhouette stood among the figure's children, and lives with it.  While it
 * clips, Pixi leaves it out of the figure's own drawing (`includeInBuild`
 * false, StencilMask.init); when nothing is clipped by it, it is put away
 * (`renderable` false) -- Pixi hands a stencil mask back to be drawn as an
 * ordinary child (StencilMask.reset), the white-dot trap of v2.3.2923's grip
 * hole.  The shadows' caster walk skips a box that is clipping (casters.js).
 */
import {
  BatchableSprite, Container, DefaultBatcher, ExtensionType, extensions, Shader, GlProgram,
  compileHighShaderGl, compileHighShaderGpuProgram, vertexGlTemplate, fragmentGlTemplate,
  globalUniformsBitGl, colorBitGl, colorBit, roundPixelsBitGl, roundPixelsBit,
  generateTextureBatchBitGl, generateTextureBatchBit, getBatchSamplersUniformGroup, getMaxTexturesPerBatch,
} from 'pixi.js';

export const CLIP_BATCHER = 'bt-clip';

let _alpha = false;     /* `?alphaclip`: the alpha mask, as it was */
try { if (typeof location !== 'undefined' && /[?&]alphaclip\b/.test(location.search || '')) _alpha = true; } catch (e) { /* stencil */ }
let _installed = false;
let _maxTex = 0;
const _stats = { boxes: 0, clipped: 0, reboxed: 0 };
const _boxes = new Set();   /* every box made, for the live switch (QA) */

/** The stencil way is in use (installed on a WebGL2 renderer and not
 *  switched off by the address). */
export function hairClipStencilOn() { return _installed && !_alpha; }

/* the silhouette's opaque half only: a fragment where the alpha mask would
   have kept less than half the hair is discarded (MaskFilter: a * r) */
const discardBitGl = {
  name: 'clip-discard',
  fragment: {
    main: `
                if (outColor.a * outColor.r < 0.5) discard;
            `,
  },
};

let _shader = null;
function clipShader(maxTextures) {
  if (_shader) return _shader;
  const src = compileHighShaderGl({
    template: { vertex: vertexGlTemplate, fragment: fragmentGlTemplate },
    bits: [globalUniformsBitGl, colorBitGl, generateTextureBatchBitGl(maxTextures), discardBitGl, roundPixelsBitGl],
  });
  const glProgram = new GlProgram({ name: 'batch-clip', ...src });
  /* WebGPU is never selected (pixiApp prefers webgl): the default program
     keeps the class complete */
  const gpuProgram = compileHighShaderGpuProgram({
    name: 'batch-clip',
    bits: [colorBit, generateTextureBatchBit(maxTextures), roundPixelsBit],
  });
  _shader = new Shader({ glProgram, gpuProgram, resources: { batchSamplers: getBatchSamplersUniformGroup(maxTextures) } });
  _shader.maxTextures = maxTextures;
  return _shader;
}

class ClipBatcher extends DefaultBatcher {
  constructor(options) {
    const maxTextures = (options && options.maxTextures) || _maxTex || getMaxTexturesPerBatch();
    super({ ...(options || {}), maxTextures });
    this.name = CLIP_BATCHER;
    this.shader = clipShader(maxTextures);
  }
}
ClipBatcher.extension = { type: [ExtensionType.Batcher], name: CLIP_BATCHER };

/* ═══ WHICH BATCHER DRAWS A SILHOUETTE: ITS SPRITE'S OWN ANSWER ═══
   Three routings already decide a sprite's batcher where it meets the batch
   pipe (BatcherPipe.addToBatch): the colour numbers' (paletteTex.js, at module
   load), the sharp pixels' (sharpPixels.js, after app.init), each wrapping the
   one before -- and the innermost has the last word, so a wrapper added here
   would be overruled (the sharp pixels send every figure part to 'sharp').  A
   silhouette in a box answers for itself instead: a sprite's batch element is
   asked its `batcherName` by the pipe, and for one whose sprite is a clipping
   silhouette the answer is CLIP_BATCHER whatever the routings set.  Defined
   on the element's class at module load, before any element is made (Pixi's
   constructor assigns the field, so it goes through the setter here). */
{
  const B = BatchableSprite.prototype;
  if (!Object.prototype.hasOwnProperty.call(B, 'batcherName')) {
    Object.defineProperty(B, 'batcherName', {
      configurable: true,
      get() {
        const r = this.renderable;
        return (r && r._btClipMask && _installed && !_alpha) ? CLIP_BATCHER : this._btBatcher;
      },
      set(v) { this._btBatcher = v; },
    });
  }
}

/** Call once, after app.init. */
export function installHairClip(app) {
  if (_installed || _alpha) return false;
  try {
    const r = app && app.renderer;
    if (!r || !r.context || r.context.webGLVersion !== 2) return false;
    _maxTex = (r.limits && r.limits.maxBatchableTextures) || getMaxTexturesPerBatch();
    clipShader(_maxTex);
    extensions.add(ClipBatcher);
    _installed = true;
    return true;
  } catch (e) {
    try { console.warn('[hairClip] not installed: the alpha mask as before', e && e.message); } catch (e2) { /* never */ }
    return false;
  }
}

/* the silhouette's box, made the first time it clips: put where the
   silhouette stood among its parent's children, the silhouette inside it.
   Whoever moves a boxed silhouette to another layer moves its BOX
   (effectsRenderer's stand-in traits, _placeSkillTraitsOn); a silhouette
   found outside its box all the same is boxed again where it now stands --
   alone in a layer it would be drawn as itself, a white hat, and the box it
   left would clip the hair to nothing.  The box goes with its silhouette. */
function boxOf(m) {
  let box = m._btClipBox;
  if (box && !box.destroyed) {
    if (m.parent !== box) {
      const parent = m.parent;
      if (!parent) return null;
      parent.addChildAt(box, parent.getChildIndex(m));
      box.addChild(m);
      _stats.reboxed++;
    }
    return box;
  }
  const parent = m.parent;
  if (!parent) return null;
  box = new Container();
  box.label = 'hairClipBox';
  const at = parent.getChildIndex(m);
  parent.addChildAt(box, at);
  box.addChild(m);
  m._btClipMask = true;
  m._btClipBox = box;
  _boxes.add(box);
  box.once('destroyed', () => _boxes.delete(box));
  m.once('destroyed', () => { if (!box.destroyed) box.destroy(); });
  _stats.boxes++;
  return box;
}

/** v2.3.3436: what to move when a silhouette changes layer -- its box, when
 *  it has one (the header). */
export function clipBoxOrSelf(m) {
  const box = m && m._btClipBox;
  return box && !box.destroyed && m.parent === box ? box : m;
}

/** The hair clipped to the silhouette `m` (a Sprite), or to nothing (null):
 *  through the stencil, or as an alpha mask where that is off. */
export function clipHair(hair, m) {
  if (!hair) return;
  if (!hairClipStencilOn()) {
    /* (a silhouette already boxed stays in its box: Pixi's alpha mask turns
       the silhouette itself off, and the box holds nothing else) */
    if (hair.mask !== m) hair.mask = m;
    if (m && m._btClipBox) m._btClipBox._btHair = hair;
    return;
  }
  const box = m ? boxOf(m) : null;
  if (!box) {
    if (m && hair.mask !== m) hair.mask = m;   /* a silhouette with no parent: as before */
    else if (!m && hair.mask) {
      const was = hair.mask;
      hair.mask = null;
      if (was && was.label === 'hairClipBox' && was.renderable) was.renderable = false;
    }
    return;
  }
  /* drawn into the stencil, the silhouette must be shown: the hood's is kept
     hidden (an alpha mask is only sampled), so it is shown here, inside the
     box the figure's own drawing leaves out -- and renderable, which an alpha
     mask turned off and never back on (AlphaMask.init / reset) */
  if (!m.visible) m.visible = true;
  if (m.renderable === false) m.renderable = true;
  box._btHair = hair;
  if (hair.mask === box) return;
  const was = hair.mask;
  if (!box.renderable) box.renderable = true;
  hair.mask = box;
  _stats.clipped++;
  /* a box no longer clipping anything is put away (the header) */
  if (was && was !== box && was.label === 'hairClipBox' && was.renderable) was.renderable = false;
}

/** v2.3.3436: the stencil (true) or the alpha mask (false), live, for this
 *  page only -- mp-hairstencil's held frame drawn both ways.  Every hair a box
 *  has clipped is clipped again the way the switch now says. */
export function setHairClipStencil(on) {
  _alpha = !on;
  for (const box of _boxes) {
    const hair = box._btHair, m = box.children[0];
    if (!hair || hair.destroyed || !m || (hair.mask !== box && hair.mask !== m)) continue;
    clipHair(hair, m);
  }
  return hairClipStencilOn();
}

/** Is the hair clipped to the silhouette `m` (either way)?  Through the
 *  stencil only while the silhouette is in the box the hair is clipped to --
 *  a silhouette moved out of it leaves the hair clipped to nothing (the
 *  probes' honesty: mp-hairclip, mp-capehair). */
export function hairClippedBy(hair, m) {
  if (!hair || !m) return false;
  if (hair.mask === m) return true;
  const box = m._btClipBox;
  return !!box && hair.mask === box && m.parent === box;
}

if (typeof window !== 'undefined') {
  window.__btHairClip = () => ({ stencil: hairClipStencilOn(), installed: _installed, alpha: _alpha, live: _boxes.size, ..._stats });
  window.__btHairClipStencil = (on) => setHairClipStencil(on);
}
