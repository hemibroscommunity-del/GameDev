/* Quest verification test (v2.3.1120, PR5 of the heavy-systems plan).
 * The server now owns quest progress counters and verifies declarative
 * objectives at turn-in.  Checks:
 *   1. Monster-kill credit increments _questKills for the killer's
 *      active kill-objective quests (quest-id keyed, matching the
 *      client predicates), NOT for gather quests or inactive quests.
 *   2. Harvest credit increments gather-objective quests.
 *   3. Turn-in with an unmet objective pays NOTHING and leaves the
 *      quest active (the old handler paid on request).
 *   4. Turn-in with a met objective pays gold/xp/AP once and unlocks
 *      the next chain entry.
 *   5. Quests without an objective stay client-trusted (turn-in works
 *      as before).
 *   6. state_sync advertises caps.questTrack.
 */
import { GameRoom } from '../src/index.js';

function makeState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, v); },
      list: async (opts) => {
        const out = new Map();
        for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v);
        return out;
      },
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
    _store: store,
  };
}
const mockEnv = {
  LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) },
};
function fakeWs(label) {
  return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} };
}

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const state = makeState();
const room = new GameRoom(state, mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id, z = 'meadow') {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, data: { x: -100000, y: -100000, z } }));
}

const ws = fakeWs('q');
await join(ws, 'bp_quest_p');
const ps = room.playerState['bp_quest_p'];
ps._quests = { mayor_2: 'active', trader_2: 'active', trader_1: 'active', mayor_1: 'active' };
ps._questKills = {};

// ── 6. caps advertised ──
const sync = ws.sent.find((m) => m.type === 'state_sync');
check('state_sync advertises caps.questTrack', sync && sync.caps && sync.caps.questTrack === true, sync && sync.caps);

// ── 1. kill credit increments kill objectives only ──
// Pin a meadow monster next to the player and kill it via the wire.
const monsters = room._ensureZoneMonsters('meadow');
const m = monsters[0];
m.x = -100000; m.y = -100000; m.spawnX = m.x; m.spawnY = m.y;
m.hp = 1;
ps.x = -100000; ps.y = -100000;
await room.webSocketMessage(ws, JSON.stringify({ type: 'monster_damage', payload: { monsterId: m.id, zone: 'meadow', dmg: 5 } }));
check('kill increments the kill-objective quest', ps._questKills.mayor_2 === 1, ps._questKills);
check('kill does NOT advance the gather quest (old client bug)', !ps._questKills.trader_2, ps._questKills);
check('kill does not touch objective-less quests', !ps._questKills.trader_1 && !ps._questKills.mayor_1, ps._questKills);

// ── 2. harvest credit increments gather objectives ──
const nodes = room._ensureZoneNodes('meadow');
const node = nodes.find((n) => n.alive !== false) || nodes[0];
node.alive = true; node.x = ps.x; node.y = ps.y;
await room.webSocketMessage(ws, JSON.stringify({ type: 'node_strike', payload: { id: node.id, zone: 'meadow', accuracy: 'good' } }));
check('harvest increments the gather-objective quest', ps._questKills.trader_2 === 1, ps._questKills);
check('harvest does not advance kill quests', ps._questKills.mayor_2 === 1, ps._questKills);

// ── 3. unmet objective: turn-in refuses to pay ──
const coinsBefore = ps.coins || 0;
await room.webSocketMessage(ws, JSON.stringify({ type: 'quest_turn_in', payload: { questId: 'mayor_2' } }));
check('unmet turn-in pays nothing and stays active', ps._quests.mayor_2 === 'active' && (ps.coins || 0) === coinsBefore, { q: ps._quests.mayor_2, coins: ps.coins });

// ── 4. met objective: turn-in pays once ──
ps._questKills.mayor_2 = 5;
await room.webSocketMessage(ws, JSON.stringify({ type: 'quest_turn_in', payload: { questId: 'mayor_2' } }));
check('met turn-in pays and completes', ps._quests.mayor_2 === 'turnedIn' && (ps.coins || 0) === coinsBefore + 100, { q: ps._quests.mayor_2, coins: ps.coins });
check('turn-in unlocks the next chain entry', ps._quests.mayor_3 === 'available', ps._quests);
const coinsAfter = ps.coins;
await room.webSocketMessage(ws, JSON.stringify({ type: 'quest_turn_in', payload: { questId: 'mayor_2' } }));
check('replayed turn-in pays nothing', ps.coins === coinsAfter);

// ── 5. objective-less quests stay client-trusted ──
await room.webSocketMessage(ws, JSON.stringify({ type: 'quest_turn_in', payload: { questId: 'trader_1' } }));
check('objective-less quest turns in as before', ps._quests.trader_1 === 'turnedIn' && ps.coins === coinsAfter + 25, { q: ps._quests.trader_1, coins: ps.coins });

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
