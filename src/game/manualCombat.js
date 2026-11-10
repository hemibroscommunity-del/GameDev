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
};

/** Which combat this device plays: 1 swipes (the game's own, and the answer
 *  when nothing says otherwise), 2 swipes with the SLINGSHOT BOW, 0 the old
 *  held attack and tap lock.  `?manual=0` / `?manual=2` choose one and are
 *  remembered; `?manual=1` comes back to the game's own and forgets.
 *  `search` and `store` are for tests (location.search, localStorage). */
export function manualMode(search, store) {
  var q = search;
  if (q == null) { try { q = typeof location !== 'undefined' ? location.search : ''; } catch (e) { q = ''; } }
  var ls = store;
  if (ls === undefined) { try { ls = typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { ls = null; } }
  var m = /(?:^|[?&])manual=([012])(?:&|$)/.exec(String(q || ''));
  if (m) {
    try { if (ls) { if (m[1] === '1') ls.removeItem(MANUAL.KEY); else ls.setItem(MANUAL.KEY, m[1]); } } catch (e) { /* a private window: the address still decides this visit */ }
    return +m[1];
  }
  try { var v = ls ? ls.getItem(MANUAL.KEY) : null; return v === '0' ? 0 : v === '2' ? 2 : 1; } catch (e) { return 1; }
}
/** Is manual combat wanted on this device (either kind)?  Yes, unless it chose the old one. */
export function manualCombatWanted(search, store) { return manualMode(search, store) > 0; }

var _mode = null;
/** On for this page (read once; `setManualCombat` is QA's and the tests':
 *  false, true, or 2 for the slingshot bow). */
export function manualOn() {
  if (_mode === null) _mode = manualMode();
  return _mode > 0;
}
/** The slingshot bow's variation (`?manual=2`). */
export function manualSling() { return manualOn() && _mode === 2; }
export function setManualCombat(v) { _mode = v === 2 ? 2 : (v ? 1 : 0); }

function st(S) {
  if (!S) return null;
  if (!S._mc) S._mc = { fireAt: 0, fireUntil: 0, swingUntil: 0, armed: false, need: MANUAL.NEED_DEFAULT_MS, meleeNeed: MANUAL.NEED_DEFAULT_MS, slot: null, n: 0, early: 0, down: false, ox: 0, oy: 0, ot: 0, ax: 0, ay: 0, at: 0 };
  return S._mc;
}
function slotOf(S) { return (S && S.rpg && S.rpg.activeSlot) || 'melee'; }
/** Is this the SLINGSHOT bow (`?manual=2`, a bow in hand)?  Its thumb pulls
 *  BACK from the target and the arrow leaves the other way.  A staff stays a
 *  flick, a sword a stroke. */
export function mcBowSling(S) { return manualSling() && slotOf(S) === 'ranged'; }
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
  if (m.fireAt && now > m.fireUntil) { m.fireAt = 0; m.fireUntil = 0; }
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
}

/** The thumb moved to (x, y).  A SWORD: 'swing' each time it has gone
 *  SWIPE_PX from where its last stroke ended, inside SWIPE_MS (the caller
 *  asks mcMeleeMay and swings); a thumb that drifts is followed, not
 *  counted.  A bow: 'none' -- its shot is the lift.  A staff: 'none'. */
export function mcSwipeMove(S, now, x, y) {
  var m = st(S);
  if (!m || !m.down || !strokes(S)) return 'none';
  if (now - m.at > MANUAL.SWIPE_MS) { m.ax = x; m.ay = y; m.at = now; return 'none'; }
  var dx = x - m.ax, dy = y - m.ay;
  if (dx * dx + dy * dy < MANUAL.SWIPE_PX * MANUAL.SWIPE_PX) return 'none';
  m.ax = x; m.ay = y; m.at = now;
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
  var dx = x - m.ox, dy = y - m.oy, d2 = dx * dx + dy * dy;
  if (d2 < MANUAL.SWIPE_PX * MANUAL.SWIPE_PX) return d2 <= MANUAL.CENTRE_PX * MANUAL.CENTRE_PX ? 'cancel' : 'none';
  return mcAskShot(S, now);
}
/** Was the press that just ended a quick flick (helped: mcAssist), not a
 *  drag that took its time (left as aimed)? */
export function mcWasQuick(S, now) { var m = S && S._mc; return !!m && now - m.ot <= MANUAL.QUICK_MS; }

/** The press ended some other way than a lift (the button went away under
 *  the thumb, the thumb slid on to the shield, the window lost focus):
 *  nothing is attacked. */
export function mcAbort(S) { var m = S && S._mc; if (m) m.down = false; }

/** One shot is asked for (a flick's lift, a computer's click): 'fire' when
 *  the weapon is ready or nearly, else 'early'. */
export function mcAskShot(S, now) {
  var m = st(S);
  if (!m || !mcShoots(S)) return 'none';
  var wait = mcReadyIn(S, now);
  if (wait > MANUAL.EARLY_MS) { m.early += 1; return 'early'; }
  m.fireAt = now; m.fireUntil = now + wait + MANUAL.FIRE_HOLD_MS; m.n += 1;
  return 'fire';
}
/** Is a shot waiting for the loop? */
export function mcFireWaiting(S, now) {
  var m = S && S._mc;
  return !!m && !!m.fireAt && now <= m.fireUntil;
}
/** The loop took it (or found it could not): once only. */
export function mcFireDone(S) { var m = S && S._mc; if (m) { m.fireAt = 0; m.fireUntil = 0; } }

/** A sword's stroke: may it swing now?  'yes'; 'soon' (inside EARLY_MS of
 *  ready: kept, mcSwingWaiting says when); 'no'. */
export function mcMeleeAsk(S, now) {
  if (!S || !strokes(S)) return 'no';
  var m = st(S);
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
      sling: function () { return manualSling(); },
      state: function () {
        var S = window._gameState && window._gameState.current;
        var m = S && S._mc;
        var now = Date.now();
        return m ? { fireAt: m.fireAt, armed: m.armed, need: m.need, meleeNeed: m.meleeNeed, slot: m.slot, shots: m.n, early: m.early || 0, down: !!m.down, readyIn: mcReadyIn(S, now), ready: mcReady(S, now) } : null;
      },
    };
  } catch (e) { /* no window */ }
}
