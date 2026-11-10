/* ═══ v2.3.4442: A REFUSED DUEL ACCEPT IS ALWAYS ANSWERED ═══
 *
 * The state-machine sweep (V6) found two places in _interceptDuel that
 * dropped an accept in silence: no live challenge (forged, replayed or over
 * CHALLENGE_TTL old), and either side already in a duel.  Since v2.3.4361 the
 * accepter's phone waits 8 s for its own settled echo, so the silence was an
 * 8-second "DUEL!" with no word.  Now:
 *   1. no live challenge: a duel_decline to the ACCEPTER alone (nothing proves
 *      the named "challenger" asked, so a forged accept must not raise a
 *      popup on whoever it names);
 *   2. an expired challenge: the same, accepter only;
 *   3. either side busy in another duel: a decline to BOTH (a real challenge,
 *      two button presses), and the live duel is untouched;
 *   4. the decline reaches the accepter's phone rule (duelPending.js
 *      declineDropsDuel), dropping its pending duel at once.
 * Run against the real GameRoom.
 */
import { GameRoom } from '../src/index.js';
import { DUEL } from '../src/duel.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
function makeState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => store.get(k), put: async (k, v) => { store.set(k, v); },
      list: async (o) => { const m = new Map(); for (const [k, v] of store) if (!o?.prefix || k.startsWith(o.prefix)) m.set(k, v); return m; },
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [], acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
const room = new GameRoom(makeState(), mockEnv);
const fakeWs = () => ({ sent: [], send(s) { this.sent.push(s); }, close() {} });
async function join(id) {
  const ws = fakeWs();
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, data: { x: 0, y: 0, z: 'town' } }));
}
const A = 'bp_drop_a', B = 'bp_drop_b', C = 'bp_drop_c', D = 'bp_drop_d';
for (const id of [A, B, C, D]) await join(id);
for (const id of [A, B, C, D]) { const ps = room.playerState[id]; ps.z = 'town'; ps.dying = false; ps.dead = false; }
const chal = (to) => ({ type: 'duel_request', payload: { target: to, fromName: 'X' } });
const accept = (to) => ({ type: 'duel_accept', payload: { target: to, wager: 0 } });
const declines = () => room.eventBuffer.filter((e) => e.type === 'duel_decline').map((e) => e.payload.from + '>' + e.payload.target);

/* ── 1. a forged accept (no challenge): the accepter alone is told ── */
room.eventBuffer.length = 0;
const forged = await room._interceptDuel(B, accept(A));
check('1 a forged accept still starts nothing', forged === null && !room._duelFor(A) && !room._duelFor(B));
check('1 ...and is answered to the accepter, not in silence', declines().includes(A + '>' + B), declines());
check('1 ...and never to the player it names', declines().length === 1 && !declines().includes(B + '>' + A), declines());

/* ── 2. an expired challenge: the same ── */
room.eventBuffer.length = 0;
await room._interceptDuel(A, chal(B));
room._duelChallenges.get(A + '>' + B).ts = Date.now() - DUEL.CHALLENGE_TTL - 1000;
const stale = await room._interceptDuel(B, accept(A));
check('2 an expired challenge starts nothing', stale === null && !room._duelFor(B));
check('2 ...answered to the accepter alone', declines().length === 1 && declines()[0] === A + '>' + B, declines());

/* ── 3. a side already duelling: both told, the live duel kept ── */
await room._interceptDuel(C, chal(D));
const live = await room._interceptDuel(D, accept(C));
check('3 setup: C and D are duelling', live !== null && !!room._duelFor(C));
const liveId = room._duelFor(C).id;
// A challenges C (busy): C's accept is refused
room.eventBuffer.length = 0;
await room._interceptDuel(A, chal(C));
const busy1 = await room._interceptDuel(C, accept(A));
check('3 an accept by a player in a duel starts nothing', busy1 === null && !room._duelFor(A));
check('3 ...answered to BOTH sides', declines().length === 2 && declines().includes(A + '>' + C) && declines().includes(C + '>' + A), declines());
check('3 ...and the live duel is untouched', room._duelFor(C) && room._duelFor(C).id === liveId && room._duelFor(D).id === liveId);
// D (busy) challenged B before the duel; B accepts: the challenger is busy
room.eventBuffer.length = 0;
room._duelChallenges.set(D + '>' + B, { wager: 0, ts: Date.now() });
const busy2 = await room._interceptDuel(B, accept(D));
check('3 an accept of a challenger now in a duel starts nothing', busy2 === null && !room._duelFor(B));
check('3 ...answered to BOTH sides', declines().length === 2 && declines().includes(D + '>' + B) && declines().includes(B + '>' + D), declines());
check('3 ...the live duel untouched', room._duelFor(D) && room._duelFor(D).id === liveId);

/* ── 4. the answer ends the accepter's pending duel at once on the phone ── */
const P = await import('../../src/game/duelPending.js');
const S = { myId: B, player: { x: 0, y: 0 }, _inDuel: null, lockedTarget: null };
P.enterPendingDuel(S, D, 'D', 0, Date.now());
const ev = room.eventBuffer.find((e) => e.type === 'duel_decline' && e.payload.target === B);
check('4 the decline the worker sent drops the pending duel at once', ev && P.declineDropsDuel(S, ev.payload) === true && S._inDuel === null, S._inDuel);

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
