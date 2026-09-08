/* v2.3.2356: mint the half-resolution chop gear strips.
 *
 * WHY (docs/OPTIMIZATION-ROADMAP.md P7 item 7).  The three lumberjack layers --
 * chest/steelplate, legs/steelgreaves and shirt/tshirt `chop-west.png` -- are
 * 5760x440 each, 9.67 MB of decoded RGBA apiece and the three largest single
 * sprite keys the phone holds.  They sit over a body strip that is 5760x220
 * and, per the v2.3.1131 note in effectsRenderer, are drawn at HALF the body's
 * scale factor to reach the same on-screen height: about 0.24 world px per
 * texel, ~0.71 device px per texel on a dpr-3 phone.  Three of every four
 * texels never reach a pixel.
 *
 * WHY A BOX AVERAGE AND NOT THE v2.3.1412 NEAREST INVERSE.  That recipe is
 * exact only when the art is really a 2x pixel-double of a smaller original --
 * measured here, it is not: of the aligned 2x2 blocks that touch an opaque
 * pixel, only 0.05% (chest) and 0.11% (greaves) are constant, so these are
 * genuine 2x renders.  Nearest would drop three real texels per output pixel
 * and keep the aliasing; the box average is what the GPU's own minification
 * approximates when it samples this sheet, so the halved sheet lands closest to
 * what is on screen today.  The shirt is 19.55% constant -- still not a
 * pixel-double -- and takes the same path so all three stay in step.
 *
 * WHY NO CANVAS AND NO sharp.  TRAPS §53: a 2D canvas backing store is
 * premultiplied, so any tool that draws sprite art through one destroys the
 * partially-transparent RGB along the whole silhouette.  tools/png_raw.mjs
 * inflates the IDAT and works on the bytes instead.  The averaging is done in
 * PREMULTIPLIED space and divided back out, which is the same reason: averaging
 * straight RGBA pulls the transparent side's black into every edge pixel.
 *
 * The 5760x440 originals STAY on disk.  Nothing loads them at runtime any more
 * (effectsRenderer's GEAR_STRIP_TWIN sends the chop pose to the -220 file), so
 * they cost no memory and no download; they are the source these are minted
 * from, and the next re-cut of this art should start there and re-run this.
 *
 * Run: node tools/build_chop_half.mjs        (writes the -220 twins in place)
 */
import { decodePng, encodePng } from './png_raw.mjs';

const SHEETS = [
  'public/sprites/gear/chest/steelplate/chop-west.png',
  'public/sprites/gear/legs/steelgreaves/chop-west.png',
  'public/sprites/gear/shirt/tshirt/chop-west.png',
];

/** Exact 2x box downscale, averaged in premultiplied alpha. */
export function halve(src, w, h) {
  const ow = w >> 1, oh = h >> 1;
  const out = Buffer.alloc(ow * oh * 4);
  for (let y = 0; y < oh; y++) {
    for (let x = 0; x < ow; x++) {
      const p = [((2 * y) * w + 2 * x) * 4, ((2 * y) * w + 2 * x + 1) * 4,
        ((2 * y + 1) * w + 2 * x) * 4, ((2 * y + 1) * w + 2 * x + 1) * 4];
      let aSum = 0, r = 0, g = 0, b = 0;
      for (const i of p) { const a = src[i + 3]; aSum += a; r += src[i] * a; g += src[i + 1] * a; b += src[i + 2] * a; }
      const o = (y * ow + x) * 4;
      if (aSum === 0) continue;                       // fully transparent block stays 0,0,0,0
      out[o] = Math.round(r / aSum);
      out[o + 1] = Math.round(g / aSum);
      out[o + 2] = Math.round(b / aSum);
      out[o + 3] = Math.round(aSum / 4);
    }
  }
  return { data: out, width: ow, height: oh };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const f of SHEETS) {
    const im = decodePng(f);
    if (im.width % 2 || im.height % 2) throw new Error(f + ': odd dimensions, not halvable');
    const half = halve(im.data, im.width, im.height);
    const dst = f.replace(/\.png$/, '-' + half.height + '.png');
    encodePng(dst, half.width, half.height, half.data);
    console.log(`${f}  ${im.width}x${im.height} -> ${dst}  ${half.width}x${half.height}`
      + `  (${(im.width * im.height * 4 / 1048576).toFixed(2)} -> ${(half.width * half.height * 4 / 1048576).toFixed(2)} MB decoded)`);
  }
}
