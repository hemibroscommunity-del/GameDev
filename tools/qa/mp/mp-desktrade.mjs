/* ═══ v2.3.3849: ON A COMPUTER, A CLICK ON YOUR BAG PUTS THE ITEM UP ═══
 *
 * The owner, on a laptop (2026-10-29): "when I tested on desktop for trading I
 * wasn't able to just click items on my inventory during an active trade to
 * put items up."  A phone stages an item by tapping its bag tile while a trade
 * is live (dash/InventoryPanel ItemTile -> tradeBagBus, v2.3.2149); every trade
 * scenario so far played the upright phone, so the computer's sideways layout
 * (the bag in the side column) was never tried.
 *
 *   1. two computers (wide, 1440x900) in BroTown open a real trade;
 *   2. A's bag tile for the wood is on screen, and the thing under its centre
 *      is the tile (elementFromPoint, what a click hits);
 *   3. a real mouse click on it stages one into A's offer (the panel's mirror,
 *      tradeBagBus.staged) and B sees it offered;
 *   4. a second click stages a second;
 *   5. a WEAPON in the bag (a StashTile, which never asked the trade before):
 *      a click stages it into the weapon lane -- B sees it offered and it
 *      leaves A's bag -- where on main it opened the weapon's card.
 *   6. v2.3.3856: the drawer's two offers stand side by side -- yours on the
 *      left, theirs on the right, the same width -- on both computers.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const WOOD = 'wood_pine_log';
const OUT = join(H.REPO, 'tools/qa/mp/out');
const shot = async (P, name) => { try { mkdirSync(OUT, { recursive: true }); await P.page.screenshot({ path: join(OUT, `desktrade-${name}.png`) }); } catch (e) { /* a picture only */ } };

/* what the bag tile is, where it is, and what a click at its centre hits */
const tileProbe = (P, key) => P.page.evaluate((k) => {
  const el = [...document.querySelectorAll(`[data-bag-key="i-${k}"]`)].find((e) => {
    const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0;
  });
  if (!el) return { found: false, count: document.querySelectorAll(`[data-bag-key="i-${k}"]`).length };
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const hit = document.elementFromPoint(cx, cy);
  const desc = (e) => (e ? (e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).join('.') : '')
    + (e.getAttribute && e.getAttribute('data-trade-drawer') != null ? '[data-trade-drawer]' : '')) : null);
  /* the nearest ancestor that says what it is, for the record */
  let cover = hit, depth = 0;
  while (cover && depth < 8 && !(cover.getAttribute && (cover.getAttribute('data-trade-drawer') != null || cover.id))) { cover = cover.parentElement; depth++; }
  return {
    found: true, x: Math.round(cx), y: Math.round(cy), w: Math.round(r.width), h: Math.round(r.height),
    inView: cx >= 0 && cy >= 0 && cx <= innerWidth && cy <= innerHeight,
    hitIsTile: !!hit && (hit === el || el.contains(hit)),
    hit: desc(hit), cover: cover ? (desc(cover) + (cover.id ? '#' + cover.id : '')) : null,
  };
}, key);
const staged = (P, key) => P.page.evaluate((k) => {
  const b = window.__broTradeBagBus;
  return { open: !!(b && b.open), n: b && b.staged ? (b.staged[k] || 0) : 0 };
}, key);

export async function run({ browser, wsPort, webPort, rec }) {
  const view = { width: 1440, height: 900 };
  const A = await H.newPlayer(browser, { name: 'Deskseller', wsPort, webPort, viewport: view, world: 'wheel', wide: true });
  await H.enterWorld(A);
  const B = await H.newPlayer(browser, { name: 'Deskbuyer', wsPort, webPort, viewport: view, world: 'wheel', wide: true });
  await H.enterWorld(B);
  await H.waitMutualSight(A, B);
  const aId = await H.readState(A, (S) => S.myId);
  const bId = await H.readState(B, (S) => S.myId);
  await H.grant(wsPort, aId, 'item', { invKey: WOOD, count: 6 });
  await H.grant(wsPort, aId, 'gold', { amount: 800 });
  /* a weapon in the bag: the admin grant has no weapons, so A forges -- the
     first copper greatsword goes into the empty hand, the next swaps it into
     the bag (gear.js), as mp-dashreal forges its one */
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
  rec.ok('0 A has a weapon in the bag (guard)', !!wpn, wpn);

  /* ── 1. a real trade, opened the way a player does ── */
  await H.openInspect(A, bId);
  await H.clickText(A, 'Trade');
  const gotInvite = await H.waitUi(B, () => [...document.querySelectorAll('button')]
    .some((b) => b.textContent.includes('Open trade')), { label: 'B trade invite', timeout: 20000 })
    .then(() => true).catch(() => false);
  rec.ok('1a B receives the trade invite (guard)', gotInvite);
  if (!gotInvite) { await shot(A, '1-noinvite'); await A.ctx.close(); await B.ctx.close(); return; }
  await H.clickText(B, 'Open trade');
  const live = await H.waitFor(A, () => !!(window.__broTradeBagBus && window.__broTradeBagBus.open), (v) => v === true,
    { timeout: 20000, label: 'A trade live' }).then(() => true).catch(() => false);
  rec.ok('1b the trade is live on A (the bag is taken)', live);
  await A.page.waitForTimeout(800);
  await shot(A, '1-live');

  /* ── 2. the wood's tile, and what a click on it hits ── */
  const p = await tileProbe(A, WOOD);
  rec.ok('2a A\'s bag shows the wood on screen', !!p.found && !!p.inView, p);
  rec.ok('2b the thing under the tile\'s centre is the tile, not a cover', !!p.hitIsTile, p);

  /* ── 3. a real mouse click stages one ── */
  if (p.found && p.inView) await A.page.mouse.click(p.x, p.y);
  await A.page.waitForTimeout(1500);
  const s1 = await staged(A, WOOD);
  rec.ok('3a a click on the tile stages one wood into A\'s offer', s1.n === 1, s1);
  const bSees = await H.waitUi(B, () => /Pine|pine|wood/i.test((document.querySelector('[data-trade-drawer]') || {}).innerText || ''),
    { label: 'B sees the wood', timeout: 15000 }).then(() => true).catch(() => false);
  rec.ok('3b ...and B sees it offered', bSees);
  await shot(A, '3-staged');

  /* ── 4. a second click stages a second ── */
  const p2 = await tileProbe(A, WOOD);
  if (p2.found && p2.inView) await A.page.mouse.click(p2.x, p2.y);
  await A.page.waitForTimeout(1500);
  const s2 = await staged(A, WOOD);
  rec.ok('4 a second click stages a second', s2.n === 2, { s2, p2 });

  /* ── 5. a weapon tile stages the weapon (v2.3.3849) ── */
  if (wpn) {
    const wkey = 'stashWeapon-0';
    const wp = await A.page.evaluate((k) => {
      const el = [...document.querySelectorAll(`[data-bag-key="${k}"]`)].find((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
      if (!el) return { found: false };
      const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const hit = document.elementFromPoint(cx, cy);
      return { found: true, x: Math.round(cx), y: Math.round(cy), inView: cy >= 0 && cy <= innerHeight, hitIsTile: !!hit && (hit === el || el.contains(hit)) };
    }, wkey);
    rec.ok('5a A\'s weapon is a tile on screen, and a click there hits it', !!wp.found && !!wp.inView && !!wp.hitIsTile, wp);
    await H.instrumentWire(A);
    const hook = await A.page.evaluate(() => typeof (window.__broTradeBagBus && window.__broTradeBagBus.weapon));
    if (wp.found && wp.inView) await A.page.mouse.click(wp.x, wp.y);
    /* polled, not a fixed wait: the worker escrows it and the bag's copy
       follows on its next state flush, slower on a loaded box */
    let left = wpn.n;
    for (let t = 0; t < 75 && left === wpn.n; t++) {
      await A.page.waitForTimeout(200);
      left = await H.readState(A, (S) => ((S.rpg && S.rpg.weaponStash) || []).length);
    }
    const card = await A.page.evaluate(() => !!document.querySelector('[data-item-detail], .bt-item-detail, .ls-item-popup'));
    let bSeesW = false;
    for (let t = 0; t < 75 && !bSeesW; t++) {
      bSeesW = await B.page.evaluate((nm) => ((document.querySelector('[data-trade-drawer]') || {}).innerText || '').toLowerCase()
        .includes(String(nm || 'great').toLowerCase()), wpn.name).catch(() => false);
      if (!bSeesW) await B.page.waitForTimeout(200);
    }
    const wire = await H.wireCounts(A);
    rec.ok('5b a click on the weapon stages it: it leaves A\'s bag (into the trade)', left === wpn.n - 1, { before: wpn.n, after: left, card, hook, sent: wire['trade2_stage_weapon'] || 0, wire });
    rec.ok('5c ...and B sees it offered', bSeesW, { name: wpn.name });
    await shot(A, '5-weapon');
  }

  /* ── 6. v2.3.3856: side by side -- yours on the left, theirs on the right ──
     The owner: "for trade window I'd prefer a side by side layout of your
     trade window on left and other person trade window on right." */
  const lanes = (P) => P.page.evaluate(() => {
    const d = document.querySelector('[data-trade-drawer]');
    const pick = (rx) => {
      const h = [...(d ? d.querySelectorAll('.bt-t2-lane-hdr') : [])].find((x) => rx.test(((x.querySelector('.bt-t2-lane-name') || {}).textContent || '').trim()));
      const l = h && h.closest('.bt-t2-lane'); if (!l) return null;
      const r = l.getBoundingClientRect(); return { top: Math.round(r.top), left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width) };
    };
    return { mine: pick(/^You offer$/i), theirs: pick(/offers$/i), drawerW: d ? Math.round(d.getBoundingClientRect().width) : 0 };
  });
  const LA = await lanes(A), LB = await lanes(B);
  const side = (L) => !!(L.mine && L.theirs) && Math.abs(L.mine.top - L.theirs.top) <= 4 && L.mine.right <= L.theirs.left && L.mine.w > 250 && Math.abs(L.mine.w - L.theirs.w) <= 4;
  rec.ok(`6a on a computer (drawer ${LA.drawerW} px) your offer is on the left, theirs on the right, side by side, the same width`, side(LA), LA);
  rec.ok('6b ...and on the other side the same: their own offer left, the seller\'s right', side(LB), LB);
  await shot(A, '6-side-by-side');

  await A.ctx.close().catch(() => {});
  await B.ctx.close().catch(() => {});
}
