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
 * A phone already in the Wheel (its own reconnect) steps to the body itself
 * (v2.3.4831, bodyPlaceHere below); before, its next move answered.  Anything the trip cannot do (no
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

/* ═══ v2.3.4831: A TAB ALREADY IN THE WHEEL STEPS TO ITS BODY ═══
   The #1509 leftover (docs/STATE-MACHINES.md): a tab in the world whose
   socket dropped mid-fight reconnects with `tb: 1`; the worker keeps the
   body and sends body_place, and this tab -- not in today's town, so no
   trip -- did nothing.  Its next move decided: beside the body it carried
   on, but a phone that walked on while its socket was dead (the moves went
   nowhere) answered from far off, and the worker sent it to the "still in
   that fight" countdown.  Now it stands where the body stands, so its next
   move is the answer the worker waits for (bodytake.js _bodyTakeMove,
   within RESUME_PX).
     - beside it already (NEAR_PX, inside the worker's 300): nothing, as
       before -- no jump for a blip;
     - farther than FAR_PX: nothing, as before (the countdown) -- a jump
       across the Wheel would land on ground not yet loaded;
     - dying or dead: nothing (the respawn has its own way).
   This is the ONE place bodyPlace.js writes the place (body-place.test §4).
   `?bodyhere=0`: the old way, for one phone. */
const NEAR_PX = 200, FAR_PX = 3000;
function bodyHereOff() {
  try { return new URLSearchParams(window.location.search).get('bodyhere') === '0'; } catch (e) { return false; }
}
export function bodyPlaceHere(S, x, y, d) {
  const P = S && S.player;
  if (!P || bodyHereOff() || S._dying || P.dead) return false;
  const dx = x - P.x, dy = y - P.y, dd = dx * dx + dy * dy;
  if (!(dd > NEAR_PX * NEAR_PX) || dd > FAR_PX * FAR_PX) return false;
  P.x = x; P.y = y;
  if (typeof P.vx === 'number') P.vx = 0;
  if (typeof P.vy === 'number') P.vy = 0;
  if (typeof d === 'string') P.dir = d;
  S._bodyPlacedAt = Date.now();   /* QA readout (mp-bodytake) */
  return true;
}

/** `body_place`: land at the body.  True when the trip will take it there. */
export function onBodyPlace(S, p) {
  if (S) S._bodyPlaceDue = 0;   /* it came: the trip goes on */
  if (!S || !p || p.z !== 'wheel' || !canBePlaced()) return false;
  const x = Number(p.x), y = Number(p.y);
  if (!isFinite(x) || !isFinite(y)) return false;
  /* v2.3.4831: a tab already in the Wheel (its own reconnect) steps to the
     body itself -- before, its next move decided, and one that had walked
     on while its socket was dead was sent to the countdown */
  if (S.currentZone === 'wheel') return bodyPlaceHere(S, x, y, p.d);
  if (S.currentZone !== 'town') return false;   /* already somewhere (a dungeon, ...): the next move answers */
  setWheelArrival({ x, y });
  if (S.player && typeof p.d === 'string') S.player.dir = p.d;
  if (!S._spawnToWheel) { wantWheelSpawn(S); veilWheelTrip(S); }
  S._bodyPlacedAt = Date.now();   /* QA readout (mp-bodytake) */
  return true;
}
