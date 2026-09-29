/* ═══ v2.3.2932: THE WORLD TRIAL — the whole island, baked from the art we already have ═══
 *
 * Owner, 2026-09-29: "Can we do one trial run where you just replicate the
 * entire worldview map using copies of existing art so I can test loading
 * times and game feel?"
 *
 * This bakes that world.  Layout comes from the World Builder's plan
 * (public/tools/world/plan.js -- the same island the World View painting
 * shows: frost NW, volcano N, dunes NE, cave E, foundry SE, sea caves S,
 * poison forest SW, jungle W, the meadow round the town); the PICTURES come
 * from copies of today's zone paintings:
 *
 *   - each region is a mirror-tiled crop of its own zone map, resampled to
 *     the plan's density (1.3 world px per art px), blended into its
 *     neighbours over a soft edge;
 *   - roads, the Sweetwater River (with the Mill Bridge), the mine railway,
 *     beaches and the sea are drawn along the plan's routes;
 *   - today's town painting (town_v17) sits in the middle at its real size.
 *
 * It will look like a patchwork -- the point is not the look but how the
 * REAL thing will load and feel: the same size, the same 512 art px chunks
 * the World Builder stores and the game will stream, the same bytes per
 * chunk, walked in the real game (src/game/worldTrial.js).
 *
 * Output (public/maps/world-trial-v1/):
 *   c_<col>_<row>.webp   20 x 20 chunks, 512 x 512 art px each
 *   manifest.json        sizes, the arrival point, the way home, and the
 *                        walk grid (sea and river block)
 *   overview.webp        the whole island at 1/10, for looking at
 *
 * Runs in Chromium (canvas does the compositing and the WebP encoding; the
 * repo has no image library):
 *
 *   node tools/world/bake-trial-world.mjs [--quality 0.8]
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require_ = createRequire(path.join(REPO, 'noop.cjs'));
const { chromium } = require_('playwright-core');
const PUB = path.join(REPO, 'public');
const OUT_REL = 'maps/world-trial-v1';
const OUT = path.join(PUB, OUT_REL);
const qArg = process.argv.indexOf('--quality');
const QUALITY = qArg > 0 ? Number(process.argv[qArg + 1]) : 0.8;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/bake') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end('<!doctype html><title>bake</title>'); }
  const f = path.join(PUB, p);
  if (!f.startsWith(PUB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

/* Everything below runs IN THE PAGE. */
async function setup(quality) {
  const { PLAN } = await import('/tools/world/plan.js');
  const { buildBlueprint, C } = await import('/tools/world/core/layout.js');
  const { gridInfo } = await import('/tools/world/core/grid.js');
  const bp = buildBlueprint(PLAN);
  const g = gridInfo(PLAN);
  const K = PLAN.worldPxPerArtPx;
  /* Zone art is 1254 px drawn over 1024 world px; the trial is drawn at the
     plan's 1.3 world px per art px.  So one zone-art pixel is
     (1024/1254)/1.3 trial art px -- features keep their size in the world. */
  const ZONE_TO_ART = (1024 / 1254) / K;
  const MATERIALS = {
    meadow: ['meadow_v6', [0.30, 0.10, 0.76, 0.90]],
    frost: ['frost_v5', [0.08, 0.04, 0.92, 0.50]],
    ember: ['ember_v6', [0.06, 0.14, 0.94, 0.96]],
    sky: ['sky_v5', [0.04, 0.36, 0.96, 0.98]],
    hollows: ['hollows_v6', [0.08, 0.28, 0.92, 0.96]],
    thunder: ['thunder_v5', [0.04, 0.30, 0.96, 0.96]],
    tidal: ['tidal_v6', [0.28, 0.58, 0.72, 0.92]],
    mist: ['mist_v5', [0.04, 0.04, 0.96, 0.96]],
    verdant: ['verdant_v1', [0.04, 0.04, 0.96, 0.78]],
    sea: ['tidal_v6', [0.00, 0.00, 0.10, 0.06], 2],
    road: ['sky_v5', [0.44, 0.62, 0.60, 0.78]],
    sand: ['tidal_v6', [0.40, 0.70, 0.56, 0.84]],
  };
  const bitmaps = Object.create(null);
  const bitmap = async (name) => bitmaps[name] || (bitmaps[name] = await createImageBitmap(await (await fetch(`/maps/${name}.webp`)).blob()));
  /* A crop, resampled to trial density and made to TILE, as a pattern
     anchored at art (0, 0) of the frame -- so the same place always gets the
     same pixels, whichever chunk draws it.  Tiling by cross-fade rather than
     by mirroring: the crop's own edges are replaced by the same crop shifted
     half a tile (whose middle IS continuous across the tile edge), faded in
     over the outer quarter.  Mirroring is seamless too, but turns every path
     and cliff into a kaleidoscope -- the first bake of this trial did, and it
     read as wallpaper rather than as ground. */
  const pattern = Object.create(null);
  for (const [id, [name, [a, b, c, d], extra = 1]] of Object.entries(MATERIALS)) {
    const bm = await bitmap(name);
    const sx = a * bm.width, sy = b * bm.height, sw = (c - a) * bm.width, sh = (d - b) * bm.height;
    const w = Math.round(sw * ZONE_TO_ART * extra), h = Math.round(sh * ZONE_TO_ART * extra);
    const base = new OffscreenCanvas(w, h), bg = base.getContext('2d');
    bg.imageSmoothingQuality = 'high';
    bg.drawImage(bm, sx, sy, sw, sh, 0, 0, w, h);
    /* ONE AXIS AT A TIME.  A copy shifted in both axes at once has its own
       seams along both centre lines, and those reach the tile's edges at
       their midpoints -- exactly where the copy is fully shown, so the
       first version of this printed a hard line through every repeat.
       Shifted along x only, the copy's one seam is the vertical centre line,
       where its weight is zero; then the same along y on the result, which
       is already seamless left-to-right and stays so. */
    const pass = (src, axis) => {
      const out = new OffscreenCanvas(w, h), og = out.getContext('2d');
      og.drawImage(src, 0, 0);
      const cp = new OffscreenCanvas(w, h), cg = cp.getContext('2d');
      const hw = Math.floor(w / 2), hh = Math.floor(h / 2);
      if (axis === 'x') { cg.drawImage(src, -hw, 0); cg.drawImage(src, w - hw, 0); }
      else { cg.drawImage(src, 0, -hh); cg.drawImage(src, 0, h - hh); }
      const m = new OffscreenCanvas(w, h), mg = m.getContext('2d');
      const img = mg.createImageData(w, h);
      const n = axis === 'x' ? w : h, r = n / 4;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const q = axis === 'x' ? x : y;
        const e = Math.min(q, n - 1 - q);
        const v = e >= r ? 0 : 1 - e / r;
        img.data[(y * w + x) * 4 + 3] = Math.round(255 * v * v * (3 - 2 * v));
      }
      mg.putImageData(img, 0, 0);
      cg.globalCompositeOperation = 'destination-in';
      cg.drawImage(m, 0, 0);
      og.drawImage(cp, 0, 0);
      return out;
    };
    pattern[id] = { canvas: pass(pass(base, 'x'), 'y') };
  }
  pattern.town = pattern.meadow;
  /* Today's town painting at its real size (it is already drawn at 1.3),
     its painted sky trimmed and its edge feathered into the meadow. */
  const townBm = await bitmap('town_v17');
  const TI = { top: 150, left: 70, right: 70, bottom: 12, feather: 56 };
  const town = new OffscreenCanvas(townBm.width, townBm.height);
  {
    const tg = town.getContext('2d');
    tg.drawImage(townBm, 0, 0);
    const m = new OffscreenCanvas(townBm.width, townBm.height), mg = m.getContext('2d');
    /* the rect sits a whole feather inside the trim and the blur is half a
       feather, so the painting has faded to nothing by its own trimmed edge
       -- a first bake that faded only halfway left a hard line along it */
    const f = TI.feather;
    mg.filter = `blur(${f / 2}px)`;
    mg.fillStyle = '#fff';
    mg.fillRect(TI.left + f, TI.top + f, townBm.width - TI.left - TI.right - 2 * f, townBm.height - TI.top - TI.bottom - 2 * f);
    tg.globalCompositeOperation = 'destination-in';
    tg.drawImage(m, 0, 0);
  }
  const townX = g.cx - townBm.width / 2, townY = g.cy - townBm.height / 2;
  /* Where you arrive from town: the foot of the painted stairs (45.5% across
     its bottom edge), a little way out onto the meadow road. */
  const stairs = { x: townX + 0.455 * townBm.width, y: townY + townBm.height };

  window.__bake = { PLAN, bp, g, C, K, pattern, town, townX, townY, stairs, quality };
  /* the stairs are the town painting's one way down, so the South Road leaves
     from their foot rather than from the plan's centre line */
  window.__bake.stairsFoot = [stairs.x, stairs.y - 20];
  return { cols: Math.round(g.AW / 512), rows: Math.round(g.AH / 512), W: g.AW, H: g.AH, K, stairs, ax: g.ax, ay: g.ay };
}

async function bakeRow(j) {
  const { PLAN, bp, g, C, pattern, town, townX, townY, quality } = window.__bake;
  /* M and CM leave room for the widest blur (3 sigma) on every side of the
     512 that is kept, so two neighbouring chunks compute identical pixels
     along the edge they share -- the cut between chunks must never show. */
  const CH = 512, M = 96, SZ = CH + 2 * M, S = bp.scale, CM = 12, BLEND = 24;
  const out = [];
  const cols = Math.round(g.AW / CH);
  const toB64 = async (blob) => {
    const u = new Uint8Array(await blob.arrayBuffer());
    let s = ''; for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768));
    return btoa(s);
  };
  for (let i = 0; i < cols; i++) {
    const ox = g.ax + i * CH - M, oy = g.ay + j * CH - M;           /* canvas origin, frame art px */
    const cv = new OffscreenCanvas(SZ, SZ), ctx = cv.getContext('2d');
    const fillPat = (c2, id) => {
      const p = c2.createPattern(pattern[id].canvas, 'repeat');
      p.setTransform(new DOMMatrix().translateSelf(-ox, -oy));
      c2.fillStyle = p;
      c2.fillRect(0, 0, SZ, SZ);
    };
    /* the blueprint cells under the canvas (plus a margin for the blurs) */
    const bx0 = Math.floor((ox - bp.x0) / S) - CM, by0 = Math.floor((oy - bp.y0) / S) - CM;
    const cw = SZ / S + 2 * CM, chh = SZ / S + 2 * CM;
    const cellAt = (x, y) => {
      const bx = Math.min(bp.w - 1, Math.max(0, bx0 + x)), by = Math.min(bp.h - 1, Math.max(0, by0 + y));
      return by * bp.w + bx;
    };
    const maskFrom = (test, blurPx, dilate = 0) => {
      let a = new Uint8Array(cw * chh);
      for (let y = 0; y < chh; y++) for (let x = 0; x < cw; x++) a[y * cw + x] = test(cellAt(x, y)) ? 1 : 0;
      for (let d = 0; d < dilate; d++) {
        const b = new Uint8Array(a);
        for (let y = 0; y < chh; y++) for (let x = 0; x < cw; x++) {
          if (a[y * cw + x]) continue;
          if ((x > 0 && a[y * cw + x - 1]) || (x < cw - 1 && a[y * cw + x + 1]) || (y > 0 && a[(y - 1) * cw + x]) || (y < chh - 1 && a[(y + 1) * cw + x])) b[y * cw + x] = 1;
        }
        a = b;
      }
      let any = false;
      const small = new ImageData(cw, chh);
      for (let k = 0; k < a.length; k++) { small.data[k * 4 + 3] = a[k] ? 255 : 0; small.data[k * 4] = 255; if (a[k]) any = true; }
      if (!any) return null;
      const sc = new OffscreenCanvas(cw, chh); sc.getContext('2d').putImageData(small, 0, 0);
      const m = new OffscreenCanvas(SZ, SZ), mg = m.getContext('2d');
      mg.imageSmoothingEnabled = true;
      mg.filter = `blur(${blurPx}px)`;
      /* cell (bx0, by0) starts at art bp.x0 + bx0 * S -> canvas px */
      mg.drawImage(sc, bp.x0 + bx0 * S - ox, bp.y0 + by0 * S - oy, cw * S, chh * S);
      return m;
    };
    const through = (id, mask) => {
      if (!mask) return;
      const t = new OffscreenCanvas(SZ, SZ), tg = t.getContext('2d');
      fillPat(tg, id);
      tg.globalCompositeOperation = 'destination-in';
      tg.drawImage(mask, 0, 0);
      ctx.drawImage(t, 0, 0);
    };

    /* 1. regions, each through its own blurred mask, ADDED together.  The
       masks are blurs of a partition (every cell is in exactly one region),
       so they sum to 1 everywhere and the result is the same whatever order
       they are drawn in -- which is what makes neighbouring chunks agree at
       a corner where three regions meet (layering them "one over the other"
       did not: each chunk's commonest region came out on the bottom). */
    const present = new Set();
    for (let y = 0; y < chh; y++) for (let x = 0; x < cw; x++) present.add(bp.reg[cellAt(x, y)]);
    const land = new OffscreenCanvas(SZ, SZ), lg = land.getContext('2d');
    for (const rid of present) {
      const r = bp.regionIds[rid];
      const mask = present.size === 1 ? null : maskFrom((ci) => bp.reg[ci] === rid, BLEND);
      const t = new OffscreenCanvas(SZ, SZ), tg = t.getContext('2d');
      fillPat(tg, pattern[r] ? r : 'meadow');
      if (mask) { tg.globalCompositeOperation = 'destination-in'; tg.drawImage(mask, 0, 0); }
      lg.globalCompositeOperation = 'lighter';
      lg.drawImage(t, 0, 0);
    }
    fillPat(ctx, 'meadow');          /* under-fill for the 1/255 the masks can miss */
    ctx.drawImage(land, 0, 0);

    /* 2. routes, in art px relative to the canvas */
    const near = (pts, pad) => pts.some((p) => p[0] > ox - pad && p[0] < ox + SZ + pad && p[1] > oy - pad && p[1] < oy + SZ + pad);
    const strokeMask = (paths, blurPx) => {
      const m = new OffscreenCanvas(SZ, SZ), mg = m.getContext('2d');
      mg.filter = `blur(${blurPx}px)`;
      mg.strokeStyle = '#fff'; mg.lineCap = 'round'; mg.lineJoin = 'round';
      let any = false;
      for (const { pts, w } of paths) {
        if (!near(pts, typeof w === 'number' ? w + 40 : 220)) continue;
        any = true;
        if (typeof w === 'number') {
          mg.lineWidth = w;
          mg.beginPath();
          pts.forEach((p, k) => (k ? mg.lineTo(p[0] - ox, p[1] - oy) : mg.moveTo(p[0] - ox, p[1] - oy)));
          mg.stroke();
        } else {
          for (let k = 0; k < pts.length - 1; k++) {
            mg.lineWidth = w(k);
            mg.beginPath(); mg.moveTo(pts[k][0] - ox, pts[k][1] - oy); mg.lineTo(pts[k + 1][0] - ox, pts[k + 1][1] - oy); mg.stroke();
          }
        }
      }
      return any ? m : null;
    };
    const planRoad = Object.fromEntries(PLAN.roads.map((r) => [r.id, r]));
    const roads = bp.routes.filter((r) => r.kind === 'road').map((r) => {
      /* trunk roads start at the town's gates; for the trial they run on in
         under the town painting, so they come out of it instead of stopping
         short of its cliffs */
      const trunk = planRoad[r.id] && Math.hypot(planRoad[r.id].pts[0][0], planRoad[r.id].pts[0][1]) < 1.4;
      const pts = !trunk ? r.pts : r.id === 'south' ? [window.__bake.stairsFoot, ...r.pts.filter((p) => p[1] > window.__bake.stairsFoot[1])] : [[g.cx, g.cy], ...r.pts];
      return { pts, w: 2 * ((planRoad[r.id] && planRoad[r.id].half) || 36) };
    });
    through('road', strokeMask(roads, 3));

    const rv = PLAN.rivers[0];
    const rivers = bp.routes.filter((r) => r.kind === 'river').map((r) => {
      const n = Math.max(1, r.pts.length - 1);
      return { pts: r.pts, w: (k) => rv.width[0] + (rv.width[1] - rv.width[0]) * (k / n), bank: (k) => rv.width[0] + (rv.width[1] - rv.width[0]) * (k / n) + 26 };
    });
    const bank = strokeMask(rivers.map((r) => ({ pts: r.pts, w: r.bank })), 6);
    if (bank) {
      const t = new OffscreenCanvas(SZ, SZ), tg = t.getContext('2d');
      tg.fillStyle = 'rgba(86,70,44,0.85)'; tg.fillRect(0, 0, SZ, SZ);
      tg.globalCompositeOperation = 'destination-in'; tg.drawImage(bank, 0, 0);
      ctx.drawImage(t, 0, 0);
    }
    through('sea', strokeMask(rivers, 2));

    /* the railway: a gravel bed, dashed sleepers, and two rails drawn as the
       centre line offset either side */
    const offsetLine = (pts, d) => pts.map((p, k) => {
      const a = pts[Math.max(0, k - 1)], b = pts[Math.min(pts.length - 1, k + 1)];
      const tx = b[0] - a[0], ty = b[1] - a[1], tl = Math.hypot(tx, ty) || 1;
      return [p[0] - (ty / tl) * d, p[1] + (tx / tl) * d];
    });
    for (const r of bp.routes.filter((q) => q.kind === 'rail')) {
      if (!near(r.pts, 60)) continue;
      const line = (pts) => { ctx.beginPath(); pts.forEach((p, k) => (k ? ctx.lineTo(p[0] - ox, p[1] - oy) : ctx.moveTo(p[0] - ox, p[1] - oy))); ctx.stroke(); };
      ctx.save();
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.lineWidth = 30; ctx.strokeStyle = r.abandoned ? 'rgba(120,100,78,0.35)' : 'rgba(96,88,80,0.55)'; line(r.pts);
      ctx.setLineDash([5, 7]); ctx.lineCap = 'butt'; ctx.lineWidth = 24; ctx.strokeStyle = r.abandoned ? 'rgba(88,60,40,0.55)' : 'rgba(70,46,28,0.95)'; line(r.pts);
      ctx.setLineDash([]); ctx.lineWidth = 3; ctx.strokeStyle = r.abandoned ? 'rgba(130,86,58,0.85)' : '#9a9da3';
      line(offsetLine(r.pts, -6)); line(offsetLine(r.pts, 6));
      ctx.restore();
    }

    /* bridges: heavy planks across the river, along the road */
    for (const p of bp.pois.filter((q) => q.kind === 'bridge')) {
      if (p.x < ox - 200 || p.x > ox + SZ + 200 || p.y < oy - 200 || p.y > oy + SZ + 200) continue;
      const road = bp.routes.find((r) => r.kind === 'road' && r.name === p.road);
      let ang = 0;
      if (road) {
        let k = 0, bd = Infinity;
        road.pts.forEach((q, n) => { const d = (q[0] - p.x) ** 2 + (q[1] - p.y) ** 2; if (d < bd) { bd = d; k = n; } });
        const a = road.pts[Math.max(0, k - 2)], b = road.pts[Math.min(road.pts.length - 1, k + 2)];
        ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      }
      ctx.save();
      ctx.translate(p.x - ox, p.y - oy); ctx.rotate(ang);
      const L = 150, Wd = 96;
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(-L / 2 + 6, -Wd / 2 + 8, L, Wd);
      ctx.fillStyle = '#8a6440'; ctx.fillRect(-L / 2, -Wd / 2, L, Wd);
      ctx.strokeStyle = 'rgba(40,26,14,0.7)'; ctx.lineWidth = 2;
      for (let x = -L / 2 + 10; x < L / 2; x += 12) { ctx.beginPath(); ctx.moveTo(x, -Wd / 2); ctx.lineTo(x, Wd / 2); ctx.stroke(); }
      ctx.fillStyle = '#5c4027'; ctx.fillRect(-L / 2, -Wd / 2 - 6, L, 8); ctx.fillRect(-L / 2, Wd / 2 - 2, L, 8);
      ctx.restore();
    }

    /* 3. the coast: a sandy fringe, then the sea */
    through('sand', maskFrom((ci) => bp.cls[ci] === C.ocean, 10, 3));
    through('sea', maskFrom((ci) => bp.cls[ci] === C.ocean, 5));

    /* 4. today's town, at its real size, in the middle */
    if (townX < ox + SZ && townX + town.width > ox && townY < oy + SZ && townY + town.height > oy) ctx.drawImage(town, townX - ox, townY - oy);

    /* the chunk itself: the middle 512 of the 640 */
    const oc = new OffscreenCanvas(CH, CH);
    oc.getContext('2d').drawImage(cv, M, M, CH, CH, 0, 0, CH, CH);
    const blob = await oc.convertToBlob({ type: 'image/webp', quality });
    const bmp = await createImageBitmap(oc, { resizeWidth: 51, resizeHeight: 51, resizeQuality: 'high' });
    const ov = new OffscreenCanvas(51, 51); ov.getContext('2d').drawImage(bmp, 0, 0);
    const ovd = ov.getContext('2d').getImageData(0, 0, 51, 51);
    out.push({ i, j, b64: await toB64(blob), ov: Array.from(ovd.data) });
  }
  return out;
}

/* The walk grid: one bit per 32 world px tile, 1 = blocked.  Only what the
   trial actually DRAWS from the plan blocks -- the sea and the river (bridges
   stay open).  Woods, cliffs and ponds in the plan are not drawn here, so
   blocking them would be invisible walls. */
function walkGrid(tile) {
  const { bp, g, C, K } = window.__bake;
  const cols = Math.round(g.AW * K / tile), rows = Math.round(g.AH * K / tile);
  const bits = new Uint8Array(Math.ceil(cols * rows / 8));
  let blocked = 0;
  for (let ty = 0; ty < rows; ty++) for (let tx = 0; tx < cols; tx++) {
    const ax = g.ax + (tx + 0.5) * tile / K, ay = g.ay + (ty + 0.5) * tile / K;
    const bx = Math.floor((ax - bp.x0) / bp.scale), by = Math.floor((ay - bp.y0) / bp.scale);
    const c = bp.cls[Math.min(bp.h - 1, by) * bp.w + Math.min(bp.w - 1, bx)];
    if (c === C.ocean || c === C.river) { const k = ty * cols + tx; bits[k >> 3] |= 1 << (k & 7); blocked++; }
  }
  let s = ''; for (let i = 0; i < bits.length; i++) s += String.fromCharCode(bits[i]);
  return { cols, rows, tile, bits: btoa(s), blocked };
}

try {
  const page = await (await browser.newContext()).newPage();
  page.on('pageerror', (e) => console.error('page error:', e));
  await page.goto(`http://127.0.0.1:${server.address().port}/bake`);
  const t0 = Date.now();
  const info = await page.evaluate(setup, QUALITY);
  console.log(`plan built, ${info.cols} x ${info.rows} chunks of 512 art px (${Math.round(info.W * info.K)} world px across)`);
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const OVN = 51;
  const overview = new Uint8ClampedArray(info.cols * OVN * info.rows * OVN * 4);
  let bytes = 0, max = 0;
  const sizes = [];
  for (let j = 0; j < info.rows; j++) {
    const row = await page.evaluate(bakeRow, j);
    for (const c of row) {
      const buf = Buffer.from(c.b64, 'base64');
      fs.writeFileSync(path.join(OUT, `c_${c.i}_${c.j}.webp`), buf);
      bytes += buf.length; max = Math.max(max, buf.length); sizes.push(buf.length);
      for (let y = 0; y < OVN; y++) for (let x = 0; x < OVN; x++) for (let k = 0; k < 4; k++) {
        overview[(((c.j * OVN + y) * info.cols * OVN) + c.i * OVN + x) * 4 + k] = c.ov[(y * OVN + x) * 4 + k];
      }
    }
    process.stdout.write(`\r  row ${j + 1}/${info.rows}  ${(bytes / 1048576).toFixed(1)} MB`);
  }
  process.stdout.write('\n');
  const walk = await page.evaluate(walkGrid, 32);
  const toWorld = (ax, ay) => ({ x: Math.round((ax - info.ax) * info.K), y: Math.round((ay - info.ay) * info.K) });
  const stairs = toWorld(info.stairs.x, info.stairs.y);
  const manifest = {
    version: 1,
    note: 'World trial (v2.3.2932): the plan\'s island baked from copies of today\'s zone art. tools/world/bake-trial-world.mjs',
    chunkArt: 512, worldPxPerArtPx: info.K, cols: info.cols, rows: info.rows,
    worldW: Math.round(info.W * info.K), worldH: Math.round(info.H * info.K),
    chunk: 'c_{i}_{j}.webp',
    /* the way back to town is a marker at the foot of the painted stairs;
       you arrive a few tiles out on the road, clear of it */
    townExit: { tx: Math.floor(stairs.x / 32), ty: Math.floor(stairs.y / 32) + 1 },
    arrival: { x: stairs.x, y: stairs.y + 32 * 5 },
    bytes, meanChunkBytes: Math.round(bytes / sizes.length), maxChunkBytes: max,
    walk: { cols: walk.cols, rows: walk.rows, tile: walk.tile, bits: walk.bits },
  };
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest));
  const ovUrl = await page.evaluate(async ({ w, h, px }) => {
    const c = new OffscreenCanvas(w, h);
    c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(px), w, h), 0, 0);
    const u = new Uint8Array(await (await c.convertToBlob({ type: 'image/webp', quality: 0.8 })).arrayBuffer());
    let s = ''; for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768));
    return btoa(s);
  }, { w: info.cols * OVN, h: info.rows * OVN, px: Array.from(overview) });
  fs.writeFileSync(path.join(OUT, 'overview.webp'), Buffer.from(ovUrl, 'base64'));
  sizes.sort((a, b) => a - b);
  console.log(`wrote ${sizes.length} chunks: ${(bytes / 1048576).toFixed(1)} MB, mean ${Math.round(bytes / sizes.length / 1024)} KB, median ${Math.round(sizes[sizes.length >> 1] / 1024)} KB, max ${Math.round(max / 1024)} KB`);
  console.log(`walk grid ${walk.cols} x ${walk.rows}, ${walk.blocked} tiles blocked; arrival ${JSON.stringify(manifest.arrival)}; ${((Date.now() - t0) / 1000).toFixed(0)} s`);
} finally {
  await browser.close();
  server.close();
}
