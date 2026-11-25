/* ═══ v2.3.6549: THE RIGHT THUMB'S FRAME (card CT part 16) ═══
 * The step `input`'s one call for the two buttons' right side (BroTown, beside
 * latch.js latchFrame): the weapon's reach from the character's gear, the gap
 * the engage test measures (monsterCombat.js: to the body's centre, its
 * offset and melee hit radius x a boss's size), and thumbSide.js's step.
 * The rule itself is thumbSide.js's (node tests it); this file only hands it
 * the game's numbers.
 */

import { GS_OUTER_RADIUS, meleeRangeMult, bowRangeMult, staffRangeMult,
  monsterBodyOffsetY, monsterMeleeHitRadius, bossSizeK } from '@/data/gameSystems.js';
import { hitShapeOf } from '@/data/monsterVariants.js';
import { reachRange, reachGap, thumbStep, thumbClear, THUMB } from './thumbSide.js';

/* MIRROR guard: thumbSide.js keeps its own copy of the engage radius (no imports there) */
if (THUMB.SWORD_PX !== GS_OUTER_RADIUS && typeof console !== 'undefined') console.warn('[thumbSide] THUMB.SWORD_PX ' + THUMB.SWORD_PX + ' != GS_OUTER_RADIUS ' + GS_OUTER_RADIUS);

/** The engage test's gap (monsterCombat.js _engSwing's three numbers). */
export function engageGap(m, P) {
  const arch = hitShapeOf(m.archetype || m.type);
  const k = bossSizeK(m);
  const x = typeof m.renderX === 'number' ? m.renderX : m.x;
  const y = (typeof m.renderY === 'number' ? m.renderY : m.y) - monsterBodyOffsetY(arch) * k;
  return Math.hypot(x - P.x, y - P.y) - monsterMeleeHitRadius(arch) * k;
}

/** Once a frame in the two buttons.  `dead` your death this frame. */
export function thumbFrame(S, now, dead) {
  if (!S || !S.rpg) return false;
  if (dead || S._zoneLoading) return thumbClear(S);
  const slot = S.rpg.activeSlot;
  const ranged = slot === 'ranged' || slot === 'staff';
  const range = ranged
    ? reachRange(slot, (slot === 'staff' ? staffRangeMult : bowRangeMult)(S.rpg))
    : reachRange(slot, 1, meleeRangeMult(S.rpg));
  return thumbStep(S, now, reachGap(S, ranged ? null : engageGap), range);
}
