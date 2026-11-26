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

/* ═══ v2.3.6691: QUESTS UNDER THE NEW DASHBOARD (card UI2-quests, the build's step 6) ═══
 * The owner's master specification, 2026-11-25, part 6: "Landing page shows
 * active quests first, as direct selectable rows/destinations. No tiny
 * dropdown or three-dot pagination. Daily quests and Completed quests are
 * secondary destinations."; "Individual quest shows journey first, with
 * completed steps and the current objective visually dominant ... Future
 * journey is open-ended: do not reveal future steps, total step count, or
 * whole-quest completion percentage. A neutral indication that the adventure
 * continues is sufficient for an ongoing quest. Completed quests show actual
 * completed history. Story and Rewards are separate accessible destinations."
 * The rules of the frame's Quests pages (dash/QuestsLanding.jsx,
 * dash/QuestPage.jsx) are the four below; the pages above (the tabs, the
 * marks, the picker) stay what `?ui2=0` draws, unchanged.  Story is left
 * out: the game has no story text for a quest (the audit's part 5). */

/** The frame's own Quests pages beside the quest's page (`questDetail`,
 *  BottomDashboard's PANELS): src/game/dashDests.js FRAME_PAGES rows. */
export const QUEST_FRAME_PAGES = Object.freeze(['questRewards', 'questsDaily', 'questsDone', 'questsOffers']);

/** The landing's doors, in their order, each with the page it pushes. */
export const LANDING_DOORS = Object.freeze({ daily: 'questsDaily', done: 'questsDone', offers: 'questsOffers' });

const countOf = (c) => (c && Number(c.n) > 0 && Number.isFinite(Number(c.have)) ? { have: Math.max(0, Math.min(Number(c.have), Number(c.n))), n: Number(c.n) } : null);

/** THE LANDING: your quests in hand as rows, and under them the doors.
 *  `L` the journal's list (questJournalModel.js questJournalList: active,
 *  available, done); `ctx`:
 *    known    the worker's answer is in (the room's state_sync): false is
 *             'loading', never an empty list (the spec's Q84);
 *    dailyOn  the game shows its daily rewards card today;
 *    tracked  the tracked quest's id;
 *    counts   { [id]: { have, n } } a row's count where its quest counts.
 *  -> { kind: 'loading' | 'rows' | 'empty', rows, doors }
 *    rows   [{ id, title, npc, ready, tracked, count }] the tracked quest
 *           first, then the ones ready to hand in, then the rest, each group
 *           in the journal's order (questJournal.js activeOrder's reading);
 *    doors  [{ id, page, n }]: Daily (only when the game shows it), Completed
 *           (n), On offer (n) when the journal lists offers. */
export function questLanding(L, ctx) {
  const c = ctx || {};
  if (!c.known || !L) return { kind: 'loading', rows: [], doors: [] };
  const tracked = typeof c.tracked === 'string' && c.tracked ? c.tracked : null;
  const counts = c.counts || null;
  const active = Array.isArray(L.active) ? L.active : [];
  const rows = active.filter((r) => r && typeof r.id === 'string').map((r, i) => ({
    i,
    row: {
      id: r.id, title: typeof r.title === 'string' ? r.title : '', npc: r.npc || '', ready: !!r.ready, tracked: r.id === tracked,
      count: counts && Object.prototype.hasOwnProperty.call(counts, r.id) ? countOf(counts[r.id]) : null,
    },
  }));
  const rank = (r) => (r.tracked ? 0 : r.ready ? 1 : 2);
  rows.sort((a, b) => rank(a.row) - rank(b.row) || a.i - b.i);
  const doors = [];
  if (c.dailyOn) doors.push({ id: 'daily', page: LANDING_DOORS.daily, n: null });
  doors.push({ id: 'done', page: LANDING_DOORS.done, n: Array.isArray(L.done) ? L.done.length : 0 });
  const offers = Array.isArray(L.available) ? L.available.length : 0;
  if (offers > 0) doors.push({ id: 'offers', page: LANDING_DOORS.offers, n: offers });
  return { kind: rows.length ? 'rows' : 'empty', rows: rows.map((x) => x.row), doors };
}

/** A QUEST'S JOURNEY UP TO NOW, from its journal page and its objective
 *  `desc` (journeySteps' steps, cut at what to do now):
 *  -> { done, now, continues, next, history }
 *    done       the steps behind you, in order (a tick and their words, what
 *               the giver handed over);
 *    now        what to do NOW, or null: { kind, text, count, where, map }
 *               (the journal's own words: page.now, page.where);
 *    continues  true for a quest in hand: one quiet "The adventure
 *               continues" (no step to come, no count of steps, no percent);
 *    next       a done quest's "Next: ..." (what to do now after it), else null;
 *    history    true for a done quest: every step done, the hand-in too.
 *  A quest in hand never shows its hand-in until it is ready (then the hand-in
 *  IS the now), nor a step still to come, nor its "Then: ..." line.  An offer:
 *  NOW is the talk to its giver, nothing past it. */
export function journeyToNow(page, desc) {
  const out = { done: [], now: null, continues: false, next: null, history: false };
  if (!page) return out;
  const steps = journeySteps(page, desc);
  const st = page.status;
  if (st === 'done') {
    out.done = steps.filter((s) => s.state === 'done');
    out.history = true;
    out.next = page.next && typeof page.next.text === 'string' && page.next.text ? page.next.text : null;
    return out;
  }
  const inHand = st === 'active' || st === 'ready';
  if (!inHand && st !== 'available') return out;
  /* NOW: the step in hand; a quest in hand with no step marked takes the first
     one not done and not the hand-in (the journal's own objective) */
  let at = steps.findIndex((s) => s.state === 'current');
  if (at < 0 && st === 'active') at = steps.findIndex((s) => s.state === 'todo' && s.kind !== 'handin');   /* never the hand-in of a quest not yet ready */
  if (at < 0) return out;
  const s = steps[at];
  out.done = steps.slice(0, at).filter((x) => x.state === 'done');
  const now = page.now || {};
  const c = countOf(now.count);
  out.now = {
    kind: s.kind,
    text: typeof now.text === 'string' && now.text ? now.text : (s.text || ''),
    count: c ? { have: c.have, n: c.n, text: now.count && typeof now.count.text === 'string' ? now.count.text : '' } : null,
    where: page.where && typeof page.where.text === 'string' ? page.where.text : null,
    map: !!(page.where && page.where.map),
  };
  out.continues = inHand;
  return out;
}

/** A QUEST'S ACTIONS AND DOORS, each present or absent by the game's own
 *  fields (a quest the game cannot map has no Show on map, never a disabled
 *  one): -> { actions: [{ id, slot, pressed? }], doors: [{ id }] }
 *    track    a quest in hand only (immediate, the phone's own: no
 *             confirmation, no pending mark);
 *    map      "Show on map" only when page.where.map;
 *    rewards  a door (raised, not an action) when the quest names a reward.
 *  No Story (the game has no story text). */
export function questActions(page, tracked) {
  const out = { actions: [], doors: [] };
  if (!page) return out;
  const inHand = page.status === 'active' || page.status === 'ready';
  const open = inHand || page.status === 'available';
  if (inHand) out.actions.push({ id: 'track', slot: 0, pressed: typeof tracked === 'string' && tracked === page.id });
  if (open && page.where && page.where.map === true) out.actions.push({ id: 'map', slot: 1 });
  if (rewardTiles(page.reward).length) out.doors.push({ id: 'rewards' });
  return out;
}

/** WHAT A TAP OPENS: the frame's transition (src/game/dashNav.js
 *  dashNavStep) for a row or a door, with the quest's id on the entry's `sel`
 *  so Back finds it again.  A push over the page up, never in its place: Back
 *  from Rewards returns to the quest.  `tap`:
 *    { kind: 'row', id }      a quest's row (in hand, done, on offer): its page;
 *    { kind: 'door', door }   the landing's Daily, Completed, On offer;
 *    { kind: 'rewards', id }  the quest page's Rewards door.
 *  Anything else: null. */
export function questOpens(tap) {
  if (!tap) return null;
  if (tap.kind === 'row' && typeof tap.id === 'string' && tap.id) return { type: 'push', id: 'questDetail', sel: tap.id };
  if (tap.kind === 'door' && Object.prototype.hasOwnProperty.call(LANDING_DOORS, String(tap.door))) return { type: 'push', id: LANDING_DOORS[tap.door] };
  if (tap.kind === 'rewards' && typeof tap.id === 'string' && tap.id) return { type: 'push', id: 'questRewards', sel: tap.id };
  return null;
}
