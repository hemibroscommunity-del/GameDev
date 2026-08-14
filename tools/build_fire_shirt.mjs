/* build_fire_shirt — derive the firemaking figure's SHIRT sheet from the body
 * strip itself (v2.3.1713).
 *
 * ⚠ SUPERSEDED, AND IT WILL WRITE A BROKEN SHEET IF YOU RUN IT (v2.3.1715).
 * Everything below describes the RETIRED 29-frame 161x220 firemaking strip.
 * That strip and its shirt were both replaced wholesale by the owner's 8-frame
 * 384x512 art; the live builder is tools/build_fire_8f.mjs.  Running this tool
 * with APPLY=1 today would overwrite gear/shirt/tshirt/fire-south.png with a
 * 29-frame sheet the renderer slices at 384px, i.e. twelve frames of nonsense.
 * It is kept, unrun, for its method: the crown-anchored mask recipe in the
 * header is still the best answer to "make a garment that is registered to this
 * body by construction", which is exactly the thing the supplied painted sheets
 * are NOT.  If the owner ever asks why the shirt or plate sits off the torso,
 * this file is the fix — re-point it at the new strip's geometry.
 *
 * WHY THIS EXISTS.  Owner playtest: "when lighting a fire the skin color and
 * shirt go back to defaults (not your character)."  The shirt half of that is
 * not a tint bug — measured, firemaking-strip.webp paints a BARE CHEST in all
 * 29 frames (the torso classifies as skin end to end), and unlike the cook
 * (gear/shirt/tshirt/cook-south.png, v2.3.1113) and the chopper (chop-west.png,
 * v2.3.1131) this pose never shipped a shirt sheet at all.  So there was
 * nothing to tint: the fire-lighter has always been topless.
 *
 * The cook's sheet was cut from an owner-supplied contact sheet of painted
 * shirts.  No such art exists for this pose, so the garment is derived from the
 * body: the trunk pixels are masked and written out as a FLAT WHITE base, which
 * the shipped `_placeSwingShirt` path then tints to the player's chosen shirt
 * colour exactly like every other stand-in.  Flat rather than luminance-shaded
 * is deliberate and matches recolorBodyToCanvas's own shirt fill (v2.3.697:
 * following the body's shading re-exposed its chest contour lines and "the
 * shirt looks like torn rags").
 *
 * THE MASK, and why it is anchored where it is.  Three anatomy-detection
 * recipes were tried on this strip and rendered frame by frame before this one:
 *   - the shipped `_torsoBands` (playerSkins.js) at fw=161: paints faces and
 *     the fire's glow halo — it is neck-seeded and the halo classifies as skin,
 *     so the seed and the solid-fill span both wander into the fire;
 *   - erode / keep-the-core-that-meets-the-trousers / geodesic regrow (the
 *     v2.3.1480 hit+mine shirt recipe): the trunk core survives erosion on only
 *     some frames, so the garment flickered between 232 and 1515 px;
 *   - re-detecting the head per frame: the eyes and mouth are dark pixels that
 *     split a head row into narrow skin runs, so a run-width "neck pinch" test
 *     put the chin a third of the way down the face.
 * What works is not detecting the head at all.  crowns.json ALREADY carries a
 * per-frame head anchor for this strip (it is what seats the player's hat), so
 * the mask is a window hung off that anchor: skin pixels below crown+HEAD_H,
 * inside crown_x +/- HALF_W, above that column's trousers.  Bounded by
 * construction — it cannot reach the face (it starts below the head) and it
 * cannot reach the fire (which is outside the window on every frame).  Result:
 * 1317-1860 px/frame, no dropouts, no flicker.
 *
 * TWO CROWNS IN crowns.json ARE WRONG and are repaired here rather than worked
 * around: frames 22 and 23 read [79,145], which is down on the burning log —
 * the generator locked onto the flame once it got bright.  That is also a live
 * (unreported) bug in the shipped game: the player's hat teleports onto the
 * fire for those two frames, ~110 ms of every fire lit.  This tool prints the
 * corrected pair; crowns.json carries them with a comment.
 *
 *   node tools/build_fire_shirt.mjs           # preview only -> scratchpad
 *   APPLY=1 node tools/build_fire_shirt.mjs   # also write the gear sheet
 *
 * Tunables (env): HEAD (rows below the crown the shirt starts, default 35),
 *   HALF (half-width of the trunk window, default 21), TORSO (max shirt height,
 *   default 70 — the trousers usually stop it first).
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';

const REPO = process.cwd();
const SCRATCH = process.env.SCRATCH || '/tmp/fire-shirt';
const OUT_SHEET = join(REPO, 'public/sprites/gear/shirt/tshirt/fire-south.png');
const APPLY = process.env.APPLY === '1';
const P = {
  HEAD: +(process.env.HEAD ?? 35),
  HALF: +(process.env.HALF ?? 21),
  TORSO: +(process.env.TORSO ?? 70),
};

const MIME = { '.webp': 'image/webp', '.png': 'image/png', '.json': 'application/json' };
const srv = createServer(async (q, s) => {
  const p = decodeURIComponent(q.url.split('?')[0]);
  if (p === '/blank.html') { s.writeHead(200, { 'content-type': 'text/html' }); s.end('<!doctype html><body>'); return; }
  try {
    const body = await readFile(join(REPO, 'public', p));
    s.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' });
    s.end(body);
  } catch { s.writeHead(404); s.end(); }
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const PORT = srv.address().port;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:${PORT}/blank.html`);

const out = await page.evaluate(async ({ base, FW, FH, P }) => {
  const img = await new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = j; i.src = base + '/sprites/skills/firemaking-strip.webp'; });
  const crowns = (await (await fetch(base + '/sprites/skills/crowns.json')).json()).fire.crowns.slice();
  const w = img.width, h = img.height, n = Math.round(w / FW);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, w, h).data;

  /* The strip's own skin test.  Plain `_isSkin` (playerSkins.js) also accepts
     the fire: its glow halo and the orange band of the flame both pass it.  The
     extra channel-ratio window is what separates them — measured on this art,
     body skin sits at g/r 0.49-0.74 and b/r 0.13-0.46, the halo at b/r 0.57+
     and the flame's red edge at g/r 0.21-0.45. */
  const isSkin = (r, g, b, a) => a > 40 && r > g && g >= b && (r - b) > 30 && r > 90 && (r - g) > 25
    && (b / r) <= 0.50 && (g / r) >= 0.45 && (g / r) <= 0.80;
  const isPants = (r, g, b, a) => a > 180 && g >= r - 10 && g > b + 8 && r < 150;
  const px = (f, xx, y) => ((y * w) + f * FW + xx) * 4;

  /* --- repair the flame-locked crowns -------------------------------------
     Derive every frame's crown INDEPENDENTLY (topmost contiguous skin run at
     least 10px wide — wider than the sparks that fly off the flint, and the
     fire itself is already out of `isSkin`), then override crowns.json only
     where the two disagree by more than 25px.  Deriving all of them and
     replacing few keeps the shipped anchor authoritative while still catching
     a run of consecutive bad frames, which a neighbour-vs-neighbour outlier
     test cannot: 22 and 23 are BOTH [79,145], so each one's "neighbour" on one
     side is equally wrong. */
  const fixed = [];
  const derived = [];
  for (let f = 0; f < n; f++) {
    let got = null;
    for (let y = 0; y < FH && !got; y++) {
      let run = 0, end = -1;
      for (let xx = 0; xx < FW; xx++) {
        const i = px(f, xx, y);
        if (isSkin(d[i], d[i + 1], d[i + 2], d[i + 3])) { run++; end = xx; } else { if (run >= 10) break; run = 0; }
      }
      if (run >= 10) got = [end - ((run - 1) >> 1), y];
    }
    derived.push(got);
    if (got && Math.hypot(got[0] - crowns[f][0], got[1] - crowns[f][1]) > 25) {
      fixed.push({ f, was: crowns[f], now: got });
      crowns[f] = got;
    }
  }

  /* --- the shirt mask ----------------------------------------------------- */
  const sheet = document.createElement('canvas'); sheet.width = w; sheet.height = h;
  const sx = sheet.getContext('2d');
  const sid = sx.createImageData(w, h); const sd = sid.data;
  const perFrame = [];
  for (let f = 0; f < n; f++) {
    const [cx, cy] = crowns[f];
    const top = cy + P.HEAD, bot = Math.min(FH - 1, top + P.TORSO);
    const wl = Math.max(0, cx - P.HALF), wr = Math.min(FW - 1, cx + P.HALF);
    const hem = new Int16Array(FW).fill(FH);
    for (let xx = wl; xx <= wr; xx++) for (let y = top; y < FH; y++) {
      const i = px(f, xx, y);
      if (isPants(d[i], d[i + 1], d[i + 2], d[i + 3])) { hem[xx] = y; break; }
    }
    let cnt = 0;
    for (let y = top; y <= bot; y++) for (let xx = wl; xx <= wr; xx++) {
      if (y >= hem[xx]) continue;
      const i = px(f, xx, y);
      if (!isSkin(d[i], d[i + 1], d[i + 2], d[i + 3])) continue;
      const o = ((y * w) + f * FW + xx) * 4;
      sd[o] = 255; sd[o + 1] = 255; sd[o + 2] = 255; sd[o + 3] = 255;
      cnt++;
    }
    perFrame.push(cnt);
  }
  sx.putImageData(sid, 0, 0);

  /* --- preview: the body with the sheet tinted the default shirt blue ----- */
  const pv = document.createElement('canvas'); pv.width = w; pv.height = h;
  const pctx = pv.getContext('2d');
  pctx.drawImage(img, 0, 0);
  const tint = document.createElement('canvas'); tint.width = w; tint.height = h;
  const tctx = tint.getContext('2d');
  tctx.drawImage(sheet, 0, 0);
  tctx.globalCompositeOperation = 'source-in';
  tctx.fillStyle = 'rgb(58,91,208)'; tctx.fillRect(0, 0, w, h);
  pctx.drawImage(tint, 0, 0);
  const perRow = Math.ceil(n / 3);
  const m = document.createElement('canvas'); m.width = FW * 2 * perRow; m.height = FH * 2 * 3;
  const mx = m.getContext('2d'); mx.imageSmoothingEnabled = false;
  mx.fillStyle = '#2a2a2a'; mx.fillRect(0, 0, m.width, m.height);
  for (let f = 0; f < n; f++) {
    const r = Math.floor(f / perRow), col = f % perRow;
    mx.drawImage(pv, f * FW, 0, FW, FH, col * FW * 2, r * FH * 2, FW * 2, FH * 2);
    mx.fillStyle = '#0ff'; mx.font = '20px monospace'; mx.fillText(String(f), col * FW * 2 + 4, r * FH * 2 + 20);
  }
  return {
    w, h, n, perFrame, fixed, crowns,
    sheet: sheet.toDataURL('image/png').split(',')[1],
    preview: m.toDataURL('image/png').split(',')[1],
  };
}, { base: `http://127.0.0.1:${PORT}`, FW: 161, FH: 220, P });

await browser.close(); srv.close();

console.log('params', JSON.stringify(P));
console.log(`strip ${out.w}x${out.h}, ${out.n} frames`);
console.log('shirt px/frame:', out.perFrame.join(','));
console.log('min/max px:', Math.min(...out.perFrame), Math.max(...out.perFrame));
for (const f of out.fixed) console.log(`crown repaired: frame ${f.f} ${JSON.stringify(f.was)} -> ${JSON.stringify(f.now)}`);
console.log('crowns (post-repair):', JSON.stringify(out.crowns));
await mkdir(SCRATCH, { recursive: true });
await writeFile(join(SCRATCH, 'fire_shirt_preview.png'), Buffer.from(out.preview, 'base64'));
console.log('preview ->', join(SCRATCH, 'fire_shirt_preview.png'));
if (APPLY) {
  await mkdir(dirname(OUT_SHEET), { recursive: true });
  await writeFile(OUT_SHEET, Buffer.from(out.sheet, 'base64'));
  console.log('WROTE', OUT_SHEET);
} else {
  await writeFile(join(SCRATCH, 'fire-south.png'), Buffer.from(out.sheet, 'base64'));
  console.log('sheet (preview copy) ->', join(SCRATCH, 'fire-south.png'));
}
