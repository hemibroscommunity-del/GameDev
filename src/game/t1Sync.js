/* ═══ v2.3.1633: the ONE gate on reporting T1 raw stats ═══
 *
 * The five raw stats (power / vitality / endurance / agility / mind) are
 * a split-brain field: the CLIENT is their only reporter and the SERVER
 * their only store.  That makes a client which does not know them
 * indistinguishable, on the wire, from a character that genuinely has
 * none -- and `_handleStatsUpdate` will happily persist the zeros.  That
 * is audit C-2: log in on a new device (or with a Login Key, or after
 * clearing site data) and the character's stats are destroyed by the act
 * of connecting.
 *
 * The server got a guard in v2.3.1624 (ignore a reported 0 against a
 * stored non-zero), but that only helps on workers that HAVE it -- a
 * rollback below that version is the documented CLAUDE.md procedure, and
 * during any deploy some worker is older.  The client is the one doing
 * the wiping, so the honest gate lives here too.
 *
 * WHY OMISSION RATHER THAN ZEROS: `_handleStatsUpdate` skips absent keys
 * (`typeof payload[s] === 'number'`), so leaving them out is a true
 * no-op on every worker version ever shipped.  No caps flag is needed
 * for the same reason -- rule 19 is satisfied by omission rather than by
 * negotiation.
 *
 * WHY IT LIVES IN ITS OWN MODULE: there is more than one sender.
 * BroTown.jsx's React-driven stats_update is the obvious one;
 * equipActions.js `syncArmorChange` is a SECOND, direct push for flows
 * that mutate S.rpg without going through setRpgState.  The first
 * version of this fix gated only the first, so an uninformed client that
 * merely unequipped a piece of armour still wiped itself.  One
 * implementation, imported by every sender -- adding a third sender that
 * forgets the gate should require ignoring this file, not just not
 * knowing about it.
 */

/* True when this client holds T1 values worth reporting.
 *
 * `S._t1Seeded` is set when a player_state echo delivered the stats
 * (wsClient.js) or when the localStorage cache carried a REAL one
 * (BroTown.jsx).  The non-zero check is the belt: bt_rpg is rewritten on
 * every player_state, so a session that never learned its stats still
 * persists zeros, and a later boot must not mistake a stored 0 for
 * knowledge -- that hole made the first version of this gate protect
 * only the very first session (v2.3.1632).
 *
 * A brand-new character reports nothing until it trains its first point.
 * That is correct: the server's copy is zeros too, so there is nothing
 * to say, and the moment a point is trained the value is non-zero and
 * syncs normally. */
export function t1Known(S, R) {
  if (!S || !R) return false;
  if (S._t1Seeded) return true;
  return (R.power || 0) > 0 || (R.vitality || 0) > 0 || (R.endurance || 0) > 0
    || (R.agility || 0) > 0 || (R.mind || 0) > 0;
}

/* The T1 half of a stats_update payload: the five keys, or {} when this
 * client has no business reporting them.  Spread into the payload. */
export function t1StatsPayload(S, R) {
  if (!t1Known(S, R)) return {};
  return {
    power: R.power || 0,
    vitality: R.vitality || 0,
    endurance: R.endurance || 0,
    agility: R.agility || 0,
    mind: R.mind || 0,
  };
}
