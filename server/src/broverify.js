/* v2.3.1576: HEMI BRO OWNERSHIP — prove the avatar you wear is yours.
 *
 * The game ships a 3,333-piece Hemi Bros catalogue and lets a player wear any
 * of them by typing its id.  Nothing checked ownership, so every Bro was
 * wearable by everyone.  This mixin makes it a SERVER fact, on the same
 * posture as the rest of the economy: the client asserts nothing, the server
 * asks the chain.
 *
 * The handshake (two validated cases, never the room rebroadcast):
 *
 *   bro_nonce   -> server mints a single-use nonce bound to THIS session and
 *                  returns the exact string to sign.  The message is built
 *                  server-side; a client that supplies its own text or its
 *                  own digest would be choosing what it "proved".
 *   bro_verify  -> {tokenId, signature}.  The server recovers the signer of
 *                  ITS nonce (onchain.js — ecrecover via the chain, see that
 *                  file for why the curve math is not in this repo), asks the
 *                  collection who holds the token, and compares.
 *
 * Ownership is a LIVE fact, not a purchase: a verified link is stored so it
 * survives reconnects, but it records the address and the moment it was
 * checked.  Selling the Bro does not retroactively rewrite history, and
 * RECHECK_MS bounds how stale a badge can get.
 *
 * Storage (registered in ARCHITECTURE-HANDOFF rule 2):
 *   bro_link:<pid>  {tokenId, address, ts} — last verified link for a player.
 *
 * Nothing here moves coins or items, so there are no opIds (rule 5 is about
 * settlement).  The badge is cosmetic; the security property is only that it
 * cannot be claimed without holding the token.
 *
 * Trust boundary (rule 13 / rule 16): `bro` on playerState is SERVER-OWNED
 * and deliberately absent from TRACK_COSMETIC_KEYS — a client cannot set it
 * by sending it, the way it can set its own shirt colour.  bro_verify_result
 * is in PRIVILEGED_EVENTS so a client cannot forge a success to its peers.
 *
 * Deploy-order (rule 19): caps.broVerify will gate the client's wallet UI.
 * The flag is NOT advertised yet, on purpose — test/caps-audit.test.mjs fails
 * any advertised flag no client reads, and it is right to: a gate that gates
 * nothing misleads the next person cleaning up legacy paths.  It ships in the
 * same change as the client that reads it.  Nothing is lost by waiting: the
 * cap exists to tell a NEW client the server supports this, and until that
 * client exists there is nobody to tell.  An old client never sends these
 * types, so the handlers below are unreachable for it either way.
 */
import { verifyBroOwnership, CHAIN, HEMI_BROS } from './onchain.js';

/* A nonce is a one-shot proof-of-liveness; it does not need to outlive the
   socket, so it lives on the session rather than in storage. */
const NONCE_TTL_MS = 5 * 60 * 1000;
/* How long a verified link is trusted before the badge needs re-earning.
   Ownership can change at any time and the server does not watch Transfer
   logs, so the badge is a claim with an expiry rather than a permanent grant. */
export const RECHECK_MS = 24 * 60 * 60 * 1000;
/* The catalogue is 3,333 sparse ids inside 1..6666 (supply was halved at
   mint), so the range is a cheap shape check only — whether a given id
   actually exists is answered by ownerOf, not by arithmetic. */
const MAX_TOKEN_ID = 6666;

function _nonceText(pid, nonce) {
  /* Human-readable on purpose: this is what the wallet shows the player.
     It names the chain and the game so a signature farmed by some other site
     cannot be replayed here, and carries the player id so one player's
     signature cannot be presented by another. */
  return 'Hemi Bros: verify ownership for BroTown\n'
    + 'player: ' + pid + '\n'
    + 'chain: ' + CHAIN.id + '\n'
    + 'nonce: ' + nonce;
}

export const broVerifyMethods = {
  /* ── bro_nonce ────────────────────────────────────────────────────────
     Mint a single-use challenge.  Overwrites any previous one, so a player
     spamming the button cannot bank a pile of live nonces. */
  _handleBroNonce(session, ws) {
    if (!session || !session.id) return;
    const nonce = crypto.randomUUID();
    session._broNonce = { nonce, exp: Date.now() + NONCE_TTL_MS };
    try {
      ws.send(JSON.stringify({
        type: 'bro_nonce',
        message: _nonceText(session.id, nonce),
        chainId: CHAIN.id,
        contract: HEMI_BROS,
        expiresAt: session._broNonce.exp,
      }));
    } catch { /* socket already gone */ }
  },

  /* ── bro_verify ───────────────────────────────────────────────────────
     Every rejection path returns the SAME shape with a reason, and never
     mutates state.  Fails closed: a chain outage is a refusal, not a grant. */
  async _handleBroVerify(session, payload, ws) {
    const reply = (ok, reason, extra) => {
      try { ws.send(JSON.stringify({ type: 'bro_verify_result', ok, reason, ...(extra || {}) })); } catch { /* gone */ }
    };
    if (!session || !session.id) return;

    const chal = session._broNonce;
    if (!chal || Date.now() > chal.exp) return reply(false, 'nonce_expired');
    /* Burn the nonce BEFORE the await.  Two verifies racing on one socket
       would otherwise both pass the check and both spend the same challenge. */
    session._broNonce = null;

    const tokenId = Number(payload && payload.tokenId);
    if (!Number.isInteger(tokenId) || tokenId < 1 || tokenId > MAX_TOKEN_ID) {
      return reply(false, 'bad_token_id');
    }
    const signature = payload && payload.signature;
    if (typeof signature !== 'string' || !/^0x[0-9a-fA-F]{130}$/.test(signature)) {
      return reply(false, 'bad_signature');
    }

    let res;
    try {
      res = await verifyBroOwnership(_nonceText(session.id, chal.nonce), signature, tokenId, {
        fetchImpl: this._broFetch,        /* injectable for the suite */
      });
    } catch {
      return reply(false, 'chain_unreachable');
    }
    if (!res.ok) return reply(false, res.reason || 'not_verified');

    const link = { tokenId, address: res.address, ts: Date.now() };
    await this.state.storage.put('bro_link:' + session.id, link);

    /* Server-owned: this is the only place `bro` is ever written. */
    const ps = this.playerState[session.id];
    if (ps) {
      ps.bro = tokenId;
      /* Relay to peers on the next tick so their badge appears without a
         reconnect (tick.js playerWire carries `bro`). */
      this.dirtyPlayers.add(session.id);
    }
    reply(true, null, { tokenId, address: res.address });
  },

  /* ── join ─────────────────────────────────────────────────────────────
     Restore a still-fresh link so the badge survives a reconnect without
     making the player sign again.  A stale one is dropped rather than
     re-checked: join is a latency-sensitive path and must not wait on an
     RPC, so the client simply re-verifies when it next wants the badge. */
  async _restoreBroLink(pid) {
    let link = null;
    try { link = await this.state.storage.get('bro_link:' + pid); } catch { return null; }
    if (!link || typeof link.tokenId !== 'number') return null;
    if (!link.ts || (Date.now() - link.ts) > RECHECK_MS) return null;
    const ps = this.playerState[pid];
    if (ps) ps.bro = link.tokenId;
    return link;
  },
};
