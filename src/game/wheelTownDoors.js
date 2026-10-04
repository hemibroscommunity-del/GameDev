/* ═══ v2.3.3030: THE DOORS OF THE WHEEL'S BROTOWN ═══
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
import { WHEEL_DOOR_REACH, WHEEL_BUILDING_DOORS, WHEEL_SHUT_DOORS } from '@/data/wheelBuildingDoors.js';
import { wheelObjectsInfo } from './wheelTrial.js';
import { isWheelTrialZone } from './worldTrial.js';
import { playerGroundDy } from '@/rendering/systems/entityRenderer.js';

const own = (o, k) => !!o && typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);

let _src = null, _doors = [];
/** The doors, [{ id, name, label, x, y, index, closed }]: `index` the
    BUILDINGS entry it opens (-1: none yet), `closed` true for a shut one,
    `label` the name on the Enter button.  [] before the worker has posted its
    objects, or with `?noobjects`. */
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
    _doors.push({ id: d.id, name, label: name.toUpperCase(), x: d.x, y: d.y, index,
      closed: index < 0 && WHEEL_SHUT_DOORS.indexOf(d.id) >= 0 });
  }
  return _doors;
}

/** The door you stand at in the Wheel (your boots within WHEEL_DOOR_REACH of
    the foot of its steps; the nearest), or null.  A door with nothing behind
    it and nothing to say (the Town Hall: Mayor Bro stands on its steps) is
    never returned. */
export function wheelTownDoorAt(S) {
  if (!S || !S.player || !isWheelTrialZone(S.currentZone)) return null;
  const P = S.player;
  const by = P.y + playerGroundDy(S.currentZone, P.x, P.y);
  let best = null, bestD = WHEEL_DOOR_REACH * WHEEL_DOOR_REACH;
  for (const d of wheelTownDoors()) {
    if (d.index < 0 && !d.closed) continue;
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
    a trip never inherits the last one's. */
export function rememberFarmTrip(S) {
  if (!S || !S.player) return;
  S._farmBack = isWheelTrialZone(S.currentZone) ? { x: S.player.x, y: S.player.y } : null;
}

/* QA (mp-wheeldoors): the doors as this client knows them, and which one you
   stand at -- read-only */
if (typeof window !== 'undefined') {
  window.__btWheelTownDoors = {
    doors: () => wheelTownDoors().map((d) => ({ ...d })),
    at: () => { const S = window._gameState && window._gameState.current; const d = wheelTownDoorAt(S); return d ? d.id : null; },
  };
}
