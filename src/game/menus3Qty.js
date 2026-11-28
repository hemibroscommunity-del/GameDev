/* ═══ v2.3.6872: THE ONE QUANTITY PICKER'S RULE (card MN step 13, the Counter and Make) ═══
 *
 * The card's Decided 6: "ONE quantity picker everywhere (minus, plus, Max),
 * crafting capped at what the materials allow".  This is its arithmetic, one
 * copy for every counter that asks "how many" (Make today; Trade and Keep
 * when their steps mount): the picker (src/ui/menus3/Menus3Qty.jsx) draws
 * what these say and nothing else.
 *
 *   - THE CAP.  `qtyMax(costs, room)`: the fewest whole makes any one cost
 *     allows (have / need, rounded down), held under `room` when the bench
 *     has a limit of its own (the weapon bag's free places).  A cost the
 *     player cannot meet once gives 0: nothing to pick, the commit greyed.
 *     A cost of 0 or less asks nothing and caps nothing.
 *   - THE NUMBER.  Always 1..max (1 when max is 0, so the button can still
 *     say what one would cost); minus at 1 and plus at max are greyed, Max
 *     jumps to the cap.
 *
 * The worker decides every make (it re-checks the materials, the gold, the
 * level): the cap only stops a press the worker would refuse.  No imports:
 * node's suite reads it (server/test/menus3-counter.test.mjs). */

/* a count read as a whole number of at least zero */
function whole(v) {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** How many makes the costs allow: `costs` [{have, need}], `room` an extra
 *  cap (omit or null for none).  0 when any cost is short of one make. */
export function qtyMax(costs, room) {
  let max = Infinity;
  for (const c of Array.isArray(costs) ? costs : []) {
    if (!c) continue;
    const need = whole(c.need);
    if (need <= 0) continue;
    max = Math.min(max, Math.floor(whole(c.have) / need));
  }
  if (room != null) max = Math.min(max, whole(room));
  if (max === Infinity) max = 1;   /* nothing it costs caps it: one at a time */
  return max;
}

/** The number held to 1..max (1 when max is 0). */
export function qtyClamp(n, max) {
  const m = whole(max);
  const v = whole(n) || 1;
  return m <= 0 ? 1 : Math.min(v, m);
}

/** A press: 'minus', 'plus' or 'max'.  The new number. */
export function qtyPress(n, max, press) {
  const v = qtyClamp(n, max);
  if (press === 'minus') return qtyClamp(v - 1, max);
  if (press === 'plus') return qtyClamp(v + 1, max);
  if (press === 'max') return qtyClamp(max, max);
  return v;
}

/** What the picker draws: { n, minus, plus, max } -- each button lit or greyed. */
export function qtyView(n, max) {
  const m = whole(max);
  const v = qtyClamp(n, m);
  return Object.freeze({ n: v, minus: v > 1, plus: v < m, max: m > 1 && v < m, cap: m });
}

/** Costs times the number (each row's chips read what the whole order costs). */
export function qtyTimes(costs, n) {
  const k = whole(n) || 1;
  return (Array.isArray(costs) ? costs : []).map((c) => Object.freeze(Object.assign({}, c, { need: whole(c && c.need) * k })));
}
