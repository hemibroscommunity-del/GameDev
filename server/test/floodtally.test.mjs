/* ═══ v2.3.5711: THE OWNER CAN SEE A FLOOD (card SEC PR 12) ═══
 * (server/src/admin.js "THE OWNER CAN SEE A FLOOD"; docs/OPERATIONS.md)
 *
 * A flood was counted on each session only and reached no owner page.  One
 * tally on the room, memory only, read by /api/admin/overview as
 * `floodTally`:
 *   1. a socket closed for flooding (a burst of messages past the room's
 *      budget, the real path) counts in `closed`;
 *   2. a relay frame refused for its bytes counts in `relayBytesDropped`, by
 *      why (`relayDropsBy`);
 *   3. nothing is written for it (no row with the tally in it, and the
 *      overview's read writes nothing);
 *   4. the overview's other fields are all still there;
 *      `ip` is null (refusals by address: card K2's PR 10, flood.js);
 *   5. `floodtally: false`: nothing counted, the field null.
 *
 * BREAK PROOF (rule 8), tried by hand: main's admin.js and leave.js -> FAIL
 * 1, 2, 4 and 5 (no floodTally on the overview).
 * Not a phone test: node, the shared test room (testroom.mjs). */
import { GameRoom } from '../src/index.js';
import { makeStorage, mockEnv, fakeWs, join, settle, seededClock } from './testroom.mjs';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}
const KEY = 'flood-tally-key';
const clock = seededClock({ start: Date.UTC(2026, 10, 17, 18, 0, 0), seed: 3 }).install();
async function world(flags) {
  const st = makeStorage();
  const room = new GameRoom(st, { ...mockEnv, ADMIN_KEY: KEY });
  await room._liveFlagsEnsure();
  if (flags) Object.assign(room._liveFlags, flags);
  return { st, room };
}
const overview = async (room) => (await room.fetch(new Request('https://x/api/admin/overview', { headers: { Authorization: 'Bearer ' + KEY } }))).json();
async function flood(room, id) {
  const ws = fakeWs(id);
  await join(room, ws, id);
  const back = [console.warn, console.error]; console.warn = () => {}; console.error = () => {};
  try { for (let i = 0; i < 1200 && room.sessions.has(ws); i++) await room.webSocketMessage(ws, JSON.stringify({ type: 'ping', payload: { t: i } })); }
  finally { [console.warn, console.error] = back; }
  await settle();
  return ws;
}

/* 1-4 */
{
  const { st, room } = await world();
  const before = await overview(room);
  const keysBefore = new Set(Object.keys(before));
  const ws = await flood(room, 'bp_ft_a');
  check('1. a burst of messages closed its socket (the real path, guard)', !room.sessions.has(ws) && !!ws.closed, ws.closed);
  const big = { type: 'emote', payload: { s: 'x'.repeat(20000) } };
  const s = { id: 'bp_ft_b' };
  const dropped = room._relayBytesDrop(s, big, Date.now());
  const w0 = [...st._store.keys()];
  const b0 = st.batches();
  const o = await overview(room);
  const t = o.floodTally;
  check('1. ...and the overview counts it (closed 1)', !!t && t.closed === 1, t);
  check('2. a relay frame refused for its bytes counts, by why', dropped === true && t && t.relayBytesDropped === 1 && Object.values(t.relayDropsBy).reduce((a, b) => a + b, 0) === 1, t);
  check('3. nothing is written for the tally (no row of it; the overview\'s read writes none)',
    ![...st._store.keys()].some((k) => /flood|tally/i.test(k)) && [...st._store.keys()].length === w0.length && st.batches() === b0, [...st._store.keys()].filter((k) => /flood|tally/i.test(k)));
  check('4. the overview keeps every other field it had; ip null until K2\'s PR 10; since stamped',
    [...keysBefore].every((k) => k in o) && t && t.ip === null && typeof t.since === 'number', { before: [...keysBefore], now: Object.keys(o) });
}

/* 5 */
{
  const { room } = await world({ floodtally: false });
  await flood(room, 'bp_ft_c');
  const o = await overview(room);
  check('5. floodtally: false: nothing counted, the field null', o.ok && o.floodTally === null && !(room._floodTally && room._floodTally.closed), o.floodTally);
}

clock.restore();
console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
