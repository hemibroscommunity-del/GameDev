/* ═══ v2.3.6691: THE MOUNT FOLLOWER, SHARED (card UI2-quests; moved out of gear-mount.test.mjs, v2.3.6688) ═══
 *
 * Reads the SYNTAX TREE and follows each JSX name through its BINDING
 * (Babel's scopes: a local name, an import followed into its file,
 * React.memo unwrapped), from a start component, once with the frame's
 * switch on and once off:
 *   - a branch on the switch (directly, or through a const that calls it) is
 *     taken one way: the other branch is not drawn, and an early return under
 *     it ends the block;
 *   - any other branch is drawn both ways (a choice on another switch
 *     cannot choose);
 *   - a component is found by the MARKS its own JSX carries (attribute names),
 *     never by its name, so a rename cannot dodge it.
 * Its callers: tools/guards/gear-mount.test.mjs (Gear's two panels),
 * tools/guards/quests-mount.test.mjs (the Quests landing and a quest's page).
 * Needs @babel/parser and @babel/traverse (npm install in the root or server/). */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

/** Babel's parser and traverse, from the root's or the server's packages; null when neither has them. */
export function loadBabel(root) {
  for (const pkg of ['package.json', 'server/package.json']) {
    try {
      const req = createRequire(path.join(root, pkg));
      const tr = req('@babel/traverse');
      return { parse: req('@babel/parser').parse, traverse: tr.default || tr };
    } catch (e) { /* the next */ }
  }
  return null;
}

/** One reading of the sources from `start` ({ file, name }), with the switch
 *  on and off: { on, off }, each { found: { [mark]: [component labels] }, order }
 *  or { error }.  `over` maps a file to its planted text. */
export function mountReach({ B, root, start, switchFile, switchName, marks, over }) {
  const ROOT = root;
  const SWITCH_FILE = switchFile;
  const SWITCH_NAME = switchName;
  const MARKS = new Set(marks);
  const files = new Map();   // rel -> { prog }
  const load = (rel) => {
    if (files.has(rel)) return files.get(rel);
    let src = over ? over[rel] : undefined;
    if (src === undefined) { try { src = fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch (e) { src = null; } }
    let rec = null;
    if (src !== null) {
      const ast = B.parse(src, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true });
      let prog = null;
      B.traverse(ast, { Program(p) { prog = p; p.stop(); } });
      rec = { rel, prog };
    }
    files.set(rel, rec);
    return rec;
  };
  const resolveImport = (fromRel, source) => {
    if (!source.startsWith('.')) return null;
    const base = path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), source));
    if (!base.startsWith('src/')) return null;
    for (const ext of ['', '.jsx', '.js']) {
      const rel = base + ext;
      if (/\.(jsx|js)$/.test(rel) && fs.existsSync(path.join(ROOT, rel))) return rel;
    }
    return null;
  };
  /* a declaration's path -> the component's function path (memo / forwardRef unwrapped, aliases followed) */
  const toComponent = (rel, p, depth = 0) => {
    if (!p || !p.node || depth > 8) return null;
    if (p.isFunctionDeclaration() || p.isArrowFunctionExpression() || p.isFunctionExpression()) return { rel, fn: p };
    if (p.isVariableDeclarator()) return toComponent(rel, p.get('init'), depth + 1);
    if (p.isCallExpression()) {
      const c = p.node.callee;
      const nm = c.type === 'Identifier' ? c.name : (c.type === 'MemberExpression' && c.property.type === 'Identifier' ? c.property.name : '');
      if (nm === 'memo' || nm === 'forwardRef') return toComponent(rel, p.get('arguments.0'), depth + 1);
      return null;
    }
    if (p.isIdentifier()) return bindingToComponent(rel, p.scope.getBinding(p.node.name), depth + 1);
    return null;
  };
  const bindingToComponent = (rel, binding, depth = 0) => {
    if (!binding) return null;
    const bp = binding.path;
    if (bp.isImportSpecifier() || bp.isImportDefaultSpecifier()) {
      const decl = bp.parentPath.node;
      const target = resolveImport(rel, decl.source.value);
      if (!target) return null;
      const name = bp.isImportDefaultSpecifier() ? 'default' : (bp.node.imported.name || bp.node.imported.value);
      return exportToComponent(target, name, depth + 1);
    }
    return toComponent(rel, bp, depth + 1);
  };
  const exportToComponent = (rel, name, depth = 0) => {
    const f = load(rel);
    if (!f || depth > 12) return null;
    for (const st of f.prog.get('body')) {
      if (st.isExportNamedDeclaration()) {
        const d = st.get('declaration');
        if (d.node) {
          if (d.isFunctionDeclaration() && d.node.id && d.node.id.name === name) return { rel, fn: d };
          if (d.isVariableDeclaration()) for (const dec of d.get('declarations')) if (dec.node.id.name === name) return toComponent(rel, dec, depth + 1);
        }
        for (const sp of st.get('specifiers')) {
          const ex = sp.node.exported;
          if ((ex.name || ex.value) !== name) continue;
          if (st.node.source) {
            const t = resolveImport(rel, st.node.source.value);
            return t ? exportToComponent(t, sp.node.local.name, depth + 1) : null;
          }
          return bindingToComponent(rel, f.prog.scope.getBinding(sp.node.local.name), depth + 1);
        }
      }
      if (name === 'default' && st.isExportDefaultDeclaration()) return toComponent(rel, st.get('declaration'), depth + 1);
    }
    return null;
  };
  /* does this binding (a call's callee or a const) come from the frame's switch? */
  const isSwitchImport = (rel, binding) => {
    if (!binding || !binding.path.isImportSpecifier()) return false;
    const t = resolveImport(rel, binding.path.parentPath.node.source.value);
    const im = binding.path.node.imported;
    return t === SWITCH_FILE && (im.name || im.value) === SWITCH_NAME;
  };
  const callsSwitch = (rel, p) => {
    let hit = false;
    const visit = (cp) => { if (cp.node.callee.type === 'Identifier' && isSwitchImport(rel, cp.scope.getBinding(cp.node.callee.name))) { hit = true; cp.stop(); } };
    if (p.isCallExpression()) visit(p);
    if (!hit) p.traverse({ CallExpression: visit });
    return hit;
  };
  /* the test's value with the switch at `on`, or null when it does not follow the switch */
  const taint = (rel, tp, on) => {
    if (!tp || !tp.node) return null;
    if (tp.isUnaryExpression({ operator: '!' })) { const v = taint(rel, tp.get('argument'), on); return v === null ? null : !v; }
    if (tp.isCallExpression()) return callsSwitch(rel, tp) && tp.node.callee.type === 'Identifier' ? on : null;
    if (tp.isIdentifier()) {
      const b = tp.scope.getBinding(tp.node.name);
      if (b && b.constant && b.path.isVariableDeclarator() && b.path.node.init && callsSwitch(rel, b.path.get('init'))) return on;
    }
    return null;
  };
  const endsInReturn = (p) => p.isReturnStatement() || (p.isBlockStatement() && p.node.body.length && p.node.body[p.node.body.length - 1].type === 'ReturnStatement');

  /* what one component draws with the switch at `on`: its marks and its children */
  const draw = (comp, on) => {
    const pruned = new Set();
    const marks = new Set();
    const kids = [];
    const off = (p) => pruned.has(p.node) || !!p.findParent((a) => pruned.has(a.node));
    comp.fn.traverse({
      enter(p) { if (pruned.has(p.node)) p.skip(); },
      IfStatement(p) {
        if (off(p)) return;
        const v = taint(comp.rel, p.get('test'), on);
        if (v === null) return;
        const taken = p.get(v ? 'consequent' : 'alternate');
        const not = p.get(v ? 'alternate' : 'consequent');
        if (not.node) pruned.add(not.node);
        if (taken.node && endsInReturn(taken) && Array.isArray(p.container)) for (const s of p.getAllNextSiblings()) pruned.add(s.node);
      },
      ConditionalExpression(p) {
        if (off(p)) return;
        const v = taint(comp.rel, p.get('test'), on);
        if (v !== null) pruned.add(p.get(v ? 'alternate' : 'consequent').node);
      },
      LogicalExpression(p) {
        if (off(p)) return;
        const v = taint(comp.rel, p.get('left'), on);
        if (v === null) return;
        if ((p.node.operator === '&&' && !v) || (p.node.operator === '||' && v)) pruned.add(p.get('right').node);
      },
      JSXOpeningElement(p) {
        if (off(p)) return;
        const n = p.node.name;
        if (n.type !== 'JSXIdentifier') return;
        if (/^[A-Z]/.test(n.name)) { kids.push(p.get('name')); return; }
        for (const a of p.node.attributes) {
          if (a.type === 'JSXAttribute' && a.name.type === 'JSXIdentifier' && MARKS.has(a.name.name)) marks.add(a.name.name);
        }
      },
    });
    return { marks, kids };
  };
  const label = (c) => {
    const n = c.fn.node.id ? c.fn.node.id.name : (c.fn.parentPath && c.fn.parentPath.isVariableDeclarator() ? c.fn.parentPath.node.id.name : '(anonymous)');
    return c.rel.replace(/^src\/ui\/mobile\//, '') + ':' + n;
  };
  /* v2.3.6691: a name bound to a choice of components (`const X = A ? B : C`): the switch's branch,
     else both (a choice on another switch cannot choose) */
  const bindingToComponents = (rel, binding, on) => {
    const bp = binding && binding.path;
    if (bp && bp.isVariableDeclarator() && bp.node.init && bp.node.init.type === 'ConditionalExpression') {
      const v = taint(rel, bp.get('init.test'), on);
      const sides = v === null ? ['init.consequent', 'init.alternate'] : [v ? 'init.consequent' : 'init.alternate'];
      return sides.map((k) => toComponent(rel, bp.get(k))).filter(Boolean);
    }
    const one = bindingToComponent(rel, binding);
    return one ? [one] : [];
  };
  const reach = (on) => {
    const st = exportToComponent(start.file, start.name);
    if (!st) return { error: start.name + ' not found in ' + start.file };
    const seen = new Set();
    const found = Object.create(null);
    for (const m of MARKS) found[m] = [];
    const order = [];
    const queue = [st];
    while (queue.length) {
      const c = queue.shift();
      if (seen.has(c.fn.node)) continue;
      seen.add(c.fn.node);
      order.push(label(c));
      const d = draw(c, on);
      for (const m of d.marks) found[m].push(label(c));
      for (const k of d.kids) {
        for (const t of bindingToComponents(c.rel, k.scope.getBinding(k.node.name), on)) if (t && !seen.has(t.fn.node)) queue.push(t);
      }
    }
    return { found, order };
  };
  return { on: reach(true), off: reach(false) };
}
