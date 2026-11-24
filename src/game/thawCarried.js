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
 * No imports, no clock of its own (server/test/thaw-carried.test.mjs); the
 * judge below sets the QA probe window.__btThaw.
 *
 * v2.3.6309 (card LF, sitting 57's hold): the DECISION lives here, not in
 * wsClient: thawBeat is the alive timer's whole say on a thaw, thawResume
 * the open socket's (carried: kept; not: the rejoin).  wsClient passes its
 * effects in (_resumeRecover, _forceRejoin) and keeps a call each, so the
 * suite plays the road "pings missing -> the gap handed on -> the rejoin"
 * with a fake clock, fake pings and a spy, and reads wsClient's tree only
 * for those calls.
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

/** The page's judge (wsClient.js): one a connection.  `clock` is
 *  game/workerClock.js's (offset(), known()).  ping(ts): a ping's worker
 *  time, kept (at most THAW.KEEP); gap(now, gapMs): a gap in the alive
 *  timer's beats, noted with the worker's clock as known NOW (before the
 *  late pings resample it); due(now, off): a SETTLE beat on, the noted gap
 *  judged -- { gap, carried } once, else null; `off` (`?thawjudge=0`) judges
 *  every gap stale, as before.  `rejoined` counts the gaps handed on to the
 *  rejoin, `carried` (count('carried')) those the socket carried.  QA:
 *  window.__btThaw(). */
export function makeThawJudge(clock) {
  const pings = [];
  const stats = { carried: 0, rejoined: 0, last: null };
  let pending = null;
  const judge = {
    ping(ts) {
      const n = Number(ts);
      if (!Number.isFinite(n)) return;
      pings.push(n);
      if (pings.length > THAW.KEEP) pings.shift();
    },
    gap(now, gapMs) {
      pending = { from: now - gapMs, to: now, gap: gapMs, off: clock.offset(), known: clock.known() };
    },
    due(now, off) {
      if (!pending || now - pending.to < THAW.SETTLE_MS) return null;
      const p = pending;
      pending = null;
      const carried = !off && thawCarried(p.from, p.to, pings, p.off, p.known);
      stats.last = { gap: p.gap, carried, at: now };
      if (!carried) stats.rejoined++;
      return { gap: p.gap, carried };
    },
    count(kind) { if (kind === 'carried') stats.carried++; },
    stats() { return { carried: stats.carried, rejoined: stats.rejoined, last: stats.last, pending: !!pending, kept: pings.length }; },
  };
  try { if (typeof window !== 'undefined') window.__btThaw = judge.stats; } catch (e) { /* QA only */ }
  return judge;
}

/** The alive timer's beat (wsClient.js _aliveTimer), the thaw's whole say:
 *  a gap noted a beat ago is judged now and handed to `fx.resume(gapMs,
 *  carried)` (the page's _resumeRecover('thaw', ...)); a gap over
 *  `env.awayMs` (RESYNC_AWAY_MS) is noted for the next beat, or, with
 *  `env.off` (`?thawjudge=0`), handed on at once with no judgement: main's
 *  exact path.  Nothing while the page is not visible.  `env`: { now, gap,
 *  visible, off, awayMs }.  Returns what it did ('judged', 'at-once',
 *  'noted', both: 'judged+noted'), or null. */
export function thawBeat(judge, env, fx) {
  let did = null;
  /* v2.3.6313: the page's try/catch around its resume lives here (it stood in wsClient.js, one statement over its line:
     sitting 60's hold); a resume that throws is dropped, the next return tries again, as it was */
  const resume = (g, c) => { try { fx.resume(g, c); } catch (e) { /* the next return tries again */ } };
  const d = judge.due(env.now, env.off);
  if (d && env.visible) { resume(d.gap, d.carried); did = 'judged'; }
  if (env.gap > env.awayMs && env.visible) {
    if (env.off) { resume(env.gap); did = 'at-once'; }
    else { judge.gap(env.now, env.gap); did = did ? did + '+noted' : 'noted'; }
  }
  return did;
}

/** _resumeRecover's open socket (wsClient.js), away `awayMs`: past
 *  `lineMs` (RESYNC_AWAY_MS), a gap the judge found carried keeps its
 *  socket (counted); anything else -- a gap not carried, a return iOS told
 *  of, `?thawjudge=0` -- is v2.3.778's stale world: `rejoin()` (the page's
 *  _forceRejoin('resume-resync', ...)).  Returns 'carried', 'rejoin' or null. */
export function thawResume(judge, awayMs, lineMs, carried, rejoin) {
  if (!(awayMs > lineMs)) return null;
  if (carried === true) { judge.count('carried'); return 'carried'; }
  rejoin();
  return 'rejoin';
}
