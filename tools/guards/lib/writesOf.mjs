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
 *       - a record rebuilt from a spread with a field put and put back
 *         (`this.playerState[id] = { ...ps, coins }`, or held in a name first);
 *       - an ELEMENT of a container written in place (`ps.weaponStash[0].lvl
 *         = 99`, `const w = ps.weaponStash[i]; w.lvl = 99`, `for (const w of
 *         ps.weaponStash) w.lvl = 99`): a write of the container; and an
         element FOUND or HANDED to a callback (v2.3.6441, sitting 57: `const
         w = ps.weaponStash.find(...)`, `.at(i)`, and the
         first parameter of `forEach` / `find` / `filter` / `map` / `some` /
         `every` / `findIndex` / `findLast`, `reduce`'s second, called on the
         container or on a `filter` / `slice` / `sort`... of it);
       - an object named in a const or let handed to Object.assign
         (`const patch = { coins }; Object.assign(ps, patch)`, keys put into
         `patch` later too, and a spread of it; sitting 57);
       - a key that is a PARAMETER of a function of the same file, from the
         words its callers hand it (`function bump(o, k, n) { o[k] += n; }
         bump(ps, 'coins', 5)`; sitting 57);
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
 *            arguments, else null), argSrc (each argument as written, on a
 *            call), recv (the receiver's source), fn, text }
 *
 *   parse(code)  the tree (@babel/parser, module, JSX and the usual
 *     plugins), or throws.
 *
 *     DENY BY DEFAULT (v2.3.6441, sitting 58: `const [first] =
 *     ps.weaponStash; first.lvl = 99` stayed green, the third sitting to
 *     find a new spelling): a container or an item of one is followed through
 *     EVERY form of binding -- a name, an object or a list pattern, nested, a
 *     rest, a default, a key that is a number, a parameter's or a loop's or
 *     a callback's pattern, a copy of its list (`[...l]`, `.filter`,
 *     `Object.values`: its items, never its own slots), a member it is put
 *     into (`this._cur = w`), a function of the file that hands it back, an
 *     object holding it under another key -- and a binding it CANNOT follow
 *     (a key the tree cannot know, a member of a call's answer, a form it
 *     has no rule for) is reported as a write ('cannot follow: ...'), so an
 *     unknown spelling is red.  opts.shallow: containers whose items are
 *     their own (the map of sessions).
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

/* v2.3.6441 (sitting 57: an item changed through `.find(...)` / `forEach`
   stayed green): a call that hands back ONE element of the list or map it is
   called on, a call that hands back a new list of the SAME elements, and a
   call that hands each element to its callback (the parameter's index) */
const ELEMENT_GETTERS = new Set(['find', 'findLast', 'at']);   /* not a Map's `get`: a session got from `sessions` is no write of the map (session-door) */
const LIST_COPIERS = new Set(['filter', 'slice', 'concat', 'toSorted', 'toReversed', 'sort', 'reverse', 'values',
  /* v2.3.6441 (sitting 58): more lists of the same items -- a copy's own slots are no write, its items are the container's */
  'entries', 'flat', 'toSpliced', 'with', 'map', 'flatMap']);
/* v2.3.6441 (sitting 58): the calls of the language that hand back a list of
   a container's items: `Object.values(ps.weaponStash)`, `Array.from(...)` */
const GLOBAL_COPIERS = new Set(['Object.values', 'Object.entries', 'Array.from']);
const ELEMENT_CALLBACKS = new Map([['forEach', 0], ['find', 0], ['findLast', 0], ['filter', 0], ['map', 0], ['flatMap', 0],
  ['some', 0], ['every', 0], ['findIndex', 0], ['findLastIndex', 0], ['reduce', 1], ['reduceRight', 1]]);

const LIST_CHANGERS = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill', 'copyWithin',
  /* a Map's or a Set's own changers, on a container held as one */
  'set', 'delete', 'clear', 'add']);

/* The words a name from ANOTHER file holds (`STASH_FIELDS`, `GEAR_PROV_FIELD`),
   handed in by the test that imported it, so `for (const f of STASH_FIELDS)
   ps[f].push(w)` and `ps[GEAR_PROV_FIELD.shield]` are known keys.  A name
   bound in the file itself is read from the file.  Set for one call only. */
let WORDS = null;
/* v2.3.6441 (sitting 57's plant `bump(ps, 'coins', n)`): the words a
   function's PARAMETER can be, from the arguments its callers in the same
   file hand it.  Set by writesOf for one call: (binding, path, depth) ->
   words | null.  Null (no hook) outside writesOf. */
let PARAM_WORDS = null;

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
    case 'MemberExpression': case 'OptionalMemberExpression': {
      /* a member of a known list or map from another file: any of its words */
      const o = node.object;
      if (o.type === 'Identifier' && WORDS && Object.prototype.hasOwnProperty.call(WORDS, o.name)) {
        const b = path.scope.getBinding(o.name);
        if (!b || b.kind === 'module') return [...WORDS[o.name]];
      }
      return null;
    }
    case 'CallExpression': {
      /* a function of another file (or this one) known to answer one of a list's words */
      const c = node.callee;
      if (c.type === 'Identifier' && WORDS && Object.prototype.hasOwnProperty.call(WORDS, c.name + '()')) return [...WORDS[c.name + '()']];
      return null;
    }
    case 'Identifier': {
      const bind = path.scope.getBinding(node.name);
      if ((!bind || bind.kind === 'module') && WORDS && Object.prototype.hasOwnProperty.call(WORDS, node.name)) return [...WORDS[node.name]];
      if (!bind) return null;
      if (bind.kind === 'param' && PARAM_WORDS) return PARAM_WORDS(bind, depth + 1);
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
          /* for (const f of STASH_FIELDS): a list known by name, or a const of this file */
          return listWords(r, loop.get('right'), depth + 1);
        }
        if (bind.constant && bp.node.init && bp.node.id.type === 'Identifier') return wordsOf(bp.node.init, bp, depth + 1);
      }
      return null;
    }
    default: return null;
  }
}

/* the words a LIST holds: a list written out, `Object.freeze([...])`, a const
   of this file bound to one, a known list of another file */
function listWords(node, path, depth = 0) {
  if (!node || depth > 6) return null;
  if (node.type === 'ArrayExpression') {
    const all = [];
    for (const e of node.elements) {
      if (e && e.type === 'SpreadElement') { const w = listWords(e.argument, path, depth + 1); if (!w) return null; all.push(...w); continue; }
      const w = wordsOf(e, path, depth + 1); if (!w) return null; all.push(...w);
    }
    return all;
  }
  if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression' && !node.callee.computed
    && node.callee.object.type === 'Identifier' && node.callee.object.name === 'Object' && node.callee.property.name === 'freeze') return listWords(node.arguments[0], path, depth + 1);
  if (node.type === 'Identifier') {
    const b = path.scope.getBinding(node.name);
    if (b && b.constant && b.path.isVariableDeclarator() && b.path.node.init) return listWords(b.path.node.init, b.path, depth + 1);
    return wordsOf(node, path, depth + 1);
  }
  return wordsOf(node, path, depth + 1);
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
  /* opts.makers: { functionName: container } -- a call that hands back a
     container (`bagOf(ps)` is the bag) makes its name an alias */
  const MAKERS = opts.makers || {};
  WORDS = opts.words || null;
  try { return writesIn(); } finally { WORDS = null; PARAM_WORDS = null; }
  function writesIn() {
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
  /* v2.3.6441 (sitting 58: `const [first] = ps.weaponStash; first.lvl = 99`
     stayed green): DENY BY DEFAULT.  A container, or an item of one, bound
     to anything is followed through every form of binding (a name, an
     object or a list pattern, nested, a rest, a default, a parameter of this
     file's functions, a loop's, a callback's), and a binding the scanner
     cannot follow (a key it cannot know, a member of something else, a form
     it has no rule for) is reported as a WRITE ('cannot follow'): an unknown
     spelling is red, never green. */
  const copies = new Set();      /* Binding: a name bound to a COPY of a container's list */
  const holders = new Map();     /* Binding -> Map(key -> container): an object written out with a container under a key */
  const fnReturns = new Map();   /* function path -> container: it hands back a container or an item of one */
  const unfollowed = new Map();  /* node.start -> { path, node, field, how } */
  /* a container put into a member (`S.cur = ps.weaponStash[0]`): followed at
     that member -- its root's binding (or `this`) and its keys, an unknown
     key matching only an unknown key */
  const memberAlias = new Map(); /* root -> [{ parts, c, copy }] */
  const bindingIds = new Map();
  /* opts.shallow: containers whose ITEMS are their own (the map of sessions:
     a key put or deleted is a write of it, a session's own field is not) */
  const SHALLOW = new Set(opts.shallow || []);
  const itemOf = (c) => (c && !String(c).split('|').some((x) => SHALLOW.has(x)) ? c : null);
  function memberPath(node, path) {
    const parts = [];
    let n = node;
    while (n && (n.type === 'MemberExpression' || n.type === 'OptionalMemberExpression')) {
      const ks = keysOf(n, path);
      parts.unshift(ks && ks.length === 1 ? '.' + ks[0] : '[?]');
      n = n.object;
    }
    let root;
    if (n && n.type === 'ThisExpression') root = 'this';
    else if (n && n.type === 'Identifier') {
      const b = path.scope.getBinding(n.name);
      if (!b) root = 'g:' + n.name;
      else { if (!bindingIds.has(b)) bindingIds.set(b, bindingIds.size); root = 'b' + bindingIds.get(b); }
    } else return null;
    return { root, parts };
  }
  function memberAliasOf(node, path) {
    if (!memberAlias.size) return null;
    const mp = memberPath(node, path);
    const rows = mp && memberAlias.get(mp.root);
    if (!rows) return null;
    for (const r of rows) if (r.parts.length === mp.parts.length && r.parts.every((x, i) => x === mp.parts[i])) return r;
    return null;
  }
  const cannot = (path, node, field, how) => {
    const k = node.start + ':' + field;
    if (!unfollowed.has(k)) unfollowed.set(k, { path, node, field, how: 'cannot follow: ' + how });
  };
  const globalName = (c) => ((c && (c.type === 'MemberExpression' || c.type === 'OptionalMemberExpression') && !c.computed
    && c.object.type === 'Identifier' && c.property.type === 'Identifier') ? c.object.name + '.' + c.property.name : '');
  /* the keys an object holds containers under: written out, or a name bound to one */
  function holderOf(node, path) {
    if (!node) return null;
    if (node.type === 'Identifier') { const b = path.scope.getBinding(node.name); return (b && holders.get(b)) || null; }
    if (node.type !== 'ObjectExpression') return null;
    let h = null;
    for (const p of node.properties) {
      if (p.type !== 'ObjectProperty') continue;
      const k = p.computed ? wordsOf(p.key, path) : [p.key.type === 'Identifier' ? p.key.name : String(p.key.value)];
      const c = containerOf(p.value, path);
      if (!c || !k || k.length !== 1 || CONTAINERS.has(k[0])) continue;   /* under a container's own name: its key says it */
      (h || (h = new Map())).set(k[0], c);
    }
    return h;
  }

  /* what a node holds: { container } when it IS a container (x.inventory, an alias) */
  function containerOf(node, path) {
    if (!node) return null;
    if (node.type === 'MemberExpression' || node.type === 'OptionalMemberExpression') {
      const ks = keysOf(node, path);
      /* v2.3.6441 (sitting 58): a key of an object that holds a container
         (`const o = { bag: ps.inventory }; o.bag`) */
      const h = holderOf(node.object, path);
      if (h && ks && ks.length === 1 && h.has(ks[0])) return h.get(ks[0]);
      const ma = memberAliasOf(node, path);
      if (ma) return ma.c;
      /* one key, or a key that is any of several (`for (const f of STASH_FIELDS) ps[f]`), every one a container */
      if (ks && ks.length && ks.every((k) => CONTAINERS.has(k))) return ks.length === 1 ? ks[0] : ks.join('|');
      /* an element of a container (`ps.weaponStash[0]`, `inv.wood`): writing into it is writing the container */
      return itemOf(insideOf(node, path));
    }
    if (node.type === 'Identifier') {
      const b = path.scope.getBinding(node.name);
      return b && alias.has(b) ? alias.get(b) : null;
    }
    /* `a || b` / `a ?? b` may be either; `a && a.get(k)` is its right side only */
    if (node.type === 'LogicalExpression') return node.operator === '&&' ? containerOf(node.right, path) : (containerOf(node.left, path) || containerOf(node.right, path));
    if (node.type === 'ConditionalExpression') return containerOf(node.consequent, path) || containerOf(node.alternate, path);
    if (node.type === 'AssignmentExpression') return containerOf(node.left, path);
    if (node.type === 'CallExpression' || node.type === 'OptionalCallExpression') {
      const c = node.callee;
      const n = c.type === 'Identifier' ? c.name : ((c.type === 'MemberExpression' || c.type === 'OptionalMemberExpression') && !c.computed ? c.property.name : null);
      if (n && Object.prototype.hasOwnProperty.call(MAKERS, n)) return MAKERS[n];
      /* v2.3.6441 (sitting 57): an element FOUND in a container
         (`ps.weaponStash.find(...)`, `.at(i)`) is the
         container's: writing into it writes the container */
      if (n && ELEMENT_GETTERS.has(n) && c.type !== 'Identifier') return elementsOf(c.object, path);
      /* v2.3.6441 (sitting 58): a copy of its list (`.filter(...)`,
         `.slice()`, `Object.values(...)`, `Array.from(...)`) holds the
         container's own items: an item written through the copy is the
         container's (the copy's own slots are not: isCopy) */
      if (GLOBAL_COPIERS.has(globalName(c))) return elementsOf(node.arguments[0], path);
      if (n && LIST_COPIERS.has(n) && c.type !== 'Identifier') return elementsOf(c.object, path);
      /* a function of this file that hands back a container or an item of one */
      if (n && fnsByName.has(n) && (c.type === 'Identifier' || c.object.type === 'ThisExpression' || c.object.type === 'Identifier')) {
        for (const f of fnsByName.get(n)) if (fnReturns.has(f)) return fnReturns.get(f);
      }
      return null;
    }
    /* v2.3.6441 (sitting 58): a list written out with an item of a container
       in it, or a spread of one (`[...ps.weaponStash]`): its items are the
       container's */
    if (node.type === 'ArrayExpression') {
      for (const e of node.elements) {
        if (!e) continue;
        const c = e.type === 'SpreadElement' ? elementsOf(e.argument, path) : containerOf(e, path);
        if (c) return c;
      }
      return null;
    }
    if (node.type === 'ParenthesizedExpression' || node.type === 'AwaitExpression' || node.type === 'TSNonNullExpression') return containerOf(node.expression || node.argument, path);
    if (node.type === 'SequenceExpression') return containerOf(node.expressions[node.expressions.length - 1], path);
    return null;
  }
  /* v2.3.6441 (sitting 58): a NEW list of a container's items (a copy: its
     own slots and its own order are no write of the container); a sort or a
     reverse is the list it was called on, in place */
  function isCopy(node, path) {
    if (!node) return false;
    if (node.type === 'ArrayExpression') return true;
    if (node.type === 'Identifier') { const b = path.scope.getBinding(node.name); return !!b && copies.has(b); }
    if (node.type === 'MemberExpression' || node.type === 'OptionalMemberExpression') { const ma = memberAliasOf(node, path); return !!ma && ma.copy; }
    /* `Array.isArray(l) ? l.filter(Boolean) : []`: every side a copy */
    if (node.type === 'ConditionalExpression') return isCopy(node.consequent, path) && isCopy(node.alternate, path);
    if (node.type === 'LogicalExpression') return isCopy(node.left, path) && isCopy(node.right, path);
    if (node.type === 'CallExpression' || node.type === 'OptionalCallExpression') {
      const c = node.callee;
      if (GLOBAL_COPIERS.has(globalName(c))) return true;
      if ((c.type === 'MemberExpression' || c.type === 'OptionalMemberExpression') && !c.computed && c.property.type === 'Identifier' && LIST_COPIERS.has(c.property.name)) {
        return c.property.name === 'sort' || c.property.name === 'reverse' ? isCopy(c.object, path) : true;
      }
    }
    if (node.type === 'ParenthesizedExpression') return isCopy(node.expression, path);
    return false;
  }
  /* v2.3.6441: a node whose ELEMENTS are a container's own: the container
     (or an alias of it), or a copy of its list (`filter`, `slice`, `sort`,
     `concat`...: a new list, the same items) */
  function elementsOf(node, path) {
    const c = containerOf(node, path) || ((node && (node.type === 'MemberExpression' || node.type === 'OptionalMemberExpression')) ? insideOf(node, path) : null);
    if (c) return itemOf(c);
    if (node && (node.type === 'CallExpression' || node.type === 'OptionalCallExpression')) {
      const k = node.callee;
      if ((k.type === 'MemberExpression' || k.type === 'OptionalMemberExpression') && !k.computed && k.property.type === 'Identifier' && LIST_COPIERS.has(k.property.name)) return elementsOf(k.object, path);
    }
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
      /* v2.3.6441 (sitting 58): a slot of a COPY of a container's list (`const
         l = [...ps.weaponStash]; l[0] = x`, `l.length = 0`) is the copy's own */
      if (isCopy(node.object, path)) return;
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

  /* v2.3.6441 (sitting 57: `const patch = { coins }; Object.assign(ps,
     patch)` stayed green): the keys a SOURCE of Object.assign puts -- an
     object written out (and the spreads in it), or a name bound to one, with
     every key put into that name after (`patch.coins = n`, `patch[k] = n`
     with k known), a ternary or || of them */
  function sourceKeys(node, path, depth = 0) {
    if (!node || depth > 6) return [];
    if (node.type === 'ObjectExpression') {
      const ks = objectKeys(node, path);
      for (const p of node.properties) if (p.type === 'SpreadElement') ks.push(...sourceKeys(p.argument, path, depth + 1));
      return ks;
    }
    if (node.type === 'ConditionalExpression') return [...sourceKeys(node.consequent, path, depth + 1), ...sourceKeys(node.alternate, path, depth + 1)];
    if (node.type === 'LogicalExpression') return [...sourceKeys(node.left, path, depth + 1), ...sourceKeys(node.right, path, depth + 1)];
    if (node.type === 'Identifier') {
      const b = path.scope.getBinding(node.name);
      if (!b) return [];
      const ks = [];
      if (b.path.isVariableDeclarator() && b.path.node.id.type === 'Identifier') ks.push(...sourceKeys(b.path.node.init, b.path, depth + 1));
      for (const v of b.constantViolations || []) if (v.isAssignmentExpression() && v.node.left.type === 'Identifier') ks.push(...sourceKeys(v.node.right, v, depth + 1));
      for (const r of b.referencePaths) {
        const m = r.parentPath;
        if (!m || !(m.isMemberExpression() || m.isOptionalMemberExpression()) || m.node.object !== r.node) continue;
        const a = m.parentPath;
        const put = (a.isAssignmentExpression() && a.node.left === m.node) || (a.isUpdateExpression() && a.node.argument === m.node);
        if (!put) continue;
        const k = keysOf(m.node, m);
        if (k) ks.push(...k);
      }
      return ks;
    }
    return [];
  }

  /* pass 1: aliases (declarations, destructures), functions by name */
  const bindAlias = (path, id, field) => {
    if (!id || id.type !== 'Identifier') return false;
    const b = path.scope.getBinding(id.name);
    if (!b || alias.get(b) === field) return false;
    alias.set(b, field);
    return true;
  };
  /* v2.3.6441 (sitting 58): what flows into a binding: { c (the container
     its items are), copy (a new list of them), holder (keys -> container) } */
  const flowOf = (node, path) => {
    if (!node) return null;
    const c = containerOf(node, path), holder = holderOf(node, path);
    return c || holder ? { c, copy: !!c && isCopy(node, path), holder } : null;
  };
  const keyWords = (p, path) => (p.computed ? wordsOf(p.key, path) : [p.key.type === 'Identifier' ? p.key.name : String(p.key.value)]);
  /* bind a target (a name or a pattern) to what flows in; -> grew */
  function bindTarget(path, t, src, how) {
    if (!t) return false;
    switch (t.type) {
      case 'Identifier': {
        if (!src) return false;
        const b = path.scope.getBinding(t.name);
        if (!b) return false;
        let g = false;
        if (src.c && alias.get(b) !== src.c) { alias.set(b, src.c); g = true; }
        if (src.copy && !copies.has(b)) { copies.add(b); g = true; }
        if (src.holder && !holders.has(b)) { holders.set(b, src.holder); g = true; }
        return g;
      }
      case 'AssignmentPattern': {
        /* `const { inv = ps.inventory } = o`: the default flows in too */
        const d = flowOf(t.right, path);
        return bindTarget(path, t.left, src && src.c ? { c: src.c } : (d ? { c: d.c, holder: d.holder } : src), how);
      }
      case 'RestElement': return bindTarget(path, t.argument, src && src.c ? { c: src.c } : null, how);
      case 'ArrayPattern': {
        /* `const [first] = ps.weaponStash`: each part is an item of it */
        let g = false;
        const it = src && itemOf(src.c);
        for (const e of t.elements) g = bindTarget(path, e, it ? { c: it } : null, how + ' [pattern]') || g;
        return g;
      }
      case 'ObjectPattern': {
        let g = false;
        for (const p of t.properties) {
          if (p.type === 'RestElement') { g = bindTarget(path, p.argument, src && src.c ? { c: src.c } : null, how + ' {...rest}') || g; continue; }
          /* from a container or an item of one: every part is the container's */
          if (src && src.c) { const it = itemOf(src.c); if (it) g = bindTarget(path, p.value, { c: it }, how + ' {pattern}') || g; continue; }
          const k = keyWords(p, path);
          if (!k) { if (CONTAINERS.size) cannot(path, p, [...CONTAINERS].join('|'), how + ': a key the tree cannot know'); continue; }
          let c = null;
          if (src && src.holder) for (const x of k) if (src.holder.has(x)) c = src.holder.get(x);
          const ck = k.filter((x) => CONTAINERS.has(x));
          if (!c && ck.length) c = ck.join('|');
          g = bindTarget(path, p.value, c ? { c } : null, how + ' {pattern}') || g;
        }
        return g;
      }
      case 'MemberExpression': case 'OptionalMemberExpression': {
        /* put into a member: a write of a field (its key says it), or into a
           container (insideOf says it), or the container now lives where the
           scanner cannot follow it */
        if (!src || !src.c) return false;
        const ks = keysOf(t, path);
        if (insideOf(t, path) || (ks && ks.some((k) => FIELDS.has(k)))) return false;
        const mp = memberPath(t, path);
        if (!mp) { cannot(path, t, src.c, how + ': put into a member of something the scanner cannot name'); return false; }
        const rows = memberAlias.get(mp.root) || [];
        if (rows.some((r) => r.parts.length === mp.parts.length && r.parts.every((x, i) => x === mp.parts[i]) && r.c === src.c)) return false;
        rows.push({ parts: mp.parts, c: src.c, copy: !!src.copy });
        memberAlias.set(mp.root, rows);
        return true;
      }
      default:
        if (src && src.c) cannot(path, t, src.c, how + ': a form the scanner has no rule for (' + t.type + ')');
        return false;
    }
  }
  const visitAliases = () => {
    let grew = false;
    const loopOf = (path) => {
      /* for (const P of E) / for (P of E): each item of E */
      const l = path.node.left, target = l.type === 'VariableDeclaration' ? l.declarations[0].id : l;
      const at = l.type === 'VariableDeclaration' ? path.get('left.declarations.0') : path;
      const c = path.isForOfStatement() ? elementsOf(path.node.right, path) : null;
      grew = bindTarget(at, target, c ? { c } : null, 'for-of') || grew;   /* a pattern over records too: `for (const { weaponStash } of list)` */
    };
    traverse(ast, {
      ForOfStatement: loopOf,
      VariableDeclarator(path) {
        const { id, init } = path.node;
        if (!init) return;
        grew = bindTarget(path, id, flowOf(init, path), 'const') || grew;
      },
      AssignmentExpression(path) {
        const { left, right, operator } = path.node;
        if (!['=', '||=', '??=', '&&='].includes(operator)) return;
        grew = bindTarget(path, left, flowOf(right, path), 'assign') || grew;
      },
      /* a function of this file that hands back a container or an item of one */
      ReturnStatement(path) {
        const c = path.node.argument && containerOf(path.node.argument, path);
        const f = path.getFunctionParent();
        if (c && f && !fnReturns.has(f)) { fnReturns.set(f, c); grew = true; }
      },
      /* a parameter that is a pattern names its containers itself: `function give({ weaponStash }) {...}` */
      Function(path) {
        for (const prm of path.node.params) if (prm.type !== 'Identifier') grew = bindTarget(path, prm, null, 'parameter') || grew;
      },
      ArrowFunctionExpression(path) {
        const b = path.node.body;
        if (b.type === 'BlockStatement') return;
        const c = containerOf(b, path.get('body'));
        if (c && !fnReturns.has(path)) { fnReturns.set(path, c); grew = true; }
      },
      /* a function of this file handed a container: its parameter is an alias */
      CallExpression(path) {
        const { callee, arguments: args } = path.node;
        /* v2.3.6441: `ps.weaponStash.forEach((w) => { w.lvl = 99; })`: the
           callback's element parameter is the container's (any pattern: sitting 58) */
        if ((callee.type === 'MemberExpression' || callee.type === 'OptionalMemberExpression') && !callee.computed
          && callee.property.type === 'Identifier' && ELEMENT_CALLBACKS.has(callee.property.name)) {
          const cb = args[0];
          const c = cb && (cb.type === 'ArrowFunctionExpression' || cb.type === 'FunctionExpression') ? elementsOf(callee.object, path) : null;
          const prm = c ? cb.params[ELEMENT_CALLBACKS.get(callee.property.name)] : null;
          if (prm) grew = bindTarget(path.get('arguments.0'), prm, { c }, 'callback') || grew;
        }
        let name = null;
        if (callee.type === 'Identifier') name = callee.name;
        else if ((callee.type === 'MemberExpression' || callee.type === 'OptionalMemberExpression') && !callee.computed && callee.property.type === 'Identifier'
          && (callee.object.type === 'ThisExpression' || callee.object.type === 'Identifier')) name = callee.property.name;
        if (!name || !fnsByName.has(name)) return;
        args.forEach((a, i) => {
          const src = a.type === 'SpreadElement' ? null : flowOf(a, path);
          if (!src) return;
          for (const f of fnsByName.get(name)) {
            const prm = f.node.params[i];
            if (prm) grew = bindTarget(f, prm, src, 'parameter of ' + name) || grew;
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
  /* v2.3.6441: the calls of each function of this file, by name, for the
     words a parameter can be (`bump(ps, 'coins', 5)`) */
  const callsByName = new Map();
  traverse(ast, {
    'CallExpression|OptionalCallExpression'(path) {
      const c = path.node.callee;
      let name = null;
      if (c.type === 'Identifier') name = c.name;
      else if ((c.type === 'MemberExpression' || c.type === 'OptionalMemberExpression') && !c.computed && c.property.type === 'Identifier'
        && (c.object.type === 'ThisExpression' || c.object.type === 'Identifier')) name = c.property.name;
      if (!name || !fnsByName.has(name)) return;
      if (!callsByName.has(name)) callsByName.set(name, []);
      callsByName.get(name).push(path);
    },
  });
  const fnOfParam = (bind) => {
    const f = bind.path.parentPath;
    if (!f || !f.isFunction()) return null;
    const i = f.node.params.indexOf(bind.path.node);
    if (i < 0) return null;
    for (const [name, fns] of fnsByName) if (fns.includes(f)) return { name, i };
    return null;
  };
  const asking = new Set();
  PARAM_WORDS = (bind, depth) => {
    if (asking.has(bind) || depth > 6) return null;
    const at = fnOfParam(bind);
    const calls = at && callsByName.get(at.name);
    if (!calls || !calls.length) return null;
    asking.add(bind);
    try {
      const all = [];
      for (const cp of calls) {
        const a = cp.node.arguments[at.i];
        if (!a || a.type === 'SpreadElement') return null;
        const w = wordsOf(a, cp, depth + 1);
        if (!w) return null;
        all.push(...w);
      }
      return [...new Set(all)];
    } finally { asking.delete(bind); }
  };
  for (let i = 0; i < 12 && visitAliases(); i++) { /* to a fixed point */ }

  /* pass 2: the writes */
  traverse(ast, {
    AssignmentExpression(path) {
      target(path, path.node.left, 'assign ' + path.node.operator);
      /* a record rebuilt and put back: `t = { level: 1, xp: 0 }`, `p3.sk[cat] = { xp }`
         -- the object written out names a field */
      const r = path.node.right;
      if (r.type === 'ObjectExpression' && path.node.left.type !== 'Identifier' && !r.properties.some((p) => p.type === 'SpreadElement')) {
        for (const k of objectKeys(r, path)) if (FIELDS.has(k) && !CONTAINERS.has(k)) add(path, path.node, k, false, 'assign {' + k + '}', { text: srcOf(code, path.node.left) });
      }
    },
    UpdateExpression(path) { target(path, path.node.argument, 'update ' + path.node.operator); },
    /* a record rebuilt from a spread with a field put (`{ ...ps, coins: 5 }`)
       and put back into the room: straight into a member, or held in a name
       that is then put into one.  A copy sent or saved is no write. */
    ObjectExpression(path) {
      const props = path.node.properties;
      if (!props.some((p) => p.type === 'SpreadElement')) return;
      const keys = objectKeys(path.node, path).filter((k) => FIELDS.has(k));
      if (!keys.length) return;
      const isMemberPut = (pp) => pp && pp.isAssignmentExpression() && pp.node.left.type !== 'Identifier';
      let back = isMemberPut(path.parentPath) && path.parentPath.node.right === path.node;
      if (!back && path.parentPath.isVariableDeclarator() && path.parentPath.node.id.type === 'Identifier') {
        const bnd = path.parentPath.scope.getBinding(path.parentPath.node.id.name);
        back = !!bnd && bnd.referencePaths.some((r) => isMemberPut(r.parentPath) && r.parentPath.node.right === r.node);
      }
      if (back) for (const k of keys) add(path, path.node, k, false, 'rebuilt {...,' + k + '} put back', { text: '{...}' });
    },
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
        if (prop === 'assign' || prop === 'defineProperties') for (const s of args.slice(1)) ks.push(...sourceKeys(s, path));
        else { const w = wordsOf(args[1], path); if (w) ks = w; }
        for (const k of ks) if (FIELDS.has(k)) add(path, path.node, k, false, how, { text: srcOf(code, t) });
        return;
      }
      /* a list's own changers on a container */
      if (prop && LIST_CHANGERS.has(prop)) {
        const c = isCopy(callee.object, path) ? null   /* a copy's own order (`[...ps.weaponStash].sort(...)`) */
          : containerOf(callee.object, path) || ((callee.object.type === 'MemberExpression') ? insideOf(callee.object, path) : null);
        if (c) add(path, path.node, c, true, '.' + prop + '()', { text: srcOf(code, callee.object) });
      }
    },
  });
  /* v2.3.6441 (sitting 58): what the scanner could not follow is a write (deny by default) */
  for (const u of unfollowed.values()) add(u.path, u.node, u.field, true, u.how, { text: srcOf(code, u.node) });
  out.sort((a, b) => a.line - b.line);
  return out;
  }
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
      out[out.length - 1].argSrc = parent.node.arguments.map((a) => srcOf(code, a));   /* each argument as written (a road handed on: `road`) */
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
    /* only asked whether it is there: `if (this._gearStashLiveAdd)`, `x && x()`, `typeof`, `!` */
    /* the name PUT (`x.send = f`): a door replaced, or a field of the same name */
    if (parent.isAssignmentExpression() && parent.node.left === node) { push(path, node, name, 'put', null, recv); return; }
    let up = path, top = parent;
    while (top.isLogicalExpression()) { up = top; top = top.parentPath; }
    if ((top.isIfStatement() || top.isConditionalExpression()) && top.node.test === up.node) { push(path, node, name, 'test', null, recv); return; }
    if (parent.isLogicalExpression() && parent.node.left === node && parent.node.operator === '&&') { push(path, node, name, 'test', null, recv); return; }
    if (parent.isUnaryExpression() && (parent.node.operator === 'typeof' || parent.node.operator === '!')) { push(path, node, name, 'test', null, recv); return; }
    push(path, node, name, parent.isVariableDeclarator() || parent.isAssignmentExpression() ? 'alias' : 'value', null, recv);
  }
  traverse(ast, {
    MemberExpression(path) { visitMember(path); },
    OptionalMemberExpression(path) { visitMember(path); },
    Identifier(path) {
      const n = path.node;
      if (!NAMES.has(n.name) || opts.membersOnly) return;   /* membersOnly: a socket's `.send`, never a local `send` */
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

/* ── THE DOOR TESTS' TWO QUESTIONS (v2.3.6441) ──────────────────────────── */

/**
 * Who writes a door's fields, outside the door's own files.
 *   code: { file: source }   (server/src, comments and all: the tree skips them)
 *   opts: { skip: [the door's files], fields, containers, makers, words,
 *           keep(write) -> false to leave a write out (a monster's `m.hp`),
 *           listed: [{ file, fn, field, n, why }] }
 * A listed row is keyed by its FILE, its FUNCTION and its FIELD (never a
 * line's text, never '*'), and says how many writes it holds (`n`): a second
 * spelling in a listed function is one too many.
 * -> { found: [write] not listed, stale: [row] whose count is not `n`,
 *      writes: every write seen, listed or not }
 */
export function doorWrites(code, opts = {}) {
  const skip = new Set(opts.skip || []);
  const listed = opts.listed || [];
  for (const r of listed) if (!r.file || r.file === '*' || !r.fn || !r.field || !(r.n >= 1)) throw new Error('doorWrites: a listed row names its file, its function, its field and its count: ' + JSON.stringify(r));
  const got = new Map(listed.map((r) => [r, []]));
  const found = [];
  const writes = [];
  for (const f of Object.keys(code)) {
    if (skip.has(f)) continue;
    for (const w of writesOf(code[f], { ...opts, file: f })) {
      if (opts.keep && !opts.keep(w)) continue;
      writes.push(w);
      const row = listed.find((r) => r.file === f && r.fn === w.fn && r.field === w.field);
      if (row) got.get(row).push(w);
      else found.push(w);
    }
  }
  const stale = listed.filter((r) => got.get(r).length !== r.n).map((r) => ({ ...r, seen: got.get(r).length, at: got.get(r).map((w) => w.line) }));
  return { found, stale, writes };
}

/**
 * Every reference to a door's methods, outside the door's own files, by any
 * receiver (`this`, `room`, `r`, a destructure): a plain call is a CALL with
 * its road read off its arguments; anything else (`.bind`, `.call`, `.apply`,
 * a name made of it, handed on as a value) is ODD (only asking whether it
 * is there, `if (this._gearStashLiveAdd)`, is neither) -- a door is called
 * plainly, so its every caller can be counted.
 *   opts: { skip: [files], names: [method], membersOnly (a member `x.name`
 *           only, never a local name: a socket's `.send`), road(args, ref) -> road | null
 *           (default: the last literal word among the arguments) }
 * -> { calls: [ref + { road }], odd: [ref] }
 */
export function doorCalls(code, opts = {}) {
  const skip = new Set(opts.skip || []);
  const road = opts.road || ((args) => { for (let i = args.length - 1; i >= 0; i--) if (args[i] != null) return args[i]; return null; });
  const calls = [];
  const odd = [];
  for (const f of Object.keys(code)) {
    if (skip.has(f)) continue;
    for (const r of refsOf(code[f], opts.names || [], { file: f, membersOnly: !!opts.membersOnly })) {
      if (r.how === 'call') calls.push({ ...r, road: road(r.args, r) });
      else if (r.how !== 'test') odd.push(r);
    }
  }
  return { calls, odd };
}

/* `file:line text`, for a failure's list */
export const where = (w) => w.file + ':' + w.line + ' ' + (w.fn ? '[' + w.fn + '] ' : '') + String(w.text || '').slice(0, 110);

/* the tree's own walk, for a test's question the two above do not ask
   (an object literal that names the life phase) */
export function visit(code, visitors) { babel().traverse(parse(code), visitors); }

/**
 * A road's call one step out: the function that holds a door's call is
 * called from ONE place (its router case, its one caller), or it is a
 * listed FORWARDER whose callers are named.  A second caller of a function
 * that pays through a legal road (the mail's `_applyCreditToPs` called from
 * a quest's turn-in, plants1 GOLD-4) is a second payment the road's own
 * count never sees.
 *   calls: doorCalls(...).calls
 *   listed: [{ fn, callers: ['file fn', ...] (one a call), why }]
 * -> { bad: [{ fn, callers }], stale: [row] }
 */
export function doorHolders(code, calls, listed = []) {
  const byName = new Map(listed.map((r) => [r.fn, r]));
  const bad = [];
  const seen = new Set();
  const fns = [...new Set(calls.map((c) => c.fn))].filter((fn) => fn !== '(top)').sort();
  /* v2.3.6441 (sitting 57's CI: gold-door ran 46 s, past the switches'
     180 s on the runner): ONE walk of each file for every name, not one a
     name (47 names x 208 files was 20 s of the suite's 25) */
  const refs = new Map(fns.map((fn) => [fn, []]));
  if (fns.length) for (const f of Object.keys(code)) for (const r of refsOf(code[f], fns, { file: f })) if (r.how !== 'test' && refs.has(r.name)) refs.get(r.name).push(r.file + ' ' + r.fn + (r.how === 'call' ? '' : ' (' + r.how + ')'));
  for (const fn of fns) {
    const callers = refs.get(fn);
    callers.sort();
    const row = byName.get(fn);
    if (row) { seen.add(row); if (JSON.stringify([...row.callers].sort()) !== JSON.stringify(callers)) bad.push({ fn, callers, listed: row.callers }); continue; }
    if (callers.length > 1) bad.push({ fn, callers });
  }
  return { bad, stale: listed.filter((r) => !seen.has(r)) };
}

/* the words an expression can be, read off the tree (a literal, a template
   with nothing in it, a const bound to one, `'a' + 'b'`, a ternary of them);
   null when it cannot be known.  For a census of names (wire-audit's types). */
export function wordsAt(node, path) { return wordsOf(node, path); }

/* ═══ v2.3.6446 (sitting 59): WHAT A HANDLER READS OFF A MESSAGE ═══
 *
 * WHY.  wire-hostile's reach (v2.3.6444, card DG PR 5) watches the message
 * a case sends with a Proxy, so it holds only the reads a case REACHES: the
 * review of sitting 59 planted `if (msg.lucky) ...` behind a gate no case
 * passes (dice.js), a handler that returns right after its destructure
 * (quests.js: the names counted as "read" though nothing used them) and
 * `msg.length` (the Proxy's NOT_A_FIELD words were held to nothing), and
 * all three stayed green.  A read the running room cannot reach is held
 * here, off the syntax tree.
 *
 *   msgReadsOf(files, { entry: { file, fn, param }, types, skip })
 *     -> { reads: [read], faults: [fault] }
 *     files: { 'index.js': code, ... } (server/src, its paths from there);
 *     entry: the router (index.js _onMessage, the message its param 2);
 *     types: the message types the door lets in (the socket rows' names);
 *     skip: calls not followed, by name (the door itself, `_wireDoor`,
 *     which reads by the table before any handler).
 *   From the entry, every function the message is HANDED to is read as
 *   well: a method of the room (`this._x(msg)`, `room._x(p)`), a function
 *   of the same file or one it imports, a row of a table keyed by the
 *   message's type (`T[msg.type](...)`, `const row = T[msg.type];
 *   row.refuse(...)`), `fn.call(this, msg)`.  Which types reach a read is
 *   read off the tree too: the router's `case`, a test of `msg.type`
 *   (`===`, `||`, a Set's `has`, `own(T, msg.type)`), an early return.
 *   read:  { types: Set, field, file, line, fn, live, how }
 *     a member read of the message or its payload (`msg.x`, `msg['x']`, a
 *     key the tree knows, `const { x } = msg`, `own(msg, 'x')`, `'x' in
 *     msg`), through any alias (`const p = msg.payload || msg`).  `live`
 *     is false when the read sits after a return (or a throw, a break) or
 *     when its value is bound to a name nothing live uses (a destructure
 *     whose names are never used is NO read: the review's quests.js plant).
 *   fault: { types, file, line, fn, what, text }
 *     DENY BY DEFAULT: every other appearance of the message -- a computed
 *     key the tree cannot know, a spread or a copy (`{ ...msg }`,
 *     Object.keys, JSON.stringify), a rest, the message stored in an object
 *     or a list or a member, handed to a function it cannot find, called,
 *     awaited, coerced to a string, a write of it -- is a fault, never
 *     passed for being unknown. */
const MSG_HARMLESS = new Set(['Array.isArray', 'Object.getPrototypeOf', 'Object.isFrozen']);
const MSG_LISTS_KEYS = new Set(['Object.keys', 'Object.values', 'Object.entries', 'Object.assign', 'Object.getOwnPropertyNames',
  'Object.fromEntries', 'Reflect.ownKeys', 'JSON.stringify', 'structuredClone', 'Object.freeze', 'Object.create']);
const MSG_HAS_KEY = new Set(['Object.hasOwn', 'Reflect.has', 'Reflect.get', 'Object.prototype.hasOwnProperty.call']);
const dotted = (n) => (n && n.type === 'Identifier' ? n.name
  : n && n.type === 'ThisExpression' ? 'this'
  : n && n.type === 'MemberExpression' && !n.computed && n.property.type === 'Identifier' ? (dotted(n.object) ? dotted(n.object) + '.' + n.property.name : null)
  : null);
const FN_TYPES = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression', 'ObjectMethod', 'ClassMethod']);
const STMT_LISTS = new Set(['BlockStatement', 'Program', 'SwitchCase', 'StaticBlock']);
const EXITS = new Set(['ReturnStatement', 'ThrowStatement', 'BreakStatement', 'ContinueStatement']);
const stmtList = (n) => (Array.isArray(n.body) ? n.body : Array.isArray(n.consequent) ? n.consequent : null);

export function msgReadsOf(files, { entry, types, skip = [], tables = {} }) {
  const { traverse } = babel();
  const ALL = new Set(types);
  const SKIP = new Set(skip);
  const F = new Map();   /* file -> { code, tops, consts, imports } */
  const methods = new Map();   /* name -> [{ file, path }] */
  for (const [file, code] of Object.entries(files)) {
    const ast = parse(code);
    const rec = { code, ast, tops: new Map(), consts: new Map(), imports: new Map() };
    F.set(file, rec);
    const addM = (name, path) => { if (!methods.has(name)) methods.set(name, []); methods.get(name).push({ file, path }); };
    traverse(ast, {
      ObjectMethod(p) { if (!p.node.computed && p.node.key.type === 'Identifier') addM(p.node.key.name, p); },
      ClassMethod(p) { if (!p.node.computed && p.node.key.type === 'Identifier') addM(p.node.key.name, p); },
      ObjectProperty(p) {
        const v = p.node.value;
        if (!p.node.computed && p.node.key.type === 'Identifier' && (v.type === 'FunctionExpression' || v.type === 'ArrowFunctionExpression')) addM(p.node.key.name, p.get('value'));
      },
      FunctionDeclaration(p) { if (p.parentPath.isProgram() || p.parentPath.isExportNamedDeclaration() || p.parentPath.isExportDefaultDeclaration()) rec.tops.set(p.node.id ? p.node.id.name : 'default', p); },
      VariableDeclarator(p) {
        const at = p.parentPath.parentPath;
        if (!(at.isProgram() || at.isExportNamedDeclaration()) || p.node.id.type !== 'Identifier') return;
        rec.consts.set(p.node.id.name, p);
        const i = p.node.init;
        if (i && (i.type === 'FunctionExpression' || i.type === 'ArrowFunctionExpression')) rec.tops.set(p.node.id.name, p.get('init'));
      },
      ImportDeclaration(p) {
        const src = p.node.source.value;
        if (!src.startsWith('.')) return;
        const base = file.includes('/') ? file.slice(0, file.lastIndexOf('/') + 1) : '';
        const out = [];
        for (const s of (base + src).split('/')) { if (s === '..') out.pop(); else if (s !== '.') out.push(s); }
        const to = out.join('/');
        for (const s of p.node.specifiers) rec.imports.set(s.local.name, { file: to, name: s.type === 'ImportSpecifier' ? (s.imported.name || s.imported.value) : 'default' });
      },
    });
  }
  const reads = [], faults = [];
  const lineOf = (n) => (n && n.loc ? n.loc.start.line : 0);
  const textOf = (file, n) => { const c = F.get(file).code; return n && n.start != null ? c.slice(n.start, n.end).split('\n')[0].slice(0, 120) : ''; };

  /* a top-level const or function, of this file or the one it imports */
  function declOf(file, name, depth = 0) {
    const rec = F.get(file);
    if (!rec || depth > 4) return null;
    if (rec.tops.has(name)) return { file, name, path: rec.tops.get(name), kind: 'fn' };
    if (rec.consts.has(name)) return { file, name, path: rec.consts.get(name), kind: 'const' };
    const im = rec.imports.get(name);
    if (im && F.has(im.file)) return declOf(im.file, im.name, depth + 1);
    return null;
  }
  /* an object literal a name holds (a table keyed by type): `{...}`, Object.freeze({...}) */
  function objLit(file, node, path, depth = 0) {
    if (!node || depth > 4) return null;
    if (node.type === 'ObjectExpression') return { file, node };
    if (node.type === 'CallExpression' && ['Object.freeze', 'Object.assign'].includes(dotted(node.callee))) return objLit(file, node.arguments[node.arguments.length - 1], path, depth + 1);
    if (node.type === 'Identifier') {
      const b = path && path.scope.getBinding(node.name);
      const d = declOf(file, node.name);
      /* `tables`: a table built at run time (Object.fromEntries over another), read as the literal the test names */
      if (d && d.kind === 'const' && (!b || b.kind === 'module' || b.path === d.path) && tables[d.file + ':' + d.name]) {
        const t = declOf(d.file, tables[d.file + ':' + d.name]);
        return t && t.kind === 'const' ? objLit(t.file, t.path.node.init, t.path, depth + 1) : null;
      }
      if (b && b.kind !== 'module' && b.path.isVariableDeclarator()) return objLit(file, b.path.node.init, b.path, depth + 1);
      if (d && d.kind === 'const') return objLit(d.file, d.path.node.init, d.path, depth + 1);
    }
    return null;
  }
  function setWords(file, node, path, depth = 0) {
    if (!node || depth > 4) return null;
    if (node.type === 'NewExpression' && dotted(node.callee) === 'Set' && node.arguments[0]) return listWords(node.arguments[0], path) || null;
    if (node.type === 'CallExpression' && dotted(node.callee) === 'Object.freeze') return setWords(file, node.arguments[0], path, depth + 1);
    if (node.type === 'Identifier') {
      const b = path && path.scope.getBinding(node.name);
      if (b && b.kind !== 'module' && b.path.isVariableDeclarator()) return setWords(file, b.path.node.init, b.path, depth + 1);
      const d = declOf(file, node.name);
      if (d && d.kind === 'const') return setWords(d.file, d.path.node.init, d.path, depth + 1);
    }
    return null;
  }
  const keyName = (p) => (p.key.type === 'Identifier' ? p.key.name : String(p.key.value));
  const keysOfLit = (o) => o.node.properties.filter((p) => (p.type === 'ObjectProperty' || p.type === 'ObjectMethod') && !p.computed).map(keyName);
  const inter = (a, b) => (b ? new Set([...a].filter((x) => b.has(x))) : a);

  /* the functions a value of a type table's row is: a function written there, a name of a function */
  function fnsOfValue(file, node) {
    if (!node) return null;
    if (node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') return [{ file, node }];
    if (node.type === 'Identifier') { const d = declOf(file, node.name); if (d && d.kind === 'fn') return [{ file: d.file, path: d.path }]; }
    /* a function a maker of this file hands back: `refuse: resend(['coins'])`, `const resend = (f) => (room, pid) => ...` */
    if (node.type === 'CallExpression' && node.callee.type === 'Identifier') {
      const d = declOf(file, node.callee.name);
      if (!d || d.kind !== 'fn') return null;
      const fnN = d.path.node, out = [];
      if (fnN.body.type !== 'BlockStatement') return FN_TYPES.has(fnN.body.type) ? [{ file: d.file, node: fnN.body }] : null;
      let ok = true;
      d.path.traverse({ ReturnStatement(q) {
        if (q.getFunctionParent().node !== fnN) return;
        if (q.node.argument && FN_TYPES.has(q.node.argument.type)) out.push({ file: d.file, node: q.node.argument }); else ok = false;
      } });
      return ok && out.length ? out : null;
    }
    return null;
  }
  /* the path of a node inside a file's tree, found by its place (a table's row written in another file) */
  const pathCache = new Map();
  function pathOfNode(file, node) {
    const key = file + ':' + node.start;
    if (pathCache.has(key)) return pathCache.get(key);
    let found = null;
    traverse(F.get(file).ast, { enter(p) { if (p.node === node) { found = p; p.stop(); } } });
    pathCache.set(key, found);
    return found;
  }

  const memo = new Map();
  const paramWords = new Map();   /* binding -> words: a parameter's words from its caller */
  const prevHook = PARAM_WORDS;
  PARAM_WORDS = (bind) => (paramWords.has(bind) ? paramWords.get(bind) : null);
  try {
    const ent = (methods.get(entry.fn) || []).find((m) => m.file === entry.file);
    if (!ent) faults.push({ types: ALL, file: entry.file, line: 0, fn: entry.fn, what: 'no entry ' + entry.fn, text: '' });
    else analyze(entry.file, ent.path, entry.param, ALL, []);
  } finally { PARAM_WORDS = prevHook; }
  return { reads, faults };

  function analyze(file, fnPath, idx, ctx, argWords, typeArgs = [], root = true) {
    if (!ctx.size) return { returns: false };
    const key = file + ':' + fnPath.node.start + ':' + idx + ':' + [...ctx].sort().join(',') + ':' + JSON.stringify(argWords) + ':' + typeArgs.join(',') + ':' + root;
    if (memo.has(key)) return memo.get(key);
    const res = { returns: false };
    memo.set(key, res);
    const A = { file, fnPath, ctx, tracked: new Set(), root: new Set(), typeAlias: new Set(), res, fn: fnName(fnPath.get('body')) };
    const params = fnPath.get('params');
    const saved = [];
    params.forEach((pp, j) => {
      const w = argWords[j];
      if (j === idx || !w || !pp.isIdentifier()) return;
      const b = fnPath.scope.getBinding(pp.node.name);
      if (b) { saved.push([b, paramWords.get(b)]); paramWords.set(b, w); }
    });
    /* a parameter handed the message's type (`this._x(session, msg.type, p)`) narrows as msg.type does */
    for (const j of typeArgs) { const pp = params[j]; if (pp && pp.isIdentifier()) { const b = fnPath.scope.getBinding(pp.node.name); if (b) A.typeAlias.add(b); } }
    try {
      let p = params[idx];
      if (!p) return res;
      if (p.isAssignmentPattern()) p = p.get('left');
      if (p.isIdentifier()) { const b = fnPath.scope.getBinding(p.node.name); if (b) track(A, b, root); }
      else if (p.isObjectPattern()) destructure(A, p, p, root);
      else fault(A, p, 'the message taken by a ' + p.node.type);
      /* `arguments` hands the message on unnamed */
      fnPath.traverse({ Identifier(q) { if (q.node.name === 'arguments' && !q.scope.getBinding('arguments') && q.isReferencedIdentifier() && q.getFunctionParent() && q.getFunctionParent().node === fnPath.node) fault(A, q, 'arguments (the message handed on unnamed)'); } });
    } finally { for (const [b, w] of saved) { if (w === undefined) paramWords.delete(b); else paramWords.set(b, w); } }
    return res;
  }
  function fault(A, path, what) {
    faults.push({ types: ctxAt(A, path), file: A.file, line: lineOf(path.node), fn: A.fn, what, text: textOf(A.file, path.node) });
  }
  /* root: the binding holds the message itself (not its payload, nor
     `msg.payload || msg`): only ITS `type` is the message's type */
  function track(A, b, root = false) {
    if (A.tracked.has(b)) return;
    A.tracked.add(b);
    if (root) A.root.add(b);
    for (const r of b.referencePaths) useOf(A, r, root);
    for (const v of b.constantViolations) {
      if ((v.isAssignmentExpression() && v.node.operator !== '=') || v.isUpdateExpression()) fault(A, v, 'the message changed by ' + v.node.operator);
    }
  }
  /* a node after a return, a throw, a break or a continue (inside A's function) */
  function dead(A, path) {
    for (let p = path; p && p.parentPath && p.node !== A.fnPath.node; p = p.parentPath) {
      if (typeof p.key === 'number' && STMT_LISTS.has(p.parentPath.node.type)) {
        const list = stmtList(p.parentPath.node);
        if (list && list[p.key] === p.node) for (let i = 0; i < p.key; i++) if (EXITS.has(list[i].type)) return true;
      }
    }
    return false;
  }
  function usedLive(A, b) { return !!b && b.referencePaths.some((r) => !dead(A, r)); }
  function isTracked(A, node, path) {
    if (!node) return false;
    if (node.type === 'Identifier') { const b = path.scope.getBinding(node.name); return !!b && A.tracked.has(b); }
    if ((node.type === 'MemberExpression' || node.type === 'OptionalMemberExpression') && !node.computed && node.property.name === 'payload') return isTracked(A, node.object, path);
    return false;
  }
  function isTypeRead(A, node, path) {
    if (!node) return false;
    if (node.type === 'Identifier') { const b = path.scope.getBinding(node.name); return !!b && A.typeAlias.has(b); }
    if (!((node.type === 'MemberExpression' || node.type === 'OptionalMemberExpression') && !node.computed && node.property.name === 'type' && node.object.type === 'Identifier')) return false;
    const b = path.scope.getBinding(node.object.name);
    return !!b && A.root.has(b);
  }
  /* the types a test lets through when it is true (neg: when false); null: it does not say */
  function typesOfTest(A, node, path, neg = false) {
    if (!node) return null;
    if (node.type === 'UnaryExpression' && node.operator === '!') return typesOfTest(A, node.argument, path, !neg);
    if (node.type === 'LogicalExpression' && (node.operator === '||' || node.operator === '&&')) {
      const a = typesOfTest(A, node.left, path, neg), b = typesOfTest(A, node.right, path, neg);
      if ((node.operator === '||') !== neg) return a && b ? new Set([...a, ...b]) : null;
      return a && b ? inter(a, b) : (a || b);
    }
    if (node.type === 'BinaryExpression' && ['===', '==', '!==', '!='].includes(node.operator)) {
      const eq = (node.operator === '===' || node.operator === '==') !== neg;
      let w = null;
      if (isTypeRead(A, node.left, path)) w = wordsOf(node.right, path);
      else if (isTypeRead(A, node.right, path)) w = wordsOf(node.left, path);
      else {
        /* both sides known words (a parameter its callers hand a word): the test is decided */
        const l = wordsOf(node.left, path), r = wordsOf(node.right, path);
        if (!l || !r) return null;
        const always = l.length === 1 && r.length === 1 && l[0] === r[0], never = !l.some((x) => r.includes(x));
        if (eq ? never : always) return new Set();
        return null;
      }
      if (!w) return null;
      return eq ? new Set(w) : new Set([...ALL].filter((t) => !w.includes(t)));
    }
    if (neg || node.type !== 'CallExpression') return null;
    const c = node.callee, args = node.arguments;
    /* SET.has(msg.type) */
    if (c.type === 'MemberExpression' && !c.computed && c.property.name === 'has' && args.length === 1 && isTypeRead(A, args[0], path)) {
      const w = setWords(A.file, c.object, path);
      return w ? new Set(w) : null;
    }
    /* own(T, msg.type) */
    if (args.length === 2 && isTypeRead(A, args[1], path) && (dotted(c) === 'own' || dotted(c) === 'Object.hasOwn')) {
      const o = objLit(A.file, args[0], path);
      return o ? new Set(keysOfLit(o)) : null;
    }
    return null;
  }
  /* the types that reach a node inside A's function */
  function ctxAt(A, path) {
    let ctx = A.ctx;
    for (let p = path; p && p.parentPath && p.node !== A.fnPath.node; p = p.parentPath) {
      const par = p.parentPath;
      if ((par.isIfStatement() || par.isConditionalExpression()) && p.key === 'consequent') ctx = inter(ctx, typesOfTest(A, par.node.test, par));
      else if ((par.isIfStatement() || par.isConditionalExpression()) && p.key === 'alternate') ctx = inter(ctx, typesOfTest(A, par.node.test, par, true));
      else if (par.isLogicalExpression() && p.key === 'right' && par.node.operator === '&&') ctx = inter(ctx, typesOfTest(A, par.node.left, par));
      else if (par.isLogicalExpression() && p.key === 'right' && par.node.operator === '||') ctx = inter(ctx, typesOfTest(A, par.node.left, par, true));
      else if (par.isSwitchCase() && p.listKey === 'consequent' && isTypeRead(A, par.parentPath.node.discriminant, par.parentPath)) {
        const sw = par.parentPath, cases = sw.node.cases, i = cases.indexOf(par.node);
        if (par.node.test) {
          /* this case's word and those of the empty cases that fall into it */
          const w = new Set();
          let ok = true;
          for (let j = i; j >= 0; j--) {
            if (j < i && cases[j].consequent.length) break;
            const ww = cases[j].test ? wordsOf(cases[j].test, sw) : null;
            if (!ww) { ok = false; break; }
            ww.forEach((x) => w.add(x));
          }
          if (ok) ctx = inter(ctx, w);
        } else {
          const named = new Set();
          for (const c of cases) if (c.test) (wordsOf(c.test, sw) || []).forEach((x) => named.add(x));
          ctx = new Set([...ctx].filter((t) => !named.has(t)));
        }
      }
      /* an early way out before this statement: `if (msg.type !== 'x') return;` */
      if (typeof p.key === 'number' && STMT_LISTS.has(par.node.type)) {
        const list = stmtList(par.node);
        if (list && list[p.key] === p.node) for (let i = 0; i < p.key; i++) {
          const s = list[i];
          const out = s.type === 'IfStatement' && !s.alternate && (EXITS.has(s.consequent.type)
            || (s.consequent.type === 'BlockStatement' && s.consequent.body.length && EXITS.has(s.consequent.body[s.consequent.body.length - 1].type)));
          if (out) ctx = inter(ctx, typesOfTest(A, s.test, par, true));
        }
      }
    }
    return ctx;
  }
  function read(A, path, field, how, valuePath) {
    let live = !dead(A, path);
    /* a value bound to a name nothing live uses is no read */
    if (live && valuePath && valuePath.parentPath && valuePath.parentPath.isVariableDeclarator() && valuePath.key === 'init' && valuePath.parentPath.node.id.type === 'Identifier') {
      if (!usedLive(A, valuePath.parentPath.scope.getBinding(valuePath.parentPath.node.id.name))) live = false;
    }
    reads.push({ types: ctxAt(A, path), field, file: A.file, line: lineOf(path.node), fn: A.fn, live, how, text: textOf(A.file, path.node) });
  }
  function destructure(A, pat, at, root = false) {
    for (const prop of pat.get('properties')) {
      if (prop.isRestElement()) { fault(A, prop, 'a rest of the message (`...rest`: its keys listed)'); continue; }
      const ks = prop.node.computed ? wordsOf(prop.node.key, prop) : [keyName(prop.node)];
      if (!ks) { fault(A, prop, 'a computed key the tree cannot know, destructured'); continue; }
      let v = prop.get('value');
      if (v.isAssignmentPattern()) v = v.get('left');
      for (const f of ks) {
        const base = { types: ctxAt(A, at), field: f, file: A.file, line: lineOf(prop.node), fn: A.fn, how: 'destructure', text: textOf(A.file, prop.node) };
        if (v.isIdentifier()) {
          const b = v.scope.getBinding(v.node.name);
          reads.push({ ...base, live: !dead(A, at) && usedLive(A, b) });
          if (f === 'payload' && b) track(A, b);
          if (f === 'type' && b && root) A.typeAlias.add(b);
        } else if (v.isObjectPattern() || v.isArrayPattern()) {
          reads.push({ ...base, live: !dead(A, at) });
          if (f === 'payload') { if (v.isObjectPattern()) destructure(A, v, at); else fault(A, v, 'the payload taken by a list pattern'); }
        } else fault(A, v, 'a destructure the tree cannot follow (' + v.node.type + ')');
      }
    }
  }
  /* `path` is an expression that holds the message (or its payload) */
  function useOf(A, path, root = false) {
    const par = path.parentPath, pn = par.node, k = path.key;
    switch (pn.type) {
      case 'MemberExpression': case 'OptionalMemberExpression': {
        if (k !== 'object') return fault(A, par, 'the message used as a key');
        const ks = keysOf(pn, par) || loopKeys(A, pn.property, par);
        if (!ks) return fault(A, par, 'a computed key the tree cannot know');
        const gp = par.parentPath;
        if ((gp.isAssignmentExpression() && par.key === 'left') || gp.isUpdateExpression() || (gp.isUnaryExpression() && gp.node.operator === 'delete')) return fault(A, gp, 'a write of the message (' + ks.join('|') + ')');
        for (const f of ks) {
          if (f === 'type' && root && gp.isVariableDeclarator() && gp.node.id.type === 'Identifier') { const b = gp.scope.getBinding(gp.node.id.name); if (b) A.typeAlias.add(b); }
          read(A, par, f, 'member', par);
        }
        if (ks.includes('payload')) useOf(A, par);
        return;
      }
      case 'VariableDeclarator': {
        if (k !== 'init') return fault(A, par, 'a form the tree cannot follow (VariableDeclarator)');
        const id = par.get('id');
        if (id.isIdentifier()) { const b = par.scope.getBinding(id.node.name); if (b) track(A, b, root); return; }
        if (id.isObjectPattern()) return destructure(A, id, par, root);
        return fault(A, par, 'the message taken by a ' + id.node.type);
      }
      case 'AssignmentExpression': {
        if (k !== 'right') return fault(A, par, 'a write of the message');
        const l = par.get('left');
        if (pn.operator === '=' && l.isIdentifier()) { const b = par.scope.getBinding(l.node.name); if (b) { track(A, b, root && A.root.has(b)); return useOf(A, par, root); } return fault(A, par, 'the message put in a global'); }
        if (pn.operator === '=' && l.isObjectPattern()) return destructure(A, l, par, root);
        return fault(A, par, 'the message stored (' + textOf(A.file, pn.left) + ')');
      }
      case 'LogicalExpression':
        if (pn.operator === '&&' && k === 'left') return;   /* a test */
        return useOf(A, par, root && !isTracked(A, k === 'left' ? pn.right : pn.left, par));
      case 'ConditionalExpression':
        if (k === 'test') return;
        return useOf(A, par, root && !isTracked(A, k === 'consequent' ? pn.alternate : pn.consequent, par));
      case 'ParenthesizedExpression': case 'TSAsExpression': case 'TSNonNullExpression':
        return useOf(A, par, root);
      case 'SequenceExpression':
        if (k === pn.expressions.length - 1) return useOf(A, par, root);
        return;
      case 'UnaryExpression':
        if (pn.operator === 'typeof' || pn.operator === '!' || pn.operator === 'void') return;
        return fault(A, par, 'the message coerced (' + pn.operator + ')');
      case 'BinaryExpression':
        if (['===', '!==', '==', '!=', 'instanceof'].includes(pn.operator)) return;
        if (pn.operator === 'in' && k === 'right') {
          const w = wordsOf(pn.left, par);
          if (!w) return fault(A, par, 'a key the tree cannot know, asked with `in`');
          for (const f of w) read(A, par, f, 'in');
          return;
        }
        return fault(A, par, 'the message coerced (' + pn.operator + ')');
      case 'IfStatement': case 'WhileStatement': case 'DoWhileStatement': case 'ForStatement':
        if (k === 'test') return;
        return fault(A, par, 'a form the tree cannot follow (' + pn.type + ')');
      case 'ExpressionStatement': return;
      case 'CallExpression': case 'OptionalCallExpression': case 'NewExpression':
        if (k === 'callee') return fault(A, par, 'the message called');
        return handedTo(A, par, path.key, root);
      case 'ReturnStatement':
        if (par.getFunctionParent() && par.getFunctionParent().node === A.fnPath.node) { A.res.returns = true; return; }
        return fault(A, par, 'the message returned from an inner function');
      case 'ArrowFunctionExpression':
        if (k === 'body' && pn === A.fnPath.node) { A.res.returns = true; return; }
        return fault(A, par, k === 'body' ? 'the message returned from an inner function' : 'a form the tree cannot follow (ArrowFunctionExpression)');
      case 'AwaitExpression': return fault(A, par, 'the message awaited (its `then` read)');
      case 'SpreadElement': case 'SpreadProperty': return fault(A, par, 'a spread of the message (its keys listed)');
      case 'ObjectProperty': return fault(A, par, 'the message stored in an object (' + textOf(A.file, pn.key) + ')');
      case 'ArrayExpression': return fault(A, par, 'the message stored in a list');
      case 'ForInStatement': case 'ForOfStatement': return fault(A, par, 'the message walked by ' + (pn.type === 'ForInStatement' ? 'for-in' : 'for-of') + ' (its keys listed)');
      case 'TemplateLiteral': return fault(A, par, 'the message coerced (a template)');
      default: return fault(A, par, 'a form the tree cannot follow (' + pn.type + ')');
    }
  }
  /* a key a for-of hands over a choice of lists: `for (const s of (ps.prog3 ? [] : T1_STATS)) payload[s]` */
  function loopKeys(A, node, path) {
    if (!node || node.type !== 'Identifier') return null;
    const b = path.scope.getBinding(node.name);
    const loop = b && b.path.isVariableDeclarator() && b.path.parentPath.parentPath;
    if (!loop || !loop.isForOfStatement() || loop.node.left !== b.path.parentPath.node) return null;
    const r = loop.node.right;
    if (r.type !== 'ConditionalExpression') return null;
    const x = listWords(r.consequent, loop), y = listWords(r.alternate, loop);
    if (!x || !y) {
      const fromFile = (n) => (n.type === 'ArrayExpression' ? listWords(n, loop) : n.type === 'Identifier' ? (() => { const d = declOf(A.file, n.name); return d && d.kind === 'const' ? listWords(d.path.node.init, d.path) : null; })() : null);
      const x2 = x || fromFile(r.consequent), y2 = y || fromFile(r.alternate);
      return x2 && y2 ? [...x2, ...y2] : null;
    }
    return [...x, ...y];
  }
  /* the message handed to a call as its argument number `i` */
  function handedTo(A, call, i, root = false) {
    if (typeof i !== 'number') return fault(A, call, 'a form the tree cannot follow (a call)');
    const cn = call.node, c = cn.callee, name = dotted(c);
    const argWordsAt = (shift = 0) => cn.arguments.slice(shift).map((a, j) => (j + shift === i || a.type === 'SpreadElement' ? null : wordsOf(a, call)));
    const follow = (targets, idx, words, ctxHere) => {
      let returns = false;
      const shift = cn.arguments.length - words.length;
      const typeArgs = cn.arguments.slice(shift).map((a, j) => (isTypeRead(A, a, call) ? j : -1)).filter((j) => j >= 0);
      for (const t of targets) {
        const fp = t.path || pathOfNode(t.file, t.node);
        if (!fp) { fault(A, call, 'cannot find ' + (name || '?')); continue; }
        if (analyze(t.file, fp, idx, t.ctx ? inter(t.ctx, ctxHere) : ctxHere, words, typeArgs, root).returns) returns = true;
      }
      if (returns) useOf(A, call);
    };
    if (cn.arguments.slice(0, i).some((a) => a.type === 'SpreadElement')) return fault(A, call, 'the message handed after a spread');
    if (cn.type === 'NewExpression') return fault(A, call, 'the message handed to new ' + (name || '?'));
    if (name && MSG_HARMLESS.has(name)) return;
    if (name && MSG_LISTS_KEYS.has(name)) return fault(A, call, 'the message handed to ' + name + ' (its keys listed)');
    if (name && MSG_HAS_KEY.has(name)) {
      const kAt = name.endsWith('.call') ? 1 : 1;
      if (i !== 0) return fault(A, call, 'the message handed to ' + name + ' as a key');
      const w = wordsOf(cn.arguments[kAt], call);
      if (!w) return fault(A, call, 'a key the tree cannot know, asked with ' + name);
      for (const f of w) read(A, call, f, name);
      return;
    }
    if (name && SKIP.has(name.split('.').pop())) return;
    const ctxHere = ctxAt(A, call);
    /* fn.call(this, msg) */
    if (c.type === 'MemberExpression' && !c.computed && c.property.name === 'call' && i >= 1) {
      const inner = c.object;
      if (inner.type === 'Identifier') { const d = declOf(A.file, inner.name); if (d && d.kind === 'fn') return follow([d], i - 1, argWordsAt(1), ctxHere); }
      const mName = inner.type === 'MemberExpression' && !inner.computed ? inner.property.name : null;
      if (mName && methods.has(mName) && methods.get(mName).length === 1) return follow(methods.get(mName), i - 1, argWordsAt(1), ctxHere);
      return fault(A, call, 'the message handed to ' + (name || textOf(A.file, c)) + ' (cannot find it)');
    }
    /* T[msg.type](...) */
    if (c.type === 'MemberExpression' && c.computed && isTypeRead(A, c.property, call)) {
      const o = objLit(A.file, c.object, call);
      if (!o) return fault(A, call, 'a table keyed by type the tree cannot read (' + textOf(A.file, c.object) + ')');
      const targets = [];
      for (const prop of o.node.properties) {
        if (prop.computed || !(prop.type === 'ObjectProperty' || prop.type === 'ObjectMethod')) continue;
        const kk = keyName(prop);
        if (!ctxHere.has(kk)) continue;
        const fs = prop.type === 'ObjectMethod' ? [{ file: o.file, node: prop }] : fnsOfValue(o.file, prop.value);
        if (!fs) { fault(A, call, 'a row of ' + textOf(A.file, c.object) + ' the tree cannot follow (' + kk + ')'); continue; }
        for (const f of fs) targets.push({ ...f, ctx: new Set([kk]) });
      }
      return follow(targets, i, argWordsAt(), ctxHere);
    }
    /* const row = T[msg.type]; row.refuse(...) */
    if (c.type === 'MemberExpression' && !c.computed && c.object.type === 'Identifier') {
      const b = call.scope.getBinding(c.object.name);
      const init = b && b.path.isVariableDeclarator() && b.path.node.init ? b.path.get('init') : null;
      let table = null;
      if (init && init.isMemberExpression() && init.node.computed && isTypeRead(A, init.node.property, init)) table = init.node.object;
      if (init && !table) init.traverse({ MemberExpression(q) { if (q.node.computed && isTypeRead(A, q.node.property, q)) table = q.node.object; } });
      if (table) {
        const o = objLit(A.file, table, init);
        if (!o) return fault(A, call, 'a table keyed by type the tree cannot read');
        const targets = [];
        for (const prop of o.node.properties) {
          if (prop.computed || prop.type !== 'ObjectProperty') continue;
          const kk = keyName(prop);
          if (!ctxHere.has(kk)) continue;
          const row = objLit(o.file, prop.value, null);
          if (!row) { fault(A, call, 'a row of a type table the tree cannot read (' + kk + ')'); continue; }
          const m = row.node.properties.find((q) => !q.computed && q.key && keyName(q) === c.property.name);
          if (!m) continue;
          const fs = m.type === 'ObjectMethod' ? [{ file: row.file, node: m }] : fnsOfValue(row.file, m.value);
          if (!fs) { faults.push({ types: new Set([kk]), file: A.file, line: lineOf(call.node), fn: A.fn, what: 'a row of a type table the tree cannot follow (' + kk + '.' + c.property.name + ')', text: textOf(A.file, call.node) }); continue; }
          for (const f of fs) targets.push({ ...f, ctx: new Set([kk]) });
        }
        return follow(targets, i, argWordsAt(), ctxHere);
      }
    }
    /* a method of the room: this._x(msg), room._x(msg) */
    if (c.type === 'MemberExpression' && !c.computed && c.property.type === 'Identifier') {
      const m = c.property.name;
      let recvThis = c.object.type === 'ThisExpression';
      if (!recvThis && c.object.type === 'Identifier') {
        const b = call.scope.getBinding(c.object.name);
        recvThis = !!b && ((b.path.isVariableDeclarator() && b.path.node.init && b.path.node.init.type === 'ThisExpression') || (b.kind === 'param' && m.startsWith('_')));
      }
      if (recvThis && methods.has(m)) {
        const ms = methods.get(m), same = ms.filter((x) => x.file === A.file);
        if (ms.length === 1 || same.length === 1) return follow(ms.length === 1 ? ms : same, i, argWordsAt(), ctxHere);
        return fault(A, call, 'the message handed to ' + m + ', which ' + ms.length + ' places define');
      }
      return fault(A, call, 'the message handed to ' + (name || textOf(A.file, c)) + ' (cannot find it)');
    }
    /* a function of this file, or one it imports */
    if (c.type === 'Identifier') {
      const b = call.scope.getBinding(c.name);
      if (b && b.kind !== 'module' && b.path.isFunctionDeclaration()) return follow([{ file: A.file, path: b.path }], i, argWordsAt(), ctxHere);
      if (b && b.kind !== 'module' && b.path.isVariableDeclarator() && b.path.node.init && FN_TYPES.has(b.path.node.init.type)) return follow([{ file: A.file, path: b.path.get('init') }], i, argWordsAt(), ctxHere);
      if (!b || b.kind === 'module' || b.path.parentPath.isProgram() || b.path.parentPath.isExportNamedDeclaration()) {
        const d = declOf(A.file, c.name);
        if (d && d.kind === 'fn') return follow([d], i, argWordsAt(), ctxHere);
      }
    }
    return fault(A, call, 'the message handed to ' + (name || textOf(A.file, c)) + ' (cannot find it)');
  }
}
