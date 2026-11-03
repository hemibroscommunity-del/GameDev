/* ═══ v2.3.4077: YOUR LEGS KEEP PACE WITH YOUR FEET ═══
 *
 * The owner (desktop playtest): "Character animation speed and actual speed
 * is not matching!"
 *
 * The jog loops played at fixed cadences (playerSprites.js
 * JOG_DURATION_BY_DIR, tuned by eye at v2.3.535-707, "east is perfect"),
 * whatever the ground did: the walk is 150 px a second, but the ground can go
 * by at half that (the shield, an attack held), a third more (the sprint),
 * twice (the board), at any share of it (a phone's stick half pushed) or
 * faster with agility.  Measured on the sheets (tools/measure_jog_stride.py),
 * even AT the walk a planted boot slid backwards going east (the legs 1.25x
 * the ground) and north-east (1.36x); a computer always plays at full stride,
 * so it always showed.
 *
 * So a loop now lasts as long as the ground takes to go one STRIDE by:
 *
 *     loop ms = stride (world px a loop, at the figure's size) x scale
 *               / the ground's speed (world px a second) x 1000
 *
 *   - JOG_STRIDE_PX: how far the ground goes under a planted boot in one loop
 *     of the facing's sheet, at the default figure (flat zone, default
 *     build).  Measured, not tuned: tools/measure_jog_stride.py tracks the
 *     boots' soles on jog-<dir>-legs.png (and `--check` holds this table to
 *     the sheets).  A mirrored facing shares its sheet's (W east, NW
 *     north-east, SE south-west).
 *   - NORTH and SOUTH have no stride: their planted boots stand still in the
 *     frame (the art steps in place), so there is no slide to time.  They keep
 *     their tuned loop, scaled by the speed against the walk (at the walk,
 *     exactly the old loop).
 *   - `scale`: the figure's size against the default (the zone's curve, a
 *     bro's build): a smaller bro's stride is shorter.
 *   - THE SPEED IS QUANTISED, on the walk's share before the sprint (steps of
 *     LEG_SPEED_STEP, with a little hysteresis), then the sprint's multiplier
 *     goes back on exactly.  So a jittery stick or a peer's rounded velocity
 *     never makes the loop wobble, and a sprint is always exactly SPRINT_MULT
 *     quicker than the walk under it (mp-sprint and mp-sprintpeer read that
 *     ratio off `base` / `cyc`).
 *   - CLAMPED to LEG_CYCLE_MIN_MS..LEG_CYCLE_MAX_MS: a stick barely pushed
 *     does not freeze the legs, a board at a sprint does not blur them.
 *   - The renderer keeps its phase carry (_jogOff): when the loop's length
 *     changes, the stride carries on from where it was.
 *
 * `?legsync=0` brings back the fixed cadences for one tab (legSyncOn), and
 * jogPace with `sync: false` IS the old arithmetic, line for line.  A caller
 * that wants a fixed cadence (a climb drawn from the back-facing jog, a
 * capture) asks playerSprites.cycleMs as before: nothing there changed.
 *
 * No imports: node tests it (server/test/leg-sync.test.mjs).
 */

/* The walk, world px a second: SPEED 2.5 a frame x 60 (data/gameSystems.js),
   the speed the fixed loops were tuned against. */
export const LEG_WALK_SPEED = 150;

/* World px the ground goes by in one loop of the facing's jog sheet, at the
   default figure (BODY_DIR_SCALE.jog x 0.421875 x PLAYER_SIZE_MULT).  From
   tools/measure_jog_stride.py (v2.3.4077):
     east       28 frames, a planted boot 4.56 sheet px a frame (18 steps)
     northeast  24 frames, 4.53 sideways (12 steps); the boot slides sideways
                only, so the stride is the sideways 126.4 over cos 45
     southwest  20 frames, 8.01 sideways (4 steps: the fewest planted frames,
                the least certain); 171.4 over cos 45
   0 = no stride (north, south: the boots step in place). */
export const JOG_STRIDE_PX = Object.freeze({
  east: 168,
  northeast: 179,
  southwest: 242,
  north: 0,
  south: 0,
});

/* The speed's quantum: a 24th of the walk (6.25 px/s).  4/3 of the walk (the
   sprint) and 1/2 (the shield) are whole steps. */
export const LEG_SPEED_STEP = LEG_WALK_SPEED / 24;
/* A new quantised speed only once the speed is this many steps from the
   held one (a speed sitting on a boundary does not flick between two). */
export const LEG_SPEED_HOLD = 0.75;
export const LEG_CYCLE_MIN_MS = 350;
export const LEG_CYCLE_MAX_MS = 3600;

/** Is leg sync on for this page?  `?legsync=0` turns it off (the old fixed
 *  cadences), for one tab. */
export function legSyncOn(search) {
  return !/[?&]legsync=0(&|$)/.test(String(search || ''));
}

/** The speed, quantised to LEG_SPEED_STEP, held at `prev` while within
 *  LEG_SPEED_HOLD steps of it.  Anything moving at all is at least one step;
 *  0 (or nonsense) is 0. */
export function quantiseLegSpeed(speed, prev) {
  const v = Number(speed);
  if (!(v > 0) || !Number.isFinite(v)) return 0;
  const p = Number(prev);
  if (p > 0 && Math.abs(v - p) < LEG_SPEED_HOLD * LEG_SPEED_STEP) return p;
  return Math.max(1, Math.round(v / LEG_SPEED_STEP)) * LEG_SPEED_STEP;
}

/** World px a loop of this facing's sheet covers at the default figure:
 *  its measured stride, or (north, south, an unknown facing) the walk's
 *  distance in its fixed loop -- so the townsfolk, who step by distance,
 *  read one number for both. */
export function jogStridePx(dir, fixedMs) {
  const s = JOG_STRIDE_PX[dir];
  if (s > 0) return s;
  return LEG_WALK_SPEED * (Number(fixedMs) > 0 ? Number(fixedMs) : 1000) / 1000;
}

/** One loop's length, ms, at a quantised ground speed (world px a second).
 *  `fixedMs` is the facing's tuned loop (cycleMs); `scale` the figure's size
 *  against the default (the stride facings only).  Clamped. */
export function strideCycleMs(dir, legSpeed, fixedMs, scale) {
  const v = Number(legSpeed);
  const fixed = Number(fixedMs) > 0 ? Number(fixedMs) : 1000;
  if (!(v > 0)) return fixed;
  const s = JOG_STRIDE_PX[dir];
  /* north, south: the tuned loop by speed / walk (written so, the walk gives
     the tuned loop back exactly, not to the last float bit) */
  const ms = s > 0 ? s * (Number(scale) > 0 ? Number(scale) : 1) / v * 1000 : fixed * LEG_WALK_SPEED / v;
  return Math.min(LEG_CYCLE_MAX_MS, Math.max(LEG_CYCLE_MIN_MS, ms));
}

/** The jog loop for a figure this frame.
 *    state  where the held quantised speed lives (the display); `q` on it
 *    o.dir      the sheet's facing (east, north, northeast, south, southwest)
 *    o.fixedMs  its tuned loop (playerSprites.cycleMs('jog', dir, armoured))
 *    o.speed    the ground's speed, world px a second (0: unknown)
 *    o.mult     the sprint's multiplier in it (1 walking)
 *    o.scale    the figure's size against the default
 *    o.sync     leg sync on (legSyncOn)
 *    o.aimSlow  the old rule's half-speed loop while aiming / shielding
 *               (only when sync is off: with it on, the speed says so)
 *  -> { cyc, base }: the loop now, and the loop unsped by the sprint. */
export function jogPace(state, o) {
  const fixed = Number(o && o.fixedMs) > 0 ? Number(o.fixedMs) : 1000;
  const mult = Number(o && o.mult) > 0 ? Number(o.mult) : 1;
  const speed = Number(o && o.speed);
  if (!(o && o.sync) || !(speed > 0)) {
    /* the old arithmetic (v2.3.3006 / v2.3.3015): the tuned loop, halved
       while aiming, quickened by the sprint */
    if (state) state.q = 0;
    return { cyc: (o && o.aimSlow ? fixed * 2 : fixed) / mult, base: fixed };
  }
  const q = quantiseLegSpeed(speed / mult, state ? state.q : 0);
  if (state) state.q = q;
  const scale = Math.round((Number(o.scale) > 0 ? Number(o.scale) : 1) * 64) / 64;
  return {
    cyc: strideCycleMs(o.dir, q * mult, fixed, scale),
    base: strideCycleMs(o.dir, q, fixed, scale),
  };
}
