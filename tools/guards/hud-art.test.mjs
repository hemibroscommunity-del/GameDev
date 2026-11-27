/* ═══ v2.3.6787: THE CHARACTER HUD IN THE OWNER'S PICTURES -- ITS RULES (card UI3, PR 8) ═══
 *
 *   node tools/guards/hud-art.test.mjs
 *
 * The owner, 2026-11-26: "Use these art assets for a new compact hud in top
 * left and weapon xp bar".  "The tiny pill on the right of weapon xp bar
 * should have weapon level. Inside character badge goes combat lvl".
 * "Weapon in hand".  What src/game/hudArt.js DOES (run in node), and what
 * the drawing (src/ui/hud/HudArt.jsx) may and may not read, by its syntax
 * tree:
 *   1. the badge is the COMBAT level (UI3-hud's model; the worker's own
 *      rpg.level, dash/gearStats.js charLevel) on blobs where the three
 *      weapons differ, under one level and without; the pill the weapon IN
 *      HAND's level (never the two swapped); the bar's weapon is the one in
 *      hand (prog3ActiveCat), never UI3-hud's "closest to the next combat
 *      level"; before the record both are empty (never "1", never NaN);
 *   2. the fill: 0 nothing drawn, 1 the whole inner width, any share drawn
 *      to the share (its ends never squashed), never wider than the track,
 *      never negative or NaN (a missing blob, a missing width);
 *   3. the switch: `?hudart=0` off and remembered, `?hudart=1` forgets, on
 *      otherwise;
 *   4. the layout: UI3-hud's box (184 x 52), every piece inside it, the fill
 *      between the small ring and the pill, both buttons 44 tall sideways;
 *   5. the pictures: each file the size src/data/hudArt.js says, 256 colours
 *      at most, warmed behind the loading screen (controlsPreload.js);
 *   6. the drawing reads no health, energy or mana, measures nothing (no
 *      layout read under src/ui/hud/), the face opens Bro and the bar the
 *      weapon's page by Bro's road, each stopping the press, nothing on
 *      pointerup, every picture undraggable; no CSS filter; and (6i, the
 *      mend of sitting 72) what each slot of the drawing is FED, by its tree:
 *      an ALLOW list a slot (the badge's number and words the combat level,
 *      the pill's the weapon in hand's level, both empty before the record);
 *   7. the dodges, each planted and seen red.
 * Run by server/test/run.mjs (tools/guards/*.test.mjs): no deploy.
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

const P3 = await import(url('src/data/prog3.js'));
const ONE = await import(url('src/data/oneFormula.js'));
const CH = await import(url('src/game/charHud.js'));
const GS = await import(url('src/ui/mobile/dash/gearStats.js'));
const ICONS = (await import(url('src/ui/mobile/xpBarArt.js'))).XP_BAR_ICONS;

/* a blob as the worker keeps it: rpg.level is its _prog3CharLevel */
function blob(sk, slot, one) {
  const r = { activeSlot: slot, prog3: { sk } };
  const lv = (c) => Math.max(1, Math.min(P3.PROG3.LEVEL_CAP, (sk[c] && sk[c].level) || 1));
  r.level = one ? Math.max(...P3.PROG3.SKILLS.map(lv)) : Math.min(P3.PROG3.CHAR_LEVEL_CAP, P3.PROG3.SKILLS.reduce((n, c) => n + lv(c), 0));
  return r;
}
/* the three differ; the bow is the top (one level) and the closest to raising it */
const SK = () => ({ sword: { level: 10, xp: 0 }, bow: { level: 12, xp: 0 }, staff: { level: 5, xp: 0 } });

/* ── what the module DOES: a list of what is wrong (empty: right) ── */
function behave(M) {
  const bad = [];
  const was = ONE.isOneLevelEnabled();
  try {
    P3.setProg3Enabled(true);
    for (const one of [true, false]) {
      ONE.setOneLevelEnabled(one);
      for (const slot of ['melee', 'ranged', 'staff']) {
        const sk = SK();
        sk.sword.xp = Math.floor(P3.prog3XpRequired(10) * 0.9);   /* the sword closest to ITS next level */
        sk.bow.xp = Math.floor(P3.prog3XpRequired(12) * 0.1);
        sk.staff.xp = Math.floor(P3.prog3XpRequired(5) / 2);
        const R = blob(sk, slot, one);
        const hud = CH.charHudModel(R, { name: 'Bro' });
        const a = M.hudArtModel(R, hud);
        const cat = slot === 'ranged' ? 'bow' : slot === 'staff' ? 'staff' : 'sword';
        const want = GS.charLevel(R);
        if (a.level !== want) bad.push(`1 one=${one} ${slot}: the badge ${a.level}, the combat level (charLevel) ${want}`);
        if (a.level !== P3.prog3CharLevel(R)) bad.push(`1 one=${one} ${slot}: the badge ${a.level}, prog3CharLevel ${P3.prog3CharLevel(R)}`);
        if (a.cat !== cat || M.hudArtWeapon(R) !== cat) bad.push(`1 one=${one} ${slot}: the bar's weapon ${a.cat}, in hand ${cat}`);
        if (a.weaponLevel !== sk[cat].level) bad.push(`1 one=${one} ${slot}: the pill ${a.weaponLevel}, the ${cat}'s level ${sk[cat].level}`);
        const fr = sk[cat].xp / P3.prog3XpRequired(sk[cat].level);
        if (Math.abs(a.frac - fr) > 1e-9) bad.push(`1 one=${one} ${slot}: the fill's share ${a.frac}, the ${cat}'s ${fr}`);
        if (a.icon !== (cat === 'sword' ? M.hudArtUrl('wicon-sword') : ICONS[cat])) bad.push(`1 ${slot}: the icon ${a.icon}`);
        if (!a.ready || a.max) bad.push(`1 ${slot}: ready ${a.ready} max ${a.max}`);
        /* with UI3-hud's own model left out, the same numbers */
        const b = M.hudArtModel(R, null);
        if (b.level !== a.level || b.weaponLevel !== a.weaponLevel || b.cat !== a.cat) bad.push(`1 ${slot}: without UI3-hud's model ${JSON.stringify(b)}`);
      }
      /* the cap: the sword at 100 in hand: full, the pill 100 */
      const sk = SK(); sk.sword.level = 100;
      const R = blob(sk, 'melee', one);
      const a = M.hudArtModel(R, CH.charHudModel(R, {}));
      if (!a.max || a.frac !== 1 || a.weaponLevel !== 100 || a.level !== GS.charLevel(R)) bad.push(`1 one=${one} the cap: ${JSON.stringify(a)}`);
    }
    /* before the record: empty, never 1, never NaN */
    for (const R of [null, {}, { prog3: {} }, { activeSlot: 'ranged' }]) {
      const a = M.hudArtModel(R, CH.charHudModel(R, {}));
      if (a.ready || a.level !== null || a.weaponLevel !== null || a.cat !== null || a.frac !== 0) bad.push(`1 before the record ${JSON.stringify(R)}: ${JSON.stringify(a)}`);
      const a2 = M.hudArtModel(R, null);
      if (a2.ready || a2.level !== null || a2.weaponLevel !== null) bad.push(`1 before the record, no model: ${JSON.stringify(a2)}`);
    }
    /* 2. the fill */
    const W = M.HUD_ART.fill.w, cap = M.HUD_ART.fill.cap;
    const z = M.hudArtFill(0, W, cap);
    if (z.width !== 0 || z.clip !== 0) bad.push(`2 frac 0 drawn: ${JSON.stringify(z)}`);
    const one = M.hudArtFill(1, W, cap);
    if (Math.abs(one.width - W) > 0.01 || one.clip !== 0) bad.push(`2 frac 1: ${JSON.stringify(one)} of ${W}`);
    for (let i = 1; i <= 120; i++) {
      const f = i / 100;
      const r = M.hudArtFill(f, W, cap);
      const vis = r.width - r.clip;
      if (!(r.width >= 0 && r.clip >= 0) || r.width > W + 1e-9) bad.push(`2 frac ${f}: ${JSON.stringify(r)} (the track ${W})`);
      if (Math.abs(vis - W * Math.min(1, f)) > 0.02) bad.push(`2 frac ${f}: shows ${vis}, wants ${W * Math.min(1, f)}`);
      if (r.width > 0 && r.width < Math.min(W, 2 * cap) - 1e-9) bad.push(`2 frac ${f}: drawn ${r.width}, under its two ends ${2 * cap} (squashed)`);
    }
    for (const [f, w] of [[NaN, W], [undefined, W], [-0.2, W], [0.5, undefined], [0.5, NaN], [0.5, -3], [0.5, 0]]) {
      const r = M.hudArtFill(f, w, cap);
      if (!(r.width === 0 && r.clip === 0)) bad.push(`2 frac ${f} width ${w}: ${JSON.stringify(r)}`);
    }
    /* 3. the switch */
    const store = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m }; };
    const ls = store();
    if (M.hudArtWanted('', ls) !== true) bad.push('3 on by default');
    if (M.hudArtWanted('?hudart=0', ls) !== false) bad.push('3 ?hudart=0 not off');
    if (ls.m.get(M.HUD_ART_KEY) !== '0') bad.push('3 ?hudart=0 not remembered');
    if (M.hudArtWanted('', ls) !== false) bad.push('3 off not remembered on the next visit');
    if (M.hudArtWanted('?hudart=1', ls) !== true || ls.m.has(M.HUD_ART_KEY)) bad.push('3 ?hudart=1 does not forget');
    if (M.hudArtWanted('', ls) !== true) bad.push('3 back on after ?hudart=1');
    if (M.hudArtWanted('?hud=0', store()) !== true) bad.push('3 ?hud=0 read as ?hudart=0');
    if (M.hudArtWanted('', null) !== true) bad.push('3 on without a store');
    /* 4. the layout: UI3-hud's box, every piece inside it */
    const L = M.HUD_ART;
    if (L.w !== CH.CHAR_HUD.w || L.h !== CH.CHAR_HUD.h) bad.push(`4 the group ${L.w} x ${L.h}, UI3-hud's ${CH.CHAR_HUD.w} x ${CH.CHAR_HUD.h}`);
    const inBox = (n, b, w, h) => { if (!(b.x >= 0 && b.y >= 0 && b.x + w <= L.w + 1e-9 && b.y + h <= L.h + 1e-9)) bad.push(`4 ${n} outside the box: ${JSON.stringify(b)}`); };
    inBox('the ring', L.face, L.face.size, L.face.size);
    inBox('the badge', L.badge, L.badge.w, L.badge.h);
    inBox('the small ring', L.wring, L.wring.size, L.wring.size);
    inBox('the track', L.track, L.track.w, L.track.h);
    inBox('the pill', L.pill, L.pill.w, L.pill.h);
    inBox('the fill', L.fill, L.fill.w, L.fill.h);
    inBox('the name', L.name, L.name.w, L.name.h);
    if (!(L.fill.x >= L.wring.x + L.wring.size - 1 && L.fill.x + L.fill.w <= L.pill.x)) bad.push(`4 the fill not between the small ring and the pill: ${JSON.stringify(L.fill)}`);
    if (!(L.fill.y >= L.track.y && L.fill.y + L.fill.h <= L.track.y + L.track.h)) bad.push('4 the fill outside the track');
    if (L.h * M.K_SIDE < 44 || L.bar.x * 1 < 44) bad.push(`4 a button under 44: ${L.h * M.K_SIDE} tall sideways, the face ${L.bar.x} wide`);
    if (Math.abs(L.badge.x + L.badge.w / 2 - L.face.size / 2) > 0.5) bad.push('4 the badge not centred under the ring');
  } finally {
    ONE.setOneLevelEnabled(was);
    P3.setProg3Enabled(true);
  }
  return bad;
}

/* a copy of the module with `src` for its text, its imports made absolute */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'hudart-'));
let nTmp = 0;
async function moduleOf(src) {
  const abs = src.replace(/from '(\.\.?\/[^']+)'/g, (m0, rel) => `from '${pathToFileURL(path.join(ROOT, 'src/game', rel)).href}'`);
  const f = path.join(TMP, 'm' + (nTmp++) + '.mjs');
  fs.writeFileSync(f, abs);
  return import(pathToFileURL(f).href);
}

const MOD = 'src/game/hudArt.js';
const modSrc = read(MOD);
const M = await import(url(MOD));
const bad = behave(M);
check('1-4. the rules do what the card says (the badge, the pill, the weapon, the record, the fill, the switch, the layout)', bad.length === 0, bad.join('\n     '));
{
  const sy = await moduleOf(modSrc);
  const b2 = behave(sy);
  check('1-4. ...and the same from a copy (the plants below are read the same way)', b2.length === 0, b2.join('; '));
}

/* ── 5. the pictures ── */
const DATA = await import(url('src/data/hudArt.js'));
function pngOf(file) {
  const b = fs.readFileSync(file);
  const w = b.readUInt32BE(16), h = b.readUInt32BE(20), type = b[25];
  let plte = 0;
  for (let at = 8; at + 8 <= b.length;) { const n = b.readUInt32BE(at), t = b.toString('latin1', at + 4, at + 8); if (t === 'PLTE') { plte = n / 3; break; } at += 12 + n; }
  return { w, h, type, plte, bytes: b.length };
}
{
  const out = [];
  let total = 0;
  for (const [name, m] of Object.entries(DATA.HUD_ART_PIECES)) {
    const f = path.join(ROOT, 'public/ui/hud', name + '.png');
    if (!fs.existsSync(f)) { out.push(name + ': no file'); continue; }
    const p = pngOf(f);
    total += p.bytes;
    if (p.w !== m.w || p.h !== m.h || p.bytes !== m.bytes) out.push(`${name}: ${p.w}x${p.h} ${p.bytes} bytes, hudArt.js says ${m.w}x${m.h} ${m.bytes}`);
    if (p.type !== 3 || !(p.plte > 0 && p.plte <= 256)) out.push(`${name}: colour type ${p.type}, ${p.plte} colours (a palette of 256 at most)`);
  }
  const extra = fs.readdirSync(path.join(ROOT, 'public/ui/hud')).filter((f) => !Object.prototype.hasOwnProperty.call(DATA.HUD_ART_PIECES, f.replace(/\.png$/, '')));
  if (extra.length) out.push('files no piece names: ' + extra.join(', '));
  if (total !== DATA.HUD_ART_BYTES) out.push(`the bytes ${total}, hudArt.js says ${DATA.HUD_ART_BYTES}`);
  check(`5a. the ${Object.keys(DATA.HUD_ART_PIECES).length} pictures are the sizes src/data/hudArt.js says, palette PNGs of 256 colours at most (${total} bytes)`, out.length === 0, out.join('; '));
  check('5b. every picture has an address (HUD_ART_URLS: /ui/hud/<name>.png?v=HUD_ART_VER)', M.HUD_ART_URLS.length === Object.keys(DATA.HUD_ART_PIECES).length
    && M.HUD_ART_URLS.every((u) => /^\/ui\/hud\/[\w-]+\.png\?v=2\.3\.\d+$/.test(u)), M.HUD_ART_URLS.join(' '));
}
const parse = (src) => B.parse(src, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true });
/* controlsPreload.js imports HUD_ART_URLS from game/hudArt.js and pushes them into its list */
function preloads(src) {
  let imp = false, push = false;
  B.traverse(parse(src), {
    ImportDeclaration(p) { if (/game\/hudArt\.js$/.test(p.node.source.value) && p.node.specifiers.some((s) => s.imported && s.imported.name === 'HUD_ART_URLS')) imp = true; },
    CallExpression(p) {
      const c = p.node.callee;
      if (c.type === 'MemberExpression' && c.property.name === 'push' && p.node.arguments.some((a) => a.type === 'SpreadElement' && a.argument.name === 'HUD_ART_URLS')) push = true;
    },
  });
  return imp && push;
}
const PRE = 'src/rendering/controlsPreload.js';
const preSrc = read(PRE);
check('5c. the pictures are warmed behind the loading screen (controlsPreload.js pushes HUD_ART_URLS)', preloads(preSrc));

/* ── 6. the drawing's trees ── */
const ART = 'src/ui/hud/HudArt.jsx', HUD = 'src/ui/hud/CharacterHud.jsx', CSS = 'src/ui/hud/hudArt.css';
const artSrc = read(ART), hudSrc = read(HUD), cssSrc = read(CSS);
const FORBIDDEN = new Set(['hp', 'maxHp', 'stam', 'maxStam', 'energy', 'mana', 'maxMana']);
const LAYOUT = new Set(['getBoundingClientRect', 'getClientRects', 'clientWidth', 'clientHeight', 'offsetWidth', 'offsetHeight', 'offsetTop', 'offsetLeft',
  'scrollWidth', 'scrollHeight', 'innerWidth', 'innerHeight', 'getComputedStyle', 'naturalWidth', 'naturalHeight']);
function reads(src, set) {
  const hits = [];
  B.traverse(parse(src), {
    'MemberExpression|OptionalMemberExpression'(p) {
      const k = p.node.property;
      const n = k && (k.type === 'Identifier' && !p.node.computed ? k.name : (k.type === 'StringLiteral' ? k.value : null));
      if (n && set.has(n)) hits.push(n);
    },
    Identifier(p) { if (set === LAYOUT && LAYOUT.has(p.node.name) && p.parent.type === 'CallExpression' && p.parent.callee === p.node) hits.push(p.node.name); },
    ObjectPattern(p) { for (const pr of p.node.properties) if (pr.key && set.has(pr.key.name || pr.key.value)) hits.push(pr.key.name || pr.key.value); },
  });
  return hits;
}
const hudDir = path.join(ROOT, 'src/ui/hud');
const hudJs = fs.readdirSync(hudDir).filter((f) => /\.jsx?$/.test(f)).map((f) => ['src/ui/hud/' + f, read('src/ui/hud/' + f)]);
const layoutHits = (files) => files.map(([f, s]) => [f, reads(s, LAYOUT)]).filter(([, h]) => h.length).map(([f, h]) => f + ': ' + h.join(', '));
check('6a the owner\'s HUD reads no health, energy or mana (its syntax tree)', reads(artSrc, FORBIDDEN).length === 0, reads(artSrc, FORBIDDEN));
check('6b nothing under src/ui/hud/ measures the page (no layout read)', layoutHits(hudJs).length === 0, layoutHits(hudJs));

/* the buttons: an element by its data-* mark; its onClick's calls */
function buttons(src) {
  const out = { face: null, bar: null, up: [], imgs: 0, dragless: 0, root: null };
  const ast = parse(src);
  let scopeOf = null;
  B.traverse(ast, {
    JSXAttribute(p) {
      const n = p.node.name && p.node.name.name;
      if (n === 'onPointerUp' || n === 'onTouchEnd' || n === 'onMouseUp') out.up.push(n);
    },
    JSXOpeningElement(p) {
      const has = (n) => p.node.attributes.some((a) => a.name && a.name.name === n);
      const attr = (n) => p.node.attributes.find((a) => a.name && a.name.name === n);
      if (p.node.name.name === 'img') {
        out.imgs++;
        const d = attr('draggable');
        if (d && d.value && d.value.expression && d.value.expression.value === false) out.dragless++;
      }
      const fn = (n) => {
        const a = attr(n), v = a && a.value && a.value.expression;
        if (!v) return null;
        if (v.type === 'Identifier') { const b = p.scope.getBinding(v.name); return b && b.path.node.init ? b.path.node.init : null; }
        return v;
      };
      const callsOf = (f) => {
        const list = [];
        if (!f) return list;
        B.traverse(f, { CallExpression(q) {
          const c = q.node.callee;
          if (c.type === 'MemberExpression') {
            const arg = q.node.arguments[0];
            list.push((c.object.name || '?') + '.' + c.property.name + '(' + (arg ? (arg.type === 'StringLiteral' ? arg.value : arg.type === 'MemberExpression' ? (arg.object.name + '[]') : '?') : '') + ')');
          }
        } }, p.scope, p);
        return list;
      };
      const one = () => ({ click: callsOf(fn('onClick')), down: callsOf(fn('onPointerDown')), mouse: callsOf(fn('onMouseDown')),
        role: (attr('role') || {}).value && attr('role').value.value });
      if (has('data-hudart-face')) out.face = one();
      if (has('data-hudart-bar')) out.bar = one();
      if (has('data-hudart')) out.root = one();
      void scopeOf;
    },
  });
  return out;
}
const btn = buttons(artSrc);
const stops = (b) => !!b && b.down.includes('e.stopPropagation()') && b.mouse.includes('e.stopPropagation()') && b.click.includes('e.stopPropagation()') && b.role === 'button';
const faceOk = (b) => stops(b.face) && b.face.click.includes('dashboardPanelBus.open(hero)') && !b.face.click.some((c) => /push/.test(c));
const barOk = (b) => stops(b.bar) && b.bar.click.join(' ').indexOf('dashboardPanelBus.open(hero) dashboardPanelBus.push(broCombat) dashboardPanelBus.push(COMBAT_PAGES[])') >= 0;
check('6c the face (and its badge) is a button that opens Bro (dashboardPanelBus.open(\'hero\')) and stops the press, pointer and mouse', faceOk(btn), JSON.stringify(btn.face));
check('6d the bar is a button that opens the weapon in hand\'s page by Bro\'s road (open hero, push broCombat, push COMBAT_PAGES[cat]) and stops the press', barOk(btn), JSON.stringify(btn.bar));
check('6e nothing acts on pointerup (click only: no swallowTapClick needed)', btn.up.length === 0 && artSrc.indexOf('swallowTapClick') < 0, btn.up.join(', '));
check(`6f every picture is undraggable (${btn.dragless} of ${btn.imgs})`, btn.imgs >= 6 && btn.dragless === btn.imgs);
/* CharacterHud: the art only under charHudOn (after `if (!on || !rpg) return null`), on hudArtOn() */
function branch(src) {
  let ok = false;
  B.traverse(parse(src), {
    IfStatement(p) {
      const t = p.node.test;
      if (t.type === 'CallExpression' && t.callee.name === 'hudArtOn') {
        const prev = p.getAllPrevSiblings().map((q) => q.node).find((n) => n.type === 'IfStatement' && n.test.type === 'LogicalExpression'
          && n.test.left.type === 'UnaryExpression' && n.test.left.argument.name === 'on');
        const ret = p.node.consequent.type === 'ReturnStatement' ? p.node.consequent.argument : null;
        if (prev && ret && ret.type === 'JSXElement' && ret.openingElement.name.name === 'HudArt') ok = true;
      }
    },
  });
  return ok;
}
check('6g CharacterHud.jsx draws the owner\'s HUD on ONE branch (hudArtOn()), only after its own `if (!on || !rpg) return null` (?hud=0 hides it whatever ?hudart says)', branch(hudSrc));
const noFilter = (css) => !/(^|[;{\s])(-webkit-)?(backdrop-)?filter\s*:/.test(css);
const touchAll = (css) => /\.bt-hudart\s*\*\s*\{[^}]*touch-action:manipulation/.test(css) && /\.bt-hudart\{[^}]*touch-action:manipulation/.test(css);
check('6h hudArt.css: no CSS filter (an iPhone pays a layer), touch-action: manipulation on every element', noFilter(cssSrc) && touchAll(cssSrc));

/* ── 6i. what each slot of the drawing is FED (v2.3.6787, the mend of sitting 72) ──
 * The gatekeeper: "three card dodges are green at the drawing, because
 * hud-art.test reads hudArtModel only: the pill showing the combat level; the
 * badge reading the weapon's level; '1' in the badge before the record".  So
 * the drawing's tree is read here (finish.md part 5, rule 2: the tree, never a
 * pattern of text): every slot that shows a number is found by its mark, what
 * feeds it is written out with each const followed to its value and each
 * import to its file, and it must be one row of its ALLOW list.  A new feed is
 * a row added here on purpose; any other shape fails closed. */
function feedOf(node, scope, depth = 0) {
  if (!node || depth > 12) return '<?>';
  const f = (n) => feedOf(n, scope, depth + 1);
  switch (node.type) {
    case 'Identifier': {
      if (node.name === 'undefined') return 'undefined';
      const b = scope.getBinding(node.name);
      if (!b) return node.name;
      if (b.kind === 'module') {
        const d = b.path.parent;
        const imported = b.path.node.imported ? (b.path.node.imported.name || b.path.node.imported.value) : 'default';
        return imported + '@' + (d && d.source ? d.source.value : '?');
      }
      if (b.path.type === 'VariableDeclarator' && b.path.node.id.type === 'Identifier' && b.path.node.init) {
        if (!b.constant) return 'let:' + node.name;
        if (/Function/.test(b.path.node.init.type)) return 'fn:' + node.name;
        return feedOf(b.path.node.init, b.path.scope, depth + 1);
      }
      return (b.kind === 'param' ? 'param:' : b.kind + ':') + node.name;
    }
    case 'MemberExpression': case 'OptionalMemberExpression':
      return f(node.object) + (node.computed ? '[' + f(node.property) + ']' : '.' + node.property.name);
    case 'ConditionalExpression': return '(' + f(node.test) + ' ? ' + f(node.consequent) + ' : ' + f(node.alternate) + ')';
    case 'LogicalExpression': case 'BinaryExpression': return '(' + f(node.left) + ' ' + node.operator + ' ' + f(node.right) + ')';
    case 'UnaryExpression': return node.operator + f(node.argument);
    case 'StringLiteral': return JSON.stringify(node.value);
    case 'NumericLiteral': return String(node.value);
    case 'BooleanLiteral': return String(node.value);
    case 'NullLiteral': return 'null';
    case 'TemplateLiteral': return node.expressions.length ? '`<' + node.expressions.map(f).join(',') + '>`' : JSON.stringify(node.quasis[0].value.cooked);
    case 'CallExpression': return f(node.callee) + '(' + node.arguments.map(f).join(', ') + ')';
    case 'ObjectExpression': return '{' + node.properties.map((p) => p.type === 'ObjectProperty' ? (p.key.name || p.key.value) + ': ' + f(p.value) : '...' + f(p.argument)).join(', ') + '}';
    default: return '<' + node.type + '>';
  }
}
const attrOf = (el, n) => el.openingElement.attributes.find((a) => a.type === 'JSXAttribute' && a.name && a.name.name === n);
function slots(src) {
  const out = { found: Object.create(null), feeds: Object.create(null), extra: [], writes: [] };
  const put = (k, v) => { (out.feeds[k] = out.feeds[k] || []).push(v); };
  const childFeeds = (el, scope) => el.children.map((c) => c.type === 'JSXExpressionContainer' ? (c.expression.type === 'JSXEmptyExpression' ? null : feedOf(c.expression, scope))
    : c.type === 'JSXText' ? (c.value.trim() ? 'text:' + c.value.trim() : null)
      : c.type === 'JSXElement' ? 'element:' + c.openingElement.name.name : '<' + c.type + '>').filter((x) => x !== null);
  const attrFeed = (el, n, scope) => {
    const a = attrOf(el, n);
    if (!a || !a.value) return null;
    return a.value.type === 'StringLiteral' ? JSON.stringify(a.value.value) : feedOf(a.value.expression, scope);
  };
  B.traverse(parse(src), {
    JSXElement(p) {
      const el = p.node, sc = p.scope;
      const mark = (m) => !!attrOf(el, m);
      const note = (k) => { out.found[k] = (out.found[k] || 0) + 1; };
      if (mark('data-charhud-lv')) {
        note('badge');
        for (const v of childFeeds(el, sc)) put('badge', v);
        /* the box around the number holds the picture and the number only */
        const box = p.parentPath && p.parentPath.node;
        if (!box || box.type !== 'JSXElement' || !attrOf(box, 'data-hudart-badge')) out.extra.push('the badge\'s number is not inside [data-hudart-badge]');
        else for (const c of box.children) if (c !== el && !(c.type === 'JSXText' && !c.value.trim()) && !(c.type === 'JSXElement' && c.openingElement.name.name === 'img')) out.extra.push('badge box: ' + (c.type === 'JSXExpressionContainer' ? feedOf(c.expression, sc) : c.type));
        put('badge.aria', attrFeed(box || el, 'aria-label', sc));
      }
      if (mark('data-hudart-pill')) {
        note('pill');
        for (const v of childFeeds(el, sc)) put('pill', v);
        const box = p.parentPath && p.parentPath.node;
        const cls = box && box.type === 'JSXElement' && attrOf(box, 'className');
        if (!cls || !cls.value || cls.value.value !== 'bt-hudart__pill') out.extra.push('the pill\'s number is not inside .bt-hudart__pill');
        else for (const c of box.children) if (c !== el && !(c.type === 'JSXText' && !c.value.trim()) && !(c.type === 'JSXElement' && c.openingElement.name.name === 'img')) out.extra.push('pill box: ' + (c.type === 'JSXExpressionContainer' ? feedOf(c.expression, sc) : c.type));
      }
      if (mark('data-hudart')) { note('root'); put('root.level', attrFeed(el, 'data-charhud-level', sc)); put('root.wlevel', attrFeed(el, 'data-hudart-wlevel', sc)); }
      if (mark('data-hudart-face')) { note('face'); put('face.aria', attrFeed(el, 'aria-label', sc)); }
      if (mark('data-hudart-bar')) { note('bar'); put('bar.aria', attrFeed(el, 'aria-label', sc)); }
      if (mark('data-xp-bar') && mark('data-xp-level')) { note('xp'); put('xp.level', attrFeed(el, 'data-xp-level', sc)); }
    },
    /* the model is read, never written: `art.level = ...` would feed the badge behind the list */
    AssignmentExpression(p) {
      const l = p.node.left;
      if (l.type === 'MemberExpression' && l.object.type === 'Identifier' && l.object.name === 'art') out.writes.push(feedOf(l, p.scope));
    },
    UpdateExpression(p) { const a = p.node.argument; if (a.type === 'MemberExpression' && a.object.type === 'Identifier' && a.object.name === 'art') out.writes.push(feedOf(a, p.scope)); },
  });
  return out;
}
/* the model, as the tree writes it: `art` is `hudArtModel(rpg, hud)` from src/game/hudArt.js */
const MODEL = 'hudArtModel@@/game/hudArt.js(param:rpg, param:hud)';
const READY = MODEL + '.ready';
const SLOT_ALLOW = Object.freeze({
  /* the badge: the COMBAT level ("Inside character badge goes combat lvl"), nothing before the record */
  badge: ['(' + READY + ' ? ' + MODEL + '.level : "")'],
  'badge.aria': ['(' + READY + ' ? say@@/game/say.js(SAY@@/data/say/charHud.js, "charHud.artLevel", {n: ' + MODEL + '.level}) : undefined)'],
  'face.aria': ['say@@/game/say.js(SAY@@/data/say/charHud.js, "charHud.aria", {name: param:hud.name, n: (' + READY + ' ? ' + MODEL + '.level : "")})'],
  'root.level': ['(' + READY + ' ? ' + MODEL + '.level : "")'],
  /* the pill: the weapon IN HAND's level ("The tiny pill ... should have weapon level") */
  pill: ['(' + READY + ' ? ' + MODEL + '.weaponLevel : "")'],
  'root.wlevel': ['(' + READY + ' ? ' + MODEL + '.weaponLevel : "")'],
  'xp.level': ['(' + READY + ' ? ' + MODEL + '.weaponLevel : "")'],
  'bar.aria': ['(' + MODEL + '.cat ? say@@/game/say.js(SAY@@/data/say/charHud.js, "charHud.artBarAria", {weapon: (' + MODEL + '.cat ? fn:weaponWord('
    + MODEL + '.cat) : ""), n: ' + MODEL + '.weaponLevel}) : undefined)'],
});
const SLOT_ONCE = ['badge', 'pill', 'root', 'face', 'bar', 'xp'];
function slotFaults(src) {
  const s = slots(src), bad = [];
  for (const k of SLOT_ONCE) if (s.found[k] !== 1) bad.push(k + ' found ' + (s.found[k] || 0) + ' times (once)');
  for (const k of Object.keys(SLOT_ALLOW)) {
    const got = s.feeds[k] || [];
    if (got.length !== 1) bad.push(k + ': fed ' + got.length + ' things (one): ' + got.join(' | '));
    for (const v of got) if (!SLOT_ALLOW[k].includes(v)) bad.push(k + ' fed ' + v);
  }
  bad.push(...s.extra, ...s.writes.map((w) => 'the model written: ' + w));
  return bad;
}
const sf = slotFaults(artSrc);
check('6i the drawing\'s slots, by its tree: the badge (and its words) fed the model\'s combat level only, the pill the weapon in hand\'s level only, both empty before the record; nothing else in their boxes; the model never written', sf.length === 0, sf.join('\n     '));

/* ── 7. the dodges: each planted, each red ── */
async function plantModule(name, pairs, why) {
  let src = modSrc;
  for (const [from, to] of pairs) {
    if (src.indexOf(from) < 0) { check('7 plant "' + name + '" finds its text', false, from); return; }
    src = src.split(from).join(to);
  }
  const m = await moduleOf(src);
  const b = behave(m);
  check('7 plant red: ' + name, b.length > 0, why);
}
const plantSrc = (name, src, from, to, test) => {
  if (src.indexOf(from) < 0) { check('7 plant "' + name + '" finds its text', false, from); return; }
  check('7 plant red: ' + name, !test(src.split(from).join(to)));
};
const LEVEL = "  const level = hud && Number.isFinite(Number(hud.level)) && hud.level != null ? Number(hud.level) : prog3CharLevel(rpg);";
await plantModule('the badge reading the weapon in hand\'s level', [[LEVEL, '  const level = p.level;']], '');
await plantModule('the badge the three added up under one level', [[LEVEL, "  const level = ['sword', 'bow', 'staff'].reduce((n, c) => n + weaponProgress(rpg, c).level, 0);"]], '');
await plantModule('the badge the best weapon\'s level whatever the switch', [[LEVEL, "  const level = Math.max(...['sword', 'bow', 'staff'].map((c) => weaponProgress(rpg, c).level));"]], '');
await plantModule('the pill showing the combat level (the two swapped)', [['    weaponLevel: p.level,', '    weaponLevel: level,']], '');
await plantModule('the bar\'s weapon from charHudWeapon (closest to the next combat level)',
  [["import { CHAR_HUD } from './charHud.js';", "import { CHAR_HUD, charHudWeapon } from './charHud.js';"], ['  return prog3ActiveCat(rpg);', '  return charHudWeapon(rpg, true).cat;']], 'sword in hand, the bow closer: the bar would say Bow');
await plantModule('the bar\'s weapon the one closest to ITS next level (bestWeaponProgress\'s rule)',
  [['  return prog3ActiveCat(rpg);', "  return ['sword', 'bow', 'staff'].reduce((b, c) => (weaponProgress(rpg, c).frac > weaponProgress(rpg, b).frac ? c : b), 'sword');"]], '');
await plantModule('"1" in the badge before the record', [['ready: false, level: null,', 'ready: false, level: 1,']], '');
await plantModule('NaN in the badge before the record', [['ready: false, level: null,', "ready: false, level: Number('x'),"]], '');
await plantModule('"1" in the pill before the record', [['cat: null, weaponLevel: null,', 'cat: null, weaponLevel: 1,']], '');
await plantModule('the fill drawn at frac 0', [['|| !Number.isFinite(f) || f <= 0) return', '|| !Number.isFinite(f)) return']], '');
await plantModule('the fill short of the inner width at 1', [['  const want = W * Math.min(1, f);', '  const want = W * Math.min(0.97, f);']], '');
await plantModule('the fill wider than the track past 1', [['  const want = W * Math.min(1, f);', '  const want = W * f;']], '');
await plantModule('a NaN width on a missing width', [['  if (!(W > 0) || !Number.isFinite(f)', '  if (!Number.isFinite(f)']], '');
await plantModule('the fill squashed under its two ends', [['  if (want >= ends) return', '  if (want >= 0) return']], '');
await plantModule('the switch read backwards', [["    return v === '1';\n", "    return v === '0';\n"]], '');
await plantModule('?hudart=0 not remembered', [["if (v === '0') ls.setItem(HUD_ART_KEY, '0'); else ls.removeItem(HUD_ART_KEY);", 'void 0;']], '');
await plantModule('the group taller than UI3-hud\'s box', [['  const W = CHAR_HUD.w, H = CHAR_HUD.h;', '  const W = CHAR_HUD.w, H = CHAR_HUD.h + 9;']], '');
plantSrc('the HUD reads hp', artSrc, '  const art = hudArtModel(rpg, hud);', '  const hp = live && live.hp; const art = hudArtModel(rpg, hud);', (s) => reads(s, FORBIDDEN).length === 0);
plantSrc('the HUD reads energy', artSrc, '  const art = hudArtModel(rpg, hud);', '  const { energy } = rpg || {}; const art = hudArtModel(rpg, hud);', (s) => reads(s, FORBIDDEN).length === 0);
plantSrc('a layout read under src/ui/hud/', artSrc, '  const art = hudArtModel(rpg, hud);', '  const vw = document.body.clientWidth; const art = hudArtModel(rpg, hud);', (s) => layoutHits([[ART, s]]).length === 0);
plantSrc('a measured box under src/ui/hud/', artSrc, '  const art = hudArtModel(rpg, hud);', '  const bx0 = document.body.getBoundingClientRect(); const art = hudArtModel(rpg, hud);', (s) => layoutHits([[ART, s]]).length === 0);
plantSrc('the bar opening Bro only', artSrc, "      dashboardPanelBus.push('broCombat');\n", '', (s) => barOk(buttons(s)));
plantSrc('the face not stopping the press', artSrc, '        onPointerDown={stop} onMouseDown={stop} onClick={openBro}>', '        onClick={openBro}>', (s) => faceOk(buttons(s)));
plantSrc('the bar acting on pointerup', artSrc, 'onClick={openWeapon}>', 'onPointerUp={openWeapon}>', (s) => buttons(s).up.length === 0 && barOk(buttons(s)));
plantSrc('a draggable picture', artSrc, "src={hudArtUrl('pill')} alt=\"\" draggable={false}", "src={hudArtUrl('pill')} alt=\"\"", (s) => { const b = buttons(s); return b.dragless === b.imgs; });
plantSrc('the art drawn even under ?hud=0', hudSrc, '  if (!on || !rpg) return null;\n', '', branch);
plantSrc('a CSS filter', cssSrc, '.bt-hudart__disc{', '.bt-hudart__disc{filter:brightness(1.1);', noFilter);
/* the drawing's slots (6i): the three the gatekeeper named at sitting 72, and their near kin */
const slotsOk = (s) => slotFaults(s).length === 0;
const BADGE = 'data-charhud-lv="1">{art.ready ? art.level : \'\'}</span>';
const PILL = 'data-hudart-pill="1">{art.ready ? art.weaponLevel : \'\'}</span>';
plantSrc('the pill showing the combat level (HudArt.jsx, the pill\'s number)', artSrc, PILL, 'data-hudart-pill="1">{art.ready ? art.level : \'\'}</span>', slotsOk);
plantSrc('the badge reading the weapon\'s level (HudArt.jsx, the badge\'s number)', artSrc, BADGE, 'data-charhud-lv="1">{art.ready ? art.weaponLevel : \'\'}</span>', slotsOk);
plantSrc('"1" in the badge before the record (HudArt.jsx, the badge\'s number)', artSrc, BADGE, 'data-charhud-lv="1">{art.ready ? art.level : 1}</span>', slotsOk);
plantSrc('"1" in the badge before the record, by `||`', artSrc, BADGE, 'data-charhud-lv="1">{art.level || 1}</span>', slotsOk);
plantSrc('"1" in the pill before the record', artSrc, PILL, 'data-hudart-pill="1">{art.ready ? art.weaponLevel : \'1\'}</span>', slotsOk);
plantSrc('the badge fed the weapon\'s level through a const', artSrc, '  const art = hudArtModel(rpg, hud);\n',
  '  const art = hudArtModel(rpg, hud);\n  const lv = art.weaponLevel;\n', (s) => slotsOk(s.split(BADGE).join('data-charhud-lv="1">{art.ready ? lv : \'\'}</span>')));
plantSrc('the model written (art.level = art.weaponLevel)', artSrc, '  const art = hudArtModel(rpg, hud);\n', '  const art = hudArtModel(rpg, hud);\n  art.level = art.weaponLevel;\n', slotsOk);
plantSrc('the weapon\'s level drawn beside the badge\'s number', artSrc, BADGE, BADGE + '{art.weaponLevel}', slotsOk);
plantSrc('the badge\'s words saying the weapon\'s level', artSrc, "say(SAY, 'charHud.artLevel', { n: art.level })", "say(SAY, 'charHud.artLevel', { n: art.weaponLevel })", slotsOk);
plantSrc('the pill\'s mark moved off its number', artSrc, PILL, 'data-x="1">{art.ready ? art.level : \'\'}</span>', slotsOk);
plantSrc('the pictures not warmed', preSrc, '  urls.push(...HUD_ART_URLS);\n', '', preloads);

try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* the system's */ }
console.log(`\nhud-art: ${failed ? failed + ' FAILED' : 'all passed'}`);
if (failed) process.exit(1);
