/* ═══ v2.3.6781: BROTOWN MOUNTS THE CHARACTER HUD IN ONE LINE, AND NOTHING MORE (card UI3, PR 2) ═══
 *
 * The plan's rule (finish.md part 5, rule 5): a feature takes its slice out
 * of the big files; BroTown.jsx gains calls, not logic, and its lines fall.
 * So this suite reads BroTown.jsx's SYNTAX TREE (Babel, as gear-mount.test):
 *   1. ONE import of the HUD (`CharacterHud`, from src/ui/hud/CharacterHud.jsx)
 *      and no name at all from src/game/charHud.js (its rules are the HUD's
 *      and the quest card's, never written into the big file);
 *   2. ONE `createElement(CharacterHud, ...)`, and its parent is the quest
 *      card's: the same call holds `createElement(QuestCard, ...)` as a child
 *      (the HUD above the card it pushes down, in the one layer);
 *   3. the status column's wrapper (the div that holds ElemStatusChips) takes
 *      its style from ONE call, `hudColumnStyle()` from src/ui/hud/hudColumn.js
 *      (its old style object, and its place, moved out: no
 *      `calc(var(--bt-hud-top, 56px) - 12px)` left in BroTown);
 *   4. nothing under src/ui/hud/ reads the page's layout
 *      (getBoundingClientRect, getComputedStyle, client/offset/scroll sizes,
 *      innerWidth...): the layout-reads list only falls.
 * THE DODGES, each planted on the real file and seen red, every run:
 *   P1 the HUD's logic written into BroTown (an import from charHud.js);
 *   P2 two mounts;
 *   P3 the mount moved out of QuestCard's parent;
 *   P4 the wrapper's style written back in BroTown;
 *   P5 a layout read under src/ui/hud/.
 *
 * Run: node tools/guards/char-hud-mount.test.mjs  (needs @babel/parser and
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

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const parse = (src) => B.parse(src, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true });
/* the big file is found by its system and what it does (it mounts the quest
   card), never by its path: it may split (tests-by-system 2, filesOf.mjs) */
const { readSystem } = await import('./lib/filesOf.mjs');
const mounters = [...readSystem('ui')].filter(([f, src]) => /\.jsx$/.test(f) && /React\.createElement\(QuestCard,/.test(src));
check('0b. one screen file mounts the quest card (found by the ui system\'s files)', mounters.length === 1, mounters.map(([f]) => f));
const [BT, BT_SRC] = mounters[0] || [null, ''];

const isCE = (n) => n && n.type === 'CallExpression' && n.callee.type === 'MemberExpression'
  && n.callee.object.name === 'React' && n.callee.property.name === 'createElement';
const ceOf = (n, name) => isCE(n) && n.arguments[0] && n.arguments[0].type === 'Identifier' && n.arguments[0].name === name;

/* what BroTown's tree says */
function readBroTown(src) {
  const out = { hudImports: 0, rulesImports: [], columnImport: false, mounts: [], sameParent: false, column: null, oldPlace: false };
  const ast = parse(src);
  B.traverse(ast, {
    ImportDeclaration(p) {
      const s = p.node.source.value;
      if (/(^|\/)ui\/hud\/CharacterHud(\.jsx)?$/.test(s)) {
        out.hudImports += p.node.specifiers.filter((x) => x.type === 'ImportDefaultSpecifier' && x.local.name === 'CharacterHud').length;
      }
      if (/(^|\/)game\/charHud(\.js)?$/.test(s)) out.rulesImports.push(...p.node.specifiers.map((x) => x.local.name));
      if (/(^|\/)ui\/hud\/hudColumn(\.js)?$/.test(s) && p.node.specifiers.some((x) => x.imported && x.imported.name === 'hudColumnStyle')) out.columnImport = true;
    },
    CallExpression(p) {
      const n = p.node;
      if (n.callee.type === 'Import' && /charHud/.test((n.arguments[0] && n.arguments[0].value) || '')) out.rulesImports.push('import()');
      if (ceOf(n, 'CharacterHud')) {
        out.mounts.push(p);
      }
      /* the status column: a div whose children hold ElemStatusChips */
      if (isCE(n) && n.arguments[0] && n.arguments[0].type === 'StringLiteral' && n.arguments[0].value === 'div'
        && n.arguments.slice(2).some((c) => ceOf(c, 'ElemStatusChips'))) {
        const props = n.arguments[1];
        const st = props && props.type === 'ObjectExpression' ? props.properties.find((x) => x.key && (x.key.name || x.key.value) === 'style') : null;
        out.column = st ? st.value : null;
      }
    },
    StringLiteral(p) { if (p.node.value === 'calc(var(--bt-hud-top, 56px) - 12px)') out.oldPlace = true; },
  });
  if (out.mounts.length === 1) {
    const par = out.mounts[0].parentPath;
    out.sameParent = !!par && isCE(par.node) && par.node.arguments.some((c) => ceOf(c, 'QuestCard'));
  }
  return out;
}
const good = (r) => r.hudImports === 1 && r.rulesImports.length === 0 && r.mounts.length === 1 && r.sameParent
  && r.columnImport && !!r.column && r.column.type === 'CallExpression' && r.column.callee.name === 'hudColumnStyle' && r.column.arguments.length === 0 && !r.oldPlace;

const btSrc = BT_SRC;
const r = readBroTown(btSrc);
check('1. BroTown imports the HUD once, and no name from src/game/charHud.js', r.hudImports === 1 && r.rulesImports.length === 0, JSON.stringify({ hud: r.hudImports, rules: r.rulesImports }));
check('2. ONE createElement(CharacterHud, ...), in the quest card\'s parent', r.mounts.length === 1 && r.sameParent, JSON.stringify({ mounts: r.mounts.length, same: r.sameParent }));
check('3. the status column\'s wrapper takes its style from hudColumnStyle() (src/ui/hud/hudColumn.js), its old place gone from BroTown',
  r.columnImport && !!r.column && r.column.type === 'CallExpression' && r.column.callee.name === 'hudColumnStyle' && !r.oldPlace,
  JSON.stringify({ imp: r.columnImport, col: r.column && r.column.type, old: r.oldPlace }));
{
  const HC = await import(new URL('../../src/ui/hud/hudColumn.js', import.meta.url).href);
  const st = HC.hudColumnStyle();
  check('3b ...the place it gives: today\'s as the fallback, the HUD\'s stack while it is up; the rest as before',
    st.top === 'var(--bt-status-top, calc(var(--bt-hud-top, 56px) - 12px))' && st.position === 'absolute' && st.left === 8 && st.zIndex === 18
      && st.fontSize === 11 && st.fontWeight === 700 && st.color === 'rgba(255,255,255,.6)' && HC.hudColumnStyle() === st);
}

/* 4. no layout read under src/ui/hud/ */
const LAYOUT = new Set(['getBoundingClientRect', 'getClientRects', 'getComputedStyle', 'clientWidth', 'clientHeight', 'clientTop', 'clientLeft',
  'offsetWidth', 'offsetHeight', 'offsetTop', 'offsetLeft', 'scrollWidth', 'scrollHeight', 'scrollTop', 'scrollLeft', 'innerWidth', 'innerHeight',
  'outerWidth', 'outerHeight', 'elementFromPoint', 'visualViewport']);
function layoutReads(src) {
  const hits = [];
  B.traverse(parse(src), {
    'MemberExpression|OptionalMemberExpression'(p) { const k = p.node.property; if (k && !p.node.computed && LAYOUT.has(k.name)) hits.push(k.name); },
    CallExpression(p) { if (p.node.callee.type === 'Identifier' && LAYOUT.has(p.node.callee.name)) hits.push(p.node.callee.name); },
  });
  return hits;
}
const hudFiles = fs.readdirSync(path.join(ROOT, 'src/ui/hud')).filter((f) => /\.jsx?$/.test(f));
const reads = hudFiles.flatMap((f) => layoutReads(read('src/ui/hud/' + f)).map((h) => f + ': ' + h));
check('4. nothing under src/ui/hud/ reads the page\'s layout (' + hudFiles.length + ' files)', hudFiles.length >= 2 && reads.length === 0, reads.join(', '));

/* the dodges */
const plant = (name, from, to) => {
  if (btSrc.indexOf(from) < 0) { check('P plant "' + name + '" finds its text', false, from); return; }
  check('P plant red: ' + name, !good(readBroTown(btSrc.split(from).join(to))));
};
const MOUNT = 'React.createElement(CharacterHud, { rpgState: rpgState, live: stateRef.current })';
check('P the real file is good (the plants start from green)', good(r));
plant('the HUD\'s logic written into BroTown (an import from charHud.js)', "import CharacterHud from '@/ui/hud/CharacterHud.jsx';",
  "import CharacterHud from '@/ui/hud/CharacterHud.jsx'; import { charHudModel } from '@/game/charHud.js';");
plant('two mounts', MOUNT, MOUNT + ', ' + MOUNT);
plant('the mount moved out of QuestCard\'s parent', MOUNT, 'React.createElement("div", null, ' + MOUNT + ')');
plant('the wrapper\'s style written back in BroTown', 'style: hudColumnStyle()',
  "style: { position: 'absolute', top: 'calc(var(--bt-hud-top, 56px) - 12px)', left: 8, zIndex: 18 }");
check('P plant red: a layout read under src/ui/hud/',
  layoutReads(read('src/ui/hud/CharacterHud.jsx').replace('const stop = (e) =>', 'const w = document.body.clientWidth; const stop = (e) =>')).length > 0);

console.log(`\nchar-hud-mount: ${failed ? failed + ' FAILED' : 'all passed'}`);
if (failed) process.exit(1);
