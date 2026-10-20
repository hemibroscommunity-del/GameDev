/* Every way a monster hits a player, pinned -- v2.3.3296 (spec
 * docs/specs/hit-door.md).
 *
 * The GDD's damage pipeline (README.md §8, "Damage Pipeline (Interceptor
 * Chain)") was one ordered list of steps every hit goes through.  The worker
 * built one function for the HP arithmetic (combat.js _applyDamage) and wrote
 * the steps around it -- the safe ground, the harvest shield, the rock in the
 * way, the shield and its cost, the parry, the one-hit rail, the element, the
 * event, the save, the death -- once per way a monster can hurt you: seven
 * copies, each a little different.
 *
 * This suite measured what each of them did, through the real entry points
 * the monster loop calls (a wind-up resolving, a ball landing, a pile
 * touching, a cast executing, a slime going off, a boss ability, ground on
 * fire, a storm's arc, a burn or poison ticking).  It was the table the one
 * door (src/hits.js) had to keep: every row passed on the worker before the
 * door existed (v2.3.3296).  The differences between the rows were not all
 * intended -- several were copies that missed a later rule -- and pinning
 * them made each one a cell docs/specs/hit-door.md could put to the owner.
 *
 * v2.3.3300: the owner's nine decisions ("keep going on recommended") changed
 * those cells, and the rows below with them; each changed row says so:
 *
 *   1. A LANDED HIT: HP, the event's numbers, the damage counted for
 *      lifesteal, the source's own tag (ability / element).
 *   2. A ROLL: a dodge or a lunge inside the window the worker charged for
 *      slips every blow you can see coming; the pile, fire, a storm's arc and
 *      the ticks land, and so does the retreat shot's roll.
 *   3. THE SHIELD, FACING IT, HELD: 10, or free for a snowball; the event;
 *      the pools saved, coalesced.
 *   4. THE SHIELD, RAISED IN TIME: everything blockable parries but the ball.
 *   5. THE SHIELD, FACING AWAY: the hit lands, a snowball's too.
 *   6. HARVESTING: every monster blow leaves a harvester alone.
 *   7. THE SAFE GROUND: who leaves you alone on the Wheel's commons.
 *   8. A ROCK IN THE WAY (Frost's snowbanks): every blow that travels is
 *      stopped, asked before the shield.
 *   9. THE ONE-HIT RAIL and DEATH, a block is never a hit, thorns, the
 *      hexer's curse, the element's status.
 *  10. THE DOOR (added with src/hits.js): every row measured above is a row
 *      of MONSTER_HITS and back, every cell from its closed set, a stopped
 *      block's event says the bar, only three files price a hit on a player,
 *      and an unknown row hits nobody.
 */
import { GameRoom } from '../src/index.js';
import { WHEEL_ZONE } from '../src/wheelzone.js';
import { WHEEL_CENTRE, WHEEL_SAFE_R } from '../src/wheelspawns.js';
import { BLOCK_STAMINA_COST } from '../src/data.js';
import { TELEGRAPH, SLIME_BURST } from '../src/telegraph.js';
import { BOSS_ABILITIES } from '../src/dungeon.js';
import { SHOCK, BURN, POISON } from '../src/monsterstatus.js';
import { FIRE_TRAIL } from '../src/firetrail.js';
import { ZONE_PROPS } from '../src/props.js';

const mockState = () => ({
  storage: { get: async () => undefined, put: async () => {}, list: async () => new Map(), delete: async () => {} },
  getWebSockets: () => [], acceptWebSocket: () => {},
});
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs(label) { return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + ' ' + JSON.stringify(detail === undefined ? {} : detail)); }
}

/* Sure hits: _applyDamage rolls a Dodge on Math.random, and a row that passes
   on a lucky roll pins nothing. */
Math.random = () => 0.999;

const room = new GameRoom(mockState(), mockEnv);
for (const pid of ['p0', 'p1']) {
  const ws = fakeWs(pid);
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
  /* v2.3.3315: the Wheels a phone of today draws -- one that says none is out
     of step with the long Wheel and no monster's hit reaches it (TRAPS §196) */
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id: pid, name: 'Player ' + pid, protocolVersion: 2, ws: [1, 5], data: { x: 1000, y: 1000, z: 'town' } }));
}
const P = room.playerState.p1;          /* the one being hit */
const Q = room.playerState.p0;          /* the storm's first target, and a bystander */
const wheel = room._ensureZoneMonsters(WHEEL_ZONE);
const M = wheel.find((m) => m.home === 'frost');
check('setup: two players joined, a Wheel monster to borrow', !!P && !!Q && !!M && P.prog3 && Q.prog3);
const MAX_HP = P.maxHp, MAX_ST = P.maxStamina;

/* Spy: what each death was put down to. */
const deaths = [];
{
  const real = room._handlePlayerDeath.bind(room);
  room._handlePlayerDeath = (ps, pid, cause) => { deaths.push({ pid, cause }); return real(ps, pid, cause); };
}

/* Spies: which save each source asks for itself.  The coalesced saves call
   _saveRpg underneath when their window is up (persistence.js), so only a
   call made from outside another save is counted. */
const saves = { full: 0, pools: 0, vitals: 0 };
let saveDepth = 0;
for (const k of ['full', 'pools', 'vitals']) {
  const name = k === 'full' ? '_saveRpg' : k === 'pools' ? '_saveRpgPools' : '_saveRpgVitals';
  const real = room[name].bind(room);
  room[name] = (...a) => {
    if (saveDepth === 0) saves[k]++;
    saveDepth++;
    try { return real(...a); } finally { saveDepth--; }
  };
}

/* Frost's middle snowbank (props.js): a monster north of it and a player
   south of it have it between them. */
const BANK = ZONE_PROPS.frost.find((p) => p.id === 'frost-rock-ridge');

/* Where a case is played: out on the Wheel off the safe ground, on the safe
   ground itself, or either side of Frost's snowbank. */
function place(where) {
  if (where === 'safe') {
    return { zone: WHEEL_ZONE, mx: WHEEL_CENTRE[0] - 30, my: WHEEL_CENTRE[1], px: WHEEL_CENTRE[0], py: WHEEL_CENTRE[1] };
  }
  if (where === 'rock') {
    /* 3 px off each face: 48 px apart, inside a snowman's swing (72 on a
       1.5 vertical stretch, telegraph.js _basicAtkGeom) */
    return { zone: 'frost', mx: BANK.x, my: BANK.y - BANK.blockD - 3, px: BANK.x, py: BANK.y + 3 };
  }
  const ux = M.spawnX - WHEEL_CENTRE[0], uy = M.spawnY - WHEEL_CENTRE[1], ul = Math.hypot(ux, uy);
  const r = WHEEL_SAFE_R + 400;
  const x = WHEEL_CENTRE[0] + (ux / ul) * r, y = WHEEL_CENTRE[1] + (uy / ul) * r;
  return { zone: WHEEL_ZONE, mx: x, my: y, px: x + 30, py: y };
}

function freshPlayer(ps, zone, x, y) {
  ps.z = zone; ps.x = x; ps.y = y;
  ps.dead = false; ps.dying = false; ps.disconnected = false; ps.respawnAt = 0;
  ps.maxHp = MAX_HP; ps.hp = MAX_HP; ps.maxStamina = MAX_ST; ps.stamina = MAX_ST - 30;
  ps.blocking = false; ps.ba = undefined; ps.blockStartT = 0;
  ps.dodging = false; ps._rollUntil = 0; ps._rollKind = null;
  ps.ex = null; ps._exAt = 0; ps._exX = 0; ps._exY = 0;
  ps._zoneEntryGraceUntil = 0; ps._godUntil = 0;
  ps.lastDamageAt = 0; ps._lastDealtAt = 0;
  ps.dmgFromMonster = {};
  ps._cursedUntil = 0; ps._chillUntil = 0; ps._stuckUntil = 0; ps._stuckImmuneUntil = 0;
  ps._dazeUntil = 0; ps._dazeImmuneUntil = 0; ps._soakUntil = 0; ps._gustLeft = 0; ps._gustUntil = 0;
}

/* One case: put the monster and the player in place, let `setup` change
   either, run the source, and say what happened. */
function play(src, where, setup) {
  const now = Date.now();
  const at = place(where);
  const m = M;
  m.alive = true; m.x = at.mx; m.y = at.my; m.spawnX = m.spawnX; m.hp = m.maxHp;
  m.statuses = {}; m.arch = 'fodder'; m.element = null; m.variant = null; m.dmg = 30; m.level = 5;
  m.dmgByPlayer = Object.create(null);
  m.atkCd = now + 1e9; m._attackingUntil = 0; m._stunUntil = 0;
  m._bwUntil = 0; m._bwTarget = null; m._bwKind = null;
  m._tgPhase = null; m._tgUntil = 0; m._tgTarget = null; m._tgRadius = 0; m._tgNextAt = now + 1e9;
  m._burPhase = null; m._burUntil = 0; m._burTarget = null; m._burCd = now + 1e9; m._invulnUntil = 0;
  m._burstUntil = 0; m._burstR = 0; m._burstKiller = null; m._burstDone = false;
  m._projImpactAt = 0; m._projTargetId = null;
  freshPlayer(P, at.zone, at.px, at.py);
  freshPlayer(Q, at.zone, at.px + 60, at.py);
  if (room._burns) room._burns.clear();
  if (room._poisons) room._poisons.clear();
  room.fireTrails = Object.create(null);
  room._fireBurnAt = Object.create(null);
  room.monsters[at.zone] = [m];
  if (setup) setup({ m, ps: P, now, at });
  room.eventBuffer.length = 0;
  saves.full = 0; saves.pools = 0; saves.vitals = 0;
  const hp0 = P.hp, st0 = P.stamina, mhp0 = m.hp;
  SOURCES[src](m, now, at);
  const evs = room.eventBuffer.filter((e) => e.type === 'monster_attack' && e.payload.targetId === 'p1').map((e) => e.payload);
  return {
    hpLost: hp0 - P.hp, stLost: st0 - P.stamina, monsterLost: mhp0 - m.hp,
    ev: evs.length === 1 ? evs[0] : null, evs, saves: { ...saves },
    parryEvent: room.eventBuffer.some((e) => e.type === 'parry'),
    dying: !!P.dying, tracked: (P.dmgFromMonster && P.dmgFromMonster[m.id]) || 0,
    stamped: P.lastDamageAt > 0, cursed: P._cursedUntil > now, chilled: P._chillUntil > now,
  };
}

/* The real entry points, one per way a monster's blow reaches you. */
const SOURCES = {
  /* a basic swing's wind-up running out (telegraph.js _resolveBasicWindup) */
  swing(m, now, at) {
    m._bwUntil = now - 1; m._bwTarget = 'p1'; m._bwKind = 'swing';
    room._resolveBasicWindup(at.zone, m, now);
  },
  /* a snowman's ball landing (the impact in index.js _tickMonsters) */
  snowball(m, now, at) {
    m.arch = 'snowman';
    m._projImpactAt = now - 1; m._projTargetId = 'p1';
    m._projTx = P.x; m._projTy = P.y; m._projFromX = m.x; m._projFromY = m.y;
    room._tickMonsters();
  },
  /* the snow pile touching you (telegraph.js _resolveBurrow) */
  burrow(m, now, at) {
    m.arch = 'snowman';
    m._burPhase = 'pile'; m._burTarget = 'p1'; m._burUntil = now + 5000; m._burFloor = 0;
    m._burContactNextAt = 0; m._invulnUntil = m._burUntil;
    P.x = m.x + 10; P.y = m.y;
    room._resolveBurrow(at.zone, m, now);
  },
  /* a brute's slam and a fodder's lunge executing (_resolveMonsterTelegraph) */
  slam(m, now, at) {
    m.arch = 'brute';
    m._tgPhase = 'telegraph'; m._tgUntil = now - 1; m._tgTarget = 'p1'; m._tgRadius = 400;
    room._resolveMonsterTelegraph(at.zone, m, now);
  },
  lunge(m, now, at) {
    m.arch = 'fodder';
    m._tgPhase = 'telegraph'; m._tgUntil = now - 1; m._tgTarget = 'p1'; m._tgRadius = 400;
    room._resolveMonsterTelegraph(at.zone, m, now);
  },
  /* a blue slime going off (_resolveSlimeBurst) */
  burst(m, now, at) {
    m.variant = Object.keys(SLIME_BURST.VARIANTS)[0];
    m._burstUntil = now - 1; m._burstR = 400; m.hp = 0;
    room._resolveSlimeBurst(at.zone, m, now);
  },
  /* a dungeon boss's ability (dungeon.js _dungeonBossHitPlayer) */
  boss(m, now, at) {
    room._dungeonBossHitPlayer({ zone: at.zone }, m, 'p1', 1.5);
  },
  /* ground a fire goblin set alight (firetrail.js _tickFireTrail) */
  fire(m, now, at) {
    room.fireTrails[at.zone] = [{ mid: m.id, lvl: m.level, x: P.x, y: P.y, armAt: now - 1, dieAt: now + 60000 }];
    room._tickFireTrail(at.zone, [{ id: 'p1', x: P.x, y: P.y }], now);
  },
  /* a storm monster's hit on p0 arcing to p1 (monsterstatus.js _shockArcs) */
  shock(m, now, at) {
    room._shockArcs(at.zone, m, 'p0', Q, now);
  },
  /* a burn's and a poison's tick (monsterstatus.js _tickDots) */
  burn(m, now, at) {
    const b = room._igniteDot('burn', at.zone, m, 'p1', now);
    b.next = now - 1;
    room._tickDots('burn', now);
  },
  poison(m, now, at) {
    const b = room._igniteDot('poison', at.zone, m, 'p1', now);
    b.next = now - 1;
    room._tickDots('poison', now);
  },
};

/* What a landed hit should take, by source, against a player with MAX_HP. */
const hitK = (lvl) => room._monsterHitK(lvl);
const RAW = {
  swing: () => 30, snowball: () => 30, burrow: () => 30,
  slam: () => Math.min(Math.ceil(30 * TELEGRAPH.KITS.brute.dmgMult), Math.floor(MAX_HP * TELEGRAPH.MAX_HIT_PCT)),
  lunge: () => Math.min(Math.ceil(30 * TELEGRAPH.KITS.fodder.dmgMult), Math.floor(MAX_HP * TELEGRAPH.MAX_HIT_PCT)),
  burst: () => Math.min(Math.ceil(SLIME_BURST.DMG * hitK(5)), Math.floor(MAX_HP * TELEGRAPH.MAX_HIT_PCT)),
  boss: () => Math.min(Math.ceil(30 * 1.5), Math.floor(MAX_HP * BOSS_ABILITIES.MAX_HIT_PCT)),
  fire: () => Math.min(Math.ceil(FIRE_TRAIL.DMG * hitK(5)), Math.max(1, Math.floor(MAX_HP * 0.5))),
  shock: () => Math.max(1, Math.min(Math.round(30 * SHOCK.PCT), Math.floor(MAX_HP * SHOCK.MAX_HP_PCT))),
  burn: () => Math.min(Math.max(1, Math.round(30 * BURN.PCT)), Math.max(1, Math.floor(MAX_HP * BURN.MAX_HP_PCT))),
  poison: () => Math.min(Math.max(1, Math.round(30 * POISON.PCT)), Math.max(1, Math.floor(MAX_HP * POISON.MAX_HP_PCT))),
};
/* The tag each source's event carries, and whether it is priced as elemental
   (Elem Resist reads it; P has no points, so it changes nothing here, and it
   is pinned by what the event says instead). */
const TAG = {
  swing: {}, snowball: {}, burrow: {}, boss: {},
  slam: { ability: 'slam' }, lunge: { ability: 'lunge' }, burst: { ability: 'burst' },
  fire: { ability: 'firetrail', elem: 'flame' }, shock: { ability: 'shock', elem: 'storm' },
  burn: { ability: 'burn', elem: 'flame' }, poison: { ability: 'poison', elem: 'venom' },
};
const ALL = Object.keys(SOURCES);
const BLOCKABLE = ['swing', 'snowball', 'burrow', 'slam', 'lunge', 'burst', 'boss'];
const face = (toward) => ({ m, ps }) => {
  ps.blocking = true; ps.blockStartT = Date.now() - 5000;
  const a = Math.atan2(m.y - ps.y, m.x - ps.x);
  ps.ba = toward ? a : a + Math.PI;
};

// ── 1. A landed hit ──
const landed = Object.create(null);
for (const src of ALL) {
  const r = play(src, 'out');
  landed[src] = r;
  const want = RAW[src]();
  check('1. ' + src + ': lands for its number (' + want + ')', r.hpLost === want && want > 0 && r.ev && r.ev.dmg === want && r.ev.dmgTaken === want, { hpLost: r.hpLost, want, ev: r.ev });
  check('1. ' + src + ': its event says who and where from, and the HP after', !!r.ev && r.ev.monsterId === M.id && r.ev.dodged === false && r.ev.hp === MAX_HP - want && !r.ev.blocked && r.ev.staminaDrain === undefined, r.ev);
  check('1. ' + src + ': its tag ' + JSON.stringify(TAG[src]), !!r.ev && (r.ev.ability || undefined) === TAG[src].ability && (r.ev.elem || undefined) === TAG[src].elem, r.ev);
  check('1. ' + src + ': the damage counts toward a melee kill\'s lifesteal', r.tracked === want, r.tracked);
  check('1. ' + src + ': the coalesced vitals save, never the whole character', r.saves.vitals >= 1 && r.saves.full === 0, r.saves);
}
{
  const at = place('out');
  const want = { swing: [at.mx, at.my], snowball: [at.px, at.py], burrow: [at.mx, at.my], slam: [at.mx, at.my], lunge: [at.mx, at.my], burst: [at.mx, at.my], boss: [at.mx, at.my], fire: [at.px, at.py], shock: [at.px + 60, at.py], burn: [at.px, at.py], poison: [at.px, at.py] };
  for (const src of ALL) {
    const e = landed[src].ev;
    /* the burrow's victim stood 10 px from the pile, not 30 */
    const w = src === 'burrow' ? [at.mx, at.my] : want[src];
    check('1. ' + src + ': attackerX/Y is ' + (src === 'snowball' ? 'where the ball landed' : src === 'shock' ? 'the player the storm struck' : src === 'fire' || src === 'burn' || src === 'poison' ? 'the burning player' : 'the monster'),
      !!e && Math.round(e.attackerX) === Math.round(w[0]) && Math.round(e.attackerY) === Math.round(w[1]), e && [e.attackerX, e.attackerY, w]);
  }
}

// ── 2. A roll (v2.3.3300: decision 4 -- no monster hit honoured one) ──
/* A roll slips the blows you can see coming, through the window the worker
   opened when it charged for the roll (movement.js _rollIFrames).  The pile
   grinds after you as long as you stand in it; fire, a storm's arc and a tick
   are no blow to slip. */
const ROLLS = { swing: true, snowball: true, burrow: false, slam: true, lunge: true, burst: true, boss: true, fire: false, shock: false, burn: false, poison: false };
const rolling = (kind) => ({ ps, now }) => { ps.dodging = true; room._rollStamp(ps, now, kind); };
for (const src of ALL) {
  const r = play(src, 'out', rolling('dodge'));
  if (ROLLS[src]) check('2. ' + src + ': a paid dodge slips it -- nothing taken, nothing sent, nothing charged', r.hpLost === 0 && r.stLost === 0 && r.evs.length === 0 && !r.stamped, { hpLost: r.hpLost, evs: r.evs });
  else check('2. ' + src + ': lands through a roll (' + (src === 'burrow' ? 'the pile grinds on' : 'no blow to slip') + ')', r.hpLost === landed[src].hpLost && r.hpLost > 0 && !!r.ev, r.hpLost);
}
{
  const lunge = play('swing', 'out', rolling('lunge'));
  check('2. swing: a paid lunge slips it too (it rolls on the dodge\'s i-frames)', lunge.hpLost === 0 && lunge.evs.length === 0, lunge.hpLost);
  const retreat = play('swing', 'out', rolling('retreat'));
  check('2. swing: a retreat shot\'s roll does not (no i-frames, §5.8.3: "the shot is the tradeoff for safety")', retreat.hpLost === landed.swing.hpLost, retreat.hpLost);
  const bare = play('swing', 'out', ({ ps }) => { ps.dodging = true; });
  check('2. swing: a bare claim, no roll paid for, buys nothing', bare.hpLost === landed.swing.hpLost, bare.hpLost);
  const over = play('swing', 'out', ({ ps, now }) => { ps.dodging = true; room._rollStamp(ps, now - 2000, 'dodge'); });
  check('2. swing: nor a paid roll whose window has run out', over.hpLost === landed.swing.hpLost, over.hpLost);
  const done = play('swing', 'out', ({ ps, now }) => { room._rollStamp(ps, now, 'dodge'); ps.dodging = false; });
  check('2. swing: nor a paid roll the phone says is over', done.hpLost === landed.swing.hpLost, done.hpLost);
  const flags0 = room._liveFlags;
  room._liveFlags = Object.assign(Object.create(null), flags0 || {}, { rollwindow: false });
  const trusted = play('swing', 'out', ({ ps }) => { ps.dodging = true; });
  check('2. swing: `rollwindow: false` (the PLAYERS\' way back to a trusted claim) never lets a bare claim slip a monster', trusted.hpLost === landed.swing.hpLost, trusted.hpLost);
  room._liveFlags = Object.assign(Object.create(null), flags0 || {}, { monsterroll: false });
  const off = play('swing', 'out', rolling('dodge'));
  check('2. swing: `monsterroll: false` -- no roll slips a monster\'s blow, as before v2.3.3300', off.hpLost === landed.swing.hpLost, off.hpLost);
  room._liveFlags = flags0;
}
{
  /* ...and the window and its kind come from the real message a phone sends
     (index.js _handleAbilityUse): a paid dodge slips, a paid retreat shot
     does not */
  const wsP = [...room.sessions.entries()].find(([, s]) => s.id === 'p1')[0];
  const pay = async (type) => {
    freshPlayer(P, P.z, P.x, P.y); P.stamina = MAX_ST;
    await room.webSocketMessage(wsP, JSON.stringify({ type: 'ability_use', payload: { type } }));
    return { until: P._rollUntil, kind: P._rollKind };
  };
  const as = (w) => ({ ps }) => { ps.dodging = true; ps._rollUntil = w.until; ps._rollKind = w.kind; };
  const dodge = await pay('dodge');
  const viaDodge = play('swing', 'out', as(dodge));
  check('2. swing: a dodge paid through ability_use slips it', dodge.until > Date.now() && dodge.kind === 'dodge' && viaDodge.hpLost === 0, { dodge, hpLost: viaDodge.hpLost });
  const retreat = await pay('retreat');
  const viaRetreat = play('swing', 'out', as(retreat));
  check('2. swing: a retreat shot paid through ability_use does not', retreat.until > Date.now() && retreat.kind === 'retreat' && viaRetreat.hpLost === landed.swing.hpLost, { retreat, hpLost: viaRetreat.hpLost });
}

// ── 3. The shield, facing it, held (v2.3.3300: decision 1, the two 15s are 10) ──
const COST = { swing: BLOCK_STAMINA_COST, snowball: 0, burrow: BLOCK_STAMINA_COST, slam: BLOCK_STAMINA_COST, lunge: BLOCK_STAMINA_COST, burst: BLOCK_STAMINA_COST, boss: BLOCK_STAMINA_COST };
for (const src of ALL) {
  const r = play(src, 'out', face(true));
  if (!BLOCKABLE.includes(src)) {
    check('3. ' + src + ': cannot be blocked', r.hpLost === landed[src].hpLost && !!r.ev && !r.ev.blocked && r.stLost === 0, { hpLost: r.hpLost, ev: r.ev });
    continue;
  }
  check('3. ' + src + ': blocked -- no HP, ' + COST[src] + ' stamina', r.hpLost === 0 && r.stLost === COST[src], { hpLost: r.hpLost, stLost: r.stLost });
  check('3. ' + src + ': the event says blocked' + (COST[src] ? ' and what it cost' : ', and no cost'), !!r.ev && r.ev.blocked === true && r.ev.dmgTaken === 0 && r.ev.staminaDrain === (COST[src] || undefined) && !r.ev.parried, r.ev);
  check('3. ' + src + ': the blocked event carries the monster\'s own damage', !!r.ev && r.ev.dmg === 30, r.ev && r.ev.dmg);
}
{
  const swing = play('swing', 'out', face(true)), boss = play('boss', 'out', face(true));
  const slam = play('slam', 'out', face(true)), burrow = play('burrow', 'out', face(true));
  const ball = play('snowball', 'out', face(true));
  const four = [swing, slam, burrow, boss];
  check('3. a blocked swing, slam, burrow touch or boss ability saves the pools (coalesced), and nothing else',
    four.every((r) => r.saves.pools === 1 && r.saves.full === 0 && r.saves.vitals === 0), four.map((r) => r.saves));
  check('3. the boss\'s block saves as the others do (v2.3.3300: decision 8, it wrote the whole character)', boss.saves.full === 0 && boss.saves.pools === 1, boss.saves);
  check('3. a blocked snowball saves nothing (it costs nothing)', ball.saves.full + ball.saves.pools === 0, ball.saves);
}

// ── 4. The shield, raised in time: the parry (v2.3.3300: decision 5, the pile and a boss too) ──
const PARRIES = { swing: true, snowball: false, burrow: true, slam: true, lunge: true, burst: true, boss: true };
for (const src of BLOCKABLE) {
  const r = play(src, 'out', ({ m, ps, now }) => {
    face(true)({ m, ps });
    ps.blockStartT = now - 50;   /* inside PARRY_WINDOW_MS */
  });
  if (PARRIES[src]) {
    check('4. ' + src + ': parried -- no HP, no cost, ' + room.PARRY_STAMINA_REWARD + ' stamina back, the parry event', r.hpLost === 0 && r.stLost === -Math.min(30, room.PARRY_STAMINA_REWARD) && !!r.ev && r.ev.parried === true && r.ev.blocked === true && r.parryEvent, { stLost: r.stLost, ev: r.ev, parry: r.parryEvent });
  } else {
    check('4. ' + src + ': no parry -- the shield\'s ordinary cost (' + COST[src] + ')', r.hpLost === 0 && r.stLost === COST[src] && !!r.ev && !r.ev.parried && !r.parryEvent, { stLost: r.stLost, ev: r.ev });
  }
}

// ── 5. The shield, facing away ──
/* v2.3.3300: decision 2 -- the snowball too.  It took TWO shield tests: the
   impact's own from the thrower (free), and a second measured from where it
   LANDED, the player's own feet, which a zero-length direction always passed
   (_blockArcCovers) -- so a shield raised any way blocked it, at 15.
   v2.3.1705 meant "a snowball you never turned to face should get through
   exactly like a swing from behind does"; the owner: "yes blocking should be
   directional". */
for (const src of BLOCKABLE) {
  const r = play(src, 'out', face(false));
  check('5. ' + src + ': a shield facing away does not stop it', r.hpLost === landed[src].hpLost && r.stLost === 0 && !!r.ev && !r.ev.blocked && r.ev.staminaDrain === undefined, { hpLost: r.hpLost, stLost: r.stLost, ev: r.ev });
}

// ── 6. Harvesting (cooking: the shield needs no node) ──
/* v2.3.3300: decision 3 -- every monster blow (v2.3.1704: "A HARVESTER TAKES
   NO MONSTER DAMAGE, FULL STOP"); the slam, the lunge, the slime burst, a
   boss and fire on the ground still hit one */
for (const src of ALL) {
  const r = play(src, 'out', ({ ps, now }) => { ps.ex = 'cook'; ps._exAt = now; ps._exX = ps.x; ps._exY = ps.y; });
  check('6. ' + src + ': leaves a harvester alone -- nothing taken, nothing sent', r.hpLost === 0 && r.evs.length === 0, { hpLost: r.hpLost, evs: r.evs });
}

// ── 7. The Wheel's safe ground (not provoked) ──
for (const src of ALL.filter((s) => s !== 'boss')) {
  const r = play(src, 'safe', ({ ps }) => { /* the burrow touches at 10 px */ if (src === 'burrow') ps.x = M.x + 10; });
  check('7. ' + src + ': leaves you alone on the safe ground -- nothing taken, nothing sent', r.hpLost === 0 && r.evs.length === 0, { hpLost: r.hpLost, evs: r.evs });
}
{
  /* ...unless you provoked it: hurt it, and still fighting (v2.3.3056) */
  const r = play('swing', 'safe', ({ m, ps, now }) => { m.dmgByPlayer.p1 = 5; ps._lastDealtAt = now; });
  check('7. swing: a monster you provoked from the safe ground still reaches you', r.hpLost === landed.swing.hpLost, r.hpLost);
}

// ── 8. A rock in the way (Frost's snowbank between them) ──
{
  /* the swing is a snowman's here, for its reach (see place('rock')); the
     pile is left out: its touch (BURROW.CONTACT_PX 40 on the same 1.5
     stretch) is shorter than the bank is deep, so no rock can stand inside
     it -- the burrow is asked about rocks all the same (_monsterStrikePlayer) */
  /* v2.3.3300: decision 7 -- every blow that travels; the kits, the burst
     and a boss went through */
  const snowmanSwing = ({ m }) => { m.arch = 'snowman'; };
  for (const src of ['swing', 'snowball', 'slam', 'lunge', 'burst', 'boss']) {
    const r = play(src, 'rock', src === 'swing' ? snowmanSwing : null);
    check('8. ' + src + ': a rock between stops it -- nothing taken, nothing sent', r.hpLost === 0 && r.evs.length === 0, { hpLost: r.hpLost, evs: r.evs });
  }
  {
    /* ...a slam or lunge that a rock stopped (or a roll slipped) is drawn as
       the MISS a whiff is: its execute says hit: false */
    const exec = () => room.eventBuffer.find((e) => e.type === 'monster_ability' && e.payload.phase === 'execute');
    const covered = play('slam', 'rock'); const e1 = exec();
    const rolled = play('slam', 'out', rolling('dodge')); const e2 = exec();
    const struck = play('slam', 'out'); const e3 = exec();
    check('8. slam: behind a rock or through a roll its execute says hit: false (a MISS); one that lands, hit: true',
      covered.hpLost === 0 && rolled.hpLost === 0 && struck.hpLost > 0 && !!e1 && e1.payload.hit === false && !!e2 && e2.payload.hit === false && !!e3 && e3.payload.hit === true,
      [e1 && e1.payload.hit, e2 && e2.payload.hit, e3 && e3.payload.hit]);
  }
  {
    /* ...and the swing really was in reach: the same two, nothing between */
    const clear = play('swing', 'rock', ({ m, ps }) => { snowmanSwing({ m }); m.x += 400; ps.x += 400; });
    check('8. swing: the same two with no rock between -- it lands', clear.hpLost === landed.swing.hpLost, clear.hpLost);
  }
  /* v2.3.3300: the rock is asked FIRST: a raised shield no longer pays for a
     swing the rock stopped (it was asked only of a blow that got past the
     shield, and the shield cost 10 for a blow that could not reach) */
  for (const src of ['swing', 'slam', 'boss']) {
    const shielded = play(src, 'rock', (o) => { if (src === 'swing') snowmanSwing(o); face(true)(o); });
    check('8. ' + src + ': behind a rock, a shield facing it pays nothing -- the rock is asked first', shielded.hpLost === 0 && shielded.stLost === 0 && shielded.evs.length === 0, { stLost: shielded.stLost, evs: shielded.evs });
  }
}

// ── 9. The one-hit rail and death; a block that counts; thorns; curse; element ──
{
  const CAP = { slam: TELEGRAPH.MAX_HIT_PCT, lunge: TELEGRAPH.MAX_HIT_PCT, burst: TELEGRAPH.MAX_HIT_PCT, boss: BOSS_ABILITIES.MAX_HIT_PCT, fire: 0.5, shock: SHOCK.MAX_HP_PCT, burn: BURN.MAX_HP_PCT, poison: POISON.MAX_HP_PCT };
  for (const src of ALL) {
    /* a huge blow on a small bar: the rail decides who lives */
    deaths.length = 0;
    const r = play(src, 'out', ({ m, ps }) => { m.dmg = 100000; m.level = 60; ps.maxHp = 40; ps.hp = 40; });
    if (CAP[src] != null) {
      const cap = Math.max(1, Math.floor(40 * CAP[src]));
      check('9. ' + src + ': no one-shot -- at most ' + cap + ' of a 40 bar', r.hpLost === cap && !r.dying, { hpLost: r.hpLost, cap, dying: r.dying });
    } else {
      check('9. ' + src + ': no rail (today) -- the whole bar, and the death path, put down to the monster', r.hpLost === 40 && r.dying && deaths.length === 1 && deaths[0].pid === 'p1' && deaths[0].cause === 'monster:' + M.id, { hpLost: r.hpLost, dying: r.dying, deaths });
    }
  }
  /* a lethal blow from every source is put down to the monster that dealt it
     (the patch's and the burn's own goblin): a 1-HP player */
  for (const src of ALL) {
    deaths.length = 0;
    const r = play(src, 'out', ({ ps }) => { ps.hp = 1; });
    check('9. ' + src + ': a killing blow goes through the death path as monster:<its id>', r.dying && deaths.length === 1 && deaths[0].cause === 'monster:' + M.id, deaths);
  }
  /* v2.3.3300: decision 9 -- a block is a block: the pile's no longer counts
     as a HIT of 0 (it marked you as hit, and the out-of-combat regen waited) */
  for (const src of BLOCKABLE) {
    const r = play(src, 'out', face(true));
    check('9. ' + src + ': a blocked one is not counted as being hit', r.stamped === false, r.stamped);
  }

  /* Flora's thorn on the monster answers its swing and its ball -- a blow that
     LANDED -- and nothing else.
     The pile is asked too, and is invulnerable while it is one, so it takes
     nothing (telegraph.js: the bonk strikes "before the surface on purpose") */
  const thorny = ({ m }) => { m.statuses = { thorn: { power: 40, sourceId: 'p0', until: Date.now() + 10000 } }; };
  const recoil = Math.round(4 + 40 * 0.25);
  const THORN_ON = { swing: true, snowball: true, burrow: false, slam: false, lunge: false, boss: false };
  for (const src of Object.keys(THORN_ON)) {
    const r = play(src, 'out', thorny);
    check('9. ' + src + ': thorn ' + (THORN_ON[src] ? 'answers a landed one (' + recoil + ')' : src === 'burrow' ? 'meets an invulnerable pile' : 'does nothing (today)'), r.monsterLost === (THORN_ON[src] ? recoil : 0), r.monsterLost);
  }
  {
    const held = play('swing', 'out', (o) => { thorny(o); face(true)(o); });
    const heldBall = play('snowball', 'out', (o) => { thorny(o); face(true)(o); });
    const behindBall = play('snowball', 'out', (o) => { thorny(o); face(false)(o); });
    check('9. thorn: a swing or ball the shield stopped is not answered; a ball from behind lands, and is', held.monsterLost === 0 && heldBall.monsterLost === 0 && behindBall.monsterLost === recoil, [held.monsterLost, heldBall.monsterLost, behindBall.monsterLost]);
  }
  /* the hexer's curse: its swing that lands curses you, a held block does not */
  {
    const hex = ({ m }) => { m.arch = 'hexer'; };
    const r = play('swing', 'out', hex);
    const blocked = play('swing', 'out', (o) => { hex(o); face(true)(o); });
    check('9. hexer: a landed swing curses you, one your shield stops does not', r.cursed && !blocked.cursed, [r.cursed, blocked.cursed]);
  }
  /* the element: a frost monster's own blow chills (the swing, the ball, the
     pile, the kits), a boss's and a patch's do not */
  const CHILLS = { swing: true, snowball: true, burrow: true, slam: true, lunge: true, boss: false };
  for (const src of Object.keys(CHILLS)) {
    const r = play(src, 'out', ({ m }) => { m.element = 'frost'; });
    check('9. ' + src + ': a frost monster\'s blow ' + (CHILLS[src] ? 'chills you' : 'does not chill (today)'), r.chilled === CHILLS[src] && (CHILLS[src] ? !!r.ev && r.ev.st === 'chill' && r.ev.elem === 'frost' : !r.ev.st), { chilled: r.chilled, ev: r.ev });
  }
}

// ── 10. v2.3.3296: the door itself (src/hits.js) ──
/* Added with the door; §1-§9 above are the table it had to keep, unchanged. */
{
  const { MONSTER_HITS } = await import('../src/hits.js');
  const { readdirSync, readFileSync } = await import('node:fs');
  /* 10a. every way of being hit measured above is one row of the door's
     table, and every row of the table is measured above */
  const ROW_OF = { swing: 'swing', snowball: 'snowball', burrow: 'pile', slam: 'kit', lunge: 'kit', burst: 'burst', boss: 'boss', fire: 'fire', shock: 'shock', burn: 'burn', poison: 'poison' };
  const rows = Object.keys(MONSTER_HITS);
  check('10a. each source above has its row in MONSTER_HITS', ALL.every((src) => rows.includes(ROW_OF[src])), { rows });
  check('10a. ...and each row of MONSTER_HITS is measured above', rows.every((r) => Object.values(ROW_OF).includes(r)), { rows });
  /* 10b. every cell from its closed set, so a typo cannot silently mean "no" */
  const oneOf = (v, set) => set.includes(v);
  /* v2.3.3300: the block's `counts` and `save`, the row's `wrongWay` and the
     sight's 'after-shield' went with the decisions that made them unused */
  const okBlock = (b) => b === null || (typeof b === 'object' && Object.isFrozen(b) && typeof b.cost === 'number' && b.cost >= 0
    && typeof b.parry === 'boolean' && typeof b.thorns === 'boolean'
    && Object.keys(b).every((k) => ['cost', 'parry', 'thorns'].includes(k)));
  const bad = rows.filter((r) => {
    const R = MONSTER_HITS[r];
    return !(Object.isFrozen(R) && oneOf(R.shield, [null, 'door', 'tick']) && oneOf(R.shelter, [null, 'door', 'tick'])
      && typeof R.roll === 'boolean' && oneOf(R.sight, [null, 'door', 'flight'])
      && okBlock(R.block)
      && typeof R.rail === 'number' && R.rail >= 0 && R.rail < 1 && typeof R.elemental === 'boolean'
      && oneOf(R.own, [null, 'contact', 'elem'])
      && typeof R.soak === 'boolean'   /* v2.3.3518: a soak on the monster softens it (gem-weight.test) */
      && Object.keys(R).every((k) => ['shield', 'shelter', 'roll', 'sight', 'block', 'rail', 'elemental', 'own', 'soak'].includes(k)));
  });
  check('10b. every cell of every row is one the door reads', bad.length === 0, bad);
  check('10b. the table cannot be changed at run time', Object.isFrozen(MONSTER_HITS));
  /* 10c. a blow the shield STOPPED says the bar it left (unchanged): the phone
     reads an event without `hp` as an older worker's and floated the hit's
     whole number over another player who had blocked it */
  for (const src of BLOCKABLE) {   /* v2.3.3300: the pile's block too, no longer a hit of 0 */
    const r = play(src, 'out', face(true));
    check('10c. ' + src + ': a stopped block\'s event carries the bar (' + MAX_HP + ')', !!r.ev && r.ev.blocked === true && r.ev.hp === MAX_HP, r.ev);
  }
  /* 10d. ONE DOOR: in server/src only three files price a hit on a player --
     hits.js every monster's, combat.js a player's claim, pvpextras.js a
     player's extras.  A new way for a monster to hurt you goes through
     _monsterHit with its own row, or it fails here. */
  const dir = new URL('../src/', import.meta.url);
  const callers = readdirSync(dir).filter((f) => f.endsWith('.js'))
    .filter((f) => /this\._applyDamage\(/.test(readFileSync(new URL(f, dir), 'utf8')));
  check('10d. only hits.js, combat.js and pvpextras.js call _applyDamage', callers.sort().join(',') === 'combat.js,hits.js,pvpextras.js', callers);
  /* 10e. a row the table does not have hits nobody */
  {
    const now = Date.now();
    play('swing', 'out');   /* a fresh stage */
    room.eventBuffer.length = 0;
    const hp0 = P.hp;
    const got = room._monsterHit({ src: 'constructor', zoneId: WHEEL_ZONE, pid: 'p1', m: M, mid: M.id, lvl: 5, raw: 30, at: { x: M.x, y: M.y }, now });
    check('10e. an unknown row (even an Object.prototype name) takes nothing and sends nothing', got === 0 && P.hp === hp0 && room.eventBuffer.length === 0, { got, hp: P.hp });
  }
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
