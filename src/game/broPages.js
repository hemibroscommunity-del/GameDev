/* ═══ v2.3.6600: THE BRO TAB IN PAGES, A SHOWCASE OF YOUR CHARACTER (card BRO, part 1) ═══
 *
 * The owner, 2026-11-25, with four mockups (docs/plan/status/assets/bro-mock-0[1-4]-*.jpg on
 * claude/plan-orc): "I want it so that it shows "pages" where all the information needs to be
 * displayed together (instead of scrolling little by little) so all related information is shown
 * at once. The biggest improvement is that the Bro tab becomes a showcase of the player's character
 * rather than a long directory of features. Players see the big picture first and can investigate
 * the details whenever they want."
 *
 * So the Bro tab (src/ui/mobile/sheet/BroCard.jsx, its pages BroPages.jsx) is three pages, each
 * whole with no scroller:
 *   overview  you (portrait, name, title, "LV N": no XP bar, there is no general combat XP), the
 *             weapon in your hand in four numbers (DPS, Damage, Defense, Gear worn), the three
 *             weapon masteries, and ONE progress row;
 *   combat    the weapon picker, then every combat stat of today's card in three groups;
 *   progress  the three counters, the achievements bar, and the doors as tiles two across.
 * Upright (the page under 600 px wide) one page shows at a time with a strip of three page marks;
 * 600 px and wider the three stand side by side and no mark is drawn.
 *
 * The rules live here (finish.md part 5, rule 5: a feature takes its slice out of the big files):
 * the page is ONE field with ONE transition function (`broPageTo`), and the tables say which stat
 * stands in which group and what each door opens.  The components only draw what these say.
 * `?bropages=0` gives back today's card (tools/guards/lib/switches.mjs).
 *
 * NO IMPORTS: node tests it (server/test/bro-pages.test.mjs). */

/* the three pages, in their marks' order; the first is where a visit opens */
export const BRO_PAGES = Object.freeze(['overview', 'combat', 'progress']);
/* the three weapons, in the picker's order (sheet/broStats.js BRO_WEAPONS' cats) */
export const BRO_PAGE_WEAPONS = Object.freeze(['sword', 'bow', 'staff']);

/* the page's shape from its own box (measured by BroCard, never the window: TRAPS §214):
   600 px and wider the three pages side by side, as today's three panels (BroCard BRO_COLS_3);
   a box under 150 px tall (a phone on its side: about 80 px) draws the dense cut of each page. */
export const BRO_WIDE_PX = 600;
export const BRO_DENSE_PX = 150;

const has = (list, v) => list.indexOf(v) >= 0;

/** Where a visit starts: the Overview, the Combat page's picker on the weapon in your hand. */
export function broPagesStart(held) {
  return { page: BRO_PAGES[0], weapon: has(BRO_PAGE_WEAPONS, held) ? held : BRO_PAGE_WEAPONS[0] };
}

/** THE ONE TRANSITION.  `a.to` a page (left out: the page stays), `a.weapon` a weapon (left out:
 *  the weapon stays).  Every tap on the pages is one of these:
 *    a page mark, the back chip          { to }
 *    "Details" on the Overview            { to: 'combat', weapon: <the weapon in your hand> }
 *    a mastery tile                       { to: 'combat', weapon }
 *    the Combat page's picker             { weapon }
 *    the Overview's progress row          { to: 'progress' }
 *  An action that names no page or weapon of ours changes nothing, and gives back the SAME state
 *  (a React state that did not change draws nothing). */
export function broPageTo(s, a) {
  const cur = s && has(BRO_PAGES, s.page) ? s : broPagesStart(s && s.weapon);
  if (!a) return cur;
  const to = a.to == null ? cur.page : a.to;
  const weapon = a.weapon == null ? cur.weapon : a.weapon;
  if (!has(BRO_PAGES, to) || !has(BRO_PAGE_WEAPONS, weapon)) return cur;
  if (to === cur.page && weapon === cur.weapon) return cur;
  return { page: to, weapon };
}

/** The page's shape from its box: { wide, dense }.  A box not measured yet (0) is upright and
 *  roomy: the first frame draws one page, as an upright phone will. */
export function broPagesLayout(w, h) {
  return { wide: w >= BRO_WIDE_PX, dense: h > 0 && h < BRO_DENSE_PX };
}

/** The pages drawn: all three side by side when wide, else the open one. */
export function broShownPages(s, wide) {
  return wide ? BRO_PAGES.slice() : [broPageTo(s, null).page];
}

/** The strip of page marks: none when wide (the three are all in view); else one a page, the open
 *  one lit, and the Overview's mark the back chip ("‹ Overview") on the two pages under it. */
export function broMarks(s, wide) {
  if (wide) return [];
  const page = broPageTo(s, null).page;
  return BRO_PAGES.map((p) => ({ page: p, on: p === page, back: p === BRO_PAGES[0] && page !== BRO_PAGES[0] }));
}

/* ═══ WHICH STAT STANDS WHERE ═══
   The Combat page's three groups (mockups 03 and 04), every one of today's thirteen rows
   (broStats.js BRO_STAT_ROWS) in exactly one: the mockup's Offense, Survivability (with today's
   Armor) and Mobility.  The keys are BRO_STAT_ROWS' own. */
export const BRO_STAT_GROUPS = Object.freeze([
  Object.freeze({ id: 'offense', keys: Object.freeze(['damage', 'dps', 'aspd', 'range', 'crit', 'critDmg', 'special', 'elem']) }),
  Object.freeze({ id: 'survive', keys: Object.freeze(['def', 'armor', 'dodge', 'eres']) }),
  Object.freeze({ id: 'move', keys: Object.freeze(['move']) }),
]);

/** Today's rows (broWeaponStats().rows) in their groups, each group's rows in the group's order.
 *  A row no group names is put in `rest` (the suite fails while it holds one: nothing of today's
 *  card is lost), and a key no row has is skipped. */
export function broStatGroups(rows) {
  const byKey = Object.create(null);
  for (const r of rows || []) if (r) byKey[r.key] = r;
  const placed = Object.create(null);
  const groups = BRO_STAT_GROUPS.map((g) => {
    const out = [];
    for (const k of g.keys) if (byKey[k]) { out.push(byKey[k]); placed[k] = true; }
    return { id: g.id, rows: out };
  });
  const rest = (rows || []).filter((r) => r && !placed[r.key]);
  return { groups, rest };
}

/* the Overview's combat overview: three of the held weapon's numbers, then the gear worn */
export const BRO_OVERVIEW_STATS = Object.freeze(['dps', 'damage', 'def']);

/** The four numbers of the Overview: [{ key, value }], the stats from today's rows for the weapon
 *  in your hand, then "n/slots" of gear worn.  A missing row reads "—" (broStats' dash). */
export function broOverviewNumbers(rows, worn, slots) {
  const byKey = Object.create(null);
  for (const r of rows || []) if (r) byKey[r.key] = r.value;
  const out = BRO_OVERVIEW_STATS.map((k) => ({ key: k, value: byKey[k] == null ? '—' : String(byKey[k]) }));
  const w = Math.max(0, Math.floor(Number(worn) || 0));
  const n = Math.max(0, Math.floor(Number(slots) || 0));
  out.push({ key: 'gear', value: `${w}/${n}` });
  return out;
}

/** The achievements bar's fill, 0 to 1 (earned over total; no total, none). */
export function broAchvFill(earned, total) {
  const t = Number(total) || 0;
  if (!(t > 0)) return 0;
  return Math.min(1, Math.max(0, (Number(earned) || 0) / t));
}

/* ═══ THE DOORS ═══
   Every door of today's card, on the Progress page as tiles two across, in the mockup's order
   (02: Life Skills, Titles, Homestead, Pet, Party or Clan, Points), then the two the mockup left
   out (Achievements, Equipment).  `opens` says what a tap does (BroCard maps each to today's own):
     page:<id>  a page pushed under Bro, its back chip returning here (dashboardPanelBus.push);
     titles     the Achievements page on the title you would pick (askTitlePicker);
     points     the Points window over the card;
     gear       the Gear tab (BroCard openGear);
     farm       a word on where the farm is (no window away from it).
   `achv`: shown only where the server grants achievements (today's apOn). */
export const BRO_DOORS = Object.freeze([
  Object.freeze({ id: 'skills', opens: 'page:skills', achv: false }),
  Object.freeze({ id: 'titles', opens: 'titles', achv: true }),
  Object.freeze({ id: 'homestead', opens: 'farm', achv: false }),
  Object.freeze({ id: 'pet', opens: 'page:pets', achv: false }),
  Object.freeze({ id: 'clan', opens: 'page:clan', achv: false }),
  Object.freeze({ id: 'points', opens: 'points', achv: false }),
  Object.freeze({ id: 'achievements', opens: 'page:achievements', achv: true }),
  Object.freeze({ id: 'equipment', opens: 'gear', achv: false }),
]);

/** The doors drawn: all of them where achievements are granted, else those that need none. */
export function broDoors(achvOn) {
  return BRO_DOORS.filter((d) => achvOn || !d.achv);
}

/* the other taps on the pages, and what they open (the same words as a door's `opens`) */
export const BRO_TAPS = Object.freeze({
  counters: 'page:achievements', /* the Progress page's three counters (today's AP and Achievements tile) */
  pointsChip: 'points',          /* the Overview's "N points" chip, drawn only while points wait */
});

/** The Overview's title line (today's ribbon): the title picker where achievements are granted,
 *  else the Achievements page (today's `apOn ? openTitles : openAchv`). */
export function broTitleOpens(achvOn) {
  return achvOn ? 'titles' : 'page:achievements';
}

/** What an `opens` word asks for: { kind: 'page', page } | { kind } | null for none of ours. */
export function broOpen(opens) {
  const s = String(opens || '');
  if (s.indexOf('page:') === 0) {
    const page = s.slice(5);
    return page ? { kind: 'page', page } : null;
  }
  return has(['titles', 'points', 'gear', 'farm'], s) ? { kind: s } : null;
}
