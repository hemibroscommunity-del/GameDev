/* ═══ v2.3.6680: THE NEW DASHBOARD'S TOKENS HOLD (card UI2, the build's step 1) ═══
 *
 * The kit (src/ui/kit/) reads one module, src/game/ui2Tokens.js; its style
 * sheet, src/ui/kit/ui2.css, carries the module's numbers in a block written
 * from it.  Here, not in server/test (a file there deploys the worker), this
 * suite works out what the owner's specification asks of the look (part 2:
 * "Target at least 4.5:1 contrast for normal-sized text throughout its
 * occupied gradient area; verify actual implementation states, including
 * pressed states"), and holds:
 *
 *   1. the ONE dark label on every stop of every action face, normal and
 *      pressed, and on each face under its gloss: 4.5 to 1 at least;
 *   2. ivory, muted and gold words on every dark surface, and on the raised
 *      face's top under its gloss at full shine: 4.5 to 1 at least;
 *   3. the count badge's figure on its red: 4.5 to 1 at least;
 *   4. the least touch box (44) and a header control at least that; the
 *      least text (11), a count badge's 10;
 *   5. the five action colours, each with three face and three pressed stops;
 *   6. the rarity grades are the GAME's (normal, rare, elite, godly: the
 *      words a player reads are the game's QUALITY_LABEL, Normal, Rare,
 *      Elite, Godly, read by the slot), with the colours of
 *      src/ui/mobile/dash/common.js (QUALITY_COLOR, QUALITY_PRISM), and
 *      stars one to four;
 *   7. the style sheet's block equals the module's (`--write` rewrites it);
 *   8. the rest of the sheet keeps the law: no hex colour of its own, every
 *      font size a token, no picture (`url(`), no filter or backdrop-filter,
 *      every property it reads exists, a reduced-motion rule that stops every
 *      loop, and the shine switch's class;
 *   9. the contrast arithmetic itself, on known pairs;
 *  10. the serif's weights are the two the page asks Google Fonts for (and
 *      Raleway, which nothing used, is no longer asked for).
 *
 * BREAK PROOF (tried by hand, 2026-11-25; the PR body lists them):
 *   ui2Tokens.js: muted '#BCC8CC' -> '#A9B7BD'                 -> FAIL 2 (raised top under its gloss) and FAIL 7
 *   ui2Tokens.js: red face's bottom '#E57D70' -> '#C8564C'      -> FAIL 1 and FAIL 7
 *   ui2Tokens.js: touch 44 -> 40                                 -> FAIL 4 and FAIL 7
 *   ui2Tokens.js: the grade `elite` renamed `epic`                -> FAIL 6
 *   ui2.css: `font-size: 9px` in a rule                          -> FAIL 8
 *   ui2.css: a `url(...)` background                             -> FAIL 8
 *
 * Run: node tools/guards/ui2-tokens.test.mjs [--write]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  UI2_SURFACE, UI2_TEXT, UI2_ACTIONS, UI2_ACTION_NAMES, UI2_RARITY, UI2_GRADES, UI2_MARK,
  UI2_SIZE, UI2_TYPE, UI2_TYPE_FLOOR, UI2_BADGE_FLOOR, UI2_LIGHT, UI2_FONT,
  ui2Vars, ui2Css, ui2Contrast, ui2Mix, ui2Rgb, ui2Luminance, UI2_BLOCK_START, UI2_BLOCK_END,
} from '../../src/game/ui2Tokens.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CSS = path.join(ROOT, 'src/ui/kit/ui2.css');
const COMMON = path.join(ROOT, 'src/ui/mobile/dash/common.js');
const MIN = 4.5;

let failed = 0;
function check(name, ok, detail) {
  if (ok) console.log('ok   ' + name);
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '\n     ' + String(detail).slice(0, 1500))); }
}
const r2 = (x) => Math.round(x * 100) / 100;
const WHITE = '#FFFFFF';
const glossT = UI2_LIGHT.shine * UI2_LIGHT.gloss;   /* the gloss's white at its strongest */

/* ── --write: the block, from the module ── */
let css = fs.readFileSync(CSS, 'utf8');
const a = css.indexOf(UI2_BLOCK_START);
const b = css.indexOf(UI2_BLOCK_END);
if (process.argv.includes('--write')) {
  if (a < 0 || b < a) { console.log('FAIL --write: the block\'s markers are not in ' + CSS); process.exit(1); }
  css = css.slice(0, a) + ui2Css() + css.slice(b + UI2_BLOCK_END.length);
  fs.writeFileSync(CSS, css);
  console.log('wrote the token block of src/ui/kit/ui2.css');
}

/* ── 1. the one dark label on every action stop ── */
{
  const bad = [];
  let worst = 99;
  for (const n of UI2_ACTION_NAMES) {
    const A = UI2_ACTIONS[n];
    const stops = [...A.face.map((c, i) => ['face ' + i, c]), ...A.pressed.map((c, i) => ['pressed ' + i, c]),
      ...A.face.map((c, i) => ['face ' + i + ' glossed', ui2Mix(c, WHITE, glossT)])];
    for (const [where, c] of stops) {
      const k = ui2Contrast(UI2_TEXT.onAction, c);
      worst = Math.min(worst, k);
      if (!(k >= MIN)) bad.push(`${n} ${where} ${c}: ${r2(k)}`);
    }
  }
  check(`1. the one dark label ${UI2_TEXT.onAction} on every stop of the five faces, pressed and glossed (worst ${r2(worst)} to 1)`, bad.length === 0, bad.join('; '));
}

/* ── 2. ivory, muted and gold words on every dark surface ── */
{
  const bad = [];
  let worst = 99;
  const surfaces = Object.keys(UI2_SURFACE).map((k) => [k, UI2_SURFACE[k]]);
  for (const k of ['raisedTop', 'raisedMid']) surfaces.push([k + ' glossed', ui2Mix(UI2_SURFACE[k], WHITE, glossT)]);
  for (const [sn, s] of surfaces) {
    for (const tn of ['ivory', 'muted', 'gold']) {
      const k = ui2Contrast(UI2_TEXT[tn], s);
      worst = Math.min(worst, k);
      if (!(k >= MIN)) bad.push(`${tn} on ${sn} ${s}: ${r2(k)}`);
    }
  }
  check(`2. ivory, muted and gold words on all ${surfaces.length} dark surfaces (worst ${r2(worst)} to 1)`, bad.length === 0 && surfaces.length >= 14, bad.join('; ') || surfaces.length);
}

/* ── 3. the count badge ── */
{
  const k = ui2Contrast(UI2_MARK.countText, UI2_MARK.count);
  check(`3. the count badge's figure on its red (${r2(k)} to 1)`, k >= MIN, r2(k));
}

/* ── 4. the least touch box and the least text ── */
{
  const small = Object.keys(UI2_TYPE).filter((k) => k !== 'badge' && !(UI2_TYPE[k] >= 11));
  check('4a. the least touch box is 44, and a header control is at least it',
    UI2_SIZE.touch >= 44 && UI2_SIZE.header >= UI2_SIZE.touch, `touch ${UI2_SIZE.touch}, header ${UI2_SIZE.header}`);
  check('4b. the least text is 11 (every size but the badge\'s), the badge\'s 10',
    small.length === 0 && UI2_TYPE.badge >= 10 && UI2_TYPE_FLOOR === 11 && UI2_BADGE_FLOOR === 10,
    `under 11: ${small.join(', ')}; badge ${UI2_TYPE.badge}; floors ${UI2_TYPE_FLOOR}, ${UI2_BADGE_FLOOR}`);
}

/* ── 5. the five action colours ── */
{
  const names = UI2_ACTION_NAMES.join(',');
  const shape = UI2_ACTION_NAMES.filter((n) => !(UI2_ACTIONS[n] && UI2_ACTIONS[n].face.length === 3 && UI2_ACTIONS[n].pressed.length === 3
    && [...UI2_ACTIONS[n].face, ...UI2_ACTIONS[n].pressed, UI2_ACTIONS[n].edge, UI2_ACTIONS[n].rim].every((c) => ui2Rgb(c))));
  check('5. the five action colours (gold, green, blue, red, silver), each three face and three pressed stops',
    names === 'gold,green,blue,red,silver' && Object.keys(UI2_ACTIONS).join(',') === names && shape.length === 0, `${names}; bad: ${shape.join(', ')}`);
  /* a pressed face is darker than its face (it goes down), and still light enough for the label */
  const lit = UI2_ACTION_NAMES.filter((n) => !(ui2Luminance(UI2_ACTIONS[n].pressed[0]) < ui2Luminance(UI2_ACTIONS[n].face[0])));
  check('5b. each pressed face starts darker than its face (the light goes down with it)', lit.length === 0, lit.join(', '));
}

/* ── 6. the game's grades ── */
{
  const src = fs.readFileSync(COMMON, 'utf8');
  const colour = (g) => { const m = new RegExp(`\\b${g}:\\s*'(#[0-9A-Fa-f]{6})'`).exec(src.slice(src.indexOf('QUALITY_COLOR'))); return m ? m[1].toUpperCase() : null; };
  const label = (g) => { const m = new RegExp(`\\b${g}:\\s*'([A-Za-z]+)'`).exec(src.slice(src.indexOf('QUALITY_LABEL'))); return m ? m[1] : null; };
  const prism = (/QUALITY_PRISM\s*=\s*'linear-gradient\(90deg,([^)]*)\)'/.exec(src) || [])[1];
  const bad = [];
  if (UI2_GRADES.join(',') !== 'normal,rare,elite,godly' || Object.keys(UI2_RARITY).join(',') !== 'normal,rare,elite,godly') bad.push('the four grades, in order');
  UI2_GRADES.forEach((g, i) => {
    const R = UI2_RARITY[g];
    if (!label(g)) bad.push(`${g} is not a grade the game names (QUALITY_LABEL)`);
    if (R.stars !== i + 1) bad.push(`${g}'s stars ${R.stars}`);
    if (g !== 'normal' && String(R.colour).toUpperCase() !== colour(g)) bad.push(`${g}'s colour ${R.colour} (the game's ${colour(g)})`);
  });
  if (!prism || UI2_RARITY.godly.prism.join(',').toUpperCase() !== prism.toUpperCase()) bad.push(`godly's prism ${UI2_RARITY.godly.prism} (the game's ${prism})`);
  check('6. the grades are the game\'s (normal, rare, elite, godly, each named by common.js\'s QUALITY_LABEL; its colours; stars 1 to 4)', bad.length === 0, bad.join('; '));
}

/* ── 7. the block equals the module ── */
{
  const block = a >= 0 && b > a ? css.slice(css.indexOf(UI2_BLOCK_START), css.indexOf(UI2_BLOCK_END) + UI2_BLOCK_END.length) : '';
  const want = ui2Css();
  let firstDiff = '';
  if (block !== want) {
    const x = block.split('\n');
    const y = want.split('\n');
    for (let i = 0; i < Math.max(x.length, y.length); i++) if (x[i] !== y[i]) { firstDiff = `line ${i + 1}: sheet "${x[i]}" / module "${y[i]}"`; break; }
  }
  check(`7. the style sheet's token block equals the module's (${ui2Vars().length} properties; \`--write\` to remake)`, block === want, firstDiff || 'no block');
}

/* ── 8. the rest of the sheet keeps the law ── */
{
  const end = css.indexOf(UI2_BLOCK_END);
  const hand = (end >= 0 ? css.slice(0, css.indexOf(UI2_BLOCK_START)) + css.slice(end + UI2_BLOCK_END.length) : css)
    .replace(/\/\*[\s\S]*?\*\//g, '');
  const hex = hand.match(/#[0-9A-Fa-f]{3,8}\b/g) || [];
  check('8a. no hex colour outside the block (colours are tokens; a light or a shadow is white or black at an alpha)', hex.length === 0, hex.join(' '));
  const sizes = (hand.match(/font-size\s*:\s*[^;]+/g) || []).filter((s) => !/^font-size\s*:\s*var\(--ui2-fs-[a-z-]+\)$/.test(s.trim()));
  check('8b. every font size is a token (so the least text is the token\'s)', sizes.length === 0 && /font-size/.test(hand), sizes.join('; '));
  const pics = hand.match(/url\s*\(|image-set\s*\(/g) || [];
  check('8c. no picture in the chrome (no url(), no image-set())', pics.length === 0, pics.join(' '));
  const filt = hand.match(/(?:^|[\s;{])(?:-webkit-)?(?:backdrop-)?filter\s*:/g) || [];
  check('8d. no filter and no backdrop-filter', filt.length === 0, filt.join(' '));
  const have = new Set(ui2Vars().map(([n]) => n));
  const read = [...new Set((hand.match(/var\(\s*(--ui2-[a-z0-9-]+)/g) || []).map((s) => s.replace(/^var\(\s*/, '')))];
  const missing = read.filter((n) => !have.has(n));
  check(`8e. every token the sheet reads exists (${read.length} read)`, missing.length === 0 && read.length > 40, missing.join(', ') || read.length);
  const loops = (hand.match(/animation\s*:[^;]*infinite/g) || []).length;
  const stop = /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*{\s*\.ui2 \*, \.ui2 \*::before, \.ui2 \*::after\s*{\s*animation:\s*none !important;\s*transition:\s*none !important;\s*}\s*}/.test(hand);
  check(`8f. reduced motion stops every loop (${loops} loops) and every move`, stop && /prefers-reduced-motion/.test(ui2Css()), stop);
  check('8g. the shine switch\'s class sets the one shine token to 0, and the gloss reads it',
    /\.ui2\.ui2-noshine\s*{\s*--ui2-shine:\s*0;\s*}/.test(ui2Css()) && /opacity:\s*var\(--ui2-shine\)/.test(hand), '');
  const scoped = hand.split('}').map((r) => r.split('{')[0].trim()).filter((sel) => sel && !/^@/.test(sel) && !/^(from|to|\d+%)$/.test(sel))
    .filter((sel) => sel.split(',').some((one) => !/^\.ui2\b/.test(one.trim())));
  check('8h. every rule is under .ui2 (nothing that exists today changes its look)', scoped.length === 0, scoped.join(' | '));
}

/* ── 9. the arithmetic, on known pairs ── */
{
  const ok = r2(ui2Contrast('#000000', '#FFFFFF')) === 21 && r2(ui2Contrast('#FFFFFF', '#000000')) === 21
    && r2(ui2Contrast('#777777', '#FFFFFF')) === 4.48 && r2(ui2Contrast('#767676', '#FFFFFF')) === 4.54
    && ui2Contrast('#FFF', '#FFFFFF') === 1 && ui2Rgb('#0a0B0c').join() === '10,11,12' && ui2Rgb('nope') === null
    && ui2Mix('#000000', '#FFFFFF', 0.5) === '#808080' && ui2Mix('#102030', '#102030', 0.3) === '#102030'
    && r2(ui2Luminance('#FF0000')) === 0.21 && r2(ui2Luminance('#00FF00')) === 0.72 && r2(ui2Luminance('#0000FF')) === 0.07
    && r2(ui2Luminance('#0A0A0A')) === 0 && Math.abs(ui2Luminance('#0A0A0A') - 0.003035) < 1e-5 && Math.abs(ui2Luminance('#0B0B0B') - 0.003347) < 1e-5
    && Math.abs(ui2Luminance('#1A1A1A') - 0.010330) < 1e-5 && ui2Rgb('#0f0').join() === '0,255,0' && ui2Mix('#000000', '#0A0B0C', 1) === '#0a0b0c';
  check('9. the contrast arithmetic on known pairs (black and white 21; #777 4.48; #767676 4.54; the linear part under 0.03928)', ok,
    `${ui2Contrast('#777777', '#FFFFFF')} ${ui2Luminance('#0A0A0A')} ${ui2Luminance('#0B0B0B')}`);
}

/* ── 10. the serif's weights are the ones the page asks Google Fonts for ── */
{
  const html = fs.readFileSync(path.join(ROOT, 'src/index.html'), 'utf8');
  const fam = UI2_FONT.fontFamily.split(',')[0].replace(/'/g, '').trim();
  const asks = (html.match(new RegExp('family=' + fam.replace(/ /g, '\\+') + ':wght@([0-9;]+)', 'g')) || []).map((x) => x.split('@')[1]);
  check(`10. the page asks Google Fonts for ${fam} in the kit's weights (${UI2_FONT.weights.join(', ')}), in both its links`,
    asks.length === 2 && asks.every((w) => w === UI2_FONT.weights.join(';')) && !/family=Raleway/.test(html), asks.join(' | ') || 'not asked');
}

console.log(failed ? `\n${failed} check(s) failed` : '\nall checks pass');
process.exit(failed ? 1 : 0);
