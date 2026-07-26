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
  /* v2.3.1489: the NFT-trait batch — 30 hats through the same generated
     pipeline, all measured rather than eyeballed.  None are `solid`; every one
     came back with at least two tones, and a brightness-ratio retint would
     flatten them.
     NOTE ON MEMORY: preloadTraits() loads every catalog entry x 5 directions
     onto the startup gate, and a trait frame is a fixed 256x256 (the renderer
     applies crownNudge in 256-space and does NOT normalise by texture size —
     see _placeTrait — so the frame cannot simply be shrunk).  This batch adds
     150 textures = 37.5MB, taking headwear from 13.8MB to 51.2MB.  If iPhone
     memory becomes a problem again, the fix with the best ratio is to store
     trait art in a 128 frame and teach _placeTrait to normalise — a 4x saving
     across ALL traits — not to trim this list. */
  { id: 'barbarian-helmet', name: 'Barbarian Helmet' },
  { id: 'army-helmet', name: 'Army Helmet' },
  { id: 'axe-head', name: 'Axe On Head' },
  { id: 'golden-bucket', name: 'Golden Bucket' },
  { id: 'arabian-robe', name: 'Arabian Robe' },
  { id: 'headphones', name: 'Headphones' },
  { id: 'devil-horns', name: 'Devil Horns' },
  { id: 'cat-ears', name: 'Cat Ears' },
  { id: 'new-idea', name: 'New Idea' },
  /* v2.3.1495: six hairstyles that arrived on this sheet run — Split Hair,
     Dirty Blonde, Slick Back Hair, Afro, Blonde Hair, Flat Top — moved to
     HAIR_CATALOG where they belong.  They are hair, not headwear, and the hair
     layer renders BELOW headwear, so as hair they can also be worn under a
     hat instead of competing with one for the same slot. */
  /* the owner's names for these three collide with hats already above
     (Bucket Hat, Bandana) or with each other (two cowboy hats), so the label
     carries the colour that tells them apart in the picker. */
  { id: 'bucket-hat-2', name: 'Dark Bucket Hat' },
  { id: 'bandana-2', name: 'Red Bandana' },
  { id: 'asian-hat', name: 'Asian Hat' },
  { id: 'fez-hat', name: 'Fez Hat' },
  { id: 'russian-hat', name: 'Russian Hat' },
  { id: 'cowboy-hat', name: 'Brown Cowboy Hat' },
  { id: 'folded-brim', name: 'Folded Brim' },
  { id: 'gray-hat', name: 'Gray Hat' },
  { id: 'safety-helmet', name: 'Safety Helmet' },
  { id: 'naruto-headband', name: 'Naruto Headband' },
  { id: 'cowboy-hat-2', name: 'Grey Cowboy Hat' },
  { id: 'chinese-hat', name: 'Chinese Hat' },
  { id: 'spartan-helmet', name: 'Spartan Helmet' },
  { id: 'bandana-blue', name: 'Blue Bandana' },
  { id: 'kermit-hat', name: 'Kermit Hat' },
  /* v2.3.1490: floats clear of the scalp, like new-idea — it only imports at
     all because the core test is open at the top (see import_headwear.py). */
  { id: 'halo', name: 'Halo' },
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
  /* v2.3.1495: only restore an id the catalog still has.  Six styles moved
     from headwear to hair in this version, so a browser holding one of them
     under the old key would otherwise restore a selection whose sprite
     folder no longer exists there. */
  if (saved && HEADWEAR_CATALOG.some(e => e.id === saved)) _active = saved;
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
