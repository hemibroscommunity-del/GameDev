/* relative-points-sim — the referee for RELATIVE POINT VALUE
 * (docs/specs/relative-points.md, v2.3.2680, shipped).
 *
 * Owner, 2026-09-22: "I want each point to matter during the early level up
 * phases of the game.  If a character is putting his first 5 points into
 * dodge I want them to experience a high rate of dodging RELATIVE to the
 * same or lesser monster level they're playing.  It can decay quickly for
 * higher level monsters for balance reasons."
 *
 * The one rule this file keeps (balance-sim's, verify-prog3-retune's):
 * IMPORT THE SHIPPED FORMULAS, NEVER RESTATE THEM.  It builds a real
 * GameRoom, joins a real player and drives the real _computeAttackDamage and
 * _applyDamage — the roll and the sink the worker uses — passing each
 * monster's level the way every call site in server/src does.
 *
 *   node tools/relative-points-sim.mjs                   the shipped code
 *   node tools/relative-points-sim.mjs --root <checkout>  any other tree
 *
 * --root is how the note's "today" columns were measured: point it at a
 * checkout from before v2.3.2680 and §2-§4 print that tree's numbers (the
 * extra level arguments are simply ignored by the old code).  §1 and §5 need
 * the curve and skip themselves on a tree without it.
 *
 *   1. THE CURVE AND THE EDGE — what 1 / 3 / 5 / 10 / 20 / 50 points buy, per
 *      stat, and the fraction of a point left against a stronger monster.
 *   2. THE FIRST HOUR — the owner's case (5 Dodge at character 5) and one
 *      level-up's points into Power, Defense and Luck at characters 4 to 10,
 *      in HITS and in the number the damage popup prints.
 *   3. THE FADE — a fully-spent character 10 against monsters from −3 to +7.
 *   4. THE TANK — every shared point into Defense and Dodge, against an
 *      at-level brute: the combined floor, with and without top armour.
 *   5. ANTICHEAT — rolls against every target level stay under the ceiling. */
const argRoot = process.argv.indexOf('--root');
const ROOT = argRoot > 0 ? process.argv[argRoot + 1] : new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const QUICK = process.argv.includes('--quick');
const N = QUICK ? 800 : 4000;

const { GameRoom } = await import(ROOT + '/server/src/index.js');
const P3 = await import(ROOT + '/server/src/prog3.js');
const { PROG3 } = P3;
const { MONSTER_HP_CURVE, ARCHETYPES, monsterStat, monsterHpFlat, BLACKSMITH_TIERS } = await import(ROOT + '/server/src/data.js');
const CURVE = typeof P3.prog3Curve === 'function';

const mockState = { storage: { get: async () => undefined, put: async () => {}, list: async () => new Map(), delete: async () => {} },
  getWebSockets: () => [], acceptWebSocket: () => {} };
const room = new GameRoom(mockState, { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => ({}) }) } });
const ws = { send() {}, close() {} };
room.sessions.set(ws, { id: null, name: 'Sim', data: {}, rtt: 80, lastPing: 0, lastRecv: Date.now() });
await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id: 'sim', name: 'Sim', protocolVersion: 2, data: { x: 0, y: 0, z: 'meadow' } }));
const ps = room.playerState.sim;
if (!ps || !ps.prog3) throw new Error('join did not seed prog3');
ps._zoneEntryGraceUntil = 0; ps._godUntil = 0; ps.armor = null; ps.legsArmor = null; ps.amulet = null; ps._buffs = null; ps._cursedUntil = 0;

const TK = Object.keys(BLACKSMITH_TIERS);
const COPPER = TK.indexOf('copper');
/* The greatsword tier the prog3 gate allows at a Melee level (tierIndex × 5). */
const tierFor = (sk) => BLACKSMITH_TIERS[TK[Math.min(TK.length - 1, Math.floor(sk / 5))]].tierMult;
const C = MONSTER_HP_CURVE;
const mon = (a, l) => ({ level: l,
  hp: Math.max(1, Math.ceil(monsterStat(C.base, l, C.ramp, C.plateau, C.endgame) * ARCHETYPES[a].hpMult) + monsterHpFlat(l)),
  dmg: Math.ceil(monsterStat(12, l, 1.045, 1.025, 1.018) * ARCHETYPES[a].dmgMult) });
/* A melee character: sword `sword`, bow/staff 1, the named points, nothing else. */
function build(sword, lane, shared) {
  for (const c of PROG3.SKILLS) {
    ps.prog3.sk[c].level = c === 'sword' ? sword : 1;
    for (const k of Object.keys(PROG3.ATK)) ps.prog3.atk[c][k] = 0;
  }
  for (const k of Object.keys(PROG3.BODY)) ps.prog3.alloc[k] = 0;
  Object.assign(ps.prog3.atk.sword, lane || {});
  Object.assign(ps.prog3.alloc, shared || {});
  ps.weapon = { type: 'greatsword', tierMult: tierFor(sword) }; ps.rangedWeapon = null; ps.staffWeapon = null;
  room._prog3Recompute(ps); ps.hp = ps.maxHp;
}
const wear = (rung) => {
  if (rung < 0) { ps.armor = null; ps.legsArmor = null; return; }
  const key = TK[Math.min(TK.length - 1, COPPER + rung)];
  ps.armor = { tierMult: BLACKSMITH_TIERS[key].tierMult, gearBase: key };
  ps.legsArmor = { tierMult: BLACKSMITH_TIERS[key].tierMult, gearBase: key };
};
const hitsToKill = (m) => { let t = 0; for (let i = 0; i < N; i++) { let hp = m.hp, n = 0;
  while (hp > 0) { hp -= room._computeAttackDamage(ps, 'melee', false, { targetLevel: m.level }).dmg; n++; } t += n; } return t / N; };
const perHit = (m) => { let t = 0; for (let i = 0; i < N; i++) { ps.hp = ps.maxHp;
  t += room._applyDamage(ps, m.dmg, false, { attackerLevel: m.level }).dmgTaken; } return t / N; };
const dodgeRate = (m) => { let d = 0; for (let i = 0; i < N; i++) { ps.hp = ps.maxHp;
  if (room._applyDamage(ps, m.dmg, false, { attackerLevel: m.level }).dodged) d++; } return d / N; };
const toDie = (m) => ps.maxHp / Math.max(1e-9, perHit(m));
/* The number the damage popup prints: the roll ÷ 5 (DISPLAY_SCALE_K), vs a level-1 target. */
const shown = () => { let lo = 1e9, hi = 0; for (let i = 0; i < 800; i++) {
  const d = Math.max(1, Math.round(room._computeAttackDamage(ps, 'melee', false, { targetLevel: 1 }).dmg / 5));
  lo = Math.min(lo, d); hi = Math.max(hi, d); } return `${lo}-${hi}`; };
const f1 = (x) => x.toFixed(1), pc = (x) => (x * 100).toFixed(0) + '%', pad = (s, n) => String(s).padStart(n);

console.log(`relative-points-sim — measuring ${ROOT}${CURVE ? '' : '  (no curve on this tree: §1 and §5 skipped)'}`);

/* ═══ 1. THE CURVE AND THE EDGE ═══ */
if (CURVE) {
  console.log('\n1. THE CURVE — what the points buy, at or below your level (edge 1)');
  console.log('   stat       max     k |     1      3      5     10     20     50');
  const rows = [['dodge', 'BODY', (v) => pc(v)], ['def', 'BODY', (v) => pc(v)], ['eres', 'BODY', (v) => pc(v)],
    ['dmg', 'ATK', (v) => '+' + pc(v)], ['luck', 'ATK', (v) => pc(0.01 + v)], ['special', 'ATK', (v) => '+' + pc(v)],
    ['elem', 'ATK', (v) => f1(v)], ['move', 'BODY', (v) => '+' + pc(v)], ['aspd', 'ATK', (v) => '−' + pc(v)], ['range', 'ATK', (v) => '+' + pc(v)]];
  for (const [k, t, fmt] of rows) {
    const d = PROG3[t][k];
    const cells = [1, 3, 5, 10, 20, 50].map((p) => pad(fmt(d.max * P3.prog3Curve(p, d.k)), 6));
    console.log(`   ${k.padEnd(8)} ${pad(d.max, 5)} ${pad(d.k, 5)} | ${cells.join(' ')}${d.rel ? '' : '   (no edge)'}`);
  }
  console.log('   (luck prints crit chance with its 1 % base; its multiplier is 1.5 + ' + PROG3.ATK.luck.dmgMax + ' × the same curve)');
  console.log('\n   THE EDGE — the share of your points that counts, by how far the monster is above your level');
  console.log('   gap    ' + [-3, 0, 1, 2, 3, 4, 5, 6].map((g) => pad(g > 0 ? '+' + g : g, 5)).join(''));
  console.log('   edge   ' + [-3, 0, 1, 2, 3, 4, 5, 6].map((g) => pad(pc(P3.prog3Edge(10, 10 + g)), 5)).join(''));
}

/* ═══ 2. THE FIRST HOUR ═══ */
console.log('\n2. THE FIRST HOUR — the owner\'s case, then one level-up\'s points (3) into one stat');
build(3, {}, {});
const d0 = { l3: dodgeRate(mon('brute', 3)), l2: dodgeRate(mon('brute', 2)), die: toDie(mon('brute', 3)) };
build(3, {}, { dodge: 5 });
const d5 = { l3: dodgeRate(mon('brute', 3)), l2: dodgeRate(mon('brute', 2)), l5: dodgeRate(mon('brute', 5)), l8: dodgeRate(mon('brute', 8)), die: toDie(mon('brute', 3)) };
console.log(`   5 Dodge points, character 5 (Melee 3): dodge ${pc(d0.l3)} → ${pc(d5.l3)} vs a level-3 brute, ${pc(d5.l2)} vs level 2,`);
console.log(`     ${pc(d5.l5)} vs level 5 (+2), ${pc(d5.l8)} vs level 8 (+5); brute swings to kill you ${f1(d0.die)} → ${f1(d5.die)}`);
console.log('   char | +3 Power: shows      at-level brute hits | +3 Defense: brute hit | +3 Luck: at-level brute hits');
for (const L of [4, 5, 6, 8, 10]) {
  const sk = L - 2, m = mon('brute', sk);
  build(sk, {}, {}); const s0 = shown(), h0 = hitsToKill(m), t0 = perHit(m);
  build(sk, { dmg: 3 }, {}); const s3 = shown(), h3 = hitsToKill(m);
  build(sk, {}, { def: 3 }); const t3 = perHit(m);
  build(sk, { luck: 3 }, {}); const c3 = hitsToKill(m);
  console.log(`   ${pad(L, 4)} | ${pad(s0 + ' → ' + s3, 12)} ${pad(f1(h0) + ' → ' + f1(h3), 17)} | ${pad(f1(t0) + ' → ' + f1(t3), 18)} | ${f1(h0)} → ${f1(c3)}`);
}
console.log('   (at-level = a monster at the character\'s Melee level — the level the edge measures against)');

/* ═══ 3. THE FADE ═══ */
console.log('\n3. THE FADE — a fully-spent character 10 (Melee 8: 21 lane + 21 shared) against brutes around its level');
build(8, { dmg: 10, luck: 10, special: 1 }, { hp: 7, def: 7, dodge: 7 });
console.log('   monster  | hits to kill | its swings to kill you');
for (const g of [-3, 0, 2, 4, 5, 7]) {
  const m = mon('brute', 8 + g);
  console.log(`   Lv ${pad(8 + g, 2)} ${pad(g > 0 ? '+' + g : g, 3)} | ${pad(f1(hitsToKill(m)), 12)} | ${pad(f1(toDie(m)), 6)}`);
}

/* ═══ 4. THE TANK ═══ */
console.log('\n4. THE TANK — every shared point into Defense, then Dodge (each ≤ character level), then HP; at-level brute');
console.log('   char | damage through · swings to die | + the best armour the gate allows');
for (const L of [20, 40, 90]) {
  const sh = 3 * (L - 3), def = Math.min(L, sh), dodge = Math.min(L, sh - def), hp = Math.min(100, L, sh - def - dodge);
  const sk = Math.min(100, L - 2), m = mon('brute', sk);
  build(sk, {}, { def, dodge, hp });
  const bare = `${pad(f1(perHit(m) / m.dmg * 100), 5)} % · ${pad(f1(toDie(m)), 6)}`;
  wear(Math.min(18, Math.floor(def / 5)));
  const armd = `${pad(f1(perHit(m) / m.dmg * 100), 5)} % · ${pad(f1(toDie(m)), 6)}`;
  wear(-1);
  console.log(`   ${pad(L, 4)} | ${bare}            | ${armd}`);
}
if (CURVE) console.log(`   (the combined floor: Dodge × Defense never let less than ${pc(PROG3.FLOOR)} of a BASE hit through; armour sits outside it)`);

/* ═══ 5. ANTICHEAT ═══ */
if (CURVE) {
  console.log('\n5. ANTICHEAT — Power, Luck and Special at 297 each, Fury Tonic, against every target level');
  build(100, { dmg: 297, luck: 297, special: 297 }, {});
  ps.weapon = { type: 'sword', tierMult: 6, isVolatile: true };
  ps._buffs = { damageMul: 2.0 };
  let worst = 0, over = 0;
  for (const special of [false, true]) {
    const cap = room._maxDmgForAttacker(ps, special);
    for (const lvl of [1, 50, 100, undefined]) for (let i = 0; i < 400; i++) {
      const dmg = room._computeAttackDamage(ps, 'melee', special, { targetLevel: lvl }).dmg;
      worst = Math.max(worst, dmg / cap); if (dmg > cap) over++;
    }
  }
  ps._buffs = null;
  console.log(`   ${over === 0 ? 'PASS' : 'FAIL'} — peak roll at ${(worst * 100).toFixed(1)} % of the ceiling (the ceiling reads the curve at edge 1)`);
}
console.log('\n(done — docs/specs/relative-points.md says what these tables decide)');
