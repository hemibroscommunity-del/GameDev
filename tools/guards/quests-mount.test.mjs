/* ═══ v2.3.6691: UNDER THE FRAME QUESTS MOUNTS ITS NEW PAGES; UNDER ?ui2=0 TODAY'S (card UI2-quests) ═══
 *
 * Gear's incident (v2.3.6688, gear-mount.test.mjs): a name that read right
 * and meant the other thing drew today's tab under the frame, and a text
 * pattern let it through.  So this suite reads the SYNTAX TREE
 * (tools/guards/lib/jsxMount.mjs, the follower shared with gear-mount) from
 * what BottomDashboard's PANELS draws for `quests` and for `questDetail`
 * (the PANELS object read from its own tree: the Component of each row,
 * through its import), with the frame's switch on and off:
 *   quests       frame on: the landing (its own JSX carries
 *                `data-quests-ui2`), never today's tab (`data-quests-page`:
 *                QuestPages.jsx and the older list); off: today's, never the
 *                landing;
 *   questDetail  frame on: the quest's page (`data-quest-ui2-page`), never
 *                today's (`data-journal-page`: QuestJournalPage under the old
 *                drill); off: today's, never the new page.
 *
 * THE DODGES, played every run on the real files with one change each (a
 * plant that stays green fails the suite), as a tired programmer writes them:
 *   P1 QuestsPanel drawing today's tab again under the frame
 *   P2 the choice made on `questpages` instead of ui2FrameOn
 *   P3 both mounted under the frame
 *   P4 the choice turned round
 *   P5 the new landing added to PANELS as a row of its own, `quests` still
 *      QuestsPanel returning <QuestPages>
 *   D1-D4 the same four on QuestDetailPanel
 *
 * Run: node tools/guards/quests-mount.test.mjs  (needs @babel/parser and
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
const PANEL = 'src/ui/mobile/dash/QuestsPanel.jsx';
const DETAIL = 'src/ui/mobile/dash/QuestDetailPanel.jsx';
const MARKS = ['data-quests-ui2', 'data-quests-page', 'data-quest-ui2-page', 'data-journal-page'];
const WANT = {
  quests: { neu: 'data-quests-ui2', old: 'data-quests-page' },
  questDetail: { neu: 'data-quest-ui2-page', old: 'data-journal-page' },
};

/* PANELS[row].Component -> { file, name }, read from BottomDashboard's own tree */
function panelStart(src, row) {
  const ast = B.parse(src, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true });
  let comp = null;
  const imports = Object.create(null);
  for (const st of ast.program.body) {
    if (st.type === 'ImportDeclaration') {
      for (const sp of st.specifiers) {
        if (sp.type === 'ImportSpecifier') imports[sp.local.name] = { source: st.source.value, name: sp.imported.name || sp.imported.value };
      }
    }
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
  const out = Object.create(null);
  for (const row of Object.keys(WANT)) {
    const start = panelStart(dash, row);
    if (!start) { out[row] = { error: 'PANELS.' + row + ' has no Component imported' }; continue; }
    out[row] = mountReach({ B, root: ROOT, start, switchFile: 'src/ui/mobile/ui2Frame.js', switchName: 'ui2FrameOn', marks: MARKS, over });
  }
  return out;
}

const verdict = (r) => {
  const bad = [];
  for (const row of Object.keys(WANT)) {
    const x = r[row];
    if (!x || x.error) { bad.push(row + ': ' + (x ? x.error : 'not read')); continue; }
    if (x.on.error || x.off.error) { bad.push(row + ': ' + (x.on.error || x.off.error)); continue; }
    const w = WANT[row];
    if (!x.on.found[w.neu].length) bad.push(row + ' frame on: the new page (' + w.neu + ') is not reached; drawn: ' + x.on.order.slice(0, 8).join(' > '));
    if (x.on.found[w.old].length) bad.push(row + ' frame on: today\'s page is reached too: ' + x.on.found[w.old].join(', '));
    if (!x.off.found[w.old].length) bad.push(row + ' ?ui2=0: today\'s page (' + w.old + ') is not reached');
    if (x.off.found[w.neu].length) bad.push(row + ' ?ui2=0: the new page is reached: ' + x.off.found[w.neu].join(', '));
  }
  return bad;
};

const real = analyse(null);
const bad = verdict(real);
const lbl = (row, side, m) => (real[row] && real[row][side] && real[row][side].found ? real[row][side].found[m].join(', ') : '?');
check(`1. frame on: PANELS quests mounts the landing (${lbl('quests', 'on', 'data-quests-ui2')}) and not today's tab`, !bad.some((b) => b.startsWith('quests frame on') || b.startsWith('quests:')), bad.join('\n     '));
check(`2. ?ui2=0: PANELS quests mounts today's tab (${lbl('quests', 'off', 'data-quests-page')}) and not the landing`, !bad.some((b) => b.startsWith('quests ?ui2=0')), bad.join('\n     '));
check(`3. frame on: PANELS questDetail mounts the quest's page (${lbl('questDetail', 'on', 'data-quest-ui2-page')}) and not today's`, !bad.some((b) => b.startsWith('questDetail frame on') || b.startsWith('questDetail:')), bad.join('\n     '));
check(`4. ?ui2=0: PANELS questDetail mounts today's (${lbl('questDetail', 'off', 'data-journal-page')}) and not the new page`, !bad.some((b) => b.startsWith('questDetail ?ui2=0')), bad.join('\n     '));

/* the dodges: one change each to a file's text, read again */
const text = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const swap = (rel, from, to) => { const s = text(rel); if (s.split(from).length !== 2) return null; return { [rel]: s.replace(from, to) }; };
const both = (a, b) => (a && b ? { ...a, ...b } : null);
const PLANTS = [
  ['P1', 'QuestsPanel drawing today\'s tab again under the frame', swap(PANEL, '(ui2FrameOn() ? <QuestsLanding getS={getState} /> :', '(ui2FrameOn() ? <QuestPages getS={getState} /> :')],
  ['P2', 'the choice made on questpages instead of ui2FrameOn', swap(PANEL, '(ui2FrameOn() ? <QuestsLanding getS={getState} /> :', '(!QUEST_PAGES ? <QuestsLanding getS={getState} /> :')],
  ['P3', 'both mounted under the frame', swap(PANEL, '(ui2FrameOn() ? <QuestsLanding getS={getState} /> :', '(ui2FrameOn() ? <><QuestsLanding getS={getState} /><QuestPages getS={getState} /></> :')],
  ['P4', 'the choice turned round', swap(PANEL, '(ui2FrameOn() ? <QuestsLanding getS={getState} /> :', '(!ui2FrameOn() ? <QuestsLanding getS={getState} /> :')],
  ['P5', 'the landing a PANELS row of its own, quests still QuestsPanel returning <QuestPages>', both(
    swap(PANEL, '(ui2FrameOn() ? <QuestsLanding getS={getState} /> : QUEST_PAGES ?', '(QUEST_PAGES ?'),
    swap(DASH, "  quests:       { title: say(SAY, 'bottomDashboard.titleQuests'),      Component: QuestsPanel },",
      "  quests:       { title: say(SAY, 'bottomDashboard.titleQuests'),      Component: QuestsPanel },\n  questsUi2: { title: say(SAY, 'bottomDashboard.titleQuests'), Component: QuestsLanding },"))],
  ['D1', 'QuestDetailPanel drawing today\'s drill again under the frame', swap(DETAIL, '(ui2FrameOn() ? <QuestPage key={questPageAt()} getS={getState} /> :', '(ui2FrameOn() ? <OldQuestDetailPanel getS={getState} /> :')],
  ['D2', 'its choice made on questpages', swap(DETAIL, '(ui2FrameOn() ? <QuestPage key={questPageAt()} getS={getState} /> :', '(!QUEST_PAGES ? <QuestPage key={questPageAt()} getS={getState} /> :')],
  ['D3', 'both mounted under the frame', swap(DETAIL, '(ui2FrameOn() ? <QuestPage key={questPageAt()} getS={getState} /> :', '(ui2FrameOn() ? <><QuestPage key={questPageAt()} getS={getState} /><OldQuestDetailPanel getS={getState} /></> :')],
  ['D4', 'its choice turned round', swap(DETAIL, '(ui2FrameOn() ? <QuestPage key={questPageAt()} getS={getState} /> :', '(!ui2FrameOn() ? <QuestPage key={questPageAt()} getS={getState} /> :')],
];
for (const [id, what, over] of PLANTS) {
  if (over === null) { check(`${id} (${what}): its line is found once`, false, 'the plant\'s line moved: update the plant'); continue; }
  const b = verdict(analyse(over));
  check(`${id} (${what}) turns the suite red`, b.length > 0, 'the plant stayed green');
}

console.log(failed ? `\n${failed} FAILED` : '\nall ok');
process.exit(failed ? 1 : 0);
