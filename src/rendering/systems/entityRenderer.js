/**
 * Entity Renderer — renders player, monsters, other players, NPCs, and pets.
 * Uses PixiJS Graphics for procedural shapes (matching the original Canvas 2D look).
 */
import { Assets, Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import { TILE } from '@/data/constants.js';
import { ELEMENTS } from '@/data/elements.js';
import { lookupCollision } from '@/data/gameSystems.js';
import { getFrame, resolveDirection, cycleMs, hasPose, frameCount as playerFrameCount } from '../playerSprites.js';
import { getShieldFrame } from '../shieldSprites.js';
import { getFrame as getSlimeFrame, hasState as hasSlimeState, frameCount as slimeFrameCount } from '../slimeSprites.js';
import { getFrame as getSnowmanFrame, hasFrames as hasSnowmanFrames, frameCount as snowmanFrameCount, getHitFrame as getSnowmanHitFrame, hitFrameCount as snowmanHitFrameCount, getDeathFrame as getSnowmanDeathFrame, deathFrameCount as snowmanDeathFrameCount } from '../snowmanSprites.js';
import { variantSpritesFor } from '../monsterVariantSprites.js';
import { MONSTER_VARIANTS, maybeTransformMonster } from '../../data/monsterVariants.js';
import { getDeathFrame as getPlayerDeathFrame, hasDeathSprites as hasPlayerDeathSprites, frameForElapsed as playerDeathFrameForElapsed } from '../playerDeathSprites.js';
import { getWeaponTexture, hasWeapon } from '../weaponSprites.js';
import { getAnchor, getWeaponHandle } from '../playerAnchors.js';
import { getNftTextures } from '../nftAvatars.js';

/* §9.2.1 Collision-opportunity weapon edge glow — proximity radius (≈20u). */
const COLLISION_GLOW_RANGE_PX = 80;

/* Above-player HUD bar textures (v2.3.107).  Three pill-shaped PNGs
   the DOM dashboard also uses -- reuse the same `?v=` cache key so
   the browser hits the warm cache instead of issuing a fresh request. */
const HUD_BAR_VER = '2.3.68';
const _hudBarTex = { hp: null, mp: null, stam: null };
let _hudBarLoadStarted = false;
function _ensureHudBarTextures() {
  if (_hudBarLoadStarted) return;
  _hudBarLoadStarted = true;
  Assets.load(`/icons/ui/bar-hp.png?v=${HUD_BAR_VER}`).then(t => { _hudBarTex.hp = t; }).catch(() => {});
  Assets.load(`/icons/ui/bar-mp.png?v=${HUD_BAR_VER}`).then(t => { _hudBarTex.mp = t; }).catch(() => {});
  Assets.load(`/icons/ui/bar-stam.png?v=${HUD_BAR_VER}`).then(t => { _hudBarTex.stam = t; }).catch(() => {});
}

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
  fontFamily: 'Atkinson Hyperlegible, sans-serif',
  fontSize: 10,
  fontWeight: '700',
  fill: '#ffffff',
  align: 'center',
  dropShadow: { color: '#000000', blur: 2, distance: 1 },
});

const HP_BAR_W = 24;
const HP_BAR_H = 3;

function getMonsterSize(archetype) {
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
  const isFodder = archKey === 'fodder';
  const variantKey = MONSTER_VARIANTS[archKey] ? archKey : null;
  const isSnowman = archKey === 'snowman';
  const spriteBody = (isFodder || variantKey || isSnowman) ? new Sprite() : null;
  if (spriteBody) {
    spriteBody.anchor.set(0.5, 1.0);
    spriteBody.visible = false;
    container.addChild(spriteBody);
  }

  const hpBg = new Graphics();
  hpBg.rect(-HP_BAR_W / 2, -size - 10, HP_BAR_W, HP_BAR_H);
  hpBg.fill({ color: 0x000000, alpha: 0.5 });
  container.addChild(hpBg);

  const hpFill = new Graphics();
  container.addChild(hpFill);

  const lvlText = new Text({ text: '', style: { ...NAME_STYLE, fontSize: 8 } });
  lvlText.anchor.set(0.5, 1);
  lvlText.y = -size - 12;
  container.addChild(lvlText);

  /* Single dynamic Graphics for everything that DOES change per frame:
     status icons, aggro alert, stuck arrows, threat arrow, stun pip.
     One clear + redraw per monster instead of three. */
  const dynGfx = new Graphics();
  container.addChild(dynGfx);

  container._body = body;
  container._spriteBody = spriteBody;
  container._isFodder = isFodder;
  container._variantKey = variantKey;
  container._isSnowman = isSnowman;
  container._hpFill = hpFill;
  container._hpBg = hpBg;
  container._lvlText = lvlText;
  container._dynGfx = dynGfx;
  container._size = size;
  container._monster = monster;
  /* Dirty-flag cache values — skip redraws when nothing relevant changed. */
  container._lastHpPct = -1;
  container._lastLvl = -1;
  container._dynKey = '';
  /* Slime animation cache — skip texture reassignment when state +
     frame haven't changed. */
  container._slimeState = null;
  container._slimeFrame = -1;

  return container;
}

function createPlayerDisplay() {
  const container = new Container();
  container.label = 'localPlayer';

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

  /* Wood-shield sprite — replaces the procedural cyan arc when the
     PNGs have loaded.  Anchored at center-bottom so it pivots
     around the grip and rotates into position naturally; we hide
     it whenever isShielding flips false. */
  const shieldSprite = new Sprite();
  shieldSprite.anchor.set(0.5, 0.5);
  shieldSprite.visible = false;
  container.addChild(shieldSprite);

  // §5.9.5 Combo Chain count badge — sits above the bars.
  const comboText = new Text({ text: '', style: { ...NAME_STYLE, fontSize: 10 } });
  comboText.anchor.set(0.5, 1);
  container.addChild(comboText);

  // Stun countdown timer -- floats above the stun-star ring for any
  // variant with blockStunMs (skeleton: 5 s).  Hidden when m._stunUntil
  // isn't set or has expired.  Pooled per monster so we don't churn
  // Text instances on every stun.
  const stunTimerText = new Text({ text: '', style: { ...NAME_STYLE, fontSize: 11, fontWeight: '800', fill: '#fbbf24' } });
  stunTimerText.anchor.set(0.5, 1);
  stunTimerText.visible = false;
  container.addChild(stunTimerText);

  const nameText = new Text({ text: '', style: NAME_STYLE });
  nameText.anchor.set(0.5, 1);
  /* Was -28; bumped to -38 so the name plate doesn't occlude a
     sword tip that pokes ~5 px above the head when the right arm
     is fully extended (W jog cycles, etc). */
  nameText.y = -38;
  container.addChild(nameText);

  /* Combat-bar HUD anchored above the head (v2.3.107).  Each bar
     is a pill-shaped Sprite using the same /icons/ui/bar-*.png
     artwork the bottom dashboard's XP bar uses, so the in-world
     readout matches the dashboard chrome exactly.  A dim overlay
     Graphics sits on top of the right (empty) portion of each bar
     to indicate the current fill.  No backdrop -- the pills float
     directly on the game canvas.  Alpha is driven by
     _updatePlayerHud (fade in below max, hold at full for
     HOLD_MS, then fade out). */
  const _hudNumStyleFull  = { fontFamily: 'Atkinson Hyperlegible, sans-serif', fontSize: 7, fontWeight: '700', fill: '#ffffff', align: 'center' };
  const _hudNumStyleEmpty = { fontFamily: 'Atkinson Hyperlegible, sans-serif', fontSize: 7, fontWeight: '700', fill: '#ff4444', align: 'center' };

  const hudHpSprite = new Sprite();
  hudHpSprite.anchor.set(0.5, 0.5);
  hudHpSprite.alpha = 0;
  container.addChild(hudHpSprite);
  const hudHpEmpty = new Graphics();
  hudHpEmpty.alpha = 0;
  container.addChild(hudHpEmpty);
  const hudHpTextFull  = new Text({ text: '', style: _hudNumStyleFull });
  const hudHpTextEmpty = new Text({ text: '', style: _hudNumStyleEmpty });
  hudHpTextFull.anchor.set(0.5, 0.5);  hudHpTextFull.alpha = 0;  container.addChild(hudHpTextFull);
  hudHpTextEmpty.anchor.set(0.5, 0.5); hudHpTextEmpty.alpha = 0; container.addChild(hudHpTextEmpty);

  const hudMpSprite = new Sprite();
  hudMpSprite.anchor.set(0.5, 0.5);
  hudMpSprite.alpha = 0;
  container.addChild(hudMpSprite);
  const hudMpEmpty = new Graphics();
  hudMpEmpty.alpha = 0;
  container.addChild(hudMpEmpty);
  const hudMpTextFull  = new Text({ text: '', style: _hudNumStyleFull });
  const hudMpTextEmpty = new Text({ text: '', style: _hudNumStyleEmpty });
  hudMpTextFull.anchor.set(0.5, 0.5);  hudMpTextFull.alpha = 0;  container.addChild(hudMpTextFull);
  hudMpTextEmpty.anchor.set(0.5, 0.5); hudMpTextEmpty.alpha = 0; container.addChild(hudMpTextEmpty);

  const hudStamSprite = new Sprite();
  hudStamSprite.anchor.set(0.5, 0.5);
  hudStamSprite.alpha = 0;
  container.addChild(hudStamSprite);
  const hudStamEmpty = new Graphics();
  hudStamEmpty.alpha = 0;
  container.addChild(hudStamEmpty);
  const hudStamTextFull  = new Text({ text: '', style: _hudNumStyleFull });
  const hudStamTextEmpty = new Text({ text: '', style: _hudNumStyleEmpty });
  hudStamTextFull.anchor.set(0.5, 0.5);  hudStamTextFull.alpha = 0;  container.addChild(hudStamTextFull);
  hudStamTextEmpty.anchor.set(0.5, 0.5); hudStamTextEmpty.alpha = 0; container.addChild(hudStamTextEmpty);

  container._body = body;
  container._spriteBody = spriteBody;
  container._nftFront = nftFront;
  container._nftBack = nftBack;
  container._weaponContainer = weaponContainer;
  container._weaponGlowGfx = weaponGlowGfx;
  container._weaponGfx = weaponGfx;
  container._weaponSprite = weaponSprite;
  container._shieldSprite = shieldSprite;
  container._comboText = comboText;
  container._stunTimerText = stunTimerText;
  container._nameText = nameText;
  container._hudHpSprite = hudHpSprite;
  container._hudHpEmpty = hudHpEmpty;
  container._hudHpTextFull = hudHpTextFull;
  container._hudHpTextEmpty = hudHpTextEmpty;
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

  /* Procedural fallback body — drawn until /sprites/player sheets
     resolve (and as a permanent fallback if they fail to load). */
  const body = new Graphics();
  container.addChild(body);

  /* Sprite-sheet body — same loader / texture cache the local player
     uses, just driven by the other player's velocity + facing. */
  const spriteBody = new Sprite();
  spriteBody.anchor.set(0.5, 0.5);
  spriteBody.visible = false;
  container.addChild(spriteBody);

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

  const weaponGlowGfx = new Graphics();
  weaponContainer.addChild(weaponGlowGfx);
  const weaponGfx = new Graphics();
  weaponContainer.addChild(weaponGfx);
  const weaponSprite = new Sprite();
  weaponSprite.anchor.set(0.5, 0.5);
  weaponSprite.visible = false;
  weaponContainer.addChild(weaponSprite);

  const nameText = new Text({ text: '', style: { ...NAME_STYLE, fontSize: 9 } });
  nameText.anchor.set(0.5, 1);
  /* Was -24; bumped to -34 to match the local player nameplate's
     new offset (sword tip clearance — see createPlayerDisplay). */
  nameText.y = -34;
  container.addChild(nameText);

  container._body = body;
  container._spriteBody = spriteBody;
  container._nftFront = nftFront;
  container._nftBack = nftBack;
  container._weaponContainer = weaponContainer;
  container._weaponGlowGfx = weaponGlowGfx;
  container._weaponGfx = weaponGfx;
  container._weaponSprite = weaponSprite;
  container._nameText = nameText;
  /* Animation cache mirrors the local player display. */
  container._animPose = null;
  container._animDir = null;
  container._animFrame = -1;

  return container;
}

/**
 * Manages all entity rendering.
 */
export class EntityRenderer {
  constructor(entityLayer, playerLayer) {
    this.entityLayer = entityLayer;
    this.playerLayer = playerLayer;
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
      /* Mid-fight variant transform check (currently just mummy ->
         skeleton at HP <= transformAt).  Server is authoritative for
         this when S._serverMonsters is true -- the worker detects the
         threshold + emits a monster_transform event that BroTown.jsx
         applies in _processGameEvent.  This local fallback runs only
         in SP / dungeon mode where the worker doesn't model the zone. */
      if (!S._serverMonsters) maybeTransformMonster(m);
      const arch = m.archetype || m.type;
      const isFodder = arch === 'fodder';
      const variantKey = MONSTER_VARIANTS[arch] ? arch : null;
      const variant = variantKey ? MONSTER_VARIANTS[variantKey] : null;
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
      if (!m.alive) {
        const deathT = m._slimeDeathStart != null ? now - m._slimeDeathStart : null;
        const variantDeathMs = variant ? (variant.deathMs || 1000) : 0;
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
            const baseScale = deathPx / 256;
            sb.scale.x = baseScale;
            sb.scale.y = baseScale;
            sb.y = display._size;
            sb.tint = 0xffffff;
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
            if (display._hpFill && !display._hpFill.destroyed) display._hpFill.clear();
            if (display._hpBg && !display._hpBg.destroyed) display._hpBg.visible = false;
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
            const tex = getSlimeFrame('death', frameIdx);
            const sb = display._spriteBody;
            if (tex && (display._slimeState !== 'death' || display._slimeFrame !== frameIdx)) {
              display._slimeState = 'death';
              display._slimeFrame = frameIdx;
              sb.texture = tex;
            }
            sb.scale.x = 96 / 128;
            sb.scale.y = 96 / 128;
            sb.tint = 0xffffff;
            sb.visible = true;
            display.x = m.x;
            display.y = m.y;
            display.visible = true;
            display._body.visible = false;
            /* Clear HP bar -- see variant death branch for context;
               same problem applies to raw fodder slime kills. */
            if (display._hpFill && !display._hpFill.destroyed) display._hpFill.clear();
            if (display._hpBg && !display._hpBg.destroyed) display._hpBg.visible = false;
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
            if (display._hpFill && !display._hpFill.destroyed) display._hpFill.clear();
            if (display._hpBg && !display._hpBg.destroyed) display._hpBg.visible = false;
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
          if (spriteBody.tint !== 0xffffff) spriteBody.tint = 0xffffff;
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
          const tex = getSlimeFrame(state, frameIdx);
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
          if (spriteBody.y !== size) spriteBody.y = size; /* feet at the circle's bottom edge */
          if (spriteBody.tint !== 0xffffff) spriteBody.tint = 0xffffff;
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
          let frameTex = null;
          let mirror = false;
          if (inHitWindow) {
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
            if (spriteBody.tint !== 0xffffff) spriteBody.tint = 0xffffff;
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

      // HP bar — only redraw when the % changed (>0.01 movement).
      // Use maxHp as the denominator so the bar survives server
      // respawns (the kill handler used to zero m.hp, which broke
      // every monster's bar on its 2nd life).
      const curHp = m.curHp != null ? m.curHp : m.hp;
      const maxHpDenom = m.maxHp || m.hp || 1;
      const hpPct = Math.max(0, curHp / maxHpDenom);
      if (Math.abs(hpPct - display._lastHpPct) > 0.01) {
        display._lastHpPct = hpPct;
        const hpFill = display._hpFill;
        hpFill.clear();
        if (hpPct < 1) {
          const hpColor = hpPct > 0.5 ? 0x3dd497 : hpPct > 0.25 ? 0xf5c542 : 0xff5e6c;
          hpFill.rect(-HP_BAR_W / 2, -size - 10, HP_BAR_W * hpPct, HP_BAR_H);
          hpFill.fill({ color: hpColor });
          display._hpBg.visible = true;
        } else {
          display._hpBg.visible = false;
        }
      }

      // Level text — only update when level changes.
      if (m.level !== display._lastLvl) {
        display._lastLvl = m.level;
        display._lvlText.text = `Lv${m.level}`;
      }

      /* Single dynamic Graphics — clear once and redraw all dynamic bits
         (statuses, aggro alert, threat arrow, stun, stuck arrows) here.
         Skip the entire pass when nothing relevant has changed since last
         frame — most monsters most frames have no dynamic content. */
      const statuses = m.statuses || {};
      const statusKeys = Object.keys(statuses);
      const numStatuses = statusKeys.length;
      const aggroFlash = m._aggroTs && now - m._aggroTs < 600;
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
      const stuckCount = (m._stuckArrows && m._stuckArrows.length) || 0;
      /* Hash of "did the dynamic state change?" — pulse animations need
         per-frame redraw, so we still rebuild every frame when any of
         {aggro flash, threat arrow, stun, statuses, stuck arrows}
         is active.  When NONE are active, skip entirely. */
      const dynActive = numStatuses > 0 || aggroFlash || threatArrow || stunActive || stuckCount > 0;
      if (dynActive || display._dynKey !== '') {
        const dynGfx = display._dynGfx;
        dynGfx.clear();
        display._dynKey = dynActive ? '1' : '';

        if (numStatuses > 0) {
          let sx = -size;
          for (const statusId of statusKeys) {
            const statusData = statuses[statusId];
            if (!statusData) continue;
            const elemForStatus = Object.values(ELEMENTS || {}).find(e => e?.status === statusId);
            const sColor = elemForStatus ? cssColorToHex(elemForStatus.color) : 0xffffff;
            const ratio = 0.25;
            const winSize = (statusData.maxDur || 0) * ratio;
            let depth = 0;
            if (winSize > 0 && statusData.remaining <= winSize) {
              depth = Math.max(0, Math.min(1, (winSize - statusData.remaining) / winSize));
            }
            const pulseHz = depth > 0 ? (1.5 + depth * 3.5) : 0;
            const pulse = depth > 0 ? (1 + Math.sin(now / 1000 * pulseHz * 2 * Math.PI) * 0.2) : 1;
            const r = 3 * pulse;
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
            sx += 8;
          }
        }

        if (aggroFlash) {
          const age = (now - m._aggroTs) / 600;
          dynGfx.circle(0, -size - 20, 4);
          dynGfx.fill({ color: 0xff5e6c, alpha: 1 - age });
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

        if (stunActive) {
          /* Three 5-point stars orbiting in a squashed ellipse above
             the head -- standard "stunned" cartoon convention.  The
             orbit period is 700 ms; stars are slightly different
             phases so the ring reads as motion. */
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

        if (stuckCount > 0) {
          for (const sa of m._stuckArrows) {
            if (!sa || !Number.isFinite(sa.ang) || !Number.isFinite(sa.ox) || !Number.isFinite(sa.oy)) continue;
            const ax = Math.cos(sa.ang) * (size * 0.5) + sa.ox;
            const ay = Math.sin(sa.ang) * (size * 0.5) + sa.oy;
            dynGfx.moveTo(ax - Math.cos(sa.ang) * 5, ay - Math.sin(sa.ang) * 5);
            dynGfx.lineTo(ax + Math.cos(sa.ang) * 5, ay + Math.sin(sa.ang) * 5);
            dynGfx.stroke({ color: cssColorToHex(sa.color || '#8B6914'), width: 1.5, alpha: 0.8 });
          }
        }
      }
    }

    for (const [id, display] of this.monsterDisplays) {
      if (!activeIds.has(id)) {
        display.destroy({ children: true });
        this.monsterDisplays.delete(id);
      }
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

      /* Death state — play the death sprite animation (player crumbles
         into a skeleton then a pile of bones) until player_respawned
         clears _isDead.  Hide weapon/shield/NFT/procedural body so the
         corpse reads cleanly.  Fall back to a fade+tilt visual if the
         sheet hasn't loaded yet. */
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
        /* Hide weapon + shield on the corpse. */
        if (display._weaponContainer) display._weaponContainer.visible = false;
        if (display._shieldSprite) display._shieldSprite.visible = false;
        if (display._nftFront) display._nftFront.visible = false;
        if (display._nftBack) display._nftBack.visible = false;
        continue;
      }
      /* Living — restore visibility of containers that might have been
         hidden by a previous death frame on this display. */
      if (display._weaponContainer && !display._weaponContainer.visible) {
        display._weaponContainer.visible = true;
      }

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
      const isMoving = !stale && (Math.abs(other._smoothVx || 0) > 0.01 || Math.abs(other._smoothVy || 0) > 0.01);
      const bobY = isMoving ? Math.sin(now / 120) * 2 : 0;

      /* Sprite-sheet body — same as local player.  Other players
         broadcast their facing in `other._facing` (4-cardinal), but
         when moving we derive an 8-compass direction from their
         interpolated velocity for diagonal frames.  When they stop,
         reuse the last computed 8-compass on display._lastFacing so
         the diagonal idle pose carries through (otherwise it would
         snap back to the broadcast 4-cardinal). */
      let facing;
      if (isMoving) {
        const ang = Math.atan2(other._smoothVy || 0, other._smoothVx || 0);
        const sector = Math.round(ang / (Math.PI / 4));
        facing = SECTORS[((sector % 8) + 8) % 8];
        display._lastFacing = facing;
      } else {
        facing = display._lastFacing || other._facing || 'south';
      }
      const facingIdx = SECTORS.indexOf(facing);
      const isHit = other._hitFlash && (now - other._hitFlash) < 250;
      const pose = isHit ? 'hit' : (isMoving ? 'jog' : 'stand');
      const spritesAvailable = hasPose(pose) || hasPose('stand');
      let useSprite = false;
      if (spritesAvailable) {
        const spriteBody = display._spriteBody;
        const { dir, mirror } = resolveDirection(facing);
        let frameIdx = 0;
        if (pose === 'jog') {
          /* Frame count is per-direction now (24-35) — pulled from
             the loaded sheet width so a longer strip plays more frames
             in the same 1s cycle, giving smoother motion. */
          const fc = playerFrameCount('jog', dir) || 24;
          frameIdx = Math.floor((now / cycleMs('jog', dir)) * fc) % fc;
        } else if (pose === 'hit') {
          const hitT = (now - (other._hitFlash || 0)) / 250;
          frameIdx = Math.max(0, Math.min(5, Math.floor(hitT * 6)));
        }
        let tex = getFrame(pose, dir, frameIdx);
        if (!tex) tex = getFrame('stand', dir, 0);
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
             keeps every player rendered at the same visual scale. */
          let sizeMul = 1.0;
        if (dir === 'east' && pose === 'hit') sizeMul = 0.88;
        else if (dir === 'northeast' && pose !== 'hit') sizeMul = 1.03;
          spriteBody.scale.x = (mirror ? -1 : 1) * sizeMul;
          spriteBody.scale.y = sizeMul;
          spriteBody.tint = 0xffffff;
          spriteBody.visible = true;
          body.visible = false;
          if (display._procDrawn) {
            body.clear();
            display._procDrawn = false;
          }
          useSprite = true;
        } else {
          spriteBody.visible = false;
          body.visible = true;
        }
      } else {
        display._spriteBody.visible = false;
        body.visible = true;
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
          // Shadow
          body.ellipse(0, 20, 9, 3.5);
          body.fill({ color: 0x000000, alpha: 0.15 });
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
      let oSwingAng = 0, oSwingProgress = 0, oSwingOffset = 0;
      if (oSwingActive && oWpnType) {
        oSwingProgress = (now - other._swingTs) / SWING_ANIM_MS;
        const eased = 1 - (1 - oSwingProgress) * (1 - oSwingProgress);
        oSwingOffset = -SWING_FULL_ARC / 2 + eased * SWING_FULL_ARC;
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
          const SHEET_W = 64;
          const { dir, mirror } = resolveDirection(facing);
          let bodyScale = 1.0;
          const isHitNow = other._hitFlash && (now - other._hitFlash) < 250;
          const poseNow = isHitNow ? 'hit' : (isMoving ? 'jog' : 'stand');
          if (dir === 'east' && poseNow === 'hit') bodyScale = 0.88;
          else if (dir === 'northeast' && poseNow !== 'hit') bodyScale = 1.03;
          const animFrame = display._animFrame || 0;
          const hand = display._animPose ? getAnchor(display._animPose, dir, animFrame, mirror) : null;
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
          if (oSwingActive) {
            oWeaponSprite.rotation = oSwingAng;
            oWeaponSprite.scale.x = fitScale;
          } else {
            oWeaponSprite.rotation = 0;
            const weaponMirror = facingIdx >= 3 && facingIdx <= 6;
            oWeaponSprite.scale.x = (weaponMirror ? -1 : 1) * fitScale;
          }
          oWeaponSprite.scale.y = fitScale;
          oWeaponSprite.tint = 0xffffff;
          oWeaponSprite.visible = true;

          /* Swing arc trail. */
          if (oSwingActive) {
            const trailReach = 42;
            const startAng = aimAngle - SWING_FULL_ARC / 2;
            const endAng   = aimAngle + oSwingOffset;
            const trailAlpha = (1 - oSwingProgress) * 0.35;
            oWeaponGfx.moveTo(wpnX, wpnY);
            oWeaponGfx.arc(wpnX, wpnY, trailReach, startAng, endAng);
            oWeaponGfx.lineTo(wpnX, wpnY);
            oWeaponGfx.fill({ color: 0xffffff, alpha: trailAlpha });
            oWeaponGfx.arc(wpnX, wpnY, trailReach, startAng, endAng);
            oWeaponGfx.stroke({ color: 0xfffac8, width: 2, alpha: trailAlpha * 1.2 });
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
      if (oIsShielding) {
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
         E/SE/S + NE rule. */
      if (display._weaponContainer && oSpriteBody) {
        const inFront = oIsShielding
          ? (facingIdx >= 0 && facingIdx <= 3)
          : (facingIdx === 0 || facingIdx === 1 || facingIdx === 2 || facingIdx === 7);
        const bodyIdx = display.getChildIndex(oSpriteBody);
        const wcIdx   = display.getChildIndex(display._weaponContainer);
        const targetIdx = inFront
          ? (wcIdx > bodyIdx ? bodyIdx + 1 : bodyIdx)
          : (wcIdx > bodyIdx ? bodyIdx : Math.max(0, bodyIdx - 1));
        if (wcIdx !== targetIdx) {
          display.setChildIndex(display._weaponContainer, targetIdx);
        }
      }

      const nextName = other.name || 'Anon';
      if (display._lastName !== nextName) {
        display._lastName = nextName;
        display._nameText.text = nextName;
      }
      display._nameText.y = -24 + bobY;
    }

    for (const [id, display] of this.otherPlayerDisplays) {
      if (!activeIds.has(id)) {
        display.destroy({ children: true });
        this.otherPlayerDisplays.delete(id);
      }
    }
  }

  _updatePlayer(S, now) {
    if (!this.playerDisplay || this.playerDisplay.destroyed) {
      this.playerDisplay = createPlayerDisplay();
      this.playerLayer.addChild(this.playerDisplay);
    } else if (this.playerDisplay.parent !== this.playerLayer) {
      /* Defensive re-attach.  Something on zone change was detaching
         the playerDisplay from the player layer (or removing it from
         the scene graph altogether) and the user reported the avatar
         going invisible in other zones.  This re-parents it every
         frame if it's missing.  Cheap when already attached (no-op). */
      this.playerLayer.addChild(this.playerDisplay);
    }

    const P = S.player;
    const display = this.playerDisplay;
    /* Force visibility every frame — same defensive concern as the
       parent re-attach above. */
    display.visible = true;
    display.x = P.x;
    display.y = P.y;

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
    const SELF_DEATH_HOLD_MS = 3500;
    if (S.rpg && S.rpg.hp <= 0 && !S._deathStart) {
      S._deathStart = Date.now();
    }
    const _selfElapsed = S._deathStart ? Date.now() - S._deathStart : Infinity;
    const selfDead = _selfElapsed < SELF_DEATH_HOLD_MS || !!(S.rpg && S.rpg.hp <= 0);
    if (selfDead) {
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
      if (display._nftFront) display._nftFront.visible = false;
      if (display._nftBack) display._nftBack.visible = false;
      return;
    }
    /* Living — restore weapon container visibility (might have been
       hidden by a previous death frame). */
    if (display._weaponContainer && !display._weaponContainer.visible) {
      display._weaponContainer.visible = true;
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
    const isShielding = !!S._shieldUp;
    const aimAttackActive = S._aimAngle != null && (S._backpedaling || (!isMoving && S.autoAttack));
    /* useAimDirection drives the slowed + reverse jog animation —
       still want it true during a swing window so the legs stay in
       sync with the attack-locked body. */
    const useAimDirection = isShielding || aimAttackActive || swingActive;
    const aimRefAngle = isShielding
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

    let facing;
    if (isShielding && S._shieldAngle != null) {
      const sector = Math.round(S._shieldAngle / (Math.PI / 4));
      facing = SECTORS[((sector % 8) + 8) % 8];
    } else if (aimAttackActive) {
      const sector = Math.round(S._aimAngle / (Math.PI / 4));
      facing = SECTORS[((sector % 8) + 8) % 8];
    } else if (stickActive) {
      const ang = Math.atan2(stickY, stickX);
      const sector = Math.round(ang / (Math.PI / 4));
      facing = SECTORS[((sector % 8) + 8) % 8];
    } else if (isMoving) {
      const ang = Math.atan2(P.vy || 0, P.vx || 0);
      const sector = Math.round(ang / (Math.PI / 4));
      facing = SECTORS[((sector % 8) + 8) % 8];
    } else if (S._facingAngle !== undefined) {
      const sector = Math.round(S._facingAngle / (Math.PI / 4));
      facing = SECTORS[((sector % 8) + 8) % 8];
    } else {
      facing = S._facing || 'south';
    }
    const isHit = S._hitFlash && (now - S._hitFlash) < 250;
    const pose = isHit ? 'hit' : (isMoving ? 'jog' : 'stand');
    /* Resolve to the unmirrored sheet direction + mirror flag.  Lifted
       to outer scope so the weapon-positioning code below can pin to
       the per-frame hand anchor regardless of whether the spritesheet
       path drew this frame. */
    const { dir, mirror } = resolveDirection(facing);
    const facingIdx = SECTORS.indexOf(facing);   // 0..7: E,SE,S,SW,W,NW,N,NE
    /* Per-direction body scale.  Hit-east is 0.88 (source frames the
       character bigger); jog/stand-NE is 1.03 (slightly smaller source).
       v2.3.111: local player scale dialled back from 1.5 -> 1.125
       (reduced ~25% from v2.3.110's 1.5x per user "bigger was good but
       that's too big"). */
    const LOCAL_SCALE = 1.125;
    let bodyScale = 1.0 * LOCAL_SCALE;
    if (dir === 'east' && pose === 'hit') bodyScale = 0.88 * LOCAL_SCALE;
    else if (dir === 'northeast' && pose !== 'hit') bodyScale = 1.03 * LOCAL_SCALE;
    const spritesAvailable = hasPose(pose) || hasPose('stand');
    if (spritesAvailable) {
      const spriteBody = display._spriteBody;
      let frameIdx = 0;
      if (pose === 'jog') {
        /* Per-direction frame count — sheets vary 24-34 frames.  During
           an attack or shield (movement slowed 50% by gameplay), play
           the cycle at half speed so leg motion stays in sync with the
           halved real-world distance per second.  When the player is
           walking backward relative to their aim direction, reverse
           the playback so the legs trail the body. */
        const fc = playerFrameCount('jog', dir) || 24;
        const baseCycle = cycleMs('jog', dir);
        const effectiveCycle = useAimDirection ? baseCycle * 2 : baseCycle;
        const rawIdx = Math.floor((now / effectiveCycle) * fc) % fc;
        frameIdx = isMovingBackward ? ((fc - 1) - rawIdx) : rawIdx;
      } else if (pose === 'hit') {
        const hitT = (now - (S._hitFlash || 0)) / 250;
        frameIdx = Math.max(0, Math.min(5, Math.floor(hitT * 6)));
      }
      let tex = getFrame(pose, dir, frameIdx);
      if (!tex) tex = getFrame('stand', dir, 0);
      if (tex) {
        /* Always assign the texture — the cache-only-on-change pattern
           was leaving spriteBody with a stale / invalidated texture
           after zone change (user reports the player going invisible
           while name / level text remained).  Reassigning every frame
           is cheap (it's a property write) and self-heals. */
        if (spriteBody.texture !== tex) {
          spriteBody.texture = tex;
        }
        display._animPose = pose;
        display._animDir = dir;
        display._animFrame = frameIdx;
        /* bodyScale was computed at outer scope (see comment above).
           Applied here to the sprite scale; mirror flag flips x. */
        spriteBody.scale.x = (mirror ? -1 : 1) * bodyScale;
        spriteBody.scale.y = bodyScale;
        /* No tint multiply — the sprites are pre-colored.  Multiplying
           by S.bodyTorso (default #2563eb) was darkening the avatar
           because Pixi's tint is a per-channel multiply against white.
           If body-color customisation comes back later it'll need a
           filter or per-pixel recolor pass, not raw tint. */
        spriteBody.tint = 0xffffff;
        spriteBody.visible = true;
        body.visible = false;
        if (display._procDrawn) {
          /* Free the procedural Graphics paths once the sprite path
             takes over — prevents the old shapes from sitting in the
             scene graph indefinitely. */
          body.clear();
          display._procDrawn = false;
        }
      } else {
        spriteBody.visible = false;
        body.visible = true;
      }
    } else {
      display._spriteBody.visible = false;
      body.visible = true;
    }

    /* NFT 360° body — when the regular sprite path didn't render this
       frame (sheets not loaded, sprites disabled) and the player has
       an avatar URL with loaded textures, swap in the NFT cross-fade
       pair.  Hide the procedural body if NFT renders. */
    let nftShown = false;
    if (!display._spriteBody.visible && S.myAvatar) {
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
        // Shadow
        body.ellipse(0, 20, 10, 4);
        body.fill({ color: 0x000000, alpha: 0.15 });
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
      const SHEET_W = 64;
      const animFrame = display._animFrame || 0;
      /* Pass `mirror` so getAnchor returns the LEFT hand on mirrored
         facings (W/NW/SE) — the left anchor flipped via the body's
         negative scale lands on the visual right-hand side of the
         mirrored character.  Old single-anchor data is treated as
         right-hand-only and used regardless of mirror flag. */
      const hand = (spritesAvailable && display._animPose)
        ? getAnchor(display._animPose, dir, animFrame, mirror)
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
        swingOffset = -SWING_FULL_ARC / 2 + eased * SWING_FULL_ARC;
        const restAng = REST_ANG[wpn.type] != null ? REST_ANG[wpn.type] : 0;
        swingAng = (aimAngleForSwing - restAng) + swingOffset;
      }
      if (wpn && !isShielding) {
        /* Weapon is fully hidden while shielding — gameplay rule: you
           can attack OR block, never both, so no point drawing the
           weapon sprite or its glow when the shield is up. */
        const elem = wpn.element1;
        const wpnColor = elem && ELEMENTS[elem] ? cssColorToHex(ELEMENTS[elem].color) : 0xaaaaaa;

        // §5.9.5 Combo glow tier — None/Faint/Medium/Bright by combo count.
        // Bright tier adds a subtle pulse. Glow only renders when an element
        // is present on the weapon (no element = no element-color halo).
        const comboTier = (S.combo && S.combo.count) || 0;
        if (comboTier > 0 && elem) {
          const pulse = comboTier >= 3 ? 0.85 + Math.sin(now / 220) * 0.15 : 1;
          const glowAlpha = (comboTier === 1 ? 0.22 : comboTier === 2 ? 0.45 : 0.65) * pulse;
          const glowExtra = 2 + comboTier * 1.5;

          if (wpn.type === 'bow') {
            weaponGlowGfx.arc(wpnX, wpnY, 8, -0.8, 0.8);
            weaponGlowGfx.stroke({ color: wpnColor, width: 2 + glowExtra, alpha: glowAlpha });
          } else if (wpn.type === 'staff') {
            // Glow orb expands slightly with tier; halo around the staff tip.
            weaponGlowGfx.circle(wpnX, wpnY - 12, 3 + comboTier * 1.2);
            weaponGlowGfx.fill({ color: wpnColor, alpha: glowAlpha });
            weaponGlowGfx.moveTo(wpnX, wpnY + 10);
            weaponGlowGfx.lineTo(wpnX, wpnY - 10);
            weaponGlowGfx.stroke({ color: wpnColor, width: 2 + glowExtra, alpha: glowAlpha * 0.6 });
          } else {
            const len = wpn.type === 'greatsword' ? 14 : 10;
            weaponGlowGfx.moveTo(wpnX, wpnY + 2);
            weaponGlowGfx.lineTo(wpnX + facingX * len || len * 0.7, wpnY - len * 0.3);
            const baseW = wpn.type === 'greatsword' ? 3 : 2;
            weaponGlowGfx.stroke({ color: wpnColor, width: baseW + glowExtra, alpha: glowAlpha });
          }
        }

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
           below if the texture isn't loaded yet. */
        const weaponSprite = display._weaponSprite;
        const wpnIconTex = hasWeapon(wpn.type) ? getWeaponTexture(wpn.type) : null;
        if (wpnIconTex) {
          if (weaponSprite.texture !== wpnIconTex) weaponSprite.texture = wpnIconTex;
          /* Pin the weapon's grip pixel to the hand pixel by setting
             the Sprite anchor to handles.json's grip coordinate.
             Falls back to (0.5, bottom) if no handle data — same as
             the Canvas 2D default `[srcW/2, srcH]`. */
          const handle = getWeaponHandle(wpn.type);
          const tw = wpnIconTex.width || 64;
          const th = wpnIconTex.height || 64;
          if (handle) weaponSprite.anchor.set(handle[0] / tw, handle[1] / th);
          else weaponSprite.anchor.set(0.5, 1.0);
          weaponSprite.x = wpnX;
          weaponSprite.y = wpnY;
          /* Tuned per-weapon target heights so the icon reads at the
             same apparent size as the 64-px sprite body's hand area.
             Greatsword is the longest, staff next, sword/bow shorter. */
          const targetH = wpn.type === 'greatsword' ? 36
                         : wpn.type === 'staff'      ? 34
                         : wpn.type === 'bow'        ? 28
                         :                              26;
          const fitScale = targetH / Math.max(8, th);
          /* During an idle pose, mirror the blade horizontally for
             facings idx 3..6 (SW/W/NW/N) so it angles outward.  During
             a swing, rotation alone positions the blade — disable
             mirror, set rotation = swingAng (relative to the sprite's
             rest orientation, around the grip pivot which is the
             anchor). */
          if (swingActive) {
            weaponSprite.rotation = swingAng;
            weaponSprite.scale.x = fitScale;
          } else {
            weaponSprite.rotation = 0;
            const weaponMirror = facingIdx >= 3 && facingIdx <= 6;
            weaponSprite.scale.x = (weaponMirror ? -1 : 1) * fitScale;
          }
          weaponSprite.scale.y = fitScale;
          weaponSprite.tint = 0xffffff;
          weaponSprite.visible = true;
        } else {
          weaponSprite.visible = false;
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
      } else {
        /* No weapon equipped or shield is up — hide the icon Sprite
           so a stale icon doesn't linger from a previous loadout (or
           render on top of the shield arc during a block). */
        if (display._weaponSprite) display._weaponSprite.visible = false;
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
        const inFront = isShielding
          ? (facingIdx >= 0 && facingIdx <= 3)
          : (facingIdx === 0 || facingIdx === 1 || facingIdx === 2 || facingIdx === 7);
        const bodyIdx = display.getChildIndex(display._spriteBody);
        const wcIdx   = display.getChildIndex(display._weaponContainer);
        /* Pixi setChildIndex removes the child, then inserts at the
           given index in the post-removal array.  When weaponContainer
           is currently AFTER spriteBody, removing it leaves spriteBody
           at its original bodyIdx; when BEFORE, removing shifts
           spriteBody down by 1.  Compute target accordingly so we land
           exactly one slot after (in front) or one slot before (behind)
           spriteBody in the new array. */
        const targetIdx = inFront
          ? (wcIdx > bodyIdx ? bodyIdx + 1 : bodyIdx)        // after spriteBody
          : (wcIdx > bodyIdx ? bodyIdx : Math.max(0, bodyIdx - 1));  // before spriteBody
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
        const shieldBehind = (facingIdx === 5 || facingIdx === 6 || facingIdx === 7);
        const bodyIdx = display.getChildIndex(display._spriteBody);
        const shIdx   = display.getChildIndex(display._shieldSprite);
        const targetShIdx = shieldBehind
          ? (shIdx > bodyIdx ? bodyIdx : Math.max(0, bodyIdx - 1))   // before spriteBody
          : (shIdx > bodyIdx ? bodyIdx + 1 : bodyIdx);               // after spriteBody
        if (shIdx !== targetShIdx) {
          display.setChildIndex(display._shieldSprite, targetShIdx);
        }
      }

      /* Swing arc trail — fading sector centered on the hand pivot,
         sweeping from the swing's start angle through the current
         blade position.  Drawn on weaponGfx so it z-orders with the
         weapon sprite via the weaponContainer reorder.
         Special-attack swings render at ~1.5x reach with a saturated
         yellow fill so the heavy attack reads as larger and more
         noticeable than a normal swing. */
      if (swingActive) {
        const isSpecialSwing = !!S._specialAttack;
        const trailReach = isSpecialSwing ? 64 : 42;
        const startAng = aimAngleForSwing - SWING_FULL_ARC / 2;
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
      }

      // Shield visual — 120° guard arc in front of the player, oriented
      // toward the aim direction (S._shieldAngle if set, else
      // S._aimAngle, else facingAngle).  Drawn as a translucent
      // wedge fill plus a thicker rim so it reads as an actual
      // barrier.  Pulses brighter when a hit was just blocked.
      // Renders whenever S._shieldUp — doesn't gate on the shield
      // item being equipped, since the shield-up input is what
      // matters here visually (gameplay determines whether the
      // block actually mitigates damage).
      if (isShielding) {
        const shieldAng = (S._shieldAngle != null)
          ? S._shieldAngle
          : ((S._aimAngle != null) ? S._aimAngle : (S._facingAngle || 0));
        const sR = 16;                        // hand-out distance from body
        // Player sprite is bottom-anchored (feet at y=0). With the 2x size
        // bump the shield center sits at feet, top reaches chest naturally.
        const shieldHoldY = 0;
        const blockAge = S._blockFlash ? (now - S._blockFlash) / 250 : 1;
        const blockPulse = blockAge < 1 ? (1 - blockAge) : 0;
        const shieldFrame = getShieldFrame(shieldAng);
        const shieldSprite = display._shieldSprite;
        if (shieldFrame && shieldSprite) {
          if (shieldSprite.texture !== shieldFrame.tex) shieldSprite.texture = shieldFrame.tex;
          shieldSprite.x = Math.cos(shieldAng) * sR;
          shieldSprite.y = Math.sin(shieldAng) * sR + bobY + shieldHoldY;
          /* Render at 56 px (sprite is 64 px source). */
          const baseScale = 56 / 64;
          shieldSprite.scale.x = baseScale * (shieldFrame.mirror ? -1 : 1);
          shieldSprite.scale.y = baseScale;
          /* Brief brightness pop on a successful block. */
          const pulseTint = blockPulse > 0 ? 0xffffff : 0xffffff;
          shieldSprite.tint = pulseTint;
          shieldSprite.alpha = 0.95 + blockPulse * 0.05;
          shieldSprite.visible = true;
        } else {
          if (shieldSprite) shieldSprite.visible = false;
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
    }

    // Player resource bars (HP/stamina/mana) removed — duplicated by
    // the bottom dashboard's resource readout (user request).  Name
    // tag now always sits at its default head offset.
    display._nameText.y = -28 + bobY;

    // §5.9.5 Combo Chain count + §5.7.7 Resonance streak — combined badge.
    const comboText = display._comboText;
    const combo = S.combo;
    const rs = S.player && S.player._resonanceStreak;
    const rsActive = rs && rs.count > 0 && (now - (rs.lastTs || 0) < 10000);
    if ((combo && combo.count > 0) || rsActive) {
      const c = (combo && combo.count) || 0;
      const cStr = c > 0 ? 'x' + c : '';
      const rStr = rsActive ? '↯' + rs.count : '';
      comboText.text = cStr + (cStr && rStr ? ' ' : '') + rStr;
      comboText.style.fill = c >= 3 ? '#f5c542' : c === 2 ? '#f2b441' : (rsActive ? '#a0c8ff' : '#ffffff');
      comboText.alpha = 1;
      comboText.y = display._nameText.y - 12;
    } else {
      comboText.alpha = 0;
    }

    // Name
    display._nameText.text = S.myName || 'You';

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

  _updatePet(S, now) {
    const pet = S._activePet;
    if (!pet) {
      if (this.petDisplay) { this.petDisplay.visible = false; }
      return;
    }

    if (!this.petDisplay) {
      this.petDisplay = new Container();
      this.petDisplay.label = 'pet';
      const petBody = new Graphics();
      this.petDisplay.addChild(petBody);
      this.petDisplay._body = petBody;
      const petName = new Text({ text: '', style: { ...NAME_STYLE, fontSize: 7 } });
      petName.anchor.set(0.5, 1);
      petName.y = -12;
      this.petDisplay.addChild(petName);
      this.petDisplay._nameText = petName;
      this.entityLayer.addChild(this.petDisplay);
    }

    this.petDisplay.visible = true;
    this.petDisplay.x = pet.x || S.player.x + 20;
    this.petDisplay.y = pet.y || S.player.y + 15;

    const petBody = this.petDisplay._body;
    petBody.clear();
    const bounce = Math.sin(now / 300) * 2;
    petBody.circle(0, bounce, 6);
    petBody.fill({ color: cssColorToHex(pet.color || '#f5c542') });
    petBody.circle(0, bounce, 6);
    petBody.stroke({ color: 0xffffff, width: 1, alpha: 0.3 });

    this.petDisplay._nameText.text = pet.name || '🐾';
    this.petDisplay._nameText.y = -10 + bounce;
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

        /* Quest marker — text overlay above the head, pulses vertically.
           Hidden by default; populated when npc._questMarker is set. */
        const questMarkerText = new Text({
          text: '',
          style: { fontFamily: 'sans-serif', fontSize: 16, fontWeight: '700',
                   fill: '#f5c542', align: 'center' },
        });
        questMarkerText.anchor.set(0.5, 0.5);
        questMarkerText.visible = false;
        display.addChild(questMarkerText);
        display._questMarker = questMarkerText;

        /* Avatar — emoji rendered at the body center.  Special-case
           '💀' for the Ferryman: no body circle, just the skull. */
        const avatarText = new Text({
          text: npc.avatar || '👤',
          style: { fontFamily: 'sans-serif', fontSize: 16, align: 'center' },
        });
        avatarText.anchor.set(0.5, 0.5);
        display.addChild(avatarText);
        display._avatar = avatarText;

        this.entityLayer.addChild(display);
        this.npcDisplays.set(npc.id, display);
      }

      display.x = npc.x;
      display.y = npc.y;

      /* Body — only redraw when color changes (NPCs are static). */
      const body = display._body;
      const isSkull = npc.avatar === '💀';
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

      /* HP bar (24x3 above the head, color by remaining HP). */
      const hpBar = display._hpBar;
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

      /* Quest marker — `npc._questMarker` is '❗' (available) or '❓'
         (turn-in) or null.  Pulses vertically when visible. */
      const qm = display._questMarker;
      const qmStr = npc._questMarker || '';
      if (qmStr) {
        if (qm.text !== qmStr) qm.text = qmStr;
        const targetFill = qmStr === '❗' ? '#f5c542' : '#3dd497';
        if (qm.style.fill !== targetFill) qm.style.fill = targetFill;
        const pulse = Math.sin(now / 300) * 3;
        qm.y = -36 + pulse;
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
     (/icons/ui/bar-hp.png etc) so the in-world readout matches the
     XP bar in the dashboard.  A small dim overlay on the right
     portion of each pill shows the unfilled fraction.  No backdrop
     -- the pills float directly on the canvas.
     Visibility: each bar fades in when its resource is below max,
     holds for HOLD_MS at full, then fades out. */
  _updatePlayerHud(S, now) {
    const R = S && S.rpg;
    const d = this.playerDisplay;
    if (!R || !d || !d._hudHpSprite) return;

    _ensureHudBarTextures();
    /* Bind textures the first time they resolve. */
    if (_hudBarTex.hp   && d._hudHpSprite.texture   !== _hudBarTex.hp)   d._hudHpSprite.texture   = _hudBarTex.hp;
    if (_hudBarTex.mp   && d._hudMpSprite.texture   !== _hudBarTex.mp)   d._hudMpSprite.texture   = _hudBarTex.mp;
    if (_hudBarTex.stam && d._hudStamSprite.texture !== _hudBarTex.stam) d._hudStamSprite.texture = _hudBarTex.stam;

    const W = 64, H = 10;
    const MIN_LABEL_W = 14; /* hide the value-number if its section is narrower */
    const HOLD_MS = 2500;
    const FADE_STEP = 16.7 / 300; /* ~300 ms fade-in / fade-out */
    /* HP closest to head (y=-50), Mana middle (-62), Energy top (-74).
       nameText sits at -38 so the HUD floats above the name plate. */
    const bars = [
      { sprite: d._hudHpSprite,   empty: d._hudHpEmpty,   tFull: d._hudHpTextFull,   tEmpty: d._hudHpTextEmpty,   cur: R.hp,      max: R.maxHp,      y: -50 },
      { sprite: d._hudMpSprite,   empty: d._hudMpEmpty,   tFull: d._hudMpTextFull,   tEmpty: d._hudMpTextEmpty,   cur: R.mana,    max: R.maxMana,    y: -62 },
      { sprite: d._hudStamSprite, empty: d._hudStamEmpty, tFull: d._hudStamTextFull, tEmpty: d._hudStamTextEmpty, cur: R.stamina, max: R.maxStamina, y: -74 },
    ];
    for (const b of bars) {
      const max = b.max || 1;
      const cur = Math.max(0, Math.min(max, b.cur || 0));
      const pct = cur / max;
      const full = cur >= max - 0.01;
      if (!full) b.sprite._lastNotFullAt = now;
      const sinceChange = now - (b.sprite._lastNotFullAt || 0);
      const targetAlpha = (!full || sinceChange < HOLD_MS) ? 1 : 0;
      const a = (b.sprite.alpha != null) ? b.sprite.alpha : 0;
      const delta = targetAlpha - a;
      const newAlpha = a + Math.max(-FADE_STEP, Math.min(FADE_STEP, delta));
      b.sprite.alpha = b.empty.alpha = newAlpha;

      /* Size + position the pill sprite once a texture is bound. */
      if (b.sprite.texture && b.sprite.texture.width > 0) {
        b.sprite.width = W;
        b.sprite.height = H;
        b.sprite.x = 0;
        b.sprite.y = b.y;
      }
      /* Dim overlay on the unfilled (right) portion.  Width shrinks
         to zero when the bar is full; no overlay drawn at 0 width. */
      b.empty.clear();
      const filledW = W * pct;
      const emptyW = W - filledW;
      if (emptyW > 0.5) {
        b.empty.rect(-W / 2 + filledW, b.y - H / 2, emptyW, H);
        b.empty.fill({ color: 0x000000, alpha: 0.55 });
      }

      /* Numeric overlays: current value centered on the filled
         section (white), missing value centered on the empty
         section (red).  Hidden when the section is narrower than
         MIN_LABEL_W so a near-empty / near-full pill doesn't
         render an illegible smear. */
      const curStr = String(Math.ceil(cur));
      const missStr = String(Math.ceil(max - cur));
      if (b.tFull.text !== curStr) b.tFull.text = curStr;
      if (b.tEmpty.text !== missStr) b.tEmpty.text = missStr;
      b.tFull.x = -W / 2 + filledW / 2;
      b.tFull.y = b.y;
      b.tEmpty.x = -W / 2 + filledW + emptyW / 2;
      b.tEmpty.y = b.y;
      const fullVisible = filledW >= MIN_LABEL_W && newAlpha > 0.02;
      const emptyVisible = emptyW >= MIN_LABEL_W && newAlpha > 0.02;
      b.tFull.alpha = fullVisible ? newAlpha : 0;
      b.tEmpty.alpha = emptyVisible ? newAlpha : 0;
      b.tFull.visible = fullVisible;
      b.tEmpty.visible = emptyVisible;
    }
  }

  clear() {
    /* Called on zone change AND on full renderer destroy.  Preserve the
       playerDisplay (and petDisplay) across zones — the local player is
       the one entity that persists.  Destroying + recreating it caused
       the sprite to render invisibly in some zones (probably a frame
       race between layer reattachment and the next _updatePlayer pass).
       app.destroy({children:true}) handles full cleanup at shutdown. */
    for (const [, d] of this.monsterDisplays) d.destroy({ children: true });
    this.monsterDisplays.clear();
    for (const [, d] of this.otherPlayerDisplays) d.destroy({ children: true });
    this.otherPlayerDisplays.clear();
    for (const [, d] of this.npcDisplays) d.destroy({ children: true });
    this.npcDisplays.clear();
    /* playerDisplay + petDisplay intentionally NOT destroyed here. */
  }
}
