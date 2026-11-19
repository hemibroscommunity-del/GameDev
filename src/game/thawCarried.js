/* ═══ v2.3.6309 (card RR PR 4): A GAP THE SOCKET CARRIED IS NOT A FREEZE ═══
 *
 * wsClient.js's one-second alive timer reads a gap in its own beats as the
 * page having been frozen (iOS parks a tab and fires no event for it), and
 * a socket that stayed open across a gap over RESYNC_AWAY_MS (5 s) was
 * rejoined (`_forceRejoin('resume-resync')`): v2.3.778's stale world, the
 * deltas a frozen page never got.  But a page can miss its beats without
 * being frozen at all: a slow device, or a held page, drawing one frame in
 * five seconds or more, has every gap over the line and was rejoined on
 * every one -- its socket made again every 6-30 s, its world reloaded each
 * time, and in a crowd it never settled (card RD's crowdfight, 2026-11-18:
 * a page knew 0 of 20 bots after 21 rejoins).
 *
 * The socket says which it was.  The worker pings every ~2-3 s (tick.js
 * _tickPingAndAfk, every 90 ticks), each with its own time, on the same
 * socket as every tick, in order.  If the pings whose times fall inside the
 * gap all reached this page (handled late, but there), the socket carried
 * the gap and every tick with it: nothing was missed, and a rejoin would only
 * cost a reload.  If they did not -- a phone whose network slept, a socket
 * the worker gave up on -- it is the stale world v2.3.778 found, and the
 * rejoin stands.  Nothing else of a return (the canvases Safari emptied, a
 * lost GL context) is judged here: only the forced rejoin.
 *
 * Pure: no imports, no clock of its own (server/test/thaw-carried.test.mjs).
 */
export const THAW = Object.freeze({
  /* the longest the worker's pings are apart (90 ticks of 22-33 ms is
     2.0-3.0 s; a busy worker runs late), so a gap of g ms holds at least
     floor(g / PING_MS) of them, less one at an edge */
  PING_MS: 3500,
  /* how long after the gap the page waits before judging it: its queued
     frames (the pings among them) are handled first */
  SETTLE_MS: 1000,
  /* how many recent pings are kept to judge with */
  KEEP: 40,
});

/** Did the socket carry the gap from `fromMs` to `toMs` (this page's clock)?
 *  `pings`: the worker times of the pings handled since; `offsetMs`: the
 *  worker's clock minus this page's, as known when the gap was found
 *  (workerClock.offset(), read BEFORE the late pings resample it);
 *  `known`: whether any ping had set that offset.  No offset known, or a
 *  gap of nothing: not carried (the old rule: rejoin). */
export function thawCarried(fromMs, toMs, pings, offsetMs, known) {
  if (!known || !Array.isArray(pings) || !Number.isFinite(offsetMs)) return false;
  const gap = toMs - fromMs;
  if (!(gap > 0)) return false;
  let n = 0;
  for (const ts of pings) {
    const t = Number(ts) - offsetMs;
    if (Number.isFinite(t) && t > fromMs && t <= toMs) n++;
  }
  return n >= thawPingsWanted(gap);
}

/** How many pings a gap of `gapMs` must have carried. */
export function thawPingsWanted(gapMs) {
  return Math.max(1, Math.floor(gapMs / THAW.PING_MS) - 1);
}
