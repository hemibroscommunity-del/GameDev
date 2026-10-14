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
 *      plans and cooks that roll it, its cap and its kill switch.
 * mp-gatherhits covers the other half -- the client actually playing the
 * plan, through the real shim, in a real zone -- which no fixture here can
 * reach (TRAPS #18). */
import { GameRoom, PRIVILEGED_EVENTS } from '../src/index.js';
import { GATHER_HITS, gatherHitRoll } from '../src/gathering.js';   /* gatherHitRoll v2.3.3229 */

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
     longest cook a plan can make: MAX_HITS pan beats, then the gesture.
     It used to lapse at 30 s, mid-flip (index.js COOK_SHIELD_MS). */
  const { room, ps } = await setup();
  ps.ex = 'cook'; ps._exX = ps.x; ps._exY = ps.y;
  const longest = GATHER_HITS.MAX_HITS * GATHER_HITS.MS.cooking;
  ps._exAt = Date.now() - (longest + 30000);
  check('cook: the shield outlasts the longest plan plus a slow gesture (MAX_HITS beats + 30 s)',
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
console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
