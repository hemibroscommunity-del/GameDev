/* ═══ v2.3.5606: A SEAT HELD FOR THE PLAYER WHO HAD IT (server/src/seathold.js; card OPS PR 7) ═══
 *
 * Red team RT-2, F1: a deploy (or one phone's blip) handed the seats of the
 * people playing to the people waiting.  This holds, on the shared test room:
 *
 *   1. OFF with `seathold: false` (ON by default since v2.3.6000, card CS):
 *      a drop holds nothing, the roster is
 *      never written, a stranger's join at the cap is not refused here (the
 *      socket gate does it, as before);
 *   2. on: a joined player's drop holds their seat; at the cap (joined +
 *      held), a stranger's join is refused with room_full and close 4009,
 *      and leaves NOTHING stored; the held player's own join comes in;
 *   3. a held seat runs out after HOLD_MS; a kick, the AFK sweep and a
 *      refused join hold none; a held id joined again is not counted twice;
 *   4. the socket gate counts the held seats (the fetch line), and the held
 *      map is capped at MAX;
 *   5. a restart: the roster is written at most once every WRITE_MS and only
 *      when it changed; a new room on the same storage reads it once and
 *      holds those seats RESTART_MS, then not;
 *   v2.3.5612, the mend (sitting 19b's review):
 *   6. the gate tells a holder from a stranger: a socket naming a held seat
 *      (`?seat=`) comes in on the held slots, one socket a seat; a stranger
 *      only while the room's sockets and the held seats are under the cap;
 *      off, the cap as before, the seat not read;
 *   7. a socket let in on a seat joins as that id or is refused (the hold
 *      not used up); its own id comes in;
 *   8. two strangers at once cannot pass the cap: a join counts the joins in
 *      flight; the refusal's count is the seats taken;
 *   9. the roster keeps the held seats to their ends (a second restart
 *      within the hold keeps them, an old array roster is still read), and
 *      is written as the room empties, so a room started after the holds
 *      ran out holds nobody.
 */
import { readFileSync } from 'node:fs';
import { findIn } from '../../tools/guards/lib/filesOf.mjs';
import { SEAT_HOLD, seatHoldOn } from '../src/seathold.js';
import { makeStorage, openRoom, fakeWs, join, settle, seededClock } from './testroom.mjs';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

const clock = seededClock().install();
const synced = (ws) => ws.sent.some((m) => m && m.type === 'state_sync');
const fullSaid = (ws) => ws.sent.find((m) => m && m.type === 'room_full');
const keysOf = (st, id) => [...st._store.keys()].filter((k) => k.includes(id));

/* ── 1. off ── */
/* v2.3.6000 (card CS): ON by default (the owner, 2026-11-17: "I think turn
   all of them on then we monitor usage cost"); `seathold: false` turns it off */
{
  const st = makeStorage();
  const room = await openRoom(st, { max_players: 2, seathold: false });
  const a = await join(room, fakeWs('a'), 'bp_seat_aaaa');
  const b = await join(room, fakeWs('b'), 'bp_seat_bbbb');
  await room.webSocketClose(a);
  await settle();
  check('1. on unless false (v2.3.6000): seatHoldOn reads false as off; unset, true and 1 as on', !seatHoldOn(room) && seatHoldOn({ _liveFlags: { seathold: 1 } }) && !seatHoldOn({ _liveFlags: { seathold: false } }) && seatHoldOn({ _liveFlags: { seathold: true } }) && seatHoldOn({ _liveFlags: {} }));
  check('1. off: a drop holds nothing', room._seatHeldCount(Date.now()) === 0 && room._seatMem().held.size === 0);
  room._seatRosterTick(Date.now() + SEAT_HOLD.WRITE_MS);
  await settle();
  check('1. off: the roster is never written', !st._store.has(SEAT_HOLD.KEY));
  const c = await join(room, fakeWs('c'), 'bp_seat_cccc');
  check('1. off: a stranger\'s join is not refused here (the socket gate does it, as before)', synced(c) && !fullSaid(c), c.sent.map((m) => m.type));
  void b;
}

/* ── 2 and 3. on ── */
{
  const st = makeStorage();
  const room = await openRoom(st, { max_players: 2, seathold: true });
  const a = await join(room, fakeWs('a'), 'bp_seat_aaaa');
  const b = await join(room, fakeWs('b'), 'bp_seat_bbbb');
  check('2. two in, the cap of 2', synced(a) && synced(b) && room._seatJoinedIds().size === 2);
  await room.webSocketClose(a);
  await settle();
  const held = room._seatHeldIds(Date.now());
  check('2. a joined player\'s drop holds their seat', held.size === 1 && held.has('bp_seat_aaaa'), [...held]);
  const before = st._store.size;
  const c = await join(room, fakeWs('c'), 'bp_seat_cccc');
  const said = fullSaid(c);
  check('2. at the cap (1 joined + 1 held), a stranger\'s join is refused with room_full and close 4009',
    !synced(c) && !!said && said.reason === 'full' && said.cap === 2 && said.retryMs >= 5000 && c.closed && c.closed.code === 4009, { sent: c.sent, closed: c.closed });
  check('2. ...and leaves nothing stored (no record, no auth, no device)', keysOf(st, 'bp_seat_cccc').length === 0 && st._store.size === before, keysOf(st, 'bp_seat_cccc'));
  check('2. ...and is no session', ![...room.sessions.values()].some((s) => s && s.id === 'bp_seat_cccc'));
  const a2 = await join(room, fakeWs('a2'), 'bp_seat_aaaa');
  check('2. the held player\'s own join comes in', synced(a2) && !fullSaid(a2), a2.sent.map((m) => m.type));
  check('3. a held id joined again is not counted twice', room._seatHeldCount(Date.now()) === 0);

  /* the hold runs out */
  await room.webSocketClose(a2);
  await settle();
  check('3. (dropped again: held)', room._seatHeldCount(Date.now()) === 1);
  clock.advance(SEAT_HOLD.HOLD_MS + 1);
  check('3. a held seat runs out after HOLD_MS', room._seatHeldCount(Date.now()) === 0);
  const d = await join(room, fakeWs('d'), 'bp_seat_dddd');
  check('3. ...and a stranger then comes in', synced(d), d.sent.map((m) => m.type));

  /* a kick, the AFK sweep: no hold */
  const ws = [...room.sessions.entries()].find(([, s]) => s && s.id === 'bp_seat_dddd')[0];
  await room._playerLeaves(ws, 'kick');
  await settle();
  check('3. a kick holds no seat', room._seatHeldCount(Date.now()) === 0);
  const e = await join(room, fakeWs('e'), 'bp_seat_eeee');
  const wsE = [...room.sessions.entries()].find(([, s]) => s && s.id === 'bp_seat_eeee')[0];
  await room._playerLeaves(wsE, 'afk');
  await settle();
  check('3. the AFK sweep holds no seat', room._seatHeldCount(Date.now()) === 0);
  void e;
}

/* ── 4. the gate and the cap ── */
{
  const src = readFileSync(new URL('../src/index.js', import.meta.url), 'utf8');
  /* (read by system, never by path: tools/guards/lib/filesOf.mjs) */
  const seatLine = findIn('wire', /new WebSocket\(WS_URL \+ \(_ti0\.id \? '&seat=' \+ encodeURIComponent\(_ti0\.id\) : ''\)\)/);
  check('4. the phone names its seat on its socket\'s address (the wire\'s files: wsClient.js, v2.3.5612)', seatLine.length === 1, seatLine);
  check('4. the socket gate is the seat gate (seathold.js _seatGate), its seat carried to the join',
    /const _gate = this\._seatGate\(url, Date\.now\(\)\);\s*if \(!_gate\.ok\)/.test(src) && /if \(_gate\.seat\) this\.sessions\.get\(server\)\.seat = _gate\.seat;/.test(src));
  const room = await openRoom(makeStorage(), { seathold: true });
  for (let i = 0; i < 300; i++) room._seatHoldLeave('bp_many_' + i, Date.now());
  check('4. the held map is capped at MAX (the oldest go first)', room._seatMem().held.size === SEAT_HOLD.MAX && !room._seatMem().held.has('bp_many_0') && room._seatMem().held.has('bp_many_299'));
}

/* ── 5. a restart ── */
{
  const st = makeStorage();
  const room = await openRoom(st, { seathold: true });
  await join(room, fakeWs('a'), 'bp_roster_a');
  await join(room, fakeWs('b'), 'bp_roster_b');
  let puts = 0;
  const put = st.storage.put;
  st.storage.put = function (k, ...rest) { if (k === SEAT_HOLD.KEY) puts++; return put.call(this, k, ...rest); };
  const t0 = Date.now() + SEAT_HOLD.WRITE_MS;
  room._seatRosterTick(t0);
  room._seatRosterTick(t0 + 1000);
  await settle();
  check('5. the roster written once, not again within a minute', puts === 1 && JSON.stringify(st._store.get(SEAT_HOLD.KEY).in) === JSON.stringify(['bp_roster_a', 'bp_roster_b'])   /* v2.3.5612: { v: 2, in, held } */, { puts, roster: st._store.get(SEAT_HOLD.KEY) });
  room._seatRosterTick(t0 + SEAT_HOLD.WRITE_MS);
  await settle();
  check('5. ...and not again a minute later when nothing changed', puts === 1, puts);
  await join(room, fakeWs('c'), 'bp_roster_c');
  room._seatRosterTick(t0 + 2 * SEAT_HOLD.WRITE_MS);
  await settle();
  check('5. ...but when it changed', puts === 2 && st._store.get(SEAT_HOLD.KEY).in.length === 3, { puts });
  st.storage.put = put;

  /* the deploy: a new room on the same storage */
  const room2 = await openRoom(st, { seathold: true });
  const t1 = Date.now();
  await room2._seatHoldLoad(t1);
  const h = room2._seatHeldIds(t1 + 1000);
  check('5. a new room reads the roster once and holds those seats', h.size === 3 && h.has('bp_roster_a') && h.has('bp_roster_c'), [...h]);
  await room2._seatHoldLoad(t1 + 5000);
  check('5. ...read once (a second load holds nothing new)', room2._seatHeldIds(t1 + 1000).size === 3);
  check('5. ...for RESTART_MS, then not', room2._seatHeldIds(t1 + SEAT_HOLD.RESTART_MS + 1).size === 0);
  const room3 = await openRoom(st, { seathold: false });   /* v2.3.6000: off is thrown (on is the default) */
  await room3._seatHoldLoad(t1);
  check('5. off: a new room reads nothing', room3._seatMem().loaded === false && room3._seatHeldCount(t1) === 0);
}

/* ── 6-8. the mend: the gate, the seat's own join, joins in flight ── */
const U = (q) => new URL('https://w/ws?room=brotown-1&rf=1' + (q || ''));
async function joinOn(room, ws, pid, seat) {
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now(), ...(seat ? { seat } : {}) });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id: pid, name: pid.slice(3, 12), phrase: 'p-' + pid,
    protocolVersion: 2, ws: [1, 5], data: { x: 100, y: 100, z: 'town' } }));
  await settle();
  return ws;
}
{
  const st = makeStorage();
  const room = await openRoom(st, { max_players: 2, seathold: true });
  const a = await join(room, fakeWs('a'), 'bp_mend_aaaa');
  await join(room, fakeWs('b'), 'bp_mend_bbbb');
  await room.webSocketClose(a);
  await settle();
  const now = Date.now();
  const g1 = room._seatGate(U(), now);
  check('6. a stranger at the cap (1 in + 1 held) is not let in at the gate', g1.ok === false && g1.seat === null, g1);
  const g2 = room._seatGate(U('&seat=bp_mend_aaaa'), now);
  check('6. a socket naming the held seat is, on the held slots, and carries its seat', g2.ok === true && g2.seat === 'bp_mend_aaaa', g2);
  room.sessions.set(fakeWs('inflight'), { id: null, name: 'Anon', data: {}, seat: 'bp_mend_aaaa' });
  const g3 = room._seatGate(U('&seat=bp_mend_aaaa'), now);
  check('6. ...one socket a seat: a second naming it is a stranger (refused at the cap)', g3.ok === false && g3.seat === null, g3);
  const g4 = room._seatGate(U('&seat=bp_mend_zzzz'), now);
  check('6. a seat nobody holds is a stranger', g4.ok === false && g4.seat === null, g4);
  for (const [w, s2] of room.sessions) if (s2 && s2.seat && !s2.id) room.sessions.delete(w);

  /* 7. the seat's own join */
  const before = st._store.size;
  const x = await joinOn(room, fakeWs('x'), 'bp_mend_xxxx', 'bp_mend_aaaa');
  const sx = fullSaid(x);
  check('7. a socket let in on a seat that joins as another id is refused room_full, 4009', !synced(x) && !!sx && x.closed && x.closed.code === 4009, { sent: x.sent.map((m) => m.type), closed: x.closed });
  check('7. ...writes nothing, and the hold is not used up', st._store.size === before && room._seatHeldIds(Date.now()).has('bp_mend_aaaa'));
  const a2 = await joinOn(room, fakeWs('a2'), 'bp_mend_aaaa', 'bp_mend_aaaa');
  check('7. the seat\'s own id comes in', synced(a2) && !fullSaid(a2) && room._seatHeldCount(Date.now()) === 0, a2.sent.map((m) => m.type));
}
{
  /* 8. two strangers at once */
  const st = makeStorage();
  const room = await openRoom(st, { max_players: 3, seathold: true });
  const a = await join(room, fakeWs('a'), 'bp_two_aaaa');
  await join(room, fakeWs('b'), 'bp_two_bbbb');
  await room.webSocketClose(a);
  await settle();
  check('8. (1 in, 1 held, a cap of 3: one free seat; the gate lets one stranger in)', room._seatGate(U(), Date.now()).ok === true);
  room.sessions.set(fakeWs('s1'), { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });   /* stranger 1, its join in flight */
  const s2 = await joinOn(room, fakeWs('s2'), 'bp_two_ssss');
  const said = fullSaid(s2);
  check('8. a second stranger\'s join counts the first in flight: refused', !synced(s2) && !!said, s2.sent.map((m) => m.type));
  check('8. ...its count is the seats taken (1 in + 1 held), not the sockets', said && said.count === 2 && said.cap === 3, said);
  check('8. off: the gate is the cap as before, the seat not read', (() => { room._liveFlags.seathold = false; const g = room._seatGate(U('&seat=bp_two_aaaa'), Date.now()); room._liveFlags.seathold = true; return g.ok === (room.sessions.size < 3) && g.seat === null; })());
}
{
  /* 9. the roster keeps the holds */
  const st = makeStorage();
  const room = await openRoom(st, { seathold: true });
  const a = await join(room, fakeWs('a'), 'bp_ros_aaaa');
  await join(room, fakeWs('b'), 'bp_ros_bbbb');
  await room.webSocketClose(a);
  await settle();
  const t0 = Date.now() + SEAT_HOLD.WRITE_MS * 3;
  room._seatRosterTick(t0);
  await settle();
  const r = st._store.get(SEAT_HOLD.KEY);
  check('9. the roster: who is in, and the seats held with their ends', r && r.v === 2 && r.in.join() === 'bp_ros_bbbb' && r.held.length === 1 && r.held[0][0] === 'bp_ros_aaaa' && r.held[0][1] > t0, r);
  const room2 = await openRoom(st, { seathold: true });
  await room2._seatHoldLoad(t0 + 1000);
  const h = room2._seatHeldIds(t0 + 1000);
  check('9. a restart within the hold keeps the held seat (and holds who was in)', h.has('bp_ros_aaaa') && h.has('bp_ros_bbbb'), [...h]);
  const end = r.held[0][1];
  check('9. ...the held seat to its own end, not past it', room2._seatHeldIds(end + 1).has('bp_ros_aaaa') === false);
  const room3 = await openRoom(st, { seathold: true });
  await room3._seatHoldLoad(end + SEAT_HOLD.HOLD_MS);
  check('9. a room started after the hold ran out holds no held seat', !room3._seatHeldIds(end + SEAT_HOLD.HOLD_MS).has('bp_ros_aaaa'));
  const st2 = makeStorage();
  st2._store.set(SEAT_HOLD.KEY, ['bp_old_aaaa']);
  const room4 = await openRoom(st2, { seathold: true });
  await room4._seatHoldLoad(Date.now());
  check('9. a roster from before (an array) is still read', room4._seatHeldIds(Date.now() + 1000).has('bp_old_aaaa'));
  /* the room empties: written once more as its tick stops */
  const st3 = makeStorage();
  const room5 = await openRoom(st3, { seathold: true });
  const c = await join(room5, fakeWs('c'), 'bp_empty_cccc');
  room5.tickInterval = room5.tickInterval || setInterval(() => {}, 1e9);
  await room5.webSocketClose(c);
  await settle();
  const r5 = st3._store.get(SEAT_HOLD.KEY);
  check('9. the last one out writes the roster as the tick stops (none in, its seat held to its end)', r5 && r5.v === 2 && r5.in.length === 0 && r5.held.length === 1 && r5.held[0][0] === 'bp_empty_cccc', r5);
  if (room5.tickInterval) { clearInterval(room5.tickInterval); room5.tickInterval = null; }
}

clock.restore();
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
