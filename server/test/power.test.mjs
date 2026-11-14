/* ═══ v2.3.5480: THE POWER INDEX (server/src/power.js) ═══
 * Card PW, docs/specs/power-index.md.
 *
 *   1. THE CONTROL: 1,000 in every style; its points within the deal its
 *      levels give, its gear through the worker's own equip gate; a build
 *      with no trained skills is not ranked; a hand with no weapon reads 0;
 *      the dice are given back; the phone's numbers it reads are the phone's.
 *   2. THE DICE: the index's mean blow -- the mean of the game's own roll and
 *      what lands of it -- is what 40,000 real blows through the PvP roll
 *      (pvpbalance.js _pvpRollFor) and THE door (combat.js _applyDamage) deal,
 *      within 2 %, for every style, plain and special.
 *   3. NEVER LOWERS: a point more in any stat, a level more in any skill, a
 *      better weapon, armour or grade never lowers a score.
 *   4. THE PREDICTION: random honest characters of levels 1-40 fight
 *      (power-sim.mjs: the worker's own roll, door and regen; positions left
 *      out).  The exponent is fitted on half the pairs; on the other half the
 *      index names the winner more often than today's "Total Power" (the
 *      three levels summed) by a clear margin.  The report prints the plain
 *      level (the highest skill) beside both.
 *   5. THE BREAK PROOFS (the plan's rule 8).  A score computed from a copied
 *      formula fails here: each of these bends the WORKER's code in this
 *      process and needs the index to move with it.  The one-line change
 *      that turns each red is named on its check.
 */
import { readFileSync } from 'node:fs';
import { PROG3, prog3RespecPoints } from '../src/prog3.js';
import { BLACKSMITH_TIERS, WOODWORKING_TIERS } from '../src/data.js';
import { POWER, powerOf, ratiosOf, sideOf, controlBuild, cycleMs, DICE_SEEN } from '../src/power.js';
import { makeRoom, seed, rnd, randomBuild, duel } from './power-sim.mjs';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS ' + name); }
  else { failures++; console.log('FAIL ' + name + ' ' + JSON.stringify(detail === undefined ? {} : detail)); }
}
const room = makeRoom();
const ready = (b) => { const f = { ...b, _buffs: {} }; room._prog3Recompute(f); return f; };
const maxLv = (b) => Math.max(...PROG3.SKILLS.map((c) => b.prog3.sk[c].level));
const sumLv = (b) => PROG3.SKILLS.reduce((s, c) => s + b.prog3.sk[c].level, 0);

/* ═══ 1. THE CONTROL ═══ */
console.log('\n1. the control');
{
  const c = controlBuild();
  const p = powerOf(room, c);
  check('1a. the control reads 1,000 in every style, and its Power 1,000',
    p && p.melee === 1000 && p.bow === 1000 && p.magic === 1000 && p.power === 1000, p);
  check('1b. ...with the table\'s version on it', p && p.v === POWER.V && Number.isInteger(POWER.V) && POWER.V >= 1, p);
  /* its points: within the deal its levels give (the worker's own deal) */
  const deal = { sk: {} };
  for (const cat of PROG3.SKILLS) deal.sk[cat] = { level: POWER.CONTROL.sk[cat] };
  prog3RespecPoints(deal, false);
  const shared = Object.values(POWER.CONTROL.shared).reduce((a, b) => a + b, 0);
  const lane = Object.values(POWER.CONTROL.lane).reduce((a, b) => a + b, 0);
  check('1c. its shared points are within the deal (3 a level past 1)', shared <= deal.shared, { shared, deal: deal.shared });
  check('1d. each lane\'s points are within that lane\'s deal', PROG3.SKILLS.every((cat) => lane <= deal.poolBy[cat]), { lane, deal: deal.poolBy });
  check('1e. every point names a stat the worker has', Object.keys(POWER.CONTROL.shared).every((k) => k in PROG3.BODY)
    && Object.keys(POWER.CONTROL.lane).every((k) => k in PROG3.ATK));
  const cf = ready(c);
  const slots = ['weapon', 'rangedWeapon', 'staffWeapon', 'armor', 'legsArmor', 'shield'];
  /* (the worker gates both body pieces through its 'armor' slot: grids.js) */
  const worn = slots.filter((s) => cf[s] && room._prog3EquipOk(cf, s === 'legsArmor' ? 'armor' : s, cf[s]));
  check('1f. it can wear everything it wears (gear.js _prog3EquipOk, its levels)', worn.length === slots.length, worn);
  check('1g. its blade, bow and staff are the forge\'s own rows', BLACKSMITH_TIERS[c.weapon.gearBase].tierMult === c.weapon.tierMult
    && WOODWORKING_TIERS[c.rangedWeapon.gearBase.slice(3)].tierMult === c.rangedWeapon.tierMult
    && WOODWORKING_TIERS[c.staffWeapon.gearBase.slice(3)].tierMult === c.staffWeapon.tierMult);
  check('1h. a player with no trained skills on file is not ranked (null)', powerOf(room, {}) === null && powerOf(room, null) === null && powerOf(room, { prog3: {} }) === null);
  const noStaff = controlBuild(); noStaff.staffWeapon = null;
  const pn = powerOf(room, noStaff);
  check('1i. no weapon in a hand: that style reads 0, the Power the best of the others', pn.magic === 0 && pn.melee === 1000 && pn.power === 1000, pn);
  const real = Math.random;
  powerOf(room, c);
  check('1j. the dice are the real ones again after a score', Math.random === real);
  const roll = room._rollHit;
  room._rollHit = function () { throw new Error('boom'); };
  let threw = false;
  try { powerOf(room, c); } catch (e) { threw = true; }
  room._rollHit = roll;
  check('1k. ...and after a roll that throws', threw && Math.random === real);
  /* the one number that is the phone's */
  const pa = readFileSync(new URL('../../src/game/playerActions.js', import.meta.url), 'utf8');
  check('1l. SPECIAL_GAP_MS is the phone\'s gap between specials (playerActions.js)',
    new RegExp('_lastSwipe \\|\\| 0\\) < ' + POWER.SPECIAL_GAP_MS + '\\)').test(pa), POWER.SPECIAL_GAP_MS);
  /* the held weapon's cycle with no Speed points: the phone's 600 ms swing, its
     bow at x0.825, its staff +300 (gameSystems.js; freeswing.js's mirrors) */
  const bare = ready(controlBuild());
  for (const cat of PROG3.SKILLS) bare.prog3 = { ...bare.prog3, atk: { ...bare.prog3.atk, [cat]: { ...bare.prog3.atk[cat], aspd: 0 } } };
  const cy = { melee: cycleMs(room, bare, 'melee'), bow: cycleMs(room, bare, 'bow'), magic: cycleMs(room, bare, 'magic') };
  check('1m. the held cycles at no Speed points: 600 / 495 / 900 ms', cy.melee === 600 && Math.abs(cy.bow - 495) <= 1.5 && cy.magic === 900, cy);
  let t0 = performance.now();
  for (let i = 0; i < 20; i++) powerOf(room, c);
  const ms = (performance.now() - t0) / 20;
  console.log('     (one score: ' + ms.toFixed(2) + ' ms)');
  check('1n. a score costs the room a few ms at most (once a board report)', ms < 15, ms);
}

/* ═══ 2. THE DICE ═══ */
console.log('\n2. the dice: the index\'s mean blow is the game\'s');
const KIND = { melee: 'melee', bow: 'ranged', magic: 'staff' };
/* the mean of `n` real blows of `att` on a copy of `def` -- the PvP roll, the
   door -- per blow (a volley's three arrows summed) */
function realMean(att, def, style, special, n, bend) {
  const tgt = { ...def, _buffs: {} };
  room._prog3Recompute(tgt);
  const tLvl = room._prog3OpponentLevel(tgt), aLvl = room._prog3OpponentLevel(att);
  const real = Math.random;
  Math.random = rnd;
  let sum = 0;
  try {
    for (let i = 0; i < n; i++) {
      const parts = special ? (style === 'bow' ? [{ part: 3 }, { part: 3 }, { part: 3 }] : style === 'magic' ? [{ orbs: 3 }] : [{}]) : [{}];
      if (special) room._pvpSpecialPaid(att, Date.now());
      for (const pl of parts) {
        tgt.hp = 1e9;
        const r = room._pvpRollFor(att, KIND[style], special, pl, tLvl);
        const raw = bend ? r.dmg * bend : r.dmg;
        sum += room._applyDamage(tgt, raw, false, { attackerLevel: aLvl }).dmgTaken;
      }
    }
  } finally { Math.random = real; }
  return sum / n;
}
seed(4242);
const tough = controlBuild();
tough.prog3.alloc.dodge = 40; tough.prog3.alloc.def = 40;   /* the combined floor binds */
const CASES = [
  ['the control on the control', controlBuild(), controlBuild()],
  ['a level 35 on the control', randomBuild(room, { level: 35 }), controlBuild()],
  ['the control on a level 8', controlBuild(), randomBuild(room, { level: 8 })],
  ['the control on Dodge 40 + Defense 40', controlBuild(), tough],
];
DICE_SEEN.max = 0;
for (const [name, a, d] of CASES) {
  const A = ready(a), D = ready(d);
  for (const style of POWER.STYLES) {
    const side = sideOf(room, A, D, style);
    for (const special of [false, true]) {
      const want = special ? side.special : side.plain;
      const got = realMean(A, D, style, special, 40000);
      const off = Math.abs(got - want) / Math.max(1e-9, got);
      check('2. ' + name + ', ' + style + (special ? ' special' : ' plain') + ': the index ' + want.toFixed(2) + ' = the door ' + got.toFixed(2) + ' (within 2 %)', off < 0.02, { want, got, off });
    }
  }
}
check('2z. the roll draws its dice twice (the band, then the crit): the index walks both', DICE_SEEN.max === 2, DICE_SEEN.max);

/* ═══ 3. NEVER LOWERS ═══ */
console.log('\n3. never lowers');
{
  const clone = (b) => JSON.parse(JSON.stringify(b));
  const METALS = Object.keys(BLACKSMITH_TIERS), WOODS = Object.keys(WOODWORKING_TIERS);
  const nextTier = (w) => {
    if (!w) return w;
    const ww = w.gearBase.startsWith('ww_');
    const keys = ww ? WOODS : METALS, table = ww ? WOODWORKING_TIERS : BLACKSMITH_TIERS;
    const i = keys.indexOf(ww ? w.gearBase.slice(3) : w.gearBase);
    const k = keys[Math.min(keys.length - 1, i + 1)];
    return { ...w, gearBase: (ww ? 'ww_' : '') + k, tierMult: table[k].tierMult };
  };
  const GRADE = { normal: 'rare', rare: 'elite', elite: 'elite' };
  const CHANGES = [];
  for (const k of Object.keys(PROG3.BODY)) CHANGES.push(['+1 ' + k, (b) => { b.prog3.alloc[k] += 1; }]);
  for (const cat of PROG3.SKILLS) for (const k of Object.keys(PROG3.ATK)) CHANGES.push(['+1 ' + cat + ' ' + k, (b) => { b.prog3.atk[cat][k] += 1; }]);
  for (const cat of PROG3.SKILLS) CHANGES.push(['+1 ' + cat + ' level', (b) => { b.prog3.sk[cat].level = Math.min(PROG3.LEVEL_CAP, b.prog3.sk[cat].level + 1); }]);
  for (const s of ['weapon', 'rangedWeapon', 'staffWeapon']) {
    CHANGES.push(['a better ' + s, (b) => { b[s] = nextTier(b[s]); }]);
    CHANGES.push(['a finer ' + s, (b) => { if (b[s]) b[s].quality = GRADE[b[s].quality] || 'rare'; }]);
  }
  for (const s of ['armor', 'legsArmor']) {
    CHANGES.push(['better ' + s, (b) => { b[s] = b[s] ? { ...b[s], tierMult: Math.min(3, b[s].tierMult + 1) } : { name: 'x', mat: 'copper', tierMult: 1, quality: 'normal' }; }]);
  }
  seed(31337);
  const builds = [controlBuild()];
  for (let i = 0; i < 30; i++) builds.push(randomBuild(room));
  const bad = [];
  for (const b of builds) {
    const p0 = powerOf(room, b);
    for (const [name, fn] of CHANGES) {
      const b1 = clone(b);
      fn(b1);
      const p1 = powerOf(room, b1);
      for (const k of ['power', 'melee', 'bow', 'magic']) if (p1[k] < p0[k]) bad.push({ name, k, from: p0[k], to: p1[k], lv: maxLv(b) });
    }
  }
  check('3. ' + CHANGES.length + ' changes x ' + builds.length + ' builds: no score went down', bad.length === 0, bad.slice(0, 5));
}

/* ═══ 4. THE PREDICTION ═══ */
console.log('\n4. the prediction');
const R = 5;
/* `near`: B within five levels of A, the pairs No man's land lets fight
   (nomansland.js _nmlAllowed: the gap no wider than the ring's level) */
function sample(n, near, sd) {
  seed(sd);
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = randomBuild(room);
    const b = near ? randomBuild(room, { level: Math.max(1, Math.min(40, maxLv(a) + Math.round((rnd() * 2 - 1) * 5))) }) : randomBuild(room);
    let w = 0;
    for (let k = 0; k < R; k++) w += duel(room, a, b);
    const ra = ratiosOf(room, a), rb = ratiosOf(room, b);
    out.push({ w: w / R, lr: Math.log(Math.max(ra.melee, ra.bow, ra.magic)) - Math.log(Math.max(rb.melee, rb.bow, rb.magic)),
      ds: sumLv(a) - sumLv(b), dm: maxLv(a) - maxLv(b), lv: [maxLv(a), maxLv(b)] });
  }
  return out;
}
/* how often a predictor names the winner of the pair's five duels (a pair
   whose duels split evenly is left out; a predictor's tie is half right) */
function acc(arr, f) {
  let c = 0, n = 0;
  for (const p of arr) {
    if (p.w === 0.5) continue;
    n++;
    const d = f(p);
    c += d === 0 ? 0.5 : ((d > 0) === (p.w > 0.5) ? 1 : 0);
  }
  return n ? c / n : 0;
}
/* Bradley-Terry: P(A wins) = SA / (SA + SB), S = 1000 r^alpha */
function logLoss(arr, a) {
  let s = 0;
  for (const p of arr) {
    const q = Math.min(1 - 1e-6, Math.max(1e-6, 1 / (1 + Math.exp(-a * p.lr))));
    s -= p.w * Math.log(q) + (1 - p.w) * Math.log(1 - q);
  }
  return s / arr.length;
}
function fitAlpha(arr) {
  let lo = 0.05, hi = 8;
  for (let i = 0; i < 90; i++) {
    const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3;
    if (logLoss(arr, m1) < logLoss(arr, m2)) hi = m2; else lo = m1;
  }
  return (lo + hi) / 2;
}
const pct = (x) => (x * 100).toFixed(1) + '%';
const t4 = performance.now();
const near = sample(1200, true, 2026);
const any = sample(600, false, 1999);
const train = near.slice(0, near.length / 2), test = near.slice(near.length / 2);
const alpha = fitAlpha(train);
console.log('     ' + (near.length + any.length) + ' pairs x ' + R + ' duels in ' + Math.round(performance.now() - t4) + ' ms');
console.log('     the fit (half the near pairs): alpha ' + alpha.toFixed(2) + ' (POWER.ALPHA ' + POWER.ALPHA + ')');
console.log('     on the other half: log-loss ' + logLoss(test, POWER.ALPHA).toFixed(3) + ' at POWER.ALPHA, ' + logLoss(test, 1).toFixed(3) + ' at 1');
const rows = [['within five levels (the other half)', test], ['any two, levels 1-40', any],
  ['  ...the same level', any.concat(test).filter((p) => p.dm === 0)],
  ['  ...one to three levels apart', any.concat(test).filter((p) => Math.abs(p.dm) >= 1 && Math.abs(p.dm) <= 3)],
  ['  ...four to eight apart', any.concat(test).filter((p) => Math.abs(p.dm) >= 4 && Math.abs(p.dm) <= 8)],
  ['  ...nine or more apart', any.concat(test).filter((p) => Math.abs(p.dm) >= 9)]];
console.log('     names the winner:                     index    sum of 3   level   (pairs)');
const ACC = {};
for (const [name, arr] of rows) {
  const r = { index: acc(arr, (p) => p.lr), sum: acc(arr, (p) => p.ds), level: acc(arr, (p) => p.dm) };
  ACC[name] = r;
  console.log('     ' + name.padEnd(38) + pct(r.index).padStart(6) + pct(r.sum).padStart(10) + pct(r.level).padStart(9) + '   (' + arr.filter((p) => p.w !== 0.5).length + ')');
}
const MARGIN = 0.08;
check('4a. within five levels: the index names the winner more often than the sum, by ' + pct(MARGIN) + ' at least',
  ACC['within five levels (the other half)'].index >= ACC['within five levels (the other half)'].sum + MARGIN, ACC['within five levels (the other half)']);
check('4b. any two, levels 1-40: the same', ACC['any two, levels 1-40'].index >= ACC['any two, levels 1-40'].sum + MARGIN, ACC['any two, levels 1-40']);
check('4c. the fitted exponent is POWER.ALPHA\'s (within a third): else refit it and bump POWER.V',
  Math.abs(alpha - POWER.ALPHA) <= POWER.ALPHA / 3, { alpha, ALPHA: POWER.ALPHA });
check('4d. POWER.ALPHA predicts the odds better than the plain time ratio (log-loss on the other half)',
  logLoss(test, POWER.ALPHA) <= logLoss(test, 1), { at: logLoss(test, POWER.ALPHA), at1: logLoss(test, 1) });
{
  /* the scale, for the spec: the median Power of random characters by level */
  seed(77);
  const line = [];
  for (const L of [1, 5, 10, 15, 20, 25, 30, 35, 40]) {
    const ps = [];
    for (let i = 0; i < 15; i++) ps.push(powerOf(room, randomBuild(room, { level: L })).power);
    ps.sort((x, y) => x - y);
    line.push('L' + L + ' ' + ps[7]);
  }
  console.log('     the median Power by level: ' + line.join(', '));
}

/* ═══ 5. THE BREAK PROOFS ═══ */
console.log('\n5. the break proofs: the index moves with the worker');
{
  seed(9);
  const b = randomBuild(room, { level: 30, main: 'sword' });
  const p0 = powerOf(room, b);
  /* 5a. the trained level's damage (prog3.js PROG3.DMG_PER_LEVEL, read by the
     roll).  Red if power.js rolled its own hit: write sideOf's `plain` as
     `level * 1.5 * tierMult ** 1.5` and the melee score stays put. */
  const k0 = PROG3.DMG_PER_LEVEL.sword;
  PROG3.DMG_PER_LEVEL.sword = k0 * 2;
  const p1 = powerOf(room, b);
  PROG3.DMG_PER_LEVEL.sword = k0;
  check('5a. a sword\'s damage a level doubled in prog3.js: a level-30 sword\'s melee score moves', p1.melee !== p0.melee, [p0.melee, p1.melee]);
  check('5a. ...and only the melee score', p1.bow === p0.bow && p1.magic === p0.magic, [p0, p1]);
  /* 5b. armour (combat.js _armorDrMult).  Red if guardOf copied the armour
     arithmetic (0.30 + 0.075 per tier on the torso...) instead of calling it. */
  const dr = room._armorDrMult;
  room._armorDrMult = function () { return 1; };
  const p2 = powerOf(room, b);
  room._armorDrMult = dr;
  check('5b. armour taken away in combat.js: the scores move', p2.melee !== p0.melee && p2.bow !== p0.bow && p2.magic !== p0.magic, [p0, p2]);
  /* 5c. the roll itself (combat.js _rollHit), bent for this player alone.
     Red if meanHit rolled anything but room._rollHit. */
  const roll = room._rollHit;
  room._rollHit = function (ps, ...rest) {
    const r = roll.call(this, ps, ...rest);
    return ps.prog3 === b.prog3 ? { ...r, dmg: r.dmg * 2 } : r;
  };
  const p3 = powerOf(room, b);
  room._rollHit = roll;
  check('5c. this player\'s every hit doubled in the roll: every score goes up', p3.melee > p0.melee && p3.bow > p0.bow && p3.magic > p0.magic, [p0, p3]);
  /* 5d. the door.  §2 is the check that power.js's `landed` is
     _applyDamage's arithmetic: here the door is bent by a tenth and §2's
     comparison must fail.  Red if §2's tolerance were loose enough to pass a
     door a tenth off. */
  const A = ready(controlBuild()), D = ready(controlBuild());
  const want = sideOf(room, A, D, 'melee').plain;
  const bent = realMean(A, D, 'melee', false, 40000, 0.9);
  check('5d. a door a tenth off fails §2\'s 2 % (' + want.toFixed(2) + ' against ' + bent.toFixed(2) + ')', Math.abs(bent - want) / bent >= 0.02, { want, bent });
  /* 5e. the dice.  A roll that drew a third time would put the index's grid
     on the wrong draw; §2z says so. */
  const cad = room._computeAttackDamage;
  room._computeAttackDamage = function (...a) { Math.random(); return cad.apply(this, a); };
  DICE_SEEN.max = 0;
  powerOf(room, b);
  room._computeAttackDamage = cad;
  check('5e. a roll that draws a third time is seen (§2z would fail)', DICE_SEEN.max === 3, DICE_SEEN.max);
  DICE_SEEN.max = 0;
  /* 5f. the control.  Red if its numbers were edited without the version. */
  const sig = JSON.stringify([POWER.CONTROL, POWER.ALPHA, POWER.BASE, POWER.SPECIAL_GAP_MS]);
  const SIG_V1 = '[{"sk":{"sword":20,"bow":20,"staff":20},"shared":{"hp":15,"def":12,"dodge":12,"stam":6,"mana":6,"eres":3,"move":3},"lane":{"dmg":18,"luck":15,"aspd":12,"special":9,"range":3,"elem":0},"gear":{"weapon":{"type":"greatsword","name":"Black Steel Great Sword","gearBase":"steel","tierMult":1.4,"quality":"normal"},"rangedWeapon":{"type":"bow","name":"Hardwood Bow","gearBase":"ww_hardwood","tierMult":1.25,"quality":"normal"},"staffWeapon":{"type":"staff","name":"Hardwood Staff","gearBase":"ww_hardwood","tierMult":1.25,"quality":"normal"},"armor":{"name":"Black Steel Torso","mat":"blacksteel","tierMult":3,"quality":"normal"},"legsArmor":{"name":"Black Steel Greaves","mat":"blacksteel","tierMult":3,"quality":"normal"},"shield":{"name":"Pine Shield","gearBase":"wood","tierMult":1},"amulet":null}},2,1000,1500]';
  check('5f. the control and the exponent are version ' + POWER.V + '\'s: a change to either bumps POWER.V and this line', POWER.V !== 1 || sig === SIG_V1, sig);
}

console.log('\n' + passes + ' passed, ' + failures + ' failed');
process.exit(failures ? 1 : 0);
