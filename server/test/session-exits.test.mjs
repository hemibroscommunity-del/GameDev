/* THE WAYS A PLAYER'S SESSION ENDS -- FOUR SMALL FIXES (v2.3.4413; the
 * state-machine sweep's V3, docs/STATE-MACHINES.md).  All against the real
 * GameRoom.
 *
 *   1. A join that THROWS is closed with 4013, a code of its own -- never the
 *      linger's 4010, which the phone reads as "Your bro is still in that
 *      fight" (wsClient.js) and retries on that screen every 5 s.
 *   2. The owner's restore refuses while the player is still in the room: a
 *      kick during a fight with another player leaves the body for 20 s
 *      (linger.js), and its end saved that body over the restore.  The
 *      refusal says to wait 20 seconds; after the body has gone it works.
 *   3. A linger that ends drops the achievements' cache, as a close does
 *      (a resume keeps it: its join reads it back).
 *   4. The arena's eating gates ask the duel's own record: a fighter who
 *      rejoined mid-match (a new player state, no `_arenaMatch`) cannot eat.
 *      `arenaeatgate: false` in the live flags goes back to the flag alone.
 */
import { GameRoom } from '../src/index.js';
import { LINGER } from '../src/linger.js';
import { WHEEL_ZONE } from '../src/wheelzone.js';
import { WHEEL_CENTRE } from '../src/wheelspawns.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

let T = 1_950_000_000_000;
const realNow = Date.now;
Date.now = () => T;
const realRandom = Math.random;
Math.random = () => 0.5;

function makeState() {
  const store = new Map();
  return {
    _store: store,
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, JSON.parse(JSON.stringify(v))); },
      list: async (opts) => {
        const out = new Map();
        for (const [k, v] of store) if (!opts || !opts.prefix || k.startsWith(opts.prefix)) out.set(k, v);
        return out;
      },
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
const mockEnv = {
  LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) },
  ADMIN_KEY: 'test-secret-key',
};
function fakeWs() { return { sent: [], closed: null, send(s) { this.sent.push(JSON.parse(s)); }, close(c, r) { this.closed = { code: c, reason: r }; } }; }
const settle = () => new Promise((r) => setTimeout(r, 5));

const state = makeState();
const room = new GameRoom(state, mockEnv);
const NML_X = WHEEL_CENTRE[0] + 9000, NML_Y = WHEEL_CENTRE[1];   /* No man's land, a few rings out */
async function join(id, data, ws) {
  ws = ws || fakeWs();
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 0, lastPing: 0, lastRecv: T });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: id, phrase: 'p-' + id, protocolVersion: 2, ws: [1, 5],
    data: Object.assign({ x: NML_X, y: NML_Y, z: WHEEL_ZONE }, data || {}) }));
  await settle();
  return ws;
}
function place(id, x, y) {
  const ps = room.playerState[id];
  ps.z = WHEEL_ZONE; ps.x = x; ps.y = y; ps.dead = false; ps.dying = false;
  ps._zoneEntryGraceUntil = 0; ps.hp = ps.maxHp;
  return ps;
}
const req = (method, path, body) => room.fetch(new Request('https://x' + path, {
  method, headers: { Authorization: 'Bearer test-secret-key' }, body: body ? JSON.stringify(body) : undefined,
}));

const wsA = await join('bp_sx_a');
const wsB = await join('bp_sx_b');
clearInterval(room.tickInterval); room.tickInterval = null;
place('bp_sx_a', NML_X, NML_Y);
place('bp_sx_b', NML_X + 40, NML_Y);
check('(guard) both joined, in the Wheel', !!room.playerState.bp_sx_a && !!room.playerState.bp_sx_b);

// ── 1. a join that throws: 4013, never the linger's 4010 ──
{
  const realJoin = room._handleJoin;
  room._handleJoin = async () => { throw new Error('a bad record'); };
  const ws = fakeWs();
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 0, lastPing: 0, lastRecv: T });
  const realErr = console.error; console.error = () => {};
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id: 'bp_sx_throw', name: 'x', protocolVersion: 2, ws: [1, 5], data: {} }));
  console.error = realErr;
  room._handleJoin = realJoin;
  check('a join that throws is closed', !!ws.closed, ws.closed);
  check('...with 4013, its own code', !!ws.closed && ws.closed.code === 4013, ws.closed);
  check('...never the linger\'s code (the phone would say "still in that fight")', !!ws.closed && ws.closed.code !== LINGER.CLOSE_CODE);
  check('...and no linger_wait was sent', !ws.sent.some((m) => m.type === 'linger_wait'));
  room.sessions.delete(ws);
}

// ── 2. kick during a fight, then restore: refused while the body stands ──
{
  await state.storage.put('rpgsnap:bp_sx_b:20261101', { coins: 4242, restored: true });
  room._notePvpExchange('bp_sx_a', 'bp_sx_b', T);
  T += 1000;
  const k = await req('POST', '/api/admin/kick', { playerId: 'bp_sx_b' });
  check('(guard) the kick answered', k.status === 200);
  const B = room.playerState.bp_sx_b;
  check('(guard) kicked mid-fight: the body lingers', !!B && B.lingering === true);
  const before = JSON.stringify(state._store.get('rpg:bp_sx_b'));
  const r = await req('POST', '/api/admin/restore', { playerId: 'bp_sx_b', snapKey: 'rpgsnap:bp_sx_b:20261101' });
  const body = await r.json();
  check('restore refuses while the body is still in the world (409)', r.status === 409, { status: r.status, body });
  check('...in plain words: wait 20 seconds', /wait 20 seconds/.test(String(body.error)), body.error);
  check('...and changed nothing', JSON.stringify(state._store.get('rpg:bp_sx_b')) === before);
  check('...took no prerestore copy', ![...state._store.keys()].some((x) => x.startsWith('rpgsnap:bp_sx_b:prerestore-')));
  /* the body goes (its time is up); then the owner presses Restore again */
  T += LINGER.MS + 1;
  await room._lingerEnd('bp_sx_b');
  check('(guard) the body has gone', !room.playerState.bp_sx_b);
  const r2 = await req('POST', '/api/admin/restore', { playerId: 'bp_sx_b', snapKey: 'rpgsnap:bp_sx_b:20261101' });
  check('after the body has gone the restore works', r2.status === 200, await r2.json());
  check('...and the restore stays (nothing saves over it)', !!(state._store.get('rpg:bp_sx_b') || {}).restored);
}

// ── 3. a linger that ends drops the achievements' cache ──
{
  const wsC = await join('bp_sx_c');
  place('bp_sx_c', NML_X + 60, NML_Y);
  check('(guard) C has an achievements book in the cache', room._achvMap().has('bp_sx_c'));
  room._notePvpExchange('bp_sx_a', 'bp_sx_c', T);
  T += 500;
  await room.webSocketClose(wsC);
  check('(guard) C lingers', !!room.playerState.bp_sx_c && room.playerState.bp_sx_c.lingering);
  T += LINGER.MS + 1;
  await room._lingerEnd('bp_sx_c');
  check('a linger that ends drops the achievements\' cache', !room._achvMap().has('bp_sx_c'));
  /* a resume keeps it: its own join reads it back */
  const wsD = await join('bp_sx_d');
  place('bp_sx_d', NML_X + 80, NML_Y);
  room._notePvpExchange('bp_sx_a', 'bp_sx_d', T);
  T += 500;
  await room.webSocketClose(wsD);
  const D = room.playerState.bp_sx_d;
  await room._lingerEnd('bp_sx_d', true);
  check('a resume (quiet) keeps the achievements\' cache for its join', room._achvMap().has('bp_sx_d') && !!D);
}

// ── 4. the arena's eating gates ask the duel's record ──
{
  const wsE = await join('bp_sx_e', { x: 100, y: 100, z: 'town' });
  const wsF = await join('bp_sx_f', { x: 140, y: 100, z: 'town' });
  if (!room._duels) room._duels = new Map();
  room._duels.set('sx-arena', room._makeDuel({ id: 'sx-arena', a: 'bp_sx_e', b: 'bp_sx_f', wager: 0, startedAt: T,
    expiresAt: T + 180000, arenaMatch: { tid: 'sx-t', matchId: 'sx-m' } }));
  room.playerState.bp_sx_e._arenaMatch = 'sx-m';
  room.playerState.bp_sx_f._arenaMatch = 'sx-m';
  check('(guard) the arena duel is active', !!room._duelFor('bp_sx_e') && !!room._duelFor('bp_sx_e').arenaMatch);
  /* E reloads mid-match: a new socket, the same id -- a NEW player state */
  const wsE2 = await join('bp_sx_e', { x: 100, y: 100, z: 'town' });
  const E = room.playerState.bp_sx_e;
  check('(guard) the rejoined state has no _arenaMatch (the road being closed)', !!E && !E._arenaMatch);
  const eat = () => {
    E.hp = 10; E.maxHp = 200; E.inventory = E.inventory || {};
    E.inventory.cooked_fish_clownfish = 3;
    E._pvpHealAt = 0;
    const s = room.sessions.get(wsE2);
    room._handleEatRequest(s, { invKey: 'cooked_fish_clownfish' });
    return { hp: E.hp, n: E.inventory.cooked_fish_clownfish };
  };
  const ate = eat();
  check('a fighter who rejoined mid-match cannot eat a fish', ate.hp === 10 && ate.n === 3, ate);
  check('...nor buy a shop heal', room._applyShopItem(E, { effect: 'healFish', power: 23 }, 'bp_sx_e') === false && E.hp === 10, E.hp);
  check('...nor eat a Garden Stew', room._applyDish(E, { slot: 'now', buff: 'heal', power: 50 }, 'bp_sx_e') === false && E.hp === 10, E.hp);
  /* the kill switch: the flag alone, as before */
  room._liveFlags = { arenaeatgate: false };
  const off = eat();
  check('arenaeatgate: false -- the flag alone again (the fish is eaten)', off.hp > 10 && off.n === 2, off);
  room._liveFlags = {};
  /* outside a match nothing changes */
  room._duels.delete('sx-arena');
  const free = eat();
  check('with no match, eating heals as ever', free.hp > 10 && free.n === 2, free);
  check('an honest player in no duel is not in a match', room._arenaInMatch('bp_sx_a', room.playerState.bp_sx_a) === false);
  void wsE; void wsF;
}

Date.now = realNow;
Math.random = realRandom;
clearInterval(room.tickInterval);
console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
