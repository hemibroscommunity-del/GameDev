/* v2.3.6523: the open hand's census (card WL PR 4; grand plan step 5.7).
 *
 * BroTown.jsx hands the whole game to the page: `window._gameState =
 * stateRef` and `window._gameFns = {...}`.  Anything under src/ that reaches
 * through that hand (rather than being handed what it needs) is a reader,
 * and closing the hand (5.7) means each reader moved.  This module FINDS
 * them, off the syntax tree (finish.md part 5, rule 2), never a pattern of
 * text: open-hand.test.mjs holds the count.
 *
 * A REACH is a code line under src/ that:
 *   a. names a hand off the page's global: `window._gameState`,
 *      `globalThis._gameFns`, `self[...]`, `window.window._gameState`, a key
 *      written out or one that adds up to the name (`window['_game' +
 *      'State']`, a `const` holding it: babel's evaluate), `?.` included;
 *   b. does so through a name for the global (`const w = window`,
 *      `const g = typeof window !== 'undefined' ? window : globalThis`);
 *   c. takes it apart (`const { _gameState } = window`, `({ _gameFns: f } =
 *      globalThis)`, `const { window: { _gameState } } = globalThis`);
 *   d. asks for it another way: `Reflect.get(window, '_gameState')` (and
 *      `has`, `set`, `getOwnPropertyDescriptor`, `defineProperty`),
 *      `'_gameState' in window`, or the bare global (`_gameState.current`
 *      with no binding of that name);
 *   e. USES A NAME HOLDING ONE: `const g = window._gameState` makes every
 *      later line that reads `g` a reach too (so a new read through an old
 *      alias counts), and so does a name taken from it (`const S =
 *      g.current`), a function that hands it back (`const gs = () =>
 *      window._gameState`; `function gs() { return ... }`: each call), and
 *      any of these imported from another file under src/ (an `export const`
 *      of one, followed file to file).
 * The count is the set of such lines a file (two on one line are one line;
 * a comment or a string that only mentions the name is none).
 *
 * NOT CAUGHT, and why: a hand passed as an argument to a function that
 * reads its parameter (the reach is counted at the call, not in the
 * callee); a key held in a variable that changes (`window[k]` with `k` not a
 * constant: no rule can read it short of running it); `eval`, `Function`,
 * `with`; a walk over the global's keys (`Object.entries(window)`); a
 * namespace handed on (`export * as C from`).  v2.3.6523 (sitting 57): a
 * namespace import (`import * as C`, then `C.getState()`), a getter given
 * a second name (`const gs = getState`), a named re-export and `export *
 * from` are followed now (they were not).  v2.3.6523 (sitting 58): the
 * scan no longer knows spellings of a getter's use: a namespace is followed
 * however it is made (`import *`, `await import()`, `.then`, a second name)
 * and taken apart, and every use of a getter or namespace is judged: called
 * (`.call`, `.apply`, `.bind` too) is a reach 'f', a second name or an
 * export is followed, and ANY other use (an object, an argument such as
 * `useMemo(getState)`, a key it cannot read, an `import(u)` of a path it
 * cannot read) is a reach 'g': a form it cannot follow is red, not green.
 *
 * Speed: every file is parsed (@babel/parser, about 0.8 s for src/), walked
 * by a plain loop for anything that could be a reach, and only those files
 * (about 60) are traversed with babel's scopes, which are slow.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, posix } from 'node:path';
import { createRequire } from 'node:module';

export const HANDS = new Set(['_gameState', '_gameFns']);
/* the page's global by its own names; `top`, `parent`, `frames` are the
   global of a frame, and only count when a hand is read off them */
const ROOTS = new Set(['window', 'globalThis', 'self', 'top', 'parent', 'frames']);
const SELF_KEYS = new Set(['window', 'globalThis', 'self']);
const REFLECT = new Set(['get', 'has', 'set', 'getOwnPropertyDescriptor', 'defineProperty', 'deleteProperty']);

export function loadBabel(root) {
  for (const pkg of ['package.json', 'server/package.json']) {
    try {
      const req = createRequire(join(root, pkg));
      const t = req('@babel/traverse');
      return { parser: req('@babel/parser'), traverse: t.default || t };
    } catch { /* the next */ }
  }
  return null;
}

/* every .js/.jsx/.mjs under src/, as repo-relative paths with '/' */
export function srcFiles(root) {
  const out = [];
  (function walk(rel) {
    for (const f of readdirSync(join(root, rel))) {
      const r = rel + '/' + f;
      if (statSync(join(root, r)).isDirectory()) walk(r);
      else if (/\.(m?js|jsx)$/.test(f)) out.push(r);
    }
  })('src');
  return out.sort();
}

const SKIP = new Set(['loc', 'start', 'end', 'leadingComments', 'trailingComments', 'innerComments', 'extra', 'range']);
function walk(n, f) {
  if (!n || typeof n.type !== 'string') return;
  f(n);
  for (const k in n) {
    if (SKIP.has(k)) continue;
    const v = n[k];
    if (Array.isArray(v)) { for (const c of v) if (c && typeof c.type === 'string') walk(c, f); }
    else if (v && typeof v.type === 'string') walk(v, f);
  }
}

/* ── the fast look: could this file hold a reach?  A superset by design:
   it ignores scopes (a `window` that is a parameter still counts as the
   global) and treats any key it cannot read as a possible hand.  Names for
   the global are collected by name, so `const w = window; w[k]` is seen. */
function couldReach(ast) {
  const winNames = new Set(ROOTS);
  walk(ast.program, (n) => {
    if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier' && n.init && mentionsRoot(n.init, winNames)) winNames.add(n.id.name);
    if (n.type === 'AssignmentExpression' && n.left.type === 'Identifier' && mentionsRoot(n.right, winNames)) winNames.add(n.left.name);
  });
  let hit = false;
  const loose = (k) => !(k.type === 'StringLiteral' && !HANDS.has(k.value)) && !(k.type === 'NumericLiteral');
  walk(ast.program, (n) => {
    if (hit) return;
    if (n.type === 'Identifier' && HANDS.has(n.name)) hit = true;
    else if (n.type === 'CallExpression' && n.callee.type === 'Import' && n.arguments[0] && n.arguments[0].type !== 'StringLiteral'
      && !(n.arguments[0].type === 'TemplateLiteral' && !n.arguments[0].expressions.length)) hit = true;   /* v2.3.6523: a path it cannot read */
    else if (n.type === 'StringLiteral' && HANDS.has(n.value)) hit = true;
    else if ((n.type === 'MemberExpression' || n.type === 'OptionalMemberExpression') && n.computed && mentionsRoot(n.object, winNames) && loose(n.property)) hit = true;
    else if (n.type === 'ObjectPattern' && n.properties.some((p) => p.type === 'ObjectProperty' && p.computed && loose(p.key))) hit = true;
    else if (n.type === 'BinaryExpression' && n.operator === 'in' && mentionsRoot(n.right, winNames) && loose(n.left)) hit = true;
    else if (n.type === 'CallExpression' && n.callee.type === 'MemberExpression' && n.callee.object.type === 'Identifier'
      && (n.callee.object.name === 'Reflect' || (n.callee.object.name === 'Object' && /^(getOwnPropertyDescriptor|defineProperty)$/.test(n.callee.property.name || ''))) && n.arguments[0] && mentionsRoot(n.arguments[0], winNames)) hit = true;
  });
  return hit;
}
/* shallow: the expression itself is a name for the global, or a member
   (`window.window`, a key it cannot read), choice or sequence that could be
   one: a superset */
function mentionsRoot(n, names) {
  if (!n) return false;
  switch (n.type) {
    case 'Identifier': return names.has(n.name);
    case 'MemberExpression': case 'OptionalMemberExpression':
      /* window.window, or a key it cannot read: the global's own name */
      return (n.computed ? !(n.property.type === 'StringLiteral' && !SELF_KEYS.has(n.property.value))
        : n.property.type === 'Identifier' && SELF_KEYS.has(n.property.name)) && mentionsRoot(n.object, names);
    case 'ConditionalExpression': return mentionsRoot(n.consequent, names) || mentionsRoot(n.alternate, names);
    case 'LogicalExpression': return mentionsRoot(n.left, names) || mentionsRoot(n.right, names);
    case 'SequenceExpression': return mentionsRoot(n.expressions[n.expressions.length - 1], names);
    case 'AssignmentExpression': return mentionsRoot(n.right, names);
    default: return false;
  }
}

/* ── the careful look, with babel's scopes ─────────────────────────────── */

/* the module a written import path names, or null (outside src/, a package) */
function resolveImport(fromRel, spec, has) {
  let base;
  if (spec.startsWith('@/')) base = 'src/' + spec.slice(2);
  else if (spec.startsWith('.')) base = posix.normalize(posix.join(posix.dirname(fromRel), spec));
  else return null;
  for (const c of [base, base + '.js', base + '.jsx', base + '.mjs', base + '/index.js', base + '/index.jsx']) if (has(c)) return c;
  return null;
}

function analyse(babel, rel, ast, exportsOf, has) {
  const reach = new Map();               /* line -> how */
  const mark = (node, how) => { const l = node.loc.start.line; if (!reach.has(l)) reach.set(l, how); };
  const exp = Object.create(null);       /* exported name -> 'win' | 'hand' | 'getter' */
  const keyOf = (path) => {
    const n = path.node;
    if (!n) return null;
    if (n.type === 'Identifier') return null;   /* a computed key that is a name: evaluate below */
    const e = path.evaluate();
    return e.confident && typeof e.value === 'string' ? e.value : null;
  };
  const memberKey = (path) => {
    const n = path.node;
    if (!n.computed) return n.property.type === 'Identifier' ? n.property.name : null;
    const p = path.get('property');
    const e = p.evaluate();
    return e.confident && typeof e.value === 'string' ? e.value : null;
  };
  const patternKey = (pp) => {
    const n = pp.node;
    if (!n.computed) return n.key.type === 'Identifier' ? n.key.name : (n.key.type === 'StringLiteral' ? n.key.value : null);
    const e = pp.get('key').evaluate();
    return e.confident && typeof e.value === 'string' ? e.value : null;
  };

  /* kinds of names, by binding: 'win' (the global), 'hand' (holds a hand or
     something taken from one), 'getter' (a function that hands one back) */
  const kind = new Map();                /* Binding -> kind */
  /* v2.3.6523 (sitting 57's hold: `import * as C` then `C.getState()`
     stayed green): a namespace import's binding -> the exports of its file,
     so `C.x` has the kind its file gave x */
  /* v2.3.6523 (sitting 58's hold: a reader through `await import(..)`, a
     namespace taken apart, `.bind`/`.call`, a getter in an object or handed
     to useMemo stayed green): a NAMESPACE is followed as a class -- `import
     * as C`, `const C = await import('./x.js')`, `import('./x.js').then((C)
     => ..)`, a name given one (`const D = C`) -- and so is each use of a
     getter (below, the reaches) */
  const dynSrc = (path) => {
    /* `import('./x.js')` (awaited or not): the file, or '?' when the path cannot be read */
    if (!path || !path.node) return null;
    if (path.isAwaitExpression()) return dynSrc(path.get('argument'));
    if (!path.isCallExpression() || path.node.callee.type !== 'Import') return null;
    const a = path.get('arguments')[0];
    const e = a && a.evaluate();
    return e && e.confident && typeof e.value === 'string' ? (resolveImport(rel, e.value, has) || '-') : '?';
  };
  const nsOfBinding = (b, depth = 0) => {
    if (!b || depth > 6) return null;
    const p = b.path;
    if (p.isImportNamespaceSpecifier()) return resolveImport(rel, p.parentPath.node.source.value, has);
    if (p.isVariableDeclarator() && p.get('id').isIdentifier() && !b.constantViolations.length) {
      const init = p.get('init');
      const d = dynSrc(init);
      if (d) return d;
      if (init.isIdentifier()) return nsOfBinding(init.scope.getBinding(init.node.name), depth + 1);
    }
    /* `import('./x.js').then((C) => ..)`: the callback's first parameter */
    const fp = b.kind === 'param' ? (p.isFunction() ? p : p.parentPath) : null;
    if (fp && fp.isFunction() && fp.node.params[0] && fp.node.params[0].type === 'Identifier' && fp.node.params[0].name === b.identifier.name) {
      const call = fp.parentPath;
      if (call && call.isCallExpression() && fp.listKey === 'arguments' && fp.key === 0) {
        const c = call.get('callee');
        if ((c.isMemberExpression() || c.isOptionalMemberExpression()) && memberKey(c) === 'then') return dynSrc(c.get('object'));
      }
    }
    return null;
  };
  const nsSrc = (objPath) => {
    if (!objPath || !objPath.node) return null;
    if (objPath.isIdentifier()) return nsOfBinding(objPath.scope.getBinding(objPath.node.name));
    return dynSrc(objPath);
  };
  const nsKind = (objPath, key) => {
    const src = nsSrc(objPath);
    return src && exportsOf.has(src) && key ? (exportsOf.get(src)[key] || null) : null;
  };
  /* the file's exports hold a hand, a getter or the global (a namespace of it handed on is a reach) */
  const nsHolds = (src) => src === '?' || (!!src && exportsOf.has(src) && Object.keys(exportsOf.get(src)).length > 0);
  const kindOfImport = (b) => {
    const p = b.path;
    if (!p.isImportSpecifier() && !p.isImportDefaultSpecifier()) return null;
    const src = resolveImport(rel, p.parentPath.node.source.value, has);
    if (!src || !exportsOf.has(src)) return null;
    const name = p.isImportDefaultSpecifier() ? 'default' : (p.node.imported.name || p.node.imported.value);
    return exportsOf.get(src)[name] || null;
  };
  const isWin = (path) => {
    if (!path || !path.node) return false;
    const n = path.node;
    if (n.type === 'Identifier') {
      const b = path.scope.getBinding(n.name);
      if (!b) return ROOTS.has(n.name);
      return kind.get(b) === 'win';
    }
    if (n.type === 'MemberExpression' || n.type === 'OptionalMemberExpression') return (SELF_KEYS.has(memberKey(path)) && isWin(path.get('object'))) || nsKind(path.get('object'), memberKey(path)) === 'win';
    if (n.type === 'ConditionalExpression') return isWin(path.get('consequent')) || isWin(path.get('alternate'));
    if (n.type === 'LogicalExpression') return isWin(path.get('left')) || isWin(path.get('right'));
    if (n.type === 'SequenceExpression') { const ex = path.get('expressions'); return isWin(ex[ex.length - 1]); }
    if (n.type === 'AssignmentExpression') return isWin(path.get('right'));
    return false;
  };
  /* a hand, or a value taken from one */
  const isHand = (path) => {
    if (!path || !path.node) return false;
    const n = path.node;
    if (n.type === 'MemberExpression' || n.type === 'OptionalMemberExpression') {
      if (HANDS.has(memberKey(path)) && isWin(path.get('object'))) return true;
      if (nsKind(path.get('object'), memberKey(path)) === 'hand') return true;
      return isHand(path.get('object'));
    }
    if (n.type === 'Identifier') {
      const b = path.scope.getBinding(n.name);
      if (!b) return HANDS.has(n.name);
      return kind.get(b) === 'hand';
    }
    if (n.type === 'CallExpression' || n.type === 'OptionalCallExpression') {
      const c = path.get('callee');
      if (c.isIdentifier()) { const b = path.scope.getBinding(c.node.name); if (b && kind.get(b) === 'getter') return true; }
      if ((c.isMemberExpression() || c.isOptionalMemberExpression()) && nsKind(c.get('object'), memberKey(c)) === 'getter') return true;
      if (isReflectHand(path)) return true;
      return isHand(c);
    }
    if (n.type === 'ConditionalExpression') return isHand(path.get('consequent')) || isHand(path.get('alternate'));
    if (n.type === 'LogicalExpression') return isHand(path.get('left')) || isHand(path.get('right'));
    if (n.type === 'SequenceExpression') { const ex = path.get('expressions'); return isHand(ex[ex.length - 1]); }
    if (n.type === 'AwaitExpression' || n.type === 'TSNonNullExpression') return isHand(path.get(n.type === 'AwaitExpression' ? 'argument' : 'expression'));
    if (n.type === 'AssignmentExpression') return isHand(path.get('right'));
    return false;
  };
  const isReflectHand = (path) => {
    const c = path.node.callee;
    if (!c || c.type !== 'MemberExpression' || c.computed || c.object.type !== 'Identifier') return false;
    if (!((c.object.name === 'Reflect' && REFLECT.has(c.property.name)) || (c.object.name === 'Object' && /^(getOwnPropertyDescriptor|defineProperty)$/.test(c.property.name)))) return false;
    if (path.scope.getBinding(c.object.name)) return false;
    const a = path.get('arguments');
    return a.length >= 2 && isWin(a[0]) && HANDS.has(keyOf(a[1]) || (a[1].node.type === 'Identifier' ? (a[1].evaluate().confident ? a[1].evaluate().value : null) : null));
  };
  /* a function whose answer is a hand */
  const returnsHand = (fnPath) => {
    if (!fnPath || !fnPath.node) return false;
    if (fnPath.isArrowFunctionExpression() && !fnPath.get('body').isBlockStatement()) return isHand(fnPath.get('body'));
    if (!fnPath.isFunction()) return false;
    let yes = false;
    fnPath.traverse({
      Function(p) { p.skip(); },
      ReturnStatement(p) { if (!yes && p.node.argument && isHand(p.get('argument'))) yes = true; },
    });
    return yes;
  };

  /* a getter by name, or a namespace's getter (`C.getState`) */
  const isGetter = (path) => {
    if (!path || !path.node) return false;
    if (path.isIdentifier()) { const b = path.scope.getBinding(path.node.name); return !!b && kind.get(b) === 'getter'; }
    if (path.isMemberExpression() || path.isOptionalMemberExpression()) return nsKind(path.get('object'), memberKey(path)) === 'getter';
    return false;
  };
  /* v2.3.6523 (sitting 58): how a getter is USED, judged as a class: called (`gs()`, `gs.call(..)`,
     `gs.apply(..)`, `gs.bind(..)`) is a reach 'f'; given a second name (`const g2 = gs`) or exported
     is followed (no line); ANY other use (in an object, handed to useMemo or any function, returned,
     put in a list) hands the hand on: a reach 'g', counted, so an unknown spelling is red */
  const getterUse = (p) => {
    const par = p.parentPath;
    if ((par.isCallExpression() || par.isOptionalCallExpression()) && p.key === 'callee') return 'f';
    if ((par.isMemberExpression() || par.isOptionalMemberExpression()) && p.key === 'object' && ['call', 'apply', 'bind'].includes(memberKey(par))) return 'f';
    if (par.isVariableDeclarator() && p.key === 'init' && par.get('id').isIdentifier()) return null;
    if (par.isExportSpecifier() || par.isExportDefaultDeclaration()) return null;
    return 'g';
  };
  /* v2.3.6523 (sitting 58): how a namespace is USED: a member read, a name given it, or taken apart
     are followed; any other use (handed to a function, kept in an object) hands every name its file
     exports on: a reach 'g' when its file holds a hand, a getter or the global */
  const nsUse = (p) => {
    const par = p.parentPath;
    if ((par.isMemberExpression() || par.isOptionalMemberExpression()) && p.key === 'object') return null;
    if (par.isVariableDeclarator() && p.key === 'init') return null;
    if (par.isExportSpecifier()) return null;
    return 'g';
  };

  /* the names, to a fixpoint (a name made from a name made from a hand) */
  const seen = new Set();
  babel.traverse(ast, {
    Scope(p) { for (const b of Object.values(p.scope.bindings)) seen.add(b); },
  });
  const all = [...seen];
  for (let round = 0, grew = true; grew && round < 8; round++) {
    grew = false;
    for (const b of all) {
      if (kind.has(b)) continue;
      let k = kindOfImport(b);
      const p = b.path;
      if (!k && p.isVariableDeclarator() && p.get('id').isIdentifier()) {
        const init = p.get('init');
        const sameWay = (f) => b.constantViolations.every((v) => v.isAssignmentExpression() && f(v.get('right')));
        if (init.node && isWin(init) && sameWay(isWin)) k = 'win';
        else if (init.node && isHand(init)) k = 'hand';
        else if (init.node && (init.isArrowFunctionExpression() || init.isFunctionExpression()) && returnsHand(init)) k = 'getter';
        /* v2.3.6523 (sitting 57's hold: `const gs = getState` stayed
           green): a getter given a second name is a getter */
        else if (init.node && init.isIdentifier() && sameWay(() => true)) {
          const ib = init.scope.getBinding(init.node.name);
          if (ib && kind.get(ib) === 'getter') k = 'getter';
        } else if (init.node && (init.isMemberExpression() || init.isOptionalMemberExpression()) && nsKind(init.get('object'), memberKey(init)) === 'getter') k = 'getter';
        else if (!init.node && b.constantViolations.length && b.constantViolations.some((v) => v.isAssignmentExpression() && isHand(v.get('right')))) k = 'hand';
      }
      if (!k && p.isFunctionDeclaration() && returnsHand(p)) k = 'getter';
      /* v2.3.6523 (sitting 58): `const g2 = getState.bind(null)` is a getter */
      if (!k && p.isVariableDeclarator() && p.get('id').isIdentifier() && p.get('init').isCallExpression()) {
        const c = p.get('init.callee');
        if ((c.isMemberExpression() || c.isOptionalMemberExpression()) && memberKey(c) === 'bind' && isGetter(c.get('object'))) k = 'getter';
      }
      /* v2.3.6523 (sitting 58): taken apart in a dynamic import's handler, `.then(({ getState }) => ..)` */
      if (!k && b.kind === 'param') {
        const fp = p.isFunction() ? p : p.parentPath;
        const pat = fp && fp.isFunction() && fp.node.params[0] && fp.node.params[0].type === 'ObjectPattern' ? fp.get('params')[0] : null;
        const call = pat && fp.parentPath;
        const c = call && call.isCallExpression() && fp.listKey === 'arguments' && fp.key === 0 ? call.get('callee') : null;
        const src = c && (c.isMemberExpression() || c.isOptionalMemberExpression()) && memberKey(c) === 'then' ? dynSrc(c.get('object')) : null;
        if (src && exportsOf.has(src)) {
          for (const pp of pat.get('properties')) {
            if (pp.isObjectProperty() && pp.get('value').isIdentifier() && pp.node.value.name === b.identifier.name && exportsOf.get(src)[patternKey(pp)]) k = exportsOf.get(src)[patternKey(pp)];
          }
        }
      }
      /* v2.3.6523 (sitting 58): a name taken apart from a namespace (`const { getState } = C`,
         `const { getState } = await import('./common.js')`) has the kind its file gave the key */
      if (!k && p.isVariableDeclarator() && p.get('id').isObjectPattern() && p.get('init').node) {
        const src = nsSrc(p.get('init'));
        if (src && exportsOf.has(src)) {
          for (const pp of p.get('id.properties')) {
            if (!pp.isObjectProperty() || !pp.get('value').isIdentifier() || pp.node.value.name !== b.identifier.name) continue;
            const key = patternKey(pp);
            if (key && exportsOf.get(src)[key]) k = exportsOf.get(src)[key];
          }
        }
      }
      /* a name taken apart from a hand: const { current: S } = window._gameState */
      if (!k && p.isVariableDeclarator() && !p.get('id').isIdentifier() && p.get('init').node && isHand(p.get('init'))) k = 'hand';
      /* a name taken apart from the global under a hand's key */
      if (!k && b.kind !== 'module' && fromWinPattern(b)) k = 'hand';
      if (k) { kind.set(b, k); grew = true; }
    }
  }
  /* a name bound inside a pattern that takes a hand off the global:
     `const { _gameState: g } = window`, or `({ _gameFns: f } = globalThis)`
     onto a `let f` */
  function fromWinPattern(b) {
    const id = b.identifier;
    const tops = [];
    if (b.path.isVariableDeclarator()) tops.push(b.path.get('id'));
    for (const v of b.constantViolations) if (v.isAssignmentExpression()) tops.push(v.get('left'));
    for (const top of tops) {
      let cur = findIn(top, id);
      while (cur && cur !== top) {
        const pp = cur.parentPath;
        if (pp.isObjectProperty() && pp.parentPath.isObjectPattern() && HANDS.has(patternKey(pp)) && isPatternOfWin(pp.parentPath)) return true;
        cur = pp;
      }
    }
    return false;
  }
  function findIn(path, id) {
    let found = null;
    if (path.node === id) return path;
    path.traverse({ Identifier(q) { if (!found && q.node === id) found = q; } });
    return found;
  }
  /* is this ObjectPattern taking apart the global (directly, or under a
     key that is the global's own name)? */
  function isPatternOfWin(pat) {
    const par = pat.parentPath;
    if (par.isVariableDeclarator() && pat.key === 'id') return isWin(par.get('init'));
    if (par.isAssignmentExpression() && pat.key === 'left') return isWin(par.get('right'));
    if (par.isAssignmentPattern() && pat.key === 'left') return isWin(par.get('right'));
    if (par.isObjectProperty() && par.parentPath.isObjectPattern()) return SELF_KEYS.has(patternKey(par)) && isPatternOfWin(par.parentPath);
    return false;
  }

  /* the reaches themselves */
  babel.traverse(ast, {
    'MemberExpression|OptionalMemberExpression'(p) {
      if (HANDS.has(memberKey(p)) && isWin(p.get('object'))) mark(p.node, 'a');
      /* v2.3.6523: through a namespace import, as a name would count */
      const nk = nsKind(p.get('object'), memberKey(p));
      if (nk === 'hand') mark(p.node, 'e');
      else if (nk === 'getter') { const u = getterUse(p); if (u) mark(p.node, u); }
      /* a namespace's key it cannot read (`C[k]`) of a file that holds a hand */
      else if (p.node.computed && memberKey(p) === null && nsHolds(nsSrc(p.get('object')))) mark(p.node, 'g');
    },
    ObjectProperty(p) {
      if (p.parentPath.isObjectPattern() && HANDS.has(patternKey(p)) && isPatternOfWin(p.parentPath)) mark(p.node, 'c');
    },
    BinaryExpression(p) {
      if (p.node.operator !== 'in' || !isWin(p.get('right'))) return;
      const e = p.get('left').evaluate();
      if (e.confident && HANDS.has(e.value)) mark(p.node, 'd');
    },
    'CallExpression|OptionalCallExpression'(p) {
      if (isReflectHand(p)) mark(p.node, 'd');
      /* v2.3.6523 (sitting 58): a dynamic import is followed where its value goes (a name, taken
         apart, `.then`); one whose path cannot be read, or whose namespace of a file that holds a
         hand goes anywhere else, is a reach 'g' (a form it cannot follow) */
      const d = dynSrc(p);
      if (!d) return;
      if (d === '?') { mark(p.node, 'g'); return; }
      if (!nsHolds(d)) return;
      let q = p;
      if (q.parentPath.isAwaitExpression()) q = q.parentPath;
      const par = q.parentPath;
      if (par.isVariableDeclarator() && q.key === 'init') return;
      if ((par.isMemberExpression() || par.isOptionalMemberExpression()) && q.key === 'object') {
        if (memberKey(par) === 'then') {
          /* followed when its handler takes the namespace by a name or takes it apart */
          const call = par.parentPath;
          const h = call.isCallExpression() && par.key === 'callee' ? call.get('arguments')[0] : null;
          const p0 = h && h.isFunction() ? h.node.params[0] : null;
          if (h && h.isFunction() && (!p0 || p0.type === 'Identifier' || p0.type === 'ObjectPattern')) return;
          mark(p.node, 'g');
          return;
        }
        const k2 = exportsOf.get(d)[memberKey(par)];
        if (k2 === 'hand') { mark(par.node, 'e'); return; }
        if (k2 === 'getter') { const u = getterUse(par); if (u) mark(par.node, u); return; }
        if (memberKey(par) !== null) return;
      }
      mark(p.node, 'g');
    },
    Identifier(p) {
      const n = p.node;
      if (!p.isReferencedIdentifier()) return;
      const b = p.scope.getBinding(n.name);
      if (!b) { if (HANDS.has(n.name)) mark(n, 'd'); return; }
      const k = kind.get(b);
      /* a name holding a hand counts where it is the file's own (module
         scope, an import): a name local to a function is counted where it
         was taken, so a panel's `const S = getState()` is one line, not
         every line that reads S; a getter counts at each call */
      if (k === 'hand' && b.scope.path.isProgram()) mark(n, 'e');
      else if (k === 'getter') { const u = getterUse(p); if (u) mark(n, u); }
      else if (!k && nsHolds(nsOfBinding(b)) && nsUse(p)) mark(n, 'g');
    },
    ExportNamedDeclaration(p) {
      const d = p.get('declaration');
      if (d.node) {
        for (const name of Object.keys(d.getBindingIdentifiers())) {
          const b = p.scope.getBinding(name);
          if (b && kind.has(b)) exp[name] = kind.get(b);
        }
      }
      /* v2.3.6523 (sitting 57's hold: a named re-export stayed green):
         `export { getState } from './common.js'` hands on what that file
         exported, under the name given */
      if (p.node.source) {
        const src = resolveImport(rel, p.node.source.value, has);
        const theirs = src && exportsOf.has(src) ? exportsOf.get(src) : null;
        if (!theirs) return;
        for (const s of p.node.specifiers) {
          const out = s.exported && (s.exported.name || s.exported.value);
          if (s.type === 'ExportSpecifier' && theirs[s.local.name || s.local.value]) exp[out] = theirs[s.local.name || s.local.value];
        }
        return;
      }
      for (const s of p.get('specifiers')) {
        if (!s.isExportSpecifier()) continue;
        const b = p.scope.getBinding(s.node.local.name);
        if (b && kind.has(b)) exp[s.node.exported.name || s.node.exported.value] = kind.get(b);
      }
    },
    /* v2.3.6523: `export * from './common.js'` hands on every name (the
       PR's first words listed it as not caught) */
    ExportAllDeclaration(p) {
      if (p.node.exported) return;   /* `export * as C from`: a namespace, not followed */
      const src = resolveImport(rel, p.node.source.value, has);
      if (!src || !exportsOf.has(src)) return;
      for (const [k2, v] of Object.entries(exportsOf.get(src))) if (k2 !== 'default' && !exp[k2]) exp[k2] = v;
    },
    ExportDefaultDeclaration(p) {
      const d = p.get('declaration');
      if (d.isIdentifier()) { const b = p.scope.getBinding(d.node.name); if (b && kind.has(b)) exp.default = kind.get(b); }
      else if (d.isFunction() && returnsHand(d)) exp.default = 'getter';
      else if (d.isExpression() && isWin(d)) exp.default = 'win';
      else if (d.isExpression() && isHand(d)) exp.default = 'hand';
    },
  });
  /* v2.3.6526 (sitting 59's hold: `debugBus.getState()` from a new file,
     an object holding the getter, stayed green): the exports that BEAR the
     hand -- one with a kind above, or whose declaration holds a reach (an
     object or class with a method that reaches, a function that does) --
     so an importer of one is held to a list (openHandCensus's edges) in
     whatever form it imports, not only the forms the kinds follow */
  const bearing = new Set(Object.keys(exp));
  /* a declaration that HANDS the hand out, read with the scopes: it is of a kind above, or its
     value (outside any function body) names a binding of a kind (`{ getState }`, `[S]`, `{ S:
     window._gameState }`) or reaches, or a function in it (a method, a getter) hands one back
     (returnsHand) -- not a function that only uses the hand inside (calling it hands nothing) */
  const declPaths = new Map();   /* node -> path, for the program's top-level declarations */
  babel.traverse(ast, {
    'VariableDeclarator|FunctionDeclaration|ClassDeclaration|ExportDefaultDeclaration'(p) {
      if (p.scope.path.isProgram() || p.parentPath.isProgram() || (p.parentPath && p.parentPath.parentPath && p.parentPath.parentPath.isProgram())) declPaths.set(p.node, p);
    },
  });
  const holds = (node) => {
    const p = node && declPaths.get(node);
    if (!p) return false;
    if (p.isFunctionDeclaration()) return returnsHand(p);
    let hit = false;
    const look = (q) => q.traverse({
      Function(f) { if (returnsHand(f)) hit = true; f.skip(); },
      Identifier(r) {
        if (!r.isReferencedIdentifier()) return;
        const b = r.scope.getBinding(r.node.name);
        if ((b && kind.has(b)) || reach.has(r.node.loc.start.line)) hit = true;
      },
      MemberExpression(r) { if (reach.has(r.node.loc.start.line) && !r.getFunctionParent()) hit = true; },
    });
    if (p.isExportDefaultDeclaration()) {
      const d = p.get('declaration');
      if (d.isFunction()) return returnsHand(d);
      if (d.isIdentifier()) { const b = p.scope.getBinding(d.node.name); return !!(b && kind.has(b)); }
      look(p);
      return hit;
    }
    if (p.isVariableDeclarator()) {
      const init = p.get('init');
      if (!init.node) return false;
      if (init.isFunction()) return returnsHand(init);
      const b0 = p.get('id').isIdentifier() ? p.scope.getBinding(p.node.id.name) : null;
      if (b0 && kind.has(b0)) return true;
      if (init.isIdentifier()) { const b = p.scope.getBinding(init.node.name); if (b && kind.has(b)) return true; }
      look(p);
      return hit;
    }
    look(p);   /* a class: its members */
    return hit;
  };
  for (const st of ast.program.body) {
    if (st.type === 'ExportNamedDeclaration' && st.declaration) {
      const d = st.declaration;
      const ids = (x, o = []) => {
        if (!x) return o;
        if (x.type === 'Identifier') o.push(x.name);
        else if (x.type === 'ObjectPattern') x.properties.forEach((q) => ids(q.type === 'RestElement' ? q.argument : q.value, o));
        else if (x.type === 'ArrayPattern') x.elements.forEach((e) => ids(e, o));
        else if (x.type === 'AssignmentPattern') ids(x.left, o);
        else if (x.type === 'RestElement') ids(x.argument, o);
        return o;
      };
      if (d.type === 'VariableDeclaration') { for (const v of d.declarations) if (holds(v)) for (const nm of ids(v.id)) bearing.add(nm); }
      else if (d.id && holds(d)) bearing.add(d.id.name);
    } else if (st.type === 'ExportNamedDeclaration' && !st.source) {
      for (const sp of st.specifiers) {
        if (sp.type !== 'ExportSpecifier') continue;
        const local = sp.local.name || sp.local.value;
        const decl = ast.program.body.find((x) => (x.type === 'FunctionDeclaration' || x.type === 'ClassDeclaration') && x.id && x.id.name === local)
          || ast.program.body.find((x) => x.type === 'VariableDeclaration' && x.declarations.some((v) => v.id.type === 'Identifier' && v.id.name === local));
        const dn = decl && decl.type === 'VariableDeclaration' ? decl.declarations.find((v) => v.id.type === 'Identifier' && v.id.name === local) : decl;
        if (holds(dn)) bearing.add(sp.exported.name || sp.exported.value);
      }
    } else if (st.type === 'ExportDefaultDeclaration') {
      const d = st.declaration;
      if (holds(st) || (d.type !== 'Identifier' && holds(d))) bearing.add('default');
      if (d.type === 'Identifier') {
        const decl = ast.program.body.find((x) => (x.type === 'FunctionDeclaration' || x.type === 'ClassDeclaration') && x.id && x.id.name === d.name)
          || ast.program.body.find((x) => x.type === 'VariableDeclaration' && x.declarations.some((v) => v.id.type === 'Identifier' && v.id.name === d.name));
        const dn = decl && decl.type === 'VariableDeclaration' ? decl.declarations.find((v) => v.id.type === 'Identifier' && v.id.name === d.name) : decl;
        if (holds(dn)) bearing.add('default');
      }
    }
  }
  return { reach, exp, bearing };
}

/* the census: Map rel -> Map(line -> how) of every file with a reach.
   `sources` is a Map rel -> text (the real files, or a fixture in memory). */
export function openHandCensus(babel, sources) {
  const has = (r) => sources.has(r);
  const asts = new Map();
  const parse = (rel) => {
    if (!asts.has(rel)) asts.set(rel, babel.parser.parse(sources.get(rel), { sourceType: 'module', plugins: ['jsx'], errorRecovery: true }));
    return asts.get(rel);
  };
  const todo = new Set();
  for (const rel of sources.keys()) if (couldReach(parse(rel))) todo.add(rel);
  const exportsOf = new Map();
  const bearingOf = new Map();
  const out = new Map();
  const look = (rel) => {
    const ast = babel.parser.parse(sources.get(rel), { sourceType: 'module', plugins: ['jsx'], errorRecovery: true });
    const { reach, exp, bearing } = analyse(babel, rel, ast, exportsOf, has);
    bearingOf.set(rel, bearing);
    if (reach.size) out.set(rel, reach); else out.delete(rel);
    const was = JSON.stringify(exportsOf.get(rel) || {});
    exportsOf.set(rel, exp);
    return was !== JSON.stringify(exp);
  };
  const importCache = new Map();
  const importsOf = (rel) => {
    if (importCache.has(rel)) return importCache.get(rel);
    const out2 = [];
    for (const st of parse(rel).program.body) {
      if (st.type !== 'ImportDeclaration' && !((st.type === 'ExportNamedDeclaration' || st.type === 'ExportAllDeclaration') && st.source)) continue;
      const src = resolveImport(rel, st.source.value, has);
      if (src) out2.push(src);
    }
    /* v2.3.6523 (sitting 58): a dynamic `import('./x.js')` with a written path, anywhere */
    if (sources.get(rel).includes('import(')) {
      walk(parse(rel).program, (n) => {
        if (n.type !== 'CallExpression' || n.callee.type !== 'Import') return;
        const a = n.arguments[0];
        const spec = a && (a.type === 'StringLiteral' ? a.value : (a.type === 'TemplateLiteral' && !a.expressions.length ? a.quasis[0].value.cooked : null));
        const src = spec && resolveImport(rel, spec, has);
        if (src) out2.push(src);
        else if (spec == null) out2.push('?');   /* v2.3.6526: a path it cannot read: read again every round */
      });
    }
    importCache.set(rel, out2);
    return out2;
  };
  /* v2.3.6526 (sitting 59's hold, a real ORDER bug): the walk to a fixed
     point re-read only a file whose WRITTEN import named a file that had
     changed, so `src/game/aaHand.js` with `import(DIR + 'common.js')`
     (sorted before common.js) was read once, before common.js's getter was
     known, and never again: `src/a/` green, `src/z/` red.  Now the graph is
     walked to a fixed point WHATEVER THE FILES' ORDER: every file that may
     reach (couldReach), imports a file with a hand export, or imports a
     path it cannot read is read again, round after round, until no file's
     exports change; then every such file is read once more against the
     final exports, so its reaches never depend on when it was first read.
     A walk that does not settle FAILS (it throws), never passes.
     open-hand.test check 5 shuffles the order and asks for the same count. */
  const withExports = () => new Set([...exportsOf].filter(([, e]) => Object.keys(e).length).map(([r]) => r));
  const candidate = (rel, held) => todo.has(rel) || importsOf(rel).some((x) => x === '?' || held.has(x));
  for (let round = 0, changed = true; changed; round++) {
    if (round > 64) throw new Error('openHand: the import graph did not settle in 64 rounds');
    changed = false;
    const held = withExports();
    for (const rel of sources.keys()) if (candidate(rel, held) && look(rel)) changed = true;
  }
  const held = withExports();
  for (const rel of sources.keys()) if (candidate(rel, held)) look(rel);
  /* v2.3.6526 (sitting 59): the getter's importers, an ALLOW list.  A file
     whose exports bear the hand (bearingOf) may be imported by another in
     ONE form only without a row: a static named import (or a named
     re-export) of names that bear nothing.  Every other edge into it -- a
     bearing name imported, the default when it bears, a namespace (`import
     * as`, `export * from`, `export * as`), any dynamic `import()` of it --
     and every dynamic import whose path cannot be read, anywhere, is an
     EDGE, held by open-hand.test to its list (by file; it only falls): a
     new importer of the hand in any form is red, a new file included. */
  const edges = new Map();
  const edge = (rel, to, line, how) => { if (!edges.has(rel)) edges.set(rel, []); edges.get(rel).push({ to, line, how }); };
  const bears = (t) => !!t && bearingOf.has(t) && bearingOf.get(t).size > 0;
  /* a re-export bears what it re-exports (to a fixed point: a file of re-exports hands on) */
  for (let again = true, n = 0; again && n < 64; n++) {
    again = false;
    for (const rel of sources.keys()) {
      for (const st of parse(rel).program.body) {
        if (!st.source || (st.type !== 'ExportNamedDeclaration' && st.type !== 'ExportAllDeclaration')) continue;
        const t = resolveImport(rel, st.source.value, has);
        if (!bears(t)) continue;
        if (!bearingOf.has(rel)) bearingOf.set(rel, new Set());
        const mine = bearingOf.get(rel), theirs = bearingOf.get(t);
        const give = (nm) => { if (!mine.has(nm)) { mine.add(nm); again = true; } };
        if (st.type === 'ExportAllDeclaration') { if (st.exported) give(st.exported.name || st.exported.value); else for (const nm of theirs) if (nm !== 'default') give(nm); }
        else for (const sp of st.specifiers) if (sp.type !== 'ExportSpecifier' || theirs.has(sp.local.name || sp.local.value)) give(sp.exported.name || sp.exported.value);
      }
    }
  }
  for (const rel of sources.keys()) {
    const ast = parse(rel);
    for (const st of ast.program.body) {
      const isImp = st.type === 'ImportDeclaration';
      const isRe = (st.type === 'ExportNamedDeclaration' || st.type === 'ExportAllDeclaration') && st.source;
      if (!isImp && !isRe) continue;
      const t = resolveImport(rel, st.source.value, has);
      if (!bears(t)) continue;
      const theirs = bearingOf.get(t);
      const line = st.loc.start.line;
      if (st.type === 'ExportAllDeclaration') { edge(rel, t, line, 'export * from'); continue; }
      for (const sp of st.specifiers || []) {
        if (sp.type === 'ImportNamespaceSpecifier' || sp.type === 'ExportNamespaceSpecifier') edge(rel, t, line, 'a namespace');
        else if (sp.type === 'ImportDefaultSpecifier' || sp.type === 'ExportDefaultSpecifier') { if (theirs.has('default')) edge(rel, t, line, 'the default'); }
        else {
          const nm = isImp ? (sp.imported.name || sp.imported.value) : (sp.local.name || sp.local.value);
          if (theirs.has(nm)) edge(rel, t, line, nm);
        }
      }
    }
    if (sources.get(rel).includes('import(')) {
      walk(ast.program, (n) => {
        if (n.type !== 'CallExpression' || n.callee.type !== 'Import') return;
        const a = n.arguments[0];
        const spec = a && (a.type === 'StringLiteral' ? a.value : (a.type === 'TemplateLiteral' && !a.expressions.length ? a.quasis[0].value.cooked : null));
        if (spec == null) { edge(rel, '?', n.loc.start.line, 'import() of a path it cannot read'); return; }
        const t = resolveImport(rel, spec, has);
        if (bears(t)) edge(rel, t, n.loc.start.line, 'import()');
      });
    }
  }
  out.edges = edges;
  out.bearing = bearingOf;
  return out;
}

export function realSources(root) {
  const m = new Map();
  for (const rel of srcFiles(root)) m.set(rel, readFileSync(join(root, rel), 'utf8'));
  return m;
}

/* the frozen list's file, written by open-hand.test.mjs --write (it lowers;
   it never adds a row or raises one) */
export const KNOWN_PATH = 'tools/guards/lib/openHandKnown.mjs';
export function renderKnown(rows, line, filesLine, importers = {}) {
  const keys = Object.keys(rows).sort();
  return `/* v2.3.6523: the open hand's census (card WL PR 4): each file under src/
 * that reaches window._gameState or window._gameFns, and how many code lines
 * do (lib/openHand.mjs says what a reach is).  A census (the plan's rule 3):
 * it only falls.  Written by \`node tools/guards/open-hand.test.mjs --write\`,
 * which lowers a row to what is found and takes a gone file off; it never
 * adds a row or raises one: a new reader is a FAIL, not a row.  Closing the
 * hand (grand plan step 5.7) takes these to nothing; the gatekeeper alone
 * makes the census strict.
 */
export const LINE = ${line};          /* code lines that reach the hand, every file */
export const FILES_LINE = ${filesLine};     /* files that do */
export const KNOWN = {
${keys.map((k) => `  '${k}': ${rows[k]},`).join('\n')}
};
/* v2.3.6526 (sitting 59): the getter's importers, by file: the edges into a
 * file whose exports bear the hand in any form but a named import of names
 * that bear nothing, and every import() of a path the guard cannot read
 * (lib/openHand.mjs, openHandCensus's edges).  It only falls, as KNOWN. */
export const IMPORTERS = {
${Object.keys(importers).sort().map((k) => `  '${k}': ${importers[k]},`).join('\n')}
};
`;
}
