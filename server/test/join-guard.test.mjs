/* ═══ v2.3.5730: A JOIN TAKES ONLY WHAT IS ITS OWN (card K2 PR 11; `joinguard`) ═══
 *
 * Card RV's review (docs/plan/census/RV-review.md) found four ways a join
 * took what was not its own.  This holds, on the shared test room:
 *
 *   1. the reader: on with no flag, off only with `joinguard: false`;
 *   2. SEC-F1: a join with NO id is refused ('auth', 4003), out of the room,
 *      and writes nothing (no body under `undefined`, no
 *      `cadence:login:undefined`);
 *   3. ACC-1: a key does not register a guest's id -- not while the guest
 *      plays it (the guest kept, its socket open), nor once it has gone
 *      with its record on file -- answered 'key', no `auth:` written; the
 *      guest's own keyless rejoin comes in; a fresh `bp_` id and a seeded
 *      `bp_` record with no key still register with a key;
 *   4. ACC-2: a guest's join on a made-up `bp_` id writes no `char:` row;
 *   5. ACC-3: with `seathold` on, a socket that named a held seat and never
 *      joined does not keep the holder out: the holder's socket takes the
 *      claim, and its join comes in;
 *   6. `joinguard: false`: each as before (the takeover, the char row, the
 *      join with no id, the claim kept).
 *
 * Red on main (v2.3.5729): 1, 2, 3, 4 and 5. */
import { makeStorage, openRoom, fakeWs, baseSession, settle } from './testroom.mjs';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 500))); }
}
const synced = (ws) => ws.sent.some((m) => m && m.type === 'state_sync');
const rejectedWhy = (ws) => { const m = ws.sent.find((x) => x && x.type === 'join_rejected'); return m ? m.reason : null; };
const inRoom = (room, id) => [...room.sessions.values()].some((s) => s.id === id);

async function rawJoin(room, label, msg, extra) {
  const ws = fakeWs(label);
  room.sessions.set(ws, { ...baseSession(), phase: 'open', ...(extra || {}) });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', protocolVersion: 2, ws: [1, 5], data: { x: 100, y: 100, z: 'town' }, ...msg }));
  await settle();
  return ws;
}
const has = (st, k) => st._store.has(k);

/* ── 1. the reader ── */
{
  const a = await openRoom(makeStorage());
  const b = await openRoom(makeStorage(), { joinguard: false });
  check('1. `joinguard` is on with no flag', typeof a._joinGuardOn === 'function' && a._joinGuardOn() === true);
  check('1. ...off with `joinguard: false`', typeof b._joinGuardOn === 'function' && b._joinGuardOn() === false);
}

/* ── 2. SEC-F1: a join with no id ── */
{
  const st = makeStorage();
  const room = await openRoom(st);
  const ws = await rawJoin(room, 'noid', { name: 'Nobody' });
  check('2. a join with no id is refused \'auth\', closed 4003', rejectedWhy(ws) === 'auth' && ws.closed && ws.closed.code === 4003 && !synced(ws), { sent: ws.sent.map((m) => m.type), closed: ws.closed });
  check('2. ...out of the room, no body under undefined, no cadence:login:undefined', room.sessions.size === 0 && !room.playerState.undefined && !has(st, 'cadence:login:undefined'), [...st._store.keys()].filter((k) => k.includes('undefined')));
}

/* ── 3. ACC-1: a key does not register a guest's id ── */
{
  const st = makeStorage();
  const room = await openRoom(st);
  const g = await rawJoin(room, 'guest', { id: 'k3j9xq2a', name: 'Guesty' });
  check('3. a guest joins (no key)', synced(g) && inRoom(room, 'k3j9xq2a'));
  await room._saveRpg('k3j9xq2a', room.playerState.k3j9xq2a);   /* the guest earned something: its record on file */
  const t = await rawJoin(room, 'thief', { id: 'k3j9xq2a', name: 'Thief', phrase: 'my-own-phrase-1' });
  check('3. a key on the id a guest is playing is refused \'key\'', rejectedWhy(t) === 'key' && !synced(t), t.sent.map((m) => m.type));
  check('3. ...the guest kept (its socket open, in the room), no auth: written', !g.closed && inRoom(room, 'k3j9xq2a') && !has(st, 'auth:k3j9xq2a'), { closed: g.closed });
  await room.webSocketClose(g); await settle();
  const t2 = await rawJoin(room, 'thief2', { id: 'k3j9xq2a', name: 'Thief', phrase: 'my-own-phrase-1' });
  check('3. once the guest has gone, its record on file: still refused \'key\', no auth: written', rejectedWhy(t2) === 'key' && !has(st, 'auth:k3j9xq2a'), t2.sent.map((m) => m.type));
  const back = await rawJoin(room, 'guest2', { id: 'k3j9xq2a', name: 'Guesty' });
  check('3. the guest\'s own rejoin (no key) comes in', synced(back), back.sent.map((m) => m.type));
  const fresh = await rawJoin(room, 'fresh', { id: 'bp_jg_fresh', name: 'Fresh', phrase: 'p-jg-fresh' });
  check('3. a fresh bp_ id registers with a key, as before', synced(fresh) && has(st, 'auth:bp_jg_fresh'));
  await room.state.storage.put('rpg:bp_jg_seeded', { level: 3 });
  const seeded = await rawJoin(room, 'seeded', { id: 'bp_jg_seeded', name: 'Seeded', phrase: 'p-jg-seeded' });
  check('3. a seeded bp_ record with no key registers with a key, as before (the suites\' seeding)', synced(seeded) && has(st, 'auth:bp_jg_seeded'));
}

/* ── 4. ACC-2: a guest's made-up bp_ id ── */
{
  const st = makeStorage();
  const room = await openRoom(st);
  const ws = await rawJoin(room, 'squat', { id: 'bp_zz9_madeup', name: 'Squat', data: { x: 100, y: 100, z: 'town', color: '#ff0000', name: 'Squat' } });
  check('4. a guest on a made-up bp_ id comes in', synced(ws));
  check('4. ...and writes no char: row', !has(st, 'char:bp_zz9_madeup') && !has(st, 'auth:bp_zz9_madeup'), [...st._store.keys()].filter((k) => k.includes('madeup')));
}

/* ── 5. ACC-3: a claim on a held seat ── */
{
  const st = makeStorage();
  const room = await openRoom(st, { max_players: 2, seathold: true });
  const a = await rawJoin(room, 'a', { id: 'bp_jg_holder', name: 'Holder', phrase: 'p-holder' });
  await rawJoin(room, 'b', { id: 'bp_jg_other', name: 'Other', phrase: 'p-other' });
  await room.webSocketClose(a); await settle();
  check('5. the holder\'s drop holds its seat', room._seatHeldIds(Date.now()).has('bp_jg_holder'));
  const url = new URL('https://x.test/ws?rf=1&seat=bp_jg_holder');
  const g1 = room._seatGate(url, Date.now());
  const squat = fakeWs('squat');
  room.sessions.set(squat, { ...baseSession(), phase: 'open', seat: g1.seat });   /* named the seat, never joins */
  check('5. a stranger naming the held seat is let in on it', g1.ok && g1.seat === 'bp_jg_holder');
  const g2 = room._seatGate(url, Date.now());
  check('5. the holder\'s socket, naming its seat after, takes the claim (not refused)', g2.ok && g2.seat === 'bp_jg_holder', g2);
  check('5. ...the squatter\'s socket holds no claim now', room.sessions.get(squat).seat === null);
  const back = await rawJoin(room, 'a2', { id: 'bp_jg_holder', name: 'Holder', phrase: 'p-holder' }, { seat: g2.seat });
  check('5. ...and the holder\'s join comes in', synced(back), back.sent.map((m) => m.type));
}

/* ── 6. the switch ── */
{
  const st = makeStorage();
  const room = await openRoom(st, { joinguard: false });
  const g = await rawJoin(room, 'guest', { id: 'k3j9xq2a', name: 'Guesty' });
  const t = await rawJoin(room, 'thief', { id: 'k3j9xq2a', name: 'Thief', phrase: 'my-own-phrase-1' });
  check('6. `joinguard: false`: the key registers the guest\'s id, as before', synced(t) && has(st, 'auth:k3j9xq2a') && !!g.closed);
  const sq = await rawJoin(room, 'squat', { id: 'bp_zz9_madeup', name: 'Squat', data: { x: 100, y: 100, z: 'town', color: '#ff0000', name: 'Squat' } });
  check('6. ...a guest\'s made-up bp_ id writes its char: row, as before', synced(sq) && has(st, 'char:bp_zz9_madeup'));
  const n = await rawJoin(room, 'noid', { name: 'Nobody' });
  check('6. ...a join with no id is let in, as before', synced(n), n.sent.map((m) => m.type));
}
{
  const room = await openRoom(makeStorage(), { max_players: 2, seathold: true, joinguard: false });
  const a = await rawJoin(room, 'a', { id: 'bp_jg_holder', name: 'Holder', phrase: 'p-holder' });
  await rawJoin(room, 'b', { id: 'bp_jg_other', name: 'Other', phrase: 'p-other' });
  await room.webSocketClose(a); await settle();
  const url = new URL('https://x.test/ws?rf=1&seat=bp_jg_holder');
  const g1 = room._seatGate(url, Date.now());
  room.sessions.set(fakeWs('squat'), { ...baseSession(), phase: 'open', seat: g1.seat });
  const g2 = room._seatGate(url, Date.now());
  check('6. ...and the squatter keeps the claim: the holder\'s socket is refused, as before', !g2.ok, g2);
}

console.log(failed === 0 ? '\nALL PASS (' + passed + ')' : '\n' + failed + ' FAILURE(S)');
process.exit(failed === 0 ? 0 : 1);
