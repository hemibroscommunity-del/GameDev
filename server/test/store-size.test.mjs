/* ═══ v2.3.5287: THE STORAGE'S SIZE IN THE DAY'S BOOK (grand plan step 4.7, card R PR 8) ═══
 * (the code: server/src/daybook.js storeSizeRide, the part `size`; the card:
 *  src/game/econCard.js sizeOf; the spec: daybook.js's header)
 *
 * The room's whole storage, as its own SQLite file reports it
 * (`state.storage.sql.databaseSize`: a number the storage keeps, no row
 * read), once a worker's life a UTC day, into the day's book.
 *
 *   1. IT RIDES: read at a put the book is already making for today, never
 *      a put of its own -- a day with nothing else going out reads nothing
 *      and writes nothing; the size is in the same put as the day's sums;
 *   2. ONCE A DAY: a second put the same day reads nothing; the next UTC
 *      day reads again; a new worker (a deploy) reads again, and the card
 *      shows the mean of the readings;
 *   3. A STORAGE WITH NO SIZE: none (a test's, a key-value one), one that
 *      throws, or not a number: nothing added, nothing thrown, the day's
 *      sums written as before;
 *   4. THE KILL SWITCH `storesize: false`: nothing read, nothing added; and
 *      `daybook: false` reads nothing either;
 *   5. THE CARD: the owner's card shows the day's size, or "not read".
 *
 * BREAK PROOF (rule 8), tried by hand, 2026-11-14:
 *   - `b.sizedDay = today;` deleted from storeSizeRide       -> FAIL 2 (read at every put)
 *   - the "nothing of today's going out" line deleted         -> FAIL 1 (a day of the size alone is written)
 *
 * cost-guard.test §15d holds its row: an hour of adds writes the book no
 * more often with the size read than without.
 */
import { makeStorage, openRoom, settle, seededClock } from './testroom.mjs';
import { DAYBOOK, bookAdd, bookPut, bookDay, bookKey, storeSizeRide, storeSizeOff } from '../src/daybook.js';
import { econDay, sizeOf } from '../../src/game/econCard.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 700) : ''); }
}

const clock = seededClock({ start: Date.UTC(2026, 10, 14, 12, 0, 0), seed: 5 }).install();
const DAY = () => bookDay(clock.now());
const MB = 1048576;

/* A room on a storage that reports its size, counting each time it is asked. */
async function sizedRoom(size, flags) {
  const st = makeStorage();
  const asked = { n: 0 };
  Object.defineProperty(st.storage, 'sql', { value: { get databaseSize() { asked.n++; if (size instanceof Error) throw size; return typeof size === 'function' ? size() : size; } } });
  const room = await openRoom(st, flags);
  /* the room's own row adds every minute: off, so only this suite's adds go in */
  room._liveFlags.roomrow = false;
  return { st, room, asked };
}
const puts = (st) => [...st._store.keys()].filter((k) => k.startsWith(DAYBOOK.PREFIX));
const dayRec = (st, day) => st._store.get(bookKey(day || DAY()));

/* ══════════ 1. IT RIDES ══════════ */
{
  const { st, room, asked } = await sizedRoom(7 * MB);
  check('1. the part is in the book, and rides (it starts no put of its own)', DAYBOOK.PARTS.includes('size') && DAYBOOK.RIDES.includes('size'));
  /* nothing of today's going out: the size waits, read nothing */
  check('1. with nothing of today\'s going out, nothing is read and nothing added', storeSizeRide(room) === null && asked.n === 0 && !(room._daybook && room._daybook.days.size));
  await bookPut(room); await settle();
  check('1. ...and the book writes nothing', puts(st).length === 0, puts(st));
  /* a count goes out: the size rides its put */
  bookAdd(room, 'room', { tick: { n: 1 } });
  await room._daybook.putting; await settle();
  const rec = dayRec(st);
  check('1. a put of today\'s sums carries the size in the same record, read once', puts(st).length === 1 && rec && rec.size && rec.size.b === 7 * MB && rec.size.n === 1 && rec.room.tick.n === 1 && asked.n === 1, { rec, asked: asked.n });
  check('1. ...a riding add starts no put', (() => { const b0 = room._daybook.putting; bookAdd(room, 'size', { b: 1, n: 1 }); const started = room._daybook.putting !== b0 && room._daybook.putting !== null; room._daybook.days.clear(); return !started; })());
}

/* ══════════ 2. ONCE A DAY ══════════ */
{
  const { st, room, asked } = await sizedRoom(() => 3 * MB);
  for (let i = 0; i < 4; i++) {
    bookAdd(room, 'econ', { g: { mint: 1 } });
    bookAdd(room, 'room', { tick: { n: 1 } });
    await bookPut(room); await settle();
    clock.advance(10 * 60000);
  }
  let rec = dayRec(st);
  check('2. four puts in a day read the size once', asked.n === 1 && rec.size.n === 1 && rec.size.b === 3 * MB && rec.room.tick.n === 4, { asked: asked.n, size: rec.size });
  /* the next UTC day */
  const first = DAY();
  clock.advance(24 * 3600000);
  bookAdd(room, 'room', { tick: { n: 1 } });
  await bookPut(room); await settle();
  check('2. the next UTC day reads it again, into that day', asked.n === 2 && dayRec(st).size.n === 1 && dayRec(st, first).size.n === 1 && DAY() !== first, { asked: asked.n });
  /* a new worker the same day (a deploy) reads again: two readings */
  const room2 = await openRoom(st);
  room2._liveFlags.roomrow = false;
  bookAdd(room2, 'room', { tick: { n: 1 } });
  await bookPut(room2); await settle();
  rec = dayRec(st);
  check('2. a new worker the same day reads again: the day keeps two readings, and the card their mean', asked.n === 3 && rec.size.n === 2 && rec.size.b === 6 * MB && econDay(rec).size.bytes === 3 * MB && econDay(rec).size.reads === 2, { asked: asked.n, size: rec.size });
}

/* ══════════ 3. A STORAGE WITH NO SIZE ══════════ */
{
  const st = makeStorage();
  const room = await openRoom(st);
  room._liveFlags.roomrow = false;
  bookAdd(room, 'room', { tick: { n: 1 } });
  await room._daybook.putting; await settle();
  check('3. a storage with no `sql`: nothing added, the day written as before', puts(st).length === 1 && !Object.keys(dayRec(st).size || {}).length && dayRec(st).room.tick.n === 1, dayRec(st));
  for (const [what, size] of [['throws', new Error('no sql here')], ['not a number', 'big'], ['below 0', -5], ['NaN', NaN]]) {
    const r = await sizedRoom(size);
    bookAdd(r.room, 'room', { tick: { n: 1 } });
    await r.room._daybook.putting; await settle();
    const d = dayRec(r.st);
    check('3. a size that ' + what + ': nothing added, nothing thrown, the day written, and not asked again that day',
      !!d && !Object.keys(d.size || {}).length && d.room.tick.n === 1 && r.asked.n === 1 && (bookAdd(r.room, 'room', { tick: { n: 1 } }), storeSizeRide(r.room) === null && r.asked.n === 1), { d, asked: r.asked.n });
  }
}

/* ══════════ 4. THE KILL SWITCH ══════════ */
{
  const { st, room, asked } = await sizedRoom(9 * MB, { storesize: false });
  check('4. `storesize: false` is read as off', storeSizeOff(room) === true && storeSizeOff({ _liveFlags: {} }) === false && storeSizeOff({ _liveFlags: { storesize: true } }) === false);
  bookAdd(room, 'room', { tick: { n: 1 } });
  await room._daybook.putting; await settle();
  check('4. ...nothing read, nothing added; the day\'s sums written as before', asked.n === 0 && !Object.keys(dayRec(st).size || {}).length && dayRec(st).room.tick.n === 1, { asked: asked.n });
  const r = await sizedRoom(9 * MB, { daybook: false });
  bookAdd(r.room, 'room', { tick: { n: 1 } });
  await bookPut(r.room); await settle();
  check('4. `daybook: false`: nothing read either', r.asked.n === 0 && puts(r.st).length === 0);
}

/* ══════════ 5. THE CARD ══════════ */
{
  check('5. the card reads the day\'s size as the mean of its readings', JSON.stringify(sizeOf({ b: 10 * MB, n: 2 })) === JSON.stringify({ bytes: 5 * MB, reads: 2 }));
  check('5. ...and a day with none, or junk, as not read', sizeOf(undefined) === null && sizeOf({}) === null && sizeOf({ b: 5, n: 0 }) === null && sizeOf({ b: 'x', n: 'y' }) === null && sizeOf({ b: -4, n: 1 }) === null && econDay({ day: '20261114' }).size === null);
}

clock.restore();
console.log('\n' + passes + ' passed, ' + failures + ' failed');
if (failures) { console.log('store-size: FAILED'); process.exit(1); }
console.log('all store-size checks passed');
