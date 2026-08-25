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

/* v2.3.1906: where the quest givers stand.  Every live NPC is spawned by
   BroTown's _spawnTownNpcs, which is town-only, so a finished objective always
   routes back to town.  Named rather than inlined so the day an NPC stands
   somewhere else, the search for what to change lands here. */
const QUEST_HOME_ZONE = 'town';

/** The zone the player's ACTIVE Mayor Bro step points at, or null.
 *  Null covers three ordinary cases and they are deliberately not
 *  distinguished: no quest running, a quest with no zone (cook / mine
 *  "any zone" steps), and a quest whose zone is not a place you travel to. */
export function questTargetZone(rpg, S) {
  const quests = (rpg && rpg._quests) || null;
  if (!quests) return null;
  for (const qid of Object.keys(quests)) {
    if (quests[qid] !== QUEST_STATUS.active) continue;
    const q = QUEST_CHAINS[qid];
    if (!q) continue;
    /* ═══ v2.3.1906: A FINISHED OBJECTIVE POINTS HOME ═══
       Owner: "The star on minimap for cold reception quest when it's complete
       needs to be updated.  It still shows you to go to the frozen shore even
       when complete.  Should lead back to mayor bro."

       A quest stays `active` right through to the turn-in — `complete` is a
       status the client computes, never one stored in _quests — so "active"
       alone was answering "is this quest running", when the star needs to
       answer "what is my next step".  With four snowmen already in the bag
       the next step is the Mayor, and the star was still selling the trip
       that is already done.

       q.check is the same predicate QuestPanel uses to offer Claim Reward
       (and BroTown for the '❓' badge), so the map cannot disagree with the
       button about whether a quest is finished. Wrapped because it is
       arbitrary per-quest code running on live state — a throw here would
       take the whole minimap down, and an unreadable objective should read
       as "not done yet" rather than blank the star. */
    let done = false;
    try { done = !!(q.check && q.check(rpg, S)); } catch (e) { done = false; }
    if (done) return QUEST_HOME_ZONE;      /* hand it in */
    if (q.zone) return q.zone;
  }
  return null;
}

/** Where to head NEXT, in the zone you are standing in — world {x, y} plus
 *  the zone it leads to — or null when there is nothing useful to point at.
 *
 *  Returning null when you are ALREADY in the target zone is the important
 *  one: a star on the exit you just came through would be pointing at the way
 *  home while the quest is telling you to hunt here. */
export function questRouteExit(currentZone, rpg, S) {
  const target = questTargetZone(rpg, S);
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
  /* ═══ v2.3.1906: THE SPOKE'S WAY OUT IS TILE 9 ═══
     This used to return nothing, on the reasoning that "a spoke's return
     portal is a painted tile rather than a declared exit, so there is no
     coordinate to star here without guessing at one".  The first half is
     true and the conclusion was not: the tile IS the coordinate.
     zoneTransitions triggers the return by scanning S.map for tile 9 within
     RETURN_R of the player, so starring the nearest 9 marks exactly the
     thing that will fire — no guessing, and the map and the trigger read the
     same source.

     It needs the map, which is why S is threaded in. Without it (an older
     caller) this still returns null and keeps the old behaviour rather than
     inventing a position.

     This matters most for the case the owner reported: standing in Frost
     Ridge holding four snowmen, the next step is the Mayor, and "deliberately
     nothing" left the one screen where you actually need directions blank. */
  const home = _nearestReturnTile(S);
  return home ? { x: home.x, y: home.y, zoneId: (S && S._enteredFromHub === 'worldview') ? 'worldview' : 'town' } : null;
}

/* The nearest tile-9 return marker in the zone you are standing in, as world
   coordinates — or null when there is no map to read or no marker on it.
   Nearest rather than first so a zone with markers on two edges stars the one
   you would actually walk to. */
function _nearestReturnTile(S) {
  const map = S && S.map;
  if (!Array.isArray(map)) return null;
  const P = (S && S.player) || null;
  const px = P ? P.x / TILE : 0;
  const py = P ? P.y / TILE : 0;
  let best = null;
  let bestD = Infinity;
  for (let ty = 0; ty < map.length; ty++) {
    const row = map[ty];
    if (!row) continue;
    for (let tx = 0; tx < row.length; tx++) {
      if (row[tx] !== 9) continue;
      const d = Math.abs(tx - px) + Math.abs(ty - py);
      if (d < bestD) { bestD = d; best = { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE }; }
    }
  }
  return best;
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

/** Is `zoneId` open to this player?
 *
 *  v2.3.1822.  Owner, after the gate shipped: "I started a new character on
 *  the first quest and it was still showing the blue circle portals on every
 *  zone entrance."  The gate refuses ENTRY, but the portal was still painted
 *  the same inviting blue as an open one, so the only way to learn a zone was
 *  shut was to walk into it and be pushed back.  This is the predicate the
 *  renderer needs to say so before you walk.
 *
 *  Deliberately the SAME rule as zoneTransitions' refusal and the worker's
 *  _zoneUnlocked — any quest status counts: accepting opens the zone, and
 *  completing leaves it open.  A zone no quest names is never gated.
 */
export function isZoneUnlocked(rpg, zoneId) {
  const q = zoneUnlockQuest(zoneId);
  if (!q) return true;
  return !!(rpg && rpg._quests && rpg._quests[q]);
}
