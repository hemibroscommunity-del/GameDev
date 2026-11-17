/* ═══ v2.3.5610: A GUEST'S JOIN WRITES NOTHING (card OPS PR 11; red team RT-1 N6) ═══
 *
 * A join with no key, for an id with no `auth:` record, is let in as a
 * throwaway (join.js _verifyJoinAuthNow: legacy clients and `?guest=1` tabs,
 * whose id is new at every page load -- every phone of the game sends its
 * key).  Its join wrote five rows for an id the caller made up, four of them
 * kept for good: `rpg:` (twice), `pets:`, `cadence:login:`,
 * `daily_rewards:` (RT-1, test room; with addresses changed, ~17,000 such
 * joins spend the Free plan's writes for a day, and the rows are never
 * swept).
 *
 * With `guestlazy` on (the default), a FRESH guest's join writes none of
 * them.  Fresh: no key, no `auth:`, and none of `rpg:`, `pets:`,
 * `cadence:login:`, `daily_rewards:` on file for the id (one read of the
 * three, the record's own read already made) -- so the join's turn-overs
 * have nothing to pay or mail (a day's open pot, a season's tiers: they need
 * a record) and skipping their saves can never pay twice.  For the length of
 * the join only (index.js clears the mark when the join returns or throws):
 *   - the join's own two saves of the new record (join.js) are skipped;
 *   - the pet book's first save (petbook.js _petbookLoadOnJoin), the login
 *     streak's (cadence.js _cadenceLoginReward) and the day's rewards'
 *     (dailyrewards.js _drOnJoin) are skipped; the pet book and the day's
 *     rewards stay in the room's memory, as for every player.
 * Anything else the join does saves as it always did (a payment is never
 * a join-time save).  After the join, everything writes as before: the
 * first thing worth keeping (gold, an item, XP, a pet, a spin) saves the
 * whole record, and a guest who comes back has it.  A guest who leaves
 * having done nothing leaves nothing of its own but the bot signals'
 * `botstat:` (botfp.js, the anti-cheat's).
 * The login streak is written at a join only, so a guest's starts the
 * day after its first record (its readers take a missing streak as day 1,
 * what the first day writes).  A join with a key is untouched.
 *
 * KILL SWITCH `guestlazy: false` in the live flags: a guest's join writes
 * its rows as before.
 */

/* ═══ v2.3.5708 (card SEC PR 9): AND A QUIET GUEST WRITES NOTHING AFTER ═══
 * guestlazy took a fresh guest's join down to none of its own rows, but the
 * join still reported to the board (join.js's forced reportToLeaderboard: a
 * `player:` row in the Leaderboard object) and the bot signals wrote
 * `botstat:` (botfp.js, about twice a guest, never deleted).  With
 * `guestquiet` on (the default), a guest found fresh by the same test is
 * QUIET from its join until it does something worth keeping -- the first
 * save of its record (persistence.js _saveRpg: gold, an item, XP, a pet, a
 * spin), which ends it:
 *   - no board report at the join, and none at a track (its session's
 *     `_lbAt` held off, the throttle reportToLeaderboard already reads);
 *     ended, the next track reports as for any player;
 *   - no `botstat:` put (botfp.js _botfpMaybePut keeps the record dirty);
 *     ended, it writes at its pace.
 * A guest who leaves having done nothing leaves no row at all.  Memory only,
 * at most QUIET_MAX ids (the oldest out: that guest then writes as before).
 * An id leaves the set ONLY through _guestQuietEnd, which gives its session
 * the board's clock back (a removal that skipped it left `_lbAt` held off for
 * the rest of the sitting: the sitting-38 review), and the leave drops it
 * (_guestQuietGone) once no socket of it is left.  Evidence (a flag, a cap
 * clamp) is written quiet or not (botfp.js botfpEvidence).
 * The owner's sweep (`DELETE /api/botstat?sweep=1`, botfp.js) takes away the
 * `botstat:` rows whose character has no record, a page at a time.
 * KILL SWITCH `guestquiet: false`: the board report and `botstat:` as before.
 * No new storage key. */
import { botfpEvidence } from './botfp.js';   /* v2.3.5708: what of a quiet guest's bot record is evidence */

export const GUEST_QUIET = Object.freeze({ FLAG: 'guestquiet', QUIET_MAX: 5000 });
/** `guestquiet: false` in the live flags: off.  Unset or anything else: on. */
export function guestQuietOn(room) {
  const f = room && room._liveFlags;
  return !(f && typeof f === 'object' && f[GUEST_QUIET.FLAG] === false);
}

export const GUEST_LAZY = Object.freeze({
  FLAG: 'guestlazy',
  /* the rows a fresh guest has none of (the record's own, `rpg:`, read by the join) */
  KEYS: Object.freeze(['pets:', 'cadence:login:', 'daily_rewards:']),
});

/** `guestlazy: false` in the live flags: off.  Unset or anything else: on. */
export function guestLazyOn(room) {
  const f = room && room._liveFlags;
  return !(f && typeof f === 'object' && f[GUEST_LAZY.FLAG] === false);
}

export const guestLazyMethods = {
  /** true while this id's join is a fresh guest's (its join-time saves skipped). */
  _guestLazy(id) {
    return !!(this._guestLazyIds && typeof id === 'string' && this._guestLazyIds.has(id));
  },

  /** join.js, once the record is read (none on file) and the key check
   *  said guest: marked when none of the other rows is on file either.  A
   *  read that fails marks nothing (the join writes as before). */
  async _guestLazyCheck(id) {
    const lazy = guestLazyOn(this), quiet = guestQuietOn(this);   /* v2.3.5708: the same test, for either */
    if ((!lazy && !quiet) || typeof id !== 'string' || !id) return false;
    let got = null;
    try { got = await this.state.storage.get(GUEST_LAZY.KEYS.map((k) => k + id)); } catch (e) { got = null; }
    if (!got || typeof got.size !== 'number' || got.size > 0) return false;
    if (lazy) {
      if (!this._guestLazyIds) this._guestLazyIds = new Set();
      this._guestLazyIds.add(id);
    }
    if (quiet) {
      if (!this._guestQuietIds) this._guestQuietIds = new Set();
      this._guestQuietIds.delete(id);
      this._guestQuietIds.add(id);
      /* the oldest out through _guestQuietEnd, which gives its session the board's clock back */
      while (this._guestQuietIds.size > GUEST_QUIET.QUIET_MAX) this._guestQuietEnd(this._guestQuietIds.values().next().value);
    }
    return lazy;
  },

  /** v2.3.5708: true while this id is a quiet guest's (no board report, no `botstat:`). */
  _guestQuiet(id) {
    return !!(this._guestQuietIds && typeof id === 'string' && this._guestQuietIds.has(id) && guestQuietOn(this));
  },

  /** v2.3.5708: persistence.js, at the first save of the record: the guest
   *  has done something worth keeping -- reported at the next track, its bot
   *  signals written at their pace.  And the leave, when it goes. */
  _guestQuietEnd(id) {
    if (!this._guestQuietIds || !this._guestQuietIds.has(id)) return;
    this._guestQuietIds.delete(id);
    if (this.sessions) for (const s of this.sessions.values()) if (s && s.id === id && s._lbAt === Infinity) s._lbAt = 0;
  },

  /** v2.3.5708: leave.js, once the session is gone: a quiet id with no
   *  socket left goes (the set holds the guests here, not every one seen). */
  _guestQuietGone(id) {
    if (!this._guestQuietIds || !this._guestQuietIds.has(id)) return;
    if (this.sessions) for (const s of this.sessions.values()) if (s && s.id === id) return;
    /* its bot record goes with it, unless it holds evidence (written at the
       leave's flush): left in the cache, the cache's eviction (botfp.js
       _botfpRecord) put it as `botstat:` once the id was no longer quiet --
       the idle guest's row after all (sitting 38's re-review) */
    if (this._botfp) { const rec = this._botfp.get(id); if (rec && !botfpEvidence(rec)) this._botfp.delete(id); }
    this._guestQuietEnd(id);
  },

  /** index.js, when the join returns or throws: the mark goes. */
  _guestLazyEnd(id) {
    if (this._guestLazyIds && typeof id === 'string') this._guestLazyIds.delete(id);
  },
};
