/* ═══ v2.3.6801 (card SHOP-gearbag): THE PHONE'S GEAR BAG READS THE
 * WORKER'S COPY, AND EVERY PIECE COMES IN BY ONE WAY ═══
 *
 * The bug (docs/plan/debts.md "Found (no card's debt)"): the phone put a
 * piece of armour, legs, cosmetic gear or an amulet in its bag ONLY from the
 * one reply that brought it (the chest's, the forge's, a quest's, a pile's,
 * the mail's).  A line that dropped before that reply left the player paid
 * and the worker holding the piece, and the phone never showed it, not even
 * after a reload: it could not be worn, yet a No man's land death could still
 * take it.  `forge_armor_result` carries no request id (armorforge.js), and
 * a re-sent chest open is answered only while `_reqRecall` holds it, so a
 * reply CAN be lost.  The worker has echoed all five lists in every
 * `player_state` since v2.3.2523 (persistence.js; a join's full state
 * included) and the page read none of the four below.  The shield had the
 * same gap and #2400 (v2.3.6800, src/game/shieldAdopt.js) mended it for the
 * shield alone: this is that mend for the other four, on its model.
 *
 * THE ADOPT (`adoptGearLists`): every piece the worker holds in
 * `armorStash`, `legsStash`, `gearStash` (the COSMETIC list: {slot, gearId,
 * name}) or `amuletStash` that this copy holds nowhere is ADDED, by its id
 * (`gid`, the provenance ledger's: gearprov.js).
 *  - ADD, NEVER TAKE.  Nothing leaves a list here: a piece leaves the bag
 *    only by today's roads (an equip, a listing, a salvage, No man's land).
 *  - Only a piece WITH an id is adopted: one without cannot be told from its
 *    twin.
 *  - Held is: worn, or in the bag, by the same id; or, once each, a piece of
 *    the phone's own with NO id and the same signature (an old copy of the
 *    very piece, from before the ledger gave it one, or a cosmetic the phone
 *    re-made on an unequip, which drops the id), so an old copy is never
 *    doubled.  A cosmetic worn on the phone (its store, gearCatalog.js, holds
 *    the gearId alone) counts as such a copy: the worker is never told a
 *    cosmetic went on, so its list still holds every worn one.
 *  - Never past the list's cap (48, the worker's own: gearstash.js
 *    GEAR_STASH_CAP).  A phone holding more than that adds nothing.
 *  - The piece goes in as the worker sent it: an unrevealed one stays a "?"
 *    (revealbag.js revealPublic: no `quality`, `unrevealed: true`), and its
 *    reveal, which keeps its id, never brings a second copy.
 *  The shield's list stays shieldAdopt.js's (its cap, `shieldshop`).
 *
 * ONE WAY IN (`gearBagPut`): the adopt AND every reply that brings a piece
 * (loot_credit, which the chest and the forge answer through, the quest's
 * quest_reward_stashed, and the mail's gear credit) put it in here, and this
 * refuses a second copy of an id.  So a reply and the echo may arrive in
 * either order and the piece is there once.  The mail's push had no check at
 * all before this.
 *
 * `?gearadopt=0` (the switch table): the echo adopts nothing, the bag as
 * before (the replies alone).  The replies' one way in stays: its only new
 * refusal is a copy of an id already held.
 *
 * Pure (no imports), so the server's suites call it (gear-adopt.test.mjs). */

export const GEAR_ADOPT = Object.freeze({
  FIELDS: Object.freeze(['armorStash', 'legsStash', 'gearStash', 'amuletStash']),   /* the four the echo adopts (the shield: shieldAdopt.js) */
  CAP: 48,      /* a list's most, the adopt's (gearstash.js GEAR_STASH_CAP; gear-adopt.test holds them equal) */
  GID_MAX: 40,  /* the longest id read (shieldAdopt.js SHIELD_ADOPT.GID_MAX) */
});

/* The five bag lists and the worn slot beside each (the cosmetic's worn piece
   is read through `wornOf(slot)`, the page's gearCatalog getEquip). */
const WORN = Object.freeze({ armorStash: 'armor', legsStash: 'legsArmor', shieldStash: 'shield', amuletStash: 'amulet', gearStash: null });
const isBagField = (f) => typeof f === 'string' && Object.prototype.hasOwnProperty.call(WORN, f);

const isPiece = (p) => !!p && typeof p === 'object' && !Array.isArray(p);
const gidOf = (p) => (isPiece(p) && typeof p.gid === 'string' && p.gid && p.gid.length <= GEAR_ADOPT.GID_MAX ? p.gid : null);

/* A piece's signature, for an old copy with no id: the phone's own reading of
   each list.  Armour and legs: name and tier multiplier, the fields the
   phone's bag keeps (the reply's shape below; the loot and quest guards'
   reading).  A cosmetic: its slot and gearId, which ARE its identity.  An
   amulet: gearstash.js stashSig's.  (The shield's: shieldAdopt.js.)  Every
   caller hands it a piece. */
function sigOf(field, p) {
  if (field === 'gearStash') return (p.slot || '') + '|' + (p.gearId || '');
  if (field === 'amuletStash') return (p.tier || '') + '|' + (p.gem || '') + '|' + (p.name || '');
  return String(p.name || '') + '|' + (Number(p.tierMult) || 1);
}

/* What the phone holds for a list: the worn piece(s) and the bag. */
function heldOf(rpg, field, wornOf, slots) {
  const out = [];
  const w = WORN[field];
  if (w) { if (isPiece(rpg[w])) out.push(rpg[w]); }
  else if (typeof wornOf === 'function') {
    for (const slot of slots) {
      let id = null;
      try { id = wornOf(slot); } catch (e) { id = null; }
      if (typeof id === 'string' && id && id !== 'none') out.push({ slot, gearId: id });
    }
  }
  for (const p of rpg[field]) if (isPiece(p)) out.push(p);
  return out;
}

/* Put ONE piece in the bag's `field`, by `how`:
     'echo'  the worker's copy (the adopt): an id, not held, under the cap;
     'reply' a reply's armour or legs (loot_credit, quest_reward_stashed):
             the piece rebuilt in the bag's shape, the list from its `slot`
             (`field` ignored); with no id (an old worker), the old guard by
             name and tier multiplier, worn or in the bag;
     'mail'  the mail's piece, as it came; with no id, put in as before.
   With an id, every way refuses one already worn or in the bag.  Returns the
   piece put in, or null (nothing changed). */
export function gearBagPut(rpg, field, piece, how, opts) {
  if (!isPiece(rpg) || !isPiece(piece)) return null;
  if (how === 'reply') field = piece.slot === 'legsArmor' ? 'legsStash' : 'armorStash';
  if (!isBagField(field)) return null;
  if (!Array.isArray(rpg[field])) rpg[field] = [];
  const list = rpg[field];
  const gid = gidOf(piece);
  const worn = WORN[field] ? rpg[WORN[field]] : null;
  if (gid && ((gidOf(worn) === gid) || list.some((p) => gidOf(p) === gid))) return null;
  if (how === 'echo') {
    if (!gid || list.length >= GEAR_ADOPT.CAP) return null;
    const put = { ...piece };
    list.push(put);
    return put;
  }
  if (how === 'reply') {
    const name = String(piece.name || (opts && opts.name) || 'Armor');
    const tierMult = Number(piece.tierMult) || 1;
    if (!gid) {
      const same = (a) => isPiece(a) && a.name === name && (Number(a.tierMult) || 1) === tierMult;
      if (same(worn) || list.some(same)) return null;
    }
    /* The bag's shape, moved here from wsClient's loot_credit and
       quest_reward_stashed, one copy for both (they differed only in
       the default name, in a worn-piece guard by name alone, now name
       and tierMult as the loot's, and in a grade read only when it was
       one of the three: the worker sends only a grade its table knows):
       `slot` decides the list (v2.3.1701: a legs piece in armorStash
       went on the TORSO); `mat` the art (v2.3.1758); `gid` the id
       (v2.3.2544); `quality` the grade getArmorPieceDr multiplies by
       (v2.3.1925); `unrevealed` the "?" mark (v2.3.4012); `prov` the
       worker's word that it minted it, only 'minted' (v2.3.3545). */
    const put = { name, tierMult,
      slot: field === 'legsStash' ? 'legsArmor' : 'armor',
      gid: gid || undefined,
      mat: piece.mat ? String(piece.mat).slice(0, 16) : undefined,
      quality: typeof piece.quality === 'string' ? piece.quality : undefined,
      unrevealed: piece.unrevealed ? true : undefined,
      prov: piece.prov === 'minted' ? 'minted' : undefined };
    list.push(put);
    return put;
  }
  if (how === 'mail') {
    list.push(piece);
    return piece;
  }
  return null;
}

/* The adopt: each of the four lists the frame carries, its pieces put in by
   'echo'.  An old copy with no id (the phone's own, or a worn cosmetic)
   answers for one piece of its signature, once.  `wornOf(slot)`: the worn
   cosmetic's gearId in a slot ('none' or nothing: none).  Returns how many
   were added (0: nothing changed). */
export function adoptGearLists(rpg, payload, wornOf) {
  if (!isPiece(rpg) || !isPiece(payload)) return 0;
  let added = 0;
  for (const field of GEAR_ADOPT.FIELDS) {
    const pieces = payload[field];
    if (!Array.isArray(pieces) || !pieces.length) continue;
    if (!Array.isArray(rpg[field])) rpg[field] = [];
    const slots = field === 'gearStash'
      ? [...new Set(pieces.filter(isPiece).map((p) => p.slot).filter((s) => typeof s === 'string' && s))]
      : [];
    const mine = heldOf(rpg, field, wornOf, slots);
    const ids = new Set(mine.map(gidOf).filter(Boolean));
    const oldCopies = mine.filter((p) => !gidOf(p));   /* each answers for one piece at most */
    for (const p of pieces.slice(0, GEAR_ADOPT.CAP)) {
      const gid = gidOf(p);
      if (!gid || ids.has(gid)) continue;
      const at = oldCopies.findIndex((q) => sigOf(field, q) === sigOf(field, p));
      if (at >= 0) { oldCopies.splice(at, 1); ids.add(gid); continue; }
      if (gearBagPut(rpg, field, p, 'echo')) added++;   /* its id is in the list now: a repeat is refused there */
    }
  }
  return added;
}

/* wsClient's player_state case, in one call (S: the game's state; `off`:
   `?gearadopt=0`).  Never throws: the next state carries the lists again. */
export function adoptStateGear(S, payload, wornOf, off) {
  try {
    if (off || !S) return 0;
    return adoptGearLists(S.rpg, payload, wornOf);
  } catch (e) { return 0; }
}
