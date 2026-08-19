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

export function sendEmote(S, emoji, deps) {
  var setShowEmotes = deps.setShowEmotes;
    BT_AUDIO.emote();
    if (S.stats) S.stats.emotesUsed++;
    S.emote = {
      emoji: emoji,
      ts: Date.now()
    };
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
    if (nb === null) return;
    var b = BUILDINGS[nb];
    if (!b.action && !b.id) return;
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
}
