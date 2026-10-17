/* ═══ A LOST TOOL, BOUGHT BACK FROM DIEGO (v2.3.3301) ═══
 *
 * A death in No man's land takes the whole bag now, the axe, the rod and the
 * pickaxe with it (server/src/nomansland.js).  Asked whether they should
 * drop, the owner chose "Drop them, sell replacements": "the General Store
 * sells a replacement to anyone who already earned that tool from the
 * quest".  Diego keeps the General Store's counter (server/src/shop.js
 * TOOL_SHELF).
 *
 * Two real players against a real worker, on 390 px touch phones (every tap
 * a real touch):
 *   1. his drawer shows the three tools on his shelf, each its picture and
 *      its price under it;
 *   2. the player the quest gave all three (life_1 turned in), carrying none:
 *      a tap on the axe says it is a replacement, one at a time (no
 *      stepper), "BUY 100g"; a tap on BUY puts one axe in the bag, takes the
 *      gold off the purse, and says so;
 *   3. a tap on the axe again: "You have one", the button off;
 *   4. the pickaxe too;
 *   5. a second player no quest gave one: "Mayor Bro's quest gives the
 *      first", the button off -- and a buy sent anyway is refused by the
 *      worker, nothing moving;
 *   6. no page errors.
 * Pictures: tools/qa/mp/out/toolshelf-*.png.
 */
import * as H from './harness.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PHONE = { width: 390, height: 844 };
const openShop = (P) => P.page.evaluate(() => window.__broShopBus.setOpen(true));

/* the drawer as the page draws it */
const view = (P) => P.page.evaluate(() => {
  const q = (s) => document.querySelector(s);
  const slot = (k) => {
    const b = q(`[data-shop-bro="${k}"]`);
    if (!b) return null;
    const img = b.querySelector('img');
    const price = b.parentElement ? (b.parentElement.lastElementChild || {}).textContent : null;
    return { img: !!img && img.complete && img.naturalWidth > 0, price: (price || '').trim() };
  };
  const act = q('[data-shop-act]');
  const tool = q('[data-shop-tool]');
  const R = (window._gameState.current.rpg) || {};
  return {
    panel: !!q('[data-shop-panel]'),
    axe: slot('woodcutting_axe'), rod: slot('fishing_pole'), pick: slot('mining_pickaxe'),
    deal: q('[data-shop-deal]') ? q('[data-shop-deal]').getAttribute('data-shop-deal') : null,
    tool: tool ? { why: tool.getAttribute('data-shop-tool'), text: tool.textContent.trim() } : null,
    act: act ? { text: act.textContent.trim(), disabled: act.disabled, total: act.getAttribute('data-shop-total') } : null,
    stepper: !!q('[data-shop-plus]'),
    note: (q('[data-shop-note]') || {}).textContent || null,
    coins: R.coins || 0,
    inv: Object.fromEntries(Object.entries(R.inventory || {}).filter(([, n]) => n > 0)),
  };
});
const until = async (P, pred, ms = 8000) => {
  const t0 = Date.now();
  let v = null;
  while (Date.now() - t0 < ms) {
    v = await view(P);
    if (pred(v)) return v;
    await P.page.waitForTimeout(150);
  }
  return v;
};
async function tapSel(P, sel) {
  const at = await P.page.evaluate((s) => {
    const b = document.querySelector(s);
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, sel);
  if (!at) return false;
  await P.page.touchscreen.tap(at.x, at.y);
  await P.page.waitForTimeout(300);
  return true;
}

export async function run({ browser, wsPort, webPort, rec }) {
  const OUT = join(H.REPO, 'tools/qa/mp/out');
  mkdirSync(OUT, { recursive: true });
  const shot = (P, name) => P.page.screenshot({ path: join(OUT, `toolshelf-${name}.png`) }).catch(() => {});
  const A = await H.newPlayer(browser, { name: 'Miner', wsPort, webPort, viewport: PHONE, touch: true });
  const B = await H.newPlayer(browser, { name: 'Newbie', wsPort, webPort, viewport: PHONE, touch: true, guest: true });
  await H.enterWorld(A);
  await H.enterWorld(B);
  await A.page.waitForTimeout(2500);
  const idA = await H.readState(A, (S) => S.myId);
  /* the quest that gives the tools turned in (the dev op pays no rewards, so
     the bag holds none -- as after a death in No man's land), and gold */
  await H.devOp(wsPort, 'quests', idA);
  await H.grant(wsPort, idA, 'gold', { amount: 1000 });
  await A.page.waitForTimeout(1500);
  const R0 = await H.readState(A, (S) => ({ coins: (S.rpg || {}).coins || 0, inv: Object.keys((S.rpg || {}).inventory || {}) }));
  rec.ok(`setup: the miner's quests are done, ${R0.coins} gold, and no tool in the bag`,
    R0.coins >= 1000 && !R0.inv.some((k) => /axe|pole|pickaxe/.test(k)), R0);

  /* ── 1. his shelf ── */
  await openShop(A);
  const v1 = await until(A, (v) => v.panel && !!v.axe && !!v.rod && !!v.pick && v.axe.img && v.rod.img && v.pick.img);
  await shot(A, '1-shelf');
  rec.ok(`1. Diego's shelf shows the axe, the rod and the pickaxe, each its picture and its price (${v1 && v1.axe && v1.axe.price}, ${v1 && v1.rod && v1.rod.price}, ${v1 && v1.pick && v1.pick.price})`,
    !!v1 && !!v1.axe && v1.axe.img && v1.axe.price === '100g' && !!v1.rod && v1.rod.img && v1.rod.price === '100g' && !!v1.pick && v1.pick.img && v1.pick.price === '100g', v1);

  /* ── 2. the axe, bought back ── */
  await tapSel(A, '[data-shop-bro="woodcutting_axe"]');
  const v2 = await until(A, (v) => v.deal === 'woodcutting_axe' && !!v.act && v.act.total === '100');
  await shot(A, '2-axe');
  rec.ok(`2. a tap on the axe: "${v2 && v2.tool && v2.tool.text}", one at a time (no stepper), "${v2 && v2.act && v2.act.text}"`,
    !!v2 && !!v2.tool && v2.tool.why === 'ok' && !v2.stepper && !!v2.act && !v2.act.disabled && v2.act.text === 'BUY 100g', v2);
  await tapSel(A, '[data-shop-act]');
  const v2b = await until(A, (v) => (v.inv.woodcutting_axe || 0) === 1 && v.coins === R0.coins - 100 && /Bought 1/.test(v.note || ''));
  rec.ok(`2. ...BUY: one axe in the bag, ${R0.coins} -> ${v2b && v2b.coins} gold, and he says "${v2b && v2b.note}"`,
    !!v2b && v2b.inv.woodcutting_axe === 1 && v2b.coins === R0.coins - 100 && /Bought 1 for 100/.test(v2b.note || ''), v2b);
  const srv2 = (await H.adminPlayer(wsPort, idA).catch(() => ({}))).rpg || {};
  rec.ok('2. ...and the worker holds the same (its saved bag and purse)', (srv2.inventory || {}).woodcutting_axe === 1 && srv2.coins === R0.coins - 100,
    { inv: srv2.inventory, coins: srv2.coins });

  /* ── 3. not a second one ── */
  await tapSel(A, '[data-shop-bro="fishing_pole"]');
  await A.page.waitForTimeout(400);
  await tapSel(A, '[data-shop-bro="woodcutting_axe"]');
  const v3 = await until(A, (v) => v.deal === 'woodcutting_axe' && !!v.tool && v.tool.why === 'have');
  await shot(A, '3-have');
  rec.ok(`3. the axe again: "${v3 && v3.tool && v3.tool.text}", the button "${v3 && v3.act && v3.act.text}" and off`,
    !!v3 && !!v3.tool && v3.tool.why === 'have' && !!v3.act && v3.act.disabled && v3.act.text === 'You have one', v3);

  /* ── 4. the pickaxe ── */
  await tapSel(A, '[data-shop-bro="mining_pickaxe"]');
  await until(A, (v) => v.deal === 'mining_pickaxe' && !!v.act && v.act.total === '100');
  await tapSel(A, '[data-shop-act]');
  const v4 = await until(A, (v) => (v.inv.mining_pickaxe || 0) === 1);
  rec.ok(`4. the pickaxe the same (${v4 && v4.coins} gold left)`, !!v4 && v4.inv.mining_pickaxe === 1 && v4.coins === R0.coins - 200, v4);

  /* ── 5. no quest, no tool ── */
  const idB = await H.readState(B, (S) => S.myId);
  await openShop(B);
  await until(B, (v) => v.panel && !!v.rod);
  await tapSel(B, '[data-shop-bro="fishing_pole"]');
  const v5 = await until(B, (v) => v.deal === 'fishing_pole' && !!v.tool && v.tool.why === 'quest');
  await shot(B, '5-quest');
  rec.ok(`5. a player no quest gave one: "${v5 && v5.tool && v5.tool.text}", the button "${v5 && v5.act && v5.act.text}" and off`,
    !!v5 && !!v5.tool && v5.tool.why === 'quest' && !!v5.act && v5.act.disabled && v5.act.text === 'Not yet', v5);
  const c5 = await H.readState(B, (S) => (S.rpg || {}).coins || 0);
  await B.page.evaluate(() => { const S = window._gameState.current; S.channel.send({ type: 'shop_buy', payload: { key: 'fishing_pole', qty: 1 } }); });
  const v5b = await until(B, (v) => /quest/i.test(v.note || ''), 5000);
  rec.ok(`5. ...a buy sent anyway is refused by the worker ("${v5b && v5b.note}"), nothing moving`,
    !!v5b && /Mayor Bro's quest/.test(v5b.note || '') && !v5b.inv.fishing_pole && v5b.coins === c5, { v5b, c5, idB });

  const errs = [...A.logs, ...B.logs].filter((l) => /pageerror/.test(l));
  rec.ok(`6. no page errors (${errs.length})`, errs.length === 0, errs.slice(0, 5));
  await A.ctx.close().catch(() => {});
  await B.ctx.close().catch(() => {});
}
