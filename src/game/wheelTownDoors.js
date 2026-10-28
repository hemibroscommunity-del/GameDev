/* ═══ v2.3.3032: THE DOORS OF THE WHEEL'S BROTOWN ═══
 *
 * Owner, 2026-10-04: "Push to main. Then after that add doors."  The Wheel's
 * seventeen buildings are pictures with footprints; this is what makes them
 * doors.
 *
 *   - WHERE: the ground worker's `objects.doors` (placing.js doorSpots), one
 *     per standing building, at the foot of its steps;
 *   - WHAT OPENS: src/data/wheelBuildingDoors.js, plot -> today's building,
 *     so a door opens the very panel the old town's building did (the
 *     BUILDINGS index is what enterBuilding, the E key, the mayor_1 "visit 3
 *     buildings" count and the saved visits all already speak);
 *   - WHEN: standing at one -- your BOOTS within WHEEL_DOOR_REACH of its
 *     foot, the nearest winning.  BroTown.jsx's proximity scan asks
 *     wheelTownDoorAt once a frame and sets S.nearBuilding exactly as the old
 *     town's props did.
 * A plot with nothing to open yet comes back `closed`, for a quiet "shut for
 * now" instead of a door that seems broken.
 */
import { BUILDINGS } from '@/data/index.js';
import { WHEEL_DOOR_REACH, WHEEL_BUILDING_DOORS, WHEEL_SHUT_DOORS, WHEEL_HALL_DOORS, WHEEL_HALL_CAPS } from '@/data/wheelBuildingDoors.js';
import { wheelObjectsInfo } from './wheelTrial.js';
import { isWheelTrialZone } from './worldTrial.js';
import { playerGroundDy } from '@/rendering/systems/entityRenderer.js';

const own = (o, k) => !!o && typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);

let _src = null, _doors = [];

/* ═══ v2.3.3539: A HALL THAT WAITS FOR ITS WORKER ═══
   The Hotel opens onto a rest the worker pays (server/src/rest.js), so it is
   a hall only against a worker that says so (WHEEL_HALL_CAPS: caps.rest);
   against an older one it stands shut, as it always did.  wsClient hands the
   caps over at every state_sync (setWheelHallCaps), and a change makes the
   door list again: a new list, so the minimap and the world map, which keep
   theirs by identity, draw the building again in its new colour. */
let _hallCapsOn = Object.create(null);
/** The worker's caps (state_sync.caps), or null: which cap-gated halls open. */
export function setWheelHallCaps(caps) {
  const on = Object.create(null);
  for (const plot of Object.keys(WHEEL_HALL_CAPS)) {
    const cap = WHEEL_HALL_CAPS[plot];
    if (caps && typeof caps === 'object' && own(caps, cap) && caps[cap]) on[plot] = true;
  }
  const same = Object.keys(WHEEL_HALL_CAPS).every((plot) => !!on[plot] === !!_hallCapsOn[plot]);
  _hallCapsOn = on;
  if (!same) _src = null;
}
/* a hall with no cap to wait for is always open */
function hallOpen(plot) {
  return !own(WHEEL_HALL_CAPS, plot) || !!_hallCapsOn[plot];
}
/** The doors, [{ id, name, label, x, y, index, hall, closed }]: `index` the
    BUILDINGS entry it opens (-1: none), `hall` the Wheel's own hall it opens
    instead (v2.3.3066, WHEEL_HALL_DOORS; null: none), `closed` true for a
    shut one, `label` the name on the Enter button.  [] before the worker has
    posted its objects, or with `?noobjects`. */
export function wheelTownDoors() {
  const info = wheelObjectsInfo();
  const list = info && info.doors;
  if (!Array.isArray(list)) return [];
  if (list === _src) return _doors;
  _src = list;
  _doors = [];
  for (const d of list) {
    if (!d || typeof d.id !== 'string' || !isFinite(d.x) || !isFinite(d.y)) continue;
    let index = -1;
    if (own(WHEEL_BUILDING_DOORS, d.id)) {
      const bid = WHEEL_BUILDING_DOORS[d.id];
      index = BUILDINGS.findIndex((b) => b.id === bid);
    }
    const name = typeof d.name === 'string' && d.name ? d.name : d.id;
    const isHall = index < 0 && own(WHEEL_HALL_DOORS, d.id);
    const hall = isHall && hallOpen(d.id) ? WHEEL_HALL_DOORS[d.id] : null;
    /* shut: a plot listed shut, or a hall still waiting for its worker
       (v2.3.3539: the Hotel against a worker that does not rest) */
    _doors.push({ id: d.id, name, label: name.toUpperCase(), x: d.x, y: d.y, index, hall,
      closed: index < 0 && !hall && (isHall || WHEEL_SHUT_DOORS.indexOf(d.id) >= 0) });
  }
  return _doors;
}

/** The door you stand at in the Wheel (your boots within WHEEL_DOOR_REACH of
    the foot of its steps; the nearest), or null.  A door with nothing behind
    it and nothing to say is never returned (the Town Hall was one, Mayor Bro
    standing on its steps, until v2.3.3258 made it a hall: every plot of the
    town now opens something or says it is shut). */
export function wheelTownDoorAt(S) {
  if (!S || !S.player || !isWheelTrialZone(S.currentZone)) return null;
  const P = S.player;
  const by = P.y + playerGroundDy(S.currentZone, P.x, P.y);
  let best = null, bestD = WHEEL_DOOR_REACH * WHEEL_DOOR_REACH;
  for (const d of wheelTownDoors()) {
    if (d.index < 0 && !d.hall && !d.closed) continue;
    const dx = d.x - P.x, dy = d.y - by, d2 = dx * dx + dy * dy;
    if (d2 <= bestD) { bestD = d2; best = d; }
  }
  return best;
}

/** Going to your farm from the Wheel's Land Office or Feed & Seed: remember
    where you stood, so the farm's gate leads back out THERE
    (zoneTransitions.js, the return branch) -- today's town is no longer a
    place you walk to (v2.3.3025), so the gate must not leave you in it.  Set
    on every trip to the farm (null from anywhere that is not the Wheel), so
    a trip never inherits the last one's.
    v2.3.3705: and the zone the trip leaves (`_farmLeaving`), so the farm's
    hold lets that zone's pictures go (game/farmTrip.js holdFarmUntilReady). */
export function rememberFarmTrip(S) {
  if (!S || !S.player) return;
  S._farmBack = isWheelTrialZone(S.currentZone) ? { x: S.player.x, y: S.player.y } : null;
  S._farmLeaving = S.currentZone || null;
}

/* QA (mp-wheeldoors): the doors as this client knows them, and which one you
   stand at -- read-only */
if (typeof window !== 'undefined') {
  window.__btWheelTownDoors = {
    doors: () => wheelTownDoors().map((d) => ({ ...d })),
    at: () => { const S = window._gameState && window._gameState.current; const d = wheelTownDoorAt(S); return d ? d.id : null; },
  };
}
