/* ═══ v2.3.3058: NO MAN'S LAND'S RINGS ═══
 * The pure half of src/game/noMansLand.js -- no imports, so the server's
 * mirror-audit can read it in node.  The worker's own copy is
 * server/src/nomansland.js (NML, nmlTierAt, nmlLevelAt); the audit holds the
 * numbers, the centre and the level at every spot equal.
 *
 * v2.3.3315: for the Wheel `long` times longer (the owner's "Maybe 5x larger
 * map is needed": plan.js PLAN5) the rings are `long` times as wide, round
 * that Wheel's own centre -- NML_CENTRES by size, the worker's
 * wheelspawns.js (5) and wheelspawns1.js (1) WHEEL_CENTRE.  A caller passes the
 * size the room plays (src/game/wheelSize.js, caps.wheelsize); none is 1. */
export const NML = Object.freeze({
  HUB: 2764.8, TIER: 1024, TIERS: 16, LEVELS_PER_TIER: 5, FIRST_TIER: 2,
  SKULL_MS: 20 * 60 * 1000,
});
/* each Wheel's centre, game px, by how many times longer than one zone a
   tier its tiers are */
export const NML_CENTRES = Object.freeze({ 1: Object.freeze([21504, 21504]), 5: Object.freeze([87168, 87168]) });
/* the short Wheel's (as before v2.3.3315) */
export const NML_CENTRE = NML_CENTRES[1];

export function nmlTierAt(x, y, long = 1) {
  if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) return 0;
  const C = NML_CENTRES[long] || NML_CENTRES[1], tier = NML.TIER * (NML_CENTRES[long] ? long : 1);
  const r = Math.hypot(x - C[0], y - C[1]);
  if (r < NML.HUB) return 0;
  return Math.max(1, Math.min(NML.TIERS, Math.ceil((r - NML.HUB) / tier)));
}
/* No man's land's level at a spot: 0 outside it (and outside the Wheel), 1
   from the Lv 6-10 tier outward */
export function nmlLevelAt(zone, x, y, long = 1) {
  if (zone !== 'wheel') return 0;
  const t = nmlTierAt(x, y, long);
  return t >= NML.FIRST_TIER ? t - NML.FIRST_TIER + 1 : 0;
}
