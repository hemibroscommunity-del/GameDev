/* ═══ v2.3.5124: THE ROOM'S OWN ROW (the grand plan's step 1.6) ═══
 *
 * The phones report how smoothly they ran (report.js); this is the room
 * reporting on itself, into the day's book's `room` part (daybook.js, card
 * E's door; the shape: docs/SHAPES.md part 7).  Before this, none of it was
 * counted: the room never counted its own puts, a save the storage refused
 * was swallowed, a character a newer worker saved was only logged, and
 * nothing marked a restart.  As report.js, the header is the spec (card A's
 * PR 5).
 *
 * WHAT IT COUNTS, each where it happens:
 *   gap       the time between two ticks' starts, in GAP_EDGES' bins (the
 *             reader takes the 95th from them: the book only adds).  A
 *             tick's own length cannot be read inside a worker -- its clock
 *             stands still while code runs and moves only between events --
 *             so the gap is the measure: a busy room's ticks come further
 *             apart.  The same gap tickpace.js smooths; read, never steered,
 *             here (tick.js, at each tick);
 *   rows      [put, deleted]: every row the room writes, counted where they
 *             all go -- the room's storage, wrapped once at the room's start
 *             (roomRowWrap): a put of a key 1, of an object of entries each
 *             entry; a delete each key;
 *   refused   [put, newer]: a put the storage refused (it threw), and a
 *             character a newer worker saved, refused by the join on this
 *             rolled-back one (persistence.js _loadRpg, `newer`).  ONE
 *             counter: card E's step 4.5 (its PR 9) reads it
 *             (_savesRefused), never counts a second time;
 *   joins     [v1, v2]: joins taken, by the protocol their phone speaks
 *             (join.js, as its state_sync goes);
 *   restarts  1 for each worker start (the room's start, index.js);
 *   ticks     how many ticks the gaps came from.
 *
 * THE KILL SWITCH `roomrow: false` in the live flags (liveops.js
 * `_roomRowOff`): nothing of the room's is added into the book (the counts
 * are dropped; _savesRefused still answers, card E's read), and the last one
 * out writes nothing (v2.3.5124).
 *
 * Into the book: the counts kept in memory are added (bookAdd) at most
 * every FLUSH_MS, from the tick; the book writes its own row at most once a
 * pace (daybook.js), so this row costs no row of its own.  A deploy loses
 * at most FLUSH_MS of counts and the book's pace (the book is the owner's
 * summary, never what a sum is checked against).
 *
 * THE LAST ONE OUT (v2.3.5124, the gatekeeper's review, sitting 4): a room
 * left empty has no tick and no alarm, and is put away with whatever waits
 * in memory.  The room row's first add takes the book's "first add writes
 * at once" put, so every later add waits up to a pace (5 min): each
 * sitting lost its last report and the room's last counts, and a sitting
 * under the pace its FIRST report too, the one carrying `died`.  So the
 * last leave (leave.js, where the tick stops) adds the counts and writes
 * the book at once, after any put already running (_roomRowLastOut).  What
 * it cannot carry is its own put's count in `rows`, taken after the write.
 *
 * ...PACED, AND ONLY FOR WHAT IS NEW (v2.3.5124, sitting 5's review: the
 * first cut had no pace, and since the book's own put is counted in `rows`
 * something always waited -- every socket opened and closed into an empty
 * room, no join needed, rewrote the day's whole record: up to 28,800 a day
 * from one address, where the book writes at most 288; and a kick wrote it
 * twice, its own leave and the runtime's close after it):
 *   - only after a JOIN since the last such write (`owed`, set where a join
 *     is counted).  Every report and every coin the book keeps comes from a
 *     joined socket, and a joined socket never outlives an emptying, so a
 *     join is what makes anything new; a socket that never joins writes
 *     nothing, and the runtime's close after a kick finds nothing owed;
 *   - at the book's own pace on the whole: LASTOUT.HAND turns in hand (a
 *     sitting's reloads), one more each LASTOUT.EVERY_MS, and EVERY put of
 *     the book spends one as it lands, the door's own paced puts included
 *     (counted in the storage's wrapper).  So the book's puts, the last
 *     one out's and the door's together, keep near its pace however the
 *     joins and leaves come: an hour of them writes at most HAND + 12.  A
 *     long sitting's paced puts spend what each pace gives back, so its
 *     end still finds a turn.  A last one out with no turn keeps waiting
 *     (`owed` stays) for the next turn, the next pace, or the room's
 *     putting away (a room woken anew starts with HAND);
 *   - never with the room row switched off (`roomrow: false` stops all of
 *     this file's adds and writes), the book off (`daybook: false`), or
 *     nothing waiting.
 *   One read and one put a write.  cost-guard.test 15c holds the line,
 *   roomrow.test 10 the storms.
 *
 * The part's tree, under the shape's number (a new shape never adds into an
 * old one's numbers):  room: { '1': { gap: [11], rows: [2], refused: [2],
 * joins: [2], restarts, ticks } }.
 *
 * Suite: server/test/roomrow.test.mjs.
 */
import { bookAdd, bookPut, DAYBOOK } from './daybook.js';

export const ROOMROW = Object.freeze({
  V: 1,
  FLUSH_MS: 60 * 1000,
  /* v2.3.5124 (sitting 5): the last one out's writes -- HAND in hand, one
     more each EVERY_MS (the book's own pace, daybook.js PACE_MS) */
  LASTOUT: Object.freeze({ HAND: 3, EVERY_MS: 5 * 60 * 1000 }),
  /* ms between two ticks' starts, upper edges: a quiet room's ticks come
     about 23 apart (tickpace.js TARGET), a full thread's further */
  GAP_EDGES: Object.freeze([22, 24, 26, 28, 32, 40, 50, 75, 100, 200]),
  /* one gap past this is a room that was idle or asleep, not a slow tick */
  GAP_MAX_MS: 2000,
});

const binOf = (v) => { const e = ROOMROW.GAP_EDGES; let i = 0; while (i < e.length && v >= e[i]) i++; return i; };
const blank = () => ({
  gap: new Array(ROOMROW.GAP_EDGES.length + 1).fill(0),
  rows: [0, 0], refused: [0, 0], joins: [0, 0], restarts: 0, ticks: 0,
});

/** What a put or a delete writes, in rows: a key 1, a list or an object of
 *  entries each of its keys. */
export function rowsOf(keyOrEntries) {
  if (typeof keyOrEntries === 'string') return 1;
  if (Array.isArray(keyOrEntries)) return keyOrEntries.length;
  if (keyOrEntries && typeof keyOrEntries === 'object') return Object.keys(keyOrEntries).length;
  return 0;
}

/** The counts as the book's tree (only what is not zero). */
export function roomRowTree(c) {
  const t = Object.create(null);
  if (c.ticks) { t.gap = c.gap.slice(); t.ticks = c.ticks; }
  if (c.rows[0] || c.rows[1]) t.rows = c.rows.slice();
  if (c.refused[0] || c.refused[1]) t.refused = c.refused.slice();
  if (c.joins[0] || c.joins[1]) t.joins = c.joins.slice();
  if (c.restarts) t.restarts = c.restarts;
  if (!Object.keys(t).length) return null;
  const out = Object.create(null);
  out[String(ROOMROW.V)] = t;
  return out;
}

/* v2.3.5124: the book written now, after the put already running if one
   is (a second read-add-put of the same day beside it would lose the first's
   sums), asking again when its turn comes (sitting 5: two last-outs inside
   one put must not run side by side).  It reads the door's own memory
   (daybook.js `mem`: `days` waiting, `putting` the running put, `lastPut`
   the pace's mark): roomrow.test 9 fails when that shape moves.  Nothing
   waits, or the book is off: null.  A put's failure is the door's (it gives
   the sums back); nothing here throws. */
function bookNow(room, now) {
  const b = room && room._daybook;
  if (!b || !b.days || !b.days.size) return null;
  if (typeof room._daybookOff === 'function' && room._daybookOff()) return null;
  const run = () => {
    if (b.putting) return b.putting.then(run, run);
    if (!b.days.size) return null;
    b.lastPut = now;
    const p = bookPut(room, now).catch(() => {}).finally(() => { if (b.putting === p) b.putting = null; });
    b.putting = p;
    return p;
  };
  return run();
}

export const roomRowMethods = {
  _roomRowMem() {
    if (!this._roomRow) {
      this._roomRow = { c: blank(), flushedAt: 0, lastTick: 0, refused: { put: 0, newer: 0, lastAt: 0 },
        /* v2.3.5124 (sitting 5): the last one out's -- a join since its last
           write, and its writes in hand ([turns, when counted]) */
        owed: false, hand: [ROOMROW.LASTOUT.HAND, 0] };
    }
    return this._roomRow;
  },

  /** The room's start (index.js constructor): a restart, and the storage
   *  wrapped so every row it writes is counted.  Once a room. */
  _roomRowStart(now) {
    const m = this._roomRowMem();
    m.c.restarts++;
    m.flushedAt = typeof now === 'number' ? now : Date.now();
    this._roomRowWrap();
  },

  /* the room's storage: put and delete counted, a refused put counted, the
     caller handed the very promise the storage gave (its own catch, and the
     output gate, as before) */
  _roomRowWrap() {
    const st = this.state && this.state.storage;
    if (!st || st.__btRowsCounted) return;
    const room = this;
    try {
      const put = st.put, del = st.delete;
      if (typeof put === 'function') {
        st.put = function (keyOrEntries, ...rest) {
          const p = put.call(st, keyOrEntries, ...rest);
          try {
            room._roomRowMem().c.rows[0] += rowsOf(keyOrEntries);
            /* v2.3.5124 (sitting 5): every put of the book, the door's own
               included, spends a turn of the last one out's hand, so the two
               together keep the book's pace (THE LAST ONE OUT, PACED) */
            if (typeof keyOrEntries === 'string' && keyOrEntries.startsWith(DAYBOOK.PREFIX)) room._roomRowSpend(Date.now());
            if (p && typeof p.then === 'function') p.then(null, () => room._roomRowRefused('put'));
          } catch (e) { /* a count never stops a write */ }
          return p;
        };
      }
      if (typeof del === 'function') {
        st.delete = function (keys, ...rest) {
          const p = del.call(st, keys, ...rest);
          try { room._roomRowMem().c.rows[1] += rowsOf(keys); } catch (e) { /* as above */ }
          return p;
        };
      }
      st.__btRowsCounted = true;
    } catch (e) { /* a storage that will not be wrapped is not counted */ }
  },

  /** A save refused: 'put' (the storage threw) or 'newer' (a newer
   *  worker's character, refused by the join). */
  _roomRowRefused(why, now) {
    const m = this._roomRowMem();
    const i = why === 'newer' ? 1 : 0;
    m.c.refused[i]++;
    m.refused[why === 'newer' ? 'newer' : 'put']++;
    m.refused.lastAt = typeof now === 'number' ? now : Date.now();
  },

  /** Card E's step 4.5 (its PR 9) reads this, and counts nothing itself:
   *  saves refused since the worker started, by why, and the last one's time. */
  _savesRefused() {
    const r = this._roomRowMem().refused;
    return { put: r.put, newer: r.newer, lastAt: r.lastAt };
  },

  /** join.js, as a join's state_sync goes: one join, by its protocol. */
  _roomRowJoin(protocolVersion) {
    const m = this._roomRowMem();
    m.c.joins[protocolVersion === 2 ? 1 : 0]++;
    m.owed = true;   /* v2.3.5124: something new for the book at the last one out */
  },

  /** tick.js, at each tick's start: its gap from the last, and the counts
   *  into the book every FLUSH_MS. */
  _roomRowTick(now) {
    const m = this._roomRowMem();
    if (m.lastTick && now > m.lastTick) {
      const gap = now - m.lastTick;
      if (gap <= ROOMROW.GAP_MAX_MS) { m.c.gap[binOf(gap)]++; m.c.ticks++; }
    }
    m.lastTick = now;
    if (now - m.flushedAt >= ROOMROW.FLUSH_MS) this._roomRowFlush(now);
  },

  /** v2.3.5124 (sitting 5): the last one out's hand at `now`: [turns,
   *  when counted], a turn back each LASTOUT.EVERY_MS up to HAND. */
  _roomRowHand(now) {
    const L = ROOMROW.LASTOUT;
    const h = this._roomRowMem().hand;
    if (h[1]) h[0] = Math.min(L.HAND, h[0] + Math.max(0, now - h[1]) / L.EVERY_MS);
    h[1] = now;
    return h;
  },

  /** ...a put of the book (the storage's wrapper): one turn spent, whoever
   *  put it (owed, at most HAND below none: the door's own pace never
   *  waits for the hand, the last one out does). */
  _roomRowSpend(now) {
    const h = this._roomRowHand(typeof now === 'number' ? now : Date.now());
    h[0] = Math.max(-ROOMROW.LASTOUT.HAND, h[0] - 1);
  },

  /** v2.3.5124: the last one out (leave.js): the counts into the book, and
   *  the book written now, whatever the book's pace -- after a join since
   *  the last such write, and with a turn in hand (the header's "THE LAST
   *  ONE OUT" and "PACED").  The put it starts, or the door's that its
   *  own add started, spends the turn as it lands.  Returns the put's
   *  promise (a test awaits it), or null. */
  _roomRowLastOut(now) {
    now = typeof now === 'number' ? now : Date.now();
    const m = this._roomRowMem();
    if (!m.owed || this._roomRowOff()) return null;
    /* a put already running spends its turn as it lands: a turn beyond it */
    const running = !!(this._daybook && this._daybook.putting);
    if (this._roomRowHand(now)[0] < (running ? 2 : 1)) return null;   /* no turn: it stays owed */
    this._roomRowFlush(now);
    /* the flush's own add may have started the door's put (its first add,
       or a pace come round), taking all that waited: that put is the write */
    const p = bookNow(this, now) || (this._daybook && this._daybook.putting) || null;
    if (!p) return null;
    m.owed = false;
    return p;
  },

  /** The counts into the day's book's `room` part, and a fresh start
   *  (`roomrow: false`: dropped, nothing added). */
  _roomRowFlush(now) {
    const m = this._roomRowMem();
    m.flushedAt = now;
    const tree = roomRowTree(m.c);
    m.c = blank();
    if (tree && !this._roomRowOff()) bookAdd(this, 'room', tree, now);
  },
};
