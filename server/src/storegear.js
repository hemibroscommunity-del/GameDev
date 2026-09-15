/* ═══ v2.3.2531: SELLING YOUR GEAR — STORE PHASE 3 (spec:
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
 * `_stRelease` as every other listing.  What lives HERE is only what
 * gear needs and stackables and weapons do not -- how you NAME a piece
 * in a request, what a piece is worth as a credit (`kind: 'gear'`), and
 * the gate a listing has to pass.  The sections below are:
 *   1. HOW A PIECE IS NAMED: an id, or the selector that finds one
 *   2. THE WORN SLOT: closed, by an id rather than a guess
 *   3. BEING IN THE STASH IS NO LONGER THE QUESTION
 *   4. WHY A REFUSAL HAS A REASON, and not just a `false`
 *   5. `_sv` IS RETIRED
 *
 * v2.3.2532 revision: the worn-slot RECONCILIATION this module shipped
 * with is gone.  It deleted gear players genuinely own -- read section 2
 * before adding anything like it back.
 *
 * ═══ v2.3.2551 REVISION: THE LEDGER IS THE GATE ═══
 *
 * Sections 2 and 3 below USED to describe two open trust holes -- "you can
 * sell the armour off your own back" and "being in the stash is not proof
 * of ownership" -- accepted deliberately for the demo and bounded by the
 * `caps.storeGear` kill switch.  Both are CLOSED now, by the thing their
 * own text named as the real fix: "the server has to know what is in a
 * stash because IT put it there".  It does.  `gear_prov:<playerId>`
 * (gearprov.js, #648) records every piece this server mints, and #650
 * built the custody primitives on top of it.  This version wires them up.
 *
 * WHAT A LISTING NOW HAS TO PASS.  One call -- `_gearSellable(playerId,
 * slot, gid)` -- and it is the WHOLE gate, not one of two.  It asks both
 * questions rather than only the first:
 *
 *   1. did this server MINT this piece for this player (is there a row)?
 *   2. is this player still HOLDING it (is the row still theirs, is the
 *      piece not on their body, not sitting in their mail)?
 *
 * The second question is the one #650's own review added, after running
 * both consequences against a real GameRoom: a worn piece has a row (the
 * tut_1 shield is minted straight onto your body), and so did a piece
 * parked in the post.  Either one prints gear the moment a store wires
 * this up, which is this file.  Do NOT add a second check beside the gate:
 * the reasons it returns are load-bearing (see below) and a caller that
 * refuses for its own reasons first has no reason string to show.
 *
 * ── 1. HOW A PIECE IS NAMED: AN ID, OR THE SELECTOR THAT FINDS ONE ───
 *
 * A stash WEAPON is addressed by index because `ps.weaponStash` IS the
 * authoritative list -- the client mirrors it off the player_state echo,
 * so index 2 means the same weapon on both sides.  The gear stashes are
 * still not like that (gear-stash.md, "What this does NOT solve": the
 * client is the authority for its own and the server's copy drifts), so
 * an index from a client points at whatever happens to sit there on OUR
 * side -- which is how a player sells a different piece from the one they
 * tapped.
 *
 * v2.3.2531 solved that with a SELECTOR: the piece's own identifying
 * fields, from which the server derives `stashSig` and finds a matching
 * entry in its own list.  v2.3.2551 adds the better answer beside it --
 * `{ field, gid }`, the server's own id for the piece -- and BOTH are
 * understood, because a worker and a browser deploy separately:
 *
 *   - `body.gid` (new client, `caps.storeGearRef`): resolved straight
 *     against the ledger.  Strictly better than a selector, because the
 *     ledger reaches a minted piece the server's stash SNAPSHOT has not
 *     adopted yet -- a quest plate goes to the browser's bag and only
 *     reaches our list on the next join, and until then a selector finds
 *     nothing while the id finds the row.
 *   - `body.sel` (old client, still shipped): resolved against the
 *     server's own list as before, and then THE SERVER'S OWN ENTRY'S
 *     `gid` is what goes to the gate -- never the one the selector
 *     claimed.  Free accuracy on the way past: `stashSig` (gearstash.js)
 *     already keys on `gid:` + the id when a piece has one, and the
 *     client has stored `gid` since v2.3.2544, so for minted gear an old
 *     client's selector is ALREADY an id match rather than a name match.
 *
 * Either way the request only ever says WHICH piece.  What gets escrowed
 * is the ledger's own copy, by reference, exactly as handoff rule 16
 * demands.  `hint` still rides along on the selector path to break ties
 * between two identical pieces; it is checked against the signature
 * before it is believed.
 *
 * ── 2. THE WORN SLOT: CLOSED, BY AN ID RATHER THAN A GUESS ───────────
 *
 * The hole was that adoption records the stash as it stood at that join,
 * so a piece equipped afterwards is recorded TWICE -- once as `ps.armor`,
 * once still in `ps.armorStash` -- and selling the stash copy left the
 * seller wearing the armour they were paid for.
 *
 * v2.3.2531 tried to fix this by DELETING one stash entry whose
 * `name|gearBase|tierMult|tier` signature matched the worn piece, and
 * v2.3.2532 took it back out because that signature cannot tell a stale
 * copy from a second identical plate: it ate real spares, on every
 * request, in every slot, whether or not the listing then succeeded.
 * DELETING GEAR A PLAYER OWNS IS STRICTLY WORSE THAN THE DUPLICATION IT
 * WAS MEANT TO PREVENT.  That judgement stands and nothing here reverses
 * it -- this path still deletes nothing it was not asked to list.
 *
 * What closes it instead is that the duplicate is no longer ambiguous.
 * The worn piece and the stale stash entry carry the SAME `gid`, and
 * `_gearSellable` refuses a gid that is on the player's body -- with the
 * reason `worn`, which is something a player can act on ("take it off
 * first").  Two genuinely different plates have two different ids and
 * both stay sellable.  An id is not a guess.
 *
 * ── 3. BEING IN THE STASH IS NO LONGER THE QUESTION ──────────────────
 *
 * The old text here said: adoption validates the SHAPE of what a client
 * claims and never whether the player ever held it, so a modified client
 * could put gear into its own stash list and sell it.  That is still true
 * of adoption -- gear-stash.md's "What this does NOT solve" is unchanged
 * and this version does not touch it.  It simply stopped mattering to the
 * STORE, because being in the stash list is not what is asked any more.
 * What is asked is whether this server wrote the piece down when it minted
 * it.  A claimed piece has no row, so it comes out `legacy`: usable, worn,
 * rendered, counted in the damage maths, and not sellable.
 *
 * `caps.storeGear` is KEPT as the kill switch.  It is no longer bounding
 * an accepted risk -- it is an ordinary live-ops lever for switching a
 * surface off without a deploy, which is worth having on any money path.
 *
 * ── 4. WHY A REFUSAL HAS A REASON, AND NOT JUST A `false` ────────────
 *
 * #648 promised the player would be told WHY a piece cannot be sold, and
 * the promise went unkept: the mark reached the browser and nothing read
 * it.  A greyed-out Sell button with no explanation is worse than no
 * button -- the player cannot tell "you must take it off" from "this game
 * is broken".  So every refusal carries a STABLE reason string from
 * `_gearSellable` straight out to the client alongside a human sentence,
 * and `GEAR_REFUSAL` below is the one table that turns one into the other.
 *
 * `cosmetic` is deliberately NOT the same answer as `legacy`.  Outfit
 * layers have no server mint path at all (the catalog is client art) and
 * are never sellable BY DESIGN; telling a player "earned before receipts"
 * would invite the next contributor to "fix" cosmetics by adding a mint
 * path nobody wants.
 *
 * ── 5. `_sv` IS RETIRED (v2.3.2552) ──────────────────────────────────
 *
 * This module used to carry its own provenance mark: `_sv`, a boolean set
 * in `_stGearApplyCredit` and read by `_stGearListable` under the
 * `store_gear_strict` live flag.  Every part of that is gone -- the mark,
 * the flag, the listable check and the belt-and-braces strip.
 *
 * It drove exactly ONE decision and the ledger makes it better: `_sv` said
 * "a server wrote this", `gid` says "THIS server wrote this FOR YOU, and
 * here is the copy it wrote".  A boolean can be copied onto any blob -- it
 * is only as strong as the completeness of its stripping, and #643's own
 * review found the one inbound path that forgot to strip it.  A row cannot
 * be copied into somebody else's ledger.
 *
 * TWO CONSEQUENCES WORTH KNOWING.  `store_gear_strict` is now INERT: a
 * live-ops flag by that name changes nothing, and if it were switched ON
 * today it would go from "lists nothing" to "lists minted gear", which is
 * the permissive direction.  It is documented as needing to stay off and
 * nothing carried `_sv` before this, so there is nothing on the shelf that
 * changes hands differently.  And a stored piece may still carry the dead
 * field: `sanitizeGearPiece` (gearstash.js) sweeps it out unconditionally,
 * so blobs shed it on the next join rather than needing a migration.
 */

import { GEAR_STASH_FIELDS, GEAR_STASH_CAP, stashSig, sanitizeGearPiece, sanitizeCosmeticEntry } from './gearstash.js';
/* v2.3.2551: the custody layer (#650).  `slotForGearField` turns the
   request's list name into the ledger's slot name; the gate and the take
   are methods on the room (gearProvMethods), so they are called through
   `this` rather than imported. */
import { slotForGearField } from './gearprov.js';

export const STORE_GEAR = {
  /* v2.3.2552: `STRICT_FLAG` and `PROV` are GONE -- see section 5 of the
     header.  The object is kept because the module's own constants belong
     in one ALL-CAPS place (rule 25) and the next one will land here. */
  /* The longest gid the ledger ever mints is well under this; anything
     longer is not an id we issued, so it is refused before it reaches a
     comparison or a Map key (gearprov.js claimedGid uses the same bound). */
  MAX_GID: 40,
};

/* ═══ WHY A REFUSAL HAS A SENTENCE, NOT JUST A `false` (v2.3.2551) ═══
   The reason strings come from `_gearSellable` (gearprov.js) and are
   STABLE: the client keys off them, so they are part of the wire surface
   and renaming one is a breaking change.  This table is the one place
   they become English.

   MIRRORED, deliberately, in `src/ui/mobile/dash/gearSellReason.js` so the
   browser can grey a Sell button and say why BEFORE the player taps it --
   the server cannot be asked "would you refuse this?" without a round trip
   per card.  `market.test.mjs` asserts the two tables are identical, the
   same posture `mirror-audit.test.mjs` uses for data.js: a mirror that
   nothing pins is a mirror that drifts.

   A Map, not an object: these are looked up with a string that has been
   through a wire path, and `'__proto__'` is a legal string (TRAPS #6). */
export const GEAR_REFUSAL = new Map([
  ['legacy', 'Earned before the game kept receipts — it still works, but it cannot be sold'],
  ['cosmetic', "Outfits aren't sellable"],
  ['worn', "You're wearing it — take it off first"],
  ['in_mail', "It's still in the post"],
  ['not_held', "That piece isn't yours right now"],
  ['wrong_slot', 'Wrong kind of slot for that piece'],
  ['no_player', 'You are not in the game right now'],
  ['bad_field', 'Invalid item'],
]);

export function gearRefusalText(reason) {
  return GEAR_REFUSAL.get(reason) || 'That piece cannot be sold';
}

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

  /* ═══ NAME A PIECE: the id, or the selector that finds one ═══
     Returns the `gid` the gate should be asked about, or null when the
     request names nothing we hold a record for (which the gate answers as
     `legacy` -- the honest reason, and the one a player can understand).

     Header section 1 has the WHY.  The one line that matters for safety:
     on the selector path the id comes off the SERVER'S OWN entry, never
     off the selector.  A selector carrying a forged gid matches nothing
     (our entries carry the ids we minted), and even if it somehow did,
     `_gearSellable` resolves against this player's own ledger, so the
     worst a forgery buys is your own modest piece back. */
  _stGearNameToGid(ps, field, body) {
    const direct = body && body.gid;
    if (typeof direct === 'string' && direct && direct.length <= STORE_GEAR.MAX_GID) return direct;

    /* The selector is sanitized in STRICT mode before its signature is
       taken.  It is only a lookup key, but a 200 KB `name` would build a
       200 KB key. */
    const sel = this._stGearSanitize(field, body && body.sel, true);
    if (!sel) return null;
    const at = this._stGearResolve(ps, field, sel, body && body.hint);
    if (at === -1) return null;
    const own = ps[field][at];
    return (own && typeof own.gid === 'string' && own.gid) ? own.gid : null;
  },

  /* ═══ the escrow ═══
     Called from _stCreateListing's `kind === 'gear'` branch, AFTER the
     price/cap checks and BEFORE the record is written, so the listing
     path's existing unwind still covers a put that throws.  Returns
     `{ ok, field, piece, row }` or `{ ok: false, reason, error }`.

     ── v2.3.2551: THE GATE, AND ONLY THE GATE ──
     `_gearSellable` is the whole question (header section 1): minted AND
     held AND not worn AND not in the post AND the right slot.  There is
     deliberately no second check beside it -- not a stash-membership test,
     not a shape test -- because a caller that refuses first has no reason
     string to hand the player, and because two gates are two places for
     the next contributor to fix only one of.

     ── WHY THE TAKEN PIECE IS NOT RE-SANITIZED ──
     `_gearProvTake` hands back the LEDGER'S own copy of what the server
     minted, already sanitized at mint time.  Running it through
     `_stGearSanitize` again would be worse than useless: `_sanitizeAmulet`
     and `sanitizeCosmeticEntry` REBUILD from a whitelist, so they would
     drop the `gid` -- and an escrowed piece whose identity has been
     rubbed off is a piece the buyer receives as `legacy`.  Rule 16 is
     satisfied by the piece coming from our own record in the first place.

     ── CRASH SHAPE (walked, because this is money) ──
     `_gearProvTake` is synchronous: one in-memory ledger edit, a
     fire-and-forget ledger put, the stash splice and a `_saveRpg`.  The
     record write that carries the row into escrow happens in
     `_stCreateListing` immediately after.  If the room dies in between,
     the row is gone and the piece is out of the server's stash -- and the
     player's own browser still holds its copy, because the client only
     splices on `ok`.  Their next join re-adopts it and `_gearProvResolve`
     finds no row, so it comes back `legacy`: USABLE, WORN, COUNTED IN THE
     DAMAGE MATHS, NOT SELLABLE.  That is the direction this is built to
     fail in.  The other ordering -- write the listing, take the row after
     -- fails toward the piece existing in BOTH places, which is a
     duplicate, which is money. */
  _stGearEscrow(playerId, ps, body) {
    const field = body && body.field;
    if (!isGearField(field)) return { ok: false, reason: 'bad_field', error: gearRefusalText('bad_field') };
    const slot = slotForGearField(field);
    if (!slot) return { ok: false, reason: 'bad_field', error: gearRefusalText('bad_field') };

    const gid = this._stGearNameToGid(ps, field, body);
    /* A null gid is passed THROUGH to the gate rather than short-circuited
       here, so that a cosmetic answers `cosmetic` and everything else
       answers `legacy` -- the gate owns the reasons, this does not. */
    const verdict = this._gearSellable(playerId, slot, gid);
    if (!verdict.ok) return { ok: false, reason: verdict.reason, error: gearRefusalText(verdict.reason) };

    const took = this._gearProvTake(playerId, slot, verdict.gid);
    /* The gate said yes a moment ago and nothing can interleave between
       them (rule 9: no await in either), so this is a "cannot happen"
       branch.  It exists because the alternative to a branch here is an
       escrow of `undefined`. */
    if (!took || !took.piece || !took.row) {
      return { ok: false, reason: 'not_held', error: gearRefusalText('not_held') };
    }
    /* `_gearProvTake` has already spliced the server's own stash where the
       piece was present and saved the blob; this is only the echo. */
    this._queuePlayerStateFlush(playerId);
    return { ok: true, field, piece: took.piece, row: took.row };
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
    /* v2.3.2552: this used to stamp `_sv: true` here -- "the server is the
       one writing it, so it is corroborated by construction".  The mark is
       retired.  What corroborates a delivered piece now is its ledger ROW,
       which `_creditPlayer` has already granted (awaited) by the time this
       runs, and which `_gearProvMarkDelivered` reads back to set `gid` and
       `prov` on what lands here -- DERIVED from the ledger rather than
       asserted by whoever pushed it. */
    ps[field].push(piece);
    return true;
  },
};
