/* v2.3.4840: THE ARMOUR STASH KEPT LIVE ON THE WORKER (gearstash.js
 * _gearStashLiveAdd; STATE-MACHINES.md "what is left", from #1531; the sweep's
 * V21 S7-23).
 *
 * The worker learned `armorStash` / `legsStash` only at join, so a piece that
 * reached the phone's bag this session (forged, taken off, swapped out) was in
 * nothing the No man's land loss reads, and a losing player kept it.
 *   1. a forged chest piece is in the worker's armour stash at once
 *   2. a red skull who dies to a monster in No man's land loses it (the loss)
 *   3. a swap: the piece put on leaves the stash, the piece taken off goes in
 *   4. taking the legs off puts them in the legs stash
 *   5. never a second copy (the loss credits what it takes: a copy too many
 *      would be a piece made out of nothing)
 *   6. `armorstashlive: false`: the join-only behaviour, as before
 */
import { GameRoom } from '../src/index.js';
import { ARMOR_FORGE } from '../src/armorforge.js';

function makeState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) store.set(kk, vv); } else store.set(k, v); },
      list: async (opts) => {
        const out = new Map();
        for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v);
        return out;
      },
      delete: async (k) => { if (Array.isArray(k)) { for (const kk of k) store.delete(kk); } else store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs() { return { sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }
const settle = () => new Promise((r) => setTimeout(r, 15));

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const room = new GameRoom(makeState(), mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
const PID = 'bp_stashlive_a';
const ws = fakeWs();
room.sessions.set(ws, baseSession());
await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id: PID, name: 'T', phrase: 'p-' + PID, ws: [1, 5], data: { x: 0, y: 0, z: 'town' } }));
const send = async (type, payload) => { await room.webSocketMessage(ws, JSON.stringify({ type, payload: payload || {} })); await settle(); };
const ps = room.playerState[PID];

/* a chest recipe and a legs recipe, the forge's own table */
const recipes = Object.entries(ARMOR_FORGE.RECIPES);
const [chestKey, chest] = recipes.find(([, r]) => r.slot === 'armor');
const [legsKey, legs] = recipes.find(([, r]) => r.slot === 'legsArmor');
const ready = () => {
  ps.lifeSkills = ps.lifeSkills || {};
  ps.lifeSkills.blacksmithing = { level: 99, xp: 0 };
  ps.inventory = ps.inventory || {};
  ps.inventory[chest.bar] = 50; ps.inventory[legs.bar] = 50;
  ps.level = 99;
};
const gids = (f) => (Array.isArray(ps[f]) ? ps[f] : []).map((g) => g && g.gid).filter(Boolean);

// ── 1. a forged chest piece is in the worker's stash at once ──
ready();
ps.armorStash = []; ps.legsStash = [];
await send('forge_armor', { recipe: chestKey });
const res1 = ws.sent.find((m) => m.type === 'forge_armor_result');
const g1 = res1 && res1.payload && res1.payload.piece && res1.payload.piece.gid;
check('1. a forged chest piece is in the worker\'s armour stash this session', !!g1 && gids('armorStash').includes(g1), { g1, stash: gids('armorStash') });

// ── 2. the loss takes it ──
const keepZ = { z: ps.z, x: ps.x, y: ps.y };
room._nmlState(ps).red = 1;
const lost = room._nmlOnDeath(ps, PID, 'monster');
check('2. a red skull killed by a monster loses the piece forged this session',
  !gids('armorStash').includes(g1) && !!lost && lost.lost && Array.isArray(lost.lost.gear) && lost.lost.gear.some((x) => x && x.gid === g1), { lost, stash: gids('armorStash') });
room._nmlState(ps).red = 0; Object.assign(ps, keepZ);

// ── 3. a swap ──
ready();
ps.armor = null; ps.armorStash = [];
ws.sent.length = 0;
await send('forge_armor', { recipe: chestKey });
const pA = ws.sent.find((m) => m.type === 'forge_armor_result').payload.piece;
ws.sent.length = 0;
await send('forge_armor', { recipe: chestKey });
const pB = ws.sent.find((m) => m.type === 'forge_armor_result').payload.piece;
check('3a. setup: two forged chest pieces in the stash', gids('armorStash').includes(pA.gid) && gids('armorStash').includes(pB.gid), gids('armorStash'));
await send('stats_update', { armorRef: pA.gid });
check('3b. the piece put on leaves the stash', !!ps.armor && ps.armor.gid === pA.gid && !gids('armorStash').includes(pA.gid), { worn: ps.armor && ps.armor.gid, stash: gids('armorStash') });
await send('stats_update', { armorRef: pB.gid });
check('3c. the swap: the new piece leaves the stash, the old one goes back in', !!ps.armor && ps.armor.gid === pB.gid
  && !gids('armorStash').includes(pB.gid) && gids('armorStash').includes(pA.gid), { worn: ps.armor && ps.armor.gid, stash: gids('armorStash') });

// ── 4. the legs taken off ──
ready();
ps.legsArmor = null; ps.legsStash = [];
ws.sent.length = 0;
await send('forge_armor', { recipe: legsKey });
const pL = ws.sent.find((m) => m.type === 'forge_armor_result').payload.piece;
await send('stats_update', { legsArmorRef: pL.gid });
check('4a. setup: the legs put on, out of the legs stash', !!ps.legsArmor && ps.legsArmor.gid === pL.gid && !gids('legsStash').includes(pL.gid), { worn: ps.legsArmor, stash: gids('legsStash') });
await send('stats_update', { legsArmorRef: null });
check('4b. the legs taken off go into the legs stash', !ps.legsArmor && gids('legsStash').includes(pL.gid), { worn: ps.legsArmor, stash: gids('legsStash') });

// ── 5. never a second copy ──
const n0 = ps.armorStash.length;
room._gearStashLiveAdd(ps, 'armor', { ...pA });
room._gearStashLiveAdd(ps, 'armor', { name: 'Old Plate', tierMult: 2 });
room._gearStashLiveAdd(ps, 'armor', { name: 'Old Plate', tierMult: 2 });
check('5. a piece already held is never added twice (by id, or by its look for an old one)', ps.armorStash.length === n0 + 1, ps.armorStash.map((g) => g.gid || g.name));

// ── 6. the switch ──
room._liveFlags = { ...(room._liveFlags || {}), armorstashlive: false };
ready();
ps.armorStash = [];
ws.sent.length = 0;
await send('forge_armor', { recipe: chestKey });
const g6 = ws.sent.find((m) => m.type === 'forge_armor_result').payload.piece.gid;
check('6. `armorstashlive: false`: the worker learns the piece only at the next join, as before', !gids('armorStash').includes(g6), gids('armorStash'));

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
