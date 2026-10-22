/* ═══ v2.3.3558: A RE-PUSH IS NOT A NEW ARRIVAL (docs/TRAPS.md §245) ═══
 *
 * A dungeon re-sends its whole monster list whenever it adds some -- a wave,
 * a boss's summon, and now the Goo Grotto's giant slime at each of its three
 * splits (server/src/slimeboss.js) -- dead ones included, and the phone builds
 * its list afresh from it (wsClient.js _applyZoneMonstersMsg, and the join's
 * list on a rejoin).  The renderer keeps a monster's MOMENTS on the monster
 * itself: one it has never seen has just arrived (the growing white
 * silhouette), and a dead one it never saw die has just died (the splat and
 * its sound).  So every monster standing played its arrival again and every
 * one already dead its death again -- a dozen splats and their sounds at once
 * by the third wave.
 *
 * A monster the phone already holds, in the SAME life (alive in both) or the
 * SAME death (dead in both), keeps what the phone keeps of it: those clocks,
 * where it is drawn, that you are fighting it (its bar stays up), the arrows
 * stuck in it, a swell or a flight under way.  One that died or came back
 * since is met afresh, as before.  A NEW phone-only field that marks a moment
 * goes on these lists in the same change, or the next re-push plays it again.
 *
 * No imports: the server's slime-boss suite runs it.
 */
export const CARRY_ALIVE = [
  '_fxWasAlive', '_spawnFxAt', 'renderX', 'renderY', '_hitByMeAt', '_bandEngagedAt',
  '_stuckArrows', '_popFrom', '_burstFrom', '_burstUntil', '_burstScale',
];
export const CARRY_DEAD = [
  '_fxWasAlive', '_spawnFxAt', '_slimeDeathStart', '_snowmanDeathStart', '_burstClock',
  '_burstPeakFrom', '_killMine', '_quietDeath',
];
/* A swell is the one moment that must END with its monster alive: a boss
   that split since (its `bs` moved) has finished its swell.  The split's
   execute clears it; a phone that missed that (a rejoin over the split) must
   not keep the boss swollen and untouchable for ever (monsterVariants.js
   isIntangible reads `_burstUntil`). */
const SWELL = { _burstFrom: 1, _burstUntil: 1, _burstScale: 1 };

export function carryMonsterState(local, prev) {
  if (!prev || !local || !!prev.alive !== !!local.alive) return local;
  const keys = local.alive ? CARRY_ALIVE : CARRY_DEAD;
  const swellOver = local.bs !== prev.bs;
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (swellOver && SWELL[k] === 1) continue;
    if (prev[k] !== undefined) local[k] = prev[k];
  }
  return local;
}
