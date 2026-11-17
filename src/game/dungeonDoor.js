/* ═══ v2.3.5535: THE DUNGEON'S PAGE DOOR -- ONE WRITER OF YOUR RUN ON THE PHONE (card L PR 5) ═══
 * (docs/specs/dungeon-page-door.md; held by server/test/dungeon-page-door.test.mjs
 * and the phase table's guard, tools/guards/phase-table.test.mjs)
 *
 * Your dungeon run on the phone is one field, `S._inDungeon` (out, in), its
 * notes written beside it by the same call: `S._inCustomDungeon` (a run of
 * the custom kind, every run on the page today) and `S._dungeonComplete`
 * (its last wave beaten).  Seven files wrote them in twenty-four places; now
 * only dungeonTo does, by a way of DUNGEON_PAGE_WAYS:
 *   enter     gameEvents.js (the worker's run), DungeonCreatorPanel.jsx (a
 *             run of your own): in, custom, not complete
 *   complete  gameEvents.js, dungeonWaves.js: the last wave beaten
 *   leave     gameEvents.js, dungeonWaves.js, zoneTransitions.js,
 *             wheelDungeons.js, respawn.js: out (each site writes the
 *             fields it wrote before, and only those)
 * `fields` names what to write: { in, custom, complete }, each a boolean;
 * a field not named is left as it is, as each old site left it.  The rule
 * is the callers' own: enter writes in, complete writes complete, leave
 * writes no `in: true`.  Nothing a player sees changes.  `?dungeondoor=0`
 * writes what a caller asks, as the lines before the door.
 *
 * Beside the door: the run's place and number (S._serverDungeon,
 * S._dungeonZone, S._dungeonWave, S._dungeonBack), the opening
 * (S._wheelDungeonOpening), the clear (S._dungeonClear), the entry time
 * (S._dungeonEnteredAt), and the config, the depth and the boss mark.
 *
 * One import, the page's switch reader (game/switches.js, of no imports),
 * by a relative path: node tests it without the game. */
import { sw } from './switches.js';

export const DUNGEON_PAGE_WAYS = Object.freeze({ enter: 'in', complete: 'complete', leave: 'out' });
const KEYS = Object.freeze({ in: '_inDungeon', custom: '_inCustomDungeon', complete: '_dungeonComplete' });

export function dungeonDoorOff() {
  return sw('dungeondoor');
}

/* THE ONE WRITER.  True when it wrote. */
export function dungeonTo(S, way, fields) {
  if (!S || typeof S !== 'object' || !Object.prototype.hasOwnProperty.call(DUNGEON_PAGE_WAYS, way)) return false;
  if (!fields || typeof fields !== 'object') return false;
  const names = Object.keys(fields);
  if (!names.length || names.some((k) => !Object.prototype.hasOwnProperty.call(KEYS, k) || typeof fields[k] !== 'boolean')) return false;
  if (!dungeonDoorOff()) {
    if (way === 'enter' && fields.in !== true) return false;
    if (way === 'complete' && fields.complete !== true) return false;
    if (way === 'leave' && fields.in === true) return false;
  }
  /* each by its own name (the phase table's guard reads the field off the tree) */
  if ('in' in fields) S._inDungeon = fields.in;
  if ('custom' in fields) S._inCustomDungeon = fields.custom;
  if ('complete' in fields) S._dungeonComplete = fields.complete;
  return true;
}

/* the dungeon's phase on this phone (the phase table's words) */
export function dungeonPhase(S) {
  if (!S || !S._inDungeon) return 'none';
  return S._dungeonComplete ? 'complete' : 'in';
}
