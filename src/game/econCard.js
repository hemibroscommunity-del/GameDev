/* ═══ v2.3.5093: THE OWNER'S CARD, ITS RULES (grand plan step 10.4, card E PR 12) ═══
 *
 * What the Test panel's economy card (src/ui/panels/EconCard.jsx) shows,
 * worked out from the day's book as its ONE admin route returns it (GET
 * /dev/daybook, card A's, devtools.js: newest day first, each the stored
 * record plus what waits to be written).  No imports, so node tests it
 * (server/test/econ-card.test.mjs).
 *
 *   econDay(day)     one day's parts in words and numbers: gold made and
 *                    destroyed (the `econ` part, card E), the items made and
 *                    destroyed most, the room's own row (`room`, card A:
 *                    joins, restarts, rows written, saves refused) and how
 *                    many smoothness cells and Speed test cards it holds;
 *   ECON_NUMBERS     the economy's five numbers (the plan's step 10.4), in
 *                    order, each with what it is and where it comes from;
 *   econNumbers(...) their values -- null where nothing counts it yet: a
 *                    number with no count is shown as "not counted yet",
 *                    never as a 0 that looks like a reading.
 */

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const own = (o, k) => !!o && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k);

/** The `econ` part's tree: { g: { mint, burn }, i: { mint: {key: n}, burn: {key: n} } }
 *  (the doors' adds, daybook.js).  A set road's signed difference is kept
 *  signed, so a "burn" can be read below 0 on a day a set road gave back. */
function econOf(part) {
  const p = part && typeof part === 'object' ? part : {};
  const g = own(p, 'g') && p.g && typeof p.g === 'object' ? p.g : {};
  const i = own(p, 'i') && p.i && typeof p.i === 'object' ? p.i : {};
  const list = (o) => Object.keys(o && typeof o === 'object' ? o : {})
    .map((k) => [k, num(o[k])]).filter(([, n]) => n !== 0)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]) || (a[0] < b[0] ? -1 : 1));
  return { goldMade: num(g.mint), goldGone: num(g.burn), itemsMade: list(i.mint), itemsGone: list(i.burn) };
}

/** The `room` part (card A's roomrow.js): its numbers under the shape's
 *  number, `room: { '1': { rows, refused, joins, restarts, ticks } }`; an
 *  unknown shape's numbers are not added into these (they are shown as
 *  `otherShapes`). */
function roomOf(part) {
  const p = part && typeof part === 'object' ? part : {};
  const t = own(p, '1') && p['1'] && typeof p['1'] === 'object' ? p['1'] : {};
  const pair = (a) => (Array.isArray(a) ? [num(a[0]), num(a[1])] : [0, 0]);
  return {
    joins: pair(t.joins), restarts: num(t.restarts), rows: pair(t.rows), refused: pair(t.refused),
    otherShapes: Object.keys(p).filter((k) => k !== '1').length,
  };
}

/** One day of the book, as the card shows it. */
export function econDay(day) {
  const d = day && typeof day === 'object' ? day : {};
  return {
    day: typeof d.day === 'string' ? d.day : '',
    newer: d.newer === true,
    ...econOf(d.econ),
    room: roomOf(d.room),
    devCells: Object.keys(d.dev && typeof d.dev === 'object' ? d.dev : {}).length,
    speedCards: Object.keys(d.speed && typeof d.speed === 'object' ? d.speed : {}).length,
    over: Object.keys(d.over && typeof d.over === 'object' ? d.over : {}).filter((k) => num(d.over[k]) > 0).map((k) => [k, num(d.over[k])]),
  };
}

/** The economy's five numbers, in the plan's order (step 10.4).  `from`:
 *  what counts it; `waits`: what it waits for while nothing does. */
export const ECON_NUMBERS = Object.freeze([
  Object.freeze({ id: 'unexplained', name: 'Unexplained gold', what: 'Gold held in the world that the roads do not explain (0 is right; anything else is a copy or a loss)', waits: 'the world\'s sum, counted live' }),
  Object.freeze({ id: 'perHour', name: 'Gold made a player-hour', what: 'Gold made in an hour of play, today against the last week', waits: 'a count of player-hours' }),
  Object.freeze({ id: 'oneWay', name: 'Moved one way for nothing', what: 'Of the gold moved between players, the share that went one way with nothing back', waits: 'the transfer ledger\'s read' }),
  Object.freeze({ id: 'richest', name: 'New gold to the richest', what: 'Of the gold made, the share that reached the ten richest', waits: 'each character\'s gold made over the day' }),
  Object.freeze({ id: 'cases', name: 'Cases waiting', what: 'Cases for the owner to look at', waits: 'card Q\'s cases' }),
]);

/** The five numbers' values from what the card has read: each null while
 *  nothing counts it (the card says "not counted yet").  `src` may carry
 *  what a later read brings (`unexplained`, `perHour`, `oneWay`, `richest`,
 *  `cases`): a number there is shown; anything else is not. */
export function econNumbers(src) {
  const s = src && typeof src === 'object' ? src : {};
  const out = Object.create(null);
  for (const n of ECON_NUMBERS) out[n.id] = typeof s[n.id] === 'number' && Number.isFinite(s[n.id]) ? s[n.id] : null;
  return out;
}

/** The days the book returned, as the card shows them: newest first. */
export function econDays(book) {
  const days = book && Array.isArray(book.days) ? book.days : [];
  return days.map(econDay);
}
