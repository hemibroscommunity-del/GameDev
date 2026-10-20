/* Every gem pulls its weight -- v2.3.3517 (docs/GEM-PLAN.md Phase 4; the
 * owner's decisions 13 and 14, "All of that sounds good", 2026-10-20;
 * server/src/elemental.js ELEM_UP / SOAK_HIT / SHOCK_SPARK, combat.js,
 * burst.js, hits.js).
 *
 *   1. The flags: caps.elemup, caps.soakhit, caps.shockspark, under
 *      kill-switch names; the numbers (1.25, 0.8, 150 px, a quarter).
 *   2. The matchup: a gem that beats the monster's element lands 1.25x, one
 *      that loses lands as hard as no gem (never 0.75), the same element and
 *      no element 1 -- every pair of the wheel.
 *   3. UP on a hit: the worker's gem against the monster's element, the
 *      event's `up`, beside fracture (the two multiply), no gem no bonus, the
 *      claim's element never counts; `elemup: false` takes it away.
 *   4. UP on the Element Burst, monster by monster.
 *   5. SOAK at the door: a soaked monster's own blow lands 0.8x before the
 *      rail, on every row the table says (its storm arcs too), never a burn,
 *      a poison or a fire patch; `soakhit: false` puts it back.
 *   6. SHOCK: a hit on a monster shocked BEFORE it sparks to the nearest other
 *      live monster within 150 px for a quarter of the hit -- the hitter's
 *      damage, credit and kill; the hit that shocks it sparks nothing; one
 *      monster, no chain, none past the reach or to a dead one;
 *      `shockspark: false` sparks nothing.
 *   7. Nothing written: a hit with UP and a spark writes no row a hit did not.
 */
import { GameRoom, PRIVILEGED_EVENTS } from '../src/index.js';
import * as EL from '../src/elemental.js';
import { LIVEOPS } from '../src/liveops.js';
import { MONSTER_HITS } from '../src/hits.js';
import { PROG3 } from '../src/prog3.js';

let NOW = 1_770_000_000_000;
Date.now = () => NOW;

function makeState() {
  const store = new Map();
  const writes = [];
  return {
    _store: store, writes,
    storage: {
      get: async (k) => (Array.isArray(k) ? new Map(k.filter((x) => store.has(x)).map((x) => [x, store.get(x)])) : store.get(k)),
      put: async (k, v) => {
        if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) { writes.push(kk); store.set(kk, JSON.parse(JSON.stringify(vv))); } return; }
        writes.push(String(k)); store.set(k, JSON.parse(JSON.stringify(v)));
      },
      list: async (opts) => {
        const out = new Map();
        for (const [k, v] of store) if (!opts?.prefix || k.startsWith(opts.prefix)) out.set(k, v);
        return out;
      },
      delete: async (k) => { writes.push(String(k)); store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs() { return { sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

const state = makeState();
const room = new GameRoom(state, mockEnv);
const baseSession = () => ({ id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
async function join(ws, id, z) {
  room.sessions.set(ws, baseSession());
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: 'T', phrase: 'p-' + id, protocolVersion: 2, data: { x: -100000, y: -100000, z: z || 'meadow' } }));
}
const PID = 'bp_gemweight_a';
const ws = fakeWs();
await join(ws, PID);
const ps = () => room.playerState[PID];
const session = () => room.sessions.get(ws);
const sword = (extra) => ({ type: 'greatsword', tier: 'common', tierMult: 1.12, element1: null, element2: null, isVolatile: false, name: 'copper greatsword', gearBase: 'copper', reforgeBonus: null, hardenBonus: null, quality: 'normal', hardness: 0, temper: 0, ...(extra || {}) });
const flag = (name, on) => {
  room._liveFlags = { ...(room._liveFlags || {}) };
  if (on === undefined) delete room._liveFlags[name]; else room._liveFlags[name] = on;
};

/* The meadow's monsters, made ours: every one far away and asleep until a
   test puts it somewhere; `place(i, x, y, element)` readies one. */
const meadow = room.monsters.meadow || [];
const FAR = -50000;
function park() {
  for (const m of meadow) {
    m.x = FAR; m.y = FAR; m.alive = true; m.hp = 5000; m.maxHp = 5000; m.dmgByPlayer = Object.create(null);
    m.statuses = undefined; m._wanderPausedUntil = NOW + 3600000; m._invulnUntil = 0; m.element = null; m.level = 3;
  }
}
function place(i, x, y, element) {
  const m = meadow[i];
  m.x = x; m.y = y; m.alive = true; m.hp = 5000; m.maxHp = 5000; m.dmgByPlayer = Object.create(null);
  m.statuses = undefined; m._wanderPausedUntil = NOW + 3600000; m._invulnUntil = 0; m.element = element || null; m.level = 3;
  return m;
}
const X0 = 600, Y0 = 600;
const hitEvents = () => room.eventBuffer.filter((e) => e.type === 'monster_hit').map((e) => e.payload);
/* One melee hit on `m` by the player standing on it, every random draw
   fixed at `r` -- returns the monster_hit events it made. */
async function hit(m, r, extra) {
  NOW += 1000;
  if (ps()._monHitCad) ps()._monHitCad.clear();
  ps().x = m.x; ps().y = m.y; ps().z = 'meadow'; ps().activeSlot = 'melee';
  room.eventBuffer.length = 0;
  const real = Math.random;
  Math.random = () => r;
  try {
    await room.webSocketMessage(ws, JSON.stringify({ type: 'monster_damage', payload: { monsterId: m.id, zone: 'meadow', slot: 'melee', ...(extra || {}) } }));
  } finally { Math.random = real; }
  return hitEvents();
}
/* what the worker's own roll comes to for this player on a level-3 monster,
   every draw fixed at `r` (the capped roll, before fracture and UP) */
function capped(r) {
  const real = Math.random;
  Math.random = () => r;
  try { return room._rollHit(ps(), 'melee', false, { targetLevel: 3 }).dmg; } finally { Math.random = real; }
}
const R = 0.5;   /* a middling roll and no crit */

// ── 1. The flags and the numbers ──
{
  const sync = ws.sent.find((m) => m.type === 'state_sync' && m.caps);
  check('caps.elemup, caps.soakhit and caps.shockspark are advertised',
    !!sync && sync.caps.elemup === true && sync.caps.soakhit === true && sync.caps.shockspark === true,
    sync && [sync.caps.elemup, sync.caps.soakhit, sync.caps.shockspark]);
  check('...under names the liveflags route accepts (lower case: kill switches)',
    ['elemup', 'soakhit', 'shockspark'].every((n) => LIVEOPS.FLAG_NAME_RE.test(n)));
  check('the numbers: UP 1.25x, a soaked blow 0.8x, a spark within 150 px for a quarter',
    EL.ELEM_UP.MULT === 1.25 && EL.SOAK_HIT.MULT === 0.8 && EL.SHOCK_SPARK.R === 150 && EL.SHOCK_SPARK.PCT === 0.25,
    [EL.ELEM_UP, EL.SOAK_HIT, EL.SHOCK_SPARK]);
  check('...frozen', Object.isFrozen(EL.ELEM_UP) && Object.isFrozen(EL.SOAK_HIT) && Object.isFrozen(EL.SHOCK_SPARK));
  check('no new event type: monster_hit carries `up` and `spark` (already privileged)', PRIVILEGED_EVENTS.has('monster_hit'));
}

// ── 2. The matchup ──
{
  const WHEEL = [['flame', 'frost'], ['frost', 'storm'], ['storm', 'stone'], ['stone', 'wind'], ['wind', 'venom'], ['venom', 'flora'], ['flora', 'water'], ['water', 'flame']];
  const ELEMS = ['flame', 'frost', 'water', 'venom', 'storm', 'stone', 'wind', 'flora'];
  const bad = [];
  for (const a of ELEMS) {
    for (const t of ELEMS) {
      const wins = WHEEL.some(([s, w]) => s === a && w === t);
      const want = wins ? 1.25 : 1;
      if (EL.elementUpMult(a, t) !== want) bad.push([a, t, EL.elementUpMult(a, t)]);
    }
  }
  check('every gem against every element: 1.25 where it wins on the wheel, 1 everywhere else', bad.length === 0, bad);
  check('...a loss is never a penalty (flame on water: the old collision table says 0.75; a hit says 1)',
    EL.getEffectiveness('flame', 'water') === 0.75 && EL.elementUpMult('flame', 'water') === 1);
  check('...no element either side is 1', EL.elementUpMult(null, 'frost') === 1 && EL.elementUpMult('flame', null) === 1 && EL.elementUpMult('', '') === 1);
  check('...each gem beats exactly one land\'s element', ELEMS.every((a) => ELEMS.filter((t) => EL.elementUpMult(a, t) > 1).length === 1));
}

// ── 3. UP on a hit ──
park();
{
  /* the plain sword's roll: a gem never changes the metal's damage (decision 9) */
  ps().weapon = sword();
  const c = capped(R);
  check('(the roll is a whole, fixed number to compare against)', c > 4, c);
  ps().weapon = sword({ element1: 'flame', tier: 'elemental' });
  let m = place(0, X0, Y0, 'frost');
  let ev = await hit(m, R);
  let own = ev.find((e) => e.monsterId === m.id && !e.collision);
  check('a flame gem on a frost monster lands 1.25x: ' + (own && own.dmg) + ' for a roll of ' + c,
    !!own && own.dmg === Math.max(1, Math.round(c * 1.25)) && 5000 - m.hp === own.dmg, { own, c, hp: m.hp });
  check('...and its event says so (`up: 1`)', !!own && own.up === 1, own);
  m = place(1, X0, Y0, 'frost');
  ps().weapon = sword({ element1: 'storm', tier: 'elemental' });
  ev = await hit(m, R);
  own = ev.find((e) => e.monsterId === m.id && !e.collision);
  check('a storm gem on a frost monster (frost beats storm) lands as hard as no gem -- no penalty, no `up`',
    !!own && own.dmg === c && own.up === undefined, { own, c });
  m = place(2, X0, Y0, null);
  ps().weapon = sword({ element1: 'flame', tier: 'elemental' });
  ev = await hit(m, R);
  own = ev.find((e) => e.monsterId === m.id && !e.collision);
  check('a monster with no element: 1x, no `up`', !!own && own.dmg === c && own.up === undefined, { own, c });
  m = place(3, X0, Y0, 'frost');
  ps().weapon = sword();
  ev = await hit(m, R, { element: 'flame' });
  own = ev.find((e) => e.monsterId === m.id && !e.collision);
  check('no gem, though the claim says flame: 1x (the worker\'s gem, never the claim\'s)', !!own && own.dmg === c && own.up === undefined, { own, c });
  /* fracture and UP multiply */
  m = place(4, X0, Y0, 'frost');
  EL.applyElementStatus(m, 'stone', PID, 0, NOW, 1);
  EL.applyElementStatus(m, 'stone', PID, 0, NOW, 1);
  ps().weapon = sword({ element1: 'flame', tier: 'elemental' });
  ev = await hit(m, R);
  own = ev.find((e) => e.monsterId === m.id && !e.collision);
  check('beside fracture, the two multiply: two cracks (x1.12) and UP (x1.25) on one hit',
    !!own && own.dmg === Math.max(1, Math.round(c * 1.12 * 1.25)) && own.up === 1, { own, want: Math.round(c * 1.12 * 1.25) });
  /* the claim never buys it, even where the claim's element is honoured */
  flag('weapongem', false);
  m = place(0, X0, Y0, 'frost');
  ps().weapon = sword();
  ev = await hit(m, R, { element: 'flame' });
  own = ev.find((e) => e.monsterId === m.id && !e.collision);
  flag('weapongem');
  check('weapongem:false honours the claim\'s element for its status, but never for UP: a claimed flame on a frost monster lands 1x',
    !!own && own.dmg === c && own.up === undefined && !!m.statuses && !!m.statuses.burn, { own, c, st: m.statuses && Object.keys(m.statuses) });
  /* the kill switch */
  flag('elemup', false);
  m = place(5, X0, Y0, 'frost');
  ps().weapon = sword({ element1: 'flame', tier: 'elemental' });
  ev = await hit(m, R);
  own = ev.find((e) => e.monsterId === m.id && !e.collision);
  check('elemup:false takes it away: 1x, no `up`', !!own && own.dmg === c && own.up === undefined, { own, c });
  const ws2 = fakeWs();
  await join(ws2, 'bp_gemweight_b');
  const sync2 = ws2.sent.find((x) => x.type === 'state_sync' && x.caps);
  check('...and un-advertises caps.elemup (the phone prints its own guess, as before)', !!sync2 && sync2.caps.elemup === false, sync2 && sync2.caps.elemup);
  flag('elemup');
}

// ── 4. UP on the Element Burst ──
park();
{
  ps().weapon = sword({ element1: 'flame', tier: 'elemental' });
  ps().activeSlot = 'melee';
  ps().x = X0; ps().y = Y0; ps().z = 'meadow';
  ps().mana = ps().maxMana = 5000;
  ps()._burstCdUntil = 0;
  const up = place(0, X0 + 10, Y0, 'frost');
  const plain = place(1, X0 - 10, Y0, null);
  room.eventBuffer.length = 0;
  const real = Math.random;
  Math.random = () => R;
  try { room._handleElementBurst(session()); } finally { Math.random = real; }
  const ev = hitEvents();
  const eu = ev.find((e) => e.monsterId === up.id), ep = ev.find((e) => e.monsterId === plain.id);
  check('the burst hit both (one frost, one with no element)', !!eu && !!ep && eu.burst && ep.burst, ev);
  check('...the frost one 1.25x the other: ' + (eu && eu.dmg) + ' against ' + (ep && ep.dmg),
    !!eu && !!ep && eu.dmg === Math.max(1, Math.round(ep.dmg * 1.25)) && eu.up === 1 && ep.up === undefined, { eu, ep });
  check('the burst\'s range is the one the test assumes', PROG3.BURST_RADIUS > 10, PROG3.BURST_RADIUS);
}

// ── 5. Soak at the door ──
park();
{
  check('the door\'s table: a soak softens every blow the monster delivers itself, its storm arcs too, never a tick or a fire patch',
    ['swing', 'snowball', 'pile', 'kit', 'burst', 'boss', 'shock'].every((r) => MONSTER_HITS[r].soak === true)
      && ['fire', 'burn', 'poison'].every((r) => MONSTER_HITS[r].soak === false),
    Object.fromEntries(Object.keys(MONSTER_HITS).map((r) => [r, MONSTER_HITS[r].soak])));
  const m = place(0, X0, Y0, 'water');
  const p = ps();
  /* the door's steps 3-4 (a roll, a rock between) are hit-door's; here every
     blow reaches step 6 */
  const realMissed = room._hitMissed;
  room._hitMissed = () => false;
  /* a blow straight through the door, no shield, no roll: `dmg` on the event
     is the blow before the dice (the rail aside) */
  const blow = async (src, soaked) => {
    m.statuses = undefined;
    if (soaked) EL.applyElementStatus(m, 'water', PID, 0, NOW, 1);
    p.hp = p.maxHp = 100000; p.dying = false; p.dead = false; p.blocking = false; p._blockUp = false;
    p.x = X0 + 30; p.y = Y0; p.z = 'meadow';
    room.eventBuffer.length = 0;
    NOW += 5000;
    room._monsterHit({ src, zoneId: 'meadow', pid: PID, m, mid: m.id, lvl: m.level, raw: 100, at: { x: m.x, y: m.y }, now: NOW });
    const e = room.eventBuffer.find((x) => x.type === 'monster_attack');
    return e ? e.payload.dmg : null;
  };
  const rows = ['swing', 'pile', 'kit', 'burst', 'boss', 'shock', 'fire', 'burn', 'poison'];
  const got = {};
  for (const src of rows) got[src] = [await blow(src, false), await blow(src, true)];
  const softened = ['swing', 'pile', 'kit', 'burst', 'boss', 'shock'];
  check('a soaked monster\'s own blow lands 0.8x (100 -> 80) on every row that says so',
    softened.every((r) => got[r][0] === 100 && got[r][1] === 80), got);
  check('...and a burn, a poison or a fire patch lands whole (100)', ['fire', 'burn', 'poison'].every((r) => got[r][0] === 100 && got[r][1] === 100), got);
  flag('soakhit', false);
  const off = await blow('swing', true);
  flag('soakhit');
  check('soakhit:false puts it back: 100', off === 100, off);
  /* the rail comes after: a blow soaked below the rail is not railed */
  const railRow = MONSTER_HITS.kit;
  p.maxHp = 1000;
  m.statuses = undefined;
  EL.applyElementStatus(m, 'water', PID, 0, NOW, 1);
  room.eventBuffer.length = 0;
  NOW += 5000;
  p.hp = 1000;
  const big = Math.ceil(1000 * railRow.rail / 0.8) + 50;
  room._monsterHit({ src: 'kit', zoneId: 'meadow', pid: PID, m, mid: m.id, lvl: m.level, raw: big, at: { x: m.x, y: m.y }, now: NOW });
  const ek = room.eventBuffer.find((x) => x.type === 'monster_attack');
  check('...softened first, then the rail: a soaked slam past the rail is still railed at ' + Math.floor(1000 * railRow.rail),
    !!ek && ek.payload.dmg === Math.floor(1000 * railRow.rail), ek && ek.payload);
  room._hitMissed = realMissed;
}

// ── 6. Shock: the spark ──
park();
{
  /* every hit here leaves the struck monster where it stood (`noKb`, the
     stuck arrows' flag), so the distances below hold from hit to hit; the
     spark is measured from where a hit LANDS, before its shove (the last
     check) */
  const still = (m) => hit(m, R, { noKb: true });
  ps().weapon = sword();
  const c = capped(R);
  const m = place(0, X0, Y0, null);
  const near = place(1, X0 + 100, Y0, null);
  const nearer = place(2, X0, Y0 + 60, null);
  const tooFar = place(3, X0 + 160, Y0, null);
  /* a hit on a monster that is not shocked sparks nothing */
  let ev = await still(m);
  check('no shock, no spark: the neighbours untouched', near.hp === 5000 && nearer.hp === 5000 && tooFar.hp === 5000 && !ev.some((e) => e.spark), ev);
  /* the storm gem's own hit shocks it and sparks nothing yet */
  ps().weapon = sword({ element1: 'storm', tier: 'elemental' });
  m.statuses = undefined;
  ev = await still(m);
  check('the hit that SHOCKS it sparks nothing (the next one does)', !!m.statuses && !!m.statuses.shock && nearer.hp === 5000 && near.hp === 5000 && !ev.some((e) => e.spark), { st: m.statuses && Object.keys(m.statuses), ev });
  /* the next hit, from anyone's weapon: a plain sword */
  ps().weapon = sword();
  const h0 = nearer.hp, c0 = nearer.dmgByPlayer[PID] || 0;
  ev = await still(m);
  const sp = ev.find((e) => e.spark);
  const want = Math.max(1, Math.round(c * 0.25));
  check('a hit on a shocked monster sparks to the NEAREST other monster within 150 px, for a quarter of the hit (' + want + ' of ' + c + ')',
    !!sp && sp.monsterId === nearer.id && sp.dmg === want && h0 - nearer.hp === want, { sp, want, c, hp: nearer.hp });
  check('...one monster only: the farther one in reach and the one past it untouched', near.hp === 5000 && tooFar.hp === 5000, [near.hp, tooFar.hp]);
  check('...the hitter\'s damage, credited to them', (nearer.dmgByPlayer[PID] || 0) - c0 === want, nearer.dmgByPlayer);
  check('...its event names the monster it leapt from, after the hit\'s own', sp && sp.spark === m.id && ev.indexOf(sp) > ev.findIndex((e) => e.monsterId === m.id), ev);
  check('...and pulls the sparked monster onto the hitter', nearer._aggroOverrideTarget === PID, nearer._aggroOverrideTarget);
  /* no chain: the sparked monster shocked too sparks nothing on */
  const n0 = near.hp;
  EL.applyElementStatus(nearer, 'storm', PID, 0, NOW, 1);
  m.statuses = undefined;
  EL.applyElementStatus(m, 'storm', PID, 0, NOW, 1);
  ev = await still(m);
  check('no chain: a spark into a shocked monster leaps no further', ev.filter((e) => e.spark).length === 1 && near.hp === n0, { sparks: ev.filter((e) => e.spark).length, near: near.hp });
  /* a dead neighbour is passed over for the next nearest */
  nearer.alive = false; nearer.hp = 0;
  m.statuses = undefined;
  EL.applyElementStatus(m, 'storm', PID, 0, NOW, 1);
  ev = await still(m);
  const sp2 = ev.find((e) => e.spark);
  check('a dead neighbour is passed over: the next nearest in reach takes it', !!sp2 && sp2.monsterId === near.id, sp2);
  /* nobody in reach: nothing */
  near.alive = false; near.hp = 0;
  m.statuses = undefined;
  EL.applyElementStatus(m, 'storm', PID, 0, NOW, 1);
  ev = await still(m);
  check('nobody within 150 px (the one at 160 is not): no spark', !ev.some((e) => e.spark) && tooFar.hp === 5000, ev);
  /* a spark that kills: the hitter's kill */
  const vic = place(4, X0 + 50, Y0, null);
  vic.hp = 2;
  m.statuses = undefined;
  EL.applyElementStatus(m, 'storm', PID, 0, NOW, 1);
  ev = await still(m);
  const kill = room.eventBuffer.find((e) => e.type === 'monster_kill' && e.payload && e.payload.monsterId === vic.id);
  check('a spark that kills: the kill is the hitter\'s (its monster_kill pays them)',
    (!vic.alive || vic.hp <= 0) && !!kill && Array.isArray(kill.payload.recipients) && kill.payload.recipients.includes(PID),
    { alive: vic.alive, hp: vic.hp, kill: kill && kill.payload });
  /* the kill switch */
  park();
  const m2 = place(0, X0, Y0, null);
  const n2 = place(1, X0 + 40, Y0, null);
  EL.applyElementStatus(m2, 'storm', PID, 0, NOW, 1);
  flag('shockspark', false);
  ev = await still(m2);
  flag('shockspark');
  check('shockspark:false sparks nothing', n2.hp === 5000 && !ev.some((e) => e.spark), ev);
  /* from where the hit LANDED: a neighbour 140 px on the far side of the
     shove is in reach, though the shove carries the struck one 30 px away */
  park();
  const m3 = place(0, X0, Y0, null);
  const back = place(1, X0 - 140, Y0, null);
  EL.applyElementStatus(m3, 'storm', PID, 0, NOW, 1);
  ps().weapon = sword();
  NOW += 1000;
  if (ps()._monHitCad) ps()._monHitCad.clear();
  ps().x = X0 - 5; ps().y = Y0; ps().z = 'meadow';
  room.eventBuffer.length = 0;
  const realR = Math.random;
  Math.random = () => R;
  try {
    await room.webSocketMessage(ws, JSON.stringify({ type: 'monster_damage', payload: { monsterId: m3.id, zone: 'meadow', slot: 'melee' } }));
  } finally { Math.random = realR; }
  const sp3 = hitEvents().find((e) => e.spark);
  check('the spark leaps from where the hit landed, before its shove (the struck one shoved ' + Math.round(m3.x - X0) + ' px away; the neighbour 140 px behind still caught it)',
    m3.x - X0 >= 20 && !!sp3 && sp3.monsterId === back.id, { x: m3.x, sp3 });
}

// ── 7. Nothing written ──
park();
{
  ps().weapon = sword({ element1: 'flame', tier: 'elemental' });
  const m = place(0, X0, Y0, 'frost');
  place(1, X0 + 40, Y0, null);
  EL.applyElementStatus(m, 'storm', PID, 0, NOW, 1);
  /* a trained-skill level-up saves on its own (prog3.js); not this test's */
  const realXp = room._prog3AwardXp;
  room._prog3AwardXp = () => {};
  const w0 = state.writes.length;
  const ev = await hit(m, R);
  room._prog3AwardXp = realXp;
  check('(the hit landed UP and sparked)', ev.some((e) => e.up === 1) && ev.some((e) => e.spark), ev);
  check('a hit with UP and a spark that kills nothing writes no row', state.writes.length === w0, state.writes.slice(w0));
}

// ── 8. The phone's drawing of a spark (src/game/shockSpark.js) ──
{
  const SS = await import('../../src/game/shockSpark.js');
  let seed = 7;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  const pts = SS.sparkZigzag(0, 0, 140, 0, rnd, 8);
  check('the bolt\'s jag: its ends where the monsters are, a point every ~14 px, none more than its reach off the line',
    pts[0][0] === 0 && pts[0][1] === 0 && pts[pts.length - 1][0] === 140 && pts[pts.length - 1][1] === 0
      && pts.length === 11 && pts.every((p) => Math.abs(p[1]) <= 8), pts);
  const S = { hitParticles: [] };
  const n = SS.sparkLine(S, { x: 100, y: 200 }, { x: 160, renderX: 170, y: 220, renderY: 230 }, rnd);
  check('a spark draws one bolt, chest to chest (drawn places when it has them), and its sparks',
    n >= 10 && S.hitParticles.length === n && Array.isArray(S._sparkArcs) && S._sparkArcs.length === 1
      && S._sparkArcs[0].x0 === 100 && S._sparkArcs[0].y0 === 200 - SS.SPARK_CHEST_DY && S._sparkArcs[0].x1 === 170 && S._sparkArcs[0].y1 === 230 - SS.SPARK_CHEST_DY
      && S._sparkArcs[0].dur === SS.SPARK_ARC_MS, { n, arcs: S._sparkArcs });
  const S2 = { hitParticles: [] };
  check('...nothing for ends further apart than a spark reaches (a stale id) or not on the map',
    SS.sparkLine(S2, { x: 0, y: 0 }, { x: SS.SPARK_MAX_PX + 50, y: 0 }) === 0 && SS.sparkLine(S2, { x: NaN, y: 0 }, { x: 10, y: 0 }) === 0
      && SS.sparkLine(S2, null, { x: 1, y: 1 }) === 0 && S2.hitParticles.length === 0 && !S2._sparkArcs);
  const S3 = {};
  for (let i = 0; i < SS.SPARK_ARC_MAX + 9; i++) SS.sparkLine(S3, { x: 0, y: 0 }, { x: 60, y: 0 }, rnd);
  check('...and never more than ' + SS.SPARK_ARC_MAX + ' bolts held at once (the oldest let go)', S3._sparkArcs.length === SS.SPARK_ARC_MAX);
}

console.log(failures ? '\n' + failures + ' FAILED' : '\nALL PASS');
process.exit(failures ? 1 : 0);
