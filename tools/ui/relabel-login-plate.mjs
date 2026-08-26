/* ═══ v2.3.1954: REPAINT THE SPLASH BUTTON'S LABEL ═══
 *
 * Owner: "Also change the label from login with your key to just 'Continue'
 * on splash screen."
 *
 * The label is not text.  `.bt-login-btn--key` is a painted plate
 * (public/ui/welcome/title/btn-login.png) whose words are part of the
 * artwork — which is why v2.3.1923 could rename the button to "Continue" in
 * the accessible name and the screen still said LOG IN WITH YOUR KEY.  This
 * is that half of the change.
 *
 * ── WHY THIS IS COMPOSITED FROM THE PLATE'S OWN LETTERS ──
 * The lettering is a chunky pixel face with a gold vertical gradient, a dark
 * outline and a soft drop shadow.  Setting "CONTINUE" in any font available
 * here would have been a near-match at best, and a near-match sits next to
 * CREATE CHARACTER on the same screen where the difference is obvious.
 * Every letter of CONTINUE except C already exists in LOG IN WITH YOUR KEY,
 * at the same size, on the same baseline, under the same gradient — so the
 * word is cut from the plate itself and the match is exact by construction.
 *
 * ── AND WHERE THE C COMES FROM ──
 * C is the one letter the old label does not contain.  It is derived from the
 * plate's own E: in this face a C is an E with the middle bar removed, and the
 * rows that bar occupied are replaced by a vertical repeat of one STEM-ONLY
 * row taken from the same E (between its top arm and its middle bar).  So the
 * left stem, its right-facing outline and the arm terminals are all the E's
 * own pixels — nothing is drawn by hand, and the gradient still lines up
 * because every row keeps its original y.
 *
 * ── THE ERASE ──
 * The old words are removed by interpolating each column vertically between
 * the clean interior row above the text and the clean row below it.  The
 * plate's interior gradient runs vertically and varies slowly, so a per-COLUMN
 * ramp preserves the horizontal sheen exactly; a flat fill or a horizontal
 * blend would have left a visible band.
 *
 * Runs in the headless Chromium the QA harness uses, because there is no image
 * library in this sandbox and Canvas 2D is a perfectly good one.
 *
 *   node tools/ui/relabel-login-plate.mjs [src] [dst]
 *   node tools/ui/relabel-login-plate.mjs --check      # measure only, no write
 */
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
/* ── IN AND OUT ARE DIFFERENT FILES, ON PURPOSE ──
 * The plate is referenced from game.css, which cannot interpolate the build
 * version the way the JSX `art()` helper does — so an edit in place would be
 * served from cache to every returning player, and the button would still say
 * LOG IN WITH YOUR KEY on the one screen where that is the whole bug.  A new
 * filename is a guaranteed cache miss and needs no cache-busting machinery.
 *
 * That makes this a ONE-SHOT: btn-login.png leaves the tree after the run.
 * It is not lost — it is a SLICE of the owner's title sheet, so
 * `node tools/gear/slice-splash-art.mjs` regenerates it from
 * tools/gear/src-art/splash/title-sheet.png any time this needs re-running
 * with a different word or retuned spacing. */
const SRC = resolve(REPO, process.argv[2] && !process.argv[2].startsWith('--')
  ? process.argv[2] : 'public/ui/welcome/title/btn-login.png');
const DST = resolve(REPO, process.argv[3] && !process.argv[3].startsWith('--')
  ? process.argv[3] : 'public/ui/welcome/title/btn-continue.png');
const CHECK = process.argv.includes('--check');

/* A canvas cannot read pixels from a file:// image, so the plate is served. */
const png = await readFile(SRC);
const server = createServer((_, res) => { res.writeHead(200, { 'Content-Type': 'image/png' }); res.end(png); });
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/plate.png`;

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
await page.goto(url.replace('/plate.png', '/'), { waitUntil: 'domcontentloaded' }).catch(() => {});

const out = await page.evaluate(async (src) => {
  const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
  const W = img.width, H = img.height;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const IM = ctx.getImageData(0, 0, W, H);
  const D = IM.data;
  const px = (x, y) => { const i = (y * W + x) * 4; return [D[i], D[i + 1], D[i + 2], D[i + 3]]; };
  const set = (T, x, y, v) => { const i = (y * W + x) * 4; T[i] = v[0]; T[i + 1] = v[1]; T[i + 2] = v[2]; T[i + 3] = v[3]; };

  /* ── 1. find the letters ──
     Bright saturated gold, inside the painted frame.  The key icon is gold
     too, so it is excluded by x: it lives left of the text. */
  const isGold = (x, y) => { const [r, g, b, a] = px(x, y);
    return a > 200 && r > 200 && g > 140 && b < 120 && (r - b) > 110; };
  /* Scan from inside the frame, key icon INCLUDED — it is separated below by
     its height rather than by a hand-picked x, because guessing the x is
     exactly what went wrong on the first run: a window that started right of
     the key made the L look like the key and shifted every letter by one, so
     the "E" the C is derived from came out a Y. */
  /* These four bound the plate's INTERIOR.  The frame is gold too, so a
     window even a few pixels wider swallows it and every run merges into one
     — measured, on the first two attempts. */
  const IX0 = 90, IX1 = W - 80, IY0 = 60, IY1 = H - 60;
  const colHit = [];
  for (let x = IX0; x < IX1; x++) { let n = 0;
    for (let y = IY0; y < IY1; y++) if (isGold(x, y)) n++;
    colHit.push(n); }
  const runs = []; let s = -1;
  colHit.forEach((v, i) => { if (v > 0 && s < 0) s = i; else if (v === 0 && s >= 0) { runs.push([s + IX0, i - 1 + IX0]); s = -1; } });
  if (s >= 0) runs.push([s + IX0, colHit.length - 1 + IX0]);
  const boxes = runs.map(([x0, x1]) => { let y0 = 1e9, y1 = -1;
    for (let x = x0; x <= x1; x++) for (let y = IY0; y < IY1; y++) if (isGold(x, y)) { if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return { x0, x1, y0, y1 }; });

  /* LOG IN WITH YOUR KEY, in order.  The key ICON is the box far taller than
     the letters (they are one cap height; it is three).  Asserted rather than
     assumed: the label has 16 letters and exactly one icon. */
  const heights = boxes.map((b) => b.y1 - b.y0 + 1);
  const capH = heights.slice().sort((a, b) => a - b)[Math.floor(heights.length / 2)];
  const iconIx = heights.findIndex((h) => h > capH * 1.8);
  if (iconIx < 0) return { err: 'no key icon found', heights };
  const keyBox = boxes[iconIx];
  const L = boxes.filter((_, i) => i !== iconIx);
  if (L.length !== 16) return { err: 'expected 16 letters, found ' + L.length, heights };

  /* ── 2. the local background, per row ──
     Estimated from a clean interior column on each side of the text, blended
     across.  Used only to decide what is LETTER and what is plate, so a close
     estimate is enough; the pixels that get copied are the real ones. */
  const LEFT_CLEAN = 196, RIGHT_CLEAN = W - 76;
  const bgAt = (x, y) => {
    const a = px(LEFT_CLEAN, y), b = px(RIGHT_CLEAN, y);
    const t = (x - LEFT_CLEAN) / (RIGHT_CLEAN - LEFT_CLEAN);
    return [0, 1, 2, 3].map((k) => a[k] + (b[k] - a[k]) * t);
  };
  /* Letter-ness as a soft alpha, so the drop shadow fades in rather than
     ending on a hard edge. */
  const letterAlpha = (x, y) => {
    const p = px(x, y), b = bgAt(x, y);
    const diff = Math.abs(p[0] - b[0]) + Math.abs(p[1] - b[1]) + Math.abs(p[2] - b[2]);
    return Math.max(0, Math.min(1, (diff - 6) / 26));
  };

  /* ── 3. erase the old words ──
     Per COLUMN, ramp between the clean row above the text and the clean row
     below it.  Vertical, because the interior's gradient is vertical and its
     horizontal sheen must survive. */
  const TOP = 112, BOT = 176;            /* the text band, outline + shadow included */
  const erased = new Uint8ClampedArray(D);
  /* Start clear of the KEY ICON.  The first cut erased from the frame inward
     and ran a ramp straight through the middle of the key, which came out as a
     smear — the icon is three cap-heights tall, so the text band crosses it. */
  const ERASE_X0 = keyBox.x1 + 8;
  for (let x = ERASE_X0; x < IX1 + 6; x++) {
    const a = px(x, TOP - 1), b = px(x, BOT + 1);
    for (let y = TOP; y <= BOT; y++) {
      const t = (y - (TOP - 1)) / (BOT + 1 - (TOP - 1));
      set(erased, x, y, [0, 1, 2, 3].map((k) => Math.round(a[k] + (b[k] - a[k]) * t)));
    }
  }

  /* ── 4. cut the glyphs ──
     Each is taken with a margin for its outline and shadow, carrying the soft
     letter-alpha rather than a rectangle of plate. */
  const M = 6;
  /* Sideways, the cut stops at the MIDPOINT of the gap to the next letter
     rather than at a fixed margin.  The letters sit ~5px apart and their
     outlines are ~3px, so a 6px margin dragged half of each neighbour along —
     the first render had a stray vertical bar at both ends of the word.  A
     midpoint cut is also exactly how the letters abut in the source: reassemble
     them at the same gap and the join is the one the artwork already had. */
  const cut = (box, leftLimit, rightLimit) => {
    const x0 = Math.max(box.x0 - M, leftLimit), x1 = Math.min(box.x1 + M, rightLimit);
    const y0 = box.y0 - M, y1 = box.y1 + M;
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    const g = { w, h, y0, ink0: box.x0 - x0, ink1: box.x1 - x0, rgba: new Float32Array(w * h * 4) };
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const p = px(x, y), a = letterAlpha(x, y);
      const i = ((y - y0) * w + (x - x0)) * 4;
      g.rgba[i] = p[0]; g.rgba[i + 1] = p[1]; g.rgba[i + 2] = p[2]; g.rgba[i + 3] = a;
    }
    return g;
  };

  const named = {};
  'LOGINWITHYOURKEY'.split('').forEach((ch, i) => {
    if (!L[i] || named[ch] !== undefined) return;
    const prev = L[i - 1], next = L[i + 1];
    named[ch] = cut(L[i],
      prev ? Math.ceil((prev.x1 + L[i].x0) / 2) : 0,
      next ? Math.floor((L[i].x1 + next.x0) / 2) : W - 1);
  });

  /* ── 5. build the C from the E ── */
  const E = named.E;
  if (!E) return { err: 'no E in the source label' };
  const C = { w: E.w, h: E.h, y0: E.y0, ink0: E.ink0, ink1: E.ink1, rgba: new Float32Array(E.rgba) };
  /* Find the E's arms: rows whose letter-alpha reaches far to the RIGHT.  An
     arm row is wide; a stem-only row is narrow; the middle bar is a third wide
     row between them. */
  const rowReach = [];
  for (let ry = 0; ry < E.h; ry++) { let far = -1;
    for (let rx = 0; rx < E.w; rx++) { const i = (ry * E.w + rx) * 4;
      if (E.rgba[i + 3] > 0.6 && E.rgba[i] > 150) far = rx; }
    rowReach.push(far); }
  /* MEASURED on this plate: the E's rows reach 32 (top arm), 12 (stem only),
     21 (middle bar), 12, 26 (bottom arm).  The middle bar is SHORTER than
     either arm — a fraction-of-the-widest threshold missed it and found two
     bands — so the split is taken from the stem instead: anything reaching
     meaningfully past the stem is a bar. */
  const inGlyph = rowReach.filter((r) => r >= 0);
  const maxReach = Math.max(...inGlyph);
  const stemReach = Math.min(...inGlyph);
  const barAt = stemReach + (maxReach - stemReach) * 0.3;
  const wide = rowReach.map((r) => r > barAt);
  /* the three wide bands: top arm, middle bar, bottom arm */
  const bands = []; let bs = -1;
  wide.forEach((v, i) => { if (v && bs < 0) bs = i; else if (!v && bs >= 0) { bands.push([bs, i - 1]); bs = -1; } });
  if (bs >= 0) bands.push([bs, wide.length - 1]);
  if (bands.length < 3) return { err: 'expected three bands in E, got ' + bands.length, bands, rowReach };
  const mid = bands[1];
  /* A stem-only row to repeat: the row just above the middle bar.  Checked,
     not assumed — if the bar started immediately under the top arm there
     would be no stem row there and the C would come out with a stray. */
  const donor = mid[0] - 1;
  if (!(rowReach[donor] >= 0 && rowReach[donor] <= barAt)) {
    return { err: 'the row above E\'s middle bar is not stem-only', donor, rowReach, barAt };
  }
  for (let ry = mid[0]; ry <= mid[1]; ry++) {
    for (let rx = 0; rx < E.w; rx++) {
      const di = (donor * E.w + rx) * 4, ti = (ry * E.w + rx) * 4;
      C.rgba[ti] = E.rgba[di]; C.rgba[ti + 1] = E.rgba[di + 1];
      C.rgba[ti + 2] = E.rgba[di + 2]; C.rgba[ti + 3] = E.rgba[di + 3];
    }
  }

  /* ── 6. lay out CONTINUE ──
     The source's own advance: measured letter gap inside a word. */
  const gaps = [];
  for (let i = 1; i < L.length; i++) { const g = L[i].x0 - L[i - 1].x1 - 1; if (g > 0 && g < 12) gaps.push(g); }
  gaps.sort((a, b) => a - b);
  const GAP = gaps[Math.floor(gaps.length / 2)];
  const word = ['C', 'O', 'N', 'T', 'I', 'N', 'U', 'E'].map((ch) => (ch === 'C' ? C : named[ch]));
  if (word.some((g) => !g)) return { err: 'missing a letter', have: Object.keys(named) };
  /* Ink widths (the glyph minus its two margins) drive the spacing; the margin
     only exists to carry the outline. */
  const inkW = word.map((g) => g.ink1 - g.ink0 + 1);
  const total = inkW.reduce((a, b) => a + b, 0) + GAP * (word.length - 1);

  /* Centred in the space the old words had — the key icon keeps its place, so
     the word is centred between it and the plate's right frame, which is what
     the original composition did. */
  const KEY_RIGHT = keyBox.x1;
  const FRAME_RIGHT = W - 88;
  let cx = Math.round(KEY_RIGHT + (FRAME_RIGHT - KEY_RIGHT - total) / 2);

  const outData = new Uint8ClampedArray(erased);
  const put = (g, atInkX) => {
    for (let ry = 0; ry < g.h; ry++) for (let rx = 0; rx < g.w; rx++) {
      const i = (ry * g.w + rx) * 4, a = g.rgba[i + 3];
      if (a <= 0) continue;
      const X = atInkX - g.ink0 + rx, Y = g.y0 - M + ry;
      if (X < 0 || X >= W || Y < 0 || Y >= H) continue;
      const j = (Y * W + X) * 4;
      outData[j] = Math.round(outData[j] * (1 - a) + g.rgba[i] * a);
      outData[j + 1] = Math.round(outData[j + 1] * (1 - a) + g.rgba[i + 1] * a);
      outData[j + 2] = Math.round(outData[j + 2] * (1 - a) + g.rgba[i + 2] * a);
    }
  };
  const placed = [];
  word.forEach((g, i) => { put(g, cx); placed.push(cx); cx += inkW[i] + GAP; });

  ctx.putImageData(new ImageData(outData, W, H), 0, 0);
  return { W, H, letters: L.length, GAP, total, placed, bands,
    dataUrl: cv.toDataURL('image/png') };
}, url);

await browser.close();
server.close();

if (out.err) { console.error('FAILED:', out.err, JSON.stringify(out).slice(0, 400)); process.exit(1); }
console.log(`plate ${out.W}x${out.H}  letters=${out.letters}  gap=${out.GAP}px  word=${out.total}px`);
console.log('E bands (top arm / middle bar / bottom arm):', JSON.stringify(out.bands));
console.log('glyph x positions:', out.placed.join(', '));
if (CHECK) { console.log('--check: nothing written'); process.exit(0); }
const buf = Buffer.from(out.dataUrl.split(',')[1], 'base64');
await writeFile(DST, buf);
console.log(`wrote ${DST} (${(buf.length / 1024).toFixed(0)} KB, source was ${(png.length / 1024).toFixed(0)} KB)`);
