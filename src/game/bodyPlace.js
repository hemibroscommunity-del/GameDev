/* ═══ v2.3.4455: BACK IN YOUR BODY, WHERE IT STANDS IN THE FIGHT ═══
 *
 * The owner (2026-11-10): "So yes do the take over body message".  Opening
 * the game again (a second tab, a quick relaunch) while your bro is in a
 * fight with another player puts you back in that body, where it stands --
 * not in BroTown's square, and not on a countdown (server/src/bodytake.js).
 *
 * The worker says where (`body_place {z, x, y, d}`, after state_sync, only
 * to a join that said `tb: 1` and only when caps.bodyTake).  The phone does
 * not move itself there: it takes the trip every login takes -- down today's
 * town's stairs, behind the loading screen, with the place's art loaded
 * around where it lands (wheelHome.js wantWheelSpawn; worldTrial.js
 * setWheelArrival, the dungeon mouth's own door, preloadWheel warming that
 * point) -- landing at the body instead of the square.  Its first move from
 * there is its answer to the worker.  Nothing here writes the place.
 *
 * A phone already in the Wheel (its own reconnect) does nothing: its next
 * move, beside the body or not, answers.  Anything the trip cannot do (no
 * Wheel on this tab, a place that is not the Wheel) is left to the worker,
 * whose wait runs out into the "still in that fight" countdown.
 */
import { setWheelArrival, wheelIsHome } from './worldTrial.js';
import { wantWheelSpawn } from './wheelHome.js';
import { veilWheelTrip } from './zoneTransitions.js';

/* Can this tab be placed?  Said in the join (`tb: 1`): a tab that takes the
   trip into the Wheel on the way in (`?trial=off` does not). */
export function canBePlaced() {
  try { return wheelIsHome(); } catch (e) { return false; }
}

/* ═══ THE TRIP WAITS FOR THE PLACE ═══
   state_sync says one follows (`bodyPlace: 1`), and the trip down the stairs
   holds until it has come (wheelHome.js wheelSpawnTick asks bodyPlaceHolds):
   the trip leaves 0.4 s after the worker's first word, and on a slow phone
   body_place, a message later, came after it had gone -- landing in the
   square, far from the body (mp-bodytake, run 2).  HOLD_MS at most, so a
   place that never comes cannot hold the way in. */
const HOLD_MS = 5000;
export function bodyPlaceDue(S, msg) {
  if (!S) return;
  S._bodyPlaceDue = (msg && msg.bodyPlace === 1 && msg.caps && msg.caps.bodyTake) ? Date.now() : 0;
}
export function bodyPlaceHolds(S) {
  return !!(S && S._bodyPlaceDue && Date.now() - S._bodyPlaceDue < HOLD_MS);
}

/** `body_place`: land at the body.  True when the trip will take it there. */
export function onBodyPlace(S, p) {
  if (S) S._bodyPlaceDue = 0;   /* it came: the trip goes on */
  if (!S || !p || p.z !== 'wheel' || !canBePlaced()) return false;
  const x = Number(p.x), y = Number(p.y);
  if (!isFinite(x) || !isFinite(y)) return false;
  if (S.currentZone !== 'town') return false;   /* already somewhere: the next move answers */
  setWheelArrival({ x, y });
  if (S.player && typeof p.d === 'string') S.player.dir = p.d;
  if (!S._spawnToWheel) { wantWheelSpawn(S); veilWheelTrip(S); }
  S._bodyPlacedAt = Date.now();   /* QA readout (mp-bodytake) */
  return true;
}
