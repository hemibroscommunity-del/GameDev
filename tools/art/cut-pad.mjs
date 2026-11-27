#!/usr/bin/env node
/* ═══ v2.3.6641: THE CONTROLLER'S PIECES (card PAD part 3: ONE housing) ═══
 *
 *   node tools/art/cut-pad.mjs            write the pieces and src/data/padArt.js
 *   node tools/art/cut-pad.mjs --dry      say what it would write
 *   node tools/art/cut-pad.mjs --png DIR  and a copy of each picture in DIR (to look at)
 *
 * The owner, 2026-11-25, after trying part 1's two grips on their iPhone:
 * "The controller is too large and doesn't connect in a seamless way to the
 * dashboard. The shape also doesn't make much sense. Here's a redesign
 * showing how it should attach to the dashboard."  With it eighteen pieces,
 * one picture each, and layout.json (each control's centre and size in a
 * 920 x 280 reference): kept byte for byte in
 * assets/icons-source/owner-2026-11-25-pad3/.  Part 1's four sheets and the
 * pieces cut from them are gone from the repo (the card's reading 8).
 * v2.3.6645 (card PAD part 10): the owner, 2026-11-26, with ONE new sheet of
 * the whole controller in a steel-blue rim: "Also swap out the control color
 * with this one. I don't like the gold."  The pieces are CUT off that sheet
 * (assets/icons-source/owner-2026-11-26-pad4/sheet.png, each one's box in
 * its layout.json, read off the sheet's own alpha) and drawn at part 3's
 * sizes, so nothing that lays them out moves.  Four are not on the sheet and
 * are made from its pieces (layout.json `from`): the weapon wells' three
 * icons, the weapon lifted off its Attack face (glyph(), below), and the
 * dimmed Attack, the sword's face greyed as the owner's pad3 one was (dim():
 * its own grey measured off pad3's pair, kept in that folder).
 * The steps (the asset door's, tools/assets/finish.mjs):
 *   1. DECODE the sheet (finish.mjs readRgba: no colour management) and CUT
 *      each piece by its box (a disc by a circle in its box: the stick's
 *      base and the shield touch on the sheet).
 *   2. SCALED to OUT (2 px a CSS px at the biggest size the game draws it:
 *      the art law), by area on premultiplied colour (cut-talk-pill.mjs
 *      scaleArea).  The housing is drawn into the reference's own 920 x 280
 *      (its picture is wider than the reference, and the owner's previews
 *      draw it so: preview_town.png), so its OUT is 2 x that at 430 px.
 *   3. MEASURED: the housing's dark inside, read off its rim (inside(),
 *      below), in reference units -- what game/padSkin.js checks every well
 *      against (the card's "clear of the outline").
 *   4. THE DOOR: 256 colours at most (quant256.js reduce256, the style
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
export const SRC_DIR = 'assets/icons-source/owner-2026-11-26-pad4';   /* v2.3.6645: the steel sheet */
export const OUT_DIR = 'public/ui/pad';
export const DATA_OUT = 'src/data/padArt.js';
/* COLOURS a picture, under the law's 256 (the card: "aim under 200 kB in all") */
export const COLOURS = 128;
/* the reference's px a CSS px at the biggest drawn (430 / 920), and 2 px a CSS px */
const K = 2 * 430 / 920;

/* name: [its size in the reference (layout.json's of 2026-11-25, or the size
   it is drawn at: the shield at the big button's, the icons inside a weapon
   well)].  OUT is K x that, rounded; an icon's OUT is part 3's own (FIXED:
   the card's "same names, same sizes"), the weapon fitted inside it.  Where
   each is cut: SRC_DIR's layout.json. */
export const PIECES = Object.freeze({
  'housing': [920, 280],
  'socket': [140, 140],   /* the empty well, drawn at the big buttons' size too */
  'stick-base': [178, 178],
  'stick-thumb': [86, 86],
  'slot': [88, 88],
  'slot-on': [88, 88],
  'icon-sword': [52, 0],
  'icon-bow': [52, 0],
  'icon-staff': [52, 0],
  'skate': [80, 80],
  'charge': [80, 80],
  'special': [80, 80],
  'shield': [140, 140],   /* the big left button's in a fight (the card's reading 4) */
  'jump': [140, 140],
  'attack-sword': [140, 140],
  'attack-bow': [140, 140],
  'attack-staff': [140, 140],
  'attack-off': [140, 140],
});
/* v2.3.6645: the icons at part 3's px (their pad3 pictures' own shapes) */
const FIXED = Object.freeze({ 'icon-sword': [49, 50], 'icon-bow': [49, 56], 'icon-staff': [49, 54] });

/** step 1: a box of the sheet; `round`, a disc: alpha outside the circle
 *  inscribed in the box cut away (1 px soft) */
export function crop(sheet, [x0, y0, w, h], round) {
  const d = new Uint8Array(w * h * 4);
  const cx = w / 2, cy = h / 2, rx = w / 2, ry = h / 2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = ((y0 + y) * sheet.w + x0 + x) * 4, o = (y * w + x) * 4;
    d[o] = sheet.d[i]; d[o + 1] = sheet.d[i + 1]; d[o + 2] = sheet.d[i + 2]; d[o + 3] = sheet.d[i + 3];
    if (round) {
      const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry;
      const edge = (1 - Math.sqrt(u * u + v * v)) * Math.min(rx, ry);   /* px inside the rim */
      if (edge < 1) d[o + 3] = Math.round(d[o + 3] * Math.max(0, edge));
    }
  }
  return { w, h, d };
}

/** a weapon well's icon: the weapon lifted off its Attack face.  Its CORE
 *  is what no red face is: the gold (green well over blue), the steel (grey,
 *  light, never warmer than 6 over its blue: the face's gloss is pink-white;
 *  a speck of it, under 0.4% of the inner disc, is the gloss's glint)
 *  light) and the gem (blue); its dark outline and shadow are what lies
 *  within NEAR px of the core.  Inside the face's rim (0.78 of its radius;
 *  the steel starts at 0.82) and near the core, a pixel is the weapon's
 *  unless it is the face's RED or its pink gloss (red over green by 60 and
 *  more, green and blue within 25 of each other), a blend between; then
 *  cut to the weapon's own box. */
const NEAR = 5;
export function glyph(face) {
  const { w, h } = face, d = new Uint8Array(face.d), cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2;
  const cl = (v) => Math.min(1, Math.max(0, v));
  const core = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) {
    const r = d[p * 4], g = d[p * 4 + 1], b = d[p * 4 + 2];
    const x = p % w, y = (p - x) / w;
    core[p] = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) < R * 0.78 &&
      ((g - b > 40 && r > 80) || (Math.abs(r - g) < 25 && Math.abs(g - b) < 30 && r > 90 && b >= r - 6) || (b > r + 20 && b > 80)) ? 1 : 0;
  }
  /* the gloss's white glints are specks: a core piece under MIN_PART of the
     inner disc is no weapon's (the bow's string pieces are 0.8% and more) */
  const minPart = 0.004 * Math.PI * (R * 0.78) ** 2, seen = new Uint8Array(w * h);
  for (let p0 = 0; p0 < w * h; p0++) {
    if (!core[p0] || seen[p0]) continue;
    const part = [p0]; seen[p0] = 1;
    for (let k = 0; k < part.length; k++) {
      const p = part[k], x = p % w;
      for (const q of [p - w, p + w, x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1]) {
        if (q >= 0 && q < w * h && core[q] && !seen[q]) { seen[q] = 1; part.push(q); }
      }
    }
    if (part.length < minPart) for (const p of part) core[p] = 0;
  }
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, r = d[i], g = d[i + 1], b = d[i + 2];
    let near = false;
    for (let v = Math.max(0, y - NEAR); v <= Math.min(h - 1, y + NEAR) && !near; v++) {
      for (let u = Math.max(0, x - NEAR); u <= Math.min(w - 1, x + NEAR); u++) if (core[v * w + u]) { near = true; break; }
    }
    const inDisc = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) < R * 0.78;
    const red = cl((r - g - 35) / 25) * cl((45 - Math.abs(g - b)) / 20);
    d[i + 3] = inDisc && near ? Math.round(d[i + 3] * (1 - red)) : 0;
    if (d[i + 3] > 24) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  }
  return crop({ w, h, d }, [x0, y0, x1 - x0 + 1, y1 - y0 + 1], false);
}

/** the dimmed Attack: the face greyed, as the owner's pad3 pair measured
 *  (attack_sword_disabled.png's grey is 1.02 x the face's brightness - 9,
 *  a little cool: -4, -1, +3) */
export function dim(face) {
  const d = new Uint8Array(face.d);
  for (let i = 0; i < d.length; i += 4) {
    const L = 1.02 * (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) - 9;
    d[i] = Math.max(0, Math.min(255, Math.round(L - 4)));
    d[i + 1] = Math.max(0, Math.min(255, Math.round(L - 1)));
    d[i + 2] = Math.max(0, Math.min(255, Math.round(L + 3)));
  }
  return { w: face.w, h: face.h, d };
}

/** an icon fitted inside its FIXED box, its shape kept, centred */
function contain(pic, W, H) {
  const k = Math.min(W / pic.w, H / pic.h), w = Math.max(1, Math.round(pic.w * k)), h = Math.max(1, Math.round(pic.h * k));
  const s = scaleArea(pic, w, h), d = new Uint8Array(W * H * 4), ox = Math.floor((W - w) / 2), oy = Math.floor((H - h) / 2);
  for (let y = 0; y < h; y++) d.set(s.d.subarray(y * w * 4, (y + 1) * w * 4), ((oy + y) * W + ox) * 4);
  return { w: W, h: H, d };
}

/** a pixel of the outline: part 3's gold (bright, warm) or, v2.3.6645, the
 *  steel (any hue, its brightest channel over 90: the bevel's dark inner
 *  edge is the rim's, as the gold's was) */
function gold(d, i) { return d[i + 3] > 128 && ((d[i] > 140 && d[i + 1] > 90 && d[i] > d[i + 2] + 40) || (Math.max(d[i], d[i + 1], d[i + 2]) > 90)); }
/** a pixel of the housing's dark inside (navy) */
function navy(d, i) { return d[i + 3] > 200 && d[i] < 90 && d[i + 1] < 100 && d[i + 2] < 120 && d[i + 2] >= d[i]; }

/** v2.3.6645: the inside starts where the navy HOLDS (3 px on, `by` bytes a
 *  step): one dark speck in the steel's sparkle is no inside (a column read
 *  1.1 for the lobe's 21.4 without it) */
function navy3(d, i, by) { return navy(d, i) && navy(d, i + by) && navy(d, i + 2 * by); }
/** and the rim is a rim where it HOLDS 2 px on: a lone bright speck over the
 *  steel's dark outer stroke is not it (that stroke would read as inside) */
function gold3(d, i, by) { return gold(d, i) && gold(d, i + by); }

/** step 3: the housing's inside, in reference units (920 x 280): for every
 *  STEP columns the first inside row under the gold from the top (`top`),
 *  and the inside's left, right and bottom at the rail's height. */
export const STEP = 10;
export function inside(pic, refW, refH) {
  const { w, h, d } = pic, fx = refW / w, fy = refH / h;
  const top = [];
  for (let rx = 0; rx <= refW; rx += STEP) {
    const x = Math.min(w - 1, Math.round(rx / fx));
    let y = 0, seen = false, at = -1;
    for (; y < h; y++) {
      const i = (y * w + x) * 4;
      if (gold3(d, i, w * 4)) seen = true;
      else if (seen && navy3(d, i, w * 4)) { at = y; break; }
    }
    top.push(at < 0 ? null : Math.round(at * fy * 10) / 10);
  }
  const row = Math.round(h * 0.8);   /* the rail's height: under the dip */
  const scan = (from, to, dir) => {
    let seen = false;
    for (let x = from; x !== to; x += dir) {
      const i = (row * w + x) * 4;
      if (gold3(d, i, dir * 4)) seen = true;
      else if (seen && navy3(d, i, dir * 4)) return x;
    }
    return -1;
  };
  const L = scan(0, w, 1), R = scan(w - 1, -1, -1);
  const col = Math.round(w / 2);
  let B = -1, seen = false;
  for (let y = h - 1; y >= 0; y--) {
    const i = (y * w + col) * 4;
    if (gold3(d, i, -w * 4)) seen = true;
    else if (seen && navy3(d, i, -w * 4)) { B = y; break; }
  }
  const r1 = (v) => Math.round(v * 10) / 10;
  /* a column outside the inside's left and right is no column of it (the
     scan down the gold side found the corner's navy) */
  const left = r1(L * fx), right = r1((w - 1 - R) * fx);
  for (let i = 0; i < top.length; i++) if (i * STEP < left || i * STEP > refW - right) top[i] = null;
  return { step: STEP, top, left, right, bottom: r1((h - 1 - B) * fy) };
}

async function main(argv) {
  const dry = argv.includes('--dry');
  const at = argv.indexOf('--png');
  const pngDir = at >= 0 ? argv[at + 1] : null;
  const meta = Object.create(null);
  const outDir = path.join(REPO, OUT_DIR);
  if (!dry) fs.mkdirSync(outDir, { recursive: true });
  let total = 0;
  /* v2.3.6645: every piece off the one sheet, by its layout.json row */
  const lay = JSON.parse(fs.readFileSync(path.join(REPO, SRC_DIR, 'layout.json'), 'utf8'));
  const sheet = readRgba(path.join(REPO, SRC_DIR, lay.sheet));
  const cut = (name) => {
    const row = lay.pieces[name];
    if (!row) throw new Error(`cut-pad: ${name} has no row in ${SRC_DIR}/layout.json`);
    if (row.box) return crop(sheet, row.box, !!row.round);
    const face = cut(row.from);
    return row.make === 'glyph' ? glyph(face) : dim(face);
  };
  for (const name of Object.keys(PIECES)) {
    const [rw, rh] = PIECES[name];
    const src = cut(name);
    let W = Math.round(rw * K);
    /* an icon keeps its own shape inside part 3's box (FIXED); every other
       piece is drawn in its reference box (a face square, the housing the
       reference's) */
    let H = Math.round(rh * K), pic;
    if (FIXED[name]) { [W, H] = FIXED[name]; pic = contain(src, W, H); } else pic = scaleArea(src, W, H);
    const r = reduce256(pic.d, W, H, { max: COLOURS });
    const png = await encodePng(r.idx, r.pal, W, H);
    await verifyPng(png, r.idx, r.pal, W, H, name);
    total += png.length;
    const m = { w: W, h: H, bytes: png.length };
    if (name === 'housing') m.inside = inside(pic, rw, rh);
    meta[name] = m;
    console.log(`${name}: ${src.w}x${src.h} -> ${W}x${H}, ${r.n} colours, ${png.length} bytes`);
    if (!dry) fs.writeFileSync(path.join(outDir, name + '.png'), png);
    if (pngDir) fs.writeFileSync(path.join(pngDir, name + '.png'), png);
  }
  console.log(`total ${total} bytes`);
  if (dry) return;
  fs.writeFileSync(path.join(REPO, DATA_OUT), `/* GENERATED by tools/art/cut-pad.mjs (v2.3.6641, card PAD part 3; v2.3.6645 part 10, the steel sheet): never by hand.
   The controller's pieces (public/ui/pad/<name>.png), cut from the owner's sheet
   (${SRC_DIR}): each one's size in px (2 px a CSS px at its biggest) and its
   bytes, and the housing's dark inside in the reference's units (920 x 280):
   game/padSkin.js lays the controls out and checks them against it. */
export const PAD_ART = ${JSON.stringify(meta)};
export const PAD_ART_BYTES = ${total};
`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main(process.argv.slice(2));
