/* ═══ v2.3.6001: THE USAGE METER (server/src/usagemeter.js; card CS PR 2) ═══
 *
 * The owner, 2026-11-17: "I think turn all of them on then we monitor usage
 * cost".  This holds the monitor:
 *
 *   1. ROWS WRITTEN: a put of a key 1, of entries each, a delete each key;
 *      by kind (the key's prefix with its ':', or the key);
 *   2. ROWS READ: a get of a key 1, of a list each; a list() each row it
 *      returns (at least 1), by its prefix;
 *   3. THE SIX SWITCHES' ROWS named apart: `oplog:rq:` reqstamp, `econ_gone`
 *      resetbook, `xfer:` xferescrow, `seats` seathold as written; fullsnap's
 *      reads told by the daily copy;
 *   4. MESSAGES: every frame through the send door, by its type; a frame to
 *      the room counted once a socket;
 *   5. TODAY: the UTC day's bucket starts empty at 00:00 UTC; the room's own
 *      runs on;
 *   6. NOTHING WRITTEN for the meter: counting and reading add no row;
 *   7. BOUNDED: at most KINDS_MAX kinds a list, the rest `other`;
 *   8. THE KILL SWITCH `usagemeter: false`: nothing counted, the read says off;
 *   9. THE ROUTE: GET /api/admin/dev/usage answers the owner's key only.
 *
 * BREAK PROOF (rule 8), tried by hand once, 2026-11-18:
 *   - the delete wrapper's count taken out          -> FAIL 1 (writes 6, not 9), 3
 *   - _usageSent's `today` bump taken out            -> FAIL 4 (today's sends), 7
 *   - the day's turn (`t >= m.todayEnd`) taken out   -> FAIL 5
 */
import { makeStorage, openRoom, fakeWs, mockEnv } from './testroom.mjs';
import { GameRoom } from '../src/index.js';
import { USAGE, usageKind, usageSwitchOf } from '../src/usagemeter.js';
import { snapshotCopy } from '../src/playerrestore.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail !== undefined ? '  ' + JSON.stringify(detail).slice(0, 400) : '')); }
}
const settle = () => new Promise((r) => setTimeout(r, 5));

/* ── 0. the kind and the switch of a key ── */
check('0. a key\'s kind: its prefix with the colon, or the key', usageKind('rpg:bp_a') === 'rpg:' && usageKind('seats') === 'seats' && usageKind('oplog:rq:bp_a:r1') === 'oplog:' && usageKind(5) === USAGE.OTHER);
check('0. the six switches\' keys', usageSwitchOf('oplog:rq:bp_a:r1') === 'reqstamp' && usageSwitchOf('oplog:duelpot:x') === null && usageSwitchOf('econ_gone') === 'resetbook'
  && usageSwitchOf('econ_gone2') === null && usageSwitchOf('xfer:20261118:x') === 'xferescrow' && usageSwitchOf('seats') === 'seathold' && usageSwitchOf('seatsx') === null);

/* ── 1-3. rows written and read ── */
{
  const st = makeStorage();
  const room = await openRoom(st, {});
  const base = room._usageRead();
  const w0 = base.sinceStart.writes, r0 = base.sinceStart.reads;
  const s = room.state.storage;
  await s.put('rpg:bp_um_a', { coins: 1 });
  await s.put({ 'bank:bp_um_a': { gold: 1 }, 'pets:bp_um_a': { v: 1 } });
  await s.delete(['bank:bp_um_a', 'pets:bp_um_a']);
  await s.delete('rpg:bp_um_a');
  await s.get('rpg:bp_um_b');
  await s.get(['char:bp_um_a', 'char:bp_um_b', 'auth:bp_um_a']);
  await s.put({ 'char:x1': 1, 'char:x2': 2, 'char:x3': 3 });
  await s.list({ prefix: 'char:' });
  await s.list({ prefix: 'nothing:' });
  await settle();
  const u = room._usageRead();
  check('1. rows written: a put 1, a put of two entries 2, a delete of two 2, a delete 1, a put of three 3 (9)', u.sinceStart.writes - w0 === 9, u.sinceStart.writes - w0);
  check('1. ...by kind (rpg: 2, bank: 2, pets: 2, char: 3)', u.sinceStart.byKind.writes['rpg:'] >= 2 && u.sinceStart.byKind.writes['bank:'] === 2 && u.sinceStart.byKind.writes['pets:'] === 2 && u.sinceStart.byKind.writes['char:'] === 3, u.sinceStart.byKind.writes);
  check('2. rows read: a get 1, a get of three 3, a list of three 3, an empty list 1 (8)', u.sinceStart.reads - r0 === 8, u.sinceStart.reads - r0);
  check('2. ...by kind (char: 2 got + 3 listed, nothing: 1)', u.sinceStart.byKind.reads['char:'] >= 5 && u.sinceStart.byKind.reads['nothing:'] === 1, u.sinceStart.byKind.reads);
  check('1. today counts the same rows', u.today.writes >= 9 && u.today.byKind.writes['char:'] === 3);

  const sw0 = room._usageRead().today.switches;
  await s.put('oplog:rq:bp_um_a:r1', 1);
  await s.put({ econ_gone: { n: 1 }, 'xfer:20261118:d1': { v: 1 }, 'xfer:20261118:d2': { v: 1 } });
  await s.put('seats', { v: 2, in: [] });
  await s.put('oplog:duelpot:x', 1);
  await s.delete('oplog:rq:bp_um_a:r1');
  const sw = room._usageRead().today.switches;
  check('3. the switches\' rows named apart: reqstamp 2 (a stamp and its prune), resetbook 1, xferescrow 2, seathold 1; another oplog: none',
    sw.reqstamp.writes - sw0.reqstamp.writes === 2 && sw.resetbook.writes - sw0.resetbook.writes === 1 && sw.xferescrow.writes - sw0.xferescrow.writes === 2 && sw.seathold.writes - sw0.seathold.writes === 1, sw);
  check('3. all six are listed, each with its writes and reads', USAGE.SWITCHES.every((n) => sw[n] && typeof sw[n].writes === 'number' && typeof sw[n].reads === 'number'));
  /* fullsnap: the daily copy's two reads, told by it */
  const f0 = room._usageRead().today.switches.fullsnap.reads;
  await snapshotCopy(room, 'bp_um_a', { coins: 1 });
  check('3. fullsnap: the daily copy\'s reads (the vault, the pets) named apart', room._usageRead().today.switches.fullsnap.reads - f0 === 2, room._usageRead().today.switches.fullsnap);
}

/* ── 4. messages ── */
{
  const room = await openRoom(makeStorage(), {});
  const a = fakeWs('a'), b = fakeWs('b');
  const s0 = room._usageRead();
  room._send(a, { type: 'um_test', payload: {} });
  room._send(a, JSON.stringify({ type: 'um_tick' }), 'um_tick');
  room.sessions.set(a, { id: 'bp_um_a' }); room.sessions.set(b, { id: 'bp_um_b' });
  room._sendRoom({ type: 'um_room' });
  const u = room._usageRead();
  check('4. every frame through the door: 2 sent, and the room\'s to two sockets 2 (4)', u.sinceStart.sends - s0.sinceStart.sends === 4 && u.today.sends - s0.today.sends === 4, { start: u.sinceStart.sends - s0.sinceStart.sends, today: u.today.sends - s0.today.sends });
  check('4. ...by type', u.today.byKind.sends.um_test === 1 && u.today.byKind.sends.um_tick === 1 && u.today.byKind.sends.um_room === 2, u.today.byKind.sends);
}

/* ── 5. today ── */
{
  const t0 = Date.UTC(2026, 10, 18, 23, 59, 0);
  const room = new GameRoom(makeStorage(), mockEnv);
  room._usageMem(t0);
  room._usage.start.since = t0; room._usage.today.since = t0;
  room._usageCount(0, 'rpg:', 5, null);
  const before = room._usageRead(t0);
  const after = room._usageRead(t0 + 120000);   /* 00:01 UTC the next day */
  check('5. at 00:00 UTC today starts empty, counted from 00:00 (not its first count); the room\'s own runs on', before.today.writes === 5 && after.today.writes === 0 && after.sinceStart.writes === before.sinceStart.writes && after.today.since === Date.UTC(2026, 10, 19), { before: before.today.writes, after: after.today.writes, since: after.today.since });
  check('5. ...and says when the day ends', after.dayEnds === Date.UTC(2026, 10, 20));
}

/* ── 6. nothing written for the meter ── */
{
  const st = makeStorage();
  const room = await openRoom(st, {});
  const keys = [...st._store.keys()].join();
  for (let i = 0; i < 50; i++) room._send(fakeWs('x'), { type: 'um_x' });
  room._usageRead(); room._usageRead(Date.now() + 2 * USAGE.DAY_MS);
  await settle();
  check('6. counting and reading write no row', [...st._store.keys()].join() === keys);
}

/* ── 7. bounded ── */
{
  const room = await openRoom(makeStorage(), {});
  for (let i = 0; i < 200; i++) room._usageCount(0, 'k' + i + ':', 1, null);
  for (let i = 0; i < 200; i++) room._usageSent('t' + i);
  const u = room._usageRead();
  check('7. at most KINDS_MAX kinds a list, the rest `other`', Object.keys(u.today.byKind.writes).length <= USAGE.KINDS_MAX && u.today.byKind.writes.other > 0
    && Object.keys(u.today.byKind.sends).length <= USAGE.KINDS_MAX && u.today.byKind.sends.other > 0, { w: Object.keys(u.today.byKind.writes).length, s: Object.keys(u.today.byKind.sends).length });
}

/* ── 8. the kill switch ── */
{
  const st = makeStorage();
  const room = await openRoom(st, { usagemeter: false });
  const s0 = room._usageRead();
  await room.state.storage.put('rpg:bp_um_k', 1);
  await room.state.storage.get('rpg:bp_um_k');
  room._send(fakeWs('k'), { type: 'um_k' });
  const u = room._usageRead();
  check('8. `usagemeter: false`: nothing counted, the read says off', u.on === false && u.today.writes === s0.today.writes && u.today.reads === s0.today.reads && u.today.sends === s0.today.sends);
  check('8. ...the write itself goes on', st._store.get('rpg:bp_um_k') === 1);
}

/* ── 9. the route ── */
{
  const KEY = 'owner-key-usage';
  const room = new GameRoom(makeStorage(), { ...mockEnv, ADMIN_KEY: KEY });
  await room._liveFlagsEnsure();
  const no = await room.fetch(new Request('https://x/api/admin/dev/usage'));
  const res = await room.fetch(new Request('https://x/api/admin/dev/usage', { headers: { Authorization: 'Bearer ' + KEY } }));
  const j = await res.json().catch(() => null);
  check('9. GET /api/admin/dev/usage: without the key refused; with it, the two buckets', no.status === 401 && res.status === 200 && j && j.ok === true && j.on === true
    && typeof j.today.writes === 'number' && typeof j.sinceStart.reads === 'number' && !!j.today.switches.xferescrow, { no: no.status, ok: res.status });
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) { console.log(failed + ' FAILURE(S)'); process.exit(1); }
