/* WHAT A HIT DOES TO A MONSTER, IT DOES TO A PLAYER -- v2.3.3264
 * (server/src/pvpextras.js, docs/specs/one-formula.md "The extras").
 *
 * Owner, 2026-10-15: "Yes the monster only extras should work on players too".
 *
 *   1. who an area move may hit: the players you are already fighting (a duel,
 *      a trade of blows in the last ENGAGE_MS), never a bystander; a NAMED
 *      target only needs the fight to be allowed;
 *  1b. v2.3.3523: WHICH WAY -- a blow YOU landed, not one landed on you: the
 *      one attacked does not catch the attacker in an area move before their
 *      own first blow (the kill switch `areachoice: false` is either way);
 *   2. the weapon's element on a player -- the claim's, read where a hit on a
 *      monster reads it, the monster table's own durations and ticks: burn,
 *      root (held by the slime's rule), freeze (dazed by the rock's rule),
 *      slow, soak, fracture (on exactly the sources it amplifies on a
 *      monster), thorn;
 *   3. a collision on a player is the collision a monster takes;
 *   4. NOT the knockback of an ordinary hit (the owner's call: one-formula.md
 *      "Not on players yet") -- a monster still takes HIT_KNOCKBACK;
 *   5. the staff's splash and blast reach players, and leave from one;
 *   6. the Element Burst;
 *   7. the abilities -- bash, dash, whirlwind, lunge -- the same number on a
 *      player as on a monster of that level, the stun as a player takes one;
 *   8. NOT the bow volley's burn (the owner's call, as 4);
 *   9. the kill's heal;
 *  10. the ticks stop when the two may no longer fight;
 *  11. the kill switches;
 *  12. mutations: each guard above fails this suite when it is broken.
 */
import { GameRoom } from '../src/index.js';
import { PVP_EXTRAS, PVP_STATUSES } from '../src/pvpextras.js';
import { HIT_KNOCKBACK, LIFESTEAL_REFUND, STAFF_BOLT, STAFF_SPLASH } from '../src/combat.js';
import { STAM_ABILITIES, LUNGE } from '../src/abilities.js';
import { ELEMENT_STATUS, applyElementStatus, tickElementStatuses, resolveElementCollision, elemAttackStat, thornRecoil } from '../src/elemental.js';
import { DAZE, STUCK, ELEM_HITS } from '../src/monsterstatus.js';
import { PROG3 } from '../src/prog3.js';

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
const IDS = { A: 'bp_px_a', B: 'bp_px_b', C: 'bp_px_c', D: 'bp_px_d' };
const WS = { A: fakeWs(), B: fakeWs(), C: fakeWs(), D: fakeWs() };
for (const k of ['A', 'B', 'C', 'D']) await join(WS[k], IDS[k]);
clearInterval(room.tickInterval); room.tickInterval = null;
const P = { A: room.playerState[IDS.A], B: room.playerState[IDS.B], C: room.playerState[IDS.C], D: room.playerState[IDS.D] };
const sess = (k) => room.sessions.get(WS[k]);
check('four players joined (guard)', !!(P.A && P.B && P.C && P.D && sess('A')));
room._saveRpg = () => {}; room._saveRpgVitals = () => {}; room._saveRpgPools = () => {};
room._queuePlayerStateFlush = () => {};
room.stateHistory = {};
room._liveFlags = {};
if (!room._pvpConsent) room._pvpConsent = new Map();
/* A's fights: B and D are duel partners (a consent pair each); C is a stranger */
const consent = (x, y) => room._pvpConsent.set(room._pvpPairKey(IDS[x], IDS[y]), T + 3600000);

const LV = 12;
function reset(k, x, opts = {}) {
  const p = P[k];
  for (const c of ['sword', 'bow', 'staff']) p.prog3.sk[c].level = 1;
  p.prog3.sk.sword.level = LV;
  p.weapon = { type: 'greatsword', name: 'sword', tierMult: 1.25, quality: 'normal', ...(opts.element ? { element1: opts.element } : null) };
  p.rangedWeapon = { type: 'bow', name: 'bow', tierMult: 1.25, quality: 'normal' };
  p.staffWeapon = { type: 'staff', name: 'staff', tierMult: 1.25, quality: 'normal' };
  p.shield = { name: 'Shield' };
  p.armor = null; p.legsArmor = null;
  p.activeSlot = 'melee';
  room._prog3Recompute(p);
  p.maxHp = 100000; p.hp = opts.hp || 100000;
  p.mana = p.maxMana; p.stamina = p.maxStamina;
  p.z = 'town'; p.x = x; p.y = 0;
  p.dead = p.dying = p.disconnected = false;
  p.blocking = false; p.dodging = false; p.def = 0; p._zoneEntryGraceUntil = 0;
  p._buffs = {}; p._abilCd = null; p._lungeAt = 0; p._burstCdUntil = 0;
  p._pvpSpecUntil = 0; p._pvpSpecLeft = 0;
  p._staggerUntil = 0; p._wst = null; p._dmgFromPlayer = null;
  p._dazeUntil = p._dazeImmuneUntil = p._stuckUntil = p._stuckImmuneUntil = 0;
  p._soakUntil = 0; p._gustLeft = 0; p._gustUntil = 0; p._thornRecoilAt = 0;
}
function resetAll() {
  reset('A', 0); reset('B', 40); reset('C', 60); reset('D', 3000);
  room._pvpConsent = new Map(); consent('A', 'B'); consent('A', 'D');
  room._pvpEngage = new Map();
  room._pvpStPlayers = new Set();
  room._pvpHitLanes = new Map();
  room.monsters.town = [];
  room._liveFlags = {};
}
let swN = 100;
/* A's sword (or bow/staff) claim at B, the page's shape */
function claim(kind, extra) {
  room._pvpHitLanes = new Map(); T += 300;
  room.eventBuffer.length = 0;
  room._resolvePvPAttack(sess('A'), Object.assign({ range: 900, arc: 3, angle: 0, target: IDS.B, kind, sw: ++swN }, extra || {}));
  return room.eventBuffer.filter((e) => e.type === 'pvp_hit').map((e) => e.payload);
}
const hitsOn = (k) => room.eventBuffer.filter((e) => e.type === 'pvp_hit' && e.payload.target === IDS[k]).map((e) => e.payload);
const opp = (k) => room._prog3OpponentLevel(P[k]);
function monster(id, x, y, level) {
  const m = { id, alive: true, hp: 1e7, maxHp: 1e7, x, y, level, dmg: 10, element: null, statuses: null };
  room.monsters.town.push(m);
  return m;
}

// ── 1. who an area move may hit ──
{
  resetAll();
  check('the four statuses the page learns are the three a monster never puts on a player',
    PVP_STATUSES.length === 3 && PVP_STATUSES.every((s) => !Object.values(ELEM_HITS).includes(s)), PVP_STATUSES);
  const near = (x, y, r) => room._pvpAreaPlayers(IDS.A, P.A, x, y, r, T).map((p) => p.pid);
  P.C.x = 50;
  check('a duel partner in the circle is someone you are fighting', near(0, 0, 100).includes(IDS.B), near(0, 0, 100));
  check('...a stranger in town is not: no fight is allowed with them', !near(0, 0, 100).includes(IDS.C));
  /* the No man's land case: allowed, but not yet fought */
  const realAllowed = room._pvpAllowed;
  room._pvpAllowed = () => true;
  check('allowed but never fought: a bystander, not hit', !near(0, 0, 100).includes(IDS.C));
  room._notePvpEngage(IDS.A, IDS.C, T);
  check('...after a trade of blows, someone you are fighting', near(0, 0, 100).includes(IDS.C));
  T += PVP_EXTRAS.ENGAGE_MS + 1;
  check('...and a bystander again ENGAGE_MS after the last blow', !near(0, 0, 100).includes(IDS.C));
  room._pvpAllowed = realAllowed;
  check('a named target needs only the fight to be allowed (the duel partner)',
    !!room._pvpNamedPlayer(IDS.A, P.A, IDS.B) && !room._pvpNamedPlayer(IDS.A, P.A, IDS.C));
  check('...never yourself, nor a name that is not a player', !room._pvpNamedPlayer(IDS.A, P.A, IDS.A) && !room._pvpNamedPlayer(IDS.A, P.A, '__proto__'));
  room._liveFlags = { pvpextras: false };
  check('pvpextras: false -- no player in any circle', near(0, 0, 5000).length === 0);
  room._liveFlags = {};
}

// ── 1b. v2.3.3523: WHICH WAY -- an area move reaches a player its caster struck ──
/* The owner: "keep the behavior of needing to confirm the "attack" button
   that pops up in the window first before any damage is registered to either
   player in the wilderness".  Being struck is not choosing to fight: the one
   attacked must not catch the attacker in a whirlwind (a burst, a splash, a
   blast) before their own first blow -- which the game sends only after its
   window's Attack (src/game/nmlAsk.js "Hit back <name>?"). */
{
  resetAll(); T += 10000;
  const near = (who, x, y, r) => room._pvpAreaPlayers(IDS[who], P[who], x, y, r, T).map((p) => p.pid);
  const realAllowed = room._pvpAllowed;
  room._pvpAllowed = () => true;   /* No man's land: allowed, nobody consented */
  P.C.x = 50;
  room._notePvpEngage(IDS.C, IDS.A, T);   /* C struck A */
  check('1b. C struck A: C is fighting A (its area moves reach A)', near('C', 50, 0, 100).includes(IDS.A));
  check('1b. ...but A, who was only struck, is NOT fighting C: its area moves pass C by', !near('A', 0, 0, 100).includes(IDS.C), near('A', 0, 0, 100));
  room._notePvpEngage(IDS.A, IDS.C, T + 1);   /* A strikes back */
  check('1b. ...until A lands a blow on C: then both are', near('A', 0, 0, 100).includes(IDS.C) && near('C', 50, 0, 100).includes(IDS.A));
  T += PVP_EXTRAS.ENGAGE_MS + 2;
  check('1b. ...and ENGAGE_MS after the last blow neither is', !near('A', 0, 0, 100).includes(IDS.C) && !near('C', 50, 0, 100).includes(IDS.A));
  /* the pair keyed either way round: the lower id first (_pvpPairKey) */
  room._notePvpEngage(IDS.A, IDS.C, T);
  check('1b. the direction holds whichever id sorts first (A struck C: A fights C, C not A)',
    near('A', 0, 0, 100).includes(IDS.C) && !near('C', 50, 0, 100).includes(IDS.A));
  /* the kill switch: either way, as before */
  T += PVP_EXTRAS.ENGAGE_MS + 2;
  room._notePvpEngage(IDS.C, IDS.A, T);
  room._liveFlags = { areachoice: false };
  check('1b. areachoice: false -- a blow either way, as before v2.3.3523 (C struck A: A fights C)', near('A', 0, 0, 100).includes(IDS.C));
  room._liveFlags = {};
  check('1b. ...and back on, the struck one is not fighting again', !near('A', 0, 0, 100).includes(IDS.C));

  /* end to end: C's real sword claim lands on A, then A whirls */
  const whirl = () => {
    P.A._abilCd = null; P.A.stamina = P.A.maxStamina;
    room._handleAbility(sess('A'), { kind: 'whirl' }); T += STAM_ABILITIES.whirl.windupMs;
    room.eventBuffer.length = 0; room._tickAbilityWindups(T);
    return hitsOn('C').length;
  };
  resetAll(); P.B.x = 9000; P.C.x = 60; T += 10000;
  room._pvpAllowed = () => true;
  room._pvpHitLanes = new Map(); T += 300; room.eventBuffer.length = 0;
  room._resolvePvPAttack(sess('C'), { range: 900, arc: 3, angle: Math.PI, target: IDS.A, kind: 'melee', sw: ++swN });
  const cHit = hitsOn('A').length;
  const struckOnly = whirl();
  room._pvpHitLanes = new Map(); T += 300; room.eventBuffer.length = 0;
  room._resolvePvPAttack(sess('A'), { range: 900, arc: 3, angle: 0, target: IDS.C, kind: 'melee', sw: ++swN });
  const aHit = hitsOn('C').length;
  const afterOwn = whirl();
  check(`1b. C's claim lands on A (${cHit}); A's whirlwind then passes C by (${struckOnly} hits) -- A never struck C`,
    cHit === 1 && struckOnly === 0, { cHit, struckOnly });
  check(`1b. ...A's own blow on C lands (${aHit}), and then A's whirlwind catches C (${afterOwn})`,
    aHit === 1 && afterOwn === 1, { aHit, afterOwn });
  /* the mutation: the old rule (either way) would have hit C on the first whirl */
  resetAll(); P.B.x = 9000; P.C.x = 60; T += 10000;
  room._pvpAllowed = () => true;
  room._pvpHitLanes = new Map(); T += 300; room.eventBuffer.length = 0;
  room._resolvePvPAttack(sess('C'), { range: 900, arc: 3, angle: Math.PI, target: IDS.A, kind: 'melee', sw: ++swN });
  room._liveFlags = { areachoice: false };
  const oldRule = whirl();
  room._liveFlags = {};
  check(`mutation: with the old either-way rule the struck one's whirlwind catches the attacker (${oldRule}) -- the check above catches it`, oldRule === 1, { oldRule });
  room._pvpAllowed = realAllowed;
}

// ── 2. the weapon's element on a player ──
{
  /* v2.3.3513: the gem is the WORKER'S copy of the weapon (weapongem.js), the
     same as a hit on a monster reads -- never the claim's `element`, which
     names frost here.  (Until v2.3.3513 it was the claim's: setting a gem was
     the page's alone, and the worker's copy carried none.) */
  resetAll(); reset('A', 0, { element: 'flame' });
  const h = claim('melee', { element: 'frost' })[0];
  const st = P.B._wst && P.B._wst.statuses;
  check('a flame gem burns a player: the hit says elem flame, st burn', !!h && h.elem === 'flame' && h.st === 'burn' && h.stMs === 4000, h);
  check('...the element is the worker\'s copy of the weapon, never the claim\'s (which named frost)',
    P.A.weapon.element1 === 'flame' && !!st && !!st.burn && Object.keys(st).length === 1, st && Object.keys(st));
  resetAll();
  const hNone = claim('melee', { element: 'flame' })[0];
  check('...and a claimed element with no gem in the weapon is no element at all', !!hNone && !hNone.st && !hNone.elem && !P.B._wst, hNone);
  room._liveFlags = { weapongem: false };
  const hWire = claim('melee', { element: 'flame' })[0];
  room._liveFlags = {};
  check('...unless `weapongem: false` in liveflags: the claim\'s again, as before', !!hWire && hWire.elem === 'flame' && hWire.st === 'burn', hWire);
  for (const bad of ['__proto__', 'constructor', 'toString', 'lava', 7, null]) {
    resetAll();
    const hb0 = claim('melee', { element: bad })[0];
    check(`...a claimed element the status table does not have is no element (${String(bad)})`, !!hb0 && !hb0.st && !hb0.elem && !P.B._wst, hb0);
  }
  resetAll(); reset('A', 0, { element: 'flame' });
  const hOld = claim('melee')[0];
  check('...and a claim with none (an older page) takes the worker\'s copy of the weapon', !!hOld && hOld.elem === 'flame' && hOld.st === 'burn', hOld);
  resetAll(); reset('A', 0, { element: 'flame' });   /* v2.3.3513: the gem in the weapon */
  claim('melee', { element: 'flame' });
  const power = elemAttackStat(P.A, 'power', 'sword', opp('B'));
  check('...its power the attacker\'s, priced against the target\'s level as a monster\'s is', st && st.burn.power === power, { got: st && st.burn.power, power });
  /* the same burn on a monster holder, ticked the same way */
  const mh = { statuses: Object.create(null), level: opp('B') };
  applyElementStatus(mh, 'flame', IDS.A, power, T, 1);
  room._tickPvpStatuses(T);   /* the first call sets the clock */
  T += 500;
  room.eventBuffer.length = 0;
  room._tickPvpStatuses(T);
  const mev = tickElementStatuses(mh, 0.5, T);
  const tick = hitsOn('B').find((p) => p.ability === 'burn');
  check('a burn tick on a player is the tick a monster takes (5 + 0.3 x power, every 0.5 s)',
    !!tick && mev.length === 1 && tick.dmgBase === mev[0].dmg && tick.dmgTaken === mev[0].dmg && tick.elem === 'flame', { tick, mev });
  check('...from the one who lit it, unblockable', !!tick && tick.attacker === IDS.A && tick.blocked === false);
  /* a blocked blow carries nothing */
  resetAll(); reset('A', 0, { element: 'flame' });
  P.B.blocking = true; P.B.ba = Math.PI; P.B.blockStartT = T - 5000;
  const hb = claim('melee')[0];
  check('a blocked blow carries no status', !!hb && hb.blocked === true && !hb.st && !(P.B._wst), hb);
  /* venom: a root holds by the slime's rule */
  resetAll(); reset('A', 0, { element: 'venom' });
  const hv = claim('melee')[0];
  check('a venom gem roots: held as a slime holds (st stuck, STUCK.MS)', !!hv && hv.elem === 'venom' && hv.st === 'stuck' && hv.stMs === STUCK.MS
    && P.B._stuckUntil === T + STUCK.MS && P.B._stuckImmuneUntil === T + STUCK.MS + STUCK.IMMUNE_MS, hv);
  const hv2 = claim('melee')[0];
  check('...and not again until STUCK.IMMUNE_MS after (a player cannot be locked down)', !!hv2 && !hv2.st && !!P.B._wst.statuses.root, hv2);
  check('...while the root itself runs its full length (5 s, refreshed), as on a monster', P.B._wst.statuses.root.remaining > 4.9, P.B._wst.statuses.root);
  /* frost: a freeze dazes by the rock's rule */
  resetAll(); reset('A', 0, { element: 'frost' });
  const hf = claim('melee')[0];
  check('a frost gem freezes: dazed as a rock dazes (st daze, DAZE.MS)', !!hf && hf.elem === 'frost' && hf.st === 'daze' && hf.stMs === DAZE.MS
    && P.B._dazeImmuneUntil === T + DAZE.MS + DAZE.IMMUNE_MS, hf);
  /* wind: a slow at the monster's 0.4 */
  resetAll(); reset('A', 0, { element: 'wind' });
  const hw = claim('melee')[0];
  check('a wind gem slows: st slow, x0.4 (a monster\'s slow), its full 5 s', !!hw && hw.st === 'slow' && hw.mult === PVP_EXTRAS.SLOW_MULT && hw.stMs === 5000, hw);
  /* water: a soak is a player's slower stamina */
  resetAll(); reset('A', 0, { element: 'water' });
  const hs = claim('melee')[0];
  check('a water gem soaks: st soak, and the regen tick reads it', !!hs && hs.st === 'soak' && P.B._soakUntil === T + 5000
    && room._soakRegenMult(P.B, T) < 1, hs);
  /* stone: fracture, on the sources it amplifies on a monster */
  resetAll(); reset('A', 0, { element: 'stone' });
  const f1 = claim('melee')[0];
  const f2 = claim('melee')[0];
  check('a stone gem fractures: st fracture, stacks counted', !!f1 && f1.st === 'fracture' && f1.stacks === 1 && !!f2 && f2.stacks === 2, { f1, f2 });
  /* dmgBase is the roll (the same both times); what it takes is the roll x
     1.06, rounded once -- a monster's Math.round(capped x fractureDmgMult) */
  check('...and the next weapon hit takes +6% a stack, as a monster does', !!f1 && !!f2 && f1.dmgBase === f2.dmgBase
    && f1.dmgTaken === f1.dmgBase && f2.dmgTaken === Math.max(1, Math.round(f1.dmgBase * 1.06)), { first: f1 && f1.dmgTaken, second: f2 && f2.dmgTaken, roll: f1 && f1.dmgBase });
  /* an ability strike does not read it, on a monster or a player */
  room.eventBuffer.length = 0; T += 300;
  room._abilityStrikePlayer(IDS.A, P.A, IDS.B, P.B, 'bash', STAM_ABILITIES.bash);
  const bashed = hitsOn('B')[0];
  const bashRoll = Math.max(1, Math.round(room._computeAttackDamage(P.A, 'melee', false, { targetLevel: opp('B') }).dmg * STAM_ABILITIES.bash.dmgMult));
  check('...an ability strike on a fractured player is not amplified (a monster\'s never is)', !!bashed && bashed.dmgBase === bashRoll, { got: bashed && bashed.dmgBase, bashRoll });
  /* flora: thorns bite the thorned one when THEY attack */
  resetAll(); reset('A', 0, { element: 'flora' });
  const ht = claim('melee')[0];
  check('a flora gem thorns: st thorn', !!ht && ht.st === 'thorn', ht);
  const thSt = P.B._wst.statuses.thorn;
  room._pvpHitLanes = new Map(); T += 300; room.eventBuffer.length = 0;
  room._resolvePvPAttack(sess('B'), { range: 900, arc: 7, angle: Math.PI, target: IDS.A, kind: 'melee', sw: ++swN });
  const recoil = hitsOn('B').find((p) => p.ability === 'thorn');
  check('...a thorned player attacking takes the recoil a monster takes (4 + 0.25 x power), from the one who thorned them',
    !!recoil && recoil.attacker === IDS.A && recoil.dmgBase === thornRecoil(thSt), { recoil, want: thornRecoil(thSt) });
  check('...and their own blow still lands', hitsOn('A').length === 1, hitsOn('A'));
}

// ── 3. a collision on a player ──
{
  resetAll(); reset('A', 0, { element: 'flame' });
  claim('melee');
  const power = elemAttackStat(P.A, 'power', 'sword', opp('B'));
  /* the same flame on a monster holder, at the same moment */
  const mh = { statuses: Object.create(null), level: opp('B') };
  applyElementStatus(mh, 'flame', IDS.A, power, T, 1);
  P.A.weapon.element1 = 'frost';
  const hs = claim('melee');
  applyElementStatus(mh, 'frost', IDS.A, elemAttackStat(P.A, 'power', 'sword', opp('B')), T, 1);
  const col = resolveElementCollision(mh, 'frost', P.A, false, T, 'sword');
  const c = hs.find((p) => p.ability === 'collision');
  check('a second element on a player detonates the first (flame + frost: steam)', !!c && c.collision === 'steam', hs);
  check('...for exactly what it does to a monster', !!c && !!col && c.dmgBase === col.dmg, { got: c && c.dmgBase, monster: col && col.dmg });
  check('...and consumes the burn, as on a monster', !P.B._wst.statuses.burn, P.B._wst && Object.keys(P.B._wst.statuses));
}

// ── 4. no knockback from an ordinary hit on a player (not yet) ──
{
  /* A monster walks a shove back (index.js KB_RECOVER_PX_PER_TICK); a player
     keeping their distance keeps it -- measured on the fight simulator, and
     left to the owner (one-formula.md "Not on players yet") */
  resetAll();
  const h = claim('melee')[0];
  check('a sword hit on a player lands and shoves nothing', !!h && h.dmgTaken > 0 && !h.kb && !(P.B._gustLeft > 0), h);
  R = 0.001; const hc = claim('melee')[0]; R = 0.5;
  check('...nor does a crit', !!hc && hc.isCrit && !hc.kb, hc);
  room._pvpSpecialPaid(P.A, T);
  const hs = claim('melee', { special: true })[0];
  check('...nor a special', !!hs && hs.dmgTaken > 0 && !hs.kb && !(P.B._gustLeft > 0), hs);
  /* the same swing on a monster still shoves it HIT_KNOCKBACK.normal (the
     numbers only got their name) */
  resetAll(); T += 10000;
  const m = monster('mx-kb', 30, 0, opp('B'));
  R = 0.5; room.eventBuffer.length = 0;
  room._handleMonsterDamage(sess('A'), { monsterId: m.id, zone: 'town', slot: 'melee' });
  const mh = room.eventBuffer.find((e) => e.type === 'monster_hit' && e.payload.monsterId === m.id);
  check('...while the same hit on a monster still shoves it HIT_KNOCKBACK.normal', !!mh && !mh.payload.isCrit
    && Math.abs(m.x - (30 + HIT_KNOCKBACK.normal * room._depthK('town', 0))) < 0.01, { x: m.x, hit: mh && mh.payload });
}

// ── 5. the staff's splash and blast ──
{
  resetAll();
  const m = monster('mx-splash', 400, 0, opp('B'));
  P.B.x = 430;   /* duel partner beside the monster */
  P.C.x = 420;   /* a stranger beside it too */
  P.A.activeSlot = 'staff';
  room.eventBuffer.length = 0; T += 1000;
  room._handleMonsterDamage(sess('A'), { monsterId: m.id, zone: 'town', slot: 'staff' });
  const prim = room.eventBuffer.find((e) => e.type === 'monster_hit' && e.payload.monsterId === m.id);
  const roll = room._rollHit(P.A, 'staff', false, { targetLevel: m.level }).dmg;
  const sp = hitsOn('B').find((p) => p.ability === 'splash');
  check('a staff bolt on a monster splashes the player you are fighting beside it', !!prim && !!sp, room.eventBuffer.map((e) => e.type));
  check('...for STAFF_SPLASH.FRAC of the bolt\'s capped roll, as a monster beside it takes', !!sp && sp.dmgBase === Math.max(1, Math.round(roll * STAFF_SPLASH.FRAC)), { got: sp && sp.dmgBase, roll });
  check('...never a stranger beside it', hitsOn('C').length === 0);
  /* a bolt that hit a PLAYER splashes from them */
  resetAll();
  const m2 = monster('mx-near-b', 70, 0, opp('B'));
  P.D.x = 20;   /* the second duel partner, beside B */
  const hs = claim('staff');
  const onB = hs.find((p) => p.target === IDS.B && !p.ability);
  const mSplash = room.eventBuffer.find((e) => e.type === 'monster_hit' && e.payload.monsterId === m2.id);
  const dSplash = hitsOn('D').find((p) => p.ability === 'splash');
  check('a bolt that hits a player splashes the monster beside them (it splashed nothing)', !!onB && !!mSplash && mSplash.payload.splash === true, room.eventBuffer.map((e) => e.type + ':' + (e.payload.monsterId || e.payload.target)));
  check('...and the other player you are fighting beside them, not the one it hit',
    !!dSplash && dSplash.dmgBase === Math.max(1, Math.round(onB.dmgBase * STAFF_SPLASH.FRAC)) && !hitsOn('B').some((p) => p.ability === 'splash'), { dSplash, prim: onB && onB.dmgBase });
  /* the big bolt blasts */
  resetAll();
  P.D.x = 120;   /* 80 px from B: in the blast (90), out of the splash (60) */
  room._pvpSpecialPaid(P.A, T);
  const hb = claim('staff', { special: true, orbs: 3 });
  const big = hb.find((p) => p.target === IDS.B && !p.ability);
  const blast = hitsOn('D').find((p) => p.ability === 'blast');
  check('the big bolt on a player blasts STAFF_BOLT.BLAST round them: a third of the bolt\'s roll',
    !!big && !!blast && blast.dmgBase === Math.max(1, Math.round(big.dmgBase * STAFF_BOLT.BLAST.FRAC)), { big: big && big.dmgBase, blast });
}

// ── 6. the Element Burst ──
{
  resetAll(); reset('A', 0, { element: 'flame' });
  P.B.x = 40; P.C.x = 30;
  room.eventBuffer.length = 0; T += 1000;
  room._handleElementBurst(sess('A'));
  const b = hitsOn('B').find((p) => p.ability === 'burst');
  const rolled = room._computeAttackDamage(P.A, 'melee', false, { targetLevel: opp('B') }).dmg;
  const want = Math.max(1, Math.min(room._maxDmgForAttacker(P.A, false) * room._brewMul(P.A), Math.round(rolled * PROG3.BURST_DMG_MULT)));
  check('the burst catches the player you are fighting: the same roll x BURST_DMG_MULT', !!b && b.dmgBase === want, { b, want });
  check('...and puts the element on them, as on a monster', !!b && b.st === 'burn' && !!P.B._wst.statuses.burn, b);
  check('...never a stranger in the circle', hitsOn('C').length === 0);
}

// ── 7. the abilities ──
{
  resetAll();
  const m = monster('mx-ab', 5000, 5000, opp('B'));
  /* bash, naming B as `pid` (a player is never a `targetId`: the sword
     lunge's convention, pvplunge.js) */
  P.B.x = 150;   /* outside the bash's 70 px circle: only the name reaches */
  room.eventBuffer.length = 0; T += 1000;
  room._handleAbility(sess('A'), { kind: 'bash', pid: IDS.B });
  const bh = hitsOn('B').find((p) => p.ability === 'bash');
  const roll = room._computeAttackDamage(P.A, 'melee', false, { targetLevel: opp('B') }).dmg;
  check('a bash naming a player (pid) strikes them, past its 70 px circle: the roll x 0.75, as on a monster', !!bh && bh.dmgBase === Math.max(1, Math.round(roll * STAM_ABILITIES.bash.dmgMult)), { bh, roll });
  check('...the stun as a player takes one (a daze, DAZE.MS) and the bash\'s shove', !!bh && bh.st === 'daze' && bh.stMs === DAZE.MS && bh.kb && bh.kb[0] === STAM_ABILITIES.bash.knockback, bh);
  /* the same bash on a monster of that level */
  const mon = monster('mx-same', 9000, 9000, opp('B'));
  room.eventBuffer.length = 0;
  room._abilityStrikeMonster('town', mon, IDS.A, P.A, 'bash', STAM_ABILITIES.bash);
  const mh = room.eventBuffer.find((e) => e.type === 'monster_hit');
  check('...exactly the number the bash lands on a monster of their level', !!mh && !!bh && mh.payload.dmg === bh.dmgBase, { monster: mh && mh.payload.dmg, player: bh && bh.dmgBase });
  /* a second stun inside the window does not hold */
  P.A._abilCd = null; T += 500; room.eventBuffer.length = 0;
  P.B.x = 150;
  room._handleAbility(sess('A'), { kind: 'bash', pid: IDS.B });
  const bh2 = hitsOn('B').find((p) => p.ability === 'bash');
  check('...and a second stun inside DAZE.IMMUNE_MS does not hold them again', !!bh2 && !bh2.st, bh2);
  /* a player named as targetId is the old monster path: only the circle */
  resetAll(); P.B.x = 150; T += 10000; room.eventBuffer.length = 0;
  room._handleAbility(sess('A'), { kind: 'bash', targetId: IDS.B });
  check('a bash naming a player as targetId (a monster\'s field) reaches only its 70 px circle: nothing at 150 px', hitsOn('B').length === 0);
  resetAll(); P.B.x = 40; T += 10000; room.eventBuffer.length = 0;
  room._handleAbility(sess('A'), { kind: 'bash' });
  check('...a bash naming nobody shoves the player you are fighting in its circle, as the nearest monster', !!hitsOn('B').find((p) => p.ability === 'bash'));
  /* a named bash never lands on a monster beside its player */
  resetAll(); P.B.x = 200; T += 10000; room.eventBuffer.length = 0;
  const nearM = monster('mx-near', 30, 0, opp('B'));
  room._handleAbility(sess('A'), { kind: 'bash', pid: IDS.B });
  check('a bash naming a player never lands on a monster standing beside the basher', nearM.hp === 1e7 && !!hitsOn('B').find((p) => p.ability === 'bash'), { mhp: nearM.hp });
  /* the sword's dash at a player is pvplunge.js's (v2.3.3262): its own rules */
  resetAll(); P.B.x = 300; T += 10000;
  room.eventBuffer.length = 0;
  room._handleAbility(sess('A'), { kind: 'sworddash', pid: IDS.B });
  const dh = hitsOn('B').find((p) => p.ability === 'sworddash');
  check('the sword\'s dash at a player (pid) carries the caster to contact (46 px) and strikes (pvplunge.js)',
    !!dh && Math.abs(P.A.x - (300 - 46)) < 0.01 && dh.dmgTaken > 0, { ax: P.A.x, dh });
  check('...dazed by the lunge\'s rule, and not shoved (pvplunge.js)', !!dh && dh.st === 'daze' && !dh.kb && !(P.B._gustLeft > 0), dh);
  resetAll(); P.B.x = 300; T += 10000; room.eventBuffer.length = 0;
  room._handleAbility(sess('A'), { kind: 'sworddash', targetId: IDS.B });
  check('...a dash naming a player as targetId strikes nobody (no second road to a player)', hitsOn('B').length === 0);
  /* the whirlwind: every player you are fighting in its ring, pulled in */
  resetAll(); P.B.x = 200; P.C.x = 100; T += 10000;
  room.eventBuffer.length = 0;
  room._handleAbility(sess('A'), { kind: 'whirl' });
  T += STAM_ABILITIES.whirl.windupMs;
  room._tickAbilityWindups(T);
  const wh = hitsOn('B').find((p) => p.ability === 'whirl');
  check('the whirlwind catches the player you are fighting in its ring, pulled to its 34 px ring',
    !!wh && wh.kb && wh.kb[0] === -(200 - STAM_ABILITIES.whirl.pullTo) && wh.st === 'daze', wh);
  check('...never a stranger in it', hitsOn('C').length === 0);
  /* the lunge, naming B as `pid` */
  resetAll(); reset('A', 0, { element: 'flame' }); P.B.x = 100; T += 10000;
  room.eventBuffer.length = 0;
  const hit = room._lungeStrike(sess('A'), P.A, null, IDS.B);
  const lh = hitsOn('B').find((p) => p.ability === 'lunge');
  check('the dodge-lunge at a player (pid): 0.6 of the roll, and the weapon\'s element, as on a monster',
    hit === true && !!lh && lh.dmgBase === Math.max(1, Math.round(room._computeAttackDamage(P.A, 'melee', false, { targetLevel: opp('B') }).dmg * LUNGE.dmgMult)) && lh.st === 'burn', lh);
  P.B.x = 400; T += 2000; room.eventBuffer.length = 0;
  check('...out of its reach (220), nothing', room._lungeStrike(sess('A'), P.A, null, IDS.B) === false && hitsOn('B').length === 0);
  resetAll(); P.B.x = 100; T += 10000; room.eventBuffer.length = 0;
  check('...a lunge naming a player as targetId (a monster\'s field) strikes nobody', room._lungeStrike(sess('A'), P.A, IDS.B) === false && hitsOn('B').length === 0);
  check('a bash naming a stranger strikes nobody', (() => { resetAll(); P.C.x = 100; T += 10000; room.eventBuffer.length = 0; room._handleAbility(sess('A'), { kind: 'bash', pid: IDS.C }); return hitsOn('C').length === 0; })());
  /* the lunge's daze rules hold for these too (pvplunge.js _pvpDazed) */
  resetAll(); P.B.x = 150; T += 10000; room.eventBuffer.length = 0;
  P.A._dazeUntil = T + 400;
  room._handleAbility(sess('A'), { kind: 'bash', pid: IDS.B });
  check('a DAZED player\'s bash lands nothing on a player', hitsOn('B').length === 0);
  resetAll(); P.B.x = 150; T += 10000; room.eventBuffer.length = 0;
  P.B.dodging = true; P.B._dazeUntil = T + 400;
  room._handleAbility(sess('A'), { kind: 'bash', pid: IDS.B });
  check('...and a dazed player\'s roll dodges no bash', !!hitsOn('B').find((p) => p.ability === 'bash' && p.dmgTaken > 0));
  resetAll(); P.B.x = 150; T += 10000; room.eventBuffer.length = 0;
  P.B.dodging = true; room._rollStamp(P.B, T);   /* v2.3.3292: a PAID roll -- the claim alone buys nothing (anticheat §10) */
  room._handleAbility(sess('A'), { kind: 'bash', pid: IDS.B });
  check('...while a roll that is not dazed still does (its i-frames)', hitsOn('B').length === 0);
  void m;
}

// ── 8. no volley burn on a player (not yet) ──
{
  /* On a monster the volley's stuck arrows burn it four more ordinary hits
     (projectiles.js); against a player a kiting archer would get all four
     free -- measured, and left to the owner (one-formula.md "Not on players
     yet") */
  resetAll(); T += 10000;
  room._pvpSpecialPaid(P.A, T);
  const a1 = claim('ranged', { special: true, part: 3 });
  check('a volley arrow lands on a player', !!a1.length && a1[0].dmgTaken > 0, a1);
  const after = [];
  for (let i = 0; i < 6; i++) {
    T += 500; room.eventBuffer.length = 0;
    room._tickPvpStatuses(T);
    after.push(...hitsOn('B'));
  }
  check('...and nothing burns on after it', after.length === 0, after);
}

// ── 9. the kill's heal ──
{
  resetAll(); T += 10000;
  /* B wounds A, then A kills B with the sword */
  room._pvpHitLanes = new Map(); room.eventBuffer.length = 0;
  room._resolvePvPAttack(sess('B'), { range: 900, arc: 7, angle: Math.PI, target: IDS.A, kind: 'melee', sw: ++swN });
  const dealt = P.A._dmgFromPlayer && P.A._dmgFromPlayer.get(IDS.B);
  check('what a player deals you is recorded, as a monster\'s is', dealt > 0, dealt);
  P.A.hp = 1000; P.B.hp = 1; P.B.maxHp = 100000;
  WS.A.sent.length = 0;
  claim('melee');
  const ls = WS.A.sent.find((m) => m.type === 'lifesteal_credit');
  check('a melee kill of a player pays 90% of what they dealt you back (melee lifesteal)',
    !!ls && ls.payload.victimId === IDS.B && ls.payload.refund === Math.ceil(dealt * LIFESTEAL_REFUND) && P.A.hp === 1000 + Math.ceil(dealt * LIFESTEAL_REFUND), { ls: ls && ls.payload, hp: P.A.hp });
  /* a bow kill: not melee */
  resetAll(); T += 10000;
  room._pvpHitLanes = new Map();
  room._resolvePvPAttack(sess('B'), { range: 900, arc: 7, angle: Math.PI, target: IDS.A, kind: 'melee', sw: ++swN });
  P.A.hp = 1000; P.B.hp = 1; WS.A.sent.length = 0;
  claim('ranged');
  const ls2 = WS.A.sent.find((m) => m.type === 'lifesteal_credit');
  check('...a bow kill pays none (not-melee), as on a monster', !!ls2 && ls2.payload.refund === 0 && ls2.payload.reason === 'not-melee' && P.A.hp === 1000, ls2 && ls2.payload);
}

// ── 10. the ticks stop when the two may no longer fight ──
{
  resetAll(); reset('A', 0, { element: 'flame' }); T += 10000;
  claim('melee');
  room._tickPvpStatuses(T);
  room._pvpConsent = new Map();   /* the duel is over */
  T += 500; room.eventBuffer.length = 0;
  room._tickPvpStatuses(T);
  check('a burn goes out when the duel ends: no tick, the status gone', hitsOn('B').length === 0 && !(P.B._wst && P.B._wst.statuses.burn), hitsOn('B'));
  resetAll(); reset('A', 0, { element: 'flame' }); T += 10000;
  claim('melee');
  room._handlePlayerDeath(P.B, IDS.B, 'test');
  check('...and with a death', !P.B._wst && !room._pvpStPlayers.has(IDS.B));
}

// ── 11. the kill switches ──
for (const flag of ['pvpextras', 'oneformula', 'pvpbalance']) {
  resetAll(); reset('A', 0, { element: 'flame' }); T += 10000;
  room._liveFlags = { [flag]: false };
  const h = claim('melee')[0];
  room.eventBuffer.length = 0;
  P.A._abilCd = null;
  room._handleAbility(sess('A'), { kind: 'bash', pid: IDS.B });
  check(flag + ': false -- a hit carries no status and no shove, and a bash naming a player strikes nobody',
    !!h && !h.st && !h.kb && !(P.B._wst) && hitsOn('B').length === 0, { h, more: hitsOn('B') });
  room._liveFlags = {};
}
{
  /* the cap a joining page reads, on and off */
  const capsOf = (ws) => { const m = ws.sent.find((x) => x.type === 'state_sync'); return m && m.caps; };
  const wsE = fakeWs();
  room._liveFlags = {};
  await join(wsE, 'bp_px_e');
  const on = capsOf(wsE);
  const wsF = fakeWs();
  room._liveFlags = { pvpextras: false };
  await join(wsF, 'bp_px_f');
  const off = capsOf(wsF);
  room._liveFlags = {};
  check('caps.pvpextras is advertised at the join, and `pvpextras: false` takes it down',
    !!on && on.pvpextras === true && !!off && off.pvpextras === false, { on: on && on.pvpextras, off: off && off.pvpextras });
}

// ── 12. mutations: each guard is what the checks above lean on ──
{
  /* a whirlwind with the bystander rule broken hits the bystander */
  resetAll(); P.B.x = 9000; P.C.x = 100; T += 10000;
  const realAllowed = room._pvpAllowed, realEng = room._pvpEngaged;
  room._pvpAllowed = () => true;
  room._handleAbility(sess('A'), { kind: 'whirl' }); T += STAM_ABILITIES.whirl.windupMs;
  room.eventBuffer.length = 0; room._tickAbilityWindups(T);
  const honest = hitsOn('C').length;
  room._pvpEngaged = () => true;
  P.A._abilCd = null; P.A.stamina = P.A.maxStamina;
  room._handleAbility(sess('A'), { kind: 'whirl' }); T += STAM_ABILITIES.whirl.windupMs;
  room.eventBuffer.length = 0; room._tickAbilityWindups(T);
  const broken = hitsOn('C').length;
  room._pvpAllowed = realAllowed; room._pvpEngaged = realEng;
  check('mutation: without the "already fighting" rule a whirlwind hits the bystander (the check catches it)', honest === 0 && broken === 1, { honest, broken });
  /* with the hold's immunity ignored, a second stun would hold */
  resetAll(); T += 10000;
  const realHold = room._pvpHold;
  room._pvpHold = function (ps, kind, now, w) { ps._dazeImmuneUntil = 0; ps._stuckImmuneUntil = 0; return realHold.call(this, ps, kind, now, w); };
  room._handleAbility(sess('A'), { kind: 'bash', pid: IDS.B });
  P.A._abilCd = null; P.A.stamina = P.A.maxStamina; T += 500; room.eventBuffer.length = 0;
  room._handleAbility(sess('A'), { kind: 'bash', pid: IDS.B });
  const again = hitsOn('B').find((p) => p.ability === 'bash');
  room._pvpHold = realHold;
  check('mutation: without the immunity a second bash holds again (the check catches it)', !!again && again.st === 'daze', again);
  /* the element from the claim instead of the weapon would freeze -- v2.3.3513:
     the worker reads its own copy (flame: a burn), and a mutant that takes the
     claim's `element` (frost) dazes */
  resetAll(); reset('A', 0, { element: 'flame' }); T += 10000;
  const honestEl = claim('melee', { element: 'frost' })[0];
  resetAll(); reset('A', 0, { element: 'flame' }); T += 10000;
  const realEl = room._weaponHitElement;
  room._weaponHitElement = function (ps, kind) { return { element: 'frost', w: ps.weapon || {} }; };
  const forged = claim('melee', { element: 'frost' })[0];
  room._weaponHitElement = realEl;
  check('mutation: an element taken from the wire would freeze (the check catches it)', !!honestEl && honestEl.st === 'burn' && !!forged && forged.st === 'daze', { honestEl, forged });
}
void ELEMENT_STATUS;

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
