/* ═══ v2.3.6660: THE VIEW FOLLOWS THE BRO, NOT HIS SPEED (card GR part 2) ═══
 *
 * The owner, 2026-11-24, on an iPhone 14 Pro, every Speed test row at 60:
 * "Both still feel gritty though and a bit subtly rubber bandy while on
 * skateboard though even at 60fps ... I suspect it has to do with the camera
 * view".  Card GR's census measured it (docs/plan/census/GR-grit.md, M5): the
 * view chased a point 30 game px ahead of the bro (the stick's LEAD) closing
 * 14% of the gap a frame.  A chase like that trails a steady speed v by
 * (1 - k) / k x v, 6.1 v at 14%, so the bro's place on the screen FOLLOWED
 * HIS SPEED: lead and trail cancelled only at the board's top speed.  Each
 * push from a stand slid him ~30 device px forward over 0.8 s, each roll-off
 * ~45 back over 1.5 s, and the jog sat 24 device px behind the ride.
 *
 * THE RULE: the view moves by the bro's own step each frame, THEN closes
 * what gap is left.  A step costs no gap, so the trail is 0 at any speed: the
 * bro sits at ONE place on the screen jogging, pushing off, riding at top
 * speed and rolling to a stop, the jog and the ride at the same place.  What
 * is NOT a walk's step still chases as before, at the same rates (8% a frame
 * stood, 14% moving, 18% swinging or rolling): the camera punch, a lunge, a
 * dodge's burst, a teleport (any step longer than BIG_STEP a frame).
 *
 * THE LEAD (the orchestrator's reading A, 2026-11-25): none along the way you
 * go.  Any lead along the heading has to come in at the stand and go out at
 * the stop (or, scaled by the speed, slide with every push: the fault
 * itself), so the bro would not sit at one place.  Today's ride already sat
 * at the middle (+1.2 device px held, the census); the jog moves 24 device px
 * forward to join it.
 *
 * THE SWITCH: `?camfollow=0` gives back the old chase whole (the lead, the
 * trail), for one phone, read by the caller (switches.js) and passed in.
 *
 * NO IMPORTS: node tests it (tools/guards/camera-follow.test.mjs; in
 * tools/guards so a merge of it deploys no worker, TRAPS §277).
 */

export const FOLLOW = Object.freeze({
  LEAD: 30,          /* the old chase's lead, game px ahead x the stick (?camfollow=0 only) */
  LEAD_MIN: 0.1,     /* ...a stick axis past this leads */
  STILL: 0.08,       /* the share of the gap closed a frame: stood */
  MOVE: 0.14,        /* ...moving (the stick past MOVE_MIN either way) */
  MOVE_MIN: 0.5,
  FAST: 0.18,        /* ...swinging or in a dodge roll */
  PUNCH_MS: 300,     /* a camera punch's life, eased out */
  BIG_STEP: 10,      /* game px a 60th: a step longer is not a walk's (the board's top is 5) and is chased */
});

/** The camera punch's kick now, [x, y] game px; a spent punch is cleared. */
export function camPunch(S, now) {
  const p = S._camPunch;
  if (!p) return [0, 0];
  const age = (now - p.ts) / FOLLOW.PUNCH_MS;
  if (age < 1) {
    const d = 1 - age * age;   /* ease-out */
    return [p.dx * d, p.dy * d];
  }
  S._camPunch = null;
  return [0, 0];
}

/**
 * One frame of the camera (before the zone's clamp, which stays the
 * caller's).  S.camera is moved; S._camFollow keeps the bro's last place.
 *   S        the game's state (camera, player's last place, _dtScale,
 *            isSwinging, _dodgeRoll, _camPunch)
 *   px, py   the bro's place this frame (game px)
 *   W, H     the view's size (game px)
 *   dx, dy   the stick this frame (the walk's, after the board's feel)
 *   now      the clock the punch was stamped on (Date.now())
 *   on       the follow (false: `?camfollow=0`, the old chase)
 */
export function followCamera(S, px, py, W, H, dx, dy, now, on) {
  const cam = S.camera;
  const dt = S._dtScale || 1;
  const pu = camPunch(S, now);
  let lx = 0, ly = 0;
  if (!on) {
    if (Math.abs(dx) > FOLLOW.LEAD_MIN) lx = dx * FOLLOW.LEAD;
    if (Math.abs(dy) > FOLLOW.LEAD_MIN) ly = dy * FOLLOW.LEAD;
  }
  if (on) {
    const m = S._camFollow;
    if (m) {
      const sx = px - m.x, sy = py - m.y, big = FOLLOW.BIG_STEP * dt;
      if (sx * sx + sy * sy <= big * big) { cam.x += sx; cam.y += sy; }
      m.x = px; m.y = py;
    } else {
      S._camFollow = { x: px, y: py };
    }
  }
  const rate = S.isSwinging || S._dodgeRoll ? FOLLOW.FAST
    : Math.abs(dx) > FOLLOW.MOVE_MIN || Math.abs(dy) > FOLLOW.MOVE_MIN ? FOLLOW.MOVE : FOLLOW.STILL;
  /* v2.3.1769: the chase's frame-rate term is a POWER -- closing k of the gap
     once a 60th closes 1-(1-k)^dt over dt 60ths */
  const k = 1 - Math.pow(1 - rate, dt);
  cam.x += (px - W / 2 + lx + pu[0] - cam.x) * k;
  cam.y += (py - H / 2 + ly + pu[1] - cam.y) * k;
}
