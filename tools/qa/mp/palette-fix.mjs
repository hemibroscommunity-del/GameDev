/* THE TWO COLLISIONS THAT ARE THE OWNER'S OWN (v2.3.2596).
 *
 * palette-opt.mjs picks the five free stat colours by search, and with those in
 * place exactly two of the 78 pairs still fall under CIEDE2000 12 — and BOTH are
 * between colours the OWNER fixed, so neither is mine to quietly re-tint:
 *
 *     Power (white) / Defense (gray)        10.8
 *     Range (purple) / Elem Resist (pink)   11.6
 *
 * This asks what it would take to clear them: for each of the four colours
 * involved, the nearest replacement that lifts the whole palette over the floor
 * — or, when there is none, how close that colour can get and which OTHER pair
 * is holding the ceiling down. The point is to hand the owner a number, not to
 * change their palette behind them.
 *
 *   node tools/qa/mp/palette-fix.mjs
 *
 * NOTE ON SCOPE: this searches ONE colour at a time. A joint search over two
 * colours is 4500^2 candidate pairs against a 78-pair score and does not finish
 * — an earlier draft of this file had exactly that loop and timed out at 200s
 * (exit 124). If the two-colour question needs answering, it needs a different
 * method (constraint propagation or simulated annealing), not a bigger loop.
 */
import * as C from './_colour.mjs';

const DE_FLOOR = 12;
const P = {
  Power: '#F4F0E7', Range: '#C9B6E4', HP: '#F2A6A6', MP: '#A6C8F0',
  Energy: '#A9DDB4', Defense: '#C3CBCB', Dodge: '#F0DC9A', 'Elem Resist': '#F2B0D8',
  Speed: '#97E7ED', Luck: '#EDB997', Elemental: '#9D97ED', Special: '#EACDD1', 'Move Speed': '#D0ED97',
};

const hex = (r, g, b) => '#' + [r, g, b].map((v) =>
  Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
function hsl(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s, hp = (h % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r, g, b] = hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x]
    : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x];
  const m = l - c / 2;
  return hex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}
const CAND = [];
for (let h = 0; h < 360; h += 2) for (const l of [0.70, 0.74, 0.78, 0.82, 0.86])
  for (const s of [0.10, 0.25, 0.40, 0.55, 0.70]) CAND.push(hsl(h, s, l));

const worstOf = (pal) => {
  const k = Object.keys(pal); let m = Infinity, pa = '', pb = '';
  for (let i = 0; i < k.length; i++) for (let j = i + 1; j < k.length; j++) {
    const d = C.deltaE00(pal[k[i]], pal[k[j]]);
    if (d < m) { m = d; pa = k[i]; pb = k[j]; }
  }
  return { m, pa, pb };
};

/* ═══ WHY THIS IS NOT worstOf() CALLED IN A LOOP ═══
   Swapping ONE colour cannot change the distance between any of the other
   twelve, so recomputing all 78 pairs per candidate repeats the same Lab
   conversions 4500 times over and the search stops finishing. The worst pair
   among the UNCHANGED twelve is a constant for a given slot: compute it once,
   then each candidate costs twelve comparisons instead of seventy-eight.
   Same answer, seconds instead of minutes. */
const holding = (pal, name) => {
  const k = Object.keys(pal).filter((x) => x !== name);
  let m = Infinity, pa = '', pb = '';
  for (let i = 0; i < k.length; i++) for (let j = i + 1; j < k.length; j++) {
    const d = C.deltaE00(pal[k[i]], pal[k[j]]);
    if (d < m) { m = d; pa = k[i]; pb = k[j]; }
  }
  return { ceiling: { m, pa, pb }, others: k.map((x) => [x, pal[x]]) };
};
const worstWith = (ctx, c) => {
  let m = ctx.ceiling.m;
  for (const [, v] of ctx.others) { const d = C.deltaE00(c, v); if (d < m) m = d; }
  return m;
};

const now = worstOf(P);
console.log('THE TWO OWNER-FIXED COLLISIONS — what it would take to clear them');
console.log(`floor: CIEDE2000 >= ${DE_FLOOR}\n`);
console.log(`  Power / Defense        ${C.deltaE00(P.Power, P.Defense).toFixed(1)}`);
console.log(`  Range / Elem Resist    ${C.deltaE00(P.Range, P['Elem Resist']).toFixed(1)}`);
console.log(`  worst pair overall:    ${now.pa} / ${now.pb}  ${now.m.toFixed(1)}\n`);

console.log('Moving ONE colour, nearest replacement that clears the whole palette:');
for (const name of ['Defense', 'Power', 'Elem Resist', 'Range']) {
  const ctx = holding(P, name);
  let best = null, bestMove = Infinity, bestWorst = 0;
  let near = null, nearWorst = -1;
  for (const c of CAND) {
    const w = worstWith(ctx, c);
    if (w > nearWorst) { nearWorst = w; near = c; }
    if (w < DE_FLOOR) continue;
    const move = C.deltaE00(c, P[name]);
    if (move < bestMove) { bestMove = move; best = c; bestWorst = w; }
  }
  if (best) {
    console.log(`  ${name.padEnd(12)} ${P[name]} -> ${best}   moves ΔE00 ${bestMove.toFixed(1)}` +
      ` from the owner's pick, lifts the worst pair to ${bestWorst.toFixed(1)}   CLEARS`);
  } else {
    console.log(`  ${name.padEnd(12)} cannot clear the floor alone.` +
      ` Best reachable ${nearWorst.toFixed(1)} (at ${near}).` +
      ` Ceiling held by ${ctx.ceiling.pa}/${ctx.ceiling.pb} = ${ctx.ceiling.m.toFixed(1)}.`);
  }
}
