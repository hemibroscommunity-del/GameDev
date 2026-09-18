/* ═══ v2.3.2621: TALKING ABOUT ONE LISTING ═══
 *
 * Owner: "Add the direct message feature (little chat icon)".  The mockup is
 * specific: the icon sits ON a listing, and what it opens is a thread ABOUT
 * that listing -- the item as a header, the listing's own expiry beside it,
 * bubbles, three canned replies and a 200-character composer.
 *
 * SO THIS IS NOT ANOTHER WHISPER LANE.  chatlanes.js already whispers to any
 * player in the room and friends.js already DMs a friend; neither can express
 * "about THIS sword", which is the whole point -- the buyer wants to haggle
 * over one pile of goods and the seller wants to know which one is being
 * asked about.  A thread is therefore keyed by the listing, not by the pair.
 *
 * ── THE MOCKUP SHOWS ONE THREAD.  THE REALITY IS N. ──
 * A listing has one seller and any number of interested buyers, so what the
 * seller actually has is one conversation PER BUYER on that listing.  That is
 * the shape stored, and the seller's view lists them.  A buyer only ever sees
 * their own, which is why the mockup is not wrong so much as drawn from the
 * buyer's side.
 *
 * ── WHY ONE KEY PER LISTING AND NOT ONE PER CONVERSATION ──
 *   store_thread:<listingId>  ->  { t: { <buyerId>: [msg, ...] }, at }
 *
 * The obvious shape is `store_thread:<listingId>:<buyerId>`, and it is worse
 * in three ways.  MAX_GLOBAL is 2000 listings, so that shape is up to 2000 x
 * THREADS_MAX keys to create, find and delete, where this is 2000.  The
 * seller's own view wants EVERY conversation on their listing, which is one
 * read here and THREADS_MAX reads there -- and a storage await holds the
 * room's input gate for its whole duration (handoff rule 9's second edge).
 * And cleanup becomes one delete instead of a prefix walk.
 *
 * Bounded on both axes, because "a thread per listing with 2000 listings" is
 * a real storage shape and not a hypothetical: THREADS_MAX conversations per
 * listing, MSGS_MAX messages per conversation, TEXT_MAX per message.  Worst
 * case one key is ~24KB (well inside the 128KB value limit) and the whole
 * system ~46MB at full saturation of every listing in the game, which no
 * real shelf approaches.
 *
 * ── WHAT HAPPENS WHEN THE LISTING ENDS ──
 * The thread goes with it.  A thread is scoped to a listing by definition, so
 * a sold or expired listing has nothing left to be about, and keeping dead
 * threads would need its own sweep to stop them accumulating forever -- a
 * second unbounded prefix, which is the thing rule 9 warns about.  Deleted at
 * every one of the three points a listing ends (settle, release, unwind), and
 * deleted BEFORE the listing record is: a crash in between then leaves a
 * listing whose thread is empty, which recovers by itself, rather than a
 * thread nothing will ever delete.
 *
 * ── MODERATION IS NOT OPTIONAL HERE ──
 * This is player-authored text aimed at one person's screen, which is the
 * lane chatmod.js was written for.  Every line goes through
 * `_chatModRemember` (so a report quotes the SERVER's copy, never the
 * reporter's claim) and every delivery checks `_chatModMuted` on the
 * RECIPIENT, dropping rather than storing -- a mute that still filled your
 * inbox for next login would be a mute in name only (v2.3.1981).
 *
 * ── THE RATE LIMIT IS NOT OPTIONAL EITHER ──
 * These are explicit cases in the router switch, so the default branch's
 * relay token bucket never sees them -- exactly the hole v2.3.1970 found in
 * party_invite and chatlanes.js carries its own bucket to avoid.  So does
 * this, and it is its OWN bucket rather than chatlanes': a shared one would
 * mean haggling over a sword spent the allowance for asking for help.
 *
 * Every emitted type is in PRIVILEGED_EVENTS (index.js) or a client could
 * forge a message from a seller.  Every id-keyed map is null-proto or a Map
 * (CLAUDE.md rule 4).  Deploy-order: caps.storeChat gates the client's icon
 * and both sends; an older worker has no case for either type and would fall
 * through to the DEFAULT BRANCH and rebroadcast a private haggle to the whole
 * room, which is why the flag is narrow and mandatory (rule 19).
 *
 * Spec: docs/specs/store-chat.md
 */

export const STORE_CHAT = {
  TEXT_MAX: 200,       // the mockup's own 0/200 composer, and CHAT_LANES.TEXT_MAX
  MSGS_MAX: 20,        // messages kept per conversation, oldest dropped
  THREADS_MAX: 5,      // conversations one listing will hold
  NAME_MAX: 24,        // matches FRIENDS / CHATMOD
  BURST: 5,            // messages a player may send back-to-back...
  REFILL_MS: 2000,     // ...and one more every this often
};

/* The three the mockup draws. Sent as ordinary text through the same clamp
   and the same moderation as anything typed, because a canned reply is only
   a convenience -- treating it as trusted would make it the one lane worth
   forging. Exported so the client and the suite name the same three. */
export const STORE_CHAT_QUICK = [
  'Still available?',
  'Would you take less?',
  'I have a question',
];

export const storeChatMethods = {
  _scSend(playerId, type, payload) {
    const ws = this._wsBySessionId(playerId);
    if (!ws) return false;
    try { ws.send(JSON.stringify({ type, payload })); return true; } catch (e) { return false; }
  },

  _scNameOf(pid) {
    const ps = this.playerState[pid];
    if (ps && ps.name) return String(ps.name).slice(0, STORE_CHAT.NAME_MAX);
    for (const [, s] of this.sessions) { if (s.id === pid) return (s.name || 'Bro').slice(0, STORE_CHAT.NAME_MAX); }
    return 'Bro';
  },

  /* One bucket per sender. Map, not a plain object: keyed by a session id,
     which is client-influenced (rule 4). In-memory only -- a deploy wipes it,
     which is correct for a rate limit on ephemeral text (rule 11). */
  _scAllow(pid) {
    if (!this._scBuckets) this._scBuckets = new Map();
    const now = Date.now();
    let b = this._scBuckets.get(pid);
    if (!b) { b = { tokens: STORE_CHAT.BURST, at: now }; this._scBuckets.set(pid, b); }
    const gained = Math.floor((now - b.at) / STORE_CHAT.REFILL_MS);
    if (gained > 0) { b.tokens = Math.min(STORE_CHAT.BURST, b.tokens + gained); b.at = now; }
    if (b.tokens <= 0) return false;
    b.tokens--;
    return true;
  },

  /* Clamp RAW length first, then strip control chars, then trim -- the order
     party.js settled on, so padding cannot smuggle a long line past the cap. */
  _scText(v) {
    if (typeof v !== 'string') return null;
    const t = v.slice(0, STORE_CHAT.TEXT_MAX).replace(/[\x00-\x1f\x7f]/g, ' ').trim();
    return t || null;
  },

  /* A listing id off the wire. Bounded and never an Object.prototype member:
     it is about to index a map (the trade.js / store.js gate, v2.3.1971). */
  _scListingId(v) {
    if (typeof v !== 'string' || !v || v.length > 64) return null;
    if (Object.prototype.hasOwnProperty.call(Object.prototype, v)) return null;
    return v;
  },

  async _scDoc(listingId) {
    const stored = await this.state.storage.get('store_thread:' + listingId);
    const doc = { t: Object.create(null), at: 0 };   /* rule 4 */
    if (stored && stored.t && typeof stored.t === 'object') {
      for (const k of Object.keys(stored.t)) {
        if (Array.isArray(stored.t[k])) doc.t[k] = stored.t[k];
      }
      doc.at = stored.at || 0;
    }
    return doc;
  },

  async _scPut(listingId, doc) {
    await this.state.storage.put('store_thread:' + listingId, { t: { ...doc.t }, at: Date.now() });
  },

  /* Called by store.js wherever a listing stops existing. Best effort and
     BEFORE the listing record is deleted: a crash in between leaves a listing
     with an empty thread (which heals itself) rather than a thread nothing
     will ever delete. */
  async _scDropThreads(listingId) {
    try { await this.state.storage.delete('store_thread:' + listingId); } catch (e) { /* best effort */ }
  },

  /* One message on the wire. `mine` is filled in per recipient, because the
     same stored message is "you" to its author and "them" to the other side. */
  _scWire(m) {
    return { from: m.f, fromName: m.n, text: m.x, ts: m.ts };
  },

  /* ── OPEN: hand back one conversation, or (for the seller) the list ── */
  async _handleStoreDmOpen(session, payload) {
    const me = session && session.id;
    if (!me) return;
    const listingId = this._scListingId(payload && payload.listingId);
    if (!listingId) return;
    await this._stEnsureIndex();
    const rec = this._stIndex.get(listingId);
    if (!rec) {
      return this._scSend(me, 'store_dm_thread', { listingId, gone: true, threads: [] });
    }
    const doc = await this._scDoc(listingId);
    const amSeller = rec.sellerId === me;
    const ids = amSeller ? Object.keys(doc.t) : [me];
    const threads = [];
    for (const bid of ids) {
      const msgs = doc.t[bid] || [];
      if (!amSeller && !msgs.length) continue;      /* nothing to show yet */
      threads.push({
        buyerId: bid,
        buyerName: msgs.length ? (msgs.find((m) => m.f === bid) || {}).n || this._scNameOf(bid) : this._scNameOf(bid),
        msgs: msgs.map((m) => this._scWire(m)),
      });
    }
    this._scSend(me, 'store_dm_thread', {
      listingId,
      amSeller,
      /* The header the mockup draws, from the listing the server already
         holds -- the panel never has to describe the item itself. */
      item: rec.disp || null,
      askPrice: rec.askPrice,
      expiresAt: rec.expiresAt,
      sellerId: rec.sellerId,
      sellerName: rec.sellerName,
      /* v2.3.2622: the seller's bust set, so their own bro sits on their
         bubbles instead of a letter. Already on the listing record -- no new
         storage and no new read. */
      sellerLook: rec.sellerLook || null,
      /* ═══ v2.3.2623: THE OFFERS COME WITH THE THREAD ═══
         They were delivered ONLY by the live `store_offer_state` event, which
         a seller whose panel was shut when the offer landed never receives --
         so they opened the chat and were told nobody had asked, while the
         buyer's gold sat escrowed against their listing. Found by
         mp-listingoffer, which is the whole reason it drives two clients.
         Opening is now the authoritative read, and the live event is the
         update; every other field on this payload already works that way. */
      offers: this._soPublic ? this._soPublic(rec) : [],
      threads,
    });
  },

  /* ── SEND ── */
  async _handleStoreDm(session, payload) {
    const me = session && session.id;
    if (!me) return;
    const listingId = this._scListingId(payload && payload.listingId);
    const text = this._scText(payload && payload.text);
    if (!listingId || !text) return;
    if (!this._scAllow(me)) {
      return this._scSend(me, 'store_dm_error', { listingId, reason: 'too-fast' });
    }
    await this._stEnsureIndex();
    const rec = this._stIndex.get(listingId);
    if (!rec) return this._scSend(me, 'store_dm_error', { listingId, reason: 'gone' });

    const amSeller = rec.sellerId === me;
    /* WHOSE conversation this line belongs to. A buyer only ever writes in
       their own; a seller must name which one they are answering, and it has
       to be one that already exists -- so a seller cannot open a thread with
       a player who never asked, and `to` can never mint a new one. */
    let buyerId;
    if (amSeller) {
      buyerId = this._scListingId(payload && payload.to);
      if (!buyerId) return this._scSend(me, 'store_dm_error', { listingId, reason: 'no-thread' });
    } else {
      buyerId = me;
    }

    const doc = await this._scDoc(listingId);
    if (amSeller && !doc.t[buyerId]) {
      return this._scSend(me, 'store_dm_error', { listingId, reason: 'no-thread' });
    }
    if (!doc.t[buyerId]) {
      if (Object.keys(doc.t).length >= STORE_CHAT.THREADS_MAX) {
        return this._scSend(me, 'store_dm_error', { listingId, reason: 'too-many' });
      }
      doc.t[buyerId] = [];
    }

    const msg = { f: me, n: this._scNameOf(me), x: text, ts: Date.now() };
    const list = doc.t[buyerId];
    list.push(msg);
    if (list.length > STORE_CHAT.MSGS_MAX) list.splice(0, list.length - STORE_CHAT.MSGS_MAX);

    /* Remembered BEFORE any delivery decision: a DM is the lane where the
       nastiest things get said, and the report path can only quote lines the
       server actually saw (chatmod.js, v2.3.1981). */
    this._chatModRemember(me, text, this.playerState[me] && this.playerState[me].z, 'dm');

    await this._scPut(listingId, doc);

    const other = amSeller ? buyerId : rec.sellerId;
    const wire = { listingId, buyerId, msg: this._scWire(msg) };
    /* Echoed to the sender too, so their own line appears without the panel
       having to guess at what the server stored. */
    this._scSend(me, 'store_dm', wire);
    /* A mute drops the line for the RECIPIENT only -- it is already stored,
       because the thread is the seller's record of the haggle either way. */
    if (other && other !== me && !this._chatModMuted(other, me)) {
      this._scSend(other, 'store_dm', wire);
    }
  },
};
