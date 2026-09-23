/* Display DMG/DPS/heal helper conformance (v2.3.1206, ext. v2.3.1207).
 *
 * calcDisplayDmgRange/calcDisplayDps (src/data/gameSystems.js) are the
 * ONE display formula behind the dashboard loadout readout, the item
 * detail popup, and the inventory stash compare.  They were extracted
 * because three hand-rolled copies drifted: two of them read no
 * allocations, so spending crit-channel points moved combat (and the
 * dashboard) but not the other readouts — the reported bug.  This
 * suite pins the property that regressed: EVERY relevant input
 * (crit channel, crit-dmg channel, damage channel, quality, hardness,
 * and — since v2.3.1207 — the Tempo atk-spd channel) must strictly
 * move the number, plus an exact hand-computed fixture, determinism
 * (single-roll displays regressed to random jitter twice), and a
 * rot-guard on the exports.
 *
 * v2.3.1207 also pins the two sibling display twins of server math:
 *   calcDisplayHeal    — cooking.js _handleEatRequest's
 *                        ceil(fishHeal × Recovery mult)
 *   calcDisplayArmorHp — grids.js's Vigor-multiplied armor HP pool
 *                        contribution (RETIRED v2.3.1697 — armor adds no
 *                        maxHp on either side now; §9 keeps pinning the
 *                        old formula's shape, §10 pins its replacement)
 *
 * v2.3.1697 adds the twin that MATTERS now: getArmorDrPct is checked
 * against the server's own _armorDrMult, imported live from
 * server/src/combat.js rather than restated — a hand-copied expectation
 * would drift the moment someone repriced a tier, which is precisely the
 * drift this whole suite exists to catch (§10).
 *
 * Zero-dep plain-node import of the client module — the mirror-audit
 * and tick suites established that every client data module loads
 * under plain node (v2.3.1189+).  The authoritative per-hit roll stays
 * server/src/combat.js _computeAttackDamage; these helpers are its
 * expected-value mirror for UI only. */
import {
  calcDisplayDmgRange, calcDisplayDps, calcDisplayHeal, calcDisplayArmorHp,
  /* ═══ v2.3.2520: the display damage scale (§5.8 D1) ═══
     calcCombatDmgRange is the range this suite's fixtures have always
     pinned -- the SERVER-unit math, unchanged.  calcDisplayDmgRange is now
     that same range with the display scale applied, so every "matches hand
     math exactly" check below moved to the raw half and the scaled half is
     pinned against it.  §12 pins the scale itself. */
  calcCombatDmgRange, DISPLAY_SCALE_K, toDisplayDamage, toDisplayHp, toDisplayHitDamage,
  getFishHealAmount, getArmorHp,
  getArmorDrPct, getArmorPieceDr, ARMOR_DR, /* v2.3.1697 */
  WEAPON_CHANNELS, WEAPON_CATEGORY, SWING_COOLDOWN,
  T2_UNITS, /* v2.3.1415: critDmg fixture derives from the unit table */
} from '../../src/data/gameSystems.js';
/* v2.3.1697: the SERVER side of the armour-mitigation mirror.  combatMethods
   is a plain method bag (rule 22), and _armorDrMult touches no `this`, so it
   can be called directly without standing up a GameRoom. */
import { combatMethods } from '../src/combat.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) { console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

/* Channel key for a role in a category, read from the live spec table
   so a future key rename can't silently turn these tests into no-ops. */
function chKey(cat, role) {
  const def = (WEAPON_CHANNELS[cat] || []).find((c) => c.role === role && c.active);
  return def && def.key;
}

/* Realistic rpg fixture — weaponSpecs is { sword|bow|staff: { <channelKey>: pts } }
   (the shape SpendPointConfirm/grids build), stats are the T1 drivers. */
function makeRpg(over = {}) {
  const zeroSpec = (cat) => {
    const s = {};
    for (const c of WEAPON_CHANNELS[cat]) s[c.key] = 0;
    return s;
  };
  return {
    activeSlot: 'melee',
    power: 100, agility: 80, mind: 60, vitality: 40, endurance: 30,
    weaponSpecs: { sword: zeroSpec('sword'), bow: zeroSpec('bow'), staff: zeroSpec('staff') },
    ...over,
  };
}

const SWORD = { type: 'sword', tierMult: 2.0 };
const BOW = { type: 'bow', tierMult: 1.8 };
const STAFF = { type: 'staff', tierMult: 1.5 };

// ── 0. Rot-guard: helpers exist and return finite positive numbers ──
{
  check('rot-guard: helpers are exported functions',
    typeof calcDisplayDmgRange === 'function' && typeof calcDisplayDps === 'function');
  const r = calcDisplayDmgRange(makeRpg(), SWORD);
  check('rot-guard: range is finite, positive, ordered, with a sane period',
    !!r && Number.isFinite(r.min) && Number.isFinite(r.max)
    && r.min > 0 && r.max >= r.min
    && typeof r.text === 'string' && r.text.length > 0
    && r.cdMs === SWING_COOLDOWN, r);
  const staffR = calcDisplayDmgRange(makeRpg(), STAFF);
  check('rot-guard: staff carries the +300ms cast penalty',
    !!staffR && staffR.cdMs === SWING_COOLDOWN + 300, staffR);
  const d = calcDisplayDps(makeRpg(), SWORD);
  check('rot-guard: dps is a finite positive number', Number.isFinite(d) && d > 0, d);
  check('rot-guard: null/unknown weapon degrades to null / 0',
    calcDisplayDmgRange(makeRpg(), null) === null
    && calcDisplayDps(makeRpg(), null) === 0
    && calcDisplayDmgRange(makeRpg(), { type: 'banjo' }) === null);
}

// ── 1. Crit-channel points STRICTLY increase DPS (the reported bug:
// two of three readouts ignored these points entirely) ──
{
  for (const [wpn, label] of [[SWORD, 'sword'], [BOW, 'bow'], [STAFF, 'staff']]) {
    const cat = WEAPON_CATEGORY[wpn.type];
    const key = chKey(cat, 'crit');
    check(`crit channel key resolves for ${cat}`, !!key, cat);
    const at = (pts) => {
      const rpg = makeRpg();
      rpg.weaponSpecs[cat][key] = pts;
      return calcDisplayDps(rpg, wpn);
    };
    const d0 = at(0), d50 = at(50), d100 = at(100);
    check(`crit-channel points strictly increase ${label} DPS (0 < 50 < 100 pts)`,
      d0 < d50 && d50 < d100, { d0, d50, d100 });
  }
}

// ── 2. Crit-DMG-channel points increase DPS ──
{
  const cat = WEAPON_CATEGORY[SWORD.type];
  const key = chKey(cat, 'critDmg');
  check('crit-dmg channel key resolves', !!key, cat);
  const at = (pts) => {
    const rpg = makeRpg();
    rpg.weaponSpecs[cat][key] = pts;
    return calcDisplayDps(rpg, SWORD);
  };
  const d0 = at(0), d50 = at(50), d100 = at(100);
  check('crit-DMG-channel points strictly increase DPS (0 < 50 < 100 pts)',
    d0 < d50 && d50 < d100, { d0, d50, d100 });
}

// ── 3. Damage-channel points increase DPS ──
{
  const cat = WEAPON_CATEGORY[SWORD.type];
  const key = chKey(cat, 'damage');
  check('damage channel key resolves', !!key, cat);
  const at = (pts) => {
    const rpg = makeRpg();
    rpg.weaponSpecs[cat][key] = pts;
    return calcDisplayDps(rpg, SWORD);
  };
  const d0 = at(0), d50 = at(50), d100 = at(100);
  check('damage-channel points strictly increase DPS (0 < 50 < 100 pts)',
    d0 < d50 && d50 < d100, { d0, d50, d100 });
}

// ── 4. Weapon quality + hardness increase DPS (the popup's old
// stat-free copy ignored weaponEffBase's loot layers too) ──
{
  const rpg = makeRpg();
  const q = (quality) => calcDisplayDps(rpg, { ...SWORD, quality });
  const dNormal = q('normal'), dRare = q('rare'), dElite = q('elite'), dGodly = q('godly');
  check('quality grades strictly increase DPS (normal < rare < elite < godly)',
    dNormal < dRare && dRare < dElite && dElite < dGodly,
    { dNormal, dRare, dElite, dGodly });
  const h = (hardness) => calcDisplayDps(rpg, { ...SWORD, hardness });
  const h0 = h(0), h3 = h(3), h5 = h(5);
  check('hardness strictly increases DPS (0 < 3 < 5)', h0 < h3 && h3 < h5, { h0, h3, h5 });
}

// ── 5. Hand-computed fixture matches EXACTLY (the v2.3.1345 formula:
// (effBase + stat×0.1667) × tierMult, variance band, + t2Accel flat,
// then (avg × (1 + cc×(cm−1)) + cc×critFlat) / period) ──
{
  const cat = WEAPON_CATEGORY.sword;
  const rpg = makeRpg({ power: 100 });
  rpg.weaponSpecs[cat][chKey(cat, 'damage')] = 40;
  rpg.weaponSpecs[cat][chKey(cat, 'crit')] = 50;
  rpg.weaponSpecs[cat][chKey(cat, 'critDmg')] = 25;
  const wpn = { type: 'sword', tierMult: 2.0 }; // plain quality, hardness 0

  // By hand: sword base 6.67 (WEAPON_TYPES), no quality/hardness.
  const base = (6.67 + 100 * 0.1667) * 2.0;
  const flat = 1 * 40 * 41;                          // t2Accel(40, 1) = 1,640
  const expMin = Math.round(base * 0.75 + flat);     // melee band 0.75-1.25
  const expMax = Math.round(base * 1.25 + flat);
  const critChance = 0.01                            // v2.3.2210: the flat base every character starts with
                   + 40 * 100 / (100 + 200) / 100    // Power baseline
                   + 50 * 0.005;                     // + counter channel expected rate
  const critMult = 1.5 + 100 * 0.001;                // power-only (1.6)
  const critFlat = Math.round(T2_UNITS.critDmg * 25 * 26); // t2Accel(25, unit) — v2.3.1415: derives from the table so unit tuning can't break the fixture
  /* v2.3.2212: anchored crit -- floor at 2x the range top, banked flat on top. */
  const avgH = (expMin + expMax) / 2;
  const critHitH = Math.max(avgH * critMult, expMax * 2) + critFlat;
  const expDps = (avgH + critChance * (critHitH - avgH)) / (600 / 1000);

  /* v2.3.2520: the hand math above is in SERVER units and stays there — it is
     the roll the worker will confirm, and the crit anchor reads it. */
  const raw = calcCombatDmgRange(rpg, wpn);
  check('fixture: RAW damage range matches hand math exactly',
    !!raw && raw.min === expMin && raw.max === expMax && raw.text === expMin + '-' + expMax && raw.cdMs === 600,
    { got: raw, expMin, expMax });
  const sMin = toDisplayDamage(expMin), sMax = toDisplayDamage(expMax);
  const r = calcDisplayDmgRange(rpg, wpn);
  check('fixture: DISPLAYED damage range is the hand math through the scale',
    !!r && r.min === sMin && r.max === sMax
      && r.text === (sMin === sMax ? String(sMin) : sMin + '-' + sMax)
      && r.cdMs === 600 && r.rawMin === expMin && r.rawMax === expMax,
    { got: r, sMin, sMax });
  const d = calcDisplayDps(rpg, wpn);
  check('fixture: DPS matches hand math exactly (through the scale)',
    Math.abs(d - expDps / DISPLAY_SCALE_K) < 1e-9, { got: d, exp: expDps / DISPLAY_SCALE_K });
}

// ── 6. v2.3.1207: Tempo (atk-spd channel) folds into the period —
// points strictly increase DPS, damage range untouched, and the
// -50% hard cap (v2.3.1343) lands exactly at the 100-pt channel cap.  Only the
// sword category has an atkspd channel today. ──
{
  const cat = WEAPON_CATEGORY[SWORD.type];
  const key = chKey(cat, 'atkspd');
  check('atkspd channel key resolves for sword', !!key, cat);
  const at = (pts) => {
    const rpg = makeRpg();
    rpg.weaponSpecs[cat][key] = pts;
    return { dps: calcDisplayDps(rpg, SWORD), r: calcDisplayDmgRange(rpg, SWORD) };
  };
  const a0 = at(0), a50 = at(50), a100 = at(100);
  check('tempo points strictly increase DPS (0 < 50 < 100 pts)',
    a0.dps < a50.dps && a50.dps < a100.dps, { d0: a0.dps, d50: a50.dps, d100: a100.dps });
  check('tempo moves the PERIOD only — damage range unchanged',
    a0.r.min === a100.r.min && a0.r.max === a100.r.max, { r0: a0.r, r100: a100.r });
  check('tempo cap: 100 pts = exactly -50% period (v2.3.1343)',
    Math.abs(a100.r.cdMs - SWING_COOLDOWN * 0.5) < 1e-9, a100.r.cdMs);
}

// ── 7. v2.3.1207: determinism — the range/DPS helpers are pure
// expected values.  Two of the adopting sites (InventoryPanel equipped
// list, StatScreenPanel footer) used to print single RANDOM
// calcWeaponDmg rolls that changed every render. ──
{
  const rpg = makeRpg();
  rpg.weaponSpecs.sword[chKey('sword', 'damage')] = 30;
  const r1 = calcDisplayDmgRange(rpg, SWORD);
  const r2 = calcDisplayDmgRange(rpg, SWORD);
  check('calcDisplayDmgRange is deterministic (two calls identical)',
    r1.min === r2.min && r1.max === r2.max && r1.text === r2.text && r1.cdMs === r2.cdMs,
    { r1, r2 });
  const d1 = calcDisplayDps(rpg, SWORD);
  const d2 = calcDisplayDps(rpg, SWORD);
  check('calcDisplayDps is deterministic (two calls identical)', d1 === d2, { d1, d2 });
}

// ── 8. v2.3.1207: calcDisplayHeal mirrors cooking.js _handleEatRequest
// — ceil(fishHealAmount) + Recovery's flat bonus (v2.3.1345:
// t2Accel(p, 1); +10,100 at the cap). ──
{
  const KEY = 'cooked_fish_clownfish';
  const raw = getFishHealAmount(KEY);
  check('heal fixture is a real tiered fish (raw > default 20)', raw > 20, raw);
  const at = (pts) => calcDisplayHeal({ hpSpec: { recovery: pts } }, KEY);
  check('calcDisplayHeal: 0 recovery pts = raw table value', at(0) === raw, { got: at(0), raw });
  check('calcDisplayHeal: 100 recovery pts = ceil(raw) + flat 10,100 (v2.3.1345)',
    at(100) === Math.ceil(raw) + 10100, { got: at(100), exp: Math.ceil(raw) + 10100 });
  const h0 = at(0), h50 = at(50), h100 = at(100);
  check('recovery points monotonically increase the displayed heal',
    h0 < h50 && h50 < h100, { h0, h50, h100 });
  check('calcDisplayHeal degrades on a null rpg (mult 1)',
    calcDisplayHeal(null, KEY) === raw, calcDisplayHeal(null, KEY));
}

// ── 9. calcDisplayArmorHp mirrored the server's maxHp pool line
// (grids.js).  v2.3.1343: Vigor is FLAT +10 HP/pt now and no longer
// scales armor HP — the display returns the raw armor contribution at
// every point count.
// v2.3.1697: BOTH sides retired the armor→maxHp fold entirely, so this
// no longer mirrors anything live.  Kept as a shape-pin on the retired
// formula (an old blob's maxHp is reproducible from it) — the armour
// number the game actually uses is pinned in §10 below. ──
{
  const armor = { tierMult: 2.0 };
  const vit = 40;
  const raw = getArmorHp(armor, vit);
  const at = (pts) => calcDisplayArmorHp({ vitality: vit, hpSpec: { vigor: pts } }, armor);
  check('calcDisplayArmorHp: 0 vigor pts = raw getArmorHp', at(0) === raw, { got: at(0), raw });
  check('calcDisplayArmorHp: 100 vigor pts still = raw (flat vigor does not scale armor)',
    at(100) === raw, { got: at(100), exp: raw });
  check('calcDisplayArmorHp degrades on null rpg/armor',
    calcDisplayArmorHp(null, armor) === getArmorHp(armor, 0)
    && calcDisplayArmorHp({ vitality: vit }, null) === 0);
}

// ── 10. v2.3.1697: getArmorDrPct IS server/src/combat.js _armorDrMult ──
//
// The Hero pane, the equipped cards and the item popup all print armour's
// damage reduction now that it is armour's ONLY effect (the maxHp fold left
// both sides this version, on the owner's instruction).  heroModel's old
// note refused to show an armour number precisely because a displayed stat
// the server does not apply is a lie; the way that becomes safe is this
// test — every fixture is compared against the server function itself, so a
// tier reprice on one side fails here instead of shipping a false readout.
{
  const drOf = (ps) => 1 - combatMethods._armorDrMult(ps);
  const cases = [
    ['nothing worn', {}],
    ['chest only, base tier', { armor: { tierMult: 1 } }],
    ['legs only, base tier', { legsArmor: { tierMult: 1 } }],
    ['both, base tier', { armor: { tierMult: 1 }, legsArmor: { tierMult: 1 } }],
    ['both, mid tier', { armor: { tierMult: 3 }, legsArmor: { tierMult: 2.5 } }],
    ['tierMult at the x8 ceiling', { armor: { tierMult: 8 }, legsArmor: { tierMult: 8 } }],
    ['forged tierMult past the ceiling', { armor: { tierMult: 999 }, legsArmor: { tierMult: 999 } }],
    ['missing tierMult falls back to 1', { armor: {}, legsArmor: {} }],
    ['a client that never learned legsArmor', { armor: { tierMult: 4 } }],
  ];
  for (const [label, ps] of cases) {
    check(`armour DR mirror: ${label}`,
      Math.abs(getArmorDrPct(ps) - drOf(ps)) < 1e-12,
      { client: getArmorDrPct(ps), server: drOf(ps) });
  }
  /* The properties the numbers rest on, stated once on the client side so
     a future edit to the mirror alone still trips something. */
  check('armour DR: base torso is 30%, base legs 20%',
    Math.abs(getArmorPieceDr({ tierMult: 1 }, 'chest') - 0.30) < 1e-12
    && Math.abs(getArmorPieceDr({ tierMult: 1 }, 'legs') - 0.20) < 1e-12,
    { chest: getArmorPieceDr({ tierMult: 1 }, 'chest'), legs: getArmorPieceDr({ tierMult: 1 }, 'legs') });
  check('armour DR: two pieces stack multiplicatively (44%, not 50%)',
    Math.abs(getArmorDrPct({ armor: { tierMult: 1 }, legsArmor: { tierMult: 1 } }) - 0.44) < 1e-12,
    getArmorDrPct({ armor: { tierMult: 1 }, legsArmor: { tierMult: 1 } }));
  check('armour DR: the 75% cap is the last word',
    getArmorDrPct({ armor: { tierMult: 999 }, legsArmor: { tierMult: 999 } }) === ARMOR_DR.MAX);
  check('armour DR: nothing worn reads exactly 0 (not a rounding artefact)',
    getArmorDrPct({}) === 0 && getArmorDrPct(null) === 0);
  check('armour DR: an unknown slot contributes nothing',
    getArmorPieceDr({ tierMult: 8 }, 'cape') === 0);
}

// ── v2.3.1451: bench-locked accumulator drives the display mirrors ──
// When rpg.t2Flat is present (t2BenchLive), the damage / crit-dmg
// flats come from the BANKED values, not from point counts — the
// readout must move with the accumulator and ignore stale counts.
{
  const SWORD2 = { type: 'sword', tierMult: 1 };
  /* v2.3.2520: raw half — 777 is a flat in SERVER units, so the check that it
     lands whole belongs on the unscaled range (the scaled one would compare
     777 against 777/k and fail for a reason that has nothing to do with the
     accumulator this section is about). */
  const base = calcCombatDmgRange({ power: 10 }, SWORD2);
  const banked = calcCombatDmgRange({ power: 10, weaponSpecs: { sword: { edge: 50 } }, t2Flat: { sword: { edge: 777 } } }, SWORD2);
  check('t2bench: display range adds the banked damage flat (not the point count)',
    banked.min === base.min + 777 && banked.max === base.max + 777, { base, banked });
  const zeroBank = calcCombatDmgRange({ power: 10, weaponSpecs: { sword: { edge: 50 } }, t2Flat: { sword: { edge: 0 } } }, SWORD2);
  check('t2bench: zero banked flat beats a stale 50-point count when the accumulator is live',
    zeroBank.min === base.min && zeroBank.max === base.max, { base, zeroBank });
}

// ── 11. v2.3.2199: the prog3 display pair predicts the prog3 roll ──
// This suite had ZERO prog3 coverage — every fixture above exercises the
// legacy branch.  Pins: the dmg stat inside the pre-tier sum, the percent
// critDmg fold, and the rule-19 fallback (prog3x off = the flat +2 math an
// old worker actually rolls).
{
  const { setProg3Enabled, setProg3XEnabled, setProg3SharedEnabled, setProg3RelEnabled, PROG3, PROG3_LEGACY_ATK, PROG3_LINEAR } = await import('../../src/data/prog3.js');
  /* v2.3.2592: crit + critDmg are ONE stat (LUCK) on a worker that folded
     them; the fixture carries 50 luck points -> chance 1% + 50 × 0.3% =
     16%, multiplier 1.5 + 50 × 1% = 2.0. */
  const p3rpg = {
    activeSlot: 'melee',
    prog3: {
      sk: { sword: { level: 40, xp: 0 }, bow: { level: 1, xp: 0 }, staff: { level: 1, xp: 0 } },
      alloc: { def: 0, hp: 0, dodge: 0, stam: 0, elem: 0 },
      atk: { sword: { luck: 50, aspd: 20, dmg: 30 },
             bow: { luck: 0, aspd: 0, dmg: 0 },
             staff: { luck: 0, aspd: 0, dmg: 0 } },
      pool: 0, poolBy: { sword: 0, bow: 0, staff: 0 }, ms: 0, ppl: 3,
    },
  };
  setProg3Enabled(true);
  setProg3XEnabled(true);
  setProg3SharedEnabled(true);
  // By hand, the prog3x math: base = (6.67 + 40×1.5 + 30×0.5) × 2.0,
  /* v2.3.2210: the 0.01 in each crit term below is the flat base every
     character now starts with (PROG3.ATK.luck.base).  Written as a LITERAL
     rather than imported on purpose -- importing the constant would make
     these fixtures agree with the production formula by construction, which
     is the one thing a fixture must not do.  If the base is ever retuned,
     these three lines are supposed to fail and be changed deliberately. */
  // period 600 × (1 − 20×0.0035), crit EV = 1 + 0.16 × (2.0 − 1), no flat.
  /* v2.3.2670: this fixture is the LINEAR worker now (prog3shared, no
     prog3rel) — the math a worker without the curve still rolls, read off
     PROG3_LINEAR; the relative worker's fixture follows it. */
  setProg3RelEnabled(false);
  const baseX = (6.67 + 40 * PROG3.DMG_PER_LEVEL.sword + 30 * PROG3_LINEAR.dmg.per) * 2.0;
  const cdX = 600 * (1 - 20 * PROG3_LINEAR.aspd.per);
  const expMinX = Math.round(baseX * 0.75), expMaxX = Math.round(baseX * 1.25);
  /* v2.3.2212: crits are floored at 2x the top of the range (the anchor), so
     the fold is avg + chance x (critHit - avg), not a multiplier on avg.
     The 2 is a literal here for the same reason 0.01 is -- a fixture that
     imports the constant agrees with production by construction. */
  const avgX = (expMinX + expMaxX) / 2;
  const critHitX = Math.max(avgX * 2.0, expMaxX * 2);
  const expDpsX = (avgX + (0.01 + 50 * PROG3_LINEAR.luck.per) * (critHitX - avgX)) / (cdX / 1000);
  const rX = calcCombatDmgRange(p3rpg, SWORD);           /* v2.3.2520: raw half */
  const dX = calcDisplayDps(p3rpg, SWORD);
  check('prog3x fixture: range carries the dmg stat pre-tier',
    !!rX && rX.min === expMinX && rX.max === expMaxX && Math.abs(rX.cdMs - cdX) < 1e-9,
    { got: rX, expMinX, expMaxX, cdX });
  check('prog3x fixture: DPS folds LUCK\'s percent crit damage, no flat (v2.3.2592)',
    Math.abs(dX - expDpsX / DISPLAY_SCALE_K) < 1e-9, { got: dX, exp: expDpsX / DISPLAY_SCALE_K });

  /* ═══ v2.3.2670: the RELATIVE worker (caps.prog3rel) ═══
     Same character, same points, the curve.  By hand, with LITERALS for the
     same reason as above (a fixture that imports the constants agrees with
     production by construction):
       Power   × (1 + 1.0 × 30/(30+7))           — a multiplier, pre-tier
       Speed   period × (1 − 0.39 × 20/(20+10))
       Luck    chance 0.01 + 0.60 × 50/(50+7), multiplier 1.5 + 2.0 × 50/57
     A readout has no monster in hand, so the edge is 1. */
  setProg3RelEnabled(true);
  const baseR = (6.67 + 40 * 1.5) * (1 + 30 / 37) * 2.0;
  const cdR = 600 * (1 - 0.39 * 20 / 30);
  const expMinR = Math.round(baseR * 0.75), expMaxR = Math.round(baseR * 1.25);
  const avgR = (expMinR + expMaxR) / 2;
  const critHitR = Math.max(avgR * (1.5 + 2.0 * 50 / 57), expMaxR * 2);
  const expDpsR = (avgR + (0.01 + 0.60 * 50 / 57) * (critHitR - avgR)) / (cdR / 1000);
  const rR = calcCombatDmgRange(p3rpg, SWORD);
  const dR = calcDisplayDps(p3rpg, SWORD);
  check('relative worker: Power multiplies the pre-tier sum and Speed reads the curve',
    !!rR && rR.min === expMinR && rR.max === expMaxR && Math.abs(rR.cdMs - cdR) < 1e-9,
    { got: rR, expMinR, expMaxR, cdR });
  check('relative worker: DPS folds Luck on the curve (both halves)',
    Math.abs(dR - expDpsR / DISPLAY_SCALE_K) < 1e-9, { got: dR, exp: expDpsR / DISPLAY_SCALE_K });
  check('relative worker: 30 Power reads more than the linear worker\'s +15 flat did',
    rR.max > rX.max, { rel: rR.max, linear: rX.max });
  setProg3RelEnabled(false);

  // The same character against an OLD worker (prog3x off, no shared grid):
  // that worker's blob carries the retired crit/critDmg pair, the dmg stat
  // is not in its roll and its crits pay 1.5× + flat 2/pt — the readout
  // must predict THAT (rule 19).
  setProg3XEnabled(false);
  setProg3SharedEnabled(false);
  const p3legacy = JSON.parse(JSON.stringify(p3rpg));
  p3legacy.prog3.atk.sword = { crit: 50, critDmg: 60, aspd: 20, dmg: 30 };
  const baseL = (6.67 + 40 * PROG3.DMG_PER_LEVEL.sword) * 2.0;
  const expMinL = Math.round(baseL * 0.75), expMaxL = Math.round(baseL * 1.25);
  const avgL = (expMinL + expMaxL) / 2;
  const critHitL = Math.max(avgL * 1.5, expMaxL * 2) + 60 * 2;   /* flat rides ON TOP of the anchor */
  const expDpsL = (avgL + (0.01 + 50 * PROG3_LEGACY_ATK.crit.per) * (critHitL - avgL)) / (cdX / 1000);
  const rL = calcCombatDmgRange(p3legacy, SWORD);           /* v2.3.2520: raw half */
  const dL = calcDisplayDps(p3legacy, SWORD);
  check('old-worker fallback: dmg stat leaves the range',
    !!rL && rL.min === expMinL && rL.max === expMaxL, { got: rL, expMinL, expMaxL });
  check('old-worker fallback: DPS predicts the retired crit pair and the flat +2 crit math',
    Math.abs(dL - expDpsL / DISPLAY_SCALE_K) < 1e-9, { got: dL, exp: expDpsL / DISPLAY_SCALE_K });
  setProg3Enabled(false);
}

// ── 12. v2.3.2520: THE DISPLAY DAMAGE SCALE (§5.8 D1) ──
// Display-only rescaling of every player-facing combat number.  Three
// properties make it safe, and all three are pinned here rather than
// trusted:
//
//  (a) k = 1 RESTORES TODAY'S NUMBERS EXACTLY.  This is the entire safety
//      argument for shipping a lens over the numbers instead of re-basing
//      the combat math, and it is the first thing that would quietly stop
//      being true if someone "simplified" a helper.
//  (b) THE RAW MATH IS UNTOUCHED.  calcCombatDmgRange must stay in server
//      units: monsterCombat.js reads its `max` as the crit ANCHOR mirroring
//      combat.js _critAnchor, so a scaled anchor would make the client
//      predict a crit k times smaller than the one the worker pays — the
//      prediction/authority divergence class of bug.
//  (c) THE CONSISTENCY RULE.  A non-kill popup reports the change in
//      DISPLAYED hp, so successive hits add up to the bar the player is
//      watching; the killing blow reports the roll instead, because the bar
//      goes to zero however hard it landed.
{
  const k = DISPLAY_SCALE_K;
  check('scale: k is a positive integer', Number.isInteger(k) && k > 0, k);

  /* (a) The k = 1 restore property.  Both helpers are written as
     round(n/k) / ceil(n/k), so at k = 1 they are the identity on every
     non-negative integer and the consistency rule collapses to
     before − after.  Checked as arithmetic (k is a module constant and
     cannot be reassigned from here) over the numbers that actually occur. */
  const SAMPLES = [0, 1, 2, 3, 4, 5, 7, 8, 12, 58, 100, 999, 12345];
  check('scale: at k = 1 round(n/k) is the identity on every integer',
    SAMPLES.every((n) => (n <= 0 ? 0 : Math.max(1, Math.round(n / 1))) === n));
  check('scale: at k = 1 ceil(n/k) is the identity on every integer',
    SAMPLES.every((n) => (n <= 0 ? 0 : Math.ceil(n / 1)) === n));
  check('scale: at k = 1 the consistency rule is plain before - after',
    [[58, 50], [12, 11], [100, 1], [5, 4]].every(
      ([b, a]) => (Math.ceil(b / 1) - Math.ceil(a / 1)) === b - a));

  // toDisplayDamage — round, floored at 1 for any real damage.
  check('toDisplayDamage: rounds to nearest',
    toDisplayDamage(5 * k) === 5 && toDisplayDamage(10 * k) === 10,
    { a: toDisplayDamage(5 * k), b: toDisplayDamage(10 * k) });
  check('toDisplayDamage: any real damage reads at least 1 (never a "-0" popup)',
    toDisplayDamage(1) >= 1 && toDisplayDamage(0.4) >= 1, toDisplayDamage(1));
  check('toDisplayDamage: nothing, zero and negatives read 0',
    toDisplayDamage(0) === 0 && toDisplayDamage(-7) === 0
      && toDisplayDamage(undefined) === 0 && toDisplayDamage(null) === 0);

  // toDisplayHp — CEIL, because a monster on its last point of HP is alive.
  check('toDisplayHp: one point of HP never displays as 0', toDisplayHp(1) === 1, toDisplayHp(1));
  check('toDisplayHp: an empty pool displays 0', toDisplayHp(0) === 0 && toDisplayHp(-3) === 0);
  check('toDisplayHp: is ceil(n/k)',
    toDisplayHp(k) === 1 && toDisplayHp(k + 1) === 2 && toDisplayHp(2 * k) === 2,
    { a: toDisplayHp(k), b: toDisplayHp(k + 1) });

  // (b) raw stays raw; displayed is raw through the scale.
  {
    const rpg = makeRpg();
    const rawR = calcCombatDmgRange(rpg, SWORD);
    const dispR = calcDisplayDmgRange(rpg, SWORD);
    check('raw range is NOT scaled (monsterCombat reads it as the crit anchor)',
      rawR.min === dispR.rawMin && rawR.max === dispR.rawMax, { rawR, dispR });
    check('displayed range is the raw range through the scale',
      dispR.min === toDisplayDamage(rawR.min) && dispR.max === toDisplayDamage(rawR.max),
      { rawR, dispR });
    check('for k > 1 the displayed range is strictly smaller than the raw one',
      k === 1 || dispR.max < rawR.max, { k, disp: dispR.max, raw: rawR.max });
    /* The exact raw-DPS-over-k equality is pinned by the §5 fixture against
       hand math; here we only pin that DPS survived the scale as a live,
       finite number in the displayed range's own order of magnitude. */
    const dpsD = calcDisplayDps(rpg, SWORD);
    check('displayed DPS is finite, positive, and in the displayed range\'s scale',
      Number.isFinite(dpsD) && dpsD > 0 && dpsD >= dispR.min / (dispR.cdMs / 1000),
      { dpsD, min: dispR.min, cdMs: dispR.cdMs });
  }

  // (c) the consistency rule, as the owner settled it in v2.3.2525.
  {
    /* THE RULE CHANGED, AND THIS SECTION CHANGED WITH IT.  Until v2.3.2525 a
       non-kill popup was exactly the displayed-hp delta, so successive hits
       summed to the drop in the bar and a hit that did not move a whole
       displayed point read "0".  The owner chose the other side of that
       trade -- "damage rendered during combat to be at least 1 damage" --
       so the floor now wins and the sum is an UPPER bound on the bar drop
       rather than an equality.  Both halves are pinned so neither can drift
       back silently.

       What survives: every hit still tracks the bar (a big hit reads big),
       and the k = 1 identity above is untouched, because at k = 1 every
       landed hit already moved the bar by at least one point. */
    const after = [40, 37, 31, 20, 9];          // hp after each hit, starting at 58
    let hp = 58, sum = 0, zeros = 0;
    for (const a of after) {
      const shown = toDisplayHitDamage(hp, a);
      if (shown === 0) zeros++;
      sum += shown; hp = a;
    }
    const barDrop = toDisplayHp(58) - toDisplayHp(9);
    check('consistency: no landed hit in a whole fight reads 0', zeros === 0, { zeros });
    check('consistency: the hits still track the bar (sum >= drop, and not by much)',
      sum >= barDrop && sum <= barDrop + after.length,
      { sum, barDrop, hits: after.length });
    check('consistency: a hit bigger than k is still the DISPLAYED-hp delta',
      toDisplayHitDamage(58, 40) === toDisplayHp(58) - toDisplayHp(40),
      toDisplayHitDamage(58, 40));
    /* The owner's case, measured: root/venom at 3-4 damage a tick used to
       print "-0" for roughly two ticks in five on a low-level character. */
    check('consistency: a small tick that moves no whole point still reads 1',
      toDisplayHitDamage(40, 37) === 1, toDisplayHitDamage(40, 37));
    check('consistency: a hit that took NO hp still reads 0 (no phantom damage)',
      toDisplayHitDamage(40, 40) === 0, toDisplayHitDamage(40, 40));

    /* The killing blow reports the ROLL, off the pre-overkill-clamp rawDmg
       the worker sends — otherwise the last hit of every fight prints the
       sliver of HP that was left instead of the blow that ended it. */
    check('consistency: a kill reports round(rawDmg/k), not the sliver it clamped to',
      toDisplayHitDamage(2, 0, 40 * k) === 40, toDisplayHitDamage(2, 0, 40 * k));
    check('consistency: a kill with no rawDmg falls back to the credited damage (rule 19)',
      toDisplayHitDamage(2 * k, 0) === toDisplayDamage(2 * k), toDisplayHitDamage(2 * k, 0));
    check('consistency: a kill never reads 0', toDisplayHitDamage(1, 0, 1) >= 1);
  }
}

console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL PASS');
process.exit(failures ? 1 : 0);
