#!/usr/bin/env node
/* ═══ v2.3.5030: THE STATE, READ BY MACHINE (GRAND-PLAN step 5.3's census; card D) ═══
 *
 *   node tools/dev/state-census.mjs            print the page (docs/plan/census/state.md)
 *   node tools/dev/state-census.mjs --write    write the page
 *   node tools/dev/state-census.mjs --check    exit 1 if the page on disk is not what this prints
 *   node tools/dev/state-census.mjs --json     the rows as JSON (for card U's ledger files; v2.3.5201:
 *                                              with `ledger`, every row as --ledger makes it, which
 *                                              the ledger's guard holds the files to)
 *   node tools/dev/state-census.mjs --ledger [system] [--write]
 *                                              card U's ledger files (src/state/), made from these
 *                                              rows (v2.3.5160; its section is near the end)
 *   node tools/dev/state-census.mjs --dossier [folder]
 *                                              one line a row with its writers by function: what a
 *                                              reader needs to fill the hand-made column
 *
 * WHY.  The plan's part 2, item 4: "the state object S has about 610 field
 * names, most created on the fly, 146 written from two or more files; another
 * 850 variables at the top of files hold state too (a reviewer's counts)".
 * Nobody can give a field an owner and a lifetime (step 5.3) from a guess, so
 * this reads every file under src/ as a syntax tree and makes the table.  It
 * changes no game code and it is not a guard: card U turns the table into
 * ledger files a system, after card B's system map.
 *
 * WHAT IT FOLLOWS.  The page's first section says it in plain words; in short:
 *   - "the state" is `<ref>.current` where <ref> is anything named stateRef or
 *     _gameState; a call of a function that returns it (getState()); a name
 *     given that value; a parameter named S; and a parameter that some call
 *     hands the state to (followed across files through imports);
 *   - a field's row collects `S.<name>` reads and writes, and writes INSIDE it
 *     (`S.a.b = 1`, `S.a.push(x)`), the last also through a name for the
 *     inside (`var p = S.player; p.x = 1`, a loop's or a callback's element,
 *     a parameter a call hands it to);
 *   - a top-of-file variable is a `let`/`var`, or a `const` holding a Map,
 *     Set, array or object that the code changes after making it.
 *
 * WHAT IT CANNOT SEE is printed too ("What the machine cannot follow"): the
 * state handed whole to a call it cannot resolve, `S[key]` with a key made at
 * run time, and anything outside src/ (the QA probes read window._gameState).
 *
 * THE ONE HAND-MADE COLUMN is "should reset", marked "suggested, not
 * confirmed" on the page.  It lives in SUGGESTED, below the rows, in this file
 * (the card gives this session two files, and the page is this script's
 * output, so the judgement has to live here to be printed again).  A row with
 * no entry prints "?" and is counted.
 *
 * Needs `npm install` (it uses @babel/parser and @babel/traverse, which the
 * vite React plugin already brings; v2.3.5201: server/ carries the same two
 * as devDependencies, at the root's exact versions, so it runs where only
 * server/'s packages are installed, GitHub's `test` job).  Deterministic:
 * files and rows are sorted, nothing reads a clock.
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative, resolve as pathResolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = pathResolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = join(ROOT, 'src');
const PAGE = join(ROOT, 'docs', 'plan', 'census', 'state.md');
/* v2.3.5201 (card L PR 1): THE LOADER tries the root's packages, then
   server/'s, as tools/guards/lib/fourLines.mjs does for esbuild.  GitHub's
   `test` job installs only server/'s, and server/ now carries the root's
   exact @babel/parser and @babel/traverse as devDependencies, so the guards
   read the code there and not this script's page (the gatekeeper's finding,
   sitting 6: between rewrites of the page the ledger guard was blind).  Both
   packages from ONE place, never one of each.  Neither loads: exit 3, the
   one code a guard takes as "cannot run here" and reads the page instead; a
   parse error and every other failure stay 1 or 2 (a red, never a fallback). */
let parser, traverse;
for (const pkg of ['package.json', 'server/package.json']) {
  try {
    const require = createRequire(join(ROOT, pkg));
    const p = require('@babel/parser');
    const t = require('@babel/traverse');
    parser = p;
    traverse = t.default || t;
    break;
  } catch { /* the next */ }
}
if (!parser || !traverse) {
  console.error('state-census: @babel/parser and @babel/traverse are not installed. Run `npm install` at the repository root (or in server/) first.');
  process.exit(3);
}

const ARGS = new Set(process.argv.slice(2));

/* ─── the names the state goes by ─── */
/* anything reached as `<x>.stateRef`, `window._gameState`, or a parameter or
   destructured name spelt so, is the ref whose `.current` is the state */
const REF_NAMES = new Set(['stateRef', '_gameState']);
/* a parameter spelt so is the state (the card's rule); `props.S` too */
const STATE_PARAM = 'S';

/* calls that change the thing they are called on */
const MUTATORS = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill', 'copyWithin',
  'set', 'add', 'delete', 'clear']);
/* calls that hand back one of the things inside (or run a function on each) */
const ELEMENT_OUT = new Set(['find', 'findLast', 'at', 'get', 'pop', 'shift']);
const EACH_FIRST = new Set(['forEach', 'map', 'filter', 'find', 'findIndex', 'findLast', 'findLastIndex', 'some', 'every', 'flatMap']);
/* calls that make a NEW container of the same things: changing the container
   is not a write, changing one of its things is */
const COPY_OUT = new Set(['filter', 'slice', 'concat', 'values', 'toSorted', 'toReversed']);

/* ─── files ─── */
function walk(dir, out) {
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(js|jsx|mjs)$/.test(name)) out.push(p);
  }
  return out;
}
const rel = (p) => relative(ROOT, p).split(sep).join('/');
const short = (r) => r.replace(/^src\//, '');

const FILES = new Map();   /* rel path -> file record */
const fileList = walk(SRC, []);
for (const abs of fileList) {
  const code = readFileSync(abs, 'utf8');
  let ast;
  try {
    ast = parser.parse(code, { sourceType: 'module', plugins: ['jsx'], errorRecovery: false });
  } catch (e) {
    console.error('state-census: cannot parse ' + rel(abs) + ': ' + e.message);
    process.exit(2);
  }
  FILES.set(rel(abs), {
    path: rel(abs), abs, ast, program: null,
    imports: new Map(),      /* local name -> { from: rel path|null, name } ('*' for a namespace) */
    exports: new Map(),      /* exported name -> { local } | { from, name } | { fn: path } */
    stars: [],               /* export * from */
    decls: [], assigns: [], updates: [], deletes: [], calls: [], members: [], funcs: [], forOfs: [], forIns: [], jsx: [],
  });
}

function resolveImport(fromRel, spec) {
  let base;
  if (spec.startsWith('@/')) base = join(SRC, spec.slice(2));
  else if (spec.startsWith('.')) base = join(ROOT, dirname(fromRel), spec);
  else return null;
  for (const cand of [base, base + '.js', base + '.jsx', base + '.mjs', join(base, 'index.js'), join(base, 'index.jsx')]) {
    const r = rel(cand);
    if (FILES.has(r)) return r;
  }
  return null;
}

/* ─── pass 1: one walk a file, keeping the places the later passes read ─── */
const RETURNS = new WeakMap();   /* function node -> [argument paths] */
for (const f of FILES.values()) {
  traverse(f.ast, {
    Program(path) { f.program = path; },
    ImportDeclaration(path) {
      const from = resolveImport(f.path, path.node.source.value);
      for (const s of path.node.specifiers) {
        if (s.type === 'ImportSpecifier') f.imports.set(s.local.name, { from, name: s.imported.name || s.imported.value });
        else if (s.type === 'ImportDefaultSpecifier') f.imports.set(s.local.name, { from, name: 'default' });
        else f.imports.set(s.local.name, { from, name: '*' });
      }
    },
    ExportNamedDeclaration(path) {
      const n = path.node;
      if (n.source) {
        const from = resolveImport(f.path, n.source.value);
        for (const s of n.specifiers) f.exports.set(s.exported.name || s.exported.value, { from, name: s.local ? s.local.name : '*' });
      } else if (n.declaration) {
        const d = n.declaration;
        if (d.type === 'VariableDeclaration') {
          for (const dec of d.declarations) for (const name of patternNames(dec.id)) f.exports.set(name, { local: name });
        } else if (d.id) f.exports.set(d.id.name, { local: d.id.name });
      } else {
        for (const s of n.specifiers) f.exports.set(s.exported.name || s.exported.value, { local: s.local.name });
      }
    },
    ExportDefaultDeclaration(path) {
      const d = path.node.declaration;
      if (d.type === 'Identifier') f.exports.set('default', { local: d.name });
      else if ((d.type === 'FunctionDeclaration' || d.type === 'ClassDeclaration') && d.id) f.exports.set('default', { local: d.id.name });
      else f.exports.set('default', { fn: path.get('declaration') });
    },
    ExportAllDeclaration(path) {
      const from = resolveImport(f.path, path.node.source.value);
      if (from) f.stars.push(from);
    },
    VariableDeclarator(path) { f.decls.push(path); },
    AssignmentExpression(path) { f.assigns.push(path); },
    UpdateExpression(path) { f.updates.push(path); },
    UnaryExpression(path) { if (path.node.operator === 'delete') f.deletes.push(path); },
    'CallExpression|OptionalCallExpression|NewExpression'(path) { f.calls.push(path); },
    'MemberExpression|OptionalMemberExpression'(path) { f.members.push(path); },
    Function(path) {
      f.funcs.push(path);
      if (!RETURNS.has(path.node)) RETURNS.set(path.node, []);
      if (path.isArrowFunctionExpression() && path.node.body.type !== 'BlockStatement') RETURNS.get(path.node).push(path.get('body'));
    },
    ReturnStatement(path) {
      if (!path.node.argument) return;
      const fn = path.getFunctionParent();
      if (!fn) return;
      if (!RETURNS.has(fn.node)) RETURNS.set(fn.node, []);
      RETURNS.get(fn.node).push(path.get('argument'));
    },
    ForOfStatement(path) { f.forOfs.push(path); },
    ForInStatement(path) { f.forIns.push(path); },
    JSXOpeningElement(path) { if (path.node.name.type === 'JSXIdentifier' && /^[A-Z]/.test(path.node.name.name)) f.jsx.push(path); },
  });
}

function patternNames(id, out = []) {
  if (!id) return out;
  if (id.type === 'Identifier') out.push(id.name);
  else if (id.type === 'ObjectPattern') for (const p of id.properties) patternNames(p.type === 'RestElement' ? p.argument : p.value, out);
  else if (id.type === 'ArrayPattern') for (const e of id.elements) patternNames(e, out);
  else if (id.type === 'AssignmentPattern') patternNames(id.left, out);
  else if (id.type === 'RestElement') patternNames(id.argument, out);
  return out;
}

function staticKey(n) {
  const p = n.property;
  if (!n.computed) return p.type === 'Identifier' ? p.name : null;
  if (p.type === 'StringLiteral') return p.value;
  if (p.type === 'TemplateLiteral' && p.expressions.length === 0) return p.quasis[0].value.cooked;
  return null;
}
const isMember = (n) => n && (n.type === 'MemberExpression' || n.type === 'OptionalMemberExpression');
const isCall = (n) => n && (n.type === 'CallExpression' || n.type === 'OptionalCallExpression');
const isFn = (n) => n && (n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression' || n.type === 'FunctionDeclaration'
  || n.type === 'ObjectMethod' || n.type === 'ClassMethod' || n.type === 'ClassPrivateMethod');

/* ─── which function does this expression name? (across files) ─── */
function exportTarget(fileRel, name, seen = new Set()) {
  const key = fileRel + '\n' + name;
  if (seen.has(key)) return null;
  seen.add(key);
  const f = FILES.get(fileRel);
  if (!f) return null;
  const e = f.exports.get(name);
  if (e) {
    if (e.fn) return { file: f, fn: e.fn };
    if (e.local) {
      const imp = f.imports.get(e.local);
      if (imp && imp.from) return exportTarget(imp.from, imp.name, seen);
      return { file: f, local: e.local };
    }
    if (e.from) return exportTarget(e.from, e.name, seen);
  }
  for (const s of f.stars) {
    const r = exportTarget(s, name, seen);
    if (r) return r;
  }
  return null;
}

function fnsOfBinding(b, depth) {
  if (!b) return [];
  const out = [];
  const p = b.path;
  if (p.isFunctionDeclaration()) out.push(p);
  else if (p.isVariableDeclarator()) {
    const init = p.get('init');
    if (init.node) out.push(...fnsOfExpr(init, depth + 1));
  }
  for (const v of b.constantViolations) {
    if (v.isAssignmentExpression() && v.node.left.type === 'Identifier') out.push(...fnsOfExpr(v.get('right'), depth + 1));
  }
  return out;
}

function fnsOfExpr(path, depth = 0) {
  const n = path.node;
  if (!n || depth > 4) return [];
  if (n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression') return [path];
  if (isCall(n) && n.arguments.length && /^(memo|forwardRef|useCallback)$/.test(n.callee.type === 'Identifier' ? n.callee.name : (isMember(n.callee) && staticKey(n.callee)) || '')) {
    return fnsOfExpr(path.get('arguments')[0], depth + 1);   /* React.memo(function Panel(props) {...}) */
  }
  if (n.type === 'Identifier') {
    const b = path.scope.getBinding(n.name);
    if (!b) return [];
    if (b.kind === 'module') {
      const f = fileOf(path);
      const imp = f && f.imports.get(n.name);
      if (!imp || !imp.from || imp.name === '*') return [];
      const t = exportTarget(imp.from, imp.name);
      if (!t) return [];
      if (t.fn) return fnsOfExpr(t.fn, depth + 1);
      return fnsOfBinding(t.file.program.scope.getBinding(t.local), depth);
    }
    return fnsOfBinding(b, depth);
  }
  if (isMember(n)) {
    const key = staticKey(n);
    if (key === null) return [];
    const obj = path.get('object');
    if (obj.isThisExpression()) {
      /* a method of the class or object literal this code sits in */
      const holder = path.findParent((p) => p.isClassBody() || p.isObjectExpression());
      if (!holder) return [];
      const items = holder.isClassBody() ? holder.get('body') : holder.get('properties');
      return items.filter((m) => m.node.key && !m.node.computed && (m.node.key.name === key || m.node.key.value === key))
        .flatMap((m) => (isFn(m.node) ? [m] : (m.node.value ? fnsOfExpr(m.get('value'), depth + 1) : [])));
    }
    if (obj.isIdentifier()) {
      const b = path.scope.getBinding(obj.node.name);
      if (!b) return [];
      if (b.kind === 'module') {
        const f = fileOf(path);
        const imp = f && f.imports.get(obj.node.name);
        if (!imp || !imp.from) return [];
        if (imp.name === '*') {
          const t = exportTarget(imp.from, key);
          if (!t) return [];
          if (t.fn) return fnsOfExpr(t.fn, depth + 1);
          return fnsOfBinding(t.file.program.scope.getBinding(t.local), depth);
        }
        /* an imported object literal of functions */
        const t = exportTarget(imp.from, imp.name);
        if (t && t.local) return propFns(t.file.program.scope.getBinding(t.local), key, depth);
        return [];
      }
      return propFns(b, key, depth);
    }
  }
  return [];
}
function propFns(b, key, depth) {
  if (!b || !b.path.isVariableDeclarator()) return [];
  const init = b.path.get('init');
  if (!init.isObjectExpression()) return [];
  return init.get('properties').filter((m) => m.node.key && !m.node.computed && (m.node.key.name === key || m.node.key.value === key))
    .flatMap((m) => (isFn(m.node) ? [m] : (m.node.value ? fnsOfExpr(m.get('value'), depth + 1) : [])));
}
const FILE_OF = new WeakMap();
for (const f of FILES.values()) FILE_OF.set(f.program.node, f);
function fileOf(path) {
  const prog = path.scope.getProgramParent().path;
  return FILE_OF.get(prog.node);
}

/* ─── what an expression holds: a set of tags ───
   'REF'      the ref whose .current is the state
   'S'        the state object
   'G'        a function that hands back the state (`getS`, passed as a prop or kept in a variable)
   'P:<name>' something at or inside the field <name>
   'C:<name>' a fresh container of things from inside <name> */
const EMPTY = new Set();
const REF_ONLY = new Set(['REF']);
const GETTER_ONLY = new Set(['G']);
const FNS_OF_ID = new WeakMap();
const inside = (t) => t[1] === ':';   /* a 'P:' or 'C:' tag */
let TAGS = new WeakMap();        /* Binding -> Set */
let RET = new WeakMap();         /* function node -> Set */
let PROPS = new WeakMap();       /* a component's `props` Binding -> Map(prop name -> Set) */
let TAGGED_S = [];               /* bindings that hold the state, with their file */
let grew = false;
/* a parameter spelt S that every call the script can follow hands something
   else (lookArmour.js: `ask(ml, S, ...)`, where S is a sheet's record) */
const REFUTED = new Set();       /* the parameter's identifier node */
let NAMED = new Map();           /* that node -> { calls, withState } */
function tagBinding(b, tags, f) {
  if (!b || !tags.size) return;
  let s = TAGS.get(b);
  if (!s) { s = new Set(); TAGS.set(b, s); }
  for (const t of tags) {
    if (s.has(t)) continue;
    s.add(t); grew = true;
    if (t === 'S' && f) TAGGED_S.push({ b, f });
  }
}
const CALLEE_FNS = new WeakMap();   /* call node -> [function paths] */
function calleeFns(callPath) {
  let r = CALLEE_FNS.get(callPath.node);
  if (!r) { r = fnsOfExpr(callPath.get('callee')); CALLEE_FNS.set(callPath.node, r); }
  return r;
}
const isObjectDot = (n, names) => isMember(n) && n.object.type === 'Identifier' && n.object.name === 'Object'
  && !n.computed && names.includes(n.property.name);

function denote(path) {
  const n = path.node;
  if (!n) return EMPTY;
  switch (n.type) {
    case 'Identifier': {
      /* a variable spelt stateRef is the ref wherever it is made
         (BroTown.jsx: `var stateRef = useRef({...})`) */
      if (REF_NAMES.has(n.name)) return REF_ONLY;
      const b = path.scope.getBinding(n.name);
      if (!b) return EMPTY;
      const tags = TAGS.get(b) || EMPTY;
      /* the name of a function that returns the state is a getter */
      if (!tags.has('G') && (b.kind === 'hoisted' || b.kind === 'module' || (b.path.isVariableDeclarator() && isFn(b.path.node.init)))) {
        let fns = FNS_OF_ID.get(n);
        if (!fns) { fns = fnsOfExpr(path); FNS_OF_ID.set(n, fns); }
        for (const fn of fns) {
          const r = RET.get(fn.node);
          if (r && r.has('S')) return tags.size ? new Set([...tags, 'G']) : GETTER_ONLY;
        }
      }
      return tags;
    }
    case 'FunctionExpression':
    case 'ArrowFunctionExpression': {
      const r = RET.get(n);
      return r && r.has('S') ? GETTER_ONLY : EMPTY;
    }
    case 'MemberExpression':
    case 'OptionalMemberExpression': {
      const key = staticKey(n);
      if (key !== null && REF_NAMES.has(key)) return REF_ONLY;
      const obj = path.get('object');
      if (key === STATE_PARAM && obj.isIdentifier({ name: 'props' })) return new Set(['S']);
      let out = null;
      if (key !== null && obj.node.type === 'Identifier') {
        /* props.<name>, where some <Component name={...}> hands it the state or an inside */
        const b = path.scope.getBinding(obj.node.name);
        const pm = b && PROPS.get(b);
        const pt = pm && pm.get(key);
        if (pt) out = new Set(pt);
      }
      const ot = denote(obj);
      if (!ot.size) return out || EMPTY;
      if (!out) out = new Set();
      for (const t of ot) {
        if (t === 'REF') { if (key === 'current') out.add('S'); }
        else if (t === 'S') { if (key !== null) out.add('P:' + key); }
        else if (inside(t)) out.add('P' + t.slice(1));
      }
      return out;
    }
    case 'CallExpression':
    case 'OptionalCallExpression': {
      const out = new Set();
      const c = n.callee;
      if (denote(path.get('callee')).has('G')) out.add('S');
      if (isMember(c)) {
        const m = staticKey(c);
        if (isObjectDot(c, ['values']) || (c.object.type === 'Identifier' && c.object.name === 'Array' && m === 'from')) {
          const a = path.get('arguments')[0];
          if (a) for (const t of denote(a)) if (inside(t)) out.add('C' + t.slice(1));
        } else if (isObjectDot(c, ['assign'])) {
          const a = path.get('arguments')[0];
          if (a) for (const t of denote(a)) if (t !== 'G') out.add(t);
        } else if (m !== null && (ELEMENT_OUT.has(m) || COPY_OUT.has(m))) {
          for (const t of denote(path.get('callee').get('object'))) {
            if (!inside(t)) continue;
            if (ELEMENT_OUT.has(m)) out.add('P' + t.slice(1));
            if (COPY_OUT.has(m)) out.add('C' + t.slice(1));
          }
        }
      }
      for (const fn of calleeFns(path)) {
        const r = RET.get(fn.node);
        if (r) for (const t of r) out.add(t);
      }
      return out;
    }
    case 'LogicalExpression': {
      const r = denote(path.get('right'));
      if (n.operator === '&&') return r;
      const l = denote(path.get('left'));
      if (!l.size) return r;
      if (!r.size) return l;
      return new Set([...l, ...r]);
    }
    case 'ConditionalExpression': {
      const a = denote(path.get('consequent')), b = denote(path.get('alternate'));
      if (!a.size) return b;
      if (!b.size) return a;
      return new Set([...a, ...b]);
    }
    case 'AssignmentExpression':
      return n.operator === '=' || n.operator === '||=' || n.operator === '??=' || n.operator === '&&=' ? denote(path.get('right')) : EMPTY;
    case 'SequenceExpression': {
      const e = path.get('expressions');
      return denote(e[e.length - 1]);
    }
    case 'AwaitExpression':
      return denote(path.get('argument'));
    case 'ArrayExpression': {
      /* [...S.list] is a fresh container of the same things */
      const out = new Set();
      for (const e of path.get('elements')) {
        if (e.node && e.node.type === 'SpreadElement') for (const t of denote(e.get('argument'))) if (inside(t)) out.add('C' + t.slice(1));
      }
      return out;
    }
    default:
      return EMPTY;
  }
}

/* give a pattern's names what the value holds */
function bindPattern(idPath, tags, f) {
  const n = idPath.node;
  if (!n) return;
  if (n.type === 'Identifier') {
    tagBinding(idPath.scope.getBinding(n.name), tags, f);
  } else if (n.type === 'AssignmentPattern') {
    bindPattern(idPath.get('left'), tags, f);
  } else if (n.type === 'ObjectPattern') {
    for (const p of idPath.get('properties')) {
      if (p.node.type === 'RestElement') continue;
      const key = !p.node.computed && (p.node.key.name || p.node.key.value);
      const inner = new Set();
      if (key && REF_NAMES.has(key)) inner.add('REF');
      for (const t of tags) {
        if (t === 'S') { if (key) inner.add('P:' + key); }
        else if (t === 'REF') { if (key === 'current') inner.add('S'); }
        else if (inside(t)) inner.add('P' + t.slice(1));
      }
      bindPattern(p.get('value'), inner, f);
    }
  } else if (n.type === 'ArrayPattern') {
    const inner = new Set();
    for (const t of tags) if (inside(t)) inner.add('P' + t.slice(1));
    for (const e of idPath.get('elements')) if (e.node) bindPattern(e.node.type === 'RestElement' ? e.get('argument') : e, inner, f);
  }
}
const elementTags = (tags) => {
  const out = new Set();
  for (const t of tags) if (inside(t)) out.add('P' + t.slice(1));
  return out;
};

/* is this argument plainly something other than the state?  true only when
   it is known: a literal, a member of some other object, an inside of the
   state, or a local made only from those.  A call's result, a parameter and
   anything else are "not known" (the state often arrives through a getter) */
function plainlyOther(path, depth = 0) {
  const n = path.node;
  if (!n || depth > 3) return false;
  const tags = denote(path);
  if (tags.size) return !tags.has('S') && !tags.has('REF') && !tags.has('G');
  switch (n.type) {
    case 'NumericLiteral': case 'StringLiteral': case 'BooleanLiteral': case 'TemplateLiteral':
    case 'ObjectExpression': case 'ArrayExpression': case 'BinaryExpression': case 'NewExpression':
    case 'FunctionExpression': case 'ArrowFunctionExpression':
      return true;
    case 'MemberExpression': case 'OptionalMemberExpression': {
      const k = staticKey(n);
      return !(k !== null && /^(S|_S|state|_state|gameState|current)$/.test(k));
    }
    case 'AssignmentExpression':
      return plainlyOther(path.get('right'), depth + 1);
    case 'Identifier': {
      const b = path.scope.getBinding(n.name);
      if (!b || !b.path.isVariableDeclarator() || b.path.node.id.type !== 'Identifier') return false;
      const srcs = [];
      const init = b.path.get('init');
      if (init.node) srcs.push(init);
      for (const v of b.constantViolations) {
        if (v.isAssignmentExpression() && v.node.left.type === 'Identifier' && v.node.operator === '=') srcs.push(v.get('right'));
        else if (v.node !== b.path.node && v.node !== b.path.parent) return false;
      }
      const real = srcs.filter((x) => x.node.type !== 'NullLiteral');
      return real.length > 0 && real.every((x) => plainlyOther(x, depth + 1));
    }
    default:
      return false;
  }
}

/* the name rules: a parameter spelt S (plain, or destructured from a
   component's props) is the state; one spelt stateRef is the ref */
function namedStateParam(p) {
  /* the identifier nodes of a function's parameters that the name rule reads as the state */
  const out = [];
  const base = p.isAssignmentPattern() ? p.get('left') : p;
  if (base.isIdentifier({ name: STATE_PARAM })) out.push(base);
  else if (base.isObjectPattern()) {
    for (const pr of base.get('properties')) {
      if (pr.node.type === 'RestElement' || pr.node.computed) continue;
      if ((pr.node.key.name || pr.node.key.value) !== STATE_PARAM) continue;
      const v = pr.get('value');
      const id = v.isAssignmentPattern() ? v.get('left') : v;
      if (id.isIdentifier()) out.push(id);
    }
  }
  return out;
}
function noteNamed(idPath, tags, argPath) {
  let e = NAMED.get(idPath.node);
  if (!e) { e = { withState: 0, other: 0 }; NAMED.set(idPath.node, e); }
  if (tags && tags.has('S')) e.withState++;
  else if (argPath && plainlyOther(argPath)) e.other++;
}

/* the fixed point: values flow into names, parameters, props and returns
   until nothing new is learnt */
let rounds = 0;
function solve() {
  TAGS = new WeakMap(); RET = new WeakMap(); PROPS = new WeakMap(); TAGGED_S = []; NAMED = new Map();
  const STATE_ONLY = new Set(['S']);
  for (const f of FILES.values()) {
    for (const fn of f.funcs) {
      for (const p of fn.get('params')) {
        const base = p.isAssignmentPattern() ? p.get('left') : p;
        if (base.isIdentifier() && REF_NAMES.has(base.node.name)) tagBinding(base.scope.getBinding(base.node.name), REF_ONLY, f);
        else if (base.isObjectPattern()) bindPattern(base, EMPTY, f);
        for (const id of namedStateParam(p)) if (!REFUTED.has(id.node)) tagBinding(id.scope.getBinding(id.node.name), STATE_ONLY, f);
      }
    }
  }
  let n = 0;
  do {
    grew = false;
    n++;
    NAMED = new Map();
    for (const f of FILES.values()) {
      for (const d of f.decls) {
        const init = d.get('init');
        const tags = init.node ? denote(init) : EMPTY;
        if (tags.size || d.node.id.type !== 'Identifier') bindPattern(d.get('id'), tags, f);
      }
      for (const a of f.assigns) {
        const left = a.node.left;
        if (left.type === 'Identifier') {
          const tags = denote(a.get('right'));
          if (tags.size) tagBinding(a.scope.getBinding(left.name), tags, f);
        } else if (left.type === 'ObjectPattern' || left.type === 'ArrayPattern') {
          const tags = denote(a.get('right'));
          if (tags.size) bindPattern(a.get('left'), tags, f);
        }
      }
      for (const fo of f.forOfs) {
        const right = fo.get('right');
        let tags = denote(right);
        /* Object.entries(x) and x.entries(): the pair's second is the thing */
        let pair = false;
        const rn = right.node;
        if (isCall(rn) && isMember(rn.callee)) {
          const m = staticKey(rn.callee);
          if (isObjectDot(rn.callee, ['entries'])) { tags = denote(right.get('arguments')[0]); pair = true; }
          else if (m === 'entries') { tags = denote(right.get('callee').get('object')); pair = true; }
        }
        const el = elementTags(tags);
        if (!el.size) continue;
        const left = fo.get('left');
        const id = left.isVariableDeclaration() ? left.get('declarations')[0].get('id') : left;
        if (id.isArrayPattern()) {
          const els = id.get('elements');
          if (pair) { if (els[1] && els[1].node) bindPattern(els[1], el, f); }
          else for (const e of els) if (e.node) bindPattern(e, el, f);
        } else bindPattern(id, el, f);
      }
      for (const c of f.calls) {
        const args = c.get('arguments');
        const cn = c.node.callee;
        /* a function run on each thing inside: its first parameter is one */
        if (isMember(cn)) {
          const m = staticKey(cn);
          if (m !== null && (EACH_FIRST.has(m) || m === 'reduce' || m === 'sort') && args.length) {
            const recv = elementTags(denote(c.get('callee').get('object')));
            if (recv.size) {
              for (const fn of fnsOfExpr(args[0])) {
                const ps = fn.get('params');
                const idx = m === 'reduce' ? [1] : m === 'sort' ? [0, 1] : [0];
                for (const i of idx) if (ps[i]) bindPattern(ps[i], recv, fileOf(fn));
              }
            }
          }
        }
        const fns = calleeFns(c);
        if (!fns.length) continue;
        const argTags = [];
        let spreadAt = args.length;
        for (let i = 0; i < args.length; i++) {
          if (args[i].node.type === 'SpreadElement') { spreadAt = i; break; }
          argTags[i] = denote(args[i]);
        }
        for (const fn of fns) {
          const ps = fn.get('params');
          const ff = fileOf(fn);
          for (let i = 0; i < ps.length; i++) {
            if (ps[i].node.type === 'RestElement') break;
            const t = i < spreadAt ? (argTags[i] || EMPTY) : null;   /* null: behind a spread, not known */
            if (t === null) continue;
            const base = ps[i].isAssignmentPattern() ? ps[i].get('left') : ps[i];
            if (base.isIdentifier({ name: STATE_PARAM })) noteNamed(base, t, args[i]);
            if (t.size) bindPattern(ps[i], t, ff);
          }
        }
      }
      /* <Panel S={S} rpg={S.rpg} {...{ S, R }} />: the component's props */
      for (const el of f.jsx) {
        const b = el.scope.getBinding(el.node.name.name);
        if (!b) continue;
        let fns;
        if (b.kind === 'module') {
          const imp = f.imports.get(el.node.name.name);
          const t = imp && imp.from && imp.name !== '*' ? exportTarget(imp.from, imp.name) : null;
          fns = !t ? [] : (t.fn ? fnsOfExpr(t.fn, 1) : fnsOfBinding(t.file.program.scope.getBinding(t.local), 0));
        } else fns = fnsOfBinding(b, 0);
        if (!fns.length) continue;
        const given = new Map();   /* prop name -> tags */
        const givenAt = new Map(); /* prop name -> the expression */
        for (const at of el.get('attributes')) {
          if (at.isJSXAttribute()) {
            const v = at.get('value');
            const k = String(at.node.name.name);
            given.set(k, v.isJSXExpressionContainer() ? denote(v.get('expression')) : EMPTY);
            if (v.isJSXExpressionContainer()) givenAt.set(k, v.get('expression'));
          } else if (at.isJSXSpreadAttribute()) {
            const arg = at.get('argument');
            if (!arg.isObjectExpression()) continue;
            for (const pr of arg.get('properties')) {
              if (!pr.isObjectProperty() || pr.node.computed) continue;
              const k = String(pr.node.key.name || pr.node.key.value);
              given.set(k, denote(pr.get('value')));
              givenAt.set(k, pr.get('value'));
            }
          }
        }
        for (const fn of fns) {
          const p0 = fn.get('params')[0];
          if (!p0) continue;
          const ff = fileOf(fn);
          if (p0.isObjectPattern()) {
            for (const pr of p0.get('properties')) {
              if (pr.node.type === 'RestElement' || pr.node.computed) continue;
              const k = String(pr.node.key.name || pr.node.key.value);
              const t = given.get(k);
              const v = pr.get('value');
              const id = v.isAssignmentPattern() ? v.get('left') : v;
              if (k === STATE_PARAM && id.isIdentifier() && t) noteNamed(id, t, givenAt.get(k));
              if (t && t.size) bindPattern(v, t, ff);
            }
          } else if (p0.isIdentifier()) {
            const pb = p0.scope.getBinding(p0.node.name);
            if (!pb) continue;
            let pm = PROPS.get(pb);
            for (const [k, t] of given) {
              if (!t.size || REF_NAMES.has(k)) continue;
              if (!pm) { pm = new Map(); PROPS.set(pb, pm); }
              let cur = pm.get(k);
              if (!cur) { cur = new Set(); pm.set(k, cur); }
              for (const x of t) if (!cur.has(x)) { cur.add(x); grew = true; }
            }
          }
        }
      }
      for (const fn of f.funcs) {
        const rets = RETURNS.get(fn.node);
        if (!rets || !rets.length) continue;
        let s = RET.get(fn.node);
        for (const r of rets) {
          for (const t of denote(r)) {
            if (!s) { s = new Set(); RET.set(fn.node, s); }
            if (!s.has(t)) { s.add(t); grew = true; }
          }
        }
      }
    }
  } while (grew && n < 60);
  rounds += n;
  if (grew) { console.error('state-census: the flow did not settle in 60 rounds'); process.exit(2); }
}
/* solve; drop the name rule from a parameter spelt S that no followed call
   hands the state; solve again until no parameter is dropped */
let solves = 0;
for (;;) {
  solve();
  solves++;
  let dropped = 0;
  for (const [node, e] of NAMED) {
    if (e.other > 0 && e.withState === 0 && !REFUTED.has(node)) { REFUTED.add(node); dropped++; }
  }
  if (!dropped) break;
  if (solves > 12) { console.error('state-census: the name rule did not settle'); process.exit(2); }
}

/* where the dropped parameters are, for the page */
const REFUTED_AT = [];
for (const f of FILES.values()) {
  for (const fn of f.funcs) {
    for (const p of fn.get('params')) for (const id of namedStateParam(p)) if (REFUTED.has(id.node)) REFUTED_AT.push(short(f.path) + ':' + id.node.loc.start.line);
  }
}
REFUTED_AT.sort();

/* ─── pass 2: every touch of a field ─── */
const FIELDS = new Map();   /* name -> record */
function field(name) {
  let r = FIELDS.get(name);
  if (!r) {
    r = { name, born: null, sets: [], ins: [], vias: [], reads: [], selfReads: [], strings: new Set(), values: new Map() };
    FIELDS.set(name, r);
  }
  return r;
}
/* `.length` on "the state" is the debug inspector walking any object
   (debug/DebugOverlay.jsx render(v)), never a field */
const NOT_FIELDS = new Set(['length']);
const DYNAMIC = [];     /* S[key] with a run-time key */
const ESCAPES = [];     /* the state handed whole to something not followed */
const WHOLE = [];       /* `<ref>.current = ...` and Object.assign(S, <not a literal>) */

function whereOf(path) {
  /* the nearest function with a name, and a `case 'x':` it sits in */
  let fnName = null, caseName = null;
  for (let p = path; p; p = p.parentPath) {
    if (!caseName && p.isSwitchCase() && p.node.test && p.node.test.type === 'StringLiteral') caseName = p.node.test.value;
    if (!fnName && p.isFunction()) {
      const n = p.node;
      if (n.id && n.id.name) fnName = n.id.name;
      else if (n.key && !n.computed && (n.key.name || n.key.value)) fnName = String(n.key.name || n.key.value);
      else {
        const pp = p.parentPath;
        if (pp.isVariableDeclarator() && pp.node.id.type === 'Identifier') fnName = pp.node.id.name;
        else if (pp.isAssignmentExpression() && pp.node.right === n) {
          const l = pp.node.left;
          fnName = l.type === 'Identifier' ? l.name : (isMember(l) && staticKey(l)) || null;
        } else if (pp.isObjectProperty() && !pp.node.computed) fnName = String(pp.node.key.name || pp.node.key.value);
      }
    }
  }
  return (fnName || '(top)') + (caseName ? " case '" + caseName + "'" : '');
}
const lineOf = (path) => (path.node.loc ? path.node.loc.start.line : 0);
const fnStart = (path) => { const fn = path.getFunctionParent(); return fn ? fn.node.start : -1; };
function site(f, path, extra) {
  return Object.assign({ file: f.path, line: lineOf(path), where: whereOf(path), pos: path.node.start, fn: fnStart(path) }, extra || {});
}
function valueKind(n) {
  if (!n) return 'none';
  switch (n.type) {
    case 'NullLiteral': return 'null';
    case 'BooleanLiteral': return String(n.value);
    case 'NumericLiteral': return n.value === 0 ? '0' : 'number';
    case 'StringLiteral': return 'string';
    case 'TemplateLiteral': return 'string';
    case 'ArrayExpression': return n.elements.length ? 'array' : '[]';
    case 'ObjectExpression': return n.properties.length ? 'object' : '{}';
    case 'Identifier': return n.name === 'undefined' ? 'undefined' : 'other';
    case 'UnaryExpression': return n.operator === 'void' ? 'undefined' : (n.operator === '!' ? 'bool' : (n.operator === '-' ? 'number' : 'other'));
    case 'NewExpression': return n.callee.type === 'Identifier' ? 'new ' + n.callee.name : 'other';
    case 'CallExpression':
      if (isObjectDot(n.callee, ['create'])) return '{}';
      return 'other';
    default: return 'other';
  }
}
const isClearing = (k) => k === 'null' || k === 'false' || k === '0' || k === '[]' || k === '{}' || k === 'undefined'
  || k === 'new Map' || k === 'new Set' || k === 'delete';

/* climb from `X` through `.a.b` to the whole chain; say what is done to it */
function touchOf(path) {
  let top = path, depth = 0;
  for (;;) {
    const p = top.parentPath;
    if ((p.isMemberExpression() || p.isOptionalMemberExpression()) && p.node.object === top.node) { top = p; depth++; } else break;
  }
  const p = top.parentPath;
  const pn = p.node;
  if (isCall(pn) && pn.callee === top.node && depth >= 1) {
    const m = staticKey(top.node);
    if (m !== null && MUTATORS.has(m)) return { kind: 'in', depth: depth - 1, how: '.' + m + '()', top, parent: p };
    return { kind: 'read', depth, top, parent: p };
  }
  if (p.isAssignmentExpression() && pn.left === top.node) {
    const how = depth > 0 && staticKey(top.node) === 'length' ? '.length=' : pn.operator;
    return { kind: depth === 0 ? 'set' : 'in', depth, how, top, parent: p, value: pn.operator === '=' ? valueKind(pn.right) : 'other', right: pn.operator === '=' ? pn.right : null };
  }
  if (p.isUpdateExpression()) return { kind: depth === 0 ? 'set' : 'in', depth, how: pn.operator, top, parent: p, value: 'other' };
  if (p.isUnaryExpression() && pn.operator === 'delete') return { kind: depth === 0 ? 'set' : 'in', depth, how: 'delete', top, parent: p, value: 'delete' };
  if (isCall(pn) && isObjectDot(pn.callee, ['assign']) && pn.arguments[0] === top.node) return { kind: 'in', depth, how: 'Object.assign', top, parent: p };
  /* a destructuring target: [S.a, S.b] = ..., ({ x: S.a } = ...) */
  if ((p.isArrayPattern() || p.isRestElement() || (p.isObjectProperty() && pn.value === top.node && p.parentPath.isObjectPattern())
    || (p.isAssignmentPattern() && pn.left === top.node))) {
    return { kind: depth === 0 ? 'set' : 'in', depth, how: 'destructure', top, parent: p, value: 'other' };
  }
  if ((p.isForOfStatement() || p.isForInStatement()) && pn.left === top.node) return { kind: depth === 0 ? 'set' : 'in', depth, how: 'for', top, parent: p, value: 'other' };
  return { kind: 'read', depth, top, parent: p };
}

/* is this chain rooted at the state itself (`S.a.b`) rather than at a name
   for something inside it (`p.b`)? */
function rootedAtState(path) {
  for (let p = path; isMember(p.node); p = p.get('object')) {
    if (denote(p.get('object')).has('S')) return true;
  }
  return false;
}

const SET_RANGES = new Map();   /* file -> [{ name, start, end, right:[s,e] }] for the self-read rule */
for (const f of FILES.values()) {
  const ranges = [];
  SET_RANGES.set(f.path, ranges);
  for (const m of f.members) {
    const n = m.node;
    const ot = denote(m.get('object'));
    if (!ot.has('S')) {
      /* <ref>.current = {...}: the whole state replaced */
      if (ot.has('REF') && staticKey(n) === 'current') {
        const t = touchOf(m);
        if (t.kind === 'set' && t.depth === 0) {
          if (t.right && t.right.type === 'ObjectExpression') {
            for (const pr of t.right.properties) if (pr.key && !pr.computed) field(pr.key.name || pr.key.value).sets.push(site(f, m, { how: 'whole', value: valueKind(pr.value) }));
          } else WHOLE.push(site(f, m, { what: 'the whole state is replaced' }));
        }
      }
      continue;
    }
    const key = staticKey(n);
    if (key === null) {
      const t = touchOf(m);
      DYNAMIC.push(site(f, m, { write: t.kind !== 'read' }));
      continue;
    }
    if (NOT_FIELDS.has(key)) continue;
    const r = field(key);
    const t = touchOf(m);
    if (t.kind === 'set') {
      r.sets.push(site(f, m, { how: t.how, value: t.value }));
      r.values.set(t.value, (r.values.get(t.value) || 0) + 1);
      if (t.right && t.right.type === 'StringLiteral') r.strings.add(t.right.value);
      ranges.push({ name: key, node: t.parent.node });
    } else if (t.kind === 'in') {
      r.ins.push(site(f, m, { how: t.how }));
    } else {
      r.reads.push(site(f, m, { node: m.node, path: m, depth: t.depth, top: t.top }));
    }
  }
  /* Object.assign(S, { a, b }) */
  for (const c of f.calls) {
    if (!isObjectDot(c.node.callee, ['assign'])) continue;
    const args = c.get('arguments');
    if (!args.length || !denote(args[0]).has('S')) continue;
    for (let i = 1; i < args.length; i++) {
      if (args[i].isObjectExpression()) {
        for (const pr of args[i].node.properties) {
          if (pr.type === 'SpreadElement' || pr.computed) { WHOLE.push(site(f, c, { what: 'Object.assign onto the state, keys not written out' })); continue; }
          const r = field(pr.key.name || pr.key.value);
          const vk = valueKind(pr.value);
          r.sets.push(site(f, c, { how: 'Object.assign', value: vk }));
          r.values.set(vk, (r.values.get(vk) || 0) + 1);
          ranges.push({ name: r.name, node: c.node });
        }
      } else WHOLE.push(site(f, c, { what: 'Object.assign onto the state, keys not written out' }));
    }
  }
}

/* the state's first object: useRef({ ... }) given to a name in REF_NAMES */
for (const f of FILES.values()) {
  for (const d of f.decls) {
    const id = d.node.id, init = d.node.init;
    if (id.type !== 'Identifier' || !REF_NAMES.has(id.name) || !isCall(init)) continue;
    const cn = init.callee;
    const isUseRef = (cn.type === 'Identifier' && cn.name === 'useRef') || (isMember(cn) && staticKey(cn) === 'useRef');
    if (!isUseRef || !init.arguments[0] || init.arguments[0].type !== 'ObjectExpression') continue;
    for (const pr of init.arguments[0].properties) {
      if (!pr.key || pr.computed) continue;
      const r = field(pr.key.name || pr.key.value);
      r.born = { file: f.path, line: pr.loc.start.line, first: true, value: valueKind(pr.value) };
    }
  }
}

/* a read that only feeds a write of the same field is not a reader:
   `S.x = S.x || []`, `if (!S.x) S.x = []`, `S.x || (S.x = [])` */
function within(node, outer) { return node.start >= outer.start && node.end <= outer.end; }
for (const r of FIELDS.values()) {
  const keep = [];
  for (const rd of r.reads) {
    const ranges = SET_RANGES.get(rd.file).filter((x) => x.name === r.name);
    let self = false;
    if (ranges.length) {
      if (ranges.some((x) => within(rd.node, x.node))) self = true;
      else {
        for (let p = rd.path.parentPath; p && !self && !p.isFunction() && !p.isProgram(); p = p.parentPath) {
          const pn = p.node;
          if (p.isIfStatement() && within(rd.node, pn.test) && !pn.alternate) {
            /* the body does nothing but set this field */
            const body = pn.consequent.type === 'BlockStatement' ? pn.consequent.body : [pn.consequent];
            if (body.length === 1 && body[0].type === 'ExpressionStatement' && ranges.some((x) => x.node === body[0].expression)) self = true;
          } else if (p.isLogicalExpression() && within(rd.node, pn.left) && ranges.some((x) => x.node === pn.right) && p.parentPath.isExpressionStatement()) self = true;
        }
      }
    }
    /* compared with a string: the states of a phase */
    const pp = rd.path.parentPath;
    if (rd.depth === 0 && pp.isBinaryExpression() && /^[!=]==?$/.test(pp.node.operator)) {
      const o = pp.node.left === rd.node ? pp.node.right : pp.node.left;
      if (o.type === 'StringLiteral') r.strings.add(o.value);
    }
    if (rd.depth === 0 && pp.isSwitchStatement() && pp.node.discriminant === rd.node) {
      for (const c of pp.node.cases) if (c.test && c.test.type === 'StringLiteral') r.strings.add(c.test.value);
    }
    (self ? r.selfReads : keep).push({ file: rd.file, line: rd.line, where: rd.where });
  }
  r.reads = keep;
}

/* writes inside a field through a name for the inside */
function viaWrite(f, targetPath, how) {
  /* targetPath: the container being changed */
  if (isMember(targetPath.node) && rootedAtState(targetPath)) return;
  if (denote(targetPath).has('S')) return;
  const tags = denote(targetPath);
  for (const t of tags) {
    if (t[0] !== 'P') continue;
    field(t.slice(2)).vias.push(site(f, targetPath, { how }));
  }
}
for (const f of FILES.values()) {
  for (const a of f.assigns) {
    const left = a.get('left');
    if (isMember(left.node)) viaWrite(f, left.get('object'), a.node.operator);
  }
  for (const u of f.updates) {
    const arg = u.get('argument');
    if (isMember(arg.node)) viaWrite(f, arg.get('object'), u.node.operator);
  }
  for (const d of f.deletes) {
    const arg = d.get('argument');
    if (isMember(arg.node)) viaWrite(f, arg.get('object'), 'delete');
  }
  for (const c of f.calls) {
    const cn = c.node.callee;
    if (c.node.type === 'NewExpression') continue;
    if (isObjectDot(cn, ['assign'])) {
      const a0 = c.get('arguments')[0];
      if (a0 && a0.node.type !== 'SpreadElement') viaWrite(f, a0, 'Object.assign');
    } else if (isMember(cn)) {
      const m = staticKey(cn);
      if (m !== null && MUTATORS.has(m)) viaWrite(f, c.get('callee').get('object'), '.' + m + '()');
    }
  }
}

/* the state handed whole to something this cannot follow */
const KNOWN_SAFE_CALLEES = new Set(['Boolean', 'String', 'Number', 'isNaN']);
for (const { b, f } of TAGGED_S) {
  for (const ref of b.referencePaths) noteEscape(fileOf(ref) || f, ref);
}
for (const f of FILES.values()) {
  for (const m of f.members) {
    if (staticKey(m.node) === 'current' && denote(m).has('S')) noteEscape(f, m);
  }
  for (const c of f.calls) {
    const fns = calleeFns(c);
    if (fns.some((fn) => (RET.get(fn.node) || EMPTY).has('S'))) noteEscape(f, c);
  }
}
function calleeName(n) {
  if (!n) return '?';
  if (n.type === 'Identifier') return n.name;
  if (isMember(n)) return calleeName(n.object) + '.' + (staticKey(n) || '[]');
  if (n.type === 'ThisExpression') return 'this';
  return '?';
}
function noteEscape(f, path) {
  const p = path.parentPath;
  const pn = p.node;
  if ((isCall(pn) || pn.type === 'NewExpression') && pn.callee !== path.node) {
    if (calleeFns(p).length) return;
    const name = calleeName(pn.callee);
    if (KNOWN_SAFE_CALLEES.has(name)) return;
    if (isObjectDot(pn.callee, ['assign']) && pn.arguments[0] === path.node) return;
    ESCAPES.push(site(f, path, { kind: 'a call not followed', to: name }));
  } else if (p.isObjectProperty() && pn.value === path.node && !p.parentPath.isObjectPattern()) {
    ESCAPES.push(site(f, path, { kind: 'put in an object', to: String(pn.key.name || pn.key.value || '?') }));
  } else if (p.isSpreadElement()) {
    ESCAPES.push(site(f, path, { kind: 'spread', to: '...' }));
  } else if (p.isJSXExpressionContainer() && p.parentPath.isJSXAttribute()) {
    const an = p.parentPath.node.name.name;
    if (an !== STATE_PARAM) ESCAPES.push(site(f, path, { kind: 'a prop', to: String(an) }));
  } else if ((p.isForInStatement() && pn.right === path.node)) {
    ESCAPES.push(site(f, path, { kind: 'for-in over the state', to: 'keys' }));
  } else if (p.isArrayExpression()) {
    ESCAPES.push(site(f, path, { kind: 'put in an array', to: '[]' }));
  }
}

/* ─── the variables at the top of files ─── */
const VARS = [];   /* rows */
function initKind(n) {
  if (!n) return 'none';
  switch (n.type) {
    case 'NewExpression': {
      const c = n.callee.type === 'Identifier' ? n.callee.name : (isMember(n.callee) ? staticKey(n.callee) : '?');
      if (/^(Map|Set|WeakMap|WeakSet|Array)$/.test(c)) return c === 'Array' ? 'array' : c;
      if (/Array$/.test(c)) return 'typed array';
      return 'new ' + c;
    }
    case 'ArrayExpression': return 'array';
    case 'ObjectExpression': return 'object';
    case 'CallExpression':
      if (isObjectDot(n.callee, ['create', 'assign', 'freeze', 'seal', 'fromEntries'])) return n.callee.property.name === 'freeze' ? 'frozen' : 'object';
      if (isMember(n.callee) && n.callee.object.type === 'Identifier' && n.callee.object.name === 'Array') return 'array';
      return 'call';
    case 'NullLiteral': return 'null';
    case 'NumericLiteral': return 'number';
    case 'StringLiteral': case 'TemplateLiteral': return 'string';
    case 'BooleanLiteral': return 'bool';
    case 'UnaryExpression': return n.operator === '-' || n.operator === '+' ? 'number' : (n.operator === '!' ? 'bool' : 'value');
    case 'FunctionExpression': case 'ArrowFunctionExpression': return 'function';
    case 'ClassExpression': return 'class';
    case 'ConditionalExpression': case 'LogicalExpression': {
      const a = initKind(n.type === 'ConditionalExpression' ? n.consequent : n.left);
      const b = initKind(n.type === 'ConditionalExpression' ? n.alternate : n.right);
      return a === b ? a : (a === 'null' ? b : (b === 'null' ? a : 'value'));
    }
    default: return 'value';
  }
}
const CONTAINER = new Set(['Map', 'Set', 'WeakMap', 'WeakSet', 'array', 'typed array', 'object']);
const NOT_AN_OBJECT = new Set(['number', 'string', 'bool', 'null', 'function', 'class', 'frozen']);

/* what a reference does to the variable it names */
function refUse(ref) {
  const t = touchOf(ref);
  if (t.kind === 'in') return { write: true, how: t.how };
  if (t.kind === 'set' && t.depth === 0) return { write: true, how: 'reassign' };   /* a destructure or for target */
  const p = ref.parentPath;
  if (isCall(p.node) && isObjectDot(p.node.callee, ['assign']) && p.node.arguments[0] === ref.node) return { write: true, how: 'Object.assign' };
  return { write: false };
}

/* who imports what: (file, exported name) -> [{ f, binding }] */
const IMPORTERS = new Map();
for (const f of FILES.values()) {
  for (const [local, imp] of f.imports) {
    if (!imp.from || imp.name === '*') continue;
    const t = exportTarget(imp.from, imp.name);
    if (!t || !t.local) continue;
    const key = t.file.path + '\n' + t.local;
    if (!IMPORTERS.has(key)) IMPORTERS.set(key, []);
    IMPORTERS.get(key).push({ f, binding: f.program.scope.getBinding(local) });
  }
}

for (const f of FILES.values()) {
  const scope = f.program.scope;
  for (const stmt of f.program.get('body')) {
    let decl = stmt;
    if (stmt.isExportNamedDeclaration() && stmt.node.declaration) decl = stmt.get('declaration');
    if (!decl.isVariableDeclaration()) continue;
    const kind = decl.node.kind;
    for (const d of decl.get('declarations')) {
      const simple = d.node.id.type === 'Identifier';
      for (const name of patternNames(d.node.id)) {
        const b = scope.getBinding(name);
        if (!b) continue;
        const ik = simple ? initKind(d.node.init) : 'value';
        const row = {
          name, file: f.path, line: d.node.loc.start.line, decl: kind, init: ik,
          writes: [], reads: [], strings: new Set(), values: new Map(), reassigned: 0, mutated: 0,
        };
        /* reassignments (never for a const) */
        for (const v of b.constantViolations) {
          if (v.node === d.node || v.node === decl.node) continue;
          row.reassigned++;
          let vk = 'other';
          if (v.isAssignmentExpression() && v.node.operator === '=') {
            vk = valueKind(v.node.right);
            if (v.node.right.type === 'StringLiteral') row.strings.add(v.node.right.value);
          }
          row.values.set(vk, (row.values.get(vk) || 0) + 1);
          row.writes.push(site(fileOf(v) || f, v, { how: 'reassign', value: vk }));
        }
        if (d.node.init && d.node.init.type === 'StringLiteral') row.strings.add(d.node.init.value);
        const scan = (ff, binding) => {
          for (const ref of binding.referencePaths) {
            if (ref.parentPath.isExportSpecifier() || ref.parentPath.isExportNamedDeclaration() || ref.parentPath.isExportDefaultDeclaration()) continue;
            const u = refUse(ref);
            if (u.write) { row.mutated++; row.writes.push(site(ff, ref, { how: u.how })); }
            else {
              row.reads.push({ file: ff.path, line: lineOf(ref) });
              const pp = ref.parentPath;
              if (pp.isBinaryExpression() && /^[!=]==?$/.test(pp.node.operator)) {
                const o = pp.node.left === ref.node ? pp.node.right : pp.node.left;
                if (o.type === 'StringLiteral') row.strings.add(o.value);
              }
              if (pp.isSwitchStatement() && pp.node.discriminant === ref.node) {
                for (const c of pp.node.cases) if (c.test && c.test.type === 'StringLiteral') row.strings.add(c.test.value);
              }
            }
          }
        };
        scan(f, b);
        row.exported = [...f.exports.values()].some((e) => e.local === name);
        for (const imp of IMPORTERS.get(f.path + '\n' + name) || []) if (imp.binding) scan(imp.f, imp.binding);
        VARS.push(row);
      }
    }
  }
}


/* ─── where state is written TODAY when the place changes, a life ends, or
   the phone rejoins ───
   Evidence, read off the code; it is not the hand-made column.
     zone    the block around a call of changeZone() (zoneTransitions.js: "the
             ONLY writer of S.currentZone"), and changeZone itself;
     death   the block around `S._dying = true`, and applyLocalRespawn
             (respawn.js: "standing back up, in one place");
     rejoin  wsClient.js's `case 'state_sync'`, and rejoinClear
             (rejoinSlots.js);
   each with the functions it calls, one call deep. */
const REGIONS = { zone: [], death: [], rejoin: [] };
const blockOf = (path) => path.findParent((p) => p.isBlockStatement() || p.isSwitchCase() || p.isProgram());
function addRegion(edge, f, path, sameFn) {
  if (!path || REGIONS[edge].some((r) => r.file === f.path && r.start === path.node.start && r.end === path.node.end)) return false;
  REGIONS[edge].push({ file: f.path, start: path.node.start, end: path.node.end, fn: sameFn ? fnStart(path) : undefined });
  return true;
}
function exportedFn(fileRel, name) {
  const t = exportTarget(fileRel, name);
  if (!t || !t.local) return [];
  return fnsOfBinding(t.file.program.scope.getBinding(t.local), 0);
}
const ZONE_DOOR = exportedFn('src/game/zoneTransitions.js', 'changeZone');
const RESPAWN = exportedFn('src/game/respawn.js', 'applyLocalRespawn');
const REJOIN_CLEAR = exportedFn('src/game/rejoinSlots.js', 'rejoinClear');
const EDGE_ANCHORS = { zone: 0, death: 0, rejoin: 0 };
for (const fn of ZONE_DOOR) { addRegion('zone', fileOf(fn), fn, false); }
for (const fn of RESPAWN) { addRegion('death', fileOf(fn), fn, false); EDGE_ANCHORS.death++; }
for (const fn of REJOIN_CLEAR) { addRegion('rejoin', fileOf(fn), fn, false); }
for (const f of FILES.values()) {
  for (const c of f.calls) {
    if (c.node.callee.type === 'Identifier' && c.node.callee.name === 'changeZone' && calleeFns(c).some((fn) => ZONE_DOOR.some((z) => z.node === fn.node))) {
      if (addRegion('zone', f, blockOf(c), true)) EDGE_ANCHORS.zone++;
    }
  }
  for (const a of f.assigns) {
    const l = a.node.left;
    if (isMember(l) && staticKey(l) === '_dying' && a.node.right.type === 'BooleanLiteral' && a.node.right.value === true && denote(a.get('left').get('object')).has('S')) {
      if (addRegion('death', f, blockOf(a), true)) EDGE_ANCHORS.death++;
    }
  }
  if (f.path === 'src/networking/wsClient.js') {
    f.program.traverse({
      SwitchCase(p) {
        if (p.node.test && p.node.test.type === 'StringLiteral' && p.node.test.value === 'state_sync') { if (addRegion('rejoin', f, p, false)) EDGE_ANCHORS.rejoin++; }
      },
    });
  }
}
/* one call deep */
for (const edge of Object.keys(REGIONS)) {
  const base = REGIONS[edge].slice();
  for (const r of base) {
    const f = FILES.get(r.file);
    for (const c of f.calls) {
      const pos = c.node.start;
      if (pos < r.start || pos > r.end) continue;
      if (r.fn !== undefined && fnStart(c) !== r.fn) continue;
      for (const fn of calleeFns(c)) addRegion(edge, fileOf(fn), fn, false);
    }
  }
}
function edgesOf(sites) {
  const out = [];
  for (const edge of ['zone', 'death', 'rejoin']) {
    if (sites.some((s) => REGIONS[edge].some((r) => r.file === s.file && s.pos >= r.start && s.pos <= r.end && (r.fn === undefined || r.fn === s.fn)))) out.push(edge);
  }
  return out;
}

/* ─── names that code outside src/ reads off the state (the QA probes) ─── */
const OUTSIDE = new Set();
(function scanOutside() {
  const roots = ['tools', join('server', 'test')];
  const visit = (dir) => {
    let names;
    try { names = readdirSync(dir).sort(); } catch (e) { return; }
    for (const name of names) {
      if (name === 'node_modules' || name.startsWith('.')) continue;
      const p = join(dir, name);
      const st = statSync(p);
      if (st.isDirectory()) visit(p);
      else if (/\.(mjs|js|cjs|jsx|html)$/.test(name) && st.size < 3e6 && p !== fileURLToPath(import.meta.url)) {
        const text = readFileSync(p, 'utf8');
        const re = /\.([A-Za-z_$][\w$]*)/g;
        let m;
        while ((m = re.exec(text))) OUTSIDE.add(m[1]);
      }
    }
  };
  for (const r of roots) visit(join(ROOT, r));
}());

/* ─── the rows ─── */
const uniq = (a) => [...new Set(a)];
const byCount = (sites) => {
  const m = new Map();
  for (const s of sites) m.set(s.file, (m.get(s.file) || 0) + 1);
  return [...m].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
};
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const PHASE_NAME = /(Phase|State|Mode|Stage|Status)$/;
const isBool = (k) => k === 'true' || k === 'false' || k === 'bool';

const fieldRows = [...FIELDS.values()].map((r) => {
  const rooted = [...r.sets, ...r.ins];
  const score = new Map();
  const bump = (sites, k) => { for (const s of sites) score.set(s.file, (score.get(s.file) || 0) + k); };
  bump(r.sets, 1e6); bump(r.ins, 1e4); bump(r.vias, 1e2); bump(r.reads, 1); bump(r.selfReads, 1);
  if (r.born && !score.size) score.set(r.born.file, 1);
  const system = [...score].sort((a, b) => b[1] - a[1] || cmp(a[0], b[0]))[0][0];
  let born;
  if (r.born) born = { how: 'first', file: r.born.file, line: r.born.line };
  else if (r.sets.length) {
    const own = r.sets.filter((s) => s.file === system);
    const first = (own.length ? own : r.sets).slice().sort((a, b) => cmp(a.file, b.file) || a.line - b.line)[0];
    born = { how: 'fly', file: first.file, line: first.line };
  } else born = { how: 'never' };
  const setFiles = uniq(r.sets.map((s) => s.file)), rootedFiles = uniq(rooted.map((s) => s.file));
  const allWriteFiles = uniq([...rootedFiles, ...r.vias.map((s) => s.file)]);
  const marks = [];
  if (rootedFiles.length >= 2) marks.push('2+');
  else if (allWriteFiles.length >= 2) marks.push('2+~');
  if (!r.reads.length) marks.push(OUTSIDE.has(r.name) ? 'no-read (tests)' : 'no-read');
  if (!r.sets.length && !r.born) marks.push('no-set');
  const states = [...r.strings].sort();
  const phase = states.length >= 2 || (PHASE_NAME.test(r.name) && states.length >= 1);
  if (phase) marks.push('phase');
  const vals = [...r.values.keys()].concat(r.born ? [r.born.value] : []);
  const flag = !phase && r.sets.length > 0 && vals.every(isBool);
  if (flag) marks.push('flag');
  return {
    name: r.name, system, born, marks, phase, flag, states,
    writers: byCount([...rooted, ...r.vias]),
    rootedFiles, setFiles, viaOnly: allWriteFiles.filter((f) => !rootedFiles.includes(f)),
    readers: byCount(r.reads),
    sets: r.sets, ins: r.ins, vias: r.vias, reads: r.reads, selfReads: r.selfReads,
    values: [...r.values].sort((a, b) => b[1] - a[1] || cmp(a[0], b[0])),
    at: edgesOf(rooted),
    setFns: uniq(r.sets.map((s) => s.file + ' ' + s.where)).sort(),
  };
}).sort((a, b) => cmp(a.system, b.system) || cmp(a.name, b.name));

const varRows = VARS.filter((v) => v.decl !== 'const' || (v.mutated > 0 && !NOT_AN_OBJECT.has(v.init))).map((v) => {
  const changed = v.reassigned + v.mutated > 0;
  const marks = [];
  const writeFiles = uniq(v.writes.map((w) => w.file));
  if (writeFiles.length >= 2) marks.push('2+');
  if (changed && !v.reads.length) marks.push('no-read');
  const states = [...v.strings].sort();
  const phase = v.reassigned > 0 && (states.length >= 2 || (PHASE_NAME.test(v.name) && states.length >= 1));
  if (phase) marks.push('phase');
  const flag = !phase && v.init === 'bool' && v.reassigned > 0 && v.mutated === 0 && [...v.values.keys()].every(isBool);
  if (flag) marks.push('flag');
  return {
    name: v.name, file: v.file, line: v.line, decl: v.decl, init: v.init, changed, exported: v.exported,
    marks, phase, flag, states,
    writers: byCount(v.writes), readers: byCount(v.reads),
    reassigned: v.reassigned, mutated: v.mutated,
    writes: v.writes,
    values: [...v.values].sort((a, b) => b[1] - a[1] || cmp(a[0], b[0])),
    at: edgesOf(v.writes),
    writeFns: uniq(v.writes.map((w) => (w.file === v.file ? '' : short(w.file) + ' ') + w.where + (w.how === 'reassign' ? '=' + (w.value || '') : w.how))).sort(),
  };
}).sort((a, b) => cmp(a.file, b.file) || a.line - b.line || cmp(a.name, b.name));

/* ═══ THE ONE HAND-MADE COLUMN: when should it reset?  (suggested, not confirmed) ═══
 *
 * Four words, the card's:
 *   never    it lives for the sitting: who you are, a setting, a cache, a
 *            window's own state, a clock;
 *   zone     it belongs to the place you are in (a death's respawn and a
 *            dungeon's door are zone changes too);
 *   death    it belongs to one life: a status, a timer, a fight;
 *   rejoin   it is the phone's copy of something the worker holds: cleared at
 *            state_sync and said again by the worker (REJOIN_SLOTS).
 * Two words joined by '+' mean both edges.
 *
 * Fields by name; variables by file, then name.  A `let`/`var` that is never
 * changed needs no entry (the page prints "never" for it by machine).  A row
 * with no entry prints "?" and is counted at the end of the page; an entry
 * whose row is gone is counted as stale.  Filled 2026-11-13 by reading each
 * row's writers and readers (the readers' notes are not kept: the column is
 * a suggestion for card U's ledger, where a system's owner confirms it).
 *
 * MACHINES is the same kind of judgement for step 5.3b: which rows carry
 * each of the state machines the plan names (a field by name, a variable as
 * `file:name`).  Suggested, not confirmed; card L's starting list. */
/* SUGGESTED:BEGIN */
const SUGGESTED = {
  fields: {
    'never': `
      __aliveAt __btNoIdleMoves __introLiftedAt __introLiftedZone __pixiErrStreak __wdArmedAt __wdDark
      __wdEverLit __wdFastRebuiltAt __wdFirstNext __wdHb __wdNext __wdReloading _abilCd _abilityFx
      _abilitySwingUntil _aimActive _arenaHistoryLoaded _arenaLastBgPoll _arenaLastPoll _arenaNotified
      _atkEnergy _atkHoldUntil _atkPressAt _authRejects _avatarArtHold _backpedaling _bfPose _blockFlash
      _blockPose _blockShieldBehind _blocked _bodyAnimDir _bodyAnimFrame _bodyAnimMirror _bodyDrawH _bodyFootY
      _bodyMoving _bodyPlacedAt _bowArtReady _bowDir _bowGripDX _bowGripDY _bowHoldFrame _bowJogLegs
      _bowShotAng _bowShotAt _bowShowing _bowSight _bowSpecialQueued _btnHarvest _burstMsgAt _camPunch
      _capeStatusLine _characterReset _chatBySelfTap _clanPaintColor _clanPainting _climbFrame _climbNoteAt
      _currentRoom _damageFlash _dayNightCache _dazeNoteAt _dblTap _dblTapRolls _dead _dealtAt _deathDrops
      _deathFlash _deskPressBash _diceAskAt _discGhost _discRect _discRectAt _dodgeFlash _dropLast
      _dropLinesAt _dtScale _eTalkHints _emoteAt _emoteHudDrop _emoteMove _evErrLogged _facing _facingAngle
      _facingSrc _farmAskedAt _farmLastSeed _farmLastStep _farmSeedPick _farmSteps _fbLastFilter _figureScaleY
      _flipCount _footstepTimer _frameCount _frameMs _friends _frozenAt _frozenByAdmin _gambleResult
      _gambleWager _gatherHitSeq _gustAng _gustAt _hardenedWoodSeen _harvestKeys _hasDodged _hasSled
      _hasUsedSwipe _heapBurnSentAt _heapBurnUntil _hitFlash _hitStop _hudPopups _idleChatAt _idleChatSeq
      _instantHealAt _interactNow _isDesktop _jogBodyH _joinId _joinKey _joinRejectedFatal _jumpCount
      _jumpLandAt _jumpLandFx _jumpWhy _keyFellBack _keyNewAt _killSlowmo _killSlowmoDuration _killXpFlewAt
      _killXpKillAt _lJoyHeld _lJoyLiveUntil _lJoyPreviewUntil _lJoyShown _lastAbilityReject _lastAimAngle
      _lastArrowBoom _lastBurstAt _lastDrownTick _lastExBroadcast _lastFlip _lastGatherNodeAt _lastGhostSweep
      _lastHarvestOkAt _lastInputAt _lastJumpRun _lastMoveBroadcast _lastReportAck _lastSwipe _lastTrack
      _lbLastTab _lbServerData _levelShownBaselined _levelUpFlash _lockDroppedAt _lockDroppedWhy
      _lootFreezeUntil _lungeIFramesUntil _mail _mapPins _mapWatchSent _mayorGateAt _mc _mcEarly _mcTeachAt
      _mcTeachN _miningOpen _mktLastRefresh _mktPlaceBusy _monNoiseAt _monstersArtWait _monstersFarHidden
      _mouseAimAngle _mouseScreen _nmlAskAgain _nmlAskMarks _nmlAskedAt _nmlConfiscatedAt _nmlLockAskAt
      _offlineNoteAt _onlineAt _ownCollisionRecent _ownSpecialRecent _peerArmTex _peerBlockPose
      _peerBowFacingsReady _peerDmgZone _peerShieldHeld _peerStandGeom _peersCrowdHidden _peersFarHidden
      _peersNotDrawn _perf _perimeterPx _petBookRev _petLevelSaid _petLevelUps _petPrevPX _petPrevPY
      _petXpGained _playtimeTick _propSwingAt _pushY _pvpAt _pvpBlows _pvpBouts _pvpHitBy _pvpReputation
      _pvpSrvHits _pvpSwSent _pvpSwSentBy _pvpThreat _pvpThreatCdUntil _qcNextPoll _qcSeen _rBtnLiveUntil
      _rBtnPressUntil _rBtnShown _rJoyLiveUntil _raft _railCss _railCssAt _renderFacing _rendererKind
      _resetRefused _restPending _resumeSpot _revealLast _riseChestGot _rpgFromServer _rpgSaveTimer
      _selfBandBotY _selfBandHalfW _selfBandTopY _selfChatTipY _shieldAimMouse _shieldDroppedAt
      _shieldDroppedWhy _shieldThreat _shockAt _slowMult _smithyTab _snowballCd _spinBoard _splitLog
      _sprintRunOuts _staffCadenceMs _staffCastAng _staffCastAt _staffCastBig _staffTipBehind _staggerNoteAt
      _staleTouches _standInBody _standInBodyH _standInFootY _statsSavedJson _stuckNoteAt _swingAng
      _swingBcastPending _swingSfxKey _swingSfxPending _swordBodyH _swordFootY _swordJogLegs _swordSwingDir
      _swordSwinging _t1Seeded _t2LocalEnd _tabClaim _tabKey _tabKeyOld _tabMoved _tapActs _tapAtk _tapAtkWhy
      _tapAttacks _tapEmptySeq _targetCands _targetFacingAngle _tickCount _tiledWalkable _tooFarAt
      _touchHandledAt _tourStarted _trailTimer _trapArms _trapCatches _trapLast _trapReveal _trapRolls
      _trapsMade _tutorialDoneAt _tutorialStep _uiBusy _userCycledSlot _verifyToken _viewH _viewW _warTarget
      _warTargetData _warZone _wardAt _wardElem _wardHits _wardPct _wardSaid _wardSaidAt _wasMovingBcast
      _weaponSwapFlash _wheelDoorAskedAt _wheelGateHits _wheelMem _wheelSpawnInit _worldScaleX _worldScaleY
      _wwType _xpBar _xpBarLastGainTs _xpCarry _zoneLockAt _zoneWarnAt _zoneWipe activeQuest blocked bodyLegs
      bodySize bodyTorso channel chatBubbles chatLog collectedIds emote friends isSwinging journey keys
      lastBroadcast lastDamageTaken myAvatar myBroData myColor myId myName player playerId respawnTimer rpg
      rpgState score screenShake stats stickX stickY swingAngle swingTimer tickCount visitedZones weapon zone`,
    'zone': `
      _aimAngle _aimSrc _aiming _ambientParticles _arrowSnaps _atkPending _bashDash _bashPose _bf _bloodBursts
      _bowGripX _bowGripY _burnUntil _campfire _catchFlights _chillUntil _climb _climbDrop _currentDepth
      _customDungeonTerrain _dashStrike _dazeUntil _debrisBursts _deskPressLock _diveAir _diveStarted
      _dlCredits _dmgFromMonster _dodgeRoll _dodgeTrail _dropLines _dungeonBossSpawned _dungeonClear
      _dungeonDepth _dungeonEnteredAt _dungeonMaxWaves _dungeonWave _dungeonZone _dustPuffs _echoActive
      _engaged _engagedGapAt _engagedId _enteredFromDir _enteredFromExit _enteredFromHub _extraction
      _farmArtHold _farmBack _farmHands _farmLeaving _farmWork _feelFx _fireTrail _firemaking _fractureStacks
      _fractureUntil _frozenUntil _fxBursts _gust _hubExitDisarm _iceAttack _impactRings _jump _jumpOver
      _killXpWait _lastGatherNodeId _mouseWorldX _mouseWorldY _nearBed _nearChest _nearHouse _nearNode
      _nearNpc _nearPetHouse _nearWheelBuilding _nearWheelDoor _nearWorkshop _nmlAsked _nmlFoes _nmlLevel
      _nodeResyncT _npcProxLatch _particles _peerCampfires _peerDmgLastRel _peerDmgQueue _peerGatherNode
      _peerPrintLast _peerWhirlFx _peerWindups _petFetch _petX _petY _poisonUntil _preDungeonMap
      _preDungeonMonsters _preDungeonNodes _preDungeonPos _printLast _propMarks _proxNode _remoteProjectiles
      _riseCross _shockFrom _shockUntil _shotEnds _shotImpacts _sled _sleeping _slideVx _slideVy _slowUntil
      _smithing _snowballs _snowmen _soakUntil _sootQueue _sparkArcs _spawnAskedAt _spawnSince _spawnToWheel
      _specialAttack _sprint _staffCrashes _staffTipAt _staffTipX _staffTipY _staggerUntil _stormZaps
      _stuckUntil _swimming _teachNode _telegraphZones _thornUntil _tideLevel _torch _townArtHold _waterBlows
      _wheelDungeonOpening _wheelSwim _wheelTripVeil _whirlCatch _whirlFx _whirlWindup _wobbleFrom
      _wobbleUntil _zoneLoading arrowBlasts arrows autoAttack camera campfires collectibles currentZone
      deathExplosions destroyedTrees dmgNumbers fishTimer footprints groundSplatter hitParticles map
      nearBuilding npcs peerFootprints projectiles slimeProjectiles slimeShockwaves snowballBursts trail`,
    'death': `
      _bleedUntil _cursedUntil _dazeGritAt _deathCard _deathStart _dying _frozenChipAt _gustDustAt
      _playerStunUntil _respawnInvuln _sf _shieldAngle _shieldAutoReleased _shieldCdUntil _shieldKb
      _shieldMouse _shieldStamina _shieldUp _stf _stunEnd _wellRestedUntil shieldActive shieldEnd`,
    'rejoin': `
      _acc _accState _achv _activeClanWar _activeDuel _arenaInvolved _arenaMatch _arenaStakeBoard
      _arenaTournamentId _bank _bankPending _bodyPlaceDue _clanData _codex _dailyRewards _dmgBuff _dmgBuffMul
      _fishBoard _hpBuff _httpToken _inDuel _jackpotPool _jackpotTickets _joinedId _kaConfirmed _keyIdAsked
      _lastBroadcastBa _lastBroadcastBlocking _lastBroadcastDead _lastBroadcastEx _lastBroadcastFacing
      _lastBroadcastGear _lastBroadcastX _lastBroadcastY _lastBroadcastZone _lastStatsUpdateSig _manaBuff
      _manaFlat _netHold _nmlLocks _nmlSelf _party _pendingClanInvite _petBook _playerCount
      _pointsResetAskedAt _pvpSkullType _pvpSkullUntil _realtimeStatus _regenBuff _resistBuff _restAsked
      _riseChestAsk _serverCaps _serverGatherNodes _serverLoot _serverMuteNames _serverMutes _spdBuff
      _spdBuffMul _t2DoneWatch _t2Leave _t2Live _t2QuietUntil _testMode _threatMarks _xpBuff _xpBuffMul others`,
    'zone+rejoin': `
      _customDungeonConfig _dungeonBack _dungeonComplete _inCustomDungeon _inDungeon _pendingZoneNodes _pose
      _race _raceLil _ride _serverDungeon _serverMonsters _spar _trap _trapTries gatherNodes groundLoot
      lockedTarget monsters`,
  },
  vars: {
    'data/abilities.js': { rejoin: '_blockScale _enabled' },
    'data/achievements.js': { never: 'BY_ID' },
    'data/bowFeelSound.js': { never: '_noise' },
    'data/effects.js': { never: 'WORLDVIEW_ARRIVAL WORLDVIEW_EXITS' },
    'data/fishVariants.js': { never: 'NAME' },
    'data/footstepClips.js': { never: 'FOOTSTEP_CLIPS' },
    'data/gameDisplay.js': { never: 'BT_AUDIO' },
    'data/gameSystems.js': {
      never: `
        discoveredCollisions discoveredMonsters discoveredMaterials visitedZones _npcHasQuestCache _doorCache
        _doorCount _closedDoorZones _wheelDoorActions _questsByNpc _questEntries`,
      zone: `
        TOWN_W TOWN_H COLS ROWS`,
      rejoin: `
        _fishHealLadder WEAPON_STASH_MAX _t2BenchEnabled _gridCapsEnabled _t2SimpleEnabled _gearQ _grottoParty`,
    },
    'data/monsterDeathZones.js': { never: '_resolved' },
    'data/oneFormula.js': { rejoin: '_on _oneLevel _gearOnLevel' },
    'data/ownerIcons.js': { never: 'SCENES' },
    'data/prog3.js': { rejoin: '_enabled _prog3x _prog3elem _prog3shared _prog3rel _statFree _burstCaps _milestonesRetired' },
    'data/raceTally.js': { never: 'lost' },
    'data/soundFold.js': { never: '_a _b _m' },
    'data/statDemoAssets.js': { never: '_blueSheets' },
    'data/weaponFeelSound.js': { never: '_noise' },
    'data/wheelLands.js': { never: 'LOOK' },
    'data/worldProps.js': { never: '_blockerCache', zone: '_blockerHook' },
    'data/zoneBanner.js': { never: 'ZONE_BANNER_THEME ZONE_BANNER_STRIPS' },
    'data/zones.js': { never: 'ZONES' },
    'debug/busyBeat.js': { never: '_base _last _n _on _gaps _gi _gn _held' },
    'debug/crashTrap.js': { never: '_flushTimer _flushAt _lastSentKey _rebuilds _aliveAt _aliveChan' },
    'debug/debugBus.js': { never: 'listeners logs wsFrames commands commandHistory state consoleHooked wsHooked debugBus' },
    'debug/perfHud.js': { never: '_stickHi _stickLo _stickOn el _chip' },
    'debug/perfTracker.js': {
      never: `
        ring ringIdx ringCount longFrames longTasks extEvents spikeLastT spikeWorst longTaskObserver
        timersHooked`,
      zone: `
        zoneStats`,
    },
    'game/accuracy.js': { never: 'listeners' },
    'game/achievements.js': { never: '_titlePick' },
    'game/alliance.js': { never: 'listeners' },
    'game/ambientBeds.js': { never: 'st' },
    'game/bank.js': { never: 'listeners rev seq' },
    'game/bowFeel.js': { never: '_wanted' },
    'game/buildingRooms.js': { never: '_prefetchStarted', zone: '_held' },
    'game/characterCreatorEffects.js': { never: '_offCanvas _cam _figBounds' },
    'game/chat.js': { never: '_moveSender' },
    'game/chatChannel.js': { never: '_mode _to listeners' },
    'game/chatMute.js': { never: '_subs _blockSubs', rejoin: '_kept' },
    'game/clientOff.js': { never: '_atLoad _subs', rejoin: '_live' },
    'game/climbActions.js': { never: 'climbStats _lastS' },
    'game/combatHelpers.js': { never: '_propSlashFlip' },
    'game/controlVisibility.js': { never: 'HOLDS' },
    'game/dailyRewards.js': { never: '_lastSpin _win _listeners _spinSeq', rejoin: '_state' },
    'game/dashSidePref.js': { never: '_pref' },
    'game/deskKeys.js': { never: 'NAV_BY_CODE' },
    'game/deviceProfile.js': { never: '_mq' },
    'game/dropLook.js': { never: 'thumb' },
    'game/dungeonArt.js': { zone: '_live' },
    'game/dungeonClear.js': { never: 'subs' },
    'game/eventSounds.js': { never: 'cueStats _lastAt _peerAt _stepAt' },
    'game/farmFeedback.js': { never: 'toldRipe' },
    'game/farmTrip.js': { never: '_seq' },
    'game/fishWeigh.js': { never: 'listeners', rejoin: 'st' },
    'game/framePacer.js': { never: '_drawnAt _before' },
    'game/friendErrors.js': { never: 'lastAt' },
    'game/hitSounds.js': { never: 'hitSoundStats _echoAt' },
    'game/jumpActions.js': { never: '_jumpMs' },
    'game/loadTimes.js': { never: '_marks _seen _groups _groupsFrom' },
    'game/loginSpinWheel.js': { never: 'listeners', rejoin: '_st' },
    'game/manualCombat.js': { never: '_mode _bowHook' },
    'game/mastery.js': { never: '_level _certs _timestamps subscribers' },
    'game/monsterMoves.js': { rejoin: '_caps' },
    'game/nmlAsk.js': { never: '_subs _msOverride _joins', zone: '_ask' },
    'game/nmlExplainOnce.js': { never: '_told' },
    'game/noMansLand.js': { zone: '_note' },
    'game/npcVoices.js': { never: 'st' },
    'game/ownSounds.js': { never: 'st' },
    'game/pinSlots.js': { never: '_ask _subs' },
    'game/projectiles.js': { never: '_segHitX _segHitY PROJ_BODY _capAx _capAy _capBx _capBy' },
    'game/questHandIn.js': { rejoin: '_pending' },
    'game/questKept.js': { rejoin: '_kept' },
    'game/questTrailStyle.js': { never: '_style _lastShown' },
    'game/race.js': { never: '_subs' },
    'game/renderRes.js': { never: '_url _live' },
    'game/revealBag.js': { never: '_held _after', rejoin: '_then' },
    'game/rideSound.js': { never: 'st' },
    'game/rpgSave.js': { never: '_timer _lastWrite' },
    'game/salvage.js': { never: '_last _listeners' },
    'game/season.js': { never: '_forced' },
    'game/shardCrack.js': { never: '_last _seq _listeners', rejoin: '_pending' },
    'game/shieldGem.js': { never: '_last _listeners', rejoin: '_pending' },
    'game/soundStudio.js': { never: '_ring _next _seq _installed _host _root _opening' },
    'game/sparTargets.js': { never: '_foeRule' },
    'game/speedTest.js': { never: '_card _running' },
    'game/spinBoard.js': { never: 'listeners' },
    'game/staffFeel.js': { never: '_wanted _audio' },
    'game/storeAnswer.js': { never: 'sellsOut' },
    'game/swordFeel.js': { never: '_wanted' },
    'game/tapJump.js': { never: '_tapMs' },
    'game/timeOfDay.js': { never: 'OUTDOOR _alwaysDay' },
    'game/townAmbience.js': { never: 'st' },
    'game/townChatter.js': { never: '_off' },
    'game/townsfolkDay.js': { never: '_givers _giverSrc _frame _bumpsTotal' },
    'game/townsfolkWalk.js': { never: '_loops' },
    'game/trackedQuest.js': { never: '_read _id _subs' },
    'game/trapping.js': { never: '_petVoiceLast' },
    'game/waterAmbience.js': { never: 'st' },
    'game/weaponGem.js': { never: '_last _listeners', rejoin: '_pending' },
    'game/wheelBreak.js': { never: '_catKind wheelBreakStats _listeners', zone: '_dmg _broken _events _src' },
    'game/wheelDungeons.js': { never: '_doors _doorsOf _open _openN _openOf' },
    'game/wheelMusic.js': { zone: '_m' },
    'game/wheelNoticeboard.js': { never: '_board _doors _src' },
    'game/wheelSize.js': { never: '_listeners', zone: '_built', rejoin: '_long _told _waiters' },
    'game/wheelTownDoors.js': { never: '_doors _src', rejoin: '_hallCapsOn' },
    'game/wheelTrial.js': {
      never: `
        _seq _gotFns wheelStats wheelObjectStats _stopFns _waterMoves _palette _waitOn _heapLean _said
        _sayWaiters wheelSayStats _warmGen _fills _landsVer`,
      zone: `
        _w _initP _info _grid _blocks _rowsMade _overview _overviewLands _pending _warm _filling _here
        _hereAsked _under _failP _retryAt _retryWait _local`,
    },
    'game/worldTrial.js': {
      never: `
        WHEEL _on _mode _spawnOff _wayBack _hudOn _wheelAwayAt _readyGen _hud _hudAt`,
      zone: `
        _ready _arriveAt _lastSurface`,
    },
    'game/xpBar.js': { never: '_listeners' },
    'game/zoneTransitions.js': { never: '_townFreeTimer', zone: '_zoneLoadEl' },
    'networking/broWallet.js': { never: 'state listeners', rejoin: '_pending' },
    'networking/charRoster.js': { never: '_lookAsked _mirrorSeeded' },
    'networking/gameEvents.js': { never: '_peerShotGame _collisionNames' },
    'networking/rosterCookie.js': { never: '_probedHost _domain' },
    'networking/serverReady.js': { never: '_subs _installed', rejoin: '_state _waiters _veil _veilTimer' },
    'rendering/arenaWorld.js': { zone: '_live' },
    'rendering/arrowPin.js': { never: '_frameBytes _frames' },
    'rendering/arrowWound.js': { never: '_renderer' },
    'rendering/batchIdsLean.js': { never: '_stats' },
    'rendering/bindGroupFix.js': { never: '_installed _swaps' },
    'rendering/blockArm.js': { never: '_sheets _cache _sleeveCache _peerArmCache' },
    'rendering/bodyBake.js': { never: '_stats _dead _seq _started _pool _watchT _line' },
    'rendering/bodyBakeWorker.js': { never: '_line' },
    'rendering/bodyRecolor.js': { never: '_eyeT _garmentLeft _pickWoodKept _toolSolid _bakeTag' },
    'rendering/buildingFire.js': { zone: '_liveFires' },
    'rendering/campfireFx.js': { never: '_atlas _fireSerial' },
    'rendering/canvasWitness.js': { never: '_w _last' },
    'rendering/capeSprites.js': { never: '_sets' },
    'rendering/characterPortrait.js': { never: '_imgCache _metaCache _bodyTopsPromise' },
    'rendering/chestPreload.js': { never: '_held _p' },
    'rendering/coinPileArt.js': { never: 'TEX _p' },
    'rendering/deathCrumble.js': { never: '_shake' },
    'rendering/depthSort.js': { never: '_keys _probe' },
    'rendering/drawLists.js': { never: '_root' },
    'rendering/dropIcons.js': { never: 'icons' },
    'rendering/elemWindup.js': { never: '_cells' },
    'rendering/farmWorld.js': { never: '_gen farmArtStats', zone: '_tex _sheets _loadP _ready _live' },
    'rendering/fieldLean.js': { never: '_stats _done' },
    'rendering/fighterCapture.js': { never: '_effects _entities _films' },
    'rendering/fillBatch.js': { never: '_on _urlOff _pinned _built _shader _maxTex' },
    'rendering/fireGoblinSprites.js': {
      zone: `
        walkSheets attackSheets hitSheets deathFrames remnantsTex fireballTex loadPromise`,
    },
    'rendering/footprintSprites.js': { never: 'FOOTPRINT_ART', zone: '_frames' },
    'rendering/formShade.js': { never: '_on _count _refreshed', zone: '_figs' },
    'rendering/fxStrips.js': { never: 'PORTAL_BEAM _pending' },
    'rendering/gearCatalog.js': { never: '_stores' },
    'rendering/gearLookFrame.js': { never: '_stats _waitFrom' },
    'rendering/gearNumbers.js': { never: '_sheets _frames _stats' },
    'rendering/gearSheets.js': {
      never: `
        _sheets _gearRetryOn _gaveUp _gearRound _trimStats _gearLine _gearPlay _gearT0 _fxTrimStats
        _fxTrimFrames _bodyTrimStats _bodyTrimFrames _sheetLoads _shirtOnWay _artSeen _artTick _preloadSkip
        _skipDecided _extraSources _drawnElsewhere _upStats`,
    },
    'rendering/gearWalkFrame.js': { never: '_stats _waitFrom' },
    'rendering/gfxLean.js': { never: '_stats' },
    'rendering/gpuOnly.js': { never: '_n _bytes _onceN _onceBytes' },
    'rendering/grottoFx.js': { zone: '_live _swayers' },
    'rendering/hairClip.js': { never: '_alpha _installed _maxTex _stats _shader _alphaShader', zone: '_boxes' },
    'rendering/headFrames.js': { never: '_hf _oth _box _boxAt _px' },
    'rendering/heapTrim.js': { never: '_on' },
    'rendering/heldNumbers.js': { never: '_pending _held _heldBytes _numberBytes _many _refills _reads _readsBy _installed' },
    'rendering/hemiBust.js': { never: '_layers _loading _choice _cache _stats _css' },
    'rendering/hitMaterialFx.js': { never: 'ART _atlas _chipCache _softPuff _softShadow', zone: '_propChips' },
    'rendering/hotArrowFx.js': { never: 'ART' },
    'rendering/keepAsImage.js': { never: '_on _stats' },
    'rendering/landAuras.js': { never: '_live', zone: '_tex' },
    'rendering/layerUniforms.js': { never: '_installed _all _empty _pushed _shared' },
    'rendering/levelUpBurstNumbers.js': { never: '_frames _opening _listeners _set _first _stats _scratch _users' },
    'rendering/levelUpBurstPreload.js': { never: '_stopPortraitWatch _portraitHeld' },
    'rendering/lightfx/casters.js': { never: '_worldCasts' },
    'rendering/lightfx/glint.js': { never: '_warmFilters _warmStats _sheen _chain' },
    'rendering/lightfx/lightFx.js': { never: '_on' },
    'rendering/lightfx/shadows.js': { never: '_lockOn _prepassOn _noSnapOn _unsnapped _shadeProgram _chain _systems' },
    'rendering/lightfx/sheenBatch.js': { never: '_urlOff _passAll _built _packed _shader _installed' },
    'rendering/lookArmour.js': {
      never: `
        _stats _layout _rows _src _free _books _mlooks _baker _sweepAt _sweepTimer _sent _fetchStats _qaHashes`,
    },
    'rendering/lookFolk.js': { never: '_stats _face' },
    'rendering/lookPalette.js': {
      never: `
        _why _sets _sheets _loading _settled _ok _stats _pages _dirData _dirN _dirSrc _maskSource _inPrewarm
        _looks _sweepAt _kinds _built _shader _sheenShader _okSheen _patched _prewarmedFor`,
    },
    'rendering/lookSets/gear.js': { never: 'SHEETS' },
    'rendering/lookSets/gearwalk.js': { never: 'SHEETS' },
    'rendering/lookSets/standin.js': { never: 'FRAME' },
    'rendering/lookSets/standinlegs.js': { never: 'GREAVES' },
    'rendering/lookSets/weapons.js': { never: 'SHEETS' },
    'rendering/lookShirtFrame.js': { never: '_dress _hashes' },
    'rendering/lootIcons.js': { never: 'LOOT_ICONS _p _beam' },
    'rendering/maskedBake.js': { never: '_medB _medG _medR' },
    'rendering/maskedBakeWorker.js': { never: 'lookSheets rod _tables _bms pending' },
    'rendering/monsterDeathFx.js': { never: '_renderer _covCache' },
    'rendering/monsterDeathZonesFx.js': { never: '_freed _made', zone: '_live' },
    'rendering/monsterRecolor.js': { zone: '_cache' },
    'rendering/monsterShotFx.js': { never: '_atlas _atlasPromise' },
    'rendering/monsterSilhouette.js': { never: '_on' },
    'rendering/monsterVariantSprites.js': { zone: '_variantLoadKicked _kicksOn' },
    'rendering/mummySprites.js': { zone: 'walkSheets transformFrames loadPromise' },
    'rendering/nftAvatars.js': { never: 'cache loading' },
    'rendering/nodeLabels.js': { never: 'NODE_LABEL_ICONS NODE_LABEL_ICONS_GRAY _p' },
    'rendering/npcSprites.js': {
      never: `
        _done`,
      zone: `
        _tex _walk _wheelWalk _propAnim _town _townReady _townUnload _townKeys _townCrops _townAnimIds _wheelTex
        _wheelArt`,
    },
    'rendering/p256.js': { never: '_stats _decided _toPack _packed _pk _upInstalled _timer' },
    'rendering/paletteDraw.js': { never: '_thumbs' },
    'rendering/paletteLoad.js': { never: '_idle _seq _w _wait stats _t0' },
    'rendering/paletteTex.js': {
      never: `
        _renderer _ok _stats _live _atlas _batchShader _clipBatchShader _oneWanted _oneRoute _oneOk _oneStats
        _oneR _oneShader _patched _meshShader _fillBatchShader`,
    },
    'rendering/petSprites.js': { never: '_tex _loading _frames' },
    'rendering/picsNumbers.js': { never: '_stats _warm', zone: '_live _rows' },
    'rendering/picsOnce.js': { never: '_stats _released _loading _restorers _installed _timer _renderer' },
    'rendering/pixiRenderer.js': { never: '_headFrames _appRef _playerGround _groundKeep _depthProbe _camSnapOff _camProbe' },
    'rendering/playerAnchors.js': { never: 'anchors weaponHandles loadPromise' },
    'rendering/playerDeathSprites.js': { never: 'state' },
    'rendering/playerSkins.js': {
      never: `
        _bodySheets _buildSink _fishFollows _pickupHeadSheets _headTrimStats _headTrimFrames _artPrewarmT`,
    },
    'rendering/playerSprites.js': { never: 'manifest loadPromise' },
    'rendering/propGround.js': { never: '_canvas _ctx _budgetFrame' },
    'rendering/quietClear.js': { never: '_installed _skipped' },
    'rendering/renderHeal.js': { never: '_heals' },
    'rendering/rideFx.js': { never: '_tex' },
    'rendering/rockGolemSprites.js': { zone: 'walkFrames deathFrames loadPromise' },
    'rendering/rotcapSprites.js': { zone: 'walkFrames deathFrames loadPromise' },
    'rendering/sharpPixels.js': { never: '_enabled _maxTex _routed _urlOff _figRound _shader _figureSpec _sheenName' },
    'rendering/shieldSprites.js': { never: 'SHEETS loadPromise _set' },
    'rendering/skeletonSprites.js': { zone: 'runSheets deathFrames remnantsTex loadPromise' },
    'rendering/slimeSprites.js': { never: 'loadPromise' },
    'rendering/snowmanSprites.js': {
      zone: `
        SHEETS ATTACK_SHEETS remnantsTex hitFrames deathFrames loadPromise snowballTex PHASE_SHEETS`,
    },
    'rendering/sootMarks.js': { never: '_tex' },
    'rendering/staffCastFx.js': { never: '_genRamps _charge _gp _glowTex _sqTex _boltOut' },
    'rendering/standInGarb.js': { never: '_mine _mineRaw' },
    'rendering/standIns.js': { never: '_gen _make _st _peerCheck' },
    'rendering/statDemoPreload.js': { never: '_held _blueBaked _blueBaking _warm' },
    'rendering/stormEyeSprites.js': { zone: 'viewFrames deathFrames loadPromise' },
    'rendering/stormSparksFx.js': { never: '_cells', zone: '_wanted' },
    'rendering/stripRead.js': { never: '_dead _idle _seq _w _wait _stats _line' },
    'rendering/systems/ambientFx.js': { never: '_TEX' },
    'rendering/systems/bowFeelFx.js': { never: '_last _drawn' },
    'rendering/systems/effectsRenderer.js': {
      never: `
        _fxPreload _combatTrimStats _combatTrimFrames _standInTrimStats _standInTrimFrames _farmCrownMid
        _standInLegsUse _fireLogWood _capeProbe _standInTints POPUP_ICONS SHARD_ICONS MAGIC_BOLT_FRAMES _trapArt
        ARROW_PINE JET_STREAM _DEBRIS_DOT_TEX ARROW_BLAST _arrowBlastLoad _PROP_SLASH_TEX _SPLINTER_TEX
        _HARD_DOT_TEX _GROUND_DECAL_TEX NODE_SPRITE_TEX TREE_TEX ORE_TEX ORE_ICON_TIER_TEX ORE_ICON_TEX
        _dmgBmpReady _dmgFontSig _dmgPagesGone _chatBubbleGrad _bubbleGrads _hexMemo _bakeFrame SMITH_ANVIL`,
      zone: `
        SNOWBALL_BURST _snowballBurstLoad`,
    },
    'rendering/systems/entityRenderer.js': {
      never: `
        STATUS_TO_ELEMENT SPAWN_WHITE_FILTER _propsDrawn _fgDrawn _entityLayerRef _frontLayerRef _selfDisplayRef
        _traitCache _traitRetryOn _looksRetryOn _headWatch _bodyAnchors _bodyTops _bodyDataPromise
        _bodyDataRounds _folkHatDy256 _qaHatDy256 _crownOverride _lastGearDisplay _lastWeaponSprite _bodyArtMemo
        _regionTexCache _bandTexCache _maskedBodyCache _spareSkipped _bakeSeq _bakeWorker _bakeWorkerDead
        _rodSent _bakeJobs _bakeWorkerStats _bakeQueue _bakeByKey _bakeBusy _bakeStartedAt _lookSheetsHere
        _localBakeStats _maskedFails _localMisses _localEpoch _localMissKey _peerBakeStats _peerPending
        _peerRunning prewarmProgress _localBakeDir _ownedRpg _ownedAt _ownedSig _uploadedSources
        _prewarmRenderer _altPrewarmSeq _equipPrewarmTimer _equipPrewarmRunning _equipPrewarmAgain _fishTopCache
        _FISH_GRIP_TROUSERS _hairMaskCache _lastHairDisplay _standInHairClip _monsterDisplaysRef _traitTex
        _mannequinTex _traitMeta _traitLoadStarted _broBadgeTex _broBadgeSet _smallTexHeld _smallSet _pinTexHeld
        _pinSet _plateWorldScale _cueZoom`,
      zone: `
        _npcDrawn _lastPeerWeaponSprite _peerQueue`,
    },
    'rendering/systems/minimapRenderer.js': { never: '_propMarks _allMarks' },
    'rendering/systems/staffFeelFx.js': { never: '_st' },
    'rendering/systems/tileRenderer.js': { never: '_footTex _liveTileRenderers' },
    'rendering/systems/weaponFeelFx.js': { never: '_drawers _live' },
    'rendering/textRelease.js': { never: '_installed _stats' },
    'rendering/texturePoolTrim.js': { never: '_installed _stats' },
    'rendering/tiledMaps.js': { never: '_walkPromise _maps _images _tilesetPromises _mapPromises', zone: '_residentZoneMaps' },
    'rendering/toolRecolor.js': { never: '_rod' },
    'rendering/traitThumbs.js': { never: '_warmed _imgs' },
    'rendering/traits/artOps.js': { never: '_docs' },
    'rendering/traits/buildCatalog.js': { never: '_height _frame _listeners' },
    'rendering/traits/capeCatalog.js': { never: '_listeners _active' },
    'rendering/traits/designCatalog.js': { never: '_seenId _seenName' },
    'rendering/traits/eyeColorCatalog.js': { never: '_active _listeners' },
    'rendering/traits/eyeStyleCatalog.js': { never: '_active _listeners' },
    'rendering/traits/eyeStyleColorCatalog.js': { never: 'EYE_STYLE_PAINTS _cache _refCache _building _probeBakes' },
    'rendering/traits/eyewearCatalog.js': { never: '_active _listeners' },
    'rendering/traits/eyewearColorCatalog.js': {
      never: `
        EYEWEAR_PAINTS EYEWEAR_COLOR_EXCLUDE _active _listeners OMITS _cache _refCache _building`,
    },
    'rendering/traits/facialHairCatalog.js': { never: '_active _listeners' },
    'rendering/traits/facialHairColorCatalog.js': { never: '_active _listeners _cache _building' },
    'rendering/traits/hairCatalog.js': { never: '_active _listeners' },
    'rendering/traits/hairColorCatalog.js': { never: '_active _listeners _cache _building' },
    'rendering/traits/hatColorCatalog.js': { never: 'HAT_COLOR_EXCLUDE _active _listeners _cache _refCache _building' },
    'rendering/traits/headLook.js': { never: '_maps _stats _forceOld' },
    'rendering/traits/headwearCatalog.js': { never: '_active _listeners' },
    'rendering/traits/patternCatalog.js': { never: '_BY_ID _active _listeners' },
    'rendering/traits/playerArt.js': { never: '_active _listeners _slots' },
    'rendering/traits/shirtCatalog.js': { never: '_active _listeners' },
    'rendering/traits/shirtColorCatalog.js': { never: '_active _listeners _cache' },
    'rendering/traits/speciesArt.js': { never: '_art _artReady _builds _canvases _speciesStats _retryOn _lastSweep' },
    'rendering/traits/speciesCatalog.js': { never: '_active _listeners' },
    'rendering/traits/traitMaterials.js': { never: 'MAIN_MATERIAL' },
    'rendering/warmOnce.js': { never: '_on' },
    'rendering/waterAttackFx.js': { never: '_cells', zone: '_wanted' },
    'rendering/waterFrogSprites.js': { zone: 'idleSheets hopSheets attackSheets deathFrames loadPromise' },
    'rendering/weaponLookFrame.js': { never: '_stats _waitFrom' },
    'rendering/weaponSprites.js': { never: 'SHEETS loadPromise _set _softened' },
    'rendering/wheelBuildingIcons.js': { zone: '_canvas _grey _tex _loading _live' },
    'rendering/wheelDoors.js': { never: '_picVer _liveDoors', zone: '_pics' },
    'rendering/wheelGround.js': { zone: '_liveGround' },
    'rendering/wheelLife.js': { never: '_flagStats', zone: '_flagCuts _flags _tex' },
    'rendering/wheelMonsterArt.js': { never: 'wheelArtStats _curZone _gen _lastTick', zone: '_zone _waitSince _looks' },
    'rendering/wheelObjects.js': {
      never: `
        _pwSeq _basesStats _basesWorst _loading _pageLog _gen _bottomsLeft _castFrame`,
      zone: `
        _idx _pw _pwWait _pages _live _bottoms`,
    },
    'rendering/wheelShatter.js': { zone: '_puff' },
    'rendering/wheelSignposts.js': { zone: '_icons _iconsLoading _live _found' },
    'rendering/wheelWater.js': {
      never: `
        _webAll _allProgram _program _palAllProgram _palProgram _uni _renderer _ok _liveOff _held _cover _stats
        _uniformTex`,
      zone: `
        _live`,
    },
    'rendering/worldFx.js': { never: 'ZONE_AIR PROP_LIGHTS _groundCache' },
    'rendering/worldFxTextures.js': { never: '_tex' },
    'rendering/worldLife.js': { never: 'FX PART _ready FG_SWAY FALLS SMOKE SPARKS_EXTRA' },
    'rendering/zoneBannerPreload.js': { never: '_failAt _stats _near _lastTick', zone: '_held _inflight _want' },
    'rendering/zoneTextures.js': {
      never: `
        _gen _readStats _play _line _sliceT0 _waiting _slices _stripStats _verify`,
      zone: `
        _bundles _crops`,
    },
    'ui/BroTown.jsx': { never: 'BT_AUDIO' },
    'ui/DeviceScreen.js': { never: 'el' },
    'ui/LevelUpBurst.jsx': { never: '_lastSting' },
    'ui/LingerScreen.js': { rejoin: 'el timer nextAt' },
    'ui/OriginScreen.js': { never: 'el' },
    'ui/PlayerIcon.jsx': { never: 'PORTRAIT_CACHE PORTRAIT_INFLIGHT' },
    'ui/RoomFullScreen.js': { rejoin: 'el timer nextAt attempts' },
    'ui/WorldMapOverlay.jsx': { never: '_pinImgs _openMap _toggleMap' },
    'ui/XpFlyOverlay.jsx': { never: '_landAB _landT' },
    'ui/afterFrame.js': { never: '_fns _ranAt' },
    'ui/deskTeach.js': {
      never: `
        _getS _t _timer _who _tipsEl _toastEl _cursorOn _encUntil _lastMouse _tipsUntil _toastUntil qa`,
      zone: `
        _edgeEl _keyEl _labelEl _rings _armed _nextEnc`,
    },
    'ui/guideArrow.js': {
      never: `
        _pace _bob _el _label _side _timer _seen _swapFrom _done _lastTick _who qa _followS _followAt
        _stopFollow`,
    },
    'ui/lazyPanel.js': { never: '_loaded _failed _named _cards' },
    'ui/levelUpBursts.js': { never: 'slots seq listeners seen' },
    'ui/levelUpIcons.js': { never: 'SKILL_ICON SKILL_LABEL' },
    'ui/loadingGate.js': { never: '_worldIn _up _readyAt _timer _waiting qa _introList _veilList' },
    'ui/mapGlyphs.js': { never: '_paths' },
    'ui/mayorScreen.js': { never: '_box _boxAt _cv _ro _wired' },
    'ui/mobile/BottomDashboard.jsx': { never: '_deskOpened' },
    'ui/mobile/ChestReveal.jsx': { never: 'listeners _state _warm' },
    'ui/mobile/DungeonClearHud.jsx': { never: '_held' },
    'ui/mobile/ItemTooltip.jsx': { never: 'toastQueue toastListeners' },
    'ui/mobile/QuestCoach.jsx': { never: '_oversize _cardPressAt' },
    'ui/mobile/aceFlipBus.js': { never: 'listeners' },
    'ui/mobile/actionBus.js': { never: '_cycleWeapon _selectSlot' },
    'ui/mobile/bandSideways.js': { never: '_side _started' },
    'ui/mobile/blockRingBus.js': { never: 'listeners', death: 'state blockRingBus' },
    'ui/mobile/capeStatusBus.js': { never: 'listeners', rejoin: 'capeStatusBus' },
    'ui/mobile/chatBubbleBus.js': { never: 'listeners' },
    'ui/mobile/chatLogBus.js': { never: 'listeners' },
    'ui/mobile/controlsTutorialBus.js': { never: '_open listeners' },
    'ui/mobile/dash/BoardRow.jsx': { never: 'FACES _faceLine _faceT0' },
    'ui/mobile/dash/InventoryPanel.jsx': { never: 'ITEM_NAMES _lastBagTab' },
    'ui/mobile/dash/ItemDetailPopup.jsx': { never: 'SMELT_ORE_TO_BAR' },
    'ui/mobile/dash/LeaderboardPanel.jsx': { never: 'lastCat' },
    'ui/mobile/dash/QuestsPanel.jsx': { never: 'lastPick' },
    'ui/mobile/dash/T2Panel.jsx': { never: '_pendingCat' },
    'ui/mobile/dash/bagFilterBus.js': { never: '_filter subs bagFilterBus' },
    'ui/mobile/dash/bagLife.js': { never: 'stats _timer _users' },
    'ui/mobile/dash/bagModel.js': { never: 'clk itemStamp prevCount stashStamp' },
    'ui/mobile/dash/gearTabBus.js': { never: 'state subs' },
    'ui/mobile/dash/inventoryLocks.js': { never: 'locks listeners' },
    'ui/mobile/dash/itemDetailBus.js': { never: 'state listeners' },
    'ui/mobile/dash/spendConfirmBus.js': { never: 'state listeners' },
    'ui/mobile/dashMinBus.js': { never: 'listeners dashMinBus' },
    'ui/mobile/dashboardPanelBus.js': { never: 'listeners dashboardPanelBus' },
    'ui/mobile/eatBus.js': { never: 'listeners' },
    'ui/mobile/farmBus.js': { never: 'listeners' },
    'ui/mobile/firemakingBus.js': { never: 'listeners' },
    'ui/mobile/gearFlash.js': { never: '_timer _lit' },
    'ui/mobile/infoPopupBus.js': { never: '_open listeners' },
    'ui/mobile/inspectCardBus.js': { never: 'listeners state' },
    'ui/mobile/installHintBus.js': { never: 'listeners' },
    'ui/mobile/inventoryBus.js': { never: 'listeners state inventoryBus' },
    'ui/mobile/mockItems.js': { never: 'seq' },
    'ui/mobile/modalGuardBus.js': { never: '_depth _listeners _muted' },
    'ui/mobile/notifBus.js': { never: 'listeners notifBus' },
    'ui/mobile/placeName.js': { zone: '_lastLand' },
    'ui/mobile/playViewport.js': { never: '_ro _roEl _sh _sw _vh _vw _wired _sizes' },
    'ui/mobile/sheet/BroCard.jsx': { never: '_pick' },
    'ui/mobile/sheet/HeroExpanded.jsx': { never: '_lastSection _lastFam' },
    'ui/mobile/sheet/StatCaption.jsx': { never: '_ctx' },
    'ui/mobile/sheet/StatDemo.jsx': { never: '_kicks' },
    'ui/mobile/sheet/bagUnseenModel.js': { never: 'UNSEEN epoch listeners bagUnseen' },
    'ui/mobile/sheet/friendPortraits.js': { never: 'cache' },
    'ui/mobile/sheet/friendsModel.js': { never: 'liveAt' },
    'ui/mobile/sheet/friendsSync.js': { never: 'listeners openThread lastError', rejoin: 'doc' },
    'ui/mobile/sheet/heroSectionBus.js': { never: '_pending listeners heroSectionBus' },
    'ui/mobile/sheet/motion.js': { never: '_mq' },
    'ui/mobile/sheet/portraitStore.js': { never: 'url listeners portraitStore' },
    'ui/mobile/sheet/questDetailBus.js': { never: 'id' },
    'ui/mobile/sheet/skillDetailBus.js': { never: 'key openEpoch consumedEpoch listeners' },
    'ui/mobile/sheet/slimePins.js': { never: '_fd _loading _sets' },
    'ui/mobile/shopBus.js': { never: 'listeners' },
    'ui/mobile/storeChatBus.js': { never: 'listeners' },
    'ui/mobile/storeToastBus.js': { never: 'listeners items seq storeToastBus' },
    'ui/mobile/tradeBagBus.js': { never: 'listeners' },
    'ui/mobile/uiBusyBus.js': { never: 'listeners uiBusyBus' },
    'ui/mobile/wheelBus.js': { never: 'listeners state' },
    'ui/onboardingPace.js': {
      never: `
        _skipped _worldInAt _coachUp _coachEndAt _welcomeEndAt _welcomePending _firstStepsOpen _inTutorial`,
    },
    'ui/panels/AchievementBanner.jsx': { never: '_icons' },
    'ui/panels/TradeWindowPanel.jsx': { never: '_tradeSide' },
    'ui/panels/WeaponPill.jsx': { never: '_qaTapMs qa' },
    'ui/panels/buildings/TownBoard.jsx': { never: 'THUMB_FIT' },
    'ui/panels/controlSkin.jsx': { never: 'WEAPON_KEYS' },
    'ui/panels/paintTools.js': { never: '_ink _brush _listeners' },
    'ui/petPortrait.jsx': { never: '_img _imgReady' },
    'ui/reveal/revealBus.js': { never: '_queue _notify revealBus' },
    'ui/starCue.js': { never: 'lastKey live qa' },
    'ui/swallowTapClick.js': { never: '_armed _off _bound _qa' },
    'ui/uiSfxDelegate.js': { never: 'installed' },
    'ui/wheelMiniSize.js': { never: '_at _k' },
    'ui/worldMapDetail.js': { never: '_tiles _loading _gen _frame _stats' },
    'ui/xpLanding.js': { never: '_state _cards' },
    'ui/zoneBannerOverlay.js': { never: '_el _timers _lastShown _beatLog', zone: '_playing _lastZone _wl' },
  },
};
const MACHINES = {
  life: `
    _deathCard _deathStart _dying`,
  zone: `
    _spawnToWheel currentZone data/gameSystems.js:COLS data/gameSystems.js:ROWS data/gameSystems.js:TOWN_H
    data/gameSystems.js:TOWN_W ui/zoneBannerOverlay.js:_lastZone`,
  duel: `
    _activeDuel _inDuel`,
  trade: `
    _t2DoneWatch _t2Leave _t2Live _t2QuietUntil`,
  party: `
    _party`,
  harvest: `
    _extraction _nearNode _proxNode`,
  guard: `
    _blockPose _shieldAngle _shieldAutoReleased _shieldCdUntil _shieldKb _shieldMouse _shieldStamina
    _shieldUp shieldActive shieldEnd ui/mobile/blockRingBus.js:blockRingBus ui/mobile/blockRingBus.js:state`,
  dungeon: `
    _customDungeonConfig _customDungeonTerrain _dungeonBack _dungeonBossSpawned _dungeonClear
    _dungeonComplete _dungeonDepth _dungeonEnteredAt _dungeonMaxWaves _dungeonWave _dungeonZone
    _inCustomDungeon _inDungeon _preDungeonMap _preDungeonMonsters _preDungeonNodes _preDungeonPos
    _serverDungeon _wheelDungeonOpening`,
  arena: `
    _arenaInvolved _arenaMatch _arenaStakeBoard _arenaTournamentId`,
  fishing: `
    fishTimer`,
  connection: `
    _authRejects _frozenByAdmin _httpToken _joinId _joinKey _joinRejectedFatal _joinedId _keyFellBack
    _keyIdAsked _netHold _realtimeStatus _tabClaim _tabMoved _verifyToken channel
    networking/serverReady.js:_state networking/serverReady.js:_veil networking/serverReady.js:_veilTimer
    networking/serverReady.js:_waiters ui/DeviceScreen.js:el ui/LingerScreen.js:el ui/LingerScreen.js:nextAt
    ui/LingerScreen.js:timer ui/OriginScreen.js:el ui/RoomFullScreen.js:attempts ui/RoomFullScreen.js:el
    ui/RoomFullScreen.js:nextAt ui/RoomFullScreen.js:timer`,
  loading: `
    __introLiftedAt __introLiftedZone _avatarArtHold _bodyPlaceDue _farmArtHold _townArtHold _wheelTripVeil
    _zoneLoading game/worldTrial.js:_ready game/zoneTransitions.js:_zoneLoadEl
    rendering/systems/effectsRenderer.js:_fxPreload rendering/systems/entityRenderer.js:prewarmProgress
    rendering/tiledMaps.js:_residentZoneMaps ui/loadingGate.js:_readyAt ui/loadingGate.js:_up
    ui/loadingGate.js:_waiting ui/loadingGate.js:_worldIn`,
  window: `
    _miningOpen _npcProxLatch _uiBusy game/dailyRewards.js:_win game/loginSpinWheel.js:_st
    ui/mobile/ChestReveal.jsx:_state ui/mobile/controlsTutorialBus.js:_open
    ui/mobile/dash/itemDetailBus.js:state ui/mobile/dash/spendConfirmBus.js:state
    ui/mobile/dashboardPanelBus.js:dashboardPanelBus ui/mobile/infoPopupBus.js:_open
    ui/mobile/inspectCardBus.js:state ui/mobile/inventoryBus.js:inventoryBus ui/mobile/inventoryBus.js:state
    ui/mobile/modalGuardBus.js:_depth ui/mobile/sheet/friendsSync.js:openThread
    ui/mobile/sheet/heroSectionBus.js:_pending ui/mobile/sheet/heroSectionBus.js:heroSectionBus
    ui/mobile/uiBusyBus.js:uiBusyBus ui/mobile/wheelBus.js:state`,
};
/* SUGGESTED:END */
const WORDS = new Set(['never', 'zone', 'death', 'rejoin']);
const okWord = (w) => w.split('+').every((x) => WORDS.has(x));
const SUG_FIELD = new Map(), SUG_VAR = new Map();
for (const [word, names] of Object.entries(SUGGESTED.fields)) {
  if (!okWord(word)) { console.error('state-census: SUGGESTED.fields has a word that is not one of the four: ' + word); process.exit(2); }
  for (const n of names.split(/\s+/).filter(Boolean)) SUG_FIELD.set(n, word);
}
for (const [file, words] of Object.entries(SUGGESTED.vars)) {
  for (const [word, names] of Object.entries(words)) {
    if (!okWord(word)) { console.error('state-census: SUGGESTED.vars has a word that is not one of the four: ' + word); process.exit(2); }
    for (const n of names.split(/\s+/).filter(Boolean)) SUG_VAR.set('src/' + file + '\n' + n, word);
  }
}
let unjudged = 0;
const usedSug = new Set();
for (const r of fieldRows) {
  r.reset = SUG_FIELD.get(r.name) || '?';
  if (r.reset === '?') unjudged++; else usedSug.add('F' + r.name);
}
for (const v of varRows) {
  const k = v.file + '\n' + v.name;
  v.reset = SUG_VAR.get(k) || (v.changed ? '?' : 'never');
  if (v.reset === '?') unjudged++;
  if (SUG_VAR.has(k)) usedSug.add('V' + k);
}
const stale = [...SUG_FIELD.keys()].filter((n) => !usedSug.has('F' + n)).length
  + [...SUG_VAR.keys()].filter((k) => !usedSug.has('V' + k)).length;

/* a suggestion that nothing in the code does today */
function unmet(row) {
  if (row.reset === '?' || row.reset === 'never') return [];
  return row.reset.split('+').filter((w) => !(row.at.includes(w) || (w === 'death' && row.at.includes('zone'))));
}

/* ─── the page ─── */
function listFiles(pairs, max, viaOnly) {
  if (!pairs.length) return '-';
  const names = pairs.slice(0, max).map(([f]) => short(f) + (viaOnly && viaOnly.includes(f) ? '~' : ''));
  const more = pairs.length - names.length;
  return (pairs.length > 1 ? pairs.length + ': ' : '') + names.join(', ') + (more > 0 ? ', +' + more : '');
}
const esc = (t) => String(t).replace(/\|/g, '\\|');

function page() {
  const L = [];
  const fieldsBorn = fieldRows.filter((r) => r.born.how === 'first').length;
  const changedVars = varRows.filter((v) => v.changed);
  const quietVars = varRows.filter((v) => !v.changed);
  L.push('# The state, read: every field of `S` and every top-of-file variable');
  L.push('');
  L.push('v2.3.5030, card D of `docs/GRAND-PLAN.md` (step 5.3\'s census, as a document).');
  L.push('');
  L.push('**This page is made by a machine.** `node tools/dev/state-census.mjs --write` makes it again from the code;');
  L.push('`--check` says whether it is still true; `--json` gives every row with its full lists of files and lines.');
  L.push('Do not edit it by hand: the one hand-made column lives in the script\'s `SUGGESTED` table.');
  L.push('It is a census, not a guard and not a ledger: card U makes the ledger files, a system at a time, from these rows.');
  L.push('');
  L.push('## What counts as a row');
  L.push('');
  L.push('1. **A top-level field of the state object**, written `S.<name>` or through an alias of `S`. A nested path');
  L.push('   (`S.player.x`, `S.rpg.inventory.push(...)`) is its top-level field\'s row.');
  L.push('2. **A variable at the top of a file under `src/` that holds state**: a `let` or `var`, or a `const` Map, Set,');
  L.push('   array or object that is changed after it is made.');
  L.push('');
  L.push('How the machine reads that rule (it reads all ' + FILES.size + ' `.js` and `.jsx` files under `src/` as syntax trees, so a');
  L.push('name in a comment or a string is never counted):');
  L.push('');
  L.push('- **The state** is `<ref>.current`, where `<ref>` is any name or property spelt `stateRef` or `_gameState`');
  L.push('  (`props.stateRef`, `ctx.stateRef`, `window._gameState`).');
  L.push('- **An alias** is: a name given that value (`var S = stateRef.current`, under any name: `S2`, `_S`, `st`); a call');
  L.push('  of a function that returns it (`getState()`), or of a getter handed along (`getS()`); a parameter spelt `S`,');
  L.push('  plain or destructured from a component\'s props; and a parameter or prop of any name that some call the');
  L.push('  machine can follow hands the state to, across files.');
  L.push('  A parameter spelt `S` is NOT the state when every call the machine can follow hands it something plainly');
  L.push('  else (' + REFUTED.size + ' today' + (REFUTED_AT.length ? ': ' + REFUTED_AT.map((x) => '`' + x + '`').join(', ') : '') + ').');
  L.push('- **A write** to a field is one of three kinds, counted apart:');
  L.push('  - *set*: `S.x = v`, `S.x += 1`, `S.x++`, `delete S.x`, `Object.assign(S, { x })`;');
  L.push('  - *inside*: `S.x.y = v`, `S.x[k] = v`, `S.x.push(v)` and the other changing calls (`pop shift unshift splice');
  L.push('    sort reverse fill copyWithin set add delete clear`), `S.x.length = 0`, `Object.assign(S.x, ...)`;');
  L.push('  - *through a name for the inside* (a file marked `~`): `var p = S.player; p.x = 1`; a loop\'s or a callback\'s');
  L.push('    element (`for (const m of S.monsters) m.hp = 0`); a parameter that a followed call hands an inside to.');
  L.push('    This kind is a "may write": the machine does not follow the order of statements.');
  L.push('- **A read** is any other `S.<name>`. A read that only feeds a write of the same field (`S.x = S.x || []`,');
  L.push('  `if (!S.x) S.x = []`) is not a reader.');
  L.push('- **A top-of-file variable** is a `let`, `var` or `const` declared at the top level of a module. A `const` is');
  L.push('  a row only when the code changes what it holds (a property written, a changing call, `delete`,');
  L.push('  `Object.assign`), in its own file or in a file that imports it. Every `let` and `var` is a row; the ' + quietVars.length);
  L.push('  that are never changed after they are made (constants written with `var`) are listed apart, by name.');
  L.push('');
  L.push('## The columns');
  L.push('');
  L.push('- **born**: `first` is the state\'s first object (`ui/BroTown.jsx`, `useRef({...})`), with its line; `fly` is a');
  L.push('  field made on the fly, with the first line that sets it in its system\'s file; `never set` is a field the');
  L.push('  code only reads or only changes inside.');
  L.push('- **system (provisional)**: the folder and file. For a field, the file that sets it most (then changes it');
  L.push('  inside most, then reads it most). The system map is card B\'s; this column is a placeholder for it.');
  L.push('- **written by / read by**: the number of files when more than one, then the files (paths under `src/`),');
  L.push('  most touches first; `+n` is the rest (`--json` has them all).');
  L.push('- **marks** (marked, not judged):');
  L.push('  - `2+` written (set or changed inside) from two or more files; `2+~` only when writes through a name for');
  L.push('    the inside are counted;');
  L.push('  - `no-read` nothing under `src/` reads it; `no-read (tests)` the same, but a file under `tools/` or');
  L.push('    `server/test/` names it (the QA probes read `window._gameState`);');
  L.push('  - `no-set` nothing sets it: it is read, or changed inside, and never made;');
  L.push('  - `phase` it looks like a state machine\'s one field (step 5.3b): it is set to, or compared with, two or');
  L.push('    more different words, or its name ends in Phase, State, Mode, Stage or Status and it has one. The');
  L.push('    phases have a table of their own below;');
  L.push('  - `flag` it is only ever set to true or false: the smallest phase there is, if it is one.');
  L.push('- **written at (today)**: where the code writes it now, read off the code: `zone` (in the block around a');
  L.push('  call of `changeZone()`, or a function that block calls), `death` (around `S._dying = true`, in');
  L.push('  `applyLocalRespawn`, or a function they call), `rejoin` (in `wsClient.js`\'s `case \'state_sync\'`, in');
  L.push('  `rejoinClear`, or a function they call). It says the code runs there, not that the value is cleared.');
  L.push('- **should reset (suggested, not confirmed)**: the one column the machine cannot fill. One of `never` (it');
  L.push('  lives for the sitting), `zone` (it belongs to the place: a death\'s respawn and a dungeon\'s door change');
  L.push('  the zone too), `death` (it belongs to one life), `rejoin` (it is the phone\'s copy of what the worker');
  L.push('  holds, cleared at `state_sync` and said again); two joined by `+` mean both. `?` is a row nobody has');
  L.push('  read yet. These are a reader\'s suggestions for card U\'s ledger, where each is confirmed or changed.');
  L.push('');
  L.push('## The state\'s fields');
  L.push('');
  L.push('| field | born | system (provisional) | written by | read by | marks | written at (today) | should reset (suggested, not confirmed) |');
  L.push('|---|---|---|---|---|---|---|---|');
  for (const r of fieldRows) {
    const born = r.born.how === 'first' ? 'first :' + r.born.line
      : r.born.how === 'fly' ? 'fly ' + (r.born.file === r.system ? '' : short(r.born.file)) + ':' + r.born.line : 'never set';
    L.push('| `' + r.name + '` | ' + born + ' | ' + short(r.system) + ' | ' + esc(listFiles(r.writers, 5, r.viaOnly)) + ' | '
      + esc(listFiles(r.readers, 3)) + ' | ' + (r.marks.join(', ') || '-') + ' | ' + (r.at.join(', ') || '-') + ' | ' + r.reset + ' |');
  }
  L.push('');
  L.push('## The phases (step 5.3b\'s starting list)');
  L.push('');
  L.push('Every row marked `phase`, with the words the code sets it to or compares it with, and how many functions');
  L.push('set it (a phase with one door has one).');
  L.push('');
  L.push('| where | name | the words seen | set in |');
  L.push('|---|---|---|---|');
  for (const r of fieldRows.filter((x) => x.phase)) {
    L.push('| `S` | `' + r.name + '` | ' + esc(r.states.slice(0, 12).join(', ') + (r.states.length > 12 ? ', +' + (r.states.length - 12) : ''))
      + ' | ' + r.setFns.length + (r.setFns.length === 1 ? ': ' + esc(short(r.setFns[0])) : ' functions') + ' |');
  }
  for (const v of varRows.filter((x) => x.phase)) {
    const fns = uniq(v.writes.filter((w) => w.how === 'reassign').map((w) => w.file + ' ' + w.where)).sort();
    L.push('| ' + short(v.file) + ' | `' + v.name + '` | ' + esc(v.states.slice(0, 12).join(', ') + (v.states.length > 12 ? ', +' + (v.states.length - 12) : ''))
      + ' | ' + fns.length + (fns.length === 1 ? ': ' + esc(short(fns[0])) : ' functions') + ' |');
  }
  L.push('');
  L.push('### The plan\'s machines, and what carries each today (suggested, not confirmed)');
  L.push('');
  L.push('Step 5.3b names the state machines to make explicit. Most are not one field today: they are spread over');
  L.push('flags, clocks and objects that no word-rule finds. A reader marked the rows that plainly carry each');
  L.push('(the script\'s `MACHINES` table). A starting list for card L, not a finding.');
  L.push('');
  L.push('| machine | fields of `S` | top-of-file variables |');
  L.push('|---|---|---|');
  let machineStale = 0;
  for (const [m, names] of Object.entries(MACHINES)) {
    const all = names.split(/\s+/).filter(Boolean);
    const fs = [], vs = [];
    for (const n of all) {
      if (n.includes(':')) {
        const [file, name] = n.split(':');
        if (varRows.some((v) => v.file === 'src/' + file && v.name === name)) vs.push('`' + name + '` (' + file + ')'); else machineStale++;
      } else if (fieldRows.some((r) => r.name === n)) fs.push('`' + n + '`'); else machineStale++;
    }
    L.push('| ' + m + ' | ' + (fs.join(' ') || '-') + ' | ' + (vs.join(', ') || '-') + ' |');
  }
  if (machineStale) { L.push(''); L.push('Names in `MACHINES` whose row is gone: ' + machineStale + '.'); }
  L.push('');
  L.push('## The variables at the top of files');
  L.push('');
  L.push('The system (provisional) is the row\'s own file. **what** is how it is declared and what it is made as.');
  L.push('**written by** leaves the row\'s own file out when it is the only writer (`own`).');
  L.push('');
  L.push('| file | line | name | what | written by | read by | marks | written at (today) | should reset (suggested, not confirmed) |');
  L.push('|---|---|---|---|---|---|---|---|---|');
  for (const v of changedVars) {
    const others = v.writers.filter(([f]) => f !== v.file);
    const wr = others.length ? listFiles(v.writers, 4) : 'own';
    const rd = v.readers.length === 0 ? '-' : (v.readers.length === 1 && v.readers[0][0] === v.file ? 'own' : listFiles(v.readers, 3));
    L.push('| ' + short(v.file) + ' | ' + v.line + ' | `' + v.name + '` | ' + v.decl + ' ' + v.init + ' | ' + esc(wr) + ' | ' + esc(rd) + ' | '
      + (v.marks.join(', ') || '-') + ' | ' + (v.at.join(', ') || '-') + ' | ' + v.reset + ' |');
  }
  L.push('');
  L.push('### `let` and `var` never changed after they are made');
  L.push('');
  L.push('Rows by the rule, constants in fact (' + quietVars.length + '): nothing reassigns them and nothing changes what they hold.');
  L.push('should reset: `never`, by machine.');
  L.push('');
  const quietBy = new Map();
  for (const v of quietVars) { if (!quietBy.has(v.file)) quietBy.set(v.file, []); quietBy.get(v.file).push(v.name); }
  for (const [file, names] of quietBy) L.push('- ' + short(file) + ': ' + names.map((n) => '`' + n + '`').join(' '));
  L.push('');
  L.push('## Suggested to reset where nothing writes it today');
  L.push('');
  L.push('Rows whose suggestion names an edge at which the code does not write them today (a `death` suggestion is');
  L.push('met by a write at a zone change, since a respawn changes the zone). A list to look at, not a list of');
  L.push('faults: a timestamp that runs out by itself needs no reset, and some are cleared by a road the machine');
  L.push('does not call an edge (a dungeon\'s end, a window closing).');
  L.push('');
  const un = [];
  for (const r of fieldRows) { const u = unmet(r); if (u.length) un.push('| `S.' + r.name + '` | ' + short(r.system) + ' | ' + r.reset + ' | ' + (r.at.join(', ') || '-') + ' |'); }
  for (const v of varRows) { const u = unmet(v); if (u.length) un.push('| `' + v.name + '` | ' + short(v.file) + ':' + v.line + ' | ' + v.reset + ' | ' + (v.at.join(', ') || '-') + ' |'); }
  if (un.length) {
    L.push('| name | system or file | suggested | written at (today) |');
    L.push('|---|---|---|---|');
    for (const x of un) L.push(x);
  } else L.push('None.');
  L.push('');
  L.push('## What the machine cannot follow');
  L.push('');
  const escBy = new Map();
  for (const e of ESCAPES) { const k = e.kind; if (!escBy.has(k)) escBy.set(k, []); escBy.get(k).push(e); }
  L.push('- **The state handed whole to something it cannot resolve** (' + ESCAPES.length + ' places). Most are a renderer\'s');
  L.push('  `x.update(S, ...)`, and the method on the other side takes it as a parameter spelt `S`, so the name rule');
  L.push('  still reads it. By kind:');
  for (const [k, list] of [...escBy].sort((a, b) => b[1].length - a[1].length || cmp(a[0], b[0]))) {
    const files = byCount(list);
    L.push('  - ' + k + ': ' + list.length + ' (' + listFiles(files, 4) + ')');
  }
  L.push('- **`S[key]` with a key made at run time** (' + DYNAMIC.length + ' places, ' + DYNAMIC.filter((d) => d.write).length + ' of them a write): '
    + uniq(DYNAMIC.map((d) => short(d.file) + ':' + d.line)).join(', ') + '.');
  if (WHOLE.length) L.push('- **The whole state replaced or merged with keys not written out** (' + WHOLE.length + '): ' + WHOLE.map((d) => short(d.file) + ':' + d.line).join(', ') + '.');
  L.push('- **A write inside a field after its object went somewhere unfollowed**: an object put in a list, kept on');
  L.push('  another object, or handed to a method of a class the machine cannot name (`this._fx.update(m)`).');
  L.push('- **Anything outside `src/`**: the QA harness reads and writes `window._gameState` from `tools/qa/`; a field');
  L.push('  marked `no-read (tests)` is one it names.');
  L.push('- **State that is not a row by the rule**: values kept on `window.*`, in React `useState`/`useRef`, on class');
  L.push('  instances and on the things inside a field (a monster\'s own `_spawnFxAt`: `game/monsterCarry.js` keeps');
  L.push('  that list).');
  L.push('');
  L.push('## The counts');
  L.push('');
  const w2set = fieldRows.filter((r) => r.setFiles.length >= 2).length;
  const w2 = fieldRows.filter((r) => r.rootedFiles.length >= 2).length;
  const w2via = fieldRows.filter((r) => r.rootedFiles.length + r.viaOnly.length >= 2).length;
  const inRendering = (s) => s.file.startsWith('src/rendering/');
  const rSets = fieldRows.reduce((n, r) => n + r.sets.filter(inRendering).length, 0);
  const rIns = fieldRows.reduce((n, r) => n + r.ins.filter(inRendering).length, 0);
  const rVias = fieldRows.reduce((n, r) => n + r.vias.filter(inRendering).length, 0);
  const rFields = fieldRows.filter((r) => [...r.sets, ...r.ins].some(inRendering)).length;
  const constRows = changedVars.filter((v) => v.decl === 'const').length;
  const letRows = varRows.filter((v) => v.decl !== 'const').length;
  const by = (rows, w) => rows.filter((r) => r.reset === w).length;
  const ORDER = ['never', 'zone', 'death', 'rejoin', 'zone+rejoin', 'death+rejoin', '?'];
  const words = uniq([...fieldRows, ...varRows].map((r) => r.reset)).sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
  L.push('The plan\'s part 2 quoted a reviewer\'s numbers. These replace them; each says how it was counted.');
  L.push('');
  L.push('| what | the plan said | counted | how |');
  L.push('|---|---|---|---|');
  L.push('| fields of `S` | about 610 | **' + fieldRows.length + '** | distinct top-level names touched through the state or an alias of it |');
  L.push('| ... born in the first object | "most created on the fly" | ' + fieldsBorn + ' | keys of `useRef({...})` in `ui/BroTown.jsx`; the other ' + (fieldRows.length - fieldsBorn) + ' are made on the fly or never set |');
  L.push('| ... written from two or more files | 146 | **' + w2 + '** | set or changed inside, rooted at the state; ' + w2set + ' counting sets alone, ' + w2via + ' counting writes through a name for the inside too |');
  L.push('| ... that nothing under `src/` reads | not counted | ' + fieldRows.filter((r) => !r.reads.length).length + ' | no read but its own writes; ' + fieldRows.filter((r) => r.marks.includes('no-read (tests)')).length + ' of them are named under `tools/` or `server/test/` |');
  L.push('| ... that nothing sets | not counted | ' + fieldRows.filter((r) => r.born.how === 'never').length + ' | read, or changed inside, and never made |');
  L.push('| ... marked a phase | not counted | ' + fieldRows.filter((r) => r.phase).length + ' | two or more words set or compared (or one, with a phase\'s name); ' + fieldRows.filter((r) => r.flag).length + ' more are flags, only ever set to true or false |');
  L.push('| writes to `S` from `src/rendering/` | 89 | **' + (rSets + rIns) + '** | places: ' + rSets + ' sets and ' + rIns + ' changes inside, over ' + rFields + ' fields; ' + rVias + ' more through a name for the inside |');
  L.push('| top-of-file variables that hold state | about 850 | **' + varRows.length + '** | ' + letRows + ' `let`/`var` (' + quietVars.length + ' of them never changed) and ' + constRows + ' changed `const` containers; ' + changedVars.length + ' when the never-changed are left out |');
  L.push('| ... written from two or more files | not counted | ' + varRows.filter((v) => v.marks.includes('2+')).length + ' | through an import |');
  L.push('| ... marked a phase | not counted | ' + varRows.filter((v) => v.phase).length + ' | as for a field; ' + varRows.filter((v) => v.flag).length + ' more are flags |');
  L.push('');
  L.push('Variables by folder: ' + ['data', 'debug', 'game', 'lib', 'networking', 'rendering', 'ui'].map((d) => d + ' ' + varRows.filter((v) => v.file.startsWith('src/' + d + '/')).length).join(', ')
    + ', the top of `src/` ' + varRows.filter((v) => v.file.split('/').length === 2).length + '.');
  L.push('');
  L.push('Should reset (suggested, not confirmed):');
  L.push('');
  L.push('| suggestion | fields | variables |');
  L.push('|---|---|---|');
  for (const w of words) L.push('| ' + w + ' | ' + by(fieldRows, w) + ' | ' + by(varRows, w) + (w === 'never' ? ' (' + quietVars.length + ' of them by machine: never changed)' : '') + ' |');
  L.push('');
  L.push('Rows not yet read (`?`): ' + unjudged + '. Suggestions whose row is gone: ' + stale + '. Suggested to reset where nothing writes it today: ' + un.length + '.');
  L.push('');
  L.push('Edges read off the code: ' + EDGE_ANCHORS.zone + ' blocks call `changeZone()`, ' + (EDGE_ANCHORS.death - RESPAWN.length) + ' set `S._dying = true`, '
    + EDGE_ANCHORS.rejoin + ' `case \'state_sync\'`. The flow settled in ' + rounds + ' rounds over ' + solves + ' passes.');
  L.push('');
  L.push('**Totals: ' + fieldRows.length + ' fields and ' + varRows.length + ' top-of-file variables, ' + (fieldRows.length + varRows.length) + ' rows, from ' + FILES.size + ' files.**');
  return L.join('\n') + '\n';
}

/* ─── the dossier: what a reader needs to fill SUGGESTED (--dossier [folder]) ─── */
function dossier(filter) {
  const L = [];
  const fnList = (a, max) => a.slice(0, max).join('; ') + (a.length > max ? '; +' + (a.length - max) : '');
  for (const r of fieldRows) {
    if (filter && !r.system.startsWith('src/' + filter)) continue;
    L.push('F ' + r.name + ' | system ' + short(r.system) + ' | born ' + r.born.how + (r.born.line ? ' ' + short(r.born.file) + ':' + r.born.line : '')
      + ' | set in: ' + (fnList(r.sets.map((s) => short(s.file) + ':' + s.line + ' ' + s.where + '=' + s.value).filter((x, i, a) => a.indexOf(x) === i), 8) || '-')
      + ' | inside: ' + (fnList(uniq([...r.ins, ...r.vias].map((s) => short(s.file) + ' ' + s.where + s.how)), 4) || '-')
      + ' | read by ' + r.readers.length + ': ' + r.readers.slice(0, 4).map(([f]) => short(f)).join(', ')
      + ' | marks ' + (r.marks.join(',') || '-') + ' | at ' + (r.at.join(',') || '-') + ' | now ' + r.reset);
  }
  for (const v of varRows) {
    if (!v.changed) continue;
    if (filter && !v.file.startsWith('src/' + filter)) continue;
    L.push('V ' + short(v.file) + ':' + v.line + ' ' + v.name + ' | ' + v.decl + ' ' + v.init
      + ' | writes: ' + fnList(v.writeFns, 6)
      + ' | read by ' + v.readers.length + (v.readers.some(([f]) => f !== v.file) ? ': ' + v.readers.slice(0, 3).map(([f]) => short(f)).join(', ') : '')
      + ' | at ' + (v.at.join(',') || '-') + ' | now ' + v.reset);
  }
  return L.join('\n') + '\n';
}

/* ═══ v2.3.5160: THE LEDGER'S ROWS (--ledger; card U, step 5.3's step 1) ═══
 *
 *   node tools/dev/state-census.mjs --ledger                  the rows by system: listed and not
 *   node tools/dev/state-census.mjs --ledger <system>         print src/state/<system>.js as made now
 *   node tools/dev/state-census.mjs --ledger <system> --write write it
 *
 * The ledger (src/state/README.md) is one file a system of card B's map
 * (tools/guards/lib/systems.mjs), one row a line, and its rows are made HERE,
 * never typed: this script stays the one reader of the code (the plan's rule
 * 2).  A row's system is the map's system of a file: a variable's own file, a
 * field's provisional system above (the file that sets it most).
 *
 * Every column is this script's but `lifetime` ("sitting" for every row until
 * someone says otherwise: card L's step 2) and any column a later card adds by
 * hand beside it.  Made again, a ledger file:
 *   - keeps each of its rows the script still finds, with its hand-made
 *     columns as they are and the rest made afresh; a row whose system has
 *     moved since stays where it is (the guard names it);
 *   - drops a row the script no longer finds, and names it;
 *   - adds every row of its system that no ledger file lists, `sitting`.
 * It writes only src/state/<system>.js: the page is `--write`'s alone.
 */
const LEDGER_DIR = join(ROOT, 'src', 'state');
/* the columns this script makes; any other column of a row is hand-made and kept */
const LEDGER_MADE = new Set(['field', 'variable', 'file', 'system', 'suggested', 'born', 'twoFiles', 'noRead', 'noSet', 'phase', 'flag', 'neverChanged', 'writers']);
const ledgerKey = (row) => (row.field !== undefined ? 'S ' + row.field : row.file + ' ' + row.variable);

/* a value as a JS literal on one line: single quotes, bare keys (plain data) */
function lit(v) {
  if (v === null || typeof v === 'boolean' || typeof v === 'number') return String(v);
  if (typeof v === 'string') return "'" + v.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
  if (Array.isArray(v)) return '[' + v.map(lit).join(', ') + ']';
  return '{ ' + Object.entries(v).map(([k, x]) => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : lit(k)) + ': ' + lit(x)).join(', ') + ' }';
}

/* every row the script finds, made as a ledger row: Map(key -> { system, made }) */
function ledgerFound(systemOf) {
  const out = new Map();
  for (const r of fieldRows) {
    let born = 'never';
    if (r.born.how === 'first') born = 'first ' + r.born.file;
    else if (r.born.how === 'fly') {
      const at = r.sets.find((s) => s.file === r.born.file && s.line === r.born.line);
      born = 'fly ' + r.born.file + (at && at.where ? ' ' + at.where : '');
    }
    const made = {
      field: r.name, system: systemOf(r.system), suggested: r.reset, born,
      twoFiles: r.marks.includes('2+') ? '2+' : r.marks.includes('2+~') ? '2+~' : '',
      noRead: r.marks.includes('no-read (tests)') ? 'tests' : r.marks.includes('no-read'),
      noSet: r.marks.includes('no-set'), phase: r.phase ? r.states : null, flag: r.flag,
      writers: r.writers.map(([f]) => f + (r.viaOnly.includes(f) ? '~' : '')).sort(),
    };
    out.set(ledgerKey(made), { system: made.system, made });
  }
  for (const v of varRows) {
    const made = {
      variable: v.name, file: v.file, system: systemOf(v.file), suggested: v.reset, born: v.decl + ' ' + v.init,
      twoFiles: v.marks.includes('2+') ? '2+' : '', noRead: v.marks.includes('no-read'), phase: v.phase ? v.states : null,
      flag: v.flag, neverChanged: !v.changed,
      writers: v.writers.map(([f]) => f).sort(),
    };
    out.set(ledgerKey(made), { system: made.system, made });
  }
  return out;
}

/* the ledger files on disk: Map(system -> rows) */
async function ledgerFiles() {
  const out = new Map();
  if (!existsSync(LEDGER_DIR)) return out;
  for (const name of readdirSync(LEDGER_DIR).sort()) {
    if (!name.endsWith('.js')) continue;
    const mod = await import(pathToFileURL(join(LEDGER_DIR, name)).href);
    out.set(name.replace(/\.js$/, ''), mod.ROWS || []);
  }
  return out;
}

/* a row in the column order the README gives: who, its system, its lifetime
   and any hand-made column, D's suggestion, then the rest of the machine's */
function ledgerLine(made, kept) {
  const row = {};
  if (made.field !== undefined) row.field = made.field; else { row.variable = made.variable; row.file = made.file; }
  row.system = made.system;
  row.lifetime = kept && kept.lifetime !== undefined ? kept.lifetime : 'sitting';
  for (const [k, x] of Object.entries(kept || {})) if (!LEDGER_MADE.has(k) && k !== 'lifetime') row[k] = x;
  for (const k of ['suggested', 'born', 'twoFiles', 'noRead', 'noSet', 'phase', 'flag', 'neverChanged', 'writers']) if (made[k] !== undefined) row[k] = made[k];
  return '  ' + lit(row) + ',';
}

function ledgerText(system, rows) {
  const L = [];
  L.push('/* ═══ v2.3.5160: THE STATE LEDGER, system `' + system + '` (grand plan step 5.3; card U) ═══');
  L.push(' *');
  L.push(' * Every field of the state `S` and every top-of-file variable of the system');
  L.push(' * `' + system + '` (card B\'s map, docs/SYSTEMS.md), one row a line.  The columns');
  L.push(' * are in src/state/README.md.');
  L.push(' *');
  L.push(' * MADE BY MACHINE: node tools/dev/state-census.mjs --ledger ' + system + ' --write');
  L.push(' * Never type a row.  By hand: `lifetime` alone ("sitting": the sitting, never');
  L.push(' * reset, until someone says otherwise; card L).  tools/guards/state-ledger.test.mjs');
  L.push(' * holds it.  No imports, plain data: nothing in the game imports it yet.');
  L.push(' */');
  L.push('export const SYSTEM = ' + lit(system) + ';');
  L.push('export const ROWS = [');
  for (const x of rows) L.push(x);
  L.push('];');
  return L.join('\n') + '\n';
}

async function ledgerMain() {
  const { placeFiles, systemOf: mapSystemOf, SYSTEMS } = await import(pathToFileURL(join(ROOT, 'tools', 'guards', 'lib', 'systems.mjs')).href);
  const placed = placeFiles();
  const systemOf = (file) => mapSystemOf(file, placed) || 'unsorted';
  const found = ledgerFound(systemOf);
  const files = await ledgerFiles();
  const listedIn = new Map();   /* key -> [systems whose file lists it] */
  for (const [sys, rows] of files) for (const row of rows) {
    const k = ledgerKey(row);
    if (!listedIn.has(k)) listedIn.set(k, []);
    listedIn.get(k).push(sys);
  }
  const i = process.argv.indexOf('--ledger');
  const want = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : '';

  if (!want) {
    /* the rows by system, fewest first: what a ledger PR picks from */
    const by = new Map();
    for (const [k, { system }] of found) {
      if (!by.has(system)) by.set(system, { rows: 0, listed: 0 });
      by.get(system).rows++;
      if (listedIn.has(k)) by.get(system).listed++;
    }
    const L = ['system\trows\tlisted\tunlisted\tledger file'];
    for (const [s, n] of [...by].sort((a, b) => a[1].rows - b[1].rows || cmp(a[0], b[0]))) {
      L.push(s + '\t' + n.rows + '\t' + n.listed + '\t' + (n.rows - n.listed) + '\t' + (files.has(s) ? 'src/state/' + s + '.js' : '-'));
    }
    const unlisted = [...found.keys()].filter((k) => !listedIn.has(k)).length;
    const gone = [...listedIn.keys()].filter((k) => !found.has(k));
    L.push('');
    L.push('rows ' + found.size + ', listed ' + (found.size - unlisted) + ', unlisted ' + unlisted + (gone.length ? ', listed but not found ' + gone.length + ': ' + gone.join('; ') : ''));
    process.stdout.write(L.join('\n') + '\n');
    return;
  }
  if (want === 'unsorted' || !Object.hasOwn(SYSTEMS, want)) {
    console.error('state-census --ledger: "' + want + '" is not a system of card B\'s map (have: ' + Object.keys(SYSTEMS).join(', ') + ')');
    process.exit(2);
  }
  const mine = files.get(want) || [];
  const kept = new Map(mine.map((row) => [ledgerKey(row), row]));
  const lines = [];
  const dropped = [];
  for (const [k, row] of kept) {
    if (found.has(k)) lines.push({ k, made: found.get(k).made, row });
    else dropped.push(k);
  }
  for (const [k, { system, made }] of found) {
    if (system === want && !kept.has(k) && !listedIn.has(k)) lines.push({ k, made, row: null });
  }
  /* fields by name, then variables by file and name */
  lines.sort((a, b) => (a.made.field !== undefined) !== (b.made.field !== undefined) ? (a.made.field !== undefined ? -1 : 1)
    : cmp(a.made.field !== undefined ? a.made.field : a.made.file + ' ' + a.made.variable, b.made.field !== undefined ? b.made.field : b.made.file + ' ' + b.made.variable));
  const text = ledgerText(want, lines.map((x) => ledgerLine(x.made, x.row)));
  if (ARGS.has('--write')) {
    const out = join(LEDGER_DIR, want + '.js');
    writeFileSync(out, text);
    console.log('state-census: wrote ' + rel(out) + ' (' + lines.length + ' rows' + (dropped.length ? '; dropped, no longer found: ' + dropped.join('; ') : '') + ').');
  } else {
    process.stdout.write(text);
    if (dropped.length) console.error('state-census: dropped, no longer found: ' + dropped.join('; '));
  }
}

export const census = { FILES, FIELDS, VARS, DYNAMIC, ESCAPES, WHOLE, REFUTED, REGIONS, fieldRows, varRows, rounds, solves };

if (process.argv[1] && pathResolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (ARGS.has('--ledger')) {
    await ledgerMain();
  } else if (ARGS.has('--json')) {
    const slim = (sites) => sites.map((s) => short(s.file) + ':' + s.line + ' ' + s.where);
    /* v2.3.5201 (card L PR 1): `ledger`, every row as `--ledger` makes it
       (ledgerFound, the map's systems): the state ledger's guard holds the
       machine's columns of each listed row to it, so a row typed or changed
       by hand fails (the gatekeeper's second finding, sitting 6).  An output,
       not a reading rule: nothing above changes. */
    const { placeFiles, systemOf: mapSystemOf } = await import(pathToFileURL(join(ROOT, 'tools', 'guards', 'lib', 'systems.mjs')).href);
    const placed = placeFiles();
    const made = ledgerFound((file) => mapSystemOf(file, placed) || 'unsorted');
    process.stdout.write(JSON.stringify({
      ledger: [...made.values()].map((x) => x.made),
      fields: fieldRows.map((r) => ({
        name: r.name, system: short(r.system), born: r.born.how === 'never' ? null : { how: r.born.how, at: short(r.born.file) + ':' + r.born.line },
        marks: r.marks, states: r.states, writtenAt: r.at, shouldReset: r.reset,
        sets: slim(r.sets), inside: slim(r.ins), throughAName: slim(r.vias), reads: slim(r.reads),
      })),
      variables: varRows.map((v) => ({
        name: v.name, file: short(v.file), line: v.line, what: v.decl + ' ' + v.init, changed: v.changed, exported: v.exported,
        marks: v.marks, states: v.states, writtenAt: v.at, shouldReset: v.reset,
        writes: v.writes.map((w) => short(w.file) + ':' + w.line + ' ' + w.where + ' ' + w.how), readers: v.readers.map(([f, n]) => short(f) + ' x' + n),
      })),
    }, null, 1) + '\n');
  } else if (ARGS.has('--dossier')) {
    const i = process.argv.indexOf('--dossier');
    const filter = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : '';
    process.stdout.write(dossier(filter));
  } else {
    const text = page();
    if (ARGS.has('--check')) {
      const have = existsSync(PAGE) ? readFileSync(PAGE, 'utf8') : '';
      if (have !== text) { console.error('state-census: docs/plan/census/state.md is not what the code says now. Run `node tools/dev/state-census.mjs --write`.'); process.exit(1); }
      console.log('state-census: the page is true (' + fieldRows.length + ' fields, ' + varRows.length + ' variables).');
    } else if (ARGS.has('--write')) {
      writeFileSync(PAGE, text);
      console.log('state-census: wrote ' + rel(PAGE) + ' (' + fieldRows.length + ' fields, ' + varRows.length + ' variables, ' + text.length + ' bytes).');
    } else process.stdout.write(text);
  }
}
