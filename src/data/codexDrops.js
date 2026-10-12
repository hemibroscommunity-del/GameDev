/* ═══ v2.3.3189: WHAT EACH MONSTER CAN DROP -- THE CODEX'S DROP TABLES ═══
 *
 * Owner, 2026-10-12: "Also include drop tables for all items that monster can
 * drop."
 *
 * A kill pays out in two places on the worker, and this is both of them, as
 * the codex page shows them (src/ui/mobile/dash/MonsterCodex.jsx):
 *
 *   THE PILE (index.js _spawnLootForKill), picked up off the ground:
 *     gold          the monster's own (_makeZoneMonster), split by the damage
 *                   each player did -- 5% of it to get any (GDD §7);
 *     its remnants  every kill, from the kinds that have them
 *                   (_isRemnantSkullArch / _invKeyForSkull);
 *     its shard     SHARD_MONSTER_DROP, its land's (wheelzone.js _rewardZone);
 *     a rare gem    RARE_GEM_MONSTER_DROP;
 *                   (those three are one lane: whoever picks the pile up first)
 *     iron torso, iron greaves   MONSTER_ARMOR_DROPS, each on its own roll;
 *     a weapon      MONSTER_IRON_WEAPON_DROP (the iron great sword, which wins
 *                   the pile's one weapon place), else a random one on the
 *                   monster's level (monsterWeaponDropOdds);
 *     every weapon and armour piece rolls its grade as it drops
 *     (hardening.js WEAPON_QUALITY_ODDS).
 *   THE KILLING BLOW (combat.js, the killer only, straight into the bag):
 *     a raw gem     GEM_RAW_MONSTER_DROP, of its land's element -- only the
 *                   elements the Gem Cutter takes (AMULET_GEMS: no Flora);
 *     a gold nugget GOLD_NUGGET_MONSTER_DROP.
 *
 * EVERY NUMBER IS THE WORKER'S.  The two the client already mirrored are read
 * from items.js (GOLD_NUGGET_DROP, GEM_DROP_RATES); the rest are copied here,
 * and mirror-audit pins every one -- the rates, the grade odds, the weapon
 * curve at every level, the gold at every level the Wheel's monsters stand
 * at, each kind's remnant and whether its element gives a gem -- against the
 * worker's own code.  The roll stays the worker's; this only says what it
 * is.  A rate changed there and not here fails the audit.
 *
 * No game imports beyond plain data tables: the worker's mirror audit reads
 * this file too. */
import { GOLD_NUGGET_DROP, GEM_DROP_RATES, ZONE_RESOURCES } from './items.js';
import { ZONE_SHARDS } from './shards.js';
import { WHEEL_LAND_LEVELS } from './wheelSignposts.js';
import { CODEX_ENTRIES } from './monsterCodex.js';

const has = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

/* the pile's flat rates (server/src/data.js) */
export const CODEX_DROP_RATES = Object.freeze({
  shard: 0.10,              /* SHARD_MONSTER_DROP */
  rareGem: 1 / 200,         /* RARE_GEM_MONSTER_DROP */
  ironTorso: 1 / 500,       /* MONSTER_ARMOR_DROPS, slot 'armor' */
  ironGreaves: 1 / 500,     /* MONSTER_ARMOR_DROPS, slot 'legsArmor' */
  ironGreatsword: 1 / 500,  /* MONSTER_IRON_WEAPON_DROP */
});

/* the grade a dropped weapon or armour piece rolls (hardening.js
   WEAPON_QUALITY_ODDS); what is left over is a plain one */
export const CODEX_GRADE_ODDS = Object.freeze({ rare: 0.09, elite: 0.009, godly: 1 / 2000000 });

/* the elements whose raw gem a kill can give (server data.js AMULET_GEMS --
   the Gem Cutter's nine; Flora is not one of them) */
export const CODEX_RAW_GEM_ELEMENTS = Object.freeze(['flame', 'frost', 'water', 'venom', 'storm', 'stone', 'wind', 'dark', 'light']);

/* each kind's remnants -- the bag item a kill always leaves (index.js
   _invKeyForSkull); the rock monster, the fishman and the bog lurker leave
   none */
export const CODEX_REMNANTS = Object.freeze({
  snowling: 'snowman',
  gobling: 'fire-goblin-remnants',
  mumling: 'skeleton-remnants',
  sparklet: 'slime-remnants',
  wisplet: 'slime-remnants',
  dewdrop: 'slime-remnants',
});

/** A random weapon off a kill at `level` (server data.js
 *  monsterWeaponDropOdds): the chance it drops, and given one, the chances it
 *  is prismatic, a fusion of two elements, or of its land's element. */
export function codexWeaponOdds(level) {
  const lvl = Math.max(1, Number(level) || 1);
  const f = Math.pow(lvl / 100, 3);
  return {
    drop: 0.0005 + f * 0.03,
    shift: 0.0000002 + f * 0.002,
    fusion: 0.000002 + f * 0.02,
    elemental: 0.0002 + f * 0.25,
  };
}

/** The gold a monster of `level` carries (index.js _makeZoneMonster:
 *  _monsterStat(5, level, 1.035, 1.020, 1.015)). */
export function codexGoldAt(level) {
  const lvl = Math.max(1, Math.round(Number(level) || 1));
  if (lvl <= 30) return Math.ceil(Math.ceil(5 * Math.pow(1.035, lvl - 1)));
  const at30 = Math.ceil(5 * Math.pow(1.035, 29));
  if (lvl <= 65) return Math.ceil(Math.ceil(at30 * Math.pow(1.020, lvl - 30)));
  const at65 = Math.ceil(at30 * Math.pow(1.020, 35));
  return Math.ceil(Math.ceil(at65 * Math.pow(1.015, lvl - 65)));
}

/* the pictures, at the addresses the bag and the loot piles load them from
   (InventoryPanel ITEMS_V, lootIcons.js ICON_V), so an open page is a cache
   hit for anything you have seen drop */
const IV = '?v=2.3.1774';
const ICON = Object.freeze({
  gold: '/icons/ui/cur-gold.webp',
  nugget: '/icons/ui/cur-nugget.webp',
  gem: '/icons/ui/cur-gem.webp' + IV,
  ironTorso: '/icons/items/chest-plate-iron.webp' + IV,
  ironGreaves: '/icons/items/greaves-iron.webp' + IV,
  ironGreatsword: '/icons/items/great-sword-iron.webp' + IV,
  weapon: '/icons/items/sword.webp' + IV,
  'snowman': '/icons/items/remnants-snowman.webp' + IV,
  'fire-goblin-remnants': '/icons/items/remnants-fire-goblin.webp' + IV,
  'skeleton-remnants': '/icons/items/remnants-skeleton.webp' + IV,
  'slime-remnants': '/icons/items/remnants-slime.webp' + IV,
});
/* the quests' own names for them ("Bring 4 Snowman Remnants from Frost
   Ridge") -- the bag's key for the snowman's is just 'snowman' */
const REMNANT_NAMES = Object.freeze({
  'snowman': 'Snowman Remnants',
  'fire-goblin-remnants': 'Fire Goblin Remnants',
  'skeleton-remnants': 'Skeleton Remnants',
  'slime-remnants': 'Slime Remnants',
});

/** "1 in 10", "1 in 200", "1 in 2,000" -- two figures past twenty, so a rate
 *  reads as the game's own round number (1/0.0024 is "1 in 410"). */
export function codexOneIn(p) {
  if (!(p > 0)) return '—';
  if (p >= 1) return 'Every kill';
  const n = 1 / p;
  let r;
  if (n < 20) r = Math.round(n);
  else {
    const mag = Math.pow(10, Math.floor(Math.log10(n)) - 1);
    r = Math.round(n / mag) * mag;
  }
  return '1 in ' + r.toLocaleString('en-US');
}

/** "10%", "0.5%", "0.01%" */
export function codexPercent(p) {
  if (!(p > 0)) return '0%';
  const v = p * 100;
  const s = v >= 10 ? v.toFixed(0) : v >= 1 ? v.toFixed(1) : v >= 0.1 ? v.toFixed(2) : v.toFixed(3);
  /* trailing zeros after the point only: "10%", never "1%" */
  return (s.indexOf('.') >= 0 ? s.replace(/\.?0+$/, '') : s) + '%';
}

/** Every row of `kind`'s drop table, most often first:
 *  [{ id, key, name, icon, chance, chanceTop?, odds, sub, note, who, graded, color }]
 *    chance    the chance a kill drops it (1: every kill); for the weapon, at
 *              the lowest level its monsters stand at, `chanceTop` at the
 *              highest
 *    odds/sub  what the page prints: "1 in 200" over "0.5%"
 *    who       'pile' (picked up), 'killer' (the killing blow, into the bag)
 *    graded    rolls a grade as it drops
 *  or null for a kind with no page. */
export function codexDropsFor(kind) {
  const e = has(CODEX_ENTRIES, kind) ? CODEX_ENTRIES[kind] : null;
  if (!e) return null;
  const lo = WHEEL_LAND_LEVELS[0], hi = WHEEL_LAND_LEVELS[1];
  const rows = [];
  const g0 = codexGoldAt(lo), g1 = codexGoldAt(hi);
  rows.push({ id: 'gold', key: 'coins', name: 'Gold', icon: ICON.gold, chance: 1,
    odds: g0 === g1 ? String(g0) : g0 + '–' + g1, sub: 'every kill', who: 'pile',
    note: 'More the higher its level (Lv ' + lo + ' → Lv ' + hi + '). A party splits it by the damage each did.' });
  const rem = has(CODEX_REMNANTS, kind) ? CODEX_REMNANTS[kind] : null;
  if (rem) {
    rows.push({ id: 'remnant', key: rem, name: REMNANT_NAMES[rem] || rem, icon: ICON[rem], chance: 1,
      odds: 'Every kill', sub: '', who: 'pile', note: 'For quests, and Diego buys them.' });
  }
  const shard = has(ZONE_SHARDS, e.home) ? ZONE_SHARDS[e.home] : null;
  if (shard) {
    rows.push({ id: 'shard', key: shard.key, name: shard.label, icon: '/icons/items/' + shard.key + '.webp' + IV,
      chance: CODEX_DROP_RATES.shard, who: 'pile', color: shard.color });
  }
  if (CODEX_RAW_GEM_ELEMENTS.includes(e.element) && has(ZONE_RESOURCES, e.element)) {
    const zr = ZONE_RESOURCES[e.element];
    rows.push({ id: 'rawgem', key: 'raw_' + e.element, name: 'Raw ' + zr.gem, icon: ICON.gem,
      chance: GEM_DROP_RATES.monsterKill, who: 'killer', color: zr.gemColor,
      note: 'To whoever lands the killing blow. The Gem Cutter polishes it.' });
  }
  rows.push({ id: 'raregem', key: 'rare_gem', name: 'Rare Gem', icon: ICON.gem, chance: CODEX_DROP_RATES.rareGem, who: 'pile' });
  rows.push({ id: 'irontorso', key: 'iron_torso', name: 'Iron Torso', icon: ICON.ironTorso, chance: CODEX_DROP_RATES.ironTorso, who: 'pile', graded: true });
  rows.push({ id: 'irongreaves', key: 'iron_greaves', name: 'Iron Greaves', icon: ICON.ironGreaves, chance: CODEX_DROP_RATES.ironGreaves, who: 'pile', graded: true });
  rows.push({ id: 'irongreatsword', key: 'iron_greatsword', name: 'Iron Great Sword', icon: ICON.ironGreatsword, chance: CODEX_DROP_RATES.ironGreatsword, who: 'pile', graded: true });
  const w0 = codexWeaponOdds(lo), w1 = codexWeaponOdds(hi);
  const elName = e.element.charAt(0).toUpperCase() + e.element.slice(1);
  rows.push({ id: 'weapon', key: 'weapon', name: 'A random weapon', icon: ICON.weapon, chance: w0.drop, chanceTop: w1.drop,
    odds: codexOneIn(w0.drop), sub: 'Lv ' + hi + ': ' + codexOneIn(w1.drop), who: 'pile', graded: true,
    note: 'A sword, great sword, bow or staff, likelier the higher its level. At Lv ' + hi
      + ' about ' + codexOneIn(w1.elemental) + ' of them is a ' + elName + ' weapon.' });
  rows.push({ id: 'nugget', key: 'goldNuggets', name: 'Gold Nugget', icon: ICON.nugget, chance: GOLD_NUGGET_DROP.monsterKill, who: 'killer',
    note: 'To whoever lands the killing blow. Five make a gold bar for an amulet.' });
  for (const r of rows) {
    if (!r.odds) r.odds = codexOneIn(r.chance);
    if (r.sub == null) r.sub = codexPercent(r.chance);
  }
  return rows;
}
