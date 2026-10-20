/* ═══ v2.3.3522: THE QUEST YOU TRACK, ONE ANSWER FOR EVERY READER ═══
 *
 * The owner, playtesting: "I tapped track quest in quest menu but no golden
 * stars were in minimap (I had two active quests - one from beast master and
 * the other from mayor bro)."
 *
 * "Track this quest" (QuestDetailPanel) wrote `bt_trackedQuest` and only the
 * quest list read it back, to sort itself (v2.3.1298) -- the minimap's star,
 * the world map's gold road and the pinned quest card never asked, so a
 * tracked quest changed nothing a player could see on the way.  Now every one
 * of them reads it here: the road follows the tracked quest first
 * (questRoute.js), and the pinned card shows it (BroTown.jsx).
 *
 * The minimap asks this every frame, so the id is kept in memory once read
 * (one localStorage read a page, not sixty a second), and another tab's
 * change arrives by the browser's `storage` event (two tabs share one
 * identity: CLAUDE.md "Identity").  Still a display preference only: taking
 * and handing in quests stays with the givers and the worker.
 *
 * NO IMPORTS: server/test/quest-route.test.mjs reads it in node. */

export const TRACK_KEY = 'bt_trackedQuest';

let _read = false;
let _id = null;
/* who wants to hear a change (the pinned quest card: BroTown re-renders it) */
const _subs = new Set();
function _tell() {
  for (const fn of _subs) { try { fn(_id); } catch (e) { /* a reader's own trouble */ } }
}

function _storage() {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; }
}

function _listen() {
  try {
    if (typeof window === 'undefined' || !window.addEventListener) return;
    window.addEventListener('storage', (e) => {
      if (e && e.key === TRACK_KEY) { _id = (typeof e.newValue === 'string' && e.newValue) ? e.newValue : null; _tell(); }
    });
  } catch (e) { /* no window: nothing to hear */ }
}

/** The tracked quest's id, or null. */
export function trackedQuestId() {
  if (!_read) {
    _read = true;
    const ls = _storage();
    try { const v = ls ? ls.getItem(TRACK_KEY) : null; _id = (typeof v === 'string' && v) ? v : null; } catch (e) { _id = null; }
    _listen();
  }
  return _id;
}

/** Track a quest (an id), or nothing (null). */
export function setTrackedQuest(id) {
  if (!_read) trackedQuestId();   /* the storage listener, once */
  const was = _id;
  _id = (typeof id === 'string' && id) ? id : null;
  const ls = _storage();
  try {
    if (ls) {
      if (_id) ls.setItem(TRACK_KEY, _id);
      else ls.removeItem(TRACK_KEY);
    }
  } catch (e) { /* private mode: kept for this page */ }
  if (_id !== was) _tell();
}

/** Hear every change of the tracked quest (here or in another tab); returns
    the function that stops listening.  The minimap and the world map ask
    every frame and need no telling; the pinned quest card is React, and
    re-renders only when told. */
export function onTrackedQuest(fn) {
  if (typeof fn !== 'function') return () => {};
  trackedQuestId();
  _subs.add(fn);
  return () => { _subs.delete(fn); };
}

/** Ids with the tracked one first (when it is among them), the rest in their
    own order.  For a list of quest ids, or of anything with `qid`. */
export function trackedFirst(list, tracked) {
  if (!Array.isArray(list)) return [];
  const t = tracked === undefined ? trackedQuestId() : tracked;
  if (!t) return list.slice();
  const idOf = (x) => (x && typeof x === 'object') ? x.qid : x;
  const first = list.filter((x) => idOf(x) === t);
  return first.length ? first.concat(list.filter((x) => idOf(x) !== t)) : list.slice();
}

/* QA (mp-trackquest): which quest is tracked, and the same switch the
   quest's page uses (read-only but for that) */
if (typeof window !== 'undefined') {
  try { window.__btTrackedQuest = { get: () => trackedQuestId(), set: (id) => setTrackedQuest(id) }; } catch (e) { /* no window */ }
}
