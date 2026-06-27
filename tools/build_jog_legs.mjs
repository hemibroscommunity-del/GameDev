/* Bake arm-erased "jog legs" sheets for the bow-attack composite.  The jog body's
 * fists swing below the waist on some frames and showed as "ghost hands" beside
 * the legs.  Below the waist a body is only pants+shoes (never skin), so erasing
 * skin-coloured pixels at/below the per-frame waist removes the fists without
 * touching the legs.  Output jog-<dir>-legs.png keeps the geometry/recolour-
 * compatibility of the source (the renderer recolours these to the player combo).
 * Run: node tools/build_jog_legs.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { decode, encode } from './png.mjs';
import { jogWaistRow } from '../src/rendering/jogWaist.js';

const DIRS = ['south', 'east', 'north', 'northeast', 'southwest'];
const isSkin = (r, g, b, a) => a > 120 && r > 150 && r - b > 35 && r >= g - 6 && g >= b - 6;

for (const dir of DIRS) {
  const im = decode(readFileSync(`public/sprites/player/jog-${dir}.png`));
  const { width: W, height: H, data: d } = im;
  const N = Math.round(W / 256);
  let erased = 0;
  for (let fi = 0; fi < N; fi++) {
    const waist = jogWaistRow(dir, fi);
    for (let y = waist; y < H; y++) for (let x = 0; x < 256; x++) {
      const i = (y * W + (fi * 256 + x)) * 4;
      if (isSkin(d[i], d[i + 1], d[i + 2], d[i + 3])) { d[i] = d[i + 1] = d[i + 2] = d[i + 3] = 0; erased++; }
    }
  }
  writeFileSync(`public/sprites/player/jog-${dir}-legs.png`, encode({ width: W, height: H, data: d }));
  console.log(`wrote jog-${dir}-legs.png  (${N} frames, erased ${erased}px of fist/arm)`);
}
