/* ═══ v2.3.1118: MARKETPLACE folded into the GameRoom (PR3 of the
 * heavy-systems plan; spec in docs/specs/marketplace.md) ═══
 *
 * The old global Marketplace DO (marketplace.js) had ZERO settlement:
 * placeOrder trusted the request body, a match just deleted the resting
 * order, and the CLIENT paid itself (ExchangePanel self-credit) -- free
 * item duplication for anyone with devtools.  With the owner-directed
 * single shared room (brotown-1), a separate DO also buys nothing and
 * only adds cross-DO failure windows.  So the order book now lives in
 * the GameRoom itself: escrow and settlement are synchronous mutations
 * of the same playerState / rpg blobs the room already owns, under one
 * DO's input gates -- no opId journal needed on the placement path.
 * Settlement CREDITS go through the PR2 primitives (_creditPlayer),
 * which handle online/offline delivery and idempotency uniformly.
 * v2.3.1184: settlement/refund order is credit-first, delete-last
 * with maker-keyed settle stamps -- the original delete-first order
 * left a deploy-shaped window that destroyed escrow unrecoverably
 * (see the comments at the match/cancel/sweep sites).
 *
 * Mixed into GameRoom via Object.assign(GameRoom.prototype, marketMethods)
 * in index.js -- kept in this module so a future room re-shard can
 * re-extract it mechanically.
 *
 * Storage keys (GameRoom storage, separate from the rpg blob):
 *   mkt_order:<orderId>   resting order (escrow held server-side); v2.3.4505:
 *                         or a matched one mid-sale, its `settle` note naming
 *                         every leg still owed (see the crossing below)
 *   mkt_hist:<indexKey>   rolling [{p, ts}] of executed prices, cap 50
 *
 * Owner decisions (2026-07-02): 24h listings (GDD §39 contradicted
 * itself: 1h in one place, 48h in another) with refund-to-inbox on
 * expiry; bounty boards deferred; direct self-trades never enter the
 * price history (the matcher already skips same-player orders). */

import { swordToGreatsword } from './swordconvert.js';   /* v2.3.3895: a sword's order is rewritten once as a greatsword */
import { oldGreatswordToMetal } from './gscopper.js';   /* v2.3.3980: ...and a wooden or base-less greatsword's as a metal one */
import { BLACKSMITH_TIER_LABELS } from './data.js';   /* v2.3.3980: a converted sell order's tier label */
export const MARKET = {
  ORDER_EXPIRY: 86400000,       // 24h
  MAX_ORDERS_PER_PLAYER: 10,
  SWEEP_INTERVAL: 60000,
  PRICE_HIST_CAP: 50,
  /* v2.3.4505: the shape number of a sale's `settle` note (a newer worker's
     note is left for it: never paid, listed or deleted here), and the page
     of the wake scan that finishes the notes a restart left (_mktSettleWait) */
  SETTLE_V: 1,
  SCAN_PAGE: 128,
};

export const marketMethods = {
  /* ═══ v2.3.1971: BOUND THE TAXONOMY STRINGS BEFORE THEY ESCROW ═══
   *
   * category / subtype / tierKey / element1 / element2 arrive from the
   * request body and were checked only for TRUTHINESS.  Two consequences,
   * one of them destructive:
   *
   *  - `_mktIndexKey` concatenates all five into `mkt_hist:<key>`, a real
   *    DO storage key (2 KB ceiling), and the whole order object goes into
   *    `mkt_order:<uuid>` (128 KB value ceiling).  This is the HTTP
   *    surface, not a WS frame, so nothing bounded the body: a 200 KB
   *    `playerName` makes `storage.put` THROW -- and by then
   *    `ps.weaponStash.splice(idx, 1)` and `_saveRpg` have already run, so
   *    the seller's weapon is gone from live state and from disk with no
   *    order to show for it and nothing for any sweep to find.  Escrow
   *    that can't be written is escrow that never existed; validate
   *    BEFORE the splice, which is what this does.
   *  - the closed set is tiny and known (MKT_CATEGORIES in
   *    src/data/gameSystems.js: weapon/armor/shield/amulet, subtypes
   *    greatsword/sword/bow/staff/armor/shield/amulet, tiers from
   *    BLACKSMITH_TIERS + `ww_`-prefixed woodworking keys), so a charset
   *    + length bound costs an honest client nothing.
   *
   * Deliberately NOT an allowlist of the values themselves: the tier
   * tables live client-side and mirroring them here would be one more
   * table to drift (rule: mirror-audit pins the ones that already exist).
   * The bound is what closes the destruction path; the mislabelling
   * problem underneath it -- nothing checks the listed taxonomy against
   * the escrowed weapon, so a modified client can advertise a copper
   * blade as godly -- needs a taxonomy the server can derive, and is
   * written up rather than guessed at. */
  _mktField(v) {
    if (typeof v !== 'string') return null;
    const s = v.trim();
    if (!s || s.length > 24 || !/^[A-Za-z0-9_-]+$/.test(s)) return null;
    return s;
  },

  _mktIndexKey(o) {
    return `${o.category}:${o.subtype}:${o.tierKey}:${o.element1 || 'none'}:${o.element2 || 'none'}`;
  },

  // In-memory index, lazy-loaded once per DO wake (same §39.4 shape the
  // old Marketplace used: buys sorted descending, sells ascending, O(1)
  // match against the bucket head).
  async _mktEnsureIndex() {
    if (this._mktIndex) return;
    this._mktIndex = new Map();
    this._mktOrderCounts = new Map();
    const settleOn = !this._mktSettleOff();   /* v2.3.4505 */
    const entries = await this.state.storage.list({ prefix: 'mkt_order:' });
    for (const [k, o] of entries) {
      if (!o || !o.id) continue;
      /* v2.3.4505: a sale a restart caught half done carries its note: it is
         FINISHED -- every leg without its stamp paid, then deleted -- never
         re-listed, and never deleted on ANY stamp (the check below, which
         lost the legs after the first: the seller's gold, the taker's price
         improvement).  That check stays for a leftover with no note, from
         an older worker (or `mktsettle: false`). */
      if (o.settle && settleOn) {
        await this._mktSettleHeal(o);
        continue;
      }
      // v2.3.1184: converge crash leftovers instead of re-listing them.
      // Settlement and refund now credit BEFORE deleting the record
      // (rule 6 ordering, _duelEscrowSweep shape) -- so a crash between
      // the credit and the delete leaves a record whose payout is
      // already stamped.  Re-listing it would let it match or refund a
      // second time; the stamp check turns it into a delete instead.
      if ((await this._opSeen('settle:' + o.id + ':item')) ||
          (await this._opSeen('settle:' + o.id + ':gold')) ||
          (await this._opSeen('refund:' + o.id))) {
        await this.state.storage.delete(k);
        continue;
      }
      /* v2.3.3895: an order for a one-handed sword is rewritten ONCE, here
         (swordconvert.js): a sell's escrowed weapon becomes the greatsword it
         now is, and the order's subtype -- part of its place in the book --
         moves from 'sword' to 'greatsword' (a wood one's tier to copper), a
         buy's too, so it can still meet a seller.  One put, only for such an
         order. */
      /* v2.3.3980: and an order for a wooden (or base-less) greatsword, as
         the copper one it now is (gscopper.js) -- in the same one put */
      const _sw = !(this._swordConvertOff && this._swordConvertOff()) && this._mktSwordConvert(o);
      const _gs = !(this._gsCopperOff && this._gsCopperOff()) && this._mktGsCopper(o);
      if (_sw || _gs) {
        await this.state.storage.put(k, o);
      }
      this._mktAddToIndex(o);
    }
    /* v2.3.4505: every record has been seen, so the wake scan has nothing
       left to read (_mktSettleWait) */
    if (settleOn) this._mktScanned = true;
  },

  /* v2.3.3895: one order out of the retired sword, in place; true if it changed */
  _mktSwordConvert(o) {
    if (!o || typeof o !== 'object') return false;
    let changed = false;
    if (o.item && swordToGreatsword(o.item)) {
      changed = true;
      if (o.tierKey === 'wood' && o.item.gearBase === 'copper') { o.tierKey = 'copper'; o.tierLabel = 'Copper'; }
    }
    if (o.subtype === 'sword') { o.subtype = 'greatsword'; changed = true; }
    return changed;
  },

  /* v2.3.3980: one order out of the wooden greatsword, in place; true if it
     changed.  A sell's escrowed weapon becomes copper and the order's tier --
     part of its place in the book -- moves with it; a buy for a wood
     greatsword (gold only) is re-filed for copper, so it can still meet a
     seller, as v19 re-filed a sword's. */
  _mktGsCopper(o) {
    if (!o || typeof o !== 'object') return false;
    let changed = false;
    /* v2.3.3980: a sell's converted weapon files the order under its new
       metal (copper, or the metal a strong base-less one became) */
    if (o.item && oldGreatswordToMetal(o.item)) {
      changed = true;
      const gb = o.item.gearBase;
      if (o.subtype === 'greatsword' && typeof gb === 'string' && o.tierKey !== gb) { o.tierKey = gb; o.tierLabel = BLACKSMITH_TIER_LABELS[gb] || gb; }
    }
    /* a buy names no tierMult: only 'wood' maps (to copper); a buy under an
       old drop's rarity key ('common', 'elemental'...) is left as it is */
    if (o.subtype === 'greatsword' && o.tierKey === 'wood') { o.tierKey = 'copper'; o.tierLabel = 'Copper'; changed = true; }
    return changed;
  },

  _mktAddToIndex(o) {
    const key = this._mktIndexKey(o);
    if (!this._mktIndex.has(key)) this._mktIndex.set(key, { buys: [], sells: [] });
    const bucket = this._mktIndex.get(key);
    if (o.type === 'buy') {
      bucket.buys.push(o);
      bucket.buys.sort((a, b) => b.price - a.price);
    } else {
      bucket.sells.push(o);
      bucket.sells.sort((a, b) => a.price - b.price);
    }
    this._mktOrderCounts.set(o.playerId, (this._mktOrderCounts.get(o.playerId) || 0) + 1);
  },

  _mktRemoveFromIndex(o) {
    const key = this._mktIndexKey(o);
    const bucket = this._mktIndex.get(key);
    if (!bucket) return;
    if (o.type === 'buy') bucket.buys = bucket.buys.filter((x) => x.id !== o.id);
    else bucket.sells = bucket.sells.filter((x) => x.id !== o.id);
    if (bucket.buys.length === 0 && bucket.sells.length === 0) this._mktIndex.delete(key);
    const count = (this._mktOrderCounts.get(o.playerId) || 1) - 1;
    if (count <= 0) this._mktOrderCounts.delete(o.playerId);
    else this._mktOrderCounts.set(o.playerId, count);
  },

  // HTTP surface -- the outer worker routes /api/market/* here (same
  // room resolution as /ws, default brotown-1).  Endpoint paths and
  // response shapes match the old Marketplace DO so the client keeps
  // working; the additions are `settled: true` on mutating responses
  // (the client uses it to skip its legacy self-credit path -- old
  // workers without the flag still get the legacy behavior, keeping
  // both deploy orders safe) and GET /history.
  async _marketFetch(request) {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/market', '');
    const H = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
    try {
      await this._mktEnsureIndex();
      await this._mktSweep();

      if (request.method === 'GET' && path.startsWith('/orders')) {
        const orders = this._mktQueryOrders(url.searchParams.get('category'), url.searchParams.get('subtype'), url.searchParams.get('tier'), null, 100);
        return new Response(JSON.stringify({ ok: true, orders }), { headers: H });
      }
      if (request.method === 'GET' && path.startsWith('/my')) {
        const orders = this._mktQueryOrders(null, null, null, url.searchParams.get('playerId'), 100);
        return new Response(JSON.stringify({ ok: true, orders }), { headers: H });
      }
      if (request.method === 'GET' && path.startsWith('/history')) {
        const key = `${url.searchParams.get('category')}:${url.searchParams.get('subtype')}:${url.searchParams.get('tier')}:${url.searchParams.get('element1') || 'none'}:${url.searchParams.get('element2') || 'none'}`;
        const hist = (await this.state.storage.get('mkt_hist:' + key)) || [];
        const avg = hist.length ? Math.round(hist.reduce((s, h) => s + h.p, 0) / hist.length) : null;
        return new Response(JSON.stringify({ ok: true, history: hist, avg, last: hist.length ? hist[hist.length - 1].p : null }), { headers: H });
      }
      if (request.method === 'POST' && path.startsWith('/place')) {
        const body = await request.json();
        // v2.3.1178: playerId is public (broadcast in player_join /
        // track), so "is that player online" was never authentication
        // -- a forged place could escrow a VICTIM's stash weapon out
        // at 1g (live item theft).  The request must now carry the
        // claimed player's own session token (httpauth.js; legacy
        // clients ride the enforcement grace window there).
        if (!this._httpAuthCheck(body && body.playerId, request)) {
          return new Response(JSON.stringify({ ok: false, settled: true, error: 'Not authorized' }), { status: 403, headers: H });
        }
        if (this._valuePaused && this._valuePaused()) return this._valuePauseHttp(H);   /* v2.3.5090: an order's escrow waits while saves are refused (valuepause.js) */
        const result = await this._mktPlaceOrder(body);
        return new Response(JSON.stringify(result), { headers: H });
      }
      if (request.method === 'DELETE' && path.startsWith('/cancel')) {
        // v2.3.1178: same token gate -- a forged cancel could delist a
        // victim's orders (refund lands with the victim, but the
        // delisting itself is griefing).
        if (!this._httpAuthCheck(url.searchParams.get('playerId'), request)) {
          return new Response(JSON.stringify({ ok: false, settled: true, error: 'Not authorized' }), { status: 403, headers: H });
        }
        const result = await this._mktCancelOrder(url.searchParams.get('id'), url.searchParams.get('playerId'));
        return new Response(JSON.stringify(result), { headers: H });
      }
      return new Response(JSON.stringify({ ok: false, error: 'Not found' }), { status: 404, headers: H });
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500, headers: H });
    }
  },

  _mktQueryOrders(category, subtype, tier, playerId, limit) {
    const results = [];
    for (const [, bucket] of this._mktIndex) {
      for (const o of [...bucket.buys, ...bucket.sells]) {
        if (category && o.category !== category) continue;
        if (subtype && o.subtype !== subtype) continue;
        if (tier && o.tierKey !== tier) continue;
        if (playerId && o.playerId !== playerId) continue;
        // Never leak the escrowed item blob shape beyond what the old
        // API exposed -- the wire shape is unchanged.
        results.push(o);
        if (results.length >= limit) return results;
      }
    }
    return results;
  },

  /* Place an order.  ESCROW AT PLACEMENT is the whole point:
   *   sell -> the weapon leaves the seller's stash NOW (taken from the
   *           server's own copy by stash index -- body.item is ignored,
   *           a forged blob buys nothing);
   *   buy  -> the gold leaves the buyer's coins NOW.
   * Placement requires the player to be ONLINE in this room (the UI is
   * in-game; it also means escrow always mutates live playerState, never
   * the lagging blob).  Settlement credits go through _creditPlayer so
   * the counterparty can be offline.  No cross-DO awaits anywhere. */
  async _mktPlaceOrder(body) {
    const { type, price, tierLabel, playerName, playerId } = body || {};
    if (!type || !price || !playerId) return { ok: false, error: 'Missing fields' };
    const p = Math.floor(price);
    if (!(p >= 1 && p <= 999999)) return { ok: false, error: 'Invalid price' };
    if (type !== 'buy' && type !== 'sell') return { ok: false, error: 'Invalid type' };
    /* v2.3.1971: bound the taxonomy BEFORE anything is escrowed (see
       `_mktField`) -- an unbounded field made the storage write throw
       after the seller's weapon had already left the stash. */
    const category = this._mktField(body.category);
    let subtype = this._mktField(body.subtype);
    /* v2.3.3895: the sword is retired (swordconvert.js); an older page's order
       for one is an order for a greatsword */
    if (subtype === 'sword' && !(this._swordConvertOff && this._swordConvertOff())) subtype = 'greatsword';
    let tierKey = this._mktField(body.tierKey);
    let _tierLabel = tierLabel;
    /* v2.3.3980: and the wooden greatsword (gscopper.js): an order for one is
       an order for copper */
    if (subtype === 'greatsword' && tierKey === 'wood' && !(this._gsCopperOff && this._gsCopperOff())) { tierKey = 'copper'; _tierLabel = 'Copper'; }
    if (!category || !subtype || !tierKey) return { ok: false, error: 'Missing fields' };
    let element1 = body.element1 == null ? null : this._mktField(body.element1);   /* v2.3.3513: let -- a sell takes its item's */
    let element2 = body.element2 == null ? null : this._mktField(body.element2);
    if ((body.element1 != null && !element1) || (body.element2 != null && !element2)) {
      return { ok: false, error: 'Invalid element' };
    }

    const ps = this.playerState[playerId];
    if (!ps) return { ok: false, error: 'Not in game' };
    /* v2.3.3183: not in a fight with a player -- an order escrows a weapon or
       gold out of the death's reach, and its cancel hands them back
       (nomansland.js _bagLockedByFight).  Cancelling stays open. */
    if (this._bagLockedByFight && this._bagLockedByFight(playerId)) return { ok: false, error: 'Not while you are fighting a player' };

    if ((this._mktOrderCounts.get(playerId) || 0) >= MARKET.MAX_ORDERS_PER_PLAYER) {
      return { ok: false, error: 'Max 10 orders' };
    }

    // Escrow.
    let item = null;
    if (type === 'sell') {
      const idx = Math.floor(body.stashIndex);
      if (!Number.isFinite(idx) || idx < 0 || !Array.isArray(ps.weaponStash) || idx >= ps.weaponStash.length) {
        return { ok: false, error: 'Item not in stash' };
      }
      item = this._sanitizeWeapon(ps.weaponStash[idx]);
      if (!item) return { ok: false, error: 'Item not in stash' };
      /* ═══ v2.3.3513: A SELL ORDER SAYS THE GEMS ITS WEAPON HOLDS ═══
         A weapon's gem is the worker's now (weapongem.js), and real: the
         order's elements -- its place in the book, what a buyer's order is
         matched against and what the listing shows -- were the seller's
         word, so a plain blade could be listed as a Flame one.  A sell takes
         them from the weapon it escrows; a buy still names what it wants. */
      element1 = item.element1 || null;
      element2 = item.element2 || null;
      ps.weaponStash.splice(idx, 1);
    } else {
      if ((ps.coins || 0) < p) return { ok: false, error: 'Not enough gold' };
      this._goldTake(ps, p, 'market_order'); /* v2.3.4670: the gold door */
    }
    this._saveRpg(playerId, ps);
    this._queuePlayerStateFlush(playerId);

    const order = {
      id: crypto.randomUUID(), type, category, subtype, tierKey,
      element1: element1 || null, element2: element2 || null,
      price: p, item,
      /* v2.3.1971: these two are free text (a display label and a display
         name), so they are truncated rather than charset-gated -- but they
         ride into the same 128 KB `mkt_order:` value as everything else,
         and an unbounded one was the destructive half of the bug above. */
      tierLabel: (typeof _tierLabel === 'string' && _tierLabel) ? _tierLabel.slice(0, 32) : tierKey,   /* v2.3.3980: _tierLabel */
      playerName: (typeof playerName === 'string' && playerName) ? playerName.slice(0, 24) : 'Unknown',
      playerId,
      ts: Date.now(), expires: Date.now() + MARKET.ORDER_EXPIRY,
    };

    // Match against the opposite bucket head (skip own orders -- direct
    // self-trades can neither dupe nor paint the price history).
    const bucket = this._mktIndex.get(this._mktIndexKey(order));
    let maker = null;
    if (bucket) {
      const oppList = type === 'buy' ? bucket.sells : bucket.buys;
      for (const o of oppList) {
        if (o.playerId === playerId) continue;
        if (type === 'buy' && o.price <= p) { maker = o; break; }
        if (type === 'sell' && o.price >= p) { maker = o; break; }
      }
    }

    if (maker) {
      this._mktRemoveFromIndex(maker);
      const execPrice = maker.price; // resting order sets the price
      const buyerId = type === 'buy' ? playerId : maker.playerId;
      const sellerId = type === 'buy' ? maker.playerId : playerId;
      const weapon = type === 'buy' ? maker.item : order.item;
      const label = order.tierLabel + ' ' + order.subtype;
      /* ═══ v2.3.4505: THE SALE'S NOTE GOES OUT WITH THE TAKER'S ESCROW ═══
         The state-machine sweep (2026-11-03, V8a S6-3).  The taker's escrow
         was saved above, and the legs below were paid one await at a time,
         the maker's order deleted last -- every server merge restarts the
         room, and a restart in between:
           - before the weapon leg took the taker's gold or weapon, which
             nothing named, and put the maker's order back on sale;
           - after it left a record the wake deleted on ANY stamp, so the
             seller was never paid, and a price improvement was lost the
             same way.
         Now the maker's record is rewritten with a `settle` note -- every
         leg, to whom, how much -- issued in the SAME synchronous run as the
         taker's escrow save (`_saveRpg` puts before its first await), so
         the two commit together: both, or neither (handoff rules 5 and 7,
         TRAPS §184).  Then each leg is paid by an idempotent credit with
         its own stamp, the same opIds as before (`settle:<makerId>:leg`, so
         an older worker's rebuild still reads a leg as paid), and the record
         is deleted once every leg is stamped (_mktSettleRun).  A note found
         later is finished by _mktSettleHeal, from the book's rebuild, the
         wake scan the stamp prune waits for, a cancel or the expiry sweep.
         The Auction House's `rec.sale` is the model (store.js).  The answer
         is the shape it was.  `mktsettle: false` in the live flags: the old
         order, below. */
      if (!this._mktSettleOff()) {
        const rec = { ...maker, settle: this._mktSettlePlan(order, execPrice, buyerId, sellerId, weapon, label) };
        try {
          await this.state.storage.put('mkt_order:' + maker.id, rec);
        } catch (err) {
          /* the note never landed, so nothing moved: the maker still rests on
             disk, and the taker's escrow goes home (v2.3.1971's rule) */
          this._mktAddToIndex(maker);
          await this._mktUnwind(order);
          throw err;
        }
        try {
          await this._mktSettleRun(rec);
        } catch (err) {
          /* the note is on disk: the sale is owed, retried by the tick, and
             the stamp prune waits for it (_mktSettleWait) */
          this._mktOwe(rec);
          throw err;
        }
        return { ok: true, settled: true, matched: true, execPrice, matchedOrder: maker, newOrder: order };
      }
      // Seller is paid the execution price; buyer receives the weapon.
      // Taker-buy price improvement (bid > resting ask) refunds the
      // difference -- the buyer escrowed their own bid above.
      //
      // v2.3.1184: credit FIRST, delete the escrow record LAST (rule 6
      // ordering; _resolveDuel/_duelEscrowSweep are the reference).
      // This used to delete 'mkt_order:<maker.id>' before any credit
      // was stamped, so a deploy landing in between destroyed BOTH
      // sides' escrow with nothing left for any sweep to repair.  The
      // stamps are also keyed on maker.id now (the PERSISTED record)
      // instead of the taker's never-stored UUID, so a crash between
      // credit and delete converges on the next index rebuild
      // (stamp seen -> delete, never re-list / never refund on top).
      // The weapon leg settles first: it's the unique, irreplaceable
      // half of the trade.
      await this._creditPlayer(buyerId, { opId: 'settle:' + maker.id + ':item', source: 'market', kind: 'weapon', payload: { weapon }, note: label + ' bought' });
      await this._creditPlayer(sellerId, { opId: 'settle:' + maker.id + ':gold', source: 'market', kind: 'gold', payload: { amount: execPrice }, note: label + ' sold' });
      if (type === 'buy' && p > execPrice) {
        await this._creditPlayer(buyerId, { opId: 'settle:' + maker.id + ':diff', source: 'market', kind: 'gold', payload: { amount: p - execPrice }, note: 'price improvement' });
      }
      await this.state.storage.delete('mkt_order:' + maker.id);
      await this._mktRecordPrice(this._mktIndexKey(order), execPrice);
      return { ok: true, settled: true, matched: true, execPrice, matchedOrder: maker, newOrder: order };
    }

    this._mktAddToIndex(order);
    /* ═══ v2.3.1971: ESCROW THAT CANNOT BE WRITTEN NEVER EXISTED ═══
     * The escrow leaves the player's live state ABOVE (splice / coin
     * debit + `_saveRpg`) and only becomes recoverable once this record
     * lands -- the record is what cancel, expiry-refund and the rebuild
     * sweep all key off.  If the put throws, the player is short the item
     * or the gold and there is nothing left anywhere that names it.
     * Measured with the real DO ceilings in place: an oversized field made
     * this throw and left `stash: [] / order records: 0` -- the weapon
     * gone from live state AND from the saved blob, unrecoverable.  The
     * field bounds above close the one instance that was reachable; this
     * closes the CLASS, because it is the only thing standing between a
     * failed write and a destroyed item.
     * Nothing is stamped or credited at this point, so unwinding is a
     * plain restore -- no opId, no double-pay window (rule 5 does not
     * apply to a leg that never landed).  The throw is re-raised so
     * `_marketFetch` still answers 500 rather than claiming a listing
     * that does not exist. */
    try {
      await this.state.storage.put('mkt_order:' + order.id, order);
    } catch (err) {
      this._mktRemoveFromIndex(order);
      await this._mktUnwind(order);
      throw err;
    }
    return { ok: true, settled: true, matched: false, order };
  },

  /* v2.3.1971's unwind, moved here unchanged by v2.3.4505 so the crossing's
     note (above) uses it too: an order's escrow, taken from its player but
     named by no record that landed, goes home. */
  async _mktUnwind(order) {
    const { type, playerId, item } = order;
    const p = order.price;
    const back = this.playerState[playerId];
    if (back) {
      if (type === 'sell' && item) {
        if (!Array.isArray(back.weaponStash)) back.weaponStash = [];
        // Rule 3: never push past the cap -- _saveRpg truncates there and
        // that would destroy the very weapon this is rescuing.
        if (back.weaponStash.length < this.WEAPON_STASH_CAP) back.weaponStash.push(item);
        else await this._creditPlayer(playerId, { opId: 'mktunwind:' + order.id, source: 'market', kind: 'weapon', payload: { weapon: item }, note: 'listing failed' });
      } else if (type === 'buy') {
        this._goldGive(back, p, 'market_unwind'); /* v2.3.4670: the gold door */
      }
      this._saveRpg(playerId, back);
      this._queuePlayerStateFlush(playerId);
    } else {
      // Offline between the debit and the write: pay it into the mail.
      await this._creditPlayer(playerId, {
        opId: 'mktunwind:' + order.id, source: 'market',
        kind: type === 'sell' ? 'weapon' : 'gold',
        payload: type === 'sell' ? { weapon: item } : { amount: p },
        note: 'listing failed',
      });
    }
  },

  async _mktCancelOrder(orderId, playerId) {
    if (!orderId || !playerId) return { ok: false, error: 'Missing params' };
    const order = await this.state.storage.get('mkt_order:' + orderId);
    if (!order) return { ok: false, error: 'Not found' };
    if (order.playerId !== playerId) return { ok: false, error: 'Not yours' };
    /* v2.3.4505: an order mid-sale (a crossing a fault stopped in this
       worker's life) is sold, not cancellable: the sale is finished and the
       answer is what a sold order's cancel always got.  A refund here would
       pay its escrow to the maker AND leave the legs owed. */
    if (order.settle && !this._mktSettleOff()) {
      await this._mktSettleHeal(order);
      return { ok: false, error: 'Not found' };
    }
    this._mktRemoveFromIndex(order);
    // v2.3.1184: refund BEFORE delete (rule 6 ordering) -- the old
    // delete-first order meant a deploy between the two destroyed the
    // escrow with no surviving record for anything to retry against.
    // The refund opId makes the credit idempotent; the converse crash
    // (refund stamped, record survives) is converged by the stamp
    // check in _mktEnsureIndex.
    await this._mktRefund(order, 'order cancelled');
    await this.state.storage.delete('mkt_order:' + orderId);
    return { ok: true, settled: true, cancelled: order };
  },

  // Return the escrow.  opId 'refund:<orderId>' makes cancel racing
  // expiry (or a crash between credit and delete being retried) pay
  // exactly once.  The OLD sweep deleted sell orders WITHOUT refunding
  // -- under escrow that would be item destruction, so expiry and
  // cancel both land here.
  async _mktRefund(order, why) {
    // v2.3.1184: rule 6 -- never refund over a stamped payout.  A
    // record that survived a crash after its match settled (credit
    // stamped, delete lost) must not ALSO refund its escrow.
    if ((await this._opSeen('settle:' + order.id + ':item')) ||
        (await this._opSeen('settle:' + order.id + ':gold'))) return;
    /* v2.3.4505: nor over a sale's note: its escrow is owed to its legs */
    if (order.settle && !this._mktSettleOff()) return;
    if (order.type === 'buy') {
      await this._creditPlayer(order.playerId, { opId: 'refund:' + order.id, source: 'market', kind: 'gold', payload: { amount: order.price }, note: why });
    } else if (order.item) {
      await this._creditPlayer(order.playerId, { opId: 'refund:' + order.id, source: 'market', kind: 'weapon', payload: { weapon: order.item }, note: why });
    }
  },

  async _mktSweep() {
    const now = Date.now();
    if (this._mktLastSweep && now - this._mktLastSweep < MARKET.SWEEP_INTERVAL) return;
    this._mktLastSweep = now;
    const expired = [];
    for (const [, bucket] of this._mktIndex) {
      for (const o of [...bucket.buys, ...bucket.sells]) {
        if (o.expires <= now) expired.push(o);
      }
    }
    for (const o of expired) {
      this._mktRemoveFromIndex(o);
      /* v2.3.4505: a noted sale (one `mktsettle: false` put back on sale) is
         finished, never refunded */
      if (o.settle && !this._mktSettleOff()) { await this._mktSettleHeal(o); continue; }
      // v2.3.1184: refund before delete, same as cancel.
      await this._mktRefund(o, 'listing expired');
      await this.state.storage.delete('mkt_order:' + o.id);
    }
  },

  async _mktRecordPrice(indexKey, price) {
    const key = 'mkt_hist:' + indexKey;
    const hist = (await this.state.storage.get(key)) || [];
    hist.push({ p: price, ts: Date.now() });
    if (hist.length > MARKET.PRICE_HIST_CAP) hist.splice(0, hist.length - MARKET.PRICE_HIST_CAP);
    await this.state.storage.put(key, hist);
  },

  /* ═══ v2.3.4505: A SALE'S NOTE, ITS LEGS, AND THE WAKE THAT FINISHES IT ═══
     (the crossing's comment in _mktPlaceOrder says why).  The note on the
     maker's `mkt_order:` record:
       { v, at, taker, takerOrder, takerType, bid, exec, label,
         legs: [{ leg: 'item', to, weapon }, { leg: 'gold', to, amount },
                ({ leg: 'diff', to, amount }, a taker buy above the ask)] }
     The taker's own order is never stored: the legs are where its escrow goes.

     KILL SWITCH (lower case): `mktsettle: false` in the live flags puts back
     the old order -- no note, the legs one by one, and a leftover converged
     by the old stamp check (what an older worker does with a note: any leg
     stamped deletes it, none re-lists the maker; never a second payment). */
  _mktSettleOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'mktsettle') && !f.mktsettle);
  },

  _mktSettlePlan(order, execPrice, buyerId, sellerId, weapon, label) {
    const legs = [
      { leg: 'item', to: buyerId, weapon },
      { leg: 'gold', to: sellerId, amount: execPrice },
    ];
    if (order.type === 'buy' && order.price > execPrice) legs.push({ leg: 'diff', to: buyerId, amount: order.price - execPrice });
    return {
      v: MARKET.SETTLE_V, at: Date.now(),
      taker: order.playerId, takerOrder: order.id, takerType: order.type, bid: order.price,
      exec: execPrice, label, legs,
    };
  },

  /* a note this worker can finish: its shape number, and every leg whole */
  _mktSettleOk(s) {
    if (!s || typeof s !== 'object' || s.v !== MARKET.SETTLE_V) return false;
    if (typeof s.taker !== 'string' || (s.takerType !== 'buy' && s.takerType !== 'sell') || !(s.bid > 0) || !(s.exec > 0)) return false;
    const legs = s.legs;
    if (!Array.isArray(legs) || legs.length < 2 || legs.length > 3) return false;
    if (!legs[0] || legs[0].leg !== 'item' || !legs[0].weapon) return false;
    return legs.every((l, i) => l && typeof l.to === 'string' && l.to
      && (i === 0 || ((l.leg === (i === 1 ? 'gold' : 'diff')) && Number.isFinite(l.amount) && l.amount > 0)));
  },

  /* one leg's credit (its opId is written at the call, opid-audit) --
     exactly the entry the old order paid, so a leg it stamped reads as paid
     here, and the other way */
  _mktLegPay(rec, leg) {
    const label = rec.settle.label;
    if (leg.leg === 'item') return { source: 'market', kind: 'weapon', payload: { weapon: leg.weapon }, note: label + ' bought' };
    return { source: 'market', kind: 'gold', payload: { amount: leg.amount }, note: leg.leg === 'diff' ? 'price improvement' : label + ' sold' };
  },

  /* the taker's escrow, whole: what goes home when the maker's already did */
  _mktBackPay(rec) {
    const s = rec.settle;
    if (s.takerType === 'buy') return { source: 'market', kind: 'gold', payload: { amount: s.bid }, note: 'order returned' };
    return { source: 'market', kind: 'weapon', payload: { weapon: s.legs[0].weapon }, note: 'order returned' };
  },

  /* Pay every leg (a leg already stamped answers 'dup' and pays nothing:
     _creditPlayer issues each stamp in the same run as its payment), then
     delete the record -- only when every leg is stamped -- and keep the price
     in the history, as the old order did after its delete. */
  async _mktSettleRun(rec) {
    for (const leg of rec.settle.legs) {
      /* a call for this leg already running in this worker: its stamp is not
         on file yet, so the record is not ours to delete (that call finishes
         the sale, or owes it).  Asked BEFORE the call, in the same run as
         _creditPlayer's own check, so any 'dup' below is a stamp on file. */
      if (this._opInFlight && this._opInFlight.has('settle:' + rec.id + ':' + leg.leg)) return false;
      await this._creditPlayer(leg.to, { opId: 'settle:' + rec.id + ':' + leg.leg, ...this._mktLegPay(rec, leg) });
    }
    await this.state.storage.delete('mkt_order:' + rec.id);
    if (this._mktOwed) this._mktOwed.delete(rec.id);
    await this._mktRecordPrice(this._mktIndexKey(rec), rec.settle.exec);
    return true;
  },

  /* Finish a note found on disk (the book's rebuild, the wake scan, a cancel,
     the expiry sweep, a retry).  It reads the record as it is NOW -- a copy
     read earlier may already be finished -- and never throws: a sale it could
     not finish is owed (_mktOwed), retried by the tick, and the stamp prune
     waits for it.  A newer worker's note, or one not whole, is left as it
     is: not paid, not listed, not deleted. */
  async _mktSettleHeal(o) {
    try {
      const key = 'mkt_order:' + o.id;
      const rec = await this.state.storage.get(key);
      if (!rec || !rec.settle) { if (this._mktOwed) this._mktOwed.delete(o.id); return true; }
      if (!this._mktSettleOk(rec.settle)) return false;
      this._mktDropFromBook(rec);
      /* An older worker (or the switch off) re-listed this maker -- its note
         unread -- and then refunded it, and the restart came before its
         delete: the maker's escrow went home, so the legs must not be paid
         (that would pay it twice).  The taker's escrow goes home too.  (One
         read, here only: the live crossing never needs it.) */
      if (await this._opSeen('refund:' + rec.id)) {
        await this._creditPlayer(rec.settle.taker, { opId: 'settle:' + rec.id + ':back', ...this._mktBackPay(rec) });
        await this.state.storage.delete(key);
        if (this._mktOwed) this._mktOwed.delete(rec.id);
        return true;
      }
      return await this._mktSettleRun(rec);
    } catch (e) {
      this._mktOwe(o);
      return false;
    }
  },

  /* out of the in-memory book, if it is there (only `mktsettle: false` puts
     a noted record back on sale) -- never a second decrement of the count */
  _mktDropFromBook(rec) {
    const b = this._mktIndex && this._mktIndex.get(this._mktIndexKey(rec));
    const list = b && (rec.type === 'buy' ? b.buys : b.sells);
    if (list && list.some((x) => x.id === rec.id)) this._mktRemoveFromIndex(rec);
  },

  _mktOwe(o) {
    if (!o || !o.id) return;
    if (!this._mktOwed) this._mktOwed = new Map();
    this._mktOwed.set(o.id, o);
  },

  /* ═══ v2.3.4505: THE STAMP PRUNE WAITS FOR A SALE HALF DONE ═══
     Which legs of a note were paid lives in their oplog stamps, and the
     oplog prune deletes stamps 48 h old (inbox.js _opPruneMaybe; TRAPS §146:
     the oplog is not the record).  A note found after its stamps were pruned
     would read as unpaid: its weapon paid twice.  The book's rebuild finished
     notes only on the first shop request after a wake, which may never come
     before the prune.  So the tick's housekeeping slot (tick.js) asks this
     BEFORE the prune: true while the prune must wait -- this worker's scan
     of the book has not finished, or a sale is owed -- and it starts the next
     step (one page of the scan, or the retries) when none is running.  The
     prune only runs in this slot, and a fresh worker's first slot starts the
     scan, so no prune ever comes between a restart and its heal.
     The cost: once a worker's life, the book read a page at a time and
     nothing written when there is nothing to finish -- and nothing at all
     when the shop's rebuild has already read it (_mktEnsureIndex). */
  _mktSettleWait() {
    if (this._mktSettleOff()) return false;
    const owed = !!(this._mktOwed && this._mktOwed.size);
    if (this._mktScanned && !owed) return false;
    if (!this._mktHealing) {
      this._mktHealing = true;
      const step = this._mktScanned ? this._mktRetryOwed() : this._mktScanPage();
      step.catch(() => {}).then(() => { this._mktHealing = false; });
    }
    return true;
  },

  async _mktScanPage() {
    const opts = { prefix: 'mkt_order:', limit: MARKET.SCAN_PAGE };
    if (this._mktScanAfter) opts.startAfter = this._mktScanAfter;
    const page = await this.state.storage.list(opts);
    let last = null;
    for (const [k, o] of page) {
      last = k;
      if (o && o.id && o.settle) await this._mktSettleHeal(o);
    }
    if (this._mktScanned) return;   /* the shop's rebuild read it all meanwhile */
    if (page.size < MARKET.SCAN_PAGE || !last) { this._mktScanned = true; this._mktScanAfter = null; }
    else this._mktScanAfter = last;
  },

  async _mktRetryOwed() {
    for (const o of [...this._mktOwed.values()]) await this._mktSettleHeal(o);
  },
};
