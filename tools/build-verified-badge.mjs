/* Key + scale the owner's "verified Hemi Bro" badge into a HUD icon (v2.3.1576).
 *
 * v2.3.1576: first piece of the onchain Hemi Bro ownership work (Tier 0).
 *
 * Source is a 1242px pixel-art badge on a SOLID BLACK field.  The black is
 * flood-filled inward from the border rather than keyed globally, because the
 * art's own keylines are the same black -- a global key would hollow out every
 * outline in the badge.  Same reason tools/repack-dodge-grid.mjs floods from
 * the cell border.
 *
 * Emitted at 64px so it stays crisp on a 3x iPhone panel while the name pill
 * draws it at ~11px (entityRenderer _attachNamePill).
 *
 * Run: node tools/build-verified-badge.mjs <source.png> [--out=path] [--size=64]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { decode, encode } from './png.mjs';

const argv = process.argv.slice(2);
const SRC = argv.find(a => !a.startsWith('--'));
const flag = (n, d) => { const h = argv.find(a => a.startsWith('--' + n + '=')); return h ? h.slice(n.length + 3) : d; };
const OUT = flag('out', 'public/icons/ui/verified-bro.png');
const SIZE = parseInt(flag('size', '64'), 10);
/* --crop=x0,y0,x1,y1 in source pixels.  The small variant's source sheet also
   carries a size ladder and its px labels underneath the real art; cropping to
   the art band keeps the keyer from trimming to the whole sheet. */
const CROP = flag('crop', null);
/* A pixel is background-black if every channel is at or under this.  The
   badge's darkest art pixel measures well above it (the keylines carry the
   art's own shading), so this only claims the field. */
const BLACK_MAX = 42;

if (!SRC) { console.error('usage: node tools/build-verified-badge.mjs <source.png> [--out=…] [--size=64]'); process.exit(1); }

const img = decode(readFileSync(SRC));
const { width: W, height: H, data } = img;
console.log(`source ${W}x${H}`);
/* Region the keyer is allowed to see.  Everything outside is treated as
   background, so a trim lands on the art alone. */
const [CX0, CY0, CX1, CY1] = CROP
  ? CROP.split(',').map((n) => parseInt(n, 10))
  : [0, 0, W, H];
if (CROP) console.log(`crop      x ${CX0}..${CX1}  y ${CY0}..${CY1}`);

/* ── flood the black field inward from the border ────────────────────────── */
const inCrop = (i) => { const x = i % W, y = (i / W) | 0; return x >= CX0 && x < CX1 && y >= CY0 && y < CY1; };
const isBlack = (i) => !inCrop(i)
  || (data[i * 4] <= BLACK_MAX && data[i * 4 + 1] <= BLACK_MAX && data[i * 4 + 2] <= BLACK_MAX);
const bg = new Uint8Array(W * H);
const stack = [];
const seed = (x, y) => {
  const i = y * W + x;
  if (!bg[i] && isBlack(i)) { bg[i] = 1; stack.push(i); }
};
for (let x = 0; x < W; x++) { seed(x, 0); seed(x, H - 1); }
for (let y = 0; y < H; y++) { seed(0, y); seed(W - 1, y); }
while (stack.length) {
  const i = stack.pop(), x = i % W, y = (i / W) | 0;
  if (x > 0) seed(x - 1, y);
  if (x < W - 1) seed(x + 1, y);
  if (y > 0) seed(x, y - 1);
  if (y < H - 1) seed(x, y + 1);
}

/* ── trim to the art ─────────────────────────────────────────────────────── */
let x0 = W, x1 = -1, y0 = H, y1 = -1;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (bg[y * W + x]) continue;
  if (x < x0) x0 = x; if (x > x1) x1 = x;
  if (y < y0) y0 = y; if (y > y1) y1 = y;
}
const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
console.log(`art bbox ${cw}x${ch} at (${x0},${y0})  — ${(100 * (1 - (cw * ch) / (W * H))).toFixed(1)}% of the canvas was field`);

/* ── area-average downscale into a square, aspect preserved ──────────────── */
const scale = SIZE / Math.max(cw, ch);
const outW = SIZE, outH = SIZE;
const dx = (SIZE - cw * scale) / 2, dy = (SIZE - ch * scale) / 2;
const out = Buffer.alloc(outW * outH * 4);
for (let oy = 0; oy < outH; oy++) {
  for (let ox = 0; ox < outW; ox++) {
    const sx0 = x0 + (ox - dx) / scale, sx1 = x0 + (ox + 1 - dx) / scale;
    const sy0 = y0 + (oy - dy) / scale, sy1 = y0 + (oy + 1 - dy) / scale;
    let n = 0, aSum = 0, rSum = 0, gSum = 0, bSum = 0;
    const xa = Math.floor(sx0), xb = Math.max(xa + 1, Math.ceil(sx1));
    const ya = Math.floor(sy0), yb = Math.max(ya + 1, Math.ceil(sy1));
    for (let sy = ya; sy < yb; sy++) for (let sx = xa; sx < xb; sx++) {
      n++;
      if (sx < 0 || sx >= W || sy < 0 || sy >= H) continue;
      const i = sy * W + sx;
      if (bg[i]) continue;                       /* field: contributes alpha 0 */
      aSum += 255; rSum += data[i * 4]; gSum += data[i * 4 + 1]; bSum += data[i * 4 + 2];
    }
    if (!n || !aSum) continue;
    const cov = aSum / 255, o = (oy * outW + ox) * 4;
    out[o] = Math.round(rSum / cov);
    out[o + 1] = Math.round(gSum / cov);
    out[o + 2] = Math.round(bSum / cov);
    out[o + 3] = Math.round(aSum / n);           /* partial coverage at the edge */
  }
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, encode({ width: outW, height: outH, data: out }));
let opaque = 0;
for (let i = 0; i < outW * outH; i++) if (out[i * 4 + 3] > 8) opaque++;
console.log(`wrote ${OUT}  ${outW}x${outH}  (${opaque}px opaque, ${(100 * opaque / (outW * outH)).toFixed(0)}% fill)`);

/* v2.3.2068: the badge SHIPS as verified-bro-small.webp (entityRenderer loads
   that path), so the PNG this local encoder can write is an intermediate.
   Converted lossless — the badge is 64px pixel art whose keylines the name
   pill draws at ~11px, and lossy measured 6.3/255 mean on its opaque pixels. */
if (OUT.startsWith('public/icons/')) {
  const r = spawnSync('python3', ['tools/webp_icons.py', '--convert'], { stdio: 'inherit' });
  if (r.status !== 0) {
    console.error('!! webp conversion failed — run: python3 tools/webp_icons.py --convert');
    process.exitCode = 1;
  }
}
