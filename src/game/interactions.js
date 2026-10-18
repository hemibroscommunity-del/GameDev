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
import { moveKind, EMOTE_MOVES, EMOTE_HOLD_IDS } from '@/game/emoteMoves.js'; /* v2.3.3355: your bro moves */
import { swimRefused, airRefused } from '@/game/combatHelpers.js'; /* v2.3.3355 */

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

/* ═══ v2.3.3355: YOUR BRO MOVES (game/emoteMoves.js, docs/specs/emote-moves.md) ═══
   A MOMENT (wave, laugh, flex, shrug, facepalm, cheer) is the `emote` relay's
   `{move}`, drawn on every phone near you for a second or two.  A HELD pose
   (sit, sleep, flop, a dance) is `pose {id}` to the worker, which keeps it on
   your player (server/src/poses.js) so a phone that comes near later sees it,
   until you move.  Both draw here at once (rendering/emoteFx.js).
   Not swimming ("Swimming!"), in the air, dead, harvesting or asleep on the
   farm bed; one a second with the emotes (the relay allowance is your
   swings' too); only against a worker that says `caps.emotemoves`. */
/* a held pose ends when you are moved more than this (world px) */
var POSE_SHIFT_PX = 4;
export function movesLive(S) {
  return !!(S && S._serverCaps && S._serverCaps.emotemoves === true) && emotesLive(S);
}
export function sendMove(S, id, deps) {
  var setShowEmotes = deps && deps.setShowEmotes;
  if (setShowEmotes) setShowEmotes(false);
  var kind = moveKind(id);
  if (!kind || !movesLive(S) || !S.player) return false;
  if (S.player.dead || S._dead || S._extraction || S._sleeping) return false;
  if (swimRefused(S) || airRefused(S)) return false;
  var now = Date.now();
  if (S._emoteAt && now - S._emoteAt < EMOTE_COOLDOWN_MS) return false;
  S._emoteAt = now;
  BT_AUDIO.emote();
  if (S.stats) S.stats.emotesUsed++;
  var pop = EMOTE_MOVES[id].pop;
  if (pop) S.emote = { emoji: pop, ts: now, trusted: true };
  if (kind === 'once') {
    if (S._pose) endOwnPose(S);
    S._emoteMove = { id: id, at: now };
    if (S.channel) S.channel.send({ type: 'broadcast', event: 'emote', payload: { id: S.myId, move: id } });
  } else {
    S._emoteMove = null;
    /* where and in which zone it began: anything that moves you -- a step,
       a shove, a door -- stands you up (updateOwnEmote), as the worker's
       movement.js stands up its copy */
    S._pose = { id: id, at: now, popAt: now, x: S.player.x, y: S.player.y, zone: S.currentZone };
    if (S.channel) S.channel.send({ type: 'pose', id: id });
  }
  return true;
}
/* stand up, and tell the worker.  It stands its copy up on a real step by
   itself (movement.js), but a first step into a wall moves nobody, and a
   slow drift is never one step past its line: one word more is cheaper than
   a bro drawn sitting on the others' screens and standing on his own */
export function endOwnPose(S) {
  if (!S || !S._pose) return;
  S._pose = null;
  if (S.channel) S.channel.send({ type: 'pose', id: null });
}
/* once a frame (BroTown's loop, beside the sprint): a moment is over on its
   own clock, and a held pose ends when you move, attack, raise the shield,
   swim, jump, harvest or die -- or a blow lands on you or from you after it
   began (`fightAt`, the fight-food stamps: game/fightFood.js fightSeen) */
export function updateOwnEmote(S, now, f) {
  if (S._emoteMove) {
    var m = EMOTE_MOVES[S._emoteMove.id];
    if (!m || now - S._emoteMove.at > (m.ms || 0)) S._emoteMove = null;
  }
  if (!S._pose) return;
  if (EMOTE_HOLD_IDS.indexOf(S._pose.id) < 0 || f.moving || f.attacking || f.shield || f.swimming
      || f.dead || f.jumping || f.harvesting || f.fightAt > S._pose.at) { endOwnPose(S); return; }
  /* moved with no thumb on the stick -- a gust, a knock-back, a door, a
     respawn -- or into another zone */
  var P = S.player;
  if (S._pose.zone !== S.currentZone || !P || Math.abs(P.x - S._pose.x) > POSE_SHIFT_PX || Math.abs(P.y - S._pose.y) > POSE_SHIFT_PX) {
    endOwnPose(S);
    return;
  }
  /* a held pose's own emoji, now and then (Zzz, music notes) */
  var hm = EMOTE_MOVES[S._pose.id];
  if (hm && hm.pop && hm.every && now - (S._pose.popAt || 0) > hm.every) {
    S._pose.popAt = now;
    S.emote = { emoji: hm.pop, ts: now, trusted: true };
  }
}

/* once a frame too: another player's held pose pops its emoji on this
   phone -- when it is first seen, then every `every` ms (Zzz, music notes);
   the worker keeps only the pose (tick.js `po`), never a relay a minute */
export function updatePeerEmotes(S, now) {
  var others = S && S.others;
  if (!others) return;
  for (var id in others) {
    var o = others[id];
    if (!o || !o._po) continue;
    var hm = EMOTE_MOVES[o._po];
    if (!hm || hm.kind !== 'hold' || !hm.pop) continue;
    var first = !(o._poPopAt >= (o._poAt || 0));
    if (first || (hm.every && now - o._poPopAt > hm.every)) {
      o._poPopAt = now;
      o.emote = { emoji: hm.pop, ts: now, trusted: true };
    }
  }
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
