/* ═══ v2.3.6841: THE ROLES WEAR THE OWNER'S V17, AND `?v17look=0` IS YESTERDAY (card UI4 PR 2) ═══
 *
 * The owner's V17 (docs/design/v17/MASTER-IMPLEMENTATION.md:37-49): each role
 * its look ("Commit | Solid gold #E4BA68, dark text #141D22", "Navigation/
 * preparation | Raised slate #294963, edge #698397", ...), and "Gold is not a
 * generic primary-navigation color" (line 49), "Available points deserve a
 * priority cue but not commit-style gold" (line 20).  The look is ONE class on
 * the kit root, `.ui2-v17` (src/ui/kit/shine.js), ON by default; `?v17look=0`
 * takes the class away and must draw the game exactly as the day before.
 *
 * This suite reads the SYNTAX TREE of every style sheet under src/ui/ (postcss,
 * the parser the build itself runs) and of src/ui/kit/shine.js (@babel/parser,
 * as ui4-roles does), and fails:
 *
 *   L1  a rule of the look not wholly under `.ui2.ui2-v17` (one selector of a
 *       list left out changes the old look too), or a `--ui2-v17-*` token read
 *       by a rule outside it, or set anywhere but the generated block;
 *   L2  a role of V17's table with no rule of its own under the look (commit,
 *       danger, go, adjust, selected, inspect, info, disabled; `slot` is kept
 *       on purpose: V17:47 "Preserve rarity and selected cues");
 *   L3  commit gold worn by anything but a commit (a go, a tab, a chevron, a
 *       stat's number), or a stat's number or a chevron left without its own
 *       non-gold colour under the look;
 *   L4  a point to spend wearing commit gold, or its cue's rule missing;
 *   L5  the chosen tab told apart by colour alone (no shape under it, no
 *       underline on its word);
 *   L6  disabled words in the dim grey (V17:46 "Muted but readable"), or the
 *       disabled rule before the go rule (a locked tile would wear go);
 *   L7  a commit without its dark words, a danger without its light ones;
 *   L8  the root's class given without the switch, or over yesterday's look
 *       (`?ui2look=0` is older than V17);
 *   L9  a green or blue face under the look (V17 has neither: never a third
 *       colour);
 *   L10 a label alone in its box left-aligned under the look (the owner,
 *       about 22:20 UTC 2026-11-27: "sometimes the labels are left aligned
 *       inside text boxes instead of centered I'd prefer centered"): a compact
 *       tile with no line under it, a stat's words.
 * THE DODGES are planted in part P (each must be red).
 *
 * Run: node tools/guards/ui4-look.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const require = createRequire(import.meta.url);
const postcss = require('postcss');
const babel = require('@babel/parser');
const SHINE = path.join(ROOT, 'src/ui/kit/shine.js');
const KIT_CSS = 'src/ui/kit/ui2.css';

let failed = 0;
function check(name, ok, detail) {
  if (ok) console.log('ok   ' + name);
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '\n     ' + String(typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 1500))); }
}

function sheets() {
  const out = {};
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.css')) out[path.relative(ROOT, p)] = fs.readFileSync(p, 'utf8');
    }
  };
  walk(path.join(ROOT, 'src/ui'));
  return out;
}

const SCOPE = /^\.ui2\.ui2-v17(?![\w-])/;
const COMMIT_TOKENS = /var\(--ui2-v17-commit\)|var\(--ui2-gold-|#E4BA68|var\(--ui2-text-gold\)|var\(--ui2-brass-highlight\)/i;

/** every rule of the sheets: { file, i (its order), sel: [...], decl: { prop: value } } */
function rulesOf(css) {
  const out = [];
  let i = 0;
  for (const file of Object.keys(css)) {
    const tree = postcss.parse(css[file], { from: file });
    tree.walkRules((r) => {
      if (r.parent && r.parent.type === 'atrule' && /keyframes/.test(r.parent.name)) return;
      const decl = {};
      r.walkDecls((d) => { decl[d.prop] = d.value; });
      out.push({ file, i: i++, sel: r.selectors.map((s) => s.trim()), decl });
    });
  }
  return out;
}

/** The whole audit; returns { L1: [...faults], ... } */
function audit(css, shineSrc) {
  const F = { L1: [], L2: [], L3: [], L4: [], L5: [], L6: [], L7: [], L8: [], L9: [], L10: [] };
  const rules = rulesOf(css);
  const look = rules.filter((r) => r.sel.some((s) => /ui2-v17/.test(s)));
  const v17Block = (r) => r.file === KIT_CSS && r.sel.length === 1 && r.sel[0] === '.ui2.ui2-v17' && Object.keys(r.decl).every((p) => p.startsWith('--'));
  /* L1 */
  for (const r of look) { const off = r.sel.filter((s) => !SCOPE.test(s)); if (off.length) F.L1.push(`${r.file}: ${off.join(', ')}`); }
  for (const r of rules) {
    const inLook = r.sel.every((s) => SCOPE.test(s));
    for (const [p, v] of Object.entries(r.decl)) {
      if (/--ui2-v17-/.test(v) && !inLook) F.L1.push(`${r.file}: ${r.sel.join(', ')} reads ${v}`);
      if (p.startsWith('--ui2-v17-') && !v17Block(r)) F.L1.push(`${r.file}: ${r.sel.join(', ')} sets ${p}`);
    }
  }
  /* rules of the look by what they style */
  const sets = (r, re) => Object.entries(r.decl).filter(([p]) => re.test(p));
  const on = (re) => look.filter((r) => r.sel.some((s) => re.test(s)));
  const ROLE = {
    commit: /\[data-u2-role='commit'\]/, danger: /\[data-u2-role='danger'\]/, go: /\.u2-raised$|\[data-u2-role='go'\]/,
    adjust: /\[data-u2-role='adjust'\]/, selected: /\[data-u2-role='selected'\]$/, inspect: /\.u2-stat\[data-u2-role='inspect'\]$/,
    info: /\[data-u2-role='info'\]$/, disabled: /\.u2-act\[disabled\]$/,
  };
  /* L2 */
  for (const k of Object.keys(ROLE)) if (!on(ROLE[k]).some((r) => sets(r, /^(background|color|border|border-color)$/).length)) F.L2.push(k);
  /* L3: commit gold only on a commit */
  for (const r of look) {
    const notCommit = r.sel.filter((s) => !ROLE.commit.test(s));
    if (!notCommit.length) continue;
    for (const [p, v] of sets(r, /^(background|background-color|color|border|border-color|box-shadow)$/)) if (COMMIT_TOKENS.test(v)
      && !(p === 'box-shadow' || p === 'border-color') ) F.L3.push(`${notCommit.join(', ')} { ${p}: ${v} }`);
    for (const [p, v] of sets(r, /^(background|background-color|color)$/)) if (/var\(--ui2-v17-commit\)|var\(--ui2-gold-/.test(v)) F.L3.push(`${notCommit.join(', ')} { ${p}: ${v} } (commit's own gold)`);
  }
  for (const [what, re] of [['a stat\'s number', /\.u2-stat-v$/], ['a chevron', /\.u2-chev$/]]) {
    const all = on(re).filter((r) => r.decl.color);
    if (!all.length) F.L3.push(`${what}: no colour of its own under the look`);
    for (const r of all) if (COMMIT_TOKENS.test(r.decl.color)) F.L3.push(`${what}: ${r.decl.color}`);
  }
  /* L4: a point to spend */
  for (const [what, re] of [['the count', /\.u2-at-line-v\.is-gold/], ['the hub\'s count', /\.u2-cb-pts\.is-on/], ['the plus', /\.u2-at-plus/]]) {
    /* any rule of the look that colours it (the cascade's order between sheets is the build's: every one must hold) */
    const all = on(re).filter((r) => r.decl.color);
    if (!all.length) F.L4.push(`${what}: no cue under the look`);
    for (const r of all) if (COMMIT_TOKENS.test(r.decl.color) || !/--ui2-v17-priority-/.test(r.decl.color)) F.L4.push(`${what}: ${r.decl.color}`);
  }
  /* L5: the chosen one, more than colour */
  const sel = on(ROLE.selected);
  const shape = sel.some((r) => /inset[^,]*-\d+px/.test(r.decl['box-shadow'] || ''));
  const under = look.some((r) => r.sel.some((s) => /\[data-u2-role='selected'\] \.u2-tile-label$/.test(s)) && /underline/.test(r.decl['text-decoration'] || ''));
  if (!shape) F.L5.push('no bar under the chosen one');
  if (!under) F.L5.push('its word not underlined');
  /* L6: disabled readable, and after go */
  const dis = on(ROLE.disabled);
  const goR = on(/\.u2-raised:not\(\.is-glow\)$|\.u2-raised$/);
  if (!dis.length || dis.some((r) => /--ui2-text-disabled/.test(r.decl.color || '') || !/--ui2-v17-off-text/.test(r.decl.color || ''))) F.L6.push('disabled words: ' + dis.map((r) => r.decl.color).join(', '));
  if (!dis.some((r) => r.sel.some((s) => /\.u2-raised\.is-off$/.test(s)))) F.L6.push('a locked tile (.u2-raised.is-off) not in the disabled rule');
  if (dis.length && goR.length && Math.min(...dis.map((r) => r.i)) < Math.max(...goR.map((r) => r.i))) F.L6.push('the disabled rule comes before the go rule');
  /* L7 */
  const colourOf = (re) => { const r = on(re).filter((x) => x.decl.color).pop(); return r ? r.decl.color : ''; };
  if (!/--ui2-v17-on-commit/.test(colourOf(ROLE.commit))) F.L7.push('commit words: ' + colourOf(ROLE.commit));
  if (!/--ui2-v17-on-danger/.test(colourOf(ROLE.danger))) F.L7.push('danger words: ' + colourOf(ROLE.danger));
  /* L9 */
  for (const r of look) for (const [p, v] of Object.entries(r.decl)) if (/--ui2-(green|blue)-/.test(v)) F.L9.push(`${r.sel.join(', ')} { ${p}: ${v} }`);
  /* L10: a label alone in its box, centred */
  const lone = on(/\.u2-tile\.is-compact\.is-lone$/);
  if (!lone.some((r) => r.decl['justify-content'] === 'center')) F.L10.push('a compact tile with no line under it is not centred');
  if (!on(/\.u2-stat \.u2-stat-words$/).some((r) => r.decl['text-align'] === 'center' && r.decl['align-items'] === 'center')) F.L10.push('a stat\'s words are not centred');
  /* L8: the root's class, from the syntax tree of shine.js */
  let tree = null;
  try { tree = babel.parse(shineSrc, { sourceType: 'module', plugins: ['jsx'] }); } catch (e) { F.L8.push('shine.js does not parse: ' + e.message); }
  if (tree) {
    const fn = (name) => tree.program.body.map((n) => (n.type === 'ExportNamedDeclaration' ? n.declaration : n)).find((d) => d && d.type === 'FunctionDeclaration' && d.id && d.id.name === name);
    const src = (n) => shineSrc.slice(n.start, n.end);
    const root = fn('ui2RootClass');
    const on17 = fn('v17LookOn');
    let gated = false;
    const visit = (n) => {
      if (!n || typeof n !== 'object') return;
      if (n.type === 'ConditionalExpression' && n.consequent.type === 'StringLiteral' && /ui2-v17/.test(n.consequent.value)) {
        const t = n.test;
        const parts = t.type === 'LogicalExpression' && t.operator === '&&' ? [t.left, t.right] : [t];
        gated = parts.some((x) => x.type === 'CallExpression' && x.callee.name === 'v17LookOn')
          && parts.some((x) => x.type === 'UnaryExpression' && x.operator === '!' && /was|ui2LookWas/.test(src(x.argument)));
      }
      for (const k of Object.keys(n)) { if (k === 'loc') continue; const v = n[k]; if (Array.isArray(v)) v.forEach(visit); else if (v && typeof v.type === 'string') visit(v); }
    };
    if (root) visit(root.body);
    if (!root || !gated) F.L8.push('ui2RootClass does not give ui2-v17 only under v17LookOn() and not over yesterday\'s look');
    const body = on17 ? src(on17) : '';
    if (!on17 || !/swValue\('v17look'\)/.test(body) || !/sw\('v17look'\)/.test(body) || !/V17_KEY/.test(body) || !/!== '0'/.test(body)) F.L8.push('v17LookOn does not read ?v17look, remember it, and default ON');
  }
  return F;
}

const CSS = sheets();
const SHINE_SRC = fs.readFileSync(SHINE, 'utf8');
const F = audit(CSS, SHINE_SRC);
const NAMES = {
  L1: 'every rule of the look wholly under .ui2.ui2-v17, its tokens read and set nowhere else',
  L2: 'every role of V17\'s table (but the slot, kept) has its own rule under the look',
  L3: 'commit gold on commits only; a stat\'s number and a chevron have their own non-gold colour',
  L4: 'a point to spend wears V17\'s priority cue, never commit gold',
  L5: 'the chosen tab: a bar under it and its word underlined, never colour alone',
  L6: 'disabled words muted but readable; the disabled rule after go, a locked tile in it',
  L7: 'commit\'s dark words, danger\'s light ones',
  L8: 'the root wears ui2-v17 only under v17LookOn() and never over ?ui2look=0; the switch remembered, ON by default',
  L9: 'no green or blue face under the look',
  L10: 'a label alone in its box is centred under the look (a compact tile with no line under it, a stat\'s words)',
};
const look = rulesOf(CSS).filter((r) => r.sel.some((s) => /ui2-v17/.test(s)));
for (const k of Object.keys(NAMES)) check(`${k}. ${NAMES[k]}` + (k === 'L1' ? ` (${look.length} rules)` : ''), F[k].length === 0, F[k]);
check('L0. the look has rules at all, in the kit\'s sheet and the combat pages\'', look.filter((r) => r.file === KIT_CSS).length >= 15 && look.some((r) => /combatPage\.css$/.test(r.file)), look.length);

/* ── P. THE DODGES, planted: each must be red in its check ── */
const plant = (name, want, mut) => {
  const css = { ...CSS };
  let src = SHINE_SRC;
  const r = mut(css, src);
  if (typeof r === 'string') src = r;
  const G = audit(css, src);
  check(`P. planted: ${name} -> red in ${want}`, G[want].length > 0, G[want]);
};
const add = (css, text) => { css[KIT_CSS] = css[KIT_CSS] + '\n' + text + '\n'; };
const rep = (css, file, a, b) => { if (!css[file].includes(a)) throw new Error('plant anchor missing: ' + a); css[file] = css[file].replace(a, b); };
plant('a rule of the look missing its scope in one selector of its list', 'L1', (c) => add(c, ".ui2.ui2-v17 .u2-act, .ui2 .u2-act[data-u2-role='commit'] { color: var(--ui2-text-ivory); }"));
plant('a V17 token read by today\'s look', 'L1', (c) => add(c, '.ui2 .u2-tile { background: var(--ui2-v17-go); }'));
plant('a V17 token set by hand outside the block', 'L1', (c) => add(c, '.ui2 { --ui2-v17-go: red; }'));
plant('the commit rule taken out', 'L2', (c) => rep(c, KIT_CSS, ".ui2.ui2-v17 .u2-act[data-u2-role='commit'] {", '.ui2.ui2-v17 .u2-act[data-u2-role=\'commitx\'] {'));
plant('a go action in commit gold', 'L3', (c) => add(c, ".ui2.ui2-v17 .u2-act[data-u2-role='go'] { background: var(--ui2-v17-commit); }"));
plant('the chevron gold again under the look', 'L3', (c) => add(c, '.ui2.ui2-v17 .u2-chev { color: var(--ui2-brass-highlight); }'));
plant('a stat\'s number in the kit\'s gold text', 'L3', (c) => add(c, '.ui2.ui2-v17 .u2-stat .u2-stat-v { color: var(--ui2-text-gold); }'));
plant('the point\'s plus in commit gold', 'L4', (c) => add(c, '.ui2.ui2-v17 .u2-at-plus { color: var(--ui2-v17-commit); }'));
plant('the point\'s count back to the gold text', 'L4', (c) => add(c, '.ui2.ui2-v17 .u2-at-line-v.is-gold { color: var(--ui2-text-gold); }'));
plant('the chosen tab by colour alone (no bar)', 'L5', (c) => rep(c, KIT_CSS, 'box-shadow: inset 0 -3px 0 var(--ui2-v17-select-edge);', 'box-shadow: none;'));
plant('the chosen tab\'s word not underlined', 'L5', (c) => rep(c, KIT_CSS, '  text-decoration: underline;\n', '  text-decoration: none;\n'));
plant('disabled words in the dim grey', 'L6', (c) => rep(c, KIT_CSS, 'color: var(--ui2-v17-off-text);', 'color: var(--ui2-text-disabled);'));
plant('the go rule written again after disabled (a locked tile wears go)', 'L6', (c) => add(c, '.ui2.ui2-v17 .u2-raised:not(.is-glow) { border-color: var(--ui2-v17-go-edge); }'));
plant('a commit with light words', 'L7', (c) => add(c, ".ui2.ui2-v17 .u2-act[data-u2-role='commit'] { color: var(--ui2-v17-ivory); }"));
plant('a danger with dark words', 'L7', (c) => add(c, ".ui2.ui2-v17 .u2-act[data-u2-role='danger'] { color: var(--ui2-v17-on-commit); }"));
plant('the class given over yesterday\'s look', 'L8', (c, s) => s.replace("(!was && v17LookOn() ? ' ui2-v17' : '')", "(v17LookOn() ? ' ui2-v17' : '')"));
plant('the class given always', 'L8', (c, s) => s.replace("(!was && v17LookOn() ? ' ui2-v17' : '')", "' ui2-v17'"));
plant('the switch defaulting OFF', 'L8', (c, s) => s.replace("_v17 = localStorage.getItem(V17_KEY) !== '0';", "_v17 = localStorage.getItem(V17_KEY) === '1';"));
plant('the lone tile left where it was', 'L10', (c) => rep(c, KIT_CSS, '.ui2.ui2-v17 .u2-tile.is-compact.is-lone { justify-content: center; }', '.ui2.ui2-v17 .u2-tile.is-compact.is-lone { justify-content: flex-start; }'));
plant('a stat\'s words left-aligned', 'L10', (c) => rep(c, KIT_CSS, '.ui2.ui2-v17 .u2-stat .u2-stat-words { align-items: center; text-align: center; }', '.ui2.ui2-v17 .u2-stat .u2-stat-words { align-items: flex-start; text-align: left; }'));
plant('an accept still green under the look', 'L9', (c) => add(c, ".ui2.ui2-v17 .u2-act[data-c='green'] { background: var(--ui2-green-face-1); }"));

console.log(failed ? `\n${failed} check(s) failed` : '\nall checks pass');
process.exit(failed ? 1 : 0);
