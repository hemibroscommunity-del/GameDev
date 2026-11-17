/* ═══ v2.3.5722: A JOIN THAT NAMES NO PLACE (card K2 PR 3) ═══
 *
 * The second red team's HIGH 3 (session "Grand plan red team review",
 * proved on the test room): lastplace.js `_placeOnJoin` returned early for a
 * join that named no x/y, before the move clock was set, so that join's
 * first `move` was a first move, judged from nothing: 24,780 to 70,000 px in
 * one step, five of five, where a reconnect naming a place is held to 1,580.
 * This holds:
 *
 *   1. a join naming no place in the Wheel, with nothing remembered: stood
 *      at the Wheel's arrival, and its first far move held to the allowance
 *      (followed on, never taken);
 *   2. the same with a place remembered (a reconnect): stood where the
 *      worker last had them, its first far move held;
 *   3. a join naming no place at all (today's town), then a far move into
 *      the Wheel: judged from the arrival;
 *   4. five of five: the red team's five far first moves, each held;
 *   5. honest phones as before: a rejoin naming its remembered place walks
 *      on exactly; a fresh page's first way into the Wheel at its arrival is
 *      taken; a first-ever join naming its place is taken where it says;
 *   6. `joinplace: false`: the early return, as before (the far first move
 *      taken).
 *
 * Red on main (v2.3.5719): 1, 2, 3 and 4. */
import { GameRoom } from '../src/index.js';
import { MOVE_BUDGET } from '../src/movement.js';
import { LAST_PLACE } from '../src/lastplace.js';
import { WHEEL_ZONE } from '../src/wheelzone.js';
import { wheelTable } from '../src/wheeltables.js';

let T = 1_960_000_000_000;
Date.now = () => T;

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

function makeState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) store.set(kk, vv); } else store.set(k, v); },
      list: async (o) => { const out = new Map(); for (const [k, v] of store) if (!o?.prefix || k.startsWith(o.prefix)) out.set(k, v); return out; },
      delete: async (k) => { if (Array.isArray(k)) { for (const kk of k) store.delete(kk); } else store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
const env = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs() { return { sent: [], closed: null, send(s) { this.sent.push(JSON.parse(s)); }, close(c, r) { this.closed = { code: c, reason: r }; } }; }

/* the allowance a first move gets at the same instant: the budget's burst
   and slack (MOVE_BUDGET), with a little room */
const FULL = MOVE_BUDGET.SPEED_PX * MOVE_BUDGET.BURST_S + MOVE_BUDGET.SLACK_PX;   /* 1,580 */
const HELD = FULL + 50;
const C = wheelTable(5).WHEEL_CENTRE;
const ARR = { x: C[0], y: C[1] + LAST_PLACE.ARRIVAL_DY };
const A = { x: C[0] + 20000, y: C[1] };   /* out in a land */

function room(flags) {
  const r = new GameRoom(makeState(), env);
  r._liveFlags = { movetop: false, ...(flags || {}) };   /* the flat bound's arithmetic, as last-place.test */
  r._saveRpg = () => {}; r._saveRpgVitals = () => {}; r._saveRpgPools = () => {};
  return r;
}
let seq = 0;
const newId = () => 'bp_jp' + (++seq);
/* a join with exactly `data` (no place filled in) */
async function join(r, id, data) {
  const ws = fakeWs();
  r.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: T });
  await r.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'Mover', phrase: 'p-' + id, protocolVersion: 2, ws: [1, 5], data: data || {} }));
  if (r.tickInterval) { clearInterval(r.tickInterval); r.tickInterval = null; }
  return ws;
}
const move = (r, ws, x, y, z) => r.webSocketMessage(ws, JSON.stringify({ type: 'move', x, y, z }));
const ps = (r, id) => r.playerState[id];
const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);

// ── 1. in the Wheel, nothing remembered ──
{
  const r = room();
  const id = newId();
  const ws = await join(r, id, { z: WHEEL_ZONE });
  const p = ps(r, id);
  check('1. a join naming no place in the Wheel is stood at its arrival', p && near(p.x, ARR.x) && near(p.y, ARR.y), p && { x: p.x, y: p.y });
  check('1. ...its move clock set', p && typeof p.lastMoveAt === 'number', p && p.lastMoveAt);
  await move(r, ws, ARR.x + 30000, ARR.y, WHEEL_ZONE);
  const q = ps(r, id);
  check('1. its first move 30,000 px off is held to the allowance (' + HELD + ' px from the arrival), not taken', dist(q, ARR) <= HELD, { moved: Math.round(dist(q, ARR)) });
  check('1. ...and followed on toward it, never refused', !!q._mvFollow, q._mvFollow);
}

// ── 2. a reconnect naming no place ──
{
  const r = room();
  const id = newId();
  let ws = await join(r, id, { x: A.x, y: A.y, z: WHEEL_ZONE });
  await move(r, ws, A.x, A.y, WHEEL_ZONE);
  await r.webSocketClose(ws);
  T += 1000;
  ws = await join(r, id, { z: WHEEL_ZONE });
  const p = ps(r, id);
  check('2. a reconnect naming no place is stood where the worker had them', p && near(p.x, A.x) && near(p.y, A.y), p && { dx: p.x - A.x, dy: p.y - A.y });
  await move(r, ws, A.x + 40000, A.y, WHEEL_ZONE);
  check('2. its first move 40,000 px on is held (a reconnect\'s budget, at most ' + HELD + ' px)', dist(ps(r, id), A) <= HELD, { moved: Math.round(dist(ps(r, id), A)) });
}

// ── 3. no place at all (today's town), then far into the Wheel ──
{
  const r = room();
  const id = newId();
  const ws = await join(r, id, {});
  const p = ps(r, id);
  check('3. a join naming nothing stays in today\'s town (nothing farmed there), its way in judged from the arrival', p && p.z === 'town' && p._wheelArrive === true, p && { z: p.z, arrive: p._wheelArrive });
  await move(r, ws, ARR.x + 25000, ARR.y + 5000, WHEEL_ZONE);
  check('3. ...a first move far into the Wheel is held to the allowance from the arrival', ps(r, id).z === WHEEL_ZONE && dist(ps(r, id), ARR) <= HELD, { z: ps(r, id).z, moved: Math.round(dist(ps(r, id), ARR)) });
}

// ── 4. five of five ──
{
  const FAR = [24780, 33000, 45000, 58000, 70000];
  let held = 0;
  const got = [];
  for (const d of FAR) {
    const r = room();
    const id = newId();
    const ws = await join(r, id, { z: WHEEL_ZONE });
    const from = { x: ps(r, id).x, y: ps(r, id).y };
    await move(r, ws, from.x + d * 0.6, from.y + d * 0.8, WHEEL_ZONE);
    const m = dist(ps(r, id), from);
    got.push(Math.round(m));
    if (m <= HELD) held++;
  }
  check('4. the red team\'s five far first moves (24,780 to 70,000 px): five of five held', held === 5, got);
}

// ── 5. honest phones as before ──
{
  /* a rejoin naming its remembered place, then walking on: every move taken */
  const r = room();
  const id = newId();
  let ws = await join(r, id, { x: A.x, y: A.y, z: WHEEL_ZONE });
  await move(r, ws, A.x, A.y, WHEEL_ZONE);
  await r.webSocketClose(ws);
  T += 2000;
  ws = await join(r, id, { x: A.x, y: A.y, z: WHEEL_ZONE });
  check('5. an honest rejoin naming its remembered place is taken there', near(ps(r, id).x, A.x) && near(ps(r, id).y, A.y));
  let all = true;
  for (let i = 0; i < 30; i++) {
    T += 33;
    const want = ps(r, id).x + 280 * 0.033;
    await move(r, ws, want, A.y, WHEEL_ZONE);
    if (!near(ps(r, id).x, want)) all = false;
  }
  check('5. ...and walks on at 280 px/s, every move taken exactly', all);
  /* a fresh page: town, then its first way into the Wheel at the arrival */
  const r2 = room();
  const id2 = newId();
  const w2 = await join(r2, id2, { x: 500, y: 500, z: 'town' });
  T += 500;
  await move(r2, w2, ARR.x, ARR.y, WHEEL_ZONE);
  check('5. a fresh page\'s first way into the Wheel, at its arrival, is taken', ps(r2, id2).z === WHEEL_ZONE && near(ps(r2, id2).x, ARR.x) && near(ps(r2, id2).y, ARR.y), { z: ps(r2, id2).z, x: ps(r2, id2).x - ARR.x });
  /* a first-ever join naming its place: taken where it says */
  const r3 = room();
  const id3 = newId();
  await join(r3, id3, { x: A.x, y: A.y, z: WHEEL_ZONE });
  check('5. a first-ever join naming its place is taken where it says', near(ps(r3, id3).x, A.x) && near(ps(r3, id3).y, A.y));
  check('5. the overview counts the joins stood (placed)', typeof room()._lastPlaceInfo().placed === 'number');
}

// ── 6. the switch ──
{
  const r = room({ joinplace: false });
  const id = newId();
  const ws = await join(r, id, { z: WHEEL_ZONE });
  const p0 = { x: ps(r, id).x, y: ps(r, id).y };
  await move(r, ws, ARR.x + 30000, ARR.y, WHEEL_ZONE);
  check('6. `joinplace: false`: the early return, as before (the far first move taken)', near(ps(r, id).x, ARR.x + 30000), { p0, x: ps(r, id).x });
}

console.log(failed === 0 ? '\nALL PASS (' + passed + ')' : '\n' + failed + ' FAILURE(S)');
process.exit(failed === 0 ? 0 : 1);
