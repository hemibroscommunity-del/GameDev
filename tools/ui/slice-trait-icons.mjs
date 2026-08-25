/* ═══ v2.3.1931: CUT THE TRAIT-PICKER TAB ICONS OUT OF THE OWNER'S SHEET ═══
 *
 * Owner: "swap out the trait picker icons with these (they're more consistent
 * art style)" — one 1535x1024 contact sheet, eight labelled tiles.
 *
 * WHY A TOOL AND NOT EIGHT HAND CROPS.  The sheet is the source of truth; if
 * the owner redraws it, this re-cuts all eight in one command and nothing has
 * to be re-eyeballed.  Same posture as tools/eyes/extract-eye-mask.mjs: derive
 * offline, review the output, ship data.
 *
 * ── WHAT IT HAS TO UNDO ──
 * The sheet is pixel art that has been UPSCALED by a non-integer factor: the
 * colour-change gaps measure ~11.5px, not 11 or 12.  Cropping it as-is would
 * ship art whose "pixels" are unevenly sized and whose edges carry the
 * resampling blur — the exact opposite of the consistency being asked for.
 * So each icon is resampled back onto its own native grid first (its width
 * divided by the nearest whole number of blocks), by taking the MEDIAN colour
 * of each block rather than its centre pixel, which ignores the blur that
 * lives at block boundaries.
 *
 * Then it is re-upscaled 8x with nearest neighbour.  That is deliberate and it
 * is what makes the icons render well: the tab paints them at 22-30 CSS px,
 * which is 44-90 device px on a phone, and 8x native (~160px) means the
 * browser always DOWNSCALES.  Shipping native ~20px instead and asking CSS to
 * upscale would land on a 4.5x nearest blow-up, where some blocks come out 4px
 * and some 5px — visibly uneven at this size.  Downscaling from a hard-edged
 * 8x source keeps the edges and avoids that entirely.
 *
 * The tile background becomes transparent (the tab wells are not this colour),
 * measured as distance from the sheet's own background rather than a hardcoded
 * value: the sheet is noisy (the flat backdrop spans ~40 distinct RGB values),
 * so an equality test would have kept most of it.
 *
 *   node tools/ui/slice-trait-icons.mjs <sheet.png> [--out public/ui/welcome/cc]
 */
import fs from 'node:fs';
import path from 'node:path';
import { decode, encode } from '../png.mjs';

const SRC = process.argv[2];
const outAt = process.argv.indexOf('--out');
const OUT = outAt > 0 ? process.argv[outAt + 1] : 'public/ui/welcome/cc';
if (!SRC) { console.error('usage: slice-trait-icons.mjs <sheet.png> [--out dir]'); process.exit(2); }

/* Tile grid, read off the sheet's own rims (see the session log); the inset
   clears the rounded rim so it is not mistaken for artwork. */
const CX = [[23, 410], [410, 769], [769, 1128], [1128, 1512]];
const CY = [[97, 498], [498, 895]];
const INSET = 38;
const NAMES = [['hair', 'hat', 'skin', 'eyes'], ['beard', 'shirt', 'pants', 'shoes']];
const BLOCK = 11.5;   /* measured upscale factor of the sheet */
const ZOOM = 8;
const BG = [13, 31, 41];
const FAR = 25;

const px = decode(fs.readFileSync(SRC));
const at = (x, y) => { const i = (y * px.width + x) * 4; return [px.data[i], px.data[i + 1], px.data[i + 2]]; };
const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
const far = (p) => dist(p, BG) > FAR;
const median = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];

fs.mkdirSync(OUT, { recursive: true });
const report = [];
for (let r = 0; r < 2; r++) {
  for (let c = 0; c < 4; c++) {
    const x0 = CX[c][0] + INSET, x1 = CX[c][1] - INSET;
    const y0 = CY[r][0] + INSET, y1 = CY[r][1] - INSET;
    /* The icon is the TOP band of content in the tile; the bottom band is the
       printed label, which is artwork on the sheet but not on the button. */
    const rows = [];
    for (let y = y0; y < y1; y++) {
      let n = 0;
      for (let x = x0; x < x1; x++) if (far(at(x, y))) n++;
      rows.push(n > 2);
    }
    const groups = [];
    for (let i = 0; i < rows.length; i++) {
      if (!rows[i]) continue;
      if (groups.length && i - groups[groups.length - 1].hi <= 6) groups[groups.length - 1].hi = i;
      else groups.push({ lo: i, hi: i });
    }
    const band = groups[0];
    let ax0 = Infinity, ax1 = -1;
    for (let y = y0 + band.lo; y <= y0 + band.hi; y++) {
      for (let x = x0; x < x1; x++) if (far(at(x, y))) { if (x < ax0) ax0 = x; if (x > ax1) ax1 = x; }
    }
    const ay0 = y0 + band.lo, ay1 = y0 + band.hi;
    const sw = ax1 - ax0 + 1, sh = ay1 - ay0 + 1;
    /* Fit the block grid to THIS icon rather than assuming a shared origin --
       each one was drawn at its own size and the 11.5 is an average. */
    const nw = Math.max(1, Math.round(sw / BLOCK)), nh = Math.max(1, Math.round(sh / BLOCK));
    const bw = sw / nw, bh = sh / nh;
    const nat = new Uint8ClampedArray(nw * nh * 4);
    for (let by = 0; by < nh; by++) {
      for (let bx = 0; bx < nw; bx++) {
        /* Median over the block's INNER half: the outer ring is where the
           non-integer upscale left blended pixels between two colours. */
        const px0 = Math.round(ax0 + bx * bw + bw * 0.25), px1 = Math.round(ax0 + bx * bw + bw * 0.75);
        const py0 = Math.round(ay0 + by * bh + bh * 0.25), py1 = Math.round(ay0 + by * bh + bh * 0.75);
        const R = [], G = [], B = [];
        for (let y = py0; y <= py1; y++) for (let x = px0; x <= px1; x++) {
          if (x < 0 || y < 0 || x >= px.width || y >= px.height) continue;
          const p = at(x, y); R.push(p[0]); G.push(p[1]); B.push(p[2]);
        }
        if (!R.length) continue;
        const col = [median(R), median(G), median(B)];
        const o = (by * nw + bx) * 4;
        if (dist(col, BG) <= FAR) { nat[o + 3] = 0; continue; }
        nat[o] = col[0]; nat[o + 1] = col[1]; nat[o + 2] = col[2]; nat[o + 3] = 255;
      }
    }
    /* nearest upscale, so the shipped file has hard edges to downscale from */
    const W = nw * ZOOM, H = nh * ZOOM;
    const big = new Uint8ClampedArray(W * H * 4);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const s = (Math.floor(y / ZOOM) * nw + Math.floor(x / ZOOM)) * 4, d = (y * W + x) * 4;
      big[d] = nat[s]; big[d + 1] = nat[s + 1]; big[d + 2] = nat[s + 2]; big[d + 3] = nat[s + 3];
    }
    const name = NAMES[r][c];
    const file = path.join(OUT, `cc-tab-${name}.png`);
    fs.writeFileSync(file, encode({ width: W, height: H, data: big }));
    let opaque = 0;
    for (let i = 3; i < nat.length; i += 4) if (nat[i]) opaque++;
    report.push(`${name.padEnd(6)} source ${sw}x${sh} -> native ${nw}x${nh} (${opaque}px) -> ${W}x${H}  ${(fs.statSync(file).size / 1024).toFixed(1)}KB`);
  }
}
console.log(report.join('\n'));
