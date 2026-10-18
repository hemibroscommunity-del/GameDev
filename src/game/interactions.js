/* ═══ INTERACTIONS — emote broadcast + building entry ═══ */
/* v2.3.842: moved verbatim from the useCallback bodies in
   src/ui/BroTown.jsx (behavior-frozen). Two small player-interaction
   helpers; the component keeps thin useCallback wrappers (identity
   unchanged for the touch/keyboard/JSX callers). Both were fully
   synchronous and read `stateRef.current` directly; here that became the
   passed-in `S` (same object at call time — identical). React setters via
   deps: sendEmote -> setShowEmotes, enterBuilding -> setBuildingPanel. */
import { BT_AUDIO, BUILDINGS } from '@/data/index.js'; /* v2.3.1779: hasUnlock + QUEST_CHAINS went with the retired building gate */
import { _typeof } from '@/lib/babelHelpers.js';
import { emoteKind, emotesLive, EMOTE_COOLDOWN_MS } from '@/game/emotes.js'; /* v2.3.3353 */

export function sendEmote(S, emoji, deps) {
  var setShowEmotes = deps.setShowEmotes;
    /* ═══ v2.3.3353: AN EMOTE YOU CAN SEE (src/game/emotes.js) ═══
       Only a listed emote goes out (the worker relays nothing else, emotes.js
       on its side), at most one a second (the relay allowance it spends is
       your swings' and arrows' too), and none under the worker's `emotes:
       false`.  An emoji pops over your head (effectsRenderer
       _updateEmotePops); a quick line ("GG") is your speech bubble, as a
       typed line is. */
    var kind = emoteKind(emoji);
    var now = Date.now();
    if (!kind || !emotesLive(S) || (S._emoteAt && now - S._emoteAt < EMOTE_COOLDOWN_MS)) {
      setShowEmotes(false);
      return;
    }
    S._emoteAt = now;
    BT_AUDIO.emote();
    if (S.stats) S.stats.emotesUsed++;
    S.emote = {
      emoji: emoji,
      ts: now
    };
    if (kind === 'line') {
      if (!S.chatBubbles) S.chatBubbles = {};
      S.chatBubbles[S.myId] = { text: emoji, ts: now };
    }
    if (S.channel) S.channel.send({
      type: 'broadcast',
      event: 'emote',
      payload: {
        id: S.myId,
        emoji: emoji
      }
    });
    setShowEmotes(false);
}

export function enterBuilding(S, deps) {
  var setBuildingPanel = deps.setBuildingPanel;
    var nb = S.nearBuilding;
    if (nb === null) {
      /* v2.3.3066: a Wheel door that opens a hall of its own -- the Guild
         Hall, the Post Office, the Sheriff's Office (data/wheelBuildingDoors.js
         WHEEL_HALL_DOORS) -- rather than one of today's buildings.  Not counted
         in visitedBuildings: those are BUILDINGS indexes, and mayor_1's "visit
         3 buildings" counts the twelve. */
      var _hall = S._nearWheelBuilding && S._nearWheelBuilding.hall;
      if (_hall) {
        BT_AUDIO.enterBuilding();
        setBuildingPanel(_hall);
      }
      return;
    }
    _openBuilding(S, nb, setBuildingPanel);
}

/* ═══ v2.3.3258: A KEEPER OPENS HIS BUILDING ═══
   The owner, choosing the shopkeeper outside over walking in: "interacting
   with the building's NPC instead of having the building interiors".  A
   townsperson who keeps a building (data/wheelBuildingDoors.js WHEEL_KEEPERS:
   Blacksmith Bro the forge, Mayor Bro the Town Hall) opens its window when you
   talk to him -- the same window, the same visit counted, as its door.
   `door` is one of game/wheelTownDoors.js wheelTownDoors(): `index` the
   BUILDINGS entry, or `hall` the Wheel's own hall.  True when it opened. */
export function enterWheelDoor(S, door, deps) {
  if (!door) return false;
  if (door.index >= 0) return _openBuilding(S, door.index, deps.setBuildingPanel);
  if (door.hall) {
    BT_AUDIO.enterBuilding();
    deps.setBuildingPanel(door.hall);
    return true;
  }
  return false;
}

function _openBuilding(S, nb, setBuildingPanel) {
    var b = BUILDINGS[nb];
    if (!b || (!b.action && !b.id)) return false;
    BT_AUDIO.enterBuilding();
    var S2 = S;
    if (S2.stats) {
      if (!S2.stats.visitedBuildings) S2.stats.visitedBuildings = new Set();
      if (_typeof(S2.stats.visitedBuildings) === 'object' && !(S2.stats.visitedBuildings instanceof Set)) S2.stats.visitedBuildings = new Set(Object.values(S2.stats.visitedBuildings));
      S2.stats.visitedBuildings.add(nb);
      S2.stats.buildingsVisited = S2.stats.visitedBuildings.size;
    }
    /* ═══ v2.3.1779: BUILDINGS OPEN ON SIGHT (owner directive) ═══
       Owner: "Buildings open on site."

       Every entry in the retired table below pointed at an unlock granted by a
       quest chain that is NOT live — the forge wanted 'blacksmith' from the
       dormant Blacksmith Bron line, the enchanter wanted 'enchanting', and so
       on.  With the entrances restored in v2.3.1778 that turned two of the
       four placed buildings into doors that named a quest from an NPC who does
       not exist in the game.  A gate whose key cannot be obtained is not a
       gate, it is a wall.

       KEPT AS A COMMENT rather than deleted, because the gating is a design
       someone may want back the day those chains ship: restore the map and the
       `hasUnlock` check below it and the behaviour returns exactly.

         var BUILDING_UNLOCK_MAP = {
           forge: 'blacksmith',      woodwork: 'woodworker_reforge',
           enchant: 'enchanting',    gemcut: 'gem_cutting',
           exchange: 'marketplace',  farm: 'farming',
         };
         var requiredUnlock = BUILDING_UNLOCK_MAP[actionKey];
         if (requiredUnlock && R2 && !hasUnlock(R2, requiredUnlock)) { ...refuse... }
    */
    var actionKey = b.action || b.id;
    setBuildingPanel(actionKey);
    return true;
}
