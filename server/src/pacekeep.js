/* ═══ v2.3.5921: A REQUEST'S PACE OUTLIVES A REJOIN (card V3 PR 2, TRAPS §276) ═══
 *
 * WHY.  Eight request paces were stamps on the player's live state `ps`:
 * the dice (`_diceAt`), a drop (`_dropAt`), the gamble (`_lastGambleAt`), the
 * ace flips (`_lastAceFlipAt`), the rewards' read (`_lastRewardsGetAt`), a
 * salvage (`_lastSalvageAt`), the race's start (`_raceStartedAt`) and a rest
 * (`_restAt`).  Every join rebuilds `ps` (TRAPS §276), so a rejoin forgot
 * each one: a script that closed and reopened its socket between requests
 * was paced by the join's own limits, not the request's.
 *
 * THE KEEP.  The stamp stays on `ps` (where every reader and test already
 * looks); the room also keeps a copy, by the stable player id (`bp_...`), in
 * memory only -- NEVER in storage: no new write (CLAUDE.md §5, "writes cost
 * money").  A `ps` a join rebuilt has the field unset; the first read of it
 * fills it from the room's copy.  A field already set (a stamp of this
 * connection, or a test's own) is read as it is.
 *
 *   - paceAt(room, pid, ps, field): the stamp the pace compares with (0:
 *     none), the room's copy filled in for a rebuilt `ps`;
 *   - paceStamp(room, pid, ps, field, now, gapMs): the request taken: the
 *     room's copy, kept until `now + gapMs`; it returns `now`, which the
 *     caller writes on `ps` by name.
 *
 * BOUNDED.  One entry a player id, a field each (Object.create(null): the
 * fields are this file's callers' own names, never the wire's), with the
 * time it stops pacing anything (`until`).  At PACE_KEEP.CAP entries the
 * ones whose `until` has passed go first, then the oldest (a Map keeps its
 * order of insertion, and a stamp moves its entry to the end).  A deploy
 * empties it: one request through early per player, what the stamp on `ps`
 * always allowed at a rejoin.
 *
 * v2.3.6024 (card RV): and the daily spin (`_lastDailySpinAt`,
 * dailyrewards.js), the ninth, left by V3 for RV under Found in
 * docs/plan/status/V3.md.
 *
 * NOT HERE: the fight's timers and the life phase (traps-saves §276's
 * other rows: a rejoin ends the fight).
 *
 * KILL SWITCH (lower case): `pacekeep: false` in the live flags -- nothing
 * kept or read from the room: each pace is the socket's alone, as before.
 *
 * No imports: node tests it directly (server/test/rejoin-pace.test.mjs). */
export const PACE_KEEP = Object.freeze({
  CAP: 1000,   /* as lastplace.js's LAST_PLACE.MAX: far past a room's players */
  /* the fields kept, by why (traps-saves §276's `pace` rows) */
  /* v2.3.6024 (card RV): the daily spin's, the ninth */
  FIELDS: Object.freeze(['_diceAt', '_dropAt', '_lastAceFlipAt', '_lastDailySpinAt', '_lastGambleAt', '_lastRewardsGetAt', '_lastSalvageAt', '_raceStartedAt', '_restAt']),
});
const FIELD = new Set(PACE_KEEP.FIELDS);

/** v2.3.5921: on unless `pacekeep: false` in the live flags */
export function paceKeepOn(room) {
  const f = room && room._liveFlags;
  return !(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'pacekeep') && !f.pacekeep);
}

function keepOf(room) {
  if (!(room._paceKeep instanceof Map)) room._paceKeep = new Map();
  return room._paceKeep;
}

/** The stamp `field`'s pace compares with: `ps`'s own, or -- for a `ps` a
    rejoin rebuilt (the field unset) -- the room's copy, written onto `ps`. */
export function paceAt(room, pid, ps, field) {
  if (!ps || !FIELD.has(field)) return 0;
  if (ps[field] === undefined && typeof pid === 'string' && room && paceKeepOn(room) && room._paceKeep instanceof Map) {
    const k = room._paceKeep.get(pid);
    const v = k ? Number(k[field]) : 0;
    if (v > 0) ps[field] = v;
  }
  return Number(ps[field]) || 0;
}

/** The request taken at `now`: kept by the room until `now + gapMs` (the
    longest it paces anything).  Returns `now`, which the caller writes on
    `ps` by name (`ps._diceAt = paceStamp(...)`), so the stamp is still a
    memory-only field of `ps` where traps-server-word §2 reads it. */
export function paceStamp(room, pid, ps, field, now, gapMs) {
  if (!ps || !FIELD.has(field)) return now;
  if (typeof pid !== 'string' || !pid || !room || !paceKeepOn(room)) return now;
  const m = keepOf(room);
  let k = m.get(pid);
  if (k) m.delete(pid);
  else {
    if (m.size >= PACE_KEEP.CAP) {
      for (const [id, e] of m) if (!(e.until > now)) m.delete(id);
      while (m.size >= PACE_KEEP.CAP) m.delete(m.keys().next().value);
    }
    k = Object.create(null);
    k.until = 0;
  }
  k[field] = now;
  k.until = Math.max(k.until, now + Math.max(0, Number(gapMs) || 0));
  m.set(pid, k);
  return now;
}
