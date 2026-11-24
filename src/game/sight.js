/* ═══ v2.3.6540: WHAT YOU HAVE IN SIGHT (card CT PR 1: the two-button trial, mode 5) ═══
 *
 * The owner, 2026-11-23: "The line of site will become visible if it's within
 * target range of the monster (target range will depend on whether melee
 * weapon or ranged weapon is equipped with range being longer)."  "when
 * monsters in your line of site (and in range) the combat buttons appear
 * around the attack button."
 *
 * Mode 5 of manualCombat.js only.  A monster is SIGHTED when it is alive,
 * within the weapon's target range, and within the faced cone (CONE_DEG each
 * side of the drawn facing).  Of several, the one nearest the facing's line
 * (the least angle off it) wins, then the nearest.
 *
 * THE RANGES (sightRange), one table:
 *   a sword   today's ring (targeting.js perimeterPx: TARGET_PERIMETER_PX
 *             220 x MELEE_PERIMETER_K 2 = 440), held out to TARGET_HYST
 *             (1.25: 550) so the edge does not flicker;
 *   a bow     its reach on the worker less its slack: hitproof.js
 *   a staff   _hitReach is ARROW_PX (675) x the gear's range multiplier
 *             + the slack (150 a bow, 250 a staff) + a run; the sight is the
 *             675 x the multiplier, held out by the same 1.25 but never past
 *             the worker's 675 x multiplier + slack (never more than the
 *             worker would land).
 * The one already sighted keeps its sight to the `out` range and a little
 * past the cone (CONE_HOLD_DEG); a new one needs the `in` range and the cone.
 *
 * THE PHASE (CLAUDE.md section 5): `S._sightPhase`, 'none' | 'sighted',
 * written only by sightTo (the phase table's `sight` row; server/test/
 * sight.test.mjs fails a second writer).  The sighted monster's id is its
 * note (`S._sightId`), and the last moment one was sighted (`S._sightAt`):
 * the phase goes to 'none' only HOLD_MS after the last sighting, so Block and
 * the specials appear once at a sighting and do not flicker at the edge
 * (TRAPS 218: never a structural change every frame).
 *
 * No imports: node tests it (server/test/sight.test.mjs).
 */

export const SIGHT = Object.freeze({
  CONE_DEG: 45,
  /* the one already sighted keeps it this far off the line */
  CONE_HOLD_DEG: 55,
  /* MIRROR targeting.js perimeterPx for a sword (TARGET_PERIMETER_PX 220 x
     MELEE_PERIMETER_K 2) and TARGET_HYST (src/data/gameSystems.js) */
  SWORD_PX: 440,
  HYST: 1.25,
  /* MIRROR server/src/hitproof.js HIT_PROOF.ARROW_PX (BOW_RANGE_PX,
     STAFF_RANGE_PX), ARROW_SLACK_PX, STAFF_SLACK_PX */
  SHOT_PX: 675,
  BOW_SLACK_PX: 150,
  STAFF_SLACK_PX: 250,
  /* the buttons stay this long after the last sighting */
  HOLD_MS: 400,
});

export const SIGHT_PHASES = Object.freeze(['none', 'sighted']);

/** The weapon's target range: { in, out }, world px.  `slot` the active
 *  slot ('melee' | 'ranged' | 'staff'; anything else is a sword's), `mult`
 *  the gear's range multiplier for a bow or a staff (1 when not given). */
export function sightRange(slot, mult) {
  if (slot !== 'ranged' && slot !== 'staff') return { in: SIGHT.SWORD_PX, out: SIGHT.SWORD_PX * SIGHT.HYST };
  const k = typeof mult === 'number' && mult > 0 ? mult : 1;
  const inner = SIGHT.SHOT_PX * k;
  const worker = inner + (slot === 'staff' ? SIGHT.STAFF_SLACK_PX : SIGHT.BOW_SLACK_PX);
  return { in: inner, out: Math.min(inner * SIGHT.HYST, worker) };
}

/** The angle between two ways, 0..PI. */
export function angleOff(a, b) {
  let d = (a - b) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  return Math.abs(d);
}

/** Pick the monster in sight.  `me` {x, y}; `face` the drawn facing,
 *  radians; `mons` [{ id, x, y, alive }]; `range` sightRange's; `cur` the id
 *  sighted now (or null).  Returns { id, d, off } or null. */
const _PICK = { id: null, d: 0, off: 0 };   /* v2.3.6542: ONE object, reused: the pick runs every frame once wired (the gatekeeper's sitting 56: no garbage a frame).  Read it before the next call. */
export function sightPick(me, face, mons, range, cur) {
  if (!me || typeof face !== 'number' || !isFinite(face) || !Array.isArray(mons) || !range) return null;
  const cone = (SIGHT.CONE_DEG * Math.PI) / 180;
  const hold = (SIGHT.CONE_HOLD_DEG * Math.PI) / 180;
  let best = null;
  for (const m of mons) {
    if (!m || !m.alive || (typeof m.curHp === 'number' && m.curHp <= 0) || !isFinite(m.x) || !isFinite(m.y)) continue;   /* v2.3.6542: a monster at 0 hp is dying, not in sight (targeting.js monLive's test) */
    const dx = m.x - me.x, dy = m.y - me.y;
    const d = Math.hypot(dx, dy);
    const off = d > 0 ? angleOff(Math.atan2(dy, dx), face) : 0;
    const kept = cur != null && m.id === cur;
    if (d > (kept ? range.out : range.in)) continue;
    if (off > (kept ? hold : cone)) continue;
    if (!best || off < best.off - 1e-9 || (Math.abs(off - best.off) <= 1e-9 && d < best.d)) { best = _PICK; best.id = m.id; best.d = d; best.off = off; }
  }
  return best;
}

/* v2.3.6542: the eight facings the renderer draws (render.js SECTORS, its
   published S._renderFacing), as angles: 0 east, PI/2 south (the world's y
   runs down) */
export const FACE_ANGLE = Object.freeze({
  east: 0, southeast: Math.PI / 4, south: Math.PI / 2, southwest: 3 * Math.PI / 4,
  west: Math.PI, northwest: -3 * Math.PI / 4, north: -Math.PI / 2, northeast: -Math.PI / 4,
});
/** v2.3.6542: the DRAWN facing, radians: the renderer's last (S._renderFacing),
 *  else the body's turn (S._facingAngle), else south. */
export function drawnFace(S) {
  const a = S && FACE_ANGLE[S._renderFacing];
  if (typeof a === 'number') return a;
  return S && typeof S._facingAngle === 'number' && isFinite(S._facingAngle) ? S._facingAngle : Math.PI / 2;
}

/** The sight's phase on this phone: 'none' when nothing has written it. */
export function sightPhase(S) {
  return (S && S._sightPhase) || 'none';
}

/** THE ONE WRITER of `S._sightPhase`.  True when it changed. */
export function sightTo(S, phase) {
  if (!S || typeof S !== 'object' || SIGHT_PHASES.indexOf(phase) < 0) return false;
  if (sightPhase(S) === phase) return false;
  S._sightPhase = phase;
  return true;
}

/** A frame's sighting: `pick` sightPick's (or null), `now` ms.  Keeps the
 *  notes (`S._sightId`, `S._sightAt`) and moves the phase through sightTo:
 *  to 'sighted' at once, to 'none' only HOLD_MS after the last sighting.
 *  True when the phase changed (the one structural change). */
export function sightStep(S, pick, now) {
  if (!S || typeof S !== 'object') return false;
  if (pick) {
    S._sightId = pick.id;
    S._sightAt = now;
    return sightTo(S, 'sighted');
  }
  if (sightPhase(S) === 'sighted' && now - (S._sightAt || 0) < SIGHT.HOLD_MS) return false;
  S._sightId = null;
  return sightTo(S, 'none');
}

/** A zone change, a rejoin, your death: nothing in sight, at once. */
export function sightClear(S) {
  if (!S || typeof S !== 'object') return false;
  S._sightId = null;
  S._sightAt = 0;
  return sightTo(S, 'none');
}

/* ═══ v2.3.6543: THE SIGHT LINE (card CT PR 4) ═══
 * The owner, 2026-11-23: "The line of site will become visible if it's
 * within target range of the monster."  What the line is drawn between:
 * the body and the monster in sight, while the phase is 'sighted' (its
 * HOLD_MS included: the line goes with the buttons, not a frame before) and
 * only while the frame's step still sights (`S._sightAt` within HOLD_MS of
 * `now`: a phase left behind by a mode switched off draws nothing).  The
 * leaf (src/rendering/leaves/effects-sight.js) draws it with the bow's
 * stream; this decides it, so node tests it.  One object, reused (a frame's
 * read: no garbage). */
const _LINE = { id: null, x0: 0, y0: 0, x1: 0, y1: 0, d: 0 };
export function sightLine(S, now) {
  if (!S || sightPhase(S) !== 'sighted' || S._sightId == null || !S.player) return null;
  if (!(now - (S._sightAt || 0) <= SIGHT.HOLD_MS)) return null;   /* written so a clock that is not a number draws nothing */
  return lineTo(S, S._sightId);
}

/** v2.3.6546: the line from the body to the monster `id` (alive, in the
 *  list, both somewhere), or null: sightLine's, and the latch's lock's
 *  (latch.js latchLine).  The same one object. */
export function lineTo(S, id) {
  if (!S || id == null || !S.player) return null;
  const k = String(id);   /* String() both sides: ids are numbers in some spawn paths (latch.js findMon) */
  const mons = Array.isArray(S.monsters) ? S.monsters : [];
  for (let i = 0; i < mons.length; i++) {
    const m = mons[i];
    if (!m || m.id == null || String(m.id) !== k) continue;
    if (!m.alive || (typeof m.curHp === 'number' && m.curHp <= 0) || !isFinite(m.x) || !isFinite(m.y)) return null;
    const P = S.player;
    if (!isFinite(P.x) || !isFinite(P.y)) return null;
    _LINE.id = m.id; _LINE.x0 = P.x; _LINE.y0 = P.y; _LINE.x1 = m.x; _LINE.y1 = m.y;
    _LINE.d = Math.hypot(m.x - P.x, m.y - P.y);
    return _LINE;
  }
  return null;
}
