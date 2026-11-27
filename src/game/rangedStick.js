/* ═══ v2.3.6648: THE RANGED STICK (card PAD part 13: the two buttons, `?manual=5`) ═══
 *
 * The owner, 2026-11-27 (about 16:20 UTC; an iPhone, the two buttons, the
 * game's only player): "I think I want this change: for melee to stay as it
 * is (attacking and locking towards nearest enemy) but [BOW] and magic need
 * to use the right button that turns into the right joystick again where
 * attacks must be used in that directional rotation with no lock on
 * mechanism.  Right now I can run through the [forest] and just hold down
 * the attack button and I'm destroying every monster.  It needs to be more
 * skill based than an auto lock on system for ranged attacks."  Then: "I
 * meant BOW and magic using right button as right joystick".  And: "it's very
 * similar to mechanisms you have already built before.  So hopefully it can
 * be a quick change".
 *
 * So in the two buttons the Attack disc is ONE of two kinds (DISC_KINDS), in
 * ONE field, `S._discKind`, written only by discKindTo (CLAUDE.md section 5:
 * a phase lives in one field with one transition function):
 *
 *   'latch'  a SWORD: today's Attack, whole and untouched -- the sight's pick,
 *            the latch's lock, the 0.6 s hold that turns auto-attack on
 *            (game/latch.js, game/freeAttack.js twoButtonPress);
 *   'stick'  a BOW or a STAFF: the disc IS A STICK.  The thumb goes down on
 *            it and drags; the knob follows inside the disc's well; past the
 *            dead zone (RANGED_STICK.DEAD_PX, the tap's own 10 px) the shot
 *            goes along the thumb, again and again while held -- mode 4's
 *            held stick reused, not rebuilt (BroTown's rJoyAim: S._aimAngle,
 *            S._aiming, S.autoAttack; its cadence, the held bow's sight gate,
 *            the staff's steered bolt: the owner's choice of 2026-11-13; and,
 *            the owner's of 16:35 the same day, a held bow looses with or
 *            without a monster on its line: stickLoose).  A
 *            lift ends it and clears the aim.  A TAP (no drag past the dead
 *            zone) is ONE shot the way the bro faces (tapJump.js
 *            requestTapAttack, on the lift).  NOTHING locks, picks or turns a
 *            shot toward a monster: no sight pick, no latch, no hold, no
 *            yellow or red frame (aimMarks.js), no bow special flown at a
 *            pick (bowSpecialNow.js).
 *   null     off the two buttons (any other scheme, a computer): nothing here
 *            runs, and every line is the one before it.
 *
 * A WEAPON SWAPPED while the thumb is down: the kind changes, and that is
 * the hold's end -- the aim cleared, auto-attack off, no lock or sighting
 * left over, the press spent (its moves and its lift do nothing more).  The
 * next press is the new weapon's kind.
 *
 * `?rangedstick=0` (its row in the switch table) gives one phone today's
 * two-button bow and staff back: a latch, as the sword's.
 *
 * Where it is called (BroTown.jsx gains calls, not logic): the step `input`'s
 * frame (discFrame, in latchFrame's place), the disc's press, drag and lift
 * (discPress, discMove, discLift: each before or after today's own line,
 * and discLiftMissed before the lift's lookup: v2.3.6649),
 * which a sword still runs whole), the disc's look (discLook, in latchLook's
 * place).  Node tests it: tools/guards/ranged-stick.test.mjs.
 */
import { readerFor, sw } from './switches.js';
import { twoButtonsLive, latchLocked, latchTo, latchRelease, latchFrame, latchLook, latchHolds } from './latch.js';
import { sightClear, sightPhase } from './sight.js';

export const DISC_KINDS = Object.freeze(['latch', 'stick']);
/* the stick's dead zone, CSS px from where the thumb went down: the tap's own
   10 px (BroTown TAP_MAX_MOVE_SQ_PX), so a thumb that rolls on a tap never
   aims its roll (mode 4's zone learned that: v2.3.37xx's note at rM) */
export const RANGED_STICK = Object.freeze({ DEAD_PX: 10 });

/** `?rangedstick=0`: the two buttons' bow and staff are a latch again, as
 *  before.  On unless thrown.  `search` is for tests. */
export function rangedStickOn(search) {
  return !(typeof search === 'string' ? readerFor(search).sw('rangedstick') : sw('rangedstick'));
}

/** THE RULE.  `live` the two buttons' one gate (latch.js twoButtonsLive),
 *  `slot` the weapon in hand (S.rpg.activeSlot: 'ranged' the bow, 'staff'
 *  the magic, anything else melee -- the classifier combat branches on),
 *  `on` the switch (rangedStickOn).  'latch' | 'stick', or null off the two
 *  buttons.  Each flag must be exactly true. */
export function discKindFor(live, slot, on) {
  if (live !== true) return null;
  return on === true && (slot === 'ranged' || slot === 'staff') ? 'stick' : 'latch';
}

/** The disc's kind on this phone now: 'latch', 'stick', or null. */
export function discKind(S) {
  const k = S && S._discKind;
  return k === 'latch' || k === 'stick' ? k : null;
}

/* the press in hand: the kind it began as, and whether it has aimed.  A
   gesture's notes (as BroTown's bSwipe), never a state of the game: one
   finger owns the disc (bS) */
const _press = { kind: null, aimed: false };

/** THE ONE WRITER of `S._discKind`.  `kind` one of DISC_KINDS, or null.  A
 *  change from a kind is the hold's end (a weapon swapped, the switch, the
 *  scheme): the aim cleared, auto-attack off, the latch let go with its
 *  hold, the sighting cleared, the press spent.  True when it wrote. */
export function discKindTo(S, kind) {
  if (!S || typeof S !== 'object') return false;
  if (kind !== null && DISC_KINDS.indexOf(kind) < 0) return false;
  const was = discKind(S);
  if (was === kind) return false;
  S._discKind = kind;
  if (was !== null) {
    if (latchLocked(S)) latchTo(S, 'idle', null, 'press');
    latchRelease(S);
    sightClear(S);
    S._aiming = false;
    S.autoAttack = false;
    _press.kind = null;
    _press.aimed = false;
  }
  return true;
}

/** The kind the page wants now (the gate, the weapon in hand, the switch),
 *  written through discKindTo.  Returns the kind. */
export function discSync(S) {
  if (!S || typeof S !== 'object') return null;
  discKindTo(S, discKindFor(twoButtonsLive(), S.rpg ? S.rpg.activeSlot : undefined, rangedStickOn()));
  return discKind(S);
}

/** The step `input`'s read for the two buttons, once a frame, in latchFrame's
 *  place (the same arguments).  A latch: latchFrame's answer, today's.  A
 *  stick: nothing in sight and nothing locked (a lock some other road took
 *  is let go), and null: the held attack is the thumb's (rJoyAim, the lift),
 *  never the frame's.  Off the two buttons: null. */
export function discFrame(S, now, dead, slot, mult, vw, vh) {
  const k = discSync(S);
  if (k === 'latch') return latchFrame(S, now, dead, slot, mult, vw, vh);
  if (k !== 'stick') return null;
  if (latchLocked(S)) latchTo(S, 'idle', null, 'press');
  if (sightPhase(S) !== 'none' || S._sightId != null) sightClear(S);
  return null;
}

/** ATTACK'S PRESS (BroTown's bS, the two buttons), asked BEFORE today's
 *  press: the kind is made current and the press remembers it.  A stick
 *  takes the press and does nothing yet ('stick': BroTown returns; the drag
 *  aims, a lift with no drag is the tap's shot).  A latch: 'latch', and
 *  BroTown goes on to today's press, untouched (freeAttack.js
 *  twoButtonPress, its one call there: free-attack.test 6b).  Off the two
 *  buttons: null. */
export function discPress(S) {
  const k = discSync(S);
  _press.kind = k;
  _press.aimed = false;
  return k;
}

/** Attack's finger moved (dx, dy) CSS px from its press.  A stick's press:
 *  `aim` (BroTown's, handed in) is asked `aim(true)` while the thumb is
 *  inside the dead zone and has not aimed (the knob follows, nothing aims),
 *  else `aim(false)` (rJoyAim: the aim along the thumb and the held attack)
 *  -- 'still' or 'aim'.  Anything else (a latch's press, today's slide
 *  follows in BroTown; a press spent by a swap): null, nothing. */
export function discMove(S, dx, dy, aim) {
  if (_press.kind !== 'stick' || discKind(S) !== 'stick') return null;
  const still = !_press.aimed && !(dx * dx + dy * dy > RANGED_STICK.DEAD_PX * RANGED_STICK.DEAD_PX);
  if (!still) _press.aimed = true;
  if (typeof aim === 'function') aim(still);
  return still ? 'still' : 'aim';
}

/** Attack's finger lifted (or cancelled: `cancel` exactly true, or the page
 *  going away), after BroTown's own release (handleRBtnRelease: the knob
 *  home).  A stick's press: the aim and the held attack let go; a press that
 *  never aimed, lifted (not cancelled), is the tap's ONE shot the way the
 *  bro faces (`tap`: tapJump.js requestTapAttack, handed in) -- 'tap'; one
 *  that aimed, 'aimed'.  Anything else: null (a latch's lift is
 *  twoButtonRelease's, today's). */
export function discLift(S, now, tap, cancel) {
  const p = _press.kind, aimed = _press.aimed;
  _press.kind = null;
  _press.aimed = false;
  if (p !== 'stick' || discKind(S) !== 'stick' || !S) return null;
  S._aiming = false;
  S.autoAttack = latchHolds(S);
  if (aimed) return 'aimed';
  if (cancel === true) return null;
  if (typeof tap === 'function') tap(S, now);
  return 'tap';
}

/** v2.3.6649: A LIFT THE PAGE MISSED (sitting 73's reviewer, reading #2425
 *  after it landed): BroTown's bE returned at its `if (!t) return;` (the
 *  lift's touch not in e.changedTouches) BEFORE the stick's release at its
 *  end, so a bow or a staff whose lift the phone missed KEPT AIMING and the
 *  bow KEPT SHOOTING after the thumb was off, until the next press -- the
 *  hole tag 6548 had closed for the latch (twoButtonRelease above the
 *  lookup: "a 150 ms tap's lift missed it there") and 6648's stick did not
 *  follow.  The owner's rule for the bow (16:35): "keeps shooting as long as
 *  held down" -- so it stops when the thumb lifts, always.
 *
 *  Asked on EVERY touchend and touchcancel bE hears, before that return.
 *  `gone` Attack's finger is not in e.touches (off the screen), `found` the
 *  event's own changedTouches held it, `release` BroTown's knob-home
 *  (handleRBtnRelease('b')).  A stick's press whose finger is gone and whose
 *  lift was missed: released here, once, and let go as a CANCEL (no tap's
 *  shot: when it lifted is not known) -- 'missed'.  A lift whose touch IS
 *  found: nothing here (bE's own line at its end releases it, once), null;
 *  so too a finger still down, a sword's press (twoButtonRelease's, today's)
 *  and a press already spent. */
export function discLiftMissed(S, gone, found, release) {
  if (found === true || gone !== true || _press.kind !== 'stick') return null;
  if (typeof release === 'function') release();
  discLift(S, 0, null, true);
  return 'missed';
}

/** v2.3.6648 (the owner, 2026-11-27, 16:35: "Make it so bow keeps shooting
 *  as long as held down, no matter if there's a monster in front or not"):
 *  may this frame's arrow loose with nothing on its line?  Yes while a bow's
 *  STICK is held and aimed (the thumb past the dead zone: S._aiming and the
 *  held attack, rJoyAim's): a free arrow along the thumb, at the bow's own
 *  cadence (the gate before it).  The bow's sight gate (monsterCombat.js) asks
 *  it through freeAttack.js freeArrowGo; mode 4 and every other scheme keep
 *  their gate (no stick there). */
export function stickLoose(S) {
  return !!S && discKind(S) === 'stick' && !!S.rpg && S.rpg.activeSlot === 'ranged' && S._aiming === true && S.autoAttack === true;
}

/** The disc wears its kind: `data-disc` 'stick' or 'latch' (QA and game.css
 *  read it), and the latch's own look (latchLook: a stick's latch is idle,
 *  so 'off', the raised bevel).  Written only when it changes. */
export function discLook(el, S) {
  if (!el || typeof el.getAttribute !== 'function') return false;
  const k = discKind(S) || 'latch';
  let wrote = false;
  if (el.getAttribute('data-disc') !== k) { el.setAttribute('data-disc', k); wrote = true; }
  return latchLook(el, S) || wrote;
}

/** For the tests: the press in hand ({ kind, aimed }, a copy). */
export function discPressNow() { return { kind: _press.kind, aimed: _press.aimed }; }
