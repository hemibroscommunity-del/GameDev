/* ═══ v2.3.6790: THE TOP-LEFT CORNER HOLDS THE CHARACTER HUD ALONE (card UI3, PR 10) ═══
 *
 * The owner, 2026-11-27: "Maybe just keep quests in quest area for now.
 * Leave only character hud in top left corner."  The rules are
 * src/game/hudCorner.js; this suite holds:
 *   1. hudCorner() in every state (the HUD on or off, ?questline=1 or not,
 *      upright or sideways): the quest card main's under ?hud=0; nothing
 *      drawn with the HUD and no switch; the status column right under the
 *      HUD's gap when the line is gone (never the line's band left empty),
 *      the party chip under the column upright and BESIDE the HUD sideways;
 *   2. questLineWanted(): off by default, `?questline=1` remembered, `=0`
 *      forgets;
 *   3. cornerBox() / cornerSpan(): the coach keeps clear of the HUD alone
 *      when the line is gone (never a line that is not there, never nothing),
 *      of the line stretched over the HUD with it, of main's card without
 *      the HUD;
 *   4. src/styles/game.css's TREE (postcss), its cascade worked out for each
 *      state: the status column's top and the party chip's top and left equal
 *      hudCorner()'s;
 *   5. QuestCard.jsx's TREE (Babel): `const corner = cornerQuest()` (the
 *      import) and `if (... || corner === 'none') return null;` in the
 *      component's own body before anything is drawn;
 *   6. QuestCoach.jsx's TREE: every cornerSpan() measures the element of
 *      `document.querySelector(cornerBox())`; no `[data-quest-hud]` written
 *      in it, no charHudSpan left.
 * THE DODGES (card UI3-corner), each planted every run and seen red (10):
 *   the line drawn by default (the gate gone, made to say nothing, moved
 *   below the drawing, the rule saying 'line'); `?questline=1` bringing
 *   nothing back (remembered never; the rule ignoring it); the status column
 *   left where it was (in the rule, in the CSS upright, in the CSS sideways);
 *   the switch's own CSS gone; the coach measuring the line that is not there
 *   (the selector written back, cornerBox saying the line, charHudSpan back).
 * The running page (tools/qa/mp/mp-charhud.mjs, upright and sideways) holds
 * the same on a real phone's layout.
 *
 * Run: node tools/guards/hud-corner.test.mjs  (needs @babel/parser,
 * @babel/traverse and postcss: npm install in the root or server/)
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
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '\n     ' + String(detail).slice(0, 800))); }
}
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const url = (rel) => pathToFileURL(path.join(ROOT, rel)).href;

let B = null;
let postcss = null;
for (const pkg of ['package.json', 'server/package.json']) {
  try {
    const req = createRequire(path.join(ROOT, pkg));
    const tr = req('@babel/traverse');
    B = B || { parse: req('@babel/parser').parse, traverse: tr.default || tr };
  } catch (e) { /* the next */ }
  try { postcss = postcss || createRequire(path.join(ROOT, pkg))('postcss'); } catch (e) { /* the next */ }
}
check('0. @babel/parser, @babel/traverse and postcss load (npm install in the root or server/)', !!B && !!postcss);
if (!B || !postcss) process.exit(1);
const parse = (src) => B.parse(src, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true });

const MOD = 'src/game/hudCorner.js';
const modSrc = read(MOD);
const M = await import(url(MOD));
const CH = await import(url('src/game/charHud.js'));
const HUD = CH.CHAR_HUD;

/* a store as localStorage is */
const store = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m }; };

const STATES = [];
for (const hud of [false, true]) for (const questline of [false, true]) for (const sideways of [false, true]) STATES.push({ hud, questline, sideways });
const tag = (s) => (s.hud ? 'hud' : 'nohud') + (s.questline ? '+line' : '') + (s.sideways ? ' sideways' : ' upright');

/* ── 1-3: what the module does ── */
function behave(m) {
  const bad = [];
  const t = (name, ok) => { if (!ok) bad.push(name); };
  const safe = (fn) => { try { return fn(); } catch (e) { return { threw: String(e && e.message) }; } };
  for (const s of STATES) {
    const c = safe(() => m.hudCorner(s)) || {};
    if (!s.hud) {
      t(`1 ${tag(s)}: main's quest card, main's places (null numbers)`, c.quest === 'card' && c.keep === 'quest'
        && c.stack === null && c.status === null && c.partyTop === null && c.partyLeft === null);
      continue;
    }
    const hudH = s.sideways ? HUD.sideH : HUD.h;
    t(`1 ${tag(s)}: the stack starts under the HUD and its gap`, c.stack === hudH + HUD.gap);
    if (s.questline) {
      t(`1 ${tag(s)}: the line drawn, the coach keeping clear of it`, c.quest === 'line' && c.keep === 'quest');
      t(`1 ${tag(s)}: the status column under the line's band`, c.status === c.stack + (s.sideways ? HUD.line + HUD.gap : HUD.lineHit));
    } else {
      t(`1 ${tag(s)}: no quest tracker drawn, the coach keeping clear of the HUD`, c.quest === 'none' && c.keep === 'hud');
      t(`1 ${tag(s)}: the status column right under the HUD's gap (no empty band where the line was)`, c.status === hudH + HUD.gap);
    }
    if (s.sideways) t(`1 ${tag(s)}: the party chip BESIDE the HUD, under the bar`, c.partyTop === 0 && c.partyLeft >= HUD.left + HUD.sideW);
    else t(`1 ${tag(s)}: the party chip under the status column's two rows, the same left edge`, c.partyTop === c.status + m.STATUS_ROWS && c.partyLeft === HUD.left);
  }
  /* 2. the switch */
  {
    const ls = store();
    const a = safe(() => m.questLineWanted('', ls));
    const b = safe(() => m.questLineWanted('?questline=1', ls));
    const kept = ls.getItem(m.QUEST_LINE_KEY);
    const c = safe(() => m.questLineWanted('', ls));
    const d = safe(() => m.questLineWanted('?questline=7', ls));
    const e = safe(() => m.questLineWanted('?questline=0', ls));
    const f = safe(() => m.questLineWanted('', ls));
    t('2 off by default', a === false);
    t('2 ?questline=1 on, and remembered ("1")', b === true && kept === '1' && c === true && d === true);
    t('2 ?questline=0 off, and forgotten', e === false && f === false && ls.getItem(m.QUEST_LINE_KEY) === null);
    t('2 no store: the address alone', safe(() => m.questLineWanted('?questline=1', null)) === true && safe(() => m.questLineWanted('', null)) === false);
    t('2 the key', m.QUEST_LINE_KEY === 'bt_questline');
  }
  /* 3. what the coach keeps clear of */
  {
    const line = { left: 8, top: 112, right: 192, bottom: 156, width: 184, height: 44 };
    const hud = { left: 8, top: 56, right: 192, bottom: 108, width: 184, height: 52 };
    t('3 the line gone: the HUD\'s box', safe(() => m.cornerBox('none')) === '[data-charhud-box]');
    t('3 the line or main\'s card: the quest card\'s box', safe(() => m.cornerBox('line')) === '[data-quest-hud]' && safe(() => m.cornerBox('card')) === '[data-quest-hud]');
    t('3 the HUD alone: its rect as measured (not stretched over the bar)', safe(() => m.cornerSpan(hud, 'none')) === hud);
    t('3 main\'s card: as measured', safe(() => m.cornerSpan(line, 'card')) === line);
    const sp = safe(() => m.cornerSpan(line, 'line'));
    const want = CH.charHudSpan(line, true);
    t('3 the line: stretched over the HUD (charHudSpan)', !!sp && sp.top === want.top && sp.top === line.top - HUD.stack && sp.right === want.right);
    t('3 nothing measured: nothing', safe(() => m.cornerSpan(null, 'none')) === null && safe(() => m.cornerSpan(null, 'line')) === null);
  }
  return bad;
}
const bad = behave(M);
check('1-3. the rules in every state, the switch, the coach\'s box', bad.length === 0, bad.join('; '));

/* ── 4: game.css's cascade, state by state ── */
const CSS = 'src/styles/game.css';
const cssSrc = read(CSS);
const SIDE_MEDIA = '(max-height:480px)';
function cssStack(src, st) {
  const root = postcss.parse(src);
  const decls = [];
  let order = 0;
  const attrs = (sel) => {
    const m = /^html((?:\[[\w-]+="[^"]*"\])*)$/.exec(sel.replace(/\s+/g, ''));
    if (!m) return null;
    const out = {};
    for (const a of m[1].match(/\[[^\]]+\]/g) || []) { const [k, v] = a.slice(1, -1).split('='); out[k] = v.replace(/"/g, ''); }
    return out;
  };
  const page = { 'data-charhud': st.hud ? '1' : null, 'data-questline': st.hud && st.questline ? '1' : null };
  root.walkRules((r) => {
    const p = r.parent;
    const media = p && p.type === 'atrule' && p.name === 'media' ? p.params.replace(/\s+/g, '') : null;
    if (p && p.type !== 'root' && !media) return;
    if (media && media !== SIDE_MEDIA) return;
    if (media && !st.sideways) return;
    for (const sel of r.selectors) {
      const a = attrs(sel);
      if (!a) continue;
      if (!Object.keys(a).every((k) => page[k] === a[k])) continue;
      const spec = Object.keys(a).length;
      r.walkDecls((d) => { if (d.prop.startsWith('--')) decls.push({ prop: d.prop, value: d.value, spec, order: order++ }); });
    }
  });
  decls.sort((x, y) => x.spec - y.spec || x.order - y.order);
  const vars = Object.create(null);
  for (const d of decls) vars[d.prop] = d.value;
  /* px under --bt-hud-base: the bar's growth and the notch are 0 here */
  const ev = (expr, depth) => {
    if (depth > 12) return NaN;
    let e = String(expr);
    for (let i = 0; i < 40 && /var\(/.test(e); i++) {
      e = e.replace(/var\((--[\w-]+)(?:,([^()]*))?\)/, (m0, name, fb) => {
        if (name === '--bt-hud-base' || name === '--bt-bar-grow') return '0';
        if (name in vars) return '(' + ev(vars[name], depth + 1) + ')';
        return fb == null ? 'NaN' : '(' + ev(fb, depth + 1) + ')';
      });
    }
    e = e.replace(/env\([^()]*\)/g, '0').replace(/calc/g, '').replace(/(\d+(?:\.\d+)?)px/g, '$1');
    if (!/^[\d\s+\-().NaN]*$/.test(e)) return NaN;
    try { return Function('"use strict";return (' + e + ')')(); } catch (er) { return NaN; }
  };
  const num = (name) => (name in vars ? ev(vars[name], 0) : null);
  return { status: num('--bt-status-top'), partyTop: num('--bt-party-top'), partyLeft: num('--bt-party-left'), stack: num('--bt-charhud-h'), vars };
}
function cssBad(src) {
  const out = [];
  for (const s of STATES) {
    if (!s.hud) continue;
    const want = M.hudCorner(s);
    const got = cssStack(src, s);
    const left = got.partyLeft == null ? HUD.left : got.partyLeft;   /* PartyHUD's fallback, 8px */
    if (got.stack !== want.stack || got.status !== want.status || got.partyTop !== want.partyTop || left !== want.partyLeft) {
      out.push(`${tag(s)}: css ${JSON.stringify({ stack: got.stack, status: got.status, partyTop: got.partyTop, partyLeft: left })} != rule ${JSON.stringify({ stack: want.stack, status: want.status, partyTop: want.partyTop, partyLeft: want.partyLeft })}`);
    }
  }
  /* ?hud=0: none of the stack's variables set (main's fallbacks) */
  const off = cssStack(src, { hud: false, questline: true, sideways: false });
  const offS = cssStack(src, { hud: false, questline: true, sideways: true });
  for (const v of ['--bt-status-top', '--bt-party-top', '--bt-party-left', '--bt-charhud-h']) {
    if (v in off.vars || v in offS.vars) out.push('?hud=0 sets ' + v);
  }
  return out;
}
const cb = cssBad(cssSrc);
check('4. game.css\'s cascade gives hudCorner()\'s numbers in every state (and sets none under ?hud=0)', cb.length === 0, cb.join('; '));

/* ── 5: QuestCard's tree ── */
const QC = 'src/ui/QuestCard.jsx';
const qcSrc = read(QC);
const isJsx = (n) => !!n && (n.type === 'JSXElement' || n.type === 'JSXFragment');
const flatOr = (n) => (n && n.type === 'LogicalExpression' && n.operator === '||' ? [...flatOr(n.left), ...flatOr(n.right)] : [n]);
const isNoneTest = (n) => n && n.type === 'BinaryExpression' && n.operator === '==='
  && ((n.left.type === 'Identifier' && n.left.name === 'corner' && n.right.type === 'StringLiteral' && n.right.value === 'none')
    || (n.right.type === 'Identifier' && n.right.name === 'corner' && n.left.type === 'StringLiteral' && n.left.value === 'none'));
const returnsNull = (n) => {
  const r = n && n.type === 'BlockStatement' && n.body.length === 1 ? n.body[0] : n;
  return !!r && r.type === 'ReturnStatement' && r.argument && r.argument.type === 'NullLiteral';
};
function questCardGate(src) {
  const bad = [];
  const ast = parse(src);
  let comp = null;
  B.traverse(ast, { ExportDefaultDeclaration(p) { const d = p.get('declaration'); if (d.isFunctionDeclaration()) comp = d; } });
  if (!comp) return ['no default-exported component'];
  const body = comp.node.body.body;
  /* const corner = cornerQuest(), the import from game/hudCorner.js, never reassigned */
  const cb = comp.scope.getBinding('corner');
  const decl = cb && cb.path.isVariableDeclarator() ? cb.path : null;
  const init = decl && decl.node.init;
  if (!decl || cb.kind !== 'const' || cb.constantViolations.length || !init || init.type !== 'CallExpression'
    || init.callee.type !== 'Identifier' || init.callee.name !== 'cornerQuest' || init.arguments.length !== 0
    || decl.parentPath.parentPath.node !== comp.node.body) bad.push('`corner` is not `const corner = cornerQuest()` in the component\'s own body');
  const fb = comp.scope.getBinding('cornerQuest');
  const imp = fb && fb.kind === 'module' && fb.path.parentPath.node.source.value.replace(/^@\//, 'src/').replace(/\.js$/, '') === 'src/game/hudCorner';
  if (!imp) bad.push('cornerQuest is not the import from @/game/hudCorner.js');
  /* the gate: a top-level `if (... || corner === 'none' || ...) return null;` */
  const gateAt = body.findIndex((s) => s.type === 'IfStatement' && !s.alternate && returnsNull(s.consequent) && flatOr(s.test).some(isNoneTest));
  if (gateAt < 0) bad.push('no top-level `if (... || corner === \'none\') return null;`');
  /* nothing drawn before it: no return of JSX among the statements above, nor inside them */
  let firstDraw = Infinity;
  comp.traverse({
    ReturnStatement(p) {
      if (p.getFunctionParent() !== comp) return;
      if (!isJsx(p.node.argument) && !(p.node.argument && p.node.argument.type === 'CallExpression')) return;
      let top = p; while (top.parentPath && top.parentPath.node !== comp.node.body) top = top.parentPath;
      firstDraw = Math.min(firstDraw, body.indexOf(top.node));
    },
  });
  if (gateAt >= 0 && firstDraw <= gateAt) bad.push('something is drawn before the gate');
  return bad;
}
const qg = questCardGate(qcSrc);
check('5. QuestCard draws nothing with the HUD and no ?questline=1: `const corner = cornerQuest()` and its `return null` before anything is drawn (its tree)', qg.length === 0, qg.join('; '));

/* ── 6: the coach's tree ── */
const QCO = 'src/ui/mobile/QuestCoach.jsx';
const coSrc = read(QCO);
function coachBox(src) {
  const bad = [];
  const ast = parse(src);
  const isBoxQuery = (n) => n && n.type === 'CallExpression' && n.callee.type === 'MemberExpression'
    && n.callee.object.type === 'Identifier' && n.callee.object.name === 'document' && n.callee.property.name === 'querySelector'
    && n.arguments.length === 1 && n.arguments[0].type === 'CallExpression' && n.arguments[0].callee.type === 'Identifier'
    && n.arguments[0].callee.name === 'cornerBox' && n.arguments[0].arguments.length === 0;
  let spans = 0;
  let imports = 0;
  B.traverse(ast, {
    ImportDeclaration(p) {
      const s = p.node.source.value;
      if (/(^|\/)game\/hudCorner(\.js)?$/.test(s)) imports += p.node.specifiers.filter((x) => x.type === 'ImportSpecifier' && (x.imported.name === 'cornerBox' || x.imported.name === 'cornerSpan') && x.local.name === x.imported.name).length;
      if (/(^|\/)game\/charHud(\.js)?$/.test(s) && p.node.specifiers.some((x) => x.imported && x.imported.name === 'charHudSpan')) bad.push('charHudSpan imported (the line\'s span whether or not it is drawn)');
    },
    /* a page query of the quest card's selector written by hand (the
       lessons' anchors are the coach's own, UI3-tutor's: not this) */
    StringLiteral(p) {
      if (!/data-quest-hud/.test(p.node.value)) return;
      const call = p.findParent((q) => q.isCallExpression());
      const c = call && call.node.callee;
      if (c && c.type === 'MemberExpression' && /^querySelector(All)?$/.test(c.property.name || '')) bad.push('document.' + c.property.name + '("' + p.node.value + '") in the coach (the box is cornerBox()\'s)');
    },
    CallExpression(p) {
      const n = p.node;
      if (n.callee.type !== 'Identifier' || n.callee.name !== 'cornerSpan') return;
      spans++;
      let a = n.arguments[0];
      /* rect(<el>) or <el>.getBoundingClientRect() */
      let el = null;
      if (a && a.type === 'CallExpression' && a.callee.type === 'Identifier' && a.callee.name === 'rect') el = a.arguments[0];
      else if (a && a.type === 'CallExpression' && a.callee.type === 'MemberExpression' && a.callee.property.name === 'getBoundingClientRect') el = a.callee.object;
      if (el && el.type === 'Identifier') {
        const b = p.scope.getBinding(el.name);
        el = b && b.kind === 'const' && b.path.isVariableDeclarator() && !b.constantViolations.length ? b.path.node.init : null;
      }
      if (!isBoxQuery(el)) bad.push('a cornerSpan() that does not measure document.querySelector(cornerBox()) (line ' + (n.loc && n.loc.start.line) + ')');
    },
  });
  if (imports !== 2) bad.push('cornerBox and cornerSpan are not both imported from game/hudCorner.js');
  if (spans < 2) bad.push('the coach keeps clear in ' + spans + ' place(s), not its two (the measure and the step right on a computer)');
  return bad;
}
const co = coachBox(coSrc);
check('6. the coach keeps clear of cornerBox()\'s element through cornerSpan() (its tree), never a line that is not there', co.length === 0, co.join('; '));

/* ── 10: the dodges, planted ── */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'hudcorner-'));
let nTmp = 0;
async function moduleOf(src) {
  const abs = src.replace(/from '\.\/([\w]+)\.js'/g, (m0, f) => `from '${url('src/game/' + f + '.js')}'`);
  const f = path.join(TMP, 'm' + (nTmp++) + '.mjs');
  fs.writeFileSync(f, abs);
  return import(pathToFileURL(f).href);
}
async function plantModule(name, from, to) {
  if (modSrc.indexOf(from) < 0) { check('10 plant "' + name + '" finds its text', false, from); return; }
  const m = await moduleOf(modSrc.split(from).join(to));
  check('10 plant red: ' + name, behave(m).length > 0);
}
const plantSrc = (name, src, from, to, red) => {
  if (src.indexOf(from) < 0) { check('10 plant "' + name + '" finds its text', false, from); return; }
  check('10 plant red: ' + name, red(src.split(from).join(to)));
};
await plantModule('the rule draws the line by default', "quest: line ? 'line' : 'none',", "quest: 'line',");
await plantModule('the status column left under the line\'s band', '  const band = line ? (side ? CHAR_HUD.line + CHAR_HUD.gap : CHAR_HUD.lineHit) : 0;',
  '  const band = side ? CHAR_HUD.line + CHAR_HUD.gap : CHAR_HUD.lineHit;');
await plantModule('?questline=1 never remembered', "if (v === '1') ls.setItem(QUEST_LINE_KEY, '1'); else ls.removeItem(QUEST_LINE_KEY);", 'ls.removeItem(QUEST_LINE_KEY);');
await plantModule('?questline=1 ignored', '    return v === \'1\';\n', '    return false;\n');
await plantModule('the coach told the line\'s box with the line gone', "return q === 'none' ? CORNER_BOX.hud : CORNER_BOX.quest;", 'return CORNER_BOX.quest;');
await plantModule('the HUD\'s box stretched as if a line were under it', "return q === 'line' ? charHudSpan(rect, true) : rect;", 'return charHudSpan(rect, true);');
await plantModule('the party chip left under the line\'s place', 'partyTop: side ? 0 : status + STATUS_ROWS,', 'partyTop: side ? 0 : stack + CHAR_HUD.lineHit + STATUS_ROWS,');
const cssRed = (s) => cssBad(s).length > 0;
plantSrc('the CSS keeps the status column under the line (upright)', cssSrc, '  --bt-status-top:var(--bt-hud-top);\n', '  --bt-status-top:calc(var(--bt-hud-top) + 44px);\n', cssRed);
plantSrc('the CSS keeps it under the line sideways', cssSrc, "--bt-party-top:var(--bt-hud-base);--bt-party-left:192px}", "--bt-party-top:var(--bt-hud-base);--bt-party-left:192px;--bt-status-top:calc(var(--bt-hud-top) + 34px)}", cssRed);
plantSrc('?questline=1\'s own CSS gone', cssSrc, 'html[data-charhud="1"][data-questline="1"]{--bt-status-top:calc(var(--bt-hud-top) + 44px)}', '', cssRed);
plantSrc('the party chip under the line\'s place in the CSS', cssSrc, '  --bt-party-top:calc(var(--bt-status-top) + 48px)}', '  --bt-party-top:calc(var(--bt-status-top) + 92px)}', cssRed);
const qcRed = (s) => questCardGate(s).length > 0;
const GATE = "  if (!rpgState || corner === 'none') return null;";
plantSrc('the quest card\'s gate gone (the line drawn by default)', qcSrc, GATE, '  if (!rpgState) return null;', qcRed);
plantSrc('the gate made to say nothing', qcSrc, GATE, "  if (!rpgState || (corner === 'none' && false)) return null;", qcRed);
plantSrc('the gate inside a block', qcSrc, GATE, "  if (!rpgState) return null;\n  if (rpgState) { if (corner === 'none') return null; }", qcRed);
plantSrc('the corner forced', qcSrc, '  const corner = cornerQuest();', "  const corner = cornerQuest() === 'none' ? 'line' : cornerQuest();", qcRed);
{
  /* the gate moved below the drawing: the first return of the line moved above it */
  const at = qcSrc.indexOf(GATE);
  const moved = at < 0 ? null : qcSrc.replace(GATE, "  if (!rpgState) return null;\n  if (corner === 'x') return (<div data-quest-hud=\"1\" />);\n" + GATE);
  check('10 plant red: something drawn before the gate', !!moved && qcRed(moved));
}
const coRed = (s) => coachBox(s).length > 0;
plantSrc('the coach measuring the line\'s selector again', coSrc, 'p.qh = cornerSpan(rect(document.querySelector(cornerBox())));', "p.qh = cornerSpan(rect(document.querySelector('[data-quest-hud]')));", coRed);
plantSrc('the step right measuring the line\'s selector again', coSrc, '  const qh = document.querySelector(cornerBox());', "  const qh = document.querySelector('[data-' + 'quest-hud]');", (s) => coRed(s));
plantSrc('the coach\'s span back to charHudSpan', coSrc, 'p.qh = cornerSpan(rect(document.querySelector(cornerBox())));', "p.qh = charHudSpan(rect(document.querySelector(cornerBox())));", (s) => coRed(s.replace("import { cornerBox, cornerSpan } from '@/game/hudCorner.js';", "import { cornerBox, cornerSpan } from '@/game/hudCorner.js'; import { charHudSpan } from '@/game/charHud.js';")));

try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* the box's own */ }
console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
