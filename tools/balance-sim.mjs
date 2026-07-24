/* ═══ BALANCE SIM — offline TTK/DPS auditor (docs/BALANCE-PLAN.md) ═══
 *
 * v2.3.1108: computes time-to-kill and damage tables from the REAL game
 * formulas (imported from src/data/gameSystems.js — never copied), plus a
 * preview of the two NOT-YET-IMPLEMENTED loot layers (hardening, quality
 * grades) composed per GDD §4.4 on the baseline-10 code scale.  The
 * preview formula provably reduces to the live formula at Hardness 0 /
 * Normal quality — asserted at startup, so the two can never drift apart
 * silently.
 *
 * Zero dependencies; plain `node tools/balance-sim.mjs`.  Flags:
 *   --level N        monster + player-band level     (default 1: prototype)
 *   --tier KEY       material tier key               (default: banded by level)
 *   --hardness 0..5  preview hardening level         (default 0)
 *   --quality Q      normal|rare|elite|godly         (default normal)
 *   --samples N      Monte Carlo swings per cell     (default 20000)
 *   --strict         exit 1 when an invariant gate fails (default: report only)
 *
 * Invariants audited (subset of GDD §22 adopted in docs/BALANCE-PLAN.md):
 *   INV-03 kill-time hit-range gates at the §6.5 audit points
 *   INV-06 EHP spread across builds within [1.5, 4.0]
 *   INV-14 lunge per-hit damage below auto-attack (cadence simplification)
 */
import {
  calcWeaponDmg, calcCritChance, calcCritMult, calcMaxHp,
  monsterStat, MONSTER_HP_CURVE, ARCHETYPES, WEAPON_TYPES, BLACKSMITH_TIERS,
  SPECIAL_ATK_MULT, LUNGE_DAMAGE_MULT, HP_PER_COMBAT_LEVEL,
  DAMAGE_CHANNEL_FLAT, passiveDodgeChance, getVigorFlat,
  swingCooldownMult, cleaveArcBonus, bowPierceCount, bowRangeMult, staffAoeMult,
  getIronSkinFlat, getBlockStaminaMult, poiseStunMult,
  getRecoveryFlat, getConditioningFlat, getStaminaFlat, getSwiftnessFlat,
  t2Accel, t2CounterRate, T2_UNITS,
  COMBAT_BUILD_CEILING, T2_CHANNEL_CAP,
  /* v2.3.1451: bench-locked pricing (--bench mode) */
  T2_BENCH, t2BenchStats, t2BenchLevel, t2PointValue, t2SpendLevel, t2ReplayFlat,
} from '../src/data/gameSystems.js';

/* ── args ── */
const argv = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = argv.indexOf('--' + name);
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : dflt;
};
const LEVEL = Math.max(1, parseInt(flag('level', '1'), 10) || 1);
const HARDNESS = Math.max(0, Math.min(5, parseInt(flag('hardness', '0'), 10) || 0));
const QUALITY_KEY = String(flag('quality', 'normal'));
const SAMPLES = Math.max(1000, parseInt(flag('samples', '20000'), 10) || 20000);
const STRICT = argv.includes('--strict');

/* GDD §4.6b quality grades (flat multiplier on base+hardness, pre-stat). */
const QUALITY = { normal: 1.00, rare: 1.20, elite: 1.50, godly: 3.00 };
const QUALITY_MULT = QUALITY[QUALITY_KEY] ?? 1.00;
/* GDD §4.6c: +5 base damage per hardness level on the GDD baseline-48
   scale -> ÷4.8 on the code's baseline-10 scale. */
const HARDNESS_BONUS_PER_LVL = 5 / 4.8;

/* Swing cadence: client/server swing cooldown is 600 ms (see the knockback
   economy comment in server/src/index.js).  TTK seconds = hits * 0.6. */
const SWING_SEC = 0.6;

/* Material tier for a level band: §6.5 pairs L15↔T3, L35↔T7, L65↔T13,
   L100↔T20 — tier index ≈ level/5, clamped to the 20-tier table. */
const TIER_KEYS = Object.keys(BLACKSMITH_TIERS);
const tierForLevel = (lvl) => TIER_KEYS[Math.max(0, Math.min(TIER_KEYS.length - 1, Math.round(lvl / 5) - 1))];
const TIER_KEY = String(flag('tier', tierForLevel(LEVEL)));
const TIER = BLACKSMITH_TIERS[TIER_KEY];
if (!TIER) { console.error('Unknown tier key:', TIER_KEY, '— valid:', TIER_KEYS.join(', ')); process.exit(1); }

/* ── build profiles ──
   Combat level IS the sum of the five T1 stats (v2.3.910), so a build is
   just a stat split of `LEVEL` points.  Median-Power follows the §6.5
   audit convention: power = 6 + (L-1)*1.05, remainder spread evenly. */
function mkBuild(name, split) {
  const b = { name, power: 0, vitality: 0, endurance: 0, agility: 0, mind: 0 };
  for (const [stat, share] of Object.entries(split)) b[stat] = Math.round(LEVEL * share);
  return b;
}
const medianPower = Math.min(LEVEL, Math.round(6 + (LEVEL - 1) * 1.05));
const BUILDS = [
  { name: 'median', power: medianPower, vitality: Math.max(0, Math.round((LEVEL - medianPower) * 0.5)), endurance: 0, agility: Math.max(0, Math.round((LEVEL - medianPower) * 0.3)), mind: Math.max(0, LEVEL - medianPower - Math.round((LEVEL - medianPower) * 0.5) - Math.round((LEVEL - medianPower) * 0.3)) },
  mkBuild('glass (90% pwr)', { power: 0.9, agility: 0.1 }),
  mkBuild('tank (60% vit)', { vitality: 0.6, power: 0.3, endurance: 0.1 }),
  mkBuild('spread (even)', { power: 0.2, vitality: 0.2, endurance: 0.2, agility: 0.2, mind: 0.2 }),
];

/* ── damage models ──
   liveDmg: the shipped formula, via the real calcWeaponDmg import (rpg
   object engages the weapon damage channel; we pass a plain stat build
   with no channel points so the columns isolate the loot layers).
   proposedDmg: GDD §4.4 composition with hardening + quality —
     ((base + H×1.0417) × Q + stat×0.1667) × tierMult × variance
   Implemented as liveDmg + the layer delta so every live term (variance,
   channel, governing-stat selection) comes from the real code path. */
const GOVERNING = { greatsword: 'power', sword: 'power', bow: 'agility', staff: 'mind' };
function liveDmg(weaponType, build) {
  return calcWeaponDmg(weaponType, build[GOVERNING[weaponType]] || 0, TIER.tierMult);
}
function proposedExtraBase(weaponType) {
  const base = WEAPON_TYPES[weaponType].base;
  return (base + HARDNESS * HARDNESS_BONUS_PER_LVL) * QUALITY_MULT - base;
}
/* variance bounds per type — used only to scale the flat layer delta the
   same way calcWeaponDmg scales its base (SYNC: gameSystems.js variance). */
const VARIANCE = { staff: [0.5, 1.5], bow: [0.6, 0.8], greatsword: [0.75, 1.25], sword: [0.75, 1.25] };
function sampleProposed(weaponType, build) {
  const [vLo, vHi] = VARIANCE[weaponType];
  const v = vLo + Math.random() * (vHi - vLo);
  return liveDmg(weaponType, build) + proposedExtraBase(weaponType) * TIER.tierMult * v;
}

/* Expected damage per swing incl. crit, Monte Carlo over the real rolls. */
function expectedDmg(weaponType, build, useProposed) {
  const critChance = calcCritChance(build.power, 0);   // no crit-channel pts in these builds
  const critMult = calcCritMult(build.power, 0);
  let sum = 0;
  for (let i = 0; i < SAMPLES; i++) {
    let d = useProposed ? sampleProposed(weaponType, build) : liveDmg(weaponType, build);
    if (Math.random() < critChance) d *= critMult;
    sum += Math.max(1, Math.round(d));
  }
  return sum / SAMPLES;
}

/* ── monsters (server-mirrored formulas) ── */
function monster(archKey, lvl) {
  const a = ARCHETYPES[archKey];
  return {
    arch: archKey,
    /* v2.3.1140: HP curve IMPORTED (was a hardcoded copy that violated the
       "never copied" rule above and would have silently missed the BF-1
       ramp change).  Dmg curve stays inline -- untuned since v2.3.1108;
       centralize it the first time it needs to move. */
    hp: Math.ceil(monsterStat(MONSTER_HP_CURVE.base, lvl, MONSTER_HP_CURVE.ramp, MONSTER_HP_CURVE.plateau, MONSTER_HP_CURVE.endgame) * a.hpMult),
    dmg: Math.ceil(monsterStat(12, lvl, 1.045, 1.025, 1.018) * a.dmgMult),
  };
}

/* ── self-check: proposed(H0, Q1) must equal live exactly ── */
{
  const probe = { power: 40, vitality: 0, endurance: 0, agility: 40, mind: 40 };
  if (HARDNESS === 0 && QUALITY_MULT === 1.0) {
    for (const w of Object.keys(WEAPON_TYPES)) {
      if (Math.abs(proposedExtraBase(w)) > 1e-9) {
        console.error('SELF-CHECK FAILED: proposed formula does not reduce to live at H0/Q1 for', w);
        process.exit(1);
      }
    }
  }
  /* Hand-check one live cell against the closed form so a gameSystems
     refactor that changes coefficients gets flagged here loudly. */
  const expect = (WEAPON_TYPES.sword.base + probe.power * 0.1667) * 2.16; // diamond tier
  const got = calcWeaponDmg('sword', probe.power, 2.16);
  const mid = (VARIANCE.sword[0] + VARIANCE.sword[1]) / 2;
  // got carries variance; check it lands inside the variance envelope.
  if (got < expect * VARIANCE.sword[0] * 0.99 || got > expect * VARIANCE.sword[1] * 1.01) {
    console.error('SELF-CHECK FAILED: calcWeaponDmg outside expected envelope', { got, expect, mid });
    process.exit(1);
  }
}

/* ── run ── */
const pad = (s, n) => String(s).padEnd(n);
const num = (v, d = 1) => Number(v).toFixed(d);
const usingLayers = HARDNESS > 0 || QUALITY_MULT !== 1.0;

console.log(`\n═══ BALANCE SIM — level ${LEVEL}, tier ${TIER_KEY} (×${TIER.tierMult}), hardness ${HARDNESS}, quality ${QUALITY_KEY} (×${QUALITY_MULT}), ${SAMPLES} samples ═══`);
console.log(usingLayers
  ? '    (PREVIEW columns include the unimplemented hardening/quality layers per GDD §4.4)'
  : '    (live formulas only — pass --hardness / --quality to preview loot layers)');

const ARCH_KEYS = ['fodder', 'sentinel', 'brute', 'snowman'];
const monsters = ARCH_KEYS.map((k) => monster(k, LEVEL));

console.log('\n' + pad('build', 18) + pad('weapon', 12) + pad('E[dmg]', 9)
  + monsters.map((m) => pad(`${m.arch}(${m.hp}hp)`, 18)).join(''));
const rows = [];
for (const build of BUILDS) {
  for (const w of ['sword', 'greatsword', 'bow', 'staff']) {
    const e = expectedDmg(w, build, usingLayers);
    const cells = monsters.map((m) => {
      const hits = Math.ceil(m.hp / e);
      return { hits, ttk: hits * SWING_SEC };
    });
    rows.push({ build: build.name, weapon: w, e, cells });
    console.log(pad(build.name, 18) + pad(w, 12) + pad(num(e), 9)
      + cells.map((c) => pad(`${c.hits} hits / ${num(c.ttk)}s`, 18)).join(''));
  }
}

/* EHP per build (dodge-adjusted; block is full negation — uptime, not EHP).
   v2.3.1154: a "tank+grids" row joins the spread — the tank build with its
   HP/Endurance grid points spent into Vigor + Evasion (budget: 1 pt per
   stat level, channel cap 50) — so INV-06 finally exercises the grids at
   every audit level instead of only below L15. */
console.log('\n' + pad('build', 18) + pad('maxHp', 8) + pad('dodge%', 8) + pad('EHP', 8));
const ehps = BUILDS.map((b) => {
  const hp = calcMaxHp(LEVEL, b.vitality);
  const dodge = passiveDodgeChance(b.agility, 0);
  const ehp = hp / (1 - dodge);
  console.log(pad(b.name, 18) + pad(hp, 8) + pad(num(dodge * 100), 8) + pad(num(ehp, 0), 8));
  return ehp;
});
{
  const tank = BUILDS[2]; // 60% vit / 30% pwr / 10% end
  // v2.3.1156: grid budget is min(200, 2 × stat), channels cap at 100.
  const vigorPts = Math.min(100, 2 * tank.vitality);
  const evasionPts = Math.min(100, 2 * tank.endurance);
  const gHp = Math.floor(calcMaxHp(LEVEL, tank.vitality) + getVigorFlat({ hpSpec: { vigor: vigorPts } })); // v2.3.1343: flat vigor
  const gDodge = passiveDodgeChance(tank.agility, evasionPts);
  const gEhp = gHp / (1 - gDodge);
  console.log(pad('tank+grids', 18) + pad(gHp, 8) + pad(num(gDodge * 100), 8) + pad(num(gEhp, 0), 8));
  ehps.push(gEhp);
}

/* ── invariant gates ── */
const failures = [];
const check = (id, name, cond, detail) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${id}  ${name}${cond ? '' : '  ' + detail}`);
  if (!cond) failures.push(id);
};

console.log('\n═══ invariant gates ═══');

/* INV-03: §6.5 audit points — median-Power build, band tier, vs brute.
   Gates: L15 1–3 hits, L35 2–3, L65 3–4, L100 3–5 (fast action). */
const GATES = [[15, 1, 3], [35, 2, 3], [65, 3, 4], [100, 3, 5]];
for (const [gl, lo, hi] of GATES) {
  const gTier = BLACKSMITH_TIERS[tierForLevel(gl)];
  const gPower = Math.round(6 + (gl - 1) * 1.05);
  const critC = calcCritChance(gPower, 0), critM = calcCritMult(gPower, 0);
  let sum = 0;
  for (let i = 0; i < SAMPLES; i++) {
    let d = calcWeaponDmg('greatsword', gPower, gTier.tierMult);
    if (Math.random() < critC) d *= critM;
    sum += Math.max(1, Math.round(d));
  }
  const e = sum / SAMPLES;
  const bruteHp = Math.ceil(monsterStat(MONSTER_HP_CURVE.base, gl, MONSTER_HP_CURVE.ramp, MONSTER_HP_CURVE.plateau, MONSTER_HP_CURVE.endgame) * ARCHETYPES.brute.hpMult);
  const hits = Math.ceil(bruteHp / e);
  check('INV-03', `L${gl}/${tierForLevel(gl)} median vs brute in [${lo},${hi}] hits`,
    hits >= lo && hits <= hi, `got ${hits} hits (E[dmg]=${num(e)}, bruteHp=${bruteHp})`);
}

/* INV-06: EHP spread across builds at this level within [1.5, 4.0].
   Prototype note: at very low levels stat pools are too small to spread
   EHP 1.5x — report-only there (docs/BALANCE-PLAN.md §9). */
const ehpRatio = Math.max(...ehps) / Math.min(...ehps);
if (LEVEL >= 15) {
  check('INV-06', `EHP spread ${num(ehpRatio, 2)} within [1.5, 4.0]`, ehpRatio >= 1.5 && ehpRatio <= 4.0, `ratio ${num(ehpRatio, 2)}`);
} else {
  console.log(`INFO  INV-06  EHP spread ${num(ehpRatio, 2)} (gate applies from L15; prototype band exempt)`);
}

/* INV-14: lunge per-hit below auto per-hit (cadence simplification —
   full DPS comparison needs the lunge cooldown; see plan doc). */
check('INV-14', `lunge mult ${LUNGE_DAMAGE_MULT} < 1.0 (per-hit below auto)`, LUNGE_DAMAGE_MULT < 1.0, String(LUNGE_DAMAGE_MULT));

/* ═══ channel pricing (v2.3.1133; repriced v2.3.1153) ═══
   %DPS bought by FULL investment in each wired grid channel, priced at a
   fixed reference cell (L35 median-Power, mythril — the INV-03 mid-band
   audit point) so the numbers don't swing with --level.  BALANCE-PLAN §4
   budget rule: full investment in any category should buy comparable
   marginal value; utility channels ~70% of a DPS point.
   v2.3.1153: the damage channel is now a percentage like everything else
   (was +1 flat/pt pre-tier, ~+725% DPS here — the §4 outlier), so the §4
   parity rule is finally enforceable across the WHOLE category: CH-01
   became a two-sided band — the damage channel must price at 0.9x-1.5x
   of the crit pair (still the ceiling, no longer a monoculture). */
{
  const REF_LEVEL = 35;
  const refTier = BLACKSMITH_TIERS[tierForLevel(REF_LEVEL)];
  const refPower = Math.round(6 + (REF_LEVEL - 1) * 1.05);
  const dps = (w, { dmgPts = 0, critPts = 0, critDmgPts = 0, cdMult = 1 }) => {
    const critC = calcCritChance(refPower, critPts);
    const critM = calcCritMult(refPower);
    const critFlat = t2Accel(critDmgPts, T2_UNITS.critDmg); // v2.3.1345: flat crit bonus
    let sum = 0;
    for (let i = 0; i < SAMPLES; i++) {
      let d = calcWeaponDmg(w, refPower, refTier.tierMult) + t2Accel(dmgPts, T2_UNITS.damage); // v2.3.1345: accel flat
      if (Math.random() < critC) d = d * critM + critFlat;
      sum += Math.max(1, Math.round(d));
    }
    return (sum / SAMPLES) / (SWING_SEC * cdMult);
  };
  console.log(`\n═══ channel pricing — %DPS at full investment (L${REF_LEVEL} median, ${tierForLevel(REF_LEVEL)}, sword) ═══`);
  const base = dps('sword', {});
  const pricePct = (opts) => (dps('sword', opts) / base - 1) * 100;
  const report = (label, pct) => console.log(pad(label, 42) + (pct >= 0 ? '+' : '') + num(pct) + '% DPS');
  /* v2.3.1157: full investment = the uniform 100-pt cap everywhere.
     The old CH-01 (edge vs the pair as whole BUILDS) is superseded by
     UN-01 below, which prices channels SYNERGY-AWARE — each channel's
     marginal value measured in its best-case context (crit chance with
     crit-dmg maxed and vice versa), because under the fungible 1000-pt
     economy players shop per-point across all 30 channels. */
  const dmg100 = pricePct({ dmgPts: 100 });
  report('edge 100 (damage)', dmg100);
  const exePct = pricePct({ critDmgPts: 100 });
  report('executioner 100 alone (crit dmg)', exePct);
  const pairPct = pricePct({ critPts: 100, critDmgPts: 100 });
  report('precision+executioner 100+100 (the pair)', pairPct);
  const dpsBoth = dps('sword', { critPts: 100, critDmgPts: 100 });
  const ccCtx = (dpsBoth / dps('sword', { critDmgPts: 100 }) - 1) * 100;
  const cdCtx = (dpsBoth / dps('sword', { critPts: 100 }) - 1) * 100;
  report('precision 100 in-context (marginal)', ccCtx);
  report('executioner 100 in-context (marginal)', cdCtx);
  const tempoPct = pricePct({ cdMult: 0.80 });   // Tempo cap -20% cd (lands at 100 pts since v2.3.1156)
  report('tempo 100 (atk speed at the -20% cap)', tempoPct);
  const dpsVals = [dmg100, ccCtx, cdCtx];
  const dpsMedian = dpsVals.slice().sort((a, b) => a - b)[1];
  /* ═══ PARITY GATES RETIRED (v2.3.1344, owner directive 2026-07-16) ═══
     The kid-simple reprice makes IMBALANCE POLICY: the game is
     fun-first, explicitly not competitive, and channels are priced for
     how a 7-year-old reads them, not for cross-channel parity.  UN-01
     (DPS parity band), UN-02 (EHP parity band), UN-03 (utility ~70%
     rule) and CH-03 (crit-pair sanity ceiling) are retired ON PURPOSE
     — do NOT "fix" the imbalance back (BALANCE-PLAN §4c).  UN-04
     (trap-free: strictly gains through point 100) STAYS — "no silent
     traps" is still law. */
  console.log(pad('  (UN-01 parity band retired)', 42) + `[${dpsVals.map((v) => num(v)).join(', ')}] vs median ${num(dpsMedian)}`);
  check('CH-02', 'crit-dmg full investment is felt (>3% DPS)', exePct > 3, `+${num(exePct)}%`);
  console.log(pad('  (CH-03 sanity ceiling retired)', 42) + `crit pair +${num(pairPct)}%`);
  check('CH-04', 'tempo cap buys ~+25% DPS (cadence, not damage)', tempoPct > 20 && tempoPct < 30, `+${num(tempoPct)}%`);

  /* ── defense channels (v2.3.1137) at the same reference cell ──
     Iron Skin 50 = -25% taken = +33.3% EHP is the yardstick.  Second Wind
     is priced as sustain vs a brute's sustained DPS (attack every 1.5s);
     Thorns as reflected DPS vs the player's own melee DPS. */
  const bruteDmg = Math.ceil(monsterStat(12, REF_LEVEL, 1.045, 1.025, 1.018) * ARCHETYPES.brute.dmgMult);
  const MONSTER_CD_SEC = 1.5;
  const incomingDPS = bruteDmg / MONSTER_CD_SEC;
  const refMaxHp = calcMaxHp(REF_LEVEL, 0);           // median L35 build is all-Power
  const swHealPS = (0.50 * refMaxHp) / 10;            // 50 pts (1%/pt), 10s cooldown
  const swUplift = swHealPS >= incomingDPS ? Infinity : (1 / (1 - swHealPS / incomingDPS) - 1) * 100;
  const ironUplift = (1 / 0.75 - 1) * 100;            // +33.3% EHP at 50 pts
  const thornsDPS = (0.5 * bruteDmg) / MONSTER_CD_SEC; // 50 pts vs the same brute
  console.log(pad('ironskin 50 (live v2.3.1113)', 42) + '+' + num(ironUplift) + '% EHP');
  console.log(pad('secondwind 50 (v2.3.1137, vs brute)', 42) + (swUplift === Infinity ? 'out-sustains the brute' : '+' + num(swUplift) + '% EHP'));
  console.log(pad('thorns 50 (v2.3.1137, vs brute)', 42) + num(thornsDPS) + ' reflected DPS (melee DPS ' + num(base) + ')');
  check('DF-01', 'thorns reflect stays under active DPS x1.25 (INV ceiling)',
    thornsDPS <= base * 1.25, `${num(thornsDPS)} vs cap ${num(base * 1.25)}`);
  check('DF-02', 'second wind lands in the Iron Skin band (0.5x-2x of +33% EHP)',
    swUplift !== Infinity && swUplift >= ironUplift * 0.5 && swUplift <= ironUplift * 2,
    `+${num(swUplift)}% vs yardstick +${num(ironUplift)}%`);

  /* ── Bulwark (v2.3.1153: block stamina efficiency, −1%/pt cap −50%) ──
     Utility channel priced as block UPTIME, not EHP: blocked hits per
     100-stamina bar at the server's per-hit cost max(1, round(15×mult)).
     Full investment must buy exactly 2× uptime (15 -> 8/hit ≈ 2× with
     the round; the hold-drain halves identically). */
  const bwHits = (mult) => Math.floor(100 / Math.max(1, Math.round(15 * mult)));
  const bwBase = bwHits(1.0), bw50 = bwHits(0.5);
  console.log(pad('bulwark 50 (v2.3.1153, block stamina)', 42) + bwBase + ' -> ' + bw50 + ' blocked hits per stamina bar');
  check('DF-03', 'bulwark 50 doubles blocked hits per stamina bar (2x uptime)',
    bw50 >= bwBase * 2 && bw50 <= bwBase * 2.5, `${bwBase} -> ${bw50}`);

  /* ── HP/Endurance grids (v2.3.1154) at the same reference cell ──
     Vigor is EHP priced against the Iron Skin yardstick; Evasion proves
     the shared 30% dodge cap (the §4 hard rule) — the whole point of the
     gate is that channel completion CANNOT push past agility's cap. */
  /* v2.3.1156: full investment is now the uniform 100-pt cap. */
  /* v2.3.1343: vigor is FLAT +10 HP/pt; report the flat pool add.  Its
     %EHP now depends on base HP, which is exactly the kind of parity
     math the owner retired (see the gate-retirement note below). */
  const vigorUplift = getVigorFlat({ hpSpec: { vigor: 100 } });
  console.log(pad('vigor 100 (flat, v2.3.1343)', 42) + '+' + num(vigorUplift) + ' HP');
  /* HP-01 RETIRED (v2.3.1344): vigor's flat identity has no %EHP unit
     to band — pricing parity is no longer a goal (owner 2026-07-16). */
  const capAgi = 625; // 625 × 0.0008 = 50% — agility's own dice cap
  const dodgeAtCap = passiveDodgeChance(capAgi, 0);
  const dodgeStacked = passiveDodgeChance(capAgi, 100);
  const dodgeEvOnly = passiveDodgeChance(0, 100);
  console.log(pad('evasion 100 (v2.3.1156, Endurance grid)', 42) + '+' + num(dodgeEvOnly * 100) + '% dodge alone; ' + num(dodgeStacked * 100) + '% stacked on capped agility');
  // v2.3.1345 (counter skills): Evasion is a deterministic counter
  // STACKING on the agility dice (the old shared cap is gone by
  // design); the expected-value helper ceilings at 95% so displays
  // never claim immunity.
  check('EN-01', 'dodge model: agility dice cap 50%; evasion counter stacks; display ceiling 95%',
    dodgeAtCap === 0.50 && Math.abs(dodgeStacked - 0.95) < 1e-9 && Math.abs(dodgeEvOnly - 0.50) < 1e-9,
    `capped ${num(dodgeAtCap * 100)}%, stacked ${num(dodgeStacked * 100)}%, alone ${num(dodgeEvOnly * 100)}%`);

  /* ═══ v2.3.1157: the uniform-economy sweep gates (UN-02..04) ═══
     30 channels × 100-pt caps, 1000-pt allocation ceiling.  UN-01 (DPS
     parity) is above with the pricing rows. */
  console.log(`\n═══ uniform T2 economy — 6 skills × 5 channels × ${T2_CHANNEL_CAP} = 3000 slots; ceiling ${COMBAT_BUILD_CEILING} (${num(COMBAT_BUILD_CEILING / 3000 * 100, 0)}%); earn 2/level → 200/skill ═══`);
  const ehpVals = [ironUplift, vigorUplift, swUplift];
  const ehpMedian = ehpVals.slice().sort((a, b) => a - b)[1];
  console.log(pad('  (UN-02 parity band retired)', 42) + `[${ehpVals.map((v) => num(v)).join(', ')}] vs median ${num(ehpMedian)}`);
  /* UN-03 covers the %DPS-priceable utility (tempo).  Thorns and
     bulwark deliberately live under their own dedicated gates instead
     (DF-01 reflect ceiling, DF-03 block uptime) — their value isn't a
     clean %DPS unit (both are conditional on block uptime), so folding
     them into this band would compare apples to stamina bars. */
  const utilVals = { tempo: tempoPct };
  console.log(pad('  (UN-03 ~70% rule retired)', 42) + `${JSON.stringify(utilVals)} vs DPS median ${num(dpsMedian)}`);
  /* UN-04 — TRAP-FREE: every active channel's value function strictly
     increases through the 100th point.  This is the mechanical proof of
     the "every cap lands at exactly 100 points" rule; a coefficient
     change that reintroduces a silent trap fails here.  Server-owned
     channels whose helpers aren't importable use the same formula
     inline (SYNC: server/src/index.js thorns/secondwind/lifeblood). */
  {
    const mkW = (cat, key, p) => ({ weapon: { type: cat === 'bow' ? 'bow' : cat === 'staff' ? 'staff' : 'sword' }, activeSlot: 'melee', weaponSpecs: { [cat]: { [key]: p } } });
    /* v2.3.1345: probes updated to the accelerating-flat / counter
       helpers.  SYNC: server/src/{data,grids,combat,index}.js consume
       the same t2Accel/T2_UNITS table (mirror-audit ties it). */
    const PROBES = [
      ['edge/drawPower/spellPower', (p) => t2Accel(p, T2_UNITS.damage)],
      ['precision/marksmanship/overload', (p) => calcCritChance(0, p)],
      ['executioner/headshot/focus', (p) => t2Accel(p, T2_UNITS.critDmg)],
      ['tempo', (p) => -swingCooldownMult(mkW('sword', 'tempo', p))],
      ['cleave', (p) => cleaveArcBonus({ weaponSpecs: { sword: { cleave: p } } })],
      ['piercing', (p) => bowPierceCount({ weaponSpecs: { bow: { piercing: p } } })],
      ['longshot', (p) => bowRangeMult({ weaponSpecs: { bow: { longshot: p } } })],
      ['detonation', (p) => staffAoeMult({ weaponSpecs: { staff: { detonation: p } } })],
      ['attunement', (p) => 1 + Math.min(100, p) * 0.01],
      ['bulwark', (p) => 1 - getBlockStaminaMult({ defenseSpec: { bulwark: p } })],
      ['ironskin', (p) => getIronSkinFlat({ defenseSpec: { ironskin: p } })],
      ['thorns', (p) => t2Accel(p, T2_UNITS.thorns)],
      ['secondwind', (p) => t2Accel(p, T2_UNITS.secondwind)],
      ['poise', (p) => 1 - poiseStunMult({ defenseSpec: { poise: p } })],
      ['vigor', (p) => getVigorFlat({ hpSpec: { vigor: p } })],
      ['recovery', (p) => getRecoveryFlat({ hpSpec: { recovery: p } })],
      ['lifeblood', (p) => t2Accel(p, T2_UNITS.lifeblood)],
      ['stamina', (p) => getStaminaFlat({ enduranceSpec: { stamina: p } })],
      ['conditioning', (p) => getConditioningFlat({ enduranceSpec: { conditioning: p } })],
      ['swiftness', (p) => getSwiftnessFlat({ enduranceSpec: { swiftness: p } })],
      ['evasion', (p) => passiveDodgeChance(0, p)],
    ];
    const traps = PROBES.filter(([, f]) => !(f(100) > f(99))).map(([name]) => name);
    check('UN-04', `trap-free: all ${PROBES.length} active channel families strictly gain through point 100`,
      traps.length === 0, `traps: ${traps.join(', ')}`);
  }
}

/* ── v2.3.1451: BENCH-LOCKED PRICING GATES (--bench) ──
   The 10 flat channels are priced as a % of the benchmark sentinel
   (t2PointValue, gameSystems.js — mirror-audited against the server).
   These gates are the acceptance criteria the T2_BENCH pcts are tuned
   against; the table prints so the owner can eyeball point values. */
if (argv.includes('--bench')) {
  console.log('\n═══ bench-locked point values (per role, per benchmark monster level) ═══');
  const BENCHES = [1, 2, 5, 10, 25, 50, 80, 100];
  console.log(pad('role', 12) + pad('ref', 5) + pad('pct', 6) + BENCHES.map((B) => pad('B' + B, 7)).join(''));
  for (const [role, r] of Object.entries(T2_BENCH)) {
    console.log(pad(role, 12) + pad(r.ref, 5) + pad(r.pct, 6)
      + BENCHES.map((B) => pad(t2PointValue(role, B), 7)).join(''));
  }
  console.log(pad('(sentinel)', 12) + pad('', 11)
    + BENCHES.map((B) => { const s = t2BenchStats(B); return pad(s.hp + '/' + s.dmg, 7); }).join(''));

  /* BN-01 noticeability: a damage point is always a real bite —
     between 2.5% and 8% of the benchmark sentinel's HP after rounding
     (the max(1,…) floor makes tiny benchmarks land above 4%). */
  {
    let bad = [];
    for (let B = 1; B <= 100; B++) {
      const hp = t2BenchStats(B).hp;
      const v = t2PointValue('damage', B);
      if (v < 0.025 * hp || v > 0.08 * hp) bad.push({ B, v, hp });
    }
    check('BN-01', 'damage point stays a 2.5–8% bite of the benchmark HP at every level', bad.length === 0, JSON.stringify(bad.slice(0, 3)));
  }
  /* BN-02 (UN-04 reworded for bench pricing): later points are NEVER
     smaller — the benchmark curve is monotone, so each role's point
     value is non-decreasing across all 100 benchmarks. */
  {
    const bad = [];
    for (const role of Object.keys(T2_BENCH)) {
      for (let B = 2; B <= 100; B++) {
        if (t2PointValue(role, B) < t2PointValue(role, B - 1)) { bad.push(role + '@B' + B); break; }
      }
    }
    check('BN-02', 'never-smaller: every role\'s point value is non-decreasing in the benchmark', bad.length === 0, bad.join(','));
  }
  /* BN-03 vigor anchor: 4 at-level points ≈ +1 sentinel hit survived. */
  {
    let bad = [];
    for (let B = 1; B <= 100; B++) {
      if (4 * t2PointValue('vigor', B) < t2BenchStats(B).dmg) bad.push(B);
    }
    check('BN-03', 'vigor: 4 at-level points buy at least one extra sentinel hit of maxHp', bad.length === 0, bad.slice(0, 5).join(','));
  }
  /* BN-04 ironskin anchor: 20 at-level points fully soak a sentinel hit. */
  {
    let bad = [];
    for (let B = 1; B <= 100; B++) {
      if (20 * t2PointValue('ironskin', B) < t2BenchStats(B).dmg) bad.push(B);
    }
    check('BN-04', 'ironskin: 20 at-level points soak a full sentinel hit', bad.length === 0, bad.slice(0, 5).join(','));
  }
  /* BN-05 crit-pair parity posture (v2.3.1415): critDmg per point stays
     roughly 4× the damage point (LUCKY every 2nd hit at the maxed
     counter → ~2× average, twice the pair cost → parity).  Rounding at
     tiny benchmarks widens the band. */
  {
    let bad = [];
    for (let B = 1; B <= 100; B++) {
      const ratio = t2PointValue('critDmg', B) / t2PointValue('damage', B);
      if (ratio < 3.0 || ratio > 5.0) bad.push({ B, ratio: num(ratio, 2) });
    }
    check('BN-05', 'critDmg point value stays 3–5× the damage point (crit-pair parity)', bad.length === 0, JSON.stringify(bad.slice(0, 3)));
  }
  /* BN-06 decay story: the same 100 edge points are worth more the
     later they're bought — steady spend over a 100-point build < the
     same channel inside a 1000-point build (later positions, higher
     benchmarks).  This is the emergent "old points get outgrown". */
  {
    const early = t2ReplayFlat({ weaponSpecs: { sword: { edge: 100 } } }).sword.edge;
    const late = t2ReplayFlat({
      weaponSpecs: { sword: { edge: 100, precision: 100, executioner: 100, tempo: 100, cleave: 100 },
                     bow: { drawPower: 100, marksmanship: 100, headshot: 100, piercing: 100 } },
    }).sword.edge;
    check('BN-06', 'decay: 100 edge pts in a 900-pt build outvalue the same 100 bought first', late > early, { early, late });
    console.log(`INFO  BN-06  100 edge pts: bought levels 1-100 = +${early}; inside a 900-pt build = +${late}; bought at 991+ = +${100 * t2PointValue('damage', 100)}`);
  }
}

/* Layer-budget report: ceiling of each loot layer at this cell. */
console.log('\n═══ layer ceilings (median build, sword) ═══');
const b0 = expectedDmg('sword', BUILDS[0], false);
console.log(`live E[dmg]                    ${num(b0)}`);
console.log(`× tier ceiling (worldbreaker)  ${num(b0 / TIER.tierMult * 7.84)}`);
const hard5 = (WEAPON_TYPES.sword.base + 5 * HARDNESS_BONUS_PER_LVL) / WEAPON_TYPES.sword.base;
console.log(`hardness 5 base uplift         ×${num(hard5, 2)} on weapon base (rare-chase layer)`);
console.log(`quality: rare ×1.20  elite ×1.50  godly ×3.00 on (base+hardness)`);

console.log(failures.length === 0
  ? '\nALL GATES PASS'
  : `\n${failures.length} GATE(S) FAILED: ${failures.join(', ')}${STRICT ? '' : '  (report-only; use --strict to gate)'}`);
process.exit(STRICT && failures.length ? 1 : 0);
