#!/usr/bin/env node
/* ═══ v2.3.6787: THE CHARACTER HUD'S PIECES (card UI3, PR 8) ═══
 *
 *   node tools/art/cut-hud.mjs            write the pieces, src/data/hudArt.js and layout.json
 *   node tools/art/cut-hud.mjs --dry      say what it would write
 *   node tools/art/cut-hud.mjs --png DIR  and a copy of each picture in DIR (to look at)
 *
 * The owner, 2026-11-26 (20:3x UTC), with ONE picture: "Use these art assets
 * for a new compact hud in top left and weapon xp bar".  The picture is kept
 * byte for byte at assets/icons-source/owner-2026-11-26-hud/sheet.png (2172 x
 * 724, its ground already see-through): the TOP row is the HUD assembled (the
 * layout copied: who overlaps whom, the gaps, the sizes against each other),
 * the BOTTOM row the loose pieces, which are what is cut.
 * The steps (cut-pad.mjs's, with the style pipeline's own finder):
 *   1. DECODE the sheet (finish.mjs readRgba: no colour management).
 *   2. FOUND: the sheet's eight objects by their own alpha
 *      (public/tools/style/process.js objectBoxes, the style lab's finder),
 *      each box then fitted to its pixels (alpha over half).
 *   3. MEASURED on the top row, by its own alpha: the face ring's width, the
 *      weapon ring's, the track's height, the green fill's and the pill's.
 *      Each piece's size in the game is its top-row size times K (the face
 *      ring drawn 48 CSS px), so the pieces keep the owner's proportions.
 *   4. KEYED: the face ring's dark disc made see-through (a flood from the
 *      middle over the disc's navy, stopping at the black line inside the
 *      steel), so the player's own face shows under the rim; the sword is
 *      taken out of the sword ring (inside the ring's hole, the navy out).
 *   5. SCALED to 2 px a CSS px (the art law), by area on premultiplied colour
 *      (cut-talk-pill.mjs scaleArea).
 *   6. THE DOOR: 256 colours at most (quant256.js reduce256, the style
 *      pipeline's colour step), a palette PNG read back through the game's own
 *      reader (verifyPng), into public/ui/hud/.  controlsPreload.js warms
 *      them on the loading screen (PRELOADING IS LAW).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readRgba, encodePng, verifyPng } from '../assets/finish.mjs';
import { reduce256 } from '../../public/tools/style/quant256.js';
import { objectBoxes } from '../../public/tools/style/process.js';
import { scaleArea } from '../ui/cut-talk-pill.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const SRC = 'assets/icons-source/owner-2026-11-26-hud/sheet.png';
export const LAYOUT = 'assets/icons-source/owner-2026-11-26-hud/layout.json';
export const OUT_DIR = 'public/ui/hud';
export const DATA_OUT = 'src/data/hudArt.js';
/* colours a picture, under the law's 256 (the pad's number) */
export const COLOURS = 128;
/* the face ring is drawn 48 CSS px (the card's table) */
export const FACE_CSS = 48;

const solid = (d, i) => d[i + 3] > 128;

/** a box fitted to its own pixels (alpha over half) */
function fit(s, b) {
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) {
    if (solid(s.d, (y * s.w + x) * 4)) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** a piece cut out: its own RGBA (nearly solid made solid: the sheet's
 *  "solid" is 250-254, which would leave the HUD faintly see-through) */
function crop(s, b) {
  const d = new Uint8Array(b.w * b.h * 4);
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
    const i = ((b.y + y) * s.w + (b.x + x)) * 4, o = (y * b.w + x) * 4;
    d[o] = s.d[i]; d[o + 1] = s.d[i + 1]; d[o + 2] = s.d[i + 2];
    d[o + 3] = s.d[i + 3] >= 240 ? 255 : s.d[i + 3];
  }
  return { w: b.w, h: b.h, d };
}

/** the disc's navy (the rings' dark inside; never the black line that
 *  edges the steel, nor the sword's grey, white or gold) */
function navy(d, i) {
  const r = d[i], g = d[i + 1], b = d[i + 2];
  return d[i + 3] > 128 && r < 40 && g < 90 && b < 110 && b >= 15 && b > r + 8;
}

/** step 4: the face ring's disc made see-through, by a flood from the middle */
function keyDisc(p) {
  const { w, h, d } = p, seen = new Uint8Array(w * h);
  const st = [((h >> 1) * w) + (w >> 1)];
  while (st.length) {
    const k = st.pop();
    if (seen[k]) continue;
    seen[k] = 1;
    if (!navy(d, k * 4)) continue;
    d[k * 4 + 3] = 0;
    const x = k % w, y = (k / w) | 0;
    if (x > 0) st.push(k - 1);
    if (x < w - 1) st.push(k + 1);
    if (y > 0) st.push(k - w);
    if (y < h - 1) st.push(k + w);
  }
  return p;
}

/** the hole's radius in a ring, as a share of its half width: the first
 *  non-navy pixel from the middle, four ways (the empty ring: nothing in it) */
function holeShare(p) {
  const { w, h, d } = p, cx = w >> 1, cy = h >> 1;
  const run = (dx, dy) => { let n = 0; for (;; n++) { const x = cx + dx * n, y = cy + dy * n; if (x < 0 || y < 0 || x >= w || y >= h || !navy(d, (y * w + x) * 4)) return n; } };
  const r = Math.min(run(1, 0), run(-1, 0), run(0, 1), run(0, -1));
  return r / (w / 2);
}

/** step 4: the sword alone, out of the sword ring: inside the hole, the navy out */
function swordOf(p, share) {
  const { w, h, d } = p, cx = (w - 1) / 2, cy = (h - 1) / 2, R = share * (w / 2) * 0.9;   /* inside the hole, clear of the steel's glints */
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (Math.hypot(x - cx, y - cy) > R || navy(d, i)) d[i + 3] = 0;
  }
  /* a glint of the disc's shine left loose is no part of the sword: only the
     pieces at least a tenth of the biggest stay */
  const lab = new Int32Array(w * h).fill(-1), size = [];
  for (let k = 0; k < w * h; k++) {
    if (lab[k] >= 0 || d[k * 4 + 3] === 0) continue;
    const id = size.length; let n = 0; const st = [k]; lab[k] = id;
    while (st.length) {
      const q = st.pop(); n++;
      const x = q % w, y = (q / w) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const X = x + dx, Y = y + dy, j = Y * w + X;
        if (X < 0 || Y < 0 || X >= w || Y >= h || lab[j] >= 0 || d[j * 4 + 3] === 0) continue;
        lab[j] = id; st.push(j);
      }
    }
    size.push(n);
  }
  const keep = Math.max(...size) / 10;
  for (let k = 0; k < w * h; k++) if (lab[k] >= 0 && size[lab[k]] < keep) d[k * 4 + 3] = 0;
  return p;
}

/** a picture trimmed to its own pixels, then set in a square of side S
 *  (kept its shape, in the middle) */
function inSquare(p, S) {
  const b = fit(p, { x: 0, y: 0, w: p.w, h: p.h });
  const c = crop(p, b);
  const k = S / Math.max(c.w, c.h), W = Math.max(1, Math.round(c.w * k)), H = Math.max(1, Math.round(c.h * k));
  const sm = scaleArea(c, W, H), d = new Uint8Array(S * S * 4);
  const ox = (S - W) >> 1, oy = (S - H) >> 1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4, o = ((oy + y) * S + ox + x) * 4;
    d[o] = sm.d[i]; d[o + 1] = sm.d[i + 1]; d[o + 2] = sm.d[i + 2]; d[o + 3] = sm.d[i + 3];
  }
  return { w: S, h: S, d };
}

/** runs of a column (y0..y1) where `is` holds: [[from, to], ...] */
function runs(s, x, y0, y1, is) {
  const out = [];
  let at = -1;
  for (let y = y0; y <= y1; y++) {
    const on = is(s.d, (y * s.w + x) * 4);
    if (on && at < 0) at = y;
    if (!on && at >= 0) { out.push([at, y - 1]); at = -1; }
  }
  if (at >= 0) out.push([at, y1]);
  return out;
}
const bright = (d, i) => d[i + 3] > 128 && d[i] > 110 && d[i + 1] > 140 && d[i + 2] > 170;
const green = (d, i) => d[i + 3] > 128 && d[i + 1] > 120 && d[i + 1] > d[i] + 40 && d[i + 1] > d[i + 2] + 40;

/** steps 2 and 3: the sheet's objects, named, and the top row measured */
export function survey(s) {
  const found = objectBoxes(s.d, s.w, s.h, 8).boxes.map((b) => fit(s, b));
  if (found.length !== 8) throw new Error(`the sheet: ${found.length} objects found, 8 wanted`);
  /* the top row: the two that start above the sheet's middle; the bottom
     row: the six others, left to right */
  const mid = s.h / 2;
  const top = found.filter((b) => b.y < mid * 0.6).sort((a, b) => a.x - b.x);
  const bottom = found.filter((b) => b.y >= mid * 0.6).sort((a, b) => a.x - b.x);
  if (top.length !== 2 || bottom.length !== 6) throw new Error(`the sheet: rows of ${top.length} and ${bottom.length}, 2 and 6 wanted`);
  const [faceGroup, bar] = top;
  const [swordRing, pill, track, fill, badge, ring] = bottom;
  /* the face ring's width: its widest row above the badge */
  let face = 0, faceY = 0;
  for (let y = faceGroup.y; y < faceGroup.y + faceGroup.h * 0.6; y++) {
    let a = -1, b2 = -1;
    for (let x = faceGroup.x; x < faceGroup.x + faceGroup.w; x++) if (solid(s.d, (y * s.w + x) * 4)) { if (a < 0) a = x; b2 = x; }
    if (b2 - a + 1 > face) { face = b2 - a + 1; faceY = y; }
  }
  /* the weapon ring: the tallest column in the bar's first fifth; the track:
     a column at the bar's middle; the fill: the green in a column a third in;
     the pill: the second bright run (its upper rim) to the second-last (its
     lower), in a column 8 % from the bar's right end */
  let wring = 0;
  for (let x = bar.x; x < bar.x + bar.w / 5; x++) {
    const r = runs(s, x, bar.y, bar.y + bar.h - 1, solid);
    if (r.length) wring = Math.max(wring, r[r.length - 1][1] - r[0][0] + 1);
  }
  const midX = Math.round(bar.x + bar.w / 2);
  const tr = runs(s, midX, bar.y, bar.y + bar.h - 1, solid);
  const trackH = tr[tr.length - 1][1] - tr[0][0] + 1;
  const gr = runs(s, Math.round(bar.x + bar.w / 3), bar.y, bar.y + bar.h - 1, green);
  const fillH = gr.length ? gr[gr.length - 1][1] - gr[0][0] + 1 : 0;
  const pr = runs(s, Math.round(bar.x + bar.w * 0.92), bar.y, bar.y + bar.h - 1, bright);
  /* (at the bar's right end the pill's rim IS the track's inner rim: its
     first bright run to its last) */
  const pillH = pr.length >= 2 ? pr[pr.length - 1][1] - pr[0][0] + 1 : 0;
  /* the badge in the top row: its gold, under the ring's middle */
  const gold = (d, i) => d[i + 3] > 128 && d[i] > 150 && d[i + 1] > 90 && d[i] > d[i + 2] + 60;
  const gx = Math.round(faceGroup.x + faceGroup.w / 2);
  const gl = runs(s, gx, faceGroup.y, faceGroup.y + faceGroup.h - 1, gold);
  const badgeBottom = gl.length ? gl[gl.length - 1][1] : 0;
  const faceTop = faceGroup.y;
  /* its width: the widest gold row in its lower part (from its first gold
     to its last; the face's skin reads as gold too, higher up) */
  let bx0 = -1, bx1 = -2;
  for (let y = badgeBottom - 150; y <= badgeBottom; y++) {
    let a = -1, b2 = -1;
    for (let x = faceGroup.x; x < faceGroup.x + faceGroup.w; x++) if (gold(s.d, (y * s.w + x) * 4)) { if (a < 0) a = x; b2 = x; }
    if (a >= 0 && b2 - a > bx1 - bx0) { bx0 = a; bx1 = b2; }
  }
  const badgeW = bx1 - bx0 + 1;
  /* its top: by the loose badge's own shape (the face's skin reads as gold
     too, so the column's first gold is not the badge's) */
  const badgeTop = Math.round(badgeBottom - badgeW * badge.h / badge.w);
  return {
    boxes: { faceGroup, bar, swordRing, pill, track, fill, badge, ring },
    top: { face, faceY, faceTop, wring, trackH, fillH, pillH, badgeTop, badgeBottom, badgeW, barW: bar.w,
      gapFaceBar: bar.x - (faceGroup.x + face) },
  };
}

async function main(argv) {
  const dry = argv.includes('--dry');
  const at = argv.indexOf('--png');
  const pngDir = at >= 0 ? argv[at + 1] : null;
  const s = readRgba(path.join(REPO, SRC));
  const { boxes: B, top: T } = survey(s);
  /* K: CSS px a sheet px (the top row's), and 2 file px a CSS px */
  const K = FACE_CSS / T.face;
  const px2 = (sheetPx) => Math.round(sheetPx * K * 2);
  const share = holeShare(crop(s, B.ring));
  /* each piece: its picture and its file size (W from the top row's
     measure, H by its own shape, or a square) */
  const make = {
    'face-ring': () => { const W = px2(T.face); return scaleArea(keyDisc(crop(s, B.ring)), W, W); },
    'badge': () => { const c = crop(s, B.badge); const W = px2(T.badgeW); return scaleArea(c, W, Math.round(W * c.h / c.w)); },
    'wring': () => { const W = px2(T.wring); return scaleArea(crop(s, B.ring), W, W); },
    'wicon-sword': () => inSquare(swordOf(crop(s, B.swordRing), share), 36),
    'track': () => { const c = crop(s, B.track); const H = px2(T.trackH); return scaleArea(c, Math.round(H * c.w / c.h), H); },
    'fill': () => { const c = crop(s, B.fill); const H = px2(T.fillH); return scaleArea(c, Math.round(H * c.w / c.h), H); },
    'pill': () => { const c = crop(s, B.pill); const H = px2(T.pillH); return scaleArea(c, Math.round(H * c.w / c.h), H); },
  };
  const meta = Object.create(null);
  const outDir = path.join(REPO, OUT_DIR);
  if (!dry) fs.mkdirSync(outDir, { recursive: true });
  let total = 0;
  for (const name of Object.keys(make)) {
    const pic = make[name]();
    const { w: W, h: H } = pic;
    const r = reduce256(pic.d, W, H, { max: COLOURS });
    const png = await encodePng(r.idx, r.pal, W, H);
    await verifyPng(png, r.idx, r.pal, W, H, name);
    total += png.length;
    const m = { w: W, h: H, bytes: png.length };
    /* the face's hole (file px, from the middle), what the face fills under the rim */
    if (name === 'face-ring') m.hole = Math.round(share * W / 2 * 10) / 10;
    /* a stretched piece's slice: its round end, half its height (file px) */
    if (name === 'track' || name === 'fill' || name === 'pill') m.slice = Math.ceil(H / 2);
    meta[name] = m;
    console.log(`${name}: -> ${W}x${H}, ${r.n} colours, ${png.length} bytes`);
    if (!dry) fs.writeFileSync(path.join(outDir, name + '.png'), png);
    if (pngDir) fs.writeFileSync(path.join(pngDir, name + '.png'), png);
  }
  /* the top row in CSS px (K): what game/hudArt.js lays the group out by */
  const css = (v) => Math.round(v * K * 10) / 10;
  const row = {
    face: css(T.face), wring: css(T.wring), track: css(T.trackH), fill: css(T.fillH), pill: css(T.pillH),
    badge: css(T.badgeW), bar: css(T.barW), gap: css(T.gapFaceBar),
    badgeOver: css((T.faceTop + T.face) - T.badgeTop), badgeBelow: css(T.badgeBottom - (T.faceTop + T.face)),
  };
  console.log(`total ${total} bytes; the top row in CSS px: ${JSON.stringify(row)}`);
  if (dry) return;
  fs.writeFileSync(path.join(REPO, LAYOUT), JSON.stringify({
    note: 'v2.3.6787: written by tools/art/cut-hud.mjs. Each object on sheet.png (px, fitted to its own alpha), and the top row as measured (sheet px).',
    boxes: B, top: T, K, row,
  }, null, 1) + '\n');
  fs.writeFileSync(path.join(REPO, DATA_OUT), `/* GENERATED by tools/art/cut-hud.mjs (v2.3.6787, card UI3 PR 8): never by hand.
   The character HUD's pieces (public/ui/hud/<name>.png), cut from the owner's
   sheet of 2026-11-26 (${SRC}): each one's size in file px (2 px a CSS px),
   its bytes, the face ring's hole and a stretched piece's slice (file px);
   ROW is the sheet's top row (the HUD assembled) in CSS px, the face ring at
   ${FACE_CSS}: game/hudArt.js lays the group out by it. */
export const HUD_ART_PIECES = ${JSON.stringify(meta)};
export const HUD_ART_ROW = ${JSON.stringify(row)};
export const HUD_ART_BYTES = ${total};
`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main(process.argv.slice(2));
