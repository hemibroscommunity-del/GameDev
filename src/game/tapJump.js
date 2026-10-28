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
 * (v2.3.3712: one, game/jump.js, which has none itself.)
 */
import { jumpAirborne } from './jump.js';   /* v2.3.3712: a tap in the air attacks nothing */

/* ═══ v2.3.3712: THE TAP ATTACKS NOW -- THE JUMP IS THE BUTTON'S ═══
 *
 * The owner, 2026-10-28: "I need to figure out how to make it so that the
 * contextual jump button gives the jumps only to the jump button and what to
 * replace it with (maybe just an attack in its place if nothing else is
 * there?)".  The JUMP button has been back under the attack disc for everyone
 * since v2.3.3681, so a tap on the stick no longer jumps at all: jumping is
 * the button's and X's, and the double jump with it.
 *
 * What the tap does when nothing else wants it (the same "nothing else" as
 * before: rightTapBusy, and the forwarded tap reaching "empty space") is ONE
 * ATTACK with the weapon in your hand, the way you face -- one swing, one
 * arrow, one bolt, as one press of the attack disc gives.  It goes through
 * the auto-attack loop like every other attack (monsterCombat, its gate and
 * cadence, the bow's sight gate), asked for by `requestTapAttack` and marked
 * done there (`tapAttackDone`), so the swing is relayed, the bow still looses
 * only at something its line is on, and a tap while the cadence runs waits
 * for it at most TAP_ATTACK_WAIT_MS rather than being dropped.
 *
 * The tap's other jobs still come first, in their old order: a flick (the
 * special), a resource, a character, yourself (chat), a No man's land
 * player, then the forwarded tap (a monster locks, a player's card, a lock let
 * go), then the E key's act here (a door, the bed, a character, a farm step).
 *
 * The tap's old timing stays, for the same reason it was made: a press with
 * no job waits TAP_FREE_MAX_MS as PENDING (settleTapPress), so a tap shows no
 * attack stance before its one attack and a hold past it is the held attack.
 */

/* ═══ v2.3.3105: A RELAXED THUMB'S TAP ═══
 * The owner: "it needs priority near props instead of attack ... a tap should
 * jump."  BroTown's taps were 200 ms long at most and the first swing went at
 * 200 (ATK_PRESS_GRACE_MS), so a tap a little slower than that swung --
 * beside a barrel, at the barrel.  With no job on the right side a tap may now
 * last this long, and the first swing waits as long (S._atkHoldUntil, read by
 * monsterCombat's auto-attack; a drag ends the wait at once).  Taps measured on
 * phones run ~80-250 ms. */
/* v2.3.3712: KEPT for the tap that attacks, and renamed (it was
 * TAP_JUMP_MAX_MS).  The window is what tells a TAP (one attack, the way you
 * face) from a HOLD (the held attack, its own aim ladder): a relaxed thumb's
 * 250 ms tap read as a hold at 200 would turn the body to whatever aim was
 * left over and draw the bow's line for a blink first -- v2.3.3145's flash.
 * So a press with no job still waits this long as PENDING (settleTapPress). */
export const TAP_FREE_MAX_MS = 320;

/* QA, the `?jumpms=` habit (jumpActions.js): `?tapms=` stretches that window
   (200-10000 ms) -- a test page drawing a frame every ~200 ms cannot time a
   250 ms press.  Read once.  v2.3.3283: the cap was 3000, and mp-tapstance
   asks for 6000 (its press holds the thumb down through a screenshot, 4.2 s on
   a busy box): clamped silently to 3 s, that press turned into the attack and
   faced the old aim, and the next step began facing south.  Only a test sets
   this; no player's tap is touched. */
var _tapMs;
export function tapFreeMaxMs() {
  if (_tapMs !== undefined) return _tapMs;
  _tapMs = TAP_FREE_MAX_MS;
  try {
    var m = /(?:^|[?&])tapms=(\d+)/.exec((typeof window !== 'undefined' && window.location && window.location.search) || '');
    if (m) _tapMs = Math.max(200, Math.min(10000, +m[1]));
  } catch (e) { /* no window */ }
  return _tapMs;
}

/**
 * True when the right side has a contextual use for a tap right now, so a
 * tap there must not jump.  `now` in ms.
 * v2.3.3712: ...nor attack once the way you face: the job is the tap's.
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

/* ═══ v2.3.3145: ...AND UNTIL IT IS ONE, THE PRESS IS NOT AN ATTACK ═══
 * The owner: "When you tap jump with bow equipped it shows you and your line
 * of sight facing southward for a brief instant.  Fix.  Same for staff and
 * sword."  v2.3.3105 held back the first SWING of a press with no job
 * (S._atkHoldUntil), but the press still switched the attack on at once
 * (S.autoAttack), and everything else that reads it went on: the body turned
 * to S._aimAngle -- whatever aim was left over, a monster killed a while ago
 * or an earlier drag of the stick (entityRenderer aimAttackActive) -- the
 * bow's sight line and the sword's swing preview were drawn
 * (effectsRenderer), the walk halved and a sprint ended.  For the length of
 * the tap, so for a blink before the jump.
 *
 * So such a press is PENDING (S._atkPending, set by BroTown's
 * handleRBtnPress while the tap's window is open) and becomes the attack only
 * when it turns out to be one: still held when the window closes, or dragged
 * (BroTown rM ends the window).  A release first -- a tap, a jump -- lets go
 * of it, and nothing of the attack was ever shown.  Raising the shield or
 * going into the water lets go of it too, as they let go of the attack.  A
 * hold pays nothing for this: its first swing waited for the window anyway. */

/** Is this press still waiting to see whether it is a tap? */
export function tapPending(S, now) {
  return !!S && (S._atkHoldUntil || 0) > now;
}

/**
 * Once a frame, before anything reads S.autoAttack: a pending press whose
 * window has closed (or that a drag ended) is the attack now.  True on the
 * frame it becomes one.
 */
export function settleTapPress(S, now) {
  if (!S || !S._atkPending) return false;
  if (tapPending(S, now)) return false;
  S._atkPending = false;
  S.autoAttack = true;
  return true;
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
 * v2.3.3712: ...else NULL: no act here, so the tap attacks and the stick
 * wears the weapon in your hand (BroTown's resolver, controlSkin
 * weaponDiscIcon).
 */
export function tapActIcon(kind) {
  /* v2.3.3136: and a bed's step on your farm (desktopControls interactKind) */
  return (kind === 'door' || kind === 'talk' || kind === 'sleep' || (typeof kind === 'string' && kind.indexOf('farm-') === 0)) ? kind : null;
}

/**
 * `?jumpbtn` brings back v2.3.3017's button under the attack disc (for a tab,
 * and the QA scenarios that measure it).  A tap still jumps with it on.
 *
 * v2.3.3681: THE BUTTON IS BACK FOR EVERYONE -- the owner, 2026-10-27: "Also
 * while I'm thinking of it: I want a dedicated button for jumping".  It is
 * drawn unless the address says `?jumpbtn=0` (the game of v2.3.3105-3680, a
 * tap on the stick the only jump); a tap on the stick still jumps beside it.
 * v2.3.3712: no longer -- the button is the only jump, and a tap attacks
 * (`?jumpbtn=0` leaves a phone no jump at all: a QA switch, no player's).
 */
export function jumpButtonWanted(search) {
  try {
    var q = search != null ? search
      : ((typeof window !== 'undefined' && window.location && window.location.search) || '');
    return !/(?:^|[?&])jumpbtn=0(?:&|$)/.test(q);
  } catch (e) {
    return true;
  }
}

/* ═══ v2.3.3712: THE TAP'S ONE ATTACK ═══
 * `requestTapAttack` asks for it on the tap's release (BroTown rE); the
 * auto-attack loop (monsterCombat) takes it as it takes a held thumb, once:
 * the swing, the arrow or the bolt that leaves marks it done
 * (`tapAttackDone`), and so does a bow whose line is on nothing -- the owner's
 * rule since v2.3.2473, "the bow only looses when the line is on something",
 * which a press of the disc keeps too.  Every other refusal of the loop (the
 * cadence still running, the shield, the water, a daze) leaves it waiting up
 * to TAP_ATTACK_WAIT_MS, so a quick second tap is the next swing, never a lost
 * one; past that it is let go ('late').
 *
 * THE WAY YOU FACE: the body's own heading (`tapFacingAngle`): the angle the
 * renderer last turned it to or the walk is taking it to
 * (S._targetFacingAngle; entityRenderer stamps every turn there, v2.3.1837),
 * else the slewing one, else the four-way facing.  Never a lock -- a lock
 * makes the tap busy (rightTapBusy) -- and never the stale S._lastAimAngle a
 * long-gone drag or a dead monster's lock left behind, which is where a bow
 * and staff would otherwise shoot (combatHelpers rangedAimAngle): the tap
 * WRITES its angle there, and into S._aimAngle (the melee preview's), as a
 * drag of the stick does, so every reader of the aim -- the bow's gate and
 * line, the shot, the melee preview -- agrees with it, and a hold right after
 * goes on that way.  The melee sweep reads its aim only while a thumb aims
 * (`_aiming`), so it asks `tapSwingAim` for the tap's swing. */
export const TAP_ATTACK_WAIT_MS = 600;

/** The body's heading, in radians (0 east, PI/2 south: the world's y runs down). */
export function tapFacingAngle(S) {
  if (!S) return Math.PI / 2;
  if (typeof S._targetFacingAngle === 'number' && isFinite(S._targetFacingAngle)) return S._targetFacingAngle;
  if (typeof S._facingAngle === 'number' && isFinite(S._facingAngle)) return S._facingAngle;
  var f = S._facing || 'down';
  return f === 'right' ? 0 : f === 'up' ? -Math.PI / 2 : f === 'left' ? Math.PI : Math.PI / 2;
}

/**
 * Ask for the tap's one attack, the way you face.  False (and nothing asked)
 * when you are in the air (a disc tapped mid-jump attacks nothing either: the
 * loop waits for the landing and the tap is lifted long before) or have no
 * character.  `S._tapAttacks` counts the asks, for QA.
 */
export function requestTapAttack(S, now) {
  if (!S || !S.rpg) return false;
  if (jumpAirborne(S, now)) { S._tapAtkWhy = 'air'; return false; }
  var ang = tapFacingAngle(S);
  S._tapAtk = { at: now, until: now + TAP_ATTACK_WAIT_MS, ang: ang, done: 0, how: null, swingAt: 0 };
  S._tapAtkWhy = null;
  S._aimAngle = ang;
  S._lastAimAngle = ang;
  S._aimSrc = 'tap';
  S._tapAttacks = (S._tapAttacks || 0) + 1;
  return true;
}

/** Is the tap's attack still waiting for the loop to take it? */
export function tapAttackWaiting(S, now) {
  var t = S && S._tapAtk;
  return !!t && !t.done && now < t.until;
}

/**
 * The loop took it (`how`: 'swing', 'arrow', 'bolt', 'special'), or the
 * bow's line was empty ('empty'), or it waited too long ('late').  For a
 * swing pass its start (S.swingTimer) so the sweep knows the swing is the
 * tap's.  Once only.
 */
export function tapAttackDone(S, now, how, swingAt) {
  var t = S && S._tapAtk;
  if (!t || t.done) return;
  t.done = now || 1;
  t.how = how || 'done';
  if (swingAt) t.swingAt = swingAt;
}

/**
 * The aim for the swing under way when it is the tap's (its sweep, its
 * relay and the sword's sheet), else null.
 */
export function tapSwingAim(S) {
  var t = S && S._tapAtk;
  if (!t || !t.swingAt || t.swingAt !== S.swingTimer || typeof t.ang !== 'number') return null;
  return t.ang;
}
