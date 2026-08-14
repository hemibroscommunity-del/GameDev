/* measure_fire_gear_reg — register the painted firemaking gear sheets to the
 * firemaking body strip (v2.3.1723).
 *
 * WHY THIS EXISTS.  build_fire_8f.mjs cut the owner's four supplied 8-frame
 * sheets (body, shirt, chest, legs) and shipped them AS SUPPLIED, on purpose,
 * because they are not registered to each other and a silent nudge would have
 * hidden the thing that needed deciding.  It has now been decided: composited
 * in-game the shirt and the armour sit low and left of the torso, and on the
 * tending frames they sit in the flames.  This tool produces the per-frame
 * correction, which lives in effectsRenderer.js as FIRE_GEAR_REG — the pixels
 * the owner supplied are not touched.
 *
 * THE METHOD, and the two ways it goes wrong.  Each gear frame is fitted onto
 * the body frame by mask containment over a +/-120px search (coarse at 1/4
 * resolution, then refined at full res), tie-broken toward the smaller shift.
 * Everything depends on WHAT IT IS FITTED ONTO:
 *
 *   - NOT the body's alpha silhouette.  At any usable alpha threshold that
 *     mask contains the fire's wide soft glow halo, so a garment lying in the
 *     flames is fully "inside the body" and scores 1.0.  Run that way, frames
 *     5 and 6 come back as already-perfect at zero offset, which the eye flatly
 *     contradicts.  This is the trap; it is written down because it looks like
 *     the obvious formulation and it is confidently wrong.
 *   - SKIN, for the shirt and the breastplate.  A torso garment covers skin,
 *     and the FIRE_SKIN_OPTS channel-ratio window (shared with the shipped
 *     recolour) excludes the flame and its halo by construction, so the
 *     containment peak sits at the true registration.
 *   - TROUSERS AND BOOTS, for the greaves.  Fitting those to skin instead
 *     drags them up onto the chest — measured, dy -126 on frame 0 — because
 *     the only way for greaves to cover skin is to stop being greaves.
 *
 * Offsets are in SOURCE ART PIXELS in the 384x512 cell.  Writes the table to
 * /tmp/fire-look/fire-fit.json and a four-row before/after contact sheet to
 * /tmp/fire-look/fire-registered.png; paste the table into FIRE_GEAR_REG.
 *
 *   npm run build && node tools/measure_fire_gear_reg.mjs
 *
 * It reads the sheets over the built dist through the QA harness's static
 * server, i.e. exactly the bytes the game loads.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import * as H from './qa/mp/harness.mjs';

const OUT = '/tmp/fire-look';
await mkdir(OUT, { recursive: true });
const WEB = await H.freePort();
const srv = await H.serveDist(WEB);
const browser = await H.launch();
const page = await (await browser.newContext({ deviceScaleFactor: 2 })).newPage();
await page.goto(`http://localhost:${WEB}/`, { waitUntil: 'domcontentloaded' });

const fit = await page.evaluate(async () => {
  const FW = 384, FH = 512, N = 8, RANGE = 120;
  const load = (src) => new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = () => j(new Error(src)); i.src = src; });
  const data = async (src) => {
    const im = await load(src);
    const cv = document.createElement('canvas');
    cv.width = im.naturalWidth; cv.height = im.naturalHeight;
    const c = cv.getContext('2d', { willReadFrequently: true });
    c.imageSmoothingEnabled = false; c.drawImage(im, 0, 0);
    return Array.from({ length: N }, (_, i) => c.getImageData(i * FW, 0, FW, FH).data);
  };
  const mask = (d, test) => { const m = new Uint8Array(FW * FH); for (let p = 0; p < FW * FH; p++) { const q = p * 4; if (test(d[q], d[q + 1], d[q + 2], d[q + 3])) m[p] = 1; } return m; };
  const isSkin = (r, g, b, a) => a > 200 && r > 60 && b / r <= 0.50 && g / r >= 0.45 && g / r <= 0.80;
  /* Greaves cover TROUSERS and BOOTS, not skin — fitting them to skin drags them
     up onto the chest.  Olive trousers are green-dominant (G/R > 1, B/R < 0.7);
     the boots are near-neutral dark.  Both tests reject the flame (G/R 0.84),
     the log (G/R 0.1) and the soft glow (alpha < 200). */
  const isLeg = (r, g, b, a) => a > 200 && ((r > 20 && g / r > 1.0 && b / r < 0.72)
    || (r < 130 && Math.abs(r - g) < 26 && Math.abs(g - b) < 26));
  const solid = (r, g, b, a) => a > 200;
  const down = (m, k) => { const w = Math.ceil(FW / k), h = Math.ceil(FH / k), o = new Uint8Array(w * h); for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) if (m[y * FW + x]) o[((y / k) | 0) * w + ((x / k) | 0)] = 1; return { m: o, w, h }; };
  const cont = (g, b, w, h, dx, dy) => { let hit = 0, tot = 0; for (let y = 0; y < h; y++) { const ty = y + dy, ok = ty >= 0 && ty < h; for (let x = 0; x < w; x++) { if (!g[y * w + x]) continue; tot++; if (!ok) continue; const tx = x + dx; if (tx >= 0 && tx < w && b[ty * w + tx]) hit++; } } return tot ? hit / tot : 0; };
  const best = (gm, bm) => {
    const K = 4, G = down(gm, K), B = down(bm, K), R = Math.round(RANGE / K);
    let c = { s: -1, dx: 0, dy: 0 };
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const s = cont(G.m, B.m, G.w, G.h, dx, dy) - (dx * dx + dy * dy) * 2e-5; if (s > c.s) c = { s, dx, dy }; }
    let f = { s: -1, dx: c.dx * K, dy: c.dy * K, raw: 0 };
    for (let dy = c.dy * K - 6; dy <= c.dy * K + 6; dy++) for (let dx = c.dx * K - 6; dx <= c.dx * K + 6; dx++) { const r = cont(gm, bm, FW, FH, dx, dy); const s = r - (dx * dx + dy * dy) * 1e-7; if (s > f.s) f = { s, dx, dy, raw: r }; }
    return f;
  };

  const body = await data('/sprites/skills/firemaking-strip.webp');
  const skin = body.map((d) => mask(d, isSkin));
  const leg = body.map((d) => mask(d, isLeg));
  const out = {};
  for (const [k, src, tgt] of [
    ['shirt', '/sprites/gear/shirt/tshirt/fire-south.png', skin],
    ['chest', '/sprites/gear/chest/steelplate/fire-south.png', skin],
    ['legs', '/sprites/gear/legs/steelgreaves/fire-south.png', leg],
  ]) {
    const g = (await data(src)).map((d) => mask(d, solid));
    out[k] = g.map((m, i) => { const b = best(m, tgt[i]); return { f: i, dx: b.dx, dy: b.dy, before: +cont(m, tgt[i], FW, FH, 0, 0).toFixed(3), after: +b.raw.toFixed(3) }; });
  }
  return out;
});

for (const [k, rows] of Object.entries(fit)) {
  console.log('\n' + k);
  for (const r of rows) console.log(`  f${r.f}  dx ${String(r.dx).padStart(5)}  dy ${String(r.dy).padStart(5)}   on-skin ${r.before} -> ${r.after}`);
}
const table = Object.fromEntries(Object.entries(fit).map(([k, v]) => [k, v.map((r) => [r.dx, r.dy])]));
console.log('\n' + JSON.stringify(table));
await writeFile(`${OUT}/fire-fit.json`, JSON.stringify(table, null, 2));

/* preview: body + gear, uncorrected vs corrected */
const url = await page.evaluate(async (T) => {
  const FW = 384, FH = 512, N = 8;
  const load = (src) => new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = () => j(new Error(src)); i.src = src; });
  const body = await load('/sprites/skills/firemaking-strip.webp');
  const sh = await load('/sprites/gear/shirt/tshirt/fire-south.png');
  const ch = await load('/sprites/gear/chest/steelplate/fire-south.png');
  const lg = await load('/sprites/gear/legs/steelgreaves/fire-south.png');
  const ROWS = [
    { label: 'SHIRT — as shipped', layers: [[sh, null]] },
    { label: 'SHIRT — registered', layers: [[sh, T.shirt]] },
    { label: 'ARMOUR — as shipped', layers: [[lg, null], [ch, null]] },
    { label: 'ARMOUR — registered', layers: [[lg, T.legs], [ch, T.chest]] },
  ];
  const K = 0.5, CW = FW * K, CH2 = FH * K, LBL = 24, PAD = 8;
  const cv = document.createElement('canvas');
  cv.width = CW * N + PAD * 2; cv.height = ROWS.length * (CH2 + LBL) + PAD * 2;
  const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
  c.fillStyle = '#141c20'; c.fillRect(0, 0, cv.width, cv.height);
  let y = PAD;
  for (const row of ROWS) {
    c.font = 'bold 15px monospace'; c.fillStyle = '#D8A94D'; c.fillText(row.label, PAD + 2, y + 17); y += LBL;
    for (let f = 0; f < N; f++) {
      const x = PAD + f * CW;
      c.drawImage(body, f * FW, 0, FW, FH, x, y, CW, CH2);
      for (const [im, t] of row.layers) {
        const [dx, dy] = t ? t[f] : [0, 0];
        c.drawImage(im, f * FW, 0, FW, FH, x + dx * K, y + dy * K, CW, CH2);
      }
      c.strokeStyle = 'rgba(255,255,255,.14)'; c.strokeRect(x + 0.5, y + 0.5, CW - 1, CH2 - 1);
      c.font = 'bold 12px monospace'; c.fillStyle = 'rgba(255,255,255,.7)'; c.fillText('f' + f, x + 5, y + 15);
    }
    y += CH2;
  }
  return cv.toDataURL('image/png');
}, table);
await writeFile(`${OUT}/fire-registered.png`, Buffer.from(url.split(',')[1], 'base64'));
console.log('wrote', `${OUT}/fire-registered.png`);

await browser.close().catch(() => {});
try { srv.close(); } catch { /* best effort */ }
process.exit(0);
