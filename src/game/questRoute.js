/* ═══ v2.3.1817: WHICH WAY IS THE QUEST? ═══
 *
 * Owner: "Make star active quest mark marking portals that you're supposed to
 * go to on minimap for next steps."
 *
 * The minimap already draws every portal it can find, all of them identical,
 * so a player holding "Bring 4 Snowman Remnants from Frost Ridge" is looking
 * at five interchangeable arches and has to remember which one Frost Ridge is
 * behind.  The star answers exactly that, and only that.
 *
 * WHY THIS IS ITS OWN MODULE.  It needs the quest table (gameSystems) and the
 * exit tables (effects), and it is read by the minimap renderer — importing
 * either of those into the other to host it would close a cycle.  A module
 * that only knows how to answer one question keeps all three edges one-way.
 *
 * IT ROUTES, rather than matching a portal to a zone name.  The spokes all
 * hang off the World View, so from town the next step toward Frost Ridge is
 * not a frost portal — there isn't one in town — it is the trail up to the
 * World View.  Starring only the literal destination would leave the player
 * in town with nothing marked at all, which is worse than no feature: it
 * would read as "no quest is active".
 */
import { QUEST_CHAINS, QUEST_STATUS } from '@/data/gameSystems.js';
import { TOWN_EXITS, WORLDVIEW_EXITS } from '@/data/effects.js';
import { TILE } from '@/data/constants.js';

/** The zone the player's ACTIVE Mayor Bro step points at, or null.
 *  Null covers three ordinary cases and they are deliberately not
 *  distinguished: no quest running, a quest with no zone (cook / mine
 *  "any zone" steps), and a quest whose zone is not a place you travel to. */
export function questTargetZone(rpg) {
  const quests = (rpg && rpg._quests) || null;
  if (!quests) return null;
  for (const qid of Object.keys(quests)) {
    if (quests[qid] !== QUEST_STATUS.active) continue;
    const q = QUEST_CHAINS[qid];
    if (q && q.zone) return q.zone;
  }
  return null;
}

/** Where to head NEXT, in the zone you are standing in — world {x, y} plus
 *  the zone it leads to — or null when there is nothing useful to point at.
 *
 *  Returning null when you are ALREADY in the target zone is the important
 *  one: a star on the exit you just came through would be pointing at the way
 *  home while the quest is telling you to hunt here. */
export function questRouteExit(currentZone, rpg) {
  const target = questTargetZone(rpg);
  if (!target || !currentZone) return null;
  if (currentZone === target) return null;          /* you are there — hunt, don't travel */

  const at = (e) => ({ x: (e.tx + 0.5) * TILE, y: (e.ty + 0.5) * TILE, zoneId: e.zoneId });

  if (currentZone === 'worldview') {
    /* The hub: the spoke itself is here, so point straight at it.  A target
       whose spoke is CLOSED (the four unfinished ones are commented out of
       WORLDVIEW_EXITS) finds nothing and stars nothing, rather than marking
       a portal that is not drawn. */
    const e = WORLDVIEW_EXITS.find((x) => x && x.zoneId === target);
    return e ? at(e) : null;
  }
  if (currentZone === 'town') {
    /* Town has ONE way out and everything is behind it. */
    const e = TOWN_EXITS.find((x) => x && x.zoneId === 'worldview');
    return e ? at(e) : null;
  }
  /* Standing in some OTHER spoke with a quest pointing at a different one.
     The way on is back through the World View, but a spoke's return portal is
     a painted tile rather than a declared exit, so there is no coordinate to
     star here without guessing at one.  Deliberately nothing: a star in the
     wrong place is worse than no star, and the zone header already carries a
     way back. */
  return null;
}

/* ═══ v2.3.1817: WHICH QUEST OPENS A ZONE ═══
 * Owner: "make each zone open up only after a mayor bro quest requires that
 * area."
 *
 * Built from QUEST_CHAINS' own `zone` field, the mirror of the server's
 * QUEST_REWARDS[].objective.zone that actually enforces the lock — so the
 * portal the client refuses and the zone change the worker refuses are
 * decided by the same quest ids.  A zone no quest names is NOT gated
 * (returns null), which is what keeps town, the World View and the Starting
 * Meadow reachable without listing them anywhere.
 */
const ZONE_UNLOCK = (() => {
  const m = new Map();
  for (const qid of Object.keys(QUEST_CHAINS)) {
    const z = QUEST_CHAINS[qid] && QUEST_CHAINS[qid].zone;
    if (z && !m.has(z)) m.set(z, qid);
  }
  return m;
})();

/** The quest id that opens `zoneId`, or null when the zone is not gated. */
export function zoneUnlockQuest(zoneId) {
  return ZONE_UNLOCK.get(zoneId) || null;
}
