/* ═══ v2.3.6788: YOUR OWN NAME PLATE'S RULE (card UI3, PR 9) ═══
 *
 * The owner, 2026-11-26: "Also remove the name plate on your bro (now that
 * it's already on hud it's redundant)".  src/game/ownPlate.js decides
 * whether a figure's plate is drawn on this screen; the renderer
 * (src/rendering/ownPlateFx.js ownPlateSync, called from the player renderer)
 * builds or destroys YOUR plate when that answer changes.  This suite tests what the rule DOES, then reads the
 * renderer's syntax tree for how it is asked.  It lives here, not in
 * server/test/: it tests the page's code, and a new file there deploys the
 * worker (TRAPS §277).
 *
 *   1. the rule: every figure that is not yours is drawn, whatever the HUD
 *      or the switch; yours is drawn under `?hud=0`, or with `?ownplate=1`,
 *      and not otherwise;
 *   2. the switch: off by default; `?ownplate=1` on and remembered;
 *      `?ownplate=0` forgets; another name is not it; a store that throws
 *      reads as off and the address still decides this visit;
 *   3. the page's answer follows its address (`?hud=0`, `?ownplate=1`, a
 *      replaceState) and asks the rule only when the address changed (a
 *      thousand frames on one address: one ask);
 *   4. THE RENDERER'S TREE (the render system's files, by filesOf): it asks
 *      selfNameDrawn() in two places only (the figure's factory, and your
 *      update's ownPlateSync call), never the rule itself; another player's
 *      figure never asks it; ownPlateSync
 *      returns at once when the answer is unchanged, DESTROYS the pill (never
 *      `.visible = false` on it) and touches nothing else of the figure (the
 *      HP bar, the skull, the spend bars: `_hud*`, `_skullText`);
 *   5. THE DODGES (the card's), each planted and seen red, every run:
 *      another player's plate gone; your plate gone under `?hud=0`; the
 *      switch not remembered; the Text hidden, not destroyed; the rule asked
 *      every frame (in the module, and in the renderer); the structural
 *      change made every frame; the HP bar or the skull gone with the name;
 *   6. EVERY MUTANT of ownPlate.js (each comparison, logical, `!` and
 *      boolean flipped once, by the syntax tree) is killed by 1-3.
 *
 * Run: node tools/guards/own-plate.test.mjs  (needs @babel/parser and
 * @babel/traverse: npm install in the root or server/)
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readSystem } from './lib/filesOf.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let failed = 0;
function check(name, ok, detail) {
  if (ok) console.log('ok   ' + name);
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '\n     ' + String(detail).slice(0, 900))); }
}
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

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

const url = (rel) => pathToFileURL(path.join(ROOT, rel)).href;
const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };

/* ── 1-3: what the module DOES; a list of what is wrong (empty: right) ── */
function behave(M) {
  const bad = [];
  const t = (name, ok) => { if (!ok) bad.push(name); };
  const safe = (fn) => { try { return fn(); } catch (e) { return { __threw: String(e && e.message) }; } };

  /* 1. the rule */
  for (const hudOn of [true, false]) for (const ownPlate of [true, false]) {
    t(`1a another player's plate is drawn (hud ${hudOn}, switch ${ownPlate})`, safe(() => M.nameDrawn({ self: false, hudOn, ownPlate })) === true);
  }
  t('1b yours is drawn under ?hud=0', safe(() => M.nameDrawn({ self: true, hudOn: false, ownPlate: false })) === true
    && safe(() => M.nameDrawn({ self: true, hudOn: false, ownPlate: true })) === true);
  t('1c yours is not drawn while the HUD shows', safe(() => M.nameDrawn({ self: true, hudOn: true, ownPlate: false })) === false);
  t('1d ?ownplate=1 gives yours back', safe(() => M.nameDrawn({ self: true, hudOn: true, ownPlate: true })) === true);
  t('1e no argument: a figure that is not yours (drawn)', safe(() => M.nameDrawn()) === true);

  /* 2. the switch */
  const s1 = mem();
  t('2a off by default', safe(() => M.ownPlateWanted('', s1)) === false && safe(() => M.ownPlateWanted('?x=1', null)) === false);
  t('2b ?ownplate=1 turns it on and remembers', safe(() => M.ownPlateWanted('?ownplate=1', s1)) === true
    && s1.getItem(M.OWN_PLATE_KEY) === '1' && safe(() => M.ownPlateWanted('', s1)) === true);
  t('2c ?ownplate=0 forgets', safe(() => M.ownPlateWanted('?ownplate=0', s1)) === false
    && s1.getItem(M.OWN_PLATE_KEY) === null && safe(() => M.ownPlateWanted('', s1)) === false);
  t('2d another switch is not it', safe(() => M.ownPlateWanted('?ownplates=1', mem())) === false && safe(() => M.ownPlateWanted('?myownplate=1', mem())) === false
    && safe(() => M.ownPlateWanted('?ownplate=yes', mem())) === false);
  t('2e its key', M.OWN_PLATE_KEY === 'bt_ownplate');
  const s2 = mem(); s2.setItem('bt_ownplate', '0');
  t('2f a stored word that is not "1" is off', safe(() => M.ownPlateWanted('', s2)) === false);
  const boom = { getItem() { throw new Error('private mode'); }, setItem() { throw new Error('full'); }, removeItem() { throw new Error('x'); } };
  t('2g a store that throws: off, and the address still decides this visit', safe(() => M.ownPlateWanted('', boom)) === false
    && safe(() => M.ownPlateWanted('?ownplate=1', boom)) === true);

  /* 3. the page's answer, and how often it asks */
  const hadLoc = Object.getOwnPropertyDescriptor(globalThis, 'location');
  try {
    globalThis.location = { search: '?pg=1' };
    const a1 = safe(() => M.selfNameDrawn());
    const k1 = M.nameDrawnAsks();
    for (let i = 0; i < 1000; i++) M.selfNameDrawn();
    const k2 = M.nameDrawnAsks();
    globalThis.location = { search: '?hud=0' };
    const a2 = safe(() => M.selfNameDrawn());
    globalThis.location = { search: '?ownplate=1' };
    const a3 = safe(() => M.selfNameDrawn());
    globalThis.location = { search: '?pg=2' };
    const a4 = safe(() => M.selfNameDrawn());
    const k3 = M.nameDrawnAsks();
    t('3a the page\'s answer follows its address (no storage in node: nothing remembered)', a1 === false && a2 === true && a3 === true && a4 === false);
    t('3b a thousand frames on one address ask the rule no more', k2 === k1);
    t('3c each new address asks it once', k3 === k2 + 3);
  } finally {
    if (hadLoc) Object.defineProperty(globalThis, 'location', hadLoc); else delete globalThis.location;
  }
  return bad;
}

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'ownplate-'));
let nTmp = 0;
async function moduleOf(src) {
  const abs = src.replace(/from '\.\/([\w]+)\.js'/g, (m0, f) => `from '${url('src/game/' + f + '.js')}'`);
  const f = path.join(TMP, 'm' + (nTmp++) + '.mjs');
  fs.writeFileSync(f, abs);
  return import(pathToFileURL(f).href);
}

const MOD = 'src/game/ownPlate.js';
const modSrc = read(MOD);
{
  const M = await import(url(MOD));
  const bad = behave(M);
  check('1-3. the rule, the switch and the page\'s answer do what the card says', bad.length === 0, bad.join('\n     '));
  const sy = await moduleOf(modSrc);
  check('1-3. ...and the same from a copy (the plants below are read the same way)', behave(sy).length === 0, behave(sy).join('; '));
}

/* ── 4. the renderer's tree ── */
const parse = (src) => B.parse(src, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true });
/* the player renderer, found by system (never by its path: tests-by-system) */
const erSrc = [...readSystem('render').values()].find((src) => src.includes('function createPlayerDisplay(')) || '';
check('4. the player renderer is found in the render system (createPlayerDisplay)', erSrc.length > 0);
const FX = 'src/rendering/ownPlateFx.js';
const fxSrc = read(FX);
const calleeName = (n) => (n.callee.type === 'Identifier' ? n.callee.name : null);
const memberChain = (n) => {   /* `display._hudHpBarFrame.visible` -> ['display', '_hudHpBarFrame', 'visible'] */
  const out = [];
  for (let m = n; m; m = m.object) {
    if (m.type === 'MemberExpression') { if (m.property.type === 'Identifier') out.unshift(m.property.name); }
    else { if (m.type === 'Identifier') out.unshift(m.name); break; }
  }
  return out;
};
function syncOf(p, src) {
  const s = { earlyOut: false, destroysPill: false, hidesPill: false, touches: [] };
  const first = p.node.body.body[0];
  /* `if (!display || display._ownPlateOn === on) return;` */
  if (first && first.type === 'IfStatement' && (first.consequent.type === 'ReturnStatement'
    || (first.consequent.type === 'BlockStatement' && first.consequent.body.length === 1 && first.consequent.body[0].type === 'ReturnStatement'))) {
    const test = src.slice(first.test.start, first.test.end);
    s.earlyOut = /\._ownPlateOn\s*===\s*on\b/.test(test);
  }
  p.traverse({
    CallExpression(q) {
      const c = q.node.callee;
      if (c.type === 'MemberExpression' && c.property.type === 'Identifier' && c.property.name === 'destroy' && c.object.type === 'Identifier' && c.object.name === 'pill') s.destroysPill = true;
    },
    MemberExpression(q) {
      const ch = memberChain(q.node);
      const hit = ch.find((k) => /^_hud|^_skullText$|^_comboText$|^_res[A-Z]/.test(k));
      if (hit) s.touches.push(ch.join('.'));
    },
    AssignmentExpression(q) {
      const ch = q.node.left.type === 'MemberExpression' ? memberChain(q.node.left) : [];
      if (ch[ch.length - 1] === 'visible' && (ch[0] === 'pill' || ch.includes('_namePill'))) s.hidesPill = true;
    },
  });
  return s;
}
function renderer(src, fx) {
  const r = { askSelf: [], askRule: 0, otherAsks: 0, sync: null };
  for (const one of [src, fx]) B.traverse(parse(one), {
    CallExpression(p) { if (calleeName(p.node) === 'nameDrawn') r.askRule++; },
  });
  B.traverse(parse(fx), {
    FunctionDeclaration(p) { if (p.node.id.name === 'ownPlateSync') r.sync = syncOf(p, fx); },
  });
  const ast = parse(src);
  B.traverse(ast, {
    CallExpression(p) {
      const name = calleeName(p.node);
      if (name !== 'selfNameDrawn') return;
      const fn = p.getFunctionParent();
      const fname = fn && fn.node.id ? fn.node.id.name : (fn && fn.node.key ? fn.node.key.name : '?');
      const where = p.parentPath.isCallExpression() && calleeName(p.parent) === 'ownPlateSync' ? 'ownPlateSync(...)' : 'bare';
      r.askSelf.push(fname + ':' + where);
      if (fname === 'createOtherPlayerDisplay') r.otherAsks++;
    },
    FunctionDeclaration(p) {
      if (p.node.id.name === 'createOtherPlayerDisplay') r.otherSrc = src.slice(p.node.start, p.node.end);
    },
  });
  return r;
}
function rendererBad(src, fx = fxSrc) {
  const r = renderer(src, fx);
  const bad = [];
  const want = ['createPlayerDisplay:bare', '_updatePlayer:ownPlateSync(...)'];
  const got = r.askSelf;
  if (got.length !== 2 || !got.includes(want[0]) || !got.includes(want[1])) bad.push('selfNameDrawn asked at ' + JSON.stringify(r.askSelf) + ' (want the factory and one ownPlateSync call)');
  if (r.askRule) bad.push('the rule itself (nameDrawn) asked ' + r.askRule + ' times in the renderer: a frame would ask it');
  if (r.otherAsks) bad.push('another player\'s figure asks it');
  if (!r.sync) bad.push('no ownPlateSync');
  else {
    if (!r.sync.earlyOut) bad.push('ownPlateSync does not return at once on an unchanged answer (a structural change a frame)');
    if (!r.sync.destroysPill) bad.push('ownPlateSync does not destroy the pill');
    if (r.sync.hidesPill) bad.push('ownPlateSync hides the pill (a hidden Text keeps its texture: TRAPS §192)');
    if (r.sync.touches.length) bad.push('ownPlateSync touches what stays: ' + r.sync.touches.join(', '));
  }
  return bad;
}
{
  const bad = rendererBad(erSrc);
  check('4. the renderer asks the page\'s answer in the factory and your update only, destroys the plate on a change and touches nothing else', bad.length === 0, bad.join('\n     '));
  /* the other player's factory builds its plate unasked */
  const body = renderer(erSrc, fxSrc).otherSrc || '';
  check('4b another player\'s figure builds its plate whatever the rule says', /\n {2}_attachNamePill\(container, 14, undefined, uiLayer\);/.test(body) && !/selfNameDrawn|_ownPlateSync/.test(body));
}

/* ── 5. the dodges, planted ── */
async function plantMod(what, from, to) {
  if (modSrc.indexOf(from) < 0) { check('5 plant (' + what + ') finds its line', false, from); return; }
  let red = false;
  try { red = behave(await moduleOf(modSrc.split(from).join(to))).length > 0; } catch (e) { red = true; }
  check('5 plant red: ' + what, red);
}
function plantEr(what, from, to) {
  if (erSrc.indexOf(from) < 0) { check('5 plant (' + what + ') finds its line', false, from); return; }
  check('5 plant red: ' + what, rendererBad(erSrc.split(from).join(to)).length > 0);
}
function plantFx(what, from, to) {
  if (fxSrc.indexOf(from) < 0) { check('5 plant (' + what + ') finds its line', false, from); return; }
  check('5 plant red: ' + what, rendererBad(erSrc, fxSrc.split(from).join(to)).length > 0);
}
await plantMod('another player\'s plate gone', '  if (!self) return true;', '  if (!self) return !!ownPlate;');
await plantMod('your plate gone under ?hud=0', '  if (!hudOn) return true;\n', '');
await plantMod('the switch not remembered', "if (v === '1') ls.setItem(OWN_PLATE_KEY, '1'); else ", '');
await plantMod('the rule asked every ask of the page (no memo)', '  if (_for !== s) {', '  if (true) {');
await plantMod('the HUD\'s rule restated (the switch read for the HUD)', 'hudOn: charHudOn()', 'hudOn: true');
plantFx('the Text hidden, not destroyed', '  pill.destroy({ children: true });', '  pill.visible = false;');
plantEr('the rule asked every frame in the renderer', 'ownPlateSync(display, selfNameDrawn(), _attachNamePill);', 'ownPlateSync(display, nameDrawn({ self: true, hudOn: true, ownPlate: false }), _attachNamePill);');
plantFx('the structural change made every frame', '  if (!display || display._ownPlateOn === on) return;', '  if (!display) return;');
plantFx('the HP bar gone with the name', '  pill.destroy({ children: true });', '  pill.destroy({ children: true });\n  if (display._hudHpBarFrame) display._hudHpBarFrame.visible = false;');
plantFx('the skull gone with the name', '  pill.destroy({ children: true });', '  pill.destroy({ children: true });\n  display._skullText.destroy();');
plantEr('another player\'s figure asking it', '  _attachNamePill(container, 14, undefined, uiLayer);', '  if (selfNameDrawn()) _attachNamePill(container, 14, undefined, uiLayer);');

/* ── 6. every mutant of the module ── */
{
  const ast = parse(modSrc);
  const muts = [];
  const flip = { '===': ['!=='], '!==': ['==='], '&&': ['||'], '||': ['&&'] };
  B.traverse(ast, {
    'BinaryExpression|LogicalExpression'(p) {
      const n = p.node;
      for (const to of flip[n.operator] || []) {
        const opAt = modSrc.indexOf(n.operator, n.left.end);
        if (opAt < 0 || opAt >= n.right.start) continue;
        muts.push({ key: n.loc.start.line + ':' + n.loc.start.column + ' ' + n.operator + '>' + to, s: opAt, e: opAt + n.operator.length, to });
      }
    },
    UnaryExpression(p) {
      if (p.node.operator === '!' && !(p.parentPath.isUnaryExpression() && p.parent.operator === '!')) muts.push({ key: p.node.loc.start.line + ':' + p.node.loc.start.column + ' !>', s: p.node.start, e: p.node.start + 1, to: '' });
    },
    BooleanLiteral(p) { muts.push({ key: p.node.loc.start.line + ':' + p.node.loc.start.column + ' ' + p.node.value + '>' + !p.node.value, s: p.node.start, e: p.node.end, to: String(!p.node.value) }); },
  });
  /* the survivors, each with why it changes nothing a player sees */
  const SURVIVORS = Object.freeze({
    '41:37 !==>===': 'the page\'s own storage when none is handed in: node has none, and either way a store that is not there reads as none (the tests hand theirs in)',
    '68:13 true>false': 'the page\'s answer before its first ask: every ask reads the address first (the first ask always differs from null)',
  });
  const survived = [];
  let killed = 0;
  for (const m of muts) {
    let m2 = null;
    try { m2 = await moduleOf(modSrc.slice(0, m.s) + m.to + modSrc.slice(m.e)); } catch (e) { killed++; continue; }
    if (behave(m2).length > 0) killed++;
    else survived.push(m.key);
  }
  const unlisted = survived.filter((k) => !SURVIVORS[k]);
  const stale = Object.keys(SURVIVORS).filter((k) => survived.indexOf(k) < 0);
  check('6 every mutant of ownPlate.js killed or listed with why: ' + killed + ' of ' + muts.length + ' killed', muts.length > 12 && unlisted.length === 0, unlisted.join(', '));
  check('6 ...and no survivor listed that is killed now (the list only falls)', stale.length === 0, stale.join(', '));
}

try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* tmp */ }
console.log(`\nown-plate: ${failed ? failed + ' FAILED' : 'all passed'}`);
if (failed) process.exit(1);
