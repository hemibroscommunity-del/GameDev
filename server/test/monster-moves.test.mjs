/* MONSTER MOVES -- v2.3.3946 (server/src/monstermoves.js; spec
 * docs/specs/monster-moves.md).
 *
 * The owner, 2026-11-02: "Make next tier monsters noticeably harder.  Develop
 * combo / specific ability system to make them harder to beat."
 *   1. UNLOCKED BY TIER: tier 1 nothing; tier 2 a combo; tiers 3-4 a second
 *      move (a volley, a charge, a two-step slam); tiers 5-6 an area slam;
 *      7-8 enrage -- for every family the Wheel spawns; the first stretch's
 *      monsters have none, every deeper one has its tier's.
 *   2. READABLE: every warning at least 600 ms, 800 for the big hits; a
 *      combo's second strike on the ground from the start.
 *   3. THE COMBO: wound up, braced, two strikes a gap apart, its cooldown and
 *      the gap after it; a parry breaks the second strike, a stun the whole
 *      move, the switch thrown mid-move ends it quietly.
 *   4. EVERY HIT THROUGH THE ONE DOOR (hits.js _monsterHit), its own row; the
 *      no-one-shot rail.
 *   5. THE CHARGE: its lane, its dash, each player once, never onto safe
 *      ground.
 *   6. THE VOLLEY: three balls in a fan, landing where the fan drew them; a
 *      shield facing the thrower blocks one free.
 *   7. THE SLAMS: the two-step's small ring then its big one; the quake's ring
 *      reaches everyone in it.
 *   8. ENRAGE: an elder under 30%: faster swings, shorter cooldowns, announced
 *      once a life; tiers 7-8 cool 20% faster at any HP; the phone's rule
 *      (src/game/monsterMoves.js) is the worker's.
 *   9. THE STAT STEP: +10% HP and +8% hit a tier past the first, once.
 *  10. THE SWITCHES: `monstermoves` all of it, one a kind, and the cap.
 *  11. TIER 1 UNCHANGED: no move, a kit's own cooldown, no gap.
 *  12. WRITES: a move stores nothing; a whiffed one writes no row.
 */
import { GameRoom } from '../src/index.js';
import { WHEEL_ZONE } from '../src/wheelzone.js';
import { WHEEL_CENTRE, WHEEL_SAFE_R } from '../src/wheelspawns.js';
import { TELEGRAPH } from '../src/telegraph.js';
import { MONSTER_HITS } from '../src/hits.js';
import { ZONES } from '../src/data.js';
import { MOVE_DEFS, MONSTER_MOVES, FAMILY_MOVES, familyOf, familyMoves, moveTier } from '../src/monstermoves.js';
import { noteMoveCaps, monsterEnragedLook, moveTierOf, moveGeometry, volleyBalls, enrageTint } from '../../src/game/monsterMoves.js';

let NOW = 1_800_000_000_000;
Date.now = () => NOW;
Math.random = () => 0.999;   /* every blow a sure one (the dodge roll) */

let puts = 0;
const mockState = {
  storage: { get: async () => undefined, put: async () => { puts++; }, list: async () => new Map(), delete: async () => {} },
  getWebSockets: () => [], acceptWebSocket: () => {},
};
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs(label) { return { label, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + ' ' + JSON.stringify(detail === undefined ? {} : detail)); }
}

const room = new GameRoom(mockState, mockEnv);
const sockets = Object.create(null);
for (const id of ['p1', 'p2']) {
  const ws = fakeWs(id);
  sockets[id] = ws;
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: id, protocolVersion: 2, ws: [1, 5], data: { x: 1000, y: 1000, z: 'town' } }));
}
const P = room.playerState.p1, Q = room.playerState.p2;
const MAX_HP = P.maxHp, MAX_ST = P.maxStamina;
const wheel = room._ensureZoneMonsters(WHEEL_ZONE);
check('setup: two players, the Wheel\'s monsters', !!P && !!Q && wheel.length > 100);

/* the moves' events in the buffer */
const abil = (kind, phase) => room.eventBuffer.filter((e) => e.type === 'monster_ability' && e.payload.ability === kind && (!phase || e.payload.phase === phase)).map((e) => e.payload);
const hitsOn = (pid) => room.eventBuffer.filter((e) => e.type === 'monster_attack' && e.payload.targetId === pid).map((e) => e.payload);

function fresh(ps, x, y) {
  ps.z = WHEEL_ZONE; ps.x = x; ps.y = y;
  ps.dead = false; ps.dying = false; ps.disconnected = false;
  ps.maxHp = MAX_HP; ps.hp = MAX_HP; ps.maxStamina = MAX_ST; ps.stamina = MAX_ST - 30;
  ps.blocking = false; ps.ba = undefined; ps.blockStartT = 0; ps.dodging = false; ps._rollUntil = 0; ps._rollKind = null;
  ps.ex = null; ps._exAt = 0; ps._zoneEntryGraceUntil = 0; ps._godUntil = 0; ps.lastDamageAt = 0; ps._lastDealtAt = 0;
  ps.dmgFromMonster = {}; ps._chillUntil = 0; ps._soakUntil = 0; ps._gustLeft = 0; ps._gustUntil = 0;
  ps._stuckUntil = 0; ps._dazeUntil = 0; ps._dazeImmuneUntil = 0; ps._stuckImmuneUntil = 0; ps._cursedUntil = 0;
}
/* a monster of the Wheel's, out on its land, alone, with the players beside it
   (and nobody else's blow in the way: the others are taken off the Wheel) */
function stage(home, tier, opts) {
  const o = opts || {};
  const m = wheel.find((x) => x.home === home && (tier === 1 ? !x.tier : x.tier === tier) && (!o.arch || x.arch === o.arch));
  if (!m) throw new Error('no ' + home + ' tier ' + tier);
  /* a spot well off the safe ground, along its spoke */
  const ux = m.spawnX - WHEEL_CENTRE[0], uy = m.spawnY - WHEEL_CENTRE[1], ul = Math.hypot(ux, uy);
  const r = Math.max(WHEEL_SAFE_R + 600, ul);
  const x = WHEEL_CENTRE[0] + (ux / ul) * r, y = WHEEL_CENTRE[1] + (uy / ul) * r;
  m.alive = true; m.x = x; m.y = y; m.hp = m.maxHp; m.statuses = Object.create(null);
  m.dmg = o.dmg || 30; m.atkCd = 0; m._attackingUntil = 0; m._stunUntil = 0;
  m._bwUntil = 0; m._bwTarget = null; m._bwKind = null;
  m._tgPhase = null; m._tgUntil = 0; m._tgNextAt = NOW + 1e9; m._tgAim = null; m._tgTarget = null;
  m._burPhase = null; m._burCd = NOW + 1e9; m._burstUntil = 0; m._projImpactAt = 0;
  m.dmgByPlayer = Object.create(null);
  room._clearMonsterMove(m);
  room.monsters[WHEEL_ZONE] = [m];
  fresh(P, x + (o.px != null ? o.px : 60), y + (o.py || 0));
  fresh(Q, x + 2000, y + 2000);   /* out of the way unless a case places it */
  room.eventBuffer.length = 0;
  return m;
}
/* run the move's resolve on the clock until it ends (or `ms` pass) */
function runMove(m, ms) {
  const end = NOW + (ms || 5000);
  while (m._mvPhase && NOW < end) { NOW += room.TICK_RATE; room._resolveMonsterMove(WHEEL_ZONE, m, NOW); }
}
const nearest = (ps, id) => ({ id, x: ps.x, y: ps.y, extracting: false });

// ── 1. Unlocked by tier ──
{
  const ORDER = { 2: ['combo'], 3: null, 5: 'quake', 7: 'enrage' };
  let ok = true, why = null;
  for (const fam of Object.keys(FAMILY_MOVES)) {
    const list = familyMoves(fam);
    const at = (t) => list.filter((mv) => mv.tier <= t).map((mv) => mv.kind);
    const second = list.find((mv) => mv.tier === 3);
    const want = {
      1: [], 2: ['combo'], 3: ['combo', second && second.kind], 4: ['combo', second && second.kind],
      5: ['combo', second && second.kind, 'quake'], 6: ['combo', second && second.kind, 'quake'],
      7: ['combo', second && second.kind, 'quake', 'enrage'], 8: ['combo', second && second.kind, 'quake', 'enrage'],
    };
    for (let t = 1; t <= 8; t++) {
      const got = at(t).slice().sort().join(','), w = want[t].slice().sort().join(',');
      if (got !== w) { ok = false; why = { fam, t, got, w }; }
    }
    if (!second || !['volley', 'charge', 'stomp'].includes(second.kind)) { ok = false; why = { fam, second }; }
  }
  void ORDER;
  check('1. every family: tier 1 nothing, 2 a combo, 3-4 a second move, 5-6 an area slam, 7-8 enrage', ok, why);
  check('1. the snowman\'s second is the Snow Volley; a goblin\'s a charge; a rock monster\'s the two-step slam',
    familyMoves('snowman').find((mv) => mv.tier === 3).kind === 'volley' && familyMoves('snowman').find((mv) => mv.tier === 3).name === 'Snow Volley'
    && familyMoves('goblin').find((mv) => mv.tier === 3).kind === 'charge' && familyMoves('rock').find((mv) => mv.tier === 3).kind === 'stomp');
  check('1. the slime\'s signature is a double lunge', familyMoves('slime')[0].name === 'Double Lunge' && familyMoves('slime')[0].kind === 'combo');
  /* every kind of monster the Wheel spawns has a family */
  const homes = ['frost', 'ember', 'sky', 'hollows', 'thunder', 'tidal', 'mist', 'verdant'];
  const fams = [];
  for (const h of homes) for (const sp of ZONES[h].spawns) fams.push([h, sp.arch, familyOf({ arch: sp.arch, element: ZONES[h].element })]);
  check('1. every spawn of the eight lands is of a family', fams.every((f) => !!f[2]), fams);
  check('1. ...the right one', JSON.stringify(fams.map((f) => f[2])) === JSON.stringify(['snowman', 'goblin', 'mummy', 'mummy', 'mummy', 'rock', 'slime', 'fishman', 'slime', 'lurker', 'slime']), fams);
  check('1. a swarm has none (the kits\' rule)', familyOf({ arch: 'swarm', element: 'wind' }) === null);
  /* the Wheel itself */
  const first = wheel.filter((m) => !m.tier), deep = wheel.filter((m) => m.tier >= 2);
  check('1. the first stretch\'s monsters have no move (tier 1)', first.length > 0 && first.every((m) => moveTier(m) === 1 && room._movesFor(m).length === 0));
  check('1. every deeper monster has its tier\'s', deep.length > 0 && deep.every((m) => {
    const k = room._movesFor(m).map((mv) => mv.tier);
    return k.length >= 1 && Math.max(...k) <= m.tier && k.includes(2);
  }));
}

// ── 2. Readable ──
{
  let ok = true, why = null;
  for (const fam of Object.keys(FAMILY_MOVES)) {
    for (const mv of familyMoves(fam)) {
      if (mv.kind === 'enrage') continue;
      const big = mv.dmgMult >= 1.5 || mv.kind === 'quake' || mv.kind === 'stomp' || mv.kind === 'charge';
      if (!(mv.windupMs >= 600) || (big && !(mv.windupMs >= 800))) { ok = false; why = { fam, kind: mv.kind, windupMs: mv.windupMs, big }; }
      if (!(mv.cooldownMs >= 4000)) { ok = false; why = { fam, kind: mv.kind, cooldownMs: mv.cooldownMs }; }
      if (!MONSTER_HITS[mv.row]) { ok = false; why = { fam, kind: mv.kind, row: mv.row }; }
    }
  }
  check('2. every warning at least 600 ms, 800 for a big hit (a slam, a charge, x1.5 or more); every cooldown 4 s or more; every row in the door', ok, why);
}

// ── 3. The combo ──
{
  const m = stage('hollows', 2);
  check('3. (setup) a tier-2 rock monster with a combo', familyOf(m) === 'rock' && room._movesFor(m).map((mv) => mv.kind).join() === 'combo');
  const started = room._maybeStartMove(WHEEL_ZONE, m, nearest(P, 'p1'), NOW);
  const tg = abil('combo', 'telegraph')[0];
  const C = MOVE_DEFS.combo;
  check('3. in reach, it starts its combo: one warning, round itself, the whole combo long (the second strike on the ground from the start)',
    started && !!tg && tg.ms === C.windupMs + C.gapMs && tg.radius === C.radius && tg.follow === 1 && tg.n === 2 && tg.ax === Math.round(m.x), tg);
  check('3. braced while it winds up (a sword does not shove it out of its own ring)', room._moveBraced(m) === true);
  NOW += C.windupMs - 50;
  const owned = room._resolveMonsterMove(WHEEL_ZONE, m, NOW);
  check('3. nothing lands before the wind-up ends, and the monster is planted', owned && P.hp === MAX_HP && m._attackingUntil > NOW);
  NOW += 60;
  room._resolveMonsterMove(WHEEL_ZONE, m, NOW);
  const h1 = hitsOn('p1');
  check('3. the first strike lands (its row\'s tag), and the second waits its gap', h1.length === 1 && h1[0].ability === 'combo' && h1[0].dmgTaken === 30 && m._mvPhase === 'strike', { h1, ph: m._mvPhase });
  const tStrike1 = NOW;
  NOW += C.gapMs - 30;
  room._resolveMonsterMove(WHEEL_ZONE, m, NOW);
  check('3. ...no second strike inside the gap', hitsOn('p1').length === 1);
  NOW += 40;
  room._resolveMonsterMove(WHEEL_ZONE, m, NOW);
  const ex = abil('combo', 'execute');
  check('3. the second strike lands, two executes (each says it hit), and the combo is done',
    hitsOn('p1').length === 2 && ex.length === 2 && ex.every((e) => e.hit === true) && m._mvPhase === null && P.hp === MAX_HP - 60, { n: hitsOn('p1').length, ex, ph: m._mvPhase });
  check('3. its cooldown, the gap before any other special, the swing\'s cadence restarted',
    m._mvCd.combo === NOW + C.cooldownMs && m._mvGapAt === NOW + MONSTER_MOVES.GAP_MS && m.atkCd >= NOW + 1500 && NOW - tStrike1 >= C.gapMs);
  m.atkCd = 0;
  check('3. no combo again inside its cooldown', room._maybeStartMove(WHEEL_ZONE, m, nearest(P, 'p1'), NOW + 2000) === false && room._maybeStartMove(WHEEL_ZONE, m, nearest(P, 'p1'), NOW + C.cooldownMs - 10) === false);
  check('3. ...and again after it', room._maybeStartMove(WHEEL_ZONE, m, nearest(P, 'p1'), NOW + C.cooldownMs + 10) === true);
  /* out of reach: no combo */
  const m2 = stage('hollows', 2, { px: C.maxR + 30 });
  check('3. a target out of its reach starts nothing', room._maybeStartMove(WHEEL_ZONE, m2, nearest(P, 'p1'), NOW) === false);
  /* walked out of the ring before it lands: a MISS */
  const m3 = stage('hollows', 2);
  room._maybeStartMove(WHEEL_ZONE, m3, nearest(P, 'p1'), NOW);
  P.x = m3.x + C.radius + 40;
  runMove(m3);
  check('3. a player who stepped out of the ring is missed, both strikes say so', hitsOn('p1').length === 0 && abil('combo', 'execute').length === 2 && abil('combo', 'execute').every((e) => e.hit === false));
  /* a parry on the first strike breaks the second */
  const m4 = stage('hollows', 2);
  room._maybeStartMove(WHEEL_ZONE, m4, nearest(P, 'p1'), NOW);
  NOW += C.windupMs;
  P.blocking = true; P.ba = Math.atan2(m4.y - P.y, m4.x - P.x); P.blockStartT = NOW - 50;
  room._resolveMonsterMove(WHEEL_ZONE, m4, NOW);
  P.blocking = false;
  runMove(m4);
  const par = hitsOn('p1');
  check('3. a parried first strike breaks the combo: no second strike, its cooldown taken',
    par.length === 1 && par[0].parried === true && abil('combo', 'execute').length === 1 && m4._mvPhase === null && m4._mvCd.combo > NOW, { par, ex: abil('combo', 'execute') });
  /* a stun mid-wind-up breaks it */
  const m5 = stage('hollows', 2);
  room._maybeStartMove(WHEEL_ZONE, m5, nearest(P, 'p1'), NOW);
  m5._stunUntil = NOW + 800;
  NOW += 50;
  room._resolveMonsterMove(WHEEL_ZONE, m5, NOW);
  runMove(m5);
  check('3. a stun (a shield bash) mid-wind-up breaks the move: nothing lands', hitsOn('p1').length === 0 && m5._mvPhase === null);
  /* the switch thrown mid-move */
  const m6 = stage('hollows', 2);
  room._maybeStartMove(WHEEL_ZONE, m6, nearest(P, 'p1'), NOW);
  room._liveFlags = { monstercombo: false };
  runMove(m6);
  room._liveFlags = {};
  check('3. `monstercombo: false` thrown mid-wind-up ends it quietly: no strike, not planted', hitsOn('p1').length === 0 && m6._mvPhase === null && abil('combo', 'execute').length === 0);
  /* a monster killed mid-combo comes back with nothing in hand */
  const m7 = stage('hollows', 2);
  room._maybeStartMove(WHEEL_ZONE, m7, nearest(P, 'p1'), NOW);
  room._clearMonsterMove(m7);
  check('3. a fresh life (the respawn\'s reset) has no move in flight, no cooldown, no enrage cue', m7._mvPhase === null && m7._mvCd === null && m7._enrageCued === false);
}

// ── 4. Every hit through the one door ──
{
  const rows = [];
  let inDoor = 0, outside = 0;
  const realHit = room._monsterHit, realDmg = room._applyDamage;
  room._monsterHit = function (h) { rows.push(h.src); inDoor++; try { return realHit.call(this, h); } finally { inDoor--; } };
  room._applyDamage = function (...a) { if (!inDoor) outside++; return realDmg.apply(this, a); };
  const cases = [
    ['combo', () => { const m = stage('hollows', 2); room._maybeStartMove(WHEEL_ZONE, m, nearest(P, 'p1'), NOW); runMove(m); }],
    ['stomp', () => { const m = stage('hollows', 3, { px: 60 }); m._mvCd = Object.create(null); m._mvCd.combo = NOW + 1e9; room._maybeStartMove(WHEEL_ZONE, m, nearest(P, 'p1'), NOW); runMove(m); }],
    ['charge', () => { const m = stage('ember', 3, { px: 200 }); m._mvCd = Object.create(null); m._mvCd.combo = NOW + 1e9; room._maybeStartMove(WHEEL_ZONE, m, nearest(P, 'p1'), NOW); runMove(m); }],
    ['volley', () => { const m = stage('frost', 3, { px: 200 }); m._mvCd = Object.create(null); m._mvCd.combo = NOW + 1e9; room._maybeStartMove(WHEEL_ZONE, m, nearest(P, 'p1'), NOW); runMove(m); }],
    ['quake', () => { const m = stage('hollows', 5, { px: 60 }); m._mvCd = Object.create(null); m._mvCd.combo = NOW + 1e9; m._mvCd.stomp = NOW + 1e9; room._maybeStartMove(WHEEL_ZONE, m, nearest(P, 'p1'), NOW); runMove(m); }],
  ];
  const ROW = { combo: 'combo', stomp: 'quake', charge: 'charge', volley: 'volley', quake: 'quake' };
  for (const [kind, run] of cases) {
    rows.length = 0;
    run();
    const took = MAX_HP - P.hp;
    check('4. ' + kind + ': it lands, every blow through the door\'s `' + ROW[kind] + '` row', took > 0 && rows.length > 0 && rows.every((r) => r === ROW[kind]), { took, rows });
  }
  check('4. no move prices a hit outside the door', outside === 0, outside);
  room._monsterHit = realHit; room._applyDamage = realDmg;
  /* the rail: a huge blow on a small bar takes half of it, at most */
  const m = stage('hollows', 5, { dmg: 100000 });
  P.maxHp = 40; P.hp = 40;
  m._mvCd = Object.create(null); m._mvCd.combo = NOW + 1e9; m._mvCd.stomp = NOW + 1e9;
  room._maybeStartMove(WHEEL_ZONE, m, nearest(P, 'p1'), NOW);
  NOW += MOVE_DEFS.quake.windupMs + 5;
  room._resolveMonsterMove(WHEEL_ZONE, m, NOW);
  check('4. no one-shot: a quake of 100,000 takes half of a 40 bar', P.hp === 40 - Math.floor(40 * TELEGRAPH.MAX_HIT_PCT) && !P.dying, { hp: P.hp });
}

// ── 5. The charge ──
{
  const D = MOVE_DEFS.charge;
  const m = stage('ember', 3, { px: 200 });
  check('5. (setup) a tier-3 fire goblin with a charge', familyOf(m) === 'goblin' && room._movesFor(m).some((mv) => mv.kind === 'charge'));
  m._mvCd = Object.create(null); m._mvCd.combo = NOW + 1e9;
  const x0 = m.x, y0 = m.y;
  room._maybeStartMove(WHEEL_ZONE, m, nearest(P, 'p1'), NOW);
  const tg = abil('charge', 'telegraph')[0];
  const len = Math.max(D.minLen, Math.min(D.maxLen, 200 + D.past));
  check('5. its lane: from it, through its target and on, drawn as a line its width', !!tg && tg.shape === 'line' && tg.w === D.laneW && tg.ms === D.windupMs
    && tg.bx === Math.round(x0 + len) && tg.by === Math.round(y0) && tg.ax === Math.round(x0), tg);
  /* a second player beside the lane, out of it */
  fresh(Q, x0 + 120, y0 + D.laneW + 30);
  runMove(m);
  check('5. it dashes the lane to its end', Math.abs(m.x - (x0 + len)) < 2 && Math.abs(m.y - y0) < 2, { x: m.x - x0, len });
  check('5. the one on its lane is hit once, the one beside it never', hitsOn('p1').length === 1 && hitsOn('p2').length === 0, { p1: hitsOn('p1').length, p2: hitsOn('p2').length });
  check('5. its execute says it hit, where it ended', abil('charge', 'execute').length === 1 && abil('charge', 'execute')[0].hit === true);
  /* stepped off the lane in time */
  const m2 = stage('ember', 3, { px: 200 });
  m2._mvCd = Object.create(null); m2._mvCd.combo = NOW + 1e9;
  room._maybeStartMove(WHEEL_ZONE, m2, nearest(P, 'p1'), NOW);
  P.y += D.laneW + 20;
  runMove(m2);
  check('5. a player who stepped off the lane is missed', hitsOn('p1').length === 0 && abil('charge', 'execute')[0].hit === false);
  /* never onto the safe ground */
  const m3 = stage('ember', 3, { px: 200 });
  m3._mvCd = Object.create(null); m3._mvCd.combo = NOW + 1e9;
  room._maybeStartMove(WHEEL_ZONE, m3, nearest(P, 'p1'), NOW);
  const real = room._wheelSafeAt;
  const sx = m3.x;
  room._wheelSafeAt = (x) => x > sx + 50;
  runMove(m3);
  room._wheelSafeAt = real;
  check('5. it stops at the safe ground\'s edge', m3.x <= sx + 50 && hitsOn('p1').length === 0, { moved: m3.x - sx });
  /* parried: stopped dead on the shield */
  const m4 = stage('ember', 3, { px: 200 });
  m4._mvCd = Object.create(null); m4._mvCd.combo = NOW + 1e9;
  room._maybeStartMove(WHEEL_ZONE, m4, nearest(P, 'p1'), NOW);
  NOW += D.windupMs + 1;
  P.blocking = true; P.ba = Math.PI; P.blockStartT = NOW + 150;
  const sx4 = m4.x;
  runMove(m4);
  P.blocking = false;
  check('5. a parry stops it dead on the shield, short of the lane\'s end', hitsOn('p1').length === 1 && hitsOn('p1')[0].parried === true && m4.x < sx4 + len - 20, { ev: hitsOn('p1'), moved: m4.x - sx4 });
}

// ── 6. The volley ──
{
  const D = MOVE_DEFS.volley;
  const m = stage('frost', 3, { px: 200 });
  check('6. (setup) a tier-3 snowman with the Snow Volley', familyOf(m) === 'snowman' && room._movesFor(m).some((mv) => mv.kind === 'volley'));
  m._mvCd = Object.create(null); m._mvCd.combo = NOW + 1e9;
  room._maybeStartMove(WHEEL_ZONE, m, nearest(P, 'p1'), NOW);
  const tg = abil('volley', 'telegraph')[0];
  check('6. a fan of three, its middle at its target (200 px), drawn as a fan', !!tg && tg.shape === 'fan' && tg.n === 3 && tg.len === 200 && tg.br === D.ballR && Math.abs(tg.ang) < 0.01 && tg.span === D.spread, tg);
  /* a second player at the left ball's spot */
  const left = m._mvBalls[0];
  fresh(Q, left.x, left.y);
  NOW += D.windupMs + 1;
  room._resolveMonsterMove(WHEEL_ZONE, m, NOW);
  const rel = abil('volley', 'execute')[0];
  check('6. thrown when the wind-up ends: the release names the three spots and the flight', !!rel && rel.release === true && rel.travelMs === D.travelMs && Array.isArray(rel.pts) && rel.pts.length === 3 && rel.ball === 'snowball', rel);
  check('6. ...nothing lands while they fly', hitsOn('p1').length === 0 && hitsOn('p2').length === 0);
  runMove(m);
  check('6. each lands where its ring was drawn: the middle on the one it aimed at, the left on the one standing there',
    hitsOn('p1').length === 1 && hitsOn('p2').length === 1 && hitsOn('p1')[0].ability === 'volley', { p1: hitsOn('p1'), p2: hitsOn('p2') });
  /* a shield facing the thrower blocks a ball, free */
  const m2 = stage('frost', 3, { px: 200 });
  m2._mvCd = Object.create(null); m2._mvCd.combo = NOW + 1e9;
  room._maybeStartMove(WHEEL_ZONE, m2, nearest(P, 'p1'), NOW);
  P.blocking = true; P.ba = Math.PI; P.blockStartT = NOW - 5000;
  const st0 = P.stamina;
  runMove(m2);
  P.blocking = false;
  check('6. a shield facing the thrower blocks its ball, free (a snowball\'s rule)', hitsOn('p1').length === 1 && hitsOn('p1')[0].blocked === true && P.stamina === st0 && P.hp === MAX_HP);
  /* walked out of the fan */
  const m3 = stage('frost', 3, { px: 200 });
  m3._mvCd = Object.create(null); m3._mvCd.combo = NOW + 1e9;
  room._maybeStartMove(WHEEL_ZONE, m3, nearest(P, 'p1'), NOW);
  P.x -= 120;
  runMove(m3);
  check('6. a player who walked out of the fan is missed', hitsOn('p1').length === 0);
}

// ── 7. The slams ──
{
  const S = MOVE_DEFS.stomp, Qk = MOVE_DEFS.quake;
  const m = stage('hollows', 3, { px: Math.round((S.r0 + S.radius) / 2) });
  m._mvCd = Object.create(null); m._mvCd.combo = NOW + 1e9;
  room._maybeStartMove(WHEEL_ZONE, m, nearest(P, 'p1'), NOW);
  const tg = abil('stomp', 'telegraph')[0];
  check('7. the two-step slam: two rings round it, drawn as two, as long as both', !!tg && tg.shape === 'rings' && tg.r0 === S.r0 && tg.radius === S.radius && tg.ms === S.windupMs + S.gapMs && tg.ax === Math.round(m.x), tg);
  runMove(m);
  const ex = abil('stomp', 'execute');
  check('7. ...a player between the rings: the small one misses, the big one lands', ex.length === 2 && ex[0].radius === S.r0 && ex[0].hit === false && ex[1].radius === S.radius && ex[1].hit === true && hitsOn('p1').length === 1, ex);
  const m2 = stage('hollows', 5, { px: 60 });
  m2._mvCd = Object.create(null); m2._mvCd.combo = NOW + 1e9; m2._mvCd.stomp = NOW + 1e9;
  fresh(Q, m2.x - 100, m2.y + 60);
  room._maybeStartMove(WHEEL_ZONE, m2, nearest(P, 'p1'), NOW);
  const qt = abil('quake', 'telegraph')[0];
  check('7. the quake: one ring round it, wound up ' + Qk.windupMs + ' ms', !!qt && qt.radius === Qk.radius && qt.ms === Qk.windupMs && qt.shape === 'ring' && qt.ax === Math.round(m2.x));
  runMove(m2);
  check('7. ...everyone in its ring is hit, its target and the one behind it', hitsOn('p1').length === 1 && hitsOn('p2').length === 1 && hitsOn('p1')[0].dmg === Math.ceil(30 * Qk.dmgMult));
}

// ── 8. Enrage ──
{
  const E = MONSTER_MOVES.ENRAGE;
  const m = stage('hollows', 7);
  check('8. a tier-7 elder at full health: not enraged, but its cooldowns are 20% shorter', !room._monsterEnraged(m) && room._moveCdK(m) === MONSTER_MOVES.ELDER_CD_K && room._monsterSwingCd(m, 1500) === 1500);
  m.hp = Math.floor(m.maxHp * (E.HP_FRAC - 0.05));
  check('8. under 30%: enraged -- faster swings, cooldowns shorter again', room._monsterEnraged(m) && room._monsterSwingCd(m, 1500) === Math.round(1500 * E.SWING_K)
    && Math.abs(room._moveCdK(m) - MONSTER_MOVES.ELDER_CD_K * E.CD_K) < 1e-9);
  room._resolveMonsterMove(WHEEL_ZONE, m, NOW);
  room._resolveMonsterMove(WHEEL_ZONE, m, NOW + 100);
  check('8. announced once a life (the phone growls; its red pulse is worked out from its bar)', abil('enrage').length === 1 && abil('enrage')[0].phase === 'execute');
  /* a kit's cooldown is the elder's too */
  m._tgPhase = 'telegraph'; m._tgUntil = NOW - 1; m._tgTarget = 'p1'; m._tgRadius = 88; m._tgAim = { x: P.x, y: P.y };
  room._resolveMonsterTelegraph(WHEEL_ZONE, m, NOW);
  check('8. a kit\'s cooldown (the brute\'s slam) is shortened with it', m._tgNextAt === NOW + Math.round(TELEGRAPH.KITS.brute.cooldownMs * MONSTER_MOVES.ELDER_CD_K * E.CD_K), { got: m._tgNextAt - NOW });
  const m6 = stage('hollows', 6);
  m6.hp = Math.floor(m6.maxHp * 0.1);
  check('8. a tier-6 monster under 30% is not enraged (no enrage below tier 7) and cools as ever', !room._monsterEnraged(m6) && room._moveCdK(m6) === 1);
  /* the phone's rule is the worker's, from level, land and bar */
  noteMoveCaps({ monstermoves: true });
  let same = true, why = null;
  for (const t of [1, 2, 5, 6, 7, 8]) {
    for (const frac of [1, 0.5, 0.31, 0.29, 0.05, 0]) {
      const w = wheel.find((x) => (t === 1 ? !x.tier : x.tier === t));
      const s = { ...w, hp: Math.floor(w.maxHp * frac), alive: frac > 0 };
      const phone = { home: w.home, level: w.level, hp: s.hp, maxHp: w.maxHp, alive: s.alive };
      if (room._monsterEnraged(s) !== monsterEnragedLook(phone) || moveTierOf(phone) !== moveTier(w)) { same = false; why = { t, frac, srv: room._monsterEnraged(s), phone: monsterEnragedLook(phone), tier: moveTierOf(phone) }; }
    }
  }
  check('8. the phone\'s enrage (src/game/monsterMoves.js) is the worker\'s, at every tier and bar', same, why);
  const phoneM = { home: 'hollows', level: 35, hp: 10, maxHp: 100, alive: true };
  check('8. ...it pulses red (a tint, never brighter), and is the body\'s own colour when not enraged',
    enrageTint(phoneM, 0xffffff, 0) !== 0xffffff && ((enrageTint(phoneM, 0xffffff, 0) >> 8) & 0xff) < 0xff && enrageTint({ ...phoneM, hp: 90 }, 0xabcdef, 0) === 0xabcdef);
  noteMoveCaps({ monstermoves: true, monsterenrage: false });
  check('8. ...not against a worker whose `monsterenrage` is off', monsterEnragedLook(phoneM) === false);
  noteMoveCaps(null);
  check('8. ...nor against a worker with no moves', monsterEnragedLook(phoneM) === false && moveGeometry({ ability: 'charge', shape: 'line', bx: 1, by: 2 }) === null);
}

// ── 9. The stat step ──
{
  const base = (home, tier) => {
    const z = ZONES[home], sp = z.spawns[0];
    const m = room._makeZoneMonster(home, z, sp, 'ref', 10, 10, tier * 5 - 2);
    m.tier = tier;
    return m;
  };
  const b2 = base('hollows', 2), hp0 = b2.maxHp, d0 = b2.dmg;
  room._moveTierStep(b2);
  check('9. tier 2: +10% HP, +8% hit', b2.maxHp === Math.ceil(hp0 * 1.1) && b2.hp === b2.maxHp && b2.dmg === Math.ceil(d0 * 1.08), { hp0, hp: b2.maxHp, d0, d: b2.dmg });
  room._moveTierStep(b2);
  check('9. ...once (a second call changes nothing)', b2.maxHp === Math.ceil(hp0 * 1.1));
  const b8 = base('hollows', 8), h8 = b8.maxHp;
  room._moveTierStep(b8);
  check('9. tier 8: +70% HP', b8.maxHp === Math.ceil(h8 * 1.7));
  const b1 = base('hollows', 1), h1 = b1.maxHp;
  room._moveTierStep(b1);
  check('9. tier 1: unchanged', b1.maxHp === h1);
  room._liveFlags = { monstermoves: false };
  const bo = base('hollows', 3), ho = bo.maxHp;
  room._moveTierStep(bo);
  room._liveFlags = {};
  check('9. `monstermoves: false`: a monster built after it is unchanged', bo.maxHp === ho);
  /* the switch thrown while the room runs: off every live monster at once, back on again, each as hurt as it was */
  room.monsters[WHEEL_ZONE] = wheel;   /* the whole Wheel again (stage() left one) */
  const w = wheel.find((x) => x.tier === 4);
  const max4 = w.maxHp, dmg4 = w.dmg;
  w.alive = true; w.hp = Math.round(max4 / 2);
  room._liveFlags = { monstermoves: false };
  room._monsterMovesFlagChanged();
  const offMax = w.maxHp, offHp = w.hp, offDmg = w.dmg;
  room._liveFlags = {};
  room._monsterMovesFlagChanged();
  check('9. the switch thrown live takes the step off every Wheel monster (half hurt stays half hurt), and setting it back puts it on',
    Math.abs(offMax - max4 / 1.3) <= 1 && Math.abs(offHp - offMax / 2) <= 1 && Math.abs(offDmg - dmg4 / 1.24) <= 1 && Math.abs(w.maxHp - max4) <= 1 && Math.abs(w.dmg - dmg4) <= 1 && Math.abs(w.hp - w.maxHp / 2) <= 1,
    { max4, offMax, offHp, offDmg, back: [w.maxHp, w.hp, w.dmg], dmg4 });
  w.hp = w.maxHp;
}

// ── 10. The switches and the cap ──
{
  const m = stage('hollows', 7);
  room._liveFlags = { monstermoves: false };
  m.hp = Math.floor(m.maxHp * 0.1);
  check('10. `monstermoves: false`: no move at any tier, no enrage, cooldowns and swings as tier 1\'s',
    room._movesFor(m).length === 0 && !room._monsterEnraged(m) && room._moveCdK(m) === 1 && room._monsterSwingCd(m, 1500) === 1500
    && room._maybeStartMove(WHEEL_ZONE, m, nearest(P, 'p1'), NOW) === false);
  for (const [flag, kinds] of [['monstercombo', ['combo']], ['monstercharge', ['charge']], ['monstervolley', ['volley']], ['monsterslam', ['stomp', 'quake']], ['monsterenrage', ['enrage']]]) {
    room._liveFlags = { [flag]: false };
    let ok = true;
    for (const fam of Object.keys(FAMILY_MOVES)) {
      const mm = { arch: fam === 'snowman' ? 'snowman' : fam === 'mummy' ? 'stalker' : (fam === 'slime' || fam === 'goblin') ? 'fodder' : 'brute',
        element: fam === 'mummy' ? 'wind' : fam === 'goblin' ? 'flame' : fam === 'fishman' ? 'water' : fam === 'lurker' ? 'venom' : fam === 'slime' ? 'storm' : 'stone', tier: 8 };
      const have = room._movesFor(mm).map((mv) => mv.kind);
      if (kinds.some((k) => have.includes(k))) ok = false;
      if (have.length !== familyMoves(fam).filter((mv) => !kinds.includes(mv.kind)).length) ok = false;
    }
    check('10. `' + flag + ': false` takes ' + kinds.join(' and ') + ' and nothing else from every family', ok);
  }
  room._liveFlags = {};
  m.hp = m.maxHp;
  /* the cap */
  const ws = fakeWs('c1');
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id: 'c1', name: 'c1', protocolVersion: 2, ws: [1, 5], data: { x: 1000, y: 1000, z: 'town' } }));
  const caps = (ws.sent.find((x) => x.type === 'state_sync') || {}).caps || {};
  check('10. a join is told the worker can (caps.monstermoves)', caps.monstermoves === true, caps.monstermoves);
  room._liveFlags = { monstermoves: false, monsterenrage: false };
  const ws2 = fakeWs('c2');
  room.sessions.set(ws2, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
  await room.webSocketMessage(ws2, JSON.stringify({ type: 'join', id: 'c2', name: 'c2', protocolVersion: 2, ws: [1, 5], data: { x: 1000, y: 1000, z: 'town' } }));
  const caps2 = (ws2.sent.find((x) => x.type === 'state_sync') || {}).caps || {};
  room._liveFlags = {};
  check('10. ...and told when it is off, and a kind\'s switch with it (the flags ride the caps)', caps2.monstermoves === false && caps2.monsterenrage === false, { m: caps2.monstermoves, e: caps2.monsterenrage });
}

// ── 11. Tier 1 unchanged ──
{
  const m = stage('hollows', 1);
  check('11. a first-stretch rock monster: no move, no braced, cooldowns and swings as ever', room._movesFor(m).length === 0 && room._moveCdK(m) === 1 && room._monsterSwingCd(m, 1500) === 1500
    && room._maybeStartMove(WHEEL_ZONE, m, nearest(P, 'p1'), NOW) === false && !room._moveBraced(m));
  m._tgPhase = 'telegraph'; m._tgUntil = NOW - 1; m._tgTarget = 'p1'; m._tgRadius = 88; m._tgAim = { x: P.x, y: P.y };
  room._resolveMonsterTelegraph(WHEEL_ZONE, m, NOW);
  check('11. its slam\'s cooldown is the kit\'s own, and no gap is set after it', m._tgNextAt === NOW + TELEGRAPH.KITS.brute.cooldownMs && !(m._mvGapAt > NOW));
  const z = ZONES.hollows, ref = room._makeZoneMonster('hollows', z, z.spawns[0], 'ref', 10, 10, m.level);
  check('11. its stats are its level\'s (no step)', ref.maxHp === m.maxHp);
}

// ── 12. Writes ──
{
  const m = stage('hollows', 3, { px: 60 });
  m._mvCd = Object.create(null); m._mvCd.combo = NOW + 1e9;
  puts = 0;
  room._maybeStartMove(WHEEL_ZONE, m, nearest(P, 'p1'), NOW);
  P.x = m.x + 400;   /* stepped out of both rings: it whiffs */
  runMove(m);
  await new Promise((r) => setTimeout(r, 0));
  check('12. a whole move that whiffs writes no row (its state is in memory)', puts === 0 && abil('stomp', 'execute').length === 2, puts);
}

// ── 13. The phone's shapes (src/game/monsterMoves.js) ──
{
  noteMoveCaps({ monstermoves: true });
  const g1 = moveGeometry({ ability: 'charge', shape: 'line', bx: 10, by: 20, w: 9999 });
  const g2 = moveGeometry({ ability: 'volley', shape: 'fan', ang: 1, span: 0.84, len: 99999, n: 40, br: 44 });
  const g3 = moveGeometry({ ability: 'stomp', shape: 'rings', r0: 90 });
  const g4 = moveGeometry({ ability: 'combo', follow: 1, monsterId: 'wm-x' });
  check('13. a lane, a fan, two rings and a ring that follows, every number clamped', g1.shape === 'line' && g1.w === 120 && g2.shape === 'fan' && g2.len === 600 && g2.n === 5 && g3.r0 === 90 && g4.shape === 'follow' && g4.mid === 'wm-x');
  check('13. a kit\'s plain ring and an unknown kind are no shape; an area slam\'s ring is one', moveGeometry({ ability: 'slam', shape: 'ring' }) === null && moveGeometry({ ability: 'quake', shape: 'ring' }).shape === 'ring' && moveGeometry({ ability: '__proto__', shape: 'line', bx: 1, by: 1 }) === null);
  const balls = volleyBalls({ ability: 'volley', release: true, ax: 0, ay: 0, pts: [[10, 0], [0, 10], ['x', 1], [5, 5], [1, 1], [2, 2], [3, 3]] });
  check('13. a volley\'s balls from its release: well-formed ones, at most five', balls.length === 4 && balls[0].tx === 10 && balls.every((b) => b.x === 0 && b.y === 0), balls);
  noteMoveCaps(null);
}

console.log(`\n${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
