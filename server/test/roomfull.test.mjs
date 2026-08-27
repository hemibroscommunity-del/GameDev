/* Room-full refusal test (v2.3.1982; the 61st player is told WHY).
 *
 * The headless capacity campaign measured the failure this pins: at the
 * MAX_PLAYERS ceiling the next joiner got a bare `503 Room full` from a
 * handshake that never upgraded, so the client could not distinguish it
 * from a dropped connection and retried every 10s forever behind a
 * silent loading screen.  join.js `_roomFullRefusal` answers on the wire
 * instead — but ONLY to a client that asked for it (`?rf=1`), because an
 * old client that received an unknown refusal would stop retrying for
 * good (v2.3.1181).  Both halves of that split are asserted here; they
 * are the deploy-order safety property (handoff rule 19), not polish.
 *
 * Checks:
 *   1.  under the cap: the socket is accepted, a session is registered,
 *       and nothing is said about being full.
 *   2.  at the cap WITHOUT `rf=1` (an old client): byte-identical 503.
 *   3.  at the cap WITH `rf=1`: 101 + one `room_full` carrying count /
 *       cap / retryMs, then close 4009.
 *   4.  a refusal registers NO session — a queue of waiters cannot push
 *       the room further over its own cap.
 *   5.  the `max_players` live-ops flag LOWERS the cap (this is how the
 *       case is testable without 61 browsers, and how the owner throttles
 *       a room for a demo)…
 *   6.  …and can never RAISE it above the bandwidth-derived MAX_PLAYERS,
 *       nor below 1, nor be poisoned by a non-numeric value.
 *   7.  `room_full` is in PRIVILEGED_EVENTS — a client that could forge
 *       it would put "the world is full" in front of everyone in the
 *       room with one message.
 *
 * The DO's fetch() builds real `Response`/`WebSocketPair` objects, which
 * node has no workerd equivalent for (undici's Response rejects status
 * 101 outright), so both are stubbed here the same way every suite in
 * this directory stubs DO storage.  The code under test is the real
 * fetch() path — that is where the bug lived.                          */
import { GameRoom, PRIVILEGED_EVENTS } from '../src/index.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

function makeState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, v); },
      list: async (opts) => {
        const out = new Map();
        for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v);
        return out;
      },
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
    _store: store,
  };
}
const mockEnv = {
  LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) },
};

/* ── workerd stand-ins ─────────────────────────────────────────────── */
function fakeSocket(label) {
  return {
    label, sent: [], closed: null, accepted: false,
    accept() { this.accepted = true; },
    send(s) { this.sent.push(JSON.parse(s)); },
    close(code, reason) { this.closed = { code, reason }; },
  };
}
let lastPair = null;
globalThis.WebSocketPair = function WebSocketPair() {
  lastPair = { 0: fakeSocket('client'), 1: fakeSocket('server') };
  return lastPair;
};
globalThis.Response = class TestResponse {
  constructor(body, init) {
    this.body = body;
    this.status = (init && init.status) || 200;
    this.webSocket = (init && init.webSocket) || null;
    this.headers = (init && init.headers) || {};
  }
};

const wsRequest = (query) => ({
  url: 'https://worker.example/ws' + query,
  headers: { get: (k) => (k === 'Upgrade' ? 'websocket' : null) },
  method: 'GET',
});

const state = makeState();
const room = new GameRoom(state, mockEnv);
const baseSession = (id) => ({ id, name: 'T', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now(), moveSig: '' });

/* Fill to one BELOW the cap.  Sessions carry ids so getPlayerCount() —
   which counts joined players, not raw sockets — reports them. */
const CAP = room.MAX_PLAYERS;
for (let i = 0; i < CAP - 1; i++) room.sessions.set(fakeSocket('p' + i), baseSession('bp_seat_' + i));
check('the cap under test is the shipped one (60)', CAP === 60, CAP);

// ── 1. under the cap ──
{
  lastPair = null;
  const res = await room.fetch(wsRequest('?room=brotown-1&rf=1'));
  check('1. under the cap the socket is accepted (101)', res.status === 101, res.status);
  check('1. …and the joiner is registered as a session', room.sessions.size === CAP, room.sessions.size);
  const said = lastPair ? lastPair[1].sent : [];
  check('1. …and nothing is said about being full', said.length === 0, said);
}

// ── 2. at the cap, an OLD client (no rf=1) ──
{
  lastPair = null;
  const before = room.sessions.size;
  const res = await room.fetch(wsRequest('?room=brotown-1'));
  check('2. an old client still gets the byte-identical 503',
    res.status === 503 && res.body === 'Room full', { status: res.status, body: res.body });
  check('2. …and no socket was ever upgraded for it', lastPair === null, !!lastPair);
  check('2. …and no session was registered', room.sessions.size === before, room.sessions.size);
}

// ── 3. at the cap, a NEW client (rf=1) ──
{
  lastPair = null;
  const before = room.sessions.size;
  const res = await room.fetch(wsRequest('?room=brotown-1&rf=1'));
  check('3. a new client gets an upgraded socket instead (101)', res.status === 101, res.status);
  const srv = lastPair && lastPair[1];
  const msgs = (srv && srv.sent) || [];
  check('3. …carrying exactly one message', msgs.length === 1, msgs);
  const m = msgs[0] || {};
  check('3. …of type room_full with reason "full"', m.type === 'room_full' && m.reason === 'full', m);
  /* count is SOCKETS, and must equal the cap when the room is full — a
     refusal that says "59 / 60" reads as a broken refusal. */
  check('3. …reporting how many are in the world', m.count === CAP && m.cap === CAP, m);
  check('3. …and how long to wait', typeof m.retryMs === 'number' && m.retryMs >= 1000, m);
  check('3. …then closed with the room-full code 4009',
    srv && srv.closed && srv.closed.code === 4009, srv && srv.closed);
  // ── 4. a refusal is not a seat ──
  check('4. a refused joiner registers NO session (waiters cannot overfill the room)',
    room.sessions.size === before, room.sessions.size);
}

// ── 5/6. the live-ops cap flag ──
{
  /* Only the flag changes between these two reads — the room is left at
     its ceiling above, so a cap that FAILS to move would look identical
     to one that moved.  Empty the room first so "refused" can only come
     from the flag. */
  for (const k of [...room.sessions.keys()]) room.sessions.delete(k);
  room.sessions.set(fakeSocket('solo'), baseSession('bp_solo'));

  const setFlag = async (v) => {
    await state.storage.put('liveflags', { max_players: v });
    room._liveFlags = null;        // drop the read-through cache…
    await room._liveFlagsEnsure(); // …and reload it, as fetch() does
  };

  await setFlag(1);
  let res = await room.fetch(wsRequest('?room=brotown-1&rf=1'));
  check('5. max_players=1 refuses the second player', res.status === 101 && lastPair[1].sent[0].type === 'room_full', res.status);
  check('5. …and the refusal reports the LOWERED cap', lastPair[1].sent[0].cap === 1, lastPair[1].sent[0]);

  await setFlag(500);
  check('6. a flag can never raise the cap above MAX_PLAYERS', room._roomCap() === CAP, room._roomCap());
  await setFlag(0);
  check('6. …nor drop it below 1 (a room nobody can enter)', room._roomCap() === 1, room._roomCap());
  await setFlag('lots');
  check('6. …nor be poisoned by a non-number (falls back to the ceiling)', room._roomCap() === CAP, room._roomCap());
  await state.storage.delete('liveflags');
  room._liveFlags = null;
  await room._liveFlagsEnsure();
  check('6. …and with no flag at all the cap is the shipped ceiling', room._roomCap() === CAP, room._roomCap());
}

// ── 7. trust boundary ──
check('7. room_full is in PRIVILEGED_EVENTS (a client cannot forge "the world is full")',
  PRIVILEGED_EVENTS.has('room_full'));

if (room.tickInterval) clearInterval(room.tickInterval);
console.log(failures ? `\n${failures} FAILURES` : '\nall room-full checks passed');
process.exit(failures ? 1 : 0);
