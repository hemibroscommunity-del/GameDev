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
 *   7. v2.3.1214 (item H): an inherited-property questId ('constructor'
 *      etc.) is rejected by the own-property guard — no free AP, no
 *      _quests pollution.
 */
import { GameRoom } from '../src/index.js';
import { QUEST_REWARDS } from '../src/data.js';

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
/* v2.3.1680: gathering is TOOL-GATED (owner: extraction hidden behind a Mayor
   Bro quest that hands over the equipment).  This section is about QUEST
   CREDIT, not the gate, so hand over every tool rather than letting the strike
   be refused for an unrelated reason — a silent refusal here would read as
   "quest credit broken". */
if (!ps.inventory) ps.inventory = {};
ps.inventory.woodcutting_axe = 1;
ps.inventory.fishing_pole = 1;
ps.inventory.mining_pickaxe = 1;
await room.webSocketMessage(ws, JSON.stringify({ type: 'node_strike', payload: { id: node.id, zone: 'meadow', accuracy: 'good' } }));
check('harvest increments the gather-objective quest', ps._questKills.trader_2 === 1, ps._questKills);
check('harvest does not advance kill quests', ps._questKills.mayor_2 === 1, ps._questKills);

// ── 3. unmet objective: turn-in refuses to pay ──
const coinsBefore = ps.coins || 0;
await room.webSocketMessage(ws, JSON.stringify({ type: 'quest_turn_in', payload: { questId: 'mayor_2', xpCat: 'sword' } }));
check('unmet turn-in pays nothing and stays active', ps._quests.mayor_2 === 'active' && (ps.coins || 0) === coinsBefore, { q: ps._quests.mayor_2, coins: ps.coins });

// ── 4. met objective: turn-in pays once ──
ps._questKills.mayor_2 = 5;
await room.webSocketMessage(ws, JSON.stringify({ type: 'quest_turn_in', payload: { questId: 'mayor_2', xpCat: 'sword' } }));
check('met turn-in pays and completes', ps._quests.mayor_2 === 'turnedIn' && (ps.coins || 0) === coinsBefore + 100, { q: ps._quests.mayor_2, coins: ps.coins });
check('turn-in unlocks the next chain entry', ps._quests.mayor_3 === 'available', ps._quests);
const coinsAfter = ps.coins;
await room.webSocketMessage(ws, JSON.stringify({ type: 'quest_turn_in', payload: { questId: 'mayor_2', xpCat: 'sword' } }));
check('replayed turn-in pays nothing', ps.coins === coinsAfter);

// ── 5. v2.3.3179: what the worker can't check is not paid for nothing ──
// 22 quests belong to givers who are not in the world (data.js
// QUEST_DORMANT) and 21 of those have no objective, so a brand-new character
// was paid for them on request.  The Mayor's own unchecked quests (mayor_1,
// mayor_3) wait for the first quest, and a later step waits for the CHECKED
// step before it.
await room.webSocketMessage(ws, JSON.stringify({ type: 'quest_turn_in', payload: { questId: 'trader_1', xpCat: 'sword' } }));
check('an unchecked quest whose giver is not in the world is not paid (trader_1)', ps._quests.trader_1 === 'active' && ps.coins === coinsAfter, { q: ps._quests.trader_1, coins: ps.coins });
{
  const wsN = fakeWs('new');
  await join(wsN, 'bp_quest_new');
  const N = room.playerState['bp_quest_new'];
  const send = (type, questId) => room.webSocketMessage(wsN, JSON.stringify({ type, payload: { questId, xpCat: 'sword' } }));
  const unchecked = Object.keys(QUEST_REWARDS).filter((q) => !QUEST_REWARDS[q].objective);
  check('setup: 23 quests have no objective the worker can check', unchecked.length === 23, unchecked.length);
  const coins0 = N.coins, ap0 = N.achievementPoints || 0;
  for (const q of unchecked) { await send('quest_accept', q); await send('quest_turn_in', q); }
  check('a new character asking for all 23 is paid nothing (was 5,025 coins + 115 AP)', N.coins === coins0 && (N.achievementPoints || 0) === ap0, { coins: N.coins - coins0, ap: (N.achievementPoints || 0) - ap0 });
  check('...and none of them is even taken', unchecked.every((q) => !N._quests[q]), N._quests);

  // the giver is gone: refused even after the first quest, and at the hand-in
  N._quests.tut_1 = 'turnedIn';
  const gone = ['trader_1', 'enchant_3', 'ash_4', 'bron_4', 'trader_2'];
  for (const q of gone) await send('quest_accept', q);
  check('a quest whose giver is not in the world is never taken, first quest or not', gone.every((q) => !N._quests[q]), N._quests);
  N._quests.ash_4 = 'active';                       // accepted before this rule
  const coinsG = N.coins;
  await send('quest_turn_in', 'ash_4');
  check('...nor handed in when an old save has it active (800 coins)', N._quests.ash_4 === 'active' && N.coins === coinsG, { q: N._quests.ash_4, coins: N.coins - coinsG });

  // the Mayor's unchecked quests wait for the first quest
  const wsSent = () => wsN.sent.filter((m) => m.type === 'player_state' && m.payload && m.payload._quests).length;
  N._quests.tut_1 = 'active';
  const echo0 = wsSent();
  await send('quest_accept', 'mayor_1');
  check('mayor_1 (no objective) is not taken before the first quest is handed in', !N._quests.mayor_1, N._quests.mayor_1);
  check('...and the refusal sends the quest list back (the game drew it taken)', wsSent() > echo0, wsSent() - echo0);
  N._quests.mayor_1 = 'active';                     // an old save
  const coinsM = N.coins;
  await send('quest_turn_in', 'mayor_1');
  check('...nor handed in before it', N._quests.mayor_1 === 'active' && N.coins === coinsM, { q: N._quests.mayor_1, coins: N.coins - coinsM });
  N._quests.tut_1 = 'turnedIn';
  await send('quest_turn_in', 'mayor_1');
  check('...and once the first quest is in, mayor_1 pays its 50 as before', N._quests.mayor_1 === 'turnedIn' && N.coins === coinsM + 50, { q: N._quests.mayor_1, coins: N.coins - coinsM });

  // a step behind a CHECKED step waits for it
  delete N._quests.mayor_2;
  await send('quest_accept', 'mayor_3');
  check('mayor_3 (300 g) is not taken ahead of mayor_2\'s five kills', !N._quests.mayor_3, N._quests.mayor_3);
  await send('quest_accept', 'tut_4');
  check('tut_4 is not taken ahead of tut_3', !N._quests.tut_4, N._quests.tut_4);
  N._quests.mayor_1 = undefined; delete N._quests.mayor_1;
  await send('quest_accept', 'mayor_2');
  check('mayor_2 is still taken with mayor_1 not done (unchecked; the Mayor offers it while mayor_1 is hidden)', N._quests.mayor_2 === 'active', N._quests.mayor_2);
  N._questKills = N._questKills || {};
  N._questKills.mayor_2 = 5;
  await send('quest_turn_in', 'mayor_2');
  check('...handing mayor_2 in opens mayor_3', N._quests.mayor_2 === 'turnedIn' && N._quests.mayor_3 === 'available', N._quests);
  const coins3 = N.coins;
  await send('quest_accept', 'mayor_3');
  await send('quest_turn_in', 'mayor_3');
  check('...and mayor_3 is taken and paid as before (300)', N._quests.mayor_3 === 'turnedIn' && N.coins === coins3 + 300, { q: N._quests.mayor_3, coins: N.coins - coins3 });
}

// ── 7. v2.3.1214 (item H): an inherited-property questId can't farm the
// unconditional AP reward or pollute _quests.  Before the own-property
// guard, QUEST_REWARDS['constructor'] resolved to a truthy Object.proto
// member, so accept+turn-in on 'constructor'/'toString'/etc. handed out
// QUEST_AP_REWARD each on a junk id (objective/gold/xp all undefined). ──
{
  const apBefore = ps.achievementPoints || 0;
  const coinsPre = ps.coins;
  for (const bad of ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'valueOf']) {
    await room.webSocketMessage(ws, JSON.stringify({ type: 'quest_accept', payload: { questId: bad } }));
    await room.webSocketMessage(ws, JSON.stringify({ type: 'quest_turn_in', payload: { questId: bad } }));
  }
  check('inherited-key questIds are rejected (no AP farm, no coins, no _quests pollution)',
    (ps.achievementPoints || 0) === apBefore && ps.coins === coinsPre
    && !Object.prototype.hasOwnProperty.call(ps._quests, 'constructor')
    && !Object.prototype.hasOwnProperty.call(ps._quests, 'toString')
    && !Object.prototype.hasOwnProperty.call(ps._quests, 'valueOf'),
    { ap: ps.achievementPoints, coins: ps.coins });
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
