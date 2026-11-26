/* ═══ v2.3.6781: THE CHARACTER HUD'S RULES (card UI3, PR 2) ═══
 *
 * src/game/charHud.js decides what the HUD at the top left shows (the owner,
 * 2026-11-26: "I would display the XP progress of whichever weapon is closest
 * to increasing the overall combat level. Label the XP bar with that weapon
 * so players understand the relationship").  This suite tests what the
 * rules DO, then reads the drawing's syntax trees for what must never be
 * there.  It lives here, not in server/test/: it tests the page's code, and a
 * new file there deploys the worker (TRAPS §277).
 *
 *   1. the weapon: under one level the one AT the top level with the largest
 *      share of its next level (ties: sword, bow, staff), never the weapon
 *      closest to its OWN next level (heroModel.js bestWeaponProgress);
 *      without one level any below the cap; the cap: Max, the bar full;
 *   2. the level is the game's combat level (combatHub.js combatLevel):
 *      the best weapon's under one level, the three added up without it;
 *   3. before the worker's record: the face and the name only (no "Lv 1",
 *      no NaN);
 *   4. on prog3 blobs the bar's share equals combatLevelProgress's
 *      prog/thresh, on every blob tried (the two rules held to each other);
 *   5. the bar moves only for its weapon (the gain handed over whole); a gain
 *      on another weapon is its "+N XP" only, for its show;
 *   6. the switch: `?hud=0` off and remembered, `?hud=1` forgets, on by
 *      default; another name (`?hudbars=0`) is not it;
 *   7. the quest line: one line, never a newline;
 *   8. the coach's span: up over the HUD and out to its width, from the
 *      module's numbers; unchanged with the HUD off;
 *   9. THE DRAWING'S TREES: CharacterHud.jsx reads no hp, maxHp, stam,
 *      energy or mana; it opens on click, stops the press, acts on no
 *      pointerup; ZoneHeader's `xpOn` asks `!charHudOn()` first; nothing
 *      under src/ui/hud/ imports characterPortrait.js (no second bake);
 *      QuestCard's one line cannot wrap; PartyHUD's chip and list stand at
 *      --bt-party-top, never `top: 92`;
 *  10. THE DODGES (the card's), each planted and seen red, every run: the
 *      weapon from bestWeaponProgress; the level from the weapon's own level;
 *      the level summed under one level; "Lv 1" before the record; an empty
 *      bar or no word at the cap; the switch not remembered; the drawing
 *      reading hp; xpOn without !charHudOn(); a characterPortrait import;
 *      the line without nowrap; the chip back at top 92; a face acting on
 *      pointerup; a face that does not stop the press;
 *  11. EVERY MUTANT of charHud.js (each operator, comparison, logical, `!`,
 *      boolean and number flipped once, by the syntax tree) is killed by 1-8,
 *      or listed in SURVIVORS with why.
 *
 * Run: node tools/guards/char-hud.test.mjs  (needs @babel/parser and
 * @babel/traverse: npm install in the root or server/)
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
const P3 = await import(url('src/data/prog3.js'));
const ONE = await import(url('src/data/oneFormula.js'));
const HERO = await import(url('src/ui/mobile/sheet/heroModel.js'));
const XPB = await import(url('src/game/xpBar.js'));
P3.setProg3Enabled(true);

const blob = (sw, bw, st) => ({ prog3: { sk: {
  sword: { level: sw[0], xp: sw[1] }, bow: { level: bw[0], xp: bw[1] }, staff: { level: st[0], xp: st[1] },
} } });
const need = (lv) => P3.prog3XpRequired(lv);
const at = (lv, share) => [lv, Math.floor(need(lv) * share)];
const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _m: m }; };

/* ── 1-8: what the module DOES; a list of what is wrong (empty: right) ── */
function behave(M) {
  const bad = [];
  const t = (name, ok) => { if (!ok) bad.push(name); };
  const safe = (fn) => { try { return fn(); } catch (e) { return { __threw: String(e && e.message) }; } };
  const was = ONE.isOneLevelEnabled();
  try {
    /* 1. the weapon */
    ONE.setOneLevelEnabled(true);
    const a = blob(at(10, 0.9), at(12, 0.1), at(3, 0.5));
    const ma = safe(() => M.charHudModel(a, { name: 'Bro' }));
    t('1a one level: Sword 10 at 90%, Bow 12 at 10%: the HUD says Bow (only the Bow makes 13)', ma.cat === 'bow' && ma.word === 'Bow');
    t('1b ...and so its bar is the Bow\'s', ma.xpNow === Math.floor(need(12) * 0.1) && ma.xpNeed === need(12) && ma.wLevel === 12);
    const b = blob(at(12, 0.3), at(12, 0.6), at(12, 0.2));
    t('1c one level, three at the top: the largest share (Bow)', safe(() => M.charHudModel(b, {})).cat === 'bow');
    const tie = blob(at(7, 0.5), at(7, 0.5), at(7, 0.5));
    t('1d a tie goes to the first (Sword)', safe(() => M.charHudModel(tie, {})).cat === 'sword');
    const tie2 = blob(at(4, 0.1), at(7, 0.5), at(7, 0.5));
    t('1e a tie among those at the top goes to the first of them (Bow)', safe(() => M.charHudModel(tie2, {})).cat === 'bow');
    const topcap = blob([100, 0], at(50, 0.9), at(20, 0.2));
    const mc = safe(() => M.charHudModel(topcap, {}));
    t('1f one level, the top weapon at the cap: Max, the bar full, the word said, the weapon the first at the top',
      mc.max === true && mc.frac === 1 && mc.word === 'Max' && mc.cat === 'sword' && mc.xpNow === null && mc.level === 100);
    const capBow = blob(at(50, 0.9), [100, 0], at(20, 0.2));
    t('1g ...and the first at the top is the one at the cap (Bow)', safe(() => M.charHudModel(capBow, {})).cat === 'bow');
    ONE.setOneLevelEnabled(false);
    const ma2 = safe(() => M.charHudModel(a, {}));
    t('1h without one level any weapon below the cap counts: Sword (90%)', ma2.cat === 'sword' && ma2.word === 'Sword' && ma2.max === false);
    const mc2 = safe(() => M.charHudModel(topcap, {}));
    t('1i without one level a capped weapon is passed over: Bow', mc2.cat === 'bow' && mc2.max === false);
    const allcap = blob([100, 0], [100, 0], [100, 0]);
    const mc3 = safe(() => M.charHudModel(allcap, {}));
    t('1j all three at the cap: Max', mc3.max === true && mc3.frac === 1 && mc3.word === 'Max');
    t('1k the option `one` overrides the game\'s switch', safe(() => M.charHudModel(a, { one: true })).cat === 'bow'
      && safe(() => M.charHudWeapon(a, false)).cat === 'sword' && safe(() => M.charHudWeapon(a, true)).cat === 'bow');
    ONE.setOneLevelEnabled(true);
    const fresh = blob([1, 0], [1, 0], [1, 0]);
    const mf = safe(() => M.charHudModel(fresh, {}));
    t('1m a new character (three at 1, no XP): Sword, Lv 1, 0 of the next, not Max',
      mf.cat === 'sword' && mf.level === 1 && mf.xpNow === 0 && mf.xpNeed === need(1) && mf.frac === 0 && mf.max === false && mf.word === 'Sword');
    const noXp = { prog3: { sk: { sword: { level: 4 }, bow: { level: 2 }, staff: {} } } };
    const mn = safe(() => M.charHudModel(noXp, {}));
    t('1n a weapon with no XP written yet: 0, never NaN', mn.cat === 'sword' && mn.xpNow === 0 && mn.frac === 0 && mn.level === 4);
    const st = blob(at(5, 0.1), at(5, 0.2), at(5, 0.7));
    t('1l the Staff, worded', safe(() => M.charHudModel(st, { one: true })).word === 'Staff');

    /* 2. the level */
    ONE.setOneLevelEnabled(true);
    t('2a one level: the level is the best weapon\'s (12), not the sum', safe(() => M.charHudModel(a, {})).level === 12);
    ONE.setOneLevelEnabled(false);
    t('2b without one level: the three added up (25), not the shown weapon\'s own', safe(() => M.charHudModel(a, {})).level === 25);

    /* 3. before the record */
    ONE.setOneLevelEnabled(true);
    const pre = [safe(() => M.charHudModel({}, { name: 'Bro' })), safe(() => M.charHudModel(null, { name: 'Bro' })), safe(() => M.charHudModel({ prog3: {} }, { name: 'Bro' }))];
    t('3a before the worker\'s record: not ready, no level, no weapon, the name kept',
      pre.every((m) => m.ready === false && m.level === null && m.cat === null && m.name === 'Bro' && m.xpNow === null && m.max === false && m.frac === 0 && m.word === ''));
    t('3b ...and nothing in it is NaN', pre.every((m) => !/NaN/.test(JSON.stringify(m))));
    P3.setProg3Enabled(false);
    t('3c a worker without prog3: not ready', safe(() => M.charHudModel(a, {})).ready === false);
    P3.setProg3Enabled(true);
    t('3d ready with the record', safe(() => M.charHudModel(a, {})).ready === true);

    /* 4. held to combatLevelProgress on many blobs */
    let seed = 7;
    const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    let off = 0;
    for (let i = 0; i < 400; i++) {
      const lv = () => (rnd() < 0.15 ? 100 : 1 + Math.floor(rnd() * 99));
      const r = blob([lv(), 0], [lv(), 0], [lv(), 0]);
      for (const c of ['sword', 'bow', 'staff']) r.prog3.sk[c].xp = rnd() * need(r.prog3.sk[c].level) * 1.1;
      if (rnd() < 0.3) r.prog3.sk.bow.level = r.prog3.sk.sword.level;
      for (const one of [true, false]) {
        ONE.setOneLevelEnabled(one);
        const m = safe(() => M.charHudModel(r, {}));
        const p = HERO.combatLevelProgress(r);
        if (!(Math.abs(m.frac - p.prog / p.thresh) < 1e-12) || (m.max !== (p.prog === 1 && p.thresh === 1 && m.max))) off++;
        if (m.level !== P3.prog3CharLevel(r)) off++;
      }
    }
    t('4 on 800 blobs the bar\'s share is combatLevelProgress\'s, the level prog3CharLevel\'s', off === 0);

    /* 5. the bar */
    ONE.setOneLevelEnabled(true);
    const m5 = M.charHudModel(a, {});
    const xpBow = need(12) * 0.1 + 0.4;
    const own = { cat: 'bow', level: 12, xp: xpBow, need: need(12), frac: xpBow / need(12), gain: 5, gainAt: 1000, seq: 3, at: 1000, up: false };
    const g1 = safe(() => M.charHudBar(m5, own, 1500));
    t('5a a gain on the HUD\'s weapon is handed to the track whole (its white, its count), no pop', g1.bar === own && g1.live === true && !g1.pop);
    const other = { cat: 'sword', level: 10, xp: 1, need: need(10), frac: 0, gain: 7, gainAt: 1000, seq: 4, at: 1000, up: false };
    const g2 = safe(() => M.charHudBar(m5, other, 1500));
    t('5b a gain on another weapon: its "+N" with its picture, the bar still at the record',
      !!g2.pop && g2.pop.cat === 'sword' && g2.pop.gain === 7 && g2.pop.seq === 4 && g2.live === false
      && g2.bar && g2.bar.cat === 'bow' && g2.bar.xp === m5.xpNow && g2.bar.need === m5.xpNeed && g2.bar.frac === m5.frac && g2.bar.at === 0);
    t('5c ...for its show only (xpShowMs)', !safe(() => M.charHudBar(m5, other, 1000 + XPB.xpShowMs(other))).pop
      && !!safe(() => M.charHudBar(m5, other, 1000 + XPB.xpShowMs(other) - 1)).pop);
    t('5d a stale gain (another level or XP than the record) does not drive the bar',
      safe(() => M.charHudBar(m5, { ...own, xp: xpBow + 50 }, 1500)).live === false && safe(() => M.charHudBar(m5, { ...own, level: 11 }, 1500)).live === false);
    t('5e no gain: the bar stands at the record, exactly (no gain to grow from: `at` 0, not a level-up)', (() => {
      const g = safe(() => M.charHudBar(m5, null, 0));
      return !g.pop && g.live === false && JSON.stringify(g.bar) === JSON.stringify({ cat: 'bow', level: 12, xp: m5.xpNow, need: m5.xpNeed, frac: m5.frac, at: 0, up: false,
        fromLevel: 12, fromFrac: m5.frac, fromXp: m5.xpNow, fromNeed: m5.xpNeed });
    })());
    const gm = safe(() => M.charHudBar(M.charHudModel(topcap, {}), null, 0));
    t('5f at the cap the bar is full, and still', gm.bar && gm.bar.frac === 1 && gm.bar.max === true && gm.live === false && !gm.pop);
    t('5g before the record no bar, no pop', (() => { const g = safe(() => M.charHudBar(M.charHudModel({}, {}), other, 1500)); return g.bar === null && g.pop === null && g.live === false; })());
    t('5i a "+1 XP" on another weapon is a pop', !!safe(() => M.charHudBar(m5, { ...other, gain: 1 }, 1500)).pop);
    t('5h a pop of nothing (a gain under 1) is no pop', !safe(() => M.charHudBar(m5, { ...other, gain: 0 }, 1500)).pop);

    /* 6. the switch */
    const s1 = mem();
    t('6a on by default', M.charHudWanted('', s1) === true && M.charHudWanted('?x=1', null) === true);
    t('6b ?hud=0 turns it off and remembers', M.charHudWanted('?hud=0', s1) === false && s1.getItem(M.CHAR_HUD_KEY) === '0' && M.charHudWanted('', s1) === false);
    t('6c ?hud=1 forgets', M.charHudWanted('?hud=1', s1) === true && s1.getItem(M.CHAR_HUD_KEY) === null && M.charHudWanted('', s1) === true);
    t('6d another switch is not it', M.charHudWanted('?hudbars=0', mem()) === true && M.charHudWanted('?nohud=0', mem()) === true);
    t('6e its key', M.CHAR_HUD_KEY === 'bt_charhud');
    const boom = { getItem() { throw new Error('private mode'); }, setItem() { throw new Error('full'); }, removeItem() { throw new Error('x'); } };
    t('6f a store that throws: on, and the address still decides this visit', M.charHudWanted('', boom) === true && M.charHudWanted('?hud=0', boom) === false);
    const hadLoc = Object.getOwnPropertyDescriptor(globalThis, 'location');
    try {
      globalThis.location = { search: '' };
      const a1 = M.charHudOn();
      globalThis.location = { search: '?hud=0' };
      const a2 = M.charHudOn();
      globalThis.location = { search: '?a=1' };
      const a3 = M.charHudOn();
      t('6g the page\'s answer follows its address (no storage here: nothing remembered)', a1 === true && a2 === false && a3 === true);
    } finally {
      if (hadLoc) Object.defineProperty(globalThis, 'location', hadLoc); else delete globalThis.location;
    }

    /* 7. the quest line */
    const l1 = safe(() => M.charHudQuestLine({ title: 'Into the Wild', count: '3/5', line: 'Defeat 5 monsters' }, null));
    t('7a the owner\'s "[Into the Wild · 3/5 · Defeat 5 monsters]"', l1 === 'Into the Wild · 3/5 · Defeat 5 monsters');
    const l2 = safe(() => M.charHudQuestLine({ title: 'A\nlong  title', count: '', line: 'Go\nthere' }, null));
    t('7b never a newline, an empty part dropped', typeof l2 === 'string' && !/\n/.test(l2) && l2 === 'A long title · Go there');
    t('7c between quests: Next and Talk to', safe(() => M.charHudQuestLine(null, { next: 'Next: Cold Reception', talk: 'Talk to Gus' })) === 'Next: Cold Reception · Talk to Gus');
    t('7d nothing: empty', safe(() => M.charHudQuestLine(null, null)) === '');

    /* 8. the span */
    const r = { left: 8, top: 120, right: 200, bottom: 164, width: 192, height: 44 };
    const sp = safe(() => M.charHudSpan(r, true));
    t('8a on: up over the HUD and its gap (the stack), out to the HUD\'s width at least',
      sp.top === 120 - M.CHAR_HUD.stack && sp.bottom === 164 && sp.left === 8 && sp.right === 200 && sp.width === 192 && sp.height === 44 + M.CHAR_HUD.stack);
    const narrow = safe(() => M.charHudSpan({ left: 8, top: 120, right: 100, bottom: 150, width: 92, height: 30 }, true));
    t('8b a narrow card stretched to the HUD\'s width', narrow.right === 8 + M.CHAR_HUD.w && narrow.width === M.CHAR_HUD.w);
    t('8c off: the rect as measured; none: none', safe(() => M.charHudSpan(r, false)) === r && safe(() => M.charHudSpan(null, true)) === null);
    t('8d the sizes: 184 x 52, sideways 176 x 48, the face 44 / 40, the line 30 in 44, the stack the HUD and its gap',
      M.CHAR_HUD.w === 184 && M.CHAR_HUD.h === 52 && M.CHAR_HUD.sideW === 176 && M.CHAR_HUD.sideH === 48 && M.CHAR_HUD.face === 44
      && M.CHAR_HUD.sideFace === 40 && M.CHAR_HUD.line === 30 && M.CHAR_HUD.lineHit === 44
      && M.CHAR_HUD.stack === M.CHAR_HUD.h + M.CHAR_HUD.gap && M.CHAR_HUD.sideStack === M.CHAR_HUD.sideH + M.CHAR_HUD.gap);
  } finally {
    ONE.setOneLevelEnabled(was);
    P3.setProg3Enabled(true);
  }
  return bad;
}

/* a copy of the module with `src` for its text, its imports made absolute
   (so it shares the game's modules, their switches included) */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'charhud-'));
let nTmp = 0;
async function moduleOf(src) {
  const abs = src
    .replace(/from '\.\.\/(data|game)\//g, (m0, d) => `from '${url('src/' + d + '/')}`)
    .replace(/from '\.\/([\w]+)\.js'/g, (m0, f) => `from '${url('src/game/' + f + '.js')}'`);
  const f = path.join(TMP, 'm' + (nTmp++) + '.mjs');
  fs.writeFileSync(f, abs);
  return import(pathToFileURL(f).href);
}

const MOD = 'src/game/charHud.js';
const modSrc = read(MOD);
const M = await import(url(MOD));
const bad = behave(M);
check('1-8. the rules do what the card says (' + 'weapon, level, record, combatLevelProgress, bar, switch, line, span)', bad.length === 0, bad.join('\n     '));
{
  const sy = await moduleOf(modSrc);
  check('1-8. ...and the same from a copy (the plants below are read the same way)', behave(sy).length === 0, behave(sy).join('; '));
}

/* ── 9. the drawing's trees ── */
const parse = (src) => B.parse(src, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true });
const HUD = 'src/ui/hud/CharacterHud.jsx', ZH = 'src/ui/mobile/ZoneHeader.jsx', QC = 'src/ui/QuestCard.jsx', PH = 'src/ui/panels/PartyHUD.jsx';
const FORBIDDEN = new Set(['hp', 'maxHp', 'stam', 'maxStam', 'energy', 'mana', 'maxMana']);

function hudReadsHealth(src) {
  const hits = [];
  B.traverse(parse(src), {
    'MemberExpression|OptionalMemberExpression'(p) {
      const k = p.node.property;
      const n = k && (k.type === 'Identifier' && !p.node.computed ? k.name : (k.type === 'StringLiteral' ? k.value : null));
      if (n && FORBIDDEN.has(n)) hits.push(n);
    },
    ObjectPattern(p) { for (const pr of p.node.properties) if (pr.key && FORBIDDEN.has(pr.key.name || pr.key.value)) hits.push(pr.key.name || pr.key.value); },
  });
  return hits;
}
/* the root's press: onClick opens, onPointerDown and onMouseDown stop, no onPointerUp anywhere */
function hudPress(src) {
  const out = { click: false, stopDown: false, stopMouse: false, up: [] };
  let root = null;
  B.traverse(parse(src), {
    JSXAttribute(p) {
      const n = p.node.name && p.node.name.name;
      if (n === 'onPointerUp' || n === 'onTouchEnd' || n === 'onMouseUp') out.up.push(n);
    },
    JSXOpeningElement(p) {
      if (root) return;
      if (p.node.attributes.some((a) => a.name && a.name.name === 'data-charhud-box')) root = p;
    },
  });
  if (!root) return out;
  const fnBody = (attr) => {
    const v = attr && attr.value && attr.value.expression;
    if (!v) return null;
    if (v.type === 'Identifier') {
      const b = root.scope.getBinding(v.name);
      return b && b.path.node.init ? b.path.node.init : null;
    }
    return v;
  };
  const calls = (fn, name) => {
    let hit = false;
    if (!fn) return false;
    B.traverse(fn, { CallExpression(q) { const c = q.node.callee; if (c.type === 'MemberExpression' && c.property.name === name) hit = true; } }, root.scope, root);
    return hit;
  };
  const attr = (n) => root.node.attributes.find((a) => a.name && a.name.name === n);
  const click = fnBody(attr('onClick'));
  out.click = !!click && calls(click, 'open') && calls(click, 'stopPropagation');
  out.stopDown = calls(fnBody(attr('onPointerDown')), 'stopPropagation');
  out.stopMouse = calls(fnBody(attr('onMouseDown')), 'stopPropagation');
  /* it opens Bro by the Menu's page id, nothing deeper */
  let opensHero = false;
  if (click) B.traverse(click, { CallExpression(q) { const c = q.node.callee; if (c.type === 'MemberExpression' && c.property.name === 'open' && c.object.name === 'dashboardPanelBus' && q.node.arguments[0] && q.node.arguments[0].value === 'hero') opensHero = true; } }, root.scope, root);
  out.hero = opensHero;
  return out;
}
/* ZoneHeader: `const xpOn = !charHudOn() && (...)` */
function xpOnAsks(src) {
  let ok = false, seen = false;
  B.traverse(parse(src), {
    VariableDeclarator(p) {
      if (!p.node.id || p.node.id.name !== 'xpOn') return;
      seen = true;
      const i = p.node.init;
      ok = !!i && i.type === 'LogicalExpression' && i.operator === '&&' && i.left.type === 'UnaryExpression' && i.left.operator === '!'
        && i.left.argument.type === 'CallExpression' && i.left.argument.callee.name === 'charHudOn';
    },
  });
  return seen && ok;
}
const portraitImports = (files) => files.filter(([, src]) => {
  let hit = false;
  B.traverse(parse(src), {
    ImportDeclaration(p) { if (/characterPortrait(\.js)?$/.test(p.node.source.value)) hit = true; },
    CallExpression(p) { if (p.node.callee.type === 'Import' && p.node.arguments[0] && /characterPortrait/.test(p.node.arguments[0].value || '')) hit = true; },
  });
  return hit;
}).map(([f]) => f);
const hudFiles = () => fs.readdirSync(path.join(ROOT, 'src/ui/hud')).filter((f) => /\.jsx?$/.test(f)).map((f) => ['src/ui/hud/' + f, read('src/ui/hud/' + f)]);
/* QuestCard: the one line's text style is nowrap and ellipsis, and the line is drawn in it */
function lineNoWrap(src) {
  let style = null, used = 0;
  B.traverse(parse(src), {
    VariableDeclarator(p) {
      if (p.node.id && p.node.id.name === 'LINE_TEXT' && p.node.init && p.node.init.type === 'ObjectExpression') {
        style = {};
        for (const pr of p.node.init.properties) if (pr.key && pr.value && pr.value.type === 'StringLiteral') style[pr.key.name] = pr.value.value;
      }
    },
    Identifier(p) { if (p.node.name === 'LINE_TEXT' && !p.parentPath.isVariableDeclarator()) used++; },
  });
  return !!style && style.whiteSpace === 'nowrap' && style.textOverflow === 'ellipsis' && style.overflow === 'hidden' && used >= 2;
}
/* PartyHUD: no `top: 92` left; both the chip's and the list's top read --bt-party-top */
function partyTops(src) {
  const tops = [];
  B.traverse(parse(src), {
    ObjectProperty(p) {
      if (!p.node.key || (p.node.key.name || p.node.key.value) !== 'top') return;
      const v = p.node.value;
      tops.push(v.type === 'NumericLiteral' ? v.value : (v.type === 'StringLiteral' ? v.value : '?'));
    },
  });
  return { n92: tops.filter((v) => v === 92).length, nVar: tops.filter((v) => typeof v === 'string' && /var\(--bt-party-top, 92px\)/.test(v)).length };
}

const hudSrc = read(HUD), zhSrc = read(ZH), qcSrc = read(QC), phSrc = read(PH);
check('9a the HUD reads no health, energy or mana (its syntax tree)', hudReadsHealth(hudSrc).length === 0, hudReadsHealth(hudSrc));
const pr = hudPress(hudSrc);
check('9b the whole box opens Bro on click (dashboardPanelBus.open(\'hero\')) and stops the press (pointer and mouse); nothing acts on pointerup',
  pr.click && pr.hero && pr.stopDown && pr.stopMouse && pr.up.length === 0, JSON.stringify(pr));
check('9c ZoneHeader\'s xpOn asks !charHudOn() first: the weapon\'s XP is never in both', xpOnAsks(zhSrc));
check('9d nothing under src/ui/hud/ imports characterPortrait.js (the dashboard\'s one bake)', portraitImports(hudFiles()).length === 0, portraitImports(hudFiles()));
check('9e QuestCard\'s one line cannot wrap (nowrap, hidden, ellipsis, drawn in it)', lineNoWrap(qcSrc));
const pt = partyTops(phSrc);
check('9f PartyHUD\'s chip and list stand at --bt-party-top (92 as before under ?hud=0), never top: 92', pt.n92 === 0 && pt.nVar === 2, JSON.stringify(pt));
{
  const css = read('src/styles/game.css');
  check('9g game.css: the base, the top built on it, and the stack variables set only while the HUD is up',
    /html\{--bt-hud-base:calc\(56px \+ var\(--bt-bar-grow,0px\) \+ env\(safe-area-inset-top,0px\)\);\s*--bt-hud-top:calc\(var\(--bt-hud-base\) \+ var\(--bt-charhud-h,0px\)\)\}/.test(css)
      && /html\[data-charhud="1"\]\{--bt-charhud-h:56px;\s*--bt-status-top:calc\(var\(--bt-hud-top\) \+ 44px\);\s*--bt-party-top:calc\(var\(--bt-status-top\) \+ 48px\)\}/.test(css)
      && /@media \(max-height:480px\)\{html\[data-charhud="1"\]\{--bt-charhud-h:52px;\s*--bt-status-top:calc\(var\(--bt-hud-top\) \+ 34px\);\s*--bt-party-top:var\(--bt-hud-base\);--bt-party-left:192px\}\}/.test(css));
}

/* ── 10. the dodges: each planted, each red ── */
async function plantModule(name, from, to, why) {
  if (modSrc.indexOf(from) < 0) { check('10 plant "' + name + '" finds its text', false, from); return; }
  const m = await moduleOf(modSrc.split(from).join(to));
  const b = behave(m);
  check('10 plant red: ' + name, b.length > 0, why);
}
const plantSrc = (name, src, from, to, test) => {
  if (src.indexOf(from) < 0) { check('10 plant "' + name + '" finds its text', false, from); return; }
  check('10 plant red: ' + name, !test(src.split(from).join(to)));
};
await plantModule('the weapon from bestWeaponProgress (the weapon closest to its own next level)',
  '    if (one && lv[c] < top) continue;\n', '', 'Sword 10 at 90% beside Bow 12 at 10% would say Sword');
await plantModule('the level from the weapon\'s own level', '  const level = prog3CharLevel(rpg);', '  const level = prog3SkillLevel(rpg, w.cat);', '');
await plantModule('the level summed under one level', '  const level = prog3CharLevel(rpg);',
  '  const level = CATS.reduce((n, c) => n + prog3SkillLevel(rpg, c), 0);', '');
await plantModule('"Lv 1" before the record', "ready: false, name, level: null,", "ready: false, name, level: 1,", '');
await plantModule('NaN before the record', "ready: false, name, level: null,", "ready: false, name, level: Number('x'),", '');
await plantModule('an empty bar at the cap', "max: true, wLevel, xpNow: null, xpNeed: null, frac: 1 }", "max: true, wLevel, xpNow: null, xpNeed: null, frac: 0 }", '');
await plantModule('no word at the cap', "word: say(HUD, 'charHud.max'), max: true", "word: '', max: true", '');
await plantModule('?hud=0 not remembered', "if (v === '0') ls.setItem(CHAR_HUD_KEY, '0'); else ls.removeItem(CHAR_HUD_KEY);", 'void 0;', '');
await plantModule('the HUD on under ?hud=0', "    return v === '1';\n", '    return true;\n', '');
await plantModule('a quest line that keeps its newlines', "const oneLine = (s) => String(s == null ? '' : s).replace(/\\s+/g, ' ').trim();", "const oneLine = (s) => String(s == null ? '' : s);", '');
plantSrc('the HUD reads hp', hudSrc, "const xb = (S && S._xpBar)", "const hp = (S && S.hp) || 0; const xb = (S && S._xpBar)", (s) => hudReadsHealth(s).length === 0);
plantSrc('the HUD reads energy', hudSrc, "const rpg = (S && S.rpg)", "const e = rpgState && rpgState.energy; const rpg = (S && S.rpg)", (s) => hudReadsHealth(s).length === 0);
plantSrc('xpOn without !charHudOn()', zhSrc, 'const xpOn = !charHudOn() && (', 'const xpOn = (', xpOnAsks);
plantSrc('xpOn asking it the wrong way round', zhSrc, 'const xpOn = !charHudOn() && (', 'const xpOn = charHudOn() && (', xpOnAsks);
check('10 plant red: a second portrait bake under src/ui/hud/',
  portraitImports([...hudFiles(), ['src/ui/hud/Face.jsx', "import { portraitDataUrl } from '@/rendering/characterPortrait.js';\n"]]).length === 1);
plantSrc('the line without nowrap', qcSrc, "whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };", "overflow: 'hidden', textOverflow: 'ellipsis' };", lineNoWrap);
plantSrc('the party chip still at top: 92 under the HUD', phSrc, "position: 'absolute', top: 'var(--bt-party-top, 92px)', left: 'var(--bt-party-left, 8px)', zIndex: 16, height: 32,",
  "position: 'absolute', top: 92, left: 'var(--bt-party-left, 8px)', zIndex: 16, height: 32,", (s) => { const t = partyTops(s); return t.n92 === 0 && t.nVar === 2; });
plantSrc('a face that acts on pointerup', hudSrc, '      onClick={open}\n', '      onPointerUp={open}\n      onClick={open}\n',
  (s) => { const p = hudPress(s); return p.click && p.hero && p.stopDown && p.stopMouse && p.up.length === 0; });
plantSrc('a face that does not stop the press (a click on a computer swings)', hudSrc, '      onMouseDown={stop}\n', '',
  (s) => { const p = hudPress(s); return p.click && p.hero && p.stopDown && p.stopMouse && p.up.length === 0; });
plantSrc('a face that opens something deeper than Bro', hudSrc, "dashboardPanelBus.open('hero')", "dashboardPanelBus.open('broCombat')",
  (s) => { const p = hudPress(s); return p.click && p.hero; });

/* ── 11. every mutant of the module ── */
/* the survivors, each with why it changes nothing a player sees (a key: line:column operator) */
const SURVIVORS = Object.freeze({
  '73:37 !==>===': 'the page\'s own storage when none is handed in: node has none, and either way a store that is not there reads as none (the tests hand theirs in)',
  '102:19 1>2': 'the first best share is below any share (-1 or -2: every share is 0 or more)',
  '107:26 1>2': 'Math.max(1, need): prog3XpRequired is 280 or more at every level, so the floor of 1 or 2 is never reached',
  '133:26 1>2': 'the same floor on the shown weapon\'s need (280 or more)',
});
{
  const ast = parse(modSrc);
  const muts = [];
  const flip = { '>': ['>=', '<'], '>=': ['>', '<'], '<': ['<=', '>'], '<=': ['<', '>'], '===': ['!=='], '!==': ['==='], '&&': ['||'], '||': ['&&'], '+': ['-'], '-': ['+'], '*': ['/'], '/': ['*'] };
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
    NumericLiteral(p) {
      if (p.findParent((q) => q.isVariableDeclarator() && q.node.id && q.node.id.name === 'CHAR_HUD')) return;   /* the sizes: 8d holds them whole */
      const v = p.node.value;
      muts.push({ key: p.node.loc.start.line + ':' + p.node.loc.start.column + ' ' + v + '>' + (v + 1), s: p.node.start, e: p.node.end, to: String(v + 1) });
    },
  });
  const survived = [];
  let killed = 0;
  for (const m of muts) {
    let m2 = null;
    try { m2 = await moduleOf(modSrc.slice(0, m.s) + m.to + modSrc.slice(m.e)); } catch (e) { killed++; continue; }   /* a mutant that does not load is killed */
    if (behave(m2).length > 0) killed++;
    else survived.push(m.key);
  }
  const unlisted = survived.filter((k) => !SURVIVORS[k]);
  const stale = Object.keys(SURVIVORS).filter((k) => survived.indexOf(k) < 0);
  check('11 every mutant of charHud.js killed or listed with why: ' + killed + ' of ' + muts.length + ' killed', muts.length > 40 && unlisted.length === 0, unlisted.join(', '));
  check('11 ...and no survivor listed that is killed now (the list only falls)', stale.length === 0, stale.join(', '));
}

try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* tmp */ }
console.log(`\nchar-hud: ${failed ? failed + ' FAILED' : 'all passed'}`);
if (failed) process.exit(1);
