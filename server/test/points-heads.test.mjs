/* ═══ v2.3.3554: THE POINTS TAB'S TWO HEADS, IN THE OWNER'S ART ═══
 * (docs/specs/points-heads.md; tools/ui/cut-points-heads.py writes the
 * pictures and the GENERATED src/data/pointsHeadArt.js)
 *
 *   1. every picture the heads draw is a file in public/icons/ui/points/ --
 *      the sword, staff, bow and the bust with the up arrow, the two frames,
 *      the gold and grey numerals 0-9 -- and the owner's sheet and mockup the
 *      cutter reads are kept;
 *   2. each file is the size the generated data says (a count is laid out from
 *      those widths before its pictures load, so a re-cut that left them stale
 *      would draw numerals squashed or apart);
 *   3. each frame's slice holds its whole corner and its stroke, and is under
 *      half the frame (a nine-slice past that draws nothing in the middle);
 *   4. the Points tab reads them: HeroExpanded imports the data, its heads and
 *      the spend window's lane tabs wear the sheet's icons, and nothing of the
 *      old heads is drawn (the blue badges, the diagonal, the portrait);
 *   5. a count with points to spend breathes by transform and opacity only,
 *      never a filter (the iOS grain rule), and is still with reduced motion;
 *      SLOWLY, the owner's "slowly grow then shrink": a 3.2 s breath.
 */
import { readFileSync, existsSync } from 'node:fs';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

const A = await import('../../src/data/pointsHeadArt.js');
const root = new URL('../../', import.meta.url);
const pub = (url) => new URL('public' + url.split('?')[0], root);
const src = (p) => readFileSync(new URL(p, root), 'utf8');
/* a PNG's own size, from its IHDR */
const png = (url) => { const b = readFileSync(pub(url)); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };

const DIR = A.POINTS_ART_DIR;
const ICONS = ['sword', 'staff', 'bow', 'character'];
const DIGITS = ['gold', 'grey'].flatMap((t) => [...Array(10).keys()].map((d) => `${t}-${d}`));

/* ── 1. the files ── */
{
  const all = [...ICONS, 'frame-weapons', 'frame-character', ...DIGITS].map((n) => `${DIR}${n}.png`);
  const missing = all.filter((u) => !existsSync(pub(u)));
  check(`1a every picture the heads draw is a file (${all.length}: four icons, two frames, twenty numerals)`,
    all.length === 26 && missing.length === 0, missing);
  check('1b the frames the data names are those two files',
    A.POINTS_FRAMES.weapons.file === 'frame-weapons.png' && A.POINTS_FRAMES.character.file === 'frame-character.png', A.POINTS_FRAMES);
  check('1c the owner\'s sheet and mockup are kept beside the cutter, so a redraw is cut again in one command',
    ['assets/icons-source/sheet-points-heads.png', 'assets/icons-source/mock-points-heads.png', 'tools/ui/cut-points-heads.py']
      .every((p) => existsSync(new URL(p, root))));
  check('1d the art\'s version is the cutter\'s', src('tools/ui/cut-points-heads.py').includes(`VERSION = '${A.POINTS_ART_V}'`), A.POINTS_ART_V);
}

/* ── 2. the sizes ── */
{
  const icons = ICONS.map((n) => png(`${DIR}${n}.png`).join('x'));
  check(`2a the icons are ${A.POINTS_ICON_PX} px square`, icons.every((d) => d === `${A.POINTS_ICON_PX}x${A.POINTS_ICON_PX}`), icons);
  const off = [];
  for (const t of ['gold', 'grey']) {
    for (let d = 0; d < 10; d++) {
      const [w, h] = png(`${DIR}${t}-${d}.png`);
      if (h !== A.POINTS_DIGIT_H || w !== A.POINTS_DIGIT_W[t][d]) off.push({ f: `${t}-${d}`, w, h, want: [A.POINTS_DIGIT_W[t][d], A.POINTS_DIGIT_H] });
    }
  }
  check(`2b every numeral is ${A.POINTS_DIGIT_H} px tall and as wide as the data says`, off.length === 0, off);
  const fr = Object.values(A.POINTS_FRAMES).map((f) => ({ f: f.file, got: png(`${DIR}${f.file}`), want: [f.w, f.h] }))
    .filter((x) => x.got[0] !== x.want[0] || x.got[1] !== x.want[1]);
  check('2c each frame is the size the data says', fr.length === 0, fr);
  /* a "63" reads as one number: no numeral narrower than a third or wider
     than its height (a cut that caught a label or lost half a numeral) */
  const odd = ['gold', 'grey'].flatMap((t) => A.POINTS_DIGIT_W[t].map((w, d) => ({ f: `${t}-${d}`, k: w / A.POINTS_DIGIT_H })))
    .filter((x) => x.k < 0.33 || x.k > 1);
  check('2d every numeral is a numeral\'s shape', odd.length === 0, odd);
}

/* ── 3. the nine slices ── */
{
  const bad = Object.values(A.POINTS_FRAMES).filter((f) => !(f.slice >= f.stroke && f.slice >= f.radius && f.slice < Math.min(f.w, f.h) / 2));
  check('3a each frame\'s slice holds its whole corner and stroke, under half the frame', bad.length === 0, A.POINTS_FRAMES);
}

/* ── 4. the Points tab reads them ── */
{
  const hx = src('src/ui/mobile/sheet/HeroExpanded.jsx');
  check('4a HeroExpanded draws from the generated data', /from '\.\.\/\.\.\/\.\.\/data\/pointsHeadArt\.js'/.test(hx));
  check('4b the four icons are the sheet\'s files', ICONS.every((n) => hx.includes('`${POINTS_ART_DIR}' + n + '.png?v=${POINTS_ART_V}`')));
  check('4c the heads are the two frames (data-points-frame) and the numerals gold or grey',
    hx.includes('data-points-frame="weapons"') && hx.includes('data-points-frame="character"')
      && hx.includes("const tone = v > 0 ? 'gold' : 'grey';"));
  check('4d the spend window\'s lane tabs wear them too',
    hx.includes('icon: POINTS_ICONS[c.key] || c.iconSrc') && hx.includes("icon: POINTS_ICONS.shared"));
  /* the old heads: the blue badges' art and the diagonal's sizes -- in the
     code, not the comments that tell their story */
  const code = hx.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const old = (code.match(/circle-blue|pill-blue|plus\.png|\bLANE_NUDGE\b|\bLANE_ICON\b|\bHEAD_ICON\b|headBadge\(/g) || []);
  check('4e nothing of the old heads is drawn (the blue badges, the diagonal, the portrait\'s badge)', old.length === 0, old);
  check('4f the handles the scenarios read are kept',
    ['data-prog3-head-badge={key}', 'data-count={v}', "'data-prog3-held': c.key", 'data-prog3-lane={isLane ? buildCat : \'shared\'}'].every((s) => hx.includes(s)));
}

/* ── 5. the breathing ── */
{
  const css = src('src/styles/game.css');
  const rules = css.split('\n').filter((l) => /bt-pts-count/.test(l)).join('\n');
  check('5a a waiting count breathes (bt-pts-count, a swell and a glow)', /@keyframes bt-pts-count\{/.test(css) && /\.bt-pts-count\{[^}]*animation:bt-pts-count/.test(css)
    && /\.bt-pts-count::before\{/.test(css));
  check('5b ...by transform and opacity only, never a filter', !/filter/.test(rules) && /transform:scale/.test(css.slice(css.indexOf('@keyframes bt-pts-count{'))) , rules.slice(0, 300));
  check('5c ...and still with reduced motion', /prefers-reduced-motion: reduce\)\{\s*\.bt-pts-count\{animation:none\}/.test(css));
  /* the owner: "If there are unallocated numbers waiting to be spent make
     them slowly grow then shrink" -- one breath 3.2 s, the swell and its glow
     in step, and enough of a swell to be seen at that pace */
  const dur = [...css.matchAll(/animation:(bt-pts-count(?:-glow)?) ([\d.]+)s ease-in-out infinite/g)].map((m) => [m[1], +m[2]]);
  const peak = /@keyframes bt-pts-count\{0%,100%\{transform:scale\(1\)\}50%\{transform:scale\(([\d.]+)\)\}\}/.exec(css);
  check('5e ...SLOWLY: one breath of 3 s or more, half growing and half shrinking, its glow in step',
    dur.length === 2 && dur.every(([, s]) => s >= 3 && s === dur[0][1]) && !!peak && +peak[1] >= 1.1 && +peak[1] <= 1.25, { dur, peak: peak && peak[1] });
  check('5d the old bubbles\' class is gone with them', !/bt-pts-bubble/.test(css) && !/bt-pts-bubble/.test(src('src/ui/mobile/sheet/HeroExpanded.jsx')));
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
