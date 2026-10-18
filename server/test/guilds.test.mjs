/* Guild-quest verification test (v2.3.1128, PR11 half 2).  The guild
 * quest ladder ("Reach LvN in this skill") used to be a pure client
 * button that minted its own gold + AP (GuildPanel).  Turn-ins are now
 * verified against the SERVER's lifeSkills levels with claims counted
 * under guild_claims:<pid>.  Checks:
 *   1. caps.guilds advertised in state_sync.
 *   2. Ladder progression: rung 0 then rung 1 pay the table amounts
 *      (gold to coins, ap to achievementPoints) with private
 *      guild_quest_result events carrying the claimed index.
 *   3. Claims persist under guild_claims:<pid> (not the rpg blob).
 *   4. The level gate rejects an under-leveled rung; a replayed
 *      turn-in meets the NEXT rung's requirement (no double-pay).
 *   5. Unknown skills, dying players, and a finished ladder reject.
 *   6. Forged guild_quest_result is not rebroadcast (deny-list).
 */
import { GameRoom } from '../src/index.js';
import { GUILD_QUESTS } from '../src/data.js';

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
function msgsOfType(ws, type) { return ws.sent.filter((m) => m.type === type); }

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const state = makeState();
const room = new GameRoom(state, mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, data: { x: 0, y: 0, z: 'town' } }));
}
const turnIn = (ws, skill) => room.webSocketMessage(ws, JSON.stringify({ type: 'guild_quest_turn_in', payload: { skill } }));

const ws = fakeWs('g');
await join(ws, 'bp_gq_p');
const ps = room.playerState['bp_gq_p'];
ps.coins = 0;
ps.achievementPoints = 0;
ps.lifeSkills = { fishing: { level: 20, xp: 0 } };

// ── 1. caps ──
const sync = ws.sent.find((m) => m.type === 'state_sync');
check('state_sync advertises caps.guilds', sync && sync.caps && sync.caps.guilds === true, sync && sync.caps);

// ── 2+3. ladder progression ──
ws.sent.length = 0;
await turnIn(ws, 'fishing');
let res = msgsOfType(ws, 'guild_quest_result');
check('rung 0 pays the table amounts', ps.coins === GUILD_QUESTS[0].gold && ps.achievementPoints === GUILD_QUESTS[0].ap && res.length === 1 && res[0].payload.index === 0 && res[0].payload.gold === GUILD_QUESTS[0].gold, { coins: ps.coins, ap: ps.achievementPoints, res: res.map((r) => r.payload) });
ws.sent.length = 0;
await turnIn(ws, 'fishing');
res = msgsOfType(ws, 'guild_quest_result');
check('rung 1 pays and advances', ps.coins === GUILD_QUESTS[0].gold + GUILD_QUESTS[1].gold && ps.achievementPoints === GUILD_QUESTS[0].ap + GUILD_QUESTS[1].ap && res.length === 1 && res[0].payload.index === 1, { coins: ps.coins, ap: ps.achievementPoints });
const claims = await state.storage.get('guild_claims:bp_gq_p');
check('claims persisted under guild_claims:<pid>', claims && claims.fishing === 2, claims);

// ── 4. level gate + replay safety ──
const coinsBefore = ps.coins;
ws.sent.length = 0;
await turnIn(ws, 'fishing'); // rung 2 needs Lv30, we're Lv20
let errs = msgsOfType(ws, 'guild_quest_error');
check('under-leveled rung rejected (replay-safe ladder)', errs.length === 1 && errs[0].payload.code === 'not-ready' && ps.coins === coinsBefore && msgsOfType(ws, 'guild_quest_result').length === 0, errs.map((e) => e.payload));

// ── 5. unknown skill / dying / finished ladder ──
ws.sent.length = 0;
await turnIn(ws, 'hacking');
check('unknown skill rejected', msgsOfType(ws, 'guild_quest_error')[0].payload.code === 'bad-skill' && ps.coins === coinsBefore);
ps.dying = true;
ws.sent.length = 0;
await turnIn(ws, 'fishing');
check('dying player rejected', msgsOfType(ws, 'guild_quest_error')[0].payload.code === 'not-now');
ps.dying = false;
await state.storage.put('guild_claims:bp_gq_p', { fishing: GUILD_QUESTS.length });
ws.sent.length = 0;
await turnIn(ws, 'fishing');
check('finished ladder rejected', msgsOfType(ws, 'guild_quest_error')[0].payload.code === 'done' && ps.coins === coinsBefore);

// ── another skill's ladder is independent ──
ps.lifeSkills.mining = { level: 5, xp: 0 };
ws.sent.length = 0;
await turnIn(ws, 'mining');
check('per-skill ladders are independent', msgsOfType(ws, 'guild_quest_result')[0].payload.index === 0 && ps.coins === coinsBefore + GUILD_QUESTS[0].gold, ps.coins);

// ── 6. forged guild_quest_result denied ──
const ws2 = fakeWs('peer');
await join(ws2, 'bp_gq_peer');
room.eventBuffer.length = 0;
await room.webSocketMessage(ws2, JSON.stringify({ type: 'guild_quest_result', payload: { skill: 'fishing', index: 7, gold: 2000, ap: 750 } }));
check('forged guild_quest_result dropped by deny-list', room.eventBuffer.filter((e) => e.type === 'guild_quest_result').length === 0, room.eventBuffer.map((e) => e.type));

// ── 7. v2.3.3369: the claim and the pay are one write ──
// The claim was put and awaited before the rung's gold and AP were saved, so a
// restart between the two (every merge restarts the room) kept the claim and
// lost the pay (the architecture review).  A storage where every write of one
// synchronous run commits as ONE batch, as a Durable Object's does, and the
// room dies before batch `crashAt` (inbox.test §8c's): at every batch the
// turn-in makes, the claim is on file exactly when the rung is paid.
{
  const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
  const mkCrashState = (seed) => {
    const store = new Map(seed ? [...seed].map(([k, v]) => [k, clone(v)]) : []);
    let pending = null, batches = 0, crashAt = Infinity, dead = false;
    const commit = () => {
      const w = pending; pending = null;
      const n = batches++;
      if (dead || n >= crashAt) { dead = true; return; }
      for (const [op, k, v] of w) { if (op === 'put') store.set(k, v); else store.delete(k); }
    };
    const write = (op, k, v) => {
      if (!pending) { pending = []; queueMicrotask(commit); }
      pending.push([op, k, clone(v)]);
    };
    const view = (k) => {
      if (pending) for (let i = pending.length - 1; i >= 0; i--) if (pending[i][1] === k) return pending[i][0] === 'put' ? clone(pending[i][2]) : undefined;
      return clone(store.get(k));
    };
    return {
      _store: store,
      batches: () => batches,
      crashAt(n) { crashAt = n; },
      storage: {
        get: async (k) => view(k),
        put: async (k, v) => {
          if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) write('put', kk, vv); return; }
          write('put', k, v);
        },
        delete: async (k) => { for (const x of (Array.isArray(k) ? k : [k])) write('del', x); return true; },
        list: async (opts) => { const out = new Map(); for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, clone(v)); return out; },
      },
      getWebSockets: () => [],
      acceptWebSocket: () => {},
    };
  };
  const settleIo = () => new Promise((r) => setTimeout(r, 5));
  const P = 'bp_gq_crash';
  const joinOn = async (rm, w) => {
    rm.sessions.set(w, baseSession());
    await rm.webSocketMessage(w, JSON.stringify({ type: 'join', id: P, name: 'T', phrase: 'p-' + P, data: { x: 0, y: 0, z: 'town' } }));
    await settleIo();
  };
  // a saved player at Fishing 20 with no gold, AP or claims
  const s0 = mkCrashState();
  const r0 = new GameRoom(s0, mockEnv);
  await joinOn(r0, fakeWs('w0'));
  Object.assign(r0.playerState[P], { coins: 0, achievementPoints: 0, lifeSkills: { fishing: { level: 20, xp: 0 } } });
  r0._saveRpg(P, r0.playerState[P]);
  await settleIo();
  const store = s0._store;
  const G = GUILD_QUESTS[0];
  const run = async (k) => {
    const s1 = mkCrashState(store);
    const r1 = new GameRoom(s1, mockEnv);
    const w1 = fakeWs('w1');
    await joinOn(r1, w1);
    const b0 = s1.batches();
    s1.crashAt(k === Infinity ? Infinity : b0 + k);
    await r1.webSocketMessage(w1, JSON.stringify({ type: 'guild_quest_turn_in', payload: { skill: 'fishing' } }));
    await settleIo();
    const rec = s1._store.get('rpg:' + P) || {};
    const cl = s1._store.get('guild_claims:' + P) || {};
    return { batches: s1.batches() - b0, claimed: cl.fishing || 0, coins: rec.coins || 0, ap: rec.achievementPoints || 0 };
  };
  const dry = await run(Infinity);
  check('7. with no restart the rung is claimed and paid', dry.claimed === 1 && dry.coins === G.gold && dry.ap === G.ap, dry);
  const wrong = [];
  for (let k = 0; k <= dry.batches; k++) {
    const r = await run(k);
    const paid = r.coins === G.gold && r.ap === G.ap;
    const none = r.coins === 0 && r.ap === 0;
    if (!((r.claimed === 1 && paid) || (r.claimed === 0 && none))) wrong.push({ crashAt: k, ...r });
  }
  check('7. a restart at any write keeps the claim exactly when the rung is paid (never claimed and unpaid)', wrong.length === 0 && dry.batches >= 1, { batches: dry.batches, wrong });
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
