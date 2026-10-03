/* ═══ v2.3.3006: SPRINT ═══
 *
 * Owner, 2026-10-03: "Also adding a sprint button by the left joystick that
 * drains down stamina but makes you run about 33% faster until it drains out.
 * Maybe just to the right of the left joystick".
 *
 * TAP the button (ui/panels/SprintButton.jsx, right of the movement disc) or
 * HOLD Shift on a keyboard, and you run at SPRINT_MULT of your walk, spending
 * SPRINT_DRAIN_PER_S stamina a second -- only while you are actually moving.
 * It ends when:
 *   - your stamina runs out (the worker's bar, or this prediction of it);
 *   - you tap again, or let go of Shift;
 *   - you stand still for IDLE_STOP_MS once you have run (a tap's sprint;
 *     Shift's lasts while it is held).  Before the first step you have
 *     START_WAIT_MS: the thumb that tapped the button has to get back to the
 *     stick;
 *   - you raise the shield, attack, go into the water, die or change zone.
 * A new sprint needs SPRINT_MIN_START stamina; one under way runs to zero.
 *
 * STAMINA IS THE WORKER'S (server/src/sprint.js).  Each move this client sends
 * while sprinting is marked `sp: 1` (networking/wsClient.js, sprintStepFlag)
 * and the worker bills it and judges it at SPRINT.MULT the walking bound; its
 * player_state carries the stamina back and wins.  The drain here is a
 * PREDICTION, so the bar moves smoothly between those echoes and the sprint
 * stops on time; the regen is held off meanwhile, as the worker holds its own.
 * Only against a worker that advertises caps.sprint (sprintSupported): an old
 * one would judge the faster moves at the walking bound and snap you back.
 *
 * No imports: BroTown hands in what it knows each frame (moving, the shield,
 * the water...), and node can test this.  The numbers MIRROR the worker's
 * SPRINT (mirror-audit.test.mjs pins the three pairs).
 */

/* MIRROR: server/src/sprint.js SPRINT.MULT / DRAIN_PER_S / MIN_START */
export const SPRINT_MULT = 1.33;
export const SPRINT_DRAIN_PER_S = 11;
export const SPRINT_MIN_START = 5;
/* stand still this long and a tapped sprint ends (a turn of the stick, or a
   thumb lifted to re-grip it, is not standing still) */
export const IDLE_STOP_MS = 700;
/* ...but a sprint that has not run yet waits this long for its first step:
   on a phone the thumb that tapped the button goes back to the stick */
export const START_WAIT_MS = 2000;
/* no local stamina regen within this of the last sprinting frame (the
   worker's REGEN_PAUSE_MS) */
export const REGEN_PAUSE_MS = 1000;

function sp0(S) {
  if (!S._sprint) S._sprint = { on: false, how: null, at: 0, moving: false, ran: false, lastMoveAt: 0, ranAt: 0, why: null, refusedAt: 0, endedAt: 0, zone: null, key: false, n: 0 };
  return S._sprint;
}

/** Does this worker settle a sprint (caps.sprint)? */
export function sprintSupported(S) {
  return !!(S && S._serverCaps && S._serverCaps.sprint === true);
}

/** Armed: tapped on (or Shift held), whether or not you are moving. */
export function sprintArmed(S) {
  return !!(S && S._sprint && S._sprint.on);
}

/** Running this frame: armed AND moving -- the walk is SPRINT_MULT. */
export function isSprinting(S) {
  const sp = S && S._sprint;
  return !!(sp && sp.on && sp.moving);
}

/** The walk's multiplier this frame. */
export function sprintMult(S) {
  return isSprinting(S) ? SPRINT_MULT : 1;
}

/** 1 to mark the move this client sends as a sprint step, else 0. */
export function sprintStepFlag(S) {
  return isSprinting(S) ? 1 : 0;
}

/** Is the stamina regen held off for a sprint? */
export function sprintHoldsRegen(S, now) {
  const sp = S && S._sprint;
  return !!(sp && sp.ranAt && now - sp.ranAt < REGEN_PAUSE_MS);
}

function stamina(S) {
  const R = S && S.rpg;
  return R && typeof R.stamina === 'number' ? R.stamina : 0;
}

/** Start a sprint.  false, with `why`, when it cannot: 'unsupported' (this
    worker has no sprint), 'tired' (under SPRINT_MIN_START stamina). */
export function startSprint(S, now, how) {
  if (!S) return false;
  const sp = sp0(S);
  if (!sprintSupported(S)) { sp.why = 'unsupported'; return false; }
  if (stamina(S) < SPRINT_MIN_START) { sp.why = 'tired'; sp.refusedAt = now; return false; }
  sp.on = true;
  sp.how = how || 'tap';
  sp.at = now;
  sp.ran = false;
  sp.lastMoveAt = now;
  sp.why = null;
  sp.zone = S.currentZone || null;
  sp.n++;
  return true;
}

/** End a sprint, saying why. */
export function stopSprint(S, why, now) {
  const sp = S && S._sprint;
  if (!sp || !sp.on) return false;
  sp.on = false;
  sp.moving = false;
  sp.how = null;
  sp.why = why || 'stop';
  sp.endedAt = now;
  return true;
}

/** The button: on, or off. */
export function toggleSprint(S, now) {
  if (sprintArmed(S)) { stopSprint(S, 'tap', now); return false; }
  return startSprint(S, now, 'tap');
}

/* ═══ v2.3.3015: WHAT A SPRINT LOOKS AND SOUNDS LIKE ═══
   Asked of the sprint "other players' legs run at walking pace when they
   sprint; no sprint sound or dust at the feet", the owner: "Yes continue
   working on those items".  So: a push-off as a sprint's first stride lands
   (updateSprint's 'run', BroTown plays BT_AUDIO.sprintPush), a puff of dust
   at every footfall of a sprint -- yours and a peer's (entityRenderer, on the
   jog's own foot-plant frames) -- in the colour of the ground it lands on
   (worldTrial.footstepSurface: the Wheel's; null elsewhere, the dirt), and a
   peer's legs at sprint pace while the worker says they sprint (`spr` on the
   tick's player, server/src/tick.js). */
export const SPRINT_DUST = {
  snow: ['#ffffff', '#dcefff'],
  ice: ['#eef8ff', '#bfe3ff'],
  sand: ['#e6d29e', '#cdb27c'],
  grass: ['#a8c97a', '#8a6a44'],
  forest: ['#9ab86c', '#6e5236'],
  gravel: ['#c4bdb0', '#948c80'],
  stone: ['#bdb6aa', '#8f887c'],
  mud: ['#7a5a3a', '#5e4630'],
  ash: ['#8f8a85', '#5f5a55'],
  wood: ['#c9b48a', '#a08860'],
  metal: ['#c9c2b4', '#9a9284'],
  dirt: ['#c8b08a', '#a48c66'],
};

/**
 * A puff of dust where a sprinting foot lands: `n` motes at (x, y) -- the
 * boots -- thrown back against the run (`ang`, the way you run) and up, in
 * the colours of `surface` (SPRINT_DUST; anything else is the dirt's).
 * Pushed to the game's own particles (S.hitParticles, drawn by
 * effectsRenderer); `k` is how big the figure is drawn there.
 */
export function sprintDust(S, x, y, surface, ang, k, n) {
  const parts = S && S.hitParticles;
  if (!parts || typeof x !== 'number' || typeof y !== 'number') return 0;
  const cols = (surface && Object.prototype.hasOwnProperty.call(SPRINT_DUST, surface)) ? SPRINT_DUST[surface] : SPRINT_DUST.dirt;
  const kk = k > 0 ? k : 1;
  const back = typeof ang === 'number' ? ang + Math.PI : Math.PI / 2;
  const count = n || 4;
  for (let i = 0; i < count; i++) {
    const a = back + (Math.random() - 0.5) * 1.3;
    const sp = 0.5 + Math.random() * 1.1;
    parts.push({ x: x + (Math.random() - 0.5) * 8 * kk, y: y - Math.random() * 3 * kk,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.4 - 0.5 - Math.random() * 0.5,
      life: 0.42 + Math.random() * 0.2, color: cols[i % 2], size: (1.8 + Math.random() * 1.2) * Math.min(1.4, kk) });
  }
  return count;
}

/**
 * Once a frame, before the walk.  `f`:
 *   moving     the stick or the keys are pushed this frame AND the walk can
 *              take you somewhere (not mid-roll, not held or veiled): a frame
 *              that cannot move must not spend the prediction
 *   key        Shift is held
 *   swimming / shield / attacking / dead   what ends a sprint
 *   dtMs       this frame, in game time (BroTown's _dtScale x 16.7)
 * Returns 'start' | 'stop' | null for the caller's sound or note -- and
 * since v2.3.3015 'run' on a sprint's first moving frame, its push-off.
 */
export function updateSprint(S, now, f) {
  if (!S) return null;
  const sp = sp0(S);
  const fr = f || {};
  let ev = null;
  /* Shift: held arms it, let go disarms a sprint it armed; tried once per
     press, so holding it while tired does not retry every frame */
  if (fr.key && !sp.key && !sp.on) { if (startSprint(S, now, 'key')) ev = 'start'; }
  if (!fr.key && sp.key && sp.on && sp.how === 'key') { stopSprint(S, 'key', now); ev = 'stop'; }
  sp.key = !!fr.key;
  if (!sp.on) { sp.moving = false; return ev; }
  const end = (why) => { stopSprint(S, why, now); return 'stop'; };
  if (!sprintSupported(S)) return end('unsupported');
  if (fr.dead) return end('dead');
  if (fr.swimming) return end('swim');
  if (fr.shield) return end('shield');
  if (fr.attacking) return end('attack');
  if (sp.zone != null && S.currentZone !== sp.zone) return end('zone');
  if (fr.moving) sp.lastMoveAt = now;
  else if (sp.how !== 'key' && now - sp.lastMoveAt > (sp.ran ? IDLE_STOP_MS : START_WAIT_MS)) return end('still');
  sp.moving = !!fr.moving;
  if (sp.moving) {
    /* v2.3.3015: the first stride of this sprint: its push-off */
    if (!sp.ran) ev = ev || 'run';
    sp.ran = true;
    sp.ranAt = now;
    /* the prediction: the worker's player_state overwrites it */
    const R = S.rpg;
    if (R && typeof R.stamina === 'number') {
      const dt = Math.max(0, Math.min(100, fr.dtMs || 16.7));
      R.stamina = Math.max(0, R.stamina - SPRINT_DRAIN_PER_S * dt / 1000);
      if (R.stamina <= 0) return end('empty');
    }
  }
  return ev;
}

/** Death, a respawn or a zone change: no sprint carries over. */
export function clearSprint(S) {
  if (S && S._sprint) { S._sprint.on = false; S._sprint.moving = false; S._sprint.how = null; }
}
