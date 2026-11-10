/* ═══ v2.3.4377: A SECOND JOIN OF THE SAME CHARACTER SAVES WHAT A CLOSE WOULD ═══
 *
 * When the same character joins again while the worker still holds its old
 * socket (a second tab, a phone reconnecting over a dead line), join.js
 * replaces the old socket WITHOUT webSocketClose ("superseded by reconnect")
 * and reads rpg: back from storage.  The record's unsaved part -- damage
 * taken above 25% health (coalesced), a paced tap past the burst, regen --
 * was dropped, so a script could reconnect to heal (state-machine sweep V3,
 * S2-13; docs/specs/takeover-save.md).  Against the real GameRoom:
 *   1. damage taken, then a takeover: the rejoined character keeps it;
 *   2. an equip past the paced burst, then a takeover: it is kept;
 *   3. nothing dirty: the takeover writes no rpg: row of its own;
 *   4. the kill switch: `takeoversave` is a name the live flags take, and
 *      `takeoversave: false` brings back the old behaviour (the damage is
 *      given back), nothing set leaves the save on.
 */
import { GameRoom } from '../src/index.js';
import { flagNameOk } from '../src/liveops.js';
import { PACE } from '../src/flood.js';

/* Real DO storage keeps a COPY of what was put; a mock keeping the object
   itself would make the stored record follow the live one (botfp.test §9b) */
function makeState() {
  const store = new Map();
  const puts = [];
  const copy = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
  return {
    storage: {
      get: async (k) => copy(store.get(k)),
      put: async (k, v) => { puts.push(k); store.set(k, copy(v)); },
      list: async (opts) => {
        const out = new Map();
        for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, copy(v));
        return out;
      },
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
    _store: store,
    _puts: puts,
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs(label) {
  return { label, sent: [], closed: null, send(s) { this.sent.push(JSON.parse(s)); }, close(c, r) { this.closed = [c, r]; } };
}

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const state = makeState();
const room = new GameRoom(state, mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, ws: [1, 5], data: { z: 'town' } }));
}
const send = (ws, type, payload) => room.webSocketMessage(ws, JSON.stringify({ type, payload }));
const rpgPuts = (id) => state._puts.filter((k) => k === 'rpg:' + id).length;

/* The first join, then a coalesced hit: the same call the monster and player
   hits make after the damage (combat.js -> persistence.js _saveRpgVitals),
   just after a durable write, so it is held for REGEN_SAVE_MS. */
async function hurt(id) {
  const ws = fakeWs(id + '-1');
  await join(ws, id);
  const ps = room.playerState[id];
  ps.hp = ps.maxHp;
  await room._saveRpg(id, ps);              // a durable write just now ...
  ps.hp = Math.round(ps.maxHp * 0.6);       // ... then a hit, out of the near-death band
  room._saveRpgVitals(id, ps);
  return { ws, ps, hp: ps.hp, maxHp: ps.maxHp };
}

// ── 1. damage taken, then a takeover: the damage is kept ──
{
  const id = 'bp_ts_hurt';
  const a = await hurt(id);
  check('1. setup: the hit is held, not written', a.ps._regenDirty === true && state._store.get('rpg:' + id).hp === a.maxHp, { dirty: a.ps._regenDirty, stored: state._store.get('rpg:' + id).hp });
  const ws2 = fakeWs(id + '-2');
  await join(ws2, id);
  const ps2 = room.playerState[id];
  check('1. the old socket was superseded', a.ws.closed && a.ws.closed[1] === 'superseded by reconnect', a.ws.closed);
  check('1. the rejoined character keeps the damage', ps2 !== a.ps && ps2.hp === a.hp, { hp: ps2.hp, want: a.hp });
  check('1. ...and so does its record', state._store.get('rpg:' + id).hp === a.hp);
}

// ── 2. an equip past the paced burst, then a takeover: it is kept ──
{
  const id = 'bp_ts_equip';
  const ws1 = fakeWs(id + '-1');
  await join(ws1, id);
  const ps = room.playerState[id];
  ps.weapon = null;
  ps.weaponStash = [{ type: 'sword', name: 'Takeover Blade', tierMult: 1 }];
  await room._saveRpg(id, ps);
  while (room._paceTake('rpg', id, PACE.RPG)) { /* spend the burst */ }
  await send(ws1, 'equip_request', { stashIdx: 0, slot: 'weapon' });
  check('2. setup: the equip went on, held by the pace', ps.weapon && ps.weapon.name === 'Takeover Blade' && ps._regenDirty === true && !(state._store.get('rpg:' + id).weapon), { weapon: ps.weapon, dirty: ps._regenDirty });
  const ws2 = fakeWs(id + '-2');
  await join(ws2, id);
  const ps2 = room.playerState[id];
  check('2. the rejoined character still wears it', ps2.weapon && ps2.weapon.name === 'Takeover Blade' && Array.isArray(ps2.weaponStash) && ps2.weaponStash.length === 0, { weapon: ps2.weapon, stash: ps2.weaponStash });
}

// ── 3. nothing dirty: no rpg: row of the takeover's own ──
{
  /* the same join twice, the second a takeover and the first not: any rpg:
     row the second writes beyond the first's is the takeover's */
  const fresh = 'bp_ts_clean_base';
  const before0 = rpgPuts(fresh);
  await join(fakeWs('c0'), fresh);
  await room._saveRpg(fresh, room.playerState[fresh]);
  const firstJoinRows = rpgPuts(fresh) - before0 - 1;
  room.sessions.clear(); delete room.playerState[fresh];
  const before1 = rpgPuts(fresh);
  await join(fakeWs('c1'), fresh);              // an ordinary return
  const plainRows = rpgPuts(fresh) - before1;
  check('3. setup: the character is clean', room.playerState[fresh]._regenDirty !== true);
  const before2 = rpgPuts(fresh);
  await join(fakeWs('c2'), fresh);              // a takeover of a clean character
  const takeoverRows = rpgPuts(fresh) - before2;
  check('3. a clean takeover writes no more rpg: rows than an ordinary return', takeoverRows === plainRows, { takeoverRows, plainRows, firstJoinRows });
}

// ── 4. the kill switch ──
{
  check('4. `takeoversave` is a name POST /flags takes', flagNameOk('takeoversave'));
  const was = room._liveFlags;
  room._liveFlags = { takeoversave: false };
  const id = 'bp_ts_off';
  const a = await hurt(id);
  await join(fakeWs(id + '-2'), id);
  check('4. `takeoversave: false`: the damage is given back, as before', room.playerState[id].hp === a.maxHp, { hp: room.playerState[id].hp, maxHp: a.maxHp });
  room._liveFlags = { takeoversave: true };
  const id2 = 'bp_ts_on';
  const b = await hurt(id2);
  await join(fakeWs(id2 + '-2'), id2);
  check('4. `takeoversave: true` (or nothing set) keeps it', room.playerState[id2].hp === b.hp, { hp: room.playerState[id2].hp, want: b.hp });
  room._liveFlags = was;
}

for (const t of [room.tickInterval]) if (t) clearInterval(t);
room.tickInterval = null;
if (failures) { console.log('\n' + failures + ' FAILED'); process.exit(1); }
console.log('\nall takeover-save checks passed');
process.exit(0);
