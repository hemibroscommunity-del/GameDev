/* ═══ v2.3.6200: combat's leaves from entityRenderer.js (card EN, grand plan 5.5, M's line 8) ═══
 *
 * Top-level functions of src/rendering/systems/entityRenderer.js that read
 * no `this` and reach no module state, moved VERBATIM (only `export` and
 * the imports are new), with the constants they read; imported back by the
 * same names.  A leaf imports nothing from the renderers (four-lines'
 * IMPORT_CYCLE_FILES has no room).  The census: part 5 of
 * docs/plan/census/M-tables.md (tools/dev/render-code-census.mjs).
 */
import { AIM_CARET, AIM_CARET_EDGE, AIM_CARET_HOT } from '../aimCaret.js';
import { BLOCK_ARM_CUT, BLOCK_ARM_FACING, blockArmSleeveTexture, blockArmTexture } from '../blockArm.js';
import { BLOCK_ARM_SHOULDER, GRIP_HOLE_FACINGS, GRIP_NUDGE_X, SOUTH_BLOCK_OFFHAND, SOUTH_BLOCK_OFFHAND_BY_TYPE } from '../tables/combat.js';
import { gearTint } from '../gearVariants.js';
import { getEquip } from '../gearCatalog.js';
import { getGearFrame } from '../gearSheets.js';
import { getWeaponHandle } from '../playerAnchors.js';
import { getWeaponTexture, hasWeapon, weaponFitH } from '../weaponSprites.js';
import { weaponTint } from '../traits/materialTints.js';

/* ── v2.3.6200: level 0 ── */
/* v2.3.2925: display px the carried greatsword shifts right while its grip
   hole is on, so the grip runs under the middle of the hand (see the snap block
   in _updatePlayer).  Keyed pose-facingIdx; each one picked by sweeping it
   in-game.  jog S: the grip slanted out of the fist.  idle S / SE (owner:
   "fingers around the grip"): the grip hung mostly left of the fingers.
   window.__btGripNudge = { 'stand-2': 3, ... } overrides per key. */
export function gripNudgeX(pose, facingIdx) {
  const k = pose + '-' + facingIdx;
  try {
    const o = typeof window !== 'undefined' && window.__btGripNudge;
    if (o && typeof o[k] === 'number') return o[k];
  } catch (e) { /* default */ }
  return GRIP_NUDGE_X[k] || 0;
}
export const CARRY_WOBBLE = 0.06;   /* ~3.4 degrees each way */
export function carryWobble(now, moving, wpnType) {
  if (!moving || (wpnType !== 'sword' && wpnType !== 'greatsword')) return 0;
  const amp = (typeof window !== 'undefined' && typeof window.__btSwordWobble === 'number') ? window.__btSwordWobble : CARRY_WOBBLE;
  return amp * Math.sin(now / 120 - 0.9);
}
export function heldWeaponInFront(wpnType, facingIdx, inFrontBase) {
  /* Bow: E and S only.  SE, SW and NE are all near-diagonals where the limb
     lies across the figure, and the owner named each of them in turn — SW and
     SE first ("partial occlusion of the weapon behind the players body"), then
     NE ("the body should mostly hide the bow").  E and W are side-on and S
     holds it clear in the near hand, so those keep the in-front order. */
  if (wpnType === 'bow') return facingIdx === 0 || facingIdx === 2;
  /* ═══ v2.3.2516: SOUTHWEST GOES BEHIND, AND THAT RETIRES THE v2.3.1787 SW ═══
   * Owner (D7, backlog triage 2026-09-14 §5.8): "greatsword at southwest goes
   * BEHIND the body for jog/idle AND for the attack swing -- it is in the right
   * hand, facing away from the camera; the character should occlude the swing
   * instead of the blade passing through the body.  Southeast and east are
   * unchanged."
   *
   * v2.3.1787 read as "SW SE and E need the sword layered in front of", and
   * `|| facingIdx === 3` is the SW half of that.  SE (1) and E (0) are already
   * in `inFrontBase` (inFrontInHand = 0,1,2,7), so dropping the SW term leaves
   * the other two facings byte-identical and moves only the one the owner named
   * twice.  Which hand the blade is in is what separates them: at SE and E the
   * greatsword is on the camera side of the figure, at SW it is on the far
   * side, and v2.3.1787 swept SW along with the two it could actually see.
   *
   * The plain sword and the staff have always been behind at SW (they are not
   * `_heldInHand`, so they never reach this function and take inFrontInHand,
   * which excludes 3).  This makes the greatsword agree with them rather than
   * introducing a new rule.  The swing's own z-order is the matching half and
   * lives in effectsRenderer's _updateSwordSwing -- see the v2.3.2516 note on
   * _orderSwingWeapon's `behind` argument there. */
  return inFrontBase;   /* greatsword: point-up, clears the torso -- E/SE only */
}
export function gripHoleWanted(wpnType, facingIdx, swingActive, sheathed, pose) {
  if (facingIdx === 3 && pose === 'jog') return false;
  /* SE is measured for the idle hand only (fistMasks 'stand-southwest-l'); its
     jog has no mask and was never asked for, so it keeps the plain blade. */
  if (facingIdx === 1 && pose !== 'stand') return false;
  return wpnType === 'greatsword' && !swingActive && !sheathed && GRIP_HOLE_FACINGS[facingIdx] === true;
}
export function clearGripHole(spr) {
  if (spr && spr._gripHoleOn) {
    spr.mask = null; spr._gripHoleOn = false;
    /* ═══ v2.3.2923: TAKING THE MASK OFF MUST TAKE THE CIRCLE AWAY TOO ═══
       Owner: "There's a marker that I'm seeing on the character near the hand
       that looks like a circle."  Pixi draws a Graphics that is a stencil mask
       only while it IS one: `spr.mask = null` hands it back to the pool, whose
       reset() sets includeInBuild = true (StencilMask.mjs) -- and the hole
       stayed a child of the weapon container, so the moment he turned off
       E/SW/NE (or sheathed, swung, blocked) it drew as a solid white 4.2px dot
       at the grip, over the torso, until he faced E/SW/NE again. */
    const hole = spr._gripHoleGfx;
    if (hole && !hole.destroyed) { hole.clear(); hole.visible = false; }
    /* ...and the shine's clip box (lightfx/glint.js) was pinned to the frame
       the MASKED texture had.  It only refreshes while a mask is on, so it
       outlived the hole: an E/SW/NE box laid over the south art cut the tip
       of the carried blade off flat -- owner: "The sword is clipped at the
       top." */
    if (spr._btGlintArea && spr.filterArea === spr._btGlintArea) spr.filterArea = null;
  }
}
export const SELF_DEATH_HOLD_MS = 3500;
export function selfCorpseUp(S) {
  if (!S) return false;
  if (S.rpg && S.rpg.hp <= 0) return true;
  return !!(S._deathStart && (Date.now() - S._deathStart) < SELF_DEATH_HOLD_MS);
}
/* Hide the arm AND record it.  Both must happen together: the probe was
   written only inside the placement at first, so lowering the shield left the
   previous frame's reading in place and mp-blockarm read a shield-down bro as
   still holding one. */
export function _hideBlockArm(display, why) {
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
/* Measured from the shield's CENTRE, so it has to clear the shield's own
   radius: HELD_SHIELD_PX is 72, i.e. 36 half-width, and the first cut at 21
   put the chevron INSIDE the disc — it only showed at all because the art
   does not fill its box.  42 leaves a clear gap at every facing. */
export const CARET_OUT = 42;     /* how far past the shield's centre the tip sits */
export const CARET_BACK = 13;    /* tip-to-shoulder along the aim axis */
export const CARET_HALF = 10;    /* half the chevron's opening */
export function _drawBlockCaret(display, sx, sy, ang, pulse) {
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
export function _hideBlockCaret(display) {
  const g = display && display._blockCaretGfx;
  if (g && g.visible) { g.visible = false; g.clear(); }
}
export function _blockHandPoint(facing, bodyH, bobY) {
  const map = BLOCK_ARM_FACING[facing];
  const anchor = BLOCK_ARM_SHOULDER[facing];
  const cut = map && BLOCK_ARM_CUT[map[0]];
  if (!map || !anchor || !cut) return null;
  const sc = (bodyH || 84) / 188;
  const sx = map[1] ? -sc : sc;
  return {
    x: anchor[0] + (cut.hand[0] - cut.shoulder[0]) * sx,
    y: anchor[1] + (bobY || 0) + (cut.hand[1] - cut.shoulder[1]) * sc,
  };
}
/* v2.3.2920: a peer's held shield in their child list, by your in-hand rule
   (v2.3.190): behind the body for NW/N/NE; for E, just under the weapon, so
   a carried blade crosses in front of it (v2.3.198); otherwise over the whole
   figure, under only the nameplate layer.  setChildIndex removes then
   re-inserts, so each target depends on which side the sprite starts from --
   the same arithmetic the local rule uses. */
export function _orderPeerHeldShield(display, facingIdx) {
  const sh = display && display._shieldSprite;
  if (!sh || sh.parent !== display) return;
  const shIdx = display.getChildIndex(sh);
  let target;
  if (facingIdx === 5 || facingIdx === 6 || facingIdx === 7) {
    const bodyIdx = display._spriteBody ? display.getChildIndex(display._spriteBody) : 0;
    target = shIdx > bodyIdx ? bodyIdx : Math.max(0, bodyIdx - 1);
  } else if (facingIdx === 0 && display._weaponContainer && display._weaponContainer.visible) {
    const wcIdx = display.getChildIndex(display._weaponContainer);
    target = shIdx > wcIdx ? wcIdx : Math.max(0, wcIdx - 1);
  } else {
    const top = display._uiLayer ? display.getChildIndex(display._uiLayer) : display.children.length;
    target = shIdx < top ? top - 1 : top;
  }
  if (shIdx !== target) display.setChildIndex(sh, target);
}

/* ── v2.3.6201: main's level 1 ── */
export function selfGathering(S) {
  const ex = S && S._extraction;
  return !!(ex && (ex.status === 'waiting' || ex.status === 'ready')) && !selfCorpseUp(S);
}
/* Aimed down and out, so the blade leaves the silhouette below the shield
 * instead of climbing across the face.
 * v2.3.1882: 0.72pi -> 0.28pi, which is the SAME angle mirrored about the
 * vertical (pi - 0.72pi).  It has to move with the grip: "down and out" is
 * defined relative to which side he holds it on, and a blade still sweeping
 * down-LEFT from a grip that is now on the RIGHT would be pointing back
 * across his own chest — the one direction this constant exists to avoid. */
export const SOUTH_BLOCK_OFFHAND_AIM = Math.PI * 0.28;
export function _placeSouthBlockWeapon(display, wpn, bobY, quiet) {   /* v2.3.2920: + quiet, for a peer (no local probe) */
  const spr = display && display._weaponSprite;
  clearGripHole(spr);   /* v2.3.2911: the carried pose's fist hole is not this pose's */
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
  /* v2.3.2910: size by weaponFitH, not th -- the widened greatsword's canvas
     is taller than its blade is long (weaponSprites.js SHEETS). */
  const k = targetH / Math.max(8, weaponFitH(wpn.type, wpn.gearBase, artDir, th));
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
  if (!quiet && typeof window !== 'undefined') {
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
export function _placeBlockArm(display, facing, bodyH, bobY, peer) {   /* v2.3.2920: + peer {tex, chest} -- their arm, their sleeve, no local probe */
  const spr = display._blockArmSprite;
  const sleeve = display._blockArmSleeve;
  const group = display._blockArmGroup;
  if (sleeve) sleeve.visible = false;
  if (!spr) return null;
  const map = BLOCK_ARM_FACING[facing];
  const anchor = BLOCK_ARM_SHOULDER[facing];
  const tex = map && (peer ? peer.tex : blockArmTexture(map[0]));
  const cut = map && BLOCK_ARM_CUT[map[0]];
  if (!map || !anchor || !tex || !cut) {
    if (peer) { if (group) group.visible = false; }
    else _hideBlockArm(display, { facing, hasSheet: !!map, hasArt: !!tex });
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
    const worn = peer ? peer.chest : getEquip('chest');
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
  const hand = _blockHandPoint(facing, bodyH, bobY);   /* v2.3.2920: one formula, shared with a peer's shield */

  /* QA probe (mp-blockarm) — a headless run cannot read the WebGL canvas. */
  if (!peer) try {
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
