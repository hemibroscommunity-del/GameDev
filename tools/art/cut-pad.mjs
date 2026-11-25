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
 * The steps (the asset door's, tools/assets/finish.mjs):
 *   1. DECODE a piece (finish.mjs readRgba: no colour management).
 *   2. SCALED to OUT (2 px a CSS px at the biggest size the game draws it:
 *      the art law), by area on premultiplied colour (cut-talk-pill.mjs
 *      scaleArea).  The housing is drawn into the reference's own 920 x 280
 *      (its picture is wider than the reference, and the owner's previews
 *      draw it so: preview_town.png), so its OUT is 2 x that at 430 px.
 *   3. MEASURED: the housing's dark inside, read off the gold outline
 *      (inside(), below), in reference units -- what game/padSkin.js checks
 *      every well against (the card's "clear of the outline").
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
export const SRC_DIR = 'assets/icons-source/owner-2026-11-25-pad3';
export const OUT_DIR = 'public/ui/pad';
export const DATA_OUT = 'src/data/padArt.js';
/* COLOURS a picture, under the law's 256 (the card: "aim under 200 kB in all") */
export const COLOURS = 128;
/* the reference's px a CSS px at the biggest drawn (430 / 920), and 2 px a CSS px */
const K = 2 * 430 / 920;

/* name: [the owner's file, its size in the reference (layout.json's, or the
   size it is drawn at: the shield at the big button's, the icons inside a
   weapon well)].  OUT is K x that, rounded. */
export const PIECES = Object.freeze({
  'housing': ['housing.png', 920, 280],
  'socket': ['action_socket.png', 140, 140],   /* the empty well, drawn at the big buttons' size too */
  'stick-base': ['joystick_base.png', 178, 178],
  'stick-thumb': ['joystick_thumb.png', 86, 86],
  'slot': ['weapon_slot.png', 88, 88],
  'slot-on': ['weapon_slot_selected.png', 88, 88],
  'icon-sword': ['weapon_icon_sword.png', 52, 0],
  'icon-bow': ['weapon_icon_bow.png', 52, 0],
  'icon-staff': ['weapon_icon_staff.png', 52, 0],
  'skate': ['mobility_skateboard.png', 80, 80],
  'charge': ['mobility_charge.png', 80, 80],
  'special': ['special.png', 80, 80],
  'shield': ['shield.png', 140, 140],   /* the big left button's in a fight (the card's reading 4) */
  'jump': ['jump.png', 140, 140],
  'attack-sword': ['attack_sword.png', 140, 140],
  'attack-bow': ['attack_bow.png', 140, 140],
  'attack-staff': ['attack_staff.png', 140, 140],
  'attack-off': ['attack_sword_disabled.png', 140, 140],
});

/** a pixel of the gold outline (bright, warm) */
function gold(d, i) { return d[i + 3] > 128 && d[i] > 140 && d[i + 1] > 90 && d[i] > d[i + 2] + 40; }
/** a pixel of the housing's dark inside (navy) */
function navy(d, i) { return d[i + 3] > 200 && d[i] < 90 && d[i + 1] < 100 && d[i + 2] < 120 && d[i + 2] >= d[i]; }

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
      if (gold(d, i)) seen = true;
      else if (seen && navy(d, i)) { at = y; break; }
    }
    top.push(at < 0 ? null : Math.round(at * fy * 10) / 10);
  }
  const row = Math.round(h * 0.8);   /* the rail's height: under the dip */
  const scan = (from, to, dir) => {
    let seen = false;
    for (let x = from; x !== to; x += dir) {
      const i = (row * w + x) * 4;
      if (gold(d, i)) seen = true;
      else if (seen && navy(d, i)) return x;
    }
    return -1;
  };
  const L = scan(0, w, 1), R = scan(w - 1, -1, -1);
  const col = Math.round(w / 2);
  let B = -1, seen = false;
  for (let y = h - 1; y >= 0; y--) {
    const i = (y * w + col) * 4;
    if (gold(d, i)) seen = true;
    else if (seen && navy(d, i)) { B = y; break; }
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
  for (const name of Object.keys(PIECES)) {
    const [file, rw, rh] = PIECES[name];
    const src = readRgba(path.join(REPO, SRC_DIR, file));
    const W = Math.round(rw * K);
    /* an icon keeps its own shape (rh 0); every other piece is drawn in its
       reference box (a face square, the housing the reference's) */
    const H = rh ? Math.round(rh * K) : Math.round(W * src.h / src.w);
    const pic = scaleArea(src, W, H);
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
  fs.writeFileSync(path.join(REPO, DATA_OUT), `/* GENERATED by tools/art/cut-pad.mjs (v2.3.6641, card PAD part 3): never by hand.
   The controller's pieces (public/ui/pad/<name>.png), from the owner's eighteen
   (${SRC_DIR}): each one's size in px (2 px a CSS px at its biggest) and its
   bytes, and the housing's dark inside in the reference's units (920 x 280):
   game/padSkin.js lays the controls out and checks them against it. */
export const PAD_ART = ${JSON.stringify(meta)};
export const PAD_ART_BYTES = ${total};
`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main(process.argv.slice(2));
