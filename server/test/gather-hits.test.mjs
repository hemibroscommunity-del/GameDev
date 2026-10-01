/* GATHERING HITS (v2.3.2956) — the node has hit points.
 *
 * Owner: "the resource has something akin to an hp bar and the player ticks
 * away at it and the tick range is determined by their skill level ...
 * level 1 would do 1 tick per second (or whatever interval makes the most
 * sense) until the 10 ticks assigned to the resource are exhausted.  At that
 * point the user would have to do the gesture ... Level 2 might be a tick
 * from 1-2 ... The next tier resource would have a higher max number of
 * ticks."  Then: "Just add it for every resource gathering process."
 *
 * The worker rolls the hits (gathering.js _planGatherHits) and answers the
 * harvester privately with `gather_hits`; the strike that follows the gesture
 * is validated against the plan instead of the old timer.  What this suite
 * pins, section by section:
 *   1. the numbers: node HP by tier, and the dice (1..level, the last hit is
 *      the one that crosses zero, the MAX_HITS bound);
 *   2. the round trip: hitSeq in, gather_hits out, the record rewritten to
 *      the plan's exact window (and what the operator view reports);
 *   3. the skill is the NODE's, never the payload's;
 *   4. the strike window: refused one beat early, paid one beat late;
 *   5. an OLD client (no hitSeq) keeps the timer, byte-identical, and is sent
 *      nothing (deploy-order safety, rule 19);
 *   6. junk hitSeq values fall back to the timer without throwing;
 *   7. the kill switch answers `off` and keeps the timer;
 *   8. no re-roll fishing: a restart on the same node replays its rolls,
 *      until the window lapses or the harvest is paid;
 *   9. the caps flag, its name, and PRIVILEGED_EVENTS.
 * mp-gatherhits covers the other half -- the client actually playing the
 * plan, through the real shim, in a real zone -- which no fixture here can
 * reach (TRAPS #18). */
import { GameRoom, PRIVILEGED_EVENTS } from '../src/index.js';
import { GATHER_HITS } from '../src/gathering.js';

function makeState(liveflags) {
  const store = new Map();
  if (liveflags) store.set('liveflags', liveflags);
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
const env = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs(label) { return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }
const ofType = (ws, type) => ws.sent.filter((m) => m.type === type);

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

/* A joined player standing in a gathering zone with all three tools, and the
   zone's nodes forced alive. */
async function setup(liveflags) {
  const room = new GameRoom(makeState(liveflags), env);
  const ws = fakeWs('g');
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
  await room.webSocketMessage(ws, JSON.stringify({
    type: 'join', id: 'bp_gh', name: 'Gatherer', phrase: 'p-gh', protocolVersion: 2,
    data: { x: 500, y: 500, z: 'meadow' },
  }));
  const ps = room.playerState.bp_gh;
  ps.z = 'meadow';
  ps.inventory = { woodcutting_axe: 1, fishing_pole: 1, mining_pickaxe: 1 };
  ps.lifeSkills = {};
  const nodes = room._ensureZoneNodes('meadow');
  for (const n of nodes) { n.alive = true; n.respawnAt = 0; }
  const byType = (t) => nodes.find((n) => n.nodeType === t);
  const send = (type, payload) => room.webSocketMessage(ws, JSON.stringify({ type, payload }));
  const stand = (n) => { ps.x = n.x; ps.y = n.y; };
  return { room, ws, ps, session: room.sessions.get(ws), byType, send, stand };
}
const SKILL = { oreVein: 'mining', tree: 'woodcutting', fishSpot: 'fishing' };

/* Math.random under a stub, restored even if the body throws. */
async function withRandom(fn, body) {
  const real = Math.random;
  Math.random = fn;
  try { return await body(); } finally { Math.random = real; }
}

// ── 1. the numbers ──
{
  const { room } = await setup();
  check('hp: the first tier is the owner\'s 10', room._gatherNodeHp(1) === 10, room._gatherNodeHp(1));
  check('hp: a tier unlocked at 6 is 35 (about ten hits at its own level)', room._gatherNodeHp(6) === 35, room._gatherNodeHp(6));
  check('hp: junk tiers read as the first tier', room._gatherNodeHp(undefined) === 10 && room._gatherNodeHp('x') === 10 && room._gatherNodeHp(-4) === 10);

  const l1 = room._rollGatherHits(1, 10);
  check('dice: level 1 is ten hits of 1 (the owner\'s example, exactly)', l1.length === 10 && l1.every((d) => d === 1), l1);
  const junk = room._rollGatherHits(undefined, 10);
  check('dice: a missing level rolls as level 1', junk.length === 10 && junk.every((d) => d === 1), junk);

  let inRange = true, crossesLast = true, minLen = Infinity, maxLen = 0;
  for (let i = 0; i < 2000; i++) {
    const h = room._rollGatherHits(3, 10);
    const sum = h.reduce((a, b) => a + b, 0);
    if (!h.every((d) => Number.isInteger(d) && d >= 1 && d <= 3)) inRange = false;
    if (!(sum >= 10 && sum - h[h.length - 1] < 10)) crossesLast = false;
    minLen = Math.min(minLen, h.length); maxLen = Math.max(maxLen, h.length);
  }
  check('dice: level 3 rolls 1-3 every time', inRange);
  check('dice: the LAST hit is the one that breaks the node (no hit after zero)', crossesLast);
  check('dice: level 3 needs 4..10 hits on 10 HP', minLen >= 4 && maxLen <= 10, { minLen, maxLen });

  let oneShots = 0, top = 0;
  for (let i = 0; i < 4000; i++) {
    const h = room._rollGatherHits(50, 10);
    if (h.length === 1) oneShots++;
    top = Math.max(top, ...h);
  }
  /* P(one roll of 1..50 >= 10) = 41/50 = 0.82 */
  check('dice: a high level one-shots a first-tier node about 82% of the time', oneShots / 4000 > 0.78 && oneShots / 4000 < 0.86, oneShots / 4000);
  check('dice: ...and never rolls above its level', top <= 50 && top >= 45, top);

  const huge = room._rollGatherHits(1, room._gatherNodeHp(96));
  const hugeSum = huge.reduce((a, b) => a + b, 0);
  check('dice: MAX_HITS bounds a far-under-levelled plan, and its last hit finishes the node',
    huge.length === GATHER_HITS.MAX_HITS && hugeSum >= room._gatherNodeHp(96) && huge.slice(0, -1).every((d) => d === 1),
    { len: huge.length, sum: hugeSum, last: huge[huge.length - 1] });
}

// ── 2. the round trip ──
{
  const { room, ws, ps, byType, send, stand } = await setup();
  const ore = byType('oreVein');
  stand(ore);
  ps.lifeSkills = { mining: { level: 4, xp: 0 } };
  ws.sent.length = 0;
  await send('extraction_start', { nodeId: ore.id, zone: 'meadow', skill: 'mining', hitSeq: 7 });
  const msg = ofType(ws, 'gather_hits')[0];
  const p = msg && msg.payload;
  const rec = room.extractions.bp_gh;
  check('round trip: a client that asks gets ONE gather_hits back', ofType(ws, 'gather_hits').length === 1, ws.sent.map((m) => m.type));
  check('round trip: it echoes the attempt seq, the node and the zone', !!p && p.seq === 7 && p.nodeId === ore.id && p.zone === 'meadow', p);
  check('round trip: hp is the node\'s (10 on the first tier)', !!p && p.hp === 10, p && p.hp);
  check('round trip: every hit is 1..level (level 4)', !!p && Array.isArray(p.hits) && p.hits.length >= 3 && p.hits.every((d) => d >= 1 && d <= 4), p && p.hits);
  check('round trip: the record holds the SAME hits the client was sent',
    !!rec && JSON.stringify(rec.hits) === JSON.stringify(p && p.hits), { rec: rec && rec.hits, sent: p && p.hits });
  check('round trip: the window is exactly (hits - 1) pick swings, with no jitter',
    !!rec && rec.jitter === 0 && rec.openDelayBase === (rec.hits.length - 1) * GATHER_HITS.MS.mining,
    rec && { jitter: rec.jitter, openDelayBase: rec.openDelayBase, n: rec.hits.length });
  const view = room._gatherHitPlanFor('bp_gh');
  check('round trip: the operator view reports the plan in flight',
    !!view && view.nodeId === ore.id && view.skill === 'mining' && view.level === 4 && view.hp === 10
      && JSON.stringify(view.hits) === JSON.stringify(rec.hits) && view.windowMs === rec.openDelayBase, view);
  check('round trip: the shield still engages over a plan (monsters leave you alone while you hit)',
    (() => { ps.ex = 'mine'; return room._extractionShielded('bp_gh') === true; })());
  ps.ex = null;
}

// ── 3. the skill is the node's ──
{
  const { room, ws, ps, byType, send, stand } = await setup();
  const tree = byType('tree');
  stand(tree);
  ps.lifeSkills = { mining: { level: 40, xp: 0 }, woodcutting: { level: 1, xp: 0 } };
  ws.sent.length = 0;
  /* A modified client claims the tree is a mining job, to cut it at mining 40. */
  await send('extraction_start', { nodeId: tree.id, zone: 'meadow', skill: 'mining', hitSeq: 1 });
  const p = (ofType(ws, 'gather_hits')[0] || {}).payload;
  check('skill: a tree is cut at the WOODCUTTING level whatever the payload claims',
    !!p && p.hits.length === 10 && p.hits.every((d) => d === 1), p && p.hits);
  const rec = room.extractions.bp_gh;
  check('skill: ...and its window is measured in AXE swings', !!rec && rec.openDelayBase === 9 * GATHER_HITS.MS.woodcutting, rec && rec.openDelayBase);
}

// ── 4. the strike window ──
{
  const { room, ws, ps, session, byType, send, stand } = await setup();
  const fish = byType('fishSpot');
  stand(fish);
  ps.lifeSkills = { fishing: { level: 1, xp: 0 } };
  await send('extraction_start', { nodeId: fish.id, zone: 'meadow', skill: 'fishing', hitSeq: 3 });
  const rec = room.extractions.bp_gh;
  const windowMs = rec.openDelayBase;
  check('window: level 1 on 10 HP is nine rod-beats of window', windowMs === 9 * GATHER_HITS.MS.fishing, windowMs);
  const invKey = room._harvestInvKey(fish.nodeType, fish.tierLvl);

  await send('node_strike', { id: fish.id, zone: 'meadow', accuracy: 'good' });
  check('window: a strike straight away is refused as too early (the hits have not been played)',
    fish.alive === true && (room._lastStrikeFor('bp_gh') || {}).why === 'too-early' && !(ps.inventory[invKey] > 0),
    room._lastStrikeFor('bp_gh'));
  check('window: ...and the refusal names how many hits it was waiting on', (room._lastStrikeFor('bp_gh') || {}).hits === 10, room._lastStrikeFor('bp_gh'));

  /* One beat early: the bound is startedAt + window - EXTRACTION_GRACE_MS. */
  rec.startedAt = Date.now() - (windowMs - room.EXTRACTION_GRACE_MS - 150);
  await send('node_strike', { id: fish.id, zone: 'meadow', accuracy: 'good' });
  check('window: 150 ms inside the bound is still refused', fish.alive === true && session._extractionRejects >= 2, { rejects: session._extractionRejects });

  rec.startedAt = Date.now() - (windowMs - room.EXTRACTION_GRACE_MS + 50);
  ws.sent.length = 0;
  await send('node_strike', { id: fish.id, zone: 'meadow', accuracy: 'good' });
  check('window: 50 ms past the bound is paid (node spent, fish in the bag, credit sent)',
    fish.alive === false && ps.inventory[invKey] === 1 && ofType(ws, 'harvest_credit').length === 1,
    { alive: fish.alive, inv: ps.inventory[invKey], last: room._lastStrikeFor('bp_gh') });
  check('window: a paid strike clears the plan', !room.extractions.bp_gh && room._gatherHitPlanFor('bp_gh') === null);
}

// ── 5. an old client keeps the timer ──
{
  const { room, ws, ps, byType, send, stand } = await setup();
  const ore = byType('oreVein');
  stand(ore);
  ps.lifeSkills = { mining: { level: 1, xp: 0 } };
  ws.sent.length = 0;
  await send('extraction_start', { nodeId: ore.id, zone: 'meadow', skill: 'mining' });
  const rec = room.extractions.bp_gh;
  check('old client: no hitSeq, no gather_hits', ofType(ws, 'gather_hits').length === 0, ws.sent.map((m) => m.type));
  check('old client: the record is the timer\'s, untouched (computeOpenDelay, default jitter, no hits)',
    !!rec && rec.openDelayBase === room._computeOpenDelayBase(1, ore.tierLvl || 1) && rec.jitter === undefined && rec.hits === undefined,
    rec);
  check('old client: the operator view says there is no plan', room._gatherHitPlanFor('bp_gh') === null);
  /* Inside the timer's own window (4000 ms at level == tier, -15% jitter) the
     strike pays, plan or no plan -- the old client is never held to hits. */
  rec.startedAt = Date.now() - rec.openDelayBase;
  await send('node_strike', { id: ore.id, zone: 'meadow', accuracy: 'good' });
  check('old client: a strike inside the timer window is paid', ore.alive === false, room._lastStrikeFor('bp_gh'));
}

// ── 6. junk hitSeq ──
{
  const { room, ws, ps, byType, send, stand } = await setup();
  const ore = byType('oreVein');
  stand(ore);
  ps.lifeSkills = { mining: { level: 2, xp: 0 } };
  let threw = null, sent = 0, planned = 0;
  for (const bad of ['1', -3, 1.5, 0, 2e9, null, {}, [], true, '__proto__', NaN, Infinity]) {
    ws.sent.length = 0;
    try { await send('extraction_start', { nodeId: ore.id, zone: 'meadow', skill: 'mining', hitSeq: bad }); }
    catch (e) { threw = String(e); }
    sent += ofType(ws, 'gather_hits').length;
    if (room.extractions.bp_gh && room.extractions.bp_gh.hits) planned++;
  }
  check('junk hitSeq: never throws', threw === null, threw);
  check('junk hitSeq: never answered with a plan, and never recorded one', sent === 0 && planned === 0, { sent, planned });
}

// ── 7. the kill switch ──
{
  const { room, ws, ps, byType, send, stand } = await setup({ gatherhits: false });
  const sync = ws.sent.find((m) => m.type === 'state_sync');
  check('kill switch: gatherhits:false in liveflags un-advertises the hits', !!sync && !!sync.caps && sync.caps.gatherhits === false,
    sync && sync.caps && sync.caps.gatherhits);
  const tree = byType('tree');
  stand(tree);
  ps.lifeSkills = { woodcutting: { level: 3, xp: 0 } };
  ws.sent.length = 0;
  /* A client that joined BEFORE the switch was thrown still asks. */
  await send('extraction_start', { nodeId: tree.id, zone: 'meadow', skill: 'woodcutting', hitSeq: 5 });
  const p = (ofType(ws, 'gather_hits')[0] || {}).payload;
  check('kill switch: ...a client that still asks is answered `off`, so it drops to the timer at once',
    !!p && p.off === true && p.seq === 5 && p.nodeId === tree.id && !p.hits, p);
  const rec = room.extractions.bp_gh;
  check('kill switch: ...and its record is the timer\'s', !!rec && !rec.hits && rec.jitter === undefined
    && rec.openDelayBase === room._computeOpenDelayBase(3, tree.tierLvl || 1), rec);
}

// ── 8. no re-roll fishing ──
{
  const { room, ws, ps, byType, send, stand } = await setup();
  const ore = byType('oreVein');
  const tree = byType('tree');
  stand(ore);
  ps.lifeSkills = { mining: { level: 6, xp: 0 }, woodcutting: { level: 6, xp: 0 } };
  const planOf = () => (ofType(ws, 'gather_hits').pop() || {}).payload;
  ws.sent.length = 0;
  await withRandom(() => 0, () => send('extraction_start', { nodeId: ore.id, zone: 'meadow', skill: 'mining', hitSeq: 1 }));
  const first = planOf();
  check('re-roll: (fixture) the stubbed first plan is ten 1s', !!first && first.hits.length === 10, first && first.hits);
  ws.sent.length = 0;
  await withRandom(() => 0.999, () => send('extraction_start', { nodeId: ore.id, zone: 'meadow', skill: 'mining', hitSeq: 2 }));
  const again = planOf();
  check('re-roll: a restart on the SAME node replays the same hits (new seq, same dice)',
    !!again && again.seq === 2 && JSON.stringify(again.hits) === JSON.stringify(first.hits), again);
  check('re-roll: ...and restarts the clock, so replaying buys no time',
    room.extractions.bp_gh.startedAt >= Date.now() - 50 && room.extractions.bp_gh.openDelayBase === 9 * GATHER_HITS.MS.mining);

  /* Past REUSE_MS the node rolls fresh. */
  room.extractions.bp_gh.rolledAt = Date.now() - GATHER_HITS.REUSE_MS - 1;
  ws.sent.length = 0;
  await withRandom(() => 0.999, () => send('extraction_start', { nodeId: ore.id, zone: 'meadow', skill: 'mining', hitSeq: 3 }));
  const fresh = planOf();
  check('re-roll: past the reuse window the node rolls fresh', !!fresh && fresh.hits.length === 2 && fresh.hits.every((d) => d === 6), fresh && fresh.hits);

  /* A different node is a different roll. */
  stand(tree);
  ws.sent.length = 0;
  await withRandom(() => 0, () => send('extraction_start', { nodeId: tree.id, zone: 'meadow', skill: 'woodcutting', hitSeq: 4 }));
  const other = planOf();
  check('re-roll: a different node rolls its own hits', !!other && other.nodeId === tree.id && other.hits.length === 10, other);

  /* A PAID harvest clears the memory: the respawned node rolls fresh. */
  stand(ore);
  ws.sent.length = 0;
  await withRandom(() => 0, () => send('extraction_start', { nodeId: ore.id, zone: 'meadow', skill: 'mining', hitSeq: 5 }));
  room.extractions.bp_gh.startedAt = Date.now() - room.extractions.bp_gh.openDelayBase;
  await send('node_strike', { id: ore.id, zone: 'meadow', accuracy: 'good' });
  ore.alive = true; ore.respawnAt = 0;
  ws.sent.length = 0;
  await withRandom(() => 0.999, () => send('extraction_start', { nodeId: ore.id, zone: 'meadow', skill: 'mining', hitSeq: 6 }));
  const afterPay = planOf();
  check('re-roll: after a paid harvest the next one rolls fresh', !!afterPay && afterPay.hits.length === 2, afterPay && afterPay.hits);
}

// ── 9. the flag and the event ──
{
  const { ws } = await setup();
  const sync = ws.sent.find((m) => m.type === 'state_sync');
  check('caps: a fresh room advertises gatherhits', !!sync && sync.caps && sync.caps.gatherhits === true, sync && sync.caps && sync.caps.gatherhits);
  const { LIVEOPS } = await import('../src/liveops.js');
  check('caps: the kill switch\'s name is one the admin flags route accepts (TRAPS §117)', LIVEOPS.FLAG_NAME_RE.test('gatherhits'));
  check('wire: gather_hits is privileged, so no client can forge a plan for another (rule 13)', PRIVILEGED_EVENTS.has('gather_hits'));
  check('config: every hit skill has a swing length', ['mining', 'woodcutting', 'fishing'].every((s) => GATHER_HITS.MS[s] > 0)
    && Object.keys(GATHER_HITS.MS).length === 3, GATHER_HITS.MS);
  check('config: every gathering node type maps to a hit skill', Object.keys(SKILL).every((t) => GATHER_HITS.MS[SKILL[t]] > 0));
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
