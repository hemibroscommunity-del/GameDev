/* Shirt (torso clothing) trait catalog + active-selection store.
 *
 * Mirror of facialHairCatalog.js for the shirt category.  A shirt renders
 * via the shared crown-anchored trait placement -- it's a trait dropped to
 * the chest with a large positive crownNudge Y (the beard does the same to
 * reach the chin).  Sprites live under public/sprites/traits/shirt/<id>/.
 *
 * To add a new shirt: drop its folder under public/sprites/traits/shirt/<id>/
 * (5 base-dir PNGs + meta.json from tools/downscale_trait.py) and add one
 * { id, name } entry below.
 */
export const SHIRT_CATALOG = [
  { id: 'none', name: 'None' },
  { id: 'tshirt', name: 'T-Shirt' },
];

const STORAGE_KEY = 'bt-shirt';
let _active = 'none';
try {
  const saved = typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY);
  if (saved) _active = saved;
} catch (e) { /* localStorage unavailable */ }

const _listeners = new Set();

/** Currently selected shirt id ('none' = bare torso). */
export function getShirt() { return _active; }

/** Set + persist the active shirt.  Notifies the renderer.  No-op if same. */
export function setShirt(id) {
  if (id === _active) return;
  _active = id;
  try { localStorage.setItem(STORAGE_KEY, id); } catch (e) { /* ignore */ }
  _listeners.forEach(fn => { try { fn(id); } catch (e) { /* ignore */ } });
}

/** Subscribe to selection changes.  Returns an unsubscribe fn. */
export function onShirtChange(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}
