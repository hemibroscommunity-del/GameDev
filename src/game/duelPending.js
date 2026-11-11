/* ═══ v2.3.4361: AN ACCEPTED DUEL WAITS FOR THE WORKER'S WORD ═══
 *
 * The state-machine sweep (2026-11-03, V6 "the phantom duel"): tapping Accept
 * on a duel card marked the phone "in a duel" at once (DuelRequestPanel), and
 * only the worker's `duel_end` ever cleared it.  When the worker refused the
 * accept -- the card was over 2 minutes old, the challenger had logged off,
 * gone through a door, or got into another duel (server/src/duel.js
 * _interceptDuel: a silent drop or declineBoth) -- the phone stayed in a duel
 * that did not exist, until a reload.  In No man's land every swing of that
 * phantom duel went out as a player attack, which could hit a bystander and
 * give the swinger a red skull.
 *
 * Kept: the instant "DUEL!" on the tap (the sweep's review R1: entering only
 * on the echo changes the feel, and eleven phone tests read `_inDuel` at
 * once).  Added: the duel is PENDING until the accepter's own settled echo
 * comes back.  The worker relays a settled `duel_accept` into the room's
 * event buffer, which every phone hears on both protocols (the tick's
 * `events`, not zone-placed: eventplace.js), the accepter's own included --
 * server/test/duel-pending.test.mjs proves it on v1 and v2.  If that echo has
 * not come back within DUEL_PENDING.SETTLE_MS of the tap, or a `duel_decline`
 * from that challenger comes first, the pending duel is dropped: `_inDuel`,
 * the lock it took, and the popup says so.
 *
 * A duel already under way when the card is accepted (a card that popped up
 * mid-duel) is remembered as `prev` and put back, so a refused second accept
 * does not lose the live one on this phone (the worker allows one duel at a
 * time and drops that accept).
 *
 * Phone-side only: the worker is unchanged.  No imports but the duel lock,
 * so node can test it (server/test/duel-pending.test.mjs).
 */
import { lockOntoDuelOpponent } from './duelLock.js';

/* ═══ v2.3.4628: THE CHALLENGE CARD HAS A CLOCK OF ITS OWN ═══
   The worker holds a challenge for DUEL.CHALLENGE_TTL (server/src/duel.js, 2
   minutes; mirror-audit pins the two) and refuses an accept after it.  The card
   (DuelRequestPanel) had no clock: it covers the screen, its backdrop is inert
   on purpose (v2.3.2289), and it stayed up for a challenge the worker had long
   dropped -- the 2 minutes run out, a server update forgets every challenge, or
   the phone came back from a reconnect still showing it (rejoinSlots.js
   REJOIN_NOT_YET).  It closes itself when the challenge does. */
export const DUEL_CARD = Object.freeze({ TTL_MS: 120000 });
/** How long the card `req` ({ ts }, when it came) has left at `now`: 0 when the
    worker's challenge has run out (or the card says nothing of when it came). */
export function duelCardLeftMs(req, now) {
  if (!req || !(Number(req.ts) > 0)) return 0;
  return Math.max(0, Number(req.ts) + DUEL_CARD.TTL_MS - (Number(now) || 0));
}

export const DUEL_PENDING = Object.freeze({
  /* the echo comes one tick (~50 ms) plus the round trip after the tap, and a
     wager's escrow write; eight seconds is far past that and still short
     enough that a refused accept is over before the next fight */
  SETTLE_MS: 8000,
});

/** The Accept tap: the duel this phone now shows, PENDING the worker's word.
 *  Returns the new `_inDuel`. */
export function enterPendingDuel(S, fromId, fromName, wager, now) {
  const prev = S._inDuel && !S._inDuel.settleBy ? S._inDuel : null;
  S._inDuel = {
    opponent: fromId,
    opponentName: fromName,
    wager: wager || 0,
    startTime: now,
    settleBy: now + DUEL_PENDING.SETTLE_MS,
    prev,
  };
  return S._inDuel;
}

/** This phone's OWN accept, echoed settled by the worker: the pending duel is
 *  real.  True when it settled one. */
export function settleOwnAccept(S, payload) {
  const d = S && S._inDuel;
  if (!d || !d.settleBy || !payload || payload.settled !== true) return false;
  if (String(payload.from || payload.id) !== String(S.myId)) return false;
  if (String(payload.target) !== String(d.opponent)) return false;
  delete d.settleBy;
  delete d.prev;
  return true;
}

function dropPending(S) {
  const d = S._inDuel;
  const foe = String(d.opponent);
  S._inDuel = d.prev || null;
  if (S._activeDuel && String(S._activeDuel.partnerId) === foe) S._activeDuel = null;
  if (S.lockedTarget && S.lockedTarget.type === 'player' && String(S.lockedTarget.id) === foe) {
    S.lockedTarget = null;
    if (d.prev) lockOntoDuelOpponent(S, d.prev.opponent);
  }
  return true;
}

/** Each frame: a pending duel the worker never settled is dropped once its
 *  clock runs out.  True when it dropped one (the caller says so). */
export function dropUnsettledDuel(S, now) {
  const d = S && S._inDuel;
  if (!d || !d.settleBy || now < d.settleBy) return false;
  return dropPending(S);
}

/** A `duel_decline` to this phone from the challenger of its pending duel
 *  (the worker's declineBoth): the duel never started.  A settled duel is
 *  never ended by a decline.  True when it dropped one. */
export function declineDropsDuel(S, payload) {
  const d = S && S._inDuel;
  if (!d || !d.settleBy || !payload) return false;
  if (String(payload.target) !== String(S.myId)) return false;
  if (String(payload.from || payload.id) !== String(d.opponent)) return false;
  return dropPending(S);
}

/** The player a duel's melee swing is aimed at, for its claim's `target`: the
 *  worker then lands it on that player only (server/src/combat.js
 *  _resolvePvPAttack's `onlyTarget`), never on a bystander in the cone.  The
 *  bow and the staff already name theirs (projectiles.js).  null outside a
 *  duel: a free-fire swing keeps its cone, as before. */
export function duelSwingTarget(S) {
  const d = S && S._inDuel;
  if (!d || d.opponent == null) return null;
  const id = String(d.opponent);
  return id ? id : null;
}
