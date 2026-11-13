/* ═══ v2.3.4395: MANUAL COMBAT -- an attack is made by your hand, never a timer ═══
 *
 * The owner, 2026-11-09: "I want to make the system more manual.  I think only
 * making an attack after manual input is better than auto-attacking at
 * precisely the correct interval."  "Remove the tap to target system for now
 * ... I think this system will be easily botted and abused.  The timing
 * intervals for manual human attacks will give a good fingerprint to identify
 * bots."  "For melee, keep the invisible targeting system where it
 * automatically faces the closest monster."  "Yes for computer controls."
 * "Yes duels lose tap lock."  "Don't do any monster adjustments."  "Just keep
 * in mind magic uses your finger to control the projectile once launched so
 * none of the new controls should interfere with that."
 *
 * THE THIRD SHAPE OF IT.  The first was a DRAW: hold the stick, a build-up
 * fills over the weapon's interval, let go at full to shoot (a sword: wait
 * for the build-up, then tap).  Its build-up needed something to watch, and
 * nowhere on the screen was right for it: on the attack button ("The thumb
 * covers the indicator and the indicator itself is too subtle"), round the
 * bro ("too obnoxious having it circle the player"), a bar over the joystick
 * ("I don't like it.  Especially for bow and staffs.  Is there any
 * alternatives?  I still like the no lock on monster for bow and staff, but
 * maybe the sword you have to make a swipe motion each attack?").  Offered
 * three ways on, the owner, 2026-11-10: "Try version a" --
 *
 *   EVERY ATTACK IS A SWIPE.  Nothing to wait on, nothing to watch.
 *
 * AND THE OWNER'S DECISION, 2026-11-10, having tried both links: "Ok I think
 * I've decided.  Keep tap to lock on monster off.  Keep the staff the old way
 * (prior to any of these changes) where it keeps auto-attacking as long at
 * the finger is held in whatever direction and you can steer the projectile.
 * For bow keep this new flick mechanism but make attack speed 25% faster (in
 * terms of when the next shot can fire again).  Also for sword keep the new
 * flick mechanism."  So:
 *
 *   A SWORD   a stroke each swing (below);
 *   A BOW     a flick each shot (below), and its interval is BOW_FASTER of
 *             what the held bow's was -- three quarters: a shot a quarter
 *             sooner -- never under BOW_MIN_MS (the worker's own floor is
 *             210 ms a monster: combat.js);
 *   A STAFF   NONE OF THIS: it fires by itself while the thumb is held, its
 *             tap is a bolt, its flick and its button are its special, as
 *             before any of it (mcSwipes says which weapon swipes).  Its
 *             bolt is steered by the held thumb, as ever;
 *   NO LOCK a player chose, for all three.
 *
 * IT IS THE GAME'S COMBAT (v2.3.4396).  Asked whether to switch it on for
 * everyone, the owner, 2026-11-10: "Yes do the new combat".  It was behind
 * `?manual=1` while it was being found (v2.3.4395); now it is ON unless a
 * phone or computer says otherwise: `?manual=0` in the address is the old
 * combat for that device (and it stays: localStorage `bt_manual` '0');
 * `?manual=1` comes back to this; `?manual=2` is the slingshot bow.  The
 * same shape as a memory saver's off-ramp (CLAUDE.md: on by default, with a
 * `?name=0` for one phone).  The phone tests play the old combat unless they
 * ask (tools/qa/mp/harness.mjs adds `manual=0`): hundreds of them drive the
 * held attack and the tap lock directly, and those are still in the game.
 *
 * THE RULES (this file: no imports, so node tests it --
 * server/test/manual-combat.test.mjs; BroTown.jsx and monsterCombat.js call
 * it, docs/specs/manual-combat.md says where):
 *
 *   A SWORD -- each SWIPE of the thumb is one swing: SWIPE_PX of travel
 *     inside SWIPE_MS (a thumb that only drifts is not a swipe), anywhere on
 *     the right side or across the attack button, any direction -- the sword
 *     still faces the nearest monster by itself.  Back and forth without
 *     lifting is a swing each stroke.  A tap swings nothing.
 *
 *   A BOW -- a FLICK: thumb down, moved, lifted SWIPE_PX or more
 *     from where it touched = one shot, the way it moved.  A slow drag is the
 *     same gesture made carefully: the sight turns with the thumb, and the
 *     lift is the shot.  Back to where the thumb started (inside CENTRE_PX),
 *     then lift: no shot.  A tap shoots nothing.  A QUICK flick (QUICK_MS)
 *     is helped a little: its shot turns to a monster within ASSIST_DEG of
 *     the way it pointed (mcAssist) -- a thumb is not a mouse.  A drag that
 *     took its time is left exactly as aimed.
 *     (For one evening a staff flicked too.  It does not now: see above.
 *     projectiles.js reads S._aiming / S._aimAngle to steer its bolt, and
 *     this file never writes either.)
 *
 *   NO FASTER THAN THE WEAPON.  Each weapon keeps its own interval (the same
 *     number the held attack fired on: the loop says it each frame, mcFrame).
 *     A swipe that comes sooner attacks nothing and costs nothing; one that
 *     comes within EARLY_MS of ready is kept for that moment (a thumb is not
 *     a metronome).
 *
 *   THE SLINGSHOT BOW, a variation to try beside it (`?manual=2`; the owner,
 *     2026-11-10: "I'm actually thinking of the pull back and release
 *     slingshot method.  Try adding that as a variation I can try in a new
 *     link (just for bow - magic stays as flick)").  Everything above, but a
 *     BOW's thumb pulls BACK, away from what it shoots at, and the arrow
 *     leaves the opposite way on the lift (mcShotAngle).  While it pulls the
 *     bro and his sight point where the arrow will go.  A staff is still a
 *     flick, a sword still a stroke.
 *
 *   A SPECIAL is ARMED by its button (a second press disarms), and the next
 *     attack made is the special.  A flick never makes one.
 *
 *   A COMPUTER -- each CLICK is one attack, at the cursor.  Holding the
 *     button down attacks once.
 *
 *   NO TAP-LOCK, for any weapon, duels included.  A sword still faces the
 *     nearest monster by itself (targeting.js's automatic lock).
 *
 * The worker is not changed by this: it already drops a hit that comes sooner
 * than its floors (combat.js, hitproof.js), and nothing here attacks faster
 * than the held attack did.  Reading the spacing and the shape of those
 * swipes as a sign of a script is the worker's next step, in its own change.
 *
 * ═══ v2.3.4520: THE FREE-SWING TRIAL (`?manual=3`) ═══
 * The owner, 2026-11-10: "What if the attack speed was uncapped ... but the
 * DPS is prorated by the time elapsed relative to the full swing cycle?"
 * One device: `?manual=3` (remembered; `?manual=1` comes back), and
 * `?swingbonus=1` for the bonus.  The worker does the rest
 * (server/src/freeswing.js); here a sword with caps.freeSwing swings at once,
 * no sooner than FREE_GAP_MS, and a lighter swing's number and sound are
 * lighter.  docs/specs/manual-combat.md "The free-swing trial".
 *
 * ═══ v2.3.4615: THE TIMING BAR AND THE PERFECT STRIKE (the trial's step 2) ═══
 * The owner, 2026-11-10: "rising pitch on quick hits and something that
 * benefits the player if they swipe just around the time their swing is back
 * to full again"; "a sword silhouette laying horizontally that refills as a
 * bar and once the bar reaches the top it glints.  During this glinting must
 * attack to get the bonus.  Same with the bow.  Make the arrow silhouette
 * fill up as the timing bar.  It would need to be north of the right
 * joystick.  For magic I think it should be skipped for now."  And: "the bar
 * freezing in place a moment so you could see where you decided to swing.
 * It doesn't slow down the recovery of the next attack though."  The worker
 * judges the strike (server/src/freeswing.js "THE PERFECT STRIKE"); here are
 * the bar's numbers (mcBar*: the window mirrored, the freeze) and the hit
 * sound's rising pitch (mcHitPitch).  `?swingbonus` is on by default on the
 * trial now (`?swingbonus=0` to compare without).
 *
 * ═══ v2.3.4800: THE TIMING BAR IS GONE ═══
 * The owner, 2026-11-11: "Yes remove the timing bar.  It needs to be
 * something else entirely".  Readiness is shown ON THE WEAPON now (the
 * blade refills and glints: game/weaponFeel.js, game/swordFeel.js,
 * docs/specs/sword-feel.md), so the bar's rules (mcBarWeapon, mcBarCycle,
 * mcBarTimes, mcBarAttack, timingBarWanted, `?timingbar`) went with it.  The
 * perfect strike's window is unchanged (PERFECT_EARLY_MS / PERFECT_LATE_MS);
 * a sword's stroke now also says which way and how fast the thumb went
 * (mcSwipeMove: `stroke`), so the cut's arc can follow it.
 */

export var MANUAL = {
  /* a swipe: this far (CSS px) ... */
  SWIPE_PX: 24,
  /* ...inside this long, for a sword's stroke (a thumb that drifts 24 px in
     a second has not swiped) */
  SWIPE_MS: 280,
  /* how close to where the thumb first touched counts as "back at the centre"
     for a bow's or a staff's cancel: the stick's own dead zone (BroTown
     rJoyAim, 8 px) */
  CENTRE_PX: 8,
  /* a flick this quick from touch to lift is helped to a monster near its
     line; a slower one was aimed, and is left alone */
  QUICK_MS: 350,
  ASSIST_DEG: 12,
  /* a swipe this much too soon is kept until the weapon is ready */
  EARLY_MS: 180,
  /* a shot asked for is the loop's to take on its next frame; one it could
     not take (dazed, in the air, the shield up) is let go after this */
  FIRE_HOLD_MS: 250,
  /* a flicked bow's interval is this much of the held bow's (the owner: "make
     attack speed 25% faster (in terms of when the next shot can fire
     again)"), and never under BOW_MIN_MS: the worker drops a hit sooner than
     210 ms after the last on the same monster (combat.js) */
  BOW_FASTER: 0.75,
  BOW_MIN_MS: 215,
  /* the interval when the loop has not said yet (the first frame of a session) */
  NEED_DEFAULT_MS: 600,
  KEY: 'bt_manual',
  /* v2.3.4520: the free-swing trial (`?manual=3`): a sword swings no sooner
     than this after its last swing.  The blade lands MELEE_CONTACT_MS (120)
     into its swing, and a swing begun sooner would restart it before it
     landed; the worker counts one swing a FREE_SWING.MIN_SWING_GAP_MS (100),
     and the 50 ms between is the network's wobble */
  FREE_GAP_MS: 150,
  /* MIRROR: server/src/freeswing.js FREE_SWING.FULL_SWING_SHARE (the
     free-swing suite pins it): a swing under it is a light one */
  FULL_SWING_SHARE: 0.8,
  /* `?swingbonus=1`, remembered (v2.3.4615: on by default; '0' remembers off) */
  BONUS_KEY: 'bt_swingbonus',
  /* v2.3.4615: THE PERFECT STRIKE'S WINDOW round the full cycle -- MIRROR:
     server/src/freeswing.js FREE_SWING.PERFECT_EARLY_MS / PERFECT_LATE_MS
     (perfect-strike.test pins them).  v2.3.4800: the blade glints for
     exactly it (weaponFeel.js feelPhase) */
  PERFECT_EARLY_MS: 60,
  PERFECT_LATE_MS: 300,
  /* v2.3.4615: THE RISING PITCH -- a hit within PITCH_GAP_MS of your last is
     a semitone higher, PITCH_MAX steps at most; hits within PITCH_SAME_MS
     (one swing's several monsters, an arrow's pierce) share a step */
  PITCH_GAP_MS: 1200,
  PITCH_MAX: 5,
  PITCH_SAME_MS: 50,
};

/* ═══ v2.3.5018: THE HELD ATTACK IS THE GAME'S COMBAT AGAIN ═══
   The owner, 2026-11-13: "I like combat better the old way. You just move
   the right joystick towards the enemy and it attacks as long as it is held
   down. A swipe on the right joystick activates the special attack."  That is
   the old combat (0: the held attack, a flick its special) -- but 0 also has
   the tap lock, which the owner took out on 2026-11-10 ("Remove the tap to
   target system ... easily botted") and has not asked back.  So a fifth
   choice, 4, THE HELD COMBAT: everything 0 does (manualOn() is false, so
   every handler, the loop, the bow and the staff take their old lines),
   but no lock a player chose (tapLockOn() false: a tap or a double click on
   a monster locks nothing, a duel keeps no lock -- targeting.js, BroTown.jsx,
   as in manual combat).  4 is the answer when nothing is chosen; `?manual=4`
   comes back to it and forgets; `?manual=0` (the phone tests' own, harness.mjs)
   is the old combat with its tap lock, remembered; `?manual=1/2/3` the
   swipes, the slingshot bow, the free-swing trial, each remembered now that
   none of them is the default. */
/** Which combat this device plays: 3 the free-swing trial with its timing
 *  bar (the game's own since v2.3.4655, and the answer when nothing says
 *  otherwise), 1 the plain swipes, 2 swipes with the SLINGSHOT BOW, 0 the old
 *  held attack and tap lock.  `?manual=0` / `?manual=1` / `?manual=2` choose
 *  one and are remembered; `?manual=3` comes back to the game's own and
 *  forgets.  `search` and `store` are for tests (location.search,
 *  localStorage).
 *
 *  v2.3.4655: THE TRIAL IS EVERYONE'S.  The owner, 2026-11-11, asked whether
 *  the timing bar should be for everyone, not only `?manual=3`: "Yeah
 *  everyone."  So a device with nothing chosen plays the free-swing trial:
 *  every swipe swings at once for its share, the perfect strike, the timing
 *  bar.  `?manual=1` is the plain swipes (remembered now, since 1 is no
 *  longer the default); the worker's `freeswing: false` takes the trial back
 *  from every phone at once (freeswing.js), and they play the plain swipes.
 *  A device that remembered `3` keeps it; one that remembered nothing (the
 *  old default, or a `?manual=1` that forgot) moves to the trial. */
export function manualMode(search, store) {
  var q = search;
  if (q == null) { try { q = typeof location !== 'undefined' ? location.search : ''; } catch (e) { q = ''; } }
  var ls = store;
  if (ls === undefined) { try { ls = typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { ls = null; } }
  var m = /(?:^|[?&])manual=([01234])(?:&|$)/.exec(String(q || ''));   /* v2.3.4520: + 3, the free-swing trial; v2.3.5018: + 4, the held combat */
  if (m) {
    /* v2.3.5018: 4 (the default) forgets; every other choice is remembered */
    try { if (ls) { if (m[1] === '4') ls.removeItem(MANUAL.KEY); else ls.setItem(MANUAL.KEY, m[1]); } } catch (e) { /* a private window: the address still decides this visit */ }
    return +m[1];
  }
  /* v2.3.4655: nothing remembered was the trial (3); v2.3.5018: it is the held combat (4) */
  try { var v = ls ? ls.getItem(MANUAL.KEY) : null; return v === '0' ? 0 : v === '1' ? 1 : v === '2' ? 2 : v === '3' ? 3 : 4; } catch (e) { return 4; }
}
/** Is manual combat wanted on this device (any kind)?  Yes for the swipes
 *  (1, 2, 3); no for the old combat (0) and the held combat (4, v2.3.5018). */
export function manualCombatWanted(search, store) { var m = manualMode(search, store); return m >= 1 && m <= 3; }

var _mode = null;
/** On for this page (read once; `setManualCombat` is QA's and the tests':
 *  false, true, or 2 for the slingshot bow). */
export function manualOn() {
  if (_mode === null) _mode = manualMode();
  return _mode >= 1 && _mode <= 3;   /* v2.3.5018: 4, the held combat, is not manual */
}
/** v2.3.5018: may a player's tap (or a double click) lock onto a monster, and
 *  a duel keep its lock?  Only in the old combat (`?manual=0`): the swipes and
 *  the held combat keep no lock a player chose (the owner, 2026-11-10). */
export function tapLockOn() {
  if (_mode === null) _mode = manualMode();
  return _mode === 0;
}
/** The slingshot bow's variation (`?manual=2`). */
export function manualSling() { return manualOn() && _mode === 2; }
/** v2.3.4520: the free-swing trial (`?manual=3`). */
export function manualFreeSwing() { return manualOn() && _mode === 3; }
export function setManualCombat(v) { _mode = v === 2 ? 2 : v === 3 ? 3 : v === 4 ? 4 : (v ? 1 : 0); }   /* v2.3.5018: + 4 */

/** One device's remembered on/off: `?<name>=0` turns it off and is
 *  remembered under `key` ('0'), `?<name>=1` forgets; on otherwise. */
function deviceSwitch(name, key, search, store) {
  var q = search;
  if (q == null) { try { q = typeof location !== 'undefined' ? location.search : ''; } catch (e) { q = ''; } }
  var ls = store;
  if (ls === undefined) { try { ls = typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { ls = null; } }
  var m = new RegExp('(?:^|[?&])' + name + '=([01])(?:&|$)').exec(String(q || ''));
  if (m) {
    try { if (ls) { if (m[1] === '0') ls.setItem(key, '0'); else ls.removeItem(key); } } catch (e) { /* the address still decides this visit */ }
    return m[1] === '1';
  }
  try { return !(ls && ls.getItem(key) === '0'); } catch (e) { return true; }
}
/** v2.3.4520: does this device ask for the bonus too?  v2.3.4615: the
 *  perfect strike's, ON by default on the trial: `?swingbonus=0` asks
 *  without it and is remembered, `?swingbonus=1` comes back. */
export function swingBonusWanted(search, store) { return deviceSwitch('swingbonus', MANUAL.BONUS_KEY, search, store); }
/** v2.3.4520: what the join asks the worker (`fs`): 0 nothing, 1 the trial,
 *  2 the trial with the bonus.  An old worker ignores it. */
export function freeSwingAsk(search, store) {
  if (!manualFreeSwing()) return 0;
  return swingBonusWanted(search, store) ? 2 : 1;
}

function st(S) {
  if (!S) return null;
  if (!S._mc) S._mc = { fireAt: 0, fireUntil: 0, swingUntil: 0, armed: false, need: MANUAL.NEED_DEFAULT_MS, meleeNeed: MANUAL.NEED_DEFAULT_MS, slot: null, n: 0, early: 0, down: false, ox: 0, oy: 0, ot: 0, ax: 0, ay: 0, at: 0 };
  return S._mc;
}
function slotOf(S) { return (S && S.rpg && S.rpg.activeSlot) || 'melee'; }
/** Is this the SLINGSHOT bow (`?manual=2`, a bow in hand)?  Its thumb pulls
 *  BACK from the target and the arrow leaves the other way.  A staff stays a
 *  flick, a sword a stroke. */
export function mcBowSling(S) { return (manualSling() || bowHooked(S)) && slotOf(S) === 'ranged'; }   /* v2.3.4802: + the bow's draw (it pulls back too) */
/* ═══ v2.3.4802: THE BOW'S DRAW HOOKS THE BOW'S GESTURE ═══
   The owner's brief (docs/specs/bow-feel.md): thumb down nocks, drag back to
   draw, lift to loose, back to the touch point to let the string down.  The
   draw's rules are game/bowDraw.js and its wiring game/bowFeel.js, which
   hands this file a hook ({ on(S), step(S, ev), gap }) -- so the touch
   handlers that already call mcSwipeStart / Move / End / mcAbort carry it
   with no line of their own, and this file still imports nothing.  With no
   hook, or the hook off (`?bowfeel=0`, a worker without caps.bowDraw, any
   combat but the game's own), every line here is what it was. */
var _bowHook = null;
export function mcSetBowHook(h) { _bowHook = h || null; }
function bowHooked(S) { try { return !!(_bowHook && slotOf(S) === 'ranged' && _bowHook.on(S)); } catch (e) { return false; } }
/** v2.3.4802: is this bow drawn (the bow's feel), not flicked? */
export function mcBowDraws(S) { return bowHooked(S); }
/** The way a shot leaves for a thumb that went `ang` from where it touched:
 *  that way -- or, for the slingshot bow, the opposite. */
export function mcShotAngle(S, ang) { return mcBowSling(S) ? Math.atan2(-Math.sin(ang), -Math.cos(ang)) : ang; }
/** Does this weapon shoot by a FLICK (the bow)?  A sword strokes; a staff
 *  does neither (it fires while held, as it always has). */
export function mcShoots(S) { return slotOf(S) === 'ranged'; }
/** Does this weapon swing by a STROKE (a sword, or bare hands)? */
function strokes(S) { var s = slotOf(S); return s !== 'ranged' && s !== 'staff'; }
/** Is this weapon's attack a SWIPE at all in manual combat (a sword, a bow)?
 *  False for a staff -- and false without the switch.  The handlers ask this
 *  where a staff must be left exactly as it was. */
export function mcSwipes(S) { return manualOn() && slotOf(S) !== 'staff'; }
/** v2.3.4520: is this sword on the free-swing trial now -- the device asked
 *  (`?manual=3`) AND the worker says it can (caps.freeSwing; `freeswing:
 *  false` takes it back, live)?  A bow, a staff: never. */
export function mcFreeSwing(S) {
  return manualFreeSwing() && strokes(S) && !!(S && S._serverCaps && S._serverCaps.freeSwing);
}
/** v2.3.4520: the gap swingAttack holds a sword to on the trial (null: its
 *  own interval, as ever). */
export function mcSwingGapMs(S) { return mcFreeSwing(S) ? MANUAL.FREE_GAP_MS : null; }
/** v2.3.4520: a swing begins (swingAttack, before it stamps S.swingTimer):
 *  its share of a full one on this phone's clock, for its sound only -- the
 *  worker's own clock decides the damage. */
export function mcNoteSwing(S, prev, now) {
  if (!mcFreeSwing(S)) return;
  var m = st(S);
  m.share = prev > 0 ? Math.max(0, Math.min(1, (now - prev) / (m.meleeNeed || MANUAL.NEED_DEFAULT_MS))) : 1;
}
/** v2.3.4520: the volume of a swing's hit sound: a light swing's is lower
 *  (1 off the trial, and for a full swing). */
export function mcHitVol(S) {
  if (!mcFreeSwing(S)) return 1;
  var sh = S && S._mc && typeof S._mc.share === 'number' ? S._mc.share : 1;
  return sh >= 1 ? 1 : 0.4 + 0.6 * sh;
}
/** v2.3.4520: how big a hit's number is drawn, from the share the worker said
 *  (`pw` on monster_hit / pvp_hit): a full swing (none, or the bonus's 1.12)
 *  as ever, a quarter swing 0.7 of it. */
export function mcNumberScale(pw) {
  return (typeof pw === 'number' && pw >= 0 && pw < 1) ? 0.6 + 0.4 * pw : 1;
}
/** v2.3.4520: was it a light swing (no crit ring for it: a crit's extras are
 *  a full swing's)? */
export function mcLightHit(pw) { return typeof pw === 'number' && pw < MANUAL.FULL_SWING_SHARE; }

/** v2.3.4615: is this device on the trial against a worker that judges the
 *  perfect strike (caps.freeSwing, caps.perfectStrike)?  Its arrows' claims
 *  then name their shot (`sw`: projectiles.js), as its sword's swings do. */
export function mcPerfectOn(S) {
  return manualFreeSwing() && !!(S && S._serverCaps && S._serverCaps.freeSwing && S._serverCaps.perfectStrike);
}
/** v2.3.4615: THE RISING PITCH.  `p` is {at, step}: a hit within
 *  PITCH_SAME_MS of the last shares its step, within PITCH_GAP_MS is a step
 *  higher (PITCH_MAX at most), after a pause back to 0.  The step. */
export function mcPitchStep(p, now) {
  var gap = p.at ? now - p.at : Infinity;
  if (gap <= MANUAL.PITCH_SAME_MS) { /* the same blow's other monster */ }
  else if (gap <= MANUAL.PITCH_GAP_MS) p.step = Math.min(MANUAL.PITCH_MAX, (p.step || 0) + 1);
  else p.step = 0;
  if (!(gap <= MANUAL.PITCH_SAME_MS)) p.at = now;
  return p.step || 0;
}
/** v2.3.4615: a hit sound's playback rate for YOUR sword's or bow's hit on
 *  the trial: one semitone a step (1 off the trial, and for a staff). */
export function mcHitPitch(S, now) {
  if (!manualFreeSwing() || !S || slotOf(S) === 'staff') return 1;
  var m = st(S);
  if (!m.pitch) m.pitch = { at: 0, step: 0 };
  return Math.pow(2, mcPitchStep(m.pitch, now) / 12);
}

/** A flicked bow's interval, from the held bow's. */
export function mcBowInterval(heldMs) { return Math.max(MANUAL.BOW_MIN_MS, Math.floor(heldMs * MANUAL.BOW_FASTER)); }

/** The loop says, each frame, how long this weapon's interval is (a bow's or
 *  a staff's, and a sword's); and what time it is (a shot nobody took, a
 *  weapon changed with a swipe waiting). */
export function mcFrame(S, now, need, meleeNeed) {
  var m = st(S);
  if (!m) return;
  if (need > 0) m.need = need;
  if (meleeNeed > 0) m.meleeNeed = meleeNeed;
  var slot = slotOf(S);
  if (m.slot !== slot) { m.slot = slot; m.fireAt = 0; m.fireUntil = 0; m.swingUntil = 0; }   /* another weapon in hand: nothing of the last one's waits */
  if (m.fireAt && now > m.fireUntil && m.fireTry !== 1) { m.fireAt = 0; m.fireUntil = 0; m.fireTry = 0; }   /* v2.3.4799: a drawn bow's loose waits for the loop's first chance (mcFireChance) */
  if (m.swingUntil && now > m.swingUntil) m.swingUntil = 0;
}

/** How long until this weapon may attack again (0: now).  Measured from its
 *  last attack (S.swingTimer, which every swing and shot stamps). */
export function mcReadyIn(S, now) {
  var m = st(S);
  if (!m) return 0;
  var need = mcShoots(S) ? m.need : m.meleeNeed;
  return Math.max(0, need - (now - ((S && S.swingTimer) || 0)));
}
export function mcReady(S, now) { return mcReadyIn(S, now) === 0; }

/** The thumb went down at (x, y): a swipe may start here. */
export function mcSwipeStart(S, now, x, y) {
  var m = st(S);
  if (!m) return;
  m.down = true; m.ox = x; m.oy = y; m.ot = now; m.ax = x; m.ay = y; m.at = now;
  m.strokes = 0; m.far = 0;   /* what this press has made so far (mcPressIdle) */
  if (bowHooked(S)) _bowHook.step(S, { type: 'down', now: now, x: x, y: y });   /* v2.3.4802: the nock */
}

/** The thumb moved to (x, y).  A SWORD: 'swing' each time it has gone
 *  SWIPE_PX from where its last stroke ended, inside SWIPE_MS (the caller
 *  asks mcMeleeMay and swings); a thumb that drifts is followed, not
 *  counted.  A bow: 'none' -- its shot is the lift.  A staff: 'none'. */
export function mcSwipeMove(S, now, x, y) {
  var m = st(S);
  if (!m || !m.down) return 'none';
  var fx = x - m.ox, fy = y - m.oy, f2 = fx * fx + fy * fy;
  if (f2 > (m.far || 0)) m.far = f2;   /* the farthest this thumb has been from where it touched */
  if (bowHooked(S)) _bowHook.step(S, { type: 'move', now: now, x: x, y: y });   /* v2.3.4802: the draw, or the string let down */
  if (!strokes(S)) return 'none';
  m.cx = x; m.cy = y;   /* v2.3.4800: where the thumb is now (swordFeel.js: the arc keeps following it) */
  if (now - m.at > MANUAL.SWIPE_MS) { m.ax = x; m.ay = y; m.at = now; return 'none'; }
  var dx = x - m.ax, dy = y - m.ay;
  if (dx * dx + dy * dy < MANUAL.SWIPE_PX * MANUAL.SWIPE_PX) return 'none';
  /* v2.3.4800: the stroke, for the cut's arc (weaponFeel.js feelArc): where
     it started, which way it went and how long it took -- the arc follows
     the thumb, forehand or backhand, sweep or flick */
  m.stroke = { x0: m.ax, y0: m.ay, dx: dx, dy: dy, ms: Math.max(1, now - m.at), at: now };
  m.ax = x; m.ay = y; m.at = now;
  m.strokes = (m.strokes || 0) + 1;
  return 'swing';
}

/** The thumb lifted at (x, y).  A BOW: 'fire' when it is
 *  SWIPE_PX or more from where it touched and the weapon is ready (or will
 *  be inside EARLY_MS: the loop takes the shot then); 'early' when the
 *  weapon is not; 'cancel' when it came back to the centre having left it;
 *  'none' for a tap.  A sword, a staff: 'none'.  `quick` in the answer's second word
 *  is the caller's to ask (mcWasQuick). */
export function mcSwipeEnd(S, now, x, y) {
  var m = st(S);
  if (!m || !m.down) return 'none';
  m.down = false;
  if (!mcShoots(S)) return 'none';
  /* v2.3.4802: a drawn bow looses on the lift wherever the pull ended past
     the centre (a quick flick back is a light draw); a nock let go, a string
     let down, is no shot */
  if (bowHooked(S)) { var _bs = _bowHook.step(S, { type: 'up', now: now, x: x, y: y }); return _bs === 'loose' ? mcAskShot(S, now) : _bs === 'cancel' ? 'cancel' : 'none'; }
  var dx = x - m.ox, dy = y - m.oy, d2 = dx * dx + dy * dy;
  if (d2 < MANUAL.SWIPE_PX * MANUAL.SWIPE_PX) return d2 <= MANUAL.CENTRE_PX * MANUAL.CENTRE_PX ? 'cancel' : 'none';
  return mcAskShot(S, now);
}
/** Did the press that just ended make NO attack gesture at all -- a tap or a
 *  hold, the old combat's way?  A sword: no stroke.  A bow: the thumb never
 *  went a flick's length from where it touched (a pull brought back to cancel
 *  is a gesture; a still thumb is not).  The caller teaches the new way
 *  ("Swipe to swing", "Flick to shoot").  Never for a staff. */
export function mcPressIdle(S) {
  var m = S && S._mc;
  if (!m || slotOf(S) === 'staff') return false;
  if (mcShoots(S)) return (m.far || 0) < MANUAL.SWIPE_PX * MANUAL.SWIPE_PX;
  return !(m.strokes > 0);
}
/** Was the press that just ended a quick flick (helped: mcAssist), not a
 *  drag that took its time (left as aimed)? */
export function mcWasQuick(S, now) { var m = S && S._mc; return !!m && now - m.ot <= MANUAL.QUICK_MS; }

/** The press ended some other way than a lift (the button went away under
 *  the thumb, the thumb slid on to the shield, the window lost focus):
 *  nothing is attacked. */
export function mcAbort(S) {
  var m = S && S._mc;
  if (m) m.down = false;
  if (m && bowHooked(S)) _bowHook.step(S, { type: 'abort', now: Date.now() });   /* v2.3.4802: no shot, the string let down */
}

/** One shot is asked for (a flick's lift, a computer's click): 'fire' when
 *  the weapon is ready or nearly, else 'early'. */
export function mcAskShot(S, now) {
  var m = st(S);
  if (!m || !mcShoots(S)) return 'none';
  /* v2.3.4802: a drawn bow looses at once, for its share (the worker's
     drawgather.js) -- only never sooner than the hook's gap after the last */
  if (bowHooked(S)) {
    if (now - ((S && S.swingTimer) || 0) < (_bowHook.gap || MANUAL.FREE_GAP_MS)) { m.early += 1; return 'early'; }
    m.fireAt = now; m.fireUntil = now + MANUAL.FIRE_HOLD_MS; m.n += 1;
    m.fireTry = 1;   /* v2.3.4799: the loop's next frame gets its chance, however late (mcFireChance) */
    return 'fire';
  }
  var wait = mcReadyIn(S, now);
  if (wait > MANUAL.EARLY_MS) { m.early += 1; return 'early'; }
  m.fireAt = now; m.fireUntil = now + wait + MANUAL.FIRE_HOLD_MS; m.n += 1;
  m.fireTry = 0;
  return 'fire';
}
/** Is a shot waiting for the loop?  v2.3.4799: a drawn bow's loose also
 *  while the loop has not had its first chance at it (`fireTry` 1), however
 *  late that frame comes -- the staff's rule (staffFeel.js
 *  staffFireWaiting).  A slow page draws a frame every few hundred ms, and a
 *  loose lost to that is "I let go and nothing happened" (the combined
 *  feel's review, N3).  The flick bow keeps its FIRE_HOLD_MS, as before. */
export function mcFireWaiting(S, now) {
  var m = S && S._mc;
  return !!m && !!m.fireAt && (now <= m.fireUntil || m.fireTry === 1);
}
/** v2.3.4799: the loop has had its chance at the waiting loose (bowFeelFrame
 *  calls it once a frame, after the combat step): from now on it waits only
 *  its FIRE_HOLD_MS (a shot the loop refused -- the shield up, in the air --
 *  is let go after it, as before). */
export function mcFireChance(S) { var m = S && S._mc; if (m && m.fireTry === 1) m.fireTry = 2; }
/** The loop took it (or found it could not): once only. */
export function mcFireDone(S) { var m = S && S._mc; if (m) { m.fireAt = 0; m.fireUntil = 0; m.fireTry = 0; } }

/** A sword's stroke: may it swing now?  'yes'; 'soon' (inside EARLY_MS of
 *  ready: kept, mcSwingWaiting says when); 'no'. */
export function mcMeleeAsk(S, now) {
  if (!S || !strokes(S)) return 'no';
  var m = st(S);
  /* v2.3.4520: the free-swing trial: at once, never kept for later -- only
     not sooner than FREE_GAP_MS after the last swing */
  if (mcFreeSwing(S)) {
    if (now - ((S && S.swingTimer) || 0) < MANUAL.FREE_GAP_MS) { m.early += 1; return 'no'; }
    return 'yes';
  }
  var wait = mcReadyIn(S, now);
  if (wait === 0) return 'yes';
  if (wait <= MANUAL.EARLY_MS) { m.swingUntil = now + wait + MANUAL.FIRE_HOLD_MS; return 'soon'; }
  m.early += 1;
  return 'no';
}
/** A sword's stroke that came a moment early: is it due now? */
export function mcSwingWaiting(S, now) {
  var m = S && S._mc;
  return !!m && !!m.swingUntil && now <= m.swingUntil && strokes(S) && mcReadyIn(S, now) === 0;
}
export function mcSwingDone(S) { var m = S && S._mc; if (m) m.swingUntil = 0; }

/** A quick flick's help: the way to the monster nearest the flick's line,
 *  if one is within ASSIST_DEG of it and `reach` px of (px, py); else the
 *  flick's own angle.  `pts` is [{x, y}] -- where a shot at each would be
 *  aimed (the caller's: this file knows no monsters). */
export function mcAssist(ang, px, py, pts, reach) {
  var best = ang, bestOff = MANUAL.ASSIST_DEG * Math.PI / 180;
  if (!pts) return ang;
  for (var i = 0; i < pts.length; i++) {
    var p = pts[i];
    if (!p) continue;
    var dx = p.x - px, dy = p.y - py;
    if (reach > 0 && dx * dx + dy * dy > reach * reach) continue;
    var a = Math.atan2(dy, dx);
    var off = Math.abs(Math.atan2(Math.sin(a - ang), Math.cos(a - ang)));
    if (off <= bestOff) { bestOff = off; best = a; }
  }
  return best;
}

/** The special's button: arm it for the next attack, or disarm it. */
export function mcArmToggle(S) { var m = st(S); if (!m) return false; m.armed = !m.armed; return m.armed; }
export function mcArmed(S) { return !!(S && S._mc && S._mc.armed); }
/** The attack being made takes the armed special (true once, then disarmed). */
export function mcTakeArmed(S) { var m = S && S._mc; if (!m || !m.armed) return false; m.armed = false; return true; }

/** A lock a player CHOSE (a tap, a click, a duel's): manual combat keeps
 *  none.  The sword's own automatic lock (`src: 'auto'`) stays. */
export function mcLockAllowed(lock) { return !lock || lock.src === 'auto'; }

/* QA (mp-manualcombat): what the rules hold right now */
if (typeof window !== 'undefined') {
  try {
    window.__btManual = {
      on: function () { return manualOn(); },
      mode: function () { if (_mode === null) _mode = manualMode(); return _mode; },   /* v2.3.5018 */
      tapLock: function () { return tapLockOn(); },   /* v2.3.5018 */
      sling: function () { return manualSling(); },
      free: function () { return manualFreeSwing(); },   /* v2.3.4520 */
      /* v2.3.4615: the UI review can put its one page on the trial (what
         `?manual=3` does at load; the worker is not asked, so nothing it
         judges changes) */
      set: function (v) { setManualCombat(v); },
      state: function () {
        var S = window._gameState && window._gameState.current;
        var m = S && S._mc;
        var now = Date.now();
        return m ? { fireAt: m.fireAt, armed: m.armed, need: m.need, meleeNeed: m.meleeNeed, slot: m.slot, shots: m.n, early: m.early || 0, down: !!m.down, readyIn: mcReadyIn(S, now), ready: mcReady(S, now) } : null;
      },
    };
  } catch (e) { /* no window */ }
}
