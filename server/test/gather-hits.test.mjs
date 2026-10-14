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
 *   5b. the client's own fallback (a re-declare without hitSeq) REPLACES a
 *      recorded plan, so the strike is held to the timer it actually ran;
 *   6. junk hitSeq values fall back to the timer without throwing;
 *   7. the kill switch answers `off` and keeps the timer;
 *   8. no re-roll fishing: a restart on the same node replays its rolls,
 *      until the window lapses or the harvest is paid;
 *   9. the caps flag, its name, and PRIVILEGED_EVENTS;
 *   10. a COOK's hits (owner: "Make it appear for cooking too"): the fish
 *      has the HP, the cooking level rolls them, the answer names the fish,
 *      no record is kept, and cook_request is held to nothing new;
 *   11. the HIT LADDER (v2.3.3229, owner: "after the first level you get a
 *      10% chance of hitting 1 number higher"): a ten-sided die read down
 *      from the level, every face of it, the shares real dice give, the
 *      plans and cooks that roll it, its cap and its kill switch;
 *   12. EACH TIER TWICE AS LONG (v2.3.3251, owner: "each tiers unlocks ... to
 *      take about 2x longer on average than the previous tier's lowest level
 *      extraction time"): the HP table solved again exactly over the dice,
 *      no plan at a resource's own level reaching MAX_HITS, plans by the
 *      node's type, cooks unchanged, the shield from the window's opening,
 *      the cap and its kill switch.
 *   13. EACH TIER PAYS TWICE THE XP, AND XP FADES BELOW YOU (v2.3.3251,
 *      owner: "Yes adjust the xp.  Also make xp decay if you're trying to
 *      harvest lower level things ... It should always be most efficient to
 *      harvest or fight things within your current level"): the XP table,
 *      what a strike really pays at, 4 and 10 levels past a resource, the
 *      rule held over the dice at every level 1-100 of all three skills,
 *      the caps and both kill switches.  The fight half: xp-decay.test.mjs.
 * mp-gatherhits covers the other half -- the client actually playing the
 * plan, through the real shim, in a real zone -- which no fixture here can
 * reach (TRAPS #18). */
import { GameRoom, PRIVILEGED_EVENTS } from '../src/index.js';
import { GATHER_HITS, gatherHitRoll, GATHER_NODE_HP, GATHER_REQ_LVL, gatherNodeHp } from '../src/gathering.js';   /* gatherHitRoll v2.3.3229; the HP table v2.3.3251 */
import { GATHER_TIER_XP, harvestBaseXp, HONEST_CYCLE } from '../src/gathering.js';   /* v2.3.3251: the XP a tier */
import { xpDecayMult, xpAfterDecay } from '../src/xpdecay.js';   /* v2.3.3251: the fade */

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
  check('hp: with no node type (a cook\'s fish) tier 6 is still 5 x (6 + 1) = 35 (v2.3.3251: a node\'s is by its type, section 12)', room._gatherNodeHp(6) === 35, room._gatherNodeHp(6));
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

  let oneShots = 0, top = 0, low = Infinity;
  for (let i = 0; i < 4000; i++) {
    const h = room._rollGatherHits(50, 10);
    if (h.length === 1) oneShots++;
    top = Math.max(top, ...h); low = Math.min(low, ...h);
  }
  /* v2.3.3229: the hit ladder (section 11) rolls 41..50 at level 50, so a
     first-tier node is always one hit.  v2.3.2956's even 1..50 did it 41
     times in 50 -- that check moved to the ladder's kill switch below. */
  check('dice: a high level one-shots a first-tier node every time (the ladder rolls 41-50 at level 50)', oneShots === 4000, oneShots / 4000);
  check('dice: ...and never rolls above its level, nor more than nine under it', top === 50 && low === 41, { top, low });

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

// ── 5b. a plan, then the client re-declares on the timer ──
// The client's own fallback (no plan in GATHER_HIT_PLAN_WAIT_MS, or a plan it
// cannot play) re-sends extraction_start WITHOUT hitSeq.  That must REPLACE a
// recorded plan, or the worker would hold the strike to hits the client never
// played: at level 1 the plan's bound is 9 swings (5.85 s), the timer's ~3.15 s,
// so a strike at 4 s tells the two apart.  (Review found this path untested:
// section 5 is a fresh old client, and mp-gatherhits' "no answer" case uses a
// seq the worker ignores, so no plan is ever recorded first.)
{
  const { room, ws, ps, byType, send, stand } = await setup();
  const ore = byType('oreVein');
  stand(ore);
  ps.lifeSkills = { mining: { level: 1, xp: 0 } };
  await send('extraction_start', { nodeId: ore.id, zone: 'meadow', skill: 'mining', hitSeq: 9 });
  check('re-declare: (fixture) a ten-hit plan is recorded first', Array.isArray((room.extractions.bp_gh || {}).hits)
    && room.extractions.bp_gh.hits.length === 10, room.extractions.bp_gh);
  ws.sent.length = 0;
  await send('extraction_start', { nodeId: ore.id, zone: 'meadow', skill: 'mining' });
  const rec = room.extractions.bp_gh;
  check('re-declare: the timer start REPLACES the plan (no hits, default jitter, the timer window)',
    !!rec && rec.hits === undefined && rec.jitter === undefined && rec.openDelayBase === room._computeOpenDelayBase(1, ore.tierLvl || 1),
    rec && { hits: rec.hits, jitter: rec.jitter, openDelayBase: rec.openDelayBase });
  check('re-declare: ...is answered with nothing, and the operator view drops the plan',
    ofType(ws, 'gather_hits').length === 0 && room._gatherHitPlanFor('bp_gh') === null);
  rec.startedAt = Date.now() - 4000;
  await send('node_strike', { id: ore.id, zone: 'meadow', accuracy: 'good' });
  check('re-declare: a strike at 4 s is paid -- held to the timer, not to the plan it replaced',
    ore.alive === false && (room._lastStrikeFor('bp_gh') || {}).why === 'paid', room._lastStrikeFor('bp_gh'));
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
  check('config: every hit skill has a swing length', ['mining', 'woodcutting', 'fishing', 'cooking'].every((s) => GATHER_HITS.MS[s] > 0)
    && Object.keys(GATHER_HITS.MS).length === 4, GATHER_HITS.MS);
  check('config: every gathering node type maps to a hit skill', Object.keys(SKILL).every((t) => GATHER_HITS.MS[SKILL[t]] > 0));
}

// ── 10. a cook's hits ──
{
  const { room, ws, ps, byType, send, stand } = await setup();
  ps.inventory.fish_minnow = 3;
  ps.lifeSkills = { cooking: { level: 3, xp: 0 }, mining: { level: 50, xp: 0 } };
  const planOf = () => (ofType(ws, 'gather_hits').pop() || {}).payload;
  ws.sent.length = 0;
  await send('extraction_start', { skill: 'cooking', fishKey: 'fish_minnow', hitSeq: 11 });
  const p = planOf();
  check('cook: a cook that asks gets ONE gather_hits back', ofType(ws, 'gather_hits').length === 1, ws.sent.map((m) => m.type));
  check('cook: it names the attempt by seq and FISH (the campfire has no id the worker knows)',
    !!p && p.seq === 11 && p.fishKey === 'fish_minnow' && p.nodeId === undefined, p);
  check('cook: a minnow (tier 1) has the owner\'s 10 HP', !!p && p.hp === 10, p && p.hp);
  check('cook: the dice are the COOKING level (3), not another skill\'s (mining 50)',
    !!p && p.hits.every((d) => d >= 1 && d <= 3) && p.hits.reduce((a, b) => a + b, 0) >= 10
      && p.hits.slice(0, -1).reduce((a, b) => a + b, 0) < 10, p && p.hits);
  check('cook: no extraction record is kept (nothing for a node strike to read)', room.extractions.bp_gh === undefined, room.extractions.bp_gh);
  const view = room._gatherHitPlanFor('bp_gh');
  check('cook: the operator view reports the cook in flight',
    !!view && view.skill === 'cooking' && view.fishKey === 'fish_minnow' && view.level === 3 && view.hp === 10
      && JSON.stringify(view.hits) === JSON.stringify(p.hits), view);

  /* The fish's tier is the HP: the same 5 x (tier + 1) as a node. */
  const hpOf = async (fishKey) => { ws.sent.length = 0; await send('extraction_start', { skill: 'cooking', fishKey, hitSeq: 12 }); return (planOf() || {}).hp; };
  const hps = { clownfish: await hpOf('fish_clownfish'), trout: await hpOf('fish_trout'), unknown: await hpOf('fish_mystery') };
  check('cook: a higher-tier fish has more HP (clownfish 35, trout 60), an unknown one the first tier\'s',
    hps.clownfish === 35 && hps.trout === 60 && hps.unknown === 10, hps);

  /* With no cooking level at all: level 1, the owner's ten hits of 1. */
  ps.lifeSkills = { mining: { level: 50, xp: 0 } };
  ws.sent.length = 0;
  await send('extraction_start', { skill: 'cooking', fishKey: 'fish_minnow', hitSeq: 13 });
  const l1 = planOf();
  check('cook: no cooking level rolls as level 1 (ten 1s on a minnow)', !!l1 && l1.hits.length === 10 && l1.hits.every((d) => d === 1), l1 && l1.hits);

  /* A cook is held to nothing new: cook_request at once still cooks. */
  ps.lifeSkills = { cooking: { level: 1, xp: 0 } };
  ws.sent.length = 0;
  await send('extraction_start', { skill: 'cooking', fishKey: 'fish_minnow', hitSeq: 14 });
  const before = ps.inventory.fish_minnow;
  await send('cook_request', { fishKey: 'fish_minnow', kind: 'cooked', taps: [] });
  check('cook: cook_request is held to NO plan -- an immediate cook still cooks (its bounds stay the floor, the rate and botfp)',
    ps.inventory.fish_minnow === before - 1 && (ps.inventory.cooked_fish_minnow || 0) === 1,
    { raw: ps.inventory.fish_minnow, cooked: ps.inventory.cooked_fish_minnow });
  check('cook: ...and the cooked fish spends the plan (the operator view clears)', room._gatherHitPlanFor('bp_gh') === null, room._gatherHitPlanFor('bp_gh'));

  /* The operator view is whichever attempt was asked for last. */
  const ore = byType('oreVein');
  stand(ore);
  ps.lifeSkills = { mining: { level: 2, xp: 0 }, cooking: { level: 2, xp: 0 } };
  await send('extraction_start', { nodeId: ore.id, zone: 'meadow', skill: 'mining', hitSeq: 15 });
  const gatherRec = room.extractions.bp_gh;
  ps._cookHits = null;
  room.extractions.bp_gh.startedAt -= 5;   /* the clock is ms-coarse: make "later" unambiguous */
  await send('extraction_start', { skill: 'cooking', fishKey: 'fish_minnow', hitSeq: 16 });
  check('cook: a cook started after a harvest is what the operator view shows', (room._gatherHitPlanFor('bp_gh') || {}).skill === 'cooking');
  check('cook: ...and it leaves the harvest\'s record alone', room.extractions.bp_gh === gatherRec && Array.isArray(gatherRec.hits));
  ps._cookHits.rolledAt -= 10;
  room.extractions.bp_gh.startedAt = Date.now();
  check('cook: ...a harvest started after a cook is what it shows then', (room._gatherHitPlanFor('bp_gh') || {}).skill === 'mining');

  /* Junk: nothing answered, nothing thrown. */
  let threw = null, sent = 0;
  const junk = [
    { skill: 'cooking', fishKey: 'fish_minnow' },                         /* no hitSeq: an old shape */
    { skill: 'cooking', fishKey: 'fish_minnow', hitSeq: '1' },
    { skill: 'cooking', fishKey: 'fish_minnow', hitSeq: 2e9 },
    { skill: 'cooking', fishKey: 'cooked_fish_minnow', hitSeq: 1 },
    { skill: 'cooking', fishKey: '__proto__', hitSeq: 1 },
    { skill: 'cooking', fishKey: 'fish_' + 'x'.repeat(80), hitSeq: 1 },
    { skill: 'cooking', fishKey: { toString: () => 'fish_minnow' }, hitSeq: 1 },
    { skill: 'cooking', hitSeq: 1 },
  ];
  for (const bad of junk) {
    ws.sent.length = 0;
    try { await send('extraction_start', bad); } catch (e) { threw = String(e); }
    sent += ofType(ws, 'gather_hits').length;
  }
  check('cook: junk never throws', threw === null, threw);
  check('cook: junk is never answered', sent === 0, sent);
}
{
  /* The cook's shield (monsters leave a cook alone) has to outlast the
     longest cook a plan can make: COOK_MAX_HITS pan beats (v2.3.3251: a
     cook's own bound, MAX_HITS being a node's), then the gesture.
     It used to lapse at 30 s, mid-flip (index.js COOK_SHIELD_MS). */
  const { room, ps } = await setup();
  ps.ex = 'cook'; ps._exX = ps.x; ps._exY = ps.y;
  const longest = GATHER_HITS.COOK_MAX_HITS * GATHER_HITS.MS.cooking;
  ps._exAt = Date.now() - (longest + 30000);
  check('cook: the shield outlasts the longest plan plus a slow gesture (COOK_MAX_HITS beats + 30 s)',
    room._extractionShielded('bp_gh') === true, { longestMs: longest, ceiling: room.COOK_SHIELD_MS });
  ps._exAt = Date.now() - room.COOK_SHIELD_MS - 1000;
  check('cook: ...and still has a ceiling', room._extractionShielded('bp_gh') === false);
}
{
  const { ws, ps, send } = await setup({ gatherhits: false });
  ps.lifeSkills = { cooking: { level: 4, xp: 0 } };
  ws.sent.length = 0;
  await send('extraction_start', { skill: 'cooking', fishKey: 'fish_minnow', hitSeq: 3 });
  const p = (ofType(ws, 'gather_hits')[0] || {}).payload;
  check('cook: the kill switch answers a cook `off` too, naming its fish', !!p && p.off === true && p.seq === 3 && p.fishKey === 'fish_minnow' && !p.hits, p);
}

// ── 11. the hit ladder (v2.3.3229) ──
// Owner, 2026-10-14: "after the first level you get a 10% chance of hitting 1
// number higher.  The next level you get a 10% chance of hitting 1 number
// higher than that.  So lvl 2 has a 10% chance of hitting 2 otherwise 1.  Lvl
// 3 has a 10% chance of hitting 3 otherwise 1.  Etc. the number 1 will
// eventually get replaced by the 2 as more 10% chances get added with each
// level."  So every face of a ten-sided die, read down from the level.
{
  /* every face of the die once, by a draw in the middle of it */
  const faces = (lvl, ladder = true) => {
    const n = ladder ? GATHER_HITS.LADDER : Math.max(1, Math.floor(lvl));
    const out = {};
    for (let f = 0; f < n; f++) { const d = gatherHitRoll(lvl, (f + 0.5) / n, ladder); out[d] = (out[d] || 0) + 1; }
    return out;
  };
  /* {n: faces} for "1 on `ones` faces, then one face each from `from` to `to`" */
  const want = (ones, from, to) => {
    const out = {};
    if (ones) out[1] = ones;
    for (let k = from; k <= to; k++) out[k] = (out[k] || 0) + 1;
    return out;
  };
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  check('ladder: the die has ten faces, a 10% chance each', GATHER_HITS.LADDER === 10, GATHER_HITS.LADDER);
  check('ladder: level 1 always hits 1', same(faces(1), { 1: 10 }), faces(1));
  check('ladder: level 2 hits 2 on one face in ten, otherwise 1 (the owner\'s example)', same(faces(2), { 1: 9, 2: 1 }), faces(2));
  check('ladder: level 3 adds a face of 3 -- 1 on eight faces, 2 on one, 3 on one', same(faces(3), { 1: 8, 2: 1, 3: 1 }), faces(3));
  check('ladder: level 10 is 1..10, one face each (exactly the old dice\'s level 10)', same(faces(10), want(0, 1, 10)), faces(10));
  check('ladder: level 11 has no 1 any more -- 2..11, one face each ("replaced by the 2")', same(faces(11), want(0, 2, 11)), faces(11));
  check('ladder: level 12 is 3..12, level 20 is 11..20', same(faces(12), want(0, 3, 12)) && same(faces(20), want(0, 11, 20)),
    { 12: faces(12), 20: faces(20) });
  let badLow = null, badHigh = null;
  for (let L = 1; L <= 10 && !badLow; L++) if (!same(faces(L), want(11 - L, 2, L))) badLow = { L, got: faces(L) };
  for (let L = 10; L <= 120 && !badHigh; L++) if (!same(faces(L), want(0, L - 9, L))) badHigh = { L, got: faces(L) };
  check('ladder: up to level 10, level L hits 1 on 11-L faces and each of 2..L on one', badLow === null, badLow);
  check('ladder: from level 10 on, level L hits each of L-9..L on one face', badHigh === null, badHigh);

  let notMonotone = null;
  for (const ladder of [true, false]) {
    for (const L of [1, 2, 3, 7, 10, 11, 25, 60]) {
      let prev = 0;
      for (let i = 0; i < 1000 && !notMonotone; i++) {
        const d = gatherHitRoll(L, i / 1000, ladder);
        if (d < prev) notMonotone = { ladder, L, r: i / 1000, d, prev };
        prev = d;
      }
    }
  }
  check('ladder: a higher draw is never a lower hit, on either die (the stubbed-dice fixtures rely on it)', notMonotone === null, notMonotone);
  const edges = [
    gatherHitRoll(5, 0, true), gatherHitRoll(5, 0.9999999, true), gatherHitRoll(5, 1, true), gatherHitRoll(5, -1, true),
    gatherHitRoll(5, NaN, true), gatherHitRoll(undefined, 0.99, true), gatherHitRoll('__proto__', 0.99, true), gatherHitRoll(0, 0.99, true),
    gatherHitRoll(5, 1, false), gatherHitRoll(5, 0, false),
  ];
  check('ladder: draws and levels at the edges stay on the die (a draw of 1 is the top face, junk levels are level 1)',
    same(edges, [1, 5, 5, 1, 1, 1, 1, 1, 5, 1]), edges);

  /* The real dice: each plan on a 1-HP node is exactly one roll. */
  const { room } = await setup();
  const share = (lvl, n) => {
    const c = {}; let sum = 0;
    for (let i = 0; i < n; i++) { const d = room._rollGatherHits(lvl, 1)[0]; c[d] = (c[d] || 0) + 1; sum += d; }
    return { c, mean: sum / n };
  };
  const l3 = share(3, 20000);
  check('ladder: real dice at level 3 hit 1 about 80% of the time, 2 and 3 about 10% each',
    l3.c[1] / 20000 > 0.78 && l3.c[1] / 20000 < 0.82 && l3.c[2] / 20000 > 0.085 && l3.c[2] / 20000 < 0.115
      && l3.c[3] / 20000 > 0.085 && l3.c[3] / 20000 < 0.115 && Object.keys(l3.c).length === 3, l3.c);
  const l5 = share(5, 20000), l15 = share(15, 20000);
  check('ladder: the average hit is 2.0 at level 5 (the old dice: 3.0) and 10.5 at level 15 (the old: 8.0)',
    Math.abs(l5.mean - 2.0) < 0.05 && Math.abs(l15.mean - 10.5) < 0.1, { l5: l5.mean, l15: l15.mean });

  /* The plan the worker SENDS rolls it: a level-11 miner never hits a 1. */
  const g = await setup();
  const ore = g.byType('oreVein');
  g.stand(ore);
  g.ps.lifeSkills = { mining: { level: 11, xp: 0 }, cooking: { level: 11, xp: 0 } };
  let planHits = [], plans = 0;
  for (let i = 0; i < 40; i++) {
    delete g.room.extractions.bp_gh;   /* no replay of the last plan (section 8) */
    g.ws.sent.length = 0;
    await g.send('extraction_start', { nodeId: ore.id, zone: 'meadow', skill: 'mining', hitSeq: 100 + i });
    const p = (ofType(g.ws, 'gather_hits')[0] || {}).payload;
    if (p && Array.isArray(p.hits)) { plans++; planHits = planHits.concat(p.hits); }
  }
  check('ladder: every plan a level-11 miner is sent hits 2..11, never 1', plans === 40 && planHits.every((d) => d >= 2 && d <= 11),
    { plans, low: Math.min(...planHits), high: Math.max(...planHits) });
  const rec = g.room.extractions.bp_gh;
  check('ladder: ...and the strike is held to that plan\'s own length (the window is read off it)',
    !!rec && rec.openDelayBase === (rec.hits.length - 1) * GATHER_HITS.MS.mining, rec && { len: rec.hits.length, win: rec.openDelayBase });
  let cookHits = [];
  for (let i = 0; i < 40; i++) {
    g.ws.sent.length = 0;
    await g.send('extraction_start', { skill: 'cooking', fishKey: 'fish_trout', hitSeq: 200 + i });
    const p = (ofType(g.ws, 'gather_hits')[0] || {}).payload;
    if (p && Array.isArray(p.hits)) cookHits = cookHits.concat(p.hits);
  }
  check('ladder: a cook rolls it too (cooking 11 on a trout: 2..11, never 1)', cookHits.length > 40 && cookHits.every((d) => d >= 2 && d <= 11),
    { n: cookHits.length, low: Math.min(...cookHits), high: Math.max(...cookHits) });

  /* The cap, and its name. */
  const sync = (await setup()).ws.sent.find((m) => m.type === 'state_sync');
  check('ladder: a fresh room advertises hitladder', !!sync && !!sync.caps && sync.caps.hitladder === true, sync && sync.caps && sync.caps.hitladder);
  const { LIVEOPS } = await import('../src/liveops.js');
  check('ladder: the kill switch\'s name is one the admin flags route accepts (TRAPS §117)', LIVEOPS.FLAG_NAME_RE.test('hitladder'));
}
{
  /* THE KILL SWITCH: hitladder:false -> v2.3.2956's even 1..level again. */
  const k = await setup({ hitladder: false });
  const sync = k.ws.sent.find((m) => m.type === 'state_sync');
  check('ladder kill switch: hitladder:false un-advertises the ladder, and leaves the hits themselves on',
    !!sync && !!sync.caps && sync.caps.hitladder === false && sync.caps.gatherhits === true, sync && sync.caps && [sync.caps.hitladder, sync.caps.gatherhits]);
  const c = {};
  for (let i = 0; i < 9000; i++) { const d = k.room._rollGatherHits(3, 1)[0]; c[d] = (c[d] || 0) + 1; }
  check('ladder kill switch: level 3 rolls 1, 2 and 3 a third of the time each again', [1, 2, 3].every((d) => c[d] / 9000 > 0.31 && c[d] / 9000 < 0.36)
    && Object.keys(c).length === 3, c);
  let oneShots = 0;
  for (let i = 0; i < 4000; i++) if (k.room._rollGatherHits(50, 10).length === 1) oneShots++;
  /* P(one roll of 1..50 >= 10) = 41/50 = 0.82 */
  check('ladder kill switch: level 50 one-shots a first-tier node about 82% of the time, as v2.3.2956 did', oneShots / 4000 > 0.78 && oneShots / 4000 < 0.86, oneShots / 4000);
  const ore = k.byType('oreVein');
  k.stand(ore);
  k.ps.lifeSkills = { mining: { level: 11, xp: 0 } };
  let ones = 0;
  for (let i = 0; i < 80; i++) {   /* ~170 hits: no 1 among them at even 1..11 odds is (10/11)^170, never */
    delete k.room.extractions.bp_gh;
    k.ws.sent.length = 0;
    await k.send('extraction_start', { nodeId: ore.id, zone: 'meadow', skill: 'mining', hitSeq: 300 + i });
    const p = (ofType(k.ws, 'gather_hits')[0] || {}).payload;
    if (p && Array.isArray(p.hits)) ones += p.hits.filter((d) => d === 1).length;
  }
  check('ladder kill switch: ...and the plans it sends roll 1s at level 11 again', ones > 0, ones);
}

{
  /* The test lever (devtools.js _devLifeSkill, /dev/lifeskill): a skill at
     any level, so the ladder can be felt without the grind. */
  const { room, ps } = await setup();
  ps.lifeSkills = { mining: { level: 2, xp: 40 }, trapping: { level: 4, xp: 9 } };
  const r1 = room._devLifeSkill('bp_gh', { skill: 'hits', level: 11 });
  check('lever: \'hits\' sets the four hit skills to the level, XP 0, and leaves the rest',
    r1.ok && ['mining', 'woodcutting', 'fishing', 'cooking'].every((k) => ps.lifeSkills[k].level === 11 && ps.lifeSkills[k].xp === 0)
      && ps.lifeSkills.trapping.level === 4, { r1, ls: ps.lifeSkills });
  const r2 = room._devLifeSkill('bp_gh', { skill: 'farming', level: 999 });
  check('lever: one skill by name, the level held to 1-120', r2.ok && ps.lifeSkills.farming.level === 120, r2);
  const bad = ['__proto__', 'constructor', 'resources', 'gems', '', null, 7, ['mining']].map((k) => room._devLifeSkill('bp_gh', { skill: k, level: 5 }).ok);
  check('lever: anything but a life skill\'s name is refused', bad.every((ok) => ok === false) && ps.lifeSkills.resources === undefined, bad);
  check('lever: an unknown player is refused', room._devLifeSkill('bp_nobody', { skill: 'hits', level: 3 }).ok === false);
}
// ── 12. each tier twice as long as the one before (v2.3.3251) ──
// Owner, 2026-10-14: "I want each tiers unlocks (lvl 5 required, lvl 10
// required, etc) to take about 2x longer on average than the previous tier's
// lowest level extraction time.  You can figure out what "hp" to give the
// resources during extraction."  Solved again here, exactly, over the
// worker's own dice: a tier's average hits at the level it opens
// (GATHER_REQ_LVL) is twice the tier before's at ITS opening level.
{
  /* the exact chance of each hit at level L, face by face (section 11) */
  const oddsAt = (L) => {
    const m = new Map();
    for (let f = 0; f < GATHER_HITS.LADDER; f++) {
      const d = gatherHitRoll(L, (f + 0.5) / GATHER_HITS.LADDER, true);
      m.set(d, (m.get(d) || 0) + 1 / GATHER_HITS.LADDER);
    }
    return [...m];
  };
  /* the exact average plan length on `hp` at level L, MAX_HITS as the worker
     applies it, the chance a plan meets MAX_HITS at all, and the length by
     which all but one plan in a million have ended (obsidian could in
     principle need 280 hits of all 6s -- about a 1-in-10^30 plan) */
  const planOf = (hp, L) => {
    const o = oddsAt(L);
    let dist = new Map([[hp, 1]]), mean = 0, capped = 0, ended = 0, p999999 = 0;
    for (let i = 1; i <= GATHER_HITS.MAX_HITS && dist.size; i++) {
      const nd = new Map();
      for (const [left, p] of dist) {
        if (i === GATHER_HITS.MAX_HITS) { mean += p * i; capped += p; ended += p; continue; }
        for (const [d, q] of o) {
          const l2 = left - d;
          if (l2 <= 0) { mean += p * q * i; ended += p * q; } else nd.set(l2, (nd.get(l2) || 0) + p * q);
        }
      }
      if (!p999999 && ended >= 1 - 1e-6) p999999 = i;
      dist = nd;
    }
    return { mean, capped, longest: p999999 };
  };
  const TIERS = [1, 6, 11, 16, 21];
  const report = {};
  let ratiosOk = true, targetOk = true, neverCapped = true, longestAll = 0;
  for (const type of ['oreVein', 'tree', 'fishSpot']) {
    report[type] = TIERS.map((t, k) => {
      const L = GATHER_REQ_LVL[type][t];
      const r = planOf(gatherNodeHp(t, type), L);
      if (Math.abs(r.mean - 10 * 2 ** k) > 0.03 * 10 * 2 ** k) targetOk = false;
      if (r.capped > 1e-9) neverCapped = false;
      longestAll = Math.max(longestAll, r.longest);
      return { t, L, hp: gatherNodeHp(t, type), hits: +r.mean.toFixed(2), longest: r.longest };
    });
    for (let k = 1; k < TIERS.length; k++) {
      const ratio = report[type][k].hits / report[type][k - 1].hits;
      if (ratio < 1.94 || ratio > 2.06) ratiosOk = false;
    }
  }
  check('tier hp: the first tier is still ten hits at level 1 (copper, pine, minnow 10 HP)',
    ['oreVein', 'tree', 'fishSpot'].every((ty) => report[ty][0].hp === 10 && report[ty][0].hits === 10), report);
  check('tier hp: every tier, at the level it opens, takes 2x the hits of the tier before at ITS opening level (1.94-2.06)', ratiosOk, report);
  check('tier hp: ...10, 20, 40, 80, 160 hits on average, each within 3%', targetOk, report);
  check('tier hp: no plan at a resource\'s own opening level meets MAX_HITS (under 1 in 10^9; all but 1 in a million end by ' + longestAll + ' hits)',
    neverCapped && longestAll < GATHER_HITS.MAX_HITS, { longestAll, max: GATHER_HITS.MAX_HITS });
  check('tier hp: the owner\'s table (iron 20 at Mining 1 beside copper; black steel 80; obsidian, maple, pike the top)',
    JSON.stringify(GATHER_NODE_HP) === JSON.stringify({
      oreVein: { 1: 10, 6: 20, 11: 80, 16: 440, 21: 1680 },
      tree: { 1: 10, 6: 40, 11: 220, 16: 840, 21: 2480 },
      fishSpot: { 1: 10, 6: 40, 11: 220, 16: 840, 21: 2480 },
    }), GATHER_NODE_HP);
  const old = (t) => GATHER_HITS.HP_PER_TIER * (t + 1);
  const junk = [
    gatherNodeHp(26, 'oreVein') === old(26), gatherNodeHp(11, 'campfire') === old(11), gatherNodeHp(11, '__proto__') === old(11),
    gatherNodeHp(11, 'constructor') === old(11), gatherNodeHp(11, undefined) === old(11), gatherNodeHp(11, { toString: () => 'oreVein' }) === old(11),
    gatherNodeHp('11', 'oreVein') === 80, gatherNodeHp(11.7, 'oreVein') === 80, gatherNodeHp(null, 'tree') === 10, gatherNodeHp(11, 'oreVein', false) === old(11),
  ];
  check('tier hp: a tier or type not in the table, a forged type, or the table off read 5 x (tier + 1); levels read as numbers', junk.every(Boolean), junk);
}
{
  /* The plans: by the NODE's type and tier, never the cook's formula. */
  const { room, ws, ps, byType, send, stand } = await setup();
  const planOf = () => (ofType(ws, 'gather_hits').pop() || {}).payload;
  const go = async (n, skill, seq) => { stand(n); delete room.extractions.bp_gh; ws.sent.length = 0;
    await send('extraction_start', { nodeId: n.id, zone: 'meadow', skill, hitSeq: seq }); return planOf(); };
  const ore = byType('oreVein'), tree = byType('tree'), fish = byType('fishSpot');
  ore.tierLvl = 11; tree.tierLvl = 21; fish.tierLvl = 6;
  ps.lifeSkills = { mining: { level: 5, xp: 0 }, woodcutting: { level: 20, xp: 0 }, fishing: { level: 5, xp: 0 }, cooking: { level: 1, xp: 0 } };
  const bs = await go(ore, 'mining', 1);
  const rec = room.extractions.bp_gh;
  check('tier hp: a black steel vein (tier 11) is planned at 80 HP for a Mining 5 player', !!bs && bs.hp === 80
    && bs.hits.reduce((a, b) => a + b, 0) >= 80 && bs.hits.slice(0, -1).reduce((a, b) => a + b, 0) < 80, bs && { hp: bs.hp, n: bs.hits.length });
  check('tier hp: ...and its strike is held to that plan\'s own length', !!rec && rec.openDelayBase === (rec.hits.length - 1) * GATHER_HITS.MS.mining);
  const maple = await go(tree, 'woodcutting', 2);
  check('tier hp: a maple (tier 21) at Woodcutting 20 is 2,480 HP, ~160 hits and never the cap',
    !!maple && maple.hp === 2480 && maple.hits.length > 130 && maple.hits.length < GATHER_HITS.MAX_HITS, maple && { hp: maple.hp, n: maple.hits.length });
  const clown = await go(fish, 'fishing', 3);
  check('tier hp: a clownfish spot (tier 6) at Fishing 5 is 40 HP', !!clown && clown.hp === 40, clown && clown.hp);
  ws.sent.length = 0;
  await send('extraction_start', { skill: 'cooking', fishKey: 'fish_trout', hitSeq: 4 });
  const cook = planOf();
  check('tier hp: a cook is as it was -- a trout still 60 HP, and a Cooking 1 cook of it still 40 hits (COOK_MAX_HITS)',
    !!cook && cook.hp === 60 && cook.hits.length === GATHER_HITS.COOK_MAX_HITS && GATHER_HITS.COOK_MAX_HITS === 40, cook && { hp: cook.hp, n: cook.hits.length });

  /* The monster shield: a planned harvest's ceiling from its window's opening. */
  await go(tree, 'woodcutting', 5);
  const r2 = room.extractions.bp_gh;
  stand(tree);
  ps.ex = 'chop';
  const win = r2.openDelayBase;
  const now = Date.now();
  r2.startedAt = now - (win + room.EXTRACT_SHIELD_MS - 1000);
  const inside = room._extractionShielded('bp_gh', now);
  r2.startedAt = now - (win + room.EXTRACT_SHIELD_MS + 1000);
  const past = room._extractionShielded('bp_gh', now);
  check('tier hp: a long plan keeps the monster shield EXTRACT_SHIELD_MS past its window\'s opening (' + Math.round(win / 1000) + ' s of hits)',
    win > 60000 && inside === true && past === false, { win, inside, past });
  ws.sent.length = 0;
  delete room.extractions.bp_gh;
  await send('extraction_start', { nodeId: tree.id, zone: 'meadow', skill: 'woodcutting' });   /* an old client: the timer */
  const r3 = room.extractions.bp_gh;
  r3.startedAt = now - room.EXTRACT_SHIELD_MS - 1;
  check('tier hp: ...the timer\'s record (an old client) keeps the ceiling from its start', !!r3 && !r3.hits && room._extractionShielded('bp_gh', now) === false);
  ps.ex = null;

  const sync = (await setup()).ws.sent.find((m) => m.type === 'state_sync');
  check('tier hp: a fresh room advertises nodehp', !!sync && !!sync.caps && sync.caps.nodehp === true, sync && sync.caps && sync.caps.nodehp);
  const { LIVEOPS } = await import('../src/liveops.js');
  check('tier hp: the kill switch\'s name is one the admin flags route accepts (TRAPS §117)', LIVEOPS.FLAG_NAME_RE.test('nodehp'));
}
{
  /* THE KILL SWITCH: nodehp:false -> every node on 5 x (tier + 1) again. */
  const k = await setup({ nodehp: false });
  const sync = k.ws.sent.find((m) => m.type === 'state_sync');
  check('tier hp kill switch: nodehp:false un-advertises it and leaves the hits and the ladder on',
    !!sync && !!sync.caps && sync.caps.nodehp === false && sync.caps.gatherhits === true && sync.caps.hitladder === true,
    sync && sync.caps && [sync.caps.nodehp, sync.caps.gatherhits, sync.caps.hitladder]);
  const ore = k.byType('oreVein');
  ore.tierLvl = 11;
  k.stand(ore);
  k.ps.lifeSkills = { mining: { level: 5, xp: 0 } };
  k.ws.sent.length = 0;
  await k.send('extraction_start', { nodeId: ore.id, zone: 'meadow', skill: 'mining', hitSeq: 9 });
  const p = (ofType(k.ws, 'gather_hits')[0] || {}).payload;
  check('tier hp kill switch: ...and black steel is 60 HP again', !!p && p.hp === 60, p && p.hp);
}

// ── 13. each tier pays twice the XP, and XP fades below you (v2.3.3251) ──
// Owner, 2026-10-14: "Yes adjust the xp.  Also make xp decay if you're trying
// to harvest lower level things.  This also applies to combat.  Xp should
// begin decaying starting at 5 levels below your current level.  It should
// always be most efficient to harvest or fight things within your current
// level."
{
  check('tier xp: the table doubles a tier -- 163, 326, 652, 1,304, 2,608 (was 163, 350, 538, 725, 913)',
    JSON.stringify(GATHER_TIER_XP) === JSON.stringify({ 1: 163, 6: 326, 11: 652, 16: 1304, 21: 2608 })
      && [1, 6, 11, 16].every((t) => GATHER_TIER_XP[t + 5] === 2 * GATHER_TIER_XP[t]), GATHER_TIER_XP);
  const oldXp = (t) => Math.ceil(((t * 1.5) + 5) * 25);
  const junk = [
    harvestBaseXp(26) === oldXp(26), harvestBaseXp(11, false) === oldXp(11), harvestBaseXp('11') === 652, harvestBaseXp(11.7) === 652,
    harvestBaseXp(null) === 163, harvestBaseXp('__proto__') === 163, harvestBaseXp(-4) === 163, harvestBaseXp(21, false) === 913,
  ];
  check('tier xp: a tier not in the table, or the table off, is the old (tier x 1.5 + 5) x 25; junk tiers read as tier 1', junk.every(Boolean), junk);

  /* THE RULE, held over the worker's own dice.  A harvest's time is its hits
     plus the honest cycle's fixed part (HONEST_CYCLE: the hit lead, the
     settle and the gesture's FLOOR -- the quickest an honest harvest comes
     round, which is the worst case for the rule: any more time per harvest
     favours the bigger, newer resources).  The average hits by the exact
     recursion E[n] = 1 + sum over the die's faces of E[n - hit]. */
  const memo = new Map();
  const meanHits = (hp, L) => {
    const key = hp + ':' + L;
    if (memo.has(key)) return memo.get(key);
    const faces = [];
    for (let f = 0; f < GATHER_HITS.LADDER; f++) faces.push(gatherHitRoll(L, (f + 0.5) / GATHER_HITS.LADDER, true));
    const E = new Float64Array(hp + 1);
    for (let n = 1; n <= hp; n++) {
      let sum = 0;
      for (const d of faces) sum += n - d > 0 ? E[n - d] : 0;
      E[n] = 1 + sum / faces.length;
    }
    memo.set(key, E[hp]);
    return E[hp];
  };
  const MS = { oreVein: GATHER_HITS.MS.mining, tree: GATHER_HITS.MS.woodcutting, fishSpot: GATHER_HITS.MS.fishing };
  const secs = (type, t, L) => (HONEST_CYCLE.LEAD_MS + (meanHits(gatherNodeHp(t, type), L) - 1) * MS[type]
    + HONEST_CYCLE.SETTLE_MS + HONEST_CYCLE.GESTURE_FLOOR_MS) / 1000;
  const TIERS = [1, 6, 11, 16, 21];
  const rateOf = (type, t, L, fade) => harvestBaseXp(t) * (fade ? xpDecayMult(L, GATHER_REQ_LVL[type][t]) : 1) / secs(type, t, L);
  let worstWithin = Infinity, atWithin = null, worstNewest = Infinity, atNewest = null, checked = 0;
  for (const type of ['oreVein', 'tree', 'fishSpot']) {
    for (let L = 1; L <= 100; L++) {
      const open = TIERS.filter((t) => GATHER_REQ_LVL[type][t] <= L)
        .map((t) => ({ t, gap: L - GATHER_REQ_LVL[type][t], r: rateOf(type, t, L, true) }));
      const within = open.filter((x) => x.gap <= 4), faded = open.filter((x) => x.gap >= 5);
      if (within.length && faded.length) {
        const k = Math.max(...within.map((x) => x.r)) / Math.max(...faded.map((x) => x.r));
        if (k < worstWithin) { worstWithin = k; atWithin = { type, L }; }
        checked++;
      }
      const newest = open.reduce((a, x) => (x.gap < a.gap || (x.gap === a.gap && x.t > a.t)) ? x : a);
      const others = open.filter((x) => x !== newest && x.gap >= 5);
      if (others.length) {
        const k = newest.r / Math.max(...others.map((x) => x.r));
        if (k < worstNewest) { worstNewest = k; atNewest = { type, L }; }
      }
    }
  }
  check('xp fade: at every level 1-100 of all three skills, what is within your level (4 below or nearer) pays more XP a second than anything 5+ below -- by 15% at the least (worst ' + worstWithin.toFixed(3) + ')',
    checked > 50 && worstWithin >= 1.15, { worstWithin, atWithin, checked });
  check('xp fade: ...and the newest resource you can harvest pays the most of all, even where nothing is within your level (worst ' + worstNewest.toFixed(3) + ')',
    worstNewest >= 1.15, { worstNewest, atNewest });
  /* ...and WITHOUT the fade it does not hold: the rule is the fade's doing,
     not a property the table had anyway (Mining 10: black steel ~2.5x
     titanium). */
  const bsAt10 = rateOf('oreVein', 11, 10, false) / rateOf('oreVein', 16, 10, false);
  check('xp fade: without it, black steel at Mining 10 would pay ' + bsAt10.toFixed(2) + 'x titanium\'s XP a second (the reason for it)', bsAt10 > 2, bsAt10);
  /* the owner's "adjust the xp": every tier pays about what the first does,
     at the level it opens (it was 9 a second on obsidian against 20 on copper) */
  const atOpen = {};
  let even = true;
  for (const type of ['oreVein', 'tree', 'fishSpot']) {
    atOpen[type] = TIERS.map((t) => +rateOf(type, t, GATHER_REQ_LVL[type][t], true).toFixed(1));
    if (!atOpen[type].every((r) => r >= atOpen[type][0] * 0.9 && r <= atOpen[type][0] * 1.25)) even = false;
  }
  check('tier xp: at the level each one opens, every tier pays within -10%/+25% of the first tier\'s XP a second', even, atOpen);
}
{
  /* WHAT A STRIKE REALLY PAYS: the worker's own payout, harvest_credit and the
     skill's XP, a black steel vein (tier 11, Mining 5) struck at Mining 9
     (4 past it: full), then at Mining 11 (6 past: a third x 0.85) -- and an
     iron vein (tier 6, Mining 1) at Mining 11, 10 past. */
  const strikeAt = async (liveflags, tier, level) => {
    const k = await setup(liveflags);
    const caps = ((k.ws.sent.find((m) => m.type === 'state_sync') || {}).caps) || null;   /* before the log is cleared */
    const ore = k.byType('oreVein');
    ore.tierLvl = tier;
    k.stand(ore);
    k.ps.lifeSkills = { mining: { level, xp: 0 } };
    await k.send('extraction_start', { nodeId: ore.id, zone: 'meadow', skill: 'mining', hitSeq: 1 });
    const rec = k.room.extractions.bp_gh;
    if (!rec) return { why: 'no record' };
    rec.startedAt = Date.now() - (rec.openDelayBase + 1000);
    k.ws.sent.length = 0;
    await k.send('node_strike', { id: ore.id, zone: 'meadow', accuracy: 'good' });
    const cred = (ofType(k.ws, 'harvest_credit')[0] || {}).payload;
    return { paid: !!cred, xpAmt: cred && cred.xpAmt, skillXp: k.ps.lifeSkills.mining.xp, caps };
  };
  const good = (t) => Math.ceil(harvestBaseXp(t) * 1.5);
  const full = await strikeAt(null, 11, 9);
  check('xp fade: black steel struck at Mining 9 (4 past its level 5) pays in full -- 652 x 1.5 = 978',
    full.paid && full.xpAmt === good(11) && full.xpAmt === 978 && full.skillXp === 978, { xpAmt: full.xpAmt, skillXp: full.skillXp });
  const six = await strikeAt(null, 11, 11);
  const want6 = xpAfterDecay(good(11), (1 / 3) * 0.85);
  check('xp fade: ...at Mining 11 (6 past) a third, then 15% less: ' + want6 + ' (credited and in the skill)',
    six.paid && six.xpAmt === want6 && six.skillXp === want6 && want6 === 277, { xpAmt: six.xpAmt, skillXp: six.skillXp, want6 });
  const ten = await strikeAt(null, 6, 11);
  const want10 = xpAfterDecay(good(6), xpDecayMult(11, 1));
  check('xp fade: an iron vein (Mining 1) struck at Mining 11 pays ' + want10 + ' of its 489',
    ten.paid && ten.xpAmt === want10 && want10 === Math.round(489 * (1 / 3) * Math.pow(0.85, 5)), { xpAmt: ten.xpAmt, want10 });
  check('xp fade: a fresh room advertises tierxp and xpdecay', !!ten.caps && ten.caps.tierxp === true && ten.caps.xpdecay === true,
    ten.caps && { tierxp: ten.caps.tierxp, xpdecay: ten.caps.xpdecay });
  const { LIVEOPS } = await import('../src/liveops.js');
  check('xp fade: both kill switches\' names are ones the admin flags route accepts (TRAPS §117)',
    LIVEOPS.FLAG_NAME_RE.test('xpdecay') && LIVEOPS.FLAG_NAME_RE.test('tierxp'));

  /* THE KILL SWITCHES */
  const off = await strikeAt({ xpdecay: false }, 11, 11);
  check('xp fade kill switch: xpdecay:false pays black steel in full at Mining 11 (978) and un-advertises it, the doubled XP still on',
    off.paid && off.xpAmt === 978 && !!off.caps && off.caps.xpdecay === false && off.caps.tierxp === true,
    { xpAmt: off.xpAmt, caps: off.caps && [off.caps.xpdecay, off.caps.tierxp] });
  const flat = await strikeAt({ tierxp: false }, 11, 9);
  check('tier xp kill switch: tierxp:false puts black steel back on the old 538 (x 1.5 = 807) and un-advertises it',
    flat.paid && flat.xpAmt === Math.ceil(538 * 1.5) && !!flat.caps && flat.caps.tierxp === false && flat.caps.xpdecay === true,
    { xpAmt: flat.xpAmt, caps: flat.caps && [flat.caps.tierxp, flat.caps.xpdecay] });
  const k3 = await setup({ nodehp: false });
  const s3 = k3.ws.sent.find((m) => m.type === 'state_sync');
  check('tier xp: nodehp:false (the old, quick HP) turns the doubled XP off too, and says so',
    k3.room._harvestXpForTier(16, 'ok') === 725 && !!s3 && s3.caps.tierxp === false && s3.caps.xpdecay === true,
    { xp: k3.room._harvestXpForTier(16, 'ok'), caps: s3 && [s3.caps.tierxp, s3.caps.xpdecay] });
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
