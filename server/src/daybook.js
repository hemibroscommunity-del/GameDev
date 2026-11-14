/* ═══ v2.3.5080: THE DAY'S BOOK -- one record a UTC day, in parts ═══
 *
 * Step 10.4 of docs/GRAND-PLAN.md (card E, PR 1; the shape: docs/SHAPES.md
 * part 7, "The day's book").  The owner's numbers of a day, kept by the room
 * itself: what the economy minted and burned by road class (`econ`, card E),
 * the room's own row (`room`: the tick, rows written, saves refused...), the
 * phones' smoothness by cell (`dev`) and the Speed test's cards (`speed`)
 * (those three card A's: steps 1.6, 1.1, 1.2).
 *
 * ONE DOOR.  A part's writer calls
 *
 *     bookAdd(room, part, nums, now)
 *
 * with numbers to ADD: `nums` is a small tree of plain objects whose leaves
 * are finite numbers, or arrays of them (a histogram's bins, added place by
 * place).  The door keeps the day's sums in memory and puts the record AT MOST
 * ONCE A PACE (DAYBOOK.PACE_MS) while the room is awake: the first add after a
 * worker starts writes at once, every later one waits for the pace.  The
 * caller never awaits anything: an add is a few additions in memory, and the
 * put it may start runs on its own (it returns the put's promise for a test).
 * Only ever ADDS: a percentile is not a sum, so a part that wants one keeps
 * fixed bins (SHAPES part 4, "Why the bins are fixed"), and the reader takes
 * the percentile from them.
 *
 * WHAT IS KEPT (registered in ARCHITECTURE-HANDOFF rule 2):
 *   daybook:<yyyymmdd>   {v, day, at, econ, room, dev, speed, over?}
 *     a UTC day; each part a tree of sums as its writer added them; `over`
 *     what was refused because a part was full (a count a part).  Kept
 *     KEEP_DAYS days (60, as `accday:` is), the oldest pruned a page at a
 *     time (handoff rule 9: never one list of a prefix that grows).
 *
 * THE WRITE: read, add, put -- the sums taken out of memory first, put back
 * if the write fails (the next pace tries again), so nothing counted is lost
 * to a failed put and nothing is counted twice.  A day whose stored `v` is
 * NEWER than this worker's is left whole and its sums dropped (a rolled-back
 * worker must never rewrite what a newer one wrote: docs/specs/migrations.md).
 * A restart loses at most what was added since the last put (v2.3.5085: and
 * an empty room's worker, put to sleep, nothing: roomrow.js's last one out
 * writes): the
 * book is the owner's summary of a day, never what a sum is checked against
 * (the world's sum reads the characters' own records: step 4.4, SHAPES 7).
 *
 * WHAT IT COSTS: one row (a put) a pace while anything is added, none while
 * nothing is (cost-guard.test §15 holds the line); one read with each put; a
 * delete of the days past KEEP_DAYS once a worker's life a day.  In memory:
 * at most PART_BYTES a part a day being counted, a key at most
 * KEY_MAX characters, DEPTH_MAX deep -- a writer's tree past any of them is
 * refused at the door, counted in `over`, never stored.  A part is written by
 * its own writer only (SHAPES), so the door does not ask who calls.
 *
 * Keys are the writer's (card A's cells are a device class, a lane, a
 * switch state and a build): every map here is made with Object.create(null),
 * and `__proto__`, `constructor` and `prototype` are refused outright.
 *
 * v2.3.5085: the `econ` part is the two doors' (gold.js, bag.js): minted and
 * burned, gold and each bag key, for the whole room, added as each road runs.
 * The LAST ONE OUT writes what waits: card A's one writer for it (roomrow.js
 * _roomRowLastOut, v2.3.5124: after a join, a hand of turns at the book's
 * pace), so an empty room that goes to sleep loses nothing.
 *
 * THE KILL SWITCH `daybook: false` in the live flags (liveops.js
 * `_daybookOff`): nothing is added, written or pruned; what is stored stays;
 * the reader says the book is off.
 *
 * THE READ: bookRead(room, n) -- the newest `n` days, stored plus what is
 * counted and not yet written.  The owner's card (card E, PR 12) and card A's
 * one admin route read the book through it.
 *
 * Suite: server/test/daybook.test.mjs.  The spec is this header (the
 * registry row names it). */

export const DAYBOOK = Object.freeze({
  V: 1,
  PREFIX: 'daybook:',
  /* the parts, a closed list: a part not here is refused */
  PARTS: Object.freeze(['econ', 'room', 'dev', 'speed']),
  /* v2.3.5080: one put every five minutes at most -- 12 rows an hour the room
     is awake and counting, 288 on a day it never sleeps (the free plan's day
     is 100,000), and at most five minutes of counts lost to a restart */
  PACE_MS: 5 * 60 * 1000,
  KEEP_DAYS: 60,
  PRUNE_PAGE: 32,
  /* v2.3.5080: a part's tree is held to PART_BYTES as JSON (an upper bound
     the door reckons as it adds: a number its key and 28 bytes, an array's
     place 25), so a day with all four parts full stays under ~100 KB, inside
     a stored value's 128 KiB.  How deep, how long a key, how long an array: */
  PART_BYTES: 24 * 1024,
  DEPTH_MAX: 4,
  KEY_MAX: 96,
  ARR_MAX: 64,
  NUM_MAX: 1e15,
});

const KEY_RE = /^[A-Za-z0-9_.:|,+=-]+$/;
const BAD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
const clampNum = (n) => Math.max(-DAYBOOK.NUM_MAX, Math.min(DAYBOOK.NUM_MAX, n));

export const bookKey = (day) => DAYBOOK.PREFIX + day;

/** The UTC day of `ts`, 'yyyymmdd'. */
export function bookDay(ts) {
  const d = new Date(Number(ts) || 0);
  const p = (n) => String(n).padStart(2, '0');
  return d.getUTCFullYear() + p(d.getUTCMonth() + 1) + p(d.getUTCDate());
}

/* The day `days` before `day` ('yyyymmdd'), for the prune's line. */
function dayBefore(day, days) {
  const t = Date.UTC(+day.slice(0, 4), +day.slice(4, 6) - 1, +day.slice(6, 8)) - days * 86400000;
  return bookDay(t);
}

const keyOk = (k) => typeof k === 'string' && k.length > 0 && k.length <= DAYBOOK.KEY_MAX && KEY_RE.test(k) && !BAD_KEYS.has(k);
const numOk = (v) => typeof v === 'number' && Number.isFinite(v);
/* v2.3.5085 (the gatekeeper's find): every PLACE checked -- `every` skips the
   holes of an array with gaps, and a hole read as a number is NaN */
const arrOk = (a) => {
  if (!Array.isArray(a) || a.length === 0 || a.length > DAYBOOK.ARR_MAX) return false;
  for (let i = 0; i < a.length; i++) if (!numOk(a[i])) return false;
  return true;
};
/* v2.3.5085 (the gatekeeper's find, sitting 2): THE PACE RUNS ON THE ROOM'S
   OWN CLOCK.  A caller's `now` names the day its count is filed under (card
   A's suite files a second day that way); it never sets the pace's mark: a
   far one there would have stopped every put until it came round. */
const roomNow = () => Date.now();
const callerNow = (now) => (numOk(now) ? now : roomNow());

/* What a number, an array or a tree under key `k` may take as JSON, at most
   (a number of NUM_MAX or a long fraction is ~22 characters; the quotes, the
   colon and the comma are the rest). */
const NUM_B = 28, PLACE_B = 25, NODE_B = 6;
function bytesOf(k, v) {
  if (numOk(v)) return k.length + NUM_B;
  if (Array.isArray(v)) return k.length + NODE_B + PLACE_B * v.length;
  if (!isObj(v)) return 0;
  let n = k.length + NODE_B;
  for (const kk of Object.keys(v)) n += bytesOf(kk, v[kk]);
  return n;
}
/** A part's size as the door reckons it (an upper bound of its JSON). */
export function bookBytes(t) {
  let n = 0;
  if (isObj(t)) for (const k of Object.keys(t)) n += bytesOf(k, t[k]);
  return n;
}

/** A writer's tree checked whole: true only if every key, leaf, depth and
 *  array is one the door takes.  A tree with one bad branch is refused
 *  whole -- a writer's bug shows as `over`, never as half a count. */
function treeOk(t, depth) {
  if (!isObj(t) || depth > DAYBOOK.DEPTH_MAX) return false;
  const ks = Object.keys(t);
  if (!ks.length) return false;
  for (const k of ks) {
    if (!keyOk(k)) return false;
    const v = t[k];
    if (numOk(v) || arrOk(v)) continue;
    if (!treeOk(v, depth + 1)) return false;
  }
  return true;
}

/** Add tree `src` into tree `dst` (null-prototype, changed in place) NUMBER
 *  BY NUMBER: one whose place in `dst` is of another kind (a number where
 *  `dst` has a tree), that would make an array longer than ARR_MAX, or that
 *  would take `dst` past `budget` more bytes, is left out and counted.
 *  `dry`: nothing changes, only the count.  Returns {grew, refused}.
 *  The door (bookAdd) runs it dry first and takes a tree only when nothing
 *  would be refused: a writer's tree is whole or nothing.  The write runs it
 *  for real against the STORED day (whose shape memory does not know), so
 *  one writer's bad number never costs the other sums of its pace. */
function mergeInto(dst, src, budget, dry) {
  let grew = 0, refused = 0;
  for (const k of Object.keys(src)) {
    const v = src[k];
    const has = Object.prototype.hasOwnProperty.call(dst, k);
    const d = has ? dst[k] : undefined;
    if (numOk(v)) {
      const add = has ? 0 : k.length + NUM_B;
      if ((has && !numOk(d)) || grew + add > budget) { refused++; continue; }
      grew += add;
      if (!dry) dst[k] = clampNum((has ? d : 0) + v);
    } else if (Array.isArray(v)) {
      const len = has && Array.isArray(d) ? d.length : 0;
      const add = (has ? 0 : k.length + NODE_B) + PLACE_B * Math.max(0, v.length - len);
      if ((has && !Array.isArray(d)) || Math.max(len, v.length) > DAYBOOK.ARR_MAX || grew + add > budget) { refused += v.length; continue; }
      grew += add;
      if (!dry) {
        const out = has ? d : [];
        for (let i = 0; i < v.length; i++) out[i] = clampNum((out[i] || 0) + v[i]);
        dst[k] = out;
      }
    } else if (isObj(v)) {
      if (has && !isObj(d)) { refused += Math.max(1, countNums(v)); continue; }
      const add = has ? 0 : k.length + NODE_B;
      const sub = has ? d : Object.create(null);
      const r = mergeInto(sub, v, budget - grew - add, dry);
      refused += r.refused;
      if (r.grew > 0 || has) grew += add + r.grew;
      if (!dry && !has && Object.keys(sub).length) dst[k] = sub;
    }
  }
  return { grew, refused };
}

/* How many numbers a tree holds (an array counts each place). */
function countNums(t) {
  if (numOk(t)) return 1;
  if (Array.isArray(t)) return t.length;
  if (!isObj(t)) return 0;
  let n = 0;
  for (const k of Object.keys(t)) n += countNums(t[k]);
  return n;
}

/* Merge one day's taken sums (`src`: {parts, over}) into `parts` (an object
   holding the four parts: a record, or memory's `parts`) and its `over`,
   each part held to PART_BYTES. */
function mergeDay(parts, over, src) {
  for (const p of DAYBOOK.PARTS) {
    const from = src.parts[p];
    if (!Object.keys(from).length) continue;
    const r = mergeInto(parts[p], from, DAYBOOK.PART_BYTES - bookBytes(parts[p]), false);
    if (r.refused) over[p] = (over[p] || 0) + r.refused;
  }
  for (const p of Object.keys(src.over)) over[p] = (over[p] || 0) + src.over[p];
}

/** A stored or written tree read back into null-prototype maps, keeping only
 *  what the door would take (a hand-edited record is never trusted). */
function cleanTree(t, depth) {
  const out = Object.create(null);
  if (!isObj(t) || depth > DAYBOOK.DEPTH_MAX) return out;
  for (const k of Object.keys(t)) {
    if (!keyOk(k)) continue;
    const v = t[k];
    if (numOk(v)) out[k] = clampNum(v);
    else if (arrOk(v)) out[k] = v.map(clampNum);
    else if (isObj(v)) { const s = cleanTree(v, depth + 1); if (Object.keys(s).length) out[k] = s; }
  }
  return out;
}

/** A blank day. */
export function bookBlank(day) {
  const out = { v: DAYBOOK.V, day: String(day || ''), at: 0 };
  for (const p of DAYBOOK.PARTS) out[p] = Object.create(null);
  out.over = Object.create(null);
  return out;
}

/** A stored day made safe to read.  A newer `v` comes back as `{newer: true}`
 *  beside a blank (never added into, never written over). */
export function bookNormalize(raw, day) {
  const out = bookBlank(day);
  if (!isObj(raw)) return out;
  if (numOk(raw.v) && raw.v > DAYBOOK.V) { out.newer = true; return out; }
  if (numOk(raw.at)) out.at = Math.max(0, Math.floor(raw.at));
  for (const p of DAYBOOK.PARTS) out[p] = cleanTree(raw[p], 1);
  if (isObj(raw.over)) for (const p of DAYBOOK.PARTS) if (numOk(raw.over[p]) && raw.over[p] > 0) out.over[p] = Math.floor(raw.over[p]);
  return out;
}

/** The book's memory on the room: the sums of each day not yet written. */
function mem(room) {
  if (!room._daybook) room._daybook = { days: new Map(), lastPut: 0, putting: null, prunedDay: null, pruneAfter: null };
  return room._daybook;
}

function dayMem(b, day) {
  let d = b.days.get(day);
  if (!d) {
    d = { parts: Object.create(null), over: Object.create(null) };
    for (const p of DAYBOOK.PARTS) d.parts[p] = Object.create(null);
    b.days.set(day, d);
  }
  return d;
}

const off = (room) => !!(room && typeof room._daybookOff === 'function' && room._daybookOff());

/** THE DOOR.  Adds `nums` into today's `part`.  Returns true when added (a
 *  put may have started: its promise is on `room._daybook.putting`), false
 *  when refused (switched off, an unknown part, a tree the door does not
 *  take, a full part).  Never throws, never awaits. */
export function bookAdd(room, part, nums, now) {
  try {
    if (!room || off(room)) return false;
    if (DAYBOOK.PARTS.indexOf(part) < 0) return false;
    now = callerNow(now);
    const b = mem(room);
    const d = dayMem(b, bookDay(now));
    const over = () => { d.over[part] = (d.over[part] || 0) + 1; };
    if (!treeOk(nums, 1)) { over(); return false; }
    const tgt = d.parts[part];
    /* the memory's own line: what waits to be written is a part's at most */
    const budget = DAYBOOK.PART_BYTES - bookBytes(tgt);
    if (mergeInto(tgt, nums, budget, true).refused) { over(); return false; }
    mergeInto(tgt, nums, budget, false);
    bookMaybePut(room, now);
    return true;
  } catch (e) { return false; }   /* a count must never stop what it counts */
}

/** The pace: starts a put when one is due and none is running.  Returns its
 *  promise, or null. */
export function bookMaybePut(room, now) {
  const b = mem(room);
  if (b.putting) return null;
  const t = roomNow();   /* v2.3.5085: the pace on the room's own clock, never a caller's */
  if (b.lastPut && t - b.lastPut < DAYBOOK.PACE_MS) return null;
  b.lastPut = t;   /* the attempt is the pace's mark: a storage that refuses is asked again a pace later, not at every add */
  now = callerNow(now);
  b.putting = putDays(room, now).finally(() => { b.putting = null; });
  return b.putting;
}

/* A day's taken sums back into memory (a put that failed). */
function giveBack(b, day, taken) {
  const d = dayMem(b, day);
  mergeDay(d.parts, d.over, taken);
}

/** Write every day with sums waiting, NOW, whatever the pace: read, add, put.
 *  v2.3.5085: it waits for a put already running first -- two read-add-puts of
 *  one day at once would each read the day before the other wrote it, and the
 *  later put would lose the earlier one's sums. */
export async function bookPut(room, now) {
  if (!room || off(room)) return;
  const b = mem(room);
  while (b.putting) await b.putting.catch(() => {});
  b.putting = putDays(room, now).finally(() => { b.putting = null; });
  return b.putting;
}

/* The write itself: every day with sums waiting, oldest first; then one page
   of the prune.  Only ever run as `b.putting` (one at a time). */
async function putDays(room, now) {
  if (off(room)) return;   /* v2.3.5085: switched off, nothing written or pruned */
  const b = mem(room);
  now = callerNow(now);
  const days = [...b.days.keys()].sort();
  for (const day of days) {
    const taken = b.days.get(day);
    b.days.delete(day);
    const empty = DAYBOOK.PARTS.every((p) => !Object.keys(taken.parts[p]).length) && !Object.keys(taken.over).length;
    if (empty) continue;
    try {
      const rec = bookNormalize(await room.state.storage.get(bookKey(day)), day);
      if (rec.newer) continue;   /* a newer worker's day: left whole, these sums dropped */
      mergeDay(rec, rec.over, taken);   /* a number the stored day cannot take (a full part, a place of another kind) is counted in `over` */
      rec.at = now;
      const out = { v: DAYBOOK.V, day, at: rec.at, over: { ...rec.over } };
      for (const p of DAYBOOK.PARTS) out[p] = rec[p];
      await room.state.storage.put(bookKey(day), out);
    } catch (e) {
      giveBack(b, day, taken);   /* not lost: the next pace writes it */
    }
  }
  await bookPrunePage(room, now);
}

/** One page of the prune: the days before the last KEEP_DAYS go, the oldest
 *  first, PRUNE_PAGE keys a call.  Starts once a worker's life a UTC day and
 *  runs a page each put until a page finds nothing to drop. */
export async function bookPrunePage(room, now) {
  const b = mem(room);
  const today = bookDay(roomNow());   /* v2.3.5085: the room's own day */
  if (b.prunedDay === today) return false;
  const line = bookKey(dayBefore(today, DAYBOOK.KEEP_DAYS - 1));   /* the oldest day kept */
  try {
    const opts = { prefix: DAYBOOK.PREFIX, limit: DAYBOOK.PRUNE_PAGE };
    if (b.pruneAfter) opts.startAfter = b.pruneAfter;
    const page = await room.state.storage.list(opts);
    const drop = [];
    let last = null;
    for (const k of page.keys()) { last = k; if (k < line) drop.push(k); }
    if (drop.length) await room.state.storage.delete(drop);
    if (page.size < DAYBOOK.PRUNE_PAGE || !last || drop.length < page.size) {
      b.prunedDay = today; b.pruneAfter = null;   /* reached the kept days, or the end: done for today */
      return false;
    }
    b.pruneAfter = last;
    return true;
  } catch (e) {
    b.prunedDay = today; b.pruneAfter = null;    /* tomorrow, or the next worker */
    return false;
  }
}

/** THE READ: the newest `n` days (1 to KEEP_DAYS, 7 when not said), each the
 *  stored record plus the sums counted and not yet written.  Newest first. */
export async function bookRead(room, n) {
  const want = Math.max(1, Math.min(DAYBOOK.KEEP_DAYS, Math.floor(Number(n)) || 7));
  const rows = new Map();
  try {
    const page = await room.state.storage.list({ prefix: DAYBOOK.PREFIX, reverse: true, limit: want });
    for (const [k, v] of page) rows.set(k.slice(DAYBOOK.PREFIX.length), bookNormalize(v, k.slice(DAYBOOK.PREFIX.length)));
  } catch (e) { return { ok: false, error: 'could not read the book' }; }
  const b = room._daybook;
  if (b) {
    for (const [day, d] of b.days) {
      const r = rows.get(day) || bookBlank(day);
      if (r.newer) continue;
      mergeDay(r, r.over, d);   /* reads `d`, never changes it: the read leaves what waits as it is */
      rows.set(day, r);
    }
  }
  const days = [...rows.values()].sort((a, c) => (a.day < c.day ? 1 : -1)).slice(0, want);
  return { ok: true, on: !off(room), days };
}
