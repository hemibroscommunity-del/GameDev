/* ═══ v2.3.5093: THE OWNER'S CARD'S RULES (src/game/econCard.js; card E PR 12) ═══
 *
 *   1. A DAY OF THE BOOK as the card shows it: gold made and destroyed (the
 *      `econ` part as the two doors add it: g.mint, g.burn; each item under
 *      i.mint / i.burn), the items made and destroyed most first, the room's
 *      own row (card A's `room` part, under its shape's number), the
 *      smoothness cells and Speed test cards, and a full part's `over`.
 *   2. A DAY THAT IS EMPTY, OR HAND-MADE, reads as zeros and empty lists,
 *      never a throw; an unknown shape of the room's row is not added in.
 *   3. THE FIVE NUMBERS, in the plan's order (step 10.4), and NOT COUNTED YET
 *      (null) while nothing counts them: a 0 would look like a reading.
 *   4. THE BOOK'S DAYS from the one admin route's answer, newest first, as
 *      the doors really write them (the gold door through the book's door).
 *
 * BREAK PROOF (rule 8), tried by hand: econNumbers returning 0 for a number
 * with no count -> FAIL 3.
 */
import { econDay, econDays, econNumbers, ECON_NUMBERS } from '../../src/game/econCard.js';

let failures = 0, passes = 0;
function check(name, cond, detail) {
  if (cond) { passes++; console.log('PASS', name); }
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 600) : ''); }
}

/* ── 1. a day ── */
{
  const d = econDay({
    day: '20261114',
    econ: { g: { mint: 65, burn: 15 }, i: { mint: { ore_copper: 3, bar_copper: 2, fish_minnow: 9 }, burn: { ore_copper: 2 } } },
    room: { '1': { joins: [1, 4], restarts: 2, rows: [30, 3], refused: [1, 0], ticks: 900, gap: [1, 2] } },
    dev: { 'g2.s0.4096|full|none|5080': { n: 1 }, 'g1.s0.2048|full|none|5080': { n: 2 } },
    speed: { a: 1 },
    over: { dev: 2, econ: 0 },
  });
  check('1. gold made 65, destroyed 15', d.day === '20261114' && d.goldMade === 65 && d.goldGone === 15, d);
  check('1. ...the items made, the most first; the items destroyed', JSON.stringify(d.itemsMade) === '[["fish_minnow",9],["ore_copper",3],["bar_copper",2]]' && JSON.stringify(d.itemsGone) === '[["ore_copper",2]]', d);
  check('1. ...the room\'s row: joins (v1, v2), restarts, rows written and deleted, saves refused', JSON.stringify(d.room) === JSON.stringify({ joins: [1, 4], restarts: 2, rows: [30, 3], refused: [1, 0], otherShapes: 0 }), d.room);
  check('1. ...two smoothness cells, one speed card, and the full part\'s count (a 0 left out)', d.devCells === 2 && d.speedCards === 1 && JSON.stringify(d.over) === '[["dev",2]]', d);
}

/* ── 2. empty, hand-made ── */
{
  let threw = false;
  let a, b;
  try {
    a = econDay(null);
    b = econDay({ day: 7, econ: { g: { mint: 'x', burn: Infinity }, i: { mint: [1, 2], burn: null } }, room: { '2': { joins: [9, 9] }, '1': 'junk' }, dev: 3, over: { a: 'x' } });
  } catch (e) { threw = true; }
  check('2. an empty day and a hand-made one read as zeros, never a throw', !threw && a.goldMade === 0 && a.itemsMade.length === 0 && a.room.joins[0] === 0 && a.devCells === 0, { a, b });
  check('2. ...a number that is not one is 0; an unknown shape of the room row is not added in (it is counted aside)', !threw && b.goldMade === 0 && b.goldGone === 0 && b.room.joins[0] === 0 && b.room.otherShapes === 1 && b.day === '', b);
  check('2. ...a newer worker\'s day says so', econDay({ day: '20261114', newer: true }).newer === true);
}

/* ── 3. the five numbers ── */
{
  check('3. five numbers, in the plan\'s order', ECON_NUMBERS.map((n) => n.id).join() === 'unexplained,perHour,oneWay,richest,cases' && Object.isFrozen(ECON_NUMBERS));
  const none = econNumbers(null);
  check('3. ...NOT COUNTED YET (null) while nothing counts them, never a 0', ECON_NUMBERS.every((n) => none[n.id] === null), none);
  const some = econNumbers({ unexplained: 0, oneWay: 0.25, richest: 'a lot', perHour: NaN });
  check('3. ...a counted number is shown, 0 included; anything else is not', some.unexplained === 0 && some.oneWay === 0.25 && some.richest === null && some.perHour === null && some.cases === null, some);
  check('3. ...each says what it is and what it waits for', ECON_NUMBERS.every((n) => n.name && n.what && n.waits));
}

/* ── 4. the route's days, as the doors write them ── */
{
  const { GameRoom } = await import('../src/index.js');
  const { bookRead } = await import('../src/daybook.js');
  const store = new Map();
  const clone = (v) => (v === undefined ? v : structuredClone(v));
  const state = {
    storage: {
      async get(k) { return clone(store.get(k)); },
      async put(k, v) { if (k && typeof k === 'object') { for (const [kk, vv] of Object.entries(k)) store.set(kk, clone(vv)); return; } store.set(k, clone(v)); },
      async delete(k) { return store.delete(k); },
      async list(o) { let ks = [...store.keys()].filter((k) => !o?.prefix || k.startsWith(o.prefix)).sort(); if (o?.reverse) ks.reverse(); if (o?.limit) ks = ks.slice(0, o.limit); return new Map(ks.map((k) => [k, clone(store.get(k))])); },
    },
    getWebSockets: () => [], acceptWebSocket: () => {},
  };
  const room = new GameRoom(state, { LEADERBOARD: { idFromName: () => 'x', get: () => ({ fetch: async () => new Response('{}') }) } });
  room._liveFlags = {};
  room._syncBagCaps();
  const ps = { coins: 100, inventory: {} };
  room._goldGive(ps, 40, 'quest_reward');
  room._goldTake(ps, 15, 'harden');
  room._goldTake(ps, 30, 'bank_deposit');
  const r = await bookRead(room, 1);
  const days = econDays(r);
  check('4. the route\'s answer read as the card shows it: today, gold made 40, destroyed 15 (the bank\'s deposit is neither)', r.ok && days.length === 1 && days[0].goldMade === 40 && days[0].goldGone === 15, { r, days });
  check('4. ...an answer with no days is no days', econDays(null).length === 0 && econDays({ ok: true }).length === 0);
  const { setBagBook } = await import('../src/bag.js');
  setBagBook(null);
}

console.log(`\n${passes} passed, ${failures} failed`);
if (failures) process.exit(1);
console.log('all econ-card checks passed');
process.exit(0);
