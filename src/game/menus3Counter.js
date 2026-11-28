/* ═══ v2.3.6872: THE COUNTER'S RULES (card MN step 13, the Counter and Make) ═══
 *
 * The card's Decided 6: ONE component for every town station, four modes
 * (Make, Trade, Keep, Play), "a station is always its one mode".  The SPEC's
 * Quick-Tap and Undo are OVERRULED there: nothing here sells, makes or banks
 * on a single tap, and nothing is taken back.  This module is the page's
 * three rules for it; the component is src/ui/menus3/Menus3Counter.jsx.
 *
 *   - THE STATIONS.  Which of today's building windows (BroTown's
 *     `buildingPanel` id, data/buildings.js `action`) is which station, in
 *     which mode, and whether its Counter is built.  Step 13 builds Make for
 *     the Blacksmith (`forge`); the Woodworker, the Gem Works and the
 *     Cookhouse are listed and still open today's windows until they are
 *     built; Trade, Keep and Play (card MN steps 14 and 15) add their rows.
 *   - THE BLACKSMITH'S TABS.  Today's six (SmithyPanel.jsx), each shown only
 *     against a worker that settles it, read off the same caps; the Amulet
 *     tab only to someone holding gold for it (forgeTabs.js).
 *   - THE QUEUE.  A quantity over one is the bench's OWN request sent one
 *     after another (Decided 6), never a new request: each send waits for the
 *     character to change (the thing made) before the next; a silence is a
 *     refusal, said, and it stops the queue -- what landed stays.  A bench
 *     whose own request takes a count (the smelter's `smelt_bar { count }`,
 *     "Smelt all" today) sends it in pieces of what one request may hold.
 *
 * No imports but the page's own rule (node's suite reads it:
 * server/test/menus3-counter.test.mjs). */
import { amuletTabShown } from './forgeTabs.js';

export const COUNTER_MODES = Object.freeze(['make', 'trade', 'keep', 'play']);

/* today's window id -> its station.  `built`: its Counter exists (step 13: the Blacksmith). */
export const COUNTER_STATIONS = Object.freeze({
  forge: Object.freeze({ mode: 'make', bench: 'blacksmith', built: true }),
  woodwork: Object.freeze({ mode: 'make', bench: 'woodworker', built: false }),
  gemcut: Object.freeze({ mode: 'make', bench: 'gemworks', built: false }),
  enchant: Object.freeze({ mode: 'make', bench: 'gemworks', built: false }),
  cook: Object.freeze({ mode: 'make', bench: 'cookhouse', built: false }),
});

/** Does today's window `id` open the Counter (under ?menus3, `on`)?  Its
 *  station { id, mode, bench }, or null: today's window opens as it did. */
export function counterStation(id, on) {
  if (!on || typeof id !== 'string' || !Object.prototype.hasOwnProperty.call(COUNTER_STATIONS, id)) return null;
  const s = COUNTER_STATIONS[id];
  return s.built ? Object.freeze({ id, mode: s.mode, bench: s.bench }) : null;
}

/* ── the Blacksmith's tabs, in today's order ── */
export const SMITH_TABS = Object.freeze(['smelt', 'forge', 'armor', 'upgrade', 'amulet', 'salvage']);
/** The tabs a worker settles (`caps` its state_sync caps, `R` the character),
 *  as SmithyPanel.jsx draws them: Forge always; the rest on their caps. */
export function smithTabs(caps, R) {
  const c = caps || {};
  return SMITH_TABS.filter((t) => {
    if (t === 'smelt') return !!c.smelting;
    if (t === 'forge') return true;
    if (t === 'armor') return !!c.armorforge;
    if (t === 'upgrade') return !!(c.harden || c.gemExtract);
    if (t === 'amulet') return !!c.amuletForge && amuletTabShown(R);
    if (t === 'salvage') return !!c.salvage;
    return false;
  });
}
/** The tab to show: the one asked for if it is listed, else the first. */
export function smithTab(want, tabs) {
  const list = Array.isArray(tabs) && tabs.length ? tabs : ['forge'];
  return list.indexOf(want) >= 0 ? want : list[0];
}

/* ── the queue ── */
/* the smelter's own request takes a count, at most the worker's SMELT.MAX_PER_REQUEST
   (server/src/smelting.js: the suite reads it there); a bigger number is sent in pieces */
export const SMELT_PER_REQUEST = 50;
export const MAKE_WAIT_MS = 3500;   /* SmithyPanel's: 3.5 s of silence is a refusal (the worker drops a request it will not settle) */

/** The sends for `n` makes when one request holds `per` (1: one a send). */
export function makePlan(n, per) {
  const total = Math.max(0, Math.floor(Number(n) || 0));
  const p = Math.max(1, Math.floor(Number(per) || 1));
  const out = [];
  for (let left = total; left > 0; left -= p) out.push(Math.min(p, left));
  return Object.freeze(out);
}

const IDLE = Object.freeze({ on: false, plan: Object.freeze([]), at: 0, made: 0, waiting: false, before: null, stop: null });
export function makeIdle() { return IDLE; }

/** Start: `plan` from makePlan.  Nothing is sent yet. */
export function makeBegin(plan) {
  const p = Array.isArray(plan) ? plan.filter((x) => x > 0) : [];
  if (!p.length) return IDLE;
  return Object.freeze({ on: true, plan: Object.freeze(p.slice()), at: 0, made: 0, waiting: false, before: null, stop: null });
}

/** The next send: { q, count } (count null: nothing to send -- done or idle,
 *  or one already in flight).  `sig` the character's reading before it. */
export function makeSend(q, sig) {
  if (!q || !q.on || q.waiting || q.at >= q.plan.length) return { q: q || IDLE, count: null };
  return { q: Object.freeze(Object.assign({}, q, { waiting: true, before: sig })), count: q.plan[q.at] };
}

/** A new reading of the character: 'landed' (in `then`: the send changed it, the next
 *  may go, or 'done'), or 'wait'. */
export function makeRead(q, sig) {
  if (!q || !q.on || !q.waiting) return { q: q || IDLE, then: 'wait' };
  if (sig === q.before) return { q, then: 'wait' };
  const made = q.made + q.plan[q.at];
  const at = q.at + 1;
  const done = at >= q.plan.length;
  return { q: Object.freeze(Object.assign({}, q, { at, made, waiting: false, before: null, on: !done, stop: done ? 'done' : null })), then: done ? 'done' : 'landed' };
}

/** The silence ran out: refused, the queue stops; what landed stays. */
export function makeRefused(q) {
  if (!q || !q.on) return q || IDLE;
  return Object.freeze(Object.assign({}, q, { on: false, waiting: false, stop: 'refused' }));
}

/** Leaving the page: nothing more is sent (the send in flight is the worker's). */
export function makeCut(q) {
  if (!q || !q.on) return q || IDLE;
  return Object.freeze(Object.assign({}, q, { on: false, waiting: false, stop: 'cut' }));
}
