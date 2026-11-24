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
