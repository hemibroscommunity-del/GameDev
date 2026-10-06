import { MONSTER_HP_CURVE as H, monsterStat, monsterHpFlat, ARCHETYPES, weaponTierFactor, BLACKSMITH_TIERS, WOODWORKING_TIERS } from '../../../../server/src/data.js';
import { PROG3, prog3Curve, prog3Edge } from '../../../../server/src/prog3.js';
import { STAFF_BOLT, BOW_VOLLEY_WORTH } from '../../../../server/src/combat.js';
const BASE = { greatsword: 10, bow: 12.80, staff: 13.44 }, VAR = { greatsword: [0.75, 1.25], bow: [0.6, 0.8], staff: [0.5, 1.65] }, CAT = { greatsword: 'sword', bow: 'bow', staff: 'staff' };
const monHp = (arch, L) => Math.max(1, Math.ceil(monsterStat(H.base, L, H.ramp, H.plateau, H.endgame) * ARCHETYPES[arch].hpMult) + monsterHpFlat(L));
const BS = ['copper','copper','iron','steel','titanium','obsidian','mythril','diamond','abyssal'], WW = ['pine','softwood','hardwood','cedar','maple','ironbark','crystalwood','crystalwood','crystalwood'];
const gear = (type, L) => { const i = Math.min(8, Math.floor(L / 5)); return type === 'greatsword' ? BLACKSMITH_TIERS[BS[i]].tierMult : WOODWORKING_TIERS[WW[i]].tierMult; };
const st = (p, L, m) => p > 0 ? prog3Curve(p * prog3Edge(L, m), 7) : 0;
function roll(type, L, pw, lk, mL, mode) {
  const pre = (BASE[type] + L * PROG3.DMG_PER_LEVEL[CAT[type]]) * (1 + st(pw, L, mL)) * weaponTierFactor(gear(type, L)), top = pre * VAR[type][1];
  const cP = 0.01 + 0.6 * st(lk, L, mL), cM = 1.5 + 2.0 * st(lk, L, mL);
  const one = (band, mult) => { let b = pre * (band[0] + Math.random() * (band[1] - band[0])) * mult; if (Math.random() < cP) b = Math.max(b * cM, top * 2); return Math.max(1, Math.round(b)); };
  if (mode === 'basic') return one(VAR[type], 1);
  if (type === 'staff') return one(STAFF_BOLT.BAND, 2.0) * 3;
  if (type === 'bow') { let s = 0; for (let i = 0; i < 3; i++) s += Math.round(one(VAR.bow, 3.0) * Math.min(1, BOW_VOLLEY_WORTH / 3)); return s; }
  return one(VAR[type], 3.0);
}
function run(type, L, mL, arch, pw, lk, N = 6000) {
  const max = monHp(arch, mL); let land = 0, hits = 0, s1 = 0, critSkip = 0;
  for (let i = 0; i < N; i++) {
    let hp = max, n = 0, ok = false; while (hp > 0) { const d = roll(type, L, pw, lk, mL, 'basic'); hp -= d; n++; if (hp > 0 && hp <= 0.2 * max) { ok = true; break; } }
    if (ok) land++; hits += n; if (roll(type, L, pw, lk, mL, 'special') >= max) s1++;
  }
  return { land: Math.round(land / N * 100), hits: (hits / N).toFixed(1), s1: Math.round(s1 / N * 100) };
}
console.log('AT-LEVEL fights (skill L = monster level), typical gear; P(basic hits leave it in 0-20%) / mean hits to reach window-or-death / P(special one-shots)');
console.log('L | greatsword all-Power | greatsword half Power+half Luck | bow all-Power | staff all-Power');
for (const L of [2, 5, 8, 10, 15, 20, 25, 30, 35, 40]) {
  const p = Math.min(2 * L, 3 * (L - 1)), h = Math.floor(p / 2);
  const f = (r) => r.land + '% / ' + r.hits + ' / ' + r.s1 + '%';
  console.log([L, f(run('greatsword', L, L, 'fodder', p, 0)), f(run('greatsword', L, L, 'fodder', h, h)), f(run('bow', L, L, 'fodder', p, 0)), f(run('staff', L, L, 'fodder', p, 0))].join(' | '));
}
console.log('\nOUT-LEVELLED by 10 (skill L = monster level + 10), all-Power:');
for (const mL of [2, 8, 15, 20, 30]) {
  const L = mL + 10, p = Math.min(2 * L, 3 * (L - 1));
  const f = (r) => r.land + '% / ' + r.hits + ' / ' + r.s1 + '%';
  console.log(['mon Lv' + mL + ' vs L' + L, f(run('greatsword', L, mL, 'fodder', p, 0)), f(run('bow', L, mL, 'fodder', p, 0)), f(run('staff', L, mL, 'fodder', p, 0))].join(' | '));
}
