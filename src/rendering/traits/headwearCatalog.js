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
  { id: 'shark-hat', name: 'Shark Hat' },
  { id: 'bandana', name: 'Bandana' },
  { id: 'sombrero', name: 'Sombrero' },
  { id: 'bucket-hat', name: 'Bucket Hat', solid: true },
  { id: 'fedora', name: 'Fedora' },
  /* v2.3.1483: first hat through the generated pipeline — drawn onto the
     mannequin (tools/make_headwear_mannequin.py) and imported by
     tools/import_headwear.py, which derives anchors/crownNudge/scale from the
     head the art was drawn on instead of the by-eye tuning every hat above
     needed.  Not `solid`: the gold band, the darker points and the red gems
     are three tones, so a brightness-ratio retint would flatten them. */
  { id: 'crown', name: 'Crown' },
  /* v2.3.1488: the first batch to come back REDRAWN rather than composited onto
     the mannequin (see the registration note in tools/import_headwear.py).
     None are `solid` — each is two or three tones (the wizard hat's brim
     shading, the ears' red band, the evil crown's embers), and a
     brightness-ratio retint would flatten them into one colour. */
  { id: 'wizard-hat', name: 'Wizard Hat' },
  { id: 'mickey-ears', name: 'Mickey Ears' },
  { id: 'evil-crown', name: 'Evil Crown' },
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

/* v2.3.1351: QA hook (same pattern as window.__broDashPanelBus) — the
   headwear size-comparison rig cycles every hat on the live character;
   the setter is otherwise unreachable from the console/bundle. */
if (typeof window !== 'undefined') window.__btSetHeadwear = setHeadwear;
