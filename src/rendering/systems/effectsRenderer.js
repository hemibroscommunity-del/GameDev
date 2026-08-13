/**
 * Effects Renderer — particles, damage numbers, screen flashes, atmosphere,
 * projectiles, telegraphs, lock-on, ambient particles, chat bubbles, building signs.
 * Uses PixiJS Graphics for procedural particles and Text for damage numbers.
 */
import { Assets, BitmapFont, BitmapText, Container, Graphics, Rectangle, Sprite, Text, Texture, TextStyle } from 'pixi.js';

/* v2.3.1358 (owner directive: ALL animations ready before first use —
   see CLAUDE.md "Animation preloading is LAW"): every Assets.load in
   this renderer is tracked so the intro gate can AWAIT the whole set.
   _fxLoad is a drop-in for Assets.load; effectsAnimationsReady() is
   consumed by preloadWorldAnimations (preloadAnimations.js). */
const _fxPreload = [];
const _fxLoad = (url) => { const p = Assets.load(url); _fxPreload.push(p); return p; };
export function effectsAnimationsReady() { return Promise.allSettled(_fxPreload); }
import { ELEMENTS } from '@/data/elements.js';
import { ZONES, zonePlayerScale } from '@/data/zones.js';
import { TILE, MINE_SPOT_R, FISH_CUE_DY } from '@/data/constants.js';
import { GS_INNER_RADIUS, GS_OUTER_RADIUS, GS_FORWARD_ARC, BLOCK_ARC_HALF, cleaveArcBonus, hasGatherTool} from '@/data/index.js';
import { getFrame as getSlimeFrame, hasState as hasSlimeState } from '../slimeSprites.js';
import { getRecoloredFrame, hasRecoloredState } from '../monsterRecolor.js'; /* v2.3.1534; v2.3.1535 generalised */
import { getRemnantsTexture as getSnowmanRemnantsTex } from '../snowmanSprites.js';
import { variantSpritesFor } from '../monsterVariantSprites.js';
import { MONSTER_VARIANTS, ZONE_VARIANT_MAP } from '../../data/monsterVariants.js';
import { ZONE_SHARDS } from '../../data/shards.js';
import { placeSkillTraits, placeSkillTraitsFor, hideSkillTraits, SWORD_SWING_MS, BOW_SHOT_MS, BOW_RELEASE_MS } from './entityRenderer.js';
import { getEquip } from '../gearCatalog.js';
import { getShirt } from '../traits/shirtCatalog.js';
import { getShirtColor, shirtFill } from '../traits/shirtColorCatalog.js';
import { recolorBodyToCanvas, recolorStandInSkin, DEFAULT_SKIN_TARGET, skinTarget, pantsTarget, shoesTarget, getSkin, getPants, getShoes, onSkinChange, onPantsChange, onShoesChange } from '../playerSkins.js'; /* v2.3.1710: + the skin-only stand-in recolour (the cook) */
import { getGearFrame } from '../gearSheets.js';
import { upscaleToFrameHeight } from '../spriteScale.js'; /* v2.3.1112: restore downscaled-on-disk sword stand-in strips to their authored frame height */
import { cycleMs as jogCycleMs, frameCount as jogFrameCount, resolveDirection } from '../playerSprites.js';
import { jogWaistRow } from '../jogWaist.js';
import { bowTorsoCutRow } from '../bowTorsoCut.js';
import { swordTorsoCutRow } from '../swordTorsoCut.js';
import { GEARLAYER_VER } from '../gearVersion.js';   // shared cache-bust string (see gearVersion.js)

/* Popup icons (XP badge, gold coin, sword/arrow/spell for damage by weapon
   type). Loaded async — entries appear in the registry once each PNG is
   ready. Until then, popups render text-only and the icon is skipped. */
const POPUP_ICONS = {};
const POPUP_ICON_KEYS = ['xp', 'gold', 'sword', 'arrow', 'spell', 'heart'];
/* v2.3.1403 (owner: "the damage bow icon did not work" while damage
   numbers still showed): the icon load was one-shot — a single flaked
   fetch (common right after a deploy) left that icon undefined for the
   whole session, so the number renders but its icon is silently missing.
   Bounded retry (v2.3.1305 pattern, 2s/6s + cache-bust) so a flake
   self-heals; the popup renderer already no-ops the icon until the
   texture resolves. */
function _loadPopupIcon(k, attempt) {
  const bust = attempt > 0 ? '&r=' + attempt : '';
  return _fxLoad('/icons/popups/' + k + '.webp?v=2.3.1403' + bust)
    .then((tex) => { POPUP_ICONS[k] = tex; })
    .catch(() => {
      if (attempt < 2) {
        return new Promise((res) => setTimeout(res, [2000, 6000][attempt]))
          .then(() => _loadPopupIcon(k, attempt + 1));
      }
      console.warn('[popup-icons] load failed after retries', k);
    });
}
Promise.all(POPUP_ICON_KEYS.map((k) => _loadPopupIcon(k, 0)));

/* Elemental shard icons -- one PNG per zone, served from
   /icons/shards/.  Loaded lazily, falling back to a procedural circle
   draw until the texture resolves so an in-flight load doesn't blank
   the overlay. */
const SHARD_ICONS = {};
Promise.all(Object.values(ZONE_SHARDS).map((s) =>
  _fxLoad('/icons/shards/' + s.key + '.webp').then((tex) => { SHARD_ICONS[s.key] = tex; })
)).catch((err) => console.warn('[shard-icons] load failed', err));

/* v2.3.1334: painted magic bolt (owner sheet) — the basic staff
   projectile's flat two-circle draw becomes a 4-frame flickering
   sprite.  Horizontal strip, orb head noses RIGHT in the art, wisp
   tail trails LEFT, so rotation = the projectile's travel angle puts
   the tail pointing back at the caster.  Anchor sits on the ORB
   center (printed by tools/process_magic_bolt_sheet.py) — rotating
   around the frame center would sweep the head in an arc instead of
   pivoting the tail.  Until the strip resolves, the old circle draw
   is the fallback so an in-flight load never blanks live bolts. */
const MAGIC_BOLT_FRAMES = [];
const MAGIC_BOLT_ANCHOR = { x: 0.688, y: 0.534 };
const MAGIC_BOLT_FRAME_MS = 90;
_fxLoad('/sprites/projectiles/magic-bolt-v1.webp?v=2.3.1334').then((tex) => {
  if (!tex || !tex.source) return;
  const fw = Math.floor(tex.source.width / 4);
  for (let i = 0; i < 4; i++) {
    MAGIC_BOLT_FRAMES.push(new Texture({
      source: tex.source,
      frame: new Rectangle(i * fw, 0, fw, tex.source.height),
    }));
  }
}).catch((err) => console.warn('[magic-bolt] load failed', err));

/* v2.3.1396: painted SPECIAL projectiles (owner sheets) — the charged
   bow arrow and staff orb replace their procedural halo-ring draws with
   4-frame flicker strips, magic-bolt conventions (art noses RIGHT, tail
   trails LEFT, rotation = travel angle).  Anchors printed by
   tools/process_special_sheets.py: arrow pivots mid-shaft, orb pivots
   on its white-hot core.  Until a strip resolves, the old ring draw is
   the fallback so an in-flight load never blanks live specials. */
/* v2.3.1425 (owner): both special-projectile sprites 50% smaller
   (0.34 -> 0.17 arrow, 0.60 -> 0.30 orb).  Hit radii are untouched --
   this is a visual-size change only. */
const ARROW_SPECIAL = {
  frames: [], anchor: { x: 0.460, y: 0.580 }, frameMs: 90, scale: 0.17,
};
const MAGIC_SPECIAL = {
  frames: [], anchor: { x: 0.639, y: 0.536 }, frameMs: 90, scale: 0.30,
};
/* v2.3.1396: painted special-SWING slash (owner sheet) — a golden
   crescent that flashes then dissipates, played ONCE across the melee
   special's swing window by _updateSwordSwing / _updateRemoteSwordSwings
   (the sword stand-ins replace the whole body+weapon during a swing, so
   the slash draws here, not in entityRenderer's retired arc path).
   Art: crescent bulge faces LEFT → rotation aim+PI leads the swing. */
const SWORD_SLASH = { frames: [], anchor: { x: 0.5, y: 0.5 } };
for (const [cfg, url] of [
  [ARROW_SPECIAL, '/sprites/projectiles/arrow-special-v1.webp?v=2.3.1396'],
  [MAGIC_SPECIAL, '/sprites/projectiles/magic-special-v1.webp?v=2.3.1396'],
  [SWORD_SLASH, '/sprites/projectiles/sword-slash-v1.webp?v=2.3.1396'],
]) {
  _fxLoad(url).then((tex) => {
    if (!tex || !tex.source) return;
    const fw = Math.floor(tex.source.width / 4);
    for (let i = 0; i < 4; i++) {
      cfg.frames.push(new Texture({
        source: tex.source,
        frame: new Rectangle(i * fw, 0, fw, tex.source.height),
      }));
    }
  }).catch((err) => console.warn('[special-fx] load failed', url, err));
}

/* v2.3.1443: harvest EFFECT bursts (owner art, gather-feel round 3) —
   one-shot 8-frame strips played at the MARKER-HIT moments (owner chose
   marker movements over the passive wind-up): rock debris on each
   pickaxe slam, wood chips on each axe strike, a grease pop on the pan
   flip, a water splash while reeling + at the catch.  Queued via
   S._fxBursts { kind, x, y, t0, flip? } from ExtractionSwipeLayer /
   lifeSkillRewards / the strike blocks below; _updateFxBursts renders
   each over ~600ms on the overlay layer and reaps it. */
const EFFECT_BURSTS = {
  /* v2.3.1469: rocks art replaced with the owner's painted burst
     (tools/import_rocks_burst.py) — same 8x256 strip contract. */
  rocks:     { frames: [], h: 84, ay: 0.80, url: '/sprites/effects/rocks-burst-v1.webp?v=2.3.1469' },
  woodchips: { frames: [], h: 84, ay: 0.70, url: '/sprites/effects/woodchips-burst-v1.webp?v=2.3.1443' },
  grease:    { frames: [], h: 64, ay: 0.85, url: '/sprites/effects/grease-burst-v1.webp?v=2.3.1443' },
  /* v2.3.1470: splash art replaced with the owner's painted droplet
     crown (tools/import_rocks_burst.py) — same 8x256 strip contract. */
  splash:    { frames: [], h: 88, ay: 0.80, url: '/sprites/effects/splash-burst-v1.webp?v=2.3.1470' },
};
for (const cfg of Object.values(EFFECT_BURSTS)) {
  _fxLoad(cfg.url).then((tex) => {
    if (!tex || !tex.source) return;
    const fw = Math.floor(tex.source.width / 8);
    for (let i = 0; i < 8; i++) {
      cfg.frames.push(new Texture({ source: tex.source, frame: new Rectangle(i * fw, 0, fw, tex.source.height) }));
    }
  }).catch((err) => console.warn('[effect-burst] load failed', cfg.url, err));
}
const FX_BURST_MS = 600;

/* v2.3.1417: GESTURE TOOL sheets (owner art, part 2 of the gather-feel
   redesign) — the harvest cue's floating tool is a painted sprite whose
   FRAME follows the finger: ExtractionSwipeLayer writes ex.cueFrame01
   (0..1) from the live gesture (mining drag scrubs the pickaxe swing,
   fishing circles crank the reel, the chop swipe drives the axe, the
   up-flick flips the pan) and _updateExtractionCue picks the frame.
   8-frame 256px strips from tools/process_gesture_sheets.py.  Until a
   strip resolves, the old procedural tool draw is the fallback. */
/* v2.3.1418 (owner tuning): all four tools 2x larger; per-tool nudges —
   axe 10px left, pickaxe 20px up, pan 10px up (dx/dy applied at
   placement in _updateExtractionCue). */
const GESTURE_TOOLS = {
  /* v2.3.1423 (owner: pickaxe "floats above it — move down and to the
     left"): mining dx/dy now shift the WHOLE swing path (hover +
     contact both carry them in the clamp branch).
     v2.3.1429 (owner again: "down and to the left MORE — its left-to-
     right half-circle swing sits right above the ore"): -14/16 ->
     -30/44 so the art's swing arc lands ON the ore body, not over it. */
  mining:      { frames: [], h: 128, dx: -30, dy: 44,  url: '/sprites/tools/pickaxe-gesture-v1.webp?v=2.3.1417' },
  woodcutting: { frames: [], h: 128, dx: -10, dy: 0,   url: '/sprites/tools/axe-gesture-v1.webp?v=2.3.1417' },
  /* v2.3.1449 (owner: "the fishing gesture and marker need to be shrank
     by about 70%"): the reel MARKER drops to ~30% of its v2.3.1418 size
     (116 -> 35).  Fishing's cue anchors on the PLAYER, not on a node, so
     the big reel was covering the character it hovers over; the other
     three tools sit on their node and keep their tuned sizes.
     v2.3.1470 (owner: "increase reel marker and gesture cue by 2x then
     move it down more so it's not on player face"): 35 -> 70.  The
     v2.3.1449 shrink was a workaround for the cue sitting ON the head —
     the anchor now drops below the face instead (FISH_CUE_DY), so the
     marker can be readable again. */
  fishing:     { frames: [], h: 70,  dx: 0,   dy: 0,   url: '/sprites/tools/reel-gesture-v1.webp?v=2.3.1417' },
  /* v2.3.1431: pan raised dy -10 -> -66 — the v2.3.1429 2x cook figure
     grew INTO the pan marker's old spot, so the animating pan kept
     covering/uncovering the torso (owner: "the shirt is flickering
     when the naked shirt wearing character cooks").  -66 clears the
     82px figure's head with margin.
     v2.3.1433 (owner sheet, round 2): pan-gesture-v2 — the painted
     fillet is ERASED from the frames (tools/process_pan_food_sheet.py)
     and the REAL raw-fish bag icon of the fish being cooked rides
     `food`: per-frame {x,y} anchors (256-cell coords, the measured
     centroid of where the painted food sat) + rot (radians) so the
     fillet flips through the arc and LANDS UPSIDE DOWN (owner). */
  cooking:     { frames: [], h: 124, dx: 0,   dy: -66, url: '/sprites/tools/pan-gesture-v2.webp?v=2.3.1433',
    food: [
      { x: 109, y: 163, rot: 0 },
      { x: 101, y: 141, rot: -0.15 },
      { x: 97,  y: 53,  rot: 0.6 },
      { x: 103, y: 54,  rot: 1.3 },
      { x: 125, y: 56,  rot: 2.0 },
      { x: 110, y: 87,  rot: 2.7 },
      { x: 98,  y: 163, rot: Math.PI },
      { x: 98,  y: 166, rot: Math.PI },
    ] },
};
for (const cfg of Object.values(GESTURE_TOOLS)) {
  _fxLoad(cfg.url).then((tex) => {
    if (!tex || !tex.source) return;
    const fw = Math.floor(tex.source.width / 8);
    for (let i = 0; i < 8; i++) {
      cfg.frames.push(new Texture({
        source: tex.source,
        frame: new Rectangle(i * fw, 0, fw, tex.source.height),
      }));
    }
  }).catch((err) => console.warn('[gesture-tools] load failed', cfg.url, err));
}

/* Gather-node sprites — keyed by node.nodeType. Until each texture is
   loaded, _updateGatherNodes falls through to the procedural drawing path
   below. Source PNGs are ~1000-1250 px; in-game node footprints are
   tier-sized (tier.size ≈ 6-12 px), so each sprite is scaled to a target
   pixel height tuned to feel right next to the player sprite. */
/* ═══ v2.3.1667: ONE finger cue, and it POINTS WHERE IT IS GOING ═══
 *
 * Owner: "the lifeskills movement cues should replace the simple white blob
 * with a finger icon that moves in the direction of where the blob moved."
 *
 * The cue was already finger-SHAPED in all four skills, but only fishing
 * actually rotated: it derives a tangent from its orbit, so its finger
 * sweeps around pointing along the path.  Mining, cooking and woodcutting
 * drew axis-aligned `roundRect` capsules that TRANSLATED without ever
 * turning, so on the up-stroke the finger slid backwards — which is what
 * read as a blob drifting rather than a hand making a gesture.
 *
 * These two helpers take an ANGLE, so every skill can point its finger
 * along its own direction of travel.  The construction is fishing's
 * (stroke with a round cap + a tip circle + a knuckle dot), because that
 * one is already rotation-general — this generalises the version that
 * worked instead of inventing a new one.
 *
 * Deliberately procedural, not a sprite: no finger/hand asset exists in
 * the repo, and a Graphics draw costs no load, no cache-bust and no
 * per-zone preload registration (the animation-preloading law).  If a
 * painted finger is ever authored, swap these two bodies for a rotated
 * Sprite and every call site keeps working.
 */
/* The shared size sheet (v2.3.1435/1436 sizing, owner-tuned frame by frame
   with headless screenshots).  Module scope so the helper and the cue code
   read the SAME numbers — duplicating them is how a retune silently applies
   to three skills and not the fourth. */
export const CUE_FINGER_LEN = 30, CUE_FINGER_W = 19;
function drawFingerCue(gfx, x, y, angle, alpha, scale) {
  const s = scale || 1;
  const len = CUE_FINGER_LEN * s, w = CUE_FINGER_W * s;
  const dx = Math.cos(angle), dy = Math.sin(angle);
  /* Body trails BACK from the fingertip at (x,y) along -angle. */
  gfx.moveTo(x - dx * len, y - dy * len);
  gfx.lineTo(x, y);
  gfx.stroke({ color: 0xffffff, width: w, cap: 'round', alpha });
  gfx.circle(x, y, w / 2 + 0.5);
  gfx.fill({ color: 0xffffff, alpha });
  gfx.circle(x - dx * (len + 4 * s), y - dy * (len + 4 * s), 8 * s);
  gfx.fill({ color: 0xe6e6ee, alpha });
}
/* The motion streak, trailing the fingertip along -angle. */
function drawFingerStreak(gfx, x, y, angle, length, width, alpha) {
  gfx.moveTo(x - Math.cos(angle) * length, y - Math.sin(angle) * length);
  gfx.lineTo(x, y);
  gfx.stroke({ color: 0xffffff, width, alpha });
}

const NODE_SPRITE_SOURCES = {
  tree:     '/sprites/trees/tree-pine.webp',
  fishSpot: '/sprites/world/fish-spot.webp',
  oreVein:  '/sprites/world/ore-vein.webp',
};
const NODE_SPRITE_TEX = {};
/* Target render heights in world px at tierStep 1, scaled up with tier.
   v2.3.1275: +50% (was tree 112 / fishSpot 88 / oreVein 88) — owner's
   size experiment scales resources with the 50%-bigger monsters.  The
   ore-break animation derives from these too (_spawnOreBreak). */
const NODE_SPRITE_HEIGHT_BASE = { tree: 168, fishSpot: 132, oreVein: 132 };
const NODE_SPRITE_ANCHOR_Y = { tree: 1.0, fishSpot: 0.5, oreVein: 1.0 };
Promise.all(Object.entries(NODE_SPRITE_SOURCES).map(([k, path]) =>
  _fxLoad(path).then((tex) => { NODE_SPRITE_TEX[k] = tex; })
)).catch((err) => console.warn('[node-sprites] load failed', err));

/* Ore-vein break: a 14-frame 256-px horizontal strip (intact -> split
   halves) played once when an ore node is depleted.  Carved into per-frame
   Textures up front, same pattern as the player sheets.  See
   docs/skill-animation-pipeline.md. */
const ORE_BREAK_FRAMES = 14;
const ORE_BREAK_FRAME = 256;
const ORE_BREAK_DURATION_MS = 700;
/* Rock fills ~45% of the 256-px frame height, so scale the strip up
   relative to the static ore-vein target height to keep the rock the same
   on-screen size.  Tune ORE_BREAK_FILL / ORE_BREAK_ANCHOR_Y in-game if the
   broken rock sits high/low or large/small. */
const ORE_BREAK_FILL = 0.45;
const ORE_BREAK_ANCHOR_Y = 0.78;
let ORE_BREAK_TEX = null;
_fxLoad('/sprites/world/ore-vein-break.webp?v=1').then((tex) => {
  if (!tex || !tex.source) return;
  tex.source.scaleMode = 'linear';
  tex.source.autoGenerateMipmaps = true;
  const arr = [];
  for (let i = 0; i < ORE_BREAK_FRAMES; i++) {
    arr.push(new Texture({
      source: tex.source,
      frame: new Rectangle(i * ORE_BREAK_FRAME, 0, ORE_BREAK_FRAME, ORE_BREAK_FRAME),
    }));
  }
  ORE_BREAK_TEX = arr;
}).catch((err) => console.warn('[ore-break] load failed', err));
/* User pass: shrink the break vignette 50% so it reads as a node, not a boulder. */
const ORE_BREAK_SCALE = 0.5;
/* Frame index where the rock visibly splits — the ore icon pops out here. */
const ORE_BREAK_SPLIT_FRAME = 7;

/* Copper ore icon (same asset the inventory uses) — floats out of the broken
   node as a "collected" pop. All ores currently share the copper thumb. */
let ORE_ICON_TEX = null;
_fxLoad('/icons/ore/ore-copper.webp').then((tex) => {
  if (tex) { tex.source.scaleMode = 'linear'; ORE_ICON_TEX = tex; }
}).catch((err) => console.warn('[ore-icon] load failed', err));

/* Snowman get-hit impact (v2.3.1127): a one-shot ice-burst ERUPTION played at a
   snowman's torso each time it's hit, ROTATED so the plume shoots along the
   attack direction (attack from below -> plume up; from above -> plume down;
   from a side -> plume sideways).  Owner-uploaded sheet is a single row of 8
   frames, 192×1024 each; the upward plume is the "north" base art.  The burst
   column sits at y≈301-600 of the 1024-tall frame, its root (base) at y≈600.
   Mirrors the ore-break pattern: carve frames up front, then spawn/advance. */
const IMPACT_FRAME_W = 192;
const IMPACT_FRAME_H = 1024;
const IMPACT_SRC_FROM = 0;
/* v2.3.1130: the sheet is a DOUBLE pulse (per-frame density [6,23,53,78,62,100,
   39,6] peaks at f3, dips at f4, peaks again at f5), so playing all 8 erupted
   twice.  End on the FIRST peak: frames 0..3 only. */
const IMPACT_SRC_TO = 4;          /* exclusive — frames 0..3, rise to the first peak */
const IMPACT_FRAMES = IMPACT_SRC_TO - IMPACT_SRC_FROM;
/* Sizing: scale by a target on-screen plume HEIGHT (the effect is a vertical
   column, so height reads better than frame width).  IMPACT_CONTENT_H is the
   burst column's height within the frame (y≈301-600 ≈ 300 px); IMPACT_PLUME_H is
   the full-size on-screen height (~1.5× the 64-px snowman).  Arrows render at
   sizeMul 0.5.  Owner-tunable. */
const IMPACT_CONTENT_H = 300;
const IMPACT_PLUME_H = 96;
/* Normalised Y of the burst root (base) within the frame — the sprite anchors
   here so the plume pivots/erupts from one point under rotation. */
const IMPACT_ROOT_Y = 0.586;
/* Center-mass offset above the snowman container origin (feet sit ~13 px below
   it; the 64-px sprite reaches ~51 px above, so torso centre ≈ 19 px up).  The
   root anchor is placed here, and the plume erupts outward from it. */
const IMPACT_CENTER_DY = 19;
/* One-shot flash: play the frames once over this window, then dispose.
   v2.3.1126: 420 -> 210 (owner) so the burst snaps faster on contact.
   v2.3.1128: 210 -> 420 (owner) -- the directional eruption read too fast;
   half-speed lets the plume rise and settle.
   v2.3.1130: 420 -> 210 alongside the 8->4 frame trim, keeping the same ~52ms/
   frame pace the owner approved (was 420/8; now 210/4). */
const IMPACT_DURATION_MS = 210;
/* v2.3.1129: minimum gap between eruptions ON THE SAME snowman.  A single weapon
   can't hit faster than the ~200ms swing/fire cooldown, so this never drops a
   real hit, but it collapses any near-simultaneous double-stamp (e.g. two
   players landing at once) into one plume so the effect can't visibly duplicate. */
const IMPACT_MIN_GAP_MS = 150;
/* Lazy-loaded (v2.3.1124): the sheet is ~2 MB, so it's only fetched the first
   time a snowman is actually on screen (zone entry) -- not at startup, where
   town has no snowmen.  Keeps the "no eager preloading" memory/download budget. */
let IMPACT_TEX = null;
let _impactLoadStarted = false;
export function ensureImpactTex() {
  if (_impactLoadStarted) return;
  _impactLoadStarted = true;
  _fxLoad('/sprites/monsters/snowman/impact.png?v=2').then((tex) => {
    if (!tex || !tex.source) return;
    tex.source.scaleMode = 'linear';
    tex.source.autoGenerateMipmaps = true;
    const arr = [];
    for (let i = IMPACT_SRC_FROM; i < IMPACT_SRC_TO; i++) {
      arr.push(new Texture({
        source: tex.source,
        frame: new Rectangle(i * IMPACT_FRAME_W, 0, IMPACT_FRAME_W, IMPACT_FRAME_H),
      }));
    }
    IMPACT_TEX = arr;
  }).catch((err) => console.warn('[snowman-impact] load failed', err));
}

const DMG_STYLE = new TextStyle({
  fontFamily: 'Source Sans 3, sans-serif',
  fontSize: 14,
  fontWeight: '800',
  fill: '#ffffff',
  stroke: { color: '#000000', width: 3 },
  align: 'center',
});

/* Emoji-safe text style — used when dmg.text contains non-ASCII
   characters (skulls, stars, swords, etc.).  iOS Safari + PixiJS v8
   + stroked Text + emoji glyph is a documented native-crash vector
   (full tab kill, no JS error).  Dropping the stroke and falling
   through to the system emoji font (Apple Color Emoji on iOS)
   sidesteps the WebGL texture path that crashes. */
const DMG_STYLE_EMOJI = new TextStyle({
  fontFamily: '"Apple Color Emoji","Segoe UI Emoji","Source Sans 3",sans-serif',
  fontSize: 14,
  fontWeight: '800',
  fill: '#ffffff',
  align: 'center',
});

/* v2.3.1357: pre-baked glyph atlas for PLAIN NUMERIC popups (damage /
   XP / gold — the overwhelming majority in combat).  Every `new Text`
   is a synchronous canvas rasterization; profiling a 12-monster pack
   fight showed popup MINT RATE (not live count) dominating the frame
   (avg -55ms and the 400ms spikes vanished with popups suppressed).
   +100-HP fights run several times longer, so that churn is sustained
   — the owner's "running badly" report.  BitmapText assembles glyphs
   from this atlas at near-zero cost.  Glyphs bake WHITE + black stroke
   at 2x the base popup size (scaled down at use = crisp on retina);
   tint colors the fill while the black stroke stays black (0 x tint).
   Popups needing canvas features keep classic Text: emoji (own style),
   specials (dropShadow halo), and any char outside the baked set. */
const DMG_BMP_FONT = 'bt-dmg-digits';
/* v2.3.1363: bake at 100px — pixi's DynamicBitmapFont measurement base.
   The v2.3.1357 28px bake ended up stored at a FRACTIONAL effective
   resolution (pixi scales page resolution by bakePx/100), so on iPhone
   (DPR 3) glyphs were upscaled at draw time: bilinear filtering smeared
   the heavy black stroke across the white fill and damage numbers read
   as muddy BLACK over Ember's dark terrain (owner report).  Desktop at
   DPR 1 downscaled and looked fine, which is why the rig never caught
   it.  A 100px bake always DOWNSCALES (21px popup × DPR 3 = 63 device
   px) — crisp on every device, no DPR games.  Stroke 14 keeps the
   classic DMG_STYLE outline ratio (3/21 = 14/100 ≈ 0.14; the old bake's
   6/28 = 0.21 was 50% heavier, part of the mud). */
const DMG_BMP_BAKE_PX = 100;
let _dmgBmpReady = false;
try {
  BitmapFont.install({
    name: DMG_BMP_FONT,
    style: {
      fontFamily: 'Source Sans 3, sans-serif',
      fontSize: DMG_BMP_BAKE_PX,
      fontWeight: '800',
      fill: '#ffffff',
      stroke: { color: '#000000', width: 14 },
    },
    chars: [['0', '9'], ['A', 'Z'], ['a', 'z'], '+-. !'],
  });
  _dmgBmpReady = true;
} catch (e) { /* fallback: classic Text path below */ }
/* Plain popups the atlas can render: digits/letters/space and + - . ! */
const DMG_BMP_RE = /^[0-9A-Za-z+\-. !]+$/;

/* v2.3.1361: prewarm the BitmapText render pipe behind the loading
   screen.  BitmapFont.install (above) bakes the glyph atlas at module
   load, but the atlas GPU upload AND the BitmapText batcher/shader
   init were still deferred to the first popup DRAW — i.e. the first
   hit of the session, mid-combat.  On iOS Safari that first-use init
   is the prime suspect for the "hit once by a fire goblin → game
   crashed" report (the rest of the hit path is years-old code and the
   crash arrived with v2.3.1357).  Renders one throwaway BitmapText
   containing every baked char through the REAL renderer while the
   intro overlay is still up, so combat never pays (or crashes on)
   that init.  Any failure here permanently downgrades popups to the
   classic Text path — same visuals, pre-1357 cost. */
export function prewarmDmgFontPipe(renderer) {
  if (!renderer) return;
  if (_dmgBmpReady) {
    let bt = null;
    try {
      bt = new BitmapText({
        text: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz+-. !',
        style: { fontFamily: DMG_BMP_FONT, fontSize: DMG_BMP_BAKE_PX },
      });
      bt.alpha = 0.001; /* must actually draw — alpha 0 / visible false would be culled */
      renderer.render(bt);
    } catch (e) {
      _dmgBmpReady = false; /* pipe is broken here — never touch it in combat */
    }
    if (bt) { try { bt.destroy(); } catch (e) { /* best-effort */ } }
  }
  /* v2.3.1363: also warm the CLASSIC Text popup pipe — owner still felt
     a hitch on the first hit taken.  Early hits mint classic-Text popups
     the BitmapText atlas can't cover ('🛡️ Defense Lv N' fires on nearly
     every early hit), and their first draw pays the canvas-text pipe
     init PLUS the platform's first emoji-glyph rasterization (Apple
     Color Emoji load on iOS) at full DPR.  Render one of each style
     once behind the loading screen instead. */
  /* NB mirror real usage: DMG_STYLE (stroked) only ever draws ASCII;
     emoji ONLY goes through DMG_STYLE_EMOJI — stroked Text + emoji is
     the documented iOS Safari tab-killer, in prewarm too. */
  const warmTexts = [
    [DMG_STYLE, '-0 BLOCK Dodge!'],
    [DMG_STYLE_EMOJI, '🛡️🔥 Defense Lv 0'],
  ];
  for (const [style, str] of warmTexts) {
    let t = null;
    try {
      t = new Text({ text: str, style: { ...style, fontSize: 21 } });
      t.alpha = 0.001;
      renderer.render(t);
    } catch (e) { /* best-effort */ }
    if (t) { try { t.destroy(); } catch (e) { /* best-effort */ } }
  }
}

/* Cheap ASCII test — anything outside 0x20-0x7E is treated as emoji. */
function isAsciiOnly(s) {
  if (typeof s !== 'string') return true;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x20 || c > 0x7E) return false;
  }
  return true;
}

const LABEL_STYLE = new TextStyle({
  fontFamily: 'Source Sans 3, sans-serif',
  fontSize: 11,
  fill: '#ffffff',
  align: 'center',
  dropShadow: { color: '#000000', blur: 2, distance: 1 },
});

/* Emoji-safe label style for chat bubbles, NPC names, etc. that may
   contain user-supplied or game-supplied emoji.  Same iOS WebGL
   crash class as DMG_STYLE_EMOJI — stripping the dropShadow (no stroke
   here either) sidesteps the bad path.
   v2.3.1014: text font listed FIRST, emoji fonts as fallback.  Listing
   an emoji font first made the browser measure the SPACE glyph with the
   emoji font's oversized advance, blowing out word spacing whenever a
   string had any non-ASCII char (iOS autocorrect curly quotes, em-dash,
   accents…).  Per-glyph CSS fallback still renders real emoji. */
const LABEL_STYLE_EMOJI = new TextStyle({
  fontFamily: '"Source Sans 3","Apple Color Emoji","Segoe UI Emoji",sans-serif',
  fontSize: 11,
  fill: '#ffffff',
  align: 'center',
});

function cssToHex(css) {
  if (typeof css !== 'string') return 0xffffff;
  const clean = css.replace('#', '');
  if (clean.length === 6) return parseInt(clean, 16) || 0xffffff;
  return 0xffffff;
}

/**
 * Manages all visual effects.
 */
export class EffectsRenderer {
  constructor(layers) {
    this.particleLayer = layers.particles;
    this.dmgLayer = layers.damageNumbers;
    this.atmosphereLayer = layers.atmosphere;
    this.screenFXLayer = layers.screenFX;
    this.lootLayer = layers.groundLoot;
    this.splatLayer = layers.groundSplatter;
    this.nodeLayer = layers.gatherNodes;
    /* v2.3.1500: above the player — trees only (see _wantLayer below). */
    this.nodeFrontLayer = layers.gatherNodesFront || layers.gatherNodes;
    /* v2.3.1593: below entities — ore only, so monsters walk in front of it.
       Falls back to nodeLayer so an older scene graph still renders ore. */
    this.nodeBackLayer = layers.gatherNodesBack || layers.gatherNodes;
    this.projectileLayer = layers.projectiles;
    this.telegraphLayer = layers.telegraphs;
    this.overlayLayer = layers.overlayWorld;
    this.hudLayer = layers.hud;

    // Pooled graphics
    this.particleGfx = new Graphics();
    this.particleLayer.addChild(this.particleGfx);

    this.projectileGfx = new Graphics();
    this.projectileLayer.addChild(this.projectileGfx);

    this.telegraphGfx = new Graphics();
    this.telegraphLayer.addChild(this.telegraphGfx);

    this.overlayGfx = new Graphics();
    this.overlayLayer.addChild(this.overlayGfx);

    this.hudGfx = new Graphics();
    this.hudLayer.addChild(this.hudGfx);

    // Active damage number texts
    this.dmgTexts = [];
    this.maxDmgTexts = 50;

    /* Tracked Sprite instances for slime projectiles. We attach the
       sprite to proj._pixiSprite for fast lookup, and keep parallel
       entries here so we can destroy orphans after the simulator
       drops a projectile from S.slimeProjectiles. */
    this.slimeProjSprites = [];

    /* v2.3.1334: tracked Sprite instances for the painted magic bolt
       (basic staff projectiles, local + remote) — same reap pattern
       as slimeProjSprites. */
    this.magicBoltSprites = [];
    /* v2.3.1396: same lifecycle for the painted SPECIAL projectiles
       (charged bow arrow + charged staff orb, local + remote). */
    this.specialFxSprites = [];

    // Chat bubble texts
    this.chatTexts = new Map();

    // Screen flash overlay
    this.flashOverlay = new Graphics();
    this.screenFXLayer.addChild(this.flashOverlay);

    // Atmosphere overlay
    this.atmosphereGfx = new Graphics();
    this.atmosphereLayer.addChild(this.atmosphereGfx);

    // Loot graphics
    this.lootGfx = new Graphics();
    this.lootLayer.addChild(this.lootGfx);

    // Splatter graphics
    this.splatGfx = new Graphics();
    this.splatLayer.addChild(this.splatGfx);

    // Node graphics
    this.nodeGfx = new Graphics();
    this.nodeLayer.addChild(this.nodeGfx);

    // Catch-flight graphics (fish flying into the bag) — overlayWorld, above
    // the player.  Drawn as a shape (not an emoji) so it renders identically
    // on every platform regardless of emoji-font availability.
    this.catchGfx = new Graphics();
    this.overlayLayer.addChild(this.catchGfx);

    /* v2.3.843: woodcutting "chopper" animation — the owner's pixel-art
       lumberjack swung beside a tree during the chop (the ready phase).
       A persistent world-space Sprite (nodeLayer is camera-transformed)
       whose texture cycles through the strip's frames; shown only while a
       woodcutting extraction is ready, hidden otherwise.  The strip is a
       horizontal sheet of CHOP_FRAME_W-wide frames keyed transparent. */
    this.chopSprite = new Sprite();
    this.chopSprite.anchor.set(0.5, 1);  // bottom-centre stands on the ground
    this.chopSprite.visible = false;
    this.nodeLayer.addChild(this.chopSprite);
    /* v2.3.1417: the gesture-driven tool cue (painted pickaxe/reel/axe/
       pan) — one reusable centre-anchored sprite, positioned + frame-
       picked per tick in _updateExtractionCue.  On the OVERLAY layer
       (above nodes AND the player): node sprites join nodeLayer after
       construction-time children, so a nodeLayer tool was painted over
       by the ore/tree art it floats on. */
    this.gestureToolSprite = new Sprite();
    this.gestureToolSprite.anchor.set(0.5, 0.5);
    this.gestureToolSprite.visible = false;
    this.overlayLayer.addChild(this.gestureToolSprite);
    /* v2.3.1433 (owner): the cooking pan sheet is food-agnostic now
       (painted fillet erased by tools/process_pan_food_sheet.py) — this
       sprite rides the per-frame food anchors carrying the REAL raw-fish
       bag icon of whatever is being cooked, rotating through the flip so
       it lands upside down.  Added AFTER gestureToolSprite so the food
       composites over the pan. */
    this.gestureFoodSprite = new Sprite();
    this.gestureFoodSprite.anchor.set(0.5, 0.5);
    this.gestureFoodSprite.visible = false;
    this.overlayLayer.addChild(this.gestureFoodSprite);
    this._foodIconTex = {};   /* iconUrl -> Texture | 'loading' */
    this._chopFrames = [];
    this._chopLastFrame = -1;  // strike-frame edge tracker for the chop sfx
    /* v2.3.1469: ?v= added — the strip itself changed (transparent eye
       holes filled white, owner report) and it had no cache-bust, so
       returning players would have kept the stale copy forever. */
    _fxLoad('/sprites/skills/chop-strip.webp?v=2.3.1469').then((tex) => {
      const FW = 240, FH = 220;  // per-frame size of chop-strip.png
      const n = Math.max(1, Math.round(tex.width / FW));
      for (let i = 0; i < n; i++) {
        this._chopFrames.push(new Texture({ source: tex.source, frame: new Rectangle(i * FW, 0, FW, FH) }));
      }
    }).catch((err) => console.warn('[chop-strip] load failed', err));
    /* v2.3.1468: legs-erased lumberjack, swapped in while leg armour is
       equipped — the cook-strip-legless pattern (v2.3.1114).  The
       regenerated greaves art's stances don't pixel-match the body's,
       so the bare legs peeked around the armor; steel-filling the peeks
       (v2.3.1466) read as "duplicating another body beneath the legs"
       (owner).  With the legless body the armor legs ARE the legs. */
    this._chopLeglessFrames = [];
    _fxLoad('/sprites/skills/chop-strip-legless.webp?v=2.3.1469').then((tex) => {
      const FW = 240, FH = 220;
      const n = Math.max(1, Math.round(tex.width / FW));
      for (let i = 0; i < n; i++) {
        this._chopLeglessFrames.push(new Texture({ source: tex.source, frame: new Rectangle(i * FW, 0, FW, FH) }));
      }
    }).catch((err) => console.warn('[chop-strip-legless] load failed', err));

    /* v2.3.1131: gear layers for the woodcutting chopper (mirror of the cook
       stand-in).  Shirt / leg-armour / chest-plate drawn over the lumberjack when
       equipped.  Layers are 12-frame 480x440 (2x) strips at
       /sprites/gear/<slot>/<item>/chop-west.png, pixel-aligned to the chop body's
       frames 12-23.  Added AFTER chopSprite so they composite on top.
       v2.3.1710: body, then LEGS, then shirt, then chest — this is the exact
       pose the owner named ("while woodcutting ... the shirt should be layered
       in front of the leg armor"): the greaves' waistband was cutting across
       the chopper's hem.  Same reasoning as the player container; the chest
       plate hides the shirt entirely (_placeSwingShirt) so it can stay on top. */
    this.chopLegsSprite = new Sprite();
    this.chopLegsSprite.anchor.set(0.5, 1);
    this.chopLegsSprite.visible = false;
    this.nodeLayer.addChild(this.chopLegsSprite);
    this.chopShirtSprite = new Sprite();
    this.chopShirtSprite.anchor.set(0.5, 1);
    this.chopShirtSprite.visible = false;
    this.nodeLayer.addChild(this.chopShirtSprite);
    this.chopChestSprite = new Sprite();
    this.chopChestSprite.anchor.set(0.5, 1);
    this.chopChestSprite.visible = false;
    this.nodeLayer.addChild(this.chopChestSprite);

    /* v2.3.853: cook character (shown at the campfire during a cooking
       extraction) + firemaking character (shown at the player while lighting
       a fire) — same world-space sprite pattern as the chopper. */
    this.cookSprite = new Sprite();
    this.cookSprite.anchor.set(0.5, 1);
    this.cookSprite.visible = false;
    this.nodeLayer.addChild(this.cookSprite);
    /* v2.3.1114: leg-armour layer for the cook stand-in -- the equipped greaves
       drawn over the cook's legs, untinted (armour keeps its own metal colour),
       shown only when leg armour is equipped. Same 24-frame 213x220 cook strip
       at /sprites/gear/legs/<item>/cook-south.png.
       v2.3.1710: moved ABOVE the shirt in creation order (i.e. drawn first) so
       the shirt sits in front of it — the owner's "and doing other things"
       covers this pose too, and the cook is front-facing, so the tucked-in hem
       reads worse here than anywhere. */
    this.cookLegsSprite = new Sprite();
    this.cookLegsSprite.anchor.set(0.5, 1);
    this.cookLegsSprite.visible = false;
    this.nodeLayer.addChild(this.cookLegsSprite);
    /* v2.3.1113: shirt layer for the cook stand-in -- the player's selected
       shirt, drawn over the bald cook torso and tinted to their shirt colour
       (same white-base + Pixi-tint path the sword/bow stand-ins use). Added
       AFTER cookSprite so it composites on top of the body; the head traits
       (hat/hair/beard) are placed separately and sit above both. Sheet:
       /sprites/gear/shirt/<item>/cook-south.png, a 24-frame 213x220 strip
       pixel-aligned to cook-strip.webp. */
    this.cookShirtSprite = new Sprite();
    this.cookShirtSprite.anchor.set(0.5, 1);
    this.cookShirtSprite.visible = false;
    this.nodeLayer.addChild(this.cookShirtSprite);
    /* v2.3.1115: chest-armour layer for the cook stand-in -- the equipped plate
       (+ armoured arms) drawn over the torso, untinted, shown only when chest
       armour is equipped. Same 24-frame 213x220 cook strip at
       /sprites/gear/chest/<item>/cook-south.png. Added last so it composites
       over the body + shirt. */
    this.cookChestSprite = new Sprite();
    this.cookChestSprite.anchor.set(0.5, 1);
    this.cookChestSprite.visible = false;
    this.nodeLayer.addChild(this.cookChestSprite);
    /* v2.3.1710: both cook bodies now load through _loadCookStrips, which bakes
       the PLAYER'S skin into them (owner: the cooking character "has the wrong
       skin color").  v2.3.1114's legs-erased body rides the same bake so the two
       stay pixel-identical apart from the erased legs. */
    this._cookFrames = [];
    this._cookLeglessFrames = [];
    this._loadCookStrips();

    this.fireSprite = new Sprite();
    this.fireSprite.anchor.set(0.5, 1);
    this.fireSprite.visible = false;
    this.nodeLayer.addChild(this.fireSprite);
    this._fireFrames = [];
    _fxLoad('/sprites/skills/firemaking-strip.webp').then((tex) => {
      const FW = 161, FH = 220;
      const n = Math.max(1, Math.round(tex.width / FW));
      for (let i = 0; i < n; i++) this._fireFrames.push(new Texture({ source: tex.source, frame: new Rectangle(i * FW, 0, FW, FH) }));
    }).catch((err) => console.warn('[firemaking-strip] load failed', err));

    /* v2.3.910: sword-swing stand-in — the owner-supplied swing animation plays
       at the player during a melee swing (same self-contained stand-in pattern
       as the gathering animations).  Combat logic is untouched; this only swaps
       the body VISUAL for the swing window.
       v2.3.912: per-facing sheets (the occluded swing can't be mirrored — a
       flipped blade would sweep behind the body).  Each sheet is authored with
       the figure's ground point at frame-centre-x and feet at `feetY`, so the
       sprite anchors at (0.5, feetY/fh): feet plant on the ground while the blade
       has room above (windup) and to the side (follow-through).  crownKey maps to
       the per-frame head crowns in crowns.json. */
    /* v2.3.920: the south swing (a big front-facing overhead chop that finishes
       toward the lower-RIGHT) covers the whole front arc: used as-authored for
       south AND southeast (finishes right -> reads as down-right), and MIRRORED
       for southwest (finishes left -> reads as down-left).  The owner preferred
       the south swing's larger arc over a dedicated SE clip, and reusing it
       sidesteps the white-background keying issues that SE clip had. */
    this._swordCfg = {
      /* v2.3.954: south swing also supports the LAYERED gear path -- a bald body
         (bodyUrl) + equipped chest/legs armour (gear/<slot>/<item>/swing-south.png)
         + the recolorable weapon, so worn armour shows during the swing via the
         existing gear slots.  Falls back to armorUrl/bald if bodyUrl missing. */
      south: { url: '/sprites/player/sword-south.png', fw: 320, fh: 320, feetY: 270, crownKey: 'sword',   traitDir: 'south', armorUrl: '/sprites/player/sword-south-armored.png', weaponUrl: '/sprites/player/sword-south-weapon.png', bodyUrl: '/sprites/player/sword-south-body.png', torsoUrl: '/sprites/player/sword-south-torso.png', gearPose: 'swing', bodyScale: 0.92, bodyScaleX: 0.95 },
      east:  { url: '/sprites/player/sword-east.png',  fw: 402, fh: 246, feetY: 223, crownKey: 'sword_e', traitDir: 'east', armorUrl: '/sprites/player/sword-east-armored.png', weaponUrl: '/sprites/player/sword-east-weapon.png', bodyUrl: '/sprites/player/sword-east-body.png', torsoUrl: '/sprites/player/sword-east-torso.png', gearPose: 'swing' },
      north: { url: "/sprites/player/sword-north.png", fw: 340, fh: 227, feetY: 211, crownKey: "sword_n", traitDir: "north", armorUrl: "/sprites/player/sword-north-armored.png", weaponUrl: "/sprites/player/sword-north-weapon.png", bodyUrl: "/sprites/player/sword-north-body.png", torsoUrl: "/sprites/player/sword-north-torso.png", gearPose: "swing" },
    };
    /* facing -> [cfg key, mirror?].  v2.3.921: SE/SW mirror flipped per owner.
       v2.3.922: east sheet covers east (as-is) + west (mirrored).
       v2.3.923: north (back view) sheet covers north + northeast (as-is) and
       northwest (mirrored) -- NE/NW mirror is a first guess, easily flipped. */
    this._swordFacing = {
      south:     ['south', false],
      southeast: ['south', true],
      southwest: ['south', false],
      east:      ['east', false],
      west:      ['east', true],
      north:     ['north', false],
      northeast: ['north', false],
      northwest: ['north', true],
    };
    this._swordFrames = {};        // cfg key -> [Texture]
    /* v2.3.948: optional armored body + separable weapon layers per facing.
       When present (currently south), the swing draws the armored body instead
       of the bald baked sheet and layers the recolorable weapon on top. */
    this._swordArmorFrames = {};
    this._swordWeaponFrames = {};
    /* v2.3.954: bald body (base) for the layered gear path, + a small size-aware
       loader/cache for equipped armour layers (gear/<slot>/<item>/<pose>-<dir>.png,
       sliced by the per-facing frame width since the swing frames aren't 256). */
    this._swordBodyFrames = {};
    this._swordTorsoFrames = {};   // v2.3.1088: leg-erased torso strips for the sword jog-legs composite
    this._gearStrips = {};   // 'slot/item/pose/dir' -> [Texture] | 'loading' | []
    /* v2.3.916: cache-buster for the sword sheets.  Their URLs are otherwise
       constant, so a browser / edge cache (esp. on the stable branch-preview
       host) keeps serving a stale sheet after the art changes -- that's what
       made a fixed sword outline still look white on-device.  Bump this whenever
       a sword sheet is re-cut, exactly like the player-sprite VERSION. */
    const SWORD_ART_VERSION = 1099;   // 1099: sword-south/-east stand-in strips stored half-res on disk (upscaled in-loader) to shrink the download; 1098: waist re-cut at the true torso->pants boundary (pants-confirmed) so the shirtless east torso isn't chopped at a body line; 1088: leg-erased torso strips (sword jog-legs composite); 1054: fill mid-swing pants holes by copying ONLY body-colored (skin/olive) pixels from the pixel-aligned full sheets into the #132 body holes -- placement untouched (layers stay anchored, no bounce/contamination, no sword imported); residual sword-occluded strip gets a tiny olive neighbor fill; 1053: revert to clean #132 originals; 1041: metal sword north weapon strip; 951: removed baked white blade artifact
    /* v2.3.1088: jog legs drawn UNDER the sword torso (added BEFORE swordSprite). */
    this.swordJogLegsSprite = new Sprite();
    this.swordJogLegsSprite.visible = false;
    this.nodeLayer.addChild(this.swordJogLegsSprite);
    this.swordJogLegsGearSprite = new Sprite();
    this.swordJogLegsGearSprite.visible = false;
    this.nodeLayer.addChild(this.swordJogLegsGearSprite);
    this.swordSprite = new Sprite();
    this.swordSprite.anchor.set(0.5, 1);
    this.swordSprite.visible = false;
    this.nodeLayer.addChild(this.swordSprite);
    /* v2.3.948: weapon layer drawn over the armored swing body (kept separate so
       the sword stays recolorable; the armored sheet has the weapon removed). */
    this.swordChestSprite = new Sprite();
    this.swordChestSprite.anchor.set(0.5, 1);
    this.swordChestSprite.visible = false;
    this.nodeLayer.addChild(this.swordChestSprite);
    this.swordLegsSprite = new Sprite();
    this.swordLegsSprite.anchor.set(0.5, 1);
    this.swordLegsSprite.visible = false;
    this.nodeLayer.addChild(this.swordLegsSprite);
    /* v2.3.1050: tinted shirt under-layer for the swing (mirrors the idle
       paper-doll shirt in entityRenderer._placeGear); hidden whenever a chest
       piece is worn.
       v2.3.1710: moved from BEFORE the chest to AFTER the legs (owner: "while
       woodcutting and doing OTHER THINGS the shirt should be layered in front
       of the leg armor" — the swing is one of the other things).  The old
       comment's reason for the old position ("beneath any torso plate") is
       already guaranteed by _placeSwingShirt hiding the shirt outright when a
       chest piece is on, so ordering it above the plate changes nothing that
       can ever be seen. */
    this.swordShirtSprite = new Sprite();
    this.swordShirtSprite.anchor.set(0.5, 1);
    this.swordShirtSprite.visible = false;
    this.nodeLayer.addChild(this.swordShirtSprite);
    this.swordWeaponSprite = new Sprite();
    this.swordWeaponSprite.anchor.set(0.5, 1);
    this.swordWeaponSprite.visible = false;
    this.nodeLayer.addChild(this.swordWeaponSprite);
    /* v2.3.1396: painted special-swing crescent, drawn OVER the stand-in. */
    this.slashSprite = new Sprite();
    this.slashSprite.anchor.set(0.5, 0.5);
    this.slashSprite.visible = false;
    this.nodeLayer.addChild(this.slashSprite);
    /* remote players' crescents, one sprite per live special swing (keyed
       by player id; reaped in _updateRemoteSwordSwings). */
    this._remoteSlashSprites = new Map();
    const _loadSwordStrip = (target, dir, url, cfg) => {
      target[dir] = [];
      /* v2.3.1112: load via <img> + nearest-upscale to the authored frame height
         so a sheet stored downscaled-on-disk (half-res, to shrink the download)
         is restored to cfg.fh before slicing -- keeps frame widths (cfg.fw) and
         feetY/crown maths valid.  No-op for any sheet already >= cfg.fh, so the
         not-yet-downscaled facings (e.g. sword-north) pass straight through. */
      _loadImg(url + '?v=' + SWORD_ART_VERSION).then((rawImg) => {
        const img = upscaleToFrameHeight(rawImg, cfg.fh);
        const source = Texture.from(img).source;
        source.scaleMode = 'linear';
        const w = img.naturalWidth || img.width;
        const n = Math.max(1, Math.round(w / cfg.fw));
        for (let i = 0; i < n; i++) target[dir].push(new Texture({ source, frame: new Rectangle(i * cfg.fw, 0, cfg.fw, cfg.fh) }));
      }).catch((err) => console.warn('[sword ' + dir + '] load failed', err));
    };
    /* v2.3.975: the attack stand-ins must show the PLAYER'S customized body
       (skin / pants / shoes chosen at the login menu), not the authored default,
       so equipped armour sits on the real character instead of reverting to the
       default skin + olive pants during a swing or bow shot.  Recolor the bald
       body sheet with the SAME palette pipeline the normal body uses
       (recolorBodyToCanvas — identity for the default combo), cache the raw
       image, and rebake whenever the player changes their combo. */
    this._bodyStrips = [];      // [{ target, dir, url, cfg, ver }]
    this._bodyImgCache = {};    // url -> HTMLImageElement
    const _loadImg = (u) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = u; });
    this._bakeBodyStrip = (rec) => {
      const img = this._bodyImgCache[rec.url];
      if (!img) return;
      const skinT = skinTarget(getSkin()), pantsT = pantsTarget(getPants()), shoesT = shoesTarget(getShoes());
      const cv = recolorBodyToCanvas(img, skinT, pantsT, shoesT, null, rec.cfg.fh);
      const source = Texture.from(cv).source;
      source.scaleMode = 'linear';
      const n = Math.max(1, Math.round(cv.width / rec.cfg.fw));
      const arr = [];
      for (let i = 0; i < n; i++) arr.push(new Texture({ source, frame: new Rectangle(i * rec.cfg.fw, 0, rec.cfg.fw, rec.cfg.fh) }));
      rec.target[rec.dir] = arr;
    };
    const _loadRecoloredBody = (target, dir, url, cfg, ver) => {
      target[dir] = [];
      const rec = { target, dir, url, cfg, ver };
      this._bodyStrips.push(rec);
      if (this._bodyImgCache[url]) { this._bakeBodyStrip(rec); return; }
      _loadImg(url + '?v=' + ver).then((img) => { this._bodyImgCache[url] = img; this._bakeBodyStrip(rec); })
        .catch((err) => console.warn('[body ' + dir + '] load failed', err));
    };
    this._rebakeBodies = () => { for (const rec of this._bodyStrips) this._bakeBodyStrip(rec); };
    onSkinChange(this._rebakeBodies); onPantsChange(this._rebakeBodies); onShoesChange(this._rebakeBodies);
    for (const dir of Object.keys(this._swordCfg)) {
      const cfg = this._swordCfg[dir];
      _loadSwordStrip(this._swordFrames, dir, cfg.url, cfg);
      if (cfg.armorUrl)  _loadSwordStrip(this._swordArmorFrames, dir, cfg.armorUrl, cfg);
      if (cfg.weaponUrl) _loadSwordStrip(this._swordWeaponFrames, dir, cfg.weaponUrl, cfg);
      if (cfg.bodyUrl)   _loadRecoloredBody(this._swordBodyFrames, dir, cfg.bodyUrl, cfg, SWORD_ART_VERSION);
      if (cfg.torsoUrl)  _loadRecoloredBody(this._swordTorsoFrames, dir, cfg.torsoUrl, cfg, SWORD_ART_VERSION);
    }

    /* v2.3.925: bow-shoot stand-in -- same self-contained pattern as the sword
       swings, but driven by a ranged-bow shot (S._bowShotAt).  Authored sheets
       for east + southwest + south; mirror covers west + southeast.  4 frames
       each (load -> draw -> release -> follow). */
    this._bowCfg = {
      /* v2.3.932: east re-cut to the owner's arrow-free art (3 frames). */
      east:      { url: '/sprites/player/bow-east.png',      fw: 214, fh: 241, feetY: 235, crownKey: 'bow_e',  traitDir: 'east', weaponUrl: '/sprites/player/bow-east-weapon.png', bodyUrl: '/sprites/player/bow-east-body.png', torsoUrl: '/sprites/player/bow-east-torso.png', gearPose: 'bowshot' },
      /* v2.3.929: SW re-cut to the owner's arrow-free art (3 frames:
         load/pull/release -- the in-game arrow projectile draws the arrow). */
      southwest: { url: '/sprites/player/bow-southwest.png', fw: 154, fh: 233, feetY: 227, crownKey: 'bow_sw', traitDir: 'south', weaponUrl: '/sprites/player/bow-southwest-weapon.png', bodyUrl: '/sprites/player/bow-southwest-body.png', torsoUrl: '/sprites/player/bow-southwest-torso.png', gearPose: 'bowshot' },
      /* v2.3.933: south re-cut to the owner's arrow-free art (3 frames). */
      south:     { url: '/sprites/player/bow-south.png',     fw: 130, fh: 234, feetY: 228, crownKey: 'bow_s',  traitDir: 'south', weaponUrl: '/sprites/player/bow-south-weapon.png', bodyUrl: '/sprites/player/bow-south-body.png', torsoUrl: '/sprites/player/bow-south-torso.png', gearPose: 'bowshot' },
      /* v2.3.930: NW re-cut to the owner's arrow-free art (3 frames). */
      northwest: { url: '/sprites/player/bow-northwest.png', fw: 160, fh: 248, feetY: 242, crownKey: 'bow_nw', traitDir: 'north', weaponUrl: '/sprites/player/bow-northwest-weapon.png', bodyUrl: '/sprites/player/bow-northwest-body.png', torsoUrl: '/sprites/player/bow-northwest-torso.png', gearPose: 'bowshot' },
      /* v2.3.931: north re-cut to the owner's arrow-free art (3 frames). */
      north:     { url: '/sprites/player/bow-north.png',     fw: 122, fh: 260, feetY: 254, crownKey: 'bow_n',  traitDir: 'north', weaponUrl: '/sprites/player/bow-north-weapon.png', bodyUrl: '/sprites/player/bow-north-body.png', torsoUrl: '/sprites/player/bow-north-torso.png', gearPose: 'bowshot' },
    };
    this._bowFacing = {
      east:      ['east', false],
      west:      ['east', true],
      southwest: ['southwest', false],
      southeast: ['southwest', true],
      south:     ['south', false],
      northwest: ['northwest', false],
      northeast: ['northwest', true],
      north:     ['north', false],
    };
    this._bowFrames = {};
    /* v2.3.952: optional armored body + separable bow layers per facing (same
       pattern as the sword swing).  All facings authored helmeted with the bow
       removed, so the bow overlays as a recolorable layer and the hat/beard/hair
       composite is skipped (the helmet is the headwear). */
    this._bowArmorFrames = {};
    this._bowWeaponFrames = {};
    this._bowBodyFrames = {};   // v2.3.957: bald body base for the layered gear path
    this._bowTorsoFrames = {};  // v2.3.1072: leg-erased torso strips for the jog-legs composite
    const BOW_ART_VERSION = 961;   // 961: south bow "load" frame (f0) camera-left eye rebuilt from the matching right eye (was an oversized white-block sclera that read as keyed-out). 960: torso strips regenerated by the pants-confirmed waist detector (bow unchanged but 1px nw reslice). 959: torso strips re-cut at the skin->pants line (jog-legs seam). 958: bow recolored magenta->dark brown, cyan->black handle
    /* v2.3.1086: jog legs drawn UNDER the bow torso again (added BEFORE bowSprite)
       -- owner prefers the torso portion in front.  Gear after the bare legs so
       the plate sits over the bare legs. */
    this.bowJogLegsSprite = new Sprite();
    this.bowJogLegsSprite.visible = false;
    this.nodeLayer.addChild(this.bowJogLegsSprite);
    this.bowJogLegsGearSprite = new Sprite();   // worn leg armour, animated over the jog legs
    this.bowJogLegsGearSprite.visible = false;
    this.nodeLayer.addChild(this.bowJogLegsGearSprite);
    this.bowSprite = new Sprite();
    this.bowSprite.anchor.set(0.5, 1);
    this.bowSprite.visible = false;
    this.nodeLayer.addChild(this.bowSprite);
    this.bowChestSprite = new Sprite();
    this.bowChestSprite.anchor.set(0.5, 1);
    this.bowChestSprite.visible = false;
    this.nodeLayer.addChild(this.bowChestSprite);
    this.bowLegsSprite = new Sprite();
    this.bowLegsSprite.anchor.set(0.5, 1);
    this.bowLegsSprite.visible = false;
    this.nodeLayer.addChild(this.bowLegsSprite);
    /* v2.3.1050: tinted shirt under-layer for the bow shot.
       v2.3.1710: added LAST of the three so it draws in front of the leg armour
       (owner, on the shirt/greaves seam) — same reasoning and same safety as the
       sword swing above: a worn chest plate hides the shirt entirely, so only
       shirt-vs-legs was ever visible at once. */
    this.bowShirtSprite = new Sprite();
    this.bowShirtSprite.anchor.set(0.5, 1);
    this.bowShirtSprite.visible = false;
    this.nodeLayer.addChild(this.bowShirtSprite);
    this.bowWeaponSprite = new Sprite();
    this.bowWeaponSprite.anchor.set(0.5, 1);
    this.bowWeaponSprite.visible = false;
    this.nodeLayer.addChild(this.bowWeaponSprite);
    const _loadBowStrip = (target, dir, url, cfg) => {
      target[dir] = [];
      _fxLoad(url + '?v=' + BOW_ART_VERSION).then((tex) => {
        const n = Math.max(1, Math.round(tex.width / cfg.fw));
        for (let i = 0; i < n; i++) target[dir].push(new Texture({ source: tex.source, frame: new Rectangle(i * cfg.fw, 0, cfg.fw, cfg.fh) }));
      }).catch((err) => console.warn('[bow ' + dir + '] load failed', err));
    };
    for (const dir of Object.keys(this._bowCfg)) {
      const cfg = this._bowCfg[dir];
      _loadBowStrip(this._bowFrames, dir, cfg.url, cfg);
      if (cfg.armorUrl)  _loadBowStrip(this._bowArmorFrames, dir, cfg.armorUrl, cfg);
      if (cfg.weaponUrl) _loadBowStrip(this._bowWeaponFrames, dir, cfg.weaponUrl, cfg);
      if (cfg.bodyUrl)   _loadRecoloredBody(this._bowBodyFrames, dir, cfg.bodyUrl, cfg, BOW_ART_VERSION);
      if (cfg.torsoUrl)  _loadRecoloredBody(this._bowTorsoFrames, dir, cfg.torsoUrl, cfg, BOW_ART_VERSION);
    }
    /* v2.3.1080: arm-erased jog LEG sheets (jog-<dir>-legs.png) for the jog-legs
       composite -- the jog fists swung below the waist and showed as ghost hands
       beside the legs; baked sheets have the below-waist skin (fists) erased.
       Recolored to the player's combo via the same pipeline.  Keyed by MOVEMENT
       dir (the 5 source dirs), not the bow facing. */
    this._bowJogLegFrames = {};
    const JOG_LEGS_VERSION = 6;   // 6: v2.3.1456 pinhole fill (enclosed transparent speckles inpainted); 5: drop the synthetic pants-fill rectangle (lift + real pants cover the seam)
    for (const dir of ['south', 'east', 'north', 'northeast', 'southwest']) {
      _loadRecoloredBody(this._bowJogLegFrames, dir, '/sprites/player/jog-' + dir + '-legs.png', { fw: 256, fh: 256 }, JOG_LEGS_VERSION);
    }

    /* v2.3.867: the player's traits (hat / beard / hair) composited onto
       whichever skill stand-in is active (chopper / cook / fire-lighter), which
       otherwise replaces the trait-composed body.  One shared set — only one
       stand-in renders at a time.  Added after the stand-ins so they layer on
       top (hair behind hat via child order).  Per-frame head crowns come from
       crowns.json (skin-detected at build time). */
    this.skillTraits = { hair: new Sprite(), beard: new Sprite(), hat: new Sprite() };
    for (const k of ['hair', 'beard', 'hat']) {
      this.skillTraits[k].visible = false;
      this.nodeLayer.addChild(this.skillTraits[k]);
    }
    this._skillCrowns = null;
    /* v2.3.875: trait scale per stand-in = its render scale × (character height
       / the stand 182px reference), so the hat matches how it sits idle rather
       than being sized to the lumberjack's small head.  chop 166px, cook 212px,
       fire ~155px in-frame -> these multipliers. */
    this._skillTraitMul = { chop: 0.91, cook: 1.16, fire: 0.85, sword: 1.03, sword_se: 1.03, sword_e: 1.03, sword_n: 1.03, bow_e: 1.0, bow_sw: 1.0, bow_s: 1.0, bow_nw: 1.0, bow_n: 1.0 };
    /* crowns.json frame widths MUST match the strip-loading FWs above
       (chop 240, cook 213, fire 161).  If those strips are re-cut, rerun the
       crown generator with the matching widths or the traits drift off-head. */
    fetch('/sprites/skills/crowns.json').then((r) => r.json()).then((j) => { this._skillCrowns = j; }).catch(() => {});
  }

  /* ═══ v2.3.1710: THE COOK WEARS THE PLAYER'S SKIN ═══
   *
   * Owner playtest: "While Cooking character is too large (about 25%) has the
   * wrong skin color and flashing shirt."
   *
   * The wrong skin was the raw load.  cook-strip.webp is a whole pre-drawn
   * figure that REPLACES the avatar at the campfire (entityRenderer hides the
   * real body for `cooking`), and it went through plain Assets.load, so it kept
   * the artist's saturated orange (#e88838) while the avatar standing next to
   * the fire a second earlier wore #cd864b or whatever the player picked.  The
   * head TRAITS on this figure already follow the player (_placeSkillTraitsOn,
   * v2.3.867), which is what made the mismatch read as a bug rather than a
   * style: their own hat, somebody else's face.
   *
   * The recolour is skin-only + blob-guarded — see recolorStandInSkin in
   * playerSkins.js for why the shipped whole-body pipeline would have retinted
   * the frying pan and the fish in it.
   *
   * PRELOADING IS LAW (CLAUDE.md): the bake is pushed onto _fxPreload, the same
   * list _fxLoad feeds, so effectsAnimationsReady() — and therefore the intro
   * gate — waits for the RECOLOURED textures, not just for the raw download.
   * Nothing here is lazy: a first-cook hitch would be the regression TRAPS #12
   * describes. */
  _loadCookStrips() {
    _fxPreload.push(this._fetchAndBakeCook());
    /* The character menu can change the skin mid-session, so rebake on it the
       way the sword/bow stand-ins do (_rebakeBodies, v2.3.975). */
    onSkinChange(() => { this._fetchAndBakeCook(); });
  }

  /* Fetch both cook sheets, bake the player's skin in, and let the decoded
     source images go.
     THE SOURCES ARE DELIBERATELY NOT CACHED, unlike _bodyImgCache in the
     sword/bow path.  These two strips are 5112x220, i.e. ~4.5MB of decoded
     RGBA each — holding both just to make a rebake cheaper would add ~9MB of
     resident CPU memory for a menu action, on the platform whose OOM history
     is written up in spriteScale.js (v2.3.1408: iPhone Safari killing the page
     under GPU+canvas pressure).  A rebake instead re-fetches, which the HTTP
     cache serves from disk, and it happens behind the character menu — never
     mid-play, so the preloading LAW is not in tension with it. */
  _fetchAndBakeCook() {
    const load = (url) => new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = url;
    });
    return Promise.all([
      load('/sprites/skills/cook-strip.webp'),
      load('/sprites/skills/cook-strip-legless.webp'),
    ]).then(([body, legless]) => {
      this._bakeCookStrips(body, legless);
    }).catch((err) => console.warn('[cook-strip] load failed', err));
  }

  _bakeCookStrips(bodyImg, leglessImg) {
    /* skinTarget() returns null for the 'default' pick, which for the PLAYER
       sheets means "the art is already this colour".  It is not true of this
       painting, so default falls back to the explicit tan — that is the whole
       point of the fix for anyone who never opened the skin picker. */
    const skinT = skinTarget(getSkin()) || DEFAULT_SKIN_TARGET;
    const FW = 213, FH = 220;
    for (const [key, img] of [['_cookFrames', bodyImg], ['_cookLeglessFrames', leglessImg]]) {
      const cv = recolorStandInSkin(img, skinT, FH);
      const source = Texture.from(cv).source;
      source.scaleMode = 'linear';
      const n = Math.max(1, Math.round(cv.width / FW));
      const arr = [];
      for (let i = 0; i < n; i++) arr.push(new Texture({ source, frame: new Rectangle(i * FW, 0, FW, FH) }));
      this[key] = arr;
    }
  }

  /* Composite the player's traits onto a stand-in skill sprite for this frame.
     sp = the stand-in Sprite (anchor 0.5,1); fi = its current frame index;
     dir/mirror = trait facing; the crown world pos is derived from sp's own
     transform + the per-frame crown, and the trait scale from the stand-in's
     render scale × head proportion so the hat matches the head size. */
  _placeSkillTraitsOn(skillKey, sp, fi, dir, mirror) {
    const data = this._skillCrowns && this._skillCrowns[skillKey];
    if (!data || !data.crowns.length) { hideSkillTraits(this.skillTraits); return; }
    const cr = data.crowns[Math.min(fi, data.crowns.length - 1)];
    if (!cr) { hideSkillTraits(this.skillTraits); return; }
    const cwx = sp.x + (cr[0] - data.fw / 2) * sp.scale.x;
    const cwy = sp.y + (cr[1] - data.fh) * sp.scale.y;
    const scaleVal = Math.abs(sp.scale.y) * (this._skillTraitMul[skillKey] || 1);
    placeSkillTraits(this.skillTraits, cwx, cwy, dir, mirror, scaleVal);
  }

  /**
   * Updates all effects for the current frame.
   */
  update(S, viewW, viewH, now) {
    /* v2.3.867: hide the skill-stand-in traits up front; whichever stand-in is
       active this frame (firemaking / chopper / cook) re-shows + places them. */
    hideSkillTraits(this.skillTraits);
    this._updateParticles(S, now);
    this._updateDamageNumbers(S, now);
    this._updateCatchFlights(S, viewW, viewH, now);
    this._updateFxBursts(S, now);   /* v2.3.1443 */
    this._updateScreenFlash(S, viewW, viewH, now);
    this._updateAtmosphere(S, viewW, viewH, now);
    this._updateGroundLoot(S, now);
    this._updateGroundSplatter(S);
    this._updateGatherNodes(S, now);
    this._updateMonsterImpacts(S, now);
    this._updateCampfire(S, now);
    this._updateFiremaking(S, now);
    this._updateSwordSwing(S, now);
    this._updateBowShot(S, now);
    /* v2.3.1011: remote attack stand-ins are new + were authored without a
       runtime here -- guard them so a render error can only drop the stand-in,
       never white-screen the frame. */
    try { this._updateRemoteSwordSwings(S, now); } catch (e) { /* skip stand-in */ }
    try { this._updateRemoteBowShots(S, now); } catch (e) { /* skip stand-in */ }
    this._updateFishingHole(S, now);
    this._updateExtractionCue(S, now);
    /* v2.3.1092: full-character harvest stand-ins for OTHER players
       (chop/cook/fire). Guarded like the remote attack stand-ins. */
    try { this._updateRemoteExtraction(S, now); } catch (e) { /* skip remote skill stand-in */ }
    this._updateProjectiles(S, now);
    this._updateTelegraphs(S, now);
    this._updateOverlays(S, now);
    this._updateHUD(S, viewW, viewH, now);
  }

  /* ── Particles ── */
  _updateParticles(S, now) {
    const gfx = this.particleGfx;
    gfx.clear();

    /* v2.3.1674 (owner: "remove the glowing ring around the character").
       The World View player beacon is GONE.  History, so nobody re-adds it by
       accident: v2.3.1360 added it because the avatar reads as a distant
       speck on the overworld, v2.3.1361 made it a crisp reticle, v2.3.1410
       softened it to a ring of light.  Three rounds of tuning and the answer
       is that the overworld is a painted vista and the ring sat on top of it
       as UI.  The avatar is still findable: it is the only thing that moves,
       and the same v2.3.1674 pass halves worldview speed so it no longer
       streaks across the map.  If it ever needs marking again, mark it in the
       art, not with a stroked circle. */

    // Hit particles
    const parts = S.hitParticles || [];
    /* v2.3.1347: hard ceiling — burning-monster status FX (and any other
       runaway spawner) could grow this without bound and tank the frame
       rate. Particles are plain data drawn into the shared Graphics (no
       per-particle Pixi object), so dropping the oldest is safe. */
    if (parts.length > 400) parts.splice(0, parts.length - 400);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      if (isNaN(p.x) || isNaN(p.y)) { parts.splice(i, 1); continue; }
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15;
      p.life -= 0.04;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      gfx.circle(p.x, p.y, (p.size || 2) * Math.min(1, p.life * 3));
      gfx.fill({ color: cssToHex(p.color), alpha: Math.min(1, p.life * 2) });
    }

    // Death explosion particles
    const explosions = S.deathExplosions || [];
    for (let i = explosions.length - 1; i >= 0; i--) {
      const exp = explosions[i];
      const age = (now - exp.ts) / 1000;
      if (age > 2) { explosions.splice(i, 1); continue; }
      const expParts = exp.particles || [];
      for (const p of expParts) {
        if (isNaN(p.vx) || isNaN(p.vy)) continue;
        const px = exp.x + p.vx * age * 60;
        const py = exp.y + p.vy * age * 60 + age * age * 30;
        const pAlpha = Math.max(0, 1 - age / (p.life || 1));
        if (pAlpha <= 0) continue;
        gfx.circle(px, py, (p.size || 2) * pAlpha);
        gfx.fill({ color: cssToHex(p.color), alpha: pAlpha });
      }
    }

    // Impact rings
    if (S._impactRings) {
      for (let i = S._impactRings.length - 1; i >= 0; i--) {
        const ring = S._impactRings[i];
        const age = (now - ring.ts) / (ring.duration || 400);
        if (age >= 1) continue;
        const radius = (ring.maxR || 15) * (0.5 + age);
        gfx.circle(ring.x, ring.y, radius);
        gfx.stroke({ color: cssToHex(ring.color || '#ffffff'), width: (1 - age) * 3, alpha: (1 - age) * 0.6 });
      }
    }

    // Dust puffs
    const dust = S._dustPuffs || [];
    for (let i = dust.length - 1; i >= 0; i--) {
      const d = dust[i];
      if (isNaN(d.x) || isNaN(d.y)) { dust.splice(i, 1); continue; }
      d.x += d.vx; d.y += d.vy;
      d.life -= d.decay;
      if (d.life <= 0) { dust.splice(i, 1); continue; }
      gfx.circle(d.x, d.y, d.life * 3);
      gfx.fill({ color: 0xb4aa8c, alpha: d.life * 0.4 });
    }

    // Ambient particles (zone-specific)
    const ambient = S._ambientParticles || [];
    for (let i = ambient.length - 1; i >= 0; i--) {
      const ap = ambient[i];
      ap.x += ap.vx; ap.y += ap.vy;
      ap.life -= 0.01;
      if (ap.life <= 0) { ambient.splice(i, 1); continue; }
      const alpha = Math.min(0.6, ap.life);
      gfx.circle(ap.x, ap.y, ap.size || 1.5);
      gfx.fill({ color: cssToHex(ap.color || '#ffffff'), alpha });
    }

    // Dodge trail afterimages
    const trail = S._dodgeTrail || [];
    for (let i = trail.length - 1; i >= 0; i--) {
      const ghost = trail[i];
      const age = (now - ghost.ts) / 200;
      if (age >= 1) { trail.splice(i, 1); continue; }
      gfx.circle(ghost.x, ghost.y, 8);
      gfx.fill({ color: 0x3498db, alpha: (1 - age) * 0.3 });
    }

    // v2.3.1011: remote players' dodge/lunge/retreat afterimage trail (MP
    // parity).  Driven by the `player_dodge` broadcast -> other._dodgeRoll;
    // we synthesize the same blue smear along their dodge path.
    if (S.others) {
      for (const oid in S.others) {
        const o = S.others[oid];
        if (!o || !o._dodgeRoll) continue;
        const dage = now - (o._dodgeRoll.startTime || 0);
        if (dage > 400) { o._dodgeRoll = null; o._dodgeTrail = null; continue; }
        if (!o._dodgeTrail) o._dodgeTrail = [];
        const ox = (o.renderX != null) ? o.renderX : o.x;
        const oy = (o.renderY != null) ? o.renderY : o.y;
        o._dodgeTrail.push({ x: ox, y: oy, ts: now });
        const ot = o._dodgeTrail;
        for (let i = ot.length - 1; i >= 0; i--) {
          const g = ot[i];
          const age = (now - g.ts) / 200;
          if (age >= 1) { ot.splice(i, 1); continue; }
          gfx.circle(g.x, g.y, 8);
          gfx.fill({ color: 0x3498db, alpha: (1 - age) * 0.3 });
        }
      }
    }

    // General particles (fireflies/pollen)
    if (S._particles) {
      const isNight = S._dayNightCache?.isNight || false;
      for (const p of S._particles) {
        if (isNight) {
          const glow = Math.sin(now / 400 + p.phase) * 0.5 + 0.5;
          gfx.circle(p.x, p.y, p.size);
          gfx.fill({ color: 0xc8ff64, alpha: glow * 0.6 });
        } else {
          const a = Math.sin(now / 600 + p.phase) * 0.3 + 0.3;
          gfx.circle(p.x, p.y, p.size * 0.7);
          gfx.fill({ color: 0xffffc8, alpha: a });
        }
      }
    }
  }

  /* ── Damage Numbers ── */
  _updateDamageNumbers(S, now) {
    const numbers = S.dmgNumbers || [];
    /* No pre-pruning of this.dmgTexts.  The previous shift+destroy loop
       killed the oldest Text but left the matching dmg._pixiText back-
       reference pointing at a destroyed object — next frame's
       `text.x = dmg.x` blew up with `null is not an object (evaluating
       'this._position.x=e')` (a Pixi v8 internal accessor on destroyed
       Text).  Age-based cleanup below (1.5 s TTL) handles bounding by
       itself; with reasonable spawn rates we never hold more than a few
       dozen dmg numbers concurrently. */
    for (let i = numbers.length - 1; i >= 0; i--) {
      const dmg = numbers[i];
      const age = (now - dmg.ts) / 1000;
      const ttl = dmg.ttl || 1.5;
      if (age > ttl) {
        if (dmg._pixiText && !dmg._pixiText.destroyed) { dmg._pixiText.destroy(); }
        if (dmg._pixiIcon && !dmg._pixiIcon.destroyed) { dmg._pixiIcon.destroy(); }
        if (dmg._pixiSub  && !dmg._pixiSub.destroyed)  { dmg._pixiSub.destroy(); }
        dmg._pixiText = null;
        dmg._pixiIcon = null;
        dmg._pixiSub  = null;
        numbers.splice(i, 1);
        continue;
      }
      /* Defensive: treat a destroyed Text as missing and rebuild.
         Catches the case where some other path (e.g. zone change clear)
         destroyed the Text while the dmg entry was still alive. */
      if (dmg._pixiText && dmg._pixiText.destroyed) {
        dmg._pixiText = null;
      }
      if (dmg._pixiIcon && dmg._pixiIcon.destroyed) {
        dmg._pixiIcon = null;
      }
      if (dmg._pixiSub && dmg._pixiSub.destroyed) {
        dmg._pixiSub = null;
      }
      if (!dmg._pixiText) {
        /* Pick the emoji-safe style when text contains non-ASCII to
           avoid the iOS Safari WebGL emoji-stroke crash. */
        const baseStyle = isAsciiOnly(dmg.text) ? DMG_STYLE : DMG_STYLE_EMOJI;
        /* Categorize popup by structure (ASCII-only patterns):
             damage  = optional non-letter prefix then optional dash and digits
             xp      = "+N XP"
             gold    = "+N G"
           Centralized here so the 40+ push sites don't each need recoloring. */
        const t = dmg.text || '';
        let displayColor = dmg.color || '#ffffff';
        if (/^[^A-Za-z+]*-?\d+$/.test(t)) {
          /* v2.3.103 user request: combat damage in white reads more
             clearly than the previous orange (#ff8c1a) against most
             zone backgrounds.  Push sites still pass their own
             dmg.color for crits / specials / status tints, but the
             generic damage pattern wins here so the bulk of fight
             popups are uniformly white. */
          displayColor = '#ffffff';
        } else if (/^\+\d+\s*XP$/.test(t)) {
          displayColor = '#60a5fa';
        } else if (/^\+\d+\s*G$/.test(t)) {
          displayColor = '#f5c542';
        }
        /* Anti-overlap: separate a new popup from nearby live ones so
           kill-shot popups (damage, XP, gold spawned in one frame at
           slightly different Y) don't visually overlap. We compute a
           target Y rather than adding a fixed offset, because the spawn
           Ys differ.

           v2.3.1638 — STACK UPWARD, AND NEVER BELOW SPAWN.  This is the
           real fix for "damage numbers appear over the monster HP
           number", reported three times.  The previous two fixes both
           raised the SPAWN clearance in entityRenderer
           (_popupTopOff: 24 -> 40 in v2.3.1402, 40 -> 62 in v2.3.1403)
           and the owner kept seeing it, because the spawn was never the
           mechanism — THIS loop was.  It placed each new popup
           SPACING px BELOW the lowest live neighbour, i.e. walking the
           stack back DOWN toward the bar it had just been raised above.
           A neighbour qualifies while it is within 50 px of the spawn Y,
           so the worst-case placement was spawn + 50 + 26 = spawn + 76 —
           and with only 62 px of clearance that lands 14 px past the bar's
           top edge, right on the centred HP number (bar is 44x13).  That
           is why sustained fights overlapped and single hits didn't, and
           why each clearance bump reduced the overlap (52 -> 36 -> 14 px
           past the bar) without ever removing it.
           Stacking AWAY from the monster fixes it structurally: the
           Math.min(0, ...) clamp makes _stackOffset provably <= 0, and
           since the float only ever subtracts (age * 40), a popup can now
           never render below its spawn Y.  The clearance in
           entityRenderer.js is therefore a true floor rather than a
           starting point, and no future clearance bump can be eaten. */
        const SPACING = 26;
        let highestY = Infinity;
        let hasNeighbor = false;
        /* v2.3.1347: the neighbor scan is O(n) per NEW popup (O(n²) in a
           burst). Past ~40 live popups the field is dense chaos where
           stacking placement is unreadable anyway — skip the scan and
           take the raw spawn position. */
        for (let j = 0; numbers.length <= 40 && j < numbers.length; j++) {
          if (j === i) continue;
          const o = numbers[j];
          if (!o._pixiText || o._pixiText.destroyed) continue;
          if (Math.abs(o.x - dmg.x) > 60) continue;
          const oAge = (now - o.ts) / 1000;
          if (oAge > 0.6) continue;
          const oY = o.y + (o._stackOffset || 0) - oAge * 40;
          if (Math.abs(oY - dmg.y) > 50) continue;
          hasNeighbor = true;
          if (oY < highestY) highestY = oY;
        }
        /* Clamp to <= 0: a neighbour sitting BELOW this popup's spawn
           would otherwise push the offset positive and re-open the exact
           hole this fix closes. */
        dmg._stackOffset = hasNeighbor ? Math.min(0, (highestY - SPACING) - dmg.y) : 0;
        const baseFontSize = dmg.crit ? 27 : 21;
        /* Special-attack hits used to render at 2x to read as "heavy", but
           that crowded the screen and hid the normal-hit cadence. They now
           match normal size and instead get a bright outer glow (see
           dropShadow below) to mark them as specials. */
        const fontSize = baseFontSize;
        /* v2.3.1357: plain popups (no emoji, no special halo, chars inside
           the baked set) assemble from the pre-baked glyph atlas instead of
           rasterizing a fresh canvas — the pack-fight frame killer.  Tint
           colors the white fill; the black stroke stays black (0 x tint). */
        let text = null;
        if (_dmgBmpReady && !dmg.special && baseStyle === DMG_STYLE && DMG_BMP_RE.test(dmg.text || '')) {
          /* v2.3.1361: defensive — if the BitmapText pipe ever throws
             (fire-goblin crash hardening), downgrade to classic Text
             PERMANENTLY for the session instead of taking the whole
             frame down on every subsequent popup. */
          try {
            text = new BitmapText({
              text: dmg.text,
              style: { fontFamily: DMG_BMP_FONT, fontSize: DMG_BMP_BAKE_PX },
            });
            /* Bake is 2x — scale down to the popup size (crisp on retina).
               NOTE the spawn-pop animation below multiplies .scale; stash
               the base so it scales around this, not around 1. */
            text._bmpBaseScale = fontSize / DMG_BMP_BAKE_PX;
            text.scale.set(text._bmpBaseScale, text._bmpBaseScale);
            text.tint = displayColor;
          } catch (e) {
            _dmgBmpReady = false;
            if (text) { try { text.destroy(); } catch (e2) { /* best-effort */ } }
            text = null;
          }
        }
        if (!text) {
          const textStyle = { ...baseStyle, fontSize, fill: displayColor };
          if (dmg.special) {
            /* distance:0 + high blur = even halo on all sides. Warm yellow
               matches the special-projectile yellow halo. */
            textStyle.dropShadow = {
              color: '#ffe066',
              alpha: 0.95,
              blur: 8,
              distance: 0,
              angle: 0,
            };
          }
          text = new Text({
            text: dmg.text,
            style: textStyle,
          });
          /* Pixi v8 TextStyle stores fields privately; the spread above may drop
             overrides. Set fill and fontSize explicitly to guarantee they apply. */
          text.style.fill = displayColor;
          text.style.fontSize = fontSize;
          if (dmg.special) {
            text.style.dropShadow = {
              color: '#ffe066',
              alpha: 0.95,
              blur: 8,
              distance: 0,
              angle: 0,
            };
          }
        }
        text.anchor.set(0.5, 0.5);
        this.dmgLayer.addChild(text);
        this.dmgTexts.push(text);
        dmg._pixiText = text;
        /* Icon: explicit dmg.iconKey wins; otherwise fall back to detecting
           gold from text pattern. Damage popups need an explicit iconKey
           because the text alone doesn't tell us the weapon type. */
        let iconKey = dmg.iconKey;
        if (!iconKey) {
          if (/^\+\d+\s*G$/.test(t)) iconKey = 'gold';
        }
        if (iconKey && POPUP_ICONS[iconKey]) {
          const tex = POPUP_ICONS[iconKey];
          const icon = new Sprite(tex);
          icon.anchor.set(0, 0.5);
          const targetH = Math.min(fontSize, 22);
          icon.scale.set(targetH / tex.height);
          this.dmgLayer.addChild(icon);
          dmg._pixiIcon = icon;
        }
        /* Optional muted-gray suffix Text drawn on the same line as the
           main number (e.g. "11" with "block 14" after it for mitigated
           hits).  Smaller font + #888 fill gives a secondary read without
           a second popup floating separately. */
        if (dmg.subText) {
          const subSize = Math.max(11, Math.round(fontSize * 0.65));
          const sub = new Text({
            text: dmg.subText,
            style: { ...baseStyle, fontSize: subSize, fill: '#888' },
          });
          sub.style.fill = '#888';
          sub.style.fontSize = subSize;
          sub.anchor.set(0, 0.5);
          this.dmgLayer.addChild(sub);
          this.dmgTexts.push(sub);
          dmg._pixiSub = sub;
        }
      }
      const text = dmg._pixiText;
      text.x = dmg.x;
      text.y = dmg.y + (dmg._stackOffset || 0) - age * 40;
      /* Fade over 80% of ttl so longer-lived popups (kill messages with
         ttl=2.5) actually stay visible, not invisible most of their life. */
      text.alpha = Math.max(0, 1 - age / (ttl * 0.8));
      /* Spawn pop: scale 1.6 -> 1.0 over 120ms (ease-out) so the number
         visibly punches in on the first hit, then settles. Crit wiggle
         layers on top after the pop has decayed. */
      const POP_DUR = 0.12;
      const POP_AMOUNT = 0.6;
      let popBoost = 0;
      if (age < POP_DUR) {
        const t = 1 - age / POP_DUR;
        popBoost = POP_AMOUNT * t * t;
      }
      const critWiggle = dmg.crit ? Math.sin(age * 8) * 0.1 : 0;
      /* v2.3.1357: BitmapText popups render at a 2x bake scaled down —
         the pop/wiggle multiplies AROUND that base scale, not around 1. */
      text.scale.set((text._bmpBaseScale || 1) * (1 + popBoost + critWiggle));
      if (dmg._pixiIcon && !dmg._pixiIcon.destroyed) {
        /* Place icon flush to the right of the text. Text anchor is
           (0.5, 0.5), so the right edge sits at text.x + text.width/2.
           Gap scales with fontSize.  Min 10 px because the prior 4 px
           floor still let the magic icon clip the last digit on
           fire-goblin hits ("32" reading as "3[magic]").  Stroked text
           extends a few px past text.width on iOS canvas rendering. */
        const _iconGap = Math.max(10, (dmg.crit ? 27 : 21) * 0.35);
        dmg._pixiIcon.x = text.x + text.width / 2 + _iconGap;
        dmg._pixiIcon.y = text.y;
        dmg._pixiIcon.alpha = text.alpha;
      }
      if (dmg._pixiSub && !dmg._pixiSub.destroyed) {
        /* Sub text sits after the icon if there is one, otherwise flush
           to the right edge of the main text.  Anchor is (0, 0.5) so
           setting .x places its left edge. */
        const _subGap = Math.max(10, (text.style.fontSize || 21) * 0.35);
        let subX = text.x + text.width / 2 + _subGap;
        if (dmg._pixiIcon && !dmg._pixiIcon.destroyed) {
          subX = dmg._pixiIcon.x + (dmg._pixiIcon.width || 0) + _subGap;
        }
        dmg._pixiSub.x = subX;
        dmg._pixiSub.y = text.y;
        dmg._pixiSub.alpha = text.alpha;
        dmg._pixiSub.scale.set(text.scale.x);
      }
    }
    /* Compact dmgTexts: drop refs to destroyed Text instances
       (destroyed during age expiry above).  Keeps the array bounded
       without the dangerous shift+destroy from before. */
    if (this.dmgTexts.length > 0) {
      let w = 0;
      for (let r = 0; r < this.dmgTexts.length; r++) {
        const t = this.dmgTexts[r];
        if (t && !t.destroyed) {
          if (w !== r) this.dmgTexts[w] = t;
          w++;
        }
      }
      if (w !== this.dmgTexts.length) this.dmgTexts.length = w;
    }
  }

  /* ── Screen Flashes ── */
  _updateScreenFlash(S, viewW, viewH, now) {
    const gfx = this.flashOverlay;
    gfx.clear();

    if (S._damageFlash && now - S._damageFlash < 200) {
      const age = (now - S._damageFlash) / 200;
      gfx.rect(0, 0, viewW, viewH);
      gfx.fill({ color: 0xff0000, alpha: (1 - age) * 0.3 });
    }
    if (S._blockFlash && now - S._blockFlash < 200) {
      const age = (now - S._blockFlash) / 200;
      gfx.rect(0, 0, viewW, viewH);
      gfx.fill({ color: 0x60a5fa, alpha: (1 - age) * 0.12 });
    }
    if (S.rpg && S.rpg.hp > 0 && S.rpg.hp / S.rpg.maxHp < 0.25) {
      const pulse = Math.sin(now / 300) * 0.5 + 0.5;
      gfx.rect(0, 0, viewW, viewH);
      gfx.fill({ color: 0xff0000, alpha: pulse * 0.12 });
    }
    if (S._levelUpFlash && now - S._levelUpFlash < 800) {
      const age = (now - S._levelUpFlash) / 800;
      gfx.rect(0, 0, viewW, viewH);
      gfx.fill({ color: 0xf5c542, alpha: (1 - age) * 0.25 });
    }
    if (S._deathFlash && now - S._deathFlash < 500) {
      const age = (now - S._deathFlash) / 500;
      gfx.rect(0, 0, viewW, viewH);
      gfx.fill({ color: 0x000000, alpha: (1 - age) * 0.6 });
    }
    if (S._zoneWipe) {
      const w = S._zoneWipe;
      const age = (now - w.ts) / (w.duration || 800);
      if (age < 1) {
        const alpha = age < 0.5 ? age * 2 : (1 - age) * 2;
        const zone = ZONES[w.toZone || S.currentZone];
        const elem = zone?.element;
        const color = elem && ELEMENTS[elem] ? cssToHex(ELEMENTS[elem].color) : 0x000000;
        gfx.rect(0, 0, viewW, viewH);
        gfx.fill({ color, alpha: Math.min(1, alpha) });
      }
    }
  }

  /* ── Atmosphere ── */
  _updateAtmosphere(S, viewW, viewH, now) {
    const gfx = this.atmosphereGfx;
    gfx.clear();

    const zone = ZONES[S.currentZone];
    if (zone?.atmosphere) {
      if (zone.atmosphere.tint) {
        gfx.rect(0, 0, viewW, viewH);
        gfx.fill({ color: 0x000000, alpha: 0.05 });
      }
      if (zone.atmosphere.vignette) {
        gfx.rect(0, 0, viewW, 30);
        gfx.fill({ color: 0x000000, alpha: 0.1 });
        /* v2.3.1239: owner feedback — the BOTTOM vignette strip is removed.
           The atmosphere layer is screen-space and the world canvas ends at
           bottom:var(--dash-h) (butted against the BottomDashboard), so this
           30px-tall 10%-black band sat directly on the dashboard's top edge
           and read as a faint gray "phantom XP bar" hovering above the band —
           the SECOND source of the bar the v2.3.1238 boxShadow removal killed
           in town (it only reappeared in zones with atmosphere.vignette, i.e.
           outside town; pixel-probed and confirmed by isolating this layer).
           The TOP vignette stays: it darkens the real top screen edge (sky
           framing) and is nowhere near the dashboard. */
      }
    }
    if (S._dayNightCache?.nightAlpha > 0) {
      const isNight = S._dayNightCache.isNight;
      const color = isNight ? 0x0a0a28 : 0x28140a;
      gfx.rect(0, 0, viewW, viewH);
      gfx.fill({ color, alpha: S._dayNightCache.nightAlpha });
    }

    // Depth darkness
    const depth = S._currentDepth;
    if (depth && depth !== 'shallow' && S.currentZone !== 'town') {
      const depthAlpha = { mid: 0.1, deep: 0.2, abyss: 0.35, core: 0.5 }[depth] || 0;
      if (depthAlpha > 0) {
        gfx.rect(0, 0, viewW, viewH);
        gfx.fill({ color: 0x000000, alpha: depthAlpha });
      }
    }
  }

  /* ── Projectiles (arrows, staff bolts, remote) ── */
  _updateProjectiles(S, now) {
    const gfx = this.projectileGfx;
    gfx.clear();

    /* Track aim rotation rate for the mid-flight arrow bend.  Arrows
       lean slightly in the direction the player is currently rotating
       their aim — a visual flourish that hints at "tracking" motion. */
    if (S._aimAngle != null) {
      if (this._lastAimAngle != null) {
        let d = S._aimAngle - this._lastAimAngle;
        // Wrap to [-π, π] so a 359°→1° tick doesn't read as a -358° spin.
        while (d > Math.PI)  d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        // Smooth so single-frame jitter doesn't whiplash the bend.
        this._aimRate = (this._aimRate || 0) * 0.7 + d * 0.3;
      }
      this._lastAimAngle = S._aimAngle;
    } else {
      this._aimRate = 0;
    }
    /* Cap and scale — visible bend up to ~20° at fast aim sweeps,
       zero when standing still.  Negative because a clockwise sweep
       (positive d in screen-y-down) should bend the arrow CCW for a
       trailing-tail effect. */
    const bend = -Math.max(-0.6, Math.min(0.6, (this._aimRate || 0) * 6));

    /* v2.3.1334: live set for painted magic-bolt sprites (local +
       remote); anything not re-added this frame is reaped below. */
    const _liveBolts = new Set();

    // Local arrows
    const arrows = S.arrows || [];
    for (const a of arrows) {
      if (!a._renderX) continue;
      const elemColor = a._projElem && ELEMENTS[a._projElem] ? cssToHex(ELEMENTS[a._projElem].color) : 0xc8c8d0;
      const fadeA = Math.min(1, a.life / 20);
      /* v2.3.1095: a planted/falling arrow is stuck in the world -- no motion
         trail, and it ignores the live aim-bend so it sits rock-steady.
         v2.3.1425/1426: a special stuck in a monster (a.stuckIn — the
         bow special arrow since v2.3.1426) is the same pose. */
      const _stuckPose = a.planted || a.planting || a.stuckIn;
      const _angB = a.ang + (_stuckPose ? 0 : bend);

      /* Motion-blur trail — push the current position into a small
         ring buffer per arrow, then draw fading line segments back
         through the history.  Older segments are thinner + more
         transparent, so the eye reads the trail as a single linear
         streak that visually extends the arrow's path.
         Stuck arrows / hit arrows don't need this.
         Bow heavy attacks (isSpecial without _isStaffProj) keep the
         arrow trail style — the orb trail belongs to staff/ice.
         v2.3.1334: the basic staff bolt's painted sprite carries its
         own wisp tail — no line trail on top of it. */
      const _isBasicStaffBolt = a._isStaffProj && !a.isSpecial && !a.ice;
      const isBowHeavy = a.isSpecial && !a._isStaffProj && !a.ice;
      /* v2.3.1396: `ice: true` is set on EVERY staff special (it is the
         legacy "draw as orb" toggle, not the element — see the bow-heavy
         comment in playerActions.js), so it must NOT exclude the painted
         orb.  All staff specials share the charged-orb art regardless of
         element. */
      const _isStaffSpecial = a._isStaffProj && a.isSpecial;
      /* v2.3.1396: painted special art carries its own flame/wisp tail —
         skip the line trail exactly like the basic bolt's art does. */
      const _paintedSpecial = (isBowHeavy && ARROW_SPECIAL.frames.length)
        || (_isStaffSpecial && MAGIC_SPECIAL.frames.length);
      if (!_stuckPose && !(_isBasicStaffBolt && MAGIC_BOLT_FRAMES.length) && !_paintedSpecial) {
        this._updateProjectileTrail(a, gfx, fadeA, /* isStaffProj */ a._isStaffProj || a.ice);
      }

      if (isBowHeavy && ARROW_SPECIAL.frames.length) {
        /* v2.3.1396: painted charged arrow (owner sheet) — golden flame
           wrap baked into the art, so the halo circles retire. */
        this._placeSpecialFx(ARROW_SPECIAL, a, a._renderX, a._renderY, _angB, fadeA, now, _liveBolts);
      } else if (isBowHeavy) {
        /* Heavy bow shot — draw the arrow normally with a bright
           element-tinted halo around it.  Reads as a powered shot
           (clearly distinct from a regular arrow) without hiding the
           arrow itself in an orb.  v2.3.222: 3x scale per user
           request so the special bow shot reads as much heavier and
           its damage radius matches the visual.
           v2.3.1396: fallback while the painted strip loads. */
        gfx.circle(a._renderX, a._renderY, 39);
        gfx.fill({ color: 0xf5c542, alpha: fadeA * 0.25 });
        gfx.circle(a._renderX, a._renderY, 27);
        gfx.fill({ color: elemColor, alpha: fadeA * 0.45 });
        gfx.circle(a._renderX, a._renderY, 15);
        gfx.fill({ color: 0xfff2a8, alpha: fadeA * 0.55 });
        this._drawArrow(gfx, a._renderX, a._renderY, _angB, elemColor, fadeA, 3);
      } else if (_isStaffSpecial && MAGIC_SPECIAL.frames.length) {
        /* v2.3.1396: painted charged orb (owner sheet) — golden power
           halo baked into the art; the ring draw below stays as the
           pre-load fallback (and for non-staff ice projectiles). */
        this._placeSpecialFx(MAGIC_SPECIAL, a, a._renderX, a._renderY, a.ang, fadeA, now, _liveBolts);
      } else if (a.isSpecial || a.ice) {
        /* Staff special / ice — bigger yellow glow ring so specials
           read as distinct from regular projectiles. Three concentric
           circles:
            – outer yellow halo for the "special" tell
            – mid element-tinted glow
            – bright element-tinted core */
        const sz = a._isStaffProj ? 2.0 : 1.6;
        gfx.circle(a._renderX, a._renderY, 16 * sz);
        gfx.fill({ color: 0xf5c542, alpha: fadeA * 0.22 });
        gfx.circle(a._renderX, a._renderY, 12 * sz);
        gfx.fill({ color: elemColor, alpha: fadeA * 0.35 });
        gfx.circle(a._renderX, a._renderY, 7 * sz);
        gfx.fill({ color: elemColor, alpha: fadeA * 0.9 });
        gfx.circle(a._renderX, a._renderY, 7 * sz);
        gfx.stroke({ color: 0xfff2a8, width: 1.5, alpha: fadeA * 0.85 });
      } else if (a._isStaffProj) {
        /* v2.3.1334: painted 4-frame magic bolt (owner sheet).  The
           tail always points back toward the caster: rotation = the
           travel angle, art noses right.  Falls back to the old
           two-circle draw until the strip loads. */
        if (MAGIC_BOLT_FRAMES.length) {
          this._placeMagicBolt(a, a._renderX, a._renderY, a.ang, fadeA, now, _liveBolts);
        } else {
          gfx.circle(a._renderX, a._renderY, 5);
          gfx.fill({ color: elemColor, alpha: fadeA * 0.8 });
          gfx.circle(a._renderX, a._renderY, 9);
          gfx.fill({ color: elemColor, alpha: fadeA * 0.2 });
        }
      } else {
        /* Detailed arrow — wooden shaft + colored arrowhead +
           colored fletching.  Drawn rotated so the math is
           local-coords-friendly.  ang_eff = a.ang + bend so arrows
           in flight visibly tilt in the direction the player is
           rotating their aim. */
        this._drawArrow(gfx, a._renderX, a._renderY, _angB, elemColor, fadeA);
      }
    }

    /* Stuck arrows — embedded in monster bodies after a hit.  Drawn
       half-length per the Canvas 2D path (BroTown.jsx ~11756). */
    const monsters = S.monsters || [];
    for (const m of monsters) {
      if (!m || !m._stuckArrows || !m._stuckArrows.length) continue;
      for (const sa of m._stuckArrows) {
        const sx = m.x + (sa.ox || 0);
        const sy = m.y + (sa.oy || 0);
        const color = (sa.color && cssToHex(sa.color)) || 0x8b6914;
        if (sa.isStaff) {
          this._drawStuckMagicShard(gfx, sx, sy, sa.ang, color);
        } else {
          this._drawStuckArrow(gfx, sx, sy, sa.ang, color);
        }
      }
    }

    // Remote projectiles
    const remote = S._remoteProjectiles || [];
    for (const rp of remote) {
      if (!rp._renderX) continue;
      /* v2.3.1334: basic remote staff bolts share the painted sprite
         (and skip the line trail — the art carries its own tail).
         v2.3.1396: remote SPECIALS share the painted special art too. */
      const _remoteBasicBolt = rp.isStaff && !rp.isSpecial && MAGIC_BOLT_FRAMES.length;
      const _remoteMagicSpec = rp.isStaff && rp.isSpecial && MAGIC_SPECIAL.frames.length;
      const _remoteArrowSpec = !rp.isStaff && rp.isSpecial && ARROW_SPECIAL.frames.length;
      if (!_remoteBasicBolt && !_remoteMagicSpec && !_remoteArrowSpec) this._updateProjectileTrail(rp, gfx, 1.0, !!rp.isStaff);
      if (rp.isStaff) {
        if (_remoteMagicSpec) {
          this._placeSpecialFx(MAGIC_SPECIAL, rp, rp._renderX, rp._renderY, rp.ang, 0.95, now, _liveBolts);
        } else if (_remoteBasicBolt) {
          this._placeMagicBolt(rp, rp._renderX, rp._renderY, rp.ang, 0.95, now, _liveBolts);
        } else {
          /* v2.3.840: special staff bolts read bigger + golden with a halo. */
          gfx.circle(rp._renderX, rp._renderY, rp.isSpecial ? 7 : 4);
          gfx.fill({ color: rp.isSpecial ? 0xf5c542 : 0xa855f7, alpha: rp.isSpecial ? 0.95 : 0.8 });
          if (rp.isSpecial) { gfx.circle(rp._renderX, rp._renderY, 11); gfx.stroke({ color: 0xfff2a8, width: 2, alpha: 0.6 }); }
        }
      } else if (_remoteArrowSpec) {
        this._placeSpecialFx(ARROW_SPECIAL, rp, rp._renderX, rp._renderY, rp.ang + bend, 1.0, now, _liveBolts);
      } else {
        this._drawArrow(gfx, rp._renderX, rp._renderY, rp.ang + bend, rp.isSpecial ? 0xf5c542 : 0xd4a574, rp.isSpecial ? 1.0 : 0.9);
        if (rp.isSpecial) { gfx.circle(rp._renderX, rp._renderY, 9); gfx.stroke({ color: 0xfff2a8, width: 2, alpha: 0.55 }); }
      }
    }

    /* v2.3.1334: reap magic-bolt sprites whose projectile is gone
       (expired, hit, or zone-reset) — same pattern as the slime-orb
       reaper below. */
    for (let i = this.magicBoltSprites.length - 1; i >= 0; i--) {
      const entry = this.magicBoltSprites[i];
      if (!_liveBolts.has(entry.proj) || !entry.sprite || entry.sprite.destroyed) {
        if (entry.sprite && !entry.sprite.destroyed) entry.sprite.destroy();
        if (entry.proj) entry.proj._boltSprite = null;
        this.magicBoltSprites.splice(i, 1);
      }
    }
    /* v2.3.1396: same reap for the painted special-projectile sprites. */
    for (let i = this.specialFxSprites.length - 1; i >= 0; i--) {
      const entry = this.specialFxSprites[i];
      if (!_liveBolts.has(entry.proj) || !entry.sprite || entry.sprite.destroyed) {
        if (entry.sprite && !entry.sprite.destroyed) entry.sprite.destroy();
        if (entry.proj) entry.proj._fxSprite = null;
        this.specialFxSprites.splice(i, 1);
      }
    }

    /* Slime projectiles — uses the slime-projectile-v1 sheet via the
       slimeSprites loader, scaled down so the orb reads at ~50 px.
       We reap orphaned sprites whose proj is no longer in the
       simulator's array. */
    const slimeProjs = S.slimeProjectiles || [];
    const liveProjs = new Set(slimeProjs);
    for (let i = this.slimeProjSprites.length - 1; i >= 0; i--) {
      const entry = this.slimeProjSprites[i];
      if (!liveProjs.has(entry.proj) || !entry.sprite || entry.sprite.destroyed) {
        if (entry.sprite && !entry.sprite.destroyed) entry.sprite.destroy();
        if (entry.proj) entry.proj._pixiSprite = null;
        this.slimeProjSprites.splice(i, 1);
      }
    }
    /* Projectile rendering -- variants can override the slime-orb art
       per zone.  Resolves the active zone's variant (e.g. ember.fodder
       -> fireGoblin) and uses its projectile.tex if defined.  Rotation
       comes from the variant's baseAng so the sprite nose lines up
       with sp.ang regardless of the source pose. */
    let projTex = null;
    let projBaseAng = 0;
    let projScale = 0.08;
    const zoneOverrides = ZONE_VARIANT_MAP[S.currentZone] || null;
    if (zoneOverrides) {
      for (const baseArch of Object.keys(zoneOverrides)) {
        const variantKey = zoneOverrides[baseArch];
        const vSprites = variantSpritesFor(variantKey);
        const variant = MONSTER_VARIANTS[variantKey];
        const tex = vSprites && vSprites.projectile ? vSprites.projectile.get() : null;
        if (tex) {
          projTex = tex;
          projBaseAng = vSprites.projectile.baseAng || 0;
          projScale = (variant && variant.projectileScalePx ? variant.projectileScalePx : 16) / 256;
          break;
        }
        /* ═══ v2.3.1691: A RECOLOURED SLIME THROWS A RECOLOURED BALL ═══
           Owner: "The blue slime projectile and slime remnants should be the
           same blue color (they are green)."
           v2.3.1534 recoloured the slimes AND taught the REMNANTS branch to
           follow (see it below — "a blue slime dies into a green puddle"),
           but the projectile was never given the same branch: a variant with
           no dedicated projectile SHEET fell straight through to the base
           green orb.  So the blue slime threw green.  Same resolution the
           splat uses, so the two can't disagree again — and the recoloured
           sheet is already warm from preloadZoneAssets, so this costs no
           load. */
        if (variant && variant.recolor && hasRecoloredState(variant, 'projectile')) {
          const rtex = getRecoloredFrame(variant, 'projectile', 0);
          if (rtex) {
            projTex = rtex;
            projBaseAng = 0;
            projScale = (variant.projectileScalePx ? variant.projectileScalePx : 16) / 256;
            break;
          }
        }
      }
    }
    if (!projTex && hasSlimeState('projectile')) {
      projTex = getSlimeFrame('projectile', 0);
      projBaseAng = 0;
      /* 128 px source -> 0.2 = ~25 px on-screen.  0.08 (v2.1.79) was
         a 10 px dot -- so small the player couldn't see slime
         projectiles flying at all.  0.2 is the middle ground:
         clearly visible, still smaller than the slime body. */
      projScale = 0.2;
    }
    /* v2.3.1678: SNOWBALLS ARE NOT SLIME ORBS.
       The texture lookup above resolves ONE art for the whole zone, from the
       zone's variant map — which is right for a zone whose fodder is reskinned
       (ember's fire goblins) and wrong for a ball whose thrower is a different
       archetype entirely.  Frost Ridge has no variant-map entry at all, so the
       snowman's ball fell through to the slime orb: a green blob against snow,
       which is why it read as invisible.
       There is no snowball sprite in the repo (the snowman folder has facings,
       a death, a hit and an IMPACT splash — no ball), so this draws one:
       a white orb with a soft rim, procedural, on the same Graphics the rest
       of this pass uses.  No filters — iOS WebGL, CLAUDE.md — so the softness
       is two stacked circles, the same trick the lantern ring used. */
    const snowballs = slimeProjs.filter((sp) => sp.kind === 'snowball');
    if (snowballs.length) {
      for (const sp of snowballs) {
        /* Shed the pooled Sprite if this ball was previously drawn as an orb
           (kind can only be set at spawn, but a stale sprite would linger). */
        if (sp._pixiSprite && !sp._pixiSprite.destroyed) { sp._pixiSprite.visible = false; }
        const r = 7;
        gfx.circle(sp.x, sp.y, r + 2.5);
        gfx.fill({ color: 0x9fc7e8, alpha: 0.30 });   /* cold rim */
        gfx.circle(sp.x, sp.y, r);
        gfx.fill({ color: 0xffffff, alpha: 0.96 });   /* packed snow */
        gfx.circle(sp.x - r * 0.3, sp.y - r * 0.3, r * 0.42);
        gfx.fill({ color: 0xffffff, alpha: 1 });      /* highlight, reads as round */
      }
    }
    if (projTex) {
      for (const sp of slimeProjs) {
        if (sp.kind === 'snowball') continue;   /* drawn above */
        let sprite = sp._pixiSprite;
        if (!sprite || sprite.destroyed) {
          sprite = new Sprite(projTex);
          sprite.anchor.set(0.5, 0.5);
          sprite.scale.set(projScale);
          this.projectileLayer.addChild(sprite);
          sp._pixiSprite = sprite;
          this.slimeProjSprites.push({ proj: sp, sprite });
        }
        if (sprite.texture !== projTex) {
          sprite.texture = projTex;
          sprite.scale.set(projScale);
        }
        sprite.x = sp.x;
        sprite.y = sp.y;
        sprite.rotation = projBaseAng !== 0 ? (sp.ang || 0) - projBaseAng : 0;
      }
    }
  }

  /** v2.3.1334: place (create/update) one painted magic-bolt sprite.
   *  Shared by local staff arrows and remote staff bolts.  The strip's
   *  frames flick at MAGIC_BOLT_FRAME_MS with a per-projectile phase
   *  offset so simultaneous bolts don't strobe in lockstep.  Anchor =
   *  the orb center, so position pins the head and rotation swings the
   *  tail — which therefore always points back toward the caster. */
  /** v2.3.1435: place the cooked-item icon at the pan's per-frame food
   *  anchor (extracted from the inline v2.3.1433 block so the cook-flip
   *  LINGER can reuse it after the extraction record is gone).
   *  (panX, panY) = gestureToolSprite position, s = pan scale, f01 =
   *  display flip phase, fishKey = raw fish being cooked. */
  _placeCookFood(panX, panY, s, f01, fishKey) {
    const _gt = GESTURE_TOOLS.cooking;
    const _fs = this.gestureFoodSprite;
    if (!_gt || !_gt.food || !_fs) return;
    const _fi = Math.min(7, Math.floor(Math.max(0, f01) * 8));
    const _fa = _gt.food[_fi] || _gt.food[0];
    const _rawIcon = ({
      fish_clownfish: '/icons/items/fish-clownfish.webp?v=2.3.1452',
      fish_trout: '/icons/items/fish-trout.webp?v=2.3.1452',
    })[fishKey] || '/icons/items/fish-minnow.webp?v=2.3.1452';
    let _ft = this._foodIconTex[_rawIcon];
    if (_ft === undefined) {
      this._foodIconTex[_rawIcon] = 'loading';
      _fxLoad(_rawIcon)
        .then((t) => { this._foodIconTex[_rawIcon] = t || null; })
        .catch(() => { this._foodIconTex[_rawIcon] = null; });
      _ft = 'loading';
    }
    if (_ft && _ft !== 'loading') {
      _fs.texture = _ft;
      _fs.x = panX + (_fa.x - 128) * s;
      _fs.y = panY + (_fa.y - 128) * s;
      _fs.rotation = _fa.rot || 0;
      /* the painted fillet spanned ~90px of the 256 cell — size the
         icon to read the same in the pan. */
      _fs.scale.set((84 * s) / (_ft.width || 64));
      _fs.visible = true;
    }
  }

  _placeMagicBolt(p, x, y, ang, alpha, now, liveSet) {
    let sprite = p._boltSprite;
    if (!sprite || sprite.destroyed) {
      sprite = new Sprite(MAGIC_BOLT_FRAMES[0]);
      sprite.anchor.set(MAGIC_BOLT_ANCHOR.x, MAGIC_BOLT_ANCHOR.y);
      /* 217x128 source frame; the orb core is ~100 px of it — 0.18
         lands the head at ~18 px, matching the old 9 px-radius glow. */
      sprite.scale.set(0.18);
      if (p._boltPhase == null) p._boltPhase = Math.floor(Math.random() * 4);
      this.projectileLayer.addChild(sprite);
      p._boltSprite = sprite;
      this.magicBoltSprites.push({ proj: p, sprite });
    }
    const frame = MAGIC_BOLT_FRAMES[
      (Math.floor(now / MAGIC_BOLT_FRAME_MS) + (p._boltPhase || 0)) % MAGIC_BOLT_FRAMES.length
    ];
    if (sprite.texture !== frame) sprite.texture = frame;
    sprite.x = x;
    sprite.y = y;
    sprite.rotation = ang || 0;
    sprite.alpha = alpha;
    liveSet.add(p);
  }

  /** v2.3.1396: place (create/update) one painted SPECIAL-projectile
   *  sprite — charged bow arrow or charged staff orb (cfg =
   *  ARROW_SPECIAL / MAGIC_SPECIAL).  Same flicker + anchor + reap
   *  contract as _placeMagicBolt; shared by local and remote. */
  _placeSpecialFx(cfg, p, x, y, ang, alpha, now, liveSet) {
    let sprite = p._fxSprite;
    if (!sprite || sprite.destroyed) {
      sprite = new Sprite(cfg.frames[0]);
      sprite.anchor.set(cfg.anchor.x, cfg.anchor.y);
      sprite.scale.set(cfg.scale);
      if (p._fxPhase == null) p._fxPhase = Math.floor(Math.random() * 4);
      this.projectileLayer.addChild(sprite);
      p._fxSprite = sprite;
      this.specialFxSprites.push({ proj: p, sprite });
    }
    const frame = cfg.frames[
      (Math.floor(now / cfg.frameMs) + (p._fxPhase || 0)) % cfg.frames.length
    ];
    if (sprite.texture !== frame) sprite.texture = frame;
    sprite.x = x;
    sprite.y = y;
    sprite.rotation = ang || 0;
    sprite.alpha = alpha;
    liveSet.add(p);
  }

  /** Push the projectile's current render position into a small
   *  ring-buffer trail on the projectile object, then draw the trail
   *  as fading line segments behind it.  Each successive segment is
   *  thinner + more transparent, so the streak reads as motion blur
   *  the eye strings into a linear path.
   *
   *  Trail position is captured ONCE per render frame.  At the
   *  arrow's typical speed (8 px/frame), an 8-point trail covers
   *  ~64 px = a clear streak that doesn't lag behind reality. */
  _updateProjectileTrail(p, gfx, fadeA, isOrb) {
    const TRAIL_LEN = 8;
    if (!p._trail) p._trail = [];
    /* Skip recording if we just teleported (e.g. zone change reset).
       A jump in distance > 80 px between samples means re-spawn. */
    const last = p._trail[p._trail.length - 1];
    if (last) {
      const dx = p._renderX - last.x;
      const dy = p._renderY - last.y;
      if (dx * dx + dy * dy > 80 * 80) p._trail.length = 0;
    }
    p._trail.push({ x: p._renderX, y: p._renderY });
    if (p._trail.length > TRAIL_LEN) p._trail.shift();
    if (p._trail.length < 2) return;
    /* Draw segments oldest -> newest.  i=1 at oldest segment,
       i=trail.length-1 at newest. */
    for (let i = 1; i < p._trail.length; i++) {
      const t = i / (p._trail.length - 1);   // 0..1, 1 = closest to head
      const a0 = p._trail[i - 1];
      const a1 = p._trail[i];
      gfx.moveTo(a0.x, a0.y);
      gfx.lineTo(a1.x, a1.y);
      gfx.stroke({
        /* Dark brown for arrows, lighter for orbs. */
        color: isOrb ? 0xc8c8d0 : 0x5a3820,
        width: 0.4 + t * 1.6,
        alpha: fadeA * (0.05 + t * 0.45),
      });
    }
  }

  /** Trace a closed polygon path via moveTo/lineTo and fill it.
   *  More reliable than gfx.poly() in Pixi v8 — earlier version
   *  used poly() and arrows rendered invisible. */
  _fillPoly(gfx, pts, color, alpha) {
    gfx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) gfx.lineTo(pts[i].x, pts[i].y);
    gfx.closePath();
    gfx.fill({ color, alpha });
  }

  /** Draw a detailed arrow centered on (cx, cy) rotated by `ang`.
   *  Body is 16 px long: dark brown shaft + lighter brown highlight
   *  strip + brown arrowhead + brown fletching.  Matches the stuck-
   *  arrow rendering so a live arrow and a stuck one read as the
   *  same wooden missile. */
  _drawArrow(gfx, cx, cy, ang, headColor /* unused — kept for signature compat */, alpha, scale) {
    const c = Math.cos(ang), s = Math.sin(ang);
    /* v2.3.222: optional scale param for the special-bow path so the
       arrow grows along with its halo + damage radius. Default 1. */
    const k = scale || 1;
    const pt = (lx, ly) => ({ x: cx + lx * k * c - ly * k * s, y: cy + lx * k * s + ly * k * c });
    /* Shaft 16 px long, 3 px wide — dark brown wood. */
    this._fillPoly(gfx, [pt(-8, -1.5), pt(8, -1.5), pt(8, 1.5), pt(-8, 1.5)], 0x3a2210, alpha);
    /* Highlight strip across the top half of the shaft for relief —
       same recipe as the stuck arrow. */
    this._fillPoly(gfx, [pt(-8, -1.5), pt(8, -1.5), pt(8, -0.7), pt(-8, -0.7)], 0x5a3820, alpha * 0.85);
    /* Arrowhead triangle — lighter brown to read as a metal-ish tip
       on the wooden shaft. */
    this._fillPoly(gfx, [pt(9, 0), pt(5, -3.5), pt(5, 3.5)], 0x6a4830, alpha);
    /* Fletching at the tail end — slightly warmer brown. */
    this._fillPoly(gfx, [pt(-8, -2.5), pt(-5, -2.5), pt(-5, -1), pt(-8, -1)], 0x5a3820, alpha * 0.85);
    this._fillPoly(gfx, [pt(-8, 1), pt(-5, 1), pt(-5, 2.5), pt(-8, 2.5)], 0x5a3820, alpha * 0.85);
  }

  /** Stuck arrow on a monster — half-length, fletching at the air end,
   *  arrowhead buried in the body.  Center (cx, cy) is the impact point. */
  _drawStuckArrow(gfx, cx, cy, ang, color) {
    const c = Math.cos(ang), s = Math.sin(ang);
    const pt = (lx, ly) => ({ x: cx + lx * c - ly * s, y: cy + lx * s + ly * c });
    /* Shaft 13 px out, 2.4 px wide. */
    this._fillPoly(gfx, [pt(-11, -1.2), pt(2, -1.2), pt(2, 1.2), pt(-11, 1.2)], 0x3a2210, 0.9);
    /* Highlight strip along the top half of the shaft for relief. */
    this._fillPoly(gfx, [pt(-11, -1.2), pt(2, -1.2), pt(2, -0.4), pt(-11, -0.4)], 0x5a3820, 0.85);
    /* Fletching at the tail end. */
    this._fillPoly(gfx, [pt(-11, -3), pt(-8, -3), pt(-8, -1.5), pt(-11, -1.5)], color, 0.8);
    this._fillPoly(gfx, [pt(-11, 1.5), pt(-8, 1.5), pt(-8, 3), pt(-11, 3)], color, 0.8);
    /* Tip just protruding from the body. */
    this._fillPoly(gfx, [pt(3, 0), pt(1.5, -2), pt(1.5, 2)], color, 0.95);
  }

  /** Embedded magic shard from a staff bolt. */
  _drawStuckMagicShard(gfx, cx, cy, ang, color) {
    const c = Math.cos(ang), s = Math.sin(ang);
    const pt = (lx, ly) => ({ x: cx + lx * c - ly * s, y: cy + lx * s + ly * c });
    this._fillPoly(gfx, [pt(4, 0), pt(-2, -2), pt(-2, 2)], color, 0.66);
    gfx.circle(cx, cy, 3);
    gfx.fill({ color, alpha: 0.27 });
  }

  /* ── Monster Telegraphs ── */
  _updateTelegraphs(S, now) {
    const gfx = this.telegraphGfx;
    gfx.clear();

    const monsters = S.monsters || [];
    for (const m of monsters) {
      if (!m.alive || !m._telegraphUntil) continue;
      const remaining = m._telegraphUntil - now;
      if (remaining <= 0) continue;

      const range = m._telegraphRange || 40;
      const pulse = Math.sin(now / 100) * 0.15 + 0.35;
      gfx.circle(m.x, m.y, range);
      gfx.fill({ color: 0xff0000, alpha: pulse * 0.15 });
      gfx.circle(m.x, m.y, range);
      gfx.stroke({ color: 0xff0000, width: 2, alpha: pulse });
    }
  }

  /* ── Overlays (lock-on, chat bubbles, building signs, aim line) ── */
  _updateOverlays(S, now) {
    const gfx = this.overlayGfx;
    gfx.clear();

    // Lock-on reticle — defensive: a stale ref (e.g. monster killed
    // mid-frame) shouldn't take down the entire effects renderer.
    try {
      if (S.lockedTarget && S.lockedTarget.ref && S.lockedTarget.ref.alive !== false) {
        const lt = S.lockedTarget.ref;
        const lx = lt.x || lt.renderX || 0;
        const ly = lt.y || lt.renderY || 0;
        if (Number.isFinite(lx) && Number.isFinite(ly)) {
          const lockR = 18 + Math.sin(now / 250) * 3;
          gfx.circle(lx, ly, lockR);
          gfx.stroke({ color: 0xff3c3c, width: 2, alpha: 0.8 });
          // Corner marks
          for (let c = 0; c < 4; c++) {
            const ca = (c / 4) * Math.PI * 2 + now / 1500;
            const cx = lx + Math.cos(ca) * lockR;
            const cy = ly + Math.sin(ca) * lockR;
            gfx.circle(cx, cy, 2);
            gfx.fill({ color: 0xff3c3c, alpha: 0.9 });
          }
        }
      }
    } catch (e) {
      if (!this._lockErrLogged) {
        this._lockErrLogged = true;
        console.error('[overlay] lock reticle threw', e && e.message, e && e.stack);
      }
    }

    /* Bow / staff / melee line of sight — a beam-shaped ribbon (filled
       polygon) running along the aim direction, drawn while a weapon is
       equipped AND the player is aiming, locked on, or auto-attacking.
       The two long edges are sine-wavy and the wave PHASE shifts with
       `now`, so the borders shimmer + drift along the beam — reads like
       a flowing energy stream rather than a hard hitscan line.  Top and
       bottom edges run 180° out of phase so the beam pulses width-wise.
       Melee uses the same shape, shorter length (sword/shield needed a
       forward-sense affordance per user request — same visual language
       as bow/staff, just compressed to roughly the attack range). */
    {
      const slot = S.rpg && S.rpg.activeSlot;
      const isRanged = slot === 'ranged' || slot === 'staff';
      const isMelee = !isRanged; /* covers explicit 'melee' + legacy unset slot */
      const isLocked = !!(S.lockedTarget && S.lockedTarget.ref);
      const aimState = (S._aiming || isLocked || S.autoAttack);
      /* v2.3.1051: the melee hit-area shows as a swing WIND gust only while
         actually swinging, so include that as a draw trigger (a manual tap-swing
         isn't necessarily in an aim state). */
      const meleeSwinging = isMelee && !!S._swordSwinging;
      const shouldDraw = (isRanged ? aimState : (aimState || meleeSwinging))
        && S.player
        && !S._shieldUp; /* shield arc has its own indicator; don't overlap */
      /* v2.3.940: melee shows its wild-swing AoE shape (a 360° core circle + a
         forward half-disc) instead of the reach beam, so the indicator matches
         the new melee hit shape exactly (shared GS_* constants).  (v2.3.939
         gated this to the 'greatsword' type, but the default melee weapon is
         type 'sword' so it never showed -- all melee uses the wild swing.) */
      if (shouldDraw) {
        const P = S.player;
        let aimA;
        if (isLocked) {
          const lt = S.lockedTarget.ref;
          aimA = Math.atan2((lt.y || 0) - P.y, (lt.x || 0) - P.x);
        } else if (S._aimAngle != null) {
          aimA = S._aimAngle;
        } else if (S._facingAngle != null) {
          aimA = S._facingAngle;   // tap-swing with no active aim: use body facing
        } else {
          aimA = 0;
        }
        if (isMelee) {
          /* v2.3.1134: Cleave widens the preview exactly like the hit test in
             monsterCombat — preview-matches-damage is the v2.3.939 contract. */
          const _cleaveArc = GS_FORWARD_ARC + cleaveArcBonus(S.rpg);
          const a0 = aimA - _cleaveArc / 2, a1 = aimA + _cleaveArc / 2;
          const _c0 = Math.cos(a0), _s0 = Math.sin(a0), _c1 = Math.cos(a1), _s1 = Math.sin(a1);
          /* The exact hit-test union: forward half-disc rim (oR) joined to the
             360° core (iR) behind, via radial steps at the sides.  Parameterised
             by radii so the wind gust can swell outward. */
          const _shape = (oR, iR) => {
            gfx.moveTo(P.x + _c0 * oR, P.y + _s0 * oR);
            gfx.arc(P.x, P.y, oR, a0, a1);                  // forward rim
            gfx.lineTo(P.x + _c1 * iR, P.y + _s1 * iR);     // step in
            gfx.arc(P.x, P.y, iR, a1, a0 + Math.PI * 2);    // core behind
            gfx.lineTo(P.x + _c0 * oR, P.y + _s0 * oR);     // step out
          };
          /* v2.3.1051: swing WIND -- a soft filled gust in the shape of the hit
             area, shown ONLY during the swing.  It swells outward and fades over
             the swing window (owner: mimic the wind of the swing).  Softness is
             faked with a few concentric fills (no WebGL blur filter -- iOS-safe
             per the charge-pie drop-shadow incident).  Arrow stays below. */
          if (meleeSwinging) {
            const p = Math.max(0, Math.min(1, (now - (S.swingTimer || now)) / SWORD_SWING_MS));
            const a = 0.07 * Math.sin(p * Math.PI);   // swell-in then fade-out -- very subtle (owner: almost unnoticeable)
            const grow = 1 + 0.08 * p;                // slight outward drift
            if (a > 0.004) {
              const LAYERS = [[12, 0.22], [8, 0.34], [4, 0.5], [0, 0.72]]; // [+px, weight] outer→inner
              for (const [pad, w] of LAYERS) {
                _shape(GS_OUTER_RADIUS * grow + pad, GS_INNER_RADIUS * grow + pad);
                gfx.fill({ color: 0xeaf3ff, alpha: a * w });
              }
            }
          }
          /* Direction chip: a small flat triangle straddling the arc midpoint,
             pointing down the aim.  Thin dark edge so it reads on light bg. */
          const _ac = Math.cos(aimA), _as = Math.sin(aimA);
          const _px = -_as, _py = _ac;   // perpendicular
          const _hw = 7;                  // half base width
          const _tipx = P.x + _ac * (GS_OUTER_RADIUS + 5), _tipy = P.y + _as * (GS_OUTER_RADIUS + 5);
          const _bx = P.x + _ac * (GS_OUTER_RADIUS - 9),   _by = P.y + _as * (GS_OUTER_RADIUS - 9);
          gfx.moveTo(_tipx, _tipy);
          gfx.lineTo(_bx + _px * _hw, _by + _py * _hw);
          gfx.lineTo(_bx - _px * _hw, _by - _py * _hw);
          gfx.closePath();
          gfx.fill({ color: 0xffffff, alpha: 0.7 });
          gfx.moveTo(_tipx, _tipy);
          gfx.lineTo(_bx + _px * _hw, _by + _py * _hw);
          gfx.lineTo(_bx - _px * _hw, _by - _py * _hw);
          gfx.closePath();
          gfx.stroke({ color: 0x000000, width: 1, alpha: 0.35 });
        } else {
        /* Ranged / staff: the reach beam (melee now uses the AoE shape above).
           The `: 95` fallback is retained for any non-ranged that reaches here. */
        const lineLen = isRanged ? 280 : 95;
        const halfW = 2;          // half-width of beam at neutral
        const waveAmp = 1.6;      // edge wave amplitude in px
        const waveLen = 42;       // px per wave cycle along the beam
        const phase = (now / 600) * Math.PI * 2;  // ~600 ms per wave-shift
        const segments = 24;
        const cosA = Math.cos(aimA), sinA = Math.sin(aimA);
        // Perpendicular unit vector (rotate aim by +90°).
        const perpX = -sinA, perpY = cosA;
        /* v2.3.938: for a bow, start the beam at the teal grip (where the arrow
           actually launches from, published by the bow stand-in) instead of the
           player's feet, so the arrow flies down the MIDDLE of the line of
           sight rather than parallel-and-offset to it.  Staff/melee keep the
           feet origin; if no grip has been published yet, fall back to feet. */
        const _useGrip = slot === 'ranged' && S._bowGripDX != null && S._bowGripDY != null;
        const originX = _useGrip ? P.x + S._bowGripDX : P.x;
        const originY = _useGrip ? P.y + S._bowGripDY : P.y;
        const top = [];
        const bot = [];
        for (let i = 0; i <= segments; i++) {
          const t = i / segments;
          const dist = t * lineLen;
          const bx = originX + cosA * dist;
          const by = originY + sinA * dist;
          // Wave moves backward along the beam over time (phase increases).
          const wavePos = (dist / waveLen) * Math.PI * 2 - phase;
          const topW = halfW + Math.sin(wavePos) * waveAmp;
          const botW = halfW + Math.sin(wavePos + Math.PI) * waveAmp;
          top.push(bx + perpX * topW, by + perpY * topW);
          bot.push(bx - perpX * botW, by - perpY * botW);
        }
        // Build closed polygon: top forward, then bottom in reverse.
        gfx.moveTo(top[0], top[1]);
        for (let i = 2; i < top.length; i += 2) gfx.lineTo(top[i], top[i + 1]);
        for (let i = bot.length - 2; i >= 0; i -= 2) gfx.lineTo(bot[i], bot[i + 1]);
        gfx.closePath();
        gfx.fill({ color: 0xffffff, alpha: 0.2 });
        }
      }
    }

    /* ═══ v2.3.1704: THE SHIELD CONE ═══
       Owner: "add a subtle cone of light effect while shield is held to show
       direction of where shield is pointed and where it protect you from
       damage."

       There WAS a shield indicator here — a 22px stroked arc — and it has
       never once been drawn: it gated on `S.isBlocking`, a flag nothing in
       this codebase has ever set (the real ones are `S._shieldUp` and the
       rolling `S.shieldEnd` window, BroTown.jsx).  So "the shield has no
       on-screen direction" was not a missing feature, it was a dead branch,
       which is why nobody noticed it rot.

       The cone is built as four nested wedges of falling alpha rather than a
       gradient, because Pixi Graphics has no radial fill: near the body it
       reads as a soft glow, and it thins out toward the rim instead of
       ending on a hard edge.  A brighter leading arc caps it so the
       direction is legible at a glance on a phone, and the whole thing
       breathes on a slow sine so a held shield looks live rather than
       painted on.

       IT IS THE HITBOX.  The first cut of this shipped as a direction-only
       indicator, because blocking had been omnidirectional since v2.3.1110 and
       a hard sector would have promised a limit that did not exist.  Asked
       directly, the owner said "yes blocking should be directional", so
       v2.3.1705 put the arc back on every block path (client and worker) and
       this cone is drawn at the SAME shared BLOCK_ARC_HALF those paths test.
       What the player sees is now literally what they block. */
    if (S._shieldUp && S.player) {
      const P = S.player;
      const ang = (S._shieldAngle != null) ? S._shieldAngle
        : (S._facingAngle != null ? S._facingAngle : 0);
      /* v2.3.1705: the cone is drawn at EXACTLY the block half-angle now — the
         owner asked for "where it protect you from damage", and since blocking
         went directional again that is a promise the game can finally keep.
         Sharing the constant is what keeps it true: retune BLOCK_ARC_HALF and
         the picture follows the rule automatically. */
      const half = BLOCK_ARC_HALF;
      const breathe = 0.86 + Math.sin(now / 420) * 0.14;
      /* Anchored just in front of the body so the wedge does not paint over
         the character's own sprite. */
      const ox = P.x + Math.cos(ang) * 6;
      const oy = P.y + Math.sin(ang) * 6;
      /* Alphas tuned ON the brightest ground in the game (town's pale sand,
         headless at a 390x844 iPhone viewport) — a 0.20 top band that looked
         right in isolation was very nearly invisible there, and the town
         fountain is exactly where a player first raises a shield. */
      const BANDS = [
        { r: 30, a: 0.50 },
        { r: 46, a: 0.34 },
        { r: 62, a: 0.21 },
        { r: 80, a: 0.11 },
      ];
      /* Longest first: each shorter band is drawn ON TOP, so the alphas
         accumulate toward the body and the spill fades outward. */
      for (let i = BANDS.length - 1; i >= 0; i--) {
        const b = BANDS[i];
        gfx.moveTo(ox, oy);
        gfx.arc(ox, oy, b.r, ang - half, ang + half);
        gfx.closePath();
        gfx.fill({ color: 0x9fd4ff, alpha: b.a * breathe });
      }
      /* The leading edge — thin, brighter, and the part that actually
         reads as "this way" in a glance. */
      gfx.arc(ox, oy, 80, ang - half, ang + half);
      gfx.stroke({ color: 0xbfe4ff, width: 2, alpha: 0.7 * breathe });
      /* A short bar across the shield hand at the cone's mouth: the cone
         alone floats, and this roots it to the character. */
      const px = Math.cos(ang + Math.PI / 2), py = Math.sin(ang + Math.PI / 2);
      gfx.moveTo(ox + px * 13, oy + py * 13);
      gfx.lineTo(ox - px * 13, oy - py * 13);
      gfx.stroke({ color: 0xdff0ff, width: 3, alpha: 0.7 * breathe });
    }

    /* v2.3.120: player Lv badge removed below the sprite per user
       request -- name floats above the head, level lives in the
       bottom-left dashboard column header.  The destroy path at the
       bottom of this file still guards on null so old _levelText
       references are safe. */

    // Chat bubbles
    this._updateChatBubbles(S, now);
  }

  /** Build (or reposition) a chat bubble for `key` over `(sx, sy)` —
   *  white rounded rectangle background + pointer tip + text.  Pooled
   *  per key as { container, bg (Graphics), text (Text), hasEmoji }
   *  in this.chatTexts.  Source can be either a player or an NPC. */
  _renderChatBubble(key, sx, sy, text, age, totalMs = 5000) {
    const hasEmoji = !isAsciiOnly(text);
    let entry = this.chatTexts.get(key);
    if (entry && entry.text && entry.text.destroyed) {
      this.chatTexts.delete(key);
      entry = null;
    }
    if (!entry || entry.hasEmoji !== hasEmoji) {
      if (entry && entry.container && !entry.container.destroyed) entry.container.destroy({ children: true });
      const container = new Container();
      const bg = new Graphics();
      container.addChild(bg);
      /* v2.3.219: pure black, no drop shadow, no inherited LABEL_STYLE
         effects.  Spec defined inline so nothing leaks in from
         LABEL_STYLE (which carries a 2 px black blur).
         v2.3.1014: text font FIRST in the emoji branch — emoji-first made
         the space glyph measure with the emoji font's wide advance, so any
         non-ASCII char (iOS curly quotes/em-dash) blew out word spacing. */
      const txt = new Text({
        text: '',
        style: {
          fontFamily: hasEmoji
            ? '"Source Sans 3","Apple Color Emoji","Segoe UI Emoji",sans-serif'
            : 'Source Sans 3, sans-serif',
          fontSize: 11,
          fill: '#000000',
          align: 'center',
          wordWrap: true,
          wordWrapWidth: 140,
        },
      });
      txt.anchor.set(0.5, 0);
      container.addChild(txt);
      entry = { container, bg, text: txt, hasEmoji, lastText: '' };
      this.overlayLayer.addChild(container);
      this.chatTexts.set(key, entry);
    }
    /* Update text content + recompute bg only when text changed. */
    if (entry.lastText !== text) {
      entry.lastText = text;
      entry.text.text = text;
      const tw = entry.text.width;
      const th = entry.text.height;
      const padX = 8, padY = 6, tipH = 6, radius = 8;
      const bw = Math.min(160, tw + padX * 2);
      const bh = th + padY * 2;
      entry.bg.clear();
      entry.bg.roundRect(-bw / 2, -bh - tipH, bw, bh, radius);
      entry.bg.fill({ color: 0xffffff, alpha: 0.92 });
      /* Pointer tip — small downward triangle from the bubble bottom
         to a point at (0, 0) which is the source's top-of-head. */
      entry.bg.moveTo(-5, -tipH);
      entry.bg.lineTo(0, 0);
      entry.bg.lineTo(5, -tipH);
      entry.bg.lineTo(-5, -tipH);
      entry.bg.fill({ color: 0xffffff, alpha: 0.92 });
      /* Center the text inside the bubble. */
      entry.text.x = 0;
      entry.text.y = -bh - tipH + padY;
    }
    entry.container.x = sx;
    entry.container.y = sy - 32;
    entry.container.alpha = age > totalMs - 500 ? (totalMs - age) / 500 : 1;
    entry.container.visible = true;
    return entry;
  }

  _updateChatBubbles(S, now) {
    const bubbles = S.chatBubbles || {};
    const activeKeys = new Set();

    /* Player + others' bubbles. */
    const allSources = { [S.myId]: S.player };
    for (const [id, o] of Object.entries(S.others || {})) {
      allSources[id] = o;
    }
    for (const [pid, bubble] of Object.entries(bubbles)) {
      if (!bubble || !bubble.text) continue;
      const age = now - bubble.ts;
      if (age > 5000) continue;
      const source = allSources[pid];
      if (!source) continue;
      const sx = source.renderX || source.x || 0;
      const sy = source.renderY || source.y || 0;
      this._renderChatBubble(pid, sx, sy, bubble.text, age);
      activeKeys.add(pid);
    }

    /* NPC bubbles — entity-bound, lives on npc.chatBubble.
       Keyed with 'npc:' prefix to avoid colliding with player IDs. */
    for (const npc of (S.npcs || [])) {
      if (!npc || !npc.chatBubble || !npc.chatBubble.text) continue;
      const age = now - npc.chatBubble.ts;
      if (age > 5000) continue;
      const key = 'npc:' + npc.id;
      this._renderChatBubble(key, npc.x, npc.y, npc.chatBubble.text, age);
      activeKeys.add(key);
    }

    /* Hide stale; drop references to anything destroyed externally. */
    for (const [key, entry] of this.chatTexts) {
      if (!entry || !entry.container || entry.container.destroyed) {
        this.chatTexts.delete(key);
        continue;
      }
      if (!activeKeys.has(key)) entry.container.visible = false;
    }
  }

  /* ── HUD (screen-space) ── */
  _updateHUD(S, viewW, viewH, now) {
    const gfx = this.hudGfx;
    gfx.clear();

    // Desktop aim reticle
    if (S._mouseWorldX != null && S._mouseWorldY != null) {
      const mx = S._mouseWorldX;
      const my = S._mouseWorldY;
      // Convert to screen-space for HUD layer
      const sx = mx - (S.camera?.x || 0);
      const sy = my - (S.camera?.y || 0);
      gfx.circle(sx, sy, 8);
      gfx.stroke({ color: 0xffffff, width: 1, alpha: 0.4 });
      // Crosshair lines
      gfx.moveTo(sx - 12, sy); gfx.lineTo(sx - 5, sy);
      gfx.stroke({ color: 0xffffff, width: 1, alpha: 0.3 });
      gfx.moveTo(sx + 5, sy); gfx.lineTo(sx + 12, sy);
      gfx.stroke({ color: 0xffffff, width: 1, alpha: 0.3 });
      gfx.moveTo(sx, sy - 12); gfx.lineTo(sx, sy - 5);
      gfx.stroke({ color: 0xffffff, width: 1, alpha: 0.3 });
      gfx.moveTo(sx, sy + 5); gfx.lineTo(sx, sy + 12);
      gfx.stroke({ color: 0xffffff, width: 1, alpha: 0.3 });
    }
  }

  /* ── Ground Loot ──
   * Each loot entry gets:
   *   - Procedural draw on the shared lootGfx (glow, ring, coin stack).
   *   - Optional Sprite (slime remnants splat).
   *   - Optional Text labels (weapon name, coin count, death-drop
   *     timer + item count + bag emoji).
   * Texts are pooled per loot — created lazily, hidden when not
   *  applicable, destroyed when the loot expires/splices.
   */
  /* v2.3.113: immediate-dispose lookup by lootId.  Called from
     BroTown's loot_credit / loot_despawn handlers so a picked-up pile
     is torn down the same tick instead of lingering until the next
     orphan-sweep frame.  Mummy / skeleton kills were intermittently
     leaving a coin sprite on screen because of a race between the
     server's contribution-split despawn event and the renderer's
     per-frame sweep. */
  disposeLootById(lootId) {
    if (!this._knownLoot || !lootId) return;
    for (const l of this._knownLoot) {
      if (l && l.lootId === lootId) {
        this._disposeLoot(l);
        this._knownLoot.delete(l);
        break;
      }
    }
  }

  /* v2.3.138: dispose by direct object reference. Local SP pickup
     paths don't set lootId so the ID-based disposeLootById can't
     reach those piles. Called from the pickup filter the same tick
     it returns false so the Pixi children tear down without waiting
     for the orphan sweep -- closes a race where the sweep
     intermittently missed the cleanup and the coin sprite stuck. */
  disposeLootRef(loot) {
    if (!loot) return;
    this._disposeLoot(loot);
    if (this._knownLoot) this._knownLoot.delete(loot);
  }

  /* v2.3.130: nuke every tracked loot pile immediately.  Counterpart
     to disposeLootById, called from any site that wipes S.groundLoot
     wholesale (player respawn, zone transition, dungeon enter/exit,
     reset paths).  The per-frame orphan sweep also catches these, but
     a wipe followed by an immediate spawn-new-loot tick can read the
     stale sprite for one frame before the sweep runs — observed as
     slime remnants and coin piles "sticking" after meadow kills.
     Cheap to iterate; the set is small. */
  flushAllLoot() {
    if (!this._knownLoot) return;
    for (const l of this._knownLoot) this._disposeLoot(l);
    this._knownLoot.clear();
  }

  _disposeLoot(l) {
    /* Explicit removeFromParent before destroy: same Pixi v8 edge case
       _disposeNode documents -- destroy() doesn't always unparent in
       this project, leaving a coin sprite visible on lootLayer after
       pickup. User-reported "coins dropped from monsters sometimes
       don't disappear from the ground". */
    const kill = (obj) => {
      if (!obj || obj.destroyed) return;
      if (obj.parent) obj.parent.removeChild(obj);
      obj.destroy();
    };
    kill(l._pixiSprite);
    kill(l._pixiLabel);
    kill(l._pixiTimer);
    kill(l._pixiCount);
    kill(l._pixiIcon);
    kill(l._pixiCoinSprite);
    kill(l._pixiCoinLabel);
    kill(l._pixiShardSprite);
    kill(l._pixiOwnerLabel);
    kill(l._pixiWpnLabel);
    l._pixiSprite = l._pixiLabel = l._pixiTimer = l._pixiCount = l._pixiIcon = null;
    l._pixiCoinSprite = l._pixiCoinLabel = l._pixiShardSprite = l._pixiOwnerLabel = null;
    l._pixiWpnLabel = null;
  }

  /** Renders a stroked "[killer]'s loot" label above an MP loot pile
   *  that the local player can't claim.  Stroked white-on-black so it
   *  stays readable on any zone background (snow / dirt / lava).
   *  Owners get null (no label); the helper hides any existing one. */
  _renderOwnerLabel(l, ownsThis, alpha) {
    const show = !ownsThis && !!l.killerName;
    if (!show) {
      if (l._pixiOwnerLabel && !l._pixiOwnerLabel.destroyed) {
        l._pixiOwnerLabel.visible = false;
      }
      return;
    }
    if (!l._pixiOwnerLabel || l._pixiOwnerLabel.destroyed) {
      l._pixiOwnerLabel = new Text({
        text: '',
        style: {
          fontFamily: 'Source Sans 3, sans-serif',
          fontSize: 12,
          fontWeight: '700',
          fill: '#ffffff',
          stroke: { color: '#000000', width: 3 },
          align: 'center',
        },
      });
      l._pixiOwnerLabel.anchor.set(0.5, 1);
      this.lootLayer.addChild(l._pixiOwnerLabel);
    }
    const txt = l.killerName + "'s loot";
    if (l._pixiOwnerLabel.text !== txt) l._pixiOwnerLabel.text = txt;
    l._pixiOwnerLabel.x = l.x;
    /* v2.3.191: +18 to match the visual PILE_Y_OFFSET in _updateGroundLoot. */
    l._pixiOwnerLabel.y = l.y - 22 + 38;
    l._pixiOwnerLabel.alpha = alpha;
    l._pixiOwnerLabel.visible = true;
  }

  /** Draw the elemental shard icon centered at (l.x, anchorY), layered
   *  above any remnants/coin sprite already added for this loot entry.
   *  Uses _pixiShardSprite so it doesn't collide with the other pooled
   *  sprites.  Falls back silently while the PNG is still loading -- a
   *  missing icon is preferable to a glyph that pops in mid-frame. */
  _renderShardOverlay(l, anchorY, alpha) {
    const tex = SHARD_ICONS[l.shard];
    if (!tex) return;
    if (!l._pixiShardSprite || l._pixiShardSprite.destroyed) {
      const sp = new Sprite(tex);
      sp.anchor.set(0.5, 0.5);
      this.lootLayer.addChild(sp);
      l._pixiShardSprite = sp;
    }
    if (l._pixiShardSprite.texture !== tex) l._pixiShardSprite.texture = tex;
    l._pixiShardSprite.x = l.x;
    l._pixiShardSprite.y = anchorY;
    l._pixiShardSprite.alpha = alpha;
    l._pixiShardSprite.scale.set(16 / (l._pixiShardSprite.texture.width || 16));
    l._pixiShardSprite.visible = true;
  }

  /** Draw a gold-coin sprite + "<n>G" label centered at (l.x, anchorY),
   *  layered ABOVE any remnants/wreck sprite already added for this loot
   *  entry.  Uses dedicated _pixiCoinSprite / _pixiCoinLabel slots so it
   *  doesn't collide with the remnants' _pixiSprite. */
  _renderCoinOverlay(l, anchorY, alpha, ownsThis) {
    /* ownsThis === false signals MP loot the local player can't claim
       (someone else's contribution-weighted drop).  Render the icon in
       gray + lower alpha and skip the "+Xg" label since the watcher
       doesn't know the recipient's per-share value. */
    const owned = ownsThis !== false;
    const goldTex = POPUP_ICONS.gold;
    if (goldTex) {
      if (!l._pixiCoinSprite || l._pixiCoinSprite.destroyed) {
        const sp = new Sprite(goldTex);
        sp.anchor.set(0.5, 0.5);
        this.lootLayer.addChild(sp);
        l._pixiCoinSprite = sp;
      }
      l._pixiCoinSprite.x = l.x;
      l._pixiCoinSprite.y = anchorY;
      l._pixiCoinSprite.alpha = (owned ? 1 : 0.4) * alpha;
      l._pixiCoinSprite.tint = owned ? 0xffffff : 0x555555;
      l._pixiCoinSprite.scale.set(12 / (l._pixiCoinSprite.texture.width || 12));
      l._pixiCoinSprite.visible = true;
    }
    if (owned) {
      if (!l._pixiCoinLabel || l._pixiCoinLabel.destroyed) {
        l._pixiCoinLabel = new Text({ text: '', style: { ...LABEL_STYLE, fontSize: 7, fontWeight: '700', fill: '#f5c542' } });
        l._pixiCoinLabel.anchor.set(0.5, 0);
        this.lootLayer.addChild(l._pixiCoinLabel);
      }
      const cStr = l.coins + 'G';
      if (l._pixiCoinLabel.text !== cStr) l._pixiCoinLabel.text = cStr;
      l._pixiCoinLabel.x = l.x;
      l._pixiCoinLabel.y = anchorY + 7;
      l._pixiCoinLabel.alpha = alpha;
      l._pixiCoinLabel.visible = true;
    } else if (l._pixiCoinLabel && !l._pixiCoinLabel.destroyed) {
      l._pixiCoinLabel.visible = false;
    }
  }

  _updateGroundLoot(S, now) {
    const gfx = this.lootGfx;
    gfx.clear();

    const loot = S.groundLoot || [];
    /* Track which loot entries we've created Pixi children for so we
       can dispose orphans.  When the player picks loot up, BroTown
       removes the entry from S.groundLoot — without this set we'd
       never see those entries again and their pooled Sprite/Text
       children would leak in the lootLayer (visible as a "stuck"
       slime remnant splat after pickup). */
    if (!this._knownLoot) this._knownLoot = new Set();
    const activeLoot = new Set();

    for (let i = loot.length - 1; i >= 0; i--) {
      const l = loot[i];
      const age = (now - l.ts) / 1000;
      if (l._expired || age > 30) {
        this._disposeLoot(l);
        this._knownLoot.delete(l);
        loot.splice(i, 1);
        continue;
      }
      activeLoot.add(l);
      this._knownLoot.add(l);
      /* Fodder + variant loot has no bob; it's a settled puddle/pile. */
      const isFodder = l.skull === 'fodder' || !!MONSTER_VARIANTS[l.skull];
      /* v2.3.190: visual pile offset.  Shifts every l.y+bob reference
         (gold glow, icon, count, etc) down by 18 px (was 8 in v2.3.190;
         bumped to 18 in v2.3.191 per user "pile displays too high")
         so the pile reads at the player's feet instead of at the body
         center.  Pickup hit detection in BroTown is unaffected --
         this is purely a visual offset. */
      const PILE_Y_OFFSET = 38;
      const bob = (isFodder ? 0 : Math.sin(age * 3) * 2) + PILE_Y_OFFSET;
      const alpha = age > 25 ? (30 - age) / 5 : 1;

      if (l.isDeathDrop) {
        /* Pulsing red-orange aura that gets faster + brighter as the
           grace timer ticks down.  Sense of urgency for the player to
           grab their loot before it despawns. */
        const timeLeft = l.expiry ? (l.expiry - Date.now()) / 1000 : 30;
        const urgency = Math.max(0, Math.min(1, 1 - timeLeft / 30));
        const pulseRate = 2 + urgency * 6;
        const auraAlpha = (0.2 + Math.sin(age * pulseRate) * 0.15 + urgency * 0.2) * alpha;
        gfx.circle(l.x, l.y + bob, 18);
        gfx.fill({ color: 0xea580c, alpha: auraAlpha });
        const ringColor = urgency > 0.7 ? 0xff5e6c : 0xea580c;
        gfx.circle(l.x, l.y + bob, 15);
        gfx.stroke({ color: ringColor, width: 2, alpha });
        /* Bag emoji icon. */
        if (!l._pixiIcon || l._pixiIcon.destroyed) {
          l._pixiIcon = new Text({ text: '💀', style: { ...LABEL_STYLE_EMOJI, fontSize: 18 } });
          l._pixiIcon.anchor.set(0.5, 0.5);
          this.lootLayer.addChild(l._pixiIcon);
        }
        l._pixiIcon.x = l.x;
        l._pixiIcon.y = l.y + 6 + bob;
        l._pixiIcon.alpha = alpha;
        /* Timer text below. */
        if (!l._pixiTimer || l._pixiTimer.destroyed) {
          l._pixiTimer = new Text({ text: '', style: { ...LABEL_STYLE, fontSize: 8, fontWeight: '700' } });
          l._pixiTimer.anchor.set(0.5, 0);
          this.lootLayer.addChild(l._pixiTimer);
        }
        const tStr = Math.ceil(timeLeft) + 's';
        if (l._pixiTimer.text !== tStr) l._pixiTimer.text = tStr;
        l._pixiTimer.style.fill = urgency > 0.7 ? '#ff5e6c' : '#ea580c';
        l._pixiTimer.x = l.x;
        l._pixiTimer.y = l.y + 22 + bob;
        l._pixiTimer.alpha = alpha;
        /* Item count above. */
        if (!l._pixiCount || l._pixiCount.destroyed) {
          l._pixiCount = new Text({ text: '', style: { ...LABEL_STYLE, fontSize: 7, fontWeight: '700' } });
          l._pixiCount.anchor.set(0.5, 1);
          this.lootLayer.addChild(l._pixiCount);
        }
        const itemTotal = (l.deathItems || []).reduce((s, it) => s + (it.qty || 0), 0);
        const cStr = itemTotal + ' items';
        if (l._pixiCount.text !== cStr) l._pixiCount.text = cStr;
        l._pixiCount.x = l.x;
        l._pixiCount.y = l.y - 12 + bob;
        l._pixiCount.alpha = alpha;
        if (timeLeft <= 0) l._expired = true;
        continue;
      }

      /* v2.3.1141: server pile carrying an unclaimed weapon drop --
         tier aura + "name ?" label rendered ALONGSIDE the normal
         coin/skull visuals (no `continue`: unlike the legacy client-
         mint branch below, these piles also carry coins/skull/shard).
         Quality is unknown here by design -- it reveals in the picker's
         private loot_credit (§4.6b.ii mystery), hence the "?". */
      if (l.hasWeapon) {
        const wColor = cssToHex(l.weaponTierColor || '#8B9695' /* v2.3.1233: Lantern common grey (was navy-palette #8890b8) */);
        const wPulse = 0.3 + Math.sin(age * 4) * 0.15;
        gfx.circle(l.x, l.y + bob, 14);
        gfx.fill({ color: wColor, alpha: wPulse * alpha });
        gfx.circle(l.x, l.y + bob, 12);
        gfx.stroke({ color: wColor, width: 2, alpha });
        if (!l._pixiWpnLabel || l._pixiWpnLabel.destroyed) {
          l._pixiWpnLabel = new Text({ text: '', style: { ...LABEL_STYLE, fontSize: 7, fontWeight: '700' } });
          l._pixiWpnLabel.anchor.set(0.5, 0);
          this.lootLayer.addChild(l._pixiWpnLabel);
        }
        const wStr = (l.weaponName || 'Weapon') + ' ?';
        if (l._pixiWpnLabel.text !== wStr) l._pixiWpnLabel.text = wStr;
        l._pixiWpnLabel.style.fill = l.weaponTierColor || '#8B9695' /* v2.3.1233: Lantern common grey (was navy-palette #8890b8) */;
        l._pixiWpnLabel.x = l.x;
        l._pixiWpnLabel.y = l.y + 38 + bob;
        l._pixiWpnLabel.alpha = alpha;
        l._pixiWpnLabel.visible = true;
      } else if (l._pixiWpnLabel && !l._pixiWpnLabel.destroyed) {
        /* Claimed (weaponClaimedNow broadcast) -- hide the label. */
        l._pixiWpnLabel.visible = false;
      }

      if (l.isWeapon && l.weapon) {
        /* Tier-colored aura + ring + emoji + name label. */
        const tierColor = cssToHex(l.tierColor || '#8B9695' /* v2.3.1233: Lantern common grey (was navy-palette #8890b8) */);
        const auraPulse = 0.3 + Math.sin(age * 4) * 0.15;
        gfx.circle(l.x, l.y + bob, 14);
        gfx.fill({ color: tierColor, alpha: auraPulse * alpha });
        gfx.circle(l.x, l.y + bob, 12);
        gfx.stroke({ color: tierColor, width: 2, alpha });
        /* Weapon icon (emoji). */
        if (!l._pixiIcon || l._pixiIcon.destroyed) {
          const emoji = l.weapon.type === 'sword' ? '⚔️'
                      : l.weapon.type === 'bow'   ? '🏹'
                      : l.weapon.type === 'staff' ? '🪄'
                      : l.weapon.type === 'greatsword' ? '🗡️'
                      : '⚔️';
          l._pixiIcon = new Text({ text: emoji, style: { ...LABEL_STYLE_EMOJI, fontSize: 16 } });
          l._pixiIcon.anchor.set(0.5, 0.5);
          this.lootLayer.addChild(l._pixiIcon);
        }
        l._pixiIcon.x = l.x;
        l._pixiIcon.y = l.y + 5 + bob;
        l._pixiIcon.alpha = alpha;
        /* Name label. */
        if (!l._pixiLabel || l._pixiLabel.destroyed) {
          l._pixiLabel = new Text({ text: l.weapon.name || '', style: { ...LABEL_STYLE, fontSize: 7, fontWeight: '700' } });
          l._pixiLabel.anchor.set(0.5, 0);
          this.lootLayer.addChild(l._pixiLabel);
        }
        if (l._pixiLabel.text !== (l.weapon.name || '')) l._pixiLabel.text = l.weapon.name || '';
        l._pixiLabel.style.fill = l.tierColor || '#8B9695' /* v2.3.1233: Lantern common grey (was navy-palette #8890b8) */;
        l._pixiLabel.x = l.x;
        l._pixiLabel.y = l.y + 38 + bob;
        l._pixiLabel.alpha = alpha;
        continue;
      }

      if (isFodder) {
        /* Pick the remnants art for this kill.  Variants supply their
           own remnants texture via variantSprites; raw fodder uses the
           slime splat.  Falls back to the slime sheet if the variant
           remnants haven't loaded yet -- unless the variant opts out
           via noFodderRemnants (e.g. mummy / skeleton, where a green
           slime splat would look out of place in Desert Winds). */
        /* v2.3.1691 (owner: "the slime remnants should be the same blue
           colour ... they are green"): `l.skull` carries whatever the kill
           reported, which for a zone-skinned monster is usually the BASE
           archetype ('fodder'), not the variant key ('blueSlime') — and
           MONSTER_VARIANTS has no 'fodder' entry, so `variant` came back null
           and the recolour branch below could never fire.  The splat stayed
           green under a blue slime for exactly the same reason the ball did:
           nobody resolved the zone's variant.  Resolve it the way the
           projectile path does, then fall back to the raw key. */
        const _zoneVarMap = ZONE_VARIANT_MAP[S.currentZone] || null;
        const _variantKey = (_zoneVarMap && _zoneVarMap[l.skull]) || l.skull;
        const variant = MONSTER_VARIANTS[_variantKey] || null;
        if (variant && variant.noFodderRemnants) continue;
        const variantSprites = variant ? variantSpritesFor(l.skull) : null;
        const variantRemnTex = variantSprites && variantSprites.remnants ? variantSprites.remnants.get() : null;
        /* v2.3.1534 (owner: "recolor the slimes AND slime remnants blue"):
           a slime variant that recolours its body recolours the splat it
           leaves too, or a blue slime dies into a green puddle.  The splat
           rides the same recoloured sheet set, so it is already warm from
           preloadZoneAssets and needs no tint of its own. */
        const recolorRemnTex = (variant && variant.recolor && hasRecoloredState(variant, 'remnants'))
          ? getRecoloredFrame(variant, 'remnants', 0)
          : null;
        const slimeRemnantsTex = hasSlimeState('remnants') ? getSlimeFrame('remnants', 0) : null;
        const remnTex = variantRemnTex || recolorRemnTex || slimeRemnantsTex;
        if (remnTex) {
          if (!l._pixiSprite || l._pixiSprite.destroyed) {
            const sp = new Sprite(remnTex);
            sp.anchor.set(0.5, 0.5);
            this.lootLayer.addChild(sp);
            l._pixiSprite = sp;
          }
          if (l._pixiSprite.texture !== remnTex) l._pixiSprite.texture = remnTex;
          l._pixiSprite.x = l.x;
          l._pixiSprite.y = l.y + bob;
          l._pixiSprite.alpha = alpha;
          /* Slime splat renders at 48 px on-screen; variant remnants
             use their own remnantsScalePx (default 48). */
          const targetPx = variantRemnTex ? (variant.remnantsScalePx || 48) : 48;
          l._pixiSprite.scale.set(targetPx / (l._pixiSprite.texture.width || targetPx));
          l._pixiSprite.visible = true;
          /* Coin sits ON TOP of the remnants when gold rides on this drop.
             10 px above center so the player can see there's gold to grab
             without picking up the skull blindly.  Non-owners get a
             grayed-out coin icon (no label) so they can see the pile
             exists but read it as "not yours". */
          const ownsThis = !l.recipients || !S.myId || l.recipients.includes(S.myId);
          if (l.coins || l.recipients) this._renderCoinOverlay(l, l.y - 10 + bob, alpha, ownsThis);
          /* Shard floats just above the coin (or above the remnants if
             there's no coin) so the player can read the zone-affiliation
             at a glance without picking up. */
          if (l.shard) this._renderShardOverlay(l, l.y - ((l.coins || l.recipients) ? 24 : 12) + bob, alpha);
          this._renderOwnerLabel(l, ownsThis, alpha);
          continue;
        }
      }

      const snowmanRemnantsTex = l.skull === 'snowman' ? getSnowmanRemnantsTex() : null;
      if (snowmanRemnantsTex) {
        /* Snowman death-scene sprite (pooled per loot).  Larger than the
           slime splat — the art is a full broken-snowman scene.  No
           bob and no expiry-fade: the art reads as a settled wreck on
           the ground, not a hovering pickup. */
        if (!l._pixiSprite || l._pixiSprite.destroyed) {
          const sp = new Sprite(snowmanRemnantsTex);
          sp.anchor.set(0.5, 0.5);
          this.lootLayer.addChild(sp);
          l._pixiSprite = sp;
        }
        l._pixiSprite.x = l.x;
        /* v2.3.191: +18 to match the PILE_Y_OFFSET in the non-snowman
           branch.  Snowman wrecks don't use `bob` so the offset has
           to be applied explicitly. */
        l._pixiSprite.y = l.y + 38;
        l._pixiSprite.alpha = 1;
        l._pixiSprite.scale.set(48 / (l._pixiSprite.texture.width || 128));
        l._pixiSprite.visible = true;
        /* Coin sits on top of the wreck when gold rides on this drop. */
        const snOwn = !l.recipients || !S.myId || l.recipients.includes(S.myId);
        if (l.coins || l.recipients) this._renderCoinOverlay(l, l.y - 14 + 38, alpha, snOwn);
        if (l.shard) this._renderShardOverlay(l, l.y - ((l.coins || l.recipients) ? 28 : 14) + 38, alpha);
        this._renderOwnerLabel(l, snOwn, alpha);
        continue;
      }

      /* Standard coin / xp drop — gold glow + multi-circle "stack" + count. */
      if (l.rare) {
        /* Rare loot — pulsing gold halo. */
        gfx.circle(l.x, l.y + bob, 16);
        gfx.fill({ color: 0xf5c542, alpha: 0.25 * alpha });
        gfx.circle(l.x, l.y + bob, 14);
        gfx.stroke({ color: 0xf5c542, width: 1.5, alpha: (0.4 + Math.sin(age * 4) * 0.3) * alpha });
      }
      if (l.coins || l.recipients) {
        /* Glow base.  Non-owners (l.recipients set but viewer not in
           the list) get a gray glow + grayscale-tinted coin icon so
           the pile reads as "someone else's drop" at a glance. */
        const ownsThis = !l.recipients || !S.myId || l.recipients.includes(S.myId);
        const glowColor = ownsThis ? 0xf5c542 : 0x666666;
        const glowAlpha = (ownsThis ? 0.3 : 0.18) * alpha;
        gfx.circle(l.x, l.y + bob, 10);
        gfx.fill({ color: glowColor, alpha: glowAlpha });
        /* Coin icon sprite (matches HUD/popup gold icon).  Falls back
           to the procedural multi-circle stack while the PNG is loading. */
        const goldTex = POPUP_ICONS.gold;
        if (goldTex) {
          if (!l._pixiSprite || l._pixiSprite.destroyed) {
            const sp = new Sprite(goldTex);
            sp.anchor.set(0.5, 0.5);
            this.lootLayer.addChild(sp);
            l._pixiSprite = sp;
          }
          l._pixiSprite.x = l.x;
          l._pixiSprite.y = l.y + 3 + bob;
          l._pixiSprite.alpha = (ownsThis ? 1 : 0.5) * alpha;
          l._pixiSprite.tint = ownsThis ? 0xffffff : 0x555555;
          l._pixiSprite.scale.set(14 / (l._pixiSprite.texture.width || 14));
          l._pixiSprite.visible = true;
        } else {
          gfx.circle(l.x - 3, l.y + 2 + bob, 4);
          gfx.fill({ color: 0xf5c542, alpha });
          gfx.circle(l.x + 2, l.y + 3 + bob, 3.5);
          gfx.fill({ color: 0xe8b830, alpha });
          gfx.circle(l.x, l.y + 4 + bob, 3);
          gfx.fill({ color: 0xd4a020, alpha });
        }
        /* "<n>G" label.  Owners only -- watchers don't know the
           recipient's per-share value and would otherwise see "0G". */
        if (ownsThis && l.coins) {
          if (!l._pixiLabel || l._pixiLabel.destroyed) {
            l._pixiLabel = new Text({ text: '', style: { ...LABEL_STYLE, fontSize: 7, fontWeight: '700', fill: '#f5c542' } });
            l._pixiLabel.anchor.set(0.5, 0);
            this.lootLayer.addChild(l._pixiLabel);
          }
          const cStr = l.coins + 'G';
          if (l._pixiLabel.text !== cStr) l._pixiLabel.text = cStr;
          l._pixiLabel.x = l.x;
          l._pixiLabel.y = l.y + 14 + bob;
          l._pixiLabel.alpha = alpha;
          l._pixiLabel.visible = true;
        } else if (l._pixiLabel && !l._pixiLabel.destroyed) {
          l._pixiLabel.visible = false;
        }
        this._renderOwnerLabel(l, ownsThis, alpha);
      }
      /* Shard overlay for the coin-pile branch -- non-fodder kills
         (stalker, hexer, volatile, etc.) don't hit the remnants
         branches above, so without this the shard would roll, land
         in the loot, but be invisible until pickup.  Sits above the
         coin sprite so the player can read both the gold count and
         the zone shard at a glance. */
      if (l.shard) this._renderShardOverlay(l, l.y - 15 + bob, alpha);
      if (l.xp) {
        gfx.circle(l.x + 6, l.y + bob, 3);
        gfx.fill({ color: 0x5b52ff, alpha });
      }
    }

    /* Orphan sweep -- anything we've rendered before that's no longer
       in the active loot list (picked up, despawned by gameplay code,
       removed via a non-_disposeLoot path, etc.) gets its Pixi
       children disposed.  Previously gated on
       `_knownLoot.size > activeLoot.size`, but that gate misses the
       common "old pile despawned, new pile spawned same tick" case --
       the counts match so the sweep was skipped and the old sprites
       stuck on the ground (user-reported v2.3.103 "stuck coin
       sprite").  Cheap to iterate every frame; the set is small. */
    for (const l of this._knownLoot) {
      if (!activeLoot.has(l)) {
        this._disposeLoot(l);
        this._knownLoot.delete(l);
      }
    }
  }

  /* ── Ground Splatter ── */
  _updateGroundSplatter(S) {
    const splatters = S.groundSplatter || [];
    if (splatters.length === this._lastSplatCount) return;
    this._lastSplatCount = splatters.length;

    const gfx = this.splatGfx;
    gfx.clear();
    for (const sp of splatters) {
      gfx.circle(sp.x, sp.y, sp.size || 3);
      gfx.fill({ color: cssToHex(sp.color || '#4a0000'), alpha: 0.3 });
    }
  }

  /* ── Gather Nodes ──
   * Per-node procedural body on the shared nodeGfx, plus pooled
   * Text objects on the node itself for the tier badge, the resource
   * emoji, and the 3-line proximity tooltip (shown when the player
   * is within 50 units).
   */
  _disposeNode(node) {
    /* Explicit removeFromParent before destroy: Pixi v8's Sprite.destroy()
       normally unparents the child, but in this codebase dead nodes were
       leaving zombie sprites on screen (harvested ore visually stuck
       around).  Belt-and-suspenders the unparent step. */
    const kill = (obj) => {
      if (!obj || obj.destroyed) return;
      if (obj.parent) obj.parent.removeChild(obj);
      obj.destroy();
    };
    kill(node._pixiTier);
    kill(node._pixiEmoji);
    kill(node._pixiTip1);
    kill(node._pixiTip2);
    kill(node._pixiTip3);
    kill(node._pixiSprite);
    node._pixiTier = node._pixiEmoji = node._pixiTip1 = node._pixiTip2 = node._pixiTip3 = node._pixiSprite = null;
  }

  _updateGatherNodes(S, now) {
    const gfx = this.nodeGfx;
    gfx.clear();

    /* v2.3.1680: HIDE what you cannot work.  A node you have no tool for is
       not drawn at all — the owner's "it only becomes visible after giving
       you the quest and equipment".  Filtered here rather than at the point
       the server payload is applied (nodeSync) so picking up the pickaxe
       makes rocks appear THAT FRAME, instead of on the next zone entry.
       The dispose pass below sees the filtered list too, so a node that
       becomes hidden tears its sprite down properly rather than orphaning it. */
    const _allNodes = S.gatherNodes || [];
    const _rpg = S.rpg || null;
    const nodes = _allNodes.filter((n) => hasGatherTool(_rpg, n.nodeType));

    /* v2.3.216: dispose orphaned sprites from the previous zone.
       _disposeNode only fires for nodes that are STILL in the array
       but flipped !alive -- when S.gatherNodes is replaced wholesale
       on a zone transition (e.g. meadow -> town), the previous
       zone's nodes vanish from the array but their _pixiSprite /
       _pixiTier / _pixiEmoji / _pixiTip* children stay parented in
       nodeLayer and keep rendering. Track which nodes had sprites
       on the last frame and dispose any that disappeared. */
    if (!this._renderedNodes) this._renderedNodes = new Set();
    const currentSet = new Set(nodes);
    for (const oldNode of this._renderedNodes) {
      if (!currentSet.has(oldNode)) this._disposeNode(oldNode);
    }
    this._renderedNodes = currentSet;
    /* Player position for proximity-tooltip distance test. */
    const px = S.player ? S.player.x : 0;
    const py = S.player ? S.player.y : 0;

    for (const node of nodes) {
      if (!node.alive) {
        /* Dead nodes stay in S.gatherNodes so the BroTown game-tick
           revive loop can flip alive=true after respawnAt elapses.
           Their Pixi sprite is torn down once on the first dead frame;
           a fresh sprite is created when the node revives. */
        /* On the first dead frame of an ore vein, kick off the one-shot
           break animation at the node's spot (before the sprite is torn
           down).  _breakPlayed guards against re-spawning every dead frame
           and is cleared when the node revives. */
        if (node.nodeType === 'oreVein' && !node._breakPlayed && ORE_BREAK_TEX) {
          this._spawnOreBreak(node, now);
        }
        node._breakPlayed = true;
        this._disposeNode(node);
        continue;
      }
      node._breakPlayed = false;

      /* Mining "stand here" marker: ore is gathered from one tile NORTH of the
         vein so the south-facing swing lines up over the rock. Twinkle the spot
         when the player is nearby; turns green once they're standing on it. */
      if (node.nodeType === 'oreVein') {
        /* v2.3.1501: the marker follows the rock's north edge, not a fixed tile
           offset -- the vein is solid now, so one tile north is INSIDE it (and
           was 4x inside it on a tier-10 rock, whose art is 310px tall).  Same
           derivation as oreStandSpot in BroTown.jsx. */
        const _sp = node._pixiSprite;
        const _top = (_sp && !_sp.destroyed && _sp.height > 2)
          ? _sp.y - _sp.height * (_sp.anchor ? _sp.anchor.y : 0.5)
          : node.y - TILE + 14;
        const sx = node.x, sy = _top - 14;
        const sd2 = (px - sx) * (px - sx) + (py - sy) * (py - sy);
        if (sd2 < 180 * 180) {
          const tw = 0.55 + 0.45 * Math.sin(now / 200 + node.x);
          const onSpot = sd2 < MINE_SPOT_R * MINE_SPOT_R;
          const col = onSpot ? 0x3dd497 : 0xffe27a;
          const r1 = 6 + 1.5 * Math.sin(now / 160);
          gfx.moveTo(sx - r1, sy); gfx.lineTo(sx + r1, sy);
          gfx.moveTo(sx, sy - r1); gfx.lineTo(sx, sy + r1);
          gfx.stroke({ color: col, width: 1.5, alpha: 0.5 + 0.4 * tw });
          gfx.circle(sx, sy, 1.6);
          gfx.fill({ color: col, alpha: 0.7 + 0.3 * tw });
          gfx.circle(sx, sy, 9);
          gfx.stroke({ color: col, width: 1, alpha: 0.22 + 0.22 * tw });
        }
      }

      const tier = node._tier;
      const tierLvl = node.gatherLvl || 1;
      const tierStep = Math.min(10, Math.max(1, Math.ceil(tierLvl / 10)));

      const spriteTex = NODE_SPRITE_TEX[node.nodeType];
      if (spriteTex) {
        if (!node._pixiSprite || node._pixiSprite.destroyed) {
          node._pixiSprite = new Sprite(spriteTex);
          node._pixiSprite.anchor.set(0.5, NODE_SPRITE_ANCHOR_Y[node.nodeType] ?? 0.5);
          /* Add at bottom of nodeLayer so the tier badge, emoji, and
             proximity tips (added with plain addChild elsewhere) stack
             above every sprite. */
          this.nodeLayer.addChildAt(node._pixiSprite, 0);
        }
        const targetH = (NODE_SPRITE_HEIGHT_BASE[node.nodeType] ?? 24) * (1 + (tierStep - 1) * 0.15);
        const baseScale = targetH / spriteTex.height;
        /* Restore the gentle breathe-pulse the old procedural pond had. */
        const pulse = node.nodeType === 'fishSpot' ? (1 + Math.sin(now / 600 + node.x) * 0.04) : 1;
        node._pixiSprite.scale.set(baseScale * pulse);
        node._pixiSprite.x = node.x;
        node._pixiSprite.y = node.y;
        /* v2.3.854: while THIS vein is the active mining target, render the
           ore ABOVE the player so it hides the baked rock in the south
           'mine' swing sheet -- the pickaxe then reads as striking the real
           ore.  Restored below the player (nodeLayer) otherwise. */
        const _mineEx = S._extraction;
        const _isMineTarget = !!(_mineEx && _mineEx.skill === 'mining'
          && (_mineEx.nodeRef === node || (_mineEx.nodeId != null && _mineEx.nodeId === node.id)));
        /* v2.3.1464 (owner): fishing holes go BEHIND monsters — a pond
           lies flat on the ground, so a monster walking over it should
           cover it (unlike trees/rocks, which stay in front since
           v2.3.1460).  groundLoot sits below entities; index 0 keeps
           dropped loot above the water. */
        /* v2.3.1500 (owner): trees render IN FRONT of the character, so
           walking behind one is occluded by it.  Only trees -- the active
           mining target keeps its overlayLayer promotion.
           v2.3.1593 (owner): "make monsters appear in front of ore" — ore
           moves from nodeLayer (above entities) to nodeBackLayer (below
           them).  Every node type now names its layer explicitly and the
           fallthrough is gone: with trees up, fish down and ore down, nothing
           was left on the old default, so an unnamed type silently landing
           above monsters would be a bug rather than a default. */
        const _wantLayer = _isMineTarget ? this.overlayLayer
          : node.nodeType === 'fishSpot' ? this.lootLayer
            : node.nodeType === 'tree' ? this.nodeFrontLayer
              : node.nodeType === 'oreVein' ? this.nodeBackLayer
                : this.nodeBackLayer;
        if (node._pixiSprite.parent !== _wantLayer) {
          if (_wantLayer === this.overlayLayer) _wantLayer.addChild(node._pixiSprite);
          else _wantLayer.addChildAt(node._pixiSprite, 0);
        }
      } else if (node.nodeType === 'tree') {
        /* v2.3.1275: procedural fallbacks get the same +50% as the
           sprites so nodes don't visibly shrink once textures resolve. */
        const tw = (tier?.trunkW || 3) * 1.5;
        const th = (tier?.trunkH || 8) * 1.5;
        const cr = (tier?.canopyR || 6) * 1.5;
        gfx.rect(node.x - tw / 2, node.y - th, tw, th);
        gfx.fill({ color: cssToHex(tier?.trunkColor || '#3a2810') });
        gfx.circle(node.x, node.y - th - cr * 0.5, cr);
        gfx.fill({ color: cssToHex(tier?.canopyColor || '#2a7a1a') });
      } else if (node.nodeType === 'fishSpot') {
        const pulse = Math.sin(now / 600 + node.x) * 0.2 + 1;
        const r = (tier?.size || 6) * 1.5 * pulse;
        gfx.circle(node.x, node.y, r);
        gfx.fill({ color: 0x3498db, alpha: 0.35 });
        gfx.circle(node.x, node.y, r * 0.6);
        gfx.fill({ color: 0x3498db, alpha: 0.2 });
      } else {
        const size = (tier?.size || 8) * 1.5;
        gfx.circle(node.x, node.y, size / 2);
        gfx.fill({ color: cssToHex(tier?.rockColor || '#6a6a6a') });
        gfx.circle(node.x + 2, node.y - 1, size / 4);
        gfx.fill({ color: cssToHex(tier?.streakColor || '#8a8a8a') });
      }

      /* HP bar — width scales with tier so high-tier nodes get a
         more visible damage indicator. */
      if (node.hp < node.maxHp) {
        const pct = node.hp / node.maxHp;
        const barW = 14 + tierStep * 4;
        gfx.rect(node.x - barW / 2, node.y + 8 + tierStep * 2, barW, 3);
        gfx.fill({ color: 0x000000, alpha: 0.5 });
        gfx.rect(node.x - barW / 2, node.y + 8 + tierStep * 2, barW * pct, 3);
        gfx.fill({ color: 0x3dd497 });
      }

      /* Tier badge — small dot to the upper-right with the gatherLvl
         number on top.  Always visible so the player can see which
         resources are higher level at a glance. */
      const tierColor = '#8B9695' /* v2.3.1233: Lantern common grey (was navy-palette #8890b8) */;   // RESOURCE_TIERS lookup happens in BroTown.jsx; default ok
      gfx.circle(node.x + 10 + tierStep * 2, node.y - 8, 4);
      gfx.fill({ color: cssToHex(tierColor), alpha: 0.9 });
      if (!node._pixiTier || node._pixiTier.destroyed) {
        node._pixiTier = new Text({
          text: '',
          style: { fontFamily: 'Source Sans 3, sans-serif', fontSize: 8, fontWeight: '700',
                   fill: '#ffffff', align: 'center' },
        });
        node._pixiTier.anchor.set(0.5, 0.5);
        this.nodeLayer.addChild(node._pixiTier);
      }
      const tierStr = String(tierLvl);
      if (node._pixiTier.text !== tierStr) node._pixiTier.text = tierStr;
      node._pixiTier.x = node.x + 10 + tierStep * 2;
      node._pixiTier.y = node.y - 7;

      /* Emoji label above the node — node.emoji set by gameplay code. */
      if (node.emoji) {
        if (!node._pixiEmoji || node._pixiEmoji.destroyed) {
          node._pixiEmoji = new Text({
            text: node.emoji,
            style: { ...LABEL_STYLE_EMOJI, fontSize: 8 + tierStep * 2 },
          });
          node._pixiEmoji.anchor.set(0.5, 1);
          this.nodeLayer.addChild(node._pixiEmoji);
        }
        if (node._pixiEmoji.text !== node.emoji) node._pixiEmoji.text = node.emoji;
        node._pixiEmoji.x = node.x;
        node._pixiEmoji.y = node.y - (10 + tierStep * 3);
      }

      /* Proximity tooltip — 3 lines of info shown when player is
         within 50 units.  Shown/hidden via .visible to avoid the
         per-frame Text construction cost. */
      const dx = px - node.x, dy = py - node.y;
      const near = dx * dx + dy * dy < 50 * 50;
      if (near) {
        const skill = node.skill || 'mining';
        const skillLabel = skill.charAt(0).toUpperCase() + skill.slice(1);
        const skillLvl = (S.rpg && S.rpg.lifeSkills && S.rpg.lifeSkills[skill]?.level) || 1;
        const verb = skill === 'woodcutting' ? 'Chop' : skill === 'fishing' ? 'Fish' : 'Mine';

        const yBase = node.y + 38 + tierStep * 2;
        const ensureTip = (key, text, color, dy) => {
          let t = node[key];
          if (!t || t.destroyed) {
            t = new Text({
              text: '',
              style: { fontFamily: 'Source Sans 3, sans-serif', fontSize: 7, fontWeight: '700',
                       fill: color, align: 'center' },
            });
            t.anchor.set(0.5, 0);
            this.nodeLayer.addChild(t);
            node[key] = t;
          }
          if (t.text !== text) t.text = text;
          t.style.fill = color;
          t.x = node.x;
          t.y = yBase + dy;
          t.visible = true;
        };
        ensureTip('_pixiTip1', node.spotName || node.name || '', '#ffffffb3', 0);
        ensureTip('_pixiTip2', `${node.name || ''} (Lv${tierLvl})`, '#ffffff80', 8);
        ensureTip('_pixiTip3', `${verb} (${skillLabel} Lv${skillLvl})`, '#3dd497', 16);
      } else {
        if (node._pixiTip1) node._pixiTip1.visible = false;
        if (node._pixiTip2) node._pixiTip2.visible = false;
        if (node._pixiTip3) node._pixiTip3.visible = false;
      }
    }

    this._advanceOreBreaks(now);
    this._advanceItemPops(now);
  }

  /* Snowman get-hit impact (v2.3.1124).  Combat code (melee/projectile hit
     sites + the peer monster_hit handler) stamps `m._impactAt` (and a size
     `m._impactScale`: 1 for melee/magic, 0.5 for arrows) on a snowman each
     time it's hit.  We spawn one flash per fresh stamp — tracking the last
     spawned timestamp on the monster dedups the own-hit local stamp against
     any later server echo (which only stamps peer hits), so a hit never
     double-flashes. */
  _updateMonsterImpacts(S, now) {
    const monsters = S && S.monsters;
    if (monsters) {
      for (let i = 0; i < monsters.length; i++) {
        const m = monsters[i];
        if (!m) continue;
        /* Kick the (lazy) sheet load as soon as a snowman is on screen, so the
           texture is ready before the first hit lands. */
        if (!_impactLoadStarted && (m.archetype || m.type) === 'snowman') ensureImpactTex();
        if (IMPACT_TEX && m._impactAt && m._impactAt !== m._impactSpawned) {
          m._impactSpawned = m._impactAt;
          /* Collapse near-simultaneous stamps so one hit can't double-flash. */
          if (now - (m._impactLastSpawn || 0) >= IMPACT_MIN_GAP_MS) {
            m._impactLastSpawn = now;
            this._spawnSnowmanImpact(m, m._impactScale || 1, now);
          }
        }
      }
    }
    this._advanceSnowmanImpacts(now);
  }

  _spawnSnowmanImpact(m, sizeMul, now) {
    if (!IMPACT_TEX) return;
    if (!this._snowmanImpacts) this._snowmanImpacts = [];
    const sp = new Sprite(IMPACT_TEX[0]);
    /* Anchor at the burst root so the plume pivots/erupts from one point. */
    sp.anchor.set(0.5, IMPACT_ROOT_Y);
    sp.scale.set((IMPACT_PLUME_H / IMPACT_CONTENT_H) * sizeMul);
    /* Rotate the up-pointing base art to point along the attack direction.
       Base art points up (-PI/2); rotation = attackAngle + PI/2 maps
       north->0, south->PI, east->PI/2, west->-PI/2.  No angle -> up. */
    const ang = (m._impactAngle != null ? m._impactAngle : -Math.PI / 2);
    sp.rotation = ang + Math.PI / 2;
    sp.x = (m.x != null ? m.x : m.renderX) || 0;
    sp.y = ((m.y != null ? m.y : m.renderY) || 0) - IMPACT_CENTER_DY;
    /* particleLayer renders above entities/player, so the flash sits over the
       snowman, and it's world-space so it lands at the snowman's position. */
    this.particleLayer.addChild(sp);
    this._snowmanImpacts.push({ sp, startedAt: now });
  }

  /* Advance + retire active snowman impacts: play the strip once, then dispose
     (an impact flash leaves nothing behind). */
  _advanceSnowmanImpacts(now) {
    const list = this._snowmanImpacts;
    if (!list || !list.length || !IMPACT_TEX) return;
    for (let i = list.length - 1; i >= 0; i--) {
      const fx = list[i];
      const t = now - fx.startedAt;
      if (t >= IMPACT_DURATION_MS || fx.sp.destroyed) {
        if (!fx.sp.destroyed) {
          if (fx.sp.parent) fx.sp.parent.removeChild(fx.sp);
          fx.sp.destroy();
        }
        list.splice(i, 1);
        continue;
      }
      const idx = Math.min(IMPACT_FRAMES - 1, Math.floor((t / IMPACT_DURATION_MS) * IMPACT_FRAMES));
      fx.sp.texture = IMPACT_TEX[idx];
    }
  }

  /* Spawn a one-shot ore-vein break animation at a depleted node.  Sized to
     match the static ore-vein sprite via the same tier-scaled target height. */
  _spawnOreBreak(node, now) {
    if (!ORE_BREAK_TEX) return;
    if (!this._oreBreaks) this._oreBreaks = [];
    const tierLvl = node.gatherLvl || 1;
    const tierStep = Math.min(10, Math.max(1, Math.ceil(tierLvl / 10)));
    const targetH = (NODE_SPRITE_HEIGHT_BASE.oreVein ?? 88) * (1 + (tierStep - 1) * 0.15);
    const sp = new Sprite(ORE_BREAK_TEX[0]);
    sp.anchor.set(0.5, ORE_BREAK_ANCHOR_Y);
    /* Strip frame is ORE_BREAK_FRAME tall but the rock only fills part of it,
       so divide by the filled fraction to match the static sprite's size. */
    sp.scale.set((targetH / (ORE_BREAK_FRAME * ORE_BREAK_FILL)) * ORE_BREAK_SCALE);
    sp.x = node.x;
    sp.y = node.y;
    this.nodeLayer.addChild(sp);
    this._oreBreaks.push({ sp, startedAt: now, x: node.x, y: node.y, popped: false });
  }

  /* A small icon that floats up out of a position and fades — "collected". */
  _spawnItemPopup(tex, x, y, now) {
    if (!tex) return;
    if (!this._itemPops) this._itemPops = [];
    const sp = new Sprite(tex);
    sp.anchor.set(0.5, 0.5);
    sp.scale.set(22 / (tex.height || 64));
    sp.x = x; sp.y = y;
    this.nodeLayer.addChild(sp);
    this._itemPops.push({ sp, startedAt: now, x, y });
  }

  /* Advance + retire floating item pops: rise ~30px and fade over ~900ms. */
  _advanceItemPops(now) {
    const list = this._itemPops;
    if (!list || !list.length) return;
    const LIFE = 900;
    for (let i = list.length - 1; i >= 0; i--) {
      const fx = list[i];
      const t = (now - fx.startedAt) / LIFE;
      if (t >= 1 || fx.sp.destroyed) {
        if (!fx.sp.destroyed) { if (fx.sp.parent) fx.sp.parent.removeChild(fx.sp); fx.sp.destroy(); }
        list.splice(i, 1);
        continue;
      }
      fx.sp.y = fx.y - 30 * t;
      fx.sp.alpha = t < 0.7 ? 1 : (1 - (t - 0.7) / 0.3);    /* hold then fade */
      const pop = 1 + Math.max(0, 0.4 - t) * 1.5;            /* quick scale-in */
      fx.sp.scale.set((22 / (fx.sp.texture.height || 64)) * pop);
    }
  }

  /* Advance + retire active ore-break animations.  Plays each strip once,
     holds the final "split halves" frame for a short beat, then disposes. */
  _advanceOreBreaks(now) {
    const list = this._oreBreaks;
    if (!list || !list.length || !ORE_BREAK_TEX) return;
    const HOLD_MS = 250;
    for (let i = list.length - 1; i >= 0; i--) {
      const fx = list[i];
      const t = now - fx.startedAt;
      if (t >= ORE_BREAK_DURATION_MS + HOLD_MS || fx.sp.destroyed) {
        if (!fx.sp.destroyed) {
          if (fx.sp.parent) fx.sp.parent.removeChild(fx.sp);
          fx.sp.destroy();
        }
        list.splice(i, 1);
        continue;
      }
      const idx = Math.min(ORE_BREAK_FRAMES - 1,
        Math.floor((Math.min(t, ORE_BREAK_DURATION_MS) / ORE_BREAK_DURATION_MS) * ORE_BREAK_FRAMES));
      fx.sp.texture = ORE_BREAK_TEX[idx];
      /* Right as the rock splits, pop the collected ore icon out of it. */
      if (!fx.popped && idx >= ORE_BREAK_SPLIT_FRAME) {
        fx.popped = true;
        this._spawnItemPopup(ORE_ICON_TEX, fx.x, fx.y - 6, now);
      }
    }
  }

  /* ── Harvest effect bursts (v2.3.1443) ──
   * Plays each queued S._fxBursts entry as a one-shot 8-frame strip at its
   * world point, then reaps it (sprite destroyed, entry spliced).  flip:-1
   * mirrors horizontally (wood chips fly away from the trunk). */
  _updateFxBursts(S, now) {
    const q = S && S._fxBursts;
    if (!q || !q.length) return;
    for (let i = q.length - 1; i >= 0; i--) {
      const b = q[i];
      const cfg = EFFECT_BURSTS[b.kind];
      const age = now - (b.t0 || now);
      if (!cfg || age >= FX_BURST_MS) {
        if (b._spr && !b._spr.destroyed) b._spr.destroy();
        q.splice(i, 1);
        continue;
      }
      if (!cfg.frames.length) continue;   /* strip still loading — burst waits */
      /* v2.3.1445: bursts may be scheduled slightly in the FUTURE (wood
         chips lead the delayed bite sample) — hold until t0 arrives. */
      if (age < 0) { if (b._spr) b._spr.visible = false; continue; }
      let spr = b._spr;
      if (!spr || spr.destroyed) {
        spr = new Sprite();
        spr.anchor.set(0.5, cfg.ay);
        this.overlayLayer.addChild(spr);
        b._spr = spr;
      }
      const fi = Math.min(7, Math.floor((age / FX_BURST_MS) * 8));
      spr.texture = cfg.frames[fi];
      const s = cfg.h / 256;
      spr.scale.set((b.flip || 1) * s, s);
      spr.x = b.x; spr.y = b.y;
      spr.alpha = age > FX_BURST_MS - 120 ? (FX_BURST_MS - age) / 120 : 1;
      spr.visible = true;
    }
  }

  /* ── Catch flight (v2.3.845) ──
   * v2.3.1429: DORMANT — applyFishingReward now uses the DOM icon flyer
   * (_flyResourceToInventory, real fish bag-icon + breach stage) instead of
   * queueing here; nothing pushes _catchFlights anymore.  Kept because the
   * pooled-canvas approach is the fallback if the DOM flyer ever misbehaves.
   * A caught fish pops out of the pond and arcs into the quick-bag.  Flights
   * are queued by applyFishingReward as { wx, wy (pond, world), t0, dur }.
   * Rendered as a 🐟 Text on overlayWorld (above the player); pooled so a
   * rapid string of catches reuses the same Text objects.  The bag landing
   * point is read live from #bt-bag-target's screen rect (falls back to the
   * bottom-left if the dashboard is collapsed).  overlayWorld is translated
   * by -camera, so screen positions are mapped back with + camera. */
  _updateCatchFlights(S, viewW, viewH, now) {
    const gfx = this.catchGfx;
    gfx.clear();
    const flights = S && S._catchFlights;
    if (!flights || !flights.length) return;
    const cam = S.camera || { x: 0, y: 0 };
    /* catchGfx lives on overlayWorld (scaled by the camera), so work in WORLD
       coords.  The bag is anchored in SCREEN (CSS) px -> convert to world:
       worldX = screenX / scaleX + camera.x. */
    const scaleX = S._worldScaleX || 1, scaleY = S._worldScaleY || 1;
    let bagSx = 56, bagSy = (viewH || 800) - 56;     /* screen px fallback (bottom-left) */
    try {
      /* v2.3.1293: the home grid only exists while the Bag sheet is
         open (three-state nav) — the toolbar Bag button is the landing
         point the rest of the time. */
      const bag = typeof document !== 'undefined' && (
        document.getElementById('bt-bag-target')
        || document.querySelector('.bt-dashboard-nav-button[aria-label="Bag"]'));
      if (bag) { const r = bag.getBoundingClientRect(); if (r.width) { bagSx = r.left + r.width / 2; bagSy = r.top + r.height / 2; } }
    } catch (e) { /* SSR / no DOM — keep fallback */ }
    const bagWx = bagSx / scaleX + cam.x;            /* bag, world coords */
    const bagWy = bagSy / scaleY + cam.y;
    const arcW = 64 / scaleY;                        /* ~64 screen px of arc */
    for (let i = flights.length - 1; i >= 0; i--) {
      const f = flights[i];
      const t = (now - f.t0) / (f.dur || 850);
      if (t >= 1 || t < 0) { if (t >= 1) flights.splice(i, 1); continue; }
      const e = t * t * (3 - 2 * t);                 /* smoothstep ease */
      const px = f.wx + (bagWx - f.wx) * e;          /* world position */
      const py = f.wy + (bagWy - f.wy) * e - Math.sin(Math.PI * t) * arcW;
      const sc = 1 - 0.6 * e;                        /* shrink into the bag */
      const a = t < 0.85 ? 1 : Math.max(0, 1 - (t - 0.85) / 0.15);
      const flop = Math.sin(now / 60 + i * 1.7) * 0.45;
      /* Little fish silhouette (world-sized; the layer scales it to screen):
         body + tail + eye, tail trailing back toward the pond. */
      const bodyR = (9 / scaleX) * sc;
      const tail = (9 / scaleX) * sc;
      const fy = py + flop * bodyR;                  /* vertical flop */
      gfx.ellipse(px, fy, bodyR, bodyR * 0.58);
      gfx.fill({ color: 0x6fc6e0, alpha: a });
      gfx.moveTo(px + bodyR * 0.5, fy);
      gfx.lineTo(px + bodyR * 0.5 + tail, fy - tail * 0.55);
      gfx.lineTo(px + bodyR * 0.5 + tail, fy + tail * 0.55);
      gfx.fill({ color: 0x4aa6c4, alpha: a });
      gfx.circle(px - bodyR * 0.45, fy - bodyR * 0.12, Math.max(0.8, (1.6 / scaleX) * sc));
      gfx.fill({ color: 0x09202c, alpha: a });
      /* tiny sparkle as it lands in the bag. */
      if (t > 0.82) {
        gfx.circle(bagWx, bagWy, (5 / scaleX) * (1 - (t - 0.82) / 0.18));
        gfx.stroke({ color: 0xfff2a8, width: 1.5, alpha: a });
      }
    }
  }

  /* ── Fishing bobber (v2.3.844) ──
   * While a fishing extraction is active, the player has been seated so the
   * baked rod line drops into the existing fish-spot pond (startExtraction).
   * Draw a little bobber + ripple at the pond center where the line enters
   * the water, so the cast reads as connected.  On 'ready' the bobber dips
   * and a brighter splash ring fires -- the "fish on!" tell that pairs with
   * the rotating reel cue.  Drawn on nodeGfx (above the pond sprite, which
   * is inserted at index 0 of nodeLayer). */
  _updateFishingHole(S, now) {
    const ex = S && S._extraction;
    if (!ex || ex.skill !== 'fishing') return;
    const node = (ex.nodeRef && ex.nodeRef.alive) ? ex.nodeRef
               : (S.gatherNodes && ex.nodeId ? S.gatherNodes.find(n => n.id === ex.nodeId) : null);
    if (!node) return;
    const gfx = this.nodeGfx;
    const hx = node.x, hy = node.y;
    const ready = ex.status === 'ready';
    /* Expanding ripple rings on the pond surface (perspective 2:1). */
    const rx = 12, ry = 6;
    for (let k = 0; k < 2; k++) {
      const t = ((now / (ready ? 700 : 1100)) + k * 0.5) % 1;
      const rr = 0.35 + t * 0.95;
      gfx.ellipse(hx, hy, rx * rr, ry * rr);
      gfx.stroke({ color: ready ? 0xfff2a8 : 0x9bd6f2, width: 1.5, alpha: 0.55 * (1 - t) });
    }
    /* Bobber where the line meets the water -- bobs gently, dips on 'ready'. */
    const bob = ready ? Math.abs(Math.sin(now / 110)) * 3 : Math.sin(now / 280) * 1.4;
    gfx.circle(hx, hy - 2 + bob, 2.4);
    gfx.fill({ color: 0xff4d4d, alpha: 0.95 });
    gfx.circle(hx, hy - 2 + bob, 2.4);
    gfx.stroke({ color: 0xffffff, width: 0.8, alpha: 0.7 });
  }

  /* ── Campfire (v2.3.853) ──
   * A client-local campfire lit by firemaking (S._campfire = {x,y,litAt,
   * expiresAt}); a cooking station that burns out after ~45s.  Procedural:
   * a charred-log base, a flickering flame, and a warm ground glow, drawn on
   * nodeGfx (camera-transformed).  Fades out over the last 4s. */
  _updateCampfire(S, now) {
    const cf = S && S._campfire;
    if (!cf || (cf.expiresAt && now > cf.expiresAt)) return;
    const gfx = this.nodeGfx;
    const x = cf.x, y = cf.y;
    const remain = cf.expiresAt ? cf.expiresAt - now : 99999;
    const a = remain < 4000 ? Math.max(0, remain / 4000) : 1;  // fade in last 4s
    /* warm ground glow */
    gfx.ellipse(x, y, 26, 9);
    gfx.fill({ color: 0xff8a3c, alpha: 0.16 * a });
    /* charred log base */
    gfx.roundRect(x - 16, y - 3, 32, 7, 3);
    gfx.fill({ color: 0x3a2a1c, alpha: 0.95 * a });
    /* flames — three flickering tongues */
    const fl = Math.sin(now / 90) * 0.5 + Math.sin(now / 47) * 0.5;
    for (let i = 0; i < 3; i++) {
      const fx = x + (i - 1) * 7;
      const h = (14 + (i === 1 ? 7 : 0)) * (0.85 + 0.15 * Math.sin(now / 70 + i * 2));
      gfx.moveTo(fx - 5, y - 1);
      gfx.quadraticCurveTo(fx + fl * 3, y - h, fx + 5, y - 1);
      gfx.fill({ color: i === 1 ? 0xffd24a : 0xff7a1e, alpha: 0.9 * a });
    }
    /* hot core */
    gfx.circle(x, y - 4, 4 + Math.sin(now / 60) * 1);
    gfx.fill({ color: 0xfff0b0, alpha: 0.85 * a });
    /* embers */
    if (S.hitParticles && Math.random() < 0.25 && a > 0.3) {
      S.hitParticles.push({ x: x + (Math.random() - 0.5) * 10, y: y - 6, vx: (Math.random() - 0.5) * 1.2, vy: -1 - Math.random() * 1.5, life: 0.6, color: '#ffb050', size: 1.2 });
    }
  }

  /* ── Firemaking animation (v2.3.853) ──
   * One-shot character animation at the player while S._firemaking is active
   * (set when a log is lit from the Bag); hidden otherwise. */
  _updateFiremaking(S, now) {
    if (this.fireSprite) this.fireSprite.visible = false;
    const fm = S && S._firemaking;
    if (!fm || !S.player || !this.fireSprite || !this._fireFrames.length) return;
    if (fm.doneAt && now > fm.doneAt) return;
    const FH = 154, FRAME_MS = 55;   /* v2.3.1435 (owner): 1.75x (88 -> 154) */
    const elapsed = now - (fm.startedAt || now);
    const fi = Math.min(this._fireFrames.length - 1, Math.floor(elapsed / FRAME_MS));
    const sp = this.fireSprite;
    sp.texture = this._fireFrames[fi];
    const FW = 161, FHH = 220, s = FH / FHH;
    sp.scale.set(s, s);
    sp.x = S.player.x;
    sp.y = S.player.y + 6;
    sp.visible = true;
    this._placeSkillTraitsOn('fire', sp, fi, 'south', false);
  }

  /* v2.3.1092: harvest stand-ins for OTHER players.  When a peer broadcasts a
     stand-in activity (other._ex === 'chop' | 'cook' | 'fire'), entityRenderer
     hides their body container; here we draw the matching full-character sprite
     at their position, the remote analogue of _updateExtractionCue's chopper /
     _updateExtractionCue's cook / _updateFiremaking's fire figure.  Per-player
     sprites are pooled by id (multiple peers can gather at once) and reused; a
     peer's sprites are destroyed when they leave.  mine/fish need no stand-in --
     those are body poses handled in entityRenderer.  Reuses the already-loaded
     _chopFrames / _cookFrames / _fireFrames strips.  Traits (hair/hat) are not
     composited onto the remote figure yet (generic body), unlike the local
     player's. */
  _updateRemoteExtraction(S, now) {
    if (!this._remoteSkillSprites) this._remoteSkillSprites = new Map();
    const pool = this._remoteSkillSprites;
    const others = (S && S.others) || {};
    const zone = (S && S.currentZone) || 'town';
    /* hide every pooled sprite up front; the active ones re-show below. */
    for (const ent of pool.values()) {
      if (ent.chop) ent.chop.visible = false;
      if (ent.cook) ent.cook.visible = false;
      if (ent.fire) ent.fire.visible = false;
      /* v2.3.1574: the head traits ride the same pool entry, so they have to
         drop with the figure — otherwise a peer's hat hangs in the air after
         they stop cooking, or follows them into another zone. */
      if (ent.traits) hideSkillTraits(ent.traits);
    }
    /* drawn-height / frame cadence -- copied from the LOCAL figures so a remote
       gatherer reads at the same size: chopper (_updateExtractionCue, 112px @
       45ms), cook (60ms), fire (_updateFiremaking, 55ms).  v2.3.1710: the drawn
       heights that used to be quoted here are gone — they were three
       generations stale and reading them was worse than looking, which is how
       chop stayed at 112 after the local figure went to 95.  The live numbers
       are in SPEC below, beside their local counterparts' version tags. */
    /* v2.3.1574: traitDir mirrors the direction each LOCAL figure composites
       its head traits at -- the chopper's source art faces EAST (see the
       _placeSkillTraitsOn('chop', …, 'east') call in _updateExtractionCue),
       cook and fire face south.  Getting this wrong puts a peer's hat on
       sideways rather than not at all, which is harder to spot. */
    const SPEC = {
      /* v2.3.1710: re-synced with the LOCAL figures, which is what this table
         has always claimed to be.  chop drifted when v2.3.1476 took the local
         chopper 112 -> 95 (owner: -15%) and never updated the copy here, so a
         peer's lumberjack has been rendering 18% larger than your own since
         then; cook follows the same pass's 82 -> 62.  If a local height moves
         again, move it here in the same edit — nothing enforces the link. */
      chop: { frames: this._chopFrames, h: 95, ms: 45, traitDir: 'east' },
      cook: { frames: this._cookFrames, h: 62, ms: 60, traitDir: 'south' },
      fire: { frames: this._fireFrames, h: 154, ms: 55, traitDir: 'south' }, /* v2.3.1435: 1.75x with the local figure */
    };
    for (const id in others) {
      const o = others[id];
      if (!o || o._isDead) continue;
      const code = o._ex;
      if (code !== 'chop' && code !== 'cook' && code !== 'fire') continue;
      if ((o.zone || o.z || 'town') !== zone) continue;
      const spec = SPEC[code];
      if (!spec.frames || !spec.frames.length) continue;
      let ent = pool.get(id);
      if (!ent) { ent = {}; pool.set(id, ent); }
      let sp = ent[code];
      if (!sp) {
        sp = new Sprite();
        sp.anchor.set(0.5, 1);          // bottom-centre stands on the ground
        this.nodeLayer.addChild(sp);
        ent[code] = sp;
      }
      const fi = Math.floor(now / spec.ms) % spec.frames.length;
      sp.texture = spec.frames[fi];
      const ox = (o.renderX != null ? o.renderX : o.x) || 0;
      const oy = (o.renderY != null ? o.renderY : o.y) || 0;
      /* v2.3.1574 (owner: "the scale looks off for other players cooking and
         starting fires - way too big").  The stand-in was sized in absolute
         pixels while the peer's BODY is scaled by the zone's perspective
         curve (entityRenderer applies _zonePscale to their container).  On a
         vista zone that curve runs to 0.03, so their body shrank to a speck
         and this figure stayed full size — a giant cook standing over a dot.
         Same curve, same position, so the two now shrink together. */
      const pscale = zonePlayerScale(zone, ox, oy, TILE);
      const s = (spec.h / 220) * pscale;
      sp.scale.set(s, s);
      sp.x = ox;
      sp.y = oy + 6 * pscale;                 /* foot offset shrinks with the figure */
      sp.visible = true;
      /* v2.3.1574 (owner: "doesn't reflect any trait items worn by them").
         The LOCAL figures composite the player's hair/beard/hat onto the
         stand-in's crown (_updateFiremaking -> _placeSkillTraitsOn); the
         remote path drew the bare strip, so a peer's whole head vanished
         while they cooked.  _placeSkillTraitsOnFor is the already-existing
         arbitrary-player form of that, used by the remote swing/bow
         stand-ins — reused here rather than grown a second time. */
      if (!ent.traits) {
        const mk = () => { const t = new Sprite(); t.visible = false; this.nodeLayer.addChild(t); return t; };
        ent.traits = { hair: mk(), beard: mk(), hat: mk() };
      }
      const looks = {
        hair: o.hair, hairColor: o.hairColor,
        facialhair: o.facialhair, facialHairColor: o.facialHairColor,
        headwear: o.headwear, hatColor: o.hatColor,
      };
      this._placeSkillTraitsOnFor(code, sp, fi, spec.traitDir, false, looks, ent.traits);
    }
    /* reap sprites for peers who left the room. */
    for (const [id, ent] of pool) {
      if (!others[id]) {
        if (ent.chop) ent.chop.destroy();
        if (ent.cook) ent.cook.destroy();
        if (ent.fire) ent.fire.destroy();
        /* v2.3.1574: reap the trait sprites too — they are added to the same
           layer, so leaking them on every peer who leaves is a slow leak. */
        if (ent.traits) for (const k in ent.traits) { if (ent.traits[k]) ent.traits[k].destroy(); }
        pool.delete(id);
      }
    }
  }

  /* ── Sword swing animation (v2.3.910) ──
   * Plays the owner's sword-swing at the player during a front-facing melee
   * swing.  entityRenderer._updatePlayer sets S._swordSwinging (and hides the
   * real body + weapon) when the swing is active and the player faces a front
   * arc; here we draw the stand-in and composite the traits onto its head.
   * v2.3.920: the south sheet covers south + southeast as-is and southwest
   * mirrored.  Self-contained: combat logic / hit detection are untouched. */
  /* v2.3.954: size-aware loader for an equipped armour layer during attacks.
     Reads the same gear/<slot>/<item>/<pose>-<dir>.png files as the body gear
     pipeline, but slices by the per-facing frame width (the attack frames aren't
     256).  Driven by getEquip(slot).  Returns null while loading / if missing. */
  _gearStripFrame(slot, item, pose, dir, fw, fi) {
    if (!item || item === 'none') return null;
    const key = slot + '/' + item + '/' + pose + '/' + dir;
    let e = this._gearStrips[key];
    if (e === undefined) {
      this._gearStrips[key] = 'loading';
      _fxLoad('/sprites/gear/' + slot + '/' + item + '/' + pose + '-' + dir + '.png?v=' + GEARLAYER_VER).then((tex) => {
        const n = Math.max(1, Math.round(tex.width / fw));
        const arr = [];
        for (let i = 0; i < n; i++) arr.push(new Texture({ source: tex.source, frame: new Rectangle(i * fw, 0, fw, tex.height) }));
        this._gearStrips[key] = arr;
      }).catch(() => { this._gearStrips[key] = []; });
      return null;
    }
    if (e === 'loading' || !e.length) return null;
    return e[Math.min(fi, e.length - 1)];
  }

  /* v2.3.1050: shared shirt-layer placement for the swing/bow stand-ins.
     Mirrors entityRenderer._placeGear's shirt rule: the white-base shirt sheet
     is shown only when a shirt trait is selected AND no chest plate is worn
     (the plate isn't a strict superset of the shirt silhouette), tinted to the
     player's chosen shirt colour.  `place` is the caller's transform helper.
     Returns nothing; toggles the sprite's visibility/texture/tint. */
  /* v2.3.1557 (owner: "when I just wear leg armor and use melee attack or bow
     attack I go shirtless").  The shirt has TWO stores that can disagree: the
     trait catalog (getShirt, localStorage 'bt-shirt') and the gear slot
     (getEquip('shirt')).  entityRenderer draws the idle/jog shirt from the GEAR
     SLOT (_placeGear is handed `shirt: getEquip('shirt')`), while every
     swing/bow/chop/cook stand-in in this file read the CATALOG -- so a player
     whose slot is set but whose catalog is not wears a shirt standing still and
     loses it the moment they attack.  Only the toggle in ItemDetailPopup writes
     both; character creation and trait restore write the catalog alone, so the
     two drift apart in normal use.
     Resolve from either store, preferring the catalog when it is set.  This can
     only ADD a shirt where one was missing -- it can never remove one -- so no
     existing look changes. */
  _shirtId() {
    const c = getShirt();
    if (c && c !== 'none') return c;
    const e = getEquip('shirt');
    return (e && e !== 'none') ? e : 'none';
  }

  _placeSwingShirt(spr, place, shirtId, chestId, gp, dir, fw, fi, colorId, tintId) {
    const hidden = chestId && chestId !== 'none';
    const tex = hidden ? null : this._gearStripFrame('shirt', shirtId, gp, dir, fw, fi);
    place(spr, tex);
    if (tex) {
      /* v2.3.1558 (owner: "he was wearing a white shirt and when he swung the
         sword the shirt changed to blue") -- my own regression from v2.3.1557.
         shirtFill returns NULL for a 'none' id, and a null tint means WHITE, so
         the idle renderer draws a white tee whenever the CATALOG says 'none'
         (entityRenderer resolves its tint as shirtFill(getShirt(),
         getShirtColor()) even though it picks the SHEET from the gear slot).
         v2.3.1557 made the swing fall back to the gear slot for the id, which
         fixed the shirt vanishing but also made the id non-none HERE -- so
         shirtFill stopped returning null and fell through to
         SHIRT_DEFAULT_RGB, the #3a5bd0 blue.
         So the two ids must stay separate: `shirtId` chooses which SHEET to
         draw, `tintId` reproduces the idle path's colour exactly -- the catalog
         id locally, the networked id for a remote player. */
      const t = shirtFill(tintId !== undefined ? tintId : shirtId, colorId);
      spr.tint = t ? ((t[0] << 16) | (t[1] << 8) | t[2]) : 0xffffff;
    }
  }

  /* v2.3.1011: recolor the sword swing BODY sheet to an arbitrary player's
     skin/pants/shoes (parallel to _bakeBodyStrip, which only does the LOCAL
     player) and cache it.  Returns the per-frame Texture[] or null while the
     base image is still loading. */
  _remoteBodyFramesFor(o, cfgKey, cfg) {
    if (!this._remoteBodyCache) this._remoteBodyCache = new Map();
    const key = cfgKey + '|' + o.skin + '|' + o.pants + '|' + o.shoes;
    let arr = this._remoteBodyCache.get(key);
    if (arr) return arr;
    const img = this._bodyImgCache[cfg.bodyUrl];   // loaded by the local bake
    if (!img) return null;
    try {
      const cv = recolorBodyToCanvas(img, skinTarget(o.skin), pantsTarget(o.pants), shoesTarget(o.shoes), null, cfg.fh);
      const source = Texture.from(cv).source; source.scaleMode = 'linear';
      const n = Math.max(1, Math.round(cv.width / cfg.fw));
      arr = [];
      for (let i = 0; i < n; i++) arr.push(new Texture({ source, frame: new Rectangle(i * cfg.fw, 0, cfg.fw, cfg.fh) }));
      this._remoteBodyCache.set(key, arr);
      return arr;
    } catch (e) { return null; }
  }

  /* v2.3.1087: recolor ANY already-loaded body-style sheet (torso strip / jog-leg
     sheet) to a remote player's combo, sliced into fw-wide frames.  Mirrors
     _remoteBodyFramesFor but generic over url/fw/fh.  The source image must have
     been loaded into _bodyImgCache by the local bake (it is: bow torso strips +
     jog-<dir>-legs sheets are loaded at construction). */
  _remoteSheetFramesFor(o, url, fw, fh) {
    if (!this._remoteSheetCache) this._remoteSheetCache = new Map();
    const key = url + '|' + o.skin + '|' + o.pants + '|' + o.shoes;
    let arr = this._remoteSheetCache.get(key);
    if (arr) return arr;
    const img = this._bodyImgCache[url];
    if (!img) return null;
    try {
      const cv = recolorBodyToCanvas(img, skinTarget(o.skin), pantsTarget(o.pants), shoesTarget(o.shoes), null, fh);
      const source = Texture.from(cv).source; source.scaleMode = 'linear';
      const n = Math.max(1, Math.round(cv.width / fw));
      arr = [];
      for (let i = 0; i < n; i++) arr.push(new Texture({ source, frame: new Rectangle(i * fw, 0, fw, fh) }));
      this._remoteSheetCache.set(key, arr);
      return arr;
    } catch (e) { return null; }
  }

  /* v2.3.1087: shared jog-legs placement for the bow stand-in -- used by BOTH the
     local player (_updateBowShot) and remote players (_updateRemoteBowShots) so
     they look identical (MP parity).  Positions the bare-leg sprite `jl` (cropped,
     only when no leg armour) and the leg-armour sprite `jg`, aligned so the legs'
     waist row lands on the torso's CUT row at the torso's own scale `s`.  See
     docs/specs/jog-legs-attack-composite.md.  All the owner-tuned per-facing knobs
     live HERE (one source of truth). */
  _placeJogLegs(jl, jg, opts) {
    const { legTex, gearFrame, cutRow, jdir, jfr, mir, s, x, footY, feetY, hasLegArmour, weapon = 'bow', seamLift = 0, torsoScale = 1, legSizeAdj = 1, legShiftX = 0, legShiftY = 0 } = opts;
    const _LEG_LIFT = 12;   // frame px the legs ride above the torso cut (closes seam)
    const _ov = 10;         // frame px of leg drawn UP under the torso
    /* per-facing DOWNWARD nudge (frame px, sword only for now; southwest covers SE
       via mirror, east covers west). */
    const _DOWN = weapon === 'sword' ? ({ south: 20, southwest: 20, east: 20 }) : {};
    /* v2.3.1096: seamLift raises the legs further UP into the torso (frame px) to
       close the naked east/south sword seam without moving the torso.
       v2.3.1097: torsoScale scales the (cutRow-feetY) term so the legs track a
       SIZE-scaled torso's waist (naked east 1.15x) while keeping their own size. */
    const _yMeet = footY + (cutRow - feetY) * s * torsoScale - (_LEG_LIFT + seamLift) * s + (_DOWN[jdir] || 0) * s;
    /* per-facing knobs -- own tunable set per weapon.  The SWORD seeds from the
       bow's corrections (same leg art) and can diverge as the owner calibrates. */
    const _SIZE = weapon === 'sword'
      ? { east: 1.36, southwest: 0.90, north: 0.90 }
      : { east: 1.36, southwest: 0.90, north: 0.90 };
    const _NUDGE = weapon === 'sword' ? { east: 10 } : { east: 10 };
    const _legMul = ({ southwest: 1.12, northeast: 1.12 })[jdir] || 1;     // diagonal gap fill (shared)
    const _legSizeMul = _SIZE[jdir] || 1;                                  // per-facing size trim
    const _legScale = s * _legMul * _legSizeMul * legSizeAdj;              // legSizeAdj: naked-only caller tweak
    const _legNudgeX = _NUDGE[jdir] || 0;                                  // per-facing x line-up
    const _legDX = mir * _legNudgeX * _legScale;
    const _waist = jogWaistRow(jdir, jfr);
    if (legTex && jl && !hasLegArmour) {
      const TOP = Math.max(0, _waist - _ov);
      let cache = this._legSubCache || (this._legSubCache = new WeakMap());
      let cropped = cache.get(legTex);
      if (!cropped) {
        try { const f = legTex.frame; cropped = new Texture({ source: legTex.source, frame: new Rectangle(f.x, f.y + TOP, f.width, f.height - TOP) }); }
        catch (e) { cropped = legTex; }
        cache.set(legTex, cropped);
      }
      jl.texture = cropped;
      jl.anchor.set(0.5, (_waist - TOP) / (256 - TOP));
      jl.scale.set(mir * _legScale, _legScale); jl.x = x + _legDX + legShiftX; jl.y = _yMeet + legShiftY; jl.tint = 0xffffff; jl.visible = true;
    } else if (jl) { jl.visible = false; }
    if (gearFrame && jg) {
      /* v2.3.1453 (owner: "jog while swinging makes the leg armor
         disappear or super tiny; happens to arrow shooting while
         jogging also"): v2.3.1434 stores the jog gear sheets at their
         on-disk 128px frames (exact-texel memory cut), and patched the
         main-body consumer (_placeGear's _gnorm) — but THIS third
         consumer kept applying its 256-calibrated _legScale
         (s = bodyH/188) to the now-half-size texture, rendering the
         greaves at exactly half linear size during every MOVING swing
         and bow shot (the bare legs underneath stay suppressed when
         armour is worn, so below the hip there was a half-size metal
         fragment and then nothing).  Normalize by the texture's OWN
         frame size, the same _gnorm pattern: identity for 256-native
         sheets, ×2 for the 128 generation — covers all four call
         sites (sword+bow, local+remote) through this one helper.
         legTex needs no term: the jog-<dir>-legs.png bare-leg sheets
         load at an explicit {fw:256, fh:256} and never shrank. */
      const _gn = 256 / ((gearFrame.frame && gearFrame.frame.width) || 256);
      jg.texture = gearFrame; jg.anchor.set(0.5, _waist / 256); jg.scale.set(mir * _legScale * _gn, _legScale * _gn); jg.x = x + _legDX + legShiftX; jg.y = _yMeet + legShiftY; jg.tint = 0xffffff; jg.visible = true;
    }
    else if (jg) { jg.visible = false; }
  }

  /* v2.3.1011: render OTHER players' sword/greatsword swing stand-in so the
     attack looks the same to everyone (MP parity).  SLICE 1 = body only
     (recolored to their skin); armor / weapon / hair-hat layer on in
     follow-ups, and the normal remote body is hidden then.  Driven by the
     broadcast other._swingTs / _swingWpn / _swingAng (Phase 1).
     REMOTE_SWING_SCALE / _FOOT_DY are first-cut tunables to confirm on the
     preview (the remote draw scale ~ bodyDirScale*0.421875 ≈ 0.42). */
  /* Lazily allocate a remote player's stand-in sprite SET (body + armour +
     weapon + the 3 head-trait sprites), z-ordered by creation order. */
  _ensureRemoteSwordSet(id) {
    let set = this._remoteSwordSprites.get(id);
    if (!set) {
      const mk = () => { const s = new Sprite(); s.visible = false; this.nodeLayer.addChild(s); return s; };
      /* v2.3.1088: jogLegs/jogLegsGear first so they sit UNDER the body (torso in
         front).
         v2.3.1710: `legs` now comes BEFORE `shirt` — the literal's key order is
         the mk() call order, which is the addChild order, which is the z-order,
         so this line alone puts a peer's shirt in front of their greaves the way
         the owner asked for the local character. */
      set = { jogLegs: mk(), jogLegsGear: mk(), body: mk(), legs: mk(), shirt: mk(), chest: mk(), weapon: mk(), traits: { hair: mk(), beard: mk(), hat: mk() } };
      this._remoteSwordSprites.set(id, set);
    }
    return set;
  }

  /* Parameterized version of _placeSkillTraitsOn: composites an ARBITRARY
     player's hair/beard/hat (`looks`) at the swing-frame crown, onto their own
     trait sprites. */
  _placeSkillTraitsOnFor(skillKey, sp, fi, dir, mirror, looks, traitSprites) {
    const data = this._skillCrowns && this._skillCrowns[skillKey];
    if (!data || !data.crowns || !data.crowns.length) { hideSkillTraits(traitSprites); return; }
    const cr = data.crowns[Math.min(fi, data.crowns.length - 1)];
    if (!cr) { hideSkillTraits(traitSprites); return; }
    const cwx = sp.x + (cr[0] - data.fw / 2) * sp.scale.x;
    const cwy = sp.y + (cr[1] - data.fh) * sp.scale.y;
    const scaleVal = Math.abs(sp.scale.y) * (this._skillTraitMul[skillKey] || 1);
    placeSkillTraitsFor(traitSprites, looks, cwx, cwy, dir, mirror, scaleVal);
  }

  _updateRemoteSwordSwings(S, now) {
    /* First-cut tunables to confirm on the preview (remote draw scale ≈ 0.42). */
    const REMOTE_SWING_SCALE = 0.45;
    const REMOTE_SWING_FOOT_DY = 0;
    if (!this._remoteSwordSprites) this._remoteSwordSprites = new Map();
    const others = (S && S.others) || {};
    const active = new Set();
    const activeSlash = new Set();
    for (const id in others) {
      const o = others[id];
      if (!o) continue;
      const wpn = o._swingWpn;
      const isMelee = !wpn || wpn === 'sword' || wpn === 'greatsword';
      const elapsed = now - (o._swingTs || 0);
      if (!isMelee || elapsed < 0 || elapsed >= SWORD_SWING_MS) continue;
      const ang = (typeof o._swingAng === 'number') ? o._swingAng : 0;
      /* v2.3.1396: painted crescent for a remote SPECIAL swing — placed
         before the facing gates below so it shows on every aim angle
         (same rule as the local slash in _updateSwordSwing). */
      if (o._swingSpecial && SWORD_SLASH.frames.length) {
        let spx = this._remoteSlashSprites.get(id);
        if (!spx || spx.destroyed) {
          spx = new Sprite(SWORD_SLASH.frames[0]);
          spx.anchor.set(0.5, 0.5);
          this.nodeLayer.addChild(spx);
          this._remoteSlashSprites.set(id, spx);
        }
        const _sp = Math.max(0, Math.min(1, elapsed / SWORD_SWING_MS));
        const _sfr = SWORD_SLASH.frames[Math.min(3, Math.floor(_sp * 4))];
        if (spx.texture !== _sfr) spx.texture = _sfr;
        const _sox = (o.renderX != null) ? o.renderX : o.x;
        const _soy = (o.renderY != null) ? o.renderY : o.y;
        spx.x = _sox + Math.cos(ang) * GS_OUTER_RADIUS * 0.85;
        spx.y = _soy - 10 + Math.sin(ang) * GS_OUTER_RADIUS * 0.85;
        spx.rotation = ang + Math.PI;
        spx.scale.set((GS_OUTER_RADIUS * 2.2) / 128);
        spx.alpha = 0.95;
        spx.visible = true;
        activeSlash.add(id);
      }
      const sdx = Math.cos(ang), sdy = Math.sin(ang);
      const dir4 = Math.abs(sdx) >= Math.abs(sdy) ? (sdx >= 0 ? 'east' : 'west') : (sdy >= 0 ? 'south' : 'north');
      const fmap = this._swordFacing[dir4];
      if (!fmap) continue;
      const cfgKey = fmap[0], mirror = fmap[1];
      const cfg = this._swordCfg[cfgKey];
      if (!cfg || !cfg.bodyUrl) continue;
      /* v2.3.1100: MP parity for the naked sword-swing seam tuning -- mirror the
         per-facing knobs from the local _updateSwordSwing so OTHER players see
         the same gap-free composite. Gated on the remote's NAKED state (no chest
         / leg armour); keyed by the swing facing (cfgKey). */
      const eq = o.equip || {};
      const _nakedSeam = (!eq.chest || eq.chest === 'none') && (!eq.legs || eq.legs === 'none');
      const _seamLift = _nakedSeam ? (({ east: 10, south: 10 })[cfgKey] || 0) : 0;
      const _torsoOnlyAdj = _nakedSeam ? (({ east: 1.15 })[cfgKey] || 1) : 1;
      const _torsoDY = _nakedSeam ? (({ east: 5, south: 5 })[cfgKey] || 0) : 0;
      const _legSizeAdj = _nakedSeam ? (({ south: 1.20, east: 1.10, north: 1.12 })[cfgKey] || 1) : 1;
      const _legShiftX = _nakedSeam ? (({ north: 0, south: 3 })[cfgKey] || 0) : 0;
      const _legShiftY = _nakedSeam ? (({ south: 2 })[cfgKey] || 0) : 0;
      const bodyFrames = this._remoteBodyFramesFor(o, cfgKey, cfg);
      if (!bodyFrames || !bodyFrames.length) continue;
      const n = bodyFrames.length;
      const fi = Math.max(0, Math.min(n - 1, Math.floor((elapsed / SWORD_SWING_MS) * n)));
      const set = this._ensureRemoteSwordSet(id);
      const sp = set.body;
      const anchorY = cfg.feetY / cfg.fh;
      const sY = REMOTE_SWING_SCALE;
      /* v2.3.1088: jogging legs while this remote is MOVING -- swap the body to the
         leg-erased torso strip and composite jog legs under it (same as the bow).
         v2.3.1093: legs face the SAME direction as the torso (the swing facing
         dir4), not the remote's movement facing -- upper/lower body aligned. */
      const _stale = !o._lastUpdate || (now - o._lastUpdate) > 150;
      const _vmag = Math.max(Math.abs(o._smoothVx || 0), Math.abs(o._smoothVy || 0));
      const _moving = !_stale && _vmag > 0.03;
      const _rd = resolveDirection(dir4);
      const _jdir = _rd.dir, _rmir = _rd.mirror ? -1 : 1;
      const _torsoFrames = cfg.torsoUrl ? this._remoteSheetFramesFor(o, cfg.torsoUrl, cfg.fw, cfg.fh) : null;
      const _legArr = this._remoteSheetFramesFor(o, '/sprites/player/jog-' + _jdir + '-legs.png', 256, 256);
      const _jog = !!(_moving && _torsoFrames && _torsoFrames[fi] && _legArr && _legArr.length);
      sp.anchor.set(0.5, anchorY);
      sp.texture = _jog ? _torsoFrames[fi] : bodyFrames[fi];
      /* v2.3.1100: naked east grows the torso (sT) with the legs re-anchoring via
         torsoScale; the torso also drops by _torsoDY while the legs keep the
         un-nudged foot row (_baseFootY). */
      const sT = sY * _torsoOnlyAdj;
      const sgnT = mirror ? -(sY * _torsoOnlyAdj) : (sY * _torsoOnlyAdj);
      sp.scale.set(sgnT, sT);
      const _baseFootY = ((o.renderY != null) ? o.renderY : o.y) + REMOTE_SWING_FOOT_DY;
      sp.x = (o.renderX != null) ? o.renderX : o.x;
      sp.y = _baseFootY + _torsoDY;
      sp.visible = true;
      /* overlay helper: same transform as the body sprite. */
      const place = (spr, tex) => {
        if (!spr) return;
        if (!tex) { spr.visible = false; return; }
        spr.anchor.set(0.5, anchorY); spr.texture = tex; spr.scale.set(sgnT, sT);
        spr.x = sp.x; spr.y = sp.y; spr.visible = true;
      };
      const gp = cfg.gearPose || 'swing';
      /* v2.3.1050: their tinted shirt under-layer (folder always 'tshirt' when shirted). */
      const oShirt = (eq.shirt !== undefined) ? eq.shirt : ((o.shirt && o.shirt !== 'none') ? 'tshirt' : 'none');
      this._placeSwingShirt(set.shirt, place, oShirt, eq.chest, gp, cfgKey, cfg.fw, fi, o.shirtColor, o.shirt || 'tshirt');
      place(set.legs, _jog ? null : this._gearStripFrame('legs', eq.legs, gp, cfgKey, cfg.fw, fi));
      place(set.chest, this._gearStripFrame('chest', eq.chest, gp, cfgKey, cfg.fw, fi));
      const weaponFrames = this._swordWeaponFrames[cfgKey];
      place(set.weapon, weaponFrames && weaponFrames[fi]);
      /* v2.3.1047: north swings hold the blade on the far side -> behind body. */
      this._orderSwingWeapon(set.weapon, set.body, set.chest, cfgKey === 'north');
      /* their hair / beard / hat at the swing-frame crown anchor. */
      const looks = {
        hair: o.hair, hairColor: o.hairColor,
        facialhair: o.facialhair, facialHairColor: o.facialHairColor,
        headwear: o.headwear, hatColor: o.hatColor,
      };
      this._placeSkillTraitsOnFor(cfg.crownKey, sp, fi, cfg.traitDir || 'south', mirror, looks, set.traits);
      /* composite the jog legs under the torso strip (or hide them). */
      if (_jog) {
        const _fc = jogFrameCount('jog', _jdir) || 24;
        const _armoredCad = eq.chest && eq.chest !== 'none' && eq.legs && eq.legs !== 'none';
        const _cyc = (jogCycleMs('jog', _jdir, _armoredCad) || 700) * 2;
        const _raw = Math.floor((now / _cyc) * _fc) % _fc;
        const _d = (o._smoothVx || 0) * Math.cos(ang) + (o._smoothVy || 0) * Math.sin(ang);   // backpedal when moving opposite the swing
        const _jfr = _d < 0 ? ((_fc - 1) - _raw) : _raw;
        const legTex = _legArr[((_jfr % _legArr.length) + _legArr.length) % _legArr.length];
        this._placeJogLegs(set.jogLegs, set.jogLegsGear, {
          legTex, gearFrame: getGearFrame('legs', eq.legs, 'jog', _jdir, _jfr),
          cutRow: swordTorsoCutRow(cfgKey, fi), jdir: _jdir, jfr: _jfr, mir: _rmir, s: sY, x: sp.x, footY: _baseFootY,
          feetY: cfg.feetY, hasLegArmour: !!(eq.legs && eq.legs !== 'none'), weapon: 'sword',
          seamLift: _seamLift, torsoScale: _torsoOnlyAdj, legSizeAdj: _legSizeAdj, legShiftX: _legShiftX, legShiftY: _legShiftY,
        });
      } else { set.jogLegs.visible = false; set.jogLegsGear.visible = false; }
      active.add(id);
    }
    /* Hide non-swinging sets; destroy sets for players who left (no leak). */
    for (const [id, set] of this._remoteSwordSprites) {
      if (active.has(id)) continue;
      set.body.visible = set.shirt.visible = set.chest.visible = set.legs.visible = set.weapon.visible = false;
      set.jogLegs.visible = set.jogLegsGear.visible = false;
      hideSkillTraits(set.traits);
      if (!others[id]) {
        for (const s of [set.jogLegs, set.jogLegsGear, set.body, set.shirt, set.legs, set.chest, set.weapon, set.traits.hair, set.traits.beard, set.traits.hat]) {
          try { s.destroy(); } catch (e) {}
        }
        this._remoteSwordSprites.delete(id);
      }
    }
    /* v2.3.1396: hide/reap the remote crescents the same way. */
    for (const [id, spx] of this._remoteSlashSprites) {
      if (activeSlash.has(id)) continue;
      spx.visible = false;
      if (!others[id]) {
        try { spx.destroy(); } catch (e) {}
        this._remoteSlashSprites.delete(id);
      }
    }
  }

  _ensureRemoteBowSet(id) {
    if (!this._remoteBowSprites) this._remoteBowSprites = new Map();
    let set = this._remoteBowSprites.get(id);
    if (!set) {
      const mk = () => { const s = new Sprite(); s.visible = false; this.nodeLayer.addChild(s); return s; };
      /* v2.3.1087: jogLegs/jogLegsGear created FIRST so they sit UNDER the body
         (torso in front), matching the local player.
         v2.3.1710: `legs` before `shirt`, in step with the local bow stand-in
         and _ensureRemoteSwordSet — see the note there on why key order is
         z-order. */
      set = { jogLegs: mk(), jogLegsGear: mk(), body: mk(), legs: mk(), shirt: mk(), chest: mk(), weapon: mk(), traits: { hair: mk(), beard: mk(), hat: mk() } };
      this._remoteBowSprites.set(id, set);
    }
    return set;
  }

  /* v2.3.1011: OTHER players' bow-draw stand-in (MP parity).  Same per-player
     pooled-sprite + recolor approach as the sword swing, driven by the
     broadcast other._bowShotAt / _bowShotAng (Phase 1). */
  _updateRemoteBowShots(S, now) {
    const REMOTE_BOW_SCALE = 0.45;
    const REMOTE_BOW_FOOT_DY = 0;
    const SECTORS8 = ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'];
    if (!this._remoteBowSprites) this._remoteBowSprites = new Map();
    const others = (S && S.others) || {};
    const active = new Set();
    for (const id in others) {
      const o = others[id];
      if (!o || !o._bowShotAt) continue;
      const elapsed = now - o._bowShotAt;
      if (elapsed < 0 || elapsed >= BOW_SHOT_MS) continue;
      const ang = (typeof o._bowShotAng === 'number') ? o._bowShotAng : 0;
      const dir8 = SECTORS8[((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8];
      const fmap = this._bowFacing[dir8];
      if (!fmap) continue;
      const cfgKey = fmap[0], mirror = fmap[1];
      const cfg = this._bowCfg[cfgKey];
      if (!cfg || !cfg.bodyUrl) continue;
      const bodyFrames = this._remoteBodyFramesFor(o, cfgKey, cfg);
      if (!bodyFrames || !bodyFrames.length) continue;
      const n = bodyFrames.length;
      const fi = elapsed < BOW_RELEASE_MS
        ? Math.max(0, Math.min(n - 2, Math.floor((elapsed / BOW_RELEASE_MS) * (n - 1))))
        : n - 1;
      const set = this._ensureRemoteBowSet(id);
      const sp = set.body;
      const anchorY = cfg.feetY / cfg.fh;
      const sY = REMOTE_BOW_SCALE;
      const sgnX = mirror ? -sY : sY;
      /* v2.3.1087: jogging legs while this remote is MOVING -- swap the body to the
         leg-erased torso strip and composite recolored jog legs under it (same
         _placeJogLegs helper + tuning as the local player).  Gate on the remote's
         broadcast velocity.  v2.3.1093: legs face the SAME direction as the torso
         (the shot facing dir8), not the remote's movement facing, so upper and
         lower body stay aligned per facing. */
      const _stale = !o._lastUpdate || (now - o._lastUpdate) > 150;
      const _vmag = Math.max(Math.abs(o._smoothVx || 0), Math.abs(o._smoothVy || 0));
      const _moving = !_stale && _vmag > 0.03;
      const _rd = resolveDirection(dir8);
      const _jdir = _rd.dir, _rmir = _rd.mirror ? -1 : 1;
      const _torsoFrames = cfg.torsoUrl ? this._remoteSheetFramesFor(o, cfg.torsoUrl, cfg.fw, cfg.fh) : null;
      const _legArr = this._remoteSheetFramesFor(o, '/sprites/player/jog-' + _jdir + '-legs.png', 256, 256);
      const _jog = !!(_moving && _torsoFrames && _torsoFrames[fi] && _legArr && _legArr.length);
      sp.anchor.set(0.5, anchorY);
      sp.texture = _jog ? _torsoFrames[fi] : bodyFrames[fi];
      sp.scale.set(sgnX, sY);
      sp.x = (o.renderX != null) ? o.renderX : o.x;
      sp.y = ((o.renderY != null) ? o.renderY : o.y) + REMOTE_BOW_FOOT_DY;
      sp.visible = true;
      const place = (spr, tex) => {
        if (!spr) return;
        if (!tex) { spr.visible = false; return; }
        spr.anchor.set(0.5, anchorY); spr.texture = tex; spr.scale.set(sgnX, sY);
        spr.x = sp.x; spr.y = sp.y; spr.visible = true;
      };
      const gp = cfg.gearPose || 'bowshot';
      const eq = o.equip || {};
      /* v2.3.1050: their tinted shirt under-layer (folder always 'tshirt' when shirted). */
      const oShirt = (eq.shirt !== undefined) ? eq.shirt : ((o.shirt && o.shirt !== 'none') ? 'tshirt' : 'none');
      this._placeSwingShirt(set.shirt, place, oShirt, eq.chest, gp, cfgKey, cfg.fw, fi, o.shirtColor, o.shirt || 'tshirt');
      place(set.legs, _jog ? null : this._gearStripFrame('legs', eq.legs, gp, cfgKey, cfg.fw, fi));
      place(set.chest, this._gearStripFrame('chest', eq.chest, gp, cfgKey, cfg.fw, fi));
      const weaponFrames = this._bowWeaponFrames && this._bowWeaponFrames[cfgKey];
      place(set.weapon, weaponFrames && weaponFrames[fi]);
      const looks = {
        hair: o.hair, hairColor: o.hairColor,
        facialhair: o.facialhair, facialHairColor: o.facialHairColor,
        headwear: o.headwear, hatColor: o.hatColor,
      };
      this._placeSkillTraitsOnFor(cfg.crownKey, sp, fi, cfg.traitDir || 'south', mirror, looks, set.traits);
      /* composite the jog legs under the torso strip (or hide them). */
      if (_jog) {
        const _fc = jogFrameCount('jog', _jdir) || 24;
        const _armoredCad = eq.chest && eq.chest !== 'none' && eq.legs && eq.legs !== 'none';
        const _cyc = (jogCycleMs('jog', _jdir, _armoredCad) || 700) * 2;
        const _raw = Math.floor((now / _cyc) * _fc) % _fc;
        const _d = (o._smoothVx || 0) * Math.cos(ang) + (o._smoothVy || 0) * Math.sin(ang);   // backpedal when moving opposite aim
        const _jfr = _d < 0 ? ((_fc - 1) - _raw) : _raw;
        const legTex = _legArr[((_jfr % _legArr.length) + _legArr.length) % _legArr.length];
        this._placeJogLegs(set.jogLegs, set.jogLegsGear, {
          legTex, gearFrame: getGearFrame('legs', eq.legs, 'jog', _jdir, _jfr),
          cutRow: bowTorsoCutRow(cfgKey, fi), jdir: _jdir, jfr: _jfr, mir: _rmir, s: sY, x: sp.x, footY: sp.y,
          feetY: cfg.feetY, hasLegArmour: !!(eq.legs && eq.legs !== 'none'),
        });
      } else { set.jogLegs.visible = false; set.jogLegsGear.visible = false; }
      active.add(id);
    }
    for (const [id, set] of this._remoteBowSprites) {
      if (active.has(id)) continue;
      set.body.visible = set.shirt.visible = set.chest.visible = set.legs.visible = set.weapon.visible = false;
      set.jogLegs.visible = set.jogLegsGear.visible = false;
      hideSkillTraits(set.traits);
      if (!others[id]) {
        for (const s of [set.jogLegs, set.jogLegsGear, set.body, set.shirt, set.legs, set.chest, set.weapon, set.traits.hair, set.traits.beard, set.traits.hat]) {
          try { s.destroy(); } catch (e) {}
        }
        this._remoteBowSprites.delete(id);
      }
    }
  }

  /* v2.3.1047: per-facing z-order for the swing weapon.  `behind` (north /
     back-to-camera facings) drops the blade just below the body so the body +
     gear occlude it; otherwise the weapon rides on top of the body + gear. */
  _orderSwingWeapon(wsp, body, topGear, behind) {
    const layer = wsp && wsp.parent; if (!layer) return;
    const wi = layer.getChildIndex(wsp);
    if (behind) {
      const bi = layer.getChildIndex(body);
      if (wi > bi) layer.setChildIndex(wsp, bi);
    } else {
      const gi = layer.getChildIndex(topGear);
      if (wi < gi) layer.setChildIndex(wsp, gi);
    }
  }

  _updateSwordSwing(S, now) {
    if (this.swordSprite) this.swordSprite.visible = false;
    if (this.swordWeaponSprite) this.swordWeaponSprite.visible = false;
    if (this.swordChestSprite) this.swordChestSprite.visible = false;
    if (this.swordLegsSprite) this.swordLegsSprite.visible = false;
    if (this.swordShirtSprite) this.swordShirtSprite.visible = false;
    if (this.swordJogLegsSprite) this.swordJogLegsSprite.visible = false;
    if (this.swordJogLegsGearSprite) this.swordJogLegsGearSprite.visible = false;
    if (this.slashSprite) this.slashSprite.visible = false;
    if (!S || !S._swordSwinging || !S.player || !this.swordSprite) return;
    /* v2.3.1396: painted crescent over the special swing — placed before
       the facing gate below, so the slash shows on EVERY aim direction
       (the stand-in body only exists for its authored facings, but the
       special's damage is all-around and the tell should be too). */
    if (S._specialAttack && SWORD_SLASH.frames.length) {
      const aimA = (S._aimAngle != null) ? S._aimAngle
        : (S._facingAngle != null) ? S._facingAngle : 0;
      const p = Math.max(0, Math.min(1, (now - (S.swingTimer || now)) / SWORD_SWING_MS));
      const spx = this.slashSprite;
      const frame = SWORD_SLASH.frames[Math.min(3, Math.floor(p * 4))];
      if (spx.texture !== frame) spx.texture = frame;
      /* crescent centered at the special's mid-reach, leading edge (the
         art's LEFT-facing bulge) pointed down the aim */
      spx.x = S.player.x + Math.cos(aimA) * GS_OUTER_RADIUS * 0.85;
      spx.y = S.player.y - 10 + Math.sin(aimA) * GS_OUTER_RADIUS * 0.85;
      spx.rotation = aimA + Math.PI;
      /* frame is 128px tall; span the special's widened reach */
      spx.scale.set((GS_OUTER_RADIUS * 2.2) / 128);
      spx.alpha = 0.95;
      spx.visible = true;
    }
    /* entityRenderer published the active facing; resolve it to a sheet + mirror. */
    const fmap = this._swordFacing[S._swordSwingDir];
    if (!fmap) return;
    const cfg = this._swordCfg[fmap[0]];
    const mirror = fmap[1];
    const frames = cfg && this._swordFrames[fmap[0]];
    if (!cfg || !frames || !frames.length) return;
    const n = frames.length;
    const elapsed = now - (S.swingTimer || now);
    const fi = Math.max(0, Math.min(n - 1, Math.floor((elapsed / SWORD_SWING_MS) * n)));
    const sp = this.swordSprite;
    const anchorY = cfg.feetY / cfg.fh;
    sp.anchor.set(0.5, anchorY);
    /* Render the figure (~188px body in-frame) at the avatar's actual drawn
       height so it matches the rest of the body (published per-facing/zone). */
    const bodyH = (S._swordBodyH != null) ? S._swordBodyH : 84;
    /* v2.3.1067: optional per-direction scale trim (cfg.bodyScale) -- south's
       figure read a touch large once its full legs were restored, so it gets a
       small reduction.  Scales body+shirt+armour+weapon+traits together (they
       all derive from this `s`); feet stay planted via the feetY anchor. */
    /* v2.3.1096: naked-only (no chest/leg armour) per-facing seam fix for the
       sword jog composite. The bare torso<->waist seam shows a transparent gap
       on east/west + south because the legs sit a touch BELOW the torso's waist
       cut. Fix by RAISING the legs up into the torso by _seamLift frame-px while
       leaving the torso anchored where it is. (v2.3.1094 tried SCALING the torso
       up; feet-anchored, that only lifted the torso's waist AWAY from the legs
       and widened the gap -- the "torso jumps off the legs" report.) Armoured
       swings unaffected. Owner-tuned per facing; east covers west via mirror. */
    const _nakedSeam = getEquip('chest') === 'none' && getEquip('legs') === 'none';
    /* raise the legs into the torso to close the bare waist seam (east+south). */
    const _seamLift = _nakedSeam ? (({ east: 10, south: 10 })[fmap[0]] || 0) : 0;
    /* grow ONLY the torso (east, covers west via mirror). The legs keep their own
       size but re-anchor to the SCALED torso's waist (torsoScale below) so the
       seam stays closed -- growing the figure would have enlarged the legs too. */
    const _torsoOnlyAdj = _nakedSeam ? (({ east: 1.15 })[fmap[0]] || 1) : 1;
    /* nudge ONLY the torso vertically a few world-px (legs unchanged). +y down,
       -y up.  east+south: drop the torso onto the legs to close the waist gap. */
    const _torsoDY = _nakedSeam ? (({ east: 5, south: 5 })[fmap[0]] || 0) : 0;
    /* grow ONLY the jog legs to help cover the waist gap (per facing). */
    const _legSizeAdj = _nakedSeam ? (({ south: 1.20, east: 1.10, north: 1.12 })[fmap[0]] || 1) : 1;
    /* shift ONLY the jog legs horizontally (screen px; -x = left, +x = right). */
    const _legShiftX = _nakedSeam ? (({ north: 0, south: 3 })[fmap[0]] || 0) : 0;
    /* shift ONLY the jog legs vertically (screen px; +y = down). south: down 2px. */
    const _legShiftY = _nakedSeam ? (({ south: 2 })[fmap[0]] || 0) : 0;
    const s = bodyH / 188 * (cfg.bodyScale || 1);
    /* v2.3.1068: width-only trim (cfg.bodyScaleX) -- south read a touch wide.
       Narrows x only (height stays `s`); overlays inherit it via `sgn` in
       place(), and traits re-center on the narrower head (their position uses
       sp.scale.x) while keeping their height-based size (sp.scale.y). */
    const sx = s * (cfg.bodyScaleX || 1);
    /* v2.3.1097: naked east grows the torso 15% (sT); the legs keep their own
       size but re-anchor to the scaled waist via torsoScale so the seam holds. */
    const sT = s * _torsoOnlyAdj;
    const sgnT = mirror ? -(sx * _torsoOnlyAdj) : (sx * _torsoOnlyAdj);
    sp.scale.set(sgnT, sT);
    const _baseFootY = (S._swordFootY != null) ? S._swordFootY : S.player.y;
    sp.x = S.player.x;
    sp.y = _baseFootY + _torsoDY;   // south drops the torso onto the legs (legs use _baseFootY)
    sp.visible = true;
    /* place an overlay sprite with the SAME transform as the body sprite. */
    const place = (spr, tex) => { if (!spr) return; if (!tex) { spr.visible = false; return; } spr.anchor.set(0.5, anchorY); spr.texture = tex; spr.scale.set(sgnT, sT); spr.x = sp.x; spr.y = sp.y; spr.visible = true; };
    const armorFrames = this._swordArmorFrames[fmap[0]];
    const weaponFrames = this._swordWeaponFrames[fmap[0]];
    const bodyFrames = this._swordBodyFrames[fmap[0]];
    if (bodyFrames && bodyFrames[fi]) {
      /* v2.3.954: layered gear path -- bald body + equipped chest/legs armour +
         the recolorable weapon.  The helmet rides in the chest piece, so skip the
         hat/beard/hair composite when a chest is worn; show it (bald head) when
         no chest is equipped. */
      /* v2.3.1088: jogging-legs composite while MOVING -- swap to the leg-erased
         torso strip and draw animated jog legs under it (same _placeJogLegs helper
         + sheets as the bow).  Restricted to facings that have a torso strip. */
      const _torsoFrames = this._swordTorsoFrames[fmap[0]];
      const _jog = !!S._swordJogLegs && _torsoFrames && _torsoFrames[fi];
      sp.texture = _jog ? _torsoFrames[fi] : bodyFrames[fi];
      const gp = cfg.gearPose || 'swing';
      const chestTex = this._gearStripFrame('chest', getEquip('chest'), gp, fmap[0], cfg.fw, fi);
      const legsTex  = _jog ? null : this._gearStripFrame('legs',  getEquip('legs'),  gp, fmap[0], cfg.fw, fi);
      this._placeSwingShirt(this.swordShirtSprite, place, this._shirtId(), getEquip('chest'), gp, fmap[0], cfg.fw, fi, getShirtColor(), getShirt());
      place(this.swordChestSprite, chestTex);
      place(this.swordLegsSprite, legsTex);
      place(this.swordWeaponSprite, weaponFrames && weaponFrames[fi]);
      /* v2.3.955: no helmets -- the head is always bald, so always composite
         the player's hat/beard/hair (the chest piece has the head cut out). */
      this._placeSkillTraitsOn(cfg.crownKey, sp, fi, cfg.traitDir || 'south', mirror);
      /* v2.3.1047: NORTH swings face away from the camera with the sword held
         on the FAR side of the body, so the body must occlude the blade -- drop
         the weapon BEHIND the body.  Every other facing keeps it in front (on
         top of body + gear). */
      /* v2.3.1710: the `topGear` argument must name whichever gear sprite is
         TOPMOST in child order, because the restore branch re-seats the weapon
         at exactly that index.  The v2.3.1710 shirt/legs swap moved the top of
         this stack from legs to shirt, so this argument moves with it — leaving
         it on legs would drop the blade behind the shirt on the first non-north
         swing after any north one. */
      this._orderSwingWeapon(this.swordWeaponSprite, sp, this.swordShirtSprite, fmap[0] === 'north');
      if (_jog) {
        /* v2.3.1093: legs face the SAME direction as the torso (the swing
           facing), not the movement direction -- upper and lower body stay
           aligned per facing.  Jog dir+mirror come from the swing's real facing
           via resolveDirection (which also maps the torso's north-diagonal
           convention onto the jog sheets'). */
        const _rd = resolveDirection(S._swordSwingDir);
        const _jdir = _rd.dir;
        const _fc = jogFrameCount('jog', _jdir) || 24;
        const _armoredCad = getEquip('chest') !== 'none' && getEquip('legs') !== 'none';
        const _cyc = (jogCycleMs('jog', _jdir, _armoredCad) || 700) * 2;
        const _raw = Math.floor((now / _cyc) * _fc) % _fc;
        let _back = false;
        if (S._aimAngle != null && S.player) { const _d = (S.player.vx || 0) * Math.cos(S._aimAngle) + (S.player.vy || 0) * Math.sin(S._aimAngle); _back = _d < 0; }
        const _jfr = _back ? ((_fc - 1) - _raw) : _raw;
        const _mir = _rd.mirror ? -1 : 1;
        const _legArr = this._bowJogLegFrames[_jdir];
        const legTex = (_legArr && _legArr.length) ? _legArr[((_jfr % _legArr.length) + _legArr.length) % _legArr.length] : null;
        this._placeJogLegs(this.swordJogLegsSprite, this.swordJogLegsGearSprite, {
          legTex, gearFrame: getGearFrame('legs', getEquip('legs'), 'jog', _jdir, _jfr),
          cutRow: swordTorsoCutRow(fmap[0], fi), jdir: _jdir, jfr: _jfr, mir: _mir, s, x: sp.x, footY: _baseFootY,
          feetY: cfg.feetY, hasLegArmour: getEquip('legs') !== 'none', weapon: 'sword', seamLift: _seamLift, torsoScale: _torsoOnlyAdj, legSizeAdj: _legSizeAdj, legShiftX: _legShiftX, legShiftY: _legShiftY,
        });
      }
    } else if (armorFrames && armorFrames[fi]) {
      sp.texture = armorFrames[fi];
      hideSkillTraits(this.skillTraits);
      place(this.swordWeaponSprite, weaponFrames && weaponFrames[fi]);
    } else {
      sp.texture = frames[fi];
      this._placeSkillTraitsOn(cfg.crownKey, sp, fi, cfg.traitDir || 'south', mirror);
    }
  }

  /* ── Bow-shoot animation (v2.3.925) ──
   * Plays the owner's bow-shoot at the player during a ranged-bow shot.
   * entityRenderer._updatePlayer sets S._bowShowing + S._bowDir (and hides the
   * real body + weapon) when a bow shot is active and the aim resolves to an
   * authored facing.  Same self-contained pattern as the sword swings. */
  _updateBowShot(S, now) {
    if (this.bowSprite) this.bowSprite.visible = false;
    if (this.bowWeaponSprite) this.bowWeaponSprite.visible = false;
    if (this.bowChestSprite) this.bowChestSprite.visible = false;
    if (this.bowLegsSprite) this.bowLegsSprite.visible = false;
    if (this.bowJogLegsSprite) this.bowJogLegsSprite.visible = false;
    if (this.bowJogLegsGearSprite) this.bowJogLegsGearSprite.visible = false;
    if (this.bowShirtSprite) this.bowShirtSprite.visible = false;
    if (!S || !S._bowShowing || !S.player || !this.bowSprite) return;
    const fmap = this._bowFacing[S._bowDir];
    if (!fmap) return;
    const cfg = this._bowCfg[fmap[0]];
    const mirror = fmap[1];
    const frames = cfg && this._bowFrames[fmap[0]];
    if (!cfg || !frames || !frames.length) return;
    const n = frames.length;
    const elapsed = now - (S._bowShotAt || now);
    /* v2.3.937: quick draw -> the load/pull frames play across BOW_RELEASE_MS,
       then the final (release) frame holds for the rest of BOW_SHOT_MS.  The
       arrow launches from the grip at BOW_RELEASE_MS (projectiles.js). */
    const fi = elapsed < BOW_RELEASE_MS
      ? Math.max(0, Math.min(n - 2, Math.floor((elapsed / BOW_RELEASE_MS) * (n - 1))))
      : n - 1;
    const sp = this.bowSprite;
    const anchorY = cfg.feetY / cfg.fh;
    sp.anchor.set(0.5, anchorY);
    const armorFrames = this._bowArmorFrames[fmap[0]];
    const weaponFrames = this._bowWeaponFrames[fmap[0]];
    const bodyFrames = this._bowBodyFrames[fmap[0]];
    const bodyH = (S._swordBodyH != null) ? S._swordBodyH : 84;
    const s = bodyH / 188;
    const sgn = mirror ? -s : s;
    sp.scale.set(sgn, s);
    sp.x = S.player.x;
    sp.y = (S._swordFootY != null) ? S._swordFootY : S.player.y;
    sp.visible = true;
    const place = (spr, tex) => { if (!spr) return; if (!tex) { spr.visible = false; return; } spr.anchor.set(0.5, anchorY); spr.texture = tex; spr.scale.set(sgn, s); spr.x = sp.x; spr.y = sp.y; spr.visible = true; };
    /* v2.3.957: layered gear path -- bald body + equipped chest/legs armour +
       recolorable bow; no helmet, so always composite hat/beard/hair.  Falls back
       to the armored/bald sheet if no body base for this facing. */
    let _armored;
    if (bodyFrames && bodyFrames[fi]) {
      _armored = false;
      /* v2.3.1072: jogging-legs composite (south, while moving) -- draw animated
         jog legs UNDER a leg-erased torso strip so the feet stride instead of
         sliding.  Same foot-plant + scale as the stand-in => aligns by
         construction; the legs sprite anchors at the 256-frame's feet row (221). */
      const _torsoFrames = this._bowTorsoFrames[fmap[0]];
      const _jogLegs = !!S._bowJogLegs && _torsoFrames && _torsoFrames[fi];
      if (_jogLegs) {
        /* v2.3.1093: the legs face the SAME direction as the torso (the aim
           facing), not the movement direction -- upper and lower body stay in
           alignment per facing.  Derive the jog leg dir+mirror from the bow's
           real aim via resolveDirection (which also maps the torso's
           north-diagonal convention to the jog sheets' convention). */
        const _rd = resolveDirection(S._bowDir);
        const _jdir = _rd.dir;
        /* v2.3.1073: compute the jog frame from `now` here -- the published
           S._bodyAnimFrame can stall during the shot (legs freeze).  Match the
           body's cadence (jog runs ~2x slower while attacking) and reverse it when
           backpedalling (moving opposite aim) so the stride reads backward. */
        const _fc = jogFrameCount('jog', _jdir) || 24;
        const _armoredCad = getEquip('chest') !== 'none' && getEquip('legs') !== 'none';
        const _cyc = (jogCycleMs('jog', _jdir, _armoredCad) || 700) * 2;
        let _raw = Math.floor((now / _cyc) * _fc) % _fc;
        let _back = false;
        if (S._aimAngle != null && S.player) { const _d = (S.player.vx || 0) * Math.cos(S._aimAngle) + (S.player.vy || 0) * Math.sin(S._aimAngle); _back = _d < 0; }
        const _jfr = _back ? ((_fc - 1) - _raw) : _raw;
        /* legs flip by the aim facing's mirror (from resolveDirection above, so
           they match the torso), and scale by the JOG body height (the bow art is
           jog-sized; the stand height read ~25% small for east). */
        /* per-facing scale fine-tune.  The bow art is drawn at different sizes per
           dir, AND the bare body-leg frames vs the leg-ARMOUR frames have different
           native sizes -- so they need SEPARATE knobs (with leg armour on, the bare
           legs are hidden, so only _gearAdj shows).  Keyed by fmap[0] => each covers
           its mirror (west / southeast). */
        const _mir = _rd.mirror ? -1 : 1;
        /* Align + size the legs via the shared helper (same code path remote
           players use, so they look identical). */
        const _legArr = this._bowJogLegFrames[_jdir];
        const legTex = (_legArr && _legArr.length) ? _legArr[((_jfr % _legArr.length) + _legArr.length) % _legArr.length] : null;
        this._placeJogLegs(this.bowJogLegsSprite, this.bowJogLegsGearSprite, {
          legTex, gearFrame: getGearFrame('legs', getEquip('legs'), 'jog', _jdir, _jfr),
          cutRow: bowTorsoCutRow(fmap[0], fi), jdir: _jdir, jfr: _jfr, mir: _mir, s, x: sp.x, footY: sp.y,
          feetY: cfg.feetY, hasLegArmour: getEquip('legs') !== 'none',
        });
      }
      sp.texture = _jogLegs ? _torsoFrames[fi] : bodyFrames[fi];
      const gp = cfg.gearPose || 'bowshot';
      this._placeSwingShirt(this.bowShirtSprite, place, this._shirtId(), getEquip('chest'), gp, fmap[0], cfg.fw, fi, getShirtColor(), getShirt());
      place(this.bowChestSprite, this._gearStripFrame('chest', getEquip('chest'), gp, fmap[0], cfg.fw, fi));
      place(this.bowLegsSprite,  _jogLegs ? null : this._gearStripFrame('legs', getEquip('legs'), gp, fmap[0], cfg.fw, fi));
      place(this.bowWeaponSprite, weaponFrames && weaponFrames[fi]);
    } else {
      _armored = !!(armorFrames && armorFrames[fi]);
      sp.texture = _armored ? armorFrames[fi] : frames[fi];
      if (_armored) place(this.bowWeaponSprite, weaponFrames && weaponFrames[fi]);
    }
    /* v2.3.937: publish the teal grip's WORLD position (same anchor math as
       _placeSkillTraitsOn) so the procedural arrow can launch from the bow
       rather than the player's feet.  scale.x carries the mirror sign. */
    const _crowns = this._skillCrowns && this._skillCrowns[cfg.crownKey];
    const _grip = _crowns && _crowns.grip;
    if (_grip) {
      S._bowGripX = sp.x + (_grip[0] - cfg.fw / 2) * sp.scale.x;
      S._bowGripY = sp.y + (_grip[1] - cfg.feetY) * Math.abs(sp.scale.y);
      /* Also publish the grip as an OFFSET from the player so consumers (the
         line-of-sight beam) can track the player's live position between shots
         instead of lagging at the last shot's world point. */
      S._bowGripDX = S._bowGripX - S.player.x;
      S._bowGripDY = S._bowGripY - S.player.y;
    }
    /* v2.3.952: armored bow is helmeted -> skip hat/beard/hair (matches the
       sword); the bald baked sheet still composites them. */
    if (_armored) hideSkillTraits(this.skillTraits);
    else this._placeSkillTraitsOn(cfg.crownKey, sp, fi, cfg.traitDir || 'south', mirror);
  }

  /* ── Extraction cue (v2.3.229) ──
   * Renders the "ready to extract" cue at the active node when
   * S._extraction.status === 'ready'. Procedural shapes for v1; swap
   * to pre-baked PNGs later. The cue pulses to attract the eye, and a
   * small countdown ring around it shows how much of the swipe window
   * remains. Nothing is drawn during the 'waiting' phase. */
  _updateExtractionCue(S, now) {
    const ex = S && S._extraction;
    /* v2.3.843: chopper sprite is hidden every frame and only re-shown
       below while a woodcutting extraction is active.
       v2.3.845: run for 'waiting' too so the chopper appears the instant
       the player taps Chop (immediate "it triggered" feedback during the
       ~4s wind-up before the swipe window opens) — the graphic swipe cue
       below still waits for 'ready'. */
    if (this.chopSprite) this.chopSprite.visible = false;
    if (this.chopShirtSprite) this.chopShirtSprite.visible = false;
    if (this.chopLegsSprite) this.chopLegsSprite.visible = false;
    if (this.chopChestSprite) this.chopChestSprite.visible = false;
    if (this.cookSprite) this.cookSprite.visible = false;
    if (this.cookShirtSprite) this.cookShirtSprite.visible = false;
    if (this.cookLegsSprite) this.cookLegsSprite.visible = false;
    if (this.cookChestSprite) this.cookChestSprite.visible = false;
    if (this.gestureToolSprite) this.gestureToolSprite.visible = false; /* v2.3.1417 */
    if (this.gestureFoodSprite) this.gestureFoodSprite.visible = false; /* v2.3.1433 */
    /* v2.3.1422: harvest-loop SFX, ENSURED per frame so every cancel path
       (walk-away, node death, zone change, success) silences them within
       one tick — no lifecycle bookkeeping to leak:
       - pan-sizzle: loops the whole time a cooking attempt is active
         (the pan is on the fire from the tap).
       - fish-reel: loops only while the crank is actually TURNING
         (ExtractionSwipeLayer stamps _reelSpinAt on angle movement). */
    try {
      const _au = (typeof window !== 'undefined') && window.BT_AUDIO;
      if (_au && _au.startSfxLoop) {
        /* v2.3.1423: the sizzle covers the WHOLE cook — the character's
           normal cooking animation (waiting wind-up) AND the flip phase
           (owner: "make sizzling sound during normal cooking animation").
           Volume 0.33 -> 0.4 so it reads on a phone speaker. */
        const _cookOn = !!(ex && ex.skill === 'cooking' && (ex.status === 'ready' || ex.status === 'waiting'));
        const _reelOn = !!(ex && ex.skill === 'fishing' && ex.status === 'ready'
          && ex._reelSpinAt && (performance.now() - ex._reelSpinAt) < 250);
        /* v2.3.1427 (owner): flowing-water ambience under the WHOLE
           fishing attempt — cast/wind-up and reel phase alike (same
           whole-attempt contract as the cooking sizzle); the reel
           crank still layers on top only while the crank turns. */
        const _waterOn = !!(ex && ex.skill === 'fishing' && (ex.status === 'ready' || ex.status === 'waiting'));
        if (_cookOn) _au.startSfxLoop('pan-sizzle', 0.4); else _au.stopSfxLoop('pan-sizzle');
        if (_reelOn) _au.startSfxLoop('fish-reel', 0.5); else _au.stopSfxLoop('fish-reel');
        if (_waterOn) _au.startSfxLoop('river-water', 0.35); else _au.stopSfxLoop('river-water');
      }
    } catch (e) { /* audio is best-effort */ }
    /* v2.3.1435: cook-flip LINGER — success fires the moment the up-stroke
       registers, which used to cut the (now slowed) flip off mid-air.  If a
       cook just ended with the flip in progress, keep the pan + food on
       screen and finish the animation, then hold the landed frame a beat. */
    if (!ex && this._cookLinger) {
      const L = this._cookLinger;
      const _lgt = GESTURE_TOOLS.cooking;
      if (now < L.until && L.f > 0.1 && _lgt.frames.length === 8 && this.gestureToolSprite) {
        const _ldt = Math.max(0, Math.min(100, now - (L.t || now)));
        L.t = now;
        if (L.f < 0.9999) L.f = Math.min(0.9999, L.f + _ldt / 1600);   /* v2.3.1442: 2x slower with the live chase */
        else if (!L.doneAt) L.doneAt = now + 350;   /* v2.3.1445: land pop folded into the constant grease beat */
        const _lsp = this.gestureToolSprite;
        const _ls = _lgt.h / 256;
        _lsp.texture = _lgt.frames[Math.floor(L.f * 8)];
        _lsp.scale.set(_ls, _ls);
        _lsp.x = L.x; _lsp.y = L.y;
        _lsp.visible = true;
        this._placeCookFood(L.x, L.y, _ls, L.f, L.fishKey);
        if (L.doneAt && now > L.doneAt) this._cookLinger = null;
      } else {
        this._cookLinger = null;
      }
    }
    if (!ex || (ex.status !== 'ready' && ex.status !== 'waiting')) { this._chopLastFrame = -1; return; }
    /* v2.3.253: prefer stored node ref so SP nodes (no id) work too. */
    const node = (ex.nodeRef && ex.nodeRef.alive) ? ex.nodeRef
               : (S.gatherNodes && ex.nodeId
                  ? S.gatherNodes.find(n => n.id === ex.nodeId)
                  : null);
    if (!node) return;
    const gfx = this.nodeGfx;
    /* Fishing reels over the CHARACTER (the rod's reel is at the hands) so
       the cue + the circular gesture center match the player, not the
       distant fish spot.  ExtractionSwipeLayer.cueScreenPos mirrors this. */
    const fishingCue = ex.skill === 'fishing' && S.player;
    /* v2.3.853: cooking's "node" is the campfire; the swipe-up cue + pan sit
       just above it. */
    const cookingCue = ex.skill === 'cooking';
    /* v2.3.1443: pond splash bursts at the FISH SPOT while the crank is
       actually turning (same _reelSpinAt freshness window as the reel SFX
       loop) — one splash roughly every 800ms so it reads as agitation,
       not a strobe.  v2.3.1445 (owner): reeling is the ONLY splash moment
       — the catch burst that applyFishingReward used to add is gone. */
    if (ex.skill === 'fishing' && ex.status === 'ready'
        && ex._reelSpinAt && (performance.now() - ex._reelSpinAt) < 250
        && now - (ex._splashAt || 0) > 800) {
      ex._splashAt = now;
      if (!S._fxBursts) S._fxBursts = [];
      if (S._fxBursts.length < 6) S._fxBursts.push({ kind: 'splash', t0: now, x: node.x, y: node.y + 2 });
    }
    /* v2.3.1445 (owner: "make cooking grease constant"): grease pops on a
       steady beat the whole time the pan is on the fire (same
       whole-attempt contract as the sizzle loop).  Anchored to the live
       marker pan when the flip cue is up, else to the baked pan the cook
       figure holds over the flames. */
    if (ex.skill === 'cooking' && now - (ex._greaseAt || 0) > 650) {
      ex._greaseAt = now;
      /* The tool sprite is force-hidden at the top of every frame and
         re-shown by the marker block AFTER this emitter, so visibility
         can't be read mid-frame — the marker block caches its pan
         position in _panPos instead.  The -10/+14 offset lands on the
         pan BOWL within the 256-cell art (the food anchors put the bowl
         low-left of the cell centre); fallback is the pan the cook
         figure holds over the flames. */
      const _pp = (this._panPos && now - this._panPos.t < 250) ? this._panPos : null;
      const _pan = _pp ? { x: _pp.x - 10, y: _pp.y + 14 } : { x: node.x + 8, y: node.y - 20 };
      if (!S._fxBursts) S._fxBursts = [];
      if (S._fxBursts.length < 6) {
        this._greaseFlip = !this._greaseFlip;
        S._fxBursts.push({ kind: 'grease', t0: now, x: _pan.x, y: _pan.y, flip: this._greaseFlip ? 1 : -1 });
      }
    }
    const x = fishingCue ? S.player.x : node.x;
    /* Anchor cue above the node so it doesn't sit on top of the
       sprite. Trees are tallest so they get the largest offset. */
    const yOff = node.nodeType === 'tree' ? 96 : node.nodeType === 'oreVein' ? 36 : 30;
    const y = fishingCue ? (S.player.y + FISH_CUE_DY) : cookingCue ? (node.y - 40) : (node.y - yOff);
    /* v2.3.843: which side of the tree the player is on (+1 = tree to the
       player's right).  Computed from live player position so the chopper
       and the finger hint pick the correct side the instant the cue shows
       (ex.treewardSign is only set once the first swipe lands). */
    const _px = (S.player && typeof S.player.x === 'number') ? S.player.x : node.x;
    const chopSign = node.x >= _px ? 1 : -1;
    /* Chopper animation beside the tree (woodcutting only): stands on the
       player's side, faces the trunk (source faces right -> flip when the
       tree is on the player's LEFT). */
    if (ex.skill === 'woodcutting' && this.chopSprite && this._chopFrames.length) {
      const CHOP_H = 95;          // drawn height; v2.3.1348: 84 -> 112 (+33%, owner request); v2.3.1476: 112 -> 95 (-15%, owner). Gear layers + traits derive from this same transform, so everything scales together.
      const CHOP_OFFSET = 30;     // px from the trunk to the figure's centre
      const CHOP_FRAME_MS = 45;   // ~22fps -> ~1.1s per swing loop
      /* v2.3.1131: play only the 12 downswing frames (source indices 12-23) --
         the owner's armour gear layers only cover those poses, so the base loop
         is trimmed to match.  A shorter loop than the old full 24-frame swing. */
      const CHOP_BASE = 12, CHOP_COUNT = 12;
      const CHOP_STRIKE_K = 9;    // frame WITHIN the 12 where the axe bites (sfx)
      const sp = this.chopSprite;
      const k = Math.floor(now / CHOP_FRAME_MS) % CHOP_COUNT;
      const fi = Math.min(this._chopFrames.length - 1, CHOP_BASE + k);
      /* v2.3.1468: with leg armour equipped, draw the HOLLOW body (legs
         erased, silhouette outline kept) so the lumberjack's own legs
         can't show around the greaves — the cook stand-in's v2.3.1114
         trick.  Gated on the greaves frame RESOLVING (not merely on
         legs being equipped, as cook does): a legs item with no chop
         art, or a sheet still loading, would otherwise render a
         legless lumberjack with nothing drawn over the gap. */
      const _chopLegsTex = this._gearStripFrame('legs', getEquip('legs'), 'chop', 'west', 480, k);
      const _chopLegsOn = !!_chopLegsTex
        && this._chopLeglessFrames.length === this._chopFrames.length;
      sp.texture = (_chopLegsOn ? this._chopLeglessFrames : this._chopFrames)[fi];
      const s = CHOP_H / 220;
      sp.scale.set(chopSign < 0 ? -s : s, s);  // flip to face the trunk
      sp.x = node.x - chopSign * CHOP_OFFSET;
      sp.y = node.y + 6;
      sp.visible = true;
      /* v2.3.1131: gear layers over the lumberjack (mirror of the cook stand-in),
         gated on equipped gear and copying the body transform.  The layer strips
         are 2x (480x440), so they render at half the body's scale factor to reach
         the same on-screen height, and use the SAME flip sign as the body. */
      const sL = CHOP_H / 440;
      const placeChopLayer = (spr, t) => {
        if (!spr) return;
        if (!t) { spr.visible = false; return; }
        spr.anchor.set(0.5, 1); spr.texture = t;
        spr.scale.set(chopSign < 0 ? -sL : sL, sL);
        spr.x = sp.x; spr.y = sp.y; spr.visible = true;
      };
      /* Shirt: paper-doll recolour -- the chop shirt art is a grayscale base, so
         _placeSwingShirt tints it to the player's chosen shirt colour (and hides
         it when a chest plate is worn, which replaces it). */
      this._placeSwingShirt(this.chopShirtSprite, placeChopLayer, this._shirtId(), getEquip('chest'), 'chop', 'west', 480, k, getShirtColor(), getShirt());
      placeChopLayer(this.chopLegsSprite,  _chopLegsTex);
      placeChopLayer(this.chopChestSprite, this._gearStripFrame('chest', getEquip('chest'), 'chop', 'west', 480, k));
      /* v2.3.847: chop hit sfx on the swing's strike frame (woodcutting had
         none).  Fires once per loop — only on the transition INTO the strike
         frame.  v2.3.848: reuse the melee 'sword-hit3' sample, delayed ~0.2s so
         it lands with the visible bite. */
      if (k === CHOP_STRIKE_K && this._chopLastFrame !== CHOP_STRIKE_K) {
        try {
          setTimeout(function () {
            var _a = (typeof window !== 'undefined') && window.BT_AUDIO;
            if (_a && _a.play) _a.play('sword-hit3', { vol: 0.55 });
          }, 200);
        } catch (e) {}
        /* v2.3.1445 (owner: "make wood chip effects constant"): chips fly
           off the trunk on EVERY swing of the chopper loop, scheduled
           +200ms to land with the delayed bite sample above.  Mirrored so
           they burst AWAY from the tree (art bursts rightward from a left
           anchor). */
        if (!S._fxBursts) S._fxBursts = [];
        if (S._fxBursts.length < 6) {
          S._fxBursts.push({ kind: 'woodchips', t0: now + 200, x: node.x - chopSign * 12, y: node.y - 64, flip: chopSign < 0 ? 1 : -1 });
        }
      }
      this._chopLastFrame = k;
      /* chopper faces RIGHT in source (east); flipped (scale.x<0) when the tree
         is on the player's left, i.e. chopSign<0 -> render the west view. */
      this._placeSkillTraitsOn('chop', sp, fi, 'east', chopSign < 0);
    } else {
      this._chopLastFrame = -1;  // mining/fishing — no chopper, reset the edge
    }
    /* v2.3.1423 (owner: "make the pickaxe sound play during normal pickaxe
       animation each time the player hits the rock").  The character's own
       mine swing — pose 'mine', a 14-frame loop deterministic off `now`
       (entityRenderer uses the same formula) — lands the pickaxe-on-stone
       sample on its STRIKE frame, edge-detected exactly like the
       chopper's CHOP_STRIKE_K.  Frame 4 measured from the strip: the
       first frame with the pick down (frames 0-3/11-13 hold it raised). */
    if (ex.skill === 'mining') {
      const _mfc = jogFrameCount('mine', 'south') || 14;
      const _mk = Math.floor((now / jogCycleMs('mine', 'south')) * _mfc) % _mfc;
      if (_mk === 4 && this._mineLastFrame !== 4) {
        try {
          const _au = (typeof window !== 'undefined') && window.BT_AUDIO;
          if (_au && _au.play) {
            this._mineSndAlt = !this._mineSndAlt;
            _au.play('mine-strike', { offset: this._mineSndAlt ? 0.08 : 0.6, duration: 0.45, vol: 0.55 });
          }
        } catch (e) {}
        /* v2.3.1445 (owner: "make rock ore effects constant" + "placement
           too low"): rock debris on EVERY strike of the character's own
           swing loop — not just finger slams — anchored at the ore's
           UPPER face where the pick actually bites (the vein sprite is
           bottom-anchored, so its body extends UP from node.y; the old
           node.y+14 put the burst at its feet). */
        if (!S._fxBursts) S._fxBursts = [];
        if (S._fxBursts.length < 6) {
          this._rockFlip = !this._rockFlip;
          S._fxBursts.push({ kind: 'rocks', t0: now, x: node.x, y: node.y - 95, flip: this._rockFlip ? 1 : -1 });
        }
      }
      this._mineLastFrame = _mk;
    } else {
      this._mineLastFrame = -1;
    }
    /* v2.3.853: cook character at the campfire during the whole cook (waiting
       + ready), the chopper's sibling.  Stands just left of the fire so the
       pan (extends right) sits over the flames. */
    if (cookingCue && this.cookSprite && this._cookFrames.length) {
      /* v2.3.1710 (owner: "While Cooking character is too large (about 25%)"):
         82 -> 62.  v2.3.1429 doubled 41 -> 82 on an owner request and overshot.
         The number is measurable, not taste: the drawn height of the AVATAR is
         `(221 - 33) * bodyDirScale('stand', dir) * LOCAL_SCALE` =
         188 * 1.051 * 0.421875 = 83.8px (entityRenderer, the same figure the
         sword/bow stand-ins size themselves against via S._swordBodyH), and the
         cook filled its whole 220px frame at 82 — so the SILHOUETTES matched
         while the FIGURES did not, because the cook is a crouch.  Comparing the
         part the eye actually reads, the head: the cook's is 85 art px against
         the standing body's 51, so at COOK_H 82 it drew 31.7px beside a 22.6px
         avatar — 40% too big.  62 lands it at 24.0px, inside the owner's "about
         25%" and within 6% of a head-for-head match, which is as close as a
         chunkier crouched painting is going to get without looking shrunken. */
      const COOK_H = 62, COOK_FRAME_MS = 60;
      const sp = this.cookSprite;
      const cookFi = Math.floor(now / COOK_FRAME_MS) % this._cookFrames.length;
      /* v2.3.1114: when leg armour is equipped, use the legs-erased body so the
         bare legs don't peek out behind the greaves; otherwise the normal body. */
      const _legsOn = getEquip('legs') !== 'none' && this._cookLeglessFrames.length === this._cookFrames.length;
      sp.texture = (_legsOn ? this._cookLeglessFrames : this._cookFrames)[cookFi];
      const s = COOK_H / 220;
      sp.scale.set(s, s);
      /* The pan hangs to the figure's RIGHT, so this offset is what keeps it
         over the flames — it has to track COOK_H or the pan slides off the
         fire.  v2.3.1429 doubled it with the 2x; v2.3.1710 scales it back by
         the same ratio (14 * 62/82 = 10.6). */
      sp.x = node.x - 11;
      sp.y = node.y + 8;
      sp.visible = true;
      /* v2.3.1113: draw the player's shirt over the cook torso, copying the
         cook sprite's exact transform so the 213x220 shirt frame aligns with
         the body frame-for-frame. Hidden when no shirt is selected or a chest
         plate is worn (handled inside _placeSwingShirt). */
      const placeCookShirt = (s, t) => {
        if (!s) return;
        if (!t) { s.visible = false; return; }
        s.anchor.set(0.5, 1); s.texture = t;
        s.scale.set(sp.scale.x, sp.scale.y); s.x = sp.x; s.y = sp.y; s.visible = true;
      };
      /* ═══ v2.3.1710: THE FLASHING SHIRT ═══
         Owner: the cooking character has a "flashing shirt".  This one is in the
         ASSET, not in the loop.  gear/shirt/tshirt/cook-south.png was assembled
         by tools/build_cook_shirt.mjs, which walks the 6x4 grid of the owner's
         shirt contact sheet and writes `shirts[f]` — a DIFFERENT painting — into
         frame f, each one luminance-normalised to its OWN peak (`L/peak*245`).
         So the 24 frames are 24 different garments, not 24 poses of one.
         Measured on the shipped sheet: mean shirt luminance swings 185.1 -> 207.9
         (12.3% peak-to-peak) and the mask width 104 -> 126 px, frame to frame, at
         16.7 fps.  That is the flash.  The proof it is this sheet and not the
         cook pipeline: the chest and legs sheets for the SAME pose were baked
         properly and are steady — legs/steelgreaves/cook-south.png is literally
         byte-identical frame to frame, chest/steelplate/cook-south.png varies
         smoothly with the arms.
         Fix without touching art: PIN the shirt to one frame.  Nothing is lost —
         the cook's torso and head do not move across the loop (only the arms and
         the pan do), which is exactly why a single garment reads correctly on
         all 24 bodies.  Frame 22 was chosen by measurement, not by eye: of the
         24 it leaves the fewest uncovered torso pixels (158/frame vs a 541
         median) with the least overhang of that low-gap group, and its luminance
         (201.9) sits within 2% of the sheet median so the shirt does not get
         brighter or darker than what has been shipping.
         The DURABLE fix is re-cutting the sheet from ONE shirt tracked across
         the 24 poses; until then this is stable and costs nothing. */
      const COOK_SHIRT_FRAME = 22;
      this._placeSwingShirt(this.cookShirtSprite, placeCookShirt, this._shirtId(), getEquip('chest'), 'cook', 'south', 213, COOK_SHIRT_FRAME, getShirtColor(), getShirt());
      /* v2.3.1114: equipped leg armour over the cook's legs (untinted; the
         greaves keep their own metal colour). _gearStripFrame returns null when
         no legs are equipped, so placeCookShirt hides the sprite. */
      placeCookShirt(this.cookLegsSprite, this._gearStripFrame('legs', getEquip('legs'), 'cook', 'south', 213, cookFi));
      /* v2.3.1115: equipped chest plate over the cook's torso (untinted). Drawn
         after the shirt (which _placeSwingShirt already hides when a chest plate
         is worn) so the plate replaces it. */
      placeCookShirt(this.cookChestSprite, this._gearStripFrame('chest', getEquip('chest'), 'cook', 'south', 213, cookFi));
      this._placeSkillTraitsOn('cook', sp, cookFi, 'south', false);
    }
    /* The floating tool + swipe cue + pips only appear once the swipe
       window is open; the chopper above already covers the wind-up. */
    if (ex.status !== 'ready') return;
    /* Pulse + gentle float so the tool reads as a grabbable "pick me up". */
    const pulse = 1 + Math.sin(now / 80) * 0.12;
    const bob = Math.sin(now / 300) * 4;
    const cy = y + bob;
    /* Soft shadow so the floating tool reads against bright zones. */
    gfx.ellipse(x, y + 16, 10, 3);
    gfx.fill({ color: 0x000000, alpha: 0.22 });
    /* v2.3.1417: the floating tool is the owner's painted GESTURE sprite —
       its frame follows the finger via ex.cueFrame01 (written live by
       ExtractionSwipeLayer): the pickaxe swings with the mining drag, the
       reel cranks with the fishing circles, the axe follows the chop
       swipe, the pan flips with the up-flick.  Idle (no finger) holds the
       last frame with the gentle bob.  The axe mirrors so it always chops
       TOWARD the tree.  Procedural fallback below covers a still-loading
       strip; fishing/cooking previously had no floating tool, so their
       fallback is simply nothing (the gesture hint still renders). */
    const _gt = GESTURE_TOOLS[ex.skill];
    if (_gt && _gt.frames.length === 8 && this.gestureToolSprite) {
      const f01 = Math.max(0, Math.min(0.9999, ex.cueFrame01 || 0));
      const sp = this.gestureToolSprite;
      /* v2.3.1421 (owner: "less frames... still travels too far — the
         resource should obstruct the latter half of the animation, but
         doesn't apply to cooking or fishing").  The swing tools play
         only the FIRST HALF of their sheet (frames 0-3, wind-up through
         early swing) — the poses past that would carry the head through
         the resource, and the surface is where the swing ENDS now.  The
         reel and pan keep the full 8 frames (they animate in place). */
      const _swingTool = ex.skill === 'mining' || ex.skill === 'woodcutting';
      /* v2.3.1435 (owner): the reel/pan DISPLAY phase now CHASES the raw
         gesture phase instead of snapping to it —
         - fishing: totalAngle arrives in per-pointermove jumps (a fast
           crank moves 45°+ between events), so raw frames skipped and
           the reel "looked choppy".  The chase caps the display at ~2.2
           rev/s along the shortest wrap direction: even cadence, still
           keeps up with any human crank.
         - cooking: a flick raced all 8 flip frames in ~300ms ("slow the
           animation to about half") — capped at one full flip per 800ms.
         Swing tools stay 1:1 (their feel is the strike itself). */
      /* v2.3.1442 (owner: cooking "still goes way too fast"): the chase
         state moves ONTO the extraction record — the old this._toolDispF
         survived between cooks, so the next attempt started with the pan
         already flipped (~1) and visibly UNWOUND backwards before
         tracking again ("something is wrong").  ex._dispF dies with the
         attempt, so every cook starts flat.  Cook rate also slowed
         another 2x (full flip 800ms -> 1600ms). */
      let _dispF = f01;
      if (ex.skill === 'cooking' || ex.skill === 'fishing') {
        const _lastT = ex._dispT || now;
        const _dt = Math.max(0, Math.min(100, now - _lastT));
        ex._dispT = now;
        let _cur = (ex._dispF != null) ? ex._dispF : (ex.skill === 'cooking' ? 0 : f01);
        const _rate = _dt / (ex.skill === 'cooking' ? 1600 : 450);
        if (ex.skill === 'fishing') {
          let _d = f01 - _cur;
          if (_d > 0.5) _d -= 1; else if (_d < -0.5) _d += 1;
          _cur = ((_cur + Math.max(-_rate, Math.min(_rate, _d))) % 1 + 1) % 1;
        } else {
          const _d = f01 - _cur;
          _cur = _cur + Math.max(-_rate, Math.min(_rate, _d));
        }
        ex._dispF = _cur;
        _dispF = Math.max(0, Math.min(0.9999, _cur));
      }
      sp.texture = _gt.frames[_swingTool ? Math.min(3, Math.floor(f01 * 4)) : Math.floor(_dispF * 8)];
      const s = _gt.h / 256;
      sp.scale.set(ex.skill === 'woodcutting' && chopSign < 0 ? -s : s, s);
      let _tpx = x + (_gt.dx || 0); /* v2.3.1418: owner nudges */
      let _tpy = cy - 8 + (_gt.dy || 0);
      /* v2.3.1419 (owner: the tool "moves through the resource
         transparently" — it should "appear to strike it").  SURFACE
         CLAMP: the swing tools no longer sit at a fixed point while
         their frames change — the sprite TRAVELS along the swing with
         the gesture phase and STOPS at the node's surface, so it can
         never ghost through the art.  Pickaxe: hovers wound-up above
         the rock, accelerates down onto its upper face.  Axe: winds
         back on the player's side, drives into the trunk edge.  When
         the swing bottoms out, a one-shot spark/chip burst fires AT
         the contact point (edge-detected on the phase so holding the
         finger down doesn't spray).  The node sizes mirror
         NODE_SPRITE_HEIGHT_BASE x the tier step scale (BroTown's
         proximity formula).  Reel/pan keep the fixed placement — they
         animate in place by design. */
      if (ex.skill === 'mining' || ex.skill === 'woodcutting') {
        const _tStep = Math.min(10, Math.max(1, Math.ceil((node.gatherLvl || 1) / 10)));
        const _nH = (node.nodeType === 'tree' ? 168 : 132) * (1 + (_tStep - 1) * 0.15);
        const _ease = f01 * f01; /* accelerate into the strike */
        let _cpx, _cpy; /* contact point on the surface */
        /* v2.3.1421: travel SHORTENED (owner: "still travels too far") —
           the arc now ends at the resource's rim, not deep in its body:
           pickaxe stops at the ore's upper rim, axe stops just short of
           the trunk. */
        if (ex.skill === 'mining') {
          _cpx = node.x + (_gt.dx || 0);
          _cpy = node.y - _nH * 0.85 + (_gt.dy || 0);
          const _hoverY = node.y - _nH - 20 + (_gt.dy || 0);
          _tpx = _cpx;
          _tpy = _hoverY + (_cpy - _hoverY) * _ease + bob * (1 - _ease);
        } else {
          _cpx = node.x - chopSign * 30;
          _cpy = node.y - 64 + (_gt.dy || 0);
          const _hoverX = node.x - chopSign * 62;
          _tpx = _hoverX + (_cpx - chopSign * 10 - _hoverX) * _ease + (_gt.dx || 0);
          _tpy = _cpy + bob * (1 - _ease);
        }
        if (f01 >= 0.9 && (ex._strikeP || 0) < 0.9 && S.hitParticles) {
          for (let i = 0; i < 6; i++) {
            S.hitParticles.push({
              x: _cpx, y: _cpy,
              vx: (Math.random() - 0.5) * 4 - (ex.skill === 'woodcutting' ? chopSign * 1.5 : 0),
              vy: -Math.random() * 2.5 - 0.5,
              life: 0.4,
              color: ex.skill === 'mining' ? (i % 2 ? '#ffd27a' : '#fff2c0') : (i % 2 ? '#d9b98c' : '#f0e3c8'),
              size: 1.7,
            });
          }
          try {
            /* v2.3.1423: mining's strike SOUND lives on the pump slam
               (ExtractionSwipeLayer onSlam — every reversal, i.e. every
               time the marker visually hits) — this full-drag burst is
               particles-only for mining so the two never double.
               v2.3.1427 (owner): chopping gets the real hatchet sample —
               two distinct strikes in the clip, alternated per hit
               (mine-strike pattern).  The old beep(340) placeholder was
               silent anyway: beep() has been a no-op since v2.3.1103. */
            const _au = (typeof window !== 'undefined') && window.BT_AUDIO;
            if (_au && ex.skill === 'woodcutting') {
              ex._chopSndAlt = !ex._chopSndAlt;
              _au.play('axe-chop', { offset: ex._chopSndAlt ? 0.06 : 1.10, duration: 0.6, vol: 0.6 });
            }
            /* v2.3.1445: the painted wood-chip burst moved to the chopper
               loop's strike frame (constant, owner request) — this
               full-drag moment keeps the procedural spark particles only,
               like mining. */
          } catch (e) {}
        }
        ex._strikeP = f01;
      }
      sp.x = _tpx;
      sp.y = _tpy;
      sp.visible = true;
      /* v2.3.1433 (owner: "anchor whatever food item sprite is being
         cooked over the food that [was] drawn with the sprite sheet...
         rotate what's being cooked so it lands upside down"): the pan
         frames are food-less; the raw fish's bag icon rides the
         measured per-frame anchors and flips through the arc. */
      if (ex.skill === 'cooking' && _gt.food) {
        this._panPos = { x: sp.x, y: sp.y, t: now };   /* v2.3.1445: grease emitter anchor */
        this._placeCookFood(sp.x, sp.y, s, _dispF, ex.fishKey);
        /* v2.3.1435: record the linger state — when the flip succeeds
           mid-animation (success fires on the up-stroke, which used to
           cut the pan off), the marker stays and finishes the slowed
           flip from here (see the linger block above the early-return). */
        this._cookLinger = { x: sp.x, y: sp.y, f: _dispF, fishKey: ex.fishKey, t: now, until: now + 2600 };   /* v2.3.1442: window fits the 1600ms flip + hold */
      }
    } else if (ex.skill === 'fishing' || ex.skill === 'cooking') {
      /* no floating tool — the angler holds the rod / the cook holds the pan;
         the gesture hint below is the whole cue (v2.3.853 for cooking). */
      gfx.circle(x, cy, 16 * pulse);
      gfx.fill({ color: 0x000000, alpha: 0.3 });
    } else if (ex.skill === 'woodcutting') {
      gfx.circle(x, cy, 16 * pulse);
      gfx.fill({ color: 0x000000, alpha: 0.3 });
      /* Axe icon: brown handle + grey head. */
      gfx.rect(x - 2, cy - 12 * pulse, 4, 24 * pulse);
      gfx.fill({ color: 0x6a4830, alpha: 0.95 });
      gfx.moveTo(x - 2, cy - 8 * pulse);
      gfx.lineTo(x - 14 * pulse, cy - 4 * pulse);
      gfx.lineTo(x - 14 * pulse, cy + 6 * pulse);
      gfx.lineTo(x - 2, cy + 2 * pulse);
      gfx.fill({ color: 0xb0b0b0, alpha: 0.95 });
    } else {
      gfx.circle(x, cy, 16 * pulse);
      gfx.fill({ color: 0x000000, alpha: 0.3 });
      /* Mining: pickaxe — handle + curved double-tip head. */
      gfx.rect(x - 2, cy - 12 * pulse, 4, 24 * pulse);
      gfx.fill({ color: 0x6a4830, alpha: 0.95 });
      gfx.moveTo(x - 14 * pulse, cy - 8 * pulse);
      gfx.lineTo(x + 14 * pulse, cy - 8 * pulse);
      gfx.lineTo(x + 10 * pulse, cy - 4 * pulse);
      gfx.lineTo(x - 10 * pulse, cy - 4 * pulse);
      gfx.fill({ color: 0x8a8a8a, alpha: 0.95 });
    }

    /* ── Phase-2 gesture hint + progress meter (v2.4) ──
       The animated hint shows WHAT motion to make; the green outer ring + pips
       show how much of the sustained gesture is done (ex.progress / ex.reps,
       written live by ExtractionSwipeLayer). Hint fades as progress fills. */
    const progress = Math.max(0, Math.min(1, ex.progress || 0));
    const reps = ex.reps || 0;
    const repsTarget = ex.repsTarget || 3;
    const hintAlpha = 0.9 * (1 - 0.55 * progress);
    const hintCol = 0xfff2a8;
    /* v2.3.1435 (owner: "make the gesture cue a bit larger and make it a
       consistent size across each life skill"): one shared size sheet —
       every skill's cue below draws from these.
       v2.3.1436 (owner: "the white gesture cues need to be larger",
       verified frame-by-frame with headless screenshots): another ~1.5x
       — stroke 4 -> 6, reach 20 -> 30, finger 21x13 -> 30x19. */
    const HINT_W = 6;          /* stroke width everywhere */
    const HINT_REACH = 30;     /* arrow half-length / streak length basis */
    /* v2.3.1667: the finger sizes moved to module scope (CUE_FINGER_*) so
       drawFingerCue and this block cannot drift apart. */
    if (ex.skill === 'fishing') {
      /* v2.3.1442 (owner: cues "still not consistent in color or size"):
         the gold arc-arrow becomes the SAME white finger every skill
         uses, orbiting the reel circle — a faint white track shows the
         path and a white streak trails the fingertip. */
      /* v2.3.1449 (owner: "the fishing gesture and marker need to be
         shrank by about 70%"): FISHING-LOCAL scale — every length below
         is derived from F_S so the shared HINT_W/FINGER_* sheet above is
         untouched and mining/woodcutting/cooking keep the consistent
         sizing the owner asked for in v2.3.1435/1436/1442.  Purely
         cosmetic: the swipe hit-test is a fixed 160px start radius and
         the rep counter integrates the finger's ANGLE about the cue
         centre, so a smaller ring still reels at exactly the same rate. */
      /* v2.3.1470 (owner): 2x with the marker — 0.3 -> 0.6. */
      const F_S = 0.6;
      const rA = 78 * F_S;   /* v2.3.1436: ENCIRCLES the reel art instead of hiding behind it */
      const a = (now / 900) % (Math.PI * 2);
      gfx.circle(x, y, rA);
      gfx.stroke({ color: 0xffffff, width: Math.max(1, 2.5 * F_S), alpha: hintAlpha * 0.28 });
      gfx.moveTo(x + Math.cos(a - 0.85) * rA, y + Math.sin(a - 0.85) * rA);
      gfx.arc(x, y, rA, a - 0.85, a);
      gfx.stroke({ color: 0xffffff, width: Math.max(1, HINT_W * F_S), alpha: hintAlpha * 0.5 });
      const fx = x + Math.cos(a) * rA, fy = y + Math.sin(a) * rA;
      /* v2.3.1667: the clockwise tangent IS the direction of travel, so it
         is simply the angle now (a + PI/2).  Same drawing as before —
         this branch is where drawFingerCue's construction came from. */
      drawFingerCue(gfx, fx, fy, a + Math.PI / 2, hintAlpha, F_S);
    } else if (ex.skill === 'woodcutting') {
      /* v2.3.843: a finger demonstrates the chop gesture — wind UP away
         from the tree, then SWIPE back toward it, on a loop ("do this a
         few times").  dir points toward the tree (+1 right). */
      const dir = chopSign;
      const T = 1100;                         // one wind-up+chop cycle
      const p = (now % T) / T;
      const WIND = 24, REACH = 20;   /* v2.3.1436: scaled with the bigger finger */            // travel away / toward the tree
      let off;                                // horizontal offset along the tree axis
      if (p < 0.5) {                          // wind up: ease back away from tree
        const t = p / 0.5; off = -dir * WIND * (t * t * (3 - 2 * t));
      } else if (p < 0.68) {                  // chop: snap toward the tree
        const t = (p - 0.5) / 0.18; off = -dir * WIND + dir * (WIND + REACH) * t;
      } else {                                // recover: ease back to centre
        const t = (p - 0.68) / 0.32; off = dir * REACH * (1 - (t * t * (3 - 2 * t)));
      }
      const fy = y + 26;
      const fx = x + off;
      const chopping = p >= 0.5 && p < 0.68;
      /* v2.3.1667: point along TRAVEL, not at the tree.  Winding up moves
         away (-dir) and the chop moves toward it (+dir), so the finger
         now turns over on the backswing instead of sliding backwards
         while still aimed forwards. */
      const wcAngle = (chopping ? dir : -dir) > 0 ? 0 : Math.PI;
      if (chopping) {
        drawFingerStreak(gfx, fx, fy, wcAngle, HINT_REACH + 8, HINT_W, hintAlpha * 0.5);
      }
      drawFingerCue(gfx, fx, fy, wcAngle, hintAlpha, 1);
    } else if (ex.skill === 'cooking') {
      /* v2.3.853: a finger flicks UP to flip the fish, on a loop — dip down,
         flick up, recover. */
      const T = 1100;
      const p = (now % T) / T;
      const DOWN = 14, UP = 30;   /* v2.3.1436: scaled with the bigger finger */
      let off;
      if (p < 0.5) { const t = p / 0.5; off = DOWN * (t * t * (3 - 2 * t)); }        // settle down
      else if (p < 0.68) { const t = (p - 0.5) / 0.18; off = DOWN - (DOWN + UP) * t; } // flick up
      else { const t = (p - 0.68) / 0.32; off = -UP * (1 - (t * t * (3 - 2 * t))); }  // recover
      const fx = x, fy = y + 30 + off;
      const flicking = p >= 0.5 && p < 0.68;
      /* v2.3.1667: settling DOWN points down (+PI/2), the flick points up
         (-PI/2) — the finger turns over at the bottom of the dip, which
         is what makes the gesture read as a flip rather than a bob. */
      const ckAngle = flicking ? -Math.PI / 2 : Math.PI / 2;
      if (flicking) {
        drawFingerStreak(gfx, fx, fy, ckAngle, HINT_REACH + 8, HINT_W, hintAlpha * 0.5);
      }
      drawFingerCue(gfx, fx, fy, ckAngle, hintAlpha, 1);
    } else {
      /* v2.3.1442: the gold double-arrow becomes the SAME white finger,
         pumping up-down on the mining axis (x+44 keeps it clear of the
         ore body, v2.3.1436) with a white streak trailing the motion. */
      const T = 1100;
      const p = (now % T) / T;
      const off = -Math.cos(p * Math.PI * 2) * HINT_REACH;
      const vel = Math.sin(p * Math.PI * 2);
      const ax = x + 44, ay = y + off;
      /* v2.3.1667: the pump now points along its own velocity — down on
         the down-stroke, up on the up-stroke.  Previously the finger was
         pinned pointing up and slid backwards for half of every cycle. */
      const mnAngle = vel > 0 ? Math.PI / 2 : -Math.PI / 2;
      if (Math.abs(vel) > 0.35) {                 /* streak while moving */
        drawFingerStreak(gfx, ax, ay, mnAngle, HINT_REACH - 4, HINT_W, hintAlpha * 0.5);
      }
      drawFingerCue(gfx, ax, ay, mnAngle, hintAlpha, 1);
    }
    /* Progress as a horizontal pip row beneath the tool (no ring — the old
       circling ring read as a stray diagonal line and the user prefers just
       the arrow + floating tool). Pips fill green as each rep completes. */
    const pipGap = 8;
    const pipY = y + 28;
    const px0 = x - (repsTarget - 1) * pipGap / 2;
    for (let i = 0; i < repsTarget; i++) {
      const filled = (i + 1) <= Math.floor(reps + 1e-3);
      gfx.circle(px0 + i * pipGap, pipY, 2.6);
      gfx.fill({ color: filled ? 0x3dd497 : 0x2a3050, alpha: filled ? 1 : 0.6 });
    }
  }

  clear() {
    this.particleGfx.clear();
    this.projectileGfx.clear();
    this.telegraphGfx.clear();
    this.overlayGfx.clear();
    this.hudGfx.clear();
    this.lootGfx.clear();
    this.splatGfx.clear();
    this.nodeGfx.clear();
    this.flashOverlay.clear();
    this.atmosphereGfx.clear();
    for (const t of this.dmgTexts) t.destroy();
    this.dmgTexts = [];
    /* Icons live on dmg entries (dmg._pixiIcon) which are owned by
       game state, not this list. Walking the dmgLayer is the most
       reliable way to drop any orphaned icon Sprites on clear. */
    for (let i = this.dmgLayer.children.length - 1; i >= 0; i--) {
      const c = this.dmgLayer.children[i];
      if (c instanceof Sprite && !c.destroyed) c.destroy();
    }
    for (const [, entry] of this.chatTexts) {
      /* Entry shape changed (now { container, bg, text, ... }); destroy the
         container which cascades to its children. */
      if (entry && entry.container && !entry.container.destroyed) {
        entry.container.destroy({ children: true });
      }
    }
    this.chatTexts.clear();
    if (this._levelText) { this._levelText.destroy(); this._levelText = null; }
  }
}
