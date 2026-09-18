/* ═══ v2.3.2621: THE LISTING CHAT BUS ═══
 *
 * The store's message threads arrive as three server events
 * (store_dm_thread, store_dm, store_dm_error) and are read by one panel that
 * is not mounted when most of them arrive. Same shape as shopBus and
 * storeToastBus: state outside React, subscribers re-render.
 *
 * It holds ONE listing's threads at a time -- the panel is opened from a row
 * and closed again, and keeping every conversation in memory would be a
 * second copy of a thing the server already owns and bounds.
 *
 * `unread` is the exception and is kept per listing, because the chat icon on
 * a listing ROW has to show a dot whether or not the panel is open. It is a
 * plain count keyed by listing id in a null-proto map (CLAUDE.md rule 4:
 * listing ids are client-supplied as far as this file is concerned).
 */
const listeners = new Set();
const emit = () => { for (const fn of listeners) fn(); };

export const storeChatBus = {
  open: false,
  listingId: null,
  /* The header the mockup draws, straight off the server's answer. */
  head: null,          /* {item, askPrice, expiresAt, sellerName, sellerId, amSeller} */
  threads: [],         /* [{buyerId, buyerName, msgs:[{from,fromName,text,ts}]}] */
  activeBuyer: null,   /* which conversation the seller is reading */
  err: '',
  loading: false,
  offers: [],          /* v2.3.2623: [{buyerId, buyerName, gold, at, expiresAt, reply}] */
  unread: Object.create(null),

  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  openFor(listingId) {
    this.open = true;
    this.listingId = listingId;
    this.head = null;
    this.threads = [];
    this.activeBuyer = null;
    this.err = '';
    this.loading = true;
    this.offers = [];
    delete this.unread[listingId];
    emit();
  },

  close() {
    this.open = false;
    this.listingId = null;
    this.threads = [];
    this.head = null;
    this.err = '';
    emit();
  },

  /* store_dm_thread — the whole picture for one listing. */
  setThread(p) {
    if (!p || p.listingId !== this.listingId) return;
    this.loading = false;
    if (p.gone) { this.err = 'That listing has ended.'; this.threads = []; emit(); return; }
    this.head = {
      item: p.item || null, askPrice: p.askPrice, expiresAt: p.expiresAt,
      sellerName: p.sellerName, sellerId: p.sellerId, amSeller: !!p.amSeller,
      sellerLook: p.sellerLook || null,   /* v2.3.2622 */
    };
    this.threads = Array.isArray(p.threads) ? p.threads : [];
    /* v2.3.2623: opening is the authoritative read of the offers too -- a
       seller whose panel was shut when one landed has no other way to learn
       of it. */
    this.offers = Array.isArray(p.offers) ? p.offers : [];
    if (!this.activeBuyer && this.threads.length) this.activeBuyer = this.threads[0].buyerId;
    emit();
  },

  /* store_dm — one new line, for this listing or another. */
  addMsg(p) {
    if (!p || !p.listingId || !p.msg) return;
    if (p.listingId !== this.listingId || !this.open) {
      this.unread[p.listingId] = (this.unread[p.listingId] || 0) + 1;
      emit();
      return;
    }
    let t = this.threads.find((x) => x.buyerId === p.buyerId);
    if (!t) {
      t = { buyerId: p.buyerId, buyerName: p.msg.fromName || 'Someone', msgs: [] };
      this.threads.push(t);
      if (!this.activeBuyer) this.activeBuyer = t.buyerId;
    }
    t.msgs.push(p.msg);
    emit();
  },

  /* store_offer_state -- the whole offer picture for this listing. */
  setOffers(p) {
    if (!p || p.listingId !== this.listingId) return;
    this.offers = Array.isArray(p.offers) ? p.offers : [];
    this.err = '';
    if (p.sold) this.err = 'Sold.';
    emit();
  },

  setOfferErr(p) {
    if (!p || p.listingId !== this.listingId) return;
    this.err = (p && p.error) || 'The store could not take that offer.';
    emit();
  },

  setErr(p) {
    if (!p) return;
    const why = {
      'too-fast': 'Slow down a moment.',
      gone: 'That listing has ended.',
      'no-thread': 'No conversation to reply to yet.',
      'too-many': 'This listing already has as many conversations as it can hold.',
    };
    this.err = why[p.reason] || 'The store could not send that.';
    this.loading = false;
    emit();
  },

  setActive(buyerId) { this.activeBuyer = buyerId; this.err = ''; emit(); },
  unreadFor(listingId) { return this.unread[listingId] || 0; },
};

if (typeof window !== 'undefined') window.__btStoreChatBus = storeChatBus;
