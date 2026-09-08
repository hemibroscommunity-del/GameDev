/* ═══ v2.3.2361: EYEWEAR — THE FOURTH HEAD TRAIT ═══
 *
 * Owner: "I want to start adding eyewear options to my Hemi bros (see the
 * first image of the 3d glasses)."
 *
 * The slot, with no art in it yet.  This module and the wiring that reads it
 * (renderer, portrait, creator tab, wire keys, character record) ship FIRST so
 * that the day a pair of glasses comes back from the generator, importing it
 * is one command and one line here -- exactly how a hat lands today.  The
 * creator tab stays hidden while the catalog holds nothing but 'none'
 * (eyewearHasOptions below), so a player sees no change until there is one.
 *
 * MECHANICALLY THIS IS THE BEARD.  Mirror of facialHairCatalog.js: sprites
 * live under public/sprites/traits/eyewear/<id>/, five base directions +
 * meta.json, placed by the shared crown-anchored _placeTrait -- a pair of
 * glasses is a trait dropped from the crown to the eye line by the positive
 * crownNudge Y its meta carries.  tools/import_headwear_green.py measures that
 * nudge off the mannequin the glasses were drawn on -- BY THE HEAD, not by the
 * shoulders as it does a hat (a face-worn piece leaves the crown visible, and
 * a generator's squashed return lifted the test pair 5-6px off the eyes when
 * it was registered like a hat) -- and checks the result against the eyes the
 * game paints, measured whole (black top edge to pupil, not the pupil, which
 * sits to one side of the eye), so there is no by-eye tuning round.
 *
 * WHERE IT DRAWS.  Above the hair and below the hat.  A brim or a helmet's
 * guard crosses the top of a pair of frames (the 3D-glasses Bro wears his hat
 * over them), and frames sit on the face in front of a fringe.  Declared once
 * by the sprites' child order in entityRenderer / the draw order in
 * characterPortrait, not per item.
 *
 * DIRECTIONS.  Glasses are invisible from behind, so a pair ships no north
 * frame -- the beard precedent (v2.3.1530): omit BOTH the png and the
 * meta.anchors entry and the renderer hides the piece on that facing without
 * a retry or a crash report.  `--omit north` on the importer does exactly
 * that.  An eye patch or an eye mask has a strap visible from behind and keeps
 * all five.  West / northwest / southeast are runtime mirrors of east /
 * northeast / south, so an ASYMMETRIC piece (a patch over one eye, a monocle)
 * swaps eyes when the character turns west.  That is a property of the
 * five-direction system, not of this slot; accept it or leave those out.
 *
 * NOT traitCategories.js.  That file's `eyewear` row (attachAt 'head.eyes')
 * belongs to the dormant v2.3.261 NFT face-overlay design and nothing imports
 * it; every shipped trait is placed by its own meta.json through _placeTrait.
 *
 * To add a pair (the full recipe, with the generator prompt, is
 * docs/specs/eyewear.md):
 *   1. python3 tools/import_headwear_green.py --art sheet.png --category eyewear
 *        --id <id> --name "<Name>" [--omit north]
 *   2. python3 tools/tune_headwear.py --category eyewear --id <id> --fit-pose jog
 *        (and mine, fish, hit, pickup)
 *   3. python3 tools/downscale_traits.py --cats eyewear --stash-hi --apply
 *   4. node tools/ui/make-southwest-thumbs.mjs
 *   5. Add one { id, name } entry to EYEWEAR_CATALOG below.
 */
export const EYEWEAR_CATALOG = [
  { id: 'none', name: 'None' },
  /* v2.3.2362: the first pair through the pipeline, and the piece the owner
     asked for by name.  Drawn on the mannequin and imported by
     tools/import_headwear_green.py --category eyewear --omit north: it ships
     four facings, because glasses are not visible from behind (the beard
     precedent, v2.3.1530).  Measured at import: the lenses cover 100% / 100% /
     96% of the eye the game paints on south / southwest / east. */
  { id: '3d-glasses', name: '3D Glasses' },
];

/** TRUE once there is something to pick.  The creator's Eyewear tab is gated
 *  on this rather than on the catalog's existence, because a tab whose only
 *  option is the one already selected is worse than no tab (v2.3.2268 removed
 *  the Build tab for exactly that reason). */
export function eyewearHasOptions() {
  return EYEWEAR_CATALOG.some((e) => e && e.id && e.id !== 'none');
}

const STORAGE_KEY = 'bt-eyewear';
let _active = 'none';
try {
  const saved = typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY);
  /* Only restore an id the catalog still has (the v2.3.1495 rule): a pair
     retired between versions must not leave a browser asking the renderer
     for a sprite folder that is no longer there. */
  if (saved && EYEWEAR_CATALOG.some((e) => e.id === saved)) _active = saved;
} catch (e) { /* localStorage unavailable (SSR / privacy mode) */ }

const _listeners = new Set();

/** Currently selected eyewear id ('none' = nothing on the face). */
export function getEyewear() { return _active; }

/** Set the active eyewear and persist it.  Notifies the renderer so it swaps
 *  textures on the next frame.  No-op if unchanged.  An id the catalog does
 *  not carry is IGNORED rather than stored (the capeCatalog rule): this is
 *  the setter the stored character record and the resume snapshot feed, and
 *  neither should be able to put a missing texture on the face. */
export function setEyewear(id) {
  if (id === _active) return;
  if (!EYEWEAR_CATALOG.some((e) => e.id === id)) return;
  _active = id;
  try { localStorage.setItem(STORAGE_KEY, id); } catch (e) { /* ignore */ }
  _listeners.forEach((fn) => { try { fn(id); } catch (e) { /* ignore */ } });
}

/** Subscribe to selection changes.  Returns an unsubscribe fn. */
export function onEyewearChange(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

/* QA hook, same shape as headwearCatalog's __btSetHeadwear -- a scenario has
   to drive a real selection, and the setter is otherwise unreachable from the
   console/bundle. */
if (typeof window !== 'undefined') window.__btSetEyewear = setEyewear;
