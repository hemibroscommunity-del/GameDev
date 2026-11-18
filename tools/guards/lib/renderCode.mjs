/* ═══ v2.3.5347: THE RENDERERS' CODE, COUNTED (grand plan step 5.5, card M PR 8) ═══
 *
 * The one reader of the two renderers' functions and methods for card M's
 * line 7 (the owner's review, 2026-11-17: "M ends at line 7"; a new card is
 * written from this count).  For each function and method of
 * entityRenderer.js and effectsRenderer.js it records:
 *
 *   - its CODE LINES: the lines holding a token of its code (comments and
 *     blank lines are not code), as four-lines counts a file's;
 *   - whether it reads THIS (a `this` not inside a nested `function`, which
 *     has its own);
 *   - the MODULE STATE it reaches: the file's top-level bindings that change
 *     -- a `let` or `var`, or a `const` made with `new` or as an empty or
 *     literal object or array the code writes into or hands on (the tables
 *     census's lists apart: lib/renderTables.mjs) -- read or written;
 *   - the IN-FILE NAMES it reads: the file's other top-level functions,
 *     classes and constants (not imports: a moved function imports those as
 *     the file does);
 *   - the SUITES that read it by its text: a suite (server/test/,
 *     tools/guards/) that reads the renderers and holds its name as a word.
 *
 * A LEAF is a top-level function (not a method) that reads no `this` and
 * reaches no module state: it can leave verbatim, importing what it reads.
 * A leaf whose in-file names are all leaves or constants can leave first.
 *
 * Read by tools/dev/render-code-census.mjs (it writes part 5 of
 * docs/plan/census/M-tables.md).  @babel from the root, else server/.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { babel, ROOT, renderPaths, scanText } from './renderTables.mjs';

const isFn = (n) => n && ['FunctionExpression', 'ArrowFunctionExpression'].includes(n.type);

/** Scan one renderer's text: { rows, state, consts } */
export function scanCode(src, file) {
  const { parse, traverse } = babel();
  const ast = parse(src, { sourceType: 'module', plugins: ['jsx'], tokens: true });
  /* the lines that hold a token of code */
  const codeLine = new Set();
  for (const t of ast.tokens) if (t.type !== 'CommentBlock' && t.type !== 'CommentLine' && t.loc) for (let l = t.loc.start.line; l <= t.loc.end.line; l++) codeLine.add(l);
  const codeLines = (node) => { let n = 0; for (let l = node.loc.start.line; l <= node.loc.end.line; l++) if (codeLine.has(l)) n++; return n; };
  /* the top level: what each name is */
  const tables = scanText(src, file);
  const apart = new Set([...tables.written, ...tables.handed].map((r) => r.name));
  const kindOf = new Map();   /* name -> 'state' | 'fn' | 'class' | 'const' | 'import' */
  for (let st of ast.program.body) {
    if ((st.type === 'ExportNamedDeclaration' || st.type === 'ExportDefaultDeclaration') && st.declaration) st = st.declaration;
    if (st.type === 'ImportDeclaration') { for (const s of st.specifiers) kindOf.set(s.local.name, 'import'); continue; }
    if (st.type === 'FunctionDeclaration' && st.id) { kindOf.set(st.id.name, 'fn'); continue; }
    if (st.type === 'ClassDeclaration' && st.id) { kindOf.set(st.id.name, 'class'); continue; }
    if (st.type !== 'VariableDeclaration') continue;
    for (const d of st.declarations) {
      if (d.id.type !== 'Identifier') continue;
      const n = d.id.name;
      if (st.kind !== 'const') kindOf.set(n, 'state');
      else if (isFn(d.init)) kindOf.set(n, 'fn');
      else if (apart.has(n) || (d.init && d.init.type === 'NewExpression')) kindOf.set(n, 'state');
      else kindOf.set(n, 'const');
    }
  }
  const rows = [];
  const add = (name, kind, node, path, owner) => {
    let readsThis = false;
    const state = new Set(), names = new Set();
    path.traverse({
      ThisExpression(p) {
        const f = p.getFunctionParent();
        /* the method's own this: no plain function between it and the method */
        let q = p.parentPath, own = true;
        while (q && q.node !== node) { if (q.isFunctionDeclaration() || q.isFunctionExpression()) { own = false; break; } q = q.parentPath; }
        if (own && f) readsThis = true;
      },
      Identifier(p) {
        if (!p.isReferencedIdentifier() && !(p.parentPath.isAssignmentExpression() && p.parentPath.node.left === p.node) && !p.parentPath.isUpdateExpression()) return;
        const n = p.node.name;
        const b = p.scope.getBinding(n);
        if (!b || b.scope.block.type !== 'Program') return;
        const k = kindOf.get(n);
        if (k === 'state') state.add(n);
        else if (k === 'fn' || k === 'class' || k === 'const') { if (n !== name) names.add(n); }
      },
    });
    rows.push({ name: owner ? `${owner}.${name}` : name, bare: name, kind, file, line: node.loc.start.line, code: codeLines(node), readsThis, state: [...state].sort(), names: [...names].sort() });
  };
  traverse(ast, {
    Program(pp) {
      for (const sp of pp.get('body')) {
        let p = sp;
        if ((p.isExportNamedDeclaration() || p.isExportDefaultDeclaration()) && p.node.declaration) p = p.get('declaration');
        if (p.isFunctionDeclaration() && p.node.id) add(p.node.id.name, 'function', p.node, p, null);
        else if (p.isVariableDeclaration()) {
          for (const dp of p.get('declarations')) if (dp.node.id.type === 'Identifier' && isFn(dp.node.init)) add(dp.node.id.name, 'function', dp.node.init, dp.get('init'), null);
        } else if (p.isClassDeclaration() && p.node.id) {
          const cls = p.node.id.name;
          for (const mp of p.get('body.body')) {
            const k = mp.node.key;
            const mname = k && (k.name || k.value || (k.type === 'PrivateName' && '#' + k.id.name));
            if (!mname) continue;
            if (mp.isClassMethod() || mp.isClassPrivateMethod()) add(String(mname), mp.node.kind === 'constructor' ? 'constructor' : 'method', mp.node, mp, cls);
            else if ((mp.isClassProperty() || mp.isClassPrivateProperty()) && isFn(mp.node.value)) add(String(mname), 'method', mp.node.value, mp.get('value'), cls);
          }
        }
      }
      pp.stop();
    },
  });
  return rows;
}

/** Both renderers: rows, with each row's suites. */
export async function scanRendererCode(root = ROOT) {
  const out = [];
  for (const p of await renderPaths()) out.push(...scanCode(readFileSync(join(root, p), 'utf8'), p));
  /* the suites that read the renderers and hold a name as a word (one pass a suite) */
  const suites = [];
  for (const d of ['server/test', 'tools/guards']) {
    let files = [];
    try { files = readdirSync(join(root, d)).filter((f) => f.endsWith('.test.mjs')).sort(); } catch { continue; }
    for (const f of files) {
      if (f === 'render-tables.test.mjs') continue;
      const s = readFileSync(join(root, d, f), 'utf8');
      if (!(/(effects|entity)Renderer\b/.test(s) || /(filesOf|readSystem|findIn)\(\s*['"]render['"]/.test(s))) continue;
      const words = new Set(s.match(/[A-Za-z_$#][\w$]*/g) || []);
      suites.push([`${d}/${f}`, words]);
    }
  }
  for (const r of out) r.suites = suites.filter(([, w]) => w.has(r.bare)).map(([f]) => f.replace(/^server\/test\/|^tools\/guards\//, '').replace(/\.test\.mjs$/, ''));
  return out;
}
