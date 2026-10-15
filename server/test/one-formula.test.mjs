/* ONE FORMULA FOR EVERY FIGHT -- v2.3.3260 (server/src/oneformula.js,
 * docs/specs/one-formula.md).
 *
 * Owner, 2026-10-15: "Is there a way you can adjust like starting hp, damage,
 * special attack damage, etc so that there's no special "PvP" versus "PVE"
 * formulas? I just want one formula that works the same across everything".
 *
 *   1. HEALTH: 100 + 50 a level + 40 a Max HP point (the old 100 + 6 + 8 with
 *      the switch off); a joined player's bar follows it.
 *   2. MONSTERS: every monster's hit x monsterHitK(level), so a monster takes
 *      the SAME SHARE of a matching player's bar as before, at every level;
 *      stamped (`_hk`); the page's createMonster agrees; the two flat amounts
 *      (the slime's burst, the fire trail) scaled too.
 *   3. ONE VERSION (owner, the same day: "the numbers for damage between PVP
 *      and PVE can be exactly the same ... Everything is 1 version"): no cap
 *      of a player's own -- a blow is taken whole, whoever lands it, and the
 *      same hit reads the same on a monster and a player (pvp-balance §11
 *      lands them both); a fish heals its fixed number.
 *   4. SPECIALS: a sword's 4.5x, the bow's 3x, the staff's orb 2x; the
 *      ceiling covers the sword's; the big bolt worth 0.6 of its orbs.
 *   5. A bar that changed size keeps how full it was: at the join, and when
 *      the switch is thrown (every bar and every live monster re-sized).
 *   6. caps.oneformula, and `oneformula: false` puts all of it back.
 */
import { GameRoom } from '../src/index.js';
import { ONE_FORMULA, healthAt, monsterHitK, specialMultFor } from '../src/oneformula.js';
import { ARCHETYPES, MONSTER_DMG_CURVE } from '../src/data.js';
import { FIRE_TRAIL } from '../src/firetrail.js';
import { STAFF_BOLT } from '../src/combat.js';
import * as PAGE from '../../src/data/oneFormula.js';
import { createMonster as pageCreateMonster } from '../../src/data/gameSystems.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

function makeState(seed) {
  const store = new Map(seed || []);
  return {
    _store: store,
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
const settle = () => new Promise((r) => setTimeout(r, 5));

const state = makeState();
const room = new GameRoom(state, mockEnv);
async function join(ws, id, data) {
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 0, lastPing: 0, lastRecv: Date.now() });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: id, phrase: 'p-' + id, protocolVersion: 2, data: data || { x: 0, y: 0, z: 'town' } }));
  await settle();
}
room._liveFlags = {};

// ── 1. health ──
{
  check('the numbers: 100 + 50 a level + 40 a point (and the old 100 + 6 + 8)',
    ONE_FORMULA.HEALTH.BASE === 100 && ONE_FORMULA.HEALTH.PER_LEVEL === 50 && ONE_FORMULA.HEALTH.PER_POINT === 40
      && ONE_FORMULA.OLD_HEALTH.PER_LEVEL === 6 && ONE_FORMULA.OLD_HEALTH.PER_POINT === 8, ONE_FORMULA);
  check('healthAt: a new character (level 3) 250, was 118', healthAt(3, 0) === 250 && healthAt(3, 0, false) === 118);
  check('healthAt: level 22 with 10 points 1600, was 312', healthAt(22, 10) === 1600 && healthAt(22, 10, false) === 312);
  const ws = fakeWs();
  await join(ws, 'bp_of_a');
  const A = room.playerState.bp_of_a;
  check('a joined player\'s bar is the formula\'s (level 3: 250)', A.maxHp === 250 && A.level === 3, { maxHp: A.maxHp, level: A.level });
  A.prog3.sk.sword.level = 20; A.prog3.alloc = Object.assign(A.prog3.alloc || {}, { hp: 5 });
  room._prog3Recompute(A);
  check('...and grows 50 a level and 40 a point (sword 20, 5 points: 100 + 50 x 22 + 200)', A.maxHp === 100 + 50 * 22 + 40 * 5, A.maxHp);
  room._liveFlags = { oneformula: false };
  room._prog3Recompute(A);
  check('oneformula:false: the old bar (100 + 6 x 22 + 8 x 5)', A.maxHp === 100 + 6 * 22 + 8 * 5, A.maxHp);
  room._liveFlags = {};
  room._prog3Recompute(A);
}

// ── 2. monsters hit as hard, against the bar, as they did ──
{
  check('monsterHitK: 1 with the formula off', monsterHitK(10, false) === 1);
  check('monsterHitK(1) is a level-3 player\'s new bar over the old (250 / 118)', Math.abs(monsterHitK(1) - 250 / 118) < 1e-12, monsterHitK(1));
  /* the share of a matching player's bar, before and after, at every level */
  const worst = [];
  for (let lvl = 1; lvl <= 60; lvl++) {
    const base = room._monsterStat(MONSTER_DMG_CURVE.base, lvl, MONSTER_DMG_CURVE.ramp, MONSTER_DMG_CURVE.plateau, MONSTER_DMG_CURVE.endgame);
    const oldDmg = Math.ceil(base * ARCHETYPES.fodder.dmgMult);
    const newDmg = Math.max(1, Math.ceil(oldDmg * monsterHitK(lvl)));
    const c = lvl + ONE_FORMULA.MATCH_LEVEL;
    const oldShare = oldDmg / healthAt(c, 0, false), newShare = newDmg / healthAt(c, 0);
    worst.push(Math.abs(newShare / oldShare - 1));
  }
  const w = Math.max(...worst);
  check('a monster of every level 1-60 takes the same share of a matching player\'s bar as before (within its rounding)', w < 0.05, { worst: w });
  /* the worker's own monsters carry it, stamped */
  const zone = room._getZoneConfig('meadow');
  const spawn = (zone && zone.spawns && zone.spawns[0]) || { arch: 'fodder' };
  let bad = [];
  for (const lvl of [1, 5, 12, 25, 40]) {
    const m = room._makeZoneMonster('meadow', zone, spawn, 'of-' + lvl, 100, 100, lvl);
    const base = room._monsterStat(MONSTER_DMG_CURVE.base, lvl, MONSTER_DMG_CURVE.ramp, MONSTER_DMG_CURVE.plateau, MONSTER_DMG_CURVE.endgame);
    const want = Math.max(1, Math.ceil(Math.ceil(base * room._getArchetype(spawn.arch).dmgMult) * monsterHitK(lvl)));
    if (m.dmg !== want || m._hk !== monsterHitK(lvl)) bad.push({ lvl, got: m.dmg, want, hk: m._hk });
    /* the page's mirror (a scene's monster) agrees, with its flag on */
    PAGE.setOneFormulaEnabled(true);
    const pm = pageCreateMonster('p-' + lvl, spawn.arch, lvl, 0, 0, null);
    PAGE.setOneFormulaEnabled(false);
    if (pm.dmg !== m.dmg) bad.push({ lvl, page: pm.dmg, worker: m.dmg });
  }
  check('_makeZoneMonster builds every monster\'s hit x monsterHitK, stamped `_hk`, and the page\'s createMonster agrees', bad.length === 0, bad);
  room._liveFlags = { oneformula: false };
  const mOff = room._makeZoneMonster('meadow', zone, spawn, 'of-off', 100, 100, 12);
  const baseOff = room._monsterStat(MONSTER_DMG_CURVE.base, 12, MONSTER_DMG_CURVE.ramp, MONSTER_DMG_CURVE.plateau, MONSTER_DMG_CURVE.endgame);
  check('...and with the switch off, the old hit (x1)', mOff.dmg === Math.ceil(baseOff * room._getArchetype(spawn.arch).dmgMult) && mOff._hk === 1, mOff.dmg);
  room._liveFlags = {};
  /* the fire trail's flat amount, by the goblin's level */
  const ws = fakeWs();
  await join(ws, 'bp_of_f');
  const F = room.playerState.bp_of_f;
  F.z = 'ember'; F.maxHp = 100000; F.hp = 100000; F.agility = 0; F._zoneEntryGraceUntil = 0; F.prog3.alloc = {};
  const hp0 = F.hp;
  room._fireTrailHitPlayer('ember', { lvl: 10, mid: 'g1' }, 'bp_of_f');
  check('the fire trail\'s flat amount x monsterHitK at the goblin\'s level', hp0 - F.hp === Math.ceil(FIRE_TRAIL.DMG * monsterHitK(10)), { took: hp0 - F.hp, want: Math.ceil(FIRE_TRAIL.DMG * monsterHitK(10)) });
}

// ── 3. one version: no cap of a player's own ──
{
  /* the first cut stopped every blow on a player at 30% of their bar; a
     monster had none, so one hit read two numbers.  Gone. */
  const ps = () => ({ hp: 10000, maxHp: 1000, z: 'meadow' });
  const a = ps(); const ra = room._applyDamage(a, 5000, false, { attackerLevel: 5 });
  check('a monster\'s swing of 5000 on a 1000 bar is taken whole', ra.dmgTaken === 5000, ra);
  const b = ps(); const rb = room._applyDamage(b, 5000, false, { elemental: true });
  check('an elemental blast too', rb.dmgTaken === 5000, rb);
  check('no HIT_CAP, no _hitCapHp, no hitCapHp on the page', !('HIT_CAP' in ONE_FORMULA) && typeof room._hitCapHp !== 'function'
    && !('HIT_CAP' in PAGE.ONE_FORMULA) && typeof PAGE.hitCapHp !== 'function');
  /* the monsters' own rails are untouched: half the bar for a telegraphed
     hit (telegraph.js TELEGRAPH.MAX_HIT_PCT) is the monster's, not the bar's */
}

// ── 3b. a monster's hit says the HP it left, as a player's does ──
/* v2.3.3263: every screen draws a hit on a player as the change in their bar
   (gameEvents.js takenFigure), from the worker's `hp` -- pvp_hit carried it
   since v2.3.1917, monster_attack now too */
{
  const ws = fakeWs();
  await join(ws, 'bp_of_s');
  const P = room.playerState.bp_of_s;
  P.z = 'meadow'; P.x = 100; P.y = 100; P.maxHp = 700; P.hp = 650; P._zoneEntryGraceUntil = 0;
  P.prog3.alloc = {}; P.blocking = false; P.dodging = false; P.armor = null; P.legsArmor = null;
  const zone = room._getZoneConfig('meadow');
  const spawn = (zone && zone.spawns && zone.spawns[0]) || { arch: 'fodder' };
  const m = room._makeZoneMonster('meadow', zone, spawn, 'of-strike', 120, 100, 12);
  room.eventBuffer.length = 0;
  room._monsterStrikePlayer('meadow', m, 'bp_of_s', m.x, m.y);
  const ev = room.eventBuffer.find((e) => e.type === 'monster_attack' && e.payload.targetId === 'bp_of_s');
  check('monster_attack carries the HP the blow left (`hp`), as pvp_hit does', !!ev && typeof ev.payload.hp === 'number'
    && ev.payload.hp === Math.round(P.hp) && (ev.payload.dmgTaken === 0 || ev.payload.hp === 650 - ev.payload.dmgTaken),
    ev && { hp: ev.payload.hp, taken: ev.payload.dmgTaken, now: P.hp });
}

// ── 4. the specials ──
{
  check('a special\'s multiplier: sword 4.5, bow 3, staff 2 (sword 3 off)',
    specialMultFor('greatsword') === 4.5 && specialMultFor('sword') === 4.5 && specialMultFor('bow') === 3 && specialMultFor('staff') === 2
      && specialMultFor('greatsword', false) === 3, [specialMultFor('greatsword'), specialMultFor('bow'), specialMultFor('staff')]);
  const ws = fakeWs();
  await join(ws, 'bp_of_s');
  const S = room.playerState.bp_of_s;
  S.weapon = { type: 'greatsword', name: 'sword', tierMult: 1.25, quality: 'normal' };
  S.activeSlot = 'melee';
  const realRandom = Math.random;
  Math.random = () => 0.5;
  const plain = room._computeAttackDamage(S, 'melee', false).dmg;
  const special = room._computeAttackDamage(S, 'melee', true).dmg;
  Math.random = realRandom;
  check('a sword special rolls 4.5x the plain hit (x the Special stat)', Math.abs(special / plain - 4.5 * room._prog3SpecialMult(S, 'sword')) < 0.05, { plain, special });
  /* the ceiling covers the biggest legitimate sword special (top of band, a crit) */
  Math.random = () => 0.999;
  let top = 0;
  for (let i = 0; i < 3; i++) top = Math.max(top, room._computeAttackDamage(S, 'melee', true).dmg);
  Math.random = () => 0.0;   /* a crit (the 1% floor) at the bottom of the band */
  const crit = room._computeAttackDamage(S, 'melee', true);
  Math.random = realRandom;
  const ceil = room._maxDmgForAttacker(S, true);
  check('the anticheat ceiling still covers a sword special at its top and on a crit', top <= ceil && crit.dmg <= ceil, { top, crit: crit.dmg, ceil });
  check('...and the ceiling moved with it (a 4.5 lane)', ceil >= room._maxWeaponDmg(S, true) * 4.5, { ceil, base: room._maxWeaponDmg(S, true) });
  check('the big bolt is worth STAFF_BOLT_K of its orbs (0.6)', ONE_FORMULA.STAFF_BOLT_K === 0.6 && STAFF_BOLT.BAND[1] === 2.5);
  check('the page\'s copy: the same multipliers', PAGE.specialMultFor('greatsword', true) === 4.5 && PAGE.staffBoltK(true) === 0.6 && PAGE.staffBoltK(false) === 1);
}

// ── 5. a bar that changed size keeps how full it was ──
{
  /* a character saved under the old formula, at full and at half */
  const st = makeState([
    ['rpg:bp_of_full', { v: 99, hp: 118, maxHp: 118, level: 3, prog3: { sk: { sword: { level: 1, xp: 0 }, bow: { level: 1, xp: 0 }, staff: { level: 1, xp: 0 } }, atk: {}, alloc: {}, pool: 0 } }],
    ['rpg:bp_of_half', { v: 99, hp: 59, maxHp: 118, level: 3, prog3: { sk: { sword: { level: 1, xp: 0 }, bow: { level: 1, xp: 0 }, staff: { level: 1, xp: 0 } }, atk: {}, alloc: {}, pool: 0 } }],
  ]);
  const r2 = new GameRoom(st, mockEnv);
  r2._liveFlags = {};
  const j = async (id) => {
    const ws = fakeWs();
    r2.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 0, lastPing: 0, lastRecv: Date.now() });
    await r2.webSocketMessage(ws, JSON.stringify({ type: 'join', id, name: id, phrase: 'p-' + id, protocolVersion: 2, data: { x: 0, y: 0, z: 'town' } }));
    await settle();
    return r2.playerState[id];
  };
  const full = await j('bp_of_full'), half = await j('bp_of_half');
  clearInterval(r2.tickInterval); r2.tickInterval = null;
  check('logged out at full under the old bar, back at FULL under the new (250 of 250)', !!full && full.maxHp === 250 && full.hp === 250, full && { hp: full.hp, max: full.maxHp });
  check('...at half, back at half (125 of 250)', !!half && half.maxHp === 250 && half.hp === 125, half && { hp: half.hp, max: half.maxHp });

  /* the switch thrown with players on: every bar, every live monster */
  const ws = fakeWs();
  await join(ws, 'bp_of_k');
  const K = room.playerState.bp_of_k;
  room._prog3Recompute(K);
  K.hp = Math.round(K.maxHp * 0.6);
  const zone = room._getZoneConfig('meadow');
  const spawn = (zone && zone.spawns && zone.spawns[0]) || { arch: 'fodder' };
  room.monsters['of-zone'] = [room._makeZoneMonster('meadow', zone, spawn, 'of-k1', 0, 0, 12)];
  const m = room.monsters['of-zone'][0];
  const dmgOn = m.dmg, maxOn = K.maxHp;
  /* through the admin route, as the operator throws it */
  const json = (o) => o;
  await room._liveopsRoutes({ method: 'POST', json: async () => ({ name: 'oneformula', value: false }) }, new URL('http://x/admin/flags'), '/flags', json);
  check('oneformula:false through the admin route: the bar is the old one at once', K.maxHp === healthAt(K.level, 0, false), { max: K.maxHp, want: healthAt(K.level, 0, false) });
  check('...and as full as it was (60%)', Math.abs(K.hp / K.maxHp - 0.6) < 0.02, { hp: K.hp, max: K.maxHp });
  check('...and the live monster hits as it did before the formula', Math.abs(m.dmg - dmgOn / monsterHitK(12)) <= 1 && m._hk === 1, { dmg: m.dmg, was: dmgOn });
  await room._liveopsRoutes({ method: 'DELETE', json: async () => ({}) }, new URL('http://x/admin/flags?name=oneformula'), '/flags', json);
  check('clearing it puts the formula back: the bar', K.maxHp === maxOn && Math.abs(K.hp / K.maxHp - 0.6) < 0.02, { hp: K.hp, max: K.maxHp });
  check('...and the monster', Math.abs(m.dmg - dmgOn) <= 1 && m._hk === monsterHitK(12), { dmg: m.dmg, was: dmgOn });
  delete room.monsters['of-zone'];
}

// ── 6. the caps ──
{
  const ws = fakeWs();
  await join(ws, 'bp_of_c');
  const sync = ws.sent.find((m) => m.type === 'state_sync' && m.caps);
  check('caps.oneformula is advertised', !!sync && sync.caps.oneformula === true, sync && sync.caps && sync.caps.oneformula);
  room._liveFlags = { oneformula: false };
  const ws2 = fakeWs();
  await join(ws2, 'bp_of_c2');
  const sync2 = ws2.sent.find((m) => m.type === 'state_sync' && m.caps);
  check('oneformula:false un-advertises it', !!sync2 && sync2.caps.oneformula === false, sync2 && sync2.caps && sync2.caps.oneformula);
  room._liveFlags = {};
}

clearInterval(room.tickInterval); room.tickInterval = null;
console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL PASS');
process.exit(failures ? 1 : 0);
