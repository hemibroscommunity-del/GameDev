/* ═══ v2.3.5346: THE SKILLS SYSTEM'S HAND-TUNED TABLES (grand plan step 5.5, card M) ═══
 *
 * The renderers' tables and tuned constants of the `skills` system
 * (docs/plan/census/M-tables.md), moved here verbatim with the comment above
 * each: no imports, no logic, imported back by the same names.  A value here
 * is a pixel on screen: change it as you would have in the renderer.
 */

/* ── from effectsRenderer.js (v2.3.5346) ── */

const CHOP_INK_KEYS = ['tattooFace', 'tattoo', 'tattooArm'];

const COOK_URL = { body: '/sprites/skills/cook-strip.webp', legless: '/sprites/skills/cook-strip-legless.webp' };

/* The drawn body height the slung shield's 72px was measured against — the
   fallback entityRenderer publishes for S._swordBodyH.  The stand-in scales
   itself to the avatar's real per-facing height, so the shield divides by this
   to ride along instead of staying one fixed size while the figure changes. */
const STANDIN_REF_BODY_H = 84;

/* ═══ v2.3.2273: THE CHOPPER'S HEIGHT, IN ONE PLACE THIS TIME ═══
 *
 * Owner: "Woodcutting animation character is a bit too small increase by 10%."
 * 95 -> 104.5.  Previous tunes on this same number: 84 -> 112 (v2.3.1348,
 * +33%, owner), 112 -> 95 (v2.3.1476, -15%, owner).
 *
 * IT IS A CONSTANT NOW BECAUSE THE LITERAL EXISTED TWICE AND DRIFTED.  The
 * local chopper (_updateExtractionCue) and the one other players see
 * (_updateRemoteExtraction's SPEC table) each carried their own copy, and the
 * note beside the second one records what that cost: v2.3.1476 took the local
 * figure to 95 and did not touch the copy, so for ~230 versions every peer's
 * lumberjack rendered 18% larger than your own -- invisible to single-client
 * QA, which is why it survived that long.  The comment there asks the next
 * person to remember; a shared constant means they do not have to.
 *
 * Everything on the figure derives from this one number -- the body scale
 * (h/220), the gear-layer scale (h/<the layer texture's own height>) and the
 * head traits, which read |sprite.scale.y| -- so armour and hat keep their
 * proportions for free.
 * COOK_H and the firemaking FH are deliberately NOT folded in: the owner asked
 * for woodcutting only, and those two are already independent.
 *
 * ═══ v2.3.3146: 104.5 -> 136.8, THE WALKING FIGURE'S OWN SIZE ═══
 * The owner: "The character's appearance changes during resource gathering
 * activities.  It needs to stay consistent", then, offered "The lumberjack is
 * still drawn about 25% smaller than your walking character ... want me to
 * match him to your walking size?": "Yes fix all".
 *
 * Every tune above was by eye, and every one was made against a walking
 * figure that is drawn PLAYER_SIZE_MULT (1.25, entityRenderer, v2.3.1821) on
 * its CONTAINER -- a factor no stand-in carries, as it is drawn on the
 * effects layer.  Measured instead (the same rows the walking body is sized
 * by, entityRenderer BODY_ROWS / nominalStandFigure):
 *   - walking: crown to boots 105.7 world px in all five sheets (stand-south
 *     189 art px x 1.061 x 0.421875 x 1.25), the head 51 art px wide = 28.5;
 *   - the lumberjack upright (strip frames 17-23, the end of every swing):
 *     painted head top 49 to boots 218 = 170 of his 220, and his head 46 wide.
 *     At 104.5 that is 80.8 px tall -- 76% of you -- with a 21.9 px head.
 * 136.8 makes both match at once: 105.7 px tall and a 28.6 px head (100%
 * each), so the painting's own proportions agree with the walking body's.
 * (Upright figures are matched by HEIGHT -- this one and FIRE_STANDIN_H --
 * and the crouching cook by his head, COOK_STANDIN_H.)
 * Your hair, hat and beard follow (they read |sprite.scale.y|; the head-to-
 * head ratio _skillTraitMul.chop is unchanged), and so does the axe -- see
 * CHOP_OFFSET, which moves with it so the blade bites where it always did.
 * mp-gatherlook measures both heights on a phone. */
export const CHOP_STANDIN_H = 136.8;

/* ═══ v2.3.2607: THE COOK GROWS 5%, ON BOTH SCREENS ═══
 *
 * Owner: "Cooking animation about 5% too small."
 *
 * 62 -> 65.1.  WHAT THE NUMBER IS RELATIVE TO, because it is not a percentage
 * of anything obvious: it is the cook's DRAWN HEIGHT IN WORLD PIXELS, and the
 * scale that reaches the sprite is `h / 220` -- 220 being the cook strip's own
 * frame height (`cook-strip.webp`, 213x220 cells).  So this is 62/220 = 0.282
 * becoming 65.1/220 = 0.296, and every layer that copies the body's transform
 * (shirt, chest, legs, head traits) follows for free.
 *
 * v2.3.1710 set 62 by measurement rather than taste: the cook is a CROUCH, so
 * matching silhouettes made the figure wrong, and the head is what the eye
 * reads -- the cook's is 85 art px against the standing body's 51, which put
 * COOK_H 82 at 31.7px of head beside a 22.6px avatar.  62 landed it at 24.0px.
 * 65.1 puts it at 25.2px against that same 22.6px avatar: still the closest a
 * chunkier crouched painting gets, now 11% over instead of 6% under.  Nothing
 * clips -- the sprite is a downscale of a 220px cell either way, it is anchored
 * (0.5, 1) at the fire, and it grows upward into open ground.
 *
 * ── AND THIS IS WHY IT IS A SHARED CONSTANT NOW ──
 * There were TWO 62s.  This one, and a literal `h: 62` in the remote stand-in's
 * SPEC table, whose own comment carries the warning: chop drifted when
 * v2.3.1476 moved the local figure and not the copy, and for ~230 versions
 * every peer's lumberjack rendered 18% larger than your own -- invisible to
 * single-client QA, which is why it survived that long.  v2.3.2273 closed that
 * for chop by making both sites read CHOP_STANDIN_H; the same note then said
 * "cook and fire still carry literals and still carry this warning."
 *
 * A 5% bump written into the local site alone is EXACTLY that bug again: the
 * owner's own cook grows, every other player's stays where it was, and the one
 * client that could notice is the one that cannot see it.  So the two sites now
 * read one number, and the next resize cannot land on one figure only.
 *
 * ═══ v2.3.3146: 65.1 -> 73.9, YOUR HEAD'S SIZE ═══
 * The owner: "It needs to stay consistent" -- "Yes fix all".  The "22.6px
 * avatar" above is the walking head BEFORE v2.3.1821 drew the walking figure
 * PLAYER_SIZE_MULT (1.25) bigger on its container, which no stand-in carries:
 * the head the cook stands beside is 28.5 px now (51 art px x 1.061 x
 * 0.421875 x 1.25), so his 25.2 was 12% UNDER it, not 11% over -- which is
 * what the owner's "about 5% too small" was seeing.  He crouches, so it is
 * the head that is matched, as v2.3.1710 did: 85 art px x 73.9/220 = 28.6.
 * The pan follows (COOK_PAN_DX is a share of this). */
export const COOK_STANDIN_H = 73.9;

/* v2.3.3439: the garments each move ships, cut from the owner's dressed
   sheets -- the only shirt, plate and greaves art the game has, which every
   recolour (copper, iron...) resolves to (gearArtSafe), as at the cook */
const FARM_GEAR = [['shirt', 'tshirt'], ['chest', 'steelplate'], ['legs', 'steelgreaves']];

/* v2.3.3439: another player's farmer's sprites, in their layer order
   (_drawPeerFarmer): body, greaves, shirt, plate, tool */
const FARM_PEER_LAYERS = ['body', 'legs', 'shirt', 'chest', 'prop'];

/* The pan hangs to the cook's RIGHT and has to stay over the flames, so its
 * offset tracks the figure's height.  Held as a FRACTION of that height rather
 * than as pixels: v2.3.1429 and v2.3.1710 each had to remember to rescale an
 * 11px literal by hand (the second one wrote the arithmetic out --
 * `14 * 62/82 = 10.6`), and a constant that must be edited in step with another
 * constant is the same shape as the drift above.  11/62 is that literal
 * measured against the art it was tuned on. */
export const COOK_PAN_DX = 11 / 62;

/* v2.3.3146: 30 -> 44, with the lumberjack's size (CHOP_STANDIN_H 104.5 ->
   136.8).  He is scaled about his feet, so the axe reaches further: at the
   strike frame (21, CHOP_STRIKE_K) the blade's middle is 94.5 art px out from
   his anchor -- 45 px at the old size, 59 at the new -- and standing 14 px
   further off keeps it biting the trunk exactly where it always did. */
export const CHOP_OFFSET = 44;   /* px from the trunk to the figure's centre */

const GEAR_STRIP_TWIN = { chop: { suffix: '-220', frames: 12 } };

/* the cook's shirt is one garment, pinned (COOK_SHIRT_FRAME): only it is baked */
const DRESSED_ONE_FRAME = { cook: 22 };

/* ═══ v2.3.3146: THE FIRE-LIGHTER'S HEIGHT, ONE NUMBER, YOUR SIZE ═══
   The owner: "It needs to stay consistent" -- "Yes fix all".  The figure's
   drawn height for its 512 px cell was a literal 154 in two places (your own
   figure, and the SPEC row other players' are drawn from) -- the shape of the
   chop drift CHOP_STANDIN_H's note tells.  One shared number now, and that
   number is your size, matched as the lumberjack is, by HEIGHT (he stands at
   the start): his standing frame 0, head top 28 to his boots (FIRE_FEET_ROW
   408), is 381 art px -- 114.6 world px at 154 against your 105.7 (8% over),
   105.7 at 142.  His head, 104 art px at its widest against the walking
   head's 51 (28.5 world px: 51 x 1.061 x 0.421875 x 1.25), comes to 28.8.
   The campfire's pixel grid (campfireFx PIX) was matched to this strip only
   roughly (2.4 against its 2.53) and stays. */
export const FIRE_STANDIN_H = 142;

/* ═══ v2.3.2846: THE FIRE-LIGHTER STOOD 77 PX IN THE AIR ═══
   Found filming the new campfire: the moment you tap "Light fire" your figure
   jumps up by about its own height's worth of ground and drops back when the
   strip ends.  The strip was planted with its FRAME BOTTOM at your position +6
   ("the foot offset"), on the belief that your position is your feet.  It is
   your hips: the walking body is frame-centred and its boots are drawn
   standFootDy() below it (52 px on a flat zone).  And the strip's own boots are
   not at its frame bottom either -- the owner's 384x512 cells carry the log and
   its shadow beneath them.  The sword and bow stand-ins had this exact bug and
   were fixed by planting on the body's measured feet (S._swordFootY,
   entityRenderer); the fire-lighter, local and remote, never was.
   FIRE_FEET_ROW is the boots' soles in the standing frame 0, measured on
   firemaking-strip.webp (row 408 of 512).  The figure is planted so that row
   lands on your boots. */
const FIRE_FEET_ROW = 408;

/* ═══ v2.3.3660: THE FIRE-LIGHTER'S LOG IS WOOD ═══
   The owner, 2026-10-27: "check all the animations for ghost remnants ... or
   areas for cleanup".  mp-ghostaudit's fire-lighter lit his fire on a hot pink
   log.  firemaking-strip.webp holds the pipeline's magenta KEY for the log, as
   the lumberjack's axe and the angler's rod do, and v2.3.2761 gave those two
   their materials but left the log ("firemaking is being rebuilt as code-drawn
   fire in another session", toolRecolor.js's header).  That rebuild drew the
   campfire that burns AFTER the light; the strip kept its log, so every player
   lit every fire on a magenta log, in all eight frames (about 10,000 px of each
   384 x 512 frame).  It is TOOL_SPECS.log's bark now, each pixel placed on the
   material's ramp by its brightness, so the painted shading stays.
   AFTER the skin and clothes, and only where the FILE has the key (toolRecolor's
   `onlyMask`, the rod's lesson, v2.3.2854): the key test is a hue window, and
   the trousers the clothes bake paints can sit in it -- pink (214,112,168) is
   hue 327 at saturation 0.48.  The key lies in rows 356-464 of every frame
   (measured over all eight), so only a band round them is read.  `?firelog=0`
   keeps the magenta, for a test's before; `window.__btFireLog()` says how many
   pixels the last bake made wood. */
const FIRE_LOG_BAND = [340, 480];

const FIRE_GEAR_REG = {
  shirt: {
    scale: 0.85,
    off: [[48, -89], [8, -50], [20, -47], [55, -64], [67, -50], [56, -52], [57, -56], [46, -103]],
  },
  chest: {
    scale: 0.90,
    off: [[39, -79], [18, 27], [42, 13], [35, 23], [84, 11], [75, 10], [59, 9], [42, -69]],
  },
  /* v2.3.3669: frames 3-7 re-aligned (frames 0-2 as fitted): see "THE GREAVES
     ALIGNED" in the header above */
  legs: {
    scale: 0.90,
    off: [[28, -7], [23, 8], [89, 48], [43, 4], [54, 15], [51, 13], [35, 8], [43, 6]],   /* v2.3.3684: frame 6 under the plate, 20 left and 4 up (FIRE_LEGLESS_OFF's header) */
  },
};

/* Target render heights in world px at tierStep 1, scaled up with tier.
   v2.3.1275: +50% (was tree 112 / fishSpot 88 / oreVein 88) — owner's
   size experiment scales resources with the 50%-bigger monsters.  The
   ore-break animation derives from these too (_spawnOreBreak). */
const NODE_SPRITE_HEIGHT_BASE = { tree: 168, fishSpot: 132 };   /* v2.3.3345: a tree's and a rock's are their own pictures' */

const NODE_SPRITE_ANCHOR_Y = { tree: 1.0, fishSpot: 0.5, oreVein: 1.0 };

/* ═══ v2.3.2748: WHERE THE ART MEETS THE GROUND, as a fraction of the frame ═══
   The sprites are anchored at their FRAME's bottom (node.y), and the frames
   have transparent margin below the art: the pine's lowest solid row is at
   0.839 of its frame, the ore's at 0.737 (measured off the webp's alpha, and
   the same numbers BroTown's NODE_ART collision boxes were cut from).  So the
   trunk a player walks up to is ~27 world px NORTH of node.y on a tier-1
   tree, and sorting on node.y put the canopy over anyone standing in the
   gap -- in front of the trunk, drawn behind it.  The depth pass reads
   `_groundDy` to lift the tree's line up to its drawn base.
   v2.3.3345: a tree's base is its own picture's (game/tierTrees.js: the foot
   stands TREE_FOOT_DY, 27, north of node.y, where this 0.839 put it at tier
   1), and so is a rock's (game/tierOre.js oreGeom) -- nothing is a fraction
   here any more. */
const NODE_ART_BASE = {};

/* v2.3.3345: a tree's `f` is gone -- its crown's top is its own picture's
   (game/tierTrees.js treeGeom), only the gap is here; and a rock's, whose
   base is its own picture's (game/tierOre.js oreGeom) */
const NODE_HPBAR_AT = {
  tree:     { gap: 4 },
  oreVein:  { gap: 10, under: true },
  fishSpot: { f: 0.349, gap: 4 },
};

/* v2.3.3040: the TOP of each resource's art, as a fraction of its frame, for
   the label over it (_nodeLabelAt): the crown and the pond's water as above,
   and the rock's top (alpha >50% off ore-vein-627; the iron and black steel
   veins' 418 px art has its proportions, 93/418).  v2.3.3345: a tree's is its
   own picture's top (treeGeom), and a rock's (oreGeom). */
const NODE_LABEL_TOP = { fishSpot: 0.349 };

const CAMPFIRE_HPBAR_GAP = 14;

const NODE_TIER_TINT = {};

/* Where it stands, in the smith effect's own units (x SMITH_SCALE = world px,
   around the point SMITH_ANVIL_DX/DY from the player): its base's middle and
   foot where the old drawn block stood, over the rock painted under the
   mining pose's boots, and wide enough to hide it (~73 world px); the face the
   hot bar lies on and the sparks fly from, the top of the painted face. */
const SMITH_ANVIL_W = 52;

const SMITH_ANVIL_X = -4;

const SMITH_ANVIL_FOOT = 17;

const SMITH_FACE_Y = -17;

export { CHOP_INK_KEYS, COOK_URL, STANDIN_REF_BODY_H, FARM_GEAR, FARM_PEER_LAYERS, GEAR_STRIP_TWIN, DRESSED_ONE_FRAME, FIRE_FEET_ROW, FIRE_LOG_BAND, FIRE_GEAR_REG, NODE_SPRITE_HEIGHT_BASE, NODE_SPRITE_ANCHOR_Y, NODE_ART_BASE, NODE_HPBAR_AT, NODE_LABEL_TOP, CAMPFIRE_HPBAR_GAP, NODE_TIER_TINT, SMITH_ANVIL_W, SMITH_ANVIL_X, SMITH_ANVIL_FOOT, SMITH_FACE_Y };
