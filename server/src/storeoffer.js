/* ═══ v2.3.2623: ESCROWED OFFERS — HAGGLING THAT ACTUALLY MOVES MONEY ═══
 *
 * Owner: "I like the idea of escrow so when they offer they're actually
 * putting up gold so that way the [seller] can accept on the spot."
 *
 * So an offer is not a message. A buyer names a number in the listing's
 * thread, their gold is TAKEN THERE AND THEN, and the seller's "Yes"
 * completes the sale immediately — goods to the buyer, escrowed gold to the
 * seller — with no second trip through Bid or Buy.
 *
 * ── AN OFFER IS A PRIVATE, PER-BUYER BID, AND IS BUILT AS ONE ──
 * Bidding already escrows gold, already settles, and already has a suite
 * pinning it. A second, parallel gold path beside it is exactly how two
 * systems come to disagree about who owns which coins, so every money move
 * here is the bid's move with a different name:
 *
 *     escrow   _escrowDebitGold(buyer, gold, 'store:<id>:offer:<seq>')
 *     refund   _creditPlayer(buyer, opId 'store:<id>:offerref:<seq>')
 *     settle   _stSettle(), unchanged, the same one Buy and Accept-Bid use
 *
 * ── "CAN THE ESCROW CARRY N HOLDERS PER LISTING?" YES, AND IT ALREADY DOES ──
 * store.js's header says a listing has "at most one live bid", and that was
 * the open question about this feature. It turns out to be a property of the
 * RECORD SHAPE (`rec.topBid` is a single object), not of the escrow.
 * `_escrowDebitGold` (inbox.js) is generic and opId-idempotent, and the ARENA
 * already escrows N holders against one subject: `arena:<tid>:entry:<pid>`,
 * one per player, each individually refundable (gladiator.js
 * `_arenaRefundEntry`). So offers need a bounded MAP on the record and no new
 * settlement machinery at all. That is why this module is ~300 lines and not
 * a rewrite of the store.
 *
 * ── THE DOUBLE-SPEND CASE IS CLOSED BY CONSTRUCTION, NOT BY BOOKKEEPING ──
 * The brief's likeliest-real-bug was "the same gold escrowed twice — a buyer
 * with a live bid AND an offer, or offers on several listings". It cannot
 * happen: `_escrowDebitGold` DEBITS THE COINS. A buyer holding 100g who
 * offers 100g has 0g and the next offer is refused for want of gold, exactly
 * as a second bid would be. There is no parallel "committed" ledger to drift
 * out of step with the purse, because the purse IS the ledger.
 *
 * ── EVERY ENDING FUNNELS THROUGH THE TWO PATHS THAT ALREADY EXIST ──
 * Offers are released by `_stSettle` (every sale: buy-now, accepted bid,
 * accepted offer) and `_stRelease` (every non-sale: cancel, expiry, crash
 * release). There is deliberately no third exit, so "the listing ended and
 * somebody's gold stayed locked" has one place to be wrong rather than six.
 *
 * ── OFFERS EXPIRE SOONER THAN THE LISTING ──
 * A listing runs a week (v2.3.2619). Gold cannot sit locked for a week
 * because a seller never answered, so an offer expires after OFFER_EXPIRY
 * (48h) and refunds itself on the same lazy sweep the listings use (rule 12:
 * no alarms). 48h is long enough to survive a seller's weekend and short
 * enough that an ignored offer is not a week-long loan.
 *
 * ── "I'LL THINK ABOUT IT" HOLDS THE GOLD, deliberately ──
 * If thinking released the escrow the reply would mean nothing — the seller
 * would be saying "maybe" to an offer that no longer exists. So it holds,
 * and the honest cost is that a buyer's gold stays tied up on a non-answer
 * until they withdraw it or OFFER_EXPIRY arrives. The buyer can always
 * withdraw; that is what makes the hold fair.
 *
 * Storage: no new key. Offers live on `store_listing:<id>` as `rec.offers`,
 * so the wake-time rebuild that already recovers the listing recovers them,
 * and a listing cannot exist without its offers or vice versa.
 *
 * Spec: docs/specs/store-offers.md
 */

export const STORE_OFFER = {
  MAX_PER_LISTING: 5,        // offers one listing will hold at once
  OFFER_EXPIRY: 172800000,   // 48h -- shorter than the listing's week, see above
  MIN: 1,
  BURST: 3,                  // offers a buyer may place back-to-back...
  REFILL_MS: 4000,           // ...and one more every this often (harder than chat)
};

/* The seller's answers. Enumerated, never free text: the client renders the
   words from the id, so a reply cannot carry anything a player typed. */
export const OFFER_REPLIES = ['yes', 'think', 'no'];

export const storeOfferMethods = {
  _soSend(playerId, type, payload) {
    const ws = this._wsBySessionId(playerId);
    if (!ws) return false;
    try { ws.send(JSON.stringify({ type, payload })); return true; } catch (e) { return false; }
  },

  /* Its own bucket, harder than the chat's: a number field invites repeated
     haggling and every offer moves real gold and pokes the seller. Map, not a
     plain object (rule 4); in-memory, so a deploy wipes it, which is correct
     for a rate limit (rule 11). */
  _soAllow(pid) {
    if (!this._soBuckets) this._soBuckets = new Map();
    const now = Date.now();
    let b = this._soBuckets.get(pid);
    if (!b) { b = { tokens: STORE_OFFER.BURST, at: now }; this._soBuckets.set(pid, b); }
    const gained = Math.floor((now - b.at) / STORE_OFFER.REFILL_MS);
    if (gained > 0) { b.tokens = Math.min(STORE_OFFER.BURST, b.tokens + gained); b.at = now; }
    if (b.tokens <= 0) return false;
    b.tokens--;
    return true;
  },

  /* A gold amount off the wire. market.js:66-69 is the written-down lesson:
     a client-supplied number is a claim. Whole, positive, inside the store's
     own ceiling, and REFUSED rather than clamped -- a buyer who typed 10
     million and silently offered 999999 has been told nothing. */
  _soGold(v) {
    const n = Math.floor(Number(v));
    if (!Number.isFinite(n)) return null;
    if (n < STORE_OFFER.MIN || n > this._stMaxPrice()) return null;
    return n;
  },

  _soOffers(rec) {
    if (!rec.offers || typeof rec.offers !== 'object') return Object.create(null);
    /* Null-proto copy: the keys are player ids off the wire (rule 4). */
    const out = Object.create(null);
    for (const k of Object.keys(rec.offers)) out[k] = rec.offers[k];
    return out;
  },

  _soPublic(rec) {
    const offers = this._soOffers(rec);
    return Object.keys(offers).map((bid) => ({
      buyerId: bid, buyerName: offers[bid].name || 'Someone',
      gold: offers[bid].gold, at: offers[bid].at,
      expiresAt: offers[bid].at + STORE_OFFER.OFFER_EXPIRY,
      reply: offers[bid].reply || null,
    }));
  },

  /* ── PLACE ───────────────────────────────────────────────────────────
     Marker first, then the debit, then the record -- the shape rec.pendBid
     already uses, so the wake-time rebuild can tell "the gold moved" from
     "it did not" by one oplog read and nothing else. */
  async _stOfferPlace(listingId, buyerId, rawGold) {
    await this._stEnsureIndex();
    const rec = this._stIndex.get(listingId);
    if (!rec) return { ok: false, settled: true, error: 'That listing has ended' };
    if (rec.sellerId === buyerId) return { ok: false, settled: true, error: 'That is your own listing' };
    if (rec.sale || rec.releasing) return { ok: false, settled: true, error: 'That listing is being sold' };
    const gold = this._soGold(rawGold);
    if (gold === null) return { ok: false, settled: true, error: 'Offer a whole number of gold' };
    if (!this._soAllow(buyerId)) return { ok: false, settled: true, error: 'Slow down a moment' };

    const offers = this._soOffers(rec);
    const had = offers[buyerId];
    if (!had && Object.keys(offers).length >= STORE_OFFER.MAX_PER_LISTING) {
      return { ok: false, settled: true, error: 'This listing already has as many offers as it can hold' };
    }

    /* Replacing your own offer refunds the old one FIRST. Doing it the other
       way round would need the buyer to hold both amounts at once, which is
       the opposite of what a raise should cost. */
    if (had) {
      await this._creditPlayer(buyerId, {
        opId: 'store:' + rec.id + ':offerref:' + had.seq, source: 'market', kind: 'gold',
        payload: { amount: had.gold }, note: 'offer replaced on ' + this._stLabel(rec),
      });
      delete offers[buyerId];
      rec.offers = { ...offers };
      await this.state.storage.put('store_listing:' + rec.id, rec);
    }

    const seq = (rec.offerSeq || 0) + 1;
    rec.offerSeq = seq;
    rec.pendOffer = { seq, buyerId, gold, at: Date.now() };
    await this.state.storage.put('store_listing:' + rec.id, rec);

    const took = await this._escrowDebitGold(buyerId, gold, 'store:' + rec.id + ':offer:' + seq);
    if (!took.ok) {
      rec.pendOffer = null;
      await this.state.storage.put('store_listing:' + rec.id, rec);
      return { ok: false, settled: true, error: 'Not enough gold' };
    }
    await this._soPromote(rec, rec.pendOffer);
    this._soNotify(rec, rec.sellerId);
    return { ok: true, settled: true, offered: gold, offers: this._soPublic(rec) };
  },

  /* Turn a debited pending offer into a live one. Idempotent: called from
     the place path and from the wake-time rebuild. */
  async _soPromote(rec, pend) {
    const offers = this._soOffers(rec);
    offers[pend.buyerId] = {
      seq: pend.seq, gold: pend.gold, at: pend.at,
      name: this._stNameOf(pend.buyerId) || (this.playerState[pend.buyerId] && this.playerState[pend.buyerId].name) || 'Someone',
      reply: null,
    };
    rec.offers = { ...offers };
    rec.pendOffer = null;
    await this.state.storage.put('store_listing:' + rec.id, rec);
  },

  /* ── WITHDRAW (the buyer) and DECLINE (the seller) are one refund ── */
  async _soRefundOne(rec, buyerId, why) {
    const offers = this._soOffers(rec);
    const o = offers[buyerId];
    if (!o) return false;
    delete offers[buyerId];
    rec.offers = { ...offers };
    await this.state.storage.put('store_listing:' + rec.id, rec);
    await this._creditPlayer(buyerId, {
      opId: 'store:' + rec.id + ':offerref:' + o.seq, source: 'market', kind: 'gold',
      payload: { amount: o.gold }, note: why,
    });
    return true;
  },

  async _stOfferWithdraw(listingId, buyerId) {
    await this._stEnsureIndex();
    const rec = this._stIndex.get(listingId);
    if (!rec) return { ok: false, settled: true, error: 'That listing has ended' };
    const did = await this._soRefundOne(rec, buyerId, 'offer withdrawn on ' + this._stLabel(rec));
    if (!did) return { ok: false, settled: true, error: 'You have no offer on that' };
    this._soNotify(rec, rec.sellerId);
    return { ok: true, settled: true, withdrawn: true, offers: this._soPublic(rec) };
  },

  /* ── THE SELLER ANSWERS ──────────────────────────────────────────────
     'yes' settles on the spot. 'no' refunds. 'think' holds the gold and
     records the answer, which is the point of it. */
  async _stOfferReply(listingId, sellerId, buyerId, reply) {
    await this._stEnsureIndex();
    const rec = this._stIndex.get(listingId);
    if (!rec) return { ok: false, settled: true, error: 'That listing has ended' };
    if (rec.sellerId !== sellerId) return { ok: false, settled: true, error: 'That is not your listing' };
    if (OFFER_REPLIES.indexOf(reply) < 0) return { ok: false, settled: true, error: 'Unknown reply' };
    if (rec.sale || rec.releasing) return { ok: false, settled: true, error: 'That listing is being sold' };

    const offers = this._soOffers(rec);
    const o = offers[buyerId];
    if (!o) return { ok: false, settled: true, error: 'No offer to answer' };

    if (reply === 'no') {
      await this._soRefundOne(rec, buyerId, 'offer declined on ' + this._stLabel(rec));
      this._soNotify(rec, buyerId);
      return { ok: true, settled: true, replied: 'no', offers: this._soPublic(rec) };
    }
    if (reply === 'think') {
      offers[buyerId] = { ...o, reply: 'think' };
      rec.offers = { ...offers };
      await this.state.storage.put('store_listing:' + rec.id, rec);
      this._soNotify(rec, buyerId);
      return { ok: true, settled: true, replied: 'think', offers: this._soPublic(rec) };
    }

    /* YES: the gold is already escrowed, so this is the accept-bid shape --
       mark the sale first so a crash mid-settle resumes rather than
       re-listing a sold item (the rec.sale contract in store.js's header). */
    rec.sale = {
      buyerId, buyerName: o.name, price: o.gold, paid: true,
      bidSeq: null, offerSeq: o.seq, at: Date.now(),
    };
    await this.state.storage.put('store_listing:' + rec.id, rec);
    await this._stSettle(rec, buyerId, o.name, o.gold, null);
    this._stRemoveFromIndex(rec);
    await this._scDropThreads(rec.id);
    await this.state.storage.delete('store_listing:' + rec.id);
    this._soNotify(rec, buyerId);
    return { ok: true, settled: true, replied: 'yes', sold: true, price: o.gold };
  },

  /* ── RELEASE EVERY OFFER ─────────────────────────────────────────────
     Called from _stSettle (every sale) and _stRelease (every non-sale), so
     there is no ending that does not pass through here. `exceptSeq` is the
     offer whose escrow WAS the payment and so must not also be refunded --
     the same guard `paidBidSeq` gives the standing bid. */
  async _soReleaseAll(rec, why, exceptSeq) {
    const offers = this._soOffers(rec);
    const ids = Object.keys(offers);
    if (!ids.length) return;
    for (const bid of ids) {
      const o = offers[bid];
      if (exceptSeq != null && o.seq === exceptSeq) continue;
      // eslint-disable-next-line no-await-in-loop
      await this._creditPlayer(bid, {
        opId: 'store:' + rec.id + ':offerref:' + o.seq, source: 'market', kind: 'gold',
        payload: { amount: o.gold }, note: why,
      });
    }
    rec.offers = {};
  },

  /* ── EXPIRY ──────────────────────────────────────────────────────────
     Lazy, on the store's existing sweep (rule 12). Bounded by the same pass:
     a listing's offers are at most MAX_PER_LISTING, so this cannot become an
     unbounded walk. */
  async _soSweepRec(rec, now) {
    const offers = this._soOffers(rec);
    const due = Object.keys(offers).filter((b) => (offers[b].at + STORE_OFFER.OFFER_EXPIRY) <= now);
    for (const b of due) {
      // eslint-disable-next-line no-await-in-loop
      await this._soRefundOne(rec, b, 'offer expired on ' + this._stLabel(rec));
    }
    return due.length;
  },

  /* Tell both sides the offers moved. No new event type beyond these two;
     both are PRIVILEGED (index.js) or a client could fake a seller's Yes. */
  _soNotify(rec, who) {
    const payload = { listingId: rec.id, offers: this._soPublic(rec) };
    if (who) this._soSend(who, 'store_offer_state', payload);
    if (rec.sellerId && rec.sellerId !== who) this._soSend(rec.sellerId, 'store_offer_state', payload);
  },

  /* ── WIRE ─────────────────────────────────────────────────────────── */
  async _handleStoreOffer(session, payload) {
    const me = session && session.id;
    if (!me) return;
    const listingId = this._scListingId(payload && payload.listingId);
    if (!listingId) return;
    const r = await this._stOfferPlace(listingId, me, payload && payload.gold);
    if (!r.ok) this._soSend(me, 'store_offer_error', { listingId, error: r.error });
    else this._soSend(me, 'store_offer_state', { listingId, offers: r.offers });
  },

  async _handleStoreOfferCancel(session, payload) {
    const me = session && session.id;
    if (!me) return;
    const listingId = this._scListingId(payload && payload.listingId);
    if (!listingId) return;
    const r = await this._stOfferWithdraw(listingId, me);
    if (!r.ok) this._soSend(me, 'store_offer_error', { listingId, error: r.error });
    else this._soSend(me, 'store_offer_state', { listingId, offers: r.offers });
  },

  async _handleStoreOfferReply(session, payload) {
    const me = session && session.id;
    if (!me) return;
    const listingId = this._scListingId(payload && payload.listingId);
    const buyerId = this._scListingId(payload && payload.buyerId);
    const reply = payload && payload.reply;
    if (!listingId || !buyerId) return;
    const r = await this._stOfferReply(listingId, me, buyerId, reply);
    if (!r.ok) this._soSend(me, 'store_offer_error', { listingId, error: r.error });
    else this._soSend(me, 'store_offer_state', { listingId, offers: r.offers || [], sold: !!r.sold });
  },
};
