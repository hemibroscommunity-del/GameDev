/* ═══ A PROP STOPS WHAT IS FLYING, ON SCREEN  (v2.3.2699) ═══
 *
 * Owner: "The client side isn't showing snowballs bursting upon hitting props
 * but is successfully mitigating damage server side."
 *
 * v2.3.2652 made props cover and v2.3.2657 made a snowball stop at one.  Both
 * shipped with the geometry tested and the flight NOT -- mp-zonedecor asks
 * __btAttackBlocked about whole lines, and the suite asked the slab test about
 * whole lines, and whole lines were never the problem.  The simulator asked
 * about each frame's STEP, with a function whose endpoint rule skips any box
 * an end is inside, so every step through a rock was skipped and nothing that
 * flies was ever stopped (worldProps.js, sweepBlockPoint).  The owner saw it
 * in one look.  No test did, because no test watched anything fly.
 *
 * So this one watches.  Everything below runs the REAL client code on a real
 * frame clock in a real zone:
 *
 *   SNOWBALLS go in through window.__btDispatch -- processGameEvent's own
 *   monster_projectile case, the one a worker message reaches -- carrying the
 *   same four numbers the worker sends (release point, aim point).  Then every
 *   frame reads both the simulated ball and the SPRITE the renderer drew for
 *   it (__btSlimeProj), because the reported bug was about what is SEEN.
 *
 *   ARROWS go into S.arrows the way mp-hitsweep fires them, then fly under
 *   updateProjectiles.  Every monster in the zone is pre-seeded into the
 *   arrow's hitIds, so a snowman wandering into the lane cannot end the flight
 *   early and pass the test for the wrong reason.
 *
 * Each has a CONTROL on a line the client itself reports clear, because "the
 * ball ended early" is also what a broken simulator does.
 */
import * as H from './harness.mjs';

const PHONE = { width: 390, height: 844 };

/* The frost rock ridge: x 430, y 570, blockW 202, blockD 42
   -> box x 329..531, y 528..570 (worldProps.js). */
const RIDGE = { x0: 329, x1: 531, y0: 528, y1: 570 };
/* South of the ridge, and east of the 300.5..419.5 box beside it by more than
   the player's 10px collision pad. */
const STAND = { x: 440, y: 668 };

/* Throw one display-only snowball through the real event path and follow it,
   plus the sprite drawn for it, until it is gone. */
const throwBall = (P, b) => P.page.evaluate((b) => new Promise((resolve) => {
  const S = window._gameState.current;
  /* Record every burst queued while this ball is alive.  The renderer drains
     S.snowballBursts every frame (length = 0, same array), so a wrapped push
     is the only place a burst can be seen before it is consumed. */
  if (!S.snowballBursts) S.snowballBursts = [];
  const q = S.snowballBursts;
  window.__qaBursts = [];
  if (!q.__qaWrapped) {
    const orig = q.push;
    q.push = function (e) { try { window.__qaBursts.push({ x: e.x, y: e.y }); } catch (_) {} return orig.apply(this, arguments); };
    q.__qaWrapped = true;
  }
  const t0 = performance.now();
  window.__btDispatch({ type: 'monster_projectile', payload: {
    monsterId: b.id, kind: 'snowball', zone: S.currentZone,
    x: b.x, y: b.y, tx: b.tx, ty: b.ty, travelMs: b.ms } });
  const proj = (S.slimeProjectiles || []).find((p) => p.ownerId === b.id);
  if (!proj) return resolve({ error: 'no ball spawned' });
  const spawn = { life: proj.life, propStopT: proj.propStopT };
  const track = []; const drawn = [];
  const tick = () => {
    const alive = (S.slimeProjectiles || []).indexOf(proj) >= 0;
    if (alive) track.push([proj.x, proj.y]);
    for (const e of ((window.__btSlimeProj && window.__btSlimeProj()) || [])) {
      if (e.ownerId === b.id && e.visible) drawn.push([e.x, e.y]);
    }
    if (!alive || performance.now() - t0 > b.ms + 2000) {
      resolve({ spawn, track, drawn, alive, bursts: window.__qaBursts.slice(),
        ms: Math.round(performance.now() - t0) });
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}), b);

/* Fire one real arrow from where the player stands and follow it.

   THE LAUNCH POINT IS PRE-FROZEN (_pathX/_pathY), and that is what makes the
   direction the one fired.  On a bow arrow's first flying frame projectiles.js
   freezes the launch point AND re-resolves the angle from the auto-target lock
   (lockPt) or free aim -- the line "the shot was actually taken along".  So an
   injected arrow with ang = north gets turned toward whichever snowman the
   player is locked onto.  The first two runs of this scenario did exactly that:
   BOTH arrows, "north" and "clear", were re-aimed at the same snowman and
   planted on the same box face in between (419.5, 685.8) -- correct behaviour
   for the game, and a test aiming at the wrong thing.  An earlier note here
   blamed the player drifting 40px; the track showed the player never moved.
   Stamping _pathX skips that release-frame re-aim, so everything after it --
   the flight, the prop sweep, the plant -- is the real code on a known line. */
const fireArrow = (P, o) => P.page.evaluate((o) => new Promise((resolve) => {
  const S = window._gameState.current;
  /* The direction can be chosen HERE, from the real position at fire time:
     o.pick lists candidates and the first with o.clearPx of clear ice wins. */
  let ang = o.ang;
  if (o.pick) {
    ang = null;
    for (const c of o.pick) {
      const tx = S.player.x + Math.cos(c) * o.clearPx, ty = S.player.y + Math.sin(c) * o.clearPx;
      if (!window.__btAttackBlocked(S.currentZone, S.player.x, S.player.y, tx, ty)) { ang = c; break; }
    }
    if (ang === null) return resolve({ error: 'no clear direction from ' + S.player.x + ',' + S.player.y });
  }
  const a = {
    ang, dist: 0, fromGrip: false, dmg: 1,
    life: 400, maxLife: 400,
    hitIds: new Set((S.monsters || []).map((m) => m.id)),   /* no monster can end it */
    isStaff: false, speedPx: o.speed,
    _bornTs: Date.now() - 500, _released: true, _qaId: 'qa-' + o.tag,
    _pathX: S.player.x, _pathY: S.player.y,   /* fromGrip:false -> no grip offset */
  };
  S.arrows = (S.arrows || []).filter((x) => x._qaId == null);
  S.arrows.push(a);
  const start = { x: S.player.x, y: S.player.y };
  const track = []; let n = 0;
  const onFace = (x, y) => {
    for (const b of (window.__btBlockers(S.currentZone) || [])) {
      const inX = x >= b.x0 - 0.5 && x <= b.x1 + 0.5, inY = y >= b.y0 - 0.5 && y <= b.y1 + 0.5;
      if (inX && inY && (Math.abs(x - b.x0) < 0.5 || Math.abs(x - b.x1) < 0.5 || Math.abs(y - b.y0) < 0.5 || Math.abs(y - b.y1) < 0.5)) {
        return [b.x0, b.y0, b.x1, b.y1];
      }
    }
    return null;
  };
  const tick = () => {
    if (a._renderX != null) track.push([a._renderX, a._renderY, a._pathX, a._pathY, a.ang]);
    const alive = (S.arrows || []).indexOf(a) >= 0;
    if (a.planting || !alive || ++n >= o.frames) {
      const plant = a.planting ? [a._plantX, a._plantStartY] : null;
      resolve({ ang, angEnd: a.ang, start, track, planting: !!a.planting, plant, alive,
        plantOnBlocker: plant ? onFace(plant[0], plant[1]) : null,
        dtScale: +(S._dtScale || 1).toFixed(2) });
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}), o);

/* The largest distance the thing actually moved in one frame.  Under a slow
   headless clock the simulator's dt scale sits at its 3x clamp and a step is
   three times a 60fps one, and every "within one step" tolerance below is
   measured from the track rather than assumed -- the first run of this assumed
   1x and failed a control ball that was 13.9px (exactly one 3x step) short. */
const maxStep = (track) => {
  let m = 0;
  for (let i = 1; i < track.length; i++) {
    m = Math.max(m, Math.hypot(track[i][0] - track[i - 1][0], track[i][1] - track[i - 1][1]));
  }
  return m;
};

export async function run({ browser, wsPort, webPort, rec }) {
  const P = await H.newPlayer(browser, { name: 'Shots', wsPort, webPort, viewport: PHONE, touch: true });
  await H.enterWorld(P);
  await P.page.waitForTimeout(2500);

  /* ── setup: open every zone, warp to frost, stand south of the ridge ── */
  const seeded = await H.warpToZone(P, { wsPort, label: 'Frost Ridge', zoneId: 'frost' });
  rec.ok('setup: every zone is open on the worker',
    seeded.ok && seeded.zones && Object.values(seeded.zones).every(Boolean), seeded.zones);
  await H.hopTo(P, STAND.x, STAND.y);
  await P.page.waitForTimeout(800);
  const me = await H.readState(P, (S) => ({ x: S.player.x, y: S.player.y }));
  rec.ok('setup: standing south of the rock ridge',
    Math.abs(me.x - STAND.x) < 12 && Math.abs(me.y - STAND.y) < 12, me);
  const probes = await P.page.evaluate(() => ({
    sweep: typeof window.__btSweepBlockPoint === 'function',
    dispatch: typeof window.__btDispatch === 'function',
    ridge: window.__btAttackBlocked('frost', 440, 460, 440, 668),
  }));
  rec.ok('setup: the probes this scenario reads exist, and the client calls the test line blocked',
    probes.sweep && probes.dispatch && probes.ridge === true, probes);

  /* ── 1. A SNOWBALL THROWN THROUGH THE RIDGE BURSTS ON IT ──
     Released north of the ridge, aimed at the player south of it: the worker
     refuses this ball's damage (props.test.mjs section 4), so the client must
     show it stopping.  No monster owns id 'qa-sb-*', so there is no hand
     offset and the ball launches exactly from the release point. */
  const thr = await throwBall(P, { id: 'qa-sb-through', x: 440, y: 460, tx: STAND.x, ty: STAND.y, ms: 900 });
  rec.ok('snowball: the real event path spawned the ball', !thr.error, thr);
  if (!thr.error) {
    const maxY = Math.max(...thr.track.map((p) => p[1]));
    const maxDrawnY = thr.drawn.length ? Math.max(...thr.drawn.map((p) => p[1])) : null;
    const b = thr.bursts[thr.bursts.length - 1];
    rec.ok('snowball: the spawn asked the worker\'s question and got "a prop is in the way"',
      typeof thr.spawn.propStopT === 'number' && thr.spawn.propStopT > 0 && thr.spawn.propStopT < 1, thr.spawn);
    rec.ok('snowball: the simulated ball never crossed the ridge\'s near face',
      maxY <= RIDGE.y0 + 0.5, { maxY, face: RIDGE.y0 });
    rec.ok('snowball: ...and neither did the ball the renderer DREW (the reported bug)',
      thr.drawn.length > 0 && maxDrawnY <= RIDGE.y0 + 1, { maxDrawnY, samples: thr.drawn.length });
    const st = maxStep(thr.track);
    rec.ok('snowball: it BURST, on the rock face (within one frame\'s step of it), rather than vanishing',
      !!b && Math.abs(b.x - 440) < 2 && b.y <= RIDGE.y0 + 1 && b.y >= RIDGE.y0 - st - 0.5,
      { burst: b, step: +st.toFixed(1), bursts: thr.bursts });
  }

  /* ── 2. CONTROL: ONE THAT NOTHING IS IN THE WAY OF FLIES ITS WHOLE LINE ──
     Without this, a simulator that ended every ball early would pass 1. */
  const ctlLine = { x: 150, y: 150, tx: 150, ty: 400 };
  const ctlClear = await P.page.evaluate((l) => !window.__btAttackBlocked('frost', l.x, l.y, l.tx, l.ty), ctlLine);
  rec.ok('control: the client itself calls the control line clear (guard)', ctlClear, ctlLine);
  const clr = await throwBall(P, { id: 'qa-sb-clear', ...ctlLine, ms: 900 });
  rec.ok('control: that ball spawned too', !clr.error, clr);
  if (!clr.error) {
    const maxY = Math.max(...clr.track.map((p) => p[1]));
    const b = clr.bursts[clr.bursts.length - 1];
    rec.ok('control: nothing claimed a prop was in its way', clr.spawn.propStopT === null, clr.spawn);
    const st = maxStep(clr.track);
    rec.ok('control: it flew to within one frame\'s step of its aim point', maxY >= ctlLine.ty - st - 0.5,
      { maxY, aim: ctlLine.ty, step: +st.toFixed(1) });
    rec.ok('control: and burst THERE, which proves the burst above was the rock and not the end of a flight',
      !!b && b.y >= ctlLine.ty - st - 0.5, { burst: b, step: +st.toFixed(1) });
  }

  /* ── 3. THE PLAYER'S OWN ARROW STOPS AT THE RIDGE ──
     Fired north from south of it.  This half never worked: the client alone
     decides a ranged hit, so an arrow that flew through the rock also hit
     whatever stood behind it. */
  const up = await fireArrow(P, { tag: 'north', ang: -Math.PI / 2, speed: 20, frames: 120 });
  const minY = up.track.length ? Math.min(...up.track.map((p) => p[1])) : null;
  rec.ok('arrow: fired from under the ridge (guard: the player is within its x extent)',
    up.start.x > RIDGE.x0 + 12 && up.start.x < RIDGE.x1 - 12 && up.start.y > RIDGE.y1, { start: up.start });
  /* The angle it planted with is the planting spin; the one it FLEW with is the
     last one recorded before planting started. */
  const flewAng = (up.track.find((t) => t[1] < up.start.y) || [])[4];
  rec.ok('arrow: it flew the line it was fired on (guard: no re-aim at a lock)',
    typeof flewAng === 'number' && Math.abs(flewAng - (-Math.PI / 2)) < 1e-6, { flewAng });
  rec.ok('arrow: fired north at the ridge, it PLANTED', up.planting,
    { planting: up.planting, plant: up.plant, n: up.track.length, dtScale: up.dtScale });
  rec.ok('arrow: ...on the ridge\'s south face, straight above where the player stood',
    !!up.plant && Math.abs(up.plant[1] - RIDGE.y1) < 1 && Math.abs(up.plant[0] - up.start.x) < 1
      && up.plant[0] > RIDGE.x0 && up.plant[0] < RIDGE.x1,
    { plant: up.plant, face: RIDGE.y1, launchX: up.start.x, onBlocker: up.plantOnBlocker });
  rec.ok('arrow: ...and was never drawn inside or past it', minY !== null && minY >= RIDGE.y1 - 0.5, { minY });

  /* ── 4. CONTROL: AN ARROW WITH NOTHING IN FRONT OF IT IS NOT STOPPED BY A PROP ──
     Direction chosen in the page from the REAL position, the first with 260px of
     clear ice.  It may still plant -- at its range limit or the screen edge,
     which is its ordinary end -- so the assertion is about WHERE: not on any
     prop, and well past where a prop in the way would have stopped it. */
  const fr = await fireArrow(P, { tag: 'clear', pick: [Math.PI / 2, Math.PI / 4, (3 * Math.PI) / 4, 0, Math.PI], clearPx: 260, speed: 20, frames: 120 });
  rec.ok('control: there is a direction with 260px of clear ice (guard)', !fr.error, fr.error ? fr : { ang: fr.ang, start: fr.start });
  if (!fr.error) {
    const end = fr.plant || (fr.track.length ? fr.track[fr.track.length - 1] : [fr.start.x, fr.start.y]);
    const far = Math.hypot(end[0] - fr.start.x, end[1] - fr.start.y);
    rec.ok('control: that arrow was not stopped by a prop', !fr.plantOnBlocker,
      { plant: fr.plant, onBlocker: fr.plantOnBlocker });
    rec.ok('control: ...and flew well past the distance a prop would have ended it', far > 150,
      { far: +far.toFixed(1), planting: fr.planting, dtScale: fr.dtScale });
  }
}
