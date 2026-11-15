/* ═══ v2.3.5602: A WAITING CROWD KNOCKS MORE SLOWLY (card OPS PR 3; red team RT-2, F2) ═══
 *
 * A full room answers every waiting phone `room_full` with `retryMs` (join.js
 * `_roomFullRefusal`), and the phone knocks again after it, clamped to 2-30 s
 * and jittered +-20% (wsClient.js `_rfDelay`).  The worker always asked for
 * 5 s, so 2,000 phones waiting knocked ~400 times a second, each a request
 * into the room's one thread.  Measured on the local runtime
 * (docs/security/rt2-probes/refusalstorm.mjs, an upper bound): 400 refusals
 * a second took the busiest runtime thread from 1% to 57%, beside a full
 * room's ~80% (docs/specs/cap-120.md).
 *
 * `retryMs` was put on the wire "so a future worker can slow a herd down
 * without a client deploy" (docs/specs/room-full.md).  This is that worker:
 * the room counts its refusals over the last WINDOW_S seconds (a ring of
 * one-second counts, in memory: nothing written) and asks for
 *
 *     BASE_MS x max(1, refusals a second / PER_S), at most MAX_MS
 *
 * Up to PER_S knocks a second (a crowd of ~200 waiting) nothing changes.
 * Past it, each slower answer slows the next knocks: W phones waiting settle
 * where the rate R gives back the retry that makes it, R = W / (retryMs/1000)
 * with retryMs = BASE_MS x R / PER_S, so R^2 = W x PER_S x 1000 / BASE_MS =
 * 8W.  2,000 waiting knock ~126 a second (not 400; each waits ~16 s), 5,000
 * ~200 (25 s); past ~7,200 the ceiling holds them at W / 30.  MAX_MS is the
 * phone's own ceiling (RF_RETRY_MAX), so nothing asks for what it would
 * clamp.
 *
 * A fixed cadence stays fair between waiters (room-full.md: the jitter is
 * what spreads them); a slower one is fair the same way.  Every waiter is
 * asked the same at the same moment.
 *
 * Both refusals count (the `?rf=1` socket and an old client's 503), and so
 * does the address limit's (`reason: 'ip'`): each is a knock on the thread.
 *
 * Kill switch `rf_spread: false` in the live flags: BASE_MS always, as before.
 */

export const RF_SPREAD = Object.freeze({
  BASE_MS: 5000,      /* join.js ROOM_FULL.RETRY_MS, the cadence before this */
  MAX_MS: 30000,      /* wsClient.js RF_RETRY_MAX: the phone clamps to it anyway */
  PER_S: 40,          /* refusals a second the room takes before asking for slower */
  WINDOW_S: 10,       /* seconds counted */
  FLAG: 'rf_spread',
});

/** `rf_spread: false` in the live flags (read the lower-case way). */
export function rfSpreadOff(room) {
  const f = room && room._liveFlags;
  return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, RF_SPREAD.FLAG) && !f[RF_SPREAD.FLAG]);
}

function ringOf(room, sec) {
  let r = room._rfRing;
  if (!r) r = room._rfRing = { sec, counts: new Array(RF_SPREAD.WINDOW_S).fill(0) };
  /* move to this second: every second passed since is a zero */
  const ahead = sec - r.sec;
  if (ahead > 0) {
    const n = Math.min(ahead, RF_SPREAD.WINDOW_S);
    for (let i = 1; i <= n; i++) r.counts[(r.sec + i) % RF_SPREAD.WINDOW_S] = 0;
    r.sec = sec;
  }
  return r;
}

/** One refusal, now. */
export function rfNote(room, now) {
  const sec = Math.floor((typeof now === 'number' ? now : Date.now()) / 1000);
  const r = ringOf(room, sec);
  if (sec < r.sec) return;   /* a clock that went back: not counted */
  r.counts[sec % RF_SPREAD.WINDOW_S]++;
}

/** Refusals a second over the last WINDOW_S seconds. */
export function rfRate(room, now) {
  const sec = Math.floor((typeof now === 'number' ? now : Date.now()) / 1000);
  const r = ringOf(room, sec);
  let sum = 0;
  for (const c of r.counts) sum += c;
  return sum / RF_SPREAD.WINDOW_S;
}

/** The `retryMs` a refusal asks for now. */
export function rfRetryMs(room, now) {
  if (rfSpreadOff(room)) return RF_SPREAD.BASE_MS;
  const k = Math.max(1, rfRate(room, now) / RF_SPREAD.PER_S);
  return Math.min(RF_SPREAD.MAX_MS, Math.round(RF_SPREAD.BASE_MS * k));
}
