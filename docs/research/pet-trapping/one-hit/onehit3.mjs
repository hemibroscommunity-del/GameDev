import { MONSTER_HP_CURVE as H, monsterStat, monsterHpFlat, ARCHETYPES, weaponTierFactor, BLACKSMITH_TIERS, WOODWORKING_TIERS } from '../../../../server/src/data.js';
import { PROG3, prog3Curve, prog3Edge } from '../../../../server/src/prog3.js';
import { STAFF_BOLT, BOW_VOLLEY_WORTH } from '../../../../server/src/combat.js';
const BASE = { greatsword: 10, bow: 12.80, staff: 13.44 };
const VAR = { greatsword: [0.75, 1.25], bow: [0.6, 0.8], staff: [0.5, 1.65] };
const CAT = { greatsword: 'sword', bow: 'bow', staff: 'staff' };
const monHp = (arch, L) => Math.max(1, Math.ceil(monsterStat(H.base, L, H.ramp, H.plateau, H.endgame) * ARCHETYPES[arch].hpMult) + monsterHpFlat(L));
const BS = ['copper','copper','iron','steel','titanium','obsidian','mythril','diamond','abyssal'];
const WW = ['pine','softwood','hardwood','cedar','maple','ironbark','crystalwood','crystalwood','crystalwood'];
const gearName = (type, L) => { const i = Math.min(8, Math.floor(L / 5)); return type === 'greatsword' ? BS[i] : WW[i]; };
const gear = (type, L) => type === 'greatsword' ? BLACKSMITH_TIERS[gearName(type, L)].tierMult : WOODWORKING_TIERS[gearName(type, L)].tierMult;
const st = (pts, L, mL) => pts > 0 ? prog3Curve(pts * prog3Edge(L, mL), 7) : 0;
const pre = (type, L, pw, mL) => (BASE[type] + L * PROG3.DMG_PER_LEVEL[CAT[type]]) * (1 + PROG3.ATK.dmg.max * st(pw, L, mL)) * weaponTierFactor(gear(type, L));
const meanBasic = (type, L, pw, mL) => pre(type, L, pw, mL) * (VAR[type][0] + VAR[type][1]) / 2;
const meanSpecial = (type, L, pw, mL) => {
  const p = pre(type, L, pw, mL);
  if (type === 'staff') return p * (STAFF_BOLT.BAND[0] + STAFF_BOLT.BAND[1]) / 2 * 2 * 3;
  if (type === 'bow') return 3 * p * 0.7 * 3 * Math.min(1, BOW_VOLLEY_WORTH / 3);
  return p * 1.0 * 3;
};
const Ls = [1, 5, 10, 15, 20, 30, 40], mLs = [2, 8, 15, 20, 30, 40];
console.log('monster max HP (fodder / brute / snowman): ' + mLs.map((m) => 'Lv' + m + ' ' + monHp('fodder', m) + '/' + monHp('brute', m) + '/' + monHp('snowman', m)).join('; '));
for (const type of ['greatsword', 'bow', 'staff']) {
  console.log('\n' + type + ' (typical gear, ALL lane points in Power): mean BASIC hit / mean SPECIAL, as % of a FODDER\'s max HP');
  console.log('skill L (gear, tierMult) | ' + mLs.map((m) => 'vs Lv' + m).join(' | '));
  for (const L of Ls) {
    const pw = Math.min(2 * L, 3 * (L - 1));
    const cells = mLs.map((m) => { const hp = monHp('fodder', m); return Math.round(meanBasic(type, L, pw, m) / hp * 100) + '% / ' + Math.round(meanSpecial(type, L, pw, m) / hp * 100) + '%'; });
    console.log('L' + L + ' (' + gearName(type, L) + ' ' + gear(type, L) + ', pts ' + pw + ', base hit ' + meanBasic(type, L, pw, L).toFixed(0) + ') | ' + cells.join(' | '));
  }
}
console.log('\nfresh character, starter kit, no points: greatsword ' + meanBasic('greatsword', 1, 0, 1).toFixed(1) + ' (special ' + meanSpecial('greatsword', 1, 0, 1).toFixed(1) + '), bow ' + meanBasic('bow', 1, 0, 1).toFixed(1) + ' (volley ' + meanSpecial('bow', 1, 0, 1).toFixed(1) + '), staff ' + meanBasic('staff', 1, 0, 1).toFixed(1) + ' (big bolt ' + meanSpecial('staff', 1, 0, 1).toFixed(1) + ')');
