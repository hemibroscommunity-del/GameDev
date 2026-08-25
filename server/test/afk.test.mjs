/* AFK / idle-logout suite (v2.3.1911).
 *
 * Owner report: "Sometimes I login to the game and see characters I
 * played in separate window hours ago just idle.  Game should be
 * logging out characters after 2 mins."
 *
 * The 2-minute sweep and its full cleanup already existed (v2.3.1621).
 * What did NOT exist was a definition of "idle" that a live-but-
 * abandoned tab could ever satisfy: the client sends a `move` at >=1 Hz
 * even standing still (the peer ghost-sweep's keepalive) and a `track`
 * every 2 s on a bare timer, and BOTH stamped session.lastRecv, so the
 * clock was refreshed twice a second forever.  The eviction was correct
 * and simply never ran.
 *
 * Checks:
 *   1.  A standing-still keepalive `move` does NOT advance the AFK
 *       clock  <- the regression itself.
 *   2.  ...but a move that actually MOVES does.
 *   3.  ...and so does a turn in place, a raised shield, a zone change
 *       and a harvest starting -- all real input that leaves x/y alone.
 *   4.  `pong` never advances it, and neither does a `track` ARRIVING
 *       -- but a track carrying aw:0 does, because that flag is the only
 *       evidence the worker ever gets that a player is tapping a panel.
 *   5.  A non-move action (chat) advances it.
 *   6.  The sweep evicts a session past IDLE_TIMEOUT_MS: gone from
 *       sessions, playerState released, closed with code 4006.
 *   7.  A session inside the window is left alone and gets its ping.
 *   8.  Keepalives alone do not save a session from the sweep -- the
 *       end-to-end statement of the owner's bug.
 *
 * Never starts startTickLoop (real 22 ms interval) -- _tickPingAndAfk is
 * invoked directly, the tick.test.mjs convention.
 */
import { GameRoom } from '../src/index.js';

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
function fakeWs(label) {
  return {
    label, sent: [], closes: [],
    send(s) { this.sent.push(JSON.parse(s)); },
    close(code, reason) { this.closes.push({ code, reason }); },
  };
}

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const state = makeState();
const room = new GameRoom(state, mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now(), moveSig: '' });
async function join(ws, id) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({
    type: 'join', id, name: 'T', phrase: 'p-' + id, data: { x: 200, y: 200, z: 'town' },
  }));
}

const ws = fakeWs('afk');
await join(ws, 'bp_afk_a');
const session = room.sessions.get(ws);
const ps = room.playerState['bp_afk_a'];
check('joined', !!session && !!ps);

/* Every probe drives the REAL message path, then reports whether the
   clock moved.  lastRecv is backdated first so a stamp is unmistakable
   (Date.now() has ms resolution and these calls are sub-ms apart). */
const BACKDATE = 30000;
async function probe(msg) {
  session.lastRecv = Date.now() - BACKDATE;
  await room.webSocketMessage(ws, JSON.stringify(msg));
  return Date.now() - session.lastRecv < BACKDATE / 2;
}
/* The idle keepalive: whatever the client last sent, sent again. */
const KEEPALIVE = {
  type: 'move', x: 200, y: 200, d: 'down', f: 'down', z: 'town',
  ex: null, vx: 0, vy: 0, dodging: false, blocking: false, ba: null, dead: false,
};
const like = (over) => Object.assign({}, KEEPALIVE, over);

// ── 1. the regression: a standing-still keepalive is not activity ──
await probe(KEEPALIVE);                                   // prime the signature
check('a standing-still keepalive move does NOT reset the AFK clock',
  (await probe(KEEPALIVE)) === false);
check('...and neither does the next one, or the one after',
  (await probe(KEEPALIVE)) === false && (await probe(KEEPALIVE)) === false);

// ── 2. real movement is activity ──
check('walking one pixel DOES reset the clock',
  (await probe(like({ x: 201 }))) === true);
check('...and so does moving on the other axis',
  (await probe(like({ x: 201, y: 260 }))) === true);

// ── 3. input that leaves x/y alone is still input ──
/* Every one of these is a thumb on the screen, and every one of them
   used to be indistinguishable from the keepalive under a naive
   "did the player move?" test -- which is why the signature covers the
   whole controllable pose, not just position. */
const pose = { x: 201, y: 260 };
check('turning in place resets the clock',
  (await probe(like(Object.assign({}, pose, { d: 'left', f: 'left' })))) === true);
const turned = Object.assign({}, pose, { d: 'left', f: 'left' });
check('raising the shield resets the clock',
  (await probe(like(Object.assign({}, turned, { blocking: true, ba: 1.2 })))) === true);
const shielded = Object.assign({}, turned, { blocking: true, ba: 1.2 });
check('steering the raised shield resets the clock',
  (await probe(like(Object.assign({}, shielded, { ba: 2.4 })))) === true);
const steered = Object.assign({}, shielded, { ba: 2.4 });
check('...but re-sending the same shield angle does not (guard)',
  (await probe(like(steered))) === false);
check('starting a harvest resets the clock',
  (await probe(like(Object.assign({}, steered, { ex: 'chop' })))) === true);
const chopping = Object.assign({}, steered, { ex: 'chop' });
check('...but the harvest heartbeat that repeats it does not (guard)',
  (await probe(like(chopping))) === false);
check('a dodge roll resets the clock',
  (await probe(like(Object.assign({}, chopping, { dodging: true })))) === true);

// ── 4. the two pure heartbeats are never activity ──
check('the ARRIVAL of a `track` does NOT reset the clock',
  (await probe({ type: 'track', data: { name: 'T', color: '#fff' } })) === false);
check('...nor does one from a player the client calls away',
  (await probe({ type: 'track', data: { name: 'T', aw: 1 } })) === false);
/* The panel reader: a thumb on the glass, and not one byte of it visible
   to the worker except this flag.  Evicting them would be a worse bug
   than the ghost. */
check('...but aw:0 -- the client saying a human just touched the page -- does',
  (await probe({ type: 'track', data: { name: 'T', aw: 0 } })) === true);
check('`pong` does NOT reset the clock',
  (await probe({ type: 'pong' })) === false);

// ── 5. any other message is input ──
check('a chat message DOES reset the clock',
  (await probe({ type: 'chat', payload: { text: 'oi' } })) === true);

// ── 6. the sweep evicts, and evicting means removing ──
{
  const stale = fakeWs('stale');
  await join(stale, 'bp_afk_b');
  const s2 = room.sessions.get(stale);
  s2.lastRecv = Date.now() - (room.IDLE_TIMEOUT_MS + 1000);
  check('IDLE_TIMEOUT_MS is the owner\'s two minutes', room.IDLE_TIMEOUT_MS === 120000, room.IDLE_TIMEOUT_MS);
  room._tickPingAndAfk(Date.now());
  check('an idle session is dropped from the session map', !room.sessions.has(stale));
  check('...its playerState is released', !room.playerState['bp_afk_b']);
  check('...and it is closed with 4006 so the page will not just rejoin',
    stale.closes.length === 1 && stale.closes[0].code === 4006, stale.closes);
}

// ── 7. an active session is untouched ──
{
  ws.sent.length = 0;
  session.lastRecv = Date.now();
  room._tickPingAndAfk(Date.now());
  check('an active session survives the sweep', room.sessions.has(ws));
  check('...and still gets its RTT ping', ws.sent.some((m) => m.type === 'ping'));
  check('...and is not closed', ws.closes.length === 0, ws.closes);
}

// ── 8. end to end: this is the owner's abandoned window ──
{
  const ghost = fakeWs('ghost');
  await join(ghost, 'bp_afk_c');
  const g = room.sessions.get(ghost);
  /* Two simulated minutes of a tab nobody is touching: the client's own
     1 Hz keepalive and 2 s track, and nothing else.  Before v2.3.1911
     this kept the session alive indefinitely. */
  /* Prime the pose the way a played-then-abandoned tab would have: the
     first move after a join is genuinely new information to the server
     and legitimately counts, so the ghost stands still ONCE before the
     clock is backdated. */
  await room.webSocketMessage(ghost, JSON.stringify(like({ x: 200, y: 200 })));
  const t0 = Date.now() - (room.IDLE_TIMEOUT_MS + 5000);
  g.lastRecv = t0;
  for (let i = 0; i < 120; i++) {
    await room.webSocketMessage(ghost, JSON.stringify(like({ x: 200, y: 200 })));
    if (i % 2 === 0) await room.webSocketMessage(ghost, JSON.stringify({ type: 'track', data: { name: 'G', aw: 1 } }));
  }
  check('two minutes of pure keepalive leaves the AFK clock where it was',
    g.lastRecv === t0, { was: t0, now: g.lastRecv });
  room._tickPingAndAfk(Date.now());
  check('...so the idle character is logged out', !room.sessions.has(ghost));
  check('...and the world stops showing it', !room.playerState['bp_afk_c']);
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
