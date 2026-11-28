/* ═══ v2.3.6870: PEOPLE · CHAT AND RANKS, THEIR RULES (card MN step 11; src/game/menus3Chat.js) ═══
 *
 * The owner's one chat box and the Ranks' rails in the new panel, their
 * rules played on the module itself.  This suite imports nothing from
 * server/src: it tests the page's own rules (as menus3-roster.test does)
 * and does not deploy.
 *
 *   1. THE TABS: All and News always; Area, Party and Whispers only with
 *      the worker's lane (Party also only in a party; Whispers with the
 *      whisper lane or the friends' messages); in the owner's order; a
 *      forged or absent tab is All;
 *   2. WHAT A TAB SENDS: the lane chatChannel.js spells, News nothing;
 *   3. A LINE'S KIND AND A TAB'S LINES: no name is news; the lane is the
 *      name's mark (or a whisper's flag); All is the log whole, each other
 *      tab its own kind; at most 40, the newest kept;
 *   4. A NAME IS A DOOR: a player's line opens their page; not yours, not
 *      the game's, not the news;
 *   5. THE COUNTS AND THE DOT: news unread are the game's lines newer than
 *      the seen mark, none while the feed shows them; the dot's reason a
 *      friend's message first, then the news, else none;
 *   6. A WHISPER'S TARGET: one name with no spaces, at most 24;
 *   7. THE FRIENDS' THREADS: only mutual friends (friend_dm's rule), unread
 *      first, then online, then by name;
 *   8. RANKS' RAILS: the groups as ranksGroups gives them, the stat boards at
 *      the end of Combat's; a kept pick held to the rails, its first board
 *      otherwise; the kept string round trips;
 *   9. THE ROAD: Chat and Ranks are built; the chat lines open the panel on
 *      Chat; a Message's whisper is pushed over the Player page and Back
 *      returns to it. */
import { MENUS3_CHAT_TABS, MENUS3_CHAT_SENDS, MENUS3_CHAT_KEEP, MENUS3_CHAT_PAGES, chatTabs, chatTab, lineKind, chatLines, lineDoor, newsUnread, newsNewest, peopleDot, whisperTo, dmRows, ranksRail, ranksPick, ranksKeep } from '../../src/game/menus3Chat.js';
import { MENUS3_BUILT, menus3Route } from '../../src/game/menus3Router.js';
import { navStart, navPush, navBack, navTop } from '../../src/game/menus3Nav.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; return; }
  failures++;
  console.log('FAIL ' + name + (detail !== undefined ? ' -- ' + JSON.stringify(detail) : ''));
}
/* the feed's own reading of a name's mark (data/smallIcons.js chatLaneOf), small */
const MARKS = [['\u{1F6E1}', 'party'], ['\u{1F4CD}', 'area'], ['✉', 'whisper']];
const laneOf = (n) => { for (const [m, lane] of MARKS) if (n.startsWith(m)) return { lane, rest: n.slice(m.length).trim() }; return null; };

/* ── 1. the tabs ── */
{
  check('1a the owner\'s order', MENUS3_CHAT_TABS.join() === 'all,area,party,whispers,news');
  check('1b with no lanes: All and News only', chatTabs({ caps: {} }).join() === 'all,news' && chatTabs(null).join() === 'all,news');
  const all = { areaChat: true, partyChat: true, whisper: true, friends: true };
  check('1c every lane, in a party', chatTabs({ caps: all, inParty: true }).join() === 'all,area,party,whispers,news');
  check('1d Party only in a party', chatTabs({ caps: all, inParty: false }).join() === 'all,area,whispers,news');
  check('1e Whispers with the friends\' messages alone', chatTabs({ caps: { friends: true } }).join() === 'all,whispers,news');
  const t = chatTabs({ caps: {} });
  check('1f a forged or absent tab is All', chatTab('party', t) === 'all' && chatTab('__proto__', t) === 'all' && chatTab(null, t) === 'all' && chatTab('news', t) === 'news');
}

/* ── 2. what a tab sends ── */
{
  check('2a the lanes chatChannel.js spells', MENUS3_CHAT_SENDS.all === 'all' && MENUS3_CHAT_SENDS.area === 'area' && MENUS3_CHAT_SENDS.party === 'party' && MENUS3_CHAT_SENDS.whispers === 'whisper');
  check('2b News sends nothing', MENUS3_CHAT_SENDS.news === null);
  check('2c a tab for every one sent', MENUS3_CHAT_TABS.every((t) => Object.prototype.hasOwnProperty.call(MENUS3_CHAT_SENDS, t)));
}

/* ── 3. a line's kind, a tab's lines ── */
{
  const log = [
    { id: 'a', name: 'Ana', text: 'hi', ts: 1 },
    { name: '', text: 'The market opens', ts: 2 },
    { id: 'b', name: '\u{1F6E1} Bo', text: 'party', ts: 3 },
    { id: 'c', name: '\u{1F4CD} Cy', text: 'area', ts: 4 },
    { id: 'd', name: '✉ Di', text: 'psst', ts: 5, whisper: true },
    { id: 'e', name: 'Ed', text: 'flag', ts: 6, whisper: true },
    null,
  ];
  check('3a no name is news', lineKind(log[1], laneOf) === 'news' && lineKind({ text: 'x' }, laneOf) === 'news');
  check('3b the mark is the lane', lineKind(log[2], laneOf) === 'party' && lineKind(log[3], laneOf) === 'area' && lineKind(log[4], laneOf) === 'whisper' && lineKind(log[0], laneOf) === 'all');
  check('3c a whisper\'s flag is a whisper', lineKind(log[5], laneOf) === 'whisper');
  check('3d no line has no kind', lineKind(null, laneOf) === null && lineKind('x', laneOf) === null);
  check('3e All is the log whole', chatLines(log, 'all', laneOf).length === 6);
  check('3f each tab its kind', chatLines(log, 'news', laneOf).map((m) => m.ts).join() === '2' && chatLines(log, 'party', laneOf).map((m) => m.ts).join() === '3'
    && chatLines(log, 'area', laneOf).map((m) => m.ts).join() === '4' && chatLines(log, 'whispers', laneOf).map((m) => m.ts).join() === '5,6');
  const many = Array.from({ length: 60 }, (_, i) => ({ id: 'p', name: 'P', text: String(i), ts: i }));
  const kept = chatLines(many, 'all', laneOf);
  check('3g at most ' + MENUS3_CHAT_KEEP + ', the newest kept', kept.length === MENUS3_CHAT_KEEP && kept[kept.length - 1].ts === 59 && kept[0].ts === 20);
  check('3h a bad log is empty', chatLines(null, 'all', laneOf).length === 0 && chatLines({}, 'news', laneOf).length === 0);
}

/* ── 4. a name is a door ── */
{
  check('4a a player\'s line opens them', lineDoor({ id: 'x', name: 'X' }, 'me') === 'x');
  check('4b not yours', lineDoor({ id: 'me', name: 'Me' }, 'me') === null);
  check('4c not the game\'s', lineDoor({ id: '_sys', name: 'Dice' }, 'me') === null && lineDoor({ id: '_x', name: 'X' }, 'me') === null);
  check('4d not the news, not a line with no id', lineDoor({ id: 'x', text: 'n' }, 'me') === null && lineDoor({ name: 'N' }, 'me') === null && lineDoor(null, 'me') === null);
}

/* ── 5. the counts and the dot ── */
{
  const log = [{ name: '', ts: 5 }, { name: 'A', ts: 6 }, { name: '', ts: 9 }, { text: 'n', ts: 12 }];
  check('5a news newer than the mark', newsUnread(log, 5, false) === 2 && newsUnread(log, 0, false) === 3 && newsUnread(log, 12, false) === 0);
  check('5b none while the feed shows them', newsUnread(log, 0, true) === 0);
  check('5c the newest news', newsNewest(log) === 12 && newsNewest([{ name: 'A', ts: 99 }]) === 0 && newsNewest(null) === 0);
  check('5d a friend\'s message first', JSON.stringify(peopleDot({ dms: 2, news: 3 })) === JSON.stringify({ dock: true, section: 'chat', tab: 'whispers' }));
  check('5e then the news', peopleDot({ dms: 0, news: 1 }).tab === 'news' && peopleDot({ news: 1 }).dock === true);
  check('5f else no dot', peopleDot({}).dock === false && peopleDot(null).tab === null && peopleDot({ dms: -3, news: 'x' }).dock === false);
}

/* ── 6. a whisper's target ── */
{
  check('6a one name', whisperTo('  Rostb ').to === 'Rostb' && whisperTo('Rostb').ok);
  check('6b a space is no target', !whisperTo('Two Words').ok && !whisperTo('').ok && !whisperTo(null).ok);
  check('6c at most 24', whisperTo('x'.repeat(30)).to.length === 24);
}

/* ── 7. the friends' threads ── */
{
  const rows = [
    { fid: 'a', name: 'Zed', srv: true, online: false },
    { fid: 'b', name: 'Amy', srv: true, online: true },
    { fid: 'c', name: 'Bob', srv: false, online: true },
    { fid: 'd', name: 'Cat', srv: true, online: false },
    { fid: '__proto__', name: 'Pro', srv: true, online: false },
  ];
  const un = { a: 2 };
  const d = dmRows(rows, (fid) => (Object.prototype.hasOwnProperty.call(un, fid) ? un[fid] : 0));
  check('7a only mutual friends', d.every((r) => r.fid !== 'c') && d.length === 4);
  check('7b unread first, then online, then by name', d.map((r) => r.fid).join() === 'a,b,d,__proto__', d.map((r) => r.fid));
  check('7c the counts', d[0].unread === 2 && d[1].unread === 0);
  check('7d nothing from nothing', dmRows(null, null).length === 0);
}

/* ── 8. ranks' rails ── */
{
  const groups = [{ id: 'combat', boards: ['power', 'melee'], points: ['p_dmg', 'p_hp'] }, { id: 'life', boards: ['mining'], points: [] }, { id: 'feats', boards: [], points: [] }];
  const rail = ranksRail(groups);
  check('8a the groups, the stat boards at the end of Combat\'s, an empty group out', rail.map((g) => g.id).join() === 'combat,life' && rail[0].boards.join() === 'power,melee,p_dmg,p_hp', rail);
  check('8b first time: the first group\'s first board', JSON.stringify(ranksPick(rail, '')) === JSON.stringify({ group: 'combat', board: 'power', choice: null }));
  check('8c a kept pick', JSON.stringify(ranksPick(rail, 'life|mining|')) === JSON.stringify({ group: 'life', board: 'mining', choice: null }));
  check('8d a board gone: its group\'s first; a group gone: the first', ranksPick(rail, 'life|fish|minnow').board === 'mining' && ranksPick(rail, 'feats|fish|x').group === 'combat');
  check('8e a choice kept with its board', ranksPick(rail, 'combat|melee|wins').choice === 'wins');
  check('8f the kept string round trips', ranksKeep(ranksPick(rail, 'combat|p_hp|')) === 'combat|p_hp|' && ranksKeep(null) === '');
  check('8g no rails, no pick', ranksPick([], 'x') === null && ranksRail(null).length === 0);
}

/* ── 9. the road ── */
{
  check('9a Chat and Ranks are built', MENUS3_BUILT.indexOf('chat') >= 0 && MENUS3_BUILT.indexOf('ranks') >= 0);
  const ctx = { built: MENUS3_BUILT };
  const c = menus3Route('hud.chatLines', ctx);
  check('9b the chat lines open the panel on Chat', c.road === 'panel' && c.menu === 'people' && c.section === 'chat', c);
  check('9c People still opens on Roster', menus3Route('dock.people', ctx).section === 'roster');
  check('9d the pages Chat pushes', MENUS3_CHAT_PAGES.join() === 'dm,whisper');
  let h = navStart('roster', 'nearby');
  h = navPush(h, 'player', 'z');
  h = navPush(h, 'whisper', 'Zed');
  check('9e a Message\'s whisper over the Player page', navTop(h).page === 'whisper' && navTop(h).arg === 'Zed');
  h = navBack(h);
  check('9f Back is their page', navTop(h).page === 'player' && navTop(h).arg === 'z');
  let r = navStart('chat', 'whispers');
  r = navPush(r, 'dm', 'f1', { rail: 'whispers' });
  r = navBack(r);
  check('9g a thread\'s Back is Whispers', navTop(r).page === 'root' && navTop(r).rail === 'whispers');
}

console.log(`menus3-chat: ${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
