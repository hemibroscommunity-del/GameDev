/* THE BEST FIVE FREE COLOURS, SEARCHED RATHER THAN GUESSED (v2.3.2596).
 *
 * Eight of the thirteen stat colours are the owner's and fixed.  Five are mine.
 * Picking them by eye is how Range/Special ended up 8.5 apart on a floor of 12,
 * so they are searched instead: a grid of pastel candidates, scored by the
 * WORST pair in the whole thirteen (maximin), fixed colours included.
 *
 *   node tools/qa/mp/palette-opt.mjs
 */
import * as C from './_colour.mjs';

const DE_FLOOR = 12;
const FIXED = {
  dmg:   ['Power',       '#F4F0E7'], range: ['Range',       '#C9B6E4'],
  hp:    ['HP',          '#F2A6A6'], mana:  ['MP',          '#A6C8F0'],
  stam:  ['Energy',      '#A9DDB4'], def:   ['Defense',     '#C3CBCB'],
  dodge: ['Dodge',       '#F0DC9A'], eres:  ['Elem Resist', '#F2B0D8'],
};
const FREE = ['aspd', 'luck', 'elem', 'special', 'move'];
const FREE_LABEL = { aspd: 'Speed', luck: 'Luck', elem: 'Elemental', special: 'Special', move: 'Move Speed' };

const hex = (r, g, b) => '#' + [r, g, b].map((v) =>
  Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('').toUpperCase();

/* HSL -> RGB, so the candidate grid can be swept in hue at a pastel lightness. */
function hsl(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s, hp = (h % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r, g, b] = hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x]
    : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x];
  const m = l - c / 2;
  return hex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

/* Pastel candidates: light, low-to-mid chroma — the owner's word, kept honest. */
const CAND = [];
for (let h = 0; h < 360; h += 4) {
  for (const l of [0.76, 0.81, 0.86]) {
    for (const s of [0.40, 0.55, 0.70]) CAND.push(hsl(h, s, l));
  }
}

const fixedVals = Object.values(FIXED).map((v) => v[1]);
const fixedLbl = Object.values(FIXED).map((v) => v[0]);

/* Score an assignment by its worst pair across all thirteen. */
function minPair(list) {
  let m = Infinity, pa = '', pb = '';
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const d = C.deltaE00(list[i][1], list[j][1]);
      if (d < m) { m = d; pa = list[i][0]; pb = list[j][0]; }
    }
  }
  return { m, pa, pb };
}

/* Greedy maximin seed: repeatedly take the candidate whose nearest neighbour
   among everything already chosen is furthest away. */
let chosen = [];
for (let n = 0; n < FREE.length; n++) {
  let best = null, bestD = -1;
  for (const c of CAND) {
    let d = Infinity;
    for (const f of fixedVals) d = Math.min(d, C.deltaE00(c, f));
    for (const c2 of chosen) d = Math.min(d, C.deltaE00(c, c2));
    if (d > bestD) { bestD = d; best = c; }
  }
  chosen.push(best);
}
/* Local refinement: try replacing each pick with every candidate, keep any swap
   that raises the worst pair. */
const score = (arr) => minPair(fixedLbl.map((l, i) => [l, fixedVals[i]])
  .concat(arr.map((c, i) => [FREE_LABEL[FREE[i]], c]))).m;
for (let pass = 0; pass < 6; pass++) {
  let moved = false;
  for (let i = 0; i < chosen.length; i++) {
    let bestC = chosen[i], bestS = score(chosen);
    for (const c of CAND) {
      const trial = chosen.slice(); trial[i] = c;
      const s = score(trial);
      if (s > bestS + 1e-9) { bestS = s; bestC = c; moved = true; }
    }
    chosen[i] = bestC;
  }
  if (!moved) break;
}

const all = fixedLbl.map((l, i) => [l, fixedVals[i]])
  .concat(chosen.map((c, i) => [FREE_LABEL[FREE[i]], c]));
const res = minPair(all);

console.log('OPTIMISED FREE FIVE (searched, pastel grid, maximin)\n');
FREE.forEach((k, i) => console.log(`  ${FREE_LABEL[k].padEnd(12)} ${chosen[i]}`));
console.log(`\n  worst pair across all thirteen: ${res.pa} / ${res.pb}  ΔE00 ${res.m.toFixed(1)}  (floor ${DE_FLOOR})`);

const pairs = [];
for (let i = 0; i < all.length; i++) {
  for (let j = i + 1; j < all.length; j++) {
    pairs.push({ a: all[i][0], b: all[j][0], d: C.deltaE00(all[i][1], all[j][1]),
      both: fixedLbl.includes(all[i][0]) && fixedLbl.includes(all[j][0]) });
  }
}
pairs.sort((x, y) => x.d - y.d);
const under = pairs.filter((p) => p.d < DE_FLOOR);
console.log(`  pairs under floor: ${under.length} of ${pairs.length}`);
under.forEach((p) => console.log(`    ${(p.a + ' / ' + p.b).padEnd(26)} ΔE00 ${p.d.toFixed(1)}` +
  (p.both ? '   <- BOTH OWNER-FIXED, not mine to move' : '')));
