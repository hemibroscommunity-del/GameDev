/* ═══ v2.3.3202: THE WORLD KEEPS ITS SPEED IN A BUSY ROOM ═══
 *
 * The room's 45 Hz heartbeat is `setInterval(tick, TICK_RATE)` (tick.js), and
 * the runtime's setInterval waits the whole interval AFTER each tick has
 * finished, not from when it started.  Measured on the local runtime with a
 * one-line Durable Object whose tick does a fixed amount of work: a tick that
 * takes nothing runs 43.2 times a second (23.1 ms apart), one of 2 ms 39.1, of
 * 5 ms 35.0, of 10 ms 29.5, of 20 ms 22.6 -- the period is 23.1 ms PLUS the
 * tick.  So a busier room is a slower world even while its thread has time to
 * spare: monsters move a fixed step a tick, burns and regeneration count
 * ticks, and at 100 players (37 ticks a second) everything ran at 87% of a
 * quiet room's speed with a quarter of the thread idle (docs/specs/load-test.md
 * "The answer" says the same from the other side: "a tick starts 22 ms after
 * the last one finishes").
 *
 * So the gap between ticks is now PACED: the room watches how far apart its
 * ticks really start (smoothed, EMA), and when that is more than TARGET (a
 * quiet room's own period here: 22 ms + the timer's ~1 + a quiet tick's ~1)
 * it shortens the interval by part of the excess, and lengthens it again when
 * they come sooner, never past TICK_RATE; a tick that comes far sooner than
 * TARGET (the load has gone) puts it straight back up.  The interval is only changed by clearing it and setting it
 * again after a tick, so a steady room keeps one interval.
 *
 * What it can and cannot do:
 *   - it never makes the world faster than a quiet room's: a quiet room's
 *     ticks come TARGET apart or less and it does nothing at all, and a tick
 *     that came early is the last one (paceInterval);
 *   - it only spends time the thread has: past the point where the thread is
 *     full, ticks slow down exactly as before, and MIN_MS between ticks is
 *     always left for the players' own messages;
 *   - one slow moment (a long message, a garbage collection) counts at most
 *     SAMPLE_MAX_MS, so it brings a few quick ticks at most, not a burst.
 *
 * The real runtime only: the Node test harnesses capture the tick from
 * setInterval and call it by hand (tick-share, far-players, aggro-grid ...),
 * and there a re-armed interval would start ticking on its own.  `WebSocketPair`
 * is a global of the Workers runtime alone (index.js opens every socket with
 * it), so it says where we are.
 *
 * Kill switch: `tickpace: false` in the live flags -- the plain interval
 * again, from the next tick.  /dev/overview shows the pacer (`tickPace`).
 */
export const TICK_PACE = Object.freeze({
  /* a quiet room's own period: TICK_RATE + this */
  ABOVE_MS: 2,
  /* inside TARGET +- BAND nothing changes */
  BAND_MS: 1,
  /* a tick this much sooner than TARGET is no jitter: the load has gone */
  EARLY_MS: 6,
  /* the shortest interval: room for the players' messages between ticks */
  MIN_MS: 6,
  /* smoothing of the measured period, and how much of the error one tick
     corrects */
  EMA: 0.2,
  GAIN: 0.5,
  /* one sample counts at most this much (a hitch is not a trend) */
  SAMPLE_MAX_MS: 60,
});

/* The Workers runtime, where intervals really fire (see the note above). */
const REAL_TIMERS = typeof WebSocketPair === 'function';

/* The rule, on its own: the interval wanted next, from the interval now, the
   smoothed period between tick starts and the last one measured.  Whole
   milliseconds.
     - ticks that come later or sooner than TARGET, on average, move the
       interval by half the difference each tick (the average, so a room's
       ordinary jitter is not chased);
     - one tick EARLY_MS or more sooner than TARGET is not jitter, it is load
       that has gone (a crowd's connections lost together): the interval goes
       straight back up by the whole difference, so the world is never faster
       than a quiet room's for more than that one tick. */
export function paceInterval(ivMs, periodMs, sampleMs, tickMs) {
  const target = tickMs + TICK_PACE.ABOVE_MS;
  const clamp = (v) => Math.min(tickMs, Math.max(TICK_PACE.MIN_MS, Math.round(v)));
  if (sampleMs >= 0 && sampleMs < target - TICK_PACE.EARLY_MS) return clamp(ivMs + (target - sampleMs));
  if (periodMs > target + TICK_PACE.BAND_MS) return clamp(ivMs - (periodMs - target) * TICK_PACE.GAIN);
  if (periodMs > 0 && periodMs < target - TICK_PACE.BAND_MS) return clamp(ivMs + (target - periodMs) * TICK_PACE.GAIN);
  return ivMs;
}

export const tickPaceMethods = {
  /* `tickpace: false` in the live flags: the plain interval */
  _tickPaceOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'tickpace') && !f.tickpace);
  },

  /* At the start of every tick (tick.js), with Date.now(): measure how far
     apart the ticks start, and work out the interval wanted. */
  _tickPaceStart(now) {
    let p = this._tickPace;
    if (!p) p = this._tickPace = { last: 0, period: 0, iv: this.TICK_RATE, want: this.TICK_RATE, rearms: 0 };
    if (p.last && typeof now === 'number') {
      const sample = Math.min(TICK_PACE.SAMPLE_MAX_MS, Math.max(0, now - p.last));
      /* a tick that came EARLY (the load gone, paceInterval) starts the
         average again from itself, so the memory of a busy spell does not take
         the interval straight back down */
      const early = sample < this.TICK_RATE + TICK_PACE.ABOVE_MS - TICK_PACE.EARLY_MS;
      p.period = (p.period && !early) ? p.period + (sample - p.period) * TICK_PACE.EMA : sample;
      p.want = this._tickPaceOff() ? this.TICK_RATE : paceInterval(p.iv, p.period, sample, this.TICK_RATE);
    }
    p.last = now;
  },

  /* After the tick: if the wanted interval changed, set the interval again
     (`fn` is the tick itself).  Never when the loop has been stopped
     meanwhile, and never outside the real runtime. */
  _tickPaceEnd(fn) {
    const p = this._tickPace;
    if (!p || !REAL_TIMERS || !this.tickInterval || p.want === p.iv) return;
    clearInterval(this.tickInterval);
    p.iv = p.want;
    p.rearms++;
    this.tickInterval = setInterval(fn, p.iv);
  },

  /* for /dev/overview */
  _tickPaceInfo() {
    const p = this._tickPace;
    return {
      on: REAL_TIMERS && !this._tickPaceOff(),
      intervalMs: p ? p.iv : this.TICK_RATE,
      periodMs: p && p.period ? Math.round(p.period * 10) / 10 : null,
      ticksPerSec: p && p.period ? Math.round(10000 / p.period) / 10 : null,
      rearms: p ? p.rearms : 0,
    };
  },
};
