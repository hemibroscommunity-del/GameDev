/* ═══ THE MISSING EYE ON THE SOUTH SWING'S FIRST FRAME (v2.3.2144) ═══
 *
 * Owner: "There are some transparent south idle face pixels."
 *
 * Frame 0 of sword-south-body / sword-south-torso has NO LEFT EYE. Not a dark
 * eye, not a dim one -- 15 pixels of alpha 0 in the middle of an otherwise
 * solid face, with the other eye drawn normally. The body sheet is the bottom
 * layer of the character, so those pixels are the ground, showing through his
 * face. Every other frame of the sheet has the eye.
 *
 * WHY THE PINHOLE FILLER CANNOT DO THIS ONE. tools/fill-body-pinholes.mjs
 * repairs an enclosed hole by taking the nearest opaque pixel's colour, which
 * is right for a speck in a forearm and wrong here: the nearest opaque pixels
 * are cheek, so it would fill the socket with skin and ship a character with
 * one eye. A hole big enough to be a missing FEATURE has to be repaired with
 * the feature.
 *
 * So the eye is grafted from frame 1, which is the nearest frame that has one:
 * of the thirteen candidates it is by far the closest match to frame 0's head
 * (mean per-pixel difference 20.3 over the head, against 47+ for every other
 * frame), and a best-shift search over +-3px in both axes puts the alignment at
 * exactly (0,0) -- the head has not moved between the two frames, so the graft
 * needs no resampling and lands on the same pixel grid.
 *
 * Only the 4x5 eye box is copied, and only where frame 0 is transparent, so no
 * pixel frame 0 already draws is overwritten.
 *
 * Run: node tools/graft-sword-south-eye.mjs [--write]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { decode, encode } from './png.mjs';

const write = process.argv.includes('--write');
const SHEETS = [
  'public/sprites/player/sword-south-body.png',
  'public/sprites/player/sword-south-torso.png',
];
const SRC_FRAME = 1;
const DST_FRAME = 0;
const BOX = { y0: 49, y1: 54, x0: 73, x1: 77 };   /* half-open, in on-disk px */

for (const path of SHEETS) {
  const im = decode(readFileSync(path));
  const { width: W, height: H, data: d } = im;
  const FR = H;
  const at = (f, x, y) => (y * W + f * FR + x) * 4;
  let copied = 0;
  let already = 0;
  for (let y = BOX.y0; y < BOX.y1; y++) {
    for (let x = BOX.x0; x < BOX.x1; x++) {
      const dst = at(DST_FRAME, x, y);
      if (d[dst + 3] > 128) { already += 1; continue; }   /* frame 0 draws here: leave it */
      const src = at(SRC_FRAME, x, y);
      if (d[src + 3] <= 128) continue;                    /* nothing to graft */
      d[dst] = d[src]; d[dst + 1] = d[src + 1]; d[dst + 2] = d[src + 2]; d[dst + 3] = d[src + 3];
      copied += 1;
    }
  }
  console.log(`${write ? 'grafted' : 'would graft'} ${copied}px into ${path} frame ${DST_FRAME} `
    + `(${already}px of frame ${DST_FRAME}'s own art left untouched)`);
  if (write && copied) writeFileSync(path, encode({ width: W, height: H, data: d }));
}
