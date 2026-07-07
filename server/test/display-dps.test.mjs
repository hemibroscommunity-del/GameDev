/* Display DMG/DPS helper conformance (v2.3.1206).
 *
 * calcDisplayDmgRange/calcDisplayDps (src/data/gameSystems.js) are the
 * ONE display formula behind the dashboard loadout readout, the item
 * detail popup, and the inventory stash compare.  They were extracted
 * because three hand-rolled copies drifted: two of them read no
 * allocations, so spending crit-channel points moved combat (and the
 * dashboard) but not the other readouts — the reported bug.  This
 * suite pins the property that regressed: EVERY relevant input
 * (crit channel, crit-dmg channel, damage channel, quality, hardness)
 * must strictly move the number, plus an exact hand-computed fixture
 * and a rot-guard on the exports.
 *
 * Zero-dep plain-node import of the client module — the mirror-audit
 * and tick suites established that every client data module loads
 * under plain node (v2.3.1189+).  The authoritative per-hit roll stays
 * server/src/combat.js _computeAttackDamage; these helpers are its
 * expected-value mirror for UI only. */
import {
  calcDisplayDmgRange, calcDisplayDps,
  WEAPON_CHANNELS, WEAPON_CATEGORY, SWING_COOLDOWN,
} from '../../src/data/gameSystems.js';

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

// ── 5. Hand-computed fixture matches EXACTLY (the full formula:
// (effBase + stat×0.1667) × (1 + dmgPts×0.005) × tierMult, variance
// band, then avg/period × (1 + critChance×(critMult−1))) ──
{
  const cat = WEAPON_CATEGORY.sword;
  const rpg = makeRpg({ power: 100 });
  rpg.weaponSpecs[cat][chKey(cat, 'damage')] = 40;
  rpg.weaponSpecs[cat][chKey(cat, 'crit')] = 50;
  rpg.weaponSpecs[cat][chKey(cat, 'critDmg')] = 25;
  const wpn = { type: 'sword', tierMult: 2.0 }; // plain quality, hardness 0

  // By hand: sword base 6.67 (WEAPON_TYPES), no quality/hardness.
  const base = (6.67 + 100 * 0.1667) * (1 + 40 * 0.005) * 2.0;
  const expMin = Math.round(base * 0.75);           // melee band 0.75-1.25
  const expMax = Math.round(base * 1.25);
  const critChance = 40 * 100 / (100 + 200) / 100   // Power baseline
                   + Math.min(0.30, 50 * 0.003);    // + crit channel, cap 30%
  const critMult = 1.5 + 100 * 0.001 + 25 * 0.012;  // 1.9
  const expDps = (expMin + expMax) / 2 / (600 / 1000) * (1 + critChance * (critMult - 1));

  const r = calcDisplayDmgRange(rpg, wpn);
  check('fixture: damage range matches hand math exactly',
    !!r && r.min === expMin && r.max === expMax && r.text === expMin + '-' + expMax && r.cdMs === 600,
    { got: r, expMin, expMax });
  const d = calcDisplayDps(rpg, wpn);
  check('fixture: DPS matches hand math exactly',
    Math.abs(d - expDps) < 1e-9, { got: d, exp: expDps });
}

console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL PASS');
process.exit(failures ? 1 : 0);
