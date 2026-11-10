/* Manual combat's rules -- v2.3.4383 (src/game/manualCombat.js,
 * docs/specs/manual-combat.md).  The owner: "only making an attack after
 * manual input is better than auto-attacking at precisely the correct
 * interval" -- and, of the draw-and-release it first was, "Try version a":
 * every attack is a swipe.
 *
 *   1. THE SWITCH: off unless `?manual=1`; remembered; `?manual=0` forgets.
 *   2. A BOW'S OR A STAFF'S FLICK: thumb down, moved 24 px or more, lifted =
 *      one shot; a tap, a nudge: none; back to the centre: cancelled.
 *   3. NO FASTER THAN THE WEAPON: a flick too soon shoots nothing and costs
 *      nothing; one a moment too soon is kept.
 *   4. A press that ends some other way attacks nothing.
 *   5. A SWORD'S STROKE: 24 px inside 280 ms, each stroke a swing, back and
 *      forth without lifting; a drift is not one; a tap is not one.
 *   6. A sword too soon: 'no' (costs nothing), 'soon' (kept), 'yes'.
 *   7. A SPECIAL is armed and taken once.
 *   8. NO CHOSEN LOCK: only the automatic one is allowed.
 *   9. A weapon changed, a shot nobody took; a quick flick's help.
 *  10. THE WIRING: the loop, the handlers, targeting and the special's
 *      button read this file; without the switch the loop's gate is what it
 *      was; this file never writes the aim (a staff bolt's steering). */
import fs from 'node:fs';
import {
  MANUAL, manualCombatWanted, manualMode, manualSling, mcBowSling, mcShotAngle, setManualCombat, manualOn, mcFrame, mcSwipeStart, mcSwipeMove, mcSwipeEnd, mcWasQuick, mcAbort, mcAskShot,
  mcFireWaiting, mcFireDone, mcReady, mcReadyIn, mcMeleeAsk, mcSwingWaiting, mcSwingDone, mcAssist, mcArmToggle, mcArmed, mcTakeArmed, mcLockAllowed, mcShoots,
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
  setManualCombat(true); check('1f the page\'s own answer can be set for a test', manualOn() === true && manualSling() === false); setManualCombat(false);
  /* the slingshot bow's variation: `?manual=2` */
  const l2 = store();
  check('1g `?manual=2` is manual combat with the slingshot bow, and is remembered as that', manualMode('?manual=2', l2) === 2 && manualCombatWanted('', l2) === true && l2.getItem(MANUAL.KEY) === '2' && manualMode('', l2) === 2);
  check('1h `?manual=1` after it is the plain swipes again; `?manual=0` forgets either', manualMode('?manual=1', l2) === 1 && manualMode('', l2) === 1 && manualMode('?manual=0', l2) === 0 && manualMode('', l2) === 0 && manualMode('?manual=3', store()) === 0);
  const B = bow(), St = { rpg: { activeSlot: 'staff' } }, Sw = sword();
  setManualCombat(2);
  check('1i the slingshot is the BOW\'s only: a staff stays a flick, a sword a stroke', manualOn() && manualSling() && mcBowSling(B) && !mcBowSling(St) && !mcBowSling(Sw));
  const near = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < 1e-9;
  check('1j a bow pulled DOWN shoots UP, pulled left shoots right; a staff flicked up shoots up', near(mcShotAngle(B, Math.PI / 2), -Math.PI / 2) && near(mcShotAngle(B, Math.PI), 0) && near(mcShotAngle(B, 0.3), 0.3 - Math.PI) && mcShotAngle(St, -Math.PI / 2) === -Math.PI / 2);
  setManualCombat(true);
  check('1k without the variation a bow shoots the way it was flicked', !mcBowSling(B) && mcShotAngle(B, 0.7) === 0.7);
  setManualCombat(false);
}

// ── 2. a flick (bow, staff) ──
{
  const S = bow(); const t = 100000;   /* swingTimer 0: long ready */
  mcFrame(S, t, 500, 600);
  check('2a a bow and a staff shoot; a sword does not', mcShoots(S) && mcShoots({ rpg: { activeSlot: 'staff' } }) && !mcShoots(sword()) && !mcShoots({ rpg: {} }));
  mcSwipeStart(S, t, 100, 100);
  check('2b the press shoots nothing, and neither does moving', !mcFireWaiting(S, t) && mcSwipeMove(S, t + 20, 100, 60) === 'none' && !mcFireWaiting(S, t + 20));
  check('2c lifted 24 px or more from where it touched: one shot', mcSwipeEnd(S, t + 40, 100, 60) === 'fire' && mcFireWaiting(S, t + 40) && S._mc.n === 1);
  check('2d ...and a second lift of the same press is nothing', mcSwipeEnd(S, t + 50, 100, 60) === 'none' && S._mc.n === 1);
  mcFireDone(S);
  check('2e the loop takes it once', !mcFireWaiting(S, t + 60));
  mcSwipeStart(S, t + 100, 100, 100);
  check('2f a tap shoots nothing', mcSwipeEnd(S, t + 130, 100, 100) === 'cancel' && !mcFireWaiting(S, t + 130));
  mcSwipeStart(S, t + 200, 100, 100);
  check('2g a 14 px nudge shoots nothing', mcSwipeEnd(S, t + 230, 112, 92) === 'none' && !mcFireWaiting(S, t + 230));
  mcSwipeStart(S, t + 300, 100, 100); mcSwipeMove(S, t + 320, 100, 40);
  check('2h dragged out, brought back to where the thumb touched, lifted: cancelled', mcSwipeEnd(S, t + 900, 103, 98) === 'cancel' && !mcFireWaiting(S, t + 900));
  mcSwipeStart(S, t + 1000, 100, 100);
  check('2i a slow drag is the same gesture made carefully: its lift is the shot, however long it took', mcSwipeEnd(S, t + 9000, 100, 30) === 'fire' && !mcWasQuick(S, t + 9000));
  mcFireDone(S);
  mcSwipeStart(S, t + 9100, 100, 100); mcSwipeEnd(S, t + 9200, 140, 60);
  check('2j a flick over in 350 ms is a quick one (helped); the exact edge counts', mcWasQuick(S, t + 9200) && mcWasQuick(S, t + 9100 + MANUAL.QUICK_MS) && !mcWasQuick(S, t + 9101 + MANUAL.QUICK_MS));
  check('2k a lift with no press is nothing', mcSwipeEnd(bow(), t, 0, 500) === 'none' && mcSwipeEnd(null, t, 0, 0) === 'none');
}

// ── 3. no faster than the weapon ──
{
  const t = 50000;
  const S = bow(); S.swingTimer = t;    /* an arrow has just left */
  mcFrame(S, t, 500, 600);
  check('3a how long until it may shoot again', mcReadyIn(S, t + 100) === 400 && !mcReady(S, t + 499) && mcReady(S, t + 500) && mcReadyIn(S, t + 9999) === 0);
  mcSwipeStart(S, t + 80, 100, 100);
  check('3b a flick far too soon shoots nothing', mcSwipeEnd(S, t + 100, 100, 50) === 'early' && !mcFireWaiting(S, t + 100) && S._mc.early === 1 && S._mc.n === 0);
  check('3c ...and costs nothing: the bow is ready when it would have been', mcReady(S, t + 500) && S.swingTimer === t);
  check('3d a flick just outside the kept window is early too', mcAskShot(S, t + 500 - MANUAL.EARLY_MS - 1) === 'early');
  check('3e a flick a moment too soon (180 ms) is kept', mcAskShot(S, t + 500 - MANUAL.EARLY_MS) === 'fire' && mcFireWaiting(S, t + 500 - MANUAL.EARLY_MS));
  check('3f ...it waits for the bow, and a little after for the loop\'s frame', mcFireWaiting(S, t + 500) && mcFireWaiting(S, t + 500 + MANUAL.FIRE_HOLD_MS) && !mcFireWaiting(S, t + 501 + MANUAL.FIRE_HOLD_MS));
  check('3g a sword asks for no shot', mcAskShot(sword(), t) === 'none');
}

// ── 4. a press that ends some other way ──
{
  const S = bow(); const t = 100000;
  mcFrame(S, t, 500, 600);
  mcSwipeStart(S, t, 100, 100); mcSwipeMove(S, t + 10, 100, 40);
  mcAbort(S);
  check('4a the button gone from under the thumb: nothing shot, and the lift that follows is nothing', !mcFireWaiting(S, t + 20) && mcSwipeEnd(S, t + 30, 100, 40) === 'none' && S._mc.n === 0);
  check('4b nothing to drop is nothing', (mcAbort({}), mcAbort(null), true));
}

// ── 5. a sword's stroke ──
{
  const S = sword(); const t = 100000;
  mcFrame(S, t, 500, 600);
  mcSwipeStart(S, t, 100, 100);
  check('5a the press is no stroke; 23 px is not yet one', mcSwipeMove(S, t + 10, 123, 100) === 'none');
  check('5b 24 px from where it touched: a stroke', mcSwipeMove(S, t + 20, 124, 100) === 'swing');
  check('5c the next is measured from where the last ended: back the other way is a stroke each time', mcSwipeMove(S, t + 40, 110, 100) === 'none' && mcSwipeMove(S, t + 60, 96, 100) === 'swing' && mcSwipeMove(S, t + 90, 96, 130) === 'swing');
  check('5d a pause, then a move: followed, not counted', mcSwipeMove(S, t + 90 + MANUAL.SWIPE_MS + 1, 150, 130) === 'none');
  check('5e ...and the stroke after it counts from there', mcSwipeMove(S, t + 400, 150, 100) === 'swing');
  check('5f a lift means nothing to a sword', mcSwipeEnd(S, t + 900, 300, 300) === 'none' && !mcFireWaiting(S, t + 900));
  /* a thumb that drifts: 10 px every 300 ms */
  mcSwipeStart(S, t + 2000, 100, 100);
  const drift = [mcSwipeMove(S, t + 2300, 110, 100), mcSwipeMove(S, t + 2600, 120, 100), mcSwipeMove(S, t + 2900, 130, 100), mcSwipeMove(S, t + 3200, 140, 100)];
  check('5g a thumb that drifts 40 px over a second has made no stroke', drift.every((r) => r === 'none'), drift);
  check('5h no press, no stroke; a bow has none', mcSwipeMove(sword(), t, 500, 500) === 'none' && (() => { const B = bow(); mcSwipeStart(B, t, 0, 0); return mcSwipeMove(B, t + 10, 90, 0) === 'none'; })());
}

// ── 6. a sword too soon ──
{
  const t = 50000;
  const S = sword(t);
  mcFrame(S, t, 500, 600);
  check('6a far too soon: no, counted, and it costs nothing', mcMeleeAsk(S, t + 100) === 'no' && S._mc.early === 1 && mcReadyIn(S, t + 100) === 500 && S.swingTimer === t);
  check('6b ready: yes', mcMeleeAsk(S, t + 600) === 'yes' && mcMeleeAsk(S, t + 60000) === 'yes');
  check('6c a moment too soon: soon -- kept, and due the moment the sword is ready', mcMeleeAsk(S, t + 600 - MANUAL.EARLY_MS) === 'soon' && !mcSwingWaiting(S, t + 599) && mcSwingWaiting(S, t + 600) && mcSwingWaiting(S, t + 600 + MANUAL.FIRE_HOLD_MS));
  check('6d ...not for ever', !mcSwingWaiting(S, t + 601 + MANUAL.FIRE_HOLD_MS));
  mcSwingDone(S);
  check('6e taken once', !mcSwingWaiting(S, t + 600));
  mcMeleeAsk(S, t + 500); S.swingTimer = t + 550;   /* something else swung in between */
  check('6f a kept stroke does not swing a sword that has just swung', !mcSwingWaiting(S, t + 600));
  check('6g a bow is never a sword', mcMeleeAsk(bow(), t + 9999) === 'no' && !mcSwingWaiting(bow(), t));
}

// ── 7. a special ──
{
  const S = bow();
  check('7a not armed to begin with', !mcArmed(S) && mcTakeArmed(S) === false);
  check('7b its button arms it', mcArmToggle(S) === true && mcArmed(S));
  check('7c pressed again, it is disarmed', mcArmToggle(S) === false && !mcArmed(S));
  mcArmToggle(S);
  check('7d the next attack takes it, once', mcTakeArmed(S) === true && !mcArmed(S) && mcTakeArmed(S) === false);
}

// ── 8. no chosen lock ──
{
  check('8a a tap lock, a duel\'s lock and a lock with no source are not kept', !mcLockAllowed({ type: 'monster', src: 'tap' }) && !mcLockAllowed({ type: 'player', id: 'x' }) && !mcLockAllowed({ src: 'lunge' }));
  check('8b the sword\'s own automatic lock is', mcLockAllowed({ type: 'monster', src: 'auto' }) && mcLockAllowed(null));
}

// ── 9. a weapon changed, a shot nobody took, a quick flick's help ──
{
  const S = bow(); const t = 100000;
  mcFrame(S, t, 500, 600);
  mcAskShot(S, t);
  S.rpg.activeSlot = 'melee';
  mcFrame(S, t + 10, 500, 600);
  check('9a another weapon in hand: the shot asked of the last one is gone', !mcFireWaiting(S, t + 10) && S._mc.fireAt === 0);
  S.rpg.activeSlot = 'staff';
  mcFrame(S, t + 20, 800, 600);
  check('9b a staff\'s interval is the staff\'s', (S.swingTimer = t + 20, mcReadyIn(S, t + 320) === 500) && !mcReady(S, t + 819) && mcReady(S, t + 820));
  mcAskShot(S, t + 900);
  mcFrame(S, t + 901 + MANUAL.FIRE_HOLD_MS, 800, 600);
  check('9c a shot the loop could not take (dazed, in the air) is let go, not kept for later', !mcFireWaiting(S, t + 901 + MANUAL.FIRE_HOLD_MS) && S._mc.fireAt === 0);
  const deg = (d) => d * Math.PI / 180;
  const pts = [{ x: 100, y: -10 }, { x: 200, y: 60 }];   /* about -5.7 deg and 16.7 deg from the right */
  check('9d a quick flick is turned to the monster nearest its line, inside 12 degrees', Math.abs(mcAssist(0, 0, 0, pts, 0) - Math.atan2(-10, 100)) < 1e-9);
  check('9e ...the nearer in ANGLE wins, not the nearer in distance', Math.abs(mcAssist(deg(14), 0, 0, pts, 0) - Math.atan2(60, 200)) < 1e-9);
  check('9f nothing within 12 degrees: the flick is left as it was', mcAssist(deg(-40), 0, 0, pts, 0) === deg(-40) && mcAssist(1, 0, 0, [], 0) === 1 && mcAssist(1, 0, 0, null, 0) === 1);
  check('9g a monster out of the bow\'s reach is not turned to', mcAssist(0, 0, 0, pts, 90) === 0 && Math.abs(mcAssist(0, 0, 0, pts, 150) - Math.atan2(-10, 100)) < 1e-9);
  check('9h across the +-180 seam', Math.abs(mcAssist(deg(178), 0, 0, [{ x: -100, y: -5 }], 0) - Math.atan2(-5, -100)) < 1e-9);
}

// ── 10. the wiring ──
{
  const rules = read('../../src/game/manualCombat.js');
  check('10a the rules import nothing (node runs them)', !/^import /m.test(rules));
  check('10b the rules never write the aim: a staff bolt in flight is steered by the held thumb as before',
    !/_aimAngle\s*=|_aiming\s*=|_lastAimAngle\s*=|_facing\s*=/.test(rules));
  const loop = read('../../src/game/monsterCombat.js');
  check('10c the loop: with the switch a shot is a flick\'s (mcFireWaiting), never a held thumb\'s, and no sooner than the weapon\'s interval; without it the gate is what it was',
    /var _wantAtk = _mcOn \? _mcFire : \(S\.autoAttack \|\| _engSwing \|\| _tapAtkNow\);/.test(loop)
    && /&& S\.rpg && _eqWpn && Date\.now\(\) - S\.swingTimer >= effectiveSwingCd \+ _staffCdExtra\) \{/.test(loop)
    && /\(_mcOn \|\| !_flickWait\)/.test(loop));
  check('10d the interval is the weapon\'s own, the staff\'s extra included', /mcFrame\(S, Date\.now\(\), effectiveSwingCd \+ _staffCdExtra,/.test(loop));
  check('10e an armed special is the flick\'s attack when it can go (a bow\'s needs a line), the ordinary shot only if it refused',
    /if \(\(isStaff \|\| _sightOn\) && mcTakeArmed\(S\)\) \{[\s\S]{0,400}specialAttack\(S\)[\s\S]{0,300}_mayLoose = false;/.test(loop));
  check('10f a flick is an arrow, on a line or not; the held bow still waits for its line', /\} else if \(!_sightOn && !_mcFire\) \{/.test(loop));
  const bro = read('../../src/ui/BroTown.jsx');
  check('10g the handlers: a press starts a swipe on the stick and on the disc, a move may be a sword\'s stroke, the lift is judged before the release tidies, a forced end attacks nothing',
    (bro.match(/mcSwipeStart\(stateRef\.current, /g) || []).length === 2 && (bro.match(/=== 'swing'\) mcMeleeSwipe\(\);/g) || []).length === 2
    && (bro.match(/mcFlickEnd\(t\.clientX, t\.clientY\)/g) || []).length === 2 && /if \(manualOn\(\)\) mcAbort\(S\);/.test(bro));
  check('10h no special is flicked, the right click arms, a tap attacks nothing', /if \(_rFlick && !manualOn\(\)\)/.test(bro) && /if \(manualOn\(\)\) \{ mcArmToggle\(S\); return 'armed'; \}/.test(bro) && /if \(!manualOn\(\)\) requestTapAttack\(_tjS, endT\);/.test(bro));
  check('10i a sword\'s stroke: asked first (too soon: nothing), then the lunge, the armed special, or a swing; the press itself never lunges',
    /var ask = mcMeleeAsk\(S, now\);\s*\n\s*if \(ask === 'yes'\) return mcMeleeGo\(S\);/.test(bro) && /if \(_mcP\) return false;\s*\n\s*try \{ return maybeSwordDash\(S\); \}/.test(bro));
  check('10j a computer: each click is one attack (a shot asked at the cursor, or a stroke)', /if \(mcShoots\(S\)\) \{[\s\S]{0,220}mcAskShot\(S, Date\.now\(\)\);\s*\n\s*\} else mcMeleeSwipe\(\);/.test(bro));
  const tg = read('../../src/game/targeting.js');
  check('10k targeting keeps no chosen lock, and no duel lock, with the switch', /if \(manualOn\(\)\) \{\s*\n\s*if \(S\.lockedTarget && !mcLockAllowed\(S\.lockedTarget\)\) S\.lockedTarget = null;\s*\n\s*\} else keepDuelLock\(S\);/.test(tg));
  const btn = read('../../src/ui/panels/SpecialButton.jsx');
  check('10l the special\'s button arms (and shows it), and is there whenever a weapon is in hand', /mcArmToggle\(Sm\)/.test(btn) && /if \(manualOn\(\)\) return true;/.test(btn) && /armed \? 'armed'/.test(btn));
  check('10o the slingshot bow: the stick\'s drag, the disc\'s pull and the lift all turn the shot round through the one rule (mcShotAngle)',
    /if \(manualOn\(\)\) angle = mcShotAngle\(S, angle\);/.test(bro) && /var ang = mcShotAngle\(S, Math\.atan2\(y - oy, x - ox\)\);/.test(bro) && /mcBowSling\(stateRef\.current\) && !bSwipe\.toShield/.test(bro));
  check('10m nothing is drawn for it: the three indicators are gone', !fs.existsSync(new URL('../../src/ui/panels/ManualGauge.jsx', import.meta.url)) && !/ManualGauge/.test(bro) && !/bt-mc-/.test(read('../../src/styles/game.css')));
  const srv = read('../src/combat.js');
  check('10n the worker\'s own floors are untouched by this change (nothing here attacks faster than the held attack did)', /if \(nowTs - cad\.n < 210\) return;/.test(srv));
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
