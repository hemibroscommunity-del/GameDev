/* ═══ v2.3.6540: THE ATTACK LATCH (card CT PR 1: the two-button trial, mode 5) ═══
 *
 * The owner, 2026-11-23: "The attack button should be beveled and when
 * pressed it stays activated until out of range or the button is pressed
 * again.  The idea behind this is that the majority of combat will consist of
 * delivering combos of special attacks, jumps, and blocking instead of
 * managing the direction or smashing the attack button.  It will lock on
 * target while combat is active."
 *
 * Mode 5 of manualCombat.js only.  Two phases, `idle` and `active`:
 *
 *   a press, a monster sighted   -> active: the target locked (its id the
 *                                   note `S._latchId`); the caller faces it
 *                                   and attacks at the weapon's own rate
 *   a press, nothing sighted     -> stays idle: ONE attack the way the body
 *                                   faces, as a tap is today ('once')
 *   a press while active         -> idle                        (end 'press')
 *   the target past the `out`
 *     range (sight.js sightRange: the sword's 440 held out to 550)
 *                                -> idle                        (end 'range')
 *   the target dead (or gone), none other sighted
 *                                -> idle                        (end 'killed')
 *   the target dead, others sighted -> the lock MOVES to the nearest of them,
 *                                   still active, no new press  ('moved')
 *   your death                   -> idle                        (end 'death')
 *   a change of place, a rejoin  -> idle                        (end 'zone')
 *
 * Those are the latch's five ends (LATCH_ENDS), and the one move.
 *
 * THE PHASE (CLAUDE.md section 5): `S._latchPhase`, 'idle' | 'active',
 * written only by latchTo (the phase table's `latch` row; server/test/
 * latch.test.mjs fails a second writer).  Its notes: the locked id
 * (`S._latchId`) and the last end's word (`S._latchEnd`, for QA).
 *
 * v2.3.6542 (card CT PR 3): WIRED.  The frame (latchFrame, the step
 * `input`: game/frameSteps.js) sights, checks the lock and says whether the
 * held attack is on; Attack's press (latchAttackPress) sights afresh and
 * presses; the disc wears the phase (latchLook: data-latch, game.css's
 * bevel).  The lock itself is targeting.js updateTargeting's, the one writer
 * of S.lockedTarget, which in this mode locks the latch's id and nothing
 * else.  The held attack is the field the mode 4 press writes (S.autoAttack):
 * BroTown writes what latchFrame and latchAttackPress return, and a lifted
 * thumb (handleRBtnRelease) leaves it as latchHolds says.
 *
 * Three imports, sight.js, and manualCombat.js and deviceProfile.js for the one gate (twoButtonsLive; v2.3.6542): node tests it
 * (server/test/latch.test.mjs).
 */
import { sightPick, sightStep, sightClear, sightRange, drawnFace } from './sight.js';   /* v2.3.6542 */
import { twoButtonsOn } from './manualCombat.js';   /* v2.3.6542 (sitting 60): the one gate, twoButtonsLive, below */
import { fineInput } from './deviceProfile.js';

/** v2.3.6542 (the gatekeeper's sitting 60): THE ONE GATE every site of the
 *  two buttons asks: chosen (`?manual=5`) AND a touch screen's main pointer
 *  (the card: touch only, a computer's keys and mouse do not change).  The
 *  gate was split: the Attack press asked twoButtonsOn() alone, the frame
 *  (latchFrame) and the lock asked it with !fineInput(), so on a touch screen
 *  with a mouse a press latched, set the held attack, and nothing ended it.
 *  Here, not in manualCombat.js, whose rules import nothing
 *  (manual-combat.test 10a).  server/test/latch.test.mjs H2 reads every
 *  caller of twoButtonsOn off the syntax tree (an ALLOW list: this gate). */
export function twoButtonsLive() {
  return twoButtonsOn() && !fineInput();
}

export const LATCH_PHASES = Object.freeze(['idle', 'active']);
export const LATCH_ENDS = Object.freeze(['press', 'range', 'killed', 'death', 'zone']);

/** The latch's phase on this phone: 'idle' when nothing has written it. */
export function latchPhase(S) {
  return (S && S._latchPhase) || 'idle';
}

/** THE ONE WRITER of `S._latchPhase` and its notes.  `id` the locked
 *  monster's (active), `end` one of LATCH_ENDS (to idle).  True when it
 *  wrote. */
export function latchTo(S, phase, id, end) {
  if (!S || typeof S !== 'object' || LATCH_PHASES.indexOf(phase) < 0) return false;
  if (phase === 'active') {
    if (id == null || id === '') return false;
    S._latchPhase = 'active';
    S._latchId = id;
    S._latchEnd = null;
    return true;
  }
  if (LATCH_ENDS.indexOf(end) < 0) return false;
  if (latchPhase(S) !== 'active') return false;
  S._latchPhase = 'idle';
  S._latchId = null;
  S._latchEnd = end;
  return true;
}

/** Attack pressed.  `sightedId` the monster in sight (sight.js), or null.
 *  Returns what the press did: 'lock' (now active), 'unlock' (ended:
 *  'press'), or 'once' (nothing sighted: one attack the way the body
 *  faces). */
export function latchPress(S, sightedId) {
  if (latchPhase(S) === 'active') { latchTo(S, 'idle', null, 'press'); return 'unlock'; }
  if (sightedId != null && sightedId !== '' && latchTo(S, 'active', sightedId)) return 'lock';
  return 'once';
}

/** A frame while active.  `target` the locked monster now: { alive, d }, or
 *  null when it is gone; `out` its weapon's `out` range (sightRange);
 *  `others` the OTHER monsters in sight, [{ id, d }].  Returns null (still
 *  locked on the same one), 'moved' (the lock moved to the nearest other),
 *  or the end's word. */
export function latchCheck(S, target, out, others) {
  if (latchPhase(S) !== 'active') return null;
  if (!target || !target.alive) {
    let next = null;
    for (const o of Array.isArray(others) ? others : []) {
      if (!o || o.id == null || o.id === S._latchId || !(o.d >= 0)) continue;
      if (!next || o.d < next.d) next = o;
    }
    if (next) { latchTo(S, 'active', next.id); return 'moved'; }
    latchTo(S, 'idle', null, 'killed');
    return 'killed';
  }
  if (!(target.d <= out)) { latchTo(S, 'idle', null, 'range'); return 'range'; }   /* v2.3.6540: written so a distance that is not a number lets go too (the gatekeeper's sitting 56) */
  return null;
}

/** Your death ('death') or a change of place, a rejoin ('zone'): the latch
 *  lets go.  True when it was active. */
export function latchClear(S, why) {
  return latchTo(S, 'idle', null, why === 'death' ? 'death' : 'zone');
}

/* ═══ v2.3.6542: WIRED (card CT PR 3) ═══ */

/* the range the last frame sighted with (latchFrame's), for the press: the
   frame runs before any touch is read again */
let _range = sightRange('melee');
/* the place the last frame was in: a change is the end 'zone' */
let _zoneWas;
/* the locked monster, read each frame into one object (no garbage a frame) */
const _T = { alive: false, d: NaN };

function findMon(mons, id) {
  if (!Array.isArray(mons) || id == null) return null;
  const k = String(id);   /* String() both sides: ids are numbers in some spawn paths, strings over the wire (targeting.js lockRefPresent) */
  for (let i = 0; i < mons.length; i++) { const m = mons[i]; if (m && m.id != null && String(m.id) === k) return m; }
  return null;
}
function monUp(m) { return !!m && !!m.alive && !(typeof m.curHp === 'number' && m.curHp <= 0); }

/** The sighting now, from the drawn facing over S.monsters: sightPick's (one
 *  reused object) or null. */
export function sightNow(S, range) {
  if (!S || !S.player) return null;
  return sightPick(S.player, drawnFace(S), S.monsters, range || _range, S._sightId == null ? null : S._sightId);
}

/** Is the latch's attack held now?  Active, and nothing that holds an attack
 *  off today: the shield up, a harvest, a climb, a swim (each lets go of
 *  S.autoAttack where it is; the latch picks it up again after).  False when
 *  the latch is idle, so in any other mode a lift lets go as it did. */
export function latchHolds(S) {
  if (latchPhase(S) !== 'active') return false;
  return !S._shieldUp && !S._extraction && !S._climb && !(S._wheelSwim && S._wheelSwim.on);
}

/** The step `input`'s read for the two buttons, once a frame.  `dead` your
 *  death this frame; `slot` the active weapon's (S.rpg.activeSlot), `mult`
 *  its range multiplier.  Sights (sight.js sightStep), checks the lock
 *  (latchCheck: its ends and the move) and returns what the held attack
 *  should be: true (attacking), false (let go: an end, or held off), or null
 *  (nothing to say: the latch is idle). */
export function latchFrame(S, now, dead, slot, mult) {
  if (!S || typeof S !== 'object') return null;
  _range = sightRange(slot, mult);
  const was = latchPhase(S) === 'active';
  const zone = S.currentZone;
  if (_zoneWas !== undefined && zone !== _zoneWas) { latchClear(S, 'zone'); sightClear(S); }
  _zoneWas = zone;
  if (dead || S._zoneLoading) {
    sightClear(S);
    if (latchPhase(S) === 'active') latchClear(S, dead ? 'death' : 'zone');
    return was ? false : null;
  }
  sightStep(S, sightNow(S, _range), now);
  if (latchPhase(S) !== 'active') return was ? false : null;
  const m = findMon(S.monsters, S._latchId);
  _T.alive = monUp(m);
  _T.d = m && S.player ? Math.hypot(m.x - S.player.x, m.y - S.player.y) : NaN;
  let others = null;
  if (!_T.alive) {
    /* its death (rare): the others in sight, from where you stand -- the one
       frame that makes a list */
    others = [];
    const P = S.player, face = drawnFace(S);
    for (const o of Array.isArray(S.monsters) ? S.monsters : []) {
      if (!monUp(o) || o === m) continue;
      const pk = sightPick(P, face, [o], _range, null);
      if (pk) others.push({ id: o.id, d: pk.d });
    }
  }
  const end = latchCheck(S, m ? _T : null, _range.out, others);
  if (end && end !== 'moved') return false;
  return latchHolds(S);
}

/** v2.3.6543: the weapon's sight range held out (sightRange's `out`), as the
 *  last frame sighted with: Block's and Special's "a monster near" in the two
 *  buttons (controlVisibility.js combatReach; card CT PR 4). */
export function latchReach() { return _range.out; }

/** Attack pressed (the disc, mode 5): sights afresh -- never the 400 ms
 *  hold's kept id (the gatekeeper's sitting 56: a press locks only what is in
 *  sight now) -- and presses (latchPress).  'lock' | 'unlock' | 'once'. */
export function latchAttackPress(S) {
  /* v2.3.6542 (the gatekeeper's sitting 60): off the two buttons' one gate (a
     mouse on a touch screen, or the mode not chosen) a press latches nothing:
     null, and the phase stays as it was.  latchFrame, the frame that ends a
     latch, runs only on the same gate, so a press it could not see must never
     begin one. */
  if (!twoButtonsLive()) return null;
  const pk = sightNow(S, _range);
  return latchPress(S, pk ? pk.id : null);
}

/** The disc wears the phase: data-latch 'on' (pressed in, lit) or 'off'
 *  (raised), game.css's bevel.  Written only when it changes.  `el` the
 *  disc (.bt-rjoy-base). */
export function latchLook(el, S) {
  if (!el || typeof el.getAttribute !== 'function') return false;
  const want = latchPhase(S) === 'active' ? 'on' : 'off';
  if (el.getAttribute('data-latch') === want) return false;
  el.setAttribute('data-latch', want);
  return true;
}
