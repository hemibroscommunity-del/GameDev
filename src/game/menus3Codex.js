/* ═══ v2.3.6867: WORLD · CODEX IN THE NEW PANEL -- ITS PAGES AND ITS LINKS (card MN step 8) ═══
 *
 * The owner's World menu (docs/design/menus3/SPEC.md: "Quests, Codex,
 * Feats"): the header's Codex tab, the K key and the NEW MONSTER card open
 * the Codex in the panel; today's Codex is what it holds (dash/CodexPage.jsx,
 * src/game/codexView.js: the six kinds Monsters, Items, Resources,
 * Townsfolk, Lands, Pets -- only Monsters has pages today, the others their
 * honest line, Pets its one door to the pet journal).  A card opens the
 * monster's page IN the panel with the one Back (src/game/menus3Nav.js); its
 * four doors (Combat, Loot, Where it lives, Story) are pages of the panel
 * too, a drop's row opens the item's page, the item's "Found from" every
 * monster that drops it.  These are the panel's page names, and the way a
 * quest's link (src/game/menus3Quests.js questLinks) becomes one of them:
 * the Quests' deep links open the NEW pages now, on the quest's own history,
 * so the one Back returns to the quest (step 7 sent them to today's pages
 * through menus3Away).
 *
 * No imports: node's suite reads it (server/test/menus3-codex.test.mjs). */

/** The Codex's pages in the panel (beside the section's own, 'root'). */
export const CODEX3_PAGES = Object.freeze(['cxMonster', 'cxCombat', 'cxLoot', 'cxHabitat', 'cxStory', 'cxItem', 'cxFound']);
export function isCodex3Page(p) { return typeof p === 'string' && CODEX3_PAGES.indexOf(p) >= 0; }

/* a showcase's door (src/game/entityInspect.js monsterShowcase: today's frame page) -> the panel's */
const DOOR_PAGE = Object.freeze({ codexCombat: 'cxCombat', codexLoot: 'cxLoot', codexHabitat: 'cxHabitat', codexStory: 'cxStory' });
/** The panel page a showcase door opens, or null for a door it does not know. */
export function codex3Door(page) {
  return typeof page === 'string' && Object.prototype.hasOwnProperty.call(DOOR_PAGE, page) ? DOOR_PAGE[page] : null;
}

/* the kinds, today's order (codexView.js SHELF_IDS): Monsters the one chosen on opening */
export const CODEX3_SHELVES = Object.freeze(['monsters', 'items', 'resources', 'townsfolk', 'lands', 'pets']);
/** A shelf kept on the Codex's own page (its `rail`), or Monsters. */
export function codex3Shelf(id) { return CODEX3_SHELVES.indexOf(id) >= 0 ? id : 'monsters'; }

/** An item's page's arg: the monster it was opened from and the item's key
 *  ("Drops from" reads the monster's chance; none: '' before the bar). */
export function codex3ItemArg(kind, key) {
  if (typeof key !== 'string' || !key) return null;
  return (typeof kind === 'string' ? kind.replace(/\|/g, '') : '') + '|' + key;
}
/** ...and read back: { kind, key }, or null. */
export function codex3ItemOf(arg) {
  if (typeof arg !== 'string') return null;
  const bar = arg.indexOf('|');
  if (bar < 0) return null;
  const key = arg.slice(bar + 1);
  return key ? { kind: arg.slice(0, bar) || null, key } : null;
}

/** A quest's link -> the panel page it opens: a monster its page, an item
 *  its page (from the monster that drops it); a place is the map's, never a
 *  page (null), as is anything unknown. */
export function codex3Link(l) {
  if (!l || typeof l !== 'object') return null;
  if (l.kind === 'monster' && typeof l.id === 'string' && l.id) return { page: 'cxMonster', arg: l.id };
  if (l.kind === 'item') {
    const arg = codex3ItemArg(l.from, l.key);
    return arg ? { page: 'cxItem', arg } : null;
  }
  return null;
}

/** Which of the panel's bodies draws page `top` ({ section, page }): a Codex
 *  page is the Codex's wherever it was opened (a quest's link opens it on the
 *  quest's history), else the section's own. */
export function codex3Body(top, section) {
  if (top && isCodex3Page(top.page)) return 'codex';
  return typeof section === 'string' ? section : '';
}

/** The monster a page is about (its arg for the monster and its doors; for
 *  an item's page the monster it was opened from), or null. */
export function codex3MonsterOf(top) {
  if (!top || !isCodex3Page(top.page)) return null;
  if (top.page === 'cxItem') { const it = codex3ItemOf(top.arg); return it ? it.kind : null; }
  if (top.page === 'cxFound') return null;
  return typeof top.arg === 'string' && top.arg ? top.arg : null;
}
