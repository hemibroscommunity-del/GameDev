/**
 * Effects Renderer — particles, damage numbers, screen flashes, atmosphere,
 * projectiles, telegraphs, lock-on, ambient particles, chat bubbles, building signs.
 * Uses PixiJS Graphics for procedural particles and Text for damage numbers.
 */
import { Assets, Container, Graphics, Rectangle, Sprite, Text, Texture, TextStyle } from 'pixi.js';
import { ELEMENTS } from '@/data/elements.js';
import { ZONES } from '@/data/zones.js';
import { TILE, MINE_SPOT_R } from '@/data/constants.js';
import { GS_INNER_RADIUS, GS_OUTER_RADIUS, GS_FORWARD_ARC } from '@/data/index.js';
import { getFrame as getSlimeFrame, hasState as hasSlimeState } from '../slimeSprites.js';
import { getRemnantsTexture as getSnowmanRemnantsTex } from '../snowmanSprites.js';
import { variantSpritesFor } from '../monsterVariantSprites.js';
import { MONSTER_VARIANTS, ZONE_VARIANT_MAP } from '../../data/monsterVariants.js';
import { ZONE_SHARDS } from '../../data/shards.js';
import { placeSkillTraits, hideSkillTraits, SWORD_SWING_MS, BOW_SHOT_MS, BOW_RELEASE_MS } from './entityRenderer.js';
import { getEquip } from '../gearCatalog.js';
const GEARLAYER_VER = '955';   // cache-bust for the attack-pose gear sheets

/* Popup icons (XP badge, gold coin, sword/arrow/spell for damage by weapon
   type). Loaded async — entries appear in the registry once each PNG is
   ready. Until then, popups render text-only and the icon is skipped. */
const POPUP_ICONS = {};
const POPUP_ICON_KEYS = ['xp', 'gold', 'sword', 'arrow', 'spell', 'heart'];
Promise.all(POPUP_ICON_KEYS.map((k) =>
  Assets.load('/icons/popups/' + k + '.png').then((tex) => { POPUP_ICONS[k] = tex; })
)).catch((err) => console.warn('[popup-icons] load failed', err));

/* Elemental shard icons -- one PNG per zone, served from
   /icons/shards/.  Loaded lazily, falling back to a procedural circle
   draw until the texture resolves so an in-flight load doesn't blank
   the overlay. */
const SHARD_ICONS = {};
Promise.all(Object.values(ZONE_SHARDS).map((s) =>
  Assets.load('/icons/shards/' + s.key + '.png').then((tex) => { SHARD_ICONS[s.key] = tex; })
)).catch((err) => console.warn('[shard-icons] load failed', err));

/* Gather-node sprites — keyed by node.nodeType. Until each texture is
   loaded, _updateGatherNodes falls through to the procedural drawing path
   below. Source PNGs are ~1000-1250 px; in-game node footprints are
   tier-sized (tier.size ≈ 6-12 px), so each sprite is scaled to a target
   pixel height tuned to feel right next to the player sprite. */
const NODE_SPRITE_SOURCES = {
  tree:     '/sprites/trees/tree-pine.png',
  fishSpot: '/sprites/world/fish-spot.png',
  oreVein:  '/sprites/world/ore-vein.png',
};
const NODE_SPRITE_TEX = {};
/* Target render heights in world px at tierStep 1, scaled up with tier. */
const NODE_SPRITE_HEIGHT_BASE = { tree: 112, fishSpot: 88, oreVein: 88 };
const NODE_SPRITE_ANCHOR_Y = { tree: 1.0, fishSpot: 0.5, oreVein: 1.0 };
Promise.all(Object.entries(NODE_SPRITE_SOURCES).map(([k, path]) =>
  Assets.load(path).then((tex) => { NODE_SPRITE_TEX[k] = tex; })
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
Assets.load('/sprites/world/ore-vein-break.png?v=1').then((tex) => {
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
Assets.load('/icons/ore/ore-copper.png').then((tex) => {
  if (tex) { tex.source.scaleMode = 'linear'; ORE_ICON_TEX = tex; }
}).catch((err) => console.warn('[ore-icon] load failed', err));

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
   crash class as DMG_STYLE_EMOJI — stripping the dropShadow and
   falling through to the system emoji font sidesteps the bad path. */
const LABEL_STYLE_EMOJI = new TextStyle({
  fontFamily: '"Apple Color Emoji","Segoe UI Emoji","Source Sans 3",sans-serif',
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
    this._chopFrames = [];
    this._chopLastFrame = -1;  // strike-frame edge tracker for the chop sfx
    Assets.load('/sprites/skills/chop-strip.png').then((tex) => {
      const FW = 240, FH = 220;  // per-frame size of chop-strip.png
      const n = Math.max(1, Math.round(tex.width / FW));
      for (let i = 0; i < n; i++) {
        this._chopFrames.push(new Texture({ source: tex.source, frame: new Rectangle(i * FW, 0, FW, FH) }));
      }
    }).catch((err) => console.warn('[chop-strip] load failed', err));

    /* v2.3.853: cook character (shown at the campfire during a cooking
       extraction) + firemaking character (shown at the player while lighting
       a fire) — same world-space sprite pattern as the chopper. */
    this.cookSprite = new Sprite();
    this.cookSprite.anchor.set(0.5, 1);
    this.cookSprite.visible = false;
    this.nodeLayer.addChild(this.cookSprite);
    this._cookFrames = [];
    Assets.load('/sprites/skills/cook-strip.png').then((tex) => {
      const FW = 213, FH = 220;
      const n = Math.max(1, Math.round(tex.width / FW));
      for (let i = 0; i < n; i++) this._cookFrames.push(new Texture({ source: tex.source, frame: new Rectangle(i * FW, 0, FW, FH) }));
    }).catch((err) => console.warn('[cook-strip] load failed', err));

    this.fireSprite = new Sprite();
    this.fireSprite.anchor.set(0.5, 1);
    this.fireSprite.visible = false;
    this.nodeLayer.addChild(this.fireSprite);
    this._fireFrames = [];
    Assets.load('/sprites/skills/firemaking-strip.png').then((tex) => {
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
      south: { url: '/sprites/player/sword-south.png', fw: 320, fh: 320, feetY: 270, crownKey: 'sword',   traitDir: 'south', armorUrl: '/sprites/player/sword-south-armored.png', weaponUrl: '/sprites/player/sword-south-weapon.png', bodyUrl: '/sprites/player/sword-south-body.png', gearPose: 'swing' },
      east:  { url: '/sprites/player/sword-east.png',  fw: 402, fh: 246, feetY: 223, crownKey: 'sword_e', traitDir: 'east', armorUrl: '/sprites/player/sword-east-armored.png', weaponUrl: '/sprites/player/sword-east-weapon.png' },
      north: { url: "/sprites/player/sword-north.png", fw: 340, fh: 227, feetY: 211, crownKey: "sword_n", traitDir: "north", armorUrl: "/sprites/player/sword-north-armored.png", weaponUrl: "/sprites/player/sword-north-weapon.png" },
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
    this._gearStrips = {};   // 'slot/item/pose/dir' -> [Texture] | 'loading' | []
    /* v2.3.916: cache-buster for the sword sheets.  Their URLs are otherwise
       constant, so a browser / edge cache (esp. on the stable branch-preview
       host) keeps serving a stale sheet after the art changes -- that's what
       made a fixed sword outline still look white on-device.  Bump this whenever
       a sword sheet is re-cut, exactly like the player-sprite VERSION. */
    const SWORD_ART_VERSION = 950;
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
    this.swordWeaponSprite = new Sprite();
    this.swordWeaponSprite.anchor.set(0.5, 1);
    this.swordWeaponSprite.visible = false;
    this.nodeLayer.addChild(this.swordWeaponSprite);
    const _loadSwordStrip = (target, dir, url, cfg) => {
      target[dir] = [];
      Assets.load(url + '?v=' + SWORD_ART_VERSION).then((tex) => {
        const n = Math.max(1, Math.round(tex.width / cfg.fw));
        for (let i = 0; i < n; i++) target[dir].push(new Texture({ source: tex.source, frame: new Rectangle(i * cfg.fw, 0, cfg.fw, cfg.fh) }));
      }).catch((err) => console.warn('[sword ' + dir + '] load failed', err));
    };
    for (const dir of Object.keys(this._swordCfg)) {
      const cfg = this._swordCfg[dir];
      _loadSwordStrip(this._swordFrames, dir, cfg.url, cfg);
      if (cfg.armorUrl)  _loadSwordStrip(this._swordArmorFrames, dir, cfg.armorUrl, cfg);
      if (cfg.weaponUrl) _loadSwordStrip(this._swordWeaponFrames, dir, cfg.weaponUrl, cfg);
      if (cfg.bodyUrl)   _loadSwordStrip(this._swordBodyFrames, dir, cfg.bodyUrl, cfg);
    }

    /* v2.3.925: bow-shoot stand-in -- same self-contained pattern as the sword
       swings, but driven by a ranged-bow shot (S._bowShotAt).  Authored sheets
       for east + southwest + south; mirror covers west + southeast.  4 frames
       each (load -> draw -> release -> follow). */
    this._bowCfg = {
      /* v2.3.932: east re-cut to the owner's arrow-free art (3 frames). */
      east:      { url: '/sprites/player/bow-east.png',      fw: 214, fh: 241, feetY: 235, crownKey: 'bow_e',  traitDir: 'east', armorUrl: '/sprites/player/bow-east-armored.png', weaponUrl: '/sprites/player/bow-east-weapon.png' },
      /* v2.3.929: SW re-cut to the owner's arrow-free art (3 frames:
         load/pull/release -- the in-game arrow projectile draws the arrow). */
      southwest: { url: '/sprites/player/bow-southwest.png', fw: 154, fh: 233, feetY: 227, crownKey: 'bow_sw', traitDir: 'south', armorUrl: '/sprites/player/bow-southwest-armored.png', weaponUrl: '/sprites/player/bow-southwest-weapon.png' },
      /* v2.3.933: south re-cut to the owner's arrow-free art (3 frames). */
      south:     { url: '/sprites/player/bow-south.png',     fw: 130, fh: 234, feetY: 228, crownKey: 'bow_s',  traitDir: 'south', armorUrl: '/sprites/player/bow-south-armored.png', weaponUrl: '/sprites/player/bow-south-weapon.png' },
      /* v2.3.930: NW re-cut to the owner's arrow-free art (3 frames). */
      northwest: { url: '/sprites/player/bow-northwest.png', fw: 160, fh: 248, feetY: 242, crownKey: 'bow_nw', traitDir: 'north', armorUrl: '/sprites/player/bow-northwest-armored.png' },
      /* v2.3.931: north re-cut to the owner's arrow-free art (3 frames). */
      north:     { url: '/sprites/player/bow-north.png',     fw: 122, fh: 260, feetY: 254, crownKey: 'bow_n',  traitDir: 'north', armorUrl: '/sprites/player/bow-north-armored.png' },
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
    const BOW_ART_VERSION = 953;
    this.bowSprite = new Sprite();
    this.bowSprite.anchor.set(0.5, 1);
    this.bowSprite.visible = false;
    this.nodeLayer.addChild(this.bowSprite);
    this.bowWeaponSprite = new Sprite();
    this.bowWeaponSprite.anchor.set(0.5, 1);
    this.bowWeaponSprite.visible = false;
    this.nodeLayer.addChild(this.bowWeaponSprite);
    const _loadBowStrip = (target, dir, url, cfg) => {
      target[dir] = [];
      Assets.load(url + '?v=' + BOW_ART_VERSION).then((tex) => {
        const n = Math.max(1, Math.round(tex.width / cfg.fw));
        for (let i = 0; i < n; i++) target[dir].push(new Texture({ source: tex.source, frame: new Rectangle(i * cfg.fw, 0, cfg.fw, cfg.fh) }));
      }).catch((err) => console.warn('[bow ' + dir + '] load failed', err));
    };
    for (const dir of Object.keys(this._bowCfg)) {
      const cfg = this._bowCfg[dir];
      _loadBowStrip(this._bowFrames, dir, cfg.url, cfg);
      if (cfg.armorUrl)  _loadBowStrip(this._bowArmorFrames, dir, cfg.armorUrl, cfg);
      if (cfg.weaponUrl) _loadBowStrip(this._bowWeaponFrames, dir, cfg.weaponUrl, cfg);
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
    this._updateScreenFlash(S, viewW, viewH, now);
    this._updateAtmosphere(S, viewW, viewH, now);
    this._updateGroundLoot(S, now);
    this._updateGroundSplatter(S);
    this._updateGatherNodes(S, now);
    this._updateCampfire(S, now);
    this._updateFiremaking(S, now);
    this._updateSwordSwing(S, now);
    this._updateBowShot(S, now);
    this._updateFishingHole(S, now);
    this._updateExtractionCue(S, now);
    this._updateProjectiles(S, now);
    this._updateTelegraphs(S, now);
    this._updateOverlays(S, now);
    this._updateHUD(S, viewW, viewH, now);
  }

  /* ── Particles ── */
  _updateParticles(S, now) {
    const gfx = this.particleGfx;
    gfx.clear();

    // Hit particles
    const parts = S.hitParticles || [];
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
        /* Anti-overlap: place new popup below the lowest existing nearby one
           so kill-shot popups (damage, XP, gold spawned in one frame at slightly
           different Y) don't visually overlap. We compute a target Y rather
           than just adding a fixed offset, because the spawn Ys differ. */
        const SPACING = 26;
        let lowestY = -Infinity;
        let hasNeighbor = false;
        for (let j = 0; j < numbers.length; j++) {
          if (j === i) continue;
          const o = numbers[j];
          if (!o._pixiText || o._pixiText.destroyed) continue;
          if (Math.abs(o.x - dmg.x) > 60) continue;
          const oAge = (now - o.ts) / 1000;
          if (oAge > 0.6) continue;
          const oY = o.y + (o._stackOffset || 0) - oAge * 40;
          if (Math.abs(oY - dmg.y) > 50) continue;
          hasNeighbor = true;
          if (oY > lowestY) lowestY = oY;
        }
        dmg._stackOffset = hasNeighbor ? (lowestY + SPACING) - dmg.y : 0;
        const baseFontSize = dmg.crit ? 27 : 21;
        /* Special-attack hits used to render at 2x to read as "heavy", but
           that crowded the screen and hid the normal-hit cadence. They now
           match normal size and instead get a bright outer glow (see
           dropShadow below) to mark them as specials. */
        const fontSize = baseFontSize;
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
        const text = new Text({
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
      text.scale.set(1 + popBoost + critWiggle);
      if (dmg._pixiIcon && !dmg._pixiIcon.destroyed) {
        /* Place icon flush to the right of the text. Text anchor is
           (0.5, 0.5), so the right edge sits at text.x + text.width/2.
           Gap scales with fontSize.  Min 10 px because the prior 4 px
           floor still let the magic icon clip the last digit on
           fire-goblin hits ("32" reading as "3[magic]").  Stroked text
           extends a few px past text.width on iOS canvas rendering. */
        const _iconGap = Math.max(10, (text.style.fontSize || 21) * 0.35);
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
        gfx.rect(0, viewH - 30, viewW, 30);
        gfx.fill({ color: 0x000000, alpha: 0.1 });
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

    // Local arrows
    const arrows = S.arrows || [];
    for (const a of arrows) {
      if (!a._renderX) continue;
      const elemColor = a._projElem && ELEMENTS[a._projElem] ? cssToHex(ELEMENTS[a._projElem].color) : 0xc8c8d0;
      const fadeA = Math.min(1, a.life / 20);

      /* Motion-blur trail — push the current position into a small
         ring buffer per arrow, then draw fading line segments back
         through the history.  Older segments are thinner + more
         transparent, so the eye reads the trail as a single linear
         streak that visually extends the arrow's path.
         Stuck arrows / hit arrows don't need this.
         Bow heavy attacks (isSpecial without _isStaffProj) keep the
         arrow trail style — the orb trail belongs to staff/ice. */
      this._updateProjectileTrail(a, gfx, fadeA, /* isStaffProj */ a._isStaffProj || a.ice);

      const isBowHeavy = a.isSpecial && !a._isStaffProj && !a.ice;
      if (isBowHeavy) {
        /* Heavy bow shot — draw the arrow normally with a bright
           element-tinted halo around it.  Reads as a powered shot
           (clearly distinct from a regular arrow) without hiding the
           arrow itself in an orb.  v2.3.222: 3x scale per user
           request so the special bow shot reads as much heavier and
           its damage radius matches the visual. */
        gfx.circle(a._renderX, a._renderY, 39);
        gfx.fill({ color: 0xf5c542, alpha: fadeA * 0.25 });
        gfx.circle(a._renderX, a._renderY, 27);
        gfx.fill({ color: elemColor, alpha: fadeA * 0.45 });
        gfx.circle(a._renderX, a._renderY, 15);
        gfx.fill({ color: 0xfff2a8, alpha: fadeA * 0.55 });
        this._drawArrow(gfx, a._renderX, a._renderY, a.ang + bend, elemColor, fadeA, 3);
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
        gfx.circle(a._renderX, a._renderY, 5);
        gfx.fill({ color: elemColor, alpha: fadeA * 0.8 });
        gfx.circle(a._renderX, a._renderY, 9);
        gfx.fill({ color: elemColor, alpha: fadeA * 0.2 });
      } else {
        /* Detailed arrow — wooden shaft + colored arrowhead +
           colored fletching.  Drawn rotated so the math is
           local-coords-friendly.  ang_eff = a.ang + bend so arrows
           in flight visibly tilt in the direction the player is
           rotating their aim. */
        this._drawArrow(gfx, a._renderX, a._renderY, a.ang + bend, elemColor, fadeA);
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
      this._updateProjectileTrail(rp, gfx, 1.0, !!rp.isStaff);
      if (rp.isStaff) {
        /* v2.3.840: special staff bolts read bigger + golden with a halo. */
        gfx.circle(rp._renderX, rp._renderY, rp.isSpecial ? 7 : 4);
        gfx.fill({ color: rp.isSpecial ? 0xf5c542 : 0xa855f7, alpha: rp.isSpecial ? 0.95 : 0.8 });
        if (rp.isSpecial) { gfx.circle(rp._renderX, rp._renderY, 11); gfx.stroke({ color: 0xfff2a8, width: 2, alpha: 0.6 }); }
      } else {
        this._drawArrow(gfx, rp._renderX, rp._renderY, rp.ang + bend, rp.isSpecial ? 0xf5c542 : 0xd4a574, rp.isSpecial ? 1.0 : 0.9);
        if (rp.isSpecial) { gfx.circle(rp._renderX, rp._renderY, 9); gfx.stroke({ color: 0xfff2a8, width: 2, alpha: 0.55 }); }
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
    if (projTex) {
      for (const sp of slimeProjs) {
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
      const shouldDraw = (isRanged || isMelee)
        && (S._aiming || isLocked || S.autoAttack)
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
        } else {
          aimA = 0;
        }
        if (isMelee) {
          /* Forward half-disc (outer reach) + 360° core circle, centred on the
             player -- the same origin + radii the swing hit test uses.
             v2.3.943: toned WAY down per owner ("too much / distracting").
             Just subtle area fills + a small flat triangle chip sitting on the
             arc midpoint to show the aim direction (replaces the busy arrow +
             double outlines). */
          const a0 = aimA - GS_FORWARD_ARC / 2, a1 = aimA + GS_FORWARD_ARC / 2;
          gfx.moveTo(P.x, P.y);
          gfx.arc(P.x, P.y, GS_OUTER_RADIUS, a0, a1);
          gfx.lineTo(P.x, P.y);
          gfx.fill({ color: 0xffffff, alpha: 0.10 });
          gfx.circle(P.x, P.y, GS_INNER_RADIUS);
          gfx.fill({ color: 0xffffff, alpha: 0.12 });
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
          gfx.fill({ color: 0xffffff, alpha: 0.55 });
          gfx.moveTo(_tipx, _tipy);
          gfx.lineTo(_bx + _px * _hw, _by + _py * _hw);
          gfx.lineTo(_bx - _px * _hw, _by - _py * _hw);
          gfx.closePath();
          gfx.stroke({ color: 0x000000, width: 1, alpha: 0.3 });
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

    // Shield arc
    if (S.isBlocking && S._shieldAngle != null) {
      const P = S.player;
      const shR = 22;
      const startA = S._shieldAngle - 0.6;
      const endA = S._shieldAngle + 0.6;
      gfx.arc(P.x, P.y, shR, startA, endA);
      gfx.stroke({ color: 0x3498db, width: 3, alpha: 0.6 });
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
         LABEL_STYLE (which carries a 2 px black blur). */
      const txt = new Text({
        text: '',
        style: {
          fontFamily: hasEmoji
            ? '"Apple Color Emoji","Segoe UI Emoji","Source Sans 3",sans-serif'
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
    l._pixiSprite = l._pixiLabel = l._pixiTimer = l._pixiCount = l._pixiIcon = null;
    l._pixiCoinSprite = l._pixiCoinLabel = l._pixiShardSprite = l._pixiOwnerLabel = null;
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

      if (l.isWeapon && l.weapon) {
        /* Tier-colored aura + ring + emoji + name label. */
        const tierColor = cssToHex(l.tierColor || '#8890b8');
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
        l._pixiLabel.style.fill = l.tierColor || '#8890b8';
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
        const variant = MONSTER_VARIANTS[l.skull] || null;
        if (variant && variant.noFodderRemnants) continue;
        const variantSprites = variant ? variantSpritesFor(l.skull) : null;
        const variantRemnTex = variantSprites && variantSprites.remnants ? variantSprites.remnants.get() : null;
        const slimeRemnantsTex = hasSlimeState('remnants') ? getSlimeFrame('remnants', 0) : null;
        const remnTex = variantRemnTex || slimeRemnantsTex;
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

    const nodes = S.gatherNodes || [];

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
        const sx = node.x, sy = node.y - TILE;
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
        const _wantLayer = _isMineTarget ? this.overlayLayer : this.nodeLayer;
        if (node._pixiSprite.parent !== _wantLayer) {
          if (_wantLayer === this.nodeLayer) this.nodeLayer.addChildAt(node._pixiSprite, 0);
          else _wantLayer.addChild(node._pixiSprite);
        }
      } else if (node.nodeType === 'tree') {
        const tw = tier?.trunkW || 3;
        const th = tier?.trunkH || 8;
        const cr = tier?.canopyR || 6;
        gfx.rect(node.x - tw / 2, node.y - th, tw, th);
        gfx.fill({ color: cssToHex(tier?.trunkColor || '#3a2810') });
        gfx.circle(node.x, node.y - th - cr * 0.5, cr);
        gfx.fill({ color: cssToHex(tier?.canopyColor || '#2a7a1a') });
      } else if (node.nodeType === 'fishSpot') {
        const pulse = Math.sin(now / 600 + node.x) * 0.2 + 1;
        const r = (tier?.size || 6) * pulse;
        gfx.circle(node.x, node.y, r);
        gfx.fill({ color: 0x3498db, alpha: 0.35 });
        gfx.circle(node.x, node.y, r * 0.6);
        gfx.fill({ color: 0x3498db, alpha: 0.2 });
      } else {
        const size = tier?.size || 8;
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
      const tierColor = '#8890b8';   // RESOURCE_TIERS lookup happens in BroTown.jsx; default ok
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

  /* ── Catch flight (v2.3.845) ──
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
      const bag = typeof document !== 'undefined' && document.getElementById('bt-bag-target');
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
    const FH = 88, FRAME_MS = 55;
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
      Assets.load('/sprites/gear/' + slot + '/' + item + '/' + pose + '-' + dir + '.png?v=' + GEARLAYER_VER).then((tex) => {
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

  _updateSwordSwing(S, now) {
    if (this.swordSprite) this.swordSprite.visible = false;
    if (this.swordWeaponSprite) this.swordWeaponSprite.visible = false;
    if (this.swordChestSprite) this.swordChestSprite.visible = false;
    if (this.swordLegsSprite) this.swordLegsSprite.visible = false;
    if (!S || !S._swordSwinging || !S.player || !this.swordSprite) return;
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
    const s = bodyH / 188;
    const sgn = mirror ? -s : s;
    sp.scale.set(sgn, s);
    sp.x = S.player.x;
    sp.y = (S._swordFootY != null) ? S._swordFootY : S.player.y;
    sp.visible = true;
    /* place an overlay sprite with the SAME transform as the body sprite. */
    const place = (spr, tex) => { if (!spr) return; if (!tex) { spr.visible = false; return; } spr.anchor.set(0.5, anchorY); spr.texture = tex; spr.scale.set(sgn, s); spr.x = sp.x; spr.y = sp.y; spr.visible = true; };
    const armorFrames = this._swordArmorFrames[fmap[0]];
    const weaponFrames = this._swordWeaponFrames[fmap[0]];
    const bodyFrames = this._swordBodyFrames[fmap[0]];
    if (bodyFrames && bodyFrames[fi]) {
      /* v2.3.954: layered gear path -- bald body + equipped chest/legs armour +
         the recolorable weapon.  The helmet rides in the chest piece, so skip the
         hat/beard/hair composite when a chest is worn; show it (bald head) when
         no chest is equipped. */
      sp.texture = bodyFrames[fi];
      const gp = cfg.gearPose || 'swing';
      const chestTex = this._gearStripFrame('chest', getEquip('chest'), gp, fmap[0], cfg.fw, fi);
      const legsTex  = this._gearStripFrame('legs',  getEquip('legs'),  gp, fmap[0], cfg.fw, fi);
      place(this.swordChestSprite, chestTex);
      place(this.swordLegsSprite, legsTex);
      place(this.swordWeaponSprite, weaponFrames && weaponFrames[fi]);
      /* v2.3.955: no helmets -- the head is always bald, so always composite
         the player's hat/beard/hair (the chest piece has the head cut out). */
      this._placeSkillTraitsOn(cfg.crownKey, sp, fi, cfg.traitDir || 'south', mirror);
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
    sp.anchor.set(0.5, cfg.feetY / cfg.fh);
    /* v2.3.951: armored body sheet (bald head) when present, else the bald
       baked sheet; the bow is layered over it from the separable weapon sheet. */
    const armorFrames = this._bowArmorFrames[fmap[0]];
    const weaponFrames = this._bowWeaponFrames[fmap[0]];
    const _armored = !!(armorFrames && armorFrames[fi]);
    sp.texture = _armored ? armorFrames[fi] : frames[fi];
    const bodyH = (S._swordBodyH != null) ? S._swordBodyH : 84;
    const s = bodyH / 188;
    sp.scale.set(mirror ? -s : s, s);
    sp.x = S.player.x;
    sp.y = (S._swordFootY != null) ? S._swordFootY : S.player.y;
    sp.visible = true;
    if (_armored && weaponFrames && weaponFrames[fi]) {
      const wp = this.bowWeaponSprite;
      wp.anchor.set(0.5, cfg.feetY / cfg.fh);
      wp.texture = weaponFrames[fi];
      wp.scale.set(mirror ? -s : s, s);
      wp.x = sp.x; wp.y = sp.y;
      wp.visible = true;
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
    if (this.cookSprite) this.cookSprite.visible = false;
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
    const x = fishingCue ? S.player.x : node.x;
    /* Anchor cue above the node so it doesn't sit on top of the
       sprite. Trees are tallest so they get the largest offset. */
    const yOff = node.nodeType === 'tree' ? 96 : node.nodeType === 'oreVein' ? 36 : 30;
    const y = fishingCue ? (S.player.y - 24) : cookingCue ? (node.y - 40) : (node.y - yOff);
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
      const CHOP_H = 84;          // drawn height (~player scale); tune to taste
      const CHOP_OFFSET = 30;     // px from the trunk to the figure's centre
      const CHOP_FRAME_MS = 45;   // ~22fps -> ~1.1s per swing loop
      const CHOP_STRIKE_FRAME = 10; // frame where the axe drives into the trunk
      const sp = this.chopSprite;
      const fi = Math.floor(now / CHOP_FRAME_MS) % this._chopFrames.length;
      sp.texture = this._chopFrames[fi];
      const s = CHOP_H / 220;
      sp.scale.set(chopSign < 0 ? -s : s, s);  // flip to face the trunk
      sp.x = node.x - chopSign * CHOP_OFFSET;
      sp.y = node.y + 6;
      sp.visible = true;
      /* v2.3.847: chop hit sfx on the swing's strike frame (woodcutting had
         none).  Fires once per loop — only on the transition INTO the
         strike frame (the steps hold it for ~2-3 render frames).
         v2.3.848: reuse the generic melee weapon-hit sound (BT_AUDIO.swordHit
         — what a strike on any monster plays), and delay it ~0.2s so it
         lands with the visible bite rather than ahead of the swing (owner). */
      if (fi === CHOP_STRIKE_FRAME && this._chopLastFrame !== CHOP_STRIKE_FRAME) {
        try {
          setTimeout(function () {
            var _a = (typeof window !== 'undefined') && window.BT_AUDIO;
            /* v2.3.850: the melee hit alternates two samples; owner wants
               the other one for wood — 'sword-hit3' (not 'sword-hit2'). */
            if (_a && _a.play) _a.play('sword-hit3', { vol: 0.55 });
          }, 200);
        } catch (e) {}
      }
      this._chopLastFrame = fi;
      /* chopper faces RIGHT in source (east); flipped (scale.x<0) when the tree
         is on the player's left, i.e. chopSign<0 -> render the west view. */
      this._placeSkillTraitsOn('chop', sp, fi, 'east', chopSign < 0);
    } else {
      this._chopLastFrame = -1;  // mining/fishing — no chopper, reset the edge
    }
    /* v2.3.853: cook character at the campfire during the whole cook (waiting
       + ready), the chopper's sibling.  Stands just left of the fire so the
       pan (extends right) sits over the flames. */
    if (cookingCue && this.cookSprite && this._cookFrames.length) {
      const COOK_H = 41, COOK_FRAME_MS = 60;   // v2.3.896: ~50% smaller (owner: was too large)
      const sp = this.cookSprite;
      const cookFi = Math.floor(now / COOK_FRAME_MS) % this._cookFrames.length;
      sp.texture = this._cookFrames[cookFi];
      const s = COOK_H / 220;
      sp.scale.set(s, s);
      sp.x = node.x - 7;                        // halved with the size so the pan still sits over the fire
      sp.y = node.y + 8;
      sp.visible = true;
      this._placeSkillTraitsOn('cook', sp, cookFi, 'south', false);
    }
    /* The floating tool + swipe cue + pips only appear once the swipe
       window is open; the chopper above already covers the wind-up. */
    if (ex.status !== 'ready') return;
    /* Pulse + gentle float so the tool reads as a grabbable "pick me up". */
    const pulse = 1 + Math.sin(now / 80) * 0.12;
    const bob = Math.sin(now / 300) * 4;
    const cy = y + bob;
    /* Soft shadow + dim disc so the floating tool reads against bright zones. */
    gfx.ellipse(x, y + 16, 10, 3);
    gfx.fill({ color: 0x000000, alpha: 0.22 });
    gfx.circle(x, cy, 16 * pulse);
    gfx.fill({ color: 0x000000, alpha: 0.3 });
    /* Floating tool icon — the grab target the finger drags from.  Fishing
       skips it: the player already holds the rod, so the rotating reel arrow
       below is the whole cue ("reel icon appears -> circle clockwise"). */
    if (ex.skill === 'fishing' || ex.skill === 'cooking') {
      /* no floating tool — the angler holds the rod / the cook holds the pan;
         the gesture hint below is the whole cue (v2.3.853 for cooking). */
    } else if (ex.skill === 'woodcutting') {
      /* Axe icon: brown handle + grey head. */
      gfx.rect(x - 2, cy - 12 * pulse, 4, 24 * pulse);
      gfx.fill({ color: 0x6a4830, alpha: 0.95 });
      gfx.moveTo(x - 2, cy - 8 * pulse);
      gfx.lineTo(x - 14 * pulse, cy - 4 * pulse);
      gfx.lineTo(x - 14 * pulse, cy + 6 * pulse);
      gfx.lineTo(x - 2, cy + 2 * pulse);
      gfx.fill({ color: 0xb0b0b0, alpha: 0.95 });
    } else {
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
    if (ex.skill === 'fishing') {
      /* Clockwise circular arrow — "reel". Rotates so it reads as motion. */
      const rA = 30;
      const a0 = (now / 400) % (Math.PI * 2);
      const aEnd = a0 + Math.PI * 1.5;
      /* seed the path point at the arc start so Pixi doesn't draw a stray
         line from (0,0) to the arc (the diagonal-line bug). */
      gfx.moveTo(x + Math.cos(a0) * rA, y + Math.sin(a0) * rA);
      gfx.arc(x, y, rA, a0, aEnd);
      gfx.stroke({ color: hintCol, width: 2, alpha: hintAlpha });
      const hx = x + Math.cos(aEnd) * rA, hy = y + Math.sin(aEnd) * rA;
      const tx = -Math.sin(aEnd), ty = Math.cos(aEnd); /* clockwise tangent */
      gfx.moveTo(hx, hy);
      gfx.lineTo(hx + tx * 7 + Math.cos(aEnd) * 5, hy + ty * 7 + Math.sin(aEnd) * 5);
      gfx.lineTo(hx + tx * 7 - Math.cos(aEnd) * 5, hy + ty * 7 - Math.sin(aEnd) * 5);
      gfx.fill({ color: hintCol, alpha: hintAlpha });
    } else if (ex.skill === 'woodcutting') {
      /* v2.3.843: a finger demonstrates the chop gesture — wind UP away
         from the tree, then SWIPE back toward it, on a loop ("do this a
         few times").  dir points toward the tree (+1 right). */
      const dir = chopSign;
      const T = 1100;                         // one wind-up+chop cycle
      const p = (now % T) / T;
      const WIND = 18, REACH = 15;            // travel away / toward the tree
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
      /* swipe streak during the chop, trailing back from the fingertip */
      if (chopping) {
        gfx.moveTo(fx - dir * 20, fy);
        gfx.lineTo(fx, fy);
        gfx.stroke({ color: hintCol, width: 3, alpha: hintAlpha * 0.5 });
      }
      /* finger: a capsule body pointing toward the tree + a rounded tip;
         a knuckle dot at the back reads it as a hand. */
      const len = 15, w = 9;
      const bodyL = dir > 0 ? fx - len : fx;
      gfx.roundRect(bodyL, fy - w / 2, len, w, w / 2);
      gfx.fill({ color: 0xffffff, alpha: hintAlpha });
      gfx.circle(fx, fy, w / 2 + 0.5);        // fingertip toward the tree
      gfx.fill({ color: 0xffffff, alpha: hintAlpha });
      gfx.circle(fx - dir * (len + 2), fy, 4);// knuckle
      gfx.fill({ color: 0xe6e6ee, alpha: hintAlpha });
    } else if (ex.skill === 'cooking') {
      /* v2.3.853: a finger flicks UP to flip the fish, on a loop — dip down,
         flick up, recover. */
      const T = 1100;
      const p = (now % T) / T;
      const DOWN = 10, UP = 22;
      let off;
      if (p < 0.5) { const t = p / 0.5; off = DOWN * (t * t * (3 - 2 * t)); }        // settle down
      else if (p < 0.68) { const t = (p - 0.5) / 0.18; off = DOWN - (DOWN + UP) * t; } // flick up
      else { const t = (p - 0.68) / 0.32; off = -UP * (1 - (t * t * (3 - 2 * t))); }  // recover
      const fx = x, fy = y + 30 + off;
      const flicking = p >= 0.5 && p < 0.68;
      if (flicking) {                          // upward swipe streak
        gfx.moveTo(fx, fy + 22);
        gfx.lineTo(fx, fy);
        gfx.stroke({ color: hintCol, width: 3, alpha: hintAlpha * 0.5 });
      }
      const len = 15, w = 9;
      gfx.roundRect(fx - w / 2, fy, w, len, w / 2);  // finger body (below the tip)
      gfx.fill({ color: 0xffffff, alpha: hintAlpha });
      gfx.circle(fx, fy, w / 2 + 0.5);               // fingertip (pointing up)
      gfx.fill({ color: 0xffffff, alpha: hintAlpha });
      gfx.circle(fx, fy + len + 2, 4);               // knuckle
      gfx.fill({ color: 0xe6e6ee, alpha: hintAlpha });
    } else {
      /* Vertical double-arrow (up + down pump), bobbing. */
      const bob = Math.sin(now / 150) * 3;
      const ax = x + 24, ay = y + bob;
      const L = 14;
      gfx.moveTo(ax, ay - L);
      gfx.lineTo(ax, ay + L);
      gfx.stroke({ color: hintCol, width: 3, alpha: hintAlpha });
      gfx.moveTo(ax, ay - L); gfx.lineTo(ax - 5, ay - L + 7); gfx.lineTo(ax + 5, ay - L + 7);
      gfx.fill({ color: hintCol, alpha: hintAlpha });
      gfx.moveTo(ax, ay + L); gfx.lineTo(ax - 5, ay + L - 7); gfx.lineTo(ax + 5, ay + L - 7);
      gfx.fill({ color: hintCol, alpha: hintAlpha });
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
