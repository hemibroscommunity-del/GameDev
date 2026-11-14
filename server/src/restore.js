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
 * TWO STEPS, behind the owner's key (admin.js POST /api/admin/rewind), by
 * hand only (never a timer, never a refusal's answer), never on a word from a
 * page -- and only once the owner has set `roomrewind: true` in the live
 * flags (OFF by default: the planning session's limits, 2026-11-14):
 *   1. THE PLAN  `{step: 'plan', minutesAgo | at | bookmark}`, and what any
 *      ask that is not a do gets (the dry run is the default): answers what
 *      it would do -- what it would RESTORE (the time) and what it would LOSE
 *      (everything written since: how long, who is in the room now), the
 *      storage's bookmark for it (`target`), the bookmark of NOW (`now`: the
 *      way back to this moment), how many sockets and players it would close
 *      -- the words to type back (`confirm`: the hour, "2026-11-14 11:02 UTC")
 *      and a one-time `token`, good for PLAN_TTL_MS.  Nothing changes.
 *   2. THE DO    `{step: 'do', token, confirm}`, the hour typed back exactly
 *      as the plan wrote it: every socket is told and closed (code
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
 * WHAT ELSE GOES BACK (the planning session's mend, sitting 16): everything
 * in the room's storage, not only the players' things -- the live flags
 * (`roomrewind` itself: the undo's plan answers "off" until it is set
 * again), the owner's freezes, the login keys handed out and the devices
 * admitted (a key or device given since is refused after: give that
 * character a new key), and the announcement.  The plan and the do say so
 * (`alsoBack`), with the flags and the freezes as they are now.
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
 * ITS SWITCH `roomrewind: true` in the live flags turns the lever ON; unset or
 * false (the default) it answers `off` to both steps.
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

/** The lever works only with `roomrewind: true` in the live flags (OFF by
 *  default: the planning session's limits for it, 2026-11-14). */
export function rewindOn(room) {
  const f = room && room._liveFlags;
  return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'roomrewind') && f.roomrewind === true);
}
const OFF = Object.freeze({ ok: false, error: 'off', words: 'The room\'s way back is off: set `roomrewind: true` in the live flags to use it (and back to false after).' });

/** The words the do must have typed back: the hour, to the minute, in UTC
 *  ("2026-11-14 11:02 UTC"), or for an earlier answer's bookmark its first
 *  eight characters ("bookmark 0000002a"). */
export function rewindConfirm(t) {
  if (t && t.at !== undefined && t.at !== null) return new Date(t.at).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
  return 'bookmark ' + String(t && t.bookmark || '').slice(0, 8);
}

/* What it would restore and what it would lose, in numbers and words, for
   the plan's answer and the do's. */
function restoreLose(room, at, now) {
  const players = [];
  for (const [pid, ps] of Object.entries((room && room.playerState) || {})) {
    if (players.length >= 20) break;
    players.push((ps && typeof ps.name === 'string' && ps.name) || pid);
  }
  const here = Object.keys((room && room.playerState) || {}).length;
  const when = at === null || at === undefined ? 'the moment that bookmark was taken' : new Date(at).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
  const minutes = at === null || at === undefined ? null : Math.max(0, Math.round((now - at) / 60000));
  return {
    restore: { at: at === undefined ? null : at, words: 'The whole room as it was at ' + when + ': every character, vault, mail, listing, order and pile on the ground.' },
    lose: {
      minutes, players, playersHere: here,
      words: 'Everything written after ' + when + (minutes === null ? '' : ' (' + minutes + ' minute(s))') + ': every save, trade, purchase and reward since, for everyone.'
        + (here ? ' The ' + here + ' player(s) in the room now are disconnected and come back to that time: ' + players.join(', ') + (here > players.length ? ', ...' : '') + '.' : ' Nobody is in the room now.'),
    },
  };
}

/* v2.3.5288 (the planning session's mend, sitting 16): what ELSE goes back.
   The live flags (`liveflags`), the owner's freezes (`frozen:<pid>`), the
   logins (`auth:`, `keyidx:`: the keys handed out, the devices admitted) and
   the announcement (`motd`) are in the same storage, so they go back with
   the rest -- `roomrewind` itself included, so the undo's plan answers "off"
   until it is set again.  The plan and the do say so, with the flags and the
   freezes as they are NOW (the flags' one record; the freezes one list of a
   few rows), so the owner can set again what was set since. */
const ALSO_FROZEN_MAX = 100;
async function alsoBack(room, st) {
  /* the flags as STORED: the record that goes back (the flags route writes
     every change to it), read whole as the storage holds it */
  let flags = {};
  try {
    const rec = st && typeof st.get === 'function' ? await st.get('liveflags') : null;
    if (rec && typeof rec === 'object') flags = JSON.parse(JSON.stringify(rec));
  } catch (e) { flags = {}; }
  let frozen = [];
  try {
    const m = st && typeof st.list === 'function' ? await st.list({ prefix: 'frozen:', limit: ALSO_FROZEN_MAX }) : null;
    if (m) frozen = [...m.keys()].map((k) => k.slice('frozen:'.length));
  } catch (e) { frozen = []; }
  const names = Object.keys(flags).sort();
  const flagWords = names.length ? names.slice(0, 60).map((k) => k + '=' + JSON.stringify(flags[k])).join(', ') + (names.length > 60 ? ', ...' : '') : 'none';
  return {
    flags, frozen,
    words: 'These go back too, being in the same storage: the live flags, the freezes, the login keys and the devices admitted, and the announcement.'
      + ' The flags now: ' + flagWords + '. Frozen now: ' + (frozen.length ? frozen.join(', ') + (frozen.length >= ALSO_FROZEN_MAX ? ', ...' : '') : 'nobody') + '.'
      + ' After it: re-throw any switch, and freeze again anyone frozen, since that time; set `roomrewind: true` again for the undo (it goes back to off if it was set after then);'
      + ' a login key handed out or a device admitted since is refused (give that character a new key: /api/admin/key-new); the announcement may be an older one.',
  };
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
  if (!rewindOn(room)) return { ...OFF };
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
  const confirm = rewindConfirm(t);
  room._rewind = { token, target, confirm, at: t.at === undefined ? null : t.at, made: now };
  const rl = restoreLose(room, room._rewind.at, now);
  const also = await alsoBack(room, st);
  return {
    ok: true, step: 'plan', dryRun: true, at: room._rewind.at, target, now: here, sockets, players, token, confirm,
    restore: rl.restore, lose: rl.lose, alsoBack: also,
    expiresAt: now + REWIND.PLAN_TTL_MS,
    words: 'A dry run: nothing has changed. It would RESTORE ' + rl.restore.words.replace(/^The whole room/, 'the whole room') + ' It would LOSE ' + rl.lose.words.replace(/^Everything/, 'everything')
      + ' ' + also.words
      + ' It would close ' + sockets + ' connection(s) and restart the room. Keep `now`: the plan run again with {bookmark: now} comes back to this moment.'
      + ' To go ahead, send {step: "do", token, confirm: "' + confirm + '"} within ' + Math.round(REWIND.PLAN_TTL_MS / 60000) + ' minutes.',
  };
}

/** STEP 2, THE DO: the plan's token, once.  Every socket told and closed
 *  (each player saved through the leave door first), the restore set for
 *  the next start, and the restart a moment after the answer goes. */
export async function rewindDo(room, body, now = Date.now()) {
  if (!rewindOn(room)) return { ...OFF };
  const p = room && room._rewind;
  const b = body && typeof body === 'object' ? body : {};
  if (!p || typeof b.token !== 'string' || b.token !== p.token) return { ok: false, error: 'token', words: 'No plan with that token: make the plan first.' };
  /* the hour typed back exactly as the plan wrote it (a slip keeps the plan:
     type it again) */
  if (b.confirm !== p.confirm) return { ok: false, error: 'confirm', words: 'Nothing done. Type the time back exactly as the plan wrote it: confirm: "' + p.confirm + '".' };
  room._rewind = null;   /* one use, whatever happens next */
  if (now - p.made > REWIND.PLAN_TTL_MS) return { ok: false, error: 'stale', words: 'That plan is too old: make it again.' };
  /* what it restores and what it loses, written into the answer before it acts */
  const rl = restoreLose(room, p.at, now);
  const st = room.state.storage;
  const also = await alsoBack(room, st);
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
  /* 2. the owner's log line, BEFORE the restore is armed (the planning
     session's mend, sitting 16): nothing is awaited between arming and the
     answer, so a slow write can never lose the answer that carries the only
     copy of `undo` while the restore still happens.  The line is in the
     undo's moment (the room just before), and stays if the storage refuses */
  try { if (typeof room._adminLog === 'function') await room._adminLog({ op: 'rewind', at: p.at, target: p.target, closed }); } catch (e) { /* the log goes back with the room anyway */ }
  /* 3. the restore, at the room's next start; its answer is the way back */
  let undo;
  try { undo = await st.onNextSessionRestoreBookmark(p.target); } catch (e) {
    return { ok: false, error: 'restore', words: 'The storage refused the restore: ' + String(e && e.message || e).slice(0, 200) + '. Nothing was put back; the players reconnect into the room as it is.', closed };
  }
  const out = { ok: true, step: 'do', at: p.at, target: p.target, undo, closed, restore: rl.restore, lose: rl.lose, alsoBack: also,
    words: 'Done. RESTORED: ' + rl.restore.words + ' LOST: ' + rl.lose.words + ' ' + also.words + ' The room restarts now.'
      + ' KEEP `undo`: the plan run again with {bookmark: undo} puts back everything up to this moment.' };
  /* the worker's log carries the undo too (synchronous: nothing awaited) */
  try { console.log(JSON.stringify({ rewind: { at: p.at, target: p.target, undo, closed } })); } catch (e) { /* no log */ }
  /* 4. the restart, once the answer is on its way */
  const abort = () => { try { room.state.abort('the room restored to an earlier time'); } catch (e) { /* restarting */ } };
  setTimeout(abort, REWIND.ABORT_MS);
  return out;
}
