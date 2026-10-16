/* ═══ v2.3.3272: YOUR PARTY ON THE MINIMAP AND THE WORLD MAP ═══
 *
 * The owner, 2026-10-16: "Yes do suggested" -- the backlog's party follow-up
 * (docs/ARCHITECTURE-HANDOFF.md item D: "same-zone member arrows / map
 * markers").  Both maps drew every other player as the same green dot, so a
 * party member was one dot among the crowd, and once they walked off the
 * minimap's box there was no telling which way they went.  Presence v2 already
 * sends your party wherever they are in the Wheel, whole, about once a second
 * (server/src/presence2.js), so the phone knows where they are; it only had to
 * show it:
 *   - the MINIMAP (src/rendering/systems/wheelMinimap.js) draws a party member
 *     in the party's blue, a little bigger than a bro, with a light rim, over
 *     the green dots; one off the box rides the box's inner edge on the line to
 *     them (`clampToBox`, the quest star's own rule), smaller, so you can walk
 *     toward them;
 *   - the WORLD MAP (src/ui/WorldMapOverlay.jsx) draws them in the same blue at
 *     every zoom (the other bros only from zoom 1.5), named, and its key says
 *     "party";
 *   - the dungeons' and the farm's small box (minimapRenderer.js) draws them
 *     blue with the same rim, over the monsters (its townsfolk are a blue of
 *     their own, C_NPC; the rim tells them apart).
 * A member in another zone (a dungeon, the farm) is on neither map; the party
 * window says where they are.
 *
 * No imports: node-tested (server/test/party-marks.test.mjs).
 */

export const PARTY_MARK = Object.freeze({
  /* the UI's Info blue (docs/LANTERN-SLATE-SPEC.md), with a light rim so it
     reads on the frost land's pale blue too */
  COLOR: 0x5d93d2,
  CSS: '#5D93D2',
  RIM: 0xf7f2e7,
  RIM_CSS: '#F7F2E7',
  /* the minimap's sizes: a bro is 13 px; a member on the box's edge smaller */
  PX: 15,
  EDGE_PX: 11,
});

/** Your party's OTHER members' ids, as a Set, or null when you are in none.
    `S._party` is the worker's last party_state (gameEvents.js). */
export function partyIdsOf(S) {
  const p = S && S._party;
  if (!p || p.state !== 'open' || !Array.isArray(p.members)) return null;
  let out = null;
  for (const m of p.members) {
    const id = m && m.id != null ? String(m.id) : null;
    if (!id || id === String(S.myId)) continue;
    (out || (out = new Set())).add(id);
  }
  return out;
}

/** A mark at box px (x, y) seen from you at (px, py): inside the box's inner
    rectangle [lo, hi] x [lo, hiY] it stays where it is; outside, it rides the
    rectangle's edge on the line from you to it -- the quest star's clamp
    (wheelMinimap.js).  Returns { x, y, edge }. */
export function clampToBox(px, py, x, y, lo, hi, hiY) {
  const dx = x - px, dy = y - py;
  let t = 1;
  if (dx > 0) t = Math.min(t, (hi - px) / dx); else if (dx < 0) t = Math.min(t, (lo - px) / dx);
  if (dy > 0) t = Math.min(t, (hiY - py) / dy); else if (dy < 0) t = Math.min(t, (lo - py) / dy);
  t = Math.max(0, t);
  return { x: px + dx * t, y: py + dy * t, edge: t < 1 };
}
