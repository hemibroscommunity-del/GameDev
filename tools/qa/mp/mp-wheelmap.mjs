/* ═══ THE WHEEL'S MINIMAP AND WORLD MAP, WALKED (v2.3.2966) ═══
 *
 * Owner, 2026-10-01: "I'm thinking the minimap will need to be larger and the
 * most informative and intuitive it can be for navigation purposes.  Maybe
 * tapping it brings up an overlay of a labelled world map.  It would probably
 * help to have areas labelled so players can start memorizing the territory."
 *
 * On a phone viewport, against a real worker, in `?trial=wheel`:
 *   1. in town the minimap is today's (52 px, unchanged);
 *   2. in the Wheel it is the Wheel's own: bigger, the land under it from
 *      the worker's overview, the roads, river and railway drawn, the camps,
 *      passes and gates marked, and where you are said in words under it --
 *      the town square on arrival;
 *   3. tapping it (a real tap on the box) opens the world map: the eight
 *      lands labelled with their levels, you marked, where you are said;
 *      zooming in brings each land's stages and their levels, then the camps
 *      and passes; dragging looks round; the target button brings you back;
 *      the cross closes it;
 *   4. walking out onto Frost Ridge, the words under the minimap follow you:
 *      the land, its stage and the levels there;
 *   5. back in town the Wheel's box and the button are gone, today's back.
 *
 * Pictures land in tools/qa/mp/out/wheelmap-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const ARRIVAL = { x: 21504, y: 21792 };

const holdTitle = (P, ms) => P.page.evaluate(async (hold) => {
  const el = document.querySelector('.bt-zone-header__title');
  if (!el) return 'no title element';
  const r = el.getBoundingClientRect();
  const opts = { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 1, pointerType: 'touch' };
  el.dispatchEvent(new PointerEvent('pointerdown', opts));
  await new Promise((res) => setTimeout(res, hold));
  el.dispatchEvent(new PointerEvent('pointerup', opts));
  return 'ok';
}, ms);
const panelUp = (P) => P.page.evaluate(() => !!Array.from(document.querySelectorAll('strong')).find((n) => n.textContent === 'Test panel'));
const tap = (P, text) => P.page.evaluate((t) => {
  const b = Array.from(document.querySelectorAll('button')).find((n) => (n.textContent || '').indexOf(t) >= 0);
  if (!b) return false;
  b.click();
  return true;
}, text);
const mini = (P) => P.page.evaluate(() => (window.__btMinimap ? JSON.parse(JSON.stringify(window.__btMinimap)) : null));
const wm = (P) => P.page.evaluate(() => (window.__btWorldMap ? JSON.parse(JSON.stringify(window.__btWorldMap)) : null));

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const shot = (P, name) => P.page.screenshot({ path: join(OUT, `wheelmap-${name}.png`) });
  const { TOWN_EXITS } = await import(H.REPO + '/src/data/effects.js');

  const P = await H.newPlayer(browser, { name: 'Mapper', wsPort, webPort, viewport: PHONE, touch: true, query: 'trial=wheel' });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  /* setup: the Mayor gate stands between town and the World View */
  if (!(await panelUp(P))) { await holdTitle(P, 1500); await P.page.waitForTimeout(900); }
  await P.page.evaluate((k) => {
    const inp = document.querySelector('input[type="password"]');
    if (!inp) return;
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(inp, k);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  }, H.ADMIN_KEY);
  await tap(P, 'Save key on this device');
  await P.page.waitForTimeout(1500);
  await tap(P, 'Finish all quests');
  await P.page.waitForTimeout(2000);
  await tap(P, 'Close');
  await P.page.waitForTimeout(600);

  /* ── 1. town: today's minimap ── */
  const town = await mini(P);
  const btnTown = await P.page.evaluate(() => !!document.querySelector('[data-world-map-open]'));
  rec.ok('in town the minimap is today\'s, unchanged, and there is no world map to open', town && !town.wheel && town.box === 52 && !btnTown, { box: town && town.box, wheel: town && town.wheel, btnTown });

  /* ── 2. the Wheel's own minimap ── */
  const door = TOWN_EXITS.find((e) => e.zoneId === 'worldview');
  await H.hopTo(P, door.tx * 32 + 16, (door.ty - 1) * 32 + 16);
  let zone = null;
  for (let i = 0; i < 60; i++) {
    zone = await H.readState(P, (S) => S.currentZone);
    if (zone === 'worldview') break;
    await P.page.waitForTimeout(1000);
  }
  let m = null;
  for (let i = 0; i < 40; i++) {
    m = await mini(P);
    if (m && m.wheel && m.words && m.under) break;
    await P.page.waitForTimeout(500);
  }
  rec.ok('in the Wheel the minimap is the Wheel\'s own, two and a half times bigger, in the same corner', zone === 'worldview' && m && m.wheel === true && m.box === 132 && m.rootX === PHONE.width - 132, { zone, m });
  rec.ok('...showing the land under it, and the roads, river and railway, the camps, passes and gates', m && m.under && m.routes >= 30 && m.places >= 60, m && { under: m.under, routes: m.routes, places: m.places });
  rec.ok('...about three zones across, centred on you', m && m.window === 3200 && Math.abs(m.playerBoxX - 66) < 2 && Math.abs(m.playerBoxY - 66) < 2, m && { x: m.playerBoxX, y: m.playerBoxY });
  rec.ok('...and says under it where you are: the town', m && m.words && m.words.title === 'Brotown', m && m.words);
  await shot(P, '01-minimap');
  /* the box is drawn: its middle is the land's colours, not one flat colour */
  const box = await H.screenshotPixels(P);
  const dpr = box.width / PHONE.width;   /* the screenshot is in device px */
  let distinct = new Set();
  for (let y = m.topInset + 6; y < m.topInset + 126; y += 3) for (let x = PHONE.width - 126; x < PHONE.width - 6; x += 3) {
    const p = box.at(Math.round(x * dpr), Math.round(y * dpr));
    if (p) distinct.add(`${p[0] >> 4},${p[1] >> 4},${p[2] >> 4}`);
  }
  rec.ok(`...drawn on screen, in many colours (${distinct.size})`, distinct.size > 12, { distinct: distinct.size });

  /* ── 3. tapping it opens the world map ── */
  const btn = await P.page.evaluate(() => {
    const b = document.querySelector('[data-world-map-open]');
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height, mini: window.__btWheelMini };
  });
  rec.ok('a button lies exactly over the minimap', !!btn && btn.w === 132 && btn.h === 132 && Math.abs(btn.x - (PHONE.width - 132)) <= 1, btn);
  await P.page.touchscreen.tap(btn.x + 66, btn.y + 66);
  await P.page.waitForTimeout(900);
  let w = await wm(P);
  const opened = await P.page.evaluate(() => ({ el: !!document.querySelector('[data-world-map]'), where: (document.querySelector('[data-world-map-where]') || {}).textContent || '' }));
  rec.ok('tapping it opens the world map: the whole Wheel, its eight lands named with their levels, and you', opened.el && w && w.open && w.labels && w.labels.lands === 8 && Math.abs(w.zoom - 1) < 0.01, { opened, w });
  rec.ok('...saying where you are', /You are in Brotown/.test(opened.where), opened);
  await shot(P, '02-worldmap');
  const pxMap = await H.screenshotPixels(P);
  distinct = new Set();
  for (let y = 120; y < 700; y += 7) for (let x = 10; x < 380; x += 7) { const p = pxMap.at(Math.round(x * dpr), Math.round(y * dpr)); if (p) distinct.add(`${p[0] >> 4},${p[1] >> 4},${p[2] >> 4}`); }
  rec.ok(`...drawn on screen (${distinct.size} colours)`, distinct.size > 30, { distinct: distinct.size });
  /* zoom in: the stages and their levels take over from the lands */
  for (let i = 0; i < 2; i++) await P.page.evaluate(() => document.querySelector('[data-world-map-zoom-in]').click());
  await P.page.waitForTimeout(500);
  w = await wm(P);
  rec.ok(`zooming in names each land's stages with their levels (${w && w.labels.stages} on screen) in place of the lands`, w && w.zoom > 2.2 && w.labels.stages >= 4 && w.labels.lands === 0, w);
  await P.page.evaluate(() => document.querySelector('[data-world-map-zoom-in]').click());
  await P.page.waitForTimeout(500);
  w = await wm(P);
  rec.ok(`...and further, the camps and passes with their levels (${w && w.labels.camps} camps, ${w && w.labels.passes} passes)`, w && w.zoom >= 4 && w.labels.camps + w.labels.passes >= 2, w);
  await shot(P, '03-zoomed');
  /* drag to look round */
  const before = w;
  const cv = await P.page.evaluate(() => { const r = document.querySelector('[data-world-map-canvas]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await P.page.evaluate(({ x, y }) => {
    const c = document.querySelector('[data-world-map-canvas]');
    const ev = (type, dx) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: x + dx, clientY: y, pointerId: 7, pointerType: 'touch' }));
    ev('pointerdown', 0); ev('pointermove', -40); ev('pointermove', -120); ev('pointerup', -120);
  }, cv);
  await P.page.waitForTimeout(400);
  w = await wm(P);
  rec.ok('dragging looks round', w && w.cx > before.cx + 500 && Math.abs(w.cy - before.cy) < 50, { before: before && [before.cx, before.cy], after: w && [w.cx, w.cy] });
  const meHit = await P.page.evaluate(() => {
    const b = document.querySelector('[data-world-map-me]'), r = b.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    b.click();
    if (top === b) return 'button';
    if (!top) return 'nothing';
    const chain = [];
    for (let n = top; n && chain.length < 6; n = n.parentElement) { const cs = getComputedStyle(n); chain.push(`${n.tagName}[z=${cs.zIndex},pos=${cs.position},pe=${cs.pointerEvents}] ${(n.outerHTML || '').slice(0, 90)}`); }
    return chain.join(' <- ');
  });
  await P.page.waitForTimeout(400);
  w = await wm(P);
  rec.ok('the target button brings you back', meHit === 'button' && w && Math.abs(w.cx - ARRIVAL.x) < 200 && Math.abs(w.cy - ARRIVAL.y) < 200, { meHit, at: w && [w.cx, w.cy] });
  await P.page.evaluate(() => document.querySelector('[data-world-map-close]').click());
  await P.page.waitForTimeout(700);
  const closed = await P.page.evaluate(() => ({ map: !!document.querySelector('[data-world-map]'), btn: !!document.querySelector('[data-world-map-open]') }));
  rec.ok('the cross closes it, and the minimap\'s button is back', !closed.map && closed.btn, closed);

  /* ── 4. out onto Frost Ridge: the words follow you ── */
  const frost = { x: 18464, y: 18464 };   /* the north-west spoke, its second tier: levels 6-10 */
  await H.hopTo(P, frost.x, frost.y, { tries: 80 });
  let fw = null;
  for (let i = 0; i < 20; i++) {
    fw = (await mini(P)) || {};
    if (fw.words && fw.words.title === 'Frost Ridge') break;
    await P.page.waitForTimeout(400);
  }
  rec.ok('walking out onto Frost Ridge, the minimap says so: the land, its stage and the levels there', fw.words && fw.words.title === 'Frost Ridge' && /the thaw line · Lv 6–10/.test(fw.words.sub), fw.words);
  await shot(P, '04-frost');

  /* ── 5. home: today's minimap again ── */
  const exit = await P.page.evaluate(() => {
    const S = window._gameState.current;
    for (let y = 0; y < S.map.length; y++) { const row = S.map[y]; const x = row.indexOf(8); if (x >= 0) return { tx: x, ty: y }; }
    return null;
  });
  await H.hopTo(P, exit.tx * 32 + 16 + 40, exit.ty * 32 + 16, { tries: 80 });
  let back = null;
  for (let i = 0; i < 40; i++) {
    back = await H.readState(P, (S) => S.currentZone);
    if (back === 'town') break;
    await P.page.waitForTimeout(700);
  }
  await P.page.waitForTimeout(1500);
  const home = await mini(P);
  const btnHome = await P.page.evaluate(() => !!document.querySelector('[data-world-map-open]'));
  rec.ok('back in town, today\'s minimap is back and the world map\'s button is gone', back === 'town' && home && !home.wheel && home.box === 52 && !btnHome, { back, box: home && home.box, btnHome });
  rec.ok('no page errors', P.logs.filter((l) => /pageerror/.test(l)).length === 0, P.logs.filter((l) => /pageerror/.test(l)).slice(0, 5));
}
