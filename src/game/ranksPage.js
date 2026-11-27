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

/* ═══ v2.3.6692: RANKS UNDER THE NEW DASHBOARD (card UI2-ranks, the build's step 6) ═══
 *
 * The owner's master specification, 2026-11-25, part 7: "Mirror character
 * inspection categories for competitive comparison: Combat, Life Skills,
 * Feats, Equipment where valid metrics exist. Actual leaderboard categories
 * must come from implemented rankings, not hypothetical metrics." and "Specific
 * leaderboard is a simple aligned standings list: Rank | Player
 * (portrait/name) | metric for this leaderboard. No unrelated combat level
 * when ranking a different skill. Clearly label metric units/category."
 * And 2026-11-26 (docs/design/UI_FEEDBACK_2026-11-26.md part 4): "Reduce the
 * metallic gradients across the first three rows while retaining the gold,
 * silver and bronze medals. Highlight the player's own row regardless of
 * rank."
 *
 * The rules of the new pages (dash/RanksLanding.jsx, dash/RankStandings.jsx,
 * dash/rankViews.jsx; tools/guards/ranks-ui2.test.mjs tests them):
 *   ranksGroups     the landing's three groups (as Bro's doors: Combat, Life
 *                   Skills, Feats; no Equipment: the worker keeps no gear
 *                   board) and Combat's door to the stat boards, nothing
 *                   dropped (a board no group names goes under Feats, last);
 *   ranksBoardHeads a board's name and its value's head (every value has its
 *                   unit word), and the one board that shows the level;
 *   youPinned       your row pinned at the foot ONLY while the real one is out
 *                   of the list's view: worked out from the kept scroll, the
 *                   rows' pitch and the list's kept size, never measured;
 *   passportFromRow another player's Character page, read ONLY from the row
 *                   the board sent (never your own state), "Not shared" where
 *                   the row is silent;
 *   ranksOpens      what a tap opens (a group, Points placed, a board, a
 *                   player: yours is the one Bro page, a deleted character's
 *                   is no door), with the entry's `sel` and `who`.
 * The functions above them are today's page's (`?ui2=0`), unchanged. */

/** The landing's groups, in Bro's order. */
export const RANKS_GROUPS = Object.freeze(['combat', 'life', 'feats']);
const COMBAT_IDS = Object.freeze(['power', 'melee', 'bow', 'magic', 'combat']);

/** The group a board sits under: 'combat', 'points' (the stat boards, behind
 *  Combat's Points placed), 'life', 'feats', or null for an id no group names. */
export function groupOf(id) {
  if (typeof id !== 'string') return null;
  if (COMBAT_IDS.includes(id)) return 'combat';
  if (id.startsWith(STAT_PREFIX) && id.length > STAT_PREFIX.length) return 'points';
  if (SKILL_IDS.includes(id)) return 'life';
  if (RECORD_IDS.includes(id)) return 'feats';
  return null;
}

/** The groups of the boards this worker keeps (`ids`, today's list's order):
 *  [{ id, boards: [...], points: [...] }], RANKS_GROUPS's order, a group with
 *  nothing in it left out.  `points` (Combat's only) the stat boards behind
 *  its Points placed door; a board no group names goes under Feats, last. */
export function ranksGroups(ids) {
  const by = Object.create(null);
  for (const g of RANKS_GROUPS) by[g] = [];
  const points = [];
  const loose = [];
  for (const id of Array.isArray(ids) ? ids : []) {
    if (typeof id !== 'string' || !id) continue;
    const g = groupOf(id);
    const into = g === 'points' ? points : g ? by[g] : loose;
    if (!into.includes(id)) into.push(id);
  }
  for (const id of loose) if (!by.feats.includes(id)) by.feats.push(id);
  const out = [];
  for (const g of RANKS_GROUPS) {
    const pts = g === 'combat' ? points : [];
    if (by[g].length === 0 && pts.length === 0) continue;
    out.push(Object.freeze({ id: g, boards: Object.freeze(by[g].slice()), points: Object.freeze(pts.slice()) }));
  }
  return Object.freeze(out);
}

/* a board's name under the new pages (the game's one vocabulary: Sword,
   Bow, Staff; the master notes' line 9) and its value's head, say keys of
   src/data/say/leaderboard.js; a stat board's name is its stat's own (the
   Bro tab's label, null here) */
const BOARD_WORD = Object.freeze({
  power: 'leaderboard.overallBoard', melee: 'leaderboard.swordBoard', bow: 'leaderboard.bowBoard', magic: 'leaderboard.staffBoard',
  combat: 'leaderboard.combatLevelBoard', kills: 'leaderboard.killsBoard', ap: 'leaderboard.apBoard',
  spin: 'leaderboard.spinBoard', flip: 'leaderboard.flipBoard', fish: 'leaderboard.fishBoard',
  woodcutting: 'leaderboard.woodcuttingBoard', fishing: 'leaderboard.fishingBoard', mining: 'leaderboard.miningBoard',
  farming: 'leaderboard.farmingBoard', cooking: 'leaderboard.cookingBoard', blacksmithing: 'leaderboard.smithingBoard',
  woodworking: 'leaderboard.woodworkingBoard', gemCutting: 'leaderboard.gemCuttingBoard', enchanting: 'leaderboard.enchantingBoard',
  trapping: 'leaderboard.trappingBoard',
});
const LEVEL_HEAD = 'leaderboard.levelHead';

/** A board's heads: { word, metric, lv } -- `word` its name's say key (null:
 *  a stat board, named by its stat), `metric` the value column's head (the
 *  unit: Level, Power, Points, Kills, AP, Gold, Weight; a board no table names
 *  says Score), `lv` true only where the level IS the value (Combat level):
 *  no other board shows a level (part 7: "No unrelated combat level"). */
export function ranksBoardHeads(id) {
  const k = typeof id === 'string' ? id : '';
  const word = Object.prototype.hasOwnProperty.call(BOARD_WORD, k) ? BOARD_WORD[k] : null;
  let metric = 'leaderboard.scoreHead';
  if (k === 'power') metric = 'leaderboard.powerHead';
  else if (k === 'melee' || k === 'bow' || k === 'magic' || k === 'combat' || SKILL_IDS.includes(k)) metric = LEVEL_HEAD;
  else if (groupOf(k) === 'points') metric = 'leaderboard.pointsHead';
  else if (k === 'kills') metric = 'leaderboard.killsHead';
  else if (k === 'ap') metric = 'leaderboard.apHead';
  else if (k === 'spin' || k === 'flip') metric = 'leaderboard.goldHead';
  else if (k === 'fish') metric = 'leaderboard.weightHead';
  return Object.freeze({ word, metric, lv: k === 'combat' });
}

/** Is your row pinned at the foot?  `rank` your place (0: not on the board),
 *  `scroll` the list's kept scroll, `pitch` a row's height with its gap (each
 *  row the same), `listH` the list's kept height.  The pinned copy lies over
 *  the list's last `pitch`, so it shows ONLY while the real row is out of
 *  view: below the list's foot (then wholly under the pinned copy), or wholly
 *  above its top.  A row partly scrolled off the top is still in view: one
 *  copy, never two.  Before the list is measured (`listH` 0) nothing pins. */
export function youPinned(rank, scroll, pitch, listH) {
  const r = Math.floor(Number(rank) || 0);
  const p = Number(pitch) || 0;
  const h = Number(listH) || 0;
  if (r < 1 || p <= 0 || h <= 0) return false;
  const s = Math.max(0, Number(scroll) || 0);
  const bottom = r * p;
  return bottom > s + h || bottom <= s;
}

const wholeOrNull = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
};
const NOT_SHARED = 'charPage.notShared';

/** Another player's Character page, from the board's row ONLY (card UI2-ranks
 *  reading 5; never one of your values under their name: the specification's
 *  1.2.1, "Explicitly identify another player's character").  `row` the row
 *  the worker sent (a rank row: id, name, look, series, ap, kills, clanTag; a
 *  records row: pid, name and little else); `board` { label, value } the
 *  board's own name and the row's number on it, as the board showed it.
 *  Returns { id, name, look, gone, combat, facts }: `combat` the best of the
 *  three weapons' levels (the worker's `lv`, leaderboard.js seriesValue
 *  'combat', which is prog3CharLevel's one level) or null; each fact
 *  { id, k, v } with `v` null and `none` where the row is silent (its words
 *  "Not shared", never a guess, never "No title equipped"); no door. */
export function passportFromRow(row, board) {
  const r = row && typeof row === 'object' ? row : {};
  const id = typeof r.id === 'string' && r.id ? r.id : (typeof r.pid === 'string' && r.pid ? r.pid : '');
  const s = r.series && typeof r.series === 'object' ? r.series : null;
  const w = (k) => (s ? wholeOrNull(s[k]) : null);
  const sword = w('melee'), bow = w('bow'), staff = w('magic');
  const best = [sword, bow, staff].filter((x) => x != null);
  const fact = (fid, k, v, extra) => Object.freeze({ id: fid, k, v: v == null ? null : v, none: v == null, ...(extra || {}) });
  const has = (k) => Object.prototype.hasOwnProperty.call(r, k);
  const facts = [];
  if (board && board.label && board.value != null && board.value !== '') facts.push(fact('board', null, String(board.value), { label: String(board.label) }));
  facts.push(fact('sword', 'charPage.sword', sword), fact('bow', 'charPage.bow', bow), fact('staff', 'charPage.staff', staff));
  facts.push(fact('ap', 'charPage.ap', has('ap') ? wholeOrNull(r.ap) : null));
  facts.push(fact('kills', 'leaderboard.killsHead', has('kills') ? wholeOrNull(r.kills) : null));
  facts.push(fact('clan', 'charPage.clan', typeof r.clanTag === 'string' && r.clanTag ? '[' + r.clanTag + ']' : null));
  facts.push(fact('title', 'charPage.title', null), fact('quests', 'charPage.quests', null));
  return Object.freeze({
    id,
    name: String(r.name == null ? '' : r.name).trim(),
    look: r.look && typeof r.look === 'object' ? r.look : null,
    gone: !!r.gone,
    combat: best.length ? Math.max(1, ...best) : null,
    facts: Object.freeze(facts),
    notShared: NOT_SHARED,
  });
}

/** What a tap opens, as the frame's push: { id, sel, who } or null (nothing).
 *  `tap`:
 *   { kind: 'group', group }           a group's page ('ranksGroup', sel the group);
 *   { kind: 'points' }                 Combat's Points placed ('ranksPoints');
 *   { kind: 'board', board, choice }   a board's standings ('ranksBoard', sel
 *                                      the board, and its choice after a ':':
 *                                      the spin's side, the fish's kind);
 *   { kind: 'row', row, meId, key, board }  a row: YOUR row is your one Bro
 *                                      page ('hero'); another player's their
 *                                      Character ('broCharacter', who = { id,
 *                                      name, look, passport }); a deleted
 *                                      character's row, or one with no id, opens
 *                                      nothing. */
export function ranksOpens(tap) {
  const t = tap || {};
  if (t.kind === 'group') return RANKS_GROUPS.includes(t.group) ? Object.freeze({ id: 'ranksGroup', sel: t.group, who: null }) : null;
  if (t.kind === 'points') return Object.freeze({ id: 'ranksPoints', sel: null, who: null });
  if (t.kind === 'board') {
    if (typeof t.board !== 'string' || !t.board) return null;
    return Object.freeze({ id: 'ranksBoard', sel: t.choice ? t.board + ':' + t.choice : t.board, who: null });
  }
  if (t.kind === 'row') {
    const r = t.row && typeof t.row === 'object' ? t.row : null;
    if (!r || r.gone) return null;
    const key = t.key === 'pid' ? 'pid' : 'id';
    const id = typeof r[key] === 'string' ? r[key] : '';
    if (!id) return null;
    if (typeof t.meId === 'string' && t.meId && id === t.meId) return Object.freeze({ id: 'hero', sel: null, who: null });
    const passport = passportFromRow({ ...r, id }, t.board || null);
    return Object.freeze({ id: 'broCharacter', sel: null, who: Object.freeze({ id, name: passport.name, look: passport.look, passport }) });
  }
  return null;
}

/** A board entry's `sel` read back: { board, choice } (ranksOpens wrote it). */
export function rankSel(sel) {
  const s = typeof sel === 'string' ? sel : '';
  const i = s.indexOf(':');
  return i < 0 ? { board: s, choice: null } : { board: s.slice(0, i), choice: s.slice(i + 1) || null };
}

/** The frame entry of page `id` in the workspace up (`nav` dashNav's state):
 *  the top one when it is that page, else the nearest under it, or null --
 *  the header's word for a group or a board, and its Back's. */
export function ranksEntry(nav, id) {
  const st = nav && nav[nav.ws];
  if (!Array.isArray(st)) return null;
  for (let i = st.length - 1; i >= 0; i--) if (st[i] && st[i].id === id) return st[i];
  return null;
}

/* v2.3.6692 (the mend of sitting 72, card UI2-ranks): a board's ANSWER, told
 * from no answer.  Held: the Coin flip board said "Nobody has won a flip
 * against Ace yet." before the worker had answered (its source claimed
 * `loading: false`, and the flip's store starts as an empty board).  So every
 * board's source hands its answer here, and NOTHING here is an answer but what
 * the worker sent: null (or undefined) is "not answered yet", and the page
 * shows the kit's placeholder; an answer with no rows is "answered, and
 * empty", and only then the board's "nobody" words.
 *
 *   kind     'ranked' (answer: the worker's rows, an array), 'spin', 'flip'
 *            ({ wins, losses }), 'fish' ({ boards: { [kind]: rows } })
 *   answer   what the worker sent, or null while it has not
 *   choice   the spin's and flip's side ('wins' | 'losses'), the fish's kind
 *   returns  { waiting, rows, state }: `state` 'off' or 'unavailable' when the
 *            worker said so (its words are the board's), else null */
export function rankAnswer(kind, answer, choice) {
  if (answer === null || typeof answer !== 'object') return Object.freeze({ waiting: true, rows: Object.freeze([]), state: null });
  if (answer.off) return Object.freeze({ waiting: false, rows: Object.freeze([]), state: 'off' });
  if (answer.unavailable) return Object.freeze({ waiting: false, rows: Object.freeze([]), state: 'unavailable' });
  let rows;
  if (kind === 'ranked') rows = answer;
  else if (kind === 'fish') rows = answer.boards && typeof answer.boards === 'object' ? answer.boards[choice] : null;
  else rows = choice === 'losses' ? answer.losses : answer.wins;
  return Object.freeze({ waiting: false, rows: Object.freeze(Array.isArray(rows) ? rows.filter(Boolean) : []), state: null });
}

/** v2.3.6692 (the same mend): the board list is the worker's answer too (its
 *  `caps`, at state_sync: LeaderboardPanel.jsx boardList).  A board or group
 *  the entry names but the list lacks is "nobody is on this board" only once
 *  the worker has said what it keeps; before (a kept entry drawn again before
 *  state_sync), it waits.  `caps` is S._serverCaps, or null. */
export function rankListWaiting(caps) {
  return caps === null || caps === undefined || typeof caps !== 'object';
}
