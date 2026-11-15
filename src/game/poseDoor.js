/* ═══ v2.3.5520: THE POSE'S PAGE DOOR -- ONE WRITER OF THE PHONE'S HELD POSE (card L PR 5) ═══
 * (docs/specs/pose-door.md, "the page"; held by server/test/pose-page-door.test.mjs
 * and the phase table's guard, tools/guards/phase-table.test.mjs)
 *
 * The phone's held pose (sit, sleep, flop, a dance) is ONE field, `S._pose`:
 * none (standing), or its record (posing): its `id`, when it began (`at`)
 * and where (`x`, `y`, `zone`, which updateOwnEmote's stand-up reads), and
 * `popAt`, its emoji's beat.  Two files wrote it in three places; now only
 * poseTo does, by a way of POSE_PAGE_WAYS:
 *   hold    interactions.js sendMove     a record: a held move (a new one
 *                                        replaces the old, as before)
 *   stand   interactions.js endOwnPose   standing: you moved, struck, swam,
 *                                        jumped, harvested, died, did a
 *                                        moment's move, changed place (the
 *                                        zone's reset), and the worker is told
 *   forget  rejoinSlots.js rejoinClear   standing: the rejoin (the worker that
 *                                        answered holds none; no word to it)
 * The door's rules are the callers' own checks, so nothing a player sees
 * changes: a pose is held by the living only (sendMove: not dead), with its
 * id and where it began (the stand-up's line); a stand-up only of a pose held
 * (endOwnPose: nothing to stand up, nothing said).  `?posedoor=0` lifts them,
 * as the lines before the door.
 *
 * Not folded here: its emoji's beat (`popAt`), a count on the record; a
 * moment's move (`S._emoteMove`), which is no pose.
 *
 * No imports (the pose's rules are read by a node test without the game).
 */

export const POSE_PAGE_WAYS = Object.freeze({ hold: 'posing', stand: 'standing', forget: 'standing' });
const has = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

/* `?posedoor=0` -- read at each write (a few a pose), so a test can set it */
export function poseDoorOff() {
  try {
    const s = (typeof location !== 'undefined' && location && location.search) || '';
    return new URLSearchParams(s).get('posedoor') === '0';
  } catch (e) { return false; }
}

/* the pose's phase on this phone (the phase table's words): posing, or standing */
export function posePhase(S) {
  return S && S._pose ? 'posing' : 'standing';
}

/** THE ONE WRITER of `S._pose`.  `rec` is the new record for hold, null for
 *  the ways to standing.  True when it wrote. */
export function poseTo(S, rec, way) {
  if (!S || typeof S !== 'object' || !has(POSE_PAGE_WAYS, way)) return false;
  const off = poseDoorOff();
  if (POSE_PAGE_WAYS[way] === 'standing') {
    if (rec !== null) return false;
    if (!off && way === 'stand' && !S._pose) return false;
    S._pose = null;
    return true;
  }
  if (!rec || typeof rec !== 'object' || typeof rec.id !== 'string' || !rec.id) return false;
  if (!off) {
    if (!Number.isFinite(rec.x) || !Number.isFinite(rec.y) || !Number.isFinite(rec.at)) return false;
    if ((S.player && S.player.dead) || S._dead) return false;
  }
  S._pose = rec;
  return true;
}
