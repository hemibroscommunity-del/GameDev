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
 *   v2.3.6556: the target out of view 400 ms (AWAY_MS) while one in view
 *     is in range                -> the lock MOVES to the nearest in view
 *                                   (latchAway; `?nearpick=0` never)
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
 * Four imports, sight.js, and manualCombat.js and deviceProfile.js for the one gate (twoButtonsLive; v2.3.6542), and switches.js (v2.3.6546: `?sightline`): node tests it
 * (server/test/latch.test.mjs).
 */
import { sightPick, sightStep, sightClear, sightRange, drawnFace, sightLine, lineTo, inSightView } from './sight.js';   /* v2.3.6542; v2.3.6546: the line, latchLine; v2.3.6556: the view */
import { readerFor, sw, swValue } from './switches.js';   /* v2.3.6546: `?sightline=1` (switches.js imports nothing); v2.3.6548: `?holdauto=0`, `?autohold=<ms>` */
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

/* v2.3.6548 (card CT part 15): THREE phases, one field.  'active' is the
   lock (the body faces it, the line shows, a tap strikes it, no held
   attack); 'auto' the lock with the held attack on (a hold past the fill, or
   with `?holdauto=0` any lock, as before).  S.autoAttack is derived from it
   (latchHolds), never kept beside it. */
export const LATCH_PHASES = Object.freeze(['idle', 'active', 'auto']);
export const LATCH_ENDS = Object.freeze(['press', 'range', 'killed', 'death', 'zone']);

/** The latch's phase on this phone: 'idle' when nothing has written it. */
export function latchPhase(S) {
  return (S && S._latchPhase) || 'idle';
}

/** v2.3.6548: a monster locked, with or without the held attack ('active'
 *  or 'auto'): what the lock, the line and the buttons ask. */
export function latchLocked(S) {
  const p = latchPhase(S);
  return p === 'active' || p === 'auto';
}

/** THE ONE WRITER of `S._latchPhase` and its notes.  `id` the locked
 *  monster's (active, auto), `end` one of LATCH_ENDS (to idle).  True when it
 *  wrote. */
export function latchTo(S, phase, id, end) {
  if (!S || typeof S !== 'object' || LATCH_PHASES.indexOf(phase) < 0) return false;
  if (phase !== 'idle') {
    if (id == null || id === '') return false;
    S._latchAwayAt = 0;   /* v2.3.6556: a new lock's time out of view starts again (latchAway) */
    S._latchPhase = phase;
    S._latchId = id;
    S._latchEnd = null;
    return true;
  }
  if (LATCH_ENDS.indexOf(end) < 0) return false;
  if (!latchLocked(S)) return false;
  S._latchAwayAt = 0;
  S._latchPhase = 'idle';
  S._latchId = null;
  S._latchEnd = end;
  return true;
}

/** Attack pressed.  `sightedId` the monster in sight (sight.js), or null;
 *  `hold` the tap-and-hold rule (holdAutoOn), exactly true, else the press
 *  of parts 13-14.  Returns what the press did:
 *    today's (`hold` not true): 'lock' (now auto: locked, the held attack
 *      on), 'unlock' (ended: 'press'), or 'once' (nothing sighted: one
 *      attack the way the body faces);
 *    the hold's (v2.3.6548): 'unlock' (it was auto: off, and NO attack of
 *      its own), 'strike' (it was locked: one attack at the lock, the lock
 *      kept: a tap never lets a lock go), 'lock' (a monster sighted: locked,
 *      'active', and one attack at it), or 'once' (nothing sighted). */
export function latchPress(S, sightedId, hold) {
  const p = latchPhase(S);
  if (hold === true) {
    if (p === 'auto') { latchTo(S, 'idle', null, 'press'); return 'unlock'; }
    if (p === 'active') return 'strike';
    if (sightedId != null && sightedId !== '' && latchTo(S, 'active', sightedId)) return 'lock';
    return 'once';
  }
  if (p !== 'idle') { latchTo(S, 'idle', null, 'press'); return 'unlock'; }
  if (sightedId != null && sightedId !== '' && latchTo(S, 'auto', sightedId)) return 'lock';
  return 'once';
}

/* ═══ v2.3.6548: TAP AND HOLD (card CT part 15) ═══
 * The owner, 2026-11-24 (an iPhone 14 Pro, the game's only player): "I'm
 * also thinking if you hold down the attack button near a monster something
 * signifies that the auto-attack is enabled. Maybe 2 seconds. Otherwise each
 * tap is its own attack cycle."  And, to the orchestrator's reading, "Yes do
 * it the way you suggested":
 *   - a TAP is always one attack.  With a monster sighted it locks it (the
 *     body faces it, the line shows), and the lock stays for the next taps
 *     until the monster dies, leaves the sight's hold range, or your own
 *     ends (death, a change of place); a tap never lets a lock go;
 *   - a HOLD with a monster locked fills a ring round Attack; at `autohold`
 *     ms (AUTOHOLD.MS, `?autohold=<ms>` from MIN to MAX) auto-attack is on
 *     ('auto'): the held attack runs, the button stays lit, the finger may
 *     lift.  A lift before the fill empties the ring and it was a tap;
 *   - auto-attack ends with a tap on Attack (that tap strikes nothing of its
 *     own), the monster dead, or out of sight.  AFTER A KILL EVERYTHING
 *     LETS GO: no move to the next monster (the owner, earlier: "I want to
 *     change the melee behavior so that it doesn't jump to every monster").
 * The hold's timer is the press's own start time (`S._latchHoldAt`, 0 when
 * none), never a phase; the fill is latchFill's, once a frame (latchFrame).
 * `?holdauto=0` gives the press of parts 13-14 back (a press locks AND holds,
 * the next lets go, a kill moves the lock). */
export const AUTOHOLD = Object.freeze({ MS: 600, MIN: 200, MAX: 3000, SLIDE_PX: 56 });

/** The tap-and-hold rule for this page: on unless `?holdauto=0`.  `search`
 *  is for tests. */
export function holdAutoOn(search) {
  return !(typeof search === 'string' ? readerFor(search).sw('holdauto') : sw('holdauto'));
}

/** The hold's fill in ms: `?autohold=<ms>` (whole ms, clamped MIN to MAX),
 *  else AUTOHOLD.MS.  `search` is for tests. */
export function autoHoldMs(search) {
  const v = typeof search === 'string' ? readerFor(search).swValue('autohold') : swValue('autohold');
  const m = /^(\d+)$/.exec(v == null ? '' : String(v));
  if (!m) return AUTOHOLD.MS;
  return Math.min(AUTOHOLD.MAX, Math.max(AUTOHOLD.MIN, +m[1]));
}

/** The press's hold starts (`now`), only on a lock that is not yet auto.
 *  True when it started. */
export function latchHoldStart(S, now) {
  if (!S || typeof S !== 'object' || latchPhase(S) !== 'active' || !(now > 0)) return false;
  S._latchHoldAt = now;
  return true;
}

/** The finger lifted, was cancelled, or slid off: the hold ends (the ring
 *  empties).  True when a hold was running. */
export function latchRelease(S) {
  if (!S || typeof S !== 'object' || !(S._latchHoldAt > 0)) return false;
  S._latchHoldAt = 0;
  return true;
}

/** The finger moved (dx, dy) px from where it pressed: past SLIDE_PX it has
 *  slid off the button and the hold ends.  True when that ended one. */
export function latchSlide(S, dx, dy) {
  if (!(Math.hypot(dx, dy) > AUTOHOLD.SLIDE_PX)) return false;
  return latchRelease(S);
}

/** Once a frame: a hold running `ms` (autoHoldMs) on a lock fills, and
 *  auto-attack is on ('auto').  A hold whose lock went first is dropped.
 *  True on the frame it filled. */
export function latchFill(S, now, ms) {
  if (!S || typeof S !== 'object' || !(S._latchHoldAt > 0)) return false;
  if (latchPhase(S) !== 'active') { S._latchHoldAt = 0; return false; }
  if (!(now - S._latchHoldAt >= ms)) return false;
  S._latchHoldAt = 0;
  return latchTo(S, 'auto', S._latchId);
}

/** A frame while active.  `target` the locked monster now: { alive, d }, or
 *  null when it is gone; `out` its weapon's `out` range (sightRange);
 *  `others` the OTHER monsters in sight, [{ id, d }].  Returns null (still
 *  locked on the same one), 'moved' (the lock moved to the nearest other),
 *  or the end's word. */
export function latchCheck(S, target, out, others) {
  if (!latchLocked(S)) return null;
  if (!target || !target.alive) {
    let next = null;
    for (const o of Array.isArray(others) ? others : []) {
      if (!o || o.id == null || o.id === S._latchId || !(o.d >= 0)) continue;
      if (!next || o.d < next.d) next = o;
    }
    if (next) { latchTo(S, latchPhase(S), next.id); return 'moved'; }
    latchTo(S, 'idle', null, 'killed');
    return 'killed';
  }
  if (!(target.d <= out)) { latchTo(S, 'idle', null, 'range'); return 'range'; }   /* v2.3.6540: written so a distance that is not a number lets go too (the gatekeeper's sitting 56) */
  return null;
}

/* ═══ v2.3.6556: A LOCK OUT OF VIEW LETS GO TO ONE IN VIEW (card CT part 23) ═══
 * The owner, 2026-11-25: "monsters off screen I may have shot accidentally
 * while shooting around but the monster closest to me looks like the only
 * threat and it's locking somewhere else."  While the latch holds a monster
 * OUT of the view, and a monster IN the view is in range (the weapon's `in`
 * range, any way you face: you face the lock), the lock moves to the nearest
 * such once that has lasted AWAY_MS: the move latchCheck makes at a death,
 * through latchTo, the phase kept.  A lock on a monster IN view is never
 * taken by a nearer one: the player chose it.  The time is a note
 * (`S._latchAwayAt`, 0 when none), never a phase; latchTo zeroes it at every
 * write.  `?nearpick=0` (nearPickOn) never moves it. */
export const AWAY_MS = 400;

/** `?nearpick=0` gives back the least angle and the old hold (sight.js
 *  sightPick's `old`, and no latchAway).  `search` is for tests. */
export function nearPickOn(search) {
  return !(typeof search === 'string' ? readerFor(search).sw('nearpick') : sw('nearpick'));
}

/** A frame while locked: `away` the locked monster is out of view, `near`
 *  the nearest monster in view in range ({ id, d }) or null.  Returns
 *  'moved' on the frame the lock moved, else null. */
export function latchAway(S, now, away, near) {
  if (!S || typeof S !== 'object') return null;
  if (!latchLocked(S) || away !== true || !near || near.id == null || String(near.id) === String(S._latchId)) { S._latchAwayAt = 0; return null; }
  if (!(S._latchAwayAt > 0)) { S._latchAwayAt = now; return null; }
  if (!(now - S._latchAwayAt >= AWAY_MS)) return null;
  latchTo(S, latchPhase(S), near.id);
  return 'moved';
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
/* v2.3.6556: the view, and the nearest in it, one object each (no garbage a frame) */
const _V = { x: 0, y: 0, w: 0, h: 0 };
const _N = { id: null, d: 0 };

/* v2.3.6556: the size of the view the frame was handed (latchFrame's vw,
   vh), for the press: the frame runs before any touch is read again */
let _vw = 0, _vh = 0;

/** v2.3.6556: the world's rectangle the page draws, as numbers: the
 *  camera's top-left (S.camera) and the size the renderer draws (`vw`, `vh`,
 *  world px: HANDED IN by the frame's one caller, BroTown's step `input`,
 *  from the renderer's own numbers; nothing here reads or measures the view:
 *  docs/specs/layout-reads.md, and TRAPS 237's census of the page rules
 *  that read its size).  null when there is none (everything then counts as
 *  in view).  One reused object. */
export function sightView(S, vw, vh) {
  const C = S && S.camera;
  if (!C || !isFinite(C.x) || !isFinite(C.y) || !(vw > 0) || !(vh > 0)) return null;
  _V.x = C.x; _V.y = C.y; _V.w = vw; _V.h = vh;
  return _V;
}

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
  const near = nearPickOn();   /* v2.3.6556: the nearest threat first, in view first; `?nearpick=0` the old pick */
  return sightPick(S.player, drawnFace(S), S.monsters, range || _range, S._sightId == null ? null : S._sightId, near ? sightView(S, _vw, _vh) : null, !near);
}

/** Is the latch's attack held now?  Active, and nothing that holds an attack
 *  off today: the shield up, a harvest, a climb, a swim (each lets go of
 *  S.autoAttack where it is; the latch picks it up again after).  False when
 *  the latch is idle, so in any other mode a lift lets go as it did. */
export function latchHolds(S) {
  if (latchPhase(S) !== 'auto') return false;   /* v2.3.6548: the held attack is auto's alone (a tap's lock holds none) */
  return !S._shieldUp && !S._extraction && !S._climb && !(S._wheelSwim && S._wheelSwim.on);
}

/** The step `input`'s read for the two buttons, once a frame.  `dead` your
 *  death this frame; `slot` the active weapon's (S.rpg.activeSlot), `mult`
 *  its range multiplier; v2.3.6556: `vw`, `vh` the view's size in world px
 *  (the renderer's; sightView).  Sights (sight.js sightStep), checks the lock
 *  (latchCheck: its ends and the move) and returns what the held attack
 *  should be: true (attacking), false (let go: an end, or held off), or null
 *  (nothing to say: the latch is idle). */
export function latchFrame(S, now, dead, slot, mult, vw, vh) {
  if (!S || typeof S !== 'object') return null;
  _range = sightRange(slot, mult);
  _vw = vw; _vh = vh;   /* v2.3.6556: the view's size, world px (sightView) */
  const was = latchLocked(S);
  const zone = S.currentZone;
  if (_zoneWas !== undefined && zone !== _zoneWas) { latchClear(S, 'zone'); sightClear(S); }
  _zoneWas = zone;
  if (dead || S._zoneLoading) {
    sightClear(S);
    if (latchLocked(S)) latchClear(S, dead ? 'death' : 'zone');
    latchRelease(S);
    return was ? false : null;
  }
  sightStep(S, sightNow(S, _range), now);
  const hold = holdAutoOn();
  latchFill(S, now, autoHoldMs());   /* v2.3.6548: the hold's ring full: auto-attack on (a hold starts only on the hold's rule: latchHoldStart) */
  if (!latchLocked(S)) return was ? false : null;
  const m = findMon(S.monsters, S._latchId);
  _T.alive = monUp(m);
  _T.d = m && S.player ? Math.hypot(m.x - S.player.x, m.y - S.player.y) : NaN;
  let others = null;
  if (!_T.alive && !hold) {
    /* its death (rare): the others in sight, from where you stand -- the one
       frame that makes a list.  v2.3.6548: not with the hold's rule, where a
       kill lets everything go (no list: latchCheck's 'killed') */
    others = [];
    const P = S.player, face = drawnFace(S);
    for (const o of Array.isArray(S.monsters) ? S.monsters : []) {
      if (!monUp(o) || o === m) continue;
      const pk = sightPick(P, face, [o], _range, null);
      if (pk) others.push({ id: o.id, d: pk.d });
    }
  }
  const end = latchCheck(S, m ? _T : null, _range.out, others);
  if (end && end !== 'moved') { latchRelease(S); return false; }
  if (!end && nearPickOn()) {
    /* v2.3.6556: the lock out of view, the nearest in view in range (only
       scanned while the lock is out of view) */
    const view = sightView(S, _vw, _vh), P = S.player;
    const away = !!view && !inSightView(view, m.x, m.y);
    let near = null;
    if (away) for (const o of Array.isArray(S.monsters) ? S.monsters : []) {
      if (!monUp(o) || !inSightView(view, o.x, o.y)) continue;   /* the locked one is out of view, and a place that is not numbers is in no view */
      const d = Math.hypot(o.x - P.x, o.y - P.y);
      if (d > _range.in || (near && d >= near.d)) continue;
      near = _N; near.id = o.id; near.d = d;
    }
    latchAway(S, now, away, near);
  }
  return latchHolds(S);
}

/* ═══ v2.3.6546: THE LINE IS COMBAT'S, NOT THE SIGHT'S (card CT item 7) ═══
 * The owner, 2026-11-24, after playing the trial: "For new controls some
 * things need fixed like it's snapping to a monster target when you run by.
 * It's supposed to be just free movement until you tap attack and it'll lock
 * on", and asked what snapped: "It's only the line drawn that snaps."  (A
 * probe walked a sword past a monster in mode 5: the body faced the stick
 * every frame, no aim, no lock, no held attack, the camera led by the walk
 * alone; only the line jumped from monster to monster as each came into the
 * cone.)  So the line is drawn while combat is ON (the latch active), from
 * the body to the LOCKED monster, and goes when combat ends.  Before the
 * press nothing is drawn: the sighting stays, unseen, as the rule of what
 * Attack will lock, and Block and the specials still come with it
 * (controlVisibility.js).  `early` (`?sightline=1`, sightLineEarly) draws the
 * sighting's line before the press again, as PR 4 did.  The renderer's one
 * call (rendering/sightLineDraw.js) asks this; node tests it
 * (server/test/sight.test.mjs 11). */
export function latchLine(S, now, early) {
  if (!S || typeof S !== 'object') return null;
  if (latchLocked(S)) return lineTo(S, S._latchId);
  return early === true ? sightLine(S, now) : null;
}

/** `?sightline=1`: the sight line before the press (PR 4's).  `search` is
 *  for tests. */
export function sightLineEarly(search) {
  return typeof search === 'string' ? readerFor(search).sw('sightline') : sw('sightline');
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
  return latchPress(S, pk ? pk.id : null, holdAutoOn());
}

/** The disc wears the phase: data-latch 'auto' (pressed in, lit: the held
 *  attack on), 'lock' (a tap's lock: raised, the line shows it) or 'off'
 *  (raised), game.css's bevel; and a ring that is no longer filling (the
 *  hold ended) loses its data-hold.  Written only when it changes.  `el` the
 *  disc (.bt-rjoy-base).  v2.3.6548: 'on' became 'auto', and 'lock' is new. */
export function latchLook(el, S) {
  if (!el || typeof el.getAttribute !== 'function') return false;
  const p = latchPhase(S);
  const want = p === 'auto' ? 'auto' : p === 'active' ? 'lock' : 'off';
  let wrote = false;
  if (el.getAttribute('data-latch') !== want) { el.setAttribute('data-latch', want); wrote = true; }
  if (!(S && S._latchHoldAt > 0) && el.getAttribute('data-hold') != null) { el.removeAttribute('data-hold'); wrote = true; }
  return wrote;
}

/** v2.3.6548: the ring starts filling, ONCE at the press: `data-hold` 'a' or
 *  'b' (each its own animation name, so a new press restarts the fill with no
 *  read of the page's layout) and `--autohold` its length, game.css's conic
 *  ring.  Only while a hold runs (latchHoldStart's).  True when written. */
export function latchRing(el, S, ms) {
  if (!el || typeof el.setAttribute !== 'function' || !(S && S._latchHoldAt > 0)) return false;
  if (el.style && typeof el.style.setProperty === 'function') el.style.setProperty('--autohold', ms + 'ms');
  el.setAttribute('data-hold', el.getAttribute('data-hold') === 'a' ? 'b' : 'a');
  return true;
}

/** v2.3.6548: the ring empties at once (a lift before the fill, a cancel, a
 *  slide off).  True when it was there. */
export function latchRingOff(el) {
  if (!el || typeof el.getAttribute !== 'function' || el.getAttribute('data-hold') == null) return false;
  el.removeAttribute('data-hold');
  return true;
}
