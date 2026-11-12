/* A quest hand-in the worker refused is taken back, all of it -- v2.3.4940
 * (lane 3, "the phone shows results before the worker answers").
 *
 * The Claim tap draws the hand-in at once; the worker's refusal echo
 * (quests.js _questRefusedEcho) puts back the quest map, coins, XP and
 * points, but the page's own counters stayed raised and the confirmation
 * window went on to open the next quest the prediction had unlocked.  This
 * plays the REAL src/game/questHandIn.js against a REAL GameRoom:
 *   1. a refused hand-in (the goal not met): the worker's echo carries the
 *      quest map, the phone's settle reads it as refused and takes the
 *      counters back; the window reopens this quest, not the next;
 *   2. a paid hand-in: settled as paid, the counters stay, the next opens;
 *   3. nothing noted: a quest map settles nothing;
 *   4. the wiring: quests.js notes a hand-in that went, wsClient settles at
 *      the quest map's adoption, QuestPanel asks claimNext. */
import { readFileSync } from 'node:fs';
import { GameRoom } from '../src/index.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}
const src = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');

let Q = {};
try { Q = await import('../../src/game/questHandIn.js'); } catch (e) { Q = {}; }
check('0 questHandIn.js exports its rules', ['noteHandIn', 'settleHandIns', 'claimNext', 'pendingHandInCount', 'clearHandIns'].every((f) => typeof Q[f] === 'function'), Object.keys(Q));

if (typeof Q.noteHandIn === 'function') {
  const store = new Map();
  const state = {
    storage: {
      get: async (k) => store.get(k), put: async (k, v) => { if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) store.set(kk, vv); } else store.set(k, v); },
      list: async (o) => { const m = new Map(); for (const [k, v] of store) if (!o?.prefix || k.startsWith(o.prefix)) m.set(k, v); return m; },
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [], acceptWebSocket: () => {},
  };
  const env = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
  const R = new GameRoom(state, env);
  const ws = { sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} };
  const ID = 'bp_quest_handin';
  R.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
  await R.webSocketMessage(ws, JSON.stringify({ type: 'join', id: ID, name: 'Hand', protocolVersion: 2, ws: [1, 5], data: { x: 1000, y: 1000, z: 'town' } }));
  const ps = R.playerState[ID];
  check('setup: a v2 player joined', !!ps);

  /* the phone's copy, and what the Claim tap draws (quests.js turnInQuest) */
  const rewards = R._QUEST_REWARDS_DATA();
  const qid = 'mayor_3';
  const gold = (rewards[qid] && rewards[qid].gold) || 0;
  ps._quests = Object.assign(Object.create(null), { [qid]: 'active' });
  const phone = { _quests: { [qid]: 'active' }, coins: ps.coins, _compStats: { questsCompleted: 4, totalGoldEarned: 100 } };
  const panel = { npc: 'Mayor Bro', quest: { id: qid, next: rewards[qid] && rewards[qid].next, reward: { gold } }, status: 'active' };
  const predictedNext = { npc: 'Mayor Bro', quest: { id: 'next_one' }, status: 'available' };
  const tap = () => {
    phone._quests[qid] = 'turnedIn';
    if (panel.quest.next) phone._quests[panel.quest.next] = 'available';
    phone.coins += gold;
    phone._compStats.questsCompleted++;
    phone._compStats.totalGoldEarned += gold;
    Q.noteHandIn(qid, gold);
  };
  /* the phone's adoption (wsClient.js player_state) */
  const adopt = () => {
    let refused = [];
    for (const m of ws.sent) {
      if (m.type !== 'player_state' || !m.payload) continue;
      if (typeof m.payload.coins === 'number') phone.coins = m.payload.coins;
      if (m.payload._quests && typeof m.payload._quests === 'object') {
        phone._quests = m.payload._quests;
        refused = refused.concat(Q.settleHandIns(phone, m.payload._quests));
      }
    }
    return refused;
  };

  /* 1. refused: the goal is not met */
  Q.clearHandIns();
  R._sendPlayerState(ws, ID);
  const coins0 = ps.coins;
  ws.sent.length = 0;
  tap();
  await R.webSocketMessage(ws, JSON.stringify({ type: 'quest_turn_in', payload: { questId: qid, xpCat: 'sword' } }));
  check('1 the worker refused it (still active on its record)', ps._quests[qid] === 'active', ps._quests[qid]);
  const refused = adopt();
  check('1 the echo carried the quest map, and settle read it as refused', refused.length === 1 && refused[0] === qid, refused);
  check('1 the quest is active again, the next not unlocked, the coins back', phone._quests[qid] === 'active'
    && !(panel.quest.next && phone._quests[panel.quest.next] === 'available') && phone.coins === coins0, phone);
  check('1 the counters taken back', phone._compStats.questsCompleted === 4 && phone._compStats.totalGoldEarned === 100, phone._compStats);
  const np = Q.claimNext(phone, panel, predictedNext);
  check('1 the window reopens THIS quest, active (its Claim button back), not the predicted next', !!np && np.quest.id === qid && np.status === 'active', np);
  check('1 nothing left waiting', Q.pendingHandInCount() === 0);

  /* 2. paid: the same settle on a map that says handed in */
  phone._compStats = { questsCompleted: 4, totalGoldEarned: 100 };
  tap();
  const paid = Q.settleHandIns(phone, { [qid]: 'turnedIn' });
  check('2 a paid hand-in settles as paid, the counters stay', paid.length === 0 && phone._compStats.questsCompleted === 5, phone._compStats);
  phone._quests = { [qid]: 'turnedIn' };
  check('2 the window opens the next quest', Q.claimNext(phone, panel, predictedNext) === predictedNext);

  /* 3. nothing noted settles nothing */
  check('3 a quest map with nothing noted settles nothing', Q.settleHandIns(phone, { [qid]: 'active' }).length === 0 && phone._compStats.questsCompleted === 5);
  check('3 a map that never had the quest: the window closes', Q.claimNext({ _quests: {} }, panel, predictedNext) === null);
}

/* 4. the wiring */
{
  const qs = src('src/game/quests.js');
  check('4 quests.js notes a hand-in only when the channel took it', /var _went = sendQuestMsg\(_Sqt, \{ type: 'quest_turn_in'/.test(qs) && /if \(_went\) noteHandIn\(/.test(qs));
  const wc = src('src/networking/wsClient.js');
  check('4 wsClient settles where it adopts the quest map', /S\.rpg\._quests = msg\.payload\._quests;[\s\S]{0,400}settleHandIns\(S\.rpg, msg\.payload\._quests\)/.test(wc));
  const qp = src('src/ui/panels/QuestPanel.jsx');
  check('4 QuestPanel asks claimNext before opening the next quest', /claimNext\(stateRef\.current && stateRef\.current\.rpg, questPanel, c\.next\)/.test(qp) && !/setQuestPanel\(c\.next \|\| null\)/.test(qp));
}

console.log(`\nquest-handin: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
