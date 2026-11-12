/* ═══ v2.3.4999: THE WALKING ARMOUR, FOR THE ROLE BAKE (tools/art/role-bake.mjs) ═══
 *
 * The owner, 2026-11-12: "Do armor and weapons as 256 color pictures."  Slice
 * 1 (v2.3.4998, lookSets/gear.js) took the combat poses' armour; this is the
 * armour a figure wears walking: the chest plate and the greaves standing,
 * jogging, taking a hit (five facings each), rolling (south and east),
 * mining, fishing and picking up (south), and the full steel set's jog
 * figure (four facings: northeast has none).  gearSheets.js builds each as
 * an RGBA sheet the loading screen sends to the graphics chip with a full
 * mip chain; here each is colour numbers, a byte a texel (the contract is
 * lookSets/body.js's header).
 *
 * How they differ from slice 1's set:
 *   - read as _buildSheet reads them: loadWebpOrPng with the art's version
 *     (the lossless .webp twin where there is one: its see-through pixels
 *     decode as the game's do, lookSets/body.js);
 *   - the 128-tall sheets are the art's own texels at a 128 frame, the
 *     256-tall (the roll, the pickup) pass through the same upscale and
 *     smoothing calls _buildSheet makes (both nothing at that height today,
 *     called all the same so the bake follows the game if that changes);
 *   - WITH the mip chain (the set's default): the game's sheets have one,
 *     and the look program reads its first level as the chip would
 *     (look-palette.md, the tee's oracle: 0 px past a level on a phone);
 *   - its own set, not slice 1's: `mip` is a set's field.
 *
 * No roles: armour is not recoloured by a look.  Copper, iron and black
 * steel are the steel art under a sprite tint (gearVariants.js gearTint,
 * entityRenderer.js _fullsetTint), which the look program applies as every
 * tint.  The cut (255 colours a sheet within the 16-level bar) is checked by
 * the bake on every sheet.
 *
 * Read by the bake and by the armour's oracle (gearLookProbe.js, QA pages
 * only); the game draws the baked sheets (gearWalkFrame.js).
 */
import { GEAR_VERSION } from '../gearSheets.js';
import { upscaleToFrameHeight, antialiasUpscaledCanvas, DISPLAY_DS } from '../spriteScale.js';
import { loadWebpOrPng } from '../webpImage.js';

const FRAME = 256;   /* gearSheets.js FRAME_W / FRAME_H */
const DIRS5 = ['east', 'north', 'northeast', 'south', 'southwest'];
/* the poses gearSheets.preloadGear warms, as (pose, facings) pairs */
const POSES = [['stand', DIRS5], ['jog', DIRS5], ['hit', DIRS5],
  ['dodge', ['east', 'south']], ['mine', ['south']], ['fish', ['south']], ['pickup', ['south']]];
/* the art that ships: one set a slot (gearArtSafe) */
const PIECES = [['chest', 'steelplate', POSES], ['legs', 'steelgreaves', POSES],
  ['fullset', 'steel', [['jog', ['east', 'north', 'south', 'southwest']]]]];
/* the file's height, as on disk (the frame follows it: _buildSheet's _fsDs) */
const TALL = new Set(['dodge', 'pickup']);

const SHEETS = Object.create(null);
for (const [slot, item, poses] of PIECES) {
  for (const [pose, dirs] of poses) {
    for (const dir of dirs) {
      const rawH = TALL.has(pose) ? FRAME : FRAME / DISPLAY_DS;
      /* gearSheets.js _buildSheet: the fullset, and any sheet at the display
         size on disk, is its own texels at FRAME / DISPLAY_DS */
      const ds = (slot === 'fullset' || (DISPLAY_DS > 1 && rawH === FRAME / DISPLAY_DS)) ? DISPLAY_DS : 1;
      const f = FRAME / ds;
      SHEETS[`${slot}-${pose}-${dir}`] = { slot, item, pose, dir, rawH, fsDs: ds, fw: f, fh: f,
        file: `/sprites/gear/${slot}/${item}/${pose}-${dir}.png` };
    }
  }
}
export const GEAR_WALK_SHEETS = SHEETS;

export default {
  kind: 'body',
  bits: 8,
  fw: 128, fh: 128,   /* every sheet says its own (frameOf) */
  out: 'public/sprites/look/gearwalk',
  roleDefs: [],
  sheets: Object.keys(SHEETS),
  art: (sheet) => ['public' + SHEETS[sheet].file, 'public' + SHEETS[sheet].file.replace(/\.png$/, '.webp')],
  code: ['src/rendering/trimRules.js', 'src/rendering/gearSheets.js', 'src/rendering/spriteScale.js', 'src/rendering/webpImage.js'],
  frameOf(sheet) {
    const s = SHEETS[sheet];
    return s ? { fw: s.fw, fh: s.fh } : null;
  },
  /* the sheet as _buildSheet makes it from the file */
  async source(sheet) {
    const s = SHEETS[sheet];
    const raw = await loadWebpOrPng(`${s.file}?v=${GEAR_VERSION}`);
    const rawH = raw.naturalHeight || raw.height || 0;
    if (rawH !== s.rawH) throw new Error(`${sheet}: ${rawH} tall, not ${s.rawH}`);
    let img;
    if (s.fsDs > 1 && rawH === FRAME / s.fsDs) img = raw;
    else {
      img = antialiasUpscaledCanvas(upscaleToFrameHeight(raw, FRAME), rawH);
      if (s.fsDs > 1) throw new Error(`${sheet}: a full-set sheet off the display size (_buildSheet would halve it)`);
    }
    const W = img.naturalWidth || img.width, H = img.naturalHeight || img.height;
    const n = Math.floor(W / s.fw);
    if (H !== s.fh || n < 1) throw new Error(`${sheet}: ${W} x ${H} is not frames of ${s.fw} x ${s.fh}`);
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    c.getContext('2d').drawImage(img, 0, 0);
    const d = c.getContext('2d').getImageData(0, 0, W, H).data;
    c.width = 0; c.height = 0;
    return { img, d, W, H, frames: n, srcH: H, fw: s.fw, fh: s.fh };
  },
  /* armour is not recoloured: the look's row leaves it as drawn */
  run(src) {
    const c = document.createElement('canvas'); c.width = src.W; c.height = src.H;
    c.getContext('2d').drawImage(src.img, 0, 0);
    return c;
  },
  display: (src, sheet, full) => full,
  ds: () => 1,
};
