/* Facial-hair trait catalog + active-selection store.
 *
 * Mirror of headwearCatalog.js for the facial-hair category (beard,
 * moustache, etc.).  Sprites live under
 * public/sprites/traits/facialhair/<id>/ and render via the shared
 * crown-anchored trait placement (a beard is just a trait dropped to the
 * chin with a large positive crownNudge Y).
 *
 * To add a new option:
 *   1. Drop its trait folder under public/sprites/traits/facialhair/<id>/
 *      (base direction PNGs + meta.json from tools/downscale_trait.py;
 *      a direction is optional -- omit BOTH its png and its meta.anchors
 *      entry when that view hides the trait.  The anchor is what makes it
 *      render: without one _placeTrait bails and the loader knows the 404
 *      is by design.  v2.3.1530: beard ships neither north nor northeast,
 *      because both turn the face away -- and northwest mirrors northeast,
 *      so that side is covered by the same omission).
 *   2. Add one { id, name } entry to FACIALHAIR_CATALOG below.
 */
export const FACIALHAIR_CATALOG = [
  { id: 'none', name: 'None' },
  { id: 'beard', name: 'Beard' },
];

const STORAGE_KEY = 'bt-facialhair';
let _active = 'none';
try {
  const saved = typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY);
  if (saved) _active = saved;
} catch (e) { /* localStorage unavailable (SSR / privacy mode) */ }

const _listeners = new Set();

/** Currently selected facial-hair id ('none' = clean-shaven). */
export function getFacialHair() { return _active; }

/** Set the active facial hair and persist it.  Notifies the renderer so it
 *  swaps textures on the next frame.  No-op if unchanged. */
export function setFacialHair(id) {
  if (id === _active) return;
  _active = id;
  try { localStorage.setItem(STORAGE_KEY, id); } catch (e) { /* ignore */ }
  _listeners.forEach(fn => { try { fn(id); } catch (e) { /* ignore */ } });
}

/** Subscribe to selection changes.  Returns an unsubscribe fn. */
export function onFacialHairChange(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}
