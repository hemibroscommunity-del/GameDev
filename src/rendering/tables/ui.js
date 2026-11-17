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

/* HP ring widget (v2.3.458): replaces the above-head heart.  A quartile-
   colored progress arc drains clockwise from 12 o'clock; four ~1.5px gaps
   slice it into quadrants that land exactly on the 25/50/75% color
   thresholds, so the arc flips color as it recedes past each gap.  Muted-
   gray center holds the large current HP over a small muted max.  (A thin
   ring *around* the heart was tried in v2.3.249 and reverted; this is the
   full replacement widget.) */
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

/**
 * Manages all entity rendering.
 */
/* ═══ v2.3.1895: THE SPEND BARS UNDER THE CHARACTER ═══
 * Owner: "Instead of the special attack counter I want to see what it looks
 * like to have the mp bar below the character (name plate will disappear when
 * mp is used).  The amount of mp used will slide right.  The resource bar will
 * begin fading after 1 second and disappear after 2 seconds if no further mp
 * is used.  Do the same thing for energy but beneath the mp bar.  Reserve the
 * space for whenever mp and energy is used (they stay in those positions)."
 *
 * Geometry is FIXED, not laid out: MP always draws at RES_MP_Y and energy at
 * RES_EN_Y whether or not the other is up.  That is the "reserve the space"
 * requirement, and it is why these are two independent draws rather than a
 * stack — a stack would slide the energy bar upward on the frames where MP is
 * hidden, which is the jitter the request rules out.
 *
 * The bars sit where the NAME PLATE sits, so the plate hides while either is
 * up.  Both therefore share one visibility answer rather than each hiding the
 * plate on its own, or the plate would flicker back between two spends.
 *
 * THE SLIDING CHUNK.  On a spend, the segment between the new fill edge and
 * the old one is kept and animated RIGHT while fading, so the amount that just
 * left is legible as a quantity rather than as a jump.  It is measured from
 * the CURRENT edge every frame rather than from a cached x, so a second spend
 * mid-slide re-bases it instead of leaving two ghosts disagreeing about where
 * the edge is.
 */
/* v2.3.1896 (owner: "thick white border ... black fill when it's spent ...
   large enough so that you can fit the numbers on each bar").  The bar grew
   from 46x4 to 66x14 to hold an 8px readout: 14 less two 2px borders leaves
   10px of interior, and 8px of text centred in 10 is the smallest that stays
   legible at this scale.  The width follows so "118 / 118" is not cramped
   against the ends. */
/* v2.3.1896c: 66x14 -> 72x16, and the readout 8px -> 10 bold (owner: "space
   to make the numbers bolder and larger").  16 less two 2px borders leaves
   12px of interior, which is what 10px text needs to sit centred without
   crowding the keyline; the width follows so "118 / 118" keeps its air. */
const RES_BAR_W = 72;

const RES_BAR_H = 16;

/* v2.3.1896c: 40 -> 52 (owner: "move the bars down a notch so they don't cover
   the player's feet").  Not guessed — blockGeomProbe puts the boots at y 41.6
   in this same display-local space, and the bar was starting at 40 with a 2px
   border above that, so it genuinely overlapped them.  52 clears the feet by
   ~8px.  The plate still has to hide: it sits at 38 and stands ~29 tall, so it
   would reach into the bars wherever they start below it. */
const RES_MP_Y = 52;

/* v2.3.1896b: the gap has to clear BOTH borders, not just the bar.  At
   +3 the MP border's bottom edge (y + H + BORDER) landed 1px BELOW the
   energy border's top (y - BORDER) and the two rounded outlines merged into
   one lozenge — visible the moment they were photographed together.  Bar +
   two borders + 3px of real air. */
/* v2.3.1896c: derived from RES_MP_Y, not from a repeated literal.  It said
   `40 + ...` while MP moved to 52, so the energy bar climbed INTO the MP bar
   and clipped its readout — caught in the screenshot, not by the suite, which
   only asserts enY > mpY and was still true.  Deriving it makes the two
   impossible to separate again. */
/* v2.3.2300: the block sheet's own aspect. His frames are 273x98, so a bar
   drawn 76 wide is 27 tall -- taller than the 20 the old bar plus its keyline
   occupied, which is why RES_EN_Y is re-derived below rather than left at a
   number tuned for the old one. 76 keeps the width the owner has been looking
   at since v2.3.1896c; the height follows the art rather than being squashed
   into the old slot, because five blocks squeezed to 16px stop reading as five
   things. */
const RES_BLOCK_W = 76;

const RES_FILL = { mana: 0x5B99DE, stamina: 0xD8A85F };

const RES_GHOST = { mana: 0x9CC8F2, stamina: 0xF0D9A6 };

const RES_GHOST_HEX = { mana: '#9CC8F2', stamina: '#F0D9A6' };

/* v2.3.1897: the spent amount, as a number, gliding off the bar's right end
   (owner: "I want the resource number spent to glide to the right of the
   resource bar (as a negative number)").  The ghost chunk stays — it is the
   MASS that leaves — and this is the same gesture continued past the bar's
   edge with a figure on it, so you can read HOW MUCH left rather than
   estimate it from a sliver.

   v2.3.1898 (owner: "I saw the number appear but not gliding.  I want the
   numbers to slowly move right then fade", and "the glide numbers need to
   match the same timing as the resource bars for appearing and fading"):
   it used to ride the CHUNK's clock — 13px over RES_SLIDE_MS.  420ms is
   under a third of a second of travel across thirteen pixels, which lands
   before the eye gets there: you see a number appear, already parked.  It now
   drifts across the bar's WHOLE life instead, 26px over the full hold+fade,
   so it is still moving while it fades out.  Tying it to RES_HOLD_MS +
   RES_FADE_MS rather than a duration of its own is what makes "match the
   bar's timing" true by construction — one clock, so the two cannot drift
   apart when someone retunes the fade. */
const RES_SPENT_GAP = 6;       /* clear of the white keyline before it starts */

export { THREAT_SKULL_PX, HPBAR_ASPECT, HPBAR_IN_X, HPBAR_IN_W, HPBAR_IN_Y, HPBAR_IN_H, PEER_HPBAR_Y, MONSTER_HPBAR_W, PLAYER_HPBAR_W, PLAYER_HEART_SIZE, MONSTER_HEART_SIZE, HP_RING_OUTER_R, HP_RING_GAP_PX, PLATE_BORDER_PX, PLATE_LEVEL_STROKE_PX, PLATE_H_RATIO, PLATE_PAD_L_RATIO, PLATE_GAP_RATIO, PLATE_PAD_R_RATIO, PLATE_BADGE_TYPE_RATIO, RES_BAR_W, RES_BAR_H, RES_MP_Y, RES_BLOCK_W, RES_FILL, RES_GHOST, RES_GHOST_HEX, RES_SPENT_GAP };
