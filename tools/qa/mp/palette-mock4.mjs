/* THIRTEEN PASTELS: CAN THEY ACTUALLY BE TOLD APART? (v2.3.2596)
 *
 * Owner: "I'm interested to see how each cell being colored by meaning would
 * look.  Like power is always white, range is always purple ... pastel-like
 * colors."  Eight are fixed by the owner; five are mine to pick.
 *
 * This answers the question BEFORE any UI is built, because the answer decides
 * whether the feature is viable at all.  Method is this repo's own, from
 * mp-monsterplate: CIEDE2000 with a floor of 12 between any two things a player
 * must distinguish, measured on the colour as RENDERED, not as authored.
 *
 * The rendering part matters more than the palette here.  This UI is DARK --
 * the cell is #16262C with near-white text -- so a pastel cannot be a fill
 * without inverting the whole screen's contrast.  It has to be a tint
 * composited over that dark cell, and `over()` in _colour.mjs says what that
 * costs in as many words: "two colours drawn at the same alpha over the same
 * background keep exactly `alpha` of the distance between them".  Tint at 15%
 * and you keep ~15% of the separation you designed.
 *
 *   node tools/qa/mp/palette-mock4.mjs
 */
import * as C from './_colour.mjs';

const CELL_BG = '#16262C';        /* COL.wellSoft — the quiet cell */
const TEXT = '#F4F0E7';           /* COL.text */
const TEXT2 = '#B6C1BE';          /* COL.text2 — the stat title */
const DE_FLOOR = 12;              /* mp-monsterplate's floor, same reason */

/* The owner's eight, as pastels. */
const FIXED = {
  dmg:   ['Power',       '#F4F0E7'],  /* white  */
  range: ['Range',       '#C9B6E4'],  /* purple */
  hp:    ['HP',          '#F2A6A6'],  /* red    */
  mana:  ['MP',          '#A6C8F0'],  /* blue   */
  stam:  ['Energy',      '#A9DDB4'],  /* green  */
  def:   ['Defense',     '#C3CBCB'],  /* gray   */
  dodge: ['Dodge',       '#F0DC9A'],  /* yellow */
  eres:  ['Elem Resist', '#F2B0D8'],  /* pink   */
};

/* My five, placed in the hue gaps the owner's eight leave open:
   red 0 · yellow 50 · green 140 · blue 215 · purple 270 · pink 330. */
const MINE = {
  luck:    ['Luck',       '#F5C39A'],  /* orange  ~28  (red -> yellow gap)    */
  aspd:    ['Speed',      '#9FE0DA'],  /* cyan    ~175 (green -> blue gap)    */
  special: ['Special',    '#AFB4EE'],  /* indigo  ~240 (blue -> purple gap)   */
  elem:    ['Elemental',  '#E3A9EE'],  /* orchid  ~295 (purple -> pink gap)   */
  move:    ['Move Speed', '#CFE59A'],  /* lime    ~78  (yellow -> green gap)  */
};

const ALL = { ...FIXED, ...MINE };
const KEYS = Object.keys(ALL);
const isFixed = (k) => k in FIXED;

function report(alpha) {
  const shown = {};
  for (const k of KEYS) shown[k] = alpha >= 1 ? C.rgb(ALL[k][1]) : C.over(ALL[k][1], alpha, CELL_BG);
  const pairs = [];
  for (let i = 0; i < KEYS.length; i++) {
    for (let j = i + 1; j < KEYS.length; j++) {
      const a = KEYS[i], b = KEYS[j];
      pairs.push({ a, b, d: C.deltaE00(shown[a], shown[b]),
        both: isFixed(a) && isFixed(b), mine: !isFixed(a) || !isFixed(b) });
    }
  }
  pairs.sort((x, y) => x.d - y.d);
  const under = pairs.filter((p) => p.d < DE_FLOOR);
  const ownerUnder = under.filter((p) => p.both);
  console.log(`\n═══ tint alpha ${alpha >= 1 ? '1.00 (pastel as a solid fill)' : alpha.toFixed(2) + ' (composited over ' + CELL_BG + ')'} ═══`);
  console.log(`  pairs under ΔE00 ${DE_FLOOR}: ${under.length} of ${pairs.length}` +
    `   (of those, ${ownerUnder.length} are between two OWNER-FIXED colours)`);
  console.log(`  worst 8:`);
  pairs.slice(0, 8).forEach((p) => console.log(
    `    ${(ALL[p.a][0] + ' / ' + ALL[p.b][0]).padEnd(26)} ΔE00 ${p.d.toFixed(1).padStart(5)}` +
    (p.both ? '   <- both owner-fixed' : '')));
  /* Text legibility on the tinted cell — the obvious way a pastel goes wrong. */
  let worstC = 99, worstK = '';
  for (const k of KEYS) {
    const c = C.contrast(TEXT2, shown[k]);
    if (c < worstC) { worstC = c; worstK = ALL[k][0]; }
  }
  console.log(`  worst title contrast (${TEXT2} on the tinted cell): ${worstC.toFixed(2)}:1 on ${worstK}` +
    `   ${worstC >= 4.5 ? 'OK (AA body)' : worstC >= 3 ? 'AA large only' : 'FAILS'}`);
  return { alpha, under: under.length, ownerUnder: ownerUnder.length, worst: pairs[0], worstC };
}

console.log('THIRTEEN STAT COLOURS — separation as actually rendered');
console.log('floor: CIEDE2000 >= ' + DE_FLOOR + ' (mp-monsterplate precedent)');
const rows = [1, 0.5, 0.35, 0.25, 0.15].map(report);

console.log('\n═══ SUMMARY ═══');
console.log('  alpha   pairs<12   owner-fixed pairs<12   worst pair');
for (const r of rows) {
  console.log(`  ${String(r.alpha).padEnd(7)} ${String(r.under).padStart(3)}/78      ${String(r.ownerUnder).padStart(3)}` +
    `                  ${ALL[r.worst.a][0]}/${ALL[r.worst.b][0]} ${r.worst.d.toFixed(1)}`);
}
