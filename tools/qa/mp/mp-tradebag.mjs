/* ═══ v2.3.4877: ON A PHONE, A TAP ON YOUR BAG PUTS THE ITEM UP ═══
 *
 * The owner, 2026-11-12: "The trading is not working correctly. Previously I
 * had it to where you could just tap your inventory items to put up items.
 * Now it only has predetermined pull buttons you can tap on in the trade
 * window with mockup art icons."
 *
 * The design (v2.3.2149, tradeBagBus.js): while a live trade window is up,
 * a tap on a tile in YOUR BAG in the band stages one of that item into your
 * offer (addOne -> trade2_set); a weapon tile stages into the weapon lane
 * (v2.3.3849).  The phone tests that tapped the bag mid-trade went with the
 * retired map's (mp-tradetap, docs/OLD-MAP-TESTS.md); mp-desktrade plays a
 * computer, mp-tradeside clicks the tile from script.  This plays two upright
 * phones (390 x 844, touch) in BroTown:
 *   0. THE OWNER'S CASE: each band left on another of its pages (A on the
 *      Bro card, B on Quests) -- on main the trade opened over that page,
 *      no bag in sight, only the drawer's own pills to tap (the weapon lane,
 *      the gold steps);
 *   1. A opens a trade with B from B's card, B opens it: the trade is live;
 *   2. A's bag is on screen under the drawer, its wood tile visible, and the
 *      thing under the tile's centre is the tile (what a thumb hits);
 *   3. a real TAP on the wood stages one into A's offer, and B sees it;
 *   4. a real TAP on A's weapon tile stages it into the weapon lane: it
 *      leaves A's bag and B sees it offered;
 *   5. the window carries no item picker of its own (its weapon pills and
 *      gold steps stay): the bag is the way to add items; B's bag, its band
 *      left on Quests, is in front too.
 * Red on the main of 2026-11-12 (8 of 15: no bag on screen, so neither tap
 * could land); green with BottomDashboard's v2.3.4877 rule.
 * Pictures (deviceScaleFactor 1): tools/qa/mp/out/tradebag-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const WOOD = 'wood_pine_log';
const PHONE = { width: 390, height: 844 };
const OUT = join(H.REPO, 'tools/qa/mp/out');
const shot = async (P, name) => { try { mkdirSync(OUT, { recursive: true }); await P.page.screenshot({ path: join(OUT, `tradebag-${name}.png`) }); } catch (e) { /* a picture only */ } };

/* a bag tile by its data-bag-key: where it is and what a tap at its centre hits */
const tileProbe = (P, bagKey) => P.page.evaluate((k) => {
  const all = [...document.querySelectorAll(`[data-bag-key="${k}"]`)];
  const el = all.find((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
  const fold = (document.querySelector('[data-dash-fold]') || { getAttribute: () => null }).getAttribute('data-dash-fold');
  if (!el) return { found: false, count: all.length, fold };
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const hit = document.elementFromPoint(cx, cy);
  let cover = hit, depth = 0;
  while (cover && depth < 10 && !(cover.getAttribute && (cover.getAttribute('data-trade-drawer') != null || cover.id || cover.getAttribute('data-bag-key')))) { cover = cover.parentElement; depth++; }
  const desc = (e) => (e ? e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).slice(0, 3).join('.') : '')
    + (e.id ? '#' + e.id : '') + (e.getAttribute && e.getAttribute('data-trade-drawer') != null ? '[data-trade-drawer]' : '') : null);
  return {
    found: true, fold, x: Math.round(cx), y: Math.round(cy), w: Math.round(r.width), h: Math.round(r.height),
    inView: cx >= 0 && cy >= 0 && cx <= innerWidth && cy <= innerHeight,
    hitIsTile: !!hit && (hit === el || el.contains(hit)), hit: desc(hit), cover: desc(cover),
  };
}, bagKey);
const staged = (P, key) => P.page.evaluate((k) => {
  const b = window.__broTradeBagBus;
  return { open: !!(b && b.open), n: b && b.staged ? (b.staged[k] || 0) : 0, hasAdd: !!(b && b.add), hasWeapon: !!(b && b.weapon) };
}, key);
const drawerText = (P) => P.page.evaluate(() => ((document.querySelector('[data-trade-drawer]') || {}).innerText || ''));
/* what the drawer offers to tap that is not the bag: any button naming an
   item or a weapon (the old in-window tray, a chip row) */
const drawerPickers = (P) => P.page.evaluate(() => {
  const d = document.querySelector('[data-trade-drawer]');
  if (!d) return { drawer: false };
  const btns = [...d.querySelectorAll('button')].filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
  return {
    drawer: true,
    buttons: btns.map((b) => (b.innerText || b.getAttribute('aria-label') || '').trim().slice(0, 40)),
    weaponChips: btns.filter((b) => /⚔/.test(b.textContent || '')).length,
    bagTilesInDrawer: d.querySelectorAll('[data-bag-key]').length,
  };
});

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await H.newPlayer(browser, { name: 'Bagseller', wsPort, webPort, viewport: PHONE, touch: true, dpr: 1, world: 'wheel' });
  await H.enterWorld(A);
  const B = await H.newPlayer(browser, { name: 'Bagbuyer', wsPort, webPort, viewport: PHONE, touch: true, dpr: 1, world: 'wheel' });
  await H.enterWorld(B);
  const errors = [];
  for (const P of [A, B]) P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  try {
    await H.waitMutualSight(A, B);
    const aId = await H.readState(A, (S) => S.myId);
    const bId = await H.readState(B, (S) => S.myId);
    await H.grant(wsPort, aId, 'item', { invKey: WOOD, count: 6 });
    await H.grant(wsPort, aId, 'gold', { amount: 800 });
    await H.grant(wsPort, bId, 'item', { invKey: 'bar_copper', count: 2 });   /* something in B's bag (step 5b) */
    /* a weapon in the bag: the first copper greatsword goes into the empty
       hand, the next into the bag (gear.js), as mp-desktrade forges its one */
    await H.grant(wsPort, aId, 'item', { invKey: 'bar_copper', count: 12 });
    await A.page.waitForTimeout(1200);
    for (let i = 0; i < 3; i++) {
      const n = await H.readState(A, (S) => ((S.rpg && S.rpg.weaponStash) || []).length);
      if (n >= 1) break;
      await A.page.evaluate(() => {
        const S = window._gameState.current;
        if (S && S.channel) S.channel.send({ type: 'forge_weapon', payload: { weaponType: 'greatsword', tierKey: 'copper', isWoodwork: false } });
      });
      await A.page.waitForTimeout(2200);
    }
    const wpn = await H.readState(A, (S) => { const w = ((S.rpg && S.rpg.weaponStash) || [])[0]; return w ? { name: w.name, n: S.rpg.weaponStash.length } : null; });
    rec.ok('0 A has wood and a weapon in the bag (guard)', !!wpn, wpn);
    await shot(A, '0-before');

    /* THE OWNER'S CASE: the band left on another of its pages -- A on the Bro
       card, B on Quests -- tapped as a thumb does (the nav row's buttons) */
    const navTap = async (P, id) => {
      const b = await P.page.evaluate((d) => {
        const el = [...document.querySelectorAll(`[data-nav="${d}"]`)].find((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
        if (!el) return null;
        const r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
      }, id);
      if (b) await P.page.touchscreen.tap(b.x, b.y);
      await P.page.waitForTimeout(900);
      return P.page.evaluate(() => { const d = window.__broDashPanelBus; return d ? { mode: d.state.mode, page: d.current() } : null; });
    };
    const pa = await navTap(A, 'hero');
    const pb = await navTap(B, 'quests');
    rec.ok('0b A\'s band is on the Bro page and B\'s on Quests, the bag out of sight (guard)',
      !!pa && pa.mode === 'expanded' && pa.page === 'hero' && !!pb && pb.mode === 'expanded' && pb.page === 'quests'
      && !(await tileProbe(A, `i-${WOOD}`)).found, { pa, pb });
    await shot(A, '0-bro-page');

    /* ── 1. a real trade, opened from B's card ── */
    await H.openInspect(A, bId);
    await H.clickText(A, 'Trade');
    const gotInvite = await H.waitUi(B, () => [...document.querySelectorAll('button')]
      .some((b) => b.textContent.includes('Open trade')), { label: 'B trade invite', timeout: 20000 })
      .then(() => true).catch(() => false);
    rec.ok('1a B receives the trade invite (guard)', gotInvite);
    if (!gotInvite) { await shot(A, '1-noinvite'); return; }
    await H.clickText(B, 'Open trade');
    const live = await H.waitFor(A, () => !!(document.querySelector('[data-trade-drawer]') && /Trading with/.test(document.querySelector('[data-trade-drawer]').innerText || '')), (v) => v === true,
      { timeout: 20000, label: 'A trade live' }).then(() => true).catch(() => false);
    rec.ok('1b the trade window is live on A', live);
    await A.page.waitForTimeout(1200);
    const bus = await staged(A, WOOD);
    rec.ok('1c ...and it has taken A\'s bag (tradeBagBus attached)', bus.open && bus.hasAdd, bus);
    await shot(A, '1-live');
    await shot(B, '1-live-B');

    /* ── 2. the wood tile is on screen and a thumb hits it ── */
    /* no help from the test: the trade window itself brings the bag (a
       folded band unfolds, v2.3.3399; a band on a page shows the bag,
       v2.3.4877) */
    const p = await tileProbe(A, `i-${WOOD}`);
    p.band = await A.page.evaluate(() => { const d = window.__broDashPanelBus; return d ? { mode: d.state.mode, page: d.current() } : null; });
    rec.ok('2a A\'s bag shows the wood on screen under the trade window', !!p.found && !!p.inView, p);
    rec.ok('2b the thing under the tile\'s centre is the tile, not a cover', !!p.hitIsTile, p);

    /* ── 3. a real tap stages one, and B sees it ── */
    if (p.found && p.inView) await A.page.touchscreen.tap(p.x, p.y);
    let s1 = await staged(A, WOOD);
    for (let t = 0; t < 30 && s1.n < 1; t++) { await A.page.waitForTimeout(200); s1 = await staged(A, WOOD); }
    const card = await A.page.evaluate(() => !!(window._itemDetailBus && window._itemDetailBus.state && window._itemDetailBus.state.open));
    rec.ok('3a a tap on the bag\'s wood stages one into A\'s offer (no item card instead)', s1.n === 1 && !card, { s1, card });
    const bSees = await H.waitUi(B, () => /pine|wood|log/i.test((document.querySelector('[data-trade-drawer]') || {}).innerText || ''),
      { label: 'B sees the wood', timeout: 15000 }).then(() => true).catch(() => false);
    rec.ok('3b ...and B sees it offered', bSees, { bDrawer: (await drawerText(B)).slice(0, 300) });
    await shot(A, '3-staged');

    /* ── 4. a tap on the weapon tile stages the weapon ── */
    if (wpn) {
      let wp = await tileProbe(A, 'stashWeapon-0');
      if (!wp.found || !wp.inView) {
        /* below the items: scroll the bag to it as a thumb would */
        await A.page.evaluate(() => { const el = document.querySelector('[data-bag-key="stashWeapon-0"]'); if (el) el.scrollIntoView({ block: 'center' }); });
        await A.page.waitForTimeout(500);
        wp = await tileProbe(A, 'stashWeapon-0');
      }
      rec.ok('4a A\'s weapon is a tile in the bag on screen, and a tap there hits it', !!wp.found && !!wp.inView && !!wp.hitIsTile, wp);
      if (wp.found && wp.inView) await A.page.touchscreen.tap(wp.x, wp.y);
      let left = wpn.n;
      for (let t = 0; t < 75 && left === wpn.n; t++) {
        await A.page.waitForTimeout(200);
        left = await H.readState(A, (S) => ((S.rpg && S.rpg.weaponStash) || []).length);
      }
      rec.ok('4b a tap on the weapon stages it: it leaves A\'s bag (into the trade)', left === wpn.n - 1, { before: wpn.n, after: left });
      let bSeesW = false;
      for (let t = 0; t < 75 && !bSeesW; t++) {
        bSeesW = (await drawerText(B).catch(() => '')).toLowerCase().includes(String(wpn.name || 'great').toLowerCase());
        if (!bSeesW) await B.page.waitForTimeout(200);
      }
      rec.ok('4c ...and B sees it offered', bSeesW, { name: wpn.name });
      await shot(A, '4-weapon');
      await shot(B, '4-weapon-B');
    }

    /* ── 5. the bag is the way in: the window has no item picker of its own
       (its weapon lane's pills and the gold steps stay: they are the window's
       own) ── */
    const pk = await drawerPickers(A);
    rec.ok('5 the trade window carries no item buttons of its own (the bag is the way to add items)',
      pk.drawer && pk.bagTilesInDrawer === 0 && !pk.buttons.some((t) => /pine|log|copper bar/i.test(t)), pk);
    /* ...and B, whose band was on Quests, has its bag in front too */
    const bBag = await B.page.evaluate(() => { const d = window.__broDashPanelBus; return d ? { mode: d.state.mode, page: d.current() } : null; });
    const bTiles = await B.page.evaluate(() => [...document.querySelectorAll('[data-bag-key="i-bar_copper"]')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top < innerHeight; }).length);
    rec.ok('5b B\'s band, left on Quests, shows B\'s bag with the trade window too', bTiles > 0, { bBag, bTiles });
    rec.ok('6 no page errors', errors.length === 0, errors.slice(0, 3));
  } finally {
    await A.ctx.close().catch(() => {});
    await B.ctx.close().catch(() => {});
  }
}
