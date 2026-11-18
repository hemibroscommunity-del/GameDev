/* ═══ v2.3.6001: THE USAGE METER (card CS PR 2) ═══
 *
 * The owner, 2026-11-17, turning the six cost switches on (card CS PR 1):
 * "I think turn all of them on then we monitor usage cost".  This is the
 * monitor: the room counts, IN MEMORY ONLY, what Cloudflare bills it for --
 * the rows it writes, the rows it reads and the messages it sends -- since
 * the room started and today (UTC), by kind, and the Test panel reads them
 * (GET /dev/usage, devtools.js; src/ui/panels/UsageMeter.jsx shows them in
 * plain words, with an estimate against the plan's included rows).
 *
 * WHAT IT COUNTS, where they all pass:
 *   writes   every row the room's storage writes: a put of a key 1, of an
 *            object of entries each entry; a delete each key (Cloudflare
 *            bills a delete as a write).  By kind: the key's prefix up to
 *            and with its first ':' (`rpg:`, `oplog:`), or the whole key when
 *            it has none (`seats`, `liveflags`);
 *   reads    every row it reads: a get of a key 1, of a list each key; a
 *            list() each row it returns (at least 1).  By kind as above (a
 *            list by its prefix);
 *   sends    every frame the send door writes (send.js `_send`), by its type.
 *   sw       the six cost switches' own rows named apart (PR 1): the rows
 *            written to `oplog:rq:` (reqstamp), `econ_gone` (resetbook),
 *            `xfer:` (xferescrow) and `seats` (seathold) as they pass, and
 *            the reads fullsnap (playerrestore.js snapshotCopy) and
 *            freezedevice (silence.js _frozenDeviceIs) make, told by them.
 * The storage is wrapped once, at the room's start (roomrow.js
 * _roomRowStart calls _usageStart), beside the room row's own wrapper.  A
 * transaction's own writes (storage.transaction) are not seen, as the room
 * row's are not: the game's writes go through put and delete.
 *
 * NOTHING IS WRITTEN for the meter (the card: "NO storage write for the
 * meter itself").  A deploy or a room put away starts it again from 0, and
 * the panel says since when it counts.  Cloudflare's dashboard is the truth
 * (Workers & Pages, brotown-server, Metrics; and Billing): docs/OPERATIONS.md,
 * "Watching the cost".
 *
 * THE HOT PATH (the planning session's reading, 2026-11-18): a count is a
 * counter bump.  Each kind is a Map entry made the first time it is seen
 * (bounded: KINDS_MAX a list, then `other`), so a send allocates nothing;
 * a row's kind is a slice of its key (a storage call is not a hot path).
 *
 * THE DAY turns at 00:00 UTC: the first count after it starts today's
 * bucket empty.  The room's own bucket runs on.
 *
 * KILL SWITCH `usagemeter: false` in the live flags: nothing is counted
 * (the storage stays wrapped; each count returns at once), and the read
 * says it is off.
 */

export const USAGE = Object.freeze({
  FLAG: 'usagemeter',
  KINDS_MAX: 64,          /* kinds kept apart in one list; the rest is `other` */
  OTHER: 'other',
  DAY_MS: 86400000,
  /* the six switches' rows, by the key they write (PR 1's table) */
  SWITCH_KEYS: Object.freeze([
    Object.freeze(['oplog:rq:', 'reqstamp', 'prefix']),
    Object.freeze(['econ_gone', 'resetbook', 'exact']),
    Object.freeze(['xfer:', 'xferescrow', 'prefix']),
    Object.freeze(['seats', 'seathold', 'exact']),
  ]),
  SWITCHES: Object.freeze(['reqstamp', 'fullsnap', 'xferescrow', 'resetbook', 'seathold', 'freezedevice']),
});

/** A key's kind: its prefix up to and with its first ':', or the key. */
export function usageKind(key) {
  if (typeof key !== 'string') return USAGE.OTHER;
  const i = key.indexOf(':');
  return i < 0 ? key : key.slice(0, i + 1);
}

/** Which of the six switches a row written to `key` belongs to, or null. */
export function usageSwitchOf(key) {
  if (typeof key !== 'string') return null;
  for (const [k, name, how] of USAGE.SWITCH_KEYS) {
    if (how === 'exact' ? key === k : key.startsWith(k)) return name;
  }
  return null;
}

/** The start of the UTC day after `now`. */
const dayEnd = (now) => (Math.floor(now / USAGE.DAY_MS) + 1) * USAGE.DAY_MS;

function bucket(now) {
  const sw = new Map();
  for (const n of USAGE.SWITCHES) sw.set(n, [0, 0]);
  return { since: now, writes: new Map(), reads: new Map(), sends: new Map(), sw, tot: [0, 0, 0] };
}

/* one count into one list: the entry made once, then bumped */
function bump(map, kind, n) {
  let e = map.get(kind);
  if (!e) {
    if (map.size >= USAGE.KINDS_MAX - 1) { kind = USAGE.OTHER; e = map.get(kind); }   /* `other` the last of KINDS_MAX */
    if (!e) { e = [0]; map.set(kind, e); }
  }
  e[0] += n;
}

const LISTS = ['writes', 'reads', 'sends'];
function countInto(b, i, kind, n, sw) {
  b.tot[i] += n;
  bump(b[LISTS[i]], kind, n);
  if (sw) { const e = b.sw.get(sw); if (e) e[i] += n; }
}

const listOut = (map) => {
  const o = Object.create(null);
  for (const [k, e] of map) o[k] = e[0];
  return o;
};
const bucketOut = (b) => {
  const sw = Object.create(null);
  for (const [k, e] of b.sw) sw[k] = { writes: e[0], reads: e[1] };
  return { since: b.since, writes: b.tot[0], reads: b.tot[1], sends: b.tot[2],
    byKind: { writes: listOut(b.writes), reads: listOut(b.reads), sends: listOut(b.sends) }, switches: sw };
};

export const usageMethods = {
  _usageOff() {
    const f = this._liveFlags;
    return !!(f && typeof f === 'object' && Object.prototype.hasOwnProperty.call(f, USAGE.FLAG) && f[USAGE.FLAG] === false);
  },

  _usageMem(now) {
    const t = typeof now === 'number' ? now : Date.now();
    let m = this._usage;
    if (!m) m = this._usage = { start: bucket(t), today: bucket(t), todayEnd: dayEnd(t) };
    if (t >= m.todayEnd) { m.today = bucket(t); m.todayEnd = dayEnd(t); }
    return m;
  },

  /** The room's start (roomrow.js _roomRowStart): the meter begun and the
   *  storage wrapped.  Once a room. */
  _usageStart(now) {
    this._usageMem(now);
    const st = this.state && this.state.storage;
    if (!st || st.__btUsageCounted) return;
    const room = this;
    try {
      const get = st.get, list = st.list, put = st.put, del = st.delete;
      if (typeof get === 'function') {
        st.get = function (keys, ...rest) {
          try { room._usageRows(1, keys); } catch (e) { /* a count never stops a read */ }
          return get.call(st, keys, ...rest);
        };
      }
      if (typeof list === 'function') {
        st.list = function (opts, ...rest) {
          const p = list.call(st, opts, ...rest);
          try {
            const kind = opts && typeof opts.prefix === 'string' ? usageKind(opts.prefix) : 'list';
            if (p && typeof p.then === 'function') p.then((r) => { try { room._usageCount(1, kind, Math.max(1, (r && r.size) || 0), null); } catch (e) { /* as above */ } }, () => {});
          } catch (e) { /* as above */ }
          return p;
        };
      }
      if (typeof put === 'function') {
        st.put = function (keyOrEntries, ...rest) {
          try { room._usageRows(0, typeof keyOrEntries === 'string' || Array.isArray(keyOrEntries) ? keyOrEntries : (keyOrEntries && typeof keyOrEntries === 'object' ? Object.keys(keyOrEntries) : null)); } catch (e) { /* a count never stops a write */ }
          return put.call(st, keyOrEntries, ...rest);
        };
      }
      if (typeof del === 'function') {
        st.delete = function (keys, ...rest) {
          try { room._usageRows(0, keys); } catch (e) { /* as above */ }
          return del.call(st, keys, ...rest);
        };
      }
      st.__btUsageCounted = true;
    } catch (e) { /* a storage that will not be wrapped is not counted */ }
  },

  /* a key or a list of keys: each a row of its kind; a written one also its switch's */
  _usageRows(i, keys) {
    if (typeof keys === 'string') { this._usageCount(i, usageKind(keys), 1, i === 0 ? usageSwitchOf(keys) : null); return; }
    if (Array.isArray(keys)) for (const k of keys) this._usageCount(i, usageKind(k), 1, i === 0 ? usageSwitchOf(k) : null);
  },

  /** `i` 0 writes, 1 reads, 2 sends; n rows (or frames) of `kind`, and of
   *  switch `sw` (or null). */
  _usageCount(i, kind, n, sw) {
    if (this._usageOff()) return;
    const m = this._usageMem();
    countInto(m.start, i, kind, n, sw);
    countInto(m.today, i, kind, n, sw);
  },

  /** The send door's count (send.js `_send`): one frame of its type. */
  _usageSent(type) {
    if (this._usageOff()) return;
    const m = this._usageMem();
    const k = typeof type === 'string' ? type : USAGE.OTHER;
    m.start.tot[2]++; bump(m.start.sends, k, 1);
    m.today.tot[2]++; bump(m.today.sends, k, 1);
  },

  /** A switch tells the reads it made (fullsnap, freezedevice): already
   *  counted by kind as they passed the storage; here named apart. */
  _usageSwitch(name, writes, reads) {
    if (this._usageOff()) return;
    const m = this._usageMem();
    for (const e of [m.start.sw.get(name), m.today.sw.get(name)]) {
      if (e) { e[0] += writes || 0; e[1] += reads || 0; }
    }
  },

  /** GET /dev/usage (devtools.js): the two buckets, as counted. */
  _usageRead(now) {
    const t = typeof now === 'number' ? now : Date.now();
    const m = this._usageMem(t);
    return { ok: true, on: !this._usageOff(), now: t, dayEnds: m.todayEnd,
      sinceStart: bucketOut(m.start), today: bucketOut(m.today) };
  },
};
