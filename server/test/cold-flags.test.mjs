/* The kill switches are loaded before any web request is answered
 * (v2.3.4376; docs/specs/liveops.md "Loaded before any request"; the
 * state-machine sweep's V13).  A worker that had just started answered its
 * web requests before any socket had loaded `liveflags`, so every thrown
 * switch read as not thrown.  Through the REAL fetch of a FRESH GameRoom
 * whose storage holds the switches and which has never seen a socket:
 *   1. the login door honours `devicelock: false` (a new device is 'ok');
 *   2. ...and so does the list's restart;
 *   3. the admin overview reports the thrown switch as thrown;
 *   4. `liveflags` is read once for the room's life, not once a request,
 *      and the lobby's /_room_count probe reads it not at all;
 *   5. a failed read leaves the request answered as before (cold), and the
 *      next request tries again. */
import { GameRoom } from '../src/index.js';
import { accountPassphraseToId } from '../src/account.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

let T = 1_975_000_000_000;
Date.now = () => T;

function makeState(store) {
  const st = {
    reads: 0,          // storage.get('liveflags') calls
    failFlags: false,  // the next liveflags read throws
    storage: {
      get: async (k) => {
        if (k === 'liveflags') {
          st.reads++;
          if (st.failFlags) { st.failFlags = false; throw new Error('storage down'); }
        }
        return Array.isArray(k) ? new Map(k.filter((x) => store.has(x)).map((x) => [x, store.get(x)])) : store.get(k);
      },
      put: async (k, v) => {
        if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) store.set(kk, vv); }
        else store.set(k, v);
      },
      list: async (o) => {
        const out = new Map();
        for (const [k, v] of store) if (!o?.prefix || k.startsWith(o.prefix)) out.set(k, v);
        return out;
      },
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
    _store: store,
  };
  return st;
}
const mockEnv = {
  LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) },
  ADMIN_KEY: 'test-secret-key',
};
function fakeWs(label) {
  return { label, sent: [], closed: null, send(s) { this.sent.push(JSON.parse(s)); }, close(code, reason) { this.closed = { code, reason }; } };
}

/* A world on file: an old-style key's character that has played on one
   device (so the lock knows it), made by a warm room with the lock on. */
const KEY = 'amber-comet-lotus-river-7';
const KID = accountPassphraseToId(KEY);
const D1 = 'phone1abc';
const D2 = 'phone2xyz';
const store = new Map();
{
  const warm = new GameRoom(makeState(store), mockEnv);
  warm._liveFlags = {};
  const ws = fakeWs('maker');
  warm.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 0, lastPing: 0, lastRecv: T });
  await warm.webSocketMessage(ws, JSON.stringify({ type: 'join', id: KID, name: 'P', phrase: KEY, device: D1, protocolVersion: 2, ws: [1, 5], data: { x: 0, y: 0, z: 'town' } }));
  if (warm.tickInterval) { clearInterval(warm.tickInterval); warm.tickInterval = null; }
  const auth = store.get('auth:' + KID);
  check('0. the world on file: a character whose lock knows one device', auth && Array.isArray(auth.devs) && auth.devs.length === 1, auth);
}
/* the owner throws the switch (as POST /flags stores it) */
store.set('liveflags', { devicelock: false });

function login(room, device, ip) {
  return room.fetch(new Request('https://x/api/account/login', { method: 'POST', body: JSON.stringify({ phrase: KEY, device }), headers: { 'CF-Connecting-IP': ip } }));
}
async function overview(room) {
  const r = await room.fetch(new Request('https://x/api/admin/overview', { headers: { Authorization: 'Bearer test-secret-key' } }));
  const ov = await r.json();
  return ov.deviceLock || (ov.overview && ov.overview.deviceLock);
}

// ── 1-4. a fresh room, no socket ever ──
{
  const st = makeState(new Map(store));
  const room = new GameRoom(st, mockEnv);
  check('1. the room starts cold (nothing loaded, no socket)', room._liveFlags === undefined && room.sessions.size === 0);

  const rc = await room.fetch(new Request('https://x/_room_count'));
  check('4. the lobby\'s count probe reads no switch', rc.status === 200 && st.reads === 0, { reads: st.reads });

  const fj = await (await login(room, D2, '7.7.7.1')).json();
  check('1. `devicelock: false` on file: the cold login door lets a new device in', fj.exists === true && fj.device === 'ok', fj);

  const rs = await room.fetch(new Request('https://x/api/account/reset', { method: 'POST', body: JSON.stringify({ phrase: KEY, confirm: true, device: D2 }), headers: { 'CF-Connecting-IP': '7.7.7.2' } }));
  const rj = await rs.json();
  check('2. ...and the list\'s restart from that device goes through', rj.ok === true && rj.reset === true, rj);

  const dl = await overview(room);
  check('3. the overview reports the device lock as switched off', dl && dl.on === false, dl);

  await login(room, D2, '7.7.7.3');
  await overview(room);
  check('4. `liveflags` was read once for the room\'s life, not once a request', st.reads === 1, { reads: st.reads });
}

// ── 5. a failed read ──
{
  const st = makeState(new Map(store));
  st.failFlags = true;
  const room = new GameRoom(st, mockEnv);
  const r = await login(room, D2, '6.6.6.1');
  const fj = await r.json();
  check('5. a failed read: the request is still answered, as before (cold: the lock reads on)', r.status === 200 && fj.exists === true && fj.device === 'unknown', { status: r.status, fj });
  check('5. ...the cache is left unloaded', room._liveFlags === undefined);
  const fj2 = await (await login(room, D2, '6.6.6.2')).json();
  check('5. ...and the next request loads it and honours the switch', fj2.device === 'ok' && st.reads === 2 && room._liveFlags && room._liveFlags.devicelock === false, { fj2, reads: st.reads });
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
if (failures) process.exit(1);
