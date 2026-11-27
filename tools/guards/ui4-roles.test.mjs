/* ═══ v2.3.6840: EVERY PIECE OF A MENU SAYS WHAT IT IS, BY A ROLE ITS CODE NAMES (card UI4 PR 1, the owner's V17) ═══
 *
 * The owner's menu redesign, V17 (docs/design/v17/MASTER-IMPLEMENTATION.md):
 * "Clearly distinguish passive facts, inspectable facts, navigation/
 * preparation, selected controls and commitments throughout every menu. Do
 * not make information compete with actions" (line 9); "Use explicit semantic
 * role props at component creation (not runtime regex/classification as in
 * the prototype). No two identical appearances for a passive metric and a
 * spend action" (line 49).
 *
 * The roles are ONE table, src/game/uiRoles.js (the nine of V17:39-47, with
 * the game's names), and a kit piece is made with one (`intent`).  The calls
 * on main when this came, made with yesterday's props, are mapped in ONE place
 * (ui2Role) and counted on the allow list (tools/guards/lib/rolesKnown.mjs:
 * its total only falls).  This suite reads the SYNTAX TREE of every .jsx under
 * src/ui/ and every file of src/ui/kit/ (@babel/parser, as ui3-weights does),
 * and runs the table's and the new pieces' rules.  It fails:
 *
 *   G1  a kit piece that asks for a role (Ui2Action, Ui2Tile, Ui2Stat,
 *       Ui2Fact) made with no `intent`, past its file's count on the list;
 *   G2  an `intent` that is not one of the nine, or one that piece cannot
 *       take (a stat cannot commit); a `data-u2-role` that is not one of nine;
 *   G3  a role that is pressed (inspect, go, adjust, commit, danger) on a
 *       thing with no live handler (none, `onClick={undefined}`, `() => {}`);
 *       a tab, a stat you inspect, a card with none; a stepper with no
 *       onChange; an overlay with no onClose (a window you cannot leave);
 *   G4  a passive fact given a pressable form: `intent="info"` with a
 *       handler; a `data-u2-role="info"` on a button, a role="button" or a
 *       raised face; a comparison given a handler;
 *   G5  a role decided by a handler's presence OUTSIDE the one place: in the
 *       kit, `typeof onClick`, `!!onClick`, `onClick != null`, a handler
 *       assigned as a flag, or a handler as the test that picks a form or a
 *       class (`onClick ? <button> : <div>`, `if (onClick) return <button>`);
 *   G6  an Action whose role its colour contradicts (`intent="danger"
 *       c="gold"`, `intent="commit" c="red"`);
 *   G7  a kit piece that takes a role but does not ask ui2Role() for it, or
 *       draws a root without `data-u2-role`;
 *   G8  a piece exported by src/ui/kit/index.js that the table does not name,
 *       or a row the kit does not export.
 * THE DODGES are planted in the suite itself (part P): each must be red.
 *
 * Run: node tools/guards/ui4-roles.test.mjs [--write]
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { UI_ROLES, UI_ROLE_IDS, KIT_PIECES, ASKED_PIECES, ROLE_FACE, ROLE_FACES, FACE_ROLE, HEADER_ROLES, ui2Role, uiRole } from '../../src/game/uiRoles.js';
import { ui2Delta, ui2Num, ui2Step, ui2StepEnds } from '../../src/game/kitRules.js';
import { ROLES_KNOWN } from './lib/rolesKnown.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const KNOWN_FILE = path.join(ROOT, 'tools/guards/lib/rolesKnown.mjs');
const CEILING = 78;   /* the allow list's total when it came (v2.3.6840): it only falls */

let failed = 0;
function check(name, ok, detail) {
  if (ok) console.log('ok   ' + name);
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '\n     ' + String(typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 1800))); }
}

/* ── T. the table: the nine roles, V17's lines, and the one mapping of yesterday's props ── */
{
  check('T1. the nine roles, in V17\'s order, with the game\'s names', UI_ROLE_IDS.join() === 'info,inspect,go,selected,adjust,commit,danger,disabled,slot', UI_ROLE_IDS);
  check('T2. each row names its V17 line (39 to 47) and its press', UI_ROLES.every((r, i) => r.line === 39 + i && /^(must|never|may)$/.test(r.press) && r.v17 && r.says), UI_ROLES);
  check('T3. a fact is never pressed; inspect, go, adjust, commit and danger always are',
    uiRole('info').press === 'never' && ['inspect', 'go', 'adjust', 'commit', 'danger'].every((id) => uiRole(id).press === 'must'));
  check('T4. uiRole() of a name that is no role (or __proto__) is null', uiRole('button') === null && uiRole('__proto__') === null && uiRole(undefined) === null);
  const fn = () => {};
  /* yesterday's props, each mapped to its role, and the look kept (the face, the form) */
  const cases = [
    ['Ui2Stat', {}, 'info', false], ['Ui2Stat', { onClick: fn }, 'inspect', true],
    ['Ui2Fact', {}, 'info', false], ['Ui2Fact', { onClick: fn }, 'inspect', true],
    ['Ui2Tile', { onClick: fn }, 'go', true], ['Ui2Tile', { onClick: fn, selected: true }, 'selected', true],
    ['Ui2Action', { onClick: fn }, 'commit', true], ['Ui2Action', { c: 'green', onClick: fn }, 'commit', true],
    ['Ui2Action', { c: 'blue', onClick: fn }, 'go', true], ['Ui2Action', { c: 'red', onClick: fn }, 'danger', true],
    ['Ui2Action', { c: 'silver', onClick: fn }, 'adjust', true], ['Ui2Action', { c: 'gold', disabled: true }, 'disabled', false],
    ['Ui2Slot', {}, 'slot', false], ['Ui2Slot', { onClick: fn }, 'slot', true],
    ['Ui2Tab', { onClick: fn }, 'go', true], ['Ui2Tab', { onClick: fn, selected: true }, 'selected', true],
  ];
  const wrong = cases.filter(([p, props, role, press]) => { const r = ui2Role(p, props); return r.role !== role || r.press !== press || r.named; });
  check('T5. yesterday\'s props map to their role in ONE place (a handler, a colour, `selected`), not named', wrong.length === 0, wrong);
  const faces = ['gold', 'green', 'blue', 'red', 'silver', undefined].map((c) => ui2Role('Ui2Action', { c, onClick: fn }).face);
  check('T6. an Action keeps its face: its colour if given, else gold (today\'s default)', faces.join() === 'gold,green,blue,red,silver,gold', faces);
  const named = ['commit', 'danger', 'adjust', 'go'].map((i) => ui2Role('Ui2Action', { intent: i, onClick: fn }));
  check('T7. an Action made with an intent and no colour wears today\'s face for that role', named.map((r) => r.face).join() === 'gold,red,silver,blue' && named.every((r) => r.named), named);
  check('T8. each role\'s face is one it may wear, and every face\'s role takes it back',
    Object.keys(ROLE_FACE).every((r) => ROLE_FACES[r].includes(ROLE_FACE[r])) && Object.keys(FACE_ROLE).every((c) => ROLE_FACES[FACE_ROLE[c]].includes(c)));
  check('T9. an intent the piece cannot take is not obeyed (a stat that would commit stays what its props say)',
    ui2Role('Ui2Stat', { intent: 'commit' }).role === 'info' && ui2Role('Ui2Stat', { intent: 'commit' }).named === false && ui2Role('Ui2Stat', { intent: 'inspect', onClick: fn }).named === true);
  check('T10. off is off: a disabled Action is the disabled role whatever its intent', ui2Role('Ui2Action', { intent: 'commit', disabled: true }).role === 'disabled');
  check('T11. an info stat is never a button, even handed a handler (the guard\'s G4 fails the call itself)', ui2Role('Ui2Stat', { intent: 'info', onClick: fn }).press === false);
  check('T12. the header: Back and Menu go, Close adjusts (a dismiss, V17:43)', HEADER_ROLES.back === 'go' && HEADER_ROLES.menu === 'go' && HEADER_ROLES.close === 'adjust');
  check('T13. every role a piece may take is one of the nine; the asked pieces are the four', Object.values(KIT_PIECES).every((r) => r.frame || (r.roles && r.roles.length && r.roles.every((x) => UI_ROLE_IDS.includes(x))))
    && ASKED_PIECES.slice().sort().join() === 'Ui2Action,Ui2Fact,Ui2Stat,Ui2Tile', ASKED_PIECES);
}

/* ── K. the new pieces' rules (src/game/kitRules.js) ── */
{
  const D = (a, b, o) => { const d = ui2Delta(a, b, o); return d.dir + ' ' + d.text + ' ' + d.good; };
  check('K1. a difference is written with its sign (V17:49 "signed text"): up, down, the minus sign',
    D(26, 31) === 'up +5 true' && D(2.1, 1.9) === 'down −0.2 false' && D(120, 99) === 'down −21 false', [D(26, 31), D(2.1, 1.9), D(120, 99)]);
  check('K2. less is better where it is (a cooldown): down is good', D(4, 3, { lower: true }) === 'down −1 true' && D(3, 4, { lower: true }) === 'up +1 false');
  check('K3. no change is "same" and neither good nor bad; nothing to compare is "none"', D(5, 5) === 'same 0 null' && D(5.01, 5.04) === 'same 0 null' && D(null, 4) === 'none  null' && D('x', 4) === 'none  null');
  check('K4. exact large numbers (V17:7): a whole number is written whole', ui2Num(1234567) === '1234567' && ui2Delta(1000000, 1234567).text === '+234567' && ui2Num(2.25, 2) === '2.25');
  check('K5. the stepper never passes its ends, steps whole numbers, and says which end is off',
    ui2Step(3, 1, { max: 40 }) === 4 && ui2Step(40, 1, { max: 40 }) === 40 && ui2Step(0, -1, {}) === 0 && ui2Step(2.6, 0, {}) === 3 && ui2Step(5, 2, { step: 5, max: 12 }) === 12
    && JSON.stringify(ui2StepEnds(0, { max: 5 })) === '{"less":false,"more":true}' && JSON.stringify(ui2StepEnds(5, { max: 5 })) === '{"less":true,"more":false}');
}

/* ── the syntax tree ── */
let B = null;
for (const pkg of ['package.json', 'server/package.json']) {
  try { const req = createRequire(new URL('../../' + pkg, import.meta.url)); const tr = req('@babel/traverse'); B = { parse: req('@babel/parser').parse, traverse: tr.default || tr }; break; } catch (e) { /* the next */ }
}
check('0. @babel/parser and traverse load (npm install in the root or server/)', !!B);
if (!B) process.exit(1);
const parse = (src) => B.parse(src, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true });

const attrOf = (open, name) => open.attributes.find((a) => a.type === 'JSXAttribute' && a.name && a.name.name === name) || null;
function liveExpr(e) {
  if (!e) return false;
  switch (e.type) {
    case 'Identifier': return e.name !== 'undefined';
    case 'NullLiteral': case 'BooleanLiteral': return false;
    case 'ArrowFunctionExpression': case 'FunctionExpression':
      if (e.body.type === 'BlockStatement') return e.body.body.length > 0;
      return !(e.body.type === 'Identifier' && e.body.name === 'undefined') && e.body.type !== 'NullLiteral' && !(e.body.type === 'UnaryExpression' && e.body.operator === 'void');
    case 'LogicalExpression': return e.operator === '&&' ? liveExpr(e.right) : (liveExpr(e.left) || liveExpr(e.right));
    case 'ConditionalExpression': return liveExpr(e.consequent) || liveExpr(e.alternate);
    case 'UnaryExpression': return e.operator !== 'void';
    default: return true;
  }
}
/* a live handler on the element: an onClick (or `name`) that does something, or a spread of a call (`{...frameTap(go)}`) */
function hasHandler(open, name) {
  const re = name ? new RegExp('^' + name + '$') : /^on(Click|PointerUp|PointerDown)$/;
  for (const a of open.attributes) {
    if (a.type === 'JSXSpreadAttribute') { if (!name && a.argument.type === 'CallExpression') return true; continue; }
    if (!a.name || !re.test(a.name.name) || !a.value) continue;
    if (a.value.type === 'JSXExpressionContainer' && liveExpr(a.value.expression)) return true;
  }
  return false;
}
const tagName = (open) => (open.name.type === 'JSXIdentifier' ? open.name.name : open.name.type === 'JSXMemberExpression' ? open.name.property.name : '');
const isHost = (t) => /^[a-z]/.test(t);
/* the literal values an attribute can take: a string, or each branch of a condition of strings; null when unknown */
function literals(a) {
  if (!a || !a.value) return null;
  if (a.value.type === 'StringLiteral') return [a.value.value];
  const go = (e) => {
    if (!e) return null;
    if (e.type === 'StringLiteral') return [e.value];
    if (e.type === 'TemplateLiteral' && !e.expressions.length) return [e.quasis[0].value.cooked];
    if (e.type === 'ConditionalExpression') { const x = go(e.consequent); const y = go(e.alternate); return x && y ? x.concat(y) : null; }
    return null;
  };
  return a.value.type === 'JSXExpressionContainer' ? go(a.value.expression) : null;
}
const classWordsLit = (a) => { const l = literals(a); return new Set(l ? l.join(' ').split(/\s+/).filter(Boolean) : []); };
const PRESSED = new Set(UI_ROLES.filter((r) => r.press === 'must').map((r) => r.id));
const HANDLER_NAME = /^on[A-Z]\w*$/;
const handlerName = (n) => n && ((n.type === 'Identifier' && HANDLER_NAME.test(n.name)) || (n.type === 'MemberExpression' && !n.computed && n.property && HANDLER_NAME.test(n.property.name)));

/** The faults of one source: [{ rule, line, what }]; `asked` counts the asked pieces made with no intent. */
export function roleFaults(file, src) {
  const faults = [];
  const put = (rule, node, what) => faults.push({ rule, line: node && node.loc ? node.loc.start.line : 0, what });
  const kitFile = /(^|\/)src\/ui\/kit\//.test(file);
  let asked = 0;
  const ast = parse(src);
  B.traverse(ast, {
    JSXOpeningElement(p) {
      const open = p.node;
      const t = tagName(open);
      const handler = hasHandler(open);
      if (isHost(t)) {
        const dr = attrOf(open, 'data-u2-role');
        const vals = literals(dr) || [];
        for (const v of vals) if (!UI_ROLE_IDS.includes(v)) put('G2', open, `data-u2-role="${v}" is not one of the nine roles`);
        const ariaRole = literals(attrOf(open, 'role')) || [];
        const pressable = t === 'button' || ariaRole.includes('button') || classWordsLit(attrOf(open, 'className')).has('u2-raised');
        if (vals.includes('info') && (pressable || handler)) put('G4', open, `a passive fact (data-u2-role="info") given a pressable form (<${t}>)`);
        if (vals.length === 1 && PRESSED.has(vals[0]) && !handler && !attrOf(open, 'disabled')) put('G3', open, `<${t} data-u2-role="${vals[0]}"> has no live handler`);
        return;
      }
      const intentA = attrOf(open, 'intent');
      const iv = literals(intentA);
      if (KIT_PIECES[t] && KIT_PIECES[t].asks && !intentA) asked++;
      if (intentA && iv) {
        const allowed = (KIT_PIECES[t] && KIT_PIECES[t].roles) || [];
        for (const v of iv) {
          if (!UI_ROLE_IDS.includes(v)) put('G2', open, `<${t} intent="${v}">: not one of the nine roles`);
          else if (KIT_PIECES[t] && !allowed.includes(v)) put('G2', open, `<${t} intent="${v}">: ${t} takes only ${allowed.join(', ')}`);
        }
        if (iv.length === 1) {
          if (PRESSED.has(iv[0]) && !handler) put('G3', open, `<${t} intent="${iv[0]}"> has no live handler (a role that is pressed)`);
          if (iv[0] === 'info' && handler) put('G4', open, `<${t} intent="info"> given a handler (a passive fact made pressable)`);
          if (t === 'Ui2Action') {
            const cv = literals(attrOf(open, 'c'));
            if (cv && cv.length === 1 && ROLE_FACES[iv[0]] && !ROLE_FACES[iv[0]].includes(cv[0])) put('G6', open, `<Ui2Action intent="${iv[0]}" c="${cv[0]}">: a role its colour contradicts`);
          }
        }
      }
      if ((t === 'Ui2InspectStat' || t === 'Ui2Tab' || t === 'Ui2CollectionCard') && !handler) put('G3', open, `<${t}> with no live handler (its role is pressed)`);
      if (t === 'Ui2Stepper' && !hasHandler(open, 'onChange')) put('G3', open, '<Ui2Stepper> with no onChange (adjust is pressed)');
      if (t === 'Ui2Overlay' && !hasHandler(open, 'onClose')) put('G3', open, '<Ui2Overlay> with no onClose (a window you cannot leave)');
      if (t === 'Ui2Comparison' && handler) put('G4', open, '<Ui2Comparison> given a handler (a passive fact made pressable)');
    },
  });
  /* G5: a role by a handler's presence, written again in the kit (the one place is src/game/uiRoles.js) */
  if (kitFile) {
    const inHandlerAttr = (q) => !!q.findParent((x) => x.isJSXAttribute() && x.node.name && /^on[A-Z]/.test(x.node.name.name));
    const picksForm = (n) => {
      let found = false;
      const look = (x) => {
        if (!x || found || typeof x !== 'object') return;
        if (x.type === 'JSXElement' || x.type === 'JSXFragment' || x.type === 'StringLiteral' || x.type === 'TemplateLiteral') { found = true; return; }
        for (const k of Object.keys(x)) { if (k === 'loc' || k === 'start' || k === 'end') continue; const v = x[k]; if (Array.isArray(v)) v.forEach(look); else if (v && typeof v.type === 'string') look(v); }
      };
      look(n);
      return found;
    };
    B.traverse(ast, {
      UnaryExpression(q) {
        if (q.node.operator === 'typeof' && handlerName(q.node.argument) && !inHandlerAttr(q)) put('G5', q.node, `typeof ${q.node.argument.name || q.node.argument.property.name}: a role by the handler's presence (ask ui2Role)`);
        if (q.node.operator === '!' && handlerName(q.node.argument) && !inHandlerAttr(q)) {
          const outer = q.parentPath && q.parentPath.isUnaryExpression({ operator: '!' });
          if (outer || q.parentPath.isVariableDeclarator() || q.parentPath.isReturnStatement()) put('G5', q.node, 'a handler turned into a flag (!!onClick): a role by its presence');
        }
      },
      CallExpression(q) {
        if (q.node.callee.type === 'Identifier' && q.node.callee.name === 'Boolean' && handlerName(q.node.arguments[0]) && !inHandlerAttr(q)) put('G5', q.node, 'Boolean(onClick): a role by the handler\'s presence');
      },
      BinaryExpression(q) {
        const n = q.node;
        if (!/^[!=]==?$/.test(n.operator)) return;
        const h = handlerName(n.left) ? n.left : handlerName(n.right) ? n.right : null;
        const other = h === n.left ? n.right : n.left;
        /* against null, undefined or 'function' it asks "is there one?"; `onBack !== false` is the caller's explicit choice (Header.jsx) */
        const presence = other && (other.type === 'NullLiteral' || (other.type === 'Identifier' && other.name === 'undefined') || (other.type === 'StringLiteral' && other.value === 'function'));
        if (h && presence && !inHandlerAttr(q)) put('G5', n, 'a handler compared (onClick != null): a role by its presence');
      },
      VariableDeclarator(q) {
        const i = q.node.init;
        if (i && i.type === 'LogicalExpression' && (handlerName(i.left) || handlerName(i.right)) && /^opens|^press|^clickable|^isBtn|^asButton/i.test((q.node.id && q.node.id.name) || '')) put('G5', q.node, 'a flag made from a handler: a role by its presence');
      },
      'ConditionalExpression|IfStatement'(q) {
        if (!handlerName(q.node.test) || inHandlerAttr(q)) return;
        const branches = q.isIfStatement() ? [q.node.consequent, q.node.alternate] : [q.node.consequent, q.node.alternate];
        if (branches.some(picksForm)) put('G5', q.node, 'a handler as the test that picks a form or a class: a role by its presence');
      },
      LogicalExpression(q) {
        if (q.node.operator !== '&&' || !handlerName(q.node.left) || inHandlerAttr(q)) return;
        if (picksForm(q.node.right)) put('G5', q.node, '`onClick && <...>`: a handler picking what is drawn');
      },
    });
  }
  return { faults, asked };
}

/* G7: a kit piece that takes a role asks ui2Role for it, by its own name, and every root it returns names its role */
const ASKS_ROLE = Object.freeze({ 'src/ui/kit/Group.jsx': ['Ui2Stat'], 'src/ui/kit/Facts.jsx': ['Ui2Fact'], 'src/ui/kit/Tile.jsx': ['Ui2Tile'], 'src/ui/kit/Action.jsx': ['Ui2Action'], 'src/ui/kit/Tab.jsx': ['Ui2Tab'] });
export function askFaults(file, src) {
  const faults = [];
  const names = ASKS_ROLE[file] || [];
  B.traverse(parse(src), {
    FunctionDeclaration(fp) {
      const nm = fp.node.id && fp.node.id.name;
      if (!names.includes(nm)) return;
      let asks = false;
      fp.traverse({ CallExpression(c) { if (c.node.callee.type === 'Identifier' && c.node.callee.name === 'ui2Role' && c.node.arguments[0] && c.node.arguments[0].type === 'StringLiteral' && c.node.arguments[0].value === nm) asks = true; } });
      if (!asks) faults.push({ rule: 'G7', what: `${nm} does not ask ui2Role('${nm}', ...) for its role` });
      const roots = [];
      fp.traverse({
        ReturnStatement(r) {
          if (r.getFunctionParent() !== fp) return;
          const a = r.node.argument;
          const add = (x) => { if (!x) return; if (x.type === 'JSXElement') roots.push(x); else if (x.type === 'ConditionalExpression') { add(x.consequent); add(x.alternate); } else if (x.type === 'LogicalExpression') add(x.right); };
          add(a);
        },
      });
      for (const r of roots) if (!attrOf(r.openingElement, 'data-u2-role')) faults.push({ rule: 'G7', what: `${nm} draws a <${tagName(r.openingElement)}> without data-u2-role` });
    },
  });
  return faults;
}

/* ── the files ── */
function walkDir(dir, exts, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkDir(p, exts, out);
    else if (exts.some((x) => e.name.endsWith(x))) out.push(p);
  }
  return out;
}
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
const FILES = [...new Set(walkDir(path.join(ROOT, 'src/ui'), ['.jsx']).concat(walkDir(path.join(ROOT, 'src/ui/kit'), ['.js'])).map(rel))].sort();

/* ── 1. the tree ── */
const asked = Object.create(null);
const all = [];
for (const f of FILES) {
  const { faults, asked: n } = roleFaults(f, fs.readFileSync(path.join(ROOT, f), 'utf8'));
  if (n) asked[f] = n;
  for (const x of faults) all.push(f + ':' + x.line + ' ' + x.rule + ' ' + x.what);
}
check(`1. no role named wrong, pressed with nothing behind it, a fact made pressable, a guess by a handler, or a colour against its role (${FILES.length} files)`, all.length === 0, all);

/* ── 2. the asked pieces made with no intent: only the list's, and each file's count only falls ── */
{
  const over = [];
  const fell = [];
  for (const f of Object.keys(asked)) if (asked[f] > (ROLES_KNOWN[f] || 0)) over.push(`${f}: ${asked[f]} made with no intent (the list allows ${ROLES_KNOWN[f] || 0})`);
  for (const f of Object.keys(ROLES_KNOWN)) if ((asked[f] || 0) < ROLES_KNOWN[f]) fell.push(`${f}: ${ROLES_KNOWN[f]} -> ${asked[f] || 0}`);
  const total = Object.values(ROLES_KNOWN).reduce((a, b) => a + b, 0);
  check('2a. a new Ui2Action, Ui2Tile, Ui2Stat or Ui2Fact names its `intent` (G1: the calls before v2.3.6840 are the list\'s)', over.length === 0, over);
  check(`2b. the list's total only falls (${total} <= ${CEILING})`, total <= CEILING, total);
  if (process.argv.includes('--write') && fell.length) {
    const keep = Object.create(null);
    for (const f of Object.keys(ROLES_KNOWN)) if (asked[f]) keep[f] = Math.min(asked[f], ROLES_KNOWN[f]);
    const body = Object.keys(keep).sort().map((f) => `  '${f}': ${keep[f]},`).join('\n');
    const head = fs.readFileSync(KNOWN_FILE, 'utf8').split('export const ROLES_KNOWN')[0];
    fs.writeFileSync(KNOWN_FILE, head + 'export const ROLES_KNOWN = Object.freeze({\n' + body + '\n});\n');
    console.log('wrote ' + rel(KNOWN_FILE) + ' (' + fell.join('; ') + ')');
  }
  check('2c. a count that fell is written down (`--write` lowers it; it never raises one)', process.argv.includes('--write') || fell.length === 0, fell.join(', '));
}

/* ── 3. the kit's pieces ask the one place, and the table names every piece ── */
{
  const f7 = [];
  for (const f of Object.keys(ASKS_ROLE)) for (const x of askFaults(f, fs.readFileSync(path.join(ROOT, f), 'utf8'))) f7.push(f + ' ' + x.what);
  check('3a. Ui2Stat, Ui2Fact, Ui2Tile, Ui2Action and Ui2Tab ask ui2Role() for their role, and every root they draw names it (G7)', f7.length === 0, f7);
  const exported = [];
  B.traverse(parse(fs.readFileSync(path.join(ROOT, 'src/ui/kit/index.js'), 'utf8')), {
    ExportNamedDeclaration(q) { for (const s of q.node.specifiers || []) { const n = s.exported.name || s.exported.value; if (/^Ui2[A-Z]/.test(n)) exported.push(n); } },
  });
  const unnamed = exported.filter((n) => !Object.prototype.hasOwnProperty.call(KIT_PIECES, n));
  const ghost = Object.keys(KIT_PIECES).filter((n) => !exported.includes(n));
  check(`3b. every piece the kit exports has its row in the role table, and every row is a piece (G8; ${exported.length} pieces)`, unnamed.length === 0 && ghost.length === 0, { unnamed, ghost });
  const five = ['Ui2Tab', 'Ui2Stepper', 'Ui2InspectStat', 'Ui2Comparison', 'Ui2Overlay'];
  check('3c. the five pieces V17:49 names that the kit lacked are in it (Tab, Stepper, InspectStat, Comparison, Overlay)', five.every((n) => exported.includes(n)), five.filter((n) => !exported.includes(n)));
  const page = fs.readFileSync(path.join(ROOT, 'src/ui/kit/UiKitPage.jsx'), 'utf8');
  check('3d. each of the five, and the nine roles, has its plate on `?uikit=1`', ['roles', 'tab', 'stepper', 'inspect', 'compare', 'overlay'].every((id) => page.includes(`data-u2-plate="${id}"`) || page.includes(`id="${id}"`))
    && five.every((n) => page.includes('<' + n + ' ')));
}

/* ── P. the dodges, planted: each must be red ── */
{
  const H = (body) => `import React from 'react';\nexport function X({ go }) {\n  return (<div>${body}</div>);\n}\n`;
  const red = (name, faults, rule) => check(`P. planted: ${name} is red (${rule})`, faults.some((x) => x.rule === rule), faults);
  const green = (name, faults) => check(`P. planted: ${name} is green`, faults.length === 0, faults);
  const at = 'src/ui/mobile/dash/Planted.jsx';
  const F = (src, file = at) => roleFaults(file, src).faults;
  const groupSrc = fs.readFileSync(path.join(ROOT, 'src/ui/kit/Group.jsx'), 'utf8');
  const factsSrc = fs.readFileSync(path.join(ROOT, 'src/ui/kit/Facts.jsx'), 'utf8');
  const tileSrc = fs.readFileSync(path.join(ROOT, 'src/ui/kit/Tile.jsx'), 'utf8');
  const slotSrc = fs.readFileSync(path.join(ROOT, 'src/ui/kit/Slot.jsx'), 'utf8');
  /* G1: a kit piece made with no role where one is asked */
  const n1 = roleFaults('src/ui/mobile/sheet/NewScreen.jsx', H('<Ui2Action label="Equip" onClick={go} /><Ui2Stat v="9" k="DPS" />')).asked;
  check('P. planted: a new screen\'s Ui2Action and Ui2Stat with no intent are counted past its allowance (G1: 2 > 0)', n1 === 2 && !(ROLES_KNOWN['src/ui/mobile/sheet/NewScreen.jsx'] > 0), n1);
  const n1b = roleFaults(at, H('<Ui2Tile label="Bro" onClick={go} {...{ intent: \'go\' }} />')).asked;
  check('P. planted: an intent hidden in a spread does not count as named (G1)', n1b === 1, n1b);
  const known = Object.keys(ROLES_KNOWN)[0];
  const nKnown = roleFaults(known, fs.readFileSync(path.join(ROOT, known), 'utf8') + '\nexport function Y({ go }) { return <Ui2Fact k="New" v="1" />; }\n').asked;
  check(`P. planted: one more role-less call in a listed file (${known}) is over its count (G1)`, nKnown > ROLES_KNOWN[known], nKnown);
  /* G2 */
  red('an intent that is no role', F(H('<Ui2Action intent="primary" label="Go" onClick={go} />')), 'G2');
  red('a stat made to commit', F(H('<Ui2Stat intent="commit" v="9" k="DPS" onClick={go} />')), 'G2');
  red('a role in a condition\'s branch that is none', F(H('<Ui2Tile intent={go ? \'go\' : \'chosen\'} label="Bro" onClick={go} />')), 'G2');
  red('a data-u2-role that is no role', F(H('<span data-u2-role="label">7</span>')), 'G2');
  /* G3: a commit role on a thing with no handler */
  red('a commit with no handler', F(H('<Ui2Action intent="commit" label="Equip" />')), 'G3');
  red('a commit with onClick={undefined}', F(H('<Ui2Action intent="commit" label="Equip" onClick={undefined} />')), 'G3');
  red('a commit with onClick={() => {}}', F(H('<Ui2Action intent="commit" label="Equip" onClick={() => {}} />')), 'G3');
  red('a danger with onClick={null}', F(H('<Ui2Action intent="danger" label="Drop" onClick={null} />')), 'G3');
  red('a host button marked commit with no handler', F(H('<button type="button" className="u2-act" data-u2-role="commit">Equip</button>')), 'G3');
  red('a stat to inspect with nothing behind it', F(H('<Ui2InspectStat v="9" k="DPS" />')), 'G3');
  red('a tab with no handler', F(H('<Ui2Tabs><Ui2Tab label="Drops" /></Ui2Tabs>')), 'G3');
  red('a stepper with no onChange', F(H('<Ui2Stepper value={3} max={9} />')), 'G3');
  red('an overlay you cannot leave', F(H('<Ui2Overlay title="Bank" onClose={() => {}}>x</Ui2Overlay>')), 'G3');
  /* G4: a passive fact given a pressable form */
  red('a fact made pressable (intent="info" with onClick)', F(H('<Ui2Fact intent="info" k="Clan" v="No clan" onClick={go} />')), 'G4');
  red('a stat marked info but spread a tap', F(H('<Ui2Stat intent="info" v="9" k="DPS" {...frameTap(go)} />')), 'G4');
  red('a button marked info', F(H('<button type="button" data-u2-role="info" onClick={go}>23</button>')), 'G4');
  red('a raised span marked info', F(H('<span className="u2-raised u2-x" data-u2-role="info">23</span>')), 'G4');
  red('a div role="button" marked info', F(H('<div role="button" data-u2-role="info">23</div>')), 'G4');
  red('a comparison handed a tap', F(H('<Ui2Comparison k="Damage" before={1} after={2} onClick={go} />')), 'G4');
  /* G5: a role by onClick's presence written again */
  red('the kit\'s Ui2Stat guessing by typeof again', F(groupSrc.replace("const opens = r.press;", "const opens = typeof onClick === 'function';"), 'src/ui/kit/Group.jsx'), 'G5');
  red('the kit\'s Ui2Fact guessing by !!onClick', F(factsSrc.replace("const opens = r.press;", 'const opens = !!onClick;'), 'src/ui/kit/Facts.jsx'), 'G5');
  red('a kit piece guessing by onClick != null', F(factsSrc.replace("const opens = r.press;", 'const opens = onClick != null;'), 'src/ui/kit/Facts.jsx'), 'G5');
  red('a kit piece guessing by Boolean(onClick)', F(factsSrc.replace("const opens = r.press;", 'const opens = Boolean(onClick);'), 'src/ui/kit/Facts.jsx'), 'G5');
  red('the kit\'s Ui2Slot picking its form by if (onClick)', F(slotSrc.replace("if (ui2Role('Ui2Slot', { onClick }).press) {", 'if (onClick) {'), 'src/ui/kit/Slot.jsx'), 'G5');
  red('a kit piece picking its form by onClick ? <button> : <div>', F(H('{go.onClick ? <button type="button" onClick={go.onClick}>A</button> : <div>A</div>}'), 'src/ui/kit/Planted.jsx'), 'G5');
  red('a kit piece picking its class by props.onClick', F('export function Y(props) { const cls = props.onClick ? \'u2-raised\' : \'u2-group\'; return <div className={cls} />; }\n', 'src/ui/kit/Planted.jsx'), 'G5');
  red('a kit piece drawing a chevron by onClick && <span>', F(H('{go.onClick && <span className="u2-chev">x</span>}'), 'src/ui/kit/Planted.jsx'), 'G5');
  red('a kit flag `const opens = onClick || onPick`', F('export function Y({ onClick, onPick }) { const opens = onClick || onPick; return opens; }\n', 'src/ui/kit/Planted.jsx'), 'G5');
  /* G6: a role its colour contradicts */
  red('a danger in gold', F(H('<Ui2Action intent="danger" c="gold" label="Drop" onClick={go} />')), 'G6');
  red('a commit in red', F(H('<Ui2Action intent="commit" c="red" label="Equip" onClick={go} />')), 'G6');
  red('a dismiss in green', F(H('<Ui2Action intent="adjust" c="green" label="Cancel" onClick={go} />')), 'G6');
  /* G7: a kit piece that stops asking the one place, or draws a root without its role */
  const g7a = askFaults('src/ui/kit/Tile.jsx', tileSrc.replace("const r = ui2Role('Ui2Tile', { intent, onClick, selected });", "const r = { role: selected ? 'selected' : 'go' };"));
  check('P. planted: Ui2Tile deciding its role itself (no ui2Role) is red (G7)', g7a.some((x) => x.rule === 'G7'), g7a);
  const g7b = askFaults('src/ui/kit/Group.jsx', groupSrc.replace("return <div className={cls} data-u2-role={r.role} style={style}", 'return <div className={cls} style={style}'));
  check('P. planted: Ui2Stat\'s div drawn without data-u2-role is red (G7)', g7b.some((x) => x.rule === 'G7'), g7b);
  /* and what must stay green */
  green('a commit with a handler, a spread tap, a fact with none, a tab and a stepper wired, an Action off with no handler, the kit\'s own handler guards',
    F(H('<Ui2Action intent="commit" label="Equip" onClick={() => go(1)} /><Ui2Tile intent="go" label="Bro" {...frameTap(go)} /><Ui2Fact intent="info" k="Clan" v="x" /><Ui2Tabs><Ui2Tab label="A" selected onClick={go} /></Ui2Tabs><Ui2Stepper value={1} onChange={go} /><Ui2Action intent="disabled" label="Spend" /><Ui2Action intent="danger" c="red" label="Drop" onClick={go} /><Ui2Overlay title="Bank" onClose={go}>x</Ui2Overlay>'))
      .concat(F('export function Y({ onChange, onClose }) { const to = (n) => { if (onChange) onChange(n); }; return <button type="button" onClick={onClose || undefined} data-u2-role="adjust">{to}</button>; }\n', 'src/ui/kit/Planted.jsx')));
}

console.log(failed ? `\n${failed} check(s) failed` : '\nall checks pass');
process.exit(failed ? 1 : 0);
