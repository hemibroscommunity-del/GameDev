import { withoutPending, PENDING_HAIR } from './pendingTraits.js';
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
const _ALL = [
  { id: 'none', name: 'None' },
  { id: 'wavy', name: 'Wavy' },
  { id: 'long', name: 'Long' },
  /* v2.3.1495: generated on the headwear mannequin (they were drawn as head
     art, so the same reference grid applies) and imported by
     tools/import_headwear.py, then moved here from HEADWEAR_CATALOG — the
     owner's names for them are hairstyles, and the hair slot lets them be worn
     UNDER a hat rather than instead of one.  Sprites and meta are unchanged;
     _placeTrait is shared by both categories. */
  { id: 'split-hair', name: 'Split Hair' },
  { id: 'dirty-blonde', name: 'Dirty Blonde' },
  { id: 'slick-back-hair', name: 'Slick Back Hair' },
  { id: 'afro', name: 'Afro' },
  { id: 'blonde-hair', name: 'Blonde Hair' },
  { id: 'flat-top', name: 'Flat Top' },
];

/* v2.3.1497: entries stay in the list above -- they are merged, just not shown.
   The export is what everything reads (pickers, RANDOMIZE, thumbnails, and the
   startup preload), so filtering here holds them back completely, textures
   included.  One flag in pendingTraits.js releases them. */
export const HAIR_CATALOG = withoutPending(_ALL, PENDING_HAIR);


const STORAGE_KEY = 'bt-hair';
let _active = 'none';
try {
  const saved = typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY);
  /* v2.3.1495: only restore an id the catalog still has.  Six styles moved
     from headwear to hair in this version, so a browser holding one of them
     under the old key would otherwise restore a selection whose sprite
     folder no longer exists there. */
  if (saved && HAIR_CATALOG.some(e => e.id === saved)) _active = saved;
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
