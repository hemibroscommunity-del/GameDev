/* ═══ v2.3.6696: UNDER THE FRAME PETS MOUNTS THE COMPANION'S PAGE; UNDER ?ui2=0 TODAY'S (card UI2-pets) ═══
 *
 * Gear's incident (v2.3.6688, gear-mount.test.mjs): a name that read right
 * and meant the other thing drew today's tab under the frame.  So this suite
 * reads the SYNTAX TREE (tools/guards/lib/jsxMount.mjs, the follower
 * gear-mount, quests-mount and codex-mount share) from what BottomDashboard's
 * PANELS draws for `pets`: its Component, through its import into
 * dash/PetsPanel.jsx, with the frame's switch on and off:
 *   frame on   the new landing (its own JSX carries `data-pets-page`), never
 *              today's page (`data-pets-panel`);
 *   ?ui2=0     today's page, never the new one.
 * And Pets' three frame pages (PANELS petsOwned, petsOne, petsAll) reach
 * Owned (`data-pets-owned`), a pet's page (`data-pets-one`) and All
 * (`data-pets-all`), never today's page.
 *
 * THE DODGES, played every run on the real files with one change each (a
 * plant that stays green fails the suite):
 *   M1 the frame still draws today's rows (the module's old component drawn
 *      again: PetsPanel renamed after a run)
 *   M2 the export renamed so PANELS' PetsPanel is today's page
 *   M3 the choice made on the wrong switch (`?bropages`)
 *   M4 both mounted under the frame
 *   M5 the choice turned round (the new page mounted only under ?ui2=0)
 *   M6 a frame page's row pointed at today's page
 *
 * Run: node tools/guards/pets-mount.test.mjs  (needs @babel/parser and
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
const PANEL = 'src/ui/mobile/dash/PetsPanel.jsx';
const MARKS = ['data-pets-page', 'data-pets-panel', 'data-pets-owned', 'data-pets-one', 'data-pets-all'];
const parse = (src) => B.parse(src, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true });
const read = (rel, over) => (over && over[rel] !== undefined ? over[rel] : fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const fileOf = (fromRel, source) => {
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), source));
  return /\.(jsx|js)$/.test(base) ? base : [base + '.jsx', base + '.js'].find((f) => fs.existsSync(path.join(ROOT, f))) || null;
};

/* PANELS[row].Component -> { file, name }, read from BottomDashboard's own tree */
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
  const file = fileOf(DASH, imports[comp].source);
  return file ? { file, name: imports[comp].name } : null;
}

const reach = (row, over) => {
  const start = panelStart(row, over);
  if (!start || !start.file) return { error: 'PANELS.' + row + ' reaches no component' };
  return mountReach({ B, root: ROOT, start, switchFile: 'src/ui/mobile/ui2Frame.js', switchName: 'ui2FrameOn', marks: MARKS, over });
};

function verdict(over) {
  const bad = [];
  const x = reach('pets', over);
  if (x.error) bad.push('pets: ' + x.error);
  else if (x.on.error || x.off.error) bad.push('pets: ' + (x.on.error || x.off.error));
  else {
    if (!x.on.found['data-pets-page'].length) bad.push('frame on: the new landing is not reached; drawn: ' + x.on.order.slice(0, 8).join(' > '));
    if (x.on.found['data-pets-panel'].length) bad.push('frame on: today\'s page is reached too: ' + x.on.found['data-pets-panel'].join(', '));
    if (!x.off.found['data-pets-panel'].length) bad.push('?ui2=0: today\'s page is not reached');
    if (x.off.found['data-pets-page'].length) bad.push('?ui2=0: the new landing is reached: ' + x.off.found['data-pets-page'].join(', '));
  }
  for (const [row, mark] of [['petsOwned', 'data-pets-owned'], ['petsOne', 'data-pets-one'], ['petsAll', 'data-pets-all']]) {
    const y = reach(row, over);
    if (y.error || y.on.error) { bad.push(row + ': ' + (y.error || y.on.error)); continue; }
    if (!y.on.found[mark].length) bad.push(row + ': its page (' + mark + ') is not reached');
    if (y.on.found['data-pets-panel'].length) bad.push(row + ': today\'s page is reached');
  }
  return bad;
}

const real = verdict(null);
check('1. frame on: PANELS pets mounts the companion\'s landing and not today\'s page', !real.some((b) => /^(frame on|pets:)/.test(b)), real.join('\n     '));
check('2. ?ui2=0: PANELS pets mounts today\'s page and not the new landing', !real.some((b) => b.startsWith('?ui2=0')), real.join('\n     '));
check('3. Pets\' three frame pages reach Owned, a pet\'s page and All', !real.some((b) => /^pets[A-Z]/.test(b)), real.join('\n     '));

const swap = (rel, from, to) => { const s = read(rel); if (s.split(from).length !== 2) return null; return { [rel]: s.replace(from, to) }; };
const CHOICE = '  if (frameOn) return <PetsPage getS={getState} />;';
const PLANTS = [
  ['M1', 'the frame still draws today\'s rows', swap(PANEL, CHOICE, '  if (frameOn) return <PetsWas getS={getState} />;')],
  ['M2', 'the export renamed so PetsPanel is today\'s page', swap(PANEL, 'export { PetsChoice as PetsPanel };', 'export { PetsWas as PetsPanel };')],
  ['M3', 'the choice made on ?bropages', swap(PANEL, "  const frameOn = (() => { try { return ui2FrameOn(); } catch (e) { return false; } })();", "  const frameOn = (() => { try { return sw('bropages'); } catch (e) { return false; } })();")],
  ['M4', 'both mounted under the frame', swap(PANEL, CHOICE, '  if (frameOn) return <><PetsPage getS={getState} /><PetsWas getS={getState} /></>;')],
  ['M5', 'the choice turned round', swap(PANEL, CHOICE, '  if (!frameOn) return <PetsPage getS={getState} />;')],
  ['M6', 'a frame page\'s row pointed at today\'s page', swap(DASH, "  petsAll:      { get title() { return petsPageTitle('petsAll'); }, Component: PetsFramePage },", "  petsAll:      { get title() { return petsPageTitle('petsAll'); }, Component: PetsPanel },")],
];
for (const [id, what, over] of PLANTS) {
  if (over === null) { check(`${id} (${what}): its line is found once`, false, 'the plant\'s line moved: update the plant'); continue; }
  check(`${id} (${what}) turns the suite red`, verdict(over).length > 0, 'the plant stayed green');
}

console.log(failed ? `\n${failed} FAILED` : '\nall ok');
process.exit(failed ? 1 : 0);
