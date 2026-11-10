/* ═══ v2.3.4450: THE STAND-INS' BODIES UNDER GREAVES, FOR THE ROLE BAKE (tools/art/role-bake.mjs) ═══
 *
 * The whole-game sweep of what holds the page (tools/qa/mp/mp-heldsweep.mjs,
 * docs/specs/held-sweep.md) found its longest single holds here: the sword's
 * and the bow's body under greaves was the one stand-in still recoloured on
 * the page for every look -- 110 to 140 ms a sheet the first time an armoured
 * player swung beside you, 608 ms the moment your own greaves went on (all
 * eight sheets at once).  lookSets/standin.js keeps the bare stand-ins once,
 * as colour numbers; it left these out, "under greaves (the legs are cut by
 * their shape)".
 *
 * But the cut does not depend on the look.  _clampLegsUnder (playerSkins.js)
 * reads the greaves' shape -- one steel art for every metal -- and the art's
 * own trousers, boots and skin; what goes, and what turns the under-armour
 * shade, is the same for every player.  So the eight whole-body sheets are
 * kept once MORE, as the bake leaves them under greaves: the game's own
 * recolorBodyToCanvas with the shape the game itself reads
 * (effectsRenderer.js _noteGreavesShape: the greaves' swing or bow strip,
 * alpha over 30), the roles decided by running it, as every set's are.
 *
 * How it differs from lookSets/standin.js:
 *   - only the eight whole-body sheets (the torso strips are cut at the waist
 *     and the jog's legs are drawn with their own greaves: _legsUnderFor);
 *   - `legsUnder`: the greaves' shape, the game's own argument;
 *   - keepFromDefault: a pixel the clamp paints the shade is the same for
 *     every look, and is kept as the bake leaves it (the fishing rod's rule).
 * Read only by the bake; nothing in the game imports it.
 */
import { recolorBodyToCanvas } from '../playerSkins.js';
import { upscaleToFrameHeight } from '../spriteScale.js';
import { loadWebpOrPng } from '../webpImage.js';
import { STANDIN_FRAMES } from './standin.js';

/* the body sheet -> the greaves' strip its shape is read from (effectsRenderer's stand-in configs: the sword's
   gearPose is 'swing', the bow's 'bowshot') */
const GREAVES = Object.create(null);
for (const d of ['south', 'east', 'north']) GREAVES[`sword-${d}-body`] = `swing-${d}`;
for (const d of ['east', 'southwest', 'south', 'northwest', 'north']) GREAVES[`bow-${d}-body`] = `bowshot-${d}`;

export const STANDIN_LEGS_SHEETS = Object.keys(GREAVES);

export default {
  kind: 'body',
  bits: 8,
  fw: 128, fh: 128,   /* unused: every sheet gives its own (frameOf) */
  out: 'public/sprites/look/standinlegs',
  mip: false,
  keepFromDefault: true,
  roleDefs: [
    { name: 'skin', entry: 1, ref: 149, under: 0 },
    { name: 'pants', entry: 2, ref: 112, under: 0 },
    { name: 'boots', entry: 3, ref: 75, under: 0 },
  ],
  sheets: STANDIN_LEGS_SHEETS,
  art: (sheet) => [`public/sprites/player/${sheet}.png`, `public/sprites/player/${sheet}.webp`,
    `public/sprites/gear/legs/steelgreaves/${GREAVES[sheet]}.png`],
  code: ['src/rendering/playerSkins.js', 'src/rendering/garmentConfine.js', 'src/rendering/spriteScale.js',
    'src/rendering/playerDecal.js', 'src/rendering/lookSets/standin.js'],
  frameOf(sheet) {
    const f = STANDIN_FRAMES[sheet];
    return f ? { fw: f[0], fh: f[1] } : null;
  },
  async source(sheet) {
    const img = await loadWebpOrPng(`/sprites/player/${sheet}.png`);
    const f = STANDIN_FRAMES[sheet];
    const fw = f[0], fh = f[1];
    const up = upscaleToFrameHeight(img, fh);
    const W = up.width, H = up.height;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const cx = c.getContext('2d', { willReadFrequently: true });
    cx.drawImage(up, 0, 0);
    const d = cx.getImageData(0, 0, W, H).data;
    /* the greaves' shape, read as the game reads it (_noteGreavesShape): the PNG itself, at its own size, alpha > 30 */
    const g = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = `/sprites/gear/legs/steelgreaves/${GREAVES[sheet]}.png`; });
    const gw = g.naturalWidth, gh = g.naturalHeight;
    if (gw !== W || gh !== H) throw new Error(`${sheet}: the greaves' strip is ${gw}x${gh}, the body's bake ${W}x${H}`);
    c.width = gw; c.height = gh;
    const gx = c.getContext('2d', { willReadFrequently: true });
    gx.clearRect(0, 0, gw, gh);
    gx.drawImage(g, 0, 0);
    const ga = gx.getImageData(0, 0, gw, gh).data;
    const legs = new Uint8Array(gw * gh);
    for (let p = 0, i = 3; p < gw * gh; p++, i += 4) if (ga[i] > 30) legs[p] = 1;
    c.width = 0; c.height = 0;
    return { img, d, W, H, frames: Math.max(1, Math.round(W / fw)), srcH: img.naturalHeight, fw, fh, legs };
  },
  /* the game's own call under greaves (effectsRenderer _bakeBodyStrip / _remoteBodyFramesFor), argument for
     argument: no eye, no drawing, the greaves' shape */
  run(src, sheet, T) {
    return recolorBodyToCanvas(src.img, T[1] || null, T[2] || null, T[3] || null, null, src.fh,
      null, null, null, src.fw, undefined, undefined, undefined, src.legs, false);
  },
  display: (src, sheet, full) => full,
  ds: () => 1,
};
