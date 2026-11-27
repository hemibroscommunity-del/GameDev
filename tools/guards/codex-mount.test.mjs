/* ═══ v2.3.6693: UNDER THE FRAME THE CODEX MOUNTS THE COLLECTION; UNDER ?ui2=0 TODAY'S (card UI2-codex) ═══
 *
 * Gear's incident (v2.3.6688, gear-mount.test.mjs): a name that read right
 * and meant the other thing drew today's tab under the frame.  So this suite
 * reads the SYNTAX TREE (tools/guards/lib/jsxMount.mjs, the follower
 * gear-mount and quests-mount share) from what BottomDashboard's PANELS
 * draws for `encyclopedia`: its Component, through its import into
 * src/ui/lazyPanels.js, and THROUGH THE LAZY IMPORT there
 * (`lazyPanel(() => import('...'), 'Name')`, followed here into its file and
 * its export), with the frame's switch on and off:
 *   frame on   the collection (its own JSX carries `data-codex-root`), never
 *              today's grid (`data-cx-grid`: MonsterCodex.jsx);
 *   ?ui2=0     today's grid, never the collection.
 * And the Codex's frame pages (PANELS codexMonster ... codexFound) reach the
 * showcase (`data-codex-show`) through their own lazy import.
 *
 * THE DODGES, played every run on the real files with one change each (a
 * plant that stays green fails the suite):
 *   C1 the panel keeps drawing today's Codex under the frame (the module's
 *      old component drawn again: EncyclopediaPanel renamed after a run)
 *   C2 the choice made on the wrong switch (`?bropages`)
 *   C3 both mounted under the frame
 *   C4 the choice turned round
 *   C5 lazyPanels.js still imports the old file (MonsterCodex.jsx)
 *   C6 the showcase's lazy import pointed at the old file
 *
 * Run: node tools/guards/codex-mount.test.mjs  (needs @babel/parser and
 * @babel/traverse: npm install in the root or server/)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBabel, mountReach } from './lib/jsxMount.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let failed = 0;
function check(name, ok, detail) {
  if (ok) console.log('ok   ' + name);
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '\n     ' + String(detail).slice(0, 800))); }
}

const B = loadBabel(ROOT);
check('0. @babel/parser and @babel/traverse load (npm install in the root or server/)', !!B);
if (!B) process.exit(1);

const DASH = 'src/ui/mobile/BottomDashboard.jsx';
const LAZY = 'src/ui/lazyPanels.js';
const PANEL = 'src/ui/mobile/dash/EncyclopediaPanel.jsx';
const MARKS = ['data-codex-root', 'data-cx-grid', 'data-codex-show'];
const parse = (src) => B.parse(src, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true });
const read = (rel, over) => (over && over[rel] !== undefined ? over[rel] : fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const fileOf = (fromRel, source) => {
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), source));
  return /\.(jsx|js)$/.test(base) ? base : [base + '.jsx', base + '.js'].find((f) => fs.existsSync(path.join(ROOT, f))) || null;
};

/* a lazy panel in lazyPanels.js: `export const X = lazyPanel(() => import('./file'), 'Name', ...)` -> { file, name } */
function lazyStart(name, over) {
  const ast = parse(read(LAZY, over));
  let out = null;
  for (const st of ast.program.body) {
    const d = st.type === 'ExportNamedDeclaration' ? st.declaration : null;
    if (!d || d.type !== 'VariableDeclaration') continue;
    for (const v of d.declarations) {
      if (v.id.name !== name || !v.init || v.init.type !== 'CallExpression' || v.init.callee.name !== 'lazyPanel') continue;
      const [fn, nm] = v.init.arguments;
      const call = fn && fn.body && fn.body.type === 'CallExpression' && fn.body.callee.type === 'Import' ? fn.body : null;
      const src = call && call.arguments[0] && call.arguments[0].value;
      if (src && nm && nm.type === 'StringLiteral') out = { file: fileOf(LAZY, src), name: nm.value };
    }
  }
  return out;
}

/* PANELS[row].Component -> { file, name }, read from BottomDashboard's own tree, through a lazy panel */
function panelStart(row, over) {
  const ast = parse(read(DASH, over));
  let comp = null;
  const imports = Object.create(null);
  for (const st of ast.program.body) {
    if (st.type !== 'ImportDeclaration') continue;
    for (const sp of st.specifiers) if (sp.type === 'ImportSpecifier') imports[sp.local.name] = { source: st.source.value, name: sp.imported.name || sp.imported.value };
  }
  B.traverse(ast, {
    VariableDeclarator(p) {
      if (p.node.id.type !== 'Identifier' || p.node.id.name !== 'PANELS' || !p.node.init || p.node.init.type !== 'ObjectExpression') return;
      for (const pr of p.node.init.properties) {
        const k = pr.key && (pr.key.name || pr.key.value);
        if (k !== row || !pr.value || pr.value.type !== 'ObjectExpression') continue;
        for (const f of pr.value.properties) if ((f.key.name || f.key.value) === 'Component' && f.value.type === 'Identifier') comp = f.value.name;
      }
      p.stop();
    },
  });
  if (!comp || !imports[comp]) return null;
  const im = imports[comp];
  const file = fileOf(DASH, im.source);
  if (file === LAZY) return lazyStart(im.name, over);
  return file ? { file, name: im.name } : null;
}

const reach = (row, over) => {
  const start = panelStart(row, over);
  if (!start || !start.file) return { error: 'PANELS.' + row + ' reaches no component (through ' + LAZY + ')' };
  return mountReach({ B, root: ROOT, start, switchFile: 'src/ui/mobile/ui2Frame.js', switchName: 'ui2FrameOn', marks: MARKS, over });
};

function verdict(over) {
  const bad = [];
  const x = reach('encyclopedia', over);
  if (x.error) bad.push('encyclopedia: ' + x.error);
  else if (x.on.error || x.off.error) bad.push('encyclopedia: ' + (x.on.error || x.off.error));
  else {
    if (!x.on.found['data-codex-root'].length) bad.push('frame on: the collection is not reached; drawn: ' + x.on.order.slice(0, 8).join(' > '));
    if (x.on.found['data-cx-grid'].length) bad.push('frame on: today\'s Codex is reached too: ' + x.on.found['data-cx-grid'].join(', '));
    if (!x.off.found['data-cx-grid'].length) bad.push('?ui2=0: today\'s Codex is not reached');
    if (x.off.found['data-codex-root'].length) bad.push('?ui2=0: the collection is reached: ' + x.off.found['data-codex-root'].join(', '));
  }
  for (const row of ['codexMonster', 'codexCombat', 'codexLoot', 'codexHabitat', 'codexStory', 'codexFound']) {
    const y = reach(row, over);
    if (y.error || y.on.error) { bad.push(row + ': ' + (y.error || y.on.error)); continue; }
    if (!y.on.found['data-codex-show'].length) bad.push(row + ': the showcase\'s pages are not reached');
    if (y.on.found['data-cx-grid'].length) bad.push(row + ': today\'s Codex is reached');
  }
  return bad;
}

const real = verdict(null);
check('1. frame on: PANELS encyclopedia (through lazyPanels.js) mounts the collection and not today\'s grid', !real.some((b) => /^(frame on|encyclopedia)/.test(b)), real.join('\n     '));
check('2. ?ui2=0: PANELS encyclopedia mounts today\'s Codex and not the collection', !real.some((b) => b.startsWith('?ui2=0')), real.join('\n     '));
check('3. the Codex\'s six frame pages reach the showcase through their lazy import', !real.some((b) => /^codex[A-Z]/.test(b)), real.join('\n     '));

const swap = (rel, from, to) => { const s = read(rel); if (s.split(from).length !== 2) return null; return { [rel]: s.replace(from, to) }; };
const CHOICE = '  if (frameOn) return <CodexPage getS={getState} />;';
const PLANTS = [
  ['C1', 'the panel keeps drawing today\'s Codex under the frame', swap(PANEL, CHOICE, '  if (frameOn) return <EncyclopediaWas />;')],
  ['C2', 'the choice made on ?bropages', swap(PANEL, "  const frameOn = (() => { try { return ui2FrameOn(); } catch (e) { return false; } })();", "  const frameOn = (() => { try { return sw('bropages'); } catch (e) { return false; } })();")],
  ['C3', 'both mounted under the frame', swap(PANEL, CHOICE, '  if (frameOn) return <><CodexPage getS={getState} /><EncyclopediaWas /></>;')],
  ['C4', 'the choice turned round', swap(PANEL, CHOICE, '  if (!frameOn) return <CodexPage getS={getState} />;')],
  ['C5', 'lazyPanels.js still imports the old file', swap(LAZY, "export const DashEncyclopediaPanel = lazyPanel(() => import('./mobile/dash/EncyclopediaPanel.jsx'), 'EncyclopediaPanel');", "export const DashEncyclopediaPanel = lazyPanel(() => import('./mobile/dash/MonsterCodex.jsx'), 'MonsterCodex');")],
  ['C6', 'the showcase\'s lazy import pointed at the old file', swap(LAZY, "lazyPanel(() => import('./mobile/dash/MonsterShowcase.jsx'), 'CodexDoorPage');", "lazyPanel(() => import('./mobile/dash/MonsterCodex.jsx'), 'MonsterCodex');")],
];
for (const [id, what, over] of PLANTS) {
  if (over === null) { check(`${id} (${what}): its line is found once`, false, 'the plant\'s line moved: update the plant'); continue; }
  check(`${id} (${what}) turns the suite red`, verdict(over).length > 0, 'the plant stayed green');
}

console.log(failed ? `\n${failed} FAILED` : '\nall ok');
process.exit(failed ? 1 : 0);
