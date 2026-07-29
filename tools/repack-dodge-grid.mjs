/* Re-pack the ChatGPT-authored dodge-roll GRIDS into the game's horizontal
   player sheet format (v2.3.1534).

   The dodge roll was authored the same way the pickup/swing gear art was: an
   image model can't hold frame alignment across a 2304px-wide strip, so the
   nine frames were generated as a numbered 3x3 grid on a white background.
   This is the gridify step in reverse (cf. tools/repack-swing-grid.mjs).

   Three variants exist per direction -- bare body, t-shirt, steel plate --
   generated as re-skins of the SAME nine poses.  They are processed TOGETHER
   in one invocation on purpose: the scale factor and the per-frame placement
   offsets are derived ONCE from the body grid and applied verbatim to the
   other two.  Deriving them per-variant would drift the armour a few px off
   the body it has to sit on (measured: the plated frame 9 is 11px shorter in
   the feet than the bare one, tops identical), and the whole point of the
   three grids is that they layer.

   Two corrections happen here that the art can't do for itself:

   1. GROUND LINE.  A body in a forward roll never leaves the floor, but the
      generated ball frames (4-6) float 54-88px above the frames that bracket
      them.  Left alone the character visibly hops mid-roll.  Every frame's
      lowest opaque pixel is pinned to BASE_Y.
   2. IN-PLACE.  The engine supplies the travel (BroTown.jsx pushes the player
      6px/frame along the roll angle), so the art must not also translate or
      the motion doubles.  Every frame is centred on CENTER_X.

   Background keying is a flood fill from the cell border, NOT a global white
   threshold -- the t-shirt variant is a WHITE garment (gearCatalog stores the
   shirt slot white-base and tints it at runtime) and a global key would eat
   it.  Interior white stays because the figure's black keyline encloses it.

   Only the BODY strip lands in public/sprites/player -- that is the sheet
   playerSprites.js loads.  The t-shirt and plate strips are INTERMEDIATES for
   the gear pass (gearSheets wants per-slot chest/legs sheets, not a whole
   clothed figure) and go to --variant-out instead, because everything under
   public/ is copied verbatim into the deploy and would otherwise ship ~720KB
   of art that nothing fetches.

   Run:
     node tools/repack-dodge-grid.mjs south \
       --body=<grid.png> [--tshirt=<grid.png>] [--armor=<grid.png>] \
       [--out=public/sprites/player] [--variant-out=tools/dodge-src] \
       [--preview=<file.png>] [--dry-run]
*/
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { decode, encode } from './png.mjs';

/* ── canonical frame geometry ─────────────────────────────────────────────
   FRAME matches src/rendering/playerSprites.js FRAME_W/FRAME_H.  STAND_H and
   BASE_Y are measured off the shipped stand sheets so the rolled figure ends
   the animation at exactly the size and floor height the stand frame starts
   at -- frame 9 IS the handoff back to `stand`:
     stand-south.png  figure h=188, feet y=221
     stand-east.png   figure h=196, feet y=223
   (jog-south agrees: h=100 -> 200 logical, feet 114 -> 228 logical.) */
const FRAME = 256;
const STAND_H = 190;
const BASE_Y = 222;
const CENTER_X = 128;

const COLS = 3, ROWS = 3, CELLS = COLS * ROWS;
/* Skip the cell rule + its antialiasing before flood-filling. */
const INSET = 10;
/* The frame-number glyph lives in this corner box (cell-local px).  Used only
   to identify the label component, never to blank pixels outright -- frame 3's
   raised leg reaches high into the cell and must not be clipped. */
const LABEL_BOX = 120;
/* A pixel is background-white if every channel is at least this. */
const WHITE_MIN = 228;
/* Components smaller than this fraction of the largest are specks. */
const SPECK_FRAC = 0.02;

const argv = process.argv.slice(2);
const dir = argv.find(a => !a.startsWith('--'));
const flag = (n, d) => {
  const hit = argv.find(a => a.startsWith('--' + n + '='));
  return hit ? hit.slice(n.length + 3) : d;
};
const DRY = argv.includes('--dry-run');

if (!dir || !['south', 'southwest', 'east', 'northeast', 'north'].includes(dir)) {
  console.error('usage: node tools/repack-dodge-grid.mjs <south|southwest|east|northeast|north> --body=<grid.png> [--tshirt=…] [--armor=…]');
  process.exit(1);
}
const OUT_DIR = flag('out', 'public/sprites/player');
const VARIANT_OUT = flag('variant-out', 'tools/dodge-src');
const PREVIEW = flag('preview', null);

/* variant -> output suffix.  '' is the bare body sheet the renderer loads as
   the pose itself; the other two follow the existing bow-<dir>-armored.png
   naming so gearSheets can find them. */
const VARIANTS = [
  { key: 'body', suffix: '', path: flag('body', null) },
  { key: 'tshirt', suffix: '-tshirt', path: flag('tshirt', null) },
  { key: 'armor', suffix: '-armored', path: flag('armor', null) },
];
if (!VARIANTS[0].path) { console.error('--body=<grid.png> is required (it is the alignment reference)'); process.exit(1); }

/* ── cell extraction ──────────────────────────────────────────────────────
   Returns { w, h, rgba, mask } for one grid cell, already inset past the rule
   and keyed: mask[i] = 1 for figure, 0 for background/label/specks. */
function extractCell(img, idx) {
  const cw = Math.floor(img.width / COLS), chh = Math.floor(img.height / ROWS);
  const cx0 = (idx % COLS) * cw + INSET, cy0 = Math.floor(idx / COLS) * chh + INSET;
  const w = cw - INSET * 2, h = chh - INSET * 2;

  const rgba = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    const src = ((cy0 + y) * img.width + cx0) * 4;
    rgba.set(img.data.subarray(src, src + w * 4), y * w * 4);
  }

  /* Flood the white background inward from the border. */
  const isWhite = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = rgba[i * 4], g = rgba[i * 4 + 1], b = rgba[i * 4 + 2];
    isWhite[i] = (r >= WHITE_MIN && g >= WHITE_MIN && b >= WHITE_MIN) ? 1 : 0;
  }
  const bg = new Uint8Array(w * h);
  const stack = [];
  const push = (x, y) => {
    const i = y * w + x;
    if (!bg[i] && isWhite[i]) { bg[i] = 1; stack.push(i); }
  };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
  while (stack.length) {
    const i = stack.pop(), x = i % w, y = (i / w) | 0;
    if (x > 0) push(x - 1, y);
    if (x < w - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < h - 1) push(x, y + 1);
  }

  /* Label + speck removal by connected component.  The frame number is a
     small blob wholly inside the top-left box; anything tiny elsewhere is
     model noise. */
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) mask[i] = bg[i] ? 0 : 1;

  const lab = new Int32Array(w * h).fill(-1);
  const comps = [];
  for (let s = 0; s < w * h; s++) {
    if (!mask[s] || lab[s] >= 0) continue;
    const id = comps.length;
    const c = { area: 0, x0: 1e9, x1: -1, y0: 1e9, y1: -1 };
    lab[s] = id; const q = [s];
    while (q.length) {
      const i = q.pop(), x = i % w, y = (i / w) | 0;
      c.area++;
      if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x;
      if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y;
      const nb = [];
      if (x > 0) nb.push(i - 1);
      if (x < w - 1) nb.push(i + 1);
      if (y > 0) nb.push(i - w);
      if (y < h - 1) nb.push(i + w);
      for (const n of nb) if (mask[n] && lab[n] < 0) { lab[n] = id; q.push(n); }
    }
    comps.push(c);
  }
  const maxArea = comps.reduce((m, c) => Math.max(m, c.area), 0);
  const drop = comps.map(c =>
    c.area < maxArea * SPECK_FRAC ||
    (c.x1 < LABEL_BOX && c.y1 < LABEL_BOX));      /* wholly inside the label box */
  for (let i = 0; i < w * h; i++) if (mask[i] && drop[lab[i]]) mask[i] = 0;

  let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!mask[y * w + x]) continue;
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (x1 < 0) throw new Error('cell ' + (idx + 1) + ': no figure found after keying');
  return { w, h, rgba, mask, bbox: { x0, x1, y0, y1 } };
}

/* ── area-average resample into one 256x256 frame ─────────────────────────
   Alpha-weighted (premultiplied) so the keyed-out background can't bleed a
   dark halo into the figure's edge -- the same halo the *_dehalo tools exist
   to clean up after a naive downscale. */
function renderFrame(cell, scale, srcCx, srcBottom) {
  const out = Buffer.alloc(FRAME * FRAME * 4);
  /* Source point that must land at (CENTER_X, BASE_Y) in the output. */
  const inv = 1 / scale;
  for (let oy = 0; oy < FRAME; oy++) {
    const sy0 = (oy - BASE_Y) * inv + srcBottom;
    const sy1 = (oy + 1 - BASE_Y) * inv + srcBottom;
    for (let ox = 0; ox < FRAME; ox++) {
      const sx0 = (ox - CENTER_X) * inv + srcCx;
      const sx1 = (ox + 1 - CENTER_X) * inv + srcCx;
      let n = 0, aSum = 0, rSum = 0, gSum = 0, bSum = 0;
      const yA = Math.floor(sy0), yB = Math.max(yA + 1, Math.ceil(sy1));
      const xA = Math.floor(sx0), xB = Math.max(xA + 1, Math.ceil(sx1));
      for (let sy = yA; sy < yB; sy++) {
        if (sy < 0 || sy >= cell.h) { n++; continue; }
        for (let sx = xA; sx < xB; sx++) {
          if (sx < 0 || sx >= cell.w) { n++; continue; }
          n++;
          const i = sy * cell.w + sx;
          if (!cell.mask[i]) continue;
          aSum += 255;
          rSum += cell.rgba[i * 4]; gSum += cell.rgba[i * 4 + 1]; bSum += cell.rgba[i * 4 + 2];
        }
      }
      if (!n || aSum === 0) continue;
      const cov = aSum / 255;
      const o = (oy * FRAME + ox) * 4;
      out[o] = Math.round(rSum / cov);
      out[o + 1] = Math.round(gSum / cov);
      out[o + 2] = Math.round(bSum / cov);
      out[o + 3] = Math.round((aSum / n));
    }
  }
  return out;
}

/* ── run ──────────────────────────────────────────────────────────────────*/
const loaded = [];
for (const v of VARIANTS) {
  if (!v.path) continue;
  const img = decode(readFileSync(v.path));
  const cells = [];
  for (let i = 0; i < CELLS; i++) cells.push(extractCell(img, i));
  loaded.push({ ...v, img, cells });
  console.log(`${v.key.padEnd(6)} ${v.path.split('/').pop()}  ${img.width}x${img.height}`);
}

/* Scale + placement come from the BODY grid and are reused verbatim. */
const body = loaded[0];
const b9 = body.cells[8].bbox;
const scale = STAND_H / (b9.y1 - b9.y0);
console.log(`\nbody frame 9 stand height ${b9.y1 - b9.y0}px -> ${STAND_H}px  (scale ${scale.toFixed(4)})`);
console.log('\nfr  src bbox (w x h)   cx    bottom   ->  dy applied');
const place = body.cells.map((c, i) => {
  const { x0, x1, y0, y1 } = c.bbox;
  const p = { cx: (x0 + x1) / 2, bottom: y1 };
  console.log(`${String(i + 1).padStart(2)}  ${String(x1 - x0).padStart(4)} x ${String(y1 - y0).padStart(3)}      ` +
    `${p.cx.toFixed(0).padStart(4)}  ${String(y1).padStart(4)}     ` +
    `${((body.cells[8].bbox.y1 - y1) * scale).toFixed(1).padStart(6)}px down`);
  return p;
});

if (DRY) { console.log('\n--dry-run: no files written'); process.exit(0); }

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(VARIANT_OUT, { recursive: true });
const written = [];
for (const v of loaded) {
  const strip = Buffer.alloc(CELLS * FRAME * FRAME * 4);
  for (let i = 0; i < CELLS; i++) {
    const f = renderFrame(v.cells[i], scale, place[i].cx, place[i].bottom);
    for (let y = 0; y < FRAME; y++) {
      f.copy(strip, (y * CELLS * FRAME + i * FRAME) * 4, y * FRAME * 4, (y + 1) * FRAME * 4);
    }
  }
  const file = join(v.key === 'body' ? OUT_DIR : VARIANT_OUT, `dodge-${dir}${v.suffix}.png`);
  writeFileSync(file, encode({ width: CELLS * FRAME, height: FRAME, data: strip }));
  written.push({ file, strip });
  console.log(`wrote ${file}  ${CELLS * FRAME}x${FRAME}`);
}

/* Optional contact sheet: the nine output frames on a mid-grey checker with
   the BASE_Y ground line drawn, so the pin can be eyeballed. */
if (PREVIEW) {
  const P = FRAME, W = COLS * P, H = ROWS * P * written.length;
  const out = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    const x = i % W, y = (i / W) | 0;
    const c = (((x >> 4) + (y >> 4)) & 1) ? 64 : 48;
    out[i * 4] = c; out[i * 4 + 1] = c; out[i * 4 + 2] = c; out[i * 4 + 3] = 255;
  }
  written.forEach((wr, vi) => {
    for (let i = 0; i < CELLS; i++) {
      const gx = (i % COLS) * P, gy = (vi * ROWS + Math.floor(i / COLS)) * P;
      for (let y = 0; y < P; y++) for (let x = 0; x < P; x++) {
        const s = (y * CELLS * P + i * P + x) * 4, a = wr.strip[s + 3];
        const d = ((gy + y) * W + gx + x) * 4;
        if (a) for (let k = 0; k < 3; k++) out[d + k] = Math.round((wr.strip[s + k] * a + out[d + k] * (255 - a)) / 255);
      }
      for (let x = 0; x < P; x++) {                    /* ground line */
        const d = ((gy + BASE_Y) * W + gx + x) * 4;
        out[d] = 220; out[d + 1] = 60; out[d + 2] = 60;
      }
    }
  });
  mkdirSync(dirname(PREVIEW), { recursive: true });
  writeFileSync(PREVIEW, encode({ width: W, height: H, data: out }));
  console.log(`wrote ${PREVIEW}  ${W}x${H}  (red line = BASE_Y ${BASE_Y})`);
}
