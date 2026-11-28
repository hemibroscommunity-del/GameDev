/* ═══ v2.3.6861: BRO · BAG'S RULES (card MN step 4; src/game/menus3Nav.js, menus3Bag.js) ═══
 *
 * The owner's Bag in the new panel, its rules played on the modules
 * themselves.  This suite imports nothing from server/src: it tests the
 * page's own rules (as menus3-rules.test does) and does not deploy.
 *
 *   1. THE ONE BACK: an entry starts at its section's own page; a page opened
 *      over it is Back's; Back goes ONE page and gives the page under it its
 *      rail and scroll as it was left; on the section's own page Back does
 *      nothing; the history is kept (Back twice from two deep) and capped;
 *      the page showing keeps a rail or scroll; a page over a gone thing
 *      leaves, and every page opened from it with it;
 *   2. THE RAIL: its seven places in the owner's order; All is every entry
 *      and NOTHING else (pets are not entries: they are never in All); each
 *      filter only its kinds; a forged rail is All; the counts are the
 *      game's (All its length, no cap; Weapons the weapon bag against the
 *      worker's cap);
 *   3. THE GRID: four across upright (390, 320) and never fewer; a computer's
 *      wide drawer more whole tiles;
 *   4. GEAR: the nine slots in the game's order; a slot's candidates only its
 *      kind;
 *   5. COUNTER ACTIONS: Sell only where the item card says it sells; the
 *      craft by kind; the Bank for a bag item, never a spare piece;
 *   6. THE CAMERA: the wireframe's 14% upright while open, whole px; none
 *      shut or as the drawer; followCamera's aim moves by it, and without it
 *      is exactly yesterday's;
 *   7. THE ROAD: the Bro button and the I key's Bag are built (the panel),
 *      Power and Skills still today's screens. */
import { MENUS3_NAV, navStart, navTop, navCanBack, navPush, navBack, navKeep, navPrune } from '../../src/game/menus3Nav.js';
import { MENUS3_RAIL, MENUS3_RAIL_KINDS, MENUS3_SLOTS, railId, railEntries, railCounts, gridCols, slotCandidates, counterActions } from '../../src/game/menus3Bag.js';
import { menus3CamOffset, MENUS3_PANEL } from '../../src/game/menus3Panel.js';
import { MENUS3_BUILT, menus3Route } from '../../src/game/menus3Router.js';
import { followCamera } from '../../src/game/cameraFollow.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; return; }
  failures++;
  console.log('FAIL ' + name + (detail !== undefined ? ' -- ' + JSON.stringify(detail) : ''));
}

/* ── 1. the one Back ── */
{
  const h0 = navStart('bag');
  check('1a an entry starts at its section page', navTop(h0).page === 'root' && navTop(h0).section === 'bag' && h0.length === 1);
  check('1b no Back on the section page', !navCanBack(h0) && navBack(h0) === h0);
  const h1 = navKeep(h0, { rail: 'armor', scroll: 120 });
  check('1c the page showing keeps its rail and scroll', navTop(h1).rail === 'armor' && navTop(h1).scroll === 120);
  check('1d keeping the same is no change', navKeep(h1, { rail: 'armor', scroll: 120 }) === h1);
  const h2 = navPush(h1, 'item', 'item:wood_oak', { scroll: 140 });
  check('1e a page opened over it is Back\'s', navCanBack(h2) && navTop(h2).page === 'item' && navTop(h2).arg === 'item:wood_oak' && navTop(h2).scroll === 0);
  check('1f the page under keeps what it had as it was left', h2[0].rail === 'armor' && h2[0].scroll === 140);
  check('1g opening the page showing again is no change', navPush(h2, 'item', 'item:wood_oak') === h2);
  const h3 = navPush(h2, 'slot', 'sword');
  const b1 = navBack(h3);
  check('1h Back goes ONE page', navTop(b1).page === 'item' && navTop(b1).arg === 'item:wood_oak');
  const b2 = navBack(b1);
  check('1i ...and again to the section page, its rail and scroll given back', navTop(b2).page === 'root' && navTop(b2).rail === 'armor' && navTop(b2).scroll === 140 && !navCanBack(b2));
  let h = navStart('bag');
  for (let i = 0; i < 30; i++) h = navPush(h, 'item', 'item:k' + i);
  check('1j the history is capped, the root kept', h.length === MENUS3_NAV.DEPTH + 1 && h[0].page === 'root' && navTop(h).arg === 'item:k29');
  check('1k frozen', Object.isFrozen(h) && Object.isFrozen(h[0]));
  const p = navPrune(h3, (pg) => pg.arg !== 'item:wood_oak');
  check('1l a page over a gone thing leaves, with the pages opened from it', p.length === 1 && navTop(p).page === 'root');
  check('1m nothing gone is no change', navPrune(h3, () => true) === h3);
  check('1n a scroll is whole px, never below 0', navTop(navKeep(h0, { scroll: -5 })).scroll === 0 && navTop(navKeep(h0, { scroll: 10.6 })).scroll === 11);
}

/* ── 2. the rail ── */
{
  check('2a the owner\'s seven, in order', MENUS3_RAIL.join() === 'all,gear,weapons,armor,consumables,materials,pets');
  const E = [
    { kind: 'item', key: 'wood_oak', gcat: 'wood' }, { kind: 'item', key: 'cooked_fish_cod', gcat: 'food' },
    { kind: 'stashWeapon', index: 0, gcat: 'sword' }, { kind: 'stashArmor', index: 0, gcat: 'chest' },
    { kind: 'item', key: 'manaShard', gcat: 'potion' }, { kind: 'item', key: 'iron_ore', gcat: 'ore' },
    { kind: 'item', key: 'quest_thing', gcat: 'quest' }, { kind: 'item', key: 'goldticket_x', gcat: 'other' },
  ];
  check('2b All is every entry, in order', railEntries(E, 'all').map((e) => e.key || e.kind).join() === E.map((e) => e.key || e.kind).join());
  check('2c a forged rail is All', railId('__proto__') === 'all' && railId('constructor') === 'all' && railEntries(E, 'toString').length === E.length);
  check('2d Weapons only weapons', railEntries(E, 'weapons').every((e) => MENUS3_RAIL_KINDS.weapons.includes(e.gcat)) && railEntries(E, 'weapons').length === 1);
  check('2e Armor only armour', railEntries(E, 'armor').length === 1 && railEntries(E, 'armor')[0].kind === 'stashArmor');
  check('2f Consumables food and potions', railEntries(E, 'consumables').map((e) => e.gcat).sort().join() === 'food,potion');
  check('2g Materials ore and wood here', railEntries(E, 'materials').map((e) => e.gcat).sort().join() === 'ore,wood');
  check('2h Gear and Pets draw their own pages', railEntries(E, 'gear').length === 0 && railEntries(E, 'pets').length === 0);
  check('2i no kind is under two filters', (() => { const seen = new Set(); for (const k of Object.keys(MENUS3_RAIL_KINDS)) for (const g of MENUS3_RAIL_KINDS[k]) { if (seen.has(g)) return false; seen.add(g); } return true; })());
  const c = railCounts(E, 3, 140, 2);
  check('2j the counts are the game\'s: All its length, Weapons the weapon bag against its cap', c.all === E.length && c.weapons === 3 && c.weaponsMax === 140 && c.pets === 2);
  check('2k a bad count is 0', railCounts(null, 'x', -1, NaN).all === 0 && railCounts(null, 'x', -1, NaN).weapons === 0);
  check('2l All never holds a pet (pets are not bag entries)', !railEntries(E, 'all').some((e) => e.kind === 'pet'));
}

/* ── 3. the grid ── */
{
  check('3a four across upright', gridCols(390) === 4 && gridCols(375) === 4 && gridCols(320) === 4);
  check('3b never fewer than four', gridCols(0) === 4 && gridCols(200) === 4);
  check('3c a computer\'s wide drawer more whole tiles', gridCols(1440 * 0.4) === 5 && gridCols(1920 * 0.4) >= 7);
}

/* ── 4. gear ── */
{
  check('4a the nine slots in the game\'s order', MENUS3_SLOTS.join() === 'sword,bow,staff,chest,legs,cape,shield,amulet,gem');
  const E = [{ gcat: 'sword' }, { gcat: 'bow' }, { gcat: 'sword' }, { gcat: 'chest' }];
  check('4b a slot\'s candidates only its kind', slotCandidates(E, 'sword').length === 2 && slotCandidates(E, 'chest').length === 1);
  check('4c no slot, no candidate', slotCandidates(E, 'hat').length === 0 && slotCandidates(null, 'sword').length === 0);
}

/* ── 5. counter actions ── */
{
  const ids = (a) => a.map((x) => x.id).join();
  check('5a Sell only where the item card sells', ids(counterActions('wood', { sell: true }, 'item')).indexOf('sell') === 0 && ids(counterActions('wood', {}, 'item')).indexOf('sell') < 0);
  check('5b the craft by kind', ids(counterActions('ore', {}, 'item')).includes('smelt') && ids(counterActions('fish', {}, 'item')).includes('cook')
    && ids(counterActions('gem', {}, 'item')).includes('setGem') && ids(counterActions('wood', {}, 'item')).includes('harden'));
  check('5c the Bank for a bag item, never a spare piece', ids(counterActions('food', {}, 'item')).includes('bank') && !ids(counterActions('sword', {}, 'stashWeapon')).includes('bank'));
  check('5d each says where', counterActions('ore', { sell: true }, 'item').every((c) => typeof c.where === 'string' && c.where.length > 3));
}

/* ── 6. the camera ── */
{
  check('6a upright open: the wireframe\'s 14%, whole px', menus3CamOffset(true, 'upright', 700) === Math.round(700 * MENUS3_PANEL.WORLD_SHIFT) && menus3CamOffset(true, 'upright', 333) === 47);
  check('6b none shut, none as the drawer', menus3CamOffset(false, 'upright', 700) === 0 && menus3CamOffset(true, 'drawer', 700) === 0);
  const mk = () => ({ camera: { x: 0, y: 0 }, _dtScale: 1 });
  const a = mk(), b = mk(), c = mk();
  followCamera(a, 500, 500, 400, 600, 0, 0, 0, true);
  followCamera(b, 500, 500, 400, 600, 0, 0, 0, true, 0);
  followCamera(c, 500, 500, 400, 600, 0, 0, 0, true, 84);
  check('6c without the shift the camera is yesterday\'s', a.camera.x === b.camera.x && a.camera.y === b.camera.y);
  check('6d the shift moves the aim down, never across', c.camera.y > a.camera.y && c.camera.x === a.camera.x);
  const d = mk();
  for (let i = 0; i < 400; i++) followCamera(d, 500, 500, 400, 600, 0, 0, 0, true, 84);
  check('6e it settles the bro 84 px higher on the screen', Math.abs(d.camera.y - (500 - 300 + 84)) < 0.5);
}

/* ── 7. the road ── */
{
  check('7a the Bag is built', MENUS3_BUILT.includes('bag'));
  const r = menus3Route('dock.bro', { built: MENUS3_BUILT });
  check('7b the Bro button opens the panel on the Bag, always', r.road === 'panel' && r.section === 'bag' && r.menu === 'bro');
  check('7c Power and Skills still today\'s', menus3Route('hud.face', { built: MENUS3_BUILT }).road !== 'panel' && !MENUS3_BUILT.includes('skills'));
}

console.log(`menus3-bag: ${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
