/* v2.3.4374: A JOIN AT 0 HEALTH STANDS YOU UP (join.js; spec
 * docs/specs/join-stands-up.md).
 *
 * The owner (2026-11-10): "A player who closes the game in the 5 seconds
 * after dying comes back standing in BroTown at full health, and nothing is
 * taken twice."  The dying window is memory only; the death saved hp 0, so a
 * join in it restored 0 with nothing dying, and the stuck-at-zero sweep
 * killed them again -- a second death card, and the respawn wipe took a bag a
 * dungeon death or a lost duel had kept.
 *
 * Against a real GameRoom, its storage counting every row:
 *   1. a dungeon death, the app closed inside the window, the next launch:
 *      standing in today's town (the respawn's place, whatever the join
 *      named) with full pools on the join's player_state (v2), no second
 *      death, no pile, the kept bag still there, the record healed;
 *   2. the same after a lost duel, on protocol v1;
 *   3. a red-skulled record at 0 loses nothing more;
 *   4. a living record's health comes back as it was, where it was;
 *   5. the join at 0 writes no more rows than a living one (cost-guard §7);
 *   6. `joinstandup: false` brings back the second death;
 *   7. a new character (no record) starts from the server's defaults.
 */
import { GameRoom } from '../src/index.js';
import { NML_KEY } from '../src/nomansland.js';
import { flagNameOk } from '../src/liveops.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 700))); }
}

let NOW = 1_760_000_000_000;
Date.now = () => NOW;

function countingState() {
  const m = new Map();
  const writes = [];
  const clone = (v) => (v === undefined ? undefined : structuredClone(v));
  const note = (k) => writes.push(String(k));
  return {
    writes, store: m,
    storage: {
      async get(k) {
        if (Array.isArray(k)) { const r = new Map(); for (const x of k) if (m.has(x)) r.set(x, clone(m.get(x))); return r; }
        return clone(m.get(k));
      },
      async put(k, v) {
        if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) { note(kk); m.set(kk, clone(vv)); } return; }
        note(k); m.set(k, clone(v));
      },
      async delete(k) {
        if (Array.isArray(k)) { for (const x of k) { note(x); m.delete(x); } return k.length; }
        note(k); return m.delete(k);
      },
      async list(opts) {
        const r = new Map(); const p = (opts && opts.prefix) || '';
        for (const [k, v] of m) if (k.startsWith(p)) r.set(k, clone(v));
        return r;
      },
    },
    getWebSockets: () => [], acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => new Response('{}') }) } };
function fakeWs() { return { out: [], send(s) { this.out.push(JSON.parse(s)); }, close() {} }; }
const ofType = (ws, t) => ws.out.filter((m) => m && m.type === t);
function baseSession() { return { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now(), moveSig: '' }; }

async function makeRoom(flags) {
  const state = countingState();
  const room = new GameRoom(state, mockEnv);
  let tickFn = null;
  const realSetInterval = globalThis.setInterval;
  globalThis.setInterval = (fn, ms) => { if (ms === room.TICK_RATE && !tickFn) { tickFn = fn; return 1; } return realSetInterval(fn, ms); };
  room.startTickLoop();
  globalThis.setInterval = realSetInterval;
  room._liveFlags = { ...(flags || {}) };
  /* the join reloads the flags; keep the test's */
  room._liveFlagsEnsure = async () => {};
  /* every death pile, counted */
  const piles = [];
  const realPile = room._spawnDeathPile.bind(room);
  room._spawnDeathPile = (ps, id, o) => { piles.push(id); return realPile(ps, id, o); };
  return { room, state, piles, tick: async (ms) => { const end = NOW + ms; while (NOW < end) { NOW += room.TICK_RATE; tickFn(); } } };
}
/* the phone's join: v2 unless `v1`, naming a place (the death spot) */
async function join(room, id, place, v1) {
  const ws = fakeWs();
  room.sessions.set(ws, baseSession());
  const msg = { type: 'join', id, name: id, data: { ...(place || { x: 1000, y: 1000, z: 'town' }) } };
  if (!v1) msg.protocolVersion = 2;
  await room.webSocketMessage(ws, JSON.stringify(msg));
  return ws;
}
const lastState = (ws) => { const l = ofType(ws, 'player_state'); return l.length ? l[l.length - 1].payload : null; };
const full = (p) => !!p && p.hp === p.maxHp && p.maxHp > 0 && p.stamina === p.maxStamina && p.mana === p.maxMana;

/* ── 1 and 2: a death that kept the bag, the app closed inside the window ── */
for (const kind of ['dungeon', 'duel']) {
  const v1 = kind === 'duel';
  const { room, state, piles, tick } = await makeRoom();
  const id = 'js_' + kind;
  const ws0 = await join(room, id);
  const ps0 = room.playerState[id];
  ps0.inventory = { ore_copper: 5, wood_pine: 3 };
  ps0.hp = 0;   /* the blow that killed them */
  /* the hook that keeps the bag answers yes: a dungeon (dungeon.js) or a
     clean duel kill (duel.js) */
  if (kind === 'dungeon') room._dungeonKeepsBag = () => true;
  else room._duelOnDeath = () => true;
  room._handlePlayerDeath(ps0, id, kind === 'duel' ? 'pvp:bp_other' : 'monster:x');
  check(`${kind}: the death kept the bag and was told`, ps0.dying && ps0.inventory.ore_copper === 5 && ofType(ws0, 'player_died').length === 1);
  /* the keep is the first death's alone: the real hooks from here on */
  delete room._dungeonKeepsBag;
  delete room._duelOnDeath;
  check(`${kind}: ...and saved hp 0 (the record a close leaves)`, state.store.get('rpg:' + id).hp === 0);
  /* the app closes two seconds in */
  NOW += 2000;
  await room.webSocketClose(ws0, 1001, 'gone', true);
  check(`${kind}: the dying state goes with the close`, !room.playerState[id]);
  NOW += 3000;
  const w0 = state.writes.length;
  const ws = await join(room, id, { x: 22000, y: 23000, z: 'wheel' }, v1);
  const p = lastState(ws);
  const ps = room.playerState[id];
  check(`${kind} (${v1 ? 'v1' : 'v2'}): the join's player_state carries full pools`, full(p), p && { hp: p.hp, maxHp: p.maxHp, st: p.stamina, ma: p.mana });
  check(`${kind}: standing in today's town, where a respawn puts you, not the spot the join named`, ps.z === 'town' && !ps.dying && !ps.dead, { z: ps.z, dying: ps.dying });
  check(`${kind}: the healed record is saved before the message (rule 10)`, state.store.get('rpg:' + id).hp === ps.maxHp && state.writes.slice(w0).includes('rpg:' + id));
  await tick(12000);
  check(`${kind}: no second death`, ofType(ws, 'player_died').length === 0 && !ps.dying && ps.hp > 0, ofType(ws, 'player_died'));
  check(`${kind}: no pile`, piles.length === 0, piles);
  check(`${kind}: the kept bag is still there`, ps.inventory.ore_copper === 5 && ps.inventory.wood_pine === 3, ps.inventory);
  await room.webSocketClose(ws, 1000, 'bye', true);
}

/* ── 3. a red skull at 0 loses nothing more ── */
{
  const { room, state, piles, tick } = await makeRoom();
  const id = 'js_red';
  state.store.set('rpg:' + id, { coins: 900, inventory: { ore_copper: 7, fishing_pole: 1 }, level: 3, xp: 10, hp: 0, maxHp: 100, stamina: 0, maxStamina: 100, mana: 0, maxMana: 100, prog3: { alloc: {} } });
  state.store.set(NML_KEY(id), { red: 15 * 60 * 1000, white: 0, forfeit: [] });
  const ws = await join(room, id, { x: 22000, y: 23000, z: 'wheel' });
  const ps = room.playerState[id];
  check('red skull: the join loaded the skull', room._nmlSkullOf(ps) === 'r');
  await tick(12000);
  check('red skull: no second death', ofType(ws, 'player_died').length === 0 && ps.hp > 0);
  check('red skull: the bag, its tools and the gold are all still there',
    ps.inventory.ore_copper === 7 && ps.inventory.fishing_pole === 1 && ps.coins === 900,
    { inv: ps.inventory, coins: ps.coins });
  check('red skull: the skull is not spent by a death that did not happen', room._nmlSkullOf(ps) === 'r');
  check('red skull: no pile', piles.length === 0, piles);
  await room.webSocketClose(ws, 1000, 'bye', true);
}

/* ── 4 and 5: a living record as before; the join at 0 writes no more ── */
{
  const { room, state } = await makeRoom();
  /* each record made the real way: a first join, the health it is left at,
     its save, the close */
  for (const [id, hp] of [['js_alive', 40], ['js_zero', 0]]) {
    const ws0 = await join(room, id);
    const ps0 = room.playerState[id];
    ps0.hp = hp;
    await room._saveRpg(id, ps0);
    await room.webSocketClose(ws0, 1000, 'bye', true);
  }
  NOW += 60000;
  const mine = (id, from) => state.writes.slice(from).filter((k) => k.indexOf(id) >= 0);
  let w = state.writes.length;
  const wsA = await join(room, 'js_alive', { x: 22000, y: 23000, z: 'wheel' });
  const alive = mine('js_alive', w);
  const psA = room.playerState.js_alive;
  const pA = lastState(wsA);
  check('alive: health comes back as it was', psA.hp === 40 && pA && pA.hp === 40, { hp: psA.hp, sent: pA && pA.hp });
  check('alive: and stays where the join named', psA.z === 'wheel', psA.z);
  w = state.writes.length;
  await join(room, 'js_zero', { x: 22000, y: 23000, z: 'wheel' });
  const zero = mine('js_zero', w);
  check(`writes: the join at 0 writes no more rows than a living one (${zero.length} vs ${alive.length})`, zero.length <= alive.length, { zero, alive });
}

/* ── 6. the kill switch ── */
{
  check('switch: `joinstandup` is a name POST /flags takes', flagNameOk('joinstandup'));
  const { room, state, tick } = await makeRoom({ joinstandup: false });
  state.store.set('rpg:js_off', { coins: 0, inventory: { ore_copper: 2 }, level: 1, xp: 0, hp: 0, maxHp: 100, stamina: 100, maxStamina: 100, mana: 100, maxMana: 100 });
  const ws = await join(room, 'js_off', { x: 22000, y: 23000, z: 'wheel' });
  const ps = room.playerState.js_off;
  check('switch off: the join restores 0, as before', lastState(ws).hp === 0 && ps.z === 'wheel', { hp: lastState(ws).hp, z: ps.z });
  await tick(500);
  check('switch off: ...and the sweep kills again (today\'s behaviour)', ofType(ws, 'player_died').some((m) => m.payload.cause === 'stuck-at-zero'));
}

/* ── 7. a new character ── */
{
  const { room } = await makeRoom();
  const ws = await join(room, 'js_new', { x: 1000, y: 1000, z: 'town', rpgHp: 0, rpgMaxHp: 100 });
  const p = lastState(ws);
  check('new character: the server\'s defaults (no rpg* claim, so no 0 either)', p && p.hp > 0 && p.hp === p.maxHp, p && { hp: p.hp, maxHp: p.maxHp });
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
