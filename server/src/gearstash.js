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
 * ADOPTION, AND THE CRASH SHAPE IT HAS TO SURVIVE.  Adoption is the
 * v2.3.1021 weaponSkills / v2.3.1192 nugget-ledger / v2.3.1198 gems
 * posture: stored wins on every reconnect, and a record that predates
 * this slice folds the client's claim in ONCE.  Two failure modes, both
 * of which have bitten this codebase before:
 *   - ADOPT TWICE.  #615's refund/delete crash window paid a listing out
 *     twice.  The same shape here would duplicate a player's armour on
 *     every reconnect.  Closed by a MULTISET UNION rather than a
 *     concatenation: the merged count for one piece is max(server's,
 *     client's), never the sum.  Re-running the merge on its own output
 *     is therefore a no-op -- the merge converges whether it runs once,
 *     twice, or after a half-written restart.
 *   - LOSE THE STASH.  A stamp written when nothing was actually
 *     adopted burns the one-time capture forever, which is what would
 *     happen against a client that has not shipped the seed yet (the
 *     worker deploys before Pages does, and old tabs stay open for
 *     days).  Closed by stamping ONLY when the payload actually carried
 *     a stash array: no claim, no stamp, and the next join adopts.
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
   audits and precheck read literals, not string arithmetic. */
export const GEAR_STASH_SEED_KEYS = {
  armorStash: 'rpgArmorStash',
  legsStash: 'rpgLegsStash',
  shieldStash: 'rpgShieldStash',
  gearStash: 'rpgGearStash',
  amuletStash: 'rpgAmuletStash',
};

/* `gearStash` is the COSMETIC list and has a different entry shape from
   the other four: {slot, gearId, name} (gearCatalog.js), not a gear
   blob.  Kept as one boolean rather than two parallel field lists. */
const COSMETIC_FIELD = 'gearStash';

/* ═══ v2.3.2529: THE PROVENANCE MARK LIVES HERE, NOT IN THE STORE ═══
   `_sv` means "the SERVER wrote this piece" -- it is set in exactly one
   place (_stGearApplyCredit, storegear.js) and read by exactly one
   (strict-mode listing).  It is defined in THIS module because this is
   where every sanitizer that could carry it or drop it lives, and a mark
   whose name is declared in one file and honoured in another is a mark
   the next sanitizer somebody adds will silently drop.  storegear.js
   re-exports it as STORE_GEAR.PROV rather than spelling it a second time.

   It has to survive a round trip through storage and be UNFORGEABLE off
   the wire, and v2.3.2528 got both edges wrong in opposite directions
   (found by the adversarial review of #643):
     - FORGEABLE.  The join claim is the path that actually fills a
       stash, and it sanitizes STRICT -- but strict only stripped the
       three forge fields, so a modified client could mark its own forged
       plate `_sv: true` and strict mode waved it through.  The store
       stripped the mark off the SELECTOR, which is not the path that
       fills anything.
     - LOST.  `sanitizeCosmeticEntry` and `_sanitizeAmulet` do not copy,
       they REBUILD from a whitelist, so a cosmetic or amulet the server
       genuinely handed over lost its mark on the owner's next login and
       became unlistable under strict mode.
   Both edges are one rule: the mark is carried across a sanitize when
   and only when the source was OURS (non-strict), and never when the
   source came off the wire.  `carryProv` is that rule, applied at every
   sanitize seam so no shape can opt out of it. */
export const GEAR_PROV = '_sv';

/* Carry `_sv` from a source blob onto its sanitized output.  `strict`
   (the blob came off the wire) means never.  Returns `out` so it can
   wrap a sanitizer call directly. */
export function carryProv(src, out, strict) {
  if (strict || !out || typeof out !== 'object') return out;
  if (src && typeof src === 'object' && src[GEAR_PROV] === true) out[GEAR_PROV] = true;
  return out;
}

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
  if (strict) {
    delete out.quality;
    delete out.hardness;
    delete out.temper;
    /* v2.3.2529: and the provenance mark.  This is a shallow COPY, so
       without this line a client-claimed `_sv: true` rode the join claim
       into the stash and strict-mode listing believed it (GEAR_PROV). */
    delete out[GEAR_PROV];
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
export function sanitizeStashList(field, arr, strict, amuletSanitizer) {
  if (!Array.isArray(arr)) return [];
  const cap = arr.slice(0, GEAR_STASH_CAP);
  const out = [];
  for (const src of cap) {
    let piece;
    if (field === COSMETIC_FIELD) piece = sanitizeCosmeticEntry(src);
    else if (field === 'amuletStash') piece = amuletSanitizer ? amuletSanitizer(src) : null;
    else piece = sanitizeGearPiece(src, strict);
    if (!piece) continue;
    /* v2.3.2529: one seam, both directions -- a stored piece keeps `_sv`
       through a REBUILDING sanitizer, a claimed one can never gain it.
       A loop rather than three `.map`s because `.map(fn)` hands the
       callback the INDEX as its second argument, which is exactly how a
       `strict` flag becomes "false for entry 0, true for the rest". */
    out.push(carryProv(src, piece, strict));
  }
  return out;
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
export function mergeStashLists(field, held, claimed) {
  const out = Array.isArray(held) ? held.slice(0, GEAR_STASH_CAP) : [];
  if (!Array.isArray(claimed) || !claimed.length) return out;
  const heldCounts = new Map();
  for (const g of out) {
    const s = stashSig(field, g);
    heldCounts.set(s, (heldCounts.get(s) || 0) + 1);
  }
  const takenCounts = new Map();
  for (const g of claimed) {
    if (out.length >= GEAR_STASH_CAP) break;
    const s = stashSig(field, g);
    const taken = takenCounts.get(s) || 0;
    /* Only the SURPLUS of the claim over what we already hold. */
    if (taken >= (heldCounts.get(s) || 0)) out.push(g);
    takenCounts.set(s, taken + 1);
  }
  return out.slice(0, GEAR_STASH_CAP);
}

export const gearStashMethods = {
  /* Join-time load + one-time adoption of the four client-local
     stashes.  Called from _handleJoin for BOTH branches (stored record
     and first-connect bootstrap), right after _gemsAdoptOnJoin and
     before the join path's final _saveRpg -- the same seam, for the
     same reason: the stamp has to ride the same put as the data.

       - always: the server's own copy is (re-)loaded and healed.  A
         stored list is clamped non-strict (we wrote it); a first
         connect starts empty.
       - once: when the stored record carries no gearStashCaptured
         stamp, the client's claim is folded in by multiset union.
       - the stamp is set ONLY when the payload actually carried at
         least one stash array, so a client that predates the seed
         cannot burn the capture for a player whose gear it never sent.

     Returns nothing; mutates ps.  Never throws -- a join must not fail
     because a stash was malformed. */
  _gearStashAdoptOnJoin(ps, stored, md) {
    if (!ps) return;
    const amuletSan = (a) => this._sanitizeAmulet(a);
    const claimed = new Map();   /* field -> sanitized claim (TRAPS #6: never a plain object) */
    let sawClaim = false;
    for (const f of GEAR_STASH_FIELDS) {
      const own = stored ? stored[f] : ps[f];
      ps[f] = sanitizeStashList(f, own, false, amuletSan);
      const raw = md ? md[GEAR_STASH_SEED_KEYS[f]] : undefined;
      if (Array.isArray(raw)) {
        sawClaim = true;
        claimed.set(f, sanitizeStashList(f, raw, true, amuletSan));
      }
    }
    if (stored && stored.gearStashCaptured) {
      /* Captured already: stored wins forever, the claim is ignored.
         (The stamp is re-asserted so it survives this save.) */
      ps.gearStashCaptured = true;
      return;
    }
    for (const [f, list] of claimed) ps[f] = mergeStashLists(f, ps[f], list);
    if (sawClaim) ps.gearStashCaptured = true;
  },
};
