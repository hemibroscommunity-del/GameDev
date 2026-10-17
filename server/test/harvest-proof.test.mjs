/* A HARVEST IS PAID AGAINST ITS OWN START (v2.3.3322).
 *
 * The anti-bot review's fix 6 (docs/specs/antibot-review.md; the owner: "Yes"
 * to the bot farming holes).  A strike was timed only when the player's
 * extraction record named the same node: with no record it was paid untimed
 * (obsidian 81 an hour honest, 3,930 by script), and with a record for another
 * node it was paid untimed and not even counted.  gathering.js HARVEST_PROOF
 * has the rule; what this suite pins:
 *   1. a strike against its own start is paid after its hits and refused one
 *      beat early, as before;
 *   2. a strike with NO start: one recovery strike in ten minutes is paid
 *      (counted), the next is refused 'no-start', its node left standing and
 *      marked dirty, nothing paid; ten minutes on, another recovery;
 *   3. a strike on ANOTHER node than its start: the same, 'other-node', and
 *      the start's own record kept, so its own strike is still paid on time;
 *   4. the record OUTLIVES THE SOCKET: start, the socket drops, a rejoin, the
 *      replayed strike is timed against it -- no recovery spent;
 *   5. a ROOM RESTART (a deploy) forgets every start and every recovery clock:
 *      each player's first strike after it is paid;
 *   6. no fingerprint, no perfect: a perfect with no fingerprint is paid
 *      'good' (one ore, not two) and counted; with one it stays perfect;
 *   7. the kill switch `harvestproof: false`: the old permissive strike and the
 *      old perfect; and the name is one the live flags route takes;
 *   8. a spent recovery clock is swept with the stale records. */
import { GameRoom } from '../src/index.js';
import { HARVEST_PROOF } from '../src/gathering.js';
import { flagNameOk } from '../src/liveops.js';

const REAL_NOW = Date.now;
let T = 1_800_000_000_000;
Date.now = () => T;

function makeState(liveflags) {
  const store = new Map();
  if (liveflags) store.set('liveflags', liveflags);
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

const ZONE = 'meadow';
const TOOLS = { woodcutting_axe: 1, fishing_pole: 1, mining_pickaxe: 1 };
const SKILL = { oreVein: 'mining', tree: 'woodcutting', fishSpot: 'fishing' };
const FP = { len: 640, ent: 0.42, dur: 1400, n: 48, tv: 120, vc: 0.31, h: 'a1b2c3' };

/* A player joined on a socket of their own, standing in the meadow with all
   three tools; the zone's nodes forced alive. */
async function join(room, id, label) {
  const ws = fakeWs(label || id);
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
  await room.webSocketMessage(ws, JSON.stringify({
    type: 'join', id, name: 'Gatherer', phrase: 'p-' + id, protocolVersion: 2,
    data: { x: 500, y: 500, z: ZONE },
  }));
  const ps = room.playerState[id];
  ps.z = ZONE;
  ps.inventory = Object.assign({}, TOOLS);
  ps.lifeSkills = {};
  const send = (type, payload) => room.webSocketMessage(ws, JSON.stringify({ type, payload }));
  return { ws, ps, send, session: room.sessions.get(ws) };
}
async function setup(liveflags, id) {
  const state = makeState(liveflags);
  const room = new GameRoom(state, env);
  const p = await join(room, id || 'bp_hp');
  const nodes = room._ensureZoneNodes(ZONE);
  for (const n of nodes) { n.alive = true; n.respawnAt = 0; }
  return { state, room, nodes, ...p };
}
const nodesOf = (nodes, type) => nodes.filter((n) => n.nodeType === type);
const stand = (ps, n) => { ps.x = n.x; ps.y = n.y; };
const bagOf = (room, ps, n) => ps.inventory[room._harvestInvKey(n.nodeType, n.tierLvl)] || 0;
const why = (room, id) => (room._lastStrikeFor(id) || {}).why;
const revive = (nodes) => { for (const n of nodes) { n.alive = true; n.respawnAt = 0; } };

/* one honest harvest: the start with a hitSeq, the plan's hits swung out, then
   the strike `extraMs` past the window's opening */
async function harvest(room, p, n, extraMs, accuracy, fp) {
  stand(p.ps, n);
  await p.send('extraction_start', { nodeId: n.id, zone: ZONE, skill: SKILL[n.nodeType], hitSeq: 1 + (p.seq = (p.seq || 0) + 1) });
  const rec = room.extractions[p.session.id];
  T += (rec ? rec.openDelayBase : 0) + (extraMs == null ? 1500 : extraMs);
  await p.send('node_strike', Object.assign({ id: n.id, zone: ZONE, accuracy: accuracy || 'good' }, fp ? { swipeFp: fp } : {}));
}
const strikeBare = (p, n, accuracy, fp) => { stand(p.ps, n); return p.send('node_strike', Object.assign({ id: n.id, zone: ZONE, accuracy: accuracy || 'good' }, fp ? { swipeFp: fp } : {})); };

// ── 1. against its own start ──
{
  const S = await setup(null, 'bp_hp1');
  const [tree] = nodesOf(S.nodes, 'tree');
  await harvest(S.room, S, tree);
  check('1. a strike against its own start, after its hits, is paid', why(S.room, 'bp_hp1') === 'paid' && bagOf(S.room, S.ps, tree) === 1,
    { why: why(S.room, 'bp_hp1'), bag: bagOf(S.room, S.ps, tree) });
  check('1. ...its record is spent with it, and no recovery is used', !S.room.extractions.bp_hp1 && !(S.room._harvestRecoverAt && S.room._harvestRecoverAt.has('bp_hp1')));

  revive(S.nodes);
  stand(S.ps, tree);
  await S.send('extraction_start', { nodeId: tree.id, zone: ZONE, skill: 'woodcutting', hitSeq: 77 });
  const rec = S.room.extractions.bp_hp1;
  T += Math.max(0, rec.openDelayBase - 1000);
  await S.send('node_strike', { id: tree.id, zone: ZONE, accuracy: 'good' });
  check('1. ...and one beat early it is refused too-early, the record kept for the real one',
    why(S.room, 'bp_hp1') === 'too-early' && tree.alive && !!S.room.extractions.bp_hp1 && bagOf(S.room, S.ps, tree) === 1,
    { why: why(S.room, 'bp_hp1'), alive: tree.alive });
  T += 3000;
  await S.send('node_strike', { id: tree.id, zone: ZONE, accuracy: 'good' });
  check('1. ...which is paid when it comes', why(S.room, 'bp_hp1') === 'paid' && bagOf(S.room, S.ps, tree) === 2, why(S.room, 'bp_hp1'));
}

// ── 2. no start at all ──
{
  const S = await setup(null, 'bp_hp2');
  const [t1] = nodesOf(S.nodes, 'tree');
  const [t2] = nodesOf(S.nodes, 'fishSpot');   /* the meadow has one node of each kind */
  await strikeBare(S, t1);
  check('2. the first strike with no start is a recovery strike: paid', why(S.room, 'bp_hp2') === 'paid' && bagOf(S.room, S.ps, t1) === 1, why(S.room, 'bp_hp2'));
  check('2. ...and counted (no start, recovered)', S.session._extractionMissing === 1 && S.session._extractionRecovered === 1,
    { missing: S.session._extractionMissing, recovered: S.session._extractionRecovered });

  T += 60000;
  S.room.dirtyNodeIds = Object.create(null); S.room.dirtyNodes = new Set();
  await strikeBare(S, t2);
  const refused = S.room._lastStrikeFor('bp_hp2') || {};
  check('2. a second within ten minutes is refused no-start', refused.why === 'no-start', refused);
  check('2. ...nothing paid, the node left standing', bagOf(S.room, S.ps, t2) === 0 && t2.alive === true, { bag: bagOf(S.room, S.ps, t2), alive: t2.alive });
  check('2. ...and marked dirty, so the phone that predicted its fall sees it stand',
    S.room.dirtyNodes.has(ZONE) && !!S.room.dirtyNodeIds[ZONE] && S.room.dirtyNodeIds[ZONE].has(t2.id));
  check('2. ...the refusal says when the next recovery comes (9 minutes)', Math.abs(refused.recoverInMs - (HARVEST_PROOF.RECOVER_MS - 60000)) < 5, refused.recoverInMs);
  check('2. ...and it is counted as no start', S.session._extractionMissing === 2);

  T += HARVEST_PROOF.RECOVER_MS - 60000;
  await strikeBare(S, t2);
  check('2. ten minutes after the last, a recovery strike again', why(S.room, 'bp_hp2') === 'paid' && bagOf(S.room, S.ps, t2) === 1, why(S.room, 'bp_hp2'));
  check('2. the clock is in a Map, keyed by the player (rule 4)', S.room._harvestRecoverAt instanceof Map);
}

// ── 3. a start on one node, the strike on another ──
{
  const S = await setup(null, 'bp_hp3');
  const [a] = nodesOf(S.nodes, 'tree');
  const [b] = nodesOf(S.nodes, 'oreVein');
  S.room._harvestRecoverOk('bp_hp3', T);   /* the recovery already spent */
  stand(S.ps, a);
  await S.send('extraction_start', { nodeId: a.id, zone: ZONE, skill: 'woodcutting', hitSeq: 5 });
  const recA = S.room.extractions.bp_hp3;
  T += recA.openDelayBase + 1500;
  await strikeBare(S, b);
  const r = S.room._lastStrikeFor('bp_hp3') || {};
  check('3. a strike on another node than its start is refused other-node', r.why === 'other-node' && r.recordFor === a.id, r);
  check('3. ...nothing paid, that node standing, counted as other-node', bagOf(S.room, S.ps, b) === 0 && b.alive && S.session._extractionOtherNode === 1);
  check('3. ...and the start\'s own record is kept', S.room.extractions.bp_hp3 === recA);
  await strikeBare(S, a);
  check('3. ...so its own strike is still paid, on time', why(S.room, 'bp_hp3') === 'paid' && bagOf(S.room, S.ps, a) === 1, why(S.room, 'bp_hp3'));

  const S2 = await setup(null, 'bp_hp3b');
  const [c] = nodesOf(S2.nodes, 'tree');
  const [d] = nodesOf(S2.nodes, 'fishSpot');
  stand(S2.ps, c);
  await S2.send('extraction_start', { nodeId: c.id, zone: ZONE, skill: 'woodcutting', hitSeq: 9 });
  await strikeBare(S2, d);
  check('3. with the recovery not yet spent, it is paid as one (the replayed strike whose start a dead pipe ate)',
    why(S2.room, 'bp_hp3b') === 'paid' && bagOf(S2.room, S2.ps, d) === 1 && S2.session._extractionRecovered === 1, why(S2.room, 'bp_hp3b'));
}

// ── 4. the record outlives the socket ──
{
  const S = await setup(null, 'bp_hp4');
  const [ore] = nodesOf(S.nodes, 'oreVein');
  stand(S.ps, ore);
  await S.send('extraction_start', { nodeId: ore.id, zone: ZONE, skill: 'mining', hitSeq: 3 });
  const rec = S.room.extractions.bp_hp4;
  check('4. setup: a start with its plan', !!rec && Array.isArray(rec.hits), rec);
  await S.room.webSocketClose(S.ws);
  check('4. the socket drops: the record is still there', S.room.extractions.bp_hp4 === rec);
  T += 2000;
  const P = await join(S.room, 'bp_hp4', 'again');
  stand(P.ps, ore);
  T += rec.openDelayBase + 1500;
  await P.send('node_strike', { id: ore.id, zone: ZONE, accuracy: 'good' });
  check('4. the strike replayed after the rejoin is paid, timed against its start', why(S.room, 'bp_hp4') === 'paid' && bagOf(S.room, P.ps, ore) === 1, why(S.room, 'bp_hp4'));
  check('4. ...and no recovery was spent on it', !(S.room._harvestRecoverAt && S.room._harvestRecoverAt.has('bp_hp4')));

  revive(S.nodes);
  stand(P.ps, ore);
  await P.send('extraction_start', { nodeId: ore.id, zone: ZONE, skill: 'mining', hitSeq: 4 });
  const rec2 = S.room.extractions.bp_hp4;
  await S.room.webSocketClose(P.ws);
  const Q = await join(S.room, 'bp_hp4', 'third');
  stand(Q.ps, ore);
  await Q.send('node_strike', { id: ore.id, zone: ZONE, accuracy: 'good' });
  check('4. ...and a replay that comes too early is still too early', rec2.hits.length < 2 || why(S.room, 'bp_hp4') === 'too-early', { why: why(S.room, 'bp_hp4'), hits: rec2.hits.length });
}

// ── 5. a room restart ──
{
  const S = await setup(null, 'bp_hp5');
  const [t1] = nodesOf(S.nodes, 'tree');
  stand(S.ps, t1);
  await S.send('extraction_start', { nodeId: t1.id, zone: ZONE, skill: 'woodcutting', hitSeq: 2 });
  S.room._harvestRecoverOk('bp_hp5', T);
  const room2 = new GameRoom(S.state, env);   /* a deploy: the same storage, nothing in memory */
  const P = await join(room2, 'bp_hp5', 'after-deploy');
  const nodes2 = room2._ensureZoneNodes(ZONE);
  revive(nodes2);
  const n1 = nodesOf(nodes2, 'tree')[0];
  T += 20000;
  await strikeBare(P, n1);
  check('5. after a restart the strike whose start died with the room is paid (a recovery)', why(room2, 'bp_hp5') === 'paid' && bagOf(room2, P.ps, n1) === 1, why(room2, 'bp_hp5'));
  const n2 = nodesOf(nodes2, 'oreVein')[0];
  await strikeBare(P, n2);
  check('5. ...one: the next with no start is refused', why(room2, 'bp_hp5') === 'no-start' && n2.alive, why(room2, 'bp_hp5'));
}

// ── 6. no fingerprint, no perfect ──
{
  const S = await setup(null, 'bp_hp6');
  const [o1] = nodesOf(S.nodes, 'oreVein');
  const o2 = o1;
  await harvest(S.room, S, o1, 1500, 'perfect', null);
  const rec = S.room._botfpRecord('bp_hp6', T);
  check('6. a perfect with no fingerprint is paid good: one ore, not two', why(S.room, 'bp_hp6') === 'paid' && bagOf(S.room, S.ps, o1) === 1, { why: why(S.room, 'bp_hp6'), bag: bagOf(S.room, S.ps, o1) });
  check('6. ...and counted (noFpPerfect)', rec.counters.noFpPerfect === 1 && rec.counters.noFpStrikes === 1, rec.counters);
  const before = bagOf(S.room, S.ps, o2);
  revive(S.nodes);
  await harvest(S.room, S, o2, 1500, 'perfect', FP);
  check('6. a perfect with its fingerprint is paid perfect: two ore', why(S.room, 'bp_hp6') === 'paid' && bagOf(S.room, S.ps, o2) - before === 2, { why: why(S.room, 'bp_hp6'), got: bagOf(S.room, S.ps, o2) - before });
  check('6. ...and a new character\'s counters start the count at zero', S.room._botfpRecord('bp_hp6x', T).counters.noFpPerfect === 0);
}

// ── 7. the kill switch ──
{
  check('7. harvestproof is a name the live flags route takes', flagNameOk('harvestproof'));
  const S = await setup({ harvestproof: false }, 'bp_hp7');
  check('7. the switch reads off', S.room._harvestProofOn() === false);
  const [t1] = nodesOf(S.nodes, 'tree');
  await strikeBare(S, t1);
  revive(S.nodes);
  await strikeBare(S, t1);
  check('7. off: strikes with no start are paid every time, as before', bagOf(S.room, S.ps, t1) === 2 && why(S.room, 'bp_hp7') === 'paid', { bag: bagOf(S.room, S.ps, t1), why: why(S.room, 'bp_hp7') });
  check('7. off: no recovery clock is kept', !(S.room._harvestRecoverAt && S.room._harvestRecoverAt.size));
  const [o1] = nodesOf(S.nodes, 'oreVein');
  await strikeBare(S, o1, 'perfect');
  check('7. off: a perfect with no fingerprint stays perfect (two ore)', bagOf(S.room, S.ps, o1) === 2, bagOf(S.room, S.ps, o1));
  const on = await setup(null, 'bp_hp7b');
  check('7. on by default (no flag)', on.room._harvestProofOn() === true);
  const onT = await setup({ harvestproof: true }, 'bp_hp7c');
  check('7. on with the flag true', onT.room._harvestProofOn() === true);
}

// ── 8. the sweep ──
{
  const S = await setup(null, 'bp_hp8');
  S.room._harvestRecoverOk('bp_hp8', T);
  S.room._harvestRecoverOk('bp_hp8b', T - HARVEST_PROOF.RECOVER_MS - 1);
  S.room._sweepStaleExtractions(T);
  check('8. the sweep forgets a spent clock and keeps a running one',
    S.room._harvestRecoverAt.has('bp_hp8') && !S.room._harvestRecoverAt.has('bp_hp8b'), [...S.room._harvestRecoverAt.keys()]);
  stand(S.ps, nodesOf(S.nodes, 'tree')[0]);
  await S.send('extraction_start', { nodeId: nodesOf(S.nodes, 'tree')[0].id, zone: ZONE, skill: 'woodcutting', hitSeq: 1 });
  T += S.room.EXTRACTION_TIMEOUT_MS + 1;
  S.room._sweepStaleExtractions(T);
  check('8. ...and a record still goes at EXTRACTION_TIMEOUT_MS, socket or no socket', !S.room.extractions.bp_hp8);
}

// ── 9. a script hammering refused strikes ──
{
  const S = await setup(null, 'bp_hp9');
  const [tree] = nodesOf(S.nodes, 'tree');
  S.room._harvestRecoverOk('bp_hp9', T);   /* the recovery already spent */
  let marks = 0;
  for (let i = 0; i < 30; i++) {
    S.room.dirtyNodeIds = Object.create(null); S.room.dirtyNodes = new Set();
    await strikeBare(S, tree);
    if (S.room.dirtyNodeIds[ZONE] && S.room.dirtyNodeIds[ZONE].has(tree.id)) marks++;
    T += 30;
  }
  check('9. thirty refused strikes in a second send the node round once, not thirty times', marks === 1, marks);
  const rec = S.room._botfpRecord('bp_hp9', T);
  check('9. ...each counted as evidence (startless)', rec.counters.startless === 30, rec.counters.startless);
  check('9. ...and the twentieth flags the player (strikes-without-start), once', rec.flags.filter((f) => f.kind === 'strikes-without-start').length === 1,
    rec.flags.map((f) => f.kind));
  T += HARVEST_PROOF.DIRTY_MS;
  S.room.dirtyNodeIds = Object.create(null); S.room.dirtyNodes = new Set();
  await strikeBare(S, tree);
  check('9. two seconds on, a refusal shows the node standing again', !!S.room.dirtyNodeIds[ZONE] && S.room.dirtyNodeIds[ZONE].has(tree.id));
  const honest = await setup(null, 'bp_hp9h');
  const [t2] = nodesOf(honest.nodes, 'tree');
  await strikeBare(honest, t2);
  check('9. an honest phone\'s one recovery strike is paid and leaves no evidence', why(honest.room, 'bp_hp9h') === 'paid'
    && (honest.room._botfpRecord('bp_hp9h', T).counters.startless || 0) === 0);
}

Date.now = REAL_NOW;
console.log(failures === 0 ? '\nharvest-proof: all checks passed' : `\nharvest-proof: ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
