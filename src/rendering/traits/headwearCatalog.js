/* Headwear trait catalog + active-selection store.
 *
 * To add a new headwear option:
 *   1. Drop its trait folder under public/sprites/traits/headwear/<id>/
 *      (5 base direction PNGs east/north/northeast/south/southwest + meta.json,
 *      produced by tools/downscale_trait.py).  south.png is used as the
 *      picker thumbnail.
 *   2. Add one { id, name } entry to HEADWEAR_CATALOG below.
 * That's it -- the login picker and the renderer both read from here.
 */
export const HEADWEAR_CATALOG = [
  { id: 'none', name: 'None' },
  { id: 'old-school-helmet', name: 'Old School Helmet' },
  { id: 'top-hat', name: 'Top Hat' },
  { id: 'purple-hat', name: 'Purple Hat' },
];

const STORAGE_KEY = 'bt-headwear';
let _active = 'old-school-helmet';
try {
  const saved = typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY);
  if (saved) _active = saved;
} catch (e) { /* localStorage unavailable (SSR / privacy mode) */ }

const _listeners = new Set();

/** Currently selected headwear id ('none' = bareheaded). */
export function getHeadwear() { return _active; }

/** Set the active headwear and persist it.  Notifies the renderer so it
 *  swaps textures on the next frame.  No-op if unchanged. */
export function setHeadwear(id) {
  if (id === _active) return;
  _active = id;
  try { localStorage.setItem(STORAGE_KEY, id); } catch (e) { /* ignore */ }
  _listeners.forEach(fn => { try { fn(id); } catch (e) { /* ignore */ } });
}

/** Subscribe to selection changes.  Returns an unsubscribe fn. */
export function onHeadwearChange(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}
