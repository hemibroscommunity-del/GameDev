/* ═══ v2.3.4878: ON AN UPRIGHT PHONE, DIEGO'S SHOP BRINGS YOUR BAG TO THE FRONT ═══
 *
 * Diego's shop (Shopkeeper Bro, v2.3.2059) is half a window: his shelf in a
 * drawer, and YOUR half is the band's own bag under it ("tap your bag below
 * to sell").  The band has pages of its own (Bro, Quests, Ranks, Codex,
 * More: v2.3.4172, v2.3.4393) that stay open while you play, and a tap on
 * Diego opens his shop whatever page the band is on -- so a player who last
 * looked at their Bro card got the shop over the Bro card, no bag to sell
 * from.  The trade window had the same hole (mp-tradebag, v2.3.4877); the
 * owner, 2026-11-12, asked for the shop to get the same fix.  This plays one
 * upright phone (390 x 844, touch) in BroTown, twice (the band left on the
 * Bro page, then on Quests):
 *   0. guard: the band is on that page and no bag tile is on screen;
 *   1. a TAP on Diego opens his shop (the way a player does: talking is a
 *      tap, H.approachNpc);
 *   2. the bag is in front: the remains' tile is on screen under the drawer,
 *      and the thing under its centre is the tile (what a thumb hits);
 *   3. a real TAP on the tile puts it in the deal strip as a SELL, and a tap
 *      on the deal button sells one: the coins go up, the bag goes down.
 * Then once more turned sideways (844 x 390): with the one band (v2.3.4072,
 * on by default) a sideways phone plays the upright layout, so the same rule
 * holds there (C).  The old side column's own shop rule (?oneband=0,
 * ShopkeeperPanel v2.3.3407) is not touched.
 * Red on the main of 2026-11-12 (the bag not on screen, nothing to sell);
 * green with BottomDashboard's v2.3.4878 rule.
 * Pictures (deviceScaleFactor 1): tools/qa/mp/out/shopbag-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const KEY = 'slime-remnants';
const PHONE = { width: 390, height: 844 };
const OUT = join(H.REPO, 'tools/qa/mp/out');
const shot = async (P, name) => { try { mkdirSync(OUT, { recursive: true }); await P.page.screenshot({ path: join(OUT, `shopbag-${name}.png`) }); } catch (e) { /* a picture only */ } };

/* the band's own bag tile for a key: where it is and what a tap at its centre hits */
const tileProbe = (P, invKey) => P.page.evaluate((k) => {
  const all = [...document.querySelectorAll(`[data-inv-key="${k}"]`)];
  const el = all.find((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
  if (!el) return { found: false, count: all.length };
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const hit = document.elementFromPoint(cx, cy);
  const desc = (e) => (e ? e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).slice(0, 3).join('.') : '')
    + (e.closest && e.closest('[data-shop-panel]') ? '[in shop drawer]' : '') : null);
  return {
    found: true, x: Math.round(cx), y: Math.round(cy), w: Math.round(r.width), h: Math.round(r.height),
    inView: cx >= 0 && cy >= 0 && cx <= innerWidth && cy <= innerHeight,
    hitIsTile: !!hit && (hit === el || el.contains(hit)), hit: desc(hit),
  };
}, invKey);
const band = (P) => P.page.evaluate(() => { const d = window.__broDashPanelBus; return d ? { mode: d.state.mode, page: d.current() } : null; });
const deal = (P) => P.page.evaluate(() => {
  const q = (s) => document.querySelector(s);
  const act = q('[data-shop-act]');
  const b = window.__broShopBus;
  return {
    panel: !!q('[data-shop-panel]'),
    sel: b && b.sel ? b.sel : null,
    dealKey: q('[data-shop-deal]') ? q('[data-shop-deal]').getAttribute('data-shop-deal') : null,
    side: act ? act.getAttribute('data-shop-act') : null,
    total: act ? act.getAttribute('data-shop-total') : null,
    label: act ? act.textContent.replace(/\s+/g, ' ').trim() : null,
    disabled: act ? act.disabled : null,
  };
});
const purse = (P) => H.readState(P, (S) => (S.rpg || {}).coins || 0);
const held = (P) => H.readState(P, (S) => ((S.rpg || {}).inventory || {})['slime-remnants'] || 0);

/* a page of the band, tapped as a thumb does (the nav row's buttons) */
const navTap = async (P, id) => {
  const b = await P.page.evaluate((d) => {
    const el = [...document.querySelectorAll(`[data-nav="${d}"]`)].find((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
    if (!el) return null;
    const r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  }, id);
  if (b) await P.page.touchscreen.tap(b.x, b.y);
  await P.page.waitForTimeout(900);
  return band(P);
};

/* closed by its own ✕ after stepping away from him (the shop's tap latch:
   mp-shopkeeper's closeShop) */
const closeShop = async (P) => {
  await P.page.evaluate(() => {
    const S = window._gameState.current;
    const n = (S.npcs || []).find((o) => o.id === 'shopkeeper_bro');
    if (n) { S.player.x = n.x + 420; S.player.y = n.y; }
  });
  await P.page.waitForTimeout(500);
  const btn = await P.page.$('[data-shop-close]');
  if (btn) await btn.click().catch(() => {});
  await P.page.waitForTimeout(500);
};

const visit = async (P, rec, page, tag) => {
  /* 0. the band left on that page, no bag in sight */
  const at = await navTap(P, page);
  const pre = await tileProbe(P, KEY);
  rec.ok(`${tag}0 the band is on the ${page} page, the bag out of sight (guard)`,
    !!at && at.mode === 'expanded' && at.page === page && !(pre.found && pre.inView), { at, pre });
  await shot(P, `${tag}0-${page}`);

  /* 1. a tap on Diego opens his shop */
  await H.approachNpc(P, 'shopkeeper_bro');
  const opened = await H.waitFor(P, () => !!document.querySelector('[data-shop-panel]'), (v) => v === true,
    { timeout: 12000, label: 'shop open' }).then(() => true).catch(() => false);
  const tap = await P.page.evaluate(() => window.__btNpcTap || null);
  rec.ok(`${tag}1 a tap on Diego opens his shop`, opened, { tap });
  if (!opened) { await shot(P, `${tag}1-noshop`); return; }
  await P.page.waitForTimeout(1200);
  await shot(P, `${tag}1-open`);

  /* 2. the bag is in front, a thumb hits the tile */
  const p = await tileProbe(P, KEY);
  p.band = await band(P);
  rec.ok(`${tag}2a the bag is on screen under the shop, the remains' tile in view`, !!p.found && !!p.inView, p);
  rec.ok(`${tag}2b the thing under the tile's centre is the tile, not a cover`, !!p.hitIsTile, p);

  /* 3. a real tap puts it in the deal as a SELL, and the deal sells one */
  if (p.found && p.inView) await P.page.touchscreen.tap(p.x, p.y);
  let d = await deal(P);
  for (let t = 0; t < 40 && !(d.dealKey === KEY && +d.total > 0); t++) { await P.page.waitForTimeout(150); d = await deal(P); }
  rec.ok(`${tag}3a a tap on the bag's remains puts them in the deal as a SELL`,
    d.dealKey === KEY && d.side === 'bag' && /SELL/i.test(d.label || '') && +d.total > 0, d);
  const coins0 = await purse(P), n0 = await held(P);
  if (d.dealKey === KEY && !d.disabled) {
    const act = await P.page.evaluate(() => {
      const el = document.querySelector('[data-shop-act]');
      if (!el) return null;
      const r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    });
    if (act) await P.page.touchscreen.tap(act.x, act.y);
  }
  let coins1 = coins0, n1 = n0;
  for (let t = 0; t < 40 && coins1 <= coins0; t++) { await P.page.waitForTimeout(200); coins1 = await purse(P); n1 = await held(P); }
  rec.ok(`${tag}3b ...and the deal sells one: paid, one fewer in the bag`, coins1 > coins0 && n1 === n0 - 1, { coins0, coins1, n0, n1 });
  await shot(P, `${tag}3-sold`);
  await closeShop(P);
};

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await H.newPlayer(browser, { name: 'Shopbag', wsPort, webPort, viewport: PHONE, touch: true, dpr: 1, world: 'wheel' });
  await H.enterWorld(A);
  const stopAlive = H.keepAlive(A);
  const errors = [];
  A.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));
  try {
    const aId = await H.readState(A, (S) => S.myId);
    await H.grant(wsPort, aId, 'item', { invKey: KEY, count: 20 });
    await A.page.waitForTimeout(1200);
    await H.unfoldBand(A);
    rec.ok('carrying remains to sell (guard)', (await held(A)) > 0, { n: await held(A) });

    await visit(A, rec, 'hero', 'A');
    await visit(A, rec, 'quests', 'B');

    /* C. turned sideways: the one band plays the upright layout there too */
    await A.page.setViewportSize({ width: PHONE.height, height: PHONE.width });
    await A.page.waitForTimeout(1500);
    await visit(A, rec, 'hero', 'C');
    rec.ok('D no page errors', errors.length === 0, errors.slice(0, 3));
  } finally {
    try { stopAlive(); } catch (e) { /* gone */ }
    await A.ctx.close().catch(() => {});
  }
}
