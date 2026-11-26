/* ═══ v2.3.6689: BRO'S EQUIPMENT SHOWCASE, AND THE ROADS INTO THE ONE ITEM PAGE (card UI2-gear PR 3) ═══
 *
 * src/game/gearShowcase.js: the body's ONE shape (Gear's Equipped panel and
 * the showcase), whose showcase it is and what it offers (Manage Gear only
 * for yourself), and the sources a showcase cell and the player card's
 * equipment row hand to the one item page (dash/itemPageOpen.js).  What the
 * page then shows is src/game/itemInspect.js's (item-inspect.test).
 *
 * THE DODGES, each planted below and seen red:
 *   S1  Manage Gear offered on another player's showcase;
 *   S2  another player's cell opened as yours (no owner: their item with your actions);
 *   S3  a showcase cell opened by a source of its own, not Gear's `cell` (two item pages for one item);
 *   S4  the profile's slot of another player opened with actions, or as "Worn";
 *   S5  an empty (ghost) slot opening a page;
 *   S6  your own profile slot opened without Gear's cell (the held weapon's hand lost);
 *   S7  the body's shape broken (a weapon off the left column, the torso off the middle);
 *   S8  a cell under 44 px at a phone's, a small phone's, a sideways phone's or a computer's page;
 *   S9  the showcase drawing the bag (its storage grid);
 *   S10 Gear's Equipped panel laying its cells out by a table of its own (the two shapes drifting).
 *
 *   node tools/guards/gear-showcase.test.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import * as REAL_MOD from '../../src/game/gearShowcase.js';
import { inspectItem } from '../../src/game/itemInspect.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
let fails = 0;
const check = (name, ok, detail) => {
  if (ok) console.log('  ok   ' + name);
  else { fails += 1; console.log('  FAIL ' + name + (detail !== undefined ? '  ' + JSON.stringify(detail) : '')); }
};

const R = { activeSlot: 'ranged', weapon: { type: 'greatsword' }, rangedWeapon: { type: 'bow' }, shield: { name: 'Buckler' } };
const PEER = { isSelf: false, name: 'Diego' };
const SELF = { isSelf: true, name: 'You' };
const slot = (s, ghost) => ({ slot: s, label: s, iconSrc: '/x.webp', ghost: !!ghost, name: 'Thing' });
/* the page's model for a source, the way itemPageOpen.js narrows it (owner or peer: another player's) */
const pageOf = (src) => inspectItem({
  place: src && (src.owner || src.peer) ? 'other' : 'worn', owner: src && src.owner, kind: 'sword', name: 'Greatsword',
  actions: src && (src.owner || src.peer) ? [] : [{ id: 'unequip', label: 'Unequip', tone: 'primary', off: false, why: '' }],
});
/* the page heights the frame gives (measured on the test box: mp-ui2gear's shapes): upright phones, a
   phone on its side, a computer's band */
const ROOMS = [
  { tag: '390x844', w: 382, h: 205 }, { tag: '375x667', w: 367, h: 197 },
  { tag: '844x390', w: 836, h: 82 }, { tag: '844x390 (shortest)', w: 836, h: 52 },
  { tag: 'computer', w: 760, h: 205 },
];

function suite(M, files) {
  const out = [];
  const t = (name, ok, detail) => out.push({ name, ok: !!ok, detail });
  /* S1 */
  t('S1. Manage Gear only for yourself', M.showcaseOf(null).manage === true && M.showcaseOf({ name: 'Diego' }).manage === false && M.showcaseOf('Diego').manage === false);
  /* S2 */
  const other = M.showcaseItemSource(R, 'sword', { name: 'Diego' });
  t('S2. another player\'s cell is theirs (owner), read-only on the page, never a bag entry (itemPageInput serves an entry before its owner test)', !!other && other.owner === 'Diego' && !other.entry && pageOf(other).readOnly && pageOf(other).actions.length === 0, other && { owner: other.owner });
  /* S3 */
  const mine = M.showcaseItemSource(R, 'sword', null);
  t('S3. a showcase cell hands Gear\'s own source ({ R, cell }), no owner', !!mine && mine.R === R && mine.cell === 'sword' && !mine.owner && !mine.peer && !mine.entry,
    mine && Object.keys(mine));
  t('S3. an unknown cell opens nothing', M.showcaseItemSource(R, 'helmet', null) === null && M.showcaseItemSource(null, 'sword', null) === null);
  /* S4 */
  const ps = M.profileItemSource(PEER, slot('weapon'), R);
  t('S4. another player\'s profile slot: theirs, read-only, never your record', !!ps && ps.owner === 'Diego' && !!ps.peer && !ps.R && !ps.entry && pageOf(ps).readOnly && pageOf(ps).actions.length === 0
    && pageOf(ps).where !== 'Worn', ps && Object.keys(ps));
  /* S5 */
  t('S5. an empty slot opens nothing', M.profileItemSource(PEER, slot('shield', true), R) === null && M.profileItemSource(SELF, slot('shield', true), R) === null);
  /* S6 */
  const own = M.profileItemSource(SELF, slot('weapon'), R);
  const ownShield = M.profileItemSource(SELF, slot('shield'), R);
  t('S6. your profile slot goes by Gear\'s cell (the weapon: the hand you hold)', !!own && own.R === R && own.cell === 'bow' && !own.owner && !!ownShield && ownShield.cell === 'shield',
    own && { cell: own.cell });
  /* S7 */
  const B = M.GEAR_BODY;
  const col = (ids, c) => ids.every((id) => B[id] && B[id][0] === c);
  const rows = (ids) => ids.map((id) => B[id] && B[id][1]).join() === '0,1,2';
  t('S7. the body: the weapons down the left, Cape, Chest, Legs in the middle, Shield, Amulet, Gem down the right',
    Object.keys(B).length === 9 && col(['sword', 'bow', 'staff'], 0) && col(['cape', 'chest', 'legs'], 1) && col(['shield', 'amulet', 'gem'], 2)
    && rows(['sword', 'bow', 'staff']) && rows(['cape', 'chest', 'legs']) && rows(['shield', 'amulet', 'gem'])
    && M.GEAR_BODY_ROW.map((g) => g.join()).join('|') === 'sword,bow,staff|cape,chest,legs|shield,amulet,gem');
  /* S8 */
  for (const rm of ROOMS) {
    const g = M.showcaseGeometry(rm.w, rm.h, true);
    const used = g.short ? g.figW + g.bodyW + 140 + 16 : g.bodyW + 8 + 4 * 2 + Math.max(g.figW, 120);
    t(`S8. ${rm.tag}: every cell 44 px or more, the body and the figure inside the page`, g.bodyCell >= 44 && g.torsoW >= 44 && used <= rm.w
      && (g.short || 3 * g.bodyCell + 12 <= rm.h - 8 || rm.h < 152), { cell: g.bodyCell, torso: g.torsoW, used, w: rm.w, short: g.short });
  }
  /* S9 */
  const imp = (files.show.match(/^import[^\n]*$/gm) || []).join('\n');
  t('S9. the showcase draws no bag (no bag model, storage grid or bag tile)', !/getBagEntries|Ui2ItemGrid|BagTile|bagModel|InventoryPanel/.test(imp) && /EquippedBody/.test(files.show));
  /* S10 */
  t('S10. Gear\'s Equipped panel lays its cells out by the one table (GEAR_BODY), none of its own',
    /import\s*\{[^}]*GEAR_BODY[^}]*\}\s*from\s*'@\/game\/gearShowcase\.js'/.test(files.panels) && !/sword:\s*\[0,\s*0\]/.test(files.panels));
  return out;
}

const FILES = { show: read('src/ui/mobile/sheet/GearShowcase.jsx'), panels: read('src/ui/mobile/dash/GearPanels.jsx') };
console.log('1. the rules, as built');
for (const r of suite(REAL_MOD, FILES)) check('1. ' + r.name, r.ok, r.detail);

console.log('2. the roads, as wired (read off the syntax tree: an ALLOW list, v2.3.6689 the mend)');
/* v2.3.6689 (card UI2-gear PR 3, its mend: sitting 70's gatekeeper held #2391 because 2b to 2d read the
   wiring as text, and the card's own dodge "Equip offered on another player's item" stayed green when
   planted at the PR's own roads).  Each road is read off Babel's tree and must be one of the shapes
   allowed below; anything else is red:
     2b  GearShowcase.jsx: every openItemPage call hands a const made by showcaseItemSource(R, cell,
         sc.self ? null : who), `cell` the tapping function's own, `who` the component's, `sc` showcaseOf's;
     2c  InspectPlayerPanel.jsx: every openItemPage call is openCardItem's, handing a const made by
         profileItemSource(p, slot, <a test of p.isSelf> ? <your record> : null), p and slot its own
         parameters, and every onItem is openCardItem;
     2d  itemPageOpen.js: openItemPage keeps the source whole (_src = Object.freeze({ ...src }), its
         only writer; src read only for its test), the bus hands _src back, itemPageInput gives an
         owner's cell the place 'other', its owner and NO actions before it can return the cell's own
         page, fromPeer the same; ItemPage.jsx draws inspectItem(got.input) of itemPageInput(itemPageBus.state). */
const hub = read('src/game/broHub.js');
const card = read('src/ui/mobile/sheet/BroCard.jsx');
check('2a. Bro\'s Equipment door opens the showcase page (broEquip), its page drawn by GearShowcase',
  /id: 'equipment'[^\n]*opens: 'page:broEquip'/.test(hub) && /broEquip: 'equip'/.test(hub) && /door === 'equip'\) return <GearShowcase/.test(card));
/* the parser from the root's packages, else server/'s: Server CI installs only server/ (combat-hub.test's way) */
let BAB = null;
for (const pkg of ['package.json', 'server/package.json']) {
  try { const REQ = createRequire(path.join(ROOT, pkg)); const tr = REQ('@babel/traverse'); BAB = { parse: REQ('@babel/parser').parse, traverse: tr.default || tr }; break; } catch (e) { BAB = null; }
}
check('2. @babel/parser and @babel/traverse load (npm install in the root or server/)', !!BAB);
const progOf = (src) => {
  const ast = BAB.parse(src, { sourceType: 'module', plugins: ['jsx'] });
  let prog = null;
  BAB.traverse(ast, { Program(p) { prog = p; p.stop(); } });
  return prog;
};
const isId = (n, name) => !!n && n.type === 'Identifier' && (name === undefined || n.name === name);
const isMem = (n, obj, prop) => !!n && n.type === 'MemberExpression' && !n.computed && isId(n.object, obj) && isId(n.property, prop);
const isNull = (n) => !!n && n.type === 'NullLiteral';
const keyOf = (pr) => (pr.key && (pr.key.name || pr.key.value)) || null;
/* an object literal's explicit properties, each AFTER the last spread (a spread after them would win) */
const explicit = (obj) => {
  if (!obj || obj.type !== 'ObjectExpression') return null;
  const out = Object.create(null);
  let lastSpread = -1;
  obj.properties.forEach((pr, i) => { if (pr.type === 'SpreadElement') lastSpread = i; });
  obj.properties.forEach((pr, i) => { if (pr.type === 'ObjectProperty' && !pr.computed && i > lastSpread) out[keyOf(pr)] = pr.value; });
  return out;
};
const isStr = (n, v) => !!n && n.type === 'StringLiteral' && n.value === v;
const isEmptyArr = (n) => !!n && n.type === 'ArrayExpression' && n.elements.length === 0;
/* a local name bound to the named import of `fromRe`'s module, exactly */
const importOf = (scope, name) => {
  const b = scope.getBinding(name);
  if (!b || !b.path.isImportSpecifier()) return null;
  const im = b.path.node.imported;
  return { name: im.name || im.value, source: b.path.parentPath.node.source.value, binding: b };
};
/* the item page's module may come in by its one named door only: `import { openItemPage } from ...itemPageOpen.js`,
   and openItemPage is only ever called (never handed on, renamed or reached through a namespace) */
function pageDoor(prog, tag, t) {
  const decls = prog.get('body').filter((st) => st.isImportDeclaration() && /(^|\/)itemPageOpen\.js$/.test(st.node.source.value));
  const specs = decls.flatMap((d) => d.node.specifiers);
  const one = specs.length === 1 && specs[0].type === 'ImportSpecifier' && (specs[0].imported.name || specs[0].imported.value) === 'openItemPage' && specs[0].local.name === 'openItemPage';
  t(`${tag}. the item page comes in by its one door (import { openItemPage }), nothing else of its module`, one, specs.map((s) => s.local.name));
  const b = prog.scope.getBinding('openItemPage');
  const refs = b ? b.referencePaths : [];
  const calls = refs.filter((r) => r.parentPath.isCallExpression() && r.parentPath.node.callee === r.node).map((r) => r.parentPath);
  t(`${tag}. openItemPage is only called, never handed on`, !!b && refs.length > 0 && calls.length === refs.length && b.constantViolations.length === 0, refs.length - calls.length);
  return calls;
}
/* the call's one argument: a never-written name made by a call of `maker` imported from the rules (gearShowcase.js) */
function madeBy(call, maker) {
  const args = call.node.arguments;
  if (args.length !== 1 || !isId(args[0])) return { why: 'the source is not a name (built in place?)' };
  const b = call.scope.getBinding(args[0].name);
  if (!b || !b.path.isVariableDeclarator() || b.constantViolations.length) return { why: 'the source is not one never-written local' };
  const init = b.path.get('init');
  if (!init.isCallExpression() || !isId(init.node.callee)) return { why: 'the source is not made by a call' };
  const im = importOf(init.scope, init.node.callee.name);
  if (!im || im.name !== maker || im.source !== '@/game/gearShowcase.js') return { why: `the source is not made by ${maker} (gearShowcase.js)` };
  return { init };
}
const fnOf = (p) => p.getFunctionParent();

function wiring(T) {
  const out = [];
  const t = (name, ok, detail) => out.push({ name, ok: !!ok, detail });
  /* 2b. the showcase's tap */
  {
    const prog = progOf(T.show);
    const calls = pageDoor(prog, '2b', t);
    let comp = null;
    prog.traverse({ FunctionDeclaration(p) { if (p.node.id && p.node.id.name === 'GearShowcase') { comp = p; p.stop(); } } });
    const whoB = comp && comp.scope.getBinding('who');
    const scB = comp && comp.scope.getBinding('sc');
    const scOk = !!scB && scB.path.isVariableDeclarator() && !scB.constantViolations.length && scB.path.get('init').isCallExpression()
      && (() => { const c = scB.path.node.init.callee; const im = isId(c) && importOf(scB.path.scope, c.name); return !!im && im.name === 'showcaseOf' && im.source === '@/game/gearShowcase.js'; })();
    const bad = [];
    for (const c of calls) {
      const m = madeBy(c, 'showcaseItemSource');
      if (!m.init) { bad.push(m.why); continue; }
      const fn = fnOf(c);
      const a = m.init.node.arguments;
      const cellP = fn && fn.node.params.length === 1 && isId(fn.node.params[0]) ? fn.node.params[0].name : null;
      const ownerOk = a.length === 3 && a[2].type === 'ConditionalExpression' && isMem(a[2].test, 'sc', 'self') && isNull(a[2].consequent) && isId(a[2].alternate, 'who')
        && m.init.scope.getBinding('sc') === scB && m.init.scope.getBinding('who') === whoB && !!whoB && whoB.kind === 'param' && !whoB.constantViolations.length;
      if (!(a.length === 3 && isId(a[0], 'R') && !!cellP && isId(a[1], cellP))) bad.push('showcaseItemSource is not handed (R, the tapped cell, ...)');
      else if (!ownerOk) bad.push('the owner is not handed on (sc.self ? null : who)');
      else if (!(fn.parentPath.isVariableDeclarator() && isId(fn.parentPath.node.id, 'tap') && fnOf(fn) === comp)) bad.push('the call is not the component\'s tap');
    }
    t('2b. a showcase cell opens the one item page by showcaseItemSource, another player\'s handing its owner (sc.self ? null : who)', calls.length > 0 && scOk && bad.length === 0, { calls: calls.length, scOk, bad });
  }
  /* 2c. the card's equipment row */
  {
    const prog = progOf(T.prof);
    const calls = pageDoor(prog, '2c', t);
    const bad = [];
    for (const c of calls) {
      const fn = fnOf(c);
      const named = fn && (fn.node.id ? fn.node.id.name : (fn.parentPath.isVariableDeclarator() && isId(fn.parentPath.node.id) ? fn.parentPath.node.id.name : null));
      if (named !== 'openCardItem') { bad.push('openItemPage called outside openCardItem'); continue; }
      const m = madeBy(c, 'profileItemSource');
      if (!m.init) { bad.push(m.why); continue; }
      const ps = fn.node.params;
      const a = m.init.node.arguments;
      const pN = ps.length === 2 && isId(ps[0]) && isId(ps[1]) ? ps[0].name : null;
      const unwritten = pN && !fn.scope.getBinding(pN).constantViolations.length && !fn.scope.getBinding(ps[1].name).constantViolations.length;
      let selfTest = false;
      if (a.length === 3 && a[2].type === 'ConditionalExpression') m.init.get('arguments.2.test').traverse({ MemberExpression(mp) { if (isMem(mp.node, pN, 'isSelf')) selfTest = true; } });
      if (a.length === 3 && a[2].type === 'ConditionalExpression' && isMem(a[2].test, pN, 'isSelf')) selfTest = true;
      if (!(a.length === 3 && pN && unwritten && isId(a[0], pN) && isId(a[1], ps[1].name))) bad.push('profileItemSource is not handed openCardItem\'s own (p, slot)');
      else if (!(selfTest && isNull(a[2].alternate))) bad.push('another player\'s slot is handed a record (not p.isSelf ? ... : null)');
    }
    const onItem = [];
    prog.traverse({
      ObjectProperty(p) { if (keyOf(p.node) === 'onItem') onItem.push(isId(p.node.value, 'openCardItem')); },
      JSXAttribute(p) { if (p.node.name.name === 'onItem') onItem.push(!!p.node.value && p.node.value.type === 'JSXExpressionContainer' && isId(p.node.value.expression, 'openCardItem')); },
    });
    t('2c. the card\'s equipment row opens the one item page by profileItemSource of its own (p, slot), another player\'s with no record',
      calls.length > 0 && bad.length === 0 && onItem.length > 0 && onItem.every(Boolean), { calls: calls.length, bad, onItem });
  }
  /* 2d. the page keeps the owner to where its actions are offered */
  {
    const prog = progOf(T.open);
    const fns = Object.create(null);
    prog.traverse({ FunctionDeclaration(p) { if (p.node.id) fns[p.node.id.name] = p; } });
    const oip = fns.openItemPage;
    /* openItemPage: src read only for its test, kept whole in _src */
    let keep = false;
    const srcUses = [];
    if (oip && oip.node.params.length === 1 && isId(oip.node.params[0])) {
      const sN = oip.node.params[0].name;
      const sB = oip.scope.getBinding(sN);
      for (const r of sB.referencePaths) {
        const par = r.parentPath;
        if (par.isUnaryExpression({ operator: '!' })) { srcUses.push('test'); continue; }
        if (par.isMemberExpression() && par.node.object === r.node && !par.node.computed && /^(R|peer)$/.test(par.node.property.name) && par.parentPath.isLogicalExpression()) { srcUses.push('test'); continue; }
        if (par.isSpreadElement() && par.parentPath.isObjectExpression() && par.parentPath.node.properties.length === 1 && par.parentPath.parentPath.isCallExpression()
          && isMem(par.parentPath.parentPath.node.callee, 'Object', 'freeze') && par.parentPath.parentPath.parentPath.isAssignmentExpression()
          && isId(par.parentPath.parentPath.parentPath.node.left, '_src')) { srcUses.push('kept'); continue; }
        srcUses.push('OTHER');
      }
      keep = !sB.constantViolations.length && srcUses.includes('kept') && !srcUses.includes('OTHER');
    }
    const srcB = prog.scope.getBinding('_src');
    const writers = srcB ? srcB.constantViolations : [];
    const oneWriter = !!srcB && isNull(srcB.path.node.init) && writers.length === 1 && !!oip && fnOf(writers[0]) === oip;
    let busOk = false;
    prog.traverse({ ObjectMethod(p) { if (p.node.kind === 'get' && keyOf(p.node) === 'state') { const b = p.node.body.body; busOk = b.length === 1 && b[0].type === 'ReturnStatement' && isId(b[0].argument, '_src'); } } });
    t('2d. openItemPage keeps the source whole (Object.freeze({ ...src }) its one write; src read for its test only) and the bus hands it back',
      keep && oneWriter && busOk, { srcUses, writers: writers.length, busOk });
    /* the read-only page: place other, the owner, no actions; explicit after every spread */
    const readOnly = (obj, top) => {
      const e = explicit(obj);
      const inp = e && explicit(e.input);
      return !!inp && isStr(e.place, 'other') && isNull(e.target) && (!top || isNull(e.unequip))
        && isStr(inp.place, 'other') && isMem(inp.owner, 'src', 'owner') && isEmptyArr(inp.actions);
    };
    const fp = fns.fromPeer;
    const fpRets = [];
    if (fp) fp.traverse({ ReturnStatement(r) { if (fnOf(r) === fp) fpRets.push(r.node.argument); } });
    const peerOk = fpRets.length === 1 && readOnly(fpRets[0], false) && fp.node.params.length === 1 && isId(fp.node.params[0], 'src');
    /* itemPageInput: its returns, each one of the allowed; the owner's read-only return before the cell's own */
    const ipi = fns.itemPageInput;
    const rets = [];
    let ownerAt = -1, gotAt = -1;
    const why = [];
    if (ipi && ipi.node.params.length === 1 && isId(ipi.node.params[0], 'src') && !ipi.scope.getBinding('src').constantViolations.length) {
      ipi.traverse({ ReturnStatement(r) { if (fnOf(r) === ipi) rets.push(r); } });
      for (const r of rets) {
        const a = r.node.argument;
        const ifp = r.parentPath.isIfStatement() ? r.parentPath : null;
        const test = ifp ? ifp.node.test : null;
        if (isNull(a)) continue;
        if (a.type === 'CallExpression' && isId(a.callee, 'fromPeer') && a.arguments.length === 1 && isId(a.arguments[0], 'src') && isMem(test, 'src', 'peer')) continue;
        if (a.type === 'CallExpression' && isId(a.callee, 'fromEntry') && isMem(test, 'src', 'entry')) continue;   /* an owner's source carries no entry: 1's S2-S4 */
        if (a.type === 'ObjectExpression' && test && test.type === 'LogicalExpression' && test.operator === '&&' && isId(test.left, 'got') && isMem(test.right, 'src', 'owner') && readOnly(a, true)) { ownerAt = r.node.start; continue; }
        if (isId(a, 'got') && !ifp) {
          const gB = r.scope.getBinding('got');
          const gi = gB && gB.path.isVariableDeclarator() ? gB.path.node.init : null;
          if (gB && !gB.constantViolations.length && gi && gi.type === 'CallExpression' && isId(gi.callee, 'fromCell')) { gotAt = r.node.start; continue; }
        }
        why.push(T.open.slice(r.node.start, Math.min(r.node.end, r.node.start + 80)));
      }
    } else why.push('itemPageInput(src) not found, or src written');
    t('2d. itemPageInput gives an owner\'s cell the place other, its owner and no actions, before the cell\'s own page; fromPeer the same; no other return',
      peerOk && ownerAt >= 0 && gotAt > ownerAt && why.length === 0, { peerOk, ownerAt, gotAt, why });
  }
  /* 2e. the page draws what itemPageInput gives for the bus's source */
  {
    const prog = progOf(T.page);
    const bad = [];
    let n = 0, m = 0;
    prog.traverse({
      CallExpression(p) {
        const c = p.node.callee;
        if (isId(c, 'itemPageInput')) { n += 1; if (!(p.node.arguments.length === 1 && isMem(p.node.arguments[0], 'itemPageBus', 'state'))) bad.push('itemPageInput of another source'); }
        if (isId(c, 'inspectItem')) {
          m += 1;
          const a = p.node.arguments[0];
          const gB = a && a.type === 'MemberExpression' && isId(a.object) && isId(a.property, 'input') ? p.scope.getBinding(a.object.name) : null;
          const gi = gB && gB.path.isVariableDeclarator() ? gB.path.node.init : null;
          if (!(gB && !gB.constantViolations.length && gi && gi.type === 'CallExpression' && isId(gi.callee, 'itemPageInput'))) bad.push('inspectItem of something not itemPageInput\'s input');
        }
      },
    });
    t('2e. the item page draws inspectItem(got.input) of itemPageInput(itemPageBus.state), nothing else', n > 0 && m > 0 && bad.length === 0, { n, m, bad });
  }
  return out;
}

const WIRE = {
  show: FILES.show, prof: read('src/ui/panels/InspectPlayerPanel.jsx'),
  open: read('src/ui/mobile/dash/itemPageOpen.js'), page: read('src/ui/mobile/dash/ItemPage.jsx'),
};
if (BAB) for (const r of wiring(WIRE)) check(r.name, r.ok, r.detail);

console.log('3. the dodges, planted (each must turn its rule red)');
const plant = (id, over, files) => {
  const M = { ...REAL_MOD, ...over };
  const res = suite(M, files || FILES).filter((r) => r.name.startsWith(id + '.'));
  check(`3. plant ${id}: turns ${id} red`, res.length > 0 && res.some((r) => !r.ok));
};
plant('S1', { showcaseOf: (who) => ({ self: who == null, manage: true, owner: '' }) });
plant('S2', { showcaseItemSource: (R0, cell) => ({ from: 'showcase', R: R0, cell }) });
plant('S3', { showcaseItemSource: (R0, cell, who) => ({ from: 'showcase', R: R0, entry: { kind: 'worn', key: cell }, owner: who ? 'x' : undefined }) });
plant('S4', { profileItemSource: (p, s, R0) => (s.ghost ? null : { from: 'profile', R: R0, cell: 'sword' }) });
plant('S5', { profileItemSource: (p, s, R0) => (p.isSelf ? { from: 'profile', R: R0, cell: 'shield' } : { from: 'profile', owner: p.name, peer: { slot: s.slot } }) });
plant('S6', { profileItemSource: (p, s, R0) => (s.ghost ? null : p.isSelf ? { from: 'profile', R: R0, cell: s.slot === 'weapon' ? 'sword' : s.slot } : REAL_MOD.profileItemSource(p, s, R0)) });
plant('S7', { GEAR_BODY: { ...REAL_MOD.GEAR_BODY, bow: [1, 1], chest: [0, 1] } });
plant('S8', { showcaseGeometry: (w, h, m) => ({ ...REAL_MOD.showcaseGeometry(w, h, m), bodyCell: 40 }) });
plant('S9', {}, { ...FILES, show: FILES.show.replace("import { Ui2Action", "import { Ui2ItemGrid, Ui2Action") });
plant('S10', {}, { ...FILES, panels: FILES.panels.replace("const BODY = GEAR_BODY;", "const BODY = Object.freeze({ sword: [0, 0] });") });

/* v2.3.6689 (the mend): the card's dodge "Equip offered on another player's item", planted at each road */
plant('S2', { showcaseItemSource: (R0, cell, who) => (who ? { from: 'showcase', R: R0, entry: { kind: 'worn', key: cell }, owner: 'Diego' } : REAL_MOD.showcaseItemSource(R0, cell, who)) });
const wirePlant = (tag, file, from, to) => {
  if (!BAB) return;
  const txt = WIRE[file];
  if (txt.indexOf(from) < 0) { check(`3. plant ${tag}: its text is found to plant`, false, from); return; }
  let red = false;
  try { red = wiring({ ...WIRE, [file]: txt.replace(from, to) }).some((r) => !r.ok); } catch (e) { red = true; }
  check(`3. plant ${tag}: turns the roads red`, red);
};
wirePlant('W1 (openItemPage drops owner)', 'open', '_src = Object.freeze({ ...src });', 'const { owner, ...kept } = src; _src = Object.freeze({ ...kept });');
wirePlant('W2 (openItemPage blanks owner)', 'open', '_src = Object.freeze({ ...src });', '_src = Object.freeze({ ...src, owner: undefined });');
wirePlant('W3 (the tap builds its own { R, cell })', 'show', 'const tap = (cell) => { const src = showcaseItemSource(R, cell, sc.self ? null : who); if (src) openItemPage(src); };', "const tap = (cell) => openItemPage({ from: 'showcase', R, cell });");
wirePlant('W4 (the tap hands no owner)', 'show', 'showcaseItemSource(R, cell, sc.self ? null : who)', 'showcaseItemSource(R, cell, null)');
wirePlant('W5 (openCardItem opens another player\'s slot as yours)', 'prof', 'profileItemSource(p, slot,', 'profileItemSource({ ...p, isSelf: true }, slot,');
wirePlant('W6 (the owner\'s read-only return after the cell\'s own)', 'open', '  if (got && src.owner) return', '  if (got) return got;\n  if (got && src.owner) return');
wirePlant('W7 (the owner\'s page handed the cell\'s actions)', 'open', "owner: src.owner, actions: [] } };", "owner: src.owner, actions: [] , ...got.input } };");

console.log(fails ? `gear-showcase: ${fails} FAIL` : 'gear-showcase: all ok');
process.exit(fails ? 1 : 0);
