/* ═══ v2.3.5345: THE TOWNSFOLK SYSTEM'S HAND-TUNED TABLES (grand plan step 5.5, card M) ═══
 *
 * The renderers' tables and tuned constants of the `townsfolk` system
 * (docs/plan/census/M-tables.md), moved here verbatim with the comment above
 * each: no imports, no logic, imported back by the same names.  A value here
 * is a pixel on screen: change it as you would have in the renderer.
 */

/* ── from entityRenderer.js (v2.3.5345) ── */

const NPC_TALK_PX = 28;

/* NPC art draw scale.  96 world px per frame is what this renderer treats as
   player scale (see the 96/128 baseScale at the harvest stand-in, commented
   exactly that).
   v2.3.1673 doubled this to 192 ("he needs to be twice as large");
   v2.3.1675 halves it back ("reduce his size by 50%") — so the mayor stood
   at the same height as the player again;
   v2.3.1681 adds a quarter on top ("Mayor bro is about 25% too small"), which
   is the owner eyeballing him against the buildings and the player rather
   than against the old placeholder circle.  120/256 = 96 x 1.25.  Everything
   positional below derives from this constant, so the quest marker and name
   follow the figure automatically rather than needing their own pass. */
const NPC_SPRITE_SCALE = 120 / 256;

/* The sprite frame's own geometry, in frame pixels: the figure's feet sit on
   y=223 and its top (hat) on y=23 — see the asset note in gameDisplay.js
   NPC_DATA.  Kept as named constants because three different offsets are
   derived from them, and a magic 223 in four places is how they drift. */
const NPC_FRAME_FEET_Y = 223;

const NPC_FRAME_TOP_Y = 23;

/* v2.3.2069: how far below the feet a name plate hangs, as a fraction of the
   figure's own height. 38/121.9 is Shopkeeper Bro's shipped placement -- the
   one the owner set by eye -- so he is unmoved by construction and every other
   plate is spaced like his. See the note at the namePlate branch. */
const NPC_PLATE_DROP_FRAC = 38 / 121.9;

/* ═══ v2.3.2046: WHICH WAY A WALKING NPC IS FACING ═══
 * Straight from his movement, in the eight names the strips are filed under.
 * Screen space, so +y is DOWN and therefore south -- getting that backwards is
 * the classic version of this bug and it looks like the figure walking
 * backwards up the street.
 * The diagonal band is deliberately wide (22.5 degrees either side of each
 * eighth): an NPC wandering to a point almost due south should read as south
 * rather than flickering between south and southeast on sub-pixel jitter. */
const NPC_DIRS_8 = ['east', 'southeast', 'south', 'southwest',
                    'west', 'northwest', 'north', 'northeast'];

/* World px of travel per walk frame. Distance-driven rather than time-driven
   so the feet match the speed: a time-driven cycle makes a slow NPC skate,
   which is the thing you notice without being able to say why. Tuned to the
   figure's own stride -- he is ~200px tall drawn at NPC scale, and a four
   frame cycle over ~26px reads as a step rather than a shuffle. */
const NPC_WALK_PX_PER_FRAME = 6.5;

/* v2.3.1681: the quest badge behind the '!' (owner: "thick white outline or
   something to be more attention grabbing").  Radius in world px — the label
   stack above the NPC's head is laid out from it, so changing this one number
   moves the name out of the way too. */
const QUEST_BADGE_R = 16;

export { NPC_TALK_PX, NPC_SPRITE_SCALE, NPC_FRAME_FEET_Y, NPC_FRAME_TOP_Y, NPC_PLATE_DROP_FRAC, NPC_DIRS_8, NPC_WALK_PX_PER_FRAME, QUEST_BADGE_R };
