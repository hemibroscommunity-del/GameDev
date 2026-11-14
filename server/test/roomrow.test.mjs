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
 *      book at its pace only (13 rows at most, cost-guard's line).
 *
 * BREAK PROOF (rule 8), each tried by hand, 2026-11-14:
 *   2. roomrow.js rowsOf: `return 1;` for an object of entries      -> FAIL 2
 *   3. persistence.js: drop the `_roomRowRefused('newer')` line     -> FAIL 3
 *   5. roomrow.js: `GAP_MAX_MS: 20` (every gap thrown away)         -> FAIL 5, 6
 *   8. daybook.js: `PACE_MS: 60 * 1000` (the book's pace, card E's; the
 *      row must ride it, never add a row of its own)                -> FAIL 8
 * And in the real runtime (wrangler dev, a phone in the world for 75 s,
 * read through a throwaway admin route): the storage wrapped, 13 rows, one
 * v2 join, the restart and 2,454 tick gaps in the book's `room` part.
 */
import { GameRoom } from '../src/index.js';
import { ROOMROW, rowsOf, roomRowTree } from '../src/roomrow.js';
import { DAYBOOK, bookRead } from '../src/daybook.js';
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
  check('3. ...and counted once, as `newer`', room._roomRow.c.refused[1] === 1 && room._savesRefused().newer === 1, room._savesRefused());
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

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
