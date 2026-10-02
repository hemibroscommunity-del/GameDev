/* ═══ v2.3.2967: WHAT EACH GROUND SOUNDS LIKE UNDERFOOT ═══
 *
 * Owner, 2026-10-01: "I also want to give each ground type its own footstep
 * sound.  Grass sounds like walking through grass, walking through rocks
 * sounds like walking through rocks etc." -- the list of twelve sounds was
 * agreed in docs/WORLD-MAP-PIPELINE.md ("Footstep sounds, one per kind of
 * ground"), and the owner sent recordings for them; tools/audio/
 * cut_footsteps.py made each into a clip of single steps.
 *
 * The sound of every swatch, by its id.  The ground worker
 * (ground-worker.js) gives each catalog entry its sound in its first answer,
 * and the game plays it at every foot plant on that ground
 * (BT_AUDIO.footstep in src/data/gameDisplay.js).  Which clip plays for
 * each sound is src/data/footstepClips.js (made by the tool): the forest
 * floor, still without a recording, plays grass there; anything unknown
 * plays dirt, today's step.
 *
 * Pure: no page.  tools/world/test-world-core.mjs checks that every swatch
 * of the plan has a sound here.
 */

/* The twelve, in the owner's order.  Dirt is today's footstep-v3. */
export const STEP_SOUNDS = ['grass', 'dirt', 'gravel', 'stone', 'sand', 'snow', 'ice', 'mud', 'forest', 'ash', 'wood', 'metal'];

const BY_SOUND = {
  grass: ['commons', 'ember-1', 'mist-1', 'verdant-1', 'border-mist-verdant', 'border-frost-verdant'],
  dirt: ['town-yard', 'street', 'road', 'sky-1', 'thunder-1', 'border-hollows-thunder'],
  gravel: ['plaza', 'gravel', 'hollows-1', 'tidal-4', 'border-hollows-sky'],
  stone: ['ember-3', 'ember-4', 'sky-3', 'sky-4', 'hollows-2', 'hollows-3', 'hollows-4', 'tidal-3'],
  sand: ['sky-2', 'tidal-1', 'tidal-2', 'border-thunder-tidal'],
  snow: ['frost-1', 'frost-2', 'frost-4'],
  ice: ['frost-3'],
  mud: ['mist-2', 'mist-3', 'border-ember-frost', 'border-mist-tidal'],
  forest: ['mist-4', 'verdant-2', 'verdant-3', 'verdant-4'],
  ash: ['ember-2', 'border-ember-sky'],
  /* every boardwalk, and every bridge's plank deck (ground.js PLANK DECKS) */
  wood: ['boardwalk'],
  metal: ['thunder-2', 'thunder-3', 'thunder-4'],
};

/* Not walked on: lava, and the sea and the rivers (the walk grid stops you). */
export const NO_STEP = ['lava', 'water'];

const SOUND_OF = new Map();
for (const s of Object.keys(BY_SOUND)) for (const id of BY_SOUND[s]) SOUND_OF.set(id, s);

/* The sound of a swatch, or null where nobody walks (lava, water) or for an
   id this table does not know (the game then plays dirt). */
export function stepOf(id) {
  return SOUND_OF.get(id) || null;
}

/* Every swatch id with a sound, for the tests. */
export function steppedIds() {
  return [...SOUND_OF.keys()];
}
