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

export const gambleMethods = {
  /* v2.3.2618: Ace's coin flip.  Invalid requests are ignored silently, the
     same as the Gamble Hall's -- the panel's own gates keep a legitimate
     client from ever sending one, and answering an invalid request is a
     probe oracle. */
  _handleAceFlipRequest(session, payload) {
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
