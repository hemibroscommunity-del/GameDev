/* ═══ v2.3.6557: THE BOW'S SPECIAL AT ONCE (card CT part 23, PR 2) ═══
 * PURPOSE: Special with the bow is a first strike.  In the two buttons
 * (`?manual=5`) a press of Special with a monster to take shoots the special
 * at it NOW: the latch's lock, else the monster a press of Attack would take
 * now (latch.js sightNow, PR 1's pick: the one function).  Before this, a
 * press whose drawn sight line was not yet on anything readied the special
 * for 2.5 s (playerActions.js specialAttack's queue, BOW_SPECIAL_QUEUE_MS)
 * and it went off only on the frame the line landed -- so the special, the
 * strongest shot, came LAST, after the bro had turned.
 *
 * The readings (the card):
 *   1. a monster to take: the special flies AT ONCE along the line to it,
 *      the latch takes it as Attack's press would (so the body turns to it,
 *      targeting.js latchLock), mana and cooldown spent ONCE (the queue is
 *      never set, so no second shot behind it);
 *   2. nothing to take: today's stands (readied for 2.5 s, nothing spent on
 *      empty air);
 *   3. mode 5 with the bow only: the sword's and the staff's specials, and
 *      the other modes' armed path, are untouched (null here: today's code);
 *   4. `?specialnow=0` gives the queue back.
 * The choice is `bowSpecialPick` (pure); `bowSpecialMon` its one reading of
 * the page and `bowSpecialTake` the latch's take, each called once from
 * specialAttack.  server/test/bow-special.test.mjs. */
import { latchLocked, latchPress, holdAutoOn, sightNow, twoButtonsLive } from './latch.js';
import { readerFor, sw } from './switches.js';
import { discKind } from './rangedStick.js';   /* v2.3.6648 */

/** `?specialnow=0` gives back the queue (a press with the line on empty
 *  ground readies the special, even with a monster to take).  `search` is
 *  for tests. */
export function specialNowOn(search) {
  return !(typeof search === 'string' ? readerFor(search).sw('specialnow') : sw('specialnow'));
}

function idOk(id) { return id != null && id !== ''; }

/** THE CHOICE.  `live` the two buttons' gate (twoButtonsLive), `slot` the
 *  active weapon's slot (S.rpg.activeSlot: the bow's is 'ranged') and
 *  `type` its type (a ranged slot with no bow falls back to the sword: that
 *  special is the sword's, untouched), `on` the
 *  switch (specialNowOn), `lockId` the latch's locked monster or null,
 *  `sightId` the monster a press of Attack would take now or null.  Returns
 *  the id to shoot at now -- the lock first, else the sighting -- or null:
 *  not this path (today's code: the queue, the line, the other weapons). */
export function bowSpecialPick(live, slot, type, on, lockId, sightId) {
  if (live !== true || slot !== 'ranged' || type !== 'bow' || on !== true) return null;
  if (idOk(lockId)) return lockId;
  if (idOk(sightId)) return sightId;
  return null;
}

function findMon(mons, id) {
  if (!Array.isArray(mons)) return null;
  const k = String(id);   /* ids are numbers in some spawn paths, strings over the wire (latch.js findMon) */
  for (let i = 0; i < mons.length; i++) { const m = mons[i]; if (m && String(m.id) === k) return m; }
  return null;
}

/** specialAttack's read: the monster the special flies at now (from
 *  S.monsters), or null (today's path).  `wpn` the active weapon
 *  (getActiveWeapon).  Reads, writes nothing. */
export function bowSpecialMon(S, wpn) {
  if (!S || !S.rpg) return null;
  if (discKind(S) === 'stick') return null;   /* v2.3.6648: with the Attack disc a stick nothing picks a monster for the bow: the special goes along the aim, today's queue (game/rangedStick.js; card PAD part 13) */
  const live = twoButtonsLive();
  const lockId = latchLocked(S) ? S._latchId : null;
  const pk = sightNow(S);   /* Attack's pick now (one scan a press) */
  const id = bowSpecialPick(live, S.rpg.activeSlot, wpn && wpn.type, specialNowOn(), lockId, pk ? pk.id : null);
  return idOk(id) ? findMon(S.monsters, id) : null;
}

/** The special is flying at `m` (bowSpecialMon's): the latch takes it as a
 *  press of Attack would (latch.js latchPress, the same hold rule), unless
 *  it is already the lock.  'lock' when it took it, else null. */
export function bowSpecialTake(S, m) {
  if (!S || !m) return null;
  if (latchLocked(S)) return null;   /* the lock it flies at (bowSpecialMon reads the lock first); a press on a lock would let go of it */
  return latchPress(S, m.id, holdAutoOn()) === 'lock' ? 'lock' : null;
}
