/* ═══ v2.3.5606: A SEAT HELD FOR THE PLAYER WHO HAD IT (server/src/seathold.js; card OPS PR 7) ═══
 *
 * Red team RT-2, F1: a deploy (or one phone's blip) handed the seats of the
 * people playing to the people waiting.  This holds, on the shared test room:
 *
 *   1. OFF unless `seathold` is true: a drop holds nothing, the roster is
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
 *      holds those seats RESTART_MS, then not.
 */
import { readFileSync } from 'node:fs';
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
{
  const st = makeStorage();
  const room = await openRoom(st, { max_players: 2 });
  const a = await join(room, fakeWs('a'), 'bp_seat_aaaa');
  const b = await join(room, fakeWs('b'), 'bp_seat_bbbb');
  await room.webSocketClose(a);
  await settle();
  check('1. off unless true: seatHoldOn reads unset, false and 1 as off', !seatHoldOn(room) && !seatHoldOn({ _liveFlags: { seathold: 1 } }) && !seatHoldOn({ _liveFlags: { seathold: false } }) && seatHoldOn({ _liveFlags: { seathold: true } }));
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
  check('4. the socket gate counts the held seats', /this\.sessions\.size >= this\._roomCap\(\) \+ this\._seatHeldCount\(Date\.now\(\)\)/.test(src));
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
  check('5. the roster written once, not again within a minute', puts === 1 && JSON.stringify(st._store.get(SEAT_HOLD.KEY)) === JSON.stringify(['bp_roster_a', 'bp_roster_b']), { puts, roster: st._store.get(SEAT_HOLD.KEY) });
  room._seatRosterTick(t0 + SEAT_HOLD.WRITE_MS);
  await settle();
  check('5. ...and not again a minute later when nothing changed', puts === 1, puts);
  await join(room, fakeWs('c'), 'bp_roster_c');
  room._seatRosterTick(t0 + 2 * SEAT_HOLD.WRITE_MS);
  await settle();
  check('5. ...but when it changed', puts === 2 && st._store.get(SEAT_HOLD.KEY).length === 3, { puts });
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
  const room3 = await openRoom(st);
  await room3._seatHoldLoad(t1);
  check('5. off: a new room reads nothing', room3._seatMem().loaded === false && room3._seatHeldCount(t1) === 0);
}

clock.restore();
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
