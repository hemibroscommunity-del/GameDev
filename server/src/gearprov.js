/* ═══ v2.3.2534: GEAR PROVENANCE — THE SERVER RECORDS WHAT IT MINTS ═══
 * Spec: docs/specs/gear-provenance.md
 *
 * THE HOLE THIS CLOSES.  Until now the server handed out armour, legs,
 * shields and amulets and wrote down NOTHING about having done so.  The
 * pieces went to the player's browser (`loot_credit`'s `armor` array,
 * `quest_reward_stashed`) or into a worn slot, and the only record that
 * a piece existed at all was the client's own copy of it.  Three
 * separate findings on #640/#641/#643 are all that one fact:
 *
 *   - the join claim cannot be told apart from a forged one, because
 *     there is nothing to check it against (#640 finding 4, #641's
 *     "checked for SHAPE, never for OWNERSHIP");
 *   - a stale duplicate cannot be told apart from a genuine second
 *     copy, so #643's `_stGearReconcileWorn` tried to do it by
 *     name|gearBase|tierMult|tier signature and DELETED REAL GEAR
 *     (TRAPS: reconciliation by signature);
 *   - the store therefore cannot safely sell gear at all, which is why
 *     #643 is parked.
 *
 * THE RECORD.  Every piece the server mints gets a server-assigned id
 * (`gid`) and a row in `gear_prov:<playerId>` naming the player it was
 * minted for and the exact blob that was minted.  That row is the
 * ownership proof.  Two properties make it worth having:
 *
 *   1. **The id is a KEY INTO SERVER STATE, not a claim.**  An inbound
 *      piece carrying a `gid` is never trusted; the id is LOOKED UP in
 *      this player's own ledger and, on a hit, the piece is rebuilt
 *      from the LEDGER's copy (handoff rule 16 — the server's own copy
 *      by reference, never the wire blob).  So forging a gid buys
 *      nothing: an id that is not in your ledger is dropped, and an id
 *      that IS in your ledger names a piece you already own, at the
 *      stats it was minted with.  Attaching your Copper Torso's id to a
 *      claimed Godly Iron Plate gets you back... your Copper Torso.
 *   2. **`prov` is WRITE-ONLY server-side.**  The mark that says
 *      "minted" or "legacy" is never read back off the wire — it is
 *      recomputed from the ledger on every inbound path and stripped
 *      from every claim.  #643's `_sv` flag was forgeable precisely
 *      because it was a self-asserting boolean that one path happened
 *      not to strip; a derived field has no forgeable form.
 *
 * THERE IS NO "DONE" STAMP ANYWHERE IN THIS MODULE, deliberately.
 * #640's `gearStashCaptured` stamped "captured" for players whose gear
 * it had never seen and needed a repair plus a healing migration (#641).
 * Provenance has no one-shot: the ledger is append-on-mint, the resolve
 * runs on every inbound path every time, and a piece with no row simply
 * resolves as `legacy` again next join.  Nothing here can be burned.
 *
 * LEGACY GEAR: USABLE, NOT SELLABLE (owner's decision, stated in the
 * PR body).  A piece minted before this version has no row and never
 * will — the two alternatives are both worse.  Adopting the client's
 * current claims wholesale re-opens the exact minting hole this exists
 * to close, and deleting unrecorded gear destroys things people earned.
 * So an unrecorded piece keeps working in every way — worn, rendered,
 * counted in the damage maths — and carries `prov: 'legacy'` so the
 * client can say WHY it cannot be listed instead of failing silently.
 *
 * Handoff compliance: new storage prefix `gear_prov:` registered in the
 * rule-2 table; no rpg-blob field added (rule 1 — `gid` rides ON the
 * existing gear objects, which are already stored whole); no new wire
 * message so nothing is owed to PRIVILEGED_EVENTS; no opId (nothing is
 * paid); no caps flag (nothing client-side gates on this yet — M3 adds
 * one when there is an op to gate, and caps-audit.test.mjs treats an
 * advertised-but-unread flag as dead weight); every map keyed by a
 * string that can arrive from a client is a `Map` (TRAPS #6).
 */

/* The storage prefix.  lowercase_snake per the rule-2 naming
   convention.  ONE key per player, read on join and written on mint —
   never a prefix scan, so this can never become the v2.3.2438
   unbounded-list-on-the-join-path stall. */
export const GEAR_PROV_KEY = (playerId) => 'gear_prov:' + playerId;

/* The ledger's own schema stamp, so a future shape change has somewhere
   to branch.  Independent of RPG_SCHEMA_VERSION: this is not the rpg
   blob and does not ride its migration registry. */
export const GEAR_PROV_V = 1;

/* ═══ THE CAP, AND THE HOLE IN IT ═══
 * A ledger row is ~180-200 bytes on real pieces -- it stores the whole
 * minted blob verbatim (`p`) plus the id, slot, source and timestamp --
 * so 256 rows is ~50 KB against the DO value limit, not the ~28 KB an
 * earlier draft of this comment claimed off a ~110-byte row.  Still
 * comfortably inside the limit; corrected (v2.3.2537, review of #648) so
 * that nobody later raises the cap on the strength of the wrong number.
 *
 * At the live drop rates (MONSTER_ARMOR_DROPS: two pieces at 1/500 each)
 * 256 recorded pieces is on the order of 64,000 monster kills, plus a
 * handful of quest pieces and one amulet per forge press.
 *
 * At the cap the OLDEST row is dropped and `forgotten` is incremented.
 * That means the oldest piece a very long-lived character owns stops
 * being sellable — it reverts to `legacy`.  This is a real hole and it
 * is written down rather than hidden: the honest fix is to prune
 * against what the player still actually holds, which is only possible
 * once the server owns equipping (PR 2) and the stash is the
 * authority for selling (PR 3).  Until then, FIFO with a counter that
 * says out loud that the ledger has forgotten something beats silent
 * unbounded growth in durable storage. */
export const GEAR_PROV_CAP = 256;

/* The slots a piece can be minted into.  A frozen list, matched by
   value — never an object lookup, so `'__proto__'` as a slot name is
   simply not a slot (TRAPS #6). */
export const GEAR_PROV_SLOTS = Object.freeze(['armor', 'legsArmor', 'shield', 'amulet', 'gear']);

export function isGearProvSlot(slot) {
  return typeof slot === 'string' && GEAR_PROV_SLOTS.indexOf(slot) !== -1;
}

/* The two provenance marks.  `minted` means "this server wrote this
   piece down against this player"; `legacy` means "it works, we cannot
   prove where it came from".  Both are DERIVED — see the header. */
export const PROV_MINTED = 'minted';
export const PROV_LEGACY = 'legacy';

/* ═══ THE STRIP ═══
 * Removes both provenance fields from a piece.  Called on EVERY inbound
 * path, on the raw claim, before anything else looks at it.
 *
 * #643's `_sv` mark was stripped from the selector and not from the
 * join claim — the path that actually put pieces in the stash — and the
 * test that looked like it covered this called the strip helper
 * directly, so it passed while the hole stayed open.  The lesson is in
 * the suite, not here: gearprov.test.mjs asserts the strip by driving
 * `webSocketMessage` with a forged claim and reading what reached
 * storage, never by calling this function.
 *
 * Returns a COPY; never mutates the caller's object. */
export function stripProv(piece) {
  if (!piece || typeof piece !== 'object' || Array.isArray(piece)) return piece;
  const out = { ...piece };
  delete out.gid;
  delete out.prov;
  return out;
}

/* The `gid` a claim is ASKING about, read before the strip.  Bounded
   because it lands in a Map key and in comparisons; a non-string or an
   over-long value is not an id we ever minted, so it resolves to none. */
export function claimedGid(piece) {
  const g = piece && typeof piece === 'object' ? piece.gid : null;
  return (typeof g === 'string' && g.length > 0 && g.length <= 40) ? g : null;
}

/* An empty ledger.  `list` is an ARRAY, not a map keyed by id: ids come
   back from clients, and an array cannot be poisoned by a key named
   '__proto__' at all (TRAPS #6 closed by shape, not by discipline). */
export function emptyProvLedger() {
  return { _v: GEAR_PROV_V, seq: 0, forgotten: 0, list: [] };
}

/* Heal whatever came out of storage into the shape above.  Fail-open
   like every other loader here: a corrupt ledger costs sellability, not
   the player's gear, so it heals to empty rather than throwing a join. */
export function normalizeProvLedger(rec) {
  const out = emptyProvLedger();
  if (!rec || typeof rec !== 'object') return out;
  out._v = GEAR_PROV_V;
  out.seq = (typeof rec.seq === 'number' && rec.seq >= 0) ? Math.floor(rec.seq) : 0;
  out.forgotten = (typeof rec.forgotten === 'number' && rec.forgotten >= 0) ? Math.floor(rec.forgotten) : 0;
  if (Array.isArray(rec.list)) {
    for (const r of rec.list) {
      if (!r || typeof r !== 'object' || Array.isArray(r)) continue;
      if (typeof r.id !== 'string' || !r.id) continue;
      if (!isGearProvSlot(r.slot)) continue;
      if (!r.p || typeof r.p !== 'object' || Array.isArray(r.p)) continue;
      out.list.push({
        id: r.id,
        slot: r.slot,
        src: typeof r.src === 'string' ? r.src.slice(0, 24) : '',
        at: typeof r.at === 'number' ? r.at : 0,
        p: r.p,
      });
    }
  }
  if (out.list.length > GEAR_PROV_CAP) {
    out.forgotten += out.list.length - GEAR_PROV_CAP;
    out.list = out.list.slice(out.list.length - GEAR_PROV_CAP);
  }
  if (out.seq < out.list.length) out.seq = out.list.length;
  return out;
}

/* ═══ v2.3.2537: A REBUILT PIECE SHARES NOTHING WITH ITS ROW ═══
 * The rebuild and `_gearProvTouch` both used a shallow spread, so a piece
 * and its ledger row aliased any nested value between them -- mutate the
 * live piece and the record silently followed, which is precisely the
 * drift the row exists to rule out.  Harmless while every gear shape is
 * flat, and a real bug the first day a piece gains a nested field, which
 * is the kind of latent defect that ships green and is found much later.
 * JSON round-trip because these blobs are already JSON-serialisable by
 * construction (they live in the rpg blob and on the wire); the shallow
 * spread stays as the fallback so a surprise value can never throw a
 * join. */
export function clonePiece(p) {
  if (!p || typeof p !== 'object') return p;
  try { return JSON.parse(JSON.stringify(p)); } catch (e) { return { ...p }; }
}

/* Find one row by id.  Linear over at most GEAR_PROV_CAP rows, which is
   why the cap exists at all; an index would be a second structure to
   keep in step for no measurable gain at 256. */
export function findProvRow(ledger, gid) {
  if (!ledger || !Array.isArray(ledger.list) || !gid) return null;
  for (let i = ledger.list.length - 1; i >= 0; i--) {
    if (ledger.list[i].id === gid) return ledger.list[i];
  }
  return null;
}

export const gearProvMethods = {
  /* ═══ THE ID ═══
     Server-assigned and never accepted from a client.  Time + a
     per-player sequence + four random characters: the time orders it,
     the sequence makes two mints in the same millisecond distinct, and
     the random tail keeps ids from colliding across players after a
     trade or a store sale moves a row from one ledger to another (PR 3).

     Unguessability is NOT the security property — the ledger is
     (see the header) — but a guessable id would let a player's own
     forged claim accidentally name one of their own rows, which is
     noise nobody needs. */
  _gearProvMintId(ledger) {
    const seq = (ledger.seq = (ledger.seq || 0) + 1);
    const rnd = Math.floor(Math.random() * 1679616).toString(36).padStart(4, '0');
    return 'g' + Date.now().toString(36) + '.' + seq.toString(36) + '.' + rnd;
  },

  /* The in-memory ledger cache: playerId -> ledger.  Lives exactly as
     long as the session does.  A deploy wipes it (rule 11) and nothing
     is lost, because storage is the truth and the next join reloads. */
  _gearProvMap() {
    if (!this._gearProvCache) this._gearProvCache = new Map();
    return this._gearProvCache;
  },

  /* Warm the cache on join.  ONE storage get, bounded — never a
     prefix list (rule 9).  Called from _handleJoin BEFORE
     _gearStashAdoptOnJoin, because the adoption resolves gids against
     it; a cold cache there would mark a genuinely minted wardrobe
     legacy for the whole session. */
  async _gearProvLoadOnJoin(playerId) {
    if (!playerId) return null;
    let rec = null;
    try { rec = await this.state.storage.get(GEAR_PROV_KEY(playerId)); } catch (e) { rec = null; }
    const ledger = normalizeProvLedger(rec);
    this._gearProvMap().set(playerId, ledger);
    return ledger;
  },

  _gearProvOf(playerId) {
    return (playerId && this._gearProvMap().get(playerId)) || null;
  },

  _gearProvForget(playerId) {
    if (playerId) this._gearProvMap().delete(playerId);
  },

  /* Fire-and-forget put, the _saveRpg posture (rule 10): the output gate
     holds every outbound message until prior writes durably commit, so
     a client can never be shown a gid whose row has not landed.  A crash
     between the mint and the put leaves a piece carrying an id with no
     row — which resolves as `legacy` on the next join.  That is the
     right way for this to fail: the player keeps the piece and loses
     only the ability to sell it. */
  _gearProvSave(playerId, ledger) {
    try { this.state.storage.put(GEAR_PROV_KEY(playerId), ledger); } catch (e) { /* see above */ }
  },

  /* ═══ RECORD A MINT ═══
     `piece` is the blob the server just built and is about to hand over.
     Mutated in place with `gid` + `prov`, and returned, so a mint site is
     one line at the end of what it already wrote.

     PRECONDITION: the player is joined, so the cache is warm.  Every
     mint path in this version runs inside a handler that has already
     resolved `this.playerState[id]`, which only exists after the join
     that warms it.  A cold cache is therefore a bug, not a race — and
     it fails toward `legacy` (the piece is handed over unrecorded and
     unsellable) rather than toward a lost or a forged piece. */
  _gearProvRecord(playerId, slot, piece, src) {
    if (!piece || typeof piece !== 'object' || Array.isArray(piece)) return piece;
    delete piece.gid;
    delete piece.prov;
    if (!playerId || !isGearProvSlot(slot)) { piece.prov = PROV_LEGACY; return piece; }
    const ledger = this._gearProvOf(playerId);
    if (!ledger) { piece.prov = PROV_LEGACY; return piece; }
    const id = this._gearProvMintId(ledger);
    /* The row stores the minted blob VERBATIM (minus the two provenance
       fields, which are re-derived).  Verbatim, not a chosen subset, so
       that a field added to a piece next year is carried by the rebuild
       without an edit here — the rebuild is what makes a forged gid
       worthless, and it can only be as complete as this copy. */
    ledger.list.push({ id, slot, src: typeof src === 'string' ? src.slice(0, 24) : '', at: Date.now(), p: clonePiece(piece) });
    if (ledger.list.length > GEAR_PROV_CAP) {
      ledger.forgotten += ledger.list.length - GEAR_PROV_CAP;
      ledger.list = ledger.list.slice(ledger.list.length - GEAR_PROV_CAP);
    }
    this._gearProvSave(playerId, ledger);
    piece.gid = id;
    piece.prov = PROV_MINTED;
    return piece;
  },

  /* ═══ RESOLVE ONE PIECE AGAINST THE LEDGER ═══
     The single funnel every path — inbound claim, stored blob, echo —
     goes through.  `claim` is whatever we have; `slot` is where it is
     going.
       - a gid we minted for THIS player, into THIS slot: the piece is
         REBUILT from the ledger's copy.  Whatever else the claim said
         is discarded (rule 16).
       - anything else: the claim's own fields, both provenance fields
         stripped, marked `legacy`.
     `sanitize` is passed in so this module stays pure of the room's
     clamps — the caller supplies the same sanitizer that path already
     used, and it runs on the claim's fields, never on ours (a ledger
     row was sanitized when it was minted). */
  _gearProvResolve(playerId, slot, claim, sanitize, trusted) {
    if (!claim || typeof claim !== 'object' || Array.isArray(claim)) return null;
    const gid = claimedGid(claim);
    const ledger = gid ? this._gearProvOf(playerId) : null;
    const row = ledger ? findProvRow(ledger, gid) : null;
    if (row && row.slot === slot) {
      /* ═══ TRUSTED vs CLAIMED, and why the difference is load-bearing ═══
         `trusted` marks OUR OWN stored copy -- the rpg blob we wrote.  A
         minted piece can legitimately CHANGE after it is minted: slotting a
         gem rewrites an amulet's `gem` and `name` (amulet.js op:'gem'), and
         hardening rewrites a weapon's.  Rebuilding those from the mint-time
         row would silently revert the change -- which is exactly what the
         first cut of this did: a Mythic Flame Amulet came back from a
         reconnect with `gem: null`, caught by amulet.test.mjs, not by
         reasoning.  So our own copy keeps its own fields and only has its id
         VERIFIED; a server-side mutation of a minted piece is expected to
         call _gearProvTouch so the row follows it.

         A CLAIM is the other case and gets the opposite treatment: the
         piece is rebuilt from the row and everything the client said about
         it is discarded (rule 16).  That is what makes a forged gid
         worthless, so the default is the strict one -- a call site that
         wants the lenient branch has to ask for it by name. */
      if (trusted) {
        const own = { ...claim };
        delete own.prov;
        own.gid = row.id;
        own.prov = PROV_MINTED;
        return own;
      }
      const out = clonePiece(row.p);
      delete out.gid;
      delete out.prov;
      out.gid = row.id;
      out.prov = PROV_MINTED;
      return out;
    }
    const bare = stripProv(claim);
    const clean = sanitize ? sanitize(bare) : bare;
    if (!clean || typeof clean !== 'object') return clean || null;
    /* The sanitizers that REBUILD a whitelisted object (_sanitizeAmulet,
       sanitizeCosmeticEntry) drop unknown fields, so `prov` is set after
       them, never before.  This is the backwards half of #643's `_sv`
       finding — a genuine mark lost on the round trip — and the reason
       `prov` is derived rather than carried. */
    delete clean.gid;
    clean.prov = PROV_LEGACY;
    return clean;
  },

  /* A whole list, resolved.  Used by the stash load/adopt path. */
  _gearProvResolveList(playerId, slot, list, sanitize, trusted) {
    if (!Array.isArray(list)) return [];
    const out = [];
    for (const g of list) {
      const r = this._gearProvResolve(playerId, slot, g, sanitize, trusted);
      if (r) out.push(r);
    }
    return out;
  },

  /* ═══ THE ROW FOLLOWS THE PIECE ═══
     Call after a server-side op MUTATES a piece the server minted (gem
     slotting today; anything that rewrites a stat or a name tomorrow), so
     the ledger's copy stays the thing a rebuild would produce.  Without
     it, the row and the piece drift and the drift only shows up on a
     path that rebuilds -- which is the far side of a reconnect, where it
     reads as "the game ate my gem".

     A no-op for a legacy piece: nothing to keep in step. */
  _gearProvTouch(playerId, piece) {
    if (!piece || typeof piece !== 'object') return piece;
    const gid = claimedGid(piece);
    if (!gid) return piece;
    const ledger = this._gearProvOf(playerId);
    const row = ledger ? findProvRow(ledger, gid) : null;
    if (!row) return piece;
    const p = clonePiece(piece);
    delete p.gid;
    delete p.prov;
    row.p = p;
    this._gearProvSave(playerId, ledger);
    return piece;
  },

  /* ═══ v2.3.2537: IDS DO NOT RIDE THE ROOM-WIDE BROADCAST ═══
     `getAllPlayerData()` spreads a player's whole state into the
     `state_sync` every other player receives, and a minted piece now carries
     `gid` and `prov` -- so every player in the room learned the ids of
     everyone else's gear.

     Not a way IN: a gid is only ever looked up in the ledger of the player
     who sent it, so knowing a stranger's id buys nothing (the module header
     explains why).  It is fixed because it CONTRADICTS what this lane
     already decided: the loot pickup deliberately copies each piece so the
     public pile carries no gid, and then the bigger broadcast carried them
     anyway.  Fixing the site you were looking at and not the class is the
     TRAPS #13 shape.

     SO THIS CROPS BY SHAPE, NOT BY A LIST OF FIELD NAMES.  The first cut
     named the four worn slots and the five stash lists -- and missed
     `_questGrantOverflow`, the in-memory scratch a quest turn-in parks
     minted armour on, which is on playerState like everything else and rode
     straight out.  An allowlist here is a list somebody has to remember to
     extend every time a new field can hold a piece, and the test only caught
     it because it was rewritten to search for `gid` instead of trusting its
     own name.  A sweep cannot be forgotten.

     Cheap: one `in` check per top-level field, and arrays are only walked up
     to ARRAY_SCAN entries -- every gear-bearing list in the blob is capped
     far below that (32 per gear stash, 8 weapons), so a longer array is by
     construction not a gear list and is left alone rather than paid for.

     `entry` is the caller's own fresh spread, so the replacement copies
     never touch the live playerState -- asserted in the suite, because a
     crop that stripped the server's own state would be far worse than the
     leak.  Runs on the join path only (state_sync is not a tick message). */
  _gearProvCropPeer(entry) {
    if (!entry || typeof entry !== 'object') return entry;
    const ARRAY_SCAN = 64;
    const bare = (p) => {
      if (!p || typeof p !== 'object' || Array.isArray(p)) return p;
      if (!('gid' in p) && !('prov' in p)) return p;
      const c = { ...p };
      delete c.gid;
      delete c.prov;
      return c;
    };
    for (const k of Object.keys(entry)) {
      const v = entry[k];
      if (!v || typeof v !== 'object') continue;
      if (Array.isArray(v)) {
        if (!v.length || v.length > ARRAY_SCAN) continue;
        let touched = false;
        for (const e of v) {
          if (e && typeof e === 'object' && !Array.isArray(e) && ('gid' in e || 'prov' in e)) { touched = true; break; }
        }
        if (touched) entry[k] = v.map(bare);
        continue;
      }
      const c = bare(v);
      if (c !== v) entry[k] = c;
    }
    return entry;
  },

  /* ═══ ONE MINT, ONE PIECE ═══
     A `gid` names a single act of minting, so it may sit on exactly one
     piece in a player's wardrobe.  Walks the four worn slots first, then
     the five stash lists in field order; the first piece carrying an id
     keeps it, every later piece carrying the SAME id is demoted to
     `legacy`.

     Demoted, never deleted.  The three ways a second copy of one id can
     appear are a stale client list, a half-applied equip, and a forged
     claim -- and only the third deserves to lose anything.  Since a
     demoted piece keeps every stat it had and only loses the ability to
     be sold, the honest cases cost a player nothing they can see, and
     the forged one gets exactly what it would have got without the id.
     That is why this can be unconditional: there is no case where being
     wrong destroys a piece of gear.

     Worn beats stashed because the worn slot is the one the player is
     actually using and the one the damage maths reads.  Mutates ps. */
  _gearProvDedupe(ps) {
    if (!ps) return;
    const seen = new Set();   /* ids arrive from clients -- never a plain object (TRAPS #6) */
    const visit = (piece) => {
      if (!piece || typeof piece !== 'object' || Array.isArray(piece)) return;
      const gid = claimedGid(piece);
      if (!gid) return;
      if (seen.has(gid)) { delete piece.gid; piece.prov = PROV_LEGACY; return; }
      seen.add(gid);
    };
    for (const slot of ['armor', 'legsArmor', 'shield', 'amulet']) visit(ps[slot]);
    for (const f of ['armorStash', 'legsStash', 'shieldStash', 'gearStash', 'amuletStash']) {
      const list = ps[f];
      if (!Array.isArray(list)) continue;
      for (const g of list) visit(g);
    }
  },

  /* Is this piece one the server can prove?  The single question PR 3's
     listing gate asks, kept here so there is one definition of
     "sellable provenance" rather than one per caller. */
  _gearProvOwned(playerId, slot, piece) {
    const gid = claimedGid(piece);
    if (!gid) return false;
    const ledger = this._gearProvOf(playerId);
    const row = ledger ? findProvRow(ledger, gid) : null;
    return !!(row && row.slot === slot);
  },
};
