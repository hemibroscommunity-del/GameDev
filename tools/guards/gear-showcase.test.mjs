/* ═══ v2.3.6689: BRO'S EQUIPMENT SHOWCASE, AND THE ROADS INTO THE ONE ITEM PAGE (card UI2-gear PR 3) ═══
 *
 * src/game/gearShowcase.js: the body's ONE shape (Gear's Equipped panel and
 * the showcase), whose showcase it is and what it offers (Manage Gear only
 * for yourself), and the sources a showcase cell and the player card's
 * equipment row hand to the one item page (dash/itemPageOpen.js).  What the
 * page then shows is src/game/itemInspect.js's (item-inspect.test).
 *
 * THE DODGES, each planted below and seen red:
 *   S1  Manage Gear offered on another player's showcase;
 *   S2  another player's cell opened as yours (no owner: their item with your actions);
 *   S3  a showcase cell opened by a source of its own, not Gear's `cell` (two item pages for one item);
 *   S4  the profile's slot of another player opened with actions, or as "Worn";
 *   S5  an empty (ghost) slot opening a page;
 *   S6  your own profile slot opened without Gear's cell (the held weapon's hand lost);
 *   S7  the body's shape broken (a weapon off the left column, the torso off the middle);
 *   S8  a cell under 44 px at a phone's, a small phone's, a sideways phone's or a computer's page;
 *   S9  the showcase drawing the bag (its storage grid);
 *   S10 Gear's Equipped panel laying its cells out by a table of its own (the two shapes drifting).
 *
 *   node tools/guards/gear-showcase.test.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as REAL_MOD from '../../src/game/gearShowcase.js';
import { inspectItem } from '../../src/game/itemInspect.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
let fails = 0;
const check = (name, ok, detail) => {
  if (ok) console.log('  ok   ' + name);
  else { fails += 1; console.log('  FAIL ' + name + (detail !== undefined ? '  ' + JSON.stringify(detail) : '')); }
};

const R = { activeSlot: 'ranged', weapon: { type: 'greatsword' }, rangedWeapon: { type: 'bow' }, shield: { name: 'Buckler' } };
const PEER = { isSelf: false, name: 'Diego' };
const SELF = { isSelf: true, name: 'You' };
const slot = (s, ghost) => ({ slot: s, label: s, iconSrc: '/x.webp', ghost: !!ghost, name: 'Thing' });
/* the page's model for a source, the way itemPageOpen.js narrows it (owner or peer: another player's) */
const pageOf = (src) => inspectItem({
  place: src && (src.owner || src.peer) ? 'other' : 'worn', owner: src && src.owner, kind: 'sword', name: 'Greatsword',
  actions: src && (src.owner || src.peer) ? [] : [{ id: 'unequip', label: 'Unequip', tone: 'primary', off: false, why: '' }],
});
/* the page heights the frame gives (measured on the test box: mp-ui2gear's shapes): upright phones, a
   phone on its side, a computer's band */
const ROOMS = [
  { tag: '390x844', w: 382, h: 205 }, { tag: '375x667', w: 367, h: 197 },
  { tag: '844x390', w: 836, h: 82 }, { tag: '844x390 (shortest)', w: 836, h: 52 },
  { tag: 'computer', w: 760, h: 205 },
];

function suite(M, files) {
  const out = [];
  const t = (name, ok, detail) => out.push({ name, ok: !!ok, detail });
  /* S1 */
  t('S1. Manage Gear only for yourself', M.showcaseOf(null).manage === true && M.showcaseOf({ name: 'Diego' }).manage === false && M.showcaseOf('Diego').manage === false);
  /* S2 */
  const other = M.showcaseItemSource(R, 'sword', { name: 'Diego' });
  t('S2. another player\'s cell is theirs (owner), read-only on the page', !!other && other.owner === 'Diego' && pageOf(other).readOnly && pageOf(other).actions.length === 0, other && { owner: other.owner });
  /* S3 */
  const mine = M.showcaseItemSource(R, 'sword', null);
  t('S3. a showcase cell hands Gear\'s own source ({ R, cell }), no owner', !!mine && mine.R === R && mine.cell === 'sword' && !mine.owner && !mine.peer && !mine.entry,
    mine && Object.keys(mine));
  t('S3. an unknown cell opens nothing', M.showcaseItemSource(R, 'helmet', null) === null && M.showcaseItemSource(null, 'sword', null) === null);
  /* S4 */
  const ps = M.profileItemSource(PEER, slot('weapon'), R);
  t('S4. another player\'s profile slot: theirs, read-only, never your record', !!ps && ps.owner === 'Diego' && !!ps.peer && !ps.R && pageOf(ps).readOnly && pageOf(ps).actions.length === 0
    && pageOf(ps).where !== 'Worn', ps && Object.keys(ps));
  /* S5 */
  t('S5. an empty slot opens nothing', M.profileItemSource(PEER, slot('shield', true), R) === null && M.profileItemSource(SELF, slot('shield', true), R) === null);
  /* S6 */
  const own = M.profileItemSource(SELF, slot('weapon'), R);
  const ownShield = M.profileItemSource(SELF, slot('shield'), R);
  t('S6. your profile slot goes by Gear\'s cell (the weapon: the hand you hold)', !!own && own.R === R && own.cell === 'bow' && !own.owner && !!ownShield && ownShield.cell === 'shield',
    own && { cell: own.cell });
  /* S7 */
  const B = M.GEAR_BODY;
  const col = (ids, c) => ids.every((id) => B[id] && B[id][0] === c);
  const rows = (ids) => ids.map((id) => B[id] && B[id][1]).join() === '0,1,2';
  t('S7. the body: the weapons down the left, Cape, Chest, Legs in the middle, Shield, Amulet, Gem down the right',
    Object.keys(B).length === 9 && col(['sword', 'bow', 'staff'], 0) && col(['cape', 'chest', 'legs'], 1) && col(['shield', 'amulet', 'gem'], 2)
    && rows(['sword', 'bow', 'staff']) && rows(['cape', 'chest', 'legs']) && rows(['shield', 'amulet', 'gem'])
    && M.GEAR_BODY_ROW.map((g) => g.join()).join('|') === 'sword,bow,staff|cape,chest,legs|shield,amulet,gem');
  /* S8 */
  for (const rm of ROOMS) {
    const g = M.showcaseGeometry(rm.w, rm.h, true);
    const used = g.short ? g.figW + g.bodyW + 140 + 16 : g.bodyW + 8 + 4 * 2 + Math.max(g.figW, 120);
    t(`S8. ${rm.tag}: every cell 44 px or more, the body and the figure inside the page`, g.bodyCell >= 44 && g.torsoW >= 44 && used <= rm.w
      && (g.short || 3 * g.bodyCell + 12 <= rm.h - 8 || rm.h < 152), { cell: g.bodyCell, torso: g.torsoW, used, w: rm.w, short: g.short });
  }
  /* S9 */
  const imp = (files.show.match(/^import[^\n]*$/gm) || []).join('\n');
  t('S9. the showcase draws no bag (no bag model, storage grid or bag tile)', !/getBagEntries|Ui2ItemGrid|BagTile|bagModel|InventoryPanel/.test(imp) && /EquippedBody/.test(files.show));
  /* S10 */
  t('S10. Gear\'s Equipped panel lays its cells out by the one table (GEAR_BODY), none of its own',
    /import\s*\{[^}]*GEAR_BODY[^}]*\}\s*from\s*'@\/game\/gearShowcase\.js'/.test(files.panels) && !/sword:\s*\[0,\s*0\]/.test(files.panels));
  return out;
}

const FILES = { show: read('src/ui/mobile/sheet/GearShowcase.jsx'), panels: read('src/ui/mobile/dash/GearPanels.jsx') };
console.log('1. the rules, as built');
for (const r of suite(REAL_MOD, FILES)) check('1. ' + r.name, r.ok, r.detail);

console.log('2. the roads, as wired');
const hub = read('src/game/broHub.js');
const card = read('src/ui/mobile/sheet/BroCard.jsx');
const open = read('src/ui/mobile/dash/itemPageOpen.js');
const prof = read('src/ui/panels/InspectPlayerPanel.jsx');
check('2a. Bro\'s Equipment door opens the showcase page (broEquip), its page drawn by GearShowcase',
  /id: 'equipment'[^\n]*opens: 'page:broEquip'/.test(hub) && /broEquip: 'equip'/.test(hub) && /door === 'equip'\) return <GearShowcase/.test(card));
check('2b. a showcase cell opens the one item page', /openItemPage\(src\)/.test(FILES.show) && /showcaseItemSource\(/.test(FILES.show));
check('2c. the card\'s equipment row opens the one item page by profileItemSource', /profileItemSource\(/.test(prof) && /openItemPage\(src\)/.test(prof));
check('2d. the page reads another player\'s piece read-only (owner: place other, no actions handed over)',
  /src\.owner\)\s*return\s*\{[^\n]*place: 'other'[^\n]*actions: \[\]/.test(open) && /function fromPeer/.test(open));

console.log('3. the dodges, planted (each must turn its rule red)');
const plant = (id, over, files) => {
  const M = { ...REAL_MOD, ...over };
  const res = suite(M, files || FILES).filter((r) => r.name.startsWith(id + '.'));
  check(`3. plant ${id}: turns ${id} red`, res.length > 0 && res.some((r) => !r.ok));
};
plant('S1', { showcaseOf: (who) => ({ self: who == null, manage: true, owner: '' }) });
plant('S2', { showcaseItemSource: (R0, cell) => ({ from: 'showcase', R: R0, cell }) });
plant('S3', { showcaseItemSource: (R0, cell, who) => ({ from: 'showcase', R: R0, entry: { kind: 'worn', key: cell }, owner: who ? 'x' : undefined }) });
plant('S4', { profileItemSource: (p, s, R0) => (s.ghost ? null : { from: 'profile', R: R0, cell: 'sword' }) });
plant('S5', { profileItemSource: (p, s, R0) => (p.isSelf ? { from: 'profile', R: R0, cell: 'shield' } : { from: 'profile', owner: p.name, peer: { slot: s.slot } }) });
plant('S6', { profileItemSource: (p, s, R0) => (s.ghost ? null : p.isSelf ? { from: 'profile', R: R0, cell: s.slot === 'weapon' ? 'sword' : s.slot } : REAL_MOD.profileItemSource(p, s, R0)) });
plant('S7', { GEAR_BODY: { ...REAL_MOD.GEAR_BODY, bow: [1, 1], chest: [0, 1] } });
plant('S8', { showcaseGeometry: (w, h, m) => ({ ...REAL_MOD.showcaseGeometry(w, h, m), bodyCell: 40 }) });
plant('S9', {}, { ...FILES, show: FILES.show.replace("import { Ui2Action", "import { Ui2ItemGrid, Ui2Action") });
plant('S10', {}, { ...FILES, panels: FILES.panels.replace("const BODY = GEAR_BODY;", "const BODY = Object.freeze({ sword: [0, 0] });") });

console.log(fails ? `gear-showcase: ${fails} FAIL` : 'gear-showcase: all ok');
process.exit(fails ? 1 : 0);
