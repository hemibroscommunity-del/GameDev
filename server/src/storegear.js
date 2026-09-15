/* ═══ v2.3.2528: SELLING YOUR GEAR — STORE PHASE 3 (spec:
 * docs/specs/general-store.md "Gear listings", docs/specs/gear-stash.md) ═══
 *
 * Phase 1 (v2.3.2475, store.js) built the general store: per-listing
 * sales of stackables and stash WEAPONS, with gold escrow, resting
 * bids, credit-first settlement and lazy expiry.  Phase 2 (v2.3.2523,
 * gearstash.js) moved the five gear lists -- armour, legs, shields,
 * cosmetic layers and amulets -- into the rpg blob, so the server holds
 * a copy of its own.  This is phase 3: the store can now take custody
 * of one.
 *
 * It is a THIN module on purpose.  Everything that moves money or goods
 * -- the `sale` / `pendBid` / `releasing` markers, the wake-time
 * rebuild, the credit-first settle, the opId journal -- already exists
 * in store.js and is shared verbatim: a gear listing is the same record
 * with `kind: 'gear'`, and it travels the same `_stSettle` and
 * `_stRelease` as every other listing.  What lives HERE is only the
 * three things gear needs that stackables and weapons do not:
 *   1. how you NAME a gear piece in a request (a selector, not an index)
 *   2. reconciling the WORN slot before custody changes hands
 *   3. what a gear piece is worth as a credit (`kind: 'gear'`)
 *
 * ── 1. WHY A SELECTOR AND NOT AN INDEX ───────────────────────────────
 *
 * A stash WEAPON is addressed by index because `ps.weaponStash` IS the
 * authoritative list -- the client mirrors it off the player_state echo,
 * so index 2 means the same weapon on both sides.  The gear stashes are
 * not like that yet.  gear-stash.md says so in its own "What this does
 * NOT solve": "the client is still the authority for its own stashes...
 * the server's copy is a point-in-time snapshot and drifts as the player
 * rearranges their gear."  The two lists are in different orders and can
 * be different lengths, so an index from the client points at whatever
 * happens to sit there on OUR side -- which is how a player sells a
 * different piece from the one they tapped.
 *
 * So a gear request carries a SELECTOR: the piece's own identifying
 * fields, from which the server derives `stashSig` (gearstash.js -- the
 * client's own _shSig, so both sides call the same two pieces the same
 * piece) and finds a matching entry in ITS OWN list.  The selector is
 * never the goods: what gets escrowed is the server's own object, by
 * reference, exactly as handoff rule 16 demands and exactly as
 * `_stCreateListing` already does for a weapon.  A `hint` index rides
 * along only to break ties between two identical pieces; it is checked
 * against the signature before it is believed.
 *
 * ── 2. THE WORN SLOT (the one that mints) ────────────────────────────
 *
 * Adoption records the stash as it stood at that join.  Equip a piece
 * afterwards and the client moves it out of its LOCAL stash and into the
 * worn slot -- and tells the server about the worn slot alone
 * (`stats_update`, grids.js).  Our copy of the stash still lists it.
 * The piece is therefore recorded TWICE: once as `ps.armor`, once in
 * `ps.armorStash`.
 *
 * Escrow from the stash without reconciling and the player sells the
 * armour off their own back and keeps wearing it -- one plate, two
 * owners, and the buyer paid real gold for a copy.  That is minting, and
 * it needs no modified client at all: equipping a spare is the normal
 * way to use this game.
 *
 * `_stGearReconcileWorn` closes it at the only moment that matters: the
 * moment custody changes hands.  For each of the four slots the server
 * actually knows about it removes ONE stash entry matching the worn
 * piece -- one, not all, because a player who genuinely owns two
 * identical plates and wears one still has a spare to sell.  It runs
 * before the piece is resolved, so a worn piece is simply not there to
 * be listed.
 *
 * It is deliberately NOT hung off the join path: adoption belongs to
 * gearstash.js, this is the escrow gate, and a reconciliation that runs
 * where the value moves is the one that cannot be bypassed by a route
 * that forgets to call it.
 *
 * COSMETICS ARE THE EXCEPTION, and it is a real one: the server stores
 * no worn-cosmetic slot at all (there is no such field in _saveRpg's
 * fixed list -- the rendered layers are client-local), so there is
 * nothing to reconcile a `gearStash` entry against.  A player wearing a
 * cosmetic chest can sell the server's stale copy of it and keep
 * wearing their own.  Cosmetics carry no stats -- they are appearance --
 * so what leaks is a duplicate LOOK and the buyer's gold, not power.
 * It is called out here, in the spec and in the PR body rather than
 * quietly shipped; closing it needs a worn-cosmetic field, which is a
 * gear-stash change, not a store change.
 *
 * ── 3. WHAT IS *NOT* CLOSED, AND WHY THAT IS A DECISION ──────────────
 *
 * Being in the stash list is NOT proof of ownership.  Adoption validates
 * the SHAPE of what a client claims and never whether the player ever
 * held it; it reaches every existing character, and (v2.3.2527) it never
 * closes.  A modified client can therefore put gear into its own stash
 * list, and from this version that gear can be sold.
 *
 * The three ways to close it were weighed, not defaulted through.
 *
 * "Only list pieces the server can corroborate" is the one that would
 * really work, and the reason it does not work YET is worth writing
 * down, because it is nearly the opposite of what it looks like.  The
 * server DOES mint armour: `_rollArmorDropsForKill` (index.js) builds a
 * dropped piece out of MONSTER_ARMOR_DROPS, and `_grantQuestItem`
 * (quests.js) builds quest armour out of QUEST_REWARDS.  But both were
 * written when there was no server-side stash to put them in, so both
 * hand the piece to the CLIENT -- `loot_credit.armor`,
 * `quest_reward_stashed` -- and never record it in `ps`.  The server
 * mints gear and then forgets it.  So corroboration has a real source
 * and no ledger, and until those two sites also write the stash, "list
 * only corroborated pieces" lists NOTHING.  (The forge-minted fields a
 * client claim cannot fake -- `hardness`, `temper` -- are weapons-only:
 * hardening.js refuses any slot that is not a weapon.)
 *
 * "Require the piece across more than one session" was rejected as
 * theatre with a real cost: adoption runs on every join, so an attacker
 * pays one extra login while an honest player waits a session to sell
 * armour they just earned.
 *
 * So the risk is ACCEPTED for the demo, deliberately, and bounded
 * instead:
 *   - the whole surface hangs off its own narrow cap, `caps.storeGear`,
 *     which live-ops can switch off WITHOUT A DEPLOY (join.js spreads
 *     `..._liveFlags` last over the baked caps) -- one flag write and
 *     gear listings stop being offered or accepted;
 *   - `STORE_GEAR.STRICT_FLAG` is the tighter rule, already wired: turn
 *     on the `store_gear_strict` live flag and only pieces the SERVER
 *     itself wrote are listable;
 *   - which the server now marks, from this version on: every piece
 *     delivered through `_creditPlayer(kind:'gear')` -- the refund of an
 *     expired listing, the goods leg of a purchase -- is stamped `_sv`.
 * Nothing carries `_sv` at the moment this ships, so strict mode lists
 * nothing and must stay off.  It becomes usable the moment the two mint
 * sites above ALSO write the stash they already fill on the client --
 * that is the named next slice, and it is a small one because the merge
 * gear-stash.md ships is a multiset union: a piece written to both sides
 * converges to one copy on the next join rather than doubling.
 * Do not read `_sv` as a value: it is a provenance mark, it multiplies
 * nothing, and strict-mode sanitizing strips it off anything a client
 * hands us (see _stGearStrip).
 */

import { GEAR_STASH_FIELDS, GEAR_STASH_CAP, stashSig, sanitizeGearPiece, sanitizeCosmeticEntry } from './gearstash.js';

export const STORE_GEAR = {
  /* The live-ops flag that tightens listing to server-written pieces
     only.  Read through _flagOn (liveops.js), which is warm by the time
     any HTTP route runs (the join path awaits _liveFlagsEnsure). */
  STRICT_FLAG: 'store_gear_strict',
  /* The provenance mark.  Underscored like every other server-owned
     scratch field on a blob, and stripped from any client claim. */
  PROV: '_sv',
};

/* Which worn slot each stash list is the spare rack for.  `gearStash`
   is absent ON PURPOSE -- the server has no worn-cosmetic field, see the
   header.  Written out rather than derived so the omission is visible
   and greppable instead of being an accident of string arithmetic. */
const WORN_SLOT_FOR = {
  armorStash: 'armor',
  legsStash: 'legsArmor',
  shieldStash: 'shield',
  amuletStash: 'amulet',
};

/* Every gear list files under the bag's ARMOR chip.  The bag's own
   CATEGORIES roster is all/weapon/armor/potion/crafting
   (src/ui/mobile/dash/bagFilterBus.js) and armour, legs, shields,
   cosmetic layers and amulets are all things you put on -- so the store
   groups them the way the bag would.  A mirror, not a new authority:
   drift files a piece under the wrong tab, which is cosmetic. */
const GEAR_CAT = 'armor';

/* The human slot word for a listing card, per list. */
const SLOT_LABEL = {
  armorStash: 'Chest',
  legsStash: 'Legs',
  shieldStash: 'Shield',
  gearStash: 'Outfit',
  amuletStash: 'Amulet',
};

/* A field name from a request is a client-supplied string, so it is
   matched against the frozen roster rather than used to index anything.
   `indexOf` on the array, not a lookup on an object: '__proto__' is a
   legal string and a plain-object map would answer for it (TRAPS #6). */
export function isGearField(f) {
  return typeof f === 'string' && GEAR_STASH_FIELDS.indexOf(f) !== -1;
}

export const storeGearMethods = {
  /* Sanitize ONE piece for a given list.  `strict` means "this came off
     the wire" -- it strips the forge-minted fields and, here, the
     provenance mark, so a client can never award itself one.  Amulets go
     through the room's own _sanitizeAmulet, which is the whitelist the
     authoritative damage roll reads (AMULET_TIER_POWER), rather than a
     second copy of it. */
  _stGearSanitize(field, piece, strict) {
    if (field === 'amuletStash') return this._sanitizeAmulet(piece);
    if (field === 'gearStash') return sanitizeCosmeticEntry(piece);
    return sanitizeGearPiece(piece, !!strict);
  },

  /* Strip the provenance mark off anything that came from a client.
     sanitizeGearPiece keeps unknown fields deliberately (so a field the
     table has not learned about yet is not destroyed), which is exactly
     why `_sv` has to be removed by name here. */
  _stGearStrip(piece) {
    if (piece && typeof piece === 'object') delete piece[STORE_GEAR.PROV];
    return piece;
  },

  /* ═══ CONSTRAINT 2: the worn piece is not a spare ═══
     Remove ONE stash entry per worn slot that matches the worn piece.
     Returns true when it changed something, so the caller can persist.
     Cheap -- five signature builds over lists capped at 32 -- and it
     runs on the listing path only, where custody changes hands. */
  _stGearReconcileWorn(ps) {
    if (!ps) return false;
    let changed = false;
    for (const field of GEAR_STASH_FIELDS) {
      const wornKey = WORN_SLOT_FOR[field];
      if (!wornKey) continue;                 // gearStash: no worn record
      const worn = ps[wornKey];
      if (!worn || typeof worn !== 'object') continue;
      const list = ps[field];
      if (!Array.isArray(list) || !list.length) continue;
      const wantSig = stashSig(field, worn);
      if (!wantSig) continue;
      const at = list.findIndex((e) => stashSig(field, e) === wantSig);
      if (at === -1) continue;
      list.splice(at, 1);                     // ONE copy: a real spare survives
      changed = true;
    }
    return changed;
  },

  /* Find the seller's own copy of the piece a request names.  `sel` is a
     SELECTOR -- its identifying fields become a signature and nothing
     else about it is ever read.  `hint` is the client's index, believed
     only if the signature at that index agrees; otherwise the first
     match wins.  Returns the index, or -1. */
  _stGearResolve(ps, field, sel, hint) {
    const list = ps && ps[field];
    if (!Array.isArray(list) || !list.length) return -1;
    const wantSig = stashSig(field, sel);
    if (!wantSig) return -1;
    const h = Math.floor(Number(hint));
    if (Number.isFinite(h) && h >= 0 && h < list.length && stashSig(field, list[h]) === wantSig) return h;
    return list.findIndex((e) => stashSig(field, e) === wantSig);
  },

  /* ═══ the kill switch ═══
     `_flagOn` cannot answer this: an UNSET flag and a flag set to false
     are both falsy, and the baked cap is `true`, so "off" has to mean
     "present and false" — the same thing join.js's `..._liveFlags`
     spread does to the advertisement.  One flag write turns gear
     listings off for the whole room without a deploy: the cap stops
     being advertised (so no client offers the button) and this stops the
     route accepting one (so a client that kept its button is refused).
     Existing gear listings are NOT cancelled by it — they keep resting,
     selling and expiring through the paths they already travel, because
     a kill switch that destroyed live escrow would be worse than the
     thing it is switching off. */
  _stGearOff() {
    const f = this._liveFlags;
    if (!f || typeof f !== 'object') return false;
    return Object.prototype.hasOwnProperty.call(f, 'storeGear') && !f.storeGear;
  },

  /* Is this piece allowed to be listed at all?  Shape first, then the
     optional strict-provenance rule (see the header's item 3). */
  _stGearListable(piece) {
    if (!piece || typeof piece !== 'object') return false;
    if (this._flagOn && this._flagOn(STORE_GEAR.STRICT_FLAG)) return piece[STORE_GEAR.PROV] === true;
    return true;
  },

  /* The display record for a gear listing.  Read off the ESCROWED
     server-side piece only, never off the request -- the whole reason
     the store exists beside the order book (market.js:66-69, "a modified
     client can advertise a copper blade as godly").  The piece itself
     never goes on the wire: _stPublic whitelists, and `gear` is not in
     its list. */
  _stGearDisplay(field, piece) {
    const g = piece || {};
    const slot = SLOT_LABEL[field] || 'Gear';
    if (field === 'gearStash') {
      return {
        name: (typeof g.name === 'string' && g.name) ? g.name.slice(0, 40) : (typeof g.gearId === 'string' ? g.gearId : 'Outfit'),
        slot, gearId: typeof g.gearId === 'string' ? g.gearId : null,
        gearSlot: typeof g.slot === 'string' ? g.slot : null,
      };
    }
    if (field === 'amuletStash') {
      return {
        name: (typeof g.name === 'string' && g.name) ? g.name.slice(0, 40) : 'Amulet',
        slot, tier: typeof g.tier === 'string' ? g.tier : null,
        gem: typeof g.gem === 'string' ? g.gem : null,
      };
    }
    return {
      name: (typeof g.name === 'string' && g.name) ? g.name.slice(0, 40) : slot,
      slot,
      tier: typeof g.tier === 'string' ? g.tier : null,
      tierMult: typeof g.tierMult === 'number' ? g.tierMult : 1,
      quality: typeof g.quality === 'string' ? g.quality : null,
      gearBase: typeof g.gearBase === 'string' ? g.gearBase : null,
      mat: typeof g.mat === 'string' ? g.mat : null,
    };
  },

  _stGearCategory() { return GEAR_CAT; },

  /* ═══ the escrow ═══
     Called from _stCreateListing's `kind === 'gear'` branch, AFTER the
     price/cap checks and BEFORE the record is written, so the listing
     path's existing unwind still covers a put that throws.  Returns
     `{ ok, field, piece }` or `{ ok: false, error }`.

     Order matters and is the same order the weapon branch uses: take the
     server's own copy out of the server's own list, save, flush the
     echo.  Nothing the request supplied is kept. */
  _stGearEscrow(playerId, ps, body) {
    const field = body && body.field;
    if (!isGearField(field)) return { ok: false, error: 'Invalid item' };

    /* Constraint 2 first: a worn piece must not be listable, and the
       reconciliation is persisted whether or not the listing succeeds --
       it corrected a double-count that was real either way. */
    if (this._stGearReconcileWorn(ps)) {
      this._saveRpg(playerId, ps);
      this._queuePlayerStateFlush(playerId);
    }

    /* The selector is sanitized in STRICT mode before its signature is
       taken.  It is only a lookup key, but a 200 KB `name` would build a
       200 KB key, and strict mode is also what removes a claimed `_sv`
       before it could ever be compared. */
    const sel = this._stGearStrip(this._stGearSanitize(field, body && body.sel, true));
    if (!sel) return { ok: false, error: 'Invalid item' };

    const at = this._stGearResolve(ps, field, sel, body && body.hint);
    if (at === -1) return { ok: false, error: 'Item not in stash' };

    /* Rule 16: the server's own object by index into its OWN list.  Run
       through the non-strict sanitizer so a stale stored blob heals on
       the way into escrow (the v2.3.1104 heal-on-load posture) -- the
       escrowed copy is what a buyer will be handed. */
    const piece = this._stGearSanitize(field, ps[field][at], false);
    if (!piece) return { ok: false, error: 'Item not in stash' };
    if (!this._stGearListable(ps[field][at])) return { ok: false, error: 'That piece cannot be listed yet' };
    if (ps[field][at][STORE_GEAR.PROV] === true) piece[STORE_GEAR.PROV] = true;

    ps[field].splice(at, 1);
    this._saveRpg(playerId, ps);
    this._queuePlayerStateFlush(playerId);
    return { ok: true, field, piece };
  },

  /* ═══ the credit ═══
     `_applyCreditToPs` (inbox.js) dispatches kind 'gear' here, so the
     goods leg of a sale, the refund of a cancel or an expiry, and the
     unwind of a listing that could not be written ALL travel the one
     funnel every payout in this game uses -- online to live state,
     offline into inbox:<pid>, idempotent through its opId.

     Returns false, and ONLY false, when the entry must stay queued: a
     full stash.  That mirrors the weapon rule exactly (handoff rule 3 --
     _saveRpg truncates at the cap, so pushing past it would silently
     destroy the piece).  A malformed payload returns TRUE so a bad entry
     can never wedge somebody's mail forever. */
  _stGearApplyCredit(ps, payload) {
    const field = payload && payload.field;
    if (!isGearField(field)) return true;
    const piece = this._stGearSanitize(field, payload.piece, false);
    if (!piece) return true;
    if (!Array.isArray(ps[field])) ps[field] = [];
    if (ps[field].length >= GEAR_STASH_CAP) return false;
    /* The server is the one writing it, so it is corroborated BY
       CONSTRUCTION -- this is the only place `_sv` is ever set. */
    piece[STORE_GEAR.PROV] = true;
    ps[field].push(piece);
    return true;
  },
};
