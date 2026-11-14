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
  const pl = own(p, 'p') && p.p && typeof p.p === 'object' ? p.p : {};
  return { goldMade: num(g.mint), goldGone: num(g.burn), itemsMade: list(i.mint), itemsGone: list(i.burn), playSeconds: num(pl.s) };
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
  Object.freeze({ id: 'unexplained', name: 'Unexplained gold', what: 'Between the last two daily counts, gold in the world that no road explains (0 is right; anything else is a copy or a loss). A character\'s restart is added back. The count reads the world a page at a time over a few seconds, so gold that moves between two pages then can show here, a little either way', waits: 'the world\'s sum, counted live' }),
  Object.freeze({ id: 'perHour', name: 'Gold made a player-hour', what: 'Gold made in an hour of play, today against the last week', waits: 'a count of player-hours' }),
  Object.freeze({ id: 'oneWay', name: 'Moved one way for nothing', what: 'Of the gold moved between players today, the share that went one way with nothing back', waits: 'the transfer ledger\'s read' }),
  Object.freeze({ id: 'richest', name: 'New gold to the richest', what: 'Of the gold made between the last two daily counts, the share the ten richest made', waits: 'each character\'s gold made over the day' }),
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

/* ═══ v2.3.5093: THE FIVE NUMBERS, COUNTED (the planning session's reading, 2026-11-14) ═══
   From the book (GET /dev/daybook: its days' `econ` part, gold made `g.mint`
   and the players' seconds `p.s`) and the card's other read (GET
   /dev/econcard: the daily snapshots' world sums, newest first, and the
   ledger's days summed).  Each is { v, why }: `v` a number, or null with
   `why` the words the card shows in its place.
     unexplained  the change in (held - made less destroyed) between the two
                  newest snapshots: gold no road explains (0 is right);
     perHour      gold made today an hour of play, `week` the same over the
                  other loaded days (up to 7);
     oneWay       of the gold moved between players today, the share moved
                  one way for nothing (a gift, or a trade with nothing back);
     richest      of the gold made between the two newest snapshots, the
                  share the ten richest made (their minted to date, summed: a
                  character new to the ten brings its whole history, so it
                  reads high on the day the ten change);
     cases        card Q's, not counted yet. */
const W = (o) => (o && typeof o === 'object' && typeof o.held === 'number' ? o : null);

/* ═══ v2.3.5093: THE RESTARTS BETWEEN TWO COUNTS (sitting 10, M1) ═══
   A restart takes a character's gold and their own count of what they made
   away together, outside the gold door; the server books the difference in
   the day's `econ` part (`r.g`, `r.n`: econcard.js econResetBook), and each
   daily count says how much of its own day's it had seen (`world.gone`).
   Between count `b` (older) and `a`: the rest of b's day, every day between,
   and a's day up to a.  v2.3.5094: `m`, their minted to date, the same way
   (the share of new gold to the richest).  `known` false when a day it needs is older than the
   book's loaded days, or a count is from before `gone`. */
function resetsBetween(a, b, days) {
  const ga = a && a.gone && typeof a.gone === 'object' ? a.gone : null;
  const gb = b && b.gone && typeof b.gone === 'object' ? b.gone : null;
  if (!ga || !gb || typeof ga.day !== 'string' || typeof gb.day !== 'string') return { g: 0, n: 0, m: 0, known: false };   /* a count from before `gone` */
  if (ga.day === gb.day) return { g: num(ga.g) - num(gb.g), n: num(ga.n) - num(gb.n), m: num(ga.m) - num(gb.m), known: true };
  const byDay = new Map(days.filter((d) => d && typeof d.day === 'string').map((d) => [d.day, d]));
  const oldest = days.length ? days[days.length - 1].day : null;
  const rOf = (d) => { const e = d && d.econ && typeof d.econ === 'object' ? d.econ : {}; return e.r && typeof e.r === 'object' ? e.r : {}; };
  let g = num(ga.g) - num(gb.g), n = num(ga.n) - num(gb.n), m = num(ga.m) - num(gb.m);
  let known = !!oldest && gb.day >= oldest;
  for (const [day, d] of byDay) if (day >= gb.day && day < ga.day) { g += num(rOf(d).g); n += num(rOf(d).n); m += num(rOf(d).m); }
  return { g, n, m, known };
}
export function econCompute(book, card) {
  const days = book && Array.isArray(book.days) ? book.days : [];
  const c = card && typeof card === 'object' ? card : {};
  const out = Object.create(null);
  const none = (why) => ({ v: null, why });
  if (c.on === false) {
    for (const n of ECON_NUMBERS) out[n.id] = none('the counting is switched off (the econ flag)');
    return out;
  }
  /* 1, 4: the two newest snapshots that carry a world sum */
  const snaps = (Array.isArray(c.metrics) ? c.metrics : []).map((m) => ({ day: m && m.day, w: W(m && m.world) })).filter((m) => m.w);
  if (snaps.length >= 2) {
    const [a, b] = snaps;   /* newest first */
    /* v2.3.5093 (sitting 10, M1): + the restarts between the two counts */
    const gone = resetsBetween(a.w, b.w, days);
    out.unexplained = { v: (a.w.held - a.w.net) - (b.w.held - b.w.net) + gone.g, why: gone.known ? null : 'a restart before the book\'s loaded days is not added back', since: b.day, restarts: gone.n };
    /* v2.3.5094 (sitting 11, F2): a restarted character's minted to date left
       the count with it: added back, as the unexplained gold adds `g` */
    const made = num(a.w.minted) - num(b.w.minted) + gone.m;
    const rich = (w) => (Array.isArray(w.richest) ? w.richest : []).reduce((t, r) => t + num(r && r[2]), 0);
    out.richest = made > 0 ? { v: Math.max(0, Math.min(1, (rich(a.w) - rich(b.w)) / made)), why: null } : none('no gold made between the last two counts');
  } else {
    out.unexplained = none(snaps.length ? 'one daily count so far: it needs two' : 'no daily count yet');
    out.richest = none(snaps.length ? 'one daily count so far: it needs two' : 'no daily count yet');
  }
  /* 2: gold made an hour of play, today and the other loaded days */
  const rate = (d, extraS) => {
    const e = d && d.econ && typeof d.econ === 'object' ? d.econ : {};
    const h = (num(e.p && e.p.s) + num(extraS)) / 3600;
    return h > 0 ? { made: num(e.g && e.g.mint), h } : null;
  };
  /* v2.3.5093 (sitting 10, M3): today's hours include the sittings still
     open (the route's `open`): their gold is in the book as it is made */
  const open = c.open && typeof c.open === 'object' && days[0] && days[0].day === c.open.day ? num(c.open.s) : 0;
  const today = rate(days[0], open);
  const week = days.slice(1, 8).map((d) => rate(d)).filter(Boolean);
  const wk = week.reduce((t, r) => ({ made: t.made + r.made, h: t.h + r.h }), { made: 0, h: 0 });
  out.perHour = today ? { v: today.made / today.h, why: null, week: wk.h > 0 ? wk.made / wk.h : null } : none('no play counted today yet');
  /* 3: the ledger's day */
  const x = Array.isArray(c.xfer) && c.xfer[0] ? c.xfer[0] : null;
  out.oneWay = x && x.gold > 0 ? { v: x.goldOneWay / x.gold, why: null } : none(x ? 'no gold moved between players today' : 'the transfer ledger not read');
  out.cases = none('card Q\'s cases');
  return out;
}

/** The days the book returned, as the card shows them: newest first. */
export function econDays(book) {
  const days = book && Array.isArray(book.days) ? book.days : [];
  return days.map(econDay);
}
