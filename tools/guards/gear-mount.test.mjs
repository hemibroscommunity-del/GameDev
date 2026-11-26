/* ═══ v2.3.6688 (the mends): UNDER THE FRAME GEAR MOUNTS THE TWO PANELS; UNDER ?ui2=0 TODAY'S TAB (card UI2-gear) ═══
 *
 * The incident (the tests part, 2026-11-26): GearTab.jsx's GearTabTurn drew
 * `<GearTab>`, and inside that module `GearTab` is TODAY's three-panel tab
 * (only the EXPORT is renamed `GearTabChoice as GearTab`), so DashColumns ->
 * GearTabDeferred -> GearTabTurn drew today's Gear under the frame and the
 * two panels never mounted (mp-ui2gear 2 of 6).  A text pattern was what let
 * it through: the name read right and meant the other thing.
 *
 * So this suite reads the SYNTAX TREE and follows each JSX name through its
 * BINDING (Babel's scopes: a local name, an import followed into its file,
 * React.memo unwrapped), from `DashColumns` (what the band draws for Gear's
 * root), once with the frame's switch on and once off:
 *   - a branch on `ui2FrameOn()` (the frame's ONE switch, src/ui/mobile/
 *     ui2Frame.js, which is false under `?ui2=0`), directly or through a
 *     const that calls it, is taken one way: the other branch is not drawn,
 *     and an early return under it ends the block;
 *   - any other branch is drawn both ways (a choice on another switch
 *     cannot choose);
 *   - the workspace is the component whose own JSX carries `data-gear-ws`
 *     (GearPanels' root); today's tab is any component whose own JSX carries
 *     `data-gear-pane` (its Inventory, Equipped and card panes): found by
 *     their marks, never by their names, so a rename cannot dodge it.
 *   1. frame on: the workspace is reached, today's tab is not;
 *   2. frame off (`?ui2=0`): today's tab is reached, the workspace is not.
 *
 * THE DODGES, played every run on the real files with one change each (a
 * plant that stays green fails the suite):
 *   P1 the turn drawing the module's old component again (the incident)
 *   P2 the choice made on the wrong switch (not ui2FrameOn)
 *   P3 both mounted under the frame
 *   P4 the choice turned round (the panels under ?ui2=0)
 *
 * Run: node tools/guards/gear-mount.test.mjs  (needs @babel/parser and
 * @babel/traverse: npm install in the root or server/)
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let failed = 0;
function check(name, ok, detail) {
  if (ok) console.log('ok   ' + name);
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '\n     ' + String(detail).slice(0, 800))); }
}

let B = null;
for (const pkg of ['package.json', 'server/package.json']) {
  try {
    const req = createRequire(path.join(ROOT, pkg));
    const tr = req('@babel/traverse');
    B = { parse: req('@babel/parser').parse, traverse: tr.default || tr };
    break;
  } catch (e) { /* the next */ }
}
check('0. @babel/parser and @babel/traverse load (npm install in the root or server/)', !!B);
if (!B) process.exit(1);

const START = { file: 'src/ui/mobile/dash/DashColumns.jsx', name: 'DashColumns' };
const SWITCH_FILE = 'src/ui/mobile/ui2Frame.js';
const SWITCH_NAME = 'ui2FrameOn';
const GEAR = 'src/ui/mobile/dash/GearTab.jsx';

/* One reading of the sources: `over` maps a file to its planted text. */
function analyse(over) {
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
          if (a.type === 'JSXAttribute' && a.name.type === 'JSXIdentifier' && (a.name.name === 'data-gear-ws' || a.name.name === 'data-gear-pane')) marks.add(a.name.name);
        }
      },
    });
    return { marks, kids };
  };
  const label = (c) => {
    const n = c.fn.node.id ? c.fn.node.id.name : (c.fn.parentPath && c.fn.parentPath.isVariableDeclarator() ? c.fn.parentPath.node.id.name : '(anonymous)');
    return c.rel.replace(/^src\/ui\/mobile\//, '') + ':' + n;
  };
  const reach = (on) => {
    const start = exportToComponent(START.file, START.name);
    if (!start) return { error: 'DashColumns not found' };
    const seen = new Set();
    const ws = []; const old = []; const order = [];
    const queue = [start];
    while (queue.length) {
      const c = queue.shift();
      if (seen.has(c.fn.node)) continue;
      seen.add(c.fn.node);
      order.push(label(c));
      const d = draw(c, on);
      if (d.marks.has('data-gear-ws')) ws.push(label(c));
      if (d.marks.has('data-gear-pane')) old.push(label(c));
      for (const k of d.kids) {
        const t = bindingToComponent(c.rel, k.scope.getBinding(k.node.name));
        if (t && !seen.has(t.fn.node)) queue.push(t);
      }
    }
    return { ws, old, order };
  };
  return { on: reach(true), off: reach(false) };
}

const verdict = (r) => {
  const bad = [];
  if (r.on.error || r.off.error) return [r.on.error || r.off.error];
  if (!r.on.ws.length) bad.push('frame on: the workspace (data-gear-ws) is not reached; drawn: ' + r.on.order.slice(0, 8).join(' > '));
  if (r.on.old.length) bad.push('frame on: today\'s tab is reached too: ' + r.on.old.join(', '));
  if (!r.off.old.length) bad.push('?ui2=0: today\'s tab (data-gear-pane) is not reached');
  if (r.off.ws.length) bad.push('?ui2=0: the workspace is reached: ' + r.off.ws.join(', '));
  return bad;
};

const real = analyse(null);
const bad = verdict(real);
if (real.on.error || real.off.error) { check('1. the start found', false, real.on.error || real.off.error); process.exit(1); }
check('1. frame on: Gear\'s root mounts the two panels (' + real.on.ws.join(', ') + ') and not today\'s tab', !bad.some((b) => b.startsWith('frame on')), bad.join('\n     '));
check('2. ?ui2=0: Gear\'s root mounts today\'s tab (' + real.off.old.join(', ') + ') and not the workspace', !bad.some((b) => b.startsWith('?ui2=0')), bad.join('\n     '));

/* the dodges: one change each to GearTab.jsx's text, read again */
const gear = fs.readFileSync(path.join(ROOT, GEAR), 'utf8');
const swap = (from, to) => { if (gear.split(from).length !== 2) return null; return gear.replace(from, to); };
const PLANTS = [
  ['P1', 'the turn drawing the module\'s old component', swap('return <GearTabChoice R={p.R} desk={p.desk} />;', 'return <GearTab R={p.R} desk={p.desk} />;')],
  ['P2', 'the choice made on the wrong switch', swap('try { return ui2FrameOn(); }', 'try { return !!(typeof window !== \'undefined\' && window.__btUi2); }')],
  ['P3', 'both mounted under the frame', swap('if (frameOn) return <GearPanels R={props.R} />;', 'if (frameOn) return <><GearPanels R={props.R} /><GearTab {...props} /></>;')],
  ['P4', 'the choice turned round', swap('if (frameOn) return <GearPanels R={props.R} />;', 'if (!frameOn) return <GearPanels R={props.R} />;')],
];
for (const [id, what, text] of PLANTS) {
  if (text === null) { check(`${id} (${what}): its line is found once in GearTab.jsx`, false, 'the plant\'s line moved: update the plant'); continue; }
  const b = verdict(analyse({ [GEAR]: text }));
  check(`${id} (${what}) turns the suite red`, b.length > 0, 'the plant stayed green');
}

console.log(failed ? `\n${failed} FAILED` : '\nall ok');
process.exit(failed ? 1 : 0);
