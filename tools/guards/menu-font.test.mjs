/* ═══ v2.3.6785 (card UI3-type): EVERY MENU WEARS THE GAME'S OWN LETTERS ═══
 *
 * The owner, 2026-11-26: "Also swap out the typography (font style) on all
 * menus to be same as the 'logout' font".  The Log Out button wears
 * 'Source Sans 3' (src/ui/mobile/dash/AccountPanel.jsx); the new dashboard's
 * kit wore a serif (Merriweather, and a bare Georgia on the slot's stars).
 * Now the kit's one token (src/game/ui2Tokens.js UI2_FONT, the sheet's
 * `--ui2-font`) is Source Sans 3, and this guard holds every font family of
 * the new dashboard to it:
 *
 *   1. the token: its first family is 'Source Sans 3', its last the generic
 *      `sans-serif`, and no member of it is a serif (serif, Georgia, Times,
 *      Merriweather, ...);
 *   2. the style sheets (src/ui/kit/*.css, src/ui/mobile/dash/*.css,
 *      src/ui/mobile/sheet/*.css), read by a CSS parser (esbuild's, which
 *      drops the comments; then a walk of its declarations, never a line
 *      pattern): every `font-family` is `var(--ui2-font)` or `inherit`;
 *      every `font` shorthand is `inherit` or ends in `var(--ui2-font)`;
 *      every `--ui2-font` written is the token's own value;
 *   3. the kit's components (src/ui/kit/*.jsx, *.js), compiled by esbuild
 *      (JSX to calls, comments dropped): every `fontFamily` or `font`
 *      property is 'inherit' or reads the token (`UI2_FONT.fontFamily`,
 *      `var(--ui2-font)`) and names no family of its own;
 *   4. the allow list (a number face, if one ever comes) only SHRINKS: an
 *      entry no longer found is red (it starts empty);
 *   5. THE DODGES, planted in memory on every run and each seen red (finish.md
 *      part 5, rule 1): a `font:` shorthand naming Georgia; `font-family:
 *      serif` in a screen's own sheet; an inline `fontFamily: 'Merriweather'`
 *      in a kit component; the token's fallback left as `serif`.
 *
 * BREAK PROOF (tried by hand, 2026-11-26):
 *   ui2Tokens.js: fontFamily "'Source Sans 3', serif"            -> FAIL 1 (and ui2-tokens 7)
 *   gearPanels.css: `font: 700 13px Georgia` in a rule           -> FAIL 2
 *   characterPage.css: `font-family: serif` in a rule            -> FAIL 2
 *   Badge.jsx: style={{ fontFamily: 'Merriweather' }}            -> FAIL 3
 *
 * Run: node tools/guards/menu-font.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { UI2_FONT } from '../../src/game/ui2Tokens.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

let failed = 0;
function check(name, ok, detail) {
  if (ok) console.log('ok   ' + name);
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '\n     ' + String(detail).slice(0, 1500))); }
}

function esbuild() {
  for (const pkg of ['server/package.json', 'package.json']) {
    try { return createRequire(path.join(ROOT, pkg))('esbuild'); } catch { /* the next */ }
  }
  throw new Error('esbuild not found: run `npm install` in server/ (wrangler brings it)');
}
const ES = esbuild();

/* The shrinking allow list: 'file :: property :: value' (the start of it), each with why. */
const ALLOW = Object.freeze([
  /* not a style: the kit page's QA probe (window.__btUiKit.font, read by mp-uikit), a yes or no
     that the token's face has loaded; it reads the token's first family */
  'src/ui/kit/UiKitPage.jsx :: font :: fonts && document.fonts.check(',
]);

const CSS_DIRS = ['src/ui/kit', 'src/ui/mobile/dash', 'src/ui/mobile/sheet'];
const JS_DIRS = ['src/ui/kit'];
const TOKEN = 'var(--ui2-font)';
const SERIFS = /^(serif|georgia|times|times new roman|merriweather|cambria|palatino|garamond|book antiqua|ui-serif)$/i;

const filesIn = (dir, re) => fs.readdirSync(path.join(ROOT, dir)).filter((f) => re.test(f)).sort().map((f) => dir + '/' + f);

/* A font list's members, quotes off: "'Source Sans 3', sans-serif" -> ['Source Sans 3', 'sans-serif'] */
function families(list) {
  return splitTop(String(list), ',').map((s) => s.trim().replace(/^['"]|['"]$/g, '').trim()).filter(Boolean);
}

/* split at a separator outside strings and brackets */
function splitTop(s, sep) {
  const out = []; let cur = ''; let depth = 0; let q = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { cur += c; if (c === '\\') { cur += s[++i] || ''; } else if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; cur += c; continue; }
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    if (depth === 0 && (sep === ' ' ? /\s/.test(c) : c === sep)) { out.push(cur); cur = ''; continue; }
    cur += c;
  }
  out.push(cur);
  return out.filter((x) => x.trim() !== '');
}

/* ── 1. the token ── */
function tokenFaults(fontFamily) {
  const f = families(fontFamily);
  const bad = [];
  if (f[0] !== 'Source Sans 3') bad.push(`first family ${JSON.stringify(f[0])}, not 'Source Sans 3'`);
  if (f[f.length - 1] !== 'sans-serif') bad.push(`last family ${JSON.stringify(f[f.length - 1])}, not the generic sans-serif`);
  for (const m of f) if (SERIFS.test(m)) bad.push(`a serif in the list: ${m}`);
  return bad;
}

/* ── 2. a style sheet's declarations, by esbuild's parser and a walk of its output ── */
function declarations(cssText, file) {
  const code = ES.transformSync(cssText, { loader: 'css', sourcefile: file }).code;
  const out = []; let cur = ''; let q = null; let paren = 0;
  for (let i = 0; i < code.length; i++) {
    const c = code[i];
    if (q) { cur += c; if (c === '\\') cur += code[++i] || ''; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; cur += c; continue; }
    if (c === '(') paren++;
    if (c === ')') paren--;
    if (paren === 0 && c === '{') { cur = ''; continue; }   /* what came before was a selector or a prelude */
    if (paren === 0 && (c === ';' || c === '}')) {
      const t = cur.trim(); cur = '';
      const k = t.indexOf(':');
      if (k > 0) out.push({ prop: t.slice(0, k).trim().toLowerCase(), value: t.slice(k + 1).replace(/!important\s*$/i, '').trim() });
      continue;
    }
    cur += c;
  }
  return out;
}

function cssFaults(file, cssText) {
  const bad = [];
  for (const d of declarations(cssText, file)) {
    const v = d.value.replace(/\s+/g, ' ');
    const key = `${file} :: ${d.prop} :: ${v}`;
    if (ALLOW.some((a) => key.startsWith(a))) continue;
    if (d.prop === 'font-family') {
      if (!(v === TOKEN || v === 'inherit')) bad.push(key);
    } else if (d.prop === 'font') {
      const parts = splitTop(v, ' ');
      if (!(v === 'inherit' || (parts.length >= 2 && parts[parts.length - 1] === TOKEN && !parts.slice(0, -1).some((p) => /['"]/.test(p) || SERIFS.test(p))))) bad.push(key);
    } else if (d.prop === '--ui2-font') {
      if (families(v).join('|') !== families(UI2_FONT.fontFamily).join('|')) bad.push(key + ' (the token is ' + UI2_FONT.fontFamily + ')');
    }
  }
  return bad;
}

/* ── 3. a kit component's inline font properties, compiled by esbuild ── */
function jsFaults(file, src, all = false) {
  const code = ES.transformSync(src, { loader: /\.jsx$/.test(file) ? 'jsx' : 'js', jsx: 'transform', sourcefile: file }).code;
  const bad = [];
  /* a property key (bare or quoted) followed by its colon, outside strings: walk the code */
  const keyAt = /(?:^|[{,\s])(fontFamily|font|"font-family"|'font-family'|"fontFamily"|'fontFamily'|"font"|'font')\s*:/g;
  let m;
  while ((m = keyAt.exec(code))) {
    /* the value: up to the next comma or closing bracket at depth 0; strings, templates and their
       `${...}` read whole (a stack: a template's `${` opens an expression, its `}` goes back in) */
    let i = keyAt.lastIndex; let v = ''; const stack = [];
    for (; i < code.length; i++) {
      const c = code[i]; const top = stack[stack.length - 1];
      if (top === '"' || top === "'" || top === '`') {
        v += c;
        if (c === '\\') { v += code[++i] || ''; continue; }
        if (top === '`' && c === '$' && code[i + 1] === '{') { v += '{'; i++; stack.push('${'); continue; }
        if (c === top) stack.pop();
        continue;
      }
      if (c === '"' || c === "'" || c === '`') { stack.push(c); v += c; continue; }
      if (c === '(' || c === '[' || c === '{') { stack.push(c); v += c; continue; }
      if (c === ')' || c === ']' || c === '}') {
        if (!stack.length) break;
        stack.pop(); v += c; continue;
      }
      if (!stack.length && c === ',') break;
      v += c;
    }
    v = v.trim();
    const line = `${file} :: ${m[1].replace(/['"]/g, '')} :: ${v}`;
    if (all) { bad.push(line); continue; }
    if (ALLOW.some((a) => line.startsWith(a))) continue;
    if (/^["'`]inherit["'`]$/.test(v)) continue;
    const reads = /UI2_FONT\.fontFamily|var\(--ui2-font\)/.test(v);
    /* the words of its own, the token's reads and the interpolations taken out: sizes and weights only */
    const own = v.replace(/\$\{[^}]*\}/g, ' ').replace(/UI2_FONT\.fontFamily|var\(--ui2-font\)/g, ' ').replace(/["'`]/g, ' ');
    const words = (own.match(/[A-Za-z][A-Za-z0-9-]*/g) || []).filter((w) => !/^(px|em|rem|normal|bold|italic|var)$/i.test(w));
    if (!reads || words.length) bad.push(line);
  }
  return bad;
}

/* ── the real tree ── */
{
  const t = tokenFaults(UI2_FONT.fontFamily);
  check(`1. the kit's font token is the game's own: ${UI2_FONT.fontFamily}`, t.length === 0, t.join('; '));
}
let cssCount = 0;
{
  const bad = [];
  for (const dir of CSS_DIRS) for (const f of filesIn(dir, /\.css$/)) { cssCount++; bad.push(...cssFaults(f, fs.readFileSync(path.join(ROOT, f), 'utf8'))); }
  check(`2. every font family in the menus' ${cssCount} style sheets is the token or inherit`, bad.length === 0 && cssCount >= 6, bad.join('\n     ') || `${cssCount} sheets`);
}
let jsCount = 0;
{
  const bad = [];
  for (const dir of JS_DIRS) for (const f of filesIn(dir, /\.(jsx|js)$/)) { jsCount++; bad.push(...jsFaults(f, fs.readFileSync(path.join(ROOT, f), 'utf8'))); }
  check(`3. every inline font in the kit's ${jsCount} components is inherit or reads the token`, bad.length === 0 && jsCount >= 15, bad.join('\n     ') || `${jsCount} files`);
}
{
  /* every font property of the tree, as cssFaults and jsFaults would name it with no allow list */
  const all = [];
  for (const dir of CSS_DIRS) for (const f of filesIn(dir, /\.css$/)) for (const d of declarations(fs.readFileSync(path.join(ROOT, f), 'utf8'), f)) all.push(`${f} :: ${d.prop} :: ${d.value.replace(/\s+/g, ' ')}`);
  for (const dir of JS_DIRS) for (const f of filesIn(dir, /\.(jsx|js)$/)) all.push(...jsFaults(f, fs.readFileSync(path.join(ROOT, f), 'utf8'), true));
  const gone = ALLOW.filter((a) => !all.some((x) => x.startsWith(a)));
  check(`4. the allow list only shrinks (${ALLOW.length} entries, each still found)`, gone.length === 0, gone.join('; '));
}

/* ── 5. the dodges, each planted and seen red ── */
{
  const plants = [
    ['a `font:` shorthand naming Georgia', cssFaults('plant/gear.css', '.ui2 .x { font: 700 13px Georgia; }')],
    ['a `font:` shorthand that ends in the token but names a serif first', cssFaults('plant/gear.css', ".ui2 .x { font: 700 13px 'Merriweather', var(--ui2-font); }")],
    ['`font-family: serif` in a screen\'s own sheet', cssFaults('plant/characterPage.css', '.ui2 .y { color: red; font-family: serif; }')],
    ['`font-family` hidden in a nested rule with !important', cssFaults('plant/combat.css', '@media (min-width: 1px) { .ui2 .z { font-family: Georgia, serif !important; } }')],
    ['an inline `fontFamily: \'Merriweather\'` in a kit component', jsFaults('plant/Badge.jsx', "export const B = () => <span style={{ color: 'red', fontFamily: 'Merriweather' }}>x</span>;")],
    ['an inline `font:` shorthand naming a family beside the token', jsFaults('plant/Tile.jsx', "import { UI2_FONT } from 'x'; export const T = () => <b style={{ font: `700 13px Georgia, ${UI2_FONT.fontFamily}` }}>x</b>;")],
    ['the token\'s fallback left as `serif`', tokenFaults("'Source Sans 3', serif")],
    ['the token left as Merriweather', tokenFaults("'Merriweather', Georgia, 'Times New Roman', serif")],
  ];
  const quiet = plants.filter(([, f]) => f.length === 0).map(([n]) => n);
  /* and the honest forms stay green */
  const honest = [
    ...cssFaults('plant/ok.css', ".ui2 .a { font-family: var(--ui2-font); } .ui2 button { font: inherit; } .ui2 .b { font: 700 var(--ui2-fs-small) var(--ui2-font); }"),
    ...jsFaults('plant/ok.jsx', "import { UI2_FONT, UI2_TYPE } from 'x'; export const C = () => <i style={{ fontFamily: 'inherit', font: `${UI2_TYPE.small}px/1.3 ${UI2_FONT.fontFamily}` }}>x</i>;"),
  ];
  check(`5. the ${plants.length} dodges planted are each red, and the honest forms green`, quiet.length === 0 && honest.length === 0,
    JSON.stringify({ quiet, honest }));
}

console.log(failed ? `\n${failed} check(s) failed` : '\nall checks pass');
process.exit(failed ? 1 : 0);
