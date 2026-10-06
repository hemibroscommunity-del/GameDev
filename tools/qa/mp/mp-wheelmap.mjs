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
 * Pictures land in tools/qa/mp/out/wheelmap-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
/* v2.3.2978: the Wheel is its own zone, 'wheel', against a worker that runs
   its monsters (server/src/wheelzone.js) -- 'worldview' against an older one */
const WHEELISH = (z) => z === 'worldview' || z === 'wheel';

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
/* v2.3.3009: the top bar's words in the Wheel (ZoneHeader.jsx wheelWhere):
   the place, the gold line under it, and whether each fits whole in the bar */
const bar = (P) => P.page.evaluate(() => {
  const t = document.querySelector('[data-zone-title]');
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
  rec.ok('...about three zones across, centred on you', m && m.window === 3200 && Math.abs(m.playerBoxX - 66) < 2 && Math.abs(m.playerBoxY - 66) < 2, m && { x: m.playerBoxX, y: m.playerBoxY });
  /* v2.3.3023: in town, town is on the box: no home badge */
  rec.ok('...and in town no home badge: the town is on the box', m && m.home && m.home.edge === false && m.home.shown === false, m && m.home);
  /* v2.3.3009: the words are the top bar's now, in place of "The Wheel (Lv1-2)" */
  let tb = null;
  for (let i = 0; i < 10; i++) { tb = await bar(P); if (barHolds(tb, 'Brotown', /^safe$/)) break; await P.page.waitForTimeout(300); }
  rec.ok(`...and the TOP BAR says where you are: "${tb && tb.place && tb.place.text}" over "${tb && tb.sub && tb.sub.text}", not "The Wheel (Lv1-2)" -- both lines whole, inside the bar`,
    m && m.words && m.words.title === 'Brotown' && barHolds(tb, 'Brotown', /^safe$/), { tb, words: m && m.words });
  rec.ok('...and nothing is printed under the minimap any more', m && m.label === false, m && m.label);
  await shot(P, '01-minimap');
  /* the box is drawn: its middle is the land's colours, not one flat colour */
  const box = await H.screenshotPixels(P);
  const dpr = box.width / PHONE.width;   /* the screenshot is in device px */
  /* v2.3.3009: and framed -- the slate band down both sides, the brass line
     inside it (read halfway down, where no corner rounds it) */
  const px = (x, y) => box.at(Math.round(x * dpr), Math.round(y * dpr));
  const like = (p, hex, tol) => !!p && Math.abs(p[0] - ((hex >> 16) & 255)) <= tol && Math.abs(p[1] - ((hex >> 8) & 255)) <= tol && Math.abs(p[2] - (hex & 255)) <= tol;
  const midY = m.topInset + 66;
  const frame = { band: m.frame, left: px(m.rootX + 4, midY), right: px(PHONE.width - 4, midY), brassL: px(m.rootX + 6, midY), brassR: px(PHONE.width - 6, midY) };
  rec.ok(`the minimap wears a thick frame (${m.frame} px): a slate band down both sides, the colour of the bars, and the brass line inside it`,
    m.frame >= 6 && like(frame.left, 0x202c32, 14) && like(frame.right, 0x202c32, 14) && like(frame.brassL, 0xd8aa58, 40) && like(frame.brassR, 0xd8aa58, 40), frame);
  let distinct = new Set();
  for (let y = m.topInset + 6; y < m.topInset + 126; y += 3) for (let x = PHONE.width - 126; x < PHONE.width - 6; x += 3) {
    const p = box.at(Math.round(x * dpr), Math.round(y * dpr));
    if (p) distinct.add(`${p[0] >> 4},${p[1] >> 4},${p[2] >> 4}`);
  }
  /* v2.3.3031: the arrival's window is mostly the paved square now (it is 28% bigger, and the
     yards round it are lawn): 12 colours, where it was more -- still nothing like a flat fill */
  rec.ok(`...drawn on screen, in many colours (${distinct.size})`, distinct.size > 8, { distinct: distinct.size });

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
  const frost = { x: 18464, y: 18464 };   /* the north-west spoke, its second tier: levels 6-10 */
  await H.hopTo(P, frost.x, frost.y, { tries: 80 });
  let fw = null;
  for (let i = 0; i < 20; i++) {
    fw = (await mini(P)) || {};
    if (fw.words && fw.words.title === 'Frost Ridge') break;
    await P.page.waitForTimeout(400);
  }
  let fb = null;
  for (let i = 0; i < 10; i++) { fb = await bar(P); if (barHolds(fb, 'Frost Ridge', /the thaw line · Lv 6–10/)) break; await P.page.waitForTimeout(300); }
  rec.ok(`walking out onto Frost Ridge, the top bar says so: the land, its stage and the levels there ("${fb && fb.place && fb.place.text}" over "${fb && fb.sub && fb.sub.text}", whole)`,
    fw.words && fw.words.title === 'Frost Ridge' && /the thaw line · Lv 6–10/.test(fw.words.sub) && barHolds(fb, 'Frost Ridge', /the thaw line · Lv 6–10/), { fb, words: fw.words });
  await shot(P, '04-frost');
  /* v2.3.3024, owner: "There might need to be flat colors on the minimap to
     help orient you to what elemental zone you're in" and "elemental zones
     need something more obvious that the player is in that elemental zone":
     the minimap paints Frost Ridge its one ice blue; the top bar puts the
     frost icon before the land's name, the name in the land's colour; and
     crossing into it played its banner (the owner's frost art, the icon and
     the name) */
  const look = await P.page.evaluate(() => {
    const pl = document.querySelector('[data-zone-place]');
    const ic = pl && pl.querySelector('img.bt-zone-header__elem');
    const zb = window.__btZoneBanner;
    return { land: pl ? pl.getAttribute('data-zone-land') : null, icon: ic ? ic.getAttribute('src') : null, color: pl ? getComputedStyle(pl).color : null,
      bannerAt: zb ? zb.shownAt('frost') : 0, banner: zb && zb.onScreen ? zb.onScreen() : null, watch: zb && zb.land ? zb.land() : null };
  });
  rec.ok(`...and the top bar marks the land: the frost icon before "Frost Ridge", the name in the land's own colour (${look.color})`,
    look.land === 'frost' && /elem-frost\.webp$/.test(look.icon || '') && !!look.color && look.color !== 'rgb(247, 242, 231)', look);
  rec.ok(`...and crossing into Frost Ridge played its banner (${look.banner ? `"${look.banner.text}"${look.banner.plain ? ', plain' : ', the owner\'s frost art'}` : 'shown ' + (look.bannerAt ? 'and docked' : 'never')})`,
    look.bannerAt > 0 && look.watch && look.watch.shown === 'frost', look);
  {
    /* the minimap's land here is the land's one flat colour: ice blue round
       you, read off the screen (wheelLands.js frost #7fbfe0 under the box's
       0xdadada tint: about 108, 163, 191) */
    const r = await P.page.evaluate(() => window.__btWheelMini);
    const { decodePNG } = await import('../../world/png.mjs');
    const png = decodePNG(await P.page.screenshot({ clip: { x: r.left + 20, y: r.top + 20, width: r.w - 40, height: r.h - 40 } }));
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
