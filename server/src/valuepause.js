/* ═══ v2.3.5090: A VALUE ROAD FAILS CLOSED WHILE SAVES ARE REFUSED (grand plan step 4.5, card E PR 9) ═══
 *
 * When the storage refuses a save, what the room holds in memory is no longer
 * what is written: a restart then puts back the last save.  A trade made in
 * that window could be half written -- one side's purse saved, the other's
 * not -- and so made twice.  So for ONE MINUTE after the storage refuses a
 * save, every action that HANDS gold or items to another player or into a
 * held place refuses at its start, and says so in the owner's words:
 *
 *     "Saving is paused for a moment, try again."
 *
 * Everything that PAYS OUT keeps working: rewards, loot, a vault's
 * withdrawal, mail landing, refunds of what is held, shops and crafting.  At
 * worst a payout made in the window is lost to a restart, never doubled.
 * (The owner's own "Go recommended", 2026-11-14, option 1, through the
 * planning session; read in its transcript.)
 *
 * THE COUNT IS CARD A'S, never a second one: roomrow.js counts every put the
 * storage refuses (its wrapper on the room's storage, `_roomRowRefused('put')`)
 * and `_savesRefused()` reads it.  The pause starts when that count moves
 * (its `lastAt`, the last refusal's time) and lasts PAUSE.MS.  A character a
 * newer worker saved (`newer`, refused at the join) is that player's own
 * refusal, not the storage's: it does not pause the room.
 *
 * THE ONE TABLE: VALUE_PAUSE below, an action a row, each the `move` or
 * `escrow` roads it starts with a TAKE (gold.js GOLD_ROADS, bag.js
 * BAG_ROADS) and where its line is (`at`: the handler that refuses through
 * its own refusal message, with `PAUSE.CODE` or the words).  PAUSE_EXEMPT
 * names every other `move` or `escrow` road and why it never pauses.
 * valuepause.test fails a `move` or `escrow` road on neither list, and a
 * row whose handler has lost its line.
 *
 * THE KILL SWITCH `valuepause: false` in the live flags: nothing pauses
 * (the old way: every action runs whatever the storage says).
 */

export const PAUSE = Object.freeze({
  MS: 60 * 1000,
  WORDS: 'Saving is paused for a moment, try again.',
  /* the code a handler that answers with a code sends (the phone maps it to WORDS) */
  CODE: 'paused',
});

const R = (roads, at) => Object.freeze({ roads: Object.freeze(roads), at });
/** The actions that start with a take on a `move` or `escrow` road, and the
 *  handler whose first lines refuse them while paused. */
export const VALUE_PAUSE = Object.freeze({
  trade2_confirm: R(['trade_window'], 'trade2.js _handleTrade2Confirm'),
  trade_accept: R(['gift_trade'], 'trade.js _interceptTrade'),
  bank_deposit: R(['bank_deposit'], 'bank.js _handleBankMove'),
  'http:/api/arena/join': R(['arena_entry'], 'gladiator.js _arenaJoin'),
  arena_sponsor: R(['escrow_debit_group'], 'gladiator.js _handleArenaSponsor'),
  jackpot_deposit: R(['jackpot_ticket'], 'cadence.js _handleJackpotDeposit'),
  'http:/api/market/place': R(['market_order', 'escrow_item'], 'market.js _mktPlaceOrder'),
  'http:/api/store/list': R(['ah_listing', 'escrow_item', 'escrow_item_stored'], 'store.js _stCreateListing'),
  'http:/api/store/buy': R(['escrow_debit', 'escrow_debit_stored'], 'store.js _stBuyNow'),
  'http:/api/store/bid': R(['escrow_debit', 'escrow_debit_stored'], 'store.js _stPlaceBid'),
  store_offer: R(['ah_offer'], 'storeoffer.js _stOfferPlace'),
  duel_accept: R(['escrow_debit_group'], 'duel.js _interceptDuel'),
  item_drop: R(['item_drop'], 'itemdrop.js _handleItemDrop'),
});

/** Every other `move` or `escrow` road, and why it never pauses. */
export const PAUSE_EXEMPT = Object.freeze({
  /* payouts: they pay OUT of what is held (the owner: "everything that pays out keeps working") */
  bank_withdraw: 'a payout: the vault to the purse',
  mail_gold: 'a payout: the mail landing',
  mail_item: 'a payout: the mail landing',
  market_unwind: 'a payout: a General Store order handed back',
  ah_offer_back: 'a payout: an offer handed back',
  shop_pile: 'a payout: bought out of Diego\'s pile (shops keep working)',
  loot_death_items: 'a payout: a pile on the ground taken',
  /* not a player's action */
  nml_loss: 'a kill in No man\'s land: a death, not an action',
  /* the owner: "shops keep working" */
  shop_sell: 'a shop: sold into Diego\'s pile (the owner: shops keep working)',
  /* shut on the live game */
  threat_levy: 'shut: the threat levy runs only with OPEN_PVP (false); valuepause.test fails the day it opens',
});

/** `valuepause: false` in the live flags. */
export function pauseOff(room) {
  const f = room && room._liveFlags;
  return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'valuepause') && !f.valuepause);
}

/** True for PAUSE.MS after the storage refused a save (card A's count, read,
 *  never counted again).  Synchronous, never throws: a handler's first line. */
export function valuePaused(room, now) {
  try {
    if (!room || pauseOff(room) || typeof room._savesRefused !== 'function') return false;
    const r = room._savesRefused();
    const put = Number(r && r.put) || 0;
    const m = room._valuePause || (room._valuePause = { put: 0, at: 0 });
    const t = typeof now === 'number' ? now : Date.now();
    /* the count moved since this last looked: a refused put, at (or before) the last refusal's time */
    if (put > m.put) { m.put = put; m.at = Number(r.lastAt) || t; }
    return m.at > 0 && t >= m.at && t - m.at < PAUSE.MS;
  } catch (e) { return false; }   /* a broken read never stops the game */
}

/** The HTTP routes' answer, their own shape ({ok:false, settled:true, error}). */
export function pauseHttpBody() {
  return { ok: false, settled: true, error: PAUSE.WORDS, reason: PAUSE.CODE };
}
