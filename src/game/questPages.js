/* ═══ v2.3.6620: THE QUESTS TAB IN PAGES (card QP) ═══
 *
 * The owner, 2026-11-25, of the Bro tab first ("it shows "pages" where all
 * the information needs to be displayed together (instead of scrolling little
 * by little) so all related information is shown at once ... Players see the
 * big picture first and can investigate the details whenever they want"),
 * then of this tab, with three mockups: "Same idea here I want the quest menu
 * redesigned to this".
 *
 * So the Quests tab is three pages, each whole on an upright phone with no
 * scrolling:
 *   quest    (opens first) the row Active (n) | Daily | Completed, the
 *            quest's head (the giver's face, its name, its state and giver,
 *            Track), what to do NOW (its picture, words, count and bar),
 *            WHERE (with Map), and the REWARDS in one row of tiles;
 *   journey  the same head, then the quest's steps as a line: done steps
 *            green with their tick, the one in hand gold with its count, the
 *            ones to come grey;
 *   rewards  the head with the count, the completion rewards as tiles, and
 *            the quest that comes next.
 * The Daily and Completed tabs, and the picker of your quests (Active, then
 * Available), are today's lists and may scroll.
 *
 * THE RULES ARE HERE, the drawing in src/ui/mobile/dash/QuestPages.jsx:
 *   - what is shown is ONE field, `view`, changed by ONE function,
 *     `questPagesStep(at, tap)`: never a second flag beside it;
 *   - which quest the pages are about (`shownQuest`): the one picked by hand
 *     while it stays where it was picked, else the quest you are on;
 *   - the steps of the journey and the state of each (`journeySteps`);
 *   - whether the three pages stand side by side (`pagesSideBySide`).
 * Every word a player reads is the journal's (game/questJournal.js
 * journalPage) or the page's word table (data/say/questPages.js): this file
 * makes none.
 *
 * NO IMPORTS: server/test/quest-pages.test.mjs runs it in node.
 */

/** The three pages of a quest, in the order of their marks. */
export const PAGES = Object.freeze(['quest', 'journey', 'rewards']);

/** Everything the tab can show: the three pages, the picker of your quests,
 *  and the Daily and Completed tabs. */
export const VIEWS = Object.freeze(['quest', 'journey', 'rewards', 'pick', 'daily', 'done']);

/** The tabs of the top row, in order. */
export const TABS = Object.freeze(['active', 'daily', 'done']);

/* the page's box from this width on holds the three pages side by side
   (a phone on its side, a tablet, a wide computer's band) */
export const SIDE_BY_SIDE_W = 600;

const has = (list, v) => list.indexOf(v) >= 0;

/** Where the tab starts: page 1, nothing picked. */
export function questPagesStart() {
  return { view: 'quest', pick: null };
}

/** THE ONE TRANSITION.  `at` { view, pick }; `tap` one of:
 *    { kind: 'open' }                 the tab opened (the band, a road to it):
 *                                     page 1 of the quest you are on, a quest
 *                                     picked by hand kept unless it was a done one;
 *    { kind: 'quest', id, group }     a road that names a quest (the pinned
 *                                     card's "Open quest"): its page 1;
 *    { kind: 'tab', tab }             a tab of the top row: Active is page 1;
 *    { kind: 'mark', page }           a page mark;
 *    { kind: 'now' }                  the "what to do now" block: the journey;
 *    { kind: 'rewards' }              the rewards row: page 3;
 *    { kind: 'head', choices }        the head of a quest: the picker, when
 *                                     there is more than one quest to pick;
 *    { kind: 'choose', id, group }    a quest in the picker or the Completed
 *                                     list: its page 1;
 *    { kind: 'back' }                 the picker's or a done quest's back chip.
 *  Anything else leaves `at` as it is.  Never changes `at`: returns a new one. */
export function questPagesStep(at, tap) {
  const cur = at && has(VIEWS, at.view) ? at : questPagesStart();
  const pick = cur.pick || null;
  const k = tap && tap.kind;
  if (k === 'open') {
    return { view: 'quest', pick: pick && pick.group !== 'done' ? pick : null };
  }
  if (k === 'quest' || k === 'choose') {
    if (typeof tap.id !== 'string' || !tap.id) return cur;
    return { view: 'quest', pick: { id: tap.id, group: typeof tap.group === 'string' ? tap.group : null } };
  }
  if (k === 'tab') {
    if (tap.tab === 'daily') return { view: 'daily', pick };
    if (tap.tab === 'done') return { view: 'done', pick };
    if (tap.tab === 'active') return { view: 'quest', pick: pick && pick.group === 'done' ? null : pick };
    return cur;
  }
  if (k === 'mark') return has(PAGES, tap.page) ? { view: tap.page, pick } : cur;
  if (k === 'now') return { view: 'journey', pick };
  if (k === 'rewards') return { view: 'rewards', pick };
  if (k === 'head') return Number(tap.choices) > 1 ? { view: 'pick', pick } : cur;
  if (k === 'back') {
    if (cur.view === 'pick') return { view: 'quest', pick };
    if (pick && pick.group === 'done') return { view: 'done', pick: null };
    return cur;
  }
  return cur;
}

/** The quest the pages are about: `{ id, group }` or null.  The one picked by
 *  hand while it is still in the group it was picked from (`groupOf(id)`:
 *  'active' | 'available' | 'done' | null); once it changes hands (taken,
 *  handed in) the quest you are on (`focusId`, the journal's), as the old
 *  page did. */
export function shownQuest(at, groupOf, focusId) {
  const pick = at && at.pick;
  const g = typeof groupOf === 'function' ? groupOf : () => null;
  if (pick && typeof pick.id === 'string' && g(pick.id) === pick.group) return { id: pick.id, group: pick.group };
  if (typeof focusId === 'string' && focusId) return { id: focusId, group: g(focusId) };
  return null;
}

/** What the tab draws, from `at.view` and what there is: a page needs a
 *  quest (with none: the Completed list when something is done, else
 *  'none'); Daily needs the daily rewards (`dailyOn`). */
export function shownView(at, { quest, dailyOn, doneCount } = {}) {
  const v = at && has(VIEWS, at.view) ? at.view : 'quest';
  if (v === 'daily') return dailyOn ? 'daily' : (quest ? 'quest' : 'none');
  if (v === 'done') return 'done';
  if (!quest) return Number(doneCount) > 0 ? 'done' : 'none';
  return v;
}

/** The lit tab of the top row for a view and the group of the quest shown. */
export function litTab(view, group) {
  if (view === 'daily') return 'daily';
  if (view === 'done') return 'done';
  if (has(PAGES, view) && group === 'done') return 'done';
  return 'active';
}

/** The three pages side by side?  From the page's own measured width (0
 *  until measured: the upright phone's one page at a time). */
export function pagesSideBySide(w) {
  return Number(w) >= SIDE_BY_SIDE_W;
}

/** The marks of the three pages (drawn one page at a time only):
 *  [{ page, lit }]. */
export function pageMarks(view) {
  return PAGES.map((p) => ({ page: p, lit: p === view }));
}

/** THE JOURNEY: the quest's steps as a line, from its journal page
 *  (game/questJournal.js journalPage) and the quest's own objective `desc`.
 *  [{ kind, state, text, sub, items, count, where }] with
 *    kind   'talk'    the giver: talked to (and what he handed over), or to talk to;
 *           'step'    a step of the quest, or its one objective;
 *           'handin'  handing it in to the giver;
 *    state  'done' (green, a tick) | 'current' (gold, its count) | 'todo' (grey).
 *  `text` null on a hand-in still ahead: the page says "Hand it in to {npc}"
 *  from its word table (the journal says it only once the quest is ready). */
export function journeySteps(page, desc) {
  if (!page || !page.who) return [];
  const st = page.status;
  const who = page.who;
  const inHand = st === 'active' || st === 'ready';
  const taken = inHand || st === 'done';
  const out = [];
  /* the giver: talked to once the quest is taken (nothing else records a talk) */
  out.push({
    kind: 'talk', state: taken ? 'done' : st === 'available' ? 'current' : 'todo',
    text: taken ? who.talked : who.todo,
    sub: page.given ? page.given.note : null,
    items: page.given ? page.given.items : [],
    count: null, where: null,
  });
  const steps = Array.isArray(who.steps) ? who.steps : [];
  const count = page.now && page.now.count ? page.now.count.text : null;
  const where = page.where ? page.where.text : null;
  if (steps.length) {
    for (const s of steps) {
      const state = s.done || st === 'ready' ? 'done' : s.current ? 'current' : 'todo';
      out.push({ kind: 'step', state, text: s.label, sub: null, items: [], count: state === 'current' ? count : null, where: state === 'current' ? where : null });
    }
  } else {
    const state = st === 'active' ? 'current' : (st === 'ready' || st === 'done') ? 'done' : 'todo';
    out.push({ kind: 'step', state, text: typeof desc === 'string' ? desc : '', sub: null, items: [], count: state === 'current' ? count : null, where: state === 'current' ? where : null });
  }
  const handState = st === 'done' ? 'done' : st === 'ready' ? 'current' : 'todo';
  out.push({
    kind: 'handin', state: handState, text: who.handIn || null,
    sub: st === 'ready' && page.now ? page.now.goal : null,
    items: [], count: null, where: st === 'ready' ? where : null,
  });
  return out;
}

/** The step to bring into view when the journey opens (it may scroll for a
 *  quest of more than four steps): the one in hand, else the last done, else
 *  the first.  -1 for no steps. */
export function journeyFocus(steps) {
  if (!Array.isArray(steps) || !steps.length) return -1;
  const cur = steps.findIndex((s) => s && s.state === 'current');
  if (cur >= 0) return cur;
  let last = 0;
  steps.forEach((s, i) => { if (s && s.state === 'done') last = i; });
  return last;
}

/** The reward tiles, in the mockup's order: gold, XP, the achievement
 *  points, then the items (with their pictures), then the reward named
 *  without a picture.  [{ kind, n?, icon?, label? }] */
export function rewardTiles(reward) {
  if (!reward) return [];
  const out = [];
  if (reward.gold > 0) out.push({ kind: 'gold', n: reward.gold });
  if (reward.xp > 0) out.push({ kind: 'xp', n: reward.xp });
  if (reward.ap > 0) out.push({ kind: 'ap', n: reward.ap });
  for (const it of reward.items || []) if (it && (it.icon || it.label)) out.push({ kind: 'item', icon: it.icon || null, label: it.label || '' });
  if (reward.itemText) out.push({ kind: 'item', icon: null, label: reward.itemText });
  return out;
}

/** How many quests the picker offers: those in hand and those on offer. */
export function pickChoices(list) {
  if (!list) return 0;
  return (list.active ? list.active.length : 0) + (list.available ? list.available.length : 0);
}
