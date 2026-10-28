/* ═══ v2.3.3766: WHERE A BOARD PLACE IS, FOUND AT RUNTIME ═══
 *
 * The Town Hall's board (data/townBoard.js) names each place by how it is
 * found, never by a coordinate (CLAUDE.md §1: "Never write a Wheel coordinate
 * into code"):
 *   { door }   the foot of a town building's steps (wheelTownDoors, from the
 *              ground worker's objects);
 *   { npc }    where a townsperson stands (S.npcs; until he is spawned, his
 *              door's foot plus his offset in WHEEL_TOWNSFOLK -- the table
 *              that places him);
 *   { mouth }  a dungeon's way in (wheelDungeonDoors, from the worker's map);
 *   { land }   a land's first stretch: the middle of its first level band on
 *              the world map's `lands` (its `ticks`, where each band begins).
 * null while the world has not said yet (the maps simply draw no pin).
 * Also which rows the board shows: a row waiting for a worker cap it does not
 * have, or a dungeon this worker does not open, is left off. */
import { wheelTownDoors } from './wheelTownDoors.js';
import { wheelDungeonDoors, wheelDungeonOpen } from './wheelDungeons.js';
import { wheelMapInfo } from './wheelTrial.js';
import { WHEEL_TOWNSFOLK } from '@/data/wheelBuildingDoors.js';
import { BOARD, boardEntry } from '@/data/townBoard.js';

const own = (o, k) => !!o && typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);

/** Is board row `e` there to do with this worker? */
export function boardRowOpen(S, e) {
  if (!e) return false;
  if (e.cap) {
    const caps = S && S._serverCaps;
    if (!(caps && own(caps, e.cap) && caps[e.cap])) return false;
  }
  if (e.mouth && !wheelDungeonOpen(S, e.mouth)) return false;
  return true;
}

/** The board's rows this worker opens, in the board's order. */
export function boardRows(S) {
  return BOARD.filter((e) => boardRowOpen(S, e));
}

function doorAt(id) {
  for (const d of wheelTownDoors()) if (d.id === id) return { x: d.x, y: d.y };
  return null;
}

/** Where board place `id` is, { x, y } in game px, or null (not known yet). */
export function boardPlaceAt(S, id) {
  const e = boardEntry(id);
  if (!e || !e.at) return null;
  const at = e.at;
  if (at.door) return doorAt(at.door);
  if (at.npc) {
    const npcs = S && Array.isArray(S.npcs) ? S.npcs : [];
    for (const n of npcs) if (n && n.name === at.npc && isFinite(n.x) && isFinite(n.y)) return { x: n.x, y: n.y };
    const row = WHEEL_TOWNSFOLK.find((t) => t.name === at.npc);
    const d = row ? doorAt(row.door) : null;
    return d ? { x: d.x + row.dx, y: d.y + row.dy } : null;
  }
  if (at.mouth) {
    for (const d of wheelDungeonDoors()) if (d.id === at.mouth) return { x: d.x, y: d.y };
    return null;
  }
  if (at.land) {
    const map = wheelMapInfo();
    const L = map && Array.isArray(map.lands) ? map.lands.find((l) => l && l.id === at.land) : null;
    const T = L && Array.isArray(L.ticks) ? L.ticks : null;
    if (T && T.length >= 4) return { x: (T[0] + T[2]) / 2, y: (T[1] + T[3]) / 2 };
    return L && isFinite(L.x) && isFinite(L.y) ? { x: L.x, y: L.y } : null;
  }
  return null;
}
