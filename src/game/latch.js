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
 * No imports: node tests it (server/test/latch.test.mjs).
 */

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
  if (target.d > out) { latchTo(S, 'idle', null, 'range'); return 'range'; }
  return null;
}

/** Your death ('death') or a change of place, a rejoin ('zone'): the latch
 *  lets go.  True when it was active. */
export function latchClear(S, why) {
  return latchTo(S, 'idle', null, why === 'death' ? 'death' : 'zone');
}
