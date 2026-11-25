#!/usr/bin/env node
/* ═══ v2.3.6640: THE CONTROLLER'S PIECES, CUT (card PAD) ═══
 *
 *   node tools/art/cut-pad.mjs            write the pieces and src/data/padArt.js
 *   node tools/art/cut-pad.mjs --dry      say what it would write
 *   node tools/art/cut-pad.mjs --list     the parts it finds on each sheet
 *   node tools/art/cut-pad.mjs --png DIR  and a copy of each picture in DIR (to look at)
 *
 * The owner, 2026-11-25: "Also want a redesign of the controls area to be
 * more like a controller. I attached a mockups (first and last attachments)
 * as well as the art assets in middle".  The four art sheets are kept byte
 * for byte in assets/icons-source/owner-2026-11-25/pad-art-0[1-4]-*.png
 * (ChatGPT's, see-through grounds, with red and yellow fringe specks).
 * The steps, the Talk pill's (tools/ui/cut-talk-pill.mjs) and the asset
 * door's (tools/assets/finish.mjs):
 *   1. DECODE a sheet (finish.mjs readRgba: no colour management).
 *   2. FIND ITS PARTS: every pixel at alpha SOLID_A or over, joined to its
 *      four neighbours; a part is picked by a point inside it (PICKS), never
 *      by its place in a list, so a speck found first moves nothing.
 *   3. CUT IT CLEAN: only the part's own pixels and a band of EDGE px round
 *      them (its anti-aliased edge) come along: the fringe specks, which sit
 *      apart from every part, are left on the sheet.  In that band a pixel
 *      the sheet painted red or yellow beside a part that is neither is the
 *      fringe again (fringe(), below) and goes.
 *   4. MEASURED: a housing's sockets are its gold rings (rings(), below), the
 *      stick housing's socket its see-through hole; the numbers go into
 *      src/data/padArt.js as shares of the picture, which game/padSkin.js
 *      lays the controls out by.
 *   5. SCALED to OUT_PX (2 px a CSS px at the biggest size drawn: the art
 *      law), by area on premultiplied colour (cut-talk-pill.mjs scaleArea).
 *   6. THE DOOR: 256 colours at most (quant256.js reduce256, the style
 *      pipeline's own colour step: public/tools/style/process.js), a palette
 *      PNG (encodePng), read back through the game's own reader (verifyPng),
 *      into public/ui/pad/.  controlsPreload.js warms them on the loading
 *      screen (PRELOADING IS LAW).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readRgba, encodePng, verifyPng } from '../assets/finish.mjs';
import { reduce256 } from '../../public/tools/style/quant256.js';
import { scaleArea } from '../ui/cut-talk-pill.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const SRC_DIR = 'assets/icons-source/owner-2026-11-25';
export const OUT_DIR = 'public/ui/pad';
export const DATA_OUT = 'src/data/padArt.js';
export const SHEETS = Object.freeze({
  stick: 'pad-art-01-stick.png', buttons: 'pad-art-02-buttons.png',
  attack: 'pad-art-03-attack.png', housings: 'pad-art-04-housings.png',
});
const SOLID_A = 128;   /* a part's own pixel */
/* COLOURS a picture: 96, under the law's 256.  On 256 the eighteen are 289 kB,
   on 128 214 kB, on 96 192 kB (the card: "aim under 200 kB of files in all"),
   on 64 167 kB; at 96 the bevels and the glow of the gold show no banding at
   2 px a CSS px (looked at side by side, --png). */
export const COLOURS = 96;
const EDGE = 3;        /* its anti-aliased edge, px of the sheet */
const MIN_AREA = 1500; /* smaller is a speck */
/* the faces and the stick's round pieces: drawn square (a circle) */
const ROUND = new Set(['ring', 'disc', 'knob', 'attack', 'attack-off', 'socket', 'jump', 'jump-off', 'block', 'block-off',
  'special', 'special-off', 'skate', 'skate-off', 'charge', 'charge-off']);

/* name: [sheet, a point inside the part (sheet px), the picture's width OUT (px),
   and for the buttons' touching columns the rows it lies between (bandOf)].
   OUT is 2 px a CSS px at the biggest size the game draws it (game/padSkin.js). */
export const PICKS = Object.freeze({
  'housing-r': ['housings', 1180, 470, 500],
  'housing-l': ['stick', 110, 1000, 334],   /* the stick's own housing, the socket a hole */
  'ring': ['stick', 495, 960, 196],
  'disc': ['stick', 900, 875, 178],
  'knob': ['stick', 1195, 950, 86],
  'attack': ['attack', 300, 60, 192],
  'attack-off': ['attack', 300, 760, 192],
  'socket': ['attack', 1140, 760, 192],
  'jump': ['buttons', 335, 86, 122, [9, 163]],
  'jump-off': ['buttons', 1110, 86, 122, [9, 163]],
  'block': ['buttons', 335, 235, 122, [163, 307]],
  'block-off': ['buttons', 1110, 235, 122, [163, 307]],
  'special': ['buttons', 335, 379, 122, [307, 452]],
  'special-off': ['buttons', 1110, 379, 122, [307, 452]],
  'skate': ['buttons', 335, 522, 122, [452, 592]],
  'skate-off': ['buttons', 1110, 522, 122, [452, 592]],
  'charge': ['buttons', 335, 661, 122, [592, 731]],
  'charge-off': ['buttons', 1110, 661, 122, [592, 731]],
});

/** step 2: the parts, 4-joined, at alpha SOLID_A or over: { lab, parts } */
export function partsOfSheet({ w, h, d }) {
  const lab = new Int32Array(w * h).fill(-1);
  const parts = [];
  const stack = [];
  for (let s = 0; s < w * h; s++) {
    if (lab[s] >= 0 || d[s * 4 + 3] < SOLID_A) continue;
    const p = { id: parts.length, x0: w, y0: h, x1: -1, y1: -1, n: 0 };
    lab[s] = p.id; stack.push(s);
    while (stack.length) {
      const q = stack.pop(), qx = q % w, qy = (q / w) | 0;
      p.n++;
      if (qx < p.x0) p.x0 = qx; if (qx > p.x1) p.x1 = qx; if (qy < p.y0) p.y0 = qy; if (qy > p.y1) p.y1 = qy;
      if (qx > 0 && lab[q - 1] < 0 && d[(q - 1) * 4 + 3] >= SOLID_A) { lab[q - 1] = p.id; stack.push(q - 1); }
      if (qx < w - 1 && lab[q + 1] < 0 && d[(q + 1) * 4 + 3] >= SOLID_A) { lab[q + 1] = p.id; stack.push(q + 1); }
      if (qy > 0 && lab[q - w] < 0 && d[(q - w) * 4 + 3] >= SOLID_A) { lab[q - w] = p.id; stack.push(q - w); }
      if (qy < h - 1 && lab[q + w] < 0 && d[(q + w) * 4 + 3] >= SOLID_A) { lab[q + w] = p.id; stack.push(q + w); }
    }
    parts.push(p);
  }
  return { lab, parts: parts.filter((p) => p.n >= MIN_AREA) };
}

/** the part holding (x, y), or the biggest part whose box holds it */
export function pickPart(sheet, found, x, y) {
  const at = found.lab[y * sheet.w + x];
  const hit = found.parts.find((p) => p.id === at);
  if (hit) return hit;
  const inBox = found.parts.filter((p) => x >= p.x0 && x <= p.x1 && y >= p.y0 && y <= p.y1);
  inBox.sort((a, b) => b.n - a.n);
  return inBox[0] || null;
}

/** a red or yellow speck: the sheet's fringe colours, saturated */
export function fringe(r, g, b) {
  const red = r > 150 && g < 80 && b < 80;
  const yellow = r > 200 && g > 200 && b < 90;
  return red || yellow;
}

/** the buttons' sheet draws each column's five buttons touching, one part:
 *  a row is the part between two cuts, each cut the row of the fewest own
 *  pixels within BAND_REFINE of the band's edge (where two rims meet) */
const BAND_REFINE = 14;
export function bandOf({ w }, lab, p, band) {
  const own = (y) => { let n = 0; for (let x = p.x0; x <= p.x1; x++) if (lab[y * w + x] === p.id) n++; return n; };
  const cut = (y, top) => {
    if ((top && y <= p.y0) || (!top && y >= p.y1)) return top ? p.y0 : p.y1;
    let best = y, bn = Infinity;
    for (let v = Math.max(p.y0, y - BAND_REFINE); v <= Math.min(p.y1, y + BAND_REFINE); v++) { const n = own(v); if (n < bn) { bn = n; best = v; } }
    return best;
  };
  return { y0: cut(band[0], true), y1: cut(band[1], false) };
}

/** step 3: the part and its edge band, cropped; the fringe out of the band.
 *  `rows` (bandOf) keeps only the part's own pixels between two rows. */
export function cutPart({ w, d }, lab, p0, rows) {
  const p = rows ? Object.assign({}, p0, { y0: rows.y0, y1: rows.y1 }) : p0;
  const inRows = (y) => !rows || (y >= rows.y0 && y <= rows.y1);
  const x0 = Math.max(0, p.x0 - EDGE), y0 = Math.max(0, p.y0 - EDGE);
  const x1 = Math.min(w - 1, p.x1 + EDGE), y1 = Math.min(((d.length / 4) / w) - 1, p.y1 + EDGE);
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1, o = new Uint8Array(cw * ch * 4);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = y * w + x;
    let own = lab[i] === p.id && inRows(y), band = false;
    if (!own) {
      for (let v = -EDGE; v <= EDGE && !band; v++) for (let u = -EDGE; u <= EDGE; u++) {
        const xx = x + u, yy = y + v;
        if (xx < 0 || yy < 0 || xx >= w || yy * w + xx >= lab.length) continue;
        if (lab[yy * w + xx] === p.id && inRows(yy)) { band = true; break; }
      }
      if (!band) continue;
      if (fringe(d[i * 4], d[i * 4 + 1], d[i * 4 + 2])) continue;
    }
    const k = ((y - y0) * cw + (x - x0)) * 4;
    o[k] = d[i * 4]; o[k + 1] = d[i * 4 + 1]; o[k + 2] = d[i * 4 + 2]; o[k + 3] = d[i * 4 + 3];
  }
  return { w: cw, h: ch, d: o };
}

/** the buttons' rows: the neighbour's rim can come along under a face, a
 *  sliver apart from it.  Keep the biggest piece (alpha SOLID_A or over,
 *  four-joined) and the pixels within EDGE of it; crop to them. */
export function keepBiggest(pic) {
  const { w, h, d } = pic;
  const found = partsOfSheet(pic);
  const big = found.parts.slice().sort((a, b) => b.n - a.n)[0];
  if (!big) return pic;
  return cutPart(pic, found.lab, big, null);
}

/** gold: the rings' and the rims' colour */
const gold = (r, g, b, a) => a > 200 && r > 110 && g > 55 && b < 120 && r > g + 20 && g > b + 15;

/** step 4: a housing's sockets, its gold rings: { cx, cy, d } as shares of
 *  the picture's width and height (d of the width), biggest last */
export function rings(pic) {
  const { w, h, d } = pic;
  const lab = new Int32Array(w * h).fill(-1);
  const out = [];
  const stack = [];
  for (let s = 0; s < w * h; s++) {
    if (lab[s] >= 0 || !gold(d[s * 4], d[s * 4 + 1], d[s * 4 + 2], d[s * 4 + 3])) continue;
    const p = { x0: w, y0: h, x1: -1, y1: -1, n: 0 };
    lab[s] = out.length; stack.push(s);
    while (stack.length) {
      const q = stack.pop(), qx = q % w, qy = (q / w) | 0;
      p.n++;
      if (qx < p.x0) p.x0 = qx; if (qx > p.x1) p.x1 = qx; if (qy < p.y0) p.y0 = qy; if (qy > p.y1) p.y1 = qy;
      for (const r of [q - 1, q + 1, q - w, q + w]) {
        if (r < 0 || r >= w * h || lab[r] >= 0) continue;
        if ((r === q - 1 && qx === 0) || (r === q + 1 && qx === w - 1)) continue;
        if (gold(d[r * 4], d[r * 4 + 1], d[r * 4 + 2], d[r * 4 + 3])) { lab[r] = out.length; stack.push(r); }
      }
    }
    out.push(p);
  }
  return out.filter((p) => {
    const bw = p.x1 - p.x0 + 1, bh = p.y1 - p.y0 + 1;
    /* a ring: square, a fifth of the picture or more across, hollow */
    return bw > w * 0.12 && Math.abs(bw - bh) < bw * 0.12 && p.n < bw * bh * 0.5 && bw < w * 0.8;
  }).map((p) => ({ cx: (p.x0 + p.x1 + 1) / 2 / w, cy: (p.y0 + p.y1 + 1) / 2 / h, d: (p.x1 - p.x0 + 1) / w }))
    .sort((a, b) => a.d - b.d);
}

/** step 4: the stick housing's hole -- the see-through pixels no path from
 *  the picture's edge reaches: { cx, cy, d } as shares */
export function hole(pic) {
  const { w, h, d } = pic;
  const out = new Uint8Array(w * h);
  const stack = [];
  const clear = (i) => d[i * 4 + 3] < SOLID_A;
  for (let x = 0; x < w; x++) for (const y of [0, h - 1]) { const i = y * w + x; if (clear(i) && !out[i]) { out[i] = 1; stack.push(i); } }
  for (let y = 0; y < h; y++) for (const x of [0, w - 1]) { const i = y * w + x; if (clear(i) && !out[i]) { out[i] = 1; stack.push(i); } }
  while (stack.length) {
    const q = stack.pop(), qx = q % w;
    for (const r of [q - 1, q + 1, q - w, q + w]) {
      if (r < 0 || r >= w * h || out[r] || !clear(r)) continue;
      if ((r === q - 1 && qx === 0) || (r === q + 1 && qx === w - 1)) continue;
      out[r] = 1; stack.push(r);
    }
  }
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let i = 0; i < w * h; i++) if (clear(i) && !out[i]) {
    const x = i % w, y = (i / w) | 0;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return x1 < 0 ? null : { cx: (x0 + x1 + 1) / 2 / w, cy: (y0 + y1 + 1) / 2 / h, d: (x1 - x0 + 1) / w };
}

const r4 = (v) => Math.round(v * 10000) / 10000;

async function main(argv) {
  const dry = argv.includes('--dry');
  const at = argv.indexOf('--png');
  const pngDir = at >= 0 ? argv[at + 1] : null;   /* a copy of each picture there, to look at */
  const sheets = Object.create(null);
  for (const k of Object.keys(SHEETS)) {
    const s = readRgba(path.join(REPO, SRC_DIR, SHEETS[k]));
    sheets[k] = { pic: s, found: partsOfSheet(s) };
  }
  if (argv.includes('--list')) {
    for (const k of Object.keys(sheets)) {
      console.log(k + ':');
      for (const p of sheets[k].found.parts) console.log(`  #${p.id} box ${p.x0},${p.y0} ${p.x1 - p.x0 + 1}x${p.y1 - p.y0 + 1} n ${p.n}`);
    }
    return;
  }
  const meta = Object.create(null);
  const outDir = path.join(REPO, OUT_DIR);
  if (!dry) fs.mkdirSync(outDir, { recursive: true });
  let total = 0;
  for (const name of Object.keys(PICKS)) {
    const [sk, px, py, W, band] = PICKS[name];
    const S = sheets[sk];
    const part = pickPart(S.pic, S.found, px, py);
    if (!part) throw new Error(`${name}: no part at ${px},${py} on ${SHEETS[sk]}`);
    const cut0 = cutPart(S.pic, S.found.lab, part, band ? bandOf(S.pic, S.found.lab, part, band) : null);
    const cut = band ? keepBiggest(cut0) : cut0;
    /* a face is round in its round socket: ChatGPT drew the small ones a
       little flatter than wide, so a face is scaled to a square */
    const H = ROUND.has(name) ? W : Math.round(W * cut.h / cut.w);
    const pic = scaleArea(cut, W, H);
    const r = reduce256(pic.d, W, H, { max: COLOURS });
    const png = await encodePng(r.idx, r.pal, W, H);
    await verifyPng(png, r.idx, r.pal, W, H, name);
    total += png.length;
    const m = { w: W, h: H, bytes: png.length };
    if (name === 'housing-r') m.sockets = rings(cut).map((s) => ({ cx: r4(s.cx), cy: r4(s.cy), d: r4(s.d) }));
    if (name === 'housing-l') { const o = hole(cut); m.hole = o && { cx: r4(o.cx), cy: r4(o.cy), d: r4(o.d) }; }
    if (name === 'ring' || name === 'disc' || name === 'knob') m.src = cut.w;   /* the sheet's own px across, for their sizes against the hole */
    if (name === 'housing-l') m.src = cut.w;
    meta[name] = m;
    console.log(`${name}: part #${part.id} ${cut.w}x${cut.h} -> ${W}x${H}, ${r.n} colours, ${png.length} bytes${m.sockets ? ' sockets ' + JSON.stringify(m.sockets) : ''}${m.hole ? ' hole ' + JSON.stringify(m.hole) : ''}`);
    if (!dry) fs.writeFileSync(path.join(outDir, name + '.png'), png);
    if (pngDir) fs.writeFileSync(path.join(pngDir, name + '.png'), png);
  }
  console.log(`total ${total} bytes`);
  if (dry) return;
  fs.writeFileSync(path.join(REPO, DATA_OUT), `/* GENERATED by tools/art/cut-pad.mjs (v2.3.6640, card PAD): never by hand.
   The controller's pieces (public/ui/pad/<name>.png), cut from the owner's four sheets
   (${SRC_DIR}): each one's size in px (2 px a CSS px at its biggest), its bytes, and
   what was measured on it -- the right housing's sockets and the stick housing's hole,
   as shares of the picture (cx, cy of its width and height; d of its width).
   game/padSkin.js lays the controls out by these. */
export const PAD_ART = ${JSON.stringify(meta, null, 2)};
export const PAD_ART_BYTES = ${total};
`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main(process.argv.slice(2));
