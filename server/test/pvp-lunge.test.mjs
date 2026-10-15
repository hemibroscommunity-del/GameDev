/* THE SWORD'S OPENING LUNGE, AT A PLAYER -- v2.3.3262
 * (server/src/pvplunge.js, docs/specs/pvp-lunge.md).
 *
 * Owner, on v2.3.3260's honest limit (a sword cannot catch a bow or a staff
 * that keeps its distance): "Yes make opening lunge work on players too".
 *
 *   1. A sworddash that names a player (`pid`) LANDS through the one door
 *      (_resolvePvPAttack): the worker's own roll, a pvp_hit marked
 *      `ability: 'sworddash'`, the attacker moved to contact.
 *   2. A landed lunge DAZES: `st: 'daze'` and `stMs` on the pvp_hit, the
 *      daze and its window on the target; inside the window none lands again.
 *   3. While dazed, against players: the dazed player's swing lands nothing,
 *      their lunge neither lands nor moves them, a roll buys no i-frames --
 *      but a shot still lands (it may have been loosed before the daze) --
 *      and the daze ends on time.
 *   4. Refused, a whiff that moves nobody: no consent, out of reach, yourself,
 *      another zone, a dead target, '__proto__', a missing player.
 *   5. A raised shield facing the lunge blocks it (no daze, not a whiff); a
 *      roll's i-frames make it a miss; the sword's lane and the cooldown hold.
 *   6. A monster standing by the swordsman does not take a lunge at a player.
 *   7. No man's land: the lunge is a hit under its rule (both skulled).
 *   8. The kill switch `pvplunge: false`: the cap un-advertised, the lunge a
 *      whiff, the dazed gates off.
 */
import { GameRoom } from '../src/index.js';
import { PVP_LUNGE } from '../src/pvplunge.js';
import { WHEEL_ZONE } from '../src/wheelzone.js';
import { WHEEL_CENTRE } from '../src/wheelspawns.js';
import { nmlLevelAt } from '../src/nomansland.js';
import { DAZE } from '../src/monsterstatus.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

/* the worker's clock and dice are the test's */
let T = 1_900_000_000_000;
Date.now = () => T;
let R = 0.5;
Math.random = () => R;

function makeState() {
  const store = new Map();
  return {
    storage: {
      get: async (k) => store.get(k),
      put: async (k, v) => { store.set(k, JSON.parse(JSON.stringify(v))); },
      list: async () => new Map(),
      delete: async (k) => { store.delete(k); },
    },
    getWebSockets: () => [],
    acceptWebSocket: () => {},
  };
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
function fakeWs() { return { sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() {} }; }

const room = new GameRoom(makeState(), mockEnv);
async function join(ws, id) {
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 0, lastPing: 0, lastRecv: T });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: id, phrase: 'p-' + id, protocolVersion: 2, data: { x: 0, y: 0, z: 'town' } }));
  await new Promise((r) => setTimeout(r, 5));
}
const wsA = fakeWs(), wsB = fakeWs();
await join(wsA, 'bp_lu_a');
await join(wsB, 'bp_lu_b');
clearInterval(room.tickInterval); room.tickInterval = null;
const A = room.playerState.bp_lu_a, B = room.playerState.bp_lu_b;
const sessA = room.sessions.get(wsA), sessB = room.sessions.get(wsB);
check('both players joined (guard)', !!A && !!B && !!sessA && !!sessB);
const capsOf = (ws) => { const m = ws.sent.find((x) => x.type === 'state_sync'); return (m && (m.caps || (m.payload && m.payload.caps))) || {}; };
check('the worker advertises caps.pvplunge', capsOf(wsA).pvplunge === true, capsOf(wsA).pvplunge);
check('the lunge\'s daze IS the rock monsters\' daze (one daze in the game: 500 ms, then 2,500 ms before another)',
  PVP_LUNGE.DAZE_MS === DAZE.MS && PVP_LUNGE.IMMUNE_MS === DAZE.IMMUNE_MS && DAZE.MS === 500 && DAZE.IMMUNE_MS === 2500, { lunge: PVP_LUNGE, rock: DAZE });
room._saveRpg = () => {}; room._saveRpgVitals = () => {}; room._saveRpgPools = () => {};
room._queuePlayerStateFlush = () => {};
room.stateHistory = {};
room._liveFlags = {};

if (!room._pvpConsent) room._pvpConsent = new Map();
const pair = () => room._pvpPairKey('bp_lu_a', 'bp_lu_b');
const consent = () => room._pvpConsent.set(pair(), T + 3600000);
const noConsent = () => room._pvpConsent.delete(pair());

/* A: a level-12 swordsman with a copper greatsword; B: a deep pool, so nobody
   dies mid-check unless asked */
function setup(opts = {}) {
  for (const c of ['sword', 'bow', 'staff']) A.prog3.sk[c].level = 1;
  A.prog3.sk.sword.level = 12;
  A.weapon = { type: 'greatsword', name: 'sword', tierMult: 1.25, quality: 'normal' };
  A.rangedWeapon = A.staffWeapon = null;
  A.activeSlot = 'melee';
  room._prog3Recompute(A);
  room._prog3Recompute(B);
  const z = opts.z || 'town';
  A.z = B.z = z;
  A.dead = A.dying = A.disconnected = false;
  B.dead = B.dying = B.disconnected = false;
  A.stamina = A.maxStamina; A.mana = A.maxMana; A._buffs = {};
  B.maxHp = opts.maxHp || 100000; B.hp = opts.hp != null ? opts.hp : B.maxHp;
  A.blocking = B.blocking = false; A.dodging = B.dodging = false; A.def = B.def = 0;
  A._zoneEntryGraceUntil = B._zoneEntryGraceUntil = 0;
  A._dazeUntil = A._dazeImmuneUntil = 0; B._dazeUntil = B._dazeImmuneUntil = 0;
  A.x = opts.ax != null ? opts.ax : 0; A.y = opts.ay != null ? opts.ay : 0;
  B.x = opts.bx != null ? opts.bx : 600; B.y = opts.by != null ? opts.by : 0;
  A.lastMoveAt = T;
  if (A._abilCd) A._abilCd.sworddash = 0;
  room._pvpHitLanes = new Map();
  if (opts.consent === false) noConsent(); else consent();
}
/* the real message, through the router: _handleAbility (weapon, cooldown,
   cost) then _abilityResolve */
async function lunge(pid, ws = wsA) {
  room.eventBuffer.length = 0;
  ws.sent.length = 0;
  await room.webSocketMessage(ws, JSON.stringify({ type: 'ability', payload: { kind: 'sworddash', pid } }));
  const hit = room.eventBuffer.find((e) => e.type === 'pvp_hit');
  const rej = ws.sent.find((m) => m.type === 'ability_rejected');
  return { hit: hit ? hit.payload : null, rej: rej ? rej.payload : null };
}
function swing(sess, target, sw) {
  room.eventBuffer.length = 0;
  room._resolvePvPAttack(sess, { kind: 'melee', target, range: 120, arc: 3, angle: Math.atan2(
    (target === 'bp_lu_b' ? B : A).y - (sess === sessA ? A : B).y, (target === 'bp_lu_b' ? B : A).x - (sess === sessA ? A : B).x), sw });
  const h = room.eventBuffer.find((e) => e.type === 'pvp_hit');
  return h ? h.payload : null;
}
const dist = () => Math.hypot(B.x - A.x, B.y - A.y);

// ── 1. a lunge at a player lands, through the one door ──
{
  setup();
  const hp0 = B.hp;
  const expect = room._computeAttackDamage(A, 'melee', false).dmg;
  const r = await lunge('bp_lu_b');
  check('a sworddash that names a player 600 px away LANDS: a pvp_hit, marked ability sworddash', !!r.hit && r.hit.ability === 'sworddash' && r.hit.attacker === 'bp_lu_a' && r.hit.target === 'bp_lu_b', r);
  check('...the hit is the worker\'s own roll (one formula: the hit a monster would take, dmgMult 1)', !!r.hit && Math.abs(r.hit.dmgBase - expect) < 1e-9, { got: r.hit && r.hit.dmgBase, expect });
  check('...and B lost what the pvp_hit says', !!r.hit && Math.abs((hp0 - B.hp) - r.hit.dmgTaken) < 1e-6 && r.hit.dmgTaken > 0, { lost: hp0 - B.hp, said: r.hit && r.hit.dmgTaken });
  check(`...the worker put A at contact (${Math.round(dist())} px, STOP_PX ${PVP_LUNGE.STOP_PX}) and the next move is a first move`,
    Math.abs(dist() - PVP_LUNGE.STOP_PX) < 0.5 && A.lastMoveAt === undefined, { d: dist(), lastMoveAt: A.lastMoveAt });
  check('...and no "whiff" went back', !r.rej, r.rej);
}

// ── 2. the daze ──
{
  setup();
  const t0 = T;
  const r = await lunge('bp_lu_b');
  check(`a landed lunge DAZES: st 'daze', stMs ${PVP_LUNGE.DAZE_MS} on the pvp_hit`, !!r.hit && r.hit.st === 'daze' && r.hit.stMs === PVP_LUNGE.DAZE_MS, r.hit);
  check('...the daze and its window on B (the worker\'s copy)',
    B._dazeUntil === t0 + PVP_LUNGE.DAZE_MS && B._dazeImmuneUntil === t0 + PVP_LUNGE.DAZE_MS + PVP_LUNGE.IMMUNE_MS,
    { until: B._dazeUntil - t0, immune: B._dazeImmuneUntil - t0 });
  /* inside the window: the next lunge lands, and dazes nothing */
  T += PVP_LUNGE.DAZE_MS + 100;
  A._abilCd.sworddash = 0; A.x = B.x - 500; A.y = B.y;
  const r2 = await lunge('bp_lu_b');
  check('...inside the window after it, a lunge still lands but dazes nothing (shared with the rock monsters\' daze)',
    !!r2.hit && r2.hit.dmgTaken > 0 && r2.hit.st === undefined && B._dazeUntil === t0 + PVP_LUNGE.DAZE_MS, r2.hit);
  T += PVP_LUNGE.IMMUNE_MS;
  A._abilCd.sworddash = 0; A.x = B.x - 500; A.y = B.y;
  const r3 = await lunge('bp_lu_b');
  check('...and once the window is over, a lunge dazes again', !!r3.hit && r3.hit.st === 'daze', r3.hit);
}

// ── 3. while dazed, against players ──
{
  setup({ bx: 300 });
  await lunge('bp_lu_b');
  check('(guard) B is dazed', B._dazeUntil > T);
  const back = swing(sessB, 'bp_lu_a', 101);
  check('a DAZED player\'s swing lands nothing on a player', back === null, back);
  /* a shot: B carries a bow too.  Its claim comes when it lands, so one loosed
     before the daze arrives inside it -- the worker lets it land */
  B.rangedWeapon = { type: 'bow', name: 'bow', tierMult: 1.0, quality: 'normal' };
  room.eventBuffer.length = 0;
  const aHp = A.hp;
  room._resolvePvPAttack(sessB, { kind: 'ranged', target: 'bp_lu_a', range: Math.round(dist()) + 60, arc: 0.9,
    angle: Math.atan2(A.y - B.y, A.x - B.x), dmgBase: 10, critChance: 0 });
  const arrow = room.eventBuffer.find((e) => e.type === 'pvp_hit');
  check('...but a dazed player\'s SHOT still lands (it may have been loosed before the daze)', !!arrow && arrow.payload.dmgTaken > 0 && A.hp < aHp, arrow && arrow.payload);
  B.rangedWeapon = null;
  A.hp = A.maxHp;
  /* B's own lunge, dazed: a whiff, and B stays where the daze caught them */
  B.weapon = { type: 'greatsword', name: 'sword', tierMult: 1.25, quality: 'normal' };
  B.activeSlot = 'melee';
  if (B._abilCd) B._abilCd.sworddash = 0;
  const ax0 = A.x, ay0 = A.y;
  A.x = B.x - 400; A.y = B.y;   /* far enough that a lunge would carry B to contact */
  const bx = B.x, by = B.y, aHp2 = A.hp;
  const bl = await lunge('bp_lu_a', wsB);
  check('...a DAZED swordsman\'s lunge is a whiff, and does not move them', !bl.hit && !!bl.rej && bl.rej.reason === 'whiff' && B.x === bx && B.y === by && A.hp === aHp2, { bl, moved: [B.x - bx, B.y - by] });
  A.x = ax0; A.y = ay0;
  T += 300;   /* still dazed; past the sword's lane gap */
  B.dodging = true;
  const into = swing(sessA, 'bp_lu_b', 102);
  check('...and a roll claimed in a daze buys no i-frames: A\'s swing lands on a "rolling" B', !!into && into.dmgTaken > 0 && !into.dodged, into);
  B.dodging = false;
  T += PVP_LUNGE.DAZE_MS;
  const later = swing(sessB, 'bp_lu_a', 103);
  check('...and when the daze is over, B\'s swing lands again', !!later && later.dmgTaken > 0, later);
}

// ── 4. refusals: a whiff that moves nobody ──
{
  const whiffs = [];
  const tryOne = async (label, prep, pid) => {
    setup();
    prep();
    const ax = A.x, ay = A.y, hp = B.hp;
    const r = await lunge(pid);
    const ok = !r.hit && !!r.rej && r.rej.reason === 'whiff' && A.x === ax && A.y === ay && B.hp === hp;
    whiffs.push([label, ok]);
    return ok;
  };
  check('no consent and not lawless (town): a whiff, nobody moved', await tryOne('consent', () => noConsent(), 'bp_lu_b'));
  check('out of reach (1,400 px): a whiff, nobody moved', await tryOne('reach', () => { B.x = 1400; }, 'bp_lu_b'));
  check('yourself: a whiff', await tryOne('self', () => {}, 'bp_lu_a'));
  check('another zone: a whiff', await tryOne('zone', () => { B.z = 'meadow'; }, 'bp_lu_b'));
  check('a dead target: a whiff', await tryOne('dead', () => { B.dead = true; }, 'bp_lu_b'));
  check("'__proto__', 'constructor' and a missing player: a whiff each, nothing thrown",
    (await tryOne('proto', () => {}, '__proto__')) && (await tryOne('ctor', () => {}, 'constructor')) && (await tryOne('missing', () => {}, 'bp_nobody')));
  /* a non-string pid is not a player lunge at all: the old monster scan runs
     (nothing in town) and whiffs */
  setup();
  const r = await lunge(12345);
  check('a numeric pid is no player lunge (the old path: a whiff in an empty town)', !r.hit && !!r.rej && r.rej.reason === 'whiff' && B.hp === B.maxHp, r);
}

// ── 5. a shield, a roll, the cooldown, the lane ──
{
  setup();
  B.blocking = true; B.blockStartT = T - 1000; B.ba = Math.PI;   /* facing A, who comes from the west */
  const r = await lunge('bp_lu_b');
  check('a shield raised AT the lunge blocks it: blocked, no daze -- and it connected (no whiff)', !!r.hit && r.hit.blocked === true && r.hit.st === undefined && !r.rej && !(B._dazeUntil > T), r);
  setup();
  B.dodging = true;
  const r2 = await lunge('bp_lu_b');
  check('a roll\'s i-frames make the lunge a miss (a whiff, no daze)', !r2.hit && !!r2.rej && r2.rej.reason === 'whiff' && !(B._dazeUntil > T), r2);
  setup();
  await lunge('bp_lu_b');
  const again = await lunge('bp_lu_b');
  check('the cooldown holds: a second lunge at once is refused (cooldown), no hit', !again.hit && !!again.rej && again.rej.reason === 'cooldown', again);
  /* a swing that landed a moment ago: the lunge is a swing of its own on the
     sword's lane, so it waits MELEE_MIN_MS like any other */
  setup({ bx: 40 });
  const s = swing(sessA, 'bp_lu_b', 201);
  check('(guard) a plain swing landed', !!s && s.dmgTaken > 0);
  T += 100;
  const tooSoon = await lunge('bp_lu_b');
  check('a lunge 100 ms after a swing landed is held by the sword\'s lane (one hit a swing): a whiff', !tooSoon.hit && !!tooSoon.rej && tooSoon.rej.reason === 'whiff', tooSoon);
}

// ── 6. a monster by the swordsman does not take it ──
{
  setup({ z: 'meadow' });
  const mons = room._ensureZoneMonsters('meadow') || [];
  const m = mons[0];
  check('(guard) a meadow monster to stand by', !!m);
  if (m) {
    m.alive = true; m.hp = 900; m.maxHp = 900; m._stunUntil = 0; m._invulnUntil = 0;
    m.x = A.x + 30; m.y = A.y;
    const r = await lunge('bp_lu_b');
    check('a monster 30 px from the swordsman does not take a lunge aimed at a player (B does)', m.hp === 900 && !!r.hit && r.hit.dmgTaken > 0, { mhp: m.hp, hit: r.hit });
  }
}

// ── 7. No man's land ──
{
  /* both deep in No man's land 5 (the simulator's spot), the same level: the
     rule allows the fight with no consent */
  const R0 = 9000, cx = WHEEL_CENTRE[0], cy = WHEEL_CENTRE[1];
  setup({ z: WHEEL_ZONE, consent: false, ax: cx + R0, ay: cy, bx: cx + R0 + 500, by: cy });
  A.level = B.level = 12;
  A._nml = null; B._nml = null;
  check('(guard) both stand in No man\'s land', nmlLevelAt(WHEEL_ZONE, A.x, A.y) >= 1 && nmlLevelAt(WHEEL_ZONE, B.x, B.y) >= 1,
    [nmlLevelAt(WHEEL_ZONE, A.x, A.y), nmlLevelAt(WHEEL_ZONE, B.x, B.y)]);
  const r = await lunge('bp_lu_b');
  check('in No man\'s land the lunge is a hit under its rule (no consent needed): it lands and dazes', !!r.hit && r.hit.dmgTaken > 0 && r.hit.st === 'daze', r);
  const skA = room._nmlSkullOf(A), skB = room._nmlSkullOf(B);
  check('...and it skulls as any hit under the rule does (the attacker red, the one hit white)', skA === 'r' && skB === 'w', { skA, skB });
}

// ── 8. the kill switch ──
{
  room._liveFlags = { pvplunge: false };
  setup();
  const r = await lunge('bp_lu_b');
  check('`pvplunge: false`: a lunge that names a player is a whiff, nobody moved', !r.hit && !!r.rej && r.rej.reason === 'whiff' && B.hp === B.maxHp && A.x === 0, r);
  B._dazeUntil = T + 400;
  A.x = B.x - 40; A.y = B.y;   /* the whiff left A 600 px off: within a swing's reach */
  const back = swing(sessB, 'bp_lu_a', 301);
  check('...and the dazed gates are off: a "dazed" B\'s swing lands as before', !!back && back.dmgTaken > 0, back);
  const ws3 = fakeWs();
  await join(ws3, 'bp_lu_c');
  check('...and the cap is un-advertised (caps.pvplunge false)', capsOf(ws3).pvplunge === false, capsOf(ws3).pvplunge);
  room._liveFlags = {};
}

console.log(`\n${failures ? failures + ' FAILED' : 'all passed'}`);
process.exit(failures ? 1 : 0);
