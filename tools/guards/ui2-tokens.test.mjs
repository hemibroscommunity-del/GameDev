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
 *  10. the face's weights are ones the page asks Google Fonts for, upright,
 *      in both links (and Raleway, which nothing used, is no longer asked for;
 *      v2.3.6785: the face is Source Sans 3, and Merriweather is not asked);
 *  v2.3.6780 (card UI3-kit, the owner's palette of 2026-11-26):
 *  11. the owner's six colours are here to the digit (base #14232F, navigation
 *      #223D53, recessed #0E1D29, the line #4B6275, text #F1F0E9, gold #EAC474);
 *  12. the line is a LINE: its own table, never a surface, and every edge of
 *      the sheet reads it (no hand-written edge colour is left);
 *  13. `?ui2look=0`'s block holds yesterday: today's values with UI2_WAS over
 *      them, less the properties born since, are main 7ec316e9's to the byte
 *      (a token changed and left out of UI2_WAS is red), every UI2_WAS row
 *      names a property that did change, and the block sits after the shine
 *      switch's;
 *  14. suite 2 again over yesterday's surfaces and words.
 *  v2.3.6841 (card UI4 PR 2, the owner's V17, `?v17look`):
 *  15. every pair of words and face the V17 look draws at 4.5 to 1 (the label on
 *      commit, danger, go, adjust, disabled, a tab chosen or not; ivory, muted,
 *      the point's cue and the chevron on the recessed, the slate and the page);
 *  16. V17's nine colours (V17:39-49) are the look's, to the digit (a value that
 *      failed 15 would take the nearest that passes, and be listed here: none);
 *  17. the type: each kit size under the look sits in its V17:49 band, the
 *      smallest word 12 (the badge's 10), and a screen that keeps 11 is a root's
 *      own class;
 *  18. the look is its own block (`.ui2.ui2-v17`, after yesterday's), none of its
 *      properties in ui2Vars() (yesterday's hash), and it changes only sizes V17
 *      moves.
 *
 * BREAK PROOF (tried by hand, 2026-11-25; the PR body lists them):
 *   ui2Tokens.js: muted '#BCC8CC' -> '#A9B7BD'                 -> FAIL 2 (raised top under its gloss) and FAIL 7
 *   ui2Tokens.js: red face's bottom '#E57D70' -> '#C8564C'      -> FAIL 1 and FAIL 7
 *   ui2Tokens.js: touch 44 -> 40                                 -> FAIL 4 and FAIL 7
 *   ui2Tokens.js: the grade `elite` renamed `epic`                -> FAIL 6
 *   ui2.css: `font-size: 9px` in a rule                          -> FAIL 8
 *   ui2.css: a `url(...)` background                             -> FAIL 8
 *   ui2Tokens.js: muted '#BCC8CC' -> '#A9B7BD' and nothing in UI2_WAS -> FAIL 2, 7, 13 and 14 (v2.3.6780)
 *   ui2Tokens.js: well '#0E1D29' -> '#0F1E2A'                    -> FAIL 7, 11 and 12
 *   ui2Tokens.js: UI2_WAS's sunk-top row taken out               -> FAIL 7 and 13
 *   ui2.css: `border: 1px solid rgba(150, 195, 230, 0.24)` again  -> FAIL 12
 *
 *   ui2Tokens.js: UI2_WAS_UNWORN's font row moved into UI2_WAS  -> FAIL 7 and 13 (v2.3.6785)
 *   index.html: Merriweather asked again in one link             -> FAIL 10 (v2.3.6785)
 * Run: node tools/guards/ui2-tokens.test.mjs [--write]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import {
  UI2_LINE, UI2_WAS, UI2_WAS_UNWORN, UI2_BORN, UI2_BRASS,
  UI2_SURFACE, UI2_TEXT, UI2_ACTIONS, UI2_ACTION_NAMES, UI2_RARITY, UI2_GRADES, UI2_MARK,
  UI2_SIZE, UI2_TYPE, UI2_TYPE_FLOOR, UI2_BADGE_FLOOR, UI2_LIGHT, UI2_FONT,
  UI2_V17, UI2_V17_TYPE, UI2_V17_SIZES, UI2_V17_SMALL11, ui2V17Vars,
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
  const have = new Set([...ui2Vars(), ...ui2V17Vars()].map(([n]) => n));   /* v2.3.6841: and the V17 look's */
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

/* ── 10. the face's weights are ones the page asks Google Fonts for ──
 * v2.3.6785 (card UI3-type): the face is the game's own Source Sans 3 (the owner, 2026-11-26), asked
 * with its italic axis (`ital,wght@0,400;...`), so each link's family is read as Google's own grammar:
 * `family=Name:axes@tuple;tuple`, an upright weight a tuple `0,W` (or `W` with one axis).  Every kit
 * weight is asked upright in BOTH links (never a weight the browser fakes), and neither link asks
 * Merriweather (the serif left the page) nor Raleway. */
{
  const html = fs.readFileSync(path.join(ROOT, 'src/index.html'), 'utf8');
  const fam = UI2_FONT.fontFamily.split(',')[0].replace(/'/g, '').trim();
  const links = (html.match(/https:\/\/fonts\.googleapis\.com\/css2\?[^"]+/g) || []);
  const famsOf = (url) => {
    const out = Object.create(null);
    for (const part of url.split('?')[1].split('&')) {
      const [k, v] = part.split('=');
      if (k !== 'family' || !v) continue;
      const [name, spec] = decodeURIComponent(v).replace(/\+/g, ' ').split(':');
      const up = new Set();
      if (spec) {
        const [axes, tuples] = spec.split('@');
        const ax = axes.split(',');
        for (const t of tuples.split(';')) {
          const vals = t.split(',');
          const at = (a) => vals[ax.indexOf(a)];
          if (ax.includes('wght') && (!ax.includes('ital') || at('ital') === '0')) up.add(Number(at('wght')));
        }
      }
      out[name] = up;
    }
    return out;
  };
  const per = links.map(famsOf);
  const ok = per.length === 2 && per.every((f) => f[fam] && UI2_FONT.weights.every((w) => f[fam].has(w)) && !('Merriweather' in f) && !('Raleway' in f));
  check(`10. the page asks Google Fonts for ${fam} upright in the kit's weights (${UI2_FONT.weights.join(', ')}), in both its links, and no Merriweather`,
    ok, JSON.stringify(per.map((f) => Object.fromEntries(Object.entries(f).map(([n, w]) => [n, [...w]])))));
}

/* ── 11. the owner's six, to the digit (v2.3.6780) ── */
{
  const want = [
    ['the dashboard base (the page)', UI2_SURFACE.page, '#14232F'], ['the dashboard base (the frame\'s middle)', UI2_SURFACE.frameMid, '#14232F'],
    ['navigation (the raised face\'s middle)', UI2_SURFACE.raisedMid, '#223D53'], ['recessed panels (the well)', UI2_SURFACE.well, '#0E1D29'],
    ['subtle borders (the line)', UI2_LINE.line, '#4B6275'], ['primary text', UI2_TEXT.ivory, '#F1F0E9'],
    ['gold accents (the gold words)', UI2_TEXT.gold, '#EAC474'], ['gold accents (the brass highlight)', UI2_BRASS.highlight, '#EAC474'],
  ];
  const bad = want.filter(([, have, w]) => String(have).toUpperCase() !== w).map(([n, have, w]) => `${n}: ${have}, the owner's ${w}`);
  check('11. the owner\'s six colours of 2026-11-26 are the kit\'s, to the digit', bad.length === 0, bad.join('; '));
}

/* ── 12. the line is a line, and every edge reads it ── */
{
  const hand = css.slice(0, css.indexOf(UI2_BLOCK_START)) + css.slice(css.indexOf(UI2_BLOCK_END) + UI2_BLOCK_END.length);
  const code = hand.replace(/\/\*[\s\S]*?\*\//g, '');
  const old = code.match(/rgba\(\s*150\s*,\s*195\s*,\s*230[^)]*\)/g) || [];
  const reads = (code.match(/var\(--ui2-line(-faint)?\)/g) || []).length;
  const asSurface = Object.keys(UI2_SURFACE).filter((k) => [UI2_LINE.line, UI2_LINE.faint].map((x) => x.toUpperCase()).includes(String(UI2_SURFACE[k]).toUpperCase()));
  const faint = String(ui2Mix(UI2_LINE.line, UI2_SURFACE.well, 0.55)).toUpperCase();
  check(`12. the line is its own table (never a surface), the faint line is it sunk 55% toward the well (${faint}), and every edge reads it (${reads} reads, no hand-written edge left)`,
    old.length === 0 && reads >= 4 && asSurface.length === 0 && faint === UI2_LINE.faint.toUpperCase()
      && ui2Vars().some(([n, v]) => n === '--ui2-line' && v === UI2_LINE.line), JSON.stringify({ old, reads, asSurface, faint }));
}

/* ── 13. yesterday's look, whole ── */
{
  /* sha256 of main 7ec316e9's ui2Vars(), one "name: value" a line (v2.3.6780) */
  const MAIN = 'd33d3ec97e4d5e5114c509891a91d7500f064f9df0f5eeeeab1c4e3642c06609';
  const now = ui2Vars();
  const names = new Set(now.map(([n]) => n));
  /* v2.3.6785: a row ?ui2look=0 does not wear (the letters: UI2_WAS_UNWORN) is still yesterday's here */
  const was13 = { ...UI2_WAS_UNWORN, ...UI2_WAS };
  const yesterday = now.filter(([n]) => !UI2_BORN.includes(n)).map(([n, v]) => n + ': ' + (n in was13 ? was13[n] : v)).join('\n');
  const sum = crypto.createHash('sha256').update(yesterday).digest('hex');
  const stray = Object.keys(was13).filter((n) => !names.has(n) || now.find(([m]) => m === n)[1] === was13[n] || (n in UI2_WAS && n in UI2_WAS_UNWORN));
  const born = UI2_BORN.filter((n) => !names.has(n));
  const block = ui2Css();
  const wasAt = block.indexOf('.ui2.ui2-was {');
  const wasBody = wasAt >= 0 ? block.slice(wasAt, block.indexOf('}', wasAt)) : '';
  const missing = Object.keys(UI2_WAS).filter((n) => !wasBody.includes(`  ${n}: ${UI2_WAS[n]};`));
  const worn = Object.keys(UI2_WAS_UNWORN).filter((n) => wasBody.includes(`  ${n}:`));   /* v2.3.6785: today's letters under ?ui2look=0 too */
  check('13. ?ui2look=0 holds yesterday: today with UI2_WAS over it is main 7ec316e9\'s block to the byte; every row changed; the block after the shine switch\'s',
    sum === MAIN && stray.length === 0 && born.length === 0 && missing.length === 0 && worn.length === 0 && wasAt > block.indexOf('.ui2.ui2-noshine'),
    JSON.stringify({ sum, stray, born, missing, worn }));
}

/* ── 14. suite 2 over yesterday's surfaces and words ── */
{
  const was = (k, v) => { const n = '--ui2-' + k; return n in UI2_WAS ? UI2_WAS[n] : v; };
  const kebab = (k) => k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
  const surf = Object.keys(UI2_SURFACE).map((k) => [k, was(kebab(k), UI2_SURFACE[k])]);
  for (const k of ['raisedTop', 'raisedMid']) surf.push([k + ' glossed', ui2Mix(was(kebab(k), UI2_SURFACE[k]), WHITE, glossT)]);
  const bad = [];
  let worst = 99;
  for (const [sn, sv] of surf) for (const tn of ['ivory', 'muted', 'gold']) {
    const k = ui2Contrast(was('text-' + tn, UI2_TEXT[tn]), sv);
    worst = Math.min(worst, k);
    if (!(k >= MIN)) bad.push(`${tn} on ${sn} ${sv}: ${r2(k)}`);
  }
  check(`14. yesterday's look (?ui2look=0) keeps ivory, muted and gold at 4.5 to 1 on its ${surf.length} surfaces (worst ${r2(worst)} to 1)`, bad.length === 0, bad.join('; '));
}

/* ── 15. the V17 look's pairs (v2.3.6841) ── */
{
  const V = UI2_V17;
  const pairs = [
    ['commit label', V.onCommit, V.commit], ['danger label', V.onDanger, V.danger], ['go label', V.ivory, V.go],
    ['adjust label', V.ivory, V.adjust], ['disabled label', V.offText, V.off], ['chosen tab', V.selectText, V.go],
    ['tab not chosen', V.ivory, V.tab], ['ivory on recessed', V.ivory, V.info], ['muted on recessed', V.muted, V.info],
    ['chevron on recessed', V.muted, V.info], ['chevron on the slate', V.muted, V.go], ['muted on the slate', V.muted, V.go],
    ['point cue on the slate', V.priorityText, V.go], ['point cue on the page', V.priorityText, UI2_SURFACE.page],
    ['point cue on the well', V.priorityText, UI2_SURFACE.well], ['ivory on the page', V.ivory, UI2_SURFACE.page],
    ['muted on the page', V.muted, UI2_SURFACE.page], ['muted on the frame', V.muted, UI2_SURFACE.frameTop],
  ];
  const bad = [];
  let worst = 99;
  for (const [n, t, f] of pairs) { const k = ui2Contrast(t, f); worst = Math.min(worst, k); if (!(k >= MIN)) bad.push(`${n} ${t} on ${f}: ${r2(k)}`); }
  check(`15. the V17 look's ${pairs.length} pairs of words and face at 4.5 to 1 (worst ${r2(worst)} to 1)`, bad.length === 0, bad.join('; '));
}

/* ── 16. V17's own colours, to the digit ── */
{
  /* V17:39 #0A1620, :40 #91A9B9, :41 #294963 and #698397, :44 #E4BA68 and #141D22, :45 #753439, :49 #F1F0E9 and #BCC8CC */
  const OWNER = { info: '#0A1620', inspectEdge: '#91A9B9', go: '#294963', goEdge: '#698397', commit: '#E4BA68', onCommit: '#141D22', danger: '#753439', ivory: '#F1F0E9', muted: '#BCC8CC' };
  const MOVED = {};   /* a V17 value that failed suite 15, and the nearest that passes: none */
  const bad = Object.keys(OWNER).filter((k) => String(UI2_V17[k]).toUpperCase() !== (MOVED[k] || OWNER[k]));
  check('16. V17\'s nine colours are the look\'s to the digit (none moved for contrast)', bad.length === 0 && Object.keys(MOVED).length === 0, bad.map((k) => `${k} ${UI2_V17[k]} not ${OWNER[k]}`).join('; '));
}

/* ── 17. the type under the look ── */
{
  const bad = [];
  for (const k of Object.keys(UI2_TYPE)) {
    const s = UI2_V17_SIZES[k];
    const b = s && UI2_V17_TYPE[s.band];
    if (!b || !(s.px >= b.band[0] && s.px <= b.band[1])) bad.push(`${k} ${s ? s.px + ' in ' + s.band : 'unnamed'}`);
  }
  for (const k of Object.keys(UI2_V17_TYPE)) { const t = UI2_V17_TYPE[k]; if (!(t.token >= t.band[0] && t.token <= t.band[1])) bad.push(`token ${k} ${t.token}`); }
  const least = Math.min(...Object.keys(UI2_V17_SIZES).filter((k) => k !== 'badge').map((k) => UI2_V17_SIZES[k].px));
  const keep = UI2_V17_SMALL11.filter((sel) => !/^\.[a-z0-9-]+(\.[a-z0-9-]+)*$/.test(sel));
  check(`17. every kit size sits in its V17:49 band under the look; the smallest word ${least} (badge ${UI2_V17_SIZES.badge.px}); ${UI2_V17_SMALL11.length} screen(s) keep 11, each a root's class`,
    bad.length === 0 && least === 12 && UI2_V17_SIZES.badge.px === 10 && keep.length === 0, bad.concat(keep).join('; '));
}

/* ── 18. the look is its own block ── */
{
  const block = ui2Css();
  const at = block.indexOf('.ui2.ui2-v17 {');
  const body = at >= 0 ? block.slice(at, block.indexOf('}', at)) : '';
  const mine = ui2V17Vars();
  const inToday = mine.filter(([n]) => n.startsWith('--ui2-v17-') && ui2Vars().some(([m]) => m === n));
  const unwritten = mine.filter(([n, v]) => !body.includes(`  ${n}: ${v};`));
  const moved = mine.filter(([n]) => !n.startsWith('--ui2-v17-')).map(([n]) => n);
  check('18. the V17 look is its own block, after yesterday\'s; none of it in ui2Vars(); of today\'s properties it moves only the smallest word',
    at > block.indexOf('.ui2.ui2-was {') && inToday.length === 0 && unwritten.length === 0 && moved.join(',') === '--ui2-fs-small',
    JSON.stringify({ at, inToday, unwritten, moved }));
}

console.log(failed ? `\n${failed} check(s) failed` : '\nall checks pass');
process.exit(failed ? 1 : 0);
