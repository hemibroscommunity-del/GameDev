/* THIRTEEN PASTELS AS FULL CELL BACKGROUNDS (v2.3.2598).
 *
 * Owner: "Don't make just the edge of the cell the different colors make the
 * whole background those different colors for each stat."
 *
 * An OPAQUE fill is a different problem from the tint measured in
 * palette-mock4.mjs.  That one collapsed because compositing at low alpha keeps
 * only `alpha` of the distance between two colours; at alpha 1 the separation is
 * whatever the palette has, which is fine.  What a full fill breaks instead is
 * TEXT: the panel is dark with near-white labels, and near-white on a pastel is
 * unreadable.  So the label has to flip dark, and the [+] — the only way to
 * spend — now sits on thirteen different backgrounds instead of one.
 *
 * This measures all three before anything is built:
 *   - dark label text on each fill,
 *   - the gold [+] against each fill,
 *   - and the luminance spread, because a WHITE tile among pastels is the
 *     brightest thing on the screen whatever its contrast figures say.
 *
 *   node tools/qa/mp/palette-fill.mjs
 */
import * as C from './_colour.mjs';

const P = {
  Power: '#F4F0E7', Range: '#C9B6E4', Speed: '#97E7ED', Luck: '#EDB997',
  Special: '#EACDD1', Element: '#9D97ED',
  'Max HP': '#F2A6A6', Defense: '#C3CBCB', 'Max Mana': '#A6C8F0', Stamina: '#A9DDB4',
  Dodge: '#F0DC9A', 'Speed (shared)': '#D0ED97', Resist: '#F2B0D8',
};
const INK = '#20170D';        /* the dark the repo already puts on brass */
const GOLD = '#D8AA58';       /* COL.accent — the [+] fill */
const AA = 4.5, AA_LARGE = 3.0;

console.log('FULL-BACKGROUND PASTELS — what an opaque fill costs\n');
console.log('stat              fill      dark label   gold [+]   luminance');
const rows = [];
for (const [k, v] of Object.entries(P)) {
  const ink = C.contrast(INK, v);
  const gold = C.contrast(GOLD, v);
  const lum = C.luminance(v);
  rows.push({ k, v, ink, gold, lum });
  const flag = (x, t) => (x >= t ? ' ' : '!');
  console.log(`  ${k.padEnd(16)} ${v}  ${ink.toFixed(2).padStart(6)}:1${flag(ink, AA)}   ${gold.toFixed(2).padStart(5)}:1${flag(gold, AA_LARGE)}   ${lum.toFixed(3)}`);
}
const bad = rows.filter((r) => r.ink < AA);
const goldBad = rows.filter((r) => r.gold < AA_LARGE);
console.log(`\n  dark label under AA ${AA}: ${bad.length ? bad.map((r) => r.k).join(', ') : 'none'}`);
console.log(`  gold [+] under ${AA_LARGE} (large-text floor): ${goldBad.length ? goldBad.map((r) => `${r.k} ${r.gold.toFixed(2)}`).join(', ') : 'none'}`);

rows.sort((a, b) => b.lum - a.lum);
console.log(`\n  BRIGHTEST -> DARKEST (a white tile is the loudest thing on screen whatever its contrast says):`);
rows.forEach((r) => console.log(`    ${r.k.padEnd(16)} ${r.lum.toFixed(3)}`));
console.log(`  spread: ${(rows[0].lum / rows[rows.length - 1].lum).toFixed(2)}x between ${rows[0].k} and ${rows[rows.length - 1].k}`);

/* Separation at FULL opacity — the thing the tint destroyed and a fill does not. */
const keys = Object.keys(P);
let worst = Infinity, pair = '';
const under = [];
for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
  const d = C.deltaE00(P[keys[i]], P[keys[j]]);
  if (d < 12) under.push(`${keys[i]}/${keys[j]} ${d.toFixed(1)}`);
  if (d < worst) { worst = d; pair = `${keys[i]}/${keys[j]}`; }
}
console.log(`\n  CIEDE2000 at full opacity: ${under.length} of 78 pairs under 12` + (under.length ? ` -> ${under.join(', ')}` : ''));
console.log(`  worst: ${pair} ${worst.toFixed(1)}`);

/* ═══ THE TWO THE OWNER MAY WANT TO RETHINK, WITH NUMBERS ═══
   Neither is a bug and neither is changed: these are the owner's own colours.
   But a full tile is a different job from an accent, and two of the eight now
   carry a meaning nobody asked them to.
     POWER IS WHITE, and a white tile on a dark panel is the brightest object on
     the screen — 0.873 against Element's 0.354, a 2.47x spread — so Power wins
     the eye by luminance alone, whatever the palette intends.
     DEFENSE IS GRAY, and gray among colours is the universal signal for
     DISABLED, which is the opposite of what a spendable stat should say.
   For each, the nearest alternative that keeps the owner's description ("white",
   "gray") while losing the side effect, with its separation re-checked — a
   change that fixes one thing and collides with another is not a fix. */
const ALT = {
  Power: { from: '#F4F0E7', to: ['#EDE4D3', '#E8DFCC', '#E3D9C4'], why: 'a paper/parchment white — still reads white, less luminance' },
  Defense: { from: '#C3CBCB', to: ['#B9C6D4', '#B4C3D6', '#C0C9D9'], why: 'a blue-leaning slate — still reads gray, not "switched off"' },
};
console.log('\n  ALTERNATIVES (not applied — these are the owner\'s colours):');
for (const [k, a] of Object.entries(ALT)) {
  console.log(`  ${k}: ${a.why}`);
  for (const cand of a.to) {
    const trial = { ...P, [k]: cand };
    const ks = Object.keys(trial);
    let worst = Infinity, pair = '';
    for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) {
      const d = C.deltaE00(trial[ks[i]], trial[ks[j]]);
      if (d < worst) { worst = d; pair = `${ks[i]}/${ks[j]}`; }
    }
    console.log(`    ${cand}  lum ${C.luminance(cand).toFixed(3)}  dark label ${C.contrast(INK, cand).toFixed(2)}:1`
      + `  moves ${C.deltaE00(cand, a.from).toFixed(1)} from the owner's pick  worst pair now ${pair} ${worst.toFixed(1)}`);
  }
}
