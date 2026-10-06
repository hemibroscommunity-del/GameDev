/* ═══ v2.3.3058: NO MAN'S LAND'S RINGS ═══
 * The pure half of src/game/noMansLand.js -- no imports, so the server's
 * mirror-audit can read it in node.  The worker's own copy is
 * server/src/nomansland.js (NML, nmlTierAt, nmlLevelAt); the audit holds the
 * numbers, the centre and the level at every spot equal. */
export const NML = Object.freeze({
  HUB: 2764.8, TIER: 1024, TIERS: 16, LEVELS_PER_TIER: 5, FIRST_TIER: 2,
  SKULL_MS: 20 * 60 * 1000,
});
/* the Wheel's centre, game px (server/src/wheelspawns.js WHEEL_CENTRE) */
export const NML_CENTRE = Object.freeze([21504, 21504]);

export function nmlTierAt(x, y) {
  if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) return 0;
  const r = Math.hypot(x - NML_CENTRE[0], y - NML_CENTRE[1]);
  if (r < NML.HUB) return 0;
  return Math.max(1, Math.min(NML.TIERS, Math.ceil((r - NML.HUB) / NML.TIER)));
}
/* No man's land's level at a spot: 0 outside it (and outside the Wheel), 1
   from the Lv 6-10 tier outward */
export function nmlLevelAt(zone, x, y) {
  if (zone !== 'wheel') return 0;
  const t = nmlTierAt(x, y);
  return t >= NML.FIRST_TIER ? t - NML.FIRST_TIER + 1 : 0;
}
