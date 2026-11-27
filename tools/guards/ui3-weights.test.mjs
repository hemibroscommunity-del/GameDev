/* ═══ v2.3.6780: THREE WEIGHTS, AND A RAISED FACE ONLY ON WHAT CAN BE PRESSED (card UI3-kit) ═══
 *
 * The owner, 2026-11-26 (docs/design/UI_FEEDBACK_2026-11-26.md part 3): "the
 * biggest problem with the new BroTown menus is everything is competing for
 * the same level of attention. Almost every piece of information has its own
 * large beveled button, even when it isn't an actionable or particularly
 * important piece of information", and the three weights: "Navigation
 * buttons: Raised, beveled, prominent. Reserved for destinations and actions.
 * Important statistics: Recessed surfaces with large numbers. No heavy
 * beveling. Supporting information: Flat, aligned within shared containers.
 * No individual heavy borders."
 *
 * This suite reads the SYNTAX TREE of every .jsx under src/ui/ (@babel/parser,
 * as combat-hub.test does) and the RULES of the kit's style sheets (ui2.css
 * and every sheet whose rules start `.ui2`; a small rule reader below, since
 * the server's packages, all CI installs, hold no CSS parser).  A class is read
 * through a string, a template, a `+`, a `[...].join(' ')`, a condition's two
 * branches and a `const` in the same file.  It fails:
 *
 *   R1  a raised face (`u2-raised`) on an element that is not a button (a div
 *       given it "for looks");
 *   R2  a raised face with no live handler (none, `onClick={undefined}`,
 *       `onClick={null}`, `onClick={() => {}}`); a handler is an onClick that
 *       does something, or a spread of a call (`{...frameTap(go)}`);
 *   R3  a `<Ui2Tile>` with no live handler (a tile is a door or an action);
 *   R4  a stat drawn raised: an element with `u2-stat` and `u2-raised`, or a
 *       `<Ui2Stat>` whose className adds `u2-raised` back;
 *   R5  a door drawn as a stat: `<Ui2Stat k="">` with a handler;
 *   R6  a fact given a face: `<Ui2Fact>` / `<Ui2Facts>` with `u2-raised` or
 *       `u2-group`; a sheet's rule on `.u2-fact` with a border, a background
 *       or a shadow of its own (its pressed and focused states excepted);
 *   R7  a stat or fact that opens without its chevron (the kit's button branch
 *       draws none), or a chevron on one that does not open (a chevron neither
 *       inside a button nor drawn on the handler's condition);
 *   R8  a stat's or a facts container's rule with a drop shadow (one not inset),
 *       or a stat's rule on the raised face's colours;
 *   R9  a `color:` reading a token outside the text list (ivory, muted, gold,
 *       on-action, disabled, the brass highlight), or a token that means
 *       something (a grade, good and bad, a count) outside its selectors;
 *   R10 a hex colour in a kit .jsx's inline style (colours are the tokens).
 *
 * R4 and R5 on main when this came are on the allow list
 * (tools/guards/lib/raisedFormsKnown.mjs: WeaponPage 1, SharedPage 1,
 * ItemPage 1; its total only falls, `--write` lowers a count that fell).
 *
 * THE DODGES are planted in the suite itself (part P): each must be red, so
 * the guard cannot rot into a pass.
 *
 * Run: node tools/guards/ui3-weights.test.mjs [--write]
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { RAISED_KNOWN } from './lib/raisedFormsKnown.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const KNOWN_FILE = path.join(ROOT, 'tools/guards/lib/raisedFormsKnown.mjs');
const CEILING = 3;   /* the allow list's total when it came (v2.3.6780): it only falls */

let failed = 0;
function check(name, ok, detail) {
  if (ok) console.log('ok   ' + name);
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '\n     ' + String(typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 1800))); }
}

/* ── the syntax tree ── */
let B = null;
for (const pkg of ['package.json', 'server/package.json']) {
  try { const req = createRequire(new URL('../../' + pkg, import.meta.url)); const tr = req('@babel/traverse'); B = { parse: req('@babel/parser').parse, traverse: tr.default || tr }; break; } catch (e) { /* the next */ }
}
check('0. @babel/parser and traverse load (npm install in the root or server/)', !!B);
if (!B) process.exit(1);
const parse = (src) => B.parse(src, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true });

/* every class word an expression can produce: strings, templates, joins, branches, a const in the file */
function classWords(node, scope, seen = new Set()) {
  const out = new Set();
  const add = (s) => { for (const w of String(s).split(/\s+/)) if (w) out.add(w); };
  const go = (n) => {
    if (!n) return;
    switch (n.type) {
      case 'StringLiteral': add(n.value); break;
      case 'TemplateLiteral': n.quasis.forEach((q) => add(q.value.cooked || '')); n.expressions.forEach(go); break;
      case 'BinaryExpression': go(n.left); go(n.right); break;
      case 'ConditionalExpression': go(n.consequent); go(n.alternate); break;
      case 'LogicalExpression': go(n.left); go(n.right); break;
      case 'ArrayExpression': n.elements.forEach(go); break;
      case 'JSXExpressionContainer': go(n.expression); break;
      case 'CallExpression':
        if (n.callee.type === 'MemberExpression' && n.callee.property && n.callee.property.name === 'join') go(n.callee.object);
        break;
      case 'Identifier': {
        if (seen.has(n.name) || !scope) break;
        seen.add(n.name);
        const b = scope.getBinding(n.name);
        if (b && b.path.isVariableDeclarator() && b.path.node.init) go(b.path.node.init);
        break;
      }
      default: break;
    }
  };
  go(node);
  return out;
}

const attrOf = (open, name) => open.attributes.find((a) => a.type === 'JSXAttribute' && a.name && a.name.name === name) || null;
/* a handler that does something: not undefined, null, or an empty function */
function liveExpr(e) {
  if (!e) return false;
  switch (e.type) {
    case 'Identifier': return e.name !== 'undefined';
    case 'NullLiteral': return false;
    case 'BooleanLiteral': return false;
    case 'ArrowFunctionExpression':
    case 'FunctionExpression':
      if (e.body.type === 'BlockStatement') return e.body.body.length > 0;
      return liveBody(e.body);
    case 'LogicalExpression': return e.operator === '&&' ? liveExpr(e.right) : (liveExpr(e.left) || liveExpr(e.right));
    case 'ConditionalExpression': return liveExpr(e.consequent) || liveExpr(e.alternate);
    case 'UnaryExpression': return e.operator !== 'void';
    default: return true;
  }
}
const liveBody = (b) => !(b.type === 'Identifier' && b.name === 'undefined') && b.type !== 'NullLiteral' && !(b.type === 'UnaryExpression' && b.operator === 'void');
function hasHandler(open) {
  for (const a of open.attributes) {
    if (a.type === 'JSXSpreadAttribute') { if (a.argument.type === 'CallExpression') return true; continue; }
    if (!a.name || !/^on(Click|PointerUp|PointerDown)$/.test(a.name.name)) continue;
    if (!a.value) continue;
    if (a.value.type === 'JSXExpressionContainer' && liveExpr(a.value.expression)) return true;
  }
  return false;
}
const tagName = (open) => (open.name.type === 'JSXIdentifier' ? open.name.name : open.name.type === 'JSXMemberExpression' ? open.name.property.name : '');
const isHost = (t) => /^[a-z]/.test(t);
const roleButton = (open) => { const r = attrOf(open, 'role'); return !!(r && r.value && r.value.type === 'StringLiteral' && r.value.value === 'button'); };
/* the tag an element is drawn as: `const Tag = opens ? 'button' : 'div'` reads as both */

/* is a node, or an identifier it names (one const deep, followed), a chevron? */
function holdsChev(node, scope, seen = new Set()) {
  let hit = false;
  const visit = (n) => {
    if (!n || hit || typeof n !== 'object') return;
    if (Array.isArray(n)) { n.forEach(visit); return; }
    if (n.type === 'JSXElement') {
      const c = attrOf(n.openingElement, 'className');
      if (c && classWords(c.value, scope).has('u2-chev')) { hit = true; return; }
    }
    if (n.type === 'Identifier' && scope && !seen.has(n.name)) {
      seen.add(n.name);
      const b = scope.getBinding(n.name);
      if (b && b.path.isVariableDeclarator() && b.path.node.init) visit(b.path.node.init);
      return;
    }
    for (const k of Object.keys(n)) if (k !== 'loc' && k !== 'start' && k !== 'end' && k !== 'leadingComments' && k !== 'trailingComments') visit(n[k]);
  };
  visit(node);
  return hit;
}
/* does an expression read the handler (onClick, or a const made from it)? */
function readsHandler(e, scope, seen = new Set()) {
  let hit = false;
  const visit = (n) => {
    if (!n || hit || typeof n !== 'object') return;
    if (Array.isArray(n)) { n.forEach(visit); return; }
    if (n.type === 'Identifier') {
      if (n.name === 'onClick') { hit = true; return; }
      if (scope && !seen.has(n.name)) {
        seen.add(n.name);
        const b = scope.getBinding(n.name);
        if (b && b.path.isVariableDeclarator() && b.path.node.init) visit(b.path.node.init);
      }
      return;
    }
    for (const k of Object.keys(n)) if (k !== 'loc' && k !== 'start' && k !== 'end') visit(n[k]);
  };
  visit(e);
  return hit;
}

/** The faults of one .jsx source: [{ rule, line, what }]. */
export function jsxFaults(file, src) {
  const faults = [];
  const put = (rule, node, what) => faults.push({ rule, line: node && node.loc ? node.loc.start.line : 0, what });
  const kitFile = /(^|\/)src\/ui\/kit\//.test(file);
  B.traverse(parse(src), {
    JSXOpeningElement(p) {
      const open = p.node;
      const t = tagName(open);
      const c = attrOf(open, 'className');
      const words = c ? classWords(c.value, p.scope) : new Set();
      const handler = hasHandler(open);
      if (isHost(t)) {
        if (words.has('u2-raised')) {
          if (t !== 'button' && !roleButton(open)) put('R1', open, `<${t}> wears the raised face but is not a button`);
          if (!handler) put('R2', open, `<${t} className="u2-raised ..."> has no live handler`);
          if (words.has('u2-stat')) put('R4', open, 'a stat drawn raised (u2-stat with u2-raised)');
        }
        if (words.has('u2-fact') && (words.has('u2-raised') || words.has('u2-group'))) put('R6', open, 'a fact row given a face of its own');
        if (words.has('u2-chev')) {
          /* inside a button (or a raised face), or drawn on the handler's condition */
          let ok = false;
          for (let q = p.parentPath; q && !ok; q = q.parentPath) {
            if (q.isJSXElement() && q.node !== p.parent) {
              const o = q.node.openingElement;
              const tt = tagName(o);
              if ((tt === 'button' || roleButton(o)) && hasHandler(o)) ok = true;
            }
            if ((q.isConditionalExpression() || q.isLogicalExpression()) && readsHandler(q.isConditionalExpression() ? q.node.test : q.node.left, p.scope)) {
              const test = q.isConditionalExpression() ? q.node.test : q.node.left;
              const negated = test.type === 'UnaryExpression' && test.operator === '!';
              const onElse = q.isConditionalExpression() && q.node.alternate && p.findParent((x) => x.node === q.node.alternate);
              if (!negated && !onElse) ok = true;
            }
            if (q.isFunction()) break;
          }
          if (!ok) put('R7', open, 'a chevron on a thing that does not open');
        }
        if (kitFile) {
          const st = attrOf(open, 'style');
          if (st && st.value) {
            const hex = [];
            p.get('attributes').forEach((ap) => {
              if (ap.node !== st) return;
              ap.traverse({
                StringLiteral(s) { if (/#[0-9A-Fa-f]{3,8}\b/.test(s.node.value)) hex.push(s.node.value); },
                TemplateElement(s) { if (/#[0-9A-Fa-f]{3,8}\b/.test(s.node.value.cooked || '')) hex.push(s.node.value.cooked); },
              });
            });
            if (hex.length) put('R10', open, 'a hex colour in a kit inline style: ' + hex.join(' '));
          }
        }
        return;
      }
      if (t === 'Ui2Tile' && !handler) put('R3', open, '<Ui2Tile> with no live handler (a tile is a door or an action)');
      if (t === 'Ui2Stat') {
        if (words.has('u2-raised')) put('R4', open, '<Ui2Stat> given u2-raised through its className');
        const k = attrOf(open, 'k');
        const empty = k && ((k.value && k.value.type === 'StringLiteral' && k.value.value === '')
          || (k.value && k.value.type === 'JSXExpressionContainer' && k.value.expression.type === 'StringLiteral' && k.value.expression.value === ''));
        if (empty && handler) put('R5', open, '<Ui2Stat k=""> with a handler: a door drawn as a stat');
      }
      if ((t === 'Ui2Fact' || t === 'Ui2Facts') && (words.has('u2-raised') || words.has('u2-group'))) put('R6', open, `<${t}> given ${words.has('u2-raised') ? 'u2-raised' : 'u2-group'}`);
      if (t !== 'Ui2Tile' && t !== 'Ui2Stat' && words.has('u2-raised')) put('R1', open, `<${t}> given the raised face through its className`);
    },
  });
  /* R7, the other way: the kit's stat and fact, where they open, draw the chevron in the button */
  if (/(^|\/)src\/ui\/kit\/(Group|Facts)\.jsx$/.test(file)) {
    B.traverse(parse(src), {
      FunctionDeclaration(fp) {
        const nm = fp.node.id && fp.node.id.name;
        if (nm !== 'Ui2Stat' && nm !== 'Ui2Fact') return;
        let buttons = 0;
        let bare = 0;
        fp.traverse({
          JSXElement(ep) {
            if (tagName(ep.node.openingElement) !== 'button') return;
            buttons++;
            if (!holdsChev(ep.node.children, ep.scope)) bare++;
          },
        });
        if (!buttons) put('R7', fp.node, `${nm} draws no button (a stat or fact that opens is a button)`);
        if (bare) put('R7', fp.node, `${nm}'s button draws no chevron (it opens, so it wears one)`);
      },
    });
  }
  return faults;
}

/* ── the style sheets: a small rule reader (comments out; at-rules' blocks walked) ── */
export function cssRules(text) {
  const src = text.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [];
  let i = 0;
  const block = (end, at) => {
    while (i < src.length) {
      let j = i;
      let depth = 0;
      while (j < src.length && !(depth === 0 && (src[j] === '{' || src[j] === '}'))) { if (src[j] === '(') depth++; else if (src[j] === ')') depth--; j++; }
      if (j >= src.length) { i = j; return; }
      if (src[j] === '}') { i = j + 1; return; }
      const sel = src.slice(i, j).trim().replace(/^[^{]*;\s*/, '');
      i = j + 1;
      if (/^@(media|supports|container|layer)/.test(sel)) { block('}', sel); continue; }
      if (/^@/.test(sel)) { let d = 1; while (i < src.length && d) { if (src[i] === '{') d++; else if (src[i] === '}') d--; i++; } continue; }
      let k = i;
      let paren = 0;
      while (k < src.length && !(paren === 0 && src[k] === '}')) { if (src[k] === '(') paren++; else if (src[k] === ')') paren--; k++; }
      const body = src.slice(i, k);
      i = k + 1;
      const decls = [];
      let buf = '';
      let pd = 0;
      for (const ch of body) {
        if (ch === '(') pd++;
        if (ch === ')') pd--;
        if (ch === ';' && pd === 0) { decls.push(buf); buf = ''; } else buf += ch;
      }
      decls.push(buf);
      rules.push({ sel, at: at || '', decls: decls.map((d) => d.trim()).filter(Boolean).map((d) => { const x = d.indexOf(':'); return { prop: d.slice(0, x).trim().toLowerCase(), value: d.slice(x + 1).trim() }; }) });
    }
  };
  block(null, '');
  return rules;
}

/* the text colours (part 6: "consistent off-white text throughout, gold for progression and important
   numbers, and other colors only when they communicate something meaningful") */
export const TEXT_TOKENS = Object.freeze(['text-ivory', 'text-muted', 'text-gold', 'text-on-action', 'text-disabled', 'brass-highlight']);
/* the colours that mean something, and the selectors they mean it on: [token pattern, selector pattern, why] */
export const MEANING = Object.freeze([
  [/^grade-(rare|elite|elite-light|godly)$/, /\[data-grade=/, 'an item\'s grade'],
  [/^grade-rare$/, /\.is-hidden\b|\.u2-gp-hidden\b/, 'a hidden line ("?"): the rare blue'],
  [/^green-face-0$/, /\.is-good\b/, 'a change for the better'],
  [/^red-face-0$/, /\.is-bad\b/, 'a change for the worse'],
  [/^mark-count-text$/, /\.u2-badge\b/, 'a count badge\'s figure'],
]);
const lastCompound = (one) => one.trim().split(/\s*[\s>+~]\s*/).pop() || '';
const hasClass = (compound, cls) => new RegExp('\\.' + cls.replace(/-/g, '\\-') + '(?![\\w-])').test(compound);
const quietValue = (v) => /^(none|0|0px|transparent|0 none|none 0)$/i.test(v.trim());
/* split on the commas at depth 0 (a shadow's colour is rgba(.., var(..)): nested) */
const topSplit = (v) => { const out = []; let d = 0; let buf = ''; for (const ch of v) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && d === 0) { out.push(buf); buf = ''; } else buf += ch; } out.push(buf); return out.map((x) => x.trim()); };
const outerShadow = (v) => !/^none$/i.test(v.trim()) && topSplit(v).some((x) => !/\binset\b/.test(x));

/** The faults of one style sheet's text. */
export function cssFaults(file, text) {
  const faults = [];
  for (const r of cssRules(text)) {
    const sels = topSplit(r.sel);
    for (const d of r.decls) {
      if (d.prop === 'color') {
        const v = d.value.trim();
        if (/^(inherit|transparent|currentcolor)$/i.test(v)) continue;
        const m = /^var\(\s*--ui2-([a-z0-9-]+)\s*\)$/.exec(v);
        const tok = m ? m[1] : null;
        if (tok && TEXT_TOKENS.includes(tok)) continue;
        const meant = tok && MEANING.some(([tp, sp]) => tp.test(tok) && sels.every((s) => sp.test(s)));
        if (!meant) faults.push({ rule: 'R9', line: 0, what: `${file}: ${r.sel} { color: ${v} } (not a text colour, nor a meaning on its selector)` });
      }
    }
    for (const s of sels) {
      const lc = lastCompound(s);
      const state = /:active|\.is-press|:focus|\.is-focus/.test(lc);
      if (hasClass(lc, 'u2-fact') && !state) {
        for (const d of r.decls) {
          if (/^(border|border-[a-z-]+|background|background-[a-z-]+|box-shadow|outline)$/.test(d.prop) && !/^border-radius$/.test(d.prop) && !quietValue(d.value)) {
            faults.push({ rule: 'R6', line: 0, what: `${file}: ${s} { ${d.prop}: ${d.value} } (a fact row has no face of its own)` });
          }
        }
      }
      const stat = hasClass(lc, 'u2-stat') && !hasClass(lc, 'u2-raised') && !/:not\(\.u2-stat/.test(lc);
      const facts = hasClass(lc, 'u2-facts');
      if (stat || facts) {
        for (const d of r.decls) {
          if (d.prop === 'box-shadow' && outerShadow(d.value)) faults.push({ rule: 'R8', line: 0, what: `${file}: ${s} { box-shadow: ${d.value} } (sunk: no drop shadow)` });
          if (stat && /^background/.test(d.prop) && /--ui2-raised-/.test(d.value)) faults.push({ rule: 'R8', line: 0, what: `${file}: ${s} wears the raised face's colours` });
        }
      }
    }
  }
  return faults;
}

/* ── the files ── */
function walkDir(dir, ext, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkDir(p, ext, out);
    else if (e.name.endsWith(ext)) out.push(p);
  }
  return out;
}
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
const JSX = walkDir(path.join(ROOT, 'src/ui'), '.jsx').map(rel).sort();
const SHEETS = walkDir(path.join(ROOT, 'src/ui'), '.css').map(rel).sort()
  .filter((f) => f === 'src/ui/kit/ui2.css' || cssRules(fs.readFileSync(path.join(ROOT, f), 'utf8')).some((r) => /^\.ui2\b/.test(r.sel)));

const ALLOWED_RULES = new Set(['R4', 'R5']);   /* the only faults the allow list may hold */

/* ── 1. the tree ── */
const byFile = Object.create(null);
let raisedSeen = 0;
let jsxRead = 0;
for (const f of JSX) {
  const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
  if (!/className|Ui2Tile|Ui2Stat|Ui2Fact/.test(src)) continue;
  jsxRead++;
  raisedSeen += (src.match(/u2-raised|<Ui2Tile\b/g) || []).length;
  const fl = jsxFaults(f, src);
  if (fl.length) byFile[f] = fl;
}
{
  const hard = [];
  for (const f of Object.keys(byFile)) for (const x of byFile[f]) if (!ALLOWED_RULES.has(x.rule)) hard.push(`${f}:${x.line} ${x.rule} ${x.what}`);
  check(`1. no raised face on a thing that cannot be pressed, no fact with a face, every chevron honest, no hex in the kit's styles (${jsxRead} files read, ${raisedSeen} raised forms seen)`,
    hard.length === 0 && jsxRead > 20 && raisedSeen > 15, hard.join('\n     ') || `${jsxRead} files, ${raisedSeen} forms`);
}
/* ── 2. a stat drawn raised, a door drawn as a stat: only the allow list's, and its count only falls ── */
{
  const counts = Object.create(null);
  for (const f of Object.keys(byFile)) { const n = byFile[f].filter((x) => ALLOWED_RULES.has(x.rule)).length; if (n) counts[f] = n; }
  const over = [];
  for (const f of Object.keys(counts)) if (counts[f] > (RAISED_KNOWN[f] || 0)) over.push(`${f}: ${counts[f]} (allowed ${RAISED_KNOWN[f] || 0}): ` + byFile[f].filter((x) => ALLOWED_RULES.has(x.rule)).map((x) => `:${x.line} ${x.what}`).join('; '));
  const fell = Object.keys(RAISED_KNOWN).filter((f) => (counts[f] || 0) < RAISED_KNOWN[f]);
  const total = Object.values(RAISED_KNOWN).reduce((a, b) => a + b, 0);
  if (process.argv.includes('--write') && fell.length) {
    const next = {};
    for (const f of Object.keys(RAISED_KNOWN).sort()) { const n = Math.min(RAISED_KNOWN[f], counts[f] || 0); if (n) next[f] = n; }
    let txt = fs.readFileSync(KNOWN_FILE, 'utf8');
    const body = Object.keys(next).map((f) => `  '${f}': ${next[f]},`).join('\n');
    txt = txt.replace(/export const RAISED_KNOWN = Object\.freeze\(\{[\s\S]*?\}\);/, `export const RAISED_KNOWN = Object.freeze({\n${body}${body ? '\n' : ''}});`);
    fs.writeFileSync(KNOWN_FILE, txt);
    console.log('wrote tools/guards/lib/raisedFormsKnown.mjs: ' + fell.join(', ') + ' fell');
  }
  check(`2a. a stat drawn raised or a door drawn as a stat only where the allow list holds it (${Object.keys(counts).length} files)`, over.length === 0, over.join('\n     '));
  check(`2b. the allow list's total only falls (${total}, ceiling ${CEILING})`, total <= CEILING && Object.values(RAISED_KNOWN).every((n) => Number.isInteger(n) && n > 0), total);
  check('2c. a count that fell is written down (`--write` lowers it; it never raises one)', process.argv.includes('--write') || fell.length === 0, fell.join(', '));
}
/* ── 3. the style sheets ── */
{
  const all = [];
  for (const f of SHEETS) all.push(...cssFaults(f, fs.readFileSync(path.join(ROOT, f), 'utf8')));
  const rules = SHEETS.reduce((n, f) => n + cssRules(fs.readFileSync(path.join(ROOT, f), 'utf8')).length, 0);
  check(`3. the kit's sheets: every text colour from the text list or a meaning on its selector, no fact with a face, no stat with a drop shadow (${SHEETS.length} sheets, ${rules} rules)`,
    all.length === 0 && SHEETS.length >= 5 && rules > 200, all.map((x) => x.what).join('\n     ') || `${SHEETS.length} sheets, ${rules} rules`);
}
/* ── 4. the kit draws the three weights as the owner asked ── */
{
  const css = fs.readFileSync(path.join(ROOT, 'src/ui/kit/ui2.css'), 'utf8');
  const R = cssRules(css);
  const rule = (sel) => R.filter((r) => topSplit(r.sel).includes(sel));
  const decl = (sel, prop) => { for (const r of rule(sel)) for (const d of r.decls) if (d.prop === prop) return d.value; return null; };
  const raisedShadow = decl('.ui2 .u2-raised', 'box-shadow') || '';
  const statShadow = decl('.ui2 .u2-stat:not(.u2-raised)', 'box-shadow') || '';
  const factsShadow = decl('.ui2 .u2-facts', 'box-shadow') || '';
  const big = decl('.ui2 .u2-stat:not(.u2-raised) .u2-stat-v', 'font-size');
  const idx = fs.readFileSync(path.join(ROOT, 'src/ui/kit/index.js'), 'utf8');
  check('4a. raised has a drop shadow; the stat and the facts container only inner ones; the stat\'s number is the large size',
    outerShadow(raisedShadow) && statShadow && !outerShadow(statShadow) && factsShadow && !outerShadow(factsShadow) && big === 'var(--ui2-fs-big)',
    { raisedShadow, statShadow, factsShadow, big });
  check('4b. the kit names its three weights (Ui2Tile, Ui2Stat, Ui2Facts and Ui2Fact) in src/ui/kit/index.js',
    /export \{[^}]*\bUi2Tile\b/.test(idx) && /export \{[^}]*\bUi2Stat\b/.test(idx) && /export \{ Ui2Facts, Ui2Fact \}/.test(idx), '');
  const nav = [decl('.ui2 .u2-tile-label', 'font-size'), (rule('.ui2 .u2-ctl').map((r) => (r.decls.find((d) => d.prop === 'font-size') || {}).value).filter(Boolean)[0])];
  check('4c. one type on every navigation button: the tile\'s label and the header\'s control read --ui2-fs-nav', nav.every((v) => v === 'var(--ui2-fs-nav)'), nav);
}

/* ── P. the dodges, planted: each must be red ── */
{
  const groupSrc = fs.readFileSync(path.join(ROOT, 'src/ui/kit/Group.jsx'), 'utf8');
  const factsSrc = fs.readFileSync(path.join(ROOT, 'src/ui/kit/Facts.jsx'), 'utf8');
  const sheet = fs.readFileSync(path.join(ROOT, 'src/ui/kit/ui2.css'), 'utf8');
  const H = (body) => `import React from 'react';\nexport function X({ go }) {\n  return (<div>${body}</div>);\n}\n`;
  const red = (name, faults, rule) => check(`P. planted: ${name} is red (${rule})`, faults.some((x) => x.rule === rule), faults);
  const green = (name, faults) => check(`P. planted: ${name} is green`, faults.length === 0, faults);
  const at = 'src/ui/mobile/dash/Planted.jsx';
  red('a Ui2Tile with no handler', jsxFaults(at, H('<Ui2Tile label="Bro" art="x" />')), 'R3');
  red('a Ui2Tile whose handler is an empty arrow', jsxFaults(at, H('<Ui2Tile label="Bro" onClick={() => {}} />')), 'R3');
  red('a div given u2-raised "for looks"', jsxFaults(at, H('<div className="u2-raised u2-x">7</div>')), 'R1');
  red('a raised button with onClick={undefined}', jsxFaults(at, H('<button type="button" className="u2-raised" onClick={undefined}>A</button>')), 'R2');
  red('a raised button with onClick={() => {}}', jsxFaults(at, H('<button type="button" className="u2-raised" onClick={() => {}}>A</button>')), 'R2');
  red('a raised button with no handler at all', jsxFaults(at, H('<button type="button" className={\'u2-raised u2-door\' + (go ? \' is-on\' : \'\')}>A</button>')), 'R2');
  red('the raised class through a const string', jsxFaults(at, `const LOOK = 'u2-raised u2-box';\nexport function X() { return <div className={LOOK}>7</div>; }\n`), 'R1');
  red('the raised class through a template', jsxFaults(at, H('<span className={`u2-${go ? \'a\' : \'b\'} u2-raised`}>7</span>')), 'R1');
  red('the raised class through a join', jsxFaults(at, `export function X() { const c = ['u2-raised', 'u2-tile'].join(' '); return <div className={c}>7</div>; }\n`), 'R1');
  red('a Ui2Stat whose className re-adds u2-raised', jsxFaults(at, H('<Ui2Stat v="9" k="DPS" className="u2-raised u2-stat" onClick={go} />')), 'R4');
  red('the kit\'s Ui2Stat drawing u2-raised', jsxFaults('src/ui/kit/Group.jsx', groupSrc.replace("const cls = 'u2-stat'", "const cls = 'u2-raised u2-stat'")), 'R4');
  red('a Ui2Fact given u2-group', jsxFaults(at, H('<Ui2Facts><Ui2Fact k="Clan" v="No clan" className="u2-group" /></Ui2Facts>')), 'R6');
  red('a Ui2Fact given u2-raised', jsxFaults(at, H('<Ui2Facts><Ui2Fact k="Clan" v="No clan" className="u2-raised" onClick={go} /></Ui2Facts>')), 'R6');
  red('.u2-fact given a border in the sheet', cssFaults('ui2.css', sheet + '\n.ui2 .u2-fact { border: 1px solid var(--ui2-line); }\n'), 'R6');
  red('.u2-fact given a background in the sheet', cssFaults('ui2.css', sheet + '\n.ui2 .u2-facts .u2-fact { background: var(--ui2-well); }\n'), 'R6');
  red('.u2-fact given a box-shadow in the sheet', cssFaults('ui2.css', sheet + '\n.ui2 button.u2-fact { box-shadow: 0 1px 0 rgba(0, 0, 0, 0.4); }\n'), 'R6');
  red('a stat that opens without its chevron (the kit\'s button branch)', jsxFaults('src/ui/kit/Group.jsx', groupSrc.replace('{art_}{words}{chev}\n      </button>', '{art_}{words}\n      </button>')), 'R7');
  red('a fact that opens without its chevron', jsxFaults('src/ui/kit/Facts.jsx', factsSrc.replace("{opens ? <span className=\"u2-chev\" aria-hidden=\"true\">{'›'}</span> : null}", '{null}')), 'R7');
  red('a chevron on a stat that does not open (drawn always)', jsxFaults('src/ui/kit/Group.jsx', groupSrc.replace("const chev = opens ? <span className=\"u2-chev\" aria-hidden=\"true\">{'›'}</span> : null;", "const chev = <span className=\"u2-chev\" aria-hidden=\"true\">{'›'}</span>;")), 'R7');
  red('a chevron on the not-opening branch', jsxFaults('src/ui/kit/Group.jsx', groupSrc.replace("const chev = opens ? <span className=\"u2-chev\" aria-hidden=\"true\">{'›'}</span> : null;", "const chev = opens ? null : <span className=\"u2-chev\" aria-hidden=\"true\">{'›'}</span>;")), 'R7');
  red('a chevron beside a plain value', jsxFaults(at, H('<div className="u2-group"><b>7</b><span className="u2-chev">›</span></div>')), 'R7');
  red('<Ui2Stat k=""> with a handler (a door hiding as a stat)', jsxFaults(at, H('<Ui2Stat v="Equipment" k="" onClick={go} />')), 'R5');
  red('<Ui2Stat k={\'\'}> with a spread handler', jsxFaults(at, H('<Ui2Stat v="Equipment" k={\'\'} {...frameTap(go)} />')), 'R5');
  red('a color: reading a token outside the text list', cssFaults('ui2.css', '.ui2 .u2-x { color: var(--ui2-raised-top); }'), 'R9');
  red('a color: reading a meaning token off its selector', cssFaults('ui2.css', '.ui2 .u2-x { color: var(--ui2-grade-godly); }'), 'R9');
  red('a color: written as rgba', cssFaults('ui2.css', '.ui2 .u2-x { color: rgba(255, 255, 255, 0.8); }'), 'R9');
  red('a stat\'s rule with a drop shadow', cssFaults('ui2.css', '.ui2 .u2-stat { box-shadow: inset 0 1px 0 #000, 0 2px 0 rgba(0, 0, 0, 0.4); }'), 'R8');
  red('the facts container with a drop shadow', cssFaults('ui2.css', '.ui2 .u2-facts.is-row { box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3); }'), 'R8');
  red('a hex in a kit .jsx\'s inline style', jsxFaults('src/ui/kit/Planted.jsx', H('<span style={{ color: \'#BCC8CC\', margin: 2 }}>7</span>')), 'R10');
  red('a hex in a kit inline style\'s template', jsxFaults('src/ui/kit/Planted.jsx', H('<span style={{ border: `1px solid #4B6275` }}>7</span>')), 'R10');
  /* and what must stay green: a door with a handler, a spread call, a stat that does not open, a meaning on its selector */
  green('a raised button with a handler, a tile with a spread call, a stat with none, a fact that opens',
    jsxFaults(at, H('<button type="button" className="u2-raised u2-door" onClick={() => go(1)}>A</button><Ui2Tile label="Bro" {...frameTap(go)} /><Ui2Stat v="9" k="DPS" /><Ui2Facts><Ui2Fact k="Clan" v="x" onClick={go} /></Ui2Facts><button type="button" className="u2-raised" onClick={go}><span className="u2-chev">›</span></button>')));
  green('a meaning colour on its selector, and the text list', cssFaults('x.css', ".ui2 .u2-item-grade[data-grade='godly'] { color: var(--ui2-grade-godly); }\n.ui2 .u2-x { color: var(--ui2-text-gold); }\n.ui2 .u2-badge { color: var(--ui2-mark-count-text); }"));
  /* the allow list: a count raised past the list is red (simulated on a file the list does not hold) */
  const plantedCount = jsxFaults('src/ui/mobile/sheet/WeaponPage.jsx', H('<Ui2Stat v="9" k="DPS" className="u2-raised u2-stat" onClick={go} /><Ui2Stat v="8" k="HP" className="u2-raised u2-stat" onClick={go} />'))
    .filter((x) => ALLOWED_RULES.has(x.rule)).length;
  check('P. planted: a second raised stat in WeaponPage.jsx is over its allowance (2 > 1)', plantedCount > (RAISED_KNOWN['src/ui/mobile/sheet/WeaponPage.jsx'] || 0), plantedCount);
}

console.log(failed ? `\n${failed} check(s) failed` : '\nall checks pass');
process.exit(failed ? 1 : 0);
