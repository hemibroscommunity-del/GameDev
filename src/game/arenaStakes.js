/* v2.3.4421: AN ARENA BET THE WORKER REFUSED LEAVES THE SCREEN; A REAL ONE NEVER DOES.
 *
 * The Arena's bet form (PartyPanel.jsx) draws a bet the moment it is sent
 * ("Bet placed ... waiting for results") and hides the form for the round.
 * The worker escrows the gold and answers `arena_stake_placed`, or refuses
 * with `arena_stake_error` -- and the phone kept a refused bet on screen for
 * the round (the state-machine sweep, V9b P1-13: a stake on a gladiator
 * whose match was already decided).  Gold in escrow, so these rules are
 * deliberately narrow:
 *   - `arena_stake_placed` marks the bet it answers as placed (`_placed`);
 *   - `arena_stake_error` drops ONE bet, and only a still-pending one (a
 *     server stake not yet placed): a placed bet is real and escrowed, and
 *     is never taken off;
 *   - 'already-staked' drops nothing: the worker holds a real bet on that
 *     match, so the bet on screen stands for it;
 *   - a worker from v2.3.4421 names the gladiator (`targetId`), so only a
 *     pending bet on that gladiator goes; an older worker names nothing, and
 *     the newest pending bet goes (only one can be pending: the form hides
 *     once a bet is drawn for the round).
 * No imports: node tests it (server/test/silent-refusals.test.mjs). */

const pendingIdx = (bets, targetId) => {
  for (let i = bets.length - 1; i >= 0; i--) {
    const b = bets[i];
    if (!b || !b._serverStake || b._placed) continue;
    if (targetId != null && b.targetPlayerId !== targetId) continue;
    return i;
  }
  return -1;
};

export function markStakePlaced(bets, payload) {
  if (!Array.isArray(bets) || !payload) return bets;
  const i = pendingIdx(bets, payload.targetId != null ? payload.targetId : null);
  if (i < 0) return bets;
  const out = bets.slice();
  out[i] = Object.assign({}, bets[i], { _placed: true }, payload.matchId ? { matchId: payload.matchId } : {});
  return out;
}

export function dropRefusedStake(bets, payload) {
  if (!Array.isArray(bets) || !payload) return bets;
  if (payload.code === 'already-staked') return bets;
  const i = pendingIdx(bets, typeof payload.targetId === 'string' ? payload.targetId : null);
  if (i < 0) return bets;
  return bets.slice(0, i).concat(bets.slice(i + 1));
}
