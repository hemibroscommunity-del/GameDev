/* ═══ v2.3.6692: UNDER THE FRAME RANKS MOUNTS ITS NEW PAGES; UNDER ?ui2=0 TODAY'S (card UI2-ranks) ═══
 *
 * Gear's incident (v2.3.6688, gear-mount.test.mjs): a name that read right
 * and meant the other thing drew today's tab under the frame, and a text
 * pattern let it through.  So this suite reads the SYNTAX TREE
 * (tools/guards/lib/jsxMount.mjs, the follower gear-mount and quests-mount
 * share) from what BottomDashboard's PANELS draws for `leaderboard` and for
 * Ranks' own pages (`ranksGroup`, `ranksPoints`, `ranksBoard`): the Component
 * of each row, through its import, and through lazyPanels.js's
 * `lazyPanel(() => import(file), name)` (the window's own script), with the
 * frame's switch (ui2Frame.js ui2FrameOn) on and off:
 *   frame on   the new pages (their own JSX carries `data-ranks-ui2`, the
 *              landing and a group's tiles, and `data-rank-board`, a board's
 *              standings), never today's (`data-lb-page`: RanksPage.jsx and the
 *              page under `?rankstyle=0`);
 *   ?ui2=0     today's, never the new ones (and `?rankstyle=0` still only there).
 *
 * THE DODGES, played every run on the real files with one change each (a
 * plant that stays green fails the suite), as a tired programmer writes them:
 *   P1 today's RanksPage drawn again under the frame
 *   P2 the choice made on `rankstyle` instead of ui2FrameOn
 *   P3 both mounted under the frame
 *   P4 the choice turned round
 *   P5 a board page a PANELS row of its own drawing today's RanksPage
 *
 * Run: node tools/guards/ranks-mount.test.mjs  (needs @babel/parser and
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
const PANEL = 'src/ui/mobile/dash/LeaderboardPanel.jsx';
const MARKS = ['data-ranks-ui2', 'data-rank-board', 'data-lb-page'];
const ROWS = ['leaderboard', 'ranksGroup', 'ranksPoints', 'ranksBoard'];
const parse = (src) => B.parse(src, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true });
const text = (rel, over) => (over && over[rel] !== undefined ? over[rel] : fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const fileOf = (from, source) => {
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(from), source));
  return /\.(jsx|js)$/.test(base) ? base : [base + '.jsx', base + '.js'].find((f) => fs.existsSync(path.join(ROOT, f)));
};
/* a lazyPanels.js export -> { file, name }: `export const X = lazyPanel(() => import('...'), 'Name', ...)` */
function lazyStart(name, over) {
  let out = null;
  B.traverse(parse(text(LAZY, over)), {
    VariableDeclarator(p) {
      if (p.node.id.name !== name) return;
      const c = p.node.init;
      if (!c || c.type !== 'CallExpression' || c.callee.name !== 'lazyPanel') return;
      const fn = c.arguments[0];
      const imp = fn && fn.body && fn.body.type === 'CallExpression' && fn.body.callee.type === 'Import' ? fn.body.arguments[0] : null;
      const nm = c.arguments[1];
      if (imp && imp.type === 'StringLiteral' && nm && nm.type === 'StringLiteral') out = { file: fileOf(LAZY, imp.value), name: nm.value };
      p.stop();
    },
  });
  return out;
}
/* PANELS[row].Component -> { file, name }, read from BottomDashboard's own tree */
function panelStart(src, row, over) {
  const ast = parse(src);
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
function analyse(over) {
  const dash = text(DASH, over);
  const out = Object.create(null);
  for (const row of ROWS) {
    const start = panelStart(dash, row, over);
    if (!start) { out[row] = { error: 'PANELS.' + row + ' has no Component imported' }; continue; }
    out[row] = mountReach({ B, root: ROOT, start, switchFile: 'src/ui/mobile/ui2Frame.js', switchName: 'ui2FrameOn', marks: MARKS, over });
  }
  return out;
}
const verdict = (r) => {
  const bad = [];
  for (const row of ROWS) {
    const x = r[row];
    if (!x || x.error) { bad.push(row + ': ' + (x ? x.error : 'not read')); continue; }
    if (x.on.error || x.off.error) { bad.push(row + ': ' + (x.on.error || x.off.error)); continue; }
    if (!x.on.found['data-ranks-ui2'].length) bad.push(row + ' frame on: the landing and groups (data-ranks-ui2) not reached; drawn: ' + x.on.order.slice(0, 8).join(' > '));
    if (!x.on.found['data-rank-board'].length) bad.push(row + ' frame on: a board\'s standings (data-rank-board) not reached');
    if (x.on.found['data-lb-page'].length) bad.push(row + ' frame on: today\'s page is reached too: ' + x.on.found['data-lb-page'].join(', '));
    if (!x.off.found['data-lb-page'].length) bad.push(row + ' ?ui2=0: today\'s page (data-lb-page) is not reached');
    if (x.off.found['data-ranks-ui2'].length || x.off.found['data-rank-board'].length) bad.push(row + ' ?ui2=0: the new pages are reached');
  }
  return bad;
};
const real = analyse(null);
const bad = verdict(real);
const lbl = (row, side, m) => (real[row] && real[row][side] && real[row][side].found ? real[row][side].found[m].join(', ') : '?');
check(`1. frame on: PANELS leaderboard mounts the landing (${lbl('leaderboard', 'on', 'data-ranks-ui2')}) and a board (${lbl('leaderboard', 'on', 'data-rank-board')}), not today's`,
  !bad.some((b) => b.startsWith('leaderboard frame on') || b.startsWith('leaderboard:')), bad.join('\n     '));
check(`2. ?ui2=0: PANELS leaderboard mounts today's (${lbl('leaderboard', 'off', 'data-lb-page')}) and not the new pages`, !bad.some((b) => b.startsWith('leaderboard ?ui2=0')), bad.join('\n     '));
check('3. Ranks\' own pages (ranksGroup, ranksPoints, ranksBoard) mount the same, both ways', !bad.some((b) => /^ranks(Group|Points|Board)/.test(b)), bad.join('\n     '));

/* the dodges: one change each to a file's text, read again */
const swap = (rel, from, to) => { const s = text(rel); if (s.split(from).length !== 2) return null; return { [rel]: s.replace(from, to) }; };
const CHOICE = '  if (ui2FrameOn()) return <RanksUi2 boards={boardsIn}';
const PLANTS = [
  ['P1', 'today\'s RanksPage drawn again under the frame', swap(PANEL, CHOICE, '  if (ui2FrameOn()) return <RanksPage boards={boardsIn} want={catRaw} onBoard={setCat} parts={ranksParts(S, side, setSide, fishWant)} />;\n  if (false) return <RanksUi2 boards={boardsIn}')],
  ['P2', 'the choice made on rankstyle instead of ui2FrameOn', swap(PANEL, CHOICE, "  if (sw('rankstyle')) return <RanksUi2 boards={boardsIn}")],
  ['P3', 'both mounted under the frame', swap(PANEL, CHOICE, '  if (ui2FrameOn()) return <><RanksPage boards={boardsIn} want={catRaw} onBoard={setCat} parts={ranksParts(S, side, setSide, fishWant)} /><RanksUi2 boards={boardsIn}')
    && (() => { const o = swap(PANEL, CHOICE, '  if (ui2FrameOn()) return <><RanksPage boards={boardsIn} want={catRaw} onBoard={setCat} parts={ranksParts(S, side, setSide, fishWant)} /><RanksUi2 boards={boardsIn}'); o[PANEL] = o[PANEL].replace("emptyOf: (board) => emptyOf(board, false) }} />;", "emptyOf: (board) => emptyOf(board, false) }} /></>;"); return o; })()],
  ['P4', 'the choice turned round', swap(PANEL, CHOICE, '  if (!ui2FrameOn()) return <RanksUi2 boards={boardsIn}')],
  ['P5', 'a board page a PANELS row of its own drawing today\'s RanksPage', swap(DASH, "  ranksBoard:   { title: 'Leaderboards', Component: LeaderboardPanel },", "  ranksBoard:   { title: 'Leaderboards', Component: RanksPage },")
    && (() => { const o = swap(DASH, "  ranksBoard:   { title: 'Leaderboards', Component: LeaderboardPanel },", "  ranksBoard:   { title: 'Leaderboards', Component: RanksPage },"); o[DASH] = "import { RanksPage } from './dash/RanksPage.jsx';\n" + o[DASH]; return o; })()],
];
for (const [id, what, over] of PLANTS) {
  if (!over) { check(`${id} (${what}): its line is found once`, false, 'the plant\'s line moved: update the plant'); continue; }
  const b = verdict(analyse(over));
  check(`${id} (${what}) turns the suite red`, b.length > 0, 'the plant stayed green');
}

console.log(failed ? `\n${failed} FAILED` : '\nall ok');
process.exit(failed ? 1 : 0);
