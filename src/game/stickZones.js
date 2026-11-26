/* ═══ v2.3.6540: THE LEFT STICK'S THREE ZONES (card CT PR 1: the two-button trial, mode 5) ═══
 *
 * The owner, 2026-11-23: "The left joystick rotates the character
 * directionally if pressed at or below about 30% from center and begin
 * walking in the pointed direction if moved further."
 *
 * Mode 5 of manualCombat.js ("the two buttons", `?manual=5`) only.  Mode 4,
 * the game's own, never calls this file.  By the thumb's distance from where
 * it landed, as a SHARE of the stick's travel:
 *
 *   rest   inside DEAD: nothing (a tap stays a tap)
 *   turn   up to TURN (30%): the body faces the thumb's way, on the eight
 *          facings drawn today (entityRenderer's SECTORS, PI/4 apart), and
 *          does not walk
 *   walk   beyond: walk that way, the speed rising from WALK_FLOOR at the
 *          border to full at the rim
 *
 * Today's travel (BroTown handleJoystickMove: the base's half width less 20,
 * 17.5 px upright, 25 sideways) is too short for three zones: 30% of it is
 * inside today's 12 px dead zone.  So in this mode the travel is the disc's
 * DRAWN radius (the base 75 px upright, 90 sideways: RADIUS_UP, RADIUS_SIDE).
 *
 * The swipe and the tap keep today's rules, and are judged FIRST: a release
 * that is a swipe is a roll whichever zone the thumb was in; the turn itself
 * never starts a roll (stickSwipe reads only the gesture, never the zone).
 *
 * `?turnzone=<percent>` moves the border for the trial (TURN_MIN..TURN_MAX).
 *
 * THE PHASE (CLAUDE.md section 5: one field, one function): `S._stickPhase`,
 * 'rest' | 'turn' | 'walk', written only by stickTo (the phase table's
 * `stick` row, src/state/phases.js; server/test/stick-zones.test.mjs fails a
 * second writer).
 *
 * One import, the page's switch reader (game/switches.js, itself of no
 * imports), by a relative path, so node tests it (server/test/
 * stick-zones.test.mjs).
 */
import { readerFor, swValue, sw } from './switches.js';
import { sprintSupported, startSprint, stopSprint } from './sprint.js';   /* v2.3.6545: the rim's sprint, a hold through sprint.js's own start and stop (sprint.js imports nothing) */
import { twoButtonsLive } from './latch.js';   /* v2.3.6545: rimSprintLive, the one gate's answer and the rim's switch */

export const STICK_ZONES = Object.freeze({
  /* the share of the travel that is nothing at all (4.5 px upright, 5.4
     sideways): a thumb only resting on the glass */
  DEAD: 0.12,
  /* the turn's border (the owner: "at or below about 30% from center") */
  TURN: 0.30,
  /* `?turnzone=` is held between these (a border past the rim, or inside
     the dead zone, would leave one of the three zones empty) */
  TURN_MIN: 0.15,
  TURN_MAX: 0.70,
  /* the walk's speed at the border, as a share of full (full at the rim).
     0: crossing the border starts the walk from standing, as today's stick
     rises from 0 at its dead zone (BroTown handleJoystickMove) */
  WALK_FLOOR: 0,
  /* the disc's drawn radius, CSS px: TouchControls.jsx's base, 75 upright
     and 90 sideways, halved */
  RADIUS_UP: 37.5,
  RADIUS_SIDE: 45,
  /* MIRROR BroTown handleCanvasSwipe (the dodge swipe): this far, this
     fast, inside this long */
  SWIPE_PX: 30,
  SWIPE_SPEED: 0.8,
  SWIPE_MS: 300,
  /* MIRROR BroTown TAP_MAX_MOVE_SQ_PX (10 px) and TAP_MAX_DURATION_MS */
  TAP_PX: 10,
  TAP_MS: 200,
  /* the facings drawn today */
  FACINGS: 8,
  /* v2.3.6545 (card CT item 6; trial numbers): the thumb pushed PAST the
     disc's drawn rim sprints.  On at SPRINT_AT of the drawn radius, off only
     below SPRINT_OFF: the gap between them is what keeps a thumb resting
     near the line from starting and stopping the sprint every move */
  SPRINT_AT: 1.25,
  SPRINT_OFF: 1.05,
});

export const STICK_PHASES = Object.freeze(['rest', 'turn', 'walk']);

/** The turn's border for this page, a share of the travel: `?turnzone=<percent>`
 *  (held to TURN_MIN..TURN_MAX), else TURN.  `search` is for tests. */
export function turnShare(search) {
  const raw = typeof search === 'string' ? readerFor(search).swValue('turnzone') : swValue('turnzone');
  const m = /^(\d{1,3})$/.exec(raw == null ? '' : String(raw));
  if (!m) return STICK_ZONES.TURN;
  const v = +m[1] / 100;
  return Math.min(STICK_ZONES.TURN_MAX, Math.max(STICK_ZONES.TURN_MIN, v));
}

/** The stick's travel in this mode: the disc's drawn radius. */
export function stickTravel(sideways) {
  return sideways ? STICK_ZONES.RADIUS_SIDE : STICK_ZONES.RADIUS_UP;
}

/** v2.3.6541 (sitting 57's mend): the turn ring's radius on the disc, CSS px:
 *  the page's turn border (`?turnzone`, turnShare) of the disc's drawn radius,
 *  to a tenth of a px.  TouchControls draws it only in mode 5 (twoButtonsOn). */
export function turnRingRadius(sideways, drawnR) {
  /* v2.3.6641 (card PAD part 4): `drawnR`, the base's radius where it is not
     today's (the controller draws it at its well's size, about 41.5 px, both
     ways up): stickDrive reads the zones off the base's drawn width, so the
     ring follows the same radius or it marks a border the thumb never meets */
  const r = drawnR > 0 ? drawnR : stickTravel(sideways);
  return Math.round(turnShare() * r * 10) / 10;
}

/** Snap an angle to the nearest of the eight facings drawn today. */
export function facing8(ang) {
  const step = (2 * Math.PI) / STICK_ZONES.FACINGS;
  const f = Math.round(ang / step) * step;
  /* v2.3.6540: west is ONE facing, +PI (the gatekeeper's sitting 56: -PI and
     +PI for the same facing would read as a change, and a move as a flip) */
  return f <= -Math.PI + 1e-9 ? Math.PI : f;
}

/** Read the thumb: (dx, dy) from where it landed, CSS px; `travel` the
 *  stick's (stickTravel); `turn` the border (turnShare).  Returns
 *  { phase, share, ang, face, sx, sy }: `face` the snapped facing for a
 *  turn or a walk (null at rest), `sx, sy` the walk's vector (its length the
 *  speed's share, 0 unless walking). */
export function stickRead(dx, dy, travel, turn) {
  const T = typeof turn === 'number' && turn > 0 ? turn : STICK_ZONES.TURN;
  const R = travel > 0 ? travel : STICK_ZONES.RADIUS_UP;
  const d = Math.hypot(dx || 0, dy || 0);
  const share = d / R;
  if (!(share > STICK_ZONES.DEAD)) return { phase: 'rest', share, ang: null, face: null, sx: 0, sy: 0 };
  const ang = Math.atan2(dy, dx);
  const face = facing8(ang);
  if (share <= T) return { phase: 'turn', share, ang, face, sx: 0, sy: 0 };
  const k = Math.min(1, STICK_ZONES.WALK_FLOOR + (1 - STICK_ZONES.WALK_FLOOR) * ((share - T) / (1 - T)));
  return { phase: 'walk', share, ang, face, sx: (dx / d) * k, sy: (dy / d) * k };
}

/* ═══ v2.3.6545: SPRINT FROM THE LEFT STICK'S RIM (card CT item 6) ═══
 * The owner, 2026-11-24: "the sprint button should be moved to the left
 * joystick too" (asked how: "Go recommended").  In mode 5 the thumb pushed
 * PAST the disc's drawn edge sprints; at the rim itself (share 1.0) it walks
 * at full speed and spends nothing, so a thumb resting at the rim never burns
 * stamina by accident.  The share is stickRead's own, the thumb's distance
 * over the drawn radius, NEVER clamped (the walk's vector stops at 1 and
 * would never reach SPRINT_AT).
 *
 * It is a HOLD, like Shift on a computer: out past SPRINT_AT starts it
 * (sprint.js startSprint, how 'rim'), back inside SPRINT_OFF or the thumb
 * lifted stops it (stopSprint 'rim').  It stops only a sprint it started:
 * Shift's stays Shift's.  Every end of today's sprint still ends it
 * (updateSprint: stamina 0, the shield, an attack, the water, death, a zone,
 * standing still), and after ANY end, or a refusal, it starts again only
 * once the thumb has come back inside SPRINT_OFF and gone out again (`ready`).
 * Refused for stamina: today's "Not enough energy!" and the denied tick,
 * once a push (`say`, the button's own words: SprintButton sprintTiredSay).
 * With the shield up, dead, in the water or attacking it does not start (it
 * would end on the next frame and spend the push); the push stays ready.
 * Stamina, the speed and the move's `sp` are today's: the worker judges it
 * as now (server/src/sprint.js).  `?rimsprint=0` turns it off and gives the
 * sprint button back.
 *
 * S._rimSprint { out, ready }: made only on the first push past SPRINT_AT
 * (a page in mode 4 never has one), written only here. */

/** Is the thumb past the rim?  `was` its answer last time (the band: on at
 *  SPRINT_AT, off below SPRINT_OFF). */
export function rimPast(share, was) {
  return was ? share >= STICK_ZONES.SPRINT_OFF : share >= STICK_ZONES.SPRINT_AT;
}

/** The rim's sprint for this page: on unless `?rimsprint=0`.  `search` is
 *  for tests. */
export function rimSprintOn(search) {
  return !(typeof search === 'string' ? readerFor(search).sw('rimsprint') : sw('rimsprint'));
}

/** The two buttons are played AND the rim sprints (the button's place). */
export function rimSprintLive() {
  return twoButtonsLive() && rimSprintOn();
}

/** A sprint the rim started is under way (the turn ring's colour). */
export function rimSprinting(S) {
  const sp = S && S._sprint;
  return !!(sp && sp.on && sp.how === 'rim');
}

/* what would end a sprint on the next frame (updateSprint's own ends) */
function rimHeld(S) {
  return !!(S._shieldUp || S._dying || (S.rpg && S.rpg.hp <= 0) || (S._wheelSwim && S._wheelSwim.on)
    || S.autoAttack || S.isSwinging || S._bashDash);
}

/** The thumb at `share` of the drawn radius, at `now` (Date.now(): sprint.js's
 *  clock).  'start' | 'stop' | 'tired' | null. */
export function rimSprint(S, share, now, say) {
  if (!S || !rimSprintOn()) return null;
  let rim = S._rimSprint;
  if (!rim) {
    if (!(share >= STICK_ZONES.SPRINT_AT) || !sprintSupported(S)) return null;
    rim = S._rimSprint = { out: false, ready: true };
  }
  rim.out = rimPast(share, rim.out);
  if (!rim.out) {
    rim.ready = true;
    return rimSprinting(S) && stopSprint(S, 'rim', now) ? 'stop' : null;
  }
  if (!rim.ready || (S._sprint && S._sprint.on) || rimHeld(S)) return null;
  rim.ready = false;
  if (startSprint(S, now, 'rim')) return 'start';
  if (S._sprint && S._sprint.why === 'tired') {
    if (typeof say === 'function') say(S, now);
    return 'tired';
  }
  return null;
}

/** Is this release a SWIPE (the dodge roll)?  Today's rule, read from the
 *  gesture alone: from where the thumb landed to where it lifted, `ms` its
 *  time down.  The roll's angle, or null. */
export function stickSwipe(dx, dy, ms) {
  const d = Math.hypot(dx || 0, dy || 0);
  const t = Math.max(ms || 0, 1);
  if (d < STICK_ZONES.SWIPE_PX || t > STICK_ZONES.SWIPE_MS || d / t < STICK_ZONES.SWIPE_SPEED) return null;
  return Math.atan2(dy, dx);
}

/** Is this release a TAP (today's rule: short and still)? */
export function stickTap(dx, dy, ms) {
  return Math.hypot(dx || 0, dy || 0) < STICK_ZONES.TAP_PX && (ms || 0) < STICK_ZONES.TAP_MS;
}

/** What a release does, the swipe judged first: 'swipe', 'tap' or 'none'. */
export function stickRelease(dx, dy, ms) {
  if (stickSwipe(dx, dy, ms) != null) return 'swipe';
  if (stickTap(dx, dy, ms)) return 'tap';
  return 'none';
}

/** The stick's phase on this phone: 'rest' when nothing has written it. */
export function stickPhase(S) {
  return (S && S._stickPhase) || 'rest';
}

/** THE ONE WRITER of `S._stickPhase`.  True when it changed. */
export function stickTo(S, phase) {
  if (!S || typeof S !== 'object' || STICK_PHASES.indexOf(phase) < 0) return false;
  if (stickPhase(S) === phase) return false;
  S._stickPhase = phase;
  return true;
}

/* ═══ v2.3.6541: THE STICK IN MODE 5 (card CT PR 2) ═══
 * BroTown's handleJoystickMove makes this ONE call when the page plays the
 * two buttons (manualCombat twoButtonsOn), and returns: the disc and the
 * walk are this function's.  `dx, dy` the thumb from where it landed, CSS
 * px; `radius` the disc's drawn radius (its box's half width: the travel in
 * this mode); `knob`, `rod` the disc's two drawn parts and `op` the disc's
 * opacity (null in node); `say` the sprint refusal's words (v2.3.6545:
 * rimSprint, above).  It draws the knob out to the drawn radius,
 * writes the walk (S.stickX/Y: 0 in a turn and at rest), the body's facing
 * on a turn (S._targetFacingAngle: visualSystems slews S._facingAngle to it,
 * and entityRenderer's 'facingAngle' branch draws it with no renderer
 * change; the facing that changes rides `move` as any turn does today, and
 * nothing goes while it is unchanged), and the stick's phase. */
let _turn = null;   /* the page's `?turnzone`, read once */
export function stickDrive(S, dx, dy, radius, knob, rod, op, say) {
  if (_turn === null) _turn = turnShare();
  const R = radius > 0 ? radius : STICK_ZONES.RADIUS_UP;
  const r = stickRead(dx, dy, R, _turn);
  const d = Math.min(Math.hypot(dx || 0, dy || 0), R);
  const a = Math.atan2(dy || 0, dx || 0);
  if (knob) knob.style.transform = 'translate(calc(-50% + ' + Math.cos(a) * d + 'px), calc(-50% + ' + Math.sin(a) * d + 'px))';
  if (rod) {
    rod.style.width = d + 'px';
    rod.style.transform = 'rotate(' + a + 'rad)';
    rod.style.opacity = d > 4 ? (op || '0.5') : '0';
  }
  S.stickX = r.sx;
  S.stickY = r.sy;
  if (r.phase === 'turn') S._targetFacingAngle = r.face;
  stickTo(S, r.phase);
  r.rim = rimSprint(S, r.share, Date.now(), say);   /* v2.3.6545: the thumb's own share, unclamped; `say` the refusal's words */
  return r;
}

/* ═══ v2.3.6542: THE STICK'S ONE WRITER IN EVERY MODE (the orchestrator, card WL's owned state) ═══
 * S.stickX / S.stickY are written here only: mode 5's stickDrive above, and
 * every other mode's analog read and lift below, moved out of BroTown's
 * handleJoystickMove / handleJoystickEnd WHOLE (the same numbers, the same
 * order of operations, the same frame: a call where the lines were).  The
 * read: the thumb `dist` CSS px from where it landed at `angle`, the stick's
 * travel `maxR` (the disc's half width less 20: 17.5 px upright, 25
 * sideways); inside the 12 px dead zone nothing, else the share past it,
 * full at maxR (v2.3.949's relative drag). */
export const STICK_DEAD_PX = 12;
export function stickAnalog(S, dist, angle, maxR) {
  if (dist < STICK_DEAD_PX) {
    S.stickX = 0;
    S.stickY = 0;
    return;
  }
  /* Analog: normalize to -1..1 range based on distance from center */
  const strength = Math.min((dist - STICK_DEAD_PX) / (maxR - STICK_DEAD_PX), 1);
  S.stickX = Math.cos(angle) * strength;
  S.stickY = Math.sin(angle) * strength;
}
/** The thumb lifted, in every mode: no walk, the stick at rest (stickTo
 *  writes only when mode 5 moved it). */
export function stickLift(S) {
  S.stickX = 0;
  S.stickY = 0;
  stickTo(S, 'rest');
  if (S._rimSprint) rimSprint(S, 0, Date.now(), null);   /* v2.3.6545: a lifted thumb lets go of the rim's sprint (a hold) */
}

/* ═══ v2.3.6541: THE FRAME'S STEP `input` (game/frameSteps.js; card CT PR 2) ═══
 * The loop's read of the player's input, moved here out of BroTown's
 * gameLoop whole (grand plan 5.4's next move: legacy falls by the input
 * step), so the two buttons' reads sit in one named step, not in legacy.
 * Nothing it did changes:
 *   - movement is gated by REAL stuns only (hexer / brute charge), death and
 *     the loot pickup's freeze (`frozen`); the 250 ms hit-react lockout does
 *     not freeze it (v2.3.1x: stacked lockouts read as frame stutter);
 *   - v2.3.3034: a thumb held on the stick is a player (the idle clock,
 *     S._lastInputAt, IDLE_LOGOUT_MS: a stick has no key repeat, and two
 *     minutes of walking logged you out mid-stride).  v2.3.6541: a thumb
 *     held TURNING in mode 5 is one too (its walk is 0);
 *   - the keys move you when the stick does not (the same gates), a diagonal
 *     normalized;
 *   - the name tag's facing, P.dir: 'down' (camera-facing) in the loot
 *     freeze (`lootFrozen`), else the way you move.
 * `K` the keys held.  Returns the walk { dx, dy }: one object, made once,
 * written again each frame (a frame makes no garbage).
 * v2.3.6541 (the gatekeeper's sitting 58): the idle clock is read HERE, on
 * the idle judge's own clock (Date.now(): BroTown's IDLE_LOGOUT_MS check and
 * wsClient's stamp), never handed in: a `performance.now()` or a 0 handed in
 * stamped a walking thumb on another clock and idled it out (the 3034
 * incident), and a guard counting arguments never saw which clock came. */
const _IN = { dx: 0, dy: 0 };
export function stickFrame(S, K, frozen, lootFrozen) {
  let dx = frozen ? 0 : S.stickX, dy = frozen ? 0 : S.stickY;
  if (S.stickX || S.stickY || stickPhase(S) === 'turn') S._lastInputAt = Date.now();
  if (!frozen && dx === 0 && dy === 0) {
    if (K['ArrowUp'] || K['w'] || K['W']) dy = -1;
    if (K['ArrowDown'] || K['s'] || K['S']) dy = 1;
    if (K['ArrowLeft'] || K['a'] || K['A']) dx = -1;
    if (K['ArrowRight'] || K['d'] || K['D']) dx = 1;
    if (dx && dy) { const len = Math.sqrt(dx * dx + dy * dy); dx /= len; dy /= len; }
  }
  const P = S.player;
  if (lootFrozen) P.dir = 'down';
  else if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
    if (Math.abs(dx) > Math.abs(dy)) P.dir = dx > 0 ? 'right' : 'left'; else P.dir = dy > 0 ? 'down' : 'up';
  }
  _IN.dx = dx; _IN.dy = dy;
  return _IN;
}
/** v2.3.6820 (card LOCK; the orchestrator's yes, 2026-11-26): this frame's
 *  walk as stickFrame made it -- the stick, or the keys when the stick is at
 *  rest, 0 when frozen -- for the lock's pick (targeting.js: the push chooses
 *  between two monsters about as near), so it reads no S.stickX of its own
 *  (stick-zones §8's closed list).  The one object, never copied. */
export function walkNow() { return _IN; }
