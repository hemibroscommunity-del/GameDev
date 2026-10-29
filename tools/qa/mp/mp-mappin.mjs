/* ═══ v2.3.3879: YOUR OWN PIN ON THE MAP ═══
 *
 * The owner: "add the ability to drop a pin to the map for where you want to
 * go after opening it ... You just need to also have an easy way to remove it
 * afterwards" (game/dropPin.js, ui/WorldMapOverlay.jsx, the Wheel's minimap).
 * On an upright phone (touch) and a computer (wide, a mouse):
 *   1. on the World map a drag drops nothing;
 *   2. a tap (a click) on open ground drops the pin there, drawn, with
 *      "Remove pin" at the top;
 *   3. the minimap shows it; dropped far away (the map zoomed out), it rides
 *      the minimap's edge;
 *   4. a reload keeps it (this character, this device);
 *   5. a tap on the pin lifts it; dropped again, "Remove pin" lifts it.
 * Pictures: tools/qa/mp/out/mappin-{phone,desk}-{map,minimap}.png.
 */
import * as H from './harness.mjs';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';

const OUT = join(H.REPO, 'tools/qa/mp/out');
const st = (P) => P.page.evaluate(() => {
  const wm = window.__btWorldMap || {}, mm = window.__btMinimap || {};
  const cv = document.querySelector('[data-world-map-canvas]');
  const r = cv ? cv.getBoundingClientRect() : null;
  return { at: window.__btMapPin ? window.__btMapPin.at() : null, open: !!wm.open, drawn: (wm.more && wm.more.dropPin) || null, mini: mm.dropPin || null,
    unpin: !!document.querySelector('[data-world-map-unpin]'), hint: (document.querySelector('[data-world-map-pinhint]') || {}).textContent || null,
    cv: r ? { l: r.left, t: r.top, w: r.width, h: r.height } : null };
});
const openMap = async (P) => { await P.page.evaluate(() => window.__btWorldMapOpen(true)); await P.page.waitForTimeout(1500); return st(P); };
const closeMap = async (P) => { await P.page.evaluate(() => window.__btWorldMapOpen(false)); await P.page.waitForTimeout(1200); };
/* a real tap (phone) or click (computer) at a canvas spot */
const tapAt = async (P, touch, x, y) => { if (touch) await P.page.touchscreen.tap(x, y); else await P.page.mouse.click(x, y); await P.page.waitForTimeout(500); };
/* a drag across the canvas, as pointer events (one finger / the mouse) */
const dragOn = (P, x, y) => P.page.evaluate(({ x, y }) => {
  const cv = document.querySelector('[data-world-map-canvas]');
  const ev = (t, dx) => cv.dispatchEvent(new PointerEvent(t, { bubbles: true, pointerId: 7, isPrimary: true, button: 0, clientX: x + dx, clientY: y }));
  ev('pointerdown', 0); for (let i = 1; i <= 6; i++) ev('pointermove', i * 20); ev('pointerup', 120);
}, { x, y });

async function device(P, label, touch, rec) {
  await H.enterWorld(P);
  const inW = await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 150000, label: 'in the world' }).catch(() => null);
  rec.ok(`${label}: in the world (guard)`, !!inW, inW);
  if (!inW) return;
  let s = await openMap(P);
  const mx = s.cv.l + s.cv.w / 2, my = s.cv.t + s.cv.h / 2;
  /* 1 */
  await dragOn(P, mx - 60, my + 40);
  await P.page.waitForTimeout(500);
  s = await st(P);
  rec.ok(`${label} 1. a drag on the World map drops nothing (hint "${s.hint}")`, !s.at && !s.unpin && /drop a pin/.test(s.hint || '') && (touch ? /Tap/.test(s.hint) : /Click/.test(s.hint)), s);
  /* 2 */
  await tapAt(P, touch, mx + 50, my - 50);
  s = await st(P);
  await P.page.screenshot({ path: join(OUT, `mappin-${label}-map.png`) }).catch(() => {});
  rec.ok(`${label} 2. a ${touch ? 'tap' : 'click'} drops the pin there (${JSON.stringify(s.at)}), drawn (${s.drawn && s.drawn.x},${s.drawn && s.drawn.y}), "Remove pin" up`,
    !!s.at && !!s.drawn && !s.drawn.edge && Math.abs(s.cv.l + s.drawn.x - (mx + 50)) <= 3 && Math.abs(s.cv.t + s.drawn.y - (my - 50)) <= 3 && s.unpin, s);
  /* 3 */
  await closeMap(P);
  s = await st(P);
  await P.page.screenshot({ path: join(OUT, `mappin-${label}-minimap.png`) }).catch(() => {});
  const near = s.mini;
  s = await openMap(P);
  for (let i = 0; i < 6; i++) await P.page.click('[data-world-map-zoom-out]').catch(() => {});
  await P.page.waitForTimeout(600);
  s = await st(P);
  await tapAt(P, touch, s.cv.l + s.cv.w * 0.25, s.cv.t + s.cv.h * 0.3);   /* clear of the zoom buttons, the key and the compass */
  const far = await st(P);
  await closeMap(P);
  s = await st(P);
  rec.ok(`${label} 3. the minimap shows it (${JSON.stringify(near)}); dropped far, it rides the minimap's edge (${JSON.stringify(s.mini)})`,
    !!near && !near.edge && !!s.mini && s.mini.edge === true && !!far.at, { near, far: far.at, mini: s.mini });
  /* 4 */
  const before = s.at;
  await P.page.reload();
  await H.enterWorld(P).catch(() => {});
  await H.waitFor(P, (S) => ({ z: S.currentZone, l: !!S._zoneLoading }), (v) => v.z === 'wheel' && !v.l, { timeout: 150000, label: 'back in the world' }).catch(() => null);
  await P.page.waitForTimeout(1500);
  s = await st(P);
  rec.ok(`${label} 4. a reload keeps it (${JSON.stringify(s.at)} = ${JSON.stringify(before)})`, !!s.at && !!before && s.at.x === before.x && s.at.y === before.y, { s, before });
  /* 5 */
  s = await openMap(P);
  await P.page.evaluate(() => { const b = document.querySelector('[data-world-map-me]'); if (b) b.click(); });
  await P.page.waitForTimeout(800);
  /* drop one where we can see it, then tap the pin's head */
  s = await st(P);
  await tapAt(P, touch, s.cv.l + s.cv.w / 2 + 40, s.cv.t + s.cv.h / 2 + 40);
  s = await st(P);
  const head = s.drawn ? { x: s.cv.l + s.drawn.x, y: s.cv.t + s.drawn.y - 18 } : null;
  if (head) await tapAt(P, touch, head.x, head.y);
  const off1 = await st(P);
  await tapAt(P, touch, s.cv.l + s.cv.w / 2 - 40, s.cv.t + s.cv.h / 2 + 40);
  const on2 = await st(P);
  if (touch) { const b = await P.page.$('[data-world-map-unpin]'); const bb = b && await b.boundingBox(); if (bb) await P.page.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); }
  else await P.page.click('[data-world-map-unpin]').catch(() => {});
  await P.page.waitForTimeout(500);
  const off2 = await st(P);
  await closeMap(P);
  const after = await st(P);
  rec.ok(`${label} 5. a ${touch ? 'tap' : 'click'} on the pin lifts it (${JSON.stringify(off1.at)}); dropped again, "Remove pin" lifts it (${JSON.stringify(off2.at)}), and the minimap shows none`,
    !!head && !off1.at && !!on2.at && on2.unpin && !off2.at && !off2.unpin && !after.mini, { head, off1, on2, off2, after: after.mini });
}

export async function run({ browser, wsPort, webPort, rec }) {
  mkdirSync(OUT, { recursive: true });
  const A = await H.newPlayer(browser, { name: 'Pinner', wsPort, webPort, world: 'wheel', viewport: { width: 390, height: 844 }, touch: true, dpr: 2 });
  try { await device(A, 'phone', true, rec); } finally { await A.ctx.close().catch(() => {}); }
  const B = await H.newPlayer(browser, { name: 'DeskPinner', wsPort, webPort, world: 'wheel', viewport: { width: 1440, height: 900 }, wide: true });
  try { await device(B, 'desk', false, rec); } finally { await B.ctx.close().catch(() => {}); }
}
