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
 * this file).  v2.3.5184: in.js and http.js too, for the wire door's rows
 * (below; README.md says how much).
 *
 * A field named `type` is never written bare in this folder: wire-audit reads
 * `type: '<name>'` anywhere in server/src/ as a message the worker sends
 * (README.md beside this file). */

import { WIRE_IN } from './in.js';
import { WIRE_OUT } from './out.js';
import { WIRE_RELAY } from './relays.js';
import { WIRE_HTTP } from './http.js';

const ECHO = 'echo';
const isEcho = (r) => r.privileged === ECHO;
/* the row's `echo: ` note, without its word: the why (wire-table.test §4
   fails an echo row that has none) */
const echoWhy = (r) => {
  const n = (Array.isArray(r.note) ? r.note : []).find((s) => typeof s === 'string' && s.startsWith(ECHO + ': '));
  return n ? n.slice(ECHO.length + 2) : '';
};

const has = (r, k) => Object.prototype.hasOwnProperty.call(r, k);
const listOf = (v) => (Array.isArray(v) ? v : [v]);
export function wireLists({ out = WIRE_OUT, relay = WIRE_RELAY, inn = WIRE_IN, http = WIRE_HTTP } = {}) {
  const takes = [...inn, ...relay, ...http];
  const all = [...inn, ...relay, ...out, ...http];
  return {
    PRIVILEGED_EVENTS: new Set(out.filter((r) => !isEcho(r)).map((r) => r.name)),
    RELAY_TYPES: new Set(relay.map((r) => r.name)),
    RELAY_ECHOES: new Map([...relay, ...out].filter(isEcho).map((r) => [r.name, echoWhy(r)])),
    /* v2.3.5182 (card K PR 2): the worker's other lists */
    FIGHT_LOCK_SW: Object.fromEntries(takes.filter((r) => has(r, 'fight') && r.fight.startsWith('lock:')).map((r) => [r.name, r.fight.slice(5)])),
    FIGHT_OPEN: Object.fromEntries(takes.filter((r) => has(r, 'fight') && r.fight.startsWith('open:')).map((r) => [r.name, r.fight.slice(5)])),
    ROOM_PLACED: Object.fromEntries(out.filter((r) => has(r, 'placed') && typeof r.placed === 'object').map((r) => [r.name, r.placed])),
    RELAY_PLACED: new Set(relay.filter((r) => r.placed === 'sender').map((r) => r.name)),
    MUTABLE_RELAY_TYPES: new Set(all.filter((r) => r.muted === 'mutable').map((r) => r.name)),
    SOCIAL_TYPES: new Set(relay.filter((r) => has(r, 'pace') && listOf(r.pace).includes('social')).map((r) => r.name)),
    WATCH_HOOKS: [...new Set(takes.filter((r) => has(r, 'watch')).map((r) => r.watch))],
  };
}

const MADE = wireLists();
export const PRIVILEGED_EVENTS = MADE.PRIVILEGED_EVENTS;
export const RELAY_TYPES = MADE.RELAY_TYPES;
export const RELAY_ECHOES = MADE.RELAY_ECHOES;
export const FIGHT_LOCK_SW = Object.freeze(MADE.FIGHT_LOCK_SW);
export const FIGHT_OPEN = Object.freeze(MADE.FIGHT_OPEN);
export const ROOM_PLACED = Object.freeze(MADE.ROOM_PLACED);
export const RELAY_PLACED = MADE.RELAY_PLACED;
export const MUTABLE_RELAY_TYPES = MADE.MUTABLE_RELAY_TYPES;
export const SOCIAL_TYPES = MADE.SOCIAL_TYPES;
export const WATCH_HOOKS = Object.freeze(MADE.WATCH_HOOKS);

/* ═══ v2.3.5184 (card K PR 4): THE WIRE DOOR'S ROWS (door.js) ═══
   Each row's `trust` column as [field's path, trust] pairs: SOCKET by the
   message's type (every `in` and `relay` row), ROUTES by the route row's
   name (`http:<path>` or `http:<path> <METHOD>`).  The door holds each named
   field to its form; a field no row names passes untouched. */
/* v2.3.6443 (card DG PR 4): each pair carries the row's `form` for its
   field, when the row names one (the wire table's `form` column, in.js:
   door.js WIRE_FORM), as a third: [path, trust, form] */
const formOf = (r, path) => (r.form && Object.prototype.hasOwnProperty.call(r.form, path) ? r.form[path] : undefined);
const trustPairs = (r) => Object.freeze(Object.entries(r.trust || {}).filter(([path]) => path !== 'method').map(([path, trust]) => Object.freeze([path, trust, formOf(r, path)])));
export function wireDoorRows({ inn = WIRE_IN, relay = WIRE_RELAY, http = WIRE_HTTP } = {}) {
  const SOCKET = new Map(), ROUTES = new Map();
  for (const r of [...inn, ...relay]) SOCKET.set(r.name, [...(SOCKET.get(r.name) || []), ...trustPairs(r)]);
  for (const r of http) ROUTES.set(r.name, trustPairs(r));
  return { SOCKET, ROUTES };
}
export const WIRE_DOOR_ROWS = wireDoorRows();

/* v2.3.5542 (card K, for card MOD's silence): THE CHAT LANES (CHAT_LANE_TYPES) -- every socket
   row (`in` or `relay`) whose `text` is a `words` field: a line another player
   reads.  Not the table's `speaks` (39 rows: join, track, dice, the trades,
   the invites, emote...): a check on what a player SAYS reads this, so a new
   lane with a `text` words field is covered by its row.  Keyed by `msg.type`,
   as the router and the wire door are: the page's shim sends a relayed event
   as `{ type: <event> }`, never in the broadcast envelope (wire-door.test §7). */
export function chatLanes({ inn = WIRE_IN, relay = WIRE_RELAY } = {}) {
  return new Set([...inn, ...relay].filter((r) => r.trust && r.trust.text === 'words').map((r) => r.name));
}
/* v2.3.5543 (the sitting 19 review): named CHAT_LANE_TYPES, never CHAT_LANES -- chatlanes.js
   exports a CHAT_LANES of its own (the lanes' pace numbers), and the wrong one
   imported would throw `.has is not a function` inside _onMessage */
export const CHAT_LANE_TYPES = chatLanes();

