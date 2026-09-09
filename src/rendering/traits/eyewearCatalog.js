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
  /* v2.3.2363: the second pair, and the first that is SEE-THROUGH.  Its meta
     carries `alpha: 0.5`, which the two placement paths and the portrait apply,
     so the character's own eyes -- painted into the body sheets, and recoloured
     by the Eyes tab -- show through the pane instead of being hidden behind it.
     The generator had drawn eyes INTO the lens as well; those are flattened out
     at import (--flatten-lens), because a semi-transparent piece must not carry
     a painted-on eye in front of the real one. */
  { id: 'goggles', name: 'Goggles' },
  /* v2.3.2364: a solid visor -- no alpha and no lens flattening, because the
     red bar IS the design rather than something drawn through it.  Imported
     from a sheet whose figure was outlined like the two above; the strip took
     35458px of that outline off the piece and the visor came through whole,
     which is the case the v2.3.2362 gate was built for. */
  { id: 'laser-glasses', name: 'Laser Glasses' },
  /* v2.3.2365: the pair that paid for the eye-seating pass.  Its lenses are 13px
     deep in the 256 frame where the three above are 19-22, so the southwest
     cell's low draw -- a bias every eyewear sheet has shown -- cost it 75% of
     its eye coverage instead of nothing.  seat_eyes() in the importer now moves
     each facing onto the eye row the game paints; all four pairs cover 100%. */
  { id: 'thug-life', name: 'Thug Life' },
  /* v2.3.2366: white frames with a solid white lens.  The sheet drew its lenses
     as a TRANSPARENCY CHECKERBOARD -- literal white-and-grey squares in an RGB
     file with no alpha channel, an editor drawing "nothing here" -- so it had
     to be read as one intent or the other.  Shipped solid (--flatten-lens);
     --clear-lens renders the same sheet with the lens erased, and it reads
     worse today because the hole is cut to the eye box rather than to the lens
     outline.  Nothing ships with it. */
  { id: 'white-glass', name: 'White Glass' },
  /* v2.3.2367: the first ONE-LENS piece, and the first from a sheet whose
     person was not green -- the owner repainted the mannequin cyan for
     contrast, so the importer now finds the person's colour instead of
     assuming it.  Ships THREE facings: no north and no northeast, because a
     monocle is not visible from behind on either.  ASYMMETRIC, so it swaps
     eyes when the character faces west; that is the five-direction mirroring,
     not a bug in the art. */
  { id: 'golden-monocle', name: 'Golden Monocle' },
  /* v2.3.2368: gold frames with tan lenses, imported AS DRAWN.  --flatten-lens
     was tried and rejected on the render: the eye-box region spans lens and
     frame both, so its median came out gold and the flatten turned the glasses
     into a solid bar.  The faint band the generator left inside each lens is a
     pixel wide at game size and reads as lens shading, so the art is better
     untouched -- which is why that flag is a judgement per sheet and not
     something the importer decides for you. */
  { id: 'golden-glasses', name: 'Golden Glasses' },
  /* v2.3.2369: the first piece that ships ALL FIVE facings -- the strap goes
     round the head, so it is visible from behind where every pair of glasses
     before it was omitted on north.  One-lens like the monocle, and the piece
     that made one-lens-ness a property of the ITEM rather than of a facing:
     it reads 100%/22% on south, which is unmistakable, and 56%/78% on
     southwest, where the strap crosses the free eye -- so southwest alone
     would have called it a pair and balanced the patch between both eyes.
     ASYMMETRIC, and the piece that proved a DRAWING fault is not a placement
     fault (v2.3.2370, owner: "I noticed south and southwest switch eyes").
     The first sheet drew the patch on the character's RIGHT eye in the south
     cell and their LEFT in the southwest one -- a swap between two DRAWN
     facings, not the mirrored ones.  Measured at 100% on eye 0 for south and
     100% on eye 1 for southwest, and moving southwest onto eye 0 was an 18px
     sideways move against the 8px seat bound that would have hung 14px of
     strap off the head.  So it was reported rather than forced, and the owner
     redrew that cell.
     v2.3.2371: imported from the REDRAWN sheet, which also arrived with no
     shine on it, so the flatten flags the first one needed are gone.  Both
     front facings now put the patch on eye 0 -- south 100%/33%, southwest
     100%/51%, the second figure being the strap crossing the free eye, which
     is the strap doing its job.  Still asymmetric, so it still shows on the
     other eye when the character faces west / northwest / southeast: those
     three are runtime mirrors, which no sheet can change. */
  { id: 'eye-patch', name: 'Eye Patch' },
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
