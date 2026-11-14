#!/usr/bin/env node
/* ═══ v2.3.5500: THE LEADERBOARDS' NEW LOOK, CUT FROM THE OWNER'S SHEET ═══
 *
 * The owner, 2026-11-14: "I'd also like something more like this for
 * leaderboards (mockup and art assets attached)."  Card LB
 * (docs/plan/cards/LB.md), PR 1; docs/specs/leaderboard-look.md.
 *
 * THE SOURCE: assets/ui/leaderboard/art-sheet-2026-11-14.png, the owner's
 * bytes exactly (1536 x 1024; a signed record names ChatGPT, gpt-image;
 * tools/assets/sources.json holds its hash).  Never written over.
 *
 * THE SHEET IS ALREADY SEE-THROUGH.  What looks like a gold-and-slate
 * gradient behind the pieces is the colour left under pixels whose alpha is
 * 0 (565,671 of them); the pieces' glows are the soft alpha round each one.
 * So the cut is BY SHAPE, the sheet's own alpha: no colour is keyed out, and
 * nothing eats a glow.  (Premultiplied all the way, so the hidden gradient
 * never bleeds into a piece's edge when it is scaled.)
 *
 * THE CUT, for every piece in PIECES below:
 *   1. the CORES: 4-connected runs of alpha >= CORE_ALPHA (96), each the solid
 *      body of one picture.  A core belongs to the piece whose BOX holds its
 *      middle; a core of more than 200 pixels no box holds stops the run (a
 *      new sheet with a piece moved: say where it is in PIECES).
 *   2. the GLOWS: every pixel with any alpha is given to its nearest core
 *      (a breadth-first walk out from every core at once, through pixels
 *      with alpha), so two glows that touch are split down the middle, never
 *      cut by a straight box edge.  A speck no core reaches is dropped.
 *   3. a piece is its cores' pixels inside its box, trimmed to what shows.
 *      The sheet's solid is 253 (a ChatGPT export): alpha is lifted
 *      a' = min(255, round(a * 255 / 253)), so a solid body is solid.
 *   4. SCALED by its SCALE to the window's size at 2 picture px a CSS px
 *      (the card's reading): an area average of premultiplied colour.
 *   5. a BAR (a row or a pill) is kept as its two round ends and a strip of
 *      its middle (`ends` and `mid`, picture px), so the window stretches it
 *      to any width as a CSS border-image (`ends` is its slice): the same
 *      look in 96 px where the whole bar was 680.
 *   6. THE DOOR (tools/assets/finish.mjs, card P): each piece on its own 256
 *      colours or fewer (onColours: quant256; a glow's soft pixels get
 *      colours of their own), a palette PNG read back through the game's own
 *      reader (verifyPng: exactly the colours written), then a lossless WebP
 *      with its colour index (what the gate reads, shipped.mjs webpColours),
 *      and its row in tools/assets/shipped.json with `door`: the sheet's
 *      hash, the piece's box, its scale and its colours.
 *
 * Written to public/ui/leaderboard/<name>.webp (the family `ui-leaderboard`,
 * tools/assets/families.mjs).  Nothing draws them at tag 5500: the window
 * (card LB, PR 2) does.
 *
 *   node tools/ui/cut-leaderboard.mjs              cut every piece, write the files and rows
 *   node tools/ui/cut-leaderboard.mjs --dry        say what it would write
 *   node tools/ui/cut-leaderboard.mjs --contact <out.png>
 *                                                  also a contact sheet: every piece on the
 *                                                  window's slate and on white, at its size
 *   node tools/ui/cut-leaderboard.mjs --sheet <png>  a new sheet laid out the same way
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readRgba, onColours, encodePng, verifyPng, writeWebp } from '../assets/finish.mjs';
import { recordRows, webpColours, familiesOf } from '../assets/shipped.mjs';
import { toRgba } from '../../public/tools/style/quant256.js';

export const CUT_TAG = 'v2.3.5500';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const SHEET = 'assets/ui/leaderboard/art-sheet-2026-11-14.png';
export const OUT_DIR = 'public/ui/leaderboard';
export const FAMILY = 'ui-leaderboard';
const CORE_ALPHA = 96;       /* at 32 the four tiles' glows still join in pairs; at 96 every picture is its own */
const SPECK = 200;           /* a core smaller than this no box holds is a speck, not a picture */
const SOLID = 253;           /* the sheet's solid alpha */

/* THE PIECES.  box: [x, y, w, h] on the sheet, generous (a piece is its own
   cores' pixels inside it, never the box's edge); scale: picture px per
   sheet px, chosen for the CSS size the window draws it at, times two
   (`css` is the size that gives, glow included, for reading: half the
   picture; the mockups, assets/ui/leaderboard/, set the sizes).
   The sheet's second and third dark pills are the first again in look: one
   is cut (`pill-plain`), the other two are SKIPPED (their boxes hold them, so
   the run knows them, and nothing is written). */
export const PIECES = Object.freeze([
  /* the title */
  { name: 'title-frame', box: [190, 0, 745, 165], scale: 0.5, css: '184 x 41: the plate under a title' },
  { name: 'laurel-left', box: [975, 5, 112, 150], scale: 0.4, css: '20 x 27: beside the title' },
  { name: 'laurel-right', box: [1083, 5, 110, 150], scale: 0.4, css: '20 x 28: beside the title' },
  { name: 'crown', box: [1225, 5, 225, 150], scale: 0.2, css: '21 x 13: by the first name' },
  /* the podium: the three keep the sheet's sizes to each other (gold the largest) */
  { name: 'shield-silver', box: [85, 155, 375, 335], scale: 0.5, css: '89 x 80: second place' },
  { name: 'shield-gold', box: [445, 125, 455, 370], scale: 0.5, css: '112 x 88: first place' },
  { name: 'shield-bronze', box: [885, 170, 350, 320], scale: 0.5, css: '86 x 76: third place' },
  /* the rank column */
  { name: 'medal-1', box: [1255, 150, 165, 125], scale: 0.45, css: '34 x 26: rank 1' },
  { name: 'medal-2', box: [1258, 262, 160, 115], scale: 0.45, css: '32 x 25: rank 2' },
  { name: 'medal-3', box: [1258, 362, 160, 115], scale: 0.45, css: '32 x 25: rank 3' },
  { name: 'rosette-4', box: [1270, 470, 165, 170], scale: 0.4, css: '30 x 33: rank 4' },
  { name: 'rosette-5', box: [1272, 620, 165, 180], scale: 0.4, css: '28 x 34: rank 5' },
  /* the bars: the pills down the left, the table's rows (kept as their ends) */
  { name: 'pill-gold', box: [30, 482, 305, 100], scale: 0.75, ends: 40, mid: 16, css: 'any width x 35: the board showing' },
  { name: 'pill-plain', box: [30, 568, 300, 90], scale: 0.75, ends: 40, mid: 16, css: 'any width x 32: a board' },
  { name: 'bar-gold', box: [332, 485, 932, 95], scale: 0.75, ends: 40, mid: 16, css: 'any width x 32: row 1' },
  { name: 'bar-silver', box: [332, 566, 932, 92], scale: 0.75, ends: 40, mid: 16, css: 'any width x 32: row 2' },
  { name: 'bar-bronze', box: [332, 647, 932, 92], scale: 0.75, ends: 40, mid: 16, css: 'any width x 31: row 3' },
  { name: 'bar-plain', box: [332, 727, 932, 95], scale: 0.75, ends: 40, mid: 16, css: 'any width x 33: every other row' },
  /* the trophies */
  { name: 'trophy-gold', box: [10, 815, 210, 200], scale: 0.35, css: '34 x 34' },
  { name: 'trophy-silver', box: [215, 825, 180, 190], scale: 0.35, css: '29 x 32' },
  { name: 'trophy-bronze', box: [385, 835, 165, 180], scale: 0.35, css: '27 x 28' },
  /* the category tiles */
  { name: 'tile-crown', box: [562, 845, 150, 160], scale: 0.4, css: '30 x 30: Overall' },
  { name: 'tile-sword', box: [705, 845, 145, 160], scale: 0.4, css: '27 x 30: Melee' },
  { name: 'tile-bow', box: [843, 845, 145, 160], scale: 0.4, css: '28 x 30: Bow' },
  { name: 'tile-staff', box: [978, 845, 155, 160], scale: 0.4, css: '30 x 30: Magic' },
  /* the dividers */
  { name: 'divider-gold', box: [1145, 845, 360, 72], scale: 0.5, css: '87 x 14' },
  { name: 'divider-silver', box: [1145, 920, 360, 65], scale: 0.5, css: '86 x 13' },
]);

export const SKIPPED = Object.freeze([
  { name: 'pill-plain (again)', box: [30, 650, 300, 90] },
  { name: 'pill-plain (a third time)', box: [30, 731, 300, 92] },
]);

/* ---- 1-2. cores, and every glow to its nearest core ---------------------- */

/** label the cores (4-connected, alpha >= CORE_ALPHA); then walk out from all
 *  of them at once through pixels with alpha: own[p] is the core that reached
 *  p first (0: none).  Returns { own, cores: [{ n, x0, y0, x1, y1 }] (index
 *  = label - 1) }. */
export function ownership(a, w, h) {
  const core = new Int32Array(w * h);
  const cores = [];
  const q = new Int32Array(w * h);
  for (let s = 0; s < w * h; s++) {
    if (core[s] || a[s] < CORE_ALPHA) continue;
    const id = cores.length + 1;
    let head = 0, tail = 0;
    q[tail++] = s; core[s] = id;
    const c = { n: 0, x0: w, y0: h, x1: -1, y1: -1 };
    while (head < tail) {
      const p = q[head++], x = p % w, y = (p / w) | 0;
      c.n++;
      if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x; if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y;
      if (x > 0 && !core[p - 1] && a[p - 1] >= CORE_ALPHA) { core[p - 1] = id; q[tail++] = p - 1; }
      if (x < w - 1 && !core[p + 1] && a[p + 1] >= CORE_ALPHA) { core[p + 1] = id; q[tail++] = p + 1; }
      if (y > 0 && !core[p - w] && a[p - w] >= CORE_ALPHA) { core[p - w] = id; q[tail++] = p - w; }
      if (y < h - 1 && !core[p + w] && a[p + w] >= CORE_ALPHA) { core[p + w] = id; q[tail++] = p + w; }
    }
    cores.push(c);
  }
  /* the glows: one breadth-first walk from every core pixel at once */
  const own = core;
  let head = 0, tail = 0;
  for (let p = 0; p < w * h; p++) if (own[p]) q[tail++] = p;
  while (head < tail) {
    const p = q[head++], id = own[p], x = p % w, y = (p / w) | 0;
    if (x > 0 && !own[p - 1] && a[p - 1] > 0) { own[p - 1] = id; q[tail++] = p - 1; }
    if (x < w - 1 && !own[p + 1] && a[p + 1] > 0) { own[p + 1] = id; q[tail++] = p + 1; }
    if (y > 0 && !own[p - w] && a[p - w] > 0) { own[p - w] = id; q[tail++] = p - w; }
    if (y < h - 1 && !own[p + w] && a[p + w] > 0) { own[p + w] = id; q[tail++] = p + w; }
  }
  return { own, cores };
}

/** which piece each core belongs to: the piece whose box holds its middle */
export function claimCores(cores, pieces = PIECES) {
  const claim = new Int32Array(cores.length + 1).fill(-1);
  const stray = [];
  cores.forEach((c, i) => {
    const mx = (c.x0 + c.x1) / 2, my = (c.y0 + c.y1) / 2;
    const k = pieces.findIndex((p) => mx >= p.box[0] && mx < p.box[0] + p.box[2] && my >= p.box[1] && my < p.box[1] + p.box[3]);
    if (k >= 0) claim[i + 1] = k;
    else if (c.n > SPECK) stray.push({ x: c.x0, y: c.y0, w: c.x1 - c.x0 + 1, h: c.y1 - c.y0 + 1, n: c.n });
  });
  return { claim, stray };
}

/* ---- 3. a piece out of the sheet ------------------------------------------- */

/** the piece `k`: its own pixels inside its box (premultiplied floats), trimmed
 *  to what shows.  Returns { w, h, d: Float64Array RGBA premultiplied 0..1,
 *  at: [x, y] on the sheet }. */
export function liftPiece(sheet, own, claim, k, piece) {
  const [bx, by, bw, bh] = piece.box;
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (let y = by; y < by + bh && y < sheet.h; y++) {
    for (let x = bx; x < bx + bw && x < sheet.w; x++) {
      const p = y * sheet.w + x;
      if (sheet.d[p * 4 + 3] > 0 && own[p] && claim[own[p]] === k) {
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) throw new Error(`${piece.name}: nothing of it inside its box ${piece.box.join(',')}`);
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const d = new Float64Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = (y0 + y) * sheet.w + (x0 + x);
      if (!own[p] || claim[own[p]] !== k) continue;
      const s = p * 4, o = (y * w + x) * 4;
      const al = Math.min(255, Math.round(sheet.d[s + 3] * 255 / SOLID)) / 255;
      d[o] = sheet.d[s] / 255 * al; d[o + 1] = sheet.d[s + 1] / 255 * al; d[o + 2] = sheet.d[s + 2] / 255 * al; d[o + 3] = al;
    }
  }
  return { w, h, d, at: [x0, y0] };
}

/* ---- 4. scaled: an area average ------------------------------------------- */

/** one axis of an area average: `n` samples of `src` (stride, count `m`) into
 *  `dw` cells, each the mean of the sheet pixels it covers (partly covered
 *  ones by how much) */
function weights(m, dw) {
  const f = m / dw, out = [];
  for (let i = 0; i < dw; i++) {
    const a = i * f, b = (i + 1) * f, ws = [];
    for (let j = Math.floor(a); j < Math.min(m, Math.ceil(b)); j++) {
      const cov = Math.min(b, j + 1) - Math.max(a, j);
      if (cov > 1e-9) ws.push([j, cov / f]);
    }
    out.push(ws);
  }
  return out;
}
/** premultiplied RGBA floats w x h -> dw x dh, area-averaged */
export function areaScale(pic, dw, dh) {
  const { w, h, d } = pic;
  const wx = weights(w, dw), wy = weights(h, dh);
  const mid = new Float64Array(dw * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < dw; x++) {
      const o = (y * dw + x) * 4;
      for (const [j, c] of wx[x]) { const s = (y * w + j) * 4; for (let k = 0; k < 4; k++) mid[o + k] += d[s + k] * c; }
    }
  }
  const out = new Float64Array(dw * dh * 4);
  for (let y = 0; y < dh; y++) {
    for (const [j, c] of wy[y]) {
      for (let x = 0; x < dw; x++) {
        const o = (y * dw + x) * 4, s = (j * dw + x) * 4;
        for (let k = 0; k < 4; k++) out[o + k] += mid[s + k] * c;
      }
    }
  }
  return { w: dw, h: dh, d: out };
}

/* ---- 5. a bar kept as its ends --------------------------------------------- */

/** the left `ends` px, `mid` px from the middle, the right `ends` px */
export function keepEnds(pic, ends, mid) {
  const { w, h, d } = pic;
  if (w < ends * 2 + mid) return pic;
  const ow = ends * 2 + mid, out = new Float64Array(ow * h * 4);
  const m0 = Math.floor((w - mid) / 2);
  const from = (x) => (x < ends ? x : x < ends + mid ? m0 + (x - ends) : w - ow + x);
  for (let y = 0; y < h; y++) for (let x = 0; x < ow; x++) {
    const s = (y * w + from(x)) * 4, o = (y * ow + x) * 4;
    for (let k = 0; k < 4; k++) out[o + k] = d[s + k];
  }
  return { w: ow, h, d: out };
}

/** premultiplied floats -> straight RGBA bytes (a see-through pixel 0,0,0,0) */
export function toBytes(pic) {
  const { w, h, d } = pic, out = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h * 4; i += 4) {
    const al = Math.min(1, Math.max(0, d[i + 3]));
    const A = Math.round(al * 255);
    if (A === 0) continue;
    for (let k = 0; k < 3; k++) out[i + k] = Math.max(0, Math.min(255, Math.round(d[i + k] / al * 255)));
    out[i + 3] = A;
  }
  return { w, h, d: out };
}

/* ---- the whole cut --------------------------------------------------------- */

/** every piece of the sheet, finished to bytes (not yet on its colours) */
export function cutSheet(file = SHEET, pieces = PIECES) {
  const sheet = readRgba(path.resolve(REPO, file));
  const a = new Uint8Array(sheet.w * sheet.h);
  for (let p = 0; p < a.length; p++) a[p] = sheet.d[p * 4 + 3];
  const { own, cores } = ownership(a, sheet.w, sheet.h);
  const { claim, stray } = claimCores(cores, [...pieces, ...SKIPPED]);
  if (stray.length) throw new Error(`a picture on the sheet no piece's box holds: ${stray.map((s) => `${s.w}x${s.h} at ${s.x},${s.y}`).join('; ')} (say where it goes in PIECES)`);
  const got = new Set(); for (let i = 1; i < claim.length; i++) if (claim[i] >= 0) got.add(claim[i]);
  const missing = pieces.filter((_, k) => !got.has(k)).map((p) => p.name);
  if (missing.length) throw new Error(`no picture inside the box of ${missing.join(', ')}`);
  return pieces.map((piece, k) => {
    const lifted = liftPiece(sheet, own, claim, k, piece);
    const dw = Math.max(1, Math.round(lifted.w * piece.scale)), dh = Math.max(1, Math.round(lifted.h * piece.scale));
    let pic = areaScale(lifted, dw, dh);
    if (piece.ends) pic = keepEnds(pic, piece.ends, piece.mid);
    return { piece, cut: [lifted.at[0], lifted.at[1], lifted.w, lifted.h], scaled: [dw, dh], ...toBytes(pic) };
  });
}

/* ---- the contact sheet: every piece on the window's slate and on white ------ */

function contact(results, out) {
  const pad = 12, rowsW = 1100;
  const place = []; let x = pad, y = pad, rowH = 0;
  for (const r of results) {
    if (x + r.w * 2 + pad * 3 > rowsW) { x = pad; y += rowH + pad; rowH = 0; }
    place.push([x, y]); x += r.w * 2 + pad * 3; rowH = Math.max(rowH, r.h);
  }
  const W = rowsW, H = y + rowH + pad;
  const d = new Uint8Array(W * H * 4);
  for (let p = 0; p < W * H; p++) { d[p * 4] = 0x1b; d[p * 4 + 1] = 0x24; d[p * 4 + 2] = 0x2e; d[p * 4 + 3] = 255; }
  results.forEach((r, i) => {
    const [px, py] = place[i];
    for (const [ox, bg] of [[0, null], [r.w + pad, [255, 255, 255]]]) {
      for (let yy = 0; yy < r.h; yy++) for (let xx = 0; xx < r.w; xx++) {
        const s = (yy * r.w + xx) * 4, o = ((py + yy) * W + px + ox + xx) * 4, al = r.shown[s + 3] / 255;
        for (let k = 0; k < 3; k++) {
          const under = bg ? bg[k] : d[o + k];
          d[o + k] = Math.round(r.shown[s + k] * al + under * (1 - al));
        }
      }
    }
  });
  /* written truecolour (ffmpeg), so the contact sheet itself adds no banding */
  const raw = `${out}.rgba`;
  fs.writeFileSync(raw, d);
  try { execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-i', raw, out]); }
  finally { fs.rmSync(raw, { force: true }); }
}

/* ---- the command ------------------------------------------------------------ */

const sha = (b) => createHash('sha256').update(b).digest('hex');

async function main(argv) {
  const dry = argv.includes('--dry');
  const ci = argv.indexOf('--contact'), contactOut = ci >= 0 ? argv[ci + 1] : null;
  const si = argv.indexOf('--sheet'), sheetFile = si >= 0 ? argv[si + 1] : SHEET;
  const src = fs.readFileSync(path.resolve(REPO, sheetFile));
  const results = cutSheet(sheetFile);
  const rows = [];
  let decoded = 0, onDisk = 0;
  for (const r of results) {
    const out = `${OUT_DIR}/${r.piece.name}.webp`;
    const fams = familiesOf(out);
    if (fams.length !== 1 || fams[0].name !== FAMILY) throw new Error(`${out} is not an address of ${FAMILY} (tools/assets/families.mjs)`);
    /* 6. the door's steps: on its colours, a palette PNG read back by the game's reader, a WebP with its colour index */
    const c = onColours([r]);
    const idx = c.idx[0];
    const png = await encodePng(idx, c.pal, r.w, r.h);
    await verifyPng(png, idx, c.pal, r.w, r.h, out);
    r.shown = toRgba(idx, c.pal);
    decoded += r.w * r.h * 4;
    const line = `  ${r.piece.name.padEnd(15)} sheet ${r.cut.join(',').padEnd(18)} x${r.piece.scale} -> ${`${r.w}x${r.h}`.padEnd(8)} ${String(c.n).padStart(3)} colours${c.exact ? '' : `, moved ${c.err.toFixed(4)}`}`;
    if (dry) { console.log(`${line} (dry)`); continue; }
    fs.mkdirSync(path.resolve(REPO, OUT_DIR), { recursive: true });
    const abs = path.resolve(REPO, out);
    let ix = null;
    for (const m of [6, 5, 4, 3, 2, 1, 0]) { writeWebp(png, abs, m); if ((ix = webpColours(fs.readFileSync(abs)))) break; }
    if (!ix) { fs.rmSync(abs); throw new Error(`${out}: libwebp kept no colour index at any effort`); }
    const bytes = fs.statSync(abs).size;
    onDisk += bytes;
    console.log(`${line}, ${bytes} bytes`);
    rows.push({ path: out, door: {
      tool: 'tools/ui/cut-leaderboard.mjs', tag: CUT_TAG,
      sources: [{ path: sheetFile, sha256: sha(src), bytes: src.length }],
      recipe: { cut: 'by the sheet\'s own alpha (cores at 96, glows to the nearest core)', box: r.cut, scale: r.piece.scale,
        ...(r.piece.ends ? { ends: r.piece.ends, mid: r.piece.mid } : {}),
        bundle: null, colours: c.n, exact: c.exact, moved: +c.err.toFixed(4), encoder: 'webp lossless (PIL), colour index', px: '2 picture px a CSS px' },
    } });
  }
  console.log(`${results.length} pieces; ${(decoded / 1024).toFixed(0)} KB decoded if all were shown at once${dry ? '' : `, ${(onDisk / 1024).toFixed(1)} KB on disk`}.`);
  if (rows.length) { recordRows(rows); console.log(`tools/assets/shipped.json: ${rows.length} rows written by the cut.`); }
  if (contactOut) { contact(results, path.resolve(contactOut)); console.log(`contact sheet: ${contactOut}`); }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2)).catch((e) => { console.error(`cut-leaderboard: ${e.message}`); process.exit(2); });
}
