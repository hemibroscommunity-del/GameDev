#!/usr/bin/env node
/* relative-points-sim — the referee for the RELATIVE POINT VALUE redesign
 * (docs/specs/relative-points.md, v2.3.2659).
 *
 *   node tools/relative-points-sim.mjs            # every table
 *   node tools/relative-points-sim.mjs --quick    # fewer samples
 *
 * WHAT IT ANSWERS.  The owner's ask: "whenever you allocate points, those
 * points carry a lot of weight at or under the current level monster with a
 * pretty steep decay as the combat levels go up (benefit nearly gone after 5
 * combat levels)".  Nine sections, each its own table, in the order the
 * design was argued:
 *   1. THE EDGE CURVE — what fraction of a point's value applies at each
 *      level gap (the one rule the whole design is).
 *   2. "DO I FEEL A LEVEL-UP?" — one level's worth of points (3 lane + 3
 *      shared) placed into ONE stat, against an at-level monster: hits to
 *      kill / hits to die, TODAY vs PROPOSED, at several character levels.
 *      2b does the same for FIVE level-ups' worth.
 *   3. "THE WALL" — a fully-invested mid-game build against monsters from
 *      5 levels below to 5 above: today (universal points) vs proposed
 *      (points fade with the gap).
 *   4. "IS THE TOP END UNCHANGED?" — a maxed build at level 100 against a
 *      level-100 monster, today vs proposed.
 *   5. the migration conversion for a few sample allocations.
 *   6. the anticheat sample — every proposed roll ≤ the ceiling, because a
 *      reprice that trips it rejects legitimate hits (the v2.3.1451 rule).
 *   7. PURE BUILDS — one lane deep vs three lanes shallow, the cross-train
 *      incentive and the yardstick that removes it (this table is the whole
 *      evidence for decision 2), one stat only, and when the relative game
 *      ends.  Added when the owner asked what the design does to pure builds;
 *      it overturned this note's first recommendation.
 *   8. UNCAPPED — added when the owner said they dislike capping.  The curves,
 *      the immunity check a cap was actually protecting, whether uncapping the
 *      DAMAGE stats changes anything, and anticheat with nothing capped.  It
 *      overturned the recommendation a second time.  8f is the owner's own
 *      answer to it ("remove the caps completely until it hits something
 *      ridiculous like 90% for dodge"): linear, no stat cap, a 90 % ceiling —
 *      when the ceiling becomes reachable, the tank it builds against the
 *      curve, the combined floor that tames it, and anticheat.  §3.2 of the
 *      note (5-C, the owner's pick) is the shape this file now measures as
 *      the plan.  8g is the owner's next two picks on top of it — the
 *      combined 10 % floor (12-C) and the per-level bound kept on the three
 *      avoidance stats (13-B) — measured WITH armour on, and the armour gate
 *      those picks collide with (decision 14: armour tiers gate on Defense
 *      POINTS, and every point is now 2.5x heavier).
 *   9. THE FIRST HOUR — levels 3 to 10, where the owner expects players to
 *      quit.  The climb, the felt unit (a whole HIT, not a percent), what one
 *      POINT does against what one LEVEL-UP does, what a level-10 character is
 *      actually fighting in the shipped world, and the double-cap dial.  This
 *      is the only section that samples the DISPLAYED number rather than the
 *      roll, because a change that does not move the printed integer is a
 *      change the player does not see.
 *
 * HOW IT WORKS, and the one rule it follows (balance-sim's, verify-prog3-
 * retune's): IMPORT THE SHIPPED FORMULAS, NEVER RESTATE THEM.  It builds a
 * real GameRoom, joins a real player, and drives _computeAttackDamage and
 * _applyDamage — the roll and the sink the worker actually uses.  The
 * PROPOSED constants are applied by editing PROG3's tables in-process, and
 * the edge is applied by scaling the placed point count by the edge fraction
 * before the roll: every reader of a relative stat is linear in its point
 * count (pts × per, with luck's 1% base outside the product), so `pts × E`
 * is EXACTLY what the shipped implementation computes.  When the code PR
 * lands, swap that scaling for the real `edge` argument and the numbers must
 * not move — that is the check that the implementation matches the note.
 *
 * §8's UNCAPPED tables need one more step, because a diminishing curve is not
 * linear in its point count: `per` is set to value(pts)/pts for the cell being
 * measured, which is the same arithmetic through the same linear reader (see
 * applyUncapped).  §1-§7 use the plain linear path above.
 *
 * Monster stats come from the live spawn curves (MONSTER_HP_CURVE +
 * ARCHETYPES + monsterHpFlat, the same objects _makeZoneMonster reads), NOT
 * from the pinned [1,2] zone bands — this sim asks what a level-N monster
 * would be, which is what the depth zones and dungeon waves spawn. */
import { GameRoom } from '../server/src/index.js';
import { PROG3, prog3XpRequired } from '../server/src/prog3.js';
import { MONSTER_HP_CURVE, ARCHETYPES, monsterStat, monsterHpFlat, BLACKSMITH_TIERS } from '../server/src/data.js';

const QUICK = process.argv.includes('--quick');
const KILLS = QUICK ? 400 : 2000;     // simulated kills per cell
const HITS = QUICK ? 1000 : 6000;     // simulated incoming hits per cell

/* ═══ THE PROPOSAL (mirrors docs/specs/relative-points.md §3) ═══ */
const EDGE = { FADE_PER_LEVEL: 0.20 };   // 100% at gap ≤ 0, −20%/level above, 0 at +5
export function edge(playerLevel, monsterLevel) {
  const gap = Math.max(0, (monsterLevel || 1) - (playerLevel || 1));
  return Math.max(0, 1 - gap * EDGE.FADE_PER_LEVEL);
}
/* today → proposed per-point value and cap.  Every at-cap effect is kept
   (or within a hair of kept: luck's crit-damage half lands ×2.4 for ×2.5). */
const TODAY = {
  ATK:  { dmg: { per: 0.5, cap: 75 }, luck: { per: 0.003, dmgPer: 0.01, cap: 100 },
          special: { per: 0.01, cap: 75 }, elem: { per: 1, cap: 75 } },
  BODY: { def: { per: 0.004, cap: 100 }, dodge: { per: 0.004, cap: 75 }, eres: { per: 0.004, cap: 75 } },
};
const PROPOSED = {
  ATK:  { dmg: { per: 1.5, cap: 25 }, luck: { per: 0.01, dmgPer: 0.03, cap: 30 },
          special: { per: 0.03, cap: 25 }, elem: { per: 3, cap: 25 } },
  BODY: { def: { per: 0.01, cap: 40 }, dodge: { per: 0.01, cap: 30 }, eres: { per: 0.01, cap: 30 } },
};
function applyTables(t) {
  for (const k of Object.keys(t.ATK)) Object.assign(PROG3.ATK[k], t.ATK[k]);
  for (const k of Object.keys(t.BODY)) Object.assign(PROG3.BODY[k], t.BODY[k]);
}
/* Sanity: the sim's TODAY table must be what the worker ships, or every
   "today" column below is fiction. */
for (const k of Object.keys(TODAY.ATK)) for (const f of Object.keys(TODAY.ATK[k])) {
  if (PROG3.ATK[k][f] !== TODAY.ATK[k][f]) throw new Error(`TODAY.ATK.${k}.${f} drifted from PROG3 (${PROG3.ATK[k][f]})`);
}
for (const k of Object.keys(TODAY.BODY)) for (const f of Object.keys(TODAY.BODY[k])) {
  if (PROG3.BODY[k][f] !== TODAY.BODY[k][f]) throw new Error(`TODAY.BODY.${k}.${f} drifted from PROG3 (${PROG3.BODY[k][f]})`);
}

/* ═══ a real room, a real player ═══ */
const mockState = {
  storage: { get: async () => undefined, put: async () => {}, list: async () => new Map(), delete: async () => {} },
  getWebSockets: () => [], acceptWebSocket: () => {},
};
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } };
const room = new GameRoom(mockState, mockEnv);
const ws = { sent: [], send() {}, close() {} };
room.sessions.set(ws, { id: null, name: 'Sim', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id: 'sim', name: 'Sim', protocolVersion: 2, data: { x: 0, y: 0, z: 'meadow' } }));
const ps = room.playerState.sim;
if (!ps || !ps.prog3) throw new Error('join did not seed prog3');
ps._zoneEntryGraceUntil = 0; ps._godUntil = 0; ps.armor = null; ps.legsArmor = null; ps.amulet = null;
ps._buffs = null; ps._cursedUntil = 0; ps.rangedWeapon = null; ps.staffWeapon = null;

/* The greatsword tier the prog3 gate allows at a Melee level: tierIndex × 5
   ≤ level (v2.3.1661), highest wins. */
const TIER_KEYS = Object.keys(BLACKSMITH_TIERS);
function tierMultFor(skill) {
  const idx = Math.min(TIER_KEYS.length - 1, Math.floor(skill / 5));
  return BLACKSMITH_TIERS[TIER_KEYS[idx]].tierMult;
}
/* A melee specialist at character level L: sword L−2, bow 1, staff 1.
   `lane` / `shared` are the point placements (possibly fractional: the edge
   scaling).  Everything else zeroed so the cell measures only what it names. */
function setChar(charLevel, lane, shared) {
  const sk = Math.max(1, Math.min(100, charLevel - 2));
  ps.prog3.sk.sword.level = sk; ps.prog3.sk.bow.level = 1; ps.prog3.sk.staff.level = 1;
  for (const c of PROG3.SKILLS) for (const k of Object.keys(PROG3.ATK)) ps.prog3.atk[c][k] = 0;
  for (const k of Object.keys(PROG3.BODY)) ps.prog3.alloc[k] = 0;
  for (const k of Object.keys(lane || {})) ps.prog3.atk.sword[k] = lane[k];
  for (const k of Object.keys(shared || {})) ps.prog3.alloc[k] = shared[k];
  ps.weapon = { type: 'greatsword', tierMult: tierMultFor(sk) };
  room._prog3Recompute(ps);
  ps.hp = ps.maxHp;
}
function monster(arch, lvl) {
  const C = MONSTER_HP_CURVE;
  const a = ARCHETYPES[arch];
  return {
    level: lvl,
    hp: Math.max(1, Math.ceil(monsterStat(C.base, lvl, C.ramp, C.plateau, C.endgame) * a.hpMult) + monsterHpFlat(lvl)),
    dmg: Math.ceil(monsterStat(12, lvl, 1.045, 1.025, 1.018) * a.dmgMult),
  };
}
/* Mean swings to kill: real rolls (variance + crit + anchor), real overkill. */
function hitsToKill(m) {
  let total = 0;
  for (let i = 0; i < KILLS; i++) {
    let hp = m.hp, n = 0;
    while (hp > 0) { hp -= room._computeAttackDamage(ps, 'melee', false).dmg; n++; }
    total += n;
  }
  return total / KILLS;
}
/* Mean damage taken per monster swing through the real sink (dodge roll,
   def cut, floor 1); the player's hp is reset each time so nothing dies. */
function dmgTakenPerHit(m) {
  let total = 0;
  for (let i = 0; i < HITS; i++) {
    ps.hp = ps.maxHp;
    total += room._applyDamage(ps, m.dmg, false).dmgTaken;
  }
  return total / HITS;
}
const hitsToDie = (m) => ps.maxHp / Math.max(1e-9, dmgTakenPerHit(m));
const f1 = (n) => n.toFixed(1), f2 = (n) => n.toFixed(2);
const pct = (a, b) => ((b / a - 1) * 100).toFixed(0) + '%';
const pad = (s, n) => String(s).padStart(n);

/* ═══ 1. the edge curve ═══ */
console.log('1. THE EDGE — the fraction of a placed point that applies, by monster level minus your level');
console.log('   gap   ' + [-5, -2, -1, 0, 1, 2, 3, 4, 5, 6].map((g) => pad(g > 0 ? '+' + g : g, 5)).join(''));
console.log('   edge  ' + [-5, -2, -1, 0, 1, 2, 3, 4, 5, 6].map((g) => pad(Math.round(edge(10, 10 + g) * 100) + '%', 5)).join(''));
console.log('   plate ' + [-5, -2, -1, 0, 1, 2, 3, 4, 5, 6].map((g) => pad(g <= -2 ? 'low' : g <= 0 ? 'near' : g <= 2 ? 'high' : 'dngr', 5)).join('')
  + '   (the nameplate bands already on screen, entityRenderer plateBandFor)');

/* ═══ 2. do I feel a level-up? ═══ */
console.log('\n2. ONE LEVEL-UP\'S POINTS (3 lane + 3 shared) INTO ONE STAT, vs an AT-LEVEL monster');
console.log('   melee specialist, greatsword at the tier the level allows, no armour; monster = your character level');
console.log('   "hits" = mean swings to kill a fodder / a brute;  "survive" = monster swings to kill you (brute)');
console.log('   char | tier | stat    |        today: 0 pts -> 3 pts        |      proposed: 0 pts -> 3 pts');
const LEVELS = [3, 6, 10, 15, 20, 30, 50];
for (const L of LEVELS) {
  const mLvl = L; // at-level
  const fod = monster('fodder', mLvl), bru = monster('brute', mLvl);
  const rows = [];
  for (const stat of ['dmg', 'luck', 'def', 'dodge']) {
    const isLane = stat === 'dmg' || stat === 'luck';
    const cell = (tables) => {
      applyTables(tables);
      setChar(L, {}, {});
      const base = isLane ? [hitsToKill(fod), hitsToKill(bru)] : [hitsToDie(bru)];
      setChar(L, isLane ? { [stat]: 3 } : {}, isLane ? {} : { [stat]: 3 });
      const inv = isLane ? [hitsToKill(fod), hitsToKill(bru)] : [hitsToDie(bru)];
      return { base, inv };
    };
    const t = cell(TODAY), p = cell(PROPOSED);
    const fmt = (c) => isLane
      ? `hits ${f1(c.base[0])}/${f1(c.base[1])} -> ${f1(c.inv[0])}/${f1(c.inv[1])} (${pct(c.base[1], c.inv[1])})`
      : `survive ${f1(c.base[0])} -> ${f1(c.inv[0])} swings (${pct(c.base[0], c.inv[0])})`;
    rows.push(`   ${pad(L, 4)} | ${f2(tierMultFor(L - 2))} | ${stat.padEnd(7)} | ${fmt(t).padEnd(36)} | ${fmt(p)}`);
  }
  console.log(rows.join('\n'));
}
applyTables(TODAY);

/* ═══ 3. the wall ═══ */
console.log('\n3. THE WALL — a fully-invested character 20 (Melee 18: 17 level-ups, 51 lane + 51 shared points placed)');
console.log('   lane: Power to cap, then Luck, then Special;  shared: Defense to cap, then Dodge, then HP');
console.log('   vs a BRUTE at each level.  today = points are universal;  proposed = points × edge');
function invest(tables, E) {
  /* Fill in the order a striker would, respecting the stat caps AND the
     §6-C double cap min(cap, charLevel), then scale the RELATIVE stats by E. */
  const L = 20, lanePts = 3 * (18 - 1), sharedPts = 3 * (18 - 1);
  const dcap = (cap) => Math.min(cap, L);
  const fill = (budget, order, table) => {
    const out = {}; let left = budget;
    for (const k of order) { const take = Math.min(left, dcap(table[k].cap)); if (take > 0) { out[k] = take; left -= take; } }
    return out;
  };
  const lane = fill(lanePts, ['dmg', 'luck', 'special', 'aspd', 'range'], { ...tables.ATK, aspd: PROG3.ATK.aspd, range: PROG3.ATK.range });
  const shared = fill(sharedPts, ['def', 'dodge', 'hp', 'stam', 'mana'], { ...tables.BODY, hp: PROG3.BODY.hp, stam: PROG3.BODY.stam, mana: PROG3.BODY.mana });
  for (const k of ['dmg', 'luck', 'special', 'elem']) if (lane[k]) lane[k] *= E;
  for (const k of ['def', 'dodge', 'eres']) if (shared[k]) shared[k] *= E;
  return { lane, shared };
}
console.log('   monster |  hits to kill (today -> proposed) |  swings to kill you (today -> proposed) | edge');
for (const g of [-5, -2, 0, 1, 2, 3, 4, 5, 7]) {
  const mLvl = 20 + g, E = edge(20, mLvl), bru = monster('brute', mLvl);
  applyTables(TODAY);
  let b = invest(TODAY, 1); setChar(20, b.lane, b.shared);
  const tK = hitsToKill(bru), tD = hitsToDie(bru);
  applyTables(PROPOSED);
  b = invest(PROPOSED, E); setChar(20, b.lane, b.shared);
  const pK = hitsToKill(bru), pD = hitsToDie(bru);
  console.log(`   Lv ${pad(mLvl, 2)} (${pad(g > 0 ? '+' + g : g, 2)}) |  ${pad(f1(tK), 5)} -> ${pad(f1(pK), 5)}                 |  ${pad(f1(tD), 5)} -> ${pad(f1(pD), 5)}                    | ${Math.round(E * 100)}%`);
}
/* And the same character with NO points at all, for the reference line. */
{
  applyTables(TODAY); setChar(20, {}, {});
  const bru = monster('brute', 20), bru5 = monster('brute', 25);
  console.log(`   (no points at all: Lv 20 brute ${f1(hitsToKill(bru))} hits / ${f1(hitsToDie(bru))} swings;  Lv 25 brute ${f1(hitsToKill(bru5))} hits / ${f1(hitsToDie(bru5))} swings)`);
}
applyTables(TODAY);

/* ═══ 4. the top end ═══ */
console.log('\n4. THE TOP END — Melee 100 (char 102), every relative stat AT CAP, vs a Lv 100 brute (tierMult 2.0 sword so hits are countable)');
{
  const bru = monster('brute', 100);
  const meanRoll = () => { let t = 0; for (let i = 0; i < HITS; i++) t += room._computeAttackDamage(ps, 'melee', false).dmg; return t / HITS; };
  applyTables(TODAY);
  setChar(102, { dmg: 75, luck: 100, special: 75 }, { def: 100, dodge: 75 });
  ps.weapon = { type: 'greatsword', tierMult: 2.0 };
  const tR = meanRoll(), tK = hitsToKill(bru), tT = dmgTakenPerHit(bru), tD = hitsToDie(bru);
  applyTables(PROPOSED);
  setChar(102, { dmg: 25, luck: 30, special: 25 }, { def: 40, dodge: 30 });
  ps.weapon = { type: 'greatsword', tierMult: 2.0 };
  const pR = meanRoll(), pK = hitsToKill(bru), pT = dmgTakenPerHit(bru), pD = hitsToDie(bru);
  console.log(`   mean swing: today ${f1(tR)} -> proposed ${f1(pR)} (${pct(tR, pR)});  hits to kill: ${f2(tK)} -> ${f2(pK)} (${pct(tK, pK)})`);
  console.log(`   taken per monster swing: today ${f1(tT)} -> proposed ${f1(pT)} (${pct(tT, pT)});  swings to kill you: ${f1(tD)} -> ${f1(pD)} (${pct(tD, pD)})`);
  console.log(`   points needed for that: today 250 lane + 175 shared;  proposed 80 lane + 70 shared`);
  console.log(`   (luck's crit-damage half lands x2.40 for x2.50 — the one endpoint that moves, and the mean swing shows what it costs)`);
}
applyTables(TODAY);

/* ═══ 2b. five levels of points into one stat ═══ */
console.log('\n2b. FIVE LEVEL-UPS\' POINTS (15) INTO ONE STAT, vs an AT-LEVEL brute (same fixture as table 2)');
console.log('   char | stat    |     today: 0 -> 15 pts     |    proposed: 0 -> 15 pts');
for (const L of [15, 20, 30, 50]) {
  const bru = monster('brute', L);
  for (const stat of ['dmg', 'luck', 'def', 'dodge']) {
    const isLane = stat === 'dmg' || stat === 'luck';
    const cell = (tables) => {
      applyTables(tables);
      setChar(L, {}, {});
      const base = isLane ? hitsToKill(bru) : hitsToDie(bru);
      setChar(L, isLane ? { [stat]: 15 } : {}, isLane ? {} : { [stat]: 15 });
      const inv = isLane ? hitsToKill(bru) : hitsToDie(bru);
      return { base, inv };
    };
    const t = cell(TODAY), p = cell(PROPOSED);
    const fmt = (c) => `${isLane ? 'hits' : 'survive'} ${f1(c.base)} -> ${f1(c.inv)} (${pct(c.base, c.inv)})`;
    console.log(`   ${pad(L, 4)} | ${stat.padEnd(7)} | ${fmt(t).padEnd(26)} | ${fmt(p)}`);
  }
}
applyTables(TODAY);

/* ═══ 5. migration: convert by value, refund the surplus ═══ */
console.log('\n5. MIGRATION v18 — placed points convert by VALUE (ceil), the surplus is refunded to the pool that paid');
const CONV = { dmg: 3, luck: 10 / 3, special: 3, elem: 3, def: 2.5, dodge: 2.5, eres: 2.5 };
for (const [stat, old] of [['def', 100], ['def', 60], ['def', 7], ['dodge', 75], ['dmg', 75], ['dmg', 20], ['luck', 100], ['luck', 33], ['special', 10]]) {
  const kept = Math.min(PROPOSED[stat === 'def' || stat === 'dodge' || stat === 'eres' ? 'BODY' : 'ATK'][stat].cap, Math.ceil(old / CONV[stat]));
  const before = stat === 'luck' ? `${(old * TODAY.ATK.luck.per * 100).toFixed(1)}% crit / ×${(1.5 + old * TODAY.ATK.luck.dmgPer).toFixed(2)}`
    : stat === 'dmg' ? `+${old * TODAY.ATK.dmg.per} dmg` : stat === 'special' ? `+${old * TODAY.ATK.special.per * 100}%`
    : `${(old * TODAY.BODY[stat].per * 100).toFixed(1)}%`;
  const after = stat === 'luck' ? `${(kept * PROPOSED.ATK.luck.per * 100).toFixed(1)}% crit / ×${(1.5 + kept * PROPOSED.ATK.luck.dmgPer).toFixed(2)}`
    : stat === 'dmg' ? `+${kept * PROPOSED.ATK.dmg.per} dmg` : stat === 'special' ? `+${kept * PROPOSED.ATK.special.per * 100}%`
    : `${(kept * PROPOSED.BODY[stat].per * 100).toFixed(1)}%`;
  console.log(`   ${stat.padEnd(7)} ${pad(old, 3)} pts (${before.padEnd(22)}) -> ${pad(kept, 2)} pts (${after.padEnd(22)}) + ${pad(old - kept, 2)} refunded`);
}

/* ═══ 6. anticheat: every proposed roll stays under the ceiling ═══ */
console.log('\n6. ANTICHEAT — 2 400 proposed rolls at every relative stat\'s cap, worst legitimate kit');
{
  applyTables(PROPOSED);
  setChar(102, {}, {});
  ps.weapon = { type: 'sword', tierMult: 6, isVolatile: true };
  ps.rangedWeapon = { type: 'bow', tierMult: 6 };
  ps.staffWeapon = { type: 'staff', tierMult: 6 };
  for (const c of PROG3.SKILLS) { ps.prog3.atk[c].luck = 30; ps.prog3.atk[c].dmg = 25; ps.prog3.atk[c].special = 25; }
  ps._buffs = { damageMul: 2.0 }; ps.buffs = ps.buffs || {};
  let ok = true, worst = 0;
  for (const special of [false, true]) {
    const cap = room._maxDmgForAttacker(ps, special);
    for (let i = 0; i < 400; i++) for (const slot of ['melee', 'ranged', 'staff']) {
      const { dmg } = room._computeAttackDamage(ps, slot, special);
      worst = Math.max(worst, dmg / cap);
      if (dmg > cap) ok = false;
    }
  }
  console.log(`   ${ok ? 'PASS' : 'FAIL'} — peak roll at ${(worst * 100).toFixed(1)}% of the ceiling (the ceiling reads the same constants: lockstep by construction)`);
  ps._buffs = null; ps.rangedWeapon = null; ps.staffWeapon = null;
}
applyTables(TODAY);

/* ═══ 7. PURE BUILDS — the specialist against the spread ═══
 *
 * The edge reads CHARACTER level (Σ trained skills), the weapon tier gate and
 * the skill damage term read the LANE's own trained level, and a lane point
 * can only buy its own lane's stats.  So "pure" has two meanings and this
 * section measures both:
 *   7a  one lane deep (40/1/1) vs three lanes shallow (14/14/14) at the SAME
 *       character level, both fully invested — today vs proposed.
 *   7b  the cross-train incentive the edge creates: same Melee investment,
 *       off-skills raised to lift character level.
 *   7c  one stat only, until the cap stops it.
 *   7d  when the relative game ends, and what a character level costs in XP
 *       deepened vs cross-trained (arithmetic off the shipped curve). */
function setBuild(skills, lane, shared) {
  for (const c of PROG3.SKILLS) {
    ps.prog3.sk[c].level = Math.max(1, Math.min(100, Math.floor(skills[c] || 1)));
    for (const k of Object.keys(PROG3.ATK)) ps.prog3.atk[c][k] = 0;
  }
  for (const k of Object.keys(PROG3.BODY)) ps.prog3.alloc[k] = 0;
  for (const k of Object.keys(lane || {})) ps.prog3.atk.sword[k] = lane[k];
  for (const k of Object.keys(shared || {})) ps.prog3.alloc[k] = shared[k];
  ps.weapon = { type: 'greatsword', tierMult: tierMultFor(ps.prog3.sk.sword.level) };
  room._prog3Recompute(ps);           /* sets ps.level = Σ, maxHp, pools */
  ps.hp = ps.maxHp;
  return ps.level;
}
/* Spend a budget down an order, respecting the stat cap AND the §6-C double
   cap min(cap, charLevel).  Returns what was placed and what had nowhere to go. */
const LANE_ORDER = ['dmg', 'luck', 'special', 'elem', 'aspd', 'range'];
const SHARED_ORDER = ['def', 'dodge', 'eres', 'hp', 'stam', 'mana', 'move'];
const RELATIVE = new Set(['dmg', 'luck', 'special', 'elem', 'def', 'dodge', 'eres']);
function spend(budget, order, table, charLevel, E) {
  const out = {}; let left = budget;
  for (const k of order) {
    const cap = Math.min(table[k].cap, charLevel);
    const take = Math.min(left, cap);
    if (take > 0) { out[k] = RELATIVE.has(k) ? take * (E == null ? 1 : E) : take; left -= take; }
    if (left <= 0) break;
  }
  return { out, left };
}
/* A whole character: skills, then every point it has earned, spent in order. */
function build(skills, tables, E, laneOrder, sharedOrder) {
  const charLevel = (skills.sword || 1) + (skills.bow || 1) + (skills.staff || 1);
  const laneBudget = 3 * ((skills.sword || 1) - 1);     /* poolBy.sword */
  const sharedBudget = 3 * (charLevel - 3);             /* every level-up mints shared */
  const atkT = { ...PROG3.ATK, ...tables.ATK };
  const bodyT = { ...PROG3.BODY, ...tables.BODY };
  /* E is either one number (both halves) or { lane, shared } — decision 2's
     two options differ only in WHICH level the edge measures against. */
  const eL = (E && typeof E === 'object') ? E.lane : E;
  const eS = (E && typeof E === 'object') ? E.shared : E;
  const L = spend(laneBudget, laneOrder || LANE_ORDER, atkT, charLevel, eL);
  const S = spend(sharedBudget, sharedOrder || SHARED_ORDER, bodyT, charLevel, eS);
  return { charLevel, lane: L.out, shared: S.out, laneLeft: L.left, sharedLeft: S.left, laneBudget, sharedBudget };
}

console.log('\n7a. ONE LANE DEEP vs THREE LANES SHALLOW — same character level 42, both fully invested');
console.log('    specialist 40/1/1 (abyssal greatsword, tierMult 2.40) · spread 14/14/14 (iron, 1.25 — the tier gate reads the LANE)');
console.log('    build       | vs Lv 42 brute: hits / survive |  vs Lv 47 brute: hits / survive');
for (const [label, tables] of [['today   ', TODAY], ['proposed', PROPOSED]]) {
  applyTables(tables);
  const rows = [];
  for (const [name, skills] of [['specialist 40/1/1', { sword: 40, bow: 1, staff: 1 }],
                                ['spread     14/14/14', { sword: 14, bow: 14, staff: 14 }]]) {
    const cells = [];
    for (const mLvl of [42, 47]) {
      const E = tables === PROPOSED ? edge(skills.sword + skills.bow + skills.staff, mLvl) : 1;
      const b = build(skills, tables, E);
      setBuild(skills, b.lane, b.shared);
      const bru = monster('brute', mLvl);
      cells.push(`${pad(f1(hitsToKill(bru)), 4)} / ${pad(f1(hitsToDie(bru)), 4)}`);
    }
    rows.push(`    ${label} ${name.padEnd(19)} | ${cells[0].padEnd(14)} | ${cells[1]}`);
  }
  console.log(rows.join('\n'));
}
applyTables(TODAY);

console.log('\n7b. THE CROSS-TRAIN INCENTIVE, and the yardstick that removes it');
console.log('    identical Melee 40 in every row: same abyssal greatsword, same skill damage, same Melee lane depth.');
console.log('    Only the OFF-SKILLS differ, which is the cheapest XP in the game (7d).  vs a Lv 50 brute.');
console.log('    decision 2-A: the edge measures the CHARACTER level (Σ skills).  2-B: the LANE\'s own skill (shared: your best).');
console.log('    build            | char |  today      | 2-A edge / hits / survive | 2-B edge / hits / survive');
for (const [name, skills] of [['pure  40/1/1  ', { sword: 40, bow: 1, staff: 1 }],
                              ['cross 40/10/10', { sword: 40, bow: 10, staff: 10 }],
                              ['cross 40/20/20', { sword: 40, bow: 20, staff: 20 }]]) {
  const charLevel = skills.sword + skills.bow + skills.staff;
  const bru = monster('brute', 50);
  applyTables(TODAY);
  let b = build(skills, TODAY, 1); setBuild(skills, b.lane, b.shared);
  const t = `${pad(f1(hitsToKill(bru)), 4)} / ${pad(f1(hitsToDie(bru)), 4)}`;
  applyTables(PROPOSED);
  /* 2-A — one yardstick, the character level. */
  const eA = edge(charLevel, 50);
  b = build(skills, PROPOSED, eA); setBuild(skills, b.lane, b.shared);
  const pA = `${pad(Math.round(eA * 100) + '%', 4)} / ${pad(f1(hitsToKill(bru)), 4)} / ${pad(f1(hitsToDie(bru)), 4)}`;
  /* 2-B — lane stats against the lane's own trained level, shared against the
     highest trained skill.  Both are fixed by what you actually trained, so
     neither can be lifted by cheap off-skill XP. */
  const best = Math.max(skills.sword, skills.bow, skills.staff);
  const eB = { lane: edge(skills.sword, 50), shared: edge(best, 50) };
  b = build(skills, PROPOSED, eB); setBuild(skills, b.lane, b.shared);
  const pB = `${pad(Math.round(eB.lane * 100) + '%', 4)} / ${pad(f1(hitsToKill(bru)), 4)} / ${pad(f1(hitsToDie(bru)), 4)}`;
  console.log(`    ${name}   |  ${pad(charLevel, 3)} | ${t} | ${pA}        | ${pB}`);
}
applyTables(TODAY);

console.log('\n7c. ONE STAT ONLY — a pure Defense build, and where the surplus has to go');
console.log('    char | shared pts | today: placed in def (cap 100) | proposed: placed in def (cap 40) + spill');
for (const S of [12, 20, 38, 50, 80]) {
  const charLevel = S + 2, sharedBudget = 3 * (charLevel - 3);
  const tDef = Math.min(100, charLevel, sharedBudget);
  const pDef = Math.min(40, charLevel, sharedBudget);
  console.log(`    ${pad(charLevel, 4)} | ${pad(sharedBudget, 10)} | ${pad(tDef, 3)} pts -> ${pad((tDef * 0.4).toFixed(1) + '%', 6)}          | ${pad(pDef, 3)} pts -> ${pad((pDef * 1.0).toFixed(1) + '%', 6)} + ${pad(sharedBudget - pDef, 3)} elsewhere`);
}

console.log('\n7d. WHEN THE RELATIVE GAME ENDS, and what a character level costs');
{
  const relLane = (t) => ['dmg', 'luck', 'special', 'elem'].reduce((n, k) => n + t.ATK[k].cap, 0);
  const relShared = (t) => ['def', 'dodge', 'eres'].reduce((n, k) => n + t.BODY[k].cap, 0);
  /* A specialist's lane/shared budgets are both 3 × (Melee − 1) + the two
     off-skills' 0; solve for the Melee level that fills each, and take the
     double cap into account (a stat cannot exceed the character level). */
  const fillAt = (sinks, biggestCap) => {
    for (let S = 1; S <= 100; S++) {
      const charLevel = S + 2, budget = 3 * (S - 1);
      if (budget >= sinks && charLevel >= biggestCap) return charLevel;
    }
    return null;
  };
  const tL = fillAt(relLane(TODAY), Math.max(...['dmg', 'luck', 'special', 'elem'].map((k) => TODAY.ATK[k].cap)));
  const pL = fillAt(relLane(PROPOSED), Math.max(...['dmg', 'luck', 'special', 'elem'].map((k) => PROPOSED.ATK[k].cap)));
  const tS = fillAt(relShared(TODAY), Math.max(...['def', 'dodge', 'eres'].map((k) => TODAY.BODY[k].cap)));
  const pS = fillAt(relShared(PROPOSED), Math.max(...['def', 'dodge', 'eres'].map((k) => PROPOSED.BODY[k].cap)));
  console.log(`    relative LANE stats all at cap:   today ${tL === null ? 'NEVER (' + relLane(TODAY) + ' sinks vs 297 lane points at Melee 100)' : 'char ' + tL}   proposed char ${pL}`);
  console.log(`    relative SHARED stats all at cap: today ${tS === null ? 'NEVER' : 'char ' + tS}   proposed char ${pS}`);
  console.log(`    (sinks: lane ${relLane(TODAY)} -> ${relLane(PROPOSED)},  shared ${relShared(TODAY)} -> ${relShared(PROPOSED)})`);
  const cum = (n) => { let t = 0; for (let l = 1; l < n; l++) t += prog3XpRequired(l); return t; };
  console.log('\n    XP per character level, from Melee 40 / 1 / 1 (char 42) — the edge makes this a real choice:');
  console.log(`      deepen  Melee 40 -> 43         : ${pad(Math.round(cum(43) - cum(40)).toLocaleString(), 9)} xp for  +3 char level  (and +4.5 skill damage, +9 Melee lane pts)`);
  console.log(`      cross   Bow/Magic 1 -> 4 each  : ${pad(Math.round(2 * (cum(4) - cum(1))).toLocaleString(), 9)} xp for  +6 char level  (and +18 pts, but 18 of them in lanes a sword cannot use)`);
  console.log(`      cross   Bow/Magic 1 -> 10 each : ${pad(Math.round(2 * (cum(10) - cum(1))).toLocaleString(), 9)} xp for +18 char level`);
  console.log(`      cross   Bow/Magic 1 -> 20 each : ${pad(Math.round(2 * (cum(20) - cum(1))).toLocaleString(), 9)} xp for +38 char level`);
}
applyTables(TODAY);

/* ═══ 8. UNCAPPED — what happens if no relative stat has a hard cap ═══
 *
 * Owner, 2026-09-22: "I don't really like the idea of capping.  What happens
 * if you let it go uncapped?"
 *
 * A cap does two different jobs and only one of them is a design choice:
 *   SAFETY — stop a PERCENTAGE stat reaching 100 %.  Defense at −1 %/pt hits
 *     immunity at 100 points; Dodge hits never-miss.  That is arithmetic, not
 *     taste, and no amount of "just let it ride" survives it.
 *   SCARCITY — force a build choice by running you out of room.  That is the
 *     design-y one, and it is the one the owner is rejecting.
 *
 * So this section measures the only honest way to grant the ask: keep every
 * stat uncapped and change the SHAPE of the three that cannot be linear.
 *   linear, uncapped     Power, Luck's crit DAMAGE, Special, Element
 *   diminishing, uncapped  Defense, Dodge, Resist, Luck's crit CHANCE
 *     value = p / (p + K), the standard armour curve.  Front-loaded (the
 *     first point is worth ~7x the hundredth), asymptotic to 1 so it can
 *     never reach immunity, and K is chosen so the curve passes EXACTLY
 *     through the capped proposal's endpoint — §4's whole table still holds
 *     at those point counts, and everything past them is a new tail.
 *
 * HOW IT IS APPLIED HERE.  The shipped readers are linear (pts x per), so a
 * curve is fed through them by setting `per` to value(pts)/pts for the cell
 * being measured — identical arithmetic, and it keeps the sim driving the
 * REAL _applyDamage / _computeAttackDamage rather than a copy. */
const UNCAPPED = {
  K: { def: 60, dodge: 70, eres: 70, luck: 70 },   /* through the capped endpoints */
  LIN: { dmg: 1.5, critDmg: 0.03, special: 0.03, elem: 3 },
};
const curve = (p, K) => (p <= 0 ? 0 : p / (p + K));
/* Set the tables so a linear reader reproduces the curve at THIS point count,
   with the edge applied to the count (where the design puts it). */
function applyUncapped(pts, E) {
  const e = (E == null) ? 1 : E;
  for (const k of ['def', 'dodge', 'eres']) {
    const n = pts[k] || 0;
    PROG3.BODY[k].cap = 99999;
    PROG3.BODY[k].per = n > 0 ? curve(n * e, UNCAPPED.K[k]) / n : 0;
  }
  PROG3.ATK.luck.cap = 99999;
  const L = pts.luck || 0;
  PROG3.ATK.luck.per = L > 0 ? curve(L * e, UNCAPPED.K.luck) / L : 0;
  PROG3.ATK.luck.dmgPer = UNCAPPED.LIN.critDmg * e;   /* linear, edge on the value */
  for (const [k, v] of Object.entries({ dmg: 'dmg', special: 'special', elem: 'elem' })) {
    PROG3.ATK[v].cap = 99999;
    PROG3.ATK[v].per = UNCAPPED.LIN[k] * e;
  }
}

console.log('\n8a. THE CURVES — every stat uncapped, and where the capped proposal\'s endpoint sits on them');
console.log('    p/(p+K) for the four percentage stats; the rest stay linear.  ✳ marks the capped endpoint.');
console.log('    stat     |     10 |     25 |     40 |    100 |    297 |    891 | capped proposal');
{
  const row = (name, f, capPts, capTxt) => {
    const cells = [10, 25, 40, 100, 297, 891].map((n) => pad(f(n) + (n === capPts ? '✳' : ''), 6));
    console.log(`    ${name.padEnd(8)} | ${cells.join(' | ')} | ${capTxt}`);
  };
  row('Defense', (n) => (curve(n, 60) * 100).toFixed(0) + '%', 40, '40 pts = −40 %');
  row('Dodge', (n) => (curve(n, 70) * 100).toFixed(0) + '%', 30, '30 pts = 30 %');
  row('Resist', (n) => (curve(n, 70) * 100).toFixed(0) + '%', 30, '30 pts = 30 %');
  row('Luck cr%', (n) => (1 + curve(n, 70) * 100).toFixed(0) + '%', 30, '30 pts = 31 %');
  row('Luck crX', (n) => '×' + (1.5 + n * 0.03).toFixed(1), 30, '30 pts = ×2.4');
  row('Power', (n) => '+' + (n * 1.5).toFixed(0), 25, '25 pts = +37.5');
  row('Special', (n) => '+' + (n * 3).toFixed(0) + '%', 25, '25 pts = +75 %');
  row('Element', (n) => '+' + (n * 3).toFixed(0), 25, '25 pts = +75');
  console.log('    marginal value of the NEXT Defense point:  1st 1.67 %  ·  40th 0.60 %  ·  100th 0.23 %  ·  297th 0.05 %');
}

console.log('\n8b. THE IMMUNITY CHECK — the one thing a cap was actually protecting');
console.log('    a pure-avoidance build spending EVERY shared point it has ever earned, split Defense/Dodge:');
console.log('    build              | shared pts | Defense | Dodge | damage through | vs a linear −1 %/pt stat');
for (const [name, sharedPts] of [['char 40  (Melee 38)', 111], ['char 102 (Melee 100)', 297], ['char 300 (100/100/100)', 891]]) {
  const d = Math.floor(sharedPts / 2), g = sharedPts - d;
  const dr = curve(d, 60), gr = curve(g, 70);
  const through = (1 - dr) * (1 - gr);
  const linear = Math.max(0, 1 - d * 0.01) * Math.max(0, 1 - g * 0.01);
  console.log(`    ${name.padEnd(18)} | ${pad(sharedPts, 10)} | ${pad((dr * 100).toFixed(0) + '%', 7)} | ${pad((gr * 100).toFixed(0) + '%', 5)} | ${pad((through * 100).toFixed(1) + '%', 14)} | ${linear <= 0 ? 'IMMUNE (0 %) — unplayable' : (linear * 100).toFixed(1) + '%'}`);
}
console.log('    (the floor-1 clamp in _applyDamage still applies, so "damage through" never reaches zero in practice)');

console.log('\n8c. UNCAPPED IN PLAY — the same fixture as §4, at three character levels, vs an AT-LEVEL brute');
console.log('    striker: every lane point into Power then Luck.  tank: every shared point into Defense then Dodge.');
console.log('    char | build   |    capped: hits / survive |  uncapped: hits / survive');
for (const [charLevel, sk] of [[40, 38], [102, 100]]) {
  const bru = monster('brute', Math.min(100, charLevel));
  const lanePts = 3 * (sk - 1), sharedPts = 3 * (charLevel - 3);
  /* capped */
  applyTables(PROPOSED);
  let lane = spend(lanePts, ['dmg', 'luck', 'special', 'elem', 'aspd', 'range'], { ...PROG3.ATK, ...PROPOSED.ATK }, charLevel, 1).out;
  let shared = spend(sharedPts, ['def', 'dodge', 'eres', 'hp', 'stam', 'mana', 'move'], { ...PROG3.BODY, ...PROPOSED.BODY }, charLevel, 1).out;
  setBuild({ sword: sk, bow: 1, staff: 1 }, lane, shared);
  const cS = `${pad(f1(hitsToKill(bru)), 4)} / ${pad(f1(hitsToDie(bru)), 4)}`;
  /* uncapped — everything into the two front stats, no cap to stop it */
  const uLane = { dmg: Math.ceil(lanePts / 2), luck: Math.floor(lanePts / 2) };
  const uShared = { def: Math.ceil(sharedPts / 2), dodge: Math.floor(sharedPts / 2) };
  applyUncapped({ ...uLane, ...uShared }, 1);
  setBuild({ sword: sk, bow: 1, staff: 1 }, uLane, uShared);
  const uS = `${pad(f1(hitsToKill(bru)), 4)} / ${pad(f1(hitsToDie(bru)), 4)}`;
  console.log(`    ${pad(charLevel, 4)} | striker |  ${cS}              |  ${uS}`);
}
applyTables(TODAY);

console.log('\n8d. DOES UNCAPPING THE DAMAGE STATS EVEN MATTER? — Melee 100, worldbreaker greatsword (tierMult 7.84)');
{
  const bru = monster('brute', 100);
  const meanRoll = () => { let t = 0; for (let i = 0; i < HITS; i++) t += room._computeAttackDamage(ps, 'melee', false).dmg; return t / HITS; };
  const cells = [];
  for (const [label, tables, lane] of [
    ['no points at all ', PROPOSED, {}],
    ['Power capped   25', PROPOSED, { dmg: 25 }],
    ['Power uncapped 297', null, { dmg: 297 }]]) {
    if (tables) applyTables(tables); else applyUncapped({ dmg: 297 }, 1);
    setBuild({ sword: 100, bow: 1, staff: 1 }, lane, {});
    ps.weapon = { type: 'greatsword', tierMult: 7.84 };
    cells.push(`    ${label.padEnd(19)} mean swing ${pad(Math.round(meanRoll()), 5)}  vs the brute's ${bru.hp} hp  ->  ${f2(hitsToKill(bru))} hits`);
  }
  console.log(cells.join('\n'));
  console.log(`    The skill term alone is 100 × 1.5 = 150 against a weapon base of 10, so the TOP END was never`);
  console.log(`    what the cap was protecting — a Melee 100 with endgame gear already one-shots the biggest`);
  console.log(`    monster in the game with zero points spent.`);
}
applyTables(TODAY);

console.log('\n8e. ANTICHEAT with nothing capped — the check that decides whether this is shippable');
{
  applyUncapped({ dmg: 297, luck: 297, special: 297 }, 1);
  setBuild({ sword: 100, bow: 100, staff: 100 }, {}, {});
  ps.weapon = { type: 'sword', tierMult: 6, isVolatile: true };
  ps.rangedWeapon = { type: 'bow', tierMult: 6 };
  ps.staffWeapon = { type: 'staff', tierMult: 6 };
  for (const c of PROG3.SKILLS) { ps.prog3.atk[c].luck = 297; ps.prog3.atk[c].dmg = 297; ps.prog3.atk[c].special = 297; }
  ps._buffs = { damageMul: 2.0 };
  let ok = true, worst = 0;
  for (const special of [false, true]) {
    const cap = room._maxDmgForAttacker(ps, special);
    for (let i = 0; i < 400; i++) for (const slot of ['melee', 'ranged', 'staff']) {
      const { dmg } = room._computeAttackDamage(ps, slot, special);
      worst = Math.max(worst, dmg / cap);
      if (dmg > cap) ok = false;
    }
  }
  console.log(`    ${ok ? 'PASS' : 'FAIL'} — peak roll at ${(worst * 100).toFixed(1)}% of the ceiling.`);
  console.log(`    It holds for the same reason it holds when capped: _maxWeaponDmg / _maxDmgForAttacker read the`);
  console.log(`    SAME constants the roll does, so removing a cap raises both by construction (the v2.3.1451 rule).`);
  ps._buffs = null; ps.rangedWeapon = null; ps.staffWeapon = null;
}
applyTables(TODAY);

/* ═══ 8f. THE OWNER'S SHAPE — linear, no stat cap, a 90 % ceiling (decision 5-C) ═══
 *
 * Owner, 2026-09-22, after reading 8a-8e: "I do want to remove the caps
 * completely until it hits something ridiculous like 90% for dodge."
 *
 * So: every relative stat stays LINEAR at §3's per-point weight (−1 %/pt
 * Defense, +1 %/pt Dodge, −1 %/pt Resist, +1 %/pt crit chance), there is no
 * point cap below the ceiling, and the four percentage stats stop at 90 %.
 * Power, Special, Element and crit damage have no ceiling at all.
 *
 * Said plainly, because it decides how the spend UI behaves: on a linear
 * stat a ceiling on the PERCENT is a cap on the POINTS — 90 % at 1 %/pt is
 * 90 points, and a 91st point would buy nothing.  What changes against 5-A
 * is where it sits (Dodge 30 → 90 points, Defense 40 → 90), and that it sits
 * at a number the owner calls ridiculous rather than one that shapes builds.
 *
 * Applied here the direct way: the shipped readers are min(cap, pts) × per,
 * so a 90-point cap at 1 %/pt IS the ceiling, exactly.  Luck is the one stat
 * whose ceiling must clamp the percent and not the points, because its crit
 * DAMAGE half stays linear — so it goes through the value(pts)/pts path. */
const CEIL = { PCT: 0.90, PTS: 90, LUCK_PTS: 89 };   /* luck has a 1 % base */
function applyCeiling(lanePts) {
  for (const k of ['def', 'dodge', 'eres']) Object.assign(PROG3.BODY[k], { per: 0.01, cap: CEIL.PTS });
  const L = (lanePts && lanePts.luck) || 0;
  Object.assign(PROG3.ATK.luck, { cap: 99999, dmgPer: 0.03, per: L > 0 ? Math.min(L, CEIL.LUCK_PTS) * 0.01 / L : 0 });
  Object.assign(PROG3.ATK.dmg, { per: 1.5, cap: 99999 });
  Object.assign(PROG3.ATK.special, { per: 0.03, cap: 99999 });
  Object.assign(PROG3.ATK.elem, { per: 3, cap: 99999 });
}

console.log('\n8f. THE OWNER\'S SHAPE (5-C) — linear at §3\'s weight, NO stat cap, the four percentage stats stop at 90 %');
console.log('    WHEN CAN ANYONE REACH IT?  Linear at 1 %/pt, 90 % is 90 points.  The §6-C per-level bound');
console.log('    (no stat holds more points than your character level) is what paces the approach:');
console.log('    stat          | points to 90 % | earliest char, bound = charLevel | bound = 2 × charLevel (decision 13-A)');
for (const [name, pts, loosened] of [['Dodge', 90, true], ['Resist', 90, true], ['Defense', 90, false], ['Luck crit %', 89, true]]) {
  console.log(`    ${name.padEnd(13)} | ${pad(pts, 14)} | ${pad('char ' + pts, 32)} | ${loosened ? 'char ' + Math.ceil(pts / 2) : 'char ' + pts + ' (13-A keeps def at 1 ×)'}`);
}
console.log('    Below character 10 no stat can hold more than 10 points, so NOTHING in §4.7 comes near the ceiling:');
console.log('    5-C is EXACTLY the linear per-point weight §4 and §4.7 were measured at, with no cap in reach.');

console.log('\n    THE TANK UNDER EACH SHAPE — every shared point into Defense, then Dodge, then Resist, then HP;');
console.log('    vs an AT-LEVEL brute (physical, so Resist does not apply).  "swings" = brute hits to kill you, real sink.');
console.log('    char | skills      | 5-B curve, bound L         | 5-C ceiling, bound L       | 5-C + 13-A (dodge/eres 2L)');
{
  const place = (sharedPts, bound, ceil) => {
    const out = {}; let left = sharedPts;
    for (const k of ['def', 'dodge', 'eres']) {
      const room2 = Math.min(bound(k), ceil == null ? Infinity : ceil);
      const take = Math.min(left, room2);
      if (take > 0) { out[k] = take; left -= take; }
    }
    return { out, left };
  };
  for (const [L, skills] of [[20, { sword: 18 }], [40, { sword: 38 }], [63, { sword: 61 }], [90, { sword: 88 }], [102, { sword: 100 }], [300, { sword: 100, bow: 100, staff: 100 }]]) {
    const sharedPts = 3 * (L - 3);
    const bru = monster('brute', Math.min(100, L));
    const cells = [];
    for (const [shape, bound] of [
      ['curve', () => L],
      ['ceil', () => L],
      ['ceil', (k) => (k === 'def' ? L : 2 * L)]]) {
      const { out, left } = place(sharedPts, bound, shape === 'ceil' ? CEIL.PTS : null);
      const hp = Math.min(left, PROG3.BODY.hp.cap, L);
      const shared = { ...out, hp };
      let dr, gr;
      if (shape === 'curve') { applyUncapped(out, 1); dr = curve(out.def || 0, 60); gr = curve(out.dodge || 0, 70); }
      else { applyCeiling({}); dr = Math.min(CEIL.PCT, (out.def || 0) * 0.01); gr = Math.min(CEIL.PCT, (out.dodge || 0) * 0.01); }
      setBuild(skills, {}, shared);
      const through = (1 - dr) * (1 - gr);
      cells.push(`${pad((dr * 100).toFixed(0), 2)}/${pad((gr * 100).toFixed(0), 2)} % · ${pad((through * 100).toFixed(1) + '%', 5)} · ${pad(f1(hitsToDie(bru)), 5)}`);
      applyTables(TODAY);
    }
    const sk = `${skills.sword}/${skills.bow || 1}/${skills.staff || 1}`;
    console.log(`    ${pad(L, 4)} | ${sk.padEnd(11)} | ${cells[0].padEnd(26)} | ${cells[1].padEnd(26)} | ${cells[2]}`);
  }
  console.log('    cells are Defense/Dodge % · damage through · swings.  The floor-1 clamp keeps "through" above zero in play.');
  /* Decision 12-C, the combined floor: Defense and Dodge together never cut a
     hit below 10 %.  With Dodge at its 90 % ceiling that floor leaves Defense
     nothing to add, which is exactly a character with Dodge 90 and Defense 0
     — so it is measured as that, through the same sink. */
  for (const L of [90, 102]) {
    applyCeiling({});
    setBuild({ sword: L - 2 }, {}, { dodge: 90, eres: Math.min(L, 90), hp: Math.min(PROG3.BODY.hp.cap, L) });
    console.log(`    12-C floor, char ${L}: Dodge 90 %, Defense adds nothing past the floor · 10.0% through · ${f1(hitsToDie(monster('brute', Math.min(100, L))))} swings`);
    applyTables(TODAY);
  }
}
applyTables(TODAY);

console.log('\n    ANTICHEAT under the ceiling — Power, Luck and Special at 297 each (crit chance clamps at 90 %)');
{
  applyCeiling({ luck: 297 });
  setBuild({ sword: 100, bow: 100, staff: 100 }, {}, {});
  ps.weapon = { type: 'sword', tierMult: 6, isVolatile: true };
  ps.rangedWeapon = { type: 'bow', tierMult: 6 };
  ps.staffWeapon = { type: 'staff', tierMult: 6 };
  for (const c of PROG3.SKILLS) { ps.prog3.atk[c].luck = 297; ps.prog3.atk[c].dmg = 297; ps.prog3.atk[c].special = 297; }
  ps._buffs = { damageMul: 2.0 };
  let ok = true, worst = 0;
  for (const special of [false, true]) {
    const cap = room._maxDmgForAttacker(ps, special);
    for (let i = 0; i < 400; i++) for (const slot of ['melee', 'ranged', 'staff']) {
      const { dmg } = room._computeAttackDamage(ps, slot, special);
      worst = Math.max(worst, dmg / cap);
      if (dmg > cap) ok = false;
    }
  }
  console.log(`    ${ok ? 'PASS' : 'FAIL'} — peak roll at ${(worst * 100).toFixed(1)}% of the ceiling (crit chance ${(room._prog3CritChance(ps, 'sword') * 100).toFixed(0)} %).`);
  ps._buffs = null; ps.rangedWeapon = null; ps.staffWeapon = null;
}
applyTables(TODAY);

/* ═══ 8g. THE PICKS — 5-C + 12-C + 13-B, and the armour gate they collide with ═══
 *
 * Owner, 2026-09-22: "Yes do combined floor and keep per level limit on
 * those 3."  So the configuration is now:
 *   5-C   linear, no stat cap, the four percentage stats stop at 90 %;
 *   12-C  Dodge x Defense (x Resist, on an elemental hit) never lets less
 *         than 10 % of a hit through — enforced on the CUT, after the dodge
 *         roll: cut = max(defMult x eMult, 0.10 / (1 - dodge)).  Armour, the
 *         resist buff and the legacy soaks apply AFTER it and are NOT floored:
 *         the floor is on what POINTS buy, and gear is where the owner wants
 *         the endgame decided;
 *   13-B  Defense, Dodge and Resist keep the per-level bound (points <=
 *         character level); the four damage stats loosen to 2 x.
 *
 * THE COLLISION.  Armour tiers gate on allocated Defense POINTS
 * (_prog3GearOk 'defense', PROGRESSION-REDESIGN §6 — the owner's own ask):
 * rung r above copper needs 5r points, so the top armour asks 90.  Every
 * shape in this note makes a Defense point 2.5x heavier, so the SAME 90
 * points is 90 % Defense instead of 36 % — the ridiculous number becomes the
 * price of the best armour, for every build.  8g measures the gate options
 * with real armour on, through the real _armorDrMult:
 *   14-A  keep 5 points per rung (top armour: 90 points = 90 % Defense);
 *   14-C  2 points per rung (the same Defense PERCENT today's gate asks —
 *         36 % for the top) AND character level >= 5 per rung (the same
 *         PACING today's gate gives, via the per-level bound).
 *
 * The floor is applied here the same way everything else is: through the
 * real sink, by setting Defense's per-point value so pts x per reads the
 * floored cut at this build (identical arithmetic in the linear reader). */
const FLOOR = 0.10;
const TIER_ORDER = Object.keys(BLACKSMITH_TIERS);
const COPPER = TIER_ORDER.indexOf('copper');
/* Wear the best armour pair a gate allows: rung above copper, chest + legs. */
function wearRung(rung) {
  if (rung < 0) { ps.armor = null; ps.legsArmor = null; return null; }
  const key = TIER_ORDER[Math.min(TIER_ORDER.length - 1, COPPER + rung)];
  const tm = BLACKSMITH_TIERS[key].tierMult;
  ps.armor = { tierMult: tm, gearBase: key };
  ps.legsArmor = { tierMult: tm, gearBase: key };
  return key;
}
/* Mean damage through (fraction of a raw hit) and swings-to-die, at-level brute. */
function tankCell(L) {
  const bru = monster('brute', Math.min(100, L));
  const through = dmgTakenPerHit(bru) / bru.dmg;
  return { through, swings: hitsToDie(bru) };
}
const skillsFor = (L) => (L > 102 ? { sword: 100, bow: 100, staff: 100 } : { sword: L - 2 });

console.log('\n8g. THE PICKS (5-C + 12-C floor + 13-B bound) — the strongest legitimate tank, with and without armour');
console.log('    vs an AT-LEVEL brute.  Build: Dodge to its limit, then only as much Defense as still counts');
console.log('    (or the armour gate demands), then HP.  Armour = the best pair the gate allows at that level.');
console.log('    cells: damage through · brute swings to kill you');
console.log('    char | TODAY + best armour (gate: 5 pts/rung)  | PICKS, no armour     | PICKS + best armour, gate 14-C');
for (const L of [20, 40, 63, 90, 102, 300]) {
  const shared = 3 * (L - 3), cells = [];
  /* TODAY: dodge 0.4 %/pt cap 75, def 0.4 %/pt cap 100, bound L; the gate
     reads def points at 5 per rung, so def points ARE the armour. */
  {
    applyTables(TODAY);
    let left = shared;
    const dodge = Math.min(75, L, left); left -= dodge;
    const def = Math.min(100, L, left); left -= def;
    const hp = Math.min(PROG3.BODY.hp.cap, L, left);
    setBuild(skillsFor(L), {}, { dodge, def, hp });
    const key = wearRung(Math.min(18, Math.floor(def / 5)));
    const c = tankCell(L);
    cells.push(`${pad((c.through * 100).toFixed(1) + '%', 6)} · ${pad(f1(c.swings), 6)}  (${key})`);
    wearRung(-1);
  }
  /* PICKS */
  for (const armoured of [false, true]) {
    applyCeiling({});
    let left = shared;
    const dodge = Math.min(CEIL.PTS, L, left); left -= dodge;
    const dodgePct = Math.min(CEIL.PCT, dodge * 0.01);
    /* Defense that still counts under the floor at edge 1. */
    const useful = Math.max(0, Math.ceil((1 - FLOOR / (1 - dodgePct)) * 100 - 1e-9));
    const rung = armoured ? Math.min(18, Math.floor(L / 5)) : -1;          /* 14-C pacing: level >= 5r */
    const gateDef = armoured ? 2 * Math.max(0, rung) : 0;                  /* 14-C value: 2 pts/rung */
    const def = Math.min(CEIL.PTS, L, left, Math.max(useful, gateDef)); left -= def;
    const hp = Math.min(PROG3.BODY.hp.cap, L, left);
    setBuild(skillsFor(L), {}, { dodge, def, hp });
    /* the floor, on the cut */
    const cut = Math.max(1 - def * 0.01, FLOOR / (1 - dodgePct));
    PROG3.BODY.def.per = def > 0 ? (1 - cut) / def : 0;
    const key = wearRung(rung);
    const c = tankCell(L);
    cells.push(`${pad((c.through * 100).toFixed(1) + '%', 6)} · ${pad(f1(c.swings), 6)}${armoured ? `  (${key}, def ${def})` : `  (def ${def})`}`);
    wearRung(-1);
    applyTables(TODAY);
  }
  console.log(`    ${pad(L, 4)} | ${cells[0].padEnd(39)} | ${cells[1].padEnd(20)} | ${cells[2]}`);
}
applyTables(TODAY);

console.log('\n    THE GATE ITSELF — what wearing the TOP armour (18 rungs above copper) demands of a character 90 with');
console.log('    no Dodge at all, under each gate.  The armour is the same; only what the gate forces you to hold moves.');
for (const [label, defPts] of [['today (5 pts/rung, 0.4 %/pt)  ', 90], ['14-A (5 pts/rung, 1 %/pt)     ', 90], ['14-C (2 pts/rung, 1 %/pt)     ', 36]]) {
  if (label.startsWith('today')) applyTables(TODAY); else applyCeiling({});
  setBuild({ sword: 88 }, {}, { def: defPts, hp: 90 });
  wearRung(18);
  const c = tankCell(90);
  const defPct = defPts * PROG3.BODY.def.per * 100;
  console.log(`    ${label} | holds ${pad(defPts, 2)} Defense = ${pad(defPct.toFixed(0), 2)} %  | ${pad((c.through * 100).toFixed(1) + '%', 6)} through · ${pad(f1(c.swings), 6)} swings`);
  wearRung(-1);
  applyTables(TODAY);
}
console.log('    14-C reproduces today\'s top-armour wearer exactly; 14-A turns every top-armour wearer into a tank.');

/* ═══ 9. THE FIRST HOUR — character level 3 to 10 ═══
 *
 * Owner: "as a level 10 player, show me how when they allocate stats they feel
 * a difference in power through their leveling.  This is probably the steepest
 * drop off for the game where people just try it and quit."
 *
 * So this section is not about balance, it is about whether the climb reads.
 * Three things a new player actually judges, in the order they meet them:
 *   9a  the climb — every level from 3 to 10, with the points a real player
 *       has banked by then, against BOTH the monsters the shipped world spawns
 *       (level 1-2, pinned by the v2.3.1160 directive) and the at-level ones
 *       the depth zones will spawn.
 *   9b  the spend moment — at level 10, what ONE point, one level-up's three,
 *       and the whole banked pool do, in HITS and in the NUMBER ON SCREEN.
 *   9c  what is boring at level 10 regardless of the stat curve.
 *
 * THE NUMBER ON SCREEN is the half that matters most here and the half a
 * hits-to-kill table cannot show.  Damage is displayed at 1/5 scale
 * (DISPLAY_SCALE_K, the owner's display-only decision), so a change that does
 * not move the printed integer is a change the player does not see.  Every
 * "shows" column below is sampled from the REAL roll and put through the real
 * rounding: Math.max(1, Math.round(dmg / 5)). */
const DISPLAY_K = 5;
function shownRange(n) {
  let lo = Infinity, hi = 0;
  for (let i = 0; i < n; i++) {
    const d = Math.max(1, Math.round(room._computeAttackDamage(ps, 'melee', false).dmg / DISPLAY_K));
    if (d < lo) lo = d; if (d > hi) hi = d;
  }
  return lo === hi ? String(lo) : `${lo}-${hi}`;
}
/* The build a real player at character level L is holding: 3 lane + 3 shared
   points per level-up since level 3, spent striker-first, and every stat still
   bound by the §6-C double cap min(cap, charLevel) — which is the ONLY limit
   that binds this early, under either shape. */
function earlyBuild(charLevel, tables) {
  const lanePts = 3 * (charLevel - 3), sharedPts = 3 * (charLevel - 3);
  const atkT = { ...PROG3.ATK, ...tables.ATK }, bodyT = { ...PROG3.BODY, ...tables.BODY };
  return {
    lane: spend(lanePts, ['dmg', 'luck', 'special'], atkT, charLevel, 1).out,
    shared: spend(sharedPts, ['hp', 'def', 'dodge'], bodyT, charLevel, 1).out,
    lanePts, sharedPts,
  };
}

console.log('\n9a. THE CLIMB — every level from 3 to 10, with the points a player has banked by then');
console.log('    melee specialist, greatsword at the tier their Melee level unlocks, no armour.');
console.log('    "shows" = the damage number the popup prints (the roll ÷5, the live display scale).');
console.log('    fodder Lv1 = what the SHIPPED world spawns everywhere today.  brute = an AT-LEVEL one (depth zones).');
console.log('');
console.log('    char | Melee | tier |        TODAY: shows / fodder / brute     |     PROPOSED: shows / fodder / brute');
for (const L of [3, 4, 5, 6, 7, 8, 9, 10]) {
  const cells = [];
  for (const tables of [TODAY, PROPOSED]) {
    applyTables(tables);
    const b = earlyBuild(L, tables);
    setBuild({ sword: L - 2, bow: 1, staff: 1 }, b.lane, b.shared);
    const fod1 = monster('fodder', 1), bru = monster('brute', L);
    cells.push(`${pad(shownRange(600), 6)} / ${pad(f1(hitsToKill(fod1)), 4)} / ${pad(f1(hitsToKill(bru)), 4)}`);
  }
  applyTables(TODAY);
  const b0 = earlyBuild(L, TODAY);
  setBuild({ sword: L - 2, bow: 1, staff: 1 }, {}, {});
  console.log(`    ${pad(L, 4)} |   ${pad(L - 2, 3)} | ${f2(tierMultFor(L - 2))} |  ${cells[0]}                    |  ${cells[1]}`);
}
applyTables(TODAY);

console.log('\n9b. THE SPEND MOMENT — a character level 10 (Melee 8, copper greatsword), points going in one at a time');
console.log('    Every stat is double-capped at 10 here, so 10 Power is the most this character can hold.');
console.log('    A level-10 player has banked 21 lane + 21 shared points (7 level-ups × 3).');
console.log('');
console.log('    spend                        |       TODAY: shows / fodder Lv1 / brute Lv10 |   PROPOSED: shows / fodder / brute');
for (const [label, lane, shared] of [
  ['nothing spent               ', {}, {}],
  ['+1 Power                    ', { dmg: 1 }, {}],
  ['+3 Power (one level-up)     ', { dmg: 3 }, {}],
  ['+10 Power (the double cap)  ', { dmg: 10 }, {}],
  ['+10 Power +10 Luck          ', { dmg: 10, luck: 10 }, {}],
  ['...and 10 HP + 10 Defense   ', { dmg: 10, luck: 10 }, { hp: 10, def: 10 }],
]) {
  const cells = [];
  for (const tables of [TODAY, PROPOSED]) {
    applyTables(tables);
    setBuild({ sword: 8, bow: 1, staff: 1 }, lane, shared);
    const fod1 = monster('fodder', 1), bru = monster('brute', 10);
    cells.push(`${pad(shownRange(600), 6)} / ${pad(f1(hitsToKill(fod1)), 4)} / ${pad(f1(hitsToKill(bru)), 4)}`);
  }
  applyTables(TODAY);
  console.log(`    ${label} |       ${cells[0]}                 |   ${cells[1]}`);
}
applyTables(TODAY);

console.log('\n9c. AND WHAT A LEVEL-10 PLAYER IS ACTUALLY FIGHTING');
{
  applyTables(PROPOSED);
  const b = earlyBuild(10, PROPOSED);
  setBuild({ sword: 8, bow: 1, staff: 1 }, b.lane, b.shared);
  const rows = [['fodder', 1], ['fodder', 2], ['snowman', 2], ['brute', 2], ['brute', 10], ['brute', 12], ['brute', 15]];
  console.log('    a fully-spent level-10 character (proposed), against each monster the game can spawn:');
  console.log('    monster        | hp  | hits to kill | swings it needs to kill YOU');
  for (const [arch, lvl] of rows) {
    const m = monster(arch, lvl);
    const where = lvl <= 2 ? '  <- the SHIPPED world spawns these, everywhere' : '';
    console.log(`    ${(arch + ' Lv' + lvl).padEnd(14)} | ${pad(m.hp, 3)} | ${pad(f1(hitsToKill(m)), 12)} | ${pad(f1(hitsToDie(m)), 4)}${where}`);
  }
  applyTables(TODAY);
}
console.log('\n9d. THE FELT UNIT IS A WHOLE HIT, NOT A PERCENT');
console.log('    A player does not read "+14 % damage".  They read "this used to take three hits".');
console.log('    Rounded kill count on the fodder the shipped world spawns, and on an at-level brute:');
console.log('    char |  fodder Lv1: today -> proposed |  at-level brute: today -> proposed');
for (const L of [3, 4, 5, 6, 7, 8, 9, 10]) {
  const cells = [];
  for (const tables of [TODAY, PROPOSED]) {
    applyTables(tables);
    const b = earlyBuild(L, tables);
    setBuild({ sword: L - 2, bow: 1, staff: 1 }, b.lane, b.shared);
    cells.push([Math.round(hitsToKill(monster('fodder', 1))), Math.round(hitsToKill(monster('brute', L)))]);
  }
  applyTables(TODAY);
  const mark = (a, b2) => (a === b2 ? '   ' : ' <-');
  console.log(`    ${pad(L, 4)} |      ${cells[0][0]} -> ${cells[1][0]}${mark(cells[0][0], cells[1][0])}                    |        ${cells[0][1]} -> ${cells[1][1]}${mark(cells[0][1], cells[1][1])}`);
}
applyTables(TODAY);

console.log('\n9e. THE DIAL THAT MAKES A LEVEL-10 SPEND LOUD — the §6-C double cap');
console.log('    min(cap, charLevel) is what stops a level-10 character holding more than 10 in any stat,');
console.log('    while they have 21 lane points banked.  It is a pacing rule, not a balance one — so what');
console.log('    does the early game feel like if it loosens?  Same character, same 21 points, three rules:');
console.log('    rule                          | Power held | shows  | fodder Lv1 | brute Lv10');
for (const [label, capRule] of [
  ['min(cap, charLevel)  — today ', 10],
  ['min(cap, 2 × charLevel)      ', 20],
  ['no level cap (21 banked)     ', 21],
]) {
  applyTables(PROPOSED);
  setBuild({ sword: 8, bow: 1, staff: 1 }, { dmg: capRule }, {});
  console.log(`    ${label} |     ${pad(capRule, 6)} | ${pad(shownRange(600), 6)} | ${pad(f1(hitsToKill(monster('fodder', 1))), 10)} | ${pad(f1(hitsToKill(monster('brute', 10))), 6)}`);
}
applyTables(TODAY);

console.log('\n(done — see docs/specs/relative-points.md for what these tables decide)');
