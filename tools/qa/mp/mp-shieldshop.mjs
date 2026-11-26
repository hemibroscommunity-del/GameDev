/* ═══ v2.3.6800 (card SHOP): DIEGO SELLS A LOST PINE SHIELD ═══
 *
 * The owner, 2026-11-26: "make the store keeper sell shield I lost mine".
 * Diego sells the Pine Shield tut_1 mints, 100 coins, ONE, to a player a
 * quest gave one who owns none (server/src/shop.js SHIELD_KEY; spec
 * docs/specs/shop-shield.md).  On an upright phone in the world (BroTown):
 *
 *   A. a character on file with every quest handed in (the Test panel's
 *      "Finish all quests": tut_1 done, its shield never paid) and no shield,
 *      150 coins: Diego's shelf shows the Pine Shield at 100; the buy takes
 *      exactly 100 and the shield is in the bag (the phone's copy AND the
 *      worker's record, one piece, one id); the row is gone after;
 *   B. a second character WITH a shield (the kit's Pine Shield) sees no row;
 *   C. no page errors.
 *
 * Diego is reached with H.approachNpc (talking is a tap only). */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

export const lane = 'full';

const KEY = 'pine_shield';
const PHONE = { width: 390, height: 844 };
const OUT = join(H.REPO, 'tools/qa/mp/out');
const shot = async (P, name) => { try { mkdirSync(OUT, { recursive: true }); await P.page.screenshot({ path: join(OUT, `shieldshop-${name}.png`) }); } catch (e) { /* a picture only */ } };

const purse = (P) => H.readState(P, (S) => (S.rpg || {}).coins || 0);
const shields = (P) => H.readState(P, (S) => {
  const R = S.rpg || {};
  return { worn: R.shield ? { name: R.shield.name, gid: R.shield.gid || null } : null,
    bag: (Array.isArray(R.shieldStash) ? R.shieldStash : []).map((p) => p && { name: p.name, gid: p.gid || null }) };
});
/* his shelf's shield row, where it is, and the price under it */
const row = (P) => P.page.evaluate((k) => {
  const el = document.querySelector(`[data-shop-bro="${k}"]`);
  if (!el) return { found: false };
  const r = el.getBoundingClientRect();
  const price = el.parentElement ? el.parentElement.textContent.replace(/\s+/g, ' ').trim() : '';
  return { found: true, x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), w: Math.round(r.width), price, title: el.getAttribute('title') };
}, KEY);
const deal = (P) => P.page.evaluate(() => {
  const act = document.querySelector('[data-shop-act]');
  const d = document.querySelector('[data-shop-deal]');
  const r = act ? act.getBoundingClientRect() : null;
  return { dealKey: d ? d.getAttribute('data-shop-deal') : null, total: act ? act.getAttribute('data-shop-total') : null,
    label: act ? act.textContent.replace(/\s+/g, ' ').trim() : null, disabled: act ? act.disabled : null,
    x: r ? Math.round(r.left + r.width / 2) : 0, y: r ? Math.round(r.top + r.height / 2) : 0 };
});
const openShop = async (P) => {
  await H.approachNpc(P, 'shopkeeper_bro');
  return H.waitFor(P, () => !!document.querySelector('[data-shop-panel]'), (v) => v === true,
    { timeout: 12000, label: 'shop open' }).then(() => true).catch(() => false);
};
/* the list arrives after the panel opens: wait for his shelf to hold the tools */
const shelfReady = (P) => H.waitFor(P, () => !!document.querySelector('[data-shop-bro="woodcutting_axe"]'), (v) => v === true,
  { timeout: 12000, label: 'his shelf' }).then(() => true).catch(() => false);
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

export async function run({ browser, wsPort, webPort, rec }) {
  const errors = [];
  const watch = (P) => P.page.on('pageerror', (e) => errors.push(String((e && e.message) || e).slice(0, 200)));

  /* ── A. the character who lost theirs ── */
  const A = await H.newPlayer(browser, { name: 'Shieldless', wsPort, webPort, viewport: PHONE, touch: true, dpr: 1, world: 'wheel' });
  watch(A);
  await H.enterWorld(A);
  const stopA = H.keepAlive(A);
  try {
    const aId = await H.readState(A, (S) => S.myId);
    /* on file: every quest handed in, no reward paid (so tut_1 done, no shield), and 150 coins */
    const fin = await H.devOp(wsPort, 'quests', aId, {});
    const c0 = await purse(A);
    if (c0 < 150) await H.grant(wsPort, aId, 'gold', { amount: 150 - c0 });
    await A.page.waitForTimeout(1500);
    const s0 = await shields(A);
    const caps = await H.readState(A, (S) => !!(S._serverCaps && S._serverCaps.shieldshop));
    rec.ok('A0 on file: tut_1 handed in, no shield worn or carried, 150 coins, a worker that says shieldshop (guard)',
      !!fin && fin.ok && !s0.worn && s0.bag.length === 0 && (await purse(A)) === 150 && caps, { fin: fin && fin.ok, s0, coins: await purse(A), caps });

    const opened = await openShop(A);
    rec.ok('A1 a tap on Diego opens his shop', opened && (await shelfReady(A)));
    await A.page.waitForTimeout(800);
    const r1 = await row(A);
    await shot(A, 'A1-shelf');
    rec.ok('A2 his shelf shows the Pine Shield, at 100', r1.found && r1.w > 0 && /100/.test(r1.price) && /Pine Shield/.test(r1.title || ''), r1);

    if (r1.found) await A.page.touchscreen.tap(r1.x, r1.y);
    let d = await deal(A);
    for (let t = 0; t < 40 && !(d.dealKey === KEY && +d.total === 100 && d.disabled === false); t++) { await A.page.waitForTimeout(150); d = await deal(A); }
    rec.ok('A3 a tap on it puts it in the deal: BUY, 100', d.dealKey === KEY && +d.total === 100 && d.disabled === false && /BUY/i.test(d.label || ''), d);
    if (d.dealKey === KEY && d.disabled === false) await A.page.touchscreen.tap(d.x, d.y);
    let c1 = 150, s1 = s0;
    for (let t = 0; t < 50 && !(c1 < 150 && s1.bag.length > 0); t++) { await A.page.waitForTimeout(200); c1 = await purse(A); s1 = await shields(A); }
    const sv = await H.adminPlayer(wsPort, aId);
    const svBag = ((sv && sv.rpg) || {}).shieldStash || [];
    rec.ok('A4 the buy takes exactly 100 and ONE Pine Shield is in the bag, the same piece the worker holds',
      c1 === 50 && !s1.worn && s1.bag.length === 1 && s1.bag[0].name === 'Pine Shield' && !!s1.bag[0].gid
        && svBag.length === 1 && svBag[0].gid === s1.bag[0].gid && ((sv.rpg || {}).coins) === 50,
      { c1, s1, svBag: svBag.map((p) => p && { name: p.name, gid: p.gid }), svCoins: (sv.rpg || {}).coins });
    await A.page.waitForTimeout(1200);
    const r2 = await row(A);
    await shot(A, 'A4-bought');
    rec.ok('A5 the row is gone after (a replacement, never a second)', !r2.found, r2);
    await closeShop(A);

    /* A6. Gear's bag side holds it, and one tap of Equip puts it on the arm
       (the orchestrator's ask, 11-26: the bought piece can be worn) */
    const gid = s1.bag[0] && s1.bag[0].gid;
    await H.dashOpen(A, 'dashboard');
    await A.page.waitForTimeout(900);
    const TILE = '[data-gear-bag] [data-bag-key^="stashShield-"]';
    let tileAt = null;
    for (let t = 0; t < 40 && !tileAt; t++) {
      tileAt = await A.page.evaluate((q) => {
        const e = document.querySelector(q); if (!e) return null;
        e.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        const r = e.getBoundingClientRect(); return r.width && r.height ? { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) } : null;
      }, TILE);
      if (!tileAt) await A.page.waitForTimeout(250);
    }
    await shot(A, 'A6-gear');
    rec.ok('A6 Gear\'s bag side shows the shield', !!tileAt, { tileAt });
    if (tileAt) await A.page.touchscreen.tap(tileAt.x, tileAt.y);
    let eqAt = null;
    for (let t = 0; t < 40 && !eqAt; t++) {
      eqAt = await A.page.evaluate(() => {
        const e = document.querySelector('[data-gear-summary] [data-gear-act="equip"]'); if (!e || e.disabled) return null;
        const r = e.getBoundingClientRect(); return r.width && r.height ? { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) } : null;
      });
      if (!eqAt) await A.page.waitForTimeout(250);
    }
    if (eqAt) await A.page.touchscreen.tap(eqAt.x, eqAt.y);
    let s2 = await shields(A);
    for (let t = 0; t < 40 && !(s2.worn && s2.worn.gid === gid); t++) { await A.page.waitForTimeout(250); s2 = await shields(A); }
    let svWorn = null;
    for (let t = 0; t < 30; t++) {
      const sv2 = await H.adminPlayer(wsPort, aId);
      svWorn = ((sv2 && sv2.rpg) || {}).shield || null;
      if (svWorn && svWorn.gid === gid) break;
      await A.page.waitForTimeout(300);
    }
    await shot(A, 'A6-worn');
    rec.ok('A7 ...and one tap of Equip wears it: on the arm, the bag empty, the worker told (the same id)',
      !!eqAt && !!s2.worn && s2.worn.gid === gid && s2.bag.length === 0 && !!svWorn && svWorn.gid === gid,
      { eqAt, s2, svWorn: svWorn && { name: svWorn.name, gid: svWorn.gid } });
  } finally {
    try { stopA(); } catch (e) { /* gone */ }
    await A.ctx.close().catch(() => {});
  }

  /* ── B. a character who has one ── */
  const B = await H.newPlayer(browser, { name: 'Shielded', wsPort, webPort, viewport: PHONE, touch: true, dpr: 1, world: 'wheel' });
  watch(B);
  await H.enterWorld(B);
  const stopB = H.keepAlive(B);
  try {
    const bId = await H.readState(B, (S) => S.myId);
    await H.devOp(wsPort, 'quests', bId, {});
    const kit = await H.devOp(wsPort, 'kit', bId, { what: 'shield' });
    let sb = await shields(B);
    for (let t = 0; t < 30 && !(sb.worn || sb.bag.length); t++) { await B.page.waitForTimeout(200); sb = await shields(B); }
    rec.ok('B0 the second character holds a Pine Shield (guard)', !!(sb.worn || sb.bag.length), { kit, sb });
    const opened = await openShop(B);
    rec.ok('B1 a tap on Diego opens his shop', opened && (await shelfReady(B)));
    await B.page.waitForTimeout(800);
    const rb = await row(B);
    await shot(B, 'B1-shelf');
    rec.ok('B2 a character WITH a shield sees no shield on his shelf', !rb.found, rb);
    await closeShop(B);
  } finally {
    try { stopB(); } catch (e) { /* gone */ }
    await B.ctx.close().catch(() => {});
  }

  rec.ok('C no page errors', errors.length === 0, errors.slice(0, 3));
}
