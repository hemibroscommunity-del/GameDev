/* ═══ INTERACTIONS — emote broadcast + building entry ═══ */
/* v2.3.842: moved verbatim from the useCallback bodies in
   src/ui/BroTown.jsx (behavior-frozen). Two small player-interaction
   helpers; the component keeps thin useCallback wrappers (identity
   unchanged for the touch/keyboard/JSX callers). Both were fully
   synchronous and read `stateRef.current` directly; here that became the
   passed-in `S` (same object at call time — identical). React setters via
   deps: sendEmote -> setShowEmotes, enterBuilding -> setBuildingPanel. */
import { BT_AUDIO, BUILDINGS, hasUnlock, QUEST_CHAINS } from '@/data/index.js';
import { _typeof } from '@/lib/babelHelpers.js';

import { pushDmgPopup } from '@/game/combatHelpers.js';
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
    /* Open in-game building panel — check quest unlock gates */
    var actionKey = b.action || b.id;
    var R2 = S.rpg;
    var BUILDING_UNLOCK_MAP = {
      forge: 'blacksmith',
      woodwork: 'woodworker_reforge',
      enchant: 'enchanting',
      gemcut: 'gem_cutting',
      exchange: 'marketplace',
      farm: 'farming'
    };
    var requiredUnlock = BUILDING_UNLOCK_MAP[actionKey];
    if (requiredUnlock && R2 && !hasUnlock(R2, requiredUnlock)) {
      /* Find which quest unlocks this */
      var gateQuest = Object.values(QUEST_CHAINS).find(function (q) {
        return q.unlocks === requiredUnlock;
      });
      var msg = gateQuest ? 'Complete "' + gateQuest.title + '" (' + gateQuest.npc + ') to unlock this!' : 'Locked! Complete quests to unlock.';
      pushDmgPopup(S, S.player.x, S.player.y - 30, msg, '#f5c542');
      BT_AUDIO.beep(200, 0.08, 0.1, 'triangle');
      return;
    }
    setBuildingPanel(actionKey);
}
