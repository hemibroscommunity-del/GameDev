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
 * MENDED (v2.3.5612; sitting 19b's review: "the gate cannot tell a holder
 * from a stranger" -- strangers' sockets filled the held slots while their
 * joins were in flight, ~2 in 3 blipped players still lost the seat with
 * 2,000 waiting; and `_seatJoinRefused` counted only phase `joined`, so two
 * strangers at once could pass the cap by the held seats):
 *   - the phone names its seat on the socket's address, `&seat=<its id>`
 *     (wsClient.js; a worker from before ignores it).  The gate
 *     (`_seatGate`) lets a STRANGER in only while every socket in the room
 *     (joined or in flight) plus the held seats is under the cap, and a
 *     socket that names a held seat (one socket a seat) on the held slots;
 *   - a socket let in on a seat must join with that id, or it is refused
 *     room_full (an id is public: a false claim gets nothing, and the hold
 *     is not used up);
 *   - a stranger's join counts every other socket in the room, in flight
 *     too, with the held seats;
 *   - the roster keeps the held seats with their ends (`{ v: 2, in, held }`),
 *     so a second restart within the hold keeps them, and it is written once
 *     more when the room empties (its tick stops), so a room started long
 *     after holds nobody;
 *   - the refusal's count says the seats taken (inside and held).
 * Without the seat on the address (a phone from before), a holder is let in
 * as a stranger would be.
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
    const t = typeof now === 'number' ? now : Date.now();
    const until = t + SEAT_HOLD.RESTART_MS;
    /* v2.3.5612: `{ v: 2, in, held }` -- who was in (held RESTART_MS) and
       the seats held then, each to its own end (a second restart within a
       hold keeps it); an array is the roster from before (who was in) */
    const inside = Array.isArray(ids) ? ids : (ids && Array.isArray(ids.in) ? ids.in : null);
    if (inside) for (const id of inside.slice(0, SEAT_HOLD.MAX)) if (typeof id === 'string' && id) this._seatHold(id, until);
    const kept = ids && !Array.isArray(ids) && Array.isArray(ids.held) ? ids.held : [];
    for (const row of kept.slice(0, SEAT_HOLD.MAX)) {
      if (!Array.isArray(row) || typeof row[0] !== 'string' || !row[0]) continue;
      const end = Math.min(Number(row[1]) || 0, t + SEAT_HOLD.HOLD_MS);
      if (end > t && !this._seatMem().held.has(row[0])) this._seatHold(row[0], end);
    }
  },

  /** tick.js: the roster written, at most once every WRITE_MS, only when
   *  changed.  v2.3.5612: who is in and the seats held, each to its end;
   *  `last` (leave.js, the room empty: its tick stops) writes it now. */
  _seatRosterTick(now, last) {
    if (!seatHoldOn(this)) return;
    const m = this._seatMem();
    if (!last && now - m.wroteAt < SEAT_HOLD.WRITE_MS) return;
    const inside = [...this._seatJoinedIds()].sort().slice(0, SEAT_HOLD.MAX);
    const heldNow = this._seatHeldIds(now);
    const held = [...m.held].filter(([id]) => heldNow.has(id)).sort((a, b) => (a[0] < b[0] ? -1 : 1)).slice(0, SEAT_HOLD.MAX);
    /* the ends move only when a seat is held again: the set of ids is what changes */
    const sig = inside.join(',') + '|' + held.map((r) => r[0] + ':' + r[1]).join(',');
    m.wroteAt = now;
    if (sig === m.wroteSig) return;
    m.wroteSig = sig;
    try { this.state.storage.put(SEAT_HOLD.KEY, { v: 2, in: inside, held }).catch(() => {}); } catch (e) { /* tried again next time */ }
  },

  /** The held seats now (the suites, the room's health). */
  _seatHeldCount(now) {
    return this._seatHeldIds(typeof now === 'number' ? now : Date.now()).size;
  },

  /** v2.3.5612: index.js fetch, the socket gate.  { ok, seat }: off, the cap
   *  as before.  On: a socket naming a held seat (`?seat=`, one socket a
   *  seat) is let in on the held slots, and carries the seat to its join; a
   *  stranger only while every socket in the room plus the held seats is
   *  under the cap. */
  _seatGate(url, now) {
    const cap = this._roomCap();
    if (!seatHoldOn(this)) return { ok: this.sessions.size < cap, seat: null };
    const t = typeof now === 'number' ? now : Date.now();
    const held = this._seatHeldIds(t);
    const raw = url && url.searchParams ? url.searchParams.get('seat') : null;
    const seat = typeof raw === 'string' && raw.length > 0 && raw.length <= 64 && held.has(raw) ? raw : null;
    if (seat) {
      let claimed = false;
      for (const [, s] of this.sessions) if (s && s.seat === seat) { claimed = true; break; }
      if (!claimed) return { ok: this.sessions.size < cap + held.size, seat };
    }
    return { ok: this.sessions.size + held.size < cap, seat: null };
  },

  /** join.js, before the account is read: true when this join was refused
   *  (no seat held for it, and the free seats are gone). */
  _seatJoinRefused(ws, msg) {
    if (!seatHoldOn(this)) return false;
    const now = Date.now();
    const held = this._seatHeldIds(now);
    const id = msg && typeof msg.id === 'string' ? msg.id : '';
    const sess = ws ? this.sessions.get(ws) : null;
    const cap = this._roomCap();
    /* v2.3.5612: a socket let in on a seat joins as that seat's id, or is
       refused (the hold is not used up); one let in as a stranger counts
       every other socket in the room, joins in flight too, and the held
       seats.  A held id on a stranger's socket (a phone from before) is
       let through, as before. */
    let refuse;
    if (sess && sess.seat) refuse = !(id === sess.seat && held.has(id));
    else if (id && held.has(id)) refuse = false;
    else refuse = (this.sessions.size - (sess ? 1 : 0)) + held.size >= cap;
    if (!refuse) return false;
    rfNote(this, now, sess && sess.ip);   /* a knock like any refusal (rfspread.js): an address once a second (v2.3.5604 mend) */
    try {
      /* v2.3.5612: the count is the seats taken, inside and held (it said the sockets: "1 / 3 inside" at a room of holds) */
      this._send(ws, { type: 'room_full', reason: 'full', count: Math.min(cap, this._seatJoinedIds().size + held.size), cap, retryMs: rfRetryMs(this, now) });
    } catch (e) { /* the close says it alone */ }
    try { ws.close(SEAT_HOLD.CLOSE_CODE, 'room full'); } catch (e) { /* gone */ }
    this._playerLeaves(ws, 'refused');   /* the session door (leave.js) */
    return true;
  },
};
