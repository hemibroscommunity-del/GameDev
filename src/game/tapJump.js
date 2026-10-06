/* ═══ v2.3.3087: A TAP ON THE RIGHT STICK JUMPS, WHEN IT HAS NOTHING ELSE TO DO ═══
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
