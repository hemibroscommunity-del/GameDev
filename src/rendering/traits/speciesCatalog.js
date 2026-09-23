/* ═══ v2.3.2681: SPECIES — THE MONKEY, AS A HEAD TRAIT ═══
 *
 * Owner: "What's the feasibility of adding new species to play as?  I'm
 * wanting to add alien and monkey" ... "Push to main!  Make sure it's
 * available in trait picker."
 *
 * WHAT A SPECIES IS, MECHANICALLY.  Not a new body rig -- the same bro, with
 * (a) a skin colour from SKIN_CATALOG (Monkey Brown and the v2.3.2680 fur
 * colours) and (b) a piece drawn over the head: the monkey's ears and muzzle.
 * The piece is eyewear's twin: public/sprites/traits/species/<id>/, five base
 * facings + meta.json, placed by the shared crown-anchored _placeTrait.  Two
 * things it has that no other trait does, both in speciesArt.js:
 *   - PER-FRAME OVERLAYS (meta.frameOverlays, tools/species_frames.py): 196 of
 *     the 231 frames the head moves through are baked individually -- the hit
 *     flinch turns the head, pickup tips it, mining raises a pickaxe past it --
 *     and drawn in body space instead of the crown-anchored piece.
 *   - FUR THAT FOLLOWS THE SKIN (meta.fur): the patches painted over the bro's
 *     own ear and teeth are skin, shipped as bare-skin twins and recoloured with
 *     the player's skin exactly like the body.  The muzzle and ears never
 *     recolour -- they stay the art's tan on every skin (owner, v2.3.2680).
 * docs/specs/SPECIES-PLAN.md has the whole story and the renderer contract.
 *
 * WHERE IT DRAWS.  Above the hair and the hood, BELOW the eye style, the
 * eyewear and the hat: a monkey can still wear Demon Eyes and a top hat.
 * Declared once per renderer by child / draw order, not per item.
 *
 * WHERE IT IS PICKED.  The creator's Skin tab, which takes the two-step shape
 * the Eyes tab took in v2.3.2643: the species in the option strip, the skin
 * colour in the row below it (live on 'none', which is the human).  Picking the
 * monkey moves a human skin tone to Monkey Brown; the player can then choose
 * any colour, fur colours included.
 */
export const SPECIES_CATALOG = [
  /* 'none' is the plain bro.  Named for what it is in this picker. */
  { id: 'none', name: 'Human' },
  { id: 'monkey', name: 'Monkey', skin: 'monkeybrown' },
];

/** The skin a species starts on when picked from a human skin tone. */
export function speciesDefaultSkin(id) {
  const e = SPECIES_CATALOG.find((s) => s.id === id);
  return (e && e.skin) || null;
}

/** TRUE once there is something to pick besides the human. */
export function speciesHasOptions() {
  return SPECIES_CATALOG.some((e) => e && e.id && e.id !== 'none');
}

const STORAGE_KEY = 'bt-species';
let _active = 'none';
try {
  const saved = typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY);
  /* Only restore an id the catalog still has (the v2.3.1495 rule). */
  if (saved && SPECIES_CATALOG.some((e) => e.id === saved)) _active = saved;
} catch (e) { /* localStorage unavailable (SSR / privacy mode) */ }

const _listeners = new Set();

/** Currently selected species id ('none' = human). */
export function getSpecies() { return _active; }

/** Set the active species and persist it.  An id the catalog does not carry is
 *  IGNORED rather than stored (the capeCatalog rule): this is the setter the
 *  stored character record and the resume snapshot feed. */
export function setSpecies(id) {
  if (id === _active) return;
  if (!SPECIES_CATALOG.some((e) => e.id === id)) return;
  _active = id;
  try { localStorage.setItem(STORAGE_KEY, id); } catch (e) { /* ignore */ }
  _listeners.forEach((fn) => { try { fn(id); } catch (e) { /* ignore */ } });
}

/** Subscribe to selection changes.  Returns an unsubscribe fn. */
export function onSpeciesChange(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

/* QA hook, same shape as __btSetEyeStyle. */
if (typeof window !== 'undefined') window.__btSetSpecies = setSpecies;
