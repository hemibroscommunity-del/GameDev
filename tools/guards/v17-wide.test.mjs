/* ═══ v2.3.6842: A COMPUTER'S 840 BLOCK, AND WHAT IT MUST NEVER TOUCH (card UI4, PR 3) ═══
 *
 * src/game/v17Wide.js says how wide the band's centred block is on a wide
 * screen: V17's 840 (the owner's V17 handoff, 2026-11-27, its Desktop row,
 * "use extra horizontal space for additional entries, not larger art, text
 * or gameplay view"), or the 480 of v2.3.4243 under `?v17wide=0`.  The card's
 * "What NEVER changes": the band's heights, the closed band, the camera and
 * the world's scale.  This suite tests what the rule DOES and reads the trees
 * for what must never be there.  It lives here, not in server/test/: it tests
 * the page's code, and a new file there deploys the worker (TRAPS §277).
 *
 *   1. the switch: on by default (840); `?v17wide=0` 480 and remembered
 *      (bt_v17wide '0'); `?v17wide=1` forgets and is 840; a stored '0' is
 *      480; storage that throws is the default; another name (`?wide=0`,
 *      `?v17widex=0`, `?v17look=0`) is not it;
 *   2. THE BAND'S GEOMETRY UNMOVED: sheetGeometry loaded twice (the switch on,
 *      then off) answers the same barHeight, identityRowHeight,
 *      columnsRowHeight, bandFootprint (open and folded: the band's height,
 *      the world's width and height, its bars) and oneBandLayout at phones,
 *      sideways phones, tablets and computers; only BAND_ASSEMBLY_MAX_W
 *      differs (840 against 480), and its tree is bandBlockW(v17WideWanted());
 *   3. THE CAMERA AND THE WORLD READ NOTHING OF IT: no file of the camera's
 *      or the world's view (game/worldViewport.js, game/viewCap.js,
 *      ui/mobile/playViewport.js, anything under src/rendering/) imports
 *      v17Wide.js or BAND_ASSEMBLY_MAX_W; and the importers of either, in all
 *      of src/, are the known few (sheetGeometry; BroTown's stamp of
 *      --band-max-w; the kit's sample band) -- a new one (a page sizing its
 *      words or pictures by the block) is red here;
 *   4. NEVER LARGER WORDS OR ART: every CSS declaration under src/ that reads
 *      var(--band-max-w) is a max-width or a left (the block's edge, the
 *      keys list beside it), never a font, a width of a picture, a transform
 *      or a zoom; and BroTown stamps it from bandBlockFor (sheetGeometry);
 *      ...and on a computer's band, where the keys list stands beside the
 *      block, a STEP (deskBlockW): 840 where the band holds it and the list
 *      (1360 or more: 1440 x 900), else 480, never a width between;
 *   5. THE DODGES (the card's), each planted and seen red, every run: the
 *      switch read backwards (the address, the memory); `=0` not remembered;
 *      a width between (a slide); no step; 480 made narrower on a short band;
 *      the widths swapped; the band made taller for the wide row; the world
 *      given the block's width; the camera reading the block; a page's words
 *      sized by the block (an importer, and a CSS font).
 *
 * Run: node tools/guards/v17-wide.test.mjs  (needs @babel/parser and
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

const mem = (init) => { const m = new Map(init || []); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _m: m }; };
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'v17wide-'));
let nTmp = 0;
/* a copy of a module with `src` for its text, its relative imports made absolute from `dir` */
async function moduleOf(src, dir) {
  const abs = src.replace(/from '(\.{1,2}\/[^']+)'/g, (m0, rel) => `from '${pathToFileURL(path.resolve(ROOT, dir, rel)).href}'`);
  const f = path.join(TMP, 'm' + (nTmp++) + '.mjs');
  fs.writeFileSync(f, abs);
  return import(pathToFileURL(f).href);
}

/* ── 1. the switch: a list of what is wrong (empty: right) ── */
function behave(M) {
  const bad = [];
  const t = (name, ok) => { if (!ok) bad.push(name); };
  const w = (search, store) => { try { return M.bandBlockW(M.v17WideWanted(search, store)); } catch (e) { return 'threw ' + e.message; } };
  t('1 on by default: 840', w('', mem()) === 840);
  const s0 = mem();
  t('1 ?v17wide=0: 480', w('?v17wide=0', s0) === 480);
  t('1 ...remembered (bt_v17wide "0")', s0.getItem('bt_v17wide') === '0');
  t('1 ...and the next visit with no address is 480', w('', s0) === 480);
  t('1 ?v17wide=1: 840, and the stored off forgotten', w('?v17wide=1', s0) === 840 && s0.getItem('bt_v17wide') === null);
  t('1 a stored "0" is 480', w('', mem([['bt_v17wide', '0']])) === 480);
  t('1 a stored anything else is 840', w('', mem([['bt_v17wide', '1']])) === 840);
  const boom = { getItem: () => { throw new Error('no'); }, setItem: () => { throw new Error('no'); }, removeItem: () => { throw new Error('no'); } };
  t('1 storage that throws: the default, 840', w('', boom) === 840);
  t('1 ...and ?v17wide=0 still 480 this visit', w('?v17wide=0', boom) === 480);
  t('1 no storage at all: 840', w('', null) === 840);
  for (const other of ['?wide=0', '?v17widex=0', '?v17look=0', '?xv17wide=0']) t(`1 ${other} is not the switch`, w(other, mem()) === 840);
  t('1 the two widths are V17\'s 840 and the owner\'s 480', M.V17_WIDE_W === 840 && M.BAND_NARROW_W === 480);
  /* the step beside the keys list (a computer's band): 840 only where the band holds it and the list, else 480 */
  const d = (bw, on, keys = true) => { try { return M.deskBlockW(bw, M.bandBlockW(on), keys); } catch (e) { return 'threw'; } };
  t('1 step: 840 on a 1440 band (V17\'s row) and on 1360 (840 and 260 a side)', d(1440, true) === 840 && d(1360, true) === 840 && d(1920, true) === 840);
  t('1 step: 480 on a 1280 x 800 laptop\'s 1226 band, a 1366 x 768\'s 1155, 1024, 1359 (never a width between)', [1226, 1155, 1024, 1359].every((bw) => d(bw, true) === 480));
  t('1 step: no keys list (a tablet, a narrow window): the switch\'s own width', d(1024, true, false) === 840 && d(768, true, false) === 840);
  t('1 step: ?v17wide=0\'s 480 the same at every band, with the list or without', [700, 1000, 1226, 1440, 2560].every((bw) => d(bw, false) === 480 && d(bw, false, false) === 480));
  return bad;
}
const WMOD = 'src/game/v17Wide.js';
const wSrc = read(WMOD);
const WM = await import(url(WMOD));
{
  const bad = behave(WM);
  check('1. the switch does what the card says (on 840; =0 480 remembered; =1 forgets; nothing else throws it)', bad.length === 0, bad.join('\n     '));
  const b2 = behave(await moduleOf(wSrc, 'src/game'));
  check('1. ...and the same from a copy (the plants below are read the same way)', b2.length === 0, b2.join('; '));
}

/* ── 2. the band's geometry: the same with the switch on and off ── */
const GMOD = 'src/ui/mobile/sheet/sheetGeometry.js';
const gSrc = read(GMOD);
const SIZES = [[390, 844], [375, 667], [320, 568], [360, 780], [414, 896], [430, 932], [844, 390], [667, 375], [932, 430], [768, 1024], [1024, 768], [1024, 1366], [1280, 800], [1440, 900], [1920, 1080], [2560, 1440]];
/* the one band on (as on every device: oneBand.js), the rest of the page absent */
globalThis.document = { documentElement: { classList: { contains: (c) => c === 'bt-one-band' } } };
async function geometryOf(src, stored) {
  globalThis.localStorage = mem(stored ? [['bt_v17wide', stored]] : []);
  try {
    const G = await moduleOf(src, path.dirname(GMOD));
    const out = { block: G.BAND_ASSEMBLY_MAX_W, at: {} };
    for (const [w, h] of SIZES) {
      const k = w + 'x' + h;
      const safe = (fn) => { try { return JSON.stringify(fn()); } catch (e) { return 'threw ' + e.message; } };
      out.at[k] = {
        bar: safe(() => G.barHeight(w, h)), id: safe(() => G.identityRowHeight(w, h)), cols: safe(() => G.columnsRowHeight(w)),
        open: safe(() => G.bandFootprint(w, h, false, false, 0)), folded: safe(() => G.bandFootprint(w, h, true, false, 0)), inset: safe(() => G.bandFootprint(w, h, false, false, 34)),
        layout: safe(() => G.oneBandLayout(w, G.barHeight(w, h))),
      };
    }
    return out;
  } finally { delete globalThis.localStorage; }
}
function sameGeometry(a, b) {
  const diff = [];
  for (const k of Object.keys(a.at)) for (const f of Object.keys(a.at[k])) if (a.at[k][f] !== b.at[k][f]) diff.push(`${k} ${f}: ${a.at[k][f]} against ${b.at[k][f]}`);
  return diff;
}
const gOn = await geometryOf(gSrc, null);
const gOff = await geometryOf(gSrc, '0');
check('2. the block is 840 with the switch on and 480 off (BAND_ASSEMBLY_MAX_W)', gOn.block === 840 && gOff.block === 480, `${gOn.block} / ${gOff.block}`);
const gDiff = sameGeometry(gOn, gOff);
check(`2. the band's height, the closed band, the world's box and the band's layout the same under both (${SIZES.length} sizes)`, gDiff.length === 0, gDiff.slice(0, 6).join('\n     '));
check('2. ...and the geometry answered at all (no size threw)', !Object.values(gOn.at).some((r) => Object.values(r).some((v) => /^threw/.test(v))), JSON.stringify(gOn.at['390x844']));
/* its tree: export const BAND_ASSEMBLY_MAX_W = bandBlockW(v17WideWanted()) */
function blockInit(src) {
  let init = null;
  B.traverse(parse(src), {
    VariableDeclarator(p) { if (p.node.id && p.node.id.name === 'BAND_ASSEMBLY_MAX_W') init = p.node.init; },
  });
  return !!init && init.type === 'CallExpression' && init.callee.name === 'bandBlockW' && init.arguments.length === 1
    && init.arguments[0].type === 'CallExpression' && init.arguments[0].callee.name === 'v17WideWanted' && init.arguments[0].arguments.length === 0;
}
check('2. BAND_ASSEMBLY_MAX_W is bandBlockW(v17WideWanted()) (the switch\'s one road, never a number of its own)', blockInit(gSrc));

/* ── 3. who imports the block's width ── */
function walk(dir, out = []) {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) walk(rel, out); else if (/\.(js|jsx|mjs)$/.test(e.name)) out.push(rel.split(path.sep).join('/'));
  }
  return out;
}
const SRC = walk('src');
/* every import of v17Wide.js, or of BAND_ASSEMBLY_MAX_W from sheetGeometry */
function importsOf(src) {
  const got = [];
  B.traverse(parse(src), {
    ImportDeclaration(p) {
      const from = p.node.source.value;
      if (/(^|\/)v17Wide(\.js)?$/.test(from)) got.push('v17Wide');
      if (/(^|\/)sheetGeometry(\.js)?$/.test(from) && p.node.specifiers.some((s) => s.imported && (s.imported.name === 'BAND_ASSEMBLY_MAX_W' || s.imported.name === 'bandBlockFor'))) got.push('BAND_ASSEMBLY_MAX_W');
      if (/(^|\/)sheetGeometry(\.js)?$/.test(from) && p.node.specifiers.some((s) => s.type === 'ImportNamespaceSpecifier')) got.push('sheetGeometry.*');
    },
  });
  return got;
}
/* the screen file that stamps --band-max-w (resize()), found by what it does in the ui system's files, never
   by its path: it may split (tests-by-system 2, lib/filesOf.mjs) */
const { readSystem } = await import('./lib/filesOf.mjs');
const STAMPERS = [...readSystem('ui')].filter(([f, src]) => /\.jsx$/.test(f) && src.includes("setProperty('--band-max-w'"));
check('3. one screen file stamps --band-max-w (found by the ui system\'s files)', STAMPERS.length === 1, STAMPERS.map(([f]) => f));
const [STAMPER, STAMPER_SRC] = STAMPERS[0] || [null, ''];
const KNOWN = {
  'src/ui/mobile/sheet/sheetGeometry.js': 'the rule\'s one reader',
  'src/ui/kit/UiKitPage.jsx': 'the kit\'s sample band (?uikit=1) draws a computer\'s block as the band does',
};
if (STAMPER) KNOWN[STAMPER] = 'resize() stamps --band-max-w for game.css';
const CAMERA = (f) => f === 'src/game/worldViewport.js' || f === 'src/game/viewCap.js' || f === 'src/ui/mobile/playViewport.js' || f.startsWith('src/rendering/');
function census(files, srcOf) {
  const strangers = [], camera = [];
  for (const f of files) {
    const s = srcOf(f);
    if (!/v17Wide|BAND_ASSEMBLY_MAX_W|bandBlockFor|sheetGeometry/.test(s)) continue;
    const got = importsOf(s).filter((g) => g !== 'sheetGeometry.*' || CAMERA(f));
    if (!got.length) continue;
    if (CAMERA(f)) camera.push(`${f}: ${got.join(', ')}`);
    else if (!KNOWN[f]) strangers.push(`${f}: ${got.join(', ')}`);
  }
  return { strangers, camera };
}
const srcRead = (f) => read(f);
{
  const c = census(SRC, srcRead);
  check('3. the camera and the world\'s view read nothing of the block (worldViewport, viewCap, playViewport, src/rendering/)', c.camera.length === 0, c.camera.join('\n     '));
  check(`3. the block's width is imported only by its known few (${Object.keys(KNOWN).length}: a new importer sizes something by it)`, c.strangers.length === 0, c.strangers.join('\n     '));
}

/* ── 4. the CSS: --band-max-w only places the block's edges ── */
function cssFiles(dir, out = []) {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) cssFiles(rel, out); else if (e.name.endsWith('.css')) out.push(rel.split(path.sep).join('/'));
  }
  return out;
}
/* each declaration (property: value) that reads the variable, comments out */
function cssReads(css) {
  const bare = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  const re = /([-a-zA-Z]+)\s*:\s*([^;{}]*var\(\s*--band-max-w[^;{}]*)/g;
  let m;
  while ((m = re.exec(bare))) out.push(m[1].toLowerCase());
  return out;
}
const PLACES = new Set(['max-width', 'left']);
const CSS = cssFiles('src');
function cssBad(srcOf) {
  const bad = [];
  for (const f of CSS) for (const p of cssReads(srcOf(f))) if (!PLACES.has(p)) bad.push(`${f}: ${p}`);
  return bad;
}
{
  const bad = cssBad(srcRead);
  const n = CSS.reduce((a, f) => a + cssReads(read(f)).length, 0);
  check(`4. every CSS read of --band-max-w places the block's edge (max-width, left), never a font, a picture, a transform or a zoom (${n} reads)`, bad.length === 0 && n >= 2, bad.join('\n     '));
}
function stamps(src) {
  let ok = false;
  B.traverse(parse(src), {
    CallExpression(p) {
      const n = p.node;
      if (n.callee.type !== 'MemberExpression' || !n.callee.property || n.callee.property.name !== 'setProperty') return;
      const [k, v] = n.arguments;
      if (k && k.type === 'StringLiteral' && k.value === '--band-max-w' && v && v.type === 'BinaryExpression' && v.left.type === 'CallExpression' && v.left.callee.name === 'bandBlockFor') ok = true;
    },
  });
  return ok;
}
check('4. the screen file stamps --band-max-w from bandBlockFor (the CSS reads the switch\'s number, stepped beside the keys list)', stamps(STAMPER_SRC));

/* ── 5. the dodges: each planted, each red ── */
async function plantSwitch(name, from, to) {
  if (wSrc.indexOf(from) < 0) { check('5 plant "' + name + '" finds its text', false, from); return; }
  const b = behave(await moduleOf(wSrc.split(from).join(to), 'src/game'));
  check('5 plant red: ' + name, b.length > 0);
}
await plantSwitch('the switch read backwards (the address)', "    return v === '1';\n", "    return v === '0';\n");
await plantSwitch('the switch read backwards (the memory)', "  try { return !(ls && ls.getItem(V17_WIDE_KEY) === '0'); }", "  try { return !!(ls && ls.getItem(V17_WIDE_KEY) === '0'); }");
await plantSwitch('?v17wide=0 not remembered', "if (v === '0') ls.setItem(V17_WIDE_KEY, '0'); else ls.removeItem(V17_WIDE_KEY);", 'void 0;');
await plantSwitch('the widths swapped', '  return on ? V17_WIDE_W : BAND_NARROW_W;', '  return on ? BAND_NARROW_W : V17_WIDE_W;');
await plantSwitch('a width between (the block slides to the band less the list)', '  return bandW - 2 * KEYS_SIDE >= blockW ? blockW : BAND_NARROW_W;', '  return Math.max(BAND_NARROW_W, Math.min(blockW, bandW - 2 * KEYS_SIDE));');
await plantSwitch('no step (the keys list squeezed beside 840)', '  return bandW - 2 * KEYS_SIDE >= blockW ? blockW : BAND_NARROW_W;', '  return blockW;');
await plantSwitch('480 made narrower on a short band (the list\'s room taken from ?v17wide=0 too)', '  if (!keys || blockW <= BAND_NARROW_W) return blockW;\n  return bandW - 2 * KEYS_SIDE >= blockW ? blockW : BAND_NARROW_W;', '  if (!keys) return blockW;\n  return bandW - 2 * KEYS_SIDE >= blockW ? blockW : Math.min(BAND_NARROW_W, bandW - 2 * KEYS_SIDE);');
await plantSwitch('always 840 (the off-ramp gone)', '  return on ? V17_WIDE_W : BAND_NARROW_W;', '  return V17_WIDE_W;');
async function plantGeometry(name, anchor, extra) {
  if (gSrc.indexOf(anchor) < 0) { check('5 plant "' + name + '" finds its text', false, anchor); return; }
  const planted = gSrc.split(anchor).join(anchor + '\n' + extra);
  const a = await geometryOf(planted, null), b = await geometryOf(planted, '0');
  check('5 plant red: ' + name, sameGeometry(a, b).length > 0);
}
await plantGeometry('the band made taller for the wide row', 'export function barHeight(vw, vh) {', '  if (BAND_ASSEMBLY_MAX_W > 480 && vw > 900) vh = vh + 120;');
await plantGeometry('the world given the block\'s width', 'export function bandFootprint(vw, vh, folded, sheetOpen, bottomInset) {', '  if (vw > 900) vw = Math.max(vw, BAND_ASSEMBLY_MAX_W * 1.5);');
check('5 plant red: the block written as a number of its own', !blockInit(gSrc.replace('bandBlockW(v17WideWanted())', '840')));
{
  const f = 'src/game/worldViewport.js';
  const planted = (g) => (g === f ? "import { BAND_ASSEMBLY_MAX_W } from '../ui/mobile/sheet/sheetGeometry.js';\n" + read(f) : read(g));
  check('5 plant red: the camera reading the block (worldViewport imports BAND_ASSEMBLY_MAX_W)', census(SRC, planted).camera.length > 0);
  const r = 'src/rendering/pixiRenderer.js';
  const planted2 = (g) => (g === r ? "import { v17WideWanted } from '../game/v17Wide.js';\n" + read(g) : read(g));
  check('5 plant red: a renderer reading the switch', census(SRC, planted2).camera.length > 0);
  const p = 'src/ui/mobile/sheet/BroCard.jsx';
  const planted3 = (g) => (g === p ? "import { BAND_ASSEMBLY_MAX_W } from './sheetGeometry.js';\nexport const TILE_FONT = BAND_ASSEMBLY_MAX_W / 40;\n" + read(g) : read(g));
  check('5 plant red: a page\'s words sized by the block (a new importer)', census(SRC, planted3).strangers.length > 0);
  const c = 'src/styles/game.css';
  const planted4 = (g) => (g === c ? read(g) + '\n.u2-tile-label{font-size:calc(var(--band-max-w) / 40)}\n' : read(g));
  check('5 plant red: a word sized by the block in CSS (font-size reads --band-max-w)', cssBad(planted4).length > 0);
  const planted5 = (g) => (g === c ? read(g) + '\n.u2-tile-art{width:calc(var(--band-max-w) / 8)}\n' : read(g));
  check('5 plant red: a picture sized by the block in CSS (width reads --band-max-w)', cssBad(planted5).length > 0);
}

try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* tmp */ }
delete globalThis.document;
console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
