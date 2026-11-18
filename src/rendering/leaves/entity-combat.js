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
import { BLOCK_ARM_CUT, BLOCK_ARM_FACING } from '../blockArm.js';
import { BLOCK_ARM_SHOULDER, GRIP_HOLE_FACINGS, GRIP_NUDGE_X } from '../tables/combat.js';

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
