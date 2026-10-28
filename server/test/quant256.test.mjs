/* ═══ v2.3.3728: A PICTURE ON 256 COLOURS OR FEWER (public/tools/style/quant256.js) ═══
 *
 * docs/specs/pictures-256.md.  The reducer the Object Studio (process.js
 * reduceColours) and tools/art/reduce256.mjs share, held to its promises:
 *   1. a picture already on 256 colours or fewer comes back exactly;
 *   2. one on more comes back on at most 256, every pixel a number into them;
 *   3. fully see-through stays fully see-through (number 0), fully solid
 *      stays fully solid, a soft pixel stays soft (never solid, never gone);
 *   4. no dithering: two pixels of one colour get one number;
 *   5. the colours go where the eye tells them apart: a smooth ramp of 1000
 *      greys comes back no step wider than a few levels;
 *   6. the same picture, the same answer;
 *   7. the palette PNG it is written as (png8.js encodeIndexedPng) reads back
 *      as the same colours (png8Decode.js, the game's own reader).
 */
import { reduce256, toRgba, oklab, fromOklab } from '../../public/tools/style/quant256.js';
import { encodeIndexedPng } from '../../public/tools/world/core/png8.js';
import { decodePng8 } from '../../src/rendering/png8Decode.js';
import zlib from 'node:zlib';

let fails = 0;
const check = (name, ok, info) => { if (ok) console.log('ok   ' + name); else { fails++; console.log('FAIL ' + name, info === undefined ? '' : JSON.stringify(info)); } };

/* a picture: w x h, its pixels from f(x, y) -> [r, g, b, a] */
function pic(w, h, f) {
  const d = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) d.set(f(x, y), (y * w + x) * 4);
  return d;
}
const keyAt = (d, i) => ((d[i] << 24) | (d[i + 1] << 16) | (d[i + 2] << 8) | d[i + 3]) >>> 0;

/* 1 */
{
  const d = pic(32, 8, (x, y) => (x < 4 ? [0, 0, 0, 0] : [x * 7, y * 30, 100, x % 3 ? 255 : 128]));
  const r = reduce256(d, 32, 8);
  const back = toRgba(r.idx, r.pal);
  let same = true;
  for (let i = 0; i < d.length; i++) if (d[i] !== back[i]) same = false;
  check('1: a picture on 256 colours or fewer comes back exactly', r.exact && same && r.err === 0, { n: r.n });
}

/* a glow: a solid core, a soft fade round it, thousands of colours */
const W = 256, H = 128;
const glow = pic(W, H, (x, y) => {
  const dx = x - 128, dy = y - 64, dd = Math.sqrt(dx * dx + dy * dy);
  if (dd > 60) return [0, 0, 0, 0];
  if (dd < 20) return [255, Math.round(120 + dd * 6), Math.round(dx & 255), 255];
  return [255, Math.round(200 - dd * 2), Math.round(40 + y), Math.round(255 * (1 - (dd - 20) / 40))];
});
const r2 = reduce256(glow, W, H);
/* 2 */
{
  let inRange = true;
  for (const v of r2.idx) if (v >= r2.n) inRange = false;
  check('2: a picture on thousands of colours comes back on at most 256, every pixel a number into them', !r2.exact && r2.n <= 256 && r2.pal.length === r2.n * 4 && inRange, { n: r2.n });
}
/* 3 */
{
  const back = toRgba(r2.idx, r2.pal);
  let clear = true, solid = true, soft = true;
  for (let i = 0; i < glow.length; i += 4) {
    const a = glow[i + 3], b = back[i + 3];
    if (a === 0 && (b !== 0 || r2.idx[i >> 2] !== 0)) clear = false;
    if (a === 255 && b !== 255) solid = false;
    if (a > 0 && a < 255 && (b === 0 || b === 255)) soft = false;
  }
  check('3: see-through stays see-through (number 0), solid stays solid, soft stays soft', clear && solid && soft, { clear, solid, soft });
}
/* 4 */
{
  const map = new Map();
  let one = true;
  for (let p = 0; p < W * H; p++) {
    const k = keyAt(glow, p * 4);
    if (map.has(k) && map.get(k) !== r2.idx[p]) one = false;
    map.set(k, r2.idx[p]);
  }
  check('4: no dithering: one colour of the picture, one number', one);
}
/* 5 */
{
  const N = 1000;
  const ramp = pic(N, 1, (x) => { const v = Math.round(x * 255 / (N - 1)); return [v, v, v, 255]; });
  const rr = reduce256(ramp, N, 1);
  const back = toRgba(rr.idx, rr.pal);
  let worst = 0;
  for (let i = 0; i < ramp.length; i += 4) worst = Math.max(worst, Math.abs(back[i] - ramp[i]));
  check('5: a smooth ramp keeps every step within a few levels (' + worst + ')', rr.exact || worst <= 3, { worst, n: rr.n });
  const lab = oklab(200, 100, 50), rgb = fromOklab(lab[0], lab[1], lab[2]);
  check('5: OKLab there and back', rgb[0] === 200 && rgb[1] === 100 && rgb[2] === 50, rgb);
}
/* 6 */
{
  const again = reduce256(glow, W, H);
  let same = again.n === r2.n;
  for (let i = 0; same && i < again.pal.length; i++) if (again.pal[i] !== r2.pal[i]) same = false;
  for (let i = 0; same && i < again.idx.length; i++) if (again.idx[i] !== r2.idx[i]) same = false;
  check('6: the same picture, the same answer', same);
}
/* 7 */
{
  const png = await encodeIndexedPng(r2.idx, r2.pal, W, H);
  const dec = png && await decodePng8(png, (z) => Promise.resolve(new Uint8Array(zlib.inflateSync(z))), 1);
  let same = !!dec && dec.w === W && dec.h === H;
  if (same) {
    for (let p = 0; p < W * H && same; p++) {
      const k = dec.idx[p];
      const a = dec.alpha[k], want = r2.idx[p] * 4;
      if (a !== r2.pal[want + 3]) same = false;
      else if (a && (dec.rgb[k * 3] !== r2.pal[want] || dec.rgb[k * 3 + 1] !== r2.pal[want + 1] || dec.rgb[k * 3 + 2] !== r2.pal[want + 2])) same = false;
    }
  }
  check('7: written as a palette PNG with its alphas, the game reads back the same colours', same);
}

if (fails) { console.log(`\n${fails} check(s) failed`); process.exit(1); }
console.log('\nall quant256 checks passed');
