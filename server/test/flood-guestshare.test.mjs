/* ═══ v2.3.5729: A GUEST'S SHARE, AND A PLAYED CHARACTER'S SEAT (card K2 PR 10; `guestshare`) ═══
 *
 * The 120 places were anyone's who knocked first: a guest costs a script
 * nothing, eight addresses (or one IPv6 line) could hold the room, and a
 * played character waited outside.  This holds, on the shared test room:
 *
 *   1. the reader: on with no flag, off only with `guestshare: false`; the
 *      guests' places half the cap (60 of 120), at least one;
 *   2. a guest past its share is refused room_full (close 4009) and leaves
 *      nothing stored; a keyed player still comes in;
 *   3. a played character at a full room: the gate lets a spare socket in
 *      while a guest is idle, and its join takes the NEWEST idle guest's
 *      seat (that guest told room_full, closed 4009, out of the room); an
 *      active guest is never moved, and with none idle the gate holds at
 *      the cap;
 *   4. on a spare socket a wrong key, a fresh character and a guest are
 *      refused room_full, and no guest is moved;
 *   5. with `seathold` on too, the played character's join reaches its key
 *      check and takes the idle guest's seat;
 *   6. an IPv6 /48 holds at most IP48.TIMES the line (64 at the defaults),
 *      across its /56s, and each address refusal is counted for the owner's
 *      overview (`floodTally.ip`);
 *   7. `guestshare: false`: guests past the share come in, no spare socket,
 *      no guest moved, the /48 not counted;
 *   8. (v2.3.5732) past the cap with no guest idle -- no spare socket open --
 *      a join is not this door's: a played character's and a fresh one's
 *      come in as before (CS's report: seat-hold with `seathold` off).
 *
 * Red on main (v2.3.5728): 1, 2, 3, 4, 5 and 6 (none of it is there). */
import { makeStorage, openRoom, fakeWs, baseSession, settle } from './testroom.mjs';
import * as FL from '../src/flood.js';
import * as SH from '../src/seathold.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 500))); }
}
const { ip48Key, IP48 } = FL;
const GS = SH.GUEST_SHARE || { SPARE: 4, IDLE_MS: 60000 };
const synced = (ws) => ws.sent.some((m) => m && m.type === 'state_sync');
const fullSaid = (ws) => ws.sent.find((m) => m && m.type === 'room_full');
const rejected = (ws) => ws.sent.find((m) => m && m.type === 'join_rejected');
const inRoom = (room, id) => [...room.sessions.values()].some((s) => s.id === id);
const URL0 = new URL('https://x.test/ws?rf=1');

/* a join on a socket opened by hand; no phrase is a guest's */
async function joinAs(room, label, id, phrase) {
  const ws = fakeWs(label);
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: label, ...(phrase ? { phrase } : {}),
    protocolVersion: 2, ws: [1, 5], data: { x: 100, y: 100, z: 'town' } }));
  await settle();
  return ws;
}
/* a character with a record: made once (its key), then gone */
async function made(room, id, phrase) {
  const ws = await joinAs(room, 'mk', id, phrase);
  await room.webSocketClose(ws);
  await settle();
}
const idle = (room, id) => { for (const s of room.sessions.values()) if (s.id === id) s.lastRecv = Date.now() - GS.IDLE_MS - 1000; };
const gateOk = (room) => !!(room._seatGate && room._seatGate(URL0, Date.now()).ok);

/* ── 1. the reader ── */
{
  const a = await openRoom(makeStorage());
  const b = await openRoom(makeStorage(), { guestshare: false });
  const c = await openRoom(makeStorage(), { max_players: 1 });
  check('1. `guestshare` is on with no flag', typeof a._guestShareOn === 'function' && a._guestShareOn() === true);
  check('1. ...off with `guestshare: false`', typeof b._guestShareOn === 'function' && b._guestShareOn() === false);
  check('1. the guests\' places: 60 of 120, and at least one', typeof a._guestCap === 'function' && a._guestCap() === 60 && c._guestCap() === 1);
}

/* ── 2. a guest past its share ── */
{
  const st = makeStorage();
  const room = await openRoom(st, { max_players: 4 });   /* guests: 2 */
  const g1 = await joinAs(room, 'g1', 'bp_gs_guest1');
  const g2 = await joinAs(room, 'g2', 'bp_gs_guest2');
  check('2. two guests come in (the share of a cap of 4)', synced(g1) && synced(g2));
  const before = [...st._store.keys()].filter((k) => k.includes('bp_gs_guest3')).length;
  const g3 = await joinAs(room, 'g3', 'bp_gs_guest3');
  check('2. a third guest is refused room_full, closed 4009', !!fullSaid(g3) && !synced(g3) && g3.closed && g3.closed.code === 4009, { sent: g3.sent.map((m) => m.type), closed: g3.closed });
  check('2. ...out of the room, and nothing of it stored', !inRoom(room, 'bp_gs_guest3') && [...st._store.keys()].filter((k) => k.includes('bp_gs_guest3')).length === before);
  const k = await joinAs(room, 'k', 'bp_gs_keyed1', 'p-keyed1');
  check('2. a keyed player still comes in', synced(k), k.sent.map((m) => m.type));
}

/* ── 3. a played character at a full room ── */
{
  /* v2.3.6000 (card CS): `seathold` is on by default now; `made` drops the
     played character, whose seat would be held a minute: this section is the
     guests' share, so the hold is thrown off (§5 plays the two together) */
  const room = await openRoom(makeStorage(), { max_players: 4, seathold: false });   /* guests: 2 */
  await made(room, 'bp_gs_played', 'p-played');
  const g1 = await joinAs(room, 'g1', 'bp_gs_ga');
  const g2 = await joinAs(room, 'g2', 'bp_gs_gb');
  const k = await joinAs(room, 'k', 'bp_gs_kk', 'p-kk');
  const k2 = await joinAs(room, 'k2', 'bp_gs_kl', 'p-kl');
  check('3. the room full: two guests and two keyed players in 4', synced(g1) && synced(g2) && synced(k) && synced(k2) && room.sessions.size === 4);
  check('3. no guest idle: the gate holds at the cap', !gateOk(room));
  idle(room, 'bp_gs_ga'); idle(room, 'bp_gs_gb');
  check('3. a guest idle: the gate lets a spare socket in', gateOk(room));
  const p = await joinAs(room, 'p', 'bp_gs_played', 'p-played');
  check('3. the played character comes in', synced(p) && inRoom(room, 'bp_gs_played'), p.sent.map((m) => m.type));
  check('3. ...in the NEWEST idle guest\'s seat: told room_full, closed 4009, out of the room', !!fullSaid(g2) && g2.closed && g2.closed.code === 4009 && !inRoom(room, 'bp_gs_gb'), { sent: g2.sent.map((m) => m.type).slice(-3), closed: g2.closed });
  check('3. ...the other guest stays, and the room is at its cap', inRoom(room, 'bp_gs_ga') && !fullSaid(g1) && room.sessions.size === 4, room.sessions.size);
}
{
  const room = await openRoom(makeStorage(), { max_players: 2, seathold: false });   /* v2.3.6000: as above (with the hold, the played character's own seat lets it in: §5) */
  await made(room, 'bp_gs_played', 'p-played');
  const g1 = await joinAs(room, 'g1', 'bp_gs_ga');
  const k = await joinAs(room, 'k', 'bp_gs_kk', 'p-kk');
  void k;
  /* the guest active: no spare socket, so the gate holds at the cap; a join
     that came past it another way (as here, by hand) moves no guest
     (v2.3.5732: and is not this door's: see 8) */
  check('3. an active guest: no spare socket (the gate holds at the cap)', !gateOk(room));
  const p = await joinAs(room, 'p', 'bp_gs_played', 'p-played');
  check('3. ...and an active guest is never moved', inRoom(room, 'bp_gs_ga') && !fullSaid(g1), p.sent.map((m) => m.type));
}

/* ── 4. on a spare socket: a wrong key, a fresh character, a guest ── */
{
  const st4 = makeStorage();
  const room = await openRoom(st4, { max_players: 2, seathold: false });   /* v2.3.6000 (card CS): the made character's held seat would refuse these itself (§5 plays the two together) */
  await made(room, 'bp_gs_played', 'p-played');
  const g1 = await joinAs(room, 'g1', 'bp_gs_ga');
  await joinAs(room, 'k', 'bp_gs_kk', 'p-kk');
  idle(room, 'bp_gs_ga');
  const wrong = await joinAs(room, 'w', 'bp_gs_played', 'p-not-the-key');
  check('4. a wrong key on a spare socket moves no guest', !!rejected(wrong) && inRoom(room, 'bp_gs_ga') && !fullSaid(g1), wrong.sent.map((m) => m.type));
  const fresh = await joinAs(room, 'f', 'bp_gs_fresh', 'p-fresh');
  check('4. a fresh character on a spare socket is refused room_full, no guest moved', !!fullSaid(fresh) && !synced(fresh) && inRoom(room, 'bp_gs_ga'), fresh.sent.map((m) => m.type));
  /* sitting 43's F2: decided before the key's check, which writes a new
     character's auth: row */
  check('4. ...and nothing is written for it (no auth: row)', !st4._store.has('auth:bp_gs_fresh'), [...st4._store.keys()].filter((k) => k.includes('bp_gs_fresh')));
  const fresh2 = await joinAs(room, 'f2', 'bp_gs_fresh', 'p-fresh');
  check('4. ...so its next knock is a fresh character\'s again: refused, no guest moved', !!fullSaid(fresh2) && !synced(fresh2) && inRoom(room, 'bp_gs_ga') && !st4._store.has('auth:bp_gs_fresh'), fresh2.sent.map((m) => m.type));
  const g = await joinAs(room, 'g', 'bp_gs_gz');
  check('4. a guest on a spare socket is refused room_full, no guest moved', !!fullSaid(g) && !synced(g) && inRoom(room, 'bp_gs_ga'), g.sent.map((m) => m.type));
}

/* ── 5. with `seathold` on too ── */
{
  const room = await openRoom(makeStorage(), { max_players: 2, seathold: true });
  await made(room, 'bp_gs_played', 'p-played');
  room._seatMem().held.clear();   /* the character's own hold from its making, run out */
  const g1 = await joinAs(room, 'g1', 'bp_gs_ga');
  await joinAs(room, 'k', 'bp_gs_kk', 'p-kk');
  idle(room, 'bp_gs_ga');
  check('5. seathold on: the gate lets a spare socket in while a guest is idle', gateOk(room));
  const p = await joinAs(room, 'p', 'bp_gs_played', 'p-played');
  check('5. ...and the played character takes the idle guest\'s seat', synced(p) && !!fullSaid(g1) && !inRoom(room, 'bp_gs_ga'), p.sent.map((m) => m.type));
}

/* ── 6. an IPv6 /48 ── */
{
  const room = await openRoom(makeStorage());
  check('6. ip48Key reads a /48, none for IPv4', typeof ip48Key === 'function' && ip48Key('2001:db8:aa:1::5') === '2001:db8:aa::/48' && ip48Key('203.0.113.7') === null && ip48Key('::ffff:1.2.3.4') === null);
  const LINE = 16, TIMES = (IP48 && IP48.TIMES) || 4;
  /* LINE sockets in each of TIMES /56s of one /48: all held */
  let n = 0;
  for (let b = 0; b < TIMES; b++) for (let i = 0; i < LINE; i++) {
    room.sessions.set(fakeWs('v6' + n), { ...baseSession(), ip: `2001:db8:aa:${(b * 256 + i).toString(16)}::${n + 1}` });
    n++;
  }
  const t0 = room._floodTallyInfo ? (room._floodTallyInfo() || {}).ip || 0 : 0;
  const okNew56 = room._floodIpOk(`2001:db8:aa:${(TIMES * 256).toString(16)}::1`, Date.now());
  check(`6. a /48 holding ${LINE * TIMES} places (${TIMES} lines) refuses one more, from a fresh /56`, okNew56 === false);
  check('6. ...and another /48 is let in', room._floodIpOk('2001:db8:bb:1::1', Date.now()) === true);
  const t1 = room._floodTallyInfo ? (room._floodTallyInfo() || {}).ip : null;
  check('6. each address refusal is counted for the owner (floodTally.ip)', t1 === t0 + 1, { t0, t1 });
}

/* ── 7. the switch ── */
{
  const room = await openRoom(makeStorage(), { max_players: 4, guestshare: false });
  await joinAs(room, 'g1', 'bp_gs_guest1');
  await joinAs(room, 'g2', 'bp_gs_guest2');
  const g3 = await joinAs(room, 'g3', 'bp_gs_guest3');
  check('7. `guestshare: false`: a third guest comes in, as before', synced(g3));
  await joinAs(room, 'g4', 'bp_gs_guest4');
  idle(room, 'bp_gs_guest4');
  check('7. ...no spare socket past the cap', !gateOk(room));
  let n = 0;
  for (let b = 0; b < 4; b++) for (let i = 0; i < 16; i++) { room.sessions.set(fakeWs('w' + n), { ...baseSession(), ip: `2001:db8:cc:${(b * 256 + i).toString(16)}::${++n}` }); }
  check('7. ...and the /48 is not counted', room._floodIpOk('2001:db8:cc:400::1', Date.now()) === true);
}

/* ── 8. v2.3.5732: past the cap with no guest idle, a join is not this door's ──
   The gate opens spare sockets only while a guest is idle.  With none idle,
   a join past the cap (a suite's, by hand; a race at the gate) is judged as
   before `guestshare` -- with `seathold` thrown off, seat-hold.test's held
   player was refused room_full here (CS's report). */
{
  const st8 = makeStorage();
  const room = await openRoom(st8, { max_players: 2, seathold: false });
  await made(room, 'bp_gs_back', 'p-back');
  await joinAs(room, 'k1', 'bp_gs_k1', 'p-k1');
  await joinAs(room, 'k2', 'bp_gs_k2', 'p-k2');
  const back = await joinAs(room, 'b', 'bp_gs_back', 'p-back');
  check('8. at the cap with no guest idle, a played character\'s join past it is not refused here (as before)', synced(back) && !fullSaid(back), back.sent.map((m) => m.type).slice(0, 4));
  const fresh = await joinAs(room, 'f', 'bp_gs_new8', 'p-new8');
  check('8. ...nor a fresh character\'s', synced(fresh) && !fullSaid(fresh), fresh.sent.map((m) => m.type).slice(0, 4));
}

console.log(failed === 0 ? '\nALL PASS (' + passed + ')' : '\n' + failed + ' FAILURE(S)');
process.exit(failed === 0 ? 0 : 1);
