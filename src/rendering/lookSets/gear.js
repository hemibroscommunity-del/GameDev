/* ═══ v2.3.4998: THE COMBAT POSES' ARMOUR, FOR THE ROLE BAKE (tools/art/role-bake.mjs) ═══
 *
 * The owner, 2026-11-12: "Do armor and weapons as 256 color pictures."  The
 * armour a figure wears in a swing, a bow's draw, a chop, the cook's stir, the
 * fire's lighting and the farmer's three poses is drawn from strips of its own
 * (effectsRenderer.js _gearStripFrame): each a PNG the game cuts into frames
 * (packTrimmed) and keeps on the graphics chip at four bytes a pixel -- 13.9 MB
 * at the memory check's fight (docs/specs/pictures-256.md §1).  This set keeps
 * them as colour numbers, a byte a pixel, as the bodies are (lookSets/body.js;
 * the contract is in its header).
 *
 * How they differ from the body:
 *   - NO ROLES: armour is not recoloured by a look.  Copper, iron and black
 *     steel are this same steel art with a Sprite.tint (gearVariants,
 *     _tintGearSprite), which the look program applies as it applies every
 *     sprite's tint (vColor);
 *   - each pose has its own frame width, given here as the game passes it
 *     (`frameOf`, checked against the file: a width that does not divide the
 *     strip is an error, not a guess);
 *   - nothing halves or scales them: the display IS the file (ds 1), cropped
 *     by the same packTrimmed cells the game cuts it with;
 *   - no mip chain, as the game's canvases have none (`mip: false`).
 *
 * Measured before this was written (lookCut, the bar of 16 levels, every one
 * of the 111 armour sheets): every sheet cuts to 255 colours within the bar,
 * the worst colour 14 levels, the mean 1-4 (docs/specs/pictures-256.md
 * "Phase 2: the armour").
 *
 * Read only by the bake; nothing in the game imports it (yet).
 */

/* [frame width, frame height] as effectsRenderer.js cuts each pose's strip
   (_gearStripFrame): the sword's swing and the bow's draw (the stand-ins'
   SWORD / BOW cfgs, lookSets/standin.js), COOK_FW, FIRE_FW, the farmer's three
   (data/farmAnims.js FARM_ANIMS[*].fw); the chop's twin is cut by its frame
   count, 12 of CHOP_GEAR_FW (GEAR_STRIP_TWIN).  The height is the file's; the
   bake asks for both before it loads a picture, and source() checks them */
const POSES = {
  swing: { east: [402, 246], north: [340, 227], south: [320, 320] },
  bowshot: { east: [214, 241], southwest: [154, 233], south: [130, 234], northwest: [160, 248], north: [122, 260] },
  chop: { west: [240, 220, '-220'] },
  cook: { south: [213, 220] },
  fire: { south: [384, 512] },
  farmhoe: { south: [186, 274] },
  farmwater: { south: [141, 234] },
  farmkneel: { south: [109, 188] },
};
/* the armour that ships: one art set a slot (gearArtSafe) */
const SLOTS = { chest: 'steelplate', legs: 'steelgreaves', shirt: 'tshirt' };

const SHEETS = Object.create(null);
for (const [slot, item] of Object.entries(SLOTS)) {
  for (const [pose, dirs] of Object.entries(POSES)) {
    for (const [dir, [fw, fh, suffix]] of Object.entries(dirs)) {
      SHEETS[`${slot}-${pose}-${dir}`] = { slot, item, pose, dir, fw, fh,
        file: `/sprites/gear/${slot}/${item}/${pose}-${dir}${suffix || ''}.png` };
    }
  }
}
export const GEAR_SHEETS = SHEETS;

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
  out: 'public/sprites/look/gear',
  mip: false,   /* the game's combat strips are canvases with no mip chain */
  roleDefs: [],
  sheets: Object.keys(SHEETS),
  art: (sheet) => ['public' + SHEETS[sheet].file],
  code: ['src/rendering/trimRules.js', 'src/rendering/gearSheets.js'],
  frameOf(sheet) {
    const s = SHEETS[sheet];
    return s ? { fw: s.fw, fh: s.fh } : null;
  },
  /* the strip as _gearStripFrame reads it: a plain Image of the SAME .png */
  async source(sheet) {
    const s = SHEETS[sheet];
    const img = await loadImage(s.file);
    const W = img.naturalWidth, H = img.naturalHeight;
    const fw = s.fw, n = Math.round(W / fw);
    if (n * fw !== W || H !== s.fh) throw new Error(`${sheet}: ${W} x ${H} is not frames of ${fw} x ${s.fh}`);
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    c.getContext('2d').drawImage(img, 0, 0);
    const d = c.getContext('2d').getImageData(0, 0, W, H).data;
    c.width = 0; c.height = 0;
    return { img, d, W, H, frames: n, srcH: H, fw, fh: s.fh };
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
