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

/* The five keys, in one place. */
export const T1_KEYS = ['power', 'vitality', 'endurance', 'agility', 'mind'];

/* True when a player_state echo has delivered the stats, i.e. the server
 * has told this client what they are -- including any that are
 * legitimately zero.  Set by wsClient.js on adopt, and by BroTown.jsx
 * when the localStorage cache carried a REAL (non-zero) value.
 *
 * The non-zero requirement on the cache is deliberate: bt_rpg is
 * rewritten on every player_state, so a session that never learned its
 * stats still persists zeros, and a later boot must not mistake a stored
 * 0 for knowledge.  That hole made an earlier version of this gate
 * protect only the very first session (v2.3.1632). */
export function t1Echoed(S) {
  return !!(S && S._t1Seeded);
}

/* The T1 half of a stats_update payload.
 *
 * PER KEY, not all-or-nothing (v2.3.1634).  The previous version asked
 * one question -- "does this client know ANY of them?" -- and on a yes
 * emitted all five.  So an unseeded client that use-trained a single
 * point reported `{power: 1, vitality: 0, endurance: 0, agility: 0,
 * mind: 0}`: four zeros it had never learned, which wipe those four on
 * any worker without the v2.3.1624 server-side guard.  Training one
 * point destroyed the other four stats -- the exact C-2 failure, in the
 * fix for C-2.
 *
 * The correct rule is per key:
 *   - echo-seeded  -> report all five, zeros included; the server told
 *     us, so a zero is real information.
 *   - not seeded   -> report only the keys this client can actually
 *     account for, i.e. the non-zero ones it trained itself.  The
 *     others are omitted, and `_handleStatsUpdate` skips absent keys,
 *     so the server's stored values are left alone. */
export function t1StatsPayload(S, R) {
  const out = {};
  if (!S || !R) return out;
  const echoed = t1Echoed(S);
  for (const k of T1_KEYS) {
    /* v2.3.1634: emit a SANE number or nothing.  `R[k] || 0` passed a
       corrupted local value straight onto the wire -- a string '12', a
       negative, a NaN -- and while the server would reject each of
       those (its `typeof === 'number'` gate, the _clampStat floor, and
       the v2.3.1634 no-decrease guard), a client has no business
       sending them.  Anything not a finite number is treated as
       unknown, which the rules below then omit unless the server has
       already told us the value. */
    const raw = R[k];
    const v = (typeof raw === 'number' && Number.isFinite(raw))
      ? Math.max(0, Math.floor(raw)) : 0;
    if (echoed || v > 0) out[k] = v;
  }
  return out;
}
