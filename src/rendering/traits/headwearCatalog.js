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
/* `solid: true` marks a single-color hat whose whole sprite can be
   retinted to a chosen color without wrecking an accent (the recolor is a
   brightness-ratio retint of every opaque pixel).  Multi-color hats
   (top-hat's band, helmet's stripe) are left off so their accents stay
   intact -- they show no hat-color picker. */
export const HEADWEAR_CATALOG = [
  { id: 'none', name: 'None' },
  { id: 'old-school-helmet', name: 'Old School Helmet' },
  { id: 'top-hat', name: 'Top Hat' },
  { id: 'purple-hat', name: 'Purple Hat', solid: true },
  { id: 'beanie', name: 'Beanie', solid: true },
  { id: 'red-cap', name: 'Red Cap', solid: true },
];

/** True if the hat can be recolored (single-color design). */
export function headwearIsSolid(id) {
  const e = HEADWEAR_CATALOG.find(h => h.id === id);
  return !!(e && e.solid);
}

const STORAGE_KEY = 'bt-headwear';
let _active = 'none';
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
