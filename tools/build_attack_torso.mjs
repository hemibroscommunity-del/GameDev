/* Build leg-erased "torso" strips from the attack BODY sheets, so the renderer
   can draw animated jog-legs underneath while the upper body plays the attack
   (no more frozen sliding legs).  Per frame: detect the waist (pants-top) and
   clear every row below waist+OVERLAP to transparent, keeping the canvas/frame
   geometry identical so the existing anchor math is reused unchanged.

   Scoped to bow-south first (owner testing); add sheets to SHEETS to extend.
   Run: node tools/build_attack_torso.mjs
*/
import { readFileSync, writeFileSync } from 'node:fs';
import { decode, encode } from './png.mjs';

const SHEETS = [
  ['bow-south', 130, 234, 3], ['bow-southwest', 154, 233, 3], ['bow-east', 214, 241, 3],
  ['bow-north', 122, 260, 3], ['bow-northwest', 160, 248, 3],
];
const OVERLAP = 6;   // keep a few px of the body's own waistband past the waist to hide the seam
const isPants = (r, g, b, a) => a > 80 && Math.abs(r - g) < 32 && g - b > 22 && r < 170 && b < 120;

for (const [name, FW, FH, N] of SHEETS) {
  const im = decode(readFileSync(`public/sprites/player/${name}-body.png`));
  const { width: W, data: d } = im;
  for (let fi = 0; fi < N; fi++) {
    let waist = -1;
    for (let y = Math.round(FH * 0.35); y < FH && waist < 0; y++) {
      let c = 0; for (let x = 0; x < FW; x++) { const i = (y * W + (fi * FW + x)) * 4; if (isPants(d[i], d[i + 1], d[i + 2], d[i + 3])) c++; }
      if (c > 3) waist = y;
    }
    if (waist < 0) waist = Math.round(FH * 0.62);
    const cut = waist + OVERLAP;
    for (let y = cut; y < FH; y++) for (let x = 0; x < FW; x++) { const i = (y * W + (fi * FW + x)) * 4; d[i] = d[i + 1] = d[i + 2] = d[i + 3] = 0; }
  }
  writeFileSync(`public/sprites/player/${name}-torso.png`, encode({ width: im.width, height: im.height, data: d }));
  console.log(`wrote ${name}-torso.png`);
}
