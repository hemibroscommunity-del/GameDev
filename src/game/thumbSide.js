/* ═══ v2.3.6549: THE RIGHT THUMB'S BUTTONS, WHEN EACH COMES (card CT part 16) ═══
 * The owner, 2026-11-24, of the two buttons (`?manual=5`): "I want a clean
 * attack and jump button that's it. The special attacks buttons should only
 * appear when a monster is within attack range. I want to change the melee
 * behavior so that it doesn't jump to every monster. Instead you must press
 * an attack charge button to get that behavior."  Of a Charge button shown
 * only while a monster is in sight but too far for the sword: "do the
 * recommended charge button behavior".  Of Block as its own shield button in
 * a fixed spot, shown at a threat: "Yes".
 *
 * ONE PHASE, `S._thumbPhase` (CLAUDE.md section 5; the phase table's `thumb`
 * row), written only by thumbTo:
 *   'calm'    nothing near: Attack and Jump only;
 *   'threat'  a monster SIGHTED (sight.js: the weapon's sight range and the
 *             faced cone, the wider range Block always came at), or locked
 *             (latch.js), or a monster's hit in the last THUMB.HURT_MS
 *             (`S.lastDamageTaken`, the worker's monster hit stamps it:
 *             gameEvents.js) -- a hit from one you cannot see brings Block
 *             up too (this undoes the earlier "decided while away" that such
 *             a hit does not); Block shows;
 *   'reach'   a live monster where an attack would CONNECT (reachRange, any
 *             way you face: the body turns to strike): Block and the specials.
 *             Reach is a threat too, so Block never goes while the specials
 *             are up.
 * The reach has an IN line and a wider OUT line, as the sight has, and is
 * held THUMB.HOLD_MS past the last frame in it, so nothing flickers at the
 * edge (TRAPS 218: one structural change at the edge, never one a frame).
 * The one in reach keeps it to `out`; a new one needs `in`.
 *
 * THE REACH (reachRange), one table:
 *   a sword   the engage test's own line (monsterCombat.js: the gap to the
 *             monster's body, its centre less its melee hit radius, within
 *             GS_OUTER_RADIUS 72 x meleeRangeMult), the gap measured by the
 *             caller's `gapOf` (thumbGlue.js: the same three numbers);
 *             out 1.25 x in;
 *   a bow     its shot range: the sight's own (sight.js sightRange: 675 x the
 *   a staff   gear's range multiplier, held out by 1.25 but never past what
 *             the worker would land), measured centre to centre.
 *
 * CHARGE (chargeShown): a melee weapon in hand, a monster in sight or locked,
 * and the phase not 'reach' (it is too far for the sword).  Its press
 * (chargeLock, then the sword's dash) locks the latch's monster if none is
 * locked (the one in sight NOW, never the hold's kept id) without an attack
 * of its own, and the caller dashes at it (abilities.js maybeSwordDash).
 *
 * Imports sight.js and latch.js only (and switches.js for the switches):
 * node tests it (server/test/thumb-side.test.mjs).
 */

import { sightPhase } from './sight.js';
import { latchLocked, latchTo, sightNow } from './latch.js';
import { readerFor, sw } from './switches.js';

export const THUMB = Object.freeze({
  /* MIRROR src/data/gameSystems.js GS_OUTER_RADIUS (the engage test's reach) */
  SWORD_PX: 72,
  HYST: 1.25,
  /* the specials stay this long after the last frame in reach (sight.js's HOLD_MS) */
  HOLD_MS: 400,
  /* Block stays this long after a monster's last hit (a monster you cannot see) */
  HURT_MS: 3000,
  /* MIRROR sight.js SIGHT.SHOT_PX, BOW_SLACK_PX, STAFF_SLACK_PX */
  SHOT_PX: 675,
  BOW_SLACK_PX: 150,
  STAFF_SLACK_PX: 250,
});

export const THUMB_PHASES = Object.freeze(['calm', 'threat', 'reach']);

/** Where an attack connects: { in, out }, world px.  `slot` the active slot
 *  ('ranged' | 'staff'; anything else a sword's), `mult` a bow's or a staff's
 *  range multiplier, `melee` the sword's (meleeRangeMult); 1 when not given. */
export function reachRange(slot, mult, melee) {
  if (slot === 'ranged' || slot === 'staff') {
    const k = typeof mult === 'number' && mult > 0 ? mult : 1;
    const inner = THUMB.SHOT_PX * k;
    const worker = inner + (slot === 'staff' ? THUMB.STAFF_SLACK_PX : THUMB.BOW_SLACK_PX);
    return { in: inner, out: Math.min(inner * THUMB.HYST, worker) };
  }
  const k = typeof melee === 'number' && melee > 0 ? melee : 1;
  return { in: THUMB.SWORD_PX * k, out: THUMB.SWORD_PX * k * THUMB.HYST };
}

function monUp(m) {
  return !!m && !!m.alive && !(typeof m.curHp === 'number' && m.curHp <= 0) && isFinite(m.x) && isFinite(m.y);
}

/** The least gap from you to a live monster, world px (Infinity for none).
 *  `gapOf(m, P)` the caller's measure (a sword's engage gap), else centre to
 *  centre. */
export function reachGap(S, gapOf) {
  const P = S && S.player;
  const list = S && S.monsters;
  if (!P || !Array.isArray(list)) return Infinity;
  let best = Infinity;
  for (const m of list) {
    if (!monUp(m)) continue;
    const g = typeof gapOf === 'function' ? gapOf(m, P) : Math.hypot(m.x - P.x, m.y - P.y);
    if (typeof g === 'number' && g < best) best = g;
  }
  return best;
}

/** The phase on this phone: 'calm' when nothing has written it. */
export function thumbPhase(S) {
  return (S && S._thumbPhase) || 'calm';
}

/** THE ONE WRITER of `S._thumbPhase`.  True when it changed. */
export function thumbTo(S, phase) {
  if (!S || typeof S !== 'object' || THUMB_PHASES.indexOf(phase) < 0) return false;
  if (thumbPhase(S) === phase) return false;
  S._thumbPhase = phase;
  return true;
}

/** A monster's hit in the last HURT_MS (`now` ms). */
export function hurtLately(S, now) {
  const t = S && S.lastDamageTaken;
  return typeof t === 'number' && t > 0 && now - t >= 0 && now - t < THUMB.HURT_MS;
}

/** A frame's step: `gap` reachGap's, `range` reachRange's, `now` ms.  Keeps
 *  the note (`S._thumbAt`, the last frame in reach) and moves the phase
 *  through thumbTo.  True when the phase changed (the one structural change). */
export function thumbStep(S, now, gap, range) {
  if (!S || typeof S !== 'object' || !range) return false;
  const was = thumbPhase(S);
  if (gap <= (was === 'reach' ? range.out : range.in)) {
    S._thumbAt = now;
    return thumbTo(S, 'reach');
  }
  if (was === 'reach' && now - (S._thumbAt || 0) < THUMB.HOLD_MS) return false;
  const threat = sightPhase(S) === 'sighted' || latchLocked(S) || hurtLately(S, now);
  return thumbTo(S, threat ? 'threat' : 'calm');
}

/** Death, a change of place: calm at once. */
export function thumbClear(S) {
  if (!S || typeof S !== 'object') return false;
  S._thumbAt = 0;
  return thumbTo(S, 'calm');
}

/* ── the switches (the switch table's rows; `search` is for tests) ── */
/** `?reachspecials=0`: the specials at the sighting, as before. */
export function reachSpecialsOn(search) { return !(typeof search === 'string' ? readerFor(search).sw('reachspecials') : sw('reachspecials')); }
/** `?threatblock=0`: Block at the sighting, as before (no unseen hit). */
export function threatBlockOn(search) { return !(typeof search === 'string' ? readerFor(search).sw('threatblock') : sw('threatblock')); }
/** `?chargebtn=0`: no Charge button. */
export function chargeBtnOn(search) { return !(typeof search === 'string' ? readerFor(search).sw('chargebtn') : sw('chargebtn')); }

/* ── what each button asks (controlVisibility.js hands them on, with the
   switches and a fight between players) ── */
function seen(S) { return sightPhase(S) === 'sighted' || latchLocked(S); }

/** The specials: a monster in reach. */
export function specialsUp(S) {
  return !!S && typeof S === 'object' && thumbPhase(S) === 'reach';
}

/** Block: a threat (in sight, locked, a monster's hit lately, in reach). */
export function blockUp(S) {
  return !!S && typeof S === 'object' && thumbPhase(S) !== 'calm';
}

/** Charge: a melee weapon (`melee` exactly true), a monster in sight or
 *  locked, and none in reach. */
export function chargeUp(S, melee) {
  if (melee !== true || !S) return false;
  return seen(S) && thumbPhase(S) !== 'reach';
}

/** Charge pressed: the monster to dash at is locked (the latch's, else the
 *  one in sight NOW, locked 'active' with no attack of its own).  Returns
 *  the locked id, or null (nothing to charge). */
export function chargeLock(S) {
  if (!S) return null;
  if (latchLocked(S)) return S._latchId;
  const pk = sightNow(S);
  if (!pk || pk.id == null) return null;
  return latchTo(S, 'active', pk.id) ? pk.id : null;
}
