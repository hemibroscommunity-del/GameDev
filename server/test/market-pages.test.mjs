/* ═══ v2.3.6023: THE GENERAL STORE'S BOOK READS A PAGE AN AWAIT (card RV; TRAPS §76) ═══
 *
 * The book's rebuild (market.js _mktEnsureIndex, once a worker's life) was
 * the last `storage.list` of the room that named no limit: every order read
 * in one list.  And it made the room's maps BEFORE the read, so:
 *   - a second caller while the read was under way (a second shop page, an
 *     order placed) found the book there and EMPTY: it matched an order
 *     against nothing and read every player's order count as zero;
 *   - a failed read left that empty book for the worker's life (every
 *     order on file unseen until the next restart).
 * Now (the clans' shape, clans.js _clansEnsure; card V5):
 *   1. the book is read a page an await (liveops.js _listAll), each list
 *      naming its limit, every order read;
 *   2. a second caller meanwhile waits for the same read and meets the whole
 *      book (its orders and every player's count);
 *   3. a failed read throws to its caller and leaves no book behind, so the
 *      next caller reads it;
 *   4. `listcap: false` (the switch V5 made, reused) reads the book whole in
 *      one list, as before.
 * The static census is tools/guards/traps-saves.test.mjs §76 (its list now
 * empty, its line 0). */
import { makeStorage, openRoom, settle } from './testroom.mjs';
import { LISTCAP } from '../src/liveops.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 600) : ''); }
}
function spy(s) {
  const calls = [];
  const list = s.storage.list.bind(s.storage);
  s.storage.list = async (o) => { calls.push({ ...(o || {}) }); return list(o); };
  return calls;
}
const N = LISTCAP.PAGE * 2 + 5;
/* N sell orders for one copper greatsword, a player each, and one player's three */
function book() {
  const s = makeStorage();
  for (let i = 0; i < N; i++) {
    const id = 'o' + String(i).padStart(4, '0');
    s._store.set('mkt_order:' + id, {
      id, type: 'sell', playerId: i < 3 ? 'bp_mp_many' : 'bp_mp_' + i,
      category: 'weapon', subtype: 'greatsword', tierKey: 'copper', price: 100 + i, ts: 1,
    });
  }
  return s;
}
const KEY = 'weapon:greatsword:copper:none:none';
const sells = (room) => { const b = room._mktIndex && room._mktIndex.get(KEY); return b ? b.sells.length : 0; };

/* ── 1. a page an await, every order read ── */
{
  const s = book();
  const room = await openRoom(s);
  const calls = spy(s);
  await room._mktEnsureIndex();
  check(`1. the book: all ${N} orders read`, sells(room) === N, sells(room));
  const mine = calls.filter((c) => c.prefix === 'mkt_order:');
  check('1. ...each list names a limit, the next after the last key', mine.length === 3 && mine.every((c) => c.limit === LISTCAP.PAGE) && mine.slice(1).every((c) => typeof c.startAfter === 'string'), mine);
  check('1. ...the cheapest sell heads its bucket, and the counts are whole', room._mktIndex.get(KEY).sells[0].price === 100 && room._mktOrderCounts.get('bp_mp_many') === 3);
}

/* ── 2. a second caller meanwhile meets the whole book ── */
{
  const s = book();
  const room = await openRoom(s);
  const calls = spy(s);
  let seen = null;
  const first = room._mktEnsureIndex();
  const second = room._mktEnsureIndex().then(() => { seen = { sells: sells(room), many: room._mktOrderCounts && room._mktOrderCounts.get('bp_mp_many') }; });
  await Promise.all([first, second]);
  check('2. a second caller during the read meets every order, not an empty book', seen && seen.sells === N, seen);
  check('2. ...and every player\'s order count (the cap reads 3, not 0)', seen && seen.many === 3, seen);
  check('2. ...one read between them (one walk of three pages)', calls.filter((c) => c.prefix === 'mkt_order:').length === 3, calls.length);
}

/* ── 3. a failed read leaves no book behind ── */
{
  const s = book();
  const room = await openRoom(s);
  const list = s.storage.list.bind(s.storage);
  let fail = true;
  s.storage.list = async (o) => { if (fail && o && o.prefix === 'mkt_order:') { fail = false; throw new Error('storage busy'); } return list(o); };
  let threw = false;
  try { await room._mktEnsureIndex(); } catch (e) { threw = true; }
  check('3. a failed read throws to its caller and leaves no empty book', threw && !room._mktIndex, room._mktIndex && room._mktIndex.size);
  await room._mktEnsureIndex();
  check('3. ...so the next caller reads it whole', sells(room) === N, sells(room));
}

/* ── 4. listcap: false, one list as before ── */
{
  const s = book();
  const room = await openRoom(s, { listcap: false });
  const calls = spy(s);
  await room._mktEnsureIndex();
  const mine = calls.filter((c) => c.prefix === 'mkt_order:');
  check('4. listcap: false reads the book whole in one list, no limit', mine.length === 1 && mine[0].limit === undefined && sells(room) === N, mine);
}

await settle();
console.log(`\n${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
