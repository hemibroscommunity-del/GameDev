/* v2.3.1324 (Friends server round): the client half of the friends
   wire — one store for the server-synced friend doc, the DM threads,
   and unread counts.  gameEvents.js routes friend_sync / friend_dm /
   friend_dm_backlog here; the panels subscribe.

   Threads persist in localStorage ('bt_dm:<fid>', capped) because the
   server's offline backlog is delivered-ONCE then cleared (friends.md)
   — the client is the archive.  Unread counts persist too
   ('bt_dm_unread') so a reload doesn't silently zero the badge. */

import { isBlockedId } from '../../../game/chatMute.js'; /* v2.3.4365 */

const THREAD_MAX = 50;
const listeners = new Set();
const emit = () => { for (const fn of listeners) fn(); };

const readJson = (k, fb) => {
  try {
    const v = JSON.parse(localStorage.getItem(k));
    if (v && typeof v === 'object') return v;
  } catch (_e) {}
  return fb;
};

let doc = null;            /* {list, reqIn, reqOut} from friend_sync */
let openThread = null;     /* fid whose thread UI is open (no unread bump) */
let lastError = null;      /* {reason, at} — cleared after read */

export const friendsSrv = {
  doc() { return doc; },
  setDoc(d) {
    doc = d && typeof d === 'object'
      ? { list: d.list || {}, reqIn: d.reqIn || {}, reqOut: d.reqOut || {} }
      : null;
    emit();
  },

  /* v2.3.4365: a blocked player's friend request is not shown or counted
     (the badge, the Requests tab): the card promises "no ... requests from
     them".  It stays on the worker; unblocked, it shows again. */
  requestsIn() { return doc ? Object.keys(doc.reqIn).filter((fid) => !isBlockedId(fid)) : []; },
  serverList() { return doc ? doc.list : null; },

  /* v2.3.4365: the owner, 2026-11-10: "Block also stops direct messages".
     A blocked player's thread reads empty and counts no unread while they
     are blocked; the saved archive is kept, so unblocking shows it again. */
  thread(fid) { return isBlockedId(fid) ? [] : readJson('bt_dm:' + fid, []); },
  appendDm(fid, msg, mine) {
    const t = readJson('bt_dm:' + fid, []);   /* the saved archive, never the filtered view */
    t.push({ from: msg.from, fromName: msg.fromName, text: msg.text, ts: msg.ts || Date.now(), mine: !!mine });
    if (t.length > THREAD_MAX) t.splice(0, t.length - THREAD_MAX);
    try { localStorage.setItem('bt_dm:' + fid, JSON.stringify(t)); } catch (_e) {}
    if (!mine && openThread !== fid) {
      const u = readJson('bt_dm_unread', {});
      u[fid] = (u[fid] || 0) + 1;
      try { localStorage.setItem('bt_dm_unread', JSON.stringify(u)); } catch (_e) {}
    }
    emit();
  },
  unreadOf(fid) { return isBlockedId(fid) ? 0 : (readJson('bt_dm_unread', {})[fid] || 0); },
  unreadTotal() {
    const u = readJson('bt_dm_unread', {});
    return Object.keys(u).reduce((n, k) => n + (isBlockedId(k) ? 0 : (u[k] || 0)), 0);
  },
  setOpenThread(fid) {
    openThread = fid;
    if (fid) {
      const u = readJson('bt_dm_unread', {});
      if (u[fid]) { delete u[fid]; try { localStorage.setItem('bt_dm_unread', JSON.stringify(u)); } catch (_e) {} }
    }
    emit();
  },
  openThread() { return openThread; },

  setError(e) { lastError = e ? { ...e, at: Date.now() } : null; emit(); },
  takeError() { const e = lastError; lastError = null; return e; },

  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};

/* Debug/QA handle (same pattern as window.__broDashPanelBus). */
if (typeof window !== 'undefined') window.__broFriendsSrv = friendsSrv;
