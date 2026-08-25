/* ═══ v2.3.1923: TARGETED TRAIT-ART CLEANUP ═══
 *
 * Owner, reviewing the trait icons: "on the long hair you can remove the two
 * isolated dots near the hair (those are ear holes that should be removed)"
 * and "on the [shag] there's a few skin pixels that should be removed".
 *
 * Both are leftovers from cutting the art out of a rendered head: a couple of
 * ear pixels that survived inside the face opening, and a few of the model's
 * SKIN showing through at the edge of the hair.  Neither is reachable by a
 * blanket filter -- the shag's own golden highlights are the same colour as
 * the skin bleed -- so the fix is explicit and auditable rather than clever:
 * every edit below names its pixels and says why.
 *
 * TWO KINDS OF EDIT, chosen by what is underneath:
 *   ERASE   — the pixel should not be there at all (the ear dots float in the
 *             face hole, so alpha 0 is exactly right).
 *   BLEND   — the pixel is INSIDE the hair silhouette, so erasing would punch
 *             a hole through it.  Replaced with the median colour of the
 *             nearby hair, which is what should have been there.
 *
 * Run:  node tools/clean-trait-pixels.mjs [--dry]
 * Re-running is safe: an already-cleaned pixel simply matches its neighbours.
 */
import fs from 'node:fs';
import path from 'node:path';
import { decode, encode } from './png.mjs';

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const T = path.join(REPO, 'public/sprites/traits');
const DRY = process.argv.includes('--dry');

/* Light-tan = the skin ramp's highlight end.  Used only INSIDE the boxes
   named below, never as a global filter -- the shag's highlights match it. */
const isLightTan = (r, g, b) =>
  r >= 165 && r <= 245 && g >= 105 && g <= 185 && b >= 50 && b <= 135 && (r - g) >= 38 && (g - b) >= 25;

const JOBS = [
  {
    file: 'hair/long/thumb.png',
    op: 'erase',
    why: 'two ear pixels left inside the face opening; they float free of the hair (own connected components), so they simply go',
    /* Measured as isolated blobs: 13px and 2px, both detached from the
       4519px main silhouette. */
    boxes: [[30, 69, 4, 4], [90, 77, 1, 2]],
  },
  ...['thumb', 'south', 'southwest', 'east', 'northeast', 'north'].map((d) => ({
    file: `hair/wavy/${d}.png`,
    op: 'blend',
    why: 'model skin showing through at the hair edge; blended to the surrounding hair rather than erased, since these sit inside the silhouette',
    /* Only clusters that HUG the silhouette edge -- the big interior clusters
       are the shag's own highlight streaks and are left alone. */
    boxes: d === 'thumb' ? [[85, 64, 5, 6], [28, 88, 6, 7], [97, 91, 4, 4], [100, 88, 3, 2]]
      : d === 'south' ? [[54, 45, 4, 4], [52, 65, 2, 2], [61, 44, 1, 1], [52, 49, 1, 1], [74, 66, 1, 1], [70, 56, 2, 3]]
        : d === 'east' ? [[71, 25, 8, 5]]
          : d === 'southwest' ? [[53, 47, 2, 2], [60, 48, 4, 2]]
            : d === 'northeast' ? [[67, 50, 5, 4]]
              : [[56, 46, 4, 3], [61, 45, 1, 1]],
  })),
];

/** Median colour of hair near (x,y): opaque, not light-tan, not in a box. */
function hairMedian(D, W, H, x, y, boxes, radius = 4) {
  const rs = [], gs = [], bs = [];
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const i = (ny * W + nx) * 4;
      if (D[i + 3] < 200) continue;
      if (isLightTan(D[i], D[i + 1], D[i + 2])) continue;
      if (boxes.some(([bx, by, bw, bh]) => nx >= bx && nx < bx + bw && ny >= by && ny < by + bh)) continue;
      rs.push(D[i]); gs.push(D[i + 1]); bs.push(D[i + 2]);
    }
  }
  if (!rs.length) return null;
  const med = (a) => { a.sort((p, q) => p - q); return a[a.length >> 1]; };
  return [med(rs), med(gs), med(bs)];
}

let touched = 0;
for (const job of JOBS) {
  const p = path.join(T, job.file);
  if (!fs.existsSync(p)) { console.log(`SKIP  ${job.file} (missing)`); continue; }
  const im = decode(fs.readFileSync(p));
  const { width: W, height: H, data: D } = im;
  let n = 0;
  for (const [bx, by, bw, bh] of job.boxes) {
    for (let y = by; y < by + bh; y++) {
      for (let x = bx; x < bx + bw; x++) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const i = (y * W + x) * 4;
        if (D[i + 3] === 0) continue;
        if (job.op === 'erase') { D[i] = D[i + 1] = D[i + 2] = D[i + 3] = 0; n++; continue; }
        /* blend: only the pixels that actually are skin-toned */
        if (!isLightTan(D[i], D[i + 1], D[i + 2])) continue;
        const m = hairMedian(D, W, H, x, y, job.boxes);
        if (!m) continue;
        D[i] = m[0]; D[i + 1] = m[1]; D[i + 2] = m[2];
        n++;
      }
    }
  }
  console.log(`${DRY ? 'would fix' : 'fixed'}  ${String(n).padStart(3)} px  ${job.file.padEnd(28)} (${job.op}) — ${job.why}`);
  if (!DRY && n) fs.writeFileSync(p, encode(im));
  touched += n;
}
console.log(`\n${DRY ? 'would touch' : 'touched'} ${touched} pixels across ${JOBS.length} frames`);
