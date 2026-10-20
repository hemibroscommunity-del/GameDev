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
 * v2.3.3023, the owner: "the world feels hard to navigate without losing your
 * sense of position relative to the town center" -- 2 checks there is no home
 * badge in town, and 4 that out on Frost Ridge the badge rides the box's edge
 * toward town (south-east), drawn on the screen.
 *
 * v2.3.3009, the owner: "Put the 'brotown safe' and other location
 * indicators in place of the 'the wheel lvl 1-2' on the top bar. It'll free
 * up more room around the minimap. Also give the minimap thicker borders so
 * it's not confused with game screen area" -- so 2 and 4 read the words on
 * the TOP BAR (both lines whole, inside it), nothing is printed under the box,
 * and the box wears a thick frame: its slate band and brass line are read off
 * the screen.
 *
 * v2.3.3146, the owner: "Also all the buildings in town should show on the
 * minimap" -- 2 checks every standing building is drawn on the box where it
 * stands, its door on its front edge, the shut ones grey, the town's square
 * gone in their place, and their roofs read off the screen.
 *
 * v2.3.3481, the owner's icon picks ("1b": all eight lands' scenes from their
 * sheet) -- 4 checks the Wheel holds the eight scenes and none of the four
 * animated strips, and that Frost Ridge's banner, played again, shows the
 * frost scene over its plaque (wheelmap-04c-landbanner.png).
 *
 * v2.3.3511, the owner after a playtest: "new land emblems look bad enlarged
 * (revert or show below minimap)" -- 4 now checks the banner is the PLAIN
 * plaque (the frost icon and the name, no picture over it, no ornaments), and
 * that as it docks the frost scene comes up UNDER THE MINIMAP: one picture px
 * a device px (never blown up), centred under the box, clear of every control
 * on the screen, and gone after its few seconds (wheelmap-04c-emblem.png);
 * that none of the eight pictures keeps the plate's gold scroll ends at its
 * foot; and, the phone turned to 320, 375, 390 and 430 wide and on its side
 * (844 x 390, 667 x 375), that it never lands on a control: under the box
 * upright, beside it sideways where under is the attack disc's
 * (wheelmap-04d-emblem-<w>x<h>.png).
 * v2.3.3522, the owner: "Have icons representing each building on each
 * building in the minimap/compass" -- 2 checks every footprint on the box
 * wears its picture, loaded behind the loading screen, and 5 that leaving
 * the Wheel lets them go; and "When you're in town make the expanded map
 * zoomed in on the town so you can see which building is labeled where on
 * the map" -- 3 checks the map opens on the town (every building on the
 * screen, named, its picture at its door), then zooms out to the whole Wheel
 * for the rest, and the target button in town is that view again
 * (wheelmap-02-worldmap.png is the town view, 02b the whole Wheel).
 *
 * Pictures land in tools/qa/mp/out/wheelmap-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
/* v2.3.2978: the Wheel is its own zone, 'wheel', against a worker that runs
   its monsters (server/src/wheelzone.js) -- 'worldview' against an older one */
const WHEELISH = (z) => z === 'worldview' || z === 'wheel';

const PHONE = { width: 390, height: 844 };
const ARRIVAL = (await H.wheelGeom()).arrival;   /* v2.3.3315: the Wheel the worker plays */

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
/* v2.3.3009: the top bar's words in the Wheel (ZoneHeader.jsx wheelWhere) --
   v2.3.3108: the minimap's NAME PLATE's (wheelMinimap.js _plate): the place,
   the gold line under it, and whether each fits whole; `text` is the top bar,
   which says "BroTown" in the Wheel now */
const bar = (P) => P.page.evaluate(() => {
  const t = document.querySelector('[data-zone-title]');
  const m = window.__btMinimap, pl = m && m.plate;
  if (pl) {
    return { text: t ? t.textContent : null, plate: pl,
      place: { text: pl.title, whole: pl.fits && !pl.squeezed, b: pl.rect ? pl.rect.top + pl.h * 0.5 : 0 },
      sub: { text: pl.sub, whole: pl.fits && !pl.squeezed, t: pl.rect ? pl.rect.top + pl.h * 0.5 : 0, b: pl.rect ? pl.rect.top + pl.h : 0 },
      barBottom: pl.rect ? pl.rect.top + pl.h : null };
  }
  const hd = document.querySelector('.bt-zone-header');
  const one = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { text: el.textContent, l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom), whole: el.scrollWidth <= el.clientWidth + 1 };
  };
  const h = hd ? hd.getBoundingClientRect() : null;
  return { text: t ? t.textContent : null, place: one(document.querySelector('[data-zone-place]')),
    sub: one(document.querySelector('[data-zone-sub]')), barBottom: h ? Math.round(h.bottom) : null };
});
const barHolds = (b, place, subRe) => !!b && !!b.place && b.place.text === place && !!b.sub && subRe.test(b.sub.text)
  && b.place.whole && b.sub.whole && b.place.b <= b.sub.t + 1 && b.sub.b <= b.barBottom && !/The Wheel|Lv1-2/.test(b.text);

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
    if (WHEELISH(zone)) break;
    await P.page.waitForTimeout(1000);
  }
  let m = null;
  for (let i = 0; i < 40; i++) {
    m = await mini(P);
    if (m && m.wheel && m.words && m.under) break;
    await P.page.waitForTimeout(500);
  }
  rec.ok('in the Wheel the minimap is the Wheel\'s own, two and a half times bigger, in the same corner', WHEELISH(zone) && m && m.wheel === true && m.box === 132 && m.rootX === PHONE.width - 132, { zone, m });
  rec.ok('...showing the land under it, and the roads, river and railway, the camps, passes and gates', m && m.under && m.routes >= 30 && m.places >= 60, m && { under: m.under, routes: m.routes, places: m.places });
  /* v2.3.3108: centred in the map's window, which ends at mapBottom above the plate */
  const winMidY = m ? (m.frame + m.mapBottom) / 2 : 0;
  rec.ok(`...about three zones across, centred on you in the map's window (above the name plate, ${m && m.mapBottom} px down a ${m && m.h} px box)`,
    m && m.window === 3200 && m.h === 132 && m.mapBottom > 80 && m.mapBottom < 100 && Math.abs(m.playerBoxX - 66) < 2 && Math.abs(m.playerBoxY - winMidY) < 2, m && { x: m.playerBoxX, y: m.playerBoxY, winMidY });
  /* v2.3.3023: in town, town is on the box: no home badge */
  rec.ok('...and in town no home badge: the town is on the box', m && m.home && m.home.edge === false && m.home.shown === false, m && m.home);
  /* v2.3.3009: the words were the top bar's, in place of "The Wheel (Lv1-2)" --
     v2.3.3108: the minimap's plate's (the owner: "move the zone name and
     level band beneath the minimap") */
  let tb = null;
  for (let i = 0; i < 10; i++) { tb = await bar(P); if (barHolds(tb, 'Brotown', /^safe$/)) break; await P.page.waitForTimeout(300); }
  rec.ok(`...and the NAME PLATE under the map says where you are: "${tb && tb.place && tb.place.text}" over "${tb && tb.sub && tb.sub.text}" -- both lines whole, at 11 px or more`,
    m && m.words && m.words.title === 'Brotown' && barHolds(tb, 'Brotown', /^safe$/) && tb.plate.titlePx >= 11 && tb.plate.subPx >= 11, { tb, words: m && m.words });
  rec.ok(`...and the top bar names the world ("${tb && tb.text}"), the place having moved to the plate`, !!tb && /^\s*BroTown\s*$/.test(tb.text || ''), tb && tb.text);
  await shot(P, '01-minimap');
  /* the box is drawn: its middle is the land's colours, not one flat colour */
  const box = await H.screenshotPixels(P);
  const dpr = box.width / PHONE.width;   /* the screenshot is in device px */
  /* v2.3.3009: and framed -- the slate band down both sides, the brass line
     inside it (read halfway down, where no corner rounds it) */
  const px = (x, y) => box.at(Math.round(x * dpr), Math.round(y * dpr));
  const like = (p, hex, tol) => !!p && Math.abs(p[0] - ((hex >> 16) & 255)) <= tol && Math.abs(p[1] - ((hex >> 8) & 255)) <= tol && Math.abs(p[2] - (hex & 255)) <= tol;
  const midY = m.topInset + Math.round(m.mapBottom / 2);   /* v2.3.3108: halfway down the map's window */
  const frame = { band: m.frame, left: px(m.rootX + 4, midY), right: px(PHONE.width - 4, midY), brassL: px(m.rootX + 6, midY), brassR: px(PHONE.width - 6, midY) };
  rec.ok(`the minimap wears a thick frame (${m.frame} px): a slate band down both sides, the colour of the bars, and the brass line inside it`,
    m.frame >= 6 && like(frame.left, 0x202c32, 14) && like(frame.right, 0x202c32, 14) && like(frame.brassL, 0xd8aa58, 40) && like(frame.brassR, 0xd8aa58, 40), frame);
  let distinct = new Set();
  for (let y = m.topInset + 6; y < m.topInset + m.mapBottom - 2; y += 3) for (let x = PHONE.width - 126; x < PHONE.width - 6; x += 3) {
    const p = box.at(Math.round(x * dpr), Math.round(y * dpr));
    if (p) distinct.add(`${p[0] >> 4},${p[1] >> 4},${p[2] >> 4}`);
  }
  /* v2.3.3031: the arrival's window is mostly the paved square now (it is 28% bigger, and the
     yards round it are lawn): 12 colours, where it was more -- still nothing like a flat fill */
  rec.ok(`...drawn on screen, in many colours (${distinct.size})`, distinct.size > 8, { distinct: distinct.size });
  /* ═══ v2.3.3146: THE TOWN'S BUILDINGS ═══
     The owner: "Also all the buildings in town should show on the minimap".
     Every standing building (the doors the ground worker posts) is drawn: its
     footprint where it stands, its door on the front edge, the shut ones
     grey; the town's white square gone in their place; and on the screen the
     roofs' terracotta round you on arrival. */
  {
    const doors = await P.page.evaluate(() => (window.__btWheelTownDoors ? window.__btWheelTownDoors.doors() : []));
    const bl = (m && m.buildings) || [];
    const placed = doors.every((d) => bl.some((b) => b.id === d.id && d.x >= b.x0 - 1 && d.x <= b.x1 + 1 && Math.abs(d.y - b.y1) <= 2 && b.closed === !!d.closed));
    /* the sizes, smallest to biggest (by area) */
    const bySize = bl.slice().sort((a, b) => a.w * a.h - b.w * b.h);
    const sz = (b) => (b ? `${Math.round(b.w)} x ${Math.round(b.h)}` : '0 x 0');
    /* v2.3.3259: sixteen standing, not seventeen -- the Assay Office is gone (the
       Gem Cutter's building is the Gem Works, which cuts and sets), so the town
       has one plot fewer and the minimap one roof fewer; every one still drawn */
    rec.ok(`the town's buildings are on the minimap: all ${bl.length} of the ${doors.length} standing, each over the ground it stands on with its door on its front edge (${bl.filter((b) => b.closed).length} shut, grey), from ${sz(bySize[0])} px to ${sz(bySize[bySize.length - 1])} (${bySize.length ? bySize[bySize.length - 1].id : '-'}) -- and the town's square no longer drawn`,
      doors.length >= 16 && bl.length === doors.length && placed && bl.every((b) => b.w >= 10 && b.h >= 5) && m.townMark === false,
      { n: bl.length, doors: doors.length, placed, townMark: m && m.townMark, sample: bl.slice(0, 3) });
    let roof = 0;
    for (let y = m.topInset + m.frame; y < m.topInset + m.mapBottom; y += 1) for (let x = m.rootX + m.frame; x < PHONE.width - m.frame; x += 1) {
      if (like(px(x, y), 0xa4553a, 26)) roof++;
    }
    rec.ok(`...drawn: the roofs' terracotta on the box round the square (${roof} CSS px)`, roof > 60, { roof });
    /* v2.3.3522: each wears its picture (data/wheelBuildingDoors.js
       WHEEL_BUILDING_ICONS), loaded behind the Wheel's loading screen */
    const held = await P.page.evaluate(() => (window.__btBuildingIcons ? window.__btBuildingIcons() : null));
    const bi = m && m.buildingIcons;
    rec.ok(`...and each wears its building's picture, ${bi && bi.px} px on its footprint (${bi && bi.n} of ${bl.length}), the ${held && held.loaded} pictures loaded behind the loading screen (${held ? (held.bytes / 1048576).toFixed(2) : '?'} MB, ${held && held.grey} grey for the shut)`,
      !!bi && bi.n === bl.length && bi.px === 14 && !!held && held.loaded >= bl.length && held.grey >= 1 && held.textures >= bl.length, { bi, held });
    const r = await P.page.evaluate(() => window.__btWheelMini);
    if (r) await P.page.screenshot({ path: join(OUT, 'wheelmap-01b-minimap-icons.png'), clip: { x: r.left, y: r.top, width: r.w, height: r.h } }).catch(() => {});
  }
  /* v2.3.3108: and the plate is drawn under it: its dark well, with lettering
     on it (light pixels among the dark) */
  {
    const r = tb && tb.plate && tb.plate.rect;
    let dark = 0, light = 0, n = 0;
    if (r) for (let y = r.top + 2; y < r.top + r.height - 2; y += 1) for (let x = r.left + 3; x < r.left + r.width - 3; x += 2) {
      const p = box.at(Math.round(x * dpr), Math.round(y * dpr)); if (!p) continue; n++;
      if (like(p, 0x141d22, 14)) dark++;
      if (p[0] + p[1] + p[2] > 420) light++;
    }
    rec.ok(`...the name plate under it is drawn: a dark well (${n ? Math.round((dark / n) * 100) : 0}%) with the words on it (${light} light px)`, !!r && dark / n > 0.4 && light > 20, { r, dark, light, n });
  }

  /* ── 3. tapping it opens the world map ── */
  const btn = await P.page.evaluate(() => {
    const b = document.querySelector('[data-world-map-open]');
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height, mini: window.__btWheelMini };
  });
  rec.ok('a button lies exactly over the minimap, its name plate included', !!btn && btn.w === 132 && btn.h === 132 && Math.abs(btn.x - (PHONE.width - 132)) <= 1, btn);
  await P.page.touchscreen.tap(btn.x + 66, btn.y + 66);
  await P.page.waitForTimeout(900);
  let w = await wm(P);
  const opened = await P.page.evaluate(() => ({ el: !!document.querySelector('[data-world-map]'), where: (document.querySelector('[data-world-map-where]') || {}).textContent || '' }));
  /* ═══ v2.3.3522: IN TOWN IT OPENS ON THE TOWN ═══
     The owner: "When you're in town make the expanded map zoomed in on the
     town so you can see which building is labeled where on the map."  It
     opened on the whole Wheel, the town a dot.  Now, in BroTown: every
     standing building's door on the screen, each named and wearing its
     picture -- at the zoom the names come in or closer. */
  const nDoors = (await P.page.evaluate(() => (window.__btWheelTownDoors ? window.__btWheelTownDoors.doors() : []))).length;
  for (let i = 0; i < 10 && !(w && w.more && w.more.buildingsAt >= nDoors); i++) { await P.page.waitForTimeout(300); w = await wm(P); }
  const rel = w && w.rel;
  rec.ok(`tapping it in BroTown opens the world map ON THE TOWN: all ${w && w.more && w.more.buildingsAt} of the ${nDoors} buildings on the screen, ${w && w.more && w.more.buildings} named, ${w && w.more && w.more.buildingIcons} wearing their pictures, at zoom ${rel ? rel.toFixed(1) : '?'} (names from 6)`,
    opened.el && !!w && w.open && nDoors >= 16 && w.more.buildingsAt === nDoors && w.more.buildings === nDoors && w.more.buildingIcons === nDoors && rel >= 6 - 1e-6,
    { opened, w: w && { zoom: w.zoom, rel: w.rel, cx: w.cx, cy: w.cy, more: w.more } });
  rec.ok('...saying where you are', /You are in Brotown/.test(opened.where), opened);
  await shot(P, '02-worldmap');
  /* ...and zoomed out, the whole Wheel as it always opened: its eight lands
     named with their levels, and you */
  for (let i = 0; i < 16 && !(w && Math.abs(w.zoom - 1) < 0.01); i++) {
    await P.page.evaluate(() => document.querySelector('[data-world-map-zoom-out]').click());
    await P.page.waitForTimeout(150);
    w = await wm(P);
  }
  await P.page.waitForTimeout(400);
  w = await wm(P);
  rec.ok('...zoomed all the way out, the whole Wheel: its eight lands named with their levels, and you', !!w && w.labels && w.labels.lands === 8 && Math.abs(w.zoom - 1) < 0.01, w);
  await shot(P, '02b-worldmap-wheel');
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
  /* v2.3.3522: in BroTown the target button is the town's view, as the map
     opens there (every building on the screen, named) -- and that is where
     you are */
  rec.ok(`the target button brings you back: in BroTown to the town's view (${w && w.more && w.more.buildingsAt} buildings on the screen, zoom ${w && w.rel ? w.rel.toFixed(1) : '?'}), you on it`,
    meHit === 'button' && !!w && Math.abs(w.cx - ARRIVAL.x) < 1500 && Math.abs(w.cy - ARRIVAL.y) < 1500 && w.more && w.more.buildingsAt === nDoors && w.rel >= 6 - 1e-6,
    { meHit, at: w && [w.cx, w.cy], more: w && w.more });
  /* out to about 4x the short Wheel again (where the target button used to
     stop, under 5), for the next look: the lands' bands round town */
  for (let i = 0; i < 5; i++) {
    const z = await wm(P);
    if (!z || !(z.rel > 5)) break;
    await P.page.evaluate(() => document.querySelector('[data-world-map-zoom-out]').click());
    await P.page.waitForTimeout(200);
  }
  await P.page.waitForTimeout(400);
  /* v2.3.3057 (owner: "if you tap the minimap and zoom in you can see more
     details"): what comes in as you zoom.  "Finish all quests" (above, to
     pass the Mayor's gate) left no quest to lead to, so the first one is put
     back on this page's own copy of your quests for the look -- the map is
     drawn every frame from it -- and taken off again after */
  const hadQuests = await P.page.evaluate(() => {
    const S = window._gameState && window._gameState.current;
    if (!S || !S.rpg) return null;
    const was = S.rpg._quests || {};
    S.rpg._quests = Object.assign({}, was, { tut_1: 'active' });
    return JSON.stringify(was);
  });
  await P.page.waitForTimeout(500);
  w = await wm(P);
  await P.page.evaluate((was) => {
    const S = window._gameState && window._gameState.current;
    if (S && S.rpg && was) S.rpg._quests = JSON.parse(was);
  }, hadQuests);
  rec.ok(`zoomed in on you: the quest's gold road and star (to ${w && w.more && w.more.quest ? `${w.more.quest.x},${w.more.quest.y}` : '-'}), the resources where they grow (${w && w.more && w.more.nodes}) and each land's level bands (${w && w.more && w.more.ticks} ticks)`,
    !!w && !!w.more && !!w.more.quest && w.more.nodes >= 3 && w.more.ticks >= 4, w && w.more);
  for (let i = 0; i < 2; i++) await P.page.evaluate(() => document.querySelector('[data-world-map-zoom-in]').click());
  await P.page.waitForTimeout(500);
  w = await wm(P);
  rec.ok(`...and closer still, the town's buildings by name (${w && w.more && w.more.buildings} named at zoom ${w && w.zoom && w.zoom.toFixed(1)})`,
    !!w && w.zoom >= 6 && w.more && w.more.buildings >= 5, w && { zoom: w.zoom, more: w.more });
  await shot(P, '03b-town');
  for (let i = 0; i < 6; i++) await P.page.evaluate(() => document.querySelector('[data-world-map-zoom-in]').click());
  await P.page.waitForTimeout(500);
  w = await wm(P);
  rec.ok(`...zooming as far as 28 (${w && w.zoom && w.zoom.toFixed(1)}), twice the old 12`, !!w && w.zoom > 27.9, w && w.zoom);
  await P.page.evaluate(() => document.querySelector('[data-world-map-close]').click());
  await P.page.waitForTimeout(700);
  const closed = await P.page.evaluate(() => ({ map: !!document.querySelector('[data-world-map]'), btn: !!document.querySelector('[data-world-map-open]') }));
  rec.ok('the cross closes it, and the minimap\'s button is back', !closed.map && closed.btn, closed);

  /* ── 4. out onto Frost Ridge: the words follow you ── */
  /* v2.3.3025: untouchable for the walk out (as mp-firefight's): a level-1
     QA bro standing among the levels 6-10 died there on a slow run, and the
     checks after it read the respawn's veil (0% ice, then no minimap) */
  try {
    const myId = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'vitals', myId, { heal: true, god: true, godMinutes: 5 });
  } catch (e) { /* a dev op missing on this worker: the walk as before */ }
  const frost = (await H.wheelGeom()).along('frost', 2);   /* the north-west spoke, its second tier: levels 6-10 (v2.3.3315: at either size) */
  await H.hopTo(P, frost.x, frost.y, { tries: 80 });
  let fw = null;
  for (let i = 0; i < 20; i++) {
    fw = (await mini(P)) || {};
    if (fw.words && fw.words.title === 'Frost Ridge') break;
    await P.page.waitForTimeout(400);
  }
  let fb = null;
  /* v2.3.3058: the Lv 6-10 ring is No man's land 1, and there the bar's
     second line says so, in red, in the stage name's place: "☠ No man's land
     1 · Lv 6–10" (ZoneHeader.jsx; src/game/noMansLand.js).  The words under
     it (wheelHere) still name the stage. */
  /* v2.3.3108: the plate's line is the level band alone (the stage's name did
     not fit) -- in No man's land too, which has its own badge (v2.3.3107) */
  const FROST_SUB = /^Lv 6–10$/;
  for (let i = 0; i < 10; i++) { fb = await bar(P); if (barHolds(fb, 'Frost Ridge', FROST_SUB)) break; await P.page.waitForTimeout(300); }
  rec.ok(`walking out onto Frost Ridge, the name plate says so: the land and the levels there ("${fb && fb.place && fb.place.text}" over "${fb && fb.sub && fb.sub.text}", whole)`,
    fw.words && fw.words.title === 'Frost Ridge' && /the thaw line · Lv 6–10/.test(fw.words.sub) && barHolds(fb, 'Frost Ridge', FROST_SUB), { fb, words: fw.words });
  await shot(P, '04-frost');
  /* v2.3.3024, owner: "There might need to be flat colors on the minimap to
     help orient you to what elemental zone you're in" and "elemental zones
     need something more obvious that the player is in that elemental zone":
     the minimap paints Frost Ridge its one ice blue; the top bar puts the
     frost icon before the land's name, the name in the land's colour; and
     crossing into it played its banner (the owner's frost art, the icon and
     the name) */
  /* v2.3.3108: on the minimap's name plate now (wheelMinimap.js _plate) */
  const look = await P.page.evaluate(() => {
    const pl = window.__btMinimap && window.__btMinimap.plate;
    const zb = window.__btZoneBanner;
    return { land: pl ? pl.land : null, icon: pl ? pl.icon : false, color: pl ? pl.color : null, plateRect: window.__btWheelPlate || null,
      bannerAt: zb ? zb.shownAt('frost') : 0, banner: zb && zb.onScreen ? zb.onScreen() : null, watch: zb && zb.land ? zb.land() : null,
      /* v2.3.3481: the eight lands' scenes held, the closed lands' strips not */
      scenes: zb && zb.scenes ? zb.scenes() : null, strips: zb && zb.resident ? zb.resident() : null };
  });
  rec.ok(`...and the name plate marks the land: the frost icon before "Frost Ridge", the name in the land's own colour (${look.color})`,
    look.land === 'frost' && look.icon === true && !!look.color && look.color !== '#f7f2e7', look);
  rec.ok(`...and crossing into Frost Ridge played its banner, docking into the plate (${look.banner ? `"${look.banner.text}"${look.banner.scene ? ', the owner\'s frost scene over it' : (look.banner.plain ? ', plain' : ', the owner\'s frost art')}` : 'shown ' + (look.bannerAt ? 'and docked' : 'never')})`,
    look.bannerAt > 0 && look.watch && look.watch.shown === 'frost', look);
  /* v2.3.3481, the owner's icon picks ("1b": all eight lands' scenes from their
     sheet): the Wheel holds the eight scenes for its banners, loaded behind
     its loading screen, and none of the four animated strips it used to */
  rec.ok(`...and the Wheel holds every land's scene for its banner (${(look.scenes || []).length}: ${(look.scenes || []).join(', ')}) and none of the closed lands' animated strips (${JSON.stringify(look.strips)})`,
    Array.isArray(look.scenes) && look.scenes.length === 8 && ['frost', 'ember', 'sky', 'hollows', 'thunder', 'tidal', 'mist', 'verdant'].every((l) => look.scenes.includes(l))
      && Array.isArray(look.strips) && look.strips.length === 0, { scenes: look.scenes, strips: look.strips });
  {
    /* the minimap's land here is the land's one flat colour: ice blue round
       you, read off the screen (wheelLands.js frost #7fbfe0 under the box's
       0xdadada tint: about 108, 163, 191) */
    const r = await P.page.evaluate(() => window.__btWheelMini);
    const { decodePNG } = await import('../../world/png.mjs');
    /* v2.3.3108: the map's window only, above the name plate */
    const mb = await P.page.evaluate(() => (window.__btMinimap && window.__btMinimap.mapBottom) || 92);
    const png = decodePNG(await P.page.screenshot({ clip: { x: r.left + 20, y: r.top + 20, width: r.w - 40, height: mb - 30 } }));
    let ice = 0;
    for (let i = 0; i < png.width * png.height; i++) {
      const R = png.data[4 * i], G = png.data[4 * i + 1], B = png.data[4 * i + 2];
      if (Math.abs(R - 108) < 14 && Math.abs(G - 163) < 14 && Math.abs(B - 191) < 14) ice++;
    }
    const share = ice / (png.width * png.height);
    rec.ok(`...and the minimap paints Frost Ridge one flat ice blue (${Math.round(share * 100)}% of the box round you)`, share > 0.25, { share });
  }
  /* v2.3.3023, owner: "the world feels hard to navigate without losing your
     sense of position relative to the town center" -- out on Frost Ridge
     (north-west of town) the town is off the box, and its badge rides the
     box's edge toward it: south-east, the bottom right of the box -- drawn
     there (its white house and brass ring read off the screen) */
  /* read where it is NOW (fw is from the arrival, seconds ago), once no
     banner is on screen -- a land's banner spans a phone's width, and its
     right ornament reaches over the box's bottom corner while it plays */
  for (let i = 0; i < 24; i++) {
    const pl = await P.page.evaluate(() => (window.__btZoneBanner && window.__btZoneBanner.playing ? window.__btZoneBanner.playing() : null));
    if (!pl) break;
    await P.page.waitForTimeout(250);
  }
  const now4 = (await mini(P)) || {};
  const hm = now4.home || fw.home || {};
  await shot(P, '04b-home');
  let badge = null;
  if (hm.shown) {
    const r = await P.page.evaluate(() => window.__btWheelMini);
    const { decodePNG } = await import('../../world/png.mjs');
    const png = decodePNG(await P.page.screenshot({ clip: { x: r.left + hm.x - 12, y: r.top + hm.y - 12, width: 24, height: 24 } }));
    let white = 0, brass = 0, dark = 0;
    for (let i = 0; i < png.width * png.height; i++) {
      const R = png.data[4 * i], G = png.data[4 * i + 1], B = png.data[4 * i + 2];
      if (R > 215 && G > 210 && B > 200) white++;
      else if (R > 170 && G > 130 && G < 200 && B < 130) brass++;
      else if (R < 40 && G < 45 && B < 50) dark++;
    }
    badge = { white, brass, dark, px: png.width * png.height };
  }
  rec.ok(`...and out there, town off the box, its HOME BADGE rides the box's edge toward it: town ${hm.deg} degrees from you (south-east), ${hm.dist} game px away, the badge at (${hm.x}, ${hm.y}) in the box, drawn (${badge ? `${badge.white} white, ${badge.brass} brass, ${badge.dark} dark px` : 'not shown'})`,
    hm.edge === true && hm.shown === true && hm.deg >= 30 && hm.deg <= 60 && hm.x > 66 && hm.y > 66 && !!badge && badge.white >= 8 && badge.brass >= 6 && badge.dark >= 20, { home: hm, badge, quest: now4.quest || null });
  /* v2.3.3511: the banner played again (its history forgotten, the land watch
     asks once more 600 ms on): the PLAIN plaque -- and as it docks, the frost
     scene small under the minimap (src/ui/landEmblem.js) */
  const sb = await P.page.evaluate(async () => {
    const zb = window.__btZoneBanner, le = window.__btLandEmblem;
    if (!zb || !zb.reset || !zb.onScreen || !le) return null;
    le.hide();
    zb.reset();
    let banner = null, em = null;
    for (let i = 0; i < 160 && !(banner && em); i++) {
      const o = zb.onScreen();
      if (o && o.text && !banner) banner = o;
      const e = le.onScreen();
      if (e && e.drawn && e.opacity > 0.9) em = e;
      await new Promise((res) => setTimeout(res, 50));
    }
    return { banner, em, mini: window.__btWheelMini, plate: window.__btWheelPlate, dpr: devicePixelRatio, vw: innerWidth, vh: innerHeight, log: le.log() };
  });
  rec.ok(`...and the land's banner is the PLAIN plaque: "${sb && sb.banner && sb.banner.text}", the frost icon before it, no picture over it and no ornaments`,
    !!sb && !!sb.banner && sb.banner.text === 'Frost Ridge' && sb.banner.plain === true && !!sb.banner.icon && sb.banner.scene === null && sb.banner.orn === false, sb && sb.banner);
  const em = sb && sb.em;
  await shot(P, '04c-emblem');
  /* the controls on the screen right now, read here and not from the
     emblem's own list: whatever takes a tap, the sticks, the cards */
  const CONTROLS = () => Array.from(document.querySelectorAll('button, [role="button"], a[href], input, [data-disc], [data-sprint], [data-quest-hud], [data-nml-ask], [data-party-invite], [data-coach-card], [data-world-map-open], .bt-interact-prompt'))
    .map((n) => ({ n, r: n.getBoundingClientRect() }))
    .filter(({ n, r }) => r.width > 0 && r.height > 0 && r.width * r.height < 0.4 * innerWidth * innerHeight
      && (typeof n.checkVisibility !== 'function' || n.checkVisibility({ opacityProperty: true, visibilityProperty: true })))
    .map(({ n, r }) => ({ what: (n.getAttribute('data-disc') != null ? 'disc ' : '') + (n.tagName || '').toLowerCase() + (n.getAttribute('aria-label') ? ' ' + n.getAttribute('aria-label').slice(0, 24) : (n.textContent || '').trim().slice(0, 16) ? ' "' + (n.textContent || '').trim().slice(0, 16) + '"' : ''),
      l: r.left, t: r.top, r: r.right, b: r.bottom }));
  const onAny = (box, ctl) => ctl.filter((q) => box.l < q.r && box.l + box.w > q.l && box.t < q.b && box.t + box.h > q.t);
  const ctl0 = await P.page.evaluate(`(${CONTROLS.toString()})()`);
  const hit0 = em ? onAny(em.box, ctl0) : [];
  rec.ok(em ? `...and as it docks the frost scene comes up UNDER THE MINIMAP, ${em.box.w.toFixed(1)} x ${em.box.h.toFixed(1)} CSS px from its ${em.nw} x ${em.nh}: ${(em.devW / em.nw).toFixed(2)} device px a picture px at ${sb.dpr}x (never blown up), centred under the box, ${Math.round(em.box.t - (sb.mini.top + sb.mini.h))} px below it`
    : `...and as it docks the frost scene comes up under the minimap (${JSON.stringify(sb && sb.log && sb.log.slice(-2))})`,
    !!em && em.land === 'frost' && em.at === 'below' && /\/ui\/banners\/land-frost\.webp\?v=2\.3\.3511/.test(em.src || '')
      && em.devW <= em.nw + 0.5 && Math.abs(em.devW - em.nw) <= 0.5
      && em.box.t >= sb.mini.top + sb.mini.h && em.box.t <= sb.mini.top + sb.mini.h + 12
      && Math.abs(em.box.l + em.box.w / 2 - (sb.mini.left + sb.mini.w / 2)) <= 1
      && em.box.l >= 0 && em.box.l + em.box.w <= sb.vw, { em, mini: sb && sb.mini });
  rec.ok(`...and lies on no control (${ctl0.length} on the screen${hit0.length ? ': on ' + hit0.map((q) => q.what).join(', ') : ''})`, !!em && hit0.length === 0, { hit0, em: em && em.box });
  /* gone after its few seconds */
  const gone = await P.page.evaluate(async () => {
    const le = window.__btLandEmblem;
    const t0 = Date.now();
    for (let i = 0; i < 200; i++) {
      if (!le.onScreen()) return { ms: Date.now() - t0, since: Date.now() };
      await new Promise((res) => setTimeout(res, 100));
    }
    return null;
  });
  const shownMs = gone && em ? gone.since - em.since : null;
  rec.ok(`...and goes after its few seconds (on screen ${shownMs != null ? (shownMs / 1000).toFixed(1) + ' s' : 'still'}), leaving the area round the minimap clear`,
    !!gone && shownMs != null && shownMs >= 3000 && shownMs <= 7000, { gone, shownMs });
  /* none of the eight pictures keeps the plate's gold scroll ends at its foot
     (tools/ui/cut-owner-icons.py rim_cut's own test: in the outer quarter each
     side of the last FIVE rows -- where they lay, under the scene's dark
     outline -- a gold or brown px with a dark px right above it; v2.3.3481's
     pictures had 59 to 93 such px each, and a row higher up the same test
     finds the scene's own lava, sand and lamps over its outline) */
  const rims = await P.page.evaluate(async () => {
    const out = [];
    for (const land of ['frost', 'ember', 'sky', 'hollows', 'thunder', 'tidal', 'mist', 'verdant']) {
      const img = new Image();
      img.src = `/ui/banners/land-${land}.webp?v=2.3.3511`;
      try { await img.decode(); } catch (e) { out.push({ land, err: 'no picture' }); continue; }
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      const px = (x, y) => { const o = (y * c.width + x) * 4; return [d[o], d[o + 1], d[o + 2], d[o + 3]]; };
      const curl = ([r, gg, b, a]) => a > 128 && r > 120 && gg > 80 && b < 140 && r - b > 30 && r >= gg;
      const dark = ([r, gg, b, a]) => a > 128 && Math.max(r, gg, b) < 70;
      let n = 0;
      for (let y = Math.max(1, c.height - 5); y < c.height; y++) {
        for (let x = 0; x < c.width; x++) {
          if (x >= c.width * 0.25 && x < c.width * 0.75) continue;
          if (curl(px(x, y)) && [1, 2, 3].some((k) => y - k >= 0 && dark(px(x, y - k)))) n++;
        }
      }
      out.push({ land, w: c.width, h: c.height, rim: n });
    }
    return out;
  });
  rec.ok(`...and none of the eight pictures keeps the plate's gold scroll ends at its foot (${rims.map((r) => `${r.land} ${r.rim != null ? r.rim : r.err}`).join(', ')})`,
    rims.length === 8 && rims.every((r) => r.rim === 0), rims);

  /* the phone turned: at each size it never lands on a control -- under the
     box upright, beside it (or not at all) where under is taken */
  const SIZES = [{ width: 320, height: 568 }, { width: 375, height: 667 }, { width: 390, height: 844 }, { width: 430, height: 932 }, { width: 844, height: 390 }, { width: 667, height: 375 }];
  const sweep = [];
  for (const vp of SIZES) {
    await P.page.setViewportSize(vp);
    /* the minimap re-placed for this size (its box flush with the play area's right edge, published in a frame) */
    let mini = null;
    for (let i = 0; i < 40; i++) {
      await P.page.waitForTimeout(300);
      mini = await P.page.evaluate(() => {
        const m = window.__btWheelMini, w = document.querySelector('.brotown-wrap');
        const r = w ? w.getBoundingClientRect() : null;
        return m && r ? { ...m, right: r.right, vw: innerWidth, orient: document.documentElement.getAttribute('data-orient') } : null;
      });
      if (mini && mini.vw === vp.width && Math.abs(mini.left + mini.w - mini.right) <= 2) break;
    }
    await P.page.waitForTimeout(800);
    const r = await P.page.evaluate(async () => {
      const le = window.__btLandEmblem;
      le.hide();
      le.show('frost', 0);
      let em = null;
      for (let i = 0; i < 40; i++) {
        await new Promise((res) => setTimeout(res, 50));
        const e = le.onScreen();
        if (e && e.drawn && e.opacity > 0.9) { em = e; break; }
      }
      return { em, log: le.log().slice(-1)[0], mini: window.__btWheelMini, dpr: devicePixelRatio, vw: innerWidth, vh: innerHeight };
    });
    const ctl = await P.page.evaluate(`(${CONTROLS.toString()})()`);
    const hit = r.em ? onAny(r.em.box, ctl) : [];
    const tag = `${vp.width}x${vp.height}`;
    await shot(P, `04d-emblem-${tag}`);
    sweep.push({ tag, upright: vp.height > vp.width, at: r.em ? r.em.at : null, why: r.em ? null : (r.log && r.log.why), hit: hit.map((q) => q.what),
      inside: r.em ? r.em.box.l >= 0 && r.em.box.t >= 0 && r.em.box.l + r.em.box.w <= r.vw && r.em.box.t + r.em.box.h <= r.vh : true,
      under: r.em && r.mini ? r.em.box.t >= r.mini.top + r.mini.h : null, devPerArt: r.em ? +(r.em.devW / r.em.nw).toFixed(3) : null, controls: ctl.length });
    await P.page.evaluate(() => window.__btLandEmblem.hide());
  }
  await P.page.setViewportSize(PHONE);
  await P.page.waitForTimeout(1500);
  rec.ok(`...and turned to every size it lands on no control: ${sweep.map((x) => `${x.tag} ${x.at || 'not shown (' + x.why + ')'}${x.hit.length ? ' ON ' + x.hit.join('/') : ''}`).join('; ')}`,
    sweep.length === SIZES.length && sweep.every((x) => x.hit.length === 0 && x.inside && (x.devPerArt == null || x.devPerArt <= 1.001))
      && sweep.filter((x) => x.upright).every((x) => x.at === 'below' && x.under === true), sweep);
  for (let i = 0; i < 24; i++) {
    const pl = await P.page.evaluate(() => (window.__btZoneBanner && window.__btZoneBanner.playing ? window.__btZoneBanner.playing() : null));
    if (!pl) break;
    await P.page.waitForTimeout(250);
  }
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
  /* v2.3.3522: and the buildings' pictures were let go with the Wheel */
  const heldHome = await P.page.evaluate(() => (window.__btBuildingIcons ? window.__btBuildingIcons() : null));
  rec.ok('...and the buildings\' pictures went with the Wheel (none held)', !!heldHome && heldHome.loaded === 0 && heldHome.grey === 0 && heldHome.textures === 0, heldHome);
  rec.ok('no page errors', P.logs.filter((l) => /pageerror/.test(l)).length === 0, P.logs.filter((l) => /pageerror/.test(l)).slice(0, 5));
}
