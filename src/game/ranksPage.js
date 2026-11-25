/* ═══ v2.3.5503: THE RANKS PAGE'S RULES (card LB, part 2) ═══
 *
 * The owner, 2026-11-25, with one mockup (docs/plan/status/assets/
 * ranks-mock-2026-11-25.jpg on the orchestrator's branch): "Also I prefer
 * changing the leaderboard style to something like this".  The page reads
 * as ONE board at a glance: which kind of board (four tabs across the top),
 * which board (one picker), who leads (gold, silver, bronze) and where YOU
 * stand (your row pinned at the foot).
 *
 * This file is the page's rules, so node tests them (server/test/
 * ranks-page.test.mjs) and the page (src/ui/mobile/dash/RanksPage.jsx) only
 * calls them:
 *   - which board sits under which tab (tabOf, ranksTabs): every board
 *     today's list has lands under one, none is dropped (a board no tab
 *     names goes under Records, last);
 *   - the tab, the board and the picker's list are ONE state with one
 *     transition function (ranksStart, ranksStep): the tab is never a second
 *     field that can disagree with the board;
 *   - a row's medal (medalOf) and what your pinned row says (youRow).
 * NO IMPORTS: node tests it, and the words stay in the say table. */

/** The four tabs, in the mockup's order. */
export const RANK_TABS = Object.freeze(['power', 'stats', 'records', 'skills']);

/* the boards each tab holds, by id (LeaderboardPanel.jsx's BATTLE, KILLS,
   AP_CAT, SPIN_CAT, FLIP_CAT, FISH_CAT and SKILLS); the Stats tab holds the
   stat boards, whose ids are `pts_<stat>` (card PW's statboards.js) */
const POWER_IDS = Object.freeze(['power', 'melee', 'bow', 'magic', 'combat']);
const RECORD_IDS = Object.freeze(['kills', 'ap', 'spin', 'flip', 'fish']);
const SKILL_IDS = Object.freeze(['woodcutting', 'fishing', 'mining', 'farming', 'cooking',
  'blacksmithing', 'woodworking', 'gemCutting', 'enchanting', 'trapping']);
const STAT_PREFIX = 'pts_';

/** The tab a board's id sits under, or null for an id no tab names. */
export function tabOf(id) {
  if (typeof id !== 'string') return null;
  if (POWER_IDS.includes(id)) return 'power';
  if (id.startsWith(STAT_PREFIX) && id.length > STAT_PREFIX.length) return 'stats';
  if (RECORD_IDS.includes(id)) return 'records';
  if (SKILL_IDS.includes(id)) return 'skills';
  return null;
}

/** The tabs with the boards this worker keeps (`ids`, today's list's order):
 *  [{ id, boards: [...] }], a tab with no board left out.  A board no tab
 *  names goes under Records, last, so no board is ever dropped. */
export function ranksTabs(ids) {
  const by = Object.create(null);
  for (const t of RANK_TABS) by[t] = [];
  const loose = [];
  for (const id of Array.isArray(ids) ? ids : []) {
    if (typeof id !== 'string' || !id) continue;
    const t = tabOf(id);
    const into = t ? by[t] : loose;
    if (!into.includes(id)) into.push(id);
  }
  by.records.push(...loose);
  return RANK_TABS.filter((t) => by[t].length > 0).map((t) => ({ id: t, boards: by[t] }));
}

/* the open board of a tab: the one last looked at there, or its first */
function boardIn(tabs, tab, last) {
  const t = tabs.find((x) => x.id === tab);
  if (!t) return null;
  const was = last && last[tab];
  return t.boards.includes(was) ? was : t.boards[0];
}

/* a state the tabs hold: the board kept if it is still kept, else the tab's
   remembered or first board, else the first tab's */
function settle(tabs, tab, board, menu, last) {
  if (tabs.length === 0) return Object.freeze({ tab: null, board: null, menu: false, last });
  const home = tabOf(board) || 'records';
  if (tabs.some((t) => t.id === home && t.boards.includes(board))) {
    return Object.freeze({ tab: home, board, menu: !!menu, last: remember(last, home, board) });
  }
  const t = tabs.some((x) => x.id === tab) ? tab : tabs[0].id;
  const b = boardIn(tabs, t, last);
  return Object.freeze({ tab: t, board: b, menu: false, last: remember(last, t, b) });
}

function remember(last, tab, board) {
  const out = Object.create(null);
  if (last) for (const k of RANK_TABS) if (typeof last[k] === 'string') out[k] = last[k];
  out[tab] = board;
  return Object.freeze(out);
}

/** The page's first state: on `want` (a board id: the one you last looked
 *  at, or the fish board the weigh-in card asks for) where this worker keeps
 *  it, else the first tab's first board.  The picker's list is shut. */
export function ranksStart(ids, want) {
  const tabs = ranksTabs(ids);
  return settle(tabs, null, want, false, null);
}

/** THE ONE TRANSITION.  `ev`:
 *   { type: 'tab', tab }     a tab tapped: its last board (or its first),
 *                            the list shut;
 *   { type: 'board', board } a board picked: its own tab, the list shut;
 *   { type: 'menu' }         the picker tapped: the list opens or shuts;
 *   { type: 'close' }        the list shut (its ✕, Escape, a tap outside);
 *   { type: 'fit' }          the worker's boards changed: the state settled
 *                            on what it still keeps.
 *  `ids` the boards this worker keeps.  Anything else changes nothing. */
export function ranksStep(state, ev, ids) {
  const tabs = ranksTabs(ids);
  const s = state || ranksStart(ids, null);
  const type = ev && ev.type;
  if (type === 'tab') {
    if (!tabs.some((t) => t.id === ev.tab)) return s;
    return settle(tabs, ev.tab, boardIn(tabs, ev.tab, s.last), false, s.last);
  }
  if (type === 'board') {
    const home = tabOf(ev.board) || 'records';
    if (!tabs.some((t) => t.id === home && t.boards.includes(ev.board))) return s;
    return settle(tabs, home, ev.board, false, s.last);
  }
  if (type === 'menu') return s.board ? Object.freeze({ ...s, menu: !s.menu }) : s;
  if (type === 'close') return s.menu ? Object.freeze({ ...s, menu: false }) : s;
  if (type === 'fit') return settle(tabs, s.tab, s.board, s.menu, s.last);
  return s;
}

/** A row's medal by its place: gold, silver and bronze for the first three
 *  (the mockup's laurel medals and bars), none below. */
export function medalOf(rank) {
  return rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : null;
}

/** Where you stand on a board's rows: { rank, row } -- your place (1-based)
 *  and your own row as the worker sent it, or { rank: 0, row: null } when
 *  you are not on it (the mockup's "Rank #—").  `key` the row's id field
 *  ('id' on the ranks, 'pid' on the records); `rows` the rows the page
 *  shows (AP leaves off a 0), so your place is the place you see. */
export function youRow(rows, meId, key = 'id') {
  if (!Array.isArray(rows) || typeof meId !== 'string' || !meId) return { rank: 0, row: null };
  const i = rows.findIndex((r) => !!r && r[key] === meId);
  return i < 0 ? { rank: 0, row: null } : { rank: i + 1, row: rows[i] };
}

/** "#12", or "#—" off the board: the pinned row's rank after its word. */
export function rankMark(rank) {
  return rank >= 1 ? '#' + Math.floor(rank) : '#—';
}

/* ═══ WHAT FITS: the page's sizes for its band ═══
   The band keeps today's height (191 px upright on a 390 x 844 phone,
   sheetGeometry panelInnerHeight; 82 px on its side): the world stays in
   sight above it.  The fixed parts take what they must and the rows share
   the rest:
   - TIGHT (an upright phone): the tabs, the picker's row, the heads and your
     row each on their own line, the rows sized so the first three -- who
     leads, gold, silver and bronze -- always show at once;
   - ONE ROW (a phone on its side): the tabs, the picker and your row share
     the one line at the top, no heads, the rows sized so two show;
   - ROOMY (a computer's tall band): the full sizes, as many rows as fit. */
const ROOMY_H = 300;   /* under it, the tight sizes */
const ONE_ROW_H = 150;   /* under it, one line at the top */
const FRAME_H = 6;   /* the page's own top and bottom air */
const ROW_MAX = 32;

/** The sizes for a band `h` px tall (0 until it is measured: the roomy
 *  ones).  `tabH` the tabs' row, `pickH` the picker's own row, `headH` the
 *  heads, `youH` your row (each 0 where it shares the tabs' line, `oneRow`,
 *  or is not drawn), `gap` the air under each part and each row, `rowH` a
 *  row. */
export function ranksFit(h) {
  const H = Math.max(0, Math.floor(Number(h) || 0));
  const tight = H > 0 && H < ROOMY_H;
  const oneRow = H > 0 && H < ONE_ROW_H;
  if (!tight) return Object.freeze({ tabH: 36, pickH: 30, headH: 22, youH: 40, gap: 3, oneRow, tight, rowH: ROW_MAX });
  const d = oneRow
    ? { tabH: 26, pickH: 0, headH: 0, youH: 0, gap: 2, show: 2, min: 20 }
    : { tabH: 28, pickH: 24, headH: 18, youH: 28, gap: 2, show: 3, min: 22 };
  const lines = oneRow ? 1 : 4;   /* the parts with air under them */
  const fixed = FRAME_H + d.tabH + d.pickH + d.headH + d.youH + d.gap * lines;
  const pitch = Math.floor((H - fixed) / d.show);
  const rowH = Math.max(d.min, Math.min(ROW_MAX, pitch - d.gap));
  return Object.freeze({ tabH: d.tabH, pickH: d.pickH, headH: d.headH, youH: d.youH, gap: d.gap, oneRow, tight, rowH });
}
