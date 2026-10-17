/* ═══ THE WORLD MAP UP CLOSE, FAR FROM YOU (v2.3.3319) ═══
 * (src/ui/worldMapDetail.js; tools/world/bake-wheel-world.mjs detailTiles)
 *
 * The long Wheel's whole-map picture is a pixel every 16 cells: zoomed in on
 * the world map far from you, a coast or a lake was a few big soft squares.
 * Its lands are baked four times finer, in tiles, and the map loads the ones
 * it shows once a coarse pixel would be COARSE_PX CSS px or more.  On a phone
 * viewport, against a real worker, in the long Wheel:
 *   1. the map opened on the whole Wheel loads no tile;
 *   2. panned to Frost Ridge's second stage and zoomed in, it loads tiles and
 *      draws them, and the land's edges are sharp: far fewer pixels between
 *      the land's colour and the sea's than the same view drawn the old way
 *      (window.__btMapDetailOff) -- every tile asked for at its bake's
 *      address, and never a one-colour (open sea) tile, which is filled;
 *   3. dragged round the Wheel just past that zoom it never holds more than
 *      16, letting the longest unseen go;
 *   4. closed, it lets go of every tile;
 *   5. no page errors.
 * Pictures in tools/qa/mp/out/mapdetail-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };

/* the share of pixels in a box that are neither of its two commonest colours
   (within `tol`): the soft edge between the land's colour and the sea's */
function mixedShare(px, box, dpr, tol = 24) {
  const counts = new Map();
  const at = [];
  for (let y = box.y0; y < box.y1; y += 2) {
    for (let x = box.x0; x < box.x1; x += 2) {
      const p = px.at(Math.round(x * dpr), Math.round(y * dpr));
      if (!p) continue;
      at.push(p);
      const k = (p[0] >> 3) << 10 | (p[1] >> 3) << 5 | (p[2] >> 3);
      counts.set(k, (counts.get(k) || 0) + 1);
    }
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => [((k >> 10) & 31) << 3, ((k >> 5) & 31) << 3, (k & 31) << 3]);
  const near = (p, c) => Math.abs(p[0] - c[0]) + Math.abs(p[1] - c[1]) + Math.abs(p[2] - c[2]) <= tol;
  let mixed = 0;
  for (const p of at) if (!top.some((c) => near(p, c))) mixed++;
  return { share: at.length ? mixed / at.length : 1, n: at.length };
}

let firstThrow = null;
export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const shot = (P, name) => P.page.screenshot({ path: join(OUT, `mapdetail-${name}.png`) });
  const geom = await H.wheelGeom();
  const { WHEEL_SPAWNS } = await import(H.REPO + '/server/src/wheelspawns.js');
  const { PLACED5 } = await import(H.REPO + '/public/tools/world/core/placed.js');

  const P = await H.newPlayer(browser, { name: 'Mapper', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel' });
  P.page.on('console', (m) => { if (!firstThrow && /app\.render threw/.test(m.text())) firstThrow = m.text(); });
  const asked = [];
  P.page.on('request', (r) => { const u = r.url(); if (u.includes('/detail/')) asked.push(u); });
  await H.enterWorld(P);
  let zone = null;
  for (let i = 0; i < 120; i++) {
    zone = await H.readState(P, (S) => (S._zoneLoading ? null : S.currentZone));
    if (zone === 'wheel') break;
    await P.page.waitForTimeout(500);
  }
  await P.page.waitForTimeout(2500);
  const dpr = await P.page.evaluate(() => window.devicePixelRatio || 1);
  let stopAlive = false;
  (async () => {
    while (!stopAlive) {
      await P.page.keyboard.press('Control').catch(() => {});
      for (let i = 0; i < 40 && !stopAlive; i++) await P.page.waitForTimeout(500).catch(() => {});
    }
  })();
  const wm = () => P.page.evaluate(() => (window.__btWorldMap ? JSON.parse(JSON.stringify(window.__btWorldMap)) : null));
  const probe = () => P.page.evaluate(() => (window.__btMapDetail ? window.__btMapDetail() : null));
  const drag = (dx, dy) => P.page.evaluate(({ dx, dy }) => {
    const c = document.querySelector('[data-world-map-canvas]');
    const r = c.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const ev = (type, ox, oy) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: x + ox, clientY: y + oy, pointerId: 9, pointerType: 'touch' }));
    ev('pointerdown', 0, 0);
    for (let i = 1; i <= 20; i++) ev('pointermove', dx * i / 20, dy * i / 20);
    ev('pointerup', dx, dy);
  }, { dx, dy });
  const zoomBy = async (n) => {
    const sel = n > 0 ? '[data-world-map-zoom-in]' : '[data-world-map-zoom-out]';
    for (let i = 0; i < Math.abs(n); i++) { await P.page.evaluate((s) => document.querySelector(s).click(), sel); await P.page.waitForTimeout(250); }
    await P.page.waitForTimeout(400);
  };

  /* ── 1. the whole Wheel: no tile ── */
  await P.page.evaluate(() => window.__btWorldMapOpen && window.__btWorldMapOpen(true));
  await P.page.waitForTimeout(1200);
  let w = await wm();
  let pr = await probe();
  rec.ok(`the long Wheel's map has its tiles (${pr && pr.files} files of ${pr && pr.cols * pr.rows}), and on the whole Wheel loads none (${pr && pr.loads})`,
    geom.long > 1 && !!w && w.open && !!pr && pr.has && pr.files === PLACED5.detail.fill.filter((f) => !f).length && pr.loads === 0 && pr.held === 0 && w.more && w.more.detail === null,
    { geom: geom.long, w: w && { zoom: w.zoom, detail: w.more && w.more.detail }, pr });

  /* ── 2. far off, zoomed in ── */
  const w0 = await wm();
  await drag(-100, 0);
  await P.page.waitForTimeout(300);
  const w1 = await wm();
  const k = 100 / (w1.cx - w0.cx);   /* CSS px a game px at this zoom */
  const T = WHEEL_SPAWNS.frost.deeper.find((d) => d.tier === 5).points[0];
  await drag(-(T[0] - w1.cx) * k, -(T[1] - w1.cy) * k);
  await P.page.waitForTimeout(400);
  await zoomBy(8);
  for (let i = 0; i < 30; i++) {
    pr = await probe();
    w = await wm();
    if (pr && pr.loading === 0 && pr.held >= 1 && w && w.more && w.more.detail >= 1) break;
    await P.page.waitForTimeout(300);
  }
  await P.page.waitForTimeout(500);
  await shot(P, 'far-detail');
  /* CSS px: below the header and the compass, clear of the key and buttons */
  const box = { x0: 10, x1: 320, y0: 120, y1: 640 };
  const sharp = mixedShare(await H.screenshotPixels(P), box, dpr);
  await P.page.evaluate(() => { window.__btMapDetailOff = true; });
  await P.page.waitForTimeout(700);
  await shot(P, 'far-coarse');
  const soft = mixedShare(await H.screenshotPixels(P), box, dpr);
  await P.page.evaluate(() => { window.__btMapDetailOff = false; });
  await P.page.waitForTimeout(500);
  rec.ok(`far off on Frost Ridge, zoomed in (x${w && w.rel && w.rel.toFixed(1)} the short Wheel's), the map loads its tiles (${pr && pr.loads}) and draws them (${w && w.more && w.more.detail} on screen)`,
    !!pr && pr.loads >= 1 && pr.held >= 1 && pr.failed === 0 && !!w && w.more && w.more.detail >= 1, { pr, detail: w && w.more && w.more.detail, rel: w && w.rel });
  rec.ok(`...and the land's edges are sharp: ${(sharp.share * 100).toFixed(1)}% of the view between the land's colour and the sea's, where the old picture had ${(soft.share * 100).toFixed(1)}%`,
    sharp.n > 1000 && soft.n > 1000 && sharp.share < soft.share * 0.6, { sharp, soft });
  const files = new Set(PLACED5.detail.fill.map((f, i) => (f ? null : `${i % PLACED5.detail.cols}-${Math.floor(i / PLACED5.detail.cols)}.png`)).filter(Boolean));
  const bad = asked.filter((u) => {
    const m = /\/world\/placed5\/detail\/([0-9]+-[0-9]+\.png)\?v=([0-9a-f]+)$/.exec(u);
    return !m || !files.has(m[1]) || m[2] !== PLACED5.v;
  });
  rec.ok(`...each tile asked for at its bake's address (${asked.length} asked, ?v=${PLACED5.v}), never a one-colour tile (those are filled)`, asked.length >= 1 && bad.length === 0, { bad: bad.slice(0, 4), asked: asked.slice(0, 4) });

  /* ── 3. round the Wheel just past the zoom that brings them: never more than 16 ── */
  await zoomBy(-3);   /* x2.6 the short Wheel's: a coarse pixel ~9 CSS px, the tiles' */
  const wa = await wm();
  await drag(-100, 0);
  await P.page.waitForTimeout(300);
  const wb = await wm();
  const k3 = 100 / (wb.cx - wa.cx);
  const D = PLACED5.detail, tileG = D.tile * (2 * geom.cx) / D.w;   /* a tile's side in game px */
  /* the first 22 tiles that are files, in turn: their neighbours come too */
  const stops = D.fill.map((f, i) => (f ? null : [((i % D.cols) + 0.5) * tileG, (Math.floor(i / D.cols) + 0.5) * tileG])).filter(Boolean).slice(0, 22);
  let most = 0;
  for (const [tx, ty] of stops) {
    const at = await wm();
    await drag(-(tx - at.cx) * k3, -(ty - at.cy) * k3);
    for (let i = 0; i < 12; i++) {
      await P.page.waitForTimeout(250);
      const q = await probe();
      if (q && q.held > most) most = q.held;
      if (q && q.loading === 0) break;
    }
  }
  pr = await probe();
  w = await wm();
  await shot(P, 'round');
  rec.ok(`dragged round the Wheel at x${w && w.rel && w.rel.toFixed(1)}, over ${stops.length} tiles: ${pr && pr.loads} loaded in all, never more than ${most} held (at most 16), the longest unseen let go (${pr && pr.freed})`,
    !!pr && most <= 16 && pr.held <= 16 && pr.loads > 16 && pr.freed > 0 && pr.failed === 0, { pr, most });

  /* ── 4. closed: all let go ── */
  await P.page.evaluate(() => window.__btWorldMapOpen && window.__btWorldMapOpen(false));
  await P.page.waitForTimeout(800);
  const closed = await probe();
  rec.ok(`closed, the map lets go of every tile (${closed && closed.held} held, ${closed && closed.freed} let go of ${closed && closed.loads})`,
    !!closed && closed.held === 0 && closed.freed === closed.loads, closed);

  stopAlive = true;
  const pageErrors = P.logs.filter((l) => /pageerror/.test(l));
  rec.ok('no page errors, and no render errors', pageErrors.length === 0 && !firstThrow, { errors: pageErrors.slice(0, 5), firstThrow });
  await P.ctx.close().catch(() => {});
}
