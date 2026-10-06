import { MONSTER_HP_CURVE as H, monsterStat, monsterHpFlat, ARCHETYPES, weaponTierFactor, BLACKSMITH_TIERS, WOODWORKING_TIERS } from '../../../../server/src/data.js';
import { PROG3, prog3Curve, prog3Edge } from '../../../../server/src/prog3.js';
import { STAFF_BOLT, BOW_VOLLEY_WORTH } from '../../../../server/src/combat.js';
const BASE = { greatsword: 10, bow: 12.80, staff: 13.44 };
const VAR = { greatsword: [0.75, 1.25], bow: [0.6, 0.8], staff: [0.5, 1.65] };
const CAT = { greatsword: 'sword', bow: 'bow', staff: 'staff' };
const monHp = (arch, L) => Math.max(1, Math.ceil(monsterStat(H.base, L, H.ramp, H.plateau, H.endgame) * ARCHETYPES[arch].hpMult) + monsterHpFlat(L));
// TYPICAL progression (one forge/bench tier per 5 skill levels, starting from the quest's copper/pine)
const BS = ['copper','copper','iron','steel','titanium','obsidian','mythril','diamond','abyssal'];
const WW = ['pine','softwood','hardwood','cedar','maple','ironbark','crystalwood','crystalwood','crystalwood'];
const gear = (type, L) => { const i = Math.min(8, Math.floor(L / 5)); return type === 'greatsword' ? BLACKSMITH_TIERS[BS[i]].tierMult : WOODWORKING_TIERS[WW[i]].tierMult; };
const st = (pts, L, mL) => pts > 0 ? prog3Curve(pts * prog3Edge(L, mL), 7) : 0;
function roll(type, L, tm, pw, mL, mode) {
  const pre = (BASE[type] + L * PROG3.DMG_PER_LEVEL[CAT[type]]) * (1 + PROG3.ATK.dmg.max * st(pw, L, mL)) * weaponTierFactor(tm);
  const top = pre * VAR[type][1];
  const one = (band, mult) => { let b = pre * (band[0] + Math.random() * (band[1] - band[0])) * mult; if (Math.random() < PROG3.ATK.luck.base) b = Math.max(b * 1.5, top * 2); return Math.max(1, Math.round(b)); };
  if (mode === 'basic') return one(VAR[type], 1);
  if (type === 'staff') return one(STAFF_BOLT.BAND, 2.0) * 3;
  if (type === 'bow') { let s = 0; for (let i = 0; i < 3; i++) s += Math.round(one(VAR.bow, 3.0) * Math.min(1, BOW_VOLLEY_WORTH / 3)); return s; }
  return one(VAR[type], 3.0);
}
function stats(type, L, pw, arch, mL, N) {
  const tm = gear(type, L), max = monHp(arch, mL);
  let b1 = 0, s1 = 0, land = 0, sum = 0;
  for (let i = 0; i < N; i++) {
    const b = roll(type, L, tm, pw, mL, 'basic'); sum += b; if (b >= max) b1++;
    if (roll(type, L, tm, pw, mL, 'special') >= max) s1++;
    let hp = max; while (hp > 0) { hp -= roll(type, L, tm, pw, mL, 'basic'); if (hp > 0 && hp <= 0.2 * max) { land++; break; } }
  }
  return { tm, max, mean: sum / N, frac: sum / N / max, b1: b1 / N, s1: s1 / N, land: land / N };
}
const targets = [['Lv2 (tier 1, the 1-5 band; spawns are Lv1-2)', 'fodder', 2], ['Lv8 (tier 2, 6-10)', 'fodder', 8], ['Lv15 (tier 3, 11-15)', 'fodder', 15], ['Lv20 (tier 4, 16-20)', 'fodder', 20], ['Lv30 (tier 6, 21-40 stage)', 'fodder', 30], ['Lv40 (tier 8)', 'fodder', 40]];
for (const share of [0, 1]) {
  console.log('\n=== Power points: ' + (share ? 'all lane points (3/level, capped 2xL)' : 'none') + '; typical gear (one tier per 5 skill levels); fodder HP (brute ~+2..8%) ===');
  console.log('weapon | monster | skill L where mean basic hit >= 20% of max HP | L where P(window landed, basic only) < 50% | L where P(one-shot basic) >= 50% | L where P(one-shot special) >= 50%');
  for (const type of ['greatsword', 'bow', 'staff']) {
    for (const [label, arch, mL] of targets) {
      let a = null, b = null, c = null, d = null;
      for (let L = 1; L <= 60; L++) {
        const pw = share ? Math.min(2 * L, 3 * (L - 1)) : 0;
        const r = stats(type, L, pw, arch, mL, 1500);
        if (a === null && r.frac >= 0.2) a = L;
        if (b === null && r.land < 0.5) b = L;
        if (c === null && r.b1 >= 0.5) c = L;
        if (d === null && r.s1 >= 0.5) d = L;
      }
      console.log([type, label, a ?? '>60', b ?? '>60', c ?? '>60', d ?? '>60'].join(' | '));
    }
  }
}
