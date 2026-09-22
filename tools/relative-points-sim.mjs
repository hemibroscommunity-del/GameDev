#!/usr/bin/env node
/* relative-points-sim — the referee for the RELATIVE POINT VALUE redesign
 * (docs/specs/relative-points.md, v2.3.2642).
 *
 *   node tools/relative-points-sim.mjs            # every table
 *   node tools/relative-points-sim.mjs --quick    # fewer samples
 *
 * WHAT IT ANSWERS.  The owner's ask: "whenever you allocate points, those
 * points carry a lot of weight at or under the current level monster with a
 * pretty steep decay as the combat levels go up (benefit nearly gone after 5
 * combat levels)".  Four questions, each its own table:
 *   1. THE EDGE CURVE — what fraction of a point's value applies at each
 *      level gap (the one rule the whole design is).
 *   2. "DO I FEEL A LEVEL-UP?" — one level's worth of points (3 lane + 3
 *      shared) placed into ONE stat, against an at-level monster: hits to
 *      kill / hits to die, TODAY vs PROPOSED, at several character levels.
 *   3. "THE WALL" — a fully-invested mid-game build against monsters from
 *      5 levels below to 5 above: today (universal points) vs proposed
 *      (points fade with the gap).
 *   4. "IS THE TOP END UNCHANGED?" — a maxed build at level 100 against a
 *      level-100 monster, today vs proposed (the design keeps every stat's
 *      at-cap effect; only the points-to-cap changes).
 * Plus the migration conversion for a few sample allocations, and the
 * anticheat sample (every proposed roll ≤ the ceiling), because a reprice
 * that trips the ceiling rejects legitimate hits (the v2.3.1451 rule).
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
console.log('\n(done — see docs/specs/relative-points.md for what these tables decide)');
