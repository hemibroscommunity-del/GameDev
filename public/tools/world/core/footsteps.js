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
/* v2.3.2968: their names, as the Ground Studio's cards show them */
export const STEP_LABELS = {
  grass: 'Grass', dirt: 'Dirt', gravel: 'Gravel', stone: 'Stone', sand: 'Sand', snow: 'Snow',
  ice: 'Ice', mud: 'Mud', forest: 'Forest floor', ash: 'Ash', wood: 'Wood', metal: 'Metal',
};

/* v2.3.2969: BY WHAT THE OWNER'S PICTURES SHOW.  The first table went by the
   plan's words (plan.js), and four grounds came out drawn as something else
   -- owner, 2026-10-02: "What is 'ash' used for?  I don't recall seeing any
   ground type of primarily ash".  So, by the pictures in public/world/ground/:
   the ash plains (ember-2) are cracked dark rock over red dust, and the
   steam fields where the flame meets the frost (border-ember-frost) wet black
   rock with snow -- both stone; where the flame meets the dunes
   (border-ember-sky) is orange sand with stones -- sand; and the slime woods
   (mist-2) a floor of moss, leaves and roots -- forest.  Mud keeps the
   mangrove marsh (mist-3, dark mud and roots) and the salt marsh where the
   venom meets the sea (border-mist-tidal).  No picture is ash, so no ground
   plays it; it stays one of the twelve, for the Ground Studio's menu. */
const BY_SOUND = {
  grass: ['commons', 'ember-1', 'mist-1', 'verdant-1', 'border-mist-verdant', 'border-frost-verdant'],
  dirt: ['town-yard', 'street', 'road', 'sky-1', 'thunder-1', 'border-hollows-thunder'],
  gravel: ['plaza', 'gravel', 'hollows-1', 'tidal-4', 'border-hollows-sky'],
  stone: ['ember-2', 'ember-3', 'ember-4', 'sky-3', 'sky-4', 'hollows-2', 'hollows-3', 'hollows-4', 'tidal-3', 'border-ember-frost'],
  sand: ['sky-2', 'tidal-1', 'tidal-2', 'border-thunder-tidal', 'border-ember-sky'],
  snow: ['frost-1', 'frost-2', 'frost-4'],
  ice: ['frost-3'],
  mud: ['mist-3', 'border-mist-tidal'],
  forest: ['mist-2', 'mist-4', 'verdant-2', 'verdant-3', 'verdant-4'],
  ash: [],
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

/* ═══ v2.3.2968: THE OWNER'S OWN CHOICES ═══
 * Owner, 2026-10-02: "Yes make each grounds sound with play button idea" --
 * each card in the Ground Studio says its ground's sound, plays it, and lets
 * it be changed.  A change is kept with the studio's swatches (its 'misc'
 * store, key 'steps') and goes into "Download for the game" as the
 * manifest's `steps`; the game's ground worker plays, for a swatch, the
 * studio's choice on this site, else the game copy's, else the table above.
 * Only the swatches whose sound was CHANGED are kept: { id: sound }.
 *
 * `cleanSteps` keeps only what is real -- a swatch the plan has and a sound
 * of the twelve -- from storage or a zip, so nothing odd ever reaches the
 * game; keyed with no prototype, as anything read in must be. */
export function cleanSteps(obj, isSwatch) {
  const out = Object.create(null);
  if (!obj || typeof obj !== 'object') return out;
  for (const id of Object.keys(obj)) {
    const s = obj[id];
    if (typeof s === 'string' && STEP_SOUNDS.includes(s) && isSwatch(id) && s !== stepOf(id)) out[id] = s;
  }
  return out;
}
