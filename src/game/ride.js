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

/* v2.3.5440: the ride's ONE record also carries the board's roll (rideFeel
   below): `spd` its speed, a share of top; `push` the ms since the last push
   began (-1 none: you let go, or stand; null: the switch thrown); `wx`, `wy`
   the way it rolls (the stick's last way); `clk` the board's own clock (game
   ms since you got on, the steady step's); `fx`..`tl` the last step, judged
   on the next frame (blocked: stopped).  Numbers, never a second phase
   beside `on` (CLAUDE.md §5). */
function r0(S) {
  if (!S._ride) S._ride = { on: false, asked: 0, askedOn: null, why: null, at: 0, n: 0, line: null, lineAt: 0, spd: 0, push: -1, wx: 0, wy: 0, clk: 0, fx: 0, fy: 0, tx: 0, ty: 0, tl: 0 };
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

/* ═══ v2.3.4411: A RIDER IS NEVER LEFT WITHOUT THE BOARD BUTTON ═══
   The button gives its place to the fight's buttons (a monster targeted, the
   Block button live; RideButton.jsx) -- but rideCheck steps you off only for
   the shield, a swing, a bash or a roll, NOT for a locked monster or a
   monster near.  So a rider who tapped a monster at the safe ground's edge
   (or rolled up beside one) kept rolling with no button to get off (the
   state-machine sweep, P3-8).  On the board, only the shield up hides it (its
   place is then Bash's, and rideCheck steps you off that same frame).
   `blockLive`: shieldButtonLive's answer, handed in (no imports here). */
export function rideFightHides(S, blockLive) {
  if (!S) return true;
  if (S._shieldUp) return true;
  if (isRiding(S)) return false;
  return !!((S.lockedTarget && S.lockedTarget.type === 'monster') || blockLive);
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
  if (r.on !== was) feelStop(r, true);   /* v2.3.5440: on or off, the board starts from a stand (no coast after a step-off) */
  if (r.on && !was) r.n++;
  if (!r.on && was) {
    const line = rideOffLine(r.why, r.why === 'fight' ? rideActVerb(S, r.at) : null);
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

/* ═══ v2.3.3875: THE LINE NAMES WHAT YOU WERE DOING ═══
   The owner, playtesting on a computer: "the message 'off the board to
   fight' appeared when I pressed E near fish to just fish. Technically the
   message wasn't correct."  The worker ends a ride with one word, 'fight',
   for every action that ends it (server/src/ride.js RIDE_ENDS_ON: a swing,
   an ability, a harvest, a pose, a trap), and the board already steps off
   by itself and the action goes ahead -- so only the words were wrong.  The
   phone knows what it just started, so the line names it: a harvest under
   way names its skill ("Off the board to fish."), a pose "to strike a
   pose", a trap "to set a trap"; a swing or an ability is still "to fight".
   Client-only: the worker's word is unchanged. */
const RIDE_ACT_MS = 5000;
const SKILL_VERB = Object.freeze({ fishing: 'fish', woodcutting: 'chop', mining: 'mine', cooking: 'cook' });
export function rideActVerb(S, now) {
  if (!S) return null;
  const t = typeof now === 'number' ? now : Date.now();
  const ex = S._extraction;
  if (ex && typeof ex.startedAt === 'number' && t - ex.startedAt <= RIDE_ACT_MS) {
    return Object.prototype.hasOwnProperty.call(SKILL_VERB, ex.skill) ? SKILL_VERB[ex.skill] : 'gather';
  }
  if (S._pose && typeof S._pose.at === 'number' && t - S._pose.at <= RIDE_ACT_MS) return 'strike a pose';
  const tp = S._trap && S._trap.pending;   /* game/trapping.js armTrap */
  if (tp && typeof tp.at === 'number' && t - tp.at <= RIDE_ACT_MS) return 'set a trap';
  return null;
}

/** The short line a player reads when the board goes (players read
    "BroTown", never "Wheel"); null when they asked.  v2.3.3875: `verb`, for
    'fight', what you were doing instead (rideActVerb). */
export function rideOffLine(why, verb) {
  switch (why) {
    case 'edge': return 'Off the board: boards stay in BroTown.';
    case 'zone': return 'Off the board: boards stay in BroTown.';
    case 'hit': return 'Knocked off the board!';
    case 'fight': return 'Off the board to ' + (typeof verb === 'string' && verb ? verb : 'fight') + '.';
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
    whether it rolls.  v2.3.5440: `r`, your own ride's record when the
    renderer hands it in: the board's own pushes (rideFeel), so the jog's legs
    show exactly while a push's foot is down, and the sideways glide while you
    coast. */
export function rideLook(st, facing, moving, now, r) {
  const L = RIDE_LOOK;
  const across = ACROSS[facing] || 'south';
  if (!moving) { st.was = false; st.pushUntil = 0; return { pose: 'stand', facing: across, push: false }; }
  if (L.PUSH && r && typeof r.push === 'number') {
    st.was = true;
    if (r.push >= 0 && r.push < L.PUSH_MS) return { pose: 'jog', facing: facing, push: true };
    return { pose: 'stand', facing: across, push: false };
  }
  if (L.PUSH && L.PUSH_EVERY_MS <= 0) return { pose: 'jog', facing: facing, push: true };
  if (L.PUSH && (!st.was || now >= (st.nextAt || 0))) {
    st.pushUntil = now + L.PUSH_MS;
    /* v2.3.5440: from a stand, the start's second push follows the first
       PUSH_GAP_MS after (rideFeel's own start), then one every PUSH_EVERY_MS
       -- the rule for a figure whose ride record this phone does not hold
       (another rider: nothing on the wire says a coast, so theirs may show a
       push mid-glide) */
    st.nextAt = now + ((!st.was && rideFeelOn()) ? RIDE_FEEL.PUSH_GAP_MS : L.PUSH_EVERY_MS);
  }
  st.was = true;
  if (L.PUSH && now < (st.pushUntil || 0)) return { pose: 'jog', facing: facing, push: true };
  return { pose: 'stand', facing: across, push: false };
}

/* ═══ v2.3.5440: THE ROLL-OFF AND THE PUSH START (card SK) ═══
 * The owner, 2026-11-14: "on skateboard create a roll off effect where
 * letting go of skateboard button makes it roll for a while down to a slow
 * stop.  Also let the skateboard take a push or two before reaching max speed
 * when starting from a stop".
 *
 * THE READING CHOSEN (the owner may correct it): "letting go" is letting go of
 * the MOVEMENT -- the stick on a phone, the keys on a computer -- while on the
 * board.  The board button (a tap: on or off) is as it was: a tap off stops
 * you at once.
 *
 * THE MODEL.  The board's speed, `S._ride.spd`, is a share of its top (top
 * stays RIDE_MULT x the walk: BroTown's finalSpd takes RIDE_MULT x spd):
 *   - FROM A STAND, PUSHES.  Held, each push (rideLook's jog legs, RIDE_LOOK
 *     .PUSH_MS long) adds PUSH_ADD, coming in over the push with an ease-out
 *     (the kick quick, then level); the next push PUSH_GAP_MS after the last
 *     began, while below top.  Two from a stand: about 55% of top, then top,
 *     reached about 0.83 s in, the second push's foot up at 1 s.  At top the
 *     push every RIDE_LOOK.PUSH_EVERY_MS stays (looks only: nothing to add).
 *   - LET GO, IT ROLLS OFF.  In the last way you went, from top to a stop in
 *     COAST_MS, slowest at the end: the square root of the speed falls in a
 *     straight line, so the speed is an ease-out of time (power COAST_EASE)
 *     and a coast from part way is the tail of the one from top (memoryless:
 *     it needs no record of when you let go).  No push while it rolls.
 *   - HELD AGAIN WHILE IT ROLLS: on from the speed it has, with a push at
 *     once; never a start from nothing.
 *   - STOPPED AT ONCE (speed 0, no coast): off the board for any reason
 *     (rideApply: stepOff, the worker's ride_state off, a tap); a hold
 *     (`held`: the loading veils, the race line, a stun, the loot freeze,
 *     anything that made the walk 0 this frame); a step that went less than
 *     BLOCK_K of its way, judged on the next frame (a wall, a prop, a
 *     monster, the Mayor gate's hold).  The shield, a swing and a roll step
 *     you off first (rideCheck).  At the safe ground's edge rideCheck steps
 *     you off the frame after you cross it, as before: no coast past it.
 * Through the walk's own step: the coast is the walk's dx/dy (the way it
 * rolls) at RIDE_MULT x spd, so the collision, the water and every check after
 * see it as a walk (no second movement path).  The worker judges a rider at
 * RIDE.MULT, an upper bound: a slower start and a coast are inside it.
 *
 * THE SWITCH: `?ridecoast=0` (or off, false) -- today's instant start and stop
 * (the speed 1 while held, 0 let go).
 */
export const RIDE_FEEL = Object.freeze({
  PUSH_ADD: 0.55,       /* what one push adds, a share of top: two from a stand reach it (the owner: "a push or two"); 1 = one push */
  PUSH_GAP_MS: 600,     /* from one push's start to the next while below top (the push itself is RIDE_LOOK.PUSH_MS): the start's two take about 1 s */
  COAST_MS: 2000,       /* let go at top, stopped this long after (the owner: "roll for a while down to a slow stop"): "longer" is this number */
  COAST_EASE: 2,        /* the roll-off's curve: 1 a straight line, 2 an ease-out (quick at first, slowest at the end) */
  STOP: 0.0025,         /* a speed under this share has stopped (under a px a second): the roll-off from top ends about 1.9 s in */
  HOLD: 0.1,            /* the stick past this either way is held (the loop's own "moving" test); under it you have let go */
  BLOCK_K: 0.3,         /* a step that went under this share of its way was blocked: stopped at once (along a wall at 45 degrees it slides) */
  BLOCK_MIN_PX: 0.5,    /* ...judged only on a step at least this long */
});

/** `?ridecoast=0` (off, false) in the address throws the switch. */
export function rideCoastOn(search) {
  return !/(^|[?&])ridecoast=(0|off|false)(&|$)/.test(typeof search === 'string' ? search : '');
}
let _feelOn = null;   /* the address's word, read once (null: not yet) */
/** The roll-off and push start live on this page? */
export function rideFeelOn() {
  if (_feelOn === null) {
    try { _feelOn = rideCoastOn(typeof window !== 'undefined' && window.location ? window.location.search : ''); } catch (e) { _feelOn = true; }
  }
  return _feelOn;
}
/** Tests: throw the switch (false), put it back (true), or back to the
    address's word (null). */
export function setRideFeel(on) { _feelOn = on == null ? null : !!on; }

/* the speed and the push gone: a stand (and with `all`, the board's clock) */
function feelStop(r, all) {
  r.spd = 0; r.push = -1; r.tl = 0;
  if (all) { r.wx = 0; r.wy = 0; r.clk = 0; }
}

const easeOut = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : 1 - (1 - u) * (1 - u));

/** Each frame, from the movement step (BroTown), after the holds and before
    the step.  `dx`, `dy`: the stick or the keys this frame; `dtMs`: the steady
    step's ms (S._dtScale x 16.667, game/frameClock.js); `held`: a hold this
    frame (the walk is 0); `x`, `y`: where you stand now (the last step
    judged).  Returns [k, dx, dy]: the speed's share to multiply the walk's
    RIDE_MULT by (1 on foot, or with the switch thrown) and the way to go (the
    roll's when you have let go; 0, 0 once it stops). */
export function rideFeel(S, dx, dy, dtMs, held, x, y) {
  if (!isRiding(S)) return [1, dx, dy];
  const r = S._ride, F = RIDE_FEEL;
  const hold = Math.abs(dx) > F.HOLD || Math.abs(dy) > F.HOLD;
  if (!rideFeelOn()) {   /* the switch thrown: today's start and stop */
    r.spd = hold && !held ? 1 : 0; r.push = null; r.tl = 0;
    return [1, dx, dy];
  }
  if (typeof r.push !== 'number') r.push = -1;   /* the switch put back mid-ride */
  const dt = dtMs > 0 && dtMs < 1000 ? dtMs : 16.667;
  r.clk = (r.clk || 0) + dt;
  /* the last step, judged: blocked, the board stops where it stands */
  if (r.tl > 0) {
    if (typeof x === 'number' && typeof y === 'number') {
      const got = ((x - r.fx) * (r.tx - r.fx) + (y - r.fy) * (r.ty - r.fy)) / (r.tl * r.tl);
      if (!(got >= F.BLOCK_K)) r.spd = 0;
    }
    r.tl = 0;
  }
  if (held) { r.spd = 0; r.push = -1; return [0, dx, dy]; }
  if (hold) {
    r.wx = dx; r.wy = dy;
    const L = RIDE_LOOK;
    if (r.push < 0 || r.push >= (r.spd < 1 ? F.PUSH_GAP_MS : L.PUSH_EVERY_MS)) r.push = 0;   /* a push begins */
    const p0 = r.push;
    r.push = p0 + dt;
    if (r.spd < 1 && p0 < L.PUSH_MS) {
      r.spd = Math.min(1, r.spd + F.PUSH_ADD * (easeOut(r.push / L.PUSH_MS) - easeOut(p0 / L.PUSH_MS)));
    }
    return [r.spd, dx, dy];
  }
  /* let go: it rolls off */
  r.push = -1;
  if (r.spd > 0) {
    const u = Math.pow(r.spd, 1 / F.COAST_EASE) - dt / F.COAST_MS;
    r.spd = u > 0 ? Math.pow(u, F.COAST_EASE) : 0;
    if (r.spd < F.STOP) r.spd = 0;
  }
  if (!(r.spd > 0)) { r.spd = 0; return [0, 0, 0]; }
  return [r.spd, r.wx, r.wy];
}

/** After the step is worked out (BroTown): from where, to where it meant to
    go.  The next frame's rideFeel judges it (a wall, the Mayor gate). */
export function rideStepped(S, fx, fy, tx, ty) {
  const r = S && S._ride;
  if (!r || !r.on || typeof r.push !== 'number') return;
  const l = Math.hypot(tx - fx, ty - fy);
  if (!(l >= RIDE_FEEL.BLOCK_MIN_PX)) { r.tl = 0; return; }
  r.fx = fx; r.fy = fy; r.tx = tx; r.ty = ty; r.tl = l;
}

/** The board's speed, a share of top (0 on foot): the roll's sound follows it
    (game/rideSound.js). */
export function rideSpeed(S) {
  return isRiding(S) && S._ride.spd > 0 ? Math.min(1, S._ride.spd) : 0;
}
