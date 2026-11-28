/* ═══ v2.3.6688: THE ONE COMPARISON, IN THE TRANSFORMATION FORM (card UI2-gear PR 2, the build's step 5) ═══
 *
 * The owner, 2026-11-25, with the master specification (part 3.1): "Current
 * and comparison values, then signed change (percentage where meaningful)";
 * "Label both subjects correctly, e.g. You vs Other Player, not 'If equipped'
 * for a person"; "Handle zero baselines, no existing equipment, unchanged
 * values, incomparable metrics, units and lower-is-better statistics without
 * misleading percentages/colors"; part 5.1: "Compare final outcome, not
 * merely raw item modifiers ... Do not label items universally better/worse
 * based on one metric alone ... Use text and directional cues as well as
 * color."
 *
 * Two pieces, and nothing else decides a comparison's words:
 *   compareRow(def, a, b)   one number before and after: each value, the
 *                           signed change, a percentage ONLY from a baseline
 *                           that is a real number above zero and only for a
 *                           metric whose percentage means something (never a
 *                           percentage of a percentage), which way is good
 *                           (an attack's seconds: LOWER), an arrow and a word
 *                           beside the colour; unchanged reads "No change";
 *                           nothing on the "now" side reads "Nothing worn"
 *                           and the plain value, no change, no percentage;
 *   compareSet(input)       the headline and at most two supporting rows for
 *                           an item's kind (a weapon leads with DPS, armour
 *                           with "Damage cut": effective health is the
 *                           owner's question, F1, and no number of it ships),
 *                           the two subjects by MODE ('equip': Now / If
 *                           equipped; 'versus': You / their name), a
 *                           plain-words tradeoff where one number went each
 *                           way, and a restricted item's reason.  NO verdict:
 *                           nothing here says an item is better or worse.
 *
 * The numbers come in already worked out on YOUR character
 * (src/game/equipProject.js); this file does no game arithmetic.  The rows
 * of dash/gearStats.js (compareRows, gainRows) stay for today's Gear under
 * `?ui2=0`.  Pure: words through say() only (node tests it:
 * tools/guards/compare.test.mjs). */
import { say } from '../game/say.js';   /* spelt by its folder (guards/say.test reads the path) */
import { SAY } from '../data/say/compare.js';

const round = (n, dec) => { const s = Math.pow(10, dec || 0); return Math.round(n * s) / s; };
const num = (n) => (typeof n === 'number' && Number.isFinite(n) ? n : null);
const fmt = (n, dec) => String(round(n, dec));

/** The metrics a comparison knows: its label, which way is good, its unit,
    its decimals, whether a percentage of it means anything, and the two
    words for a change (by whether it is good, never by its sign). */
export function metricDef(key) {
  switch (key) {
    case 'dps': return { key, label: say(SAY, 'compare.dps'), short: say(SAY, 'compare.dpsShort'), goodWay: 'higher', unit: '', dec: 1, pct: true, good: say(SAY, 'compare.moreDps'), bad: say(SAY, 'compare.lessDps') };
    case 'hit': return { key, label: say(SAY, 'compare.hit'), goodWay: 'higher', unit: '', dec: 1, pct: true, good: say(SAY, 'compare.strongerHits'), bad: say(SAY, 'compare.weakerHits') };
    case 'swing': return { key, label: say(SAY, 'compare.swing'), goodWay: 'lower', unit: 's', dec: 2, pct: true, good: say(SAY, 'compare.fasterAttacks'), bad: say(SAY, 'compare.slowerAttacks') };
    case 'cut': return { key, label: say(SAY, 'compare.cut'), goodWay: 'higher', unit: '%', dec: 1, pct: false, good: say(SAY, 'compare.moreCut'), bad: say(SAY, 'compare.lessCut') };
    case 'block': return { key, label: say(SAY, 'compare.block'), goodWay: 'higher', unit: '%', dec: 0, pct: false, good: say(SAY, 'compare.moreBlock'), bad: say(SAY, 'compare.lessBlock') };
    case 'def': return { key, label: say(SAY, 'compare.defence'), goodWay: 'higher', unit: '', dec: 1, pct: true, good: say(SAY, 'compare.moreDefence'), bad: say(SAY, 'compare.lessDefence') };
    case 'stamina': return { key, label: say(SAY, 'compare.stamina'), goodWay: 'higher', unit: '', dec: 0, pct: true, good: say(SAY, 'compare.moreStamina'), bad: say(SAY, 'compare.lessStamina') };
    default: return null;
  }
}

/** A value as the player reads it, with its unit. */
export function valueText(def, n) {
  if (num(n) == null) return '—';
  const v = fmt(n, def.dec);
  if (def.unit === 's') return say(SAY, 'compare.seconds', { n: v });
  if (def.unit === '%') return say(SAY, 'compare.percent', { n: v });
  return v;
}

/** The two subjects.  'equip': you now and you if you put it on; 'versus':
    you and another player (or a pet), by name: no "If equipped" for a
    person, since nothing changes state. */
export function compareSubjects(mode, name) {
  if (mode === 'versus') return { mode, a: say(SAY, 'compare.you'), b: say(SAY, 'compare.them', { name: String(name || '') }) };
  return { mode: 'equip', a: say(SAY, 'compare.now'), b: say(SAY, 'compare.ifEquipped') };
}

/**
 * One row.  `a` the number now (null: nothing worn there), `b` the number
 * compared (null: the item has no such number: no row).  Returns
 * { key, label, goodWay, a: { n, v }, b: { n, v }, change: { n, v, pct, dir,
 * good, arrow, words, say } } or null.
 *   dir    'up' | 'down' | 'same' | 'none' (nothing to compare against);
 *   good   1 (the good way for THIS metric), -1, or 0;
 *   v      the change as printed: the percentage where it means something,
 *          else the signed amount with its unit ('' with no baseline);
 *   say    the change in words ("25% more damage per second", "No change",
 *          "Nothing worn").
 */
export function compareRow(defOrKey, a, b) {
  const def = typeof defOrKey === 'string' ? metricDef(defOrKey) : defOrKey;
  if (!def) return null;
  const B = num(b);
  if (B == null) return null;
  const A = num(a);
  const bR = round(B, def.dec);
  /* v2.3.6845 (card UI4 PR 6): `dec` and `unit` ride on the row, so Gear's kit Comparison writes the numbers as
     valueText does (the same decimals, '%' and 's') */
  const row = { key: def.key, label: def.label, goodWay: def.goodWay, dec: def.dec, unit: def.unit || '', a: { n: A == null ? null : round(A, def.dec), v: A == null ? say(SAY, 'compare.nothingWorn') : valueText(def, A) }, b: { n: bR, v: valueText(def, B) } };
  if (A == null) {
    row.change = { n: null, v: '', pct: null, dir: 'none', good: 0, arrow: '', words: '', say: say(SAY, 'compare.nothingWorn') };
    return row;
  }
  const aR = round(A, def.dec);
  const d = round(bR - aR, def.dec);
  if (d === 0) {
    row.change = { n: 0, v: '', pct: null, dir: 'same', good: 0, arrow: '=', words: '', say: say(SAY, 'compare.noChange') };
    return row;
  }
  const dir = d > 0 ? 'up' : 'down';
  const good = (def.goodWay === 'lower' ? -1 : 1) * (d > 0 ? 1 : -1);
  /* a percentage only from a real baseline above zero, and only where one
     means something (a percent of a percent does not) */
  let pct = null;
  if (def.pct && aR > 0 && A > 0) {
    const p = Math.round(((B - A) / A) * 100);   /* from the numbers, not their rounding */
    if (p !== 0) pct = p;
  }
  const sign = d > 0 ? '+' : '−';
  const amount = sign + valueText(def, Math.abs(d));
  const words = good > 0 ? def.good : def.bad;
  const v = pct != null ? sign + Math.abs(pct) + '%' : amount;
  row.change = {
    n: d, v, pct, dir, good, arrow: d > 0 ? '▲' : '▼', words,
    say: pct != null ? say(SAY, 'compare.pctMore', { pct: Math.abs(pct), words }) : amount + ' ' + words,
  };
  return row;
}

/** Which numbers lead, and which support, for an item's kind. */
export const COMPARE_PLAN = Object.freeze({
  sword: Object.freeze({ head: 'dps', rows: Object.freeze(['hit', 'swing']) }),
  bow: Object.freeze({ head: 'dps', rows: Object.freeze(['hit', 'swing']) }),
  staff: Object.freeze({ head: 'dps', rows: Object.freeze(['hit', 'swing']) }),
  chest: Object.freeze({ head: 'cut', rows: Object.freeze([]) }),
  legs: Object.freeze({ head: 'cut', rows: Object.freeze([]) }),
  shield: Object.freeze({ head: 'block', rows: Object.freeze(['def', 'stamina']) }),
});

/** The tradeoff in plain words: only when one number went the good way and
    another the bad way ("Stronger hits, slower attacks"); else ''. */
export function tradeoffLine(rows) {
  const moved = (rows || []).filter((r) => r && r.change && r.change.good !== 0);
  if (!moved.some((r) => r.change.good > 0) || !moved.some((r) => r.change.good < 0)) return '';
  const w = moved.map((r) => r.change.words).filter(Boolean);
  const s = w.join(', ');
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

/**
 * The comparison for one item.  `input`:
 *   kind     'sword' | 'bow' | 'staff' | 'chest' | 'legs' | 'shield' (else: none);
 *   mode     'equip' (default) | 'versus';  name  the other subject's (versus);
 *   a, b     the two subjects' numbers ({ dps, hit, swing, cut, block, def,
 *            stamina }; equipProject's `now` and `then`), `a` null when
 *            nothing is worn there;
 *   restricted  the reason it cannot be worn ("Sword level 18, requires 25"), or '';
 *   hidden   the piece is a "?" (game/revealBag.js): no comparison, ever -- its numbers would give its grade away
 *            (v2.3.6688, the mends: today's card shows no number for one).
 * Returns { subjects, head, rows (at most two), tradeoff, restricted } or
 * null when the kind has nothing to compare.  No verdict field, by design.
 */
export function compareSet(input) {
  const i = input || {};
  const plan = Object.prototype.hasOwnProperty.call(COMPARE_PLAN, i.kind) ? COMPARE_PLAN[i.kind] : null;
  if (!plan || !i.b || i.hidden) return null;
  const A = i.a || null;
  const B = i.b;
  const head = compareRow(plan.head, A ? A[plan.head] : null, B[plan.head]);
  if (!head) return null;
  const rows = [];
  for (const k of plan.rows) {
    const r = compareRow(k, A ? A[k] : null, B[k]);
    if (r) rows.push(r);
  }
  const support = rows.slice(0, 2);
  return Object.freeze({
    subjects: compareSubjects(i.mode, i.name),
    head,
    rows: Object.freeze(support),
    tradeoff: tradeoffLine([head, ...support]),
    restricted: i.restricted ? String(i.restricted) : '',
  });
}
