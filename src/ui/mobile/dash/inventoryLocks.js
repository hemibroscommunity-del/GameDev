/* In-memory item-lock tracker.
 *
 * Per the F3 plan + user decision: lock state is intentionally NOT
 * persisted to localStorage or R. Resets on every reload. The map
 * stores `Date.now()` at the moment of lock so the InventoryPreview
 * can sort first-locked -> top-left.
 *
 * Keys are stable item identifiers:
 *   - Inventory items: the inventory key (e.g. "fish_clownfish")
 *   - Equipped slots: the slot string ("weapon", "rangedWeapon",
 *     "staffWeapon", "armor", "shield", "amulet")
 *
 * Subscribe to re-render panels on lock changes. */

const locks = new Map();
const listeners = new Set();
const emit = () => { for (const fn of listeners) fn(); };

export function lock(key) {
  if (!key || locks.has(key)) return;
  locks.set(key, Date.now());
  emit();
}

export function unlock(key) {
  if (!key || !locks.has(key)) return;
  locks.delete(key);
  emit();
}

export function isLocked(key) {
  return !!key && locks.has(key);
}

/* Returns the locked keys in lock-order (oldest first), so the
 * InventoryPreview can pin them to the top-left of the grid. */
export function lockedKeysInOrder() {
  return Array.from(locks.entries())
    .sort((a, b) => a[1] - b[1])
    .map(([k]) => k);
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

if (typeof window !== 'undefined') {
  window._inventoryLocks = { lock, unlock, isLocked, lockedKeysInOrder };
}
