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
 * Deploy-order (rule 19): caps.broVerify gates the client's wallet control
 * (broWallet.broVerifySupported), so it appears only against a worker that can
 * settle it.  The flag and its reader landed together on purpose —
 * test/caps-audit.test.mjs fails BOTH halves of that pairing, an advertised
 * flag nobody reads and a read flag nobody advertises, and it caught this
 * change in each direction while it was being built.  An old client never
 * sends these types; an old worker never advertises the cap.  Safe either way.
 */
/*
 * ═══ v2.3.3255: THE CHECKMARK IS "OWNS A HEMI BRO", AND THE PROFILE SAYS HOW MANY ═══
 * Owner, 2026-10-14: "I also want a 'verified' checkmark for people who own 1
 * hemi bro or more.  It would be cool to list the number of hemi bros owned
 * somewhere on their profile ... probably a wallet that holds the hemi bros
 * sending a message to a contract? ... But again, small surface area."
 *
 * No contract, no transaction: the same free signature as before proves the
 * wallet, and the collection is asked one more READ -- how many does that
 * wallet hold (onchain.js balanceOf).  A `bro_verify` carrying `count: 1`
 * (caps.broCount) is that WALLET check: the token id is optional (the Bro the
 * player wears, checked as before when given, its failure no longer fatal),
 * and the reply says `count`.
 *
 *   bro_link:<pid>  {address, ts, count, tokenId?} -- count since v2.3.3255;
 *                   a link without one (v2.3.1576) reads as no count.
 *   ps.broN         the count, SERVER-OWNED like ps.bro, on the tick's player
 *                   as `brn` (absent at 0) and on state_sync as `broN`.
 *
 * The badge (name plate, profile) is ps.bro OR ps.broN >= 1, decided on the
 * client from these two server fields only.
 *
 * A LINK IS RE-READ, NOT RE-SIGNED: the address was proven once, and who holds
 * what is public, so a link older than RECHECK_MS is read again in the
 * background when its player joins (_broRefresh) -- the badge stays off until
 * the chain answers, and a sold Bro drops off within a day.  The join never
 * waits on it.
 *
 * One chain read per BRO_VERIFY_GAP_MS a socket: every verify costs the
 * worker two or three RPC calls, and a nonce is free to ask for.
 *
 * Kill switch `broCount: false` (live flags): the phone falls back to the
 * worn-Bro check; links and counts already stored keep showing.
 */
import { verifyBroOwnership, verifyBroWallet, balanceOf, ownerOf, CHAIN, HEMI_BROS, MAX_BRO_COUNT } from './onchain.js';

/* v2.3.3255: one verify's chain reads per this long, per socket */
export const BRO_VERIFY_GAP_MS = 5000;

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

    /* v2.3.3255: the wallet check (`count: 1`) takes the worn Bro's id only
       if there is one; the old check needs it */
    const countMode = !!(payload && payload.count);
    const rawId = payload ? payload.tokenId : undefined;
    let tokenId = null;
    if (!countMode || (rawId !== undefined && rawId !== null)) {
      tokenId = Number(rawId);
      if (!Number.isInteger(tokenId) || tokenId < 1 || tokenId > MAX_TOKEN_ID) {
        return reply(false, 'bad_token_id');
      }
    }
    const signature = payload && payload.signature;
    if (typeof signature !== 'string' || !/^0x[0-9a-fA-F]{130}$/.test(signature)) {
      return reply(false, 'bad_signature');
    }
    /* v2.3.3255: a socket's chain reads, one verify per BRO_VERIFY_GAP_MS */
    const now = Date.now();
    if (now - (session._broVerifyAt || 0) < BRO_VERIFY_GAP_MS) return reply(false, 'slow_down');
    session._broVerifyAt = now;

    if (countMode) return this._broVerifyWallet(session, chal, tokenId, signature, reply);

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

  /* ── v2.3.3255: the wallet check (`count: 1`) ─────────────────────────
     The signer's Bro count, and the worn Bro when one was named.  Linked even
     at 0 (the wallet is proven; it simply holds none, and the reply says so). */
  async _broVerifyWallet(session, chal, tokenId, signature, reply) {
    let res;
    try {
      res = await verifyBroWallet(_nonceText(session.id, chal.nonce), signature, tokenId, {
        fetchImpl: this._broFetch,
      });
    } catch {
      return reply(false, 'chain_unreachable');
    }
    if (!res.ok) return reply(false, res.reason || 'not_verified');
    const link = _linkOf(res.address, res.count, res.tokenOk ? tokenId : null);
    await this.state.storage.put('bro_link:' + session.id, link);
    this._applyBroLink(session.id, link);
    reply(true, null, { tokenId: link.tokenId || null, address: link.address, count: link.count });
  },

  /* v2.3.3255: the server-owned fields from a link (the only writer besides
     the token check above), and the player marked so the others see it */
  _applyBroLink(pid, link) {
    const ps = this.playerState[pid];
    if (!ps || !link) return;
    if (Number.isInteger(link.tokenId)) ps.bro = link.tokenId; else delete ps.bro;
    if (Number.isInteger(link.count) && link.count > 0) ps.broN = link.count; else delete ps.broN;
    this.dirtyPlayers.add(pid);
  },

  /* ── join ─────────────────────────────────────────────────────────────
     Restore a still-fresh link so the badge survives a reconnect without
     making the player sign again.  A stale one is not restored: join is a
     latency-sensitive path and must not wait on an RPC.
     v2.3.3255: ...but it is READ AGAIN in the background (_broRefresh): the
     address was proven once and who holds what is public, so nobody signs
     every day; the badge comes back when the chain answers. */
  async _restoreBroLink(pid) {
    let link = null;
    try { link = await this.state.storage.get('bro_link:' + pid); } catch { return null; }
    if (!link || typeof link.address !== 'string') return null;
    if (!link.ts || (Date.now() - link.ts) > RECHECK_MS) {
      this._broRefresh(pid, link).catch(() => { /* fail closed: the badge stays off */ });
      return null;
    }
    if (typeof link.tokenId !== 'number' && !(link.count > 0)) return null;
    const ps = this.playerState[pid];
    if (ps) {
      if (typeof link.tokenId === 'number') ps.bro = link.tokenId;
      if (Number.isInteger(link.count) && link.count > 0) ps.broN = link.count;
    }
    return link;
  },

  /* v2.3.3255: a stale link, read again -- the count, and the worn Bro if the
     link named one.  Nothing the chain will not answer is granted: no count,
     no write (the next join tries again); an owner it cannot name, no token. */
  async _broRefresh(pid, link) {
    if (!this._broRefreshing) this._broRefreshing = new Set();
    if (this._broRefreshing.has(pid)) return null;
    this._broRefreshing.add(pid);
    try {
      const opts = { fetchImpl: this._broFetch };
      const address = String(link.address).toLowerCase();
      const count = await balanceOf(address, opts);
      if (count === null) return null;
      let tokenId = null;
      if (Number.isInteger(link.tokenId)) {
        const owner = await ownerOf(link.tokenId, opts);
        if (owner && owner === address) tokenId = link.tokenId;
      }
      const next = _linkOf(address, count, tokenId);
      await this.state.storage.put('bro_link:' + pid, next);
      if (!this.playerState[pid]) return next;   /* left while the chain answered */
      this._applyBroLink(pid, next);
      const ws = typeof this._wsBySessionId === 'function' ? this._wsBySessionId(pid) : null;
      if (ws) {
        try {
          ws.send(JSON.stringify({ type: 'bro_verify_result', ok: true, reason: null, refresh: true,
            tokenId: next.tokenId || null, address: next.address, count: next.count }));
        } catch { /* gone */ }
      }
      return next;
    } finally {
      this._broRefreshing.delete(pid);
    }
  },
};

/* v2.3.3255: one shape for a stored link.  A wallet that holds the worn Bro
   holds at least one, whatever two reads a block apart said. */
function _linkOf(address, count, tokenId) {
  const n = Math.min(MAX_BRO_COUNT, Math.max(Number.isInteger(count) ? count : 0, Number.isInteger(tokenId) ? 1 : 0));
  return Number.isInteger(tokenId)
    ? { tokenId, address, ts: Date.now(), count: n }
    : { address, ts: Date.now(), count: n };
}
