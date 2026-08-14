/* verify-prog3-retune — the referee for the v2.3.1727 progression retune.
 *
 *   node tools/verify-prog3-retune.mjs
 *
 * WHY THIS EXISTS AND NOT balance-sim.mjs.  The repo's balance referee
 * (tools/balance-sim.mjs, v2.3.1108) predates prog3 entirely — zero
 * references to it — and audits the retired T1 stat / T2 grid economy:
 * `stat × 0.1667` damage terms, vitality-driven maxHp, channel multipliers.
 * None of those gate a live character any more.  Teaching it the trained-
 * skill model is a real piece of work and deliberately NOT bundled into a
 * tuning commit; until someone does it, THIS is the tool that priced the
 * constants in server/src/prog3.js, and it follows balance-sim's one
 * non-negotiable rule: import the shipped formulas, never restate them.
 * Everything below comes from server/src/data.js and server/src/prog3.js.
 *
 * WHAT IT ANSWERS, the two owner complaints:
 *   1. "level 13 doesn't feel stronger than level 3" -> the hits-to-kill
 *      table, current constants vs proposed.
 *   2. "the pace is too quick" -> character level at each checkpoint of the
 *      Mayor Bro questline, for three play styles.
 *
 * THE ONE SUBTLETY WORTH KNOWING.  Kill XP is INVARIANT to your damage per
 * hit: killing a monster with H hp requires dealing exactly H damage, so it
 * always pays H × XP_PER_DMG however hard you hit.  That is what makes the
 * pacing projection robust — raising DMG_PER_LEVEL does not, by itself,
 * speed levelling up.  The dials that do are XP_PER_DMG and the quest table.
 *
 * AND THE TRAP IT CAUGHT.  The first run of this modelled quest XP as flat.
 * It was not: quests.js handed reward.xp to _prog3AwardXp, which multiplied
 * it by XP_PER_DMG like a damage figure — invisible while that rate was
 * exactly 1.0, and a silent 0.4× cut to every quest the moment it moved.
 * v2.3.1727 split the units (opts.flat); this tool models the split.
 */
import { MONSTER_HP_CURVE, ARCHETYPES, monsterStat, monsterHpFlat, QUEST_REWARDS } from '../server/src/data.js';
import { prog3XpRequired } from '../server/src/prog3.js';

const C = MONSTER_HP_CURVE;
const spawnHp = (arch, lvl, variantHpMult = 1) => {
  const baseHp = monsterStat(C.base, lvl, C.ramp, C.plateau, C.endgame);
  const a = ARCHETYPES[arch];
  return Math.max(1, Math.ceil(baseHp * (a.hpMult * variantHpMult)) + monsterHpFlat(lvl));
};

/* wood greatsword: rawBase 10, hardness 0, quality normal, tierMult 1 */
const EFF_BASE = 10, TIER = 1;
/* avg variance is 1.0 for melee (0.75 + rand*0.5) — it cancels, so avg dmg
   is just (effBase + skillTerm) * tierMult */
const avgDmg = (skLvl, K) => (EFF_BASE + skLvl * K) * TIER;

/* char level = sum of three skill levels; funnelling into one skill means
   char = 2 + skillLevel (the other two sit at 1). */
const skillOf = (charLvl) => charLvl - 2;

const cumXpToSkill = (n) => { let t = 0; for (let l = 1; l < n; l++) t += prog3XpRequired(l); return t; };
const skillAtXp = (xp) => { let l = 1, r = xp; while (r >= prog3XpRequired(l)) { r -= prog3XpRequired(l); l++; } return l; };

const fodder = spawnHp('fodder', 1);
const blue = spawnHp('fodder', 1, 0.55);
const brute = spawnHp('brute', 1);
const snowman = spawnHp('snowman', 1);
const stalker = spawnHp('stalker', 1);
const hexer = spawnHp('hexer', 1);
const volatileHp = spawnHp('volatile', 1);

console.log('MONSTER HP (level 1):');
console.log(`  fodder ${fodder}  blueSlime ${blue}  brute ${brute}  snowman ${snowman}`);
console.log(`  stalker ${stalker}  hexer ${hexer}  volatile ${volatileHp}`);

const SETS = [
  { name: 'CURRENT  ', K: 0.18, HP: 2, XPD: 1.0, qmul: 1.0, qflat: false },
  { name: 'PROP q0.7', K: 1.5, HP: 6, XPD: 0.4, qmul: 1.0, qflat: true },
  { name: 'PROP q1.0', K: 1.5, HP: 6, XPD: 0.4, qmul: 1 / 0.7, qflat: true },
];

console.log('\nHITS TO KILL (wood greatsword, avg roll):');
console.log('  char |   dmg  | fodder | brute  |  maxHP');
for (const s of SETS) {
  console.log(`  --- ${s.name} (K=${s.K}, HP/lvl=${s.HP}) ---`);
  for (const ch of [3, 6, 13, 20]) {
    const d = avgDmg(skillOf(ch), s.K);
    const maxHp = Math.floor(100 + ch * s.HP);
    console.log(`   ${String(ch).padStart(3)} | ${d.toFixed(1).padStart(6)} | ${String(Math.ceil(fodder / d)).padStart(6)} | ${String(Math.ceil(brute / d)).padStart(6)} | ${String(maxHp).padStart(6)}`);
  }
}

/* ── pacing ──
   XP is 1 per damage DEALT, and killing a monster with H hp requires
   dealing exactly H damage, so kill XP is invariant to your damage per
   hit: total = (sum of monster HP killed) * XP_PER_DMG. */
const TUT_KILLS = 4 * snowman + 6 * blue + 5 * ((stalker + hexer + volatileHp) / 3) + 6 * fodder;
const MAYOR2_KILLS = 5 * fodder;

const questXp = (ids) => ids.reduce((t, id) => t + ((QUEST_REWARDS[id] && QUEST_REWARDS[id].xp) || 0), 0);
const TUT = ['tut_1', 'tut_2', 'tut_3', 'tut_4'];
const LIFE = ['life_1', 'life_2'];
const MAYOR = ['mayor_1', 'mayor_2', 'mayor_3'];

console.log('\nQUEST XP (live table):');
for (const id of [...TUT, ...LIFE, ...MAYOR]) {
  const q = QUEST_REWARDS[id];
  console.log(`  ${id.padEnd(8)} xp ${String(q ? q.xp : '?').padStart(4)}  gold ${q ? q.gold : '?'}`);
}
console.log(`  tut ${questXp(TUT)}  life ${questXp(LIFE)}  mayor ${questXp(MAYOR)}  ALL ${questXp([...TUT, ...LIFE, ...MAYOR])}`);
console.log(`\nrequired-kill damage: tut arc ${Math.round(TUT_KILLS)}, mayor_2 ${Math.round(MAYOR2_KILLS)}`);

console.log('\nPACING (char level at each checkpoint, XP funnelled into one skill):');
for (const s of SETS) {
  /* v2.3.1727: quest XP is FLAT (bypasses XP_PER_DMG) under the proposal;
     the live code multiplied it by XP_PER_DMG, so model that for CURRENT.
     The table on disk is already the 0.7x cut, so qmul re-inflates it for
     the "what if we had not cut the table" row. */
  const q = (ids) => Math.round(questXp(ids) * s.qmul * (s.qflat ? 1 : s.XPD));
  for (const stray of [0, 0.25, 1.5]) {
    const label = stray === 0 ? 'no strays ' : stray === 0.25 ? '+25% stray' : '+150% grind';
    const tutXp = (TUT_KILLS * (1 + stray)) * s.XPD + q(TUT);
    const visitXp = tutXp + q(LIFE) + q(['mayor_1']);
    const allXp = visitXp + (MAYOR2_KILLS * (1 + stray)) * s.XPD + q(['mayor_2', 'mayor_3']);
    console.log(`  ${s.name} ${label}: after-tut char ${2 + skillAtXp(Math.round(tutXp))}`
      + ` | visit-buildings char ${2 + skillAtXp(Math.round(visitXp))}`
      + ` | all-9 char ${2 + skillAtXp(Math.round(allXp))}`);
  }
}

console.log('\nXP curve (cumulative into one skill):');
for (const n of [2, 3, 4, 5, 6, 8, 11]) console.log(`  skill ${n} (char ${n + 2}): ${cumXpToSkill(n)} xp`);
