/* ═══ v2.3.3271: THE BOT LAB -- what a script takes home past the anti-bot checks ═══
 *
 * The owner, 2026-10-16: "I want you to examine the robustness of the anti
 * bot protection built into the game."
 *
 * Scripted players run against a REAL GameRoom in this process (cost-audit's
 * harness: storage in memory, fake sockets, the clock simulated so a walk is
 * legal) and each reports what it took home in a simulated hour and what the
 * anti-bot checks made of it -- botfp.js's score, flags and hour cap, and the
 * harvest's own timing gate (gathering.js _handleNodeStrike).  Every scenario
 * runs in a room of its own, so nobody competes for anybody's nodes unless
 * the scenario says so.
 *
 * The players, all sending only messages the real game sends:
 *   honest     plays a harvest as the phone does: extraction_start, the
 *              worker's hit plan swung out, the 1.5 s gesture, a breath, a
 *              walk to the next node at a sprinting thumb's pace;
 *   edge       the same messages, but strikes the moment the worker would
 *              take it (the gesture skipped) and walks at the speed bound;
 *   nostart    never sends extraction_start: walks there and strikes;
 *   copy       nostart, every strike carrying the SAME fingerprint;
 *   nofp       nostart, no fingerprint at all;
 *   disguised  nostart, a fingerprint drawn fresh each time from a human's
 *              ranges, and a human's uneven gaps;
 *   cook       a stack of fish cooked at the honest pace, or at the limit;
 *   fighter    a sword, one monster at a time -- or the "aimbot", standing
 *              still and claiming a ranged hit on every monster in reach as
 *              often as each monster's own lane allows.
 * Movement: `walk` at a speed, `burst` (each move the most the speed bound
 * takes: since v2.3.3325 what its budget holds -- movement.js MOVE_BUDGET --
 * and before it 500 px/s x the gap + 80 px), `bundle` (24 moves in one frame,
 * as the quiet phone's bundles allow), and `rejoin` (v2.3.3327: a new socket
 * every 3 s naming a place 50,000 px on -- lastplace.js).
 *
 * And the one-socket probes (names for --only): `decoy` (a start for one
 * node, the strike on another), `writes` (rows written by 1,000 of a message,
 * a second join on one socket, a `null` frame), `roomfill` (the room's places
 * held by sockets that never join), `flood` (the room's time a message).
 *
 *   node tools/qa/load/bot-lab.mjs [minutes, default 60] [--only=a,b] [--seed=N] [--census]
 *                                  [--flags=movebudget:false,...] [--pd[=boost]]
 *
 * --flags sets the room's live flags (v2.3.3325): a kill switch thrown, so a
 * fix can be measured against the rule it replaced on one checkout.
 *
 * Under tools/ on purpose: anything under server/ deploys the worker when it
 * merges.  Read with docs/specs/antibot-review.md.
 */
import { GameRoom } from '../../../server/src/index.js';
import { BOTFP } from '../../../server/src/botfp.js';
import { GATHER_HITS, HONEST_CYCLE, gatherReqLvl } from '../../../server/src/gathering.js';
import { WHEEL_SPAWNS, WHEEL_CENTRE } from '../../../server/src/wheelspawns.js';

const ARGS = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const FLAG = (name, d) => { const a = process.argv.find((x) => x === '--' + name || x.startsWith('--' + name + '=')); return a ? (a.split('=')[1] ?? true) : d; };
const MINUTES = Number(ARGS[0] || 60);
const ONLY = FLAG('only', '') ? String(FLAG('only', '')).split(',') : null;
const SEED = Number(FLAG('seed', 1));
const CENSUS = !!FLAG('census', false);
/* v2.3.3325: the room's live flags, `name:false` or `name:true`, comma separated */
const LAB_FLAGS = Object.fromEntries(String(FLAG('flags', '') || '').split(',').filter(Boolean)
  .map((kv) => { const [k, v] = kv.split(':'); return [k, v !== 'false' && v !== '0']; }));

function seedRandom(seed) {
  let a = (seed * 2654435761) >>> 0;
  Math.random = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ── the simulated clock ─────────────────────────────────────────────── */
const realDateNow = Date.now;
let simNow = realDateNow();
Date.now = () => simNow;

const STEP_MS = 33;          /* a phone's frame of input */
const TICK_EVERY = 110;      /* the room's tick, in strides (nodes respawn by their clock) */
const ARRIVAL = { x: WHEEL_CENTRE[0], y: WHEEL_CENTRE[1] + 288 };   /* v2.3.3315: the Wheel the room plays */
const BUNDLE_MAX = 24;

/* every row written, for the probes that ask what one message costs */
const W = { puts: 0, dels: 0 };
function memStorage() {
  const m = new Map();
  const clone = (v) => (v === undefined ? undefined : structuredClone(v));
  return {
    async get(k) {
      if (Array.isArray(k)) { const r = new Map(); for (const x of k) if (m.has(x)) r.set(x, clone(m.get(x))); return r; }
      return m.has(k) ? clone(m.get(k)) : undefined;
    },
    async put(k, v) { if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) { W.puts++; m.set(kk, clone(vv)); } return; } W.puts++; m.set(k, clone(v)); },
    async delete(k) { if (Array.isArray(k)) { let n = 0; for (const x of k) { W.dels++; if (m.delete(x)) n++; } return n; } W.dels++; return m.delete(k); },
    async list(opts) { const r = new Map(); const p = (opts && opts.prefix) || ''; for (const [k, v] of m) if (k.startsWith(p)) r.set(k, clone(v)); return r; },
    async deleteAll() { m.clear(); },
    async transaction(fn) { return fn(this); },
    _map: m,
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => new Response('{}') }) } };
function baseSession() { return { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now(), moveSig: '' }; }

function makeRoom() {
  const state = { storage: memStorage(), getWebSockets: () => [], acceptWebSocket: () => {}, blockConcurrencyWhile: async (fn) => fn() };
  const room = new GameRoom(state, mockEnv);
  room._liveFlags = { ...LAB_FLAGS };
  let tickFn = null;
  const realSetInterval = globalThis.setInterval;
  globalThis.setInterval = (fn, ms) => {
    if (ms === room.TICK_RATE && !tickFn) { tickFn = fn; return 0; }
    return realSetInterval(fn, ms);
  };
  room.startTickLoop();
  globalThis.setInterval = realSetInterval;
  room._eventLive = false;
  return { room, tick: () => tickFn && tickFn() };
}

/* ── fingerprints ────────────────────────────────────────────────────── */
const u = (a, b) => a + Math.random() * (b - a);
const hash32 = () => (Math.random() * 4294967296) >>> 0;
/* a human's: well clear of every floor, and never the same twice */
function humanFp() {
  return { len: Math.round(u(300, 1400)), n: Math.round(u(40, 140)), dur: Math.round(u(1200, 2200)),
    ent: +u(0.06, 0.32).toFixed(3), tv: +u(2, 40).toFixed(2), vc: +u(0.06, 0.6).toFixed(3), h: hash32() };
}
const COPY_FP = { len: 820, n: 96, dur: 1500, ent: 0.15, tv: 12, vc: 0.3, h: 2779098405 };

/* ── a player ────────────────────────────────────────────────────────── */
/* v2.3.3726: --pd marks every move for the message diet's glide (server
   movepath.js; with --flags=movepath:true); --pd=boost also claims ten times
   the speed it walks, the script that hopes the worker glides it faster */
const PD = FLAG('pd', null);
function moveMsg(x, y, vx, vy) {
  const k = PD === 'boost' ? 10 : 1;
  return { type: 'move', x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, d: 'down', f: 'south', eqc: 'none', eql: 'none', eqs: 'none',
    ex: null, z: 'wheel', vx: Math.round(vx * 100 * k), vy: Math.round(vy * 100 * k), dodging: false, blocking: false, ba: null, dead: false,
    ...(PD ? { pd: 1 } : {}) };
}

async function addPlayer(world, cfg, i) {
  const { room } = world;
  const ws = { plans: [], send(s) { if (typeof s === 'string' && s.startsWith('{"type":"gather_hits"')) this.plans.push(JSON.parse(s).payload); }, close() {} };
  room.sessions.set(ws, baseSession());
  const id = 'lab' + cfg.name.replace(/[^a-z0-9]/gi, '').slice(0, 10) + i + Math.random().toString(36).slice(2, 6);
  const join = { type: 'join', id, name: 'Lab ' + i, protocolVersion: 2, ws: [1, 5], data: { x: 1000, y: 1000, z: 'town' } };
  if (cfg.device) join.device = { id: typeof cfg.device === 'function' ? cfg.device(i) : cfg.device, env: 'lab' };
  await room.webSocketMessage(ws, JSON.stringify(join));
  await room.webSocketMessage(ws, JSON.stringify(moveMsg(ARRIVAL.x + u(-40, 40), ARRIVAL.y + u(-30, 30), 0, 0)));
  const ps = room.playerState[id];
  if (!ps) throw new Error('join failed for ' + id);
  ps.inventory = ps.inventory || {};
  ps.inventory.woodcutting_axe = 1; ps.inventory.mining_pickaxe = 1; ps.inventory.fishing_pole = 1;
  ps.lifeSkills = ps.lifeSkills || {};
  for (const [sk, lv] of Object.entries(cfg.levels || {})) ps.lifeSkills[sk] = { level: lv, xp: 0 };
  if (cfg.fish) ps.inventory[cfg.fish.key] = cfg.fish.n;
  if (cfg.startAt) { const at = cfg.startAt(world, i); ps.x = at.x; ps.y = at.y; ps.lastMoveAt = undefined; }
  const p = { cfg, i, id, ws, seq: 0, state: 'seek', node: null, waitUntil: 0, strikes: 0, why: new Map(), moves: 0, frames: 0,
    inv0: { ...ps.inventory }, xp0: totalXp(room, ps), dist: 0, refusedMoves: 0, lastGap: 0, coins0: ps.coins || 0 };
  world.players.push(p);
  return p;
}

function totalXp(room, ps) {
  let t = 0;
  for (const [, s] of Object.entries(ps.lifeSkills || {})) {
    if (!s || typeof s !== 'object') continue;
    for (let l = 1; l < (s.level || 1); l++) t += room._lifeSkillXpThreshold(l);
    t += s.xp || 0;
  }
  return t;
}

async function send(world, p, msg) {
  p.frames++;
  await world.room.webSocketMessage(p.ws, JSON.stringify(msg));
}

/* one frame of travel toward (tx, ty); true once within `reach` */
async function travel(world, p, tx, ty, reach) {
  const { room } = world;
  const ps = room.playerState[p.id];
  /* v2.3.3274: the room may have closed the socket (flood.js): a bot past
     its message budget is logged out, and the scenario says so */
  if (!ps) { p.closed = true; return false; }
  const dx = tx - ps.x, dy = ty - ps.y, d = Math.hypot(dx, dy);
  if (d <= reach) return true;
  const mode = p.cfg.move;
  /* the most the speed bound takes now, half a pixel inside it: v2.3.3325,
     what the move budget holds (movement.js MOVE_BUDGET: it refills at
     500 px/s, 3 s of it + 80 at most); under `movebudget: false`, 500 px/s x
     the gap since the last move + 80 px, the 80 again every message */
  const budgetOn = room._moveBudgetOn();
  const allow = () => {
    if (budgetOn) return Math.max(0, room._moveBudgetNow(ps, 500, Date.now()) - 0.5);
    const dt = typeof ps.lastMoveAt === 'number' ? Math.max(0.001, (Date.now() - ps.lastMoveAt) / 1000) : 1;
    return 500 * dt + 80 - 0.5;
  };
  const x0 = ps.x, y0 = ps.y;
  if (mode === 'bundle') {
    const out = [];
    let cx = ps.x, cy = ps.y;
    let budget = allow();
    for (let k = 0; k < BUNDLE_MAX; k++) {
      const rd = Math.hypot(tx - cx, ty - cy);
      if (rd <= reach * 0.5) break;
      const len = Math.min(rd - reach * 0.5, budget);
      cx += (tx - cx) / rd * len; cy += (ty - cy) / rd * len;
      out.push(moveMsg(cx, cy, (tx - x0) / d * 3, (ty - y0) / d * 3));
      /* the next one in the frame: under the budget, what is left of it (the
         first spent it all); before it, dt 1 ms: 500 x 0.001 + 80 */
      budget = budgetOn ? 0 : 80;
    }
    if (out.length) { p.moves += out.length; await send(world, p, out); }
  } else {
    const len = mode === 'burst' ? Math.min(d - reach * 0.5, allow()) : Math.min(d - reach * 0.5, (p.cfg.speed || 220) * STEP_MS / 1000);
    p.moves++;
    await send(world, p, moveMsg(x0 + dx / d * len, y0 + dy / d * len, dx / d * 3, dy / d * 3));
  }
  const moved = Math.hypot(ps.x - x0, ps.y - y0);
  p.dist += moved;
  if (moved < 0.01) p.refusedMoves++;
  return Math.hypot(tx - ps.x, ty - ps.y) <= reach;
}

function pickNode(world, p) {
  const { room } = world;
  const ps = room.playerState[p.id];
  let best = null, bd = Infinity;
  for (const n of room.nodes.wheel || []) {
    if (!n.alive || n.nodeType !== p.cfg.type || (n.tierLvl || 1) !== p.cfg.tier) continue;
    if (world.claimed && world.claimed.get(n.id) && world.claimed.get(n.id) !== p.id) continue;
    const d = Math.hypot(n.x - ps.x, n.y - ps.y);
    if (d < bd) { bd = d; best = n; }
  }
  if (best && world.claimed) world.claimed.set(best.id, p.id);
  return best;
}

const REACH = { tree: 150, oreVein: 70, fishSpot: 70 };
const SKILL = { tree: 'woodcutting', oreVein: 'mining', fishSpot: 'fishing' };

async function stepGatherer(world, p) {
  const { room } = world;
  const ps = room.playerState[p.id];
  if (!ps) { p.closed = true; return; }
  if (ps.dead || ps.dying) { p.deaths = (p.deaths || 0) + 1; return; }
  if (ps.hp < (ps.maxHp || 100)) ps.hp = ps.maxHp || 100;   /* the lab's bots never die: a real one eats or flees */
  const now = Date.now();
  if (p.waitUntil > now) return;
  if (p.node && !p.node.alive) { if (world.claimed) world.claimed.delete(p.node.id); p.node = null; p.state = 'seek'; }
  if (!p.node) {
    p.node = pickNode(world, p); p.state = 'seek';
    if (!p.node) {
      p.idle = (p.idle || 0) + STEP_MS;
      /* nothing to take: a step on the spot now and then, as a waiting bot
         would, or the 2-minute idle logout takes it (index.js _moveActivitySig) */
      if (now - (p.jiggleAt || 0) > 20000) { p.jiggleAt = now; p.jig = -(p.jig || 1); await send(world, p, moveMsg(ps.x + p.jig, ps.y, 0, 0)); }
      return;
    }
  }
  const n = p.node;
  const c = p.cfg;
  if (p.state === 'seek') {
    const there = await travel(world, p, n.x, n.y, REACH[n.nodeType] || 70);
    if (!there) return;
    p.state = c.start ? 'start' : 'strike';
    if (!c.start && c.think) p.waitUntil = now + c.think();
    return;
  }
  if (p.state === 'start') {
    p.ws.plans.length = 0;
    await send(world, p, { type: 'extraction_start', payload: { nodeId: n.id, zone: 'wheel', skill: SKILL[n.nodeType], hitSeq: ++p.seq } });
    const plan = p.ws.plans.find((x) => x.seq === p.seq && Array.isArray(x.hits));
    const hits = plan ? plan.hits.length : 1;
    const swing = GATHER_HITS.MS[SKILL[n.nodeType]];
    const startedAt = Date.now();
    if (c.edge) {
      /* the earliest the worker takes it: (hits - 1) swings, less its grace */
      p.waitUntil = startedAt + (hits - 1) * swing - (room.EXTRACTION_GRACE_MS || 250) + 20;
    } else {
      p.waitUntil = startedAt + 80 + HONEST_CYCLE.LEAD_MS + (hits - 1) * swing + HONEST_CYCLE.SETTLE_MS + Math.max(HONEST_CYCLE.GESTURE_FLOOR_MS, u(1350, 1750));
    }
    p.plannedHits = (p.plannedHits || 0) + hits;
    p.state = 'strike';
    return;
  }
  if (p.state === 'strike') {
    const payload = { id: n.id, zone: 'wheel', accuracy: c.acc === 'mix' ? (Math.random() < 0.45 ? 'perfect' : Math.random() < 0.8 ? 'good' : 'ok') : c.acc };
    if (c.fp === 'human') payload.swipeFp = humanFp();
    else if (c.fp === 'copy') payload.swipeFp = { ...COPY_FP };
    await send(world, p, { type: 'node_strike', payload });
    p.strikes++;
    const r = room._lastStrikeFor(p.id);
    const why = (r && r.why) || '?';
    p.why.set(why, (p.why.get(why) || 0) + 1);
    if (world.claimed) world.claimed.delete(n.id);
    p.node = null; p.state = 'seek';
    p.waitUntil = Date.now() + (c.after ? c.after() : 0);
  }
}

async function stepCook(world, p) {
  const { room } = world;
  const ps = room.playerState[p.id];
  if (!ps) { p.closed = true; return; }
  const c = p.cfg;
  const now = Date.now();
  if (p.waitUntil > now) return;
  const key = c.fish.key;
  if (c.start) {
    if (p.state !== 'cook') {
      p.ws.plans.length = 0;
      await send(world, p, { type: 'extraction_start', payload: { skill: 'cooking', fishKey: key, hitSeq: ++p.seq } });
      const plan = p.ws.plans.find((x) => x.seq === p.seq && Array.isArray(x.hits));
      const hits = plan ? plan.hits.length : 1;
      p.waitUntil = now + 80 + HONEST_CYCLE.LEAD_MS + (hits - 1) * GATHER_HITS.MS.cooking + HONEST_CYCLE.SETTLE_MS + Math.max(HONEST_CYCLE.GESTURE_FLOOR_MS, u(1350, 1750));
      p.state = 'cook';
      return;
    }
  }
  const before = ps.inventory[key] || 0;
  const payload = { fishKey: key, kind: c.burn && Math.random() < c.burn ? 'burnt' : 'cooked' };
  if (c.fp === 'human') payload.swipeFp = humanFp();
  await send(world, p, { type: 'cook_request', payload });
  p.strikes++;
  const took = before - (ps.inventory[key] || 0);
  p.why.set(took ? 'paid' : 'dropped', (p.why.get(took ? 'paid' : 'dropped') || 0) + 1);
  p.state = 'idle';
  p.waitUntil = Date.now() + (c.every ? c.every() : u(250, 600));
}

/* ── fighters ────────────────────────────────────────────────────────── */
/* honest: one monster at a time, walked to, a sword swing every 650 ms.
   aimbot: stands still and claims a "ranged" hit on every first-stretch
   monster within the Wheel's 3,600 px reach, as often as the per-monster
   lanes allow (combat.js: a normal hit per 210 ms and 3 specials per
   1,200 ms, PER MONSTER), 24 to a frame -- with no bow at all. */
const MON_LVL_MAX = 5;
async function stepFighter(world, p) {
  const { room } = world;
  const ps = room.playerState[p.id];
  if (!ps) { p.closed = true; return; }
  if (ps.dead || ps.dying) { p.deaths = (p.deaths || 0) + 1; return; }
  if (ps.hp < (ps.maxHp || 100)) ps.hp = ps.maxHp || 100;
  const now = Date.now();
  const mons = (room.monsters.wheel || []).filter((m) => m.alive && (m.level || 1) <= MON_LVL_MAX);
  /* v2.3.3334: a fighter that holds a bow holds it in the worker's own slot,
     as the equip handler (gear.js) puts it there */
  if (p.cfg.bow && !ps.rangedWeapon) ps.rangedWeapon = { type: 'bow', tierMult: 1, name: 'Lab Bow' };
  if (p.cfg.archer) { await stepArcher(world, p, ps, mons, now); return; }
  if (p.cfg.aimbot) {
    if (!p.lane) p.lane = new Map();
    const out = [];
    /* v2.3.3334: a script that stays under the room's message budget
       (flood.js, 120 a second) -- the nearest monsters first */
    const cap = p.cfg.perSec || Infinity;
    if (!p.sentAt) p.sentAt = [];
    p.sentAt = p.sentAt.filter((t) => now - t < 1000);
    const inReach = mons.filter((m) => Math.hypot(m.x - ps.x, m.y - ps.y) <= 3550)
      .sort((a, b) => Math.hypot(a.x - ps.x, a.y - ps.y) - Math.hypot(b.x - ps.x, b.y - ps.y));
    for (const m of inReach) {
      if (p.sentAt.length + out.length >= cap) break;
      const l = p.lane.get(m.id) || { n: 0, s: [] };
      if (now - l.n >= 215) { l.n = now; out.push({ type: 'monster_damage', payload: { monsterId: m.id, zone: 'wheel', element: null, slot: 'ranged', special: false } }); }
      l.s = l.s.filter((t) => now - t < 1250);
      if (l.s.length < 3 && (!l.s.length || now - l.s[l.s.length - 1] >= 420)) { l.s.push(now); out.push({ type: 'monster_damage', payload: { monsterId: m.id, zone: 'wheel', element: null, slot: 'ranged', special: true } }); }
      p.lane.set(m.id, l);
    }
    for (const _o of out) p.sentAt.push(now);
    for (let k = 0; k < out.length; k += BUNDLE_MAX) { p.moves += Math.min(BUNDLE_MAX, out.length - k); await send(world, p, out.slice(k, k + BUNDLE_MAX)); }
    if (now - (p.jiggleAt || 0) > 20000) { p.jiggleAt = now; p.jig = -(p.jig || 1); await send(world, p, moveMsg(ps.x + p.jig, ps.y, 0, 0)); }
    return;
  }
  /* honest */
  if (!p.target || !p.target.alive) {
    let best = null, bd = Infinity;
    for (const m of mons) { const d = Math.hypot(m.x - p.anchor.x, m.y - p.anchor.y); if (d > 1800) continue; const dd = Math.hypot(m.x - ps.x, m.y - ps.y); if (dd < bd) { bd = dd; best = m; } }
    p.target = best;
    if (!best) { if (now - (p.jiggleAt || 0) > 20000) { p.jiggleAt = now; p.jig = -(p.jig || 1); await send(world, p, moveMsg(ps.x + p.jig, ps.y, 0, 0)); } return; }
  }
  const m = p.target;
  if (!(await travel(world, p, m.x, m.y, 60))) return;
  if (now - (p.swingAt || 0) >= 650) {
    p.swingAt = now;
    await send(world, p, { type: 'monster_damage', payload: { monsterId: m.id, zone: 'wheel', element: null, slot: 'melee', special: false } });
  }
}
/* v2.3.3334: an honest archer -- one monster at a time from 450 px, a shot
   every 600 ms, and every 6 s a volley it PAYS for (ability_use swipe, one
   block of mana; skipped when it cannot pay): three arrows 200 ms apart
   470 ms after the swipe, then the stuck arrows' four chips every 500 ms
   (noKb), as playerActions.js and projectiles.js send them */
async function stepArcher(world, p, ps, mons, now) {
  const { room } = world;
  if (!p.queue) p.queue = [];
  const due = p.queue.filter((q) => q.at <= now);
  p.queue = p.queue.filter((q) => q.at > now);
  for (const q of due) {
    const tm = (room.monsters.wheel || []).find((m) => m.id === q.id && m.alive);
    if (tm) { p.moves++; await send(world, p, { type: 'monster_damage', payload: Object.assign({ monsterId: tm.id, zone: 'wheel', element: null, slot: 'ranged' }, q.payload) }); }
  }
  if (!p.target || !p.target.alive) {
    let best = null, bd = Infinity;
    for (const m of mons) { const d = Math.hypot(m.x - p.anchor.x, m.y - p.anchor.y); if (d > 1800) continue; const dd = Math.hypot(m.x - ps.x, m.y - ps.y); if (dd < bd) { bd = dd; best = m; } }
    p.target = best;
    if (!best) return;
  }
  const m = p.target;
  if (!(await travel(world, p, m.x - 450, m.y, 60))) return;
  if (now - (p.volleyAt || 0) >= 6000 && (ps.mana || 0) >= room._blockCost(ps, 'mana', 1)) {
    p.volleyAt = now;
    await send(world, p, { type: 'ability_use', payload: { type: 'swipe', tier: 0 } });
    for (let k = 0; k < 3; k++) p.queue.push({ at: now + 470 + 200 * k, id: m.id, payload: { special: true, part: 3, noKb: k > 0 } });
    for (let k = 0; k < 4; k++) p.queue.push({ at: now + 1370 + 500 * k, id: m.id, payload: { special: false, noKb: true } });
    p.shotAt = now;
    return;
  }
  if (now - (p.shotAt || 0) >= 600) {
    p.shotAt = now;
    p.queue.push({ at: now + 470, id: m.id, payload: { special: false } });
  }
}
function landAnchor(home) {
  const pts = (WHEEL_SPAWNS[home] && WHEEL_SPAWNS[home].points) || [];
  let x = 0, y = 0;
  for (const pt of pts) { x += pt[0]; y += pt[1]; }
  return pts.length ? { x: x / pts.length, y: y / pts.length } : { ...ARRIVAL };
}

/* ── the scenarios ───────────────────────────────────────────────────── */
const think = () => u(60, 260);
const gap = () => u(150, 900);
const SCENARIOS = [
  { name: 'honest-pine', note: 'a quick, honest hand on the commons pines (Woodcutting 1)',
    players: [{ type: 'tree', tier: 1, start: true, fp: 'human', acc: 'mix', move: 'walk', speed: 220, after: () => u(250, 700) }] },
  { name: 'edge-pine', note: 'the real messages, struck the moment the worker takes it, at the speed bound',
    players: [{ type: 'tree', tier: 1, start: true, edge: true, fp: 'human', acc: 'perfect', move: 'burst' }] },
  { name: 'copy-pine', note: 'no start message, the same fingerprint every strike',
    players: [{ type: 'tree', tier: 1, start: false, fp: 'copy', acc: 'perfect', move: 'burst' }] },
  { name: 'nofp-pine', note: 'no start message, no fingerprint',
    players: [{ type: 'tree', tier: 1, start: false, fp: 'none', acc: 'perfect', move: 'burst' }] },
  { name: 'disguised-pine', note: 'no start message, a fresh human-looking fingerprint and uneven gaps',
    players: [{ type: 'tree', tier: 1, start: false, fp: 'human', acc: 'perfect', move: 'burst', think, after: gap }] },
  { name: 'honest-obsidian', note: 'an honest miner at obsidian (Mining 15, the level it opens)',
    players: [{ type: 'oreVein', tier: 21, levels: { mining: 15 }, start: true, fp: 'human', acc: 'mix', move: 'walk', speed: 220, after: () => u(250, 700) }] },
  { name: 'disguised-obsidian', note: 'obsidian with no start message, human-looking fingerprints, moving by bundles',
    players: [{ type: 'oreVein', tier: 21, levels: { mining: 15 }, start: false, fp: 'human', acc: 'perfect', move: 'bundle', think, after: gap }] },
  { name: 'fleet-one-device', note: 'four disguised pine bots sharing one device id',
    shared: true,
    players: [0, 1, 2, 3].map(() => ({ type: 'tree', tier: 1, start: false, fp: 'human', acc: 'perfect', move: 'burst', think, after: gap, device: 'labdevice0001' })) },
  { name: 'fleet-own-devices', note: 'four disguised pine bots, a device id each',
    shared: true,
    players: [0, 1, 2, 3].map(() => ({ type: 'tree', tier: 1, start: false, fp: 'human', acc: 'perfect', move: 'burst', think, after: gap, device: (i) => 'labdev' + i + hash32() })) },
  { name: 'honest-fighter', note: 'a sword, one Frost Ridge monster (levels 1-5) at a time, a swing every 650 ms',
    players: [{ fight: true, move: 'walk', speed: 220, startAt: () => landAnchor('frost') }] },
  { name: 'aimbot-fighter', note: 'standing still, a "ranged" hit on every level 1-5 monster within 3,600 px, no bow (v2.3.3334: under the message budget, 100 a second)',
    players: [{ fight: true, aimbot: true, perSec: 100, move: 'walk', startAt: () => landAnchor('frost') }] },
  /* v2.3.3334: the same script holding a bow (hitproof.js asks for one), and
     an honest archer who pays for its volleys */
  { name: 'aimbot-bow', note: 'the aimbot holding a bow, under the message budget (100 claims a second, the nearest first), specials never paid for',
    players: [{ fight: true, aimbot: true, bow: true, perSec: 100, move: 'walk', startAt: () => landAnchor('frost') }] },
  { name: 'honest-archer', note: 'a bow, one Frost Ridge monster at a time from 450 px, a shot every 600 ms, a paid volley every 6 s',
    players: [{ fight: true, archer: true, bow: true, move: 'walk', speed: 220, startAt: () => landAnchor('frost') }] },
  { name: 'honest-cook', note: 'cooking minnows at an honest pace (1 in 10 burnt)',
    players: [{ cook: true, fish: { key: 'fish_minnow', n: 9000 }, start: true, fp: 'human', burn: 0.1 }] },
  { name: 'limit-cook', note: 'cooking minnows at the worker\'s 45-a-minute limit, every one "cooked", no fingerprint',
    players: [{ cook: true, fish: { key: 'fish_minnow', n: 9000 }, start: false, fp: 'none', every: () => 60000 / 45 + 1 }] },
];

async function runScenario(sc) {
  seedRandom(SEED);
  const world = { ...makeRoom(), players: [], claimed: sc.shared ? new Map() : null };
  {
    const room = world.room;
    world.kills = new Map(); world.cxp = new Map();
    const rk = room._resolveMonsterKill;
    room._resolveMonsterKill = function (zone, m, killerId, ...rest) { world.kills.set(killerId, (world.kills.get(killerId) || 0) + 1); return rk.call(this, zone, m, killerId, ...rest); };
    const ax = room._prog3AwardXp;
    room._prog3AwardXp = function (pid, ps, cat, amount, ...rest) { world.cxp.set(pid, (world.cxp.get(pid) || 0) + (Number(amount) || 0)); return ax.call(this, pid, ps, cat, amount, ...rest); };
  }
  for (let i = 0; i < sc.players.length; i++) {
    const p = await addPlayer(world, { name: sc.name, ...sc.players[i] }, i);
    const ps0 = world.room.playerState[p.id];
    p.anchor = { x: ps0.x, y: ps0.y };
  }
  const steps = Math.round(MINUTES * 60000 / STEP_MS);
  let sinceTick = 0;
  const t0 = realDateNow();
  for (let s = 0; s < steps; s++) {
    simNow += STEP_MS;
    sinceTick += STEP_MS;
    for (const p of world.players) {
      if (p.cfg.cook) await stepCook(world, p);
      else if (p.cfg.fight) await stepFighter(world, p);
      else await stepGatherer(world, p);
    }
    if (sinceTick >= TICK_EVERY) { sinceTick = 0; world.tick(); }
    if (s % 3000 === 0) await new Promise((r) => setImmediate(r));
  }
  const out = [];
  for (const p of world.players) {
    const ps = world.room.playerState[p.id] || { inventory: p.inv0, lifeSkills: {} };
    if (!world.room.playerState[p.id]) p.why.set('LOGGED OUT (the room closed the socket)', 1);
    const rec = world.room._botfp && world.room._botfp.get(p.id);
    if (rec) world.room._botfpDecay(rec, Date.now());
    const gained = {};
    for (const [k, v] of Object.entries(ps.inventory || {})) { const d = v - (p.inv0[k] || 0); if (d) gained[k] = d; }
    const sess = [...world.room.sessions.values()].find((s) => s.id === p.id) || {};
    out.push({
      name: sc.name, i: p.i, frames: p.frames, moves: p.moves, strikes: p.strikes,
      why: Object.fromEntries(p.why), gained, xp: totalXp(world.room, ps) - p.xp0,
      score: rec ? Math.round(rec.score * 10) / 10 : null, flags: rec ? rec.flags.map((f) => f.kind) : [],
      counters: rec ? rec.counters : null, extractionMissing: sess._extractionMissing || 0,
      pxPerS: p.dist / (MINUTES * 60), refusedMoves: p.refusedMoves, idleS: Math.round((p.idle || 0) / 1000),
      plannedHits: p.plannedHits || 0, deaths: p.deaths || 0,
      kills: world.kills.get(p.id) || 0, combatXp: world.cxp.get(p.id) || 0, coins: (ps.coins || 0) - (p.coins0 || 0),
    });
  }
  return { sc, out, realS: (realDateNow() - t0) / 1000 };
}

/* ── the speed bound, measured on its own ────────────────────────────── */
async function speedTest() {
  seedRandom(SEED);
  const world = { ...makeRoom(), players: [] };
  const res = [];
  for (const mode of ['walk', 'burst', 'bundle']) {
    const p = await addPlayer(world, { name: 'speed-' + mode, move: mode, speed: 250 }, res.length);
    const ps = world.room.playerState[p.id];
    const x0 = ps.x, y0 = ps.y;
    const tx = x0 + 1e7, ty = y0;        /* a point far off: only the bound stops it */
    let lastX = ps.x, lastY = ps.y;
    for (let s = 0; s < Math.round(10000 / STEP_MS); s++) {
      simNow += STEP_MS;
      await travel(world, p, tx, ty, 1);
      const cur = world.room.playerState[p.id];
      if (!cur) break;
      lastX = cur.x; lastY = cur.y;
    }
    res.push({ mode, pxPerS: Math.round(Math.hypot(lastX - x0, lastY - y0) / 10), frames: p.frames, moves: p.moves, closed: !!p.closed });
  }
  return res;
}

/* ── v2.3.3327: a script that drops its socket and comes back ────────────
   Every 3 s (the one-socket limit's 20 sockets a minute an address), a new
   socket joins naming a place 50,000 px past where the room has it, and
   moves 50,000 px more straight after; the room's tick follows between
   (movement.js _tickMoveFollow).  A minute of it.  Before lastplace.js the
   join took the place it named and the move after it was a first move. */
async function reconnectTest() {
  seedRandom(SEED);
  const world = { ...makeRoom(), players: [] };
  const { room } = world;
  const p = await addPlayer(world, { name: 'speed-reconnect', move: 'walk', speed: 250 }, 0);
  const x0 = room.playerState[p.id].x, y0 = room.playerState[p.id].y;
  let ws = p.ws, joins = 0;
  for (let k = 0; k < 20; k++) {
    const at = room.playerState[p.id];
    if (!at) break;
    const ax = at.x;
    await room.webSocketClose(ws);
    for (let t = 0; t < 3000; t += 22) { simNow += 22; room._tickMoveFollow(simNow); }
    ws = { send() {}, close() {} };
    room.sessions.set(ws, baseSession());
    await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id: p.id, name: 'Lab 0', protocolVersion: 2, ws: [1, 5],
      data: { x: ax + 50000, y: y0, z: 'wheel' } }));
    joins++;
    const now = room.playerState[p.id];
    if (!now) break;
    await room.webSocketMessage(ws, JSON.stringify(moveMsg(now.x + 50000, y0, 0, 0)));
  }
  const end = room.playerState[p.id];
  return { pxPerS: end ? Math.round(Math.hypot(end.x - x0, end.y - y0) / 60) : 0, joins };
}

/* ── one script holding the room's places ────────────────────────────── */
/* The cap counts SOCKETS (index.js fetch: sessions.size >= _roomCap(), before
   any join), and the 2-minute idle sweep (tick.js _tickPingAndAfk) spares a
   socket that sent anything but a pong or a track.  So: fill the room with
   sockets that never join, each saying one word a minute and a half, and see
   who is still there ten minutes later -- and, for comparison, sockets that
   say nothing. */
async function roomFill() {
  seedRandom(SEED);
  const { room } = makeRoom();
  const cap = room._roomCap();
  const talk = [], quiet = [];
  for (let i = 0; i < cap; i++) {
    const ws = { send() {}, close() { this.closed = true; } };
    /* as the room's door makes them (index.js fetch): with `openedAt`, so a
       join window (v2.3.3274, flood.js) can sweep them */
    room.sessions.set(ws, { ...baseSession(), openedAt: Date.now() });
    (i % 2 ? quiet : talk).push(ws);
  }
  let nextWord = Date.now();
  for (let t = 0; t < 10 * 60000; t += 3000) {
    simNow += 3000;
    if (Date.now() >= nextWord) {
      nextWord = Date.now() + 90000;
      for (const ws of talk) await room.webSocketMessage(ws, '{"type":"hi"}');
    }
    room._tickPingAndAfk(Date.now());
  }
  const left = (list) => list.filter((ws) => room.sessions.has(ws)).length;
  return { cap, talkLeft: left(talk), talk: talk.length, quietLeft: left(quiet), quiet: quiet.length, held: room.sessions.size };
}

/* ── what a message costs the room, by kind ──────────────────────────── */
async function floodCost() {
  seedRandom(SEED);
  const world = { ...makeRoom(), players: [] };
  const p = await addPlayer(world, { name: 'flood' }, 0);
  const ps = world.room.playerState[p.id];
  const kinds = {
    'junk type (relay budget)': () => ({ type: 'zzz', payload: { a: 1 } }),
    'move, standing': () => moveMsg(ps.x, ps.y, 0, 0),
    'node_strike, no such node': () => ({ type: 'node_strike', payload: { id: 'nope', zone: 'wheel', accuracy: 'perfect' } }),
    'monster_damage, no such monster': () => ({ type: 'monster_damage', payload: { monsterId: 'nope', zone: 'wheel', slot: 'melee' } }),
    'chat': () => ({ type: 'chat', payload: { text: 'hello there', color: '#fff' } }),
  };
  const out = [];
  for (const [name, mk] of Object.entries(kinds)) {
    const N = 20000;
    const msgs = [];
    for (let i = 0; i < N; i++) msgs.push(JSON.stringify(mk()));
    const t0 = process.hrtime.bigint();
    for (let i = 0; i < N; i++) { if (i % 50 === 0) simNow += 1; await world.room.webSocketMessage(p.ws, msgs[i]); }
    const us = Number(process.hrtime.bigint() - t0) / 1000 / N;
    out.push({ name, us: Math.round(us * 10) / 10, perSecondOfRoom: Math.round(1e6 / us) });
  }
  /* and a frame of 24 moves, each 79 px on from the one before */
  {
    const N = 2000;
    const t0 = process.hrtime.bigint();
    for (let i = 0; i < N; i++) {
      simNow += 33;
      const arr = [];
      const sx = ps.x, sgn = i % 2 ? -1 : 1;
      for (let k = 0; k < BUNDLE_MAX; k++) arr.push(moveMsg(sx + 79 * (k + 1) * sgn, ps.y, 0, 0));
      await world.room.webSocketMessage(p.ws, JSON.stringify(arr));
    }
    const us = Number(process.hrtime.bigint() - t0) / 1000 / N;
    out.push({ name: 'a frame of 24 moves', us: Math.round(us * 10) / 10, perSecondOfRoom: Math.round(1e6 / us) });
  }
  return out;
}

/* ── a start on one node, the strike on another ──────────────────────── */
/* _handleNodeStrike timed a strike only against a record for the SAME node,
   and counted a strike with no record at all (`_extractionMissing`); a record
   for another node was neither.  So a script that sent a start for any node
   first struck uncounted as well as untimed.  v2.3.3322 (gathering.js
   HARVEST_PROOF): such a strike is refused 'other-node' unless it is the
   player's one recovery strike in ten minutes, and counted either way
   (`_extractionOtherNode`). */
async function decoyStart() {
  seedRandom(SEED);
  const world = { ...makeRoom(), players: [] };
  const p = await addPlayer(world, { name: 'decoy', move: 'bundle', type: 'tree', tier: 1 }, 0);
  const { room } = world;
  const ps = room.playerState[p.id];
  const trees = (room.nodes.wheel || []).filter((n) => n.nodeType === 'tree' && (n.tierLvl || 1) === 1 && n.alive);
  let paid = 0, tries = 0;
  for (let k = 0; k + 1 < trees.length && k < 4; k += 2) {
    const a = trees[k], b = trees[k + 1];
    for (let s = 0; s < 400 && !(await travel(world, p, b.x, b.y, 100)); s++) simNow += STEP_MS;
    await send(world, p, { type: 'extraction_start', payload: { nodeId: a.id, zone: 'wheel', skill: 'woodcutting', hitSeq: ++p.seq } });
    const before = ps.inventory.wood_pine_log || 0;
    await send(world, p, { type: 'node_strike', payload: { id: b.id, zone: 'wheel', accuracy: 'perfect' } });
    tries++;
    if ((ps.inventory.wood_pine_log || 0) > before) paid++;
  }
  const sess = [...room.sessions.values()].find((s) => s.id === p.id) || {};
  return { tries, paid, counted: sess._extractionMissing || 0, otherNode: sess._extractionOtherNode || 0 };
}

/* ── rows written by one message, and other one-socket costs ─────────── */
/* Each row written is a row of the free plan's 100,000 a day (or $1 a million
   on the paid plan); a message that writes one every time it is sent, with no
   limit on how often it may be sent, lets one socket spend the day's rows. */
async function writeProbes() {
  seedRandom(SEED);
  const world = { ...makeRoom(), players: [] };
  const { room } = world;
  const a = await addPlayer(world, { name: 'wa' }, 0);
  const b = await addPlayer(world, { name: 'wb' }, 1);
  await new Promise((r) => setImmediate(r));
  const N = 1000;
  const out = [];
  const measure = async (name, mk) => {
    await new Promise((r) => setImmediate(r));
    const w0 = W.puts + W.dels;
    /* 100 a second: an honest phone's rate, inside the socket's budget
       (v2.3.3274), so what is measured is the rows and not the budget */
    for (let i = 0; i < N; i++) { simNow += 10; await room.webSocketMessage(a.ws, JSON.stringify(mk(i))); }
    await new Promise((r) => setImmediate(r));
    out.push({ name, rows: W.puts + W.dels - w0, n: N });
  };
  await measure('chat_mute (un-mute someone never muted)', () => ({ type: 'chat_mute', payload: { target: 'bp_nobody', on: false } }));
  await measure('stats_update (defence 10, 11, 10, ...)', (i) => ({ type: 'stats_update', payload: { def: 10 + (i % 2) } }));
  /* friends: each asks the other (that accepts), then b leaves */
  await room.webSocketMessage(a.ws, JSON.stringify({ type: 'friend_request', payload: { target: b.id } }));
  await room.webSocketMessage(b.ws, JSON.stringify({ type: 'friend_request', payload: { target: a.id } }));
  await new Promise((r) => setImmediate(r));
  try { await room.webSocketClose(b.ws, 1000, 'bye', true); } catch (e) {}
  await measure('friend_dm to a friend who is offline', (i) => ({ type: 'friend_dm', payload: { to: b.id, text: 'hi ' + i } }));
  await measure('move, standing (for comparison)', () => moveMsg(room.playerState[a.id].x, room.playerState[a.id].y, 0, 0));

  /* a second join on the same socket, under a new id, 200 times (since
     v2.3.3274 the first closes the socket: the count below is what is left) */
  const ps0 = Object.keys(room.playerState).length;
  const w0 = W.puts + W.dels;
  for (let i = 0; i < 200; i++) {
    simNow += 50;
    if (!room.sessions.has(a.ws)) break;   /* v2.3.3274: the first one closes the socket */
    await room.webSocketMessage(a.ws, JSON.stringify({ type: 'join', id: 'ghost' + i + 'x' + hash32(), name: 'G', protocolVersion: 2, ws: [1, 5], data: { x: 1000, y: 1000, z: 'town' } }));
  }
  await new Promise((r) => setImmediate(r));
  const rejoin = { joins: 200, players: Object.keys(room.playerState).length - ps0, rows: W.puts + W.dels - w0, sockets: room.sessions.size, closed: !room.sessions.has(a.ws) };

  /* a frame that is just `null`, on a live socket */
  const c = await addPlayer(world, { name: 'wc' }, 2);
  let nullThrew = null;
  try { await room.webSocketMessage(c.ws, 'null'); nullThrew = false; } catch (e) { nullThrew = e && e.message; }
  return { out, rejoin, nullThrew };
}

/* ── run ─────────────────────────────────────────────────────────────── */
if (CENSUS) {
  seedRandom(SEED);
  const world = { ...makeRoom(), players: [] };
  await addPlayer(world, { name: 'census' }, 0);
  const by = new Map();
  for (const n of world.room.nodes.wheel || []) {
    const k = n.nodeType + ' t' + (n.tierLvl || 1) + ' (needs ' + gatherReqLvl(n.nodeType, n.tierLvl) + ')';
    const e = by.get(k) || { n: 0, near: Infinity, far: 0, homes: new Set() };
    const d = Math.hypot(n.x - ARRIVAL.x, n.y - ARRIVAL.y);
    e.n++; e.near = Math.min(e.near, d); e.far = Math.max(e.far, d); e.homes.add(n.home || 'commons');
    by.set(k, e);
  }
  console.log('The Wheel\'s nodes: kind, count, nearest and farthest from the arrival (px), lands');
  for (const [k, e] of [...by.entries()].sort()) console.log(`  ${k.padEnd(30)} ${String(e.n).padStart(4)}  ${Math.round(e.near).toString().padStart(6)} - ${Math.round(e.far).toString().padStart(6)}  ${[...e.homes].join(',')}`);
  Date.now = realDateNow;
  process.exit(0);
}

const results = [];
console.log(`\nBOT LAB -- ${MINUTES} min of game time a scenario, seed ${SEED}${Object.keys(LAB_FLAGS).length ? ', live flags ' + JSON.stringify(LAB_FLAGS) : ''}\n`);
console.log('Speed bound (10 s toward a far point, nothing in the way):');
for (const r of await speedTest()) console.log(`  ${r.mode.padEnd(7)} ${String(r.pxPerS).padStart(7)} px/s   (${r.frames} frames, ${r.moves} moves${r.closed ? '; the room closed the socket: past its message budget' : ''})`);
{
  const r = await reconnectTest();
  console.log(`  ${'rejoin'.padEnd(7)} ${String(r.pxPerS).padStart(7)} px/s   (${r.joins} reconnects a minute, each naming 50,000 px on: lastplace.js)`);
}
console.log(`  -- the fastest honest stack is ~441 px/s (movement.js), a phone walks ~150-250\n`);
for (const sc of SCENARIOS) {
  if (ONLY && !ONLY.includes(sc.name)) continue;
  const r = await runScenario(sc);
  results.push(r);
  const hours = MINUTES / 60;
  console.log(`${sc.name}: ${sc.note}  [${r.realS.toFixed(0)} s]`);
  for (const o of r.out) {
    const g = Object.entries(o.gained).filter(([k]) => !/^(woodcutting_axe|mining_pickaxe|fishing_pole)$/.test(k))
      .map(([k, v]) => `${k} ${Math.round(v / hours)}`).join(', ');
    if (o.kills || /fighter/.test(o.name)) console.log(`  #${o.i}  kills/h ${Math.round(o.kills / hours)}  combat xp/h ${Math.round(o.combatXp / hours)}  coins/h ${Math.round(o.coins / hours)}  hit messages/h ${Math.round(o.moves / hours)}`);
    console.log(`  #${o.i}  strikes/h ${Math.round(o.strikes / hours)}  paid/h ${Math.round((o.why.paid || 0) / hours)}  xp/h ${Math.round(o.xp / hours)}  | got/h: ${g || '-'}`);
    console.log(`       refusals ${JSON.stringify(Object.fromEntries(Object.entries(o.why).filter(([k]) => k !== 'paid')))}  frames/h ${Math.round(o.frames / hours)}  travel ${Math.round(o.pxPerS)} px/s  idle ${o.idleS}s${o.deaths ? '  deaths ' + o.deaths : ''}`);
    console.log(`       anti-bot: score ${o.score}  flags [${o.flags.join(', ')}]  no-start strikes ${o.extractionMissing}  counters ${o.counters ? JSON.stringify({ noFp: o.counters.noFpStrikes, synthetic: o.counters.syntheticStrikes, replay: o.counters.replayHits, capClamps: o.counters.capClamps, tapless: o.counters.taplessCooks }) : '-'}`);
  }
  console.log('');
}
if (!ONLY || ONLY.includes('decoy')) {
  const r = await decoyStart();
  console.log(`decoy: a start for one tree, the strike (at once) on the tree beside it`);
  console.log(`  paid ${r.paid} of ${r.tries} strikes; counted as "no start" ${r.counted} times, "other node" ${r.otherNode} (v2.3.3322)\n`);
}
if (!ONLY || ONLY.includes('writes')) {
  const r = await writeProbes();
  console.log('writes: rows written by 1,000 messages from one player (no limit on how often any of these may be sent)');
  for (const o of r.out) console.log(`  ${o.name.padEnd(42)} ${String(o.rows).padStart(5)} rows`);
  console.log(`  join again on the same socket under a new id, ${r.rejoin.joins} times: ${r.rejoin.players} more players held in the room (on ${r.rejoin.sockets} sockets), ${r.rejoin.rows} rows${r.rejoin.closed ? '; the room closed the socket at the first' : ''}`);
  console.log(`  a frame that is just "null": ${r.nullThrew === false ? 'handled' : 'THREW: ' + r.nullThrew}\n`);
}
if (!ONLY || ONLY.includes('roomfill')) {
  const r = await roomFill();
  console.log(`roomfill: ${r.cap} sockets that never join, half saying one word every 90 s, half silent; ten minutes later`);
  console.log(`  still holding a place: ${r.talkLeft} of ${r.talk} talking, ${r.quietLeft} of ${r.quiet} silent (${r.held} of ${r.cap} places taken)\n`);
}
if (!ONLY || ONLY.includes('flood')) {
  console.log('flood: the room\'s own time a message, by kind (this machine, node; the room is one thread)');
  for (const r of await floodCost()) console.log(`  ${r.name.padEnd(34)} ${String(r.us).padStart(7)} us   (${r.perSecondOfRoom.toLocaleString('en-US')} a second fill the room's whole second)`);
  console.log('');
}
if (process.env.LAB_JSON) {
  const { writeFileSync } = await import('node:fs');
  writeFileSync(process.env.LAB_JSON, JSON.stringify(results.map((r) => ({ name: r.sc.name, note: r.sc.note, out: r.out })), null, 1));
}
console.log(`(BOTFP: flag at score ${BOTFP.FLAG_AT}, half-life ${BOTFP.SCORE_HALF_LIFE_MS / 60000} min, hour caps ${BOTFP.HARVEST_HOUR_CAP} a skill / ${BOTFP.COOK_HOUR_CAP} cooks)`);
Date.now = realDateNow;
process.exit(0);
