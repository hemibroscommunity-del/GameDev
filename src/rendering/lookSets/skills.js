/* ═══ v2.3.5461: THE TOWNSFOLK'S WORK, FOR THE ROLE BAKE (tools/art/role-bake.mjs --set skills) ═══
 *
 * The owner, 2026-11-14: "make sure all NPCs do things that match their
 * characters. Like chef blaze should cook, not hammer like an anvil" (card TF,
 * docs/specs/townsfolk-work.md).  The cook, the lumberjack and the farmer's
 * three moves are whole pre-drawn figures (public/sprites/skills/), recoloured
 * for a look by a canvas bake (bodyRecolor.js recolorStandInSkin): yours once,
 * and another player's in other colours 1 to 5 MB each while they work
 * (effectsRenderer PEER_FIG_EST).  A townsperson at work would be one more
 * such bake per look, which the memory law refuses.  This set keeps the
 * figures ONCE, as colour numbers, as the sword's and the bow's stand-ins are
 * (lookSets/standin.js): a townsperson's colours are a row of the palette
 * (rendering/folkSkill.js draws them).
 *
 * How it differs from the stand-in set:
 *   - the recolour is the GATHERING figures' own, argument for argument as the
 *     game bakes them for another player (effectsRenderer STANDIN_INK's cook and
 *     farm rows, _bakeChopStrip): his skin, trousers and boots, no drawings, no
 *     patterns (a townsperson has neither on these: townsfolk-walk.test 2k);
 *   - the lumberjack is his TWELVE PLAYED frames (12-23 of the strip, cropped as
 *     effectsRenderer _cropChop crops them, the axe's key intact), and his axe
 *     takes its copper and pine after the skin, as the game's bake does: the
 *     axe is the same whatever the look, so it is KEPT, from the default look's
 *     output (`keepFromDefault`, as the body set keeps the fishing rod's pine);
 *   - the farmer's hoe and can are their own strips (farm-<name>-prop.png,
 *     drawn over him): kept as drawn, every pixel role 0.
 *   - nothing halves them: the display IS the full bake (ds 1), cropped by the
 *     same packTrimmed cells, as the stand-ins.
 * Read only by the bake; the game reads its numbers (folkSkill.js).
 */
import { recolorStandInSkin } from '../bodyRecolor.js';
import { CHOP_MIN_BLOB, CHOP_INK_REGIONS, COOK_KEEP_X, COOK_INK_REGIONS } from '../standInInk.js';
import { STANDIN_GARB_K } from '../standInGarb.js';
import { toolKeyMask, recolorToolKeyCanvas, TOOL_SPECS } from '../toolRecolor.js';
import { FARM_ANIMS } from '../../data/farmAnims.js';

/* effectsRenderer's own numbers for the figures it bakes (not exported there;
   townsfolk-walk.test 6 holds these copies to them): the cook's frame
   (COOK_FW, COOK_FH), the lumberjack's (_cropChop: FW, FH, FROM, COUNT), and
   the farmer's floor for a speck of skin (FARM_MIN_BLOB) */
export const SKILL_COOK = Object.freeze({ fw: 213, fh: 220, url: '/sprites/skills/cook-strip.webp' });
export const SKILL_CHOP = Object.freeze({ fw: 240, fh: 220, from: 12, count: 12, url: '/sprites/skills/chop-strip.webp?v=2.3.1469' });
export const SKILL_FARM_MIN_BLOB = 12;

/* sheet -> how it is made.  The names are the pose and its facing, as the
   `gear` set names the armour worn over them (lookSets/gear.js POSES) */
const SHEETS = Object.freeze({
  'cook-south': { kind: 'cook', fw: SKILL_COOK.fw, fh: SKILL_COOK.fh, url: SKILL_COOK.url, file: 'public/sprites/skills/cook-strip.webp' },
  'chop-west': { kind: 'chop', fw: SKILL_CHOP.fw, fh: SKILL_CHOP.fh, url: SKILL_CHOP.url, file: 'public/sprites/skills/chop-strip.webp' },
  ...Object.fromEntries(Object.keys(FARM_ANIMS).flatMap((a) => {
    const A = FARM_ANIMS[a];
    const body = [`${A.pose}-south`, { kind: 'farm', anim: a, fw: A.fw, fh: A.fh, url: A.url, file: 'public' + A.url.replace(/\?.*$/, '') }];
    return A.prop ? [body, [`${A.pose}-prop-south`, { kind: 'prop', anim: a, fw: A.fw, fh: A.fh, url: A.prop, file: 'public' + A.prop.replace(/\?.*$/, '') }]] : [body];
  })),
});
export const SKILL_SHEETS = SHEETS;

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
  out: 'public/sprites/look/skills',
  mip: false,   /* the game's stand-in canvases have no mip chain (lookPalette.js reads at level 0) */
  keepFromDefault: true,   /* the axe's copper and pine, painted for everyone after the skin */
  roleDefs: [
    { name: 'skin', entry: 1, ref: 149, under: 0 },
    { name: 'pants', entry: 2, ref: 112, under: 0 },
    { name: 'boots', entry: 3, ref: 75, under: 0 },
  ],
  sheets: Object.keys(SHEETS),
  art: (sheet) => [SHEETS[sheet].file],
  code: ['src/rendering/bodyRecolor.js', 'src/rendering/standInInk.js', 'src/rendering/standInGarb.js',
    'src/rendering/toolRecolor.js', 'src/rendering/toolWood.js', 'src/rendering/spriteScale.js', 'src/data/farmAnims.js'],
  frameOf(sheet) {
    const s = SHEETS[sheet];
    return s ? { fw: s.fw, fh: s.fh } : null;
  },
  /* the strip as the game reads it: a plain Image of the same file, the
     lumberjack's twelve played frames cropped unsmoothed (_cropChop) */
  async source(sheet) {
    const s = SHEETS[sheet];
    let img = await loadImage(s.url);
    let W = img.naturalWidth, H = img.naturalHeight;
    if (s.kind === 'chop') {
      const crop = document.createElement('canvas');
      crop.width = s.fw * SKILL_CHOP.count; crop.height = s.fh;
      const cctx = crop.getContext('2d', { willReadFrequently: true });
      cctx.imageSmoothingEnabled = false;
      cctx.drawImage(img, SKILL_CHOP.from * s.fw, 0, s.fw * SKILL_CHOP.count, s.fh, 0, 0, s.fw * SKILL_CHOP.count, s.fh);
      img = crop; W = crop.width; H = crop.height;
    }
    const n = Math.round(W / s.fw);
    if (n * s.fw !== W || H !== s.fh) throw new Error(`${sheet}: ${W} x ${H} is not frames of ${s.fw} x ${s.fh}`);
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, W, H).data;
    /* the axe's key, as _bakeChopStrip is handed it (toolKeyMask of the crop) */
    const keyMask = s.kind === 'chop' ? toolKeyMask(d, W, H) : null;
    c.width = 0; c.height = 0;
    return { img, d, W, H, frames: n, srcH: H, fw: s.fw, fh: s.fh, keyMask };
  },
  /* the game's own bake for another player in these colours, with no
     drawings and no patterns: STANDIN_INK's cook and farm rows, _bakeChopStrip */
  run(src, sheet, T) {
    const s = SHEETS[sheet];
    const clothes = { pantsT: T[2] || null, shoesT: T[3] || null, garb: null };
    if (s.kind === 'prop') {
      const c = document.createElement('canvas'); c.width = src.W; c.height = src.H;
      c.getContext('2d').drawImage(src.img, 0, 0);
      return c;
    }
    if (s.kind === 'cook') {
      return recolorStandInSkin(src.img, T[1] || null, s.fh, { keepX: COOK_KEEP_X, art: null, regions: COOK_INK_REGIONS, frameW: s.fw, patK: STANDIN_GARB_K.cook, ...clothes });
    }
    if (s.kind === 'chop') {
      const cv = recolorStandInSkin(src.img, T[1] || null, s.fh, { minBlob: CHOP_MIN_BLOB, art: null, regions: CHOP_INK_REGIONS, frameW: s.fw, patK: STANDIN_GARB_K.chop, ...clothes });
      recolorToolKeyCanvas(cv, TOOL_SPECS.axe, 1, src.keyMask);
      return cv;
    }
    const A = FARM_ANIMS[s.anim];
    return recolorStandInSkin(src.img, T[1] || null, A.fh, { frameW: A.fw, minBlob: SKILL_FARM_MIN_BLOB, art: null, regions: A.ink, patK: STANDIN_GARB_K.farm, ...clothes });
  },
  display: (src, sheet, full) => full,
  ds: () => 1,
};
