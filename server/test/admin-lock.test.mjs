/* ═══ v2.3.5583: THE ADMIN KEY'S TIME-OUT (server/src/admin.js ADMIN_LOCK) ═══
 *
 * The red team (RT-1, finding N7; docs/security/rt1-findings.md): 5,000 wrong
 * admin keys in half a second, each a plain 401, then the right one.  Now an
 * address that sends ADMIN_LOCK.MISSES wrong keys within WINDOW_MS is timed
 * out for HOLD_MS -- a time-out, never a ban.
 *
 *   1. the numbers: 10 wrong keys within 10 minutes, a 15-minute time-out;
 *   2. nine wrong keys: still answered (401 each), the right key still in;
 *      the right key clears the count;
 *   3. the tenth starts the time-out: that address is answered 429 with the
 *      minutes left and a Retry-After, the right key included (not checked);
 *      ANOTHER address with the right key is in; after HOLD_MS the address is
 *      in again by itself;
 *   4. misses spread wider than the window never hold;
 *   5. an ask with no address (a local test) is never held; no key set: the
 *      surface 404s and nothing is counted; `adminlock: false` holds nobody;
 *   6. botfp.js's surface: both headers through the same door, by digest,
 *      counted toward the same time-out (a held address reads "not found");
 *   7. the overview's line; the map's cap;
 *   8. the address the time-out keys by (adminAddress): one /64 shares a key
 *      once the /64 change's ipKey (PR #1875) is on this worker;
 *
 * BREAK PROOF (rule 8), tried by hand, 2026-11-15:
 *   - `if (at && this._adminHeldFor(at, now) > 0)` made `if (false)` -> FAIL 3
 *   - `e.until = now + ADMIN_LOCK.HOLD_MS` deleted                   -> FAIL 3
 *   - `if (!e || !e.until) return 0` made `if (!e) return 0`         -> FAIL 3
 *   - botfp's `_adminAuth(request, true)` made `(request)`           -> FAIL 6
 */
import { GameRoom } from '../src/index.js';
import { ADMIN_LOCK, adminAddress } from '../src/admin.js';
import * as FLOOD_NS from '../src/flood.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 500) : ''); }
}

let T = 1_970_000_000_000;
const realNow = Date.now;
Date.now = () => T;

const KEY = 'the-owners-long-random-admin-key-0123456789';
function makeState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => (Array.isArray(k) ? new Map(k.filter((x) => store.has(x)).map((x) => [x, store.get(x)])) : store.get(k)),
      put: async (k, v) => { if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) store.set(kk, vv); } else store.set(k, v); },
      list: async (o) => { const out = new Map(); for (const [k, v] of store) if (!o?.prefix || k.startsWith(o.prefix)) out.set(k, v); return out; },
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
function newRoom(env, flags) {
  const room = new GameRoom(makeState(), { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => new Response('{}') }) }, ...env });
  room._liveFlags = flags || {};
  return room;
}
const ask = (room, key, ip, path, hdr) => {
  const headers = {};
  if (key !== null) headers[hdr || 'Authorization'] = hdr ? key : 'Bearer ' + key;
  if (ip) headers['CF-Connecting-IP'] = ip;
  return room.fetch(new Request('https://x' + (path || '/api/admin/overview'), { headers }));
};

// ── 1. the numbers ──
check('1. ten wrong keys within ten minutes, a fifteen-minute time-out', ADMIN_LOCK.MISSES === 10 && ADMIN_LOCK.WINDOW_MS === 600000 && ADMIN_LOCK.HOLD_MS === 900000);

// ── 2-3. a guesser, then the owner ──
{
  const room = newRoom({ ADMIN_KEY: KEY });
  const A = '203.0.113.50', B = '198.51.100.9';
  let codes = [];
  for (let i = 0; i < ADMIN_LOCK.MISSES - 1; i++) codes.push((await ask(room, 'guess-' + i, A)).status);
  check('2. nine wrong keys from one address: each answered 401', codes.every((c) => c === 401) && codes.length === 9, codes);
  check('2. ...and the right key from it still in', (await ask(room, KEY, A)).status === 200);
  /* the right key cleared the count: nine more wrong ones hold nothing */
  codes = [];
  for (let i = 0; i < ADMIN_LOCK.MISSES - 1; i++) codes.push((await ask(room, 'guess-b' + i, A)).status);
  check('2. the right key clears the count (nine more: still 401, not held)', codes.every((c) => c === 401) && (await ask(room, KEY, A)).status === 200, codes);
  for (let i = 0; i < ADMIN_LOCK.MISSES; i++) await ask(room, 'guess-c' + i, A);
  const held = await ask(room, KEY, A);
  const hj = await held.json();
  check('3. the tenth wrong key starts the time-out: even the right key from that address is answered 429',
    held.status === 429 && hj.error === 'held' && /15 minute/.test(hj.words), { status: held.status, hj });
  check('3. ...with a Retry-After of the time left', held.headers.get('Retry-After') === '900', held.headers.get('Retry-After'));
  const wrongHeld = await ask(room, 'guess-d', A);
  check('3. ...and a wrong key 429 too (the key is not checked: a held address learns nothing)', wrongHeld.status === 429);
  check('3. another address with the right key: in (the owner\'s phone on its own line)', (await ask(room, KEY, B)).status === 200);
  T += ADMIN_LOCK.HOLD_MS - 60000;
  const late = await ask(room, KEY, A);
  check('3. a minute before the end: still held, "1 minute"', late.status === 429 && /try again in 1 minute/.test((await late.json()).words));
  T += 60001;
  check('3. after fifteen minutes the address is in again by itself (a time-out, never a ban)', (await ask(room, KEY, A)).status === 200);
}

// ── 4. misses spread wider than the window ──
{
  const room = newRoom({ ADMIN_KEY: KEY });
  const A = '203.0.113.51';
  for (let i = 0; i < 25; i++) { await ask(room, 'slow-' + i, A); T += ADMIN_LOCK.WINDOW_MS / 6; }
  check('4. wrong keys spread over more than the window (25 at one each 100 s): never held', (await ask(room, KEY, A)).status === 200);
}

// ── 5. no address, no key, the switch ──
{
  const room = newRoom({ ADMIN_KEY: KEY });
  for (let i = 0; i < 30; i++) await ask(room, 'local-' + i, null);
  check('5. an ask with no address (a local test, wrangler dev) is never held', (await ask(room, KEY, null)).status === 200);
  const none = newRoom({});
  for (let i = 0; i < 12; i++) await ask(none, 'x-' + i, '203.0.113.52');
  const r = await ask(none, 'x', '203.0.113.52');
  check('5. no key set: the surface 404s, and nothing is counted', r.status === 404 && !none._adminMisses);
  const off = newRoom({ ADMIN_KEY: KEY }, { adminlock: false });
  for (let i = 0; i < 12; i++) await ask(off, 'y-' + i, '203.0.113.53');
  check('5. `adminlock: false`: nobody is held, as before', (await ask(off, KEY, '203.0.113.53')).status === 200);
}

// ── 6. botfp.js's surface ──
{
  const room = newRoom({ ADMIN_KEY: KEY });
  const A = '203.0.113.54';
  const via = (key, hdr) => ask(room, key, A, '/api/botstat?flagged=1', hdr);
  check('6. /api/botstat takes the key in `x-admin-key`', (await via(KEY, 'x-admin-key')).status === 200);
  check('6. ...and in `Authorization: Bearer`', (await via(KEY)).status === 200);
  check('6. ...a wrong key in either reads "not found"', (await via('nope', 'x-admin-key')).status === 404 && (await via('nope')).status === 404);
  for (let i = 0; i < ADMIN_LOCK.MISSES; i++) await via('guess-' + i, 'x-admin-key');
  check('6. wrong keys there count toward the same time-out: the right one is refused (not found)', (await via(KEY, 'x-admin-key')).status === 404);
  check('6. ...and the admin surface is held for that address too', (await ask(room, KEY, A)).status === 429);
}

// ── 7. the overview; the cap ──
{
  const room = newRoom({ ADMIN_KEY: KEY });
  for (let i = 0; i < ADMIN_LOCK.MISSES; i++) await ask(room, 'g-' + i, '203.0.113.60');
  await ask(room, KEY, '203.0.113.60');
  const ov = await (await ask(room, KEY, '198.51.100.61')).json();
  const L = ov.adminLock;
  check('7. the overview says it: wrong keys, time-outs started, asks refused, held now, the numbers',
    L && L.on === true && L.wrong === 10 && L.held === 1 && L.refused === 1 && L.heldNow === 1 && L.misses === 10 && L.windowMin === 10 && L.holdMin === 15, L);
  for (let i = 0; i < ADMIN_LOCK.MAP_CAP + 300; i++) await ask(room, 'cap', '10.' + (i >> 16 & 255) + '.' + (i >> 8 & 255) + '.' + (i & 255));
  check('7. the addresses kept are capped (' + ADMIN_LOCK.MAP_CAP + ')', room._adminMisses.size <= ADMIN_LOCK.MAP_CAP, room._adminMisses.size);
  check('7. ...and the one in its time-out is not the one dropped', room._adminHeldFor('203.0.113.60', T) > 0);
}

// ── 8. an IPv6 /64 once ipKey is here (PR #1875) ──
/* The address the time-out keys by, read straight from adminAddress (the
   same function _adminAuth asks): section 3 proves a held key is refused, so
   this proves which key one /64 shares -- and it holds whether `adminlock` is
   thrown or not, so the merge order of #1875 and this PR changes no
   switch-table line (a check through the lockout would fail with it thrown
   once ipKey is here) */
{
  const req = (ip) => new Request('https://x/api/admin/overview', { headers: { 'CF-Connecting-IP': ip } });
  const a = adminAddress(req('2001:db8:4:4::1'), true), b = adminAddress(req('2001:db8:4:4::ffff'), true);
  if (typeof FLOOD_NS.ipKey === 'function') check('8. ipKey here: two addresses of one /64 share one key', a === b && a === FLOOD_NS.ipKey('2001:db8:4:4::1'), { a, b });
  else check('8. no ipKey on this worker yet: each IPv6 address its own key (PR #1875 brings the /64)', a === '2001:db8:4:4::1' && b === '2001:db8:4:4::ffff', { a, b });
  check('8. the /64 switched off (ip64 false): each address its own key', adminAddress(req('2001:db8:4:4::1'), false) === '2001:db8:4:4::1');
  check('8. IPv4 is itself; no address (a local test) is none', adminAddress(req('203.0.113.9'), true) === '203.0.113.9'
    && adminAddress(new Request('https://x/api/admin/overview'), true) === null);
}

Date.now = realNow;
console.log('\n' + passes + ' passed, ' + failures + ' failed');
if (failures) { console.log('admin-lock: FAILED'); process.exit(1); }
console.log('all admin-lock checks passed');
