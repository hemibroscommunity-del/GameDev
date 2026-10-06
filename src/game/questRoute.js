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
import { QUEST_CHAINS, QUEST_STATUS, questSteps /* v2.3.3012: which node a gathering quest's next step needs */ } from '@/data/gameSystems.js';
import { hasGatherTool, gatherNeed /* v2.3.3038 */ } from '@/data/lifeSkills.js';   /* v2.3.3012: never lead to a node that is not drawn */
import { TOWN_EXITS, WORLDVIEW_EXITS } from '@/data/effects.js';
import { TILE } from '@/data/constants.js';
import { ZONES, isWorldViewZone, zoneHomes } from '@/data/zones.js'; /* v2.3.2978: 'worldview', or the Wheel's 'wheel'; v2.3.2990: its lands */

/* v2.3.1906: where the quest givers stand.  Every live NPC is spawned by
   BroTown's _spawnTownNpcs, which is town-only, so a finished objective always
   routes back to town.  Named rather than inlined so the day an NPC stands
   somewhere else, the search for what to change lands here. */
const QUEST_HOME_ZONE = 'town';

/* ═══ v2.3.2128: "ANYWHERE OUT THERE" IS A DESTINATION TOO ═══
 * Owner: "on the quest for 2 cooked fish show stars on all the zones on
 * minimap — one of the people in demo got confused, there was no stars for
 * that quest."
 *
 * The star used to answer "which zone does this quest name", and a quest that
 * names no zone got nothing.  But "Cook 2 fish" is not zone-less because it
 * happens nowhere — it is zone-less because it happens in ANY zone: fishing
 * holes are spawned one per zone (server gathering.js `_getZoneNodeConfig`)
 * and there are none in town.  So the honest answer for that quest is not
 * "no star", it is "every one of them", which is what a player standing on
 * the World View needs to see.
 *
 * This is the sentinel `questTargetZone` returns for that case.  Not a real
 * zone id — '*' cannot collide with one — and every consumer has to handle
 * it, which is the point: a caller that forgets goes back to starring
 * nothing rather than trying to walk to a zone called '*'. */
export const ANY_FIELD_ZONE = '*';

/** The zone the player's ACTIVE Mayor Bro step points at, or null.
 *  Null covers three ordinary cases and they are deliberately not
 *  distinguished: no quest running, a quest with no zone (cook / mine
 *  "any zone" steps), and a quest whose zone is not a place you travel to. */
export function questTargetZone(rpg, S) {
  const quests = (rpg && rpg._quests) || null;
  if (!quests) return null;
  let anyField = false;                    /* v2.3.2128 */
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
    /* v2.3.2128: remembered rather than returned, so a NAMED zone on any
       other active quest still wins.  "Frost Ridge" is a better direction
       than "anywhere", and holding both quests at once is normal. */
    if (q.anyZone) anyField = true;
  }
  return anyField ? ANY_FIELD_ZONE : null;
}

/** EVERY exit worth starring in the zone you are standing in — an array of
 *  world {x, y} plus the zone each leads to.  Empty when there is nothing
 *  useful to point at.
 *
 *  Usually one, because usually the quest names one place.  It is a LIST for
 *  the v2.3.2128 case above: an objective that any zone satisfies has no
 *  single right arch to mark, and picking one of five arbitrarily would be
 *  worse than marking all five — it would send everyone to the same zone and
 *  read as "the quest is here", which is a claim the star must not make.
 *
 *  Returning empty when you are ALREADY in the target zone is the important
 *  one: a star on the exit you just came through would be pointing at the way
 *  home while the quest is telling you to hunt here. */
export function questRouteExits(currentZone, rpg, S) {
  const target = questTargetZone(rpg, S);
  if (!target || !currentZone) return [];

  const at = (e) => ({ x: (e.tx + 0.5) * TILE, y: (e.ty + 0.5) * TILE, zoneId: e.zoneId });

  /* v2.3.2990: a hand-in where the quest giver stands right here -- the
     Wheel's Brotown has its own Mayor Bro -- is a walk to him, not a portal.
     Starring the marker back to today's town would send you away from the man
     the road points at (questRoutePoint, below). */
  if (target === QUEST_HOME_ZONE && currentZone !== QUEST_HOME_ZONE) {
    const want = _wantNpc(rpg, S);
    if (want && _npcHere(S, want)) return [];
  }

  /* v2.3.2128: "out there, anywhere". */
  if (target === ANY_FIELD_ZONE) {
    /* v2.3.2990: the Wheel has no portals out at all -- the World View's
       trails to the old lands are gone with it, its one exit the marker back
       to today's town -- and nothing to gather yet.  "Back to the Mayor" is
       advice for a locked spoke; with no spokes it would be a road to
       nowhere. */
    if (!WORLDVIEW_EXITS.some((e) => e && e.zoneId !== 'town')) return [];
    if (isWorldViewZone(currentZone)) {
      /* Every live spoke EXCEPT the one back to town — that is the way home,
         not a place to fish — and only the ones you can actually walk into.
         A locked spoke is painted shut (tileRenderer, v2.3.1822) and starring
         it would be the map arguing with the door. */
      const open = WORLDVIEW_EXITS
        .filter((e) => e && e.zoneId !== 'town' && isZoneUnlocked(rpg, e.zoneId));
      if (open.length) return open.map(at);
      /* Nothing out here is open to you yet, so "go fish anywhere" has no
         anywhere in it — the next real step is back to the Mayor for the
         quest that unlocks a zone.  Falling through to an empty list would
         put us back at the blank map this whole change is about. */
      const home = WORLDVIEW_EXITS.find((e) => e && e.zoneId === 'town');
      return home ? [at(home)] : [];
    }
    if (currentZone === 'town') {
      /* One way out of town, and the whole field is behind it — but only if
         any of it is open.  With every spoke still locked the trip is a dead
         end, and the Mayor's own '❗' pin is already the honest next step. */
      const anyOpen = WORLDVIEW_EXITS.some(
        (e) => e && e.zoneId !== 'town' && isZoneUnlocked(rpg, e.zoneId));
      if (!anyOpen) return [];
      const e = TOWN_EXITS.find((x) => x && x.zoneId === 'worldview');
      return e ? [at(e)] : [];
    }
    /* You are standing in a zone already: this IS one of the places the
       quest meant, so the next step is work, not travel. */
    return [];
  }

  const one = _routeOne(currentZone, target, S, at);
  return one ? [one] : [];
}

/** The single-destination route — the original v2.3.1817 behaviour, unchanged,
 *  hoisted out so the any-zone branch above can sit beside it. */
function _routeOne(currentZone, target, S, at) {
  if (currentZone === target) return null;          /* you are there — hunt, don't travel */

  if (isWorldViewZone(currentZone)) {
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
  return home ? { x: home.x, y: home.y, zoneId: (S && isWorldViewZone(S._enteredFromHub)) ? S._enteredFromHub : 'town' } : null;
}

/** The FIRST exit worth starring, or null.  Kept because "where is the quest
 *  pointing" is still a one-answer question for every caller that only wants
 *  one — and because the QA probe has published this shape since v2.3.1817. */
export function questRouteExit(currentZone, rpg, S) {
  const list = questRouteExits(currentZone, rpg, S);
  return list.length ? list[0] : null;
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

/* ═══ v2.3.2121: THE LAST FEW STEPS, WHICH THE STAR NEVER HAD TO TAKE ═══
 *
 * Owner: "a light gold path to the next area you're supposed to go to", and
 * "first time upon joining ... find the mayor because he wants to speak with
 * you".
 *
 * questRouteExit answers "which portal", which is the whole job on a minimap
 * — it deliberately returns null once you are IN the target zone, because a
 * star on the exit you just walked through would point home.  A road on the
 * ground has one more question to answer: you are standing in town, the man
 * you need is forty tiles away behind a fountain, and "no route" leaves the
 * one screen where the feature was asked for blank.
 *
 * So this wraps it and adds the in-town leg.  It is a SEPARATE export rather
 * than a change to questRouteExit because the minimap's contract is right as
 * it is: the star marks portals, and it should not start marking people.
 *
 * TWO CASES REACH THE NPC, and no others:
 *   - an active quest whose objective is already met — the next step is the
 *     hand-in, which is exactly what v2.3.1906 taught questTargetZone; this
 *     just walks the last few tiles of it.
 *   - a player with NO quest records at all, i.e. brand new.  That is the
 *     welcome case, and it is the only time this points at a quest you have
 *     not accepted: a general "walk to any available quest" pointer would be
 *     a nag, and this fires once in a character's life.
 *
 * The position is read from the LIVE npc list, never from NPC_DATA: two of
 * them walk (v2.3.2046/2064), and a road to where someone used to stand is
 * worse than no road.
 */
const WELCOME_NPC = 'Mayor Bro';

export function questRoutePoint(currentZone, rpg, S) {
  const exit = questRouteExit(currentZone, rpg, S);
  if (exit) return exit;
  if (currentZone !== QUEST_HOME_ZONE) return _wheelPoint(currentZone, rpg, S);

  const wantNpc = _wantNpc(rpg, S);
  if (!wantNpc) return null;
  return _npcHere(S, wantNpc);
}

/* The quest giver the road should lead to: the Mayor for a brand-new player
   (the welcome), or whoever gives the first active quest whose objective is
   met (the hand-in) -- or null.  v2.3.2990: hoisted out of questRoutePoint,
   unchanged, for the Wheel's own Brotown below. */
function _wantNpc(rpg, S) {
  const quests = (rpg && rpg._quests) || null;
  if (!quests || !Object.keys(quests).length) {
    /* v2.3.2765: "no quests" only means brand new once the worker has said
       so -- before its first player_state this is a blank default, and a
       returning player was shown the road to the Mayor (wsClient
       _rpgFromServer).  Absent S (a caller without one) keeps the old rule. */
    if (S && S._rpgFromServer === false) return null;
    return WELCOME_NPC;                          /* brand new: go meet him */
  }
  for (const qid of Object.keys(quests)) {
    if (quests[qid] !== QUEST_STATUS.active) continue;
    const q = QUEST_CHAINS[qid];
    if (!q || !q.npc) continue;
    let done = false;
    try { done = !!(q.check && q.check(rpg, S)); } catch (e) { done = false; }
    if (done) return q.npc;                      /* hand it in */
  }
  return null;
}

/* Where that quest giver stands in the zone you are in, from the LIVE npc list
   (the note above questRoutePoint), or null when he is not here. */
function _npcHere(S, name) {
  const npcs = (S && S.npcs) || null;
  if (!Array.isArray(npcs)) return null;
  const n = npcs.find((o) => o && o.name === name);
  return (n && typeof n.x === 'number' && typeof n.y === 'number')
    ? { x: n.x, y: n.y, npc: name }
    : null;
}

/* ═══ v2.3.2990: IN THE WHEEL THE WAY IS A PLACE, NOT A PORTAL ═══
 *
 * Owner, 2026-10-02: "I'm ready to have this replace the old game map. Just
 * have players spawn in town" -- the Wheel's Brotown (src/game/wheelHome.js).
 * Every rule above finds its way through the old World View's portals to the
 * old lands, and the Wheel has none: its one exit is the marker back to
 * today's town.  But it has what those portals led to.  Its Brotown has its
 * own Mayor Bro (BroTown _spawnWheelNpcs, in the live npc list like
 * today's townsfolk), and each land's monsters stand at the inner end of its
 * spoke.  So here:
 *
 *   - a quest that names a land ("Bring 4 Snowman Remnants from Frost
 *     Ridge") leads to the middle of where that land's monsters stand
 *     (ZONES.wheel.lands), and stops once you are among them: there you
 *     hunt, you don't travel (what `currentZone === target` says elsewhere);
 *   - a hand-in, or a brand-new player's welcome, leads to the Mayor here;
 *   - "any zone will do" (fishing, ore) leads nowhere: the Wheel has nothing
 *     to gather yet.
 *     v2.3.3012: it has now (server wheelzone.js) -- so it leads to the
 *     nearest live node of the kind the quest's next step needs (a fishing
 *     spot, then a tree, for life_1; a vein for life_2), and stops when you
 *     are at it.  A step that needs no node (light the fire, cook) has no
 *     road, as before.
 *
 * Anywhere else this is what it was -- null -- as no other zone but town has
 * a live npc list or a `lands` table. */
const LAND_HERE_R = 600;   /* game px: each land's monsters all stand within ~550 of its middle */

function _wheelPoint(currentZone, rpg, S) {
  const target = questTargetZone(rpg, S);
  if (target === ANY_FIELD_ZONE) return zoneHomes(currentZone) ? _wheelGatherPoint(rpg, S) : null;
  if (target && target !== QUEST_HOME_ZONE) {
    const homes = zoneHomes(currentZone);
    const z = homes && homes.includes(target) ? ZONES[currentZone] : null;
    const spot = z && z.lands && z.lands[target];
    if (!spot) return null;
    const P = (S && S.player) || null;
    if (P && Math.hypot(P.x - spot[0], P.y - spot[1]) < LAND_HERE_R) return null;
    return { x: spot[0], y: spot[1], zoneId: target, land: true };
  }
  const want = _wantNpc(rpg, S);
  return want ? _npcHere(S, want) : null;
}

/* ═══ v2.3.3012: A GATHERING QUEST LEADS TO THE NEAREST NODE ═══
   The node kind comes from the quest: its current step's `node` when it has
   steps (life_1: fish, then a log), else its own (life_2: ore) -- the first
   active "any zone" quest that is not yet done, as questTargetZone reads them.
   Only live nodes you hold the tool for: a node without one is not drawn
   (effectsRenderer, v2.3.1680), and a road to something invisible is worse
   than none.  Within GATHER_HERE_R of it you are there, and the road stops,
   as it does among a land's monsters. */
const GATHER_HERE_R = 160;

function _wantNode(rpg, S) {
  const quests = (rpg && rpg._quests) || null;
  if (!quests) return null;
  for (const qid of Object.keys(quests)) {
    if (quests[qid] !== QUEST_STATUS.active) continue;
    const q = QUEST_CHAINS[qid];
    if (!q || !q.anyZone) continue;
    let done = false;
    try { done = !!(q.check && q.check(rpg, S)); } catch (e) { done = false; }
    if (done) continue;
    const steps = questSteps(q, rpg, S);
    if (steps) {
      const cur = steps.find((st) => st.current);
      return (cur && cur.node) || null;
    }
    return q.node || null;
  }
  return null;
}

function _wheelGatherPoint(rpg, S) {
  const want = _wantNode(rpg, S);
  const P = (S && S.player) || null;
  if (!want || !P || !hasGatherTool(rpg, want)) return null;
  let best = null, bestD = Infinity;
  for (const n of ((S && S.gatherNodes) || [])) {
    if (!n || n.nodeType !== want || !n.alive) continue;
    /* v2.3.3038: nor to one the player's level cannot harvest yet (black
       steel below Mining 5, clownfish below Fishing 5): the nearest fishing
       spot past the commons is a clownfish's, and the road would have led a
       new player to a "Need Fishing Lv 5" when minnows swim nearer home. */
    const _need = gatherNeed(S, n);
    if (_need && !_need.ok) continue;
    const d = Math.hypot(n.x - P.x, n.y - P.y);
    if (d < bestD) { bestD = d; best = n; }
  }
  if (!best || bestD < GATHER_HERE_R) return null;
  return { x: best.x, y: best.y, node: want };
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
