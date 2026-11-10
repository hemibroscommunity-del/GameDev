/* Manual combat's rules -- v2.3.4357 (src/game/manualCombat.js,
 * docs/specs/manual-combat.md).  The owner: "only making an attack after
 * manual input is better than auto-attacking at precisely the correct
 * interval."
 *
 *   1. THE SWITCH: off unless `?manual=1`; remembered; `?manual=0` forgets.
 *   2. A DRAW (bow, staff): starts at the press, full after the weapon's own
 *      interval, stays full as long as it is held; a lift at full fires
 *      once; a lift before full fires nothing and loses the draw.
 *   3. THE SLIP ALLOWANCE: a thumb back within 100 ms never left.
 *   4. CANCEL: back to the centre, then lift: no shot.
 *   5. A press that ends some other way drops the draw.
 *   6. A SWORD: no draw; ready after its interval; an early tap is refused
 *      and not kept.
 *   7. A SPECIAL is armed and taken once.
 *   8. NO CHOSEN LOCK: only the automatic one is allowed.
 *   9. Changing weapon mid-draw starts again; a shot nobody takes expires.
 *  10. THE WIRING: the loop, the handlers, targeting and the special's
 *      button read this file; without the switch the loop's gate is what it
 *      was; this file never writes the aim (a staff bolt's steering). */
import fs from 'node:fs';
import {
  MANUAL, manualCombatWanted, setManualCombat, manualOn, mcFrame, mcPress, mcLift, mcAbort, mcFireWaiting, mcFireDone,
  mcFrac, mcReady, mcMeleeMay, mcArmToggle, mcArmed, mcTakeArmed, mcLockAllowed, mcDraws,
} from '../../src/game/manualCombat.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name); else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
const read = (f) => fs.readFileSync(new URL(f, import.meta.url), 'utf8');
const store = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _m: m }; };
const bow = () => ({ rpg: { activeSlot: 'ranged' }, swingTimer: 0 });
const sword = (t) => ({ rpg: { activeSlot: 'melee' }, swingTimer: t || 0 });

// ── 1. the switch ──
{
  const ls = store();
  check('1a off by default', manualCombatWanted('', ls) === false && manualCombatWanted('?foo=1', ls) === false);
  check('1b `?manual=1` turns it on and is remembered', manualCombatWanted('?manual=1', ls) === true && ls.getItem(MANUAL.KEY) === '1' && manualCombatWanted('', ls) === true);
  check('1c `?manual=0` turns it off and forgets', manualCombatWanted('?x=2&manual=0', ls) === false && ls.getItem(MANUAL.KEY) === null && manualCombatWanted('', ls) === false);
  check('1d a look-alike is not the switch', manualCombatWanted('?notmanual=1', store()) === false && manualCombatWanted('?manual=12', store()) === false);
  check('1e no storage (a private window): the address still decides', manualCombatWanted('?manual=1', null) === true && manualCombatWanted('', null) === false);
  setManualCombat(true); check('1f the page\'s own answer can be set for a test', manualOn() === true); setManualCombat(false);
}

// ── 2. a draw ──
{
  const S = bow(); let t = 1000;
  mcFrame(S, t, 500, 600);
  check('2a a bow and a staff draw; a sword does not', mcDraws(S) && mcDraws({ rpg: { activeSlot: 'staff' } }) && !mcDraws(sword()) && !mcDraws({ rpg: {} }));
  check('2b no thumb down: nothing built', mcFrac(S, t) === 0 && !mcReady(S, t));
  check('2c the press starts the draw', mcPress(S, t) === 'started' && S._mc.drawAt === t);
  check('2d it fills over the weapon\'s own interval', Math.abs(mcFrac(S, t + 250) - 0.5) < 1e-9 && !mcReady(S, t + 499) && mcReady(S, t + 500));
  check('2e held past full it stays full, as long as you like', mcFrac(S, t + 60000) === 1 && mcReady(S, t + 60000));
  check('2f a second press under a held thumb is the same draw', mcPress(S, t + 100) === 'held' && S._mc.drawAt === t);
  check('2g a lift at full fires, once', mcLift(S, t + 700, false) === 'fire' && mcFireWaiting(S, t + 700) && S._mc.drawAt === 0 && S._mc.n === 1);
  check('2h ...and a second lift is nothing', mcLift(S, t + 710, false) === 'none' && S._mc.n === 1);
  mcFireDone(S);
  check('2i the loop takes it once', !mcFireWaiting(S, t + 720));
  /* before full */
  t = 5000; mcPress(S, t);
  check('2j a lift before full fires nothing', mcLift(S, t + 300, false) === 'slip' && !mcFireWaiting(S, t + 300));
  mcFrame(S, t + 300 + MANUAL.SLIP_MS + 1, 500, 600);
  check('2k ...and the draw is lost: the timer resets', S._mc.drawAt === 0 && mcFrac(S, t + 500) === 0);
  mcPress(S, t + 600);
  check('2l the next press starts from nothing', S._mc.drawAt === t + 600 && mcFrac(S, t + 700) === 0.2);
}

// ── 3. the slip allowance ──
{
  const S = bow(); const t = 1000;
  mcFrame(S, t, 500, 600); mcPress(S, t);
  mcLift(S, t + 200, false);
  check('3a the allowance is the tenth of a second the owner agreed', MANUAL.SLIP_MS === 100);
  check('3b the gauge holds still while the thumb is off', mcFrac(S, t + 280) === 0.4);
  mcFrame(S, t + 290, 500, 600);
  check('3c back within it: the draw carries on as if it never left', mcPress(S, t + 290) === 'resumed' && S._mc.drawAt === t && S._mc.liftAt === 0 && mcReady(S, t + 500));
  check('3d ...and fires at full', mcLift(S, t + 520, false) === 'fire');
  /* too late */
  const S2 = bow(); mcFrame(S2, t, 500, 600); mcPress(S2, t); mcLift(S2, t + 200, false);
  check('3e back after it: a new draw from nothing', mcPress(S2, t + 200 + MANUAL.SLIP_MS + 1) === 'started' && S2._mc.drawAt === t + 301);
  /* a slip never fires by itself */
  const S3 = bow(); mcFrame(S3, t, 500, 600); mcPress(S3, t); mcLift(S3, t + 499, false);
  mcFrame(S3, t + 700, 500, 600);
  check('3f a slip is never a shot, however close to full', !mcFireWaiting(S3, t + 700) && S3._mc.n === 0);
}

// ── 4. cancel ──
{
  const S = bow(); const t = 1000;
  mcFrame(S, t, 500, 600); mcPress(S, t);
  check('4a back to the centre at full, then lift: no shot', mcLift(S, t + 900, true) === 'cancel' && !mcFireWaiting(S, t + 900) && S._mc.drawAt === 0 && S._mc.n === 0);
  check('4b the centre is the stick\'s own dead zone (8 px)', MANUAL.CENTRE_PX === 8);
}

// ── 5. a press that ends some other way ──
{
  const S = bow(); const t = 1000;
  mcFrame(S, t, 500, 600); mcPress(S, t);
  mcAbort(S);
  check('5a the button gone from under the thumb: the draw is dropped, nothing fired', S._mc.drawAt === 0 && !mcFireWaiting(S, t + 600));
  mcPress(S, t + 1000); mcLift(S, t + 1100, false); mcAbort(S);
  check('5b ...but a lift already judged (a slip in its allowance) is left to its allowance', S._mc.drawAt === t + 1000 && S._mc.liftAt === t + 1100);
  check('5c nothing to drop is nothing', (mcAbort({}), mcAbort(null), true));
}

// ── 6. a sword ──
{
  const t = 10000;
  const S = sword(t);
  mcFrame(S, t, 500, 600);
  check('6a a press starts no draw', mcPress(S, t) === 'none' && !S._mc.drawAt);
  check('6b it builds by itself after a swing', mcFrac(S, t + 300) === 0.5 && !mcReady(S, t + 599) && mcReady(S, t + 600));
  check('6c tapping early does nothing', mcMeleeMay(S, t + 599) === false);
  check('6d ...and the early tap is not kept: the same question at the right time is asked afresh', mcMeleeMay(S, t + 600) === true && mcMeleeMay(S, t + 5000) === true);
  check('6e a bow\'s tap is never a sword\'s', mcMeleeMay(bow(), t + 5000) === false);
  check('6f a lift means nothing to a sword', mcLift(S, t + 700, false) === 'none' && !mcFireWaiting(S, t + 700));
}

// ── 7. a special ──
{
  const S = bow();
  check('7a not armed to begin with', !mcArmed(S) && !mcArmed(null) && mcTakeArmed(S) === false);
  check('7b its button arms it', mcArmToggle(S) === true && mcArmed(S));
  check('7c the next attack takes it, once', mcTakeArmed(S) === true && !mcArmed(S) && mcTakeArmed(S) === false);
  mcArmToggle(S);
  check('7d a second press disarms', mcArmToggle(S) === false && !mcArmed(S));
  const S2 = bow(); mcFrame(S2, 1000, 500, 600); mcPress(S2, 1000); mcArmToggle(S2);
  check('7e armed midway through a draw: the draw is not disturbed', S2._mc.drawAt === 1000 && mcArmed(S2) && mcLift(S2, 1600, false) === 'fire');
}

// ── 8. no chosen lock ──
{
  check('8a a tap lock, a duel\'s lock and a lock with no source are not kept', !mcLockAllowed({ type: 'monster', src: 'tap' }) && !mcLockAllowed({ type: 'player', id: 'x' }) && !mcLockAllowed({ src: 'lunge' }));
  check('8b the sword\'s own automatic lock is', mcLockAllowed({ type: 'monster', src: 'auto' }) && mcLockAllowed(null));
}

// ── 9. a weapon changed, a shot nobody took ──
{
  const S = bow(); const t = 1000;
  mcFrame(S, t, 500, 600); mcPress(S, t);
  S.rpg.activeSlot = 'staff';
  mcFrame(S, t + 300, 800, 600);
  check('9a another weapon in hand mid-draw: its own draw, from nothing', S._mc.drawAt === 0 && S._mc.need === 800);
  mcPress(S, t + 400);
  check('9b the staff\'s draw is the staff\'s interval', !mcReady(S, t + 1199) && mcReady(S, t + 1200));
  mcLift(S, t + 1300, false);
  mcFrame(S, t + 1300 + MANUAL.FIRE_HOLD_MS + 1, 800, 600);
  check('9c a shot the loop could not take (dazed, in the air) is let go, not kept for later', !mcFireWaiting(S, t + 1300 + MANUAL.FIRE_HOLD_MS + 1) && S._mc.fireAt === 0);
}

// ── 10. the wiring ──
{
  const rules = read('../../src/game/manualCombat.js');
  check('10a the rules import nothing (node runs them)', !/^import /m.test(rules));
  check('10b the rules never write the aim: a staff bolt in flight is steered by the held thumb as before',
    !/_aimAngle\s*=|_aiming\s*=|_lastAimAngle\s*=|_facing\s*=/.test(rules));
  const loop = read('../../src/game/monsterCombat.js');
  check('10c the loop: with the switch a shot is a lift\'s (mcFireWaiting), never a held thumb\'s; without it the gate is what it was',
    /var _wantAtk = _mcOn \? _mcFire : \(S\.autoAttack \|\| _engSwing \|\| _tapAtkNow\);/.test(loop)
    && /\(_mcFire \|\| Date\.now\(\) - S\.swingTimer >= effectiveSwingCd \+ _staffCdExtra\)/.test(loop)
    && /\(_mcOn \|\| !_flickWait\)/.test(loop));
  check('10d the draw is the weapon\'s own interval, the staff\'s extra included', /mcFrame\(S, Date\.now\(\), effectiveSwingCd \+ _staffCdExtra,/.test(loop));
  check('10e an armed special is the lift\'s attack, the ordinary shot only if it refused', /if \(mcTakeArmed\(S\)\) \{[\s\S]{0,400}specialAttack\(S\)[\s\S]{0,300}_mayLoose = false;/.test(loop));
  const bro = read('../../src/ui/BroTown.jsx');
  check('10f the handlers: the press draws, the lift is judged before the release tidies, a forced end drops it',
    /if \(_mcP\) mcPress\(S, Date\.now\(\)\);/.test(bro) && /mcLift\(stateRef\.current, Date\.now\(\), !!_mcT\.moved && /.test(bro) && /if \(manualOn\(\)\) mcAbort\(S\);/.test(bro));
  check('10g no special is flicked, the right click arms', /if \(_rFlick && !manualOn\(\)\)/.test(bro) && /if \(manualOn\(\)\) \{ mcArmToggle\(S\); return 'armed'; \}/.test(bro));
  check('10h a sword\'s tap goes through mcMeleeTap (early: nothing)', /if \(!mcMeleeMay\(S, Date\.now\(\)\)\) \{ S\._mcEarly/.test(bro) && /if \(!mcDraws\(stateRef\.current\)\) mcMeleeTap\(\); return;/.test(bro));
  check('10i a computer: the press draws and the button\'s up is the shot', /mcPress\(S, Date\.now\(\)\);\s*\n\s*if \(!mcDraws\(S\) && !_deskLungePress/.test(bro) && /mcLift\(_mcS, Date\.now\(\), false\);/.test(bro));
  const tg = read('../../src/game/targeting.js');
  check('10j targeting keeps no chosen lock, and no duel lock, with the switch', /if \(manualOn\(\)\) \{\s*\n\s*if \(S\.lockedTarget && !mcLockAllowed\(S\.lockedTarget\)\) S\.lockedTarget = null;\s*\n\s*\} else keepDuelLock\(S\);/.test(tg));
  const btn = read('../../src/ui/panels/SpecialButton.jsx');
  check('10k the special\'s button arms (and shows it), and is there whenever a weapon is in hand', /mcArmToggle\(Sm\)/.test(btn) && /if \(manualOn\(\)\) return true;/.test(btn) && /armed \? 'armed'/.test(btn));
  const gauge = read('../../src/ui/panels/ManualGauge.jsx');
  check('10l the gauge is code (no picture loaded, no CSS filter over the world) and takes no touch', !/<img|filter:/.test(gauge) && /pointerEvents: 'none'/.test(gauge) && /if \(!on\) return null;/.test(gauge));
  const srv = read('../src/combat.js');
  check('10m the worker\'s own floors are untouched by this change (a draw only makes shots further apart)', /if \(nowTs - cad\.n < 210\) return;/.test(srv));
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
