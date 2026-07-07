/* ═══ v2.3.1178: HTTP ECONOMY-ENDPOINT AUTH (session tokens; spec in
 * docs/specs/http-auth.md) ═══
 *
 * The GameRoom's HTTP surfaces that MUTATE player value -- market
 * place/cancel, arena join/leave -- trusted a client-supplied playerId
 * gated only on "is that player online in this room".  Player ids are
 * public (broadcast in player_join / track / leaderboard), so any
 * online player was targetable: POST /api/market/place with a victim's
 * playerId escrows the weapon out of the SERVER's own stash by index
 * (market.js takes ps.weaponStash[stashIndex]); list it at 1g, buy it,
 * and the theft is complete.  The same shape debited arena entry fees.
 *
 * Fix: every WS join mints an unguessable per-session token, delivered
 * to that client alone inside its state_sync (httpToken field,
 * advertised via caps.httpAuth).  The client attaches it to mutating
 * economy POSTs as the x-bt-auth header; the server validates it
 * against the LIVE session of the playerId the request claims to act
 * for.  An attacker knows the victim's public id but never sees the
 * victim's state_sync, so the token is unforgeable without the
 * victim's own socket.
 *
 * Deploy-order safety (rule 19): clients declare token support with
 * httpAuth:true on the join message.  Sessions that declared it are
 * ENFORCED (no/wrong token -> reject); sessions that didn't (old
 * clients still cached in browsers during the rollout window) keep the
 * legacy playerId-only behavior, which decays to zero as clients
 * refresh.  A presented token is always validated regardless of
 * declaration, and the token requirement follows the VICTIM's session
 * -- an attacker cannot downgrade a new-client victim by using an old
 * client themselves.  New client + old worker: no httpToken in
 * state_sync, so the client sends no header, which old workers ignore.
 *
 * Tokens live in session memory only (no storage key): a deploy wipes
 * sessions, clients reconnect, fresh tokens are minted with the new
 * state_sync.  The v2.3.702 same-id eviction means one live session --
 * and therefore one valid token -- per player id. */

export const httpAuthMethods = {
  // Called from the join bootstrap after the same-id eviction: one
  // token per live session, rotated on every (re)join.
  _httpAuthMint(session, msg) {
    session.httpToken = crypto.randomUUID();
    session.httpAuthEnforced = !!(msg && msg.httpAuth);
    return session.httpToken;
  },

  // Validate a mutating HTTP request that claims to act for playerId.
  // Contract:
  //   - playerId must have a live session (all gated endpoints already
  //     require the player online; this also stops offline-target ops
  //     like cancelling an offline player's listings).
  //   - a presented x-bt-auth header must match that session's token,
  //     ALWAYS (wrong token is rejected even for legacy sessions).
  //   - no header: allowed only while the session did not declare
  //     httpAuth support (the rollout window for cached old clients).
  _httpAuthCheck(playerId, request) {
    if (!playerId || typeof playerId !== 'string') return false;
    let session = null;
    for (const [, s] of this.sessions) {
      if (s.id === playerId) { session = s; break; }
    }
    if (!session) return false;
    const token = request && request.headers && request.headers.get('x-bt-auth');
    if (token) return !!session.httpToken && token === session.httpToken;
    return !session.httpAuthEnforced;
  },
};
