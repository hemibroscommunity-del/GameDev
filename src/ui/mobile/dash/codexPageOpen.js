/* ═══ v2.3.6693: THE CODEX'S PAGES: WHAT OPENS THEM, AND WHAT THEY READ (card UI2-codex) ═══
 *
 * The collection is BottomDashboard's PANELS `encyclopedia` (so every opener
 * works unchanged: the Menu's tile and K, the NEW MONSTER card, the Town
 * Board's row, a profile's button).  A monster's showcase and its four doors
 * are pages of the dashboard's frame, hung as the one item page is (a PANELS
 * row each, a title getter here, dash/MonsterShowcase.jsx drawing them):
 *   codexMonster  the showcase (the frame's title its name);
 *   codexCombat   how it fights, with today's stage;
 *   codexLoot     its drops as plain rows; a row opens the one item page;
 *   codexHabitat  its land, both stages' levels, the way there, its dungeon;
 *   codexStory    its tale and its elder form;
 *   codexFound    the item page's "Found from" (every monster that drops it).
 * Each is pushed with its monster as the entry's `sel` (dashNav keeps it per
 * visit, so Back through a journey of two monsters finds each its own);
 * `codexFound` reads its item from the item page under it (itemPageBus).
 *
 * The game's state comes FROM THE OPENER (the panel's getter, as Quests'
 * pages take theirs: open-hand.test closes window._gameState to new readers),
 * kept here for the pages and the titles. */
import { dashboardPanelBus } from '../dashboardPanelBus.js';
import { dashNavView } from '@/game/dashNav.js';
import { CODEX_ENTRIES } from '@/data/monsterCodex.js';
import { codexMet } from '@/game/codexView.js';
import { codexCounts } from '@/game/monsterCodex.js';
import { SAY } from '@/data/say/codexPages.js';
import { SAY as SAY_CX } from '@/data/say/monsterCodex.js';
import { say } from '@/game/say.js';
import { itemPageBus } from './itemPageOpen.js';

/** The Codex's frame pages (each a PANELS row in BottomDashboard.jsx). */
export const CODEX_PAGES = Object.freeze(['codexMonster', 'codexCombat', 'codexLoot', 'codexHabitat', 'codexStory', 'codexFound']);
export const isCodexPage = (id) => CODEX_PAGES.includes(id);

let _getS = () => null;
/** The game's state, by the getter the opener handed over. */
export function codexS() { try { return _getS() || null; } catch (e) { return null; } }

/** v2.3.6867 (card MN step 8): the new panel's Codex hands its getter over as it draws (its pages read codexS) */
export function codexUseS(getS) { if (typeof getS === 'function') _getS = getS; }

/** Open a monster's showcase (`getS`: the opener's getter of the game's state). */
export function openCodexMonster(kind, getS) {
  if (!Object.prototype.hasOwnProperty.call(CODEX_ENTRIES, kind)) return;
  if (typeof getS === 'function') _getS = getS;
  try { dashboardPanelBus.push('codexMonster', { sel: kind }); } catch (e) { /* no frame: nothing to draw it in */ }
}

/** A showcase's door: its page, for the same monster. */
export function openCodexDoor(page, kind) {
  if (!isCodexPage(page) || !Object.prototype.hasOwnProperty.call(CODEX_ENTRIES, kind)) return;
  try { dashboardPanelBus.push(page, { sel: kind }); } catch (e) { /* no frame */ }
}

/** The page on top: { id, key, kind, row } (`row`: Loot's last opened row,
    kept as `kind|row`), or null when the top is not a Codex page. */
export function codexTop() {
  let t = null;
  try { t = dashNavView(dashboardPanelBus.nav()).top; } catch (e) { t = null; }
  if (!t || !isCodexPage(t.id)) return null;
  const sel = typeof t.sel === 'string' ? t.sel : '';
  const bar = sel.indexOf('|');
  return { id: t.id, key: t.key, kind: bar >= 0 ? sel.slice(0, bar) : sel, row: bar >= 0 ? sel.slice(bar + 1) : null };
}

/** Loot keeps the row it opened (Back to Loot finds it there). */
export function keepCodexRow(top, row) {
  if (!top || top.key == null) return;
  try { dashboardPanelBus.go({ type: 'keep', key: top.key, sel: top.kind + '|' + row }); } catch (e) { /* the frame went */ }
}

/** The item "Found from" is about: the item page's own source. */
export function codexFoundKey() {
  const s = itemPageBus.state;
  return s && s.from === 'codex' ? s.key : null;
}

/* the newest visit of page `id` on the workspace up (the header names the
   page under the top in its Back, so the title is asked of pages below too) */
function kindOfVisit(id) {
  let n = null;
  try { n = dashboardPanelBus.nav(); } catch (e) { n = null; }
  const stack = n && n[n.ws];
  if (!Array.isArray(stack)) return null;
  for (let i = stack.length - 1; i >= 0; i--) {
    if (stack[i].id !== id) continue;
    const sel = typeof stack[i].sel === 'string' ? stack[i].sel : '';
    return sel.split('|')[0] || null;
  }
  return null;
}

/** The header's title for Codex page `id`. */
export function codexPageTitle(id) {
  const kind = kindOfVisit(id);
  switch (id) {
    case 'codexMonster': {
      const e = kind && Object.prototype.hasOwnProperty.call(CODEX_ENTRIES, kind) ? CODEX_ENTRIES[kind] : null;
      if (!e) return say(SAY, 'codexPages.shelfMonsters');
      return codexMet(codexCounts(codexS(), kind)[0]) ? e.name : say(SAY_CX, 'monsterCodex.unknownName');
    }
    case 'codexCombat': return say(SAY, 'codexPages.doorCombat');
    case 'codexLoot': return say(SAY, 'codexPages.doorLoot');
    case 'codexHabitat': return say(SAY, 'codexPages.doorHabitat');
    case 'codexStory': return say(SAY, 'codexPages.doorStory');
    default: return say(SAY_CX, 'monsterCodex.itemFoundFrom');
  }
}
