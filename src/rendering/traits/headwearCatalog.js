import { withoutPending, PENDING_HEADWEAR } from './pendingTraits.js';
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
const _ALL = [
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
  /* v2.3.1522: renamed from 'Fedora' (owner). Id left alone, same reason as
     the Sheriff Hat below — a saved appearance stores the id. */
  { id: 'fedora', name: 'Derby' },
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
     NOTE ON MEMORY (resolved v2.3.1526): preloadTraits() loads every catalog
     entry x 5 directions onto the startup gate, and this batch of 30 was
     37.5MB of texture on its own.  The fix this note called for is done —
     trait art is stored in a 128 frame and _placeTrait normalises by texture
     size — so all 48 traits now cost 15.7MB, less than the 14 non-dormant
     ones cost at 256.  Trimming the list was never the answer. */
  { id: 'barbarian-helmet', name: 'Barbarian Helmet' },
  { id: 'army-helmet', name: 'Army Helmet' },
  { id: 'axe-head', name: 'Axe On Head' },
  { id: 'golden-bucket', name: 'Golden Bucket' },
  /* v2.3.1934 (owner: "Beard Southwest view is layered behind Arab hat. It
     should be in front of").  `beardOver` flips the beard above this piece.
     Declared on the ENTRY for the same reason `underHair` is a few lines down:
     layering is a property of the thing you are wearing, not of the renderer.
     A keffiyeh DRAPES down the sides of the head and a beard grows in front of
     cloth.  The default -- beard under headwear -- stays right for everything
     physically in front of the face (a brim, a helmet's cheek guard, a
     headphone cup), which is why this is one entry and not a rule. */
  { id: 'arabian-robe', name: 'Arabian Robe', beardOver: true },
  /* v2.3.1764 (owner: "Layer the hair on top of headphones").  Headphones are
     worn ON THE EARS, so hair falls over the band — unlike a hat or a helmet,
     which cover it.  `underHair` flips the draw order for this piece only; the
     default stays hat-over-hair, which is right for everything else in this
     catalog. */
  { id: 'headphones', name: 'Headphones', underHair: true },
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
  /* v2.3.1514: renamed from 'Grey Cowboy Hat' (owner). The id is deliberately
     left alone -- a saved appearance stores the id, so changing it would drop
     the hat off anyone already wearing it. */
  { id: 'cowboy-hat-2', name: 'Sheriff Hat' },
  { id: 'chinese-hat', name: 'Chinese Hat' },
  { id: 'spartan-helmet', name: 'Spartan Helmet' },
  { id: 'bandana-blue', name: 'Blue Bandana' },
  { id: 'kermit-hat', name: 'Kermit Hat' },
  /* v2.3.1490: floats clear of the scalp, like new-idea — it only imports at
     all because the core test is open at the top (see import_headwear.py). */
  { id: 'halo', name: 'Halo' },
];

/* v2.3.1497: entries stay in the list above -- they are merged, just not shown.
   The export is what everything reads (pickers, RANDOMIZE, thumbnails, and the
   startup preload), so filtering here holds them back completely, textures
   included.  One flag in pendingTraits.js releases them. */
export const HEADWEAR_CATALOG = withoutPending(_ALL, PENDING_HEADWEAR);


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

/** v2.3.1764: TRUE when this headwear is worn UNDER the hair (headphones sit
 *  on the ears; a hat or a helmet covers the hair).  The renderer swaps the two
 *  sprites' draw order on this — declared here rather than as a list of ids in
 *  the renderer so a new piece states its own layering next to its name. */
export function headwearUnderHair(id) {
  const e = _ALL.find((h) => h && h.id === id);
  return !!(e && e.underHair);
}

/** v2.3.1934: TRUE when facial hair renders ABOVE this headwear instead of
 *  below it.  Measured before it was written: rendering the beard alone and
 *  then with each hat, 25 (hat, facing) pairs overlap the beard at all, and for
 *  nearly all of them the hat covering the beard is CORRECT -- the spartan and
 *  old-school helmets hide 256px of it behind a face guard on east, headphones
 *  behind an ear cup, the shark hat behind its jaw.  Only draping cloth is the
 *  exception, so only draping cloth carries the flag. */
export function headwearBehindBeard(id) {
  const e = _ALL.find((h) => h && h.id === id);
  return !!(e && e.beardOver);
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
