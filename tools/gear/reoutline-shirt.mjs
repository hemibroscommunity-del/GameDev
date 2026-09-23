/* ═══ v2.3.2747: THE TEE'S OUTLINE, PUT BACK WHERE ITS EDGE NOW IS ═══
 *
 * Owner: "running while wearing the shirt produces a static-like effect where
 * it pops from frame to frame.  I think it's because the black outline from
 * the shirt was removed at some point during the recolor tooling.  You should
 * have the original shirt sprites if you need to overlay a fresh bake."
 *
 * They were right about the line, and git has the originals (447c3d7f, the
 * artist's 256 px sheets; e6228feb, the same art at 128): a white tee with a
 * dark keyline down its sides, under the arms and along the hem.  Not along
 * ALL of its edge -- measured on the jog sheets, 64-84% of each frame's edge
 * has keyline on it or a pixel inside it, the shoulder tops mostly light.
 * Later passes on the jog sheets each took more of it away:
 *
 *   v2.3.1559  replaced the HEM's keyline with shirt colour -- on purpose: with
 *              greaves on it floated across the belly as a black bar.  That
 *              decision is KEPT here (see HEM below).
 *   v2.3.1873  sealed skin slivers by filling thin gaps OUTSIDE the tee with
 *   v2.3.1995  the colour of the pixel they touched.  Where that pixel was
 *              white, the tee's edge moved out a pixel or two in white and the
 *              keyline was left BURIED one pixel inside it.  Measured on
 *              jog-south: 395 white pixels added outside the old outline, in
 *              different places on every frame.
 *
 * So a running tee showed its keyline on some frames and a white rim on
 * others, at the same spot -- the static the owner sees.  Measured on what
 * shipped: the share of the edge that is keyline swings 18-32 points from
 * frame to frame on every one of the five jog sheets.
 *
 * WHAT THIS DOES, per frame, keeping the silhouette EXACTLY as it is (the seal
 * stays sealed; not one pixel's coverage changes):
 *   1. every pixel on the tee's outer edge becomes keyline black -- except the
 *      hem.  That lines the whole edge, the shoulder tops included, where the
 *      artist left the edge mostly light: the same line on every frame is what
 *      stops the flicker.  It does not thicken the shoulders -- where the
 *      tee's top meets the figure's outer top, the dark band is ONE pixel on
 *      more columns than before, not fewer (jog-north 31% -> 56%, jog-south
 *      56% -> 63%, jog-southwest 37% -> 50%), because a buried line and the
 *      body's outline no longer stack there;
 *   2. every keyline pixel the seal BURIED -- black now, no longer on the edge,
 *      but on the edge of the pre-seal sheet -- becomes shirt colour again, the
 *      average of its white neighbours, so the edge is one pixel, not two;
 *   3. nothing else is touched: the drawn fold and the crossing arm's lines
 *      inside the tee are the artist's and stay.
 *
 * HEM: the bottom-facing edge in the lowest two rows of the tee.  Left as the
 * shirt colour, per v2.3.1559.
 *
 * JOG SHEETS ONLY.  The first cut of this tool also re-lined the five stand
 * sheets.  They never flickered -- one frame each, their edge already 98-100%
 * keyline -- and the handful of pixels it darkened put three of them over
 * mp-shirtkeyline's near-black budget: the gate written after the owner's
 * "too large of a black outline" on the creator preview (v2.3.1995), which
 * draws the stand sheets magnified.  So they ship exactly as they were.
 *
 * jog-east is the sheet mp-shirtarm pins.  Its SHAPE stays pinned to the
 * artist's c20c6ec5 (this tool cannot move coverage, and checks), and its
 * bytes are pinned to this tool's output.
 *
 * The black is the artist's own keyline colour, read off the sheet.  The tee
 * is a tint base (entityRenderer multiplies it by the player's colour), and
 * black multiplied is black, so the line is the same on every colour.
 *
 * Run:   node tools/gear/reoutline-shirt.mjs          (writes the 5 jog sheets)
 *        node tools/gear/reoutline-shirt.mjs --dry    (reports only)
 * Reads the pre-seal sheets from git (da249882^, the seal commit's parent), so it needs a
 * checkout that has that commit.  Commit the PNGs only: CI mints the .webp
 * twins (precheck sprite-webp), and bump GEAR_VERSION in gearSheets.js.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decode, encode } from './lib/png.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DIR = 'public/sprites/gear/shirt/tshirt';
const PRE_SEAL = 'da249882^';   /* the seal's own parent: the sheets exactly as the seal found them */
const SHEETS = [];
for (const dir of ['south', 'north', 'east', 'northeast', 'southwest']) SHEETS.push(`jog-${dir}.png`);   /* jog only: see JOG SHEETS ONLY above */
const DRY = process.argv.includes('--dry');
const DARK = 90;          /* mean channel below this is keyline */
const HEM_ROWS = 2;

const lum = (d, i) => (d[i] + d[i + 1] + d[i + 2]) / 3;

function keylineColour(img) {
  const counts = new Map();
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 128 || lum(d, i) >= DARK) continue;
    const k = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  let best = 0, n = -1;
  for (const [k, c] of counts) if (c > n) { n = c; best = k; }
  return [(best >> 16) & 255, (best >> 8) & 255, best & 255];
}

function bake(name) {
  const path = resolve(REPO, DIR, name);
  const img = decode(readFileSync(path));
  const pre = decode(execFileSync('git', ['show', `${PRE_SEAL}:${DIR}/${name}`], { cwd: REPO, maxBuffer: 1 << 26 }));
  const { width: W, height: H, data: d } = img;
  if (pre.width !== W || pre.height !== H) throw new Error(`${name}: pre-seal sheet is ${pre.width}x${pre.height}, current ${W}x${H}`);
  const fw = H;                                   /* square frames, one row */
  const n = Math.round(W / fw);
  const K = keylineColour(img);
  const solid = (dat, x, y) => dat[(y * W + x) * 4 + 3] >= 128;
  let edged = 0, unburied = 0, hemKept = 0;
  const src = new Uint8ClampedArray(d);           /* decide on the sheet as it was */
  for (let f = 0; f < n; f++) {
    const x0 = f * fw, x1 = x0 + fw;
    const inFrame = (x, y) => x >= x0 && x < x1 && y >= 0 && y < H;
    const onEdge = (dat, x, y) => {
      if (!solid(dat, x, y)) return false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx, yy = y + dy;
        if (!inFrame(xx, yy) || !solid(dat, xx, yy)) return true;
      }
      return false;
    };
    /* the tee's lowest rows in this frame, for the hem */
    let maxY = -1;
    for (let y = 0; y < H; y++) for (let x = x0; x < x1; x++) if (solid(src, x, y)) maxY = Math.max(maxY, y);
    if (maxY < 0) continue;
    /* 2. unbury first, so a keyline pixel is judged against the edge as it is */
    for (let y = 0; y < H; y++) {
      for (let x = x0; x < x1; x++) {
        const i = (y * W + x) * 4;
        if (!solid(src, x, y) || lum(src, i) >= DARK) continue;
        if (onEdge(src, x, y) || !onEdge(pre.data, x, y)) continue;
        let r = 0, g = 0, b = 0, c = 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
          const xx = x + dx, yy = y + dy;
          if (!inFrame(xx, yy) || !solid(src, xx, yy)) continue;
          const j = (yy * W + xx) * 4;
          if (lum(src, j) < DARK) continue;
          r += src[j]; g += src[j + 1]; b += src[j + 2]; c++;
        }
        if (!c) continue;                         /* nothing light to borrow: leave it */
        d[i] = Math.round(r / c); d[i + 1] = Math.round(g / c); d[i + 2] = Math.round(b / c);
        unburied++;
      }
    }
    /* 1. the edge, black -- except the hem */
    for (let y = 0; y < H; y++) {
      for (let x = x0; x < x1; x++) {
        if (!onEdge(src, x, y)) continue;
        const i = (y * W + x) * 4;
        if (lum(src, i) < DARK) continue;         /* already keyline */
        const below = !inFrame(x, y + 1) || !solid(src, x, y + 1);
        if (below && y > maxY - HEM_ROWS) { hemKept++; continue; }
        d[i] = K[0]; d[i + 1] = K[1]; d[i + 2] = K[2]; d[i + 3] = 255;
        edged++;
      }
    }
  }
  /* coverage must not have moved by a single pixel */
  for (let i = 3; i < d.length; i += 4) {
    if ((d[i] >= 128) !== (src[i] >= 128)) throw new Error(`${name}: coverage changed at pixel ${(i - 3) / 4}`);
  }
  if (!DRY) writeFileSync(path, encode(img));
  return { name, frames: n, keyline: K, edged, unburied, hemKept };
}

for (const s of SHEETS) {
  const r = bake(s);
  console.log(`${r.name}: ${r.frames} frames, keyline rgb(${r.keyline.join(',')}), `
    + `${r.edged} edge px darkened, ${r.unburied} buried keyline px restored to shirt, ${r.hemKept} hem px kept`);
}
if (DRY) console.log('(dry run: nothing written)');
