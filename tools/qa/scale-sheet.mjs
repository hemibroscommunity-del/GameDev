/* Draw the character at true game scale, every direction, both poses.
 *
 *   node tools/qa/mp/run.mjs scalesheet     # measure first (writes out/scale.json)
 *   node tools/qa/scale-sheet.mjs           # then draw
 *
 * Owner: "I need you to provide a visual preview of the character per
 * direction and come up with the best solution to equalize the scale between
 * directions."
 *
 * Every figure is drawn at the size it is ACTUALLY rendered at in game — the
 * scale comes from mp-scalesheet's live probe (screen px per texture px
 * measured through the whole transform chain), not from re-multiplying the
 * constants by hand.  They share one ground line and one height guide, which
 * is what makes a few percent visible instead of arguable.
 *
 * The frame shown, and the height printed, are the MEDIAN OF THE WHOLE RUN
 * CYCLE: a jogging figure bobs, so frame 0 of each sheet would compare eight
 * arbitrary moments.  The height is computed as (painted frame height x the
 * live probe's px-per-texel) over every frame rather than read from the
 * probe's own 14 live samples — the scale in it is exact, the 14 samples are
 * not, and at 14 they still had southwest reading 1% off southeast, which is
 * the same sheet mirrored and therefore identical by construction.
 *
 * FRAME WIDTH IS DERIVED, NOT ASSUMED.  The logical frame is 256x256, but the
 * jog sheets ship at HALF that on disk (128px tall) and playerSprites upscales
 * them at load — so a hardcoded 256 slices TWO frames into every cell.  The
 * first draft did exactly that and the jog row came out as pairs of
 * overlapping figures at half scale.  Frames are square, so the on-disk frame
 * width is the sheet's own height; and the DRAW size comes from the measured
 * figure height rather than from a px-per-texel factor, which keeps the
 * picture honest whatever resolution the art happens to be stored at.
 */
import { chromium } from 'playwright-core';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'tools/qa/mp/out/scale-sheet.png');
const DATA = path.join(ROOT, 'tools/qa/mp/out/scale.json');
if (!fs.existsSync(DATA)) {
  console.error('missing out/scale.json — run: node tools/qa/mp/run.mjs scalesheet');
  process.exit(1);
}
const { rows } = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const DIRS = ['south', 'southeast', 'east', 'northeast', 'north', 'northwest', 'west', 'southwest'];

/* Which SHEET each facing renders from, and whether it is mirrored — the
   renderer collapses west onto east, southeast onto southwest, northwest onto
   northeast (resolveDirection).  Stated here because the preview must show
   what is drawn, not what was asked for. */
const SHEET = {
  south: ['south', false], southeast: ['southwest', true],
  east: ['east', false], northeast: ['northeast', false],
  north: ['north', false], northwest: ['northeast', true],
  west: ['east', true], southwest: ['southwest', false],
};

const PAGE = `<!doctype html><meta charset="utf-8"><body style="margin:0"><script>
const load = (u) => new Promise((res) => {
  const i = new Image(); i.onerror = () => res(null); i.onload = () => res(i); i.src = u;
});
/* painted bbox of one frame */
function bbox(c, fx, fw, fh) {
  const d = c.getImageData(fx, 0, fw, fh).data;
  let t = 1e9, b = -1, l = 1e9, r = -1;
  for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
    if (d[(y * fw + x) * 4 + 3] < 24) continue;
    if (y < t) t = y; if (y > b) b = y; if (x < l) l = x; if (x > r) r = x;
  }
  return b < 0 ? null : { t, b, l, r, h: b - t + 1, w: r - l + 1 };
}
window.__sheet = async (spec) => {
  const COL = 168, PAD = 26, TOP = 84, ROWH = 190;
  const cv = document.createElement('canvas');
  cv.width = PAD * 2 + COL * spec.dirs.length;
  cv.height = TOP + ROWH * 2 + 16;
  const c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.fillStyle = '#16222c'; c.fillRect(0, 0, cv.width, cv.height);
  c.font = '13px system-ui'; c.textAlign = 'center';

  for (let pi = 0; pi < 2; pi++) {
    const pose = pi === 0 ? 'stand' : 'jog';
    const rowTop = TOP + ROWH * pi;
    const baseY = rowTop + 122;
    /* ground line + the median-height guide, drawn first so figures sit on it */
    c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(0, baseY + .5); c.lineTo(cv.width, baseY + .5); c.stroke();
    const heights = spec.dirs.map((d) => spec.px[pose][d].h);
    const med = heights.slice().sort((a, b) => a - b)[heights.length >> 1];
    c.strokeStyle = 'rgba(242,193,78,.55)'; c.setLineDash([5, 4]);
    c.beginPath(); c.moveTo(0, baseY - med + .5); c.lineTo(cv.width, baseY - med + .5); c.stroke();
    c.setLineDash([]);
    c.fillStyle = '#F2C14E'; c.textAlign = 'left';
    c.fillText(pose.toUpperCase() + '  — dashed line = median height', PAD, rowTop + 16);
    c.textAlign = 'center';

    for (let i = 0; i < spec.dirs.length; i++) {
      const d = spec.dirs[i];
      const info = spec.px[pose][d];
      const img = spec.imgs[info.sheet + ':' + pose];
      if (!img) continue;
      const tmp = document.createElement('canvas');
      tmp.width = img.width; tmp.height = img.height;
      const tc = tmp.getContext('2d', { willReadFrequently: true });
      tc.drawImage(img, 0, 0);
      /* square frames -> the on-disk frame width IS the sheet height */
      const FW = img.height;
      const bb = bbox(tc, info.frame * FW, FW, img.height);
      if (!bb) continue;
      const cx = PAD + COL * i + COL / 2;
      /* Draw at the height that was MEASURED in game, so the picture cannot
         drift from the numbers printed under it. */
      const k = info.h / bb.h;
      const dw = bb.w * k, dh = info.h;
      c.save();
      c.translate(cx, baseY);
      if (info.mirror) c.scale(-1, 1);
      c.drawImage(img, info.frame * FW + bb.l, bb.t, bb.w, bb.h, -dw / 2, -dh, dw, dh);
      c.restore();
      if (spec.diag) spec.diag.push({ pose, d, sheetH: bb.h, sheetW: bb.w, frame: info.frame, frames: info.frames, k });
      c.fillStyle = '#E8E2D4';
      c.fillText(d, cx, baseY + 20);
      const pct = ((info.h - med) / med) * 100;
      c.fillStyle = Math.abs(pct) < 2 ? '#7FB77E' : Math.abs(pct) < 5 ? '#E0C060' : '#D8635D';
      c.fillText(info.h.toFixed(1) + 'px  ' + (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%', cx, baseY + 38);
    }
  }
  c.fillStyle = '#E8E2D4'; c.font = 'bold 15px system-ui'; c.textAlign = 'left';
  c.fillText('Character size per facing, drawn at true game scale', PAD, 30);
  c.font = '12px system-ui'; c.fillStyle = '#9FB3C0';
  c.fillText('mirrored facings share a sheet: west=east, northwest=northeast, southeast=southwest', PAD, 50);
  c.fillText('height = crown-to-feet in screen px, measured live in game; jog is the median of the whole run cycle', PAD, 66);
  return { png: cv.toDataURL('image/png'), diag: spec.diag };
};
window.__frames = async (url) => {
  const img = await load(url);
  if (!img) return null;
  const FW = img.height;   /* frames are square; sheets ship at half-res */
  const tmp = document.createElement('canvas');
  tmp.width = img.width; tmp.height = img.height;
  const tc = tmp.getContext('2d', { willReadFrequently: true });
  tc.drawImage(img, 0, 0);
  const n = Math.max(1, Math.round(img.width / FW));
  const hs = [];
  for (let f = 0; f < n; f++) {
    const bb = bbox(tc, f * FW, FW, img.height);
    hs.push({ f, h: bb ? bb.h : 0 });
  }
  const sorted = hs.slice().sort((a, b) => a.h - b.h);
  const mid = sorted[sorted.length >> 1];
  return { n, medianFrame: mid.f, medianH: mid.h, h: img.height };
};
</script></body>`;

const TYPES = { '.html': 'text/html', '.png': 'image/png', '.webp': 'image/webp' };
const srv = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/__s.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(PAGE); }
  fs.readFile(path.join(ROOT, url), (e, b) => {
    if (e) { res.writeHead(404); return res.end('no'); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(url)] || 'application/octet-stream' });
    res.end(b);
  });
});
await new Promise((r) => srv.listen(4296, r));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1500, height: 760 } });
await page.goto('http://127.0.0.1:4296/__s.html');

const px = { stand: {}, jog: {} };
const need = new Set();
for (const pose of ['stand', 'jog']) {
  for (const d of DIRS) {
    const [sheet, mirror] = SHEET[d];
    const row = rows.find((r) => r.want === d && r.moving === (pose === 'jog'));
    if (!row) { console.error('no measurement for', pose, d); process.exit(1); }
    const url = `/public/sprites/player/${pose}-${sheet}.png`;
    const fr = await page.evaluate((u) => window.__frames(u), url);
    if (!fr) { console.error('missing sheet', url); process.exit(1); }
    /* Heights come straight off the live probe for BOTH poses.  They used to
       be recomputed here for jog, to route around a sampler that only took 14
       timed shots of a bobbing figure; v2.3.1832 made the probe cover the run
       cycle by frame index instead, so the live reading is now the converged
       one (mirrors agree to 0.00px) and the picture can just report it.
       The sheet is still read, for WHICH frame to draw: the one whose painted
       height is the cycle median, so the figure shown matches the number. */
    px[pose][d] = { sheet, mirror, frame: fr.medianFrame, frames: fr.n, h: row.figurePx };
    need.add(sheet + ':' + pose);
  }
}
/* hand the images in by loading them inside the page */
await page.evaluate(async (list) => {
  window.__imgs = {};
  for (const [key, url] of list) {
    const i = new Image();
    await new Promise((r) => { i.onload = r; i.onerror = r; i.src = url; });
    window.__imgs[key] = i;
  }
}, [...need].map((k) => [k, `/public/sprites/player/${k.split(':')[1]}-${k.split(':')[0]}.png`]));

const res = await page.evaluate((spec) => window.__sheet({ ...spec, imgs: window.__imgs, diag: [] }),
  { dirs: DIRS, px });
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, Buffer.from(res.png.split(',')[1], 'base64'));
for (const r of res.diag) {
  console.log(`  ${r.pose.padEnd(5)} ${r.d.padEnd(10)} frame ${String(r.frame).padStart(2)}/${r.frames}  sheetbox ${r.sheetW}x${r.sheetH}  k=${r.k.toFixed(3)}`);
}
console.log('wrote tools/qa/mp/out/scale-sheet.png');
await browser.close();
srv.close();
