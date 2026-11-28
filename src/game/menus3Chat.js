/* ═══ v2.3.6870: PEOPLE · CHAT, ITS RULES (card MN step 11) ═══
 *
 * The owner's one chat box (docs/design/menus3/SPEC.md: "Chat (All, Area,
 * Party, Whisper): People · Chat ... unified single chat box across mobile &
 * desktop"; "Friend messages: People · Chat · Whispers"; "Game news & unread
 * count: People · Chat · News (badge on People dock button)").  Built from the
 * game's REAL lanes only (src/game/chatChannel.js CHAT_LANES_UI: All, Area,
 * Whisper, Party, each behind the worker's cap) and the chat log the HUD's
 * lines already read (S.chatLog, src/game/chat.js):
 *
 *   - THE TABS.  All always (the log whole, as the HUD's lines and today's
 *     Notifications page show it); Area with the worker's area lane; Party
 *     with its party lane AND a party (the lane's own rule: chatChannel.js
 *     inParty); Whispers with the whisper lane or the friends' messages
 *     (caps.friends: today's friend_dm threads, moved here from the Social
 *     page); News always: the game's own lines (a line with no name: the
 *     gold ones in the HUD's feed);
 *   - WHAT A TAB SENDS.  The lane chatChannel.js already spells (all, area,
 *     party, whisper): the composer only sets the mode and sends through
 *     sendChatMessage, the one sender, so a line goes out as the game's own
 *     request.  News sends nothing (it is read only);
 *   - A LINE'S KIND.  Its lane is the mark at the front of its name (the
 *     caller's `laneOf`: data/smallIcons.js chatLaneOf, the feed's own
 *     reading) or a whisper's flag; no name is news;
 *   - A NAME IS A DOOR (SPEC "Universal Deep-Links": a player's name in Chat
 *     opens their Player page) when the line carries the sender's id and it
 *     is no one's but a player's: not yours, not the game's ('_sys');
 *   - THE COUNTS.  News unread: the game's lines newer than the shared seen
 *     mark (ui/mobile/notifBus.js: the same mark today's Notifications page
 *     and the HUD's feed move), none while the feed shows on screen (you see
 *     them there: notifUnread's rule).  A friend's messages unread: today's
 *     per-thread counts (friendsSync.js).  The People dock button's dot says
 *     why it lit (decided 7: People to Chat to News): a friend's message
 *     first (a person is waiting), then the news.
 *
 * No imports: node's suite reads it (server/test/menus3-chat.test.mjs). */

export const MENUS3_CHAT_TABS = Object.freeze(['all', 'area', 'party', 'whispers', 'news']);

/* the lane each tab's composer sets (chatChannel.js setMode), or null: nothing is sent from it */
export const MENUS3_CHAT_SENDS = Object.freeze({ all: 'all', area: 'area', party: 'party', whispers: 'whisper', news: null });

/* the most lines a tab draws (the log keeps 41: chat.js slice(-40) and the new one) */
export const MENUS3_CHAT_KEEP = 40;

const has = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
const str = (v) => (typeof v === 'string' ? v : v == null ? '' : String(v));

/** The tabs this player has now.  `ctx` { caps (the worker's), inParty }. */
export function chatTabs(ctx) {
  const c = ctx || {};
  const caps = c.caps || {};
  const out = ['all'];
  if (caps.areaChat) out.push('area');
  if (caps.partyChat && c.inParty) out.push('party');
  if (caps.whisper || caps.friends) out.push('whispers');
  out.push('news');
  return Object.freeze(out);
}

/** A tab asked for, held to the tabs there are: anything else is All. */
export function chatTab(want, tabs) {
  const t = str(want);
  const list = Array.isArray(tabs) ? tabs : MENUS3_CHAT_TABS;
  return MENUS3_CHAT_TABS.indexOf(t) >= 0 && list.indexOf(t) >= 0 ? t : 'all';
}

/** A log line's kind: 'news' | 'party' | 'area' | 'whisper' | 'all', or null
 *  for no line.  `laneOf(name)` -> { lane } or null (chatLaneOf). */
export function lineKind(m, laneOf) {
  if (!m || typeof m !== 'object') return null;
  const name = str(m.name);
  if (!name) return 'news';
  if (m.whisper === true) return 'whisper';
  let l = null;
  try { l = typeof laneOf === 'function' ? laneOf(name) : null; } catch (e) { l = null; }
  const lane = l && l.lane;
  return lane === 'party' || lane === 'area' || lane === 'whisper' ? lane : 'all';
}

const TAB_KIND = Object.freeze({ area: 'area', party: 'party', whispers: 'whisper', news: 'news' });

/** The lines a tab shows, oldest first, at most MENUS3_CHAT_KEEP: All the log
 *  whole (every lane and the news, as the HUD's lines show it), each other
 *  tab its own kind. */
export function chatLines(log, tab, laneOf) {
  const lines = Array.isArray(log) ? log : [];
  const want = has(TAB_KIND, tab) ? TAB_KIND[tab] : null;
  const out = [];
  for (const m of lines) {
    const k = lineKind(m, laneOf);
    if (!k) continue;
    if (want && k !== want) continue;
    out.push(m);
  }
  return Object.freeze(out.slice(-MENUS3_CHAT_KEEP));
}

/** The sender's id a line's name opens (their Player page), or null: a
 *  player's line only -- not yours, not the game's, not the news. */
export function lineDoor(m, myId) {
  if (!m || typeof m !== 'object' || !str(m.name)) return null;
  const id = str(m.id);
  if (!id || id === '_sys' || id.charAt(0) === '_' || id === str(myId)) return null;
  return id;
}

/** How many of the game's lines are newer than the seen mark; 0 while the
 *  HUD's feed shows them on screen (notifBus.js notifUnread's rule). */
export function newsUnread(log, seen, feedShown) {
  if (feedShown) return 0;
  const mark = Number(seen) || 0;
  let n = 0;
  for (const m of Array.isArray(log) ? log : []) {
    if (m && typeof m === 'object' && !str(m.name) && (Number(m.ts) || 0) > mark) n++;
  }
  return n;
}

/** The newest of the game's lines' time, or 0 (what opening News marks seen). */
export function newsNewest(log) {
  let t = 0;
  for (const m of Array.isArray(log) ? log : []) {
    if (m && typeof m === 'object' && !str(m.name)) t = Math.max(t, Number(m.ts) || 0);
  }
  return t;
}

/** Why People lit (decided 7: People to Chat to the tab): { dock, section,
 *  tab } -- section 'chat' and the tab with the reason ('whispers' a
 *  friend's message waiting, else 'news'), or all null.  `n` { dms, news }. */
export function peopleDot(n) {
  const k = n || {};
  const dms = Math.max(0, Number(k.dms) | 0);
  const news = Math.max(0, Number(k.news) | 0);
  if (dms > 0) return Object.freeze({ dock: true, section: 'chat', tab: 'whispers' });
  if (news > 0) return Object.freeze({ dock: true, section: 'chat', tab: 'news' });
  return Object.freeze({ dock: false, section: null, tab: null });
}

/** A whisper's target as typed: trimmed, at most 24 (chatChannel.js setTo).
 *  `ok` only for one name with no spaces (a whisper goes to a NAME:
 *  chatChannel.js compose refuses any other). */
export function whisperTo(raw) {
  const to = str(raw).trim().slice(0, 24);
  return Object.freeze({ to, ok: !!to && !/\s/.test(to) });
}

/** The friends whose messages live under Whispers (friend_dm needs a MUTUAL
 *  friendship: SocialPanel.jsx's rule, r.srv): unread first, then online,
 *  then by name.  `friends` getFriendRows' rows; `unreadOf(fid)` the counts. */
export function dmRows(friends, unreadOf) {
  const out = [];
  for (const r of Array.isArray(friends) ? friends : []) {
    if (!r || !r.srv || !str(r.fid)) continue;
    let u = 0;
    try { u = typeof unreadOf === 'function' ? Math.max(0, Number(unreadOf(r.fid)) | 0) : 0; } catch (e) { u = 0; }
    out.push(Object.freeze({ fid: str(r.fid), name: str(r.name) || str(r.fid), online: !!r.online, unread: u }));
  }
  out.sort((a, b) => ((b.unread > 0) - (a.unread > 0)) || ((b.online ? 1 : 0) - (a.online ? 1 : 0)) || a.name.localeCompare(b.name) || (a.fid < b.fid ? -1 : a.fid > b.fid ? 1 : 0));
  return Object.freeze(out);
}

/* the pages Chat pushes over its own (src/game/menus3Nav.js): a friend's
   thread, and the whisper a Player page's Message aims (from any section) */
export const MENUS3_CHAT_PAGES = Object.freeze(['dm', 'whisper']);

/* ═══ v2.3.6870: PEOPLE · RANKS, ITS RAILS (card MN step 11) ═══
 * The wireframe's Ranks: a rail of the kinds over the standings, a row the
 * player's page.  The game's REAL lists (SPEC: "Ranks (combat, life skills,
 * feats, records)"): the groups today's Ranks keeps (src/game/ranksPage.js
 * ranksGroups: Combat, Life Skills, Feats, each only when the worker keeps a
 * board of it; the records -- the spin, the flip, the fish -- are Feats'
 * own there), and under the group's pill a second rail of its boards (the
 * stat boards, today's "Points placed" door, at the end of Combat's): one
 * tap a board, never a page of doors.  What is shown is kept as one string
 * on the panel's page (its rail: 'group|board|choice'), so Back to it and a
 * redraw find it the same. */

/** The rails from ranksGroups' answer: [{ id, boards: [ids] }]. */
export function ranksRail(groups) {
  const out = [];
  for (const g of Array.isArray(groups) ? groups : []) {
    if (!g || !str(g.id)) continue;
    const boards = [];
    for (const id of [].concat(Array.isArray(g.boards) ? g.boards : [], Array.isArray(g.points) ? g.points : [])) {
      if (str(id) && boards.indexOf(str(id)) < 0) boards.push(str(id));
    }
    if (boards.length) out.push(Object.freeze({ id: str(g.id), boards: Object.freeze(boards) }));
  }
  return Object.freeze(out);
}

/** What shows: { group, board, choice } from the kept string, held to the
 *  rails (a group gone, a board gone: its first); null with no rails.  The
 *  first time, the first group's first board (Overall when kept). */
export function ranksPick(rail, kept) {
  const r = Array.isArray(rail) ? rail : [];
  if (!r.length) return null;
  const [g0, b0, c0] = str(kept).split('|');
  const g = r.find((x) => x.id === g0) || r[0];
  const board = g.boards.indexOf(b0) >= 0 ? b0 : g.boards[0];
  return Object.freeze({ group: g.id, board, choice: board === b0 && c0 ? c0 : null });
}

/** The kept string for a pick. */
export function ranksKeep(p) {
  if (!p) return '';
  return [str(p.group), str(p.board), str(p.choice)].join('|');
}
