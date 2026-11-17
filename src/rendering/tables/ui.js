/* ═══ v2.3.5345: THE UI SYSTEM'S HAND-TUNED TABLES (grand plan step 5.5, card M) ═══
 *
 * The renderers' tables and tuned constants of the `ui` system
 * (docs/plan/census/M-tables.md), moved here verbatim with the comment above
 * each: no imports, no logic, imported back by the same names.  A value here
 * is a pixel on screen: change it as you would have in the renderer.
 */

/* ── from entityRenderer.js (v2.3.5345) ── */

/* v2.3.3279: the owner's skull and talk bubble (data/smallIcons.js), in world
   px: the skull a little over the 💀 emoji's 18 px font, as its picture keeps a
   margin; the bubble smaller than the quest badge (QUEST_BADGE_R x 2) whose
   place it takes while the townsperson has no quest for you */
const THREAT_SKULL_PX = 24;

/* v2.3.1273: shared geometry for the owner's bar art.  The red fill
   occupies an inset region of the sprite box (measured on the sheet):
   x 5%..95%, y 21%..79% — ghost/flash rectangles use these fractions. */
const HPBAR_ASPECT = 104 / 363;

const HPBAR_IN_X = 0.05, HPBAR_IN_W = 0.90, HPBAR_IN_Y = 0.21, HPBAR_IN_H = 0.58;

/* v2.3.1917: the peer bar rides ABOVE the name plate (which sits at
   y = -34), and holds for a few seconds after the last reported hit so it
   does not strobe between exchanges — long enough to cover a missed swing
   or a dodge, short enough that a peer who walked away loses it. */
const PEER_HPBAR_Y = -48;

const MONSTER_HPBAR_W = 44;

const PLAYER_HPBAR_W = 76;

const PLAYER_HEART_SIZE = 40;

const MONSTER_HEART_SIZE = 40;

const HP_RING_OUTER_R = 24;

const HP_RING_GAP_PX = 1.5;

/* The border's width, unchanged at 2.  §5.2 states 2 px and the owner
   confirmed the four bands against that number (D16), so this round takes its
   softening from the alpha above and leaves the width alone -- a thinner ring
   costs band information twice over (less colour AND fewer pixels to judge it
   by).  It lives here so it is visible as a knob, not so it gets pulled. */
const PLATE_BORDER_PX = 2;

const PLATE_LEVEL_STROKE_PX = 2;

/* Geometry, as ratios of the name's type size so the whole plate scales from
   one number (the same "the plate sizes itself off this number" property the
   old pill had, which is what kept text from rattling in a fixed box). */
/* ═══ v2.3.2590: "SMALLER OVERALL" IS TAKEN OUT OF THE CHROME, NOT THE TYPE ═══
   Owner: "The name plates are also a bit too large and distracting."

   The ratios below are the plate's PADDING and HEIGHT, i.e. the empty space
   the capsule wraps around the words.  They come down; the type does not.
   That ordering is the owner's own stated preference from the last time they
   asked for a shrink -- "still keeping the text largeness mostly intact" --
   and it is the right order on its own merits: the words are the content and
   the capsule is the wrapper, so the wrapper gives first.

   At the 15 CSS px the plate is designed at, and read off the renderer rather
   than estimated:
       height        27 -> 23 px   (1.80x the type -> 1.55x; mp-monsterplate
                                    asserts the ratio, not the pixel count)
       side padding  24 -> 18 px   (padL + gap + padR, so every plate is
                                    exactly 6 px narrower whatever its name is)

   The WIDTH moves least, and it is worth saying why rather than letting the
   next person re-derive it: most of a plate's width is the NAME, which this
   round does not touch.  So chrome alone cannot make the plate dramatically
   narrower -- past this point the only lever left is the type size, and the
   owner has twice asked for the text to stay ("still keeping the text
   largeness mostly intact"), so that is their call to make and not a thing to
   do quietly on their behalf.

   PLATE_BORDER_PX is deliberately NOT in this list: the knob block above
   records that a thinner ring costs band information twice over (less colour
   AND fewer pixels to judge it by), and a plate that is smaller everywhere
   except its ring is the one shape where 2 px is doing MORE work, not less. */
const PLATE_H_RATIO = 1.55;     /* was 1.8 (26.7 / 14.3 measured off the mock) */

const PLATE_PAD_L_RATIO = 0.5;  /* was 0.7 */

const PLATE_GAP_RATIO = 0.42;   /* was 0.55 */

const PLATE_PAD_R_RATIO = 0.25; /* was 0.3 */

const PLATE_BADGE_TYPE_RATIO = 0.85;

const RES_BAR_W = 72;

const RES_BAR_H = 16;

/* v2.3.1896c: 40 -> 52 (owner: "move the bars down a notch so they don't cover
   the player's feet").  Not guessed — blockGeomProbe puts the boots at y 41.6
   in this same display-local space, and the bar was starting at 40 with a 2px
   border above that, so it genuinely overlapped them.  52 clears the feet by
   ~8px.  The plate still has to hide: it sits at 38 and stands ~29 tall, so it
   would reach into the bars wherever they start below it. */
const RES_MP_Y = 52;

const RES_BLOCK_W = 76;

const RES_FILL = { mana: 0x5B99DE, stamina: 0xD8A85F };

const RES_GHOST = { mana: 0x9CC8F2, stamina: 0xF0D9A6 };

const RES_GHOST_HEX = { mana: '#9CC8F2', stamina: '#F0D9A6' };

const RES_SPENT_GAP = 6;       /* clear of the white keyline before it starts */

export { THREAT_SKULL_PX, HPBAR_ASPECT, HPBAR_IN_X, HPBAR_IN_W, HPBAR_IN_Y, HPBAR_IN_H, PEER_HPBAR_Y, MONSTER_HPBAR_W, PLAYER_HPBAR_W, PLAYER_HEART_SIZE, MONSTER_HEART_SIZE, HP_RING_OUTER_R, HP_RING_GAP_PX, PLATE_BORDER_PX, PLATE_LEVEL_STROKE_PX, PLATE_H_RATIO, PLATE_PAD_L_RATIO, PLATE_GAP_RATIO, PLATE_PAD_R_RATIO, PLATE_BADGE_TYPE_RATIO, RES_BAR_W, RES_BAR_H, RES_MP_Y, RES_BLOCK_W, RES_FILL, RES_GHOST, RES_GHOST_HEX, RES_SPENT_GAP };
