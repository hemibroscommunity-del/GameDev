/* ═══ v2.3.3281: THE OWNER'S BAG ICONS (tools/ui/cut-bag-icons.py) ═══
 *
 *   1. every item the five sheets drew has its file in public/icons/items, at
 *      the item set's 256 x 256: a seed packet and a crop for EVERY crop the
 *      farm grows (data/farmCrops.js), compost, the five dishes
 *      (data/dishes.js `icon`), the box trap, the nine essences (every grade
 *      and metal data/salvage.js names) and the five hardened woods (every
 *      tier data/hardenedWood.js names); the cutter's sheets are kept;
 *   2. farmIconFor reads a seed as its packet, a crop as the crop, compost as
 *      its sack, and nothing else (a key the other player chose included);
 *   3. the quick-eat button's warm list holds every dish eaten at once, and no
 *      other dish;
 *   4. the places use them: the bag's thumbFor, the TRAP pop-up's picture, the
 *      Feed & Seed window's rows, the Cookhouse's recipe rows; the two old
 *      generators refuse to draw over the owner's pictures.
 */
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

const root = new URL('../../', import.meta.url);
const pub = (url) => new URL('public' + url.split('?')[0], root);
const src = (p) => readFileSync(new URL(p, root), 'utf8');
const FC = await import('../../src/data/farmCrops.js');
const DI = await import('../../src/data/dishes.js');
const FI = await import('../../src/data/foodIcons.js');
const SV = await import('../../src/data/salvage.js');
const HW = await import('../../src/data/hardenedWood.js');

/* a webp's own size, from its header */
const dims = (u) => {
  const b = readFileSync(pub(u)); const i = b.indexOf('VP8');
  if (b[i + 3] === 0x58) return [1 + b.readUIntLE(i + 12, 3), 1 + b.readUIntLE(i + 15, 3)];
  if (b[i + 3] === 0x4c) { const v = b.readUInt32LE(i + 9); return [1 + (v & 0x3fff), 1 + ((v >> 14) & 0x3fff)]; }
  return [b.readUInt16LE(i + 14) & 0x3fff, b.readUInt16LE(i + 16) & 0x3fff];
};
const is256 = (u) => existsSync(pub(u)) && dims(u).join('x') === '256x256';

/* ── 1. the files ── */
{
  const ids = Object.keys(FC.FARM.CROPS);
  const seeds = ids.map((id) => FC.farmIconFor(FC.FARM.CROPS[id].seed));
  const crops = ids.map((id) => FC.farmIconFor(FC.FARM.CROPS[id].item));
  check(`1a a seed packet for every crop the farm grows (${ids.length}), 256 x 256`, ids.length === 16 && seeds.every(is256), seeds.filter((u) => !is256(u)));
  check('1b ...and the crop itself for every one', crops.every(is256), crops.filter((u) => !is256(u)));
  check('1c compost\'s sack', is256(FC.FARM_COMPOST_ICON));
  const dishes = Object.keys(DI.DISHES).map((k) => DI.DISHES[k].icon);
  check(`1d every Cookhouse dish has its picture (${dishes.length})`, dishes.length === 5 && dishes.every((u) => typeof u === 'string' && is256(u)), dishes);
  const ess = [];
  for (const g of SV.SALVAGE.ESSENCE_GRADES) for (const m of Object.keys(SV.SALVAGE.METALS)) ess.push(SV.essenceIcon(SV.essenceKey(g, m)));
  check(`1e every essence (${ess.length}: each grade and metal)`, ess.length === 9 && ess.every(is256), ess.filter((u) => !is256(u)));
  const hw = Object.keys(HW.HARDENED_WOOD_RECIPES).map((k) => HW.hardenedWoodIcon(k));
  check(`1f every hardened wood (${hw.length})`, hw.length === 5 && hw.every(is256), hw.filter((u) => !is256(u)));
  check('1g the box trap', is256('/icons/items/trap-box.webp'));
  check('1h the five sheets the cutter reads are kept', ['wood', 'dishes', 'essences', 'seeds', 'crops']
    .every((k) => existsSync(new URL('assets/icons-source/sheet-bag-' + k + '.png', root))));
  /* the cutter names its pictures in the prompt's order; every farm crop is one of them */
  const cut = src('tools/ui/cut-bag-icons.py');
  const listed = (cut.match(/CROPS = \[([\s\S]*?)\]/) || [])[1] || '';
  const names = (listed.match(/'([a-z-]+)'/g) || []).map((q) => q.slice(1, -1));
  check('1i the cutter\'s crop list is the farm\'s sixteen', names.length === 16
    && ids.every((id) => names.includes(id.replace(/_/g, '-'))), { names, ids });
}

/* ── 2. farmIconFor ── */
{
  const f = FC.farmIconFor;
  check('2a a seed is its packet, a crop the crop, compost its sack',
    /\/icons\/items\/seed-rock-vine\.webp\?v=2\.3\.3281$/.test(f('seed_rock_vine')) && /\/crop-thunder-pepper\.webp/.test(f('herb_thunder_pepper'))
      && /\/crop-carrot\.webp/.test(f('crop_carrot')) && /\/compost\.webp/.test(f('compost')), [f('seed_rock_vine'), f('herb_thunder_pepper')]);
  check('2b nothing else: another item, an empty key, a key the other player chose',
    f('wood_pine') === null && f('') === null && f(undefined) === null && f('__proto__') === null && f('constructor') === null && f('seed_') === null);
}

/* ── 3. the quick-eat warm list ── */
{
  const urls = FI.quickEatIconUrls();
  const now = Object.keys(DI.DISHES).filter((k) => DI.DISHES[k].slot === 'now').map((k) => DI.DISHES[k].icon);
  const other = Object.keys(DI.DISHES).filter((k) => DI.DISHES[k].slot !== 'now').map((k) => DI.DISHES[k].icon);
  check(`3a every dish eaten at once is warmed with the button (${now.length}: the Garden Stew), no other dish`,
    now.length >= 1 && now.every((u) => urls.includes(u)) && !other.some((u) => urls.includes(u)), { now, urls });
}

/* ── 4. the places ── */
{
  const inv = src('src/ui/mobile/dash/InventoryPanel.jsx');
  const tf = inv.slice(inv.indexOf('export const thumbFor'), inv.indexOf('export const ITEM_NAMES'));
  check('4a the bag\'s thumbFor draws the farm\'s goods and the dishes', /farmIconFor\(k\)/.test(tf) && /dishPic\.icon/.test(tf));
  const cp = src('src/rendering/controlsPreload.js');
  check('4b the TRAP pop-up, the bag and the Traps tab share the owner\'s box trap, warmed on the loading screen',
    /TRAP_ICON_URL = '\/icons\/items\/trap-box\.webp\?v=2\.3\.3281'/.test(cp) && /urls\.push\(TRAP_ICON_URL\)/.test(cp));
  const fs = src('src/ui/panels/buildings/FeedSeedPanel.jsx');
  check('4c the Feed & Seed window sells seeds as packets and compost as its sack, a locked crop as the crop',
    /icon=\{farmSeedIcon\(id\)\}/.test(fs) && /icon=\{FARM_COMPOST_ICON\} name="Compost"/.test(fs) && /<ItemPic src=\{farmCropIcon\(id\)\}/.test(fs));
  const ck = src('src/ui/panels/buildings/CookPanel.jsx');
  check('4d the Cookhouse\'s rows lead with what they make, as the bag draws it', /thumbFor\(recipe\.makes\)/.test(ck) && /"data-cook-pic": recipe\.makes/.test(ck));
  for (const [tool, what] of [['tools/make_essence_icons.py', 'essences'], ['tools/make_hardened_wood_icons.py', 'hardened woods']]) {
    const r = spawnSync('python3', [new URL(tool, root).pathname], { encoding: 'utf8' });
    if (r.error) { check(`4e ${tool} refuses to draw over the owner's ${what} (python3 not here: read the guard)`, /--standins/.test(src(tool))); continue; }
    check(`4e ${tool} refuses to draw over the owner's ${what}`, r.status !== 0 && /owner's art now/.test(r.stderr + r.stdout), { status: r.status, out: (r.stderr + r.stdout).slice(0, 200) });
  }
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) { console.log(failed + ' FAILURE(S)'); process.exit(1); }
console.log('ALL PASS');
