/* ═══ v2.3.5606: A SEAT HELD FOR THE PLAYER WHO HAD IT (card OPS PR 7; red team RT-2, F1) ═══
 *
 * The cap's gate (index.js fetch) counted sockets and knew nothing of who had
 * just been inside.  A deploy restarts the room and drops every socket; a
 * player's phone comes back after its ordinary reconnect (wsClient.js
 * scheduleReconnect, 1 s), a waiting phone on its own clock (_rfDelay, 4-6 s,
 * spread), and whoever knocks first gets the seat.  Measured on the local
 * runtime (docs/security/rt2-probes/seatrace.mjs, cap 6): with 30 waiting, 1
 * of 6 seated players kept a seat through a restart; with 6 waiting, 4 of 6.
 * The same on one iPhone's blip: Safari drops the socket whenever the app
 * goes to the background.
 *
 * With `seathold: true` in the live flags:
 *   - a JOINED player whose socket closes (`close`, `error`: a drop, never a
 *     kick, the AFK sweep, a flood or a reset) holds a seat for HOLD_MS;
 *   - the room keeps who is in as one key, `seats` (the joined ids, at most
 *     MAX), written at most once every WRITE_MS (15 s) and only when it
 *     changed (at a minute, a deploy missed everyone who had joined in the
 *     minute before it: seatrace kept 1 of 6); a
 *     room that starts (a deploy) reads it once, at its first request, and
 *     holds those seats for RESTART_MS;
 *   - the socket gate lets in up to cap + held sockets, and the JOIN refuses
 *     an id that holds no seat once the free seats are gone (joined + held
 *     >= cap), with the `room_full` and close 4009 every phone already reads
 *     on an open socket (wsClient.js: either signal) -- before the account,
 *     the device or any record is read or written, so a refused stranger
 *     leaves nothing;
 *   - a held id is never counted twice: one that is joined again holds no
 *     seat (its hold just runs out).
 * An id is public (it is on the boards), so a stranger may name a held one:
 * the join goes on to the account and device checks like any other, and is
 * refused there; the hold is not used up by it.
 *
 * BUILT OFF: on only when `seathold` is `true`.  On, it costs at most one
 * small write every 15 s while the roster changes (5,760 a day at the very
 * most, ~17 cents a month at Cloudflare's $1 a million; a quiet room writes
 * nothing), and a pace that writes more is the owner's word.  Off: no hold, no read, no
 * write, the gate as before.
 */
import { rfNote, rfRetryMs } from './rfspread.js';

export const SEAT_HOLD = Object.freeze({
  FLAG: 'seathold',
  HOLD_MS: 60000,      /* a dropped player's seat; the phone is back in 1-10 s */
  RESTART_MS: 30000,   /* the roster's seats after a restart */
  WRITE_MS: 15000,     /* the roster written at most every 15 s, only when changed: at a minute, a deploy
                          missed everyone who joined in the minute before it (seatrace: 1 of 6 kept) */
  KEY: 'seats',
  MAX: 240,            /* ids held or written at most (twice the cap) */
  CLOSE_CODE: 4009,    /* join.js ROOM_FULL.CLOSE_CODE */
});

/** `seathold: true` in the live flags: on.  Unset or anything else: off. */
export function seatHoldOn(room) {
  const f = room && room._liveFlags;
  return !!(f && typeof f === 'object' && f[SEAT_HOLD.FLAG] === true);
}

export const seatHoldMethods = {
  _seatMem() {
    if (!this._seats) this._seats = { held: new Map(), loaded: false, wroteAt: 0, wroteSig: null };
    return this._seats;
  },

  /** The ids joined now. */
  _seatJoinedIds() {
    const out = new Set();
    for (const [, s] of this.sessions) if (s && s.id && s.phase === 'joined') out.add(s.id);
    return out;
  },

  /** The ids holding a seat now: not expired, not joined again. */
  _seatHeldIds(now) {
    if (!seatHoldOn(this)) return new Set();
    const m = this._seatMem();
    const joined = this._seatJoinedIds();
    const out = new Set();
    for (const [id, until] of m.held) {
      if (until <= now) { m.held.delete(id); continue; }
      if (!joined.has(id)) out.add(id);
    }
    return out;
  },

  /** A hold, capped: the oldest one goes first. */
  _seatHold(id, until) {
    const m = this._seatMem();
    m.held.delete(id);
    m.held.set(id, until);
    while (m.held.size > SEAT_HOLD.MAX) m.held.delete(m.held.keys().next().value);
  },

  /** leave.js: a joined player's drop holds their seat HOLD_MS. */
  _seatHoldLeave(id, now) {
    if (!seatHoldOn(this) || typeof id !== 'string' || !id) return;
    this._seatHold(id, (typeof now === 'number' ? now : Date.now()) + SEAT_HOLD.HOLD_MS);
  },

  /** index.js fetch, once a worker's life: the roster a deploy left, held
   *  RESTART_MS.  A failed read holds nothing and is not tried again. */
  async _seatHoldLoad(now) {
    if (!seatHoldOn(this)) return;
    const m = this._seatMem();
    if (m.loaded) return;
    m.loaded = true;
    let ids = null;
    try { ids = await this.state.storage.get(SEAT_HOLD.KEY); } catch (e) { ids = null; }
    if (!Array.isArray(ids)) return;
    const until = (typeof now === 'number' ? now : Date.now()) + SEAT_HOLD.RESTART_MS;
    for (const id of ids.slice(0, SEAT_HOLD.MAX)) if (typeof id === 'string' && id) this._seatHold(id, until);
  },

  /** tick.js: the roster written, at most once every WRITE_MS, only when changed. */
  _seatRosterTick(now) {
    if (!seatHoldOn(this)) return;
    const m = this._seatMem();
    if (now - m.wroteAt < SEAT_HOLD.WRITE_MS) return;
    const ids = [...this._seatJoinedIds()].sort().slice(0, SEAT_HOLD.MAX);
    const sig = ids.join(',');
    m.wroteAt = now;
    if (sig === m.wroteSig) return;
    m.wroteSig = sig;
    try { this.state.storage.put(SEAT_HOLD.KEY, ids).catch(() => {}); } catch (e) { /* tried again next minute */ }
  },

  /** index.js fetch: the sockets let in beyond the cap, one a held seat. */
  _seatHeldCount(now) {
    return this._seatHeldIds(typeof now === 'number' ? now : Date.now()).size;
  },

  /** join.js, before the account is read: true when this join was refused
   *  (no seat held for it, and the free seats are gone). */
  _seatJoinRefused(ws, msg) {
    if (!seatHoldOn(this)) return false;
    const now = Date.now();
    const held = this._seatHeldIds(now);
    const id = msg && typeof msg.id === 'string' ? msg.id : '';
    if (id && held.has(id)) return false;
    const cap = this._roomCap();
    if (this._seatJoinedIds().size + held.size < cap) return false;
    rfNote(this, now);   /* a knock like any refusal (rfspread.js) */
    try {
      ws.send(JSON.stringify({ type: 'room_full', reason: 'full', count: this.sessions.size, cap, retryMs: rfRetryMs(this, now) }));
    } catch (e) { /* the close says it alone */ }
    try { ws.close(SEAT_HOLD.CLOSE_CODE, 'room full'); } catch (e) { /* gone */ }
    this._playerLeaves(ws, 'refused');   /* the session door (leave.js) */
    return true;
  },
};
