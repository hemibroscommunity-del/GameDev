/* ═══ v2.3.2682: SPECIES — THE MONKEY, AS A HEAD TRAIT ═══
 *
 * Owner: "What's the feasibility of adding new species to play as?  I'm
 * wanting to add alien and monkey" ... "Push to main!  Make sure it's
 * available in trait picker."
 *
 * WHAT A SPECIES IS, MECHANICALLY.  Not a new body rig -- the same bro, with
 * (a) a skin colour from SKIN_CATALOG (Monkey Brown and the v2.3.2681 fur
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
 *     recolour -- they stay the art's tan on every skin (owner, v2.3.2681).
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
 *   v2.3.3589: ITS OWN TAB, "Species" (owner: "Yes make species it's own
 * button").  The Skin tab is the skin tones and the tattoo again, as it was
 * before v2.3.2682; picking a species still moves the skin to its preset
 * (NameModal.jsx, the `species` def).
 */
export const SPECIES_CATALOG = [
  /* 'none' is the plain bro.  Named for what it is in this picker. */
  { id: 'none', name: 'Human' },
  { id: 'monkey', name: 'Monkey', skin: 'monkeybrown' },
  /* ═══ v2.3.3589: THE ALIEN ═══
     Owner: "I also wanted to add the alien as another species you could play
     as in character creator.  It also exists in collection art", then "Yes
     make species it's own button.  And add alien."
     Three things make it, all made by tools/species_alien.py from art already
     in the repo, nothing new drawn by hand:
       - its EARS, the species piece (public/sprites/traits/species/alien/):
         the monkey's ears re-shaped into points where they sit, so the 196
         frames the monkey was fitted to fit it too, their inside skin that
         takes the player's skin, and no muzzle (`muzzle: false` in its
         meta.json, which species_frames.py reads);
       - its SKIN, Alien Cyan (playerSkins.js, measured off the owner's alien
         in v2.3.2665 and waiting for this ever since), the preset below;
       - its EYES, the eye style 'alien' (eyeStyleCatalog.js): two black
         almonds, preset by `eyes` below.  An eye style rather than a part of
         this piece, so the Eyes tab's colour row paints them like any style's
         and the body bake's erase of the real eyes is the one already built. */
  { id: 'alien', name: 'Alien', skin: 'aliencyan', eyes: 'alien' },
];

/** The skin a species starts on when picked from a human skin tone. */
export function speciesDefaultSkin(id) {
  const e = SPECIES_CATALOG.find((s) => s.id === id);
  return (e && e.skin) || null;
}

/** v2.3.3589: the eye style a species starts on when picked with the bro's own
 *  eyes ('none'), or null when it keeps them (the human, the monkey). */
export function speciesDefaultEyes(id) {
  const e = SPECIES_CATALOG.find((s) => s.id === id);
  return (e && e.eyes) || null;
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
