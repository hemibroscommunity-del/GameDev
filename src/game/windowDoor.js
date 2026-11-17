/* ═══ v2.3.5526: THE WINDOW DOOR -- ONE WRITER OF WHAT IS OPEN OVER THE WORLD (card L PR 5) ═══
 * (docs/specs/window-door.md; held by server/test/window-door.test.mjs and
 * the phase table's guard, tools/guards/phase-table.test.mjs)
 *
 * Something is open over the world for one of two reasons at once, each
 * read by its old name.  They are ONE field now, `S._windows`: a Map from
 * the reason to its hold (none: nothing open), written only by windowTo,
 * which also writes each reason's old field for its readers, so nothing a
 * player sees changes (the planner's reading, 2026-11-17: a door's one
 * field is the set of reasons, as the loading door's S._veils).  The
 * reasons, WINDOW_WHYS, each with its old field and its writer:
 *   panel  S._uiBusy        BroTown.jsx BroTown: any panel, sheet or card
 *                           of BroTown's own open (true; a lift is false)
 *   npc    S._npcProxLatch  BroTown.jsx gameLoop, and the townsperson's
 *                           tap: the townsperson whose prompt is up (its
 *                           record; a lift is null)
 * A hold is any value but null, false and undefined.  The phase (the phase
 * table's words): `open` while any reason holds, else `none`.
 *
 * `?windowdoor=0` writes the old fields alone, as the lines before the door
 * (S._windows is then not kept).
 *
 * Notes beside the door, not folded here: the decision panels' count
 * (ui/mobile/modalGuardBus.js `_depth`: module state with no S, read by the
 * chrome that stands down) and each window's own bus record
 * (inventoryBus, wheelBus, ChestReveal): what is in a window, not whether
 * the world is covered.
 *
 * One import, the page's switch reader (game/switches.js, of no imports),
 * by a relative path: node tests it without the game. */
import { sw } from './switches.js';

export const WINDOW_WHYS = Object.freeze({
  panel: '_uiBusy',
  npc: '_npcProxLatch',
});
const LIFT = Object.freeze({ panel: false, npc: null });
const has = (o, k) => !!o && typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);

/* `?windowdoor=0` -- through the page's one reader, so a test can set it */
export function windowDoorOff() {
  return sw('windowdoor');
}

/* THE ONE WRITER.  `hold`: the reason's hold (its old field's value), or
   null (or false) to lift it.  True when it wrote. */
export function windowTo(S, why, hold) {
  if (!S || typeof S !== 'object' || !has(WINDOW_WHYS, why)) return false;
  const on = hold !== null && hold !== undefined && hold !== false;
  S[WINDOW_WHYS[why]] = on ? hold : LIFT[why];
  if (windowDoorOff()) return true;
  if (!(S._windows instanceof Map)) S._windows = new Map();
  if (on) S._windows.set(why, hold);
  else S._windows.delete(why);
  return true;
}

/* the window phase (the phase table's words) */
export function windowPhase(S) {
  return S && S._windows instanceof Map && S._windows.size ? 'open' : 'none';
}
