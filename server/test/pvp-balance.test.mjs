/* A FIGHT BETWEEN PLAYERS LASTS LONG ENOUGH TO MATTER -- v2.3.3260
 * (server/src/pvpbalance.js, docs/specs/pvp-fights.md).
 *
 * Owner, after the time-to-kill study: "I want you to plan and implement
 * fixes for all of these ... You're the expert on this not me."
 *
 *   1. The worker rolls every hit between players itself: a forged dmgBase
 *      or critChance buys nothing, and the crit is the real chance.
 *   2. A special is a special only inside the window a PAID swipe opened
 *      (SPECIAL_CLAIMS claims, SPECIAL_WINDOW_MS); a missed claim spends none.
 *   3. One sword hit per swing (`sw`), MELEE_MIN_MS apart; an older page's
 *      sword one per NOSW_LANE_MS.
 *   4. ONE FORMULA (owner, 2026-10-15: "I just want one formula that works
 *      the same across everything", server/src/oneformula.js): the hit is the
 *      roll, whole -- no PvP scale, weight, share or falloff -- then armour.
 *      ONE VERSION (owner, the same day: "the numbers for damage between PVP
 *      and PVE can be exactly the same for each combat skill type ...
 *      Everything is 1 version"): no cap of a player's own, and §8 lands the
 *      same swing, arrow and bolt on a monster and on a player and reads the
 *      same number off both -- the level edge included, both ways.
 *   5. The shapes a special says (orbs, part), each bounded; the big bolt
 *      worth STAFF_BOLT_K of its orbs and a sword's special SWORD_SPECIAL, as
 *      against a monster; a retreat shot whole, as against a monster.
 *   6. The kill switches (`pvpbalance: false`, `oneformula: false`: the
 *      resolver exactly as before).
 *   7. The page's half (src/game/pvpSwing.js): a swing's claim at most three
 *      times, only while in reach, every frame against an older worker.
 */
import { GameRoom } from '../src/index.js';
import { PVP } from '../src/pvpbalance.js';
import { ONE_FORMULA } from '../src/oneformula.js'; /* v2.3.3260: one formula for every fight */
import { STAFF_BOLT, BOW_VOLLEY_WORTH } from '../src/combat.js';
import * as PS from '../../src/game/pvpSwing.js';   /* the page's half */

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b));

/* the worker's clock and dice are the test's */
let T = 1_900_000_000_000;
const realNow = Date.now;
Date.now = () => T;
let R = 0.5;
const realRandom = Math.random;
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
await join(wsA, 'bp_pb_a');
await join(wsB, 'bp_pb_b');
clearInterval(room.tickInterval); room.tickInterval = null;
const A = room.playerState.bp_pb_a, B = room.playerState.bp_pb_b;
const sessA = room.sessions.get(wsA);
check('both players joined (guard)', !!A && !!B && !!sessA);
room._saveRpg = () => {}; room._saveRpgVitals = () => {};
room._queuePlayerStateFlush = () => {};
room.stateHistory = {};

/* A consented pair, so the hits land wherever they stand. */
if (!room._pvpConsent) room._pvpConsent = new Map();
const consent = () => room._pvpConsent.set(room._pvpPairKey('bp_pb_a', 'bp_pb_b'), T + 3600000);
consent();

const WEAPON = { melee: 'greatsword', ranged: 'bow', staff: 'staff' };
const SLOT = { melee: 'weapon', ranged: 'rangedWeapon', staff: 'staffWeapon' };
const CAT = { melee: 'sword', ranged: 'bow', staff: 'staff' };
/* Level 12 in the weapon, a copper one; the target a level-12 bro, no armour
   unless asked, a huge pool so nobody dies mid-check unless asked. */
function arm(kind, opts = {}) {
  for (const c of ['sword', 'bow', 'staff']) A.prog3.sk[c].level = 1;
  A.prog3.sk[CAT[kind]].level = opts.level || 12;
  A.weapon = A.rangedWeapon = A.staffWeapon = null;
  A[SLOT[kind]] = { type: WEAPON[kind], name: kind, tierMult: opts.tm || 1.25, quality: 'normal' };
  A.activeSlot = kind;
  room._prog3Recompute(A);
  A.z = B.z = 'town';
  A.dead = A.dying = A.disconnected = false;
  A.mana = A.maxMana; A.stamina = A.maxStamina; A._buffs = {};
  A._pvpSpecUntil = 0; A._pvpSpecLeft = 0;
  A.x = 0; A.y = 0;
}
function target(opts = {}) {
  B.armor = opts.armor || null; B.legsArmor = opts.legs || null;
  room._prog3Recompute(B);
  /* a deep pool unless asked: nobody dies mid-check (the cap is a share of it) */
  B.maxHp = opts.maxHp || 100000;
  B.hp = opts.hp || B.maxHp;
  B.dead = B.dying = B.disconnected = false;
  B.blocking = false; B.dodging = false; B.def = 0; B._zoneEntryGraceUntil = 0;
  B.x = opts.x != null ? opts.x : 40; B.y = 0;
  consent();   /* a death (the cap's checks) ends the pair's consent */
}
/* every raw damage the resolver hands _applyDamage, for exact arithmetic */
let raws = [];
const origApply = room._applyDamage.bind(room);
room._applyDamage = function (ps, raw, blk, opts) { raws.push({ raw, opts }); return origApply(ps, raw, blk, opts); };
function attack(payload) {
  room.eventBuffer.length = 0; raws = [];
  room._resolvePvPAttack(sessA, Object.assign({ range: 900, arc: 3, angle: 0, target: 'bp_pb_b' }, payload));
  const h = room.eventBuffer.find((e) => e.type === 'pvp_hit');
  return h ? Object.assign({ raw: raws.length ? raws[0].raw : null }, h.payload) : null;
}
const fresh = () => { room._pvpHitLanes = new Map(); T += 5000; };
room._liveFlags = {};

// ── 1. the worker's own roll ──
{
  arm('melee'); target();
  fresh(); const forged = attack({ kind: 'melee', dmgBase: 99999, critChance: 99999, sw: 1 });
  fresh(); const honest = attack({ kind: 'melee', dmgBase: 1, critChance: 0, sw: 2 });
  check('a forged dmgBase rolls exactly what an honest claim rolls (same dice)',
    !!forged && !!honest && forged.dmgBase === honest.dmgBase && forged.dmgTaken === honest.dmgTaken,
    { forged: forged && forged.dmgBase, honest: honest && honest.dmgBase });
  check('...a forged critChance of 99999 is no crit (the real chance is 1% at no Luck)', !!forged && forged.isCrit === false);
  const expect = room._computeAttackDamage(A, 'melee', false).dmg;
  check('the hit is the monster path\'s own roll (_computeAttackDamage)', !!honest && near(honest.dmgBase, expect), { got: honest && honest.dmgBase, expect });
  R = 0.001;   /* under the 1% */
  fresh(); const crit = attack({ kind: 'melee', sw: 3 });
  R = 0.5;
  check('a crit is the worker\'s roll\'s: the dice under 1% crit', !!crit && crit.isCrit === true, crit);
  check('...and the crit is in the hit', !!crit && crit.dmgBase > honest.dmgBase, { crit: crit && crit.dmgBase, plain: honest.dmgBase });
}

// ── 2. ONE FORMULA: the hit is the roll, whole ──
{
  check('no PvP number is left (PVP holds only the lanes and the window)',
    !('SCALE' in PVP) && !('KIND' in PVP) && !('SPECIAL' in PVP) && !('FALLOFF' in PVP) && !('CAP' in PVP) && !('RETREAT_K' in PVP)
      && typeof room._pvpTune !== 'function' && typeof room._pvpFalloff !== 'function' && typeof room._pvpSpecialShare !== 'function', Object.keys(PVP));
  arm('melee'); target();
  fresh(); const m = attack({ kind: 'melee', sw: 10 });
  check('a sword hit: the roll, whole', !!m && near(m.raw, m.dmgBase), m && { raw: m.raw, roll: m.dmgBase });
  arm('ranged'); target({ x: 100 });
  fresh(); const r = attack({ kind: 'ranged' });
  check('an arrow at 100 px: the roll, whole', !!r && near(r.raw, r.dmgBase), r && { raw: r.raw, roll: r.dmgBase });
  target({ x: 800 }); fresh(); const rFar = attack({ kind: 'ranged' });
  check('...and at 800 px: no falloff (an arrow hits a monster as hard far off)', !!rFar && near(rFar.raw, rFar.dmgBase) && near(rFar.dmgBase, r.dmgBase), rFar && { raw: rFar.raw, roll: rFar.dmgBase });
  arm('staff'); target({ x: 800 });
  fresh(); const st = attack({ kind: 'staff' });
  check('a staff bolt far off: the roll, whole', !!st && near(st.raw, st.dmgBase) && near(st.dmgBase, room._computeAttackDamage(A, 'staff', false).dmg), st && { raw: st.raw, roll: st.dmgBase });
}

// ── 3. a special only after a paid swipe ──
{
  arm('melee'); target();
  fresh(); const plain = attack({ kind: 'melee', sw: 20 });
  fresh(); const unpaid = attack({ kind: 'melee', sw: 21, special: true });
  check('special:true with no swipe paid for rolls as an ordinary hit',
    !!plain && !!unpaid && unpaid.dmgBase === plain.dmgBase && near(unpaid.raw, plain.raw), { plain: plain && plain.raw, unpaid: unpaid && unpaid.raw });
  /* the real road: ability_use swipe, charged by the worker */
  A.mana = A.maxMana;
  await room.webSocketMessage(wsA, JSON.stringify({ type: 'ability_use', payload: { type: 'swipe' } }));
  check('a paid swipe (ability_use) opens the window', A._pvpSpecLeft === PVP.SPECIAL_CLAIMS && A._pvpSpecUntil === T + PVP.SPECIAL_WINDOW_MS,
    { left: A._pvpSpecLeft, until: A._pvpSpecUntil - T });
  /* a miss spends nothing */
  room._pvpHitLanes = new Map();
  B.x = 5000;
  attack({ kind: 'melee', sw: 22, special: true });
  check('a special claim that hits nobody spends no claim', A._pvpSpecLeft === PVP.SPECIAL_CLAIMS, A._pvpSpecLeft);
  B.x = 40; T += 300;
  const paid = attack({ kind: 'melee', sw: 23, special: true });
  const spRoll = room._computeAttackDamage(A, 'melee', true).dmg;
  check('inside it the special rolls the special, whole (a sword\'s 4.5x, as on a monster)',
    !!paid && near(paid.dmgBase, spRoll) && near(paid.raw, spRoll), paid && { raw: paid.raw, roll: paid.dmgBase, spRoll });
  R = 0.5;
  const _pl = room._computeAttackDamage(A, 'melee', false).dmg, _sp = room._computeAttackDamage(A, 'melee', true).dmg;
  check('...the sword\'s special is SWORD_SPECIAL x the plain hit (one formula, for every target)',
    Math.abs(_sp / _pl - ONE_FORMULA.SWORD_SPECIAL * room._prog3SpecialMult(A, 'sword')) < 0.05, { plain: _pl, special: _sp });
  check('...and a sword\'s special swing spends the whole window (one swipe, one special)', A._pvpSpecLeft === 0, A._pvpSpecLeft);
  T += 300; const next = attack({ kind: 'melee', sw: 24, special: true });
  check('so the next swing marked special is an ordinary hit', !!next && next.dmgBase === plain.dmgBase, { next: next && next.dmgBase, plain: plain.dmgBase });
  /* it runs out in time too */
  room._pvpSpecialPaid(A, T);
  T += PVP.SPECIAL_WINDOW_MS + 1;
  room._pvpHitLanes = new Map();
  const late = attack({ kind: 'melee', sw: 27, special: true });
  check('a special claim after SPECIAL_WINDOW_MS is ordinary', !!late && late.dmgBase === plain.dmgBase, late && late.dmgBase);
  /* the bow's volley: three arrows, one claim each */
  arm('ranged'); target({ x: 100 });
  fresh(); room._pvpSpecialPaid(A, T);
  const vol = [];
  for (let i = 0; i < 4; i++) { room._pvpHitLanes = new Map(); T += 50; vol.push(attack({ kind: 'ranged', special: true, part: 3 })); }
  const volRoll = room._computeAttackDamage(A, 'ranged', true).dmg * BOW_VOLLEY_WORTH / 3;
  const arrowRoll = room._computeAttackDamage(A, 'ranged', false).dmg;
  check('the volley\'s three arrows each land as a third-ish of the special (WORTH / 3)',
    vol.slice(0, 3).every((h) => h && near(h.dmgBase, volRoll)), vol.map((h) => h && h.dmgBase));
  check('...a fourth arrow on the same swipe is an ordinary arrow', !!vol[3] && near(vol[3].dmgBase, arrowRoll), vol[3] && vol[3].dmgBase);
  /* the big staff bolt: the whole window */
  arm('staff'); target({ x: 100 });
  fresh(); room._pvpSpecialPaid(A, T);
  attack({ kind: 'staff', special: true, orbs: 3 });
  check('the big staff bolt (orbs 3) spends the whole window', A._pvpSpecLeft === 0, A._pvpSpecLeft);
  fresh(); room._pvpSpecialPaid(A, T); room._pvpSpecialSpent(A, 2);
  const short = attack({ kind: 'staff', special: true, orbs: 3 });
  /* v2.3.3261: worth ONE orb (never three) -- the bolt's band x 1 x
     STAFF_BOLT_K, as on a monster whose lane has one slot left (combat.js
     _rollHit, one function for both) */
  check('...and with one claim left it is worth ONE orb (never three), as on a monster',
    !!short && near(short.dmgBase, room._computeAttackDamage(A, 'staff', true, { band: STAFF_BOLT.BAND }).dmg * ONE_FORMULA.STAFF_BOLT_K), short && short.dmgBase);
}

// ── 4. one sword hit per swing ──
{
  arm('melee'); target();
  fresh();
  const a1 = attack({ kind: 'melee', sw: 100 });
  T += 16; const a2 = attack({ kind: 'melee', sw: 100 });
  T += 16; const a3 = attack({ kind: 'melee', sw: 100 });
  check('the claims of one swing land ONE hit', !!a1 && !a2 && !a3);
  T += 200; const b1 = attack({ kind: 'melee', sw: 101 });
  check('a new swing sooner than MELEE_MIN_MS after the last hit lands nothing', !b1);
  T += PVP.MELEE_MIN_MS; const b2 = attack({ kind: 'melee', sw: 101 });
  check('...and lands once MELEE_MIN_MS has passed', !!b2);
  /* a PAID special swing right after a landed hit is not lost to the gap */
  fresh();
  attack({ kind: 'melee', sw: 110 });
  room._pvpSpecialPaid(A, T);
  T += 60; const sp60 = attack({ kind: 'melee', sw: 111, special: true });
  check('a paid special swing 60 ms after a landed hit still lands (the gap is for ordinary swings)', !!sp60, sp60);
  T += 60; const ord = attack({ kind: 'melee', sw: 112 });
  check('...but an ordinary swing 60 ms after that does not', !ord);
  T += 30; const forged = attack({ kind: 'melee', sw: 113, special: true });
  check('...nor a second special claim on the spent window (it is ordinary, inside the gap)', !forged);
  /* an older page says no `sw`: one per NOSW_LANE_MS, longer than its sweep */
  fresh();
  let landed = 0;
  for (let f = 0; f < 24; f++) { if (attack({ kind: 'melee' })) landed++; T += 16.7; }   /* a 400 ms sweep at 60 fps */
  check('an older page\'s 400 ms sweep (24 claims, no sw) lands ONE hit', landed === 1, landed);
  check('NOSW_LANE_MS is longer than the sweep', PVP.NOSW_LANE_MS > 400);
  /* the old path let two through (the 300 ms lane) */
  room._liveFlags = { pvpbalance: false };
  fresh(); landed = 0;
  for (let f = 0; f < 24; f++) { if (attack({ kind: 'melee', dmgBase: 10 })) landed++; T += 16.7; }
  check('(the old path, for the record: the same sweep landed two)', landed === 2, landed);
  room._liveFlags = {};
}

// ── 5. no cap of its own (v2.3.3261, one version) ──
{
  /* the first cut stopped a blow on a player at 30% of their bar; a monster
     had no such cap, so the same hit read two numbers.  Gone. */
  arm('melee', { level: 40, tm: 3 }); target({ maxHp: 200 });
  R = 0.999;   /* the top of the band, no crit */
  room._pvpSpecialPaid(A, T);
  fresh(); room._pvpSpecialPaid(A, T); const big = attack({ kind: 'melee', sw: 200, special: true });
  R = 0.5;
  check('a hit far past the bar is taken whole (no cap of a player\'s own)', !!big && big.raw > 200 && big.dmgTaken === Math.round(big.raw),
    big && { raw: big.raw, taken: big.dmgTaken });
  check('the one formula has no HIT_CAP and no _hitCapHp', !('HIT_CAP' in ONE_FORMULA) && typeof room._hitCapHp !== 'function');
  /* a monster's blow the same: the target's bar does not change a blow */
  const ps = { hp: 1000, maxHp: 1000, armor: null, legsArmor: null };
  const r1 = room._applyDamage(ps, 900, false);
  check('_applyDamage takes a monster\'s 900 whole too', r1.dmgTaken === 900, r1);
}

// ── 6. what a special says it is ──
{
  arm('staff'); target({ x: 100 });
  fresh(); room._pvpSpecialPaid(A, T); const one = attack({ kind: 'staff', special: true });
  fresh(); room._pvpSpecialPaid(A, T); const big = attack({ kind: 'staff', special: true, orbs: 3 });
  const bigRoll = room._computeAttackDamage(A, 'staff', true, { band: STAFF_BOLT.BAND }).dmg * 3 * ONE_FORMULA.STAFF_BOLT_K;
  check('the big staff bolt (orbs 3) rolls the big bolt\'s band x 3 x STAFF_BOLT_K, as on a monster', !!big && near(big.dmgBase, bigRoll), big && { got: big.dmgBase, bigRoll });
  check('...bigger than a plain special bolt', !!one && !!big && big.dmgBase > one.dmgBase);
  fresh(); room._pvpSpecialPaid(A, T); const forged = attack({ kind: 'staff', special: true, orbs: 99 });
  check('orbs past 3 count as 3', !!forged && near(forged.dmgBase, bigRoll), forged && forged.dmgBase);
  fresh(); const unpaidOrbs = attack({ kind: 'staff', orbs: 3, special: true });
  /* fresh() moved the clock past the window the claim above used: this one is ordinary */
  const plainStaff = room._computeAttackDamage(A, 'staff', false).dmg;
  check('orbs on a claim that is no special are ignored', !!unpaidOrbs && near(unpaidOrbs.dmgBase, plainStaff), unpaidOrbs && { got: unpaidOrbs.dmgBase, plainStaff });
  arm('melee'); target();
  fresh(); room._pvpSpecialPaid(A, T); const swordOrbs = attack({ kind: 'melee', special: true, orbs: 3, sw: 300 });
  check('orbs on a sword are ignored', !!swordOrbs && near(swordOrbs.dmgBase, room._computeAttackDamage(A, 'melee', true).dmg), swordOrbs && swordOrbs.dmgBase);

  arm('ranged'); target({ x: 100 });
  fresh(); room._pvpSpecialPaid(A, T); const whole = attack({ kind: 'ranged', special: true });
  fresh(); room._pvpSpecialPaid(A, T); const part = attack({ kind: 'ranged', special: true, part: 3 });
  check('a volley arrow (part 3) is BOW_VOLLEY_WORTH / 3 of the special roll',
    !!whole && !!part && near(part.dmgBase, whole.dmgBase * BOW_VOLLEY_WORTH / 3), { whole: whole && whole.dmgBase, part: part && part.dmgBase });
  fresh(); room._pvpSpecialPaid(A, T); const part9 = attack({ kind: 'ranged', special: true, part: 9 });
  check('...part past 3 counts as 3 (never smaller and never bigger)', !!part9 && near(part9.dmgBase, part.dmgBase), part9 && part9.dmgBase);
  fresh(); const arrow = attack({ kind: 'ranged' });
  fresh(); const retreat = attack({ kind: 'ranged', rs: 1 });
  check('the retreat shot (rs 1) is a whole arrow, as the worker rolls it on a monster', !!arrow && !!retreat && near(retreat.dmgBase, arrow.dmgBase), { arrow: arrow && arrow.dmgBase, rs: retreat && retreat.dmgBase });
}

// ── 8. the kill switch ──
{
  room._liveFlags = { pvpbalance: false };
  arm('melee'); target();
  fresh(); const old = attack({ kind: 'melee', dmgBase: 7, critChance: 0 });
  check('pvpbalance:false: the claim is the hit again (dmgBase 7)', !!old && old.dmgBase === 7, old && old.dmgBase);
  check('...at the old 0.5 scale, no cap handed down', !!old && near(old.raw, 7 * 0.5) && old.cap == null, old && { raw: old.raw, cap: old.cap });
  const wsC = fakeWs();
  await join(wsC, 'bp_pb_c');
  const sync = wsC.sent.find((m) => m.type === 'state_sync' && m.caps);
  check('pvpbalance:false un-advertises caps.pvpbalance', !!sync && sync.caps.pvpbalance === false, sync && sync.caps && sync.caps.pvpbalance);
  room._liveFlags = {};
  const wsD = fakeWs();
  await join(wsD, 'bp_pb_d');
  const sync2 = wsD.sent.find((m) => m.type === 'state_sync' && m.caps);
  check('caps.pvpbalance is advertised by default', !!sync2 && sync2.caps.pvpbalance === true, sync2 && sync2.caps && sync2.caps.pvpbalance);
  check('...and caps.oneformula beside it', !!sync2 && sync2.caps.oneformula === true, sync2 && sync2.caps && sync2.caps.oneformula);
  /* the one formula's switch puts the old resolver back too (its roll needs
     the formula's health), whatever caps.pvpbalance says */
  room._liveFlags = { oneformula: false };
  arm('melee'); target();
  fresh(); const old2 = attack({ kind: 'melee', dmgBase: 7, critChance: 0 });
  check('oneformula:false: the claim is the hit again, at the old 0.5', !!old2 && old2.dmgBase === 7 && near(old2.raw, 7 * 0.5), old2 && { roll: old2.dmgBase, raw: old2.raw });
  const wsE = fakeWs();
  await join(wsE, 'bp_pb_e');
  const sync3 = wsE.sent.find((m) => m.type === 'state_sync' && m.caps);
  check('oneformula:false un-advertises caps.oneformula (the page then reads pvpbalance as off: pvpSwing.js)',
    !!sync3 && sync3.caps.oneformula === false && PS.pvpBalanceOn({ _serverCaps: sync3.caps }) === false, sync3 && sync3.caps && { one: sync3.caps.oneformula, bal: sync3.caps.pvpbalance });
  room._liveFlags = {};
}

// ── 9. a duel runs through the same rules ──
{
  arm('melee'); target();
  room._pvpConsent.delete(room._pvpPairKey('bp_pb_a', 'bp_pb_b'));
  fresh(); const none = attack({ kind: 'melee', sw: 400 });
  check('(guard) with no consent and in town nothing lands', !none);
  consent();
  fresh(); const duel = attack({ kind: 'melee', sw: 401 });
  check('a consented pair (a duel) takes the worker\'s roll, whole', !!duel && near(duel.raw, duel.dmgBase));
}

// ── 10. the page's half (src/game/pvpSwing.js) ──
{
  const S = { _serverCaps: { pvpbalance: true, oneformula: true } };
  const t = 5000000;
  let sent = 0;
  for (let f = 0; f < 24; f++) if (PS.pvpSwingClaimOk(S, 111, t + f * 16.7, true)) sent++;
  check('page: a 400 ms sweep sends its claim at most TRIES times', sent === PS.PVP_SWING.TRIES, sent);
  check('page: ...GAP_MS apart (0, 90, 180)', S._pvpSwSent.n === 3 && S._pvpSwSent.at >= t + 2 * PS.PVP_SWING.GAP_MS, S._pvpSwSent);
  check('page: a new swing starts again', PS.pvpSwingClaimOk(S, 112, t + 600, true) === true);
  const S2 = { _serverCaps: { pvpbalance: true, oneformula: true } };
  let sentOut = 0;
  for (let f = 0; f < 24; f++) if (PS.pvpSwingClaimOk(S2, 7, t + f * 16.7, false)) sentOut++;
  check('page: a swing whose target is out of reach on this screen sends nothing', sentOut === 0, sentOut);
  let sentLate = 0;
  for (let f = 0; f < 24; f++) if (PS.pvpSwingClaimOk(S2, 8, t + f * 16.7, f >= 12)) sentLate++;
  check('page: ...and one that comes into reach mid-sweep still claims', sentLate >= 1, sentLate);
  const old = { _serverCaps: {} };
  let sentOld = 0;
  for (let f = 0; f < 24; f++) if (PS.pvpSwingClaimOk(old, 9, t + f * 16.7, false)) sentOld++;
  check('page: against an older worker every frame claims, as before', sentOld === 24, sentOld);
  const half = { _serverCaps: { pvpbalance: true } };
  let sentHalf = 0;
  for (let f = 0; f < 24; f++) if (PS.pvpSwingClaimOk(half, 10, t + f * 16.7, false)) sentHalf++;
  check('page: ...and against a worker with its one formula switched off (pvpbalance without oneformula)', sentHalf === 24, sentHalf);
  check('page: in reach by the lock\'s drawn position', PS.pvpLockInReach({ renderX: 60, renderY: 0, x: 999, y: 999 }, 0, 0, 50) === true);
  check('page: out of reach past range + slack', PS.pvpLockInReach({ x: 50 + PS.PVP_SWING.SLACK_PX + 1, y: 0 }, 0, 0, 50) === false);
  check('page: no position -> no opinion (the worker decides)', PS.pvpLockInReach({}, 0, 0, 50) === null && PS.pvpLockInReach(null, 0, 0, 50) === null);
  /* the page's tries and the worker's lane, together: one hit a swing */
  arm('melee'); target();
  fresh();
  const P = { _serverCaps: { pvpbalance: true, oneformula: true } };
  let hits = 0;
  const sw = T;
  for (let f = 0; f < 24; f++) {
    if (PS.pvpSwingClaimOk(P, sw, T, true) && attack({ kind: 'melee', sw })) hits++;
    T += 16.7;
  }
  check('page + worker: one swing, one hit', hits === 1, hits);
}

// ── 11. ONE VERSION: the same number on a monster and on a player ──
/* Owner, 2026-10-15: "change it so that the numbers for damage between PVP
   and PVE can be exactly the same for each combat skill type (melee, bow,
   staff) ... Everything is 1 version".  Each check lands one hit on a
   monster (the real _handleMonsterDamage) and the same hit on a player of
   the same level with nothing on (the real _resolvePvPAttack), on the same
   dice, and reads the number off both.  combat.js _rollHit is the one roll;
   the edge reads a monster's level or a player's level as an opponent. */
{
  const savedXp = room._prog3AwardXp;
  room._prog3AwardXp = () => {};   /* no level-ups between the two hits */
  const ZONE = 'meadow';
  const zcfg = room._getZoneConfig(ZONE);
  const spawn = (zcfg && zcfg.spawns && zcfg.spawns[0]) || { arch: 'fodder' };
  let mid = 0;
  const monsterAt = (level) => {
    const m = room._makeZoneMonster(ZONE, zcfg, spawn, 'pb-one-' + (++mid), 40, 0, level);
    m.hp = m.maxHp = 1e7; m.alive = true;
    if (!room.monsters) room.monsters = {};
    room.monsters[ZONE] = [m];
    return m;
  };
  const onMonster = (m, payload) => {
    room.eventBuffer.length = 0;
    m.x = 40; m.y = 0;
    const hp0 = m.hp;
    room._handleMonsterDamage(sessA, Object.assign({ monsterId: m.id, zone: ZONE }, payload));
    return hp0 - m.hp;
  };
  /* the target: a player at `level` in every skill's best, nothing worn, no
     Dodge or Defense, a deep pool */
  const playerAt = (level) => {
    for (const c of ['sword', 'bow', 'staff']) B.prog3.sk[c].level = 1;
    B.prog3.sk.sword.level = level;
    B.prog3.alloc = {};
    target();
    B.z = ZONE;
  };
  const both = (kind, level, payloadM, payloadP, setup) => {
    arm(kind);
    A.z = ZONE;
    if (setup) setup();
    room._prog3Recompute(A);
    const m = monsterAt(level);
    playerAt(level);
    if (payloadM.special) { fresh(); }
    const onM = onMonster(m, payloadM);
    if (payloadP.special) { fresh(); room._pvpSpecialPaid(A, T); } else fresh();
    const h = attack(payloadP);
    return { onM, onP: h ? h.dmgTaken : null, slot: h && h.slot };
  };
  R = 0.5;
  for (const [kind, slot] of [['melee', 'melee'], ['ranged', 'ranged'], ['staff', 'staff']]) {
    const r = both(kind, 12, { slot }, { kind, sw: 4000 + mid });
    check(`a plain ${kind} hit: the same number on a level-12 monster and a level-12 player (${r.onM})`, r.onM > 0 && r.onM === r.onP, r);
    check(`...and the player's hit names its weapon (${slot})`, r.slot === slot, r.slot);
  }
  {
    const r = both('melee', 12, { slot: 'melee', special: true }, { kind: 'melee', special: true, sw: 5000 });
    check(`the sword's special: the same number on both (${r.onM})`, r.onM > 0 && r.onM === r.onP, r);
  }
  {
    const r = both('staff', 12, { slot: 'staff', special: true, orbs: 3 }, { kind: 'staff', special: true, orbs: 3 });
    check(`the staff's big bolt: the same number on both (${r.onM})`, r.onM > 0 && r.onM === r.onP, r);
  }
  {
    const r = both('ranged', 12, { slot: 'ranged', special: true, part: 3 }, { kind: 'ranged', special: true, part: 3 });
    check(`a bow volley arrow: the same number on both (${r.onM})`, r.onM > 0 && r.onM === r.onP, r);
  }
  {
    R = 0.001;   /* a crit on both */
    const r = both('melee', 12, { slot: 'melee' }, { kind: 'melee', sw: 6000 });
    R = 0.5;
    check(`a crit: the same number on both (${r.onM})`, r.onM > 0 && r.onM === r.onP, r);
  }
  /* THE EDGE, BOTH WAYS.  A has Power, Luck and Special points; a target three
     levels above blunts them the same whoever it is. */
  const pts = () => { A.prog3.atk = A.prog3.atk || {}; A.prog3.atk.sword = Object.assign({}, A.prog3.atk.sword || {}, { dmg: 40, luck: 20, special: 20 }); };
  {
    const even = both('melee', 12, { slot: 'melee' }, { kind: 'melee', sw: 7000 }, pts);
    const up = both('melee', 15, { slot: 'melee' }, { kind: 'melee', sw: 7001 }, pts);
    check(`a level-15 target blunts a level-12 player's Power on a monster AND on a player, by the same (${up.onM} vs ${even.onM} at 12)`,
      up.onM < even.onM && up.onM === up.onP && even.onM === even.onP, { even, up });
    const sp = both('melee', 15, { slot: 'melee', special: true }, { kind: 'melee', special: true, sw: 7002 }, pts);
    check(`...and the special's Special points, the same (${sp.onM})`, sp.onM > 0 && sp.onM === sp.onP, sp);
  }
  /* and the guard side: a player's Defense reads the edge against a player
     attacker's level, as against a monster's (_applyDamage's attackerLevel) */
  {
    arm('melee', { level: 12 }); A.z = ZONE;
    playerAt(9);
    fresh(); attack({ kind: 'melee', sw: 8000 });
    const o = raws.length ? raws[0].opts : null;
    check('a player\'s blow tells the target\'s guard its level as an opponent (12), as a monster\'s does',
      !!o && o.attackerLevel === 12, o);
    const g = { hp: 1e6, maxHp: 1e6, prog3: { sk: { sword: { level: 9 }, bow: { level: 1 }, staff: { level: 1 } }, alloc: { def: 60 } } };
    const fromMonster12 = room._applyDamage(Object.assign({}, g), 1000, false, { attackerLevel: 12 }).dmgTaken;
    const fromPlayer12 = room._applyDamage(Object.assign({}, g), 1000, false, { attackerLevel: room._prog3OpponentLevel(A) }).dmgTaken;
    const fromEqual = room._applyDamage(Object.assign({}, g), 1000, false, { attackerLevel: 9 }).dmgTaken;
    check(`...so a level-9 player's Defense cuts a level-12 player's blow as it cuts a level-12 monster's (${fromPlayer12}), less than an equal's (${fromEqual})`,
      fromPlayer12 === fromMonster12 && fromPlayer12 > fromEqual, { fromMonster12, fromPlayer12, fromEqual });
  }
  check('a player\'s level as an opponent is their highest trained skill', room._prog3OpponentLevel({ prog3: { sk: { sword: { level: 3 }, bow: { level: 17 }, staff: { level: 9 } } } }) === 17
    && room._prog3OpponentLevel({}) === 1);
  /* the old path (pvpbalance off) keeps PvP at edge 1, as it was */
  room._liveFlags = { pvpbalance: false };
  arm('melee'); A.z = ZONE; playerAt(15);
  fresh(); attack({ kind: 'melee', dmgBase: 10, sw: 9000 });
  check('...the old path (pvpbalance: false) still reads edge 1 (no attackerLevel)', raws.length > 0 && !(raws[0].opts && raws[0].opts.attackerLevel), raws[0] && raws[0].opts);
  room._liveFlags = {};
  room._prog3AwardXp = savedXp;
  A.z = B.z = 'town';
  room.monsters[ZONE] = [];
}

Date.now = realNow;
Math.random = realRandom;
console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL PASS');
process.exit(failures ? 1 : 0);
