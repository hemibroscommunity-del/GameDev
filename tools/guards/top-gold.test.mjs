/* ═══ v2.3.6786: THE GOLD ON THE TOP BAR'S RULES (card UI3, PR 7) ═══
 *
 * src/game/topGold.js decides what the top bar's gold shows (the owner,
 * 2026-11-26: "Move gold amount in between daily spin and brotown on top
 * bar").  This suite tests what the rules DO, then reads the drawing's syntax
 * tree for what must never be there.  It lives here, not in server/test/: it
 * tests the page's code, and a new file there deploys the worker (TRAPS §277).
 *
 *   1. the number's form is Gear's (barNumber(coins, true, 10000)): 0, 999,
 *      1,000, 9,999, 10K, a seven-figure purse; the reader's words "Gold: N"
 *      say the whole number;
 *   2. the number is read where Gear reads it (S.rpg.coins), never from a
 *      second field (S.coins, S.gold, rpg.gold, a prediction);
 *   3. a missing purse shows NOTHING (null): no state, no rpg, the worker's
 *      record not come yet (S._rpgFromServer false: a warm-start 0 or 500 is
 *      never drawn), coins missing or not a number; never "NaN", "undefined"
 *      or "0" for it;
 *   4. the switch: `?topgold=0` off and remembered, `?topgold=1` forgets, on
 *      by default; another name (`?gold=0`, `?topgoldx=0`) is not it; off,
 *      the model is null;
 *   5. a change: the first number is never one; up a gain, down a spend;
 *   6. THE DRAWING'S TREE: ZoneHeader.jsx draws [data-topbar-gold] from
 *      topGoldModel(S, topGoldOn()), reads no `.coins` inside it, and the
 *      gold takes no press (no onClick, no button);
 *   7. THE DODGES (the card's), each planted and seen red, every run: the
 *      number read from a second source than Gear's; a missing purse drawn
 *      as 0 before the state has come; the switch read backwards (both
 *      halves); and the drawing given its own number.
 *
 * Run: node tools/guards/top-gold.test.mjs  (needs @babel/parser and
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
const BN = await import(url('src/game/barNumbers.js'));
/* Gear's reading, as GearPanels.jsx / GearTab.jsx write it: R = S.rpg, Number(R.coins || 0), barNumber(coins, true, 10000) */
const gearSays = (S) => BN.barNumber(Number((S.rpg || {}).coins || 0), true, 10000);
const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _m: m }; };
const live = (coins, more) => ({ _rpgFromServer: true, rpg: { coins }, ...(more || {}) });

/* ── 1-5: what the module DOES; a list of what is wrong (empty: right) ── */
function behave(M) {
  const bad = [];
  const t = (name, ok) => { if (!ok) bad.push(name); };
  const safe = (fn) => { try { return fn(); } catch (e) { return { __threw: String(e && e.message) }; } };
  const m = (S, on = true) => safe(() => M.topGoldModel(S, on));
  /* 1. the form */
  const forms = [[0, '0'], [999, '999'], [1000, '1,000'], [9999, '9,999'], [10000, '10K'], [12400, '12.4K'], [2550000, '2.55M'], [9999999, gearSays(live(9999999))]];
  for (const [n, want] of forms) {
    const r = m(live(n));
    t('1 ' + n + ' says "' + want + '"', !!r && r.n === n && r.text === want && r.text === gearSays(live(n)));
  }
  const big = m(live(9999999));
  t('1 a seven-figure purse: the reader hears the whole number ("Gold: 9,999,999")', !!big && big.label === 'Gold: 9,999,999');
  t('1 0: the reader hears "Gold: 0"', (m(live(0)) || {}).label === 'Gold: 0');
  t('1 a broken fraction is floored as Gear\'s (12.9 -> 12)', (m(live(12.9)) || {}).text === '12');
  t('1 a purse sent as a string ("450") is the number 450', (m(live('450')) || {}).n === 450);
  /* 2. the source */
  const decoys = live(1234, { coins: 7, gold: 8, player: { coins: 5, gold: 6 }, _goldPredict: 3, _coins: 2 });
  decoys.rpg.gold = 9; decoys.rpg.bankCoins = 55; decoys.rpg.vault = { coins: 44 };
  const d = m(decoys);
  t('2 the number is S.rpg.coins (Gear\'s), not S.coins, S.gold, rpg.gold or a prediction', !!d && d.n === 1234 && d.text === gearSays(decoys));
  const decoys0 = live(0, { coins: 900, gold: 800 });
  t('2 ...a purse of 0 is 0 though another field holds more', (m(decoys0) || {}).text === '0');
  /* 3. missing */
  const nothing = [
    ['no state', null], ['no rpg', { _rpgFromServer: true }], ['rpg null', { _rpgFromServer: true, rpg: null }],
    ['the record not come (a warm-start 0)', { rpg: { coins: 0 } }], ['the record not come (a cache of 500)', { _rpgFromServer: false, rpg: { coins: 500 } }],
    ['coins missing', { _rpgFromServer: true, rpg: {} }], ['coins null', live(null)], ['coins "abc"', live('abc')], ['coins NaN', live(NaN)],
    ['coins Infinity', live(Infinity)], ['coins ""', live('')],
  ];
  for (const [why, S] of nothing) {
    const r = m(S);
    t('3 ' + why + ': nothing shown', r === null);
  }
  /* 4. the switch */
  const ls = mem();
  t('4 on by default', safe(() => M.topGoldWanted('', mem())) === true);
  t('4 ?topgold=0 turns it off', safe(() => M.topGoldWanted('?topgold=0', ls)) === false);
  t('4 ...and it is remembered on the device', ls._m.get(M.TOP_GOLD_KEY) === '0' && safe(() => M.topGoldWanted('', ls)) === false);
  t('4 ?topgold=1 brings it back and forgets', safe(() => M.topGoldWanted('?topgold=1', ls)) === true && !ls._m.has(M.TOP_GOLD_KEY) && safe(() => M.topGoldWanted('', ls)) === true);
  t('4 another name is not it (?gold=0, ?topgoldx=0)', safe(() => M.topGoldWanted('?gold=0', mem())) === true && safe(() => M.topGoldWanted('?topgoldx=0', mem())) === true);
  t('4 a device with no storage: the address alone decides', safe(() => M.topGoldWanted('?topgold=0', null)) === false && safe(() => M.topGoldWanted('', null)) === true);
  t('4 off, the model is null', m(live(500), false) === null);
  /* 5. a change */
  t('5 the first number is no change', safe(() => M.topGoldChange(null, 500)) === null && safe(() => M.topGoldChange(undefined, 0)) === null);
  t('5 up is a gain, down a spend, the same nothing', safe(() => M.topGoldChange(500, 512)) === 'gain' && safe(() => M.topGoldChange(512, 300)) === 'spend' && safe(() => M.topGoldChange(300, 300)) === null);
  t('5 gone (null) is no change', safe(() => M.topGoldChange(300, null)) === null);
  return bad;
}

/* a copy of the module with `src` for its text, its imports made absolute */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'topgold-'));
let nTmp = 0;
async function moduleOf(src) {
  const abs = src
    .replace(/from '\.\.\/(data|game)\//g, (m0, dd) => `from '${url('src/' + dd + '/')}`)
    .replace(/from '\.\/([\w]+)\.js'/g, (m0, f) => `from '${url('src/game/' + f + '.js')}'`);
  const f = path.join(TMP, 'm' + (nTmp++) + '.mjs');
  fs.writeFileSync(f, abs);
  return import(pathToFileURL(f).href);
}

const MOD = 'src/game/topGold.js';
const modSrc = read(MOD);
const M = await import(url(MOD));
const bad = behave(M);
check('1-5. the rules do what the card says (form, source, missing, switch, change)', bad.length === 0, bad.join('\n     '));
{
  const sy = await moduleOf(modSrc);
  const b2 = behave(sy);
  check('1-5. ...and the same from a copy (the plants below are read the same way)', b2.length === 0, b2.join('; '));
}

/* ── 6. the drawing's tree ── */
const ZH = 'src/ui/mobile/ZoneHeader.jsx';
function drawing(src) {
  const out = { model: false, attr: false, coinsIn: 0, press: 0, textFrom: false };
  let ast = null;
  try { ast = B.parse(src, { sourceType: 'module', plugins: ['jsx'] }); } catch (e) { out.err = String(e.message); return out; }
  let modelVar = null;
  B.traverse(ast, {
    VariableDeclarator(p) {
      const i = p.node.init;
      if (i && i.type === 'CallExpression' && i.callee.type === 'Identifier' && i.callee.name === 'topGoldModel'
        && i.arguments.length === 2 && i.arguments[0].type === 'Identifier' && i.arguments[0].name === 'S'
        && i.arguments[1].type === 'CallExpression' && i.arguments[1].callee.name === 'topGoldOn' && p.node.id.type === 'Identifier') {
        out.model = true; modelVar = p.node.id.name;
      }
    },
  });
  B.traverse(ast, {
    JSXOpeningElement(p) {
      const has = p.node.attributes.some((a) => a.type === 'JSXAttribute' && a.name && a.name.name === 'data-topbar-gold');
      if (!has) return;
      out.attr = true;
      const el = p.parentPath;
      if (p.node.name.name === 'button' || p.node.attributes.some((a) => a.type === 'JSXAttribute' && a.name && /^on(Click|PointerDown|PointerUp|TouchStart|TouchEnd)$/.test(a.name.name))) out.press++;
      el.traverse({
        MemberExpression(q) { if (!q.node.computed && q.node.property.name === 'coins') out.coinsIn++; },
        CallExpression(q) { if (q.node.callee.type === 'Identifier' && q.node.callee.name === 'barNumber') out.coinsIn++; },
        JSXOpeningElement(q) { if (q.node.name.name === 'button' || q.node.attributes.some((a) => a.type === 'JSXAttribute' && a.name && /^onClick$/.test(a.name.name))) out.press++; },
        JSXExpressionContainer(q) {
          const e = q.node.expression;
          if (modelVar && e.type === 'MemberExpression' && e.object.type === 'Identifier' && e.object.name === modelVar && e.property.name === 'text') out.textFrom = true;
        },
      });
    },
  });
  return out;
}
const drawOk = (o) => o.model && o.attr && o.coinsIn === 0 && o.press === 0 && o.textFrom;
const zhSrc = read(ZH);
const dz = drawing(zhSrc);
check('6. ZoneHeader draws [data-topbar-gold] from topGoldModel(S, topGoldOn()).text, reads no .coins and no barNumber inside it, and it takes no press', drawOk(dz), JSON.stringify(dz));

/* ── 7. the dodges: each planted, each red ── */
async function plantModule(name, from, to) {
  if (modSrc.indexOf(from) < 0) { check('7 plant "' + name + '" finds its text', false, from); return; }
  const mm = await moduleOf(modSrc.split(from).join(to));
  const b = behave(mm);
  check('7 plant red: ' + name, b.length > 0);
}
await plantModule('the number read from a second source (S.coins first)', '  const c = S.rpg.coins;', '  const c = S.coins != null ? S.coins : S.rpg.coins;');
await plantModule('the number read from a second source (rpg.gold)', '  const c = S.rpg.coins;', '  const c = S.rpg.gold != null ? S.rpg.gold : S.rpg.coins;');
await plantModule('a missing purse drawn as 0 before the state has come',
  "  if (!S || !S._rpgFromServer || !S.rpg) return null;\n  const c = S.rpg.coins;\n  if (c == null || c === '' || !Number.isFinite(Number(c))) return null;",
  '  const c = (S && S.rpg && S.rpg.coins) || 0;');
await plantModule('the record not waited for', '  if (!S || !S._rpgFromServer || !S.rpg) return null;', '  if (!S || !S.rpg) return null;');
await plantModule('the switch read backwards (the address)', "    return v === '1';\n", "    return v === '0';\n");
await plantModule('the switch read backwards (the memory)', "  try { return !(ls && ls.getItem(TOP_GOLD_KEY) === '0'); }", "  try { return !!(ls && ls.getItem(TOP_GOLD_KEY) === '0'); }");
await plantModule('?topgold=0 not remembered', "if (v === '0') ls.setItem(TOP_GOLD_KEY, '0'); else ls.removeItem(TOP_GOLD_KEY);", 'void 0;');
await plantModule('a form of its own (whole, never short)', '    text: barNumber(n, true, TOP_GOLD_SHORT),', '    text: barNumber(n, false),');
{
  const re = /\{\s*gold\.text\s*\}/;
  const m0 = zhSrc.match(re);
  if (!m0) check('7 plant "the drawing given its own number" finds its text', false, String(re));
  else {
    const o = drawing(zhSrc.replace(re, '{barNumber(S.rpg.coins, true, 10000)}'));
    check('7 plant red: the drawing given its own number (S.rpg.coins in the JSX)', !drawOk(o), JSON.stringify(o));
  }
  const o2 = drawing(zhSrc.replace('data-topbar-gold=', 'onClick={() => {}} data-topbar-gold='));
  check('7 plant red: the gold made pressable', !drawOk(o2), JSON.stringify(o2));
}

try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* tmp */ }
console.log(`\ntop-gold: ${failed ? failed + ' FAILED' : 'all passed'}`);
if (failed) process.exit(1);
