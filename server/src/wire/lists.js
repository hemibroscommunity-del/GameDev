/* ═══ v2.3.5181: THE WORKER'S LISTS, MADE FROM THE WIRE TABLE (grand plan step 4.1, step 2; card K PR 1) ═══
 *
 * The one place that reads the wire table's rows (in.js, relays.js, out.js,
 * http.js: leaves, plain data) and makes the lists the worker keeps.  Before
 * this file each list was a literal written by hand beside the table, so the
 * two could disagree; now the table is the truth and a list is what it says.
 * A literal list beside a made one is a second definition (the plan's rule
 * 2): tools/guards/wire-table.test.mjs fails one.
 *
 *   PRIVILEGED_EVENTS  every `out` row, but those marked `privileged: 'echo'`.
 *                      The types the worker sends itself: the router's
 *                      default branch never relays one from a phone, or a
 *                      phone could forge it to the room (player_state hp 0,
 *                      a fake jackpot; ARCHITECTURE-HANDOFF rule 13).  A NEW
 *                      out row is privileged with no other edit: deny by
 *                      default.  Why each one is: the comment above its row
 *                      in out.js (moved there from index.js's old literal).
 *   RELAY_TYPES        every `relay` row: what a phone may relay to the
 *                      others, rebuilt in its name (relay.js RELAY.TYPES).
 *   RELAY_ECHOES       every row marked `privileged: 'echo'`, with its why
 *                      (the row's `echo:` note): a type the worker sends
 *                      that is NOT privileged, because a phone relays it too
 *                      (a sparring clone's swing, the duel decline the worker
 *                      also makes) or an older worker's relay must keep
 *                      passing (clan_war_declare).  wire-audit.test reads it.
 *
 * `wireLists(tables)` makes them from any rows, so a test can add a row and
 * see it reach its list (wire-table.test §7).  The worker imports the made
 * constants below.
 *
 * WHAT THE TABLE COSTS THE WORKER: index.js imports this file, so out.js and
 * relays.js ship in the worker's bundle: +88 KB of 2.7 MB (+12 KB gzipped),
 * measured with esbuild as wrangler runs it, v2.3.5181 (README.md beside
 * this file).  in.js and http.js are not imported yet.
 *
 * A field named `type` is never written bare in this folder: wire-audit reads
 * `type: '<name>'` anywhere in server/src/ as a message the worker sends
 * (README.md beside this file). */

import { WIRE_OUT } from './out.js';
import { WIRE_RELAY } from './relays.js';

const ECHO = 'echo';
const isEcho = (r) => r.privileged === ECHO;
/* the row's `echo: ` note, without its word: the why (wire-table.test §4
   fails an echo row that has none) */
const echoWhy = (r) => {
  const n = (Array.isArray(r.note) ? r.note : []).find((s) => typeof s === 'string' && s.startsWith(ECHO + ': '));
  return n ? n.slice(ECHO.length + 2) : '';
};

export function wireLists({ out = WIRE_OUT, relay = WIRE_RELAY } = {}) {
  return {
    PRIVILEGED_EVENTS: new Set(out.filter((r) => !isEcho(r)).map((r) => r.name)),
    RELAY_TYPES: new Set(relay.map((r) => r.name)),
    RELAY_ECHOES: new Map([...relay, ...out].filter(isEcho).map((r) => [r.name, echoWhy(r)])),
  };
}

const MADE = wireLists();
export const PRIVILEGED_EVENTS = MADE.PRIVILEGED_EVENTS;
export const RELAY_TYPES = MADE.RELAY_TYPES;
export const RELAY_ECHOES = MADE.RELAY_ECHOES;
