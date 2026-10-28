/* ═══ v2.3.3737: THE BODY'S SET, FOR THE ROLE BAKE (tools/art/role-bake.mjs) ═══
 *
 * A set module tells the bake how the GAME draws one kind of part, so the
 * bake can run the game's own code on its art (docs/specs/look-palette.md,
 * "Adding a set").  Read only by the bake, in its Chromium page through the
 * Vite dev server: nothing in the game imports it, so it ships in no bundle.
 * One file a set (src/rendering/lookSets/<set>.js): a lane adds its own.
 *
 * THE CONTRACT
 *   kind, bits, fw, fh   the row range it may use (LOOK_ROW_RANGES), 8 or 16
 *                        bits a number, the display frame's size
 *   refScale             a role's `ref` is in 1/refScale's (default 1; a
 *                        fractional ref 53.265 at refScale 64 is 3409)
 *   out                  where it is written (default public/sprites/look/<set>/)
 *   roleDefs             [{ name, entry, ref, under }] (lookPalette.js reads
 *                        the same): what each role does with which entry of a
 *                        look's row
 *   sheets               the sheets it bakes by default
 *   art(sheet)           the files the sheet is made from (their bytes date a bake)
 *   code                 the files whose rules decide the roles (a WARN when they change)
 *   source(sheet)        the art as the game's recolour reads it:
 *                        { img, d, W, H, frames, srcH } -- d its full-size RGBA
 *   run(src, sheet, T)   the game's own recolour of it, full size, for row
 *                        entries T ({ entry: [r, g, b] }) -- a canvas
 *   display(src, sheet, full)   the old path's display canvas made from that
 *   ds(src)              1: one display texel a full-size pixel's pick; 2: a
 *                        2x2 box of them (the old path's halving)
 *   keepFromDefault      (v2.3.3750, optional) a kept pixel's colour is the
 *                        default look's output, not the art's: something the
 *                        bake paints for everyone (the fishing rod's pine)
 *   fickle(src, sheet)   (v2.3.3750, optional) full-size pixels the old bake
 *                        colours by more than their role, for its self-check
 *                        to count apart (the fish's rod key, below)
 */
import { recolorBodyToCanvas } from '../playerSkins.js';
import { upscaleToFrameHeight, bakeDisplayCanvas, DISPLAY_DS } from '../spriteScale.js';
import { SPRITE_VERSION, stripDetachedComponents } from '../playerSprites.js';
import { loadWebpOrPng } from '../webpImage.js';
import EYE_MASK from '../eyeMask.json';
import { toolKeyMask, recolorToolKeyCanvas, TOOL_SPECS } from '../toolRecolor.js';   /* v2.3.3750: the fishing rod's pine */

const DIRS = ['east', 'north', 'northeast', 'south', 'southwest'];
/* v2.3.3750: every pose the body draws through getBodyFrame, in the facings
   each is authored in (playerSprites.js POSE_DIRS) -- the walk and the sprint
   are the jog's sheets, the roll and the double jump's flip the dodge's, the
   hit taken hit's */
const POSE_DIRS = { stand: DIRS, jog: DIRS, hit: DIRS, dodge: ['east', 'south'], mine: ['south'], fish: ['south'], pickup: ['south'] };

export default {
  kind: 'body',
  bits: 8,   /* v2.3.3750: the owner's 256 ("I won't notice at all from anything at 256"); a sheet the cut cannot hold to its bar stays 16 (role-bake.mjs) */
  keepFromDefault: true,   /* v2.3.3750: the rod is pine whatever the look */
  fw: 128, fh: 128,
  /* v2.3.3716's place: the folder's root, roles.json */
  out: 'public/sprites/look',
  roleDefs: [
    { name: 'skin', entry: 1, ref: 149, under: 0 },
    { name: 'pants', entry: 2, ref: 112, under: 0 },
    { name: 'boots', entry: 3, ref: 75, under: 0 },
    { name: 'iris', entry: 4, ref: 0, under: 0 },
    { name: 'iris-skin', entry: 4, ref: 0, under: 1 },
    { name: 'iris-pants', entry: 4, ref: 0, under: 2 },
    { name: 'iris-boots', entry: 4, ref: 0, under: 3 },
  ],
  sheets: Object.keys(POSE_DIRS).flatMap((p) => POSE_DIRS[p].map((d) => `${p}-${d}`)),
  art: (sheet) => [`public/sprites/player/${sheet}.png`, `public/sprites/player/${sheet}.webp`],
  code: ['src/rendering/playerSkins.js', 'src/rendering/garmentConfine.js', 'src/rendering/spriteScale.js',
    'src/rendering/eyeMask.json', 'src/rendering/playerDecal.js',
    'src/rendering/toolRecolor.js', 'src/rendering/toolWood.js'],   /* v2.3.3750: + the rod's pine and the pickaxe's wood */
  /* the sheet as the GAME reads it: its lossless .webp twin where there is
     one (webpImage.js), which a browser decodes a shade differently from the
     .png where a pixel is see-through (measured: 4,510 such pixels in
     jog-east) -- a bake from the .png put a few of them in the wrong role */
  async source(sheet) {
    if (DISPLAY_DS !== 2) throw new Error('the body set knows DISPLAY_DS 2 only (it is ' + DISPLAY_DS + ')');
    const img = await loadWebpOrPng(`/sprites/player/${sheet}.png?v=${SPRITE_VERSION}`);
    const up = upscaleToFrameHeight(img, 256);
    const W = up.width, H = up.height;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    c.getContext('2d').drawImage(up, 0, 0);
    const d = c.getContext('2d').getImageData(0, 0, W, H).data;
    /* v2.3.3750: the rod's key as the FILE has it, at the bake's size
       (buildBodySheet's _fileKeyMask: the art drawn unsmoothed, then keyed) */
    let fileKey = null;
    if (/^fish-/.test(sheet)) {
      const k = document.createElement('canvas'); k.width = W; k.height = H;
      const kg = k.getContext('2d', { willReadFrequently: true });
      kg.imageSmoothingEnabled = false;
      kg.drawImage(up, 0, 0);
      fileKey = toolKeyMask(kg.getImageData(0, 0, W, H).data, W, H);
      k.width = 0; k.height = 0;
    }
    return { img, d, W, H, frames: Math.max(1, Math.floor(W / 256)), srcH: img.naturalHeight, fileKey };
  },
  /* buildBodySheet's own call, argument for argument -- v2.3.3750: for every
     pose: the jog's steadied drawing, the fish's boots under its legs, the
     pickaxe's wood, and the rod's pine after it where the file has the key */
  run(src, sheet, T) {
    const cv = recolorBodyToCanvas(src.img, T[1] || null, T[2] || null, T[3] || null, null, 256,
      T[4] || null, EYE_MASK[sheet], null, undefined, /^jog-/.test(sheet), null, /^fish-/.test(sheet), null, false, /^mine-/.test(sheet));
    if (src.fileKey) recolorToolKeyCanvas(cv, TOOL_SPECS.rod, 1, src.fileKey);
    return cv;
  },
  /* v2.3.3750: the old fish bake tests the rod's hue AGAIN after the retint,
     so a boot pixel inside the file's key turns to pine for a look whose boots
     land in that hue (2 texels of fish-south's 1.57 million, a tan boot).
     Counted apart, not copied: the file draws a boot there. */
  fickle: (src) => src.fileKey,
  display(src, sheet, full) {
    let c = bakeDisplayCanvas(full, src.srcH);
    if (sheet === 'jog-northeast') c = stripDetachedComponents(c, src.frames);
    return c;
  },
  /* bakeDisplayCanvas: nearest (the sheet was doubled from disk), or the 2x2 box */
  ds: (src) => (src.srcH === Math.round(src.H / 2) ? 1 : 2),
};
