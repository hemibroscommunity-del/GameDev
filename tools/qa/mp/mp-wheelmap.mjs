/* ═══ THE WHEEL'S MINIMAP AND WORLD MAP, WALKED (v2.3.2966) ═══
 *
 * Owner, 2026-10-01: "I'm thinking the minimap will need to be larger and the
 * most informative and intuitive it can be for navigation purposes.  Maybe
 * tapping it brings up an overlay of a labelled world map.  It would probably
 * help to have areas labelled so players can start memorizing the territory."
 *
 * On a phone viewport, against a real worker, IN THE WORLD (v2.3.3678: it
 * played `?trial=wheel` from today's retired town, walking down its stairs;
 * now it starts in the world's BroTown, as a player does):
 *   1. (v2.3.3678: gone -- it checked today's retired town's 52 px minimap);
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
 *   5. (v2.3.3678) off the Wheel, on your farm through the Feed & Seed: the
 *      farm's 52 px box, no world map to open, the buildings' pictures let go.
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
 * (revert or show below minimap)" -- 4 checked the banner was the PLAIN
 * plaque and the frost scene came up small UNDER THE MINIMAP.
 *
 * v2.3.3609, the owner: "I also don't like the intro graphics to each zone.
 * The older ones were better." -- 4 now checks the Wheel holds the four
 * animated strips again (frost, fire, desert, forest) and no scenes, that
 * Frost Ridge's banner, played again, is the owner's animated frost art (its
 * ornaments drawn, the frost icon and the name on the plaque, no picture over
 * it), and that nothing comes up under the minimap
 * (wheelmap-04c-landbanner.png).
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
 * v2.3.3678, the owner: "I also want the building shapes behind the town
 * icons to go away so only the icons are left" -- 2 checks no footprint is
 * drawn under the pictures (none of the roofs' terracotta on the box), and
 * the four pictures changed to say what their buildings are.
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
  const P = await H.newPlayer(browser, { name: 'Mapper', wsPort, webPort, viewport: PHONE, touch: true, world: 'wheel' });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  /* setup: the Mayor gate holds a new player in the commons -- every quest
     finished (the dev op, as every world test; it was the Test panel's
     button, opened by a long press on the title) */
  await H.waitFor(P, (S) => ({ zone: S.currentZone, loading: !!S._zoneLoading }),
    (v) => v.zone === 'wheel' && !v.loading, { timeout: 120000, label: 'in the world' }).catch(() => null);
  {
    const myId = await H.readState(P, (S) => S.myId);
    await H.devOp(wsPort, 'quests', myId);
    await P.page.waitForTimeout(2000);
    /* a talk window the quests' end may open, closed */
    await P.page.evaluate(() => { const c = document.querySelector('[data-esc], .bt-inspect-close'); if (c) c.click(); }).catch(() => {});
    await P.page.waitForTimeout(600);
  }

  /* ── 2. the Wheel's own minimap (you start in it: the world) ── */
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
  for (let i = 0; i < 10; i++) { tb = await bar(P); if (barHolds(tb, 'BroTown', /^safe$/)) break; await P.page.waitForTimeout(300); }
  rec.ok(`...and the NAME PLATE under the map says where you are: "${tb && tb.place && tb.place.text}" over "${tb && tb.sub && tb.sub.text}" -- both lines whole, at 11 px or more`,
    m && m.words && m.words.title === 'BroTown' && barHolds(tb, 'BroTown', /^safe$/) && tb.plate.titlePx >= 11 && tb.plate.subPx >= 11, { tb, words: m && m.words });
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
    /* v2.3.3678: and NO ROOFS -- the owner: "I also want the building shapes
       behind the town icons to go away so only the icons are left": no
       footprint drawn once the pictures are up (the probe's count), and none
       of their terracotta on the box (it was 60+ CSS px) */
    /* outside the pictures' own squares (the bell tower's roof and the barn
       are red-brown themselves): a footprint stood out round its picture */
    const picAt = bl.filter((b) => b.icon).map((b) => ({ x: m.rootX + m.panX + b.iconX, y: m.topInset + m.panY + b.iconY }));
    let roof = 0;
    for (let y = m.topInset + m.frame; y < m.topInset + m.mapBottom; y += 1) for (let x = m.rootX + m.frame; x < PHONE.width - m.frame; x += 1) {
      if (picAt.some((q) => Math.abs(x - q.x) <= 11 && Math.abs(y - q.y) <= 11)) continue;
      if (like(px(x, y), 0xa4553a, 26)) roof++;
    }
    rec.ok(`...and no building shapes under the pictures: ${m.footprints} footprints drawn, ${roof} CSS px of the roofs' terracotta on the box outside the pictures`,
      m.footprints === 0 && roof < 8, { footprints: m.footprints, roof, pics: picAt.length });
    /* v2.3.3522: each wears its picture (data/wheelBuildingDoors.js
       WHEEL_BUILDING_ICONS), loaded behind the Wheel's loading screen */
    const held = await P.page.evaluate(() => (window.__btBuildingIcons ? window.__btBuildingIcons() : null));
    const bi = m && m.buildingIcons;
    rec.ok(`...and each IS its building's picture, ${bi && bi.px} px where it stands (${bi && bi.n} of ${bl.length}), the ${held && held.loaded} pictures loaded behind the loading screen (${held ? (held.bytes / 1048576).toFixed(2) : '?'} MB, ${held && held.grey} grey for the shut)`,
      /* v2.3.3555: a grey copy for each SHUT building, however many that is --
         it was `>= 1`, and since the Hotel opened (v2.3.3539) none is shut */
      /* v2.3.3630: 20 px, bigger than its footprint (the owner: "oversized so
         they aren't competing with the buildings color and size") */
      !!bi && bi.n === bl.length && bi.px === 20 && !!held && held.loaded >= bl.length
        && held.grey >= bl.filter((b) => b.closed).length && held.textures >= bl.length, { bi, held, shut: bl.filter((b) => b.closed).length });
    /* v2.3.3630: the owner -- "just do the colored icons but oversized so they
       aren't competing with the buildings color and size" (v2.3.3614's white
       symbols on dark grey discs before): every picture in its own colours,
       ringed in its thin dark outline, and no disc behind it (its square's
       ring see-through somewhere).  "Its own colours" is: never whitened (the
       old symbol was all light grey and white) and, across the sixteen, in
       colour -- one picture may be grey by nature (the blacksmith's anvil, 0%
       colour), so most must carry colour, not every one */
    const look = await P.page.evaluate(() => (window.__btBuildingIcons && window.__btBuildingIcons().look ? window.__btBuildingIcons().look() : null));
    const lookBad = (look || []).filter((q) => !(q.n > 0 && q.white / q.n < 0.4 && q.dark / q.n >= 0.04 && q.ring < 100));
    const colourful = (look || []).filter((q) => q.n > 0 && q.colour / q.n >= 0.25).length;
    rec.ok(`...each its picture in its own colours, outlined, no disc (${look ? look.length : 0} pictures, ${colourful} in colour; whitened at most ${look ? Math.max(...look.map((q) => Math.round(100 * q.white / q.n))) : '?'}%, outline ${look ? Math.min(...look.map((q) => Math.round(100 * q.dark / q.n))) : '?'}%+)`,
      !!look && look.length >= bl.length && lookBad.length === 0 && colourful >= Math.ceil(0.75 * look.length), { lookBad, look });
    /* ...and bigger than the roof it stands on */
    const fp = bl.map((b) => Math.max(b.w, b.h)).sort((a, b) => a - b);
    const fpMid = fp.length ? fp[Math.floor(fp.length / 2)] : null;
    rec.ok(`...drawn bigger than the ground its building stands on (${bi && bi.px} px against a middling footprint of ${fpMid} px)`, !!bi && fpMid != null && bi.px > fpMid, { px: bi && bi.px, fp });
    /* v2.3.3678: the four pictures that now say what their building is */
    const pics = await P.page.evaluate(() => (window.__btBuildingIcons ? window.__btBuildingIcons().files : null)).catch(() => null);
    const want = { gemcutter: /skill-gemcutting\.webp$/, feedseed: /skill-farming\.webp$/, landoffice: /bldg-farm\.webp$/, store: /panel-shop\.webp$/ };
    rec.ok(`...the Gem Works a gem, the Feed & Seed a sprout, the Land Office the barn, the General Store a shop (${pics ? Object.keys(want).map((k) => k + ' ' + String(pics[k] || '-').split('/').pop()).join(', ') : '?'})`,
      !!pics && Object.keys(want).every((k) => want[k].test(pics[k] || '')), { pics });
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
  rec.ok('...saying where you are', /You are in BroTown/.test(opened.where), opened);
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
  /* v2.3.3058: the Lv 6-10 ring is No man's land 1 (since v2.3.3690 it is 2:
     it starts at the Lv 1-5 ring), and there the bar's
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
      /* v2.3.3609: the four strips held again (v2.3.3481-v2.3.3608 held the
         eight lands' scenes in their place) */
      strips: zb && zb.resident ? zb.resident() : null };
  });
  rec.ok(`...and the name plate marks the land: the frost icon before "Frost Ridge", the name in the land's own colour (${look.color})`,
    look.land === 'frost' && look.icon === true && !!look.color && look.color !== '#f7f2e7', look);
  rec.ok(`...and crossing into Frost Ridge played its banner, docking into the plate (${look.banner ? `"${look.banner.text}"${look.banner.scene ? ', the owner\'s frost scene over it' : (look.banner.plain ? ', plain' : ', the owner\'s frost art')}` : 'shown ' + (look.bannerAt ? 'and docked' : 'never')})`,
    look.bannerAt > 0 && look.watch && look.watch.shown === 'frost', look);
  /* v2.3.3609, the owner: "The older ones were better": the Wheel holds the
     four lands' animated strips again, loaded behind its loading screen */
  rec.ok(`...and the Wheel holds the owner's four animated banners for its lands (${JSON.stringify(look.strips)})`,
    Array.isArray(look.strips) && look.strips.length === 4 && ['frost', 'fire', 'desert', 'forest'].every((t) => look.strips.includes(t)), { strips: look.strips });
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
  /* v2.3.3609: the banner played again (its history forgotten, the land watch
     asks once more 600 ms on): the owner's ANIMATED frost banner, its
     ornaments drawn round the plaque, the frost icon and the name -- and
     nothing under the minimap any more (v2.3.3511's emblem is gone) */
  const sb = await P.page.evaluate(async () => {
    const zb = window.__btZoneBanner;
    if (!zb || !zb.reset || !zb.onScreen) return null;
    zb.reset();
    let banner = null, beats = 0;
    for (let i = 0; i < 160 && !(banner && banner.named); i++) {
      const o = zb.onScreen();
      if (o && o.text) banner = { ...o, named: !!document.querySelector('.bt-zone-banner.is-named') };
      await new Promise((res) => setTimeout(res, 50));
    }
    beats = zb.beatLog ? zb.beatLog().length : 0;
    /* v2.3.3609: the emblem's element, as v2.3.3511's landEmblem.js put it in
       the page (a class and data-land-emblem) -- its window handle went with it */
    return { banner, beats, emblem: !!document.querySelector('.bt-land-emblem, [data-land-emblem]') };
  });
  await shot(P, '04c-landbanner');
  rec.ok(`...and the land's banner is the owner's animated one again: "${sb && sb.banner && sb.banner.text}", its ornaments drawn (${sb && sb.banner && sb.banner.orn}), the frost icon before the name, no picture over the plaque, ${sb && sb.beats} beats run`,
    !!sb && !!sb.banner && sb.banner.text === 'Frost Ridge' && sb.banner.plain === false && sb.banner.orn === true && !!sb.banner.icon
      && /elem-frost/.test(sb.banner.icon) && sb.banner.scene === null && sb.beats >= 1, sb && sb.banner);
  rec.ok('...and nothing comes up under the minimap (the land\'s small picture of v2.3.3511 is gone)', !!sb && sb.emblem === false, sb && { emblem: sb.emblem });
  for (let i = 0; i < 24; i++) {
    const pl = await P.page.evaluate(() => (window.__btZoneBanner && window.__btZoneBanner.playing ? window.__btZoneBanner.playing() : null));
    if (!pl) break;
    await P.page.waitForTimeout(250);
  }
  /* ── 5. off the Wheel: onto your farm (v2.3.3678: it walked back up the
     retired town's stairs; the world has no way back to it) ── */
  await P.page.addStyleTag({ content: '.bt-quest-banner, .bt-quest-plate, *:has(> [data-coach-dismiss]) { visibility: hidden !important; }' }).catch(() => {});
  await P.page.evaluate(() => { try { window._uiPanels.building('farm'); } catch (e) { /* the check says */ } });
  let visit = null;
  for (let i = 0; i < 16 && !visit; i++) {
    visit = await P.page.evaluate(() => { const b = document.querySelector('[data-farm-visit]'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    if (!visit) await P.page.waitForTimeout(500);
  }
  if (visit) await P.page.touchscreen.tap(visit.x, visit.y);
  let back = null;
  for (let i = 0; i < 60; i++) {
    back = await H.readState(P, (S) => ({ zone: S.currentZone, hold: !!S._farmArtHold, veil: !!document.querySelector('.bt-zone-loading') }));
    if (back && back.zone === 'farm_home' && !back.hold && !back.veil) break;
    await P.page.waitForTimeout(750);
  }
  await P.page.waitForTimeout(1500);
  const home = await mini(P);
  const btnHome = await P.page.evaluate(() => !!document.querySelector('[data-world-map-open]'));
  rec.ok('off the Wheel, on your farm, the farm\'s own small minimap and no world map to open', !!back && back.zone === 'farm_home' && home && !home.wheel && home.box === 52 && !btnHome,
    { back, box: home && home.box, wheel: home && home.wheel, btnHome, visit });
  /* (v2.3.3522 checked here that the buildings' pictures went with the Wheel,
     on the old way out to the retired town.  The farm trip sets the zone
     straight in and lets go of none of the Wheel's art (its pictures, its
     signposts' icons, its lands' banner strips): found by this move, a
     separate fix, so not asserted here.) */
  rec.ok('no page errors', P.logs.filter((l) => /pageerror/.test(l)).length === 0, P.logs.filter((l) => /pageerror/.test(l)).slice(0, 5));
}
