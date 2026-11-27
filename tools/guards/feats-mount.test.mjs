/* ═══ v2.3.6695: UNDER THE FRAME FEATS IS DRAWN; UNDER ?ui2=0 TODAY'S ACHIEVEMENTS PAGE (card UI2-feats) ═══
 *
 * The owner, 2026-11-25: "Feats is the approved replacement for
 * Accomplishments."  The page id stays `achievements`, so every road in
 * lands on Feats under the new dashboard: the frame draws it as one of Bro's
 * own pages (src/game/dashDests.js FRAME_PAGES, src/game/broHub.js
 * BRO_HUB_PAGES -> sheet/BroCard.jsx's door switch -> the lazy Achievements
 * script's FeatsPage), and its deeper pages are PANELS rows drawing
 * FeatsPages; under `?ui2=0` the frame is off and PANELS.achievements draws
 * today's page (server/test/achievements-client.test.mjs 7e pins that row).
 *
 * This suite reads the SYNTAX TREE and follows each JSX name through its
 * binding (tools/guards/lib/jsxMount.mjs mountReach, called, never copied),
 * a lazyPanel export into its script, with ui2FrameOn() true and false;
 * pages are found by their root MARKS (data-feats-page, data-feats-medal,
 * data-feats-tiers, data-ap-tree, data-feats-quests, today's
 * data-achv-panel), never by their names.  It fails:
 *   M1  the frame's road to Feats gone (the FRAME_PAGES or BRO_HUB_PAGES row,
 *       BottomDashboard drawing BroDoorPage for Bro's pages);
 *   M2  under the frame, today's page drawn (the old component again, or both);
 *   M3  under the frame, a page of Feats not reached from its PANELS row;
 *   M4  under ?ui2=0, today's page not drawn, or Feats drawn (the choice made on
 *       another switch, or turned round).
 * Its plants (part 3) must each turn it red.
 *
 * Run: node tools/guards/feats-mount.test.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBabel, mountReach } from './lib/jsxMount.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let failed = 0;
function check(name, ok, detail) {
  if (ok) console.log('ok   ' + name);
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '\n     ' + String(detail).slice(0, 900))); }
}
const B = loadBabel(ROOT);
check('0. @babel/parser and @babel/traverse load (npm install in the root or server/)', !!B);
if (!B) process.exit(1);

const DASH = 'src/ui/mobile/BottomDashboard.jsx';
const LAZY = 'src/ui/lazyPanels.js';
const CARD = 'src/ui/mobile/sheet/BroCard.jsx';
const PANEL = 'src/ui/mobile/dash/AchievementsPanel.jsx';
const DESTS = 'src/game/dashDests.js';
const HUB = 'src/game/broHub.js';
const FEATS_PAGE = 'src/ui/mobile/sheet/FeatsPage.jsx';
const MARKS = ['data-feats-page', 'data-feats-medal', 'data-feats-tiers', 'data-feats-tier-page', 'data-ap-tree', 'data-feats-quests', 'data-achv-panel'];
const DEEP = ['featsMedals', 'featsCommon', 'featsRare', 'featsArena', 'featsSuperrare', 'featsMedal', 'featsAp0', 'featsAp1', 'featsAp2', 'featsQuests'];
const parse = (src) => B.parse(src, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true });
const text = (rel, over) => (over && over[rel] !== undefined ? over[rel] : fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const fileOf = (from, source) => {
  if (!source.startsWith('.')) return null;
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(from), source));
  return /\.(jsx|js)$/.test(base) ? base : [base + '.jsx', base + '.js'].find((f) => fs.existsSync(path.join(ROOT, f)));
};
/* a lazyPanels.js export -> { file, name } (`export const X = lazyPanel(() => import('...'), 'Name', ...)`) */
function lazyStart(name, over) {
  let out = null;
  B.traverse(parse(text(LAZY, over)), {
    VariableDeclarator(p) {
      if (p.node.id.type !== 'Identifier' || p.node.id.name !== name) return;
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
/* the imports of a file: local name -> { source, name } */
function importsOf(ast) {
  const out = Object.create(null);
  for (const st of ast.program.body) {
    if (st.type !== 'ImportDeclaration') continue;
    for (const sp of st.specifiers) if (sp.type === 'ImportSpecifier') out[sp.local.name] = { source: st.source.value, name: sp.imported.name || sp.imported.value };
  }
  return out;
}
/* a JSX name -> where it starts: a lazyPanels export into its script, else the import's own file */
function startOf(from, local, imports, over) {
  const im = imports[local];
  if (!im) return null;
  const f = fileOf(from, im.source);
  if (f === LAZY) return lazyStart(im.name, over);
  return f ? { file: f, name: im.name } : null;
}
/* PANELS[row].Component -> its start */
function panelStart(row, over) {
  const ast = parse(text(DASH, over));
  const imports = importsOf(ast);
  let comp = null;
  B.traverse(ast, {
    VariableDeclarator(p) {
      if (p.node.id.type !== 'Identifier' || p.node.id.name !== 'PANELS' || !p.node.init || p.node.init.type !== 'ObjectExpression') return;
      for (const pr of p.node.init.properties) {
        const k = pr.key && (pr.key.name || pr.key.value);
        if (k !== row || !pr.value || pr.value.type !== 'ObjectExpression') continue;
        for (const f of pr.value.properties) if (f.key && (f.key.name || f.key.value) === 'Component' && f.value.type === 'Identifier') comp = f.value.name;
      }
      p.stop();
    },
  });
  return comp ? startOf(DASH, comp, imports, over) : null;
}
/* BroCard's door switch: what `if (door === 'feats') return <X ... />` draws -> its start */
function cardStart(over) {
  const ast = parse(text(CARD, over));
  const imports = importsOf(ast);
  let comp = null;
  B.traverse(ast, {
    IfStatement(p) {
      const t = p.node.test;
      if (!(t.type === 'BinaryExpression' && t.operator === '===' && t.left.type === 'Identifier' && t.left.name === 'door' && t.right.type === 'StringLiteral' && t.right.value === 'feats')) return;
      const r = p.node.consequent.type === 'ReturnStatement' ? p.node.consequent.argument : null;
      if (r && r.type === 'JSXElement' && r.openingElement.name.type === 'JSXIdentifier') comp = r.openingElement.name.name;
    },
  });
  return comp ? startOf(CARD, comp, imports, over) : null;
}
/* a table's row read from its tree: `export const NAME = Object.freeze({ ... key: 'value' ... })` */
function tableRow(rel, table, key, over) {
  let v;
  B.traverse(parse(text(rel, over)), {
    VariableDeclarator(p) {
      if (p.node.id.type !== 'Identifier' || p.node.id.name !== table) return;
      let o = p.node.init;
      if (o && o.type === 'CallExpression') o = o.arguments[0];
      if (!o || o.type !== 'ObjectExpression') return;
      for (const pr of o.properties) if (pr.key && (pr.key.name || pr.key.value) === key && pr.value.type === 'StringLiteral') v = pr.value.value;
    },
  });
  return v;
}
/* BottomDashboard draws BroDoorPage for a frame page Bro's table knows (its framePage switch) */
function dashDrawsBro(over) {
  let ok = false;
  B.traverse(parse(text(DASH, over)), {
    ConditionalExpression(p) {
      const t = p.node.test;
      if (t.type === 'CallExpression' && t.callee.name === 'isBroHubPage' && p.node.consequent.type === 'JSXElement'
        && p.node.consequent.openingElement.name.name === 'BroDoorPage') ok = true;
    },
  });
  return ok;
}
const reach = (start, over) => (start ? mountReach({ B, root: ROOT, start, switchFile: 'src/ui/mobile/ui2Frame.js', switchName: 'ui2FrameOn', marks: MARKS, over }) : null);
const feats = (found) => MARKS.filter((m) => m !== 'data-achv-panel' && found[m].length);

function analyse(over) {
  const bad = [];
  /* M1: the frame's road */
  const fp = tableRow(DESTS, 'FRAME_PAGES', 'achievements', over), bp = tableRow(HUB, 'BRO_HUB_PAGES', 'achievements', over);
  if (fp !== 'dashFrame.feats') bad.push('M1 FRAME_PAGES.achievements is ' + fp);
  if (bp !== 'feats') bad.push('M1 BRO_HUB_PAGES.achievements is ' + bp);
  if (!dashDrawsBro(over)) bad.push('M1 BottomDashboard does not draw BroDoorPage for Bro\'s frame pages');
  const cs = cardStart(over);
  const land = reach(cs, over);
  if (!land || land.on.error) bad.push('M1 BroCard\'s feats door draws nothing that can be followed: ' + JSON.stringify(cs) + (land && land.on.error ? ' ' + land.on.error : ''));
  else {
    if (!land.on.found['data-feats-page'].length) bad.push('M1 under the frame, the feats door does not reach Feats\' landing (data-feats-page); drawn: ' + land.on.order.slice(0, 6).join(' > '));
    /* M2 */
    if (land.on.found['data-achv-panel'].length) bad.push('M2 under the frame, today\'s page is drawn from the feats door: ' + land.on.found['data-achv-panel'].join(', '));
  }
  /* M3: the deeper pages, each its PANELS row */
  const want = { featsMedals: 'data-feats-tiers', featsCommon: 'data-feats-tier-page', featsMedal: 'data-feats-medal', featsAp0: 'data-ap-tree', featsQuests: 'data-feats-quests' };
  for (const row of DEEP) {
    const r = reach(panelStart(row, over), over);
    if (!r || r.on.error) { bad.push('M3 PANELS.' + row + ' draws nothing that can be followed'); continue; }
    const m = want[row] || 'data-feats-medal';
    if (!r.on.found[m].length) bad.push('M3 PANELS.' + row + ' does not reach ' + m);
    if (r.on.found['data-achv-panel'].length) bad.push('M2 PANELS.' + row + ' reaches today\'s page');
  }
  /* M4: ?ui2=0 */
  const old = reach(panelStart('achievements', over), over);
  if (!old || old.off.error) bad.push('M4 PANELS.achievements draws nothing that can be followed');
  else {
    if (!old.off.found['data-achv-panel'].length) bad.push('M4 under ?ui2=0, PANELS.achievements does not reach today\'s page (data-achv-panel)');
    if (feats(old.off.found).length) bad.push('M4 under ?ui2=0, PANELS.achievements reaches Feats: ' + feats(old.off.found).join(', '));
  }
  return { bad, land, old };
}

const real = analyse(null);
const lbl = (r, side, m) => (r && r[side] && r[side].found ? r[side].found[m].join(', ') : '?');
check(`1. the frame's road: FRAME_PAGES and BRO_HUB_PAGES rows, BroDoorPage drawn for them`, !real.bad.some((b) => /^M1 (FRAME|BRO|BottomDashboard)/.test(b)), real.bad.join('\n     '));
check(`2. under the frame the feats door reaches Feats (${lbl(real.land, 'on', 'data-feats-page')}) and not today's page`, !real.bad.some((b) => /^M1 (BroCard|under)|^M2 under/.test(b)), real.bad.join('\n     '));
check('3. Feats\' deeper pages (PANELS rows) each reach their page under the frame, none today\'s', !real.bad.some((b) => /^M3|^M2 PANELS/.test(b)), real.bad.join('\n     '));
check(`4. ?ui2=0: PANELS.achievements reaches today's page (${lbl(real.old, 'off', 'data-achv-panel')}) and no page of Feats`, !real.bad.some((b) => /^M4/.test(b)), real.bad.join('\n     '));

/* ── 3. the dodges: one change each to a file's text, read again ── */
const swap = (rel, from, to, more) => {
  const s = text(rel);
  if (s.split(from).length !== 2) return null;
  const o = { [rel]: s.replace(from, to) };
  if (more) for (const [r2, a, b] of more) { const t = o[r2] !== undefined ? o[r2] : text(r2); if (t.split(a).length !== 2) return null; o[r2] = t.replace(a, b); }
  return o;
};
const DOOR = "  if (door === 'feats') return <DashFeatsPage S={S} who={who == null ? null : who} />;";
const TODAY = 'export const AchievementsPanel = () => {';
const PLANTS = [
  ['P1', 'the old component drawn again under the frame', swap(CARD, DOOR, "  if (door === 'feats') return <DashAchievementsPanel />;",
    [[CARD, "import { DashFeatsPage } from '../../lazyPanels.js';", "import { DashFeatsPage, DashAchievementsPanel } from '../../lazyPanels.js';"]])],
  ['P2', 'the choice made on another switch', swap(PANEL, TODAY, TODAY + "\n  if (sw('feats')) return <FeatsPage S={getState()} who={null} />;",
    [[PANEL, "export { FeatsPage } from '../sheet/FeatsPage.jsx';", "import { FeatsPage } from '../sheet/FeatsPage.jsx';\nexport { FeatsPage };"]])],
  ['P3', 'both drawn under the frame', swap(FEATS_PAGE, "      <div className=\"u2-feats-grid\" data-feats-doors={L.doors.length}>{doors}</div>",
    "      <div className=\"u2-feats-grid\" data-feats-doors={L.doors.length}>{doors}</div>\n      <AchievementsPanel />",
    [[FEATS_PAGE, "import './feats.css';", "import './feats.css';\nimport { AchievementsPanel } from '../dash/AchievementsPanel.jsx';"]])],
  ['P4', 'the choice turned round (Feats under ?ui2=0)', swap(PANEL, TODAY, TODAY + "\n  if (!ui2FrameOn()) return <FeatsPage S={getState()} who={null} />;",
    [[PANEL, "export { FeatsPage } from '../sheet/FeatsPage.jsx';", "import { FeatsPage } from '../sheet/FeatsPage.jsx';\nimport { ui2FrameOn } from '../ui2Frame.js';\nexport { FeatsPage };"]])],
  ['P5', 'the frame\'s row taken away (today\'s page under the frame again)', swap(DESTS, "  achievements: 'dashFrame.feats',", '')],
  ['P6', 'a deeper page drawing today\'s page', swap(FEATS_PAGE, "  if (kind === 'quests') return <QuestHistory S={S} who={who} />;", "  if (kind === 'quests') return <AchievementsPanel />;",
    [[FEATS_PAGE, "import './feats.css';", "import './feats.css';\nimport { AchievementsPanel } from '../dash/AchievementsPanel.jsx';"]])],
];
console.log('3. each dodge, planted, turns the suite red');
for (const [id, what, over] of PLANTS) {
  if (!over) { check(`3. ${id} (${what}): its line is found once`, false, 'the plant\'s line moved: write it again'); continue; }
  const b = analyse(over).bad;
  check(`3. ${id} (${what}) turns the suite red`, b.length > 0, 'the plant stayed green');
  if (process.env.FEATS_MOUNT_WHY) console.log('     ' + b.join(' | '));
}

console.log(failed ? `\n${failed} FAILED` : '\nall ok');
process.exit(failed ? 1 : 0);
