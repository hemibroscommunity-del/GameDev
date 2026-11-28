/* ═══ v2.3.6863: WORLD · QUESTS -- THE RAIL, THE TODAY STRIP, A QUEST'S LINKS (card MN step 7) ═══
 *
 * The owner's Quests (docs/design/menus3/SPEC.md "What To Do": "Your quests
 * (tracked, active, ready to hand in)", "Quests on offer (who & where)",
 * "Finished quests", "Quest page (completed/current steps, rewards, Track,
 * Show on map; future steps hidden)", "Free daily spin & login streak",
 * "Farm's 3 daily orders"; the wireframe v4.4's rail and rows) from the
 * game's REAL quests: the journal's own list (questJournalModel.js
 * questJournalList), ordered by the rule today's Quests landing already
 * keeps (questPages.js questLanding: the tracked quest first, then the ones
 * ready to hand in).
 *
 * THE GAME'S TRUTH, NOT THE SAMPLE'S:
 *   - the rail is Active, On offer, Done.  NO "Daily": the daily quests and
 *     the season are OFF in the game (dailyRewards.js questsLive, seasonLive:
 *     a worker advertises them only with their live flags on) and stay off;
 *     the wireframe's Daily rail is sample content;
 *   - THE TODAY STRIP holds only what exists today: the free daily spin (the
 *     login wheel, loginSpinWheel.js: the top bar's button, which stays), the
 *     login streak and the Gambling Den's spin (dailyRewards.js: the Daily
 *     Rewards window's Today tab, read), and the farm's three orders
 *     (farmBus.orders, read; delivered at Feed & Seed).  Should the daily
 *     quests or the season come back on, the strip carries a door to the
 *     Daily Rewards window, which draws them: nothing is lost either way;
 *   - the farm's board reaches the phone only from Feed & Seed (farm_open,
 *     which writes the free deed the first time: farm.js _handleFarmOpen), so
 *     the strip asks for nothing: a board it has not seen today is "at Feed &
 *     Seed" (flagged to the owner).
 *
 * A QUEST'S LINKS (the owner's "monster/item/place names deep-link"): read
 * from the quest's own data, never parsed out of its words -- the item its
 * `need` counts (an item's page), the monsters whose remains that item is
 * (data/codexDrops.js CODEX_REMNANTS: their Codex page), and its place when
 * the game can map it (the map).  A quest whose item no monster leaves (ore,
 * a log) has no item link: the item page of a thing nobody drops would read
 * "Drops from" with no one (flagged).
 *
 * The panel's pages (src/game/menus3Nav.js): 'root' the rail, 'quest' a
 * quest's page (arg its id), 'rewards' its rewards (arg its id).
 * Pure: node's suite reads it (server/test/menus3-quests.test.mjs). */
import { questLanding } from './questPages.js';

/** The rail's places, in the owner's order (no Daily: the game has none on). */
export const MENUS3_QUEST_RAIL = Object.freeze(['active', 'offers', 'done']);
/** The pages a quest opens in the panel. */
export const MENUS3_QUEST_PAGES = Object.freeze(['quest', 'rewards']);

/** A rail place from anything: a forged or unknown one is Active. */
export function questRailId(r) {
  return MENUS3_QUEST_RAIL.indexOf(r) >= 0 ? r : 'active';
}

/** THE RAIL'S THREE LISTS from the journal's list `L` ({ active, available,
 *  done }); `ctx` { known, tracked, counts } as questLanding takes them.
 *  -> { kind, active: [{ id, title, npc, ready, tracked, count }],
 *       offers: [{ id, title, npc, where }], done: [{ id, title }],
 *       n: { active, offers, done } }
 *  `kind` 'loading' until the worker's answer is in (never "no quest"). */
export function questRails(L, ctx) {
  const c = ctx || {};
  const land = questLanding(L, { known: !!c.known, dailyOn: false, tracked: c.tracked, counts: c.counts });
  if (land.kind === 'loading') return { kind: 'loading', active: [], offers: [], done: [], n: { active: 0, offers: 0, done: 0 } };
  const offers = (L && Array.isArray(L.available) ? L.available : []).filter((r) => r && typeof r.id === 'string')
    .map((r) => ({ id: r.id, title: typeof r.title === 'string' ? r.title : '', npc: r.npc || '', where: typeof r.where === 'string' ? r.where : '' }));
  const done = (L && Array.isArray(L.done) ? L.done : []).filter((r) => r && typeof r.id === 'string')
    .map((r) => ({ id: r.id, title: typeof r.title === 'string' ? r.title : '' }));
  return { kind: 'rows', active: land.rows, offers, done, n: { active: land.rows.length, offers: offers.length, done: done.length } };
}

/** The rail's lit place when the section opens: Active, or On offer when
 *  nothing is in hand and someone has a quest for you (the old landing's
 *  "nothing in hand" listed the offers under its empty line). */
export function questRailStart(rails) {
  if (rails && rails.kind === 'rows' && !rails.n.active && rails.n.offers) return 'offers';
  return 'active';
}

/** A QUEST'S LINKS from its own data: `quest` its row in the game's table
 *  ({ need }), `page` its journal page ({ status, where: { map } }),
 *  `remnants` { monsterKind: itemKey } (CODEX_REMNANTS), `known(kind)` is
 *  that kind in the Codex.
 *  -> [{ kind: 'monster', id } ..., { kind: 'item', key }, { kind: 'place' }]
 *  An offer links its place only (its errand is not yours yet); a done quest
 *  nothing (its history is read, not played). */
export function questLinks(quest, page, remnants, known) {
  const out = [];
  if (!page) return out;
  const st = page.status;
  const inHand = st === 'active' || st === 'ready';
  const key = inHand && quest && quest.need && typeof quest.need.key === 'string' && quest.need.key ? quest.need.key : null;
  if (key && remnants) {
    const kinds = Object.keys(remnants).filter((k) => remnants[k] === key && (typeof known !== 'function' || known(k)));
    for (const k of kinds) out.push({ kind: 'monster', id: k });
    if (kinds.length) out.push({ kind: 'item', key, from: kinds[0] });
  }
  if ((inHand || st === 'available') && page.where && page.where.map === true) out.push({ kind: 'place' });
  return out;
}

/** THE TODAY STRIP, only what exists today: -> [{ id, lit, ... }] in order
 *    spin    the free daily spin (the login wheel): { avail } -- known only
 *            once the worker answered (loginSpinBus.known) and its cap is on;
 *    streak  the login streak and the Den's spin: { days, fz, fzMax, saved,
 *            every, den } (den: the Den's spin row as the window drew it,
 *            or null with its cap off) -- known once the worker answered;
 *    orders  the farm's three: { known, done, all, old } -- with the board's
 *            cap on; `known` false until Feed & Seed has shown it;
 *    daily   the Daily Rewards window's door, ONLY while the daily quests or
 *            the season are on (off today).
 *  `in` { login: { known, avail, capOn }, rewards (the worker's state or
 *  null), denOn, ordersOn, orders (farmBus.orders or null), now (the
 *  worker's clock), dailyOn, seasonOn }. */
export function todayStrip(input) {
  const i = input || {};
  const out = [];
  const lg = i.login || {};
  if (lg.capOn && lg.known) out.push({ id: 'spin', lit: !!lg.avail, avail: !!lg.avail });
  const st = i.rewards && typeof i.rewards === 'object' ? i.rewards : null;
  if (st) {
    const sk = st.streak || {};
    out.push({
      id: 'streak', lit: false,
      days: Math.max(1, Math.floor(Number(sk.n) || 1)),
      fz: Math.max(0, Math.floor(Number(sk.fz) || 0)),
      fzMax: Math.max(0, Math.floor(Number(sk.fzMax) || 2)),
      saved: Number(sk.saved) > 0,
      every: Math.max(1, Math.floor(Number(sk.every) || 7)),
      den: i.denOn ? denSpin(st.spin) : null,
    });
  }
  if (i.ordersOn) {
    const b = i.orders && Array.isArray(i.orders.list) ? i.orders : null;
    const now = Number(i.now) || 0;
    const old = !!(b && Number(b.resetsAt) > 0 && now >= Number(b.resetsAt));
    if (!b || old) out.push({ id: 'orders', lit: false, known: false, old, done: 0, all: 3, list: [] });
    else {
      const list = b.list.map((o) => (o && !o.gone ? { key: String(o.key || ''), n: Math.max(0, Math.floor(Number(o.n) || 0)), gold: Math.floor(Number(o.gold) || 0), xp: Math.floor(Number(o.xp) || 0), done: !!o.done } : { gone: true }));
      out.push({ id: 'orders', lit: false, known: true, old: false, done: list.filter((o) => o.done).length, all: list.length, list });
    }
  }
  if (i.dailyOn || i.seasonOn) out.push({ id: 'daily', lit: false });
  return out;
}

/** The Gambling Den's spin as the Daily Rewards window's Today tab drew it
 *  (DailyRewardsWindow.jsx TodayTab): 'locked' (until Mayor Bro's first
 *  quest), 'open' (a pot to take or double), 'ready', 'bonus' (spins to
 *  use), 'done' (today's is taken) -> { state, pot, extra, jackpot } or null. */
export function denSpin(sp) {
  if (!sp || !sp.on) return null;
  const locked = !!sp.locked && !sp.open;
  const state = locked ? 'locked' : sp.open ? 'open' : sp.ready ? 'ready' : Number(sp.extra) > 0 ? 'bonus' : 'done';
  const prizes = Array.isArray(sp.prizes) ? sp.prizes : [];
  const jackpot = prizes.length ? Math.floor(Number(prizes[prizes.length - 1].c) || 0) : 0;
  return { state, pot: Math.floor(Number(sp.pot) || 0), extra: Math.floor(Number(sp.extra) || 0), jackpot };
}

/** Which strip place's words are open under the strip (one at a time; a tap
 *  on the open one shuts it): the next value for `open` after a tap on `id`. */
export function todayTap(open, id) {
  return open === id ? null : (typeof id === 'string' ? id : null);
}
