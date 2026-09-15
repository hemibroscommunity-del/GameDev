/* ═══ v2.3.2523: THE SERVER-SIDE GEAR STASHES (spec:
 * docs/specs/gear-stash.md) ═══
 *
 * Until now the server held ONE piece of gear per slot -- `armor`,
 * `legsArmor`, `shield`, `amulet` -- and the player's unequipped
 * spares lived only in their browser (`armorStash` / `legsStash` /
 * `shieldStash` / `gearStash` in src/data/gameSystems.js).  wsClient's
 * own shield-rescue comment states the reason in so many words: "there
 * is no server-side shield stash (handoff rule 1 forbids a new
 * rpg-blob field)".  Rule 1 forbids an AD-HOC field (TRAPS #2); it has
 * always allowed one added to the fixed list in `_saveRpg`, the way
 * goldNuggets/goldBars were (v2.3.1192).  That is what this slice does.
 *
 * WHY IT MATTERS, and why it is its own PR: nothing client-local can be
 * escrowed.  The general store (v2.3.2475, store.js) lists stackables
 * and stash WEAPONS and nothing else, because rule 16 forbids taking
 * custody of a value blob the client supplied -- the server can only
 * escrow what it already holds by reference.  So armour, legs, shields,
 * cosmetic gear and amulets cannot be sold until the server is the one
 * holding them.  This slice moves the holding; the selling is the next
 * one (backlog §2.2 lane M, M2 -> M3).  Nothing here changes what a
 * player can DO -- no new op, no new wire verb, no store change.
 *
 * FIVE LISTS, ONE FIXED FIELD LIST.  Four have a client stash to adopt
 * from; `amuletStash` has none yet (an amulet has no unequip flow --
 * InventoryPanel.jsx "amulet/cape have no unequip flow, so no button"),
 * and it ships here EMPTY and on the same rails so that the day it gets
 * one, no second migration and no second field-list edit is needed.
 *
 * ADOPTION, AND THE TWO SHAPES IT HAS TO SURVIVE.  Adoption is the
 * v2.3.1021 weaponSkills / v2.3.1192 nugget-ledger / v2.3.1198 gems
 * posture: the server's own copy is the record, and the client's local
 * lists are folded into it.  Two failure modes, both of which have
 * bitten this codebase before:
 *   - ADOPT TWICE.  #615's refund/delete crash window paid a listing out
 *     twice.  The same shape here would duplicate a player's armour on
 *     every reconnect.  Closed by a MULTISET UNION rather than a
 *     concatenation: the merged count for one piece is max(server's,
 *     client's), never the sum.  Re-running the merge on its own output
 *     is therefore a no-op -- the merge converges whether it runs once,
 *     twice, or after a half-written restart.
 *   - LOSE THE STASH.  A capture marked done for a browser whose gear
 *     it never saw throws that wardrobe away for good.  v2.3.2523
 *     closed only the narrowest version of this (a client that predates
 *     the seed) and shipped three wider ones; v2.3.2527 closes the rest
 *     by keeping adoption OPEN on every join and letting the stamp
 *     record a capture rather than authorise one.  The long version is
 *     on _gearStashAdoptOnJoin, below -- read that before changing the
 *     stamp, because the idempotent merge above is what makes an open
 *     door safe, and the two are one design.
 * The stash and the stamp land in the SAME `_saveRpg` put, so there is
 * no window where one exists without the other; a crash before that put
 * leaves both absent and the next join redoes the whole thing.
 *
 * Handoff compliance: no new storage prefix (these ride `rpg:<playerId>`
 * -- registry table updated), no new opId (nothing is paid), no caps
 * flag (nothing client-side gates on this -- see the spec's deploy-order
 * table), and every map keyed by a client-supplied string is a `Map`
 * (TRAPS #6).
 */

import { QUALITY_GRADES } from './data.js';   /* v2.3.2527 -- see sanitizeGearPiece */

/* Per-list ceiling.  The client has NO cap on these four lists today
   (equipActions.js caps weaponStash alone, at WEAPON_STASH_MAX = 8), so
   this is the first bound they have ever had.  32 is sized to be
   unreachable in honest play -- four times the weapon cap, and armour
   pieces arrive one per forge or drop -- while keeping the blob, the
   join frame (MAX_INBOUND_BYTES = 16 KB, index.js) and the
   player_state echo bounded.  A list past the cap keeps its FIRST 32
   server-side; the player's own copy is untouched and still shows
   everything (this slice does not take the client's stash away). */
export const GEAR_STASH_CAP = 32;

/* The five fields, in one place, because three files have to agree on
   them: the fixed field list (_saveRpg), the echo (_sendPlayerState)
   and the migration (v16).  A list spelled out separately in each is
   how the v2.3.1679 legs slot nearly shipped half-persisted. */
export const GEAR_STASH_FIELDS = ['armorStash', 'legsStash', 'shieldStash', 'gearStash', 'amuletStash'];

/* The join-payload key that seeds each field.  Written out rather than
   computed from the field name so both halves are greppable -- the
   audits and precheck read literals, not string arithmetic.

   v2.3.2527 (review finding 3): `amuletStash` HAS NO ENTRY HERE, and
   that absence is the point.  It has no client stash to adopt from (no
   unequip flow exists), so no honest client can ever send a claim for
   it -- but v2.3.2523 still READ `rpgAmuletStash`, which meant a
   modified client could mint itself up to GEAR_STASH_CAP amulets that
   came out the far side VALIDATED by _sanitizeAmulet, i.e. legitimate
   top-tier ones, the most expensive thing in the forge.  Nothing reads
   the list today so nothing was lost, but a seed key for a list with no
   client source is a claim the server should never have been willing to
   hear.  The FIELD and its migration stay (an always-empty array costs
   one slot; a field-list entry forgotten later costs a player their
   gear -- the v2.3.1679 legs lesson).  Only the ear for it is gone.
   The day an unequip flow ships, the key comes back in that same PR. */
export const GEAR_STASH_SEED_KEYS = {
  armorStash: 'rpgArmorStash',
  legsStash: 'rpgLegsStash',
  shieldStash: 'rpgShieldStash',
  gearStash: 'rpgGearStash',
};

/* `gearStash` is the COSMETIC list and has a different entry shape from
   the other four: {slot, gearId, name} (gearCatalog.js), not a gear
   blob.  Kept as one boolean rather than two parallel field lists. */
const COSMETIC_FIELD = 'gearStash';

const STR_CAP = 40;

function boundStr(v) {
  return (typeof v === 'string' && v) ? v.slice(0, STR_CAP) : null;
}

/* ═══ Shape pass (pure; used by migration v16) ═══
 * Fixes the CONTAINER, not the values: every field is an array of plain
 * objects, capped.  The value clamps live on the join path with every
 * other clamp (_sanitizeWeapon's v2.3.1104 heal-on-load posture) --
 * a migration that re-implemented them would be a second copy of the
 * ceiling to forget.  Idempotent, partial-tolerant, never throws.
 * Returns true when it changed the blob. */
export function normalizeGearStashes(blob) {
  if (!blob || typeof blob !== 'object') return false;
  let changed = false;
  for (const f of GEAR_STASH_FIELDS) {
    const cur = blob[f];
    if (!Array.isArray(cur)) {
      /* Absent on every record written before this slice, which is the
         common case; a non-array here is a corrupt or hand-restored
         blob.  Either way the field lands as an empty list rather than
         being left for the next reader to guess at. */
      blob[f] = [];
      changed = true;
      continue;
    }
    const clean = cur.filter((e) => e && typeof e === 'object' && !Array.isArray(e)).slice(0, GEAR_STASH_CAP);
    if (clean.length !== cur.length) { blob[f] = clean; changed = true; }
  }
  return changed;
}

/* ═══ Value pass ═══
 * One gear piece (armour / legs / shield).  Deliberately the SAME shape
 * as _sanitizeWeapon (gear.js): shallow copy, clamp tierMult into
 * [0, 8] -- the ceiling every armour reader already uses (_armorHp's
 * ARMOR_TIER_MULT_CAP, grids.js's stats_update clamp) -- and in STRICT
 * mode (a client-supplied blob) strip the three server-minted forge
 * fields, because a join payload carrying them is by definition not
 * ours.  Unknown fields are KEPT for the same reason _sanitizeWeapon
 * keeps unknown weapon types: nulling them would destroy legitimate
 * items the moment the client ships a field this table has not learned
 * about yet.  Nothing here feeds a damage roll -- a stashed piece is
 * not worn -- but M3 will PRICE these, and rule 16 says the price must
 * be read from the server's own copy, which is this one. */
export function sanitizeGearPiece(g, strict) {
  if (!g || typeof g !== 'object' || Array.isArray(g)) return null;
  const out = { ...g };
  out.tierMult = (typeof out.tierMult === 'number' && out.tierMult > 0)
    ? Math.min(8, out.tierMult) : 1;
  if (typeof out.name === 'string') out.name = out.name.slice(0, STR_CAP);
  /* ═══ v2.3.2527: QUALITY IS CLAMPED, NEVER STRIPPED (review finding 2) ═══
     v2.3.2523 copied _sanitizeWeapon's strict posture wholesale and
     deleted `quality` off a client-supplied piece.  That was wrong for
     ARMOUR, and it was wrong destructively: adoption is the only moment
     the server ever sees a legacy wardrobe, so every graded plate anyone
     had ever earned would have been written down ungraded, for good.

     Quality is not decoration on armour.  _armorDrMult (combat.js,
     v2.3.1925) multiplies the piece's TIER by the grade -- an Elite
     plate really does stop more damage -- and the item card mirrors it
     to the digit.  Pricing M3's listings off the server's copy (rule 16)
     would then have priced every pre-existing piece as plain.

     It is safe to keep for the reason the weapon strip is NOT: the
     weapon path strips because quality feeds the anti-cheat DAMAGE
     ceiling, so a forged "godly" would raise its own cap.  Armour has no
     such loop -- _armorDrMult applies the identical [0, 8] clamp AFTER
     multiplying by the grade, and the 75% DR cap sits above that as the
     last word, so no grade can escape either.  grids.js's stats_update
     already accepts a client-supplied armour `quality` on the path that
     actually feeds combat, for exactly that reason; this is the same
     value arriving by a colder route into a list nothing wears.

     What both modes do instead is the ENUM clamp _sanitizeWeapon's
     non-strict branch uses: a grade the table does not know is dropped,
     so `quality: 'transcendent'` cannot enter the blob and wait for a
     future reader to believe it.  (An unknown grade already multiplies
     by 1 in _armorDrMult; dropping it keeps the stored copy honest
     rather than relying on every future reader being as careful.) */
  if (out.quality !== undefined && !QUALITY_GRADES[out.quality]) delete out.quality;
  if (strict) {
    /* hardness and temper stay stripped in strict mode: unlike quality
       they are FORGE-MINTED (v2.3.1141 -- drops are server-minted, so
       every legitimate one was written here and persists through
       _saveRpg), and a join payload carrying them is by definition not
       ours.  Only quality moved out of this branch. */
    delete out.hardness;
    delete out.temper;
  } else {
    if (typeof out.hardness === 'number') out.hardness = Math.max(0, Math.min(5, Math.floor(out.hardness)));
    if (typeof out.temper === 'number') out.temper = Math.max(0, Math.min(9999, Math.floor(out.temper)));
  }
  return out;
}

/* One cosmetic entry: {slot, gearId, name}.  Both ids are bounded
   strings and NOT checked against GEAR_SLOTS / GEAR_CATALOG on purpose
   -- the catalog is client art (gearCatalog.js) and an enum here would
   silently delete a player's piece the first time a new slot ships
   client-first, which is exactly the trade _sanitizeWeapon documents
   for weapon types.  They are ids, never values: nothing multiplies
   them. */
export function sanitizeCosmeticEntry(g) {
  if (!g || typeof g !== 'object' || Array.isArray(g)) return null;
  const slot = boundStr(g.slot);
  const gearId = boundStr(g.gearId);
  if (!slot || !gearId) return null;
  const out = { slot, gearId };
  const name = boundStr(g.name);
  if (name) out.name = name;
  return out;
}

/* One whole list, capped and per-shape sanitized; rejected entries are
   dropped rather than kept as holes (_sanitizeWeaponList's posture).
   Amulets are the one shape whose values reach the authoritative
   damage roll once worn (AMULET_TIER_POWER, _computeAttackDamage), so
   they go through the room's own _sanitizeAmulet instead of a second
   copy of that whitelist -- which is why the sanitizer is passed IN:
   this module stays pure so migration v16 can call into it. */
export function sanitizeStashList(field, arr, strict, amuletSanitizer, report) {
  if (!Array.isArray(arr)) return [];
  /* v2.3.2527: tell the caller when the CAP -- not the sanitizer -- ate
     part of the claim, so it can decline to stamp a capture it knows is
     incomplete (review finding 1c).  A rejected entry is deliberately
     NOT truncation: junk is not a piece of gear, and treating it as one
     would leave a player with a single malformed row permanently
     unstamped for no gain. */
  if (report && arr.length > GEAR_STASH_CAP) report.truncated = true;
  const cap = arr.slice(0, GEAR_STASH_CAP);
  let mapped;
  if (field === COSMETIC_FIELD) mapped = cap.map(sanitizeCosmeticEntry);
  else if (field === 'amuletStash') mapped = cap.map((a) => (amuletSanitizer ? amuletSanitizer(a) : null));
  else mapped = cap.map((g) => sanitizeGearPiece(g, strict));
  return mapped.filter(Boolean);
}

/* The identity of a piece, for the merge below.  Deliberately the
   CLIENT's own signature (wsClient.js _shSig, v2.3.1683: "matching by
   value means a shield we already hold -- on the arm OR in the bag --
   is recognised and ignored"), so both sides call the same two pieces
   the same piece.  Cosmetics key on slot+gearId, which IS their
   identity; amulets on tier+gem+name. */
export function stashSig(field, g) {
  if (!g) return '';
  if (field === COSMETIC_FIELD) return (g.slot || '') + '|' + (g.gearId || '');
  if (field === 'amuletStash') return (g.tier || '') + '|' + (g.gem || '') + '|' + (g.name || '');
  return [g.name || '', g.gearBase || '', g.tierMult == null ? '' : g.tierMult, g.tier || ''].join('|');
}

/* ═══ The merge: a MULTISET UNION, not a concatenation ═══
 *
 * Result count for one signature = max(count held, count claimed).  The
 * three properties that buys, all of which the adoption path needs:
 *   - IDEMPOTENT.  merge(merge(a, b), b) === merge(a, b).  A retry after
 *     a crash, a second join, or a restart that lost the save converges
 *     on the same list instead of doubling it (the #615 failure shape).
 *   - LOSSLESS FOR REAL DUPLICATES.  A player holding two identical
 *     copper plates keeps two: counts are compared, not signatures.  A
 *     plain by-signature union would have quietly eaten one, which is
 *     the "without losing anything a player owns" half of the brief.
 *   - ORDER-STABLE.  What the server already holds keeps its order and
 *     its object identity; only the surplus is appended, so an index
 *     into the list (how M3 will address a piece, rule 16) does not
 *     shuffle under a reconnect.
 * Map, never a plain object: the keys are built from client-supplied
 * strings and '__proto__' is a legal name for a forged piece (TRAPS #6,
 * three incidents in one day). */
/* ═══ v2.3.2527: BACKFILL A GRADE ONTO A PIECE WE ALREADY HOLD ═══
 * The other half of review finding 2, and it exists because v2.3.2523
 * MERGED and deployed before the repair did: real stored records were
 * written by the version that stripped `quality`, so armour on the
 * server right now is graded `undefined` where the player's own copy
 * says Elite.
 *
 * Re-opening the door (finding 1) does not fix those by itself, and it
 * is worth being precise about why: `stashSig` keys armour on
 * name|gearBase|tierMult|tier and NOT on quality -- deliberately, since
 * a grade must not make one plate look like two.  So on the next join
 * the merge recognises the player's graded plate as a plate it already
 * holds, takes no surplus, and the stripped copy would sit there
 * ungraded forever.
 *
 * So a matched pair backfills: if we hold the piece with NO grade and
 * the claim carries a valid one, we take the grade.  Deliberately
 * one-directional and absent-only -- it can never overwrite or
 * downgrade a grade the server already has, so a client cannot use it
 * to re-roll a piece.  It grants no power a client did not already
 * have either: it could always claim a whole graded piece instead (the
 * open trust boundary, finding 4), and grids.js already accepts a
 * client-supplied armour quality on the live combat path.
 *
 * Idempotent, like everything else on this path: the second run finds
 * the grade present and does nothing.  Only `quality` -- `hardness` and
 * `temper` are forge-minted and stay stripped. */
function healGradeFromClaim(field, heldPiece, claimedPiece) {
  if (field === COSMETIC_FIELD || field === 'amuletStash') return;
  if (!heldPiece || typeof heldPiece !== 'object') return;
  if (heldPiece.quality !== undefined) return;
  if (!claimedPiece || typeof claimedPiece !== 'object') return;
  if (!QUALITY_GRADES[claimedPiece.quality]) return;
  heldPiece.quality = claimedPiece.quality;
}

export function mergeStashLists(field, held, claimed, report) {
  const out = Array.isArray(held) ? held.slice(0, GEAR_STASH_CAP) : [];
  if (!Array.isArray(claimed) || !claimed.length) return out;
  /* Signature -> the indexes in `out` holding it, in order.  An index
     list rather than a bare count (v2.3.2527) because a matched pair
     now has something to say to each other -- see healGradeFromClaim.
     Indexes stay valid as the loop runs: the merge only ever APPENDS. */
  const heldIdx = new Map();
  for (let i = 0; i < out.length; i++) {
    const s = stashSig(field, out[i]);
    if (!heldIdx.has(s)) heldIdx.set(s, []);
    heldIdx.get(s).push(i);
  }
  const takenCounts = new Map();
  for (const g of claimed) {
    /* v2.3.2527: the cap cut the claim short -- the caller must not
       stamp this capture complete (review finding 1c). */
    if (out.length >= GEAR_STASH_CAP) { if (report) report.truncated = true; break; }
    const s = stashSig(field, g);
    const taken = takenCounts.get(s) || 0;
    const idxs = heldIdx.get(s);
    /* Only the SURPLUS of the claim over what we already hold. */
    if (taken >= (idxs ? idxs.length : 0)) out.push(g);
    else healGradeFromClaim(field, out[idxs[taken]], g);
    takenCounts.set(s, taken + 1);
  }
  return out.slice(0, GEAR_STASH_CAP);
}

export const gearStashMethods = {
  /* ═══ v2.3.2527: THE DOOR STAYS OPEN (review finding 1) ═══
     Join-time load + adoption of the four client-local stashes.  Called
     from _handleJoin for BOTH branches (stored record and first-connect
     bootstrap), right after _gemsAdoptOnJoin and before the join path's
     final _saveRpg -- the same seam, for the same reason: the stamp has
     to ride the same put as the data.

     v2.3.2523 made this a ONE-SHOT capture gated on `gearStashCaptured`,
     and the stamp landed on the mere PRESENCE of a claim.  Those two
     together lost gear, silently and permanently, for ordinary players:

       - Sign in on a second device, in a private tab, or after clearing
         site data, and that browser has no stash.  The old client sent
         four empty arrays anyway, the server read "a claim" and stamped
         CAPTURED -- and the real wardrobe back on the main phone was
         never looked at again.  Reproduced by the review directly: two
         plates and a shield gone from the server's record for good.
       - Same ending when the client's shared seed budget ran out
         part-way down the four lists, or when a list overflowed
         GEAR_STASH_CAP: a partial capture, stamped done.

     That is the #615 shape after all -- a broken record that LOOKS
     healthy on the next wake, so nothing ever retries it.  The crash
     half was closed in v2.3.2523; this half was not.  Three changes
     close it, and all three are needed:

       1. THE STAMP NO LONGER GATES ADOPTION.  The merge runs on every
          join, against whatever the client offers.  This is safe BY
          CONSTRUCTION, not by care: the merge is a multiset union, so
          re-running it with a claim we already hold adds nothing
          (`merge(merge(a,b),b) === merge(a,b)`, proven in §5 of the
          suite).  Idempotence is exactly the property that lets a
          door stay open.  A player whose wardrobe arrives on the
          third join -- from the device that actually has it -- now
          gets it captured on the third join.
       2. THE STAMP RECORDS, IT DOES NOT AUTHORISE.  It is set only when
          adoption actually TOOK something and the cap did not cut the
          claim short, so it now means what it says: a real, complete
          capture landed.  A device with nothing to offer no longer
          writes "this player owns nothing" over a player who owns
          plenty, because it no longer writes anything at all.
          Monotone once true -- a later empty-handed join cannot unset
          a capture that did happen.
       3. THE CLIENT OMITS AN EMPTY LIST'S KEY (wsClient.js, same
          version), so "I have nothing" and "I am not telling you about
          this" stop arriving as the same four empty arrays.

     What the open door does NOT close is the trust boundary: the claim
     is checked for SHAPE, never for ownership, so a modified client can
     still hand itself gear -- see the spec's "What this does NOT solve".
     That was already true of the one-shot version (and of a brand-new
     character, which anyone can make for free); keeping the door open
     does not deepen it, and closing it was never what the gate bought.
     M3 must not read "it is in the adopted list" as proof of ownership.

     Returns nothing; mutates ps.  Never throws -- a join must not fail
     because a stash was malformed. */
  _gearStashAdoptOnJoin(ps, stored, md) {
    if (!ps) return;
    const amuletSan = (a) => this._sanitizeAmulet(a);
    const claimed = new Map();   /* field -> sanitized claim (TRAPS #6: never a plain object) */
    /* One report for the whole join: any list the cap cut short means
       this capture is not the player's whole wardrobe, whichever list
       it was. */
    const report = { truncated: false };
    for (const f of GEAR_STASH_FIELDS) {
      const own = stored ? stored[f] : ps[f];
      ps[f] = sanitizeStashList(f, own, false, amuletSan);
      /* GEAR_STASH_SEED_KEYS has no amuletStash entry on purpose
         (finding 3), so that list simply has no claim to read. */
      const key = GEAR_STASH_SEED_KEYS[f];
      const raw = (key && md) ? md[key] : undefined;
      if (Array.isArray(raw)) claimed.set(f, sanitizeStashList(f, raw, true, amuletSan, report));
    }
    let took = 0;
    for (const [f, list] of claimed) {
      const before = ps[f].length;
      ps[f] = mergeStashLists(f, ps[f], list, report);
      took += ps[f].length - before;
    }
    /* Already stamped stays stamped; a fresh stamp needs a capture that
       both took something and was not cut short. */
    ps.gearStashCaptured = !!(stored && stored.gearStashCaptured) || (took > 0 && !report.truncated);
  },
};
