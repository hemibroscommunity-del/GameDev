/* ═══ v2.3.5002: THE SWING'S BLADE AND THE BOW'S DRAW, FOR THE ROLE BAKE (tools/art/role-bake.mjs) ═══
 *
 * The owner, 2026-11-12: "Do armor and weapons as 256 color pictures."  The
 * armour is the `gear` and `gearwalk` sets (lookSets/gear.js, gearwalk.js);
 * this is the first of the weapons: the strips the sword's swing and the
 * bow's draw lay over their stand-in bodies (effectsRenderer.js
 * _loadSwordStrip, _loadBowStrip).  As RGBA they were 6.2 MB in the page and,
 * once drawn, on the graphics chip: the swing's south and east cut into
 * canvases (0.8 and 0.6 MB), its north kept whole as its <img> (2.65 MB: a
 * faint haze in every frame leaves the cut nothing to crop), the bow's five
 * whole files (2.2 MB).  This set keeps them as colour numbers, a byte a
 * pixel, as the armour is (the body's contract: lookSets/body.js).
 *
 * How they differ from the armour:
 *   - the swing's south and east are stored half size on disk (the download)
 *     and blown up x2, nearest, to their frame's height before they are cut
 *     (upscaleToFrameHeight, v2.3.1112): read here exactly so, as the
 *     stand-ins' bodies are (lookSets/standin.js), through the same
 *     loadWebpOrPng.  The north is full size and passes through as it is;
 *   - the cells are whatever the game's cut makes of the art as drawn: the
 *     bake cuts the display with the game's own packer, so the north, which
 *     the game does not crop, is not cropped here either (its frames whole,
 *     i x fw, the haze and all);
 *   - the bow's frames are the whole file, i x fw, never cropped by the game
 *     (an Assets.load, read as a plain picture of the same PNG here); the bake
 *     crops them, and every reader places a Sprite by its anchor, which a
 *     cropped frame's `orig` keeps where it was.  Its art is on 11 to 61
 *     colours already, so its numbers are exact (no cut);
 *   - NO ROLES: a blade is not recoloured by a look.  Copper, iron and black
 *     steel are this art under a sprite tint (weaponTint), which the look
 *     program applies as it applies every tint; the metal's shine is the look
 *     program's shine form (glint.js marks swordWeaponSprite and a peer's
 *     sw.weapon, as before);
 *   - no mip chain, as the game's have none (`mip: false`: a canvas from
 *     _sliceStandIn and an Assets.load picture are made without one).
 *
 * Read by the bake and by the oracle (gearLookProbe.js compareWeapons, QA
 * pages only); the game draws the baked sheets (weaponLookFrame.js).
 */
import { upscaleToFrameHeight } from '../spriteScale.js';
import { loadWebpOrPng } from '../webpImage.js';

/* [frame width, frame height] as effectsRenderer.js's _swordCfg and _bowCfg
   give each facing (the same numbers lookSets/standin.js and gear.js copy;
   source() checks them against the file, so a change there is an error here,
   not a wrong cut) */
const SWING = { south: [320, 320], east: [402, 246], north: [340, 227] };
const BOWSHOT = { east: [214, 241], southwest: [154, 233], south: [130, 234], northwest: [160, 248], north: [122, 260] };

const SHEETS = Object.create(null);
for (const [dir, [fw, fh]] of Object.entries(SWING)) {
  SHEETS['swing-' + dir] = { pose: 'swing', dir, fw, fh, file: `/sprites/player/sword-${dir}-weapon.png` };
}
for (const [dir, [fw, fh]] of Object.entries(BOWSHOT)) {
  SHEETS['bowshot-' + dir] = { pose: 'bowshot', dir, fw, fh, file: `/sprites/player/bow-${dir}-weapon.png` };
}
export const WEAPON_SHEETS = SHEETS;

function loadImage(url) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error('no ' + url));
    im.src = url;
  });
}

export default {
  kind: 'body',
  bits: 8,
  fw: 128, fh: 128,   /* every sheet says its own (frameOf) */
  out: 'public/sprites/look/weapons',
  mip: false,   /* the game's weapon strips have no mip chain */
  roleDefs: [],
  sheets: Object.keys(SHEETS),
  /* the swing is read through loadWebpOrPng (its twin when there is one); the bow as its PNG */
  art: (sheet) => (SHEETS[sheet].pose === 'swing'
    ? ['public' + SHEETS[sheet].file, 'public' + SHEETS[sheet].file.replace(/\.png$/, '.webp')]
    : ['public' + SHEETS[sheet].file]),
  code: ['src/rendering/trimRules.js', 'src/rendering/trimPack.js', 'src/rendering/gearSheets.js', 'src/rendering/spriteScale.js'],
  frameOf(sheet) {
    const s = SHEETS[sheet];
    return s ? { fw: s.fw, fh: s.fh } : null;
  },
  /* the strip as the game cuts it: the swing as _loadSwordStrip reads it
     (loadWebpOrPng, then upscaleToFrameHeight to the frame's height), the
     bow as _loadBowStrip's whole file */
  async source(sheet) {
    const s = SHEETS[sheet];
    const raw = s.pose === 'swing' ? await loadWebpOrPng(s.file) : await loadImage(s.file);
    const img = s.pose === 'swing' ? upscaleToFrameHeight(raw, s.fh) : raw;
    const W = img.naturalWidth || img.width, H = img.naturalHeight || img.height;
    const fw = s.fw, n = Math.round(W / fw);
    if (n < 1 || n * fw !== W || H !== s.fh) throw new Error(`${sheet}: ${W} x ${H} is not frames of ${fw} x ${s.fh}`);
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    c.getContext('2d').drawImage(img, 0, 0);
    const d = c.getContext('2d').getImageData(0, 0, W, H).data;
    c.width = 0; c.height = 0;
    return { img, d, W, H, frames: n, srcH: raw.naturalHeight || raw.height, fw, fh: s.fh };
  },
  /* a weapon is not recoloured: the look's row leaves it as drawn (the art
     at the size the game cuts it: the swing's blown up already) */
  run(src) {
    const c = document.createElement('canvas'); c.width = src.W; c.height = src.H;
    c.getContext('2d').drawImage(src.img, 0, 0);
    return c;
  },
  display: (src, sheet, full) => full,
  ds: () => 1,
};
