/* A quest tap made while the connection is down is kept -- v2.3.4629 (TRAPS
 * §287: "stats_update and the quest taps still ignore the answer"; the
 * state-machine sweep's "what is left", docs/STATE-MACHINES.md).
 *
 * The phone's channel drops a message while the socket is not open and says
 * so (`false`); the quest taps sent and showed QUEST ACCEPTED or the reward,
 * the worker never heard, and the rejoin took it back.  This plays the REAL
 * src/game/questKept.js against a REAL GameRoom, the channel a stand-in that
 * drops while "down" (false) and answers nothing when it sends, as the shim's
 * quest path does:
 *   1. connected: an accept goes at once and nothing is kept;
 *   2. down: an accept is kept, not sent; on the rejoin it goes once and the
 *      worker has the quest;
 *   3. an accept and its hand-in in one gap go in that order;
 *   4. a later rejoin sends nothing again;
 *   5. down again during the rejoin: the rest wait, in order;
 *   6. the wiring: quests.js sends both taps through it, wsClient's state_sync
 *      sends what is kept, and BroTown's stats_update keeps its signature only
 *      when the channel took the message. */
import { readFileSync } from 'node:fs';
import { GameRoom } from '../src/index.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}
const src = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');

let K = {};
try { K = await import('../../src/game/questKept.js'); } catch (e) { K = {}; }
check('0 questKept.js exports its rules', ['sendQuestMsg', 'resendKeptQuests', 'keptQuestCount', 'clearKeptQuests'].every((f) => typeof K[f] === 'function'), Object.keys(K));

function makeState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => store.get(k), put: async (k, v) => { store.set(k, v); },
      list: async (o) => { const m = new Map(); for (const [k, v] of store) if (!o?.prefix || k.startsWith(o.prefix)) m.set(k, v); return m; },
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [], acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
const room = new GameRoom(makeState(), mockEnv);
const ws = { sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} };
const ID = 'bp_questkept';
room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now(), protocolVersion: 2 });
await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id: ID, name: 'Kept', phrase: 'p-kept', ws: [1, 5], protocolVersion: 2, data: { x: 0, y: 0, z: 'town' } }));
const ps = room.playerState[ID];

/* the phone's channel: down -> false (dropped); up -> into the room, answering
   nothing (the shim's quest path: wsOut, then return) */
let up = true;
const sent = [];
const S = { channel: { send(msg) { if (!up) return false; sent.push(msg); room.webSocketMessage(ws, JSON.stringify(msg)); return undefined; } } };
const settle = () => new Promise((r) => setTimeout(r, 20));
const quest = (id) => ps._quests && ps._quests[id];
/* the first quest of the chain, which a new character takes from nothing */
const Q1 = 'tut_1';
check('setup: a new character has not taken the first quest yet', !!ps && quest(Q1) !== 'active' && quest(Q1) !== 'turnedIn', ps && ps._quests);

if (Q1 && K.sendQuestMsg) {
  K.clearKeptQuests();
  /* 2. down: kept, not sent */
  up = false;
  const ok = K.sendQuestMsg(S, { type: 'quest_accept', payload: { questId: Q1 } });
  await settle();
  check('2a down: the accept is not sent, and is kept', ok === false && sent.length === 0 && K.keptQuestCount() === 1 && quest(Q1) !== 'active', { ok, kept: K.keptQuestCount(), q: quest(Q1) });
  /* the rejoin */
  up = true;
  const n = K.resendKeptQuests(S);
  await settle();
  check('2b on the rejoin it goes, once, and the worker has the quest', n === 1 && sent.length === 1 && sent[0].type === 'quest_accept' && K.keptQuestCount() === 0 && quest(Q1) === 'active', { n, sent: sent.length, q: quest(Q1) });
  /* 4. a later rejoin sends nothing */
  const n2 = K.resendKeptQuests(S);
  check('4 a later rejoin sends nothing again', n2 === 0 && sent.length === 1);
  /* 1. connected: at once, nothing kept */
  sent.length = 0;
  const ok1 = K.sendQuestMsg(S, { type: 'quest_accept', payload: { questId: Q1 } });
  check('1 connected: it goes at once and nothing is kept (the worker judges a repeat)', ok1 === true && sent.length === 1 && K.keptQuestCount() === 0);
  /* 3 and 5: order, and down again mid-rejoin */
  sent.length = 0;
  up = false;
  K.sendQuestMsg(S, { type: 'quest_accept', payload: { questId: 'qa' } });
  K.sendQuestMsg(S, { type: 'quest_turn_in', payload: { questId: 'qa', xpCat: 'sword' } });
  K.sendQuestMsg(S, { type: 'quest_accept', payload: { questId: 'qa' } });   /* the same tap again: one kept */
  check('3a in one gap: an accept and its hand-in are kept, one each', K.keptQuestCount() === 2);
  let calls = 0;
  const S2 = { channel: { send(msg) { calls++; if (calls > 1) return false; sent.push(msg); return undefined; } } };
  const n3 = K.resendKeptQuests(S2);
  check('5 down again during the rejoin: the first went, the rest wait in order', n3 === 1 && sent.length === 1 && sent[0].type === 'quest_accept' && K.keptQuestCount() === 1);
  up = true;
  sent.length = 0;
  const S3 = { channel: { send(msg) { sent.push(msg); return undefined; } } };
  K.resendKeptQuests(S3);
  check('3b ...and the hand-in follows on the next', sent.length === 1 && sent[0].type === 'quest_turn_in' && K.keptQuestCount() === 0);
  check('7 anything but a quest tap is not its business', K.sendQuestMsg(S3, { type: 'stats_update', payload: {} }) === false && K.keptQuestCount() === 0);
}

/* 6. the wiring */
{
  const Q = src('src/game/quests.js');
  check('6a quests.js sends Accept and Hand in through it', /sendQuestMsg\(_Sqa, \{ type: 'quest_accept'/.test(Q) && /sendQuestMsg\(_Sqt, \{ type: 'quest_turn_in'/.test(Q) && !/channel\.send\(\{ type: 'quest_(accept|turn_in)'/.test(Q));
  const W = src('src/networking/wsClient.js');
  const at = W.indexOf("case 'state_sync':");
  check('6b wsClient\'s state_sync sends what is kept', at > 0 && W.indexOf('resendKeptQuests(S)', at) > at && W.indexOf('resendKeptQuests(S)', at) - at < 20000);
  const B = src('src/ui/BroTown.jsx');
  check('6c stats_update keeps its signature only when the channel took it', /const _went = S\.channel\.send\(\{\s*type: 'stats_update'/.test(B) && /if \(_went !== false\) S\._lastStatsUpdateSig = _sig;/.test(B)
    && !/S\._lastStatsUpdateSig = _sig;\s*try \{\s*\S*\s*S\.channel\.send\(\{\s*type: 'stats_update'/.test(B));
}
console.log(`\nquest-kept: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
