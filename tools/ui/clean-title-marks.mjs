#!/usr/bin/env node
/* ═══ v2.3.2209: TAKE THE SPARKLES AND THE DIAMONDS OFF THE TITLE ═══
 *
 * Owner, twice: "make the sparkles on the Hemi bros title move or make them
 * disappear? I don't like the diamonds because it's a dead giveaway of AI
 * produced content" -> and, after the button was done, "there's still a
 * static shine on the Hemi bros logo and diamonds framing 'bro town' that I
 * want gone."
 *
 * Three marks in two files.  None of them is markup: they are painted into
 * the owner's title sheet, so the fix is new art cut from the old art.
 *
 * ── WHY THE OBVIOUS METHOD DOES NOT WORK ──
 * The first attempt inpainted each sparkle by blending inward from all four
 * sides.  It smeared the E into mush, and the same thing happened at the
 * BROS junction, because a blend can only average what surrounds a hole -- it
 * cannot invent the letterform inside one.  That failure is what decides the
 * method here: NOTHING IS BLENDED INTO EXISTENCE.  Every pixel written below
 * is copied from somewhere else in the same artwork, so the result is made of
 * the original's own pixels at the original's own scale.  It is the rule
 * relabel-login-plate.mjs (v2.3.1954) followed when it cut CONTINUE out of
 * the letters already on the plate.
 *
 * ── SPARKLE 1, on the E of HEMI: a column of the bar it sits on ──
 * It lies on the E's top bar, which is a flat horizontal band: measured,
 * every column from x=240 to x=265 matches a reference column elsewhere in
 * the logo to within 2-5 of 255 over the bar's whole height.  A band like
 * that has no horizontal structure to lose, so one clean column of it,
 * repeated across the glow, IS the answer rather than an approximation of it.
 *
 * The box stops at y=82 on purpose.  Below that the E stops being a flat bar
 * -- the stem is yellow and the gap beside it is transparent -- so the
 * column-repeat would no longer be true.  Checked after the fact: nothing of
 * the glow survives below the bar.
 *
 * ── SPARKLE 2, at the BROS junction: the logo's own repeat, found by search ──
 * This one sits where a BROS letter's top-left corner meets the dark band
 * between the two words, and the letters there are joined by their outlines,
 * so there is no clean column or row to copy.  What there IS is repetition:
 * the same corner-meets-band geometry occurs at every letter.
 *
 * So the donor is not chosen by eye.  A frame of pixels AROUND the damaged
 * box -- outside the glow's reach -- is matched against every offset in the
 * logo, and the offset whose surroundings agree best supplies the interior.
 * The search picked dx=-150, dy=0 at a mean error of 22 of 255: one letter
 * pitch to the left, same row, which is exactly the answer a person would
 * have wanted and is now a measured claim rather than a guess.  If the art is
 * ever redrawn the search re-runs and finds the new best donor, or reports a
 * bad score instead of pasting nonsense.
 *
 * ── THE BANNER'S TWO DIAMONDS: a column of the rule they interrupt ──
 * Same shape of problem as sparkle 1, and the same answer.  Each diamond sits
 * at the inner end of a horizontal rule that is very nearly uniform along its
 * length (10-12px of ink, rows 31-42, from x=12 all the way to the diamond),
 * so one clean column of the rule, repeated across the diamond, closes the
 * gap and leaves "———— BRO TOWN ————".  The rules are extended INTO the space
 * the diamonds held rather than simply cut short, so the lockup keeps its
 * width and reads as a deliberate divider instead of a line that stops early.
 *
 * ── WHY NEW FILENAMES ──
 * Not for caching: LoginScreen's `art()` helper already appends the build
 * version to these, unlike the CSS-referenced plate in v2.3.2207.  It is
 * because logo.png and banner.png are SLICES of the owner's title sheet
 * (tools/gear/slice-splash-art.mjs), and that name has to stay free for the
 * slicer.  A re-slice putting the sparkles back under a name the page loads
 * is the trap this avoids.  The chain is sheet -> slice -> this tool.
 *
 * No image library exists in this sandbox, so the PNGs are read with the QA
 * harness's decoder and written through the headless Chromium's canvas.
 *
 *   node tools/ui/clean-title-marks.mjs [--check]
 */
import * as H from '../qa/mp/harness.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ART = path.join(REPO, 'public/ui/welcome/title');
const CHECK = process.argv.includes('--check');

/* ── sparkle 1 and the banner diamonds: repeat a clean column ── */
const COLUMN_JOBS = [
  { file: 'logo.png', x0: 266, x1: 354, y0: 0, y1: 82, from: [254, 264],
    what: "the E's top bar, over sparkle 1" },
  { file: 'banner.png', x0: 66, x1: 99, y0: 0, y1: 78, from: [58, 62],
    what: 'the left rule, over the left diamond' },
  { file: 'banner.png', x0: 353, x1: 385, y0: 0, y1: 78, from: [388, 392],
    what: 'the right rule, over the right diamond' },
];

/* ── sparkle 2: the donor is searched for, not stated ── */
const SEARCH_JOB = {
  file: 'logo.png', x0: 332, x1: 404, y0: 186, y1: 254,
  pad: 14, feather: 6, dyRange: 30, dxRange: 300, maxError: 40,
  what: 'the BROS junction, over sparkle 2',
};

const load = (f) => H.decodePng(fs.readFileSync(path.join(ART, f)));

/* The donor columns must be clean, or the repeat spreads the glow instead of
   removing it.  Asserted, not assumed: if the art is redrawn the numbers move
   and this refuses to write. */
function columnSpread(px, x, y0, y1) {
  let lo = 255, hi = 0;
  for (let y = y0; y <= y1; y++) {
    const i = (y * px.width + x) * 4;
    const L = (px.data[i] + px.data[i + 1] + px.data[i + 2]) / 3;
    const A = px.data[i + 3] / 255;
    const v = L * A;                       /* transparent counts as dark */
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  return Math.round(hi);
}

const bufs = new Map();
const get = (f) => {
  if (!bufs.has(f)) { const px = load(f); bufs.set(f, { px, out: Buffer.from(px.data) }); }
  return bufs.get(f);
};

let failed = 0;
for (const j of COLUMN_JOBS) {
  const { px, out } = get(j.file);
  /* the donor is the MEDIAN of a few adjacent columns, so a single stray
     pixel in one of them cannot become a stripe down the repair */
  const donor = [];
  for (let y = j.y0; y <= j.y1; y++) {
    const ch = [];
    for (let k = 0; k < 4; k++) {
      const vals = [];
      for (let x = j.from[0]; x <= j.from[1]; x++) vals.push(px.data[(y * px.width + x) * 4 + k]);
      vals.sort((a, b) => a - b);
      ch.push(vals[vals.length >> 1]);
    }
    donor.push(ch);
  }
  const bright = Math.max(...j.from.map((x) => columnSpread(px, x, j.y0, j.y1)));
  const clean = bright < 210;
  console.log(`${j.file}  ${j.what}: donor x ${j.from[0]}..${j.from[1]} peak ${bright} `
    + `${clean ? 'clean' : 'NOT CLEAN — a mark is inside the donor'}`);
  if (!clean) { failed++; continue; }
  if (CHECK) continue;
  for (let y = j.y0; y <= j.y1; y++) {
    for (let x = j.x0; x <= j.x1; x++) {
      const o = (y * px.width + x) * 4;
      for (let k = 0; k < 4; k++) out[o + k] = donor[y - j.y0][k];
    }
  }
}

{
  const j = SEARCH_JOB;
  const { px, out } = get(j.file);
  const W = px.width, Hh = px.height;
  const src = CHECK ? px.data : out;   /* sparkle 1 is already gone from `out` */
  const at = (d, x, y, k) => d[(y * W + x) * 4 + k];
  const ring = [];
  for (let y = j.y0 - j.pad; y <= j.y1 + j.pad; y += 2) {
    for (let x = j.x0 - j.pad; x <= j.x1 + j.pad; x += 2) {
      if (x >= j.x0 && x <= j.x1 && y >= j.y0 && y <= j.y1) continue;
      if (x < 0 || y < 0 || x >= W || y >= Hh) continue;
      ring.push([x, y]);
    }
  }
  let best = null;
  for (let dy = -j.dyRange; dy <= j.dyRange; dy++) {
    for (let dx = -j.dxRange; dx <= j.dxRange; dx++) {
      if (Math.abs(dx) < j.x1 - j.x0 + 8 && Math.abs(dy) < j.y1 - j.y0 + 8) continue;
      let s = 0, ok = true;
      for (const [x, y] of ring) {
        const sx = x + dx, sy = y + dy;
        if (sx < 0 || sy < 0 || sx >= W || sy >= Hh) { ok = false; break; }
        for (let k = 0; k < 4; k++) s += Math.abs(at(src, x, y, k) - at(src, sx, sy, k));
      }
      if (!ok) continue;
      const mean = s / (ring.length * 4);
      if (!best || mean < best.mean) best = { dx, dy, mean: +mean.toFixed(2) };
    }
  }
  const good = best && best.mean <= j.maxError;
  console.log(`${j.file}  ${j.what}: best donor dx=${best && best.dx} dy=${best && best.dy} `
    + `error ${best && best.mean} `
    + `${good ? 'accepted' : `REJECTED — nothing in the logo matches within ${j.maxError}`}`);
  if (!good) failed++;
  else if (!CHECK) {
    for (let y = j.y0; y <= j.y1; y++) for (let x = j.x0; x <= j.x1; x++) {
      const d = Math.min(x - j.x0, j.x1 - x, y - j.y0, j.y1 - y);
      const t = Math.max(0, Math.min(1, d / j.feather));
      const o = (y * W + x) * 4, s = ((y + best.dy) * W + (x + best.dx)) * 4;
      for (let k = 0; k < 4; k++) out[o + k] = Math.round(out[o + k] * (1 - t) + out[s + k] * t);
    }
  }
}

if (failed) {
  console.error(`\n${failed} job(s) failed their own check — the art moved. `
    + 'Re-measure before writing anything.');
  process.exit(1);
}
if (CHECK) { console.log('\n--check: every donor verified, nothing written.'); process.exit(0); }

const browser = await H.launch();
try {
  const page = await (await browser.newContext()).newPage();
  await page.setContent('<body style="margin:0">');
  for (const [file, { px, out }] of bufs) {
    const dst = path.join(ART, file.replace('.png', '-plain.png'));
    const b64 = await page.evaluate(({ w, h, data }) => {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const cx = c.getContext('2d');
      const img = cx.createImageData(w, h);
      img.data.set(new Uint8ClampedArray(data));
      cx.putImageData(img, 0, 0);
      return c.toDataURL('image/png').split(',')[1];
    }, { w: px.width, h: px.height, data: [...out] });
    fs.writeFileSync(dst, Buffer.from(b64, 'base64'));
    const b = fs.readFileSync(dst);
    console.log(`\nwrote ${path.relative(REPO, dst)}  `
      + `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}  ${(b.length / 1024).toFixed(0)}kB`);
  }
} finally { await browser.close(); }
