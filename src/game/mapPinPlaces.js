/* ═══ v2.3.3766: WHERE A BOARD PLACE IS, FOUND AT RUNTIME ═══
 *
 * The Town Hall's board (data/townBoard.js) names each place by how it is
 * found, never by a coordinate (CLAUDE.md §1: "Never write a Wheel coordinate
 * into code"):
 *   { door }   the foot of a town building's steps (wheelTownDoors, from the
 *              ground worker's objects);
 *   { npc }    where a townsperson stands (S.npcs; until he is spawned, his
 *              door's foot plus his offset in WHEEL_TOWNSFOLK -- the table
 *              that places him -- or the door he keeps, WHEEL_KEEPERS, for
 *              Mayor Bro, whom the town places);
 *   { mouth }  a dungeon's way in (wheelDungeonDoors, from the worker's map);
 *   { land }   a land's first stretch: the middle of its first level band on
 *              the world map's `lands` (its `ticks`, where each band begins).
 * null while the world has not said yet (the maps simply draw no pin).
 * Also which rows the board shows: a row waiting for a worker cap it does not
 * have, or a dungeon this worker does not open, is left off. */
import { wheelTownDoors } from './wheelTownDoors.js';
import { wheelDungeonDoors, wheelDungeonOpen, wheelDungeonBoardLine } from './wheelDungeons.js';
import { wheelMapInfo } from './wheelTrial.js';
import { WHEEL_TOWNSFOLK, WHEEL_KEEPERS } from '@/data/wheelBuildingDoors.js';
import { BOARD, boardEntry, landSub, boardLand, boardLandElement } from '@/data/townBoard.js';

const own = (o, k) => !!o && typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);

/* v2.3.3779: the lands' names as the world spells them (plan.js regions,
   the world map's `names`), for the board's `{land}` words (data/townBoard.js
   boardWords); null before the world map is made */
export function boardLandNames() {
  const map = wheelMapInfo();
  return map && map.names && typeof map.names === 'object' ? map.names : null;
}

/* v2.3.3788: the level line under a dungeon's tile ("Lv 10+ · party of
   2–3", "Lv 26+"): the dungeon tables (game/wheelDungeons.js), with the
   place's levels from the world map (its landmark at the mouth's land, the
   plan's tier) -- never a number written on the board.  null for a row that
   is no dungeon, or before the map is made. */
export function boardDungeonLine(S, e) {
  if (!e || !e.mouth) return null;
  const map = wheelMapInfo();
  const places = map && Array.isArray(map.places) ? map.places : [];
  const lm = places.find((p) => p && p.kind === 'landmark' && p.region === e.mouth && Array.isArray(p.levels));
  return wheelDungeonBoardLine(S, e.mouth, lm ? lm.levels : null);
}

/* v2.3.3801: does this worker have cap `cap`? */
function hasCap(S, cap) {
  const caps = S && S._serverCaps;
  return !!(caps && own(caps, cap) && caps[cap]);
}

/** v2.3.3801: the line under row `e`'s name: a dungeon's levels, a land's
    compass and element (the world map's `lands`, from the plan), the words
    of a worker with its `ifCap`, else the row's own `sub`; null for none. */
export function boardSub(S, e) {
  if (!e) return null;
  if (e.mouth) return boardDungeonLine(S, e);
  const land = boardLand(e);
  if (land) {
    const map = wheelMapInfo();
    const L = map && Array.isArray(map.lands) ? map.lands.find((l) => l && l.id === land) : null;
    return landSub(L ? L.dir : null, L && L.element ? L.element : boardLandElement(land));
  }
  if (e.ifCap && hasCap(S, e.ifCap.cap) && e.ifCap.sub) return e.ifCap.sub;
  return e.sub || null;
}

/** v2.3.3801: row `e`'s page words (its `ifCap` words with that cap). */
export function boardPage(S, e) {
  if (!e) return [];
  return e.ifCap && hasCap(S, e.ifCap.cap) && Array.isArray(e.ifCap.page) ? e.ifCap.page : e.page;
}

/** Is board row `e` there to do with this worker? */
export function boardRowOpen(S, e) {
  if (!e) return false;
  if (e.cap && !hasCap(S, e.cap)) return false;
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
    if (d) return { x: d.x + row.dx, y: d.y + row.dy };
    /* v2.3.3788: Mayor Bro is placed by the town (placing.js mayorSpot), on
       his hall's steps: until he is spawned, the door he keeps */
    return own(WHEEL_KEEPERS, at.npc) ? doorAt(WHEEL_KEEPERS[at.npc]) : null;
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
