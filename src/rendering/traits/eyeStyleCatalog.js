/* ═══ v2.3.2643: EYE STYLES — THE FIFTH HEAD TRAIT ═══
 *
 * Owner, with four mannequin sheets: "I want these as 'eyes' choices —
 * Sleepy eyes, one eye, demon eyes, wtf eyes."
 *
 * A SLOT OF ITS OWN, NOT FOUR MORE EYEWEAR ENTRIES.  The art arrived on the
 * eyewear reference sheet and is placed by the same crown-anchored machinery,
 * so folding it into EYEWEAR_CATALOG would have been two lines.  It would also
 * have made "demon eyes" and "sunglasses" mutually exclusive, which is the one
 * combination a player is most likely to want, and it would have filed a facial
 * FEATURE under a category that means "something worn on the face".  They are
 * separate slots, and the child order puts eyewear ABOVE this one: glasses go
 * over your eyes, whatever your eyes are.
 *
 * MECHANICALLY THIS IS EYEWEAR.  Mirror of eyewearCatalog.js: sprites live
 * under public/sprites/traits/eyestyle/<id>/, base directions + meta.json,
 * placed by the shared crown-anchored _placeTrait, dropped from the crown to
 * the eye line by the positive crownNudge Y its meta carries.  The importer
 * is the same one (`--category eyestyle`, which is in FACE_WORN for the same
 * reason eyewear is) and it seats each facing onto the eye row the game paints,
 * so there is no by-eye tuning round.
 *
 * THE REAL EYE IS ERASED UNDER A STYLE, NOT COVERED BY IT (v2.3.2643).  Owner:
 * "I still see some remnants around the eyes where you stickered over the old
 * ones, can that be cleaned up with whatever skin color it is (the ones that
 * gets changed with custom skin color choice)?"  No drawn shape covers another
 * drawn shape exactly, so the first cut left the base eye's black top edge and
 * a brown anti-aliased ring showing round every style.  The body bake now paints
 * the whole eye out and fills it with skin SAMPLED FROM THE FACE ITSELF, so it
 * follows the skin-tone pick with no table to keep in step -- playerSkins
 * `_blankEyes`, the region from eyeBlankMask.json.
 *
 * IT DOES NOT REPLACE THE EYE COLOUR TAB, IT SITS ABOVE IT.  The character's
 * own eyes are painted into the body sheets and recoloured through eyeMask.json
 * (v2.3.1928); that is still what you see with 'none' selected, and it is still
 * what the colour row under the picker changes.  With a style on, the erase
 * above means the colour row is painting something that is no longer there --
 * measured, and asserted by mp-eyestyle.mjs: switching eye colour under a style
 * changes zero pixels.  The row is deliberately left in place anyway rather
 * than hidden per-selection: it is the same control it has always been, it
 * comes straight back when you pick 'none', and a control that disappears when
 * you touch an unrelated tile reads as a bug.
 *
 * WHERE IT DRAWS.  Above the hair, below the eyewear, below the hat.  Declared
 * once by the sprites' child order in entityRenderer / the draw order in
 * characterPortrait, not per item.
 *
 * DIRECTIONS.  South, southwest and east, and their runtime mirrors.  Nothing
 * from behind -- the beard precedent (v2.3.1530): omit BOTH the png and the
 * meta.anchors entry and the renderer hides the piece on that facing without a
 * retry or a crash report.
 *   DEMON SHIPPED ALL FIVE FOR ONE COMMIT and no longer does.  The owner drew
 * the flames on the back-of-the-head cells and they imported cleanly, so the
 * first cut kept them; he then asked for them dropped -- "You can ignore the
 * demon eyes in the back of the head I just wanted south, southwest (and
 * mirror) and east (and mirror)".  Worth knowing because nothing in the CODE
 * decided either way: the renderer reads meta.anchors, so a facing existing is
 * data (v2.3.2379's Golden Monocle made the same point), and re-importing
 * without `--omit northeast,north` would bring them straight back.
 *
 * To add a style (the full recipe is docs/specs/eyes.md):
 *   1. python3 tools/flatkey_drawn_mannequin.py --art sheet.png --out keyed.png
 *        <- NEW, and the step eyewear does not have: these sheets are drawn on
 *           the REAL mannequin (skin, outline, nose and mouth all present),
 *           because you cannot draw an eye onto a head with no face.  This
 *           re-keys it to the flat-green sheet the importer requires.  Its
 *           per-cell report is what tells you which facings to --omit.
 *   2. python3 tools/import_headwear_green.py --art keyed.png --category eyestyle
 *        --id <id> --name "<Name>" [--omit northeast,north]
 *   3. python3 tools/tune_headwear.py --category eyestyle --id <id> --fit-pose jog
 *        (and mine, fish, hit, pickup)
 *   4. python3 tools/downscale_traits.py --cats eyestyle --stash-hi --apply
 *   5. python3 tools/ui/make_eyestyle_thumbs.py
 *        <- NOT slice_eyewear_thumbs.py, and NOT the thumb the importer writes.
 *           A cropped eye on transparency is unreadable as a tile; this one
 *           composites the piece onto the game's own head so the tile is a FACE.
 *   6. Add one { id, name } entry to EYE_STYLE_CATALOG below.
 */
export const EYE_STYLE_CATALOG = [
  /* 'none' is the eyes the body sheets paint -- the tile helper draws its
     shared bald-head icon and the caption "None" for this id whatever the
     name says, so the name matches what the tile shows rather than arguing
     with it. */
  { id: 'none', name: 'None' },
  /* v2.3.2643: navy half-lidded eyes with a pale highlight in the inner corner.
     The subtlest of the four -- it is the same eye the body sheets paint, drawn
     droopy -- and the one that most wants the real eyes underneath hidden,
     which the import measured at 73-81% coverage of the whole eye box on the
     standing bodies.  The remainder is a sliver of the base eye's black top
     edge, which reads as a lash rather than as a second eye. */
  { id: 'sleepy', name: 'Sleepy Eyes' },
  /* v2.3.2643: one big white cyclops eye with a black pupil, CENTRED between
     the two real eyes rather than over either of them.  The importer's eye
     check reports that as 57% / 57% and flags it LOW, which is the eyewear
     heuristic ("the lenses are not over the eyes") firing on a piece that is
     not a pair of lenses: half of each eye is exactly where a one-eye piece
     belongs.  Symmetric, so unlike the Golden Monocle and the Eye Patch it does
     not swap sides when the character faces west. */
  { id: 'one-eye', name: 'One Eye' },
  /* v2.3.2643: flames instead of eyes.  100% eye coverage on south and east,
     94/86% on southwest.  The owner's sheet DOES draw flames on the two rear
     cells and they imported cleanly; they are omitted at his request (see the
     DIRECTIONS note in the header), so this ships the same three facings as the
     other styles.
     It is also the repo's only all-bright face piece -- minimum luminance 106
     at 128px and 102 at 256 -- which is what makes it the probe mp-eyestyle.mjs
     uses to prove the erase: while it is worn, any dark pixel left in the eye
     window can only be the old eye. */
  { id: 'demon', name: 'Demon Eyes' },
  /* v2.3.2643: two wide white eyes set further apart than the real ones, pupils
     down in the inner corners.  Drawn on a sheet whose mannequin came back at a
     lighter skin tone -- rgb(227,152,79) against rgb(201,133,77) for the other
     three -- which is why flatkey_drawn_mannequin.py finds the skin rather than
     assuming it, the same lesson eyewear learned from the cyan sheet
     (v2.3.2367).  Its east cell also came back at a different aspect (vertical
     1.136x vs horizontal 1.100x); placed by the head, so that is a note in the
     import log rather than a problem. */
  { id: 'wtf', name: 'WTF Eyes' },
];

/** TRUE once there is something to pick.  Same gate as eyewearHasOptions: the
 *  picker row is dropped rather than shown with one already-selected option
 *  (the v2.3.2268 reasoning that removed the Build tab).  Unlike eyewear this
 *  does NOT gate a whole tab -- the Eyes tab exists for the colour row either
 *  way -- it gates only the thumb strip above it. */
export function eyeStyleHasOptions() {
  return EYE_STYLE_CATALOG.some((e) => e && e.id && e.id !== 'none');
}

const STORAGE_KEY = 'bt-eyestyle';
let _active = 'none';
try {
  const saved = typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY);
  /* Only restore an id the catalog still has (the v2.3.1495 rule): a style
     retired between versions must not leave a browser asking the renderer for a
     sprite folder that is no longer there. */
  if (saved && EYE_STYLE_CATALOG.some((e) => e.id === saved)) _active = saved;
} catch (e) { /* localStorage unavailable (SSR / privacy mode) */ }

const _listeners = new Set();

/** Currently selected eye style id ('none' = the eyes the body sheets paint). */
export function getEyeStyle() { return _active; }

/** Set the active eye style and persist it.  Notifies the renderer so it swaps
 *  textures on the next frame.  No-op if unchanged.  An id the catalog does not
 *  carry is IGNORED rather than stored (the capeCatalog rule): this is the
 *  setter the stored character record and the resume snapshot feed, and neither
 *  should be able to put a missing texture on the face. */
export function setEyeStyle(id) {
  if (id === _active) return;
  if (!EYE_STYLE_CATALOG.some((e) => e.id === id)) return;
  _active = id;
  try { localStorage.setItem(STORAGE_KEY, id); } catch (e) { /* ignore */ }
  _listeners.forEach((fn) => { try { fn(id); } catch (e) { /* ignore */ } });
}

/** Subscribe to selection changes.  Returns an unsubscribe fn. */
export function onEyeStyleChange(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

/* QA hook, same shape as __btSetEyewear -- a scenario has to drive a real
   selection, and the setter is otherwise unreachable from the console/bundle. */
if (typeof window !== 'undefined') window.__btSetEyeStyle = setEyeStyle;
