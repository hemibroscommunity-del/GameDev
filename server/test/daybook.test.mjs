/* The day's book: one record a UTC day, in parts, through one door --
 * v2.3.5080 (server/src/daybook.js; step 10.4 of docs/GRAND-PLAN.md, card E
 * PR 1; the shape: docs/SHAPES.md part 7).
 *
 *   1. THE DOOR: numbers ADD (a tree of them, an array place by place); the
 *      first add of a worker writes at once, then at most one put a pace.
 *   2. REFUSED WHOLE: an unknown part, a leaf that is not a finite number, a
 *      key the door does not take (`__proto__` among them), too deep, an array
 *      too long, a place of another kind, a full part -- each counted in
 *      `over`, nothing of it added, never a throw.
 *   3. DAYS ARE UTC: either side of midnight, two records.
 *   4. A FAILED WRITE loses nothing and counts nothing twice.
 *   5. A RESTART adds into what is stored.
 *   6. A NEWER WORKER'S DAY is left whole.
 *   7. KEPT 60 DAYS, pruned a page at a time.
 *   8. THE KILL SWITCH `daybook: false`.
 *   9. THE READ: newest first, the unwritten sums with the stored.
 *  10. A HAND-EDITED RECORD is read safely; a full day fits a stored value.
 *  11. v2.3.5085 (the gatekeeper's finds): an array with GAPS is refused (a
 *      hole read as a number is NaN), and a `now` far from the room's clock
 *      never sets the pace's mark (a far one would stop the puts); it names
      only the day its count is filed under (card A's suite files a second
      day that way, roomrow §10.5).
 *  12. v2.3.5085: THE `econ` PART, filled by the two doors as each road runs
 *      (gold.js, bag.js): minted and burned for the whole room, gold and each
 *      bag key; a move or an escrow adds nothing; it matches what the
 *      characters' own `_econ` counted.  BREAK PROOF: `room` dropped from
 *      _goldGive's econGold call -> FAIL 12.
 *  13. v2.3.5085: THE LAST ONE OUT writes the econ part's sums that wait,
 *      inside the pace (card A's writer, roomrow.js _roomRowLastOut), so an
 *      empty room that sleeps loses none of them.
 */
import { GameRoom } from '../src/index.js';
import { DAYBOOK, bookAdd as bookAdd0, bookBytes, bookDay, bookKey, bookMaybePut as bookMaybePut0, bookNormalize, bookPut as bookPut0, bookRead } from '../src/daybook.js';

/* v2.3.5085: the room's clock is the test's, and it follows the time each
   call says (the pace runs on the room's own clock, the gatekeeper's find) */
let NOW = Date.UTC(2026, 10, 14, 12, 0, 0);
Date.now = () => NOW;
const at = (t) => { if (typeof t === 'number') NOW = t; return t; };
const bookAdd = (r, p, n, t) => bookAdd0(r, p, n, at(t));
const bookMaybePut = (r, t) => bookMaybePut0(r, at(t));
const bookPut = (r, t) => bookPut0(r, at(t));
import { flagNameOk } from '../src/liveops.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 600) : ''); }
}

/* storage as a Durable Object's: a copy of what is put, keys listed in
   order, `prefix`/`startAfter`/`limit`/`reverse` as the runtime takes them */
function makeState() {
  const store = new Map();
  const puts = [], dels = [];
  const clone = (v) => (v === undefined ? undefined : structuredClone(v));
  const st = {
    _store: store, _puts: puts, _dels: dels, failPut: false, failGet: false,
    storage: {
      async get(k) { if (st.failGet) throw new Error('get refused'); return clone(store.get(k)); },
      async put(k, v) { if (st.failPut) throw new Error('put refused'); puts.push(k); store.set(k, clone(v)); },
      async delete(k) { for (const x of (Array.isArray(k) ? k : [k])) { dels.push(x); store.delete(x); } },
      async list(o) {
        let keys = [...store.keys()].filter((k) => !o?.prefix || k.startsWith(o.prefix)).sort();
        if (o?.startAfter) keys = keys.filter((k) => k > o.startAfter);
        if (o?.reverse) keys.reverse();
        if (o?.limit) keys = keys.slice(0, o.limit);
        const out = new Map();
        for (const k of keys) out.set(k, clone(store.get(k)));
        return out;
      },
    },
    getWebSockets: () => [], acceptWebSocket: () => {},
  };
  return st;
}
const mockEnv = { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => new Response('{}') }) } };
function newRoom(state) {
  const room = new GameRoom(state || makeState(), mockEnv);
  room._liveFlags = {};
  return room;
}
const putsOf = (st, day) => st._puts.filter((k) => k === bookKey(day)).length;
const T0 = Date.UTC(2026, 10, 14, 12, 0, 0);   /* 2026-11-14 12:00 UTC */
const DAY0 = '20261114';

/* ── 1. the door ── */
{
  const st = makeState();
  const room = newRoom(st);
  check('1a. the UTC day is yyyymmdd', bookDay(T0) === DAY0 && bookDay(Date.UTC(2026, 0, 2, 23, 59)) === '20260102');
  check('1b. an add is taken', bookAdd(room, 'room', { tick: { n: 1, bins: [1, 0, 2] } }, T0) === true);
  await room._daybook.putting;
  check('1b. ...and the first add of a worker writes at once', putsOf(st, DAY0) === 1);
  let rec = st._store.get(bookKey(DAY0));
  check('1b. ...its shape: v, day, at, the four parts', rec && rec.v === DAYBOOK.V && rec.day === DAY0 && rec.at === T0 && DAYBOOK.PARTS.every((p) => rec[p] && typeof rec[p] === 'object'), rec);
  check('1b. ...the numbers as added', rec.room.tick.n === 1 && JSON.stringify(rec.room.tick.bins) === '[1,0,2]', rec.room);
  for (let i = 1; i <= 50; i++) bookAdd(room, 'room', { tick: { n: 1, bins: [0, 1] }, joins: { v2: 1 } }, T0 + i * 1000);
  bookAdd(room, 'dev', { 'g2.s0.4096|full|none|5080': { n: 1, gaps: [3, 4, 0, 0, 0, 0, 0, 0, 0, 1] } }, T0 + 51000);
  await room._daybook.putting;
  check('1c. fifty adds inside the pace write nothing more', putsOf(st, DAY0) === 1, st._puts);
  const p2 = bookMaybePut(room, T0 + DAYBOOK.PACE_MS - 1);
  check('1c. ...a put is not due a ms before the pace', p2 === null);
  bookAdd(room, 'room', { tick: { n: 1 } }, T0 + DAYBOOK.PACE_MS);
  await room._daybook.putting;
  check('1d. the first add a pace on writes once', putsOf(st, DAY0) === 2);
  rec = st._store.get(bookKey(DAY0));
  check('1d. ...with every sum: n 52, the bins place by place', rec.room.tick.n === 52 && JSON.stringify(rec.room.tick.bins) === '[1,50,2]' && rec.room.joins.v2 === 50, rec.room);
  check('1d. ...the parts kept apart', rec.dev['g2.s0.4096|full|none|5080'].n === 1 && rec.dev['g2.s0.4096|full|none|5080'].gaps[9] === 1 && Object.keys(rec.econ).length === 0 && Object.keys(rec.speed).length === 0, rec.dev);
  check('1e. nothing waits in memory after the put', room._daybook.days.size === 0);
  /* an hour of adds on every one of the room's ticks: at most one put a pace (and the first) */
  const st2 = makeState(); const r2 = newRoom(st2);
  for (let t = 0; t <= 3600000; t += 45) { bookAdd(r2, 'room', { tick: { n: 1 } }, T0 + t); if (r2._daybook.putting) await r2._daybook.putting; }
  const n2 = putsOf(st2, DAY0);
  check(`1f. an hour of adds every tick: ${n2} puts, at most ${Math.ceil(3600000 / DAYBOOK.PACE_MS) + 1}`, n2 <= Math.ceil(3600000 / DAYBOOK.PACE_MS) + 1 && n2 >= 12, n2);
  await bookPut(r2, T0 + 3600001);
  check('1f. ...and every tick counted, once', st2._store.get(bookKey(DAY0)).room.tick.n === 3600000 / 45 + 1, st2._store.get(bookKey(DAY0)).room.tick.n);
  check('1g. the pace is five minutes (the line cost-guard §15 holds)', DAYBOOK.PACE_MS === 300000);
}

/* ── 2. refused whole ── */
{
  const st = makeState();
  const room = newRoom(st);
  bookAdd(room, 'econ', { mint: { gold: 5 } }, T0);
  await room._daybook.putting;
  const bad = [
    ['an unknown part', 'bank', { a: 1 }],
    ['no tree', 'econ', 7],
    ['an empty tree', 'econ', {}],
    ['an array at the top', 'econ', [1, 2]],
    ['NaN', 'econ', { mint: { gold: NaN } }],
    ['Infinity', 'econ', { mint: { gold: Infinity } }],
    ['a string', 'econ', { mint: { gold: '5' } }],
    ['null', 'econ', { mint: null }],
    ['__proto__ (an own key, as JSON makes it)', 'econ', JSON.parse('{"__proto__": {"gold": 1}}')],
    ['constructor', 'econ', { constructor: 1 }],
    ['a key too long', 'econ', { ['k'.repeat(DAYBOOK.KEY_MAX + 1)]: 1 }],
    ['a key with a space', 'econ', { 'a b': 1 }],
    ['an empty key', 'econ', { '': 1 }],
    ['too deep', 'econ', { a: { b: { c: { d: { e: 1 } } } } }],
    ['an array too long', 'econ', { bins: new Array(DAYBOOK.ARR_MAX + 1).fill(1) }],
    ['an array with a string', 'econ', { bins: [1, '2'] }],
    ['one bad branch beside a good one', 'econ', { mint: { gold: 1 }, burn: { gold: NaN } }],
  ];
  for (const [what, part, nums] of bad) {
    let r, threw = false;
    try { r = bookAdd(room, part, nums, T0 + 1000); } catch (e) { threw = true; }
    check('2a. refused: ' + what, r === false && !threw);
  }
  check('2a. ...a call with no room is refused too', bookAdd(null, 'econ', { a: 1 }, T0) === false);
  /* a place of another kind, while both wait in memory: refused at the door */
  check('2a. refused: a number where a waiting tree is', bookAdd(room, 'econ', { burn: { gold: 1 } }, T0 + 1000) === true && bookAdd(room, 'econ', { burn: 3 }, T0 + 1001) === false);
  check('2a. refused: a tree where a waiting number is', bookAdd(room, 'econ', { q: 1 }, T0 + 1002) === true && bookAdd(room, 'econ', { q: { x: 1 } }, T0 + 1003) === false);
  await bookPut(room, T0 + 2000);
  const rec = st._store.get(bookKey(DAY0));
  check('2b. nothing of a refused tree was added (the good branch of a bad one neither)', rec.econ.mint.gold === 5 && rec.econ.burn.gold === 1 && rec.econ.q === 1 && !rec.econ.bins && Object.keys(rec.econ).length === 3, rec.econ);
  check('2b. ...each refusal counted in `over` under its part (the unknown part nowhere)', rec.over.econ === bad.length - 1 + 2 && Object.keys(rec.over).length === 1, rec.over);
  check('2b. ...and no stored key is __proto__', !Object.prototype.hasOwnProperty.call(rec.econ, '__proto__'));
  /* a place of another kind against the STORED day (memory holds only what
     waits): refused at the write, number by number -- the pace's other sums
     still land */
  bookAdd(room, 'econ', { mint: 3, burn: { gold: 2 }, more: [1, 2] }, T0 + 3000);
  await bookPut(room, T0 + 4000);
  const rec2 = st._store.get(bookKey(DAY0));
  check('2b2. a number where the stored day has a tree is left out at the write, counted', rec2.econ.mint.gold === 5 && rec2.over.econ === bad.length - 1 + 3, rec2);
  check('2b2. ...and the same pace\'s good sums still land', rec2.econ.burn.gold === 3 && JSON.stringify(rec2.econ.more) === '[1,2]', rec2.econ);
  /* a full part: filled at the door until it refuses (inside one pace, so
     memory holds it all), then written whole */
  const st3 = makeState(); const r3 = newRoom(st3);
  bookAdd(r3, 'econ', { x: 1 }, T0); await r3._daybook.putting;   /* the worker's first put, out of the way */
  let filled = 0;
  while (bookAdd(r3, 'dev', { ['n' + filled]: 1 }, T0 + 1)) filled++;
  check(`2c. a part takes numbers until it reaches PART_BYTES (${filled} numbers), then refuses`, filled > 100 && bookBytes(r3._daybook.days.get(DAY0).parts.dev) <= DAYBOOK.PART_BYTES, filled);
  check('2c. ...another part is not full', bookAdd(r3, 'speed', { all: [60, 16, 20, 9] }, T0 + 2) === true);
  await bookPut(r3, T0 + 3);
  const rec3 = st3._store.get(bookKey(DAY0));
  check('2c. ...written whole (memory and the stored part hold the same line)', Object.keys(rec3.dev).length === filled && rec3.over.dev === 1 && rec3.speed.all[0] === 60, rec3.over);
  const longKey = 'new_' + 'x'.repeat(40);
  bookAdd(r3, 'dev', { [longKey]: 1, n0: 4 }, T0 + 4);   /* memory is empty: the door takes it */
  await bookPut(r3, T0 + 5);
  const rec3b = st3._store.get(bookKey(DAY0));
  check('2c. ...at the write a new number past the line is refused and counted, an add to a number it has lands', rec3b.dev.n0 === 5 && !(longKey in rec3b.dev) && rec3b.over.dev === 2, rec3b.over);
  check('2c. ...the stored part is still within PART_BYTES', bookBytes(bookNormalize(rec3b, DAY0).dev) <= DAYBOOK.PART_BYTES);
  /* the worst case: every part full of the longest keys, the deepest trees,
     the widest numbers -- the reckoning is an upper bound of the JSON, and
     the whole day fits a stored value */
  const st5 = makeState(); const r5 = newRoom(st5);
  bookAdd(r5, 'econ', { x: 1 }, T0); await r5._daybook.putting;
  st5._store.delete(bookKey(DAY0));
  const K = (c, i) => (c + String(i)).padEnd(DAYBOOK.KEY_MAX, 'z');
  const wide = -123456.78901234567;
  for (const part of DAYBOOK.PARTS) {
    let i = 0;
    while (bookAdd(r5, part, i % 2 ? { [K('a', i)]: { [K('b', i)]: { [K('c', i)]: wide } } } : { [K('d', i)]: [wide, wide, wide] }, T0 + 10)) i++;
  }
  await bookPut(r5, T0 + 11);
  const worst = st5._store.get(bookKey(DAY0));
  const json = JSON.stringify(worst).length;
  const reckoned = DAYBOOK.PARTS.every((p) => bookBytes(bookNormalize(worst, DAY0)[p]) >= JSON.stringify(worst[p]).length);
  check(`10b. the worst full day is ${json} bytes of JSON, under 128 KiB, and the door's reckoning is an upper bound of each part`, json < 128 * 1024 && reckoned, { json, reckoned });
}

/* ── 3. days are UTC ── */
{
  const st = makeState();
  const room = newRoom(st);
  const mid = Date.UTC(2026, 10, 15, 0, 0, 0);
  bookAdd(room, 'econ', { mint: { gold: 1 } }, mid - 1000);
  await room._daybook.putting;
  bookAdd(room, 'econ', { mint: { gold: 2 } }, mid - 1);
  bookAdd(room, 'econ', { mint: { gold: 4 } }, mid + 1);
  await bookPut(room, mid + 2);
  check('3a. either side of midnight UTC, two records', st._store.get(bookKey('20261114')).econ.mint.gold === 3 && st._store.get(bookKey('20261115')).econ.mint.gold === 4,
    [st._store.get(bookKey('20261114')), st._store.get(bookKey('20261115'))]);
  check('3a. ...yesterday written before today (oldest first)', st._puts.indexOf(bookKey('20261114'), 1) < st._puts.indexOf(bookKey('20261115')), st._puts);
}

/* ── 4. a failed write ── */
{
  const st = makeState();
  const room = newRoom(st);
  st.failPut = true;
  bookAdd(room, 'room', { rows: 3 }, T0);
  await room._daybook.putting;
  check('4a. a refused put writes nothing', !st._store.has(bookKey(DAY0)));
  check('4a. ...and keeps the sums for the next pace', room._daybook.days.get(DAY0).parts.room.rows === 3);
  bookAdd(room, 'room', { rows: 2 }, T0 + 1000);
  check('4b. no second try inside the pace (a storage that refuses is not asked at every add)', !room._daybook.putting);
  st.failPut = false;
  bookAdd(room, 'room', { rows: 1 }, T0 + DAYBOOK.PACE_MS);
  await room._daybook.putting;
  check('4c. the next pace writes every sum, once', st._store.get(bookKey(DAY0)).room.rows === 6, st._store.get(bookKey(DAY0)));
  st.failGet = true;
  bookAdd(room, 'room', { rows: 10 }, T0 + 2 * DAYBOOK.PACE_MS);
  await room._daybook.putting;
  st.failGet = false;
  check('4d. a refused read writes nothing and keeps the sums', st._store.get(bookKey(DAY0)).room.rows === 6 && room._daybook.days.get(DAY0).parts.room.rows === 10);
  await bookPut(room, T0 + 3 * DAYBOOK.PACE_MS);
  check('4d. ...written whole by the next', st._store.get(bookKey(DAY0)).room.rows === 16);
  /* adds while a put is out land in the next */
  const st2 = makeState(); const r2 = newRoom(st2);
  bookAdd(r2, 'room', { rows: 1 }, T0);
  const p = r2._daybook.putting;
  bookAdd(r2, 'room', { rows: 5 }, T0 + 1);
  await p;
  check('4e. an add while a put is out waits for the next one (not lost, not in this one)', st2._store.get(bookKey(DAY0)).room.rows === 1 && r2._daybook.days.get(DAY0).parts.room.rows === 5);
}

/* ── 5. a restart ── */
{
  const st = makeState();
  const a = newRoom(st);
  bookAdd(a, 'econ', { mint: { gold: 100 } }, T0);
  await a._daybook.putting;
  const b = newRoom(st);   /* the deploy: a new worker, the same storage */
  bookAdd(b, 'econ', { mint: { gold: 7 }, burn: { gold: 2 } }, T0 + 60000);
  await b._daybook.putting;
  const rec = st._store.get(bookKey(DAY0));
  check('5a. a new worker writes its first add at once, INTO the stored day', rec.econ.mint.gold === 107 && rec.econ.burn.gold === 2, rec.econ);
}

/* ── 6. a newer worker's day ── */
{
  const st = makeState();
  const newer = { v: DAYBOOK.V + 1, day: DAY0, at: 5, econ: { future: 1 }, shape: 'theirs' };
  st._store.set(bookKey(DAY0), structuredClone(newer));
  const room = newRoom(st);
  bookAdd(room, 'econ', { mint: { gold: 1 } }, T0);
  await room._daybook.putting;
  check('6a. a day a newer worker wrote is left whole, never written over', JSON.stringify(st._store.get(bookKey(DAY0))) === JSON.stringify(newer) && putsOf(st, DAY0) === 0);
  const read = await bookRead(room, 3);
  check('6b. ...and read as blank beside its mark', read.ok && read.days[0].newer === true && Object.keys(read.days[0].econ).length === 0, read);
}

/* ── 7. kept 60 days ── */
{
  const st = makeState();
  for (let i = 0; i < 75; i++) st._store.set(bookKey(bookDay(T0 - i * 86400000)), { v: 1, day: bookDay(T0 - i * 86400000), at: 1, econ: {}, room: {}, dev: {}, speed: {} });
  st._store.set('daybooker:x', 1);   /* another prefix is never touched */
  const room = newRoom(st);
  let pages = 0;
  for (let i = 0; i < 6; i++) {
    bookAdd(room, 'room', { n: 1 }, T0 + i * DAYBOOK.PACE_MS);
    if (room._daybook.putting) { await room._daybook.putting; pages++; }
  }
  const kept = [...st._store.keys()].filter((k) => k.startsWith(DAYBOOK.PREFIX)).sort();
  check(`7a. 75 days stored -> the newest ${DAYBOOK.KEEP_DAYS} kept (${kept.length})`, kept.length === DAYBOOK.KEEP_DAYS && kept[kept.length - 1] === bookKey(DAY0) && kept[0] === bookKey(bookDay(T0 - (DAYBOOK.KEEP_DAYS - 1) * 86400000)), [kept.length, kept[0]]);
  check('7a. ...another prefix untouched', st._store.get('daybooker:x') === 1);
  const st2 = makeState();
  for (let i = 0; i < 200; i++) st2._store.set(bookKey(bookDay(T0 - i * 86400000)), { v: 1 });
  const r2 = newRoom(st2);
  let calls = 0, maxDel = 0;
  const realDel = st2.storage.delete;
  st2.storage.delete = async (k) => { calls++; maxDel = Math.max(maxDel, Array.isArray(k) ? k.length : 1); return realDel(k); };
  for (let i = 0; i < 10; i++) { bookAdd(r2, 'room', { n: 1 }, T0 + i * DAYBOOK.PACE_MS); if (r2._daybook.putting) await r2._daybook.putting; }
  const kept2 = [...st2._store.keys()].filter((k) => k.startsWith(DAYBOOK.PREFIX)).length;
  check(`7b. 200 days go a page at a time: ${calls} deletes of at most ${maxDel} (PRUNE_PAGE ${DAYBOOK.PRUNE_PAGE}), ${kept2} kept`, kept2 === DAYBOOK.KEEP_DAYS && maxDel <= DAYBOOK.PRUNE_PAGE && calls >= Math.ceil(140 / DAYBOOK.PRUNE_PAGE), { calls, maxDel, kept2 });
  const lists = [];
  const realList = st2.storage.list;
  st2.storage.list = async (o) => { lists.push(o); return realList(o); };
  bookAdd(r2, 'room', { n: 1 }, T0 + 20 * DAYBOOK.PACE_MS); await r2._daybook.putting;
  check('7c. once done, the prune does not run again that day', lists.length === 0, lists);
  bookAdd(r2, 'room', { n: 1 }, T0 + 86400000); await r2._daybook.putting;
  check('7c. ...and runs again the next day, one bounded page', lists.length === 1 && lists[0].limit === DAYBOOK.PRUNE_PAGE && lists[0].prefix === DAYBOOK.PREFIX, lists);
}

/* ── 8. the kill switch ── */
{
  check('8a. `daybook` is a name POST /flags takes', flagNameOk('daybook'));
  const st = makeState();
  const room = newRoom(st);
  room._liveFlags = { daybook: false };
  check('8b. `daybook: false` reads off on the room (liveops.js _daybookOff)', room._daybookOff() === true);
  check('8b. ...an add is refused', bookAdd(room, 'econ', { mint: { gold: 1 } }, T0) === false);
  check('8b. ...nothing in memory, nothing written', (!room._daybook || room._daybook.days.size === 0) && st._puts.length === 0);
  st._store.set(bookKey(DAY0), { v: 1, day: DAY0, at: 1, econ: { mint: { gold: 9 } }, room: {}, dev: {}, speed: {} });
  const r = await bookRead(room, 7);
  check('8c. ...what is stored stays, and the reader says the book is off', r.ok && r.on === false && r.days[0].econ.mint.gold === 9, r);
  room._liveFlags = {};
  check('8d. nothing set: on', room._daybookOff() === false && bookAdd(room, 'econ', { mint: { gold: 1 } }, T0) === true);
  room._liveFlags = { daybook: true };
  check('8d. ...`daybook: true` on', room._daybookOff() === false);
}

/* ── 9. the read ── */
{
  const st = makeState();
  for (let i = 0; i < 10; i++) st._store.set(bookKey(bookDay(T0 - i * 86400000)), { v: 1, day: bookDay(T0 - i * 86400000), at: 1, econ: { mint: { gold: i } }, room: {}, dev: {}, speed: {} });
  const room = newRoom(st);
  bookAdd(room, 'econ', { mint: { gold: 1000 } }, T0);
  await room._daybook.putting;
  bookAdd(room, 'econ', { mint: { gold: 5 } }, T0 + 1000);   /* counted, not yet written */
  const r = await bookRead(room, 3);
  check('9a. three days, newest first', r.ok && r.on === true && r.days.length === 3 && r.days[0].day === DAY0 && r.days[1].day === bookDay(T0 - 86400000) && r.days[2].day === bookDay(T0 - 2 * 86400000), r.days.map((d) => d.day));
  check('9b. ...today with what is stored AND what waits (0 + 1000 + 5)', r.days[0].econ.mint.gold === 1005, r.days[0].econ);
  check('9b. ...the read changes nothing in memory', room._daybook.days.get(DAY0).parts.econ.mint.gold === 5);
  const r2 = await bookRead(room, 9999);
  check('9c. n is held to KEEP_DAYS, 7 when not said', r2.days.length === 10 && (await bookRead(room)).days.length === 7);
  const st3 = makeState(); const r3 = newRoom(st3);
  bookAdd(r3, 'speed', { all: [1] }, T0); bookAdd(r3, 'speed', { all: [1] }, T0 + 1);
  st3.failPut = true;
  check('9d. a day with nothing stored yet reads from memory', (await bookRead(r3, 1)).days[0].speed.all[0] >= 1);
  const st4 = makeState(); st4.storage.list = async () => { throw new Error('no'); };
  check('9e. a read the storage refuses says so', (await bookRead(newRoom(st4), 1)).ok === false);
}

/* ── 10. a hand-edited record ── */
{
  const raw = JSON.parse('{"v":1,"day":"20261114","at":"x","econ":{"__proto__":{"a":1},"mint":{"gold":5,"bad key":2,"s":"str","n":null},"arr":[1,"x"]},"room":7,"dev":[1,2],"over":{"econ":-3,"room":2,"nope":4}}');
  const n = bookNormalize(raw, DAY0);
  check('10a. a hand-edited record keeps only what the door would take', n.econ.mint.gold === 5 && Object.keys(n.econ).join() === 'mint' && Object.keys(n.econ.mint).join() === 'gold'
    && Object.keys(n.room).length === 0 && Object.keys(n.dev).length === 0 && n.at === 0 && n.over.room === 2 && !('econ' in n.over) && !('nope' in n.over), n);
  check('10a. ...its maps have no prototype', Object.getPrototypeOf(n.econ) === null && Object.getPrototypeOf(n.econ.mint) === null);
}

/* ── 11. the gatekeeper's two finds ── */
{
  const st = makeState(); const room = newRoom(st);
  const T = Date.UTC(2026, 10, 14, 12, 0, 0);
  bookAdd(room, 'room', { a: 1 }, T); await room._daybook.putting;
  // eslint-disable-next-line no-sparse-arrays
  check('11. an array with a gap is refused whole ([1, , 3])', bookAdd(room, 'dev', { bins: [1, , 3] }, T + 1) === false);
  check('11. ...and an array of holes (new Array(3))', bookAdd(room, 'dev', { bins: new Array(3) }, T + 2) === false);
  check('11. ...while a whole one is taken', bookAdd(room, 'dev', { bins: [1, 0, 3] }, T + 3) === true);
  await bookPut(room, T + 4);
  const rec = st._store.get(bookKey(DAY0));
  check('11. nothing stored is NaN', !JSON.stringify(rec).includes('null') && rec.dev.bins.join() === '1,0,3' && rec.over.dev === 2, rec);
  /* a far `now`: the pace's mark stays on the room's clock */
  NOW = T + DAYBOOK.PACE_MS + 10000;
  bookAdd0(room, 'room', { far: 1 }, NOW + 86400000 * 30);
  await room._daybook.putting;
  check('11. a count with a far `now` is filed under the day it names', !!st._store.get(bookKey(bookDay(NOW + 86400000 * 30))));
  check('11. ...and the pace\'s mark is the room\'s clock, not a month on', room._daybook.lastPut === NOW, room._daybook.lastPut);
  NOW += DAYBOOK.PACE_MS + 1;
  bookAdd0(room, 'room', { next: 1 }, 'x');   /* not a number: the room's clock */
  await room._daybook.putting;
  check('11. ...so the next pace still writes (today\'s day, from the room\'s clock)', (st._store.get(bookKey(DAY0)).room || {}).next === 1, st._store.get(bookKey(DAY0)));
}

/* ── 12. the `econ` part, from the two doors ── */
{
  const { bagGive, bagTake, setBagBook } = await import('../src/bag.js');
  const st = makeState(); const room = newRoom(st);
  room._syncBagCaps();   /* the room hands the bag door its book (liveops.js) */
  const T = Date.UTC(2026, 10, 14, 15, 0, 0);
  NOW = T;
  const ps = { coins: 100, inventory: { ore_copper: 5 } };
  room._goldGive(ps, 40, 'quest_reward');                 /* mint 40 */
  room._goldTake(ps, 15, 'harden');                       /* burn 15 */
  room._goldTake(ps, 30, 'bank_deposit');                 /* escrow: nothing */
  room._goldTake(ps, 10, 'trade_window');                 /* move: nothing */
  room._goldGive(ps, 25, 'mail_gold', { opId: 'dq:x:1:0', payload: { amount: 25 } });   /* a mint by the mail */
  bagGive(ps.inventory, 'ore_copper', 3, 'harvest');       /* mint 3 */
  bagTake(ps.inventory, 'ore_copper', 2, 'smelt_ore');     /* burn 2 */
  bagGive(ps.inventory, 'bar_copper', 2, 'smelt_bar');     /* mint 2 */
  bagTake(ps.inventory, 'bar_copper', 1, 'bank_deposit');  /* escrow: nothing */
  await bookPut(room, T + 1);   /* v2.3.5085: waits for the first add's put, then writes the rest (never two at once) */
  const e = st._store.get(bookKey(DAY0)).econ;
  check('12. the econ part: gold minted 65 (40 + 25 by the mail), burned 15; the escrow and the move nothing', e.g.mint === 65 && e.g.burn === 15, e.g);
  check('12. ...each bag key by itself: copper ore minted 3, burned 2; copper bars minted 2', e.i.mint.ore_copper === 3 && e.i.burn.ore_copper === 2 && e.i.mint.bar_copper === 2 && !e.i.burn.bar_copper, e.i);
  check('12. ...and it says what the character\'s own `_econ` counted (the room\'s book is their sum)', ps._econ.g.m === e.g.mint && ps._econ.g.b === e.g.burn);
  room._liveFlags = { daybook: false };
  room._goldGive(ps, 99, 'quest_reward');
  check('12. `daybook: false`: the doors add nothing to the book (the character still counts)', !(room._daybook.days.get(DAY0) && room._daybook.days.get(DAY0).parts.econ.g) && ps._econ.g.m === 65 + 99);
  room._liveFlags = {};
  setBagBook(null);
}

/* ── 13. the last one out ── */
{
  const st = makeState(); const room = newRoom(st);
  room._syncBagCaps();
  const T = Date.UTC(2026, 10, 14, 18, 0, 0);
  NOW = T;
  const ws = { sent: [], send(x) { this.sent.push(x); }, close() {} };
  room.sessions.set(ws, { id: null, name: 'Anon', data: {}, rtt: 80, lastPing: 0, lastRecv: NOW });
  await room.webSocketMessage(ws, JSON.stringify({ type: 'join', id: 'bp_book_last', name: 'L', phrase: 'p-l', protocolVersion: 2, ws: [1, 5], data: { x: 0, y: 0, z: 'town' } }));
  await new Promise((r) => setTimeout(r, 10));
  const P = room.playerState.bp_book_last;
  if (room._daybook && room._daybook.putting) await room._daybook.putting;   /* the join's start gold: the worker's first add, written at once */
  const start = st._store.get(bookKey(DAY0)).econ.g.mint;
  NOW += 60000;
  room._goldGive(P, 10, 'quest_reward');    /* inside the pace: these wait in memory */
  room._goldGive(P, 7, 'quest_reward');
  check(`13. inside the pace, the adds wait (the start gold ${start} written, 17 waiting)`, start > 0 && room._daybook.days.get(DAY0).parts.econ.g.mint === 17, start);
  await room.webSocketClose(ws, 1000, 'bye', true);
  await new Promise((r) => setTimeout(r, 20));
  if (room._daybook.putting) await room._daybook.putting;
  check('13. the last one out: what waited is written, the room empty', st._store.get(bookKey(DAY0)).econ.g.mint === start + 17 && room.sessions.size === 0 && room._daybook.days.size === 0, st._store.get(bookKey(DAY0)).econ);
  const { setBagBook } = await import('../src/bag.js');
  setBagBook(null);
}

console.log(`\n${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
console.log('all daybook checks passed');
process.exit(0);
