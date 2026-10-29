/* ═══ v2.3.3776: THE SKATEBOARD, THE PHONE'S HALF ═══
 *
 * The owner, 2026-10-28: "I want to be able to ride around on this just in the
 * safe Brotown area.  You can tap it to ride (maybe a button somewhere on
 * screen).  When outside of town it makes you get off."  OWNER-LIST item 26:
 * "faster than sprinting, off when you fight, swim or get hit".
 *
 * THE WORKER DECIDES (server/src/ride.js).  A tap on the board button
 * (ui/panels/RideButton.jsx, Z on a keyboard) asks it -- `ride` {on} -- and
 * its `ride_state` {on, why} puts you on or off (rideApply).  While on, you
 * roll at RIDE_MULT of your walk (BroTown's finalSpd); the worker judges your
 * moves at the same.
 *
 * THE PHONE GETS OFF ON ITS OWN, a step ahead of the worker (a prediction):
 * past the safe ground's edge, out of the Wheel, in the water, dead, or when
 * you fight (rideCheck) -- so the board never rolls on past the edge while
 * the worker's word is on its way.  The worker's own `ride_state` then just
 * agrees.
 *
 * No imports: BroTown hands in what it knows (the safe ground's centre and
 * radius among it), and node can test this (server/test/ride.test.mjs).
 * RIDE_MULT MIRRORS the worker's RIDE.MULT (mirror-audit.test.mjs).
 */

/* MIRROR: server/src/ride.js RIDE.MULT */
export const RIDE_MULT = 2.0;   /* the owner: "about twice as fast as run speed" */
/* a tap that waits on the worker's answer this long is given up (the button
   comes back to "get on") */
export const ASK_MS = 2500;

function r0(S) {
  if (!S._ride) S._ride = { on: false, asked: 0, askedOn: null, why: null, at: 0, n: 0, line: null, lineAt: 0 };
  return S._ride;
}

/** Does this worker carry a board (caps.ride)? */
export function rideSupported(S) {
  return !!(S && S._serverCaps && S._serverCaps.ride === true);
}

/** On the board (the worker's word, or the phone's own step off). */
export function isRiding(S) {
  return !!(S && S._ride && S._ride.on);
}

/** The walk's factor while riding (BroTown's finalSpd). */
export function rideMult(S) {
  return isRiding(S) ? RIDE_MULT : 1;
}

/** Inside the safe ground's circle (`centre` [x, y], radius `r`, game px)? */
export function onRideGround(x, y, centre, r) {
  if (typeof x !== 'number' || typeof y !== 'number' || !centre || !(r > 0)) return false;
  const dx = x - centre[0], dy = y - centre[1];
  return dx * dx + dy * dy < r * r;
}

/** May the button be shown: the worker carries boards, you stand in the
    Wheel on its safe ground (`f.centre`, `f.safeR`), alive and dry. */
export function rideButtonWanted(S, f) {
  if (!rideSupported(S) || !S.player || S.currentZone !== 'wheel') return false;
  if (S.rpg && typeof S.rpg.hp === 'number' && S.rpg.hp <= 0) return false;
  if (f && f.swimming) return false;
  return isRiding(S) || onRideGround(S.player.x, S.player.y, f && f.centre, f && f.safeR);
}

/** A tap: ask to get on (or off).  `send(type, payload)` is the socket's.
    Returns what was asked, or null when nothing was sent. */
export function toggleRide(S, now, send) {
  if (!S || !rideSupported(S) || typeof send !== 'function') return null;
  const r = r0(S);
  const want = !r.on;
  r.asked = now;
  r.askedOn = want;
  send('ride', { on: want ? 1 : 0 });
  return want;
}

/** The worker's `ride_state` {on, why}. */
export function rideApply(S, p, now) {
  if (!S || !p) return;
  const r = r0(S);
  const was = r.on;
  r.on = !!p.on;
  r.why = p.why || null;
  r.asked = 0;
  r.askedOn = null;
  r.at = now || Date.now();
  if (r.on && !was) r.n++;
  if (!r.on && was) {
    const line = rideOffLine(r.why);
    if (line) { r.line = line; r.lineAt = r.at; }
  }
}

/** Off the board, the phone's own say (a prediction the worker will agree
    with), with its line. */
export function stepOff(S, why, now) {
  if (!S || !S._ride || !S._ride.on) return false;
  rideApply(S, { on: false, why }, now);
  return true;
}

/** Each frame (BroTown): get off at the edge, out of the Wheel, in the water,
    dead or fighting.  `f`: {centre, safeR, swimming, fighting}. */
export function rideCheck(S, now, f) {
  if (!isRiding(S)) return null;
  const dead = !!(S.rpg && typeof S.rpg.hp === 'number' && S.rpg.hp <= 0);
  if (dead) { stepOff(S, 'dead', now); return 'dead'; }
  if (!rideSupported(S)) { stepOff(S, 'off', now); return 'off'; }
  if (S.currentZone !== 'wheel' || !S.player) { stepOff(S, 'zone', now); return 'zone'; }
  if (f && f.swimming) { stepOff(S, 'edge', now); return 'edge'; }
  if (f && f.fighting) { stepOff(S, 'fight', now); return 'fight'; }
  if (!onRideGround(S.player.x, S.player.y, f && f.centre, f && f.safeR)) { stepOff(S, 'edge', now); return 'edge'; }
  return null;
}

/** The short line a player reads when the board goes (players read
    "BroTown", never "Wheel"); null when they asked. */
export function rideOffLine(why) {
  switch (why) {
    case 'edge': return 'Off the board: boards stay in BroTown.';
    case 'zone': return 'Off the board: boards stay in BroTown.';
    case 'hit': return 'Knocked off the board!';
    case 'fight': return 'Off the board to fight.';
    case 'duel': return 'Off the board for the duel.';
    case 'dead': return null;
    case 'off': return 'Boards are put away for now.';
    case 'where': return 'Boards are for BroTown only.';
    case 'busy': return 'Not now: finish what you are doing first.';
    default: return null;
  }
}

/** A forgotten board on a fresh join (the worker forgets it too). */
export function clearRide(S) {
  if (S) S._ride = null;
}

/* ═══ v2.3.3776: HOW A RIDER STANDS -- SIDEWAYS, WITH A PUSH ═══
 * The owner: "I also don't know if it's better to just use the idle bro
 * sideways staying positions or if jog legs can be used to 'push' every once
 * in a while (or just constantly)".  The orchestrator's call, one switch here
 * if the owner prefers another: he glides in the idle STAND pose standing
 * SIDEWAYS on the board, as a skater does -- the board going east or west,
 * he faces south (to the camera); north or south, he faces east; on a
 * diagonal, the diagonal across it that faces the camera -- and PUSHES: when
 * he sets off, and every PUSH_EVERY_MS while he rolls, he turns to face the
 * way he goes and plays PUSH_MS of the jog's legs.
 *   PUSH: false      never pushes (always the sideways glide)
 *   PUSH_EVERY_MS: 0 pushes all the time (the jog's legs, facing forward)
 * Drawn by entityRenderer for you and for every rider the tick names; the
 * facing the phone SENDS stays the way you go (S._renderFacing), so each
 * phone turns it once. */
export const RIDE_LOOK = Object.freeze({ PUSH: true, PUSH_EVERY_MS: 2000, PUSH_MS: 400 });

const ACROSS = Object.freeze({
  east: 'south', west: 'south',
  north: 'east', south: 'east',
  southeast: 'southwest', northwest: 'southwest',
  northeast: 'southeast', southwest: 'southeast',
});

/** The rider's pose and facing this frame.  `st` is the figure's own little
    record (kept on its display), `facing` the way it goes (8-way), `moving`
    whether it rolls. */
export function rideLook(st, facing, moving, now) {
  const L = RIDE_LOOK;
  const across = ACROSS[facing] || 'south';
  if (!moving) { st.was = false; st.pushUntil = 0; return { pose: 'stand', facing: across, push: false }; }
  if (L.PUSH && L.PUSH_EVERY_MS <= 0) return { pose: 'jog', facing: facing, push: true };
  if (L.PUSH && (!st.was || now >= (st.nextAt || 0))) {
    st.pushUntil = now + L.PUSH_MS;
    st.nextAt = now + L.PUSH_EVERY_MS;
  }
  st.was = true;
  if (L.PUSH && now < (st.pushUntil || 0)) return { pose: 'jog', facing: facing, push: true };
  return { pose: 'stand', facing: across, push: false };
}
