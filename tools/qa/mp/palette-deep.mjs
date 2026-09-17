/* A DEEP PALETTE, NOW THAT PASTEL IS NOT REQUIRED (v2.3.2599).
 *
 * Owner: "Maybe pastel isn't the right color scheme.  I just want a color to be
 * associated with a certain skill."  So the requirement is IDENTITY — one
 * colour reliably means one stat — and "pastel" was a guess at how to get it.
 * The eight hues they named stay; lightness, saturation and rendering are free.
 *
 * That freedom is worth a lot on this panel, because every problem the pastel
 * fill created came from it being LIGHT:
 *   - labels had to flip dark, against a UI that is light-on-dark everywhere;
 *   - Power's white tile was the brightest object on the screen (2.47x spread);
 *   - Defense's gray read as DISABLED;
 *   - and the gold [+] measured 1.10:1 to 1.88:1 against the fills — under the
 *     floor on all thirteen.
 * A DEEP fill fixes all four at once: the text stays light like the rest of the
 * panel, nothing out-glares anything, gray becomes a deliberate slate, and the
 * gold [+] sits on something dark enough to hold it.
 *
 * This searches, per hue, for the deep colour that maximises the palette's worst
 * pair subject to three hard floors:
 *     light text (#F4F0E7) on the fill  >= 4.5   (AA body)
 *     gold [+]   (#D8AA58) on the fill  >= 3.0   (AA large)
 *     CIEDE2000 between any two fills   >= 12    (mp-monsterplate's floor)
 *
 *   node tools/qa/mp/palette-deep.mjs
 */
import * as C from './_colour.mjs';

const TEXT = '#F4F0E7', GOLD = '#D8AA58';
const DE_FLOOR = 12, TEXT_AA = 4.5, GOLD_AA = 3.0;

/* The owner's eight by hue, plus my five in the gaps they leave.  `h: null` is
   achromatic — Power's "white" and Defense's "gray" become a warm stone and a
   cool slate, which is the same identity carried at a depth that works. */
const HUES = [
  ['Power',        null, 'warm'],   ['Range',        280, null],
  ['Max HP',         2, null],      ['Max Mana',     215, null],
  ['Stamina',      140, null],      ['Defense',      210, 'muted'],
  ['Dodge',         48, null],      ['Resist',       325, null],
  ['Speed',        188, null],      ['Luck',          25, null],
  ['Element',      258, null],      ['Special',      165, null],
  ['Speed (shared)', 95, null],
];

const hex = (r, g, b) => '#' + [r, g, b].map((v) =>
  Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
function hsl(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s, hp = ((h % 360) + 360) % 360 / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r, g, b] = hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x]
    : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x];
  const m = l - c / 2;
  return hex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

/* Candidates per slot: the named hue give or take a little, deep lightness,
   and — for the two achromatic ones — a low saturation at a warm or cool hue so
   they still read as stone and slate rather than as a colour. */
function candidates([name, h, kind]) {
  const out = [];
  if (h === null) {
    const hh = kind === 'warm' ? [38, 42, 46] : [210, 215];
    for (const x of hh) for (const s of [0.06, 0.10, 0.14]) for (const l of [0.34, 0.38, 0.42, 0.46]) out.push(hsl(x, s, l));
  } else if (kind === 'muted') {
    for (const x of [h - 8, h, h + 8]) for (const s of [0.14, 0.20, 0.26]) for (const l of [0.30, 0.34, 0.38]) out.push(hsl(x, s, l));
  } else {
    for (const x of [h - 10, h - 5, h, h + 5, h + 10]) for (const s of [0.34, 0.44, 0.54, 0.64]) for (const l of [0.26, 0.30, 0.34, 0.38]) out.push(hsl(x, s, l));
  }
  return out.filter((c) => C.contrast(TEXT, c) >= TEXT_AA && C.contrast(GOLD, c) >= GOLD_AA);
}

const slots = HUES.map((h) => ({ name: h[0], cand: candidates(h) }));
for (const s of slots) if (!s.cand.length) console.log(`  !! ${s.name}: no candidate clears the contrast floors`);

/* Greedy by most-constrained slot, then local search on the worst pair. */
const pick = {};
for (const s of [...slots].sort((a, b) => a.cand.length - b.cand.length)) {
  let best = s.cand[0], bestD = -1;
  for (const c of s.cand) {
    let d = Infinity;
    for (const k of Object.keys(pick)) d = Math.min(d, C.deltaE00(c, pick[k]));
    if (d > bestD) { bestD = d; best = c; }
  }
  pick[s.name] = best;
}
const worstOf = (p) => {
  const k = Object.keys(p); let m = Infinity, pa = '';
  for (let i = 0; i < k.length; i++) for (let j = i + 1; j < k.length; j++) {
    const d = C.deltaE00(p[k[i]], p[k[j]]);
    if (d < m) { m = d; pa = `${k[i]}/${k[j]}`; }
  }
  return { m, pa };
};
for (let pass = 0; pass < 8; pass++) {
  let moved = false;
  for (const s of slots) {
    let best = pick[s.name], bestScore = worstOf(pick).m;
    for (const c of s.cand) {
      const trial = { ...pick, [s.name]: c };
      const sc = worstOf(trial).m;
      if (sc > bestScore + 1e-9) { bestScore = sc; best = c; moved = true; }
    }
    pick[s.name] = best;
  }
  if (!moved) break;
}

console.log('DEEP PALETTE — searched against three floors\n');
console.log('stat              fill      light text   gold [+]   lum');
for (const s of slots) {
  const c = pick[s.name];
  console.log(`  ${s.name.padEnd(16)} ${c}  ${C.contrast(TEXT, c).toFixed(2).padStart(6)}:1   ${C.contrast(GOLD, c).toFixed(2).padStart(5)}:1   ${C.luminance(c).toFixed(3)}`);
}
const w = worstOf(pick);
const lums = slots.map((s) => C.luminance(pick[s.name]));
console.log(`\n  worst pair: ${w.pa} ${w.m.toFixed(1)}  (floor ${DE_FLOOR})`);
console.log(`  luminance spread: ${(Math.max(...lums) / Math.min(...lums)).toFixed(2)}x  (pastel fill was 2.47x)`);
const under = [];
const ks = Object.keys(pick);
for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) {
  const d = C.deltaE00(pick[ks[i]], pick[ks[j]]);
  if (d < DE_FLOOR) under.push(`${ks[i]}/${ks[j]} ${d.toFixed(1)}`);
}
console.log(`  pairs under the floor: ${under.length}${under.length ? ' -> ' + under.join(', ') : ''}`);
console.log('\n  as a table:');
for (const s of slots) console.log(`    ${s.name.padEnd(16)} ${pick[s.name]}`);
