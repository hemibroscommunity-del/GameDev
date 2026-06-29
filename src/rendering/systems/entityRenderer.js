/**
 * Entity Renderer — renders player, monsters, other players, NPCs, and pets.
 * Uses PixiJS Graphics for procedural shapes (matching the original Canvas 2D look).
 */
import { Assets, Container, Graphics, Rectangle, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import { TILE } from '@/data/constants.js';
import { ZONES } from '@/data/zones.js';
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
import { getAnchor, getJogForwardHand, getWeaponHandle, getHeadAnchor } from '../playerAnchors.js';
import { TRAIT_CATEGORIES, resolveBodyAnchor } from '../traitCategories.js';
import { getNftTextures } from '../nftAvatars.js';
import { getHeadwear } from '../traits/headwearCatalog.js';
import { getFacialHair } from '../traits/facialHairCatalog.js';
import { getHair } from '../traits/hairCatalog.js';
import { getSkin, getPants, getShoes, getBodyFrame, preloadBodyVariant } from '../playerSkins.js';
import { getHairColor, getColoredHairTextures } from '../traits/hairColorCatalog.js';
import { getHatColor, getColoredHatTextures } from '../traits/hatColorCatalog.js';
import { getFacialHairColor, getColoredFacialHairTextures } from '../traits/facialHairColorCatalog.js';
import { getShirt } from '../traits/shirtCatalog.js';
import { getShirtColor, shirtFill } from '../traits/shirtColorCatalog.js';
import { getGearFrame, getLoadedGearSources } from '../gearSheets.js';
import { combatGearUrls } from '../combatGear.js';
import { getEquip, onEquipChange } from '../gearCatalog.js';

/* §9.2.1 Collision-opportunity weapon edge glow — proximity radius (≈20u). */
const COLLISION_GLOW_RANGE_PX = 80;

/* Above-player HUD bar textures (v2.3.107).  Three pill-shaped PNGs
   the DOM dashboard also uses -- reuse the same `?v=` cache key so
   the browser hits the warm cache instead of issuing a fresh request. */
const HUD_BAR_VER = '2.3.68';
const _hudBarTex = { hp: null, mp: null, stam: null, heart: null, heartWhite: null };
let _hudBarLoadStarted = false;
function _ensureHudBarTextures() {
  if (_hudBarLoadStarted) return;
  _hudBarLoadStarted = true;
  Assets.load(`/icons/ui/bar-hp.png?v=${HUD_BAR_VER}`).then(t => { _hudBarTex.hp = t; }).catch(() => {});
  Assets.load(`/icons/ui/bar-mp.png?v=${HUD_BAR_VER}`).then(t => { _hudBarTex.mp = t; }).catch(() => {});
  Assets.load(`/icons/ui/bar-stam.png?v=${HUD_BAR_VER}`).then(t => { _hudBarTex.stam = t; }).catch(() => {});
  Assets.load(`/icons/popups/heart.png?v=${HUD_BAR_VER}`).then(t => { _hudBarTex.heart = t; }).catch(() => {});
  /* v2.3.214: white-fill heart for the player HP indicator so we can
     tint by HP tier (red asset can't be tinted to green/yellow because
     tint multiplies). */
  Assets.load(`/icons/popups/heart-white.png?v=${HUD_BAR_VER}`).then(t => { _hudBarTex.heartWhite = t; }).catch(() => {});
}

/* v2.3.261 (Bro-NFT Phase 4): trait textures for the local player's
   face/head composite layer.  One sprite per stored direction (east,
   north, northeast, south, southwest); W / NW / SE render via mirror.
   Currently hard-coded to the `test-1` NFT for demo; later this will
   read the active player's NFT ID from R.nftId or similar. */
const TRAIT_NFT_ID = 'test-1';
/* v2.3.708: bumped for the regenerated NE jog body-tops/body-anchors. */
const TRAIT_VER = '2.3.708';

/* v2.3.377: the on-back (sheathed) shield render is purely cosmetic and was
   a persistent source of per-facing z-order issues vs the body/arms/weapon/
   hair.  Hidden by user request.  The held/raised (blocking) shield is a
   separate path and is unaffected.  Flip to true to bring the back shield
   back. */
const SHOW_BACK_SHIELD = false;

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
    fetch(`/sprites/traits/${category}/${id}/meta.json?v=${TRAIT_VER}`)
      .then(r => r.ok ? r.json() : null)
      .then(j => { if (j) e.meta = j; })
      .catch(() => {});
    for (const dir of Object.keys(e.tex)) {
      Assets.load(`/sprites/traits/${category}/${id}/${dir}.png?v=${TRAIT_VER}`)
        .then(t => {
          e.tex[dir] = t;
          if (t && t.source) {
            /* match body's linear scaleMode + mipmaps so Lanczos
               downscale artifacts blend out the same way. */
            t.source.scaleMode = 'linear';
            t.source.autoGenerateMipmaps = true;
          }
        })
        .catch(() => {});  // expected for directions that don't exist yet
    }
  }
  return e;
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
let _bodyDataStarted = false;
function _ensureBodyData() {
  if (_bodyDataStarted) return;
  _bodyDataStarted = true;
  fetch(`/sprites/player/body-anchors.json?v=${TRAIT_VER}`)
    .then(r => r.ok ? r.json() : null)
    .then(j => { if (j) _bodyAnchors = j; })
    .catch(() => {});
  fetch(`/sprites/player/body-tops.json?v=${TRAIT_VER}`)
    .then(r => r.ok ? r.json() : null)
    .then(j => { if (j) _bodyTops = j; })
    .catch(() => {});
}

/* Mirrored views (W/NW/SE) reuse the opposite sheet texture, so they
   render with dir = E/NE/SW + mirror.  This maps that base dir back to
   the on-screen direction so meta can carry an optional override keyed
   by the mirrored side (e.g. crownNudge.west) without disturbing the
   un-mirrored side. */
const MIRROR_SCREEN_DIR = { east: 'west', northeast: 'northwest', southwest: 'southeast' };

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
   hit/pickup/attack keep the old behavior (no armor on them yet; east-hit
   stays slightly smaller per the original tuning). */
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
  stand: { south: 1.051, east: 0.983, north: 1.039, northeast: 1.003, southwest: 0.983 },
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
  jog:   { south: 1.000, east: 1.25, north: 1.050, northeast: 1.126, southwest: 1.000 },
};
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

/* Place a player's headwear sprite for this frame.  Shared by the local
   player (_updatePlayer) and remote players (_updateOtherPlayers).
   Crown-anchored + placement-independent: pins the hat's own crown
   (meta.anchors[dir]) onto the body crown (body-tops, per frame) plus
   small reusable per-dir/per-pose nudges, scaled to the body.  hatId
   'none' / falsy, or missing art/anchor -> hat hidden. */
function _placeTrait(sprite, entry, display, pose, dir, mirror, frameIdx, bodyScale) {
  if (!sprite) return;
  _ensureBodyData();
  const headwearTex = entry && entry.tex[dir];
  const meta = entry && entry.meta;
  const spriteBody = display._spriteBody;
  const bodyTop = _lookupBodyTop(pose, dir, frameIdx);
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
  const poseTraitMul = pose === 'mine' ? 1.21 : pose === 'fish' ? 0.88 : 1;
  const dscale = (_pick(meta.scale) || 1) * poseScale * poseTraitMul;
  if (headwear.texture !== headwearTex) headwear.texture = headwearTex;
  /* Anchor the hat sprite on its own crown pixel, then pin that point to
     the body crown's SCREEN position (mirror-correct) + the nudge, with
     only nudge X flipping under mirror.  Offset is a constant +/-nudgeX,
     independent of the per-frame crown sway. */
  headwear.anchor.set(anchorPx[0] / headwearTex.width, anchorPx[1] / headwearTex.height);
  const W = 256;
  const absBodyScale = Math.abs(bodyScale);
  const m = mirror ? -1 : 1;
  const bodyCrownX = spriteBody.x + (bodyTop[0] - W / 2) * absBodyScale * m;
  const bodyCrownY = spriteBody.y + (bodyTop[1] - W / 2) * absBodyScale;
  headwear.x = bodyCrownX + (nudge[0] + poseN[0]) * absBodyScale * m;
  headwear.y = bodyCrownY + (nudge[1] + poseN[1]) * absBodyScale;
  headwear.scale.x = m * absBodyScale * dscale;
  headwear.scale.y = absBodyScale * dscale;
  headwear.visible = true;
}

/* Headwear + facial-hair share the exact same crown-anchored placement;
   they differ only in which sprite layer + trait cache they use.  A beard
   is just a trait whose meta.crownNudge Y drops it from the head crown
   down to the chin (the inverse of the top-hat's large negative lift). */
function _placeHeadwear(display, hatId, hatColorId, pose, dir, mirror, frameIdx, bodyScale) {
  const baseEntry = _ensureHeadwearLoaded(hatId);
  /* v2.3.394: retint solid hats to the selected color (recolored textures
     reuse the base meta; fall back to native color while they bake). */
  let entry = baseEntry;
  const colored = getColoredHatTextures(hatId, hatColorId);
  if (colored && baseEntry) entry = { tex: colored, meta: baseEntry.meta };
  _placeTrait(display._headwearSprite, entry, display, pose, dir, mirror, frameIdx, bodyScale);
}
function _placeFacialHair(display, fhId, fhColorId, pose, dir, mirror, frameIdx, bodyScale) {
  const baseEntry = _ensureFacialHairLoaded(fhId);
  /* v2.3.395: retint the beard to the selected color (recolored textures
     reuse the base meta; fall back to native color while they bake). */
  let entry = baseEntry;
  const colored = getColoredFacialHairTextures(fhId, fhColorId);
  if (colored && baseEntry) entry = { tex: colored, meta: baseEntry.meta };
  _placeTrait(display._facialHairSprite, entry, display, pose, dir, mirror, frameIdx, bodyScale);
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
function _placeGear(display, equip, pose, dir, frameIdx) {
  const sb = display._spriteBody;
  for (let s = 0; s < _GEAR_SLOTS.length; s++) {
    const spr = display[_GEAR_SLOTS[s][1]];
    if (!spr) continue;
    const item = equip && equip[_GEAR_SLOTS[s][0]];
    /* v2.3.809: the shirt is an under-layer, and on some jog frames its
       sleeves/hem poke through the chest plate (the plate silhouette is not
       a strict superset of the shirt's).  Owner call: the shirt is fully
       hidden while a torso piece is worn -- it pops back on unequip. */
    const hiddenUnderChest = _GEAR_SLOTS[s][0] === 'shirt' && equip && equip.chest && equip.chest !== 'none';
    const tex = (sb && item && item !== 'none' && !hiddenUnderChest) ? getGearFrame(_GEAR_SLOTS[s][0], item, pose, dir, frameIdx) : null;
    if (tex) {
      if (spr.texture !== tex) spr.texture = tex;
      spr.x = sb.x; spr.y = sb.y;
      spr.scale.x = sb.scale.x; spr.scale.y = sb.scale.y;
      if (_GEAR_SLOTS[s][0] === 'shirt') {
        const t = equip && equip.shirtTint;
        spr.tint = t ? ((t[0] << 16) | (t[1] << 8) | t[2]) : 0xffffff;
      }
      if (!spr.visible) spr.visible = true;
    } else if (spr.visible) spr.visible = false;
  }
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
    try { m[region] = new Texture({ source: bodyTex.source, frame: new Rectangle(f.x, f.y + r0, f.width, r1 - r0) }); }
    catch (e) { m[region] = bodyTex; }
  }
  return m[region];
}
/* v2.3.611: masked body.  The AI-drawn armour frames are a few px off the body
   frames, so the body pokes past the plate edges.  Erase the body wherever the
   worn armour (dilated by `dilate` px to swallow the misalignment) covers, so it
   can never poke; the body still shows in bare regions.  Computed on a canvas
   and cached per (body-frame, loadout) -- cheap, recomputed only on a cache
   miss.  Falls back to the raw body texture if pixel access fails. */
const _maskedBodyCache = new Map();
function _maskedBodyFrame(bodyTex, worn, dilate) {
  /* v2.3.690: bake accounting for the perf HUD (?perf=1).  Cache misses are
     the spike source -- a gear swap rebakes every frame on next sighting.
     Read + reset by perfHud; zero cost beyond two adds per MISS. */
  const _bt0 = (typeof performance !== 'undefined') ? performance.now() : 0;
  const _bs = (typeof window !== 'undefined')
    ? (window.__btBakeStats || (window.__btBakeStats = { count: 0, ms: 0 }))
    : null;
  try {
    return _maskedBodyFrameInner(bodyTex, worn, dilate, _bt0, _bs);
  } finally { /* timing recorded inside on actual bakes only */ }
}
function _maskedBodyFrameInner(bodyTex, worn, dilate, _bt0, _bs) {
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
    if (figBot > figTop
        && worn.some(w => w.k && w.k.indexOf('chest:') === 0)
        && worn.some(w => w.k && w.k.indexOf('legs:') === 0)) {
      try {
        const fh = figBot - figTop;
        const waistY = Math.round(figTop + 0.45 * fh);   // a bit above mid-figure so the waist/hip skin (chain-belt zone) is caught too
        const img = ctx.getImageData(0, 0, 256, 256);
        const d = img.data;
        const medRGB = (y0, y1) => {            // per-channel median of opaque pixels in [y0,y1)
          const rs = [], gs = [], bs = [];
          for (let y = Math.max(0, y0); y < Math.min(256, y1); y++)
            for (let x = 0; x < 256; x++) { const o = (y * 256 + x) * 4; if (d[o + 3] > 40) { rs.push(d[o]); gs.push(d[o + 1]); bs.push(d[o + 2]); } }
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
              const o = (y * 256 + x) * 4; if (d[o + 3] <= 40) continue;
              const R = d[o], G = d[o + 1], B = d[o + 2];
              const pn = Math.sqrt(R * R + G * G + B * B) || 1;
              const cos = (R * skinRef[0] + G * skinRef[1] + B * skinRef[2]) / (pn * sn);
              if (cos < 0.985) { rs.push(R); gs.push(G); bs.push(B); }
            }
          if (rs.length) { const mid = a => { a.sort((p, q) => p - q); return a[a.length >> 1]; }; pantsRef = [mid(rs), mid(gs), mid(bs)]; }
          else pantsRef = medRGB(waistY, waistY + Math.round(0.40 * fh));
        }
        const score = (R, G, B, T) => { const n = T[0] * T[0] + T[1] * T[1] + T[2] * T[2] || 1; const dt = R * T[0] + G * T[1] + B * T[2]; return dt * dt / n; };
        if (skinRef && pantsRef && shoesRef) {
          let dirty = false;
          /* Restore pants the dilated cover-mask ATE: the chest gear's halo erodes
             the pants next to the gauntlets.  The erase only zeroed alpha (RGB
             intact in origBody), so re-open any erased pixel that reads as PANTS;
             skin/shoes stay erased so the armour still hides the torso/arms.
             Mirrors preview_armor_frames._blend_ghost_hand.  v2.3.650 */
          if (origBody) {
            for (let p = 0; p < 256 * 256; p++) {
              const o = p * 4;
              if (d[o + 3] > 40 || origBody[o + 3] <= 40 || ((p / 256) | 0) < neckY) continue;
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
          w0 = Math.max(0, Math.round(figTop + 0.38 * fh2));
          w1 = Math.min(256, Math.round(figTop + 0.64 * fh2));
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
            if (!fill[p]) { d2[o + 3] = 0; dirty2 = true; }
          }
        }
        if (dirty2) ctx.putImageData(img2, 0, 0);
      }
    } catch (e) { /* silhouette confinement is best-effort */ }
  } catch (e) { return bodyTex; }
  const t = Texture.from(cv);
  _maskedBodyCache.set(key, t);
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

/* v2.3.701: plan the WHOLE intro workload up front so the loading bar is
   monotonic.  Previously each pass added its own count to `total` when it
   started, so done/total dropped (bar visibly 'reset') when the alt pass
   registered 3x more work mid-load. */
export function planPrewarmProgress() {
  prewarmProgress.done = 0;
  prewarmProgress.total = 0;
  const DIRS = ['south', 'east', 'north', 'northeast', 'southwest'];
  let per = 0;
  for (const pose of ['stand', 'jog']) {
    for (const dir of DIRS) per += playerFrameCount(pose, dir) || 1;
  }
  const anyWorn = ['chest', 'legs'].some((sl) => { const it = getEquip(sl); return it && it !== 'none'; });
  prewarmProgress.total = per * ((anyWorn ? 1 : 0) + 3);   // current set + 3 alt sets
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
  for (const pose of ['stand', 'jog']) {
    for (const dir of DIRS) {
      const fc = playerFrameCount(pose, dir) || 1;
      for (let f = 0; f < fc; f++) {
        prewarmProgress.done++;
        const tex = getBodyFrame(getSkin(), getPants(), getShoes(), pose, dir, f, shirtT, shirtKey);
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
        try { _maskedBodyFrame(tex, worn, 6); } catch (e) { /* best-effort */ }
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
  const chestId = getEquip('chest') !== 'none' ? getEquip('chest') : 'steelplate';
  const legsId = getEquip('legs') !== 'none' ? getEquip('legs') : 'steelgreaves';
  /* v2.3.756: baked shirt retired -- only the shirtless body sheets exist
     now, so there is a single variant to warm. */
  try { await preloadBodyVariant(null, 'none'); } catch (e) { /* best-effort */ }
  if (seq !== _altPrewarmSeq) return;            // superseded by a newer kick
  const SETS = [
    { worn: [['chest', chestId], ['legs', legsId]], full: true },
    { worn: [['chest', chestId]], full: false },
    { worn: [['legs', legsId]], full: false },
  ];
  const DIRS = ['south', 'east', 'north', 'northeast', 'southwest'];
  let sinceYield = 0;
  for (const set of SETS) {
    const sT = null, sK = 'none';   /* v2.3.756: shirtless always */
    for (const pose of ['stand', 'jog']) {
      for (const dir of DIRS) {
        const fc = playerFrameCount(pose, dir) || 1;
        for (let f = 0; f < fc; f++) {
          if (seq !== _altPrewarmSeq) return;
          if (fast) prewarmProgress.done++;
          const tex = getBodyFrame(getSkin(), getPants(), getShoes(), pose, dir, f, sT, sK);
          if (!tex) continue;
          const worn = [];
          for (const [sl, id] of set.worn) {
            const gt = getGearFrame(sl, id, pose, dir, f);
            if (gt) worn.push({ k: sl + ':' + id, tex: gt });
          }
          if (!worn.length) continue;
          try { _maskedBodyFrame(tex, worn, 6); } catch (e) { /* best-effort */ }
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
    spr.y = sb.y + ((r0 + r1) / 2 - 128) * sb.scale.y;   // band's centre in the body's own transform
    spr.tint = sb.tint;
    spr.visible = true;
    anyShown = true;
  }
  return !anyShown;
}
function _hideBodyRegions(display) {
  for (const k of ['_bodyHead', '_bodyTorso', '_bodyLegs']) if (display[k]) display[k].visible = false;
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
function _clipHairToHat(display, hatId, pose, dir, mirror, frameIdx, bodyScale) {
  const hair = display._hairSprite;
  const maskSprite = display._hairMask;
  if (!hair || !maskSprite) return;
  const helmet = _ensureHeadwearLoaded(hatId);
  const meta = helmet && helmet.meta;
  const maskEntry = (meta && meta.clipsHair) ? _ensureHairMaskLoaded(hatId) : null;
  if (!(meta && meta.clipsHair && hair.visible && maskEntry && maskEntry.tex[dir])) {
    if (hair.mask) hair.mask = null;
    maskSprite.visible = false;
    return;
  }
  /* Reuse the trait placement with the helmet's meta but the mask texture
     so the silhouette lands exactly over the helmet. */
  _placeTrait(maskSprite, { tex: maskEntry.tex, meta }, display, pose, dir, mirror, frameIdx, bodyScale);
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
  if (colored && baseEntry) entry = { tex: colored, meta: baseEntry.meta };
  _placeTrait(display._hairSprite, entry, display, pose, dir, mirror, frameIdx, bodyScale);
  _clipHairToHat(display, hatId, pose, dir, mirror, frameIdx, bodyScale);
}

/* v2.3.867: composite the player's CURRENT traits (hat / beard / hair) onto a
   stand-in skill sprite — the pre-drawn chopper / cook / fire-lighter that
   REPLACES the trait-composed body during woodcutting / cooking / firemaking.
   Standalone version of _placeTrait: the caller (effectsRenderer) owns the
   three sprites and passes the crown WORLD position (computed from the
   stand-in's own transform), a scale, and the trait direction (south for the
   front-facing cook/fire, east for the side-facing chopper).  No 256-frame /
   spriteBody assumptions — placement is purely world-space. */
function _placeStandaloneTrait(sprite, entry, dir, mirror, cwx, cwy, scaleVal) {
  if (!sprite) return;
  const tex = entry && entry.tex[dir];
  const meta = entry && entry.meta;
  const anchorPx = (meta && meta.anchors && meta.anchors[dir]) || null;
  if (!(tex && meta && meta.fullFrame && anchorPx)) { sprite.visible = false; return; }
  if (sprite.texture !== tex) sprite.texture = tex;
  const screenDir = mirror ? (MIRROR_SCREEN_DIR[dir] || dir) : dir;
  const _pick = (obj) => obj && (obj[screenDir] != null ? obj[screenDir] : obj[dir]);
  const nudge = _pick(meta.crownNudge) || [0, 0];
  const dscale = (_pick(meta.scale) || 1);
  const m = mirror ? -1 : 1;
  sprite.anchor.set(anchorPx[0] / tex.width, anchorPx[1] / tex.height);
  sprite.x = cwx + nudge[0] * scaleVal * m;
  sprite.y = cwy + nudge[1] * scaleVal;
  sprite.scale.x = m * scaleVal * dscale;
  sprite.scale.y = scaleVal * dscale;
  sprite.visible = true;
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

/** Place hat + beard + hair (the player's current selection) on a stand-in
 *  skill sprite.  sprites = { hat, beard, hair } owned by the caller. */
export function placeSkillTraits(sprites, cwx, cwy, dir, mirror, scaleVal) {
  if (!sprites) return;
  /* hair first (renders behind the hat in the caller's child order), then
     beard, then hat. */
  let hairEntry = _ensureHairLoaded(getHair());
  const hairCol = getColoredHairTextures(getHair(), getHairColor());
  if (hairCol && hairEntry) hairEntry = { tex: hairCol, meta: hairEntry.meta };
  _placeStandaloneTrait(sprites.hair, hairEntry, dir, mirror, cwx, cwy, scaleVal);

  let fhEntry = _ensureFacialHairLoaded(getFacialHair());
  const fhCol = getColoredFacialHairTextures(getFacialHair(), getFacialHairColor());
  if (fhCol && fhEntry) fhEntry = { tex: fhCol, meta: fhEntry.meta };
  _placeStandaloneTrait(sprites.beard, fhEntry, dir, mirror, cwx, cwy, scaleVal);

  let hwEntry = _ensureHeadwearLoaded(getHeadwear());
  const hwCol = getColoredHatTextures(getHeadwear(), getHatColor());
  if (hwCol && hwEntry) hwEntry = { tex: hwCol, meta: hwEntry.meta };
  _placeStandaloneTrait(sprites.hat, hwEntry, dir, mirror, cwx, cwy, scaleVal);
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
  if (hairCol && hairEntry) hairEntry = { tex: hairCol, meta: hairEntry.meta };
  _placeStandaloneTrait(sprites.hair, hairEntry, dir, mirror, cwx, cwy, scaleVal);

  let fhEntry = _ensureFacialHairLoaded(looks.facialhair);
  const fhCol = getColoredFacialHairTextures(looks.facialhair, looks.facialHairColor);
  if (fhCol && fhEntry) fhEntry = { tex: fhCol, meta: fhEntry.meta };
  _placeStandaloneTrait(sprites.beard, fhEntry, dir, mirror, cwx, cwy, scaleVal);

  let hwEntry2 = _ensureHeadwearLoaded(looks.headwear);
  const hwCol2 = getColoredHatTextures(looks.headwear, looks.hatColor);
  if (hwCol2 && hwEntry2) hwEntry2 = { tex: hwCol2, meta: hwEntry2.meta };
  _placeStandaloneTrait(sprites.hat, hwEntry2, dir, mirror, cwx, cwy, scaleVal);
}

/** Hide all three skill-trait sprites (no stand-in active this frame). */
export function hideSkillTraits(sprites) {
  if (!sprites) return;
  if (sprites.hat) sprites.hat.visible = false;
  if (sprites.beard) sprites.beard.visible = false;
  if (sprites.hair) sprites.hair.visible = false;
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
function _orderTraitsAndWeapon(display, facingIdx) {
  const beard = display._facialHairSprite;
  /* --- Beard layer --- */
  if (display._spriteBody && beard && beard.visible) {
    /* Rear = away-from-camera: NW(5) / N(6).  NE(7) is a toward-camera
       facing (same set as the weapon block below: E/SE/S/NE) -- the
       v2.3.679 fix shipped with NE in the rear set, which hid the beard
       on NE (user report, v2.3.689).  SW(3) was then swept INTO the rear
       set by that fix, which hid the beard entirely on southwest (user
       report, v2.3.698) -- SW shows the face, so it belongs with the
       toward-camera facings (beard above body + gear like S/SE). */
    const rearFacing = (facingIdx === 5 || facingIdx === 6);
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
                       display._handCapSprite, display._handArmSprite,
                       display._shieldSprite]) {
        if (s && s.visible) ref = Math.max(ref, display.getChildIndex(s));
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

  const lvlText = new Text({ text: '', style: { ...NAME_STYLE, fontSize: 8 } });
  lvlText.anchor.set(0.5, 1);
  lvlText.y = -size - 12;
  container.addChild(lvlText);

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
  container.addChild(hpHeart);

  const hpText = new Text({ text: '', style: MONSTER_HP_NUM_STYLE });
  hpText.anchor.set(0.5, 0.5);
  hpText.alpha = 0;
  container.addChild(hpText);

  container._body = body;
  container._spriteBody = spriteBody;
  container._isFodder = isFodder;
  container._variantKey = variantKey;
  container._isSnowman = isSnowman;
  container._hpHeart = hpHeart;
  container._hpText = hpText;
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
  /* v2.3.608: per-region body sprites (head/torso/legs), drawn below the gear.
     The body renders through these so an unequipped slot reveals just that
     region at naked scale; spriteBody stays the (invisible) texture+transform
     reference the gear copies. */
  const bodyHead = new Sprite(); bodyHead.anchor.set(0.5, 0.5); bodyHead.visible = false; container.addChild(bodyHead);
  const bodyTorso = new Sprite(); bodyTorso.anchor.set(0.5, 0.5); bodyTorso.visible = false; container.addChild(bodyTorso);
  const bodyLegs = new Sprite(); bodyLegs.anchor.set(0.5, 0.5); bodyLegs.visible = false; container.addChild(bodyLegs);
  container._bodyHead = bodyHead; container._bodyTorso = bodyTorso; container._bodyLegs = bodyLegs;

  /* v2.3.503: layered gear (paper-doll).  One sprite per slot, drawn above the
     body with the body's exact transform.  Order shirt < legs < chest <
     shoulders, all above the body and below the head traits.
     v2.3.748: gearShirt = the layered t-shirt (tinted white-base sheet),
     under the armour so a chest plate covers it. */
  const gearShirt = new Sprite(); gearShirt.anchor.set(0.5, 0.5); gearShirt.visible = false; container.addChild(gearShirt);
  const gearLegs = new Sprite(); gearLegs.anchor.set(0.5, 0.5); gearLegs.visible = false; container.addChild(gearLegs);
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

  /* Above-head HP indicator: quartile-colored progress RING with a muted
     gray center holding the current HP over a small muted max (v2.3.458,
     replaces the heart icon — see HP_RING_* constants). */
  const hudHpRing = new Graphics();
  hudHpRing.alpha = 0;
  container.addChild(hudHpRing);
  const hudHpText = new Text({ text: '', style: PLAYER_HP_NUM_STYLE });
  hudHpText.anchor.set(0.5, 0.5);
  hudHpText.alpha = 0;
  container.addChild(hudHpText);
  const hudHpMaxText = new Text({ text: '', style: HP_RING_MAX_STYLE });
  hudHpMaxText.anchor.set(0.5, 0.5);
  hudHpMaxText.alpha = 0;
  container.addChild(hudHpMaxText);

  container._body = body;
  container._spriteBody = spriteBody;
  container._shirtSprite = shirtSprite;
  container._facialHairSprite = facialHairSprite;
  container._hairSprite = hairSprite;
  container._hairMask = hairMask;
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
  container._shieldSprite = shieldSprite;
  container._comboText = comboText;
  container._stunTimerText = stunTimerText;
  container._nameText = nameText;
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
  /* v2.3.608: per-region body sprites (head/torso/legs), drawn below the gear.
     The body renders through these so an unequipped slot reveals just that
     region at naked scale; spriteBody stays the (invisible) texture+transform
     reference the gear copies. */
  const bodyHead = new Sprite(); bodyHead.anchor.set(0.5, 0.5); bodyHead.visible = false; container.addChild(bodyHead);
  const bodyTorso = new Sprite(); bodyTorso.anchor.set(0.5, 0.5); bodyTorso.visible = false; container.addChild(bodyTorso);
  const bodyLegs = new Sprite(); bodyLegs.anchor.set(0.5, 0.5); bodyLegs.visible = false; container.addChild(bodyLegs);
  container._bodyHead = bodyHead; container._bodyTorso = bodyTorso; container._bodyLegs = bodyLegs;

  /* v2.3.504: layered gear for remote players (above body, below head traits).
     Driven by other.equip; placement copies the body transform.
     v2.3.748: + shirt under-layer (see local display). */
  const gearShirt = new Sprite(); gearShirt.anchor.set(0.5, 0.5); gearShirt.visible = false; container.addChild(gearShirt);
  const gearLegs = new Sprite(); gearLegs.anchor.set(0.5, 0.5); gearLegs.visible = false; container.addChild(gearLegs);
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
  container._shirtSprite = shirtSprite;
  container._facialHairSprite = facialHairSprite;
  container._hairSprite = hairSprite;
  container._hairMask = hairMask;
  container._headwearSprite = headwearSprite;
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
            if (display._hpHeart && !display._hpHeart.destroyed) display._hpHeart.alpha = 0;
            if (display._hpText && !display._hpText.destroyed) display._hpText.alpha = 0;
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
            if (display._hpHeart && !display._hpHeart.destroyed) display._hpHeart.alpha = 0;
            if (display._hpText && !display._hpText.destroyed) display._hpText.alpha = 0;
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
      const heartTex = _hudBarTex.heart;
      if (heartTex && display._hpHeart.texture !== heartTex) {
        display._hpHeart.texture = heartTex;
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
          visualTopY = display._size - 96;
        } else {
          visualTopY = -size;
        }
        /* lvlText sits at y=-size-12 with anchor (0.5, 1) — occupies
           y=[-size-22, -size-12].  Heart hugs whichever is higher
           (sprite top or lvl text band) with a 2 px gap. */
        const lvlTopY = -size - 22;
        const topY = Math.min(visualTopY, lvlTopY);
        const heartY = topY - 2 - MONSTER_HEART_SIZE / 2;
        display._hpHeart.width = MONSTER_HEART_SIZE;
        display._hpHeart.height = MONSTER_HEART_SIZE;
        display._hpHeart.x = 0;
        display._hpHeart.y = heartY;
        /* Heart asset tapers to a V at the bottom; the widest section
           sits ~12% above the geometric center.  Shift the number up
           by that fraction so it lands in the meaty part instead of
           riding the V. */
        display._hpText.x = 0;
        display._hpText.y = heartY - MONSTER_HEART_SIZE * 0.12;
      }
      if (hpPct >= 0.999) {
        display._hpHeart.alpha = 0;
        display._hpText.alpha = 0;
      } else {
        display._hpHeart.alpha = 1;
        display._hpText.alpha = 1;
        const hpStr = String(Math.max(0, Math.ceil(curHp)));
        if (display._hpText.text !== hpStr) display._hpText.text = hpStr;
      }
      display._lastHpPct = hpPct;

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

  /* v2.3.1091: zone perspective player-scale -- the Overlook/vista "world
     view" shrink that makes avatars tiny while travelling. Shared by the
     LOCAL player and REMOTE players from each one's own position, so everyone
     shrinks together on a vista map. Previously only the local avatar shrank
     and other players stayed full size, dwarfing the tiny landscape. Absent
     playerScale => 1 (normal in-zone sizing, unchanged). */
  _zonePscale(S, x, y) {
    const _z = ZONES[S.currentZone];
    const ps = _z && _z.playerScale;
    if (typeof ps === 'number') return ps;
    if (ps && typeof ps === 'object') {
      const cx = (_z.w * TILE) / 2, cy = (_z.h * TILE) / 2;
      const d = Math.min(1, Math.hypot(x - cx, y - cy) / (Math.hypot(cx, cy) || 1));
      const near = ps.near != null ? ps.near : 0.6;
      const far = ps.far != null ? ps.far : 0.3;
      const curve = ps.curve != null ? ps.curve : 1; // <1 shrinks faster as you leave centre
      return near + (far - near) * Math.pow(d, curve);
    }
    return 1;
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

      /* v2.3.1091: apply the same per-zone perspective shrink the local
         player gets, computed from THIS remote's own position, so other
         players also become tiny on a vista map ("world view") instead of
         dwarfing the landscape. Normal zones have no playerScale => 1 (other
         players keep their correct in-zone size). The body's horizontal flip
         lives on the inner _spriteBody, so scaling the container uniformly
         here doesn't disturb facing. */
      {
        const pscale = this._zonePscale(S, display.x, display.y);
        if (display.scale.x !== pscale) display.scale.set(pscale);
      }

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
        /* Hide weapon + shield on the corpse. */
        if (display._weaponContainer) display._weaponContainer.visible = false;
        if (display._shieldSprite) display._shieldSprite.visible = false;
        if (display._nftFront) display._nftFront.visible = false;
        if (display._nftBack) display._nftBack.visible = false;
        if (display._headwearSprite) display._headwearSprite.visible = false;
        if (display._facialHairSprite) display._facialHairSprite.visible = false;
        if (display._shirtSprite) display._shirtSprite.visible = false;
        if (display._hairSprite) display._hairSprite.visible = false;
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
      /* v2.3.1092: remote harvest activity broadcast by the gatherer.
         mine/fish render as the SAME south-only body poses the local player
         uses; chop/cook/fire are full-character STAND-INS drawn in
         effectsRenderer (_updateRemoteExtraction), so the whole body container
         is hidden while one is active (mirrors the local player's _chopHide). */
      const _rex = other._ex || null;
      const _rexStandIn = _rex === 'chop' || _rex === 'cook' || _rex === 'fire';
      const _rexBodyPose = _rex === 'mine' ? 'mine' : _rex === 'fish' ? 'fish' : null;
      if (display.visible === _rexStandIn) display.visible = !_rexStandIn;
      const pose = _rexBodyPose
        ? _rexBodyPose
        : (isHit ? 'hit' : (isMoving ? 'jog' : 'stand'));
      const spritesAvailable = hasPose(pose) || hasPose('stand');
      let useSprite = false;
      if (!_rexStandIn && spritesAvailable) {
        const spriteBody = display._spriteBody;
        let { dir, mirror } = resolveDirection(facing);
        /* mine/fish frames are authored south-only -> force south, no mirror. */
        if (pose === 'mine' || pose === 'fish') { dir = 'south'; mirror = false; }
        let frameIdx = 0;
        if (pose === 'jog') {
          /* Frame count is per-direction now (24-35) — pulled from
             the loaded sheet width so a longer strip plays more frames
             in the same 1s cycle, giving smoother motion. */
          const fc = playerFrameCount('jog', dir) || 24;
          /* v2.3.603: armoured remote keeps slower NE/NW cadence; naked = +35%. */
          const _arm = !!(other.equip && other.equip.chest && other.equip.chest !== 'none'
            && other.equip.legs && other.equip.legs !== 'none');
          frameIdx = Math.floor((now / cycleMs('jog', dir, _arm)) * fc) % fc;
        } else if (pose === 'hit') {
          const hitT = (now - (other._hitFlash || 0)) / 250;
          frameIdx = Math.max(0, Math.min(5, Math.floor(hitT * 6)));
        } else if (pose === 'mine' || pose === 'fish') {
          /* v2.3.1092: loop the south-only gather cycle off `now`, same cadence
             as the local player's mine/fish pose. */
          const fc = playerFrameCount(pose, 'south') || (pose === 'mine' ? 14 : 32);
          frameIdx = Math.floor((now / cycleMs(pose, 'south')) * fc) % fc;
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
        let tex = getBodyFrame(other.skin, other.pants, other.shoes, pose, dir, frameIdx, _oShirtT, _oShirtKey);
        if (!tex) tex = getBodyFrame(other.skin, other.pants, other.shoes, 'stand', dir, 0, _oShirtT, _oShirtKey);
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
          /* v2.3.504: this remote player's layered gear (their equip is
             broadcast over the network). */
          _placeGear(display, {
            shirt: _oShirtEquip, legs: _oEq.legs, chest: _oEq.chest,
            shoulders: _oEq.shoulders,
            shirtTint: shirtFill(other.shirt || 'tshirt', other.shirtColor),
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
          if (_rworn.length) {
            const _mt = _maskedBodyFrame(tex, _rworn, 6);
            if (spriteBody.texture !== _mt) spriteBody.texture = _mt;
          }
          spriteBody.visible = true;
          /* shirt is baked into the body (see getBodyFrame above); no overlay. */
          if (display._shirtSprite) display._shirtSprite.visible = false;
          /* always show the remote's hair/hat/beard (no helmet to hide them). */
          _placeHeadwear(display, other.headwear, other.hatColor, pose, dir, mirror, frameIdx, sizeMul);
          _placeFacialHair(display, other.facialhair, other.facialHairColor, pose, dir, mirror, frameIdx, sizeMul);
          _placeHair(display, other.hair, other.hairColor, other.headwear, pose, dir, mirror, frameIdx, sizeMul);
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
      /* v2.3.354: beard z-order for remote players (same rule as local). */
      _orderTraitsAndWeapon(display, facingIdx);

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

      const nextName = other.name || 'Anon';
      if (display._lastName !== nextName) {
        display._lastName = nextName;
        display._nameText.text = nextName;
      }
      /* Raised from -24 to -42 so the name floats above the head
         instead of sitting over the sprite's face. */
      display._nameText.y = -42 + bobY;
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
    if (typeof window !== 'undefined' && window.__btMaskDebug) window.__playerDisplay = display;
    /* Force visibility every frame — same defensive concern as the
       parent re-attach above.
       v2.3.846: ...except while a woodcutting chop is active — the chopper
       sprite (effectsRenderer) stands in for the avatar beside the tree,
       so hide the real one to avoid a double character.
       v2.3.853: same for cooking (the cook+pan sprite stands in beside the
       campfire) and firemaking (the crouching-to-light sprite stands in at
       the player). */
    const _exSkill = (S._extraction && (S._extraction.status === 'waiting' || S._extraction.status === 'ready'))
      ? S._extraction.skill : null;
    const _chopHide = _exSkill === 'woodcutting' || _exSkill === 'cooking' || !!S._firemaking;
    display.visible = !_chopHide;
    display.x = P.x;
    display.y = P.y;

    /* v2.3.858: per-zone player render scale -- shrink the avatar on vista
       maps (e.g. the Overlook) so it doesn't dwarf the landscape.
       zone.playerScale is either a flat number, or { near, far } to scale by
       distance from the zone centre (bigger at the plateau, smaller toward the
       distant edges). Absent => 1 (normal). v2.3.1091: extracted to
       _zonePscale and shared with the remote-player path. */
    {
      const pscale = this._zonePscale(S, P.x, P.y);
      if (display.scale.x !== pscale) display.scale.set(pscale);
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
      if (display._handCapSprite) display._handCapSprite.visible = false;
      if (display._handArmSprite) display._handArmSprite.visible = false;
      if (display._nftFront) display._nftFront.visible = false;
      if (display._nftBack) display._nftBack.visible = false;
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
    let facing;
    if (lootFrozen) {
      facing = 'south';
    } else if (mining || fishing) {
      facing = 'south';
    } else if (isShielding && S._shieldAngle != null) {
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
    /* v2.3.396: publish the ACTUAL rendered facing (8-way compass) so the
       network broadcast can send it and remote clients render the same
       facing -- they previously reconstructed it from movement, which is
       wrong whenever a standing player's facing came from aim, not motion. */
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
    const pose = lootFrozen
      ? 'pickup'
      : (mining
          ? 'mine'
          : (fishing
              ? 'fish'
              : (isHit
                  ? 'hit'
                  : (isMoving ? 'jog' : 'stand'))));
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
    /* v2.3.551: set true once the full covering set hides the body, so the
       NFT/procedural fallbacks below don't draw a body in its place.  Declared
       at function scope (the NFT fallback is outside the spritesAvailable block). */
    let _armorHidesBody = false;
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
        /* v2.3.603: armoured (chest+legs worn) keeps the slower NE/NW cadence;
           the naked body gets the +35% speed-up. */
        const _armCadence = getEquip('chest') !== 'none' && getEquip('legs') !== 'none';
        const baseCycle = cycleMs('jog', dir, _armCadence);
        const effectiveCycle = useAimDirection ? baseCycle * 2 : baseCycle;
        const rawIdx = Math.floor((now / effectiveCycle) * fc) % fc;
        frameIdx = isMovingBackward ? ((fc - 1) - rawIdx) : rawIdx;
        /* v2.3.839: footstep SFX locked to the jog animation.  The jog
           sheet is ONE half-stride (one step) played each effectiveCycle,
           so fire exactly one footstep per cycle -- the sound now matches
           the visible stride exactly.  Naked uses a shorter cycleMs, so
           its steps come quicker: a naturally lighter tempo, no separate
           timer needed.  Aim/shield doubles effectiveCycle, so steps slow
           with the animation too. */
        const _jogCycle = Math.floor(now / effectiveCycle);
        if (display._jogCycle !== _jogCycle) {
          if (display._jogCycle !== undefined && typeof window !== 'undefined' && window.BT_AUDIO) {
            window.BT_AUDIO.footstep(getEquip('chest') !== 'none' || getEquip('legs') !== 'none' || getEquip('shoulders') !== 'none');
          }
          display._jogCycle = _jogCycle;
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
        frameIdx = Math.floor((now / cycle) * fc) % fc;
      } else if (pose === 'fish') {
        /* Fishing rod-sway loops continuously for the whole gather window
           (waiting + ready), south-only. */
        const fc = playerFrameCount('fish', 'south') || 32;
        const cycle = cycleMs('fish', 'south');
        frameIdx = Math.floor((now / cycle) * fc) % fc;
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
      let tex = pose === 'fish'
        ? getFrame('fish', 'south', frameIdx)
        : getBodyFrame(getSkin(), getPants(), getShoes(), pose, dir, frameIdx, _shirtT, _shirtKey);
      if (!tex) tex = getBodyFrame(getSkin(), getPants(), getShoes(), 'stand', dir, 0, _shirtT, _shirtKey);
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
        spriteBody.scale.x = (mirror ? -1 : 1) * bodyScale;
        spriteBody.scale.y = bodyScale;
        spriteBody.tint = 0xffffff;
        _placeGear(display, {
          shirt: getEquip('shirt'), legs: getEquip('legs'),
          chest: getEquip('chest'), shoulders: getEquip('shoulders'),
          /* white-base sheet x picked colour; null colour -> white tee */
          shirtTint: shirtFill(_shId, _shCol),
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
        let _bodyTex;
        try {
          _bodyTex = _worn.length ? _maskedBodyFrame(tex, _worn, 6) : tex;
        } catch (e) {
          _bodyTex = tex;
        }
        if (spriteBody.texture !== _bodyTex) spriteBody.texture = _bodyTex;
        spriteBody.visible = true;
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
        _placeHeadwear(display, getHeadwear(), getHatColor(), pose, dir, mirror, frameIdx, bodyScale);
        _placeFacialHair(display, getFacialHair(), getFacialHairColor(), pose, dir, mirror, frameIdx, bodyScale);
        _placeHair(display, getHair(), getHairColor(), getHeadwear(), pose, dir, mirror, frameIdx, bodyScale);

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
      S._swordFootY = display.y + (221 - 128) * _standBodyScale * _dscale;
      /* Also publish the avatar's drawn body height (crown-to-foot ~188px in
         the source frame) so the stand-in renders at the matching size for this
         facing / zone. */
      S._swordBodyH = (221 - 33) * _standBodyScale * _dscale;
      /* v2.3.1073: jog-scaled body height for the composited jog legs -- the bow
         art per direction is drawn jog-sized, so legs scaled by the STAND height
         read ~25% small (east jog 1.25 vs stand 0.983).  Use the JOG dir-scale. */
      S._jogBodyH = (221 - 33) * bodyDirScale('jog', dir) * LOCAL_SCALE * _dscale;
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
            weaponSprite.rotation = 0;
            /* v2.3.942: per-facing greatsword art is already drawn for its
               canonical facing, so flip it only for the truly-mirrored facings
               (resolveDirection's `mirror`: west/northwest/southeast).  Other
               weapons keep the single-icon rule (flip for SW/W/NW/N). */
            const weaponMirror = _gsDir ? mirror : (facingIdx >= 3 && facingIdx <= 6);
            weaponSprite.scale.x = (weaponMirror ? -1 : 1) * fitScale;
          }
          weaponSprite.scale.y = fitScale;
          weaponSprite.tint = 0xffffff;
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
          } else if (handArm) {
            handArm.visible = false;
          }
        } else {
          weaponSprite.visible = false;
          if (display._handCapSprite) display._handCapSprite.visible = false;
          if (display._handArmSprite) display._handArmSprite.visible = false;
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
        const inFront = _heldInHand ? inFrontInHand : (sheathed ? !inFrontInHand : inFrontInHand);
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
        /* v2.3.190: shield z-order rules.
           In-hand (raised): behind body for NW/N/NE (5/6/7).
           On-back rule: in front of body for E (0) + N-half (5/6/7);
           behind body for SE/S/SW/W (1/2/3/4). E joined the in-front
           set per user request -- with shield behind body on E, only
           a sliver was visible past the silhouette. */
        const shieldOnBack = !isShielding;
        const shieldBehind = shieldOnBack
          ? !(facingIdx === 0 || facingIdx === 5 || facingIdx === 6 || facingIdx === 7)
          : (facingIdx === 5 || facingIdx === 6 || facingIdx === 7);
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
      }

      /* v2.3.354: beard z-order, computed AFTER the weapon / shield / arm
         swaps so it has the final say on the facial-hair layer. */
      _orderTraitsAndWeapon(display, facingIdx);

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
      if (isShielding && S.rpg && S.rpg.shield) {
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
          /* v2.3.193: reset rotation in the in-hand path -- otherwise
             a running-lean rotation from the on-back path could stick
             when the player flips into a block mid-stride. */
          shieldSprite.rotation = 0;
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
      } else if (SHOW_BACK_SHIELD && S.rpg && S.rpg.shield && display._shieldSprite) {
        /* v2.3.187: shield equipped but not raised -> always on back,
           regardless of combat state. (v2.3.176 limited this to
           !isInCombat; user now wants it as the persistent default.)
           The outward face of a shield on the player's back points
           opposite the player's facing, so feed shieldAng = facing+PI
           into getShieldFrame for view selection -- e.g. facing N
           (player back to camera) -> shieldAng = S -> front view,
           facing E -> shieldAng = W -> side view (mirrored). */
        const facingAng = facingIdx * Math.PI / 4;
        const shieldAng = facingAng + Math.PI;
        const shieldFrame = getShieldFrame(shieldAng);
        const shieldSprite = display._shieldSprite;
        if (shieldFrame) {
          if (shieldSprite.texture !== shieldFrame.tex) shieldSprite.texture = shieldFrame.tex;
          /* Position on upper torso, displaced opposite the facing
             direction so the shield reads as resting on the back. Y
             offset (-10) lifts it from feet-anchored player center to
             roughly upper-back height. */
          const backR = 4;
          /* v2.3.191: per-facing nudge tables for fine-tuning shield
             position. Same pattern as the bamboo WOOD_NUDGE_X table
             in the weapon block above -- screen-space offsets applied
             on top of the geometric backR position. Tell the user
             which facing is off and we add a slot. */
          /* facingIdx: 0=E 1=SE 2=S 3=SW 4=W 5=NW 6=N 7=NE */
          const SHIELD_NUDGE_X = [-5, 0, 0, 0, 0, 0, 0, 0];
          const SHIELD_NUDGE_Y = [ 0, 0, 0, 0, 0, 0, 0, 0];
          const _shNudgeX = SHIELD_NUDGE_X[facingIdx] || 0;
          const _shNudgeY = SHIELD_NUDGE_Y[facingIdx] || 0;
          /* v2.3.368: west run only -- shift the on-back shield right 6px
             so it peeks past the body silhouette during the jog (it sits
             behind the body at W and was otherwise nearly fully occluded).
             East stays as-is (already reads well). */
          const _shWestRunX = (facingIdx === 4 && pose === 'jog') ? 6 : 0;
          shieldSprite.x = -Math.cos(facingAng) * backR + _shNudgeX + _shWestRunX;
          /* v2.3.366: add the jog bob (same bobY the weapon + held shield
             use) so the on-back shield rises/falls with the body instead
             of sitting bolt-still during the run. */
          shieldSprite.y = -Math.sin(facingAng) * backR - 10 + _shNudgeY + bobY;
          /* v2.3.193: running-lean. The player sprite art shows a
             slight forward lean during jog, but the shield on back
             stayed bolt-upright -- read as the shield disconnected
             from the body. Apply a small rotation when pose === 'jog'
             proportional to cos(facingAng) so the lean is strongest
             on E/W (visible side-to-side tilt) and zero on N/S where
             the lean is in/out of the screen plane and doesn't show
             in 2D anyway. */
          const RUN_LEAN = 0.15; // rad ~= 8.6°
          shieldSprite.rotation = pose === 'jog'
            ? RUN_LEAN * Math.cos(facingAng)
            : 0;
          /* v2.3.189: bumped scale 40/64 -> 56/64 so the on-back
             shield matches the in-hand block size. Both paths use
             the same wood-shield PNG triplet -- this aligns the
             apparent size too. */
          const sheathedScale = 56 / 64;
          shieldSprite.scale.x = sheathedScale * (shieldFrame.mirror ? -1 : 1);
          shieldSprite.scale.y = sheathedScale;
          shieldSprite.tint = 0xffffff;
          shieldSprite.alpha = 0.95;
          shieldSprite.visible = true;
        } else {
          shieldSprite.visible = false;
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

    /* Local player's name + level now live in the top-right player card
       (BottomDashboard.jsx).  Hide the above-head plate so it doesn't
       sit redundantly on top of the new HP heart. */
    if (display._nameText.visible) display._nameText.visible = false;

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
    if (!R || !d || !d._hudMpSprite) return;

    _ensureHudBarTextures();
    /* Bind textures the first time they resolve. */
    if (_hudBarTex.mp    && d._hudMpSprite.texture   !== _hudBarTex.mp)    d._hudMpSprite.texture   = _hudBarTex.mp;
    if (_hudBarTex.stam  && d._hudStamSprite.texture !== _hudBarTex.stam)  d._hudStamSprite.texture = _hudBarTex.stam;
    /* v2.3.214: prefer white-fill heart so we can tint by HP tier;
       fall back to the red one until heart-white resolves. */

    const W = 64, H = 10;
    const MIN_LABEL_W = 14; /* hide the value-number if its section is narrower */
    const HOLD_MS = 2500;
    const FADE_STEP = 16.7 / 300; /* ~300 ms fade-in / fade-out */

    /* v2.3.214: in-world MP segment bar replaced by SpecialChargePie
       anchored above the right joystick (src/ui/mobile/SpecialChargePie).
       Keep the Graphics node hidden + legacy sprite/text nodes off so
       no HUD pixels render above the player.  Pickup-pose / death paths
       still reference _hudMpEmpty so we leave the field in place. */
    {
      d._hudMpEmpty.clear();
      d._hudMpEmpty.alpha = 0;
      if (d._hudMpSprite && d._hudMpSprite.visible) d._hudMpSprite.visible = false;
      if (d._hudMpTextFull && d._hudMpTextFull.visible) d._hudMpTextFull.visible = false;
      if (d._hudMpTextEmpty && d._hudMpTextEmpty.visible) d._hudMpTextEmpty.visible = false;
    }

    /* Stamina pill (legacy single-bar style; unchanged). */
    const bars = [
      { sprite: d._hudStamSprite, empty: d._hudStamEmpty, tFull: d._hudStamTextFull, tEmpty: d._hudStamTextEmpty, cur: R.stamina, max: R.maxStamina, y: -124 },
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

      if (b.sprite.texture && b.sprite.texture.width > 0) {
        b.sprite.width = W;
        b.sprite.height = H;
        b.sprite.x = 0;
        b.sprite.y = b.y;
      }
      b.empty.clear();
      const filledW = W * pct;
      const emptyW = W - filledW;
      if (emptyW > 0.5) {
        b.empty.rect(-W / 2 + filledW, b.y - H / 2, emptyW, H);
        b.empty.fill({ color: 0x000000, alpha: 0.55 });
      }

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
      const hpFull = hpCur >= hpMax - 0.01;
      if (!hpFull) ring._lastNotFullAt = now;
      const hpSinceFull = now - (ring._lastNotFullAt || 0);
      const hpTargetAlpha = (!hpFull || hpSinceFull < HOLD_MS) ? 1 : 0;
      const hpA = (ring.alpha != null) ? ring.alpha : 0;
      const hpDelta = hpTargetAlpha - hpA;
      const hpNewAlpha = hpA + Math.max(-FADE_STEP, Math.min(FADE_STEP, hpDelta));
      ring.alpha = hpNewAlpha;
      heartText.alpha = hpNewAlpha;
      maxText.alpha = hpNewAlpha;

      /* Quartile tier color (gaps land on these thresholds): >=75% green,
         50-74% yellow, 25-49% orange, <25% red.  <10% pulses toward a
         brighter highlight so the player notices. */
      const hpFrac = hpCur / hpMax;
      let hpTint;
      if (hpFrac >= 0.75)      hpTint = HP_TIER_GREEN;
      else if (hpFrac >= 0.50) hpTint = HP_TIER_YELLOW;
      else if (hpFrac >= 0.25) hpTint = HP_TIER_ORANGE;
      else                     hpTint = HP_TIER_RED;
      if (hpFrac <= 0.10 && hpFrac > 0) {
        const pulse = 0.5 + 0.5 * Math.sin(now / 1000 * Math.PI * 4);
        const hi = 0xff8a8a;
        const lerp = (a, b, t) => Math.round(a + (b - a) * t);
        const r = lerp((hpTint >> 16) & 0xff, (hi >> 16) & 0xff, pulse);
        const g = lerp((hpTint >> 8)  & 0xff, (hi >> 8)  & 0xff, pulse);
        const b2 = lerp(hpTint & 0xff,        hi & 0xff,        pulse);
        hpTint = (r << 16) | (g << 8) | b2;
      }

      /* White damage trail: ghostFrac lags hpFrac on damage and drains
         clockwise toward it, so the size + speed of the white wedge show how
         much / how fast HP dropped.  Snaps up instantly on heal. */
      if (ring._ghostFrac == null) ring._ghostFrac = hpFrac;
      const tookDamage = (ring._lastHpFrac != null) && (hpFrac < ring._lastHpFrac - 0.0005);
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
      /* Redraw only while visible (hidden at full HP, so this is cheap). */
      ring.clear();
      if (hpNewAlpha > 0.02) {
        ring.circle(cx, cy, HP_RING_CENTER_R);
        ring.fill({ color: HP_RING_CENTER_FILL, alpha: 0.92 });
        const TOP = -Math.PI / 2;  /* 12 o'clock */
        const Q = Math.PI / 2;     /* quadrant span */
        const halfGap = (HP_RING_GAP_PX / HP_RING_STROKE_R) / 2;
        /* Deplete CLOCKWISE: empty wedge grows from 12 o'clock clockwise.
           fillStart = current HP boundary; ghostStart = lagging (higher) HP,
           so the white trail occupies [ghostStart, fillStart]. */
        const clampF = (f) => Math.max(0, Math.min(1, f));
        const fillStart  = TOP + (1 - clampF(hpFrac)) * Math.PI * 2;
        const ghostStart = TOP + (1 - clampF(ring._ghostFrac)) * Math.PI * 2;
        /* moveTo before each arc so Pixi doesn't connect arcs with a stray
           line (the vertical line that hung below the ring). */
        const arcSeg = (a0, a1, color, alpha, width) => {
          ring.moveTo(cx + HP_RING_STROKE_R * Math.cos(a0), cy + HP_RING_STROKE_R * Math.sin(a0));
          ring.arc(cx, cy, HP_RING_STROKE_R, a0, a1);
          ring.stroke({ color, width, cap: 'butt', alpha });
        };
        for (let k = 0; k < 4; k++) {
          const qs = TOP + k * Q + halfGap;
          const qe = TOP + (k + 1) * Q - halfGap;
          if (qe <= qs) continue;
          arcSeg(qs, qe, HP_RING_OUTLINE, 0.9, HP_RING_BAND + 2.5); /* dark frame (under) */
          arcSeg(qs, qe, HP_RING_TRACK, 0.9, HP_RING_BAND);         /* drained track */
          const ws = Math.max(qs, ghostStart), we = Math.min(qe, fillStart);
          if (ws < we) arcSeg(ws, we, HP_GHOST_WHITE, 0.92, HP_RING_BAND); /* white trail */
          const cs = Math.max(qs, fillStart);                      /* lit current fill */
          if (cs < qe) arcSeg(cs, qe, hpTint, 1, HP_RING_BAND);
        }
      }
      heartText.x = cx; heartText.y = cy - 5;
      maxText.x = cx;   maxText.y = cy + 8;
      const hpStr = String(Math.ceil(hpCur));
      const maxStr = String(Math.ceil(hpMax));
      if (heartText.text !== hpStr) heartText.text = hpStr;
      if (maxText.text !== maxStr) maxText.text = maxStr;
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
