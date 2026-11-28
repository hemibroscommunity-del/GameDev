/* ═══ v2.3.6870: PEOPLE'S DOT AND CHAT'S TITLES, OUTSIDE THE CHAT'S OWN SCRIPT (card MN step 11) ═══
 *
 * The People dock button, the panel's Chat tab and Chat's own tabs light for
 * one reason each (decided 7: People to Chat to the tab; src/game/menus3Chat.js
 * peopleDot): a friend's message waiting (friendsSync.js's counts), else the
 * game's news unseen (the shared seen mark, notifBus.js).  Small and free of
 * the Chat page (Menus3Chat.jsx loads when first opened), so the dock and the
 * panel's header can read it, each from the state it is handed (the band
 * draws the dock's from its own, BottomDashboard.jsx: no clock). */
import { notifBus } from '@/ui/mobile/notifBus.js';
import { friendsSrv } from '@/ui/mobile/sheet/friendsSync.js';
import { getFriendRows } from '@/ui/mobile/sheet/friendsModel.js';
import { newsUnread, peopleDot } from '@/game/menus3Chat.js';
import { SAY } from '@/data/say/menus3Chat.js';
import { say } from '@/game/say.js';

/** Why People lights now: { dock, section, tab } (menus3Chat.js peopleDot). */
export function chatPeopleDot(S) {
  const caps = (S && S._serverCaps) || {};
  let dms = 0;
  try { dms = caps.friends ? friendsSrv.unreadTotal() : 0; } catch (e) { dms = 0; }
  const news = newsUnread((S && S.chatLog) || [], notifBus.seen, !notifBus.shut);
  return peopleDot({ dms, news });
}

/** The header's title over a Chat page: the friend's name over their thread, Whispers over a Message's. */
export function chatPageTitle(top, getS) {
  if (!top) return '';
  if (top.page === 'dm') {
    let r = null;
    try { r = getFriendRows(getS()).find((x) => String(x.fid) === String(top.arg)) || null; } catch (e) { r = null; }
    return r ? r.name : say(SAY, 'menus3Chat.thread');
  }
  return say(SAY, 'menus3Chat.whispers');
}
