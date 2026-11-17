/* ═══ v2.3.5610: A GUEST'S JOIN WRITES NOTHING (server/src/guestlazy.js; card OPS PR 11) ═══
 *
 * Red team RT-1 N6: a join with no key wrote five rows for an id the caller
 * made up, four kept for good.  This holds:
 *
 *   1. a FRESH guest's join (no key, nothing on file) writes none of its
 *      rows (`rpg:`, `pets:`, `cadence:login:`, `daily_rewards:`), and the
 *      phone is in (state_sync, player_state) with its character in memory;
 *   2. leaving having done nothing leaves none of them (the bot signals'
 *      `botstat:` is the anti-cheat's);
 *   3. a guest that earns gold (the owner's grant, online) writes its record
 *      then, and joining again (still no key) comes back with it; that join
 *      is not a fresh guest's and writes as before;
 *   4. an id with any of the rows on file (a day's rewards, here) is not
 *      fresh: its join writes as before (a turn-over that may pay is saved);
 *   5. a join with a key is unchanged (its six rows);
 *   6. the mark lasts the join only: gone when it returns, and when it throws;
 *   7. `guestlazy: false`: a guest's join writes its rows as before.
 */
import { GameRoom } from '../src/index.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 700))); }
}

let NOW = Date.UTC(2026, 10, 15, 12, 0, 0);
const realNow = Date.now;
Date.now = () => NOW;
const settle = () => new Promise((r) => setTimeout(r, 10));
const KEY = 'guest-lazy-key';
const ROWS = ['rpg:', 'pets:', 'cadence:login:', 'daily_rewards:'];

function makeState(seed) {
  const m = new Map(seed || []); const writes = [];
  const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
  return { writes, m, id: { toString: () => 'brotown-1', name: 'brotown-1' }, blockConcurrencyWhile: async (f) => f(), waitUntil: () => {},
    storage: {
      async get(k) { if (Array.isArray(k)) { const r = new Map(); for (const x of k) if (m.has(x)) r.set(x, clone(m.get(x))); return r; } return clone(m.get(k)); },
      async put(k, v) { if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) { writes.push(kk); m.set(kk, clone(vv)); } return; } writes.push(k); m.set(k, clone(v)); },
      async delete(k) { const ks = Array.isArray(k) ? k : [k]; let n = 0; for (const x of ks) { writes.push('DEL ' + x); if (m.delete(x)) n++; } return Array.isArray(k) ? n : n > 0; },
      async list(opts) { const r = new Map(); const p = (opts && opts.prefix) || ''; for (const [k, v] of [...m].sort()) if (k.startsWith(p)) r.set(k, clone(v)); return r; },
      async setAlarm() {}, async getAlarm() { return null; }, async deleteAlarm() {},
    }, getWebSockets: () => [], acceptWebSocket: () => {} };
}
const env = { ADMIN_KEY: KEY, LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => new Response('{}') }) } };
async function openRoom(seed, flags) {
  const state = makeState(seed);
  const room = new GameRoom(state, env);
  await room._liveFlagsEnsure();
  if (flags) Object.assign(room._liveFlags, flags);
  return { room, state };
}
const fakeWs = () => ({ sent: [], send(s) { this.sent.push(s); }, close() {} });
async function join(room, id, phrase) {
  const ws = fakeWs();
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: NOW });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'Guesty', ...(phrase ? { phrase } : {}), protocolVersion: 2, ws: [1, 5], data: { x: 1000, y: 1000, z: 'town', name: 'Guesty' } }));
  await settle();
  return ws;
}
const leave = async (room, ws) => { await room.webSocketClose(ws, 1000, 'bye', true); await settle(); };
const types = (ws) => ws.sent.map((s) => { try { return JSON.parse(s).type; } catch (e) { return '?'; } });
const rowsOf = (state, id, from = 0) => state.writes.slice(from).filter((k) => ROWS.some((p) => k === p + id));
const onFile = (state, id) => ROWS.filter((p) => state.m.has(p + id));

/* ── 1 and 2. a fresh guest ── */
{
  const { room, state } = await openRoom();
  const ws = await join(room, 'bp_gl_fresh');
  const t = types(ws);
  check('1. a fresh guest\'s join writes none of its rows', rowsOf(state, 'bp_gl_fresh').length === 0, state.writes);
  check('1. ...and the phone is in, its character in memory', t.includes('state_sync') && t.includes('player_state') && !!room.playerState.bp_gl_fresh, t);
  await leave(room, ws);
  check('2. leaving having done nothing leaves none of them', onFile(state, 'bp_gl_fresh').length === 0 && rowsOf(state, 'bp_gl_fresh').length === 0, { onFile: onFile(state, 'bp_gl_fresh'), writes: state.writes });
}

/* ── 3. a guest that earns gold ── */
{
  const { room, state } = await openRoom();
  const ws = await join(room, 'bp_gl_earn');
  const start = room.playerState.bp_gl_earn.coins;   /* the server's starting purse */
  const res = await room.fetch(new Request('https://x/api/admin/grant', { method: 'POST', headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId: 'bp_gl_earn', kind: 'gold', payload: { amount: 150 }, note: 'a guest earns' }) }));
  const g = await res.json().catch(() => ({}));
  await settle();
  const rec = state.m.get('rpg:bp_gl_earn');
  check(`3. a guest that earns gold (${start} + 150) writes its record then`, res.status === 200 && !!rec && rec.coins === start + 150, { status: res.status, g, coins: rec && rec.coins });
  await leave(room, ws);
  NOW += 60000;
  const w = state.writes.length;
  const ws2 = await join(room, 'bp_gl_earn');
  check('3. ...joining again (no key) comes back with it', room.playerState.bp_gl_earn && room.playerState.bp_gl_earn.coins === start + 150, room.playerState.bp_gl_earn && room.playerState.bp_gl_earn.coins);
  const again = rowsOf(state, 'bp_gl_earn', w);
  check(`3. ...and that join writes as before (${again.join(', ')})`, again.length >= 2 && again.some((k) => k.indexOf('daily_rewards:') === 0), again);
  await leave(room, ws2);
}

/* ── 4. not fresh: a day's rewards on file ── */
{
  const { room, state } = await openRoom([['daily_rewards:bp_gl_dr', { sp: { day: 1, pot: 0 } }]]);
  const ws = await join(room, 'bp_gl_dr');
  const w = rowsOf(state, 'bp_gl_dr');
  check(`4. an id with a row on file is no fresh guest: its join writes as before (${w.join(', ')})`, w.some((k) => k.indexOf('rpg:') === 0) && w.some((k) => k.indexOf('daily_rewards:') === 0), w);
  await leave(room, ws);
}

/* ── 5. a join with a key ── */
{
  const { room, state } = await openRoom();
  const ws = await join(room, 'bp_gl_key', 'p-bp_gl_key');
  const w = rowsOf(state, 'bp_gl_key');
  check(`5. a join with a key is unchanged (${w.join(', ')})`, w.filter((k) => k === 'rpg:bp_gl_key').length === 2 && ['pets:', 'cadence:login:', 'daily_rewards:'].every((p) => w.includes(p + 'bp_gl_key')) && state.m.has('auth:bp_gl_key'), w);
  await leave(room, ws);
}

/* ── 6. the mark lasts the join only ── */
{
  const { room } = await openRoom();
  let during = null;
  const real = room._drOnJoin;
  room._drOnJoin = async function (pid) { during = this._guestLazy(pid); return real.call(this, pid); };
  const ws = await join(room, 'bp_gl_mark');
  check('6. marked during the join, gone when it returns', during === true && room._guestLazy('bp_gl_mark') === false, { during });
  await leave(room, ws);
  room._drOnJoin = async function () { throw new Error('test: a join that throws'); };
  room._jackpotMaybeResolve = async function () { throw new Error('test: a join that throws'); };
  const ws2 = await join(room, 'bp_gl_throw');
  check('6. ...and when the join throws', room._guestLazy('bp_gl_throw') === false && !(room._guestLazyIds && room._guestLazyIds.size), room._guestLazyIds && [...room._guestLazyIds]);
  try { await leave(room, ws2); } catch (e) { /* the half-joined socket */ }
}

/* ── 7. the switch ── */
{
  const { room, state } = await openRoom(null, { guestlazy: false });
  const ws = await join(room, 'bp_gl_off');
  const w = rowsOf(state, 'bp_gl_off');
  check(`7. guestlazy: false -- a guest's join writes its rows as before (${w.join(', ')})`, w.filter((k) => k === 'rpg:bp_gl_off').length === 2 && ['pets:', 'cadence:login:', 'daily_rewards:'].every((p) => w.includes(p + 'bp_gl_off')), w);
  await leave(room, ws);
}

Date.now = realNow;
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
