/* ═══ v2.3.3251: XP FADES FOR WHAT IS WELL BELOW YOU ═══
 *
 * Owner: "make xp decay if you're trying to harvest lower level things.  This
 * also applies to combat.  Xp should begin decaying starting at 5 levels below
 * your current level.  It should always be most efficient to harvest or fight
 * things within your current level."
 *
 * gap = your level - its level.  Up to 4 below you (or above you): full XP.
 * 5 below: a third.  Each level past that: 15% less again -- 6: 28%, 7: 24%,
 * 8: 21%, 9: 17%, 10: 15%, 15: 6.6%, 20: 2.9%.
 *
 * The WORKER applies it (server/src/xpdecay.js, the reasoning there): to a
 * harvest (your skill against the resource's GATHER_REQ_LVL) and to a fight
 * (the trained skill the XP goes into against the monster's level).  The game
 * uses this copy to predict a harvest's "+N Mining XP" (gameSystems.js
 * harvestXpFor) and for the Skills page's Full XP / Less XP lines, and only
 * against a worker that advertises caps.xpdecay.  mirror-audit holds the two
 * copies to each other at every gap.  Built by multiplying, never Math.pow, so
 * an iPhone rounds the same whole number the worker does.
 */
export const XP_DECAY = { FULL_GAP: 4, START: 1 / 3, STEP: 0.85, GAP_MAX: 200 };

/* The share of the XP paid, 0..1. */
export function xpDecayMult(yourLevel, itsLevel) {
  if (yourLevel == null || itsLevel == null) return 1;
  var you = Number(yourLevel), it = Number(itsLevel);
  if (!Number.isFinite(you) || !Number.isFinite(it)) return 1;
  var gap = Math.min(XP_DECAY.GAP_MAX, Math.floor(you) - Math.floor(it));
  if (gap <= XP_DECAY.FULL_GAP) return 1;
  var m = XP_DECAY.START;
  for (var g = XP_DECAY.FULL_GAP + 1; g < gap; g++) m *= XP_DECAY.STEP;
  return m;
}

/* A whole-number award after the fade: rounded, never below 1. */
export function xpAfterDecay(xp, mult) {
  var x = Number(xp) || 0;
  if (!(mult < 1)) return x;
  return Math.max(1, Math.round(x * mult));
}

/* Is the fade on for this worker? */
export function xpDecayOn(S) {
  return !!(S && S._serverCaps && S._serverCaps.xpdecay);
}
