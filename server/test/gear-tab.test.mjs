/* ═══ v2.3.3995: THE GEAR TAB'S RULES (src/ui/mobile/dash/GearTab.jsx) ═══
 *
 *   1. itemCategory (itemCategory.js): EVERY item id the tables in src/data
 *      name -- the woods, fish and ores each tier drops, the cooked fish, the
 *      bars, the farm's seeds, crops and compost, the Cookhouse's dishes and
 *      bottles, the gems and shards, the essences, the hardened woods, the
 *      remains, the shop's and the bag's bottles, the gathering tools, the
 *      trap -- falls into a named kind of the filter menu, the one its row says
 *      (none falls through); an unknown key is null, never a throw, and
 *      '__proto__' is nobody's kind;
 *   2. the menu's roster: every kind a row of exactly one group, the three
 *      weapon rows and five armour rows in the owner's order, a pill word and
 *      an empty-bag word for each; the nine cells in the owner's 3 x 3 order,
 *      each filtering to its own kind; entryCategory files the stash pieces;
 *   3. gearTabBus: a cell's tap picks it and filters the bag (auto), a second
 *      tap puts both down; Equip/Unequip (afterChange) clears an automatic
 *      filter but never one picked from the menu; a bag pick never changes the
 *      filter; the × clears; the tab is STATS by default;
 *   4. gearStats: the comparison's "old → new", green up, red down, '=' level,
 *      a stat only the old piece had red; a weapon's rows are the item card's
 *      own numbers (calcDisplayDmgRange / calcDisplayDps); armour by its damage
 *      cut, a shield by its block; the damage cut is heroStatPills'
 *      combinedDamageCut itself; your own rows never print NaN;
 *   5. the one action list: the item card draws its buttons from
 *      itemActionList and runs them through runItemAction (no inline Equip or
 *      Drink of its own any more), and the Gear tab runs the same two.
 */
import { readFileSync } from 'node:fs';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 700))); }
}
const root = new URL('../../', import.meta.url);
const src = (p) => readFileSync(new URL(p, root), 'utf8');

const IC = await import('../../src/ui/mobile/dash/itemCategory.js');
const LS = await import('../../src/data/lifeSkills.js');
const IT = await import('../../src/data/items.js');
const FC = await import('../../src/data/farmCrops.js');
const DI = await import('../../src/data/dishes.js');
const GE = await import('../../src/data/gems.js');
const SH = await import('../../src/data/shards.js');
const SV = await import('../../src/data/salvage.js');
const HW = await import('../../src/data/hardenedWood.js');
const RM = await import('../../src/data/remains.js');
const FI = await import('../../src/data/foodIcons.js');
const GS = await import('../../src/data/gameSystems.js');
const TR = await import('../../src/data/trapping.js');

/* ── 1. every item id, a kind ── */
{
  const key = (prefix, name) => prefix + '_' + String(name).replace(/\s+/g, '_').toLowerCase();   /* gathering.js _harvestInvKey */
  const want = [];   /* [key, kind, where] */
  for (const t of LS.WOODCUTTING_TIERS) want.push([key('wood', t.name), 'wood', 'WOODCUTTING_TIERS']);
  for (const t of LS.FISHING_TIERS) want.push([key('fish', t.name), 'fish', 'FISHING_TIERS']);
  for (const t of LS.MINING_TIERS) want.push([key('ore', t.name), 'ore', 'MINING_TIERS']);
  for (const k of Object.keys(FI.COOKED_FISH_ICONS)) want.push([k, 'food', 'COOKED_FISH_ICONS']);
  for (const t of LS.FISHING_TIERS) want.push(['cooked_' + key('fish', t.name), 'food', 'cooked FISHING_TIERS']);
  for (const k of Object.keys(IT.SMELT_RECIPES)) { want.push([k, 'ore', 'SMELT_RECIPES']); want.push([IT.SMELT_RECIPES[k].ore, 'ore', 'SMELT_RECIPES.ore']); }
  for (const id of Object.keys(FC.FARM.CROPS)) { want.push([FC.FARM.CROPS[id].seed, 'crops', 'FARM seed']); want.push([FC.FARM.CROPS[id].item, 'crops', 'FARM crop']); }
  want.push([FC.FARM.COMPOST, 'crops', 'FARM.COMPOST']);
  for (const k of Object.keys(DI.DISHES)) want.push([k, 'food', 'DISHES']);
  for (const r of GS.COOKING_RECIPES) want.push([r.makes, DI.dishFor(r.makes) ? 'food' : 'potion', 'COOKING_RECIPES']);
  for (const e of GE.GEM_ELEMENTS) { want.push([GE.gemRawKey(e), 'gem', 'raw gem']); want.push([GE.gemCutKey(e), 'gem', 'gem']); }
  want.push(['rare_gem', 'gem', 'RARE_GEM_KEY']);
  for (const z of Object.keys(SH.ZONE_SHARDS)) want.push([SH.ZONE_SHARDS[z].key, 'gem', 'ZONE_SHARDS']);
  for (const g of SV.SALVAGE.ESSENCE_GRADES) for (const m of Object.keys(SV.SALVAGE.METALS)) want.push([SV.essenceKey(g, m), 'ore', 'essence']);
  for (const k of Object.keys(HW.HARDENED_WOOD_RECIPES)) want.push([k, 'wood', 'HARDENED_WOOD_RECIPES']);
  for (const k of Object.keys(RM.REMAINS_NAMES)) want.push([k, 'quest', 'REMAINS_NAMES']);
  for (const s of GS.SHOP_ITEMS_FOR_SALE) want.push([s.key, s.key === 'trap_basic' ? 'other' : 'potion', 'SHOP_ITEMS_FOR_SALE']);
  for (const k of Object.values(LS.GATHER_TOOL_FOR_SKILL)) want.push([k, 'other', 'GATHER_TOOL_FOR_SKILL']);
  want.push([TR.TRAPPING.TRAP, 'other', 'TRAPPING.TRAP']);
  /* the bag's own bottles: POTION_THUMBS in InventoryPanel.jsx (JSX, read as text) */
  const pt = (src('src/ui/mobile/dash/InventoryPanel.jsx').match(/const POTION_THUMBS = \{([\s\S]*?)\n\};/) || [])[1] || '';
  const bottles = (pt.match(/^\s+([a-z]+):/gm) || []).map((x) => x.trim().slice(0, -1));
  for (const b of bottles) want.push([b, b === 'cookedminnow' ? 'food' : 'potion', 'POTION_THUMBS']);
  want.push(['daily_chest', 'other', 'DAILY_CHEST_KEY']);
  want.push(['goldticket_crimson', 'other', 'golden ticket']);
  want.push(['cape_crimson', 'cape', 'contest cape']);
  const fell = want.filter(([k]) => IC.itemCategory(k) == null);
  const wrong = want.filter(([k, kind]) => IC.itemCategory(k) != null && IC.itemCategory(k) !== kind).map(([k, kind, w]) => [k, IC.itemCategory(k), 'want ' + kind, w]);
  check(`1a every item id src/data names (${want.length}) falls into a kind -- none falls through`, want.length > 120 && fell.length === 0, fell.map(([k, , w]) => k + ' (' + w + ')'));
  check('1b ...the kind its menu row says (a fish under Fish, a bar under Ore & bars, a bottle under Potions...)', wrong.length === 0, wrong);
  check('1c the bag\'s bottles were read (POTION_THUMBS)', bottles.length >= 5 && bottles.includes('whetstone'), bottles);
  check('1d an unknown key is null, never a throw; no prototype name is a kind',
    IC.itemCategory('zz_nothing') === null && IC.itemCategory('') === null && IC.itemCategory(undefined) === null
      && IC.itemCategory('__proto__') === null && IC.itemCategory('constructor') === null && IC.itemCategory(42) === null);
  check('1e an old gear word in a key still reads as gear (the chips\' rules)',
    IC.itemCategory('legacy_iron_greatsword') === 'sword' && IC.itemCategory('old_bow') === 'bow' && IC.itemCategory('oak_staff') === 'staff');
}

/* ── 2. the roster ── */
{
  const rows = IC.GEAR_FILTER_GROUPS.flatMap((g) => g.rows);
  const kinds = Object.keys(IC.GEAR_FILTERS);
  check('2a every kind is one row of one group, in the owner\'s order',
    rows.length === kinds.length && kinds.every((k) => rows.filter((r) => r === k).length === 1)
      && IC.GEAR_FILTER_GROUPS[0].rows.join() === 'sword,bow,staff' && IC.GEAR_FILTER_GROUPS[1].rows.join() === 'shield,chest,legs,cape,amulet', rows);
  check('2b each kind has its pill word and its empty-bag words', kinds.every((k) => IC.GEAR_FILTERS[k].pill && IC.GEAR_FILTERS[k].none));
  check('2c the nine cells, the owner\'s 3 x 3, each filtering to its own kind',
    IC.GEAR_CELLS.map((c) => c.id).join() === 'sword,bow,staff,shield,chest,legs,cape,amulet,gem'
      && IC.GEAR_CELLS.every((c) => c.filter === c.id && IC.GEAR_FILTERS[c.filter]), IC.GEAR_CELLS.map((c) => c.id));
  check('2d the weapon cells name their slot, their hand and their skill',
    IC.gearCell('sword').field === 'weapon' && IC.gearCell('bow').active === 'ranged' && IC.gearCell('staff').skill === 'mind');
  const e = (kind, obj) => IC.entryCategory({ kind, obj });
  check('2e entryCategory: a bag weapon by its type, armour by its slot, an item by its key',
    e('stashWeapon', { type: 'greatsword' }) === 'sword' && e('stashWeapon', { type: 'bow' }) === 'bow' && e('stashWeapon', { type: 'staff' }) === 'staff'
      && e('stashShield', {}) === 'shield' && e('stashArmor', {}) === 'chest' && e('stashLegs', {}) === 'legs'
      && e('stashGear', { slot: 'legs' }) === 'legs' && e('stashGear', { slot: 'chest' }) === 'chest'
      && IC.entryCategory({ kind: 'item', key: 'fish_minnow' }) === 'fish' && IC.entryCategory({ kind: 'item', key: 'zz' }) === 'other');
  check('2f cellForEntry: a bag piece fits its cell, a fish none', IC.cellForEntry({ kind: 'stashWeapon', obj: { type: 'bow' } }) === 'bow'
    && IC.cellForEntry({ kind: 'item', key: 'fish_minnow' }) === null && IC.cellForEntry({ kind: 'item', key: 'gem_frost' }) === null);
}

/* ── 3. gearTabBus ── */
{
  const { gearTabBus: B } = await import('../../src/ui/mobile/dash/gearTabBus.js');
  const st = () => ({ sel: B.state.sel && (B.state.sel.cell || B.state.sel.bag), f: B.state.filter.id, auto: B.state.filter.auto });
  check('3a the middle panel opens on STATS', B.state.tab === 'stats');
  B.tapCell('sword');
  const a = st();
  B.tapCell('sword');
  const b = st();
  check('3b a cell\'s tap picks it and filters to its kind (auto); a second tap puts both down',
    a.sel === 'sword' && a.f === 'sword' && a.auto === true && b.sel === null && b.f === 'all', { a, b });
  B.tapCell('cape'); B.afterChange();
  const c = st();
  B.pickFilter('fish'); B.tapBag('i-fish_minnow', null);
  const d = st();
  B.afterChange();
  const e = st();
  check('3c Equip/Unequip clears an automatic filter; one picked from the menu stays, and a bag pick never changes it',
    c.sel === null && c.f === 'all' && d.sel === 'i-fish_minnow' && d.f === 'fish' && !d.auto && e.f === 'fish' && e.sel === null, { c, d, e });
  B.tapCell('legs'); const f0 = st();
  B.tapBag('stashLegs-0', { id: 1 }); const f = st();
  check('3d picking a bag piece after a cell keeps the cell\'s filter on show', f0.f === 'legs' && f.sel === 'stashLegs-0' && f.f === 'legs', { f0, f });
  B.clearFilter();
  check('3e the × clears in one tap', st().f === 'all' && !B.state.menu);
  B.setMenu(true); B.pickFilter('ore');
  check('3f picking from the menu shuts it', !B.state.menu && st().f === 'ore');
  B.clearFilter(); B.afterChange(); B.setTab('look');
  check('3g the tab is remembered (here, with no localStorage, for the session)', B.state.tab === 'look');
  B.setTab('stats');
}

/* ── 4. gearStats ── */
{
  const G = await import('../../src/ui/mobile/dash/gearStats.js');
  const cmp = G.compareRows([{ k: 'DPS', v: '4.0', n: 4, d: 1 }, { k: 'Range', v: '1.5', n: 1.5, d: 1 }, { k: 'Block', v: '10%', n: 10 }],
    [{ k: 'DPS', v: '5.5', n: 5.5, d: 1 }, { k: 'Range', v: '1.0', n: 1, d: 1 }, { k: 'Damage', v: '3', n: 3 }]);
  const by = Object.fromEntries(cmp.map((r) => [r.k, r]));
  check('4a "old → new": better green (+), worse red (−), a stat only the new piece has against "—", one only the old had red',
    by.DPS.old === '4.0' && by.DPS.now === '5.5' && by.DPS.diff === '+1.5' && by.DPS.tone === 1
      && by.Range.diff === '−0.5' && by.Range.tone === -1 && by.Damage.old === '—' && by.Damage.tone === 0
      && by.Block.now === '—' && by.Block.tone === -1, cmp);
  check('4b level is "=" and neither colour', G.compareRows([{ k: 'X', v: '2', n: 2 }], [{ k: 'X', v: '2', n: 2 }])[0].diff === '=' && G.compareRows([{ k: 'X', v: '2', n: 2 }], [{ k: 'X', v: '2', n: 2 }])[0].tone === 0);
  const R = { maxHp: 200, maxStamina: 100, maxMana: 100, activeSlot: 'melee', weapon: { type: 'greatsword', gearBase: 'copper', tierMult: 1 } };
  const wr = G.weaponRows(R, R.weapon);
  const card = GS.calcDisplayDmgRange(R, R.weapon);
  check('4c a weapon\'s rows are the item card\'s own numbers: Damage, DPS, Speed, Range',
    wr.map((r) => r.k).join() === 'Damage,DPS,Speed,Range' && wr[0].v === card.text.replace('-', '–')
      && wr[1].v === String(Math.round(GS.calcDisplayDps(R, R.weapon) * 10) / 10).replace(/^(\d+)$/, '$1'), wr);
  const iron = { mat: 'iron', tierMult: 2 }, copper = { mat: 'copper', tierMult: 1 };
  const ac = G.compareRows(G.armourRows(copper, 'chest'), G.armourRows(iron, 'chest'));
  check('4d armour compares by its damage cut (iron over copper: green), the piece\'s own getArmorPieceDr',
    ac.length === 1 && ac[0].k === 'Damage cut' && ac[0].tone === 1
      && Math.abs(parseFloat(ac[0].now) - GS.getArmorPieceDr(iron, 'chest') * 100) < 0.06, ac);
  const sr = G.shieldRows({ name: 'Pine Shield', gearBase: 'wood', tierMult: 1 });
  check('4e a shield by its block (calcBlockReduction)', sr[0].k === 'Block' && sr[0].n === Math.round(GS.calcBlockReduction(0, { name: 'Pine Shield', gearBase: 'wood', tierMult: 1 }) * 100), sr);
  /* the damage cut is the Character page's own (heroStatPills combinedDamageCut, PR #1350) */
  const HP = await import('../../src/ui/mobile/sheet/heroStatPills.js');
  const HM = await import('../../src/ui/mobile/sheet/heroModel.js');
  const d = HM.deriveHeroStats({ ...R, armor: iron });
  const cutRow = G.myStatRows({ ...R, armor: iron }).find((r) => r.key === 'cut');
  const want = HP.combinedDamageCut(d.defPct, d.armorDr, d.dodge) * 100;
  check('4f the damage cut row is heroStatPills\' combinedDamageCut, not a copy of its formula',
    !/function damageCut|PROG3\.FLOOR \|\|/.test(src('src/ui/mobile/dash/gearStats.js')) && /combinedDamageCut/.test(src('src/ui/mobile/dash/gearStats.js'))
      && Math.abs(parseFloat(cutRow.v.replace('\u2212', '')) - want) < 0.6, { cutRow, want });
  const mine = G.myStatRows(R);
  check('4g your own rows: the damage cut, HP, Energy, Mana, the weapon\'s damage, speed, range, crit, dodge, move -- no NaN',
    mine.map((r) => r.key).join() === 'cut,hp,energy,mana,damage,speed,range,crit,dodge,move' && mine.every((r) => !/NaN|undefined/.test(r.v)), mine);
  check('4h ...and an empty blob never throws or prints NaN', G.myStatRows({}).every((r) => !/NaN|undefined/.test(r.v)) && G.weaponRows({}, null).length === 0);
}

/* ── 5. one action list ── */
{
  const idp = src('src/ui/mobile/dash/ItemDetailPopup.jsx');
  const gt = src('src/ui/mobile/dash/GearTab.jsx');
  const ia = src('src/ui/mobile/dash/itemActions.js');
  check('5a the item card draws its buttons from itemActionList and runs them through runItemAction',
    /itemActionList\(target, resolved\)/.test(idp) && /runItemAction\(id, target, resolved/.test(idp));
  check('5b ...with no inline Equip / Drink / Eat of its own left', !/onEquipStashWeapon\s*=|const onDrink\s*=|const onEat\s*=|actions\.drink\s*&&\s*<button/.test(idp));
  check('5c the Gear tab runs the same two', /itemActionList\(target, card\)/.test(gt) && /runItemAction\(a\.id, target, card/.test(gt));
  check('5d the list is one function each: itemActionList and runItemAction', (ia.match(/export function itemActionList/g) || []).length === 1 && (ia.match(/export function runItemAction/g) || []).length === 1);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
