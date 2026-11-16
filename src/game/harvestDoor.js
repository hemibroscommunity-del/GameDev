/* ═══ v2.3.5219: THE HARVEST'S PAGE DOOR -- ONE WRITER OF THE PHONE'S HARVEST (card L PR 5) ═══
 * (docs/specs/harvest-door.md, "the page"; held by server/test/harvest-page-door.test.mjs
 * and the phase table's guard, tools/guards/phase-table.test.mjs)
 *
 * The phone's harvest is ONE field, `S._extraction`: none, or the record of
 * the swing in flight -- mining, woodcutting, fishing, or a cook at your fire
 * (its `skill`) -- whose `status` goes waiting (the swings, the worker's hits
 * landing) and ready (the window open: the gesture cue).  Three files wrote
 * it in ten places; now only harvestTo does, by a way of HARVEST_PAGE_WAYS:
 *   start   lifeSkillRewards.js startExtraction   a record {status: 'waiting'}
 *   try     lifeSkillRewards.js _startLockedTry   a record {status: 'waiting',
 *                                                 locked}: a try your level
 *                                                 cannot work yet (its 0s)
 *   open    BroTown.jsx's tick                    the window opens: the
 *                                                 record's status, waiting ->
 *                                                 ready, in place
 *   strike  lifeSkillRewards.js succeedExtraction none: the gesture landed,
 *                                                 the reward asked
 *   lost    succeedExtraction; the tick           none: the node is gone
 *   walk    the tick                              none: the stick pushed, or
 *                                                 out of the node's reach
 *   tried   lifeSkillRewards.js tickGatherHits    none: a locked try's end
 *   again   startExtraction                       none: a new tap ends the old
 *   zone    zoneTransitions.js clearZoneLocalFx   none: the zone you left
 * The door's rules are the callers' own checks, so nothing a player sees
 * changes: a start or a try only from none (startExtraction ends the old
 * one first), a try's record locked and a start's not; the window opens only
 * from waiting and only at its time (windowOpensAt: a locked try's is
 * Infinity, so it never opens); a strike only from ready; `tried` only of a
 * locked try; and a record only of its own way's status.  `?harvestdoor=0`
 * lifts them (the record's status still its way's), as the lines before the
 * door.
 *
 * Not folded here: what the record counts and times while it waits (the
 * worker's hits, `windowOpensAt`, the gesture's samples), which the tick,
 * the gesture layer and the worker's plan (applyGatherHits) write on it; the
 * fire you cook at (`S._campfire`, `S._firemaking`) and the node you stand
 * by (`S._nearNode`, `S._proxNode`), fields of their own.
 *
 * One import, the page's switch reader (game/switches.js, itself of no
 * imports; card T's), by a relative path: the harvest's rules are read by a
 * node test without the game (zone-leftovers.test imports this file bare).
 */
import { sw } from './switches.js';

export const HARVEST_PAGE_WAYS = Object.freeze({
  start: 'waiting', try: 'waiting', open: 'ready',
  strike: 'none', lost: 'none', walk: 'none', tried: 'none', again: 'none', zone: 'none',
});
const has = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

/* `?harvestdoor=0` -- through the page's one reader (switches.js reads the
   address at each ask), so a test can set it */
export function harvestDoorOff() {
  return sw('harvestdoor');
}

/* the harvest's phase on this phone: its record's status, or none */
export function harvestPhase(S) {
  const r = S && S._extraction;
  if (!r) return 'none';
  return r.status === 'ready' ? 'ready' : 'waiting';
}

/** THE ONE WRITER of `S._extraction`.  `rec` is the new record for start
 *  and try (its `status` 'waiting'), null for the ways to none and for
 *  open.  True when it wrote. */
export function harvestTo(S, rec, way) {
  if (!S || typeof S !== 'object' || !has(HARVEST_PAGE_WAYS, way)) return false;
  const to = HARVEST_PAGE_WAYS[way];
  const from = harvestPhase(S);
  const off = harvestDoorOff();
  if (to === 'none') {
    if (rec !== null) return false;
    if (!off) {
      if (way === 'strike' && from !== 'ready') return false;
      if (way === 'tried' && !(S._extraction && S._extraction.locked)) return false;
    }
    S._extraction = null;
    return true;
  }
  if (to === 'ready') {
    const cur = S._extraction;
    if (rec !== null || !cur) return false;
    if (!off && (from !== 'waiting' || !(Date.now() >= cur.windowOpensAt))) return false;
    cur.status = 'ready';
    return true;
  }
  if (!rec || typeof rec !== 'object' || rec.status !== to) return false;
  if (!off) {
    if (from !== 'none') return false;
    if (way === 'try' ? !rec.locked : !!rec.locked) return false;
  }
  S._extraction = rec;
  return true;
}
