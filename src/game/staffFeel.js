/* ═══ v2.3.4803: THE STAFF'S FEEL -- gathering power and blasting the orb ═══
 *
 * The owner, 2026-11-11: "Think about the sword swing.  The bow pull back and
 * release.  The staff building power and blasting the orb."  Approving the
 * design: "build all of them (sword, bow, magic)", and of magic's timing
 * window: "For magic I think it should be skipped for now".  The approved
 * brief (docs/specs/staff-feel.md):
 *   - THUMB DOWN STARTS GATHERING: a spark at the staff's tip, specks of light
 *     pulled inward (the crystal's charge: rendering/staffCastFx.js reads
 *     S._stf.view), the bro plants his feet and slows (staffFeelMoveK), a
 *     low hum begins (the kit's build tone, an octave lower);
 *   - THE ORB GROWS IN THREE CLEAR STAGES, spark -> orb -> sphere, each
 *     landing with a pulse and a deeper note (the kit's `stage` sound,
 *     feelStageCrossed) -- at the WORKER's thresholds (drawGather.js
 *     gatherStage: the orb at 0.4 of a full gather, the sphere at 0.8);
 *   - DRAG WHILE GATHERING TO AIM: the orb leans toward where it will go
 *     (rendering/systems/staffFeelFx.js);
 *   - LIFT TO BLAST: the sound swells inward a split second, then a boom
 *     (weaponFeelSound.js `blast`); a big orb pushes the bro back a step (a
 *     LOOK only: his place is never moved, staffFeelFx.js), flies heavy and
 *     slow; on impact a ring of force (the WORKER's shove, monsters only:
 *     server/src/drawgather.js _dgRing -- here only its picture and sound);
 *   - QUICK TAPS FIRE SMALL FAST SPARKS;
 *   - NO TIMING WINDOW (the owner): the skill is when to commit;
 *   - the staff's special stays its button (the Special button, unchanged).
 *
 * THE WIRE (drawGather.js has it whole): the bolt's `player_projectile` relay
 * carries `ga`, the gather in whole ms from the thumb down to the lift, with
 * `isStaff: true`; its claims name the shot (`sw: ts`) on monster_damage and
 * on the duel's player_attack; the worker bounds the claim by its own clock
 * (its time since your last bolt or arrow plus 100 ms, lent) and lands the
 * bolt's SHARE of a full gather, its stage setting its splash and ring.  So
 * the best damage a second is today's (a full gather each 900 ms is today's
 * held staff); quick sparks share it out, never add to it.  The worker's
 * `gs` (stage) and `pw` (share) come back on monster_hit (staffFeelHit).
 *
 * ON ONLY WHERE IT MEANS SOMETHING: the game's own combat (manualFreeSwing:
 * the default; `?manual=0/1/2` keep the held staff exactly), a staff in hand,
 * a worker advertising `caps.staffGather` (its `staffgather: false` takes it
 * back from every phone: the held staff), and `?stafffeel` not 0 (this phone's
 * off-ramp, remembered: the held staff).  Off, every line it touches is the
 * line before it.
 *
 * WHERE IT IS CALLED (no imports but the pure rules, so node tests it:
 * server/test/staff-feel.test.mjs):
 *   BroTown.jsx      the presses (rS, bS, the left mouse button):
 *                    staffGatherStart; the disc's drag: staffGatherAim; the
 *                    lifts (rE, bE, mouse up): staffGatherEnd; a tap another
 *                    job took (a resource, a townsperson, a door, the chat
 *                    circle): staffFireCancel; any other end of a press
 *                    (handleRBtnRelease): staffGatherAbort; the game loop:
 *                    staffFeelFrame(S, now, BT_AUDIO) once a frame after the
 *                    combat step; the walk: x staffFeelMoveK(S).
 *   monsterCombat.js the loop fires only a lift's bolt (staffFireWaiting),
 *                    no sooner than GAP_MS after the last (the worker's
 *                    MIN_GAP_MS and the network's wobble), and the bolt it
 *                    makes takes the shot (staffFireTake: `ga`, its speed,
 *                    size and reach); staffFeelCycle tells the full gather.
 *   projectiles.js   the bolt lands: staffFeelImpact (the ring's picture).
 *   gameEvents.js    your bolt's monster_hit: staffFeelHit (`gs`, `pw`);
 *                    another's bolt: staffPeerK (its size, from its `ga`).
 *
 * NOTHING HERE ROLLS DAMAGE.  The worker rolls every hit (CLAUDE.md §5).
 *
 * QA: window.__btStaffFeel() (below). */
import { feelStageCrossed, feelSwitch, pushFeelFx } from './weaponFeel.js';
import { DRAW_GATHER, STAGE, fullGatherMs, buildShare, gatherStage, buildWire } from './drawGather.js';
import { MANUAL, manualFreeSwing } from './manualCombat.js';

export const STAFF_FEEL = Object.freeze({
  /* the phone's gap between two bolts: the worker counts one at most every
     DRAW_GATHER.MIN_GAP_MS (100: a sooner one lands nothing), and the 50 ms
     between is the network's wobble -- the sword's FREE_GAP_MS */
  GAP_MS: DRAW_GATHER.MIN_GAP_MS + 50,
  /* a lift's bolt the loop could not take (dazed, in the air, the shield up,
     too soon) is let go after this, as a flicked arrow is */
  FIRE_HOLD_MS: MANUAL.FIRE_HOLD_MS,
  /* MIRROR of server/src/drawgather.js DRAW_GATHER.SLACK_MS: the worker counts
     a gather at most its time since your last shot plus this, so the phone
     draws the stage the worker will judge (the kit's feelClaimMs default is
     150: the worker's number is the truth) */
  CLAIM_ALLOW_MS: 100,
  /* the full gather before the loop has said (a new character's: 600 + 300) */
  FULL_DEFAULT_MS: fullGatherMs(600),
  /* the bro plants his feet: his walk while gathering, x this */
  MOVE_K: 0.55,
  /* the bolt, by stage (spark, orb, sphere): its speed (x the staff's own 5 px
     a tick: a spark quick, a sphere heavy and slow), its size drawn (x the
     painted bolt's), and its reach kept (its life x the inverse of its speed) */
  BOLT_PX: 5,
  SPEED_K: Object.freeze([1.5, 1, 0.7]),
  SIZE_K: Object.freeze([0.6, 1, 1.45]),
  /* the gathering orb at the staff's tip, px (radius), by stage, and how far
     it leans toward the aim */
  ORB_PX: Object.freeze([4, 8, 13]),
  LEAN_PX: Object.freeze([2, 4, 7]),
  /* the push back a step on the blast (a LOOK: the body drawn back, never
     moved), px by stage, over RECOIL_MS */
  RECOIL_PX: Object.freeze([0, 3, 7]),
  RECOIL_MS: 260,
  /* the ring of force's picture, px: the worker's splash reach (its
     STAFF_SPLASH.RADIUS_PX, 60, x DRAW_GATHER.SPLASH_K by stage) and its
     shove (DRAW_GATHER.RING_PX) -- the look only, the worker moves them */
  SPLASH_PX: 60,
  /* the camera's push at the impact, px by stage (the kit's contact push) */
  PUSH_PX: Object.freeze([0, 2, 5]),
  /* the hum: the kit's build tone an octave and a bit lower */
  HUM_BASE: 130,
  /* a drag this far from where the thumb went down aims (the stick's dead zone) */
  AIM_DEAD_PX: 8,
  /* another player's bolt: its size from its `ga` on a new character's full
     gather (their full is not on the wire; the look only) */
  PEER_FULL_MS: fullGatherMs(600),
  KEY: 'bt_stafffeel',
});

/* the staff's lavender (staffCastFx RAMPS.none) for the pulses */
const LAV = 0xd8c8ff;

let _wanted = null;
let _audio = null;
/** `?stafffeel=0` turns it off on this phone (remembered), `?stafffeel=1`
 *  back.  `search` and `store` are for tests. */
export function staffFeelWanted(search, store) { return feelSwitch('stafffeel', STAFF_FEEL.KEY, search, store); }
/** QA and the tests: on or off for this page (null: the address's). */
export function setStaffFeel(v) { _wanted = v == null ? null : !!v; }

/** Is the staff's feel on for this hand now? */
export function staffFeelOn(S) {
  if (_wanted === null) _wanted = staffFeelWanted();
  return !!(_wanted && S && S.rpg && S.rpg.activeSlot === 'staff' && S.rpg.staffWeapon
    && manualFreeSwing() && S._serverCaps && S._serverCaps.staffGather);
}

function st(S) {
  if (!S._stf) {
    S._stf = { g: null, fire: null, view: null, recoil: null, full: STAFF_FEEL.FULL_DEFAULT_MS, lastShot: null, lastHit: null, lastImpact: null,
      stats: { gathers: 0, ends: 0, shots: [0, 0, 0], stages: [0, 0, 0], cancels: 0, aborts: 0, lost: 0, hits: 0, impacts: 0, aims: 0 },
      cost: { max: 0, sum: 0, n: 0 } };
  }
  return S._stf;
}
const _perf = (typeof performance !== 'undefined' && performance.now) ? () => performance.now() : () => Date.now();
function cost(f, t0) { const ms = _perf() - t0; f.cost.n++; f.cost.sum += ms; if (ms > f.cost.max) f.cost.max = ms; }
function play(kind, k, opts) {
  try { return _audio && _audio.feelSound ? _audio.feelSound(kind, k, opts) : null; } catch (e) { return null; }
}
/* the crystal, where entityRenderer last placed it (fresh), else the bro */
function tipOf(S, now) {
  if (S._staffTipAt && now - S._staffTipAt < 250 && isFinite(S._staffTipX)) return { x: S._staffTipX, y: S._staffTipY };
  const P = S.player;
  return P ? { x: P.x, y: P.y - 20 } : null;
}
function facingAng(S) {
  if (typeof S._facingAngle === 'number' && isFinite(S._facingAngle)) return S._facingAngle;
  const fd = S._facing || 'down';
  return fd === 'right' ? 0 : fd === 'up' ? -Math.PI / 2 : fd === 'left' ? Math.PI : Math.PI / 2;
}
/** The way the gathered bolt will go: the thumb steering now, else the aim
 *  last set, else the facing (combatHelpers rangedAimAngle's ladder, without
 *  a lock: manual combat keeps none for a staff). */
export function staffAimAngle(S) {
  if (!S) return 0;
  if (S._aiming && typeof S._aimAngle === 'number' && isFinite(S._aimAngle)) return S._aimAngle;
  if (typeof S._lastAimAngle === 'number' && isFinite(S._lastAimAngle)) return S._lastAimAngle;
  return facingAng(S);
}

/** The loop says, each frame a staff is in hand, the held staff's interval
 *  (monsterCombat effectiveSwingCd, before its +300): the full gather. */
export function staffFeelCycle(S, heldStaffMs) {
  if (!S || !(heldStaffMs > 0)) return;
  st(S).full = fullGatherMs(heldStaffMs);
}

/** A gather's numbers at `now`: the bounded claim (the worker's way: never
 *  more than the time since your last bolt or arrow plus CLAIM_ALLOW_MS),
 *  its share of a full gather and its stage. */
export function staffGatherNow(S, now) {
  const f = S && S._stf, g = f && f.g;
  if (!g) return null;
  const held = Math.max(0, now - g.at);
  const last = (S && S.swingTimer) || 0;
  const claim = last > 0 ? Math.min(held, Math.max(0, now - last) + STAFF_FEEL.CLAIM_ALLOW_MS) : held;
  const share = buildShare(claim, f.full);
  return { held, claim, share, stage: gatherStage(share) };
}
/* the kit's stage readiness for a stage: spark 1/3, orb 2/3, sphere 1 --
   so feelStageCrossed (floor(r x 3)) lands on the worker's thresholds */
function stageR(stage) { return stage < 0 ? 0 : (stage + 1) / 3; }

/** THE THUMB GOES DOWN (or the left mouse button): the gather begins, at
 *  once -- the spark at the tip, its note, the hum.  (x, y) where it touched
 *  (null on a computer: the cursor aims).  False when the feel is not on. */
export function staffGatherStart(S, now, x, y) {
  if (!staffFeelOn(S)) return false;
  const f = st(S);
  if (f.g) return true;   /* one press at a time: the stick's and the disc's never both */
  const t0 = _perf();
  f.g = { at: now, x0: typeof x === 'number' ? x : null, y0: typeof y === 'number' ? y : null, stage: -1, share: 0, aimed: false, hum: null };
  f.stats.gathers++;
  tickGather(S, f, now);
  cost(f, t0);
  return true;
}

/** THE DISC'S DRAG while gathering (the disc does not aim by itself: BroTown
 *  bM): the way from where the thumb went down, past the stick's dead zone,
 *  written as the stick's own drag writes it (rJoyAim). */
export function staffGatherAim(S, dx, dy) {
  const f = S && S._stf, g = f && f.g;
  if (!g || !(dx * dx + dy * dy > STAFF_FEEL.AIM_DEAD_PX * STAFF_FEEL.AIM_DEAD_PX)) return false;
  const a = Math.atan2(dy, dx);
  S._aimAngle = a; S._lastAimAngle = a;
  S._facing = Math.abs(Math.cos(a)) > Math.abs(Math.sin(a)) ? (Math.cos(a) > 0 ? 'right' : 'left') : (Math.sin(a) > 0 ? 'down' : 'up');
  S._aiming = true; S._aimSrc = 'stick';
  g.aimed = true;
  f.stats.aims++;
  return true;
}

/** THE LIFT: the blast is asked for -- the loop takes it on its next frame
 *  (staffFireWaiting / staffFireTake).  `aimAng` a computer's cursor (null on
 *  a phone: the drag's aim, or the facing for a still press).  The shot it
 *  asks for, or null (no gather). */
export function staffGatherEnd(S, now, aimAng) {
  const f = S && S._stf, g = f && f.g;
  if (!g) return null;
  const t0 = _perf();
  const n = staffGatherNow(S, now);
  stopHum(g);
  f.g = null;
  /* the aim: the cursor; a drag's (rJoyAim / staffGatherAim wrote it); a
     still press goes the way you face, as a tap's attack did */
  let ang;
  if (typeof aimAng === 'number' && isFinite(aimAng)) ang = aimAng;
  else if (g.aimed || (S._aiming && S._aimSrc === 'stick')) ang = staffAimAngle(S);
  else ang = facingAng(S);
  S._aimAngle = ang; S._lastAimAngle = ang;
  f.fire = { at: now, until: now + STAFF_FEEL.FIRE_HOLD_MS, ga: buildWire(n.held), share: n.share, stage: n.stage, ang };
  f.stats.ends++;
  cost(f, t0);
  return f.fire;
}

/** A press that ended some other way (the button gone from under it, a slide
 *  on to the shield, the weapon changed, the page hidden): nothing fires. */
export function staffGatherAbort(S) {
  const f = S && S._stf;
  if (!f || !f.g) return false;
  stopHum(f.g);
  f.g = null;
  f.stats.aborts++;
  return true;
}
/** A lift whose tap another job took (a resource, a townsperson, a door,
 *  the chat circle): its bolt is not made. */
export function staffFireCancel(S) {
  const f = S && S._stf;
  if (!f || !f.fire) return false;
  f.fire = null;
  f.stats.cancels++;
  return true;
}

/** Is a lift's bolt waiting for the loop?  null when the staff's feel is off
 *  (the loop's own held staff then), else true / false. */
export function staffFireWaiting(S, now) {
  if (!staffFeelOn(S)) return null;
  const f = S._stf;
  return !!(f && f.fire && now <= f.fire.until);
}

/** The loop makes the bolt (its angle `ang`): the shot it carries --
 *  { ga, share, stage, speedPx, sizeK, lifeK } -- and its release: the
 *  swell and boom (or a spark's snap), the flash along its way, and the push
 *  back a step for an orb or a sphere.  Once only; null if none waits. */
export function staffFireTake(S, now, ang) {
  const f = S && S._stf, fi = f && f.fire;
  if (!fi) return null;
  f.fire = null;
  const t0 = _perf();
  const sg = fi.stage;
  const sp = STAFF_FEEL.BOLT_PX * STAFF_FEEL.SPEED_K[sg];
  const shot = { ga: fi.ga, share: fi.share, stage: sg, speedPx: sp, sizeK: STAFF_FEEL.SIZE_K[sg], lifeK: STAFF_FEEL.BOLT_PX / sp, at: now };
  f.lastShot = { at: now, ga: shot.ga, share: +shot.share.toFixed(3), stage: sg, speedPx: sp, sizeK: shot.sizeK };
  f.stats.shots[sg]++;
  const a = typeof ang === 'number' && isFinite(ang) ? ang : fi.ang;
  if (sg === STAGE.SPARK) play('release', 0.25 + 0.6 * shot.share, { vol: 0.7 });
  else play('blast', sg === STAGE.SPHERE ? 1.1 : 0.6, { vol: 0.9 });
  const tip = tipOf(S, now);
  if (tip) pushFeelFx(S, { kind: 'streak', at: now, x: tip.x, y: tip.y, ang: a, len: 24 + 46 * shot.share, k: 0.5 + 0.7 * shot.share, color: sg === STAGE.SPHERE ? 0xfff0ff : LAV });
  if (STAFF_FEEL.RECOIL_PX[sg] > 0) f.recoil = { at: now, ang: a, px: STAFF_FEEL.RECOIL_PX[sg] };
  cost(f, t0);
  return shot;
}
/** The shot a bolt's hit claims name (`sw` on monster_damage and the duel's
 *  player_attack): a GATHERED bolt's stamp (its relay carried `ga`), against
 *  a worker with caps.staffGather; undefined for anything else (a held bolt,
 *  a special: today's claim, exactly). */
export function staffSw(S, a) {
  return (a && a.isStaff && !a.isSpecial && typeof a._gs === 'number' && typeof a._shotTs === 'number'
    && S && S._serverCaps && S._serverCaps.staffGather) ? a._shotTs : undefined;
}
/** A bolt's life (its reach) kept at the speed its stage flies (null: as it was). */
export function staffShotLife(life, shot) { return shot ? Math.round(life * shot.lifeK) : life; }

/** The bolt lands at (x, y) (projectiles.js, where the crash is drawn): the
 *  ring of force's picture -- the worker's splash reach, swelling out -- the
 *  contact's sound sized by the stage, and the camera's push its way.  Only a
 *  gathered bolt (`a._gs`). */
export function staffFeelImpact(S, a, x, y) {
  if (!S || !a || typeof a._gs !== 'number' || !isFinite(x) || !isFinite(y)) return false;
  const f = st(S);
  const t0 = _perf();
  const now = Date.now();
  const sg = a._gs;
  const reach = STAFF_FEEL.SPLASH_PX * (DRAW_GATHER.SPLASH_K[sg] || 0);
  /* the kit's ring (weaponFeelFx 'pulse') swells to ~45 px x k */
  if (reach > 0) {
    pushFeelFx(S, { kind: 'pulse', at: now, x, y, k: (reach + (DRAW_GATHER.RING_PX[sg] || 0)) / 45, color: sg === STAGE.SPHERE ? 0xfff0ff : LAV });
    if (sg === STAGE.SPHERE) pushFeelFx(S, { kind: 'pulse', at: now + 70, x, y, k: reach / 45, color: 0xffffff });
  }
  pushFeelFx(S, { kind: 'burst', at: now, x, y, ang: a.ang || 0, k: 0.45 + 0.3 * sg, color: LAV });
  play('contact', [0.35, 0.8, 1.15][sg], { vol: [0.5, 0.75, 0.95][sg] });
  const push = STAFF_FEEL.PUSH_PX[sg];
  if (push > 0 && typeof a.ang === 'number') S._camPunch = { dx: Math.cos(a.ang) * push, dy: Math.sin(a.ang) * push, ts: now };
  f.stats.impacts++;
  f.lastImpact = { at: now, stage: sg, reach, x: Math.round(x), y: Math.round(y) };
  cost(f, t0);
  return true;
}

/** Your bolt's monster_hit (gameEvents.js): the worker's verdict -- `gs` its
 *  stage, `pw` its share -- kept for the look and QA. */
export function staffFeelHit(S, payload) {
  if (!S || !payload || payload.slot !== 'staff' || payload.splash || payload.spark) return;
  if (typeof payload.gs !== 'number' && typeof payload.pw !== 'number') return;
  const f = st(S);
  f.stats.hits++;
  f.lastHit = { at: Date.now(), gs: typeof payload.gs === 'number' ? payload.gs : null, pw: typeof payload.pw === 'number' ? payload.pw : null,
    dmg: payload.dmg != null ? payload.dmg : null, id: payload.monsterId != null ? String(payload.monsterId) : null };
}

/** Another player's bolt (gameEvents.js player_projectile): its drawn size
 *  from the gather the worker counted (`ga` on the relayed copy), or
 *  undefined (a held bolt, a special: drawn as ever). */
export function staffPeerK(payload) {
  if (!payload || payload.isStaff !== true || payload.isSpecial) return undefined;
  const ga = Number(payload.ga);
  if (!isFinite(ga) || ga < 0) return undefined;
  return STAFF_FEEL.SIZE_K[gatherStage(buildShare(Math.min(ga, DRAW_GATHER.CLAIM_MAX_MS), STAFF_FEEL.PEER_FULL_MS))];
}

/** The walk while gathering: the bro plants his feet (1 otherwise). */
export function staffFeelMoveK(S) { return S && S._stf && S._stf.g ? STAFF_FEEL.MOVE_K : 1; }

function stopHum(g) { if (g && g.hum) { try { g.hum.stop(); } catch (e) { /* sound only */ } g.hum = null; } }

/* one step of the gather: its stage (a crossing lands a pulse and a deeper
   note), the hum's pitch, the view the renderer draws */
function tickGather(S, f, now) {
  const g = f.g;
  const n = staffGatherNow(S, now);
  if (S._aiming && S._aimSrc === 'stick') g.aimed = true;   /* the stick's drag aimed this gather (rJoyAim) */
  const k = feelStageCrossed(stageR(g.stage), stageR(n.stage), 3);
  if (k > 0) {
    f.stats.stages[k - 1]++;
    play('stage', 1, { stage: k, vol: k === 1 ? 0.55 : 0.9 });
    const tip = tipOf(S, now);
    if (tip) pushFeelFx(S, { kind: 'pulse', at: now, x: tip.x, y: tip.y, k: 0.25 + 0.2 * k, color: k === 3 ? 0xffffff : LAV });
    if (f.view) { f.view.popAt = now; f.view.popStage = k - 1; }
    else f._pop = { at: now, stage: k - 1 };
  }
  g.stage = n.stage; g.share = n.share;
  if (!g.hum) g.hum = play('build', 0, { base: STAFF_FEEL.HUM_BASE, vol: 0.9 });
  if (g.hum) { try { g.hum.set(n.share); } catch (e) { /* sound only */ } }
  writeView(S, f, now, n);
}

function writeView(S, f, now, n) {
  const v = f.view || (f.view = { gathering: false, r: 0, stage: -1, aim: 0, popAt: 0, popStage: -1, at: 0 });
  if (f._pop) { v.popAt = f._pop.at; v.popStage = f._pop.stage; f._pop = null; }
  v.gathering = !!n;
  v.r = n ? n.share : 0;
  v.stage = n ? n.stage : -1;
  v.aim = staffAimAngle(S);
  v.at = now;
}

/** Once a frame, after the combat step (BroTown's game loop).  `audio` is
 *  BT_AUDIO (kept: the presses and the loop's calls play through it). */
export function staffFeelFrame(S, now, audio) {
  if (audio) _audio = audio;
  if (!S) return;
  const f = S._stf;
  if (!staffFeelOn(S)) {
    if (f) { if (f.g) staffGatherAbort(S); f.fire = null; f.view = null; f.recoil = null; }
    return;
  }
  const t0 = _perf();
  const s = st(S);
  if (s.fire && now > s.fire.until) { s.fire = null; s.stats.lost++; }
  /* a gather the page cannot finish: hidden (its lift may never come), or
     the bro down */
  let hidden = false;
  try { hidden = typeof document !== 'undefined' && document.hidden === true; } catch (e) { hidden = false; }
  if (s.g && (hidden || S._dying || (S.rpg && S.rpg.hp <= 0))) staffGatherAbort(S);
  if (s.g) tickGather(S, s, now);
  else writeView(S, s, now, null);
  if (s.recoil && now - s.recoil.at > STAFF_FEEL.RECOIL_MS) s.recoil = null;
  cost(s, t0);
}

/* QA (mp-stafffeel): what the staff's feel holds right now */
if (typeof window !== 'undefined') {
  try {
    window.__btStaffFeel = function () {
      const g = window._gameState, S = g && g.current;
      const f = S && S._stf;
      return {
        on: !!(S && staffFeelOn(S)), wanted: staffFeelWanted(),
        gathering: !!(f && f.g), full: f ? f.full : null,
        now: f && f.g ? staffGatherNow(S, Date.now()) : null,
        view: f && f.view ? Object.assign({}, f.view) : null,
        fire: f && f.fire ? Object.assign({}, f.fire) : null,
        lastShot: f && f.lastShot ? Object.assign({}, f.lastShot) : null,
        lastHit: f && f.lastHit ? Object.assign({}, f.lastHit) : null,
        lastImpact: f && f.lastImpact ? Object.assign({}, f.lastImpact) : null,
        recoil: f && f.recoil ? Object.assign({}, f.recoil) : null,
        moveK: S ? staffFeelMoveK(S) : 1,
        stats: f ? JSON.parse(JSON.stringify(f.stats)) : null,
        cost: f ? { max: +f.cost.max.toFixed(3), mean: f.cost.n ? +(f.cost.sum / f.cost.n).toFixed(4) : 0, n: f.cost.n } : null,
      };
    };
    window.__btStaffFeel.set = setStaffFeel;
    /* the loop's own call, run now (this box draws a few frames a second) */
    window.__btStaffFeel.tick = function () { const g = window._gameState; staffFeelFrame(g && g.current, Date.now()); };
  } catch (e) { /* no window */ }
}
