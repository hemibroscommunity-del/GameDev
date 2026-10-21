/* ═══ v2.3.3553: YOUR ACHIEVEMENT POINTS, ALWAYS IN SIGHT ═══
 *
 * The owner, 2026-10-21: "Achievement points should be a prominent part of
 * the experience in brotown."  Achievements (v2.3.3527) showed your AP only
 * on the Achievements page, under More, and on a player's card.  Now the top
 * bar carries it (ui/mobile/ZoneHeader.jsx): the owner's medal and your AP,
 * left of the zone name, opposite your gold, and a tap opens the
 * Achievements page.  Whenever it rises -- an achievement of any tier, a
 * quest's +5, a guild rung -- a "+N" flies up into it and the number bumps,
 * as the purse does for gold.  The number is the WORKER's
 * (game/achievements.js achvApTotal), never the phone's prediction.
 *
 * NO IMPORTS: server/test/ap-chip.test.mjs runs this in node. */

/* a rise in the first moments after the bar mounts is the record loading,
   not points earned (the purse's own rule, ZoneHeader goldFlips) */
export const AP_RISE_QUIET_MS = 2500;
/* how long the "+N" flies (game.css bt-ap-gain) */
export const AP_GAIN_MS = 1400;

/** "1,240": whole, never below 0, with thousands commas. */
export function apWords(ap) {
  const v = Math.max(0, Math.floor(Number(ap) || 0));
  return v.toLocaleString('en-US');
}

/** How much AP just came in: `now - prev` when it rose after the quiet start,
 *  else 0 (a first reading, a fall, a load). */
export function apRise(prev, now, sinceMountMs) {
  if (prev == null || !Number.isFinite(Number(prev))) return 0;
  const d = Math.floor(Number(now) || 0) - Math.floor(Number(prev) || 0);
  if (!(d > 0)) return 0;
  if (!(Number(sinceMountMs) > AP_RISE_QUIET_MS)) return 0;
  return d;
}

/** The gain's words: "+10", "+1,000". */
export function apGainWords(gain) {
  const v = Math.floor(Number(gain) || 0);
  return v > 0 ? '+' + v.toLocaleString('en-US') : '';
}
