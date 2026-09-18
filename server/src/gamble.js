/* ═══ v2.3.1164 (P4 decomposition): GAMBLE HALL extracted from
 * index.js ═══
 *
 * Behavior-frozen move of the v2.3.1124 server-settled Gamble Hall
 * roll (Wave 2 PR8; spec in docs/specs/gambling.md) out of the
 * GameRoom class body -- the P4 strangler-fig continues, same mixin
 * pattern as market.js.  jackpot_deposit is NOT here: it already
 * lives in cadence.js (the jackpot rides the time-cadence framework).
 *
 * Original trust model (unchanged): the Gamble Hall roll used to be
 * the PLAYER'S OWN Math.random() with a local 2x self-credit
 * (GamblePanel.jsx) -- phantom today, but a solo infinite-gold faucet
 * the moment any settlement trusted it.  The server rolls and settles
 * in ONE mutation on live state: no escrow, no opId, no crash window
 * (ARCHITECTURE-HANDOFF rule 8) -- a resent request is legitimately a
 * new roll, bounded by the rate limit.  Constants mirror
 * src/data/items.js GAMBLE_* (keep in sync).  ps._lastGambleAt is
 * deliberately NOT in the _saveRpg field list, so the rate-limit
 * window is in-memory only (a deploy reset loses nothing).  Invalid
 * requests are ignored silently -- the panel's own client gates keep
 * legitimate players from ever sending them. */

/* ═══ v2.3.2618: ACE'S COIN FLIP ═══
 * Owner: "You can triple your money or lose 3x of your bag (you can only bet
 * what you can lose 3x of).  The odds are 55% him winning, 45% you winning."
 *
 * A SECOND game in this mixin rather than a `mode` on gamble_request, because
 * the two disagree on every number that matters -- stake bounds, payout
 * multiple, win chance -- and folding them would mean one handler branching on
 * a client-supplied discriminator, which is the shape rule 16 warns about.
 *
 * THE STAKE IS BOUNDED BY WHAT THE LOSS COSTS, NOT BY THE STAKE.  A stake of S
 * risks 3*S, so the gate is 3*S <= coins: that is the owner's "you can only bet
 * what you can lose 3x of", and it is why a loss can never drive coins below
 * zero without a clamp.  Reading the bound off the STAKE instead (S <= coins)
 * would let a player with 100g stake 100 and owe 300.
 *
 * SYMMETRIC PAYOUT, ASYMMETRIC ODDS: win pays +3*S, loss takes -3*S, at
 * ACE_FLIP.WIN_CHANCE 0.45.  The house edge is entirely in the coin, not in the
 * payout -- EV = 0.45*3S - 0.55*3S = -0.3S, a 10% rake on the 3S at risk.
 *
 * Same trust model and same shape as the Gamble Hall roll above (rule 7:
 * gambling is a single-event mutation, nothing escrowed, a deploy loses
 * nothing; rule 8: one coins delta, no debit...credit crash window).  Constants
 * mirror src/data/items.js ACE_FLIP_* (keep in sync).  ps._lastAceFlipAt is
 * deliberately NOT in the _saveRpg field list, so the rate-limit window is
 * in-memory only, exactly like _lastGambleAt. */
export const ACE_FLIP = {
  MIN_STAKE: 10,
  RISK_MULT: 3,        // both the payout multiple and the loss multiple
  WIN_CHANCE: 0.45,    // the PLAYER's chance; Ace takes the other 55%
  COOLDOWN_MS: 2000,
};

/* ═══ v2.3.2619: THE ITEM WAGER, DOUBLE OR NOTHING ═══
 * Owner: "you should be able to wager as many items as you want for double or
 * nothing too.  Same 45% chance win odds."
 *
 * ps.inventory is a {itemKey: qty} MAP of stackables, so "double" is literally
 * qty*2 on a win and the stack removed on a loss -- no minting of unique gear,
 * no gear-provenance ledger to touch (gearprov.js), which is why this is
 * confined to the stackable bag and refuses anything else.
 *
 * THE KEYS COME OFF THE WIRE, AND THAT IS THE HAZARD.  ps.inventory is a plain
 * {} -- CLAUDE.md rule 4, fixed three times in one day (duel.away v2.3.1175,
 * party meta v2.3.1185, amulet tiers v2.3.1192) -- so a wager naming
 * '__proto__' would silently no-op the write and, worse, read back a truthy
 * qty from Object.prototype.  Every key is therefore checked with
 * hasOwnProperty against the SERVER'S OWN inventory and rejected outright if
 * it is one of the three dangerous names.  Rule 16 besides: the request's
 * quantities are a request, never a value blob -- what is staked is what the
 * server can see the player holding.
 *
 * CAPS exist so one message cannot be a denial of service: a bag has a bounded
 * number of distinct stackables, and 24 is comfortably above it. */
export const ACE_ITEMS = {
  MAX_KINDS: 24,       // distinct stacks in one wager
  MAX_QTY: 10000,      // per stack, after clamping to what is actually held
  WIN_CHANCE: 0.45,    // the SAME odds as the coin; the owner asked for that
  COOLDOWN_MS: 2000,
};
const PROTO_KEYS = ['__proto__', 'constructor', 'prototype'];

/* ═══ v2.3.2619: THE HALL OF FAME ═══
 * Owner: "leaderboards of biggest wins and biggest losses (single). Have it
 * list the player pfp next to the record too."
 *
 * ONE GameRoom storage key, not the Leaderboard DO: this board is written
 * inside the same event that settles the flip, and a cross-DO write there
 * would be an await that OPENS the input gate (rule 9) between the settle and
 * the record.  It is also small and bounded -- two lists of ten -- so it is a
 * single `ace_board` key like `shop_stock` and `jackpot:draw`, never a prefix
 * that grows.
 *
 * THE PFP IS A LOOK, NOT AN IMAGE.  The client already renders any player's
 * portrait from their cosmetics through one shared recipe
 * (characterPortrait.js portraitOptsFromPeer, used by InspectPlayerPanel and
 * the trade window).  So a record stores the `look` snapshotted off
 * `char:<pid>` and the client draws it with that same recipe -- no image
 * bytes in storage, no second portrait path to drift, and a record still
 * renders correctly for a player who is offline or has since changed clothes.
 * Snapshotted rather than looked up live ON PURPOSE: the board is a record of
 * a moment, and the face beside it should be the face that took the bet. */
export const ACE_BOARD = { KEY: 'ace_board', SIZE: 10 };

export const gambleMethods = {
  /* ── v2.3.2619: the hall of fame ── */
  async _aceBoardRead() {
    const b = (await this.state.storage.get(ACE_BOARD.KEY)) || null;
    return {
      wins: (b && Array.isArray(b.wins)) ? b.wins : [],
      losses: (b && Array.isArray(b.losses)) ? b.losses : [],
    };
  },

  /* Insert if it beats the smallest entry (or the board is short), then sort
     and truncate.  ONE entry per player per board, keeping only their best --
     otherwise a single rich player fills all ten rows and the board stops
     being a leaderboard.  `amount` is always POSITIVE; which board it lands on
     is `won`, so a "biggest loss" of 900 reads as 900, not -900. */
  async _aceBoardRecord(pid, ps, amount, won, kind) {
    if (!pid || !(amount > 0)) return;
    const board = await this._aceBoardRead();
    const list = won ? board.wins : board.losses;
    const mine = list.find((e) => e && e.pid === pid);
    if (mine && mine.amount >= amount) return;      // already hold a better one
    if (!mine && list.length >= ACE_BOARD.SIZE
        && amount <= list[list.length - 1].amount) return;
    let look = null; let name = (ps && ps.name) || 'Bro';
    try {
      const ch = await this.state.storage.get('char:' + pid);
      if (ch) { if (ch.look) look = ch.look; if (ch.name) name = ch.name; }
    } catch (e) { /* a board row without a face is still a board row */ }
    const next = list.filter((e) => e && e.pid !== pid);
    next.push({ pid, name, amount, kind: kind || 'coin', at: Date.now(), look });
    next.sort((a, b) => b.amount - a.amount);
    board[won ? 'wins' : 'losses'] = next.slice(0, ACE_BOARD.SIZE);
    await this.state.storage.put(ACE_BOARD.KEY, board);
  },

  _aceBoardSend(pid) {
    const ws = this._wsBySessionId(pid);
    if (!ws) return;
    this._aceBoardRead().then((board) => {
      try { ws.send(JSON.stringify({ type: 'ace_board', payload: board })); } catch (e) {}
    }).catch(() => {});
  },

  _handleAceBoardRequest(session) {
    if (!session || !session.id) return;
    this._aceBoardSend(session.id);
  },

  /* ── v2.3.2619: the item wager, double or nothing ── */
  async _handleAceItemFlipRequest(session, payload) {
    if (!session || !session.id) return;
    const ps = this.playerState[session.id];
    if (!ps || ps.dying || ps.dead || ps.disconnected) return;
    const now = Date.now();
    if (ps._lastAceFlipAt && now - ps._lastAceFlipAt < ACE_ITEMS.COOLDOWN_MS) return;
    const want = payload && payload.items;
    if (!want || typeof want !== 'object') return;
    if (!ps.inventory || typeof ps.inventory !== 'object') return;
    /* THE STAKE IS READ OFF THE SERVER'S OWN BAG (rule 16). The request only
       names keys and asks for quantities; what is actually risked is the
       min of what was asked and what is held. */
    const keys = Object.keys(want).slice(0, ACE_ITEMS.MAX_KINDS);
    const staked = Object.create(null);   /* rule 4: keys are client-supplied */
    let kinds = 0; let total = 0;
    for (const k of keys) {
      if (typeof k !== 'string' || !k || PROTO_KEYS.indexOf(k) >= 0) continue;
      if (!Object.prototype.hasOwnProperty.call(ps.inventory, k)) continue;
      const held = Math.floor(Number(ps.inventory[k]) || 0);
      if (held <= 0) continue;
      const ask = Math.floor(Number(want[k]) || 0);
      if (!Number.isFinite(ask) || ask <= 0) continue;
      const qty = Math.min(ask, held, ACE_ITEMS.MAX_QTY);
      if (qty <= 0) continue;
      staked[k] = qty; kinds++; total += qty;
    }
    if (!kinds || total <= 0) return;
    ps._lastAceFlipAt = now;
    const won = Math.random() < ACE_ITEMS.WIN_CHANCE;
    for (const k of Object.keys(staked)) {
      const held = Math.floor(Number(ps.inventory[k]) || 0);
      if (won) {
        ps.inventory[k] = held + staked[k];           // doubled
      } else {
        const left = held - staked[k];
        if (left > 0) ps.inventory[k] = left; else delete ps.inventory[k];
      }
    }
    this._saveRpg(session.id, ps);
    this._queuePlayerStateFlush(session.id);
    const ws = this._wsBySessionId(session.id);
    if (ws) {
      try {
        ws.send(JSON.stringify({
          type: 'ace_item_flip_result',
          payload: { won, items: staked, kinds, total },
        }));
      } catch (e) { /* the echo carries the bag either way */ }
    }
    /* The board is in GOLD, so an item wager does not land on it -- see the
       ACE_BOARD note and docs/specs/ace-coin-flip.md. Recorded here as a
       deliberate NON-action so the next reader does not "fix" it by pushing a
       item count onto a board measured in coins. */
  },

  /* v2.3.2618: Ace's coin flip.  Invalid requests are ignored silently, the
     same as the Gamble Hall's -- the panel's own gates keep a legitimate
     client from ever sending one, and answering an invalid request is a
     probe oracle. */
  async _handleAceFlipRequest(session, payload) {
    if (!session || !session.id) return;
    const ps = this.playerState[session.id];
    if (!ps || ps.dying || ps.dead || ps.disconnected) return;
    const stake = Math.floor(Number(payload && payload.stake));
    if (!Number.isFinite(stake) || stake < ACE_FLIP.MIN_STAKE) return;
    const coins = ps.coins || 0;
    const risk = stake * ACE_FLIP.RISK_MULT;
    /* THE bound. See the header: it is the LOSS that must be affordable. */
    if (risk > coins) return;
    const now = Date.now();
    if (ps._lastAceFlipAt && now - ps._lastAceFlipAt < ACE_FLIP.COOLDOWN_MS) return;
    ps._lastAceFlipAt = now;
    const won = Math.random() < ACE_FLIP.WIN_CHANCE;
    ps.coins = coins + (won ? risk : -risk);
    this._saveRpg(session.id, ps);
    this._queuePlayerStateFlush(session.id);
    const ws = this._wsBySessionId(session.id);
    if (ws) {
      try {
        ws.send(JSON.stringify({
          type: 'ace_flip_result',
          /* `delta` is signed and authoritative; the panel animates off `won`
             and reads the coins from the player_state echo (rule 20). */
          payload: { won, stake, risk, delta: won ? risk : -risk },
        }));
      } catch (e) { /* echo carries the coins either way */ }
    }
    /* v2.3.2619: the hall of fame, AFTER the settle and the result.  Awaited
       rather than fire-and-forget: it is a read-modify-write, and a storage
       await keeps the DO's input gate CLOSED (rule 9), so awaiting it here is
       what makes two players' flips unable to interleave and lose a record.
       Two small bounded ops on one key -- never a list() over a growing
       prefix, which is the shape rule 9's second edge forbids. */
    try { await this._aceBoardRecord(session.id, ps, risk, won, 'coin'); } catch (e) { /* a lost record must never cost a paid bet */ }
    this._aceBoardSend(session.id);
  },

  _handleGambleRequest(session, payload) {
    if (!session || !session.id) return;
    const ps = this.playerState[session.id];
    if (!ps || ps.dying || ps.dead || ps.disconnected) return;
    const wager = Math.floor(Number(payload && payload.wager));
    if (!Number.isFinite(wager) || wager < 10 || wager > 10000) return;
    const now = Date.now();
    if (ps._lastGambleAt && now - ps._lastGambleAt < 2000) return;
    if ((ps.coins || 0) < wager) return;
    ps._lastGambleAt = now;
    const won = Math.random() < 0.40; // GAMBLE_WIN_CHANCE mirror
    ps.coins += won ? wager : -wager;
    this._saveRpg(session.id, ps);
    this._queuePlayerStateFlush(session.id);
    const ws = this._wsBySessionId(session.id);
    if (ws) {
      try {
        ws.send(JSON.stringify({
          type: 'gamble_result',
          payload: { won, wager, payout: won ? wager * 2 : 0 },
        }));
      } catch (e) { /* echo carries the coins either way */ }
    }
  },
};
