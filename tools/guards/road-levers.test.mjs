/* ═══ v2.3.6463: THE ROADS' LEVERS SAY WHAT THEY ARE (card BK PR 4; grand plan step 10.5) ═══
 *
 * Every road between players (server/src/playerroads.js PLAYER_ROADS) has a
 * `fee`, a `hold` and a `pace`, all 0 by the owner's call 12.  Nothing reads
 * them: a `fee: 0` is not "no fee is charged", it is "no fee is ever
 * looked at".  LEVERS (playerroads.js) marks each `wired: false` with its
 * why, and this guard holds the marks to the source.  It fails:
 *
 *   1. A LEVER MARKED NOT WIRED THAT A FILE READS: anywhere in server/src,
 *      the table's own file included, a row's `.fee`, `.hold` or `.pace`
 *      is read -- the scan FOLLOWS the table's value through the syntax
 *      tree (@babel; the plan's part 5, rule 2), by any spelling it can
 *      follow (THE SCAN below says which), and a use it cannot follow FAILS
 *      too, so an unknown spelling is red, never green (v2.3.6463, sitting
 *      58).  Wiring one is the PR that builds its reader and a test that
 *      sets it and sees it applied, on the owner's word: it turns the mark
 *      to `wired: true`;
 *   2. A LEVER MARKED WIRED THAT NOTHING READS: a mark is no claim;
 *   3. A ROW REACHED ANOTHER WAY: a file that passes the rows on
 *      (`export { PLAYER_ROADS }`, `export *`, `export const ROADS =
 *      PLAYER_ROADS`, an exported function returning a row), so a reader
 *      elsewhere could hold one the scan never started from;
 *   4. THE SCAN IS WHOLE: every file of server/src (server/test/src-walk.mjs,
 *      the doors' list), the table's own included, parses, and the three
 *      levers are the table's;
 *   5. THE SCAN SEES A PLANT: thirty-one planted spellings (sitting 58's
 *      six, the first scan's four, BK's six, sitting 59's four, BK's six
 *      more, and five that hold the stops' allow lists: THE STOPS, NAMED)
 *      each come out red the way they should, and three honest uses (a key
 *      list, another field) do not.
 *
 * Its scope, said once: the scan starts where the rows come from (an import
 * of PLAYER_ROADS or of the module whole, a dynamic import of the table, the
 * table's own binding) and follows only that value, so `o.fee` on some
 * other object is not the table's (xfer.js imports only `playerRoadsBy`,
 * the rows' keys).
 *
 * BREAK PROOF (rule 8), tried by hand 2026-11-24 in a scratch copy, each
 * red (BK part 5): in xfer.js with `import { PLAYER_ROADS } ...`,
 *   - `const _k = 'fee'; export const _f = (r) => PLAYER_ROADS[r][_k];` -> FAIL 1
 *   - `export const _a = () => Object.keys(PLAYER_ROADS).map((k) => PLAYER_ROADS[k].fee);` -> FAIL 1
 *   - `export const _d = async () => (await import('./playerroads.js')).PLAYER_ROADS.market.fee;` -> FAIL 1
 *   - in playerroads.js, `export const roadFee = (r) => PLAYER_ROADS[r].fee;` -> FAIL 1
 *   - `export const ROADS = PLAYER_ROADS;` (duel.js reading `ROADS.duel.fee`) -> FAIL 3
 *   - `export const _g = () => Reflect.get(PLAYER_ROADS.market, 'fee');` -> FAIL 1
 *   - BK's: `export const _l = (r, k) => PLAYER_ROADS[r][k];` -> FAIL 1 (not followed)
 *   - BK's: `const charge = ({ fee }) => fee; export const _c = (r) => charge(PLAYER_ROADS[r]);` -> FAIL 1
 *   - `fee: Object.freeze({ wired: true, ...` in playerroads.js LEVERS -> FAIL 2
 * v2.3.6466 (sitting 59's four, green before, and BK's own), each in xfer.js
 * green on the old guard and red on this one, xfer.js restored green:
 *   - `export const _p = (r) => PLAYER_ROADS[r].valueOf().fee;` -> FAIL 1
 *   - `Object.values(PLAYER_ROADS).forEach((row, i, all) => all[i].fee)` -> FAIL 1
 *   - `import { PLAYER_ROADS as _Q } from './playerroads.js?x'; ... _Q.duel.fee` -> FAIL 1
 *   - `const _tag = (s, row) => row.fee; ... _tag\`${PLAYER_ROADS.duel}\`` -> FAIL 1 (lost)
 *   - BK's: `import { PLAYER_ROADS as _Q } from './playerroads'` (no extension) -> FAIL 1
 *   - BK's: `_cache = PLAYER_ROADS[r]; return _cache.pace;` (never declared) -> FAIL 1 (lost)
 * Its mutants (every line v2.3.6466 added, weakened one at a time): sixteen
 * die on a plant of §5.  One lives, said: a TaggedTemplateExpression added
 * to STOP_AT, because the tagged check runs before the table.
 *
 * Run: node tools/guards/road-levers.test.mjs (from the repository's root;
 * server/test/run.mjs runs it with every guard). */
import { readFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const { srcFiles, SRC_PATH, LEFT_OUT_HOLDS } = await import(new URL('../../server/test/src-walk.mjs', import.meta.url));
const { LEVERS, PLAYER_ROADS } = await import(new URL('../../server/src/playerroads.js', import.meta.url));

let failures = 0;
const check = (name, ok, detail) => {
  if (!ok) failures++;
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 900)));
};

let babel = null;
for (const pkg of ['package.json', 'server/package.json']) {
  try {
    const req = createRequire(join(ROOT, pkg));
    const t = req('@babel/traverse');
    babel = { parser: req('@babel/parser'), traverse: t.default || t };
    break;
  } catch { /* the next */ }
}
if (!babel) { console.log('FAIL 4. @babel/parser and @babel/traverse are installed (npm install at the root)'); process.exit(1); }

const NAMES = Object.keys(LEVERS);
const files = srcFiles();
/* the files an import may lead to: the walk's, and the ones its folders left
   out hold by name (vendor/: the signer, never ours and never the table's) */
const SRC_SET = new Set([...files, ...Object.entries(LEFT_OUT_HOLDS).flatMap(([d, fs]) => fs.map((f) => d + '/' + f))]);

/* ══════════ THE STOPS, NAMED (v2.3.6466, sitting 59) ══════════
 * Sitting 59 found four spellings green: `row.valueOf().fee` (a method of
 * Object.prototype was a stop, and valueOf hands the row back), a forEach's
 * third parameter (the list itself, never bound), an import of
 * './playerroads.js?x' (a text pattern placed the table), a tagged template
 * (every template was a stop, but a tagged one CALLS its tag with the row).
 * Each was a place the scan stopped following without saying what it
 * stopped on.  Now every stop is a NAMED form in one of the lists below;
 * any other appearance of the value is LOST, and lost is red:
 *   - a key of the module whole: PLAYER_ROADS, or another export by name;
 *   - a key of a row: a lever (read), or another field the rows have;
 *   - a method of Object.prototype on the table or a row: valueOf hands the
 *     value back (followed), the five in PROTO_ENDS give a boolean or a
 *     string; the rest (`__lookupGetter__`, ...) are lost;
 *   - an import's source: placed as a file of server/src (a query or a hash
 *     cut off, no extension tried with '.js'), or a package; one the scan
 *     cannot place is lost;
 *   - the forms in STOP_AT, each with its why. */
const MOD_OTHERS = new Set(Object.keys(await import(new URL('../../server/src/playerroads.js', import.meta.url))).filter((k) => k !== 'PLAYER_ROADS'));
const ROW_FIELDS = new Set(Object.values(PLAYER_ROADS).flatMap((row) => Object.keys(row)).filter((k) => !NAMES.includes(k)));
const PROTO_ENDS = new Set(['hasOwnProperty', 'propertyIsEnumerable', 'isPrototypeOf', 'toString', 'toLocaleString']);
const STOP_AT = {
  MemberExpression: ['property'], OptionalMemberExpression: ['property'],   /* the value as a key: a string */
  UnaryExpression: ['argument'],             /* typeof, !, void, -, delete: a primitive */
  ExpressionStatement: ['expression'],       /* the value dropped */
  TemplateLiteral: ['expressions'],          /* an untagged template: a string (a tagged one is a call: lost, before this) */
  ForInStatement: ['right'],                 /* its keys only */
  IfStatement: ['test'], WhileStatement: ['test'], DoWhileStatement: ['test'], ForStatement: ['test'], SwitchStatement: ['discriminant'],
  ConditionalExpression: ['test'],           /* a truth test */
  BinaryExpression: ['left', 'right'],       /* a comparison or a sum: a primitive (`in` names a key, before this) */
  AssignmentExpression: ['left'],            /* the name written over: the new value is not the table's */
};
/* where an import's source leads: 'table', 'file' (another of server/src),
   'package', or 'lost' (a relative path that is no file -- an escape, a
   folder --, or a '#' map of a package.json) */
function placeImport(src, file) {
  if (typeof src !== 'string') return 'lost';
  if (src.startsWith('#')) return 'lost';
  if (!src.startsWith('.') && !src.startsWith('/')) return 'package';
  const p = posix.normalize(posix.join(posix.dirname(file), src.replace(/[?#].*$/, '')));
  for (const c of [p, p + '.js']) {
    if (c === 'playerroads.js') return 'table';
    if (SRC_SET.has(c)) return 'file';
  }
  return 'lost';
}

/* ══════════ THE SCAN: a value followed, not a name looked for ══════════
 * v2.3.6463 (sitting 58's hold): the first scan looked for `.fee` in a file
 * that imported the rows, so `PLAYER_ROADS[r][_k]` with `const _k = 'fee'`,
 * a map over the keys, `(await import(...)).PLAYER_ROADS`, a helper in the
 * table's own file (it was skipped), `export const ROADS = PLAYER_ROADS`
 * read elsewhere and `Reflect.get` all stayed green.  Now the table is a
 * VALUE the scan follows through the syntax tree, binding by binding (a
 * const, an alias, a destructuring, a local function's parameter and its
 * return, a for-of, an array method's callback), knowing at each step how
 * deep it is: the module, the table, a row, the rows in a list, a [key, row]
 * pair.  A key is read when it is a name or a constant the scan can work
 * out (a literal, a const string, a sum of them).  Each use ends one of
 * four ways: a lever READ; nothing (a key list, a test, another field);
 * PASSED ON (exported, under any name); or LOST -- a form the scan does
 * not follow (a key it cannot name on a row, a row put in an object, a
 * call it cannot see into).  LOST FAILS: an unknown spelling is red, never
 * green.  A new honest use the scan cannot follow is taught here, with a
 * plant in §5, never waved through. */
const PROTO = new Set(Object.getOwnPropertyNames(Object.prototype));
const ITER = new Set(['forEach', 'map', 'filter', 'some', 'every', 'find', 'findLast', 'flatMap', 'findIndex', 'findLastIndex']);
/* the depth a key leads to: 'read' (a lever), a depth, 'stop', or 'lost' */
function step(depth, key) {
  if (depth === 'mod') return key === 'PLAYER_ROADS' ? 'table' : MOD_OTHERS.has(key) ? 'stop' : 'lost';
  if (depth === 'table') return key === null ? 'row' : PROTO.has(key) ? 'lost' : 'row';
  if (depth === 'row') return NAMES.includes(key) ? 'read' : ROW_FIELDS.has(key) ? 'stop' : 'lost';
  if (depth === 'rows' || depth === 'pairs') return key === null || /^\d+$/.test(key) ? (depth === 'rows' ? 'row' : 'pair') : key === 'length' ? 'stop' : 'lost';
  if (depth === 'pair') return key === '1' ? 'row' : key === '0' || key === 'length' ? 'stop' : 'lost';
  return 'lost';   /* a promise of the module: only `await` follows it */
}
function scan(code, file, isTable = false) {
  const ast = babel.parser.parse(code, { sourceType: 'module', plugins: ['jsx'] });
  const reads = [], passes = [], lost = [];
  const seen = new Set();
  const at = (node) => file + ':' + (node && node.loc ? node.loc.start.line : '?');
  const lose = (path, why) => lost.push({ at: at(path.node), why });
  const constStr = (node, scope, n = 0) => {
    if (!node || n > 20) return null;
    if (node.type === 'StringLiteral') return node.value;
    if (node.type === 'NumericLiteral') return String(node.value);
    if (node.type === 'TemplateLiteral' && node.expressions.length === 0) return node.quasis[0].value.cooked;
    if (node.type === 'BinaryExpression' && node.operator === '+') {
      const a = constStr(node.left, scope, n + 1), b = constStr(node.right, scope, n + 1);
      return a === null || b === null ? null : a + b;
    }
    if (node.type === 'Identifier') {
      const b = scope.getBinding(node.name);
      if (b && b.constant && b.path.isVariableDeclarator() && b.path.node.id.type === 'Identifier') return constStr(b.path.node.init, b.path.scope, n + 1);
    }
    return null;
  };
  const memberKey = (path) => {
    const n = path.node;
    if (!n.computed) return n.property.type === 'Identifier' ? n.property.name : null;
    return constStr(n.property, path.scope);
  };
  const go = (path, to, how) => {
    if (to === 'read') reads.push({ lever: how, at: at(path.node) });
    else if (to === 'lost') lose(path, 'a key the scan cannot name (' + (how === null ? 'worked out at run time' : how) + ')');
    else if (to !== 'stop') flow(path, to);
  };
  const inExport = (p) => p && p.parentPath && p.parentPath.parentPath && /^Export(Named|Default)Declaration$/.test(p.parentPath.parentPath.node.type);
  function followBinding(b, depth, origin, from) {
    if (!b) return lose(from, 'stored in a name the scan cannot find (never declared)');
    if (!origin && inExport(b.path)) passes.push(at(b.path.node) + ': exports a value holding the rows');
    /* babel lists `export const X = ...` itself among X's references: the
       declaration, not a use (its export is the pass-on above) */
    for (const r of b.referencePaths) if (!r.isExportNamedDeclaration()) flow(r, depth);
  }
  function bindPattern(p, depth) {
    const n = p.node;
    if (!n) return;
    if (n.type === 'Identifier') return followBinding(p.scope.getBinding(n.name), depth, false, p);
    if (n.type === 'AssignmentPattern') return bindPattern(p.get('left'), depth);
    if (n.type === 'ObjectPattern') {
      for (const pp of p.get('properties')) {
        if (pp.node.type === 'RestElement') { bindPattern(pp.get('argument'), depth); continue; }
        const k = pp.node.computed ? constStr(pp.node.key, pp.scope) : pp.node.key.type === 'Identifier' ? pp.node.key.name : constStr(pp.node.key, pp.scope);
        const to = step(depth, k);
        if (to === 'read') reads.push({ lever: k, at: at(pp.node) });
        else if (to === 'lost') lose(pp, 'a destructured key the scan cannot name');
        else if (to !== 'stop') bindPattern(pp.get('value'), to);
      }
      return;
    }
    if (n.type === 'ArrayPattern') {
      p.get('elements').forEach((ep, i) => {
        if (!ep.node) return;
        if (ep.node.type === 'RestElement') { if (depth === 'rows' || depth === 'pairs') bindPattern(ep.get('argument'), depth); else lose(ep, 'the rest of a destructured array'); return; }
        const to = step(depth, String(i));
        if (to === 'read') reads.push({ lever: String(i), at: at(ep.node) });
        else if (to === 'lost') lose(ep, 'an array destructuring of ' + depth);
        else if (to !== 'stop') bindPattern(ep, to);
      });
      return;
    }
    lose(p, 'stored into ' + n.type);
  }
  function bindParam(fn, i, depth) {
    const params = fn.get('params');
    if (params.slice(0, i + 1).some((x) => x.node.type === 'RestElement')) return lose(fn, 'a rest parameter');
    let args = false;
    fn.traverse({ Identifier(x) { if (x.node.name === 'arguments') args = true; } });
    if (args) return lose(fn, 'a function that reads `arguments`');
    if (params[i]) bindPattern(params[i], depth);
  }
  const fnOf = (b) => !b ? null : b.path.isFunctionDeclaration() ? b.path
    : b.path.isVariableDeclarator() && b.path.node.init && /Function/.test(b.path.node.init.type) ? b.path.get('init') : null;
  function returned(fn, depth, from) {
    if (!fn) return lose(from, 'returned outside a function');
    let b = null;
    if (fn.isFunctionDeclaration() && fn.node.id) {
      if (/^Export/.test(fn.parentPath.node.type)) passes.push(at(fn.node) + ': an exported function returns a value holding the rows');
      b = fn.parentPath.scope.getBinding(fn.node.id.name);
    } else if (fn.parentPath.isVariableDeclarator() && fn.parentPath.node.id.type === 'Identifier') {
      if (inExport(fn.parentPath)) passes.push(at(fn.node) + ': an exported function returns a value holding the rows');
      b = fn.parentPath.scope.getBinding(fn.parentPath.node.id.name);
    } else if (fn.parentPath.isExportDefaultDeclaration()) return passes.push(at(fn.node) + ': the default export returns a value holding the rows');
    if (!b) return lose(from, 'returned from a function the scan cannot name (a callback, a method)');
    for (const r of b.referencePaths) {
      if (r.isExportNamedDeclaration()) continue;
      if ((r.parentPath.isCallExpression() || r.parentPath.isOptionalCallExpression()) && r.key === 'callee') flow(r.parentPath, depth);
      else if (r.parentPath.isExportSpecifier()) passes.push(at(r.node) + ': exports a function returning the rows');
      else lose(r, 'a function returning the rows, used as a value');
    }
  }
  const calleeName = (path) => {
    const c = path.node.callee;
    if (c.type === 'MemberExpression' && !c.computed && c.object.type === 'Identifier' && c.property.type === 'Identifier'
      && !path.scope.getBinding(c.object.name)) return c.object.name + '.' + c.property.name;
    return null;
  };
  function callArg(call, i, depth, from) {
    const name = calleeName(call);
    const a = call.node.arguments;
    if (['Object.keys', 'Object.getOwnPropertyNames', 'Reflect.ownKeys', 'Object.isFrozen', 'Object.isSealed', 'Array.isArray'].includes(name)) return;
    if (name === 'Object.values' || name === 'Object.entries') {
      if (i !== 0) return;
      if (depth === 'table' || depth === 'rows') return flow(call, name === 'Object.values' ? 'rows' : 'pairs');
      return lose(from, name + ' of ' + depth);
    }
    if (['Object.freeze', 'Object.seal', 'structuredClone'].includes(name) && i === 0) return flow(call, depth);
    if ((name === 'Reflect.get' || name === 'Reflect.has') && i === 0) {
      const k = a[1] ? constStr(a[1], call.scope) : null;
      return go(call, step(depth, k), k);
    }
    if (name === 'Array.from' && i === 0 && depth === 'rows' && a.length === 1) return flow(call, 'rows');
    const c = call.node.callee;
    const fn = c.type === 'Identifier' ? fnOf(call.scope.getBinding(c.name)) : null;
    if (fn) return bindParam(fn, i, depth);
    lose(from, 'passed to a call the scan cannot see into (' + (name || c.type + (c.name ? ' ' + c.name : '')) + ')');
  }
  function methodCall(call, depth, key, from) {
    if ((depth === 'rows' || depth === 'pairs') && key !== null) {
      const elem = depth === 'rows' ? 'row' : 'pair';
      if (ITER.has(key)) {
        const cb = call.get('arguments')[0];
        const fn = cb && /Function/.test(cb.node.type) ? cb : cb && cb.node.type === 'Identifier' ? fnOf(cb.scope.getBinding(cb.node.name)) : null;
        if (!fn) return lose(from, 'a callback the scan cannot see into');
        bindParam(fn, 0, elem);
        bindParam(fn, 2, depth);   /* the list itself (sitting 59: `all[i].fee`) */
        if (key === 'filter') flow(call, depth);
        else if (key === 'find' || key === 'findLast') flow(call, elem);
        return;
      }
      if (key === 'slice' || key === 'toReversed') return flow(call, depth);
      if (key === 'at') return flow(call, elem);
      if (['includes', 'indexOf', 'join'].includes(key)) return;
      return lose(from, 'a list method the scan does not follow (' + key + ')');
    }
    if ((depth === 'table' || depth === 'row') && key !== null && PROTO.has(key)) {
      if (key === 'valueOf') return flow(call, depth);   /* hands the value back (sitting 59) */
      if (PROTO_ENDS.has(key)) return;
      return lose(from, 'a method of Object.prototype the scan does not follow (' + key + ')');
    }
    if (depth === 'mod' && MOD_OTHERS.has(key)) return;   /* another export: its own return is held in the table's file */
    lose(from, 'a method of ' + depth + ' the scan does not follow (' + key + ')');
  }
  function flow(path, depth) {
    const id = path.node.start + ':' + path.node.end + ':' + path.node.type + ':' + depth;
    if (seen.has(id)) return;
    seen.add(id);
    const par = path.parentPath, pn = par.node, t = pn.type;
    if ((t === 'MemberExpression' || t === 'OptionalMemberExpression') && path.key === 'object') {
      const k = memberKey(par);
      const up = par.parentPath;
      if ((up.isCallExpression() || up.isOptionalCallExpression()) && par.key === 'callee') return methodCall(up, depth, k, par);
      return go(par, step(depth, k), k);
    }
    if (t === 'CallExpression' || t === 'OptionalCallExpression' || t === 'NewExpression') {
      if (path.key === 'callee') return lose(path, 'called');
      if (t === 'NewExpression') return lose(path, 'passed to `new`');
      return callArg(par, path.key, depth, path);
    }
    if (t === 'VariableDeclarator' && path.key === 'init') return bindPattern(par.get('id'), depth);
    if (t === 'AssignmentExpression' && path.key === 'right') {
      const l = par.get('left');
      if (l.isIdentifier()) followBinding(l.scope.getBinding(l.node.name), depth, false, l);
      else if (l.isMemberExpression()) lose(l, 'stored into a property');
      else bindPattern(l, depth);
      return flow(par, depth);
    }
    if (t === 'ConditionalExpression' && path.key !== 'test') return flow(par, depth);
    if (t === 'LogicalExpression' || t === 'ParenthesizedExpression' || t === 'TSNonNullExpression' || t === 'TSAsExpression') return flow(par, depth);
    if (t === 'SequenceExpression') return path.key === pn.expressions.length - 1 ? flow(par, depth) : undefined;
    if (t === 'AwaitExpression') return flow(par, depth === 'promise' ? 'mod' : depth);
    if (t === 'TemplateLiteral' && par.parentPath.isTaggedTemplateExpression()) return lose(path, 'a tagged template: its tag is called with the value');
    if (t === 'BinaryExpression' && pn.operator === 'in' && path.key === 'right') {
      const k = constStr(pn.left, par.scope);
      return go(par, k === null ? 'stop' : step(depth, k), k);
    }
    if (STOP_AT[t] && STOP_AT[t].includes(path.listKey || path.key)) return;
    if (t === 'ReturnStatement') return returned(path.getFunctionParent(), depth, path);
    if (t === 'ArrowFunctionExpression' && path.key === 'body') return returned(par, depth, path);
    if (t === 'ExportSpecifier' || t === 'ExportDefaultDeclaration') return passes.push(at(pn) + ': exports a value holding the rows');
    if (t === 'ForOfStatement' && path.key === 'right') {
      if (depth !== 'rows' && depth !== 'pairs') return lose(path, 'a for-of over ' + depth);
      const l = par.get('left');
      return bindPattern(l.isVariableDeclaration() ? l.get('declarations')[0].get('id') : l, depth === 'rows' ? 'row' : 'pair');
    }
    lose(path, 'used in a ' + t + (path.key !== undefined ? ' (' + path.key + ')' : ''));
  }

  /* where the rows come from: an import of the table (named, the module
     whole), a dynamic import of it, and in the table's file its own binding */
  for (const n of ast.program.body) {
    if (n.type === 'ExportAllDeclaration' && placeImport(n.source && n.source.value, file) === 'table') passes.push(file + ': export * from the table');
    if (n.type === 'ExportNamedDeclaration' && n.source && placeImport(n.source.value, file) === 'table') {
      for (const s of n.specifiers || []) {
        const local = s.local && (s.local.name || s.local.value);
        if (local === 'PLAYER_ROADS' || s.type === 'ExportNamespaceSpecifier') passes.push(file + ': passes PLAYER_ROADS on');
      }
    }
  }
  babel.traverse(ast, {
    Program(p) {
      if (isTable) followBinding(p.scope.getBinding('PLAYER_ROADS'), 'table', true, p);
    },
    'ImportDeclaration|ExportAllDeclaration|ExportNamedDeclaration'(p) {
      if (!p.node.source) return;
      const place = placeImport(p.node.source.value, file);
      if (place === 'lost') { lose(p, 'an import the scan cannot place (' + p.node.source.value + ')'); return; }
      if (place !== 'table' || !p.isImportDeclaration()) return;
      for (const s of p.get('specifiers')) {
        const b = p.scope.getBinding(s.node.local.name);
        if (s.isImportNamespaceSpecifier() || s.isImportDefaultSpecifier()) followBinding(b, 'mod', false, s);
        else if ((s.node.imported.name || s.node.imported.value) === 'PLAYER_ROADS') followBinding(b, 'table', false, s);
        else if ((s.node.imported.name || s.node.imported.value) === 'default') followBinding(b, 'mod', false, s);
      }
    },
    'CallExpression|ImportExpression'(p) {
      const isImport = p.node.type === 'ImportExpression' || p.node.callee.type === 'Import';
      if (!isImport) return;
      const src = p.node.type === 'ImportExpression' ? p.node.source : p.node.arguments[0];
      const s = constStr(src, p.scope);
      const place = s === null ? 'lost' : placeImport(s, file);
      if (place === 'lost') lose(p, 'a dynamic import the scan cannot name or place');
      else if (place === 'table') flow(p, 'promise');
    },
  });
  return { passes, reads, lost };
}

/* ══════════ THE SCAN ══════════ */
/* every file of server/src, the table's own included (a helper beside the
   table is a reader like any other: sitting 58) */
const broken = [];
const readers = Object.fromEntries(NAMES.map((k) => [k, []]));
const passed = [];
const lostAll = [];
for (const f of files) {
  let r;
  try { r = scan(readFileSync(join(SRC_PATH, f), 'utf8'), f, f === 'playerroads.js'); }
  catch (e) { broken.push(f + ': ' + ((e && e.message) || e)); continue; }
  passed.push(...r.passes);
  lostAll.push(...r.lost);
  for (const x of r.reads) (readers[x.lever] || (readers[x.lever] = [])).push(x.at);
}

/* 4. the scan is whole */
check(`4. every file of server/src parses, the table's own included (${files.length} files)`, broken.length === 0 && files.length > 100 && files.includes('playerroads.js'), broken);
check('4. ...the levers are the table\'s three, each a row\'s field', NAMES.slice().sort().join() === 'fee,hold,pace'
  && Object.values(PLAYER_ROADS).every((row) => NAMES.every((k) => typeof row[k] === 'number')), NAMES);

/* 1, 2. the marks against the readers */
check('1. every use of the rows is one the scan follows (a form it cannot follow fails, never passes)', lostAll.length === 0, lostAll);
for (const k of NAMES) {
  if (LEVERS[k].wired) check(`2. \`${k}\` is marked wired, and is read (${readers[k].length})`, readers[k].length > 0, 'nothing reads it: a mark is no claim');
  else check(`1. \`${k}\` is marked not wired, and nothing reads it off a row`, readers[k].length === 0, readers[k]);
}
/* 3. no row reached another way */
check('3. no file of server/src passes the rows on (re-exported, exported under another name, returned by an export)', passed.length === 0, passed);

/* 5. the scan sees a plant: sitting 58's six spellings, the first scan's
   three, and BK part 5's own; each must come out red (a read, a pass-on or
   a form not followed), and the honest uses beside them must not */
const IMP = "import { PLAYER_ROADS } from './playerroads.js';\n";
const red = (r) => r.reads.length + r.passes.length + r.lost.length > 0;
const PLANTS = {
  'a const key (sitting 58)': [IMP + "const _k = 'fee';\nexport const _f = (r) => PLAYER_ROADS[r][_k];", 'read'],
  'a map over the keys (sitting 58)': [IMP + 'export const all = () => Object.keys(PLAYER_ROADS).map((k) => PLAYER_ROADS[k].hold);', 'read'],
  'a dynamic import (sitting 58)': ["export const f = async () => (await import('./playerroads.js')).PLAYER_ROADS.market.pace;", 'read'],
  'a helper in the table\'s own file (sitting 58)': ['export const PLAYER_ROADS = {};\nexport const roadFee = (r) => PLAYER_ROADS[r].fee;', 'read', true],
  'the table exported under another name (sitting 58)': [IMP + 'export const ROADS = PLAYER_ROADS;', 'pass'],
  'Reflect.get (sitting 58)': [IMP + "export const f = () => Reflect.get(PLAYER_ROADS.duel, 'fee');", 'read'],
  'a member (the first scan)': [IMP + 'export const f = PLAYER_ROADS.market.fee;', 'read'],
  'destructuring through the module whole (the first scan)': ["import * as R from './playerroads.js';\nconst { hold } = R.PLAYER_ROADS.duel; export { hold };", 'read'],
  'a computed name under another name (the first scan)': ["import { PLAYER_ROADS as T } from './playerroads.js';\nexport const p = (k) => T[k]['pace'];", 'read'],
  'a pass-on (the first scan)': ["export { PLAYER_ROADS } from './playerroads.js';", 'pass'],
  'a key from a parameter (BK)': [IMP + 'export const lever = (r, k) => PLAYER_ROADS[r][k];', 'lost'],
  'a row through a local function\'s destructured parameter (BK)': [IMP + 'const charge = ({ fee }) => fee;\nexport const f = (r) => charge(PLAYER_ROADS[r]);', 'read'],
  'the rest of a row, its key a sum (BK)': [IMP + "const { at, ...rest } = PLAYER_ROADS.duel;\nexport const h = rest['ho' + 'ld'];", 'read'],
  'a row put in an object (BK)': [IMP + 'const box = { row: PLAYER_ROADS.duel };\nexport const f = () => box;', 'lost'],
  'a row returned by an exported function of the table (BK)': ['export const PLAYER_ROADS = {};\nexport function roadRow(r) { return PLAYER_ROADS[r]; }', 'pass', true],
  'the rows of Object.values, a callback (BK)': [IMP + 'export const fees = () => Object.values(PLAYER_ROADS).some((row) => row.fee > 0);', 'read'],
  'valueOf, which hands the row back (sitting 59)': [IMP + 'export const f = (r) => PLAYER_ROADS[r].valueOf().fee;', 'read'],
  'a callback\'s third parameter, the list (sitting 59)': [IMP + 'export const f = () => Object.values(PLAYER_ROADS).forEach((row, i, all) => all[i].fee);', 'read'],
  'an import with a query (sitting 59)': ["import { PLAYER_ROADS } from './playerroads.js?x';\nexport const f = PLAYER_ROADS.duel.fee;", 'read'],
  'a tagged template (sitting 59)': [IMP + 'const tag = (s, row) => row.fee;\nexport const f = tag`${PLAYER_ROADS.duel}`;', 'lost'],
  'an import with no extension (BK)': ["import { PLAYER_ROADS } from './playerroads';\nexport const f = PLAYER_ROADS.duel.hold;", 'read'],
  'a row stored in a name never declared (BK)': [IMP + 'export function f(r) { cache = PLAYER_ROADS[r]; return cache.pace; }', 'lost'],
  'an import through a package\'s # map (BK)': ["import { PLAYER_ROADS } from '#roads';\nexport const f = PLAYER_ROADS.duel.fee;", 'lost'],
  'an import with an escape, which node decodes (BK)': ["import { PLAYER_ROADS } from './player%72oads.js';\nexport const f = PLAYER_ROADS.duel.fee;", 'lost'],
  'a dynamic import with a query (BK)': ["export const f = async () => (await import('./playerroads.js?v=2')).PLAYER_ROADS.duel.fee;", 'read'],
  'the table\'s own binding renamed (BK)': ['const ROADS = {};\nexport { ROADS as PLAYER_ROADS };\nexport const f = (r) => ROADS[r].fee;', 'lost', true],
  /* the allow lists hold: a key or method outside each is red, not a stop */
  'a field no row has (a list holds)': [IMP + 'export const f = PLAYER_ROADS.duel.fees;', 'lost'],
  'a method of Object.prototype off the table, uncalled (a list holds)': [IMP + 'export const f = PLAYER_ROADS.constructor;', 'lost'],
  'a method of Object.prototype outside PROTO_ENDS (a list holds)': [IMP + "export const f = PLAYER_ROADS.duel.__lookupGetter__('fee');", 'lost'],
  'a key the module whole does not export (a list holds)': ["import * as R from './playerroads.js';\nexport const f = R.PLAYER_ROAD;", 'lost'],
  'a method the module whole does not export (a list holds)': ["import * as R from './playerroads.js';\nexport const f = R.roadsOf('duel');", 'lost'],
};
const missed = [];
for (const [name, [code, want, isTable]] of Object.entries(PLANTS)) {
  const r = scan(code, 'plant.js', !!isTable);
  const got = { read: r.reads.length, pass: r.passes.length, lost: r.lost.length };
  if (!got[want]) missed.push({ name, want, got });
}
check(`5. the scan turns red on each of ${Object.keys(PLANTS).length} planted spellings, by the way it should`, missed.length === 0, missed);
const QUIET = {
  'a file that imports only the keys (its scope)': "import { playerRoadsBy } from './playerroads.js';\nexport const f = (o) => o.fee + playerRoadsBy('xfer').length;",
  'the table\'s own key list (playerRoadsBy)': 'export const PLAYER_ROADS = {};\nexport function by(l) { return Object.keys(PLAYER_ROADS).filter((k) => PLAYER_ROADS[k].ledger === l); }',
  'another field, through a for-of': IMP + "export const n = () => { let c = 0; for (const row of Object.values(PLAYER_ROADS)) if (row.carries.includes('gold')) c++; return c; };",
};
const loud = [];
for (const [name, code] of Object.entries(QUIET)) {
  const r = scan(code, 'plant.js', name.startsWith('the table'));
  if (red(r)) loud.push({ name, r });
}
check(`5. ...and stays quiet on ${Object.keys(QUIET).length} honest uses (a key list, another field)`, loud.length === 0, loud);

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
