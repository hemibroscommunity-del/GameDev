/* THINGS THE PHONE SHOWS AS DONE THAT THE WORKER REFUSED (v2.3.4421).
 *
 * The state-machine sweep (2026-11-03, V9a and V9b): the phone draws an act
 * before the worker answers -- a harvest's XP, a cooked dish's XP, an amulet
 * gem, an arena bet -- and when the worker said no, the phone kept showing
 * it.  What this suite pins:
 *   1. a harvest the anti-bot hourly cap withholds RE-SENDS the skills on
 *      the v2 delta protocol (it echoed, and an echo of nothing changed sends
 *      nothing, so the phone kept the XP it predicted), against the real
 *      GameRoom;
 *   2. an arena bet's refusal names the gladiator and, once found, the match
 *      (additive; code and message as before), against the real GameRoom;
 *      and the phone's rule (src/game/arenaStakes.js) on the worker's own
 *      answers: a refused bet leaves the screen, a placed one never does,
 *      'already-staked' takes nothing off, and an old worker's bare error
 *      drops only a still-pending bet;
 *   3. the amulet's gem pill (src/game/amuletGem.js): the gem already set is
 *      not settable again, so a double tap spends one gem, not two;
 *   4. the cook's popup reads the fallback's own number, and that number is
 *      the worker's (a third literal said "+40" while both paid 200);
 *   5. (v2.3.4642) the other harvest-strike refusals after the node is found
 *      (out of reach, no tool, a node already down, ...) send the node and the
 *      skills again, once a node every DIRTY_MS a player; `strikesnap: false`
 *      brings back the silence;
 *   6. (v2.3.4642) an armour swap the guard's gear lock or the defence-points
 *      gate refuses sends the worn armour back (`gearresend: false`: silent). */
import { readFileSync } from 'node:fs';
import { GameRoom } from '../src/index.js';
import { markStakePlaced, dropRefusedStake } from '../../src/game/arenaStakes.js';
import { amuletGemSettable } from '../../src/game/amuletGem.js';

const REAL_NOW = Date.now;
let T = 1_800_000_000_000;
Date.now = () => T;

function makeState() {
  const store = new Map();
  return {
    store,
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
const env = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs(label) { return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
async function join(room, id, z) {
  const ws = fakeWs(id);
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
  await room.webSocketMessage(ws, JSON.stringify({
    type: 'join', id, name: 'T' + id.slice(-2), phrase: 'p-' + id, protocolVersion: 2,
    data: { x: 500, y: 500, z },
  }));
  const send = (type, payload) => room.webSocketMessage(ws, JSON.stringify({ type, payload }));
  return { ws, ps: room.playerState[id], send, session: room.sessions.get(ws) };
}

// ── 1. a harvest the hourly cap withholds ──
{
  const ZONE = 'meadow';
  const room = new GameRoom(makeState(), env);
  room._fishDice = () => 0.5;
  const p = await join(room, 'bp_sr_h', ZONE);
  p.ps.z = ZONE;
  p.ps.inventory = { woodcutting_axe: 1, fishing_pole: 1, mining_pickaxe: 1 };
  p.ps.lifeSkills = {};
  const nodes = room._ensureZoneNodes(ZONE);
  const trees = nodes.filter((n) => n.nodeType === 'tree');
  for (const n of nodes) { n.alive = true; n.respawnAt = 0; }
  const harvest = async (n, seq) => {
    p.ps.x = n.x; p.ps.y = n.y;
    await p.send('extraction_start', { nodeId: n.id, zone: ZONE, skill: 'woodcutting', hitSeq: seq });
    const rec = room.extractions[p.session.id];
    T += (rec ? rec.openDelayBase : 0) + 1500;
    await p.send('node_strike', { id: n.id, zone: ZONE, accuracy: 'good' });
  };
  await harvest(trees[0], 11);
  const why = () => (room._lastStrikeFor('bp_sr_h') || {}).why;
  check('1. setup: an honest harvest is paid and its skills sent', why() === 'paid', why());

  const realBotfp = room._botfpOnStrike;
  room._botfpOnStrike = function () { return { grant: false, accuracy: 'good' }; };
  const xpBefore = JSON.stringify(p.ps.lifeSkills);
  p.ws.sent.length = 0;
  trees[0].alive = true; trees[0].respawnAt = 0;
  await harvest(trees[0], 12);
  room._botfpOnStrike = realBotfp;
  const states = p.ws.sent.filter((m) => m.type === 'player_state' && m.payload && m.payload.lifeSkills);
  check('1. the capped strike is refused antibot-cap, nothing paid', why() === 'antibot-cap' && JSON.stringify(p.ps.lifeSkills) === xpBefore, why());
  check('1. ...and the skills are SENT to the phone (v2), so its predicted XP is taken back',
    states.length === 1 && JSON.stringify(states[0].payload.lifeSkills) === xpBefore,
    p.ws.sent.map((m) => m.type));
}

// ── 2. an arena bet ──
{
  const room = new GameRoom(makeState(), env);
  const P = (n) => 'bp_sr_' + n;
  const w = {};
  for (const n of ['a', 'b', 'c', 'd', 'e']) {
    w[n] = await join(room, P(n), 'town');
    w[n].ps.coins = 1000;
  }
  await room._arenaJoin(P('a'), 'A');
  await room._arenaJoin(P('b'), 'B');
  room._arena.gatherDeadline = Date.now() - 1;
  room._arenaLazyTick(Date.now());
  await new Promise((r) => setTimeout(r, 20));
  const t = room._arena;
  const m = t && t.matches[0];
  check('2. setup: a tournament running with a match', t && t.status === 'running' && m, t && t.status);
  const errOf = (p) => { const e = p.ws.sent.filter((x) => x.type === 'arena_stake_error'); return e.length ? e[e.length - 1].payload : null; };
  const placedOf = (p) => { const e = p.ws.sent.filter((x) => x.type === 'arena_stake_placed'); return e.length ? e[e.length - 1].payload : null; };
  /* the phone's list as PartyPanel draws it at the tap */
  const tap = (bets, target, round) => bets.concat([{ playerId: 'me', amount: 100, targetPlayerId: target, round, ts: T, _serverStake: true, _resolved: true }]);

  // c bets on a: placed, and the drawn bet is marked real
  let betsC = tap([], P('a'), t.round);
  await w.c.send('arena_sponsor', { targetId: P('a'), amount: 100 });
  betsC = markStakePlaced(betsC, placedOf(w.c));
  check('2. a placed bet is marked placed on the phone', betsC.length === 1 && betsC[0]._placed === true && betsC[0].matchId === m.id, betsC);

  // c bets again on the same match (a page reload forgot the list): already-staked
  const reload = tap([], P('a'), t.round);
  await w.c.send('arena_sponsor', { targetId: P('a'), amount: 50 });
  const e1 = errOf(w.c);
  check('2. already-staked names the gladiator and the match (code and message as before)',
    e1 && e1.code === 'already-staked' && e1.message === 'One stake per match' && e1.targetId === P('a') && e1.matchId === m.id, e1);
  check('2. ...and takes NOTHING off the screen: a real, escrowed bet stands behind it',
    dropRefusedStake(betsC, e1) === betsC && dropRefusedStake(reload, e1) === reload);
  check('2. ...nor is gold taken twice', w.c.ps.coins === 900, w.c.ps.coins);

  // the match is decided: d's bet on its winner is refused no-match
  m.winner = P('a');
  let betsD = tap([], P('a'), t.round);
  await w.d.send('arena_sponsor', { targetId: P('a'), amount: 100 });
  const e2 = errOf(w.d);
  check('2. a bet on a decided match: no-match, naming the gladiator', e2 && e2.code === 'no-match' && e2.targetId === P('a'), e2);
  betsD = dropRefusedStake(betsD, e2);
  check('2. ...and the refused bet leaves the phone (the form comes back)', betsD.length === 0, betsD);
  check('2. ...no gold moved', w.d.ps.coins === 1000, w.d.ps.coins);

  // a refusal for one gladiator never drops a pending bet on another
  const other = tap([], P('b'), t.round);
  check('2. an error naming another gladiator drops nothing', dropRefusedStake(other, e2) === other);

  // an OLD worker's bare {code, message}: only a still-pending bet goes
  const mixed = markStakePlaced(tap([], P('a'), 1), { targetId: P('a'), matchId: 'm_old' });
  const both = tap(mixed, P('b'), 2);
  const afterOld = dropRefusedStake(both, { code: 'no-match', message: 'x' });
  check('2. an old worker\'s bare error drops the pending bet only, never the placed one',
    afterOld.length === 1 && afterOld[0]._placed === true && afterOld[0].targetPlayerId === P('a'), afterOld);
  check('2. ...and with nothing pending, nothing goes', dropRefusedStake(mixed, { code: 'no-match' }) === mixed);
  const legacy = [{ playerId: 'me', amount: 10, targetPlayerId: P('a'), round: 1, ts: T }];
  check('2. an old worker\'s local bet (no server stake) is never touched', dropRefusedStake(legacy, { code: 'no-match' }) === legacy);
  check('2. a stray answer with no list is harmless', dropRefusedStake(undefined, e2) === undefined && markStakePlaced([], null).length === 0);
}

// ── 3. the amulet's gem pill ──
{
  const amulet = { tier: 'simple', gem: null };
  check('3. an empty amulet takes a gem', amuletGemSettable(amulet, 'fire') === true);
  amulet.gem = 'fire';   // the first tap sets it on the phone at once
  check('3. the second tap of a double tap is refused (one gem spent, not two)', amuletGemSettable(amulet, 'fire') === false);
  check('3. a DIFFERENT gem is still settable (the old one replaced, as before)', amuletGemSettable(amulet, 'water') === true);
  check('3. no amulet, no gem', amuletGemSettable(null, 'fire') === false && amuletGemSettable(amulet, '') === false);
}

// ── 4. the cook's popup ──
{
  const src = readFileSync(new URL('../../src/game/lifeSkillRewards.js', import.meta.url), 'utf8');
  const srv = readFileSync(new URL('../src/cooking.js', import.meta.url), 'utf8');
  const n = Number((src.match(/export var COOK_XP = (\d+);/) || [])[1]);
  const srvN = Number((srv.match(/_addLifeSkillXp\(ps, 'cooking', (\d+)\);\s*\n\s*\/\* v2\.3\.3140/) || [])[1]);
  check('4. the phone\'s cooked-dish XP is the worker\'s', n > 0 && n === srvN, { phone: n, worker: srvN });
  check('4. the popup and the fallback both read it (no third literal)',
    /'\+' \+ COOK_XP \+ ' Cooking XP'/.test(src) && /addLifeSkillXp\(R\.lifeSkills, 'cooking', COOK_XP\)/.test(src) && !/'\+\d+ Cooking XP'/.test(src));
}

// ── 5. v2.3.4642: the other strike refusals snap the phone back ──
/* V9a G4-10, S7-8: of the refusals after the node is found, only the proof's
   and the hourly cap's told the phone; the rest returned in silence, and on v2
   the phone kept the tree felled and the XP it predicted. */
{
  const ZONE = 'meadow';
  const room = new GameRoom(makeState(), env);
  const p = await join(room, 'bp_sr_s', ZONE);
  p.ps.z = ZONE;
  p.ps.inventory = { woodcutting_axe: 1 };
  p.ps.lifeSkills = { woodcutting: { level: 3, xp: 120 } };
  const nodes = room._ensureZoneNodes(ZONE);
  const tree = nodes.find((n) => n.nodeType === 'tree');
  tree.alive = true; tree.respawnAt = 0;
  const why = () => (room._lastStrikeFor('bp_sr_s') || {}).why;
  const skillsSent = () => p.ws.sent.filter((m) => m.type === 'player_state' && m.payload && m.payload.lifeSkills).length;
  const dirty = () => !!(room.dirtyNodeIds[ZONE] && room.dirtyNodeIds[ZONE].has(tree.id));
  const clean = () => { if (room.dirtyNodeIds[ZONE]) room.dirtyNodeIds[ZONE].clear(); room.dirtyNodes.delete(ZONE); p.ws.sent.length = 0; };
  /* out of reach */
  p.ps.x = tree.x + 2000; p.ps.y = tree.y;
  clean();
  await p.send('node_strike', { id: tree.id, zone: ZONE, accuracy: 'good' });
  check('5a. a strike out of reach is refused, and the node and the skills are sent again', why() === 'out-of-range' && dirty() && skillsSent() === 1 && tree.alive === true,
    { why: why(), dirty: dirty(), sent: p.ws.sent.map((m) => m.type) });
  clean();
  await p.send('node_strike', { id: tree.id, zone: ZONE, accuracy: 'good' });
  check('5b. ...at most once a node every DIRTY_MS a player: a second at once sends nothing', why() === 'out-of-range' && !dirty() && skillsSent() === 0);
  /* no tool, later */
  T += 2500;
  p.ps.x = tree.x; p.ps.y = tree.y;
  p.ps.inventory = {};
  clean();
  await p.send('node_strike', { id: tree.id, zone: ZONE, accuracy: 'good' });
  check('5c. a strike with no axe is refused and snapped back the same way', why() === 'no-tool' && dirty() && skillsSent() === 1, why());
  /* a node already down */
  T += 2500;
  p.ps.inventory = { woodcutting_axe: 1 };
  tree.alive = false; tree.respawnAt = T + 60000;
  clean();
  await p.send('node_strike', { id: tree.id, zone: ZONE, accuracy: 'good' });
  check('5d. a strike on a node already down: its state and the skills are sent again', why() === 'node-already-dead' && dirty() && skillsSent() === 1, why());
  /* the switch */
  T += 2500;
  room._liveFlags = { ...(room._liveFlags || {}), strikesnap: false };
  tree.alive = true; tree.respawnAt = 0;
  p.ps.x = tree.x + 2000;
  clean();
  await p.send('node_strike', { id: tree.id, zone: ZONE, accuracy: 'good' });
  check('5e. `strikesnap: false`: the refusal is silent again, as before', why() === 'out-of-range' && !dirty() && skillsSent() === 0);
  const sum = JSON.stringify(p.ps.lifeSkills);
  check('5f. a refusal pays nothing (the skills as they were)', sum === JSON.stringify({ woodcutting: { level: 3, xp: 120 } }), sum);
}

// ── 6. v2.3.4642: a refused armour swap sends the worn armour back ──
/* V9b: the guard's gear lock and the defence-points gate refused an armour swap
   with a bare return; nothing changed, so nothing was sent, and the phone wore
   the refused piece until the next real change. */
{
  const room = new GameRoom(makeState(), env);
  const p = await join(room, 'bp_sr_a', 'town');
  const A = { name: 'Copper Chestplate', gearBase: 'copper', tierMult: 1.12, tier: 'common' };
  const B = { name: 'Copper Chestplate of the Ox', gearBase: 'copper', tierMult: 1.2, tier: 'common' };
  p.ps.armor = { ...A };
  const armourSent = () => p.ws.sent.filter((m) => m.type === 'player_state' && m.payload && 'armor' in m.payload);
  const realLock = room._threatGearLocked;
  room._threatGearLocked = () => true;   /* the guard has you (threat.js) */
  p.ws.sent.length = 0;
  await p.send('stats_update', { armor: { ...B } });
  const back = armourSent();
  check('6a. a swap the guard\'s gear lock refuses keeps the worn piece, and tells the phone',
    p.ps.armor.name === A.name && back.length === 1 && back[0].payload.armor.name === A.name, p.ws.sent.map((m) => m.type));
  const realP3 = room._prog3EquipOk;
  room._threatGearLocked = realLock;
  room._prog3EquipOk = () => false;   /* not enough defence points for it */
  p.ws.sent.length = 0;
  await p.send('stats_update', { armor: { ...B } });
  check('6b. ...and so does one the defence-points gate refuses', p.ps.armor.name === A.name && armourSent().length === 1);
  room._liveFlags = { ...(room._liveFlags || {}), gearresend: false };
  p.ws.sent.length = 0;
  await p.send('stats_update', { armor: { ...B } });
  check('6c. `gearresend: false`: silent again, as before', p.ps.armor.name === A.name && armourSent().length === 0);
  room._prog3EquipOk = realP3;
}

Date.now = REAL_NOW;
console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
