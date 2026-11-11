/* The staff's feel -- v2.3.4803 (src/game/staffFeel.js, its drawer
 * src/rendering/systems/staffFeelFx.js; docs/specs/staff-feel.md).  The owner,
 * 2026-11-11: "The staff building power and blasting the orb" -- and of
 * magic's timing window, "For magic I think it should be skipped for now".
 * The worker's half is draw-gather.test (server/src/drawgather.js); this pins
 * the phone's:
 *   1. THE NUMBERS: mirrors of the worker's (the claim's allowance, the gap,
 *      the full gather, the stages), and the switch's name;
 *   2. THE GATHER: thumb down starts it at once; its share of a full gather
 *      and its stage at the worker's thresholds (spark, orb at 0.4, sphere
 *      at 0.8), bounded the worker's way;
 *   3. THE STAGES LAND: each once, in order, with a deeper note and a pulse;
 *      the hum begins on the touch and rises; the bro plants his feet;
 *   4. THE AIM: the disc's drag past the dead zone aims; a still press goes
 *      the way he faces; a computer's cursor wins;
 *   5. THE CLAIM SENT: the lift asks for one bolt carrying `ga` (whole ms,
 *      thumb down to lift); the loop takes it once (its speed, size, reach);
 *      one it cannot take is let go; a tap another job took is cancelled;
 *   6. TAPS ARE SPARKS: small, fast, the snap of air; an orb and a sphere
 *      blast (the swell and boom), the sphere pushing the bro back a step;
 *   7. OFF: `?stafffeel=0` (remembered), the worker's `staffgather: false`
 *      (no caps.staffGather), `?manual=0/1/2`, another weapon -- the held
 *      staff, exactly (staffFireWaiting null);
 *   8. THE WIRE AROUND IT: `sw` only on a gathered bolt's claims against the
 *      cap; another's bolt sized from its `ga`; the impact's ring; the
 *      worker's verdict kept;
 *   9. THE SOUND: the blast lets every node go; its Sound Studio rows;
 *  10. THE WIRING: each call into the game, the renderer, the caps audit,
 *      the scenario. */
import fs from 'node:fs';
import { STAFF_FEEL, staffFeelOn, setStaffFeel, staffFeelWanted, staffGatherStart, staffGatherAim, staffGatherEnd, staffGatherAbort, staffGatherNow,
  staffFireWaiting, staffFireTake, staffFireCancel, staffFeelFrame, staffFeelCycle, staffFeelMoveK, staffShotLife, staffSw, staffPeerK,
  staffFeelImpact, staffFeelHit, staffAimAngle } from '../../src/game/staffFeel.js';
import { setManualCombat, MANUAL } from '../../src/game/manualCombat.js';
import { DRAW_GATHER as PHONE_DG, fullGatherMs, gatherStage } from '../../src/game/drawGather.js';
import { DRAW_GATHER } from '../src/drawgather.js';
import { feelSynth } from '../../src/data/weaponFeelSound.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS', name); } else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
const read = (f) => fs.readFileSync(new URL(f, import.meta.url), 'utf8');
const near = (a, b, e = 1e-9) => Math.abs(a - b) < e;
const store = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };

/* a stand-in BT_AUDIO: every sound asked for, the hum's pitch */
function audio() {
  const log = [];
  return { log, feelSound(kind, k, opts) {
    const e = { kind, k, stage: opts && opts.stage, base: opts && opts.base, set: [], stopped: false };
    log.push(e);
    return kind === 'build' ? { set(r) { e.set.push(r); }, stop() { e.stopped = true; } } : true;
  } };
}
/* a phone in the game's own combat, a staff out, the worker with the cap */
function phone(extra) {
  return Object.assign({ rpg: { activeSlot: 'staff', staffWeapon: { type: 'staff' }, hp: 100 }, _serverCaps: { staffGather: 1 }, swingTimer: 0,
    player: { x: 500, y: 400 }, _facing: 'right', _staffTipAt: 0 }, extra || {});
}
setManualCombat(3);
setStaffFeel(true);
const T0 = 1000000;

// ── 1. the numbers ──
{
  check('1a MIRROR: the gather\'s claim is bounded by the worker\'s own allowance (drawgather.js SLACK_MS, 100 -- not the kit\'s 150)',
    STAFF_FEEL.CLAIM_ALLOW_MS === DRAW_GATHER.SLACK_MS && STAFF_FEEL.CLAIM_ALLOW_MS === 100);
  check('1b the phone\'s gap between bolts is the worker\'s floor (MIN_GAP_MS 100) and the network\'s 50; a lift\'s bolt waits as a flicked arrow does',
    STAFF_FEEL.GAP_MS === DRAW_GATHER.MIN_GAP_MS + 50 && STAFF_FEEL.GAP_MS === 150 && STAFF_FEEL.FIRE_HOLD_MS === MANUAL.FIRE_HOLD_MS);
  check('1c the full gather is drawGather.js\'s (a new character\'s 600 + 300 = 900), and the stages its thresholds (the worker\'s, mirrored)',
    STAFF_FEEL.FULL_DEFAULT_MS === 900 && fullGatherMs(600) === 900 && PHONE_DG.ORB_SHARE === DRAW_GATHER.ORB_SHARE && PHONE_DG.SPHERE_SHARE === DRAW_GATHER.SPHERE_SHARE
    && PHONE_DG.ORB_SHARE === 0.4 && PHONE_DG.SPHERE_SHARE === 0.8);
  check('1d by stage (spark, orb, sphere): a spark quick and small, a sphere heavy, slow and big, its reach kept (life x the inverse of its speed)',
    STAFF_FEEL.SPEED_K[0] > 1 && STAFF_FEEL.SPEED_K[1] === 1 && STAFF_FEEL.SPEED_K[2] < 1 && STAFF_FEEL.SIZE_K[0] < 1 && STAFF_FEEL.SIZE_K[2] > 1
    && staffShotLife(135, { lifeK: 5 / 3.5 }) === Math.round(135 * 5 / 3.5) && staffShotLife(135, null) === 135);
}

// ── 2. the gather ──
{
  const S = phone();
  check('2a on: the game\'s own combat, a staff, caps.staffGather', staffFeelOn(S) === true);
  check('2b THUMB DOWN STARTS IT AT ONCE', staffGatherStart(S, T0, 300, 600) === true && S._stf.g && S._stf.g.at === T0 && S._stf.view && S._stf.view.gathering === true);
  const at = (ms) => staffGatherNow(S, T0 + ms);
  const a = at(300), b = at(359), c = at(360), d = at(719), e = at(720), f = at(900), g = at(5000);
  check('2c its share is the gather over a full one (900): a third at 300 ms, all of it at 900 and after',
    near(a.share, 1 / 3) && f.share === 1 && g.share === 1 && a.held === 300, { a, f });
  check('2d THE STAGES AT THE WORKER\'S THRESHOLDS: a spark under 0.4 (360 ms), an orb from it, a sphere from 0.8 (720 ms)',
    a.stage === 0 && b.stage === 0 && c.stage === 1 && d.stage === 1 && e.stage === 2 && g.stage === 2 && gatherStage(0.8) === 2, { b, c, d, e });
  staffFeelCycle(S, 400);
  check('2e the loop\'s staff interval sets the full gather (a quicker staff: 400 + 300)', S._stf.full === 700 && near(at(350).share, 0.5));
  staffFeelCycle(S, 600);
  /* the bound: the last bolt 150 ms before the thumb went down */
  const S2 = phone({ swingTimer: T0 - 150 });
  staffGatherStart(S2, T0, 0, 0);
  const n2 = staffGatherNow(S2, T0 + 400);
  check('2f BOUNDED THE WORKER\'S WAY: never more than the time since your last bolt plus 100 (a gather begun right after a bolt counts all of itself)',
    n2.claim === 400 && n2.held === 400);
  const S3 = phone({ swingTimer: T0 + 100 });   /* a bolt the loop made AFTER the thumb went down (a held fire) */
  staffGatherStart(S3, T0, 0, 0);
  const n3 = staffGatherNow(S3, T0 + 600);
  check('2g ...and a gather that overlaps the last bolt is cut to the worker\'s count (500 + 100, not 600)', n3.claim === 600 && n3.held === 600
    && staffGatherNow(phone({ swingTimer: T0 + 300, _stf: S3._stf }), T0 + 600).claim === 400);
  check('2h one press at a time: a second start keeps the first', staffGatherStart(S, T0 + 50, 1, 1) === true && S._stf.g.at === T0);
}

// ── 3. the stages land ──
{
  const S = phone({ _staffTipAt: T0, _staffTipX: 510, _staffTipY: 380 });
  const A = audio();
  staffFeelFrame(S, T0, A);
  staffGatherStart(S, T0, 0, 0);
  for (let t = 0; t <= 1200; t += 40) { S._staffTipAt = T0 + t; staffFeelFrame(S, T0 + t); }
  const stages = A.log.filter((e) => e.kind === 'stage').map((e) => e.stage);
  const hum = A.log.find((e) => e.kind === 'build');
  check('3a THE THREE STAGES LAND, each once and in order -- spark (on the touch), orb, sphere -- each with its deeper note', JSON.stringify(stages) === '[1,2,3]'
    && JSON.stringify(S._stf.stats.stages) === '[1,1,1]', { stages, st: S._stf.stats.stages });
  check('3b ...and a pulse at the staff\'s tip each time (the kit\'s ring, queued)', (S._feelFx || []).filter((e) => e.kind === 'pulse').length === 3
    && (S._feelFx || []).every((e) => e.kind !== 'pulse' || (e.x === 510 && e.y === 380)));
  check('3c THE LOW HUM begins on the touch (the kit\'s build tone, an octave down) and rises with the gather, to full',
    !!hum && hum.base === STAFF_FEEL.HUM_BASE && hum.set.length > 10 && hum.set[0] === 0 && hum.set[hum.set.length - 1] === 1
    && hum.set.every((r, i) => i === 0 || r >= hum.set[i - 1]) && !hum.stopped, hum && { n: hum.set.length, first: hum.set[0], last: hum.set[hum.set.length - 1] });
  check('3d the view the renderer draws: gathering, the share, the stage, the pop of the stage that landed', S._stf.view.gathering && S._stf.view.r === 1 && S._stf.view.stage === 2 && S._stf.view.popStage === 2);
  check('3e THE BRO PLANTS HIS FEET: his walk x MOVE_K while gathering, 1 otherwise', staffFeelMoveK(S) === STAFF_FEEL.MOVE_K && STAFF_FEEL.MOVE_K < 1 && staffFeelMoveK(phone()) === 1);
  staffGatherEnd(S, T0 + 1200);
  check('3f the lift stops the hum', hum.stopped === true && staffFeelMoveK(S) === 1);
}

// ── 4. the aim ──
{
  const S = phone({ _facingAngle: 0.3 });
  staffGatherStart(S, T0, 100, 100);
  check('4a a drag inside the stick\'s dead zone aims nothing', staffGatherAim(S, 5, 5) === false && S._aimAngle === undefined);
  check('4b THE DRAG AIMS: past it, the way from where the thumb went down (written as the stick writes it)',
    staffGatherAim(S, 0, 40) === true && near(S._aimAngle, Math.PI / 2) && near(S._lastAimAngle, Math.PI / 2) && S._facing === 'down' && S._aiming === true && S._aimSrc === 'stick');
  staffFeelFrame(S, T0 + 100);
  check('4c ...and the orb leans that way (the view\'s aim)', near(S._stf.view.aim, Math.PI / 2));
  S._aiming = false;   /* handleRBtnRelease runs after the lift's blast; a drag's aim stands */
  const fi = staffGatherEnd(S, T0 + 400);
  check('4d the lift blasts where the drag aimed', near(fi.ang, Math.PI / 2) && near(S._lastAimAngle, Math.PI / 2));
  const P = phone({ _facingAngle: 0.3, _aimAngle: 2, _lastAimAngle: 2 });
  staffGatherStart(P, T0, 0, 0);
  const fp = staffGatherEnd(P, T0 + 50);
  check('4e A STILL PRESS goes the way he faces (as a tap\'s attack did), and writes it for the loop', near(fp.ang, 0.3) && near(P._lastAimAngle, 0.3) && near(P._aimAngle, 0.3));
  const C = phone({ _facingAngle: 0.3 });
  staffGatherStart(C, T0, null, null);
  const fc = staffGatherEnd(C, T0 + 500, -1.2);
  check('4f A COMPUTER: the cursor\'s way wins', near(fc.ang, -1.2) && near(C._lastAimAngle, -1.2));
  check('4g the aim ladder without a lock: the thumb now, else the aim last set, else the facing',
    staffAimAngle({ _aiming: true, _aimAngle: 1, _lastAimAngle: 2 }) === 1 && staffAimAngle({ _aiming: false, _aimAngle: 1, _lastAimAngle: 2 }) === 2 && staffAimAngle({ _facing: 'left' }) === Math.PI);
}

// ── 5. the claim sent ──
{
  const S = phone({ _staffTipAt: T0, _staffTipX: 0, _staffTipY: 0 });
  const A = audio();
  staffFeelFrame(S, T0, A);
  staffGatherStart(S, T0, 0, 0);
  check('5a nothing fires while the thumb is held (the loop\'s held staff is off: false, never null)', staffFireWaiting(S, T0 + 2000) === false);
  const fi = staffGatherEnd(S, T0 + 523.6);
  check('5b THE LIFT ASKS FOR ONE BOLT carrying `ga`, the gather in whole ms from the thumb down to the lift (drawGather.js buildWire)',
    fi.ga === 524 && fi.stage === 1 && near(fi.share, 523.6 / 900) && staffFireWaiting(S, T0 + 530) === true, fi);
  const shot = staffFireTake(S, T0 + 540, 0.5);
  check('5c the loop takes it ONCE: its `ga`, an orb\'s speed (the staff\'s 5), size and reach', !!shot && shot.ga === 524 && shot.stage === 1 && shot.speedPx === 5
    && shot.sizeK === 1 && shot.lifeK === 1 && staffFireTake(S, T0 + 541, 0.5) === null && staffFireWaiting(S, T0 + 541) === false, shot);
  check('5d ...and the release is the orb\'s: the swell and the boom, the flash along its way, the push back a step', A.log.some((e) => e.kind === 'blast' && e.k === 0.6)
    && (S._feelFx || []).some((e) => e.kind === 'streak' && e.ang === 0.5) && !!S._stf.recoil && S._stf.recoil.px === STAFF_FEEL.RECOIL_PX[1] && S._stf.recoil.ang === 0.5);
  staffGatherStart(S, T0 + 1000, 0, 0);
  staffGatherEnd(S, T0 + 1200);
  staffFeelFrame(S, T0 + 1200 + STAFF_FEEL.FIRE_HOLD_MS + 1);
  check('5e a bolt the loop could not take (dazed, in the air, too soon) is let go after FIRE_HOLD_MS', S._stf.fire === null && S._stf.stats.lost === 1);
  staffGatherStart(S, T0 + 2000, 0, 0);
  staffGatherEnd(S, T0 + 2050);
  check('5f a tap another job took (a townsperson, a resource, a door) cancels its bolt', staffFireCancel(S) === true && staffFireWaiting(S, T0 + 2060) === false);
  staffGatherStart(S, T0 + 3000, 0, 0);
  check('5g any other end of a press (a slide to the shield, the button gone) fires nothing', staffGatherAbort(S) === true && staffGatherEnd(S, T0 + 3100) === null && staffFireWaiting(S, T0 + 3100) === false);
}

// ── 6. taps are sparks; the sphere ──
{
  const S = phone();
  const A = audio();
  staffFeelFrame(S, T0, A);
  staffGatherStart(S, T0, 0, 0);
  staffGatherEnd(S, T0 + 70);
  const sp = staffFireTake(S, T0 + 80, 0);
  check('6a A QUICK TAP FIRES A SMALL FAST SPARK: stage 0, quicker than the staff\'s bolt, smaller, its reach kept, a share of its 70 ms',
    sp.stage === 0 && sp.ga === 70 && sp.speedPx > 5 && sp.sizeK < 1 && near(sp.lifeK * sp.speedPx, 5) && near(sp.share, 70 / 900), sp);
  check('6b ...with the snap of air, no boom and no push back', A.log.some((e) => e.kind === 'release') && !A.log.some((e) => e.kind === 'blast') && !S._stf.recoil);
  S.swingTimer = T0 + 80;
  staffGatherStart(S, T0 + 200, 0, 0);
  staffGatherEnd(S, T0 + 1300);
  const big = staffFireTake(S, T0 + 1310, 0);
  check('6c a full gather is a SPHERE: heavy and slow, big, the deep boom and a crack, the staff kicked and the bro pushed back a step',
    big.stage === 2 && big.speedPx < 5 && big.sizeK > 1 && big.share === 1 && A.log.some((e) => e.kind === 'blast' && e.k > 1) && S._stf.recoil.px === STAFF_FEEL.RECOIL_PX[2]
    && STAFF_FEEL.RECOIL_PX[2] > STAFF_FEEL.RECOIL_PX[1], big);
  check('6d NO TIMING WINDOW (the owner): a gather held long past full is the same sphere -- nothing for releasing at a moment',
    (() => { const Q = phone(); staffGatherStart(Q, T0, 0, 0); const x = staffGatherEnd(Q, T0 + 905); staffGatherStart(Q, T0 + 2000, 0, 0); const y = staffGatherEnd(Q, T0 + 9000);
      return x.stage === 2 && y.stage === 2 && x.share === 1 && y.share === 1; })());
}

// ── 7. off ──
{
  const S = phone();
  setStaffFeel(false);
  check('7a `?stafffeel=0` (this page): off -- a press gathers nothing and the loop\'s held staff is back (null)', staffFeelOn(S) === false && staffGatherStart(S, T0, 0, 0) === false && staffFireWaiting(S, T0) === null);
  setStaffFeel(true);
  check('7b the worker\'s `staffgather: false` (no caps.staffGather): the held staff', staffFeelOn(phone({ _serverCaps: {} })) === false && staffFireWaiting(phone({ _serverCaps: {} }), T0) === null);
  setManualCombat(1);
  const m1 = staffFeelOn(phone());
  setManualCombat(2);
  const m2 = staffFeelOn(phone());
  setManualCombat(0);
  const m0 = staffFeelOn(phone());
  setManualCombat(3);
  check('7c `?manual=0`, `?manual=1`, `?manual=2` keep the held staff, as they are', !m0 && !m1 && !m2 && staffFeelOn(phone()));
  check('7d another weapon in hand: off', staffFeelOn(phone({ rpg: { activeSlot: 'ranged', staffWeapon: { type: 'staff' } } })) === false
    && staffFeelOn(phone({ rpg: { activeSlot: 'staff', staffWeapon: null } })) === false);
  const G = phone();
  staffGatherStart(G, T0, 0, 0);
  G.rpg.activeSlot = 'melee';
  staffFeelFrame(G, T0 + 100);
  check('7e a gather whose staff is put away ends (nothing fires; the view gone)', !G._stf.g && G._stf.view === null && G._stf.stats.aborts === 1);
  const st = store();
  check('7f THE SWITCH: on by default; `?stafffeel=0` off and remembered; `?stafffeel=1` back',
    staffFeelWanted('', st) === true && staffFeelWanted('?stafffeel=0', st) === false && staffFeelWanted('', st) === false && st.getItem('bt_stafffeel') === '0'
    && staffFeelWanted('?a=1&stafffeel=1', st) === true && staffFeelWanted('', st) === true);
}

// ── 8. the wire around it ──
{
  const S = phone();
  const gathered = { isStaff: true, _gs: 1, _shotTs: 777 };
  check('8a A GATHERED BOLT\'S CLAIMS NAME ITS SHOT (`sw` = its relay\'s `ts`) against a worker with caps.staffGather',
    staffSw(S, gathered) === 777 && staffSw(phone({ _serverCaps: {} }), gathered) === undefined);
  check('8b ...and nothing else does: a held bolt (no gather), a special, an arrow -- today\'s claims, exactly',
    staffSw(S, { isStaff: true, _shotTs: 777 }) === undefined && staffSw(S, { isStaff: true, isSpecial: true, _gs: 2, _shotTs: 777 }) === undefined
    && staffSw(S, { isStaff: false, _gs: 1, _shotTs: 777 }) === undefined);
  check('8c ANOTHER PLAYER\'S BOLT is drawn its stage\'s size from the gather the worker counted (`ga`); a held bolt or a special as ever',
    staffPeerK({ isStaff: true, ga: 50 }) === STAFF_FEEL.SIZE_K[0] && staffPeerK({ isStaff: true, ga: 400 }) === STAFF_FEEL.SIZE_K[1] && staffPeerK({ isStaff: true, ga: 900 }) === STAFF_FEEL.SIZE_K[2]
    && staffPeerK({ isStaff: true }) === undefined && staffPeerK({ isStaff: true, isSpecial: true, ga: 900 }) === undefined && staffPeerK({ isStaff: false, ga: 900 }) === undefined
    && staffPeerK({ isStaff: true, ga: 'x' }) === undefined && staffPeerK({ isStaff: true, ga: 1e99 }) === STAFF_FEEL.SIZE_K[2]);
  const A = audio();
  staffFeelFrame(S, T0, A);
  S._feelFx = [];
  check('8d THE RING OF FORCE drawn where a sphere lands: the worker\'s splash reach and shove (60 + 30 px), a second ring inside, the contact\'s heavy layer, the camera pushed its way',
    staffFeelImpact(S, { _gs: 2, ang: 0 }, 100, 200) === true && S._feelFx.filter((e) => e.kind === 'pulse').length === 2
    && near(S._feelFx.find((e) => e.kind === 'pulse').k, (60 + 30) / 45) && A.log.some((e) => e.kind === 'contact' && e.k > 1) && S._camPunch && S._camPunch.dx > 0);
  S._feelFx = []; S._camPunch = null;
  check('8e ...a spark\'s none (it does not splash), only its sparks', staffFeelImpact(S, { _gs: 0, ang: 0 }, 100, 200) === true
    && S._feelFx.every((e) => e.kind !== 'pulse') && S._feelFx.some((e) => e.kind === 'burst') && !S._camPunch);
  check('8f a held bolt (no gather) draws none of it', staffFeelImpact(S, { ang: 0 }, 1, 1) === false);
  staffFeelHit(S, { slot: 'staff', gs: 2, pw: 1, dmg: 40, monsterId: 'm1' });
  staffFeelHit(S, { slot: 'staff', gs: 0, pw: 0.1, splash: true });
  staffFeelHit(S, { slot: 'melee', pw: 0.5 });
  check('8g THE WORKER\'S VERDICT kept: your bolt\'s stage (`gs`) and share (`pw`) -- not a splash\'s echo, not another weapon\'s',
    S._stf.lastHit.gs === 2 && S._stf.lastHit.pw === 1 && S._stf.lastHit.id === 'm1' && S._stf.stats.hits === 1);
}

// ── 9. the sound ──
{
  let made = 0, cut = 0;
  const node = (extra) => Object.assign({ connect() {}, disconnect() { cut++; } }, extra);
  const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {}, linearRampToValueAtTime() {} });
  const sources = [];
  const ctx = {
    currentTime: 0, sampleRate: 8000,
    createOscillator() { made++; const o = node({ type: '', frequency: param(), start() {}, stop() {} }); sources.push(o); return o; },
    createGain() { made++; return node({ gain: param() }); },
    createBiquadFilter() { made++; return node({ type: '', frequency: param(), Q: { value: 0 } }); },
    createBufferSource() { made++; const s = node({ buffer: null, start() {}, stop() {} }); sources.push(s); return s; },
    createBuffer(ch, n) { return { copyToChannel() {}, length: n }; },
  };
  const out = node({});
  const ok = [feelSynth(ctx, out, 'blast', 0.6), feelSynth(ctx, out, 'blast', 1.1)];
  const h = feelSynth(ctx, out, 'build', 0, { base: STAFF_FEEL.HUM_BASE });
  h.set(1); h.stop();
  for (const s of sources) if (s.onended) s.onended();
  check('9a the blast plays (an orb\'s, a sphere\'s) and the hum is the kit\'s build tone', ok.every((x) => x === true) && h && typeof h.set === 'function');
  check('9b EVERY NODE IS LET GO when its sound ends (the v2.3.2126 lesson)', made > 0 && cut === made, { made, cut });
  const ST = read('../../src/data/soundStudio.js');
  check('9c each new sound is labelled in the Sound Studio (the gather\'s hum, the orb\'s blast, the sphere\'s)',
    ['feelGather', 'feelBlast', 'feelBlastBig'].every((id) => new RegExp("\\['" + id + "', 'fight', ").test(ST)));
}

// ── 10. the wiring ──
{
  const MC = read('../../src/game/monsterCombat.js'), BRO = read('../../src/ui/BroTown.jsx'), PJ = read('../../src/game/projectiles.js');
  const GE = read('../../src/networking/gameEvents.js'), SC = read('../../src/rendering/staffCastFx.js'), EF = read('../../src/rendering/systems/effectsRenderer.js');
  const WF = read('../../src/rendering/systems/weaponFeelFx.js'), SF = read('../../src/game/staffFeel.js'), SFX = read('../../src/rendering/systems/staffFeelFx.js');
  check('10a THE LOOP fires only a lift\'s bolt with the feel (null: the held staff, its line as it was), no sooner than GAP_MS',
    /var _sfFire = staffFireWaiting\(S, Date\.now\(\)\);\s*\n\s*if \(_sfFire !== null\) _wantAtk = _sfFire;/.test(MC)
    && /Date\.now\(\) - S\.swingTimer >= \(_sfFire !== null \? STAFF_FEEL\.GAP_MS : effectiveSwingCd \+ _staffCdExtra\)\)/.test(MC)
    && /if \(_staffCdExtra\) staffFeelCycle\(S, effectiveSwingCd\);/.test(MC));
  check('10b the bolt takes the shot: its stage\'s speed, size and reach; the relay carries `ga` and the speed, only for a gathered bolt',
    /var _sfShot = \(isStaff && _sfFire\) \? staffFireTake\(S, _shotTs, arrAngle\) : null;/.test(MC)
    && /ga: _sfShot \? _sfShot\.ga : undefined,/.test(MC) && (MC.match(/speedPx: _sfShot \? _sfShot\.speedPx : undefined,/g) || []).length === 2
    && /_gs: _sfShot \? _sfShot\.stage : undefined,/.test(MC) && (MC.match(/staffShotLife\(/g) || []).length === 3);
  check('10c its claims name the shot on monster_damage AND the duel\'s player_attack (staffSw)',
    /: staffSw\(S, a\)\s*\n\s*\}\}\);/.test(PJ) && /sw: staffSw\(S, a\),/.test(PJ) && /staffFeelImpact\(S, a, tx \+ vdx, ty \+ vdy\);/.test(PJ));
  check('10d the presses: the stick, the disc and the left mouse button gather; their lifts blast; a tap another job took cancels; any other end aborts; the flick and the tap no longer make the special or a held bolt',
    /staffGatherStart\(stateRef\.current, rts\.startAt, t\.clientX, t\.clientY\);/.test(BRO) && /if \(staffGatherStart\(stateRef\.current, bSwipe\.st, t\.clientX, t\.clientY\)\) return;/.test(BRO)
    && /if \(staffGatherStart\(S, Date\.now\(\), null, null\)\) return;/.test(BRO) && /var _sfEnd = staffGatherEnd\(stateRef\.current, Date\.now\(\)\);/.test(BRO)
    && /if \(staffGatherEnd\(stateRef\.current, Date\.now\(\)\)\) isFlick = false;/.test(BRO) && /staffGatherEnd\(stateRef\.current, Date\.now\(\), stateRef\.current\._mouseAimAngle\);/.test(BRO)
    && (BRO.match(/staffFireCancel\(/g) || []).length === 4 && /staffGatherAbort\(S\);/.test(BRO)
    && /if \(_rFlick && !mcSwipes\(stateRef\.current\) && !_sfEnd\)/.test(BRO) && /if \(!mcSwipes\(_tjS\) && !_sfEnd\) requestTapAttack/.test(BRO)
    && /staffGatherAim\(stateRef\.current, t\.clientX - bSwipe\.sx, t\.clientY - bSwipe\.sy\);/.test(BRO));
  check('10e the loop\'s frame (with the game\'s audio) and the walk: the bro plants his feet',
    /swordFeelFrame\(S, Date\.now\(\)\);\s*\n\s*staffFeelFrame\(S, Date\.now\(\), BT_AUDIO\);/.test(BRO) && /shieldMult \*= staffFeelMoveK\(S\);/.test(BRO));
  check('10f the hits: your bolt\'s verdict kept, another\'s bolt sized', /staffFeelHit\(S, payload\);/.test(GE) && /_gk: staffPeerK\(payload\),/.test(GE));
  check('10g THE PICTURES: the crystal fills with the gather (staffCastFx), the bolt drawn its size, the orb and the push back a drawer of the kit\'s own layer',
    /const _sv = S && S\._stf && S\._stf\.view;/.test(SC) && /p\._gk > 0 \? p\._gk : 1/.test(EF)
    && /import \{ staffFeelDraw \} from '\.\/staffFeelFx\.js';/.test(WF) && /registerFeelDrawer\(staffFeelDraw\);/.test(WF)
    && !/new Graphics\(|Texture\.from|Assets\.load/.test(SFX) && !/S\.player\.[xy]\s*=[^=]/.test(SFX));
  check('10h NOTHING HERE ROLLS DAMAGE: the rules send nothing and write no hit', !/channel\.send|\.dmg\s*=|curHp\s*=/.test(SF)
    && (SF.match(/^import /gm) || []).length === 3);
  check('10i the caps audit: staffGather is gated on now (its allowlist row gone)', !/\['staffGather',/.test(read('./caps-audit.test.mjs')));
  check('10j QA probes: window.__btStaffFeel (the feel) and __btStaffFeelFx (its pictures)', /window\.__btStaffFeel = function/.test(SF) && /window\.__btStaffFeelFx = \(\) =>/.test(SFX));
  const RUN = read('../../tools/qa/mp/run.mjs');
  let SCN = '';
  try { SCN = read('../../tools/qa/mp/mp-stafffeel.mjs'); } catch (e) { SCN = ''; }
  check('10k the scenario plays the DEFAULT combat in the Wheel (registered in run.mjs)',
    /stafffeel: \(\) => import\('\.\/mp-stafffeel\.mjs'\)/.test(RUN) && /world: 'wheel'/.test(SCN) && /query: 'manual=default/.test(SCN));
}

console.log(failures === 0 ? `\nstaff-feel: ${passes} passed, 0 failed` : `\nstaff-feel: ${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
