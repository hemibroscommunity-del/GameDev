/* THE ROOM'S CEILING ON MESSAGES IN -- v2.3.5545 (server/src/flood.js
 * _floodRoomOver; the red team's RT-1 N5; card K).
 *
 * RT-1: a full room of sockets each inside its own budget (FLOOD.MSG_PER_S,
 * 120) was ~14,400 messages a second, every one taken: on the free plan the
 * day's Durable Object requests in about 2.5 minutes.
 *   1. UNDER THE CEILING nothing changes: 100 sockets at 30 a second (a
 *      phone fighting beside someone) for 10 s, none dropped.
 *   2. PAST IT the heaviest lose their messages first: 60 flooders at 110 a
 *      second and 40 honest phones at 25; the room takes the ceiling and
 *      then each socket its share (at most twice ROOM_MSG_PER_S a second),
 *      the honest phones lose nothing.
 *   3. A FLOODER THAT KEEPS IT UP IS CLOSED: RT-1's 100 sockets at 118 a
 *      second, each closed within 10 s (MSG_CLOSE_AFTER), the room's take
 *      at most twice its ceiling every second.
 *   4. THROUGH THE WIRE: past the ceiling a flooder's message reaches no
 *      handler; a socket under its share is answered.
 *   5. THE SWITCH: `roomceiling: false` takes them all, as before.
 * Break proofs (tried by hand): the share test removed (every message past
 * the ceiling dropped) -> 2 and 4 red (honest phones lose messages); a
 * socket's count never reset by the second -> 1 red. */
import { FLOOD } from '../src/flood.js';
import { makeStorage, openRoom, fakeWs, join, settle } from './testroom.mjs';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS ' + name);
  else { failures++; console.log('FAIL ' + name + ' ' + JSON.stringify(detail === undefined ? {} : detail).slice(0, 400)); }
}

const T0 = Date.UTC(2026, 10, 17, 12, 0, 0);
/* `room.sessions` filled with n bare sessions, as many sockets */
function sockets(room, n, tag) {
  const out = [];
  for (let i = 0; i < n; i++) { const ws = fakeWs(tag + i); const s = { id: 'bp_' + tag + i, phase: 'joined' }; room.sessions.set(ws, s); out.push(s); }
  return out;
}
/* one second of traffic: each socket its `rate` messages, spread over the
   second and interleaved as a room meets them */
function second(room, groups, t) {
  const sent = groups.map(() => 0), taken = groups.map(() => 0), closed = groups.map(() => 0);
  const steps = Math.max(...groups.map((g) => g.rate));
  for (let k = 0; k < steps; k++) {
    const now = t + Math.floor(k * 1000 / steps);
    groups.forEach((g, gi) => {
      if (Math.floor((k + 1) * g.rate / steps) === Math.floor(k * g.rate / steps)) return;   /* its `rate` spread over the second */
      for (const s of g.socks) {
        if (s.closed) continue;
        sent[gi]++;
        const v = room._floodMsgOk(s, now);
        if (v === 'ok') taken[gi]++;
        else if (v === 'close') { s.closed = true; closed[gi]++; }
      }
    });
  }
  return { sent, taken, closed };
}

/* ── 1. under the ceiling ── */
{
  const room = await openRoom(makeStorage());
  const g = { socks: sockets(room, 100, 'h'), rate: 30 };
  let sent = 0, taken = 0;
  for (let i = 0; i < 10; i++) { const r = second(room, [g], T0 + i * 1000); sent += r.sent[0]; taken += r.taken[0]; }
  check('1: 100 sockets at 30 a second (3,000, under the ceiling) for 10 s: none dropped', sent === 30000 && taken === sent, { sent, taken });
}

/* ── 2. past it ── */
{
  const room = await openRoom(makeStorage());
  const flood = { socks: sockets(room, 60, 'f'), rate: 110 };
  const honest = { socks: sockets(room, 40, 'h'), rate: 25 };
  let worst = 0, hs = 0, ht = 0;
  for (let i = 0; i < 5; i++) {
    const r = second(room, [flood, honest], T0 + i * 1000);
    worst = Math.max(worst, r.taken[0] + r.taken[1]);
    hs += r.sent[1]; ht += r.taken[1];
  }
  check('2: 60 flooders at 110 a second and 40 phones at 25 (7,600): the room takes at most its ceiling and then each socket its share (twice the ceiling)', worst <= 2 * FLOOD.ROOM_MSG_PER_S && worst < 6000, { worst, ceiling: FLOOD.ROOM_MSG_PER_S });
  check('2: the honest phones, each under its share (40), lose nothing', hs === 5000 && ht === hs, { hs, ht });
}

/* ── 3. RT-1's flood ── */
{
  const room = await openRoom(makeStorage());
  const flood = { socks: sockets(room, 100, 'r'), rate: 118 };
  let worst = 0, closed = 0, secs = 0;
  for (let i = 0; i < 12 && closed < 100; i++) {
    const r = second(room, [flood], T0 + i * 1000);
    worst = Math.max(worst, r.taken[0]);
    closed += r.closed[0]; secs = i + 1;
  }
  check('3: RT-1\'s 100 sockets at 118 a second (11,800): the room takes at most twice its ceiling', worst <= 2 * FLOOD.ROOM_MSG_PER_S, { worst });
  check('3: ...and every one is closed within 10 s (MSG_CLOSE_AFTER)', closed === 100 && secs <= 10, { closed, secs });
}

/* ── 4. through the wire ── */
{
  const room = await openRoom(makeStorage());
  const ws = fakeWs('w1'); await join(room, ws, 'bp_wire1');
  const ws2 = fakeWs('w2'); await join(room, ws2, 'bp_wire2');
  const me = room.sessions.get(ws), other = room.sessions.get(ws2);
  const reached = [];
  room._handleHeapBurn = (session) => { reached.push(session.id); return 0; };
  const sec = Math.floor(Date.now() / 1000);
  /* the room past its ceiling this second, one socket past its share */
  room._roomMsgWin = { sec, n: FLOOD.ROOM_MSG_PER_S + 10 };
  me.roomSec = sec; me.roomN = FLOOD.ROOM_MSG_PER_S;
  other.roomSec = sec; other.roomN = 0;
  await room.webSocketMessage(ws, JSON.stringify({ type: 'heap_burn' })); await settle();
  await room.webSocketMessage(ws2, JSON.stringify({ type: 'heap_burn' })); await settle();
  check('4: past the ceiling, a socket over its share reaches no handler; one under it does', Math.floor(Date.now() / 1000) !== sec || (reached.length === 1 && reached[0] === 'bp_wire2'), reached);
}

/* ── 5. the switch ── */
{
  const room = await openRoom(makeStorage(), { roomceiling: false });
  const flood = { socks: sockets(room, 60, 'f'), rate: 110 };
  const r = second(room, [flood], T0);
  check('5: `roomceiling: false`: 6,600 in a second, all taken (each inside its own budget), as before', r.taken[0] === 6600, r);
}

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
