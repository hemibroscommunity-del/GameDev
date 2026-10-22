/* ═══ v2.3.3570: THE DUNGEON SIMULATOR -- A PARTY IN A WORLD DUNGEON ═══
 * (docs/specs/grotto-party.md has the study, the tables and the decisions)
 *
 * The owner, of the Goo Grotto: "I want the goo grotto dungeon to be very
 * difficult without a party of 2-3 people.  I'm assuming most people will be
 * around lvl 10 and have iron equipment ... with all stat points allocated
 * before they attempt it."  How hard a dungeon is for one, two or three
 * players is a question about the worker's own code, so this runs it:
 *
 *   - a real GameRoom, in-process, its clock the simulator's (Date.now) and
 *     its tick the room's own, every 22 ms (TICK_RATE: a monster moves its
 *     `spd` a TICK, so a slower tick would be a slower monster);
 *   - each player JOINS as a phone does, is given its level and its points
 *     by the worker's own levers (_devCombatLevel's deal, _handleProg3Allocate,
 *     one point at a time), wears the gear the build names (the slots the
 *     worker reads: weapon / rangedWeapon / staffWeapon, armor, legsArmor),
 *     forms a PARTY by party_invite / party_accept, and walks to the mouth;
 *   - the leader sends dungeon_start {entrance} and the worker pulls the
 *     party in (dungeon.js _dungeonPullPartyMembers): its waves, its boss,
 *     the boss's splits, every slime's burst -- all the worker's;
 *   - every move is a `move`, every hit a `monster_damage` claim, every
 *     special an `ability_use` swipe and its special claims, every bite an
 *     `eat_request`, at the phone's own pace (cited where each is used):
 *     the worker rolls every hit and decides every blow on a player.
 *
 * What a PLAYER decides (where to stand, whom to hit, when to step out of a
 * swelling slime, when to eat) is the skill model (SKILL below): the study's
 * assumptions, said where they are made.  A death is out of the run: a dead
 * member cannot rejoin (only the leader's start pulls anyone in), and a
 * party's run ends when nobody is left inside.
 *
 * Deterministic: seed(n) seeds the simulator's dice AND the worker's
 * (Math.random).  Node only; nothing here runs in the game or the worker.
 *   import { runDungeon, seed } from './sim.mjs';
 *   seed(1); const r = await runDungeon({ land: 'verdant', party: [BUILD] });
 */
import { GameRoom } from '../../server/src/index.js';
import { WHEEL_SIZES } from '../../server/src/wheeltables.js';
import { WHEEL_DUNGEON } from '../../server/src/wheeldungeon.js';
import { SLIME_BURST } from '../../server/src/telegraph.js';
import { SLIME_BOSS } from '../../server/src/slimeboss.js';
import { BOSS_ABILITIES } from '../../server/src/dungeon.js';
import { bossSizeK } from '../../src/data/gameSystems.js';

/* ── determinism: one generator for the simulator AND the worker's rolls ── */
let _s = 1;
export function seed(n) { _s = (n >>> 0) || 1; }
function rnd() {   /* mulberry32 */
  _s = (_s + 0x6D2B79F5) >>> 0;
  let t = _s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
Math.random = rnd;

/* ── the simulator's clock is the worker's ── */
let T = 1_800_000_000_000;
const realNow = Date.now;
Date.now = () => Math.round(T);
/* for a look inside after a run (`keep`): the clock moved by hand */
export function advance(ms) { T += ms; }

/* the room keeps its own timers (alarms, the tick's pacer) off the real
   clock: a captured tick, and nothing else scheduled */
const STEP = 11;                  /* the simulator's step, ms */
const TICK = 22;                  /* the room's TICK_RATE */
const FRAME = 33;                 /* a phone's input frame (the move batch) */

/* ── the game's numbers (the phone's side), each from the code ── */
const WALK = 150;                 /* px a second (gameSystems SPEED 2.5 a 60 fps frame) */
const ATTACK_WALK_K = 0.5;        /* BroTown: "Auto-attack movement: 50% speed" */
const SWING_CD = 600;             /* SWING_COOLDOWN */
const BOW_CD = 600 * 0.825;       /* BOW_SWING_MULT */
const STAFF_CD = 600 + 300;       /* _staffCdExtra */
const SPECIAL_CD = 1500;          /* playerActions: now - _lastSwipe < 1500 */
const ARROW_PX_S = 24 * 60;       /* projectiles ARROW_SPEED_PX a frame */
const BOLT_PX_S = 5 * 60;         /* the staff bolt a frame (it chases a locked target) */
const VOLLEY_PX_S = 24 * 0.7 * 60;/* BOW_VOLLEY.SPEED_K */
const BIG_ORBS = 3;               /* STAFF_BIG_BOLT_ORBS */
const MELEE_REACH = 62;           /* a slime's middle within the greatsword's ring (GS_OUTER_RADIUS ~108 from the hand, the body ~24) */
const SWORD_SPECIAL_R = 120;      /* the special sweep's ring: every monster in it once */
const FISH_GAP_MS = 15000;        /* one bite every 15 s in a fight (cooking.js PVP_HEAL / _anyFightAt) */

/* ── storage in memory, the rows kept apart from the run ── */
function memStorage() {
  const m = new Map();
  return {
    async get(k) {
      if (Array.isArray(k)) { const r = new Map(); for (const x of k) if (m.has(x)) r.set(x, structuredClone(m.get(x))); return r; }
      return m.has(k) ? structuredClone(m.get(k)) : undefined;
    },
    async put(k, v) { if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) m.set(kk, structuredClone(vv)); return; } m.set(k, structuredClone(v)); },
    async delete(k) { if (Array.isArray(k)) { let n = 0; for (const x of k) if (m.delete(x)) n++; return n; } return m.delete(k); },
    async list(opts) { const r = new Map(); const p = (opts && opts.prefix) || ''; for (const [k, v] of m) if (k.startsWith(p)) r.set(k, structuredClone(v)); return r; },
    async deleteAll() { m.clear(); },
    async transaction(fn) { return fn(this); },
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => new Response('{}') }) } };

function makeRoom(flags) {
  const state = { storage: memStorage(), getWebSockets: () => [], acceptWebSocket: () => {}, blockConcurrencyWhile: async (fn) => fn() };
  const room = new GameRoom(state, mockEnv);
  room._liveFlags = { ...(flags || {}) };
  let tickFn = null;
  const realSetInterval = globalThis.setInterval;
  globalThis.setInterval = (fn, ms) => { if (ms === room.TICK_RATE && !tickFn) { tickFn = fn; return 0; } return 0; };
  room.startTickLoop();
  globalThis.setInterval = realSetInterval;
  room._eventLive = false;
  return { room, tick: () => tickFn && tickFn() };
}

/* ═══ THE BUILDS ═══
   A build is a level, a weapon, armour and where its points go.  `points` is
   a list of [stat, count]: the lane stats (dmg Power, aspd Speed, luck,
   special, elem, range) take the weapon's own points, the shared ones (hp,
   def, dodge, eres, stam, mana, move) the shared pool -- spent one at a time
   through the worker's own handler, which stops a stat at its bound (the
   character level, twice that on Power/Luck/Special/Element). */
export const GEAR = {
  /* tierMult: data.js BLACKSMITH_TIERS / WOODWORKING_TIERS; armour the
     armour ladder (armorforge.js: copper 1, iron 2, black steel 3) */
  copper: { weapon: 1.12, armour: 1 },
  iron: { weapon: 1.25, armour: 2 },
  steel: { weapon: 1.40, armour: 3 },
};
const WOOD_FOR = { copper: 1.12, iron: 1.25, steel: 1.40 };   /* softwood, hardwood, cedar: the woods as strong as each metal */
const LANE = { sword: 'sword', bow: 'bow', staff: 'staff' };
export const POINTS = {
  /* the study's three ways to spend a level-10 character's 27 + 27 */
  balanced: { lane: [['dmg', 15], ['aspd', 6], ['luck', 6]], shared: [['hp', 10], ['def', 10], ['dodge', 7]] },
  offense: { lane: [['dmg', 20], ['luck', 7]], shared: [['hp', 10], ['mana', 10], ['stam', 7]] },
  defense: { lane: [['dmg', 20], ['aspd', 7]], shared: [['def', 10], ['dodge', 10], ['eres', 7]] },
  none: { lane: [], shared: [] },
};

/* ═══ THE PLAYER: the study's assumptions ═══
   react     chance they notice a slime swelling near them (or the boss
             swelling, or its slam's wind-up) and step out of it
   reactMs   how long after it starts swelling they move
   margin    how far past the blast they stop
   eatAt     the share of their bar at which they eat (a bite every 15 s)
   specials  throw a special whenever its mana is there (sword: two or more
             in its ring, or the boss)
   kite      a bow or staff steps away from a monster nearer than this */
export const SKILL = {
  careful: { react: 0.95, reactMs: 250, margin: 40, eatAt: 0.5, specials: true, kite: 170 },
  average: { react: 0.7, reactMs: 450, margin: 25, eatAt: 0.35, specials: true, kite: 140 },
  careless: { react: 0, reactMs: 0, margin: 0, eatAt: 0.25, specials: false, kite: 0 },
};

const nameOf = (i) => 'bp_dsim' + i;
function moveMsg(zone, x, y, vx, vy) {
  return { type: 'move', x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, d: 'down', f: 'south', eqc: 'none', eql: 'none', eqs: 'none',
    ex: null, z: zone, vx: Math.round(vx * 100), vy: Math.round(vy * 100), dodging: false, blocking: false, ba: null, dead: false };
}

async function addPlayer(world, spec, i) {
  const { room } = world;
  const ws = {
    inbox: [],
    send(s) {
      if (typeof s !== 'string') return;
      if (s.startsWith('{"type":"dungeon_started"') || s.startsWith('{"type":"dungeon_complete"') || s.startsWith('{"type":"player_died"')
        || s.startsWith('{"type":"dungeon_wave"') || s.startsWith('{"type":"dungeon_error"')) this.inbox.push(JSON.parse(s));
    },
    close() {},
  };
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 60, lastPing: 0, lastRecv: Date.now(), moveSig: '' });
  const id = nameOf(i);
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'Sim ' + i, phrase: 'p-' + id, protocolVersion: 2, ws: [...WHEEL_SIZES], data: { x: 1000, y: 1000, z: 'town' } }));
  const ps = room.playerState[id];
  if (!ps) throw new Error('dungeon-sim: join failed for ' + id);
  const session = room.sessions.get(ws);
  const style = spec.style || 'sword';
  const level = spec.level || 10;
  room._devCombatLevel(id, { skill: LANE[style], level, deal: true });
  const gear = GEAR[spec.gear || 'iron'];
  const tm = style === 'sword' ? gear.weapon : WOOD_FOR[spec.gear || 'iron'];
  ps.weapon = { type: 'greatsword', name: 'Sim Great Sword', tierMult: style === 'sword' ? tm : 1, quality: 'normal' };
  ps.rangedWeapon = style === 'bow' ? { type: 'bow', name: 'Sim Bow', tierMult: tm, quality: 'normal' } : null;
  ps.staffWeapon = style === 'staff' ? { type: 'staff', name: 'Sim Staff', tierMult: tm, quality: 'normal' } : null;
  ps.activeSlot = style === 'sword' ? 'melee' : style === 'bow' ? 'ranged' : 'staff';
  ps.armor = gear.armour ? { name: 'Sim Torso', mat: spec.gear || 'iron', tierMult: gear.armour, quality: 'normal' } : null;
  ps.legsArmor = gear.armour ? { name: 'Sim Greaves', mat: spec.gear || 'iron', tierMult: gear.armour, quality: 'normal' } : null;
  room._prog3Recompute(ps);
  const pts = POINTS[spec.points || 'balanced'];
  for (const [stat, n] of pts.lane) for (let k = 0; k < n; k++) room._handleProg3Allocate(session, { stat, cat: LANE[style] });
  for (const [stat, n] of pts.shared) for (let k = 0; k < n; k++) room._handleProg3Allocate(session, { stat });
  room._prog3Recompute(ps);
  ps.hp = ps.maxHp; ps.mana = ps.maxMana; ps.stamina = ps.maxStamina;
  ps.inventory = ps.inventory || {};
  if (spec.fish) ps.inventory[spec.fish.key || 'cooked_fish_clownfish'] = spec.fish.n || 0;
  const p = {
    i, id, ws, session, spec, style, skill: SKILL[spec.skill || 'average'],
    target: null, swingAt: 0, specialAt: 0, eatAt: 0, queue: [], danger: new Map(), fleeing: null,
    dead: false, diedAt: 0, ate: 0, dealt: 0, taken: 0, bySrc: Object.create(null), sentMoveAt: 0,
  };
  world.players.push(p);
  return p;
}

/* where a build stands at the start: at the mouth, a step apart */
function stand(world, p, x, y) {
  const ps = world.room.playerState[p.id];
  ps.z = WHEEL_DUNGEON.ZONE; ps.x = x; ps.y = y; ps.lastMoveAt = undefined;
}

async function send(world, p, msg) {
  await world.room.webSocketMessage(p.ws, JSON.stringify(msg));
}

/* ═══ ONE RUN ═══ */
export async function runDungeon(opts) {
  const land = opts.land || 'verdant';
  const world = { ...makeRoom(opts.flags), players: [] };
  const { room } = world;
  if (typeof opts.tweak === 'function') opts.tweak(room);
  /* the rows and the wire are not what a fight is about: quiet */
  room._saveRpg = () => {}; room._saveRpgVitals = () => {}; room._saveRpgPools = () => {};
  /* every blow on a player, by its row (hits.js): what hurt whom */
  const mh = room._monsterHit;
  room._monsterHit = function (h) {
    const took = mh.call(this, h);
    const p = world.players.find((x) => x.id === h.pid);
    if (p && took > 0) { p.taken += took; p.bySrc[h.src] = (p.bySrc[h.src] || 0) + took; }
    return took;
  };
  for (let i = 0; i < opts.party.length; i++) await addPlayer(world, opts.party[i], i);
  const leader = world.players[0];
  /* the party: the leader invites, each accepts */
  for (const p of world.players.slice(1)) {
    await send(world, leader, { type: 'party_invite', payload: { target: p.id } });
    await send(world, p, { type: 'party_accept', payload: { target: leader.id } });
  }
  const door = room._wheelDoor(land);
  if (!door) throw new Error('dungeon-sim: no mouth for ' + land);
  world.players.forEach((p, k) => stand(world, p, door.at[0] + k * 30, door.at[1] + 20));
  await send(world, leader, { type: 'dungeon_start', payload: { entrance: land } });
  const started = leader.ws.inbox.find((m) => m.type === 'dungeon_started');
  if (!started) {
    const err = leader.ws.inbox.find((m) => m.type === 'dungeon_error');
    throw new Error('dungeon-sim: no start (' + JSON.stringify(err && err.payload) + ')');
  }
  const zone = started.payload.zone;
  const inst = [...room._dungeons.values()].find((x) => x.zone === zone);
  const W = inst.cfg.width * room.TILE, H = inst.cfg.height * room.TILE;
  const box = { x0: 2 * room.TILE, x1: W - 2 * room.TILE, y0: WHEEL_DUNGEON.TOP_ROW * room.TILE, y1: H - 4 * room.TILE };
  /* everyone the leader's start pulled in walks in from the way out */
  for (const p of world.players) {
    const got = p.ws.inbox.some((m) => m.type === 'dungeon_started' && m.payload.zone === zone);
    if (!got) { p.out = 'not pulled'; continue; }
    const x = W / 2 + (p.i - (world.players.length - 1) / 2) * 50, y = H - 6 * room.TILE;
    await send(world, p, moveMsg(zone, x, y, 0, 0));
    p.inside = true;
  }
  const t0 = T;
  const maxMs = opts.maxMs || 15 * 60000;
  const out = { land, level: inst.cfg.monsterLevel, party: world.players.length, cleared: false, ms: 0, wave: 1, bossSpawned: false,
    bossHpShare: null, deaths: 0, firstDeathAt: null, timeline: [] };
  let sinceTick = 0, sinceFrame = 0;
  while (T - t0 < maxMs) {
    T += STEP; sinceTick += STEP; sinceFrame += STEP;
    if (sinceTick >= TICK) { sinceTick -= TICK; world.tick(); }
    if (sinceFrame >= FRAME) {
      sinceFrame -= FRAME;
      for (const p of world.players) await stepPlayer(world, p, zone, inst, box);
    }
    if (inst.wave !== out.wave) { out.timeline.push({ at: T - t0, wave: inst.wave }); out.wave = inst.wave; }
    if (inst.bossSpawned && !out.bossSpawned) { out.bossSpawned = true; out.timeline.push({ at: T - t0, boss: true }); }
    if (inst.state === 'done') { out.cleared = true; break; }
    const alive = world.players.filter((p) => p.inside && !p.dead);
    if (!alive.length) break;
  }
  out.ms = T - t0;
  const boss = (room.monsters[zone] || []).find((m) => m && m._dungeonBoss);
  if (boss) { out.bossHpShare = boss.alive ? +(boss.hp / boss.maxHp).toFixed(3) : 0; out.bossMaxHp = boss.maxHp; out.splits = boss._split ? boss._split.n : null; }
  out.deaths = world.players.filter((p) => p.dead).length;
  out.players = world.players.map((p) => {
    const ps = room.playerState[p.id];
    return { style: p.style, skill: p.spec.skill || 'average', points: p.spec.points || 'balanced', dead: p.dead, diedAt: p.diedAt ? p.diedAt - t0 : null,
      hpShare: ps && !p.dead ? +(ps.hp / ps.maxHp).toFixed(2) : 0, maxHp: ps ? ps.maxHp : null, ate: p.ate,
      taken: Math.round(p.taken), bySrc: Object.fromEntries(Object.entries(p.bySrc).map(([k, v]) => [k, Math.round(v)])) };
  });
  /* the next run starts on a clean room: this one's sessions go (`keep`
     leaves them, for a look inside afterwards) */
  if (opts.keep) { out._world = world; out._zone = zone; return out; }
  for (const p of world.players) { try { room.sessions.delete(p.ws); } catch (e) { /* ignore */ } }
  return out;
}

/* ═══ ONE FRAME OF ONE PLAYER ═══ */
async function stepPlayer(world, p, zone, inst, box) {
  const { room } = world;
  if (!p.inside || p.dead) return;
  const ps = room.playerState[p.id];
  if (!ps || ps.dead || ps.dying || ps.z !== zone) { p.dead = true; p.diedAt = T; return; }
  const now = T;
  const list = (room.monsters[zone] || []).filter((m) => m && m.alive);

  /* the queued claims (an arrow or a bolt in the air, a volley's arrows) */
  if (p.queue.length) {
    const due = p.queue.filter((q) => q.at <= now);
    p.queue = p.queue.filter((q) => q.at > now);
    for (const q of due) {
      const m = list.find((x) => x.id === q.id);
      if (!m) continue;
      await send(world, p, { type: 'monster_damage', payload: Object.assign({ monsterId: m.id, zone, element: null, slot: q.slot }, q.payload) });
    }
  }

  /* 1. a blast about to go off near them: step out of it */
  const dangers = [];
  for (const m of list) {
    if (m._burstUntil && m._burstUntil > now) dangers.push({ id: m.id + ':b' + m._burstUntil, x: m.x, y: m.y, r: (m._burstR || SLIME_BURST.RADIUS), until: m._burstUntil });
    if (m._dungeonBoss && m._split && m._split.until > now) dangers.push({ id: m.id + ':s' + m._split.until, x: m.x, y: m.y, r: SLIME_BOSS.BLAST_R[Math.min(m._split.n, SLIME_BOSS.BLAST_R.length - 1)], until: m._split.until });
    if (m._dungeonBoss && m._abilityPhase === 'telegraph' && m._pendingAbility === 'slam') dangers.push({ id: m.id + ':m' + m._phaseUntil, x: m.x, y: m.y, r: BOSS_ABILITIES.SLAM.RANGE * bodyK(m), until: m._phaseUntil });
  }
  let flee = null;
  for (const d of dangers) {
    let seen = p.danger.get(d.id);
    if (!seen) {
      seen = { react: rnd() < p.skill.react, at: now + p.skill.reactMs * (0.6 + 0.8 * rnd()) };
      p.danger.set(d.id, seen);
    }
    const dist = Math.hypot(ps.x - d.x, ps.y - d.y);
    if (seen.react && now >= seen.at && dist < d.r + p.skill.margin) {
      if (!flee || dist - d.r < flee.dist - flee.r) flee = { ...d, dist };
    }
  }
  if (p.danger.size > 400) p.danger.clear();
  if (flee) {
    let ax = ps.x - flee.x, ay = ps.y - flee.y;
    const L = Math.hypot(ax, ay) || 1;
    ax /= L; ay /= L;
    /* a wall behind them: slide along it */
    if ((ps.x <= box.x0 + 4 && ax < 0) || (ps.x >= box.x1 - 4 && ax > 0)) ax = 0;
    if ((ps.y <= box.y0 + 4 && ay < 0) || (ps.y >= box.y1 - 4 && ay > 0)) ay = 0;
    if (!ax && !ay) { ax = ps.x < (box.x0 + box.x1) / 2 ? 1 : -1; }
    await walk(world, p, ps, zone, box, ax, ay, WALK);
    return;
  }

  /* 2. low: a bite, one every 15 s in a fight */
  const key = p.spec.fish && (p.spec.fish.key || 'cooked_fish_clownfish');
  if (key && (ps.inventory[key] || 0) > 0 && ps.hp < ps.maxHp * p.skill.eatAt && now >= p.eatAt) {
    const before = ps.hp;
    await send(world, p, { type: 'eat_request', payload: { invKey: key } });
    p.eatAt = now + FISH_GAP_MS;
    if (ps.hp > before) p.ate++;
  }

  /* 3. whom to hit: the nearest that can be hurt (a swelling slime is gone
        already; the swelling boss stands at its mark) */
  const hittable = list.filter((m) => !m._burstUntil && !(m._split && m._split.until > now));
  if (!p.target || !hittable.includes(p.target)) {
    let best = null, bd = Infinity;
    for (const m of hittable) { const d = Math.hypot(m.x - ps.x, m.y - ps.y); if (d < bd) { bd = d; best = m; } }
    p.target = best;
  }
  const m = p.target;
  if (!m) { await keepAlive(world, p, ps, zone); return; }
  const dist = Math.hypot(m.x - ps.x, m.y - ps.y);

  if (p.style === 'sword') {
    const reach = MELEE_REACH + 24 * (bodyK(m) - 1);
    if (dist > reach) {
      await walk(world, p, ps, zone, box, (m.x - ps.x) / dist, (m.y - ps.y) / dist, WALK);
      return;
    }
    await keepAlive(world, p, ps, zone);
    /* a special: two or more in its ring, or the boss */
    if (p.skill.specials && now - p.specialAt >= SPECIAL_CD && (ps.mana || 0) >= room._blockCost(ps, 'mana', 1)) {
      const ring = hittable.filter((x) => Math.hypot(x.x - ps.x, x.y - ps.y) <= SWORD_SPECIAL_R + 24 * (bodyK(x) - 1));
      if (ring.length >= 2 || m._dungeonBoss) {
        p.specialAt = now; p.swingAt = now;
        await send(world, p, { type: 'ability_use', payload: { type: 'swipe', tier: 0 } });
        for (const x of ring.slice(0, 24)) await send(world, p, { type: 'monster_damage', payload: { monsterId: x.id, zone, element: null, slot: 'melee', special: true } });
        return;
      }
    }
    if (now - p.swingAt >= swingCd(room, ps, 'sword', SWING_CD)) {
      p.swingAt = now;
      await send(world, p, { type: 'monster_damage', payload: { monsterId: m.id, zone, element: null, slot: 'melee', special: false } });
    }
    return;
  }

  /* a bow or a staff: stand off, kite what comes near */
  const band = p.style === 'bow' ? [230, 430] : [230, 460];
  let near = null, nd = Infinity;
  for (const x of hittable) { const d = Math.hypot(x.x - ps.x, x.y - ps.y) - 24 * (bodyK(x) - 1); if (d < nd) { nd = d; near = x; } }
  if (p.skill.kite && near && nd < p.skill.kite) {
    let ax = ps.x - near.x, ay = ps.y - near.y; const L = Math.hypot(ax, ay) || 1; ax /= L; ay /= L;
    if ((ps.x <= box.x0 + 4 && ax < 0) || (ps.x >= box.x1 - 4 && ax > 0)) { ax = 0; ay = ay >= 0 ? 1 : -1; }
    if ((ps.y <= box.y0 + 4 && ay < 0) || (ps.y >= box.y1 - 4 && ay > 0)) { ay = 0; ax = ax >= 0 ? 1 : -1; }
    await walk(world, p, ps, zone, box, ax, ay, WALK);
    return;
  }
  if (dist > band[1]) { await walk(world, p, ps, zone, box, (m.x - ps.x) / dist, (m.y - ps.y) / dist, WALK); return; }
  await keepAlive(world, p, ps, zone);
  const speed = p.style === 'bow' ? ARROW_PX_S : BOLT_PX_S;
  const slot = p.style === 'bow' ? 'ranged' : 'staff';
  if (p.skill.specials && now - p.specialAt >= SPECIAL_CD && (ps.mana || 0) >= room._blockCost(ps, 'mana', 1)) {
    p.specialAt = now; p.swingAt = now;
    await send(world, p, { type: 'ability_use', payload: { type: 'swipe', tier: 0 } });
    if (p.style === 'bow') {
      /* the volley: three arrows 200 px apart, then its stuck arrows' four
         chips every 500 ms (bot-lab's honest archer, playerActions.js) */
      const fly = 470 + dist / VOLLEY_PX_S * 1000;
      for (let k = 0; k < 3; k++) p.queue.push({ at: now + fly + 200 * k, id: m.id, slot, payload: { special: true, part: 3, noKb: k > 0 } });
      for (let k = 0; k < 4; k++) p.queue.push({ at: now + fly + 900 + 500 * k, id: m.id, slot, payload: { special: false, noKb: true } });
    } else {
      /* the big bolt: one claim carrying its three orbs */
      p.queue.push({ at: now + 470 + dist / BOLT_PX_S * 1000, id: m.id, slot, payload: { special: true, orbs: BIG_ORBS } });
    }
    return;
  }
  const cd = swingCd(room, ps, p.style, p.style === 'bow' ? BOW_CD : STAFF_CD);
  if (now - p.swingAt >= cd) {
    p.swingAt = now;
    p.queue.push({ at: now + dist / speed * 1000, id: m.id, slot, payload: { special: false } });
  }
}

/* a monster's size on the phone (gameSystems.js bossSizeK; 1 for any but a boss) */
function bodyK(m) {
  if (!m || !m._dungeonBoss) return 1;
  return bossSizeK({ boss: 1, archetype: m.arch, bs: m._split ? m._split.n : undefined, bn: m._split ? m._split.of : undefined }) || 1;
}

/* the swing period after the Speed points (prog3 ATK aspd: a cut, on the curve) */
function swingCd(room, ps, cat, base) {
  const q = ps.prog3 && ps.prog3.atk && ps.prog3.atk[cat] ? (ps.prog3.atk[cat].aspd || 0) : 0;
  const cut = 0.39 * q / (q + 10);
  return base * (1 - cut);
}

/* one frame's walk, inside the arena, as one move */
async function walk(world, p, ps, zone, box, ax, ay, speed) {
  const step = speed * FRAME / 1000;
  const x = Math.max(box.x0, Math.min(box.x1, ps.x + ax * step));
  const y = Math.max(box.y0, Math.min(box.y1, ps.y + ay * step));
  p.sentMoveAt = T;
  await send(world, p, moveMsg(zone, x, y, ax * 2.5, ay * 2.5));
}

/* a phone standing still sends its place now and then (quietPhone.js) */
async function keepAlive(world, p, ps, zone) {
  if (T - p.sentMoveAt < 1000) return;
  p.sentMoveAt = T;
  await send(world, p, moveMsg(zone, ps.x, ps.y, 0, 0));
}

export const _realNow = realNow;
