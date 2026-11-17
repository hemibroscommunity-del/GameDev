/* ═══ v2.3.5528: THE CONNECTION DOOR -- ONE WRITER OF THE PHONE'S SOCKET PHASE (card L PR 5) ═══
 * (docs/specs/connection-door.md; held by server/test/connection-door.test.mjs
 * and the phase table's guard, tools/guards/phase-table.test.mjs)
 *
 * The phone's socket is in one phase, `S._realtimeStatus`, which every
 * reader already reads (the Info panel's dot, Settings, Social, the trade
 * slot).  wsClient.js wrote it in 21 places; now only connTo does.  The
 * phases, CONN_PHASES: connecting, connected, disconnected, idle, linger,
 * and each refusal's own screen (full, device, key, locked, origin,
 * rejected, superseded, verify, frozen).  The door's one rule is the
 * callers' own: the phase is one of these words, so nothing a player sees
 * changes (every caller writes a word of the list today).
 *
 * `?conndoor=0` writes any word a caller asks, as the lines before the door.
 *
 * Notes beside the door, not folded here: the refusals' own marks
 * (S._joinRejectedFatal, S._tabMoved, S._frozenByAdmin: what a screen says,
 * read by it), the server's veil (S._netHold: the loading door's `net`
 * reason, v2.3.5527), and serverReady.js's own `_state` and `_veil`.
 *
 * One import, the page's switch reader (game/switches.js, of no imports),
 * by a relative path: node tests it without the game. */
import { sw } from './switches.js';

export const CONN_PHASES = Object.freeze([
  'connecting', 'connected', 'disconnected', 'idle', 'linger',
  'full', 'device', 'key', 'locked', 'origin', 'rejected', 'superseded', 'verify', 'frozen',
]);

/* `?conndoor=0` -- through the page's one reader, so a test can set it */
export function connDoorOff() {
  return sw('conndoor');
}

/* THE ONE WRITER.  True when it wrote. */
export function connTo(S, phase) {
  if (!S || typeof S !== 'object') return false;
  if (!connDoorOff() && !CONN_PHASES.includes(phase)) return false;
  S._realtimeStatus = phase;
  return true;
}
