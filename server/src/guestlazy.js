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
    if (!guestLazyOn(this) || typeof id !== 'string' || !id) return false;
    let got = null;
    try { got = await this.state.storage.get(GUEST_LAZY.KEYS.map((k) => k + id)); } catch (e) { got = null; }
    if (!got || typeof got.size !== 'number' || got.size > 0) return false;
    if (!this._guestLazyIds) this._guestLazyIds = new Set();
    this._guestLazyIds.add(id);
    return true;
  },

  /** index.js, when the join returns or throws: the mark goes. */
  _guestLazyEnd(id) {
    if (this._guestLazyIds && typeof id === 'string') this._guestLazyIds.delete(id);
  },
};
