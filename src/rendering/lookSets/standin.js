/* ═══ v2.3.3757: THE STAND-INS' BODIES, FOR THE ROLE BAKE (tools/art/role-bake.mjs) ═══
 *
 * The sword's swing, the bow's draw (and the shield block, which swaps the
 * figure to the bow's art) are drawn with "stand-in" sheets of their own, not
 * the walking body: a bald body strip a facing, the torso strip that rides
 * over the jog's legs, and the jog's legs (effectsRenderer.js _bakeBodyStrip,
 * _remoteBodyFramesFor, _remoteSheetFramesFor).  The old path recolours a
 * copy of each for every look -- the local player's once, every other
 * player's on first sight (an LRU of bakes).  This set keeps them once, as
 * colour numbers, as the body set does (lookSets/body.js; the contract is in
 * its header).
 *
 * How they differ from the body:
 *   - each sheet has its own frame size (the swing's are 320 to 402 px wide),
 *     given per sheet (`frameOf`);
 *   - the skin is ALWAYS recoloured (skinTarget || DEFAULT_SKIN_TARGET:
 *     v2.3.1788, the stand-ins were painted in another orange), no eye colour;
 *   - nothing halves them for the screen: the display IS the full bake (ds 1,
 *     one number a pixel), cropped by the same packTrimmed cells
 *     (_sliceStandIn);
 *   - a torso strip's garments are the waist's sliver (recolorBodyToCanvas's
 *     torsoStrip, v2.3.3658).
 * Read only by the bake; nothing in the game imports it.
 */
import { recolorBodyToCanvas } from '../playerSkins.js';
import { upscaleToFrameHeight } from '../spriteScale.js';
import { loadWebpOrPng } from '../webpImage.js';

/* the frame sizes effectsRenderer.js's stand-in configs give each facing
   (SWORD / BOW cfgs); the jog's legs are square, as tall as the art (`square`) */
const SWORD = { south: [320, 320], east: [402, 246], north: [340, 227] };
const BOW = { east: [214, 241], southwest: [154, 233], south: [130, 234], northwest: [160, 248], north: [122, 260] };
const LEGS = ['east', 'north', 'northeast', 'south', 'southwest'];
const FRAME = Object.create(null);
for (const [d, f] of Object.entries(SWORD)) for (const part of ['body', 'torso']) FRAME[`sword-${d}-${part}`] = f;
for (const [d, f] of Object.entries(BOW)) for (const part of ['body', 'torso']) FRAME[`bow-${d}-${part}`] = f;
for (const d of LEGS) FRAME[`jog-${d}-legs`] = null;   /* square: read off the art */

export const STANDIN_FRAMES = FRAME;

export default {
  kind: 'body',
  bits: 8,
  fw: 128, fh: 128,   /* the jog's legs; the swing's and the bow's per sheet (frameOf) */
  out: 'public/sprites/look/standin',
  mip: false,   /* the old path's canvases have no mip chain: read at level 0 however small (lookPalette.js) */
  roleDefs: [
    { name: 'skin', entry: 1, ref: 149, under: 0 },
    { name: 'pants', entry: 2, ref: 112, under: 0 },
    { name: 'boots', entry: 3, ref: 75, under: 0 },
  ],
  sheets: Object.keys(FRAME),
  art: (sheet) => [`public/sprites/player/${sheet}.png`, `public/sprites/player/${sheet}.webp`],
  code: ['src/rendering/playerSkins.js', 'src/rendering/garmentConfine.js', 'src/rendering/spriteScale.js',
    'src/rendering/playerDecal.js'],
  frameOf(sheet) {
    const f = FRAME[sheet];
    return f ? { fw: f[0], fh: f[1] } : null;
  },
  /* the sheet as _loadRecoloredBody reads it (loadWebpOrPng), at the bake's size */
  async source(sheet) {
    const img = await loadWebpOrPng(`/sprites/player/${sheet}.png`);
    const f = FRAME[sheet];
    const srcH = img.naturalHeight;
    const fw = f ? f[0] : srcH, fh = f ? f[1] : srcH;
    const up = upscaleToFrameHeight(img, fh);
    const W = up.width, H = up.height;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    c.getContext('2d').drawImage(up, 0, 0);
    const d = c.getContext('2d').getImageData(0, 0, W, H).data;
    c.width = 0; c.height = 0;
    return { img, d, W, H, frames: Math.max(1, Math.round(W / fw)), srcH, fw, fh };
  },
  /* the stand-ins' own call (effectsRenderer _bakeBodyStrip / _remoteSheetFramesFor),
     argument for argument: no eye, no drawing, no greaves.  The game always
     passes a skin (skinTarget || DEFAULT_SKIN_TARGET, and so does the look's
     row: effectsRenderer); a probe without one is the art's own skin here, as
     the role bake's self-check expects */
  run(src, sheet, T) {
    return recolorBodyToCanvas(src.img, T[1] || null, T[2] || null, T[3] || null, null, src.fh,
      null, null, null, src.fw, undefined, undefined, undefined, null, /-torso$/.test(sheet));
  },
  display: (src, sheet, full) => full,
  ds: () => 1,
};
