/* THE ROOM FORGETS WHO LEFT -- v2.3.5544 (the red team's RT-1 N11; card K).
 *
 * RT-1, 2026-11-15: "Every throwaway guest leaves ~27 KB on the room's heap
 * for good; ~4,000 of them reset the room".  Cloudflare resets a Durable
 * Object past 128 MB: every player thrown out at once, whatever was not yet
 * saved lost, and the attacker starts again.  The worst: gathering.js kept a
 * refused strike with the phone's raw `zone` (up to the 16 KB frame), keyed
 * by the guest's id, never deleted.  Six smaller maps had the same shape: a
 * player's entry made on a message and kept after they left.
 *
 * HEAP_FORGET is THE ONE CLOSED LIST of the room's maps keyed by a player
 * (`heap-forget.test` fails a map on the room that still holds a guest who
 * left and is not a row here).  Each row says when its entry goes:
 *   leave     at the leave (leave.js's body duty, linger.js's end): a record
 *             only for the operator's view or a cool-down of the player's own
 *   refilled  a rate limit's token bucket: kept while it is still spent (a
 *             leave and a rejoin must not hand back a full allowance), gone
 *             once it would be full again -- at the leave if it is, else at
 *             the room's sweep, at most once a SWEEP_MS
 *   aged      a log of times: gone once its newest is older than its window
 * And what is kept is bounded: a refused strike keeps a string field only up
 * to STR_MAX characters (gathering.js _strikeRefused).
 *
 * `heapforget: false` in the live flags: nothing forgotten and the strike's
 * record kept whole, as before (RT-1 N11 open again).
 */
import { CHAT_LANES } from './chatlanes.js';
import { STORE_CHAT } from './storechat.js';
import { REQ_ONCE } from './reqonce.js';

export const HEAP_FORGET_CFG = Object.freeze({
  SWEEP_MS: 60 * 1000,   /* the room's sweep of the spent buckets and old logs, at most this often */
  STR_MAX: 64,           /* a refused strike's string field, at most (a node id, a zone id: under 40) */
});

const DAY_MS = 24 * 3600 * 1000;

export const HEAP_FORGET = Object.freeze({
  /* gathering.js _strikeRefused: the last refused strike, for the operator's view */
  _lastStrikeById:    Object.freeze({ shape: 'object', when: 'leave' }),
  /* arrowblast.js: refusals counted for the operator's view */
  _arrowBlastRejects: Object.freeze({ shape: 'object', when: 'leave' }),
  /* firetrail.js: the next burn's time, the player's own */
  _fireBurnAt:        Object.freeze({ shape: 'object', when: 'leave' }),
  /* chatlanes.js _laneAllow: the area and whisper lanes' bucket */
  _laneBuckets:       Object.freeze({ shape: 'map', when: 'refilled', burst: CHAT_LANES.BURST, refillMs: CHAT_LANES.REFILL_MS }),
  /* storechat.js _scAllow: the store chat's bucket */
  _scBuckets:         Object.freeze({ shape: 'map', when: 'refilled', burst: STORE_CHAT.BURST, refillMs: STORE_CHAT.REFILL_MS }),
  /* chatmod.js _chatModReportGate: a reporter's reports in the last day */
  _chatReportLog:     Object.freeze({ shape: 'map', when: 'aged', windowMs: DAY_MS }),
  /* reqonce.js _reqRemember (v2.3.5194): a sitting's answers, kept past a
     leave so a re-send after a reconnect gets its first answer */
  _reqSeen:           Object.freeze({ shape: 'map', when: 'aged', windowMs: REQ_ONCE.MEM_MS }),
});

/* true when this entry may go now */
function stale(row, v, now) {
  if (row.when === 'leave') return true;
  if (!v) return true;
  if (row.when === 'refilled') return (Number(v.tokens) || 0) + Math.floor((now - (Number(v.at) || 0)) / row.refillMs) >= row.burst;
  if (row.when === 'aged') return !Array.isArray(v) || !v.some((r) => r && now - (Number(r.ts) || 0) < row.windowMs);
  return false;
}

function drop(store, row, key) {
  if (row.shape === 'map') store.delete(key);
  else delete store[key];
}

export const heapForgetMethods = {
  _heapForgetOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, 'heapforget') && !f.heapforget);
  },

  /* A player left (leave.js's body duty, linger.js's end): their entries go,
     each by its row; then, at most once a SWEEP_MS, every spent bucket and old
     log that has come good since, whoever it was. */
  _heapForget(pid, now) {
    if (!pid || this._heapForgetOff()) return;
    const t = Number(now) || Date.now();
    for (const name of Object.keys(HEAP_FORGET)) {
      const row = HEAP_FORGET[name];
      const store = this[name];
      if (!store) continue;
      const v = row.shape === 'map' ? store.get(pid) : (Object.prototype.hasOwnProperty.call(store, pid) ? store[pid] : undefined);
      if (v !== undefined && stale(row, v, t)) drop(store, row, pid);
    }
    if (t - (this._heapSweptAt || 0) >= HEAP_FORGET_CFG.SWEEP_MS) this._heapSweep(t);
  },

  /* The kept entries that have come good: a bucket full again, a log aged
     out.  Only the rows kept past a leave; a 'leave' row's entry of a player
     still here is theirs. */
  _heapSweep(now) {
    this._heapSweptAt = now;
    for (const name of Object.keys(HEAP_FORGET)) {
      const row = HEAP_FORGET[name];
      if (row.when === 'leave') continue;
      const store = this[name];
      if (!store) continue;
      if (row.shape === 'map') { for (const [k, v] of store) if (stale(row, v, now)) store.delete(k); }
      else for (const k of Object.keys(store)) if (stale(row, store[k], now)) delete store[k];
    }
  },

  /* gathering.js _strikeRefused's record: a string field kept only up to
     STR_MAX (the phone's raw zone could be the 16 KB frame) */
  _heapClip(extra) {
    if (!extra || typeof extra !== 'object' || this._heapForgetOff()) return extra;
    const out = {};
    for (const k of Object.keys(extra)) {
      const v = extra[k];
      out[k] = typeof v === 'string' && v.length > HEAP_FORGET_CFG.STR_MAX ? v.slice(0, HEAP_FORGET_CFG.STR_MAX) + '...' : v;
    }
    return out;
  },
};
