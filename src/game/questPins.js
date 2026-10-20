/* ═══ v2.3.3510: THE QUEST PINS ON THE MAPS ═══
 *
 * The owner: "Make the quest icons appear on the minimap and map too" -- with
 * "mayor bro is the only quest available for the first quest then after
 * completing that other NPCs begin having quest icons appear above their
 * head", six townsfolk offer a quest at once, and the gold road can lead to
 * only one of them (questRoute.js tourOffer).  The maps show the rest.
 *
 * The pin over a townsperson's head (entityRenderer, data/ownerIcons.js
 * QUEST_PIN) is npc._questMarker, set every frame by BroTown's townsfolk loop
 * from getNpcQuest: '❗' a quest to take, '❔' one taken and waiting on you,
 * '❓' one you can hand in.  This reads that same field -- one source, so a
 * map can never disagree with the head -- for the Wheel's minimap
 * (rendering/systems/wheelMinimap.js) and the world map
 * (ui/WorldMapOverlay.jsx).  The zones' small box (minimapRenderer.js) has
 * drawn its own pins from the same field since v2.3.1817.
 *
 * No imports: a node suite reads it as it is (server/test/quest-pins.test.mjs).
 */

/* the head's marks, by the picture each map draws (QUEST_PIN's keys) */
export const PIN_OF_MARK = Object.freeze({ '❗': 'offer', '❔': 'waiting', '❓': 'ready' });

/* drawn last is drawn on top: a quest to hand in over one to take, over one
   waiting on you */
const PIN_ORDER = Object.freeze({ waiting: 0, offer: 1, ready: 2 });

/** The map's picture for a head's mark, or null for none. */
export function questPinState(mark) {
  return typeof mark === 'string' && Object.prototype.hasOwnProperty.call(PIN_OF_MARK, mark) ? PIN_OF_MARK[mark] : null;
}

/** Every townsperson here wearing a quest pin: [{ name, x, y, state }], the
 *  one to hand in last (drawn on top). */
export function questPinsOf(S) {
  const out = [];
  const npcs = S && Array.isArray(S.npcs) ? S.npcs : [];
  for (const n of npcs) {
    if (!n || n.alive === false || typeof n.x !== 'number' || typeof n.y !== 'number') continue;
    const state = questPinState(n._questMarker);
    if (state) out.push({ name: typeof n.name === 'string' ? n.name : '', x: n.x, y: n.y, state });
  }
  out.sort((a, b) => PIN_ORDER[a.state] - PIN_ORDER[b.state]);
  return out;
}

/* each map's pin, in CSS px, the head pin's own shape (72 x 86): the Wheel's
   minimap a little bigger than a bro's dot (13 px), smaller on the box's edge
   for a townsperson just off it (EDGE: within EDGE_R game px of you, a box's
   width -- from the town square the minimap's window holds only some of the
   town, and further out the way home is the home badge's), the world map as
   big as its quest star, and bigger again once the town's buildings are
   named */
export const MAP_PIN = Object.freeze({
  MINI_W: 14, MINI_H: 17,
  EDGE_W: 10, EDGE_H: 12, EDGE_R: 3200,
  WORLD_W: 16, WORLD_H: 19,
  TOWN_W: 22, TOWN_H: 26,
});
