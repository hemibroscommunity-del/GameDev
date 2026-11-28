/* ═══ v2.3.6840: THE RULES OF THE KIT'S NEW PIECES (card UI4 PR 1, the owner's V17) ═══
 * What the Comparison and the Stepper decide, as plain functions node tests
 * (tools/guards/ui4-roles.test.mjs); the pieces in src/ui/kit/ only draw it.
 *
 * The Comparison (V17:49): "Positive/negative deltas use signed text and
 * color; never color alone."  So the difference is ALWAYS written with its
 * sign, and a word says which way is better: the colour only repeats it.
 * V17:7 "Preserve exact large numbers": a whole number is written whole.
 *
 * The Stepper: the trade window's (TradeWindowPanel.jsx, v2.3.1752, "A
 * STEPPER, NOT A GUESSING GAME"): one down, one up, never past the ends, each
 * end's button off there.  No imports. */

const MINUS = '−';   /* the minus sign, not a hyphen */

function fmtNum(n, digits) {
  if (!Number.isFinite(n)) return '';
  if (Number.isInteger(n) && digits == null) return String(n);
  const d = digits == null ? 1 : digits;
  return String(Number(n.toFixed(d)));
}

/**
 * The difference from `before` to `after`.
 *   lower   true when less is better (a cooldown, a cost)
 *   digits  decimals for a number that is not whole (default 1)
 * Returns { dir: 'up' | 'down' | 'same' | 'none', text, good: true | false | null }
 *   text  the signed difference ('+12', '−3', '0'); '' when there is nothing to compare
 *   good  better (true), worse (false), neither (null)
 */
export function ui2Delta(before, after, opts) {
  const o = opts || {};
  const a = Number(before);
  const b = Number(after);
  if (before == null || after == null || !Number.isFinite(a) || !Number.isFinite(b)) return { dir: 'none', text: '', good: null };
  const d = b - a;
  const shown = fmtNum(Math.abs(d), o.digits);
  if (d === 0 || shown === '0') return { dir: 'same', text: '0', good: null };
  const up = d > 0;
  return { dir: up ? 'up' : 'down', text: (up ? '+' : MINUS) + shown, good: o.lower ? !up : up };
}

/** a number as the Comparison writes it (exact when whole) */
export function ui2Num(n, digits) {
  return fmtNum(Number(n), digits);
}

/** the Stepper's next value: `by` steps from `value`, held between min and max, a whole number */
export function ui2Step(value, by, opts) {
  const o = opts || {};
  const min = Number.isFinite(o.min) ? o.min : 0;
  const max = Number.isFinite(o.max) ? o.max : Infinity;
  const step = Number.isFinite(o.step) && o.step > 0 ? o.step : 1;
  const v = Number.isFinite(Number(value)) ? Math.round(Number(value)) : min;
  const next = v + (Number(by) || 0) * step;
  return Math.max(min, Math.min(max, next));
}

/** which of the Stepper's two buttons can be pressed now */
export function ui2StepEnds(value, opts) {
  const o = opts || {};
  const min = Number.isFinite(o.min) ? o.min : 0;
  const max = Number.isFinite(o.max) ? o.max : Infinity;
  const v = Number(value) || 0;
  return { less: v > min, more: v < max };
}
