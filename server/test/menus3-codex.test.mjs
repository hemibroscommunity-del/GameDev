/* ═══ v2.3.6867: THE MAP AND WORLD · CODEX'S RULES (card MN step 8; src/game/menus3Codex.js, menus3Map.js) ═══
 *
 * The owner's Map and Codex in the new menus, their rules played on the
 * modules themselves.  This suite imports nothing from server/src: it tests
 * the page's own rules (as menus3-quests.test does) and does not deploy.
 *
 *   1. THE CODEX'S PAGES: its page names; a showcase door to the panel's
 *      page (an unknown door none); the kinds kept, a forged one Monsters;
 *      an item's arg there and back (a bar in a monster's id cannot split
 *      it); the body that draws a Codex page is the Codex's wherever it
 *      opened, any other page its section's;
 *   2. A QUEST'S LINKS: a monster its page, an item its page from the
 *      monster that drops it, a place the map's (no page); opened on the
 *      QUEST's history, so the one Back is the quest -- and a Codex page's
 *      own door, Back twice, is the quest again;
 *   3. THE ROAD: World's Codex tab is the panel's (built); the NEW MONSTER
 *      card opens World · Codex; the minimap still the map's road;
 *   4. THE MAP'S LIT STAR: lit from the open for LIT_MS, pulsing (each beat
 *      grows, the last fades), never before the open nor after; on the map
 *      the ring is the star's own place, off it the edge on the line from
 *      the middle toward it, inside the margin. */
import { CODEX3_PAGES, isCodex3Page, codex3Door, codex3Shelf, codex3ItemArg, codex3ItemOf, codex3Link, codex3Body, codex3MonsterOf, CODEX3_SHELVES } from '../../src/game/menus3Codex.js';
import { mapLit, mapEdge, MENUS3_MAP } from '../../src/game/menus3Map.js';
import { MENUS3_BUILT, MENUS3_ENTRIES, menus3Route } from '../../src/game/menus3Router.js';
import { navStart, navPush, navBack, navTop } from '../../src/game/menus3Nav.js';
import { questLinks } from '../../src/game/menus3Quests.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; return; }
  failures++;
  console.log('FAIL ' + name + (detail !== undefined ? ' -- ' + JSON.stringify(detail) : ''));
}

/* ── 1. the Codex's pages ── */
{
  check('1a the pages', CODEX3_PAGES.join() === 'cxMonster,cxCombat,cxLoot,cxHabitat,cxStory,cxItem,cxFound');
  check('1b a page is known, root and a forged one are not', isCodex3Page('cxLoot') && !isCodex3Page('root') && !isCodex3Page('__proto__') && !isCodex3Page(null));
  check('1c the showcase\'s four doors', codex3Door('codexCombat') === 'cxCombat' && codex3Door('codexLoot') === 'cxLoot'
    && codex3Door('codexHabitat') === 'cxHabitat' && codex3Door('codexStory') === 'cxStory');
  check('1d an unknown door opens nothing', codex3Door('codexFound') === null && codex3Door('__proto__') === null && codex3Door(7) === null);
  check('1e today\'s six kinds, Monsters first', CODEX3_SHELVES.join() === 'monsters,items,resources,townsfolk,lands,pets');
  check('1f a kept kind stays, a forged one is Monsters', codex3Shelf('pets') === 'pets' && codex3Shelf('__proto__') === 'monsters' && codex3Shelf(null) === 'monsters');
  const a = codex3ItemArg('slime', 'slime_gel');
  const back = codex3ItemOf(a);
  check('1g an item\'s arg there and back', a === 'slime|slime_gel' && back.kind === 'slime' && back.key === 'slime_gel', back);
  const b = codex3ItemOf(codex3ItemArg('sl|ime', 'gel'));
  check('1h a bar in the monster cannot split the item', b && b.key === 'gel', b);
  check('1i no monster: the item alone', codex3ItemOf(codex3ItemArg(null, 'ore')).kind === null && codex3ItemOf(codex3ItemArg(null, 'ore')).key === 'ore');
  check('1j no item: no arg', codex3ItemArg('slime', '') === null && codex3ItemArg('slime', null) === null && codex3ItemOf('nobar') === null && codex3ItemOf('x|') === null);
  check('1k a Codex page is the Codex\'s body wherever it opened', codex3Body({ section: 'quests', page: 'cxMonster' }, 'quests') === 'codex'
    && codex3Body({ section: 'codex', page: 'root' }, 'codex') === 'codex' && codex3Body({ section: 'quests', page: 'quest' }, 'quests') === 'quests'
    && codex3Body(null, 'bag') === 'bag');
  check('1l the monster a page is about', codex3MonsterOf({ page: 'cxLoot', arg: 'frog' }) === 'frog' && codex3MonsterOf({ page: 'cxItem', arg: 'frog|hide' }) === 'frog'
    && codex3MonsterOf({ page: 'cxFound', arg: 'hide' }) === null && codex3MonsterOf({ page: 'quest', arg: 'q1' }) === null);
}

/* ── 2. a quest's links open the new Codex's pages, on the quest's history ── */
{
  const quest = { need: { key: 'slime_gel' } };
  const page = { status: 'active', where: { map: true, text: 'Goo Grotto' } };
  const links = questLinks(quest, page, { slime: 'slime_gel', frog: 'hide' }, () => true);
  const to = links.map((l) => codex3Link(l));
  check('2a a monster its page, the item its page from that monster, the place none', to[0] && to[0].page === 'cxMonster' && to[0].arg === 'slime'
    && to[1] && to[1].page === 'cxItem' && to[1].arg === 'slime|slime_gel' && to[2] === null, to);
  check('2b a broken link opens nothing', codex3Link(null) === null && codex3Link({ kind: 'monster' }) === null && codex3Link({ kind: 'item', from: 'x' }) === null && codex3Link({ kind: 'place' }) === null);
  /* the quest's history: its own page, the quest, then the link's page over it */
  let h = navStart('quests');
  h = navPush(h, 'quest', 'q1');
  h = navPush(h, to[0].page, to[0].arg);
  check('2c the Codex page opens over the quest, in the quest\'s history', navTop(h).page === 'cxMonster' && navTop(h).section === 'quests' && codex3Body(navTop(h), 'quests') === 'codex');
  h = navBack(h);
  check('2d the one Back is the quest', navTop(h).page === 'quest' && navTop(h).arg === 'q1');
  let k = navPush(navPush(navPush(navStart('quests'), 'quest', 'q1'), 'cxMonster', 'slime'), codex3Door('codexLoot'), 'slime');
  k = navPush(k, 'cxItem', codex3ItemArg('slime', 'slime_gel'), { rail: 'slime_gel' });
  check('2e a door and a row deeper, the row kept on Loot', navTop(navBack(k)).page === 'cxLoot' && navTop(navBack(k)).rail === 'slime_gel');
  k = navBack(navBack(navBack(k)));
  check('2f ...Back three times is the quest', navTop(k).page === 'quest');
}

/* ── 3. the road ── */
{
  check('3a the Codex is built', MENUS3_BUILT.includes('codex'));
  const r = menus3Route('card.newMonster', { built: MENUS3_BUILT });
  check('3b the NEW MONSTER card opens World · Codex in the panel', r && r.road === 'panel' && r.menu === 'world' && r.section === 'codex', r);
  const t = menus3Route('card.newMonster', { built: [] });
  check('3c not built: today\'s Codex page', t && t.road === 'page' && t.page === 'encyclopedia', t);
  const m = menus3Route('hud.minimap', { built: MENUS3_BUILT });
  check('3d the minimap: the map\'s road (the World map, full screen)', m && m.road === 'map' && m.menu === null, m);
  check('3e the entries the card adds', Object.prototype.hasOwnProperty.call(MENUS3_ENTRIES, 'card.newMonster'));
}

/* ── 4. the map's lit star ── */
{
  const L = MENUS3_MAP.LIT_MS, B = MENUS3_MAP.PULSE_MS;
  check('4a lit at the open', !!mapLit(1000, 1000));
  check('4b not before the open, nor once the light is over', mapLit(1000, 999) === null && mapLit(1000, 1000 + L) === null && mapLit(1000, 1000 + L + 5000) === null);
  check('4c no clock: nothing', mapLit(undefined, 5) === null && mapLit(1, NaN) === null);
  const a = mapLit(0, 10), b = mapLit(0, B * 0.8);
  check('4d a beat grows the ring', b.r > a.r && a.r >= MENUS3_MAP.R0 && b.r <= MENUS3_MAP.R1, [a, b]);
  check('4e the beats repeat', Math.abs(mapLit(0, B + 10).r - a.r) < 1e-9);
  check('4f the last beat fades out', mapLit(0, L - 20).alpha < mapLit(0, L - B - 20).alpha && mapLit(0, L - 20).alpha >= 0, [mapLit(0, L - 20), mapLit(0, L - B - 20)]);
  const on = mapEdge(100, 120, 400, 300, 24);
  check('4g a star on the map: its own place', on.x === 100 && on.y === 120 && on.edge === false, on);
  const right = mapEdge(900, 150, 400, 300, 24);
  check('4h off to the right: the right edge, level with the middle', right.edge && Math.abs(right.x - 376) < 1e-9 && Math.abs(right.y - 150) < 1e-9, right);
  const corner = mapEdge(-1000, -2000, 400, 300, 24);
  check('4i off to the top left: inside the margin, on the line from the middle', corner.edge && corner.x >= 24 - 1e-9 && corner.y >= 24 - 1e-9
    && Math.abs((corner.y - 150) * (-1000 - 200) - (corner.x - 200) * (-2000 - 150)) < 1e-6, corner);
  const near = mapEdge(10, 150, 400, 300, 24);
  check('4j inside the margin counts as off: moved in to the margin', near.edge && Math.abs(near.x - 24) < 1e-9, near);
  check('4k no star: nothing', mapEdge(NaN, 1, 400, 300, 24) === null);
}

console.log(`menus3-codex: ${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
