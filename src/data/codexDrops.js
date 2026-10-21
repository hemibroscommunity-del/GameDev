/* ═══ v2.3.3209: WHAT EACH MONSTER CAN DROP -- THE CODEX'S DROP TABLES ═══
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
 *     a weapon      MONSTER_IRON_WEAPON_DROP, the iron great sword -- the only
 *                   weapon a kill drops since v2.3.3209 took the random one
 *                   out of the game (the owner: "Remove it from the game");
 *     every weapon and armour piece rolls its grade as it drops
 *     (hardening.js WEAPON_QUALITY_ODDS).
 *   THE KILLING BLOW (combat.js, the killer only, straight into the bag):
 *     a raw gem     GEM_RAW_MONSTER_DROP, of its land's element -- only the
 *                   elements the Gem Cutter takes (AMULET_GEMS: no Flora);
 *     a gold nugget GOLD_NUGGET_MONSTER_DROP.
 *
 * EVERY NUMBER IS THE WORKER'S.  The two the client already mirrored are read
 * from items.js (GOLD_NUGGET_DROP, GEM_DROP_RATES); the rest are copied here,
 * and mirror-audit pins every one -- the rates, the grade odds, the gold at
 * every level the Wheel's monsters stand at, each kind's remnant and whether
 * its element gives a gem -- against the worker's own code.  The roll stays
 * the worker's; this only says what it is.  A rate changed there and not
 * here fails the audit.
 *
 * v2.3.3209: EVERY CHANCE IS ONE NUMBER, AND EACH HAS ITS DICE.  The owner:
 * "All drop chances should be a single value" (the random weapon's
 * 0.05–0.24% went with it), and "a 'roll-based system' where you see dice
 * and number ... The rarest drop in the table is the lowest number beginning
 * at 1" -- asked how, since the worker rolls each drop on its own: "Each
 * drop's own roll".  So a drop under every kill shows the number it drops on
 * or under when a kill rolls 1 to CODEX_ROLL_SIDES for it (`codexRoll`): the
 * gold nugget's 1, an iron piece's 20, the rare gem's 50, a raw gem's 500, a
 * shard's 1,000.  That IS the worker's roll (Math.random() < chance), said
 * on a 10,000-sided die; mirror-audit holds every chance to a whole number
 * of its sides, so no number here is rounded.  The page shows it as the
 * owner then asked, a ROLL column: the range 1 to it ("1–1,000") over the
 * chance in parentheses (MonsterCodex.jsx `rollRange`).
 *
 * v2.3.3209: AND THE NUMBERS NEVER OVERLAP.  The owner: "Shouldn't these
 * numbers not overlap each other? Getting a roll of 1 implies you'd get all
 * the loot with 1, but it's really just the gold nugget. I think these should
 * be number ranges. That way a player hunting for something can also be
 * looking for a roll number within that range".  So the worker rolls ONCE a
 * kill (server/src/killroll.js), and each drop owns its own run of the 10,000
 * numbers, the rarest from 1: a row's `from`-`to` (`codexRollLayout`, the
 * worker's killRollLayout, which mirror-audit holds this to for every kind).
 * Against a worker that does not advertise it (an old one, or `killroll:
 * false`), each drop still rolls on its own, and the rows say so: 1 to each
 * drop's own number, as before (`shared: false`).
 *
 * No game imports beyond plain data tables: the worker's mirror audit reads
 * this file too. */
import { GOLD_NUGGET_DROP, GEM_DROP_RATES, ZONE_RESOURCES } from './items.js';
import { REMAINS_NAMES } from './remains.js';   /* v2.3.3525: "remains", not "remnants" */
import { ZONE_SHARDS, SHARD_GEM_ELEMENT } from './shards.js';   /* v2.3.3516: + the lands whose shards hold a gem */
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

/* the die a kill rolls for each drop, as the page says it: 1 to 10,000 --
   the rarest drop's 1 in 10,000 (the gold nugget) is one face */
export const CODEX_ROLL_SIDES = 10000;

/** How many of the CODEX_ROLL_SIDES numbers a drop of chance `p` owns: 0.1 ->
 *  1000, 1/500 -> 20, 0.0001 -> 1.  Null for a drop every kill has (nothing to
 *  roll) or none at all. */
export function codexRoll(p) {
  if (!(p > 0) || p >= 1) return null;
  return Math.max(1, Math.round(p * CODEX_ROLL_SIDES));
}

/* v2.3.3209: the order a kill's one roll lays its drops in, from 1 up -- the
   rarest first, the three 1-in-500s the reverse of the rows below so the
   table reads straight down (server/src/killroll.js KILL_ROLL.ORDER) */
export const CODEX_ROLL_ORDER = Object.freeze(['nugget', 'irongreatsword', 'irongreaves', 'irontorso', 'raregem', 'rawgem', 'shard']);

/** A kind's numbers under the one roll: [{ id, from, to }], from 1 up, none
 *  overlapping, of the drops in `chances` ({ rowId: chance }) -- the worker's
 *  killRollLayout, laid from the same chances. */
export function codexRollLayout(chances) {
  const out = [];
  let at = 1;
  for (const id of CODEX_ROLL_ORDER) {
    const n = has(chances, id) ? codexRoll(chances[id]) : null;
    if (!n) continue;
    out.push({ id, from: at, to: at + n - 1 });
    at += n;
  }
  return out;
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
  'snowman': '/icons/items/remnants-snowman.webp' + IV,
  'fire-goblin-remnants': '/icons/items/remnants-fire-goblin.webp' + IV,
  'skeleton-remnants': '/icons/items/remnants-skeleton.webp' + IV,
  'slime-remnants': '/icons/items/remnants-slime.webp' + IV,
});
/* the quests' own names for them ("Bring 4 Snowman Remains from Frost
   Ridge") -- the bag's key for the snowman's is just 'snowman'.
   v2.3.3525: "Remains", one table for the whole game (data/remains.js) */
const REMNANT_NAMES = REMAINS_NAMES;
const REMNANT_DESC = Object.freeze({
  'snowman': 'Coal, a carrot and some very cold snow: all that is left of a snowman.',
  'fire-goblin-remnants': 'A goblin\'s last embers, still warm, and the smell of singed hair.',
  'skeleton-remnants': 'Old bones and older bandages from the Buried City.',
  'slime-remnants': 'A puddle of slime that has finally given up.',
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

/** A grade's share, as the rarity tiles print it: "90.09995%", "9%", "0.9%",
 *  "0.00005%" -- every digit the roll has, as the owner's mockup does. */
export function codexGradePercent(p) {
  if (!(p > 0)) return '0%';
  return (p * 100).toFixed(5).replace(/\.?0+$/, '') + '%';
}

/** The four grades a dropped piece can roll, in order, with their shares:
 *  [{ q: 'normal'|'rare'|'elite'|'godly', p }] -- normal is what is left. */
export function codexGrades() {
  const g = CODEX_GRADE_ODDS;
  return [
    { q: 'normal', p: 1 - g.rare - g.elite - g.godly },
    { q: 'rare', p: g.rare },
    { q: 'elite', p: g.elite },
    { q: 'godly', p: g.godly },
  ];
}

const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1);
const PARTY_PILE = 'In a party, only players who did at least 5% of its damage can loot the pile, and the first of them to pick it up takes this.';

/** Every row of `kind`'s drop table, most often first -- what the page's
 *  Drops tab lists and what a tap on a row opens (the owner's mockup):
 *  [{ id, key, name, icon, type, chance, pct, oneIn, from, to, amount?,
 *     who, graded, tier?, color?, desc, chanceNote, info: [lines] }]
 *    type        the TYPE column: Currency, Material, Gem, Armor, Weapon, Craft
 *    chance      the chance a kill drops it (1: every kill), one number at
 *                every level (v2.3.3209)
 *    pct/oneIn   "10%" / "1 in 10"
 *    from, to    its dice: the numbers of a kill's roll of 1 to
 *                CODEX_ROLL_SIDES that drop it -- its own run of them under the
 *                one roll (v2.3.3209), else 1 to its own number; null for an
 *                every-kill drop
 *    who         'pile' (picked up), 'killer' (the killing blow, into the bag)
 *    graded      rolls a grade as it drops (the card's POSSIBLE RARITY)
 *    tier        a weapon or armour piece's base rarity: 'common'
 *  or null for a kind with no page.
 *  `opts.shared` (default true): the worker rolls once a kill (caps.killroll);
 *  false, each drop on its own roll (an older worker, or `killroll: false`).
 *  `opts.crack` (v2.3.3516): the worker cracks shards for raw gems
 *  (caps.shardcrack, the gem plan's decision 1) -- no raw gem off a kill, so
 *  no raw gem row, and the shard's numbers move down to where its began; the
 *  shard and the Rare Gem say what the Gem Works makes of them. */
export function codexDropsFor(kind, opts) {
  const shared = !(opts && opts.shared === false);
  const crack = !!(opts && opts.crack);
  const e = has(CODEX_ENTRIES, kind) ? CODEX_ENTRIES[kind] : null;
  if (!e) return null;
  const lo = WHEEL_LAND_LEVELS[0], hi = WHEEL_LAND_LEVELS[1];
  const land = e.home;
  const rows = [];
  const g0 = codexGoldAt(lo), g1 = codexGoldAt(hi);
  const amount = g0 === g1 ? String(g0) : g0 + '–' + g1;
  rows.push({ id: 'gold', key: 'coins', name: 'Gold', icon: ICON.gold, type: 'Currency', chance: 1, amount, who: 'pile',
    /* v2.3.3552: "world", never "Wheel" -- the owner: "no player has a concept
       of what 'wheel' means in reference to the shape of the map" */
    desc: 'The world\'s money: every shop, bench and auction in BroTown takes it.',
    chanceNote: amount + ' gold every kill, more the higher its level',
    info: ['Every kill drops ' + g0 + ' to ' + g1 + ' gold: ' + g0 + ' at Lv ' + lo + ', ' + g1 + ' at Lv ' + hi + '.',
      'In a party it is shared by everyone who did at least 5% of its damage, split by the damage each did.'] });
  const rem = has(CODEX_REMNANTS, kind) ? CODEX_REMNANTS[kind] : null;
  if (rem) {
    rows.push({ id: 'remnant', key: rem, name: REMNANT_NAMES[rem] || rem, icon: ICON[rem], type: 'Material', chance: 1, who: 'pile',
      desc: REMNANT_DESC[rem] || 'What is left of it.',
      chanceNote: 'one every kill',
      info: ['Every kill drops one.', 'Quests ask for them, and Diego buys them.', PARTY_PILE] });
  }
  const shard = has(ZONE_SHARDS, land) ? ZONE_SHARDS[land] : null;
  if (shard) {
    rows.push({ id: 'shard', key: shard.key, name: shard.label, icon: '/icons/items/' + shard.key + '.webp' + IV, type: 'Material',
      chance: CODEX_DROP_RATES.shard, who: 'pile', color: shard.color,
      desc: crack && has(SHARD_GEM_ELEMENT, land)
        ? 'A splinter of its land\'s own element. Crack it at the Gem Works: some hold a raw ' + ZONE_SHARDS[land].label.replace(/ Shard$/, '') + ' gem. Diego pays well for one too.'
        : 'A splinter of its land\'s own element, cold or hot or humming to the touch. Diego pays well for one.',
      info: ['About ' + codexOneIn(CODEX_DROP_RATES.shard).toLowerCase() + ' kills drops one.',
        ...(crack && has(SHARD_GEM_ELEMENT, land) ? ['At the Gem Works, 1 in 10 holds a raw gem (more as your Gem Cutting grows). Three raw gems make one elemental gem.'] : []),
        PARTY_PILE] });
  }
  if (!crack && CODEX_RAW_GEM_ELEMENTS.includes(e.element) && has(ZONE_RESOURCES, e.element)) {
    const zr = ZONE_RESOURCES[e.element];
    /* v2.3.3516: its key the bag's (gems are bag items, data/gems.js) */
    rows.push({ id: 'rawgem', key: 'gem_raw_' + e.element, name: 'Raw ' + zr.gem, icon: ICON.gem, type: 'Gem',
      chance: GEM_DROP_RATES.monsterKill, who: 'killer', color: zr.gemColor,
      desc: 'A rough ' + zr.gem + ', still in its stone. The Gem Cutter polishes it into a gem for an amulet or a shield.',
      info: ['About ' + codexOneIn(GEM_DROP_RATES.monsterKill).toLowerCase() + ' kills drops one.',
        'It goes to whoever lands the killing blow, straight into the bag.'] });
  }
  rows.push({ id: 'raregem', key: 'rare_gem', name: 'Rare Gem', icon: ICON.gem, type: 'Gem', chance: CODEX_DROP_RATES.rareGem, who: 'pile',
    desc: crack
      ? 'A bright stone, rare and pretty. The Gem Works cuts it into any of the eight elemental gems you choose.'
      : 'A bright stone, rare and pretty. Nothing is made from it yet: Diego buys it, and the season\'s rewards give a few.',
    info: ['About ' + codexOneIn(CODEX_DROP_RATES.rareGem).toLowerCase() + ' kills drops one.', PARTY_PILE] });
  const gear = (pct) => ['After it drops, a separate roll decides its grade (shown above).',
    'The grade makes it stronger and colours its name in your bag, but does not change the ' + pct + ' drop chance.'];
  rows.push({ id: 'irontorso', key: 'iron_torso', name: 'Iron Torso', icon: ICON.ironTorso, type: 'Armor', chance: CODEX_DROP_RATES.ironTorso,
    who: 'pile', graded: true, tier: 'common',
    desc: 'Iron chest armour, the step up from copper. The Blacksmith forges the same piece from four iron bars.',
    info: ['This drops at a ' + codexPercent(CODEX_DROP_RATES.ironTorso) + ' chance from ' + e.name + ', about ' + codexOneIn(CODEX_DROP_RATES.ironTorso).toLowerCase() + ' kills.',
      ...gear(codexPercent(CODEX_DROP_RATES.ironTorso)), PARTY_PILE] });
  rows.push({ id: 'irongreaves', key: 'iron_greaves', name: 'Iron Greaves', icon: ICON.ironGreaves, type: 'Armor', chance: CODEX_DROP_RATES.ironGreaves,
    who: 'pile', graded: true, tier: 'common',
    desc: 'Iron leg armour, the step up from copper. The Blacksmith forges the same pair from four iron bars.',
    info: ['This drops at a ' + codexPercent(CODEX_DROP_RATES.ironGreaves) + ' chance from ' + e.name + ', about ' + codexOneIn(CODEX_DROP_RATES.ironGreaves).toLowerCase() + ' kills'
      + (shared ? '.' : ', on its own roll: a kill can drop both iron pieces.'),
      ...gear(codexPercent(CODEX_DROP_RATES.ironGreaves)), PARTY_PILE] });
  rows.push({ id: 'irongreatsword', key: 'iron_greatsword', name: 'Iron Great Sword', icon: ICON.ironGreatsword, type: 'Weapon', chance: CODEX_DROP_RATES.ironGreatsword,
    who: 'pile', graded: true, tier: 'common',
    desc: 'A heavy two-handed iron blade, the same one the Blacksmith forges from four iron bars.',
    info: ['This drops at a ' + codexPercent(CODEX_DROP_RATES.ironGreatsword) + ' chance from ' + e.name + ', about ' + codexOneIn(CODEX_DROP_RATES.ironGreatsword).toLowerCase() + ' kills.',
      ...gear(codexPercent(CODEX_DROP_RATES.ironGreatsword)), PARTY_PILE] });
  rows.push({ id: 'nugget', key: 'goldNuggets', name: 'Gold Nugget', icon: ICON.nugget, type: 'Craft', chance: GOLD_NUGGET_DROP.monsterKill, who: 'killer',
    desc: 'A lump of gold the size of a thumb. Five smelt into a gold bar for the amulet forge.',
    info: ['About ' + codexOneIn(GOLD_NUGGET_DROP.monsterKill).toLowerCase() + ' kills drops one.',
      'It goes to whoever lands the killing blow, straight into the bag.'] });
  /* v2.3.3209: each drop's numbers -- its own run of the one roll's, or (an
     older worker) 1 to its own number */
  const chances = Object.create(null);
  for (const r of rows) if (r.chance < 1) chances[r.id] = r.chance;
  const lay = Object.create(null);
  if (shared) for (const l of codexRollLayout(chances)) lay[l.id] = l;
  for (const r of rows) {
    r.pct = codexPercent(r.chance);
    r.oneIn = codexOneIn(r.chance);
    const own = codexRoll(r.chance);
    r.from = own ? (shared ? (lay[r.id] ? lay[r.id].from : null) : 1) : null;
    r.to = own ? (shared ? (lay[r.id] ? lay[r.id].to : null) : own) : null;
    if (!r.chanceNote) r.chanceNote = r.chance >= 1 ? 'every kill' : 'about ' + r.oneIn.toLowerCase() + ' kills';
    if (shared && r.from) r.info.push('Each kill rolls once, 1 to ' + CODEX_ROLL_SIDES.toLocaleString('en-US') + ': ' + codexRollText(r.from, r.to)
      + ' ' + (r.from === r.to ? 'is its number' : 'are its numbers') + ', and no other drop shares them.');
  }
  return rows;
}

/** "612–1,611", "1": a drop's numbers as the page prints them; null for none. */
export function codexRollText(from, to) {
  if (!(from >= 1) || !(to >= from)) return null;
  const f = (n) => Number(n).toLocaleString('en-US');
  return from === to ? f(from) : f(from) + '–' + f(to);
}

/** Under the one roll (`shared`), the first number of it that drops nothing
 *  more -- the table's highest `to`, plus one; null otherwise. */
export function codexRollFreeFrom(rows, shared) {
  if (!shared) return null;
  let top = 0;
  for (const r of rows || []) if (r && r.to > top) top = r.to;
  return top > 0 && top < CODEX_ROLL_SIDES ? top + 1 : null;
}
