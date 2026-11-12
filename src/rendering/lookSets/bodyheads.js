/* ═══ v2.3.4961: THE HEAD SHEETS, FOR THE ROLE BAKE (tools/art/role-bake.mjs) ═══
 *
 * An armoured player's figure draws its head from its own sheet over the
 * armour (`<pose>-<dir>-head.png`: the jog, the hit taken, mining and the
 * pickup; playerSkins.js getPickupHeadFrame).  The old path recolours a copy
 * of each sheet for every SKIN it meets (bodyRecolor.js bakeHeadFull: the
 * recolour, halved for the screen): your own ten behind the loading screen,
 * and up to thirteen more for every armoured player of another skin.  Since
 * v2.3.4930 those bakes run on a worker, so they no longer hold the page;
 * but each is still a full-colour picture of its own on the graphics chip.
 * This set keeps the sheets ONCE, as colour numbers, as the body set does
 * (lookSets/body.js; the contract is in its header), and a skin is a row.
 *
 * How they differ from the body:
 *   - the skin is the only role: a head sheet takes no trousers or boots
 *     (v2.3.3658, _buildPickupHeadSheet: every trouser- or boot-coloured pixel
 *     on one is the outline's) and no eye colour;
 *   - the display is the full bake halved with the canvas's smoothing
 *     (bakeHeadFull, HEAD_DS 2): four numbers a display texel, as the stand
 *     sheets' (ds 2);
 *   - mining keeps the pickaxe's wood (bakeHeadFull's `pose === 'mine'`): the
 *     same for every look, kept as the bake leaves it (keepFromDefault).
 * What the numbers cannot carry is baked as before: an eye style (its erase
 * takes the colour round each eye) and a face drawing.
 * Read only by the bake; nothing in the game imports it.
 */
import { recolorBodyToCanvas } from '../playerSkins.js';
import { FRAME_H } from '../bodyRecolor.js';
import { upscaleToFrameHeight } from '../spriteScale.js';
import { SPRITE_VERSION } from '../playerSprites.js';
import { loadWebpOrPng } from '../webpImage.js';

/* every head sheet the game ships (public/sprites/player/*-head.png) */
export const HEAD_SHEETS = [
  'jog-east-head', 'jog-north-head', 'jog-south-head', 'jog-southwest-head',
  'hit-east-head', 'hit-north-head', 'hit-northeast-head', 'hit-south-head', 'hit-southwest-head',
  'mine-south-head', 'pickup-south-head',
];
const HEAD_DS = 2;   /* playerSkins.js HEAD_DS */

export default {
  kind: 'body',
  bits: 8,
  keepFromDefault: true,   /* the pickaxe's wood on mine-south-head */
  fw: 128, fh: 128,   /* the display frame: FRAME_W / HEAD_DS */
  out: 'public/sprites/look/bodyheads',
  mip: false,   /* the old path's sheets have no mip chain (autoGenerateMipmaps false) */
  roleDefs: [
    { name: 'skin', entry: 1, ref: 149, under: 0 },
  ],
  sheets: HEAD_SHEETS,
  art: (sheet) => [`public/sprites/player/${sheet}.png`, `public/sprites/player/${sheet}.webp`],
  code: ['src/rendering/playerSkins.js', 'src/rendering/bodyRecolor.js', 'src/rendering/garmentConfine.js', 'src/rendering/spriteScale.js',
    'src/rendering/toolWood.js'],
  /* the sheet as the worker reads it in play (bodyBake.js: the .webp twin first), at the bake's size */
  async source(sheet) {
    const img = await loadWebpOrPng(`/sprites/player/${sheet}.png?v=${SPRITE_VERSION}`);
    const up = upscaleToFrameHeight(img, FRAME_H);
    const W = up.width, H = up.height;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    c.getContext('2d').drawImage(up, 0, 0);
    const d = c.getContext('2d').getImageData(0, 0, W, H).data;
    c.width = 0; c.height = 0;
    return { img, d, W, H, frames: Math.max(1, Math.floor(W / 256)), srcH: img.naturalHeight };
  },
  /* bakeHeadFull's recolour, argument for argument: the skin alone, no eye, no blank */
  run(src, sheet, T) {
    return recolorBodyToCanvas(src.img, T[1] || null, null, null, null, FRAME_H,
      undefined, undefined, undefined, undefined, undefined, null,
      undefined, undefined, undefined, /^mine-/.test(sheet));
  },
  /* bakeHeadFull's halving: the canvas's own smoothing */
  display(src, sheet, full) {
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(full.width / HEAD_DS));
    cv.height = Math.max(1, Math.round(full.height / HEAD_DS));
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(full, 0, 0, cv.width, cv.height);
    return cv;
  },
  ds: () => 2,
};
