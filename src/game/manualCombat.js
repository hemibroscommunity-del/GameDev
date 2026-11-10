/* ═══ v2.3.4357: MANUAL COMBAT -- an attack is made by your hand, never a timer ═══
 *
 * The owner, 2026-11-09: "I want to make the system more manual.  I think only
 * making an attack after manual input is better than auto-attacking at
 * precisely the correct interval.  So maybe for bow and magic the system
 * becomes a timing game where the right joystick is held at a certain
 * direction and there's some kind of visual cue of build-up happening ...
 * until it lights up at full draw.  You'll already have your finger pointed
 * towards the enemy (rotation and everything still works the same) but the
 * timing of the attack is based on when you release.  Special attacks now
 * require you to tap the special attack button prior to buildup of the next
 * attack and upon release the special attack is active for that attack.
 * Remove the tap to target system for now ... For melee, keep the invisible
 * targeting system where it automatically faces the closest monster ... the
 * sword will be an icon on the button and need to build up before you tap
 * the button to attack."  And his answers the same day: "I want the timer to
 * reset if the user lets go of the held direction.  The exception to this is
 * melee."  "Hold as long as you like."  "Tapping early does nothing.  You
 * need to tap once it's ready."  "Yes for computer controls."  "Yes duels
 * lose tap lock."  "Don't do any monster adjustments."  "Just keep in mind
 * magic uses your finger to control the projectile once launched so none of
 * the new controls should interfere with that."
 *
 * BEHIND A SWITCH while it is new: `?manual=1` in the address turns it on for
 * this phone or computer (and it stays on: localStorage `bt_manual`);
 * `?manual=0` turns it off again.  Without it combat is exactly as it was.
 *
 * THE RULES (this file: no imports, so node tests it --
 * server/test/manual-combat.test.mjs; BroTown.jsx and monsterCombat.js call
 * it, docs/specs/manual-combat.md says where):
 *
 *   BOW AND STAFF -- a DRAW.  It starts when the thumb (or the mouse button)
 *     goes down, and is FULL after the weapon's own attack interval (the same
 *     number the held attack fired on: `need`, set each frame by the loop).
 *     Turning the aim never resets it.  Held past full it stays full for as
 *     long as you like.
 *       lift at full      -> one shot, at once, the way the thumb last pointed;
 *       lift before full  -> nothing, and the draw is LOST -- unless the thumb
 *                            is back within SLIP_MS (a thumb leaves glass for
 *                            an instant; that is not letting go), when it
 *                            carries on as if it never left;
 *       back to the stick's centre, then lift (a full draw) -> CANCEL: no
 *                            shot.  Inside its dead zone the stick writes no
 *                            aim, so a bolt you are steering does not turn.
 *     A staff bolt in flight is steered by the held thumb exactly as before
 *     (projectiles.js reads S._aiming / S._aimAngle, which this file never
 *     writes): lift to launch, touch again to steer, and the next draw builds
 *     under the same thumb.
 *
 *   MELEE -- NO HOLD.  The sword builds by itself after each swing (the same
 *     interval), and a TAP swings once it is ready.  A tap before that swings
 *     nothing, is not kept for later, and STARTS THE BUILD-UP AGAIN from that
 *     tap (the owner, 2026-11-10, of his own "Tapping early does nothing":
 *     "I also changed my mind about early swing penalty.  I think it should
 *     restart if you tap too early.  Otherwise player just mashes button.
 *     Plus adds a skill element and tension").
 *
 *   A SPECIAL is ARMED by its button (a second press disarms), before or
 *     during the build-up, and the next attack made is the special.
 *
 *   NO TAP-LOCK, for any weapon, duels included.  A sword still faces the
 *     nearest monster by itself (targeting.js's automatic lock).
 *
 * The worker is not changed by this: it already drops a hit that comes sooner
 * than its floors (combat.js, hitproof.js), and a draw can only make a
 * player's shots further apart than the held attack's.  Reading the spacing
 * of those shots as a sign of a script (the owner: "The timing intervals for
 * manual human attacks will give a good fingerprint to identify bots") is the
 * worker's next step, in its own change.
 */

export var MANUAL = {
  /* a thumb back on the glass within this long never left (the owner agreed:
     "a tiny slip allowance ... about a tenth of a second") */
  SLIP_MS: 100,
  /* how close to where the thumb first touched counts as "back at the centre"
     for a cancel: the stick's own dead zone (BroTown rJoyAim, 8 px) */
  CENTRE_PX: 8,
  /* a shot asked for by a lift is the loop's to take on its next frame; one
     it could not take (dazed, in the air, the shield up) is let go after this */
  FIRE_HOLD_MS: 250,
  /* the draw when the loop has not said yet (the first frame of a session) */
  NEED_DEFAULT_MS: 600,
  KEY: 'bt_manual',
};

/** Is manual combat wanted on this device?  `?manual=1` turns it on and is
 *  remembered; `?manual=0` turns it off and forgets.  `search` and `store`
 *  are for tests (location.search, localStorage). */
export function manualCombatWanted(search, store) {
  var q = search;
  if (q == null) { try { q = typeof location !== 'undefined' ? location.search : ''; } catch (e) { q = ''; } }
  var ls = store;
  if (ls === undefined) { try { ls = typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { ls = null; } }
  var m = /(?:^|[?&])manual=([01])(?:&|$)/.exec(String(q || ''));
  if (m) {
    try { if (ls) { if (m[1] === '1') ls.setItem(MANUAL.KEY, '1'); else ls.removeItem(MANUAL.KEY); } } catch (e) { /* a private window: the address still decides this visit */ }
    return m[1] === '1';
  }
  try { return !!ls && ls.getItem(MANUAL.KEY) === '1'; } catch (e) { return false; }
}

var _on = null;
/** On for this page (read once; `setManualCombat` is QA's and the tests'). */
export function manualOn() {
  if (_on === null) _on = manualCombatWanted();
  return _on;
}
export function setManualCombat(v) { _on = !!v; }

function st(S) {
  if (!S) return null;
  if (!S._mc) S._mc = { drawAt: 0, liftAt: 0, fireAt: 0, armed: false, need: MANUAL.NEED_DEFAULT_MS, meleeNeed: MANUAL.NEED_DEFAULT_MS, slot: null, n: 0, earlyAt: 0, early: 0 };
  return S._mc;
}
function slotOf(S) { return (S && S.rpg && S.rpg.activeSlot) || 'melee'; }
/** Does this weapon draw (the bow, the staff)?  A sword does not. */
export function mcDraws(S) { var s = slotOf(S); return s === 'ranged' || s === 'staff'; }

/** The loop says, each frame, how long this weapon's draw is and how long a
 *  sword takes to be ready again; and what time it is (a slip that was not
 *  taken back, a shot nobody took, a weapon changed mid-draw). */
export function mcFrame(S, now, need, meleeNeed) {
  var m = st(S);
  if (!m) return;
  if (need > 0) m.need = need;
  if (meleeNeed > 0) m.meleeNeed = meleeNeed;
  var slot = slotOf(S);
  if (m.slot !== slot) { m.slot = slot; m.drawAt = 0; m.liftAt = 0; m.fireAt = 0; m.earlyAt = 0; }   /* another weapon in hand: its own draw */
  if (m.liftAt && now - m.liftAt > MANUAL.SLIP_MS) { m.drawAt = 0; m.liftAt = 0; }   /* let go for real: the draw is lost */
  if (m.fireAt && now - m.fireAt > MANUAL.FIRE_HOLD_MS) m.fireAt = 0;
}

/** The thumb (or the mouse button) went down.  A draw starts -- or, within
 *  the slip allowance of a lift, carries on.  Nothing for a sword. */
export function mcPress(S, now) {
  var m = st(S);
  if (!m || !mcDraws(S)) return 'none';
  if (m.drawAt && m.liftAt && now - m.liftAt <= MANUAL.SLIP_MS) { m.liftAt = 0; return 'resumed'; }
  if (m.drawAt && !m.liftAt) return 'held';   /* a second finger, a repeated press: the draw under way is the draw */
  m.drawAt = now; m.liftAt = 0;
  return 'started';
}

/** The thumb lifted (or the mouse button came up).  `cancel`: it came back to
 *  the stick's centre first.  Returns 'fire' (a full draw: the loop takes the
 *  shot), 'cancel', 'slip' (not full: lost unless the thumb is back in time)
 *  or 'none'. */
export function mcLift(S, now, cancel) {
  var m = st(S);
  if (!m || !m.drawAt || m.liftAt) return 'none';
  if (!mcDraws(S)) { m.drawAt = 0; return 'none'; }
  if (now - m.drawAt >= m.need) {
    m.drawAt = 0; m.liftAt = 0;
    if (cancel) return 'cancel';
    m.fireAt = now; m.n += 1;
    return 'fire';
  }
  m.liftAt = now;
  return 'slip';
}

/** The press ended some other way than a lift (the button went away under
 *  the thumb, the thumb slid on to the shield, the window lost focus): the
 *  draw is dropped, and nothing is fired. */
export function mcAbort(S) {
  var m = S && S._mc;
  if (!m) return;
  if (m.drawAt && !m.liftAt) m.drawAt = 0;
}

/** Is a shot waiting for the loop (a full draw was just let go)? */
export function mcFireWaiting(S, now) {
  var m = S && S._mc;
  return !!m && !!m.fireAt && now - m.fireAt <= MANUAL.FIRE_HOLD_MS;
}
/** The loop took it (or found nothing to shoot at): once only. */
export function mcFireDone(S) { var m = S && S._mc; if (m) m.fireAt = 0; }

/** How far along the build-up is, 0 to 1: the draw for a bow or a staff (0
 *  with no thumb down), the time since the last swing for a sword. */
export function mcFrac(S, now) {
  var m = st(S);
  if (!m) return 0;
  if (mcDraws(S)) {
    if (!m.drawAt) return 0;
    var t = (m.liftAt || now) - m.drawAt;
    return Math.max(0, Math.min(1, t / Math.max(1, m.need)));
  }
  var since = now - mcMeleeFrom(S);
  return Math.max(0, Math.min(1, since / Math.max(1, m.meleeNeed)));
}
/** Full: a lift now would shoot; a tap now would swing. */
export function mcReady(S, now) { return mcFrac(S, now) >= 1; }

/** When the sword's build-up began: its last swing, or a later tap that came
 *  too early (mcMeleeEarly). */
export function mcMeleeFrom(S) {
  var m = S && S._mc;
  return Math.max((S && S.swingTimer) || 0, (m && m.earlyAt) || 0);
}
/** A sword's tap: may it swing now?  (Asking changes nothing.) */
export function mcMeleeMay(S, now) {
  if (!S || mcDraws(S)) return false;
  var m = st(S);
  return now - mcMeleeFrom(S) >= m.meleeNeed;
}
/** A sword's tap came too early: nothing swings, and the build-up starts
 *  again from this tap -- mashing the button never swings. */
export function mcMeleeEarly(S, now) {
  var m = st(S);
  if (!m || mcDraws(S)) return;
  m.earlyAt = now; m.early = (m.early || 0) + 1;
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
      state: function () {
        var S = window._gameState && window._gameState.current;
        var m = S && S._mc;
        var now = Date.now();
        return m ? { drawAt: m.drawAt, liftAt: m.liftAt, fireAt: m.fireAt, armed: m.armed, need: m.need, meleeNeed: m.meleeNeed, slot: m.slot, shots: m.n, early: m.early || 0, earlyAt: m.earlyAt || 0, frac: mcFrac(S, now), ready: mcReady(S, now) } : null;
      },
    };
  } catch (e) { /* no window */ }
}
