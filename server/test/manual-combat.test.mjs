/* Manual combat's rules -- v2.3.4395 (src/game/manualCombat.js,
 * docs/specs/manual-combat.md).  The owner: "only making an attack after
 * manual input is better than auto-attacking at precisely the correct
 * interval" -- and, of the draw-and-release it first was, "Try version a":
 * every attack is a swipe.
 *
 *   1. THE SWITCH: ON by default (v2.3.4396); `?manual=0` is the old combat
 *      for one device, remembered; `?manual=1` comes back; `?manual=2` the
 *      slingshot bow.
 *   2. A BOW'S FLICK (a staff is left as it was: 11): thumb down, moved 24 px or more, lifted =
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
 *  11. THE OWNER'S DECISION: a staff swipes nothing (it fires while held,
 *      as before); a flicked bow is a quarter sooner.
 *  10. THE WIRING: the loop, the handlers, targeting and the special's
 *      button read this file; without the switch the loop's gate is what it
 *      was; this file never writes the aim (a staff bolt's steering).
 *  13. v2.3.4520: THE FREE-SWING TRIAL (`?manual=3`, server/src/freeswing.js;
 *      the worker's half is free-swing.test): remembered, its bonus asked by
 *      `?swingbonus=1`; a sword on it swings at once, no sooner than
 *      FREE_GAP_MS, only with caps.freeSwing; the join asks; a lighter
 *      swing's number and sound are lighter; and the wiring.
 *  14. v2.3.4615: THE PERFECT STRIKE (the worker's half is
 *      perfect-strike.test): who judges it (only on the trial against
 *      caps.perfectStrike), the window mirrored, the rising pitch, and the
 *      wiring that stays here (an arrow names its shot, the accent, the
 *      pitch).  v2.3.4800: THE TIMING BAR IS GONE (the owner: "Yes remove
 *      the timing bar.  It needs to be something else entirely"): its files,
 *      its rules, its CSS, its preload and `?timingbar` are checked absent;
 *      readiness is on the blade now (weapon-feel.test). */
import fs from 'node:fs';
import {
  mcPitchStep, mcHitPitch, mcPerfectOn,
  MANUAL, manualCombatWanted, manualMode, manualFreeSwing, swingBonusWanted, freeSwingAsk, mcFreeSwing, mcSwingGapMs, mcNoteSwing, mcHitVol, mcNumberScale, mcLightHit, manualSling, mcBowSling, mcShotAngle, mcSwipes, mcBowInterval, setManualCombat, manualOn, mcFrame, mcSwipeStart, mcSwipeMove, mcSwipeEnd, mcWasQuick, mcPressIdle, mcAbort, mcAskShot,
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
  /* v2.3.4396 (the owner: "Yes do the new combat"): it is the game's combat -- on unless a device says otherwise */
  /* v2.3.4655 (the owner: "Yeah everyone"): the default is the free-swing trial, 3 */
  check('1a ON by default: a new player, with nothing in the address and nothing remembered, plays the free-swing trial', manualCombatWanted('', ls) === true && manualMode('?foo=1', ls) === 3 && ls.getItem(MANUAL.KEY) === null);
  check('1b `?manual=0` is the old combat for this device, and is remembered', manualCombatWanted('?x=2&manual=0', ls) === false && ls.getItem(MANUAL.KEY) === '0' && manualCombatWanted('', ls) === false && manualMode('', ls) === 0);
  check('1c `?manual=3` comes back to the game\'s own, and nothing is left remembered', manualMode('?manual=3', ls) === 3 && ls.getItem(MANUAL.KEY) === null && manualMode('', ls) === 3);
  check('1d a look-alike is not the switch (it chooses nothing: the default stands)', manualMode('?notmanual=0', store()) === 3 && manualMode('?manual=02', store()) === 3 && manualMode('?manual=default', store()) === 3);
  check('1e no storage (a private window): the address still decides, and with nothing in it the default stands', manualCombatWanted('?manual=0', null) === false && manualCombatWanted('', null) === true);
  setManualCombat(true); check('1f the page\'s own answer can be set for a test', manualOn() === true && manualSling() === false); setManualCombat(false);
  /* the slingshot bow's variation: `?manual=2` */
  const l2 = store();
  check('1g `?manual=2` is manual combat with the slingshot bow, and is remembered as that', manualMode('?manual=2', l2) === 2 && manualCombatWanted('', l2) === true && l2.getItem(MANUAL.KEY) === '2' && manualMode('', l2) === 2);
  check('1h `?manual=1` after it is the plain swipes, remembered (v2.3.4655); `?manual=0` after that is the old combat', manualMode('?manual=1', l2) === 1 && l2.getItem(MANUAL.KEY) === '1' && manualMode('', l2) === 1 && manualMode('?manual=0', l2) === 0 && manualMode('', l2) === 0 && manualMode('?manual=4', store()) === 3);   /* v2.3.4520: 3 is the free-swing trial (13) */
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
  check('2a a bow shoots by a flick; a staff and a sword do not', mcShoots(S) && !mcShoots({ rpg: { activeSlot: 'staff' } }) && !mcShoots(sword()) && !mcShoots({ rpg: {} }));
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
  S.rpg.activeSlot = 'ranged';
  mcFrame(S, t + 20, 800, 600);
  check('9b the interval is whatever the loop last said for the weapon in hand', (S.swingTimer = t + 20, mcReadyIn(S, t + 320) === 500) && !mcReady(S, t + 819) && mcReady(S, t + 820));
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

// ── 11. the owner's decision: the staff as it was, the bow a quarter sooner ──
{
  const t = 100000;
  const St = { rpg: { activeSlot: 'staff' }, swingTimer: 0 };
  mcFrame(St, t, 800, 600);
  setManualCombat(true);
  check('11a with the switch a sword and a bow swipe; a staff does not', mcSwipes(sword()) && mcSwipes(bow()) && !mcSwipes(St) && mcSwipes(null));
  setManualCombat(false);
  check('11b without the switch nothing swipes', !mcSwipes(sword()) && !mcSwipes(bow()) && !mcSwipes(St));
  mcSwipeStart(St, t, 100, 100);
  check('11c a staff\'s moving thumb is no stroke, its lift no flick, and it asks for no shot and no swing',
    mcSwipeMove(St, t + 10, 160, 100) === 'none' && mcSwipeEnd(St, t + 20, 160, 100) === 'none' && mcAskShot(St, t + 30) === 'none' && mcMeleeAsk(St, t + 40) === 'no' && !mcFireWaiting(St, t + 40) && !mcSwingWaiting(St, t + 40));
  check('11d a flicked bow\'s next shot comes a quarter sooner than the held bow\'s', mcBowInterval(495) === 371 && mcBowInterval(600) === 450 && MANUAL.BOW_FASTER === 0.75);
  check('11e ...and never sooner than the worker will take a hit on the same monster (210 ms)', mcBowInterval(247) === MANUAL.BOW_MIN_MS && mcBowInterval(200) === MANUAL.BOW_MIN_MS && MANUAL.BOW_MIN_MS > 210);
}

// ── 12. the old way is answered with the new (v2.3.4396) ──
{
  const t = 100000;
  const Sw = sword(); mcFrame(Sw, t, 500, 600);
  mcSwipeStart(Sw, t, 100, 100); mcSwipeEnd(Sw, t + 80, 100, 100);
  check('12a a sword tapped (or held still) made no attack gesture', mcPressIdle(Sw) === true);
  mcSwipeStart(Sw, t + 200, 100, 100); mcSwipeMove(Sw, t + 220, 130, 100); mcSwipeEnd(Sw, t + 240, 130, 100);
  check('12b a sword that stroked did', mcPressIdle(Sw) === false);
  mcSwipeStart(Sw, t + 2000, 100, 100); mcSwipeMove(Sw, t + 2400, 110, 100); mcSwipeMove(Sw, t + 2800, 120, 100); mcSwipeMove(Sw, t + 3200, 130, 100); mcSwipeEnd(Sw, t + 3300, 130, 100);
  check('12c a sword whose thumb only drifted did not', mcPressIdle(Sw) === true);
  const B = bow(); mcFrame(B, t, 500, 600);
  mcSwipeStart(B, t, 100, 100); mcSwipeEnd(B, t + 900, 100, 100);
  check('12d a bow held still and lifted made none', mcPressIdle(B) === true);
  mcSwipeStart(B, t + 1000, 100, 100); mcSwipeMove(B, t + 1020, 100, 50); mcSwipeEnd(B, t + 1040, 100, 50);
  check('12e a bow flicked did', mcPressIdle(B) === false);
  mcSwipeStart(B, t + 2000, 100, 100); mcSwipeMove(B, t + 2100, 100, 40); mcSwipeMove(B, t + 2300, 101, 99); mcSwipeEnd(B, t + 2400, 101, 99);
  check('12f a bow pulled out and brought back to cancel did (it knows the gesture)', mcPressIdle(B) === false);
  const St = { rpg: { activeSlot: 'staff' } }; mcSwipeStart(St, t, 0, 0); mcSwipeEnd(St, t + 50, 0, 0);
  check('12g a staff is never told: its hold and its tap attack as they always did', mcPressIdle(St) === false && mcPressIdle(null) === false && mcPressIdle({}) === false);
}

// ── 13. v2.3.4520: the free-swing trial ──
{
  const ls = store();
  /* v2.3.4655: the trial is the default; `?manual=1` leaves it for the plain swipes and is remembered, `?manual=3` comes back and forgets */
  check('13a the free-swing trial is the default; `?manual=1` is the plain swipes, remembered; `?manual=3` comes back and forgets', manualMode('', ls) === 3 && manualMode('?manual=1', ls) === 1 && ls.getItem(MANUAL.KEY) === '1' && manualMode('', ls) === 1
    && manualMode('?manual=3', ls) === 3 && ls.getItem(MANUAL.KEY) === null && manualMode('', ls) === 3 && manualCombatWanted('', ls) === true);
  const lb = store();
  /* v2.3.4615: the bonus (the perfect strike's) is ON by default on the trial now */
  check('13b v2.3.4615: the bonus is asked by default; `?swingbonus=0` asks without it and is remembered; `?swingbonus=1` comes back',
    swingBonusWanted('', store()) === true && swingBonusWanted('?swingbonus=0', lb) === false && lb.getItem(MANUAL.BONUS_KEY) === '0' && swingBonusWanted('', lb) === false
    && swingBonusWanted('?swingbonus=1', lb) === true && lb.getItem(MANUAL.BONUS_KEY) === null && swingBonusWanted('', lb) === true && swingBonusWanted('?swingbonus=10', store()) === true);
  setManualCombat(true);
  check('13c the join asks nothing off the trial (`?manual=1`), even with the bonus remembered', freeSwingAsk('?swingbonus=1', store()) === 0 && manualFreeSwing() === false);
  setManualCombat(3);
  check('13d on it the join asks 2 (the bonus: v2.3.4615, the default), or 1 with `?swingbonus=0`; it is manual combat (a bow still flicks, no slingshot)',
    freeSwingAsk('', store()) === 2 && freeSwingAsk('?swingbonus=0', store()) === 1 && manualOn() && manualFreeSwing() && !manualSling() && mcSwipes(bow()) && mcShoots(bow()));
  const Sw = sword(10000), B = bow(), St = { rpg: { activeSlot: 'staff' }, swingTimer: 0 };
  check('13e without caps.freeSwing (an old worker, or `freeswing: false`) a sword is the untried swipe: too soon is no, a moment early is kept',
    !mcFreeSwing(Sw) && mcSwingGapMs(Sw) === null && (mcFrame(Sw, 10000, 600, 600), mcMeleeAsk(Sw, 10200)) === 'no' && mcMeleeAsk(Sw, 10500) === 'soon');
  Sw._serverCaps = { freeSwing: 1 }; Sw._mc = null; B._serverCaps = { freeSwing: 1 }; St._serverCaps = { freeSwing: 1 };
  mcFrame(Sw, 10000, 600, 600);
  check('13f with it a sword is on the trial; a bow and a staff never are', mcFreeSwing(Sw) && !mcFreeSwing(B) && !mcFreeSwing(St) && mcSwingGapMs(Sw) === MANUAL.FREE_GAP_MS && mcSwingGapMs(B) === null);
  check('13g FREE_GAP_MS is 150 (the blade lands 120 ms in, the worker counts one swing a 100 ms)', MANUAL.FREE_GAP_MS === 150);
  check('13h a stroke swings at once from FREE_GAP_MS on, never kept for later; sooner it swings nothing',
    mcMeleeAsk(Sw, 10149) === 'no' && mcMeleeAsk(Sw, 10150) === 'yes' && mcMeleeAsk(Sw, 10300) === 'yes' && !mcSwingWaiting(Sw, 10600));
  mcNoteSwing(Sw, 10000, 10150);
  const v1 = mcHitVol(Sw);
  mcNoteSwing(Sw, 10000, 10600);
  check('13i a quarter swing\'s hit sound is lower (0.55), a full one as ever', Math.abs(v1 - 0.55) < 1e-9 && mcHitVol(Sw) === 1, v1);
  check('13j a hit\'s number: a quarter swing 0.7 of its size, a full one (no share, or the bonus\'s 1.12) as ever',
    Math.abs(mcNumberScale(0.25) - 0.7) < 1e-9 && mcNumberScale(undefined) === 1 && mcNumberScale(1.12) === 1 && mcNumberScale(0) === 0.6);
  check('13k a light hit (under FULL_SWING_SHARE, the worker\'s 0.8) rings no crit; a full one, or no share, does',
    MANUAL.FULL_SWING_SHARE === 0.8 && mcLightHit(0.79) && !mcLightHit(0.8) && !mcLightHit(undefined) && !mcLightHit(1.12));
  const srvFs = read('../src/freeswing.js');
  check('13l MIRROR: FULL_SWING_SHARE is the worker\'s own', /FULL_SWING_SHARE: 0\.8,/.test(srvFs));
  /* the wiring */
  const pa = read('../../src/game/playerActions.js');
  check('13m swingAttack holds a sword on the trial to FREE_GAP_MS, else to its own interval, and notes the swing\'s share',
    /var _fsGap = mcSwingGapMs\(S\);\s*\n\s*if \(!S\.rpg \|\| Date\.now\(\) - S\.swingTimer < \(_fsGap != null \? _fsGap : SWING_COOLDOWN \* swingCooldownMult/.test(pa)
    && /mcNoteSwing\(S, S\.swingTimer, Date\.now\(\)\);[^\n]*\n\s*S\.swingTimer = Date\.now\(\);/.test(pa));
  const mc = read('../../src/game/monsterCombat.js');
  check('13n a sword\'s monster_damage names its swing on the trial; its hit sound is the light swing\'s',
    /sw: mcFreeSwing\(S\) \? S\.swingTimer : undefined/.test(mc) && /monsterHitSfx\(m, 0\.55 \* mcHitVol\(S\), 'melee', undefined, mcHitPitch\(S, Date\.now\(\)\)\)/.test(mc));
  const ws = read('../../src/networking/wsClient.js');
  check('13o the join asks (`fs`), and the live switch (free_swing) sets caps.freeSwing',
    /fs: freeSwingAsk\(\) \|\| undefined,/.test(ws) && /case 'free_swing':\s*\n\s*\{\s*\n\s*if \(S\._serverCaps\) S\._serverCaps\.freeSwing = msg\.on \? 1 : 0;/.test(ws));
  const ge = read('../../src/networking/gameEvents.js'), fx = read('../../src/rendering/systems/effectsRenderer.js');
  check('13p the number is sized by the worker\'s share (own, a peer\'s, on a player), and nothing new is drawn',
    (ge.match(/pw: payload\.pw/g) || []).length === 3 && /const k = DMG_SCALE \* \(isDmg \? mcNumberScale\(dmg\.pw\) : 1\);/.test(fx));
  setManualCombat(false);
}

// ── 14. v2.3.4615: the perfect strike (v2.3.4800: the timing bar is gone) ──
{
  const caps = { freeSwing: 1, perfectStrike: 1 };
  const Sw = { rpg: { activeSlot: 'melee', weapon: { type: 'sword' } }, _serverCaps: caps, swingTimer: 0 };
  const B = { rpg: { activeSlot: 'ranged', rangedWeapon: { type: 'bow' } }, _serverCaps: caps, swingTimer: 0 };
  const St = { rpg: { activeSlot: 'staff', staffWeapon: { type: 'staff' } }, _serverCaps: caps, swingTimer: 0 };
  setManualCombat(true);
  check('14b off the trial (`?manual=1`) nothing is judged perfect, and no arrow is named', !mcPerfectOn(B) && !mcPerfectOn(Sw));
  setManualCombat(3);
  check('14c on the trial against caps.perfectStrike the perfect strike is on', mcPerfectOn(B) && mcPerfectOn(Sw));
  const old = { rpg: Sw.rpg, _serverCaps: { freeSwing: 1 } };
  check('14d against a worker that does not judge the perfect strike (no caps.perfectStrike): off', !mcPerfectOn(old));
  check('14e MIRROR: the window is the worker\'s (60 before full, 300 after)', MANUAL.PERFECT_EARLY_MS === 60 && MANUAL.PERFECT_LATE_MS === 300
    && /PERFECT_EARLY_MS: 60,/.test(read('../src/freeswing.js')) && /PERFECT_LATE_MS: 300,/.test(read('../src/freeswing.js')));
  /* v2.3.4800: THE TIMING BAR IS GONE -- every piece of it */
  const gone = ['../../src/ui/panels/TimingBar.jsx', '../../src/ui/panels/timingBarArt.js', '../../src/rendering/timingBarPreload.js', '../../tools/qa/mp/mp-timingbar.mjs']
    .filter((f) => fs.existsSync(new URL(f, import.meta.url)));
  const rules0 = read('../../src/game/manualCombat.js'), css0 = read('../../src/styles/game.css'), bro0 = read('../../src/ui/BroTown.jsx');
  const pa0 = read('../../src/rendering/preloadAnimations.js'), run0 = read('../../tools/qa/mp/run.mjs'), ui0 = read('../../tools/qa/ui-review/states.mjs');
  check('14f THE TIMING BAR IS GONE (the owner: "Yes remove the timing bar"): its files, its rules and `?timingbar`, its CSS, its preload, its mount, its phone test and its review pictures',
    gone.length === 0 && !/export function (mcBarWeapon|mcBarCycle|mcBarTimes|mcBarAttack|timingBarWanted)\b/.test(rules0) && !/BAR_KEY|FREEZE_MS/.test(rules0)
    && !/\.bt-tbar/.test(css0) && !/preloadTimingBar|timingBarPreload/.test(pa0) && !/TimingBar|timingBarFrame/.test(bro0)
    && !/mp-timingbar/.test(run0) && !/timingBarState|__btTimingBar/.test(ui0), gone);
  check('14g ...and the owner\'s drawn sheet stays on disk (his art, not loaded now)', fs.existsSync(new URL('../../public/sprites/timingbar/weapons.png', import.meta.url)));
  check('14h a sword\'s stroke says which way and how fast the thumb went (the cut\'s arc follows it: weapon-feel.test)',
    (() => { const S = sword(0); setManualCombat(3); mcFrame(S, 1000, 600, 600); mcSwipeStart(S, 1000, 100, 100); const r = mcSwipeMove(S, 1040, 130, 100); const k = S._mc.stroke; return r === 'swing' && k && k.dx === 30 && k.dy === 0 && k.ms === 40 && k.x0 === 100 && S._mc.cx === 130; })());
  /* the rising pitch */
  const p = {};
  const steps = [0, 500, 1000, 1010, 1500, 2000, 2500, 3000, 3600, 6000].map((x) => mcPitchStep(p, 100000 + x));
  check('14k THE RISING PITCH: a hit within 1.2 s of the last is a step higher, at most +5; one blow\'s second monster (inside 50 ms) shares its step; a pause is back to 0',
    JSON.stringify(steps) === JSON.stringify([0, 1, 2, 2, 3, 4, 5, 5, 5, 0]), steps);
  const P = { rpg: Sw.rpg, _serverCaps: caps, _mc: null };
  const r1 = mcHitPitch(P, 50000), r2 = mcHitPitch(P, 50400);
  check('14l a semitone a step, on your sword or bow on the trial (2^(1/12)); 1 for a staff, and off the trial',
    r1 === 1 && Math.abs(r2 - Math.pow(2, 1 / 12)) < 1e-12 && mcHitPitch(St, 50400) === 1 && (setManualCombat(true), mcHitPitch(P, 50800)) === 1);
  setManualCombat(false);
  /* the wiring */
  const pj = read('../../src/game/projectiles.js'), ge = read('../../src/networking/gameEvents.js'), gd = read('../../src/data/gameDisplay.js');
  check('14p an arrow on the trial names its shot; a perfect strike plays the drop roll\'s glint quietly (an existing cue); the hit voice takes a pitch',
    /* v2.3.4803: ...and otherwise a gathered bolt's name (staffSw: game/staffFeel.js); v2.3.4802: or a drawn arrow's (bowFeelSw, bow-feel.test §9b); undefined for anything else */
    /sw: \(!isStaffProj && !a\.isSpecial && mcPerfectOn\(S\) && typeof a\._shotTs === 'number'\) \? a\._shotTs\s*\n[\s\S]{0,400}: \(staffSw\(S, a\) \?\? bowFeelSw\(a\)\)\s*\n/.test(pj)
    && /if \(payload\.pf === 1\) cue\('rollWin', 0\.45\);/.test(ge) && /\* \(\(opts && opts\.pitch > 0\) \? opts\.pitch : 1\);/.test(gd)
    && /monsterHitSfx\(m, 0\.6, 'arrow', fx\.snd, mcHitPitch\(S, Date\.now\(\)\)\)/.test(pj));
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
    /* v2.3.4803: the staff's feel's lift (staffFireWaiting, null without it) takes the gate's place for a gathering staff */
    && /&& S\.rpg && _eqWpn && Date\.now\(\) - S\.swingTimer >= \(_sfFire !== null \? STAFF_FEEL\.GAP_MS : effectiveSwingCd \+ _staffCdExtra\)\) \{/.test(loop)
    && /\(_mcOn \|\| !_flickWait\)/.test(loop));
  check('10d the interval is the weapon\'s own, the staff\'s extra included', /mcFrame\(S, Date\.now\(\), effectiveSwingCd \+ _staffCdExtra,/.test(loop));
  check('10e an armed special is the flick\'s attack when it can go (a bow\'s needs a line), the ordinary shot only if it refused',
    /if \(\(isStaff \|\| _sightOn\) && mcTakeArmed\(S\)\) \{[\s\S]{0,400}specialAttack\(S\)[\s\S]{0,300}_mayLoose = false;/.test(loop));
  check('10f a flick is an arrow, on a line or not; the held bow still waits for its line', /\} else if \(!_sightOn && !_mcFire\) \{/.test(loop));
  const bro = read('../../src/ui/BroTown.jsx');
  check('10g the handlers: a press starts a swipe on the stick and on the disc, a move may be a sword\'s stroke, the lift is judged before the release tidies, a forced end attacks nothing',
    (bro.match(/mcSwipeStart\(stateRef\.current, /g) || []).length === 2 && (bro.match(/=== 'swing'\) mcMeleeSwipe\(\);/g) || []).length === 2
    && (bro.match(/mcFlickEnd\(t\.clientX, t\.clientY\)/g) || []).length === 2 && /if \(manualOn\(\)\) mcAbort\(S\);/.test(bro));
  check('10h a sword and a bow: no special is flicked, the right click arms, a tap attacks nothing -- and each asks mcSwipes, so a staff keeps its flick special, its right click and its tap', /if \(_rFlick && !mcSwipes\(stateRef\.current\)( && !_sfEnd)?( && !staffFeelOn\(stateRef\.current\))?\)/.test(bro) && /if \(mcSwipes\(S\)\) \{ mcArmToggle\(S\); return 'armed'; \}/.test(bro) && /if \(!mcSwipes\(_tjS\)( && !_sfEnd)?\) requestTapAttack\(_tjS, endT\);/.test(bro));   /* v2.3.4803: a staff gathering (its feel) has its lift's blast instead (staff-feel.test); v2.3.4799: and its special is its button, a swallowed press's flick too */
  check('10i a sword\'s stroke: asked first (too soon: nothing), then the lunge, the armed special, or a swing; the press itself never lunges',
    /var ask = mcMeleeAsk\(S, now\);\s*\n\s*if \(ask === 'yes'\) return mcMeleeGo\(S\);/.test(bro) && /if \(_mcP\) return false;\s*\n\s*try \{ return maybeSwordDash\(S\); \}/.test(bro));
  check('10j a computer: each click is one attack (a shot asked at the cursor, or a stroke); a staff is left to the lines below', /if \(mcSwipes\(S\)\) \{\s*\n\s*if \(mcShoots\(S\)\) \{[\s\S]{0,520}mcAskShot\(S, Date\.now\(\)\);\s*\n\s*\} else mcMeleeSwipe\(\);/.test(bro));   /* v2.3.4802: room for a drawn bow's press (bow-feel.test §9d) */
  const tg = read('../../src/game/targeting.js');
  check('10k targeting keeps no chosen lock, and no duel lock, with the switch', /if \(manualOn\(\)\) \{\s*\n\s*if \(S\.lockedTarget && !mcLockAllowed\(S\.lockedTarget\)\) S\.lockedTarget = null;\s*\n\s*\} else keepDuelLock\(S\);/.test(tg));
  const btn = read('../../src/ui/panels/SpecialButton.jsx');
  check('10l the special\'s button arms (and shows it), and is there whenever a weapon is in hand', /mcArmToggle\(Sm\)/.test(btn) && /if \(mcSwipes\(S\)\) return true;/.test(btn) && /armed \? 'armed'/.test(btn) && !/manualOn/.test(btn));
  check('10o the slingshot bow: the stick\'s drag, the disc\'s pull and the lift all turn the shot round through the one rule (mcShotAngle)',
    /if \(manualOn\(\)\) angle = mcShotAngle\(S, angle\);/.test(bro) && /var ang = mcShotAngle\(S, Math\.atan2\(y - oy, x - ox\)\);/.test(bro) && /mcBowSling\(stateRef\.current\) && !bSwipe\.toShield/.test(bro));
  check('10p the loop: a staff is not manual at all, and a flicked bow\'s interval is mcBowInterval of the held bow\'s',
    /var _mcOn = manualOn\(\) && _aSlot !== 'staff';\s*\n\s*var _mcDraws = _mcOn && _aSlot === 'ranged';\s*\n\s*if \(_mcDraws\) effectiveSwingCd = mcBowInterval\(effectiveSwingCd\);/.test(loop)
    && /if \(mcSwipes\(stateRef\.current\)\) \{ if \(stateRef\.current\) mcSwipeStart/.test(bro));
  check('10m nothing is drawn for it: the three indicators are gone', !fs.existsSync(new URL('../../src/ui/panels/ManualGauge.jsx', import.meta.url)) && !/ManualGauge/.test(bro) && !/bt-mc-/.test(read('../../src/styles/game.css')));
  /* v2.3.4396: the game's combat -- what tells a player how to attack says the new way, and the old
     scenarios are held to the old combat they were written for */
  const tour = read('../../src/ui/mobile/ControlsTutorial.jsx');
  check('10q the controls tour says swipe, flick and hold, and that a special is armed first', /bodyManual: 'Sword: swipe across it/.test(tour) && /tap the Special button first/.test(tour) && /\(manualOn\(\) && cur\.bodyManual\) \|\| cur\.body/.test(tour));
  check('10r the phone\'s arrow and a computer\'s tips say a sword\'s or a bow\'s special is armed, then made', /'Tap, then attack: your special'/.test(read('../../src/ui/guideArrow.js')) && /mcSwipes\(S\) \? ' Special: then attack<\/span>'/.test(read('../../src/ui/deskTeach.js')));
  check('10s the key list offers the double-click lock only in the old combat', /\['2\\u00d7Click', 'Lock on', 'lock', 'fight'\]/.test(read('../../src/game/deskKeyList.js')) && /lock: !manualOn\(\),/.test(read('../../src/ui/panels/KeyboardHintsPanel.jsx')));
  check('10t the phone tests play the old combat unless they name `manual=` themselves', /const _oldCombat = \(\/\(\?:\^\|&\)manual=\/\.test\(query\) \|\| \/\(\?:\^\|&\)manual=\/\.test\(_env\)\) \? '' : 'manual=0';/.test(read('../../tools/qa/mp/harness.mjs')));
  check('10u a press that made no attack gesture while the button is up for a fight is told the new way, after either touch lift, never over a harvest',
    /if \(!S \|\| !S\.rpg \|\| !S\.player \|\| !mcSwipes\(S\) \|\| !S\._rBtnShown \|\| S\._btnHarvest \|\| S\._extraction\) return;\s*\n\s*if \(!mcPressIdle\(S\)\) return;/.test(bro)
    && (bro.match(/mcFlickEnd\(t\.clientX, t\.clientY\); mcTeach\(\);/g) || []).length === 2 && /'Flick to shoot'\) : 'Swipe to swing'/.test(bro));
  const srv = read('../src/combat.js');
  check('10n the worker\'s own floors are untouched by this change (nothing here attacks faster than the held attack did)', /if \(nowTs - cad\.n < 210\) return;/.test(srv));
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
