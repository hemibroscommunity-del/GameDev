/* Hair trait catalog + active-selection store.
 *
 * Mirror of headwearCatalog.js / facialHairCatalog.js for the 'hair'
 * category.  Hair is crown-anchored like headwear (it sits on the head),
 * and renders BELOW headwear so a hat covers it.  Sprites live under
 * public/sprites/traits/hair/<id>/.
 *
 * To add a new style:
 *   1. Drop its folder under public/sprites/traits/hair/<id>/ (base
 *      direction PNGs + meta.json from tools/downscale_trait.py).
 *   2. Add one { id, name } entry to HAIR_CATALOG below.
 */
export const HAIR_CATALOG = [
  { id: 'none', name: 'None' },
  { id: 'wavy', name: 'Wavy' },
  { id: 'long', name: 'Long' },
];

const STORAGE_KEY = 'bt-hair';
let _active = 'none';
try {
  const saved = typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY);
  if (saved) _active = saved;
} catch (e) { /* localStorage unavailable (SSR / privacy mode) */ }

const _listeners = new Set();

/** Currently selected hair id ('none' = bald). */
export function getHair() { return _active; }

/** Set the active hair and persist it.  Notifies the renderer so it swaps
 *  textures on the next frame.  No-op if unchanged. */
export function setHair(id) {
  if (id === _active) return;
  _active = id;
  try { localStorage.setItem(STORAGE_KEY, id); } catch (e) { /* ignore */ }
  _listeners.forEach(fn => { try { fn(id); } catch (e) { /* ignore */ } });
}

/** Subscribe to selection changes.  Returns an unsubscribe fn. */
export function onHairChange(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}
