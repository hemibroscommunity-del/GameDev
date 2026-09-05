/**
 * Entity Renderer — renders player, monsters, other players, NPCs, and pets.
 * Uses PixiJS Graphics for procedural shapes (matching the original Canvas 2D look).
 */
import { Assets, ColorMatrixFilter, Container, Graphics, Rectangle, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import { getNpcTexture, getNpcWalkFrame, hasNpcWalk, getPropFrame, propFrameCount } from '../npcSprites.js'; /* v2.3.1672: NPC figure art; v2.3.2046: walking NPCs; v2.3.2061: animated props */
import { propsForZone, propFootprint } from '../../data/worldProps.js'; /* v2.3.1775: scenery; v2.3.1794: + footprint for the props probe */
import { TILE } from '@/data/constants.js';
import { ZONES, zonePlayerScale } from '@/data/zones.js';
import { ELEMENTS } from '@/data/elements.js';
import { rpgBlocks } from '@/data/abilities.js'; /* v2.3.2302: the block ladder */
/* v2.3.1183: status-id -> element lookup, built once at import time.
   _updateMonsters used to run Object.values(ELEMENTS).find(...) per
   status per monster per FRAME -- an array + closure allocation and a
   linear scan on the 60fps hot path whenever any DoT was ticking. */
const STATUS_TO_ELEMENT = new Map();
for (const el of Object.values(ELEMENTS || {})) {
  if (el && el.status) STATUS_TO_ELEMENT.set(el.status, el);
}
import { lookupCollision, PVP_THREAT_CONSENT_MS } from '@/data/gameSystems.js';
import { getFrame, resolveDirection, cycleMs, hasPose, frameCount as playerFrameCount, dodgeSheetDir } from '../playerSprites.js';
import { getShieldFrame } from '../shieldSprites.js';
import { backShieldPlacement, applyBackShield, BACK_SHIELD_PX, HELD_SHIELD_PX } from '../backShield.js'; /* v2.3.1784; HELD_ v2.3.1798 */
import { STUN_STARS, STUN_SPIN_MS, BLOCK_BARS, BLOCK_GEOM, blocksFor } from '../fxStrips.js'; /* v2.3.1735: the owner's stun ring; v2.3.2300: his 5-block resource strips */
import { jogWaistRow } from '../jogWaist.js'; /* v2.3.1341: stable waist band */
import { getFrame as getSlimeBaseFrame, hasState as hasSlimeState, frameCount as slimeFrameCount, SLIME_BASE_ROW, SLIME_FRAME_PX } from '../slimeSprites.js';
import { getRecoloredFrame, hasRecoloredState } from '../monsterRecolor.js'; /* v2.3.1534; v2.3.1573 generalised */

/* v2.3.1534: one place that decides whether a slime draws from the shared
   sheet or from its variant's RECOLOURED copy.  A variant with `recolor` gets
   the retinted texture and NO tint -- the pixels are already the right colour,
   and multiplying them again by the fallback green would undo it.  Until the
   recolour has finished building (or if it failed), both fall back to exactly
   what shipped before: base sheet + multiplicative tint. */
function getSlimeFrame(state, frameIdx, variant) {
  if (variant && variant.recolor && hasRecoloredState(variant, state)) {
    const t = getRecoloredFrame(variant, state, frameIdx);
    if (t) return t;
  }
  return getSlimeBaseFrame(state, frameIdx);
}
function slimeTintFor(variant, state) {
  if (variant && variant.recolor && hasRecoloredState(variant, state)) return 0xffffff;
  return (variant && variant.tint) || 0xffffff;
}
import { getFrame as getSnowmanFrame, hasFrames as hasSnowmanFrames, frameCount as snowmanFrameCount, getHitFrame as getSnowmanHitFrame, hitFrameCount as snowmanHitFrameCount, getDeathFrame as getSnowmanDeathFrame, deathFrameCount as snowmanDeathFrameCount,
  getAttackFrame as getSnowmanAttackFrame, attackFrameCount as snowmanAttackFrameCount, /* v2.3.2215 */
  attackReleaseFrame as snowmanAttackReleaseFrame, /* v2.3.2216 */
  throwMuzzle as snowmanThrowMuzzle, /* v2.3.2217 */
  getPhaseFrame as getSnowmanPhaseFrame, phaseFrameCount as snowmanPhaseFrameCount /* v2.3.2221 */
} from '../snowmanSprites.js';
import { variantSpritesFor } from '../monsterVariantSprites.js';
import { MONSTER_VARIANTS, maybeTransformMonster } from '../../data/monsterVariants.js';
import { getDeathFrame as getPlayerDeathFrame, hasDeathSprites as hasPlayerDeathSprites, frameForElapsed as playerDeathFrameForElapsed } from '../playerDeathSprites.js';
import { getWeaponTexture, hasWeapon } from '../weaponSprites.js';
import { getAnchor, getJogForwardHand, getWeaponHandle, getHeadAnchor } from '../playerAnchors.js';
import { getNftTextures } from '../nftAvatars.js';
import { getHeadwear, HEADWEAR_CATALOG, headwearUnderHair, headwearBehindBeard } from '../traits/headwearCatalog.js'; /* v2.3.1764: hair over headphones; v2.3.1934: beard over a drape */
import { getFacialHair, FACIALHAIR_CATALOG } from '../traits/facialHairCatalog.js';
import { getHair, HAIR_CATALOG } from '../traits/hairCatalog.js';
import { getSkin, getPants, getShoes, getBodyFrame, getPickupHeadFrame, preloadBodyVariant, localBodyArt } from '../playerSkins.js';   /* v2.3.1940: + the local player's drawn pants/tattoo */
import { getEyeColor } from '../traits/eyeColorCatalog.js';   /* v2.3.1930: eye colour is per-player now, so every draw names whose eyes it means */
import { DISPLAY_DS, downscaleByFactor } from '../spriteScale.js'; /* v2.3.1120: display-texture downscale + lockstep transform compensation */
import { buildScale, getBuildHeight, getBuildFrame } from '../traits/buildCatalog.js'; /* v2.3.1953: height x frame render scale */
import { getCapeTexture, getCapeHoodTexture, getCapeHoodMaskTexture } from '../capeSprites.js'; /* v2.3.2023: the cosmetic cape; v2.3.2186: its hood half + the hair clip */
import { getCape } from '../traits/capeCatalog.js'; /* v2.3.2023 */
import { getHairColor, getColoredHairTextures } from '../traits/hairColorCatalog.js';
import { getHatColor, getColoredHatTextures } from '../traits/hatColorCatalog.js';
import { getFacialHairColor, getColoredFacialHairTextures } from '../traits/facialHairColorCatalog.js';
import { getShirt } from '../traits/shirtCatalog.js';
import { getShirtColor, shirtFill } from '../traits/shirtColorCatalog.js';
import { getGearFrame, getGearFramePhased, getLoadedGearSources, getShirtLookFrame } from '../gearSheets.js';   /* v2.3.1938; v2.3.1941 renamed — it bakes colour + pattern + print now */
import { sideForDir, getShirtArt, sanitizeShirtArt, artHasInk } from '../traits/playerArt.js';   /* v2.3.1938 */
import { getPattern, parsePattern, sanitizePattern } from '../traits/patternCatalog.js';   /* v2.3.1941 */
import { hatHairFit } from '../traits/hatHairFit.js';   /* v2.3.1943 band refit + v2.3.1561 float lift, in one place since v2.3.1959 */
import { AIM_CARET, AIM_CARET_EDGE, AIM_CARET_HOT } from '../aimCaret.js'; /* v2.3.1799 */
import { BLOCK_ARM_ENABLED, BLOCK_ARM_FACING, BLOCK_ARM_CUT, blockArmTexture, blockArmSleeveTexture } from '../blockArm.js'; /* v2.3.1785, sleeve v2.3.1789, ENABLED v2.3.1798 */
import { gearTint, gearArt, gearMaterial } from '../gearVariants.js'; /* v2.3.1757: material recolor */
import { materialTint, weaponTint } from '../traits/materialTints.js'; /* v2.3.1757: weapons share the metals table */
import { combatGearUrls } from '../combatGear.js';
import { getEquip, onEquipChange, isWearingArmor } from '../gearCatalog.js'; /* v2.3.1407: GEAR_CATALOG import dropped with the speculative all-states prewarm */
import { recordCrash } from '../../debug/crashTrap.js'; /* v2.3.1305: trait-sheet load-failure telemetry */
import { gesturePose01 } from '../../game/gesturePose.js'; /* v2.3.2245: harvest frames follow the hand */
import { monsterDisplayName } from '@/data/gameDisplay.js'; /* v2.3.1918: monster name plates */
import { engagedStance } from '@/game/targeting.js'; /* v2.3.2251: a lock is automatic; intent is not */

/* §9.2.1 Collision-opportunity weapon edge glow — proximity radius (≈20u). */
const COLLISION_GLOW_RANGE_PX = 80;

/* v2.3.1193: threat-skull phase (docs/specs/threats.md, "Skull
   rendering").  'red' while the threat countdown runs, 'white' for the
   consent window after it lapses (the server treats expiry as an
   ignore — _tickThreats) or after an explicit ignore, null once
   everything has aged out.  Pure time math, cheap enough for the
   per-player frame loop; feeds a change-cache so display writes only
   happen when the phase flips. */
function threatSkullPhase(type, until, now) {
  if (!type || !until) return null;
  if (now < until) return type;
  if (type === 'red' && now < until + PVP_THREAT_CONSENT_MS) return 'white';
  return null;
}
/* Red matches the threat UI accent (#ff5e6c).  The 💀 glyph is
   near-white in every platform emoji set, so a multiplicative tint
   yields the red variant without a second texture. */
const SKULL_RED_TINT = 0xff5e6c;

/* Above-player HUD bar textures (v2.3.107).  Three pill-shaped PNGs
   the DOM dashboard also uses -- reuse the same `?v=` cache key so
   the browser hits the warm cache instead of issuing a fresh request. */
const HUD_BAR_VER = '2.3.68';
const _hudBarTex = { hp: null, mp: null, stam: null, heart: null, heartWhite: null, barFrame: null, barFull: null };
let _hudBarLoadStarted = false;
function _ensureHudBarTextures() {
  if (_hudBarLoadStarted) return;
  _hudBarLoadStarted = true;
  Assets.load(`/icons/ui/bar-hp.webp?v=${HUD_BAR_VER}`).then(t => { _hudBarTex.hp = t; }).catch(() => {});
  Assets.load(`/icons/ui/bar-mp.webp?v=${HUD_BAR_VER}`).then(t => { _hudBarTex.mp = t; }).catch(() => {});
  Assets.load(`/icons/ui/bar-stam.webp?v=${HUD_BAR_VER}`).then(t => { _hudBarTex.stam = t; }).catch(() => {});
  Assets.load(`/icons/popups/heart.webp?v=${HUD_BAR_VER}`).then(t => { _hudBarTex.heart = t; }).catch(() => {});
  /* v2.3.214: white-fill heart for the player HP indicator so we can
     tint by HP tier (red asset can't be tinted to green/yellow because
     tint multiplies). */
  Assets.load(`/icons/popups/heart-white.webp?v=${HUD_BAR_VER}`).then(t => { _hudBarTex.heartWhite = t; }).catch(() => {});
  /* v2.3.1273: owner's health-bar art (sheet sliced to TWO sprites —
     empty frame + full red fill; the fill is CROPPED at runtime to the
     hp fraction, the standard smooth-bar technique).  Replaces the
     monster heart and the player HP ring visuals; the v2.3.458 ghost-
     drain logic is reused unchanged. */
  Assets.load('/ui/bars/hp-frame.png?v=2.3.1273').then(t => { _hudBarTex.barFrame = t; }).catch(() => {});
  Assets.load('/ui/bars/hp-full.png?v=2.3.1273').then(t => { _hudBarTex.barFull = t; }).catch(() => {});
}

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
const PEER_HPBAR_HOLD_MS = 8000;
const MONSTER_HPBAR_W = 44;
const MONSTER_HPBAR_H = Math.round(MONSTER_HPBAR_W * HPBAR_ASPECT); /* 13 */
/* v2.3.2295: how long the notice cue stays up. Owner asked for "brief"; the
   dot this replaced ran 600ms, which on a phone at arm's length is a flicker
   rather than a cue -- and since nothing wrote _aggroTs in a server zone, that
   600 had never been judged against anything real. 1100 holds full opacity for
   the first two thirds and fades out over the last, so it reads as an event
   with a beginning rather than as something already ending. */
const NOTICE_MS = 1100;
const PLAYER_HPBAR_W = 76;
const PLAYER_HPBAR_H = Math.round(PLAYER_HPBAR_W * HPBAR_ASPECT);   /* 22 */
const HPBAR_FLASH_MS = 160;   /* white flash on damage */
/* v2.3.1638: world-space gap between the TOP EDGE of a monster's HP bar
   and the centre of a damage popup spawned over it.  Must clear the two
   things that stick up out of that edge:
     - the centred HP NUMBER, 17px font in the 1.5x-scaled _hpUi, so it
       reaches 12.8 world px above the bar centre = 3px past the top edge;
     - the popup's own spawn pop, 1.6x for 120ms, whose half-height is
       16.8px normal / 21.6px crit.
   34 leaves ~9px of visual air on the worst case (a crit).  Consumed via
   m._popupTopOff -> combatHelpers.monsterPopupY(). */
const POPUP_BAR_CLEAR = 34;

/* v2.3.1274: size experiment (owner directive) — characters render 33%
   bigger and world monsters 50% bigger.  Applied at the CONTAINER level
   so the body, above-head bar, and labels scale together and the change
   stays one knob per entity type.  Render-only: world positions, server
   hitboxes, and combat ranges are untouched. */
/* v2.3.1277: owner — "character 25% smaller."  4/3 x 0.75 = 1.0, i.e.
   exactly the pre-experiment size; keep the knob for further tuning.
   ── v2.3.1821: back UP 25% (owner: "Make the character and name plate 25%
   larger.  Needs to be more legible for discerning details about the
   character and the font size").  This is the knob that note kept for
   exactly this, and it is the right one because it is applied at the
   CONTAINER level: the body, the above-head bar and the name plate all grow
   together, so the plate cannot drift off the character it belongs to.
   Render-only — world positions, server hitboxes and combat ranges are
   untouched, so nothing about reach or collision changes with it.
   The plate's TEXT needs one thing more than this scale; see the resolution
   note in _attachNamePill. */
const PLAYER_SIZE_MULT = 1.25;
/* v2.3.1821b: how far the idle SOUTH greatsword tilts off the face, in
   radians about the grip.  Negative because the south sheet is mirrored (see
   the note at the assignment); ~10 degrees, which is the "smidge" the owner
   asked for rather than a re-pose. */
/* v2.3.1839: -0.18 -> -0.60.  Owner, on the second look: "South idle the
   sword is in front of the characters face.  Angle south sword just a bit so
   it's not over the face."  Chosen from a SWEEP photographed in game
   (mp-southsword, BT_TILT_SWEEP) rather than derived: the sign is the trap
   this file already warns about, and the sweep settles which way is which —
   negative swings the tip LEFT clear of the head, positive drags it down
   across the chest.  At -0.18 the blade ran straight up over the face; -0.45
   only grazed clear; -0.60 clears the head box with the whole segment below
   it, and still reads as a carried sword rather than a held-out one. */
const SOUTH_IDLE_TILT = -0.60;
/* v2.3.1765: how long a monster spends arriving (see the spawn-in note in the
   monster loop).  Short on purpose — this is a flourish on a respawn, and a
   monster you cannot fight yet is a monster in your way. */
const SPAWN_FX_MS = 620;
/* Every channel to 1, alpha untouched: the sprite's own silhouette, painted
   white.  One shared instance — filters are stateless here and Pixi is happy
   to apply the same one to several objects in a frame. */
const SPAWN_WHITE_FILTER = new ColorMatrixFilter();
SPAWN_WHITE_FILTER.matrix = [
  0, 0, 0, 0, 1,
  0, 0, 0, 0, 1,
  0, 0, 0, 0, 1,
  0, 0, 0, 1, 0,
];
const MONSTER_SIZE_MULT = 1.5;
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

/* v2.3.1822: per-figure size, because "the mayor" is no longer the only NPC.
   Every earlier size request (1673/1675/1681 above) was about Mayor Bro and
   was applied to the shared constant, which was harmless while he was the
   only one drawn.  He is not: the blacksmith (v2.3.1773) and the storekeeper
   (v2.3.1775) render off the same constant, and the owner did NOT ask for
   those to change.  Owner: "Make mayor bro 10% larger" — so the 10% lives
   here, keyed by sprite path, and everyone else kept 1.0.  (They no longer
   do; v2.3.2081 below is why, and the mayor's 10% survived it intact.) */
/* ═══ v2.3.2081: THE ADULTS ARE ONE TOWN, MEASURED AT THE SHOULDER ═══
   Owner: "Check sizes of NPCs."  tools/dev/npc-sizes.py draws every
   townsperson beside a default player on one baseline, which is how this
   was measured rather than nudged.  Before this pass:

     You 111   Diego 119   Mayor 103   Blacksmith 94   Storekeeper 94

   -- a 27% spread across four grown men, with the BLACKSMITH, who is drawn
   as the burliest man in town, the shortest of them.

   The number that misleads is the total height, because import_npc_walk.py
   normalises every figure hat-to-feet into the same 200px band.  A tall hat
   is therefore paid for out of the BODY: the mayor's stovepipe is a fifth of
   his figure, Diego's crown another sixth, and the bare-headed blacksmith
   spends all 200px on a man.  Compare the landmark a player actually reads
   -- the SHOULDER line (tools/maps/out/npc-hatruler.png, a ruler render at a
   common height) -- and the town was much worse than the totals said:

     You 80   Diego 69   Mayor 65   Blacksmith 64   Storekeeper 60

   The player's shoulders stood 15-33% above every adult in town while the
   totals claimed Diego was the tallest person in it.

   The mults below put the ordinary adults' shoulders on ~73 -- about 8%
   under the player, so the hero is still the tallest man in the square, by a
   head-and-shoulders margin rather than by a third.  Nothing shrinks and
   nothing the owner set by eye is walked back: Diego keeps his v2.3.2052
   1.30 ("make shopkeeper larger"), Lil Bro keeps his v2.3.2064 0.78, and the
   mayor keeps being exactly 1.10x the blacksmith, the rule from v2.3.1822.
   After:

     You 111   Diego 119   Mayor 118   Blacksmith 107

   (The storekeeper appears in both rows above because the pass was measured
   against the town as it stood.  He is no longer in it -- v2.3.2091 removed
   him -- and his mult is gone from the table below, where a key for a sprite
   nobody draws would be a rule nothing obeys.)

   Keyed by client-visible strings, so Object.create(null) (CLAUDE.md rule 4). */
const NPC_SCALE_MULT = Object.assign(Object.create(null), {
  /* 1.10 -> 1.254: still the blacksmith x 1.10 exactly (0.909 the other way,
     which is what mp-blacksmith asserts), lifted with him. */
  '/sprites/npc/mayor-bro.webp': 1.254,
  /* 1.00 -> 1.14.  He was the shortest adult in town and is drawn as the
     biggest-built one; his shoulder went 64 -> 73. */
  '/sprites/npc/blacksmith-bro.webp': 1.14,
  /* v2.3.2052 (owner: "make shopkeeper larger his sprite is bit small").
     Measured rather than nudged: at 1.0 he drew 120px against Mayor Bro's 132,
     so he read as the smallest figure in the town square despite being a
     broad man in a heavy coat. 1.30 puts him at ~156 -- the biggest of the
     three, which is what a man in that coat should look like standing next to
     a mayor. Keyed on the south strip because that is his NPC_DATA `sprite`,
     which is what npcSpriteScale is handed. */
  '/sprites/npc/shopkeeper-bro-walk-south.webp': 1.30,
  /* ═══ v2.3.2064: LIL BRO IS A CHILD, SO HE IS DRAWN AS ONE ═══
     The import convention normalises EVERY figure to 200px between hat and
     feet (import_npc_walk.py), which is what makes an NPC need no per-sprite
     anchor -- and it also means a kid ships exactly as tall as the mayor. The
     art is a child; the scale is where that gets said. 0.78 puts his head at
     about an adult's shoulder, which is what the reference art looks like
     beside the grown-ups in the same street. */
  '/sprites/npc/lil-bro-walk-south.webp': 0.78,
});
const npcSpriteScale = (src) => NPC_SPRITE_SCALE * (NPC_SCALE_MULT[src] || 1);

/* v2.3.1773: QA probe store — id-keyed from data, so Object.create(null)
   (CLAUDE.md: a plain {} silently no-ops on '__proto__'). */
const _npcDrawn = Object.create(null);
/* v2.3.1775: what scenery is on screen and how big it is drawn. */
const _propsDrawn = [];
if (typeof window !== 'undefined') window.__btWorldProps = () => _propsDrawn.slice();
/* v2.3.1775: the entity layer's child order — Pixi paints in this order, so it
   is what decides whether a stall covers the vendor standing at it or the
   other way round (Diego at the market stall since v2.3.2080; the example
   used to be the storekeeper, who left town in v2.3.2091).  Labelled children
   only; the rest are unnamed graphics. */
let _entityLayerRef = null;
if (typeof window !== 'undefined') {
  window.__btEntityOrder = () => (_entityLayerRef
    ? _entityLayerRef.children.map((c) => c.label).filter(Boolean) : null);
}
if (typeof window !== 'undefined') window.__btNpcSprites = () => Object.values(_npcDrawn);
/* v2.3.2083: the peer half of __btPlayerDrawn — see the note at the peer draw
   site.  A Map because the keys are player ids off the wire (CLAUDE.md rule 4:
   a plain {} silently no-ops on '__proto__'). */
if (typeof window !== 'undefined') {
  const _peersDrawn = new Map();
  window.__btPeersDrawn = (id) => (id == null
    ? Object.fromEntries(_peersDrawn)
    : (_peersDrawn.get(id) || null));
  window.__btPeersDrawn._m = _peersDrawn;
}

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

/** Height of the drawn figure above the NPC's feet, in world px. */
const npcFigureHeight = (src) => npcSpriteScale(src) * (NPC_FRAME_FEET_Y - NPC_FRAME_TOP_Y);

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
function npcDirFromDelta(dx, dy) {
  const a = Math.atan2(dy, dx);                    /* -pi..pi, +y is down */
  const oct = Math.round(a / (Math.PI / 4));       /* -4..4 */
  return NPC_DIRS_8[((oct % 8) + 8) % 8];
}
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
/** Three concentric rings, drawn outside in.  `fill` carries the state
 *  (gold = quest to offer, green = ready to turn in). */
function _drawQuestBadge(g, fill) {
  g.clear();
  /* Dark hairline first: without it the white ring dissolves into the town's
     pale cobblestones, which is the exact background the owner reported the
     marker disappearing against. */
  g.circle(0, 0, QUEST_BADGE_R);
  g.fill({ color: 0x1A1207, alpha: 0.9 });
  /* The thick white ring the owner asked for. */
  g.circle(0, 0, QUEST_BADGE_R - 2);
  g.fill({ color: 0xFFFFFF });
  g.circle(0, 0, QUEST_BADGE_R - 5.5);
  g.fill({ color: fill });
}

/* v2.3.1300: shared ground-shadow texture — ONE 64x32 radial-gradient
   ellipse minted lazily on a canvas and reused by every entity shadow
   sprite, so all shadows batch into a single draw call (same recipe as
   the recolor caches / _hpFillTex shared source).  Never a per-frame
   Graphics redraw — the monster-body lesson at createMonsterDisplay. */
let _shadowTexCache = null;
function _shadowTex() {
  if (_shadowTexCache) return _shadowTexCache;
  const cv = document.createElement('canvas');
  cv.width = 64; cv.height = 32;
  const c = cv.getContext('2d');
  const g = c.createRadialGradient(32, 16, 2, 32, 16, 30);
  /* v2.3.1300c: ~45% darker (owner: increase intensity). */
  g.addColorStop(0, 'rgba(0,0,0,0.48)');
  g.addColorStop(0.6, 'rgba(0,0,0,0.22)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.save();
  c.translate(32, 16); c.scale(1, 0.5); c.translate(-32, -16);
  c.fillStyle = g;
  c.fillRect(0, -16, 64, 64);
  c.restore();
  _shadowTexCache = Texture.from(cv);
  _shadowTexCache.source.scaleMode = 'linear';
  return _shadowTexCache;
}
/* v2.3.1300: mint one entity ground shadow (soft 3/4 ellipse, feet-
   centered).  Sized in container-local units — the container-level
   PLAYER_SIZE_MULT / MONSTER_SIZE_MULT / zone pscale scale it along
   with the body for free.  _shadowW lets the walk-bob hook wobble the
   width cheaply (two property writes on frames already being touched). */
function _mintShadow(w) {
  const s = new Sprite(_shadowTex());
  s.anchor.set(0.5, 0.5);
  s.width = w; s.height = w * 0.38;
  s._shadowW = w;
  return s;
}
/* Build (or return) a display-owned cropped view of the full-bar texture.
   The Texture is RECREATED when the crop width changes (integer source
   px, so at most one realloc per hp change): Pixi 8's Sprite.width
   setter scales against texture.orig — mutating only .frame +
   updateUvs() leaves orig at the full sheet width and the quad/scale
   math disagrees, rendering the full art at the wrong width.  A fresh
   Texture sets orig = frame and everything stays consistent; it is a
   tiny view object over the SHARED source, not a GPU upload. */
function _hpFillTexFor(holder, frac) {
  const base = _hudBarTex.barFull;
  if (!base) return null;
  const f = Math.max(0.001, Math.min(1, frac));
  const w = Math.max(1, Math.round(base.width * f));
  if (!holder._hpFillTex || holder._hpFillTexW !== w) {
    const old = holder._hpFillTex;
    holder._hpFillTex = new Texture({
      source: base.source,
      frame: new Rectangle(0, 0, w, base.height),
    });
    holder._hpFillTexW = w;
    if (old) old.destroy(false);
  }
  return holder._hpFillTex;
}

/* v2.3.261 (Bro-NFT Phase 4): trait textures for the local player's
   face/head composite layer.  One sprite per stored direction (east,
   north, northeast, south, southwest); W / NW / SE render via mirror.
   Currently hard-coded to the `test-1` NFT for demo; later this will
   read the active player's NFT ID from R.nftId or similar. */
const TRAIT_NFT_ID = 'test-1';
/* v2.3.708: bumped for the regenerated NE jog body-tops/body-anchors. */
/* v2.3.1394: bumped — bandana gains hairmask/*.png + clipsHair in meta.json
   (owner: hair not clipped under the bandana on NE/NW).
   v2.3.1561: bumped — halo gains floatsAboveHair in meta.json.  A meta-only
   change still needs the bust, or a returning browser serves the cached
   meta and the halo goes on placing itself flat on the hair. */
const TRAIT_VER = '2.3.2174';   /* v2.3.2174: de-fringe sweep across the trait sheets (tools/sprite-defringe.py); see playerSprites VERSION 101. */

/* v2.3.377 hid the on-back (sheathed) shield behind SHOW_BACK_SHIELD=false:
   "purely cosmetic and a persistent source of per-facing z-order issues vs
   the body/arms/weapon/hair".  v2.3.1782 brings it back and deletes the flag
   — the z-order is structural now (two sprites, fixed positions in the child
   list) instead of recomputed per frame, so there is no longer a class of
   failure for a kill-switch to switch off.  See createPlayerDisplay. */

/* v2.3.266: standalone-item sticker pipeline.  Each item (e.g.
   headwear/old-school-helmet) is a small transparent PNG with a
   per-direction anchor that maps onto a body anchor (currently always
   the head).  Items composite at the body's per-frame head anchor.
   meta.json schema per direction:
     { size: [w, h], anchor: [ax, ay], anchorOffset: [dx, dy] }
   - anchor is the pixel in the trait's own image space that should
     land on the body anchor (typically bottom-center for headwear).
   - anchorOffset shifts the body anchor in frame coords (head-center
     -> head-top via [0, -8] for example). */
/* v2.3.321: per-PLAYER headwear so remote players show their own hats.
   Each headwear id owns its own texture set + meta, cached by id, so many
   different hats can render on screen at once.  The local player's id comes
   from the login picker (getHeadwear()); remote players' ids arrive over
   the network (other.headwear).  'none' / falsy = bareheaded. */
/* Trait textures cached by `${category}/${id}` so headwear, facial-hair,
   and any future category share one loader.  Each entry owns its own
   per-direction texture set + meta. */
const _traitCache = {};  // `${category}/${id}` -> { tex:{east,...}, meta, loadStarted }
function _ensureTraitLoaded(category, id) {
  if (!id || id === 'none') return null;
  const key = category + '/' + id;
  let e = _traitCache[key];
  if (!e) {
    e = _traitCache[key] = {
      tex: { east: null, north: null, northeast: null, south: null, southwest: null },
      meta: null,
      loadStarted: false,
    };
  }
  if (!e.loadStarted) {
    e.loadStarted = true;
    /* v2.3.1382: meta.json gets the same bounded retry the trait textures
       got in v2.3.1305 — a flaked meta left the trait unplaceable all
       session (owner: "hair and headwear missing on east jog"). */
    const _fetchMeta = (attempt) => {
      const bust = attempt > 0 ? `&r=${attempt}` : '';
      fetch(`/sprites/traits/${category}/${id}/meta.json?v=${TRAIT_VER}${bust}`)
        .then(r => r.ok ? r.json() : null)
        .then(j => {
          if (j) { e.meta = j; return; }
          if (attempt < 2) setTimeout(() => _fetchMeta(attempt + 1), [2000, 6000][attempt]);
        })
        .catch(() => { if (attempt < 2) setTimeout(() => _fetchMeta(attempt + 1), [2000, 6000][attempt]); });
    };
    _fetchMeta(0);
    for (const dir of Object.keys(e.tex)) {
      _loadTraitDir(e, category, id, dir, 0);
    }
  }
  return e;
}
/* v2.3.1305: per-direction trait load with bounded retry.  Owner
   two-player report: "lots of layers are missing depending on the
   angle of the player (face missing, clothes missing)".  The old
   loader fired each direction's Assets.load exactly ONCE with a
   swallow-all catch — one flaked request (deploy-day cold CDN edge,
   iPhone Safari dropping a request during the join burst) left
   e.tex[dir] null for the whole session, silently hiding that trait
   for that facing (_placeTrait's visible=false branch).  Two quiet
   retries (2s/6s) recover the transient case; the retry URL appends
   &r=N so a poisoned CDN/browser cache entry — and Pixi's own
   rejected-load cache — can't replay the failure.  A direction that
   still fails WITH a loaded sibling is real evidence (the art set
   exists but this dir flaked deterministically) and lands in the
   crashTrap ring + upload; a direction with NO loaded siblings stays
   quiet (trait sets missing whole dirs were historically normal —
   the old catch comment said "expected for directions that don't
   exist yet"). */
const _TRAIT_RETRY_MS = [2000, 6000];
function _loadTraitDir(e, category, id, dir, attempt) {
  const bust = attempt > 0 ? `&r=${attempt}` : '';
  Assets.load(`/sprites/traits/${category}/${id}/${dir}.png?v=${TRAIT_VER}${bust}`)
    .then(t => {
      e.tex[dir] = t;
      if (t && t.source) {
        /* match body's linear scaleMode + mipmaps so Lanczos
           downscale artifacts blend out the same way. */
        t.source.scaleMode = 'linear';
        t.source.autoGenerateMipmaps = true;
      }
    })
    .catch(() => {
      /* v2.3.1306: meta.anchors is the authoritative list of directions
         a trait SHIPS (e.g. facialhair/beard has no north.png and no
         north anchor — by design, verified on disk; v2.3.1530 added
         northeast to that list for the same reason).  The v2.3.1305
         sibling heuristic misread that as a per-session deterministic
         flake: every bearded session retried north 3x and pushed a bogus
         'sheet' entry into the 16-slot crash ring + beacon upload,
         crowding out real crash evidence.  When meta has loaded and
         lacks this dir's anchor, stop quietly — no retry, no report.
         When meta hasn't loaded yet (first 2s race) retry anyway; the
         final report requires the anchor to exist. */
      const designedMissing = e.meta && e.meta.anchors && !e.meta.anchors[dir];
      if (designedMissing) return;
      if (attempt < _TRAIT_RETRY_MS.length) {
        setTimeout(() => _loadTraitDir(e, category, id, dir, attempt + 1), _TRAIT_RETRY_MS[attempt]);
        return;
      }
      try {
        if (window.__spriteLog) console.warn('[sprite] trait dir failed', category, id, dir);
        const shouldExist = e.meta && e.meta.anchors && e.meta.anchors[dir];
        if (shouldExist) recordCrash('sheet', `trait ${category}/${id}/${dir} failed x${attempt + 1}`);
      } catch (err) { /* telemetry must never break rendering */ }
    });
}
function _ensureHeadwearLoaded(id) { return _ensureTraitLoaded('headwear', id); }
function _ensureFacialHairLoaded(id) { return _ensureTraitLoaded('facialhair', id); }
function _ensureHairLoaded(id) { return _ensureTraitLoaded('hair', id); }

/* Body anchor schemas, loaded once and shared by every player + hat.
   body-tops.json: per-(pose,dir,frame) topmost opaque pixel [x,y] of the
   body sprite -- the head pin point for trait stickers (derived raw by
   tools/derive_body_tops.py: frame-exact, no detection noise). */
let _bodyAnchors = null;
let _bodyTops = null;
let _bodyDataPromise = null;
function _ensureBodyData() {
  if (_bodyDataPromise) return _bodyDataPromise;
  /* v2.3.1382: bounded retry (v2.3.1305 pattern) — these anchors place every
     hat/hair/beard; a single flaked fetch used to hide headwear all session.
     v2.3.1398: the retries CHAIN into a returned promise and preloadTraits
     awaits it, so the loading screen holds until the placement schemas are
     really in (owner: hats/beards missing right after a deploy). */
  const _fetchJson = (url, apply, attempt = 0) =>
    fetch(url + (attempt > 0 ? `&r=${attempt}` : ''))
      .then(r => r.ok ? r.json() : null)
      .then(j => {
        if (j) { apply(j); return; }
        if (attempt < 2) {
          return new Promise((res) => setTimeout(res, [2000, 6000][attempt]))
            .then(() => _fetchJson(url, apply, attempt + 1));
        }
      })
      .catch(() => {
        if (attempt < 2) {
          return new Promise((res) => setTimeout(res, [2000, 6000][attempt]))
            .then(() => _fetchJson(url, apply, attempt + 1));
        }
      });
  _bodyDataPromise = Promise.allSettled([
    _fetchJson(`/sprites/player/body-anchors.json?v=${TRAIT_VER}`, (j) => { _bodyAnchors = j; }),
    _fetchJson(`/sprites/player/body-tops.json?v=${TRAIT_VER}`, (j) => { _bodyTops = j; }),
  ]);
  return _bodyDataPromise;
}

/* Mirrored views (W/NW/SE) reuse the opposite sheet texture, so they
   render with dir = E/NE/SW + mirror.  This maps that base dir back to
   the on-screen direction so meta can carry an optional override keyed
   by the mirrored side (e.g. crownNudge.west) without disturbing the
   un-mirrored side. */
const MIRROR_SCREEN_DIR = { east: 'west', northeast: 'northwest', southwest: 'southeast' };

/* v2.3.1106: per-direction jog FOOT-PLANT frames (footstep SFX fires when the
   animation lands on one). Module-scope so the jog render path doesn't allocate
   a fresh object + arrays every frame (that per-frame garbage was a likely
   source of periodic GC hitches). resolveDirection only ever yields the 5 base
   dirs; mirror keys kept for clarity. */
const JOG_FOOT_FRAMES = {
  east: [3, 17], west: [3, 17],
  south: [0, 13], north: [0, 11],
  northeast: [9, 21], northwest: [9, 21],
  /* v2.3.1107: SW/SE is a DOUBLE-stride loop (~1656ms, ~2x the other dirs), so
     it has FOUR foot-plants per cycle, not two. [2,17] left the middle two
     silent and bunched the audible pair into a "first two replay". */
  southwest: [2, 8, 13, 18], southeast: [2, 8, 13, 18],
};

/* v2.3.537: per-(pose,dir) body render scale, DERIVED from silhouette
   measurement -- replaces the old hand-tuned bump stack (v2.3.164-171:
   N/S/E *1.10, NE *1.05/*1.0815, etc).  Goal: equal on-screen character
   HEIGHT across all 8 facings so the player doesn't grow/shrink when they
   turn.  Reference = crown-to-hip span (pose-invariant -- it sits above the
   swinging legs and ignores arm-swing, the two things that corrupt a raw
   pixel count or bbox height).  Measured per facing on the real sheets,
   normalized so every facing matches the tallest (southwest = 1.0, the
   larger size the user dialed in as the target).  Stand and jog measured
   separately because the run bends the legs (a deep stride is not a height
   change).  Mirror dirs (W<-E, NW<-NE, SE<-SW) share their base value.
   hit/attack keep the old behavior (no armor on them yet; east-hit
   stays slightly smaller per the original tuning).  v2.3.1053: pickup now
   ships chest/legs/shirt gear sheets (south-only) -- the gear shares the
   body transform, so it scales with the pose's default and needs no entry. */
const BODY_DIR_SCALE = {
  /* v2.3.541: south -3% (1.130->1.096), north -2% (1.150->1.127) per user.
     v2.3.548: NE idle 1.130->0.98 -- the armored figure (tall NE helmet +
     pauldrons) rendered 14% bigger than the others; bare-body scale couldn't
     account for armor height.  Brought NE down to match the armored cluster
     (~240px) so east no longer reads small next to it. */
  /* v2.3.569: derived by tools/derive_armor_scales.py -- normalizes every idle
     to ONE rendered height (~86px = 1.063x the median jog height, the validated
     standing-taller ratio) measured on the ARMORED figure (not the bare body,
     which couldn't see the gear's size variation).  Body WIDTH is handled
     separately in the gear (normalize_idle_width.py, helmet kept native).
     Manual tweaks baked in: south x0.97, north x0.98. */
  /* v2.3.571: NO width manipulation -- idle gear is kept at the ASPECT RATIO it
     was DRAWN at and only scaled UNIFORMLY (diagonally) to a consistent rendered
     height (~86px) by these per-dir factors.  The earlier per-axis width passes
     (bare-body in v2.3.569, jog-bulk in v2.3.570) distorted the drawn art and
     made dirs read too fat/skinny -- dropped.  scale.x == scale.y (STAND_WIDTH
     all 1.0) so the drawn proportions are preserved exactly. */
  /* v2.3.684: south 1.136 -> 1.051 -- the idle popped 8% LARGER than the jog
     when the run stopped.  v2.3.645 neutralized STAND_HEIGHT (0.975) and
     JOG_HEIGHT (1.052) without re-deriving this map; for south those two
     factors were what held idle == jog.  Re-measured on the armored figure:
     stand 188px, jog mean 197.6px -> 197.6/188 = 1.051 makes them equal. */
  /* ═══ v2.3.1826: RE-DERIVED FROM THE FIGURE ON SCREEN ═══
     Owner: "Character's size is inconsistent across different directions
     (east, southwest, etc).  I don't know the best way to fix that.  Also
     without breaking anything else (relative item scale like hats, beards,
     etc)."

     They are right, and the old numbers are why.  Measured through
     bodyFigureProbe — the painted crown-to-boots of the frame actually on
     screen, converted through the live transform — the eight facings came
     out spanning 9.4%:
         north 74.0  east/west 74.6  south 76.5  NE/NW 77.6  SE/SW 81.4
     Southwest is 9.9% taller than north, which is exactly the pair the
     owner named.

     WHY THE OLD MAP DID NOT HOLD IT.  It was derived at v2.3.569 against the
     ARMOURED figure, because at the time gear was drawn at its own size and
     the bare body could not see it.  v2.3.645 ended that — the aligned gear
     is drawn to FIT the body now, and only this uniform scale applies — so
     normalising the armoured silhouette stopped being the right target and
     nobody re-derived it.  South was then hand-patched at v2.3.684 for a
     different reason again (idle/jog parity).

     THE NEW TARGET is 77.2px, the facing-weighted mean of what the eight
     were already doing (east art covers E+W, SW art covers SW+SE, NE art
     covers NE+NW, so those three carry double weight).  Keeping the mean
     fixed means this removes the VARIANCE without making the character
     bigger or smaller overall — a size change is not what was asked for.

     THE BOOTS COME ALONG FOR FREE, and that is the check that the model is
     right rather than a coincidence: the body sprite is anchored at the
     CELL's centre, and the painted figure's centre sits at row ~126 of 256
     in every sheet, so a facing that is drawn taller also puts its feet
     lower — the character sinks and rises as it turns.  Equalising the
     heights predicted a foot-line spread of 1.2px, down from 4.5px, and
     that is what mp-bodysize measures.

     AND THE HATS ARE SAFE, which was the owner's actual worry: every trait
     is placed through _placeTrait with THIS bodyScale, and its anchors are
     frame-relative, so a hat's size and its seat on the head scale in
     lockstep with the body.  mp-bodysize asserts hat-height / body-height
     stays constant across facings rather than trusting that.

     NOT TOUCHING `jog` — see the note below.  Its numbers encode a
     deliberate perceptual correction for east's under-drawn source art, and
     re-deriving it on height alone would undo that. */
  stand: { south: 1.061, east: 1.018, north: 1.083, northeast: 0.998, southwest: 0.933 },
  /* v2.3.539: jog re-derived to match each facing's OWN idle size (the player
     was bigger running than standing).  Crown-to-hip over-scaled the jog
     because a running figure leans + spreads its legs, compressing vertical
     spans.  Re-anchored to rendered FULL height (crown-to-feet, what the eye
     actually reads) against the user's gold standard: SW jog==idle looks
     right, so every facing now hits SW's jog/idle render ratio (0.941). */
  /* north nudged 0.967 -> 1.05 (v2.3.540): its run has the largest leg-spread
     of any facing, so full-height matching shrank the body to fit the spread
     legs.  Hip-span said 1.22 (too big), full-height 0.967 (a bit small) --
     truth sits just above the full-height end. */
  /* east -3% (1.218->1.181, covers west via mirror) v2.3.542 per user. */
  /* east -2% uniform (1.181->1.157) v2.3.584 per user (covers west via mirror). */
  /* v2.3.740: east 1.157 -> 1.25 (owner: east jog armor much smaller than it
     should be).  Diagnosis: the jog-east SOURCE art draws the figure with
     ~18% less body mass than every other direction (mean silhouette 163px vs
     ~200px; it has been that way since the v2.3.5xx sheets — confirmed NOT a
     regression from the v2.3.705 half-cycle remap, whose frames are byte-
     identical art).  Height normalization alone can't fix small body mass on
     a leaning profile figure, so this is a perceptual split: +8% closes most
     of the mass gap at the cost of a small jog>stand height pop when
     stopping.  The DURABLE fix is regenerating jog-east art at proper figure
     scale via the same video pipeline that rebuilt NE (v2.3.708/716). */
  /* ═══ v2.3.1830: THE JOG MAP, RE-DERIVED ON EAST'S ANCHOR ═══
     Owner: "the larger issue is still the inconsistent player scale per
     direction.  I need you to provide a visual preview of the character per
     direction and come up with the best solution to equalize the scale
     between directions."

     v2.3.1826 equalised STAND to 0.1%.  Jogging still spanned 8.1%:
         south 77.39  SE/SW 77.39  E/W 78.54  NE/NW 80.24  north 83.67
     measured as painted crown-to-feet through the live transform, taken as
     the MEDIAN OF THE WHOLE RUN CYCLE rather than one frame — a running
     figure bobs, and a single frame compares eight arbitrary moments.  (The
     first pass sampled 14 moments and had SE and SW, which are the same
     sheet mirrored, disagreeing by 1%.  They are identical here, which is
     the check that the sampling is converged.)

     WHY EAST IS THE ANCHOR AND NOT THE MEAN.  East's 1.25 is not a height
     number — v2.3.740 set it to close an ~18% BODY MASS deficit in the
     jog-east source art, knowingly buying a small jog>stand pop to do it.
     Re-deriving it on height would quietly undo that.  So the target is
     east's own current rendered height, 78.54px, which happens to also be
     the median of the eight: east's entry is therefore UNCHANGED BY
     CONSTRUCTION and everything else moves to meet it.

     WHY NORTH MOVES MOST (1.050 -> 0.986, -6.1%).  v2.3.540 derived north
     on full height as 0.967, judged it "a bit small" against the leg-spread
     of its run, and settled on 1.050 — matched to the idle map OF THAT ERA,
     when north stood at 74.0px.  v2.3.1826 moved north's stand to 77.2px,
     so the target that 1.050 was tuned against no longer exists; this is
     the same principle re-applied to corrected inputs, not a perceptual
     call being overridden.  0.986 also sits 2% ABOVE the 0.967 that was
     called small, so it does not walk back into that.

     RESULT: jog spread 8.1% -> 0.05%, and because the anchor is east's
     height rather than the stand height, every facing now has the SAME
     +1.7% stand->jog pop that v2.3.740 already accepted for east — the pop
     is uniform instead of ranging from -0.8% to +8.4%.
     Traits ride this scale through _placeTrait, so hats and beards follow
     in lockstep; mp-scalesheet asserts that ratio while JOGGING rather than trusting it
     (mp-bodysize only ever covered standing). */
  jog:   { south: 1.015, east: 1.25, north: 0.986, northeast: 1.102, southwest: 1.015 },
};
/* ═══ v2.3.1836: WHERE THE CROWN AND THE FEET ACTUALLY ARE ═══
 *
 * Owner: "the shield block per direction still have mismatched character
 * scales."
 *
 * The block, the swing and the bow shot all replace the walking body with a
 * STAND-IN drawn by effectsRenderer, and entityRenderer sizes and plants it by
 * publishing S._swordBodyH / S._swordFootY.  Both were computed from the
 * constants 221 (feet row) and 33 (crown row), which are SOUTH's rows applied
 * to every facing — and then multiplied by bodyDirScale('stand', dir).
 *
 * That multiplication is the bug, and it is backwards in an interesting way.
 * The dir-scale exists to CANCEL the per-facing height differences in the
 * walking art: the sheets paint the figure 189/197/185/201/214 units tall and
 * the scale brings them all to one rendered height.  Measured:
 *      south 189*1.061   east 197*1.018   north 185*1.083
 *      northeast 201*0.998   southwest 214*0.933      -> 200.5 every time
 * Multiply that same scale by a CONSTANT 188 instead and the cancellation runs
 * the wrong way — it re-introduces the variation it was built to remove:
 *      175.4 .. 203.6, a 16.1% spread.
 * So the block pose was up to 16% bigger in one direction than another, which
 * is exactly what the owner is looking at.  The jog figure used for the
 * moving-block leg composite was worse: 26.8%.
 *
 * These are the MEASURED painted rows of each sheet, in 256-frame units, so
 * (feet - crown + 1) * dirScale is the constant the dir-scale was designed to
 * produce.  The jog rows are the CYCLE MEDIAN — a running figure bobs, so one
 * frame would be one arbitrary moment (the same reason mp-scalesheet medians
 * over the strip).
 *
 * The feet row was wrong per facing too, and independently: 221 is south's,
 * while east ends at 223 and southwest at 234.  A stand-in planted on south's
 * feet row floats or sinks in every other direction.
 */
const BODY_ROWS = {
  stand: {
    south:     { crown: 33, feet: 221 },
    east:      { crown: 27, feet: 223 },
    north:     { crown: 35, feet: 219 },
    northeast: { crown: 27, feet: 227 },
    southwest: { crown: 21, feet: 234 },
  },
  jog: {
    south:     { crown: 32, feet: 232 },
    east:      { crown: 48, feet: 210 },
    north:     { crown: 24, feet: 230 },
    northeast: { crown: 44, feet: 228 },
    southwest: { crown: 32, feet: 232 },
  },
};
/* South is the fallback because it is the pair the old constants encoded, so
   an unknown facing lands exactly where it used to rather than somewhere new. */
function bodyRows(pose, dir) {
  const m = BODY_ROWS[pose] || BODY_ROWS.stand;
  return m[dir] || m.south;
}

function bodyDirScale(pose, dir) {
  if (pose === 'hit') return dir === 'east' ? 0.88 : 1.0;
  const m = BODY_DIR_SCALE[pose];
  return (m && m[dir]) || 1.0;
}

/* v2.3.645 removed the per-axis manual armour stretches (STAND_WIDTH/
   STAND_HEIGHT/JOG_WIDTH/JOG_HEIGHT + their accessor functions) -- the
   aligned gear is drawn to fit, so only the uniform BODY_DIR_SCALE applies.
   The neutralized scaffolding (functions returning 1.0 multiplied into every
   scale) was deleted in the v2.3.688 cleanup; history has the tuned maps. */

/* v2.3.1353: per-hat jog east/west corrections — the owner read the
   headwear comparison sheet row by row and dialed each hat against the
   v2.3.1349 global 0.67: `mul` multiplies the jog-east trait scale
   (west is the mirrored render of the same dir), `dy` nudges the hat
   down in SCREEN pixels (the three wide-brim hats rode high on the
   jogging head).  Applied to the hat AND its hair-clip mask (both flow
   through _placeTrait with the same tune), never to hair/beard — the
   bare-head row was owner-rated 0.
   v2.3.1354 (owner round 2, cumulative): helmet 1.20->1.15 +2px down,
   top-hat +3px, purple +1px, beanie 1.20->1.25 +2px down, shark-hat
   +2px down, wide-brims 10->7px (owner: "up 3px"). */
/* v2.3.1925: five `mul` values below were REBASED, not retuned.  The per-facing
   stand fit (tools/fit-headwear-scale.mjs) moved scale[east] on five of these
   hats, and jog-east renders scale[east] * 0.67 * mul — so leaving `mul` alone
   would have dragged the running hat along with the standing one.  Each was
   divided by exactly the factor its east scale moved by, which holds the jog
   frames pixel-identical to what they render today:
       bandana    x0.947 -> 1.10 / 0.947 = 1.162
       red-cap    x0.908 -> 1.10 / 0.908 = 1.211
       shark-hat  x0.850 -> 1.00 / 0.850 = 1.176
       top-hat    x1.077 -> 1.10 / 1.077 = 1.022
       wizard-hat x1.136 -> 1.40 / 1.136 = 1.232
   These eleven numbers are the owner's own by-eye round from v2.3.1353-1355 and
   the intent is to preserve that judgement exactly, not to re-open it. */
const JOG_EW_HAT_TUNE = {
  'old-school-helmet': { mul: 1.15, dy: 2 },
  'top-hat':           { mul: 1.022, dy: 3 },
  'purple-hat':        { mul: 1.10, dy: 1 },
  'beanie':            { mul: 1.25, dy: 2 },
  'red-cap':           { mul: 1.211, dy: 0 },
  'shark-hat':         { mul: 1.176, dy: 2 },
  'bandana':           { mul: 1.162, dy: 0 },
  'sombrero':          { mul: 1.20, dy: 6 }, /* v2.3.1355: owner round 3, up 1px */
  'bucket-hat':        { mul: 1.20, dy: 6 },
  'fedora':            { mul: 1.20, dy: 6 },
  /* v2.3.1542 (owner: "jog east makes the wizard hat fly off the head").  The
     hat is pinned by its OWN crown pixel, which for the wizard hat is the tip
     of the cone -- meta.anchors.east is the bbox top-centre and crownNudge.east
     is -37, by far the largest lift in the set (next is evil-crown at -30).
     The blanket jog-east 0.67 then shrinks the whole hat ABOUT THAT TIP, so the
     brim -- 47px below the anchor -- rises by a third of that span while the
     tip stays put.  Measured against the standing placement the brim landed
     ~15px high in 256-space, which on a tall pointed hat reads as the hat
     hovering over a bald head.  Every un-dialled hat has this to some degree;
     the wizard hat is the one where the geometry makes it obvious.
     mul 1.40 is the same correction hair got in v2.3.1454 (1.40 x 0.67 = 0.938,
     the MEASURED jog-east/stand-east head ratio, 44px vs 47px), and dy 3 pays
     back the last ~2px, which is the part of the -37 lift that _placeTrait
     applies unscaled while the head around it is 6% smaller.  Verified frame by
     frame against the standing reference over the whole 28-frame cycle. */
  'wizard-hat':        { mul: 1.232, dy: 3 },
};
/* v2.3.1354: IDLE (stand pose, every facing — a hat that reads small
   idling east reads small on every idle facing; per-dir splits would
   make the hat pop while turning) corrections from the same review:
   bucket-hat and fedora +10% and 2px down. */
const STAND_HAT_TUNE = {
  'bucket-hat': { mul: 1.10, dy: 2 },
  'fedora':     { mul: 1.10, dy: 2 },
};
function hatPoseTune(hatId, pose, dir) {
  if (pose === 'jog' && dir === 'east') return JOG_EW_HAT_TUNE[hatId] || null;
  if (pose === 'stand') return STAND_HAT_TUNE[hatId] || null;
  return null;
}

/* ═══ v2.3.1959: THE HAT'S HAIR-DEPENDENT ADJUSTMENTS, ASKED FOR ONCE ═══
   The v2.3.1561 float lift (the halo rides above whatever hair is worn) and
   the v2.3.1943 band refit (a band grows sideways to reach around big hair)
   both moved to traits/hatHairFit.js — read that file for why each exists.

   They moved because each was added HERE, at the hat's own placement call,
   and each was left out of _clipHairToHat's placement of the hair MASK, which
   is meant to land exactly where the hat lands.  Two adjustments, two
   versions apart, the same omission both times: that is a pattern, not an
   oversight, so the answer is one function that both placements ask rather
   than two lines that both placements have to remember.

   This wrapper is the renderer's side of that: it turns the ids the frame
   loop carries into the two METAS the pure function wants.  Only a floating
   hat needs the hair's meta, and _placeHair loads that hair every frame, so
   the lookup is a map hit rather than a load — and every non-floating hat
   skips it entirely. */
function _hatHairFit(hatId, meta, hairId, pose, dir, mirror) {
  const screenDir = mirror ? (MIRROR_SCREEN_DIR[dir] || dir) : dir;
  const hairEntry = (meta && meta.floatsAboveHair && hairId && hairId !== 'none')
    ? _ensureHairLoaded(hairId) : null;
  return hatHairFit(hatId, meta, hairId, hairEntry && hairEntry.meta, pose, dir, screenDir);
}

/* v2.3.1959: the COMPLETE tune a hat is placed with — the per-hat pose
   correction (v2.3.1353/1354) plus both hair-dependent adjustments, merged
   into the one object _placeTrait reads.  _placeHeadwear and _clipHairToHat
   both call this, so the mask cannot be placed with a subset of what the hat
   got, which is exactly what it was doing before.

   It is RE-DERIVED for the mask rather than stashed off the hat's placement
   on purpose.  Headwear is placed before hair at both call sites today (the
   clip needs the hair sprite already placed and visible, so the clip cannot
   be folded into _placeHeadwear either), but a stashed tune would make that
   ordering silently load-bearing and would go stale the day someone reorders
   the three trait placements.  This is a pure function of its arguments: two
   calls with the same arguments cannot disagree, and it costs a handful of
   table lookups on a path that already does far more per frame. */
function _hatTune(hatId, meta, hairId, pose, dir, mirror) {
  let tune = hatPoseTune(hatId, pose, dir); /* v2.3.1353/1354 */
  const fit = _hatHairFit(hatId, meta, hairId, pose, dir, mirror);
  /* v2.3.1561: dy256 is a 256-space lift, so it scales with the body. */
  if (fit.dy256) tune = { ...(tune || {}), dy256: fit.dy256 };
  /* v2.3.1943: mulX is HORIZONTAL only — the band stays where it sat. */
  if (fit.mulX !== 1) tune = { ...(tune || {}), mulX: fit.mulX };
  return tune;
}
/* v2.3.1454 (owner: east jog "hair sits up too high and is too small on
   the head", reading as an oval head): the v2.3.1349 global 0.67 was a
   hand-dialed "shrink 33%" against BODY_DIR_SCALE.jog.east = 1.25, and
   it over-corrects — measured in 256-space, the jog-east head is only
   ~6% narrower than the stand-east head (44px vs 47px), so the correct
   trait multiplier is 44/47 ≈ 0.94, not 0.67.  Every HAT was later
   dialed back up per-id (JOG_EW_HAT_TUNE above, 1.10-1.25 on top of the
   0.67), but hair/beard were left at the raw 0.67: they rendered at
   ~71% of their standing head-coverage, and because _placeTrait anchors
   on the trait's own crown pixel the whole deficit sheds off the
   bottom/back of the skull — small cap riding high, bare oval below.
   1.40 × 0.67 = 0.938 ≈ the measured ratio.  A tune (the hat pattern),
   NOT a change to the global 0.67, so every owner-dialed hat value
   stays exactly as rated. */
const JOG_EW_HAIR_TUNE = { mul: 1.40 };
function hairPoseTune(pose, dir) {
  return (pose === 'jog' && dir === 'east') ? JOG_EW_HAIR_TUNE : null;
}

/* v2.3.1389 (owner: "the head doesn't bob with the armor" + "headwear
   needs to move left with the head"): when the fullset knight figure is
   active, the DRAWN head is the jog-<dir>-head.png overlay — rebuilt
   (tools/rebuild_east_head_track.py) to ride the armor's own 25-frame
   bob and carrying the owner-dialed left shift.  body-tops.json still
   describes the BODY sheet's crown (28-frame cadence, unshifted), so
   hats/hair/beards anchored there slid against the visible head.  This
   table is the rebuilt head sheet's measured per-frame crown ([x, y],
   256-space, one entry per ARMOR frame); _crownOverride swaps it in for
   the trait anchors while the fullset figure is on screen. */
const FULLSET_CROWN = {
  /* v2.3.1390: smoothed track (owner: "really jittery") — the raw
     per-frame measurement stepped up to 10px between adjacent frames;
     this glides ≤4px like body-tops itself.
     v2.3.1455: FLOAT precision + the sub-pixel head residual folded in
     (the old even-integer rounding quantized the track to 2px steps),
     so hats/hair glide with the same corrected head the player sees. */
  east: [[134.6, 47.5], [135.6, 46.8], [136.0, 47.2], [135.4, 47.8], [134.6, 49.3], [134.6, 52.3], [135.0, 54.8], [134.9, 57.1], [134.4, 58.2], [133.9, 56.8], [134.0, 54.1], [134.1, 51.4], [134.6, 48.0], [135.6, 46.5], [136.0, 46.5], [135.6, 47.7], [134.5, 49.2], [134.2, 51.4], [134.6, 52.8], [135.0, 55.5], [134.6, 55.4], [134.0, 53.2], [134.0, 50.7], [134.1, 48.7], [134.1, 47.7]],
};
/* v2.3.1455 (owner: "'slivering' effect like lines are slightly cut and
   moving while jogging where the head meets the torso armor"): the head
   sheet's baked per-frame shift quantizes to whole sheet pixels (2px in
   256-space at the 128px sheet) while the armor's smoothed bob moves
   fractionally, so the head-to-collar seam breathed open/closed ±1px
   through the jog cycle — a thin moving cut line at the neck.  This is
   the FRACTIONAL remainder the bake couldn't carry (256-space, one
   entry per armor frame, emitted by tools/rebuild_east_head_track.py);
   _placePickupHead applies it as a sub-pixel y offset so the drawn head
   rides the armor's true smooth track and the seam stays put. */
const FULLSET_HEAD_RES = {
  east: [0.0, -0.67, 0.22, -0.22, -0.67, -0.22, -0.67, -0.44, 0.22, -0.67, -0.89, 0.44, 0.0, 0.0, 0.0, 0.22, 0.67, 0.89, -0.67, 0.0, 0.44, 0.67, 0.67, 0.67, 0.67],
};
/* v2.3.1540: CONSTANT per-direction seat of the head overlay on the fullset,
   in 256-space [dx, dy] (so 2 = one pixel of the 128px head sheet).  Distinct
   from FULLSET_HEAD_RES above, which is a per-FRAME sub-pixel residual keeping
   the head on the armour's smooth bob -- this is a fixed placement correction
   for a direction whose head simply sits wrong on the plate.
   Owner on the 3/4 front view: "southwest/southeast the head looks a little
   receded inside the armor, like the head is a little too far back and
   slightly under."  [-2,-2] is one sheet pixel forward (down-left is the
   facing) and one up, chosen off a 3x3 grid of 0/-1/-2 on both axes: at -1,-1
   the chin clears the collar cleanly, and by two sheet pixels a gap opens at
   the side of the neck.
   dx rides sb.scale.x, which carries the mirror sign, so SOUTHEAST -- drawn as
   a mirrored southwest -- gets the correction mirrored for free, which is what
   the owner asked for by naming both sides.
   Jog-only in practice: _placePickupHead is gated on the fullset for jog, so an
   unarmoured run is untouched.  tools/seal_jog_neck.py mirrors this table (in
   SHEET px) so the neck seam is measured where the head LANDS. */
const FULLSET_HEAD_SEAT = {
  southwest: [-2, -2],
};

let _crownOverride = null;   // set around the trait placements when fullset is active
function _fullsetCrown(dir, phase) {
  const t = FULLSET_CROWN[dir];
  if (!t || phase == null) return null;
  const p = ((phase % 1) + 1) % 1;
  return t[Math.min(t.length - 1, Math.floor(p * t.length))];
}

/* Place a player's headwear sprite for this frame.  Shared by the local
   player (_updatePlayer) and remote players (_updateOtherPlayers).
   Crown-anchored + placement-independent: pins the hat's own crown
   (meta.anchors[dir]) onto the body crown (body-tops, per frame) plus
   small reusable per-dir/per-pose nudges, scaled to the body.  hatId
   'none' / falsy, or missing art/anchor -> hat hidden.
   v2.3.1353: `tune` ({mul, dy}) — optional per-hat jog-east correction
   from JOG_EW_HAT_TUNE; callers that know the hat id pass it. */
function _placeTrait(sprite, entry, display, pose, dir, mirror, frameIdx, bodyScale, tune) {
  if (!sprite) return;
  /* v2.3.1534: the dodge sheets ship no body-tops entries, and
     _lookupBodyTop's miss path falls back to `stand-<dir>-0` — the STANDING
     crown.  Placing a hat there while the body is a ball on the floor leaves
     it hovering in mid-air for the whole roll, so traits are hidden.
     v2.3.1573 (gear pass) deliberately does NOT lift this.  Gear could be
     fitted because a plate covers a REGION, and a region maps through the
     body's own pixels.  A hat sits on a POINT, and the point body-tops
     records is the topmost opaque pixel — which on frames 3-6 is a boot, not
     a crown, because the body is upside down.  Deriving body-tops for this
     pose would place hats on feet.  Re-enabling traits needs a real per-frame
     head anchor (the head IS separable — it is the bare skin blob left in the
     armoured art, which is how the seal below finds it), not a bodyTop. */
  if (pose === 'dodge') { sprite.visible = false; return; }
  _ensureBodyData();
  /* v2.3.1305: fallbackTex = the NATIVE-color textures behind a recolored
     set.  The color catalogs cache a build as complete even when one
     direction's recolor failed (hairColorCatalog build(): per-dir catch,
     then the whole map is stored) — that hole used to render as an
     INVISIBLE trait for that facing, because the truthy colored map
     replaced the base entry outright.  Wrong-color-but-visible beats
     invisible: fall through to the native texture for just that dir. */
  const headwearTex = entry && (entry.tex[dir] || (entry.fallbackTex && entry.fallbackTex[dir]));
  const meta = entry && entry.meta;
  const spriteBody = display._spriteBody;
  const bodyTop = _crownOverride || _lookupBodyTop(pose, dir, frameIdx); /* v2.3.1389 */
  const anchorPx = (meta && meta.anchors && meta.anchors[dir]) || null;
  if (!(headwearTex && meta && meta.fullFrame && spriteBody && bodyTop && anchorPx)) {
    sprite.visible = false;
    return;
  }
  const headwear = sprite;
  /* screenDir lets meta override a mirrored side independently (e.g.
     crownNudge.west tweaks only the west view, not east).  Falls back
     to the base `dir` key when no per-side override exists.  Note: the
     nudge X is still multiplied by the mirror sign below, so for a
     mirrored side a +X screen shift needs a -X entry. */
  const screenDir = mirror ? (MIRROR_SCREEN_DIR[dir] || dir) : dir;
  const _pick = (obj) => obj && (obj[screenDir] != null ? obj[screenDir] : obj[dir]);
  const nudge = _pick(meta.crownNudge) || [0, 0];
  /* poseNudge[pose][dir]: optional per-pose tweak (stand sheet crown can
     differ from the jog sheet's, so idle vs run may need different lift). */
  const poseN = _pick(meta.poseNudge && meta.poseNudge[pose]) || [0, 0];
  /* scale[dir]: optional per-direction size multiplier (default 1).
     scaleByPose[pose][dir]: optional per-pose MULTIPLIER on top of scale,
     for when the body renders a different size in jog vs stand (the jog
     sheet carries per-direction body-size bumps the hat would otherwise
     ride).  Defaults to 1, so a hat with no scaleByPose is unchanged. */
  const poseScaleObj = meta.scaleByPose && meta.scaleByPose[pose];
  const poseScale = (poseScaleObj && _pick(poseScaleObj)) || 1;
  /* v2.3.875: the mine/fish body art is drawn at a different in-frame height
     than stand (mine ~221px vs stand ~182px, fish ~160px), so a trait scaled
     only by bodyScale reads too small on the taller mining figure (and a touch
     big on the shorter fishing one).  Multiply by the character-height ratio so
     the hat/beard sit on the head the same way they do idle. */
  /* v2.3.1349: jog east (and west via mirror -- 'east' is the stored dir for
     both) renders the whole body at BODY_DIR_SCALE 1.25 to close the jog-east
     source art's small-body-mass gap (v2.3.740), which inflated the
     stand-referenced head traits (hair / beard / hat / hat mask) along with
     it.  Owner: shrink the head + all headwear 33% on that facing.  Applied
     here so every trait AND the hair-clip mask shrink in lockstep around the
     crown anchor. */
  /* v2.3.1487: LEGACY for anything without `poseFit`.  These three numbers are
     blanket by-eye corrections from before per-item pose fitting existed, and
     every trait authored under them — ten hats, plus all the hair and beards,
     which share this function and have no scaleByPose of their own — is dialled
     in AGAINST them.  Removing it outright would resize all of that at once
     (owner: "keep the other hats looking the same").
     An item that sets `poseFit: true` has had its scaleByPose MEASURED against
     the head it is being placed on (tools/tune_headwear.py --fit-pose), so the
     blanket guess would be applied on top of the real answer.  Those opt out,
     and their scaleByPose reads as the true head ratio instead of that ratio
     with 1/0.67 baked in to cancel a constant. */
  const poseTraitMul = meta.poseFit ? 1
    : pose === 'mine' ? 1.21 : pose === 'fish' ? 0.88
      : (pose === 'jog' && dir === 'east') ? 0.67 : 1;
  const dscale = (_pick(meta.scale) || 1) * poseScale * poseTraitMul * ((tune && tune.mul) || 1);
  if (headwear.texture !== headwearTex) headwear.texture = headwearTex;
  /* Anchor the hat sprite on its own crown pixel, then pin that point to
     the body crown's SCREEN position (mirror-correct) + the nudge, with
     only nudge X flipping under mirror.  Offset is a constant +/-nudgeX,
     independent of the per-frame crown sway. */
  const W = 256;
  /* v2.3.1526: normalise by the texture's own size. Everything in meta —
     anchors, crownNudge, poseNudge — is expressed in the 256-space frame the
     art was authored in, and until now the TEXTURE was also 256, so the two
     were the same number and nothing had to convert. Trait frames are stored
     at 128 now (a 4x texture-memory saving, tools/downscale_traits.py), so the
     conversion becomes real: the anchor fraction is still measured against the
     256 frame, and the draw scale is multiplied by 256/texWidth so a half-size
     texture lands at exactly the same on-screen size. A trait still stored at
     256 gets norm=1 and is untouched, so the two can coexist. */
  const norm = W / (headwearTex.width || W);
  headwear.anchor.set(anchorPx[0] / W, anchorPx[1] / W);
  const absBodyScale = Math.abs(bodyScale);
  const m = mirror ? -1 : 1;
  const bodyCrownX = spriteBody.x + (bodyTop[0] - W / 2) * absBodyScale * m;
  const bodyCrownY = spriteBody.y + (bodyTop[1] - W / 2) * absBodyScale;
  headwear.x = bodyCrownX + (nudge[0] + poseN[0]) * absBodyScale * m;
  /* v2.3.1353: tune.dy is a SCREEN-pixel nudge (down-positive), applied
     unscaled so "10px down" means 10px on every device. */
  /* v2.3.1561: tune.dy256 is a 256-space lift (the float-above-hair
     clearance), so it scales with the body — unlike tune.dy above. */
  headwear.y = bodyCrownY + (nudge[1] + poseN[1] + ((tune && tune.dy256) || 0)) * absBodyScale
    + ((tune && tune.dy) || 0);
  /* v2.3.1943: tune.mulX widens a trait WITHOUT making it taller — the band
     refit.  Defaults to 1, so every other trait is untouched. */
  headwear.scale.x = m * absBodyScale * dscale * norm * ((tune && tune.mulX) || 1);
  headwear.scale.y = absBodyScale * dscale * norm;
  headwear.visible = true;
}

/* Headwear + facial-hair share the exact same crown-anchored placement;
   they differ only in which sprite layer + trait cache they use.  A beard
   is just a trait whose meta.crownNudge Y drops it from the head crown
   down to the chin (the inverse of the top-hat's large negative lift). */
function _placeHeadwear(display, hatId, hatColorId, pose, dir, mirror, frameIdx, bodyScale, hairId) {
  const baseEntry = _ensureHeadwearLoaded(hatId);
  /* v2.3.394: retint solid hats to the selected color (recolored textures
     reuse the base meta; fall back to native color while they bake). */
  let entry = baseEntry;
  const colored = getColoredHatTextures(hatId, hatColorId);
  if (colored && baseEntry) entry = { tex: colored, meta: baseEntry.meta, fallbackTex: baseEntry.tex }; /* v2.3.1305 */
  /* v2.3.1561 float lift + v2.3.1943 band refit both depend on which hair is
     on the head this frame, so they are merged into the pose tune rather than
     baked into meta, which cannot know.  v2.3.1959: _hatTune owns that merge
     and _clipHairToHat asks it the same question, so the hair MASK is placed
     with the same numbers as the hat instead of a subset of them. */
  const tune = _hatTune(hatId, entry && entry.meta, hairId, pose, dir, mirror);
  _placeTrait(display._headwearSprite, entry, display, pose, dir, mirror, frameIdx, bodyScale, tune);
}
function _placeFacialHair(display, fhId, fhColorId, pose, dir, mirror, frameIdx, bodyScale) {
  const baseEntry = _ensureFacialHairLoaded(fhId);
  /* v2.3.395: retint the beard to the selected color (recolored textures
     reuse the base meta; fall back to native color while they bake). */
  let entry = baseEntry;
  const colored = getColoredFacialHairTextures(fhId, fhColorId);
  if (colored && baseEntry) entry = { tex: colored, meta: baseEntry.meta, fallbackTex: baseEntry.tex }; /* v2.3.1305 */
  _placeTrait(display._facialHairSprite, entry, display, pose, dir, mirror, frameIdx, bodyScale,
    hairPoseTune(pose, dir)); /* v2.3.1454: beards share the jog-east 0.67 shortfall — same geometric correction */
}
/* v2.3.497: the shirt is no longer an overlay sprite -- it's baked into the
   body (torso skin retinted to the shirt color in playerSkins.getBodyFrame),
   so it follows every pose/frame and reuses the body's own outline.  The old
   _placeShirt / _shirtSprite path was removed; the sprite object is kept but
   left invisible to avoid disturbing the display graph. */

/* v2.3.503: layered gear (paper-doll).  Each gear sheet frame is pixel-aligned
   to the body frame, so placement is just copying the body sprite's transform
   (which already carries mirror + bodyScale + bob).  No anchors/angles.  equip
   = { legs, chest, shoulders } item ids.  See gear-layer-spec.md. */
/* v2.3.748: 'shirt' is a tinted under-layer (white-base sheet x picked colour);
   it is NOT in the masked-body worn list (skin-tight, no body erase). */
const _GEAR_SLOTS = [['shirt', '_gearShirt'], ['legs', '_gearLegs'], ['chest', '_gearChest'], ['shoulders', '_gearShoulders']];
/* v2.3.1459: the v2.3.1216 _FISH_CHEST_DEJITTER table is GONE.  It existed
   because the fish-south gear sheets were one stamp hand-placed with ~2.1x
   the body's sway; tools/rebake_fish_gear.py has since re-baked all three
   sheets (chest/shirt/legs) to warp the stamp onto the body's measured
   per-row motion — sway, lean AND vertical bob (relative wobble now
   <0.7px, was ~4.5).  A runtime X-only correction on top of the tracked
   sheets would re-introduce the very slide it used to cancel. */
/* v2.3.1361 (owner: "Try 1"): pre-composed FULL-SET armored figure.  A
   finished textured knight (helmet included, chain waist baked by the
   artist) ships per (pose,dir) at gear/fullset/steel/<pose>-<dir>.png and
   REPLACES the whole masked-body bake + chest/legs layering when the full
   steel set is worn — no erase, no chain paint, no seams for those dirs.
   A missing sheet (only jog-south ships so far) returns null and the
   classic path runs unchanged.  DISPLAY_DS guard: the sheet rides the 256
   gear pipeline while the body sprite's transform expects display-sized
   frames — identical only while DISPLAY_DS === 1.
   v2.3.1408: guard LIFTED — gearSheets now stores the fullset slot at
   display size (256/DISPLAY_DS, see its buildSheet fullset branch), so
   the figure is a drop-in body frame at any DS and the knight keeps the
   painted-figure path under the half-res memory mode. */
function _fullsetFrame(chestItem, legsItem, pose, dir, frameIdx, phase) {
  if (pose !== 'jog') return null;
  /* v2.3.1757: compare the ART, not the id, so a recoloured pair still gets the
     painted knight figure instead of silently dropping to the overlay path.
     The figure REPLACES the body sprite, so its colour is applied to that
     sprite by the callers (see _fullsetTint).
     ═══ v2.3.1761: ...AND ONLY WHEN BOTH PIECES ARE THE SAME METAL ═══
     Owner: "it didn't display consistently when I was wearing a combo of
     different armor pieces jogging in each direction.  Some directions it
     changed the armor to match the full copper set and other directions it
     correctly showed the iron greaves I was wearing."
     Exactly right, and this line was the cause.  The figure is ONE sheet
     carrying both pieces, so it can only be painted ONE colour — and it was
     taking the chest's.  A mixed pair therefore had its legs repainted to
     match the torso, but only on the jog directions that ship a figure (every
     one but northeast), which is why turning changed the answer.
     Two metals cannot be expressed by one figure, so a mixed pair falls back
     to the layered path, where each piece is tinted on its own sprite. */
  if (gearArt(chestItem) !== 'steelplate' || gearArt(legsItem) !== 'steelgreaves') return null;
  if (gearMaterial(chestItem) !== gearMaterial(legsItem)) return null;
  /* v2.3.1367: when the caller knows the jog cycle PHASE, the sheet plays
     its NATIVE frame count evenly on the same clock (east ships 25 frames
     vs the 28-frame body cycle — no held frames, no wrap jump).  Callers
     that only gate on presence (_placeGear) pass the body frameIdx. */
  if (phase != null) return getGearFramePhased('fullset', 'steel', pose, dir, phase);
  return getGearFrame('fullset', 'steel', pose, dir, frameIdx);
}
/* v2.3.1399: TRUE when a masked-body bake for this (worn set, pose, dir)
   would be dead weight — the fullset knight figure replaces the masked
   composite at runtime for the full steel set on the jog dirs that ship a
   figure (all but northeast), so baking those frames only burns VRAM.
   Both prewarm passes skip on this.  Incident chain: the v2.3.1382 iPhone
   startup OOM was "fixed" by deferring the fullset warm; v2.3.1398 put the
   warm back on the loading gate (owner: assets must load at the login
   screen) and the ~39MB landed on top of ~64MB of these dead bakes —
   context-loss crash loop on iPhone (2026-07-20).  Skipping the dead bakes
   pays for the gated warm with ~25MB to spare.  If a figure ever fails all
   gate retries, the runtime falls back to a lazy on-demand masked bake —
   rare hitch, correct image. */
/* v2.3.1757: the material a fullset figure is worn in.  The figure is armour
   art assigned onto the BODY sprite, so unlike every other gear layer its
   colour has to travel with the body — and be cleared the instant the body
   goes back to being a body, or an unarmoured player jogs around copper. */
function _fullsetTint(chestItem) {
  return gearTint(chestItem);
}
function _fullsetCoversBake(worn, pose, dir) {
  /* v2.3.1408: DISPLAY_DS guard lifted with _fullsetFrame's (the figure
     path now runs at any DS), so the dead-bake skip keeps paying. */
  if (pose !== 'jog' || dir === 'northeast') return false;
  /* v2.3.1757: the worn keys carry the ITEM id, so a recoloured pair has to be
     matched through gearArt or its dead bakes stop being skipped. */
  const artOf = (pfx) => {
    const w = worn.find((x) => x.k && x.k.indexOf(pfx) === 0);
    return w ? gearArt(w.k.slice(pfx.length)) : null;
  };
  if (artOf('chest:') !== 'steelplate' || artOf('legs:') !== 'steelgreaves') return false;
  /* v2.3.1761: a mixed-metal pair does NOT get the figure (see _fullsetFrame),
     so its masked bake is not dead weight — skipping it here would drop the
     player back to a bare body on those frames. */
  const matOf = (pfx) => {
    const w = worn.find((x) => x.k && x.k.indexOf(pfx) === 0);
    return w ? gearMaterial(w.k.slice(pfx.length)) : null;
  };
  return matOf('chest:') === matOf('legs:');
}
/* v2.3.1757: QA probe — the tints the renderer is ACTUALLY drawing gear with.
   It reads the live sprites rather than echoing back what we asked for, so a
   tint clobbered further down the frame still shows up as wrong.  Same posture
   as __btBakeStats / __btPreloadReport. */
let _lastGearDisplay = null;
/* v2.3.1760: the weapon sprites the renderer is holding, for the same reason
   __btGearTints exists — read what is drawn, not what we asked for. */
let _lastWeaponSprite = null, _lastPeerWeaponSprite = null;
if (typeof window !== 'undefined') {
  window.__btWeaponTint = () => ({
    local: _lastWeaponSprite ? _lastWeaponSprite.tint : null,
    peer: _lastPeerWeaponSprite ? _lastPeerWeaponSprite.tint : null,
  });
}
if (typeof window !== 'undefined') {
  window.__btGearTints = () => {
    const d = _lastGearDisplay;
    if (!d) return null;
    const slots = _GEAR_SLOTS.map(([slot, key]) => {
      const spr = d[key];
      return spr
        ? { slot, visible: !!spr.visible, tint: spr.tint,
          src: (spr.texture && spr.texture.source && spr.texture.source.uid) || null }
        : { slot, missing: true };
    });
    const body = d._spriteBody;
    return { slots, bodyTint: body ? body.tint : null };
  };
}
/* v2.3.1872: `legsFrom` lets ONE slot be drawn from a different (pose,frame)
 * than the rest.  The south block needs exactly that and nothing more general:
 * the chest and shirt hold the standing frame while the greaves animate with
 * the jog, or a bro in leg armour blocks with static plates over striding
 * legs.  Null on every other call site, so the normal path is byte-identical. */
/* v2.3.1938: the pair of drawings a display wears, or null when both sides are
   blank (the overwhelmingly common case, and the one that must cost nothing).
   Returned as {front, back} so _placeGear can pick per facing without knowing
   where the drawings came from -- the local player's own store, or a peer's
   off the wire. */
function _shirtArtPair(front, back) {
  const f = artHasInk(front) ? front : null;
  const b = artHasInk(back) ? back : null;
  return (f || b) ? { front: f, back: b } : null;
}

/* v2.3.1941: everything about a shirt that is NOT the shipped sheet -- its
   drawings, its pattern, and its colour -- gathered into one object, because
   they now bake together (see gearSheets.getShirtLookFrame).
   Returns null when there is neither a drawing nor a pattern, and that null is
   load-bearing: it is what keeps a plain coloured shirt on the shared sheet
   with the cheap sprite tint, exactly as it was before any of this existed. */
function _shirtLook(front, back, patternStr, tint) {
  const art = _shirtArtPair(front, back);
  const pattern = parsePattern(patternStr, 'shirt');
  return (art || pattern) ? { art, pattern, tint: tint || null } : null;
}

/* v2.3.1940: the same idea for the two drawings that live INSIDE the body sheet
   (pants print, chest tattoo) rather than on a gear sprite.  Peer strings are
   sanitised here, at the one place a remote's drawings enter the renderer;
   `mirror` rides along because it is part of the bake, not of the drawing. */
function _remoteBodyArt(other, mirror) {
  const p = sanitizeShirtArt(other.pantsArt), t = sanitizeShirtArt(other.tattooArt);
  /* v2.3.1949: face and arm tattoos ride the same sanitiser -- a peer string
     that is not a well-formed 256-char drawing answers null and is dropped
     here, before it can reach a bake key or a canvas. */
  const ft = sanitizeShirtArt(other.faceTattooArt), at = sanitizeShirtArt(other.armTattooArt);
  /* v2.3.2043: and the back of their head, through the same sanitiser. Peers
     draw it via artForFacing exactly as the local player does, so a remote who
     turns away shows THEIR back canvas rather than a blank head. */
  const hb = sanitizeShirtArt(other.headBackTattooArt);
  /* v2.3.2148: and the back of their body, through the same sanitiser -- peers
     resolve it via artForFacing exactly as the local player does. */
  const bb = sanitizeShirtArt(other.bodyBackTattooArt);
  const q = sanitizePattern(other.pantsPattern, 'pants');   /* v2.3.1941 */
  const f = sanitizePattern(other.shoesPattern, 'shoes');   /* v2.3.1944 */
  return (p || t || ft || at || hb || bb || q || f)
    ? { pants: p || '', tattoo: t || '', tattooFace: ft || '', tattooArm: at || '',
      tattooHeadBack: hb || '', tattooBack: bb || '',
      pantsPattern: q, shoesPattern: f, mirror: !!mirror }
    : null;
}

/* ═══ v2.3.2023: THE CAPE ═══
 * A full-frame sticker, so it takes the BODY SPRITE'S transform exactly as a
 * full-frame armour piece does below — import_cape_green.py already fitted
 * each frame into a 256 frame against the real stand-<dir> body, so there is
 * no anchor, no nudge table and no per-facing exception to get wrong.  The
 * mirror is free: sb.scale.x already carries its sign for W / NW / SE.
 *
 * HIDDEN DURING ATTACKS, ON PURPOSE — AND `pose` IS NOT WHAT SAYS SO.
 * During a swing or a bow shot the real body is HIDDEN and the whole figure is
 * redrawn by a stand-in in another layer (effectsRenderer, nodeLayer), and the
 * trap v2.3.1784 records is that `pose` STILL READS 'stand' or 'jog'
 * throughout.  So a pose list cannot catch a swing: measured, the pose never
 * left 'stand' across a full attack.  The load-bearing test is
 * `sb.visible` — is the real body being drawn at all — which tracks the
 * stand-in swap directly instead of inferring it.  The pose list below is
 * belt-and-braces for the poses that DO rename themselves (dodge, pickup),
 * and on its own it would have been the back shield's bug over again.
 *
 * A sprite that keeps drawing against a body that is no longer there hangs in
 * mid-air beside the swing.  The shield had to be drawn TWICE to fix that,
 * which means two renderers holding one piece of geometry, and "the moment a
 * value is copied into two renderers it starts to drift".  For a cosmetic
 * cape that is not worth it: a swing is a few frames, and a missing cape
 * reads far better than a floating one.
 *
 * ═══ v2.3.2190: ...AND THE STAND-IN NOW WEARS ONE OF ITS OWN ═══
 * Owner: "the attack animations need to have the cape anchored on the player's
 * head to look right."  Everything above still holds and none of it changes:
 * THIS path stays off during an attack, because there is still no body here to
 * hang a cape on.  What the owner's word "anchored" points at is that the
 * stand-in HAS a known anchor -- its own per-frame crown, out of crowns.json --
 * and hats, hair, beards and the hair clip have all ridden it since v2.3.867.
 * So the cape is not a second copy of THIS geometry; it is one more sprite pair
 * on an anchor that already exists and is already maintained.  See
 * placeStandInCape, and mp-capeattack for the assertions.
 *
 * ═══ v2.3.2129: WHICH OF THESE WERE ACTUALLY HIDING ANYTHING ═══
 * Owner: "Add it to all the animations as well" -> "yes do the free 8".
 *
 * The list above was written defensively at v2.3.2023, when the cape was one
 * facing old and the question was only "where can it definitely not go
 * wrong".  Ten poses went in.  Read against the renderer, they are three
 * different things and only one of them is a reason:
 *
 *   STAND-IN POSES — chop, cook, fire (and swing, bowshot).  The real figure
 *   is replaced by a whole separate sprite in another layer and the body
 *   container is hidden outright (`_chopHide`, line ~7703; the peer path's
 *   `_rexStandIn`).  These stay listed, but note they were never doing the
 *   work: the container is invisible, so its cape child is too, and `pose`
 *   does not even read 'chop' while chopping.  `sb.visible` is what actually
 *   holds the line here, exactly as the paragraph above says.
 *
 *   REAL-BODY POSES — dodge, mine, fish, pickup, hit.  These draw the
 *   player's own body sprite out of a real sheet, and the cape rides that
 *   sprite's transform like any other full-frame layer.  Nothing was wrong
 *   with them; they were listed because nobody had looked yet.  REMOVED, so a
 *   cape you paid for does not vanish every time you take a hit or bend down
 *   for loot.
 *
 * That is five poses back, not the eight I first told the owner — chop, cook
 * and fire only LOOKED free.  Their entries stay because deleting them would
 * invite the next reader to re-derive all of this. */
const _CAPE_HIDDEN_POSES = { swing: 1, bowshot: 1, chop: 1, cook: 1, fire: 1 };

/* ═══ v2.3.2024: THE CAPE TRAILS WHEN HE RUNS ═══
 * Owner: "The cape needs to be rotated so the back of the character doesn't
 * stick out while running."
 *
 * The art is a standing cape, hanging straight down.  A running figure leans
 * into the direction of travel, so a vertical cape stops covering the back and
 * the character's shoulders and arm show behind it.  Tilting the cape the
 * other way — the hem swinging back along the line of travel — both covers the
 * back and reads as the cape streaming behind him, which is what a cape does.
 *
 * Radians, per BASE facing, applied only while jogging.  The sign follows the
 * direction of travel: running east the hem trails west, so the bottom swings
 * left; running southwest it trails north-east, so the bottom swings the other
 * way.  North and south move toward or away from the camera, where a
 * horizontal tilt would be a lie, so they stay at zero and rely on the crown
 * offset alone.
 *
 * A TABLE, not a formula, because the five facings are drawn at five different
 * three-quarter angles and the amount that reads correctly is not a projection
 * of anything — it is a look.  Mirrored facings negate it, for the same reason
 * the body's own scale.x carries its sign. */
/* v2.3.2025: owner, "angled more with jog" -- doubled.
   v2.3.2125: owner, "angled more aggressively so that the back of his body
   doesn't show behind it" -- 1.5x again (east 0.30 -> 0.45).  Chosen off a
   rendered ladder at 1x / 1.5x / 2x / 2.5x, and the ladder is why it is not
   more: past about 1.5x the rotation stops covering the back and starts
   LIFTING THE HEM off it, because the cape swings about the shoulders -- at
   2.5x the hem is near horizontal and the lower back is barer than it was at
   1x. More angle is not monotonically more cover, which is the thing that is
   not obvious from the ask. */
/* v2.3.2126: owner, of the v2.3.2125 ladder -- "Last cape frame most angled is
   correct". That frame was 2.5x the THEN-current table (east 0.30), i.e. 0.75
   rad, so the table takes those absolute values rather than another multiplier:
   a scale is meaningless once the thing it scales has moved, which is the trap
   the sweep that produced this fell into first (it asked for 2.5x again and
   rendered 1.125 rad -- a rung off a ladder nobody had looked at). */
const _CAPE_JOG_TILT = { east: 0.75, northeast: 0.50, southwest: -0.50, north: 0, south: 0 };
/* Where the cape swings FROM: the shoulders, not the middle of the frame.
   Pivoting about the centre would swing the hood as far as the hem and take
   the hood off the head, which is the thing v2.3.2023b just fixed.

   v2.3.2125: 0.27 -> 0.31, and this is a CONSEQUENCE of v2.3.2122-2124 rather
   than a taste change. The pivot is a fraction of the 256 FRAME, but what it
   needs to sit on is the shoulders of the ART -- and the art just moved 10px
   down inside that frame. Left at 0.27 the swing had crept up from the
   shoulders towards the neck, which is the "hanging off the side of his head"
   half of the report. 10/256 = 0.039, so 0.31 puts it back where it was. */
const _CAPE_PIVOT_Y = 0.33;   /* v2.3.2126: the picked frame's value */

/* ═══ v2.3.2126: AND SLIDE IT BACK ALONG THE LINE OF TRAVEL ═══
 * Owner, picking the hardest angle off the ladder: "Last cape frame most
 * angled is correct but needs to nudge left to fit."
 *
 * Rotation alone cannot put it there, and the reason is what the pivot IS. The
 * cape turns about the shoulders, so the hem swings one way and the HOOD
 * swings the other -- and at the angle the owner chose the hood has come far
 * enough forward to sit over the face. Sliding the whole sprite back along the
 * line of travel re-seats the hood on the head and carries the hem with it,
 * which a bigger or smaller angle cannot do: those trade the two ends against
 * each other, and this moves both at once.
 *
 * In 256-space, applied only while jogging, and MIRRORED like the tilt -- the
 * offset is "backwards along the direction of travel", not "left on screen",
 * so running west it has to go the other way or the cape would lead him. Same
 * sign convention the tilt already uses, for the same reason. */
/* v2.3.2127: owner, of the slide ladder -- "Only the furthest right frame
   looked correct", which is -28. My reading of "nudge left" had been that it
   would walk the hood off the head, and the pictures said so plainly at -20
   and -28; the owner looked at the same pictures and chose -28 anyway. The
   rendering was right and the JUDGEMENT was mine to lose: at this angle the
   hood is meant to ride back off the crown, because the figure is leaning into
   the run and the hood is trailing with the rest of the garment.
   The diagonals scale with the tilt (0.50/0.75 of east), so the whole table
   keeps one shape rather than three independent hand-set numbers. */
const _CAPE_JOG_DX = { east: -28, northeast: -19, southwest: 19, north: 0, south: 0 };

/* ═══ v2.3.2189: HOW MUCH OF THAT MOTION THE HOOD TAKES ═══
 * Fractions of the two numbers above, not a second table: the panels' tilt and
 * slide have been tuned by the owner three times (v2.3.2025, 2125, 2126-2127)
 * and re-tuning them must keep moving the whole garment.  See the long note in
 * _placeCape for why a hood cannot take the panels' motion at all.
 *
 * BOTH ARE ZERO, and that is the answer the pictures gave rather than a
 * placeholder: at 0 the hood sits exactly where the STANDING frames put it --
 * on the crown, tracking the head's own bob through the body-tops offset the
 * placement already applies -- and standing is the one pose that has never been
 * reported wrong.  A fraction of the panel motion is the obvious middle ground
 * and it is NOT free, because the pivot is at the shoulders: a partial swing
 * about a point below the neck still TRANSLATES the hood off the head, just
 * less far, so buying a little lean costs a little of the seat that was the
 * bug.  If a lean is ever wanted, the pivot has to move onto the neck first.
 * They exist as named constants, and as bench handles below, so that round is
 * a sweep rather than a rebuild. */
const _CAPE_HOOD_TILT_K = 0;
const _CAPE_HOOD_DX_K = 0;

/* ═══ v2.3.2125: THE TWO NUMBERS THIS KEEPS BEING ASKED TO CHANGE ═══
 * The tilt has now been re-asked for twice ("angled more with jog", v2.3.2025;
 * "angled more aggressively so the back of his body doesn't show behind it",
 * this version), and the pivot moves whenever the ART moves inside its frame —
 * which it just did, by 10px (v2.3.2122-2124).  Both are pure LOOK: no
 * measurement settles them, only rendering the jog and looking at it.
 *
 * So they are overridable at runtime.  Not a feature and not a setting — a
 * bench, so a tuning round is one harness run that sweeps values and
 * photographs each, instead of four rebuilds.  Absent the handle these read
 * exactly as the constants above, which is every session that is not a QA
 * scenario deliberately setting it. */
function _capeTune(dir) {
  let t = null;
  try { t = window.__btCapeTune || null; } catch (e) { t = null; }
  const base = _CAPE_JOG_TILT[dir] || 0;
  /* ═══ v2.3.2153: THE DEFAULT BRANCH OWES A `dx` TOO ═══
     Owner, for the third time: "Cape still disappears on jog."

     v2.3.2126 added the jog slide and added it to ONE of these two returns.
     This is the branch every real session takes -- the other needs
     window.__btCapeTune, which only a QA bench sets -- and without `dx` the
     caller computes `undefined * scale * ±1`, which is NaN, and writes NaN
     into spr.x. A sprite at NaN never rasterises. So the cape vanished for
     every player on every jog, while the tuning sweep that was built to
     photograph this exact animation kept producing a perfect cape, because
     setting __btCapeTune is what put a number back in the object.

     That is also why three rounds of scene-graph assertions missed it: the
     sprite is visible, its texture is right, its scale matches the body and
     its rotation is applied. Only the position is poisoned. */
  if (!t) {
    return { tilt: base, pivotY: _CAPE_PIVOT_Y, dx: (_CAPE_JOG_DX[dir] || 0),
      hoodTiltK: _CAPE_HOOD_TILT_K, hoodDxK: _CAPE_HOOD_DX_K };
  }
  /* A tilt of 0 is meaningful (north/south face the camera, where a sideways
     lean would be a lie), so scale rather than replace: one knob moves the
     whole table and cannot accidentally give north a tilt it must not have. */
  const k = (typeof t.tiltScale === 'number') ? t.tiltScale : 1;
  return {
    tilt: base * k,
    pivotY: (typeof t.pivotY === 'number') ? t.pivotY : _CAPE_PIVOT_Y,
    /* v2.3.2126: absolute, not scaled -- the table has a ZERO for north and
       south (they face the camera; a sideways slide there would be the same
       lie a sideways tilt would), and scaling cannot move a zero.  A sweep
       needs to be able to ask "what does -20 look like on east". */
    dx: (typeof t.jogDx === 'number') ? t.jogDx : (_CAPE_JOG_DX[dir] || 0),
    /* v2.3.2189: the same shape -- absolute, because 0 is the shipped value
       and scaling cannot move a zero.  This is the whole point of the bench:
       asking "what does a quarter of the panel tilt look like on the hood". */
    hoodTiltK: (typeof t.hoodTiltK === 'number') ? t.hoodTiltK : _CAPE_HOOD_TILT_K,
    hoodDxK: (typeof t.hoodDxK === 'number') ? t.hoodDxK : _CAPE_HOOD_DX_K,
  };
}

function _placeCape(display, capeId, pose, dir, mirror, frameIdx) {
  const spr = display && display._capeSprite;
  if (!spr) return;
  const back = display._capeBackSprite || null;              /* v2.3.2186 */
  const sb = display._spriteBody;
  const off = (!capeId || capeId === 'none' || _CAPE_HIDDEN_POSES[pose]);
  const tex = off ? null : getCapeTexture(capeId, dir);
  if (!tex || !sb || !sb.visible) {
    if (spr.visible) spr.visible = false;
    if (back && back.visible) back.visible = false;
    /* v2.3.2186: and the hair clip goes with it.  Leaving _btReady set here
       would clip the hair to a hood that is NOT on screen -- which is not a
       cosmetic slip but a bald patch, and it would fire on every swing, chop,
       cook and fire pose, all of which hide the cape (_CAPE_HIDDEN_POSES).
       Found by the capehair probe reading maskedToHood=true while both cape
       sprites were invisible. */
    const hm0 = display._capeHoodMask;
    if (hm0) hm0._btReady = false;
    return;
  }
  /* ═══ v2.3.2186: WHICH HALF GOES WHERE ═══
   * Owner: "the left side of the cape should be occluded by characters body.
   * Then mirrored for the other side."
   *
   * The cape is two garments on opposite sides of the person: the HOOD is over
   * the skull and must draw in front, the PANELS hang from the shoulders and
   * must draw behind.  v2.3.2023 drew both in front because the art is one
   * whole-mannequin picture, and the panels then covered the torso -- the slab
   * the owner photographed.
   *
   * A hood texture EXISTING is the signal that this facing is split (south,
   * southwest, east).  north and northeast deliberately have none: they are the
   * back view, where the cape is between the viewer and the character and
   * correctly covers them, so they keep the single in-front sprite they always
   * had.  Reading the split off the art rather than off a dir list here means
   * a new cape that ships hood frames for more facings just works.
   *
   * Both textures are full 256 frames at the identical fitted position
   * (tools/cape/split-cape-hood.py), which is why the transform below is
   * computed ONCE and copied: no second placement path can drift out of step
   * with the jog tilt, the pivot or the crown offset. */
  const hoodTex = off ? null : getCapeHoodTexture(capeId, dir);
  const split = !!(hoodTex && back);
  const frontTex = split ? hoodTex : tex;
  if (spr.texture !== frontTex) spr.texture = frontTex;
  if (back) {
    if (split) {
      if (back.texture !== tex) back.texture = tex;
      if (!back.visible) back.visible = true;
    } else if (back.visible) {
      back.visible = false;
    }
  }
  const norm = 256 / ((tex.frame && tex.frame.width) || 256);
  spr.scale.x = sb.scale.x * norm / DISPLAY_DS;
  spr.scale.y = sb.scale.y * norm / DISPLAY_DS;
  /* ═══ v2.3.2023b: THE CAPE FOLLOWS THE FRAME'S OWN CROWN ═══
   * The art is a STANDING still, and the standing figure is not where the
   * figure is on a jog frame: measured from body-tops.json, the crown moves
   * +18x and +21y in 256-space between stand-east-0 and jog-east.  Pinned to
   * the frame origin the hood stays over the standing head while the real head
   * runs out from under it, and the owner's first question about the jog was
   * exactly that -- the face pokes out in front of the hood.
   * So the cape is offset by this frame's crown against the standing crown the
   * art was fitted to.  It rides the same body-tops table hats are placed
   * from, which means it also bobs with the stride rather than sitting rigid
   * while the body moves under it.
   * Mirrored facings flip the X term, for the same reason the body's own
   * scale.x carries its sign. */
  const nowTop = _lookupBodyTop(pose, dir, frameIdx);
  const standTop = _lookupBodyTop('stand', dir, 0);
  let dx = 0, dy = 0;
  if (nowTop && standTop) {
    dx = (nowTop[0] - standTop[0]) * Math.abs(spr.scale.x) * (mirror ? -1 : 1);
    dy = (nowTop[1] - standTop[1]) * Math.abs(spr.scale.y);
  }
  /* v2.3.2024: swing it from the shoulders while running.  The anchor moves off
     centre so the rotation pivots there, and y is compensated by the same
     amount so the cape does not also jump up the screen when it tilts. */
  const tune = _capeTune(dir);                                   /* v2.3.2125 */
  const drawnH = Math.abs(spr.scale.y) * ((tex.frame && tex.frame.height) || 256);
  /* v2.3.2126: the jog slide, in the same 256-space the crown offset above is
     in, so it scales with the sprite exactly as that does. */
  /* v2.3.2153: coerced, and NOT because the value above is in doubt. This is
     the line that turned one missing table entry into an invisible cape, and
     it would do it again for the next dir added to _CAPE_JOG_DX without a
     matching entry. A cape one pixel out of place is a bug you can see; a
     cape at NaN is a bug that looks like the feature was never built. */
  const _tuneDx = Number(tune.dx) || 0;
  const jogging = (pose === 'jog');
  /* THE PANELS' motion: the tilt and the slide, exactly as tuned in
     v2.3.2024-2127.  Nothing about these two numbers changes. */
  const panelTilt = jogging ? (tune.tilt * (mirror ? -1 : 1)) : 0;
  const panelSlide = jogging
    ? (_tuneDx * Math.abs(spr.scale.x) * (mirror ? -1 : 1))
    : 0;
  /* ═══ v2.3.2189: A HOOD IS NOT CLOTH ═══
   * Owner: "East jog cape covers player face" and "Southwest jog the cape is
   * aligned too far to the right on his head."
   *
   * Both are the same bug wearing two costumes, and it is the LAST thing left
   * over from before the hood split.  v2.3.2186 cut the garment in two but
   * still computed one transform and copied it, on the reasoning that any
   * divergence "would be a bug by construction".  That reasoning holds for the
   * SCALE and the CROWN OFFSET -- both halves are the same 256 box fitted to
   * the same body -- and it is wrong for the two numbers that describe how
   * cloth MOVES:
   *
   *   the tilt   swings the garment 0.75 rad about the shoulders on east.  On
   *              the panels that is the cloth streaming behind a runner.  On
   *              the hood it rotates a hat 43 degrees about a point below the
   *              neck, which walks it forward and down until its front rim
   *              sits over the face.  Photographed: jog-east, the face gone.
   *   the slide  pushes the garment 19-28px BACKWARDS along the line of travel,
   *              so the hem trails.  A head does not trail.  On southwest the
   *              +19 carries the hood bodily off the skull to the right, which
   *              is the owner's second report word for word.
   *
   * The panels hang from the shoulders and swing; the hood is ON the skull and
   * goes where the skull goes -- which is what the crown offset above already
   * says, and which is why the STANDING frames (tilt 0, slide 0) were never
   * reported: standing, the hood is already seated correctly.
   *
   * So the two halves get their own motion, scaled off the panels' by the two
   * K's below rather than by an independent table -- one number still moves the
   * whole garment, and a hood cannot drift out of proportion with the panels it
   * is stitched to.  Zero means "rides the head", which is what the pictures
   * chose; they are constants rather than inlined zeros so the next tuning
   * round is a sweep and not a rebuild, exactly as tilt and pivot already are.
   *
   * UNSPLIT facings (north/northeast) are untouched: there is no separate hood
   * sprite there, `spr` IS the whole garment, and it keeps the panel motion. */
  const hoodTilt = panelTilt * tune.hoodTiltK;
  const hoodSlide = panelSlide * tune.hoodDxK;
  /* One seat for every layer, so the scale, the pivot and the y-compensation
     cannot drift between them -- only the two motion terms differ, and they
     are arguments. */
  const seat = (s, tiltVal, slideVal) => {
    s.scale.x = spr.scale.x; s.scale.y = spr.scale.y;
    if (s.anchor.y !== tune.pivotY) s.anchor.set(0.5, tune.pivotY);
    if (s.rotation !== tiltVal) s.rotation = tiltVal;
    s.x = sb.x + dx + slideVal;
    s.y = sb.y + dy - (0.5 - tune.pivotY) * drawnH;
  };
  if (back && back.visible) seat(back, panelTilt, panelSlide);
  seat(spr, split ? hoodTilt : panelTilt, split ? hoodSlide : panelSlide);
  if (!spr.visible) spr.visible = true;
  /* v2.3.2186: and the hair clip rides the same transform -- v2.3.2189: the
     HOOD's, since it is the hood's silhouette it clips to.  Left INVISIBLE --
     a mask is sampled, not drawn, and showing it would paint a white hood. */
  const hoodMask = display._capeHoodMask;
  if (hoodMask) {
    const mtex = split ? getCapeHoodMaskTexture(capeId, dir) : null;
    if (mtex) {
      if (hoodMask.texture !== mtex) hoodMask.texture = mtex;
      seat(hoodMask, hoodTilt, hoodSlide);
      hoodMask._btReady = true;
    } else {
      hoodMask._btReady = false;
    }
  }
}

function _placeGear(display, equip, pose, dir, frameIdx, legsFrom) {
  _lastGearDisplay = display;
  const sb = display._spriteBody;
  /* v2.3.1361: the fullset figure carries ALL its armor — hide every gear
     layer so nothing double-draws over the finished art. */
  if (_fullsetFrame(equip && equip.chest, equip && equip.legs, pose, dir, frameIdx)) {
    for (let s = 0; s < _GEAR_SLOTS.length; s++) {
      const spr = display[_GEAR_SLOTS[s][1]];
      if (spr && spr.visible) spr.visible = false;
    }
    return;
  }
  for (let s = 0; s < _GEAR_SLOTS.length; s++) {
    const spr = display[_GEAR_SLOTS[s][1]];
    if (!spr) continue;
    const item = equip && equip[_GEAR_SLOTS[s][0]];
    /* v2.3.809: the shirt is an under-layer, and on some jog frames its
       sleeves/hem poke through the chest plate (the plate silhouette is not
       a strict superset of the shirt's).  Owner call: the shirt is fully
       hidden while a torso piece is worn -- it pops back on unequip. */
    const hiddenUnderChest = _GEAR_SLOTS[s][0] === 'shirt' && equip && equip.chest && equip.chest !== 'none';
    /* v2.3.1872: per-slot pose/frame override (south block's jogging greaves). */
    const _slotName = _GEAR_SLOTS[s][0];
    const _from = (legsFrom && _slotName === 'legs') ? legsFrom : null;
    const _gPose = _from ? _from.pose : pose;
    const _gFrame = _from ? _from.frameIdx : frameIdx;
    let tex = (sb && item && item !== 'none' && !hiddenUnderChest) ? getGearFrame(_slotName, item, _gPose, dir, _gFrame) : null;
    /* v2.3.1938: a drawn shirt swaps in a second bake of the same sheet with
       the print on it.  Falls through to the plain frame while that bakes, so
       putting a drawing on never blinks the shirt off.
       v2.3.1941: a PATTERNED shirt does the same, and the bake now carries the
       shirt COLOUR as well -- so when this swap happens the sprite must be
       drawn untinted or the colour would be applied twice (and the pattern and
       print would be multiplied by it).  `_shirtBaked` carries that decision
       the few lines down to where the tint is set. */
    let _shirtBaked = false;
    if (tex && _slotName === 'shirt' && display._shirtLook) {
      /* Mirroring never changes WHICH side shows: every mirror pair stays in
         the same hemisphere (east/west and southwest/southeast are both front,
         northeast/northwest both back), so the base dir decides the side and
         the mirror flag only pre-flips the print. */
      const _L = display._shirtLook;
      const dressed = getShirtLookFrame(item, _gPose, dir, _gFrame, {
        art: _L.art ? _L.art[sideForDir(dir)] : null,
        pattern: _L.pattern, tint: _L.tint, mirror: display._shirtArtMirror,
      });
      if (dressed) { tex = dressed; _shirtBaked = true; }
    }
    if (tex) {
      if (spr.texture !== tex) spr.texture = tex;
      spr.x = sb.x; spr.y = sb.y;
      /* v2.3.1056: legs-only pickup -- drop the greaves so they sit on the bare
         legs like shin guards (owner-tuned per crouch depth).  Full set keeps
         them aligned to the cuirass. */
      if (_GEAR_SLOTS[s][0] === 'legs' && pose === 'pickup' && (!equip || !equip.chest || equip.chest === 'none')) {
        let _dy = 10;                                   // frames 0-17
        if (frameIdx >= 18 && frameIdx <= 23) _dy = 5;  // fourth row -- up 5
        else if (frameIdx >= 24) _dy = 20;              // last row
        if (frameIdx === 28) _dy = 30;                  // very last frame -- 10 lower
        spr.y += _dy * sb.scale.y / DISPLAY_DS;          // v2.3.1120: _dy is 256-space; sb.scale carries the DISPLAY_DS factor
      }
      /* v2.3.1056: torso-only pickup -- drop the cuirass 18px in the deepest-
         crouch last row (frames 24-28) so it sits on the bent torso. */
      if (_GEAR_SLOTS[s][0] === 'chest' && pose === 'pickup' && frameIdx >= 24 && (!equip || !equip.legs || equip.legs === 'none')) {
        spr.y += 18 * sb.scale.y / DISPLAY_DS;           // v2.3.1120: 256-space offset
      }
      /* v2.3.1056: shirt -- drop 15px in the deepest-crouch last 5 frames
         (24-28) so it sits on the bent torso (shows only when no chest plate;
         applies to shirt-only and legs+shirt). */
      if (_GEAR_SLOTS[s][0] === 'shirt' && pose === 'pickup' && frameIdx >= 24) {
        spr.y += 15 * sb.scale.y / DISPLAY_DS;           // v2.3.1120: 256-space offset
      }
      /* v2.3.1120: gear sheets are NOT display-downscaled (still 256), but the
         body transform sb.scale carries the DISPLAY_DS factor for the smaller
         body -- divide it back out so the 256 gear renders at the right size and
         stays pixel-aligned over the body.
         v2.3.1434: normalize by the texture's OWN frame width instead of
         assuming 256 -- gearSheets now stores display-sized (exact-texel)
         sheets when the art ships at 128 on disk, and this factor is what
         keeps both generations rendering at the identical world size. */
      const _gnorm = 256 / ((tex.frame && tex.frame.width) || 256);
      spr.scale.x = sb.scale.x * _gnorm / DISPLAY_DS; spr.scale.y = sb.scale.y * _gnorm / DISPLAY_DS;
      if (_GEAR_SLOTS[s][0] === 'shirt') {
        /* v2.3.1941: a dressed bake already HAS the colour in its pixels. */
        const t = _shirtBaked ? null : (equip && equip.shirtTint);
        spr.tint = t ? ((t[0] << 16) | (t[1] << 8) | t[2]) : 0xffffff;
      } else {
        /* v2.3.1757: the material recolor rides the SAME per-sprite tint the
           shirt colour has always used — a multiply inside the batcher, so a
           copper set costs nothing a steel one doesn't.  Native pieces resolve
           to 0xffffff (a no-op), which is why this is unconditional: a sprite
           reused from a recoloured piece must be reset or the next player to
           borrow it wears the wrong metal. */
        spr.tint = gearTint(item);
      }
      if (!spr.visible) spr.visible = true;
    } else if (spr.visible) spr.visible = false;
  }
  /* v2.3.1347: the jog chain belt has no layer of its own anymore — it is
     painted onto the exposed waist (the green/pants band) inside the
     masked-body bake (_maskedBodyFrame), using the frame-aligned belt sheet
     belt/chainbelt/jog-<dir>.png as the texture source.  The art's own
     hand-drawn depth (arm over waist, plate over seam) applies to the chain
     automatically.  Other poses keep their baked belts (backlog). */
}
/* v2.3.608: per-region body sub-sprites.  Helmet/chest/legs are independent
   slots; the body is drawn as three region sprites (head / torso+arms / legs)
   cut from the SAME body frame, so they always reconstruct the body exactly.
   A region is shown only when its slot's armour is OFF (covered regions are
   hidden -> no underbody poke, no mask).  The body regions use the NAKED scale
   (independent lever) while the gear keeps the armour-fit scale, bottom-aligned
   to the same feet, so a bare region reads at naked proportions even next to a
   plate piece.  Row splits are frame fractions measured off the sheets. */
const BODY_NECK_FRAC = 0.30;
const BODY_WAIST_FRAC = 0.585;
const REGION_ROWS = {
  head: [0, Math.round(256 * BODY_NECK_FRAC)],
  torso: [Math.round(256 * BODY_NECK_FRAC), Math.round(256 * BODY_WAIST_FRAC)],
  legs: [Math.round(256 * BODY_WAIST_FRAC), 256],
};
const _regionTexCache = new WeakMap();
function _bodyRegionTex(bodyTex, region) {
  if (!bodyTex) return null;
  let m = _regionTexCache.get(bodyTex);
  if (!m) { m = {}; _regionTexCache.set(bodyTex, m); }
  if (!m[region]) {
    const f = bodyTex.frame; const [r0, r1] = REGION_ROWS[region];
    /* v2.3.1120: REGION_ROWS are 256-space; the DISPLAY frame may be downscaled,
       so map the band rows into the actual (possibly smaller) frame height. */
    const _rsc = f.height / 256;
    const rr0 = Math.round(r0 * _rsc), rr1 = Math.round(r1 * _rsc);
    try { m[region] = new Texture({ source: bodyTex.source, frame: new Rectangle(f.x, f.y + rr0, f.width, rr1 - rr0) }); }
    catch (e) { m[region] = bodyTex; }
  }
  return m[region];
}

/* ═══ v2.3.1872: AN ARBITRARY ROW BAND OF A BODY/GEAR FRAME ═══
 * _bodyRegionTex above crops the three NAMED bands (head/torso/legs) and
 * caches by name.  The south block's composite needs a band whose boundary
 * MOVES — it cuts at the jog frame's own waist row, which is different on
 * every frame of the cycle — so this is the same crop keyed by the rows
 * themselves.  Same 256-space contract: r0/r1 are rows in the authored
 * 256px frame and are mapped into whatever the DISPLAY frame's height is.
 * Cached per source texture, so a cycle of 24 jog frames builds 24 entries
 * once and then reuses them forever. */
const _bandTexCache = new WeakMap();
function _bandTex(tex, r0, r1) {
  if (!tex) return null;
  let m = _bandTexCache.get(tex);
  if (!m) { m = {}; _bandTexCache.set(tex, m); }
  const key = r0 + ':' + r1;
  if (!m[key]) {
    const f = tex.frame;
    const _rsc = f.height / 256;
    const rr0 = Math.max(0, Math.round(r0 * _rsc));
    const rr1 = Math.min(f.height, Math.round(r1 * _rsc));
    if (rr1 <= rr0) return null;
    try { m[key] = new Texture({ source: tex.source, frame: new Rectangle(f.x, f.y + rr0, f.width, rr1 - rr0) }); }
    catch (e) { m[key] = null; }
  }
  return m[key];
}

/* Place one band sprite at the body's own transform.  Identical arithmetic to
 * _placeBodyRegions: the band's CENTRE row, in 256-space, offset from the
 * frame's centre (128) and carried through sb's scale.  Keeping the two in
 * step by construction is why this is written as the same expression rather
 * than a new one. */
function _placeBand(spr, sb, tex, r0, r1) {
  if (!spr) return false;
  const t = _bandTex(tex, r0, r1);
  if (!t) { spr.visible = false; return false; }
  if (spr.texture !== t) spr.texture = t;
  spr.scale.x = sb.scale.x; spr.scale.y = sb.scale.y;
  spr.x = sb.x;
  spr.y = sb.y + ((r0 + r1) / 2 - 128) * sb.scale.y / DISPLAY_DS;
  spr.tint = sb.tint;
  spr.alpha = sb.alpha;
  spr.visible = true;
  return true;
}

/* ═══ v2.3.1872: THE SOUTH BLOCK, FROZEN ON TOP AND JOGGING BELOW ═══
 *
 * Owner: "the same frozen torso half so jogging while blocking doesn't look
 * weird."
 *
 * Every other facing gets this free: blocking there swaps the whole figure
 * for the bow stand-in, whose jog-legs composite (v2.3.1072) already draws
 * animated legs beneath a leg-erased torso.  South cannot use that pose —
 * its body sheet is holed through the face (v2.3.1805) — so it blocks on the
 * REAL walking body, which has no such composite and therefore jogged with
 * everything moving: both arms swinging under a shield that does not.
 *
 * So the same trick, built here: the STANDING frame above the waist and the
 * JOG frame below it, as two bands of one figure.  Three things make that
 * safe rather than fiddly:
 *   - the cut is the jog frame's OWN waist row (jogWaist.js), which is why
 *     the bands meet at the hips through the whole stride instead of at a
 *     fixed row the bob walks away from;
 *   - both bands ride sb's transform, so they cannot drift apart or from the
 *     gear, which copies the same transform;
 *   - the bands are complementary — [0,cut) and [cut,256) — so there is
 *     never a seam of two legs or a gap of none.
 *
 * ARMOUR IS PART OF IT, not an afterthought.  The masked-body bake erases the
 * body under worn plate so it cannot poke past a plate edge, and the mask is
 * per (pose,frame) — so the jog half is baked against the JOG gear frames,
 * and _placeGear draws the greaves from the jog frame too (its `legsFrom`
 * override).  Without both, a bro in leg armour blocks with static plates
 * over striding legs.
 *
 * Returns false whenever it cannot draw the pair — art not loaded, no waist
 * row for this frame — and parks both sprites, so the caller keeps the plain
 * body rather than half a figure.
 */
function _placeSouthBlockLegs(display, sb, o) {
  const top = display && display._southTop, legs = display && display._southLegs;
  if (!top || !legs) return false;
  const park = () => { top.visible = false; legs.visible = false; return false; };
  if (!o || !o.active || !sb || !o.standTex) return park();
  const cut = jogWaistRow(o.dir, o.jogFrame);
  if (!cut || cut <= 0 || cut >= 256) return park();
  const jogRaw = getBodyFrame(o.skin, o.pants, o.shoes, 'jog', o.dir, o.jogFrame, o.shirtT, o.shirtKey, o.eyeId, o.bodyArt);
  if (!jogRaw) return park();
  /* The jog half's mask needs the jog frame's OWN gear silhouettes; reusing
     the standing frame's would erase the body along last frame's plate edge. */
  let jogTex = jogRaw;
  try {
    const wornJog = [];
    for (const sl of ['chest', 'legs']) {
      const it = getEquip(sl);
      if (it && it !== 'none') {
        const gt = getGearFrame(sl, it, 'jog', o.dir, o.jogFrame);
        if (gt) wornJog.push({ k: sl + ':' + it, tex: gt });
      }
    }
    if (wornJog.length) jogTex = _maskedBodyFrame(jogRaw, wornJog, 6, { pose: 'jog', dir: o.dir, frameIdx: o.jogFrame });
  } catch (e) { jogTex = jogRaw; }
  if (!_placeBand(top, sb, o.standTex, 0, cut)) return park();
  if (!_placeBand(legs, sb, jogTex, cut, 256)) { top.visible = false; return park(); }
  /* The whole body sprite would draw its own standing legs UNDER the jog
     band and show around their edges — two pairs of legs, which is the bug
     this composite exists to avoid. */
  sb.visible = false;
  if (typeof window !== 'undefined') {
    window.__btSouthBlockBody = {
      on: true, cut, jogFrame: o.jogFrame, dir: o.dir,
      topVisible: top.visible, legsVisible: legs.visible, bodyHidden: !sb.visible,
      topY: +top.y.toFixed(2), legsY: +legs.y.toFixed(2),
    };
  }
  return true;
}

/* v2.3.611: masked body.  The AI-drawn armour frames are a few px off the body
   frames, so the body pokes past the plate edges.  Erase the body wherever the
   worn armour (dilated by `dilate` px to swallow the misalignment) covers, so it
   can never poke; the body still shows in bare regions.  Computed on a canvas
   and cached per (body-frame, loadout) -- cheap, recomputed only on a cache
   miss.  Falls back to the raw body texture if pixel access fails. */
const _maskedBodyCache = new Map();
/* v2.3.1349: exported for tools/qa/belt-harness (headless ground-truth render
   of the REAL bake — the offline Python mirrors kept diverging).  Not used by
   any game path. */
export function _maskedBodyFrame(bodyTex, worn, dilate, poseInfo) {
  /* v2.3.690: bake accounting for the perf HUD (?perf=1).  Cache misses are
     the spike source -- a gear swap rebakes every frame on next sighting.
     Read + reset by perfHud; zero cost beyond two adds per MISS. */
  const _bt0 = (typeof performance !== 'undefined') ? performance.now() : 0;
  const _bs = (typeof window !== 'undefined')
    ? (window.__btBakeStats || (window.__btBakeStats = { count: 0, ms: 0 }))
    : null;
  try {
    return _maskedBodyFrameInner(bodyTex, worn, dilate, _bt0, _bs, poseInfo);
  } finally { /* timing recorded inside on actual bakes only */ }
}
function _maskedBodyFrameInner(bodyTex, worn, dilate, _bt0, _bs, poseInfo) {
  if (!bodyTex || !worn.length) return bodyTex;
  let bres;
  try { bres = bodyTex.source && bodyTex.source.resource; } catch (e) { bres = null; }
  if (!bres) return bodyTex;
  const key = (bodyTex.uid != null ? bodyTex.uid : '') + '|' + worn.map(w => w.k).join(',') + '|' + dilate;
  const hit = _maskedBodyCache.get(key);
  /* v2.3.704: LRU, not FIFO.  A hit re-inserts the key so the frames being
     RENDERED (the worn set, every frame) sit at the back of the eviction
     queue.  Under FIFO they stayed at the front -- the oldest inserts -- so
     every cold insert (rare-pose lazy bake, a remote player, an equip
     re-prewarm) evicted a HOT frame, which then rebaked + re-inserted and
     evicted the next hot frame: a rolling ~10ms-per-frame bake thrash that
     read as a stutter after every gear swap. */
  if (hit) { _maskedBodyCache.delete(key); _maskedBodyCache.set(key, hit); return hit; }
  let _beltPending = false;  /* v2.3.1347: belt sheet not loaded yet -> skip caching */
  let cv;
  try {
    cv = document.createElement('canvas'); cv.width = 256; cv.height = 256;
    const ctx = cv.getContext('2d');
    const bf = bodyTex.frame;
    ctx.drawImage(bres, bf.x, bf.y, bf.width, bf.height, 0, 0, 256, 256);
    /* head+neck must always stay visible -- the chest plate has a neckline
       opening the body's neck fills.  Find the body figure's neck line (top +
       BODY_NECK_FRAC*height) BEFORE punching so we can restore that band after;
       otherwise the dilated collar mask closes the narrow neck gap and the head
       floats detached above the plate (v2.3.617). */
    let neckY = 0, figTop = 256, figBot = -1, origBody = null;
    try {
      origBody = ctx.getImageData(0, 0, 256, 256).data;   // body BEFORE the erase (for pant-restore)
      const id = origBody;
      for (let y = 0; y < 256; y++) {
        for (let x = 0; x < 256; x++) {
          if (id[(y * 256 + x) * 4 + 3] > 40) { if (y < figTop) figTop = y; figBot = y; break; }
        }
      }
      /* 0.33 == preview_armor_frames.NECK_RESTORE_FRAC (keep in sync) */
      if (figBot > figTop) neckY = Math.round(figTop + 0.33 * (figBot - figTop));
    } catch (e) { neckY = 0; }
    /* v2.3.678: the bake can run on a frame whose backing pixels aren't ready
       yet (spawn) -- drawing produces an empty figure.  Caching that would
       freeze an invisible/garbled body (headless armoured player on join), so
       render the raw body this frame and retry the bake on a later frame. */
    if (figBot <= figTop) return bodyTex;
    /* v2.3.689: separable box dilation.  Erasing the body under every (dx,dy)
       offset of the gear is a square-box dilation of the gear silhouette --
       the union of translates over a (2d+1)^2 grid equals horizontal translates
       gathered once, then vertical translates of THAT (max-filter separability).
       Same erased pixel set, 2*(2d+1) draws instead of (2d+1)^2 per piece
       (26 vs 169 at dilate 6). */
    const dilCv = document.createElement('canvas'); dilCv.width = 256; dilCv.height = 256;
    const dilCtx = dilCv.getContext('2d');
    for (const w of worn) {
      const gt = w.tex; const gr = gt && gt.source && gt.source.resource; if (!gr) continue;
      const gf = gt.frame;
      for (let dx = -dilate; dx <= dilate; dx++)
        dilCtx.drawImage(gr, gf.x, gf.y, gf.width, gf.height, dx, 0, 256, 256);
    }
    ctx.globalCompositeOperation = 'destination-out';   // erase body under the armour
    /* v2.3.1073: only dilate the erase DOWNWARD when a leg plate is also worn to
       fill the over-erased band.  With chest-only (no leg plate), the downward
       dilation ate the bare waist/upper-leg just below the chest plate -- a
       transparent GAP between torso and legs, most visible while jogging (the
       jog torso/leg junction shifts).  Cap dy<=0 there so the bare body fills the
       waist; the leg-plate case keeps full dilation (the plate hides the band). */
    const _hasLegPlate = worn.some(w => w.k && w.k.indexOf('legs:') === 0);
    const _dyMax = _hasLegPlate ? dilate : 0;
    for (let dy = -dilate; dy <= _dyMax; dy++)
      ctx.drawImage(dilCv, 0, dy);
    ctx.globalCompositeOperation = 'source-over';
    if (neckY > 0) {                                     // restore the head+neck band
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, 256, neckY); ctx.clip();
      ctx.drawImage(bres, bf.x, bf.y, bf.width, bf.height, 0, 0, 256, 256);
      ctx.restore();
    }
    /* v2.3.1123: the fishing rod is baked into the fish-pose body sprite, so the
       gear erase above chops the part of the pole that crosses the (dilated) plate
       silhouette -- the pole looked cut near the character when armour was worn.
       Restore the rod from the pre-erase body: its pink/magenta pixels (high R,
       low G, B > G) appear ONLY on the fish rod, so this is a no-op for every
       other pose/body.  The rod is drawn back into the body texture; the small
       segment directly behind the plate is still occluded by the gear on top
       (natural), but the halo-cut section beyond the plate reappears. */
    if (origBody) {
      try {
        const isRod = (o) => {
          const r = origBody[o], g = origBody[o + 1], b = origBody[o + 2], a = origBody[o + 3];
          return a > 60 && r > 140 && g < 115 && b > 60 && b < 195 && (r - g) > 60 && b > g + 22;
        };
        const rimg = ctx.getImageData(0, 0, 256, 256);
        const rd = rimg.data;
        let restored = false;
        const put = (o) => { rd[o] = origBody[o]; rd[o + 1] = origBody[o + 1]; rd[o + 2] = origBody[o + 2]; rd[o + 3] = origBody[o + 3]; restored = true; };
        for (let y = 0; y < 256; y++) {
          for (let x = 0; x < 256; x++) {
            const o = (y * 256 + x) * 4;
            if (!isRod(o)) continue;
            put(o);
            /* also restore the rod's dark outline (adjacent opaque non-rod px)
               so the pole keeps its edge where the erase cut it */
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                const nx = x + dx, ny = y + dy;
                if (nx < 0 || nx > 255 || ny < 0 || ny > 255) continue;
                const no = (ny * 256 + nx) * 4;
                if (origBody[no + 3] > 60 && !isRod(no)
                    && origBody[no] < 90 && origBody[no + 1] < 90 && origBody[no + 2] < 110) put(no);
              }
            }
          }
        }
        if (restored) ctx.putImageData(rimg, 0, 0);
      } catch (e) { /* best-effort: rod stays cut, body otherwise intact */ }
    }
    /* Blend the ghost hand: ChatGPT's armour drift leaves the body's bare fist
       poking out below the waist past the gauntlet.  Where the fist sits OVER the
       leg, recolour it to the player's PANTS shade (no transparent hole); where
       it pokes BEYOND the leg outline, erase it.  The pants/skin/shoe colours are
       SAMPLED from this body (skin from the head, pants from the upper leg, shoes
       from the foot band) so the patch matches whatever skin/pants the player
       picked -- and works for remote players' palettes too.  The fist is found by
       hue-alignment to the sampled skin (score = (p.ref)^2/|ref|^2), not a fixed
       skin colour.  Mirrors preview_armor_frames._blend_ghost_hand -- keep in
       sync.  v2.3.620.
       v2.3.686: FULL SET ONLY.  The blend assumes any below-waist skin is the
       ghost fist -- with chest-only wear the bare belly/hands are legit skin,
       and the blend painted flat pants-colour smears across the belly, ate the
       pants' top edge, and chewed the idle outlines near the hanging hands. */
    /* v2.3.1347: refs hoisted for the waist chain paint (see the confinement
       block) — the sampled skin/pants/shoes colours classify which waist
       pixels are the exposed green/pants band the chain replaces. */
    let _bakeRefs = null;
    /* v2.3.1360 (owner: chest-only jog "messed up"): refs are computed
       whenever the CHEST is worn — the chain waist paint needs them on
       partial wear too (chest-only lost its waist cover when v2.3.1345
       stripped the baked belt).  The v2.3.650 pants-restore and the
       ghost-hand blend stay FULL-SET only (v2.3.686), gated below. */
    const _wornChestRefs = worn.some(w => w.k && w.k.indexOf('chest:') === 0);
    const _wornLegsRefs = worn.some(w => w.k && w.k.indexOf('legs:') === 0);
    if (figBot > figTop && _wornChestRefs) {
      try {
        const fh = figBot - figTop;
        const waistY = Math.round(figTop + 0.45 * fh);   // a bit above mid-figure so the waist/hip skin (chain-belt zone) is caught too
        const img = ctx.getImageData(0, 0, 256, 256);
        const d = img.data;
        /* v2.3.1349b: sample from the PRE-ERASE body (origBody), not the
           erased canvas.  With a full set worn the dilated erase wipes the
           whole waist + shoe band on the frontal dirs, so sampling `d` found
           nothing, pantsRef/shoesRef came back null, and BOTH the v2.3.650
           pants-restore and the v2.3.1347 chain waist paint silently never
           ran for south/north/most southwest frames — the safety net's flat
           fill covered the gap and read as "black superhero underwear"
           (owner).  East/northeast only worked because their profile erase
           leaves leftovers to sample.  origBody is what the restores colour-
           match against, so it is also the CORRECT sample source. */
        const spx = origBody || d;
        const medRGB = (y0, y1) => {            // per-channel median of opaque pixels in [y0,y1)
          const rs = [], gs = [], bs = [];
          for (let y = Math.max(0, y0); y < Math.min(256, y1); y++)
            for (let x = 0; x < 256; x++) { const o = (y * 256 + x) * 4; if (spx[o + 3] > 40) { rs.push(spx[o]); gs.push(spx[o + 1]); bs.push(spx[o + 2]); } }
          if (!rs.length) return null;
          const mid = a => { a.sort((p, q) => p - q); return a[a.length >> 1]; };
          return [mid(rs), mid(gs), mid(bs)];
        };
        const shoeTop = figBot - Math.round(0.18 * fh);
        const skinRef = medRGB(figTop, neckY);
        const shoesRef = medRGB(shoeTop, figBot + 1);
        // Pants colour: median of the upper-leg band EXCLUDING skin-toned pixels
        // -- the bare hip/fist can sit inside this band and would otherwise drag
        // the sample toward skin, making pants ~ skin so the fist test fails to
        // separate them (e.g. a big pale fist over blue pants).  Exclude by hue-
        // alignment to the sampled skin.
        let pantsRef = null;
        if (skinRef) {
          const sn = Math.sqrt(skinRef[0] * skinRef[0] + skinRef[1] * skinRef[1] + skinRef[2] * skinRef[2]) || 1;
          const rs = [], gs = [], bs = [], y1 = waistY + Math.round(0.40 * fh);
          for (let y = waistY; y < Math.min(256, y1); y++)
            for (let x = 0; x < 256; x++) {
              const o = (y * 256 + x) * 4; if (spx[o + 3] <= 40) continue;
              const R = spx[o], G = spx[o + 1], B = spx[o + 2];
              const pn = Math.sqrt(R * R + G * G + B * B) || 1;
              const cos = (R * skinRef[0] + G * skinRef[1] + B * skinRef[2]) / (pn * sn);
              if (cos < 0.985) { rs.push(R); gs.push(G); bs.push(B); }
            }
          if (rs.length) { const mid = a => { a.sort((p, q) => p - q); return a[a.length >> 1]; }; pantsRef = [mid(rs), mid(gs), mid(bs)]; }
          else pantsRef = medRGB(waistY, waistY + Math.round(0.40 * fh));
        }
        const score = (R, G, B, T) => { const n = T[0] * T[0] + T[1] * T[1] + T[2] * T[2] || 1; const dt = R * T[0] + G * T[1] + B * T[2]; return dt * dt / n; };
        _bakeRefs = { skinRef, pantsRef, shoesRef };
        if (_wornLegsRefs && skinRef && pantsRef && shoesRef) {
          let dirty = false;
          /* Restore pants the dilated cover-mask ATE: the chest gear's halo erodes
             the pants next to the gauntlets.  The erase only zeroed alpha (RGB
             intact in origBody), so re-open any erased pixel that reads as PANTS;
             skin/shoes stay erased so the armour still hides the torso/arms.
             Mirrors preview_armor_frames._blend_ghost_hand.  v2.3.650
             v2.3.1353: WAIST BAND ONLY.  The v2.3.1349b origBody refs revived
             this restore on the frontal/profile dirs — but un-gated it also
             re-opened the pants-scored OUTLINE ring the dilated erase eats
             around the ENTIRE armor (east's body art has an olive outline —
             owner: "an entire chain armor outline on the east body").  Its
             v2.3.650 purpose was always the waist next to the gauntlets, and
             the chain paint (same band) converts what it restores. */
          if (origBody) {
            let rLo = neckY, rHi = 256;
            if (poseInfo && poseInfo.pose === 'jog') {
              const wrr = jogWaistRow(poseInfo.dir, poseInfo.frameIdx || 0);
              rLo = Math.max(neckY, wrr - 50); rHi = Math.min(256, wrr + 42);
            } else {
              rLo = Math.max(neckY, Math.round(figTop + 0.33 * fh));
              rHi = Math.min(256, Math.round(figTop + 0.70 * fh));
            }
            for (let p = rLo * 256; p < rHi * 256; p++) {
              const o = p * 4;
              if (d[o + 3] > 40 || origBody[o + 3] <= 40) continue;
              const R = origBody[o], G = origBody[o + 1], B = origBody[o + 2];
              const sP = score(R, G, B, pantsRef);
              if (sP >= score(R, G, B, skinRef) && sP >= score(R, G, B, shoesRef)) {
                d[o] = R; d[o + 1] = G; d[o + 2] = B; d[o + 3] = origBody[o + 3]; dirty = true;
              }
            }
          }
          const fist = new Uint8Array(256 * 256), leg = new Uint8Array(256 * 256);
          let anyFist = false;
          for (let y = waistY; y < 256; y++) {
            for (let x = 0; x < 256; x++) {
              const o = (y * 256 + x) * 4; if (d[o + 3] <= 40) continue;
              const R = d[o], G = d[o + 1], B = d[o + 2];
              // strict argmax (not a fixed margin): the fist is skin when skin is the
              // MOST hue-aligned of the three refs.  A margin fails for bright/
              // desaturated skin (pale scores almost as high to the grey boots as to
              // skin).  Detect ONLY above the shoe band -- the hand swings at the
              // hip, never at the feet -- so grey boot pixels can't flip to skin and
              // get a pants ring.
              const sSkin = score(R, G, B, skinRef);
              if (y < shoeTop && sSkin > score(R, G, B, pantsRef) && sSkin > score(R, G, B, shoesRef)) { fist[y * 256 + x] = 1; anyFist = true; }
              else leg[y * 256 + x] = 1;
            }
          }
          if (anyFist) {
            // despeckle: drop fist blobs < 20px (stray edge/boot misclassifications),
            // 4-connectivity flood fill -- matches the preview's ndimage.label.
            const seen = new Uint8Array(256 * 256), st = [];
            for (let p0 = 0; p0 < 256 * 256; p0++) {
              if (!fist[p0] || seen[p0]) continue;
              const comp = []; st.length = 0; st.push(p0); seen[p0] = 1;
              while (st.length) {
                const p = st.pop(); comp.push(p);
                const x = p % 256, y = (p / 256) | 0;
                if (x > 0 && fist[p - 1] && !seen[p - 1]) { seen[p - 1] = 1; st.push(p - 1); }
                if (x < 255 && fist[p + 1] && !seen[p + 1]) { seen[p + 1] = 1; st.push(p + 1); }
                if (y > 0 && fist[p - 256] && !seen[p - 256]) { seen[p - 256] = 1; st.push(p - 256); }
                if (y < 255 && fist[p + 256] && !seen[p + 256]) { seen[p + 256] = 1; st.push(p + 256); }
              }
              if (comp.length < 20) for (let i = 0; i < comp.length; i++) { fist[comp[i]] = 0; leg[comp[i]] = 1; }
            }
            const sil = new Uint8Array(256 * 256);          // leg silhouette: per-row span of non-fist body, +2px
            for (let y = waistY; y < 256; y++) {
              let mn = 256, mx = -1;
              for (let x = 0; x < 256; x++) if (leg[y * 256 + x]) { if (x < mn) mn = x; mx = x; }
              if (mx >= 0) { const a = Math.max(0, mn - 2), b = Math.min(255, mx + 2); for (let x = a; x <= b; x++) sil[y * 256 + x] = 1; }
            }
            for (let y = waistY; y < 256; y++) {
              for (let x = 0; x < 256; x++) {
                const p = y * 256 + x, o = p * 4; if (d[o + 3] <= 40) continue;
                let isHand = fist[p] === 1;
                if (!isHand && d[o] < 85 && d[o + 1] < 85 && d[o + 2] < 85) {   // dark outline within 2px (Manhattan) of the fist
                  for (let dy = -2; dy <= 2 && !isHand; dy++)
                    for (let dx = -2; dx <= 2; dx++) {
                      if (Math.abs(dx) + Math.abs(dy) > 2) continue;
                      const xx = x + dx, yy = y + dy;
                      if (xx >= 0 && xx < 256 && yy >= 0 && yy < 256 && fist[yy * 256 + xx]) { isHand = true; break; }
                    }
                }
                if (!isHand) continue;
                if (sil[p]) { d[o] = pantsRef[0]; d[o + 1] = pantsRef[1]; d[o + 2] = pantsRef[2]; d[o + 3] = 255; }
                else d[o + 3] = 0;
              }
            }
            dirty = true;
          }
          if (dirty) ctx.putImageData(img, 0, 0);
        }
      } catch (e) { /* ghost-hand blend is best-effort */ }
    }
    /* v2.3.681: erase the naked-body OUTLINE/SHADOW remnants that survive
       OUTSIDE the armour silhouette where the AI drawing drifted (floating
       arcs hugging the figure).  When armoured, the body may only show INSIDE
       the filled gear silhouette (+2px: pants in plate gaps, armpit windows)
       or in the restored head band.  Row-ranges keep partial equips intact.
       Mirrors preview_armor_frames.composite -- keep in sync. */
    try {
      const sc = document.createElement('canvas'); sc.width = 256; sc.height = 256;
      const sctx = sc.getContext('2d');
      let wornChest = false, wornLegs = false;
      for (const w of worn) {
        const gt = w.tex; const gr = gt && gt.source && gt.source.resource; if (!gr) continue;
        const gf = gt.frame;
        sctx.drawImage(gr, gf.x, gf.y, gf.width, gf.height, 0, 0, 256, 256);
        if (w.k && w.k.indexOf('chest:') === 0) wornChest = true;
        if (w.k && w.k.indexOf('legs:') === 0) wornLegs = true;
      }
      const gd = sctx.getImageData(0, 0, 256, 256).data;
      const gop = new Uint8Array(256 * 256);
      let gLo = 256, gHi = -1;
      for (let p = 0; p < 256 * 256; p++) {
        if (gd[p * 4 + 3] > 30) {
          gop[p] = 1;
          const y = (p / 256) | 0;
          if (y < gLo) gLo = y; if (y > gHi) gHi = y;
        }
      }
      if (gHi >= gLo) {
        /* fill holes: flood the EMPTY space from the borders; anything empty
           and unreached is an interior hole -> part of the silhouette. */
        const reach = new Uint8Array(256 * 256); const st = [];
        for (let x = 0; x < 256; x++) { st.push(x, 255 * 256 + x); }
        for (let y = 0; y < 256; y++) { st.push(y * 256, y * 256 + 255); }
        while (st.length) {
          const p = st.pop();
          if (reach[p] || gop[p]) continue;
          reach[p] = 1;
          const x = p % 256, y = (p / 256) | 0;
          if (x > 0) st.push(p - 1);
          if (x < 255) st.push(p + 1);
          if (y > 0) st.push(p - 256);
          if (y < 255) st.push(p + 256);
        }
        /* allowed = filled silhouette (gop | unreached) dilated by 2 */
        let fill = new Uint8Array(256 * 256);
        for (let p = 0; p < 256 * 256; p++) fill[p] = (gop[p] || !reach[p]) ? 1 : 0;
        /* v2.3.1353: pre-dilation silhouette (exact gear + interior windows)
           — the peek-ring tightening below needs it to tell "2px allowance
           ring" apart from "inside the armor / an interior window". */
        const fill0 = new Uint8Array(fill);
        for (let it = 0; it < 2; it++) {
          const nx = new Uint8Array(fill);
          for (let p = 0; p < 256 * 256; p++) {
            if (fill[p]) continue;
            const x = p % 256, y = (p / 256) | 0;
            if ((x > 0 && fill[p - 1]) || (x < 255 && fill[p + 1]) ||
                (y > 0 && fill[p - 256]) || (y < 255 && fill[p + 256])) nx[p] = 1;
          }
          fill = nx;
        }
        /* WAIST BAND: the torso-leg gap isn't always enclosed by gear (open at
           the hip side in profile frames), but the body there is legit -- it
           backs the see-through chain belt and fills the gap with pants
           instead of background.  Allow body in the waist rows, but only
           within the gear's horizontal span per row so outline arcs at waist
           height (beyond the gauntlets) stay dead.
           v2.3.684: partial wear too (chest-only: pants behind the baked-in
           belt; legs-only: hip edges beside the thigh plates). */
        const rowMin = new Int16Array(256).fill(256), rowMax = new Int16Array(256).fill(-1);
        let w0 = 256, w1 = 256;
        if ((wornChest || wornLegs) && figBot > figTop) {
          const fh2 = figBot - figTop;
          /* v2.3.1341 (owner: waist shimmer): for JOG the band rows come from
             the committed jogWaistRow table (the offline-measured skin->pants
             row per frame, the same source the attack composites land on)
             instead of the live silhouette's figTop/figBot -- the alpha-
             threshold jitter in those made the pants strip visible through
             the see-through chain belt shift every frame.  The measured row
             still tracks the genuine run-cycle bob.  Extents ~= the old
             0.38..0.64 fractions around the waist.  Stand is a single frame
             (already stable) and other poses keep the fraction formula. */
          if (poseInfo && poseInfo.pose === 'jog') {
            const wr = jogWaistRow(poseInfo.dir, poseInfo.frameIdx || 0);
            w0 = Math.max(0, wr - 26);
            w1 = Math.min(256, wr + 18);
          } else {
            w0 = Math.max(0, Math.round(figTop + 0.38 * fh2));
            w1 = Math.min(256, Math.round(figTop + 0.64 * fh2));
          }
          for (let y = w0; y < w1; y++) {
            for (let x = 0; x < 256; x++) {
              if (gop[y * 256 + x]) { if (x < rowMin[y]) rowMin[y] = x; if (x > rowMax[y]) rowMax[y] = x; }
            }
          }
        }
        /* v2.3.684 PARTIAL WEAR (chest-only / legs-only): the row-range gates
           (gLo/gHi) are fooled by sheet accessories -- the idle chest's hanging
           gauntlet reaches mid-thigh and the idle greaves can carry stray
           pixels above the knee -- so whole bare-thigh/hip rows were erased
           (floating boots under a chopped figure).  Confine per ROW instead:
           only rows where the gear actually WRAPS the body (gear pixels >=
           85% of the original body pixels in that row) are silhouette-
           confined; rows crossed by a narrow accessory keep the bare body.
           The full set keeps the original aggressive path (in profile the
           erased thigh hides behind the stacked plates -- restoring it would
           poke pants past the gauntlet). */
        const partial = !(wornChest && wornLegs);
        const covered = new Uint8Array(256);
        if (partial && origBody) {
          for (let y = 0; y < 256; y++) {
            let bc = 0, gc = 0;
            for (let x = 0; x < 256; x++) {
              const p = y * 256 + x;
              if (origBody[p * 4 + 3] > 40) bc++;
              if (gop[p]) gc++;
            }
            covered[y] = (bc > 0 && gc >= 0.85 * bc) ? 1 : 0;
          }
        }
        const img2 = ctx.getImageData(0, 0, 256, 256); const d2 = img2.data;
        const hi2 = wornLegs ? Math.min(256, gHi + 8) : 256;
        let dirty2 = false;
        for (let y = Math.max(0, neckY); y < 256; y++) {
          const skipBelow = !wornLegs && y > gHi;     // bare legs stay
          const skipAbove = !wornChest && y < gLo;    // bare torso stays
          const inWaist = y >= w0 && y < w1;
          for (let x = 0; x < 256; x++) {
            const p = y * 256 + x, o = p * 4;
            if (partial && !covered[y] && !(wornLegs && y >= hi2)) {
              /* bare row: stays whole AND gets back what the dilated cover
                 halo ate (the hue-based pant-restore misses shirt/skin, which
                 left a transparent band above the greaves top / around the
                 hanging gauntlet on partial wear). */
              if (d2[o + 3] === 0 && origBody && origBody[o + 3] > 40) {
                d2[o] = origBody[o]; d2[o + 1] = origBody[o + 1];
                d2[o + 2] = origBody[o + 2]; d2[o + 3] = origBody[o + 3];
                dirty2 = true;
              }
              continue;
            }
            if (d2[o + 3] === 0) continue;
            if (wornLegs && y >= hi2) { d2[o + 3] = 0; dirty2 = true; continue; }
            if (partial) {
              if (!covered[y]) continue;              // bare row stays whole
            } else if (skipBelow || skipAbove) continue;
            if (inWaist && x >= rowMin[y] && x <= rowMax[y]) continue;
            if (!fill[p]) { d2[o + 3] = 0; dirty2 = true; continue; }
            /* v2.3.1353 (owner: "an entire chain armor outline on the east
               body — it just needs to be in the waist part"): BELOW the
               waist band the 2px allowance ring let the BODY's leg edges
               peek past the narrower greave art — east's olive pants traced
               the legs.  Legs are not waist: there the body may show only
               INSIDE the exact gear silhouette (interior windows included,
               fill0); the waist rows keep the ring, where the trunks
               legitimately meet the hip edge.  Full-set jog only — partial
               wear and other poses keep the v2.3.681 behavior.
               v2.3.1358 (owner: SW/SE "head ... sunken behind" the plate on
               the early frames): below-band ONLY.  Tightening ABOVE the band
               also shaved the neck/chin edge under neckY that pads the
               collar, sinking the head behind the plate where the chin dips
               lowest in the cycle. */
            if (!partial && poseInfo && poseInfo.pose === 'jog' && w0 < w1
                && (y >= w1 + 8
                    /* v2.3.1359 (owner: east "still has a slight ghost
                       outline"): east's fixed 46px chain band never reaches
                       the hip edges, so the band rows' allowance ring there
                       is pure olive-pants bleed — clamp it too.  The neck
                       rows above w0-8 keep the ring (head padding). */
                    || (poseInfo.dir === 'east' && y >= w0 - 8))
                && !fill0[p]) {
              d2[o + 3] = 0; dirty2 = true;
            }
          }
        }
        /* v2.3.1347 (owner): the chain belt is PAINTED ONTO the exposed
           waist — the green/pants band the art left between plate and
           greaves — instead of rendering as its own layer.  Because the
           paint replaces only pants-classified pixels of the BODY frame,
           the swinging bare arm (skin) and every armor piece keep their
           exact hand-drawn depth: whatever the sheet drew over the green
           stays in front.  Chain pixels come from the frame-aligned belt
           sheet (belt/chainbelt/jog-<dir>.png), sampled at the same (x,y).
           Runs only on the ARMORED bake, so unarmored players (and the
           shirt-hem / waist anchors computed from the raw sheets) are
           untouched. */
        /* v2.3.1360: the paint ran whenever the CHEST was worn — partial
           chest-only wear lost its waist cover when v2.3.1345 stripped the
           baked belt (the bare-midriff band read as broken).
           v2.3.1372 (owner: "leg armor is appearing on thighs" on chest-only):
           FULL SET ONLY again.  The belt sheets carry chain TRUNKS over the
           hips/thighs on the frontal dirs — under greaves that's the sealed
           waist, on bare legs it read as chain shorts.  Chest-only wear now
           uses the ORIGINAL pre-v2.3.1345 chest sheets (baked hem belt
           restored on south/southwest/north/east), so the old-system look
           needs no runtime paint; those dirs draw this sheet only on partial
           wear (full set = the fullset figure), so the baked belt cannot
           re-trigger the full-set belt artifacts. */
        if (wornChest && wornLegs && poseInfo && poseInfo.pose === 'jog' && w0 < w1
            && _bakeRefs && _bakeRefs.pantsRef) {
          try {
            const bt = getGearFrame('belt', 'chainbelt', 'jog', poseInfo.dir, poseInfo.frameIdx | 0);
            const br = bt && bt.source && bt.source.resource;
            if (!br) {
              _beltPending = true;   // sheet still loading: bake uncached, retry later
            } else {
              const bcv = document.createElement('canvas'); bcv.width = 256; bcv.height = 256;
              const bctx = bcv.getContext('2d');
              const bfr = bt.frame;
              bctx.drawImage(br, bfr.x, bfr.y, bfr.width, bfr.height, 0, 0, 256, 256);
              const bd = bctx.getImageData(0, 0, 256, 256).data;
              const _score = (R, G, B, T) => { const nn = T[0] * T[0] + T[1] * T[1] + T[2] * T[2] || 1; const dt = R * T[0] + G * T[1] + B * T[2]; return dt * dt / nn; };
              const { skinRef, pantsRef, shoesRef } = _bakeRefs;
              /* v2.3.1349: paint over the belt sheet's FULL extent, not just
                 the w0..w1 band rows — the trunks reach below wr+18 on SW and
                 the row gate left their lower hips unpainted = the on-device
                 holes.  The sheet itself is already confined to the waist. */
              for (let y = Math.max(0, w0 - 24); y < Math.min(256, w1 + 24); y++) {
                for (let x = 0; x < 256; x++) {
                  const o = (y * 256 + x) * 4;
                  if (bd[o + 3] <= 40) continue;
                  if (d2[o + 3] <= 40) {
                    /* seam hole (the erase ate the bare midriff): fill with
                       chain — this WAS the detached torso/legs gap.
                       v2.3.1359 (owner: SE "light material between the legs"):
                       only where the BODY originally existed — the belt
                       sheet's 2px clip slack bridges the crotch gap when the
                       thighs separate, and filling background pixels there
                       hung floating chain between the legs. */
                    if (!origBody || origBody[o + 3] <= 40) continue;
                    d2[o] = bd[o]; d2[o + 1] = bd[o + 1]; d2[o + 2] = bd[o + 2];
                    d2[o + 3] = 255;
                    dirty2 = true;
                    continue;
                  }
                  const R = d2[o], G = d2[o + 1], B = d2[o + 2];
                  /* v2.3.1349b (owner: "black superhero underwear"): the body
                     sheet draws a DARK waistband/shadow at the waist (max
                     channel < 75).  The hue-projection score is unstable at
                     that brightness, so those pixels failed the pants test
                     and survived as a flat dark band under the plate.  Dark
                     pixels inside the belt's extent ARE the exposed waist —
                     replace them with chain; skin (arm, fist) is bright and
                     never matches.
                     v2.3.1360: on the non-profile dirs the arm NEVER crosses
                     the band (fixed/central masks), so the belt extent
                     replaces EVERYTHING there — the bare-midriff skin sliver
                     included (glaring on chest-only wear).  East/northeast
                     keep the skin test so the crossing fist stays in front. */
                  const _skinSafe = poseInfo.dir !== 'east' && poseInfo.dir !== 'northeast';
                  const sP = _score(R, G, B, pantsRef);
                  if (_skinSafe || Math.max(R, G, B) < 75
                      || ((!skinRef || sP >= _score(R, G, B, skinRef))
                          && (!shoesRef || sP >= _score(R, G, B, shoesRef)))) {
                    /* green/pants band pixel: chain replaces it; skin (arm,
                       fist) stays and keeps its hand-drawn depth */
                    d2[o] = bd[o]; d2[o + 1] = bd[o + 1]; d2[o + 2] = bd[o + 2];
                    dirty2 = true;
                  }
                }
              }
            }
          } catch (e) { /* best-effort: waist stays pants this bake */ }
        }
        /* v2.3.1359 (owner: east "still has a slight ghost outline"): east's
           body sheet draws its pants OLIVE-GREEN.  Through the armor's
           INTERIOR windows around the crotch/legs — legitimately inside the
           silhouette, so the exact-silhouette clamp can't touch them — the
           olive reads as a ghost tracing the figure.  East only: quiet any
           olive-tinted pixel below the chain band's top to under-armor
           shadow.  Skin fails the tint test (R far above G); chain gray has
           G ~= B and passes through untouched. */
        if (!partial && poseInfo && poseInfo.pose === 'jog' && w0 < w1
            && poseInfo.dir === 'east') {
          for (let y = Math.max(0, w0 - 8); y < 256; y++) {
            for (let x = 0; x < 256; x++) {
              const o = (y * 256 + x) * 4;
              if (d2[o + 3] <= 40) continue;
              const R = d2[o], G = d2[o + 1], B = d2[o + 2];
              if (G > B + 14 && G >= R - 24 && R > 40) {
                d2[o] = 44; d2[o + 1] = 47; d2[o + 2] = 54; dirty2 = true;
              }
            }
          }
        }
        /* v2.3.1349 SAFETY NET: no interior waist hole survives, period.  Any
           pixel where the ORIGINAL body existed, nothing remains after the
           erase/restores/paints, and the gear silhouette encloses it
           vertically (armor within 16 rows above AND below) is filled with
           quiet under-armor shadow.  This is independent of any sheet's
           coverage — the class of bug that kept reappearing ("giant gaps
           while running") whenever a generator and the art disagreed. */
        if (wornChest && wornLegs && origBody && poseInfo && poseInfo.pose === 'jog' && w0 < w1) {
          /* v2.3.1360 ran this on chest-only wear too; v2.3.1373 (owner:
             "sudden black appearing in the south jog torso only"): the slate
             fill flashing in and out at the hem read as black flicker on the
             bare-pants look.  FULL SET ONLY — chest-only waist cover is now
             the chest sheet's own extended hem belt (art-level, steady). */
          const lo3 = Math.max(0, w0 - 28), hi3 = Math.min(256, w1 + 28);
          for (let y = lo3; y < hi3; y++) {
            for (let x = 0; x < 256; x++) {
              const p = y * 256 + x, o = p * 4;
              if (d2[o + 3] > 40 || origBody[o + 3] <= 40) continue;
              let above = false, below = false;
              for (let k = 1; k <= 16 && !(above && below); k++) {
                if (!above && y - k >= 0 && (gop[p - k * 256] || d2[(p - k * 256) * 4 + 3] > 40)) above = true;
                if (!below && y + k < 256 && (gop[p + k * 256] || d2[(p + k * 256) * 4 + 3] > 40)) below = true;
              }
              if (above && below) {
                /* v2.3.1349b: dark STEEL, not near-black — flat black patches
                   at the waist read as "underwear" (owner) */
                d2[o] = 44; d2[o + 1] = 47; d2[o + 2] = 54; d2[o + 3] = 255;
                dirty2 = true;
              }
            }
          }
        }
        if (dirty2) ctx.putImageData(img2, 0, 0);
      }
    } catch (e) { /* silhouette confinement is best-effort */ }
  } catch (e) { return bodyTex; }
  /* v2.3.1120: the bake runs entirely at 256 internally (all the tuned neck /
     dilation / ghost-hand math untouched); only the FINAL composited texture is
     downscaled to the DISPLAY size, matching the bare body + gear so sb.scale's
     DISPLAY_DS factor lands it correctly.
     v2.3.1237: owner feedback — jog-shimmer at DISPLAY_DS=1: no smoothing pass
     needed HERE.  The body pixels this bake copies (bres, line above) now come
     from a display canvas that playerSkins/playerSprites already anti-aliased
     via bakeDisplayCanvas (the treatment the DS=2 'high' downscale, v2.3.1121,
     used to apply), so the visible bare-skin/shoe edges in the composite are
     smooth; the gear sheets were never display-downscaled in either era, so
     their edges are unchanged by the DS flip and stay as-is. */
  const t = Texture.from(downscaleByFactor(cv, DISPLAY_DS));
  /* v2.3.1121: mipmaps on the masked (armoured) body too, so the shoe outline /
     bare-skin edges don't crawl while jogging in armour (same fix as the bare
     body sheets). Cheap on the downscaled texture. */
  try { if (t.source) t.source.autoGenerateMipmaps = true; } catch (e) { /* best-effort */ }
  /* v2.3.1347: if the belt sheet was still loading, the bake went out without
     its chain — don't cache it, so the next sighting rebakes with the chain. */
  if (!_beltPending) _maskedBodyCache.set(key, t);
  if (_bs && _bt0) { _bs.count++; _bs.ms += (performance.now() - _bt0); }
  /* v2.3.689: cap 600 -> 256.  Each entry is a 256x256 RGBA texture (256KB
     GPU), so the old cap allowed ~150MB of masked-body frames -- brutal on
     phones.  256 covers both poses x 5 dirs x a full jog cycle for ~1.6 worn
     sets (one player set + remotes); overflow just rebakes (~2ms) on the
     next sighting of an evicted frame.  Evict 2 per insert when over cap so
     a burst (gear swap mid-fight) drains back down instead of hovering. */
  /* v2.3.698: cap 256 -> 420 -- prewarmAltWornSets keeps THREE worn-set
     bake families resident (full / chest-only / legs-only, ~130 frames
     each) so armor toggles never hitch; 420 x 256KB =~ 105MB worst case,
     still below the pre-v2.3.689 150MB ceiling. */
  /* v2.3.704: cap 420 -> 520.  The "~130 frames each" estimate undercounted:
     a family is stand (1x5 dirs) + jog (24+31+25+35+24 = 139) = 144 frames,
     so the three intro families are ~432 -- OVER the old cap, meaning the
     intro prewarm evicted the start of its own work and armor toggles
     rebaked those frames live anyway.  520 fits all three families plus
     headroom for rare-pose lazy bakes and armored remotes (~130MB worst
     case, still under the 150MB ceiling).  Eviction takes the LRU front,
     which after the hit-refresh above is genuinely cold entries. */
  while (_maskedBodyCache.size > 520) {
    const k0 = _maskedBodyCache.keys().next().value;
    const old = _maskedBodyCache.get(k0); _maskedBodyCache.delete(k0);
    /* v2.3.780: destroy DEFERRED, not immediate.  destroy(true) nuked the
       TextureSource the moment an entry was evicted -- and a REMOTE
       player's join-bake burst (~144 frames) is exactly what pushes the
       cache over cap, so eviction could land on a frame a local sprite
       was still displaying.  Worst case is the STAND pose: one frame,
       never reassigned, so the sprite kept rendering the destroyed
       texture forever ('my character's face/body got erased when the
       other session joined').  After 30s an evicted frame is either
       genuinely cold (dies quietly) or has long since re-baked under a
       fresh texture and every sprite has re-pointed. */
    setTimeout(() => { try { old.destroy(true); } catch (e) { /* ignore */ } }, 30000);
  }
  return t;
}

/* Pre-bake the local player's masked body frames (stand + jog, all 5 base
   directions, every frame) so the first seconds of play don't hitch.  The
   v2.3.681 silhouette-confinement pass made each cache miss cost a few ms
   of canvas + flood-fill work; with the v2.3.687 loadout gear worn by
   default, a fresh spawn used to pay that on the fly for every new
   (pose, dir, frame) it hit while moving and turning -- a visible stutter
   right after the intro.  Called behind the intro overlay (pixiRenderer.
   preloadPlayerAssets) AFTER the body + gear sheets resolve, so every
   getBodyFrame/getGearFrame here lands in the same caches (and therefore
   the same _maskedBodyFrame keys) the render path uses.  Yields to the
   event loop every few frames to keep the intro animation smooth.  Rare
   poses (pickup / mine) stay lazy -- their one-off bake hitch is fine.
   v2.3.693: optional opts.frameBudgetMs paces the work for LIVE gameplay
   (the v2.3.692 gear-change re-prewarm): bake until the budget is spent,
   then wait for the next animation frame.  The default count-based yield
   (every 6 bakes via setTimeout) stays for the spawn path -- it gates the
   intro overlay, so finishing fast matters more than frame pacing there.
   On iPhone one bake can cost ~10ms, so 6 back-to-back chunks queued as
   0ms timers starved rendering -- the near-freeze on equip/unequip. */
/* v2.3.700: shared prewarm progress for the intro loading bar.  Both prewarm
   passes add their planned bake counts to `total` up front and bump `done`
   per frame; IntroVideo polls this to draw a real progress bar. */
export const prewarmProgress = { done: 0, total: 0 };

/* v2.3.1477: the poses whose masked-body bakes are paid for behind the intro.
   'hit' joined stand/jog when the recoil finally got its own chest/legs sheets
   -- 6 frames x 5 dirs = 30 more 256x256 bakes (~8MB, ~3% of what v2.3.1407
   cut).  Worth it: the bake would otherwise land on the exact frame a monster
   connects with you.  v2.3.1478: + 'mine' (south only, 14 frames) once the
   pickaxe swing got its own sheets -- the mine BODY sheet was deliberately
   left lazy back in v2.3.1118 as "pure VRAM waste", which was true while the
   pose had no armour to bake against.  If iPhone context loss ever returns,
   this list is the first thing to trim back to ['stand', 'jog']. */
/* v2.3.1534: + 'dodge'.  The recolored body sheets are baked HERE, during the
   loading screen; a pose left off this list falls back to the un-recolored
   base frame on its first use while the bake runs, which for dodge would be a
   flash of default skin/pants the first time the player rolls.  That is the
   first-use hitch class CLAUDE.md's animation-preloading law exists to stop.
   Cost is 2 dirs x 9 frames = 18, against jog's ~140. */
const PREWARM_POSES = ['stand', 'jog', 'hit', 'mine', 'dodge'];
/* The gather poses are authored SOUTH-ONLY -- walking them through all five
   dirs would bake four empty frames per pose and log four 404s per slot.
   Dodge is authored south + east for the same reason (see playerSprites). */
const prewarmDirs = (pose, dirs) => (pose === 'mine' ? ['south'] : pose === 'dodge' ? ['south', 'east'] : dirs);

/* v2.3.701: plan the WHOLE intro workload up front so the loading bar is
   monotonic.  Previously each pass added its own count to `total` when it
   started, so done/total dropped (bar visibly 'reset') when the alt pass
   registered 3x more work mid-load. */
export function planPrewarmProgress() {
  prewarmProgress.done = 0;
  prewarmProgress.total = 0;
  const DIRS = ['south', 'east', 'north', 'northeast', 'southwest'];
  let per = 0;
  for (const pose of PREWARM_POSES) {
    for (const dir of prewarmDirs(pose, DIRS)) per += playerFrameCount(pose, dir) || 1;
  }
  const anyWorn = ['chest', 'legs'].some((sl) => { const it = getEquip(sl); return it && it !== 'none'; });
  /* v2.3.1118: the alt-worn pass bakes speculative families no longer.
     v2.3.1236: reversed per owner directive ("preload EVERYTHING on the
     loading screen") -- the alt pass now bakes every catalog gear state
     (see _catalogWornSets), so plan: masked worn pass (armoured only) +
     one full pass per catalog family. */
  const families = _catalogWornSets().length;
  prewarmProgress.total = per * ((anyWorn ? 1 : 0) + families);
}

/* v2.3.1236: every masked-armour family reachable from the gear catalog --
   the full set plus each single piece, for every catalog chest/legs item.
   The post-Play loading screen prewarms ALL of them so the first
   equip/unequip after joining never pays the lazy masked-body bake (owner:
   hitches when armor is first worn).  Ownership isn't knowable at intro time
   (server inventory arrives post-join), so the catalog is the practical
   superset; it holds exactly one armour set today, so this is 3 families
   (~432 frames), which fits the 520-entry masked cache cap.  This reverses
   the v2.3.1118 worn-only cut: the speculative-family VRAM cost returns
   (~27MB at DISPLAY_DS=2, ~108MB at DISPLAY_DS=1) -- if iPhone WebGL context
   loss reappears, shrink HERE first.  Currently-worn combination sorts first
   so the spawn loadout is warm earliest behind the loading bar. */
/* v2.3.1407: SHRUNK HERE, as the line above instructs — context loss is
   back, worse: hard iOS page kills (owner: game restarted seconds after
   first worldview entry, crashed again in frost; no crashTrap beacons =
   Safari OOM'd the tab before JS could log).  Renderer probes measured the
   real cost of the 3-family speculative bake at ~230MB of GPU strips
   (40-odd 6-7MB canvases — the 108MB comment above predates belts/poses)
   PLUS the same again in CPU canvas backing — the dominant share of the
   whole game's footprint, parked at the iPhone kill threshold so the small
   per-zone loads (+5MB worldview, +31MB frost) tipped it over.  Now bakes
   ONLY the currently-worn combination (~1/3): the v2.3.1236 anti-hitch
   intent survives via the v2.3.692 equip-change re-prewarm, which re-bakes
   a new combination in the equip menu's dead time and GPU-uploads it
   (v2.3.704) — so a first swap still lands warm, it just isn't paid for
   up front by every session that never swaps. */
function _catalogWornSets() {
  const wc = getEquip('chest'), wl = getEquip('legs');
  const worn = [];
  if (wc && wc !== 'none') worn.push(['chest', wc]);
  if (wl && wl !== 'none') worn.push(['legs', wl]);
  return worn.length ? [worn] : [];
}

/* v2.3.701: force-upload the baked masked-body textures to the GPU while the
   intro overlay is still up.  Texture.from(canvas) uploads lazily on first
   DRAW, so early play paid a stream of one-off upload stalls as the player
   turned/moved through freshly-baked frames ('slowing down on a few frames
   even after joining').  Feature-detected; harmless no-op if the renderer
   doesn't expose an upload path. */
/* v2.3.704: remember which sources already went up so repeat calls (the
   equip-change re-prewarm below re-runs this) only push the NEW bakes
   instead of re-uploading the whole ~100MB cache. */
const _uploadedSources = new WeakSet();
export async function uploadBakedTextures(renderer) {
  if (!renderer) return;
  let n = 0;
  for (const t of _maskedBodyCache.values()) {
    if (!t || !t.source || _uploadedSources.has(t.source)) continue;
    try {
      if (renderer.texture && typeof renderer.texture.initSource === 'function') {
        renderer.texture.initSource(t.source);
      } else if (renderer.prepare && typeof renderer.prepare.upload === 'function') {
        renderer.prepare.upload(t);
      } else return;
      _uploadedSources.add(t.source);
    } catch (e) { /* best-effort */ }
    if (++n % 24 === 0) await new Promise((r) => setTimeout(r, 0));
  }
}

/* v2.3.1022: force-upload the GEAR sheet textures too — idle/jog via the
   gearSheets cache, swing/bowshot via the Assets cache that
   effectsRenderer._gearStripFrame reads (warmed by preloadCombatGear).  Their
   GPU upload was still deferred to first DRAW, so the first armored turn/swing
   hitched.  Shares _uploadedSources so repeat calls push only new sources, and
   stays staggered (every 24) to avoid a synchronous upload spike on iOS. */
export async function uploadGearTextures(renderer) {
  if (!renderer) return;
  const up = (source) => {
    if (!source || _uploadedSources.has(source)) return false;
    try {
      if (renderer.texture && typeof renderer.texture.initSource === 'function') renderer.texture.initSource(source);
      else if (renderer.prepare && typeof renderer.prepare.upload === 'function') renderer.prepare.upload(source);
      else return false;
      _uploadedSources.add(source);
    } catch (e) { /* best-effort */ }
    return true;
  };
  let n = 0;
  for (const source of getLoadedGearSources()) {
    if (up(source) && ++n % 24 === 0) await new Promise((r) => setTimeout(r, 0));
  }
  for (const url of combatGearUrls()) {
    const tex = Assets.cache.get(url);
    if (tex && tex.source && up(tex.source) && ++n % 24 === 0) await new Promise((r) => setTimeout(r, 0));
  }
}

/* v2.3.704: renderer handle for the equip-change re-prewarm's GPU upload.
   pixiRenderer registers it at init; without it the rebaked frames uploaded
   lazily on first DRAW (uploadBakedTextures only ran behind the intro), so
   a gear swap still paid a trail of one-off upload stalls while turning
   through freshly-baked frames. */
let _prewarmRenderer = null;
export function registerPrewarmRenderer(renderer) { _prewarmRenderer = renderer; }

export async function prewarmMaskedBodyFrames(opts) {
  const budgetMs = (opts && opts.frameBudgetMs) || 0;
  const slots = ['chest', 'legs'];
  if (!slots.some((sl) => { const it = getEquip(sl); return it && it !== 'none'; })) return;
  /* v2.3.756: baked shirt retired -- the body always bakes shirtless (the
     layered shirt is a separate sprite, no masked-body involvement). */
  const shirtT = null;
  const shirtKey = 'none';
  const DIRS = ['south', 'east', 'north', 'northeast', 'southwest'];
  const _nextFrame = () => new Promise((r) => {
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => r());
    else setTimeout(r, 16);
  });
  let sinceYield = 0;
  let chunkT0 = (typeof performance !== 'undefined') ? performance.now() : 0;
  for (const pose of PREWARM_POSES) {
    for (const dir of prewarmDirs(pose, DIRS)) {
      const fc = playerFrameCount(pose, dir) || 1;
      for (let f = 0; f < fc; f++) {
        prewarmProgress.done++;
        const tex = getBodyFrame(getSkin(), getPants(), getShoes(), pose, dir, f, shirtT, shirtKey, getEyeColor(), localBodyArt(false));
        if (!tex) continue;
        const worn = [];
        for (const sl of slots) {
          const it = getEquip(sl);
          if (it && it !== 'none') {
            const gt = getGearFrame(sl, it, pose, dir, f);
            if (gt) worn.push({ k: sl + ':' + it, tex: gt });
          }
        }
        if (!worn.length) continue;
        /* v2.3.1399: the fullset figure replaces these frames at runtime —
           baking them only burns VRAM (see _fullsetCoversBake). */
        if (_fullsetCoversBake(worn, pose, dir)) continue;
        try { _maskedBodyFrame(tex, worn, 6, { pose, dir, frameIdx: f }); } catch (e) { /* best-effort */ }
        if (budgetMs) {
          if (performance.now() - chunkT0 >= budgetMs) {
            await _nextFrame();
            chunkT0 = performance.now();
          }
        } else if (++sinceYield >= 6) {
          sinceYield = 0;
          await new Promise((r) => setTimeout(r, 0));
        }
      }
    }
  }
}

/* v2.3.698: pre-bake the ALTERNATE worn states in the background so taking
   armor on/off never hitches (user request).  Two costs hide behind a toggle:
   (1) the shirt-variant body sheets -- equipping/removing the full set flips
   the shirt bake, and the first toggle paid a 13056x256 canvas recolor on the
   spot; (2) the masked-body bakes for the new worn set, paid per (pose, dir,
   frame) while moving.  This warms both for all three gear states (full /
   chest-only / legs-only; naked needs no bake), yielding generously so it
   never competes with gameplay.  Kicked after the current-set prewarm
   (pixiRenderer.preloadPlayerAssets) and re-kicked on equip changes. */
let _altPrewarmSeq = 0;
/* Yield between bake slices: prefer idle time (rIC), else a long-ish pause.
   v2.3.699: the first trickle (4 bakes / 16ms gap =~ a third of the main
   thread) measurably dented the frame rate right after joining -- now 2
   bakes per slice, >=90ms apart, idle-scheduled, after a 5s grace. */
const _idleYield = () => new Promise((r) => {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(() => setTimeout(r, 90), { timeout: 1000 });
  } else {
    setTimeout(r, 120);
  }
});
export async function prewarmAltWornSets(opts) {
  /* v2.3.700: `fast` mode runs behind the intro loading bar at full speed
     (nothing competes for the main thread there) -- the player joins with
     EVERY gear state warm.  The slow idle-trickle path remains for the
     equip-change re-kick during live play. */
  const fast = !!(opts && opts.fast);
  const seq = ++_altPrewarmSeq;
  if (!fast) {
    /* grace period: let the join settle (zone load, first combat) first */
    await new Promise((r) => setTimeout(r, 5000));
    if (seq !== _altPrewarmSeq) return;
  }
  /* v2.3.1118: prewarmed ONLY the actually-worn loadout -- the speculative
     3-family bake (~115MB of masked frames at the full 256 bake) pressured
     the iPhone's WebGL budget and was a prime cause of slowdown + context
     loss, and it wrongly defaulted to steelplate for unarmoured players.
     v2.3.1236: REVERSED per owner directive -- prewarm EVERY catalog gear
     state behind the post-Play loading screen so a first equip/unequip never
     pays the lazy masked-body bake hitch.  _catalogWornSets() documents the
     memory trade-off and is the knob to shrink if context loss returns.
     v2.3.1407: context loss returned as hard iOS OOM kills — the knob is
     shrunk: _catalogWornSets now yields only the worn combination, so this
     pass is mostly cache hits over the prewarmMaskedBodyFrames output. */
  /* v2.3.756: baked shirt retired -- only the shirtless body sheets exist
     now, so there is a single variant to warm. */
  try { await preloadBodyVariant(null, 'none'); } catch (e) { /* best-effort */ }
  if (seq !== _altPrewarmSeq) return;            // superseded by a newer kick
  const SETS = _catalogWornSets().map((worn) => ({ worn }));
  if (!SETS.length) return;
  const DIRS = ['south', 'east', 'north', 'northeast', 'southwest'];
  let sinceYield = 0;
  for (const set of SETS) {
    const sT = null, sK = 'none';   /* v2.3.756: shirtless always */
    for (const pose of PREWARM_POSES) {
      for (const dir of prewarmDirs(pose, DIRS)) {
        const fc = playerFrameCount(pose, dir) || 1;
        for (let f = 0; f < fc; f++) {
          if (seq !== _altPrewarmSeq) return;
          if (fast) prewarmProgress.done++;
          const tex = getBodyFrame(getSkin(), getPants(), getShoes(), pose, dir, f, sT, sK, getEyeColor(), localBodyArt(false));
          if (!tex) continue;
          const worn = [];
          for (const [sl, id] of set.worn) {
            const gt = getGearFrame(sl, id, pose, dir, f);
            if (gt) worn.push({ k: sl + ':' + id, tex: gt });
          }
          if (!worn.length) continue;
          /* v2.3.1399: skip the full-steel family's figure-covered jog
             bakes here too (see _fullsetCoversBake). */
          if (_fullsetCoversBake(worn, pose, dir)) continue;
          try { _maskedBodyFrame(tex, worn, 6, { pose, dir, frameIdx: f }); } catch (e) { /* best-effort */ }
          if (++sinceYield >= (fast ? 6 : 2)) {
            sinceYield = 0;
            if (fast) await new Promise((r) => setTimeout(r, 0));
            else await _idleYield();
          }
        }
      }
    }
  }
}
/* Equip-change re-kick: handled by _schedulePrewarm below (v2.3.692/693,
   frame-budgeted).  The intro-time prewarmAltWornSets keeps all three
   gear states resident, so the scheduler is mostly cache hits. */
/* v2.3.692: re-run the prewarm whenever the worn chest/legs change.  The
   spawn-time prewarm only covers the loadout you spawned with; an equip or
   unequip changes every _maskedBodyCache key, so each (pose, dir, frame) was
   a lazy first-sighting bake (~ms each) -- felt as a frame-rate dip while
   running around right after a gear swap.  Re-baking here lands in the dead
   time while the player is still in the equip menu.  Debounced 150ms so
   swapping both pieces bakes only the final combination; if a change arrives
   mid-prewarm, one more pass is queued rather than overlapped.  Stale
   combinations left in the cache age out via the 256-entry FIFO cap.
   v2.3.693: pace with frameBudgetMs (~5ms of baking per rendered frame) --
   the unpaced run starved rendering on iPhone (near-freeze on swap).
   Warmup takes a few seconds; frames not yet baked still lazy-bake on
   sighting, so worst case is the old pre-v2.3.692 behavior, not a gap. */
let _equipPrewarmTimer = null;
let _equipPrewarmRunning = false;
let _equipPrewarmAgain = false;
function _schedulePrewarm() {
  if (_equipPrewarmTimer) clearTimeout(_equipPrewarmTimer);
  _equipPrewarmTimer = setTimeout(() => {
    _equipPrewarmTimer = null;
    if (_equipPrewarmRunning) { _equipPrewarmAgain = true; return; }
    _equipPrewarmRunning = true;
    prewarmMaskedBodyFrames({ frameBudgetMs: 5 }).catch(() => { /* best-effort */ }).then(() => {
      /* v2.3.704: push any frames this pass actually had to bake (cache
         misses) to the GPU now, instead of stalling on first draw. */
      uploadBakedTextures(_prewarmRenderer).catch(() => { /* best-effort */ });
      _equipPrewarmRunning = false;
      if (_equipPrewarmAgain) { _equipPrewarmAgain = false; _schedulePrewarm(); }
    });
  }, 150);
}
for (const _sl of ['chest', 'legs']) onEquipChange(_sl, _schedulePrewarm);

const _REGION_SPR = { head: '_bodyHead', torso: '_bodyTorso', legs: '_bodyLegs' };
/* Draw the body via its three region sprites.  `show` = {head,torso,legs}.
   v2.3.609: the regions use the SAME transform as the reference sprite `sb`
   (position + scale), so they are exactly the body in three pieces -- they
   always reconstruct it and stay pixel-aligned with each other AND the gear
   (which copies sb's transform).  This removes the vertical "cloning" the
   earlier naked-scale offset caused.  Returns true if no region is shown
   (body fully covered). */
function _placeBodyRegions(display, sb, bodyTex, show) {
  let anyShown = false;
  for (const region of ['head', 'torso', 'legs']) {
    const spr = display[_REGION_SPR[region]];
    if (!spr) continue;
    if (!show[region] || !bodyTex) { spr.visible = false; continue; }
    const t = _bodyRegionTex(bodyTex, region);
    if (!t) { spr.visible = false; continue; }
    if (spr.texture !== t) spr.texture = t;
    const [r0, r1] = REGION_ROWS[region];
    spr.scale.x = sb.scale.x; spr.scale.y = sb.scale.y;
    spr.x = sb.x;
    spr.y = sb.y + ((r0 + r1) / 2 - 128) * sb.scale.y / DISPLAY_DS;   // band's centre in the body's own transform (v2.3.1120: r0/r1 are 256-space)
    spr.tint = sb.tint;
    spr.visible = true;
    anyShown = true;
  }
  return !anyShown;
}
function _hideBodyRegions(display) {
  for (const k of ['_bodyHead', '_bodyTorso', '_bodyLegs']) if (display[k]) display[k].visible = false;
}
/* v2.3.1055: per-frame HEAD overlay for the loot-pickup pose.  The crouch drops
   the head below the masked body's neck-restore band AND under the raised arm
   plate, so an armoured player's head was cut to a sliver.  A head-only sheet
   (pickup-<dir>-head.png -- head pixels per frame, transparent elsewhere) is
   drawn at the body transform and lifted ABOVE the gear in _orderTraitsAndWeapon
   so the whole head always shows.  South-only, matching the pose; other dirs
   404 -> [] and the masked body's own head is used.  Reuses the dormant
   _bodyHead region sprite (anchor 0.5/0.5, full-frame texture). */
/* v2.3.1116: the pickup head-overlay sheet now loads + recolors through
   playerSkins.getPickupHeadFrame (combo-aware), so an armoured OR bare player's
   head matches their chosen skin instead of reverting to the default tan it was
   drawn in.  The old raw Assets.load + global _pickupHeadSheets cache lived
   here; it ignored the skin entirely. */
/* Place the pickup head overlay on the (reused) _bodyHead sprite at the body
   sprite's exact transform.  No-op (leaves _bodyHead as the caller left it --
   hidden) outside the pickup pose or before the sheet loads. */
function _placePickupHead(display, sb, skinId, pantsId, shoesId, pose, dir, frameIdx, phase) {
  const hd = display._bodyHead;
  if (!hd || !sb) return;
  /* v2.3.1389: `phase` (jog cycle 0..1) picks the head frame on the SAME
     clock as the fullset armor (getGearFramePhased) — east's head sheet
     is now 25 frames matching the armor, so head and armor bob as one.
     Dirs whose head count equals the body count resolve to the same
     frame either way; non-jog callers omit it. */
  const t = getPickupHeadFrame(skinId, pantsId, shoesId, pose, dir, frameIdx, phase);
  if (!t) return;
  if (hd.texture !== t) hd.texture = t;
  hd.x = sb.x; hd.y = sb.y;
  /* v2.3.1540: constant per-direction seat (see FULLSET_HEAD_SEAT).  256-space
     -> world by the same sb.scale / DISPLAY_DS factor the residual below uses;
     dx rides sb.scale.x so a mirrored side flips with it. */
  const _seat = FULLSET_HEAD_SEAT[dir];
  if (_seat && pose === 'jog') {
    hd.x = sb.x + _seat[0] * sb.scale.x / DISPLAY_DS;
    hd.y = sb.y + _seat[1] * sb.scale.y / DISPLAY_DS;
  }
  /* v2.3.1455: sub-pixel seam correction — the fractional shift the
     baked head sheet can't carry (see FULLSET_HEAD_RES).  Same
     phase->frame mapping as getPickupHeadFrame/getGearFramePhased, so
     the residual always matches the frame on screen; 256-space ->
     world via sb.scale.y / DISPLAY_DS (the _placeBodyRegions factor). */
  if (pose === 'jog' && phase != null) {
    const _res = FULLSET_HEAD_RES[dir];
    if (_res && _res.length) {
      const _p = ((phase % 1) + 1) % 1;
      const _ri = Math.min(_res.length - 1, Math.floor(_p * _res.length));
      /* v2.3.1540: ADD to whatever the seat above set rather than overwrite.
         No direction has both today, but a later seat on east would lose its
         y silently otherwise. */
      hd.y += _res[_ri] * sb.scale.y / DISPLAY_DS;
    }
  }
  /* v2.3.1117: the head sheet is baked DOWNSCALED to save VRAM, so its frame is
     smaller than the body's 256px frame.  Scale up by 256/frame so the overlay
     still lands exactly on the body (both anchored 0.5/0.5); reads the size off
     the texture so it tracks whatever downscale playerSkins uses. */
  const _fw = (t.frame && t.frame.width) || 256;
  const _fh = (t.frame && t.frame.height) || 256;
  /* v2.3.1120: head sheet is HEAD_DS-downscaled; the 256/_fw ratio brings it up
     to a 256-space figure, then /DISPLAY_DS undoes the DISPLAY_DS factor sb.scale
     now carries (so head matches the body whatever the two downscales are). */
  hd.scale.x = sb.scale.x * (256 / _fw) / DISPLAY_DS; hd.scale.y = sb.scale.y * (256 / _fh) / DISPLAY_DS;
  hd.tint = 0xffffff;
  hd.visible = true;
}
/* v2.3.1123: FISH-pose "top" overlay = the head band + the whole fishing rod,
   baked into a full-frame texture (transparent elsewhere) so BOTH lift above the
   chest plate.  Gear draws above the body, so an armoured angler had the head hidden
   behind the plate AND the rod chopped where it crosses the torso (only the head-
   level rod tip showed).  The head band (top 35%) is kept as-is; below it, only the
   rod's magenta pixels are kept -- the bare torso/arms stay erased so the plate shows
   through.  Cached per body frame (uid). */
const _fishTopCache = new Map();
function _fishTopFrame(bodyTex) {
  if (!bodyTex) return null;
  let bres; try { bres = bodyTex.source && bodyTex.source.resource; } catch (e) { return null; }
  if (!bres) return null;
  const key = (bodyTex.uid != null ? bodyTex.uid : '') + '|fishtop';
  const hit = _fishTopCache.get(key);
  if (hit) { _fishTopCache.delete(key); _fishTopCache.set(key, hit); return hit; }
  try {
    const bf = bodyTex.frame;
    const W = Math.max(1, Math.round(bf.width)), H = Math.max(1, Math.round(bf.height));
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    ctx.drawImage(bres, bf.x, bf.y, bf.width, bf.height, 0, 0, W, H);
    const img = ctx.getImageData(0, 0, W, H); const d = img.data;
    const headBot = Math.round(H * 0.35);   // keep the whole head band as-is
    /* ═══ v2.3.1914: THE HAND COMES UP WITH THE ROD ═══
       Owner: "When fishing that hand needs to be over the shirt during the reel
       animation instead of under it."

       Below the head band this kept ONLY the rod's magenta pixels and erased
       everything else, so the plate/shirt could show through the torso. That
       erased the GRIPPING HAND too — it stayed down in the body layer, under
       the shirt, and on the reel frames where the hand crosses the chest it
       disappeared behind the tee. A hand that goes behind the shirt it is
       holding a rod in front of reads as broken, which is what was reported.

       So: the rod, plus any opaque pixel within GRIP_R of a rod pixel. The
       radius is what keeps this from undoing v2.3.1123 — a hand's worth of
       skin rides up with the rod, the forearm and torso do not, and the plate
       still shows through everywhere else. Keyed on PROXIMITY rather than on
       skin colour deliberately: the body is recoloured per player, so a colour
       test would work for one skin tone and quietly fail for the rest. */
    const GRIP_R = Math.max(4, Math.round(H * 0.055));
    const rodXs = [], rodYs = [];
    const isRodAt = (o) => {
      const r = d[o], g = d[o + 1], b = d[o + 2], a = d[o + 3];
      return a > 60 && r > 140 && g < 115 && b > 60 && b < 195 && (r - g) > 60 && b > g + 22;
    };
    for (let y = headBot + 1; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (isRodAt((y * W + x) * 4)) { rodXs.push(x); rodYs.push(y); }
      }
    }
    const keep = new Uint8Array(W * H);
    for (let i = 0; i < rodXs.length; i++) {
      const rx = rodXs[i], ry = rodYs[i];
      const y0 = Math.max(headBot + 1, ry - GRIP_R), y1 = Math.min(H - 1, ry + GRIP_R);
      const x0 = Math.max(0, rx - GRIP_R), x1 = Math.min(W - 1, rx + GRIP_R);
      for (let y = y0; y <= y1; y++) {
        const row = y * W;
        for (let x = x0; x <= x1; x++) keep[row + x] = 1;
      }
    }
    for (let y = headBot + 1; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const idx = y * W + x, o = idx * 4;
        if (!keep[idx] || d[o + 3] <= 60) d[o + 3] = 0;
      }
    }
    /* v2.3.1914 QA probe: how much of this overlay is rod and how much is the
       grip that now rides with it. A screenshot cannot separate "the hand is
       over the shirt" from "the hand happens to be outside the shirt on this
       frame", and the whole fix is a bounded amount of extra coverage — too
       little is the old bug, too much undoes v2.3.1123 and paints the torso
       over the plate. Counting both is the only way to assert the bound. */
    if (typeof window !== 'undefined') {
      let rod = 0, grip = 0;
      for (let y = headBot + 1; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const idx = y * W + x, o = idx * 4;
          if (d[o + 3] <= 0) continue;
          if (isRodAt(o)) rod++; else grip++;
        }
      }
      window.__btFishTop = { rod, grip, gripR: GRIP_R, w: W, h: H };
    }
    ctx.putImageData(img, 0, 0);
    const tex = new Texture({ source: Texture.from(cv).source });
    _fishTopCache.set(key, tex);
    if (_fishTopCache.size > 64) { const oldest = _fishTopCache.keys().next().value; const ot = _fishTopCache.get(oldest); _fishTopCache.delete(oldest); try { ot.destroy(true); } catch (e) {} }
    return tex;
  } catch (e) { return null; }
}
/* Place the head+rod overlay on the (reused) _bodyHead sprite at the body's exact
   transform (full-frame, anchor 0.5/0.5 -- same as _placePickupHead).  Lifted above
   the gear by _orderTraitsAndWeapon.  Only called when a chest plate is worn. */
function _placeFishHead(display, sb, bodyTex) {
  const hd = display._bodyHead;
  if (!hd || !sb || !bodyTex) return;
  const t = _fishTopFrame(bodyTex);
  if (!t) return;
  if (hd.texture !== t) hd.texture = t;
  hd.x = sb.x; hd.y = sb.y;
  const _fw = (t.frame && t.frame.width) || 256;
  const _fh = (t.frame && t.frame.height) || 256;
  hd.scale.x = sb.scale.x * (256 / _fw) / DISPLAY_DS; hd.scale.y = sb.scale.y * (256 / _fh) / DISPLAY_DS;
  hd.tint = 0xffffff;
  hd.visible = true;
}
/* Per-hat silhouette masks for hair clipping (helmet's outline filled
   downward from its top edge).  Keyed by hat id; loaded lazily. */
const _hairMaskCache = {};
function _ensureHairMaskLoaded(hatId) {
  if (!hatId || hatId === 'none') return null;
  let e = _hairMaskCache[hatId];
  if (!e) {
    e = _hairMaskCache[hatId] = {
      tex: { east: null, north: null, northeast: null, south: null, southwest: null },
      loadStarted: false,
    };
  }
  if (!e.loadStarted) {
    e.loadStarted = true;
    for (const dir of Object.keys(e.tex)) {
      Assets.load(`/sprites/traits/headwear/${hatId}/hairmask/${dir}.png?v=${TRAIT_VER}`)
        .then(t => { e.tex[dir] = t; if (t && t.source) t.source.scaleMode = 'linear'; })
        .catch(() => {});  // a hat without a hairmask just won't clip
    }
  }
  return e;
}

/* When the equipped headwear declares `clipsHair`, clip the hair to the
   helmet's silhouette so it can't poke out the top or sides, while the
   forehead hair under the helmet's front opening still shows.  Places a
   mask sprite (the helmet's downward-filled outline) exactly where the
   helmet renders -- same crown anchor + nudge + scale -- and masks the
   hair to it. */
function _clipHairToHat(display, hatId, hairId, pose, dir, mirror, frameIdx, bodyScale) {
  const hair = display._hairSprite;
  const maskSprite = display._hairMask;
  if (!hair || !maskSprite) return;
  const helmet = _ensureHeadwearLoaded(hatId);
  const meta = helmet && helmet.meta;
  const maskEntry = (meta && meta.clipsHair) ? _ensureHairMaskLoaded(hatId) : null;
  if (!(meta && meta.clipsHair && hair.visible && maskEntry && maskEntry.tex[dir])) {
    maskSprite.visible = false;
    /* ═══ v2.3.2186: THE HOOD CLIPS HAIR TOO ═══
     * Owner: "Hair sticking out."  The hood already draws over the hair
     * (hairSprite is added before capeSprite), so this was never a z-order
     * bug -- what shows is hair reaching PAST the hood's outline, which only
     * a clip removes.
     * A hat that clips wins, and that is why this sits in the ELSE: the hat is
     * drawn above the hood, so its silhouette is the one the hair has to obey.
     * The mask sprite is placed by _placeCape from the body's transform, which
     * runs BEFORE _placeHair on both the local and the remote path, so it is
     * already registered by the time this reads it. */
    const hoodMask = display._capeHoodMask;
    if (hair.visible && hoodMask && hoodMask._btReady) {
      if (hair.mask !== hoodMask) hair.mask = hoodMask;
    } else if (hair.mask) {
      hair.mask = null;
    }
    return;
  }
  /* Reuse the trait placement with the helmet's meta but the mask texture
     so the silhouette lands exactly over the helmet — including the
     v2.3.1353 per-hat jog tune, or the clip drifts off the resized hat.
     v2.3.1959: ...and the two HAIR-DEPENDENT adjustments as well, which this
     line asked hatPoseTune alone for and therefore never got.  A hat that
     floats (v2.3.1561) was masked at the height it would have sat at with no
     hair under it, and a band widened to reach around big hair (v2.3.1943)
     was masked at its un-widened width — in both cases the clip cuts the hair
     to a silhouette the hat is not standing in.  _hatTune is the same call
     _placeHeadwear makes, so the mask now moves with the hat by construction
     rather than by two lists of adjustments staying in step. */
  _placeTrait(maskSprite, { tex: maskEntry.tex, meta }, display, pose, dir, mirror, frameIdx, bodyScale,
    _hatTune(hatId, meta, hairId, pose, dir, mirror));
  if (maskSprite.visible) {
    if (hair.mask !== maskSprite) hair.mask = maskSprite;
  } else if (hair.mask) {
    hair.mask = null;  // mask didn't place -> don't clip the hair to nothing
  }
}
function _placeHair(display, hairId, hairColorId, hatId, pose, dir, mirror, frameIdx, bodyScale) {
  const baseEntry = _ensureHairLoaded(hairId);
  /* v2.3.391: retint the hair to the selected color.  Recolored textures
     reuse the base meta (anchors/scale); fall back to native color while
     they bake. */
  let entry = baseEntry;
  const colored = getColoredHairTextures(hairId, hairColorId);
  if (colored && baseEntry) entry = { tex: colored, meta: baseEntry.meta, fallbackTex: baseEntry.tex }; /* v2.3.1305 */
  _placeTrait(display._hairSprite, entry, display, pose, dir, mirror, frameIdx, bodyScale,
    hairPoseTune(pose, dir)); /* v2.3.1454: jog-east size correction (hats keep their own tune) */
  _clipHairToHat(display, hatId, hairId, pose, dir, mirror, frameIdx, bodyScale); /* v2.3.1959: hairId — the mask needs the hat's hair-dependent fit too */
  _orderHairOverHat(display, hatId);
}

/* ═══ v2.3.1764: HAIR OVER HEADPHONES ═══
   Owner: "Layer the hair on top of headphones."

   The hair sprite is added to the container BEFORE the headwear sprite
   (v2.3.357), so headwear draws over hair — correct for a hat or a helmet,
   wrong for headphones, which sit on the EARS with hair falling over the band.

   The order is swapped per piece rather than per frame-cost: setChildIndex is
   only called when the current order disagrees with what the piece declares,
   so a hat costs nothing and headphones cost one call on the frame you put
   them on.  The flag lives in the headwear catalog beside the piece's name
   (headwearUnderHair), because "does my hair cover this" is a property of the
   thing you are wearing, not of the renderer. */
/* v2.3.1764: QA probe — who is drawn on top, read off the live container. */
let _lastHairDisplay = null;
if (typeof window !== 'undefined') {
  window.__btHairOrder = () => {
    const d = _lastHairDisplay;
    const hair = d && d._hairSprite, hat = d && d._headwearSprite;
    if (!hair || !hat || !hair.parent) return null;
    const p = hair.parent;
    return { hairOverHat: p.getChildIndex(hair) > p.getChildIndex(hat),
      hatVisible: !!hat.visible, hairVisible: !!hair.visible };
  };
}
/* v2.3.2186: QA probe — is the hair clipped to the cape's hood, and is the
   mask staying invisible?  Read off the live container rather than off the
   code's intentions: the v2.3.2153 cape bug passed every scene-graph assertion
   while drawing nothing, because the assertions asked what the code meant. */
if (typeof window !== 'undefined') {
  window.__btCapeHair = () => {
    const d = _lastHairDisplay;
    if (!d) return null;
    const hair = d._hairSprite, hm = d._capeHoodMask, hatMask = d._hairMask;
    return {
      hairVisible: !!(hair && hair.visible),
      maskedToHood: !!(hair && hm && hair.mask === hm),
      hoodMaskReady: !!(hm && hm._btReady),
      hatMaskVisible: !!(hatMask && hatMask.visible),
      hoodMaskDrawn: !!(hm && hm.visible),
      capeBackOn: !!(d._capeBackSprite && d._capeBackSprite.visible),
      capeFrontOn: !!(d._capeSprite && d._capeSprite.visible),
    };
  };
}
function _orderHairOverHat(display, hatId) {
  _lastHairDisplay = display;
  const hair = display && display._hairSprite;
  const hat = display && display._headwearSprite;
  if (!hair || !hat || !hair.parent || hair.parent !== hat.parent) return;
  const parent = hair.parent;
  const want = headwearUnderHair(hatId);
  const hairIdx = parent.getChildIndex(hair);
  const hatIdx = parent.getChildIndex(hat);
  const hairIsOver = hairIdx > hatIdx;
  if (want === hairIsOver) return;
  try { parent.setChildIndex(hair, want ? hatIdx : Math.max(0, hatIdx - 1)); } catch (e) { /* order is cosmetic */ }
}

/* v2.3.867: composite the player's CURRENT traits (hat / beard / hair) onto a
   stand-in skill sprite — the pre-drawn chopper / cook / fire-lighter that
   REPLACES the trait-composed body during woodcutting / cooking / firemaking.
   Standalone version of _placeTrait: the caller (effectsRenderer) owns the
   three sprites and passes the crown WORLD position (computed from the
   stand-in's own transform), a scale, and the trait direction (south for the
   front-facing cook/fire, east for the side-facing chopper).  No 256-frame /
   spriteBody assumptions — placement is purely world-space. */
function _placeStandaloneTrait(sprite, entry, dir, mirror, cwx, cwy, scaleVal, liftY, mulX) {
  if (!sprite) return;
  /* v2.3.1305: same native-color fallback as _placeTrait — see there. */
  const tex = entry && (entry.tex[dir] || (entry.fallbackTex && entry.fallbackTex[dir]));
  const meta = entry && entry.meta;
  const anchorPx = (meta && meta.anchors && meta.anchors[dir]) || null;
  if (!(tex && meta && meta.fullFrame && anchorPx)) { sprite.visible = false; return; }
  if (sprite.texture !== tex) sprite.texture = tex;
  const screenDir = mirror ? (MIRROR_SCREEN_DIR[dir] || dir) : dir;
  const _pick = (obj) => obj && (obj[screenDir] != null ? obj[screenDir] : obj[dir]);
  const nudge = _pick(meta.crownNudge) || [0, 0];
  const dscale = (_pick(meta.scale) || 1);
  const m = mirror ? -1 : 1;
  /* v2.3.1532: the SAME 256-space normalisation _placeTrait got in v2.3.1526,
     which this second placement path was missed by.  meta.anchors is in the
     256 frame the art was authored in; trait art is stored at 128 now.  The
     old line divided by the TEXTURE's width, so a 128 texture doubled the
     anchor fraction — the pivot ran off the end of the sprite and the trait
     flew off the head at half size on every stand-in pose (owner: "during the
     attack animations for bow and sword the head customization flies off the
     head" — the sword-swing and bow-shot stand-ins composite through here, as
     do chop / cook / firemaking).  Divide by the 256 frame and multiply the
     draw scale by 256/texWidth, so a trait still stored at 256 gets norm=1
     and is untouched. */
  const W = 256;
  const norm = W / (tex.width || W);
  sprite.anchor.set(anchorPx[0] / W, anchorPx[1] / W);
  sprite.x = cwx + nudge[0] * scaleVal * m;
  /* v2.3.1561: liftY is the float-above-hair clearance (256-space, same
     units as crownNudge) — the stand-in poses composite through here, so
     without it the halo would sink back onto the hair mid-chop/mid-swing. */
  sprite.y = cwy + (nudge[1] + (liftY || 0)) * scaleVal;
  /* v2.3.1943: mulX is the band refit — the stand-in poses composite through
     here, so without it a headband would snap back to its bare-head width for
     the quarter-second of every swing, chop and cook. */
  sprite.scale.x = m * scaleVal * dscale * norm * (mulX || 1);
  sprite.scale.y = scaleVal * dscale * norm;
  sprite.visible = true;
}

/* ═══ v2.3.2190: THE CAPE ON AN ATTACK STAND-IN, HUNG FROM THE HEAD ═══
 *
 * Owner: "the attack animations need to have the cape anchored on the player's
 * head to look right."
 *
 * v2.3.2023 left the cape OFF every attack and wrote down why: a swing hides
 * the real body and redraws the whole figure as a stand-in in effectsRenderer,
 * so a cape placed from `_spriteBody` would hang in mid-air beside the swing --
 * and drawing it twice would mean "two renderers holding one piece of geometry",
 * which is how the back shield went wrong.  That reasoning was right about the
 * BODY and it does not apply to the HEAD, which is what the owner's word
 * "anchored" identifies:
 *
 *   the stand-in's crown is ALREADY computed every frame, in world space, by
 *   _placeSkillTraitsOn, out of crowns.json -- and hats, hair, beards and the
 *   hair clip have all been composited onto attacks from it since v2.3.867.
 *
 * So this is not a second geometry: it is the same crown anchor those four
 * already ride, with one more sprite pair on it.  There is nothing here for a
 * future change to drift out of step with, because there is no second copy of
 * the placement -- if crowns.json moves, everything on the head moves together.
 *
 * WHERE THE CAPE'S OWN CROWN IS.  The art is a full 256 frame fitted against
 * the real stand-<dir> body (import_cape_green.py), so the point on it that
 * corresponds to a head is the STANDING body's crown -- exactly the value
 * _placeCape already reaches for as its reference, out of body-tops.json.
 * Anchoring the frame there and dropping it on the stand-in's crown is the
 * whole placement; the hood lands on the head and the panels fall from the
 * shoulders below it.
 *
 * WHY THE SIZE IS NOT scaleVal, WHICH IS WHAT THE HATS USE.  It was, and the
 * pictures rejected it: the cape came out 19% oversized on the south swing and
 * 49% on the east one, swallowing the arms it should hang beside (measured, the
 * 256 frame drawing 136.5px and 170.6px against the standing figure's 114.6).
 * _skillTraitMul is a HEAD number -- "the hat matches how it sits idle rather
 * than being sized to the lumberjack's small head" -- and a stand-in is not the
 * walking figure rescaled: it is separate art whose head sits in a different
 * proportion to its body.  Matching the head therefore cannot match the body,
 * and a cape is a body-length garment.
 *
 * So the size is derived per frame from the figure itself, with no table to
 * tune and none to fall out of date: the cape is drawn so that its own
 * CROWN-TO-HEM spans the stand-in's own CROWN-TO-FEET.  Both ends are already
 * known -- the stand-in's crown is the crowns.json row this placement is
 * anchored at and its feet are the sprite's bottom (the stand-ins are anchored
 * 0.5, 1), and the cape's crown is the standing body-top the frame is fitted
 * to, with the 256 frame's own bottom as its hem.  A stand-in re-cut to a new
 * frame size self-corrects, which is exactly what _skillTraitMul could not do
 * when the fire art went from 220 to 512 (v2.3.1715) and every hat on that pose
 * silently rendered at 43%.
 *
 * The split is the walking path's, read off the art the same way: a hood
 * texture existing means this facing draws the panels behind and the hood in
 * front (south/southwest/east), and its absence means the single sprite
 * (north/northeast, the back view).  The z-order is the caller's -- the panels
 * have to go under the stand-in BODY, which this function cannot see. */
function _placeStandaloneCapeLayer(sprite, tex, standTop, mirror, cwx, cwy, scaleVal) {
  if (!sprite) return false;
  const fw = tex && ((tex.frame && tex.frame.width) || tex.width);
  if (!tex || !fw || !standTop) { sprite.visible = false; return false; }
  if (sprite.texture !== tex) sprite.texture = tex;
  const W = 256;
  /* The anchor is a fraction of the TEXTURE, and the texture is the whole
     authored frame however many pixels it is stored at -- so the fraction is
     the 256-space crown over 256 either way.  Same reasoning as
     _placeStandaloneTrait's, and the same trap it records (v2.3.1532): the
     SCALE is what has to know the storage size, through norm. */
  sprite.anchor.set(standTop[0] / W, standTop[1] / W);
  const m = mirror ? -1 : 1;
  sprite.x = cwx;
  sprite.y = cwy;
  sprite.scale.x = m * scaleVal * (W / fw);
  sprite.scale.y = scaleVal * (W / fw);
  /* No tilt here on purpose.  The jog tilt exists because a RUNNER leans into
     the direction of travel (v2.3.2024); a stand-in is drawn in its own pose
     with its own lean already in the art, and rotating the cape on top of that
     would be leaning twice.  The hood would land off the head besides, which
     is the v2.3.2189 bug over again. */
  if (sprite.rotation !== 0) sprite.rotation = 0;
  sprite.visible = true;
  return true;
}

/** Hide a stand-in trait set's cape layers, and drop the hood's hair clip.
    Not exported: hideSkillTraits below is the door every caller already uses,
    and a second one would be a way to take the cape down without taking the
    clip with it. */
function hideStandInCape(sprites) {
  if (!sprites) return;
  if (sprites.capeBack) sprites.capeBack.visible = false;
  if (sprites.capeHood) sprites.capeHood.visible = false;
  /* The clip goes with them.  Leaving _btReady set would clip the hair to a
     hood that is not on screen -- a bald patch, which is the exact bug the
     capehair probe caught on the walking path at v2.3.2186. */
  if (sprites.capeHoodMask) {
    sprites.capeHoodMask.visible = false;
    sprites.capeHoodMask._btReady = false;
  }
}

/** Place a stand-in's cape from the crown world position.  Returns true if any
    cape layer is now drawn, so the caller knows whether to re-order it. */
export function placeStandInCape(sprites, capeId, dir, mirror, cwx, cwy, crownToFeet) {
  if (!sprites || !(sprites.capeBack || sprites.capeHood)) return false;
  const tex = (capeId && capeId !== 'none') ? getCapeTexture(capeId, dir) : null;
  const standTop = _lookupBodyTop('stand', dir, 0);
  if (!tex || !standTop) { hideStandInCape(sprites); return false; }
  /* The cape's own crown-to-hem, in the 256 frame it is authored in. */
  const capeSpan = 256 - standTop[1];
  if (!(crownToFeet > 0) || !(capeSpan > 0)) { hideStandInCape(sprites); return false; }
  const scaleVal = crownToFeet / capeSpan;
  const hoodTex = getCapeHoodTexture(capeId, dir);
  const split = !!(hoodTex && sprites.capeBack);
  const front = split ? hoodTex : tex;
  if (split) {
    _placeStandaloneCapeLayer(sprites.capeBack, tex, standTop, mirror, cwx, cwy, scaleVal);
  } else if (sprites.capeBack) {
    sprites.capeBack.visible = false;
  }
  const drawn = _placeStandaloneCapeLayer(sprites.capeHood, front, standTop, mirror, cwx, cwy, scaleVal);
  const hoodMask = sprites.capeHoodMask;
  if (hoodMask) {
    const mtex = split ? getCapeHoodMaskTexture(capeId, dir) : null;
    if (mtex && _placeStandaloneCapeLayer(hoodMask, mtex, standTop, mirror, cwx, cwy, scaleVal)) {
      /* A mask is sampled, not drawn -- visible would paint a white hood. */
      hoodMask.visible = false;
      hoodMask._btReady = true;
    } else {
      hoodMask.visible = false;
      hoodMask._btReady = false;
    }
  }
  return drawn;
}

/* v2.3.910: how long the sword-swing stand-in plays (the 14-frame swing maps
   across this window from S.swingTimer).  Exported so effectsRenderer drives
   the same window when it draws the stand-in and composites the traits. */
export const SWORD_SWING_MS = 300;

/* v2.3.925: how long the bow-shoot stand-in plays per ranged shot (its frames
   -- load/pull/release -- map across this window from the shot timestamp
   S._bowShotAt; the release frame then holds for the remainder). */
export const BOW_SHOT_MS = 360;
/* v2.3.937: the draw is quick -- load + pull play across this short window and
   the bow snaps to its release frame by BOW_RELEASE_MS; the procedural arrow
   launches from the teal grip at that moment (see projectiles.js, which mirrors
   this value).  Owner: "speed up draw, release early". */
export const BOW_RELEASE_MS = 110;

/* v2.3.1776: QA probe — is the stand-in hair actually clipped?  "The mask
   sprite got placed" and "the hair is masked to it" are different facts, and
   only the second is what the owner asked for, so the probe reads the live
   hair sprite's own `mask` reference. */
const _standInHairClip = { hat: null, clipsHair: false, masked: false, maskVisible: false,
  /* v2.3.2192: ...and whether the clip landed on the HOOD instead of a hat.
     `masked` above compares against the HAT's mask sprite, so it reads false on
     a hooded head that is correctly clipped -- which is why v2.3.2190 could
     ship the hood fallback with a green test: the only thing asserted was that
     the mask was READY, and "the mask got placed" and "the hair is masked to
     it" are different facts (the distinction this probe was built for at
     v2.3.1776, missed here on its own terms). */
  maskedToHood: false, hoodReady: false, hairVisible: false };
if (typeof window !== 'undefined') window.__btStandInHairClip = () => Object.assign({}, _standInHairClip);

/* ═══ v2.3.1776: THE HAIR IS CLIPPED ON THE STAND-INS TOO ═══
   Owner: "can you also make the hair mask apply when swinging".

   _clipHairToHat (above) masks the hair to a clipping hat's silhouette on the
   WALKING figure, and every stand-in pose — swing, bow shot, chop, cook,
   firemaking, and the remote-player versions of the first two — composites its
   head traits through placeSkillTraits instead, which never had the mask.  So
   a helmet that correctly contained your hair while you stood there let it
   burst back out for the quarter-second of every swing.

   Same textures, same meta, same per-hat pose tune as the walking path; the
   difference is only that these sprites are placed standalone (no `display`
   container) so the mask goes through _placeStandaloneTrait.  The caller owns
   the mask sprite — it has to be in the scene graph for Pixi to use it, and
   the trait sets are parented by effectsRenderer. */
/* v2.3.1959: `fit` is the {dy256, mulX} the CALLER already computed for the
   hat sprite a few lines above — passed in rather than recomputed here, so on
   this path the hat and its mask are placed from one value and there is
   nothing for a future adjustment to fall behind on.  It used to recompute
   only the float lift and knew nothing about the band refit. */
function _clipStandInHair(sprites, hatId, dir, mirror, cwx, cwy, scaleVal, fit) {
  const hair = sprites && sprites.hair;
  const maskSprite = sprites && sprites.hairMask;
  if (!hair || !maskSprite) return;
  const helmet = _ensureHeadwearLoaded(hatId);
  const meta = helmet && helmet.meta;
  const maskEntry = (meta && meta.clipsHair) ? _ensureHairMaskLoaded(hatId) : null;
  /* The probe records at BOTH exits.  Recording only where the clip is applied
     left it reporting the last hat that DID clip — so taking a helmet off read
     as still-clipped, which is the failure the test caught in the instrument
     rather than in the game. */
  const _rec = () => {
    if (typeof window === 'undefined') return;
    _standInHairClip.hat = hatId || null;
    _standInHairClip.clipsHair = !!(meta && meta.clipsHair);
    _standInHairClip.masked = hair.mask === maskSprite;
    _standInHairClip.maskVisible = !!maskSprite.visible;
    const _hm = sprites.capeHoodMask;                          /* v2.3.2192 */
    _standInHairClip.maskedToHood = !!(_hm && hair.mask === _hm);
    _standInHairClip.hoodReady = !!(_hm && _hm._btReady);
    _standInHairClip.hairVisible = !!hair.visible;
  };
  if (!(meta && meta.clipsHair && hair.visible && maskEntry && maskEntry.tex[dir])) {
    maskSprite.visible = false;
    /* v2.3.2190: ...but a HOOD clips hair too, and on a stand-in the cape is
       placed just before this runs.  Same fallback the walking path grew at
       v2.3.2186, and for the same report ("hair sticking out"): a hood the hair
       bursts out of looks no better mid-swing than it does mid-stride.  A hat
       that clips still wins -- it is the inner layer, worn under the hood. */
    const hoodMask = sprites.capeHoodMask;
    if (hair.visible && hoodMask && hoodMask._btReady) {
      if (hair.mask !== hoodMask) hair.mask = hoodMask;
    } else if (hair.mask) {
      hair.mask = null;
    }
    _rec();
    return;
  }
  /* The mask must land exactly where the HAT lands, so it is placed with the
     hat's meta and the hat's own hair-dependent fit — not the hair's. */
  _placeStandaloneTrait(maskSprite, { tex: maskEntry.tex, meta }, dir, mirror, cwx, cwy, scaleVal,
    fit && fit.dy256, fit && fit.mulX);
  if (maskSprite.visible) {
    if (hair.mask !== maskSprite) hair.mask = maskSprite;
  } else if (hair.mask) {
    hair.mask = null;   /* placed nowhere -> do not clip the hair to nothing */
  }
  _rec();
}

/** Place hat + beard + hair (the player's current selection) on a stand-in
 *  skill sprite.  sprites = { hat, beard, hair } owned by the caller. */
export function placeSkillTraits(sprites, cwx, cwy, dir, mirror, scaleVal) {
  if (!sprites) return;
  /* hair first (renders behind the hat in the caller's child order), then
     beard, then hat. */
  let hairEntry = _ensureHairLoaded(getHair());
  const hairCol = getColoredHairTextures(getHair(), getHairColor());
  if (hairCol && hairEntry) hairEntry = { tex: hairCol, meta: hairEntry.meta, fallbackTex: hairEntry.tex }; /* v2.3.1305 */
  _placeStandaloneTrait(sprites.hair, hairEntry, dir, mirror, cwx, cwy, scaleVal);

  let fhEntry = _ensureFacialHairLoaded(getFacialHair());
  const fhCol = getColoredFacialHairTextures(getFacialHair(), getFacialHairColor());
  if (fhCol && fhEntry) fhEntry = { tex: fhCol, meta: fhEntry.meta, fallbackTex: fhEntry.tex }; /* v2.3.1305 */
  _placeStandaloneTrait(sprites.beard, fhEntry, dir, mirror, cwx, cwy, scaleVal);

  let hwEntry = _ensureHeadwearLoaded(getHeadwear());
  const hwCol = getColoredHatTextures(getHeadwear(), getHatColor());
  if (hwCol && hwEntry) hwEntry = { tex: hwCol, meta: hwEntry.meta, fallbackTex: hwEntry.tex }; /* v2.3.1305 */
  /* v2.3.1959: ONE fit for the hat and for the mask it clips the hair to. */
  const hwFit = _hatHairFit(getHeadwear(), hwEntry && hwEntry.meta, getHair(), 'stand', dir, mirror);
  _placeStandaloneTrait(sprites.hat, hwEntry, dir, mirror, cwx, cwy, scaleVal,
    hwFit.dy256, hwFit.mulX); /* v2.3.1561; v2.3.1943 */
  _clipStandInHair(sprites, getHeadwear(), dir, mirror, cwx, cwy, scaleVal, hwFit); /* v2.3.1776 */
}

/* v2.3.1011: like placeSkillTraits, but for an ARBITRARY player's appearance
   (passed in `looks`) instead of the local getHair()/getHeadwear() globals --
   used to composite a REMOTE player's hair/beard/hat onto their attack stand-in
   (MP parity).  looks = { hair, hairColor, facialhair, facialHairColor,
   headwear, hatColor }. */
export function placeSkillTraitsFor(sprites, looks, cwx, cwy, dir, mirror, scaleVal) {
  if (!sprites || !looks) return;
  let hairEntry = _ensureHairLoaded(looks.hair);
  const hairCol = getColoredHairTextures(looks.hair, looks.hairColor);
  if (hairCol && hairEntry) hairEntry = { tex: hairCol, meta: hairEntry.meta, fallbackTex: hairEntry.tex }; /* v2.3.1305 */
  _placeStandaloneTrait(sprites.hair, hairEntry, dir, mirror, cwx, cwy, scaleVal);

  let fhEntry = _ensureFacialHairLoaded(looks.facialhair);
  const fhCol = getColoredFacialHairTextures(looks.facialhair, looks.facialHairColor);
  if (fhCol && fhEntry) fhEntry = { tex: fhCol, meta: fhEntry.meta, fallbackTex: fhEntry.tex }; /* v2.3.1305 */
  _placeStandaloneTrait(sprites.beard, fhEntry, dir, mirror, cwx, cwy, scaleVal);

  let hwEntry2 = _ensureHeadwearLoaded(looks.headwear);
  const hwCol2 = getColoredHatTextures(looks.headwear, looks.hatColor);
  if (hwCol2 && hwEntry2) hwEntry2 = { tex: hwCol2, meta: hwEntry2.meta, fallbackTex: hwEntry2.tex }; /* v2.3.1305 */
  /* v2.3.1959: ONE fit for the hat and for the mask it clips the hair to. */
  const hwFit2 = _hatHairFit(looks.headwear, hwEntry2 && hwEntry2.meta, looks.hair, 'stand', dir, mirror);
  _placeStandaloneTrait(sprites.hat, hwEntry2, dir, mirror, cwx, cwy, scaleVal,
    hwFit2.dy256, hwFit2.mulX); /* v2.3.1561; v2.3.1943 */
  _clipStandInHair(sprites, looks.headwear, dir, mirror, cwx, cwy, scaleVal, hwFit2); /* v2.3.1776 */
}

/** Hide all three skill-trait sprites (no stand-in active this frame). */
export function hideSkillTraits(sprites) {
  if (!sprites) return;
  hideStandInCape(sprites);                                  /* v2.3.2190 */
  if (sprites.hat) sprites.hat.visible = false;
  if (sprites.beard) sprites.beard.visible = false;
  if (sprites.hair) sprites.hair.visible = false;
  /* v2.3.1776: drop the clip with them.  A hair sprite that is hidden while
     still holding a mask keeps Pixi doing the stencil work for something
     nobody can see, and the next pose to reuse this set would inherit the
     previous hat's silhouette. */
  if (sprites.hair && sprites.hair.mask) sprites.hair.mask = null;
  if (sprites.hairMask) sprites.hairMask.visible = false;
}


/* v2.3.354: per-frame beard z-order.  The beard is on the face, so it
   needs a direction-dependent layer just like the weapon + shield:
   - Rear facings (NW 5 / N 6 / NE 7): the beard sits BEHIND the head --
     only the fuzz that extends past the head silhouette peeks out.  The
     old rule put it 'just above the body', which stamped the beard sliver
     ON the back of the head (user report, v2.3.679).
   - Every other facing: the beard hangs over the chin and down the chest,
     so it renders ABOVE the body AND above the worn gear (chest plate /
     pauldrons) -- the old 'bodyIdx + 1' target predated the gear layers
     and left the beard hidden behind the armour on S/SW/SE.  On E / W it
     additionally goes above the hand-cap body-clones (the hand swing
     crosses the face and the clones would erase it).  The weapon stays
     above the beard on the toward-camera facings via the block below.
   Shared by local + remote (remote displays simply lack the hand/shield
   sprites, so those are skipped). */
function _orderTraitsAndWeapon(display, facingIdx, hatId) {
  /* --- Pickup head overlay above the worn plate (v2.3.1055) ---
     _placePickupHead put the head-only sheet on _bodyHead; lift it above the
     body + worn gear so the raised arm/pauldron plate can't cover it. Same
     setChildIndex-to-highest-visible-ref move the beard uses just below. */
  const phead = display._bodyHead;
  if (phead && phead.visible) {
    /* v2.3.1116: guarded -- getChildIndex throws if a referenced sprite isn't a
       child of `display` (a transient layout state), and this runs every frame
       during the loot freeze, so an unguarded throw freezes the whole game. */
    try {
      /* v2.3.1553 (owner: "can you actually put the head behind the armor
         shoulder for jog east?  The shoulder should be the layer in front if
         you think about the perspective").  Correct: east/west is a PROFILE,
         so the near pauldron and the collar are between the camera and the
         neck.  Drawing the head over them put bare skin on top of steel that
         is physically in front of it, which is what read as the head sitting
         on the armour rather than in it.
         The lift exists because the fullset used to carry a HELMET that would
         swallow the face; the helmet has been cut off since v2.3.1368, so on
         this facing there is nothing above the collar to hide behind and the
         face stays fully visible with the head underneath -- only the jaw and
         neck are occluded, which is the point.  Set per frame beside the head
         placement; every other facing keeps the lift. */
      if (display._headBehindGear && display._spriteBody
          && display._spriteBody.parent === display && phead.parent === display) {
        const bi = display.getChildIndex(display._spriteBody);
        if (display.getChildIndex(phead) > bi) display.setChildIndex(phead, bi);
      } else {
        let ref = -1;
        /* ═══ v2.3.2278: _gearShirt WAS MISSING FROM THIS LIST ═══
           Owner (v2.3.1914): "When fishing that hand needs to be over the
           shirt during the reel animation instead of under it."  That fix has
           been a NO-OP ever since, for the commonest character there is.
           The list is what the head/hand overlay is lifted ABOVE.  With only
           a tee on, the sole visible member was _spriteBody (child index 3) --
           and _bodyHead is index 4, so `hi < ref` was 4 < 3, false, and no
           lift ever happened; _gearShirt is index 10 and drew straight over
           the reeling hand.  Leg armour reaches the same end by a different
           road (_gearLegs is index 9, above _bodyHead), which is the case the
           owner reported.  Adding the shirt fixes both and the default. */
        for (const s of [display._spriteBody, display._gearShirt, display._gearLegs, display._gearChest, display._gearShoulders]) {
          if (s && s.visible && s.parent === display) ref = Math.max(ref, display.getChildIndex(s));
        }
        if (ref >= 0 && phead.parent === display) { const hi = display.getChildIndex(phead); if (hi < ref) display.setChildIndex(phead, ref); }
      }
    } catch (e) { /* leave head where it is this frame */ }
  }
  const beard = display._facialHairSprite;
  /* --- Beard layer --- */
  if (display._spriteBody && beard && beard.visible) {
    /* Rear = away-from-camera: NW(5) / N(6) / NE(7).  SW(3) shows the
       face, so it belongs with the toward-camera facings (beard above
       body + gear like S/SE) -- it was briefly swept into the rear set
       and the beard vanished on southwest (user report, v2.3.698).
       NE history: v2.3.679 had NE rear -> beard invisible on the OLD
       NE art (user report, v2.3.689) -> moved to the toward set.  On
       the regenerated NE sheets (v2.3.708+) that draws the beard OVER
       the back of the head, and only on NE -- NW, its mirror twin, was
       rear -- so the beard "showed on one side only".  Owner call
       (2026-07-19): both diagonals layer the beard BEHIND the head. */
    const rearFacing = (facingIdx === 5 || facingIdx === 6 || facingIdx === 7);
    if (rearFacing) {
      /* Behind the head: insert just BELOW the body sprite. */
      const bodyIdx = display.getChildIndex(display._spriteBody);
      const fhIdx = display.getChildIndex(beard);
      if (fhIdx > bodyIdx) display.setChildIndex(beard, bodyIdx);
    } else {
      /* Above body + gear (+ hand clones / shield where they cross the
         face).  setChildIndex removes-then-inserts, so inserting at the
         highest reference index lands the beard directly above it. */
      let ref = display.getChildIndex(display._spriteBody);
      /* v2.3.1099: include the SHIRT (_gearShirt) -- the beard hangs over the
         chest, so on toward-camera facings it must sit above the t-shirt too,
         not just the armour. Without it, a shirt worn with no armour rendered
         OVER the beard (beard "behind the t-shirt" on south). */
      for (const s of [display._gearShirt, display._gearLegs, display._gearChest, display._gearShoulders,
                       display._bodyHead,   /* v2.3.1055: pickup head overlay */
                       display._handCapSprite, display._handArmSprite,
                       display._shieldSprite]) {
        if (s && s.visible) ref = Math.max(ref, display.getChildIndex(s));
      }
      /* v2.3.1934: ...and above the HAT, for the pieces that declare it
         (headwearBehindBeard).  Headwear is normally above facial hair so a
         brim or a cheek guard can overlap the face; a keffiyeh's side drape is
         the exception the owner hit -- it was covering the beard on southwest.
         Joining this list rather than getting its own pass means the beard
         still lands above the gear it already had to clear. */
      if (headwearBehindBeard(hatId)) {
        const hw = display._headwearSprite;
        if (hw && hw.visible && hw.parent === display) ref = Math.max(ref, display.getChildIndex(hw));
      }
      const fhIdx = display.getChildIndex(beard);
      if (fhIdx < ref) display.setChildIndex(beard, ref);
    }
  }
  /* --- Weapon in front of ALL body traits on the toward-camera facings
     (E=0 / SE=1 / S=2 / NE=7).  The weapon swings across the upper body
     there, so headwear + facial hair + hair (and any future body trait)
     render BEHIND it.  Lift the weapon just above the highest trait. */
  if (facingIdx === 0 || facingIdx === 1 || facingIdx === 2 || facingIdx === 7) {
    const wc = display._weaponContainer;
    if (wc && wc.visible) {
      let ref = -1;
      for (const s of [display._headwearSprite, display._facialHairSprite, display._hairSprite, display._shirtSprite]) {
        if (s && s.visible) ref = Math.max(ref, display.getChildIndex(s));
      }
      if (ref >= 0) {
        const wcIdx = display.getChildIndex(wc);
        if (wcIdx < ref) display.setChildIndex(wc, ref);
      }
    }
  }
}

/* Look up the head-box for the current pose/dir/frame.  Falls back to
   stand-{dir}-0 if the requested frame has no entry. */
function _lookupHeadBox(pose, dir, frame) {
  if (!_bodyAnchors) return null;
  const key = `${pose}-${dir}-${frame}`;
  const entry = _bodyAnchors[key];
  if (entry && entry.head) return entry.head;
  const fallback = _bodyAnchors[`stand-${dir}-0`];
  return (fallback && fallback.head) || null;
}

/* Look up the STAND-pose head box for the given direction.  Used to
   lock trait size to a consistent reference -- per-frame jog head
   boxes vary slightly and would make the trait "breathe" with the
   walk cycle if used for sizing. */
function _lookupStandHeadBox(dir) {
  if (!_bodyAnchors) return null;
  const entry = _bodyAnchors[`stand-${dir}-0`];
  return (entry && entry.head) || null;
}

/* Raw topmost-opaque-pixel [x, y] for (pose, dir, frame) from
   body-tops.json.  No head detection, no smoothing -- just the
   actual top of the body silhouette for this frame. */
function _lookupBodyTop(pose, dir, frame) {
  if (!_bodyTops) return null;
  return _bodyTops[`${pose}-${dir}-${frame}`] || _bodyTops[`stand-${dir}-0`] || null;
}
const _traitTex = { east: null, north: null, northeast: null, south: null, southwest: null };
/* v2.3.264: faceless mannequin textures used as the stand-pose body
   when a trait is active.  The default player body has baked-in face
   features that show through any trait overlay; swapping to the
   mannequin gives the trait a faceless head to land on.  Only stand
   pose has mannequin assets so far -- jog/hit/pickup still use the
   default body sheets. */
const _mannequinTex = { east: null, north: null, northeast: null, south: null, southwest: null };
/* Per-direction trait metadata: bbox + bbox-center anchor.  Computed
   by Python at extract time; the renderer uses anchor / 256 to place
   the trait's center on the body's head anchor regardless of AI
   drift in the original extraction. */
let _traitMeta = null;
let _traitLoadStarted = false;
function _ensureTraitTextures() {
  if (_traitLoadStarted) return;
  _traitLoadStarted = true;
  fetch(`/sprites/traits/nft/${TRAIT_NFT_ID}/meta.json?v=${TRAIT_VER}`)
    .then(r => r.ok ? r.json() : null)
    .then(j => { if (j) _traitMeta = j; })
    .catch(() => {});
  for (const dir of Object.keys(_traitTex)) {
    Assets.load(`/sprites/traits/nft/${TRAIT_NFT_ID}/${dir}.png?v=${TRAIT_VER}`)
      .then(t => {
        _traitTex[dir] = t;
        if (t && t.source) {
          t.source.scaleMode = 'linear';
          t.source.autoGenerateMipmaps = true;
        }
      })
      .catch(() => {});
    Assets.load(`/sprites/player-naked/stand-${dir}.png?v=${TRAIT_VER}`)
      .then(t => {
        _mannequinTex[dir] = t;
        if (t && t.source) {
          t.source.scaleMode = 'linear';
          t.source.autoGenerateMipmaps = true;
        }
      })
      .catch(() => {});
  }
}

/* Heart-icon HUD: drawn above the head of player + monsters whenever
   curHp < maxHp (or within HOLD_MS of last hp change for the player).
   Replaces the prior pill-shaped HP bar.  Number is centered on the
   heart with a heavy black stroke so it reads on any background.
   Both hearts use the same sprite asset and the same size; the
   monster's is tinted 0x000000 (black) so a crowd of mobs around
   the player still visually parses as "those are monster HPs, mine
   is the red one."  v2.3.139 shrunk the player heart to 40 (3-digit
   fit); v2.3.141 matched the monster heart to the same size + sprite
   per user request. */
/* v2.3.1358 (owner directive: ALL animations ready before first use —
   CLAUDE.md "Animation preloading is LAW").  Kicks every head-trait set
   (base art for ALL catalog ids + the local player's selected recolors,
   hair-clip masks, the NFT face composite) and the HUD bar/heart
   textures, and returns a promise the intro gate awaits.  The ensure
   guards cache internally, so in-game first-use lookups become cache
   hits.  Remote players' arbitrary RECOLORS stay lazy by design (the
   recolor LRU holds 12 — pre-baking every color x trait combo would
   evict itself); their base art is covered here. */
export function preloadTraits() {
  const urls = [];
  const cats = [
    ['headwear', HEADWEAR_CATALOG],
    ['hair', HAIR_CATALOG],
    ['facialhair', FACIALHAIR_CATALOG],
  ];
  for (const [category, catalog] of cats) {
    for (const entry of catalog) {
      if (!entry.id || entry.id === 'none') continue;
      _ensureTraitLoaded(category, entry.id); /* kicks meta + all dirs (retry-guarded) */
      for (const dir of ['east', 'north', 'northeast', 'south', 'southwest']) {
        urls.push(`/sprites/traits/${category}/${entry.id}/${dir}.png?v=${TRAIT_VER}`);
      }
    }
  }
  /* Local player's live selection: recolors + hair-clip mask + NFT face. */
  try {
    getColoredHatTextures(getHeadwear(), getHatColor());
    getColoredHairTextures(getHair(), getHairColor());
    getColoredFacialHairTextures(getFacialHair(), getFacialHairColor());
    _ensureHairMaskLoaded(getHeadwear());
    _ensureTraitTextures();
    _ensureHudBarTextures();
  } catch (e) { /* individual warms are best-effort */ }
  /* Await the base art via Assets' per-URL dedup (same URLs the ensure
     guards fetch).  allSettled: a missing direction is normal for some
     traits (meta-declared) and must not hold the gate hostage.
     v2.3.1398: + the body placement schemas (anchors/tops) — without
     them EVERY hat/hair/beard is hidden, so they belong on the gate. */
  return Promise.allSettled([
    _ensureBodyData(),
    ...urls.map((u) => Assets.load(u).catch(() => {})),
  ]);
}

const PLAYER_HEART_SIZE = 40;
const MONSTER_HEART_SIZE = 40;
const PLAYER_HP_NUM_STYLE = {
  fontFamily: 'Source Sans 3, sans-serif',
  fontSize: 18,
  fontWeight: '800',
  fill: '#ffffff',
  /* v2.3.247: half-thickness outline for the HP number. */
  stroke: { color: '#000000', width: 1.5 },
  dropShadow: { color: '#000000', blur: 0, distance: 1, alpha: 0.9 },
  align: 'center',
};
/* HP ring widget (v2.3.458): replaces the above-head heart.  A quartile-
   colored progress arc drains clockwise from 12 o'clock; four ~1.5px gaps
   slice it into quadrants that land exactly on the 25/50/75% color
   thresholds, so the arc flips color as it recedes past each gap.  Muted-
   gray center holds the large current HP over a small muted max.  (A thin
   ring *around* the heart was tried in v2.3.249 and reverted; this is the
   full replacement widget.) */
const HP_RING_OUTER_R = 24;
const HP_RING_BAND = 5;
const HP_RING_CENTER_R = HP_RING_OUTER_R - HP_RING_BAND - 2; /* gray center disk */
const HP_RING_STROKE_R = HP_RING_OUTER_R - HP_RING_BAND / 2; /* arc centerline */
const HP_RING_GAP_PX = 1.5;
const HP_RING_TRACK = 0x202833;       /* muted slate (drained portion) */
const HP_RING_CENTER_FILL = 0x2b303a; /* muted gray center */
const HP_TIER_GREEN = 0x3ec27a, HP_TIER_YELLOW = 0xf5c542, HP_TIER_ORANGE = 0xe8843a, HP_TIER_RED = 0xe34646;
const HP_RING_OUTLINE = 0x12161d;  /* dark frame under the band so it doesn't blend into the world */
const HP_GHOST_WHITE = 0xffffff;   /* recently-lost HP trail */
const HP_GHOST_DRAIN = 0.010;      /* ghost catches down ~0.6/sec (per ~60fps frame) */
const HP_GHOST_DRAIN_M = 0.030;    /* v2.3.1338: MONSTER bars only — owner wants the white
                                      trail ~3x faster to drain; the player ring/widget keeps
                                      the slower v2.3.458 rate */
const HP_GHOST_HOLD_MS = 140;      /* brief hold before the white trail starts draining */
const HP_RING_MAX_STYLE = {
  fontFamily: 'Source Sans 3, sans-serif',
  fontSize: 10,
  fontWeight: '600',
  fill: '#9aa0ad',
  stroke: { color: '#000000', width: 1 },
  align: 'center',
};
const MONSTER_HP_NUM_STYLE = {
  fontFamily: 'Source Sans 3, sans-serif',
  fontSize: 17,
  fontWeight: '800',
  fill: '#ffffff',
  stroke: { color: '#000000', width: 3 },
  align: 'center',
};

/* Module-scope SECTORS array — shared by local + other player update
 * paths.  Was previously allocated as a `const` inside each per-frame
 * loop, which produced a small but recurring GC pressure source. */
const SECTORS = ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'];

/* Weapon swing animation — matches the Canvas 2D drawSpriteCharacter
 * timing (BroTown.jsx:3352).  250ms quadratic-ease-out rotation around
 * the hand pivot, sweeping ~107° from -53° to +53° relative to the
 * aim direction.  Each weapon's rest blade angle is the orientation
 * of the sprite as drawn (sword tilts NE, staff vertical, bow horiz). */
const SWING_ANIM_MS = 250;
const SWING_FULL_ARC = Math.PI * 0.85 * 0.70;   // ~107° visual sweep
const REST_ANG = {
  sword: -Math.PI / 4,
  greatsword: -Math.PI / 4,
  bow: 0,
  staff: -Math.PI / 2,
};

/**
 * NFT 360° render — applies the front/back cross-fade + horizontal
 * compression + shear lean to the display's _nftFront/_nftBack
 * sprites.  Mirrors the Canvas 2D drawNft360 path (BroTown.jsx
 * ~3594-3661).  Called when the regular sprite-sheet body isn't
 * being shown and the player has an NFT avatar URL whose textures
 * have loaded.
 *
 * Pixi has no native 2D matrix shear on Sprite, but skewing the
 * sprite is equivalent: tan(skewX) gives the c-coefficient we want,
 * and scale.y compensates so sprite height stays at 1×.
 */
function applyNftTransform(display, frontTex, backTex, facingAngle, size, bobY) {
  const front = display._nftFront;
  const back = display._nftBack;
  if (front.texture !== frontTex) front.texture = frontTex;
  if (back.texture !== backTex)   back.texture = backTex;

  /* turnFromCam: 0=facing camera, π=facing away (mirror of Canvas 2D). */
  const rawTurn = facingAngle - Math.PI / 2;
  const turnFromCam = Math.abs(((rawTurn % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
  const isFacingRight = Math.cos(facingAngle) > 0;
  const sinTurn = Math.sin(turnFromCam);

  /* Horizontal compression: 0.5 at pure side, 1.0 at front/back. */
  const sx = 0.5 + 0.5 * Math.abs(Math.cos(turnFromCam));
  /* Shear: 0 at front/back, peaks at sin(π/2)*0.25 = 0.25 at pure side. */
  const kx = sinTurn * 0.25 * (isFacingRight ? -1 : 1);
  /* Cross-fade band 70°-110° (matches Canvas 2D). */
  const fadeStart = 1.22, fadeEnd = 1.92;
  let frontAlpha, backAlpha;
  if (turnFromCam < fadeStart) { frontAlpha = 1; backAlpha = 0; }
  else if (turnFromCam > fadeEnd) { frontAlpha = 0; backAlpha = 1; }
  else {
    const t = (turnFromCam - fadeStart) / (fadeEnd - fadeStart);
    frontAlpha = 1 - t;
    backAlpha = t;
  }

  /* Pixi skew → matrix c = scale.y*sin(skewX), d = scale.y*cos(skewX).
     Want c = kx, d = 1 → skewX = atan(kx), scale.y = 1/cos(skewX). */
  const skewX = Math.atan(kx);
  const scaleY = 1 / Math.cos(skewX);
  /* Position both sprites at same place: bottom-anchored at y=10
     below display origin (matches Canvas 2D's nftY = py - 18). */
  const FOOT_Y = 10;
  for (const s of [front, back]) {
    s.x = 0;
    s.y = FOOT_Y + bobY;
    s.width = size;       // Pixi auto-respects scale; resetting here
    s.height = size;      // re-bases width/height to source size.
    s.scale.x = (isFacingRight ? -1 : 1) * sx;
    s.scale.y = scaleY;
    s.skew.x = skewX;
    s.skew.y = 0;
  }
  front.alpha = frontAlpha;
  back.alpha = backAlpha;
  front.visible = frontAlpha > 0.01;
  back.visible = backAlpha > 0.01;
}

function hideNft(display) {
  if (display._nftFront) display._nftFront.visible = false;
  if (display._nftBack)  display._nftBack.visible = false;
}

const NAME_STYLE = new TextStyle({
  fontFamily: 'Source Sans 3, sans-serif',
  fontSize: 10,
  fontWeight: '700',
  fill: '#ffffff',
  align: 'center',
  dropShadow: { color: '#000000', blur: 2, distance: 1 },
});

/* v2.3.1735: exported so effectsRenderer can place the stun star ring using
   the SAME size the monster container is built with.  Reading a `_size` off
   the monster object instead looks equivalent and is not: nothing sets that
   field on a real monster (only the QA fixtures do), so a hand-rolled
   fallback silently mis-places the ring on every live monster in the game. */
/* v2.3.2217: how long the renderer waits for the projectile event before
   playing the follow-through anyway.  A throw wind-up CAN resolve into no
   ball at all (the target left, or an earlier ball is still in the air —
   see _resolveBasicWindup), and without this he would hold the cocked pose
   forever. */
const THROW_RELEASE_GRACE_MS = 250;

export function getMonsterSize(archetype) {
  /* Slime/fodder stays small (renders as a 50-px sprite, the 8-px
     circle is the procedural fallback / hitbox anchor).  Snowman
     stays at 13 because its sprite anchor (spriteBody.y = size)
     pins the 64-px sprite's feet to the circle's bottom edge.
     Every other archetype is a bare procedural circle, so bump the
     radius to 32 (64-px diameter) per the user's "64x64 for non-
     slime monsters" call-out. */
  if (archetype === 'fodder' || MONSTER_VARIANTS[archetype]) return 8;
  if (archetype === 'snowman') return 13;
  return 32;
}

function getMonsterColor(archetype) {
  const colors = {
    fodder: 0x3dd497, swarm: 0xf5c542, brute: 0xff5e6c,
    sentinel: 0x5b52ff, volatile: 0xea580c, stalker: 0x8890b8,
    hexer: 0xa78bfa, snowman: 0xb0d8f0,
  };
  return colors[archetype] || 0x3dd497;
}

function cssColorToHex(css) {
  if (typeof css !== 'string') return 0x000000;
  return parseInt(css.replace('#', ''), 16) || 0x000000;
}

function createMonsterDisplay(monster) {
  const container = new Container();
  container.label = `monster_${monster.id}`;

  /* Body is STATIC (archetype-driven circle) — draw once at creation and
     never redraw.  Previously the entityRenderer called body.clear() +
     body.circle() + body.fill() every frame for every monster, which
     flushed the GPU batch and dominated frame time with 14 monsters in
     meadow.  Tinting / size live for archetype's lifetime. */
  const body = new Graphics();
  const size = getMonsterSize(monster.archetype);
  body.circle(0, 0, size);
  body.fill({ color: getMonsterColor(monster.archetype || monster.type) });
  if (monster.isBoss) {
    body.circle(0, 0, size + 3);
    body.stroke({ color: 0xff5e6c, width: 2 });
  }
  container.addChild(body);

  /* Sprite-sheet body for fodder slimes.  Only created here for the
     fodder archetype so non-slime monsters skip the extra display
     object entirely.  Sprite is anchored bottom-center (0.5, 1.0) so
     the "feet" line up at the same Y as the procedural circle's
     bottom; that keeps shadows / damage numbers at the right place
     when the sprite is taller than the circle. */
  const archKey = monster.archetype || monster.type;
  /* v2.3.1147: useSlimeSheets variants (mossSlime/mireWisp -- tinted
     slime reskins) ride the fodder sprite branch, so they count as
     fodder for spriteBody creation + the _isFodder render dispatch. */
  const isFodder = archKey === 'fodder'
    || !!(MONSTER_VARIANTS[archKey] && MONSTER_VARIANTS[archKey].useSlimeSheets);
  const variantKey = MONSTER_VARIANTS[archKey] ? archKey : null;
  const isSnowman = archKey === 'snowman';

  /* v2.3.1300: ground shadow at child 0 — feet are at y=size (the
     circle's bottom edge / the sprite's bottom-center anchor line).
     Inherits the container-level MONSTER_SIZE_MULT.

     ═══ v2.3.1704: NO SHADOW UNDER A SLIME ═══
     Owner (playtest): "Remove the shadow beneath the slimes (blue slimes)
     it's way beneath the monster."

     WHY IT LANDED THERE, measured rather than guessed.  The slime sheet is
     128px cells and the blob's opaque pixels stop at row ~85 — every frame
     of slime-idle-v5 has ~42px of empty cell BELOW the body.  The sprite is
     anchored bottom-centre at the feet line, so the shadow, which is pinned
     to that same line, sits 42 * (96/128) * MONSTER_SIZE_MULT ≈ 48 world px
     under the blob.  Screenshotted at 390x844: blob bottom at y=255, an 8px-
     tall ellipse centred at y=294 — a detached smudge in the middle of the
     road, which is exactly what the owner is describing.

     WHY REMOVE RATHER THAN RE-ANCHOR.  Two reasons, and the first is the
     stronger: v2.3.1365 already deleted the PLAYER's ground shadow at this
     owner's request ("do not re-add one here"), so a shadowless slime is the
     game's existing visual language, not a new look invented here.  Second,
     the art carries no baked shadow of its own to match against — decoded
     the sheet to check, there is no soft low-alpha ellipse under the body —
     so re-anchoring would mean AUTHORING a shadow the owner just asked to be
     rid of.  The offset fix is one line (`shadow.y = size - 32`) if they
     ever want the grounding back; this is the deliberate cheaper answer to
     what they actually said.

     ═══ v2.3.1824: THE GEOMETRY ABOVE IS NO LONGER TRUE ═══
     The 42 empty rows are still in the art, but the sprite is anchored on
     the blob's base row now (SLIME_BASE_ROW), so a shadow at
     `shadow.y = size` would land roughly under the blob rather than 48px
     adrift.  Leaving the slimes shadowless anyway: the owner asked for that
     directly, and the player has no shadow either (v2.3.1365).  Kept as a
     note rather than deleted, because this measurement is what made the
     anchor bug findable.

     GATED PER-VARIANT, deliberately: `isFodder` is the useSlimeSheets test,
     so it covers ALL FOUR slimes — plain fodder, blueSlime (the Verdant
     Wilds one the owner was looking at), mossSlime and mireWisp — because
     they share the sheet and therefore share the empty-cell geometry.
     Everything else (mummy/skeleton/fireGoblin/snowman/the procedural
     circles) keeps its shadow untouched; their art fills its cell and their
     shadows are not what was reported. */
  if (!isFodder) {
    const shadow = _mintShadow(size * 2.2);
    shadow.y = size;
    container.addChildAt(shadow, 0);
    container._shadow = shadow;
  } else {
    container._shadow = null;
  }

  const spriteBody = (isFodder || variantKey || isSnowman) ? new Sprite() : null;
  if (spriteBody) {
    spriteBody.anchor.set(0.5, 1.0);
    spriteBody.visible = false;
    container.addChild(spriteBody);
  }

  /* v2.3.1472: the above-head UI (level, HP bar frame/fill/fx, HP
     number) goes into its OWN container, parented to the monsterUi
     layer by the caller so it draws above gather nodes while this
     container's body stays behind them.  Positions are still monster-
     local — _updateMonsters mirrors x/y/scale onto it each frame. */
  const hpUi = new Container();
  container._hpUi = hpUi;

  /* ═══ v2.3.1918: MONSTERS GET THE PLAYER'S NAME PLATE ═══
     Owner: "Give monsters a name plate with their name and level beneath it
     similar to how the player has their name plate.  Remove current the
     level text that's on top of the monster."

     Both halves of that, and the same component for both — _attachNamePill
     is what draws the player's and every peer's plate, so a monster's is
     the same rounded slate pill with the name over a gold LV line.  A
     second plate implementation would be a second thing to keep in sync
     for a label the owner asked to MATCH.

     Lives on _hpUi rather than the body container: _hpUi is the sibling
     that already carries the above-head UI, is mirrored to the monster's
     position every frame, and sits in monsterUiLayer so the plate draws
     over gather nodes instead of behind a bush.  It also hides itself with
     the monster on death, which is what a corpse's plate should do.

     The plate hangs BELOW the origin.  Monster art is anchored on its base
     row (the same origin the procedural circle straddles), so +size clears
     the feet for the small archetypes and for the 96px sprites alike —
     they all stand ON this line, only their tops differ. */
  /* ═══ v2.3.2154: THE PLATES GO UP A COUPLE OF SIZES ═══
     Owner: "Make the character name plate, level, and monster nameplate and
     level a bit larger font."

     Raised at the FACTORY argument, not by scaling the container: a Pixi Text
     is a texture, and enlarging its container resamples glyphs rasterised at
     the old size -- bigger AND blurrier, which is the opposite of the ask and
     is the whole point of the v2.3.1821 note inside _attachNamePill. Passing a
     larger nameSize re-rasterises at the new size, and _pillH, the LV
     baseline and the verified badge are all derived from it, so the pill grows
     in proportion instead of the text spilling out of it.

     The player-to-peer relationship is preserved deliberately: yours has been
     one size above everyone else's since v2.3.1681, so 13/12 becomes 15/14
     rather than both landing on the same number. The NPC plate (9) is left
     alone -- the owner named the character and the monster, and the town NPCs
     are the one population where a bigger plate would crowd the street. */
  /* ═══ v2.3.2265: BACK DOWN, AND FURTHER THAN THE LAST CUT ═══
     Owner, twice: "Nameplates are now way too large" (v2.3.2262's full zoom
     compensation), then, of v2.3.2263's half-compensation, "reduce the font
     size of the name plates.  It's huge."

     v2.3.2263 changed the ZOOM RULE and left the base alone, which took a
     third off and was still not the complaint.  Measured off this screenshot,
     a 1290x2796 capture at the 0.6006 a combat zone runs at: the "Blue Slime
     LV 1" plate is 130 CSS px wide on a 430 px screen -- most of a third of
     the display, for a label on a slime 27 px across.  The type is not too
     large for a phone; it is too large for the WORLD, and no zoom rule fixes
     that because the ratio it is wrong against does not involve the zoom.

     So the base comes down a third, which is the term v2.3.2154 raised (10 ->
     12) when the owner asked for "a bit larger font" and which nothing has
     touched since.  The sqrt zoom response from v2.3.2263 is KEPT -- plates
     still grow as the camera pulls back, which is the ask that started this,
     and it is now growing from a size that has room to.

     The whole plate follows the number: _pillH is nameSize * 2 + 7, the LV
     baseline is nameSize + 4, and the verified badge is derived from _pillH,
     so this shrinks the pill and its contents together rather than leaving
     small type rattling in a large box.  The RELATIONSHIP is preserved too --
     yours has been one step above your peers' since v2.3.1681. */
  _attachNamePill(hpUi, 8, MONSTER_SIZE_MULT);   /* v2.3.2154: 10 -> 12; v2.3.2265: 12 -> 8 */
  hpUi._namePill.y = size + 6;

  /* Single dynamic Graphics for everything that DOES change per frame:
     status icons, aggro alert, stuck arrows, threat arrow, stun pip.
     One clear + redraw per monster instead of three. */
  const dynGfx = new Graphics();
  container.addChild(dynGfx);

  /* Above-head HP indicator: black-tinted heart with current HP number
     centered on it.  Added last so it draws on top of body + sprite +
     lvlText + dynGfx (status icons).  Tint = 0x000000 distinguishes
     monster HP from the player's red heart when the field is crowded. */
  const hpHeart = new Sprite();
  hpHeart.anchor.set(0.5, 0.5);
  hpHeart.alpha = 0;
  hpHeart.tint = 0x000000;
  hpUi.addChild(hpHeart);

  const hpText = new Text({ text: '', style: MONSTER_HP_NUM_STYLE });
  hpText.anchor.set(0.5, 0.5);
  hpText.alpha = 0;
  hpUi.addChild(hpText);

  container._body = body;
  container._spriteBody = spriteBody;
  container._isFodder = isFodder;
  container._variantKey = variantKey;
  container._isSnowman = isSnowman;
  container._hpHeart = hpHeart;
  container._hpText = hpText;
  container._dynGfx = dynGfx;
  container._size = size;
  container._monster = monster;
  /* Dirty-flag cache values — skip redraws when nothing relevant changed. */
  container._lastHpPct = -1;
  container._dynKey = '';
  /* Slime animation cache — skip texture reassignment when state +
     frame haven't changed. */
  container._slimeState = null;
  container._slimeFrame = -1;

  return container;
}

/* ═══ v2.3.1564/1565: the name + level plate under a player's feet ═══

   Owner: "a slick minimalist pill that shows player name and level
   beneath that, beneath the character at all times", then "make it
   consistent and beneath other players too".

   The local player had NO world nameplate at all — the above-head one was
   hidden in favour of a top-right identity card, and that card was retired
   in v2.3.1294, so the readout silently went missing.  Remote players kept
   a bare floating name above the head.  Both now use THIS, so there is one
   plate implementation rather than two that drift.

   Below the feet is also the safer anchor: the old above-head plates were
   pushed to -38 / -42 specifically to clear a sword tip that pokes over
   the head on extended-arm frames.  Nothing to collide with down here.

   Planted, not bobbing.  Every other child of these containers adds bobY
   so it rides the walk cycle; a label bouncing under the boots reads as
   loose, so this one keeps a fixed y and stays stuck to the ground.

   The Graphics is rebuilt ONLY when the text changes (_pillKey cache).
   A rounded-rect rebuild at 60fps for a label that changes on level-up
   would be pure waste — and with up to 50 players in a room it would be
   50x that waste. */
/* v2.3.1953: `host` is where the pill NODE is added; `container` still owns the
   refs.  Player displays pass their _uiLayer so the plate rides the build-scale
   correction with the rest of the HUD; monsters (and any caller that omits it)
   are unchanged. */
/* v2.3.1953: the v2.3.1887 hide-by-EXCEPTION sweep, made to descend one level.
   The HUD moved into display._uiLayer (see createPlayerDisplay), so a flat pass
   over display.children would have seen ONE opaque child in place of eighteen
   and hidden the name plate and the vitals with it.  Running the same keep-set
   over both levels leaves the rule literally unchanged: everything that is not
   named survives death nowhere, and everything named survives wherever it
   lives. */
/* ═══ v2.3.1953: HEIGHT AND FRAME, APPLIED IN ONE PLACE ═══
 *
 * Owner: "is there a way to add 'height' to your character as an option?" and
 * then "Maybe also frame wideness (thin, medium, large)".
 *
 * ── WHY THE CONTAINER AND NOT THE SPRITES ──
 * The figure is not one sprite: it is the body, three body REGIONS, four gear
 * layers, a shirt, hair, a beard, a hat, two shield clones, a weapon container
 * and a block arm, and every one of them is placed from the body's transform in
 * 256-space with per-facing anchors, nudges and dir-scales.  Scaling them
 * individually would mean threading a second axis through every placement
 * helper, and the first thing to go wrong would be a beard that drifts off the
 * chin at `tall` — a silent, per-facing bug of exactly the kind this file's
 * comment history is full of.  The display CONTAINER is above all of it, so one
 * non-uniform scale moves the whole figure with its alignment intact, by
 * construction rather than by care.
 *
 * ── THE FEET STAY ON THE GROUND ──
 * The container's origin is the sprite CENTRE, not the boots (feet sit
 * FEET_OFFSET=24 units below it, sheetGeometry).  Scaling about the centre
 * would push a tall bro's boots ~3px INTO the floor and lift a short one off
 * it.  So the display is nudged up by exactly the growth below the origin,
 * which pins the feet to the world position the server knows about — the only
 * point of the figure that has to agree with anything.
 *
 * ── AND THE HUD DOES NOT STRETCH ──
 * display._uiLayer carries the inverse, so the name plate, level, threat
 * skull, floating vitals and duel bar are the same size and shape on every
 * build.  Their POSITIONS still ride the scale, which is what you want: the
 * plate under a tall bro sits under his actual boots.
 *
 * Sets the scale on the display and the inverse on its ui layer, and RETURNS
 * the lift to add to display.y — a return rather than a mutation because the
 * caller owns that assignment and has just written the world position into it.
 */
/* ── HOW FAR THE BOOTS ARE BELOW THE DISPLAY'S ORIGIN, in container units ──
 * Derived from the numbers that already govern it rather than restated as a
 * constant: BODY_ROWS carries each facing's MEASURED foot row in 256-frame
 * units, the cell centre is 128, and one 256-space unit is
 * bodyDirScale * LOCAL_SCALE container units.
 *
 * The first cut used sheetGeometry's FEET_OFFSET = 24 -- which is a TOUCH
 * anchor, a different measurement of a different thing -- and the boots came
 * out 2.9 world px low on a tall bro.  The real figure is ~41.6 (south stand:
 * (221-128) * 1.061 * 0.421875), and mp-build measured exactly that before
 * this was fixed, which is how it was found.
 *
 * pose/dir come from the display's own animation cache, i.e. the frame that
 * was last DRAWN.  One frame of lag on a correction whose per-facing spread is
 * under a container unit is invisible, and it avoids reordering this call to
 * after the pose is chosen -- which would mean applying the lift after
 * display.y has already been read by the zone-scale lookup. */
const BODY_CELL_MID = 128;
const LOCAL_BODY_SCALE = 0.421875;   /* the local player's LOCAL_SCALE, v2.3.741 */
function _feetOffsetUnits(display) {
  const pose = (display && display._animPose) === 'jog' ? 'jog' : 'stand';
  const dir = (display && display._animDir) || 'south';
  const rows = bodyRows(pose, dir);
  return (rows.feet - BODY_CELL_MID) * bodyDirScale(pose, dir) * LOCAL_BODY_SCALE;
}
function _applyBuildScale(display, pscale, heightId, frameId) {
  const b = buildScale(heightId, frameId);
  const sx = pscale * b.sx, sy = pscale * b.sy;
  if (display.scale.x !== sx || display.scale.y !== sy) { display.scale.x = sx; display.scale.y = sy; }
  const ui = display._uiLayer;
  if (ui) {
    /* Guard against a zero from a future catalog entry: an inverse of 0 is
       Infinity, and one Infinity in a transform blanks the whole display. */
    const ix = b.sx ? 1 / b.sx : 1, iy = b.sy ? 1 / b.sy : 1;
    if (ui.scale.x !== ix || ui.scale.y !== iy) { ui.scale.x = ix; ui.scale.y = iy; }
  }
  /* The lift, in WORLD units: the feet sit 24 container units below the
     origin, so growth below the origin is 24 * (sy - 1) container units, times
     the zone/player scale that turns container units into world ones. */
  return -_feetOffsetUnits(display) * (b.sy - 1) * pscale;
}

/* ═══ v2.3.2281: IS THE LOCAL CORPSE ON SCREEN RIGHT NOW ═══
 *
 * Owner: "Sometimes the death animation still shows character wearing items as
 * it dies (like frozen in place). I think the cape does this. Maybe other items
 * too. Make sure during death animation only that plays."
 *
 * The self-death branch below has always computed this inline, and it was the
 * ONLY thing that knew it -- which is why the answer was wrong everywhere else.
 * The death sweep it guards (`_hideExceptDeep`, v2.3.1887) reaches only the
 * player's own display container, and the stand-in figures drawn for the
 * player -- the swing, the bow shot, the lumberjack, the cook, the fire -- do
 * not live there. They live in the effects renderer's own layers, are driven
 * by state (`_swordSwinging`, `_extraction`) that dying does not clear, and so
 * kept re-showing themselves over the corpse every frame. Measured
 * (mp-deathstrip): dying mid-swing left a cape, a hood, a shield and a swing
 * shirt hanging on the body, and dying mid-harvest left the whole lumberjack
 * standing there with the death animation not drawn AT ALL -- the gathering
 * stand-in hides the display, so the corpse was behind a figure that had
 * stopped moving.
 *
 * Exported so the effects renderer asks the same question rather than keeping
 * a second copy of the 3.5s hold. Two expressions for one fact is how the
 * corpse and the things drawn on top of it disagree about whether it is there.
 *
 * hp <= 0 is not enough on its own: the local-monster death path restores hp
 * synchronously, and the corpse is held for 3.5s from the timestamp after
 * that -- which is most of the window the owner is describing. */
export const SELF_DEATH_HOLD_MS = 3500;
export function selfCorpseUp(S) {
  if (!S) return false;
  if (S.rpg && S.rpg.hp <= 0) return true;
  return !!(S._deathStart && (Date.now() - S._deathStart) < SELF_DEATH_HOLD_MS);
}

function _hideExceptDeep(display, keep) {
  const ui = display._uiLayer;
  for (let i = 0; i < display.children.length; i++) {
    const c = display.children[i];
    if (c === ui) continue;                       /* swept on its own terms below */
    if (c && c.visible && keep.indexOf(c) < 0) c.visible = false;
  }
  if (ui) {
    for (let i = 0; i < ui.children.length; i++) {
      const c = ui.children[i];
      if (c && c.visible && keep.indexOf(c) < 0) c.visible = false;
    }
  }
}

function _attachNamePill(container, nameSize, sizeMult, host) {
  const pill = new Container();
  /* Feet sit ~24 below centre (sheetGeometry FEET_OFFSET).
     v2.3.1765 (owner: "Move the standing nameplate down about 3-10 pixels it
     overlaps the character feet right now"): 30 -> 38.  Six pixels of
     clearance was the whole budget, and the boots on a standing frame eat it —
     the jog cycle's lowest foot reaches further than the nominal offset the
     comment above is quoting.  +8 is the middle of the range the owner gave.
     In CONTAINER units, which for a player is screen pixels: the display is
     scaled by PLAYER_SIZE_MULT (1.0) times the zone's playerScale, and that is
     1 everywhere except the two vista maps that deliberately shrink everything
     — so on a normal map the owner's pixels and these units are the same
     thing, and on those maps the plate shrinks with the character it belongs
     to, which is what you want. */
  pill.y = 38;
  const bg = new Graphics();
  pill.addChild(bg);
  /* ═══ v2.3.1821: RASTERISE AT THE SIZE IT IS SHOWN ═══
     The owner asked for the plate to be "more legible ... and the font size",
     and those are two different problems.  PLAYER_SIZE_MULT makes the plate
     BIGGER, but a Pixi Text is a texture: enlarging its container resamples
     glyphs that were rasterised at nameSize, so scaling alone buys size at
     the cost of sharpness — bigger AND blurrier, which is not more legible.

     Rasterising at devicePixelRatio x the container scale means the glyphs
     are generated at the pixel count they actually occupy, so the growth is
     the only thing that changes.  Capped at 4: beyond that the texture cost
     climbs for detail no screen resolves, and every player in the room
     carries one of these. */
  /* v2.3.1918: the multiplier is a parameter now.  A monster's plate lives
     in _hpUi, which is scaled by MONSTER_SIZE_MULT rather than
     PLAYER_SIZE_MULT, and rasterising at the wrong one puts the whole
     v2.3.1821 argument back where it started — glyphs generated for a
     smaller box and then enlarged, i.e. bigger and blurrier. */
  const _pillRes = Math.min(4, Math.max(1,
    ((typeof window !== 'undefined' && window.devicePixelRatio) || 1) * (sizeMult || PLAYER_SIZE_MULT)));
  const nameT = new Text({ text: '', resolution: _pillRes, style: {
    fontFamily: 'Source Sans 3, sans-serif', fontSize: nameSize, fontWeight: '700',
    fill: '#F4F0E7', align: 'center',
  } });
  nameT.anchor.set(0.5, 0);
  nameT.y = 3;
  pill.addChild(nameT);
  const lvlT = new Text({ text: '', resolution: _pillRes, style: {
    fontFamily: 'Source Sans 3, sans-serif', fontSize: nameSize - 1, fontWeight: '800',
    fill: '#D8AA58', align: 'center', letterSpacing: 0.5,
  } });
  lvlT.anchor.set(0.5, 0);
  lvlT.y = nameSize + 4;
  pill.addChild(lvlT);
  /* v2.3.1576: verified-Hemi-Bro badge, drawn to the LEFT of the name.
     Hidden unless the SERVER says this player owns the Bro they wear —
     `bro` is server-owned (broverify.js is its only writer) and is not in
     TRACK_COSMETIC_KEYS, so a client cannot light this up by sending it.
     The small art variant is used because the full badge collapses into an
     unreadable blob at pill size (measured at 11px). */
  const broBadge = new Sprite();
  broBadge.anchor.set(0.5, 0.5);
  broBadge.visible = false;
  pill.addChild(broBadge);
  container._broBadge = broBadge;

  pill.visible = false;
  (host || container).addChild(pill);
  container._namePill = pill;
  container._pillBg = bg;
  container._pillName = nameT;
  container._pillLevel = lvlT;
  container._pillH = nameSize * 2 + 7;
}

/* v2.3.1576: the verified-Bro badge texture, loaded once and shared by every
   plate on screen.  Loaded lazily rather than through the preload manifest on
   purpose: this is a single 64px icon, not an animation, and the
   animation-preloading law (CLAUDE.md) is about frames that hitch mid-play.
   Until it resolves the sprite simply stays untextured, so a slow fetch
   delays a badge rather than stalling the loading screen. */
let _broBadgeTex = null;
function _broBadgeTexture() {
  if (!_broBadgeTex) _broBadgeTex = Texture.from('/icons/ui/verified-bro-small.webp');
  return _broBadgeTex;
}

/* ═══ v2.3.2262: IN-WORLD TEXT IS A SCREEN MEASUREMENT ═══
 *
 * Owner: "increase any small font size when the game is zoomed out for stuff in
 * the game world (name plates is one example)."
 *
 * pixiRenderer scales the WHOLE world container by cssW/viewW, so every glyph
 * in it is multiplied by that too: the 10px name plate is 6 CSS px at the 0.60 a
 * combat zone runs at, and smaller again with the dashboard open (which is what
 * makes the world zoom out -- the owner's own discovery, and a keeper).  Nothing
 * in this file has ever read the world scale.
 *
 * Same defect and same fix as v2.3.2255's combat marks: a SIZE that belongs to
 * the world stays in world units, a size that belongs to the READER does not.
 * A name is for the reader.
 *
 * TWO SCALES, AND ONLY ONE OF THEM IS UNDONE.  The camera zoom is compensated
 * here.  The zone's own `playerScale` -- the vista perspective curve -- is NOT,
 * because the plate is supposed to shrink with the figure it belongs to out
 * there; the comment on the pill's construction says exactly that, and undoing
 * it would hang full-size plates over the World View's specks.  Those two live
 * in different places (worldContainer.scale vs display.scale), so compensating
 * one leaves the other alone by construction.
 *
 * AND IT RE-RASTERISES, or it would be bigger AND BLURRIER -- the exact trap
 * v2.3.1821 documents on this very plate.  A Pixi Text is a texture: growing its
 * container resamples glyphs generated at the old size.  So the resolution moves
 * with the scale, capped at 4 (beyond that the texture cost climbs for detail no
 * screen resolves, and every player in the room carries one).
 *
 * Gated on a real change: the zoom moves on a zone change or a dashboard
 * toggle, not per frame, and re-rasterising a Text every frame would be a
 * per-entity texture upload. */
/* ═══ v2.3.2263: HALF THE COMPENSATION, NOT ALL OF IT ═══
 * Owner, on what v2.3.2262 shipped: "Nameplates are now way too large."
 *
 * The version above undid the camera zoom COMPLETELY -- 1/w -- which pins the
 * plate at its full design size in screen pixels no matter how far out the
 * camera is.  Measured on the owner's 1290x2796 capture at the 0.6006 a combat
 * zone runs at: a monster plate is 12 (nameSize) x 1.5 (MONSTER_SIZE_MULT)
 * = 18 CSS px of type over a blue slime that is 27 CSS px wide.  The plate is
 * wider than the monster it labels, and with six monsters to a zone the plates
 * collide with each other before the monsters do.
 *
 * The ask it came from is still real and is NOT being reverted: before
 * v2.3.2262 the same plate was 12 x 1.5 x 0.6006 = 10.8 CSS px, and "increase
 * any small font size when the game is zoomed out" is what the owner said about
 * exactly that.  So the answer is a middle, and sqrt is the principled one: the
 * plate still GROWS as the camera pulls back, at half the rate in log terms, so
 * it can never outrun the scene the way a full undo does.
 *
 *     zoom 0.60  ->  x1.29  ->  13.9 CSS px   (was 10.8 before, 18.0 after)
 *     zoom 0.75  ->  x1.15  ->  13.5 CSS px
 *     zoom 1.00  ->  x1.00  ->  12.0 CSS px   (unchanged, by construction)
 *
 * Floored at 1 so zooming IN never shrinks the plate below its design size,
 * and still capped, now at the sqrt of the old cap for the same reason it had
 * one: a Text is a texture and every player in the room carries two. */
const PLATE_ZOOM_MAX = 1.5;   /* bound the texture cost at extreme zoom-out */
let _plateZoom = 1;
export function setPlateZoom(worldScale) {
  const w = (typeof worldScale === 'number' && worldScale > 0.01) ? worldScale : 1;
  _plateZoom = Math.min(PLATE_ZOOM_MAX, Math.max(1, Math.sqrt(1 / w)));
}

function _fitPlateToZoom(display) {
  const pill = display && display._namePill;
  if (!pill) return;
  if (display._pillZoom === _plateZoom) return;
  display._pillZoom = _plateZoom;
  pill.scale.set(_plateZoom);
  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  const res = Math.min(4, Math.max(1, dpr * _plateZoom));
  if (display._pillName && display._pillName.resolution !== res) display._pillName.resolution = res;
  if (display._pillLevel && display._pillLevel.resolution !== res) display._pillLevel.resolution = res;
}

/* Drive one plate.  `visible` false parks it without touching the cache,
   so re-showing costs nothing. */
/* v2.3.2295: `alarm` -- this plate's owner is attacking you right now, so the
   plate goes red. Owner: "change the monster name plate to a red background
   when they're actively attacking you."
   It joins the KEY rather than being applied after it. The whole point of
   _pillKey is that the rounded-rect is rebuilt only when something about it
   changed, and for a monster the name and level never change after frame one
   -- so a fill written outside the key would be written once and then never
   again, i.e. the plate would go red and stay red for the life of the monster.
   In the key, a state change is a rebuild and nothing else is.
   Optional and last: every existing caller passes five arguments and is
   byte-identical. */
function _updateNamePill(display, name, level, visible, broId, alarm) {
  if (!display || !display._namePill) return;
  _fitPlateToZoom(display);
  const key = name + '|' + level + '|' + (broId ? 'v' : '') + (alarm ? '|!' : '');
  if (display._pillKey !== key) {
    display._pillKey = key;
    display._pillName.text = name;
    /* v2.3.2048: a STRING second line passes through verbatim. An NPC has no
       level, and "LV undefined" under a shopkeeper is worse than no plate.
       Every existing caller passes a number and is unaffected. */
    display._pillLevel.text = (typeof level === 'string') ? level : ('LV ' + level);
    /* Sized to whichever line is wider, so a long name and a two-digit
       level both sit inside with equal padding. */
    /* v2.3.1576: the badge sits inside the plate, so it has to be paid for
       in the width — otherwise it overhangs a short name. */
    const badge = display._broBadge;
    const bSize = Math.max(11, display._pillH - 9);
    const bPad = broId ? bSize + 4 : 0;
    const w = Math.max(display._pillName.width, display._pillLevel.width) + 14 + bPad;
    const h = display._pillH;
    if (badge) {
      badge.visible = !!broId;
      if (broId) {
        if (!badge.texture || badge.texture === Texture.EMPTY) badge.texture = _broBadgeTexture();
        badge.width = badge.height = bSize;
        /* Left edge of the plate, vertically centred on it. */
        badge.x = -w / 2 + bSize / 2 + 4;
        badge.y = h / 2;
      }
    }
    /* Text re-centres in the space the badge left. */
    display._pillName.x = bPad / 2;
    display._pillLevel.x = bPad / 2;
    display._pillBg.clear();
    display._pillBg.roundRect(-w / 2, 0, w, h, 9);
    /* #7A1D1D at .94, not a bright red: the plate carries TEXT, and the name
       has to stay the most legible thing on it. #F4F0E7 measures 9.14:1 on
       this fill (16.09:1 on the normal one), so the alarm state costs
       legibility without losing it. A brighter red would read louder and say
       less -- #9B2020 drops the level line to 3.74:1, under AA. */
    display._pillBg.fill({ color: alarm ? 0x7A1D1D : 0x0D161B, alpha: alarm ? 0.94 : 0.82 });
    display._pillBg.stroke({ color: alarm ? 0xFF8A8A : 0xE5EDE9, alpha: alarm ? 0.55 : 0.18, width: 1 });
  }
  display._namePill.visible = !!visible;
  /* For the QA probe (__btMonsterPlates). A colour read back off a Graphics is
     not something Pixi offers, and a screenshot cannot tell this red from the
     danger-level red or from a red monster behind it (TRAPS §21). */
  display._pillAlarm = !!alarm;
}


/* ═══ v2.3.1785: the raised shield gets an arm ═══
 * See blockArm.js for why this is cut from the bow art rather than masked out
 * of the standing body (owner: "There is no outstretched arm the shield orbits
 * the body").  Returns the world-space point the shield should be held at, or
 * null when there is no arm for this facing — in which case the caller keeps
 * the old free-floating placement, which is what every north facing uses.
 *
 * The bow art is authored at a different size from the walking body, so the
 * arm is scaled by the same ratio the bow stand-in uses (drawn body height
 * over the bow sheet's 188px figure) and then pinned by its SHOULDER to the
 * body's shoulder.  Pinning by the shoulder rather than by the frame corner is
 * what keeps it attached when the figure's per-facing scale changes.
 */
const BLOCK_ARM_SHOULDER = {
  /* Where the body's shoulder sits, in display-local px, per rendered facing.
     Only the facings with an arm appear — south has none (see blockArm.js). */
  east:      [7, -12],
  west:      [-7, -12],
  southeast: [6, -12],
  southwest: [-6, -12],
};

/* Hide the arm AND record it.  Both must happen together: the probe was
   written only inside the placement at first, so lowering the shield left the
   previous frame's reading in place and mp-blockarm read a shield-down bro as
   still holding one. */
function _hideBlockArm(display, why) {
  if (display._blockArmGroup) display._blockArmGroup.visible = false;
  if (display._blockArmSprite) display._blockArmSprite.visible = false;
  if (display._blockArmSleeve) display._blockArmSleeve.visible = false;
  /* v2.3.1800: keep the last CUT facts alongside the hidden flag.  Since the
     stand-in took over, the arm is deliberately never drawn — but the cut is
     still what positions the shield, so a probe that reported only "off" would
     make the surviving contract untestable. */
  try {
    const _prev = window.__btBlockArm || {};
    window.__btBlockArm = Object.assign(
      { sheet: _prev.sheet, armW: _prev.armW, armH: _prev.armH, hand: _prev.hand },
      { on: false }, why || {});
  } catch (e) {}
}

/* ═══ v2.3.1798: THE BLOCK CARET ═══
   A chevron pointing out along the centre of the guard arc (owner: "Add a
   carat while blocking to indicate the direction you're blocking").
   Drawn twice — a near-black pass wider underneath, then the blue on top
   (v2.3.1799: was brass; see aimCaret.js for why one colour, and why blue).  That is not decoration either: this mark lands on town cobble,
   desert sand and snow, and a single brass stroke disappears against two of
   the three.  Same reasoning as the coach ring's dark edge (QuestCoach.jsx),
   and the same reason the joystick sprites carry their own rim.
   No CSS/pixi filter — a filter compositing over the WebGL canvas is the
   documented cause of the iOS "static" (CLAUDE.md). */
/* Measured from the shield's CENTRE, so it has to clear the shield's own
   radius: HELD_SHIELD_PX is 72, i.e. 36 half-width, and the first cut at 21
   put the chevron INSIDE the disc — it only showed at all because the art
   does not fill its box.  42 leaves a clear gap at every facing. */
const CARET_OUT = 42;     /* how far past the shield's centre the tip sits */
const CARET_BACK = 13;    /* tip-to-shoulder along the aim axis */
const CARET_HALF = 10;    /* half the chevron's opening */
function _drawBlockCaret(display, sx, sy, ang, pulse) {
  const g = display._blockCaretGfx;
  if (!g) return;
  const cx = Math.cos(ang), cy = Math.sin(ang);
  const nx = -cy, ny = cx;
  const tipX = sx + cx * CARET_OUT;
  const tipY = sy + cy * CARET_OUT;
  const baseX = sx + cx * (CARET_OUT - CARET_BACK);
  const baseY = sy + cy * (CARET_OUT - CARET_BACK);
  const aX = baseX + nx * CARET_HALF, aY = baseY + ny * CARET_HALF;
  const bX = baseX - nx * CARET_HALF, bY = baseY - ny * CARET_HALF;
  g.clear();
  g.moveTo(aX, aY); g.lineTo(tipX, tipY); g.lineTo(bX, bY);
  g.stroke({ color: AIM_CARET_EDGE, width: 7, alpha: 0.6, cap: 'round', join: 'round' });
  g.moveTo(aX, aY); g.lineTo(tipX, tipY); g.lineTo(bX, bY);
  /* Whitens for the 250ms after a hit is blocked — the same blockPulse the
     shield's own brightness pop reads, so the two say "that one landed on the
     shield" together instead of one of them saying it alone. */
  g.stroke({
    color: pulse > 0 ? AIM_CARET_HOT : AIM_CARET,
    width: 4 + pulse * 1.5, alpha: 1, cap: 'round', join: 'round',
  });
  g.visible = true;
}
function _hideBlockCaret(display) {
  const g = display && display._blockCaretGfx;
  if (g && g.visible) { g.visible = false; g.clear(); }
}

/* ═══ v2.3.1871: THE WEAPON IN A SOUTH BLOCK'S OFF HAND ═══
 *
 * Owner: "the south block view needs to show weapon in offhand partially
 * occluded by shield."
 *
 * South is the one facing with no stand-in — its bow body sheet is holed
 * through the face (v2.3.1805) — so it blocks on the REAL body with a
 * free-floating shield, and the stand-in's off-hand weapon (v2.3.1864) never
 * runs for it.  This is that weapon, drawn from the player display instead.
 *
 * THE OCCLUSION IS THE Z-ORDER, and it is the point of the request rather
 * than a detail: the container is parked directly BENEATH the shield sprite,
 * so the 72px disc over the chest cuts the weapon where they overlap and the
 * rest shows past its edge.  Done per frame because the shield's own z-rule
 * slides _shieldSprite up and down the child list by facing — a fixed
 * build-order slot is right on some facings and wrong on the rest (the lesson
 * _placeBlockArm records at length).
 *
 * Returns false when it cannot draw (no art yet), so the caller falls through
 * to hiding the sprite rather than leaving a stale icon on screen.
 */
const SOUTH_BLOCK_OFFHAND_ENABLED = true;
/* ═══ v2.3.1882: JUST BELOW THE HEAD, ON THE CAMERA'S RIGHT ═══
 * Owner: "The south block sword needs its position to move.  It should be
 * just below the head on the right side of the body (right side from camera
 * perspective)."
 *
 * Was { x: -11, y: -34 }, which put the grip at screen LEFT and at HEAD
 * height — above the shoulders, clear of the body, with the blade sweeping
 * further left again.  Nothing was holding it, and that is what it looked
 * like: a sword hanging in the air beside his ear.
 *
 * The new numbers are read off the figure rather than guessed, via
 * blockGeomProbe (pixiRenderer), which reports the body in THIS space —
 * display-local, the same units this constant is written in.  For the south
 * stand at the time of writing: crown y -42.5, shoulders y -15.7, feet y
 * 41.6, torso x -13.9..+13.9, and the shield a 72px disc centred (4.2, 15.4),
 * i.e. spanning y -20.6..+51.4.  So:
 *   x +17  — just outside the right ribs (13.9), so it reads as beside him
 *            rather than painted on his chest.  POSITIVE is the camera's
 *            right, which is the player's own left hand: the off hand, which
 *            is the one not carrying the shield.
 *   y -13  — a couple of units below the shoulder line at -15.7, which is
 *            "just below the head" stated as a number.
 * That lands the grip inside the shield's top-right quadrant, so the disc
 * cuts the hilt and the blade runs out past its edge — the occlusion the
 * owner asked for at v2.3.1871 and the reason this sprite is parked directly
 * beneath the shield in the child list. */
const SOUTH_BLOCK_OFFHAND = { x: 17, y: -13 };
/* Per-type, because the two kinds of art hang from the grip in opposite
 * directions.  The posed greatsword and bow are drawn hilt-high with the
 * blade falling away, so the default puts the grip up by the shoulder and the
 * blade runs down into the shield.  A staff is AIMED (its icon is neutral)
 * and stands head-up out of the fist, so the same grip drove its butt end
 * straight across the face.  Dropped and pushed out, it rises clear of the
 * head and its lower end tucks behind the shield's top edge instead. */
const SOUTH_BLOCK_OFFHAND_BY_TYPE = {
  /* v2.3.1882: mirrored with the default (x -25 -> +25).  Its own offset from
     the grip is unchanged — it still stands further out and lower than a
     blade does, because it is AIMED and rises head-up out of the fist rather
     than hanging from a hilt. */
  staff: { x: 25, y: -20, px: 40 },
};
/* Aimed down and out, so the blade leaves the silhouette below the shield
 * instead of climbing across the face.
 * v2.3.1882: 0.72pi -> 0.28pi, which is the SAME angle mirrored about the
 * vertical (pi - 0.72pi).  It has to move with the grip: "down and out" is
 * defined relative to which side he holds it on, and a blade still sweeping
 * down-LEFT from a grip that is now on the RIGHT would be pointing back
 * across his own chest — the one direction this constant exists to avoid. */
const SOUTH_BLOCK_OFFHAND_AIM = Math.PI * 0.28;
function _placeSouthBlockWeapon(display, wpn, bobY) {
  const spr = display && display._weaponSprite;
  if (!spr || !wpn || !wpn.type) return false;
  /* THE SAME OBJECT HE WAS JUST CARRYING.  A greatsword and a bow have
     per-facing held art, and their single-icon fallbacks are something else
     entirely — `greatsword` is keyed to Sword1.webp, which is the bamboo
     pole.  The first cut of this took the neutral icon and a bro holding a
     copper greatsword raised his shield and was holding a gold stick.  Same
     resolution the stand-in path uses (effectsRenderer), and south is a
     canonical facing so there is no mirror to reconcile. */
  const perFacing = (wpn.type === 'greatsword' || wpn.type === 'bow');
  const artDir = (perFacing && hasWeapon(wpn.type, wpn.gearBase, 'south')) ? 'south' : null;
  if (!hasWeapon(wpn.type, wpn.gearBase, artDir)) return false;
  const tex = getWeaponTexture(wpn.type, wpn.gearBase, artDir);
  if (!tex) return false;
  if (spr.texture !== tex) spr.texture = tex;
  const tw = tex.width || 64, th = tex.height || 64;
  /* handles.json has no bare `greatsword` — its grips are per-facing — and
     the generic greatsword icon IS the sword's file, so the sword's grip is
     the same point on the same art.  (Same fallback the stand-in path needs;
     without it the sprite pivots on its frame's bottom edge and the blade
     hangs off the chest at an angle nothing asked for.) */
  const grip = getWeaponHandle(wpn.type, wpn.gearBase, artDir)
            || (wpn.type === 'greatsword' ? getWeaponHandle('sword', wpn.gearBase, null) : null);
  if (grip) spr.anchor.set(grip[0] / tw, grip[1] / th);
  else spr.anchor.set(0.5, 1);
  const over = SOUTH_BLOCK_OFFHAND_BY_TYPE[wpn.type] || null;
  const targetH = (over && over.px) ? over.px
                : wpn.type === 'greatsword' ? 44
                : wpn.type === 'bow' ? 34
                : (wpn.type === 'sword' && wpn.gearBase === 'wood') ? 36
                : 26;
  const k = targetH / Math.max(8, th);
  spr.scale.set(k, k);
  /* Every weapon icon runs grip-to-tip along the same diagonal (see
     BLOCK_OFFHAND_ART_ANG), so one constant turns "point it this way" into a
     rotation.  A staff is reflected about the horizon for the same reason it
     is on the stand-in: its far end is the HEAD, and head-down is a broom. */
  const artAng = -Math.PI / 4;
  if (artDir) {
    /* Art posed for this facing already knows which way the blade goes;
       rotating it would only fight the drawing. */
    spr.rotation = 0;
  } else {
    const aim = (wpn.type === 'staff') ? -SOUTH_BLOCK_OFFHAND_AIM : SOUTH_BLOCK_OFFHAND_AIM;
    spr.rotation = aim - artAng;
  }
  spr.tint = weaponTint(wpn.type, wpn.gearBase);
  spr.alpha = 1;
  spr.x = (over && typeof over.x === 'number') ? over.x : SOUTH_BLOCK_OFFHAND.x;
  spr.y = ((over && typeof over.y === 'number') ? over.y : SOUTH_BLOCK_OFFHAND.y) + (bobY || 0);
  spr.visible = true;
  /* UNDER THE SHIELD.  setChildIndex removes then re-inserts, so the target
     depends on which side the container starts from: from above, the shield
     does not move and the container goes to shIdx; from below, the shield
     slides down one during the removal and it goes to shIdx-1.  The
     already-there check keeps it stable rather than ratcheting a slot a
     frame. */
  const wc = display._weaponContainer, sh = display._shieldSprite;
  if (wc && sh && sh.visible) {
    const shIdx = display.getChildIndex(sh);
    const wi = display.getChildIndex(wc);
    if (wi !== shIdx - 1) display.setChildIndex(wc, wi < shIdx ? shIdx - 1 : shIdx);
  }
  if (typeof window !== 'undefined') {
    window.__btSouthBlockWeapon = {
      on: true, type: wpn.type, gearBase: wpn.gearBase || null,
      x: spr.x, y: spr.y, px: targetH, rotation: spr.rotation,
      gripped: !!grip, artDir, posed: !!artDir,
      /* The whole request in two numbers: the weapon's slot and the
         shield's.  Lower means drawn first means occluded. */
      wcIdx: wc ? display.getChildIndex(wc) : -1,
      shieldIdx: (sh && sh.visible) ? display.getChildIndex(sh) : -1,
      shieldVisible: !!(sh && sh.visible),
    };
  }
  return true;
}

function _placeBlockArm(display, facing, bodyH, bobY) {
  const spr = display._blockArmSprite;
  const sleeve = display._blockArmSleeve;
  const group = display._blockArmGroup;
  if (sleeve) sleeve.visible = false;
  if (!spr) return null;
  const map = BLOCK_ARM_FACING[facing];
  const anchor = BLOCK_ARM_SHOULDER[facing];
  const tex = map && blockArmTexture(map[0]);
  const cut = map && BLOCK_ARM_CUT[map[0]];
  if (!map || !anchor || !tex || !cut) {
    _hideBlockArm(display, { facing, hasSheet: !!map, hasArt: !!tex });
    return null;
  }

  const mirror = map[1];
  /* 188 is the bow sheet's crown-to-foot figure height, the same constant the
     bow stand-in divides by. */
  const sc = (bodyH || 84) / 188;
  spr.texture = tex;
  spr.scale.set(mirror ? -sc : sc, sc);
  /* anchor is (0,0), so position the frame corner such that the cut's shoulder
     point lands on the body's shoulder.  Mirroring flips which edge the
     shoulder is measured from. */
  const sx = mirror ? -sc : sc;
  spr.x = anchor[0] - cut.shoulder[0] * sx;
  spr.y = anchor[1] + (bobY || 0) - cut.shoulder[1] * sc;
  spr.tint = 0xffffff;
  spr.alpha = 1;
  spr.visible = true;
  if (group) group.visible = true;

  /* v2.3.1789: the sleeve rides the arm — same rect, same transform, drawn
     straight over it, so a copper plate reaches out with the arm instead of
     stopping at the shoulder.  Tinted by the piece's material for the same
     reason every other gear draw site is (v2.3.1757): a recoloured set shares
     its donor's texture and the colour is applied here. */
  if (sleeve) {
    const worn = getEquip('chest');
    const sleeveTex = blockArmSleeveTexture(map[0], worn, getGearFrame);
    if (sleeveTex) {
      sleeve.texture = sleeveTex;
      sleeve.scale.set(spr.scale.x, spr.scale.y);
      sleeve.x = spr.x;
      sleeve.y = spr.y;
      sleeve.tint = gearTint(worn);
      sleeve.alpha = 1;
      sleeve.visible = true;
    }
  }

  /* Z-ORDER: the arm group goes DIRECTLY BENEATH the shield, so the boss covers
     the hand rather than the hand being painted across the shield face.  It has
     to happen per frame, because the in-hand shield's own z-rule slides
     _shieldSprite up and down the child list by facing — a fixed build-order
     position for the arm is right on some facings and wrong on the rest.
     (Caught by mp-blockarm: the arm sat at index 25 with the shield at 8.)

     setChildIndex removes then re-inserts, so the target depends on which side
     the group starts from: from above, the shield does not move and the group
     goes to shIdx; from below, the shield slides down one during the removal
     and the group goes to shIdx-1.  The "already there" check keeps it stable
     rather than ratcheting a slot per frame. */
  const shieldSpr = display._shieldSprite;
  if (group && shieldSpr) {
    const shIdx = display.getChildIndex(shieldSpr);
    const gi = display.getChildIndex(group);
    if (gi !== shIdx - 1) display.setChildIndex(group, gi < shIdx ? shIdx - 1 : shIdx);
  }

  /* Where the hand ended up, for the shield to sit in. */
  const handDX = (cut.hand[0] - cut.shoulder[0]) * sx;
  const handDY = (cut.hand[1] - cut.shoulder[1]) * sc;
  const hand = { x: anchor[0] + handDX, y: anchor[1] + (bobY || 0) + handDY };

  /* QA probe (mp-blockarm) — a headless run cannot read the WebGL canvas. */
  try {
    window.__btBlockArm = {
      on: true, facing, sheet: map[0], mirror,
      armVisible: spr.visible,
      armW: spr.texture ? spr.texture.width : 0,
      armH: spr.texture ? spr.texture.height : 0,
      sleeveVisible: !!(sleeve && sleeve.visible),
      sleeveW: (sleeve && sleeve.visible && sleeve.texture) ? sleeve.texture.width : 0,
      sleeveTint: (sleeve && sleeve.visible) ? sleeve.tint : null,
      worn: getEquip('chest'),
      hand,
      armIdx: group ? display.getChildIndex(group) : display.getChildIndex(spr),
      shieldIdx: display._shieldSprite ? display.getChildIndex(display._shieldSprite) : -1,
    };
  } catch (e) { /* never breaks the frame */ }
  return hand;
}

function createPlayerDisplay() {
  const container = new Container();
  container.label = 'localPlayer';

  /* v2.3.1365 (owner): PLAYER ground shadow removed — the v2.3.1300
     ellipse read as a dark blob between the knight's legs mid-stride.
     Monsters keep theirs (createMonsterDisplay). */

  /* ═══ v2.3.1782: the on-back shield is TWO sprites, not one ═══
     Owner: "there was a build that let the player wear the shield on his
     back ... I think it was removed because it kept bumping into layering
     issues with how mirroring works ... Maybe it involves cloning the shield
     on one side only."  That is exactly the fix.

     The v2.3.377 version (disabled, see the removed SHOW_BACK_SHIELD) drew
     the back shield with the SAME sprite as the in-hand shield, so every
     frame it had to recompute where that one sprite belonged in the child
     list — getChildIndex/setChildIndex against the body, then exceptions for
     the hand-cap, then a per-facing nudge table, then a west-run-only nudge.
     Z-order that is recomputed per frame against four other layers is not a
     bug you fix once; it is a bug you fix per facing, forever, which is what
     the incident comments on that block record.

     So the back shield now owns two sprites whose order is STRUCTURAL:
     `shieldBackLo` is added before the body and can never draw over it,
     `shieldBackHi` is added after the arms and can never draw under them.
     Choosing a facing means toggling `visible` — there is no index maths at
     any point, so there is no per-facing exception to get wrong.  Mirroring
     stops mattering too: each clone carries its own mirror flag and neither
     one's scale.x can reorder anything.

     (setChildIndex elsewhere is safe against this: moving one child preserves
     the relative order of all the others, so Lo stays under the body and Hi
     stays over the arms no matter what the in-hand path does.) */
  const shieldBackLo = new Sprite();
  shieldBackLo.anchor.set(0.5, 0.5);
  shieldBackLo.visible = false;
  container.addChild(shieldBackLo);

  /* v2.3.2186: THE CAPE'S BACK HALF, under everything the character is.
     Owner: "the left side of the cape should be occluded by characters body.
     Then mirrored for the other side."  v2.3.2023 drew the whole cape in front
     because the art is a whole-mannequin picture with its panels painted over
     the chest -- true of the picture, false of the person, and the result was a
     red slab glued to the front with the torso hidden behind it.  The panels
     hang from the shoulders, so they belong BEHIND; only the hood is over the
     skull, and that is a separate texture drawn by _capeSprite above.
     Added before the body Graphics so it is behind the fallback body too. */
  const capeBackSprite = new Sprite();
  capeBackSprite.anchor.set(0.5, 0.5);
  capeBackSprite.visible = false;
  container.addChild(capeBackSprite);

  /* Procedural fallback body — drawn until the sprite sheets resolve
     (and as a permanent fallback if they fail to load). */
  const body = new Graphics();
  container.addChild(body);

  /* Sprite-sheet body — Sprite whose texture flips per frame based on
     player facing + animation pose.  Initially has no texture; when
     the sheet loader finishes, _updatePlayer will assign textures and
     hide the procedural body. */
  const spriteBody = new Sprite();
  spriteBody.anchor.set(0.5, 0.5);
  spriteBody.visible = false;
  container.addChild(spriteBody);
  /* v2.3.608: per-region body sprites (head/torso/legs), drawn below the gear.
     The body renders through these so an unequipped slot reveals just that
     region at naked scale; spriteBody stays the (invisible) texture+transform
     reference the gear copies. */
  const bodyHead = new Sprite(); bodyHead.anchor.set(0.5, 0.5); bodyHead.visible = false; container.addChild(bodyHead);
  const bodyTorso = new Sprite(); bodyTorso.anchor.set(0.5, 0.5); bodyTorso.visible = false; container.addChild(bodyTorso);
  const bodyLegs = new Sprite(); bodyLegs.anchor.set(0.5, 0.5); bodyLegs.visible = false; container.addChild(bodyLegs);
  container._bodyHead = bodyHead; container._bodyTorso = bodyTorso; container._bodyLegs = bodyLegs;
  /* ═══ v2.3.1872: THE SOUTH BLOCK'S TWO HALVES ═══
     Owner: "the same frozen torso half so jogging while blocking doesn't look
     weird."  Every other facing gets that from the bow stand-in, whose
     jog-legs composite (v2.3.1072) draws animated legs under a leg-erased
     torso.  South has no stand-in at all — its bow body sheet is holed
     through the face (v2.3.1805) — so it needs the same trick built on the
     REAL body: the standing frame above the waist, the jog frame below it.
     Their own sprites rather than the dormant _body* region trio, because
     _hideBodyRegions is called unconditionally further down the body path and
     would park them every frame.  Added here so they sit exactly where the
     body sits in the child order: under the gear, over the slung shield. */
  const southTop = new Sprite(); southTop.anchor.set(0.5, 0.5); southTop.visible = false; container.addChild(southTop);
  const southLegs = new Sprite(); southLegs.anchor.set(0.5, 0.5); southLegs.visible = false; container.addChild(southLegs);
  container._southTop = southTop; container._southLegs = southLegs;

  /* v2.3.503: layered gear (paper-doll).  One sprite per slot, drawn above the
     body with the body's exact transform, all below the head traits.
     v2.3.748: gearShirt = the layered t-shirt (tinted white-base sheet),
     under the armour so a chest plate covers it.
     ═══ v2.3.1710: ORDER IS legs < shirt < chest < shoulders ═══
     Owner: "While woodcutting and doing other things the shirt should be
     layered in front of the leg armor."  It was shirt < legs, so the greaves'
     waistband was painted over the shirt's hem and the tee looked tucked
     INSIDE the armour — visible on every pose that shows both, standing
     included.  Adding gearLegs first is the whole fix; child order IS the
     z-order here.
     Why this cannot disturb the v2.3.748 "the plate covers the shirt" rule:
     _placeGear hides the shirt outright whenever a chest piece is worn
     (`hiddenUnderChest`), and _placeSwingShirt does the same for the stand-ins
     — shirt and chest are NEVER both visible, so their relative index is
     unobservable.  Only shirt-vs-legs was ever on screen together.
     The two reorder passes in _placePlayerTraits (beard / head-behind-gear)
     take a max() over these sprites' live indices rather than assuming a
     fixed order, so both keep working unchanged. */
  const gearLegs = new Sprite(); gearLegs.anchor.set(0.5, 0.5); gearLegs.visible = false; container.addChild(gearLegs);
  /* v2.3.1347: no belt sprite — the jog chain is painted onto the exposed
     waist inside the masked-body bake (see _maskedBodyFrame), which gives
     the art's own hand-drawn depth for free. */
  const gearShirt = new Sprite(); gearShirt.anchor.set(0.5, 0.5); gearShirt.visible = false; container.addChild(gearShirt);
  const gearChest = new Sprite(); gearChest.anchor.set(0.5, 0.5); gearChest.visible = false; container.addChild(gearChest);
  const gearShoulders = new Sprite(); gearShoulders.anchor.set(0.5, 0.5); gearShoulders.visible = false; container.addChild(gearShoulders);
  /* v2.3.602: helmet is its own slot now; drawn topmost (over the hair + chest collar). */
  const gearHead = new Sprite(); gearHead.anchor.set(0.5, 0.5); gearHead.visible = false; container.addChild(gearHead);
  container._gearShirt = gearShirt; container._gearLegs = gearLegs; container._gearChest = gearChest; container._gearShoulders = gearShoulders; container._gearHead = gearHead;

  /* v2.3.467: shirt (torso clothing) layer.  Sits just above the body and
     below the head traits.  Same crown-anchored placement as the beard,
     dropped to the chest via a large positive crownNudge Y in the meta. */
  const shirtSprite = new Sprite();
  shirtSprite.visible = false;
  container.addChild(shirtSprite);

  /* v2.3.353: facial-hair sticker layer (beard / moustache).  Sits above
     the body but below headwear so a hat brim can overlap it.  Same
     crown-anchored placement as headwear, dropped to the chin via a
     large positive crownNudge Y in the trait's meta. */
  const facialHairSprite = new Sprite();
  facialHairSprite.visible = false;
  container.addChild(facialHairSprite);

  /* v2.3.261 (Bro-NFT Phase 4): trait composition overlay.  Sits on
     top of the body so the NFT's head/face features (helmet, eyes,
     mouth, etc.) overlay the faceless mannequin.  Hidden until the
     trait texture for the active facing has resolved.  Position
     tracks the body's head anchor per frame so it follows pose +
     direction. */
  const traitFace = new Sprite();
  traitFace.anchor.set(0.5, 0.5);
  traitFace.visible = false;
  container.addChild(traitFace);

  /* v2.3.357: hair layer -- crown-anchored like headwear, but rendered
     BELOW the hat so headwear covers the hair. */
  const hairSprite = new Sprite();
  hairSprite.visible = false;
  container.addChild(hairSprite);
  /* v2.3.364: silhouette clip mask for hair under a `clipsHair` hat --
     a Sprite carrying the helmet's downward-filled outline, placed
     exactly where the helmet renders. */
  const hairMask = new Sprite();
  hairMask.anchor.set(0.5, 0.5);
  container.addChild(hairMask);

  /* v2.3.266: standalone-item sticker layer.  One sprite for headwear
     (helmet / hat / hood / etc.); future: glasses, beard, etc. each
     get their own.  Anchor + position set per-frame from meta.json. */
  /* v2.3.2023: the cape.  ABOVE the body and gear, because the art was
     authored that way -- the generator drew it on the mannequin with the front
     panels over the chest and the hood over the skull, so the picture states
     its own z-order and the body shows through the opening it left.  Added
     before headwear so a hat still draws over the hood's edge. */
  const capeSprite = new Sprite();
  capeSprite.anchor.set(0.5, 0.5);
  capeSprite.visible = false;
  container.addChild(capeSprite);
  /* v2.3.2186: the hood's silhouette, used to CLIP THE HAIR (owner: "Hair
     sticking out").  Hair already draws under the hood, so no z-order fixes
     this -- what shows is hair reaching past the hood's outline.  Placed with
     the cape's own transform, which is the body sprite's, so unlike the hat
     hair-mask it needs no crown anchor or per-pose tune to stay registered. */
  const capeHoodMask = new Sprite();
  capeHoodMask.anchor.set(0.5, 0.5);
  capeHoodMask.visible = false;
  container.addChild(capeHoodMask);

  const headwearSprite = new Sprite();
  headwearSprite.visible = false;
  container.addChild(headwearSprite);

  /* NFT 360° avatar pair — front/back sprites cross-faded by facing
     angle, with shear + horizontal compression to fake a "3D rotation"
     look (mirrors the Canvas 2D drawNft360 path).  Both invisible
     until an avatar texture pair loads. */
  const nftFront = new Sprite();
  nftFront.anchor.set(0.5, 1);
  nftFront.visible = false;
  container.addChild(nftFront);
  const nftBack = new Sprite();
  nftBack.anchor.set(0.5, 1);
  nftBack.visible = false;
  container.addChild(nftBack);

  /* All three weapon visuals (glow underlay, procedural fill, icon
     Sprite) live in a single sub-container so the per-frame z-order
     swap between "weapon in front of body" (forward facings) and
     "weapon behind body" (back facings W/NW/N/NE) can move them as a
     unit with one setChildIndex call.  Their relative order inside
     weaponContainer (glow → fill → sprite) is fixed so the silhouette
     always sits on top of the element-color halo. */
  const weaponContainer = new Container();
  container.addChild(weaponContainer);

  // §5.9.5 Combo Chain weapon-glow underlay.
  const weaponGlowGfx = new Graphics();
  weaponContainer.addChild(weaponGlowGfx);

  // Weapon visual — procedural Graphics (fallback) + icon Sprite
  // (preferred when the weapon-icon PNG has loaded).  Both children
  // exist; only one is visible per frame.
  const weaponGfx = new Graphics();
  weaponContainer.addChild(weaponGfx);

  const weaponSprite = new Sprite();
  weaponSprite.anchor.set(0.5, 0.5);
  weaponSprite.visible = false;
  weaponContainer.addChild(weaponSprite);

  /* v2.3.185 hand-over-grip layering: a body sprite clone, circularly
     masked to a small region around the hand anchor, drawn ON TOP of
     the weapon container. The clone shares the body's texture and
     transform each frame, so the only thing we actually render here
     are the body's pixels inside the mask circle -- the hand. Result:
     the hand visually wraps the weapon's grip without splitting the
     player sprite. Added AFTER weaponContainer so the hand renders
     above the weapon; the body renders below, weapon between. */
  const handCapSprite = new Sprite();
  handCapSprite.anchor.set(0.5, 0.5);
  handCapSprite.visible = false;
  const handCapMask = new Graphics();
  handCapMask.visible = true;
  handCapSprite.mask = handCapMask;
  container.addChild(handCapMask);
  container.addChild(handCapSprite);

  /* v2.3.200: second body-clone for the upper-arm capsule. Added
     BEFORE weaponContainer in the build order so it can be z-ordered
     between shield and weapon at frame time (E + jog only). Splitting
     the arm capsule onto its own sprite means body pixels can show
     in front of the shield (good) without also showing in front of
     the bamboo blade (which v2.3.199's single-sprite handCap was
     doing, producing "bamboo behind arm" during the E backswing). */
  const handArmSprite = new Sprite();
  handArmSprite.anchor.set(0.5, 0.5);
  handArmSprite.visible = false;
  const handArmMask = new Graphics();
  handArmMask.visible = true;
  handArmSprite.mask = handArmMask;
  container.addChild(handArmMask);
  container.addChild(handArmSprite);

  /* ═══ v2.3.2134: THE SHIRT RIDES ALONG WITH THE ARM CLONE ═══
   * Owner, a sixth time, and this is the report that finally located it:
   * "I don't understand why east frame jog shoulder only and not west frame
   * jog shoulder has skin problems. It only occurred after adding something
   * (like shield or maybe another layered item)... it used to not be an issue."
   *
   * Both halves of that were right and both were the clue. The tee's jog-east
   * sheet is ALSO its jog-west sheet (there is no jog-west.png; west is east
   * with a negative scale.x), so a defect on one facing and not the other can
   * not be in the artwork -- which is where five sessions and every
   * measurement since v2.3.1984 had been looking.
   *
   * It is here. The arm capsule above clones the BODY texture -- bare skin --
   * masks it to a stripe from shoulder to hand, and draws it ABOVE the shirt
   * (gearShirt is added at the top of this builder, this sprite far below it).
   * It fires on `facingIdx === 0 && pose === 'jog'`: EAST ONLY, which is the
   * asymmetry. It exists so the upper arm covers the SHIELD during the east
   * back-swing (v2.3.196/200/202), which is the "after adding something (like
   * shield)". And it became visible when the layered shirt stopped being baked
   * into the body texture: before that the clone already had the shirt in it
   * and stamping it changed nothing, which is the "it used to not be an
   * issue".
   *
   * v2.3.749 hit the identical bug on the sibling hand-cap -- "over the shirt
   * the cap stamped a bare-skin circle (shirt eaten at the right hand)" -- and
   * fixed it by switching the cap off whenever a layered shirt is worn, with
   * the note that "the grip-wrap nicety returns when the shirt clone learns to
   * ride along". The same guard was never applied here. Doing that now would
   * fix the shoulder and give back the shield show-through the capsule exists
   * to prevent, so instead: this is the shirt clone learning to ride along.
   *
   * Same texture and transform as the worn shirt, its own Graphics carrying
   * the identical capsule (a Pixi mask belongs to one object, so the two
   * clones cannot share one), and added immediately after the body clone --
   * above it, still below the weapon, so v2.3.200's z-order between shield and
   * blade is untouched. */
  const handArmShirt = new Sprite();
  handArmShirt.anchor.set(0.5, 0.5);
  handArmShirt.visible = false;
  const handArmShirtMask = new Graphics();
  handArmShirtMask.visible = true;
  handArmShirt.mask = handArmShirtMask;
  container.addChild(handArmShirtMask);
  container.addChild(handArmShirt);

  /* ═══ v2.3.2138: AND THE CAPE, FOR THE SAME REASON ═══
   * v2.3.2134 taught the SHIRT to ride along with the bare-skin arm clone and
   * stopped there.  The cape has the identical problem and it is visible in
   * the build order right above: capeSprite is added at ~4682 and the arm
   * clone at ~4757, so the clone draws over the cape exactly as it was drawing
   * over the tee.  Fixing one layer and not the other left a caped player
   * jogging east in combat with a bare-skin stripe across the cape -- the same
   * bug wearing different clothes.
   *
   * The cape is NOT a copy of the shirt clone, because the cape does not share
   * the body's transform: on a jog it carries a per-facing TILT and a slide
   * (v2.3.2024/2126), and its anchor is moved to the shoulders to pivot there
   * (_capeTune / _placeCape).  So this clone copies rotation and anchor as
   * well as position and scale -- copying only x/y/scale, the way the shirt
   * clone legitimately does, would put an untilted cape stripe over a tilted
   * one, which reads worse than the bare skin it replaces. */
  const handArmCape = new Sprite();
  handArmCape.anchor.set(0.5, 0.5);
  handArmCape.visible = false;
  const handArmCapeMask = new Graphics();
  handArmCapeMask.visible = true;
  handArmCape.mask = handArmCapeMask;
  container.addChild(handArmCapeMask);
  container.addChild(handArmCape);

  /* v2.3.1785: the outstretched arm that holds the raised shield, cut from the
     bow-shot art (see blockArm.js).  Sits here — after the body and the worn
     gear, immediately before the shield — so it reaches out OVER the torso and
     the shield's boss still covers the hand.  Structural, like the back
     shield's pair: nothing recomputes an index for it. */
  /* v2.3.1789: arm + sleeve share ONE container, so the per-frame z-order step
     moves them together and the shield can never slide between them.  Two
     sprites reindexed independently is how you get a sleeve floating over a
     shield with its own arm behind it. */
  const blockArmGroup = new Container();
  blockArmGroup.visible = false;
  const blockArmSprite = new Sprite();
  blockArmSprite.anchor.set(0, 0);
  blockArmGroup.addChild(blockArmSprite);
  /* the sleeve: the worn chest piece's bowshot strip, cut to the same rect and
     drawn directly over the bare arm with the same transform. */
  const blockArmSleeve = new Sprite();
  blockArmSleeve.anchor.set(0, 0);
  blockArmSleeve.visible = false;
  blockArmGroup.addChild(blockArmSleeve);
  container.addChild(blockArmGroup);

  /* v2.3.1782: the in-FRONT half of the on-back shield.  Sits here — after
     the arms, before the in-hand shield — so a shield slung across a back
     that faces the camera draws over the body and the arms, permanently, by
     construction rather than by per-frame reindexing. */
  const shieldBackHi = new Sprite();
  shieldBackHi.anchor.set(0.5, 0.5);
  shieldBackHi.visible = false;
  container.addChild(shieldBackHi);

  /* Wood-shield sprite — replaces the procedural cyan arc when the
     PNGs have loaded.  Anchored at center-bottom so it pivots
     around the grip and rotates into position naturally; we hide
     it whenever isShielding flips false. */
  const shieldSprite = new Sprite();
  shieldSprite.anchor.set(0.5, 0.5);
  shieldSprite.visible = false;
  container.addChild(shieldSprite);

  /* ═══ v2.3.1798: THE BLOCK CARET ═══
     Owner: "Add a carat while blocking to indicate the direction you're
     blocking."
     The shield sprite already sits on the guarded side, but a shield seen
     near-top-down is a disc — it says WHERE it is, not which way it faces, and
     the guard is an ARC whose centre the player has to aim.  A chevron pointing
     straight out along that centre states it unambiguously.
     Its own Graphics rather than a share of weaponGfx: weaponGfx lives inside
     weaponContainer, which is re-parented up and down the child list every
     frame by the in-front/behind weapon rule, and the caret must not inherit
     that.  Added after shieldSprite so it draws over the shield. */
  const blockCaretGfx = new Graphics();
  blockCaretGfx.visible = false;
  container.addChild(blockCaretGfx);

  /* ═══ v2.3.1953: THE HUD LIVES IN ITS OWN LAYER ═══
     Everything from here down is UI drawn at the character's position — the
     name plate, the combo badge, the threat skull, the floating vitals — not
     part of the figure.  It moved into one sub-container so the build scale
     (height x frame, buildCatalog.js) can be CANCELLED on it with a single
     inverse transform: the display is scaled non-uniformly to make a bro
     short or broad, and a name plate that stretched 17% wider with him would
     be a bug, not a feature.  One node to invert instead of eighteen, and a
     HUD node added later inherits the correction by being added here.
     Z-order is unchanged: these were already the last children, so a single
     container in their place draws in exactly the same order. */
  const uiLayer = new Container();
  container.addChild(uiLayer);
  container._uiLayer = uiLayer;

  // §5.9.5 Combo Chain count badge — sits above the bars.
  const comboText = new Text({ text: '', style: { ...NAME_STYLE, fontSize: 10 } });
  comboText.anchor.set(0.5, 1);
  uiLayer.addChild(comboText);

  // Stun countdown timer -- floats above the stun-star ring for any
  // variant with blockStunMs (skeleton: 5 s).  Hidden when m._stunUntil
  // isn't set or has expired.  Pooled per monster so we don't churn
  // Text instances on every stun.
  const stunTimerText = new Text({ text: '', style: { ...NAME_STYLE, fontSize: 11, fontWeight: '800', fill: '#fbbf24' } });
  stunTimerText.anchor.set(0.5, 1);
  stunTimerText.visible = false;
  uiLayer.addChild(stunTimerText);

  const nameText = new Text({ text: '', style: NAME_STYLE });
  nameText.anchor.set(0.5, 1);
  /* Was -28; bumped to -38 so the name plate doesn't occlude a
     sword tip that pokes ~5 px above the head when the right arm
     is fully extended (W jog cycles, etc). */
  nameText.y = -38;
  uiLayer.addChild(nameText);

  /* v2.3.1564: name + level pill below the feet — see _mintNamePill.
     v2.3.1566 (owner: "make it consistent and beneath other players too"):
     built by the shared factory so the local player and every remote
     player render the SAME plate from one implementation. */
  /* v2.3.1681 (owner: "Player name and level in the pill beneath character
     need to be slightly larger for legibility").  10 -> 13; the plate sizes
     itself off this number, so the background grows with the text. */
  _attachNamePill(container, 10, undefined, uiLayer);   /* v2.3.2154: 13 -> 15; v2.3.2265: 15 -> 10 (see the monster plate's note) */

  /* v2.3.1193: the local player's own threat skull (red = my threat
     countdown is running, white = ignored/expired fight window).  One
     Text created here, then driven by a _lastSkull change-cache in
     _updatePlayer — never rebuilt per frame.  Rendered even though the
     local nameplate is hidden: this is the "am I flagged?" indicator
     the ThreatIncomingPanel copy promises. */
  const skullText = new Text({ text: '\u{1F480}', style: { fontSize: 13 } });
  skullText.anchor.set(0.5, 1);
  skullText.visible = false;
  skullText.y = -52;
  uiLayer.addChild(skullText);

  /* Combat-bar HUD anchored above the head (v2.3.107).  Each bar
     is a pill-shaped Sprite using the same /icons/ui/bar-*.webp
     artwork the bottom dashboard's XP bar uses, so the in-world
     readout matches the dashboard chrome exactly.  A dim overlay
     Graphics sits on top of the right (empty) portion of each bar
     to indicate the current fill.  No backdrop -- the pills float
     directly on the game canvas.  Alpha is driven by
     _updatePlayerHud (fade in below max, hold at full for
     HOLD_MS, then fade out). */
  /* v2.3.121: stroke + drop shadow added so the HUD numbers stay
     readable on bright bar backgrounds (white "100" on the green HP
     pill was washing out completely).  Stroke gives crisp dark
     outline; dropShadow adds offset so the stroke reads at any
     orientation. */
  const _hudNumStyleFull = {
    fontFamily: 'Source Sans 3, sans-serif',
    fontSize: 8,
    fontWeight: '800',
    fill: '#ffffff',
    stroke: { color: '#000000', width: 2 },
    dropShadow: { color: '#000000', blur: 0, distance: 1, alpha: 0.9 },
    align: 'center',
  };
  const _hudNumStyleEmpty = {
    fontFamily: 'Source Sans 3, sans-serif',
    fontSize: 8,
    fontWeight: '800',
    fill: '#ff8888',
    stroke: { color: '#000000', width: 2 },
    dropShadow: { color: '#000000', blur: 0, distance: 1, alpha: 0.9 },
    align: 'center',
  };

  const hudMpSprite = new Sprite();
  hudMpSprite.anchor.set(0.5, 0.5);
  hudMpSprite.alpha = 0;
  uiLayer.addChild(hudMpSprite);
  const hudMpEmpty = new Graphics();
  hudMpEmpty.alpha = 0;
  uiLayer.addChild(hudMpEmpty);
  const hudMpTextFull  = new Text({ text: '', style: _hudNumStyleFull });
  const hudMpTextEmpty = new Text({ text: '', style: _hudNumStyleEmpty });
  hudMpTextFull.anchor.set(0.5, 0.5);  hudMpTextFull.alpha = 0;  uiLayer.addChild(hudMpTextFull);
  hudMpTextEmpty.anchor.set(0.5, 0.5); hudMpTextEmpty.alpha = 0; uiLayer.addChild(hudMpTextEmpty);

  const hudStamSprite = new Sprite();
  hudStamSprite.anchor.set(0.5, 0.5);
  hudStamSprite.alpha = 0;
  uiLayer.addChild(hudStamSprite);
  const hudStamEmpty = new Graphics();
  hudStamEmpty.alpha = 0;
  uiLayer.addChild(hudStamEmpty);
  const hudStamTextFull  = new Text({ text: '', style: _hudNumStyleFull });
  const hudStamTextEmpty = new Text({ text: '', style: _hudNumStyleEmpty });
  hudStamTextFull.anchor.set(0.5, 0.5);  hudStamTextFull.alpha = 0;  uiLayer.addChild(hudStamTextFull);
  hudStamTextEmpty.anchor.set(0.5, 0.5); hudStamTextEmpty.alpha = 0; uiLayer.addChild(hudStamTextEmpty);

  /* Above-head HP indicator: v2.3.458 quartile RING, replaced visually in
     v2.3.1273 by the owner's BAR art (frame + cropped fill sprites below);
     the ring Graphics is retained as the ghost-trail + damage-flash layer,
     and all the v2.3.458 gating/drain logic is unchanged. */
  const hudHpBarFrame = new Sprite();
  hudHpBarFrame.anchor.set(0.5, 0.5);
  hudHpBarFrame.alpha = 0;
  uiLayer.addChild(hudHpBarFrame);
  const hudHpBarFill = new Sprite();
  hudHpBarFill.anchor.set(0, 0.5);
  hudHpBarFill.alpha = 0;
  uiLayer.addChild(hudHpBarFill);
  const hudHpRing = new Graphics();
  hudHpRing.alpha = 0;
  uiLayer.addChild(hudHpRing);
  const hudHpText = new Text({ text: '', style: PLAYER_HP_NUM_STYLE });
  hudHpText.anchor.set(0.5, 0.5);
  hudHpText.alpha = 0;
  uiLayer.addChild(hudHpText);
  const hudHpMaxText = new Text({ text: '', style: HP_RING_MAX_STYLE });
  hudHpMaxText.anchor.set(0.5, 0.5);
  hudHpMaxText.alpha = 0;
  uiLayer.addChild(hudHpMaxText);

  container._body = body;
  container._spriteBody = spriteBody;
  container._shirtSprite = shirtSprite;
  container._facialHairSprite = facialHairSprite;
  container._hairSprite = hairSprite;
  container._hairMask = hairMask;
  container._capeSprite = capeSprite;                 /* v2.3.2023 */
  container._capeBackSprite = capeBackSprite;         /* v2.3.2186 */
  container._capeHoodMask = capeHoodMask;             /* v2.3.2186 */
  container._headwearSprite = headwearSprite;
  container._nftFront = nftFront;
  container._nftBack = nftBack;
  container._weaponContainer = weaponContainer;
  container._weaponGlowGfx = weaponGlowGfx;
  container._weaponGfx = weaponGfx;
  container._weaponSprite = weaponSprite;
  container._traitFace = traitFace;
  container._handCapSprite = handCapSprite;
  container._handCapMask = handCapMask;
  container._handArmSprite = handArmSprite;
  container._handArmMask = handArmMask;
  container._handArmShirt = handArmShirt;           /* v2.3.2134 */
  container._handArmShirtMask = handArmShirtMask;   /* v2.3.2134 */
  container._handArmCape = handArmCape;             /* v2.3.2138 */
  container._handArmCapeMask = handArmCapeMask;     /* v2.3.2138 */
  container._shieldSprite = shieldSprite;
  container._blockCaretGfx = blockCaretGfx;     /* v2.3.1798 */
  container._blockArmSprite = blockArmSprite;   /* v2.3.1785 */
  container._blockArmSleeve = blockArmSleeve;   /* v2.3.1789 */
  container._blockArmGroup = blockArmGroup;     /* v2.3.1789 */
  container._shieldBackLo = shieldBackLo;   /* v2.3.1782 */
  container._shieldBackHi = shieldBackHi;   /* v2.3.1782 */
  container._comboText = comboText;
  container._stunTimerText = stunTimerText;
  container._nameText = nameText;
  container._skullText = skullText; /* v2.3.1193: threat skull */
  container._lastSkull = null;
  container._hudHpBarFrame = hudHpBarFrame;
  container._hudHpBarFill = hudHpBarFill;
  container._hudHpRing = hudHpRing;
  container._hudHpText = hudHpText;
  container._hudHpMaxText = hudHpMaxText;
  container._hudMpSprite = hudMpSprite;
  container._hudMpEmpty = hudMpEmpty;
  container._hudMpTextFull = hudMpTextFull;
  container._hudMpTextEmpty = hudMpTextEmpty;
  container._hudStamSprite = hudStamSprite;
  container._hudStamEmpty = hudStamEmpty;
  container._hudStamTextFull = hudStamTextFull;
  container._hudStamTextEmpty = hudStamTextEmpty;
  /* Animation cache — track last (pose, dir, frameIdx) so we only
     reassign texture when it actually changes. */
  container._animPose = null;
  container._animDir = null;
  container._animFrame = -1;

  return container;
}

function createOtherPlayerDisplay() {
  const container = new Container();

  /* v2.3.1365 (owner): player ground shadow removed (see createPlayerDisplay). */

  /* Procedural fallback body — drawn until /sprites/player sheets
     resolve (and as a permanent fallback if they fail to load). */
  /* ═══ v2.3.1790: other bros wear their shield on their back too ═══
     v2.3.1782 built the slung shield for the local player only and said so;
     this closes that gap.  Same structural trick, because the reason for it is
     the same: a LOW clone before every drawn layer and a HIGH clone after them,
     with the facing choosing which is visible.  No index arithmetic, so no
     per-facing exception to get wrong — and the geometry comes from
     backShield.js, shared with the local player and both attack stand-ins, so
     a peer's shield cannot sit somewhere yours does not. */
  const shieldBackLo = new Sprite();
  shieldBackLo.anchor.set(0.5, 0.5);
  shieldBackLo.visible = false;
  container.addChild(shieldBackLo);

  /* v2.3.2186: the cape's back half — see the local player's builder. */
  const capeBackSprite = new Sprite();
  capeBackSprite.anchor.set(0.5, 0.5);
  capeBackSprite.visible = false;
  container.addChild(capeBackSprite);

  const body = new Graphics();
  container.addChild(body);

  /* Sprite-sheet body — same loader / texture cache the local player
     uses, just driven by the other player's velocity + facing. */
  const spriteBody = new Sprite();
  spriteBody.anchor.set(0.5, 0.5);
  spriteBody.visible = false;
  container.addChild(spriteBody);
  /* v2.3.608: per-region body sprites (head/torso/legs), drawn below the gear.
     The body renders through these so an unequipped slot reveals just that
     region at naked scale; spriteBody stays the (invisible) texture+transform
     reference the gear copies. */
  const bodyHead = new Sprite(); bodyHead.anchor.set(0.5, 0.5); bodyHead.visible = false; container.addChild(bodyHead);
  const bodyTorso = new Sprite(); bodyTorso.anchor.set(0.5, 0.5); bodyTorso.visible = false; container.addChild(bodyTorso);
  const bodyLegs = new Sprite(); bodyLegs.anchor.set(0.5, 0.5); bodyLegs.visible = false; container.addChild(bodyLegs);
  container._bodyHead = bodyHead; container._bodyTorso = bodyTorso; container._bodyLegs = bodyLegs;
  /* ═══ v2.3.1872: THE SOUTH BLOCK'S TWO HALVES ═══
     Owner: "the same frozen torso half so jogging while blocking doesn't look
     weird."  Every other facing gets that from the bow stand-in, whose
     jog-legs composite (v2.3.1072) draws animated legs under a leg-erased
     torso.  South has no stand-in at all — its bow body sheet is holed
     through the face (v2.3.1805) — so it needs the same trick built on the
     REAL body: the standing frame above the waist, the jog frame below it.
     Their own sprites rather than the dormant _body* region trio, because
     _hideBodyRegions is called unconditionally further down the body path and
     would park them every frame.  Added here so they sit exactly where the
     body sits in the child order: under the gear, over the slung shield. */
  const southTop = new Sprite(); southTop.anchor.set(0.5, 0.5); southTop.visible = false; container.addChild(southTop);
  const southLegs = new Sprite(); southLegs.anchor.set(0.5, 0.5); southLegs.visible = false; container.addChild(southLegs);
  container._southTop = southTop; container._southLegs = southLegs;

  /* v2.3.504: layered gear for remote players (above body, below head traits).
     Driven by other.equip; placement copies the body transform.
     v2.3.748: + shirt under-layer (see local display).
     v2.3.1710: legs BEFORE shirt, mirroring the local display — the owner's
     "the shirt should be layered in front of the leg armor" is about what a
     character looks like, and a peer is a character too.  Leaving the two
     stacks out of step is how this kind of fix comes back as "it's fixed for
     me but not for other players". */
  const gearLegs = new Sprite(); gearLegs.anchor.set(0.5, 0.5); gearLegs.visible = false; container.addChild(gearLegs);
  /* v2.3.1347: no belt sprite for remote players either — chain is painted in
     the masked-body bake (see local display). */
  const gearShirt = new Sprite(); gearShirt.anchor.set(0.5, 0.5); gearShirt.visible = false; container.addChild(gearShirt);
  const gearChest = new Sprite(); gearChest.anchor.set(0.5, 0.5); gearChest.visible = false; container.addChild(gearChest);
  const gearShoulders = new Sprite(); gearShoulders.anchor.set(0.5, 0.5); gearShoulders.visible = false; container.addChild(gearShoulders);
  /* v2.3.602: helmet is its own slot now; drawn topmost (over the hair + chest collar). */
  const gearHead = new Sprite(); gearHead.anchor.set(0.5, 0.5); gearHead.visible = false; container.addChild(gearHead);
  container._gearShirt = gearShirt; container._gearLegs = gearLegs; container._gearChest = gearChest; container._gearShoulders = gearShoulders; container._gearHead = gearHead;

  /* v2.3.467: shirt sprite for remote players (above body, below head
     traits).  Driven by other.shirt. */
  const shirtSprite = new Sprite();
  shirtSprite.visible = false;
  container.addChild(shirtSprite);

  /* v2.3.353: facial-hair sprite for remote players (above body, below
     headwear).  Driven by other.facialhair. */
  const facialHairSprite = new Sprite();
  facialHairSprite.visible = false;
  container.addChild(facialHairSprite);

  /* v2.3.357: hair sprite for remote players (below headwear). */
  const hairSprite = new Sprite();
  hairSprite.visible = false;
  container.addChild(hairSprite);
  /* v2.3.364: silhouette clip mask for hair under a `clipsHair` hat --
     a Sprite carrying the helmet's downward-filled outline, placed
     exactly where the helmet renders. */
  const hairMask = new Sprite();
  hairMask.anchor.set(0.5, 0.5);
  container.addChild(hairMask);

  /* v2.3.321: headwear sprite for remote players (above body, below
     weapon/NFT) so other players' hats render.  Driven by other.headwear. */
  /* v2.3.2023: the cape.  ABOVE the body and gear, because the art was
     authored that way -- the generator drew it on the mannequin with the front
     panels over the chest and the hood over the skull, so the picture states
     its own z-order and the body shows through the opening it left.  Added
     before headwear so a hat still draws over the hood's edge. */
  const capeSprite = new Sprite();
  capeSprite.anchor.set(0.5, 0.5);
  capeSprite.visible = false;
  container.addChild(capeSprite);
  /* v2.3.2186: the hood's silhouette, used to CLIP THE HAIR (owner: "Hair
     sticking out").  Hair already draws under the hood, so no z-order fixes
     this -- what shows is hair reaching past the hood's outline.  Placed with
     the cape's own transform, which is the body sprite's, so unlike the hat
     hair-mask it needs no crown anchor or per-pose tune to stay registered. */
  const capeHoodMask = new Sprite();
  capeHoodMask.anchor.set(0.5, 0.5);
  capeHoodMask.visible = false;
  container.addChild(capeHoodMask);

  const headwearSprite = new Sprite();
  headwearSprite.visible = false;
  container.addChild(headwearSprite);

  /* NFT 360° pair — see createPlayerDisplay for the rationale. */
  const nftFront = new Sprite();
  nftFront.anchor.set(0.5, 1);
  nftFront.visible = false;
  container.addChild(nftFront);
  const nftBack = new Sprite();
  nftBack.anchor.set(0.5, 1);
  nftBack.visible = false;
  container.addChild(nftBack);

  /* Weapon container — same structure as the local player (see
     createPlayerDisplay).  Wraps glow underlay, procedural fallback,
     and the icon Sprite so a single setChildIndex per frame can
     z-order all three relative to spriteBody. */
  const weaponContainer = new Container();
  container.addChild(weaponContainer);
  /* v2.3.1790: the in-FRONT half — after the body, the gear and the shirt, so a
     back turned to the camera shows the shield over all of them. */
  const shieldBackHi = new Sprite();
  shieldBackHi.anchor.set(0.5, 0.5);
  shieldBackHi.visible = false;
  container.addChild(shieldBackHi);

  const weaponGlowGfx = new Graphics();
  weaponContainer.addChild(weaponGlowGfx);
  const weaponGfx = new Graphics();
  weaponContainer.addChild(weaponGfx);
  const weaponSprite = new Sprite();
  weaponSprite.anchor.set(0.5, 0.5);
  weaponSprite.visible = false;
  weaponContainer.addChild(weaponSprite);

  /* v2.3.1953: the HUD layer — see the note in createPlayerDisplay.  Same
     reason on a peer: their name plate and duel bar must not stretch with
     their build. */
  const uiLayer = new Container();
  container.addChild(uiLayer);
  container._uiLayer = uiLayer;

  const nameText = new Text({ text: '', style: { ...NAME_STYLE, fontSize: 9 } });
  nameText.anchor.set(0.5, 1);
  /* Was -24; bumped to -34 to match the local player nameplate's
     new offset (sword tip clearance — see createPlayerDisplay).
     v2.3.1566: no longer drawn — the plate below the feet replaced it.
     The Text object stays so the party-marker change-cache and any
     stale reference keep working; it is simply never made visible. */
  nameText.y = -34;
  nameText.visible = false;
  uiLayer.addChild(nameText);

  /* v2.3.1566 (owner): same plate the local player gets, one size down —
     a remote name should not out-shout your own. */
  _attachNamePill(container, 9, undefined, uiLayer);   /* v2.3.1681: 9 -> 12, still one down from your own; v2.3.2154 lifts the pair to 15/14; v2.3.2265 brings them to 10/9 */

  /* v2.3.1193: threat skull above the nameplate (red = active threat
     countdown, white = ignored/expired fight window — see
     docs/specs/threats.md "Skull rendering").  One Text per display,
     driven by a change-cache in _updateOtherPlayers; never rebuilt per
     frame (the v2.3.1185 party-marker budget). */
  const skullText = new Text({ text: '\u{1F480}', style: { fontSize: 13 } });
  skullText.anchor.set(0.5, 1);
  skullText.visible = false;
  skullText.y = -58;
  uiLayer.addChild(skullText);

  container._body = body;
  container._spriteBody = spriteBody;
  container._shirtSprite = shirtSprite;
  container._facialHairSprite = facialHairSprite;
  container._hairSprite = hairSprite;
  container._hairMask = hairMask;
  container._capeSprite = capeSprite;                 /* v2.3.2023 */
  container._capeBackSprite = capeBackSprite;         /* v2.3.2186 */
  container._capeHoodMask = capeHoodMask;             /* v2.3.2186 */
  container._headwearSprite = headwearSprite;
  container._nftFront = nftFront;
  container._nftBack = nftBack;
  container._weaponContainer = weaponContainer;
  container._weaponGlowGfx = weaponGlowGfx;
  container._weaponGfx = weaponGfx;
  container._weaponSprite = weaponSprite;
  container._nameText = nameText;
  container._skullText = skullText; /* v2.3.1193: threat skull */
  container._lastSkull = null;
  /* Animation cache mirrors the local player display. */
  container._animPose = null;
  container._animDir = null;
  container._animFrame = -1;

  container._shieldBackLo = shieldBackLo;   /* v2.3.1790 */
  container._shieldBackHi = shieldBackHi;   /* v2.3.1790 */

  /* ═══ v2.3.1917: A DUEL OPPONENT WEARS A HEALTH BAR ═══
     Owner: "During duels make it so that the hp and combat resource bars
     appear (as if you're battling any other monster)."  Until now a duel
     showed you a small "DUEL" badge in the corner and nothing else: you
     fought a stranger with no idea whether you were winning, which is the
     one thing every monster fight tells you at a glance.

     "As if you're battling any other monster" is taken literally — the
     same bar art, the same 44x13 geometry, the same ghost-trail and
     white damage flash, the same hide-at-full rule.  Built here (frame /
     fill / fx / number) and driven in _updateOtherPlayers; the nodes cost
     nothing while alpha is 0, which is what they are for every peer who
     is not in a fight. */
  const duelBar = new Sprite();
  duelBar.anchor.set(0.5, 0.5);
  duelBar.alpha = 0;
  uiLayer.addChild(duelBar);
  const duelBarFill = new Sprite();
  duelBarFill.anchor.set(0, 0.5);
  duelBarFill.alpha = 0;
  uiLayer.addChild(duelBarFill);
  const duelBarFx = new Graphics();
  duelBarFx.alpha = 0;
  uiLayer.addChild(duelBarFx);
  const duelBarText = new Text({ text: '', style: { ...NAME_STYLE, fontSize: 9 } });
  duelBarText.anchor.set(0.5, 0.5);
  duelBarText.alpha = 0;
  uiLayer.addChild(duelBarText);
  container._duelBar = duelBar;
  container._duelBarFill = duelBarFill;
  container._duelBarFx = duelBarFx;
  container._duelBarText = duelBarText;
  return container;
}

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
const RES_BORDER = 2;          /* the white keyline, drawn OUTSIDE the track */
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
const RES_BLOCK_H = Math.round(RES_BLOCK_W * 98 / 273);
/* Derived, never a literal -- v2.3.1896c records the energy bar climbing INTO
   the MP bar because this said `40 + ...` while MP had moved to 52, and the
   suite did not catch it (it only asserts enY > mpY, which stayed true). */
const RES_EN_Y = RES_MP_Y + RES_BLOCK_H + 3;
/* ═══ v2.3.2302: THE ROW GETS LONGER, NOT TALLER ═══
   The block COUNT now grows with investment (5 base, 10 fully invested), and
   the owner chose "one row that gets longer" over a second row.

   RES_BLOCK_H deliberately stays keyed to the sheet's aspect AT THE FIVE-BLOCK
   WIDTH. It is a per-BAR aspect, not a per-block one, so deriving it from a
   widened bar would make a ten-block bar 55 tall and shove RES_EN_Y 28 units
   down into the terrain -- which is the v2.3.1896c incident wearing a new hat.

   RES_BAR_MAX_W caps the growth. Unclamped, ten blocks is ~145 display units
   = ~107 CSS px in town: wider than the ATTACK disc (96), 27% of a 390pt
   screen, and 4.6x the character's own silhouette -- and half again as wide in
   farm_home, whose scale floor is 0.82 rather than town's ~0.589. Clamped at
   118 the bar never passes ~87 CSS px in town, the squeeze only starts at nine
   blocks, and because the HEIGHT is held the compression reads as "more,
   tighter blocks" rather than as distortion. Holding the total at 76 instead
   was the other option and is worse: a block would be 4 CSS px wide, which is
   not a countable thing. */
const RES_BAR_MAX_W = 118;
const RES_SRC_CELL = BLOCK_GEOM.cell;
const RES_SRC_PITCH = BLOCK_GEOM.pitch;
const _barSrcW = (n) => RES_SRC_CELL + (n - 5) * RES_SRC_PITCH;
const _barScaleX = (n) => Math.min(RES_BLOCK_W / RES_SRC_CELL, RES_BAR_MAX_W / _barSrcW(n));
const _barWidth = (n) => Math.round(_barScaleX(n) * _barSrcW(n));
const RES_HOLD_MS = 1000;      /* full alpha for a second after the last spend */
const RES_FADE_MS = 1000;      /* then a second of fade — gone at 2s */
const RES_SLIDE_MS = 420;      /* how long the spent chunk takes to leave */
/* v2.3.1896: the spent portion is BLACK (owner), and the border white.  The
   black is what makes the fill read as a quantity against any ground — the
   old 0x101B22 track was near-black already, but on the sand it sat close
   enough to the terrain to blur the empty end. */
const RES_TRACK = 0x000000;
const RES_BORDER_COL = 0xFFFFFF;
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
const RES_SPENT_TRAVEL = 26;   /* how far right of that it drifts */
const RES_SPENT_GLIDE_MS = RES_HOLD_MS + RES_FADE_MS;

/* v2.3.1899: how far along its travel the number is, 0..1.
   Owner: "The spent energy numbers glide and fade correctly but not the mp
   numbers.  It's still the quick still pop up."

   Both bars run identical code, so the difference was never in the drawing —
   it was in the DATA.  A trace of three real specials in town showed the MP
   number snapping back to its origin on every further spend (t=739, t=1357):
   in real play you cast repeatedly, so it restarts before it has travelled
   far enough to look like motion.  Energy looked fine only because it was
   being spent once.  The reason MP is the one that shows it is town regen —
   the hub pays 10% of maxMana every ~670ms (v2.3.1414), so mana is topped up
   and spendable again immediately, and casts land close together.

   So the glide no longer restarts.  A spend that lands while the bar is
   still on screen picks up from where the number currently IS and glides on
   toward the far end; only a spend arriving after the bar has gone starts
   over at the origin.  The travel is therefore monotonic — it can never jump
   backwards — and every spend still produces visible movement, because there
   is always ground left between here and the end. */
function _resGlideProgress(gfx, now) {
  if (!gfx._resGlideAt) return 0;
  const base = gfx._resGlideBase || 0;
  const t = Math.min(1, Math.max(0, (now - gfx._resGlideAt) / RES_SPENT_GLIDE_MS));
  return base + (1 - base) * t;
}

/* One bar.  Returns its alpha, so the caller can decide about the plate. */
function _drawResourceBar(gfx, sprite, kind, cur, max, y, now, n) {
  const m = Math.max(1, max || 1);
  const v = Math.max(0, Math.min(m, cur || 0));
  /* Seed on the first frame so arriving at partial MP does not read as a
     spend and flash the bar for nothing — the same trap the HP ring hit at
     v2.3.1682. */
  if (gfx._resLast == null) {
    gfx._resLast = v; gfx._resSpentAt = 0; gfx._resFrom = v;
    gfx._resSpentAmt = 0;
    gfx._resGlideAt = 0; gfx._resGlideBase = 0;
  }
  if (v < gfx._resLast - 0.01) {
    /* Was the bar still on screen when this spend landed?  Read BEFORE
       _resSpentAt is overwritten below — it is the whole test. */
    const _prevSince = now - (gfx._resSpentAt || 0);
    const _wasUp = !!gfx._resSpentAt && _prevSince <= RES_HOLD_MS + RES_FADE_MS;
    gfx._resFrom = gfx._resLast;         /* re-base the chunk on every spend */
    /* The FADE still re-arms on every spend — that is the owner's original
       rule ("disappear after 2 seconds if no further mp is used").  Only the
       GLIDE is now continuous across the burst. */
    gfx._resGlideBase = _wasUp ? _resGlideProgress(gfx, now) : 0;
    gfx._resGlideAt = now;
    gfx._resSpentAt = now;
    /* v2.3.1897: LATCHED here, not recomputed per frame.  Mana and stamina
       regenerate server-side, so a regen tick arrives as a rise and lands in
       the refill branch below — recomputed each frame, the "-N" would blink
       out the first time the server topped you up, which inside a 2s hold is
       most of the time.  The chunk can afford that (it is gone in 420ms); a
       number the player is still reading cannot.  A further spend re-latches,
       matching the chunk, which also shows only the newest spend. */
    /* v2.3.1900 (owner: "Successive expenditures of mp and energy are treated
       cumulatively (numbers keep adding up the more you spend) I just want
       the expended amount"): the number is THIS spend, not a running total.
       v2.3.1899 accumulated, which was the wrong answer to a real problem —
       so keep the guard and drop the total.

       The real problem: mana arrives fractional under town regen (77 -> 77.1
       -> 90 -> 90.1), so a sub-half-unit dip counts as a spend by the 0.01
       test above and Math.round()s to ZERO.  Overwriting blindly with that
       BLANKED a live number mid-glide while its bar stayed up (caught at
       t=1460 in the three-cast trace).  So a drop that does not round to at
       least 1 leaves the displayed amount alone: real costs are whole
       numbers, and anything under a unit is regen jitter, not an expenditure
       worth announcing.  It still re-arms the bar, which is the pre-existing
       behaviour of the 0.01 test and not this change's business. */
    const _rounded = Math.round(gfx._resLast - v);
    if (_rounded >= 1) gfx._resSpentAmt = _rounded;
    else if (!_wasUp) gfx._resSpentAmt = 0;
  } else if (v > gfx._resLast + 0.01) {
    gfx._resFrom = v;                    /* refill: no chunk, and no reveal */
  }
  gfx._resLast = v;

  const since = now - (gfx._resSpentAt || 0);
  let alpha = 0;
  if (gfx._resSpentAt) {
    if (since <= RES_HOLD_MS) alpha = 1;
    else if (since <= RES_HOLD_MS + RES_FADE_MS) alpha = 1 - (since - RES_HOLD_MS) / RES_FADE_MS;
  }
  /* ═══ v2.3.2300: FIVE BLOCKS, NOT A PROPORTIONAL BAR ═══
     Owner: "instead of seeing tiny percentages and trying to do mental math
     each time stamina or mana is used, I want just 5 blocks (with thick borders
     between them but all connected inside a rectangle)."

     Everything ABOVE this line is untouched -- the spend detection, the
     hold-then-fade clock, the re-arm on a second spend. That is the behaviour
     v2.3.1895-1900 tuned with the owner over five rounds and none of it was
     what he is complaining about. What changes is only what gets DRAWN, so the
     bars still appear on a spend, hold for a second, fade by two, and hold
     their reserved positions.

     THE GRAPHICS STOPS DRAWING AND KEEPS ITS JOB. Every `_res*` field the
     probe publishes and the death-reset sweep clears lives on this object, and
     moving that bookkeeping onto the sprite would mean touching both the
     revive path and the keep-list. It is the state; the sprite is the view.

     THE SLIDING CHUNK AND THE "-N" ARE GONE with the proportional fill. They
     existed to make a fraction legible as a quantity ("how much of the bar just
     left"), which is precisely the mental arithmetic being removed -- and with
     a block readout the answer is visible without a number, because a whole
     block goes out. Their bookkeeping is nulled rather than left stale, so the
     probe reports the absence rather than the last value from before the swap. */
  gfx.clear();
  gfx._resSlideT = 1;
  gfx._resSpentT = 1;
  gfx._resGhostX = null; gfx._resGhostW = 0;
  gfx._resSpentAmt = 0;
  if (alpha <= 0.01) {
    gfx.alpha = 0;
    if (sprite) { sprite.visible = false; sprite.alpha = 0; }
    return 0;
  }
  gfx.alpha = alpha;
  if (sprite) {
    const parts = BLOCK_BARS[kind] && BLOCK_BARS[kind].parts;
    const N = Math.max(1, Math.floor(n || 5));
    const lit = blocksFor(v, m, N);
    /* No sheet (a 404, or a frame before the preload settled) means no bar --
       NOT a half-drawn one. The preloading law makes the second case a bug
       rather than a state to design for, and the manifest awaits these; this
       is the honest degradation for the first. */
    if (parts) {
      const k = _barScaleX(N);
      const W = _barWidth(N);
      const L = -W / 2;          /* the container sits at x=0, so the bar grows
                                    symmetrically about the player's centre --
                                    this is what preserves the anchor(0.5, 0)
                                    semantics the single sprite used to have. */
      sprite.x = 0;
      sprite.y = y;
      sprite.alpha = alpha;
      sprite.visible = true;

      const capW = BLOCK_GEOM.cap * k;
      sprite._capL.x = L;            sprite._capL.width = capW;  sprite._capL.height = RES_BLOCK_H;
      sprite._mid.x = L + capW;      sprite._mid.width = Math.max(0, W - capW * 2); sprite._mid.height = RES_BLOCK_H;
      sprite._capR.x = L + W - capW; sprite._capR.width = capW;  sprite._capR.height = RES_BLOCK_H;

      /* v2.3.2302: cells are POOLED, never destroyed when N changes. N moves
         on a level-up, an allocation and a respec -- all of which can happen
         mid-fight -- and `new Sprite()` on the frame the sixth block arrives
         is a hitch on the one frame the player is actually watching the bar.
         Grow to fit, then hide the surplus. */
      while (sprite._cells.length < N) {
        const c = new Sprite(parts.empty);
        c.anchor.set(0, 0);
        sprite.addChild(c);
        sprite._cells.push(c);
      }
      for (let i = 0; i < sprite._cells.length; i++) {
        const c = sprite._cells[i];
        if (i >= N) { c.visible = false; continue; }
        const tex = i < lit ? parts.lit : parts.empty;
        if (c.texture !== tex) c.texture = tex;
        c.x = L + k * (BLOCK_GEOM.first + RES_SRC_PITCH * i);
        c.width = BLOCK_GEOM.cellW * k;
        c.height = RES_BLOCK_H;
        c.visible = true;
      }
    } else {
      sprite.visible = false;
    }
  }
  return alpha;
}

/* v2.3.1896: the readout ON the bar (owner: "fit the numbers on each bar (or
   wherever works best for readability)").  Centred inside the bar rather than
   beside it — beside would have to pick a side, and either side collides with
   something (the figure above, the other bar below).  It shares the bar's own
   alpha so the number cannot outlive the thing it labels, which is the class
   of bug the stale probes in this file keep producing.  Text nodes are made
   once and parked; Pixi Text is expensive to churn. */
function _drawResourceLabel(label, cur, max, y, alpha) {
  if (!label) return;
  if (alpha <= 0.01) { label.visible = false; return; }
  const txt = Math.ceil(cur) + ' / ' + Math.ceil(max);
  if (label.text !== txt) label.text = txt;
  label.x = 0;
  label.y = y + RES_BAR_H / 2;
  label.alpha = alpha;
  label.visible = true;
}

/* v2.3.1897: the "-N" that glides off the bar's right end.  Left-anchored at
   the keyline and travelling outward, so it reads as the amount LEAVING the
   bar rather than a second gauge parked beside it.  It carries a black stroke
   because unlike the on-bar readout it sits over open terrain, not over the
   bar's own black track — white-on-sand is the one place this text has no
   ground of its own. */
function _drawResourceSpent(label, gfx, kind, y, alpha) {
  if (!label) return;
  const amt = gfx && gfx._resSpentAmt;
  /* No chunk (a refill, or the seed frame) means nothing to announce.  Gated
     on the bar's own alpha too, so the number cannot outlive the bar — the
     class of bug the stale probes in this file keep producing. */
  if (alpha <= 0.01 || !amt) { label.visible = false; return; }
  const txt = '-' + amt;
  if (label.text !== txt) label.text = txt;
  if (label.style.fill !== RES_GHOST_HEX[kind]) label.style.fill = RES_GHOST_HEX[kind];
  /* v2.3.1898: the bar's clock, and very close to linear.  A strong ease-out
     over two seconds spends most of its travel in the first quarter and then
     sits still for the rest — which is the "appears but does not glide" the
     owner reported, just slower.  The mild exponent keeps a little
     deceleration at the end without ever stopping. */
  const t = Math.min(1, Math.max(0, gfx._resSpentT == null ? 1 : gfx._resSpentT));
  const ease = Math.pow(t, 0.85);
  label.x = RES_BAR_W / 2 + RES_BORDER + RES_SPENT_GAP + RES_SPENT_TRAVEL * ease;
  label.y = y + RES_BAR_H / 2;
  label.alpha = alpha;
  label.visible = true;
}

export class EntityRenderer {
  constructor(entityLayer, playerLayer, monsterUiLayer, gestureLayer) {
    this.entityLayer = entityLayer;
    this.playerLayer = playerLayer;
    /* v2.3.1713: the layer above gatherNodesFront that the gathering figures
       draw in.  The local body borrows it for the mine/fish poses only (see
       _updatePlayer); null on an older scene graph, which just leaves the
       body in playerLayer and restores the old behaviour. */
    this.gestureLayer = gestureLayer || null;
    /* v2.3.1472: HP bar / level / number live in their own layer above
       gatherNodes (see pixiApp) so a tree can hide the monster without
       hiding its health.  Falls back to the entity layer if a caller
       hasn't been updated, which just restores the old behaviour. */
    this.monsterUiLayer = monsterUiLayer || entityLayer;
    this.monsterDisplays = new Map();
    this.otherPlayerDisplays = new Map();
    this.playerDisplay = null;
    this.npcDisplays = new Map();
    this.petDisplay = null;
  }

  update(S, now) {
    this._updateMonsters(S, now);
    this._updateOtherPlayers(S, now);
    this._updatePlayer(S, now);
    this._updateProps(S);
    this._updateNPCs(S, now);
    this._updatePet(S, now);
    this._updatePlayerHud(S, now);
  }

  _updateMonsters(S, now) {
    const monsters = S.monsters || [];
    const activeIds = new Set();
    const SLIME_DEATH_MS = 400; /* v7 sprite: 15-frame burst (windup pre-trimmed in
                                    the sheet, so frame 0 is already the explosion).
                                    400 ms / 15 = ~27 ms/frame -> ~37 fps, fast enough
                                    that the explosion reads as immediate. */
    const SNOWMAN_DEATH_MS = 500; /* user-requested 0.5 s shatter */
    /* Variant death durations come from MONSTER_VARIANTS[key].deathMs;
       see monsterVariants.js for the per-variant config. */

    for (const m of monsters) {
      /* v2.3.1765: the spawn-in trigger is stamped HERE, at the top of the
         loop, because the dead branch below `continue`s — so anything that
         watches for dead->alive further down never sees the dead half and
         reads a respawn as "alive all along".  That is what the first cut of
         this did, and the flourish simply never fired.
         Kept on the MONSTER rather than on its display for the same reason:
         a display is created lazily and would miss the transition too. */
      if (m._fxWasAlive === undefined) {
        m._fxWasAlive = !!m.alive;
        if (m.alive) m._spawnFxAt = now;   /* first sighting is an arrival too */
      } else if (m.alive && m._fxWasAlive === false) {
        m._spawnFxAt = now;
        /* v2.3.2228: and drop the burst peak stamp.  Cleared HERE, on the
           respawn edge, rather than while alive -- the execute event stamps
           it and the kill can land a frame later, so a clear-while-alive
           pass would wipe it before the death branch below ever sees it. */
        m._burstPeakFrom = 0;
      }
      m._fxWasAlive = !!m.alive;
      /* Mid-fight variant transform check (currently just mummy ->
         skeleton at HP <= transformAt).  Server is authoritative for
         this when S._serverMonsters is true -- the worker detects the
         threshold + emits a monster_transform event that BroTown.jsx
         applies in _processGameEvent.  This local fallback runs only
         in SP / dungeon mode where the worker doesn't model the zone. */
      if (!S._serverMonsters) maybeTransformMonster(m);
      const arch = m.archetype || m.type;
      const variantKey = MONSTER_VARIANTS[arch] ? arch : null;
      const variant = variantKey ? MONSTER_VARIANTS[variantKey] : null;
      /* v2.3.1147: slime-sheet variants count as fodder here too (death
         splat branch below keys on this local). */
      const isFodder = arch === 'fodder' || !!(variant && variant.useSlimeSheets);
      const variantSprites = variantKey ? variantSpritesFor(variantKey) : null;
      const isSnowman = arch === 'snowman';

      /* Fodder + variant death timer — first observation of alive=false
         stamps m._slimeDeathStart (kept its slime-era name to avoid
         touching every reader).  Variants reuse the same field; the
         slime-splat SFX only fires for raw fodder. */
      if (!m.alive && (isFodder || variantKey) && m._slimeDeathStart == null) {
        m._slimeDeathStart = now;
        if (isFodder) {
          try {
            if (typeof window !== 'undefined' && window.BT_AUDIO) {
              window.BT_AUDIO.play('slime-death', { vol: 0.425 });
            }
          } catch {}
        }
      }

      /* Snowman death — separate timer so it doesn't share the slime's
         100 ms window.  No SFX hook here; the global deathBoom in
         gameLoop.js fires for every kill. */
      if (!m.alive && isSnowman && m._snowmanDeathStart == null) {
        m._snowmanDeathStart = now;
      }

      /* Dead-monster handling: render the death sprite for fodder /
         variants within the death window; otherwise hide and skip.
         Variants use their own death sheet over variant.deathMs;
         raw fodder uses the slime splat over SLIME_DEATH_MS.
         Keep the display in activeIds for the full death window even
         if sheets aren't loaded yet -- otherwise the cleanup loop
         destroys it before the sprites resolve and the user sees a
         pop-out instead of an animation. */
      /* v2.3.2228 QA probe: the body sprite AS IT STANDS, alive or dead.
         __btMonHit is written further down, past the dead-monster `continue`,
         so for a corpse it reports a stale frame from when it was still
         alive -- which is exactly the window the death burst plays in.
         Reads on demand rather than writing per frame. */
      if (typeof window !== 'undefined' && !window.__btMonsterSprite) {
        const _mdRef = this.monsterDisplays;
        window.__btMonsterSprite = (mid) => {
          const d = _mdRef.get(mid);
          if (!d || !d._spriteBody) return null;
          return {
            sx: +d._spriteBody.scale.x.toFixed(3),
            visible: !!d._spriteBody.visible,
            drewDeathAt: d._deathDrewAt || 0,
          };
        };
      }
      if (!m.alive) {
        const deathT = m._slimeDeathStart != null ? now - m._slimeDeathStart : null;
        const variantDeathMs = variant ? (variant.deathMs || 1000) : 0;
        /* ═══ v2.3.2228: THE BURST PLAYS AT THE SIZE IT GREW TO ═══
           Owner: "play the slime explosion animation at the peak swell size",
           then "I never see the death animation play, it swells then freezes."
           Both are the same mistake made twice.  The swell multiplier lives
           after every sprite branch -- but the dead-monster branch `continue`s
           long before that line, so a corpse never reached it: v2.3.2227's
           hold was unreachable code, and the sprite simply kept whatever scale
           the last ALIVE frame left on it (the freeze).  The hold belongs in
           the death branches themselves, where the explosion is drawn.
           Bounded by the death window it sits inside -- no timer, no reset
           pass -- and by the respawn clear above. */
        const _peakK = m._burstPeakFrom ? (m._burstScale || 3.5) : 1;
        if (variant && deathT != null && deathT >= 0 && deathT < variantDeathMs) {
          activeIds.add(m.id);
        }
        if (variant && variantSprites && variantSprites.death && variantSprites.death.has()
            && deathT != null && deathT >= 0 && deathT < variantDeathMs) {
          activeIds.add(m.id);
          const display = this.monsterDisplays.get(m.id);
          if (display && display._spriteBody) {
            const fc = variantSprites.death.count();
            const t = deathT / (variant.deathMs || 1000);
            const frameIdx = Math.max(0, Math.min(fc - 1, Math.floor(t * fc)));
            const tex = variantSprites.death.get(frameIdx);
            const sb = display._spriteBody;
            if (tex && sb.texture !== tex) sb.texture = tex;
            /* Death scale: variant.deathScalePx if set, else falls
               back to liveScalePx so the cut from walk -> death stays
               continuous by default.  Set deathScalePx larger than
               liveScalePx when the death source had to be pre-shrunk
               to fit its effects inside the canvas (e.g. skeleton's
               crumble + dust burst) -- the variant scales itself
               back up at render time. */
            const deathPx = variant.deathScalePx || variant.liveScalePx || 64;
            const baseScale = (deathPx / 256) * _peakK;
            sb.scale.x = baseScale;
            sb.scale.y = baseScale;
            sb.y = display._size;
            sb.tint = (variant && variant.tint) || 0xffffff; /* v2.3.1147 */
            sb.visible = true;
            display.x = m.x;
            display.y = m.y;
            display.visible = true;
            display._body.visible = false;
            /* Clear HP bar.  The alive-branch HP-bar maintenance code
               skips on dead monsters, so without this the bar freezes
               at whatever fraction the last alive tick saw -- if the
               server jumps straight from "alive 50%" to monster_kill
               without an intermediate hp=0 tick, the bar stays
               half-full over a corpse (v2.3.17 bug report).  Set
               _lastHpPct = 1 so the post-respawn redraw triggers
               cleanly on the first damage tick. */
            if (display._hpHeart && !display._hpHeart.destroyed) display._hpHeart.alpha = 0;
            if (display._hpText && !display._hpText.destroyed) display._hpText.alpha = 0;
            /* v2.3.1273: the bar art added fill + fx layers — clear them
               too, or the red fill and white ghost chunk float over the
               corpse for the whole death animation (owner report). */
            if (display._hpBarFill && !display._hpBarFill.destroyed) display._hpBarFill.alpha = 0;
            if (display._hpBarFx && !display._hpBarFx.destroyed) display._hpBarFx.clear();
            display._lastHpPct = 1;
            if (display._dynGfx) {
              display._dynGfx.clear();
              display._dynKey = '';
            }
          }
          continue;
        }
        if (isFodder && deathT != null && deathT >= 0 && deathT < SLIME_DEATH_MS && hasSlimeState('death')) {
          activeIds.add(m.id);
          const display = this.monsterDisplays.get(m.id);
          if (display && display._spriteBody) {
            const fc = slimeFrameCount('death');
            const t = deathT / SLIME_DEATH_MS;
            const frameIdx = Math.max(0, Math.min(fc - 1, Math.floor(t * fc)));
            const tex = getSlimeFrame('death', frameIdx, variant); /* v2.3.1534 */
            const sb = display._spriteBody;
            if (tex && (display._slimeState !== 'death' || display._slimeFrame !== frameIdx)) {
              display._slimeState = 'death';
              display._slimeFrame = frameIdx;
              sb.texture = tex;
            }
            sb.scale.x = (96 / 128) * _peakK;
            sb.scale.y = (96 / 128) * _peakK;
            /* v2.3.1824: the splat has its own baseline (row ~108, vs 86 for
               the live blob) — anchoring it on the live number would drop it
               24px through the floor at the moment of death. */
            const _deathAnchor = SLIME_BASE_ROW.death / SLIME_FRAME_PX;
            if (sb.anchor.y !== _deathAnchor) sb.anchor.set(0.5, _deathAnchor);
            sb.y = 0;
            sb.tint = slimeTintFor(variant, 'death'); /* v2.3.1147; v2.3.1534 */
            sb.visible = true;
            display.x = m.x;
            display.y = m.y;
            display.visible = true;
            display._body.visible = false;
            /* Clear HP bar -- see variant death branch for context;
               same problem applies to raw fodder slime kills. */
            if (display._hpHeart && !display._hpHeart.destroyed) display._hpHeart.alpha = 0;
            if (display._hpText && !display._hpText.destroyed) display._hpText.alpha = 0;
            if (display._hpBarFill && !display._hpBarFill.destroyed) display._hpBarFill.alpha = 0;
            if (display._hpBarFx && !display._hpBarFx.destroyed) display._hpBarFx.clear();
            display._lastHpPct = 1;
            /* Clear any leftover dynamic content (aggro arrow, status
               icons) so it doesn't linger on the death frame. */
            if (display._dynGfx) {
              display._dynGfx.clear();
              display._dynKey = '';
            }
          }
        }
        const snowDeathT = m._snowmanDeathStart != null ? now - m._snowmanDeathStart : null;
        const snowFc = snowmanDeathFrameCount();
        if (isSnowman && snowDeathT != null && snowDeathT >= 0 && snowDeathT < SNOWMAN_DEATH_MS && snowFc > 0) {
          activeIds.add(m.id);
          const display = this.monsterDisplays.get(m.id);
          if (display && display._spriteBody) {
            const t = snowDeathT / SNOWMAN_DEATH_MS;
            const frameIdx = Math.max(0, Math.min(snowFc - 1, Math.floor(t * snowFc)));
            const tex = getSnowmanDeathFrame(frameIdx);
            const sb = display._spriteBody;
            if (tex && sb.texture !== tex) sb.texture = tex;
            /* Smaller than the 64-px idle/hit scale — particles
               radiate out to the frame edges, so a smaller render
               keeps the explosion footprint from reading as a hard
               square. */
            const baseScale = 40 / 128;
            sb.scale.x = baseScale;
            sb.scale.y = baseScale;
            sb.y = display._size;
            sb.tint = 0xffffff;
            sb.visible = true;
            display.x = m.x;
            display.y = m.y;
            display.visible = true;
            display._body.visible = false;
            /* Clear HP bar -- same fix as slime / variant death branches. */
            if (display._hpHeart && !display._hpHeart.destroyed) display._hpHeart.alpha = 0;
            if (display._hpText && !display._hpText.destroyed) display._hpText.alpha = 0;
            if (display._hpBarFill && !display._hpBarFill.destroyed) display._hpBarFill.alpha = 0;
            if (display._hpBarFx && !display._hpBarFx.destroyed) display._hpBarFx.clear();
            display._lastHpPct = 1;
            if (display._dynGfx) {
              display._dynGfx.clear();
              display._dynKey = '';
            }
          }
        }
        continue;
      }

      activeIds.add(m.id);

      let display = this.monsterDisplays.get(m.id);
      if (!display) {
        display = createMonsterDisplay(m);
        this.entityLayer.addChild(display);
        /* v2.3.1472: the above-head UI rides its own layer (above the
           gather nodes) — same world space, so mirroring the transform
           below is all it needs. */
        if (display._hpUi) this.monsterUiLayer.addChild(display._hpUi);
        this.monsterDisplays.set(m.id, display);
      }

      /* Guarded writes — every assignment to a Pixi DisplayObject's
         x / y / visible / scale / tint marks the transform matrix
         dirty, which forces the entity-layer's batch geometry
         buffer to rebuild on the next render pass.  At 10 idle
         slimes × 60 fps × 9 redundant writes each, that's ~5400
         dirty-marks per second purely from "writing the same value
         I wrote last frame."  Guarding with `if (current !== target)`
         turns idle slimes into zero-dirty after the first frame.
         Matches the dirty-flag idiom already used for HP / level /
         dynGfx redraws elsewhere in this file. */
      /* Use renderX/renderY (smoothed toward m.x by the MP interp
         loop in BroTown.jsx) when available so server-driven monsters
         glide between ticks instead of teleporting per tick.  SP
         monsters never set renderX, so fall back to m.x. */
      const rx = m.renderX != null ? m.renderX : m.x;
      const ry = m.renderY != null ? m.renderY : m.y;
      if (display.x !== rx) display.x = rx;
      if (display.y !== ry) display.y = ry;
      if (display.visible !== m.alive) display.visible = m.alive;
      /* v2.3.1274: monster size experiment (persists through the death
         animation since the container keeps its scale). */
      if (display.scale.x !== MONSTER_SIZE_MULT) display.scale.set(MONSTER_SIZE_MULT);
      /* v2.3.1472: mirror the transform onto the above-head UI, which
         lives in a sibling layer (same world container, so the values
         carry over 1:1).  Guarded writes for the same batch-rebuild
         reason as the body's. */
      const _ui = display._hpUi;
      if (_ui) {
        if (_ui.x !== rx) _ui.x = rx;
        if (_ui.y !== ry) _ui.y = ry;
        if (_ui.visible !== m.alive) _ui.visible = m.alive;
        if (_ui.scale.x !== MONSTER_SIZE_MULT) _ui.scale.set(MONSTER_SIZE_MULT);
      }

      /* ═══ v2.3.1765: A MONSTER ARRIVES AS A GROWING WHITE SILHOUETTE ═══
       *
       * Owner: "It would be cool to see a 'pre spawned monster' coming back
       * into the game by showing a tiny white silhouette grow and then match
       * the outline of the monster then become the monster."
       *
       * Done as a FILTER over the monster's own display rather than as a shape
       * drawn beside it, because "match the outline of the monster" is the
       * whole request — a hand-drawn blob would be a different animation that
       * happens to be white.  The matrix maps every channel to 1 and leaves
       * alpha alone, so what renders is exactly the sprite's silhouette,
       * whatever pose, variant or recolour it happens to be in.
       *
       * The three beats the owner described map to one 0..1 ramp: scale grows
       * from a dot to full size, the white fades out over the last third, and
       * at t=1 the filter comes off and the monster is simply there.
       *
       * Filters are not free (each filtered object renders to its own target),
       * so this holds for SPAWN_FX_MS and then detaches — and `filters = null`
       * is set once on the finishing frame, not every frame after it. */
      const _spawnFx = () => {
        const at = m._spawnFxAt || 0;
        display._spawnAt = at;   /* published for spawnFxProbe */
        if (!at) return;
        const t = (now - at) / SPAWN_FX_MS;
        if (t >= 1) {
          m._spawnFxAt = 0;
          display._spawnAt = 0;
          if (display.filters) display.filters = null;
          if (display.alpha !== 1) display.alpha = 1;
          if (display._hpUi && !display._hpUi.visible && m.alive) display._hpUi.visible = true;
          return;
        }
        if (!display.filters) display.filters = [SPAWN_WHITE_FILTER];
        /* Ease-out growth: quick off the mark, settling into full size, so it
           reads as arriving rather than as inflating at a constant rate. */
        const e = 1 - Math.pow(1 - t, 2);
        const k = MONSTER_SIZE_MULT * (0.12 + 0.88 * e);
        display.scale.set(k);
        /* The white leaves over the last third — before that it is a
           silhouette, after it the real monster. */
        display.alpha = t < 0.66 ? 0.55 + 0.45 * (t / 0.66) : 1;
        if (t > 0.66 && display.filters) display.filters = null;
        /* No HP bar over something that has not finished arriving. */
        if (display._hpUi && display._hpUi.visible) display._hpUi.visible = false;
      };
      try { _spawnFx(); } catch (e) { /* an FX must never take the frame down */ }

      /* ═══ v2.3.1811: A MONSTER WINDING UP LOADS UP ═══
         Owner: "add monster attack animations or just having you add
         something to them so that way attacks are predictable enough to
         block."
         The server already telegraphs (server/src/telegraph.js) and the
         client already draws the ground marker — but on the FLOOR, at the aim
         point, while the thing a player is watching in a fight is the enemy.
         This puts the same information on the body: a throb that tightens as
         the wind-up runs out, so "it is about to go" is legible without
         looking away from the monster.
         Scale only — no filter.  SPAWN_WHITE_FILTER above shows a filter is
         allowed here, but it is one monster arriving versus potentially every
         monster on screen winding up, and a per-monster filter is a
         per-monster render target.
         Written AFTER _spawnFx and restoring MONSTER_SIZE_MULT on the way
         out, so the two can never fight over display.scale: spawn wins while
         it is arriving, this wins after, and neither leaves it stranded. */
      const _windupFx = () => {
        const until = m._tgUntil || 0;
        if (!until) return;
        if (now >= until) {
          m._tgUntil = 0; m._tgFrom = 0;
          if (display.scale.x !== MONSTER_SIZE_MULT) display.scale.set(MONSTER_SIZE_MULT);
          return;
        }
        const from = m._tgFrom || (until - 800);
        const t = Math.max(0, Math.min(1, (now - from) / Math.max(1, until - from)));
        /* Throb faster and wider as it winds up — the last beat before the
           hit is the loudest, which is the one worth reading. */
        const beat = 0.5 + 0.5 * Math.sin(now / (52 - 26 * t));
        display.scale.set(MONSTER_SIZE_MULT * (1 + (0.05 + 0.09 * t) * beat));
      };
      try { _windupFx(); } catch (e) { /* an FX must never take the frame down */ }
      /* QA probe (mp-windup): a throb cannot be read off one screenshot, so
         the scenario reads the scale the FX actually wrote — and the resting
         multiplier beside it, so "it grew" has a control. */
      try {
        if (!window.__btMonsterScale) {
          window.__btMonsterScale = (mid) => {
            const st = window.__btMonScales && window.__btMonScales[mid];
            return st ? { scale: st, baseMult: MONSTER_SIZE_MULT } : null;
          };
        }
        /* ═══ v2.3.2272: THE WRITES ARE ARMED, THE READERS ARE ALWAYS THERE ═══
           These four stores (two here, __btPeerShield / __btPeerSword below)
           ran in the shipped render loop unconditionally, once per entity per
           frame, and were the cheapest half of the owner's "slows down after
           playing for a while":
             - the maps are keyed by ENTITY ID and never pruned, and monster
               ids are not reused -- spawnscale mints 'sm-<zone>-x<seq>' off a
               counter that never resets, so every grow/trim cycle leaves
               permanent keys behind for the life of the page;
             - each write ALLOCATES a fresh object, ~700 a second at eight
               monsters and four peers on a 60fps phone, all of it garbage;
             - the two peer probes below also run several getChildIndex calls
               per peer per frame -- children.indexOf in Pixi -- purely to fill
               a store no shipped code reads.
           So the writes now need arming and the game never arms them.  The
           ACCESSORS are still defined unconditionally: a probe that vanishes
           would break precheck's qa-handles gate and, worse, would read as
           "the feature is broken" rather than "the probe is off".  The QA
           harness arms it for every scenario in one line (harness.mjs
           newPlayer), so no scenario changed. */
        if (window.__btProbe) {
          if (!window.__btMonScales) window.__btMonScales = Object.create(null);
          window.__btMonScales[m.id] = display.scale.x;
        }
        /* v2.3.2200 QA probe (mp-feel): the universal hit-recoil is a
           BODY-sprite squash + a 120ms tint pulse, neither readable off
           a screenshot — expose the body scale/tint the renderer
           actually wrote, with the hit-window stamps as the control. */
        if (!window.__btMonsterHitReact) {
          window.__btMonsterHitReact = (mid) => {
            const st = window.__btMonHit && window.__btMonHit[mid];
            return st || null;
          };
        }
        if (!window.__btMonHit) window.__btMonHit = Object.create(null);
        if (window.__btProbe && display._spriteBody) {
          window.__btMonHit[m.id] = {
            sx: display._spriteBody.scale.x, sy: display._spriteBody.scale.y,
            tint: display._spriteBody.tint,
            hitStart: m._hitAnimStart || 0, hitEnd: m._hitAnimEnd || 0,
            flash: m._hitFlash || 0,
          };
        }
      } catch (e) {}

      const size = display._size;

      /* Variant render path -- any monster whose archetype maps to a
         MONSTER_VARIANTS entry (e.g. fireGoblin) renders its
         directional walk + hit-recoil strips here.  Variant config
         (liveScalePx, deathMs, etc.) lives in monsterVariants.js;
         sprite-side lives in monsterVariantSprites.js.  Falls back to
         the slime/fodder branch when sheets haven't loaded. */
      /* Gate the variant render branch on the LIVE variantKey rather
         than the cached display._variantKey: when a mummy transforms
         to a skeleton mid-fight (see maybeTransformMonster) the
         monster's archetype changes, so we have to re-resolve the
         sprite set per frame.  display._spriteBody was already created
         at spawn time for any variant, so it's safe to reuse here. */
      if (variantKey && display._spriteBody && variantSprites && variantSprites.walk && variantSprites.walk.has()) {
        const spriteBody = display._spriteBody;
        /* Facing: commit only when two CONSECUTIVE moving observations
           agree on the same sector.  Server-driven monsters tick at
           ~100 ms; the 50 ms lock-out in v2.3.47 was shorter than the
           tick interval, so two consecutive ticks could land in
           different adjacent sectors and both commit -> flicker.  The
           v2.3.44 "must persist 70 ms" debounce also failed because
           it restarted the timer on each new candidate, so genuine
           direction changes felt "insensitive."

           Consecutive-agreement check: store the LAST candidate;
           commit when this frame's candidate equals it.  Two ticks
           in the same direction -> ~200 ms latency on real changes
           but adjacent-sector wobble (alternating candidates) never
           gets two matches in a row, so it can't swap the sprite.
           First-ever observation commits immediately so a fresh
           server-spawned monster doesn't stay 'south' for 200 ms. */
        /* Track deltas on the smoothed render position rather than the
           raw server-tick position.  rx/ry come from m.renderX/renderY
           (interpolated every frame by BroTown.jsx's MP loop) when
           available, so slow server-driven monsters (e.g. mummy at
           0.4 spd) read as moving on every frame between ticks
           instead of alternating moving/idle.  SP monsters update
           m.x every frame so the rx==m.x fallback works there too. */
        const dx = rx - (display._lastX != null ? display._lastX : rx);
        const dy = ry - (display._lastY != null ? display._lastY : ry);
        /* Two movement signals OR'd together:
           1. Frame-local renderX/renderY delta -- works whenever the
              interp loop is actively advancing the smoothed position.
           2. Server-side stamp m._lastPosChangeAt -- set in the WS
              handler whenever the server's rounded position differs
              from our cached x/y.  Slow server-driven variants (mummy
              0.4 spd) only hit dx > 0 on ~1 in 3 render frames (the
              rounded integer x bumps every ~44 ms, interp catches up
              in one frame, then dx=0 until the next bump), which
              caused isIdle to flicker on between bumps.  The server
              stamp gives a fresh-within-300ms continuous "the
              monster is moving" signal even when this frame's
              renderX delta happens to be 0. */
        const POS_FRESH_MS = 300;
        const recentServerMove = m._lastPosChangeAt != null
          && (now - m._lastPosChangeAt) < POS_FRESH_MS;
        const hasFrameDelta = dx * dx + dy * dy > 0.04;
        const moving = hasFrameDelta || recentServerMove;
        let facing = display._lastFacing || 'south';
        if (moving) {
          display._lastMovedAt = now;
        }
        /* Accumulated visual displacement -- drives the walk frame
           index below.  We add the sqrt of every actual rendered
           dx/dy step regardless of whether it crosses the "moving"
           threshold, so even sub-pixel easing increments contribute.
           When the monster truly stops (no rx/ry change at all for
           many frames) the value plateaus and the frame index
           freezes naturally -- no isIdle gate needed. */
        const stepLen = Math.sqrt(dx * dx + dy * dy);
        display._walkDist = (display._walkDist || 0) + stepLen;
        if (stepLen > 0.001) display._lastDistGrowAt = now;
        /* Direction is derived from ACCUMULATED displacement vector
           rather than per-frame dx/dy.  Slow passive wanderers (mummy
           at 0.12 px/tick in idle wander mode = ~5.4 px/sec) have very
           small dy + tiny floating-point + integer-rounding jitter in
           dx, so atan2 on the per-frame delta returns wildly different
           sectors frame-to-frame (a mummy walking north can show east
           or west because atan2(-0.2, 0.001) lands in a wholly
           different sector than atan2(-0.2, -0.001)).

           Reference-point pattern: stash the rx/ry from the last time
           we committed a direction, and only recompute when the
           monster has displaced >= DIR_REF_DIST from that anchor.
           The vector over 2 px of accumulated motion is far more
           stable than the vector over a single sub-pixel frame
           delta, so the direction it implies is reliable.  Anchor
           resets after each recompute so direction stays current as
           the monster turns. */
        if (display._dirRefX == null) {
          display._dirRefX = rx;
          display._dirRefY = ry;
        }
        const ddx = rx - display._dirRefX;
        const ddy = ry - display._dirRefY;
        const ddist2 = ddx * ddx + ddy * ddy;
        const DIR_REF_DIST = 2;
        if (ddist2 >= DIR_REF_DIST * DIR_REF_DIST) {
          const ang = Math.atan2(ddy, ddx);
          const sector = Math.round(ang / (Math.PI / 4));
          const candidate = SECTORS[((sector % 8) + 8) % 8];
          if (!display._lastFacing) {
            /* First committed direction -- snap immediately so the
               sprite isn't stuck on the default 'south'. */
            facing = candidate;
            display._lastFacing = candidate;
            display._facingCommittedAt = now;
          } else if (candidate !== facing) {
            const prevCandidate = display._lastCandidate;
            /* Two consecutive recomputes (each over 2 px of motion)
               must agree on the new sector before we swap, so
               occasional straddle-the-boundary anchors can't flip
               the sprite. */
            if (prevCandidate === candidate) {
              facing = candidate;
              display._lastFacing = candidate;
              display._facingCommittedAt = now;
            }
          }
          display._lastCandidate = candidate;
          display._dirRefX = rx;
          display._dirRefY = ry;
        }
        /* Idle pose -- when the monster's visual position has not
           changed for IDLE_AFTER_MS, freeze on a static frame.  We
           track "_walkDist last grew" instead of "moved this frame"
           because the rx-delta moving signal is too noisy for slow
           server-driven variants (1-px catch-ups every ~55 ms with
           dx=0 between bumps).  As long as renderX is creeping along,
           _lastDistGrowAt keeps refreshing and the walk loop plays.
           When the monster truly stops, _walkDist plateaus, the
           refresh stalls, and after IDLE_AFTER_MS the idle pose
           kicks in. */
        const IDLE_AFTER_MS = 600;
        const isIdle = (now - (display._lastDistGrowAt || 0)) > IDLE_AFTER_MS;

        /* Priority chain: transform > hit recoil > attack wind-up >
           idle pose > walk loop.  The transform branch plays a
           variant's one-shot transition strip (mummy -> skeleton
           bandage shred) for transformHoldMs ms after the trigger,
           sourcing frames from the FROM archetype's variantSprites
           (the skeleton variant inherits the play-out from mummy).
           Variants opt into the attack-strip branch by setting
           variantSprites.attack (fireGoblin uses its 5-direction
           sheet, triggered by the fodder-like _shootAnim window in
           BroTown).  The wind-up sheet plays once across the
           telegraph window, mapped to the frame index by elapsed-
           fraction so the swing reads at any telegraph duration. */
        const transformElapsed = m._transformStart ? (now - m._transformStart) : -1;
        const transformHold = m._transformHoldMs || 0;
        const transformingNow = transformElapsed >= 0 && transformElapsed < transformHold;
        let transformSprites = null;
        if (transformingNow && m._transformFromArch) {
          const fromVariantSprites = variantSpritesFor(m._transformFromArch);
          if (fromVariantSprites && fromVariantSprites.transform && fromVariantSprites.transform.has()) {
            transformSprites = fromVariantSprites.transform;
          }
        }
        const hitSprites = variantSprites.hit;
        const attackSprites = variantSprites.attack;
        const hitNow = !transformingNow && m._hitAnimEnd && now < m._hitAnimEnd && hitSprites && hitSprites.has();
        const attackNow = !transformingNow && !hitNow && m._shootAnimEnd && now < m._shootAnimEnd
          && attackSprites && attackSprites.has();
        let frame;
        if (transformingNow && transformSprites) {
          /* Non-directional one-shot.  Map elapsed to frame index
             at the variant's transformFrameMs rate; clamp to last so
             the final pose holds until the swap to the new
             archetype's walk loop. */
          const fromVariant = MONSTER_VARIANTS[m._transformFromArch];
          const stepMs = (fromVariant && fromVariant.transformFrameMs) || 60;
          const tfc = transformSprites.count();
          const tIdx = tfc > 0 ? Math.max(0, Math.min(tfc - 1, Math.floor(transformElapsed / stepMs))) : 0;
          const tex = transformSprites.get(tIdx);
          frame = tex ? { tex, mirror: false } : null;
        } else if (hitNow) {
          const hfc = hitSprites.count(facing);
          const dur = Math.max(1, m._hitAnimEnd - m._hitAnimStart);
          const t = (now - m._hitAnimStart) / dur;
          const hIdx = hfc > 0 ? Math.max(0, Math.min(hfc - 1, Math.floor(t * hfc))) : 0;
          frame = hitSprites.get(facing, hIdx);
        } else if (attackNow) {
          /* Fixed-rate playback then hold the last frame -- decouples the
             swing speed from the telegraph window so the strike reads
             quickly even when the telegraph is long.  Strip duration =
             frameCount * attackFrameMs; once elapsed exceeds that the
             clamp pins us to the final pose until _shootAnimEnd. */
          const afc = attackSprites.count(facing);
          const stepMs = variant.attackFrameMs || 70;
          const elapsed = now - m._shootAnimStart;
          const aIdx = afc > 0 ? Math.max(0, Math.min(afc - 1, Math.floor(elapsed / stepMs))) : 0;
          frame = attackSprites.get(facing, aIdx);
        } else if (isIdle) {
          /* Hold a single frame -- we don't ship a dedicated idle
             sheet so use the closest-to-neutral walk frame.  Frame
             0 is the first contact pose, which reads as standing
             still better than mid-stride frames. */
          frame = variantSprites.walk.get(facing, 0);
        } else {
          /* Walk loop frame index is driven by ACCUMULATED VISUAL
             displacement rather than wall-clock time.  This guarantees
             the animation only advances when the sprite is actually
             moving on-screen, regardless of how fast or how slowly --
             slow mummies cycle slowly, fast skeletons cycle quickly,
             stopped monsters freeze.  variant.walkDistPerFrame
             controls the px-of-displacement per frame increment
             (default 1.5 -- tuned so a fodder-speed monster cycles
             every ~0.8 s at its natural pace). */
          const fc = variantSprites.walk.count(facing);
          const DIST_PER_FRAME = variant.walkDistPerFrame || 1.5;
          const phaseOff = ((m.spawnX || 0) | 0) % (fc * 100);
          const frameIdx = fc > 0
            ? Math.floor(((display._walkDist || 0) + phaseOff) / DIST_PER_FRAME) % fc
            : 0;
          frame = variantSprites.walk.get(facing, frameIdx);
        }
        if (frame && frame.tex) {
          if (spriteBody.texture !== frame.tex) spriteBody.texture = frame.tex;
          /* Squash is suppressed when the dedicated hit sheet is playing
             (sheet already shows recoil).  Kept as a fallback for the
             moment between damage application and sheet load. */
          let sqx = 1, sqy = 1;
          const hittingNow = m._hitAnimEnd && now < m._hitAnimEnd;
          if (hittingNow && !hitNow) {
            const hp = (now - m._hitAnimStart) / Math.max(1, m._hitAnimEnd - m._hitAnimStart);
            if (hp < 0.4) { const k = hp / 0.4; sqx = 1 + 0.35 * k; sqy = 1 - 0.30 * k; }
            else { const k = (hp - 0.4) / 0.6; sqx = 1.35 - 0.35 * k; sqy = 0.70 + 0.30 * k; }
          }
          /* Per-direction scaleMult (set by the variant's lookup map,
             e.g. mummy E + SW at 0.9 to even out perceived silhouette
             vs the other 6 facings).  Defaults to 1 when unset. */
          const dirScale = (frame.scaleMult != null) ? frame.scaleMult : 1;
          const baseScale = (variant.liveScalePx || 64) / 256 * dirScale;
          const sx = baseScale * sqx * (frame.mirror ? -1 : 1);
          const sy = baseScale * sqy;
          if (spriteBody.scale.x !== sx) spriteBody.scale.x = sx;
          if (spriteBody.scale.y !== sy) spriteBody.scale.y = sy;
          if (spriteBody.y !== size) spriteBody.y = size;
          /* v2.3.1147: per-variant tint (reskins recolor shared sheets).
             v2.3.2200: hit-flash finally RENDERS — gameEvents has stamped
             m._hitFlash on every monster_hit since v2.3.248 and nothing
             ever read it.  A 120ms red pulse (the player/peer flash
             convention), restored automatically because the tint is
             recomputed from the variant every frame.  No filters
             (per-monster filter = per-monster render target). */
          const _hfV = m._hitFlash && (now - m._hitFlash) < 120;
          const wantTintV = _hfV ? 0xff8080 : ((variant && variant.tint) || 0xffffff);
          if (spriteBody.tint !== wantTintV) spriteBody.tint = wantTintV;
          if (!spriteBody.visible) spriteBody.visible = true;
          if (display._body.visible) display._body.visible = false;
        } else {
          if (spriteBody.visible) spriteBody.visible = false;
          if (!display._body.visible) display._body.visible = true;
        }
        display._lastX = rx;
        display._lastY = ry;
      } else if (display._isFodder && display._spriteBody) {
        const spriteBody = display._spriteBody;
        const hittingNow = m._hitAnimEnd && now < m._hitAnimEnd && hasSlimeState('hit');
        const shootingNow = m._shootAnimEnd && now < m._shootAnimEnd && hasSlimeState('shoot');
        const idleAvail = hasSlimeState('idle');
        const state = hittingNow ? 'hit' : shootingNow ? 'shoot' : (idleAvail ? 'idle' : null);
        if (state) {
          let frameIdx;
          const fc = slimeFrameCount(state);
          if (state === 'hit') {
            const dur = Math.max(1, m._hitAnimEnd - m._hitAnimStart);
            const t = (now - m._hitAnimStart) / dur;
            frameIdx = Math.max(0, Math.min(fc - 1, Math.floor(t * fc)));
          } else if (state === 'shoot') {
            const dur = Math.max(1, m._shootAnimEnd - m._shootAnimStart);
            const t = (now - m._shootAnimStart) / dur;
            frameIdx = Math.max(0, Math.min(fc - 1, Math.floor(t * fc)));
          } else {
            /* Idle loop — per-monster phase offset so a group doesn't
               pulse in lockstep.  120 ms/frame matches Canvas 2D. */
            const phaseOff = ((m.spawnX || 0) | 0) % 600;
            frameIdx = Math.floor((now + phaseOff) / 120) % fc;
          }
          /* Always look up + reassign texture — see player sprite
             notes; the cache-only-on-change pattern lost sprites
             after zone change. */
          const tex = getSlimeFrame(state, frameIdx, variant); /* v2.3.1534 */
          if (tex && spriteBody.texture !== tex) {
            spriteBody.texture = tex;
          }
          display._slimeState = state;
          display._slimeFrame = frameIdx;
          /* Hit reaction squash — quick stretch + flatten on top of
             the sheet swap.  Peaks at 40% into the window then eases
             back to neutral, matching Canvas 2D's _hitSquashX/Y. */
          let sqx = 1, sqy = 1;
          if (hittingNow) {
            const hp = (now - m._hitAnimStart) / Math.max(1, m._hitAnimEnd - m._hitAnimStart);
            if (hp < 0.4) { const k = hp / 0.4; sqx = 1 + 0.35 * k; sqy = 1 - 0.30 * k; }
            else { const k = (hp - 0.4) / 0.6; sqx = 1.35 - 0.35 * k; sqy = 0.70 + 0.30 * k; }
          }
          /* Render the sprite at 96 px tall, anchored bottom-center
             so feet sit on the ground.  Sprite frames are 128 px so
             base scale = 96/128.  Briefly dropped to 64 in v2.1.54
             while chasing a perf issue we thought was sprite fillrate;
             v2.1.56 found the real cause (debugBus WS capture) and
             restored 96.  The slime body only fills ~half of the
             128-px frame, so 96 reads at roughly player-sprite scale. */
          const baseScale = 96 / 128;
          const sx = baseScale * sqx;
          const sy = baseScale * sqy;
          if (spriteBody.scale.x !== sx) spriteBody.scale.x = sx;
          if (spriteBody.scale.y !== sy) spriteBody.scale.y = sy;
          /* v2.3.1824: anchor on the row the BLOB rests on, not the empty
             bottom of the cell — see SLIME_BASE_ROW.  y=0 then puts that row
             on the monster's own position, which is what makes the loot pile,
             the hit tests and the tap circle line up with the slime you can
             actually see.  Set per state because the three live sheets share
             a baseline and the death sheet does not.
             Bonus: the hit squash now pivots on the blob's base, so a
             squashed slime stays planted instead of sliding. */
          const _slimeAnchor = (SLIME_BASE_ROW[state] || SLIME_BASE_ROW.idle) / SLIME_FRAME_PX;
          if (spriteBody.anchor.y !== _slimeAnchor) spriteBody.anchor.set(0.5, _slimeAnchor);
          if (spriteBody.y !== 0) spriteBody.y = 0;
          /* v2.3.1147: tinted slime reskins (mossSlime/mireWisp).
             v2.3.1534: a recoloured variant reports white here — see
             slimeTintFor. */
          const _hfS = m._hitFlash && (now - m._hitFlash) < 120; /* v2.3.2200: see variant branch */
          const wantTintS = _hfS ? 0xff8080 : slimeTintFor(variant, state);
          if (spriteBody.tint !== wantTintS) spriteBody.tint = wantTintS;
          if (!spriteBody.visible) spriteBody.visible = true;
          if (display._body.visible) display._body.visible = false;
        } else {
          if (spriteBody.visible) spriteBody.visible = false;
          if (!display._body.visible) display._body.visible = true;
        }
      }

      /* Snowman sprite — 8-direction animated idle loop.  Facing is
         derived from per-frame velocity (last delta x/y), falling back
         to "south" when standing still.  W / NW / SE reuse the
         opposite-source texture with scale.x negated.  Frames advance
         at 250 ms/frame with a per-spawn phase offset so a group
         doesn't pulse in lockstep. */
      if (display._isSnowman && display._spriteBody) {
        const spriteBody = display._spriteBody;
        if (hasSnowmanFrames()) {
          const dx = m.x - (display._lastX != null ? display._lastX : m.x);
          const dy = m.y - (display._lastY != null ? display._lastY : m.y);
          const moving = dx * dx + dy * dy > 0.04;
          let facing = display._lastFacing || 'south';
          /* Same 2-consecutive-tick agreement filter as the variant
             render branch (v2.3.53).  Server-driven snowman ticks at
             ~100 ms; without this the adjacent-sector boundary wobble
             swapped the sprite every tick on diagonal motion. */
          if (moving) {
            const ang = Math.atan2(dy, dx);
            const sector = Math.round(ang / (Math.PI / 4));
            const candidate = SECTORS[((sector % 8) + 8) % 8];
            if (candidate !== facing) {
              const prevCandidate = display._lastCandidate;
              if (!display._lastFacing) {
                facing = candidate;
                display._lastFacing = candidate;
              } else if (prevCandidate === candidate) {
                facing = candidate;
                display._lastFacing = candidate;
              }
            }
            display._lastCandidate = candidate;
          }
          /* Hit reaction takes priority over idle when within the
             _hitAnim window.  Non-directional sheet — same recoil
             texture regardless of facing — but we still keep the
             facing-derived mirror so the snowman's "front" stays
             oriented correctly. */
          const hitFc = snowmanHitFrameCount();
          const inHitWindow = m._hitAnimEnd && now < m._hitAnimEnd && hitFc > 0;
          /* v2.3.2215: the snowball-throw wind-up.  Priority sits BELOW the
             hit reaction (being struck interrupts the throw, which is what
             the recoil is for) and above idle.  getSnowmanAttackFrame clamps
             rather than looping — a throw that restarted mid-wind-up would
             read as a stutter.

             v2.3.2216: SPLIT AT THE RELEASE FRAME, don't scale the strip.
             The old code spread all 8 frames evenly across the wind-up, so
             the drawn ball left his hand at 62.5% of the tell (~219ms of
             350) while the server's real projectile did not exist until
             100%.  The ball then vanished for the two empty follow-through
             frames and reappeared as a projectile ~130ms later — the
             disconnect the owner reported on 2026-09-01.

             Now the ANTICIPATION frames (0..release) fill the wind-up
             exactly, so the release pose lands on the same instant the
             server creates the projectile, and the follow-through frames
             play AFTER it at the same cadence.  The follow-through fits
             inside the server's post-throw freeze (_attackingUntil is
             ms + 300), so he holds still through it instead of sliding. */
          /* ═══ v2.3.2221: THE BURROW OWNS THE BODY ═══
             Above the attack strip, the hit reaction and idle: while he is a
             mound of snow there is no body to recoil, no arm to throw with
             and no idle to breathe.  Self-clearing on expiry -- the server
             sends no "done" event and a tick delta cannot express a REMOVED
             field, so a client that misses the last transition has to be able
             to recover rather than hold the mound forever. */
          if (m._burPhase && now > (m._burUntil || 0) + 500) {
            m._burPhase = null; m._invulnerable = false;
          }
          const burFc = m._burPhase ? snowmanPhaseFrameCount(
            m._burPhase === 'dig' ? 'burrow' : m._burPhase) : 0;
          let burTex = null;
          if (m._burPhase && burFc > 0) {
            const _sheet = m._burPhase === 'dig' ? 'burrow' : m._burPhase;
            const _span = Math.max(1, (m._burUntil || 0) - (m._burFrom || 0));
            /* The PILE loops -- it is a travelling shape that lasts until he
               reaches you.  Dig and emerge are one-shots played once across
               their own window and held on the final pose. */
            const _looping = m._burPhase === 'pile';
            const _idx = _looping
              ? Math.floor((now - (m._burFrom || now)) / 90)
              : Math.floor(((now - (m._burFrom || now)) / _span) * burFc);
            burTex = getSnowmanPhaseFrame(_sheet, _idx, _looping);
          }
          const atkFc = snowmanAttackFrameCount(facing);
          const atkRel = snowmanAttackReleaseFrame(facing);
          /* v2.3.2217: publish the throwing hand for THIS facing so the
             projectile can be launched from it (gameEvents reads these two
             numbers on monster_projectile).  Stamped on the monster rather
             than resolved there because facing is renderer-derived state —
             it comes from movement history, not the wire. */
          const _mz = snowmanThrowMuzzle(facing);
          m._muzzleX = _mz.dx; m._muzzleY = _mz.dy;
          const adur = Math.max(1, (m._shootAnimEnd || 0) - (m._shootAnimStart || 0));
          /* One frame's worth of the wind-up.  The ANTICIPATION frames are
             0..atkRel-1 (atkRel of them) — frame atkRel is the release
             itself, so it must START at adur, not end there.  Dividing by
             atkRel (not atkRel + 1) is what puts the drawn ball leaving his
             hand on the exact tick the server creates the projectile. */
          const atkPerF = adur / Math.max(1, atkRel);
          /* v2.3.2217: THE RELEASE IS DRIVEN BY THE BALL, NOT BY A CLOCK.
             v2.3.2216 timed the release to the wind-up's own end, which is
             the right instant in theory but races it in practice: the server
             resolves on a tick boundary and the event crosses the wire, so
             the ball landed a beat after the arm had already thrown — the
             "tiny subtle lag" the owner reported.  Now the anticipation
             frames hold on the cocked pose until monster_projectile actually
             arrives, which cannot drift because it IS the ball appearing.
             The wait is normally a frame or two and reads as weight. */
          const relAt = (m._throwReleaseAt && m._throwReleaseAt >= m._shootAnimStart)
            ? m._throwReleaseAt
            : (now >= m._shootAnimEnd + THROW_RELEASE_GRACE_MS
                ? m._shootAnimEnd + THROW_RELEASE_GRACE_MS
                : 0);
          /* Frames after the release one: the release frame itself is SKIPPED
             (see below), so the follow-through is everything past it. */
          const followFrames = Math.max(0, atkFc - atkRel - 1);
          /* v2.3.2216: never play the THROW strip for a melee poke (see the
             _shootAnimKind stamp in gameEvents).  Compared against 'swing'
             rather than equality with 'throw' so an unstamped write — the
             client-local AI's shoot path — still animates as it always
             did. */
          const inAtkWindow = !inHitWindow && m._shootAnimEnd
            && m._shootAnimKind !== 'swing' && atkFc > 0
            && (!relAt || now < relAt + followFrames * atkPerF);
          let frameTex = null;
          let mirror = false;
          if (burTex) {
            /* Top priority, and NOT an early `continue`: everything after
               this chain -- the HP bar above his head most of all -- still
               has to run.  A mound of snow with no health bar would hide the
               state of the fight at exactly the moment the player is deciding
               whether to chase him or back off. */
            frameTex = burTex;
            mirror = false;   /* the mound has no facing worth reading */
          } else if (inAtkWindow) {
            let aIdx;
            if (!relAt) {
              /* Winding up — or holding the cocked pose while the ball is in
                 flight to us across the wire. */
              aIdx = Math.max(0, Math.min(atkRel - 1,
                Math.floor((now - m._shootAnimStart) / atkPerF)));
            } else {
              /* Straight to the follow-through, SKIPPING the release frame:
                 that frame's whole content is a drawn ball in mid-air, and
                 the engine now draws the real one at his hand on this very
                 tick.  Playing it would put two snowballs on screen at
                 slightly different places. */
              aIdx = atkRel + 1 + Math.floor((now - relAt) / atkPerF);
            }
            const aFrame = getSnowmanAttackFrame(facing, aIdx);
            if (aFrame) { frameTex = aFrame.tex; mirror = aFrame.mirror; }
          } else if (inHitWindow) {
            const dur = Math.max(1, m._hitAnimEnd - m._hitAnimStart);
            const t = (now - m._hitAnimStart) / dur;
            const idx = Math.max(0, Math.min(hitFc - 1, Math.floor(t * hitFc)));
            frameTex = getSnowmanHitFrame(idx);
            /* Mirror to face the same way as idle would. */
            const idleMap = getSnowmanFrame(facing, 0);
            mirror = idleMap ? idleMap.mirror : false;
          } else {
            const fc = snowmanFrameCount(facing);
            const phaseOff = ((m.spawnX || 0) | 0) % 1000;
            /* 125 ms/frame = ~2x the natural 250 ms cadence; the source
               mp4s play their idle loop too slowly at the original speed. */
            const frameIdx = fc > 0 ? Math.floor((now + phaseOff) / 125) % fc : 0;
            const idleFrame = getSnowmanFrame(facing, frameIdx);
            if (idleFrame) {
              frameTex = idleFrame.tex;
              mirror = idleFrame.mirror;
            }
          }
          if (frameTex) {
            if (spriteBody.texture !== frameTex) spriteBody.texture = frameTex;
            const baseScale = 64 / 128;
            const sx = baseScale * (mirror ? -1 : 1);
            if (spriteBody.scale.x !== sx) spriteBody.scale.x = sx;
            if (spriteBody.scale.y !== baseScale) spriteBody.scale.y = baseScale;
            if (spriteBody.y !== size) spriteBody.y = size;
            const _hfN = m._hitFlash && (now - m._hitFlash) < 120; /* v2.3.2200: see variant branch */
            const wantTintN = _hfN ? 0xff8080 : 0xffffff;
            if (spriteBody.tint !== wantTintN) spriteBody.tint = wantTintN;
            if (!spriteBody.visible) spriteBody.visible = true;
            if (display._body.visible) display._body.visible = false;
          } else {
            if (spriteBody.visible) spriteBody.visible = false;
            if (!display._body.visible) display._body.visible = true;
          }
        } else {
          spriteBody.visible = false;
          display._body.visible = true;
        }
        display._lastX = m.x;
        display._lastY = m.y;
      }

      // Emoji — once per monster.  Hidden when the slime sprite is
      // rendering so the actual slime art isn't covered by a floating
      // green-circle emoji.
      /* ═══ v2.3.2224: THE SLIME SWELLS ═══
         Applied HERE, after every sprite branch has set its own scale and
         before anything reads the display, so it works for whichever branch
         drew this monster rather than being pasted into three of them.

         Multiplied into the scale rather than set on the container: scaling
         the container would blow up the shadow and the health bar with it,
         and a health bar three times the size floating over a slime reads as
         a rendering fault, not a mechanic. */
      if (m._burstUntil && display._spriteBody) {
        const _bsSpan = Math.max(1, m._burstUntil - (m._burstFrom || m._burstUntil));
        const _bsT = Math.max(0, Math.min(1, (now - (m._burstFrom || now)) / _bsSpan));
        /* Eased so it lurches at the end rather than creeping linearly --
           the last moment is the one you have to react to. */
        const _bsK = 1 + ((m._burstScale || 3.5) - 1) * (_bsT * _bsT);
        display._spriteBody.scale.x *= _bsK;
        display._spriteBody.scale.y *= _bsK;
      }
      if (!display._emoji) {
        const emojiText = new Text({
          text: m.emoji || '🟢',
          style: { fontSize: Math.max(8, size), align: 'center' },
        });
        emojiText.anchor.set(0.5, 0.5);
        display.addChild(emojiText);
        display._emoji = emojiText;
      }
      if (display._spriteBody && display._spriteBody.visible) {
        display._emoji.visible = false;
      } else if (!display._emoji.visible) {
        display._emoji.visible = true;
      }

      /* Above-head HP: black-tinted heart icon with the current HP
         number centered on it.  Visible only when the monster has
         taken damage (curHp < maxHp); hidden at full HP.
         Position has to clear the actual sprite top (not the procedural
         circle's size) for slime / snowman / variant monsters — their
         sprites render 64-96 px tall while display._size stays at 8,
         so a naive y=-size-18 lands behind the sprite. */
      const curHp = m.curHp != null ? m.curHp : m.hp;
      const maxHpDenom = m.maxHp || m.hp || 1;
      const hpPct = Math.max(0, Math.min(1, curHp / maxHpDenom));
      _ensureHudBarTextures();
      /* v2.3.1273: the black heart becomes the owner's BAR art — the
         existing _hpHeart sprite is reused as the FRAME layer (tint
         reset from the heart's 0x000000), a display-owned cropped fill
         sprite shows curHp smoothly, and a small Graphics carries the
         white damage flash + the lagging ghost trail (same v2.3.458
         drain constants as the player widget). */
      const heartTex = _hudBarTex.barFrame;
      if (heartTex && display._hpHeart.texture !== heartTex) {
        display._hpHeart.texture = heartTex;
        display._hpHeart.tint = 0xffffff;
        /* fill + fx layers insert UNDER the hp number text.
           v2.3.1472: into the _hpUi container, which is where the bar
           and the number now live (above the gather-node layer). */
        const _ui = display._hpUi || display;
        const txtIdx = _ui.getChildIndex(display._hpText);
        const fill = new Sprite();
        fill.anchor.set(0, 0.5);
        _ui.addChildAt(fill, txtIdx);
        display._hpBarFill = fill;
        const fx = new Graphics();
        _ui.addChildAt(fx, txtIdx + 1);
        display._hpBarFx = fx;
      }
      if (heartTex && heartTex.width > 0) {
        const spriteVisible = display._spriteBody && display._spriteBody.visible;
        let visualTopY;
        if (display._variantKey && spriteVisible) {
          const variantCfg = MONSTER_VARIANTS[display._variantKey];
          visualTopY = display._size - ((variantCfg && variantCfg.liveScalePx) || 64);
        } else if (display._isSnowman && spriteVisible) {
          visualTopY = display._size - 64;
        } else if (display._isFodder && spriteVisible) {
          /* v2.3.1824: the sprite is anchored on the blob's base row now, so
             the frame top is that many scaled rows above the origin rather
             than `size - 96`.  Deliberately the FRAME top and not the blob
             top: it works out to the same clearance the bar had before this
             change (~22 local px over the blob's highest bounce), and the
             damage-number-over-the-HP-bar overlap has been reported three
             times (v2.3.1402/1403/1638) — this fix has no business moving
             that gap as a side effect. */
          visualTopY = -(SLIME_BASE_ROW.idle * (96 / SLIME_FRAME_PX));
        } else {
          visualTopY = -size;
        }
        /* Minimum headroom over the body.  This used to be derived from the
           level text's band (it sat at y=-size-12 with anchor (0.5,1), so
           it occupied y=[-size-22, -size-12]) and the bar hugged whichever
           was higher.  v2.3.1918 moved the level onto the plate under the
           monster, but the NUMBER stays exactly as it was: for the small
           procedural archetypes visualTopY is only -size, and letting the
           bar drop those 22 px onto the body would be a silent regression
           of the damage-number overlap reported three times
           (v2.3.1402/1403/1638). */
        const minHeadroomY = -size - 22;
        const topY = Math.min(visualTopY, minHeadroomY);
        const barY = topY - 2 - MONSTER_HPBAR_H / 2;
        /* v2.3.2295: the top of the whole above-head band -- the HP bar's own
           upper edge -- stashed for anything that has to sit ABOVE the monster
           rather than on it. Everything in this block already knows where the
           sprite really ends (the variant / snowman / fodder cases above);
           anything drawn from outside it was guessing, which is how the aggro
           dot came to sit at `-size - 20` -- 28 local px, i.e. halfway up a
           96px slime rather than over its head. Stashed rather than
           recomputed, because a second copy of this per-archetype maths is
           exactly the drift v2.3.1535 records.
           _hpUi carries the same x/y/scale as this container (mirrored every
           frame in _updateMonsters), so a value local to one is local to the
           other. */
        display._markTopY = barY - MONSTER_HPBAR_H / 2;
        /* v2.3.1338: stamp the bar-top anchor on the game monster so
           combat popups spawn ABOVE the health bar (owner: damage
           numbers rise from over the bar, not over the sprite body).
           Local offset from the monster origin — the sprite-top math
           above (variants/snowman/fodder) already lives here, so this
           is the one place that knows where the bar actually is.
           Consumed by combatHelpers.monsterPopupY().
           v2.3.1340 (owner screenshot): the popup Text is anchored
           (0.5, 0.5) — dmg.y is the glyph CENTER, not its bottom — and
           spawns with a 1.6x pop at 21px font (27 crit), so a 6px gap
           left the glyph's lower half sitting ON the bar.  Clear the
           bar by the popped half-height (~21px) plus a small gap. */
        /* v2.3.1402 (owner: "damage numbers are still over monster HP bars"):
           24 -> 40.  v2.3.1403 (owner, still overlapping on the tall snowman
           bar): 40 -> 62 — clears even the tallest monster's bar + the 1.6x
           spawn pop.
           v2.3.1638 — THE BUMPS WERE NEVER THE FIX.  Third owner report of
           the same overlap.  `barY` is LOCAL to _hpUi, and _hpUi is scaled
           by MONSTER_SIZE_MULT (1.5) every frame at line ~3668 — but
           combatHelpers.monsterPopupY() adds this stamp straight onto the
           WORLD y (the popup Text is a child of the unscaled damageNumbers
           layer).  Handing a local value to a world consumer meant half the
           intended clearance was eaten by the 0.5x scale gap, and the amount
           eaten GREW with the monster's bar height:
               real clearance = 0.5 * barTopLocal + 62
           which is 10.5px on a fodder slime (bar sits highest,
           visualTopY = size - 96) but 39.5px on a procedural monster.  ONE
           constant producing FOUR different clearances is the signature of
           two scale spaces.  The slime is the game's most common monster and
           its 10.5px is smaller than the popup's own popped half-height
           (16.8px normal, 21.6px crit), so the glyph rendered straight
           through the centred HP number — every hit, which is exactly what
           the owner keeps seeing.  Each bump helped the tall-bar archetypes
           and never reached the slime.
           Stamp in WORLD space instead, reading the scale off the container
           so the two can never drift apart again.  62 must come DOWN to 34 in
           the same move: it was compensating for the missing 1.5x, and left
           as-is would fling popups ~50px too high on slimes. */
        const _uiScale = (display._hpUi && display._hpUi.scale && display._hpUi.scale.y) || MONSTER_SIZE_MULT;
        m._popupTopOff = (barY - MONSTER_HPBAR_H / 2) * _uiScale - POPUP_BAR_CLEAR;
        display._hpHeart.width = MONSTER_HPBAR_W;
        display._hpHeart.height = MONSTER_HPBAR_H;
        display._hpHeart.x = 0;  /* anchor already centered at creation */
        display._hpHeart.y = barY;
        /* fill — cropped view of the full-bar art. */
        const fill = display._hpBarFill;
        const fillTex = _hpFillTexFor(display, hpPct);
        if (fill && fillTex) {
          if (fill.texture !== fillTex) fill.texture = fillTex;
          fill.width = Math.max(1, MONSTER_HPBAR_W * hpPct);
          fill.height = MONSTER_HPBAR_H;
          fill.x = -MONSTER_HPBAR_W / 2;
          fill.y = barY;
        }
        /* ghost trail + white damage flash (v2.3.458 constants). */
        if (display._mGhost == null) display._mGhost = hpPct;
        const tookDmg = (display._mLastFrac != null) && (hpPct < display._mLastFrac - 0.0005);
        if (tookDmg) {
          display._mGhostDrainAt = now + HP_GHOST_HOLD_MS;
          display._mFlashUntil = now + HPBAR_FLASH_MS;
        }
        if (hpPct >= display._mGhost) display._mGhost = hpPct;
        else if (now >= (display._mGhostDrainAt || 0)) {
          display._mGhost = Math.max(hpPct, display._mGhost - HP_GHOST_DRAIN_M);
        }
        display._mLastFrac = hpPct;
        const fx = display._hpBarFx;
        if (fx) {
          fx.clear();
          const inL = -MONSTER_HPBAR_W / 2 + MONSTER_HPBAR_W * HPBAR_IN_X;
          const inW = MONSTER_HPBAR_W * HPBAR_IN_W;
          const inT = barY - MONSTER_HPBAR_H / 2 + MONSTER_HPBAR_H * HPBAR_IN_Y;
          const inH = MONSTER_HPBAR_H * HPBAR_IN_H;
          if (display._mGhost > hpPct + 0.001) {
            fx.rect(inL + inW * hpPct, inT, inW * (display._mGhost - hpPct), inH);
            fx.fill({ color: HP_GHOST_WHITE, alpha: 0.92 });
          }
          const fl = (display._mFlashUntil || 0) - now;
          if (fl > 0 && hpPct > 0) {
            fx.rect(inL, inT, inW * hpPct, inH);
            fx.fill({ color: 0xffffff, alpha: 0.85 * (fl / HPBAR_FLASH_MS) });
          }
        }
        display._hpText.x = 0;
        display._hpText.y = barY;
      }
      if (hpPct >= 0.999) {
        display._hpHeart.alpha = 0;
        display._hpText.alpha = 0;
        if (display._hpBarFill) display._hpBarFill.alpha = 0;
        if (display._hpBarFx) { display._hpBarFx.clear(); display._hpBarFx.alpha = 0; }
      } else {
        display._hpHeart.alpha = 1;
        display._hpText.alpha = 1;
        if (display._hpBarFill) display._hpBarFill.alpha = 1;
        if (display._hpBarFx) display._hpBarFx.alpha = 1;
        const hpStr = String(Math.max(0, Math.ceil(curHp)));
        if (display._hpText.text !== hpStr) display._hpText.text = hpStr;
      }
      display._lastHpPct = hpPct;

      /* v2.3.1918: the name plate, replacing the "Lv3" tag that used to sit
         on top of the monster.  Driven through _updateNamePill, the same
         function the player's and every peer's plate goes through, so its
         _pillKey cache does the work: the rounded-rect is rebuilt only when
         the text changes, which for a monster is never after the first
         frame.
         v2.3.1144's DANGER TINT is carried over rather than dropped — red
         when the monster is 5+ combat levels above you is the one warning a
         player gets before engaging, and zones were unpinned with no entry
         gating on the owner's call that death is the teacher.  It moves from
         the whole level string to the plate's LV line, which is where the
         level now lives. */
      /* v2.3.1918: QA probe (tools/qa/mp/mp-monsterplate.mjs).  Reports what
         is ACTUALLY attached and where, because "the Text node is gone from
         the factory" and "the label is gone from the screen" are different
         claims, and a plate parented to the wrong container would satisfy
         the first while failing the second. */
      if (typeof window !== 'undefined') {
        const _pl = window.__btMonsterPlates || (window.__btMonsterPlates = { frame: 0, plates: [] });
        if (_pl.frame !== now) { _pl.frame = now; _pl.plates = []; }
        const _pui = display._hpUi;
        const _pillNode = _pui && _pui._namePill;
        _pl.plates.push({
          id: m.id,
          arch: m.archetype || m.type,
          hasPill: !!_pillNode,
          visible: !!(_pillNode && _pillNode.visible),
          name: _pui && _pui._pillName ? _pui._pillName.text : null,
          level: _pui && _pui._pillLevel ? _pui._pillLevel.text : null,
          levelFill: _pui && _pui._pillLevel ? String(_pui._pillLevel.style.fill) : null,
          /* v2.3.2154: the rasterised sizes, so "a bit larger font" is a
             measurement rather than a diff review. Read-only, like every other
             field on this probe. */
          nameSize: _pui && _pui._pillName ? Number(_pui._pillName.style.fontSize) : null,
          lvlSize: _pui && _pui._pillLevel ? Number(_pui._pillLevel.style.fontSize) : null,
          y: _pillNode ? _pillNode.y : null,
          /* v2.3.2295: is this plate in its attacking-you state, and does the
             notice cue think this monster just spotted you. Both read off the
             renderer rather than off game state, so what the scenario asserts
             is what was drawn. */
          alarm: !!(_pui && _pui._pillAlarm),
          /* The cache key the plate was last REBUILT under. _pillAlarm alone
             says what the renderer intended; this says whether the rounded
             rect was actually repainted for it. Fold `alarm` out of the key
             and the flag still flips while the plate stays dark forever --
             a state that is true in the code and invisible on the screen,
             which is the whole failure mode this project keeps re-finding. */
          pillKey: _pui ? String(_pui._pillKey || '') : null,
          /* the top of the notice mark, in world units -- see its draw site */
          noticeY: display._noticeWorldY != null ? Math.round(display._noticeWorldY) : null,
          my: Math.round(m.y),
          notice: !!(m._aggroTs && now - m._aggroTs < NOTICE_MS),
          /* how far into the cue's life this frame is, so a camera can be
             pointed at it while it is at full strength rather than during its
             fade -- see the note in mp-moncue */
          noticeAge: m._aggroTs ? (now - m._aggroTs) : null,
          hasOldLvlText: !!display._lvlText,
        });
      }
      const _plateUi = display._hpUi;
      if (_plateUi && _plateUi._namePill) {
        const _plvlDanger = m.level != null && m.level >= ((S.rpg && S.rpg.level) || 1) + 5;
        /* v2.3.2295: stamped by the monster_attack handler (gameEvents.js) when
           the worker says THIS monster hit ME. A window rather than a flag --
           there is no "stopped attacking" message, so the plate has to time
           itself out. */
        const _plateAlarm = !!(m._atkMeUntil && now < m._atkMeUntil);
        _updateNamePill(_plateUi, monsterDisplayName(m.archetype || m.type), m.level == null ? 1 : m.level, true, null, _plateAlarm);
        /* v2.3.2295: the LEVEL line has to move with the fill. The danger red
           #ef4444 is 4.86:1 on the normal plate and 1.9:1 on the alarm one --
           the same light-fill-keeps-the-dark-ink trap TRAPS §48 records for the
           trade lanes, in a Graphics rather than in CSS. So the alarm state
           takes the whole ramp with it, and the danger red is what it returns
           to. Both states are in the cache key or the second transition would
           not repaint. */
        if (_plvlDanger !== _plateUi._lastLvlDanger || _plateAlarm !== _plateUi._lastLvlAlarm) {
          _plateUi._lastLvlDanger = _plvlDanger;
          _plateUi._lastLvlAlarm = _plateAlarm;
          _plateUi._pillLevel.style.fill = _plateAlarm ? '#FFD9D9' : (_plvlDanger ? '#ef4444' : '#D8AA58');
        }
      }

      /* Single dynamic Graphics — clear once and redraw all dynamic bits
         (statuses, aggro alert, threat arrow, stun, stuck arrows) here.
         Skip the entire pass when nothing relevant has changed since last
         frame — most monsters most frames have no dynamic content. */
      const statuses = m.statuses || {};
      const statusKeys = Object.keys(statuses);
      const numStatuses = statusKeys.length;
      /* v2.3.2295: 600 -> 1100ms. Owner: "when they notice you put a BRIEF
         exclamation point over their head". 600ms of a fading 4px dot on a
         phone held at arm's length is not a cue, it is a flicker -- and until
         v2.3.2295 wired the worker's `tg` through, nothing set _aggroTs in a
         server zone at all, so this had never actually been seen in play. */
      const aggroFlash = m._aggroTs && now - m._aggroTs < NOTICE_MS;
      const threatArrow = m._aggroed && S.player;
      const stunActive = m._stunUntil && now < m._stunUntil;
      /* Stun countdown text -- pooled Text on the monster container;
         shown only while stunActive.  Cleared (hidden) the frame the
         stun expires so we don't leak a stale "0s" over the corpse. */
      if (display._stunTimerText && !display._stunTimerText.destroyed) {
        if (stunActive) {
          const remainMs = m._stunUntil - now;
          const remainSec = Math.max(0, Math.ceil(remainMs / 1000));
          const txt = remainSec + 's';
          if (display._stunTimerText.text !== txt) display._stunTimerText.text = txt;
          display._stunTimerText.y = -display._size - 32;
          display._stunTimerText.visible = true;
        } else if (display._stunTimerText.visible) {
          display._stunTimerText.visible = false;
        }
      }
      /* Hash of "did the dynamic state change?" — pulse animations need
         per-frame redraw, so we still rebuild every frame when any of
         {aggro flash, threat arrow, stun, statuses} is active.  When NONE
         are active, skip entirely.
         v2.3.1876: stuck arrows dropped out of this list along with the
         draw below — nothing on dynGfx depends on them any more, so keeping
         them here would rebuild this Graphics every frame for art drawn by
         another renderer entirely. */
      const dynActive = numStatuses > 0 || aggroFlash || threatArrow || stunActive;
      if (dynActive || display._dynKey !== '') {
        const dynGfx = display._dynGfx;
        dynGfx.clear();
        display._dynKey = dynActive ? '1' : '';

        if (numStatuses > 0) {
          let sx = -size;
          for (const statusId of statusKeys) {
            const statusData = statuses[statusId];
            if (!statusData) continue;
            const elemForStatus = STATUS_TO_ELEMENT.get(statusId); /* v2.3.1183 */
            const sColor = elemForStatus ? cssColorToHex(elemForStatus.color) : 0xffffff;
            const ratio = 0.25;
            const winSize = (statusData.maxDur || 0) * ratio;
            let depth = 0;
            if (winSize > 0 && statusData.remaining <= winSize) {
              depth = Math.max(0, Math.min(1, (winSize - statusData.remaining) / winSize));
            }
            const pulseHz = depth > 0 ? (1.5 + depth * 3.5) : 0;
            const pulse = depth > 0 ? (1 + Math.sin(now / 1000 * pulseHz * 2 * Math.PI) * 0.2) : 1;
            /* v2.3.1734: STACKS ARE VISIBLE NOW.  Fracture is the only
               stacking status (maxStacks 5) and until this version nothing
               anywhere read `stacks` — the pip was the same dot whether the
               monster was taking +6% or +30% extra damage.  With Fracture
               activated server-side (elemental.js fractureDmgMult) an
               unreadable stack count would be an invisible mechanic, which
               is precisely what COMBAT-OVERHAUL-PLAN PR 6 forbids shipping.
               The pip GROWS with the count and gains a ring past one stack,
               so "how broken is this thing" is legible at a glance and the
               rising damage numbers confirm it.  Every other status has
               stacks === 1 forever, so they are pixel-identical to before. */
            const stacks = Math.max(1, Math.min(5, Math.floor(statusData.stacks || 1)));
            const r = 3 * pulse * (1 + (stacks - 1) * 0.16);
            let color = sColor;
            if (depth > 0) {
              const lerp = (a, b, t) => Math.round(a + (b - a) * t);
              const sr = (sColor >> 16) & 0xff;
              const sg = (sColor >> 8) & 0xff;
              const sb = sColor & 0xff;
              color = (lerp(sr, 255, depth * 0.7) << 16) | (lerp(sg, 255, depth * 0.7) << 8) | lerp(sb, 255, depth * 0.7);
            }
            dynGfx.circle(sx, -size - 16, r);
            dynGfx.fill({ color: color, alpha: 0.85 });
            /* v2.3.1734: the stack ring — one more visual channel than
               size alone, because a pip that is only 64% bigger at five
               stacks than at one is not something anyone reads mid-fight.
               White so it stays legible over every element colour. */
            if (stacks > 1) {
              dynGfx.circle(sx, -size - 16, r + 1.6);
              dynGfx.stroke({ color: 0xffffff, width: 0.8, alpha: 0.25 + stacks * 0.12 });
            }
            /* Spacing follows the pip so a five-stack Fracture doesn't
               overlap the status beside it. */
            sx += 8 + (r - 3);
          }
        }

        /* ═══ v2.3.2295: THE NOTICE CUE IS AN EXCLAMATION MARK ═══
           Owner: "on the monsters when they notice you put a brief exclamation
           point over their head to cue you in that you're being targeted."

           It replaces a 4px dot that was (a) not shaped like anything, (b) at
           `-size - 20`, which is over the BODY of every sprite-backed monster
           rather than over its head, and (c) dead code in production since
           local monster AI was switched off -- see the `tg` note in
           wsClient.js. So all three halves are fixed at once: it is written
           from the worker's own aggro, it sits on the shared above-head anchor,
           and it is a mark you can name.

           GRAPHICS, NOT A TEXTURE. CLAUDE.md's preloading law makes a new
           lazily-loaded sprite a bug, and this is a rounded bar and a dot. A
           Pixi Text would be worse than a sprite -- it rasterises on first use,
           which is a hitch at the exact moment something is about to attack
           you.

           KEYLINE FIRST, one step wider, the same trick the attack carets and
           the block caret use: this lands on grass, town cobble, desert sand,
           snow and lava, and a single red mark disappears against two of them.

           POP THEN HOLD THEN FADE. A mark that only fades reads as something
           ending; one that arrives reads as something starting, which is the
           whole message. */
        if (aggroFlash) {
          const age = (now - m._aggroTs) / NOTICE_MS;
          /* Grows past its size in the first ~120ms and settles back. */
          const _pop = age < 0.11 ? 0.55 + (age / 0.11) * 0.62
            : 1.17 - Math.min(1, (age - 0.11) / 0.24) * 0.17;
          /* Full opacity for two thirds of its life, then out. Fading from
             frame one is what made the old dot read as a glitch. */
          const _fade = age < 0.66 ? 1 : 1 - (age - 0.66) / 0.34;
          /* Same half-compensation the name plate takes (setPlateZoom): a cue
             for the READER should not shrink to nothing when the world zooms
             out, and should not be pinned so hard that it dwarfs the monster
             when it zooms in. */
          const _nz = _plateZoom * _pop;
          /* The shared above-head anchor, with the small procedural fallback
             for a monster whose HP block has not run yet (frame one). */
          const _nTop = (display._markTopY != null ? display._markTopY : -size - 30);
          /* Sized by looking, not by arithmetic. The first cut was 3.6 x 12
             container units with a 1.85x dark shape FILLED behind it, and the
             screenshot showed the problem immediately: at the 0.6 a combat
             zone runs at that is a 4 x 14 CSS px mark, and the oversized dark
             fill read as a brown blob with a thin red thread inside rather
             than as a red mark with an edge -- the identical failure v2.3.2255
             records for the attack carets, where "the keyline adds ~1 CSS px
             of dark EITHER SIDE, and no more" was the fix. So: half again as
             big, and the dark half is a STROKE around the shape instead of a
             larger copy of it. */
          const _bw = 6.5 * _nz;
          const _bh = 18 * _nz;
          const _gap = _bw * 0.8;
          /* Drawn UPWARD from the anchor: the dot sits just above the monster
             and the stem rises, so a taller mark never reaches down onto the
             sprite. */
          /* ═══ WHERE IT SITS, AND HOW THAT WAS SETTLED ═══
             _nTop is the top of the monster's whole above-head band (the HP
             bar's upper edge), so the dot sits just clear of that and the
             stem rises from it. On a slime that puts the mark between about
             121 and 166 world px above the feet, with the target chip below it
             at 91 -- the two never touch.

             That ordering was GUESSED WRONG once and is now measured. A
             screenshot in which the "!" could not be found was read as the
             chip painting over it, and the mark was raised 30 container units
             to "clear" a collision that was not happening: what the screenshot
             actually showed was the first cut of this mark being small and
             half-faded. The raise then put it 217 px over a 64px slime, i.e.
             in the sky, off every crop -- which looked exactly like the
             collision it was supposed to have fixed.
             Two marks drawn by two renderers into two coordinate spaces cannot
             be compared by eye, so they are compared by number instead: the
             draw stashes its world y below, __btAtkMark reports the chip's,
             and mp-moncue asserts the order. */
          const _dotY = _nTop - 4 * _nz - _bw * 0.6;
          const _bang = () => {
            dynGfx.circle(0, _dotY, _bw * 0.6);
            dynGfx.roundRect(-_bw / 2, _dotY - _gap - _bh, _bw, _bh, _bw * 0.5);
          };
          _bang();
          dynGfx.stroke({ color: 0x14181A, width: 2.4 * _nz, alpha: _fade * 0.85 });
          _bang();
          dynGfx.fill({ color: 0xFF4B4B, alpha: _fade });
          /* Where it actually landed, in WORLD units, for the probe. The two
             marks that can collide up here are drawn in different files and
             different spaces, so "is the ! above the chip" is not a question
             either file can answer alone -- and when they DID collide nothing
             failed, because a mark drawn underneath another one is still
             drawn. This is what lets a scenario ask. */
          display._noticeWorldY = m.y + (_dotY - _gap - _bh) * (display.scale && display.scale.y ? display.scale.y : 1);
        }

        if (threatArrow) {
          const tx = S.player.x - m.x;
          const ty = S.player.y - m.y;
          const tlen = Math.sqrt(tx * tx + ty * ty);
          if (tlen > 0.001) {
            const ang = Math.atan2(ty, tx);
            const baseY = -size - 12;
            const cx = Math.cos(ang), cy = Math.sin(ang);
            const tipL = 10, halfW = 3;
            dynGfx.poly([
              cx * tipL,        baseY + cy * tipL,
              -cy * halfW,      baseY + cx * halfW,
              cy * halfW,       baseY - cx * halfW,
            ]);
            dynGfx.fill({ color: 0xD68A3C, alpha: 0.7 });
          }
        }

        /* v2.3.1735: the owner's painted star ring REPLACES the procedural
           orbit below when its sheet is loaded (src/rendering/fxStrips.js).
           Same anchor (-size - 22) and same period, so only the art changes.
           Pooled on the container, so it follows the monster for free and
           needs no world-space maths.
           Replaces rather than joins: the first cut of this drew the sheet on
           the world overlay while THIS block kept running, and a monster with
           two star rings over it reads as a bug — which is exactly how the
           duplicate was spotted. */
        const starFrames = STUN_STARS.frames;
        if (stunActive && starFrames.length) {
          let ss = display._stunStarSprite;
          if (!ss || ss.destroyed) {
            ss = new Sprite(starFrames[0]);
            ss.anchor.set(0.5, 0.5);
            display.addChild(ss);
            display._stunStarSprite = ss;
          }
          const fi = Math.floor((now % STUN_SPIN_MS) / STUN_SPIN_MS * 8) % 8;
          if (ss.texture !== starFrames[fi]) ss.texture = starFrames[fi];
          /* 34px wide.  The art is a wide ellipse with stars at the top and
             both bottom corners, so its drawn HEIGHT is the full cell — sized
             any larger and the bottom pair hangs level with the monster's own
             level label. */
          ss.scale.set(34 / 256);
          /* NOT the procedural -size-22.  That anchor was tuned for a 4px
             star on an 18px orbit; this sheet draws 34px tall, so at the same
             centre its lower stars sit on the monster's own level label.
             Measured against the slime (the tallest common early monster, a
             96px body) rather than nudged. */
          ss.y = -size - 56;
          ss.visible = true;
        } else if (display._stunStarSprite && !display._stunStarSprite.destroyed) {
          display._stunStarSprite.visible = false;
        }
        if (stunActive && !starFrames.length) {
          /* Procedural fallback, kept for the window before the sheet
             resolves (and if it ever 404s).  Three 5-point stars orbiting in
             a squashed ellipse above the head -- standard "stunned" cartoon
             convention.  The orbit period is 700 ms; stars are slightly
             different phases so the ring reads as motion. */
          const centerY = -size - 22;
          const orbitRx = 14;     // horizontal radius
          const orbitRy = 5;      // vertical (squashed for ellipse look)
          const starR = 4;        // outer radius of each star
          const starR2 = starR * 0.4; // inner radius (5-point ratio)
          const orbitT = now / 700 * Math.PI * 2;
          for (let si = 0; si < 3; si++) {
            const a = orbitT + (si * Math.PI * 2 / 3);
            const sx = Math.cos(a) * orbitRx;
            const sy = centerY + Math.sin(a) * orbitRy;
            /* Stars in front of the orbit center fade slightly to
               sell the depth.  Sin(a) > 0 means below center (front
               of monster from the camera's POV). */
            const depthAlpha = 0.75 + Math.sin(a) * 0.2;
            const pts = [];
            for (let p = 0; p < 10; p++) {
              const ang = -Math.PI / 2 + p * Math.PI / 5;
              const rad = (p % 2 === 0) ? starR : starR2;
              pts.push(sx + Math.cos(ang) * rad, sy + Math.sin(ang) * rad);
            }
            dynGfx.poly(pts);
            dynGfx.fill({ color: 0xfbbf24, alpha: depthAlpha });
          }
        }

        /* v2.3.1876: the stuck arrow is NOT drawn here any more.
           Owner: "I think the arrows for the bow are still procedurally
           drawn."  They were — here.  This block (v2.3.1424) painted each
           entry of m._stuckArrows as a 10px brown line, and it was never
           removed when v2.3.1825 gave stuck arrows the painted pine texture
           in effectsRenderer's own _stuckArrows loop.  So every arrow in a
           monster drew TWICE, from the same array: the pine arrow at
           (m.x + ox, m.y + oy), and a tan #8B6914 stick shifted out to the
           body's edge by cos(ang) * size/2.

           Established by reading both call paths, NOT by screenshot, and the
           distinction matters.  effectsRenderer._updateProjectiles is called
           unconditionally every frame and walks S.monsters directly, so the
           painted arrow does not depend on a monster DISPLAY existing; this
           block did.  Nothing gates the two against each other, so for a real
           monster both ran on the same array.  It could not be captured here:
           a harness-injected monster gets no display (monsterDisplays reads
           empty, so this block never fired), and the town the harness spawns
           into has no real monsters to shoot.
           effectsRenderer is the surviving copy because it draws the ART, and
           because it is the one that does not need a display to work. */
      }
    }

    for (const [id, display] of this.monsterDisplays) {
      if (!activeIds.has(id)) {
        /* v2.3.1472: the above-head UI is parented to another layer, so
           destroying the body container does NOT reap it — it would be
           left behind as a floating HP bar over an absent monster. */
        if (display._hpUi && !display._hpUi.destroyed) display._hpUi.destroy({ children: true });
        display.destroy({ children: true });
        this.monsterDisplays.delete(id);
      }
    }
  }

  /* v2.3.1091: zone perspective player-scale -- the Overlook/vista "world
     view" shrink that makes avatars tiny while travelling. Shared by the
     LOCAL player and REMOTE players from each one's own position, so everyone
     shrinks together on a vista map. Previously only the local avatar shrank
     and other players stayed full size, dwarfing the tiny landscape. Absent
     playerScale => 1 (normal in-zone sizing, unchanged). */
  /* v2.3.1574: delegates to the single copy in data/zones.js.  The curve was
     hand-duplicated here, in BroTown's movement speed, and NOT AT ALL in the
     remote harvest stand-ins — so a peer cooking on the worldview drew full
     size beside their own speck-sized body. */
  _zonePscale(S, x, y) {
    return zonePlayerScale(S.currentZone, x, y, TILE);
  }

  /* ═══ v2.3.1917: the duel opponent's health bar ═══
     Owner: "During duels make it so that the hp and combat resource bars
     appear (as if you're battling any other monster)."

     WHEN it shows is decided by evidence, not by asking who is duelling
     whom: the server stamps `_hpSeenAt` on a peer every time it reports
     their HP changing (a pvp_hit), so a peer carries a bar while they are
     in a fight and loses it a few seconds after the fight stops.  That
     covers your own opponent without the client having to track duel
     pairs, and it covers a duel you are STANDING AND WATCHING for free —
     which is what a duel in a town square is for.

     The rest is the monster's bar, deliberately: same art, same 44x13
     box, same ghost trail and damage flash, same hide-at-full rule.  A
     second bar style for players would be a second thing to keep in sync
     for no reason the owner asked for. */
  _drawPeerHpBar(display, other, now) {
    const bar = display._duelBar;
    if (!bar) return;
    const seen = other._hpSeenAt || 0;
    const maxHp = Math.max(1, other.rpgMaxHp || 0);
    const hp = Math.max(0, Math.min(maxHp, other.rpgHp != null ? other.rpgHp : maxHp));
    const frac = hp / maxHp;
    /* Hidden unless: recently hit, actually hurt, and not a corpse.  A
       corpse is excluded because the death animation IS the health
       report at that point, and a bar over a bone pile reads as a
       fight still in progress. */
    const show = (now - seen) < PEER_HPBAR_HOLD_MS && frac < 0.999 && !other._isDead;
    /* v2.3.1917: QA probe (tools/qa/mp/mp-duel.mjs).  Reports the LAST peer
       considered this frame, which in a duel is the opponent — enough to
       assert the bar armed, tracked a real fraction, and hid again. */
    if (typeof window !== 'undefined') {
      window.__btPeerHpBar = { shown: show, hp, maxHp, frac: +frac.toFixed(3), sinceHitMs: now - seen, dead: !!other._isDead };
    }
    if (!show) {
      if (bar.alpha !== 0) {
        bar.alpha = 0;
        display._duelBarFill.alpha = 0;
        display._duelBarText.alpha = 0;
        display._duelBarFx.alpha = 0;
        display._duelBarFx.clear();
        display._peerGhost = null;   /* so the next fight starts clean */
      }
      return;
    }
    _ensureHudBarTextures();
    const frameTex = _hudBarTex.barFrame;
    if (!frameTex) return;           /* art not in yet — no bar beats a broken one */
    if (bar.texture !== frameTex) { bar.texture = frameTex; bar.tint = 0xffffff; }
    bar.width = MONSTER_HPBAR_W;
    bar.height = MONSTER_HPBAR_H;
    bar.x = 0;
    bar.y = PEER_HPBAR_Y;
    bar.alpha = 1;

    const fill = display._duelBarFill;
    const fillTex = _hpFillTexFor(display, frac);
    if (fill && fillTex) {
      if (fill.texture !== fillTex) fill.texture = fillTex;
      fill.width = Math.max(1, MONSTER_HPBAR_W * frac);
      fill.height = MONSTER_HPBAR_H;
      fill.x = -MONSTER_HPBAR_W / 2;
      fill.y = PEER_HPBAR_Y;
      fill.alpha = 1;
    }

    /* Ghost trail + white damage flash — the v2.3.458 constants the
       monster bar and the player widget both use. */
    if (display._peerGhost == null) display._peerGhost = frac;
    const tookDmg = (display._peerLastFrac != null) && (frac < display._peerLastFrac - 0.0005);
    if (tookDmg) {
      display._peerGhostDrainAt = now + HP_GHOST_HOLD_MS;
      display._peerFlashUntil = now + HPBAR_FLASH_MS;
    }
    if (frac >= display._peerGhost) display._peerGhost = frac;
    else if (now >= (display._peerGhostDrainAt || 0)) {
      display._peerGhost = Math.max(frac, display._peerGhost - HP_GHOST_DRAIN_M);
    }
    display._peerLastFrac = frac;

    const fx = display._duelBarFx;
    if (fx) {
      fx.clear();
      fx.alpha = 1;
      const inL = -MONSTER_HPBAR_W / 2 + MONSTER_HPBAR_W * HPBAR_IN_X;
      const inW = MONSTER_HPBAR_W * HPBAR_IN_W;
      const inT = PEER_HPBAR_Y - MONSTER_HPBAR_H / 2 + MONSTER_HPBAR_H * HPBAR_IN_Y;
      const inH = MONSTER_HPBAR_H * HPBAR_IN_H;
      if (display._peerGhost > frac + 0.001) {
        fx.rect(inL + inW * frac, inT, inW * (display._peerGhost - frac), inH);
        fx.fill({ color: HP_GHOST_WHITE, alpha: 0.92 });
      }
      const fl = (display._peerFlashUntil || 0) - now;
      if (fl > 0 && frac > 0) {
        fx.rect(inL, inT, inW * frac, inH);
        fx.fill({ color: 0xffffff, alpha: 0.85 * (fl / HPBAR_FLASH_MS) });
      }
    }

    const txt = display._duelBarText;
    if (txt) {
      const str = String(Math.ceil(hp));
      if (txt.text !== str) txt.text = str;
      txt.x = 0;
      txt.y = PEER_HPBAR_Y;
      txt.alpha = 1;
    }
  }

  _updateOtherPlayers(S, now) {
    const others = S.others || {};
    const activeIds = new Set();

    for (const [id, other] of Object.entries(others)) {
      if (!other || (other.zone || other.z || 'town') !== S.currentZone) continue;
      activeIds.add(id);

      let display = this.otherPlayerDisplays.get(id);
      if (!display) {
        display = createOtherPlayerDisplay();
        display.label = `other_${id}`;
        this.entityLayer.addChild(display);
        this.otherPlayerDisplays.set(id, display);
      }

      // Use pre-computed interpolated position
      display.x = other.renderX || other.x || 0;
      display.y = other.renderY || other.y || 0;
      /* ═══ v2.3.2083: WHERE A PEER WAS ACTUALLY DRAWN ═══
         The local player has had __btPlayerDrawn since v2.3.2078; a peer had
         nothing, so a QA crop around another player was derived from
         renderX/renderY read at some LATER instant than the frame it was
         cropping.  For a peer standing still that is exact and for one running
         it is not, and mp-cosmpose read "the other player cannot see his
         tattoos" off a crop that had simply missed him.  Widening the crop is
         the wrong fix and was tried: at this spawn the extra margin reaches the
         grass and the no-art CONTROL starts counting green off the town, which
         is TRAPS §34 and the exact bug the tight box exists for.  A crop needs
         a better ANCHOR, not a bigger box. */
      if (typeof window !== 'undefined') {
        const _pd = (window.__btPeersDrawn && window.__btPeersDrawn._m) || null;
        if (_pd) {
          const _pb2 = display._spriteBody;
          _pd.set(id, {
            x: display.x, footY: display.y,
            width: _pb2 && _pb2.texture ? Math.abs(_pb2.texture.width * _pb2.scale.x) : 0,
            height: _pb2 && _pb2.texture ? Math.abs(_pb2.texture.height * _pb2.scale.y) : 0,
            visible: display.visible,
          });
        }
      }

      /* v2.3.1091: apply the same per-zone perspective shrink the local
         player gets, computed from THIS remote's own position, so other
         players also become tiny on a vista map ("world view") instead of
         dwarfing the landscape. Normal zones have no playerScale => 1 (other
         players keep their correct in-zone size). The body's horizontal flip
         lives on the inner _spriteBody, so scaling the container uniformly
         here doesn't disturb facing. */
      {
        const pscale = this._zonePscale(S, display.x, display.y) * PLAYER_SIZE_MULT; /* v2.3.1274 */
        /* v2.3.1953: ...times this bro's own build.  Computed from the
           UNLIFTED y above, because _zonePscale reads the position to work out
           how far up a vista map he is standing; the lift is applied after. */
        display.y += _applyBuildScale(display, pscale, other.buildHeight, other.buildFrame);
      }

      /* v2.3.1917: health bar for a peer in a fight — see _drawPeerHpBar.
         Drawn every frame for every visible peer; it costs one comparison
         against a timestamp for the overwhelming majority who are not
         fighting, and self-hides. */
      this._drawPeerHpBar(display, other, now);

      /* Death state — play the death sprite animation (player crumbles
         into a skeleton then a pile of bones) until player_respawned
         clears _isDead.  Hide weapon/shield/NFT/procedural body so the
         corpse reads cleanly.  Fall back to a fade+tilt visual if the
         sheet hasn't loaded yet. */
      if (other._isDead) {
        /* v2.3.1092: a harvest stand-in may have hidden this container last
           frame; the corpse renders through it, so restore visibility. */
        if (!display.visible) display.visible = true;
        /* v2.3.809: self-heal a missed corpse-clear.  player_respawned is a
           one-shot peer broadcast -- an observer that was frozen,
           reconnecting, or joined after the respawn never receives it, so
           the remote stayed a skeleton/bone pile forever while walking
           around.  Corpses cannot move: once the player's position leaves
           the death spot, they respawned. */
        if (other._deathPx == null) { other._deathPx = display.x; other._deathPy = display.y; }
        if (Date.now() - (other._deathTs || 0) > 1500
            && Math.hypot(display.x - other._deathPx, display.y - other._deathPy) > 24) {
          other._isDead = false;
          other._deathPx = other._deathPy = null;
        }
      }
      if (other._isDead) {
        if (display.alpha !== 1) display.alpha = 1;
        if (display.rotation !== 0) display.rotation = 0;
        const _elapsed = Date.now() - (other._deathTs || Date.now());
        const _spriteBody = display._spriteBody;
        const _body = display._body;
        if (hasPlayerDeathSprites() && _spriteBody) {
          const _tex = getPlayerDeathFrame(playerDeathFrameForElapsed(_elapsed));
          if (_tex && _spriteBody.texture !== _tex) _spriteBody.texture = _tex;
          _spriteBody.tint = 0xffffff;
          /* Source frame is 128 px and fills most of the frame — the
             living player sprite has more padding so it renders smaller
             at scale 1.  Scale down ~50% so the corpse sits at roughly
             the same visual size as the living body. */
          _spriteBody.scale.set(0.5);
          _spriteBody.visible = true;
          if (_body) _body.visible = false;
        } else if (_spriteBody) {
          /* Sheet not loaded yet — fallback fade+tilt. */
          display.alpha = 0.45;
          display.rotation = Math.PI / 2;
        }
        /* v2.3.1887: hide by EXCEPTION here too — see the note on the local
           corpse below.  A peer's corpse had the same floating slung shield
           for the same reason: this was a hand-written list of what to hide,
           and the back shield was added long after it. */
        const _rKeep = [
          _spriteBody, display._namePill, display._comboText,
          display._handCapMask, display._handArmMask,
        ];
        _hideExceptDeep(display, _rKeep);
        continue;
      }
      /* Living — restore visibility of containers that might have been
         hidden by a previous death frame on this display. */
      if (display._weaponContainer && !display._weaponContainer.visible) {
        display._weaponContainer.visible = true;
      }
      /* v2.3.809: drop the corpse-position snapshot once alive so the NEXT
         death takes a fresh one (a stale snapshot from a previous death
         would read as instant movement and skip the death animation). */
      if (other._deathPx != null) { other._deathPx = other._deathPy = null; }

      const body = display._body;
      const torso = other.bt || '#2563eb';
      const legs = other.bl || '#1e3a5f';
      const head = other.color || '#5b52ff';
      const bodyW = 14;
      const bodyH = 22;
      /* When a remote player stops, the sender stops broadcasting move
         events entirely (the broadcast in gameLoop.js/BroTown.jsx is
         gated on isMoving), so _vx/_vy stay at whatever the LAST
         broadcast was -- a non-zero running velocity.  The smoothed
         values then decay TOWARDS that stale value, never reaching
         zero, so a remote player who stopped a second ago still shows
         the jog animation forever.
         Workaround: if we haven't received an update in 150ms, treat
         them as idle.  Reliable because moving players broadcast every
         ~33ms; a 150ms gap means they stopped. */
      const STALE_UPDATE_MS = 150;
      const stale = !other._lastUpdate || (now - other._lastUpdate) > STALE_UPDATE_MS;
      /* v2.3.840: movement hysteresis.  The smoothed remote velocity decays
         asymptotically toward 0 when a player stops, so a single threshold
         made isMoving (and thus the jog<->stand pose) flicker frame to frame
         -- visible as a jitter.  Require a clear push to START moving and
         drop to idle only well below that, so a decelerating or
         direction-changing remote holds its pose cleanly. */
      const _remoteV = Math.max(Math.abs(other._smoothVx || 0), Math.abs(other._smoothVy || 0));
      let isMoving;
      if (stale) isMoving = false;
      else if (display._remoteMoving) isMoving = _remoteV > 0.012;
      else isMoving = _remoteV > 0.05;
      display._remoteMoving = isMoving;
      const bobY = isMoving ? Math.sin(now / 120) * 2 : 0;
      /* v2.3.1365: player shadow removed — no stride wobble to drive. */

      /* Sprite-sheet body — same as local player.  Other players
         broadcast their own 8-way facing in `f` (-> other._renderFacing). */
      let facing;
      if (other._renderFacing) {
        /* v2.3.840: trust the SENDER's own 8-way facing first.  It's the
           ground truth (the remote's render facing) and a plain string that
           survives the relay intact -- unlike the position-delta derivation
           (_moveFacing8), which goes stale during fast direction changes and
           was rendering e.g. a northeast run as the west animation. */
        facing = other._renderFacing;
        display._lastFacing = facing;
      } else if (other._moveFacing8) {
        facing = other._moveFacing8;
        display._lastFacing = facing;
      } else if (isMoving) {
        const ang = Math.atan2(other._smoothVy || 0, other._smoothVx || 0);
        const sector = Math.round(ang / (Math.PI / 4));
        facing = SECTORS[((sector % 8) + 8) % 8];
        display._lastFacing = facing;
      } else {
        facing = display._lastFacing || other._facing || 'south';
      }
      /* v2.3.599: remove the old 180deg `_OPP` remap.  It was added (v2.3.400/401)
         to undo an inversion in the THEN-current velocity-derived facing, whose
         broadcast vy sign didn't survive the server relay.  The live facing now
         comes from `_moveFacing8`, derived from POSITION deltas in the same
         SECTORS convention the LOCAL player uses (atan2(dy,dx) -> east when
         dx>0), so it is already correct.  The leftover `_OPP` therefore
         double-inverted it -- a remote running east rendered mirrored as west.
         Dropping it makes remote facing match local. */
      const facingIdx = SECTORS.indexOf(facing);
      const isHit = other._hitFlash && (now - other._hitFlash) < 250;

      /* ═══ v2.3.1790: the peer's slung shield ═══
         Whether they own one comes from rpgData.shield, which the presence
         payload already carries for the inspect card — so this needs NO wire
         change and cannot break deploy order in either direction: an old
         client shows a new client's shield and a new client shows an old
         one's.  It is the shield's NAME rather than a render flag, and that is
         enough, because the art is one pine PNG triplet whatever shield it is
         — exactly as for the local player.

         Drawn while they stand or jog, hidden during a hit, a death or any
         stand-in pose, for the reason the local one is: those replace or move
         the torso in ways a fixed back placement cannot follow.  A peer's
         BLOCK is not broadcast at all, so a blocking peer keeps the shield
         slung — wrong for the half-second it is up, and better than guessing
         from data that is not on the wire. */
      {
        const _shLo = display._shieldBackLo, _shHi = display._shieldBackHi;
        if (_shLo && _shHi) {
          const _hasShield = !!(other.rpgData && other.rpgData.shield);
          const _place = (_hasShield && !isHit && !other._dying && !other._extraction && !other._firemaking)
            ? backShieldPlacement(facingIdx, isMoving, bobY)
            : null;
          if (!_place) {
            _shLo.visible = false;
            _shHi.visible = false;
          } else {
            const _shown = _place.behind ? _shLo : _shHi;
            (_place.behind ? _shHi : _shLo).visible = false;
            applyBackShield(_shown, _place, BACK_SHIELD_PX);
            _shown.x = _place.dx;
            _shown.y = _place.dy;
          }
          /* QA probe (mp-peershield) — one entry per peer id. */
          try {
            /* v2.3.2272: armed only (see the note in _updateMonsters) -- the
               three getChildIndex scans below are per peer per frame.
               Object.create(null): peer ids come off the wire (CLAUDE.md
               rule 4), and a peer calling itself __proto__ silently no-oped
               this store on a plain {}. */
            if (!window.__btPeerShield) window.__btPeerShield = Object.create(null);
            if (window.__btProbe) window.__btPeerShield[id] = {
              on: !!(_shLo.visible || _shHi.visible),
              hasShield: _hasShield,
              facing, behind: _shLo.visible, front: _shHi.visible,
              loIdx: display.getChildIndex(_shLo),
              hiIdx: display.getChildIndex(_shHi),
              bodyIdx: display._spriteBody ? display.getChildIndex(display._spriteBody) : -1,
            };
          } catch (e) { /* never breaks the frame */ }
        }
      }
      /* v2.3.1092: remote harvest activity broadcast by the gatherer.
         mine/fish render as the SAME south-only body poses the local player
         uses; chop/cook/fire are full-character STAND-INS drawn in
         effectsRenderer (_updateRemoteExtraction), so the whole body container
         is hidden while one is active (mirrors the local player's _chopHide). */
      const _rex = other._ex || null;
      const _rexStandIn = _rex === 'chop' || _rex === 'cook' || _rex === 'fire';
      const _rexBodyPose = _rex === 'mine' ? 'mine' : _rex === 'fish' ? 'fish' : null;
      if (display.visible === _rexStandIn) display.visible = !_rexStandIn;
      /* v2.3.1534: remote dodge roll.  other._dodgeRoll is already set from
         the `player_dodge` broadcast (v2.3.1011) and drives the afterimage
         trail in effectsRenderer; now it drives the body pose too, so a peer
         rolling past reads as a roll and not a slide.  The broadcast carries
         no duration (the roller's window is elastic), so this plays at the
         cycleMs default. */
      const _rDodge = other._dodgeRoll || null;
      const pose = _rexBodyPose
        ? _rexBodyPose
        : (_rDodge ? 'dodge' : (isHit ? 'hit' : (isMoving ? 'jog' : 'stand')));
      const spritesAvailable = hasPose(pose) || hasPose('stand');
      let useSprite = false;
      if (!_rexStandIn && spritesAvailable) {
        const spriteBody = display._spriteBody;
        let { dir, mirror } = resolveDirection(facing);
        /* mine/fish frames are authored south-only -> force south, no mirror. */
        if (pose === 'mine' || pose === 'fish') { dir = 'south'; mirror = false; }
        /* v2.3.1534: dodge is authored south + east -> dominant-axis map, off
           the broadcast roll angle rather than the peer's walk facing. */
        if (pose === 'dodge') {
          const _ds = Math.round((_rDodge.angle || 0) / (Math.PI / 4));
          ({ dir, mirror } = dodgeSheetDir(SECTORS[((_ds % 8) + 8) % 8]));
        }
        let frameIdx = 0;
        let _rJogPhase = null;  /* v2.3.1367: cycle phase for native-count fullset playback */
        if (pose === 'jog') {
          /* Frame count is per-direction now (24-35) — pulled from
             the loaded sheet width so a longer strip plays more frames
             in the same 1s cycle, giving smoother motion. */
          const fc = playerFrameCount('jog', dir) || 24;
          /* v2.3.603: armoured remote keeps slower NE/NW cadence; naked = +35%. */
          const _arm = !!(other.equip && other.equip.chest && other.equip.chest !== 'none'
            && other.equip.legs && other.equip.legs !== 'none');
          frameIdx = Math.floor((now / cycleMs('jog', dir, _arm)) * fc) % fc;
          /* v2.3.1367: cycle phase for native-count fullset playback. */
          _rJogPhase = ((now / cycleMs('jog', dir, _arm)) % 1 + 1) % 1;
        } else if (pose === 'hit') {
          const hitT = (now - (other._hitFlash || 0)) / 250;
          frameIdx = Math.max(0, Math.min(5, Math.floor(hitT * 6)));
        } else if (pose === 'mine' || pose === 'fish') {
          /* v2.3.1092: loop the south-only gather cycle off `now`, same cadence
             as the local player's mine/fish pose. */
          const fc = playerFrameCount(pose, 'south') || (pose === 'mine' ? 14 : 32);
          frameIdx = Math.floor((now / cycleMs(pose, 'south')) * fc) % fc;
        } else if (pose === 'dodge') {
          /* One-shot, clamped — mirrors the local branch. */
          const fc = playerFrameCount('dodge', dir) || 9;
          const t = (now - (_rDodge.startTime || now)) / cycleMs('dodge', dir);
          frameIdx = Math.max(0, Math.min(fc - 1, Math.floor(t * fc)));
        }
        /* v2.3.389: remote players render in their own skin tone.
           v2.3.399: + their pants / shoes colors.
           v2.3.497: + their baked shirt (torso-fill). */
        const _oChest = (other.equip && other.equip.chest) || 'none';
        const _oLegs = (other.equip && other.equip.legs) || 'none';
        /* v2.3.686: full set only (mirrors the local-player shirt gate). */
        /* v2.3.756: baked shirt retired for remotes too -- they wear the
           layered shirt via equip.shirt (eqst broadcast).  Old clients
           don't send eqst; fall back to their legacy shirt-style field
           (st) so a shirted old-client player still reads as shirted. */
        const _oShirtT = null;
        const _oShirtKey = 'none';
        const _oEq = other.equip || {};
        const _oShirtEquip = _oEq.shirt !== undefined ? _oEq.shirt
          : ((other.shirt && other.shirt !== 'none') ? 'tshirt' : 'none');
        /* v2.3.1930: THEIR eye colour, off the wire (`ec`) -- not getEyeColor(),
           which is this device's own and would put your eyes on their face. */
        /* v2.3.1940: THEIR drawings, sanitised, for the same reason as the eyes
           above -- a peer's pants print must not be built from my local store,
           and anything that is not exactly a well-formed drawing becomes null. */
        const _oBodyArt = _remoteBodyArt(other, mirror);
        let tex = getBodyFrame(other.skin, other.pants, other.shoes, pose, dir, frameIdx, _oShirtT, _oShirtKey, other.eyeColor, _oBodyArt);
        if (!tex) tex = getBodyFrame(other.skin, other.pants, other.shoes, 'stand', dir, 0, _oShirtT, _oShirtKey, other.eyeColor, _oBodyArt);
        if (tex) {
          /* Reassign texture whenever it differs — same self-heal as
             the local player path, fixes invisible-after-zone-change. */
          if (spriteBody.texture !== tex) {
            spriteBody.texture = tex;
          }
          display._animPose = pose;
          display._animDir = dir;
          display._animFrame = frameIdx;
          /* Same east-direction size compensation as the local player —
             keeps every player rendered at the same visual scale.
             v2.3.163: baseline halved from 1.0 -> 0.5 because the
             sprite source bumped from 64 to 128 px per frame.
             v2.3.165: bumped 25% (0.5 -> 0.625) to match the local
             player's v2.3.165 +25% change.
             v2.3.166: halved again (0.625 -> 0.3125) for 128 -> 256
             source bump.  Net visible scale unchanged from v2.3.165. */
          /* v2.3.396: match the local player's LOCAL_SCALE (0.3515625).
             The remote base had drifted to 0.3125 (~11% smaller), so other
             players rendered noticeably smaller than yourself. */
          /* v2.3.537: derived per-(pose,dir) scale, shared with the local
             player path via bodyDirScale (silhouette-height normalization). */
          const sizeMul = bodyDirScale(pose, dir) * 0.421875; /* v2.3.741: +20% with the local player */
          spriteBody.scale.x = (mirror ? -1 : 1) * sizeMul * DISPLAY_DS;   // v2.3.1120: DISPLAY-downscaled body textures
          spriteBody.scale.y = sizeMul * DISPLAY_DS;
          spriteBody.tint = 0xffffff;
          spriteBody.visible = true;
          body.visible = false;
          if (display._procDrawn) {
            body.clear();
            display._procDrawn = false;
          }
          useSprite = true;
          /* v2.3.504: this remote player's layered gear (their equip is
             broadcast over the network). */
          /* v2.3.1938: THEIR drawings, sanitised -- a peer-supplied string
             reaches a canvas here, so anything not exactly a 256-char hex
             drawing becomes null rather than being handed to the stamper. */
          const _oTint = shirtFill(other.shirt || 'tshirt', other.shirtColor);
          display._shirtLook = _shirtLook(sanitizeShirtArt(other.shirtArtFront),
            sanitizeShirtArt(other.shirtArtBack),
            sanitizePattern(other.shirtPattern, 'shirt'), _oTint);   /* v2.3.1941 */
          display._shirtArtMirror = mirror;
          _placeGear(display, {
            shirt: _oShirtEquip, legs: _oEq.legs, chest: _oEq.chest,
            shoulders: _oEq.shoulders,
            shirtTint: _oTint,
          }, pose, dir, frameIdx);
          /* v2.3.613: no helmet -- head/face always shows.  Mask the body under
             the remote's worn chest/legs plate (dilated) so it can't poke past a
             plate edge; the head + bare regions still show. */
          _hideBodyRegions(display);
          const _rworn = [];
          for (const _sl of ['chest', 'legs']) {
            const _it = other.equip && other.equip[_sl];
            if (_it && _it !== 'none') {
              const _gt = getGearFrame(_sl, _it, pose, dir, frameIdx);
              if (_gt) _rworn.push({ k: _sl + ':' + _it, tex: _gt });
            }
          }
          let _rfull = false;
          let _fsR = null; /* v2.3.1389: hoisted — the trait crown override below needs it */
          if (_rworn.length) {
            const _rlegsW = _rworn.some(w => w.k && w.k.indexOf('legs:') === 0);
            const _rchestW = _rworn.some(w => w.k && w.k.indexOf('chest:') === 0);
            _rfull = pose === 'pickup' && _rlegsW && _rchestW;   // v2.3.1057: hide body, head overlay + gear render it (no bake)
            /* v2.3.1361: fullset figure for remote players too. */
            _fsR = _fullsetFrame(other.equip && other.equip.chest, other.equip && other.equip.legs, pose, dir, frameIdx, _rJogPhase);
            /* v2.3.1573: 'dodge' comes OFF the un-masked path — v2.3.1534 put
               it there because the pose shipped no gear sheets, and it now
               has all three slots (tools/build-dodge-gear.mjs).  The plate is
               sealed against the body, so the mask is what stops the bare
               figure showing through at its edges. */
            const _mt = _fsR || ((pose === 'pickup') ? tex : _maskedBodyFrame(tex, _rworn, 6, { pose, dir, frameIdx }));
            if (spriteBody.texture !== _mt) spriteBody.texture = _mt;
            /* v2.3.1757: the fullset figure IS the armour, drawn on the body
               sprite — so the material colour goes here.  Cleared whenever the
               figure is not in play, because the same sprite is the naked body
               on the very next frame. */
            const _fsTintR = _fsR ? _fullsetTint(other.equip && other.equip.chest) : 0xffffff;
            if (spriteBody.tint !== _fsTintR) spriteBody.tint = _fsTintR;
          }
          /* v2.3.1055: pickup head overlay (drawn above gear in _orderTraitsAndWeapon).
             v2.3.1116: guarded (see local path) -- a throw here must not freeze the loop. */
          try {
            /* v2.3.1394: jog overlay only over the fullset figure (see local path). */
            /* v2.3.1479: same armour gate as the local path. */
            if ((pose !== 'jog' || _fsR) && ((pose !== 'hit' && pose !== 'mine') || _rworn.length > 0)) _placePickupHead(display, spriteBody, other.skin, other.pants, other.shoes, pose, dir, frameIdx, _rJogPhase);
            display._headBehindGear = (pose === 'jog' && dir === 'east' && !!_fsR); /* v2.3.1553 */
            spriteBody.visible = !(_rfull && !!getPickupHeadFrame(other.skin, other.pants, other.shoes, pose, dir, frameIdx));
            /* v2.3.1123: lift the angler's head above the fishing chest plate.
               v2.3.2278: above their LEG armour too.  This was chest-only, so
               a peer fishing in greaves lost the same hand the local player
               did -- and worse, it was invisible to whoever was wearing them,
               which is the shape of the owner's separate report that peers
               are missing items his own screen shows.  The shirt needs no
               entry here: on the remote path it is baked into the body
               texture rather than drawn as an overlay (see just below). */
            if (pose === 'fish' && _rworn.length > 0) _placeFishHead(display, spriteBody, tex);
          } catch (e) { if (display._bodyHead) display._bodyHead.visible = false; spriteBody.visible = true; }
          /* shirt is baked into the body (see getBodyFrame above); no overlay. */
          if (display._shirtSprite) display._shirtSprite.visible = false;
          /* always show the remote's hair/hat/beard (no helmet to hide them). */
          _crownOverride = _fsR ? _fullsetCrown(dir, _rJogPhase) : null; /* v2.3.1389 */
          _placeCape(display, other.cape, pose, dir, mirror, frameIdx);   /* v2.3.2023 */
          _placeHeadwear(display, other.headwear, other.hatColor, pose, dir, mirror, frameIdx, sizeMul, other.hair); /* v2.3.1561: hair id for the floating halo */
          _placeFacialHair(display, other.facialhair, other.facialHairColor, pose, dir, mirror, frameIdx, sizeMul);
          _placeHair(display, other.hair, other.hairColor, other.headwear, pose, dir, mirror, frameIdx, sizeMul);
          _crownOverride = null;
        } else {
          spriteBody.visible = false;
          body.visible = true;
          if (display._headwearSprite) display._headwearSprite.visible = false;
          if (display._facialHairSprite) display._facialHairSprite.visible = false;
        if (display._shirtSprite) display._shirtSprite.visible = false;
          if (display._hairSprite) display._hairSprite.visible = false;
        }
      } else {
        display._spriteBody.visible = false;
        body.visible = true;
        if (display._headwearSprite) display._headwearSprite.visible = false;
        if (display._facialHairSprite) display._facialHairSprite.visible = false;
        if (display._shirtSprite) display._shirtSprite.visible = false;
        if (display._hairSprite) display._hairSprite.visible = false;
      }

      /* NFT 360° body for the remote player — same fallback policy
         as the local player: only swap in when the sprite path didn't
         render and the player has an avatar URL whose textures are
         ready.  Use the velocity-derived angle for smooth rotation. */
      let oNftShown = false;
      if (!useSprite && other.avatar) {
        const nft = getNftTextures(other.avatar);
        if (nft) {
          const oRenderAng = isMoving
            ? Math.atan2(other._smoothVy || 0, other._smoothVx || 0)
            : (facingIdx >= 0 ? facingIdx * Math.PI / 4 : Math.PI / 2);
          applyNftTransform(display, nft.front, nft.back, oRenderAng, nft.size, bobY);
          oNftShown = true;
        }
      }
      if (!oNftShown) hideNft(display);

      /* Procedural fallback body — only drawn when sprite path is
         unavailable.  Skip rebuild when idle and no color/torso
         changes. */
      if (!useSprite && !oNftShown) {
        const colorKey = torso + '|' + legs + '|' + head;
        if (isMoving || display._lastColorKey !== colorKey || display._lastIsMoving !== isMoving) {
          display._lastColorKey = colorKey;
          display._lastIsMoving = isMoving;
          display._procDrawn = true;
          body.clear();
          /* v2.3.1300: the baked fallback shadow ellipse is retired;
             v2.3.1365: the player ground shadow is gone entirely
             (owner) — do not re-add one here. */
          // Legs with walk animation
          const legSwing = isMoving ? Math.sin(now / 80) * 3 : 0;
          body.rect(-bodyW / 2, 2 + bobY + legSwing, bodyW / 2 - 1, bodyH / 2);
          body.fill({ color: cssColorToHex(legs) });
          body.rect(1, 2 + bobY - legSwing, bodyW / 2 - 1, bodyH / 2);
          body.fill({ color: cssColorToHex(legs) });
          // Torso
          body.roundRect(-bodyW / 2, -bodyH / 2 + bobY, bodyW, bodyH / 2 + 4, 3);
          body.fill({ color: cssColorToHex(torso) });
          // Head
          body.circle(0, -bodyH / 2 - 4 + bobY, 6);
          body.fill({ color: cssColorToHex(head) });
        }
      }

      /* Weapon + shield rendering for other players — mirrors the
         local-player path with two simplifications:
         1. No S._aimAngle is broadcast for other players, so the
            swing/aim direction is derived from their body facing.
         2. No combo/collision-glow data either; weaponGlowGfx stays
            empty (kept around for future migration if those signals
            get broadcast). */
      const oWeaponGfx = display._weaponGfx;
      const oWeaponGlowGfx = display._weaponGlowGfx;
      oWeaponGfx.clear();
      oWeaponGlowGfx.clear();
      const oIsShielding = !!other._shieldUp;
      const oWpnType = other.wpnType || null;
      /* Shield-direction angle: server only broadcasts _shieldUp, so
         the arc tracks the body's facing rather than a separate aim. */
      const aimAngle = facingIdx >= 0 ? facingIdx * Math.PI / 4 : 0;
      /* Swing window — same 250ms quadratic ease-out as local. */
      const oSwingActive = other._swingTs && (now - other._swingTs) < SWING_ANIM_MS;
      const oSwingSpecial = !!other._swingSpecial;
      const oVisualArc = oSwingSpecial ? Math.PI : SWING_FULL_ARC;
      let oSwingAng = 0, oSwingProgress = 0, oSwingOffset = 0;
      if (oSwingActive && oWpnType) {
        oSwingProgress = (now - other._swingTs) / SWING_ANIM_MS;
        const eased = 1 - (1 - oSwingProgress) * (1 - oSwingProgress);
        oSwingOffset = -oVisualArc / 2 + eased * oVisualArc;
        const restAng = REST_ANG[oWpnType] != null ? REST_ANG[oWpnType] : 0;
        oSwingAng = (aimAngle - restAng) + oSwingOffset;
      }
      const oSpriteBody = display._spriteBody;
      const oWeaponSprite = display._weaponSprite;
      if (oWpnType && !oIsShielding) {
        const wpnIconTex = hasWeapon(oWpnType) ? getWeaponTexture(oWpnType) : null;
        if (wpnIconTex) {
          if (oWeaponSprite.texture !== wpnIconTex) oWeaponSprite.texture = wpnIconTex;
          const handle = getWeaponHandle(oWpnType);
          const tw = wpnIconTex.width || 64;
          const th = wpnIconTex.height || 64;
          if (handle) oWeaponSprite.anchor.set(handle[0] / tw, handle[1] / th);
          else oWeaponSprite.anchor.set(0.5, 1.0);

          /* Per-frame hand anchor — same math as local. */
          const SHEET_W = 256;
          const { dir, mirror } = resolveDirection(facing);
          /* v2.3.163: baseline halved from 1.0 -> 0.5 to match the
             spriteBody scale change above (also 0.5).  Keeps the
             weapon anchored to the visual hand position rather than
             flying off into space. */
          let bodyScale = 0.6; /* v2.3.741: 0.5 -> 0.6, tracking the +20% body bump */
          const isHitNow = other._hitFlash && (now - other._hitFlash) < 250;
          const poseNow = isHitNow ? 'hit' : (isMoving ? 'jog' : 'stand');
          if (dir === 'east' && poseNow === 'hit') bodyScale = 0.88 * 0.6;
          else if (dir === 'northeast' && poseNow !== 'hit') bodyScale = 1.03 * 0.6;
          const animFrame = display._animFrame || 0;
          /* v2.3.1040: forward-hand pick for the doubled half-cycle jogs (east/NE). */
          const _jogFwd = display._animPose === 'jog' && (dir === 'east' || dir === 'northeast');
          const hand = display._animPose
            ? (_jogFwd ? (getJogForwardHand(dir, animFrame) || getAnchor(display._animPose, dir, animFrame, mirror))
                       : getAnchor(display._animPose, dir, animFrame, mirror))
            : null;
          let wpnX = 0, wpnY = 0;
          if (hand) {
            const ax = mirror ? (SHEET_W - hand[0]) : hand[0];
            wpnX = (ax - SHEET_W / 2) * bodyScale;
            wpnY = (hand[1] - SHEET_W / 2) * bodyScale;
          } else {
            /* Crude fallback before sprite anim populates. */
            wpnX = 14; wpnY = 8 + bobY;
          }
          oWeaponSprite.x = wpnX;
          oWeaponSprite.y = wpnY;

          const targetH = oWpnType === 'greatsword' ? 36
                         : oWpnType === 'staff'      ? 34
                         : oWpnType === 'bow'        ? 28
                         :                              26;
          const fitScale = targetH / Math.max(8, th);
          /* v2.3.1786: carried blade points UP, same as the local player below —
             other bros have to hold their sword the way you hold yours. */
          let _oBladeUp = false;
          if (oSwingActive) {
            oWeaponSprite.rotation = oSwingAng;
            oWeaponSprite.scale.x = fitScale;
          } else {
            oWeaponSprite.rotation = 0;
            const weaponMirror = facingIdx >= 3 && facingIdx <= 6;
            oWeaponSprite.scale.x = (weaponMirror ? -1 : 1) * fitScale;
            _oBladeUp = true;
          }
          oWeaponSprite.scale.y = _oBladeUp ? -fitScale : fitScale;   /* v2.3.1786 — see the local path */
          /* v2.3.1760: the gap v2.3.1757 recorded here is closed — the peer
             snapshot carries `wpnMat` beside `wpnType` now, so the other
             player's sword is the metal they are actually holding.  The value
             is a foreign string: materialTint answers native white for anything
             it does not know, so a forged or stale id cannot paint a peer an
             arbitrary colour. */
          oWeaponSprite.tint = materialTint(other && other.wpnMat);
          _lastPeerWeaponSprite = oWeaponSprite; /* v2.3.1760: QA probe */
          oWeaponSprite.visible = true;

          /* Swing arc trail.  Mirrors local at entityRenderer.js:2633 —
             special swings get 2x reach, half-circle visual arc, gold
             halo ring.  Regular swing unchanged. */
          if (oSwingActive) {
            const trailReach = oSwingSpecial ? 84 : 42;
            const startAng = aimAngle - oVisualArc / 2;
            const endAng   = aimAngle + oSwingOffset;
            const baseAlpha  = (1 - oSwingProgress) * 0.35;
            const trailAlpha = oSwingSpecial ? baseAlpha * 1.6 : baseAlpha;
            const fillColor   = oSwingSpecial ? 0xffd54a : 0xffffff;
            const strokeColor = oSwingSpecial ? 0xfff2a8 : 0xfffac8;
            const strokeWidth = oSwingSpecial ? 4 : 2;
            oWeaponGfx.moveTo(wpnX, wpnY);
            oWeaponGfx.arc(wpnX, wpnY, trailReach, startAng, endAng);
            oWeaponGfx.lineTo(wpnX, wpnY);
            oWeaponGfx.fill({ color: fillColor, alpha: trailAlpha });
            oWeaponGfx.arc(wpnX, wpnY, trailReach, startAng, endAng);
            oWeaponGfx.stroke({ color: strokeColor, width: strokeWidth, alpha: trailAlpha * 1.2 });
            if (oSwingSpecial) {
              oWeaponGfx.arc(wpnX, wpnY, trailReach + 10, startAng, endAng);
              oWeaponGfx.stroke({ color: 0xf5c542, width: 3, alpha: trailAlpha * 0.7 });
            }
          }
        } else {
          oWeaponSprite.visible = false;
        }
      } else {
        oWeaponSprite.visible = false;
      }

      /* Shield arc — same 120° wedge as local, oriented to body facing
         (no _shieldAngle broadcast).  Block-flash pulse not animated
         since _blockFlash isn't broadcast. */
      /* v2.3.1735: off, with the local cone (effectsRenderer
         SHIELD_CONE_ENABLED).  A wedge the owner finds distracting on their
         own character is not less distracting on someone else's, and every
         other player in town raising a shield would still paint one. */
      const REMOTE_SHIELD_CONE_ENABLED = false;
      if (REMOTE_SHIELD_CONE_ENABLED && oIsShielding) {
        const sR = 20;
        const sArc = Math.PI * 2 / 3;
        const startA = aimAngle - sArc / 2;
        const endA   = aimAngle + sArc / 2;
        oWeaponGfx.moveTo(0, bobY);
        oWeaponGfx.arc(0, bobY, sR, startA, endA);
        oWeaponGfx.lineTo(0, bobY);
        oWeaponGfx.fill({ color: 0x5dade2, alpha: 0.18 });
        oWeaponGfx.arc(0, bobY, sR, startA, endA);
        oWeaponGfx.stroke({ color: 0x5dade2, width: 4, alpha: 0.85 });
      }

      /* Z-order: same per-direction split as local.  Shield uses the
         forward-half (E/SE/S/SW) in front rule; weapon uses the
         E/SE/S + NE rule.

         v2.3.1791: BOTH HALVES OF v2.3.1787 APPLIED HERE TOO.  That fix — the
         owner's "SW SE and E need the sword layered in front of ... Looks like
         it is probably the shirt" — went into _updatePlayer only, so other
         bros kept carrying their sword buried under their own shirt.  This is
         the third time a defect has had to be fixed twice in this file because
         the local and remote renders are parallel implementations sharing
         variable names (v2.3.1786's ReferenceError and v2.3.1790's slung
         shield were the other two).  Worth saying plainly: when something is
         wrong with how YOUR bro is drawn, check whether it is also wrong for
         everyone else's. */
      if (display._weaponContainer && oSpriteBody) {
        /* Held weapons get SW in front, exactly as local: the greatsword is
           carried point-up (v2.3.1786) so its blade rises clear of the torso
           rather than lying across it, which is what v2.3.199 dropped SW for.
           Scoped to held types so a peer's bamboo/staff keeps that behaviour. */
        const _oHeldInHand = oWpnType === 'greatsword' || oWpnType === 'bow';
        const _oInFrontBase = facingIdx === 0 || facingIdx === 1 || facingIdx === 2 || facingIdx === 7;
        const inFront = oIsShielding
          ? (facingIdx >= 0 && facingIdx <= 3)
          : (_oHeldInHand ? (_oInFrontBase || facingIdx === 3) : _oInFrontBase);
        const bodyIdx = display.getChildIndex(oSpriteBody);
        const wcIdx   = display.getChildIndex(display._weaponContainer);
        /* "In front" is measured against the topmost VISIBLE worn layer, not
           against oSpriteBody — which is not drawn (it is the invisible
           texture/transform reference the body regions and gear copy from), so
           anchoring there buried the blade under the torso, the armour and the
           shirt.  Asked of the layers rather than hard-coded, so a gear slot
           added later joins the list instead of ending up over the blade. */
        let frontRefIdx = bodyIdx;
        for (const _r of [display._bodyHead, display._bodyTorso, display._bodyLegs,
                          display._gearLegs, display._gearShirt, display._gearChest,
                          display._gearShoulders, display._gearHead, display._shirtSprite]) {
          if (_r && _r.visible) {
            const _i = display.getChildIndex(_r);
            if (_i > frontRefIdx) frontRefIdx = _i;
          }
        }
        const targetIdx = inFront
          ? (wcIdx > frontRefIdx ? frontRefIdx : frontRefIdx - 1) + 1
          : (wcIdx > bodyIdx ? bodyIdx : Math.max(0, bodyIdx - 1));
        if (wcIdx !== targetIdx) {
          display.setChildIndex(display._weaponContainer, targetIdx);
        }
        /* QA probe (mp-peersword) — one entry per peer id. */
        try {
          /* v2.3.2272: armed only, and null-prototype -- as __btPeerShield. */
          if (!window.__btPeerSword) window.__btPeerSword = Object.create(null);
          if (window.__btProbe) window.__btPeerSword[id] = {
            facing, wpnType: oWpnType, inFront,
            wcIdx: display.getChildIndex(display._weaponContainer),
            bodyIdx, frontRefIdx,
            shirtVis: !!(display._shirtSprite && display._shirtSprite.visible),
            gearChestVis: !!(display._gearChest && display._gearChest.visible),
            gearChestIdx: display._gearChest ? display.getChildIndex(display._gearChest) : -1,
            bladeUp: display._weaponSprite ? display._weaponSprite.scale.y < 0 : null,
          };
        } catch (e) { /* never breaks the frame */ }
      }
      /* v2.3.354: beard z-order for remote players (same rule as local).
         v2.3.1934: THEIR hat id, so a peer in a keffiyeh gets the same
         beard-over-the-drape order the local player does. */
      _orderTraitsAndWeapon(display, facingIdx, other.headwear);

      /* v2.3.1011: while this remote is mid sword/greatsword swing, the
         effectsRenderer stand-in (_updateRemoteSwordSwings) replaces their
         body + weapon, so hide the normal body / gear / traits / procedural
         weapon-arc to avoid a double image. */
      {
        const _sw = other._swingWpn;
        const _melee = !_sw || _sw === 'sword' || _sw === 'greatsword';
        const _meleeSwing = _melee && other._swingTs && (now - other._swingTs) < SWORD_SWING_MS;
        const _bowDraw = other._bowShotAt && (now - other._bowShotAt) < BOW_SHOT_MS;
        if (_meleeSwing || _bowDraw) {
          if (display._spriteBody) display._spriteBody.visible = false;
          if (body) body.visible = false;
          _hideBodyRegions(display);
          for (const _k of ['_headwearSprite', '_facialHairSprite', '_hairSprite', '_shirtSprite',
            '_gearShirt', '_gearLegs', '_gearChest', '_gearShoulders', '_gearHead']) {
            if (display[_k]) display[_k].visible = false;
          }
          if (display._weaponContainer) display._weaponContainer.visible = false;
        }
      }

      /* v2.3.1185: party members get a marker on the nameplate — the
         cheapest possible in-world indicator (rides the existing
         _lastName change-cache; no new display objects).  S._party is
         the last party_state snapshot (gameEvents.js). */
      const _inParty = S._party && S._party.members
        && S._party.members.some((m) => m.id === id);
      /* ═══ v2.3.1970: A PEER'S NAME IS A TEXTURE, SO IT NEEDS A CEILING ═══
         This line and _updateNamePill below are the only two places a peer's
         name becomes pixels, and NAME_STYLE has no wordWrap -- so whatever
         arrives is laid out as ONE line.  The server now clamps the name at
         join (join.js sanitizeDisplayName, same version), which is where the
         rule is actually enforced; this is the other half of TRAPS #19's
         "fix both or you fix neither", because the worker and the client ship
         independently and a client that meets an un-upgraded worker must not
         be the thing that breaks.  The creator's own input stops at 20 chars,
         so 48 is generous for anything honest and still a bounded texture:
         before this, an unbounded name was a Text some tens of thousands of
         px wide, past the max texture size of every iOS GPU -- painted over
         that player's head on every other screen in the room, and (unlike a
         chat bubble) persisting for as long as they stood there.
         Clamped HERE rather than at the three ingest roads (state_sync,
         player_join, the `track` relay's Object.assign) on purpose: TRAPS #13's
         lesson is to close the class, and the class is "a name reaching the
         renderer", which is exactly one line.
         Change-cached on the RAW string, the same idiom `_lastName` right
         below uses: a peer's name changes about never, and this is the per-
         remote-player hot path -- the regex should run when the name moves,
         not sixty times a second per peer. */
      const _rawName = typeof other.name === 'string' ? other.name : '';
      if (display._lastRawName !== _rawName) {
        display._lastRawName = _rawName;
        display._safeName = _rawName.replace(/[\x00-\x1f\x7f]/g, ' ').slice(0, 48).trim() || 'Anon';
      }
      const nextName = (_inParty ? '\u{1F389} ' : '') + display._safeName;
      if (display._lastName !== nextName) {
        display._lastName = nextName;
        display._nameText.text = nextName;
      }
      /* v2.3.1566: the above-head text is retired (see the display
         factory); the plate below the feet is the nameplate now.  Dead
         peers lose it so it doesn't hover over a prone body — the same
         rule the local player follows. */
      _updateNamePill(display, nextName, other.rpgLv || 1, !other._isDead, other.bro);

      /* v2.3.1193: threat skull above the nameplate — same change-cache
         pattern as the party marker.  S._threatMarks is written by
         gameEvents.js from the relayed threat handshake; the phase
         helper self-whitens a lapsed red mark (expiry == ignore) so
         bystanders — who never receive the private threat_expired —
         still see the fight-window skull. */
      const _tm = S._threatMarks ? S._threatMarks[id] : null;
      const _skullPhase = _tm ? threatSkullPhase(_tm.type, _tm.until, now) : null;
      if (display._lastSkull !== _skullPhase) {
        display._lastSkull = _skullPhase;
        display._skullText.visible = !!_skullPhase;
        if (_skullPhase) display._skullText.tint = _skullPhase === 'red' ? SKULL_RED_TINT : 0xffffff;
      }
      if (_skullPhase) display._skullText.y = -58 + bobY;
    }

    for (const [id, display] of this.otherPlayerDisplays) {
      if (!activeIds.has(id)) {
        display.destroy({ children: true });
        this.otherPlayerDisplays.delete(id);
      }
    }
  }

  _updatePlayer(S, now) {
    /* v2.3.1713 (owner: "move the life skill extraction gestures to be in
       front of the other stuff.  The woodcutting gesture was largely hidden
       behind a tree").  Mining and fishing are the two gathering gestures
       with NO stand-in figure — the pose plays on the player's own body — so
       the promotion that lifted the chop/cook/fire stand-ins to gestureFront
       has to lift the BODY for those two, or a tree beside the rock still
       swallows the miner whole (measured: a tree over the vein hid every
       pixel of him, leaving only the ore, which v2.3.854 already draws on
       top).  Gated on an ACTIVE extraction and on those two skills only:
       with no extraction the body is back in playerLayer, so merely standing
       — or fighting — behind a tree stays occluded, which is the whole point
       of v2.3.1500.  The defensive every-frame re-attach below is preserved,
       just aimed at whichever layer this frame wants. */
    const _exSkill = (S._extraction && (S._extraction.status === 'waiting' || S._extraction.status === 'ready'))
      ? S._extraction.skill : null;
    const _bodyLayer = ((_exSkill === 'mining' || _exSkill === 'fishing') && this.gestureLayer)
      ? this.gestureLayer : this.playerLayer;
    if (!this.playerDisplay || this.playerDisplay.destroyed) {
      this.playerDisplay = createPlayerDisplay();
      _bodyLayer.addChild(this.playerDisplay);
    } else if (this.playerDisplay.parent !== _bodyLayer) {
      /* Defensive re-attach.  Something on zone change was detaching
         the playerDisplay from the player layer (or removing it from
         the scene graph altogether) and the user reported the avatar
         going invisible in other zones.  This re-parents it every
         frame if it's missing.  Cheap when already attached (no-op). */
      _bodyLayer.addChild(this.playerDisplay);
    }

    const P = S.player;
    const display = this.playerDisplay;
    if (typeof window !== 'undefined' && window.__btMaskDebug) window.__playerDisplay = display;
    /* ═══ v2.3.2078: WHERE THE PLAYER IS ACTUALLY DRAWN ═══
       The sibling of __btNpcSprites, for the local character.  Every
       colour-probe scenario (mp-facingside, mp-cosmpose, mp-skinworld,
       mp-southshirt) crops a fixed 88x104-ish box off the player's world
       position and counts coloured pixels in it.  That box is roughly twice
       the figure, and what fills the rest is whatever the town happens to
       have behind him -- so when v2.3.2069 moved the fountain to the plaza
       the CONTROL reading started finding 4455 blue pixels on a character
       with no drawings on him at all, and four assertions in each scenario
       failed for a reason that had nothing to do with the art.
       Guessing a tighter fraction of the screen would just move the guess.
       This reports the figure the renderer really drew -- its world footY
       and its drawn width/height, exactly the three numbers _npcDrawn
       carries -- so a crop can be derived instead of estimated. */
    if (typeof window !== 'undefined') {
      const _pb = display._spriteBody;
      window.__btPlayerDrawn = () => ({
        x: display.x,
        footY: display.y,
        width: _pb && _pb.texture ? Math.abs(_pb.texture.width * _pb.scale.x) : 0,
        height: _pb && _pb.texture ? Math.abs(_pb.texture.height * _pb.scale.y) : 0,
        /* ═══ v2.3.2124: THE NUMBER THAT WAS MISSING ═══
           width/height above read the BODY sprite's own scale, and the zone's
           perspective shrink is applied to the CONTAINER -- so on a vista map
           this probe reported an unchanged 115x115 while the figure on screen
           was at 55% and falling to 3% toward the rim.  That gap cost two
           wrong measurements and a wrong answer to the owner about whether
           the character shrinks outside town (it does, on the World View, by
           design since v2.3.859).  The container scale is the one number that
           settles it, so it is published. */
        scale: display.scale && typeof display.scale.y === 'number' ? display.scale.y : null,
        visible: display.visible,
      });
      /* ═══ v2.3.2262: THE PLATE AS THE SCREEN SEES IT ═══
         The owner's request is about legibility, which is a SCREEN size --
         and the plate's own height is in world units, so reading it off the
         object answers the wrong question (TRAPS §37, measuring a drawing
         against the box that defines it).  getBounds() walks up through
         worldContainer, so what comes back already has the camera zoom in it:
         the number a reader's eye actually gets.
         `res` rides along because growing a Pixi Text without moving its
         resolution buys size at the cost of sharpness -- bigger AND blurrier,
         the v2.3.1821 trap on this very plate -- so a test that checks the
         size without checking the rasterisation would pass on the bad fix. */
      window.__btPlateBox = () => {
        const pill = display._namePill;
        if (!pill || !pill.visible) return null;
        let b = null;
        try { b = pill.getBounds(); } catch (e) { return null; }
        return {
          w: b ? Math.round(b.width * 10) / 10 : 0,
          h: b ? Math.round(b.height * 10) / 10 : 0,
          zoom: display._pillZoom || 1,
          res: (display._pillName && display._pillName.resolution) || 0,
          fontPx: (display._pillName && display._pillName.style && display._pillName.style.fontSize) || 0,
        };
      };
    }
    /* Force visibility every frame — same defensive concern as the
       parent re-attach above.
       v2.3.846: ...except while a woodcutting chop is active — the chopper
       sprite (effectsRenderer) stands in for the avatar beside the tree,
       so hide the real one to avoid a double character.
       v2.3.853: same for cooking (the cook+pan sprite stands in beside the
       campfire) and firemaking (the crouching-to-light sprite stands in at
       the player).
       v2.3.1713: _exSkill is now computed at the top of this method (the
       body's LAYER depends on it too) — one read, same value. */
    const _chopHide = _exSkill === 'woodcutting' || _exSkill === 'cooking' || !!S._firemaking;
    display.visible = !_chopHide;
    display.x = P.x;
    /* v2.3.1476 (owner: "move the stone that comes with the mining
       animation like another 8 pixels up ... it sits a little beneath
       the ore sprite"): the mine-south sheet has a rock baked in under
       the boots, and v2.3.854 already draws the real ore vein ABOVE the
       player to hide it — but the baked rock pokes out below.  Erasing
       it from the art isn't an option: it is one connected blob with
       the boots (checked), so a cut takes the feet with it.  Lifting
       the whole mining figure 8px tucks the baked rock behind the ore
       instead, and moves body + gear + traits + tool together so
       nothing can drift apart. */
    display.y = P.y - (_exSkill === 'mining' ? 8 : 0);

    /* v2.3.858: per-zone player render scale -- shrink the avatar on vista
       maps (e.g. the Overlook) so it doesn't dwarf the landscape.
       zone.playerScale is either a flat number, or { near, far } to scale by
       distance from the zone centre (bigger at the plateau, smaller toward the
       distant edges). Absent => 1 (normal). v2.3.1091: extracted to
       _zonePscale and shared with the remote-player path. */
    {
      /* ═══ v2.3.2124: YOUR OWN FIGURE LOOKS THROUGH THE LENS ═══
         SUPERSEDED BY v2.3.2141, immediately below -- kept because it is the
         record of what was tried and why it was undone, not a description of
         what this code does now.
         Owner: "there was a fair point about the character being too small in
         worldview.  Maybe it can show character full size but through a
         'magnifying glass'."

         The vista curve above is doing its job too well on the one figure you
         steer -- on the World View it renders you at 55% at the plateau and
         3% out toward the rim (ZONES.worldview.playerScale, v2.3.859).  A
         zone that declares `playerLens` opts the LOCAL player out of the
         curve and into a flat readable scale; tileRenderer draws the glass
         under him so it reads as a magnifier rather than as a character that
         failed to shrink.

         LOCAL ONLY, on purpose: the remote path a few hundred lines up keeps
         calling _zonePscale, so other players still recede into the distance
         and the vista still has depth.  What changes is that the one figure
         you are responsible for stays findable. */
      /* ═══ v2.3.2141: AND BACK ONTO THE CURVE ═══
         Owner: "Change the character back to tiny on worldview and center
         them inside the magnifying glass (that'll be enough)."

         The opt-out above is gone.  A figure at 90% on a map drawn to look
         miles away does not read as magnified, it reads as un-shrunk -- and
         it is the ONE figure whose size the vista's depth is judged by, so
         the exception was flattening the effect it stood in the middle of.
         What survives is the ring (tileRenderer._drawPlayerLens): the answer
         to "where am I" that costs the map nothing.

         So there is no lens branch here any more -- your figure takes the
         same _zonePscale as every peer, on the World View and everywhere
         else.  `playerLens` is now purely a DRAWING instruction, which is why
         the zone entry lost its `scale` key rather than this reading a 1. */
      const pscale = this._zonePscale(S, P.x, P.y) * PLAYER_SIZE_MULT; /* v2.3.1274 */
      /* v2.3.1953: your own build.  Read from the store rather than from S,
         the same way this path reads your skin, shirt art and patterns — the
         creator writes it there and the store is the one copy. */
      display.y += _applyBuildScale(display, pscale, getBuildHeight(), getBuildFrame());
      /* ═══ v2.3.2141: THE ONE NUMBER THE GLASS NEEDS ═══
         The lens is drawn by tileRenderer, which knows where your feet are and
         nothing about how big you are being drawn -- and "centre the glass on
         him" is a question only the figure's live scale can answer, because
         the World View's curve changes it with every step you take.

         Published on S rather than imported, deliberately: tileRenderer
         importing entityRenderer would close a cycle (entityRenderer already
         reaches for the tile layer's walkability), and a constant copied into
         the other file would be a second copy of PLAYER_SIZE_MULT and the
         build scale -- the exact drift the _zonePscale extraction (v2.3.1574)
         was made to end.  Read a frame later at worst, which at 3% per step
         is invisible; a missing value falls back to 1 there, which is the
         right answer on every zone that has no curve at all. */
      S._figureScaleY = display.scale && typeof display.scale.y === 'number'
        ? display.scale.y : 1;
    }

    /* Self death visual — play the death sprite animation (player ->
       skeleton -> bone pile).  S._deathStart is set in the death
       handlers in BroTown.jsx and cleared on respawn.  Gate on a
       3.5 s window from the timestamp so the local-monster death
       path (synchronous hp restore) still gets a visible animation;
       also stay dead while hp <= 0 so the 5 s server-monster
       respawn window holds the corpse on screen the whole way.

       Defensive: if hp dropped to 0 but no death handler set
       _deathStart (e.g. a damage path we missed, or a race where
       the renderer runs between the hp decrement and the handler's
       _deathStart assignment), seed it ourselves.  Cleared on
       respawn by the handlers, so this only kicks in when nothing
       else set it. */
    if (S.rpg && S.rpg.hp <= 0 && !S._deathStart) {
      S._deathStart = Date.now();
    }
    const _selfElapsed = S._deathStart ? Date.now() - S._deathStart : Infinity;
    const selfDead = selfCorpseUp(S);
    if (selfDead) {
      /* ═══ v2.3.2281: THE CORPSE WAS INSIDE A HIDDEN CONTAINER ═══
         The gathering stand-in does not merely draw over the body, it hides
         this whole display -- and nothing here turned it back on, so dying
         while chopping or cooking played NO death animation at all: a frozen
         lumberjack, and the corpse behind him in an invisible container.
         The peer path has had this line since v2.3.1092 with the note "a
         harvest stand-in may have hidden this container last frame; the corpse
         renders through it"; the local path, which is the one the player
         actually watches themselves die in, never got it. Found by
         mp-deathstrip reporting `corpse: false` on a mid-harvest death while
         every worn layer read clean -- the absence a hide-list test cannot
         see, because there was nothing left to hide. */
      if (!display.visible) display.visible = true;
      if (display.alpha !== 1) display.alpha = 1;
      if (display.rotation !== 0) display.rotation = 0;
      const _selfSpriteBody = display._spriteBody;
      const _selfBody = display._body;
      if (hasPlayerDeathSprites() && _selfSpriteBody) {
        const _selfTex = getPlayerDeathFrame(playerDeathFrameForElapsed(_selfElapsed));
        if (_selfTex && _selfSpriteBody.texture !== _selfTex) _selfSpriteBody.texture = _selfTex;
        _selfSpriteBody.tint = 0xffffff;
        /* 50% scale — matches the remote-render scale below; source
           death frames fill more of the 128 px canvas than the living
           sprite does. */
        _selfSpriteBody.scale.set(0.5);
        _selfSpriteBody.visible = true;
        if (_selfBody) _selfBody.visible = false;
      } else if (_selfSpriteBody) {
        display.alpha = 0.45;
        display.rotation = Math.PI / 2;
      }
      if (display._weaponContainer) display._weaponContainer.visible = false;
      if (display._shieldSprite) display._shieldSprite.visible = false;
      if (display._handCapSprite) display._handCapSprite.visible = false;
      if (display._handArmSprite) display._handArmSprite.visible = false;
      if (display._nftFront) display._nftFront.visible = false;
      if (display._nftBack) display._nftBack.visible = false;
      /* ═══ v2.3.1887: HIDE BY EXCEPTION, NOT BY LIST ═══
         Owner: "When I died my shield stayed visible while the death
         animation played.  Also hide the shield when this death animation
         plays."

         The shield in question is the SLUNG one (_shieldBackLo/_shieldBackHi,
         v2.3.1782) — the held one was already hidden two lines up, which is
         why this reads as "the shield" being half-fixed.

         The real defect is the shape of the fix it replaces.  v2.3.1473
         answered "upon death don't display the character armor or any other
         worn pieces" with a hand-written list of layers to hide, and that
         list is only correct until the next layer is added.  The back shield
         arrived 300 versions later and nobody thought to add it, so a corpse
         wore a floating shield for two months.  Adding two more names would
         buy exactly as long.

         So it is inverted: a small KEEP set of things that legitimately
         outlive the body — the corpse sheet itself, the name plate, the combo
         counter, the floating vitals, and the two MASKS (a mask paints
         nothing, and hiding one can only disturb the sprite it clips) — and
         everything else in the display goes.  A worn layer added tomorrow is
         hidden on death by default, which is the safe direction and the one
         the owner's rule asks for.  mp-deathshield pins it. */
      const _deathKeep = [
        _selfSpriteBody, display._namePill, display._comboText,
        display._handCapMask, display._handArmMask,
        display._hudHpBarFrame, display._hudHpBarFill, display._hudHpRing,
        display._hudHpText, display._hudHpMaxText,
        display._hudMpEmpty, display._hudMpSprite, display._hudMpTextEmpty, display._hudMpTextFull,
        display._hudStamEmpty, display._hudStamSprite, display._hudStamTextEmpty, display._hudStamTextFull,
      ];
      _hideExceptDeep(display, _deathKeep);
      /* v2.3.1887: the back-shield probe is written on the LIVING path only,
         and this branch returns before reaching it — so it kept reporting the
         last living frame's `on: true` over a corpse with no shield on it.
         A probe that survives the thing it describes is worse than no probe:
         it is what a test believes.  Stamped here so the reading matches the
         screen.  (Same trap as __btSouthBlockWeapon, v2.3.1871.) */
      if (typeof window !== 'undefined') {
        window.__btBackShield = { on: false, dead: true, behind: false, front: false };
      }
      return;
    }
    /* Living — restore weapon container visibility (might have been
       hidden by a previous death frame). */
    if (display._weaponContainer && !display._weaponContainer.visible) {
      display._weaponContainer.visible = true;
    }
    /* v2.3.844: during the fishing pose the character holds the rod (baked
       into the 'fish' sheet), so suppress the equipped weapon + shield +
       hand caps -- otherwise the bamboo staff renders as a stray second
       item beside them.  Mirrors how the pose locks facing south.
       v2.3.854: same for mining -- the pickaxe is baked into the 'mine'
       sheet, so the equipped weapon must not show. */
    const _fishingPose = !!(S._extraction && (S._extraction.skill === 'fishing' || S._extraction.skill === 'mining'));
    /* v2.3.910: melee swing -> play the sword-swing stand-in (effectsRenderer)
       and hide the real body + weapon for the swing window.  Gated on the melee
       swing flag and no active gathering/firemaking.
       v2.3.936: pick the sheet by the DOMINANT AXIS of the swing angle, not the
       8-way render facing.  The big sword sweeps a wide arc, so 3 sheets cover
       everything: the north sheet plays for any up-dominant aim (covers NW/N/NE
       that are "more north"), south for any down-dominant aim, and east/west for
       any horizontal-dominant aim (so a NE/SE that's "more east than N/S" plays
       the east swing).  baseAngle is published by monsterCombat (S._swingAng);
       fall back to the 8-way facing if it isn't set yet.  Visual only. */
    /* v2.3.1071: follow LIVE aim each frame so a mid-swing rotation re-points the
       body instead of freezing at the swing-start facing. Fall back to the locked
       swing angle, then the 8-way facing. The frame index stays time-based, so a
       direction switch just hands off to the new sheet at the same frame. */
    let _swingAng = (S._aimAngle != null) ? S._aimAngle
                  : (S._lastAimAngle != null) ? S._lastAimAngle
                  : S._swingAng;
    if (_swingAng == null) {
      const _si = SECTORS.indexOf(S._renderFacing);
      _swingAng = _si >= 0 ? _si * (Math.PI / 4) : Math.PI / 2;  // SECTORS[i] = i*45deg, south default
    }
    const _sdx = Math.cos(_swingAng), _sdy = Math.sin(_swingAng);  // +y = down/south
    const _swordDir = Math.abs(_sdx) >= Math.abs(_sdy)
      ? (_sdx >= 0 ? 'east' : 'west')
      : (_sdy >= 0 ? 'south' : 'north');
    const _swordSwing = !!(S.isSwinging && S.swingTimer
      && (now - S.swingTimer) < SWORD_SWING_MS && !S._extraction && !S._firemaking);
    S._swordSwinging = _swordSwing;
    S._swordSwingDir = _swordSwing ? _swordDir : null;
    /* v2.3.925: bow-shoot stand-in -> driven by a ranged-bow shot
       (S._bowShotAt set in monsterCombat when an arrow fires).  Resolve the
       shot ANGLE (S._bowShotAng, toward the target) to a compass sector and
       only show for the authored facings (east/west/southwest/southeast).  Other
       aim angles fall back to the normal ranged render until their art exists. */
    const _BOW_FACINGS = ['east', 'west', 'southwest', 'southeast', 'south', 'northwest', 'northeast', 'north'];
    let _bowDir = null;
    if (S._bowShotAt && (now - S._bowShotAt) < BOW_SHOT_MS && S._bowShotAng != null
        && !S._extraction && !S._firemaking) {
      /* v2.3.1071: the body pose follows LIVE aim during the shot window (the
         arrow keeps its fire-time angle S._bowShotAng), so a rapid turn re-points
         the bro instead of freezing at the shot's original facing. */
      const _aimNow = (S._aimAngle != null) ? S._aimAngle
                    : (S._lastAimAngle != null) ? S._lastAimAngle
                    : S._bowShotAng;
      const _bsec = Math.round(_aimNow / (Math.PI / 4));
      const _bf = SECTORS[((_bsec % 8) + 8) % 8];
      if (_BOW_FACINGS.includes(_bf)) _bowDir = _bf;
    }
    /* ═══ v2.3.1800: A RAISED SHIELD BORROWS THE BOW POSE ═══
       Owner: "are you allowing the legs to move (jog motion while blocking)
       and just freezing the top half?  Thats what I'd prefer.  Otherwise the
       character will look like they're sliding."  And: "I can see a slight arm
       straight down on the southwest angle above where he's holding the shield
       straight out arm."

       Both of those are the same fault, and it is the COMPOSITE: v2.3.1785 cut
       an arm out of the bow art and pasted it onto the walking body, so the
       body's OWN arms are still under it — swinging while jogging, and poking
       out below at southwest.  v2.3.1798 froze the body to hide that, which
       traded three arms for sliding feet.  Neither is a fix; both are ways of
       arranging one.

       So stop pasting an arm onto a body that has two, and draw the body that
       already holds one out: the bow stand-in.  It is the same art the arm was
       cut FROM, it is already wired for exactly this shape of problem — the
       jog-legs composite (v2.3.1072/1080/1088) draws animated legs under a
       leg-erased torso strip, which IS "legs move, top half frozen" — and it
       carries the gear, shirt, traits and skin recolour that a hand-cut arm
       had to be taught one at a time.  Hiding its bow is one line.

       Three things fall out of this for free:
         - SOUTH DOES NOT WORK, and this comment claimed it did.  v2.3.1805
           corrected it: the south body sheet has the bow erased out of it and
           the bow crosses the FACE there, so hiding the bow exposes a slot cut
           through the head.  See the exclusion above.  (The original claim was
           made off a 140px screenshot in which the shield covered the torso;
           the owner found the face.)
         - The composited arm still draws, exactly on top of the torso's own —
           it was cut from this art at this scale, so it aligns by construction
           — and it is what carries the shield's hand position.
         - Peers are unaffected: a peer's block is not broadcast (see PR #438),
           so nothing here can desync.

       GATED ON THE ART BEING LOADED.  A bow shot lasts 400ms, so if its
       stand-in were ever missing you would barely see it; a block is held, so
       an unguarded version of this would leave the player INVISIBLE for as
       long as they held the button — the real body is hidden the moment
       _bowShowing goes true.  Everything preloads before the intro lifts (the
       animation-preloading law), so this should never fire; it costs one flag
       to make sure. */
    let _blockPose = false;
    /* ═══ v2.3.1805: NOT SOUTH ═══
       Owner: "For shield hold, part of the characters face is missing or keyed
       out facing south."  Correct, and v2.3.1800's claim that the stand-in had
       finally given south a block pose was WRONG — I checked it in a 140px
       screenshot where the shield covered the torso and never looked at the
       head.

       The cause is in the art and is not tunable.  bow-<dir>-body.png is the
       sheet with the WEAPON erased, and in the south pose the bow is held
       vertically in front of the face: erasing it cuts a slot straight down
       through the head, which the bow itself then covers.  Hide the bow — which
       is exactly what a block does — and the slot is exposed.  Measured on the
       sheet rather than guessed: rendering bow-south-body frame 1 over magenta
       shows a clean vertical gap through the face in ALL THREE frames, so no
       choice of BLOCK_POSE_FRAME escapes it.  east, northwest and north are
       clean; only south is holed.
       So south keeps the pre-v2.3.1800 behaviour (real body, planted stance,
       shield in front), and the honest position is the one v2.3.1789 already
       reached: a south block needs painted south art. */
    if (!_bowDir && S._shieldUp && S.rpg && S.rpg.shield && S._bowArtReady) {
      const _sa = (S._shieldAngle != null) ? S._shieldAngle
                : (S._aimAngle != null) ? S._aimAngle : (S._facingAngle || 0);
      const _bf2 = SECTORS[((Math.round(_sa / (Math.PI / 4)) % 8) + 8) % 8];
      if (_bf2 !== 'south' && _BOW_FACINGS.includes(_bf2)) { _bowDir = _bf2; _blockPose = true; }
    }
    S._blockPose = _blockPose;
    const _bowShot = !!_bowDir;
    S._bowShowing = _bowShot;
    S._bowDir = _bowDir;
    if (_fishingPose || _swordSwing || _bowShot) {
      if (display._weaponContainer) display._weaponContainer.visible = false;
      if (display._shieldSprite) display._shieldSprite.visible = false;
      if (display._handCapSprite) display._handCapSprite.visible = false;
      if (display._handArmSprite) display._handArmSprite.visible = false;
    }

    const body = display._body;

    const torso = S.bodyTorso || '#2563eb';
    const legs = S.bodyLegs || '#1e3a5f';
    const head = S.myColor || '#5b52ff';
    const slim = S.bodySize === 'slim';
    const bw = slim ? 12 : 16;
    const bh = slim ? 22 : 24;
    const isMoving = Math.abs(P.vx || 0) > 0.01 || Math.abs(P.vy || 0) > 0.01;
    const bobY = isMoving ? Math.sin(now / 120) * 2 : 0;
    /* v2.3.1365: player shadow removed — no stride wobble to drive. */

    /* Match the Canvas 2D facing logic exactly (BroTown.jsx ~13125-13137):
       1. S._shieldUp → S._shieldAngle (shield direction)
       2. S._aimAngle when backpedaling OR (idle && autoAttack)
       3. Live left-joystick stick (instant — only used when 1 and 2 fail)
       4. Velocity (desktop keyboard fallback)
       5. Smoothed S._facingAngle (last movement direction)
       6. Legacy S._facing
       Notably, S._aiming is NOT a trigger — it was making the body lock
       to the right-joystick aim even after the user thought they had
       released, because S._aiming had stale state in some flows. */
    const swingActive = S.isSwinging && S.swingTimer && (now - S.swingTimer) < SWING_ANIM_MS;
    /* v2.3.1735: Shield Bash holds the shield up for its animation window
       (src/game/abilities.js _bashPose).  It is a POSE, not a block — the
       flag is deliberately separate from S._shieldUp because that one goes
       on the wire as `blocking` (wsClient) and would buy real mitigation.
       So it feeds the shield SPRITE and the body's facing below, and
       nothing else: no guard wedge, no parry window, no stamina drain. */
    const bashPose = (S._bashPose && now < S._bashPose.until) ? S._bashPose : null;
    if (S._bashPose && !bashPose) S._bashPose = null;   /* reap on expiry */
    const isShielding = !!S._shieldUp;
    /* Either reason to have the shield in hand.  Kept distinct from
       isShielding so every existing block-only branch (the guard arc, the
       block flash, the aimRefAngle ladder) keeps reading the real flag. */
    const shieldVisible = isShielding || !!bashPose;
    const shieldPoseAng = bashPose ? bashPose.ang : null;
    /* v2.3.176 (F4): "in combat" predicate -- when false, weapon and
       shield render on the player's back instead of in the hand /
       front of the body. Triggers: actively aiming (right stick),
       locked onto a monster, holding the shield up, or hit within the
       last 5 seconds. The damage-window keeps the player "drawn"
       during brief lulls between hits so the weapon doesn't sheathe
       mid-fight just because they paused for half a second.

       v2.3.180: SHEATHED_DEFAULT_ENABLED flag. User wants to evaluate
       "always carry in hand" vs the F4 sheathed default. Flip to true
       to bring back the on-back render. */
    const SHEATHED_DEFAULT_ENABLED = false;
    const _combatTriggers = !!S.autoAttack
                         || !!S.lockedTarget
                         || isShielding
                         || (S.lastDamageTaken && Date.now() - S.lastDamageTaken < 5000);
    const isInCombat = !SHEATHED_DEFAULT_ENABLED || _combatTriggers;
    /* ═══ v2.3.2246: AN ENGAGED BODY FACES WHAT IT IS ENGAGED WITH ═══
       Owner: "Every move you make is now relative to that target."
       The two original triggers only cover half of "relative": _backpedaling
       fires when you move AWAY from the aim, and (!isMoving && autoAttack)
       when you stand still and swing.  Move TOWARD the locked monster, or
       strafe across it, and both are false -- the ladder fell through to the
       `stickActive` branch and the body turned to face the joystick, so a
       player circling a slime watched their character look where their thumb
       pointed instead of at the thing they were fighting.  A held MONSTER
       lock is the third trigger, which makes the whole 8-way circle
       target-relative: forward jog toward it, reversed jog away from it
       (isMovingBackward, just below), and the body pinned on it throughout.
       (There is no sideways strafe STRIP -- the art is forward frames plus a
       reversed cycle -- so a sideways push resolves to whichever of the two
       the dot product picks, exactly as the old right-stick controls did.)
       NPC locks are excluded on purpose: tapping a shopkeeper locks one, and
       walking away from the mayor while staring at him is not a combat
       stance. */
    /* v2.3.2251: the RENDER twin of BroTown's _lkFace, and it has to use the
       same predicate or the sprite faces the target while the movement code
       does not.  A bare lock is automatic now — see targeting.engagedStance. */
    const lockFacing = engagedStance(S);
    const aimAttackActive = S._aimAngle != null && (lockFacing || S._backpedaling || (!isMoving && S.autoAttack));
    /* useAimDirection drives the slowed + reverse jog animation —
       still want it true during a swing window so the legs stay in
       sync with the attack-locked body. */
    /* v2.3.1735: bashPose joins this so the LEGS stay locked to the shove.
       Bash no longer raises isSwinging (it is not a sword swing any more),
       so without this the jog animation would drop out of aim-relative mode
       mid-pose and the feet would walk off the direction the body faces. */
    const useAimDirection = isShielding || aimAttackActive || swingActive || !!bashPose;
    const aimRefAngle = bashPose
      ? bashPose.ang
      : isShielding
        ? (S._shieldAngle != null ? S._shieldAngle : (S._facingAngle || 0))
        : (S._aimAngle != null ? S._aimAngle : (S._facingAngle || 0));
    let isMovingBackward = false;
    if (useAimDirection && isMoving) {
      const dotProd = (P.vx || 0) * Math.cos(aimRefAngle) + (P.vy || 0) * Math.sin(aimRefAngle);
      isMovingBackward = dotProd < 0;
    }

    const stickX = S.stickX || 0;
    const stickY = S.stickY || 0;
    const stickActive = stickX !== 0 || stickY !== 0;

    /* Loot pickup freeze — override all other facing logic and face
       the camera so the pickup animation reads. Highest priority so
       autoAttack / shield / aim don't leak through during the 0.5s. */
    const lootFrozen = S._lootFreezeUntil && Date.now() < S._lootFreezeUntil;
    /* Mining gather — face the camera (south) so the mining swing reads,
       same lock as the loot freeze.  Active for the whole extraction
       window (waiting + ready). */
    const mining = !!(S._extraction && S._extraction.skill === 'mining');
    /* v2.3.843: fishing gather — same south-only facing lock as mining so
       the rod cast/sway reads and the dangling line lines up with the water
       hole drawn beneath the player (effectsRenderer._updateFishingHole). */
    const fishing = !!(S._extraction && S._extraction.skill === 'fishing');
    /* v2.3.1534: the §5.8 dodge roll owns the body for its whole window. */
    const dodging = !!S._dodgeRoll;
    let facing;
    /* ═══ v2.3.1837: A TURN IS A FACING, NOT JUST A POSE ═══
       Owner: "the character when idle faces whatever direction he last moved
       instead of the direction he last rotated.  It needs to be the direction
       last faced."

       The idle branch at the bottom of this ladder reads S._facingAngle, and
       that angle only ever learned about WALKING: visualSystems slews it
       toward S._targetFacingAngle, and the only thing that ever set the target
       was velocity —
           if (absDx > 0.02 || absDy > 0.02) S._targetFacingAngle = atan2(dy, dx)
       So every branch ABOVE isMoving could turn the body — the guard angle,
       the aim, the movement stick pushed against a wall — and the moment it
       let go the body snapped back to the last direction the player had
       actually WALKED, discarding the turn.

       Stamping the resting target with whatever angle just decided the facing
       makes "last faced" literally true, and it is done HERE, once, rather
       than at the dozen sites that write an aim angle: this is the ladder that
       decides which way the body points, so it is the only place that knows
       which of them won this frame.  Velocity still owns the target while
       walking (visualSystems rewrites it every frame you move), so this only
       takes effect for a turn that was NOT a walk — which is the ask.

       The forced-south poses are deliberately excluded: loot pickup, mining
       and fishing point the body at the camera so their animation reads, and
       none of them is the player choosing a direction. */
    let facedAng = null;
    if (lootFrozen) {
      facing = 'south';
    } else if (mining || fishing) {
      facing = 'south';
    } else if (dodging) {
      /* Face the direction of travel.  The roll moves the player by writing
         x/y directly (BroTown.jsx), NOT through vx/vy, so the isMoving branch
         below would miss it and the tumble would play toward whatever the
         player happened to be facing when they swiped. */
      const sector = Math.round(S._dodgeRoll.angle / (Math.PI / 4));
      facing = SECTORS[((sector % 8) + 8) % 8]; facedAng = S._dodgeRoll.angle;
    } else if (bashPose) {
      /* v2.3.1735: the bash owns the body for its window, exactly as the
         dodge roll above does.  Placed ahead of the shield/aim branches so
         steering mid-animation cannot swivel a shove that has already been
         thrown — the worker picked its target from the angle stamped at
         cast time, so the body must not drift off it and lie about where
         the hit went. */
      const sector = Math.round(bashPose.ang / (Math.PI / 4));
      facing = SECTORS[((sector % 8) + 8) % 8]; facedAng = bashPose.ang;
    } else if (isShielding && S._shieldAngle != null) {
      const sector = Math.round(S._shieldAngle / (Math.PI / 4));
      facing = SECTORS[((sector % 8) + 8) % 8]; S._facingSrc = 'shield'; facedAng = S._shieldAngle;
    } else if (aimAttackActive) {
      const sector = Math.round(S._aimAngle / (Math.PI / 4));
      facing = SECTORS[((sector % 8) + 8) % 8]; S._facingSrc = 'aim'; facedAng = S._aimAngle;
    } else if (stickActive) {
      const ang = Math.atan2(stickY, stickX);
      const sector = Math.round(ang / (Math.PI / 4));
      facing = SECTORS[((sector % 8) + 8) % 8]; S._facingSrc = 'stick'; facedAng = ang;
    } else if (isMoving) {
      const ang = Math.atan2(P.vy || 0, P.vx || 0);
      const sector = Math.round(ang / (Math.PI / 4));
      facing = SECTORS[((sector % 8) + 8) % 8]; S._facingSrc = 'moving';
    } else if (S._facingAngle !== undefined) {
      const sector = Math.round(S._facingAngle / (Math.PI / 4));
      facing = SECTORS[((sector % 8) + 8) % 8]; S._facingSrc = 'facingAngle';
    } else {
      facing = S._facing || 'south'; S._facingSrc = 'fallback';
    }
    /* v2.3.1837: the turn becomes the resting facing — see the note above. */
    if (facedAng != null && isFinite(facedAng)) S._targetFacingAngle = facedAng;
    /* v2.3.396: publish the ACTUAL rendered facing (8-way compass) so the
       network broadcast can send it and remote clients render the same
       facing -- they previously reconstructed it from movement, which is
       wrong whenever a standing player's facing came from aim, not motion.
       v2.3.1807: ...and _facingSrc names WHICH of the branches above decided
       it.  One string per frame, and it is worth it: the branch order is
       bash > shield > aim > stick > moving > facingAngle, so a facing that
       looks wrong is usually a facing that came from somewhere else, and
       nothing said where.  A QA pin that set _aimAngle correctly still
       rendered west for an afternoon because the resolver had fallen through
       to _facingAngle mid-slew; the probe below now says so in one word. */
    S._renderFacing = facing;
    const isHit = S._hitFlash && (now - S._hitFlash) < 250;
    /* v2.3.188: pickup pose during the loot-pickup freeze.  Takes
       priority over hit because the freeze already blocks combat.
       v2.3.236: attack pose plays through the 250 ms swing window —
       2-frame raised-fist then punch-out.  Sits between hit-react
       (which takes priority so a getting-hit cancel still reads)
       and jog/stand, so the body sprite freezes through the swing
       even if the player keeps moving. */
    /* v2.3.253: reverted v2.3.236's 'attack' pose for melee swings.
       Procedural bamboo swing arc reads cleaner than the static
       windup-strike frames; body stays in jog/stand during the
       250 ms swing window and the weapon overlay handles the motion. */
    /* v2.3.1534: 'dodge' sits ABOVE hit.  A standard dodge and a lunge grant
       i-frames for the whole window, so a hit-react during one is either
       impossible or (retreat_shot, which sets noIFrames) a hit taken while
       already committed to the tumble — in both cases the roll is what the
       body is actually doing, and cutting to the 250ms hit pose mid-roll
       would strand the player upright and sliding. */
    /* ═══ v2.3.1798: A RAISED SHIELD PLANTS THE STANCE — NOW A FALLBACK ═══
       v2.3.1800 moved the block onto the bow stand-in, which hides this body
       entirely and animates its own jog legs, so on the normal path this no
       longer decides anything.  It still runs for the one case the stand-in
       cannot cover: _bowArtReady false, i.e. the bow sheets are not loaded.
       There it keeps doing its original job (below), and it is cheap.
       ORIGINAL REASONING, kept because it is why the composite was a dead end:
       Owner: "One downside to the shield arm is that jogging backwards still
       shows both arms moving AND the outstretched arm."
       Exactly right, and the count is the bug: the jog frames draw two arms,
       the block arm composites a third on top, and while jogging the body's
       own arm swings out from behind it and becomes visible.  Standing, it
       does not — the stand frames hold the arms in close enough that the
       composited arm covers the one it stands in for.
       So while the shield is up the body holds STAND.  This is not a
       compromise dressed up as a feature: blocking is already HALF SPEED
       (BroTown.jsx shieldMult), so a raised shield is already a planted,
       trade-mobility-for-guard stance, and holding the pose is what that
       reads as.  Legs stop cycling during a blocking shuffle; three arms
       stop existing.
       ONLY WHERE AN ARM IS ACTUALLY DRAWN.  Facing south there is no cut to
       composite (the bow art's south frames are foreshortened — see
       blockArm.js), so the shield floats there as before and freezing the
       legs would cost the jog and buy nothing. */
    /* v2.3.1872: SOUTH JOINS THE PLANTED SET.  It was excluded because
       freezing there "would cost the jog and buy nothing" — true while south
       had no way to keep its legs moving.  It has one now (the band composite
       below), so the top half holds like every other facing and the legs keep
       striding.  Gated on the jog art being loadable at all: if the composite
       cannot draw, this falls back to the old full jog rather than freezing
       the whole figure into a slide. */
    const _southBlock = isShielding && facing === 'south' && !!(S.rpg && S.rpg.shield);
    const _blockPlanted = isShielding
      && ((BLOCK_ARM_ENABLED && !!BLOCK_ARM_FACING[facing]) || _southBlock);
    const pose = lootFrozen
      ? 'pickup'
      : (mining
          ? 'mine'
          : (fishing
              ? 'fish'
              : (dodging
                  ? 'dodge'
                  : (isHit
                      ? 'hit'
                      : ((isMoving && !_blockPlanted) ? 'jog' : 'stand')))));
    /* Resolve to the unmirrored sheet direction + mirror flag.  Lifted
       to outer scope so the weapon-positioning code below can pin to
       the per-frame hand anchor regardless of whether the spritesheet
       path drew this frame.
       v2.3.1534: dodge ships only south + east, so it resolves through its
       own dominant-axis map instead of the 8-way one. */
    const { dir, mirror } = dodging ? dodgeSheetDir(facing) : resolveDirection(facing);
    const facingIdx = SECTORS.indexOf(facing);   // 0..7: E,SE,S,SW,W,NW,N,NE
    /* Per-direction body scale.  Hit-east is 0.88 (source frames the
       character bigger); jog/stand-NE is 1.03 (slightly smaller source).
       v2.3.111: local player scale dialled back from 1.5 -> 1.125
       (reduced ~25% from v2.3.110's 1.5x per user "bigger was good but
       that's too big").
       v2.3.163: sprite source bumped from 64-px to 128-px per frame;
       halved LOCAL_SCALE (1.125 -> 0.5625) so on-screen size stays
       identical while the GPU downscales the higher-res source.
       v2.3.165: bumped 25% (0.5625 -> 0.703125) per user "want to see
       the player sprite 25% larger everywhere".
       v2.3.166: sprite source bumped 128 -> 256; halved again
       (0.703125 -> 0.3515625) so on-screen size stays identical.
       Net visible scale vs v2.3.110 baseline: still +25%.
       v2.3.741: +20% (0.3515625 -> 0.421875) per user "make the character
       20% larger in game for all directions".  Remote players and the
       remote weapon-anchor baseline bumped by the same factor. */
    const LOCAL_SCALE = 0.421875;
    /* v2.3.537: per-(pose,dir) scale now comes from the derived
       BODY_DIR_SCALE map (silhouette-height normalization), replacing the
       old hand-tuned bump stack. */
    const bodyScale = bodyDirScale(pose, dir) * LOCAL_SCALE;
    /* v2.3.1826: publish the (pose, dir) the body is ACTUALLY drawn as, for
       bodyFigureProbe.  Not the same as S._facing: this is post-
       resolveDirection, so it carries the mirror collapse (west renders as
       east) — and "east and west are the same art" is exactly the kind of
       thing a size comparison has to know rather than assume. */
    display._lastPoseKey = pose;
    display._lastFacingKey = dir;
    /* ═══ v2.3.2256: HOW TALL THE CHARACTER ACTUALLY IS, EVERY FRAME ═══
       __btPlayerDrawn publishes `texture.height * sprite.scale.y`, which is the
       whole 256px animation FRAME -- transparent margin above the hat and below
       the feet included, about 1.7x the character inside it.  Every zoom
       measurement this repo has taken read that number as "the figure", which
       is TRAPS #37 exactly: measuring the box that defines the drawing instead
       of the drawing.  The owner picked FIGURE_SCALE_FLOOR by LOOKING, so that
       choice stands -- but the numbers printed beside those pictures were 70%
       high, and the next person to tune this deserves the real one.
       Crown-to-foot, this facing's own rows (v2.3.1836), in WORLD px.
       S._swordBodyH is the same arithmetic but is only written when a weapon
       stand-in is up; this is unconditional. */
    {
      const _br = bodyRows(pose, dir);
      S._bodyDrawH = (_br.feet - _br.crown + 1) * bodyScale * (display.scale.y || 1);
    }
    /* v2.3.551: set true once the full covering set hides the body, so the
       NFT/procedural fallbacks below don't draw a body in its place.  Declared
       at function scope (the NFT fallback is outside the spritesAvailable block). */
    let _armorHidesBody = false;
    const spritesAvailable = hasPose(pose) || hasPose('stand');
    if (spritesAvailable) {
      const spriteBody = display._spriteBody;
      let frameIdx = 0;
      let _jogPhase = null;  /* v2.3.1367: cycle phase 0..1 for native-count fullset playback */
      if (pose === 'jog') {
        /* Per-direction frame count — sheets vary 24-34 frames.  During
           an attack or shield (movement slowed 50% by gameplay), play
           the cycle at half speed so leg motion stays in sync with the
           halved real-world distance per second.  When the player is
           walking backward relative to their aim direction, reverse
           the playback so the legs trail the body. */
        const fc = playerFrameCount('jog', dir) || 24;
        /* v2.3.603: armoured (chest+legs worn) keeps the slower NE/NW cadence;
           the naked body gets the +35% speed-up. */
        const _armCadence = getEquip('chest') !== 'none' && getEquip('legs') !== 'none';
        const baseCycle = cycleMs('jog', dir, _armCadence);
        const effectiveCycle = useAimDirection ? baseCycle * 2 : baseCycle;
        const rawIdx = Math.floor((now / effectiveCycle) * fc) % fc;
        frameIdx = isMovingBackward ? ((fc - 1) - rawIdx) : rawIdx;
        /* v2.3.1367: the same clock as rawIdx, as a 0..1 phase — drives
           native-frame-count fullset sheets (east: 25f vs 28f body). */
        _jogPhase = ((now / effectiveCycle) % 1 + 1) % 1;
        if (isMovingBackward) _jogPhase = 1 - _jogPhase;
        /* v2.3.1105: footsteps fire on the actual FOOT-PLANT frames of each
           direction's jog loop, so the sound lands exactly when a foot hits the
           ground -- a fixed timer never lined up because the per-direction
           cycles differ (0.8-1.66 s) and have their plants at different phases.
           Frame indices below were read from the per-direction jog sheets
           (tools/sheet_montage.mjs); two plants per full stride. Mirrored dirs
           (west/nw/se) reuse their base sheet's frames (mirroring is scale.x,
           the frame index is unchanged). Cadence therefore follows the
           animation: quicker for N/S/E/NE, slower for the long SW/SE cycle. */
        const _contacts = JOG_FOOT_FRAMES[dir] || JOG_FOOT_FRAMES.south;
        /* Edge-trigger: fire once when the animation first lands on a plant
           frame (works forward + backpedal; the jog advances <=1 frame/tick). */
        if (display._prevJogFrame !== frameIdx) {
          if (_contacts.indexOf(frameIdx) !== -1 && typeof window !== 'undefined' && window.BT_AUDIO) {
            window.BT_AUDIO.footstep(isWearingArmor());
          }
          display._prevJogFrame = frameIdx;
        }
      } else if (pose === 'hit') {
        const hitT = (now - (S._hitFlash || 0)) / 250;
        frameIdx = Math.max(0, Math.min(5, Math.floor(hitT * 6)));
      } else if (pose === 'pickup') {
        /* v2.3.188: play through the pickup strip once over the 0.5 s
           freeze window.  Clamp to last frame at the end so we don't
           loop back to frame 0. */
        const fc = playerFrameCount('pickup', 'south') || 24;
        const cycle = cycleMs('pickup', 'south');
        const elapsed = Math.max(0, now - ((S._lootFreezeUntil || now) - cycle));
        frameIdx = Math.max(0, Math.min(fc - 1, Math.floor((elapsed / cycle) * fc)));
      } else if (pose === 'mine') {
        /* Mining swing loops continuously for the whole gather window
           (raised -> strike -> raised), south-only. */
        const fc = playerFrameCount('mine', 'south') || 14;
        const cycle = cycleMs('mine', 'south');
        /* ═══ v2.3.2245: THE SWING FOLLOWS THE HAND ═══
           Owner: "the animation frames will play at the speed the user is
           performing the gesture (capped at a maximum speed not faster than a
           leisurely gesture pace)."  While the gesture window is open the
           frame comes from the gesture phase (ex.cueFrame01, written by
           ExtractionSwipeLayer as the thumb pumps the button), CHASED at a
           capped rate (gesturePose01) so a frantic pump still plays at a
           leisurely pace and a still thumb holds the pose.  The wind-up
           before the window opens keeps the clock loop -- a frozen figure
           for up to ten seconds reads as a hang (control-redesign.md §5.11). */
        const _gp = gesturePose01(S._extraction, now, 700);
        frameIdx = (_gp != null) ? Math.max(0, Math.min(fc - 1, Math.floor(_gp * fc)))
          : Math.floor((now / cycle) * fc) % fc;
      } else if (pose === 'fish') {
        /* Fishing rod-sway loops continuously for the whole gather window
           (waiting + ready), south-only. */
        const fc = playerFrameCount('fish', 'south') || 32;
        const cycle = cycleMs('fish', 'south');
        /* v2.3.2245: the reel drives the sway -- one finger-circle on the
           button is one turn of the sway loop, capped at ~one turn per 450ms
           (the same cap the reel marker has had since v2.3.1435). */
        const _gpF = gesturePose01(S._extraction, now, 450, true);
        frameIdx = (_gpF != null) ? Math.max(0, Math.min(fc - 1, Math.floor(_gpF * fc)))
          : Math.floor((now / cycle) * fc) % fc;
      } else if (pose === 'dodge') {
        /* v2.3.1534: ONE-SHOT across the real roll window, clamped to the
           last frame — never modulo, or the tumble would restart mid-roll.
           durMs is published by the game loop (BroTown.jsx) because the
           window is elastic: 250ms base + Endurance + the Reflexes T2 node,
           up to ~500ms.  Recomputing that formula here would be a second
           copy to drift out of sync, so the loop hands us the number it
           actually used; DODGE_DURATION_MS covers the first frame before
           it has been published. */
        const fc = playerFrameCount('dodge', dir) || 9;
        const dur = (S._dodgeRoll && S._dodgeRoll.durMs) || cycleMs('dodge', dir);
        const t = (now - ((S._dodgeRoll && S._dodgeRoll.startTime) || now)) / dur;
        frameIdx = Math.max(0, Math.min(fc - 1, Math.floor(t * fc)));
      }
      /* Kick off body-anchor + selected-hat asset loads early so they're
         ready by the time we place the headwear below. */
      _ensureBodyData();
      _ensureHeadwearLoaded(getHeadwear());
      _ensureFacialHairLoaded(getFacialHair());
      _ensureHairLoaded(getHair());
      /* v2.3.389: recolor the bare skin to the selected tone (preserving
         shading) -- falls back to the default sheets internally.
         v2.3.399: + pants / shoes colors.
         v2.3.756: the BAKED torso-retint shirt (v2.3.497) is RETIRED --
         "never worked right and looks bad" (owner).  The layered shirt
         (gear slot 'shirt': white-base sheet x tint) is the only shirt;
         the body always bakes shirtless.  shirtFill survives solely as
         the layer's tint source. */
      const _shId = getShirt(), _shCol = getShirtColor();
      const _shirtT = null;
      const _shirtKey = 'none';
      /* Fishing uses the RAW sheet (no skin/pants/shoes recolor): the pink
         rod + line are baked art and the body-region recolor seeds (tuned
         for upright poses) would mis-paint them.  The pose is brief and
         south-only, so skipping the per-player retint is an acceptable
         trade for keeping the rod art intact for everyone. */
      /* v2.3.1940: my own drawn pants print / tattoo, pre-flipped for the three
         mirrored facings (the sheet is drawn with scale.x -1 there). */
      const _bodyArt = localBodyArt(mirror);
      let tex = pose === 'fish'
        ? getFrame('fish', 'south', frameIdx)
        : getBodyFrame(getSkin(), getPants(), getShoes(), pose, dir, frameIdx, _shirtT, _shirtKey, getEyeColor(), _bodyArt);
      if (!tex) tex = getBodyFrame(getSkin(), getPants(), getShoes(), 'stand', dir, 0, _shirtT, _shirtKey, getEyeColor(), _bodyArt);
      /* v2.3.291: mannequin swap removed -- user wants helmet stickered
         to the NORMAL character body as a rigid assembly.  Trait + body
         share frame-coords so they move together pixel-perfect. */
      if (tex) {
        /* Always assign the texture — the cache-only-on-change pattern
           was leaving spriteBody with a stale / invalidated texture
           after zone change (user reports the player going invisible
           while name / level text remained).  Reassigning every frame
           is cheap (it's a property write) and self-heals. */
        if (spriteBody.texture !== tex) {
          spriteBody.texture = tex;
        }
        display._spritePathRendered = true;   /* v2.3.608: body shown via region sprites */
        display._animPose = pose;
        display._animDir = dir;
        display._animFrame = frameIdx;
        /* v2.3.1072: publish the live jog frame so the bow stand-in can composite
           animated legs under its torso (jogging-legs-during-attack). */
        S._bodyAnimFrame = frameIdx; S._bodyAnimDir = dir; S._bodyMoving = (pose === 'jog'); S._bodyAnimMirror = mirror;
        /* The v2.3.576 window.__btHideArmor debug toggle was retired in
           v2.3.678 (armour visibility is governed by the equip slots); its
           reads were removed in the v2.3.688 cleanup. */
        /* v2.3.609: ONE transform for the whole figure.  spriteBody is the
           invisible reference (position + scale); the visible body is the three
           region sprites and the gear, all sharing this transform so they stay
           pixel-aligned (no cloning). */
        /* v2.3.1120: the body/gear/region DISPLAY textures are DISPLAY_DS-smaller,
           so the shared transform scales up by DISPLAY_DS to keep the on-screen
           size identical.  Traits/weapons place via the 256-space bodyScale (not
           sb.scale), so they're unaffected; gear/regions copy sb.scale and are
           themselves downscaled, so they stay aligned. */
        spriteBody.scale.x = (mirror ? -1 : 1) * bodyScale * DISPLAY_DS;
        spriteBody.scale.y = bodyScale * DISPLAY_DS;
        spriteBody.tint = 0xffffff;
        const _myTint = shirtFill(_shId, _shCol);
        display._shirtLook = _shirtLook(getShirtArt('front'), getShirtArt('back'),
          getPattern('shirt'), _myTint);   /* v2.3.1938; v2.3.1941 */
        display._shirtArtMirror = mirror;
        _placeGear(display, {
          shirt: getEquip('shirt'), legs: getEquip('legs'),
          chest: getEquip('chest'), shoulders: getEquip('shoulders'),
          /* white-base sheet x picked colour; null colour -> white tee */
          shirtTint: _myTint,
        }, pose, dir, frameIdx);
        /* v2.3.613: no helmet -- the head/face always shows.  The body is one
           sprite; erase the body under the worn chest/legs plate (dilated to
           swallow the AI misalignment) so it never pokes past a plate edge,
           while the head + any bare region still show. */
        _hideBodyRegions(display);
        _armorHidesBody = false;                 // head always visible now
        const _worn = [];
        {
          for (const _sl of ['chest', 'legs']) {
            const _it = getEquip(_sl);
            if (_it && _it !== 'none') {
              const _gt = getGearFrame(_sl, _it, pose, dir, frameIdx);
              if (_gt) _worn.push({ k: _sl + ':' + _it, tex: _gt });
            }
          }
        }
        /* v2.3.678: defensive -- a bake failure must degrade to the RAW body
           (head visible, slight body-poke past plate edges) instead of killing
           the whole frame update.  The un-imported Texture in _maskedBodyFrame
           did exactly that: a per-frame ReferenceError swallowed by the game
           loop, freezing the early procedural placeholder (color-disc head, no
           hat/beard) on screen -- the 'invisible head when joining with armour
           on' bug. */
        /* v2.3.1057: pickup body strategy -- NO per-frame canvas bake.  The old
           section-erase baked a fresh 256x256 texture for all 29 frames inside
           the 0.5s freeze (29 GPU uploads in a burst -> black flashes + frame
           drops, and its cache-evict destroy() killed in-use textures = crash
           after several pickups).  Instead:
           - full set: hide the raw body once the head-overlay sheet is ready --
             the head overlay + chest/leg gear render the whole figure (no
             mannequin pokes, no bake).  Body stays visible until the sheet
             loads so we never flash headless.
           - partial / no armor: raw body, gear overlays it.
           Non-pickup armoured poses keep the existing masked body. */
        const _legsW = _worn.some(w => w.k && w.k.indexOf('legs:') === 0);
        const _chestW = _worn.some(w => w.k && w.k.indexOf('chest:') === 0);
        let _bodyTex;
        let _fsT = null; /* v2.3.1389: hoisted — the trait crown override below needs it */
        try {
          /* v2.3.1361: fullset figure replaces the bake when it ships for
             this (pose,dir); null -> classic masked path. */
          _fsT = _fullsetFrame(getEquip('chest'), getEquip('legs'), pose, dir, frameIdx, _jogPhase);
          _bodyTex = _fsT || ((!_worn.length || pose === 'pickup') ? tex : _maskedBodyFrame(tex, _worn, 6, { pose, dir, frameIdx }));
          /* v2.3.1757: material colour for the figure-on-body case (see the
             remote path above for why it is cleared rather than left set). */
          const _fsTint = _fsT ? _fullsetTint(getEquip('chest')) : 0xffffff;
          if (spriteBody.tint !== _fsTint) spriteBody.tint = _fsTint;
        } catch (e) { _bodyTex = tex; }
        if (spriteBody.texture !== _bodyTex) spriteBody.texture = _bodyTex;
        /* v2.3.1055: pickup head overlay (drawn above gear in _orderTraitsAndWeapon).
           v2.3.1116: guarded -- the loot freeze runs every frame, so a throw here
           (a bad overlay texture, a recolor hiccup) would freeze the whole game
           loop, not just the head.  On failure: no overlay, body stays visible. */
        try {
          /* v2.3.1394: the JOG head overlay exists to cap the fullset knight
             (v2.3.1368) — since v2.3.1389 its sheet is armor-synced (25f,
             armor bob), so drawing it over the CLASSIC body (partial/no
             armor) painted a second, detached head that ignored the body's
             own bob (owner: chest-only east "not nudging").  Gate it on the
             fullset figure actually rendering; pickup/fish keep their
             unconditional overlay. */
          /* v2.3.1479: hit / mine take the overlay only when armour is actually
             worn.  The sheet is HEAD_DS-downscaled, so drawing it over a bare
             player's own head would swap a crisp head for a softer one every
             time they took a hit, for no benefit -- with no gear there is
             nothing that could cover the head in the first place. */
          const _needHead = (pose !== 'hit' && pose !== 'mine') || _worn.length > 0;
          if ((pose !== 'jog' || _fsT) && _needHead) _placePickupHead(display, spriteBody, getSkin(), getPants(), getShoes(), pose, dir, frameIdx, _jogPhase);
          display._headBehindGear = (pose === 'jog' && dir === 'east' && !!_fsT); /* v2.3.1553 */
          spriteBody.visible = !(pose === 'pickup' && _legsW && _chestW && !!getPickupHeadFrame(getSkin(), getPants(), getShoes(), pose, dir, frameIdx));
          /* v2.3.1123: lift the angler's head above the fishing chest plate.
             v2.3.1914 (owner: "When fishing that hand needs to be over the
             shirt during the reel animation instead of under it"): ...and above
             the SHIRT. This gated on chest ARMOUR only, so an angler in a plain
             tee — which is everyone, from the first minute of the game — never
             built the overlay at all and the gripping hand stayed buried under
             the shirt art. The shirt is placed by _placeGear rather than
             collected into _worn (that list is chest+legs, for the body mask),
             so it needed asking about separately rather than being covered by
             _chestW. */
          const _shirtW = (() => { const _si = getEquip('shirt'); return !!(_si && _si !== 'none'); })();
          /* v2.3.2278: _legsW joins them.  Owner: "Fishing animation the reel
             hand while wearing leg armor gets cut off."  The overlay is the
             ONLY layer that can sit above _gearLegs, and it was not being
             built at all for an angler in greaves and nothing else -- so the
             greaves drew over the reeling fist and there was nothing to lift.
             Still gated on the three rather than made unconditional: a bare
             player needs no canvas bake to look right. */
          if (pose === 'fish' && (_chestW || _shirtW || _legsW)) _placeFishHead(display, spriteBody, tex);
        } catch (e) { if (display._bodyHead) display._bodyHead.visible = false; spriteBody.visible = true; }
        /* ═══ v2.3.1872: THE SOUTH BLOCK'S JOGGING LEGS ═══
           Placed HERE, after the masked/fullset body has been resolved, because
           the frozen top half must be the texture that actually would have been
           drawn — mask and all — not the raw frame.  _placeSouthBlockLegs parks
           itself and returns false on any facing but this one, so every other
           frame in the game reaches it and leaves unchanged.
           The jog index is recomputed rather than read from frameIdx: the body
           is holding STAND now (see _blockPlanted), so the jog branch above
           never ran.  Same clock it uses, including the half-speed cadence a
           raised shield already imposes on movement. */
        let _sbActive = false;
        if (_southBlock && isMoving) {
          const _jfc = playerFrameCount('jog', dir) || 24;
          const _jArm = getEquip('chest') !== 'none' && getEquip('legs') !== 'none';
          const _jCyc = (cycleMs('jog', dir, _jArm) || 700) * (useAimDirection ? 2 : 1);
          const _jRaw = Math.floor((now / _jCyc) * _jfc) % _jfc;
          const _jFrame = isMovingBackward ? ((_jfc - 1) - _jRaw) : _jRaw;
          _sbActive = _placeSouthBlockLegs(display, spriteBody, {
            active: true, standTex: spriteBody.texture, dir, jogFrame: _jFrame,
            skin: getSkin(), pants: getPants(), shoes: getShoes(),
            shirtT: _shirtT, shirtKey: _shirtKey, eyeId: getEyeColor(),   /* v2.3.1930 */
            bodyArt: _bodyArt,   /* v2.3.1940 */
          });
          /* The greaves stride with the legs they are worn over — otherwise a
             bro in leg armour blocks with static plates over moving shins. */
          if (_sbActive) {
            const _sbTint = shirtFill(_shId, _shCol);
            display._shirtLook = _shirtLook(getShirtArt('front'), getShirtArt('back'),
              getPattern('shirt'), _sbTint);   /* v2.3.1938; v2.3.1941 */
            display._shirtArtMirror = mirror;
            _placeGear(display, {
              shirt: getEquip('shirt'), legs: getEquip('legs'),
              chest: getEquip('chest'), shoulders: getEquip('shoulders'),
              shirtTint: _sbTint,
            }, pose, dir, frameIdx, { pose: 'jog', frameIdx: _jFrame });
          }
        }
        if (!_sbActive) {
          if (display._southTop) display._southTop.visible = false;
          if (display._southLegs) display._southLegs.visible = false;
          if (typeof window !== 'undefined' && window.__btSouthBlockBody
              && window.__btSouthBlockBody.on) {
            window.__btSouthBlockBody = { on: false };
          }
        }
        body.visible = false;
        if (display._procDrawn) {
          /* Free the procedural Graphics paths once the sprite path
             takes over — prevents the old shapes from sitting in the
             scene graph indefinitely. */
          body.clear();
          display._procDrawn = false;
        }
        /* v2.3.263 (Bro-NFT Phase 4): trait overlay anchored on the
           body's head.  The trait's bbox-center anchor (loaded from
           meta.json) is positioned at the body's head anchor for the
           current direction.  This corrects for AI drift -- the trait
           may have been drawn at a slightly different frame position
           than the baseline, but we snap it to where the body's head
           actually is regardless. */
        /* v2.3.270: modular trait composition.
           Body schema (body-anchors.json) provides the head bounding
           box for the current pose/dir/frame.  Category rule
           (traitCategories.js) declares HOW the trait attaches and
           how it should be sized relative to head width.  No
           per-trait per-direction tuning anywhere. */
        /* v2.3.321: headwear placement extracted to the shared
           _placeHeadwear helper (used by remote players too).  Local
           player's hat id comes from the login picker. */
        /* shirt is baked into the body (see getBodyFrame above); no overlay. */
        if (display._shirtSprite) display._shirtSprite.visible = false;
        /* v2.3.613: no helmet -- always show hair/hat/beard on the visible head. */
        /* v2.3.1389: while the fullset figure is on screen, anchor the head
           traits to the DRAWN head's crown (FULLSET_CROWN — armor-synced,
           left-shifted) instead of the body sheet's. */
        _crownOverride = _fsT ? _fullsetCrown(dir, _jogPhase) : null;
        _placeCape(display, getCape(), pose, dir, mirror, frameIdx);   /* v2.3.2023 */
        _placeHeadwear(display, getHeadwear(), getHatColor(), pose, dir, mirror, frameIdx, bodyScale, getHair()); /* v2.3.1561: hair id for the floating halo */
        _placeFacialHair(display, getFacialHair(), getFacialHairColor(), pose, dir, mirror, frameIdx, bodyScale);
        _placeHair(display, getHair(), getHairColor(), getHeadwear(), pose, dir, mirror, frameIdx, bodyScale);
        _crownOverride = null;

        /* v2.3.265: combined-trait overlay disabled while sticker
           pipeline is being wired. */
        const traitCanRender = false;
        const traitFace = display._traitFace;
        const traitTex = null;
        const traitInfo = null;
        if (traitCanRender && traitFace && traitTex && traitInfo && traitInfo.anchor) {
          if (traitFace.texture !== traitTex) traitFace.texture = traitTex;
          /* Anchor the trait sprite on its bbox center (in trait pixel space). */
          const W = 256;
          traitFace.anchor.set(traitInfo.anchor[0] / W, traitInfo.anchor[1] / W);
          /* Body head anchor (frame-space, mirror-flipped if needed).
             Use stand head as a stable reference -- per-frame head
             anchors are noisy and cause jitter. */
          const headAnchor = getHeadAnchor('stand', dir, 0, mirror);
          if (headAnchor) {
            /* Frame-coord delta from body's frame center (anchor 0.5,0.5
               at frame coord W/2,W/2) to body's head anchor, then scale
               to world space.  bodyScale magnitude is the same for x and y. */
            const dxFrame = headAnchor[0] - W / 2;
            const dyFrame = headAnchor[1] - W / 2;
            traitFace.x = spriteBody.x + dxFrame * Math.abs(bodyScale) * (mirror ? -1 : 1);
            traitFace.y = spriteBody.y + dyFrame * Math.abs(bodyScale);
          } else {
            traitFace.x = spriteBody.x;
            traitFace.y = spriteBody.y;
          }
          /* Match scale + mirror.  Trait sprite's anchor (set above)
             keeps the bbox-center pixel pinned at trait.x/y regardless
             of mirror. */
          traitFace.scale.x = (mirror ? -1 : 1) * Math.abs(bodyScale);
          traitFace.scale.y = Math.abs(bodyScale);
          traitFace.visible = true;
        } else if (traitFace) {
          traitFace.visible = false;
        }
      } else {
        spriteBody.visible = false;
        body.visible = true;
        display._spritePathRendered = false; _hideBodyRegions(display);
        if (display._traitFace) display._traitFace.visible = false;
        if (display._headwearSprite) display._headwearSprite.visible = false;
        if (display._facialHairSprite) display._facialHairSprite.visible = false;
        if (display._shirtSprite) display._shirtSprite.visible = false;
        if (display._hairSprite) display._hairSprite.visible = false;
      }
    } else {
      display._spriteBody.visible = false;
      body.visible = true;
      display._spritePathRendered = false; _hideBodyRegions(display);
    }

    /* v2.3.910: during the melee swing the sword-swing stand-in (effectsRenderer)
       stands in for the avatar's body, so hide the real body + its head traits
       here.  v2.3.925: same for the bow-shoot stand-in.  _spritePathRendered
       stays true so the NFT / procedural fallbacks below don't draw a body. */
    if (_swordSwing || _bowShot) {
      display._spriteBody.visible = false;
      body.visible = false;
      _hideBodyRegions(display);
      display._spritePathRendered = true;
      if (display._traitFace) display._traitFace.visible = false;
      if (display._headwearSprite) display._headwearSprite.visible = false;
      if (display._facialHairSprite) display._facialHairSprite.visible = false;
      if (display._hairSprite) display._hairSprite.visible = false;
      if (display._shirtSprite) display._shirtSprite.visible = false;
      /* Hide the worn gear too -- otherwise the equipped armour stands in
         place while the (shirtless) swing stand-in plays above it. */
      for (const _g of [display._gearShirt, display._gearLegs, display._gearChest,
                        display._gearShoulders, display._gearHead]) {
        if (_g) _g.visible = false;
      }
      /* Publish the avatar's foot world-Y so the stand-in (effectsRenderer)
         plants its feet exactly where the real body's feet were, instead of
         floating up.  The body is anchored frame-centre (256-frame, feet row
         221), so feet sit (221-128)*bodyScale below the display origin, then
         scaled by the per-zone display scale. */
      const _dscale = display.scale.y || 1;
      /* v2.3.935: always size + plant the stand-in at the IDLE (stand) scale,
         not the live `bodyScale`.  While moving, `pose` is 'jog' and
         BODY_DIR_SCALE.jog is much larger than .stand (e.g. east 1.25 vs 0.983),
         so the stand-in grew when shooting/swinging on the move (north looked
         exempt only because its jog≈stand).  Using the stand scale here keeps
         the swing/shoot stand-in idle-sized in every facing. */
      const _standBodyScale = bodyDirScale('stand', dir) * LOCAL_SCALE;
      /* v2.3.1836: this facing's OWN crown/feet rows — see BODY_ROWS.  The
         old constants were south's, so every other facing was sized and
         planted against a body that is not the one on screen. */
      const _sRows = bodyRows('stand', dir);
      S._swordFootY = display.y + (_sRows.feet - 128) * _standBodyScale * _dscale;
      /* Also publish the avatar's drawn body height (crown-to-foot ~188px in
         the source frame) so the stand-in renders at the matching size for this
         facing / zone. */
      S._swordBodyH = (_sRows.feet - _sRows.crown + 1) * _standBodyScale * _dscale;
      /* v2.3.1073: jog-scaled body height for the composited jog legs -- the bow
         art per direction is drawn jog-sized, so legs scaled by the STAND height
         read ~25% small (east jog 1.25 vs stand 0.983).  Use the JOG dir-scale. */
      const _jRows = bodyRows('jog', dir);
      S._jogBodyH = (_jRows.feet - _jRows.crown + 1) * bodyDirScale('jog', dir) * LOCAL_SCALE * _dscale;
      /* v2.3.1072: tell the bow stand-in to swap to the leg-erased torso strip and
         composite jogging legs underneath while MOVING (effectsRenderer restricts
         this to the south facing for now via fmap).  Gate on the function-scope
         isMoving (reliable) rather than the published _bodyMoving. */
      S._bowJogLegs = _bowShot && isMoving;
      /* v2.3.1088: same for the sword swing -- jog the legs under the swing torso
         strip while moving instead of sliding. */
      S._swordJogLegs = _swordSwing && isMoving;
    }

    /* NFT 360° body — when the regular sprite path didn't render this
       frame (sheets not loaded, sprites disabled) and the player has
       an avatar URL with loaded textures, swap in the NFT cross-fade
       pair.  Hide the procedural body if NFT renders. */
    let nftShown = false;
    if (!display._spritePathRendered && S.myAvatar && !_armorHidesBody) {
      const nft = getNftTextures(S.myAvatar);
      if (nft) {
        const renderAng = (S._facingAngle !== undefined) ? S._facingAngle : Math.PI / 2;
        applyNftTransform(display, nft.front, nft.back, renderAng, nft.size, bobY);
        body.visible = false;
        nftShown = true;
      }
    }
    if (!nftShown) hideNft(display);

    /* Procedural fallback body — only drawn when sprite path is
       unavailable.  Skip rebuild when idle and no color change. */
    if (body.visible) {
      const colorKey = torso + '|' + legs + '|' + head + '|' + bw + '|' + bh;
      if (isMoving || display._lastColorKey !== colorKey || display._lastIsMoving !== isMoving) {
        display._lastColorKey = colorKey;
        display._lastIsMoving = isMoving;
        display._procDrawn = true;
        body.clear();
        /* v2.3.1300: baked fallback shadow retired; v2.3.1365: player
           ground shadow gone entirely (owner) — do not re-add one here. */
        // Legs with walk animation
        const legSwing = isMoving ? Math.sin(now / 80) * 3 : 0;
        body.rect(-bw / 2, 2 + bobY + legSwing, bw / 2 - 1, bh / 2);
        body.fill({ color: cssColorToHex(legs) });
        body.rect(1, 2 + bobY - legSwing, bw / 2 - 1, bh / 2);
        body.fill({ color: cssColorToHex(legs) });
        // Torso
        body.roundRect(-bw / 2, -bh / 2 + bobY, bw, bh / 2 + 4, 3);
        body.fill({ color: cssColorToHex(torso) });
        // Head
        body.circle(0, -bh / 2 - 4 + bobY, 7);
        body.fill({ color: cssColorToHex(head) });
      }
    }

    // Weapon visual
    const weaponGfx = display._weaponGfx;
    const weaponGlowGfx = display._weaponGlowGfx;
    weaponGfx.clear();
    weaponGlowGfx.clear();
    if (S.rpg) {
      /* facingX/facingY are derived from the 8-compass `facing` for
         the procedural glow lines that need a left/right/up/down hint.
         The weapon position itself comes from per-frame hand anchors
         (anchors.json) below. */
      const _ang = facingIdx >= 0 ? facingIdx * Math.PI / 4 : 0;
      const _cx = Math.cos(_ang), _sy = Math.sin(_ang);
      const facingX = _cx > 0.3 ? 1 : _cx < -0.3 ? -1 : 0;
      const facingY = _sy > 0.3 ? 1 : _sy < -0.3 ? -1 : 0;

      /* Per-frame hand anchor: anchors.json maps (pose, dir, frame) ->
         [ax, ay] in 64×64 sprite space.  Mirror flag flips the x.
         Sprite body has anchor (0.5, 0.5) so source pixel (32, 32) is
         display-local (0, 0); pixel (ax, ay) lands at ((ax-32)*scale,
         (ay-32)*scale).  Falls back to a crude per-cardinal offset if
         the anchor data isn't loaded yet. */
      /* v2.3.163: player sheets bumped to 128x128 per frame.  Anchors
         returned from getAnchor are now in 128-px space (scaled at
         load time inside playerAnchors.js), so SHEET_W matches. */
      const SHEET_W = 256;
      const animFrame = display._animFrame || 0;
      /* Pass `mirror` so getAnchor returns the LEFT hand on mirrored
         facings (W/NW/SE) — the left anchor flipped via the body's
         negative scale lands on the visual right-hand side of the
         mirrored character.  Old single-anchor data is treated as
         right-hand-only and used regardless of mirror flag. */
      /* v2.3.1040: doubled half-cycle jogs (east/NE) pin the weapon to whichever
         hand is forward this frame, so it stops "kicking up" on the back-swing. */
      const _jogFwd = display._animPose === 'jog' && (dir === 'east' || dir === 'northeast');
      const hand = (spritesAvailable && display._animPose)
        ? (_jogFwd ? (getJogForwardHand(dir, animFrame) || getAnchor(display._animPose, dir, animFrame, mirror))
                   : getAnchor(display._animPose, dir, animFrame, mirror))
        : null;
      let wpnX, wpnY;
      if (hand) {
        const ax = mirror ? (SHEET_W - hand[0]) : hand[0];
        wpnX = (ax - SHEET_W / 2) * bodyScale;
        wpnY = (hand[1] - SHEET_W / 2) * bodyScale;
      } else {
        /* Anchor data not loaded yet — use the legacy 4-cardinal
           offsets so the weapon at least appears in roughly the right
           place during the brief window before anchors.json resolves. */
        const cardFacing = S._facing || 'down';
        if (cardFacing === 'right')      { wpnX = 20; wpnY = 4 + bobY; }
        else if (cardFacing === 'left')  { wpnX = -20; wpnY = 4 + bobY; }
        else if (cardFacing === 'down')  { wpnX = 14; wpnY = 12 + bobY; }
        else if (cardFacing === 'up')    { wpnX = -10; wpnY = -2 + bobY; }
        else                              { wpnX = 14; wpnY = 8 + bobY; }
      }

      const activeSlot = S.rpg.activeSlot || 'melee';
      /* Three slots, three sources: melee, ranged (bow), staff.  The
         port previously fell through to rangedWeapon for any non-melee
         slot — that meant 'staff' was rendering the bow texture. */
      const wpn = activeSlot === 'melee' ? S.rpg.weapon
                : activeSlot === 'staff' ? (S.rpg.staffWeapon || S.rpg.rangedWeapon)
                : S.rpg.rangedWeapon;
      /* Swing math.  swingActive was computed at outer scope (drives
         the aim-direction facing override too); here we derive the
         per-frame rotation offset and arc trail span. */
      let swingProgress = 0, swingOffset = 0, swingAng = 0;
      const aimAngleForSwing = aimRefAngle;
      if (swingActive && wpn) {
        swingProgress = (now - S.swingTimer) / SWING_ANIM_MS;
        const eased = 1 - (1 - swingProgress) * (1 - swingProgress);
        /* v2.3.222: special-swing visual sweeps a full half-circle. */
        const swingArcSpan = S._specialAttack ? Math.PI : SWING_FULL_ARC;
        swingOffset = -swingArcSpan / 2 + eased * swingArcSpan;
        const restAng = REST_ANG[wpn.type] != null ? REST_ANG[wpn.type] : 0;
        swingAng = (aimAngleForSwing - restAng) + swingOffset;
      }
      /* v2.3.1871: the south-block probe is RESET here, before the branches,
         not inside the one that stops drawing.  Cleared only on the
         shield-down path it went stale the moment the weapon returned to the
         carried pose — which reaches a different branch entirely — and
         mp-blockweapon then read a south block that had ended seconds ago.
         Exactly the trap _hideBlockArm records: hide and record together, or
         the probe outlives what it describes. */
      if (typeof window !== 'undefined' && window.__btSouthBlockWeapon
          && window.__btSouthBlockWeapon.on) {
        window.__btSouthBlockWeapon = { on: false };
      }
      if (wpn && !isShielding) {
        /* Weapon is fully hidden while shielding — gameplay rule: you
           can attack OR block, never both, so no point drawing the
           weapon sprite or its glow when the shield is up. */
        const elem = wpn.element1;
        const wpnColor = elem && ELEMENTS[elem] ? cssColorToHex(ELEMENTS[elem].color) : 0xaaaaaa;

        /* v2.3.1747: the combo-tier weapon glow (brightness by combo count,
           pulsing at 3) went with the chain.  The collision-opportunity glow
           below is a DIFFERENT signal — it reads the elemental status on
           nearby monsters — and is deliberately kept. */
        // §9.2.1 Collision-opportunity weapon edge glow.
        // Scan monsters within COLLISION_GLOW_RANGE_PX; pick the most-urgent
        // (lowest remaining duration) status the player's swipe element would
        // collide against. Render an outer halo in the setup element's colour
        // with intensity 0.15 → 0.6 as the status nears expiry.
        if (elem && S.monsters && S.player) {
          const px = S.player.x, py = S.player.y;
          let bestRatio = Infinity;          // lower = more urgent
          let bestSetupColor = null;
          let bestSetupKey = null;
          const range2 = COLLISION_GLOW_RANGE_PX * COLLISION_GLOW_RANGE_PX;
          for (let mi = 0; mi < S.monsters.length; mi++) {
            const mm = S.monsters[mi];
            if (!mm || !mm.alive || !mm.statuses) continue;
            const ddx = mm.x - px, ddy = mm.y - py;
            if (ddx * ddx + ddy * ddy > range2) continue;
            for (const sid in mm.statuses) {
              const sd = mm.statuses[sid];
              if (!sd || !sd.element || sd.element === elem) continue;
              if (!lookupCollision(sd.element, elem)) continue;
              const r = (sd.maxDur > 0) ? (sd.remaining / sd.maxDur) : 1;
              if (r < bestRatio) {
                bestRatio = r;
                bestSetupColor = (ELEMENTS[sd.element] || {}).color || '#ffffff';
                bestSetupKey = sd.element;
              }
            }
          }
          if (bestSetupColor && bestRatio < Infinity) {
            // 0.15 base → 0.60 at expiry. ratio=1 (just applied) → 0.15;
            // ratio=0 (expiring) → 0.60.
            const oppAlpha = 0.15 + (1 - Math.max(0, Math.min(1, bestRatio))) * 0.45;
            const oppColor = cssColorToHex(bestSetupColor);
            if (wpn.type === 'bow') {
              weaponGlowGfx.arc(wpnX, wpnY, 8, -0.8, 0.8);
              weaponGlowGfx.stroke({ color: oppColor, width: 6, alpha: oppAlpha });
            } else if (wpn.type === 'staff') {
              weaponGlowGfx.circle(wpnX, wpnY - 12, 5);
              weaponGlowGfx.stroke({ color: oppColor, width: 2, alpha: oppAlpha });
            } else {
              const len = wpn.type === 'greatsword' ? 14 : 10;
              weaponGlowGfx.moveTo(wpnX, wpnY + 2);
              weaponGlowGfx.lineTo(wpnX + facingX * len || len * 0.7, wpnY - len * 0.3);
              weaponGlowGfx.stroke({ color: oppColor, width: (wpn.type === 'greatsword' ? 6 : 5), alpha: oppAlpha });
            }
          }
        }

        /* Weapon icon — prefer the loaded PNG (sword/bow/staff)
           rendered as a Sprite, fall back to the procedural shapes
           below if the texture isn't loaded yet. v2.3.172 passes
           wpn.gearBase so wood-tier swords pick the bamboo variant. */
        const weaponSprite = display._weaponSprite;
        /* v2.3.942/944: greatsword + bow have per-facing held art selected by
           the canonical sprite `dir`; the other 3 facings reuse a canonical
           texture flipped by resolveDirection's `mirror` (handled below). */
        const _gsDir = (wpn.type === 'greatsword' || wpn.type === 'bow') ? dir : null;
        const wpnIconTex = hasWeapon(wpn.type, wpn.gearBase, _gsDir) ? getWeaponTexture(wpn.type, wpn.gearBase, _gsDir) : null;
        if (wpnIconTex) {
          if (weaponSprite.texture !== wpnIconTex) weaponSprite.texture = wpnIconTex;
          const tw = wpnIconTex.width || 64;
          const th = wpnIconTex.height || 64;
          if (isInCombat) {
            /* In combat — pin grip to hand (existing behavior). */
            const handle = getWeaponHandle(wpn.type, wpn.gearBase, _gsDir);
            if (handle) weaponSprite.anchor.set(handle[0] / tw, handle[1] / th);
            else weaponSprite.anchor.set(0.5, 1.0);
            /* v2.3.183: per-facing nudge table for bamboo. The simpler
               mirror-based rule worked for E/W but the user reported
               N/SE/SW were all off in directions the mirror flag
               couldn't capture -- bamboo's apparent grip offset isn't
               symmetric across all 5 sprite sheets. Per-facingIdx
               lookup: E (0) and W (4) keep the ±8 that worked; the
               three reported-bad facings drop to 0; the unreported
               diagonals stay at the mirror-based defaults until the
               user calls them out. */
            const isWoodSwordNudge = wpn.type === 'sword' && wpn.gearBase === 'wood';
            /* facingIdx: 0=E 1=SE 2=S 3=SW 4=W 5=NW 6=N 7=NE */
            const WOOD_NUDGE_X = [-8, 0, -8, 0, 8, 8, 0, -8];
            /* v2.3.208: SW idle only, +3 px right (user reset). */
            const SW_IDLE_NUDGE = (facingIdx === 3 && pose === 'stand') ? 3 : 0;
            const wpnNudgeX = isWoodSwordNudge ? ((WOOD_NUDGE_X[facingIdx] || 0) + SW_IDLE_NUDGE) : 0;
            /* v2.3.946: stabilize the held weapon.  The per-frame jog hand
               anchors are hand-tapped (a few px of noise each frame) and the
               arm swings, so pinning hard makes the weapon jitter in the hand.
               Exponentially ease the weapon toward the hand instead of snapping;
               reset (snap) when the facing / pose / weapon changes so it never
               slides across the body. */
            const _txW = wpnX + wpnNudgeX, _tyW = wpnY;
            const _smKey = facing + '|' + pose + '|' + (wpn.type || '');
            if (display._wpnSmKey !== _smKey || display._wpnSmX == null) {
              display._wpnSmX = _txW; display._wpnSmY = _tyW;
            } else {
              const _k = 0.7;   // v2.3.950: 0.5 -> 0.7, tighter follow (less float) while still easing out the per-frame hand-anchor jitter
              display._wpnSmX += (_txW - display._wpnSmX) * _k;
              display._wpnSmY += (_tyW - display._wpnSmY) * _k;
            }
            display._wpnSmKey = _smKey;
            weaponSprite.x = display._wpnSmX;
            weaponSprite.y = display._wpnSmY;
          } else {
            /* Sheathed (F4) — center the sprite over the upper torso
               and angle it diagonally across the back. Anchor at the
               center of the image so positioning is by center, not
               grip. Slight horizontal offset so the weapon reads as
               worn on one shoulder rather than dead-centered. */
            weaponSprite.anchor.set(0.5, 0.5);
            weaponSprite.x = mirror ? 4 : -4;
            weaponSprite.y = -10;
          }
          /* Tuned per-weapon target heights so the icon reads at the
             same apparent size as the 64-px sprite body's hand area.
             Greatsword is the longest, staff next, sword/bow shorter.
             v2.3.173: wood-tier swords (bamboo) get a bigger target
             height because their sprite art reads thinner / shorter
             at the chrome-sword scale. Per-tier tuning could be
             extended further once more tier sprites land. */
          const isWoodSword = wpn.type === 'sword' && wpn.gearBase === 'wood';
          /* v2.3.181: bamboo shrunk 60 -> 45 (~25% smaller) per user
             tuning. Chrome sword stays at 26. */
          /* v2.3.948: held greatsword shrunk 64 -> 48 (~25% smaller) per owner.
             Sheathed (36) and the bow are unchanged. */
          const targetH = wpn.type === 'greatsword' ? (_gsDir ? 48 : 36)
                         : wpn.type === 'staff'      ? 34
                         : wpn.type === 'bow'        ? (_gsDir ? 52 : 28)
                         : isWoodSword                ? 45
                         :                              26;
          const fitScale = targetH / Math.max(8, th);
          /* v2.3.1786: set by the carried branch below.  Declared HERE, beside
             fitScale in the same block as the scale.y assignment — the first
             cut of this put it beside the OTHER fitScale, forty lines up in
             _updateOtherPlayers, and the resulting ReferenceError was swallowed
             by pixiRenderer's per-system catch: the weapon simply stopped
             drawing and the probe read null, which looks nothing like a scope
             error.  Two parallel weapon implementations, one name. */
          let _weaponBladeUp = false;
          /* During an idle pose, mirror the blade horizontally for
             facings idx 3..6 (SW/W/NW/N) so it angles outward.  During
             a swing, rotation alone positions the blade — disable
             mirror, set rotation = swingAng (relative to the sprite's
             rest orientation, around the grip pivot which is the
             anchor). v2.3.176: sheathed mode rotates the blade
             diagonally across the player's back. */
          if (swingActive) {
            weaponSprite.rotation = swingAng;
            weaponSprite.scale.x = fitScale;
          } else if (!isInCombat) {
            /* Sheathed — diagonal across back, hilt high on one
               shoulder, blade tip low on opposite hip. Mirror flips
               which shoulder. */
            weaponSprite.rotation = mirror ? -Math.PI * 0.3 : Math.PI * 0.3;
            weaponSprite.scale.x = (mirror ? -1 : 1) * fitScale;
          } else {
            /* ═══ v2.3.1821b: TILT THE SOUTH BLADE OFF HIS FACE ═══
               Owner: "The south sword is right on the characters face tilt it
               just a smidge more to the right at least just on idle south
               view."

               A consequence of the mirror added minutes earlier in this same
               version: flipping the south sheet about the grip swung the
               blade across the head instead of away from it.  The fix is a
               small rotation about that same grip anchor, not a reposition —
               moving the sprite would take the hilt out of the hand.

               SIGN NOTE, and it is the easy thing to get wrong: the sprite is
               mirrored (scale.x < 0), so a POSITIVE Pixi rotation reads as
               counter-clockwise on screen.  Tilting the tip further right
               therefore needs a negative angle.  Verified against the
               rendered frame rather than reasoned about — see mp-swordcarry.

               Idle only: `swingActive` is handled above and owns the blade's
               angle during a swing, so this cannot fight the swing arc. */
            /* v2.3.1839: the tilt is overridable from the page so QA can sweep
               it in ONE build and pick by looking.  The sign is the trap this
               block already warns about — the sprite is mirrored, so screen
               direction and angle sign disagree — and sweeping settles it in a
               way that reasoning about radians repeatedly has not. */
            const _southTilt = (typeof window !== 'undefined'
              && typeof window.__btSouthTilt === 'number')
              ? window.__btSouthTilt : SOUTH_IDLE_TILT;
            weaponSprite.rotation = (_gsDir === 'south') ? _southTilt : 0;
            /* v2.3.942: per-facing greatsword art is already drawn for its
               canonical facing, so flip it only for the truly-mirrored facings
               (resolveDirection's `mirror`: west/northwest/southeast).  Other
               weapons keep the single-icon rule (flip for SW/W/NW/N). */
            /* ═══ v2.3.1821: THE SOUTH BLADE POINTS RIGHT ═══
               Owner: "The south facing held sword should point to the right
               (from the camera person's perspective) instead of left."

               South is not one of resolveDirection's mirrored facings, so its
               per-facing art was drawn as authored — hilt in the hand, blade
               out to the viewer's LEFT.  Adding south to the flip set mirrors
               that one sheet.

               Safe because the flip is about the GRIP: scale.x negates around
               the sprite's anchor, and the anchor is the handle point from
               handles.json, so the hilt stays exactly where the hand is and
               only the blade swings to the other side.  Nothing else moves,
               which is why this is one condition rather than a new anchor. */
            const weaponMirror = _gsDir
              ? (mirror || _gsDir === 'south')
              : (facingIdx >= 3 && facingIdx <= 6);
            weaponSprite.scale.x = (weaponMirror ? -1 : 1) * fitScale;
            /* v2.3.1786 (owner: "invert the sword held angle so instead of
               running around with it facing downward it points upward").

               A VERTICAL FLIP about the grip, not a 180-degree rotation.  Both
               put the blade up, but the anchor here is the weapon's HANDLE
               (getWeaponHandle), so a flip reflects the art across the grip and
               leaves the horizontal orientation alone — the crossguard lands
               just above the hand, where a raised blade's crossguard belongs,
               and the per-facing mirror rule on the line above keeps working
               untouched.  A rotation would mirror left-right as well, undoing
               that rule for every facing and pointing the tip back over the
               shoulder it came from.

               Carried poses only.  The swing branch drives rotation from
               swingAng and the sheathed branch angles the blade across the
               back; neither wants this, and both are separate branches above
               so neither can pick it up by accident. */
            _weaponBladeUp = true;
          }
          /* v2.3.1786 (owner: "invert the sword held angle so instead of
             running around with it facing downward it points upward" — then,
             on the first cut: "The sword needs to always aim forward though.
             And I'm just talking about JOGGING and IDLE sword position, not
             attacking").

             A VERTICAL FLIP about the grip, not a 180-degree rotation.  The
             per-facing greatsword art is drawn at a baked diagonal — east is
             hilt upper-left, blade down-FORWARD — so the two differ in exactly
             the way the owner's correction is about:
               rotation 180 inverts BOTH axes -> the blade points up and BACK,
                 over the shoulder, away from the way he is running;
               a flip inverts only the vertical -> up and FORWARD, keeping the
                 lean toward the facing, which is what was asked for.
             The flip also composes with the per-facing horizontal mirror above
             instead of fighting it: scale.x carries the facing, scale.y carries
             the blade direction, and neither touches the other.

             JOG AND IDLE ONLY, by construction rather than by a check: this is
             the carried branch.  A swing drives rotation from swingAng in its
             own branch above and the sheathed pose angles the blade across the
             back in another, so neither can pick this up. */
          weaponSprite.scale.y = _weaponBladeUp ? -fitScale : fitScale;
          /* v2.3.1760: the weapon's METAL is its blacksmith tier (gearBase), so
             a copper sword is copper everywhere without a new field.  Melee
             only — owner: "only for metals though not staff or bow". */
          weaponSprite.tint = weaponTint(wpn && wpn.type, wpn && wpn.gearBase);
          _lastWeaponSprite = weaponSprite; /* v2.3.1760: QA probe */
          /* v2.3.1786: carried-blade probe — a headless run cannot read the
             canvas, so the blade-up work is measured from here. */
          try {
            /* No getBounds() here: in pixi v8 it throws on a sprite whose
               texture has not resolved, and the catch below then swallowed the
               whole probe — which read as "the weapon branch never ran" and
               sent me looking for a bug one layer too far up. */
            window.__btWeapon = {
              visible: weaponSprite.visible, bladeUp: _weaponBladeUp,
              x: +weaponSprite.x.toFixed(2), y: +weaponSprite.y.toFixed(2),
              anchorX: weaponSprite.anchor.x, anchorY: weaponSprite.anchor.y,
              rotation: weaponSprite.rotation,
              scaleX: +weaponSprite.scale.x.toFixed(3), scaleY: +weaponSprite.scale.y.toFixed(3),
              wcIdx: display.getChildIndex(display._weaponContainer),
              spriteBodyIdx: display.getChildIndex(display._spriteBody),
              bodyTorsoIdx: display._bodyTorso ? display.getChildIndex(display._bodyTorso) : -1,
              bodyTorsoVis: !!(display._bodyTorso && display._bodyTorso.visible),
              gearChestIdx: display._gearChest ? display.getChildIndex(display._gearChest) : -1,
              gearChestVis: !!(display._gearChest && display._gearChest.visible),
              shirtIdx: display._shirtSprite ? display.getChildIndex(display._shirtSprite) : -1,
              shirtVis: !!(display._shirtSprite && display._shirtSprite.visible),
              spriteBodyVis: !!(display._spriteBody && display._spriteBody.visible),
              texW: weaponSprite.texture ? weaponSprite.texture.width : 0,
              texH: weaponSprite.texture ? weaponSprite.texture.height : 0,
              facing: S._renderFacing,
              /* ═══ v2.3.1839: WHERE THE BLADE ACTUALLY IS, AND WHERE HIS FACE IS ═══
                 Owner, twice now: the south blade sits over the character's
                 face.  An AABB of a diagonal blade is useless for this — it
                 covers the head whenever the sword leans — so publish the
                 blade's CENTRELINE (grip -> tip) and let the test do a
                 segment-vs-box check.  Both in global screen space, taken
                 through the live transforms rather than recomputed, so the
                 numbers describe the frame on screen. */
              blade: (() => {
                try {
                  const tw = weaponSprite.texture ? weaponSprite.texture.width : 0;
                  const th = weaponSprite.texture ? weaponSprite.texture.height : 0;
                  if (!tw || !th) return null;
                  const ax = weaponSprite.anchor.x, ay = weaponSprite.anchor.y;
                  /* THE WHOLE CENTRELINE, both ends, rather than "the tip".
                     Which texture end is the tip depends on the handle anchor
                     AND on v2.3.1786's vertical FLIP (scale.y < 0), and
                     guessing it produced a 6.7px stub sitting on the grip —
                     an assertion built on that would have reported a blade
                     that never touches anything.  Both ends span the blade in
                     either orientation, so nothing has to be guessed. */
                  const cx = tw * 0.5 - ax * tw;
                  const a = weaponSprite.toGlobal({ x: cx, y: 0 - ay * th });
                  const b2 = weaponSprite.toGlobal({ x: cx, y: th - ay * th });
                  return { gx: +a.x.toFixed(1), gy: +a.y.toFixed(1),
                    tx: +b2.x.toFixed(1), ty: +b2.y.toFixed(1),
                    len: +Math.hypot(b2.x - a.x, b2.y - a.y).toFixed(1) };
                } catch (e) { return null; }
              })(),
              /* The head region of the body ON SCREEN: the top fifth of the
                 painted figure, middle 44% of its width.  Derived from the
                 body sprite's own global bounds so it tracks whatever scale
                 and facing are live. */
              head: (() => {
                try {
                  const sb = display._spriteBody;
                  if (!sb || !sb.visible) return null;
                  const b = sb.getBounds();
                  return {
                    x0: +(b.x + b.width * 0.28).toFixed(1),
                    x1: +(b.x + b.width * 0.72).toFixed(1),
                    y0: +b.y.toFixed(1),
                    /* 26%, not 20%: at 20% the box stopped at the chin and a
                       blade across the mouth counted as clear.  Measured
                       against the sweep frames — the head occupies roughly the
                       top quarter of the painted figure. */
                    y1: +(b.y + b.height * 0.26).toFixed(1),
                  };
                } catch (e) { return null; }
              })(),
            };
          } catch (e) {}
          weaponSprite.visible = true;
          /* v2.3.185 hand-over-grip: stamp the body's hand pixels on
             top of the weapon. handCap is a Sprite that shares the
             body texture + transform; handMask is a small circle at
             the hand anchor that clips the clone to just the hand
             region. Result: the body's hand pixels render above the
             weapon, so the hand visually wraps the grip without
             splitting the player sprite. Skipped during swings (the
             sword rotates fast enough that a static cap would lag)
             and during sheathed mode (weapon's on the back, no grip
             to cover). */
          const handCap = display._handCapSprite;
          const handMask = display._handCapMask;
          const handArm = display._handArmSprite;
          const armMask = display._handArmMask;
          const _bodyRef = display._spriteBody;
          /* v2.3.186: hand-cap only fires when the weapon's z-order
             puts it IN FRONT of the body. The same forward-facing
             set used by the z-order block below. For back-side
             facings (SW/W/NW/N) the weapon already renders behind
             the body, so adding a hand cap on top of the weapon
             would stamp a redundant second copy of the hand and look
             wrong (user reported SW). */
          const _weaponInFront = (facingIdx === 0 || facingIdx === 1 || facingIdx === 2 || facingIdx === 7);
          /* v2.3.197: SE (idx 1) jog skips the hand-cap entirely --
             user reported the cap was stamping body pixels at the
             swinging-arm position, making the bamboo read as behind
             the upper arm. With the cap off for SE jog, bamboo stays
             fully in front. SE idle still gets a cap but with a
             smaller radius below. */
          const _seJogSkipCap = (facingIdx === 1 && pose === 'jog');
          /* v2.3.378: NE (7) jog also skips the hand-cap.  There the hand
             rises to head height in the run cycle, so the cap's bare-body
             clone stamped scalp pixels OVER the hair ("arm clips the hair").
             Dropping the cap on NE jog removes that without any z-order
             reshuffle (the grip wrap is barely visible at NE anyway). */
          const _neJogSkipCap = (facingIdx === 7 && pose === 'jog');
          /* v2.3.406: the hand-cap exists to wrap the hand around a SWORD
             grip.  A bow (held mid-limb, horizontal) and a staff (held low,
             vertical) have the grip in a different spot, so the cap's body-
             pixel circle stamped over the middle of the weapon -- the user
             saw the bow/staff "clipped" in the south view.  Only sword-type
             weapons get the cap. */
          const _weaponNeedsCap = wpn.type === 'sword' || wpn.type === 'greatsword';
          /* v2.3.749: the cap clones BODY pixels, and the layered shirt is no
             longer baked into the body texture -- so over the shirt the cap
             stamped a bare-skin circle ("shirt eaten at the right hand").
             Skip it while the layered shirt is showing (same pattern as the
             SE/NE jog skips); the grip-wrap nicety returns when the shirt
             clone learns to ride along. */
          const handCapEligible = handCap && handMask && _bodyRef
            && _bodyRef.visible && _bodyRef.texture
            && !swingActive && isInCombat
            && _weaponInFront
            && _weaponNeedsCap
            && !_seJogSkipCap
            && !_neJogSkipCap
            /* v2.3.764: inlined -- the _layerShirt const lives in a SIBLING
               block; referencing it here was a ReferenceError that killed
               _updatePlayer EVERY combat frame since v2.3.756 (caught by the
               headless QA bot).  The cap clones shirtless body pixels, so it
               stays off while the layered shirt is worn. */
            && getEquip('shirt') === 'none';
          if (handCapEligible) {
            handCap.texture = _bodyRef.texture;
            handCap.x = _bodyRef.x;
            handCap.y = _bodyRef.y;
            handCap.scale.x = _bodyRef.scale.x;
            handCap.scale.y = _bodyRef.scale.y;
            handCap.tint = _bodyRef.tint;
            handCap.visible = true;
            /* v2.3.196: layered mask. Base is the original 10-px
               circle at the hand (handles all forward facings, no
               impalement of the bamboo blade). For E + jog only,
               ALSO draw a capsule from shoulder to hand so the upper
               arm covers the shield during the back-swing of the
               east run cycle. Capsule uses butt cap (perpendicular
               slice at hand) instead of round cap so it doesn't
               extend past the hand in the blade's direction --
               v2.3.195's round cap was bleeding into the blade base
               and the user saw the bamboo "impaling" the player on
               S / SE / E idle and run. With this rule, only E run
               gets the bigger arm coverage; everything else keeps
               the v2.3.185 hand-only coverage. */
            handMask.clear();
            /* v2.3.197: per-facing base radius. SE (idx 1) shrinks
               from 10 -> 6 because the hand pixel can sit closer to
               the waist on SE idle and a 10-px circle was covering
               a large area of the bamboo near the player's torso.
               Everything else keeps the v2.3.185 default of 10. */
            const HAND_CAP_RADIUS = [10, 6, 10, 10, 10, 10, 10, 10];
            const capRadius = HAND_CAP_RADIUS[facingIdx] || 10;
            handMask.circle(weaponSprite.x, weaponSprite.y, capRadius);
            handMask.fill({ color: 0xffffff });
          } else if (handCap) {
            handCap.visible = false;
          }
          /* v2.3.200: arm capsule lives on a SEPARATE body-clone
             (handArmSprite) so it can be z-ordered BELOW weapon at
             frame time. Result for E + jog: arm pixels still cover
             the shield (shield sits below the arm-clone in child
             order), but the bamboo blade renders ABOVE the arm
             clone so it doesn't pick up body pixels through the
             mask anymore. v2.3.199's single-sprite approach put
             the capsule above weapon, which the user reported as
             "bamboo behind arm" during the backswing. */
          const useArmCapsule = handArm && armMask && _bodyRef
            && _bodyRef.visible && _bodyRef.texture
            && !swingActive && isInCombat
            && (facingIdx === 0 && pose === 'jog');
          if (useArmCapsule) {
            handArm.texture = _bodyRef.texture;
            handArm.x = _bodyRef.x;
            handArm.y = _bodyRef.y;
            handArm.scale.x = _bodyRef.scale.x;
            handArm.scale.y = _bodyRef.scale.y;
            handArm.tint = _bodyRef.tint;
            handArm.visible = true;
            armMask.clear();
            /* v2.3.202: capsule restored to full shoulder -> hand
               coverage (v2.3.199 had clipped it at mid-arm to
               protect the bamboo blade from being occluded by
               torso pixels). v2.3.200 moved handArm BELOW weapon
               in z-order so the mask now only affects what sits
               under the bamboo (= shield). With that protection,
               the mid-arm clip is no longer needed and the user
               was seeing the lower forearm still behind the shield
               during the backswing -- restoring full reach covers
               the whole right arm. The v2.3.201 back-shoulder
               circle was also removed: it ended up revealing the
               LEFT arm above the shield, which the user wants to
               stay hidden behind. */
            const shoulderX = 0;
            const shoulderY = -22;
            armMask.moveTo(shoulderX, shoulderY);
            armMask.lineTo(weaponSprite.x, weaponSprite.y);
            armMask.stroke({ color: 0xffffff, width: 16, cap: 'butt' });
            /* v2.3.2134: and the worn shirt, through the SAME capsule, over
               the body clone.  Without this the clone above is bare skin
               stamped on top of the tee -- east only, because the capsule is
               east only -- which is the bare shoulder the owner has reported
               six times.  Driven off the live gearShirt so a re-baked or
               patterned shirt rides along with it; hidden when the shirt is
               not drawn, which leaves the v2.3.200 behaviour exactly as it
               was for a bare-chested character. */
            const _armShirt = display._handArmShirt;
            const _armShirtMask = display._handArmShirtMask;
            const _wornShirt = display._gearShirt;
            if (_armShirt && _armShirtMask) {
              if (_wornShirt && _wornShirt.visible && _wornShirt.texture) {
                _armShirt.texture = _wornShirt.texture;
                _armShirt.x = _wornShirt.x;
                _armShirt.y = _wornShirt.y;
                _armShirt.scale.x = _wornShirt.scale.x;
                _armShirt.scale.y = _wornShirt.scale.y;
                _armShirt.tint = _wornShirt.tint;
                _armShirt.visible = true;
                _armShirtMask.clear();
                _armShirtMask.moveTo(shoulderX, shoulderY);
                _armShirtMask.lineTo(weaponSprite.x, weaponSprite.y);
                _armShirtMask.stroke({ color: 0xffffff, width: 16, cap: 'butt' });
              } else {
                _armShirt.visible = false;
              }
            }
            /* v2.3.2138: the cape through the same capsule, over the shirt
               clone.  Rotation and anchor come across too -- the cape is
               tilted and shoulder-pivoted on a jog, unlike the shirt, so a
               position-only copy would lay a straight stripe over a slanted
               cape. */
            const _armCape = display._handArmCape;
            const _armCapeMask = display._handArmCapeMask;
            /* v2.3.2186: take the FULL cape, which since the hood split lives on
               the back sprite -- _capeSprite now carries only the hood on the
               split facings, and a hood laid over the forearm is nothing. Falls
               back to _capeSprite for the unsplit facings (north/northeast),
               where it is still the whole garment. */
            const _capeBack = display._capeBackSprite;
            const _wornCape = (_capeBack && _capeBack.visible && _capeBack.texture)
              ? _capeBack : display._capeSprite;
            if (_armCape && _armCapeMask) {
              if (_wornCape && _wornCape.visible && _wornCape.texture) {
                _armCape.texture = _wornCape.texture;
                _armCape.x = _wornCape.x;
                _armCape.y = _wornCape.y;
                _armCape.scale.x = _wornCape.scale.x;
                _armCape.scale.y = _wornCape.scale.y;
                _armCape.rotation = _wornCape.rotation;
                _armCape.anchor.set(_wornCape.anchor.x, _wornCape.anchor.y);
                _armCape.tint = _wornCape.tint;
                _armCape.visible = true;
                _armCapeMask.clear();
                _armCapeMask.moveTo(shoulderX, shoulderY);
                _armCapeMask.lineTo(weaponSprite.x, weaponSprite.y);
                _armCapeMask.stroke({ color: 0xffffff, width: 16, cap: 'butt' });
              } else {
                _armCape.visible = false;
              }
            }
          } else if (handArm) {
            handArm.visible = false;
            if (display._handArmShirt) display._handArmShirt.visible = false;
            if (display._handArmCape) display._handArmCape.visible = false;
          }
        } else {
          weaponSprite.visible = false;
          if (display._handCapSprite) display._handCapSprite.visible = false;
          if (display._handArmSprite) display._handArmSprite.visible = false;
          if (display._handArmShirt) display._handArmShirt.visible = false;   /* v2.3.2134 */
          if (display._handArmCape) display._handArmCape.visible = false;     /* v2.3.2138 */
          /* Procedural fallback — abstract line / arc / orb. */
          if (wpn.type === 'bow') {
            // Bow arc
            weaponGfx.arc(wpnX, wpnY, 8, -0.8, 0.8);
            weaponGfx.stroke({ color: 0x8B6914, width: 2 });
            // String
            weaponGfx.moveTo(wpnX + Math.cos(-0.8) * 8, wpnY + Math.sin(-0.8) * 8);
            weaponGfx.lineTo(wpnX + Math.cos(0.8) * 8, wpnY + Math.sin(0.8) * 8);
            weaponGfx.stroke({ color: 0xaaaaaa, width: 1, alpha: 0.6 });
          } else if (wpn.type === 'staff') {
            // Staff line with orb
            weaponGfx.moveTo(wpnX, wpnY + 10);
            weaponGfx.lineTo(wpnX, wpnY - 10);
            weaponGfx.stroke({ color: 0x8B6914, width: 2 });
            weaponGfx.circle(wpnX, wpnY - 12, 3);
            weaponGfx.fill({ color: wpnColor, alpha: 0.8 });
          } else {
            // Sword/greatsword
            const len = wpn.type === 'greatsword' ? 14 : 10;
            weaponGfx.moveTo(wpnX, wpnY + 2);
            weaponGfx.lineTo(wpnX + facingX * len || len * 0.7, wpnY - len * 0.3);
            weaponGfx.stroke({ color: 0xcccccc, width: wpn.type === 'greatsword' ? 3 : 2 });
            // Element glow at tip
            if (elem) {
              weaponGfx.circle(wpnX + (facingX * len || len * 0.7), wpnY - len * 0.3, 2);
              weaponGfx.fill({ color: wpnColor, alpha: 0.6 });
            }
          }
        }
      } else if (wpn && isShielding && !S._blockPose && S.rpg && S.rpg.shield
                 && SOUTH_BLOCK_OFFHAND_ENABLED && _placeSouthBlockWeapon(display, wpn, bobY)) {
        /* ═══ v2.3.1871: THE SOUTH BLOCK KEEPS ITS WEAPON TOO ═══
           Owner: "the south block view needs to show weapon in offhand
           partially occluded by shield".

           Every other facing gets this from the bow stand-in (v2.3.1864), and
           south is the one facing that has no stand-in at all — its bow body
           sheet is holed through the face (v2.3.1805), so the block there is
           the REAL body with a free-floating shield.  That is why the weapon
           was still being hidden here: this branch is the "shield is up" case,
           and south never reaches the stand-in's off-hand code.

           So it is drawn from the display container instead, and the
           occlusion the owner asked for is the z-order — see
           _placeSouthBlockWeapon, which parks the weapon container directly
           BENEATH the shield.  The shield at south is a 72px disc over the
           chest, so a weapon at the off hand shows past its edge and is cut
           where they overlap, which is what "partially occluded" means.

           Guarded on !S._blockPose so it can never double up with the
           stand-in's own off-hand weapon: exactly one of the two draws. */
        if (display._handCapSprite) display._handCapSprite.visible = false;
        if (display._handArmSprite) display._handArmSprite.visible = false;
      } else {
        /* No weapon equipped or shield is up — hide the icon Sprite
           so a stale icon doesn't linger from a previous loadout (or
           render on top of the shield arc during a block). */
        if (display._weaponSprite) display._weaponSprite.visible = false;
        if (display._handCapSprite) display._handCapSprite.visible = false;
        if (display._handArmSprite) display._handArmSprite.visible = false;
      }
      /* Z-order: weapon in front of body for forward facings (idx 0..3
         = E/SE/S/SW), weapon behind body for back facings (idx 4..7 =
         W/NW/N/NE) so a held weapon is partially occluded by the back
         when the player faces away.  The weaponContainer wraps all
         three visuals so a single setChildIndex moves them as one. */
      if (display._weaponContainer && display._spriteBody) {
        /* Per-direction z-order.  Different rule for shield vs weapon:
           - Weapon: E/SE/S (0,1,2) AND NE (7) in front; SW/W/NW/N
             behind.  NE is in front so the sword doesn't disappear
             when the right arm swings far back during a NE jog.  SW
             is behind because the user prefers the look there.
           - Shield: all forward-half facings — E/SE/S/SW (0,1,2,3) —
             in front; back-half — W/NW/N/NE (4,5,6,7) — behind.  The
             shield's wide frontal wedge reads as a guard pose for
             toward-camera angles and is occluded by the back for
             away-from-camera angles. */
        /* v2.3.176 (F4): when sheathed, weapon is on player's BACK,
           so the z-order inverts vs in-hand. Forward facings (player
           facing camera) -> weapon is behind body (their back is away
           from us). Back facings -> weapon visible in front (their
           back is toward us). */
        const sheathed = !isInCombat;
        const inFrontInHand = isShielding
          ? (facingIdx >= 0 && facingIdx <= 3)
          /* v2.3.199: SW dropped from the in-front set. v2.3.192 had
             added SW because user wanted bamboo above the hand, but
             that put the whole blade above the body silhouette and
             read as the bamboo floating over the torso. User now
             wants SW bamboo behind the body. The bamboo extends west
             from the hand on SW (mirror=true) so the blade tip still
             passes past the body and stays visible. */
          : (facingIdx === 0 || facingIdx === 1 || facingIdx === 2 || facingIdx === 7);
        /* v2.3.950: greatsword + bow now render HELD IN HAND during idle/walk
           (#114), not sheathed on the back, so the on-back inversion no longer
           applies to them -- it was flipping the SE/NE weapon behind the body.
           Held weapons always use the in-hand order (SE/NE in front); sword/staff
           keep the sheathed inversion. */
        const _heldInHand = wpn && (wpn.type === 'greatsword' || wpn.type === 'bow');
        /* v2.3.1787 (owner: "SW SE and E need the sword layered in front of").
           E and SE were already in the set above; SW was not.  v2.3.199 had
           dropped SW deliberately — but for the BAMBOO sword, where "the whole
           blade above the body silhouette read as the bamboo floating over the
           torso".  The greatsword is carried point-up in the hand since
           v2.3.1786, so its blade rises clear of the torso instead of lying
           across it, and that reasoning no longer applies to it.  Scoped to
           held weapons so the bamboo/staff keep the v2.3.199 behaviour their
           incident is about. */
        const inFrontHeld = inFrontInHand || facingIdx === 3;
        const inFront = _heldInHand ? inFrontHeld : (sheathed ? !inFrontInHand : inFrontInHand);
        const bodyIdx = display.getChildIndex(display._spriteBody);
        const wcIdx   = display.getChildIndex(display._weaponContainer);
        /* v2.3.1787 (owner: "SW SE and E need the sword layered in front of"
           ... "Looks like it is probably the shirt").  It was the shirt.

           "In front" was measured against _spriteBody, and _spriteBody IS NOT
           DRAWN — since v2.3.608 it is the invisible texture+transform
           reference the per-region body sprites and the gear copy from.  Every
           layer you can actually see (bodyHead/Torso/Legs, the five gear
           slots, the layered shirt) is added AFTER it, so landing the weapon
           one slot above the reference still buried it under all of them.  The
           facings the owner named are simply the ones where the blade crosses
           the torso, which is where the shirt is.

           So the in-front anchor is now the TOPMOST VISIBLE worn layer, found
           by asking them rather than by hard-coding a position — a new gear
           slot inserted later joins the list and cannot silently end up over
           the blade.  Face, hair and headwear are deliberately NOT in it: they
           sit above the weapon by build order and should stay there (v2.3.378
           records a swinging arm clipping the hair; a blade over the scalp is
           the same defect). */
        let frontRefIdx = bodyIdx;
        for (const _r of [display._bodyHead, display._bodyTorso, display._bodyLegs,
                          display._gearLegs, display._gearShirt, display._gearChest,
                          display._gearShoulders, display._gearHead, display._shirtSprite]) {
          if (_r && _r.visible) {
            const _i = display.getChildIndex(_r);
            if (_i > frontRefIdx) frontRefIdx = _i;
          }
        }
        /* Pixi setChildIndex removes the child, then inserts at the
           given index in the post-removal array.  When weaponContainer
           is currently AFTER the reference, removing it leaves the
           reference at its original index; when BEFORE, removing shifts
           the reference down by 1.  Compute target accordingly so we land
           exactly one slot after (in front) or one slot before (behind). */
        const targetIdx = inFront
          ? (wcIdx > frontRefIdx ? frontRefIdx : frontRefIdx - 1) + 1   // above the topmost worn layer
          : (wcIdx > bodyIdx ? bodyIdx : Math.max(0, bodyIdx - 1));     // before spriteBody
        if (wcIdx !== targetIdx) {
          display.setChildIndex(display._weaponContainer, targetIdx);
        }
      }

      /* Shield z-order: when the shield is held facing N / NE / NW
         (sectors 6, 7, 5), the shield should sit BEHIND the player
         sprite so it reads as held away from the camera; for every
         other facing it stays in front (its default order, since it
         was added after spriteBody). */
      if (display._shieldSprite && display._shieldSprite.visible && display._spriteBody) {
        /* v2.3.190: shield z-order rules.
           In-hand (raised): behind body for NW/N/NE (5/6/7).
           On-back rule: in front of body for E (0) + N-half (5/6/7);
           behind body for SE/S/SW/W (1/2/3/4). E joined the in-front
           set per user request -- with shield behind body on E, only
           a sliver was visible past the silhouette. */
        /* v2.3.1782: this block now only ever runs for a shield IN HAND —
           the on-back render moved to its own two sprites below and never
           touches this one.  So the old `shieldOnBack = !shieldVisible`
           branch is gone along with its rule; what remains is the in-hand
           rule alone, unchanged: behind the body for NW/N/NE, in front for
           everything else.  (v2.3.1735's bug — a Shield Bash pose falling
           down the on-back rule and vanishing into the torso — cannot recur,
           because there is no on-back rule here to fall down.) */
        const shieldBehind = (facingIdx === 5 || facingIdx === 6 || facingIdx === 7);
        const bodyIdx = display.getChildIndex(display._spriteBody);
        const shIdx   = display.getChildIndex(display._shieldSprite);
        /* For in-front mode, shield needs to render ABOVE the hand-cap
           (handCapSprite, added after weaponContainer in v2.3.185).
           Without this, the hand-cap pixels were drawing over the
           shield on forward facings where both were visible (user
           reported NE / E). Target index = right after handCapSprite. */
        const handCapIdx = display._handCapSprite
          ? display.getChildIndex(display._handCapSprite)
          : -1;
        /* v2.3.194: for E (idx 0) specifically, the user wants the
           hand-cap (= arm pixels) layered ABOVE the shield -- the arm
           swings over the shield during the east run cycle and should
           occlude it. NE (idx 7) is the inverse case from v2.3.190
           where shield needs to stay above the cap. Per-facing flag. */
        const handCapAboveShield = (facingIdx === 0);
        let targetShIdx;
        if (shieldBehind) {
          targetShIdx = shIdx > bodyIdx ? bodyIdx : Math.max(0, bodyIdx - 1);
        } else if (handCapAboveShield) {
          /* v2.3.198: place shield BELOW weaponContainer (immediately
             before it in child order). Result for E: body, shield,
             weapon, handCap -- bamboo overlaps shield, arm (handCap)
             still overlaps everything. The v2.3.194 fix put shield
             below handCap but ABOVE weapon, which made the bamboo
             read as falling behind the shield during the E run swing.
             Putting shield below weapon keeps the arm-over-shield
             behavior (handCap is still last) while letting the bamboo
             stay in front of the shield except at the hand area. */
          const wcIdxForSh = display.getChildIndex(display._weaponContainer);
          targetShIdx = shIdx > wcIdxForSh ? wcIdxForSh : Math.max(0, wcIdxForSh - 1);
        } else if (handCapIdx >= 0) {
          /* Shield goes ABOVE handCap (= NE and default in-front rule). */
          targetShIdx = shIdx > handCapIdx ? handCapIdx + 1 : handCapIdx;
        } else {
          targetShIdx = shIdx > bodyIdx ? bodyIdx + 1 : bodyIdx;
        }
        if (shIdx !== targetShIdx) {
          display.setChildIndex(display._shieldSprite, targetShIdx);
        }
      }

      /* v2.3.200: place handArmSprite right BEFORE weaponContainer so
         it sits between shield (below) and weapon (above). Result for
         E + jog: body, shield, handArm, weaponContainer, handCap --
         the arm clone covers the shield where the capsule mask is
         drawn (good), but the bamboo blade renders above the arm
         clone (so the user no longer sees "bamboo behind arm"). */
      if (display._handArmSprite && display._handArmSprite.visible && display._weaponContainer) {
        const wcIdxArm = display.getChildIndex(display._weaponContainer);
        const haIdx    = display.getChildIndex(display._handArmSprite);
        const targetArmIdx = haIdx > wcIdxArm ? wcIdxArm : Math.max(0, wcIdxArm - 1);
        if (haIdx !== targetArmIdx) {
          display.setChildIndex(display._handArmSprite, targetArmIdx);
        }
        /* v2.3.2134: the shirt clone follows the body clone.  It is added
           immediately above it in the builder, but this block MOVES the body
           clone every frame, so a static build order does not survive -- the
           shirt would be left wherever it started and stop covering the arm.
           Placed directly above the body clone and therefore still below the
           weapon (inserting at the weapon's index pushes the weapon up), so
           v2.3.200's shield/blade sandwich is unchanged.
           The index is recomputed after the move rather than derived from
           targetArmIdx: setChildIndex splices, so a clone coming from BELOW
           shifts the body clone down by one on removal and one coming from
           above does not. */
        const _as = display._handArmShirt;
        if (_as && _as.visible) {
          const bIdx = display.getChildIndex(display._handArmSprite);
          const sIdx = display.getChildIndex(_as);
          const wantIdx = sIdx < bIdx ? bIdx : bIdx + 1;
          if (sIdx !== wantIdx) display.setChildIndex(_as, wantIdx);
        }
        /* v2.3.2138: and the cape clone directly above whichever of those two
           is on top, so the stack stays body -> shirt -> cape, matching the
           order the real layers are drawn in.  Same splice-aware recompute as
           above, for the same reason. */
        const _ac = display._handArmCape;
        if (_ac && _ac.visible) {
          const topIdx = (_as && _as.visible)
            ? display.getChildIndex(_as)
            : display.getChildIndex(display._handArmSprite);
          const cIdx = display.getChildIndex(_ac);
          const wantIdx = cIdx < topIdx ? topIdx : topIdx + 1;
          if (cIdx !== wantIdx) display.setChildIndex(_ac, wantIdx);
        }
      }

      /* v2.3.354: beard z-order, computed AFTER the weapon / shield / arm
         swaps so it has the final say on the facial-hair layer. */
      _orderTraitsAndWeapon(display, facingIdx, getHeadwear());   /* v2.3.1934 */

      /* Swing trail.  v2.3.252: armed swings back to the legacy
         fan-shaped arc sector per user request (the bamboo stick now
         swings instead of chops).  Unarmed (fist) swings keep the
         v2.3.247 chop streak so the new attack-sprite motion still
         reads when no weapon is equipped. */
      if (swingActive) {
        const isSpecialSwing = !!S._specialAttack;
        if (wpn) {
          /* v2.3.222: special swing 2x reach (matches the doubled
             SWING_RANGE in BroTown.jsx) and a full half-circle visual
             arc (matches the doubled damage arc).  Regular swing
             unchanged. */
          const trailReach = isSpecialSwing ? 84 : 42;
          const visualArc  = isSpecialSwing ? Math.PI : SWING_FULL_ARC;
          const startAng = aimAngleForSwing - visualArc / 2;
          const endAng   = aimAngleForSwing + swingOffset;
          const baseAlpha = (1 - swingProgress) * 0.35;
          const trailAlpha = isSpecialSwing ? baseAlpha * 1.6 : baseAlpha;
          const fillColor   = isSpecialSwing ? 0xffd54a : 0xffffff;
          const strokeColor = isSpecialSwing ? 0xfff2a8 : 0xfffac8;
          const strokeWidth = isSpecialSwing ? 4 : 2;
          weaponGfx.moveTo(wpnX, wpnY);
          weaponGfx.arc(wpnX, wpnY, trailReach, startAng, endAng);
          weaponGfx.lineTo(wpnX, wpnY);
          weaponGfx.fill({ color: fillColor, alpha: trailAlpha });
          weaponGfx.arc(wpnX, wpnY, trailReach, startAng, endAng);
          weaponGfx.stroke({ color: strokeColor, width: strokeWidth, alpha: trailAlpha * 1.2 });
          if (isSpecialSwing) {
            /* Outer yellow halo ring — adds the "glow" cue beyond the arc. */
            weaponGfx.arc(wpnX, wpnY, trailReach + 10, startAng, endAng);
            weaponGfx.stroke({ color: 0xf5c542, width: 3, alpha: trailAlpha * 0.7 });
          }
        } else {
          /* Unarmed chop streak (v2.3.247).  Quadratic curve from
             overhead down to the strike point reach units forward
             of the player.  Special-attack chop is beefier. */
          const reach        = isSpecialSwing ? 64 : 34;
          const overheadDrop = isSpecialSwing ? -68 : -44;
          const endX = Math.cos(aimAngleForSwing) * reach;
          const endY = Math.sin(aimAngleForSwing) * reach;
          const baseAlpha   = (1 - swingProgress) * 0.55;
          const strokeColor = isSpecialSwing ? 0xfff2a8 : 0xfffac8;
          const haloColor   = isSpecialSwing ? 0xf5c542 : 0xffffff;
          const outerW = isSpecialSwing ? 7 : 4;
          const innerW = isSpecialSwing ? 3 : 2;
          /* Outer streak. */
          weaponGfx.moveTo(wpnX, wpnY + overheadDrop);
          weaponGfx.quadraticCurveTo(
            wpnX + endX * 0.15, wpnY + overheadDrop * 0.35,
            wpnX + endX,        wpnY + endY,
          );
          weaponGfx.stroke({ color: strokeColor, width: outerW, alpha: baseAlpha });
          /* Inner bright core. */
          weaponGfx.moveTo(wpnX, wpnY + overheadDrop);
          weaponGfx.quadraticCurveTo(
            wpnX + endX * 0.15, wpnY + overheadDrop * 0.35,
            wpnX + endX,        wpnY + endY,
          );
          weaponGfx.stroke({ color: haloColor, width: innerW, alpha: baseAlpha * 1.6 });
        }
      }

      // Shield visual — 120° guard arc in front of the player, oriented
      // toward the aim direction (S._shieldAngle if set, else
      // S._aimAngle, else facingAngle).  Drawn as a translucent
      // wedge fill plus a thicker rim so it reads as an actual
      // barrier.  Pulses brighter when a hit was just blocked.
      // v2.3.212: now gated on R.shield being equipped (was previously
      // shield-up input only).  Unequipped players can't visually
      // raise a shield they don't have.
      if (shieldVisible && S.rpg && S.rpg.shield) {
        /* v2.3.1735: a bash pose names its own angle and WINS over the
           block-time ladder — the cast stamped the direction the shove was
           thrown in, and that is the direction the shield must face for the
           whole window even if the player keeps steering afterwards. */
        const shieldAng = (shieldPoseAng != null)
          ? shieldPoseAng
          : (S._shieldAngle != null)
            ? S._shieldAngle
            : ((S._aimAngle != null) ? S._aimAngle : (S._facingAngle || 0));
        const sR = 16;                        // hand-out distance from body (no-arm fallback)
        // Player sprite is bottom-anchored (feet at y=0). With the 2x size
        // bump the shield center sits at feet, top reaches chest naturally.
        const shieldHoldY = 0;
        const blockAge = S._blockFlash ? (now - S._blockFlash) / 250 : 1;
        const blockPulse = blockAge < 1 ? (1 - blockAge) : 0;
        const shieldFrame = getShieldFrame(shieldAng);
        const shieldSprite = display._shieldSprite;
        if (shieldFrame && shieldSprite) {
          if (shieldSprite.texture !== shieldFrame.tex) shieldSprite.texture = shieldFrame.tex;
          /* v2.3.1785: hold it in the hand of the arm cut from the bow art.
             Falls back to the old angle-and-radius placement when there is no
             arm for this facing (every north one) or the bow sheets have not
             loaded yet — the shield still appears, it just floats as before
             rather than waiting on art. */
          /* The drawn figure height for THIS facing and pose — the same
             expression that publishes S._swordBodyH for the attack stand-ins
             (crown-to-foot 221-33 in the source frame, through the per-facing
             body scale and the per-zone display scale).  The arm is cut from
             art authored at a different size, so it needs this to match. */
          const _blockBodyH = (221 - 33) * bodyDirScale(pose, dir) * LOCAL_SCALE * (display.scale.y || 1);
          const _armHand = _placeBlockArm(display, facing, _blockBodyH, bobY);
          /* ═══ v2.3.1800: DON'T PASTE AN ARM ONTO A BODY THAT HAS ONE ═══
             Owner, looking at the stand-in: "East (the mirror of west) is
             showing two arms.  The outstretched arm that came with the bow
             attack pose looks more natural.  I think if you just removed the
             extra arm you put on there it'd look natural."
             Exactly so.  The cut arm existed to give the WALKING body an
             outstretched one; the bow pose already has that arm, authored,
             and the paste-on is now a duplicate sitting a pixel or two off it.
             It still gets CALLED, because the hand it computes is what the
             shield is positioned by and that placement is already tuned — but
             nothing it draws is shown. */
          if (_blockPose) _hideBlockArm(display, { reason: 'stand-in has its own arm' });
          if (_armHand) {
            shieldSprite.x = _armHand.x;
            shieldSprite.y = _armHand.y;
          } else {
            shieldSprite.x = Math.cos(shieldAng) * sR;
            shieldSprite.y = Math.sin(shieldAng) * sR + bobY + shieldHoldY;
          }
          /* v2.3.1798: the SAME world size as the shield on his back — see
             HELD_SHIELD_PX.  Sized through width/height rather than a scale
             factor, exactly as applyBackShield does, so the result is that
             many world px whatever the source texture measures; the old
             `56/64` silently depended on the art being 64px.  The mirror is
             then re-applied as the sign of scale.x.  Anchor is (0.5,0.5), so
             growing it keeps its centre in the hand. */
          shieldSprite.width = HELD_SHIELD_PX;
          shieldSprite.height = HELD_SHIELD_PX;
          shieldSprite.scale.x = Math.abs(shieldSprite.scale.x) * (shieldFrame.mirror ? -1 : 1);
          /* v2.3.193: reset rotation in the in-hand path -- otherwise
             a running-lean rotation from the on-back path could stick
             when the player flips into a block mid-stride. */
          shieldSprite.rotation = 0;
          /* Brief brightness pop on a successful block. */
          const pulseTint = blockPulse > 0 ? 0xffffff : 0xffffff;
          shieldSprite.tint = pulseTint;
          shieldSprite.alpha = 0.95 + blockPulse * 0.05;
          shieldSprite.visible = true;
          /* ═══ v2.3.1805: A SHIELD HELD AWAY FROM THE CAMERA ═══
             Owner: "The northeast/northwest and north facings put the shield
             facing the camera but should show the character's back with the
             shield in front of them facing those directions."
             There has been a rule for this since v2.3.190 — shieldBehind for
             sectors 5/6/7 — and under the stand-in it CANNOT WORK, because it
             is a child-index rule and the two things it is ordering are no
             longer siblings: the body is drawn by effectsRenderer into its
             nodeLayer while this shield is a child of the player display.  No
             index in one container can put a sprite behind a sprite in
             another, so the shield sat on top and, facing north, covered the
             character completely.
             The stand-ins already solved exactly this for the SLUNG shield:
             a lo/hi clone pair straddling the body sprite (v2.3.1784), picked
             by facing.  So hand the held shield to the same pair — publish
             what to draw and let effectsRenderer draw it on the correct side —
             and hide this one, which is in the wrong container to help. */
          if (_blockPose && (facingIdx === 5 || facingIdx === 6 || facingIdx === 7)) {
            shieldSprite.visible = false;
            /* The TEXTURE travels too, not just the angle: shieldFrame was
               already chosen here by the same getShieldFrame the display path
               uses, and re-deriving it on the other side is how the two
               placements drift apart. */
            S._blockShieldBehind = {
              tex: shieldFrame.tex, mirror: !!shieldFrame.mirror, ang: shieldAng,
              px: HELD_SHIELD_PX,
            };
          } else {
            S._blockShieldBehind = null;
          }
          /* v2.3.1798: the caret, pointing out along the guarded direction.
             Measured from the SHIELD's final position rather than from the
             body, so it stays correct on both placements — the arm's hand
             (which moves per facing) and the free-floating fallback. */
          _drawBlockCaret(display, shieldSprite.x, shieldSprite.y, shieldAng, blockPulse);
          /* v2.3.1798 dev probe, house style (__btBlockArm, __btWorldProps):
             the shield's size, the pose the body settled on, and where the
             caret's tip landed.  None of the three can be read off a
             screenshot — you cannot count arms in a 110px crop — so the test
             reads the facts instead.  See tools/qa/mp/mp-blockstance.mjs. */
          if (typeof window !== 'undefined') {
            const _g = display._blockCaretGfx;
            window.__btBlockPose = {
              pose: pose,
              /* v2.3.1800: which body is actually on screen.  With the bow
                 stand-in driving a block, `pose` describes a body that is
                 HIDDEN, so a test that only read it would be reasoning about
                 something the player cannot see. */
              standIn: !!S._blockPose,
              standInDir: S._blockPose ? S._bowDir : null,
              jogLegs: !!(S._blockPose && S._bowJogLegs),
              /* v2.3.1805: which side of the body the shield is drawn on, and
                 by WHICH renderer.  Facing away it has to be the stand-in's
                 lower clone; the display's own sprite is in a container that
                 cannot be ordered against the stand-in at all. */
              shieldBehind: !!S._blockShieldBehind,
              shieldSpriteVisible: !!(display._shieldSprite && display._shieldSprite.visible),
              shieldAng: shieldAng,
              stateShieldAng: S._shieldAngle,
              stateAimAng: S._aimAngle,
              facing: facing,
              moving: isMoving,
              planted: _blockPlanted,
              /* v2.3.1833: where the figure is on SCREEN.  A QA shot of a
                 block has to be clipped to the player, and the viewport
                 centre is not it — the camera does not hold the player dead
                 centre, so a centre crop returns the cobblestones. */
              screen: (() => {
                const g = display.toGlobal({ x: 0, y: 0 });
                return { x: +g.x.toFixed(1), y: +g.y.toFixed(1) };
              })(),
              shieldW: Math.round(Math.abs(shieldSprite.width)),
              backShieldPx: BACK_SHIELD_PX,
              shieldX: shieldSprite.x, shieldY: shieldSprite.y,
              armVisible: !!(display._blockArmSprite && display._blockArmSprite.visible),
              caretVisible: !!(_g && _g.visible),
              caretTip: _g && _g.visible ? {
                x: shieldSprite.x + Math.cos(shieldAng) * CARET_OUT,
                y: shieldSprite.y + Math.sin(shieldAng) * CARET_OUT,
              } : null,
            };
          }
        } else {
          if (shieldSprite) shieldSprite.visible = false;
          _hideBlockCaret(display);
          /* Fallback procedural arc — sprite hasn't loaded yet. */
          const sArc = Math.PI * 2 / 3;
          const startA = shieldAng - sArc / 2;
          const endA   = shieldAng + sArc / 2;
          weaponGfx.moveTo(0, bobY);
          weaponGfx.arc(0, bobY, 20, startA, endA);
          weaponGfx.lineTo(0, bobY);
          weaponGfx.fill({ color: 0x5dade2, alpha: 0.18 + blockPulse * 0.25 });
          weaponGfx.arc(0, bobY, 20, startA, endA);
          weaponGfx.stroke({ color: 0x5dade2, width: 4 + blockPulse * 4, alpha: 0.85 });
          if (blockPulse > 0) {
            weaponGfx.arc(0, bobY, 20, startA, endA);
            weaponGfx.stroke({ color: 0xffffff, width: 2, alpha: blockPulse * 0.9 });
          }
        }
      } else if (display._shieldSprite) {
        display._shieldSprite.visible = false;
      }
      if (!shieldVisible || !(S.rpg && S.rpg.shield)) _hideBlockCaret(display);
      if (!shieldVisible) _hideBlockArm(display, { reason: 'shield down' });

      /* ═══ v2.3.1782: the shield slung on the back ═══
         Cosmetic only.  Restored from the v2.3.377 removal ("a persistent
         source of per-facing z-order issues vs the body/arms/weapon/hair"),
         on two sprites instead of one — see createPlayerDisplay for why that
         is the whole fix.

         THE RULE, and it is one rule rather than a table:
         the shield draws in FRONT of the body only when you are looking at
         the player's back — NW/N/NE.  Every other facing it is behind him,
         because his body is between it and the camera.

         E and W are the pair the old code got asymmetric: it put E in front
         "per user request" because a shield behind the body showed only a
         sliver, then needed a west-run-only +6px nudge to make W peek out at
         all.  Both are the same pure side view, so both belong on the same
         side of the body — and the reason E looked wrong behind was not the
         layer, it was the 4px offset: at 4px the shield is inside the torso
         silhouette whichever layer it is on.  Pushing it to the back EDGE
         (BACK_RX below) makes it read at E and W alike, from behind, with no
         nudge table and no per-facing exception.

         Held beats slung: whenever the shield is in hand for any reason — a
         block or a Shield Bash — both clones hide.  That was the v2.3.1735
         bug in the old single-sprite version, where a posed shield fell down
         the on-back z-rule and disappeared into the torso. */
      const _shLo = display._shieldBackLo;
      const _shHi = display._shieldBackHi;
      if (_shLo && _shHi) {
        /* Standing and jogging only (owner: "while jogging and standing").

           v2.3.1784: `pose` alone is NOT enough of a gate.  During a sword
           swing or a bow shot the body above is hidden and the whole figure is
           redrawn by a stand-in in effectsRenderer's nodeLayer — but pose
           stays 'stand'/'jog' the entire time, so this kept drawing a shield
           against a body that was no longer on screen.  _swordSwing/_bowShot
           are the same flags that hid the body, so the shield now leaves with
           it, and effectsRenderer draws the stand-in's own pair instead. */
        const backOk = !shieldVisible && S.rpg && S.rpg.shield
          && (pose === 'stand' || pose === 'jog')
          && !_swordSwing && !_bowShot && !S._dying;
        const backFacing = SECTORS.indexOf(facing);
        const place = backOk
          ? backShieldPlacement(backFacing, pose === 'jog', bobY)
          : null;
        if (!place) {
          _shLo.visible = false;
          _shHi.visible = false;
        } else {
          const shown = place.behind ? _shLo : _shHi;
          const hidden = place.behind ? _shHi : _shLo;
          hidden.visible = false;
          applyBackShield(shown, place, BACK_SHIELD_PX);
          shown.x = place.dx;
          shown.y = place.dy;
        }
        const backFrame = place && place.frame;
        /* QA probe — a headless run cannot read the WebGL canvas, so the
           z-order assertions in mp-backshield read this. */
        try {
          window.__btBackShield = {
            on: !!(_shLo.visible || _shHi.visible),
            facingIdx: SECTORS.indexOf(facing), pose,
            standIn: !!(_swordSwing || _bowShot),
            behind: _shLo.visible, front: _shHi.visible,
            loIdx: display.getChildIndex(_shLo),
            hiIdx: display.getChildIndex(_shHi),
            bodyIdx: display._spriteBody ? display.getChildIndex(display._spriteBody) : -1,
            armIdx: display._handArmSprite ? display.getChildIndex(display._handArmSprite) : -1,
            heldVisible: !!(display._shieldSprite && display._shieldSprite.visible),
            /* v2.3.1805: facing away, the held shield is drawn by the stand-in's
               lower clone instead of by this display's sprite — so "is it in
               hand" is the OR of the two, not heldVisible alone. */
            heldByStandIn: !!S._blockShieldBehind,
            mirror: !!(backFrame && backFrame.mirror),
            sizePx: _shLo.visible ? _shLo.height : _shHi.height,
            texH: (_shLo.visible ? _shLo : _shHi).texture ? (_shLo.visible ? _shLo : _shHi).texture.height : 0,
            dispScale: display.scale ? display.scale.y : 1,
            rotation: _shLo.visible ? _shLo.rotation : _shHi.rotation,
          };
        } catch (e) { /* never breaks the frame */ }
      }
    }

    // Player resource bars (HP/stamina/mana) removed — duplicated by
    // the bottom dashboard's resource readout (user request).  Name
    // tag now always sits at its default head offset.
    display._nameText.y = -28 + bobY;

    /* v2.3.1747: the x1/x2/x3 half of this badge is gone (owner: "I think I
       want you to remove the combo (the x1, x2, x3) from the game").  The
       badge itself stays because it also carried the §5.7.7 RESONANCE streak
       (↯N), a different mechanic that is still live — deleting the whole
       element would have taken that with it. */
    const comboText = display._comboText;
    const rs = S.player && S.player._resonanceStreak;
    const rsActive = rs && rs.count > 0 && (now - (rs.lastTs || 0) < 10000);
    if (rsActive) {
      comboText.text = '↯' + rs.count;
      comboText.style.fill = '#a0c8ff';
      comboText.alpha = 1;
      comboText.y = display._nameText.y - 12;
    } else {
      comboText.alpha = 0;
    }

    /* Local player's name + level now live in the top-right player card
       (BottomDashboard.jsx).  Hide the above-head plate so it doesn't
       sit redundantly on top of the new HP heart.
       v2.3.1564: that card is long gone (retired v2.3.1294) — the readout
       lives in the pill below the feet now, built here. */
    if (display._nameText.visible) display._nameText.visible = false;
    /* Hidden while dying so the plate doesn't hover over a corpse. */
    /* v2.3.1895: ...and hidden while a resource bar is up (owner: "name plate
       will disappear when mp is used").  The bars occupy the plate's own y,
       so this is not a preference — they would overlap.
       ONE FRAME STALE, deliberately: update() runs _updatePlayer before
       _updatePlayerHud, so this reads the flag the previous frame's HUD pass
       set.  16ms against a bar that holds for 1000, and reordering update()
       to fix it would move the HUD pass ahead of the body placement it reads
       positions from — a real risk to buy an invisible one. */
    _updateNamePill(display, S.myName || 'Anon', (S.rpg && S.rpg.level) || 1,
      !S._dying && !this._resourceBarsUp, S.rpg && S.rpg._bro);

    /* v2.3.1193: my own threat skull — reads the formerly ORPHANED
       S._pvpSkullType / S._pvpSkullUntil anchors (InspectPlayerPanel
       writes them optimistically at threat-issue; gameEvents.js
       replaces them with the authoritative relay echo, whitens on
       ignore/expiry, clears on guards).  Sits above the combo badge
       (comboText rides at nameText.y - 12 = -40 + bobY). */
    if (display._skullText) {
      const _selfSkull = threatSkullPhase(S._pvpSkullType, S._pvpSkullUntil, now);
      if (display._lastSkull !== _selfSkull) {
        display._lastSkull = _selfSkull;
        display._skullText.visible = !!_selfSkull;
        if (_selfSkull) display._skullText.tint = _selfSkull === 'red' ? SKULL_RED_TINT : 0xffffff;
      }
      if (_selfSkull) display._skullText.y = -52 + bobY;
    }

    // Death / invuln
    if (S.rpg && S.rpg.hp <= 0) {
      display.alpha = 0.4;
    } else if (S._respawnInvuln && now < S._respawnInvuln) {
      display.alpha = 0.6 + Math.sin(now / 100) * 0.2;
    } else {
      display.alpha = 1;
    }

    // Stun pip — reads the gameplay stun field (S._playerStunUntil),
    // which is what hit-react + brute-charge set.  Earlier code read
    // S._stunUntil here, which nothing on the player ever populates,
    // so the pip never showed.
    if (S._playerStunUntil && now < S._playerStunUntil) {
      body.circle(0, -bh / 2 - 14 + bobY, 6);
      body.fill({ color: 0x000000, alpha: 0.5 });
    }
  }

  /* ═══ v2.3.2078: YOUR PET WAS INVISIBLE ═══
     This read `S._activePet`, and NOTHING in the whole client has ever
     written that field (checked across src/ and the history).  So `pet` was
     undefined on every frame, the early return fired, and the pet display
     was never shown to anybody.

     The pet itself was not dormant, which is what made this hard to see: the
     follow simulation runs every frame in BroTown.jsx (§18.1 PET FOLLOW +
     AUTO-LOOT, keeping S._petX / S._petY), the auto-loot really collects
     coins, and wsClient even floats a "PET +N G" popup at S._petX -- at a
     position with nothing drawn on it.  A player who bought and activated a
     pet got the loot, got the popup out of empty air, and never saw the
     animal.

     So the state this reads is the state the rest of the game keeps:
     R.lifeSkills.activePet indexes R.lifeSkills.pets, exactly as PetHousePanel
     and the peer-cosmetics wire (`pet:` in the join/move payload) already do.

     And it draws the pet's OWN EMOJI rather than the anonymous 6px coloured
     dot that was here.  The emoji is what every other surface shows for that
     pet -- the pet house, the roster rows, the inspect card -- so the figure
     on the ground now matches the one in the menus.  No asset load is
     involved (Text falls back to the system emoji font), so this does not
     touch the preload manifest. */
  _updatePet(S, now) {
    const _ls = S && S.rpg && S.rpg.lifeSkills;
    const _idx = _ls ? _ls.activePet : null;
    const pet = (_idx != null && _ls.pets) ? _ls.pets[_idx] : null;
    if (!pet || !S.player) {
      if (this.petDisplay) { this.petDisplay.visible = false; }
      return;
    }

    if (!this.petDisplay) {
      this.petDisplay = new Container();
      this.petDisplay.label = 'pet';
      const petBody = new Graphics();
      this.petDisplay.addChild(petBody);
      this.petDisplay._body = petBody;
      const petFace = new Text({ text: '', style: { fontSize: 15, align: 'center' } });
      petFace.anchor.set(0.5, 0.5);
      this.petDisplay.addChild(petFace);
      this.petDisplay._faceText = petFace;
      const petName = new Text({ text: '', style: { ...NAME_STYLE, fontSize: 7 } });
      petName.anchor.set(0.5, 1);
      petName.y = -12;
      this.petDisplay.addChild(petName);
      this.petDisplay._nameText = petName;
      this.entityLayer.addChild(this.petDisplay);
    }

    this.petDisplay.visible = true;
    /* The simulated follow position, which is also where the coin popup is
       floated -- so the two finally agree.  Falls back to the spot the old
       code used if the simulation has not seeded itself yet (one frame). */
    this.petDisplay.x = (typeof S._petX === 'number') ? S._petX : S.player.x + 20;
    this.petDisplay.y = (typeof S._petY === 'number') ? S._petY : S.player.y + 15;

    const bounce = Math.sin(now / 300) * 2;
    const petBody = this.petDisplay._body;
    petBody.clear();
    /* A soft ground shadow under the emoji so it sits ON the world rather
       than floating over it; the disc is only drawn as the pet itself when
       the pet has no emoji to show. */
    if (pet.emoji) {
      petBody.ellipse(0, 7, 6, 2.5);
      petBody.fill({ color: 0x000000, alpha: 0.25 });
    } else {
      petBody.circle(0, bounce, 6);
      petBody.fill({ color: cssColorToHex(pet.color || '#f5c542') });
      petBody.circle(0, bounce, 6);
      petBody.stroke({ color: 0xffffff, width: 1, alpha: 0.3 });
    }
    this.petDisplay._faceText.text = pet.emoji || '';
    this.petDisplay._faceText.visible = !!pet.emoji;
    this.petDisplay._faceText.y = bounce;

    this.petDisplay._nameText.text = pet.name || '🐾';
    this.petDisplay._nameText.y = -10 + bounce;
  }

  /* v2.3.2078: what the pet display is doing, for a scenario to read.  The
     bug above was invisible to the suite because nothing could see whether a
     pet had been drawn at all. */
  petDrawn() {
    const d = this.petDisplay;
    if (!d) return null;
    return { visible: !!d.visible, x: d.x, y: d.y,
      emoji: d._faceText ? d._faceText.text : null,
      name: d._nameText ? d._nameText.text : null };
  }

  /* ═══ v2.3.1775: WORLD PROPS ═══
     Scenery from data/worldProps.js: a sprite on the ground and nothing else.

     Drawn into the same `entities` layer the NPCs use, and synced just BEFORE
     them so a character standing at a stall is in front of it rather than
     buried in the awning.  That layer sits under `player`, so the player is
     always in front of scenery — which is the behaviour NPCs already have, and
     matching it is better than inventing a second depth rule for props.

     The sprite is scaled to the prop's declared WORLD HEIGHT rather than by a
     factor, so re-exporting a source at a different resolution cannot silently
     resize the object in the world. */
  _updateProps(S) {
    if (typeof window !== 'undefined') _entityLayerRef = this.entityLayer;
    const props = propsForZone(S.currentZone);
    /* id -> prop, so the probe below can ask for a footprint by the same id
       the display map is keyed on. */
    const _propById = Object.create(null);
    for (const _p of props) _propById[_p.id] = _p;
    if (!this.propDisplays) this.propDisplays = new Map();
    const live = new Set();
    for (const p of props) {
      live.add(p.id);
      let spr = this.propDisplays.get(p.id);
      if (!spr) {
        spr = new Sprite(Texture.EMPTY);
        /* bottom-centre: `y` is where the prop meets the ground, the same
           convention the NPC figures' feet use. */
        spr.anchor.set(0.5, 1);
        spr.label = `prop_${p.id}`;
        this.entityLayer.addChild(spr);
        this.propDisplays.set(p.id, spr);
      }
      if (spr.texture === Texture.EMPTY) {
        /* ═══ v2.3.2061: AN ANIMATED PROP TAKES ITS SIZE FROM ONE FRAME ═══
           The fountain's art is an eight-frame STRIP, so `getNpcTexture` here
           returns something eight times too wide. Scaling that to worldH would
           have drawn the whole film reel at an eighth of the intended height,
           which is why the frame is asked for first and the strip is only the
           fallback for a prop that has no animation. */
        const t = (p.anim && getPropFrame(p.id, 0)) || getNpcTexture(p.sprite);
        if (t) {
          spr.texture = t;
          const h = t.height || 1;
          const k = (p.worldH || h) / h;
          /* ═══ v2.3.2071: A PROP CAN FACE THE OTHER WAY ═══
             Owner: "Position the benches so that lengthwise they face the
             fountain."  The bench art is a single three-quarter view whose
             seat faces south-EAST, so as drawn it can only ever be placed
             north-west of the thing it looks at.  A mirrored copy faces
             south-west and covers the other side, and mirroring is a sign on
             the x scale rather than a second 51KB file of the same bench.
             Anchor is (0.5, 1) — the centre — so the flip pivots about the
             prop's own ground point and `x`/`y` still mean what they meant. */
          spr.scale.set(p.flipX ? -k : k, k);
        }
      }
      /* The frame swap. Time-driven, not distance-driven like the walking
         NPCs: a fountain runs at its own rate regardless of anything moving.
         Driven off the shared wall clock rather than a per-prop accumulator so
         two of the same prop stay in step and a dropped frame does not slow
         the water down -- it skips, which is what a clock does and what an
         accumulator does not. */
      if (p.anim && propFrameCount(p.id) > 1) {
        const fps = p.anim.fps > 0 ? p.anim.fps : 12;
        const tex = getPropFrame(p.id, Math.floor(Date.now() * fps / 1000));
        if (tex && spr.texture !== tex) spr.texture = tex;
      }
      spr.x = p.x;
      spr.y = p.y;
      spr.visible = spr.texture !== Texture.EMPTY;
    }
    /* A zone change leaves the previous zone's props behind otherwise. */
    for (const [id, spr] of this.propDisplays) {
      if (!live.has(id)) spr.visible = false;
    }
    if (typeof window !== 'undefined') {
      _propsDrawn.length = 0;
      for (const [id, spr] of this.propDisplays) {
        if (!spr.visible) continue;
        /* v2.3.1794: report the FOOTPRINT too.  Since collision comes from
           the props table rather than a map mask, a test that wants to walk
           into something solid has to be able to tell which props are solid —
           the anvil and the market stall are scenery and do not block, and
           mp-townmap picked the anvil and failed for the right reason. */
        let _fp = null;
        try { _fp = propFootprint(_propById[id]) || null; } catch (e) { /* probe only */ }
        /* v2.3.2061: the FRAME an animated prop is showing, as its rectangle
           within the shared strip source. A test that wants to prove the water
           actually moves needs something it can sample twice and compare, and
           the texture's frame origin is the smallest honest answer -- a
           screenshot diff would also catch the player walking past. */
        const _fr = spr.texture && spr.texture.frame;
        /* v2.3.2087: report the ACTION too -- whether this prop is a DOOR and
           which panel it opens.  mp-townhill asked exactly that of this probe
           and got `{}` back, because the field was not here: a test reading a
           field the game does not publish asserts nothing (TRAPS §33).  The
           renderer has the prop in hand; four keystrokes make the question
           answerable. */
        const _act = (_propById[id] && _propById[id].action) || null;
        _propsDrawn.push({ id, x: spr.x, y: spr.y, action: _act,
          /* v2.3.2071: ABS, because a mirrored prop has a negative x scale and
             a negative width is not a width.  The flip is reported as its own
             field instead, so a test can assert the bench faces the fountain
             without inferring it from a sign. */
          width: Math.abs(spr.texture.width * spr.scale.x),
          height: Math.abs(spr.texture.height * spr.scale.y),
          flipX: spr.scale.x < 0,
          blocks: !!_fp, footprint: _fp,
          frameX: _fr ? Math.round(_fr.x) : null,
          frameW: _fr ? Math.round(_fr.width) : null });
      }
    }
  }

  _updateNPCs(S, now) {
    const npcs = S.npcs || [];
    const activeIds = new Set();

    for (const npc of npcs) {
      if (!npc.alive) continue;
      activeIds.add(npc.id);

      let display = this.npcDisplays.get(npc.id);
      if (!display) {
        display = new Container();
        display.label = `npc_${npc.id}`;

        /* Static body (Graphics rebuilt only on color change). */
        const body = new Graphics();
        display.addChild(body);
        display._body = body;

        /* HP bar — Graphics, redrawn each frame the value changes. */
        const hpBar = new Graphics();
        display.addChild(hpBar);
        display._hpBar = hpBar;

        /* Star indicator — visual marker that this is an interactable NPC. */
        const starText = new Text({
          text: '★',
          style: { fontFamily: 'sans-serif', fontSize: 8, fontWeight: '700',
                   fill: '#f5c542', align: 'center' },
        });
        starText.anchor.set(0.5, 0.5);
        starText.y = -14;
        display.addChild(starText);

        /* Name with translucent dark background, just above the head. */
        const nameText = new Text({
          text: npc.name,
          style: { ...NAME_STYLE, fontSize: 9, fill: npc.color || '#ffffff' },
        });
        nameText.anchor.set(0.5, 1);
        nameText.y = -17;
        display.addChild(nameText);
        display._nameText = nameText;

        /* ═══ v2.3.2048: A PROPER PLATE, UNDER HIM ═══
           Owner: "Give his name a proper name plate like the main character.
           Make it below him."
           The SAME _attachNamePill the player and every peer use, so there is
           one plate implementation rather than a second that drifts -- which
           is the reason that function exists at all (see its note).

           ═══ v2.3.2071: EVERY TOWNSPERSON, NOT TWO OF THEM ═══
           Owner: "Make every persons name or title as a consistent name
           plate." It was opt-in via `namePlate` in NPC_DATA, and only
           Shopkeeper Bro and Lil Bro had opted in -- so Mayor Bro, Blacksmith
           Bro and Storekeeper Bro kept the old above-head `nameText` and the
           town had two different ways of labelling a person standing in it.

           The flag is GONE rather than set to true on all five. A default
           carried by a per-NPC boolean is a default that the sixth NPC will
           miss, and "every person" is the requirement -- so the plate is what
           an NPC gets, full stop, and there is no longer a way to add one
           without it. `plateRole` stays optional: it is the gold sub-line
           (the same slot a player's level sits in), and an NPC without a
           title simply shows their name.

           The v2.3.2048 note worried that the two quest givers keep a
           hand-tuned above-head stack around their '!' badge. That worry does
           not survive contact: the plate hangs BELOW the feet and the lift
           loop below explicitly skips it, so the badge keeps its position and
           the only thing that changes is the name moving out from under it --
           which gives the '!' more room, not less. */
        {
          _attachNamePill(display, 9, 1);
          nameText.visible = false;
          /* ═══ v2.3.2069: THE PLATE HANGS OFF THE FIGURE'S OWN HEIGHT ═══
             Owner: "Move the lil bro name plate up."

             _attachNamePill drops the plate a flat 38 units below the
             container origin, which for an NPC is the feet. v2.3.2064 scaled
             that by the sprite's size multiplier and clamped it, which pulled
             Lil Bro's in to 30 -- not enough, because the multiplier is not
             the thing the eye compares against. What reads as "too far below
             him" is the gap measured against HIS OWN HEIGHT, so that is what
             it is derived from now.

             The reference is Shopkeeper Bro, whose plate the owner placed by
             eye at v2.3.2048 ("make it below him") and which must not move:
             his figure stands 121.9 world px above his feet and his plate
             sits 38 below them, so the ratio the owner actually approved is
             38/121.9. Every plate uses it. Lil Bro's figure is 73.1, so his
             lands at 23 -- seven pixels up from v2.3.2064 and half the drop
             it started at.

             v2.3.2071: now that every NPC has a plate, this ratio is what
             keeps them consistent as a SET rather than merely present -- the
             three that just gained one are all drawn at a different scale
             from each other, so a flat 38 would have put their plates at
             visibly different gaps below three different-sized people. */
          if (display._namePill) {
            const _figH = npcFigureHeight(npc.sprite);
            display._namePill.y = Math.max(14, Math.round(_figH * NPC_PLATE_DROP_FRAC));
          }
        }

        /* Quest marker — badge above the head, pulses vertically.
           Hidden by default; populated when npc._questMarker is set. */
        /* v2.3.1675 (owner: "I can't see the exclamation point on mayor bro it
           blends into background") made it a bigger white glyph with a dark
           stroke.  v2.3.1681: still not enough — "it needs to have a thick
           white outline or something to be more attention grabbing".
           A STROKED GLYPH IS THE WRONG SHAPE for this problem.  An outline
           only ever traces the letterform, so a '!' offers the eye a 4px-wide
           stick to find against a map painted with cobbles, flowers, fence
           posts and roof tiles — all of which are high-frequency detail at
           exactly that scale.  A BADGE gives it a solid ~33px disc instead:
           one large uniform shape, which is what actually pops out of visual
           clutter.  Three concentric rings, outside in — dark hairline (holds
           against pale cobble), thick white ring (the owner's ask, and what
           holds against dark roofs), state-coloured fill.  Because both a
           light and a dark ring are always present, the badge cannot vanish
           into any background, which a single-colour outline can. */
        const questMarker = new Container();
        const qmBadge = new Graphics();
        questMarker.addChild(qmBadge);
        const qmGlyph = new Text({
          text: '',
          style: { fontFamily: 'Baloo 2, sans-serif', fontSize: 22, fontWeight: '900',
                   fill: '#2A1B06', align: 'center' },
        });
        qmGlyph.anchor.set(0.5, 0.5);
        /* Optical centring: '!' and '?' both sit high in their em box, so a
           geometric centre leaves the glyph looking like it is floating. */
        qmGlyph.y = 1;
        questMarker.addChild(qmGlyph);
        questMarker.visible = false;
        display.addChild(questMarker);
        display._questMarker = questMarker;
        display._qmBadge = qmBadge;
        display._qmGlyph = qmGlyph;

        /* Avatar — emoji rendered at the body center.  Special-case
           '💀' for the Ferryman: no body circle, just the skull. */
        const avatarText = new Text({
          text: npc.avatar || '👤',
          style: { fontFamily: 'sans-serif', fontSize: 16, align: 'center' },
        });
        avatarText.anchor.set(0.5, 0.5);
        display.addChild(avatarText);
        display._avatar = avatarText;

        /* v2.3.1672: real ART for an NPC that has it.  `npc.sprite` is a
           256x256 frame normalised to the PLAYER's stand pose — figure ~200px
           tall with its feet on the y=223 baseline — so the two read at the
           same scale standing next to each other.
           anchor (0.5, 223/256) puts those feet exactly on npc.y, which is the
           point the walk/interaction code already treats as where the NPC is
           standing; anchoring at the frame centre instead would float him half
           a body above the street. */
        if (npc.sprite) {
          /* v2.3.2046: a walking NPC starts on his south frame, not on
             `sprite` -- which for him names a four-frame STRIP, and binding it
             raw would draw all four squashed into one body for the frame
             before the first update corrects it. */
          const fig = new Sprite(
            (hasNpcWalk(npc.id) && getNpcWalkFrame(npc.id, 'south', 0))
            || getNpcTexture(npc.sprite) || Texture.EMPTY);
          fig.anchor.set(0.5, NPC_FRAME_FEET_Y / 256);
          fig.scale.set(npcSpriteScale(npc.sprite));
          display.addChildAt(fig, 0);      // behind the bars and labels
          display._fig = fig;
          display._figSrc = npc.sprite;
        }

        this.entityLayer.addChild(display);
        this.npcDisplays.set(npc.id, display);
      }

      display.x = npc.x;
      display.y = npc.y;

      /* v2.3.2048: keep the plate's text current. Cheap: _updateNamePill
         rebuilds the rounded rect only when the string changes (_pillKey),
         so this is a string comparison per frame and nothing more. */
      if (display._namePill) {
        _updateNamePill(display, npc.name, npc.plateRole || '', true, null);
      }

      /* ═══ v2.3.2046: ANIMATE HIM IF HE HAS A WALK CYCLE ═══
         Velocity is derived HERE, from the position the renderer is already
         given, rather than read off a field the walk code would have to
         publish: the NPC step lives in BroTown and this keeps the animation a
         pure function of where he has actually got to, so it cannot disagree
         with what is drawn.
         The phase accumulates DISTANCE, so a slow wander steps slowly and a
         stopped NPC holds frame 0 instead of marching on the spot. */
      if (display._fig && hasNpcWalk(npc.id)) {
        const hadLast = typeof display._lastX === 'number';
        const dx = hadLast ? npc.x - display._lastX : 0;
        const dy = hadLast ? npc.y - display._lastY : 0;
        display._lastX = npc.x; display._lastY = npc.y;
        const step = Math.hypot(dx, dy);
        /* A floor, not `> 0`: an NPC steered toward a target he has essentially
           reached jitters by fractions of a pixel forever, and without this he
           would face a new random direction every frame while standing still. */
        const moving = step > 0.08;
        if (moving) {
          display._walkDir = npcDirFromDelta(dx, dy);
          display._walkPhase = (display._walkPhase || 0) + step;
        }
        const dir = display._walkDir || 'south';
        const idx = moving ? Math.floor(display._walkPhase / NPC_WALK_PX_PER_FRAME) : 0;
        const tex = getNpcWalkFrame(npc.id, dir, idx);
        if (tex && display._fig.texture !== tex) display._fig.texture = tex;
      }

      /* v2.3.1673: label headroom, POSITIONED rather than nudged.
         v2.3.1672 shifted every label up by the figure height, which kept the
         old relative spacing — so the ❗ ended up floating a long way over his
         hat with the name between them (owner: "face the exclamation point
         over his head").  Now each element is placed against the top of the
         drawn figure: marker just above the hat, name above the marker, HP bar
         and star tucked above that.  Recomputed if the scale ever changes,
         and only once the texture is bound so we know he is actually drawn. */
      if (display._fig && !display._lifted && display._fig.texture !== Texture.EMPTY) {
        display._lifted = true;
        const top = npcFigureHeight(npc.sprite); // world px above the feet
        /* The marker is anchored at its CENTRE, so clearing the hat needs half
           its own glyph height on top of the gap — the first attempt used the
           gap alone and the ❗ sat down inside the hat brim. */
        const MARK_PX = QUEST_BADGE_R * 2;      // matches the marker's own art
        /* v2.3.1681: gaps tightened from 8 to 3.  The badge is 32px where the
           bare glyph was 22, and the stack is measured UPWARD from the hat —
           so keeping the old gaps pushed the name clean off the top of the
           screen when you stand south of him, which is where the tutorial
           puts you (he lives near the town's north edge and the camera clamps
           there).  A tighter stack also just reads better: badge, then name,
           both plainly his. */
        const GAP = 3;

        display._questMarker._baseY = -(top + GAP + MARK_PX / 2);
        /* Name is anchored at its BOTTOM (0.5, 1), so this is where its
           underside sits: clear above the marker's top edge. */
        display._nameText.y = -(top + GAP + MARK_PX + GAP);
        for (const c of display.children) {
          if (c === display._fig || c === display._nameText || c === display._questMarker) continue;
          /* v2.3.2048: the name plate is anchored BELOW the feet on purpose,
             so it must not be swept up with the above-head furniture. Without
             this exclusion the "below him" plate lands over his hat, which is
             the opposite of what was asked for. */
          if (c === display._namePill) continue;
          if (c === display._body || c === display._avatar) continue;
          c.y -= (top + MARK_PX + 24);
        }
      }

      /* v2.3.1672: the art path.  The texture may still be loading on the
         first frames (the preload manifest awaits it behind the loading
         screen, but a cache miss after a GL-loss rebuild can land here), so
         bind it whenever it becomes available rather than once at creation. */
      const fig = display._fig;
      if (fig) {
        if (fig.texture === Texture.EMPTY) {
          const t = getNpcTexture(display._figSrc);
          if (t) fig.texture = t;
        }
        /* Only hide the emoji stand-in once real art is actually on screen —
           otherwise a failed load leaves an NPC you cannot see at all. */
        const drawn = fig.texture !== Texture.EMPTY;
        if (display._avatar.visible !== !drawn) display._avatar.visible = !drawn;
        display._suppressBody = drawn;
        /* v2.3.1773: QA probe — what each NPC figure is ACTUALLY drawn as.
           "Size him about the same as mayor bro" is a claim about pixels on
           screen, and the only honest way to check it is to read the live
           sprite: the asset could be any size and the renderer's own
           normalisation is exactly what the test needs to exercise. */
        if (typeof window !== 'undefined' && drawn) {
          _npcDrawn[npc.id] = {
            id: npc.id, name: npc.name, x: npc.x, y: npc.y,
            height: fig.texture.height * fig.scale.y,
            width: fig.texture.width * fig.scale.x,
            /* world y of the figure's feet — anchor is the frame's foot row */
            footY: display.y,
            src: display._figSrc,
            /* v2.3.2064: the facing the renderer CHOSE, and the strip it bound
               for it. A walk sheet's row order cannot be read off the code --
               this one is not ordered like the shopkeeper's -- so a test needs
               to see which way he was pointed and which file answered. */
            walkDir: display._walkDir || null,
            /* v2.3.2071: the PLATE as painted -- the two strings on it, how
               far below the feet it hangs, and whether the old above-head
               label is really gone. Owner: "Make every persons name or title
               as a consistent name plate", and consistency is a property of
               the SET, so a test needs every plate's actual numbers rather
               than a flag saying one was requested. */
            plate: display._namePill ? {
              name: display._pillName ? display._pillName.text : null,
              role: display._pillLevel ? display._pillLevel.text : null,
              y: Math.round(display._namePill.y),
              visible: display._namePill.visible,
            } : null,
            oldLabelHidden: display._nameText ? !display._nameText.visible : null,
          };
        }
      }

      /* Body — only redraw when color changes (NPCs are static). */
      const body = display._body;
      const isSkull = npc.avatar === '💀' || !!display._suppressBody;
      if (display._lastColor !== npc.color || display._lastSkull !== isSkull) {
        display._lastColor = npc.color;
        display._lastSkull = isSkull;
        body.clear();
        if (!isSkull) {
          body.circle(0, 0, 11);
          body.fill({ color: cssColorToHex(npc.color || '#5b52ff'), alpha: 0.85 });
          body.stroke({ color: 0xffffff, width: 1, alpha: 0.35 });
        }
      }

      /* HP bar (24x3 above the head, color by remaining HP).
         v2.3.1675 (owner: "remove his health bar he doesn't need one"): an
         NPC flagged `noHp` never draws one.  A full green bar over a quest
         giver in a safe town reads as "this is a thing you fight", which is
         the opposite of the invitation the ❗ is making right above it. */
      const hpBar = display._hpBar;
      if (npc.noHp) {
        if (hpBar.visible) { hpBar.clear(); hpBar.visible = false; }
      } else if (!hpBar.visible) { hpBar.visible = true; display._lastHpKey = null; }
      if (!npc.noHp) {
      const maxHp = npc.maxHp || 1;
      const hp = Math.max(0, npc.hp || 0);
      const hpPct = hp / maxHp;
      const hpKey = hpPct.toFixed(2);
      if (display._lastHpKey !== hpKey) {
        display._lastHpKey = hpKey;
        hpBar.clear();
        hpBar.rect(-12, -22, 24, 3);
        hpBar.fill({ color: 0x000000, alpha: 0.5 });
        if (hpPct > 0) {
          const c = hpPct > 0.5 ? 0x3dd497 : hpPct > 0.25 ? 0xf5c542 : 0xff5e6c;
          hpBar.rect(-12, -22, 24 * hpPct, 3);
          hpBar.fill({ color: c });
        }
      }
      }

      /* Quest marker — `npc._questMarker` is '❗' (available) or '❓'
         (turn-in) or null.  Pulses vertically when visible. */
      const qm = display._questMarker;
      const qmStr = npc._questMarker || '';
      if (qmStr) {
        /* Redrawn ONLY when the state flips, not per frame — same reasoning as
           the name pill's _pillKey: a three-ring rebuild at 60fps for a value
           that changes when you accept a quest is pure waste. */
        if (display._qmKey !== qmStr) {
          display._qmKey = qmStr;
          /* '❗'/'❓' are the wire values, but they are EMOJI: on most platforms
             they render from a colour font that ignores `fill`, so the glyph
             would arrive in its own red/blue regardless of the badge under it.
             Drawing plain ASCII instead is what makes the dark-on-gold
             contrast actually happen. */
          display._qmGlyph.text = qmStr === '❓' ? '?' : '!';
          _drawQuestBadge(display._qmBadge,
            qmStr === '❗' ? 0xFFC93C : qmStr === '❓' ? 0xFFE58A : 0x4BD98A);
        }
        const pulse = Math.sin(now / 300) * 3;
        qm.y = (qm._baseY !== undefined ? qm._baseY : -36) + pulse;
        qm.visible = true;
      } else if (qm.visible) {
        qm.visible = false;
      }
    }

    for (const [id, display] of this.npcDisplays) {
      if (!activeIds.has(id)) {
        display.destroy({ children: true });
        this.npcDisplays.delete(id);
      }
    }
  }

  /* Combat-bar HUD above the player sprite (v2.3.107).  Three
     pill-shaped Sprites stacked closest-to-head first: HP, Mana,
     Energy on top.  Each one reuses the dashboard's bar artwork
     (/icons/ui/bar-hp.webp etc) so the in-world readout matches the
     XP bar in the dashboard.  A small dim overlay on the right
     portion of each pill shows the unfilled fraction.  No backdrop
     -- the pills float directly on the canvas.
     Visibility: the ENERGY readout fades in while it is below max, holds
     for HOLD_MS at full, then fades out.  HP does NOT follow that rule --
     since v2.3.1682 it is contextual: it reveals on a change in current HP
     (damage or healing) and fades out HOLD_MS later no matter how full it
     is.  See the HP block below for why. */
  _updatePlayerHud(S, now) {
    const R = S && S.rpg;
    const d = this.playerDisplay;
    if (!R || !d || !d._hudMpSprite) return;

    _ensureHudBarTextures();
    /* Bind textures the first time they resolve. */
    if (_hudBarTex.mp    && d._hudMpSprite.texture   !== _hudBarTex.mp)    d._hudMpSprite.texture   = _hudBarTex.mp;
    if (_hudBarTex.stam  && d._hudStamSprite.texture !== _hudBarTex.stam)  d._hudStamSprite.texture = _hudBarTex.stam;
    /* v2.3.214: prefer white-fill heart so we can tint by HP tier;
       fall back to the red one until heart-white resolves. */

    const HOLD_MS = 2500;
    const FADE_STEP = 16.7 / 300; /* ~300 ms fade-in / fade-out */

    /* ═══ v2.3.1895: THE MP BAR IS BACK, UNDER THE FEET ═══
       Owner: "Instead of the special attack counter I want to see what it
       looks like to have the mp bar below the character."

       v2.3.214 had retired this in-world bar for SpecialChargePie above the
       right joystick; the pie is removed with this change, so the readout
       comes back to the character — but as a SPEND bar rather than a standing
       gauge.  It is drawn on _hudMpEmpty, which has been sitting allocated
       and cleared since v2.3.214 for exactly this reason (the pickup and
       death paths already reference it, and it is in the death keep-list).
       The legacy pill sprite and its two labels stay off. */
    /* v2.3.1896: the two readouts, made once.  Added AFTER the bar Graphics so
       they draw over it; both live on the player display, so they inherit its
       transform and are hidden on death by the keep-list sweep (v2.3.1887)
       without needing to be named there. */
    if (!d._resMpLabel) {
      const mk = () => {
        const t = new Text({ text: '', resolution: 2, style: {
          fontFamily: 'Source Sans 3, sans-serif', fontSize: 10, fontWeight: '800',
          fill: '#FFFFFF', align: 'center', letterSpacing: 0.2,
        } });
        t.anchor.set(0.5, 0.5);
        t.visible = false;
        d.addChild(t);
        return t;
      };
      d._resMpLabel = mk();
      d._resEnLabel = mk();
      /* v2.3.1897: the gliding "-N" pair.  Made in the SAME lazy block as the
         on-bar readouts rather than a second `if (!d._resMpSpent)` gate — two
         gates for four nodes go out of step the first time someone reorders
         them.  Bigger and stroked because these leave the bar and fly over
         open terrain; the on-bar pair always has the black track behind it. */
      const mkSpent = () => {
        const t = new Text({ text: '', resolution: 2, style: {
          fontFamily: 'Source Sans 3, sans-serif', fontSize: 12, fontWeight: '800',
          fill: '#FFFFFF', align: 'left', letterSpacing: 0.2,
          stroke: { color: '#000000', width: 3, join: 'round' },
        } });
        t.anchor.set(0, 0.5);
        t.visible = false;
        d.addChild(t);
        return t;
      };
      d._resMpSpent = mkSpent();
      d._resEnSpent = mkSpent();
      /* v2.3.2300: the two block bars. In the SAME gate as the text nodes for
         the reason the comment above gives about the "-N" pair -- separate
         gates for nodes that must exist together go out of step the first time
         someone reorders them. anchor (0.5, 0) so `y` means the same thing it
         meant for the old roundRect: the TOP of the bar. */
      /* v2.3.2302: a Container, not a Sprite -- the bar is now assembled from
         a cap/middle/cap frame plus N block cells, because the six sheet
         frames are fixed-width five-block pictures and cannot express six.
         The FIELD NAMES are kept (d._resMpBlocks / d._resEnBlocks): the death
         sweep, _resourceBarsUp and the probe all key off .visible/.alpha,
         which a Container has just as a Sprite does.
         NOTE it is added to `d`, not d._uiLayer, so it does NOT get the
         inverse-scale treatment the HUD layer applies. Inert today because
         both build axes are locked to a single 1.00 entry -- but a bar up to
         118 units wide would stretch visibly if body heights ever return. */
      const mkBlocks = (kind) => {
        const sp = new Container();
        sp.visible = false;
        const parts = BLOCK_BARS[kind] && BLOCK_BARS[kind].parts;
        const mk = (tex) => { const q = new Sprite(tex || Texture.EMPTY); q.anchor.set(0, 0); sp.addChild(q); return q; };
        sp._capL = mk(parts && parts.capL);
        sp._mid = mk(parts && parts.mid);
        sp._capR = mk(parts && parts.capR);
        sp._cells = [];
        d.addChild(sp);
        return sp;
      };
      d._resMpBlocks = mkBlocks('mana');
      d._resEnBlocks = mkBlocks('stamina');
    }
    /* v2.3.1896d: a corpse wears no spend bars.  _updatePlayerHud runs AFTER
       _updatePlayer in the same frame, and _hudMpEmpty/_hudStamEmpty are BOTH
       named in the death keep-list (they were the old floating gauges) — so
       the sweep that undresses the body walks straight past them and this pass
       would then re-draw them over the corpse for the rest of the 2s fade.
       The labels are not in that list, so the sweep hides them and this pass
       shows them again: the same node, hidden and shown twice per frame.
       Cut it off at the source instead of adding two more names to the list —
       hide, reset, and let the next spend after the respawn re-arm cleanly.
       (Same rule as v2.3.1887: hide by exception, not by list.) */
    if (S._dying) {
      for (const _g of [d._hudMpEmpty, d._hudStamEmpty]) {
        if (!_g) continue;
        _g.clear(); _g.alpha = 0;
        _g._resLast = null; _g._resSpentAt = 0; _g._resFrom = 0;
        _g._resGhostX = null; _g._resGhostW = 0;
        _g._resSpentAmt = 0;
        _g._resSlideT = 1; _g._resSpentT = 1;
        _g._resGlideAt = 0; _g._resGlideBase = 0;
      }
      if (d._resMpLabel) d._resMpLabel.visible = false;
      if (d._resEnLabel) d._resEnLabel.visible = false;
      if (d._resMpSpent) d._resMpSpent.visible = false;
      if (d._resEnSpent) d._resEnSpent.visible = false;
      /* v2.3.2300: and the block bars. A corpse wears no spend bars -- the same
         rule, and the same reason they are hidden HERE rather than added to the
         death keep-list (v2.3.1896d: hide by exception, not by list). */
      if (d._resMpBlocks) { d._resMpBlocks.visible = false; d._resMpBlocks.alpha = 0; }
      if (d._resEnBlocks) { d._resEnBlocks.visible = false; d._resEnBlocks.alpha = 0; }
      this._resourceBarsUp = false;
      if (typeof window !== 'undefined') {
        window.__btResourceBars = {
          mp: 0, en: 0, mpY: RES_MP_Y, enY: RES_EN_Y, plateHidden: false,
          mpGhostX: null, mpGhostW: 0, enGhostX: null, enGhostW: 0, dead: true,
        };
      }
    } else {
      /* v2.3.2300: the block sprite replaces the proportional fill, and the
         two TEXT readouts go with it. The on-bar "72 / 100" is the "tiny
         percentages ... mental math" the owner asked to be rid of, and the
         gliding "-N" is the same arithmetic in motion -- with five blocks the
         answer to "how much just left" is a block, visibly. Both nodes are kept
         and parked rather than deleted: they are made in one lazy gate with the
         sprites, the death sweep hides them, and a future readout that wants
         text again has somewhere to put it. */
      const _resAlphaMp = _drawResourceBar(d._hudMpEmpty, d._resMpBlocks, 'mana',
        R.mana, R.maxMana, RES_MP_Y, now, rpgBlocks(R, 'mana'));
      if (d._resMpLabel && d._resMpLabel.visible) d._resMpLabel.visible = false;
      if (d._resMpSpent && d._resMpSpent.visible) d._resMpSpent.visible = false;
      if (d._hudMpSprite && d._hudMpSprite.visible) d._hudMpSprite.visible = false;
      if (d._hudMpTextFull && d._hudMpTextFull.visible) d._hudMpTextFull.visible = false;
      if (d._hudMpTextEmpty && d._hudMpTextEmpty.visible) d._hudMpTextEmpty.visible = false;

      /* ═══ v2.3.1895: ENERGY, BENEATH THE MP BAR ═══
         Owner: "Do the same thing for energy but beneath the mp bar."

         This replaces the bare "⚡42%" number v2.3.1400 put under the feet.
         That readout answered a different question — it was a standing gauge,
         deliberately understated, visible whenever energy was below max.  The
         ask here is the same SPEND behaviour as MP, so it gets the same
         renderer and the same timings rather than a second set that could
         drift.  RES_EN_Y is fixed, so this bar holds its position whether or
         not the MP bar above it is drawn. */
      const _resAlphaEn = _drawResourceBar(d._hudStamEmpty, d._resEnBlocks, 'stamina',
        R.stamina, R.maxStamina, RES_EN_Y, now, rpgBlocks(R, 'stamina'));
      if (d._resEnLabel && d._resEnLabel.visible) d._resEnLabel.visible = false;
      if (d._resEnSpent && d._resEnSpent.visible) d._resEnSpent.visible = false;
      if (d._hudStamSprite && d._hudStamSprite.visible) d._hudStamSprite.visible = false;
      if (d._hudStamTextFull && d._hudStamTextFull.visible) d._hudStamTextFull.visible = false;
      if (d._hudStamTextEmpty && d._hudStamTextEmpty.visible) d._hudStamTextEmpty.visible = false;
      /* One answer for both bars: the plate hides while EITHER is up, or it
         would flicker back in the gap between an MP spend and an energy one. */
      this._resourceBarsUp = (_resAlphaMp > 0.01) || (_resAlphaEn > 0.01);
      if (typeof window !== 'undefined') {
        window.__btResourceBars = {
          mp: +_resAlphaMp.toFixed(3), en: +_resAlphaEn.toFixed(3),
          mpY: RES_MP_Y, enY: RES_EN_Y, plateHidden: this._resourceBarsUp,
          mpGhostX: d._hudMpEmpty._resGhostX, mpGhostW: d._hudMpEmpty._resGhostW,
          enGhostX: d._hudStamEmpty._resGhostX, enGhostW: d._hudStamEmpty._resGhostW,
          /* v2.3.1897: the gliding "-N" — text, x, and the bar edge it starts
             from, so the suite can prove it is RIGHT OF the bar and moving. */
          /* v2.3.2300: what the player can actually COUNT. The old fields
             described a proportional fill and a gliding "-N" that no longer
             exist; reporting them would be a probe describing a bar that is not
             on screen, which is how three vacuous checks got into this repo.
             blocksFor is the same function the draw uses -- the probe must not
             re-derive the number it is meant to be checking. */
          mpBlocks: blocksFor(R.mana, R.maxMana, rpgBlocks(R, 'mana')),
          enBlocks: blocksFor(R.stamina, R.maxStamina, rpgBlocks(R, 'stamina')),
          mpBlocksDrawn: d._resMpBlocks && d._resMpBlocks.visible,
          enBlocksDrawn: d._resEnBlocks && d._resEnBlocks.visible,
          /* v2.3.2302: the COUNT and the WIDTH, so a test can pin the ladder.
             Without these the suite could only see how many blocks are LIT,
             and a build that never grew the row past five would read exactly
             like a full five-block bar. mpCellsDrawn counts the cells actually
             on screen, which is the only field that catches the row failing to
             grow while the count says it did. */
          mpBlockCount: rpgBlocks(R, 'mana'),
          enBlockCount: rpgBlocks(R, 'stamina'),
          mpCellsDrawn: d._resMpBlocks && d._resMpBlocks._cells
            ? d._resMpBlocks._cells.filter((c) => c.visible).length : 0,
          enCellsDrawn: d._resEnBlocks && d._resEnBlocks._cells
            ? d._resEnBlocks._cells.filter((c) => c.visible).length : 0,
          mpBarW: _barWidth(rpgBlocks(R, 'mana')),
          enBarW: _barWidth(rpgBlocks(R, 'stamina')),
          blockW: RES_BLOCK_W, blockH: RES_BLOCK_H, barMaxW: RES_BAR_MAX_W,
          mpSpent: d._hudMpEmpty._resSpentAmt, enSpent: d._hudStamEmpty._resSpentAmt,
          mpSpentText: null, enSpentText: null,
          mpSpentX: null, enSpentX: null, mpSpentA: null, enSpentA: null,
          barRight: _barWidth(rpgBlocks(R, 'mana')) / 2,
        };
      }
    }

    /* HP: quartile-colored progress RING with a muted-gray center holding
       the current HP over a small muted max.  Same fade as the pills
       (visible below max, hold HOLD_MS at full, fade out).  Drains
       clockwise from 12 o'clock; four ~1.5px gaps slice the ring at the
       25/50/75% color thresholds.  (v2.3.458, replaces the heart icon.) */
    const ring = d._hudHpRing;
    const heartText = d._hudHpText;
    const maxText = d._hudHpMaxText;
    if (ring && heartText && maxText) {
      const hpMax = R.maxHp || 1;
      const hpCur = Math.max(0, Math.min(hpMax, R.hp || 0));
      /* v2.3.1682 (owner: "the character hp bar is supposed to contextually
         display -- only when damage is taken or healing occurs").  The old
         rule was "visible while BELOW max, hold HOLD_MS once refilled" --
         which is not contextual at all: one hit in the first zone left the
         bar parked over the character's head for the whole session, because
         nothing but a top-off back to full ever hid it again.  The reveal is
         now driven by the EVENT (any change in current HP -- damage down or
         heal up), and it always fades out HOLD_MS later regardless of how
         full the bar is.
         Keyed on absolute hpCur, not the fraction: a level-up raises maxHp
         and would move the fraction on its own, and that is not damage or
         healing.  `_lastHpCur` seeds on the first frame so spawning in at
         partial HP doesn't flash the bar for no reason. */
      if (ring._lastHpCur == null) ring._lastHpCur = hpCur;
      if (Math.abs(hpCur - ring._lastHpCur) > 0.01) {
        /* v2.3.1703: remember the DIRECTION of the event too — see below. */
        ring._hpRising = hpCur > ring._lastHpCur;
        ring._lastHpCur = hpCur;
        ring._hpEventAt = now;
      }
      /* v2.3.1703 (owner: "while out of combat the healing in the zones is a
         nice touch, keep the hp bar visible while healing").  The v2.3.1682
         rule above reveals on an event and fades HOLD_MS (2.5s) later — but
         out-of-combat regen arrives as a SERVER TICK every SPOKE_REGEN_OOC_MS
         (6s, server/src/index.js), which is longer than the hold.  So a heal
         that runs for half a minute showed as the bar blinking on for two and
         a half seconds out of every six, which reads as a glitch rather than
         as healing.
         A climbing heal therefore holds the bar up continuously: while the
         last event was an INCREASE and HP is still short of max, the bar
         stays.  HEAL_STALL_MS is what stops that becoming the old "parked
         forever" bug — it only has to outlast the gap between regen ticks, so
         once regen actually stops (combat re-engaged, zone left) the bar fades
         one stall-window later like anything else.  Damage sets _hpRising
         false and goes straight back to the 2.5s hold. */
      const HEAL_STALL_MS = 9000;         /* > SPOKE_REGEN_OOC_MS, so ticks bridge */
      const sinceHpEvent = now - (ring._hpEventAt || 0);
      const stillHealing = ring._hpRising && hpCur < hpMax && sinceHpEvent < HEAL_STALL_MS;
      const hpTargetAlpha = (stillHealing || sinceHpEvent < HOLD_MS) ? 1 : 0;
      const hpA = (ring.alpha != null) ? ring.alpha : 0;
      const hpDelta = hpTargetAlpha - hpA;
      const hpNewAlpha = hpA + Math.max(-FADE_STEP, Math.min(FADE_STEP, hpDelta));
      ring.alpha = hpNewAlpha;
      heartText.alpha = hpNewAlpha;
      /* v2.3.1472: maxText is retired (see below) — no fade to drive. */
      /* v2.3.1273: bar sprites share the fade (alphas finalized below). */

      const hpFrac = hpCur / hpMax;
      /* v2.3.1273: the quartile tier tint is retired with the ring — the
         owner's bar art is fixed red (classic ARPG read).  The <10%
         urgency pulse survives as an alpha throb on the fill. */

      /* White damage trail: ghostFrac lags hpFrac on damage and drains
         toward it (v2.3.458 logic, unchanged).  Snaps up on heal.
         v2.3.1273 adds a brief white FLASH over the remaining fill. */
      if (ring._ghostFrac == null) ring._ghostFrac = hpFrac;
      const tookDamage = (ring._lastHpFrac != null) && (hpFrac < ring._lastHpFrac - 0.0005);
      if (tookDamage) ring._flashUntil = now + HPBAR_FLASH_MS;
      if (hpFrac >= ring._ghostFrac) {
        ring._ghostFrac = hpFrac;
      } else {
        if (tookDamage) ring._ghostDrainAt = now + HP_GHOST_HOLD_MS;
        if (now >= (ring._ghostDrainAt || 0)) {
          ring._ghostFrac = Math.max(hpFrac, ring._ghostFrac - HP_GHOST_DRAIN);
        }
      }
      ring._lastHpFrac = hpFrac;

      const cx = 0;
      const cy = -(HP_RING_OUTER_R + 49); /* ~-73: above the head, lifted 15px (v2.3.459) */
      const frameSp = d._hudHpBarFrame;
      const fillSp = d._hudHpBarFill;
      _ensureHudBarTextures();
      if (frameSp && _hudBarTex.barFrame && frameSp.texture !== _hudBarTex.barFrame) {
        frameSp.texture = _hudBarTex.barFrame;
      }
      if (frameSp) {
        frameSp.alpha = _hudBarTex.barFrame ? hpNewAlpha : 0;
        frameSp.width = PLAYER_HPBAR_W;
        frameSp.height = PLAYER_HPBAR_H;
        frameSp.x = cx; frameSp.y = cy;
      }
      if (fillSp && _hudBarTex.barFull) {
        const fillTex = _hpFillTexFor(d, hpFrac);
        if (fillTex) {
          if (fillSp.texture !== fillTex) fillSp.texture = fillTex;
          fillSp.width = Math.max(1, PLAYER_HPBAR_W * Math.max(0, Math.min(1, hpFrac)));
          fillSp.height = PLAYER_HPBAR_H;
          fillSp.x = cx - PLAYER_HPBAR_W / 2;
          fillSp.y = cy;
          let fillA = hpNewAlpha;
          if (hpFrac <= 0.10 && hpFrac > 0) {
            fillA *= 0.7 + 0.3 * Math.sin(now / 1000 * Math.PI * 4);
          }
          fillSp.alpha = fillA;
        }
      }
      /* ghost + flash rectangles over the fill's inset region. */
      ring.clear();
      if (hpNewAlpha > 0.02) {
        const inL = cx - PLAYER_HPBAR_W / 2 + PLAYER_HPBAR_W * HPBAR_IN_X;
        const inW = PLAYER_HPBAR_W * HPBAR_IN_W;
        const inT = cy - PLAYER_HPBAR_H / 2 + PLAYER_HPBAR_H * HPBAR_IN_Y;
        const inH = PLAYER_HPBAR_H * HPBAR_IN_H;
        if (ring._ghostFrac > hpFrac + 0.001) {
          ring.rect(inL + inW * hpFrac, inT, inW * (ring._ghostFrac - hpFrac), inH);
          ring.fill({ color: HP_GHOST_WHITE, alpha: 0.92 * hpNewAlpha });
        }
        const fl = (ring._flashUntil || 0) - now;
        if (fl > 0 && hpFrac > 0) {
          ring.rect(inL, inT, inW * hpFrac, inH);
          ring.fill({ color: 0xffffff, alpha: 0.85 * (fl / HPBAR_FLASH_MS) * hpNewAlpha });
        }
      }
      heartText.x = cx; heartText.y = cy;
      /* v2.3.1472 (owner: "a small 100 beneath the character hp bar and
         it's not clear what that's from — remove it"): the max-HP
         readout under the bar is gone.  The bar's own fill already
         shows the fraction, so the number added nothing but noise
         under the player's feet-to-head silhouette.  Kept as a hidden
         object (rather than deleted) so the pooled-Text layout above
         and the fade bookkeeping stay untouched. */
      maxText.alpha = 0;
      maxText.visible = false;
      const hpStr = String(Math.ceil(hpCur));
      if (heartText.text !== hpStr) heartText.text = hpStr;
    }
  }

  clear() {
    /* Called on zone change AND on full renderer destroy.  Preserve the
       playerDisplay (and petDisplay) across zones — the local player is
       the one entity that persists.  Destroying + recreating it caused
       the sprite to render invisibly in some zones (probably a frame
       race between layer reattachment and the next _updatePlayer pass).
       app.destroy({children:true}) handles full cleanup at shutdown. */
    for (const [, d] of this.monsterDisplays) {
      /* v2.3.1472: sibling-layer UI container needs its own reap. */
      if (d._hpUi && !d._hpUi.destroyed) d._hpUi.destroy({ children: true });
      d.destroy({ children: true });
    }
    this.monsterDisplays.clear();
    for (const [, d] of this.otherPlayerDisplays) d.destroy({ children: true });
    this.otherPlayerDisplays.clear();
    for (const [, d] of this.npcDisplays) d.destroy({ children: true });
    this.npcDisplays.clear();
    /* playerDisplay + petDisplay intentionally NOT destroyed here. */
  }
}
