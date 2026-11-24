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
 * from` are followed now (they were not).
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
  const nsKind = (objPath, key) => {
    if (!objPath || !objPath.isIdentifier()) return null;
    const b = objPath.scope.getBinding(objPath.node.name);
    if (!b || !b.path.isImportNamespaceSpecifier()) return null;
    const src = resolveImport(rel, b.path.parentPath.node.source.value, has);
    return src && exportsOf.has(src) && key ? (exportsOf.get(src)[key] || null) : null;
  };
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
      else if (nk === 'getter' && (p.parentPath.isCallExpression() || p.parentPath.isOptionalCallExpression()) && p.key === 'callee') mark(p.node, 'f');
    },
    ObjectProperty(p) {
      if (p.parentPath.isObjectPattern() && HANDS.has(patternKey(p)) && isPatternOfWin(p.parentPath)) mark(p.node, 'c');
    },
    BinaryExpression(p) {
      if (p.node.operator !== 'in' || !isWin(p.get('right'))) return;
      const e = p.get('left').evaluate();
      if (e.confident && HANDS.has(e.value)) mark(p.node, 'd');
    },
    'CallExpression|OptionalCallExpression'(p) { if (isReflectHand(p)) mark(p.node, 'd'); },
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
      else if (k === 'getter' && (p.parentPath.isCallExpression() || p.parentPath.isOptionalCallExpression()) && p.key === 'callee') mark(n, 'f');
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
  return { reach, exp };
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
  const out = new Map();
  const look = (rel) => {
    const ast = babel.parser.parse(sources.get(rel), { sourceType: 'module', plugins: ['jsx'], errorRecovery: true });
    const { reach, exp } = analyse(babel, rel, ast, exportsOf, has);
    if (reach.size) out.set(rel, reach); else out.delete(rel);
    const was = JSON.stringify(exportsOf.get(rel) || {});
    exportsOf.set(rel, exp);
    return was !== JSON.stringify(exp);
  };
  const importsOf = (rel) => {
    const out2 = [];
    for (const st of parse(rel).program.body) {
      if (st.type !== 'ImportDeclaration' && !((st.type === 'ExportNamedDeclaration' || st.type === 'ExportAllDeclaration') && st.source)) continue;
      const src = resolveImport(rel, st.source.value, has);
      if (src) out2.push(src);
    }
    return out2;
  };
  /* to a fixpoint across files: an import of an exported hand makes its
     importer a file to look at carefully (and its own exports may grow) */
  let changed = new Set();
  for (const rel of todo) if (look(rel)) changed.add(rel);
  for (let round = 0; changed.size && round < 8; round++) {
    const next = new Set();
    for (const rel of sources.keys()) {
      if (!importsOf(rel).some((s) => changed.has(s))) continue;
      todo.add(rel);
      if (look(rel)) next.add(rel);
    }
    changed = next;
  }
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
export function renderKnown(rows, line, filesLine) {
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
`;
}
