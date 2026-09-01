#!/usr/bin/env node
/* ═══ v2.3.2205: TAKE THE DIAMONDS OFF THE CREATE CHARACTER PLATE ═══
 *
 * Owner: "on Main page can you remove the diamonds framing create character
 * ... I don't like the diamonds because it's a dead giveaway of AI produced
 * content."
 *
 * The diamonds are not markup.  `.bt-login-btn--new` is a painted plate
 * (public/ui/welcome/title/btn-create.png) and the two gold lozenges either
 * side of the label are part of the artwork, so there is no element to
 * delete and no CSS to switch off.  They have to come off the picture.
 *
 * ── WHY INTERPOLATION IS THE RIGHT TOOL *HERE* ──
 * It is not always.  The same idea applied to the logo's sparkles produced a
 * smear, because those sit on letterforms -- structure that a blend cannot
 * invent.  The diamonds sit somewhere completely different: open plate
 * interior, which is a NAVY FIELD WITH A VERTICAL GRADIENT and no horizontal
 * structure at all.  Measured before trusting it (scan at y 78..128): the
 * columns either side of each diamond run flat at luminance 37-45 with a
 * spread of 8-15, and only the diamond itself breaks 100.  Reconstructing a
 * flat field is the one case where a per-row blend is exact rather than
 * approximate.
 *
 * So each row is interpolated HORIZONTALLY between the clean column just
 * left of the diamond and the clean column just right of it.  Per-row, not
 * per-column, because the plate's gradient runs VERTICALLY -- every row keeps
 * its own brightness and the gradient survives untouched.  (relabel-login-
 * plate.mjs, v2.3.1954, interpolated the other way for the same reason: its
 * erase ran along the gradient, this one runs across it.)
 *
 * The anchors are measured, not eyeballed.  The glow around each diamond
 * reaches further than the diamond: the left one is bright from x 100-124
 * but its column spread is still elevated at 96 and 126, so the box is cut
 * at 91..133 with anchors at 90 and 134, both of which measure clean.
 *
 * ── WHY A NEW FILENAME ──
 * Same reason as v2.3.1954.  game.css cannot interpolate a build version the
 * way the JSX `art()` helper does, so editing in place would be served from
 * cache to every returning player.  A new name is a guaranteed cache miss.
 *
 * It also keeps the pipeline honest: btn-create.png is a SLICE of the owner's
 * title sheet (tools/gear/slice-splash-art.mjs, sheet at 8,707,799,212), so
 * re-running the slicer must be free to regenerate it. It regenerates the
 * DIAMOND version, under its own name, which the page no longer loads. The
 * chain is sheet -> slice -> this tool -> btn-create-plain.png.
 *
 * There is no image library in this sandbox, so the PNG is read with the QA
 * harness's decoder and written through the headless Chromium's canvas --
 * the same pair make-app-icons.mjs (v2.3.2191) uses.
 *
 *   node tools/ui/deframe-create-plate.mjs [--check]
 */
import * as H from '../qa/mp/harness.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ART = path.join(REPO, 'public/ui/welcome/title');
const SRC = path.join(ART, 'btn-create.png');
const DST = path.join(ART, 'btn-create-plain.png');

/* Each diamond's erase box and the two clean columns it interpolates
   between.  `y` spans more than the diamond so the glow above and below it
   goes too; those extra rows are flat interior on both anchors, so the blend
   there is a no-op by construction. */
const BOXES = [
  { x0: 91, x1: 133, y0: 66, y1: 146, left: 90, right: 134 },
  { x0: 669, x1: 707, y0: 66, y1: 146, left: 668, right: 708 },
];

/* A column is "clean interior" when nothing in it breaks out of the field's
   own range.  This is asserted rather than assumed: an anchor that clipped a
   diamond's glow would smear it across the whole box instead of removing it. */
function columnSpread(px, x, y0, y1) {
  let lo = 255, hi = 0;
  for (let y = y0; y <= y1; y++) {
    const i = (y * px.width + x) * 4;
    const L = (px.data[i] + px.data[i + 1] + px.data[i + 2]) / 3;
    if (L < lo) lo = L;
    if (L > hi) hi = L;
  }
  return { lo: Math.round(lo), hi: Math.round(hi), range: Math.round(hi - lo) };
}

const px = H.decodePng(fs.readFileSync(SRC));
console.log(`plate ${px.width}x${px.height}`);

let bad = 0;
for (const b of BOXES) {
  for (const [name, x] of [['left', b.left], ['right', b.right]]) {
    const c = columnSpread(px, x, b.y0, b.y1);
    const ok = c.hi < 90;
    if (!ok) bad++;
    console.log(`  anchor ${name} x=${x}  lo ${c.lo} hi ${c.hi} range ${c.range}  ${ok ? 'clean' : 'NOT CLEAN'}`);
  }
}
if (bad) {
  console.error('\nAn anchor column is not flat interior — the art moved. '
    + 'Re-measure the boxes before writing anything.');
  process.exit(1);
}
if (process.argv.includes('--check')) {
  console.log('\n--check: anchors verified, nothing written.');
  process.exit(0);
}

const out = Buffer.from(px.data);
for (const b of BOXES) {
  for (let y = b.y0; y <= b.y1; y++) {
    const li = (y * px.width + b.left) * 4;
    const ri = (y * px.width + b.right) * 4;
    const span = b.right - b.left;
    for (let x = b.x0; x <= b.x1; x++) {
      const t = (x - b.left) / span;
      const o = (y * px.width + x) * 4;
      for (let k = 0; k < 4; k++) {
        out[o + k] = Math.round(px.data[li + k] * (1 - t) + px.data[ri + k] * t);
      }
    }
  }
}

const browser = await H.launch();
try {
  const page = await (await browser.newContext()).newPage();
  await page.setContent('<body style="margin:0">');
  const b64 = await page.evaluate(({ w, h, data }) => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const cx = c.getContext('2d');
    const img = cx.createImageData(w, h);
    img.data.set(new Uint8ClampedArray(data));
    cx.putImageData(img, 0, 0);
    return c.toDataURL('image/png').split(',')[1];
  }, { w: px.width, h: px.height, data: [...out] });
  fs.writeFileSync(DST, Buffer.from(b64, 'base64'));
  const b = fs.readFileSync(DST);
  console.log(`\nwrote ${path.relative(REPO, DST)}  `
    + `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}  ${(b.length / 1024).toFixed(0)}kB`);
} finally { await browser.close(); }
