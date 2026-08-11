/* Equipment slots + per-slot selection store (localStorage).
 *
 * Mirrors the shirt/skin stores.  An equip is just an item id per slot (or
 * 'none').  The renderer stacks the matching gear sheet (gearSheets.js) above
 * the body.  See gear-layer-spec.md.
 */

import { onShirtChange } from './traits/shirtCatalog.js';

export const GEAR_SLOTS = ['shirt', 'legs', 'chest', 'shoulders'];

/* Per-slot catalog.  v2.3.503 seeded a throwaway 'testplate' chest piece to
   prove the layered renderer; v2.3.1029 removed it (steelplate is the only
   chest armour now).
   v2.3.613: helmet/head slot removed -- the head/face is always shown (player
   identity) and only chest + legs plate are equippable. */
/* v2.3.748: 'shirt' slot (PoC) -- the t-shirt as a LAYERED overlay drawn under
   the armour, replacing the baked torso-retint shirt ("working terribly" per
   the owner).  The sheet is stored as a WHITE-BASE garment and tinted at
   render time to the picked shirt colour, like hats/hair.  South-only sheets
   so far (stand + jog); other dirs render no layer until their sheets exist. */
export const GEAR_CATALOG = {
  shirt: [{ id: 'none', name: 'None' }, { id: 'tshirt', name: 'T-Shirt' }],
  legs: [{ id: 'none', name: 'None' }, { id: 'steelgreaves', name: 'Steel Greaves' }],
  chest: [{ id: 'none', name: 'None' }, { id: 'steelplate', name: 'Steel Plate' }],
  shoulders: [{ id: 'none', name: 'None' }],
};

function makeSlotStore(slot, defId) {
  /* v2.3.538: key bumped to -v2 so any previously-saved steelplate/greaves
     equip is ignored and the new 'none' default wins (lets the bare,
     scale-normalized body show without stale localStorage overriding it). */
  /* v2.3.1665: bumped -v2 -> -v3.  The chest/legs defaults below changed
     from the steel set to 'none' (armor is EARNED now, from the tutorial
     arc), and without a key bump every existing tester keeps the steel
     they were silently given for testing.  Same reason v2.3.538 bumped
     -v1 -> -v2. */
  const key = 'bt-gear-v3-' + slot;
  let active = defId;
  try { const s = typeof localStorage !== 'undefined' && localStorage.getItem(key); if (s) active = s; } catch (e) { /* ignore */ }
  const listeners = new Set();
  return {
    get: () => active,
    set: (id) => {
      if (id === active) return;
      active = id;
      try { localStorage.setItem(key, id); } catch (e) { /* ignore */ }
      listeners.forEach(fn => { try { fn(id); } catch (e) { /* ignore */ } });
    },
    on: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
  };
}

/* v2.3.546: re-enable the existing steel set (covers jog+stand all 5 dirs,
   aligned to the current bodies) so the armored character is visible again
   over the now size-normalized body.  Bulk still varies per direction (old
   per-dir scale_mul) until the uniform re-extraction; alignment is already
   good.  Key stays bt-gear-v2-* (no stale equips under it, so this default
   wins). */
/* v2.3.1665: NEW PLAYERS START BARE.  chest/legs defaulted to the steel
   set, which was a TESTING shortcut that made every character begin the
   game already armoured — there was nothing to earn and no visible reward
   for the tutorial arc to pay.  The set is now granted by the "Suit Up"
   quest (tut_2) and appears in the bag on completion; see
   `gearSetEarned` / `reconcileGearStash` below.
   SHIRT STAYS 'tshirt' on purpose: isWearingArmor() deliberately excludes
   the shirt slot (see its comment), and the character-creator sync depends
   on it — defaulting it to 'none' would leave the body bare-chested and
   break the bare-hit sound logic in the other direction. */
const _stores = {
  /* v2.3.748 PoC: t-shirt layer ON by default so the preview shows it. */
  shirt: makeSlotStore('shirt', 'tshirt'),
  legs: makeSlotStore('legs', 'none'),
  chest: makeSlotStore('chest', 'none'),
  shoulders: makeSlotStore('shoulders', 'none'),
};

/* v2.3.604: build inventory items for the real armor gear (chest/legs), one per
   catalog entry (excluding 'none').  The inventory UI shows these in the
   chest/legs equip slots; equipping one calls setEquip(slot, gearId) via the
   GameApp bridge, which the renderer reads. */
export function gearInventoryItems() {
  const out = [];
  for (const slot of ['chest', 'legs']) {
    for (const c of (GEAR_CATALOG[slot] || [])) {
      if (c.id === 'none') continue;
      out.push({
        id: 'gear_' + slot + '_' + c.id, type: 'armor', slot, gearId: c.id,
        name: c.name, tier: 1, quality: 'normal', acquiredAt: 0,
        hardness: 0, temper: 0, count: null, gems: [], gemSlots: 0,
        stats: { def: 5 }, isNew: false,
      });
    }
  }
  return out;
}

/* v2.3.756: the character-creator's shirt picker drives the LAYER now (the
   baked shirt is retired): picking a shirt style equips it, picking None
   removes it.  Sync runs on CHANGE only, so a creator default of 'none'
   never strips the new-player default tshirt.  (shirtCatalog has no
   imports, so this static import cannot form a cycle.) */
onShirtChange((id) => setEquip('shirt', id === 'none' ? 'none' : 'tshirt'));

export function getEquip(slot) { return _stores[slot] ? _stores[slot].get() : 'none'; }
/* v2.3.1598: "is the player wearing a piece of armour?" — the test that picks
   the metallic armor-hit clang over the bare-flesh thud (BT_AUDIO.monsterHitHero).
   It was written out longhand at five call sites in monsterCombat.js and
   projectiles.js, and the server-authoritative hit path needed a sixth.  One
   definition instead, because the subtlety is easy to get wrong when copying:
   SHIRT IS DELIBERATELY EXCLUDED.  It is in GEAR_SLOTS and is worn by every
   new player by default (the tshirt above), so including it would make every
   character permanently "armoured" and the bare-hit sound unreachable. */
export function isWearingArmor() {
  return getEquip('chest') !== 'none'
    || getEquip('legs') !== 'none'
    || getEquip('shoulders') !== 'none';
}
export function setEquip(slot, id) { if (_stores[slot]) _stores[slot].set(id); }
export function onEquipChange(slot, fn) { return _stores[slot] ? _stores[slot].on(fn) : () => {}; }

/* v2.3.687: the steel set is INDESTRUCTIBLE -- each piece exists exactly once,
   either worn (gearCatalog slot) or in the bag (rpg.gearStash).  Unequip paths
   that predate the stash (e.g. the Equipment menu's WORN ARMOUR toggle) just
   set the slot to 'none', orphaning the piece: gone from the Loadout AND the
   bag, with the unequipped state persisted.  Reconcile on load / bag render:
   an orphaned piece is restored to the stash, a worn piece is deduped out of
   it.  Returns true when R.gearStash was changed (caller persists). */
const DEFAULT_GEAR_SET = [
  { slot: 'chest', gearId: 'steelplate', name: 'Steel Plate' },
  { slot: 'legs', gearId: 'steelgreaves', name: 'Steel Greaves' },
];
/* v2.3.1665: the steel set is EARNED, not issued.  It arrives when the
   tutorial's "Suit Up" quest (tut_2) is turned in — the same quest whose
   server-side reward is the stat-bearing Scout's Vest.  Before that, the
   set must exist NOWHERE: not worn, not in the bag.
   The two armor systems are still separate (the cosmetic gearCatalog layer
   here vs. the stat-bearing R.armor the server owns) — this only ties the
   COSMETIC grant to the same moment, so the reward is visible on the
   character as well as in the numbers. */
export function gearSetEarned(R) {
  return !!(R && R._quests && R._quests.tut_2 === 'turnedIn');
}
export function reconcileGearStash(R) {
  if (!R) return false;
  if (!R.gearStash) R.gearStash = [];
  let changed = false;
  const earned = gearSetEarned(R);
  for (const piece of DEFAULT_GEAR_SET) {
    const wornId = getEquip(piece.slot);
    const idx = R.gearStash.findIndex(g => g && g.slot === piece.slot && g.gearId === piece.gearId);
    if (!earned) {
      /* Not earned yet: strip any copy.  This also cleans up a tester who
         is carrying the old always-issued set after the -v3 key bump. */
      if (idx >= 0) { R.gearStash.splice(idx, 1); changed = true; }
      if (wornId === piece.gearId) { setEquip(piece.slot, 'none'); changed = true; }
      continue;
    }
    if (wornId === piece.gearId && idx >= 0) {
      R.gearStash.splice(idx, 1);                 // worn AND bagged -> dedupe
      changed = true;
    } else if (wornId !== piece.gearId && idx < 0) {
      /* Either just earned, or deliberately unequipped — both resolve to
         "it lives in the bag", which keeps the piece indestructible without
         second-guessing which case this is. */
      R.gearStash.push({ ...piece });
      changed = true;
    }
  }
  return changed;
}
