/* New Login Keys, made by the worker (v2.3.3355; docs/specs/login-keys.md,
 * server/src/loginkeys.js, server/src/keywords.js).  Through the REAL join,
 * the REAL login door and restart, and the REAL admin routes:
 *   1. the words, a key's shape, and a key made uniformly;
 *   2. a phone that says it can take one (kv: 2), in with the OLD key on one
 *      of its devices, is handed a key -- to that socket, after its state,
 *      kept only as a fingerprint, its index in the same write; not without
 *      kv, not with the switch off, not again within 10 minutes;
 *   3. the new key from ANY device: in, its first use stamped once, then
 *      nothing written; never added to the old key's devices;
 *   4. a new-shaped key that is not the character's: 'key' (close 4017),
 *      never 'auth', counted as a wrong key; never registered from a phone;
 *   5. a NEW character: handed a key at its first join, its own first key
 *      retired at the new one's first use ('key' after, never 'auth');
 *   6. the login door and the restart take a new key from any device, and
 *      never write; an old key retired says 'keychanged';
 *   7. a lockout is 'locked' (close 4018), never 'auth', and a matching new
 *      key goes through it;
 *   8. the owner: Forget takes every key back; "Give it a new key" is the
 *      full reset, its key shown once and never logged;
 *   9. twelve keys at most, the oldest never used going first;
 *  10. the wire: key_new is PRIVILEGED; the overview's counts. */
import { GameRoom, PRIVILEGED_EVENTS } from '../src/index.js';
import { KEY_WORDS, KEY_LEN, NEW_KEY_RE, makeLoginKey, normalizeKeyText, isNewKeyShape } from '../src/keywords.js';
import { readFileSync } from 'node:fs';
import { LOGIN_KEYS, newKeyOf } from '../src/loginkeys.js';
import { accountPassphraseToId } from '../src/account.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

let T = 1_980_000_000_000;
Date.now = () => T;

function makeState() {
  const store = new Map();
  const st = {
    puts: [],          // every key written
    putCalls: 0,       // every storage.put call (a batch is one)
    calls: [],         // each put call's keys
    ops: [],           // every put and delete, in order: {op, keys}
    storage: {
      get: async (k) => (Array.isArray(k) ? new Map(k.filter((x) => store.has(x)).map((x) => [x, store.get(x)])) : store.get(k)),
      put: async (k, v) => {
        st.putCalls++;
        st.ops.push({ op: 'put', keys: k && typeof k === 'object' ? Object.keys(k) : [k] });
        if (k && typeof k === 'object') { st.calls.push(Object.keys(k)); for (const [kk, vv] of Object.entries(k)) { store.set(kk, vv); st.puts.push(kk); } }
        else { st.calls.push([k]); store.set(k, v); st.puts.push(k); }
      },
      list: async (o) => {
        const out = new Map();
        for (const [k, v] of store) if (!o?.prefix || k.startsWith(o.prefix)) out.set(k, v);
        return out;
      },
      delete: async (k) => { st.ops.push({ op: 'del', keys: Array.isArray(k) ? k : [k] }); for (const x of (Array.isArray(k) ? k : [k])) store.delete(x); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
    _store: store,
  };
  /* the one-time device fill has nothing to do in these rooms */
  store.set('devlock:filled', { at: 1, chars: 0, devices: 0 });
  return st;
}
const mockEnv = {
  LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) },
  ADMIN_KEY: 'test-secret-key',
};
function fakeWs(label) {
  return { label, sent: [], closed: null, send(s) { this.sent.push(JSON.parse(s)); }, close(code, reason) { this.closed = { code, reason }; } };
}
function newRoom(state, flags) {
  const room = new GameRoom(state || makeState(), mockEnv);
  room._liveFlags = flags || {};
  return room;
}
async function join(room, id, phrase, device, extra) {
  const ws = fakeWs(id);
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 0, lastPing: 0, lastRecv: T });
  const msg = { type: 'join', id, name: 'P', phrase, protocolVersion: 2, ws: [1, 5], data: { x: 0, y: 0, z: 'town' } };
  if (device !== undefined) msg.device = device;
  Object.assign(msg, extra || {});
  await room.webSocketMessage(ws, JSON.stringify(msg));
  if (room.tickInterval) { clearInterval(room.tickInterval); room.tickInterval = null; }
  return ws;
}
const rejected = (ws) => ws.sent.find((m) => m.type === 'join_rejected');
const joined = (ws) => !rejected(ws) && ws.sent.some((m) => m.type === 'state_sync');
const keyOf = (ws) => { const m = ws.sent.find((x) => x.type === 'key_new'); return m ? m.key : null; };
const admin = (room, path, body, key) => room.fetch(new Request('https://x/api/admin' + path, {
  method: 'POST',
  headers: key === null ? {} : { Authorization: 'Bearer ' + (key || 'test-secret-key') },
  body: JSON.stringify(body || {}),
}));
const authOf = (room, id) => room.state._store.get('auth:' + id);
const KV = { kv: 2 };
const D1 = { id: 'phone1abc', env: 'e1' };
const D2 = { id: 'phone2xyz', env: 'e2' };
const D3 = { id: 'laptop3qq', env: 'e3' };
/* the put calls that touched a character's identity (auth:/keyidx:) --
   a join writes other records of its own (the save, the look) */
const idCalls = (room) => room.state.calls.filter((c) => c.some((k) => k.startsWith('auth:') || k.startsWith(LOGIN_KEYS.IDX)));
/* a character made by an OLDER phone (no kv): an existing character, whose
   old key is kept -- one made by a new phone retires its first key */
const madeOld = (room, id, dev) => join(room, id, OLD, dev || D1);
/* every stored value, as text: a key must never be in it */
const storedText = (room) => JSON.stringify([...room.state._store.entries()]);
/* the old key of a character this suite registers through a first join */
const OLD = 'alpha-blaze-coral-drift-7';

// ── 1. the words and the key ──
{
  check('1. 1,422 words, each 3-5 letters a-z, none twice', KEY_WORDS.length === 1422
    && KEY_WORDS.every((w) => /^[a-z]{3,5}$/.test(w)) && new Set(KEY_WORDS).size === 1422);
  check('1. a key is eight of them', KEY_LEN === 8);
  const k = makeLoginKey();
  check('1. a key made has the new shape, eight words of the list', isNewKeyShape(k) && k.split('-').length === 8 && k.split('-').every((w) => KEY_WORDS.includes(w)), k);
  check('1. two keys made are not the same', makeLoginKey() !== makeLoginKey());
  /* uniform: a draw past the last whole multiple of 1,422 is thrown away,
     never folded onto the first words */
  const lim = Math.floor(0x100000000 / 1422) * 1422;
  const seq = [lim, lim + 5, 0xffffffff, 0, 1, 2, 3, 4, 5, 6, 7];
  let i = 0;
  const k2 = makeLoginKey(() => seq[i++]);
  check('1. a draw past the last whole multiple is thrown away (no word more likely than another)',
    k2 === [0, 1, 2, 3, 4, 5, 6, 7].map((n) => KEY_WORDS[n]).join('-'), k2);
  check('1. typed any way, a key has one spelling', normalizeKeyText('  Lemon  TANGO_wood - acid ') === 'lemon-tango-wood-acid');
  check('1. an old key is not a new key\'s shape (four words and a number)', !isNewKeyShape(OLD) && newKeyOf(OLD) === null);
  check('1. ...nor is a word short of eight, a word too long, or a digit',
    !isNewKeyShape(k.split('-').slice(0, 7).join('-')) && !isNewKeyShape('abcdef-' + k.split('-').slice(1).join('-')) && !isNewKeyShape(k.replace(/^[a-z]+/, 'ab1')));
  check('1. newKeyOf takes a key typed with spaces and capitals', newKeyOf(k.toUpperCase().replace(/-/g, '  ')) === k);
}

// ── 2. a phone on its own device, with the OLD key, is handed a new key ──
let room2, key2, key2First, h2First;
{
  const room = newRoom();
  room2 = room;
  const w0 = await join(room, 'bp_lk_a', OLD, D1);     // an old phone made it: no kv
  check('2. (a character made by an older phone: in, no key handed)', joined(w0) && !keyOf(w0));
  check('2. ...and no key is kept for it', !(authOf(room, 'bp_lk_a').keys || []).length);
  room.state.calls.length = 0;
  const w1 = await join(room, 'bp_lk_a', OLD, D1, KV);
  const key = keyOf(w1);
  key2 = key;
  check('2. a phone that can take one, in with the old key on its own device: handed a new key', joined(w1) && isNewKeyShape(key || ''), w1.sent.map((m) => m.type));
  const at = w1.sent.findIndex((m) => m.type === 'key_new');
  check('2. ...after the state it is sent (the world first)', at > w1.sent.findIndex((m) => m.type === 'state_sync'));
  check('2. ...naming the character it is for', w1.sent[at] && w1.sent[at].id === 'bp_lk_a');
  const a = authOf(room, 'bp_lk_a');
  check('2. ...kept only as its fingerprint, for this device, not yet used',
    Array.isArray(a.keys) && a.keys.length === 1 && /^[0-9a-f]{64}$/.test(a.keys[0].h) && a.keys[0].d === 'phone1abc' && a.keys[0].ok === 0, a.keys);
  check('2. ...and the key itself is nowhere in storage', !storedText(room).includes(key));
  /* the fingerprint's recipe, pinned: SHA-256 of 'btk2|' + the key -- its own
     kind, never the old key's ('btv1|') */
  const want = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('btk2|' + key)))]
    .map((b) => b.toString(16).padStart(2, '0')).join('');
  check('2. ...the fingerprint is SHA-256 of \'btk2|\' and the key', a.keys[0].h === want, { h: a.keys[0].h, want });
  key2First = key; h2First = a.keys[0].h;
  const idx = room.state._store.get(LOGIN_KEYS.IDX + a.keys[0].h);
  check('2. ...its index names the character', idx && idx.id === 'bp_lk_a', idx);
  const ic = idCalls(room);
  check('2. ...the record and the index in ONE write', ic.length === 1 && ic[0].includes('auth:bp_lk_a') && ic[0].includes(LOGIN_KEYS.IDX + a.keys[0].h), ic);
  check('2. ...the old key still on file (its other devices come in with it)', typeof a.pfHash === 'string' && !a.oldGone);
  /* not again within 10 minutes (a phone that cannot keep one is not a write a join) */
  room.state.calls.length = 0;
  T += 60000;
  const w2 = await join(room, 'bp_lk_a', OLD, D1, KV);
  check('2. the old key again within 10 min: in, no second key, nothing written for it', joined(w2) && !keyOf(w2) && idCalls(room).length === 0, idCalls(room));
  /* without kv */
  const w3 = await join(room, 'bp_lk_a', OLD, D1);
  check('2. a phone that does not say kv: 2 is handed none', joined(w3) && !keyOf(w3));
  /* after 10 minutes, the device's key is replaced (it never kept the first) */
  T += LOGIN_KEYS.REMINT_MS;
  const w4 = await join(room, 'bp_lk_a', OLD, D1, KV);
  const keyB = keyOf(w4);
  const a4 = authOf(room, 'bp_lk_a');
  check('2. past 10 min, the old key again: a new key, replacing this device\'s first',
    isNewKeyShape(keyB || '') && keyB !== key && a4.keys.length === 1 && a4.keys[0].d === 'phone1abc');
  check('2. ...and the first one\'s index is gone (it finds nothing)', !room.state._store.has(LOGIN_KEYS.IDX + a.keys[0].h));
  const wOld = await join(room, 'bp_lk_a', key, D1, KV);
  check('2. ...so the first key no longer comes in: \'key\'', rejected(wOld) && rejected(wOld).reason === 'key');
  key2 = keyB;
}

// ── 3. the new key from any device ──
{
  const room = room2;
  room.state.calls.length = 0;
  const w1 = await join(room, 'bp_lk_a', key2, D3, KV);
  check('3. the new key from a device never seen: in (no pass, no device lock)', joined(w1), rejected(w1));
  check('3. ...no further key handed to it', !keyOf(w1));
  const a = authOf(room, 'bp_lk_a');
  check('3. ...its first use stamped, once', a.keys[0].ok === T && idCalls(room).length === 1, { ok: a.keys[0].ok, calls: idCalls(room) });
  check('3. ...and that device is NOT added to the old key\'s devices', !(a.devs || []).some((e) => e.d === 'laptop3qq'));
  room.state.calls.length = 0;
  const w2 = await join(room, 'bp_lk_a', key2, D2, KV);
  check('3. again, from another device: in, and nothing written for it', joined(w2) && idCalls(room).length === 0, idCalls(room));
  const w3 = await join(room, 'bp_lk_a', key2.toUpperCase().replace(/-/g, ' '), undefined, KV);
  check('3. typed with capitals and spaces, and no device at all: in', joined(w3), rejected(w3));
  /* the old key on an unknown device: still the device lock's */
  const w4 = await join(room, 'bp_lk_a', OLD, D3, KV);
  check('3. the old key on that device is still refused (the device lock holds it)', rejected(w4) && rejected(w4).reason === 'device');
}

// ── 4. a new-shaped key that is not the character's ──
{
  const room = room2;
  const other = makeLoginKey();
  const w1 = await join(room, 'bp_lk_a', other, D1, KV);
  const r = rejected(w1);
  check('4. a key the character never had: \'key\', close 4017 -- never \'auth\'', r && r.reason === 'key' && w1.closed && w1.closed.code === 4017, { r, c: w1.closed });
  /* never registered from a phone */
  room.state.puts.length = 0;
  const w2 = await join(room, 'bp_lk_nobody', other, D1, KV);
  check('4. a new-shaped key with no character is refused \'key\', and nothing is written',
    rejected(w2) && rejected(w2).reason === 'key' && !room.state.puts.length && !authOf(room, 'bp_lk_nobody'), room.state.puts);
  /* counted as a wrong key: five lock the id out */
  const roomL = newRoom();
  await join(roomL, 'bp_lk_l', OLD, D1, KV);
  for (let i = 0; i < 5; i++) await join(roomL, 'bp_lk_l', makeLoginKey(), D1, KV);
  const wL = await join(roomL, 'bp_lk_l', OLD, D1, KV);
  check('4. five wrong new keys lock the id out like five wrong old ones', rejected(wL) && rejected(wL).reason === 'locked', rejected(wL));
}

// ── 5. a NEW character ──
{
  const room = newRoom();
  const w1 = await join(room, 'bp_lk_new', OLD, D1, KV);
  const k = keyOf(w1);
  const a1 = authOf(room, 'bp_lk_new');
  check('5. a new character\'s first join: made, and handed a new key at once', joined(w1) && isNewKeyShape(k || ''));
  check('5. ...marked as made just now (its own first key is retired at the new one\'s first use)', a1.fresh === 1 && typeof a1.pfHash === 'string');
  const w2 = await join(room, 'bp_lk_new', OLD, D1, KV);
  check('5. before the new key is used, the first key still comes in on its device', joined(w2), rejected(w2));
  const w3 = await join(room, 'bp_lk_new', k, D1, KV);
  const a3 = authOf(room, 'bp_lk_new');
  check('5. the new key\'s first use: in, and the first key retired', joined(w3) && !a3.pfHash && a3.oldGone === 1 && !a3.fresh, a3);
  const w4 = await join(room, 'bp_lk_new', OLD, D1, KV);
  check('5. ...after which the first key is refused \'key\' -- never \'auth\'', rejected(w4) && rejected(w4).reason === 'key', rejected(w4));
  /* an existing character keeps its old key after a first use */
  const a2 = authOf(room2, 'bp_lk_a');
  check('5. an existing character\'s old key is NOT retired by a first use', typeof a2.pfHash === 'string' && !a2.oldGone);
}

// ── 6. the login door and the restart ──
{
  const room = room2;
  room.state.puts.length = 0;
  const r1 = await room._accountLogin(key2, 'ip1', 'neverseen');
  check('6. the door, a new key from a device never seen: exists, its id, device ok, kv 2',
    r1.ok && r1.exists && r1.id === 'bp_lk_a' && r1.device === 'ok' && r1.kv === 2 && r1.preview, r1);
  const r2 = await room._accountLogin(makeLoginKey(), 'ip1', 'x');
  check('6. a new key nobody has: exists false (as a typo of an old one)', r2.ok && r2.exists === false, r2);
  /* an index entry left behind (a failure between the record's write and the
     entry's delete): the record decides, so the replaced key finds nothing */
  room.state._store.set(LOGIN_KEYS.IDX + h2First, { id: 'bp_lk_a', at: 1 });
  const rStale = await room._accountLogin(key2First, 'ip1', 'x');
  check('6. a key replaced, its index entry left behind: the door finds nothing (the record decides)', rStale.ok && rStale.exists === false, rStale);
  room.state._store.delete(LOGIN_KEYS.IDX + h2First);
  /* the door finds an old key's character by the id worked out from it */
  const roomD = newRoom();
  const OID = accountPassphraseToId(OLD);
  await madeOld(roomD, OID);
  roomD.state.puts.length = 0;
  const r3 = await roomD._accountLogin(OLD, 'ip1', 'phone1abc');
  check('6. the old key on its own device: as before (exists, no kv)', r3.ok && r3.exists && r3.id === OID && r3.device === 'ok' && !r3.kv, r3);
  check('6. the door wrote nothing', !room.state.puts.length && !roomD.state.puts.length, [room.state.puts, roomD.state.puts]);
  /* an old key retired: its own words */
  const roomN = newRoom();
  const w = await join(roomN, OID, OLD, D1, KV);     /* a new character: its first key retired at its new one's first use */
  await join(roomN, OID, keyOf(w), D1, KV);
  const r4 = await roomN._accountLogin(OLD, 'ip2', 'phone1abc');
  check('6. an old key retired says \'keychanged\' (never "wrong key")', r4.ok === false && r4.reason === 'keychanged', r4);
  /* the restart with a new key, from anywhere */
  const r5 = await room._accountReset(key2, true, 'ip3', 'neverseen');
  check('6. the restart takes a new key from a device never seen', r5.ok && r5.reset && r5.id === 'bp_lk_a', r5);
}

// ── 7. a lockout ──
{
  const room = newRoom();
  await madeOld(room, 'bp_lk_lock');
  const w0 = await join(room, 'bp_lk_lock', OLD, D1, KV);
  const k = keyOf(w0);
  for (let i = 0; i < 5; i++) await join(room, 'bp_lk_lock', 'wrong-guess-key-' + i, D2);
  const w1 = await join(room, 'bp_lk_lock', OLD, D1, KV);
  const r1 = rejected(w1);
  check('7. five wrong keys from anyone: the next old-key join is \'locked\', close 4018 -- never \'auth\'',
    r1 && r1.reason === 'locked' && w1.closed && w1.closed.code === 4018, { r1, c: w1.closed });
  const w2 = await join(room, 'bp_lk_lock', k, D1, KV);
  check('7. ...and a matching NEW key goes through the lockout', joined(w2), rejected(w2));
  T += 61000;
  const w3 = await join(room, 'bp_lk_lock', OLD, D1, KV);
  check('7. ...and after the minute the old key comes in again', joined(w3), rejected(w3));
}

// ── 8. the owner ──
{
  const room = newRoom();
  await madeOld(room, 'bp_lk_o');
  const wa = await join(room, 'bp_lk_o', OLD, D1, KV);
  const ka = keyOf(wa);
  await join(room, 'bp_lk_o', ka, D1, KV);      // used
  const live = await join(room, 'bp_lk_o', ka, D2, KV);
  const hBefore = authOf(room, 'bp_lk_o').keys.map((x) => x.h);
  const opsAt = room.state.ops.length;
  let r = await admin(room, '/device-forget', { playerId: 'bp_lk_o' });
  let j = await r.json();
  check('8. Forget takes every new key back too', j.ok && j.taken === 1 && !(authOf(room, 'bp_lk_o').keys || []).length
    && hBefore.every((h) => !room.state._store.has(LOGIN_KEYS.IDX + h)), j);
  /* the record first: an index entry it no longer lists finds nothing, so a
     failure between the two leaves no taken key working */
  const fops = room.state.ops.slice(opsAt);
  const pI = fops.findIndex((o) => o.op === 'put' && o.keys.includes('auth:bp_lk_o'));
  const dI = fops.findIndex((o) => o.op === 'del' && o.keys.some((k) => k.startsWith(LOGIN_KEYS.IDX)));
  check('8. ...the record is written before the keys leave the index', pI >= 0 && dI > pI, fops);
  check('8. ...and whoever played puts out (device screen)', rejected(live) && rejected(live).reason === 'device');
  const w1 = await join(room, 'bp_lk_o', ka, D2, KV);
  check('8. ...so the taken key no longer comes in: \'key\'', rejected(w1) && rejected(w1).reason === 'key');
  /* a pass, the old key on a new device: in, and handed a key */
  await admin(room, '/device-pass', { playerId: 'bp_lk_o' });
  const w2 = await join(room, 'bp_lk_o', OLD, D3, KV);
  check('8. the pass and the old key on a new device: in, and handed a new key', joined(w2) && isNewKeyShape(keyOf(w2) || ''));

  /* "Give it a new key": the full reset */
  const live2 = await join(room, 'bp_lk_o', keyOf(w2), D3, KV);
  r = await admin(room, '/key-new', { playerId: 'bp_lk_o' });
  j = await r.json();
  const a = authOf(room, 'bp_lk_o');
  check('8. "Give it a new key": one key for the owner, every other taken back, every device forgotten, the old key retired',
    j.ok && isNewKeyShape(j.key || '') && a.keys.length === 1 && a.keys[0].d === null && !a.pfHash && a.oldGone === 1 && a.sealed === true && !(a.devs || []).length, { j, a });
  check('8. ...whoever played is put out with the key\'s reason (close 4017)', rejected(live2) && rejected(live2).reason === 'key' && live2.closed && live2.closed.code === 4017);
  check('8. ...the key in the index, and NOT in the admin log', room.state._store.get(LOGIN_KEYS.IDX + a.keys[0].h).id === 'bp_lk_o'
    && !JSON.stringify(room.state._store.get('admin_log') || []).includes(j.key));
  const w3 = await join(room, 'bp_lk_o', j.key, { id: 'brandnew' }, KV);
  check('8. ...and the owner\'s key comes in from any device', joined(w3), rejected(w3));
  const w4 = await join(room, 'bp_lk_o', OLD, D1, KV);
  check('8. ...while the old key is refused \'key\' everywhere', rejected(w4) && rejected(w4).reason === 'key');
  r = await admin(room, '/key-new', { playerId: 'bp_lk_o' }, null);
  check('8. the route needs the admin key', r.status === 401);
}

// ── 9. twelve keys at most ──
{
  const room = newRoom();
  await madeOld(room, 'bp_lk_cap');
  await join(room, 'bp_lk_cap', OLD, D1, KV);
  const firstH = authOf(room, 'bp_lk_cap').keys[0].h;
  /* eleven more devices, each let in by a pass and handed a key */
  for (let i = 0; i < 12; i++) {
    await admin(room, '/device-pass', { playerId: 'bp_lk_cap' });
    await join(room, 'bp_lk_cap', OLD, { id: 'cap' + i }, KV);
    T += 1000;
  }
  const a = authOf(room, 'bp_lk_cap');
  check('9. at most 12 keys', a.keys.length === LOGIN_KEYS.MAX, a.keys.length);
  check('9. ...the oldest never used went first, and its index with it', !a.keys.some((k) => k.h === firstH) && !room.state._store.has(LOGIN_KEYS.IDX + firstH));
}

// ── 10. the switch, the wire, the overview ──
{
  const room = newRoom(undefined, { keys2: false });
  const w1 = await join(room, 'bp_lk_off', OLD, D1, KV);
  check('10. keys2: false -- no key handed out', joined(w1) && !keyOf(w1));
  const roomK = newRoom();
  const wk = await join(roomK, 'bp_lk_on', OLD, D1, KV);
  const k = keyOf(wk);
  roomK._liveFlags = { keys2: false };
  const w2 = await join(roomK, 'bp_lk_on', k, D2, KV);
  check('10. ...but a key already made still comes in (the switch locks nobody out)', joined(w2), rejected(w2));
  check('10. key_new is PRIVILEGED (a phone cannot relay one)', PRIVILEGED_EVENTS.has('key_new'));
  const info = roomK._keysInfo();
  check('10. the overview counts keys made and used', info.made === 1 && info.used >= 1 && info.on === false, info);
}

// ── 11. the phone knows a new key as the worker does ──
{
  /* src/networking/index.js keeps its own copy of the key's shape and
     spelling (and rosterCookie.js its shape): a key the worker makes that the
     phone does not take for one is a key whose id it works out from the key,
     wrongly.  The module reads `window` as it loads; nothing else. */
  globalThis.window = globalThis.window || {};
  const cli = await import('../../src/networking/index.js');
  const made = Array.from({ length: 300 }, () => makeLoginKey());
  check('11. every key the worker makes is a new key to the phone', made.every((k) => cli.isNewKey(k)));
  check('11. ...and an old key, or a key a word short, is not', !cli.isNewKey(OLD) && !cli.isNewKey(made[0].split('-').slice(0, 7).join('-')));
  const typed = made.slice(0, 50).map((k, i) => (i % 3 === 0 ? k.toUpperCase().replace(/-/g, ' ')
    : i % 3 === 1 ? '  ' + k.replace(/-/g, '_') + ' ' : k.replace(/-/g, ' - ')));
  check('11. ...typed any way, the phone spells it as the worker does',
    typed.every((t) => cli.normalizeNewKey(t) === normalizeKeyText(t)), typed.filter((t) => cli.normalizeNewKey(t) !== normalizeKeyText(t)));
  check('11. the phone\'s pattern is the worker\'s', cli.NEW_KEY_RE.source === NEW_KEY_RE.source, { phone: cli.NEW_KEY_RE.source, worker: NEW_KEY_RE.source });
  const cookie = readFileSync(new URL('../../src/networking/rosterCookie.js', import.meta.url), 'utf8');
  check('11. ...and the shared roster\'s (rosterCookie.js, which keeps a new key\'s id)', cookie.includes('/' + NEW_KEY_RE.source + '/.test('));
}

// ── 12. v2.3.3372: one change at a time to a character's login record ──
// Every change to `auth:<id>` reads it, works out the next and writes it, with
// something other than storage awaited between (a key's hash, the account
// check's fetch, the put-out player's leaving run): two at once both read the
// same record and the second write threw the first away.  A gate is put where
// each waits, and the owner's tool is run in the gap.
{
  const realHash = GameRoom.prototype._keyHash;
  const gateNext = () => { let open; const p = new Promise((r) => { open = r; }); return { p, open }; };
  const tick = () => new Promise((r) => setTimeout(r, 5));
  /* a character an older phone made on D1; D2 let in once (no key made);
     nobody left playing it */
  const setUp = async (id) => {
    const room = newRoom();
    await madeOld(room, id, D1);
    await admin(room, '/device-pass', { playerId: id });
    await join(room, id, OLD, D2);
    for (const [w, s] of [...room.sessions]) if (s.id === id) await room.webSocketClose(w);
    return room;
  };

  /* 12a. a join's handout has read the record and is making the key when the
          owner's Forget runs: the Forget must stand */
  {
    const id = 'bp_lk_r1';
    const room = await setUp(id);
    check('12a. the world: two devices, no new keys yet', (authOf(room, id).devs || []).length === 2 && !(authOf(room, id).keys || []).length, authOf(room, id));
    const g = gateNext();
    room._keyHash = async function (k) { await g.p; return realHash.call(this, k); };
    const pj = join(room, id, OLD, D1, KV);
    await tick();
    const pf = admin(room, '/device-forget', { playerId: id });
    await tick();
    g.open();
    const ws = await pj;
    const j = await (await pf).json();
    await tick();
    const a = authOf(room, id);
    check('12a. the Forget stands: no device, no key, sealed', j.ok && !(a.devs || []).length && !(a.keys || []).length && a.sealed === true, a);
    check('12a. ...and the key handed out before it is taken back with the rest (its index gone)',
      ![...room.state._store.keys()].some((k) => k.startsWith(LOGIN_KEYS.IDX) && room.state._store.get(k).id === id));
    check('12a. ...and the player is put out (device screen)', rejected(ws) && rejected(ws).reason === 'device', ws.sent.map((m) => m.type));
    const again = await join(room, id, keyOf(ws) || OLD, D1, KV);
    check('12a. ...so nothing they hold comes back in', !!rejected(again), again.sent.map((m) => m.type));
  }

  /* 12b. a join past its check, not yet playing, when the owner's Forget runs
          (the tool finds nobody to put out): its handout puts it out and hands
          it nothing */
  const pastCheck = async (room, id, gateKey) => {
    const realGet = room.state.storage.get;
    const g = gateNext();
    let gated = false;
    room.state.storage.get = async (k) => {
      if (!gated && k === gateKey) { gated = true; await g.p; }
      return realGet(k);
    };
    return { g, done: () => { room.state.storage.get = realGet; } };
  };
  {
    const id = 'bp_lk_r2';
    const room = await setUp(id);
    const pc = await pastCheck(room, id, 'frozen:' + id);
    const pj = join(room, id, OLD, D1, KV);
    await tick();
    const j = await (await admin(room, '/device-forget', { playerId: id })).json();
    check('12b. the Forget ran while the join was past its check (it found nobody playing)', j.ok && j.wasOnline === false, j);
    pc.g.open();
    const ws = await pj;
    pc.done();
    await tick();
    const a = authOf(room, id);
    check('12b. the join is put out with the device\'s reason, once it is in', rejected(ws) && rejected(ws).reason === 'device' && ws.closed && ws.closed.code === 4016, { sent: ws.sent.map((m) => m.type), closed: ws.closed });
    check('12b. ...and handed NO key (one would have outlived the Forget)', !keyOf(ws) && !(a.keys || []).length, { key: keyOf(ws), keys: a.keys });
    check('12b. ...and it leaves the world (no session, no body)', ![...room.sessions.values()].some((s) => s.id === id) && !room.playerState[id]);
  }

  /* 12c. the same with "Give it a new key": the old key is retired, so a join
          that came in with it is put out with the key's reason */
  {
    const id = 'bp_lk_r3';
    const room = await setUp(id);
    const pc = await pastCheck(room, id, 'frozen:' + id);
    const pj = join(room, id, OLD, D1, KV);
    await tick();
    const j = await (await admin(room, '/key-new', { playerId: id })).json();
    pc.g.open();
    const ws = await pj;
    pc.done();
    await tick();
    const a = authOf(room, id);
    check('12c. a join with the old key, past its check when the key was reset: put out, the key\'s reason (close 4017)',
      j.ok && rejected(ws) && rejected(ws).reason === 'key' && ws.closed && ws.closed.code === 4017, { sent: ws.sent.map((m) => m.type), closed: ws.closed });
    check('12c. ...handed nothing, and the owner\'s one key is the only one', !keyOf(ws) && a.keys.length === 1 && a.keys[0].d === null, a.keys);
  }

  /* 12d. a NEW key taken back (Forget) while a join with it is past its check */
  {
    const id = 'bp_lk_r4';
    const room = await setUp(id);
    const wk = await join(room, id, OLD, D1, KV);
    const k = keyOf(wk);
    await join(room, id, k, D1, KV);                // its first use
    const pc = await pastCheck(room, id, 'frozen:' + id);
    const pj = join(room, id, k, D3, KV);
    await tick();
    await admin(room, '/device-forget', { playerId: id });
    pc.g.open();
    const ws = await pj;
    pc.done();
    await tick();
    check('12d. a join with a new key the Forget took back meanwhile: put out with the key\'s reason',
      isNewKeyShape(k || '') && rejected(ws) && rejected(ws).reason === 'key', { sent: ws.sent.map((m) => m.type) });
  }

  /* 12e. nothing waits for ever: joins, a pass and two Forgets of one
          character all at once, every one answered */
  {
    const id = 'bp_lk_r5';
    const room = await setUp(id);
    const all = [
      join(room, id, OLD, D1, KV), join(room, id, OLD, D2, KV), admin(room, '/device-forget', { playerId: id }),
      join(room, id, OLD, D1, KV), admin(room, '/device-pass', { playerId: id }), join(room, id, OLD, D3, KV),
      admin(room, '/device-forget', { playerId: id }), join(room, id, OLD, D2, KV),
    ];
    const timeout = new Promise((r) => setTimeout(() => r('timeout'), 3000));
    const res = await Promise.race([Promise.all(all).then(() => 'done'), timeout]);
    check('12e. eight changes to one record at once: every one finishes (no wait for ever)', res === 'done', res);
    await tick();
    const a = authOf(room, id);
    check('12e. ...and the last word is the last Forget\'s: no device, no key, sealed', !(a.devs || []).length && !(a.keys || []).length && a.sealed === true, a);
    check('12e. ...and nothing is queued behind it any more', !room._authChains || !room._authChains.has(id));
  }

  /* 12g. a join has READ the record and is checking its key (a hash) when
          the owner's Forget runs, then remembers its device: the device it
          remembers must not bring the forgotten ones back */
  {
    const id = 'bp_lk_r6';
    const room = await setUp(id);
    await admin(room, '/device-pass', { playerId: id });          // D3 may come in once
    const realPhrase = GameRoom.prototype._phraseHash;
    const g = gateNext();
    let gated = false;
    room._phraseHash = async function (p) { if (!gated) { gated = true; await g.p; } return realPhrase.call(this, p); };
    const pj = join(room, id, OLD, D3, KV);
    await tick();
    const pf = admin(room, '/device-forget', { playerId: id });
    await tick();
    g.open();
    const ws = await pj;
    await pf;
    await tick();
    const a = authOf(room, id);
    check('12g. the Forget stands over a device the join remembered: no device, no key, sealed, no pass',
      !(a.devs || []).length && !(a.keys || []).length && a.sealed === true && !a.pass, a);
    check('12g. ...and that join is put out and handed nothing', rejected(ws) && !keyOf(ws), ws.sent.map((m) => m.type));
  }

  /* 12h. one join's handout is making its key when another join, let in by a
          pass, remembers its device: neither change is lost */
  {
    const id = 'bp_lk_r7';
    const room = await setUp(id);
    await admin(room, '/device-pass', { playerId: id });          // D3 may come in once
    const g = gateNext();
    let gated = false;
    room._keyHash = async function (k) { if (!gated) { gated = true; await g.p; } return realHash.call(this, k); };
    const pa = join(room, id, OLD, D1, KV);                       // its handout waits on the hash
    await tick();
    const pc = await pastCheck(room, id, 'frozen:' + id);         // B waits before it takes A's place
    const pb = join(room, id, OLD, D3, KV);
    await tick();
    g.open();
    await tick();
    pc.g.open();
    await pa;
    const wb = await pb;
    pc.done();
    await tick();
    const a = authOf(room, id);
    check('12h. the device the pass let in is remembered, and the pass is spent',
      (a.devs || []).some((e) => e.d === D3.id) && !a.pass, { devs: a.devs, pass: a.pass });
    check('12h. ...and the device that came in on the pass is handed its key', joined(wb) && isNewKeyShape(keyOf(wb) || '')
      && (a.keys || []).some((k) => k.d === D3.id), { keys: a.keys });
  }

  /* 12f. the queue keeps two ids apart: one character's slow change never
          holds another's join */
  {
    const room = newRoom();
    await madeOld(room, 'bp_lk_s1', D1);
    await madeOld(room, 'bp_lk_s2', D2);
    const pc = await pastCheck(room, 'bp_lk_s1', 'auth:bp_lk_s1');
    const p1 = join(room, 'bp_lk_s1', OLD, D1);
    await tick();
    const w2 = await Promise.race([join(room, 'bp_lk_s2', OLD, D2), new Promise((r) => setTimeout(() => r(null), 1000))]);
    check('12f. another character\'s join is not held by this one\'s', !!w2 && joined(w2), w2 && w2.sent.map((m) => m.type));
    pc.g.open();
    const w1 = await p1;
    pc.done();
    check('12f. ...and the held one finishes when let go', joined(w1));
  }
}

if (failures) { console.log('\nlogin-keys: ' + failures + ' FAILED'); process.exit(1); }
console.log('\nlogin-keys: all checks passed');
