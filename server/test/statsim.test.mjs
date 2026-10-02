/* THE POINTS WINDOW'S SCENE IS THE WORKER'S FIGHT (v2.3.2979).
 *
 * Owner: "Make it so the preview of the combat skills stat allocation
 * confirmation window shows real simulation of the hits against a slime
 * monster."  The scene is driven by src/ui/mobile/sheet/statSim.js, a client
 * prediction -- and a prediction is only worth showing if it is the number the
 * worker would actually roll.  So this suite holds it to the worker's OWN code,
 * not to restated expectations:
 *
 *   1. THE SLIME   sceneSlime() against _makeZoneMonster for the meadow.
 *   2. THE ROLL    rollHit against _computeAttackDamage, dice for dice --
 *                  Math.random is rigged to the same two draws for both, over
 *                  a grid of builds (skill, Power, Luck, Special, grade, tier,
 *                  hardness, volatile, the flame amulet) and a grid of dice
 *                  that covers both ends of every band and both sides of the
 *                  crit roll.
 *   3. THE WIRE    landedDmg against _handleMonsterDamage end to end, for the
 *                  two specials it post-processes (the volley arrow's
 *                  part:3, the big bolt's orbs:3).
 *   4. ON YOU      takenOf / burstOf against _applyDamage.
 *   5. TIMING      the throw, burst and stamina constants statSim borrows,
 *                  read from the worker's tables or measured off its regen
 *                  tick -- they have no client copy anywhere else.
 *   6. THE SCENE   the properties the window leans on: the same dice give the
 *                  same scene, the live character is never written, the two
 *                  halves fight the same job.
 */
import { GameRoom } from '../src/index.js';
import { STAFF_BOLT, BOW_VOLLEY_WORTH } from '../src/combat.js';
import { ZONES as SERVER_ZONES, BLOCK_STAMINA_COST } from '../src/data.js';
import { SLIME_BURST, TELEGRAPH, BASIC_WINDUP } from '../src/telegraph.js';
import { applyElementStatus, tickElementStatuses, elemAttackStat } from '../src/elemental.js';
import {
  setProg3Enabled, setProg3XEnabled, setProg3ElemEnabled, setProg3SharedEnabled,
  setProg3RelEnabled, setMilestonesRetired,
} from '../../src/data/prog3.js';
import { setGearQEnabled, recalcDerived, STAFF_BIG_BOLT_BAND } from '../../src/data/gameSystems.js';
import { setBlockScaleEnabled } from '../../src/data/abilities.js';
import { BOW_VOLLEY } from '../../src/game/bowVolley.js';
import {
  sceneSlime, offenseOf, rollHit, landedDmg, takenOf, burstOf, simulateStatScene,
  SLIME_THROW, BLUE_BURST, GUARD, SIM_STATS, sceneDie, hitsToDown, killStats, dotOf, thornOf,
} from '../../src/ui/mobile/sheet/statSim.js';
import { withPoints } from '../../src/ui/mobile/sheet/statPreview.js';

const mockState = {
  storage: { get: async () => undefined, put: async () => {}, list: async () => new Map(), delete: async () => {} },
  getWebSockets: () => [],
  acceptWebSocket: () => {},
};
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

/* The client's flags as a CURRENT worker sets them (join.js caps) -- the
   roll being checked is the one the live game predicts. */
setProg3Enabled(true); setProg3XEnabled(true); setProg3ElemEnabled(true);
setProg3SharedEnabled(true); setProg3RelEnabled(true); setMilestonesRetired(true);
setGearQEnabled(true); setBlockScaleEnabled(true);

const room = new GameRoom(mockState, mockEnv);
const origRandom = Math.random;
const rig = (seq) => { let n = 0; Math.random = () => seq[Math.min(n++, seq.length - 1)]; };
const unrig = () => { Math.random = origRandom; };

/* One character object serves BOTH sides: the worker reads ps.prog3 / weapon /
   amulet exactly where the client reads rpg.prog3 / weapon / amulet. */
function makeChar(over) {
  const c = {
    activeSlot: 'melee', power: 0, agility: 0, mind: 0, vitality: 0, endurance: 0,
    weapon: { type: 'greatsword', tierMult: 1.12, gearBase: 'copper', quality: 'normal', element1: null, hardness: 0 },
    rangedWeapon: { type: 'bow', tierMult: 1.0, gearBase: 'ww_pine', quality: 'normal', element1: null, hardness: 0 },
    staffWeapon: { type: 'staff', tierMult: 1.0, gearBase: 'ww_pine', quality: 'normal', element1: null, hardness: 0 },
    prog3: { sk: { sword: { level: 8, xp: 0 }, bow: { level: 6, xp: 0 }, staff: { level: 4, xp: 0 } }, atk: {}, alloc: {}, pool: 0 },
    hp: 100, maxHp: 100, stamina: 100, maxStamina: 100, mana: 100, maxMana: 100,
  };
  const out = Object.assign(c, over || {});
  recalcDerived(out);
  return out;
}

/* ── 1. THE SLIME ─────────────────────────────────────────────────────── */
const slime = sceneSlime();
{
  const z = SERVER_ZONES.meadow;
  /* y = 0 is the zone's entrance, where the depth lerp sits at the band
     floor (and the entrance ramp only pulls it lower, clamped at 1). */
  const m = room._makeZoneMonster('meadow', z, z.spawns[0], 'sim-1', 100, 0);
  check('the scene\'s slime is the meadow\'s: same archetype', slime.arch === m.arch, { scene: slime.arch, worker: m.arch });
  check('...same level', slime.level === m.level, { scene: slime.level, worker: m.level });
  check('...same max HP', slime.hp === m.maxHp, { scene: slime.hp, worker: m.maxHp });
  check('...same damage per ball', slime.dmg === m.dmg, { scene: slime.dmg, worker: m.dmg });
}

/* ── 2. THE ROLL ──────────────────────────────────────────────────────── */
const BUILDS = [
  { label: 'fresh greatsword', slot: 'melee', c: () => makeChar() },
  { label: 'greatsword, Power/Luck/Special, rare, hardened', slot: 'melee', c: () => makeChar({
    weapon: { type: 'greatsword', tierMult: 1.25, gearBase: 'iron', quality: 'rare', element1: null, hardness: 2 },
    prog3: { sk: { sword: { level: 22, xp: 0 }, bow: { level: 1, xp: 0 }, staff: { level: 1, xp: 0 } },
      atk: { sword: { dmg: 5, luck: 10, special: 3 } }, alloc: {}, pool: 0 } }) },
  { label: 'sword (not great), volatile', slot: 'melee', c: () => makeChar({
    weapon: { type: 'sword', tierMult: 1.4, gearBase: 'steel', quality: 'elite', element1: 'storm', hardness: 0, isVolatile: true },
    prog3: { sk: { sword: { level: 40, xp: 0 }, bow: { level: 1, xp: 0 }, staff: { level: 1, xp: 0 } },
      atk: { sword: { dmg: 30, luck: 60 } }, alloc: {}, pool: 0 } }) },
  { label: 'bow, elite, Luck', slot: 'ranged', c: () => makeChar({
    activeSlot: 'ranged',
    rangedWeapon: { type: 'bow', tierMult: 1.25, gearBase: 'ww_oak', quality: 'elite', element1: null, hardness: 1 },
    prog3: { sk: { sword: { level: 1, xp: 0 }, bow: { level: 30, xp: 0 }, staff: { level: 1, xp: 0 } },
      atk: { bow: { dmg: 12, luck: 25, special: 8 } }, alloc: {}, pool: 0 } }) },
  { label: 'flame staff, mythic flame amulet, godly', slot: 'staff', c: () => makeChar({
    activeSlot: 'staff',
    staffWeapon: { type: 'staff', tierMult: 1.12, gearBase: 'ww_oak', quality: 'godly', element1: 'flame', hardness: 0, isVolatile: true },
    amulet: { tier: 'mythic', gem: 'flame' },
    prog3: { sk: { sword: { level: 1, xp: 0 }, bow: { level: 1, xp: 0 }, staff: { level: 50, xp: 0 } },
      atk: { staff: { dmg: 20, luck: 40, special: 10, elem: 9 } }, alloc: {}, pool: 0 } }) },
];
const VAR_DICE = [0, 0.13, 0.5, 0.87, 0.999999];
const CRIT_DICE = [0, 0.02, 0.2, 0.5, 0.999];
const SLOT_WPN = { melee: 'weapon', ranged: 'rangedWeapon', staff: 'staffWeapon' };
for (const b of BUILDS) {
  let n = 0, bad = null, crits = 0;
  for (const special of [false, true]) {
    for (const uV of VAR_DICE) {
      for (const uC of CRIT_DICE) {
        const ch = b.c();
        const off = offenseOf(ch, ch[SLOT_WPN[b.slot]], slime);
        rig([uV, uC]);
        const srv = room._computeAttackDamage(ch, b.slot, special, { targetLevel: slime.level });
        unrig();
        const cli = rollHit(off, uV, uC, special);
        n++;
        if (srv.isCrit) crits++;
        if (srv.dmg !== cli.dmg || srv.isCrit !== cli.isCrit) { bad = bad || { special, uV, uC, worker: srv, scene: cli }; }
      }
    }
  }
  check(`the scene's roll IS the worker's (${b.label}): ${n} rigged rolls agree`, !bad, bad);
  check(`...and the grid reached both sides of the crit roll (${b.label})`, crits > 0 && crits < n, { crits, n });
}
/* The big bolt draws from its own band; the anchor keeps the staff's. */
{
  const b = BUILDS[4];
  let bad = null;
  for (const uV of VAR_DICE) for (const uC of CRIT_DICE) {
    const ch = b.c();
    const off = offenseOf(ch, ch.staffWeapon, slime);
    rig([uV, uC]);
    const srv = room._computeAttackDamage(ch, 'staff', true, { targetLevel: slime.level, band: STAFF_BOLT.BAND });
    unrig();
    const cli = rollHit(off, uV, uC, true, STAFF_BIG_BOLT_BAND);
    if (srv.dmg !== cli.dmg || srv.isCrit !== cli.isCrit) bad = bad || { uV, uC, worker: srv, scene: cli };
  }
  check('the big bolt\'s roll (its own band, the staff\'s anchor) matches the worker', !bad, bad);
  check('...and the client\'s bolt band is the worker\'s STAFF_BOLT.BAND',
    STAFF_BIG_BOLT_BAND[0] === STAFF_BOLT.BAND[0] && STAFF_BIG_BOLT_BAND[1] === STAFF_BOLT.BAND[1], { STAFF_BIG_BOLT_BAND, BAND: STAFF_BOLT.BAND });
}

/* ── 3. THE WIRE ──────────────────────────────────────────────────────── */
{
  check('the volley\'s WORTH is the worker\'s', BOW_VOLLEY.WORTH === BOW_VOLLEY_WORTH, { client: BOW_VOLLEY.WORTH, worker: BOW_VOLLEY_WORTH });
  const sid = 'sim-wire';
  const hitOnce = (ch, payload, dice) => {
    room.playerState[sid] = Object.assign(ch, { z: 'meadow', x: 500, y: 500, id: sid });
    const m = { id: 'sim-m', arch: 'fodder', level: slime.level, hp: 1e6, maxHp: 1e6, dmg: 10, alive: true, x: 520, y: 500, spawnX: 520, spawnY: 500, statuses: null };
    room.monsters.meadow = [m];
    room.eventBuffer = [];
    rig(dice);
    room._handleMonsterDamage({ id: sid }, Object.assign({ monsterId: m.id, zone: 'meadow' }, payload));
    unrig();
    const ev = room.eventBuffer.find((e) => e.type === 'monster_hit' && e.payload && e.payload.monsterId === m.id);
    return ev ? ev.payload.dmg : null;
  };
  let badArrow = null, badBolt = null, badPlain = null;
  for (const uV of [0, 0.5, 0.999999]) for (const uC of [0, 0.999]) {
    const bow = BUILDS[3].c();
    const offB = offenseOf(bow, bow.rangedWeapon, slime);
    const gotArrow = hitOnce(bow, { slot: 'ranged', special: true, part: 3 }, [uV, uC]);
    const wantArrow = landedDmg(rollHit(offB, uV, uC, true), 1, 3);
    if (gotArrow !== wantArrow) badArrow = badArrow || { uV, uC, worker: gotArrow, scene: wantArrow };

    const st = BUILDS[4].c();
    const offS = offenseOf(st, st.staffWeapon, slime);
    const gotBolt = hitOnce(st, { slot: 'staff', special: true, orbs: 3 }, [uV, uC]);
    const wantBolt = landedDmg(rollHit(offS, uV, uC, true, STAFF_BIG_BOLT_BAND), 3, 1);
    if (gotBolt !== wantBolt) badBolt = badBolt || { uV, uC, worker: gotBolt, scene: wantBolt };

    const gs = BUILDS[1].c();
    const offG = offenseOf(gs, gs.weapon, slime);
    const gotPlain = hitOnce(gs, { slot: 'melee', special: false }, [uV, uC]);
    const wantPlain = landedDmg(rollHit(offG, uV, uC, false), 1, 1);
    if (gotPlain !== wantPlain) badPlain = badPlain || { uV, uC, worker: gotPlain, scene: wantPlain };
  }
  check('an ordinary swing lands what the scene prints (end to end through monster_damage)', !badPlain, badPlain);
  check('a volley arrow (part: 3) lands what the scene prints', !badArrow, badArrow);
  check('the big bolt (orbs: 3) lands what the scene prints', !badBolt, badBolt);
  delete room.playerState[sid];
  room.monsters.meadow = [];
}

/* ── 4. THE SLIME ON YOU ──────────────────────────────────────────────── */
{
  const DEF_BUILDS = [
    { label: 'no points, no armour', alloc: {} },
    { label: 'Defense 4', alloc: { def: 4 } },
    { label: 'Defense 20 + Dodge 20 (the combined floor binds)', alloc: { def: 20, dodge: 20 } },
    { label: 'Defense 3, iron chest + legs', alloc: { def: 3 },
      armor: { tierMult: 2, quality: 'normal' }, legsArmor: { tierMult: 2, quality: 'normal' } },
  ];
  for (const d of DEF_BUILDS) {
    const ch = makeChar({
      prog3: { sk: { sword: { level: 8, xp: 0 }, bow: { level: 6, xp: 0 }, staff: { level: 4, xp: 0 } }, atk: {}, alloc: d.alloc, pool: 0 },
      armor: d.armor || null, legsArmor: d.legsArmor || null,
    });
    const tk = takenOf(ch, slime);
    ch.hp = ch.maxHp;
    rig([0.999999]);   /* never dodged: the cut is what is under test */
    const res = room._applyDamage(ch, slime.dmg, false, { attackerLevel: slime.level });
    unrig();
    check(`a slime ball lands for what the scene says (${d.label})`, res.dmgTaken === tk.dmg, { worker: res.dmgTaken, scene: tk.dmg });
    check(`...and dodges at the worker's own chance (${d.label})`,
      Math.abs(tk.dodge - room._prog3DodgePct(ch, slime.level)) < 1e-12, { worker: room._prog3DodgePct(ch, slime.level), scene: tk.dodge });
    const down = hitsToDown(ch, slime);
    check(`...and "hits to drop you" is the pool over the hit (${d.label})`,
      Math.abs(down - Math.ceil(ch.maxHp / tk.dmg) / (1 - tk.dodge)) < 1e-9, { down });
  }
  /* the blue slime's burst: elemental, so Resist alone cuts it */
  for (const eres of [0, 3, 15]) {
    const ch = makeChar({ prog3: { sk: { sword: { level: 8, xp: 0 }, bow: { level: 6, xp: 0 }, staff: { level: 4, xp: 0 } }, atk: {}, alloc: { eres, def: 10, dodge: 10 }, pool: 0 } });
    const raw = Math.min(Math.ceil(SLIME_BURST.DMG), Math.max(1, Math.floor(ch.maxHp * TELEGRAPH.MAX_HIT_PCT)));
    ch.hp = ch.maxHp;
    rig([0]);   /* a would-be dodge -- an elemental hit cannot be dodged */
    const res = room._applyDamage(ch, raw, false, { elemental: true, attackerLevel: SERVER_ZONES.verdant.level[0] });
    unrig();
    check(`the blue slime's burst lands for what the scene says (Resist ${eres}, with Defense and Dodge that must NOT count)`,
      res.dmgTaken === burstOf(ch) && !res.dodged, { worker: res.dmgTaken, scene: burstOf(ch) });
  }
}

/* ── 4b. THE ELEMENT A HIT LEAVES ─────────────────────────────────────── */
{
  /* The burn ticks for what the worker's own status machine ticks it for,
     off the power the worker's own resolver snapshots -- at 0, 4 and 12
     points of Element. */
  for (const elem of [0, 4, 12]) {
    const ch = makeChar({
      weapon: { type: 'greatsword', tierMult: 1.12, quality: 'normal', element1: 'flame', hardness: 0 },
      prog3: { sk: { sword: { level: 8, xp: 0 }, bow: { level: 6, xp: 0 }, staff: { level: 4, xp: 0 } }, atk: { sword: { elem } }, alloc: {}, pool: 0 },
    });
    const off = offenseOf(ch, ch.weapon, slime);
    const m = { hp: 1e6, maxHp: 1e6, level: slime.level, statuses: null };
    const t0 = 1000000;
    applyElementStatus(m, 'flame', 'p', elemAttackStat(ch, 'power', 'sword', slime.level), t0, 1);
    const ev = tickElementStatuses(m, 0.5, t0 + 500);
    const tick = ev[0] && ev[0].dmg;
    check(`a burn tick is the worker's (Element ${elem})`, !!dotOf(off) && dotOf(off).raw === tick, { scene: dotOf(off), worker: tick });
  }
  /* Flora's thorn answers the slime's attacks off the same snapshot. */
  const fl = makeChar({
    weapon: { type: 'greatsword', tierMult: 1.12, quality: 'normal', element1: 'flora', hardness: 0 },
    prog3: { sk: { sword: { level: 8, xp: 0 }, bow: { level: 6, xp: 0 }, staff: { level: 4, xp: 0 } }, atk: { sword: { elem: 6 } }, alloc: {}, pool: 0 },
  });
  const offF = offenseOf(fl, fl.weapon, slime);
  check('a thorn recoil is priced off the worker\'s own snapshot (4 + power x 0.25)',
    thornOf(offF) === Math.round(4 + elemAttackStat(fl, 'power', 'sword', slime.level) * 0.25),
    { scene: thornOf(offF), power: elemAttackStat(fl, 'power', 'sword', slime.level) });
  const scF = simulateStatScene(fl, 'elem', 'sword', 5, fl.weapon, false, { bowvolley: true, bigorb: true }, 99);
  check('flora: the scene has the slime throw, and the thorn answer it',
    scF.passes[0].beats.some((b) => b.k === 'throw') && scF.passes[0].beats.some((b) => b.k === 'recoil'),
    scF.passes[0].beats.map((b) => b.k));
  const kF0 = killStats(offF, slime, { throws: true });
  const fl5 = withPoints(fl, 'elem', 'sword', 10);
  const kF1 = killStats(offenseOf(fl5, fl5.weapon, slime), slime, { throws: true });
  check('flora: the verdict counts the thorn, so Element moves it', kF1.hits <= kF0.hits && kF1.secs <= kF0.secs && (kF1.hits < kF0.hits || kF1.secs < kF0.secs),
    { now: kF0, after: kF1 });
}

/* ── 5. TIMING AND COSTS THE SCENE BORROWS ────────────────────────────── */
{
  const rc = room.MONSTER_RANGED_BY_ARCH.fodder;
  check('the slime\'s throw cooldown is the worker\'s', SLIME_THROW.CD_MS === rc.cd, { scene: SLIME_THROW.CD_MS, worker: rc.cd });
  check('...its ball\'s flight', SLIME_THROW.FLIGHT_MS === rc.travelMs, { scene: SLIME_THROW.FLIGHT_MS, worker: rc.travelMs });
  check('...and the arm going back before it', SLIME_THROW.WINDUP_MS === BASIC_WINDUP.THROW_MS, { scene: SLIME_THROW.WINDUP_MS, worker: BASIC_WINDUP.THROW_MS });
  check('the burst\'s damage, cap and swell are the worker\'s',
    BLUE_BURST.DMG === SLIME_BURST.DMG && BLUE_BURST.MAX_HIT_PCT === TELEGRAPH.MAX_HIT_PCT && BLUE_BURST.SWELL_MS === SLIME_BURST.SWELL_MS,
    { scene: BLUE_BURST, worker: { DMG: SLIME_BURST.DMG, MAX: TELEGRAPH.MAX_HIT_PCT, SWELL: SLIME_BURST.SWELL_MS } });
  /* A ball that meets a raised shield: MEASURED off the worker's own in-flight
     ball, not pinned to a constant -- the first cut of this suite pinned
     GUARD.BLOCK_COST to BLOCK_STAMINA_COST and so agreed, wrongly, that a
     blocked ball cost 10.  It costs nothing: BLOCK_STAMINA_COST is charged on a
     blocked melee swing, and the ball's own branch drains no stamina. */
  {
    const sidB = 'sim-guard';
    const chB = makeChar();
    room.playerState[sidB] = Object.assign(chB, { z: 'meadow', x: 600, y: 600, id: sidB, blocking: true, stamina: 50 });
    const mB = { id: 'sim-thrower', arch: 'fodder', level: slime.level, hp: 58, maxHp: 58, dmg: slime.dmg, alive: true,
      x: 760, y: 600, spawnX: 760, spawnY: 600, atkCd: Date.now() + 1e6,
      _projImpactAt: Date.now() - 1, _projTargetId: sidB, _projTx: 600, _projTy: 600, _projFromX: 760, _projFromY: 600 };
    room.monsters.meadow = [mB];
    room.eventBuffer = [];
    room._tickMonsters();
    const ev = room.eventBuffer.find((e) => e.type === 'monster_attack' && e.payload && e.payload.targetId === sidB);
    check('a slime ball caught on a raised shield is a block (guard: the worker resolved it)',
      !!(ev && ev.payload.blocked), ev && ev.payload);
    check('...and costs no stamina -- only holding the shield does (the scene charges no more)',
      chB.stamina === 50 && !(ev && ev.payload.staminaDrain), { stamina: chB.stamina, drain: ev && ev.payload.staminaDrain });
    check('...while a blocked melee SWING is what BLOCK_STAMINA_COST prices (not the scene\'s ball)', BLOCK_STAMINA_COST > 0, BLOCK_STAMINA_COST);
    delete room.playerState[sidB];
    room.monsters.meadow = [];
  }
  check('the guard-break lockout is the worker\'s', GUARD.BREAK_MS === room.GUARD_BREAK_MS, { scene: GUARD.BREAK_MS, worker: room.GUARD_BREAK_MS });
  check('the regen tick is 30 worker ticks', GUARD.TICK_MS === room.TICK_RATE * 30, { scene: GUARD.TICK_MS, worker: room.TICK_RATE * 30 });
  /* the two per-tick numbers are literals inside _tickPlayerRegen, so they are
     MEASURED rather than imported: one tick holding a shield, one not */
  const sid = 'sim-regen';
  const ch = makeChar();
  room.playerState[sid] = Object.assign(ch, { z: 'meadow', x: 1, y: 1, id: sid, lastDamageAt: Date.now() });
  ch.stamina = 50; ch.blocking = true;
  room._tickPlayerRegen();
  check('holding the shield drains the worker\'s HOLD_DRAIN per tick', 50 - ch.stamina === GUARD.HOLD_DRAIN, { drained: 50 - ch.stamina, scene: GUARD.HOLD_DRAIN });
  ch.stamina = 50; ch.blocking = false;
  room._tickPlayerRegen();
  check('...and not holding it regenerates the worker\'s REGEN per tick', ch.stamina - 50 === GUARD.REGEN, { gained: ch.stamina - 50, scene: GUARD.REGEN });
  delete room.playerState[sid];
}

/* ── 6. THE SCENE ─────────────────────────────────────────────────────── */
{
  const R = BUILDS[1].c();
  const frozen = JSON.stringify(R);
  const caps = { bowvolley: true, bigorb: true };
  const lanes = { dmg: 'sword', aspd: 'sword', luck: 'sword', special: 'sword', elem: 'sword', range: 'sword' };
  let all = true;
  for (const stat of SIM_STATS) {
    if (stat === 'crit' || stat === 'critDmg') continue;   /* old-worker rows; this worker folded them into Luck */
    const sc = simulateStatScene(R, stat, lanes[stat] || 'sword', 2, R.weapon, false, caps, 4242);
    const ok = !!(sc && sc.passes && sc.passes[0] && sc.passes[0].beats.length && sc.passes[1] && sc.passes[1].end > 0);
    if (!ok) all = false;
    check(`${stat}: a scene with both halves`, ok, sc && { kind: sc.kind, note: sc.note });
  }
  check('the live character is never written by a scene', JSON.stringify(R) === frozen);
  const a = simulateStatScene(R, 'luck', 'sword', 1, R.weapon, false, caps, 777);
  const b = simulateStatScene(R, 'luck', 'sword', 1, R.weapon, false, caps, 777);
  check('the same dice give the same scene', JSON.stringify(a.passes) === JSON.stringify(b.passes));
  /* the dice are a fair coin -- uniform, so a crit shows at the real rate */
  const bins = new Array(10).fill(0); let N = 0;
  for (let s = 1; s < 4000; s++) for (let i = 0; i < 6; i++) { bins[Math.floor(sceneDie(s, 2, i) * 10)]++; N++; }
  check('the scene\'s dice are uniform', bins.every((v) => Math.abs(v / N - 0.1) < 0.01), bins);
  /* the after half does the before half's job, so over many loops it is never slower */
  let slower = 0;
  for (let s = 1; s <= 200; s++) {
    const sc = simulateStatScene(R, 'dmg', 'sword', 3, R.weapon, false, caps, s);
    if (sc.passes[1].end > sc.passes[0].end) slower++;
  }
  check('Power: the after half never takes longer than the before half (200 loops)', slower === 0, { slower });
  /* The verdict moves the right way.  A FRESH character for Power: the
     build above one-shots a 58-HP slime, and against a slime it already
     one-shots Power genuinely changes nothing about the kill -- which the
     scene says, and which is the point of simulating rather than drawing. */
  const F = BUILDS[0].c();
  const k0 = killStats(offenseOf(F, F.weapon, slime), slime);
  const F5 = withPoints(F, 'dmg', 'sword', 5);
  const k5 = killStats(offenseOf(F5, F5.weapon, slime), slime);
  check('Power: 5 points put the slime down in fewer hits on average', k5.hits < k0.hits, { now: k0, after: k5 });
  const FS = withPoints(F, 'aspd', 'sword', 5);
  const kS = killStats(offenseOf(FS, FS.weapon, slime), slime);
  check('Speed: the same hits, in less time', Math.abs(kS.hits - k0.hits) < 1e-9 && kS.secs < k0.secs, { now: k0, after: kS });
  const kO = killStats(offenseOf(R, R.weapon, slime), slime);
  const RS = withPoints(R, 'aspd', 'sword', 5);
  const kOS = killStats(offenseOf(RS, RS.weapon, slime), slime);
  check('Speed shows even for a character that one-shots the slime', kO.hits === 1 && kOS.secs < kO.secs, { now: kO, after: kOS });
  /* a lane with no weapon in it plays no fight -- it says so */
  const bare = makeChar({ rangedWeapon: null });
  const e = simulateStatScene(bare, 'dmg', 'bow', 1, null, false, caps, 1);
  check('an empty lane gets a line, not a fight with a weapon you do not own', e && e.kind === 'empty' && /bow/i.test(e.note || ''), e);
}

if (failures) { console.log(`\n${failures} FAILURE(S)`); process.exit(1); }
console.log('\nALL PASS');
