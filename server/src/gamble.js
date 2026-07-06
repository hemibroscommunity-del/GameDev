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

export const gambleMethods = {
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
