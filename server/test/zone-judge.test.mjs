/* THE WORKER JUDGES A CHANGE OF PLACE -- v2.3.4620
 * (server/src/zonejudge.js; the gate in movement.js _handleMove; the passes
 * in dungeon.js; docs/specs/zone-judge.md).
 *
 * A phone's move names its zone, and the worker took it ("a zone change is
 * never judged"): a modified phone losing a fight in No man's land left it,
 * and the bag the killer should take, by naming another place.  Against the
 * real GameRoom, through the real move handler:
 *
 *   1. NO MAN'S LAND: a player losing a fight with another player cannot
 *      leave by naming today's town, the farm, the old World View, an old
 *      land, the endgame pair or someone else's live run -- each refused,
 *      nothing written (zone, place, grace, lists, budget, snapshot) -- and
 *      the killer's blow lands and takes the gold, as the rule says;
 *   2. off the safe ground, in no fight, the same (no "anywhere at all");
 *      the next move is judged from where the worker had them;
 *   3. EVERY HONEST ROAD in the inventory still changes place: the way in
 *      down the stairs, the farm trip from the safe ground and its gate home,
 *      `?wayback`, the respawn, a Wheel dungeon's mouth and its door out, the
 *      party's pull, the Workshop's run, a reconnect behind the dungeon's
 *      loading screen, the slowest honest step in;
 *   4. THE PASS: used once, for its own run, within PASS_MS; a stranger with
 *      none is refused; a pass opens no other road out of the Wheel;
 *   5. a v1 phone, a test-mode character and a phone out of step fare as the
 *      rule says;
 *   6. the kill switch `zonejudge: false` is today, and the overview's count;
 *   7. the inventory's own ground: the farm's doors stand on the safe ground.
 */
import fs from 'node:fs';
import { GameRoom } from '../src/index.js';
import { ZONE_JUDGE } from '../src/zonejudge.js';
import { QUEST_ZONE_GATE } from '../src/movement.js';
import { NML } from '../src/nomansland.js';
import { WHEEL_ZONE } from '../src/wheelzone.js';
import { WHEEL_DUNGEON } from '../src/wheeldungeon.js';
import { WHEEL_SAFE_R as SAFE_LONG, WHEEL_CENTRE as CENTRE_LONG } from '../src/wheelspawns.js';
import { WHEEL_SAFE_R as SAFE_SHORT, WHEEL_CENTRE as CENTRE_SHORT } from '../src/wheelspawns1.js';
import { flagNameOk } from '../src/liveops.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + ' ' + JSON.stringify(detail === undefined ? {} : detail)); }
}

/* the worker's clock and dice are the test's: sure hits, no dodge */
let T = 1_900_000_000_000;
Date.now = () => T;
Math.random = () => 0.999;

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
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs() { return { sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }
const sentOf = (ws, type) => ws.sent.filter((m) => m && m.type === type);
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

const room = new GameRoom(makeState(), mockEnv);
const WS = {};
async function join(pid, z, x, y, extra) {
  if (room._pvpHealClocks) room._pvpHealClocks.delete(pid);
  const ws = fakeWs();
  WS[pid] = ws;
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 0, lastPing: 0, lastRecv: T });
  await room.webSocketMessage(ws, JSON.stringify(Object.assign({ type: 'join', id: pid, name: pid, phrase: 'p-' + pid, protocolVersion: 2, ws: [1, 5], data: { x, y, z } }, extra || {})));
  if (room.tickInterval) { clearInterval(room.tickInterval); room.tickInterval = null; }
  return room.playerState[pid];
}
const ps = (pid) => room.playerState[pid];

/* A move as the phone sends it.  `ba` is new on every move (never repeating:
   a cycle of six once read a refused move as taken) so the test can see
   whether the move was ACCEPTED (an accepted move writes ps.ba). */
let baSeq = 0;
async function move(pid, z, x, y) {
  const p = ps(pid);
  const ba = 0.1 + (++baSeq) * 1e-4;
  T += 120;
  await room.webSocketMessage(WS[pid], JSON.stringify({ type: 'move', x: x === undefined ? p.x : x, y: y === undefined ? p.y : y,
    d: 'down', f: 'south', z, vx: 0, vy: 0, dodging: false, blocking: false, ba, ex: null }));
  return p.ba === ba;
}
/* the worker puts a player somewhere itself (a test's setup, never a road) */
const put = (p, z, x, y) => { p.z = z; p.x = x; p.y = y; p.dead = false; p.dying = false; p._zoneEntryGraceUntil = 0; p._mvFollow = undefined; };
/* every run but the other player's (OTHER_RUN, which stays open throughout) */
const endRuns = () => { for (const inst of [...(room._dungeons || new Map()).values()]) if (inst.ownerId !== 'bp_zj_o') room._dungeonCleanup(inst); };
const refusedN = (k) => (room._zoneJudgeInfo ? room._zoneJudgeInfo().refused[k] || 0 : 0);

/* the Wheel this room plays, read from the worker (never a coordinate here) */
const WT = room._wheelT();
const C = WT.WHEEL_CENTRE, SAFE_R = WT.WHEEL_SAFE_R;
const ARRIVAL = room._wheelArrival();
const at = (r, dy = 0) => ({ x: C[0] + r, y: C[1] + dy });
check('setup: the room plays a Wheel with a safe ground and an arrival on it', Array.isArray(C) && SAFE_R > 0 && !!ARRIVAL && room._wheelSafeAt(ARRIVAL.x, ARRIVAL.y));

const IDS = { f: 'bp_zj_f', k: 'bp_zj_k', h: 'bp_zj_h', s: 'bp_zj_s', l: 'bp_zj_l', p: 'bp_zj_p' };
for (const pid of Object.values(IDS)) await join(pid, 'town', 1000, 1000);
room.stateHistory = {};
check('setup: the players joined', Object.values(IDS).every((pid) => !!ps(pid)));

/* the first stretch of No man's land due east of the centre, found by the
   worker's own rule */
const F = ps(IDS.f), K = ps(IDS.k);
let NMLX = null;
for (let r = SAFE_R + 40; r < SAFE_R + 20000; r += 40) {
  put(F, WHEEL_ZONE, at(r).x, at(r).y);
  if (room._nmlLevelOf(F) >= 1) { NMLX = at(r + 200); break; }
}
check('setup: a spot in No man\'s land', !!NMLX);

/* someone else's live run, its id on the roster as any phone sees it */
const OWN = await join('bp_zj_o', 'farm_home', 300, 300);
OWN.level = 5;
WS.bp_zj_o.sent.length = 0;
await room.webSocketMessage(WS.bp_zj_o, JSON.stringify({ type: 'dungeon_start', payload: { config: { waves: 2, monsterLevel: 3, hasBoss: false } } }));
const OTHER_RUN = (sentOf(WS.bp_zj_o, 'dungeon_started')[0] || { payload: {} }).payload.zone;
check('setup: another player\'s run is open', typeof OTHER_RUN === 'string' && OTHER_RUN.startsWith('dungeon:'));
await move('bp_zj_o', OTHER_RUN, 200, 200);
check('setup: ...and its owner is in it', OWN.z === OTHER_RUN);

/* a hit between F and K in No man's land, through the real attack */
const attack = async (fromId, toId) => {
  const a = ps(fromId), t = ps(toId);
  room._pvpHitLanes && room._pvpHitLanes.clear();
  room.eventBuffer.length = 0;
  T += 1000;
  await room.webSocketMessage(WS[fromId], JSON.stringify({ type: 'player_attack', payload: {
    kind: 'melee', range: 200, arc: 2.5, angle: Math.atan2(t.y - a.y, t.x - a.x), dmgBase: 10, critChance: 0, target: toId } }));
  return room.eventBuffer.some((e) => e.type === 'pvp_hit' && e.payload && e.payload.target === toId);
};
const fightSetUp = async () => {
  put(F, WHEEL_ZONE, NMLX.x, NMLX.y); put(K, WHEEL_ZONE, NMLX.x - 60, NMLX.y);
  F.level = K.level = 7;
  F.hp = F.maxHp = 100000; K.hp = K.maxHp = 100000;
  return attack(IDS.k, IDS.f);
};

room._liveFlags = {};

/* ── 1. NO MAN'S LAND: the losing player cannot leave by naming a place ── */
{
  const hit = await fightSetUp();
  check('1a. (setup) F is in No man\'s land, in a fight with K', hit && room._nmlLevelOf(F) >= 1 && room._bagLockedByFight(IDS.f, T), { hit, lvl: room._nmlLevelOf(F) });
  /* the old lands open on a quest's accept: open them, so the refusal is
     the judge's and not the quest lock's */
  F._quests = F._quests || {};
  for (const [, qids] of QUEST_ZONE_GATE) F._quests[qids[0]] = 'active';
  const oldLand = [...QUEST_ZONE_GATE.keys()][0];
  check('1b. (setup) an old land F may otherwise enter', !!oldLand && room._zoneUnlocked(F, oldLand), oldLand);
  const x0 = F.x, y0 = F.y, b0 = F._mvBudget, bt0 = F._mvBudgetAt;
  const lists0 = Object.keys(room.monsters).length + Object.keys(room.nodes).length;
  WS[IDS.f].sent.length = 0;
  const tried = {};
  for (const z of ['town', 'farm_home', 'worldview', oldLand, 'shadow', OTHER_RUN]) {
    tried[z] = await move(IDS.f, z, 300, 300);
  }
  check('1c. every place named is refused: today\'s town, the farm, the World View, an old land, the endgame, someone\'s live run',
    Object.values(tried).every((ok) => !ok) && F.z === WHEEL_ZONE, { tried, z: F.z });
  check('1d. ...F stands where the worker had them', F.x === x0 && F.y === y0, { x: F.x, y: F.y });
  check('1e. ...no half second of safety is stamped', !(F._zoneEntryGraceUntil > T), { grace: F._zoneEntryGraceUntil, T });
  check('1f. ...no zone snapshot is sent', sentOf(WS[IDS.f], 'zone_state').length === 0, WS[IDS.f].sent.map((m) => m.type));
  check('1g. ...no monster or node list is made', Object.keys(room.monsters).length + Object.keys(room.nodes).length === lists0);
  check('1h. ...and the move budget is untouched', F._mvBudget === b0 && F._mvBudgetAt === bt0, { b: F._mvBudget, b0 });
  check('1i. ...F is not in the run (a death there would keep the bag)', !room._dungeonKeepsBag(F) && !room._dungeonZonePlayers(OTHER_RUN).includes(IDS.f));
  check('1j. ...each refusal counted by its road on the overview',
    refusedN('wheel>town') >= 1 && refusedN('wheel>farm_home') >= 1 && refusedN('wheel>dungeon') >= 1 && refusedN('wheel>' + oldLand) >= 1, room._zoneJudgeInfo && room._zoneJudgeInfo());
  check('1k. ...and a dungeon\'s id is never a key there', room._zoneJudgeInfo && !Object.keys(room._zoneJudgeInfo().refused).some((k) => k.includes(':')));
  /* the fight goes on: K's blow lands, and a loss pays the killer */
  check('1l. K\'s next blow lands on F', await attack(IDS.k, IDS.f));
  F.hp = 1; F.coins = 250;
  const k0 = K.coins || 0;
  await attack(IDS.k, IDS.f);
  check('1m. ...and the loss is a loss in No man\'s land: F dies and K takes the gold', F.dying === true && F.coins === 0 && (K.coins || 0) === k0 + 250,
    { dying: F.dying, f: F.coins, k: K.coins, k0 });
  T += 6000; room._tickPlayerRespawn();
  if (room._pvpHealClocks) { room._pvpHealClocks.delete(IDS.f); room._pvpHealClocks.delete(IDS.k); }
}

/* ── 2. off the safe ground, in no fight: no "anywhere at all" either ── */
{
  const p = at(SAFE_R + 300);
  put(F, WHEEL_ZONE, p.x, p.y);
  F.hp = F.maxHp;
  await move(IDS.f, WHEEL_ZONE, p.x, p.y);   /* a step there: the respawn above left no last move to judge from */
  check('2a. (setup) F off the safe ground, in no fight', !room._wheelSafeAt(F.x, F.y) && !room._bagLockedByFight(IDS.f, T));
  check('2b. a move naming today\'s town is refused', !(await move(IDS.f, 'town', 1000, 1000)) && F.z === WHEEL_ZONE && F.x === p.x);
  check('2c. ...and so is the farm', !(await move(IDS.f, 'farm_home', 300, 300)) && F.z === WHEEL_ZONE);
  /* the next move in the Wheel is judged from where the worker had them:
     a far one is followed, never taken whole */
  T += 100;
  await move(IDS.f, WHEEL_ZONE, p.x + 30000, p.y);
  const cap = room._moveSpeedK ? 500 * 3 + 80 + 600 : 2200;
  check('2d. ...the next move is judged from where the worker had them (followed, not a teleport)', F.x - p.x > 0 && F.x - p.x <= cap, { moved: F.x - p.x, cap });
  F._mvFollow = undefined;
}

/* ── 3. every honest road still changes place ── */
const H = ps(IDS.h);
{
  /* the way in, down today's town's stairs (every login, death and way back) */
  put(H, 'town', 1000, 1000);
  check('3a. town -> the Wheel at its arrival (the stairs) is taken', await move(IDS.h, WHEEL_ZONE, ARRIVAL.x, ARRIVAL.y) && H.z === WHEEL_ZONE);
  /* the farm trip, from a door on the safe ground: the Land Office's
     "Travel to Farm", the Feed & Seed's "Visit Your Farm" */
  const door = at(-1400, 0);
  T += 5000; await move(IDS.h, WHEEL_ZONE, door.x, door.y);
  check('3b. (setup) H walked to a door in Brotown, on the safe ground', H.x === door.x && room._wheelSafeAt(H.x, H.y), { x: H.x });
  WS[IDS.h].sent.length = 0;
  check('3c. the farm trip from the safe ground is taken', await move(IDS.h, 'farm_home', 300, 300) && H.z === 'farm_home');
  check('3d. ...with the farm\'s empty snapshot, as before', sentOf(WS[IDS.h], 'zone_state').some((m) => m.zone === 'farm_home'));
  check('3e. the farm\'s gate home (today\'s town) is taken', await move(IDS.h, 'town', 800, 800) && H.z === 'town');
  check('3f. ...and down the stairs to where H left the Wheel', await move(IDS.h, WHEEL_ZONE, door.x, door.y) && H.z === WHEEL_ZONE && H.x === door.x);
  /* just inside the safe ground's edge, and just outside it */
  const inEdge = at(SAFE_R - 60), outEdge = at(SAFE_R + 60);
  put(H, WHEEL_ZONE, inEdge.x, inEdge.y);
  check('3g. the farm from just inside the safe ground\'s edge is taken', await move(IDS.h, 'farm_home', 300, 300) && H.z === 'farm_home');
  put(H, WHEEL_ZONE, outEdge.x, outEdge.y);
  check('3h. ...from just outside it, refused', !(await move(IDS.h, 'farm_home', 300, 300)) && H.z === WHEEL_ZONE);
  /* ?wayback: the exit beside the arrival (QA) */
  put(H, WHEEL_ZONE, ARRIVAL.x, ARRIVAL.y);
  check('3i. `?wayback`\'s exit beside the arrival to today\'s town is taken', await move(IDS.h, 'town', 1000, 1000) && H.z === 'town');
  /* the respawn: the worker writes town itself; the phone's move is no change */
  put(H, WHEEL_ZONE, outEdge.x + 2000, outEdge.y);
  H.hp = 0;
  room._handlePlayerDeath(H, IDS.h, 'monster:x');
  T += 6000; room._tickPlayerRespawn();
  const r0 = room._zoneJudgeInfo ? JSON.stringify(room._zoneJudgeInfo().refused) : '';
  check('3j. a death far out: the respawn puts H in today\'s town', H.z === 'town' && !H.dying, { z: H.z });
  check('3k. ...the phone\'s move there is no change, and the stairs back in are taken',
    await move(IDS.h, 'town', 1000, 1000) && await move(IDS.h, WHEEL_ZONE, ARRIVAL.x, ARRIVAL.y) && H.z === WHEEL_ZONE
    && (!room._zoneJudgeInfo || JSON.stringify(room._zoneJudgeInfo().refused) === r0));
}
{
  /* a Wheel dungeon's mouth, in and back out of its door */
  endRuns();
  const door = room._wheelDoor('verdant');
  put(H, WHEEL_ZONE, door.at[0], door.at[1]);
  H.level = 10;
  WS[IDS.h].sent.length = 0;
  await room.webSocketMessage(WS[IDS.h], JSON.stringify({ type: 'dungeon_start', payload: { entrance: 'verdant' } }));
  const Z = (sentOf(WS[IDS.h], 'dungeon_started')[0] || { payload: {} }).payload.zone;
  check('3l. (setup) the mouth opens a run', typeof Z === 'string' && Z.startsWith('dungeon:'));
  T += 8000;   /* the loading screen's whole race */
  H._entryGraceAt = 0;   /* the grace is given once in 10 s (TRAPS 311): this entry's own */
  WS[IDS.h].sent.length = 0;
  check('3m. the step in after the loading screen is taken', await move(IDS.h, Z, 500, 1200) && H.z === Z);
  check('3n. ...with its half second and its wave, as before', H._zoneEntryGraceUntil > T && sentOf(WS[IDS.h], 'zone_state').some((m) => m.zone === Z && m.monsters.length > 0));
  check('3o. the door out (to today\'s town) is taken', await move(IDS.h, 'town', 1000, 1000) && H.z === 'town');
  check('3p. ...and down the stairs to the mouth', await move(IDS.h, WHEEL_ZONE, door.back[0], door.back[1]) && H.z === WHEEL_ZONE);
  endRuns();
}
{
  /* the party's pull: a member beside the leader comes in on the leader's tap */
  const L = ps(IDS.l), P = ps(IDS.p);
  const door = room._wheelDoor('thunder');
  put(L, WHEEL_ZONE, door.at[0], door.at[1]);
  put(P, WHEEL_ZONE, door.at[0] + 200, door.at[1] + 100);
  L.level = P.level = 20;
  room._partyOf = (pid) => ([IDS.l, IDS.p].includes(pid) ? { leader: IDS.l, members: [IDS.l, IDS.p] } : null);
  WS[IDS.l].sent.length = 0; WS[IDS.p].sent.length = 0;
  await room.webSocketMessage(WS[IDS.l], JSON.stringify({ type: 'dungeon_start', payload: { entrance: 'thunder' } }));
  const Z = (sentOf(WS[IDS.p], 'dungeon_started')[0] || { payload: {} }).payload.zone;
  check('3q. (setup) the leader\'s tap pulls the member', typeof Z === 'string');
  check('3r. the pulled member\'s step in is taken', await move(IDS.p, Z, 520, 1200) && P.z === Z);
  check('3s. ...and the leader\'s', await move(IDS.l, Z, 500, 1200) && L.z === Z);
  delete room._partyOf;
  endRuns();
}
{
  /* the Workshop's run, from the farm, and its way home */
  put(H, 'farm_home', 300, 300);
  WS[IDS.h].sent.length = 0;
  await room.webSocketMessage(WS[IDS.h], JSON.stringify({ type: 'dungeon_start', payload: { config: { waves: 2, monsterLevel: 3, hasBoss: false } } }));
  const Z = (sentOf(WS[IDS.h], 'dungeon_started')[0] || { payload: {} }).payload.zone;
  check('3t. the Workshop\'s run: the step in is taken', typeof Z === 'string' && await move(IDS.h, Z, 100, 100) && H.z === Z);
  check('3u. ...and its door home to the farm', await move(IDS.h, 'farm_home', 300, 300) && H.z === 'farm_home');
  endRuns();
}
{
  /* a reconnect behind the dungeon's loading screen keeps the pass: it is
     the run's, not the player state's */
  const door = room._wheelDoor('hollows');
  put(H, WHEEL_ZONE, door.at[0], door.at[1]);
  H.level = 30;
  WS[IDS.h].sent.length = 0;
  await room.webSocketMessage(WS[IDS.h], JSON.stringify({ type: 'dungeon_start', payload: { entrance: 'hollows' } }));
  const Z = (sentOf(WS[IDS.h], 'dungeon_started')[0] || { payload: {} }).payload.zone;
  await room.webSocketClose(WS[IDS.h], 1000, 'bye', true);
  T += 2000;
  const H2 = await join(IDS.h, WHEEL_ZONE, door.at[0], door.at[1]);
  check('3v. (setup) a reconnect at the mouth, a fresh player state', !!H2 && H2 !== H && H2.z === WHEEL_ZONE);
  check('3w. ...its step into the run is taken', typeof Z === 'string' && await move(IDS.h, Z, 500, 1200) && H2.z === Z);
  endRuns();
}

/* ── 4. the pass ── */
{
  const Hh = ps(IDS.h), S = ps(IDS.s);
  const door = room._wheelDoor('verdant');
  const tap = async () => {
    put(Hh, WHEEL_ZONE, door.at[0], door.at[1]);
    WS[IDS.h].sent.length = 0;
    await room.webSocketMessage(WS[IDS.h], JSON.stringify({ type: 'dungeon_start', payload: { entrance: 'verdant' } }));
    return (sentOf(WS[IDS.h], 'dungeon_started')[0] || { payload: {} }).payload.zone;
  };
  /* the slowest honest step in, and one past the pass */
  let Z = await tap();
  T += ZONE_JUDGE.PASS_MS - 200;
  check('4a. a step in just inside PASS_MS is taken', await move(IDS.h, Z, 500, 1200) && Hh.z === Z, { PASS_MS: ZONE_JUDGE.PASS_MS });
  /* used once: out, and back in by the same pass */
  await move(IDS.h, 'town', 1000, 1000);
  await move(IDS.h, WHEEL_ZONE, door.back[0], door.back[1]);
  check('4b. a pass is used once: back in by it after leaving is refused', !(await move(IDS.h, Z, 500, 1200)) && Hh.z === WHEEL_ZONE);
  endRuns();
  Z = await tap();
  T += ZONE_JUDGE.PASS_MS + 200;
  check('4c. a step in past PASS_MS is refused', !(await move(IDS.h, Z, 500, 1200)) && Hh.z === WHEEL_ZONE);
  endRuns();
  /* a stranger in the Wheel beside the mouth, with no dungeon_started */
  Z = await tap();
  put(S, WHEEL_ZONE, door.at[0] + 30, door.at[1]);
  const n0 = refusedN('wheel>dungeon');
  check('4d. a stranger naming the live run with no pass is refused', !(await move(IDS.s, Z, 500, 1200)) && S.z === WHEEL_ZONE);
  check('4e. ...counted on the overview', refusedN('wheel>dungeon') === n0 + 1);
  check('4f. a pass opens its own run only, not another\'s', !(await move(IDS.h, OTHER_RUN, 500, 1200)) && Hh.z === WHEEL_ZONE);
  check('4g. ...and no other road out of the Wheel: off the safe ground, today\'s town is still refused',
    !(await move(IDS.h, 'town', 1000, 1000)) && Hh.z === WHEEL_ZONE);
  check('4h. ...while the pass itself still works', await move(IDS.h, Z, 500, 1200) && Hh.z === Z);
  endRuns();
}

/* ── 5. a v1 phone, test mode, a phone out of step ── */
{
  const V1 = await join('bp_zj_v1', 'town', 1000, 1000, { protocolVersion: undefined });
  put(V1, WHEEL_ZONE, NMLX.x + 300, NMLX.y);
  WS.bp_zj_v1.sent.length = 0;
  check('5a. a v1 phone off the safe ground naming today\'s town is refused', !(await move('bp_zj_v1', 'town', 1000, 1000)) && V1.z === WHEEL_ZONE);
  check('5b. ...and is sent none of the three zone lists', ['zone_monsters', 'zone_nodes', 'zone_loot'].every((t) => sentOf(WS.bp_zj_v1, t).length === 0),
    WS.bp_zj_v1.sent.map((m) => m.type));
  put(V1, WHEEL_ZONE, ARRIVAL.x, ARRIVAL.y);
  check('5c. ...and from the safe ground, the farm is taken', await move('bp_zj_v1', 'farm_home', 300, 300) && V1.z === 'farm_home');

  /* test mode protects nobody from this: it protects the other player */
  put(F, WHEEL_ZONE, NMLX.x, NMLX.y);
  F._testMode = true;
  check('5d. (setup) F is in test mode', room._testMode(F));
  check('5e. a test-mode character off the safe ground is refused too', !(await move(IDS.f, 'town', 1000, 1000)) && F.z === WHEEL_ZONE);
  F._testMode = false;

  /* a phone that draws another Wheel than the room plays: another map's
     numbers, which No man's land leaves alone, and so does R2 -- but a run
     still needs its pass */
  const O = await join('bp_zj_out', 'town', 1000, 1000, { ws: [1] });
  if (O && room._wheelInStep(O) === false) {
    put(O, WHEEL_ZONE, NMLX.x, NMLX.y);
    check('5f. a phone out of step: leaving the Wheel is not judged (another map\'s numbers)', await move('bp_zj_out', 'town', 1000, 1000) && O.z === 'town');
    put(O, WHEEL_ZONE, NMLX.x, NMLX.y);
    check('5g. ...but a run still needs its pass', !(await move('bp_zj_out', OTHER_RUN, 500, 1200)) && O.z === WHEEL_ZONE);
  } else {
    check('5f. (a phone out of step is refused at the join by its own rule: nothing to judge)', !O || room._wheelInStep(O) !== false);
  }
}

/* ── 6. the kill switch, and the overview ── */
{
  check('6a. `zonejudge` is a name the live flags take', flagNameOk('zonejudge'));
  const hit = await fightSetUp();
  room._liveFlags = { zonejudge: false };
  check('6b. (setup) F in a fight in No man\'s land, the switch thrown', hit && room._bagLockedByFight(IDS.f, T));
  check('6c. `zonejudge: false` is today: the losing player\'s move to town is taken', await move(IDS.f, 'town', 1000, 1000) && F.z === 'town');
  put(ps(IDS.s), WHEEL_ZONE, NMLX.x + 500, NMLX.y);
  check('6d. ...and a stranger walks into a live run', await move(IDS.s, OTHER_RUN, 500, 1200) && ps(IDS.s).z === OTHER_RUN);
  check('6e. ...the overview says it is off', room._zoneJudgeInfo && room._zoneJudgeInfo().on === false);
  /* a pass given while it is off works once it is on: nobody stranded */
  const Hh = ps(IDS.h), door = room._wheelDoor('verdant');
  put(Hh, WHEEL_ZONE, door.at[0], door.at[1]);
  WS[IDS.h].sent.length = 0;
  await room.webSocketMessage(WS[IDS.h], JSON.stringify({ type: 'dungeon_start', payload: { entrance: 'verdant' } }));
  const Z = (sentOf(WS[IDS.h], 'dungeon_started')[0] || { payload: {} }).payload.zone;
  room._liveFlags = {};
  check('6f. a pass given while it was off works once it is on', typeof Z === 'string' && await move(IDS.h, Z, 500, 1200) && Hh.z === Z);
  check('6g. the overview says it is on, with the roads refused', room._zoneJudgeInfo && room._zoneJudgeInfo().on === true && refusedN('wheel>town') >= 3);
  const admin = fs.readFileSync(new URL('../src/admin.js', import.meta.url), 'utf8');
  check('6h. /api/admin/overview carries it', /zoneJudge: this\._zoneJudgeInfo\(\)/.test(admin));
  endRuns();
}

/* ── 7. the inventory's ground: the farm's doors are on the safe ground ── */
{
  check('7a. both Wheels keep the same safe ground, and it is No man\'s land\'s own edge',
    SAFE_LONG === SAFE_SHORT && SAFE_LONG === NML.SAFE_R && SAFE_R === SAFE_LONG, { SAFE_LONG, SAFE_SHORT, nml: NML.SAFE_R });
  /* the doors as the ground worker places them (placing.js doorSpots), on
     the short Wheel: its town is the long Wheel's, and placing the long one
     takes twenty seconds */
  const { PLAN } = await import('../../public/tools/world/plan.js');
  const { buildBlueprint } = await import('../../public/tools/world/core/layout.js');
  const { placeObjects, doorSpots, objectFootprints } = await import('../../public/tools/world/core/placing.js');
  const man = JSON.parse(fs.readFileSync(new URL('../../public/world/objects/manifest.json', import.meta.url), 'utf8'));
  const dbp = buildBlueprint(PLAN);
  const placed = placeObjects(PLAN, dbp);
  placed.present = objectFootprints(placed, man).present;
  const doors = doorSpots(PLAN, dbp, placed);
  const inside = (d) => SAFE_SHORT - Math.hypot(d.x - CENTRE_SHORT[0], d.y - CENTRE_SHORT[1]);
  const farmDoors = doors.filter((d) => d.id === 'landoffice' || d.id === 'feedseed');
  check('7b. the Land Office\'s and the Feed & Seed\'s doors (the farm trip) stand 900 px and more inside the safe ground',
    farmDoors.length === 2 && farmDoors.every((d) => inside(d) >= 900), farmDoors.map((d) => [d.id, Math.round(inside(d))]));
  check('7c. ...and so does every door in Brotown', doors.length > 0 && doors.every((d) => inside(d) >= 900), doors.map((d) => [d.id, Math.round(inside(d))]));
  check('7d. the long Wheel\'s centre is its own (the rule reads the room\'s table, never these numbers)', CENTRE_LONG[0] !== CENTRE_SHORT[0] && C[0] === CENTRE_LONG[0]);
  check('7e. the Wheel\'s dungeon mouths are the run\'s only roads in from the Wheel (WHEEL_DUNGEON.ZONE)', WHEEL_DUNGEON.ZONE === WHEEL_ZONE);
}

console.log(`\n${passes} passed, ${failures} failed`);
if (failures > 0) process.exit(1);
