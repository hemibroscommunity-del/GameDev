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
 * BAG_ROADS) and where its line is (`at`).  PAUSE_EXEMPT names every other
 * `move` or `escrow` road and why it never pauses.  valuepause.test fails a
 * `move` or `escrow` road on neither list, and a row whose line is gone.
 *
 * THE LINES (the planning session's yes, kind 1, 2026-11-14):
 *   - the socket actions and the two relays: ONE line in index.js
 *     `_onMessage`, before its switch, beside the fight lock's
 *     (`_valuePauseGate`; a Set lookup a message is all the hot path pays).
 *     Each is answered by PAUSE_REFUSE below, through that system's OWN
 *     refusal message (the trade window's reason, `trade_reject`,
 *     `bank_state`'s last move, `arena_stake_error`, `jackpot_state`,
 *     `store_offer_error`, `duel_decline`, `item_drop_result`), and goes no
 *     further: what it would have moved stays where it is, an offer or a
 *     challenge stays open to be taken after the minute;
 *   - the HTTP routes (the arena's /join, the General Store's /place, the
 *     Auction House's /list, /buy and /bid): one line at the top of each,
 *     after its sign-in check, answering in the route's own shape
 *     ({ok:false, settled:true, error}).
 * The phone shows the words for the code `paused` (gameEvents.js, game/
 * bank.js, game/itemDrop.js; valuepause.test holds each to PAUSE.WORDS);
 * an older phone shows its own refusal, so neither side ships first.
 * Synchronous on purpose: nothing here awaits, so a bundle's parts still
 * finish in order (TRAPS §182); the vault's answer reads the vault after.
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
const ROUTER = 'index.js _onMessage';
/** The actions that start with a take on a `move` or `escrow` road, and the
 *  function whose line refuses them while paused (a socket action: the
 *  router, answered by PAUSE_REFUSE; an HTTP route: its own fetch). */
export const VALUE_PAUSE = Object.freeze({
  trade2_confirm: R(['trade_window'], ROUTER),
  trade_accept: R(['gift_trade'], ROUTER),
  bank_deposit: R(['bank_deposit'], ROUTER),
  'http:/api/arena/join': R(['arena_entry'], 'gladiator.js _arenaFetch'),
  arena_sponsor: R(['escrow_debit_group'], ROUTER),
  jackpot_deposit: R(['jackpot_ticket'], ROUTER),
  'http:/api/market/place': R(['market_order', 'escrow_item'], 'market.js _marketFetch'),
  'http:/api/store/list': R(['ah_listing', 'escrow_item', 'escrow_item_stored'], 'store.js _storeFetch'),
  'http:/api/store/buy': R(['escrow_debit', 'escrow_debit_stored'], 'store.js _storeFetch'),
  'http:/api/store/bid': R(['escrow_debit', 'escrow_debit_stored'], 'store.js _storeFetch'),
  store_offer: R(['ah_offer'], ROUTER),
  duel_accept: R(['escrow_debit_group'], ROUTER),
  item_drop: R(['item_drop'], ROUTER),
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

const own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
/* an id the handlers would take (64, their own bound: trade.js, duel.js) */
const id64 = (v) => (typeof v === 'string' && v.length > 0 && v.length <= 64 ? v : null);

/** Each socket row's refusal, through its system's OWN message.  `p` is the
 *  message's payload (or the message, for the types that carry none). */
export const PAUSE_REFUSE = Object.freeze({
  /* the window stays open, as the fight's refusal leaves it (trade2.js) */
  trade2_confirm: (room, pid) => {
    const s = room._t2SessionFor(pid);
    if (s) room._t2Broadcast(s, { reason: PAUSE.CODE });
  },
  /* the accepter alone, as trade.js's rejectAccepter; the offer is kept */
  trade_accept: (room, pid, p) => {
    const t = id64(p.target);
    room.eventBuffer.push({ type: 'trade_reject', from: t, payload: { from: t, target: pid, reason: PAUSE.CODE } });
  },
  /* the vault's own answer, its last move refused (bank.js _bankSend) */
  bank_deposit: (room, pid, p) => {
    const kind = p.kind === 'gold' ? 'gold' : p.kind === 'item' ? 'item' : null;
    const n = Number.isInteger(p.n) && p.n >= 1 ? p.n : 0;
    const last = { opId: id64(p.opId), dir: 'in', kind, id: kind === 'item' ? id64(p.id) : null, n, ok: false, err: PAUSE.CODE };
    Promise.resolve(room._bankLoad(pid)).then((v) => { if (room.playerState[pid]) room._bankSend(pid, v, last); }).catch(() => {});
  },
  /* as the fight lock's (fightlock.js): the pending bet leaves the screen */
  arena_sponsor: (room, pid, p) => {
    const ws = room._wsBySessionId(pid);
    const out = { code: PAUSE.CODE, message: PAUSE.WORDS };
    if (typeof p.targetId === 'string' && p.targetId.length <= 64) out.targetId = p.targetId;
    if (ws) { try { ws.send(JSON.stringify({ type: 'arena_stake_error', payload: out })); } catch (e) { /* nothing moved */ } }
  },
  /* its refusal said nothing (a coins resend): now the jackpot's own state,
     with the words (the planning session's yes) */
  jackpot_deposit: (room, pid) => room._jackpotSend(pid, { playerId: pid, error: PAUSE.WORDS, reason: PAUSE.CODE }),
  store_offer: (room, pid, p) => {
    const listingId = room._scListingId(p.listingId);
    if (listingId) room._soSend(pid, 'store_offer_error', { listingId, error: PAUSE.WORDS });
  },
  /* the accepter alone (duel.js's answer to an accept it cannot take); the
     challenge is kept */
  duel_accept: (room, pid, p) => {
    const t = id64(p.target);
    room.eventBuffer.push({ type: 'duel_decline', from: t, payload: { from: t, target: pid, reason: PAUSE.CODE } });
  },
  item_drop: (room, pid, p) => room._dropReply(pid, { ok: false, reason: PAUSE.CODE, key: typeof p.key === 'string' ? p.key.slice(0, 64) : null }),
});

/** Which of them pause: a relay only when there is something it would settle
 *  (an offer made to this player; a challenge to them with a stake) -- a
 *  forged or stale one stays as quiet as its handler leaves it. */
const PAUSE_WHEN = Object.freeze({
  trade_accept: (room, pid, p) => {
    const t = id64(p.target);
    return !!(t && t !== pid && room._pendingTradeOffers && room._pendingTradeOffers.has(t + '>' + pid));
  },
  duel_accept: (room, pid, p) => {
    const t = id64(p.target);
    const c = t && t !== pid && room._duelChallenges ? room._duelChallenges.get(t + '>' + pid) : null;
    return !!(c && Number(c.wager) > 0);
  },
});

/** What the router asks (one Set lookup a message). */
export const PAUSE_GATED = new Set(Object.keys(PAUSE_REFUSE));

export const valuePauseMethods = {
  /* the HTTP routes' line: `if (this._valuePaused && this._valuePaused()) return this._valuePauseHttp(H);` */
  _valuePaused(now) { return valuePaused(this, now); },
  _valuePauseHttp(H) { return new Response(JSON.stringify(pauseHttpBody()), { headers: H }); },

  /* The router's gate, before its switch: true when the message was refused
     here (answered with its system's own refusal) and must go no further. */
  _valuePauseGate(session, msg) {
    if (!session || !session.id || !msg || !own(PAUSE_REFUSE, msg.type)) return false;
    if (!valuePaused(this)) return false;
    const p = (msg.payload && typeof msg.payload === 'object') ? msg.payload : msg;
    try {
      if (own(PAUSE_WHEN, msg.type) && !PAUSE_WHEN[msg.type](this, session.id, p)) return false;
    } catch (e) { return false; }
    try { PAUSE_REFUSE[msg.type](this, session.id, p); } catch (e) { /* refused all the same: nothing moved */ }
    return true;
  },
};
