/* v2.3.1070: shared bag model -- the single source of truth for WHAT the
 * bag shows and in WHICH order.  Both the quick-bag preview (the 3x3 grid in
 * the bottom dashboard) and the full Bag panel read from here, so the two
 * surfaces can never disagree: they render the same ordered list, just sliced
 * to different lengths.
 *
 * An entry is one of:
 *   { kind:'item',        key, count, cat, lockKey, stamp }
 *   { kind:'stashWeapon', obj, index, cat, lockKey, stamp }
 *   { kind:'stashShield', obj, index, cat, lockKey, stamp }
 *   { kind:'stashArmor',  obj, index, cat, lockKey, stamp }
 *   { kind:'stashLegs',   obj, index, cat, lockKey, stamp }
 *   { kind:'stashGear',   obj, index, cat, lockKey, stamp }
 *
 * Stash entries are items the player took OFF in the Loadout -- they belong in
 * the bag exactly like a gathered material does, which is why they live in the
 * same ordered list rather than a separate "unequipped" pile.
 *
 * Ordering: anchored (locked) entries first, in anchor-order (oldest anchor
 * pins to the top-left); then everything else most-recently-modified first.
 * Recency is tracked here at module scope behind a shared monotonic clock, so
 * the two views agree on order down to the tile -- a freshly unequipped item
 * or a freshly gathered material both bubble to the front in both places. */

import { classify, CAPE_ITEM_PREFIX } from './InventoryPanel.jsx';
import { lockedKeysInOrder } from './inventoryLocks.js';
/* v2.3.2143: the WORN cape leaves the bag -- see wornCapeKey() below. */
import { getCape } from '@/rendering/traits/capeCatalog.js';

let clk = 0;
const bump = () => ++clk;

/* Recency stamps.  Inventory keys are tracked by count (a key's stamp bumps
 * when its count grows); stash objects are tracked by identity (stamped the
 * first time we ever see the object, i.e. the frame it was unequipped). */
const itemStamp = new Map();    // inv key -> recency stamp
const prevCount = new Map();    // inv key -> last-seen count
const stashStamp = new WeakMap(); // stash object -> recency stamp

const stampStash = (obj) => {
  if (!obj) return 0;
  let s = stashStamp.get(obj);
  if (s == null) { s = bump(); stashStamp.set(obj, s); }
  return s;
};

/* Build the ordered list of bag entries for the given rpg state.  Pure with
 * respect to ordering across repeated calls in a frame (stamps only ever bump
 * on a real count increase or a never-before-seen key/stash), so both views
 * can call it freely without fighting over order. */
export function getBagEntries(rpg) {
  if (!rpg) return [];
  const inv = rpg.inventory || {};

  /* Refresh inventory recency: bump a key when its count grows, and stamp any
   * key we've never seen so it has an order at all. */
  for (const k of Object.keys(inv)) {
    const n = inv[k] || 0;
    if (n <= 0) continue;
    const was = prevCount.get(k) || 0;
    if (n > was || !itemStamp.has(k)) itemStamp.set(k, bump());
    prevCount.set(k, n);
  }
  /* Forget keys that dropped to zero so a later re-pickup reads as new. */
  for (const k of Array.from(prevCount.keys())) {
    if (!((inv[k] || 0) > 0)) { prevCount.delete(k); itemStamp.delete(k); }
  }

  /* ═══ v2.3.2143: A WORN CAPE IS NOT IN YOUR BAG ═══
     Owner, twice: "after equipping it it still stays as an icon in your
     inventory", then "the bug of it not disappearing from bag after
     equipping ... still isn't working".

     Every other slot already behaves this way and that is the whole point:
     the bag holds what you are NOT wearing.  Worn gear is absent from
     rpg.inventory entirely, and gear you take off comes BACK as a stash
     entry (pushStash below).  The cape broke that rule because it is not
     rpg data at all -- `cape_<id>` is a TROPHY the worker mints beside the
     ownership ledger (server/src/eventcapes.js _handleCapeRedeem), and the
     ledger, not the item, is what says you own it.  So the trophy sat in
     the bag whether or not the cape was on your back.

     Hidden, not consumed.  The item stays in rpg.inventory untouched, so
     nothing about ownership or persistence changes and no server round
     trip can drop it; take the cape off and this key is right back in the
     bag, in its old position, ready to tap again.  That symmetry is why
     the filter lives HERE, in the one model both bag surfaces read: the
     quick-bag and the full panel can never disagree about it.

     The unequip control this depends on is the REMOVE button on the cape's
     slot card (equipModel.js / HeroExpanded.jsx, same version) -- before
     that button existed this bag item was the ONLY way to take a cape off,
     and hiding it alone would have welded the prize on. */
  const wornCapeKey = (function () {
    try {
      const id = getCape();
      return (id && id !== 'none') ? `${CAPE_ITEM_PREFIX}${id}` : null;
    } catch (e) { return null; }   /* never let a cosmetic hide empty the bag */
  }());

  const entries = [];
  for (const k of Object.keys(inv)) {
    if ((inv[k] || 0) <= 0) continue;
    if (wornCapeKey && k === wornCapeKey) continue;
    entries.push({
      kind: 'item', key: k, count: inv[k], cat: classify(k),
      lockKey: k, stamp: itemStamp.get(k) || 0,
    });
  }

  /* Unequipped Loadout gear.  cat mirrors the full panel's old filtering:
   * weapons under the Weapon chip, everything worn under Armor. */
  const pushStash = (arr, kind, cat, lockPrefix) => {
    (arr || []).forEach((obj, i) => {
      if (!obj) return;
      entries.push({
        kind, obj, index: i, cat,
        lockKey: `${lockPrefix}_${i}`, stamp: stampStash(obj),
      });
    });
  };
  pushStash(rpg.weaponStash, 'stashWeapon', 'weapon', 'stashWeapon');
  pushStash(rpg.shieldStash, 'stashShield', 'armor',  'stashShield');
  pushStash(rpg.armorStash,  'stashArmor',  'armor',  'stashArmor');
  /* v2.3.1701: the LEGS half of the stat-bearing armour, in its own stash so
     a quest greave can never be swapped into the chest slot (see the
     quest_reward_stashed handler in wsClient.js). */
  pushStash(rpg.legsStash,   'stashLegs',   'armor',  'stashLegs');
  pushStash(rpg.gearStash,   'stashGear',   'armor',  'stashGear');

  /* Anchored entries first (anchor-order: oldest anchor top-left), then the
   * rest by recency (newest first). */
  const lockRank = new Map();
  lockedKeysInOrder().forEach((lk, i) => lockRank.set(lk, i));
  entries.sort((a, b) => {
    const la = lockRank.has(a.lockKey);
    const lb = lockRank.has(b.lockKey);
    if (la && lb) return lockRank.get(a.lockKey) - lockRank.get(b.lockKey);
    if (la) return -1;
    if (lb) return 1;
    return b.stamp - a.stamp;
  });
  return entries;
}

/* ═══ v2.3.2143: A QA HANDLE FOR WHAT THE BAG ACTUALLY SHOWS ═══
   The worn-cape filter above is invisible to every existing check: the item
   is still in rpg.inventory (deliberately -- it is hidden, not consumed), so
   a scenario reading the blob sees no difference at all, which is exactly the
   blind spot that let "still in the bag" be reported twice.

   Driving the real bag panel instead would mean finding a tile by its art in
   a scrolling grid -- the brittleness that killed five scenarios (TRAPS §29).
   This is the honest middle: the scenario hands in the same rpg the panel
   renders from and gets back the same ordered key list the panel lays out, so
   a filter that stops working fails a test instead of reaching the owner. */
if (typeof window !== 'undefined') {
  window.__btBagKeys = (rpg) => getBagEntries(rpg).map((e) => (
    e.kind === 'item' ? e.key : `${e.kind}:${e.index}`
  ));
}
