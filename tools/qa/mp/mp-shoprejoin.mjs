/* DIEGO'S SHOP AFTER AN IDLE LOGOUT (v2.3.3582).
 *
 * Found moving mp-shopkeeper to the world (v2.3.3580): its watcher, idle over
 * two minutes while the world loaded, was logged out with the shop open, and
 * the tap that brought it back was a tap ON the shop.  That one tap is two
 * things at once -- "I'm back" (wsClient _armComeBack: any touch reconnects)
 * and the shop's own tap -- so the shop's message went to a socket still
 * opening or joining, and was lost:
 *   - the phone drops a send on a socket that is not open (channelShim.send),
 *   - the worker drops anything but `join` from one that has not joined
 *     (index.js `!session.id`),
 * and nothing asked again.  A tap on an item left its price "…" until the
 * next tap; a tap on SELL left the button dead (shopBus.busy, waiting on an
 * answer that could never come) until the shop was closed.
 *
 * The fix (shopBus.rejoined, called by wsClient when a join lands): an open
 * shop asks again for its list and price and lets go of its wait.  A trade is
 * never sent again by itself -- the tap that only brought you back sells
 * nothing, and the next tap does.
 *
 *   1. A REAL TAP ON SELL ends the logout: back in, nothing sold, and SELL is
 *      live again with a fresh price; the next tap sells.  (Main: the button
 *      stays dead.)
 *   2. AN ITEM CHOSEN WHILE LOGGED OUT, then a key brings you back: its price
 *      arrives.  The selection is made by the bag tile's own pointerup, which
 *      is no "I'm back" event, so the ask is sent with no socket at all --
 *      certain, where a real tap's ask races the join.  (Main: never.)
 *   3. A REAL TAP ON THE ITEM ends the logout: its price arrives.  (Main: only
 *      when the join beats the price's 140 ms debounce -- a race, which is
 *      why 1 and 2 are the ones that prove the fix.)
 */
import * as H from './harness.mjs';

/* What it sells him: a key NO other shop scenario trades.  One run shares one
   worker, and Diego's pile is per key and kept -- with slime remains, this
   scenario run before mp-shopkeeper left his pile at 1, and that one's
   "he holds none of it yet" checks failed for a sale made here. */
const KEY = 'ore_obsidian_ore';

/* Everything the shop and the connection are saying, in one read. */
const view = (P) => P.page.evaluate((k) => {
  const q = (s) => document.querySelector(s);
  const S = window._gameState && window._gameState.current;
  const bus = window.__broShopBus;
  const act = q('[data-shop-act]');
  const deal = q('[data-shop-deal]');
  return {
    status: S ? S._realtimeStatus : null,
    banner: !!document.getElementById('bt-resume-banner'),
    panel: !!q('[data-shop-panel]'),
    dealKey: deal ? deal.getAttribute('data-shop-deal') : null,
    total: act ? act.getAttribute('data-shop-total') : null,
    label: act ? act.textContent.replace(/\s+/g, ' ').trim() : null,
    disabled: act ? act.disabled : null,
    busy: bus ? !!bus.busy : null,
    joins: bus && typeof bus.joins === 'number' ? bus.joins : null,
    coins: (S && S.rpg && S.rpg.coins) || 0,
    bag: (S && S.rpg && S.rpg.inventory && S.rpg.inventory[k]) || 0,
    bagQuote: (() => {
      const t = q(`[data-inv-key="${k}"]`);
      const b = t && t.querySelector('[data-shop-quote]');
      return b ? b.textContent.replace(/\s+/g, '') : null;
    })(),
  };
}, KEY);

/* view(), polled until it says what we wait for -- every number in this
   window is a round trip.  Tagged on a timeout, so the failure says which. */
const until = async (P, pred, label, ms = 10000) => {
  const end = Date.now() + ms;
  for (;;) {
    const v = await view(P);
    if (pred(v)) return v;
    if (Date.now() > end) return Object.assign(v, { _timedOut: label });
    await P.page.waitForTimeout(150);
  }
};

const live = (v) => v.dealKey === KEY && +v.total > 0 && v.disabled === false;

/* The page's own idle logout (wsClient channelShim.idleLogout): the very
   path two idle minutes take, without the two minutes. */
const logOut = async (P, rec, tag) => {
  await P.page.evaluate(() => window._gameState.current.channel.idleLogout());
  const v = await until(P, (x) => x.status === 'idle' && x.banner, `${tag}: logged out`, 5000);
  rec.ok(`${tag}: the page logs out as it does after two idle minutes, banner up`,
    v.status === 'idle' && v.banner, v);
  return v;
};

const tapBagTile = (P) => P.page.evaluate((k) => document.querySelector(`[data-inv-key="${k}"]`)
  .dispatchEvent(new PointerEvent('pointerup', { bubbles: true })), KEY);

/* Closed and opened again before each step, as a player would, so what one
   step leaves behind (on the game before the fix, step 1's dead button)
   never decides the next one. */
const reopen = async (P) => {
  await P.page.evaluate(() => { window.__broShopBus.setOpen(false); window.__broShopBus.setOpen(true); });
  return until(P, (x) => x.panel && !x.busy && x.bagQuote, 'the shop open again');
};

export async function run({ browser, wsPort, webPort, rec }) {
  const A = await H.newPlayer(browser, { name: 'Comeback', wsPort, webPort, world: 'wheel',
    viewport: { width: 390, height: 844 }, touch: true });
  await H.enterWorld(A);
  /* kept in while the world loads; stopped before the first logout, as its
     keystroke is itself an "I'm back" */
  const stopAlive = H.keepAlive(A);
  await A.page.waitForTimeout(2000);

  const aId = await H.readState(A, (S) => S.myId);
  await H.grant(wsPort, aId, 'item', { invKey: KEY, count: 20 });
  await A.page.waitForTimeout(1200);
  await H.unfoldBand(A);
  await A.page.evaluate(() => window.__broShopBus.setOpen(true));
  let v = await until(A, (x) => x.panel && x.bag > 0 && x.bagQuote, 'shop open, bag priced');
  rec.ok('Diego\'s shop is open, the bag carrying something he buys, priced',
    v.panel && v.bag > 0 && !!v.bagQuote, v);
  await tapBagTile(A);
  v = await until(A, live, 'a SELL price before the logout');
  rec.ok('choosing the stack puts a live SELL price on the button', live(v), v);
  stopAlive();
  await A.page.waitForTimeout(400);

  /* ══ 1. A REAL TAP ON SELL ENDS THE LOGOUT ══ */
  const before1 = await view(A);
  await logOut(A, rec, '1');
  await A.page.tap('[data-shop-act]');
  v = await until(A, (x) => x.status === 'connected' && !x.banner, '1: back in');
  rec.ok('1: the tap on SELL brings the player back', v.status === 'connected' && !v.banner, v);
  await A.page.waitForTimeout(1500);
  v = await view(A);
  rec.ok('1: ...and sells NOTHING by itself: the trade was never sent, and is never sent again',
    v.coins === before1.coins && v.bag === before1.bag,
    { before: { coins: before1.coins, bag: before1.bag }, after: { coins: v.coins, bag: v.bag } });
  v = await until(A, live, '1: SELL live again');
  rec.ok('1: ...and SELL is live again with a fresh price, not stuck waiting',
    live(v) && !v.busy, v);
  if (live(v)) {
    const total1 = +v.total;
    await A.page.tap('[data-shop-act]');
    v = await until(A, (x) => x.coins > before1.coins, '1: the next tap sells');
    rec.ok(`1: ...and the next tap sells (+${v.coins - before1.coins} gold, quoted ${total1})`,
      v.coins === before1.coins + total1 && v.bag === before1.bag - 1,
      { before: before1.coins, after: v.coins, total1, bag: v.bag });
  } else {
    rec.ok('1: ...and the next tap sells', false, 'SELL never came back to life, so there was no next tap');
  }

  /* ══ 2. AN ITEM CHOSEN WHILE LOGGED OUT ══ */
  await A.page.waitForTimeout(600);
  v = await reopen(A);
  rec.ok('2: the shop is open again, nothing chosen and nothing waiting', v.panel && !v.busy && !v.dealKey, v);
  await logOut(A, rec, '2');
  await tapBagTile(A);
  await A.page.waitForTimeout(1500);
  v = await view(A);
  rec.ok('2: chosen while logged out, its price cannot come (the ask had no socket)',
    v.dealKey === KEY && v.total === '' && v.status === 'idle', v);
  const joins2 = v.joins;
  await A.page.keyboard.press('Control');
  v = await until(A, (x) => x.status === 'connected' && !x.banner, '2: back in');
  rec.ok('2: a key brings the player back', v.status === 'connected', v);
  v = await until(A, live, '2: the price after the rejoin');
  rec.ok('2: ...and the shop asks again: the price arrives and SELL is live',
    live(v), Object.assign({ joinsBefore: joins2 }, v));

  /* ══ 3. A REAL TAP ON THE ITEM ENDS THE LOGOUT ══ */
  await A.page.waitForTimeout(600);
  v = await reopen(A);
  rec.ok('3: the shop is open again, nothing chosen and nothing waiting', v.panel && !v.busy && !v.dealKey, v);
  await logOut(A, rec, '3');
  await A.page.tap(`[data-inv-key="${KEY}"]`);
  v = await until(A, (x) => x.status === 'connected' && !x.banner, '3: back in');
  rec.ok('3: the tap on the item brings the player back', v.status === 'connected', v);
  v = await until(A, live, '3: the price after the tap');
  rec.ok('3: ...and the item it chose has its price, SELL live', live(v), v);

  await A.ctx.close();
}
