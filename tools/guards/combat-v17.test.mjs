/* ═══ v2.3.6844: A WEAPON'S PAGE AND SHARED LEAD WITH THE UPGRADES (card UI4 PR 5, the owner's V17) ═══
 *
 * The owner, 02:10 UTC 2026-11-28: "Don't like combat menu or primary
 * skill/shared attribute menus. Too confusing for first time player and
 * doesn't use visuals first."  V17:55: "Tap weapon to see actionable upgrades
 * and available points first, then level/progress and actual weapon damage.
 * ... Shared ...: upgrade choices and available points first, supporting
 * current strength below in portrait or to the right in landscape. ... Upgrade
 * preview shows actual before/after effect and cost, explicitly spend,
 * independent point pools. When no points, still inspect explanation; don't
 * show actionable plus."  The rules are src/game/combatV17.js; the pages
 * sheet/WeaponPage.jsx, SharedPage.jsx, CombatHub.jsx through the template
 * sheet/attrTemplate.jsx; the switch `?v17combat` (on; `=0` remembered gives
 * today's pages).
 *
 * This suite runs what the rules DO (finish.md part 5 rule 5) and reads the
 * SYNTAX TREE of the pages (rule 2), and fails:
 *   1. the switch: not on by default; `=0` not off or not remembered; `=1`
 *      not forgetting; a stored "0" not off; storage that throws not the
 *      default; another switch's name throwing it;
 *   2. the order: a weapon's page not upgrades, then the level, then damage;
 *      Shared not upgrades, then strength; today's order the same as V17's
 *      (the switch would compare nothing);
 *   3. the room: the upgrades' grid under two 44 px rows; a picture beyond
 *      30 px or under 18 upright (V17:31: no larger art); a picture sideways
 *      where the 63 px row cannot hold it under its words; the four facts in
 *      a row too narrow for them (a cut word) or never drawn where there is
 *      room; the least upright page more than the 320 x 568 phone's 152 px;
 *      sideways not one row;
 *   4. the game's truth about shared points (flag Q1): the best weapon's
 *      level not said while `onelevel` is on; "each weapon level" said while
 *      it is on; the count a level not the game's (PROG3.SHARED_POINTS_PER_
 *      LEVEL, the worker's mint);
 *   5. the hub's Shared door: a picture row cut (more pictures than the door
 *      holds); one or two pictures (a row that says nothing); more pictures
 *      than the seven;
 *   6. the pages (their syntax tree): the switch not read through
 *      v17CombatWanted; the V17 branch's rows not in V17_ORDER (the JSX, and
 *      its data-cv-order mark); today's branch not today's order (=0 must be
 *      the page of 2026-11-26); a raw <button> or a word typed into the V17
 *      branch (built FROM the kit; every word through say, the game's own
 *      keys: Attributes, DPS, Max HP, Defense); Spend not asked for its
 *      commit role (statWindow's commitRole); the hub's weapons not the kit's
 *      level tile, or their state a colour alone (no `mark`);
 *   7. the template's UpgradeGrid: a tile with no `intent`; the "+" cue drawn
 *      at zero (not from `plus`); the picture not the game's (`a.art`);
 *   8. the preview window (InfoPopup): Spend not wearing `data-u2-role`
 *      (commit while it spends, disabled while it cannot) when the opener
 *      asks; the role worn when it does not ask (every other window keeps
 *      its own).
 * THE DODGES (finish.md part 5 rule 1) are planted in part P, each red.
 *
 * Run: node tools/guards/combat-v17.test.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let failed = 0;
function check(name, ok, detail) {
  if (ok) console.log('ok   ' + name);
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '\n     ' + String(typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 1500))); }
}
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const url = (rel) => pathToFileURL(path.join(ROOT, rel)).href;

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
const parse = (src) => B.parse(src, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true });

const mem = (init) => { const m = new Map(init || []); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'combatv17-'));
let nTmp = 0;
async function moduleOf(src, dir) {
  const abs = src.replace(/from '(\.{1,2}\/[^']+)'/g, (m0, rel) => `from '${pathToFileURL(path.resolve(ROOT, dir, rel)).href}'`);
  const f = path.join(TMP, 'm' + (nTmp++) + '.mjs');
  fs.writeFileSync(f, abs);
  return import(pathToFileURL(f).href);
}

const P3 = await import(url('src/data/prog3.js'));
const SAYV = (await import(url('src/data/say/combatV17.js'))).SAY;
const fill = (key, v) => String(SAYV[key] || '').replace(/\{(\w+)\}/g, (m0, k) => (v && v[k] != null ? String(v[k]) : m0));

/* ── the behaviour: a list of what is wrong (empty: right) ── */
function behave(M) {
  const bad = [];
  const t = (name, ok) => { if (!ok) bad.push(name); };
  const safe = (fn, d) => { try { return fn(); } catch (e) { return d === undefined ? 'threw ' + e.message : d; } };
  /* 1. the switch */
  const on = (search, store) => safe(() => M.v17CombatWanted(search, store));
  t('1 on by default', on('', mem()) === true);
  const s0 = mem();
  t('1 ?v17combat=0 off', on('?v17combat=0', s0) === false);
  t('1 ...remembered (bt_v17combat "0")', s0.getItem('bt_v17combat') === '0');
  t('1 ...the next visit with no address off', on('', s0) === false);
  t('1 ?v17combat=1 on, and the stored off forgotten', on('?v17combat=1', s0) === true && s0.getItem('bt_v17combat') === null);
  t('1 a stored "0" off', on('', mem([['bt_v17combat', '0']])) === false);
  const boom = { getItem: () => { throw new Error('no'); }, setItem: () => { throw new Error('no'); }, removeItem: () => { throw new Error('no'); } };
  t('1 storage that throws: on', on('', boom) === true);
  t('1 ...and ?v17combat=0 still off this visit', on('?v17combat=0', boom) === false);
  for (const other of ['?combat=0', '?v17bro=0', '?v17look=0', '?v17combatx=0', '?xv17combat=0']) t(`1 ${other} is not the switch`, on(other, mem()) === true);

  /* 2. the order */
  const O = M.V17_ORDER || {}, T = M.TODAY_ORDER || {};
  t('2 a weapon\'s page: upgrades, then the level, then damage', (O.weapon || []).join(',') === 'upgrades,progress,damage');
  t('2 Shared: upgrades, then strength', (O.shared || []).join(',') === 'upgrades,strength');
  t('2 today\'s order is not V17\'s (the switch compares something)', (T.weapon || []).join(',') !== (O.weapon || []).join(',') && (T.shared || []).join(',') !== (O.shared || []).join(','));
  t('2 today\'s weapon page: the level, the numbers, the attributes', (T.weapon || []).join(',') === 'progress,damage,upgrades');

  /* 3. the room */
  const R = M.V17_ROOM || {};
  t('3 sideways is one row; upright is not', safe(() => M.v17Shape(true)) === 'side' && safe(() => M.v17Shape(false)) === 'up');
  for (const h of [0, 120, 151, 152, 168, 172, 180, 197, 400]) {
    const g = safe(() => M.v17GridH(h), 0);
    t(`3 h ${h}: the upgrades two 44 px rows at least (${g})`, g >= 2 * 44 + 2);
    const a = safe(() => M.v17TileArt(h, false), 0);
    t(`3 h ${h}: a picture 12 to 30 px upright (${a})`, a >= 12 && a <= 30);
    /* the picture fits its row over its words (the pads, the gap, the name 13 and the value 12: 28) */
    t(`3 h ${h}: the picture fits its tile's row (${a})`, a + 28 <= Math.floor((g - 4) / 2) + 0.5 && M.V17_TILE_WORDS === 28);
  }
  t('3 the least upright page holds on the 320 x 568 phone (161 px inside its page: mp-v17fit)', Number(M.V17_ROOM_MIN) <= 161 && R.LINE + R.GRID_MIN + R.FOOT + 2 * R.GAP === M.V17_ROOM_MIN);
  t('3 the row under the upgrades is a 44 px press', R.FOOT >= 44 && R.GRID_MIN >= 88);
  for (const [h, want] of [[54, 0], [57, 0], [58, 16], [63, 16], [74, 16]]) t(`3 sideways h ${h}: a picture of ${want}`, safe(() => M.v17TileArt(h, true)) === want);
  t('3 the four facts never in an upright row under 560 px', safe(() => M.v17FactsInRow('up', 559)) === false && safe(() => M.v17FactsInRow('up', 374)) === false);
  t('3 ...and drawn where the row is a computer\'s', safe(() => M.v17FactsInRow('up', 828)) === true);
  t('3 sideways the facts only past 1100 (the six share the row)', safe(() => M.v17FactsInRow('side', 844)) === false && safe(() => M.v17FactsInRow('side', 1280)) === true);
  t('3 not measured (0): the door, never a squeezed row', safe(() => M.v17FactsInRow('up', 0)) === false && safe(() => M.v17RuleInRow('up', 0)) === false);
  t('3 Shared\'s rule not squeezed under 360 upright', safe(() => M.v17RuleInRow('up', 320)) === false && safe(() => M.v17RuleInRow('up', 374)) === true);

  /* 4. the game's truth about shared points */
  const best = safe(() => M.sharedPointsRule(true, P3.PROG3.SHARED_POINTS_PER_LEVEL), {});
  const sum = safe(() => M.sharedPointsRule(false, P3.PROG3.SHARED_POINTS_PER_LEVEL), {});
  const dflt = safe(() => M.sharedPointsRule(undefined), {});
  t('4 onelevel on: the best weapon\'s level', /best weapon/.test(fill(best.key, best)));
  t('4 onelevel on: never "each weapon level" (V17\'s, not the game\'s)', !/each weapon level/.test(fill(best.key, best)));
  t('4 onelevel off (the old sum): each weapon level', /each weapon level/.test(fill(sum.key, sum)) && !/best weapon/.test(fill(sum.key, sum)));
  t('4 not known: the game\'s default (onelevel on)', dflt.key === best.key);
  t('4 the count a level is the game\'s (PROG3.SHARED_POINTS_PER_LEVEL)', best.n === P3.PROG3.SHARED_POINTS_PER_LEVEL && Number(M.SHARED_PER_LEVEL) === P3.PROG3.SHARED_POINTS_PER_LEVEL);
  t('4 the words say the count', fill(best.key, best).indexOf(String(best.n)) >= 0);

  /* 5. the hub's Shared door */
  t('5 the door\'s own parts counted (pads, picture, count)', safe(() => M.sharedDoorTaken(30, true)) === 122 && safe(() => M.sharedDoorTaken(24, false)) === 46);
  for (const [w, taken] of [[374, 180], [374, 260], [300, 180], [210, 160], [180, 160], [1000, 200], [0, 0]]) {
    const k = safe(() => M.sharedDoorArtFits(w, taken, 7), -1);
    t(`5 ${w} px less ${taken}: ${k} pictures, never cut`, k >= 0 && k <= 7 && (k === 0 || k * 18 + (k - 1) * 2 <= w - taken));
    t(`5 ${w} px less ${taken}: none rather than one or two`, k === 0 || k >= 3);
  }
  t('5 a wide door draws all seven', safe(() => M.sharedDoorArtFits(1000, 200, 7)) === 7);
  t('5 never more than there are', safe(() => M.sharedDoorArtFits(1000, 0, 5)) === 5);
  const arts = safe(() => M.sharedDoorArt([{ key: 'hp', art: 'a' }, { key: 'x' }, null, { key: 'def', art: 'b' }]), []);
  t('5 the door\'s pictures are the attributes\' own, in order', Array.isArray(arts) && arts.map((a) => a.key).join(',') === 'hp,def');
  return bad;
}

const mSrc = read('src/game/combatV17.js');
const b1 = behave(await import(url('src/game/combatV17.js')));
check('1-5. the rules do what V17:55 and the game ask', b1.length === 0, b1.join('; '));
const b2 = behave(await moduleOf(mSrc, 'src/game'));
check('1-5. ...and the same from a copy (the plants below are read the same way)', b2.length === 0, b2.join('; '));

/* ── 6. the pages, by their syntax tree ── */
const ROW_OF = { weapon: { ups: 'upgrades', lvl: 'progress', strip: 'damage' }, shared: { ups: 'upgrades', strip: 'strength' } };
const TODAY_ROW = { level: 'progress', strip: 'damage', grid: 'upgrades' };
/* the identifiers a JSX tree draws as {x}, in reading order (each branch of a ?: separately) */
function rowsOf(node, names) {
  const seqs = [];
  const walk = (n, acc) => {
    if (!n || typeof n !== 'object') return acc;
    if (n.type === 'ConditionalExpression') { seqs.push(walk(n.consequent, [])); seqs.push(walk(n.alternate, [])); return acc; }
    if (n.type === 'JSXExpressionContainer' && n.expression && n.expression.type === 'Identifier' && names[n.expression.name]) { acc.push(names[n.expression.name]); return acc; }
    if (n.type === 'JSXExpressionContainer' && n.expression && n.expression.type === 'ConditionalExpression') { seqs.push(walk(n.expression.consequent, [])); seqs.push(walk(n.expression.alternate, [])); return acc; }
    for (const k of Object.keys(n)) {
      if (k === 'loc' || k === 'start' || k === 'end' || k === 'extra') continue;
      const v = n[k];
      if (Array.isArray(v)) v.forEach((c) => walk(c, acc));
      else if (v && typeof v === 'object' && v.type) walk(v, acc);
    }
    return acc;
  };
  const top = walk(node, []);
  if (top.length) seqs.push(top);
  return seqs.filter((s) => s.length);
}
const attrOf = (el, name) => (el.attributes || []).find((a) => a.type === 'JSXAttribute' && a.name && a.name.name === name);
const elName = (el) => (el.name && el.name.type === 'JSXIdentifier' ? el.name.name : '');

/* kind 'weapon' | 'shared' | 'hub' */
function pageFaults(src, kind) {
  const bad = [];
  const ast = parse(src);
  let readsSwitch = false, v17If = null, todayRet = null, commitRole = false, ruleArg = null, asksOneLevel = false;
  B.traverse(ast, {
    CallExpression(p) {
      const c = p.node.callee;
      if (c.type === 'Identifier' && c.name === 'sharedPointsRule') ruleArg = p.node.arguments[0] || null;
      if (c.type === 'Identifier' && c.name === 'isOneLevelEnabled') asksOneLevel = true;
    },
    VariableDeclarator(p) {
      const n = p.node;
      if (n.id && n.id.name === 'V17_COMBAT' && n.init && n.init.type === 'CallExpression' && n.init.callee.name === 'v17CombatWanted' && p.parentPath.parent.type === 'Program') readsSwitch = true;
    },
    IfStatement(p) { if (p.node.test.type === 'Identifier' && p.node.test.name === 'V17_COMBAT') v17If = p; },
    ObjectProperty(p) { const n = p.node; if (n.key && n.key.name === 'commitRole' && n.value.type === 'Identifier' && n.value.name === 'V17_COMBAT') commitRole = true; },
    ReturnStatement(p) {
      const fn = p.getFunctionParent();
      if (!fn || !fn.node.id || !/^(WeaponPage|SharedPage|CombatHub)$/.test(fn.node.id.name)) return;
      if (p.findParent((q) => q === v17If)) return;
      if (p.node.argument && p.node.argument.type === 'JSXElement') todayRet = p.node.argument;
    },
  });
  if (!readsSwitch) bad.push('6 the switch read through v17CombatWanted, once, at the module');
  if (kind === 'shared' && !(ruleArg && ruleArg.type === 'Identifier' && asksOneLevel)) bad.push('6 Shared\'s rule from the worker\'s own (isOneLevelEnabled), never a constant');
  if (!v17If) { bad.push('6 the V17 branch (if (V17_COMBAT))'); return bad; }
  if (kind !== 'hub' && !commitRole) bad.push('6 Spend asked for its commit role (statWindow commitRole: V17_COMBAT)');
  let vRet = null, raw = [], typed = [], noIntent = [], lvlTiles = 0, marks = 0, orderMark = null;
  v17If.traverse({
    ReturnStatement(p) { if (p.node.argument && p.node.argument.type === 'JSXElement') vRet = p.node.argument; },
    JSXOpeningElement(p) {
      const nm = elName(p.node);
      if (nm === 'button') raw.push(nm);
      if (/^Ui2/.test(nm) && !attrOf(p.node, 'intent')) noIntent.push(nm);
      if (nm === 'Ui2LevelTile') { lvlTiles++; if (attrOf(p.node, 'mark')) marks++; }
      const om = attrOf(p.node, 'data-cv-order');
      if (om && om.value && om.value.type === 'StringLiteral') orderMark = om.value.value;
    },
    JSXText(p) { if (p.node.value.trim()) typed.push(p.node.value.trim()); },
  });
  if (raw.length) bad.push('6 a raw <button> in the V17 branch (built FROM the kit)');
  if (typed.length) bad.push('6 a word typed into the V17 branch (through say): ' + typed.join(' | '));
  if (noIntent.length) bad.push('6 a kit piece with no intent: ' + noIntent.join(','));
  const want = kind === 'weapon' ? 'upgrades,progress,damage' : kind === 'shared' ? 'upgrades,strength' : null;
  if (want) {
    const seqs = vRet ? rowsOf(vRet, ROW_OF[kind]) : [];
    if (!seqs.length || seqs.some((s) => s.join(',') !== want)) bad.push('6 the V17 rows in V17_ORDER (' + seqs.map((s) => s.join(',')).join(' / ') + ')');
    if (orderMark !== want) bad.push('6 data-cv-order is V17_ORDER (' + orderMark + ')');
    const tseq = todayRet ? rowsOf(todayRet, TODAY_ROW) : [];
    const tw = kind === 'weapon' ? 'progress,damage,upgrades' : 'damage,upgrades';
    if (!tseq.length || tseq.some((s) => s.join(',') !== tw)) bad.push('6 =0 today\'s order (' + tseq.map((s) => s.join(',')).join(' / ') + ')');
  } else {
    if (lvlTiles < 1) bad.push('6 the hub\'s weapons the kit\'s level tile');
    if (marks < lvlTiles) bad.push('6 the hub\'s weapon state in words (mark), never a colour alone');
    if (!todayRet) bad.push('6 =0 today\'s hub');
  }
  return bad;
}
const PAGES = { weapon: 'src/ui/mobile/sheet/WeaponPage.jsx', shared: 'src/ui/mobile/sheet/SharedPage.jsx', hub: 'src/ui/mobile/sheet/CombatHub.jsx' };
const pSrc = {};
for (const k of Object.keys(PAGES)) {
  pSrc[k] = read(PAGES[k]);
  const f = pageFaults(pSrc[k], k);
  check(`6. ${PAGES[k]}: V17's order behind the switch, today's under =0, built from the kit`, f.length === 0, f.join('; '));
}

/* ── 7. the template's UpgradeGrid ── */
function gridFaults(src) {
  const bad = [];
  const ast = parse(src);
  let fn = null;
  B.traverse(ast, { FunctionDeclaration(p) { if (p.node.id && p.node.id.name === 'UpgradeGrid') fn = p; } });
  if (!fn) return ['7 UpgradeGrid exists'];
  let tile = null;
  fn.traverse({ JSXOpeningElement(p) { if (elName(p.node) === 'Ui2Tile') tile = p.node; } });
  if (!tile) return ['7 a tile is the kit\'s Ui2Tile'];
  const intent = attrOf(tile, 'intent');
  if (!intent || !intent.value || intent.value.value !== 'go') bad.push('7 a tile\'s intent "go" (V17:41: "Power +")');
  const cls = attrOf(tile, 'className');
  const clsSrc = cls ? src.slice(cls.value.start, cls.value.end) : '';
  if (!/plus \? ' is-cue' : ''/.test(clsSrc)) bad.push('7 the "+" cue only from `plus` (none at zero)');
  const art = attrOf(tile, 'art');
  if (!art || !/a\.art/.test(src.slice(art.value.start, art.value.end))) bad.push('7 the picture the game\'s own (a.art)');
  if (!attrOf(tile, 'onClick')) bad.push('7 a tile opens its preview');
  return bad;
}
const tSrc = read('src/ui/mobile/sheet/attrTemplate.jsx');
{ const f = gridFaults(tSrc); check('7. attrTemplate.jsx UpgradeGrid: the kit\'s tile, the game\'s picture, the cue only with points', f.length === 0, f.join('; ')); }

/* ── 8. the preview window's Spend ── */
function popupFaults(src) {
  const bad = [];
  const ast = parse(src);
  let acts = 0, roled = 0, crGated = 0;
  B.traverse(ast, {
    JSXOpeningElement(p) {
      if (!attrOf(p.node, 'data-infopopup-action')) return;
      acts++;
      const r = attrOf(p.node, 'data-u2-role');
      if (!r) return;
      roled++;
      const e = r.value && r.value.expression;
      if (e && e.type === 'ConditionalExpression' && e.test.type === 'Identifier' && e.test.name === 'cr' && e.alternate.type === 'Identifier' && e.alternate.name === 'undefined') {
        const inner = src.slice(e.consequent.start, e.consequent.end);
        if (/'commit'/.test(inner) && /'disabled'/.test(inner)) crGated++;
      }
    },
  });
  if (acts < 2) bad.push('8 both Spend buttons found (' + acts + ')');
  if (roled < acts) bad.push('8 every Spend wears data-u2-role when asked');
  if (crGated < acts) bad.push('8 the role only when the opener asks (cr), commit or disabled');
  if (!/const cr = !!cur\.commitRole;/.test(src)) bad.push('8 the ask read from the window\'s payload (commitRole)');
  return bad;
}
const ipSrc = read('src/ui/mobile/InfoPopup.jsx');
{ const f = popupFaults(ipSrc); check('8. InfoPopup.jsx: Spend the commit role when the combat pages ask, nothing else changed', f.length === 0, f.join('; ')); }
const swSrc = read('src/ui/mobile/sheet/statWindow.jsx');
check('8. statWindow.jsx: the ask carried to the window (payload.commitRole), only when asked', /const commitRole = ctx\.commitRole === true;/.test(swSrc) && /if \(commitRole\) payload\.commitRole = true;/.test(swSrc));

/* ── P. THE DODGES: each planted, each red ── */
async function plantRule(label, from, to) {
  if (mSrc.indexOf(from) < 0) { check('P plant "' + label + '" finds its text', false, from); return; }
  let bad;
  try { bad = behave(await moduleOf(mSrc.split(from).join(to), 'src/game')); } catch (e) { bad = ['threw']; }
  check('P plant red: ' + label, bad.length > 0);
}
await plantRule('the switch off by default', "  try { return !(ls && ls.getItem(V17_COMBAT_KEY) === '0'); } catch (e) { return true; }", "  try { return !!(ls && ls.getItem(V17_COMBAT_KEY) === '1'); } catch (e) { return false; }");
await plantRule('?v17combat=0 not remembered', "if (v === '0') ls.setItem(V17_COMBAT_KEY, '0'); else ls.removeItem(V17_COMBAT_KEY);", 'void 0;');
await plantRule('the level first again (today\'s order under the switch)', "weapon: Object.freeze(['upgrades', 'progress', 'damage']),", "weapon: Object.freeze(['progress', 'damage', 'upgrades']),");
await plantRule('Shared\'s strength first', "shared: Object.freeze(['upgrades', 'strength']),", "shared: Object.freeze(['strength', 'upgrades']),");
await plantRule('the grid squeezed under two presses (a global shrink)', "  return Math.max(R.GRID_MIN, Math.floor(v - R.LINE - R.FOOT - 2 * R.GAP));", "  return Math.floor(v - R.LINE - R.FOOT - 2 * R.GAP);");
await plantRule('larger art on a computer (V17:31)', '  return Math.max(12, Math.min(30, Math.floor(row - V17_TILE_WORDS)));', '  return Math.max(12, Math.floor(row - V17_TILE_WORDS));');
await plantRule('the picture over its words (the value cut at the tile\'s foot)', '  return Math.max(12, Math.min(30, Math.floor(row - V17_TILE_WORDS)));', '  return Math.max(18, Math.min(30, Math.floor(row - 20)));');
await plantRule('the Shared door\'s count forgotten (its pictures under it)', '  return 16 + (Number(artPx) || 0) + 6 + (pointsShown ? 70 : 0);', '  return 16 + (Number(artPx) || 0) + 6;');
await plantRule('a picture sideways where the row cannot hold it', "return Number.isFinite(v) && v >= 58 ? 16 : 0;", 'return 16;');
await plantRule('the four facts squeezed into a phone\'s row', "  return v >= (shape === 'side' ? V17_FACTS_W.side : V17_FACTS_W.up);", '  return v > 0;');
await plantRule('the rule squeezed into a 320 px row', "  return v >= (shape === 'side' ? V17_RULE_W.side : V17_RULE_W.up);", '  return v > 0;');
await plantRule('V17\'s "three a weapon level" told blindly (Q1 settled by a menu)', "key: oneLevel === false ? 'combatV17.ruleEvery' : 'combatV17.ruleBest'", "key: 'combatV17.ruleEvery'");
await plantRule('the count a level made up', '  const per = Number.isFinite(Number(n)) && Number(n) > 0 ? Math.floor(Number(n)) : SHARED_PER_LEVEL;', '  const per = 6;');
await plantRule('sideways stacked (the 63 px page)', '  return short ? \'side\' : \'up\';', "  return 'up';");
await plantRule('the Shared door\'s row cut (one picture too many)', '  const fit = Math.floor((v + 2) / 20);', '  const fit = Math.ceil((v + 2) / 20);');
await plantRule('one lonely picture drawn', '  return fit >= all ? all : fit >= 3 ? fit : 0;', '  return fit >= all ? all : fit;');
async function plantPage(kind, label, from, to) {
  const s = pSrc[kind];
  if (s.indexOf(from) < 0) { check('P plant "' + label + '" finds its text', false, from); return; }
  check('P plant red: ' + label, pageFaults(s.split(from).join(to), kind).length > 0);
}
await plantPage('weapon', 'the level row first under the switch', "{shape === 'side' ? <div className=\"u2-wp-row is-one\">{ups}{lvl}{strip}</div> : <>{ups}<div className=\"u2-cv-foot\">{lvl}{strip}</div></>}", "{shape === 'side' ? <div className=\"u2-wp-row is-one\">{lvl}{ups}{strip}</div> : <>{ups}<div className=\"u2-cv-foot\">{lvl}{strip}</div></>}");
await plantPage('weapon', 'damage above the upgrades upright', '<>{ups}<div className="u2-cv-foot">{lvl}{strip}</div></>}', '<><div className="u2-cv-foot">{lvl}{strip}</div>{ups}</>}');
await plantPage('weapon', '=0 not today\'s page (the off-ramp reordered too)', '{short ? <div className="u2-wp-row is-one">{level}{strip}{grid}</div> : <>{level}{strip}{grid}</>}', '{short ? <div className="u2-wp-row is-one">{grid}{level}{strip}</div> : <>{grid}{level}{strip}</>}');
await plantPage('weapon', 'the switch always on', 'const V17_COMBAT = v17CombatWanted();', 'const V17_COMBAT = true;');
await plantPage('shared', 'Shared\'s rule told as V17\'s (not the worker\'s onelevel)', 'const rule = sharedPointsRule(oneLevel);', 'const rule = sharedPointsRule(false);');
await plantPage('weapon', 'Spend not asked for its commit role', 'sharedAvail: pools.shared, commitRole: V17_COMBAT,', 'sharedAvail: pools.shared,');
await plantPage('weapon', 'a word typed in, not the game\'s', '<span className="u2-wp-lv">{say(SAY, \'combatHub.lv\', { n: prog.level })}</span>\n        <span className="u2-bar u2-wp-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((prog.max ? 1 : prog.frac) * 100)} aria-label={xpWords + \'. \' + roadWords}>\n          <span className="u2-bar-top"><b>{xpWords}</b></span>', '<span className="u2-wp-lv">Level {prog.level}</span>\n        <span className="u2-bar u2-wp-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((prog.max ? 1 : prog.frac) * 100)} aria-label={xpWords + \'. \' + roadWords}>\n          <span className="u2-bar-top"><b>{xpWords}</b></span>');
await plantPage('weapon', 'the order mark lying', 'data-cv-order="upgrades,progress,damage"', 'data-cv-order="progress,damage,upgrades"');
await plantPage('shared', 'strength above the seven upright', '<>{ups}<div className="u2-cv-foot">{strip}</div></>}', '<><div className="u2-cv-foot">{strip}</div>{ups}</>}');
await plantPage('shared', 'a raw button in the V17 branch', "    const ups = <UpgradeGrid line={line} attrs={attrsOf} mark=\"shared\"", "    const raw = <button type=\"button\" />;\n    const ups = <UpgradeGrid line={line} attrs={attrsOf} mark=\"shared\"");
await plantPage('hub', 'a weapon a plain door (not the level tile)', '<Ui2LevelTile key={w.id} intent="go"', '<Ui2Tile key={w.id} intent="go"');
await plantPage('hub', 'the hand a colour alone (no words)', 'cue={pts} mark={state} held=', 'cue={pts} held=');
await plantPage('hub', 'the Shared door with no intent', '<Ui2Tile key={sDoor.id} intent="go"', '<Ui2Tile key={sDoor.id}');
async function plantGrid(label, from, to) {
  if (tSrc.indexOf(from) < 0) { check('P plant "' + label + '" finds its text', false, from); return; }
  check('P plant red: ' + label, gridFaults(tSrc.split(from).join(to)).length > 0);
}
await plantGrid('the "+" at zero (a plus that does nothing)', "className={'u2-cv-up' + (plus ? ' is-cue' : '')}", "className={'u2-cv-up is-cue'}");
await plantGrid('a tile with no intent', '<Ui2Tile key={a.key} intent="go" size="primary"', '<Ui2Tile key={a.key} size="primary"');
await plantGrid('a made-up picture', "art={art > 0 ? a.art : undefined}", "art={art > 0 ? '/icons/ui/plus.png' : undefined}");
async function plantPopup(label, from, to) {
  if (ipSrc.indexOf(from) < 0) { check('P plant "' + label + '" finds its text', false, from); return; }
  check('P plant red: ' + label, popupFaults(ipSrc.split(from).join(to)).length > 0);
}
await plantPopup('the stepper\'s Spend without its role', "              data-u2-role={cr ? ((spending || stepN < 1) ? 'disabled' : 'commit') : undefined}\n", '');
await plantPopup('every window\'s Spend given the role (not only when asked)', "data-u2-role={cr ? (cur.action.blocked ? 'disabled' : 'commit') : undefined}", "data-u2-role={cur.action.blocked ? 'disabled' : 'commit'}");
await plantPopup('a blocked Spend dressed as commit', "data-u2-role={cr ? (cur.action.blocked ? 'disabled' : 'commit') : undefined}", "data-u2-role={cr ? 'commit' : undefined}");

try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* a temp dir */ }
console.log(failed ? `\n${failed} FAILED` : '\nall ok');
process.exit(failed ? 1 : 0);
