/* ═══ v2.3.6694: UNDER THE FRAME LIFE SKILLS MOUNTS ITS NEW PAGES; UNDER ?ui2=0 TODAY'S (card UI2-life) ═══
 *
 * Gear's incident (v2.3.6688, gear-mount.test.mjs): a name that read right
 * and meant the other thing drew today's tab under the frame, and a text
 * pattern let it through.  So this suite reads the SYNTAX TREE
 * (tools/guards/lib/jsxMount.mjs, the follower shared with gear-mount and
 * quests-mount: called, never copied) with the frame's switch (ui2FrameOn)
 * on and off, from two starts:
 *   PANELS.skills  (BottomDashboard's row, its Component through its import):
 *                  frame on, the landing (its own JSX carries
 *                  `data-life-page`), never today's page (`data-skill-grid`,
 *                  dash/SkillsPanel.jsx); off, today's, never the landing;
 *   BroDoorPage    (sheet/BroCard.jsx: the frame's own pages, BroCard's door
 *                  switch): a skill's page (`data-life-skill`), All unlocks
 *                  (`data-life-unlocks`) and How it works (`data-life-how`)
 *                  reached, never today's page.
 * Pages are found by their MARKS, never by their names.
 *
 * THE DODGES, played every run on the real files with one change each (a
 * plant that stays green fails the suite):
 *   M1 the choice drawing today's page again under the frame
 *   M2 the choice made on another switch
 *   M3 both drawn under the frame
 *   M4 the choice turned round
 *   M5 PANELS.skills left on today's SkillsPanel
 *   M6 BroCard's life line drawing nothing (the dispatch removed)
 *   M7 BroCard's life line drawing today's page
 *
 * Run: node tools/guards/life-mount.test.mjs  (needs @babel/parser and
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
const LAND = 'src/ui/mobile/dash/SkillsPanel.jsx';   /* the choice, LifeSkillsDoor */
const CARD = 'src/ui/mobile/sheet/BroCard.jsx';
const MARKS = ['data-life-page', 'data-skill-grid', 'data-life-skill', 'data-life-unlocks', 'data-life-how'];
const SWITCH = { switchFile: 'src/ui/mobile/ui2Frame.js', switchName: 'ui2FrameOn' };

/* PANELS[row].Component -> { file, name }, read from BottomDashboard's own tree */
function panelStart(src, row) {
  const ast = B.parse(src, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true });
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
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(DASH), im.source));
  const file = /\.(jsx|js)$/.test(base) ? base : [base + '.jsx', base + '.js'].find((f) => fs.existsSync(path.join(ROOT, f)));
  return file ? { file, name: im.name } : null;
}
function analyse(over) {
  const dash = (over && over[DASH]) || fs.readFileSync(path.join(ROOT, DASH), 'utf8');
  const start = panelStart(dash, 'skills');
  const land = start ? mountReach({ B, root: ROOT, start, ...SWITCH, marks: MARKS, over }) : { error: 'PANELS.skills has no Component imported' };
  const door = mountReach({ B, root: ROOT, start: { file: CARD, name: 'BroDoorPage' }, ...SWITCH, marks: MARKS, over });
  return { land, door };
}
const verdict = (r) => {
  const bad = [];
  const x = r.land;
  if (!x || x.error) bad.push('skills: ' + (x ? x.error : 'not read'));
  else if (x.on.error || x.off.error) bad.push('skills: ' + (x.on.error || x.off.error));
  else {
    if (!x.on.found['data-life-page'].length) bad.push('skills frame on: the landing (data-life-page) is not reached; drawn: ' + x.on.order.slice(0, 8).join(' > '));
    if (x.on.found['data-skill-grid'].length) bad.push('skills frame on: today\'s page is reached too: ' + x.on.found['data-skill-grid'].join(', '));
    if (!x.off.found['data-skill-grid'].length) bad.push('skills ?ui2=0: today\'s page (data-skill-grid) is not reached');
    if (x.off.found['data-life-page'].length) bad.push('skills ?ui2=0: the landing is reached: ' + x.off.found['data-life-page'].join(', '));
  }
  const d = r.door;
  if (!d || d.error || d.on.error) bad.push('door: ' + (d ? d.error || d.on.error : 'not read'));
  else {
    for (const m of ['data-life-skill', 'data-life-unlocks', 'data-life-how']) if (!d.on.found[m].length) bad.push('door frame on: ' + m + ' is not reached');
    if (d.on.found['data-skill-grid'].length) bad.push('door frame on: today\'s page is reached: ' + d.on.found['data-skill-grid'].join(', '));
  }
  return bad;
};
const real = analyse(null);
const bad = verdict(real);
const lbl = (side, m) => (real.land && real.land[side] && real.land[side].found ? real.land[side].found[m].join(', ') : '?');
check(`1. frame on: PANELS skills mounts the landing (${lbl('on', 'data-life-page')}) and not today's page`, !bad.some((b) => b.startsWith('skills frame on') || b.startsWith('skills:')), bad.join('\n     '));
check(`2. ?ui2=0: PANELS skills mounts today's page (${lbl('off', 'data-skill-grid')}) and not the landing`, !bad.some((b) => b.startsWith('skills ?ui2=0')), bad.join('\n     '));
check('3. the frame\'s own pages (BroDoorPage > BroCard\'s door switch): a skill\'s page, All unlocks and How it works, never today\'s page', !bad.some((b) => b.startsWith('door')), bad.join('\n     '));

const text = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const swap = (rel, from, to) => { const s = text(rel); return s.split(from).length !== 2 ? null : { [rel]: s.replace(from, to) }; };
const CHOICE = "return ui2FrameOn() ? <LifeSkillsPage getS={getState} who={e && e.who != null ? e.who : null} /> : <SkillsPanel />;";
const LIFE_LINE = "if (isLifeDoor(door)) return <LifeDoor S={S} door={door} page={page} sel={sel} who={who == null ? null : who} />;";
const PLANTS = [
  ['M1', 'the choice drawing today\'s page again under the frame', swap(LAND, CHOICE, "return ui2FrameOn() ? <SkillsPanel getS={getState} /> : <SkillsPanel />;")],
  ['M2', 'the choice made on another switch', swap(LAND, CHOICE, "return deskWideActive() ? <LifeSkillsPage getS={getState} who={e && e.who != null ? e.who : null} /> : <SkillsPanel />;")],
  ['M3', 'both drawn under the frame', swap(LAND, CHOICE, "return ui2FrameOn() ? <><LifeSkillsPage getS={getState} who={e && e.who != null ? e.who : null} /><SkillsPanel /></> : <SkillsPanel />;")],
  ['M4', 'the choice turned round', swap(LAND, CHOICE, "return !ui2FrameOn() ? <LifeSkillsPage getS={getState} who={e && e.who != null ? e.who : null} /> : <SkillsPanel />;")],
  ['M5', 'PANELS.skills left on today\'s SkillsPanel', swap(DASH, "Component: LifeSkillsDoor },", "Component: SkillsPanel },")],
  ['M6', 'BroCard\'s life line removed', swap(CARD, LIFE_LINE, '')],
  ['M7', 'BroCard\'s life line drawing today\'s page', swap(CARD, LIFE_LINE, "if (isLifeDoor(door)) return <SkillsPanel />;")],
];
/* M5 and M7 name SkillsPanel: its import, so the follower can reach it */
const withImport = (over, rel, line) => (over && over[rel] ? { ...over, [rel]: line + '\n' + over[rel] } : over);
PLANTS[4][2] = withImport(PLANTS[4][2], DASH, "import { SkillsPanel } from './dash/SkillsPanel.jsx';");
PLANTS[6][2] = withImport(PLANTS[6][2], CARD, "import { SkillsPanel } from '../dash/SkillsPanel.jsx';");
for (const [id, what, over] of PLANTS) {
  if (over === null) { check(`${id} (${what}): its line is found once`, false, 'the plant\'s line moved: update the plant'); continue; }
  const b = verdict(analyse(over));
  check(`${id} (${what}) turns the suite red`, b.length > 0, 'the plant stayed green');
}
console.log(failed ? `\n${failed} FAILED` : '\nall ok');
process.exit(failed ? 1 : 0);
