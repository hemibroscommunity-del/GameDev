/* ═══ v2.3.5288: THE ROOM'S WAY BACK -- the whole room restored to a time (grand plan step 4.7, card R PR 9) ═══
 * (spec docs/specs/restore.md; the owner's steps: docs/OPERATIONS.md, "Taking
 *  the whole room back to an earlier time"; held by server/test/rewind.test.mjs)
 *
 * WHY.  A player's restore puts back one character from its daily copy
 * (admin.js `/restore`, `rpgsnap:`).  When something goes wrong for the
 * WHOLE room -- a bad deploy that wrote nonsense into every save, a road that
 * copied gold for an hour -- there was no way back short of hand-editing
 * storage.  The room is a SQLite-backed Durable Object, and Cloudflare keeps
 * every change of its storage for 30 days: it can be put back to any moment
 * in them (point-in-time recovery).  This is the owner's lever for it.
 *
 * TWO STEPS, behind the owner's key (admin.js POST /api/admin/rewind), never
 * on a word from a page:
 *   1. THE PLAN  `{step: 'plan', minutesAgo | at | bookmark}`: answers what it
 *      would do -- the time, the storage's bookmark for it (`target`), the
 *      bookmark of NOW (`now`: the way back to this moment), how many sockets
 *      and players it would close -- and a one-time `token`, good for
 *      PLAN_TTL_MS.  Nothing changes.
 *   2. THE DO    `{step: 'do', token}`: every socket is told and closed (code
 *      CLOSE_CODE, reason CLOSE_WHY; each player leaves through the leave
 *      door, so their last state is saved first), the storage is asked to be
 *      the target's at the room's next start
 *      (`onNextSessionRestoreBookmark`), and the room restarts a moment after
 *      the answer goes (`state.abort`).  The answer's `undo` is the bookmark
 *      of the room as it was just before -- everything up to the restore,
 *      the leavers' saves included -- and the plan run again with
 *      `{bookmark: undo}` puts it all back.  KEEP IT: the room's own storage
 *      (its log included) goes back with the rest, so the answer and the
 *      worker's log line are the only places it is written.
 *
 * WHAT A PLAYER SEES: their connection drops, as at a deploy (the page treats
 * an unknown close as an ordinary drop: its veil, then a reconnect), and they
 * come back into the room as it was at that time.  No new words on a page.
 *
 * WHAT IT DOES NOT DO: keep anything written after the target (every save,
 * trade and purchase after it is gone, as if never made -- the undo is the way
 * back); reach any other object (the Leaderboard, the Feedback board); keep
 * what lives only in memory.  The world's sum (step 4.4) stays balanced at
 * any time it is taken to: what the sum reads is written with what it counts
 * (the plan's rule 5), so every moment of storage balances
 * (rewind.test.mjs: unexplained 0 after a rewind).
 *
 * LOCALLY: `wrangler dev --local` keeps `getCurrentBookmark` but not
 * `getBookmarkForTime` ("This Durable Object's storage back-end does not
 * implement point-in-time recovery"), so the plan answers `no-pitr` there;
 * the logic is tested in node on a stand-in storage, and the real try is the
 * Cloudflare lab's, for the owner to run (tools/lab/, --restore).
 *
 * KILL SWITCH `roomrewind: false` in the live flags: the lever answers `off`
 * to both steps.
 *
 * No imports: the lab worker (tools/lab/src/index.js) runs these same
 * functions on its own object. */

export const REWIND = Object.freeze({
  /* Cloudflare keeps 30 days of a SQLite object's changes */
  MAX_AGO_MS: 30 * 86400000,
  /* the do must come within this of its plan, or plan again */
  PLAN_TTL_MS: 10 * 60000,
  /* the close every socket gets: 1012, "service restart" (a deploy's kind of
     drop: the page reconnects) */
  CLOSE_CODE: 1012,
  CLOSE_WHY: 'the room is being restored to an earlier time',
  /* the room restarts this long after the do's answer is on its way */
  ABORT_MS: 50,
  /* a bookmark the storage gave: hex and dashes */
  BOOKMARK_MAX: 200,
});

const BOOKMARK_RE = /^[0-9a-fA-F-]+$/;
const bookmarkOk = (b) => typeof b === 'string' && b.length > 0 && b.length <= REWIND.BOOKMARK_MAX && BOOKMARK_RE.test(b);

/** `roomrewind: false` in the live flags. */
export function rewindOff(room) {
  const f = room && room._liveFlags;
  return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'roomrewind') && !f.roomrewind);
}

/** Where the plan goes back to, from the ask: a bookmark an earlier answer
 *  gave (an undo), or a time (`at` in ms since 1970, or `minutesAgo`).
 *  `{bookmark}` or `{at}`, or `{error}` in words. */
export function rewindTarget(body, now) {
  const b = body && typeof body === 'object' ? body : {};
  if (b.bookmark !== undefined) return bookmarkOk(b.bookmark) ? { bookmark: b.bookmark } : { error: 'bookmark: the one an earlier answer gave' };
  let at = null;
  if (b.at !== undefined) at = Number(b.at);
  else if (b.minutesAgo !== undefined) { const m = Number(b.minutesAgo); at = Number.isFinite(m) ? now - m * 60000 : NaN; }
  if (at === null) return { error: 'say when: minutesAgo, at (ms), or bookmark' };
  if (!Number.isFinite(at)) return { error: 'when: a number' };
  if (at >= now) return { error: 'when: a time before now' };
  if (now - at > REWIND.MAX_AGO_MS) return { error: 'when: within the last 30 days' };
  return { at: Math.floor(at) };
}

/* Every socket the room holds: its sessions' and the runtime's own list. */
function socketsOf(room) {
  const all = new Set();
  if (room.sessions && typeof room.sessions.keys === 'function') for (const ws of room.sessions.keys()) all.add(ws);
  try { if (room.state && typeof room.state.getWebSockets === 'function') for (const ws of room.state.getWebSockets()) all.add(ws); } catch (e) { /* none */ }
  return [...all];
}
const randomToken = () => {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return [...a].map((x) => x.toString(16).padStart(2, '0')).join('');
};

/** STEP 1, THE PLAN: what it would do, and the bookmark of now.  Changes
 *  nothing but the plan kept in memory (one at a time; a new plan replaces
 *  the last). */
export async function rewindPlan(room, body, now = Date.now()) {
  if (rewindOff(room)) return { ok: false, error: 'off', words: 'The room\'s way back is switched off (the roomrewind flag).' };
  const t = rewindTarget(body, now);
  if (t.error) return { ok: false, error: 'ask', words: t.error };
  const st = room && room.state && room.state.storage;
  if (!st || typeof st.getCurrentBookmark !== 'function' || typeof st.getBookmarkForTime !== 'function' || typeof st.onNextSessionRestoreBookmark !== 'function') {
    return { ok: false, error: 'no-pitr', words: 'This storage keeps no earlier times.' };
  }
  let target, here;
  try {
    target = t.bookmark || await st.getBookmarkForTime(t.at);
    here = await st.getCurrentBookmark();
  } catch (e) {
    return { ok: false, error: 'no-pitr', words: 'The storage could not give an earlier time: ' + String(e && e.message || e).slice(0, 200) };
  }
  if (!bookmarkOk(target) || !bookmarkOk(here)) return { ok: false, error: 'no-pitr', words: 'The storage gave no bookmark.' };
  const sockets = socketsOf(room).length;
  const players = room.playerState && typeof room.playerState === 'object' ? Object.keys(room.playerState).length : 0;
  const token = randomToken();
  room._rewind = { token, target, at: t.at === undefined ? null : t.at, made: now };
  const when = t.at === undefined ? 'the time of that bookmark' : new Date(t.at).toISOString();
  return {
    ok: true, step: 'plan', at: room._rewind.at, target, now: here, sockets, players, token,
    expiresAt: now + REWIND.PLAN_TTL_MS,
    words: 'This would close ' + sockets + ' connection(s) (' + players + ' player(s) in the room), put the whole room back to '
      + when + ', and restart it. Everything written after that is gone. Keep `now`: run the plan again with {bookmark: now} to come back to this moment.'
      + ' To go ahead, send {step: "do", token} within ' + Math.round(REWIND.PLAN_TTL_MS / 60000) + ' minutes.',
  };
}

/** STEP 2, THE DO: the plan's token, once.  Every socket told and closed
 *  (each player saved through the leave door first), the restore set for
 *  the next start, and the restart a moment after the answer goes. */
export async function rewindDo(room, body, now = Date.now()) {
  if (rewindOff(room)) return { ok: false, error: 'off', words: 'The room\'s way back is switched off (the roomrewind flag).' };
  const p = room && room._rewind;
  const token = body && typeof body === 'object' ? body.token : null;
  if (!p || typeof token !== 'string' || token !== p.token) return { ok: false, error: 'token', words: 'No plan with that token: make the plan first.' };
  room._rewind = null;   /* one use, whatever happens next */
  if (now - p.made > REWIND.PLAN_TTL_MS) return { ok: false, error: 'stale', words: 'That plan is too old: make it again.' };
  const st = room.state.storage;
  /* 1. every socket told and closed; a player leaves through the leave door
     (admin.js _adminPutOut: the close, the leaving with its save, the
     session gone), so the undo below holds their last state */
  let closed = 0;
  for (const ws of socketsOf(room)) {
    try {
      if (typeof room._adminPutOut === 'function') await room._adminPutOut(ws, REWIND.CLOSE_CODE, REWIND.CLOSE_WHY);
      else ws.close(REWIND.CLOSE_CODE, REWIND.CLOSE_WHY);
      closed++;
    } catch (e) { /* closed already */ }
  }
  /* 2. the restore, at the room's next start; its answer is the way back */
  let undo;
  try { undo = await st.onNextSessionRestoreBookmark(p.target); } catch (e) {
    return { ok: false, error: 'restore', words: 'The storage refused the restore: ' + String(e && e.message || e).slice(0, 200) + '. Nothing was put back; the players reconnect into the room as it is.', closed };
  }
  const out = { ok: true, step: 'do', at: p.at, target: p.target, undo, closed,
    words: 'The room restarts now, as it was at ' + (p.at === null ? 'that bookmark' : new Date(p.at).toISOString())
      + '. KEEP `undo`: the plan run again with {bookmark: undo} puts back everything up to this moment.' };
  try { if (typeof room._adminLog === 'function') await room._adminLog({ op: 'rewind', at: p.at, target: p.target, undo, closed }); } catch (e) { /* the log goes back with the room anyway */ }
  try { console.log(JSON.stringify({ rewind: { at: p.at, target: p.target, undo, closed } })); } catch (e) { /* no log */ }
  /* 3. the restart, once the answer is on its way */
  const abort = () => { try { room.state.abort('the room restored to an earlier time'); } catch (e) { /* restarting */ } };
  setTimeout(abort, REWIND.ABORT_MS);
  return out;
}
