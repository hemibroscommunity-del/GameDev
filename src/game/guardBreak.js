/* ═══ v2.3.6554: THE WORKER BROKE YOUR GUARD -- THE PHONE'S SHIELD GOES DOWN WITH IT (card CT part 20) ═══
 * (held by server/test/guard-break-page.test.mjs; mp-shielddrop plays it)
 *
 * The owner, 2026-11-25: "shield isn't working correctly during combat it
 * stays like it's showing up even when the energy has been exhausted and you
 * take damage."
 *
 * The worker owns the guard (server/src/moveclaims.js _guardTo).  When your
 * stamina reaches 0 with the shield up -- held (5 a tick) or a blocked blow
 * (10) -- it BREAKS the guard: `ps.blocking` false and a 3 s latch
 * (GUARD_BREAK_MS) in which no move of yours raises it again.  It says so
 * with one word only: your stamina, 0, on its player_state.  The phone's own
 * drop at zero (BroTown.jsx, the shield's frame step) sits behind
 * BLOCK_COSTS_STAMINA, false on purpose since v2.3.1731 (the hold tax of the
 * old client-driven zones), and its note said "the server owns the guard
 * break now" -- true on the worker, but nothing on the phone listened.  So
 * the body kept its shield up, the button stayed lit and every blow of those
 * 3 s landed in full.  (The owner's list, 2026-10-26, section 10, shield
 * question 1 asked exactly this; the owner's report is its answer.)
 *
 * The rule: the worker's stamina at 0 while the phone's shield is up IS the
 * worker's break.  The shield goes down at once (the door's own drop,
 * shieldToggle.js dropShield: the body, the button, the word to the worker,
 * its sound) and the button waits the worker's latch (`_shieldCdUntil`, the
 * button's cooldown face, ShieldButton.jsx), so a tap in those 3 s cannot
 * draw a shield the worker refuses.  After it, a tap raises it as ever: the
 * shield never comes back by itself.  A 0 with the shield down changes
 * nothing (a sprint ran dry: the worker breaks no guard that is not up).
 *
 * No imports: node reads the rule without the game.
 */

/* the worker's latch after a break, index.js `this.GUARD_BREAK_MS = 3000`
   (mirror-held by guard-break-page.test) */
export const GUARD_BREAK_MS = 3000;

/** Did the worker just break the guard?  `stamina` is the worker's own
 *  number off its player_state (null or absent: it said nothing). */
export function workerGuardBroke(S, stamina) {
  return !!S && !!S._shieldUp && typeof stamina === 'number' && stamina <= 0;
}

/** The phone follows the worker's word.  `drop` is shieldToggle's
 *  dropShield (passed in, so this file keeps no imports).  True when the
 *  shield came down. */
export function followWorkerGuard(S, stamina, now, drop) {
  if (!workerGuardBroke(S, stamina)) return false;
  S._shieldCdUntil = now + GUARD_BREAK_MS;
  drop(S, 'stamina');
  return true;
}

/** The worker's pools land on the page (wsClient.js player_state, after
 *  every recalcDerived it can run: v2.3.1698), each one it named (null: it
 *  named none, the page's own kept), and then the shield follows its
 *  stamina.  One call there, so the big file gains no logic. */
export function poolsLand(S, pools, now, drop) {
  if (!S || !S.rpg || !pools) return false;
  for (const k in pools) if (pools[k] !== null) S.rpg[k] = pools[k];
  return followWorkerGuard(S, pools.stamina, now, drop);
}
