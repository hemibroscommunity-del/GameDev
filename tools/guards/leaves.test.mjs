/* ═══ v2.3.6521: A LEAF STAYS A LEAF (card WL PR 2; grand plan step 5.5) ═══
 *
 * src/rendering/leaves/ and src/rendering/tables/ hold what left the two
 * renderers: functions that read no `this` and no module state, and tables
 * of literals (M-tables.md part 5's definition).  Until this guard, a leaf
 * was a leaf by convention: the shape review's plant 5 (a `systems/` import,
 * a top-level `let` Map and a write to `S` in leaves/entity-social.js) was
 * caught only because the cycle line of four-lines had no room
 * (docs/plan/census/shape-walls.md, "Leaves").  Every check reads the
 * syntax tree (@babel, the root's or server/'s, as phase-table does; the
 * import chain off esbuild's own graph), never a pattern of text.
 *
 *   1. NO MODULE STATE.  A leaf or table file holds no top-level `let` or
 *      `var` (an `export let` included; a `var` in a top-level block is the
 *      module's too), reassigns no top-level name, and writes into no
 *      top-level binding of its own or one it imports from src/ from inside
 *      a function: `const _seen = new Map()` and `_seen.set(...)` is module
 *      state with a `const` in front (the tired spelling of the plant's
 *      `let`), and so is a `.push`, `x.k =`, `x[k]++`, `delete x.k`,
 *      `Object.assign(x, ...)`, through a name given it (`const m = _seen;
 *      m.set(...)`) or a value taken from it (`_seen.get(k).n = 1`).  A
 *      write at load (outside every function: a table built once) is not
 *      state.  A package's object (pixi's) is not src/'s module and is not
 *      read here.
 *   2. WRITES NOTHING TO `S`.  The state is found two ways: a parameter
 *      named `S`, and a parameter that a caller anywhere under src/ fills
 *      with the state (`S`, a value taken from it, `stateRef.current`,
 *      `window._gameState.current`), so a leaf that renames its `S` to `st`
 *      is still read; a leaf that hands its state to another leaf passes
 *      the mark on.  A write is any of rule 1's forms rooted at the state
 *      (`S._x = `, `S.chatBubbles[pid].seen = `, `Object.assign(S, {...})`,
 *      `S._peersNotDrawn.add(id)`, `const c = S.chatBubbles; c[pid] = 1`,
 *      `({ a: S.x } = o)`), and any write rooted at `window._gameState`.
 *   3. IMPORTS NOTHING FROM systems/, THROUGH ANY CHAIN.  The static imports
 *      (and a dynamic `import('...')` of a written path, and an
 *      `export ... from`) of each leaf and table file, followed file to file
 *      off esbuild's graph, never reach src/rendering/systems/: a middle
 *      file that imports a renderer is the same import (part 1's reading:
 *      no leaf reaches one by any chain today).
 *   4. THE PAGE'S OWN GLOBALS (a census, only falls; the gatekeeper alone
 *      makes it strict): a write rooted at `window`, `globalThis` or `self`
 *      in a leaf or table is module state held on the page; the three today
 *      are QA probes (KNOWN_GLOBALS).  A new one fails: `window.__seen =
 *      window.__seen || new Map()` is the third spelling of the plant.
 *   2c. EVERY USE OF THE STATE IS AN ALLOWED FORM (v2.3.6526, sitting 59's
 *      hold: an ALLOW list, not the spellings learned): the state is
 *      followed from each of its own places through every use; a named read,
 *      a reading method, a name or copy (followed), a value that leaves no
 *      handle, or a function the guard reads are allowed, and every other
 *      use is a row of USES (by file, only falls: 1 row, 4 uses), a form it
 *      cannot follow included.  A write reached so is rule 2's.
 *   5. THE RULES, ON A FIXTURE: each plant below, scanned as text in memory,
 *      fails its rule, and a clean leaf passes (so a scan made blind fails
 *      here, not only on the plants by hand).
 *
 * BREAK PROOF (rule 8), each tried by hand once in a scratch copy, 2026-11-23:
 *   - leaves/entity-social.js, the shape review's plant 5:
 *     an import of the entity renderer (from ../systems/), `let _bubbleSeen = new Map();`
 *     and `S._lastBubbleAsk = now` in _chatBubbleUp
 *                                         -> FAIL 1, 2 and 3
 *   - `const _bubbleSeen = new Map();` and `_bubbleSeen.set(pid, now)` in
 *     _chatBubbleUp                         -> FAIL 1
 *   - `Object.assign(S, { _lastBubbleAsk: now })`  -> FAIL 2
 *   - _chatBubbleUp's `S` renamed `st`, and `st.chatBubbles[pid].seen = now`
 *                                         -> FAIL 2 (the callers fill it)
 *   - `import { zz } from '../zzMiddle.js'`, a new file that imports
 *     the effects renderer (./systems/)     -> FAIL 3 (the chain, named)
 *   - the same as `export { zz } from '@/rendering/zzMiddle.js'`, and as
 *     a dynamic import() of the effects renderer in _chatBubbleUp
 *                                         -> FAIL 3
 *   - `window.__bubbleSeen = new Map()` in _chatBubbleUp
 *                                         -> FAIL 4 (4 over the line 3)
 * v2.3.6521, sitting 57's two plants (green before), tried 2026-11-24 in
 * leaves/entity-combat.js:
 *   - `S.monsters.forEach((m) => { m.seen = Date.now(); });` in
 *     selfCorpseUp(S)                       -> FAIL 2 (a callback's
 *     parameter is the state's part; also `Object.values(S.x).map(f)`)
 *   - `export const zzTick = (() => { let n = 0; return () => n++; })();`
 *                                         -> FAIL 1 (an IIFE's `let`; its
 *     `const` Map filled from the inner function fails 1 too)
 * v2.3.6521, sitting 58's hold (a callback named, not written there: the
 * guard knew spellings; it now FOLLOWS a function handed over and counts a
 * form it cannot follow, rule 2b), tried 2026-11-24 in selfCorpseUp(S):
 *   - `const _mark = (m) => { m.seen = 1; }; S.monsters.forEach(_mark);` -> FAIL 2
 *   - a declared `function _mk2(m)` given to `Object.values(S.monsters).map`,
 *     `_m3.bind(null)` given to forEach, `_m4.call(null, S)`,
 *     `_m5.apply(null, [S])`, `_m7.bind(null, S)()`  -> FAIL 2
 *   - `const _q = S.pick(); S.monsters.forEach(_q)`, a `let` callback given
 *     another value, `_m8.apply(null, _l)`      -> FAIL 2b (cannot follow)
 *   - `S.monsters.forEach((m) => m.hp)`           -> green (a read)
 *   - `S.monsters.forEach(S.mark)`                -> FAIL 2b
 * NOT CAUGHT, and why: a callback handed to a function that is given the
 * state elsewhere (`each(f)` where each reads S itself: the call names no
 * marked value); a function run once at load through a name (`const init
 * = () => { let n; return () => n++; }; const t = init();`): its `let` is a
 * local of each call, and telling a call made once from many is not read;
 * a leaf handing its state to a function outside the leaves (src/game/...)
 * that writes it (that file is not a leaf: the state
 * ledger holds who writes a field, card WL PR 3); a caller that holds the
 * state under a name other than `S`, `stateRef` or `window._gameState`
 * (the renderers name it `S` everywhere today) and a leaf whose parameter
 * is not named `S`; a value a plain function call hands back (`pick(S).x =
 * 1`: only a method of the state's own values is followed); `eval`.
 *
 * Run from the repository's root:  node tools/guards/leaves.test.mjs
 * (cd server && npm test runs it with every other guard and suite).
 * v2.3.6526, sitting 59's hold (the class: every use of the state followed,
 * rule 2c), tried 2026-11-24 in selfCorpseUp(S), each red:
 *   - `for (const m of [...S.monsters]) m.seen = 1;`  -> FAIL 2 (the copy followed)
 *   - `const _w = { s: S }; _w.s._zz = 1;`           -> FAIL 2 (the object followed)
 *   - `for (const m of S.monsters) _H.mark(m);`       -> FAIL 2c (a method of another object)
 *   and in rule 5's fixture card WL's own six: an array pattern, a member
 *   kept (`o.m = S.monsters`), an iterator walked, a slice's entry, a found
 *   entry through `|| []`, `Reflect.set(S.player, ..)`.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname, resolve, sep } from 'node:path';
import { createRequire } from 'node:module';
import { ROOT } from './lib/systems.mjs';

const LEAF_DIRS = ['src/rendering/leaves', 'src/rendering/tables'];
const SYSTEMS_DIR = 'src/rendering/systems/';
/* rule 4's census: `file: the global's name`.  Only falls. */
const KNOWN_GLOBALS = [
  'src/rendering/leaves/effects-look.js: __btStandInSkin',
  'src/rendering/leaves/entity-combat.js: __btBlockArm',
  'src/rendering/leaves/entity-combat.js: __btSouthBlockWeapon',
];
const GLOBAL_LINE = KNOWN_GLOBALS.length;
/* v2.3.6521 (sitting 58): rule 2b's list, by file (it only falls) */
const UNFOLLOWED = Object.freeze(Object.assign(Object.create(null), {}));
/* v2.3.6526 (sitting 59): rule 2c's list, the state's uses that are no allowed form, by file (it
   only falls).  It starts with 1 row holding 4 uses: entity-monsters.js hands a parameter a caller
   fills from a variable named `state` (the monster's own look state, by its look: a caller's
   `state`) to the recolour module, which is not a leaf. */
const USES = Object.freeze(Object.assign(Object.create(null), {
  'src/rendering/leaves/entity-monsters.js': 4,
}));

let failed = 0;
const ok = (m) => console.log('ok   ' + m);
const bad = (m) => { failed++; console.log('FAIL ' + m); };

/* ── the parsers ─────────────────────────────────────────────────────── */
let babel = null;
let esbuild = null;
for (const pkg of ['package.json', 'server/package.json']) {
  try {
    const req = createRequire(join(ROOT, pkg));
    const t = req('@babel/traverse');
    babel = babel || { parser: req('@babel/parser'), traverse: t.default || t };
  } catch { /* the next */ }
  try { esbuild = esbuild || createRequire(join(ROOT, pkg))('esbuild'); } catch { /* the next */ }
}
if (!babel || !esbuild) {
  console.log('FAIL @babel/parser, @babel/traverse and esbuild must load from the root or server/ (npm install in one of them)');
  process.exit(1);
}
const parse = (text) => babel.parser.parse(text, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true });

const posix = (p) => p.split(sep).join('/');
function walk(dir) {
  const out = [];
  let names = [];
  try { names = readdirSync(join(ROOT, dir)); } catch { return out; }
  for (const n of names) {
    const rel = dir + '/' + n;
    if (statSync(join(ROOT, rel)).isDirectory()) out.push(...walk(rel));
    else if (/\.(m?js|jsx)$/.test(n)) out.push(rel);
  }
  return out.sort();
}

/* ── the tree's small words ──────────────────────────────────────────── */
const MUTATORS = new Set(['set', 'add', 'delete', 'clear', 'push', 'pop', 'shift', 'unshift', 'splice',
  'sort', 'reverse', 'fill', 'copyWithin']);
const OBJ_WRITERS = { Object: new Set(['assign', 'defineProperty', 'defineProperties', 'setPrototypeOf']),
  Reflect: new Set(['set', 'defineProperty', 'deleteProperty', 'setPrototypeOf']) };
const GLOBALS = new Set(['window', 'globalThis', 'self']);
const isMember = (n) => n && (n.type === 'MemberExpression' || n.type === 'OptionalMemberExpression');
const isCall = (n) => n && (n.type === 'CallExpression' || n.type === 'OptionalCallExpression');
const propName = (m) => (!m.computed && m.property.type === 'Identifier' ? m.property.name
  : (m.property.type === 'StringLiteral' ? m.property.value : null));

/* the name a value is reached from: walks a member chain, a call on one
   (`S.m.get(k)`), `a || b`, `c ? a : b`, `(x, y)` -- every base it may be.
   Returns the base nodes (Identifiers, or the global member) */
function bases(n, out = []) {
  if (!n) return out;
  switch (n.type) {
    case 'Identifier': out.push(n); break;
    case 'MemberExpression': case 'OptionalMemberExpression':
      /* `window._gameState...`: the state on the page's global */
      if (n.object.type === 'Identifier' && GLOBALS.has(n.object.name)) { out.push(n); break; }
      bases(n.object, out); break;
    case 'CallExpression': case 'OptionalCallExpression':
      if (isMember(n.callee)) bases(n.callee.object, out); break;
    case 'LogicalExpression': bases(n.left, out); bases(n.right, out); break;
    case 'ConditionalExpression': bases(n.consequent, out); bases(n.alternate, out); break;
    case 'SequenceExpression': bases(n.expressions[n.expressions.length - 1], out); break;
    case 'AssignmentExpression': bases(n.right, out); break;
    case 'ParenthesizedExpression': case 'TSNonNullExpression': bases(n.expression, out); break;
    default: break;
  }
  return out;
}
const globalStateBase = (b) => b.type !== 'Identifier' && propName(b) === '_gameState';
const globalName = (b) => (b.type !== 'Identifier' ? propName(b) : null);

/* the targets a write lands on: [{ node (the member written into), how }] */
function writeTargets(path) {
  const n = path.node;
  const out = [];
  const pat = (p, how) => {
    if (!p) return;
    if (isMember(p)) out.push({ node: p.object, how, member: p });
    else if (p.type === 'ObjectPattern') p.properties.forEach((pr) => pat(pr.type === 'RestElement' ? pr.argument : pr.value, how));
    else if (p.type === 'ArrayPattern') p.elements.forEach((e) => pat(e && e.type === 'RestElement' ? e.argument : e, how));
    else if (p.type === 'AssignmentPattern') pat(p.left, how);
  };
  if (n.type === 'AssignmentExpression') pat(n.left, 'assign');
  else if (n.type === 'UpdateExpression' && isMember(n.argument)) out.push({ node: n.argument.object, how: 'update', member: n.argument });
  else if (n.type === 'UnaryExpression' && n.operator === 'delete' && isMember(n.argument)) out.push({ node: n.argument.object, how: 'delete', member: n.argument });
  else if ((n.type === 'ForInStatement' || n.type === 'ForOfStatement') && n.left.type !== 'VariableDeclaration') pat(n.left, 'for');
  else if (isCall(n) && isMember(n.callee)) {
    const name = propName(n.callee);
    const obj = n.callee.object;
    if (obj.type === 'Identifier' && OBJ_WRITERS[obj.name] && OBJ_WRITERS[obj.name].has(name) && n.arguments[0]) {
      out.push({ node: n.arguments[0], how: obj.name + '.' + name });
    } else if (MUTATORS.has(name)) out.push({ node: obj, how: '.' + name + '()', member: n.callee });
  }
  return out;
}
const WRITE_TYPES = 'AssignmentExpression|UpdateExpression|UnaryExpression|ForInStatement|ForOfStatement|CallExpression|OptionalCallExpression';

/* v2.3.6521 (sitting 58): the function an argument IS, followed: a function
   written there, a local name bound to one and never given another value
   (a declaration, `const f = () => ..`), or `f.bind(..)` of either; else null */
function fnOf(a) {
  if (!a || !a.node) return null;
  if (a.isFunction()) return a;
  if (a.isIdentifier()) {
    const b = a.scope.getBinding(a.node.name);
    if (!b || b.kind === 'module' || b.kind === 'param' || b.constantViolations.length) return null;
    if (b.path.isFunctionDeclaration()) return b.path;
    if (b.path.isVariableDeclarator()) { const i = b.path.get('init'); return i && i.node && i.isFunction() ? i : null; }
    return null;
  }
  if (a.isCallExpression() && a.get('callee').isMemberExpression() && propName(a.node.callee) === 'bind') return fnOf(a.get('callee.object'));
  return null;
}
/* an argument that may be a function this scan cannot follow: an import's
   name, a parameter, a name given more than one value, a member, a call's
   result (a literal, a template, an object, an array or a name bound to a
   value that is not a function is data) */
function maybeFn(a) {
  const n = a.node;
  if (!n) return false;
  if (n.type === 'Identifier') {
    const b = a.scope.getBinding(n.name);
    if (!b) return false;                                 /* a global (undefined, Math...) */
    if (b.kind === 'module') return true;                 /* an import: handed on to its leaf */
    if (b.kind === 'module' || b.constantViolations.length) return true;
    /* a parameter is a function when its function calls it (`cb(..)`, `cb.call(..)`); one only read
       or handed on is data (an id, a band, a variant) */
    if (b.kind === 'param') return b.referencePaths.some((r) => (isCall(r.parent) && r.parent.callee === r.node)
      || (isMember(r.parent) && r.parent.object === r.node && ['call', 'apply', 'bind'].includes(propName(r.parent))));
    if (b.path.isVariableDeclarator()) { const i = b.path.node.init; return !i || /Call|Member|Conditional|Logical|Identifier|Await/.test(i.type); }
    return false;
  }
  return isMember(n) || isCall(n) || n.type === 'ConditionalExpression' || n.type === 'LogicalExpression';
}
/* every name in a file a value of a marked binding is given to (an alias):
   `const c = S.x`, `const { x } = S`, `c = S.x` later, `for (const c of S.x)`.
   `marked` is a Set of babel Bindings; it grows in place */
function spreadMarks(ast, marked, pending = []) {
  const decls = [];
  babel.traverse(ast, {
    VariableDeclarator(p) { if (p.node.init) decls.push({ scope: p.scope, id: p.node.id, init: p.node.init }); },
    AssignmentExpression(p) { if (p.node.operator === '=' && p.node.left.type !== 'MemberExpression') decls.push({ scope: p.scope, id: p.node.left, init: p.node.right }); },
    'ForOfStatement|ForInStatement'(p) {
      const l = p.node.left;
      if (p.node.type === 'ForOfStatement') decls.push({ scope: p.scope, id: l.type === 'VariableDeclaration' ? l.declarations[0].id : l, init: p.node.right });
    },
    /* v2.3.6521 (sitting 57's hold: `S.monsters.forEach((m) => { m.seen =
       now; })` stayed green): a function handed to a call over a marked
       value (its callee's object, or another argument: `S.x.forEach(f)`,
       `Object.values(S.x).map(f)`, `each(S.x, f)`) is given that value's
       parts, so every parameter it names is marked too */
    'CallExpression|OptionalCallExpression'(p) {
      /* v2.3.6521 (sitting 58's hold: `const _mark = (m) => { m.seen = 1; };
         S.monsters.forEach(_mark)` stayed green): a function handed over is
         FOLLOWED whatever its spelling -- written there, a local name bound to
         one (`_mark`), `_mark.bind(..)` -- and one it cannot follow (an
         import's, a parameter, a member, a call's result) is kept as
         `pending`: scanLeaf hands an import's on to its leaf, and counts the
         rest as forms it cannot follow (rule 2b, a list that only falls) */
      const fns = [];
      const unknown = [];
      for (const a of p.get('arguments')) {
        const fp = fnOf(a);
        if (fp) fns.push(fp);
        else if (maybeFn(a)) unknown.push(a);
      }
      if (!fns.length && !unknown.length) return;
      const from = [...p.get('arguments').filter((a) => !fns.includes(a) && !a.isFunction()).map((a) => a.node)];
      /* the callee's chain, and the arguments of each call along it
         (`Object.values(S.x).map`, `[...S.x].filter`) */
      for (let n = p.node.callee; n;) {
        from.push(n);
        if (isMember(n)) n = n.object;
        else if (isCall(n)) { from.push(...n.arguments); n = n.callee; }
        else if (n.type === 'ArrayExpression') { n.elements.forEach((e) => e && from.push(e.type === 'SpreadElement' ? e.argument : e)); n = null; }
        else n = null;
      }
      for (const f of fns) for (const prm of f.node.params) decls.push({ scope: p.scope, id: prm, init: null, from, inner: f.scope });
      /* over a marked value OTHER than the argument itself (`out.push(S.x)` hands the state's part
         on as data; `S.x.forEach(q)` hands q the state's parts) */
      for (const a of unknown) pending.push({ scope: p.scope, from: from.filter((x) => x !== a.node), arg: a });
    },
  });
  const idsOf = (id, out = []) => {
    if (!id) return out;
    if (id.type === 'Identifier') out.push(id.name);
    else if (id.type === 'ObjectPattern') id.properties.forEach((pr) => idsOf(pr.type === 'RestElement' ? pr.argument : pr.value, out));
    else if (id.type === 'ArrayPattern') id.elements.forEach((e) => idsOf(e && e.type === 'RestElement' ? e.argument : e, out));
    else if (id.type === 'AssignmentPattern') idsOf(id.left, out);
    return out;
  };
  for (let changed = true; changed;) {
    changed = false;
    for (const d of decls) {
      const srcs = d.from || [d.init];
      if (!srcs.some((x) => bases(x).some((b) => b.type === 'Identifier' && marked.has(d.scope.getBinding(b.name))))) continue;
      for (const name of idsOf(d.id)) {
        const b = (d.inner || d.scope).getBinding(name);
        if (b && !marked.has(b)) { marked.add(b); changed = true; }
      }
    }
  }
}

/* ── one file's scan (rules 1, 2 and 4) ──────────────────────────────── */
/* stateParams: Map of a function's name -> Set of parameter positions a
   caller fills with the state.  Returns { moduleState, stateWrites,
   globals, exportsFns, handsOn } */
function scanLeaf(rel, text, stateParams = new Map()) {
  const ast = parse(text);
  const lines = text.split('\n');
  const where = (n) => rel + ':' + n.loc.start.line + ' `' + (lines[n.loc.start.line - 1] || '').trim().slice(0, 90) + '`';
  const moduleState = [];
  const stateWrites = [];
  const globals = [];
  const exportsFns = new Map();   /* exported name -> the function node */
  const handsOn = [];             /* [{ callee (import or local name), pos }] a marked value passed on */
  const unfollowedCalls = [];     /* v2.3.6521: forms of the hand-on it cannot follow */
  let programScope = null;
  const fnByName = new Map();     /* local name -> function node, for marks */

  babel.traverse(ast, {
    Program(p) { programScope = p.scope; },
    'FunctionDeclaration|VariableDeclarator'(p) {
      if (p.scope !== programScope && p.parentPath.scope !== programScope) return;
      if (p.node.type === 'FunctionDeclaration' && p.node.id) fnByName.set(p.node.id.name, p.node);
      else if (p.node.type === 'VariableDeclarator' && p.node.id.type === 'Identifier' && p.node.init
        && /Function/.test(p.node.init.type)) fnByName.set(p.node.id.name, p.node.init);
    },
  });
  /* the exports */
  for (const st of ast.program.body) {
    if (st.type !== 'ExportNamedDeclaration' && st.type !== 'ExportDefaultDeclaration') continue;
    const d = st.declaration;
    if (d && d.type === 'FunctionDeclaration' && d.id) exportsFns.set(d.id.name, d);
    else if (d && d.type === 'VariableDeclaration') d.declarations.forEach((v) => { if (v.id.type === 'Identifier' && v.init && /Function/.test(v.init.type)) exportsFns.set(v.id.name, v.init); });
    else if (st.type === 'ExportDefaultDeclaration' && d && /Function/.test(d.type)) exportsFns.set('default', d);
    for (const s of st.specifiers || []) {
      const local = s.local && s.local.name;
      const name = s.exported && (s.exported.name || s.exported.value);
      if (local && fnByName.has(local)) exportsFns.set(name, fnByName.get(local));
    }
  }

  /* rule 1a: top-level let / var, and a top-level name reassigned */
  for (const [name, b] of Object.entries(programScope.bindings)) {
    if (b.kind === 'let' || b.kind === 'var') moduleState.push(where(b.identifier) + ' -- a top-level `' + b.kind + ' ' + name + '`');
    else if (b.kind !== 'module' && b.constantViolations.length) moduleState.push(where(b.constantViolations[0].node) + ' -- the top-level `' + name + '` given a new value');
  }

  /* v2.3.6521 (sitting 57's hold: closure state in an IIFE stayed green):
     a function called where it is written, at the top (`const f = (() => {
     let n = 0; return () => n++; })()`), runs once at load, so what it
     declares lives as long as the module: its `let` and `var` are module
     state, and its other names are the module's own (marked below) */
  const onceScopes = [];
  babel.traverse(ast, {
    'CallExpression|NewExpression'(p) {
      if (p.getFunctionParent()) return;
      const c = p.get('callee');
      const fn = c.isFunction() ? c : (c.isMemberExpression() && c.get('object').isFunction() && /^(call|apply)$/.test(propName(c.node) || '') ? c.get('object') : null);
      if (fn) onceScopes.push(fn.scope);
    },
  });
  for (const sc of onceScopes) for (const [name, b] of Object.entries(sc.bindings)) {
    if (b.kind === 'let' || b.kind === 'var') moduleState.push(where(b.identifier) + ' -- `' + b.kind + ' ' + name + '` in a function run once at load (it lives as long as the module)');
  }

  /* the marks: the module's own (top-level bindings, and imports from src/) */
  const moduleMarks = new Set();
  for (const sc of onceScopes) for (const b of Object.values(sc.bindings)) if (b.kind !== 'param') moduleMarks.add(b);
  for (const b of Object.values(programScope.bindings)) {
    if (b.kind === 'module') {
      const src = b.path.parentPath && b.path.parentPath.node.source && b.path.parentPath.node.source.value;
      if (src && (src.startsWith('.') || src.startsWith('@/'))) moduleMarks.add(b);
    } else moduleMarks.add(b);
  }
  spreadMarks(ast, moduleMarks);

  /* the state's marks: a parameter named S, a parameter a caller fills */
  const stateMarks = new Set();
  const paramBindings = (fnPath, positions) => {
    fnPath.node.params.forEach((prm, i) => {
      const id = prm.type === 'AssignmentPattern' ? prm.left : prm;
      const names = [];
      const collect = (x) => {
        if (!x) return;
        if (x.type === 'Identifier') names.push(x.name);
        else if (x.type === 'ObjectPattern') x.properties.forEach((pr) => collect(pr.type === 'RestElement' ? pr.argument : pr.value));
        else if (x.type === 'ArrayPattern') x.elements.forEach(collect);
        else if (x.type === 'AssignmentPattern') collect(x.left);
        else if (x.type === 'RestElement') collect(x.argument);
      };
      collect(id);
      const isS = id.type === 'Identifier' && id.name === 'S';
      if (!isS && !positions.has(i)) return;
      for (const n of names) { const b = fnPath.scope.getBinding(n); if (b) stateMarks.add(b); }
    });
  };
  const nameOfFn = (p) => {
    if (p.node.id) return p.node.id.name;
    if (p.parentPath.isVariableDeclarator() && p.parentPath.node.id.type === 'Identifier') return p.parentPath.node.id.name;
    return null;
  };
  babel.traverse(ast, {
    Function(p) {
      const local = nameOfFn(p);
      let exported = null;
      for (const [en, fnode] of exportsFns) if (fnode === p.node) exported = en;
      const positions = new Set([...(stateParams.get(exported) || []), ...(stateParams.get('#' + local) || [])]);
      paramBindings(p, positions);
    },
  });
  const stateRoots = new Set(stateMarks);   /* v2.3.6526: the state's own places, before any alias */
  const pendingS = [];
  spreadMarks(ast, stateMarks, pendingS);
  /* v2.3.6521 (sitting 58): a function handed over a marked value that the
     scan could not follow: an import's goes on to its leaf (its first three
     places get the parts, as forEach, map and reduce give them); any other
     is a form it cannot follow, counted (rule 2b) */
  const unfollowed = unfollowedCalls;
  for (const q of pendingS) {
    if (!q.from.some((x) => bases(x).some((b) => b.type === 'Identifier' && stateMarks.has(q.scope.getBinding(b.name))) || bases(x).some(globalStateBase))) continue;
    const a = q.arg.node;
    const b = a.type === 'Identifier' ? q.scope.getBinding(a.name) : null;
    if (b && b.kind === 'module') {
      const imp = b.path.node;
      const src = b.path.parentPath.node.source.value;
      const name = imp.type === 'ImportDefaultSpecifier' ? 'default' : (imp.imported ? (imp.imported.name || imp.imported.value) : null);
      for (const pos of [0, 1, 2]) handsOn.push({ src, name, pos });
    } else unfollowed.push(where(a) + ' -- a function handed over the state\'s parts that the scan cannot follow');
  }

  /* a value reached from a marked binding, as the scope it is written in
     resolves its names */
  const markedBase = (n, marks, scope) => bases(n).some((b) => b.type === 'Identifier' && marks.has(scope.getBinding(b.name)));
  babel.traverse(ast, {
    [WRITE_TYPES](p) {
      if (isCall(p.node)) handOn(p);
      for (const t of writeTargets(p)) {
        const bs = bases(t.node);
        const inFn = !!p.getFunctionParent();
        if (bs.some(globalStateBase)) stateWrites.push(where(p.node) + ' -- ' + t.how + ' into window._gameState');
        else if (markedBase(t.node, stateMarks, p.scope)) stateWrites.push(where(p.node) + ' -- ' + t.how + ' into the state');
        else if (inFn && markedBase(t.node, moduleMarks, p.scope)) moduleState.push(where(p.node) + ' -- ' + t.how + ' into a module\'s binding, from a function');
        for (const b of bs) {
          if (b.type !== 'Identifier' && !globalStateBase(b) && globalName(b)) globals.push(rel + ': ' + globalName(b));
          /* `window.__x = ...`: the global's own key is written */
          if (b.type === 'Identifier' && GLOBALS.has(b.name) && !p.scope.getBinding(b.name)) {
            globals.push(rel + ': ' + ((t.member && t.member.object === b && propName(t.member)) || '(a key held in a variable)'));
          }
        }
      }
    },
  });
  /* a marked value handed to another function: the mark goes with it */
  function handOn(p) {
    let c = p.node.callee;
    /* v2.3.6521 (sitting 58): `f.call(t, S)` hands S to f's first place,
       `f.bind(t, S)` the same (the bound call's own come after);
       `f.apply(t, [S])` each element */
    let shift = 0;
    let args = p.node.arguments;
    if (isMember(c) && c.object.type === 'Identifier' && ['call', 'bind'].includes(propName(c))) { c = c.object; shift = 1; }
    else if (isMember(c) && c.object.type === 'Identifier' && propName(c) === 'apply') {
      c = c.object; shift = 1;
      args = [args[0], ...((args[1] && args[1].type === 'ArrayExpression') ? args[1].elements : [])];
      /* a list it cannot read (a name, a call): whatever it holds is handed on unseen */
      if (p.node.arguments[1] && p.node.arguments[1].type !== 'ArrayExpression') {
        unfollowedCalls.push(where(p.node) + ' -- .apply with a list the scan cannot read');
      }
    }
    if (c.type !== 'Identifier') return;
    args.forEach((a, i0) => {
      const i = i0 - shift;
      if (!a || i < 0) return;
      const st = bases(a).some(globalStateBase) || markedBase(a, stateMarks, p.scope);
      if (!st) return;
      const b = p.scope.getBinding(c.name);
      if (!b) return;
      if (b.kind === 'module') {
        const imp = b.path.node;
        const src = b.path.parentPath.node.source.value;
        handsOn.push({ src, name: imp.type === 'ImportDefaultSpecifier' ? 'default' : (imp.imported ? (imp.imported.name || imp.imported.value) : null), pos: i });
      } else handsOn.push({ local: c.name, pos: i });
    });
  }
  const uses = stateUses(ast, stateRoots, where, stateWrites, (src) => LEAF_SET.has(withExt(ALIAS(src, rel))));
  return { moduleState, stateWrites, globals: [...new Set(globals)], exportsFns, handsOn, unfollowed, uses };
}

/* ── 2c. v2.3.6526 (sitting 59's hold): the state's every use, an ALLOW list ──
   Sittings 57 to 59 each planted a spelling of a write the alias marks did
   not reach (`for (const m of [...S.monsters]) m.seen = 1`, `_H.mark(m)`,
   `const _w = { s: S }; _w.s._zz = 1`).  So the state is FOLLOWED from each
   of its own places (a parameter named S, one a caller fills, the page's
   `window._gameState`) through every use, and each use must be one of the
   ALLOWED forms; any other is a row of USES (by file, it only falls), a
   form it cannot follow included:
     - a READ BY A NAMED FIELD: `S.x`, `S.x.y` (and `S.x[k]`, `S.x[0]`: a
       read of an entry), followed on to where that value goes;
     - a READING METHOD of it (`.get`, `.has`, `.includes`, `.find`,
       `.filter`, `.map`, `.forEach`, `.slice`, ... below): its callback, a
       function written there, has its parameters followed; what it returns
       of the state (`get`, `find`, `filter`, `slice`, `values`, ...) is
       followed on;
     - a NAME given it (`const c = S.x`, `const { a, b } = S`, `for (const m
       of S.x)`): each use of the name is followed (a name given another
       value later is a row);
     - a copy that holds its parts (`[...S.x]`, `{ ...S.x }`, `{ s: S }`,
       `[S.x]`, `a || S.x`, `c ? S.x : y`): the copy is followed;
     - a VALUE that leaves no handle: an operand (`+`, `<`, `===`, `!`,
       `typeof`, a template), a test (`if`, `?:`, `while`, `switch`),
       `for (k in S.x)`, a return (the caller's), handed to `Math.*`,
       `Number`, `String`, `Boolean`, `isFinite`, `isNaN`, `parseInt`,
       `parseFloat`, `JSON.stringify`, `Array.isArray`, `Object.keys`
       (`Object.values`, `Object.entries`, `Array.from` are followed on);
     - handed to a function the guard reads: a local function by its name,
       or a leaf's import (the mark goes on to its parameter: rule 2).
   A write through any of these is rule 2's (red).  Every other use is a
   row: handed to a method of another object (`_H.mark(m)`, `g.drawRect(
   S.x, ..)`), to a parameter or a non-leaf import, kept in a member or a
   name assigned again (`o.y = S.x`), a method of it not on the lists, the
   state by a key held in a variable on a write, `.call`/`.apply`/`.bind`. */
const READ_PRIMITIVE = new Set(['has', 'includes', 'indexOf', 'lastIndexOf', 'findIndex', 'findLastIndex', 'some', 'every',
  'forEach', 'join', 'toFixed', 'toString', 'toLowerCase', 'toUpperCase', 'startsWith', 'endsWith', 'charAt', 'charCodeAt',
  'codePointAt', 'trim', 'trimStart', 'trimEnd', 'split', 'padStart', 'padEnd', 'repeat', 'localeCompare', 'getTime',
  'test', 'match', 'replace', 'replaceAll', 'search', 'substring', 'substr', 'valueOf', 'toPrecision', 'keys']);
const READ_ALIAS = new Set(['get', 'find', 'findLast', 'at', 'slice', 'filter', 'values', 'entries', 'concat', 'flat',
  'map', 'flatMap', 'reduce', 'reduceRight']);
const SAFE_CALLS = new Set(['Number', 'String', 'Boolean', 'isFinite', 'isNaN', 'parseInt', 'parseFloat']);
const SAFE_OF = { Math: null, Number: null, JSON: new Set(['stringify']), Array: new Set(['isArray']), Object: new Set(['keys', 'is']) };
const ALIAS_OF = { Object: new Set(['values', 'entries']), Array: new Set(['from', 'of']) };
let LEAF_SET = new Set();
function stateUses(ast, roots, where, stateWrites, isLeafImport) {
  const rows = [];
  const row = (n, how) => rows.push(where(n) + ' -- ' + how);
  const write = (n, how) => { const w = where(n) + ' -- ' + how + ' into the state (followed)'; if (!stateWrites.some((x) => x.startsWith(where(n)))) stateWrites.push(w); };
  const seen = new Set();
  const isTarget = (path) => {
    const p = path.parent, n = path.node;
    return (p.type === 'AssignmentExpression' && p.left === n) || p.type === 'UpdateExpression'
      || (p.type === 'UnaryExpression' && p.operator === 'delete')
      || ((p.type === 'ForInStatement' || p.type === 'ForOfStatement') && p.left === n)
      || p.type === 'ObjectProperty' && p.value === n && path.parentPath.parent.type === 'ObjectPattern'
      || p.type === 'ArrayPattern' || p.type === 'RestElement' || p.type === 'AssignmentPattern' && p.left === n;
  };
  const followBinding = (scope, name, at) => {
    const b = scope.getBinding(name);
    if (!b) { row(at, 'the state kept in ' + name + ' (no binding)'); return; }
    if (b.constantViolations.length) { row(at, 'the state kept in ' + name + ', given another value later'); return; }
    for (const r of b.referencePaths) follow(r);
  };
  const pattern = (pathAt, pat) => {
    if (!pat) return;
    if (pat.type === 'Identifier') { followBinding(pathAt.scope, pat.name, pat); return; }
    if (pat.type === 'AssignmentPattern') { pattern(pathAt, pat.left); return; }
    if (pat.type === 'RestElement') { pattern(pathAt, pat.argument); return; }
    if (pat.type === 'ObjectPattern') { for (const pr of pat.properties) pattern(pathAt, pr.type === 'RestElement' ? pr.argument : pr.value); return; }
    if (pat.type === 'ArrayPattern') { for (const e of pat.elements) pattern(pathAt, e); return; }
    row(pat, 'the state given to a pattern it cannot read');
  };
  /* the callbacks of a reading method: a function written there has its parameters followed */
  const callbacks = (callPath) => {
    for (const a of callPath.get('arguments')) {
      if (a.isFunction()) { for (const prm of a.node.params) pattern(a, prm); continue; }
      if (a.isIdentifier() || isMember(a.node) || isCall(a.node)) {
        const fp = fnOf(a);
        if (fp) { for (const prm of fp.node.params) pattern(fp, prm); continue; }
        if (maybeFn(a)) row(a.node, 'a function the guard cannot read handed the state\'s parts');
      }
    }
  };
  /* handed to a call as an argument */
  const handed = (path, callPath) => {
    const c = callPath.node.callee;
    if (c.type === 'Identifier') {
      const b = callPath.scope.getBinding(c.name);
      if (!b && SAFE_CALLS.has(c.name)) return;
      if (b && b.kind === 'module') {
        const src = b.path.parentPath.node.source && b.path.parentPath.node.source.value;
        if (src && isLeafImport(src)) return;          /* the mark goes on (rule 2) */
        row(path.node, 'the state handed to an import that is not a leaf (' + c.name + ')');
        return;
      }
      if (b && b.kind !== 'param' && !b.constantViolations.length && (b.path.isFunctionDeclaration()
        || (b.path.isVariableDeclarator() && b.path.node.init && /Function/.test(b.path.node.init.type)))) return;   /* a local function: followed */
      row(path.node, 'the state handed to ' + c.name + ' (a function the guard cannot read)');
      return;
    }
    if (isMember(c) && c.object.type === 'Identifier' && !callPath.scope.getBinding(c.object.name)) {
      const k = propName(c);
      if (Object.prototype.hasOwnProperty.call(SAFE_OF, c.object.name) && (SAFE_OF[c.object.name] === null || SAFE_OF[c.object.name].has(k))) return;
      if (ALIAS_OF[c.object.name] && ALIAS_OF[c.object.name].has(k)) { follow(callPath); return; }
    }
    row(path.node, 'the state handed to ' + (isMember(c) ? 'a method (.' + (propName(c) || '?') + ')' : 'a ' + c.type));
  };
  /* `path` is a value of the state: each use must be an allowed form */
  const follow = (path) => {
    const n = path.node;
    if (!n || seen.has(n)) return;
    seen.add(n);
    const p = path.parent, pp = path.parentPath;
    if (isMember(p) && p.object === n) {
      const k = propName(p);
      if (isTarget(pp)) { write(p, 'a write'); return; }
      const g = pp.parent;
      if (isCall(g) && g.callee === p) {
        if (k && MUTATORS.has(k)) { write(g, '.' + k + '()'); return; }
        if (k && READ_PRIMITIVE.has(k)) { callbacks(pp.parentPath); return; }
        if (k && READ_ALIAS.has(k)) { callbacks(pp.parentPath); follow(pp.parentPath); return; }
        row(g, 'a method of the state not on the reading lists (' + (k || 'a computed key') + ')');
        return;
      }
      follow(pp);
      return;
    }
    if (isTarget(path)) { row(n, 'the state\'s place given another value'); return; }
    switch (p.type) {
      case 'VariableDeclarator':
        if (p.init === n) { pattern(pp, p.id); return; }
        break;
      case 'ForOfStatement':
        if (p.right === n) {
          const l = p.left;
          if (l.type === 'VariableDeclaration') pattern(pp, l.declarations[0].id);
          else row(l, 'the state\'s parts given to a name or member written again');
          return;
        }
        break;
      case 'ForInStatement': if (p.right === n) return; break;
      case 'SpreadElement':
        if (pp.parent.type === 'ArrayExpression' || pp.parent.type === 'ObjectExpression') { follow(pp.parentPath); return; }
        if (isCall(pp.parent) || pp.parent.type === 'NewExpression') { handed(pp, pp.parentPath); return; }
        break;
      case 'ArrayExpression': follow(pp); return;
      case 'ObjectProperty':
        if (p.value === n && pp.parent.type === 'ObjectExpression') { follow(pp.parentPath); return; }
        break;
      case 'LogicalExpression': case 'ParenthesizedExpression': case 'TSNonNullExpression': case 'AwaitExpression':
        follow(pp); return;
      case 'ConditionalExpression': if (p.test === n) return; follow(pp); return;
      case 'SequenceExpression': if (p.expressions[p.expressions.length - 1] === n) follow(pp); return;
      case 'MemberExpression': case 'OptionalMemberExpression':
        if (p.property === n && p.computed) return;     /* a key read: `x[S.k]` */
        break;
      case 'BinaryExpression': case 'TemplateLiteral': case 'IfStatement': case 'WhileStatement': case 'DoWhileStatement':
      case 'SwitchStatement': case 'SwitchCase': case 'ReturnStatement': case 'ExpressionStatement': case 'TaggedTemplateExpression':
        return;
      case 'UnaryExpression': if (p.operator !== 'delete') return; break;
      case 'ArrowFunctionExpression': if (p.body === n) return; break;
      case 'CallExpression': case 'OptionalCallExpression': case 'NewExpression':
        if (p.callee === n) { row(n, 'the state called as a function'); return; }
        handed(path, pp); return;
      default: break;
    }
    row(n, 'the state in a ' + p.type + ' (a form the guard cannot follow)');
  };
  for (const b of roots) for (const r of b.referencePaths) follow(r);
  babel.traverse(ast, {
    'MemberExpression|OptionalMemberExpression'(p) { if (globalStateBase(p.node) && bases(p.node).some(globalStateBase) && p.node.object.type === 'Identifier') follow(p); },
  });
  return rows;
}

/* ── who fills a leaf's parameter with the state (callers under src/) ── */
const ALIAS = (spec, fromRel) => (spec.startsWith('@/') ? 'src/' + spec.slice(2)
  : (spec.startsWith('.') ? posix(relative(ROOT, resolve(join(ROOT, dirname(fromRel)), spec))) : null));
const withExt = (p) => (p && !/\.(m?js|jsx)$/.test(p) ? p + '.js' : p);
const isStateArg = (a, scope) => {
  const bs = bases(a);
  if (bs.some(globalStateBase)) return true;
  return bs.some((b) => b.type === 'Identifier' && (b.name === 'S' || b.name === 'stateRef'
    || (b.name === 'state' && !!scope.getBinding('state'))));
};
function callersFill(leafSet) {
  const fill = new Map();   /* leaf rel -> Map(exported name -> Set(pos)) */
  const add = (rel, name, pos) => {
    if (!fill.has(rel)) fill.set(rel, new Map());
    const m = fill.get(rel);
    if (!m.has(name)) m.set(name, new Set());
    m.get(name).add(pos);
  };
  for (const rel of walk('src')) {
    const text = readFileSync(join(ROOT, rel), 'utf8');
    if (!/rendering\/(leaves|tables)\/|\.\/(leaves|tables)\/|\.\.\/(leaves|tables)\//.test(text) && !leafSet.has(rel)) continue;   /* a cheap look first */
    if (leafSet.has(rel)) continue;   /* a leaf's own hand-on is read in its scan */
    const ast = parse(text);
    babel.traverse(ast, {
      'CallExpression|OptionalCallExpression'(p) {
        const c = p.node.callee;
        if (c.type !== 'Identifier') return;
        const b = p.scope.getBinding(c.name);
        if (!b || b.kind !== 'module') return;
        const target = withExt(ALIAS(b.path.parentPath.node.source.value, rel));
        if (!leafSet.has(target)) return;
        const imp = b.path.node;
        const name = imp.type === 'ImportDefaultSpecifier' ? 'default' : (imp.imported ? (imp.imported.name || imp.imported.value) : null);
        p.node.arguments.forEach((a, i) => { if (isStateArg(a, p.scope)) add(target, name, i); });
      },
    });
  }
  return fill;
}

/* ── rule 3: the chain of imports, off esbuild's graph ───────────────── */
async function importGraph(entries) {
  const res = await esbuild.build({
    absWorkingDir: ROOT,
    entryPoints: entries,
    bundle: true, write: false, metafile: true, logLevel: 'silent',
    format: 'esm', platform: 'browser', outdir: 'out', splitting: true,
    plugins: [{
      name: 'page',
      setup(b) {
        b.onResolve({ filter: /^@\// }, (a) => b.resolve('./' + 'src/' + a.path.slice(2), { kind: a.kind, resolveDir: ROOT }));
        b.onResolve({ filter: /^[^./@]|^@[^/]/ }, () => ({ external: true }));
        b.onResolve({ filter: /\.(css|png|jpe?g|webp|svg|json|wav|mp3|ogg|glsl|frag|vert|txt|wasm)(\?.*)?$/ }, () => ({ external: true }));
      },
    }],
  });
  const g = new Map();
  for (const [file, info] of Object.entries(res.metafile.inputs)) g.set(posix(file), info.imports.filter((i) => !i.external).map((i) => posix(i.path)));
  return g;
}
/* the shortest chain from `from` to a file under SYSTEMS_DIR, or null */
function chainToSystems(g, from) {
  const prev = new Map([[from, null]]);
  const q = [from];
  while (q.length) {
    const f = q.shift();
    if (f !== from && f.startsWith(SYSTEMS_DIR)) {
      const chain = [];
      for (let x = f; x; x = prev.get(x)) chain.unshift(x);
      return chain;
    }
    for (const n of g.get(f) || []) if (!prev.has(n)) { prev.set(n, f); q.push(n); }
  }
  return null;
}

/* ── 5. the rules, on a fixture (first: a blind scan fails here) ─────── */
{
  const CLEAN = `import { T } from '../tables/social.js';
export const TABLE = { a: 1 };
const BUILT = {}; for (const k of ['x']) BUILT[k] = 1;
export function bubbleUp(S, pid, now) { const b = S && S.chatBubbles ? S.chatBubbles[pid] : null; const out = []; out.push(b); const spr = {}; spr.x = 1; return !!b && now < b.until && T.n > 0; }
export const draw = (sprite, S) => { sprite.alpha = S.a; sprite.scale.set(2); };`;
  const PLANTS = [
    ['the plant\'s `let`', 'export function f(S) { return S.a; }\nlet _bubbleSeen = new Map();', 'moduleState'],
    ['a `var`', 'var _n = 0;\nexport const f = () => 1;', 'moduleState'],
    ['a `var` in a top-level block', '{ var _n = 0; }\nexport const f = () => 1;', 'moduleState'],
    ['a `const` Map filled', 'const _seen = new Map();\nexport function f(S, pid, now) { _seen.set(pid, now); }', 'moduleState'],
    ['a `const` array pushed', 'const _q = [];\nexport function f(x) { _q.push(x); }', 'moduleState'],
    ['a `const` filled through a name', 'const _seen = {};\nexport function f(k) { const m = _seen; m[k] = 1; }', 'moduleState'],
    ['a value taken from a `const`', 'const _seen = new Map();\nexport function f(k) { _seen.get(k).n++; }', 'moduleState'],
    ['an imported table filled', 'import { _seen } from \'../tables/social.js\';\nexport function f(k) { _seen[k] = 1; }', 'moduleState'],
    ['a top-level function given a new value', 'export function f() {}\nexport function g() { f = null; }', 'moduleState'],
    ['the plant\'s write to S', 'export function f(S, now) { S._lastBubbleAsk = now; }', 'stateWrites'],
    ['Object.assign(S, ...)', 'export function f(S, now) { Object.assign(S, { _ask: now }); }', 'stateWrites'],
    ['deep in S', 'export function f(S, pid, now) { S.chatBubbles[pid].seen = now; }', 'stateWrites'],
    ['a Set of S filled', 'export function f(S, id) { S._peersNotDrawn.add(id); }', 'stateWrites'],
    ['through a name', 'export function f(S, pid) { const c = S.chatBubbles; c[pid] = 1; }', 'stateWrites'],
    ['destructured', 'export function f(S) { const { chatBubbles } = S; delete chatBubbles.x; }', 'stateWrites'],
    ['a pattern', 'export function f(S, o) { ({ a: S.x } = o); }', 'stateWrites'],
    ['S renamed, a caller fills it', 'export function f(st, now) { st._ask = now; }', 'stateWrites', new Map([['f', new Set([0])]])],
    ['handed to a local leaf', 'function g(st) { st.x = 1; }\nexport function f(S) { g(S); }', 'stateWrites', null, true],
    ['window._gameState', 'export function f() { window._gameState.current.x = 1; }', 'stateWrites'],
    /* v2.3.6521: sitting 57's plants */
    ['a callback given the state\'s parts', 'export function f(S, now) { S.monsters.forEach((m) => { m.seen = now; }); }', 'stateWrites'],
    ['a callback, the state as an argument', 'export function f(S) { Object.values(S.monsters).map(function (m) { m.n++; }); }', 'stateWrites'],
    /* v2.3.6521: sitting 58's plants (a function handed over by name) */
    ['a callback by name', 'export function f(S) { const mark = (m) => { m.seen = 1; }; S.monsters.forEach(mark); }', 'stateWrites'],
    ['a callback bound', 'export function f(S) { function mark(m) { m.n = 1; } S.monsters.forEach(mark.bind(null)); }', 'stateWrites'],
    ['the state through .call', 'export function f(S) { const g = (x) => { x.seen = 1; }; g.call(null, S); }', 'stateWrites', null, true],
    ['a callback it cannot follow', 'export function f(S) { const q = S.pick(); S.monsters.forEach(q); }', 'unfollowed'],
    ['a `let` in a function run once at load', 'export const tick = (() => { let n = 0; return () => n++; })();', 'moduleState'],
    ['a `const` Map in a function run once at load, filled', 'export const remember = (function () { const seen = new Map(); return (k) => { seen.set(k, 1); }; })();', 'moduleState'],
    ['a page global', 'export function f() { window.__seen = window.__seen || new Map(); }', 'globals'],
    /* v2.3.6526: sitting 59's plants (rule 2c follows every use) */
    ['a copy\'s parts written', 'export function f(S) { for (const m of [...S.monsters]) m.seen = 1; }', 'stateWrites'],
    ['handed to a method of another object', 'const _H = { mark(x) { x.seen = 1; } };\nexport function f(S) { for (const m of S.monsters) _H.mark(m); }', 'uses'],
    ['kept in an object', 'export function f(S) { const _w = { s: S }; _w.s._zz = 1; }', 'stateWrites'],
    /* v2.3.6526: card WL's own, not designed for */
    ['an array pattern', 'export function f(S) { const [first] = S.monsters; first.hp = 0; }', 'stateWrites'],
    ['kept in a member', 'export function f(S) { const o = {}; o.m = S.monsters; o.m[0].x = 1; }', 'uses'],
    ['an iterator walked', 'export function f(S) { const it = S.byId.values(); it.next().value.x = 1; }', 'uses'],
    ['a slice\'s entry written', 'export function f(S) { S.monsters.slice(0, 1)[0].dead = true; }', 'stateWrites'],
    ['a found entry, through a default', 'export function f(S) { (S.monsters || []).find(Boolean).x = 1; }', 'stateWrites'],
    ['Reflect.set on a part', 'export function f(S) { Reflect.set(S.player, \'x\', 1); }', 'uses'],
  ];
  const clean = scanLeaf('fixture/clean.js', CLEAN);
  if (clean.moduleState.length || clean.stateWrites.length || clean.globals.length || clean.unfollowed.length) {
    bad('5. a clean leaf is read as dirty: ' + [...clean.moduleState, ...clean.stateWrites, ...clean.globals, ...clean.unfollowed].join('; '));
  } else ok('5. a clean leaf (a table, one built at load, locals written, a sprite written, S read) passes');
  const missed = [];
  for (const [what, text, list, fills, handOn] of PLANTS) {
    let r = scanLeaf('fixture/plant.js', text, fills || new Map());
    if (handOn) {   /* the hand-on, as the main loop does it: a second pass with the marks */
      const m = new Map();
      for (const h of r.handsOn) if (h.local) { if (!m.has('#' + h.local)) m.set('#' + h.local, new Set()); m.get('#' + h.local).add(h.pos); }
      r = scanLeaf('fixture/plant.js', text, m);
    }
    if (!r[list].length) missed.push(what);
  }
  /* the chain, on a made graph */
  const G = new Map([['src/rendering/leaves/a.js', ['src/rendering/b.js']], ['src/rendering/b.js', ['src/rendering/systems/r.js']]]);
  if (!chainToSystems(G, 'src/rendering/leaves/a.js')) missed.push('the chain through a middle file');
  if (chainToSystems(new Map([['src/rendering/leaves/a.js', ['src/rendering/b.js']]]), 'src/rendering/leaves/a.js')) missed.push('(a chain read where there is none)');
  if (missed.length) bad('5. the rules miss ' + missed.length + ' of ' + (PLANTS.length + 2) + ' plants: ' + missed.join('; '));
  else ok('5. the rules catch all ' + (PLANTS.length + 2) + ' plants (module state 11, the state 15 with the rename, the hand-on and the callbacks, one it cannot follow, a global, the chain; v2.3.6526: sitting 59\'s 3 and card WL\'s 6, every use followed)');
}

/* ── the leaves, read ─────────────────────────────────────────────────── */
const leafFiles = LEAF_DIRS.flatMap(walk);
const leafSet = new Set(leafFiles);
LEAF_SET = leafSet;
if (leafFiles.length < 20) bad('the leaves and tables are ' + leafFiles.length + ' files: the folders moved? (26 on 2026-11-23)');
else ok(leafFiles.length + ' leaf and table files read (' + LEAF_DIRS.join(', ') + ')');

/* the state's marks: callers first, then each leaf's hand-on, until still */
const fills = callersFill(leafSet);
const texts = new Map(leafFiles.map((r) => [r, readFileSync(join(ROOT, r), 'utf8')]));
const marksOf = (rel) => {
  const m = new Map();
  for (const [name, set] of (fills.get(rel) || new Map())) m.set(name, new Set(set));
  return m;
};
let results = new Map();
for (let round = 0; round < 6; round++) {
  results = new Map(leafFiles.map((r) => [r, scanLeaf(r, texts.get(r), marksOf(r))]));
  let grew = false;
  const addFill = (rel, name, pos) => {
    if (!fills.has(rel)) fills.set(rel, new Map());
    const m = fills.get(rel);
    if (!m.has(name)) m.set(name, new Set());
    if (!m.get(name).has(pos)) { m.get(name).add(pos); grew = true; }
  };
  for (const [rel, r] of results) {
    for (const h of r.handsOn) {
      if (h.local) addFill(rel, '#' + h.local, h.pos);
      else {
        const target = withExt(ALIAS(h.src, rel));
        if (leafSet.has(target) && h.name) addFill(target, h.name, h.pos);
      }
    }
  }
  if (!grew) break;
}
const filled = [...fills.values()].reduce((s, m) => s + [...m.values()].reduce((t, x) => t + x.size, 0), 0);

/* 1 */
const ms = [...results.values()].flatMap((r) => r.moduleState);
if (ms.length) { bad('1. module state in a leaf (' + ms.length + '):'); ms.forEach((m) => console.log('       ' + m)); }
else ok('1. no leaf or table holds module state (no top-level let/var, no top-level or imported binding written from a function)');

/* 2 */
const sw = [...results.values()].flatMap((r) => r.stateWrites);
if (sw.length) { bad('2. a leaf writes to the state (' + sw.length + '):'); sw.forEach((m) => console.log('       ' + m)); }
else ok('2. no leaf or table writes to S (parameters named S, and ' + filled + ' a caller or a leaf fills with the state)');

/* 2b. v2.3.6521 (sitting 58): the forms of handing the state's parts on that
   the scan cannot follow (a function by a parameter, a member or a call's
   result, given over the state; `.apply` with a list it cannot read), by
   file: the list only falls, so a new spelling is red, never green */
{
  const by = Object.create(null);
  for (const [rel, r] of results) if (r.unfollowed.length) by[rel] = r.unfollowed;
  const over = Object.keys(by).filter((rel) => by[rel].length > (UNFOLLOWED[rel] || 0));
  const n = Object.values(by).reduce((t, u) => t + u.length, 0);
  if (over.length) { bad('2b. forms the scan cannot follow, over the list (' + n + '; the list ' + Object.values(UNFOLLOWED).reduce((t, x) => t + x, 0) + '):'); over.forEach((rel) => by[rel].forEach((m) => console.log('       ' + m))); }
  else ok('2b. forms of handing the state on that the scan cannot follow: ' + n + ' (the list only falls)');
  const fell = Object.keys(UNFOLLOWED).filter((rel) => (by[rel] || []).length < UNFOLLOWED[rel]);
  if (fell.length) console.log('     (room: ' + fell.map((rel) => rel + ' ' + (by[rel] || []).length + ' < ' + UNFOLLOWED[rel]).join(', ') + '; lower the list)');
  if (process.argv.includes('--list')) for (const rel of Object.keys(by)) by[rel].forEach((m) => console.log('     unfollowed ' + m));
}

/* 2c. v2.3.6526 (sitting 59): the state's every use is an allowed form, or a row of USES (by
   file; it only falls): a new spelling is red, never green */
{
  const over = [];
  let n = 0;
  for (const [rel, r] of results) {
    n += r.uses.length;
    if (r.uses.length > (USES[rel] || 0)) over.push(rel + ' (' + r.uses.length + ', its row ' + (USES[rel] || 0) + '): ' + r.uses.join('; '));
  }
  const line = Object.values(USES).reduce((t, x) => t + x, 0);
  if (over.length) { bad('2c. uses of the state that are no allowed form, over the list (' + n + '; the list ' + line + ' in ' + Object.keys(USES).length + ' row(s)):'); over.forEach((x) => console.log('       ' + x)); }
  else ok('2c. every use of the state in a leaf is a named read, a reading method, a followed name or copy, a value, or a function the guard reads: ' + n + ' other (the list ' + line + ' in ' + Object.keys(USES).length + ' row(s); it only falls)');
  if (process.argv.includes('--uses')) for (const [, r] of results) for (const u of r.uses) console.log('       use ' + u);
}

/* 3 */
{
  const g = await importGraph(leafFiles);
  const reached = [];
  for (const f of leafFiles) {
    if (!g.has(f)) { reached.push(f + ': not in esbuild\'s graph (the scan is blind)'); continue; }
    const c = chainToSystems(g, f);
    if (c) reached.push(c.join(' -> '));
  }
  if (reached.length) { bad('3. a leaf reaches systems/ (' + reached.length + '):'); reached.forEach((m) => console.log('       ' + m)); }
  else ok('3. no leaf or table reaches ' + SYSTEMS_DIR + ' through any chain of imports (' + g.size + ' files in the graph)');
}

/* 4 */
{
  const seen = [...new Set([...results.values()].flatMap((r) => r.globals))].sort();
  const extra = seen.filter((s) => !KNOWN_GLOBALS.includes(s));
  if (seen.length > GLOBAL_LINE || extra.length) {
    bad('4. ' + seen.length + ' page globals written by leaves (the line ' + GLOBAL_LINE + '); new: ' + (extra.join(', ') || '(none: the line)'));
  } else if (seen.length < GLOBAL_LINE) {
    ok('4. ' + seen.length + ' page globals written by leaves, under the line ' + GLOBAL_LINE + ': lower KNOWN_GLOBALS (the gatekeeper)');
  } else ok('4. ' + seen.length + ' page globals written by leaves (the QA probes), the line ' + GLOBAL_LINE);
}

process.exit(failed ? 1 : 0);
