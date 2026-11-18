/* ═══ v2.3.6001: THE USAGE METER'S WORDS AND SUMS (card CS PR 2) ═══
 *
 * The owner, 2026-11-17: "I think turn all of them on then we monitor usage
 * cost".  The worker counts, in memory only, the rows it writes and reads
 * and the messages it sends (server/src/usagemeter.js; GET /dev/usage); the
 * Test panel's "Usage" box (src/ui/panels/UsageMeter.jsx) shows them, and
 * this file is what it computes, with no imports so node can test it
 * (tools/guards/usage-meter-page.test.mjs).
 *
 * THE ESTIMATE is of rows WRITTEN only, against Cloudflare's included usage
 * as the card gives it: the free plan about 100,000 rows written a day, the
 * paid plan 50 million a month.  Today's count is spread over the part of
 * the UTC day it covers (since the room started, if that was today: a
 * deploy starts the count again), so a reading early in the day is rough,
 * and says so.  Cloudflare's dashboard is the truth (docs/OPERATIONS.md,
 * "Watching the cost").
 */

export const USAGE_PLANS = Object.freeze({
  FREE_WRITES_DAY: 100000,
  PAID_WRITES_MONTH: 50000000,
  DAYS_A_MONTH: 30,
  DAY_MS: 86400000,
  MIN_SPAN_MS: 10 * 60000,   /* a projection from under 10 minutes is not made */
});

/* the six switches turned on by card CS PR 1, in the panel's order, each
   with what its rows are, in plain words */
export const USAGE_SWITCHES = Object.freeze([
  Object.freeze({ name: 'reqstamp', what: 'a stamp a shop or market request, so a repeat is answered once' }),
  Object.freeze({ name: 'xferescrow', what: 'a ledger row a duel pot, losing stake, market or Auction House sale' }),
  Object.freeze({ name: 'resetbook', what: 'a row a character restart, for the world\'s sum' }),
  Object.freeze({ name: 'seathold', what: 'who is in, at most every 15 seconds while it changes' }),
  Object.freeze({ name: 'fullsnap', what: 'reads only: the vault and pets in each daily copy' }),
  Object.freeze({ name: 'freezedevice', what: 'reads only: a new character\'s phone checked while someone is frozen' }),
]);

/** The estimate from a /dev/usage answer, or null when it is not one. */
export function usageEstimate(u) {
  if (!u || u.ok !== true || !u.today || typeof u.now !== 'number' || typeof u.dayEnds !== 'number') return null;
  const P = USAGE_PLANS;
  const dayStart = u.dayEnds - P.DAY_MS;
  const from = Math.max(dayStart, typeof u.today.since === 'number' ? u.today.since : dayStart);
  const span = Math.max(0, u.now - from);
  const writes = Number(u.today.writes) || 0;
  const whole = from <= dayStart;
  const projected = span >= P.MIN_SPAN_MS ? Math.round(writes * (P.DAY_MS / span)) : null;
  return {
    writes, span, whole, from, projected,
    freeShare: projected === null ? null : projected / P.FREE_WRITES_DAY,
    paidShare: projected === null ? null : (projected * P.DAYS_A_MONTH) / P.PAID_WRITES_MONTH,
  };
}

/** A list of kinds, biggest first: [[kind, n], ...], at most `n`. */
export function usageTop(byKind, n) {
  if (!byKind || typeof byKind !== 'object') return [];
  return Object.keys(byKind).map((k) => [k, Number(byKind[k]) || 0]).filter((e) => e[1] > 0)
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, n);
}

const pct = (x) => (x < 0.001 && x > 0 ? 'under 0.1%' : Math.round(x * 1000) / 10 + '%');
const num = (n) => Math.round(n).toLocaleString('en-US');
const hm = (ms) => { const d = new Date(ms); return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0') + ' UTC'; };

/** The estimate in plain words, one sentence each. */
export function usageWords(u) {
  const e = usageEstimate(u);
  if (!e) return ['No usage counted yet.'];
  const out = [];
  out.push(num(e.writes) + ' rows written today, counted since ' + (e.whole ? 'the day began (00:00 UTC)' : hm(e.from) + ' (the server started then)') + '.');
  if (e.projected === null) out.push('Too early to estimate the whole day: try again in a few minutes.');
  else {
    out.push('At this pace, about ' + num(e.projected) + ' rows a day.');
    out.push('Free plan: ' + pct(e.freeShare) + ' of its about ' + num(USAGE_PLANS.FREE_WRITES_DAY) + ' rows written a day.');
    out.push('Paid plan: ' + pct(e.paidShare) + ' of its ' + num(USAGE_PLANS.PAID_WRITES_MONTH) + ' rows written a month.');
  }
  return out;
}
