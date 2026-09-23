/* ═══ v2.3.2475: THE AUCTION HOUSE — PER-LISTING SALES (PHASE 1) ═══
 *
 * The order book next door (market.js) is a BUCKET book: five taxonomy
 * fields make an index key, a resting buy IS a bid for that whole bucket,
 * and the first crossing order executes.  That shape cannot express the
 * thing the owner asked for — "bid or buy THIS sword" — and it can only
 * ever list one kind of goods (a stash weapon), because the bucket key is
 * a weapon taxonomy.  So this is a second, per-LISTING surface beside it
 * rather than a rewrite of it: the order book keeps working unchanged (its
 * suite still pins it), and a listing here is one seller, one pile of
 * goods, one ask price, and at most one live bid.
 *
 * PHASE 1 SCOPE (owner decision D11, docs/BACKLOG-TRIAGE-2026-09-14.md
 * §0.4): stackable inventory items and weapons from the SERVER's weapon
 * stash.  Armour, shields, legs, cosmetics and amulets were NOT listable,
 * because those stashes were client-local (the server held only the
 * equipped slot) and handoff rule 16 forbids escrowing a blob the client
 * supplies.  Phase 2 (v2.3.2523, gearstash.js) moved those stashes
 * server-side; PHASE 3 (v2.3.2531) lists them.
 *
 * GEAR LISTINGS (v2.3.2531) are `kind: 'gear'` and live in storegear.js.
 * Read that module's header before touching them: it carries the two
 * things that make gear different from a weapon — how a piece is NAMED
 * (by its server-assigned `gid`, or by a selector that finds one; never
 * by an index, because the client's stash and ours drift out of order),
 * and the GATE it has to pass.
 *
 * v2.3.2551: that gate is `_gearSellable` (gearprov.js) — the server
 * minted it AND the player still holds it, not worn, not in the post —
 * and the piece's provenance ROW is escrowed inside this record beside
 * the goods (`rec.gearRow`), so the wake-time rebuild below recovers it
 * with no second mechanism.  The two open trust holes this comment used
 * to name ("sell the armour off your own back", "being in a stash is not
 * proof of ownership") are CLOSED by that gate; `caps.storeGear` is kept
 * as an ordinary live-ops kill switch rather than as their bound.
 * Everything else about a gear listing — the markers, the rebuild, the
 * credit-first settle, the opIds — is this file's, unchanged, and that is
 * the point: see _stGoodsCredit.
 *
 * Mixed into GameRoom via Object.assign(GameRoom.prototype, storeMethods)
 * in index.js, same as market.js — escrow has to be a synchronous mutation
 * of the playerState/rpg blobs this DO already owns (handoff rule 9: no
 * cross-DO await between a validation and the commit that depends on it).
 *
 * Storage keys (GameRoom storage, never inside the rpg blob — rule 1):
 *   store_listing:<listingId>   one listing, holding the escrowed goods,
 *                               the live bid, and any in-flight marker
 *
 * ── WHY THE INTENT MARKERS EXIST (read before editing any money path) ──
 *
 * market.js escrows at PLACEMENT, so its record already names everything
 * of value the moment it lands.  A store sale cannot: the buyer's gold
 * arrives at BUY time, after the record exists, so there is a window where
 * money has moved and nothing on disk names whose it was.  A DO restart in
 * that window (a deploy, an eviction) loses it — the exact class of bug
 * v2.3.1184 closed on the order book.
 *
 * So every money move here is preceded by a marker written INTO the
 * listing record, and the wake-time rebuild converges on the marker:
 *   rec.sale     — a buy-now (or an accepted bid) is settling.  Resume iff
 *                  the payment stamp is present (or the money was already
 *                  escrowed by the bid); otherwise clear it and re-list.
 *   rec.pendBid  — a bid is being escrowed.  Promote it iff its debit
 *                  stamp is present; otherwise drop it — no money moved.
 *   rec.releasing — a cancel or an expiry is handing everything back
 *                  (v2.3.2521).  Finish the release and delete; never
 *                  re-list, or the goods and the bid go out twice.
 * Because only records CARRYING a marker need an oplog read, the rebuild
 * costs one paged list() and (almost always) zero extra storage reads —
 * handoff rule 9's second edge: a storage await holds the whole room.
 *
 * Settlement itself is credit-first / delete-last with deterministic
 * opIds, exactly as rule 5/6 require:
 *   store:<id>:goods           the goods leg  (buyer)
 *   store:<id>:gold            the money leg  (seller)
 *   store:<id>:pay             the buyer's payment debit (buy-now)
 *   store:<id>:bid:<seq>       a bidder's escrow debit
 *   store:<id>:bidref:<seq>    an outbid/cancel/expiry refund
 *   store:<id>:refund          goods returned to the seller
 *   store:<id>:unwind          a listing whose record could not be written
 * The goods leg settles FIRST — it is the unique, irreplaceable half of
 * the trade (market.js's v2.3.1184 note, same reasoning).
 *
 * NO ALARMS (rule 12): listings expire lazily.  Every store request runs a
 * rate-limited, bounded sweep; an expired listing refunds its bid and
 * mails the goods back to the seller.
 *
 * The sold notice reuses the mail the economy already has: the seller's
 * gold leg is a _creditPlayer with source 'market', which reaches an
 * online seller as `inbox_delivered` and an offline one through
 * `inbox:<pid>` at their next join.  No new event type, so nothing to add
 * to PRIVILEGED_EVENTS. */

import { SHOP_ITEMS } from './data.js';
/* v2.3.2531: gear listings live in storegear.js and every gear behaviour
   is a METHOD on the room, so this module imports nothing from it at all
   (v2.3.2551 dropped the last import, `isGearField`, when the duplicate
   field check in `_stCreateListing` went -- see the note there). */

export const STORE = {
  /* ═══ v2.3.2619: ONE WEEK, FIXED. NOT A CHOICE. ═══
   * Owner: "don't mess with different duration settings but keep it at one
   * week. I don't see the point of listing something for a shorter time than
   * that." There is no dropdown, no per-listing value and no duration on the
   * wire -- the server never reads one, so there is nothing to validate.
   *
   * THE SWEEP ARITHMETIC, because a 7x lifetime looks like 7x the sweep load
   * and is the opposite. Expiries are spread over the lifetime, so a longer
   * one thins them out. At a FULL shelf (MAX_GLOBAL 2000) the expiries due in
   * one SWEEP_INTERVAL (60s) are 2000 x 60/T:
   *     T = 24h   ->  1.39 per pass   (SWEEP_MAX 20 = 14x headroom)
   *     T = 7d    ->  0.198 per pass  (SWEEP_MAX 20 = 101x headroom)
   * So SWEEP_INTERVAL, SWEEP_MAX and the bounded pass all hold with room to
   * spare, and the scan itself is an in-memory walk of at most MAX_GLOBAL.
   *
   * WHAT DOES TIGHTEN IS THROUGHPUT, and this is the real cost of the change.
   * Steady-state population = listing rate x lifetime, and MAX_GLOBAL caps it
   * at 2000, so the sustainable rate of NEW listings falls 7x:
   *     T = 24h   ->  ~2000 new listings/day before the shelf is full
   *     T = 7d    ->  ~286 new listings/day
   * Past that, _stCreateListing answers "Store is full". With MAX_PER_PLAYER
   * 10 that is ~200 players simultaneously holding every slot, which is far
   * beyond the current player base -- but it is the number to raise
   * (MAX_GLOBAL) if the shelf ever starts refusing sellers, NOT the lifetime.
   *
   * LISTINGS ALREADY LIVE UNDER THE 24h RULE ARE UNAFFECTED and need no
   * migration: `expiresAt` is computed at creation and STORED per record, so
   * an existing listing keeps the expiry it was given and retires on its own
   * 24h schedule. Only listings created after this deploy run a week. Nothing
   * is stranded and nothing is extended retroactively. */
  LISTING_EXPIRY: 604800000,  // 7 days, fixed
  MAX_PER_PLAYER: 10,         // ...and the same per-player ceiling
  MAX_GLOBAL: 2000,           // hard bound on the rebuild's list() (rule 9)
  SWEEP_INTERVAL: 60000,
  SWEEP_MAX: 20,              // expired listings resolved per sweep pass
  LOAD_PAGE: 500,             // rebuild page size
  PAGE_DEFAULT: 20,
  PAGE_MAX: 40,
  BID_LOG_CAP: 10,
  MAX_PRICE: 999999,
  MAX_QTY: 9999,
  MIN_BID_STEP: 1,
};

/* ═══ v2.3.2622: THE BUST SET ═══
 * The wire keys a head-and-shoulders portrait actually reads, and no more.
 * Deliberately EXCLUDES the nine drawing fields (sa/sb/pa/pb/ta/tf/tm/tb/tr):
 * each is a fixed 256 chars and none of them is visible on an 18px disc, so
 * they are 92KB of page weight for nothing. Deliberately INCLUDES bs/hg/fr --
 * build size, height and frame -- because the portrait's fit math scales off
 * them (PORTRAIT_FIT, buildCatalog.js) and a bust drawn at the wrong build is
 * a different person.
 * Short wire keys, as they sit on playerState (TRACK_COSMETIC_KEYS). */
const STORE_BUST_KEYS = [
  'sk',                      // skin
  'hr', 'hc',                // hair + colour
  'fh', 'fhc',               // facial hair + colour
  'hw', 'htc',               // headwear + colour
  'ew', 'ewc',               // eyewear + colour
  'es',                      // eye style (v2.3.2643)
  'sc',                      // species (v2.3.2681)
  'ec',                      // eye colour
  'st', 'stc',               // shirt + colour (the shoulders)
  'bs', 'hg', 'fr',          // build size / height / frame -- the fit math
];

/* The bag's potion filter is keyed off the shop's own consumables
   (isPotionKey -> POTION_THUMBS, src/ui/mobile/dash/InventoryPanel.jsx),
   and SHOP_ITEMS is the table that one mirrors.  Lowercased because the
   ids are camelCase ('manaShard') and inventory keys are not. */
const POTION_KEYS = new Set(Object.keys(SHOP_ITEMS).map((k) => k.toLowerCase()));

export const storeMethods = {
  /* ── derivation: the server says what a listing IS ──────────────────
   *
   * market.js:66-69 documents the hole this avoids: there, the listed
   * taxonomy is client-supplied and nothing checks it against the escrowed
   * weapon, "so a modified client can advertise a copper blade as godly".
   * Here the request names only WHICH of the seller's own goods to list
   * (an inventory key they hold, or a stash index) — every field the store
   * displays is read off the server's own copy after escrow. */
  _stCategory(key) {
    const k = String(key || '').toLowerCase();
    /* Mirror of classify() in src/ui/mobile/dash/InventoryPanel.jsx:34-59,
       so the store's tabs group exactly like the bag's filter chips.  Drift
       here files an item under the wrong tab — cosmetic, not a value bug —
       which is why this is a mirror and not a new authority. */
    if (/sword|bow|staff|spear|axe|dagger|hammer|wand|gauntlet/.test(k)) return 'weapon';
    if (/helm|cuirass|armor|shield|robe|cape|boots|gloves|mail|plate/.test(k)) return 'armor';
    if (POTION_KEYS.has(k)) return 'potion';
    if (/potion|elixir|tonic|salve|brew|tincture|draught/.test(k)) return 'potion';
    return 'crafting';
  },

  // Display fields, read off the escrowed server-side goods only.
  _stDisplay(kind, invKey, weapon) {
    if (kind === 'weapon') {
      const w = weapon || {};
      return {
        name: typeof w.name === 'string' ? w.name.slice(0, 40) : 'Weapon',
        type: typeof w.type === 'string' ? w.type : null,
        tier: typeof w.tier === 'string' ? w.tier : null,
        tierMult: typeof w.tierMult === 'number' ? w.tierMult : 1,
        element1: typeof w.element1 === 'string' ? w.element1 : null,
        element2: typeof w.element2 === 'string' ? w.element2 : null,
        quality: typeof w.quality === 'string' ? w.quality : null,
        hardness: typeof w.hardness === 'number' ? w.hardness : 0,
        temper: typeof w.temper === 'number' ? w.temper : 0,
      };
    }
    return { name: String(invKey || ''), invKey: String(invKey || '') };
  },

  _stLabel(rec) {
    const n = (rec.disp && rec.disp.name) || 'item';
    if (rec.kind === 'weapon' || rec.kind === 'gear') return n;
    return rec.qty > 1 ? rec.qty + 'x ' + n : n;
  },

  /* ═══ v2.3.2531: ONE PLACE THAT SAYS WHAT A LISTING IS MADE OF ═══
     `_stSettle`, `_stRelease` and the create-path unwind each used to
     spell out the same `kind === 'weapon' ? weapon : item` ternary, in
     two halves (the credit kind and its payload) that had to agree.
     Adding a third kind to three sites in six places is how one of them
     ends up crediting `{ invKey: null }` -- which _applyCreditToPs
     accepts and silently discards, destroying the goods.

     So the shape is derived ONCE, here, and every money path reads it.
     That is also what puts gear under the v2.3.2521 `releasing` marker
     and the whole wake-time convergence for free: a gear listing is the
     same record travelling the same paths, not a second mechanism
     beside them. */
  _stGoodsCredit(rec) {
    if (rec.kind === 'weapon') return { kind: 'weapon', payload: { weapon: rec.weapon } };
    /* v2.3.2551: ...and the piece's detached provenance ROW, which has
       travelled inside this record since the escrow took it (rule 7: money
       at rest lives in storage).  It is what makes the piece arrive
       PROVABLE on the far side -- `_creditPlayer` grants it to the
       recipient before the piece lands, and `_gearProvMarkDelivered` then
       DERIVES the mark by asking the ledger rather than trusting this
       payload.  A gear listing written before v2.3.2551 has no `gearRow`,
       so `row` is undefined and the piece arrives `legacy`: usable,
       unsellable, never refused.  That is the deploy-order answer for the
       listings already resting on the shelf when this ships. */
    if (rec.kind === 'gear') return { kind: 'gear', payload: { field: rec.gearField, piece: rec.gear, row: rec.gearRow || null } };
    return { kind: 'item', payload: { invKey: rec.invKey, count: rec.qty } };
  },

  /* The public view of a listing.  The escrowed weapon BLOB never goes on
     the wire — a buyer needs the derived stats above, not the object the
     server will hand them, and shipping the blob is how a client learns to
     re-post it.  (The order book does ship it; that is its legacy shape,
     not a pattern to copy.) */
  /* ═══ v2.3.2620: THE SELLER'S ICON, AND WHAT IT COSTS ═══
   * Owner: "Add the players tiny icon (similar to how the player icons are
   * displayed elsewhere in the game) next to their listing."
   *
   * Elsewhere in the game that icon is exactly two things (PlayerListPanel,
   * InspectPlayerPanel): the player's `avatar` when they have one, and a
   * coloured disc bearing the first letter of their name when they do not.
   * `avatar` is a Hemi Bro NFT image URL and only VERIFIED HOLDERS have one,
   * so the disc is the common case, not the fallback-of-last-resort.
   *
   * WHAT IS STORED AND WHAT IS NOT, which is the whole design:
   *
   *   sellerColor  IS stored on the record, like sellerName. Seven characters.
   *                It is what the disc needs, and the disc is what most
   *                listings will draw, so it has to survive the seller
   *                logging off.
   *   sellerAvatar IS NOT stored. It is resolved HERE, per projection, off
   *                playerState the room already holds.
   *
   * That asymmetry is deliberate and it is about rule 9's second edge. An
   * avatar URL runs 150-250 chars (join.js caps cosmetics at 512). Stored,
   * that is up to 512 bytes x MAX_GLOBAL 2000 = ~1MB of listing records --
   * and the wake-time rebuild pages through EVERY one of them with the input
   * gate held (LOAD_PAGE 500, so ~250KB of avatar per page, read before the
   * room answers anything). Resolving live costs no storage, no extra reads,
   * and no rebuild weight at all.
   *
   * The cost it DOES have is honest: an offline seller's listing shows the
   * disc instead of their Bro picture. That is the same fallback the player
   * list already shows for the majority of players, so it degrades into
   * something the game draws everywhere rather than into a hole.
   *
   * NOTHING NEW IS EXPOSED. name, color and avatar are already broadcast to
   * every player in the room (TRACK_COSMETIC_KEYS, index.js) and rendered at
   * each other by PlayerListPanel. This ships the same three fields to the
   * same audience. No zone, no position, no id beyond the sellerId the panel
   * already had for its "this one is yours" check. */
  /* ═══ v2.3.2622: THE SELLER'S ACTUAL FACE ═══
   * Owner: "Make the player's actual profile picture be there instead of the M."
   *
   * The M was the game's existing fallback for a player with no Hemi Bro
   * picture, and most players have none -- so most listings showed a letter.
   * What the owner wants is the BRO THEY BUILT, which the client can already
   * draw for anybody: characterPortrait.js's `portraitOptsFromPeer`, the same
   * recipe the inspect card, the trade window and the character picker use.
   * It needs the seller's cosmetics.
   *
   * WHICH COSMETICS, AND WHY NOT ALL OF THEM. The peer set is 28 fields
   * (PEER_COSMETIC_FIELDS, src/networking/peerCosmetics.js) and NINE of them
   * are DRAWINGS -- shirt prints, pants prints, five tattoo zones -- each a
   * fixed 256 characters (join.js cosmeticCap). Shipping the whole set would
   * be ~2.3KB per listing and ~92KB on a PAGE_MAX page, for marks that are
   * physically invisible on an 18px disc. So this is the BUST SET: the
   * head-and-shoulders fields and nothing else. Measured at ~190 bytes.
   *
   * SNAPSHOTTED, not resolved live like sellerAvatar. The avatar could be
   * resolved per projection because its fallback (the colour disc) is
   * something the game draws everywhere anyway. This cannot: the whole point
   * of the change is that the face is THERE, and a face that vanishes when
   * the seller logs off is the complaint again with extra steps. The cost is
   * ~190 bytes x MAX_GLOBAL 2000 = ~380KB of listing records, and ~95KB per
   * LOAD_PAGE of the wake-time rebuild -- an order of magnitude under the
   * ~1MB the full avatar URL would have cost (v2.3.2620), which is why that
   * one is still resolved live and this one is not.
   *
   * NOTHING NEW IS EXPOSED: every one of these fields is already relayed to
   * every player in the room (TRACK_COSMETIC_KEYS, index.js) and already
   * drawn at each other by the inspect card. Same fields, same audience.
   *
   * Values are catalog ids the client's own sanitisers judge at the point
   * they reach a canvas (the peerCosmetics.js posture: this is a rename
   * table, not validation). Bounded here anyway -- short strings only -- so
   * one seller cannot push a long blob into every shelf page. */
  _stBustLook(ps) {
    if (!ps) return null;
    const out = {};
    let any = false;
    for (const k of STORE_BUST_KEYS) {
      const v = ps[k];
      if (typeof v === 'string' && v && v.length <= 24) { out[k] = v; any = true; }
      else if (typeof v === 'number' && Number.isFinite(v)) { out[k] = v; any = true; }
    }
    return any ? out : null;
  },

  /* v2.3.2623: the store's own price ceiling, so storeoffer.js bounds an
     offer against the same number a listing is bounded by rather than
     keeping a second copy of it. */
  _stMaxPrice() { return STORE.MAX_PRICE; },

  _stColor(v) {
    /* A CSS colour that is about to be a `background` — bounded, and only
       the shape the character creator actually produces. */
    return (typeof v === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(v)) ? v : null;
  },

  _stAvatar(pid) {
    const ps = this.playerState[pid];
    const v = ps && ps.avatar;
    if (typeof v !== 'string' || !v || v.length > 512) return null;
    /* It lands in an <img src>. https: and same-origin only — stricter than
       the relay path this value already travels on, because a new render
       site is the wrong place to widen a trust boundary. */
    return (v.startsWith('https://') || v.startsWith('/')) ? v : null;
  },

  _stPublic(o) {
    const av = this._stAvatar(o.sellerId);
    return {
      id: o.id,
      sellerId: o.sellerId,
      sellerName: o.sellerName,
      sellerColor: o.sellerColor || null,          /* v2.3.2620: stored, 7 chars */
      /* v2.3.2622: the bust set (~198 bytes/row), and ONLY when there is no
         avatar to draw instead. The client prefers a Hemi Bro picture over a
         composed portrait, so shipping both is one of the two wasted on every
         row -- and both together took a full page to 29.7KB against a 32KB
         bound, which is the kind of headroom that runs out on the next field.
         Either-or takes the worst case back to ~22KB.
         Safe because the avatar is a plain URL: a row already on screen keeps
         drawing it after the seller logs off, and the next browse (any tab,
         filter or action refreshes) ships the stored look instead. */
      sellerLook: av ? null : (o.sellerLook || null),
      sellerAvatar: av,                            /* v2.3.2620: resolved live, never stored */
      kind: o.kind,
      cat: o.cat,
      qty: o.qty,
      askPrice: o.askPrice,
      createdAt: o.createdAt,
      expiresAt: o.expiresAt,
      disp: o.disp,
      topBid: o.topBid ? { name: o.topBid.bidderName, bidderId: o.topBid.bidderId, amount: o.topBid.amount, at: o.topBid.at } : null,
      bidCount: Array.isArray(o.bids) ? o.bids.length : 0,
      selling: !!o.sale,
    };
  },

  /* ── index ────────────────────────────────────────────────────────
     One Map of live listings, rebuilt once per DO wake.  Bounded by
     STORE.MAX_GLOBAL (enforced at placement) and read in pages, because
     an unbounded list() holds the room's input gate for its whole
     duration (rule 9, v2.3.2438). */
  async _stEnsureIndex() {
    if (this._stIndex) return;
    this._stIndex = new Map();
    this._stCounts = new Map();
    let after = null;
    for (;;) {
      const opts = { prefix: 'store_listing:', limit: STORE.LOAD_PAGE };
      if (after) opts.startAfter = after;
      const page = await this.state.storage.list(opts);
      let last = null;
      for (const [k, rec] of page) {
        last = k;
        if (!rec || !rec.id) { await this.state.storage.delete(k); continue; }
        if (await this._stConverge(rec)) this._stAddToIndex(rec);
      }
      if (page.size < STORE.LOAD_PAGE || !last) break;
      after = last;
    }
  },

  /* Converge one record read off disk.  Returns true if it should be
     re-listed, false if it was resolved (and deleted) here.  Only records
     carrying an in-flight marker cost an oplog read. */
  async _stConverge(rec) {
    /* v2.3.2521: a cancel or an expiry was mid-flight when the DO died.
       Finish it rather than putting it back on the shelf — every leg of
       _stRelease is idempotent through its own opId, so a refund that
       already landed reports `dup` and nobody is paid twice, and the
       release ends in the delete the crash missed. */
    if (rec.releasing) {
      await this._stRelease(rec, rec.releasing.why || 'listing cancelled');
      return false;
    }
    if (rec.sale) {
      // A buy-now or an accepted bid was mid-settlement when the DO died.
      const paid = rec.sale.paid || (await this._opSeen('store:' + rec.id + ':pay'));
      if (paid) {
        await this._stSettle(rec, rec.sale.buyerId, rec.sale.buyerName, rec.sale.price, rec.sale.bidSeq || null);
        /* v2.3.2621: the conversation goes with the listing it was about, and
       goes FIRST -- a crash between the two then leaves a listing whose
       thread is empty (which heals itself) rather than a thread nothing
       will ever delete (storechat.js). */
    await this._scDropThreads(rec.id);
    await this.state.storage.delete('store_listing:' + rec.id);
        return false;
      }
      // The money never moved: the listing simply goes back on the shelf.
      rec.sale = null;
      await this.state.storage.put('store_listing:' + rec.id, rec);
    }
    if (rec.pendBid) {
      const pb = rec.pendBid;
      if (await this._opSeen('store:' + rec.id + ':bid:' + pb.seq)) {
        await this._stPromoteBid(rec, pb);
      } else {
        rec.pendBid = null;
        await this.state.storage.put('store_listing:' + rec.id, rec);
      }
    }
    /* v2.3.2623: an OFFER caught mid-escrow by the restart, converged the
       same way and for the same reason: promote it iff its debit stamp is
       present, drop it otherwise, because then no money moved. Without this
       a buyer's gold could be taken by the debit and belong to nothing. */
    if (rec.pendOffer) {
      const po = rec.pendOffer;
      if (await this._opSeen('store:' + rec.id + ':offer:' + po.seq)) {
        await this._soPromote(rec, po);
      } else {
        rec.pendOffer = null;
        await this.state.storage.put('store_listing:' + rec.id, rec);
      }
    }
    return true;
  },

  _stAddToIndex(rec) {
    this._stIndex.set(rec.id, rec);
    this._stCounts.set(rec.sellerId, (this._stCounts.get(rec.sellerId) || 0) + 1);
  },

  _stRemoveFromIndex(rec) {
    if (!this._stIndex.delete(rec.id)) return;
    const n = (this._stCounts.get(rec.sellerId) || 1) - 1;
    if (n <= 0) this._stCounts.delete(rec.sellerId);
    else this._stCounts.set(rec.sellerId, n);
  },

  /* ── HTTP surface ─────────────────────────────────────────────────
     Same shape as the order book's: routed from the outer worker to this
     room, every mutating response carries `settled: true` (rule 19) and
     every mutating request carries the caller's own session token
     (httpauth.js — a public playerId was never authentication, v2.3.1178). */
  async _storeFetch(request) {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/store', '');
    const H = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
    const deny = () => new Response(JSON.stringify({ ok: false, settled: true, error: 'Not authorized' }), { status: 403, headers: H });
    try {
      await this._stEnsureIndex();
      await this._stSweep();

      if (request.method === 'GET' && path.startsWith('/browse')) {
        const out = this._stBrowse(url.searchParams.get('cat'), url.searchParams.get('cursor'), Number(url.searchParams.get('limit')));
        return new Response(JSON.stringify({ ok: true, ...out }), { headers: H });
      }
      if (request.method === 'GET' && path.startsWith('/mine')) {
        const pid = url.searchParams.get('playerId');
        const mine = [];
        for (const rec of this._stIndex.values()) if (rec.sellerId === pid) mine.push(this._stPublic(rec));
        const bidding = [];
        for (const rec of this._stIndex.values()) {
          if (rec.topBid && rec.topBid.bidderId === pid && rec.sellerId !== pid) bidding.push(this._stPublic(rec));
        }
        mine.sort((a, b) => b.createdAt - a.createdAt);
        bidding.sort((a, b) => b.createdAt - a.createdAt);
        return new Response(JSON.stringify({ ok: true, listings: mine, bidding }), { headers: H });
      }
      if (request.method === 'POST') {
        const body = await request.json();
        const pid = body && body.playerId;
        if (!this._httpAuthCheck(pid, request)) return deny();
        let result;
        if (path.startsWith('/list')) result = await this._stCreateListing(body);
        else if (path.startsWith('/buy')) result = await this._stBuyNow(body.listingId, pid);
        else if (path.startsWith('/bid')) result = await this._stPlaceBid(body.listingId, pid, body.amount);
        else if (path.startsWith('/accept')) result = await this._stAcceptBid(body.listingId, pid);
        else return new Response(JSON.stringify({ ok: false, error: 'Not found' }), { status: 404, headers: H });
        return new Response(JSON.stringify(result), { headers: H });
      }
      if (request.method === 'DELETE' && path.startsWith('/cancel')) {
        const pid = url.searchParams.get('playerId');
        if (!this._httpAuthCheck(pid, request)) return deny();
        const result = await this._stCancel(url.searchParams.get('id'), pid);
        return new Response(JSON.stringify(result), { headers: H });
      }
      return new Response(JSON.stringify({ ok: false, error: 'Not found' }), { status: 404, headers: H });
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500, headers: H });
    }
  },

  /* ── browse: ONE PAGE, never the whole shelf ───────────────────────
     `_mktQueryOrders` walks every bucket and hands back up to 100 whole
     order records including their escrowed blobs; at a few thousand
     listings that is a response nobody can render and a payload nobody
     asked for.  This pages instead: newest first, the cursor is the last
     row's own sort key, so a listing that sells between two pages shifts
     nothing (no offset to slide). */
  _stBrowse(cat, cursor, limit) {
    const lim = Math.min(STORE.PAGE_MAX, Math.max(1, Math.floor(limit) || STORE.PAGE_DEFAULT));
    const wanted = cat && cat !== 'all' ? String(cat) : null;
    const rows = [];
    for (const rec of this._stIndex.values()) {
      if (rec.sale) continue;                     // mid-settlement: not for sale
      if (wanted && rec.cat !== wanted) continue;
      rows.push(rec);
    }
    // Newest first; the id breaks ties so the order is total and stable.
    rows.sort((a, b) => (b.createdAt - a.createdAt) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    let start = 0;
    if (cursor) {
      const i = rows.findIndex((r) => r.createdAt + ':' + r.id === cursor);
      start = i === -1 ? 0 : i + 1;
    }
    const page = rows.slice(start, start + lim);
    const nextCursor = (start + lim) < rows.length && page.length
      ? page[page.length - 1].createdAt + ':' + page[page.length - 1].id
      : null;
    return { listings: page.map((r) => this._stPublic(r)), nextCursor, total: rows.length };
  },

  /* ── list: escrow the goods, THEN write the record ──────────────────
     Rule 7: money at rest escrows at placement.  The goods leave the
     seller now and live in the record until someone buys them, the seller
     delists, or it expires.

     The order of the two is forced: the record is what every refund path
     keys off, so if the put throws AFTER the goods have left, the seller
     is short an item nothing names (market.js's v2.3.1971 incident —
     "escrow that can't be written is escrow that never existed").  Hence
     the unwind below. */
  async _stCreateListing(body) {
    const { playerId, kind, price } = body || {};
    if (!playerId) return { ok: false, settled: true, error: 'Missing fields' };
    const p = Math.floor(Number(price) || 0);
    if (!(p >= 1 && p <= STORE.MAX_PRICE)) return { ok: false, settled: true, error: 'Invalid price' };
    /* v2.3.2531: 'gear' joins the roster, and it is gated on its OWN
       narrow cap rather than on `caps.store` — the whole point of the
       flag is that the owner can switch gear listings off from live-ops
       without touching the store the rest of the game is using.  join.js
       spreads `..._liveFlags` last over the baked caps, so writing
       `storeGear: false` into the `liveflags` key stops the offer AND,
       here, stops the acceptance: a client that kept its button would
       still be refused. */
    if (kind !== 'item' && kind !== 'weapon' && kind !== 'gear') return { ok: false, settled: true, error: 'Invalid kind' };
    if (kind === 'gear' && this._stGearOff()) {
      return { ok: false, settled: true, error: 'Gear cannot be listed right now' };
    }

    const ps = this.playerState[playerId];
    if (!ps) return { ok: false, settled: true, error: 'Not in game' };
    if ((this._stCounts.get(playerId) || 0) >= STORE.MAX_PER_PLAYER) {
      return { ok: false, settled: true, error: 'Max ' + STORE.MAX_PER_PLAYER + ' listings' };
    }
    if (this._stIndex.size >= STORE.MAX_GLOBAL) return { ok: false, settled: true, error: 'Store is full' };

    const id = crypto.randomUUID();
    const escrowOp = 'store:' + id + ':esc';
    let invKey = null; let weapon = null; let qty = 1;
    let gear = null; let gearField = null; let gearRow = null;   /* v2.3.2531; row v2.3.2551 */

    if (kind === 'item') {
      const k = typeof body.invKey === 'string' ? body.invKey : '';
      /* Same two gates the trade sanitizer uses (trade.js:76-96): a bounded
         key, and never an Object.prototype member — `inv.constructor` is
         truthy and inherited, so an ownership check that indexes the map
         directly passes on goods nobody holds (v2.3.1971). */
      if (!k || k.length > 32 || Object.prototype.hasOwnProperty.call(Object.prototype, k)) {
        return { ok: false, settled: true, error: 'Invalid item' };
      }
      qty = Math.floor(Number(body.qty) || 0);
      if (!(qty >= 1 && qty <= STORE.MAX_QTY)) return { ok: false, settled: true, error: 'Invalid quantity' };
      const took = await this._escrowTakeItem(playerId, k, qty, escrowOp);
      if (!took.ok) return { ok: false, settled: true, error: 'You do not have that' };
      invKey = k;
    } else if (kind === 'weapon') {
      /* v2.3.2531: `else if`, not `else`.  It was a bare `else` when
         'weapon' was the only other kind, and the gear branch below
         silently fell into it -- a gear request went looking for
         `body.stashIndex` in the WEAPON stash and came back "Item not in
         stash".  Harmless here only because that path refuses an
         out-of-range index; a third kind arriving into a branch that
         SPLICED first would have been an escrow of the wrong goods. */
      const idx = Math.floor(Number(body.stashIndex));
      if (!Number.isFinite(idx) || idx < 0 || !Array.isArray(ps.weaponStash) || idx >= ps.weaponStash.length) {
        return { ok: false, settled: true, error: 'Item not in stash' };
      }
      // Rule 16: the server's own copy by index — body.item is ignored.
      weapon = this._sanitizeWeapon(ps.weaponStash[idx]);
      if (!weapon) return { ok: false, settled: true, error: 'Item not in stash' };
      ps.weaponStash.splice(idx, 1);
      this._saveRpg(playerId, ps);
      this._queuePlayerStateFlush(playerId);
    }

    /* v2.3.2531: the gear branch.  Everything it needs that a weapon does
       not — resolving a selector against the server's own list, the
       strict-provenance rule — is storegear.js's;
       what comes back is the server's own piece, already spliced out of
       the server's own stash and saved.  Same shape as the weapon branch
       above, one call instead of eight lines, because getting that
       sequence wrong is how escrow goes missing. */
    if (kind === 'gear') {
      /* v2.3.2551: the field check that used to sit here is gone, not
         moved -- `_stGearEscrow` already does it, and a second gate in
         front of the first is how a refusal loses the `reason` the client
         needs (it answered a bare 'Invalid item' with no reason string). */
      const got = this._stGearEscrow(playerId, ps, body);
      /* v2.3.2551: the REASON rides out with the error.  `_gearSellable`
         answers a refusal with a stable string (`worn`, `in_mail`,
         `legacy`, `cosmetic`, `not_held`, `wrong_slot`) and the client
         keys its explanation off it -- #648 promised the player would be
         told WHY a piece cannot be sold and nothing read the mark.  The
         human sentence travels too, so a client that does not know a
         future reason string still has something to show. */
      if (!got.ok) return { ok: false, settled: true, reason: got.reason, error: got.error };
      gear = got.piece;
      gearField = got.field;
      gearRow = got.row;
    }

    const now = Date.now();
    const rec = {
      id,
      sellerId: playerId,
      sellerName: (typeof ps.name === 'string' && ps.name) ? ps.name.slice(0, 24) : (this._stNameOf(playerId) || 'Someone'),
      /* v2.3.2620: snapshotted beside the name and for the same reason --
         the disc has to keep working once the seller has logged off. */
      sellerColor: this._stColor(ps.color),
      /* v2.3.2622: snapshotted beside the name and the colour, and for a
         stronger version of the same reason -- the seller's FACE has to keep
         working once they have logged off, which is the whole ask. */
      sellerLook: this._stBustLook(ps),
      kind,
      invKey,
      weapon,
      /* v2.3.2531: the escrowed PIECE and which list it came out of.
         `gearField` is what the refund and the goods leg hand back, so it
         is part of the record from the moment the record exists — a
         refund that did not know the list would have nowhere to put it. */
      gear,
      gearField,
      /* v2.3.2551: the piece's detached provenance row, escrowed INSIDE
         this record beside the goods rather than flagged in place.  That
         means the store's existing wake-time rebuild is what recovers it
         -- no second recovery mechanism, and no `escrowed: true` flag that
         could strand a piece forever if a listing record went missing. */
      gearRow,
      qty: (kind === 'weapon' || kind === 'gear') ? 1 : qty,
      cat: kind === 'weapon' ? 'weapon'
        : kind === 'gear' ? this._stGearCategory()
        : this._stCategory(invKey),
      disp: kind === 'gear' ? this._stGearDisplay(gearField, gear) : this._stDisplay(kind, invKey, weapon),
      askPrice: p,
      createdAt: now,
      expiresAt: now + STORE.LISTING_EXPIRY,
      bidSeq: 0,
      topBid: null,
      pendBid: null,
      bids: [],
      sale: null,
    };

    try {
      await this.state.storage.put('store_listing:' + id, rec);
    } catch (err) {
      /* Nothing is stamped or credited yet, so this is a plain restore —
         through _creditPlayer so a seller who vanished between the escrow
         and the failure still gets their goods, in the mail. */
      /* v2.3.2531: through the same derivation every other money path
         uses, so a gear listing whose record could not be written hands
         the PIECE back rather than an `{ invKey: null }` the inbox would
         accept and quietly drop. */
      const goods = this._stGoodsCredit(rec);
      await this._creditPlayer(playerId, {
        opId: 'store:' + id + ':unwind', source: 'market',
        kind: goods.kind, payload: goods.payload,
        note: 'listing failed',
      });
      throw err;
    }

    this._stAddToIndex(rec);
    return { ok: true, settled: true, listing: this._stPublic(rec) };
  },

  // The display name for a seller, from the session the room already has.
  _stNameOf(playerId) {
    for (const [, s] of this.sessions) if (s.id === playerId) return s.name;
    return null;
  },

  /* ── buy now ──────────────────────────────────────────────────────── */
  async _stBuyNow(listingId, buyerId) {
    const rec = this._stIndex.get(String(listingId || ''));
    if (!rec) return { ok: false, settled: true, error: 'That listing is gone' };
    if (rec.sale || rec.pendBid) return { ok: false, settled: true, error: 'Someone is buying that right now' };
    if (rec.sellerId === buyerId) return { ok: false, settled: true, error: 'That is your own listing' };
    const ps = this.playerState[buyerId];
    if (!ps) return { ok: false, settled: true, error: 'Not in game' };
    if ((ps.coins || 0) < rec.askPrice) return { ok: false, settled: true, error: 'Not enough gold' };

    // Intent first (see the header): the record names the buyer BEFORE any
    // money moves, so a restart mid-sale finishes it instead of losing it.
    rec.sale = { buyerId, buyerName: this._stNameOf(buyerId) || 'Someone', price: rec.askPrice, paid: false, bidSeq: null, at: Date.now() };
    await this.state.storage.put('store_listing:' + rec.id, rec);

    const paid = await this._escrowDebitGold(buyerId, rec.askPrice, 'store:' + rec.id + ':pay');
    if (!paid.ok) {
      rec.sale = null;
      await this.state.storage.put('store_listing:' + rec.id, rec);
      return { ok: false, settled: true, error: 'Not enough gold' };
    }

    const price = rec.sale.price;
    const buyerName = rec.sale.buyerName;
    await this._stSettle(rec, buyerId, buyerName, price, null);
    this._stRemoveFromIndex(rec);
    /* v2.3.2621: the conversation goes with the listing it was about, and
       goes FIRST -- a crash between the two then leaves a listing whose
       thread is empty (which heals itself) rather than a thread nothing
       will ever delete (storechat.js). */
    await this._scDropThreads(rec.id);
    await this.state.storage.delete('store_listing:' + rec.id);
    return { ok: true, settled: true, bought: true, price, listing: this._stPublic(rec) };
  },

  /* ── bid ──────────────────────────────────────────────────────────
     A bid is gold at rest, so it escrows the moment it is placed (rule 7)
     and the previous bidder is refunded in the same event.  A bid that
     reaches the ask is simply a purchase — there is nothing left for the
     seller to decide, and leaving it resting would let a listing sit
     "sold" without settling. */
  async _stPlaceBid(listingId, bidderId, amount) {
    const rec = this._stIndex.get(String(listingId || ''));
    if (!rec) return { ok: false, settled: true, error: 'That listing is gone' };
    if (rec.sale || rec.pendBid) return { ok: false, settled: true, error: 'Someone is buying that right now' };
    if (rec.sellerId === bidderId) return { ok: false, settled: true, error: 'That is your own listing' };
    const amt = Math.floor(Number(amount) || 0);
    if (!(amt >= 1 && amt <= STORE.MAX_PRICE)) return { ok: false, settled: true, error: 'Invalid bid' };
    if (amt >= rec.askPrice) return this._stBuyNow(listingId, bidderId);
    const floor = rec.topBid ? rec.topBid.amount + STORE.MIN_BID_STEP : 1;
    if (amt < floor) return { ok: false, settled: true, error: 'Bid at least ' + floor };
    const ps = this.playerState[bidderId];
    if (!ps) return { ok: false, settled: true, error: 'Not in game' };
    if ((ps.coins || 0) < amt) return { ok: false, settled: true, error: 'Not enough gold' };

    const seq = (rec.bidSeq || 0) + 1;
    rec.pendBid = { seq, bidderId, bidderName: this._stNameOf(bidderId) || 'Someone', amount: amt, at: Date.now() };
    await this.state.storage.put('store_listing:' + rec.id, rec);

    const took = await this._escrowDebitGold(bidderId, amt, 'store:' + rec.id + ':bid:' + seq);
    if (!took.ok) {
      rec.pendBid = null;
      await this.state.storage.put('store_listing:' + rec.id, rec);
      return { ok: false, settled: true, error: 'Not enough gold' };
    }
    await this._stPromoteBid(rec, rec.pendBid);
    return { ok: true, settled: true, bid: true, amount: amt, listing: this._stPublic(rec) };
  },

  /* Promote an escrowed bid to the top: refund whoever it outbid, then
     write the record.  Idempotent — the refund carries the outbid bid's
     own sequence number, so replaying this after a restart pays once. */
  async _stPromoteBid(rec, pend) {
    const prev = rec.topBid;
    if (prev && prev.seq !== pend.seq) {
      await this._creditPlayer(prev.bidderId, {
        opId: 'store:' + rec.id + ':bidref:' + prev.seq, source: 'market', kind: 'gold',
        payload: { amount: prev.amount }, note: 'outbid on ' + this._stLabel(rec),
      });
    }
    rec.bidSeq = pend.seq;
    rec.topBid = { seq: pend.seq, bidderId: pend.bidderId, bidderName: pend.bidderName, amount: pend.amount, at: pend.at };
    rec.pendBid = null;
    if (!Array.isArray(rec.bids)) rec.bids = [];
    rec.bids.push({ seq: pend.seq, name: pend.bidderName, amount: pend.amount, at: pend.at });
    if (rec.bids.length > STORE.BID_LOG_CAP) rec.bids.splice(0, rec.bids.length - STORE.BID_LOG_CAP);
    await this.state.storage.put('store_listing:' + rec.id, rec);
  },

  /* ── the seller takes the top bid ──────────────────────────────────
     The bidder's gold is already escrowed, so `paid: true` on the marker:
     there is no debit left to make and the rebuild must not look for one. */
  async _stAcceptBid(listingId, sellerId) {
    const rec = this._stIndex.get(String(listingId || ''));
    if (!rec) return { ok: false, settled: true, error: 'That listing is gone' };
    if (rec.sellerId !== sellerId) return { ok: false, settled: true, error: 'Not yours' };
    if (rec.sale || rec.pendBid) return { ok: false, settled: true, error: 'Someone is buying that right now' };
    if (!rec.topBid) return { ok: false, settled: true, error: 'No bids yet' };

    const bid = rec.topBid;
    rec.sale = { buyerId: bid.bidderId, buyerName: bid.bidderName, price: bid.amount, paid: true, bidSeq: bid.seq, at: Date.now() };
    await this.state.storage.put('store_listing:' + rec.id, rec);

    await this._stSettle(rec, bid.bidderId, bid.bidderName, bid.amount, bid.seq);
    this._stRemoveFromIndex(rec);
    /* v2.3.2621: the conversation goes with the listing it was about, and
       goes FIRST -- a crash between the two then leaves a listing whose
       thread is empty (which heals itself) rather than a thread nothing
       will ever delete (storechat.js). */
    await this._scDropThreads(rec.id);
    await this.state.storage.delete('store_listing:' + rec.id);
    return { ok: true, settled: true, accepted: true, price: bid.amount, listing: this._stPublic(rec) };
  },

  /* ── settlement ────────────────────────────────────────────────────
     Credit-first, delete-last (rule 6).  Goods before gold: the goods are
     the irreplaceable half (market.js v2.3.1184).  `paidBidSeq` names a
     bid whose escrow IS the payment, so it must not also be refunded;
     any OTHER live bid is refunded here, because the listing is gone. */
  async _stSettle(rec, buyerId, buyerName, price, paidBidSeq) {
    const label = this._stLabel(rec);
    const goods = this._stGoodsCredit(rec);   /* v2.3.2531 */
    await this._creditPlayer(buyerId, {
      opId: 'store:' + rec.id + ':goods', source: 'market',
      kind: goods.kind, payload: goods.payload,
      note: label + ' bought',
    });
    await this._creditPlayer(rec.sellerId, {
      opId: 'store:' + rec.id + ':gold', source: 'market', kind: 'gold',
      payload: { amount: price },
      note: label + ' sold to ' + (buyerName || 'someone') + ' for ' + price,
    });
    if (rec.topBid && rec.topBid.seq !== paidBidSeq) {
      await this._creditPlayer(rec.topBid.bidderId, {
        opId: 'store:' + rec.id + ':bidref:' + rec.topBid.seq, source: 'market', kind: 'gold',
        payload: { amount: rec.topBid.amount }, note: 'bid returned on ' + label,
      });
    }
    /* v2.3.2623: ...and every ESCROWED OFFER, for the same reason and with
       the same guard. The listing is gone, so nobody's gold may stay locked
       against it. `rec.sale.offerSeq` names the offer whose escrow WAS the
       payment (an accepted offer) and so must not also be refunded -- exactly
       what paidBidSeq does for the standing bid one line up.
       Here rather than at each call site DELIBERATELY: buy-now, accept-bid
       and accept-offer all funnel through this function, so "a sale left
       somebody's gold locked" has one place to be wrong instead of three. */
    await this._soReleaseAll(rec, 'offer returned on ' + label,
      (rec.sale && rec.sale.offerSeq) || null);
  },

  /* ── cancel / expiry ───────────────────────────────────────────────
     Both land here: refund the live bid, mail the goods home, delete the
     record LAST.  Rule 6 — never refund over a stamped payout, or a crash
     between a settlement's credits and its delete becomes a double-pay. */
  async _stRelease(rec, why) {
    if (await this._opSeen('store:' + rec.id + ':goods')) {
      this._stRemoveFromIndex(rec);
      /* v2.3.2621: the conversation goes with the listing it was about, and
       goes FIRST -- a crash between the two then leaves a listing whose
       thread is empty (which heals itself) rather than a thread nothing
       will ever delete (storechat.js). */
    await this._scDropThreads(rec.id);
    await this.state.storage.delete('store_listing:' + rec.id);
      return;
    }
    /* ── v2.3.2521: MARK BEFORE ANYTHING MOVES ────────────────────────
       What follows is three separate disk writes — refund the bid, mail
       the goods home, delete the record — and the worker restarts on
       EVERY merge to main that touches server/**, so the gap between them
       is a window that really opens.  Shipped without this marker, a
       crash after the refunds left a record carrying no in-flight flag at
       all: `_stConverge` read it as a perfectly healthy listing and put it
       straight back on the shelf, still holding the goods it had already
       returned and the bid it had already refunded.  Buying it then minted
       a SECOND copy of the item, and accepting the stale bid paid the
       seller gold nobody had paid — silent, repeatable by anyone who
       noticed, and inflationary for everyone.
       This is v2.3.1184 again: market.js `_mktEnsureIndex` (lines 96-103)
       checks `refund:<id>` alongside its two settle stamps and DELETES
       rather than re-lists for exactly this reason.  The store copied the
       buy path's protection (rec.sale) and not the refund path's.
       Announcing the release first, the way rec.sale and rec.pendBid
       already do, keeps the fix inside this module's own design: only
       records carrying a marker cost the rebuild an oplog read, which is
       the property the header argues for. */
    if (!rec.releasing) {
      rec.releasing = { why, at: Date.now() };
      await this.state.storage.put('store_listing:' + rec.id, rec);
    }
    if (rec.topBid) {
      await this._creditPlayer(rec.topBid.bidderId, {
        opId: 'store:' + rec.id + ':bidref:' + rec.topBid.seq, source: 'market', kind: 'gold',
        payload: { amount: rec.topBid.amount }, note: 'bid returned on ' + this._stLabel(rec),
      });
    }
    /* v2.3.2623: and every escrowed offer -- cancel, expiry and the
       crash-release all come through here (storeoffer.js). After the
       `releasing` marker above, so a crash mid-refund converges rather than
       re-listing a record whose gold has already gone home. */
    await this._soReleaseAll(rec, 'offer returned on ' + this._stLabel(rec), null);
    const goods = this._stGoodsCredit(rec);   /* v2.3.2531 */
    await this._creditPlayer(rec.sellerId, {
      opId: 'store:' + rec.id + ':refund', source: 'market',
      kind: goods.kind, payload: goods.payload,
      note: why,
    });
    this._stRemoveFromIndex(rec);
    /* v2.3.2621: the conversation goes with the listing it was about, and
       goes FIRST -- a crash between the two then leaves a listing whose
       thread is empty (which heals itself) rather than a thread nothing
       will ever delete (storechat.js). */
    await this._scDropThreads(rec.id);
    await this.state.storage.delete('store_listing:' + rec.id);
  },

  async _stCancel(listingId, sellerId) {
    if (!listingId || !sellerId) return { ok: false, settled: true, error: 'Missing params' };
    const rec = this._stIndex.get(String(listingId));
    if (!rec) return { ok: false, settled: true, error: 'That listing is gone' };
    if (rec.sellerId !== sellerId) return { ok: false, settled: true, error: 'Not yours' };
    if (rec.sale || rec.pendBid) return { ok: false, settled: true, error: 'Someone is buying that right now' };
    await this._stRelease(rec, 'listing cancelled');
    return { ok: true, settled: true, cancelled: this._stPublic(rec) };
  },

  /* Lazy expiry (rule 12 — there are no alarms, and the tick stops when
     the room empties).  Rate-limited and BOUNDED: each pass resolves at
     most SWEEP_MAX listings, so one request can never hold the input gate
     open for a whole backlog (rule 9's second edge). */
  async _stSweep() {
    const now = Date.now();
    if (this._stLastSweep && now - this._stLastSweep < STORE.SWEEP_INTERVAL) return;
    this._stLastSweep = now;
    const due = [];
    for (const rec of this._stIndex.values()) {
      if (rec.expiresAt <= now && !rec.sale && !rec.pendBid) due.push(rec);
      if (due.length >= STORE.SWEEP_MAX) break;
    }
    for (const rec of due) await this._stRelease(rec, 'listing expired');
    /* v2.3.2623: offers expire sooner than the listing they sit on (48h vs a
       week), so gold is not locked for a week by a seller who never answered.
       Bounded by the same pass: at most MAX_PER_LISTING offers per record and
       at most SWEEP_MAX records looked at, so this cannot become the
       unbounded walk rule 9 warns about. */
    let looked = 0;
    for (const rec of this._stIndex.values()) {
      if (looked++ >= STORE.SWEEP_MAX) break;
      if (rec.sale || rec.releasing || !rec.offers) continue;
      if (!Object.keys(rec.offers).length) continue;
      await this._soSweepRec(rec, now);
    }
  },
};
