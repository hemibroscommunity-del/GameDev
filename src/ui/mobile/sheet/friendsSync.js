/* v2.3.1324 (Friends server round): the client half of the friends
   wire — one store for the server-synced friend doc, the DM threads,
   and unread counts.  gameEvents.js routes friend_sync / friend_dm /
   friend_dm_backlog here; the panels subscribe.

   Threads persist in localStorage ('bt_dm:<fid>', capped) because the
   server's offline backlog is delivered-ONCE then cleared (friends.md)
   — the client is the archive.  Unread counts persist too
   ('bt_dm_unread') so a reload doesn't silently zero the badge. */

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

  requestsIn() { return doc ? Object.keys(doc.reqIn) : []; },
  serverList() { return doc ? doc.list : null; },

  thread(fid) { return readJson('bt_dm:' + fid, []); },
  appendDm(fid, msg, mine) {
    const t = this.thread(fid);
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
  unreadOf(fid) { return readJson('bt_dm_unread', {})[fid] || 0; },
  unreadTotal() {
    const u = readJson('bt_dm_unread', {});
    return Object.keys(u).reduce((n, k) => n + (u[k] || 0), 0);
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
