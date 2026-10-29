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
  /* v2.3.3690: FIRST_TIER 1, the Lv 1-5 tier (the owner: "No man's land
     should begin just outside of town where you can fight the lvl 1
     monsters"); WAS_FIRST_TIER the Lv 6-10 one it was, which a worker without
     caps.nmlnear still plays (noMansLand.js nmlFirst); SAFE_R the safe
     ground's radius (the bake's WHEEL_SAFE_R), never in it */
  HUB: 2764.8, TIER: 1024, TIERS: 16, LEVELS_PER_TIER: 5, FIRST_TIER: 1, WAS_FIRST_TIER: 2, SAFE_R: 2937,
  /* v2.3.3767: a tier's monsters stand this far in from either of its ends
     (the bake's clearTier, tools/world/bake-wheel-spawns.mjs): the band their
     levels climb across (nmlStepLevelAt) */
  BAND_CLEAR: 120,
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
   from the tier `first` outward (v2.3.3690: the Lv 1-5 tier; it was the Lv
   6-10 one), never on the safe ground (SAFE_R round the centre) */
export function nmlLevelAt(zone, x, y, long = 1, first = NML.FIRST_TIER) {
  if (zone !== 'wheel') return 0;
  const t = nmlTierAt(x, y, long);
  if (t < first) return 0;
  const C = NML_CENTRES[long] || NML_CENTRES[1];
  if (Math.hypot(x - C[0], y - C[1]) < NML.SAFE_R) return 0;
  return t - first + 1;
}

/* ═══ v2.3.3767: ONE STEP A MONSTER LEVEL ═══
   The owner: "also the no mans land level should raise at the same rate you
   see other monster levels increasing".  The number above was the plan's
   tier, one step every five monster levels.  Here it is the level of the
   monsters at that spot, by the worker's own arithmetic for them
   (server/src/wheelzone.js _wheelSpawnMonsters: `Math.round(lo + depth *
   (hi - lo))`, depth 0-1 across the tier's BAND -- the tier less the bake's
   clearTier, BAND_CLEAR, at either end -- lo..hi the tier's five levels): so
   standing among Lv 7 monsters is No man's land 7.  On the plan's rings,
   never a coordinate; the radius stands for the bake's distance along the
   spoke (they differ by under 6 px near the axis).  From the tier `first`:
   with caps.nmlnear (tier 1) the number IS the monster level; under
   `nmlnear: false` (tier 2) it still starts at 1 there -- the monster level
   less five a tier skipped.  Never on the safe ground.  The worker's copy is
   nomansland.js nmlStepLevelAt, mirror-audit holds them equal. */
export function nmlStepLevelAt(zone, x, y, long = 1, first = NML.FIRST_TIER) {
  if (zone !== 'wheel') return 0;
  const t = nmlTierAt(x, y, long);
  if (t < first) return 0;
  const C = NML_CENTRES[long] || NML_CENTRES[1], L = NML_CENTRES[long] ? long : 1;
  const r = Math.hypot(x - C[0], y - C[1]);
  if (r < NML.SAFE_R) return 0;
  const len = NML.TIER * L;
  const b0 = NML.HUB + (t - 1) * len + NML.BAND_CLEAR, b1 = NML.HUB + t * len - NML.BAND_CLEAR;
  const depth = Math.max(0, Math.min(1, (r - b0) / (b1 - b0)));
  const lo = (t - 1) * NML.LEVELS_PER_TIER + 1, hi = t * NML.LEVELS_PER_TIER;
  return Math.round(lo + depth * (hi - lo)) - NML.LEVELS_PER_TIER * (first - 1);
}
