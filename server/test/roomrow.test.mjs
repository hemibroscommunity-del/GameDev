/* The room's own row -- v2.3.5124 (server/src/roomrow.js; the shape
 * docs/SHAPES.md part 7; the grand plan's step 1.6, card A's PR 5).
 *
 * The room counts, into the day's book's `room` part: the gap between its
 * ticks (in bins: the reader takes the 95th), every row it writes, the saves
 * refused, its joins by protocol version, and its restarts.  This suite
 * holds:
 *
 *   1. A RESTART is counted once for each room started;
 *   2. ROWS: every put and delete through the room's storage is counted
 *      (a key 1, an object of entries each, a list each), and the caller
 *      still gets the storage's own answer, a refusal included;
 *   3. SAVES REFUSED: a put the storage refused, and a character a newer
 *      worker saved (the join's refusal), each counted once, and read by
 *      card E through _savesRefused;
 *   4. JOINS by protocol version;
 *   5. THE TICK'S GAPS in their bins, and the 95th read back from them;
 *   6. INTO THE BOOK every FLUSH_MS, under the shape's number;
 *   7. THE KILL SWITCH `roomrow: false`: nothing added;
 *   8. WHAT IT COSTS: an awake hour of nothing but the room's row writes the
 *      book at its pace only (13 rows at most, cost-guard's line);
 *   9. THE LAST ONE OUT (v2.3.5124, sitting 4's review): the last leave
 *      writes the book at once (the report that waited, the room's last
 *      counts), after a put already running; nothing when someone is still
 *      in, the room row is off or the book is;
 *  10. ...PACED (v2.3.5124, sitting 5's review): sockets that never join
 *      write nothing; an hour of joins and leaves at most 15 writes; a kick
 *      once, not twice; a write with no turn waits for the next with what
 *      came after; two last-outs in one put never put side by side.
 *
 * BREAK PROOF (rule 8), each tried by hand, 2026-11-14:
 *   2. roomrow.js rowsOf: `return 1;` for an object of entries      -> FAIL 2
 *   3. persistence.js: drop the `_roomRowRefused('newer')` line     -> FAIL 3
 *   5. roomrow.js: `GAP_MAX_MS: 20` (every gap thrown away)         -> FAIL 5, 6
 *   8. daybook.js: `PACE_MS: 60 * 1000` (the book's pace, card E's; the
 *      row must ride it, never add a row of its own)                -> FAIL 8
 *   9. leave.js: drop the `_roomRowLastOut` line                    -> FAIL 9 (3)
 *      roomrow.js bookNow: `return run();` (a put beside the running
 *      one: the first's sums lost, n 2 of 3)                         -> FAIL 9 (2)
 *  10. roomrow.js _roomRowLastOut: drop `!m.owed ||`                -> FAIL 10.1, 10.3
 *      ...: drop the hand's line (no pace)                          -> FAIL 10.2, 10.4
 *      ...: `< 1` for `< (running ? 2 : 1)`                         -> FAIL 10.4 (the third)
 *      the storage's wrapper: drop the `_roomRowSpend` line          -> FAIL 10.2, 10.4
 *      bookNow's run: drop `if (b.putting) return b.putting.then(run, run);` -> FAIL 9, 10.5
 * And in the real runtime (wrangler dev, a phone in the world for 75 s,
 * read through a throwaway admin route): the storage wrapped, 13 rows, one
 * v2 join, the restart and 2,454 tick gaps in the book's `room` part.
 */
import { GameRoom } from '../src/index.js';
import { ROOMROW, rowsOf, roomRowTree } from '../src/roomrow.js';
import { DAYBOOK, bookRead, bookAdd } from '../src/daybook.js';
import { RPG_SCHEMA_VERSION } from '../src/migrations.js';
import { flagNameOk } from '../src/liveops.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 600) : ''); }
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

let NOW = 1_800_000_000_000;
Date.now = () => NOW;

function makeState() {
  const m = new Map();
  const writes = [];
  const clone = (v) => (v === undefined ? undefined : structuredClone(v));
  const st = {
    writes, store: m, refuse: null,
    storage: {
      async get(k) { return clone(m.get(k)); },
      async put(k, v) {
        if (st.refuse && st.refuse(k)) throw new Error('put refused');
        if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) { writes.push(kk); m.set(kk, clone(vv)); } return; }
        writes.push(k); m.set(k, clone(v));
      },
      async delete(k) {
        if (Array.isArray(k)) { for (const x of k) { writes.push(x); m.delete(x); } return k.length; }
        writes.push(k); return m.delete(k);
      },
      async list(o) {
        let keys = [...m.keys()].filter((k) => !o?.prefix || k.startsWith(o.prefix)).sort();
        if (o?.startAfter) keys = keys.filter((k) => k > o.startAfter);
        if (o?.reverse) keys.reverse();
        if (o?.limit) keys = keys.slice(0, o.limit);
        const r = new Map();
        for (const k of keys) r.set(k, clone(m.get(k)));
        return r;
      },
    },
    getWebSockets: () => [], acceptWebSocket: () => {},
  };
  return st;
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => new Response('{}') }) } };
const fakeWs = () => ({ sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() { this.closed = true; } });
const settle = () => new Promise((r) => setTimeout(r, 15));

function makeRoom(state) {
  const st = state || makeState();
  const room = new GameRoom(st, mockEnv);
  let tickFn = null;
  const real = globalThis.setInterval;
  globalThis.setInterval = (fn, ms) => { if (ms === room.TICK_RATE && !tickFn) { tickFn = fn; return 1; } return real(fn, ms); };
  room.startTickLoop();
  globalThis.setInterval = real;
  room._liveFlags = {};
  return { room, state: st, tick: () => tickFn() };
}
async function join(room, id, v) {
  const ws = fakeWs();
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: id, ...(v === 2 ? { protocolVersion: 2 } : {}), ws: [1, 5], data: { x: 0, y: 0, z: 'town', name: id } }));
  await settle();
  return ws;
}
const roomPart = async (room) => {
  if (room._daybook && room._daybook.putting) await room._daybook.putting;
  const r = await bookRead(room, 1);
  return r.ok && r.days[0] ? r.days[0].room : null;
};

/* ── 1. A RESTART ── */
{
  const { room } = makeRoom();
  check('1. a room started counts one restart', room._roomRow.c.restarts === 1, room._roomRow.c);
  room._roomRowStart(NOW);
  check('1. ...and its storage is wrapped once, however often it starts', room.state.storage.__btRowsCounted === true && room._roomRow.c.restarts === 2);
}

/* ── 2. ROWS ── */
{
  const { room, state } = makeRoom();
  const st = room.state.storage;
  const r0 = room._roomRow.c.rows.slice();
  await st.put('a:1', { x: 1 });
  await st.put({ 'b:1': 1, 'b:2': 2, 'b:3': 3 });
  const got = await st.get('b:2');
  const d = await st.delete(['b:1', 'b:2']);
  await st.delete('a:1');
  const r1 = room._roomRow.c.rows;
  check('2. puts counted: a key 1, an object of entries each (4)', r1[0] - r0[0] === 4, { r0, r1 });
  check('2. deletes counted: a list each, a key 1 (3)', r1[1] - r0[1] === 3, { r0, r1 });
  check('2. the caller gets the storage\'s own answers (what was put, how many deleted)', got === 2 && d === 2 && !state.store.has('b:2'));
  check('2. rowsOf', rowsOf('k') === 1 && rowsOf(['a', 'b']) === 2 && rowsOf({ a: 1, b: 2, c: 3 }) === 3 && rowsOf(null) === 0);
}

/* ── 3. SAVES REFUSED ── */
{
  const { room, state } = makeRoom();
  state.refuse = (k) => typeof k === 'string' && k.startsWith('rpg:');
  let threw = false;
  try { await room.state.storage.put('rpg:bp_x', { coins: 1 }); } catch (e) { threw = true; }
  await settle();
  check('3. a put the storage refused still throws to its caller', threw === true);
  check('3. ...and is counted as a save refused', room._roomRow.c.refused[0] === 1 && room._savesRefused().put === 1 && room._savesRefused().lastAt === NOW, room._roomRow.c.refused);
  /* the rpg save swallows its own refusal (persistence.js _saveRpg): counted all the same */
  room.playerState.bp_x = { coins: 5, inventory: {} };
  await room._saveRpg('bp_x', room.playerState.bp_x);
  await settle();
  check('3. the character\'s save, whose refusal _saveRpg swallows, is counted all the same', room._savesRefused().put === 2, room._savesRefused());
  state.refuse = null;
  /* a character a newer worker saved: the join refuses it on this rolled-back one */
  state.store.set('rpg:bp_newer', { coins: 3, _v: RPG_SCHEMA_VERSION + 1 });
  const ws = await join(room, 'bp_newer', 2);
  check('3. a newer worker\'s character: the join refused (the socket closed, no state_sync)', ws.closed === true && !ws.sent.some((m) => m.type === 'state_sync'));
  /* v2.3.5124: the refused socket was the room's last one out, so its
     counts went into the book with it (THE LAST ONE OUT): read both */
  const inBook = await roomPart(room);
  const newer = room._roomRow.c.refused[1] + ((inBook && inBook['1'] && inBook['1'].refused) ? inBook['1'].refused[1] : 0);
  check('3. ...and counted once, as `newer`', newer === 1 && room._savesRefused().newer === 1, { newer, s: room._savesRefused() });
}

/* ── 4. JOINS by protocol version ── */
{
  const { room } = makeRoom();
  await join(room, 'bp_j2', 2);
  await join(room, 'bp_j1', 1);
  await join(room, 'bp_j2b', 2);
  check('4. joins counted by their protocol: [v1, v2] = [1, 2]', same(room._roomRow.c.joins, [1, 2]), room._roomRow.c.joins);
}

/* ── 5. THE TICK'S GAPS, and 6. INTO THE BOOK ── */
{
  const { room, tick } = makeRoom();
  room._roomRow.flushedAt = NOW;
  const steps = [];
  for (let i = 0; i < 95; i++) steps.push(23);
  for (let i = 0; i < 5; i++) steps.push(60);
  steps.push(5000);   /* asleep: not a tick's gap */
  tick();
  for (const s of steps) { NOW += s; tick(); }
  const c = room._roomRow.c;
  const at = (ms) => { let i = 0; while (i < ROOMROW.GAP_EDGES.length && ms >= ROOMROW.GAP_EDGES[i]) i++; return i; };
  check('5. a hundred gaps in their bins (95 of 23 ms, 5 of 60); a sleep of 5 s is not one',
    c.ticks === 100 && c.gap[at(23)] === 95 && c.gap[at(60)] === 5, c.gap);
  /* the reader's 95th, from the bins: the bin where the count passes 95% */
  const p95 = (bins) => { const n = bins.reduce((a, b) => a + b, 0); let s = 0; for (let i = 0; i < bins.length; i++) { s += bins[i]; if (s >= 0.95 * n) return i; } return -1; };
  check('5. the 95th is read back from the bins (here the 23 ms bin)', p95(c.gap) === at(23));
  NOW += ROOMROW.FLUSH_MS; tick();
  const part = await roomPart(room);
  const row = part && part[String(ROOMROW.V)];
  check('6. every FLUSH_MS the counts go into the book\'s `room` part, under the shape\'s number',
    row && row.ticks >= 100 && row.restarts === 1 && Array.isArray(row.gap) && row.gap.length === ROOMROW.GAP_EDGES.length + 1, part);
  check('6. ...and the room starts counting afresh', room._roomRow.c.ticks === 0 && room._roomRow.c.restarts === 0);
  check('6. the tree keeps only what is not zero, and is a tree the book takes', roomRowTree({ gap: [0], rows: [0, 0], refused: [0, 0], joins: [0, 0], restarts: 0, ticks: 0 }) === null
    && DAYBOOK.PARTS.includes('room'));
}

/* ── 7. THE KILL SWITCH ── */
{
  check('7. `roomrow` is a name POST /flags takes', flagNameOk('roomrow'));
  const { room, tick, state } = makeRoom();
  room._liveFlags = { roomrow: false };
  room._roomRow.flushedAt = NOW;
  tick();
  for (let i = 0; i < 10; i++) { NOW += 23; tick(); }
  NOW += ROOMROW.FLUSH_MS; tick();
  await settle();
  check('7. `roomrow: false`: nothing of the room\'s is added into the book', !(room._daybook && room._daybook.days.size) && !state.writes.some((k) => k.startsWith(DAYBOOK.PREFIX)));
  room._liveFlags = {};
  check('7. nothing set: on', room._roomRowOff() === false);
}

/* ── 8. WHAT IT COSTS ── */
{
  const { room, tick, state } = makeRoom();
  await join(room, 'bp_cost', 2);
  const w0 = state.writes.length;
  const end = NOW + 60 * 60000;
  while (NOW < end) {
    NOW += 110; tick();
    if (room._daybook && room._daybook.putting) await room._daybook.putting;
  }
  const rows = state.writes.slice(w0).filter((k) => k.startsWith(DAYBOOK.PREFIX));
  check(`8. an awake hour of the room's row writes the book ${rows.length} times, at most 13 (the book's pace)`, rows.length >= 1 && rows.length <= 13, rows.length);
}

/* ── 9. THE LAST ONE OUT (v2.3.5124, the gatekeeper's review, sitting 4) ── */
{
  /* the review's own sitting: the room wakes, a phone joins, the row's first
     add (60 s) takes the book's at-once put; a sum added after it (a report)
     waits for the pace -- and the phone leaves before it */
  const t0 = NOW;
  const { room, tick, state } = makeRoom();
  const ws = await join(room, 'bp_last', 2);
  NOW = t0 + 60000; tick();
  if (room._daybook.putting) await room._daybook.putting;
  const firstPut = state.writes.filter((k) => k.startsWith(DAYBOOK.PREFIX)).length;
  NOW = t0 + 62300;
  bookAdd(room, 'dev', { cell: { n: 1 } }, NOW);
  check('9. (the review\'s case) the row\'s first add wrote at once; a report after it waits in memory',
    firstPut === 1 && room._daybook.days.size === 1 && !room._daybook.putting, { firstPut, waiting: room._daybook.days.size });
  NOW = t0 + 100000;
  await room.webSocketClose(ws, 1000, 'bye', true);
  if (room._daybook.putting) await room._daybook.putting;
  const day = (await bookRead(room, 1)).days[0];
  const stored = state.store.get(DAYBOOK.PREFIX + day.day);
  check('9. the last one out writes the book at once: the report that waited is stored, no tick needed',
    !!stored && stored.dev && stored.dev.cell && stored.dev.cell.n === 1, stored && stored.dev);
  check('9. ...with the room\'s last counts (its leave flushed the row: the join\'s rows after the first add)',
    !!stored.room && !!stored.room['1'] && !room._daybook.days.size && room._roomRow.flushedAt === NOW, stored.room);
  check('9. ...in one put (and the tick is stopped)', state.writes.filter((k) => k.startsWith(DAYBOOK.PREFIX)).length === 2 && !room.tickInterval);
}
{
  /* a put already running when the last leaves: the leave's put runs after
     it, so neither's sums are lost (two read-add-puts of a day side by side
     would keep only the second's) */
  const { room, state } = makeRoom();
  await join(room, 'bp_last2', 2);
  if (room._daybook && room._daybook.putting) await room._daybook.putting;
  if (room._daybook) room._daybook.lastPut = 0;
  const w0 = state.writes.length;
  bookAdd(room, 'dev', { a: { n: 1 } }, NOW);   /* at once */
  const running = room._daybook.putting;
  bookAdd(room, 'dev', { a: { n: 2 } }, NOW);   /* waits for the pace */
  const last = room._roomRowLastOut(NOW);
  check('9. a put running at the last out: its put waits for it, never runs beside it', !!running && !!last && last !== running && room._daybook.putting === running);
  await last;
  const k = state.writes.slice(w0).filter((x) => x.startsWith(DAYBOOK.PREFIX));
  const rec = state.store.get(k[k.length - 1]);
  check('9. ...and both are written: 1 + 2, in two puts', k.length === 2 && rec.dev.a.n === 3 && !room._daybook.putting, { k, dev: rec && rec.dev });
  /* the door's memory this file reads (roomrow.js bookNow): fails when card
     E's shape moves, so the last-out write is never silently lost */
  const mem = room._daybook;
  check('9. the book\'s memory as roomrow.js reads it: `days` a Map, `putting`, `lastPut`',
    !!mem && mem.days instanceof Map && 'putting' in mem && typeof mem.lastPut === 'number', mem && Object.keys(mem));
}
{
  /* someone still in, the room row off (v2.3.5124, sitting 5: its kill
     switch stops the last-out write too), the book off: no write */
  const { room, state } = makeRoom();
  const a = await join(room, 'bp_last3', 2);
  const b = await join(room, 'bp_last4', 2);
  const bookRows = () => state.writes.filter((k) => k.startsWith(DAYBOOK.PREFIX)).length;
  await room.webSocketClose(a, 1000, 'bye', true);
  check('9. someone still in: no last-out write', bookRows() === 0 && !(room._daybook && room._daybook.putting));
  room._liveFlags = { roomrow: false };
  bookAdd(room, 'dev', { x: { n: 1 } }, NOW);   /* a report waiting (the add's own at-once put aside) */
  if (room._daybook.putting) await room._daybook.putting;
  const r0 = bookRows();
  bookAdd(room, 'dev', { x: { n: 1 } }, NOW);
  await room.webSocketClose(b, 1000, 'bye', true);
  check('9. `roomrow: false`: the last one out writes nothing, a join owed and a report waiting', bookRows() === r0 && !room._daybook.putting && room._roomRow.owed === true);
  room._liveFlags = { daybook: false };
  const c = await join(room, 'bp_last5', 2);
  await room.webSocketClose(c, 1000, 'bye', true);
  check('9. the book switched off (`daybook: false`): the last out writes nothing', bookRows() === r0 && !room._daybook.putting);
}

/* ── 10. THE LAST ONE OUT, PACED (v2.3.5124, sitting 5's review) ── */
const bookRowsOf = (state, from = 0) => state.writes.slice(from).filter((k) => k.startsWith(DAYBOOK.PREFIX)).length;
const drain = async (room) => { for (let i = 0; i < 4 && room._daybook && room._daybook.putting; i++) await room._daybook.putting; };
{
  /* the review's probe: sockets opened and closed into an empty room, none
     joining -- each wrote the day's whole record */
  const { room, state } = makeRoom();
  const w0 = state.writes.length;
  for (let i = 0; i < 100; i++) {
    NOW += 3000;
    const ws = fakeWs();
    room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: NOW });
    await room.webSocketClose(ws, 1000, 'bye', true);
    await drain(room);
  }
  check(`10.1 a hundred sockets opened and closed into an empty room, none joining: ${bookRowsOf(state, w0)} book rows (none)`, bookRowsOf(state, w0) === 0);
}
{
  /* a storm of joins and leaves for an hour: at the book's own pace on the
     whole (the line is a number, not the constants: rule 8) */
  const { room, state } = makeRoom();
  const w0 = state.writes.length;
  const end = NOW + 60 * 60000;
  let n = 0;
  while (NOW < end) {
    NOW += 9000;
    const ws = await join(room, 'bp_storm', 2);
    NOW += 1000;
    await room.webSocketClose(ws, 1000, 'bye', true);
    await drain(room);
    n++;
  }
  const rows = bookRowsOf(state, w0);
  check(`10.2 an hour of joins and leaves (${n}, ten seconds apart) writes the book ${rows} times, at most 15 (three in hand, one each 5 minutes)`, rows >= 3 && rows <= 15, rows);
}
{
  /* a kick: its own leave, then the runtime's close after it -- one write */
  const { room, state } = makeRoom();
  const ws = await join(room, 'bp_kick', 2);
  const w0 = state.writes.length;
  await room._playerLeaves(ws, 'kick');
  await drain(room);
  await room.webSocketClose(ws, 1000, 'bye', true);
  await drain(room);
  check(`10.3 a kick that empties the room writes the book once, not twice (${bookRowsOf(state, w0)})`, bookRowsOf(state, w0) === 1);
}
{
  /* a write with no turn keeps waiting: owed, and taken at the next turn
     with what came after it */
  const { room, state } = makeRoom();
  for (let i = 0; i < 3; i++) { NOW += 5000; const ws = await join(room, 'bp_turn', 2); await room.webSocketClose(ws, 1000, 'bye', true); await drain(room); }
  const w0 = state.writes.length;
  NOW += 5000;
  let ws = await join(room, 'bp_turn', 2);
  bookAdd(room, 'dev', { cellA: { n: 1 } }, NOW);
  await room.webSocketClose(ws, 1000, 'bye', true);
  await drain(room);
  check('10.4 three sittings\' writes in hand spent: a fourth\'s last out has no turn, writes nothing, and stays owed', bookRowsOf(state, w0) === 0 && room._roomRow.owed === true, { rows: bookRowsOf(state, w0), owed: room._roomRow.owed });
  NOW += ROOMROW.LASTOUT.EVERY_MS;
  ws = await join(room, 'bp_turn', 2);
  NOW += 20000;
  await room.webSocketClose(ws, 1000, 'bye', true);
  await drain(room);
  const rec = state.store.get(state.writes.filter((k) => k.startsWith(DAYBOOK.PREFIX)).pop());
  check('10.4 ...a pace later its turn comes: one write, carrying the report that waited', bookRowsOf(state, w0) === 1 && rec && rec.dev && rec.dev.cellA && rec.dev.cellA.n === 1 && room._roomRow.owed === false, { rows: bookRowsOf(state, w0), dev: rec && rec.dev });
  /* a report a pace later starts the door's own put; the player leaving
     while it runs: that put spends the turn, the last one out waits (one
     write, not two) */
  NOW += ROOMROW.LASTOUT.EVERY_MS;
  const w1 = state.writes.length;
  ws = await join(room, 'bp_turn', 2);
  bookAdd(room, 'dev', { cellB: { n: 1 } }, NOW);
  const running = room._daybook.putting;
  await room.webSocketClose(ws, 1000, 'bye', true);
  await drain(room);
  const rec2 = state.store.get(state.writes.filter((k) => k.startsWith(DAYBOOK.PREFIX)).pop());
  check('10.4 a leave while the door\'s own put runs (its turn spent as it lands): one write, the report in it, the rest owed',
    !!running && bookRowsOf(state, w1) === 1 && rec2 && rec2.dev && rec2.dev.cellB && rec2.dev.cellB.n === 1 && room._roomRow.owed === true, { rows: bookRowsOf(state, w1), owed: room._roomRow.owed });
}
{
  /* two last-outs inside one running put, across a UTC midnight (two days
     waiting): never two puts of the book side by side */
  const { room, state } = makeRoom();
  await join(room, 'bp_mid', 2);
  let inFlight = 0, most = 0;
  const get = state.storage.get;
  state.storage.get = async function (k) {
    if (typeof k === 'string' && k.startsWith(DAYBOOK.PREFIX)) { inFlight++; most = Math.max(most, inFlight); await settle(); inFlight--; }
    return get.call(this, k);
  };
  const b = room._daybook || (bookAdd(room, 'dev', { z: { n: 0 } }, NOW), room._daybook);
  await drain(room);
  b.lastPut = NOW + 86400000;   /* the door's own pace starts nothing here */
  bookAdd(room, 'dev', { d1: { n: 1 } }, NOW);
  bookAdd(room, 'dev', { d2: { n: 1 } }, NOW + 86400000);
  let release;
  const running = new Promise((r) => { release = r; }).finally(() => { if (b.putting === running) b.putting = null; });
  b.putting = running;
  room._roomRow.owed = true;
  const l1 = room._roomRowLastOut(NOW);
  room._roomRow.owed = true;
  const l2 = room._roomRowLastOut(NOW + 1);
  release();
  await l1; await l2; await drain(room);
  const days = state.writes.filter((k) => k.startsWith(DAYBOOK.PREFIX));
  check(`10.5 two last-outs inside one running put, two days waiting: one put of the book at a time (most ${most}), both days written`,
    !!l1 && !!l2 && most === 1 && new Set(days).size === 2, { most, days });
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
