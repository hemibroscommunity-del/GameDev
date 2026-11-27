/* ═══ v2.3.6784: ONE SOCKET IN GEAR (card UI3-menus, reading 4) ═══
 *
 * The owner, 2026-11-26: "Standardize the inventory and equipment slot
 * styling".  The bag's square (InventoryPanel.jsx BagTile: ItemTile and
 * StashTile) gains ONE optional prop, `kit`: with it the square drops its own
 * background, border and radius and wears the kit's socket (u2-slot with the
 * piece's data-grade), the worn cell's; without it today's look, so `?ui2=0`
 * and every other bag surface (the shop, a trade, the old Gear) are unchanged.
 * Read from the syntax tree (finish.md part 5, rule 2), never a text pattern:
 *   K1  BagTile's `kit` defaults to off;
 *   K2  `kit` is passed to BagTile at Gear's two panels' call ONLY (GearPanels.jsx), and there;
 *   K3  under `kit`, neither tile writes `background`, `border` or `borderRadius` inline (each sits
 *       only in a spread that `kit` turns to null), and each wears 'u2-slot' and a data-grade under it;
 *   K4  BagTile hands `kit` to both tiles.
 * THE DODGES, each planted below and seen red: the default turned on; `kit`
 * passed in InventoryPanel's own grid; Gear's call dropping it; one of the two
 * tiles keeping its inline border.
 *
 *   node tools/guards/gear-socket.test.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
let fails = 0;
const check = (name, ok, detail) => {
  if (ok) console.log('  ok   ' + name);
  else { fails += 1; console.log('  FAIL ' + name + (detail !== undefined ? '  ' + JSON.stringify(detail).slice(0, 600) : '')); }
};

let B = null;
for (const pkg of ['package.json', 'server/package.json']) {
  try { const req = createRequire(new URL('../../' + pkg, import.meta.url)); const tr = req('@babel/traverse'); B = { parse: req('@babel/parser').parse, traverse: tr.default || tr }; break; } catch (e) { /* the next */ }
}
check('0. @babel/parser and traverse load (npm install in the root or server/)', !!B);
if (!B) process.exit(1);
const parse = (src) => B.parse(src, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true });

const INV = 'src/ui/mobile/dash/InventoryPanel.jsx';
const GEAR = 'src/ui/mobile/dash/GearPanels.jsx';
/* every file under src/ that draws a BagTile (found, not listed) */
const walk = (d, out = []) => {
  for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) {
    const p = d + '/' + e.name;
    if (e.isDirectory()) walk(p, out);
    else if (/\.(jsx?|mjs)$/.test(e.name)) out.push(p);
  }
  return out;
};
const FILES = Object.create(null);
for (const p of walk('src')) { const s = read(p); if (s.includes('BagTile')) FILES[p] = s; }

const attrOf = (el, name) => (el.attributes || []).find((a) => a.type === 'JSXAttribute' && a.name && a.name.name === name);
const keyName = (p) => (p.key && (p.key.name || p.key.value)) || null;

function rules(files) {
  const out = [];
  const t = (name, ok, d) => out.push({ name, ok: !!ok, d: ok ? undefined : d });
  /* the calls */
  const calls = [];
  for (const [p, src] of Object.entries(files)) {
    B.traverse(parse(src), {
      JSXOpeningElement(q) {
        if (q.node.name && q.node.name.name === 'BagTile') {
          const a = attrOf(q.node, 'kit');
          const on = !!a && (a.value == null || (a.value.type === 'JSXExpressionContainer' && !(a.value.expression.type === 'BooleanLiteral' && !a.value.expression.value)));
          calls.push({ p, line: q.node.loc && q.node.loc.start.line, kit: on });
        }
      },
    });
  }
  const withKit = calls.filter((c) => c.kit);
  t('K2. `kit` is passed to BagTile at Gear\'s two panels only', withKit.length > 0 && withKit.every((c) => c.p === GEAR), withKit);
  t('K2b. Gear\'s two panels pass it', calls.some((c) => c.p === GEAR && c.kit), calls.filter((c) => c.p === GEAR));
  /* the tiles */
  const inv = files[INV] || '';
  const tiles = Object.create(null);
  let defaultOff = null, handsBoth = { ItemTile: false, StashTile: false };
  B.traverse(parse(inv), {
    VariableDeclarator(q) {
      const n = q.node.id && q.node.id.name;
      if (!['BagTile', 'ItemTile', 'StashTile'].includes(n)) return;
      const fn = q.node.init;
      if (!fn || !/Function/.test(fn.type)) return;
      const param = fn.params[0];
      const prop = param && param.type === 'ObjectPattern' ? param.properties.find((x) => keyName(x) === 'kit') : null;
      if (n === 'BagTile') {
        defaultOff = !!prop && (prop.value.type === 'Identifier' || (prop.value.type === 'AssignmentPattern' && prop.value.right.type === 'BooleanLiteral' && prop.value.right.value === false));
        q.traverse({ JSXOpeningElement(r) { const nm = r.node.name && r.node.name.name; if ((nm === 'ItemTile' || nm === 'StashTile') && attrOf(r.node, 'kit')) handsBoth[nm] = true; } });
        return;
      }
      const info = { takesKit: !!prop, raw: [], cls: false, grade: false };
      tiles[n] = info;
      /* the tile's own root element: its style object and its class */
      let root = null;
      q.traverse({ JSXElement(r) { if (!root) root = r; } });
      if (!root) return;
      const el = root.node.openingElement;
      const style = attrOf(el, 'style');
      const obj = style && style.value && style.value.expression;
      const under = (e) => e && e.type === 'ConditionalExpression' && e.test.type === 'Identifier' && e.test.name === 'kit' && e.consequent.type === 'NullLiteral';
      if (obj && obj.type === 'ObjectExpression') {
        for (const pr of obj.properties) {
          if (pr.type === 'ObjectProperty' && ['background', 'border', 'borderRadius'].includes(keyName(pr))) info.raw.push(keyName(pr));
          if (pr.type === 'SpreadElement') {
            const arg = pr.argument;
            const inner = arg.type === 'ConditionalExpression' ? [arg.consequent, arg.alternate] : [arg];
            for (const o of inner) {
              if (o && o.type === 'ObjectExpression' && o.properties.some((x) => ['background', 'border', 'borderRadius'].includes(keyName(x))) && !under(arg)) info.raw.push('spread:' + o.properties.map(keyName).join(','));
            }
          }
        }
      } else info.raw.push('no style object');
      const cls = attrOf(el, 'className');
      const ce = cls && cls.value && cls.value.expression;
      info.cls = !!ce && ce.type === 'ConditionalExpression' && ce.test.type === 'Identifier' && ce.test.name === 'kit' && ce.consequent.type === 'StringLiteral' && ce.consequent.value === 'u2-slot';
      const gr = attrOf(el, 'data-grade');
      const ge = gr && gr.value && gr.value.expression;
      info.grade = !!ge && ge.type === 'ConditionalExpression' && ge.test.type === 'Identifier' && ge.test.name === 'kit';
    },
  });
  t('K1. BagTile\'s `kit` defaults to off', defaultOff === true, defaultOff);
  for (const n of ['ItemTile', 'StashTile']) {
    const i = tiles[n];
    t(`K3. ${n}: under \`kit\` no inline background, border or radius`, !!i && i.takesKit && i.raw.length === 0, i);
    t(`K3b. ${n}: under \`kit\` it wears 'u2-slot' and a data-grade`, !!i && i.cls && i.grade, i);
    t(`K4. BagTile hands \`kit\` to ${n}`, handsBoth[n], handsBoth);
  }
  return out;
}

console.log('gear-socket: the rule');
for (const r of rules(FILES)) check(r.name, r.ok, r.d);

console.log('gear-socket: the dodges, planted (each must turn a rule red)');
const plant = (id, edit) => {
  const f = { ...FILES };
  const [p, from, to] = edit;
  const was = f[p];
  f[p] = was.replace(from, to);
  check(`plant ${id}: planted, and turns the rule red`, f[p] !== was && rules(f).some((r) => !r.ok));
};
plant('the default turned on', [INV, 'selected, kit = false }) => {', 'selected, kit = true }) => {']);
plant('kit passed in InventoryPanel\'s own grid', [INV, '<BagTile key=', '<BagTile kit key=']);
plant('Gear\'s call dropping it', [GEAR, '<BagTile kit entry=', '<BagTile entry=']);
plant('a tile keeping its inline border', [INV, "...(kit ? null : { background: COL.tile, border: `${edgeWidth}px solid ${color}`, borderRadius: 6 }),", "border: `${edgeWidth}px solid ${color}`,"]);

console.log(fails ? `\ngear-socket: ${fails} FAIL` : '\ngear-socket: all pass');
process.exit(fails ? 1 : 0);
