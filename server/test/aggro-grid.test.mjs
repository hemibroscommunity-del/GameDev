/* ═══ v2.3.3201: THE MONSTERS' GRID PICKS THE SAME PLAYER AS THE FULL LOOP ═══
 *
 * aggrogrid.js lets a Wheel monster look for a player to go after only in the
 * cells near it, instead of measuring the distance to every player in the
 * Wheel.  It must never change what any monster does.  Two checks:
 *
 *   1. The pick itself, against the full loop's own rule written out here,
 *      over thousands of made-up crowds: players on top of each other, ties
 *      at equal distances (the first in the list wins), players exactly on
 *      the range (not in it), harvesters, players on the safe ground (passed
 *      over unless they provoked the monster), every reach the game uses (a
 *      snowman's 300, a depth-scaled one, the 1,200 of a sticky aggro, which
 *      the grid hands back to the full loop), monsters on cell edges.
 *   2. The whole room, both ways, in lockstep: one room with the kill switch
 *      (`aggrogrid: false`, the full loop), one with the grid, the same
 *      players doing the same things with the same dice.  After every tick
 *      every monster (every field) and every message every player was sent
 *      must be the same in both rooms.  Fighters provoke monsters and walk
 *      onto the safe ground with them in tow, players stand tied and exactly
 *      on the range, harvesters work beside monsters, the grid is switched
 *      off and on mid-fight, and a position that is not a number sends a
 *      tick to the full loop.
 */
import { GameRoom } from '../src/index.js';
import { AGGRO_GRID } from '../src/aggrogrid.js';
import { WHEEL_CENTRE, WHEEL_SAFE_R } from '../src/wheelspawns.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 800))); }
}

/* ── the dice: each room draws from its own seeded stream, so two rooms fed
   the same things draw the same numbers (and a failure reproduces) ──────── */
const streams = new Map();
let cur = null;
function useStream(name) {
  if (!streams.has(name)) streams.set(name, { s: 777, u: 0 });
  cur = streams.get(name);
}
useStream('setup');
Math.random = () => ((cur.s = (cur.s * 1103515245 + 12345) >>> 0) / 4294967296);
Object.defineProperty(globalThis.crypto, 'randomUUID', {
  value: () => { cur.u++; return '00000000-0000-4000-8000-' + String(cur.u).padStart(12, '0'); },
  configurable: true, writable: true,
});
/* the scenario's own dice, apart from the rooms' */
let sseed = 20261013;
const srnd = () => ((sseed = (sseed * 1664525 + 1013904223) >>> 0) / 4294967296);

/* the simulated clock */
let simNow = 1_760_000_000_000;
Date.now = () => simNow;

function mockState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, v); },
      list: async () => new Map(),
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs() { return { sent: [], send(s) { this.sent.push(s); }, close() {} }; }
function baseSession() { return { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now(), moveSig: '' }; }

/* ── 1. the pick, against the full loop's rule ─────────────────────────── */
{
  useStream('pure');
  const room = new GameRoom(mockState(), mockEnv);
  room._liveFlags = {};
  const now = Date.now();
  /* the full loop, as index.js runs it: the nearest player not harvesting
     and not sheltered, the first in the list on a tie */
  const fullLoop = (players, m) => {
    let nearest = -1, nearestDist = Infinity;
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      if (p.extracting) continue;
      const dx = p.x - m.x;
      const dy = p.y - m.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        if (room._wheelSheltered(m, p.id, p.x, p.y, now)) continue;
        nearest = i;
        nearestDist = dist;
      }
    }
    return { nearest, nearestDist };
  };
  const C = AGGRO_GRID.CELL;
  const SAFE_EDGE = WHEEL_CENTRE[0] + WHEEL_SAFE_R;   /* due east of the centre: the safe ground's edge */
  const RANGES = [120, 300, 120 * 0.42, 300 * 0.7, 1200, 1];
  let trials = 0, asked = 0, found = 0, none = 0, handedBack = 0, ties = 0, sheltered = 0, mismatches = [];
  for (let t = 0; t < 4000; t++) {
    /* a monster somewhere: on a cell's corner, by the safe ground's edge, or anywhere */
    const kind = t % 4;
    const mx = kind === 0 ? Math.round(WHEEL_CENTRE[0] / C) * C + (t % 3) - 1
      : kind === 1 ? SAFE_EDGE + (srnd() - 0.5) * 200
        : WHEEL_CENTRE[0] + (srnd() - 0.5) * 8000;
    const my = kind === 0 ? Math.round(WHEEL_CENTRE[1] / C) * C + ((t >> 2) % 3) - 1
      : kind === 1 ? WHEEL_CENTRE[1] + (srnd() - 0.5) * 200
        : WHEEL_CENTRE[1] + (srnd() - 0.5) * 8000;
    const m = { x: mx, y: my, dmgByPlayer: Object.create(null) };
    const range = RANGES[t % RANGES.length];
    const n = AGGRO_GRID.MIN_PLAYERS + Math.floor(srnd() * 60);
    const players = [];
    for (let i = 0; i < n; i++) {
      const id = 'pp' + t + '_' + i;
      const r = srnd();
      let x, y;
      if (r < 0.15 && players.length) {             /* on top of someone else: a tie */
        const o = players[Math.floor(srnd() * players.length)];
        x = o.x; y = o.y;
      } else if (r < 0.3) {                          /* mirrored about the monster: a tie */
        const dx = Math.round((srnd() - 0.5) * range * 2), dy = Math.round((srnd() - 0.5) * range * 2);
        x = mx + dx; y = my + dy;
        players.push({ id: id + 'm', x: mx - dx, y: my - dy, extracting: false });
      } else if (r < 0.4) {                          /* exactly on the range */
        x = mx + range; y = my;
      } else if (r < 0.75) {                         /* near */
        x = mx + (srnd() - 0.5) * range * 3; y = my + (srnd() - 0.5) * range * 3;
      } else {                                       /* anywhere */
        x = mx + (srnd() - 0.5) * 6000; y = my + (srnd() - 0.5) * 6000;
      }
      players.push({ id, x, y, extracting: srnd() < 0.1 });
    }
    /* some provoked the monster: the safe ground does not shelter them from it */
    for (const p of players) {
      if (srnd() < 0.2) {
        m.dmgByPlayer[p.id] = 5;
        room.playerState[p.id] = { _lastDealtAt: now - 1000 };
      }
    }
    trials++;
    const cells = room._aggroGridOf(players);
    if (!cells) { mismatches.push({ t, why: 'no cells' }); continue; }
    const want = fullLoop(players, m);
    const got = room._aggroGridPick(cells, players, m, range, 'wheel', true, now);
    asked++;
    if (got === -2) { handedBack++; continue; }
    const expect = (want.nearest >= 0 && want.nearestDist < range) ? want.nearest : -1;
    if (got !== expect) mismatches.push({ t, got, expect, range, m: [mx, my] });
    else if (got >= 0) {
      found++;
      const tied = players.some((p, i) => i !== got && !p.extracting
        && Math.hypot(p.x - mx, p.y - my) === Math.hypot(players[got].x - mx, players[got].y - my));
      if (tied) ties++;
      if (players.some((p) => !p.extracting && Math.hypot(p.x - mx, p.y - my) < want.nearestDist && room._wheelSafeAt(p.x, p.y))) sheltered++;
    } else none++;
    for (const p of players) delete room.playerState[p.id];
  }
  check('1a. the grid picks exactly the full loop\'s player (' + asked + ' crowds)', mismatches.length === 0, mismatches.slice(0, 5));
  check('1b. it found players and found nobody, both many times', found > 500 && none > 200, { found, none });
  check('1c. ties were met (the first in the list wins)', ties > 50, { ties });
  check('1d. nearer players sheltered by the safe ground were passed over', sheltered > 20, { sheltered });
  check('1e. the 1,200 px sticky reach is handed back to the full loop', handedBack > 0 && handedBack < asked / 3, { handedBack, asked });

  /* the cells leave out harvesters, and a position that is not a plain number
     sends the whole zone to the full loop */
  const base = [];
  for (let i = 0; i < AGGRO_GRID.MIN_PLAYERS; i++) base.push({ id: 'q' + i, x: 1000 + i, y: 1000, extracting: i === 0 });
  const cells = room._aggroGridOf(base);
  let inCells = 0;
  for (const b of cells.values()) inCells += b.length;
  check('1f. harvesters are not put in cells', inCells === base.length - 1, { inCells });
  for (const bad of [NaN, Infinity, '1000', undefined, null]) {
    const ps = base.map((p) => ({ ...p }));
    ps[3].x = bad;
    check('1g. a position of ' + String(bad) + ' sends the zone to the full loop', room._aggroGridOf(ps) === null);
  }
  check('1h. fewer than MIN_PLAYERS: the full loop', room._aggroGridOf(base.slice(1)) === null);
  room._liveFlags = { aggrogrid: false };
  check('1i. `aggrogrid: false`: the full loop', room._aggroGridOf(base) === null);
  room._liveFlags = {};
  check('1j. a monster off the numbers is handed back', room._aggroGridPick(cells, base, { x: NaN, y: 0 }, 120, 'wheel', true, now) === -2);
}

/* ── 2. the whole room both ways, tick by tick ─────────────────────────── */
{
  const worlds = [];
  for (const name of ['full', 'grid']) {
    useStream(name);
    const room = new GameRoom(mockState(), mockEnv);
    /* the same flags at the joins (the join's caps carry the flags); the
       full loop's room is switched to `aggrogrid: false` once everyone is in */
    room._liveFlags = {};
    let tickFn = null;
    const realSetInterval = globalThis.setInterval;
    globalThis.setInterval = (fn, ms) => {
      if (ms === room.TICK_RATE && !tickFn) { tickFn = fn; return 1; }
      return realSetInterval(fn, ms);
    };
    room.startTickLoop();
    globalThis.setInterval = realSetInterval;
    worlds.push({ name, room, tickFn, ws: new Map(), picks: { found: 0, none: 0, back: 0 } });
  }
  const [W0, W1] = worlds;
  /* count what the grid answered (the grid room only) */
  {
    const real = W1.room._aggroGridPick;
    W1.room._aggroGridPick = function (...a) {
      const r = real.apply(this, a);
      if (r >= 0) W1.picks.found++; else if (r === -1) W1.picks.none++; else W1.picks.back++;
      return r;
    };
  }
  /* run `fn(world)` in both rooms, each on its own dice */
  const both = async (fn) => { for (const w of worlds) { useStream(w.name); await fn(w); } };
  const setPos = (w, id, x, y) => {
    const ps = w.room.playerState[id];
    ps.x = x; ps.y = y; ps.lastMoveAt = undefined;
  };

  const ARRIVAL = { x: WHEEL_CENTRE[0], y: WHEEL_CENTRE[1] + 288 };   /* v2.3.3310: the live Wheel's */
  const IDS = [];
  for (let i = 0; i < 44; i++) IDS.push('ag' + i);
  await both(async (w) => {
    for (const id of IDS) {
      const ws = fakeWs();
      w.room.sessions.set(ws, baseSession());
      await w.room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: id, protocolVersion: 2, ws: [1, 5], data: { x: 1000, y: 1000, z: 'town' } }));
      await w.room.webSocketMessage(ws, JSON.stringify({ type: 'move', x: ARRIVAL.x, y: ARRIVAL.y, d: 'south', z: 'wheel', vx: 0, vy: 0 }));
      w.ws.set(id, ws);
    }
    w.room._ensureZoneMonsters('wheel');
    if (w.name === 'full') w.room._liveFlags.aggrogrid = false;
  });
  for (const w of worlds) for (const ws of w.ws.values()) ws.sent.length = 0;

  /* where everyone stands, worked out once from the first room's monsters
     (the two rooms' monsters are compared below, so they are the same) */
  const mons = W0.room.monsters.wheel.filter((m) => m.alive);
  const nearSafe = mons.slice().sort((a, b) => Math.hypot(a.x - WHEEL_CENTRE[0], a.y - WHEEL_CENTRE[1]) - Math.hypot(b.x - WHEEL_CENTRE[0], b.y - WHEEL_CENTRE[1]));
  const snowman = mons.find((m) => m.arch === 'snowman');
  /* one monster no one else uses is moved (in both rooms) to stand 60 px off
     the safe ground's edge, with its home there, so its reach crosses onto
     the safe ground: no spawn is that close, but a monster wandering or
     following a fighter gets there */
  const edgeMon = nearSafe[30];
  const edgeAt = (() => {
    const dx = edgeMon.x - WHEEL_CENTRE[0], dy = edgeMon.y - WHEEL_CENTRE[1], d = Math.hypot(dx, dy);
    return { ux: dx / d, uy: dy / d };
  })();
  await both(async (w) => {
    const m = w.room.monsters.wheel.find((mm) => mm.id === edgeMon.id);
    m.x = m.spawnX = WHEEL_CENTRE[0] + edgeAt.ux * (WHEEL_SAFE_R + 60);
    m.y = m.spawnY = WHEEL_CENTRE[1] + edgeAt.uy * (WHEEL_SAFE_R + 60);
    m._wanderTx = null; m._wanderTy = null;
  });
  const plan = new Map();   /* id -> { x, y, role, mon } */
  let k = 0;
  /* 12 in town */
  for (; k < 12; k++) plan.set(IDS[k], { x: ARRIVAL.x + (srnd() - 0.5) * 900, y: ARRIVAL.y + (srnd() - 0.5) * 600, role: 'town' });
  /* 16 fighters, by the monsters nearest the safe ground (so a chase can
     reach it) and a few deeper out */
  for (let f = 0; f < 16; f++, k++) {
    const m = f < 10 ? nearSafe[f * 2 + 2] : mons[(f * 37) % mons.length];
    plan.set(IDS[k], { x: m.x + (srnd() - 0.5) * 160, y: m.y + (srnd() - 0.5) * 160, role: 'fight', mon: m.id, near: f < 10 });
  }
  /* 4 in two ties: mirrored about a monster */
  for (const m of [nearSafe[1], nearSafe[3]]) {
    plan.set(IDS[k++], { x: m.x + 40, y: m.y + 30, role: 'still' });
    plan.set(IDS[k++], { x: m.x - 40, y: m.y - 30, role: 'still' });
  }
  /* 2 exactly on the range, 1 just inside the snowman's */
  plan.set(IDS[k++], { x: nearSafe[5].x + 120, y: nearSafe[5].y, role: 'still' });
  plan.set(IDS[k++], { x: nearSafe[7].x, y: nearSafe[7].y - 120, role: 'still' });
  if (snowman) plan.set(IDS[k++], { x: snowman.x + 299, y: snowman.y, role: 'still' });
  else plan.set(IDS[k++], { x: ARRIVAL.x, y: ARRIVAL.y, role: 'town' });
  /* 3 harvesters beside monsters */
  for (let h = 0; h < 3; h++) {
    const m = nearSafe[9 + h];
    plan.set(IDS[k++], { x: m.x + 30, y: m.y, role: 'harvest' });
  }
  /* 2 on the safe ground just inside its edge, in that monster's reach: in
     range but sheltered, so passed over */
  for (const off of [15, 35]) {
    plan.set(IDS[k++], { x: WHEEL_CENTRE[0] + edgeAt.ux * (WHEEL_SAFE_R - off), y: WHEEL_CENTRE[1] + edgeAt.uy * (WHEEL_SAFE_R - off), role: 'sheltered' });
  }
  /* the rest wander the commons' edge */
  for (; k < IDS.length; k++) {
    const a = srnd() * Math.PI * 2;
    plan.set(IDS[k], { x: WHEEL_CENTRE[0] + Math.cos(a) * (WHEEL_SAFE_R - 100), y: WHEEL_CENTRE[1] + Math.sin(a) * (WHEEL_SAFE_R - 100), role: 'town' });
  }
  await both(async (w) => {
    for (const [id, p] of plan) {
      setPos(w, id, p.x, p.y);
      if (p.role === 'harvest') {
        const ps = w.room.playerState[id];
        ps.ex = 'cook'; ps._exAt = Date.now(); ps._exX = p.x; ps._exY = p.y;
      }
      const ps = w.room.playerState[id];
      ps.hp = ps.maxHp = 1e6;   /* nobody dies: a death is another workload */
    }
    /* ...nor does a monster: a provoked one has to live to follow its
       fighter onto the safe ground */
    for (const m of w.room.monsters.wheel) { m.hp = m.maxHp = 1e6; }
  });
  const pos = new Map([...plan].map(([id, p]) => [id, { x: p.x, y: p.y }]));

  const sortDeep = (v) => {
    if (Array.isArray(v)) return v.map(sortDeep);
    if (v && typeof v === 'object') {
      const o = {};
      for (const key of Object.keys(v).sort()) o[key] = sortDeep(v[key]);
      return o;
    }
    return v;
  };
  const snapMonsters = (w) => JSON.stringify(sortDeep(w.room.monsters.wheel));
  const snapPlayers = (w) => JSON.stringify(sortDeep(IDS.map((id) => {
    const ps = w.room.playerState[id];
    return { id, x: ps.x, y: ps.y, hp: ps.hp, dead: ps.dead, st: ps._elemStatus || null };
  })));

  const TICKS = 600;
  let firstDiff = null, chasingTicks = 0, chasedOntoSafe = 0, msgCount = 0, shelteredInReach = 0, snowChasedSheltered = false;
  for (let t = 0; t < TICKS && !firstDiff; t++) {
    simNow += 22;
    /* the scenario's moves, the same for both rooms */
    const moves = [];
    /* ticks 180-199: the fighters by the safe ground step up to their monster
       and hit it every tick, so it is provoked when they walk off */
    const snaps = [];
    const closeIn = t >= 180 && t < 200;
    if (closeIn) {
      for (const [id, p] of plan) {
        if (p.role !== 'fight' || !p.near) continue;
        const m = W0.room.monsters.wheel.find((mm) => mm.id === p.mon);
        if (!m || !m.alive) continue;
        const q = pos.get(id);
        q.x = m.x + 30; q.y = m.y;
        snaps.push({ id, x: q.x, y: q.y });
      }
    }
    for (const [id, p] of plan) {
      if (p.role === 'still' || p.role === 'harvest' || p.role === 'sheltered') continue;
      if (closeIn && p.near) continue;
      if ((t + id.length) % 2) continue;
      const q = pos.get(id);
      let x = q.x + (srnd() - 0.5) * 6, y = q.y + (srnd() - 0.5) * 6;
      /* fighters drift toward the safe ground from tick 200, so the monsters
         they hurt follow them onto it */
      if (p.role === 'fight' && t >= 200 && t < 420) {
        const dx = WHEEL_CENTRE[0] - q.x, dy = WHEEL_CENTRE[1] - q.y, d = Math.hypot(dx, dy) || 1;
        x = q.x + dx / d * 3; y = q.y + dy / d * 3;
      }
      q.x = x; q.y = y;
      moves.push({ id, x, y });
    }
    /* the fighters hit the monster they stand by, now and then */
    const hits = [];
    if (t % 15 === 0 || closeIn) {
      for (const [id, p] of plan) {
        if (p.role !== 'fight') continue;
        const q = pos.get(id);
        let best = null, bd = Infinity;
        for (const m of W0.room.monsters.wheel) {
          if (!m.alive) continue;
          const d = Math.hypot(m.x - q.x, m.y - q.y);
          if (d < bd) { bd = d; best = m; }
        }
        if (best && bd < 300) hits.push({ id, monsterId: best.id });
      }
    }
    /* the grid off and on again mid-fight; a position that is not a number */
    const gridOff = t >= 260 && t < 290;
    const nanTick = t === 330 || t === 331;
    await both(async (w) => {
      if (w.name === 'grid') w.room._liveFlags.aggrogrid = gridOff ? false : true;
      for (const sn of snaps) setPos(w, sn.id, sn.x, sn.y);
      for (const mv of moves) {
        await w.room.webSocketMessage(w.ws.get(mv.id), JSON.stringify({
          type: 'move', x: mv.x, y: mv.y, d: 'south', f: 'south', z: 'wheel', vx: 1, vy: 0,
          dodging: false, blocking: false, ba: null, dead: false, ex: null,
        }));
      }
      for (const h of hits) {
        await w.room.webSocketMessage(w.ws.get(h.id), JSON.stringify({
          type: 'monster_damage', payload: { monsterId: h.monsterId, zone: 'wheel', element: null, slot: 'melee', special: false },
        }));
      }
      if (nanTick) w.room.playerState[IDS[3]].x = NaN;
      /* a monster on the safe ground with nobody near and a sticky aggro that
         has just run out: the full loop's "nearest" is someone far off, the
         grid's nobody -- and the monster must end up the same either way */
      if (t === 500) {
        const m = w.room.monsters.wheel.find((mm) => mm.id === nearSafe[31].id);
        m.x = WHEEL_CENTRE[0]; m.y = WHEEL_CENTRE[1] - 1500;
        m._aggroOverrideTarget = IDS[0]; m._aggroOverrideUntil = Date.now() - 1;
      }
      w.tickFn();
      if (nanTick) setPos(w, IDS[3], pos.get(IDS[3]).x, pos.get(IDS[3]).y);
      for (const id of IDS) { const ps = w.room.playerState[id]; ps.hp = Math.max(ps.hp, 1e5); }
    });
    /* compare */
    const a = snapMonsters(W0), b = snapMonsters(W1);
    if (a !== b) firstDiff = { t, what: 'monsters' };
    else if (snapPlayers(W0) !== snapPlayers(W1)) firstDiff = { t, what: 'players' };
    else if (streams.get('full').s !== streams.get('grid').s || streams.get('full').u !== streams.get('grid').u) firstDiff = { t, what: 'dice drawn' };
    else {
      for (const id of IDS) {
        const sa = W0.ws.get(id).sent, sb = W1.ws.get(id).sent;
        if (sa.length !== sb.length || sa.some((s, i) => s !== sb[i])) { firstDiff = { t, what: 'messages to ' + id, a: sa.length, b: sb.length }; break; }
        msgCount += sa.length;
        sa.length = 0; sb.length = 0;
      }
    }
    {
      const sm = W0.room.monsters.wheel.find((mm) => mm.id === edgeMon.id);
      for (const [id, p] of plan) {
        if (p.role !== 'sheltered') continue;
        const ps = W0.room.playerState[id];
        if (sm.alive && Math.hypot(ps.x - sm.x, ps.y - sm.y) < 120) shelteredInReach++;
        if (sm.targetId === id) snowChasedSheltered = true;
      }
    }
    if (W0.room.monsters.wheel.some((m) => m.alive && m.targetId)) chasingTicks++;
    if (W0.room.monsters.wheel.some((m) => m.alive && m.targetId && W0.room._wheelSafeAt(m.x, m.y))) chasedOntoSafe++;
  }
  check('2a. ' + TICKS + ' ticks, both ways: every monster, every player, every message the same', !firstDiff, firstDiff);
  check('2b. messages were compared', msgCount > TICKS * IDS.length * 0.5, { msgCount });
  check('2c. monsters chased players (the pick mattered)', chasingTicks > TICKS / 2, { chasingTicks });
  check('2d. a provoked monster followed its fighter onto the safe ground', chasedOntoSafe > 0, { chasedOntoSafe });
  check('2f. a monster by the safe ground had sheltered players in its reach, and left them alone', shelteredInReach > 50 && !snowChasedSheltered, { shelteredInReach, snowChasedSheltered });
  check('2e. the grid answered: found players, found nobody, handed back', W1.picks.found > 1000 && W1.picks.none > 10000, W1.picks);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
console.log('all aggro-grid checks passed');
