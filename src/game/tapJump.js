/* ═══ v2.3.3105: A TAP ON THE RIGHT STICK JUMPS, WHEN IT HAS NOTHING ELSE TO DO ═══
 *
 * Owner, 2026-10-06: "Try moving jump as tap on right joystick but prioritize
 * other contextual uses for the tap instead of jump first if any apply" --
 * in place of v2.3.3017's smaller button under the attack disc.
 *
 * A tap on the right stick already means a lot (BroTown.jsx rE): a resource
 * under the thumb starts its harvest, a character talks, your own bro opens
 * chat, a monster locks on, another player opens his card -- and while the
 * disc has a job (a monster to fight, a resource in reach, a harvest under
 * way) the thumb presses the disc and not the stick at all.  Every one of
 * those still wins.  A JUMP is what a tap does when none of them applies:
 * the tap reached the canvas's last line, "empty space", and nothing was
 * locked for it to let go of.
 *
 * Decided on the RELEASE, as every tap there is -- a tap, a drag (aim) and a
 * flick (the special) are only told apart when the thumb lifts.  The cost is
 * the tap's own length, under TAP_MAX_DURATION_MS (200 ms), usually ~80.
 *
 * No imports, so the rule can be read by node (test-world-core "jumping").
 */

/* ═══ v2.3.3105: A RELAXED THUMB'S TAP ═══
 * The owner: "it needs priority near props instead of attack ... a tap should
 * jump."  BroTown's taps were 200 ms long at most and the first swing went at
 * 200 (ATK_PRESS_GRACE_MS), so a tap a little slower than that swung --
 * beside a barrel, at the barrel.  With no job on the right side a tap may now
 * last this long, and the first swing waits as long (S._atkHoldUntil, read by
 * monsterCombat's auto-attack; a drag ends the wait at once).  Taps measured on
 * phones run ~80-250 ms. */
export const TAP_JUMP_MAX_MS = 320;

/* QA, the `?jumpms=` habit (jumpActions.js): `?tapms=` stretches that window
   (200-3000 ms) -- a test page drawing a frame every ~200 ms cannot time a
   250 ms press.  Read once. */
var _tapMs;
export function tapJumpMaxMs() {
  if (_tapMs !== undefined) return _tapMs;
  _tapMs = TAP_JUMP_MAX_MS;
  try {
    var m = /(?:^|[?&])tapms=(\d+)/.exec((typeof window !== 'undefined' && window.location && window.location.search) || '');
    if (m) _tapMs = Math.max(200, Math.min(3000, +m[1]));
  } catch (e) { /* no window */ }
  return _tapMs;
}

/**
 * True when the right side has a contextual use for a tap right now, so a
 * tap there must not jump.  `now` in ms.
 */
export function rightTapBusy(S, now) {
  if (!S) return true;
  /* a harvest owns the right side: the press is the gesture */
  if (S._extraction) return true;
  /* the disc is pressable -- a harvest in reach, a monster locked or in the
     perimeter (BroTown's resolver stamps this 400 ms ahead each frame) */
  if ((S._rBtnPressUntil || 0) > now) return true;
  /* a lock (a monster, a duel, No man's land): a tap on empty ground lets it go */
  if (S.lockedTarget) return true;
  return false;
}

/* ═══ v2.3.3105: WHILE YOU ATTACK, THE WEAPON -- NEVER THE JUMP ═══
 * The owner, on the preview: "it just showed the new jump ... even when
 * attacking ... the jump is showing on top of everything".  The JUMP arrow
 * was decided by the CONTEXT alone (nothing to fight, harvest or hold), so a
 * hold or a drag at nothing -- and a bow or staff loosing at a monster it has
 * no lock on (a ranged player is found no targets on purpose) -- attacked
 * under the jump picture.  The attack itself now wins the picture: a thumb
 * held past the tap's window or dragging (aiming), a swing or shot under way,
 * and ATTACK_FACE_MS after the last one, so a fight's beat between swings
 * does not flick the arrow back. */
export const ATTACK_FACE_MS = 1200;

/**
 * True while the player is attacking with the right stick, so it wears the
 * weapon.  `held` is the right stick's thumb being down; `now` in ms.
 */
export function attackingNow(S, held, now) {
  if (!S) return false;
  /* a hold past the tap's window, or a drag (rM ends the window at once) */
  if (held && (S._aiming || !((S._atkHoldUntil || 0) > now))) return true;
  if (S.isSwinging) return true;
  /* swingTimer is stamped by every swing, arrow, bolt and ability */
  var t = S.swingTimer || 0;
  return t > 0 && now - t < ATTACK_FACE_MS;
}

/**
 * v2.3.3105: the right stick's picture (and the tap's act) for what the E
 * key's chain would do here (desktopControls interactKind): a door, the bed,
 * a character -- else the jump.  A resource is the stick's own harvest, so it
 * is not one of these.
 */
export function tapActIcon(kind) {
  return (kind === 'door' || kind === 'talk' || kind === 'sleep') ? kind : 'jump';
}

/**
 * `?jumpbtn` brings back v2.3.3017's button under the attack disc (for a tab,
 * and the QA scenarios that measure it).  A tap still jumps with it on.
 */
export function jumpButtonWanted(search) {
  try {
    var q = search != null ? search
      : ((typeof window !== 'undefined' && window.location && window.location.search) || '');
    return /(?:^|[?&])jumpbtn(?:=|&|$)/.test(q);
  } catch (e) {
    return false;
  }
}
