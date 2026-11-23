/* ═══ v2.3.6441: WHAT A FILE WRITES, READ OFF THE SYNTAX TREE (card DG PR 2) ═══
 *
 * WHY.  Every "one door" test (gold, bag, stash, life, points, quest,
 * experience, the hit door, the session door, the send door, the page's
 * action door) found its second writers with a pattern of text: `.coins =`,
 * `+=`, `++`.  The shape review of 2026-11-23 (docs/plan/census/
 * shape-doors.md, tools/dev/plants/) planted the spellings a tired
 * programmer writes -- `Object.assign(ps, { coins })`, `ps.coins ||= n`,
 * `ps[k] = ...` with k from a list, `const { inventory } = ps` and a write
 * through it, `delete ps.dead`, a helper handed the bag, `const give =
 * this._goldGive.bind(this)`, `const room = this; room._hpSet(...)` -- and
 * 44 of 47 walked past.  A guard on value reads the syntax tree (finish.md
 * part 5, rule 2).  This is the one scanner they share.
 *
 *   writesOf(code, { fields, containers, file })  -> [write]
 *     every place `code` writes a FIELD (a property named in `fields` or
 *     `containers`: the field itself put, deleted or changed) or the CONTENTS
 *     of a container (a property named in `containers`: a key under it put
 *     or deleted, a list's push/splice/sort..., Object.assign onto it).
 *     A write is found however it is spelled:
 *       - an assignment of any operator (`=`, `+=`, `||=`, `??=`, `&&=`...)
 *         or `++`/`--`, its target a member or a destructuring pattern
 *         (`[t.xp, t.level] = [...]`);
 *       - `delete`;
 *       - `Object.assign(target, ...)`, `Object.defineProperty`,
 *         `Reflect.set` / `Reflect.deleteProperty` / `Reflect.defineProperty`:
 *         onto a container, or with a field's key in an object written out
 *         (`Object.assign(ps, { coins: n })`, a computed key whose value is
 *         known);
 *       - a key held in a variable when the variable's values are known: a
 *         `const`, a `for (const k of ['coins', ...])`, a ternary of words;
 *       - through an ALIAS of a container: `const inv = ps.inventory`,
 *         `const { inventory } = ps`, `const { _quests: qs } = ps`, an alias
 *         of an alias, and a function of the same file handed the container
 *         (`addTo(ps.inventory, k, 1)` writes through `items`);
 *       - a list's own changers on a container or its alias (`push`, `pop`,
 *         `shift`, `unshift`, `splice`, `sort`, `reverse`, `fill`,
 *         `copyWithin`).
 *     write: { file, line, field, inside (true: under the container), how,
 *              fn (the named function it is in), text (its line), recv }
 *     `recv`: for a member write, its receiver as written (`ps`, `m`,
 *     `this.playerState[id]`) and, when it is a name, what that name was
 *     made from (`init`: the source of its binding, or 'param').
 *
 *   refsOf(code, names, { file })  -> [ref]
 *     every place a name in `names` (a door's method or function) is
 *     REFERRED to, however: called as `x.name(...)` / `name(...)` (how
 *     'call', with its arguments), or anything else -- `x.name.bind(...)`,
 *     `.call`, `.apply`, `const f = x.name`, handed on as a value (how
 *     'bind' / 'call.call' / 'apply' / 'alias' / 'value').  A door's test
 *     counts every ref as a caller, so a second caller hidden behind a bind
 *     or `const room = this` is counted.
 *     ref: { file, line, name, how, args (string values of literal
 *            arguments, else null), recv (the receiver's source), fn, text }
 *
 *   parse(code)  the tree (@babel/parser, module, JSX and the usual
 *     plugins), or throws.
 *
 * It reads; it never runs the code.  What it cannot know: a key computed at
 * run time from data (`ps[row.field] = v`) -- the running room catches that
 * one (server/test/testroom.mjs "THE RUNNING ROOM REFUSES", card DG PR 1).
 * Its own checks: tools/guards/writes-of.test.mjs (each spelling above,
 * planted). */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
let B = null;
function babel() {
  if (B) return B;
  for (const pkg of ['package.json', 'server/package.json']) {
    try {
      const req = createRequire(join(ROOT, pkg));
      const t = req('@babel/traverse');
      B = { parse: req('@babel/parser').parse, traverse: t.default || t };
      return B;
    } catch { /* the next */ }
  }
  throw new Error('writesOf: @babel/parser and @babel/traverse load from neither the root nor server/ (npm install in server/)');
}

const PARSE_CACHE = new Map();
export function parse(code) {
  const hit = PARSE_CACHE.get(code);
  if (hit) return hit;
  const ast = babel().parse(code, {
    sourceType: 'module', errorRecovery: false,
    plugins: ['jsx', 'classProperties', 'classPrivateProperties', 'classPrivateMethods', 'optionalChaining', 'nullishCoalescingOperator', 'logicalAssignment', 'topLevelAwait', 'importMeta'],
  });
  if (PARSE_CACHE.size > 64) PARSE_CACHE.clear();
  PARSE_CACHE.set(code, ast);
  return ast;
}

const LIST_CHANGERS = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill', 'copyWithin']);

/* the named function a node sits in: its own name, a method's key, the
   variable or property it is given to (phase-table's rule) */
export function fnName(path) {
  for (let p = path.getFunctionParent(); p; p = p.parentPath && p.parentPath.getFunctionParent()) {
    const n = p.node;
    if (n.id && n.id.name) return n.id.name;
    if (n.key && !n.computed && (n.key.name || n.key.value)) return String(n.key.name || n.key.value);
    const pp = p.parentPath;
    if (pp && pp.isVariableDeclarator() && pp.node.id.type === 'Identifier') return pp.node.id.name;
    if (pp && pp.isAssignmentExpression() && pp.node.left.type === 'MemberExpression' && !pp.node.left.computed) return pp.node.left.property.name;
    if (pp && pp.isObjectProperty() && !pp.node.computed) return String(pp.node.key.name || pp.node.key.value);
  }
  return '(top)';
}

/* the words an expression can be, when the tree says (a literal, a template
   with nothing in it, a const bound to one, a for-of over a list of them, a
   ternary or || of them); null when it cannot be known */
function wordsOf(node, path, depth = 0) {
  if (!node || depth > 6) return null;
  switch (node.type) {
    case 'StringLiteral': return [node.value];
    case 'NumericLiteral': return [String(node.value)];
    case 'TemplateLiteral': return node.expressions.length === 0 ? [node.quasis.map((q) => q.value.cooked).join('')] : null;
    case 'ConditionalExpression': { const a = wordsOf(node.consequent, path, depth + 1), b = wordsOf(node.alternate, path, depth + 1); return a && b ? [...a, ...b] : null; }
    case 'LogicalExpression': { const a = wordsOf(node.left, path, depth + 1), b = wordsOf(node.right, path, depth + 1); return a && b ? [...a, ...b] : null; }
    case 'BinaryExpression': {
      if (node.operator !== '+') return null;
      const a = wordsOf(node.left, path, depth + 1), b = wordsOf(node.right, path, depth + 1);
      return a && b && a.length * b.length <= 64 ? a.flatMap((x) => b.map((y) => x + y)) : null;
    }
    case 'Identifier': {
      const bind = path.scope.getBinding(node.name);
      if (!bind) return null;
      const bp = bind.path;
      if (bp.isVariableDeclarator()) {
        const decl = bp.parentPath;
        const loop = decl && decl.parentPath;
        /* for (const k of ['a', 'b']) */
        if (loop && (loop.isForOfStatement() || loop.isForInStatement()) && loop.node.left === decl.node) {
          if (loop.isForInStatement()) return null;
          const r = loop.node.right;
          if (r.type === 'ArrayExpression') {
            const all = [];
            for (const e of r.elements) { const w = wordsOf(e, loop.get('right'), depth + 1); if (!w) return null; all.push(...w); }
            return all;
          }
          return null;
        }
        if (bind.constant && bp.node.init && bp.node.id.type === 'Identifier') return wordsOf(bp.node.init, bp, depth + 1);
      }
      return null;
    }
    default: return null;
  }
}

/* a member's key, when known: `x.k`, `x['k']`, x[`k`], x[k] with k known */
function keysOf(m, path) {
  if (!m.computed) return m.property.type === 'Identifier' ? [m.property.name] : (m.property.type === 'PrivateName' ? null : null);
  return wordsOf(m.property, path);
}

const srcOf = (code, n) => (n && n.start != null ? code.slice(n.start, n.end) : '');

/**
 * Every write of `fields` / the contents of `containers` in `code`.
 * opts: { fields: string[] (scalar or whole), containers: string[], file }
 */
export function writesOf(code, opts = {}) {
  const FIELDS = new Set([...(opts.fields || []), ...(opts.containers || [])]);
  const CONTAINERS = new Set(opts.containers || []);
  const file = opts.file || '';
  const ast = parse(code);
  const { traverse } = babel();
  const lines = code.split('\n');
  const out = [];
  const seen = new Set();

  /* ── aliases of a container: binding -> container name ── */
  const alias = new Map();   /* Binding -> field */
  /* function param aliases found by a call in the file: Binding -> field */
  const fnsByName = new Map();   /* name -> [function path] (declarations, methods, consts) */

  /* what a node holds: { container } when it IS a container (x.inventory, an alias) */
  function containerOf(node, path) {
    if (!node) return null;
    if (node.type === 'MemberExpression' || node.type === 'OptionalMemberExpression') {
      const ks = keysOf(node, path);
      if (ks && ks.length === 1 && CONTAINERS.has(ks[0])) return ks[0];
      return null;
    }
    if (node.type === 'Identifier') {
      const b = path.scope.getBinding(node.name);
      return b && alias.has(b) ? alias.get(b) : null;
    }
    if (node.type === 'LogicalExpression') return containerOf(node.left, path) || containerOf(node.right, path);
    if (node.type === 'ConditionalExpression') return containerOf(node.consequent, path) || containerOf(node.alternate, path);
    if (node.type === 'AssignmentExpression') return containerOf(node.left, path);
    if (node.type === 'ParenthesizedExpression') return containerOf(node.expression, path);
    return null;
  }
  /* inside a container: the member's object is a container (or deeper in one) */
  function insideOf(node, path) {
    let o = node.object;
    while (o) {
      const c = containerOf(o, path);
      if (c) return c;
      if (o.type === 'MemberExpression' || o.type === 'OptionalMemberExpression') o = o.object;
      else break;
    }
    return null;
  }

  function recvOf(m, path) {
    const r = m.object;
    const recv = { text: srcOf(code, r) };
    if (r && r.type === 'Identifier') {
      const b = path.scope.getBinding(r.name);
      if (b) recv.init = b.kind === 'param' ? 'param' : (b.path.isVariableDeclarator() ? srcOf(code, b.path.node.init) || '(none)' : b.kind);
    }
    return recv;
  }

  function add(path, node, field, inside, how, recv) {
    const line = node.loc ? node.loc.start.line : 0;
    const key = line + ':' + (node.start || 0) + ':' + field + ':' + inside + ':' + how;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ file, line, field, inside: !!inside, how, fn: fnName(path), text: (lines[line - 1] || '').trim(), recv: recv || null });
  }

  /* a target written: a member, or a pattern holding members */
  function target(path, node, how) {
    if (!node) return;
    if (node.type === 'MemberExpression' || node.type === 'OptionalMemberExpression') {
      const inside = insideOf(node, path);
      if (inside) { add(path, node, inside, true, how, recvOf(node, path)); return; }
      const ks = keysOf(node, path);
      if (ks) for (const k of ks) if (FIELDS.has(k)) add(path, node, k, false, how, recvOf(node, path));
      return;
    }
    if (node.type === 'Identifier') {
      /* an alias of a container put again is not a write of the container */
      return;
    }
    if (node.type === 'ObjectPattern') { for (const p of node.properties) target(path, p.type === 'RestElement' ? p.argument : p.value, how + ' (pattern)'); return; }
    if (node.type === 'ArrayPattern') { for (const e of node.elements) if (e) target(path, e, how + ' (pattern)'); return; }
    if (node.type === 'AssignmentPattern') { target(path, node.left, how); return; }
    if (node.type === 'RestElement') { target(path, node.argument, how); }
  }

  /* an object written out handed to Object.assign: the field keys it names */
  function objectKeys(obj, path) {
    const ks = [];
    if (!obj || obj.type !== 'ObjectExpression') return ks;
    for (const p of obj.properties) {
      if (p.type === 'SpreadElement') continue;
      const k = p.computed ? wordsOf(p.key, path) : [p.key.type === 'Identifier' ? p.key.name : String(p.key.value)];
      if (k) ks.push(...k);
    }
    return ks;
  }

  /* pass 1: aliases (declarations, destructures), functions by name */
  const bindAlias = (path, id, field) => {
    if (!id || id.type !== 'Identifier') return false;
    const b = path.scope.getBinding(id.name);
    if (!b || alias.get(b) === field) return false;
    alias.set(b, field);
    return true;
  };
  const visitAliases = () => {
    let grew = false;
    traverse(ast, {
      VariableDeclarator(path) {
        const { id, init } = path.node;
        if (!init) return;
        if (id.type === 'Identifier') {
          const c = containerOf(init, path);
          if (c) grew = bindAlias(path, id, c) || grew;
        } else if (id.type === 'ObjectPattern') {
          for (const p of id.properties) {
            if (p.type !== 'ObjectProperty') continue;
            const k = p.computed ? wordsOf(p.key, path) : [p.key.type === 'Identifier' ? p.key.name : String(p.key.value)];
            const v = p.value.type === 'AssignmentPattern' ? p.value.left : p.value;
            if (k && k.length === 1 && CONTAINERS.has(k[0])) grew = bindAlias(path, v, k[0]) || grew;
          }
        }
      },
      AssignmentExpression(path) {
        const { left, right, operator } = path.node;
        if (operator === '=' && left.type === 'Identifier') { const c = containerOf(right, path); if (c) grew = bindAlias(path, left, c) || grew; }
      },
      /* a function of this file handed a container: its parameter is an alias */
      CallExpression(path) {
        const { callee, arguments: args } = path.node;
        let name = null;
        if (callee.type === 'Identifier') name = callee.name;
        else if ((callee.type === 'MemberExpression' || callee.type === 'OptionalMemberExpression') && !callee.computed && callee.property.type === 'Identifier'
          && (callee.object.type === 'ThisExpression' || callee.object.type === 'Identifier')) name = callee.property.name;
        if (!name || !fnsByName.has(name)) return;
        args.forEach((a, i) => {
          const c = containerOf(a, path);
          if (!c) return;
          for (const f of fnsByName.get(name)) {
            const prm = f.node.params[i];
            if (prm && prm.type === 'Identifier') { const b = f.scope.getBinding(prm.name); if (b && alias.get(b) !== c) { alias.set(b, c); grew = true; } }
          }
        });
      },
    });
    return grew;
  };
  traverse(ast, {
    Function(path) {
      const n = path.node;
      let name = n.id && n.id.name;
      if (!name && n.key && !n.computed) name = n.key.name || n.key.value;
      if (!name && path.parentPath.isVariableDeclarator() && path.parentPath.node.id.type === 'Identifier') name = path.parentPath.node.id.name;
      if (!name && path.parentPath.isObjectProperty() && !path.parentPath.node.computed) name = path.parentPath.node.key.name;
      if (!name) return;
      if (!fnsByName.has(name)) fnsByName.set(name, []);
      fnsByName.get(name).push(path);
    },
  });
  for (let i = 0; i < 6 && visitAliases(); i++) { /* to a fixed point */ }

  /* pass 2: the writes */
  traverse(ast, {
    AssignmentExpression(path) { target(path, path.node.left, 'assign ' + path.node.operator); },
    UpdateExpression(path) { target(path, path.node.argument, 'update ' + path.node.operator); },
    UnaryExpression(path) { if (path.node.operator === 'delete') target(path, path.node.argument, 'delete'); },
    ForXStatement(path) { const l = path.node.left; if (l.type !== 'VariableDeclaration') target(path, l, 'for-of target'); },
    CallExpression(path) {
      const { callee, arguments: args } = path.node;
      if (callee.type !== 'MemberExpression' && callee.type !== 'OptionalMemberExpression') return;
      const prop = !callee.computed && callee.property.type === 'Identifier' ? callee.property.name : null;
      const objName = callee.object.type === 'Identifier' ? callee.object.name : null;
      /* Object.assign / defineProperty / Reflect.* */
      if ((objName === 'Object' && (prop === 'assign' || prop === 'defineProperty' || prop === 'defineProperties'))
        || (objName === 'Reflect' && (prop === 'set' || prop === 'deleteProperty' || prop === 'defineProperty'))) {
        const t = args[0];
        if (!t) return;
        const how = objName + '.' + prop;
        const c = containerOf(t, path) || ((t.type === 'MemberExpression' || t.type === 'OptionalMemberExpression') ? insideOf(t, path) : null);
        if (c) { add(path, path.node, c, true, how, t.type === 'MemberExpression' ? recvOf(t, path) : { text: srcOf(code, t) }); return; }
        let ks = [];
        if (prop === 'assign' || prop === 'defineProperties') for (const s of args.slice(1)) ks.push(...objectKeys(s, path));
        else { const w = wordsOf(args[1], path); if (w) ks = w; }
        for (const k of ks) if (FIELDS.has(k)) add(path, path.node, k, false, how, { text: srcOf(code, t) });
        return;
      }
      /* a list's own changers on a container */
      if (prop && LIST_CHANGERS.has(prop)) {
        const c = containerOf(callee.object, path) || ((callee.object.type === 'MemberExpression') ? insideOf(callee.object, path) : null);
        if (c) add(path, path.node, c, true, '.' + prop + '()', { text: srcOf(code, callee.object) });
      }
    },
  });
  out.sort((a, b) => a.line - b.line);
  return out;
}

/**
 * Every reference to a name in `names` (a door's methods or functions).
 * opts: { file, roadAt: { name: argument index of the road } }
 */
export function refsOf(code, names, opts = {}) {
  const NAMES = new Set(names);
  const file = opts.file || '';
  const ast = parse(code);
  const { traverse } = babel();
  const lines = code.split('\n');
  const out = [];
  const argWord = (a, path) => { const w = a ? wordsOf(a, path) : null; return w && w.length === 1 ? w[0] : null; };
  const push = (path, node, name, how, args, recv) => {
    const line = node.loc ? node.loc.start.line : 0;
    out.push({ file, line, name, how, args, recv, fn: fnName(path), text: (lines[line - 1] || '').trim() });
  };
  function classify(path, name, node, recv) {
    const parent = path.parentPath;
    /* x.name(...) / name(...) */
    if ((parent.isCallExpression() || parent.isOptionalCallExpression()) && parent.node.callee === node) {
      push(path, node, name, 'call', parent.node.arguments.map((a) => argWord(a, parent)), recv);
      return;
    }
    /* x.name.bind(...) / .call(...) / .apply(...) */
    if ((parent.isMemberExpression() || parent.isOptionalMemberExpression()) && parent.node.object === node && !parent.node.computed) {
      const p = parent.node.property.name;
      const gp = parent.parentPath;
      if ((p === 'call' || p === 'apply' || p === 'bind') && (gp.isCallExpression() || gp.isOptionalCallExpression()) && gp.node.callee === parent.node) {
        const a = gp.node.arguments.slice(1);
        push(path, node, name, p === 'call' ? 'call.call' : p, p === 'call' ? a.map((x) => argWord(x, gp)) : null, recv);
        return;
      }
    }
    push(path, node, name, parent.isVariableDeclarator() || parent.isAssignmentExpression() ? 'alias' : 'value', null, recv);
  }
  traverse(ast, {
    MemberExpression(path) { visitMember(path); },
    OptionalMemberExpression(path) { visitMember(path); },
    Identifier(path) {
      const n = path.node;
      if (!NAMES.has(n.name)) return;
      const p = path.parentPath;
      /* a key, a property name, a declaration of it: not a reference */
      if ((p.isMemberExpression() || p.isOptionalMemberExpression()) && p.node.property === n && !p.node.computed) return;
      if ((p.isObjectProperty() || p.isObjectMethod() || p.isClassMethod() || p.isClassProperty()) && p.node.key === n && !p.node.computed) {
        /* `{ _goldGive }` shorthand as a value is a reference */
        if (!(p.isObjectProperty() && p.node.shorthand && p.node.value === n)) return;
      }
      if (p.isFunctionDeclaration() && p.node.id === n) return;
      if (p.isVariableDeclarator() && p.node.id === n) return;
      if (p.isImportSpecifier() || p.isExportSpecifier() || p.isImportDefaultSpecifier()) return;
      if (path.isBindingIdentifier && path.isBindingIdentifier()) return;
      classify(path, n.name, n, null);
    },
  });
  function visitMember(path) {
    const m = path.node;
    const ks = m.computed ? wordsOf(m.property, path) : (m.property.type === 'Identifier' ? [m.property.name] : null);
    if (!ks) return;
    for (const k of ks) if (NAMES.has(k)) classify(path, k, m, srcOf(code, m.object));
  }
  /* a destructure of a door: `const { _goldGive } = this` */
  traverse(ast, {
    ObjectPattern(path) {
      for (const p of path.node.properties) {
        if (p.type !== 'ObjectProperty') continue;
        const k = p.computed ? wordsOf(p.key, path) : [p.key.type === 'Identifier' ? p.key.name : String(p.key.value)];
        if (k) for (const x of k) if (NAMES.has(x)) push(path, p, x, 'destructure', null, null);
      }
    },
  });
  out.sort((a, b) => a.line - b.line);
  return out;
}
