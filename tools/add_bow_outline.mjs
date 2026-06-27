/* Re-add the black outline the v958 magenta->brown / cyan->black recolor stripped
 * off the bow art.  For each listed bow PNG, dilate the opaque silhouette by R
 * px into the surrounding transparent area and paint those new pixels solid
 * black -- a clean outline that hugs the existing shape without touching the
 * interior brown/handle pixels.  Multi-frame strips are fine: the op is purely
 * local (per-pixel neighbourhood), so frame boundaries are preserved.
 *
 * Run: node tools/add_bow_outline.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { decode, encode } from './png.mjs';

const FILES = [
  // bow-shot weapon strips (drawn during the bow attack, per facing)
  'public/sprites/player/bow-south-weapon.png',
  'public/sprites/player/bow-southwest-weapon.png',
  'public/sprites/player/bow-east-weapon.png',
  'public/sprites/player/bow-north-weapon.png',
  'public/sprites/player/bow-northwest-weapon.png',
  // held bows (carried while moving, per facing)
  'public/sprites/weapons/bows/bow-south.png',
  'public/sprites/weapons/bows/bow-southwest.png',
  'public/sprites/weapons/bows/bow-east.png',
  'public/sprites/weapons/bows/bow-northeast.png',
  'public/sprites/weapons/bows/bow-north.png',
];

const R = 1;          // outline thickness (px)
const A_ON = 128;     // opaque threshold for the silhouette

for (const path of FILES) {
  const im = decode(readFileSync(path));
  const { width: W, height: H, data: d } = im;
  // opaque mask (binarized so anti-aliased edges count as interior, not outline)
  const solid = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) solid[p] = d[p * 4 + 3] >= A_ON ? 1 : 0;
  // outline = transparent-ish pixels within R of a solid pixel
  const out = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = y * W + x;
    if (solid[p]) continue;                 // keep existing silhouette untouched
    let near = false;
    for (let dy = -R; dy <= R && !near; dy++) for (let dx = -R; dx <= R; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      if (solid[yy * W + xx]) { near = true; break; }
    }
    if (near) out[p] = 1;
  }
  let n = 0;
  for (let p = 0; p < W * H; p++) if (out[p]) {
    const i = p * 4; d[i] = 0; d[i + 1] = 0; d[i + 2] = 0; d[i + 3] = 255; n++;
  }
  writeFileSync(path, encode({ width: W, height: H, data: d }));
  console.log(`outlined ${path}  (+${n}px)`);
}
