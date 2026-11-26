/* ═══ v2.3.6742: THE SOUNDS ARE KEPT A YEAR, AND EVERY ADDRESS TO THEM CARRIES ITS FILE'S VERSION (card KEEP, PR 3) ═══
 *
 * The owner, 2026-11-26: "Keeping pictures a long time or indefinitely will
 * be a big boost how do I do that", and, told what it takes: "Yes do it".
 *
 * public/_headers keeps /sfx/* a year, `immutable`.  That is safe only while
 * EVERY request the game makes to /sfx carries its file's version (the first
 * 10 characters of the SHA-256 of its bytes: tools/assets/versions.mjs): a
 * changed sound is then a new address.  A bare request to a kept folder is a
 * sound a phone keeps for a year after it changed.  So this suite fails:
 *
 *   1. src/game/assetUrl.js giving a wrong address (the table's version; a
 *      hand `?v=` replaced; twice is once; another query, a '#', a file the
 *      table does not hold, '//host': as written; a space-named file);
 *   2. the build's table (keepVersions.mjs `load` of src/game/assetTable.js)
 *      not holding exactly the families of versions.mjs PAGE_FAMILIES, each
 *      at its bytes' version; the committed file not the empty table;
 *   3. A BARE /sfx LITERAL: a written-out address under /sfx the build
 *      cannot stamp (a space in it; a file the table does not hold; a query
 *      that is not one `v=`; one compared or derived somewhere, so stamped
 *      nowhere: stamp.mjs 'alike') and not handed to assetUrl;
 *   4. A BUILT /sfx ADDRESS THAT SKIPS assetUrl: '/sfx/..' + x, or a
 *      template `/sfx/${..}`, that is not the argument of assetUrl(...) or
 *      the address of BT_AUDIO.loadSample(key, url) (which calls it);
 *   5. the `_headers` block for /sfx/* PRESENT WHILE A BARE REQUEST EXISTS:
 *      the census (docs/plan/census/KEEP-requests.md, the browser's own list
 *      of a load and a tour: tools/qa/mp/mp-keepcensus.mjs) reads /sfx's hand
 *      + bare 0, and the block is the same text as /world/placed5/*'s.
 *
 * Each with its plant (a fixture that must go red), and the real code green.
 * The tree: @babel/parser (root or server/: what CI's suite has), JSX read
 * directly; a parser missing is a FAIL.  A later family (the card's PR 3
 * order) adds its row to FAMILIES and its prefix to PAGE_FAMILIES.
 *
 * v2.3.6743 (card KEEP PR 3b): the suite takes a FAMILY (FAMILIES: /sfx kept,
 * /icons not yet), and 3-5 run for each: a built address on a folder const
 * (`${POINTS_ART_DIR}x.png`) is built too; a hand `?v=` built onto one is
 * 'hand', two `v=` handed to assetUrl 'twice'; an address passed through
 * `a || b` or `c ? a : b` to the door is the door's.  LEFT lists the built
 * addresses other cards' files hold (it only falls), and 5 holds a family
 * not kept yet to NO block while its census reads hand or bare.
 *
 * v2.3.6744 (card KEEP PR 3c): /world/objects, kept.  A sheet is two files,
 * and Pixi (and png8Worker.js, which copies it) asks for a sheet's page at
 * the SHEET's query: so 6 holds the doors that give the page its own
 * version -- the page's worker asks at the address it is handed; the
 * objects' and the farm's sheet loads are handed their page (`texture`,
 * sheetPage.js), every Assets.load of a sheet in the family's files too; the
 * ground worker asks for the manifest at the version the page posts it
 * ({ type: 'objects' }); and every atlas of the manifest names its page as
 * its sheet does (the address the page builds is the file the sheet cuts).
 */
import { readFileSync, readdirSync, existsSync, mkdtempSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { ROOT, versionTable, pageTable, pageTableModule, PAGE_FAMILIES } from '../assets/versions.mjs';
import { stampValue, readAddress, topFolders, unstampable } from '../assets/stamp.mjs';
import { keepVersions } from '../assets/keepVersions.mjs';

/* ═══ v2.3.6743: A FAMILY A ROW (card KEEP PR 3b, the icons) ═══
   The suite takes a family: its folder (a `_headers` block and the census's
   row), its prefix, and whether it is KEPT yet.  A family's PR 3 adds its row
   with its loaders moved to assetUrl; `kept` turns true in the PR that adds
   its block, which may land only when the census reads its hand + bare 0.
   /icons is not kept yet: entityRenderer.js builds the three HUD bars'
   addresses with a hand key (HUD_BAR_VER), and that file is card LOAD
   part 2's (LEFT below): the block waits for it. */
const FAMILIES = [
  { folder: '/sfx', prefix: '/sfx/', kept: true },
  { folder: '/icons', prefix: '/icons/', kept: false },
  /* v2.3.6744 (PR 3c): the world's object sheets, their pages and manifest */
  { folder: '/world/objects', prefix: '/world/objects/', kept: true },
];
/* Built addresses another card's file holds, listed so the count can only
   fall: each names its file (by its name: tests-by-system reads suites by
   system), its line's text and who holds it.  A row whose address went
   (moved to assetUrl) FAILS until it is struck from here. */
export const LEFT = [
  { file: 'entityRenderer.js', value: '/icons/ui/bar-hp.webp?v=', holder: 'card LOAD part 2 (HUD_BAR_VER)' },
  { file: 'entityRenderer.js', value: '/icons/ui/bar-mp.webp?v=', holder: 'card LOAD part 2 (HUD_BAR_VER)' },
  { file: 'entityRenderer.js', value: '/icons/ui/bar-stam.webp?v=', holder: 'card LOAD part 2 (HUD_BAR_VER)' },
  /* not a request: weaponDiscIcon reads the file's NAME off it for a key
     (data-ricon w-*), and an address with its version would change the key */
  { file: 'controlSkin.jsx', value: '/icons/items/', holder: 'not a request (a key name)' },
  /* the item icons' hand key ITEMS_V, kept for three lines only: two server
     suites read their TEXT (a server file is not this card's: a change there
     deploys the worker) */
  { file: 'InventoryPanel.jsx', value: '/icons/items/bow.webp', why: 'built', holder: 'server/test/owner-icons.test.mjs 8g reads the line' },
  { file: 'InventoryPanel.jsx', value: '/icons/items/', why: 'built', holder: 'server/test/bag-icons.test.mjs 5c reads the line' },
  { file: 'ItemDetailPopup.jsx', value: '/icons/items/bow.webp', why: 'built', holder: 'server/test/owner-icons.test.mjs 8g reads the line' },
  /* v2.3.6744: two that came with main (eb90c6fd) after PR 3b, in the menu
     sessions' files (CLAUDE: never side by side): /icons is not kept yet,
     so they ask a day-old picture at worst, never a year-old one */
  { file: 'UiKitPage.jsx', value: '/icons/items/', why: 'built', holder: 'the menu sessions (src/ui/kit/): the kit\'s fixture, v2.3.6688' },
  { file: 'GearPanels.jsx', value: '/icons/bag/equip-', why: 'hand', holder: 'the menu sessions (src/ui/mobile/): the empty slot\'s ghost, ?v=2.3.4199' },
];

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600)));
};

/* ---- the parser ------------------------------------------------------------ */
let babel = null;
for (const pkg of ['package.json', 'server/package.json']) {
  if (babel) break;
  try { babel = createRequire(join(ROOT, pkg))('@babel/parser'); } catch { /* not here */ }
}
check('0: @babel/parser loads (root or server/)', !!babel, 'npm install in the root or in server/');
if (!babel) process.exit(1);
const parse = (code) => babel.parse(code, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true });

const table = versionTable();
const folders = topFolders(table);
const versionOf = (a) => table.get(a) || null;

/* ---- 1. assetUrl, with a generated table beside it ------------------------- */
{
  const dir = mkdtempSync(join(tmpdir(), 'keep-sfx-'));
  try {
    copyFileSync(join(ROOT, 'src', 'game', 'assetUrl.js'), join(dir, 'assetUrl.js'));
    writeFileSync(join(dir, 'assetTable.js'), pageTableModule(pageTable(table)));
    writeFileSync(join(dir, 'package.json'), '{"type":"module"}');
    const { assetUrl } = await import(pathToFileURL(join(dir, 'assetUrl.js')).href);
    const chime = versionOf('/sfx/ui/chime.mp3');
    const death = versionOf('/sfx/monster/Monster death-bony.mp3');
    const cases = [
      ['/sfx/ui/chime.mp3', `/sfx/ui/chime.mp3?v=${chime}`],
      ['/sfx/ui/chime.mp3?v=2', `/sfx/ui/chime.mp3?v=${chime}`],
      [`/sfx/ui/chime.mp3?v=${chime}`, `/sfx/ui/chime.mp3?v=${chime}`],
      ['/sfx/ui/chime.mp3?v=2?v=3', '/sfx/ui/chime.mp3?v=2?v=3'],
      ['/sfx/ui/chime.mp3?a=1', '/sfx/ui/chime.mp3?a=1'],
      ['/sfx/ui/chime.mp3#t', '/sfx/ui/chime.mp3#t'],
      ['/sfx/ui/not-a-file.mp3', '/sfx/ui/not-a-file.mp3'],
      ['//sfx/ui/chime.mp3', '//sfx/ui/chime.mp3'],
      ['/__proto__', '/__proto__'],
      ['/sfx/monster/Monster%20death-bony.mp3', `/sfx/monster/Monster%20death-bony.mp3?v=${death}`],
      ['/sfx/monster/Monster death-bony.mp3', `/sfx/monster/Monster death-bony.mp3?v=${death}`],
      ['/ui/cursor.png', '/ui/cursor.png'],      /* not a family of the page's table: the build's */
    ];
    const bad = cases.filter(([i, o]) => assetUrl(i) !== o).map(([i, o]) => [i, assetUrl(i), o]);
    check('1: assetUrl gives the table\'s version, replaces a hand v=, is idempotent, leaves the rest as written', !!chime && !!death && bad.length === 0, bad);
    check('1b: assetUrl of a non-string is itself', assetUrl(null) === null && assetUrl(undefined) === undefined);
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
{
  /* the committed table is the empty one (node, npm run dev): every address as written */
  const { assetUrl } = await import(pathToFileURL(join(ROOT, 'src', 'game', 'assetUrl.js')).href);
  check('1c: with the committed (empty) table, assetUrl returns every address as written', assetUrl('/sfx/ui/chime.mp3') === '/sfx/ui/chime.mp3');
}

/* ---- 2. the build's table ----------------------------------------------------- */
{
  const plugins = keepVersions({ on: true });
  const tp = plugins.find((p) => p.name === 'keep-versions-table');
  const file = join(ROOT, 'src', 'game', 'assetTable.js');
  const out = tp && tp.load(file);
  const other = tp && tp.load(join(ROOT, 'src', 'game', 'assetUrl.js'));
  const rows = [];
  if (out) for (const m of out.code.matchAll(/^("[^"\n]+"):("[0-9a-f]{10}")/gm)) rows.push([JSON.parse(m[1]), JSON.parse(m[2])]);
  const want = [...table.keys()].filter((a) => PAGE_FAMILIES.some((p) => a.startsWith(p)));
  const wrong = rows.filter(([a, v]) => createHash('sha256').update(readFileSync(join(ROOT, 'public', a))).digest('hex').slice(0, 10) !== v);
  check(`2: the build writes the page's table: every file of ${PAGE_FAMILIES.join(', ')} (${want.length}), each at its bytes' version, and nothing else`,
    !!out && other === null && rows.length === want.length && rows.every(([a]) => PAGE_FAMILIES.some((p) => a.startsWith(p))) && wrong.length === 0,
    { rows: rows.length, want: want.length, wrong: wrong.slice(0, 5) });
  check('2b: the page\'s table is small (under 0.3 MB of script: the card\'s line)', !!out && Buffer.byteLength(out.code) < 0.3 * 1024 * 1024, out && Buffer.byteLength(out.code));
  check('2c: PAGE_FAMILIES holds every family this suite keeps', FAMILIES.every((f) => PAGE_FAMILIES.includes(f.prefix)), PAGE_FAMILIES);
  const committed = readFileSync(file, 'utf8');
  check('2d: the committed src/game/assetTable.js is the empty table (the build writes the real one)', /export default Object\.freeze\(Object\.create\(null\)\);\s*$/.test(committed) && !/"\/sfx\//.test(committed));
}

/* ---- 3 and 4: the source's /sfx strings --------------------------------------- */
const stringOf = (n) => {
  if (!n) return null;
  if (n.type === 'StringLiteral' || (n.type === 'Literal' && typeof n.value === 'string')) return n.value;
  if (n.type === 'TemplateLiteral' && n.expressions.length === 0) return n.quasis.map((q) => q.value.cooked).join('');
  return null;
};
const calleeName = (c) => (c.type === 'Identifier' ? c.name : c.type === 'MemberExpression' && !c.computed && c.property ? c.property.name : null);
/* the address the outermost '+' or template around `node` builds */
function builtTop(path) {
  let i = path.length - 1;
  let top = path[i];
  if (top.type === 'TemplateLiteral' && top.expressions.length) { /* it is built itself */ }
  while (i > 0 && path[i - 1].type === 'BinaryExpression' && path[i - 1].operator === '+') { i--; top = path[i]; }
  return { top, i };
}
/* the doors: assetUrl(address), and BT_AUDIO.loadSample(key, address), which
   calls it.  v2.3.6743: an address handed through `a || b` or `c ? a : b` (or
   parentheses) to a door is the door's too. */
function wrapped(path, i) {
  let node = path[i], k = i - 1;
  while (k >= 0 && (path[k].type === 'LogicalExpression' || path[k].type === 'ParenthesizedExpression'
    || (path[k].type === 'ConditionalExpression' && path[k].test !== node))) { node = path[k]; k--; }
  const parent = path[k];
  if (!parent || parent.type !== 'CallExpression') return false;
  const name = calleeName(parent.callee);
  return (name === 'assetUrl' && parent.arguments[0] === node) || (name === 'loadSample' && parent.arguments[1] === node);
}
/* v2.3.6743: a const bound to a family's folder ('/icons/ui/points/'), in
   the file or imported from a file of src/: an address built on it is built
   on that folder (`${POINTS_ART_DIR}gold-1.png?v=${POINTS_ART_V}`). */
const constCache = new Map();
function constsOf(file, code, starts) {
  const ast = parse(code);
  const own = new Map(), imported = new Map();
  for (const st of (ast.program || ast).body) {
    const decl = st.type === 'ExportNamedDeclaration' ? st.declaration : st;
    if (decl && decl.type === 'VariableDeclaration' && decl.kind === 'const') {
      for (const d of decl.declarations) {
        const v = d.id && d.id.type === 'Identifier' ? stringOf(d.init) : null;
        if (starts(v)) own.set(d.id.name, v);
      }
    }
    if (st.type === 'ImportDeclaration' && file && typeof st.source.value === 'string') {
      const src = st.source.value;
      const to = src.startsWith('@/') ? join(ROOT, 'src', src.slice(2)) : src.startsWith('.') ? join(file, '..', src) : null;
      if (!to || !existsSync(to)) continue;
      for (const sp of st.specifiers) if (sp.type === 'ImportSpecifier') imported.set(sp.local.name, [to, sp.imported.name || sp.imported.value]);
    }
  }
  /* local consts inside functions too (HeroExpanded's BADGE) */
  (function walkInner(n) {
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'VariableDeclaration' && n.kind === 'const') for (const d of n.declarations) {
      const v = d.id && d.id.type === 'Identifier' ? stringOf(d.init) : null;
      if (starts(v) && !own.has(d.id.name)) own.set(d.id.name, v);
    }
    for (const k of Object.keys(n)) {
      if (k === 'loc') continue;
      const v = n[k];
      if (Array.isArray(v)) v.forEach(walkInner); else if (v && typeof v.type === 'string') walkInner(v);
    }
  })(ast.program || ast);
  for (const [local, [to, name]] of imported) {
    if (!constCache.has(to)) { constCache.set(to, null); constCache.set(to, constsOf(null, readFileSync(to, 'utf8'), starts).own); }
    const v = constCache.get(to) && constCache.get(to).get(name);
    if (v) own.set(local, v);
  }
  return { own };
}
/** Every /sfx address in `code` that would reach the page without its
 *  version: [{ line, why, value }] */
export function holes(code, alike, prefixes = FAMILIES.map((f) => f.prefix), file = null) {
  const ast = parse(code);
  const found = [];
  const starts = (s) => typeof s === 'string' && prefixes.some((p) => s.startsWith(p));
  const named = constsOf(file, code, starts).own;
  /* the text of a built address's written parts (its hand key, if any, is in them) */
  const partsOf = (n) => n.type === 'TemplateLiteral' ? n.quasis.map((q) => q.value.cooked).join('\u0000')
    : n.type === 'BinaryExpression' ? partsOf(n.left) + '\u0000' + partsOf(n.right) : (stringOf(n) || '');
  (function walk(node, path) {
    if (!node || typeof node.type !== 'string') return;
    path.push(node);
    const parent = path[path.length - 2];
    let s = stringOf(node);
    const isTpl = node.type === 'TemplateLiteral' && node.expressions.length > 0;
    if (isTpl) s = node.quasis[0].value.cooked;
    /* `${DIR}x.png` and DIR + 'x.png', DIR a const on the folder */
    if (isTpl && s === '' && node.expressions[0].type === 'Identifier' && named.has(node.expressions[0].name)) s = named.get(node.expressions[0].name);
    const namedRef = node.type === 'Identifier' && named.has(node.name) && parent && parent.type === 'BinaryExpression' && parent.operator === '+' && parent.left === node;
    if (namedRef) s = named.get(node.name);
    const skip = parent && ((parent.type === 'ObjectProperty' || parent.type === 'Property') && parent.key === node && !parent.computed
      || parent.type === 'ImportDeclaration' || parent.type === 'ExportNamedDeclaration' || parent.type === 'ExportAllDeclaration');
    if (starts(s) && !skip) {
      const { top, i } = builtTop(path);
      const built = isTpl || top !== node;
      const line = node.loc ? node.loc.start.line : 0;
      /* v2.3.6743: a hand key built in ('x.webp?v=' + K, `x.webp${V}` where V is
         '?v=..', or '?v=1?v=2' handed to the door): two `v=` once the table's
         is added, or a key kept by hand */
      const text = built ? partsOf(top) : s;
      const vs = (text.match(/[?&]v=/g) || []).length;
      if (wrapped(path, built ? i : path.length - 1)) {
        if (vs > 1) found.push({ line, why: 'twice', value: s });
      }
      else if (namedRef && !built) { /* DIR alone, no address */ }
      else if (built) found.push({ line, why: vs ? 'hand' : 'built', value: s });
      else {
        const r = stampValue(s, versionOf, folders, alike);
        if (r && r.left) found.push({ line, why: r.left, value: s });
        else if (!r && !readAddress(s) && /^\/[^/]+\/\S.*\.[A-Za-z0-9]{2,5}(?:\?.*)?$/s.test(s)) found.push({ line, why: 'unreadable', value: s });
      }
    }
    for (const k of Object.keys(node)) {
      if (k === 'loc' || k === 'start' || k === 'end' || k === 'extra' || k === 'leadingComments' || k === 'trailingComments' || k === 'innerComments') continue;
      const v = node[k];
      if (Array.isArray(v)) for (const c of v) walk(c, path);
      else if (v && typeof v.type === 'string') walk(v, path);
    }
    path.pop();
  })(ast.program || ast, []);
  return found;
}
const alikeOf = (code) => unstampable(code, parse(code), versionOf, folders);

{
  const P = (code, extraAlike = '') => holes(code, new Set([...alikeOf(code), ...(extraAlike ? alikeOf(extraAlike) : [])]));
  const plants = [
    ['3a: a bare literal with a space in it (the build cannot read it whole)', "const u = '/sfx/monster/Monster death-bony.mp3';", 'unreadable'],
    ['3b: a literal naming no file of the table', "const u = '/sfx/ui/not-a-file.mp3';", 'no-file'],
    ['3c: a literal whose query is not one v=', "const u = '/sfx/ui/chime.mp3?a=1';", 'query'],
    ['3d: a literal compared somewhere (stamped nowhere)', "const u = '/sfx/ui/chime.mp3'; if (x === '/sfx/ui/chime.mp3') y();", 'alike'],
    ['4a: a built address (+)', "B.play('/sfx/ui/' + n + '.mp3');", 'built'],
    ['4b: a built address (a template)', 'fetch(`/sfx/${g}/${n}.mp3`);', 'built'],
    ['4c: a built address held in a variable first', "const base = '/sfx/voice/' + who; B.loadSample(k, base);", 'built'],
    /* v2.3.6743: the icons' */
    ['3e: a bare /icons literal (a space: the build cannot read it whole)', "const u = '/icons/items/fish trout.webp';", 'unreadable'],
    ['3f: an /icons literal compared somewhere (stamped nowhere)', "const u = '/icons/items/bow.webp'; if (x === '/icons/items/bow.webp') y();", 'alike'],
    ['4d: a built /icons address that skips assetUrl', "img.src = '/icons/items/' + k + '.webp';", 'built'],
    ['4e: a built /icons address on a folder const', "const DIR = '/icons/ui/points/'; const u = `${DIR}gold-${d}.png`;", 'built'],
    ['4f: a hand ?v= built onto an /icons address', "const u = '/icons/items/' + k + '.webp?v=' + ICON_V;", 'hand'],
    ['4g: a hand ?v= in a template on an /icons address', "const u = `/icons/shards/${k}.webp?v=2.3.4222`;", 'hand'],
    ['4h: two v= handed to assetUrl', "const u = assetUrl('/icons/items/' + k + '.webp?v=2?v=' + K);", 'twice'],
    /* v2.3.6744: the objects' */
    ['3g: a /world/objects literal naming no file of the table', "const u = '/world/objects/not-a-sheet.json';", 'no-file'],
    ['4i: a built /world/objects sheet on its folder const, no assetUrl', "const BASE = '/world/objects/'; const u = BASE + a.sheet;", 'built'],
    ['4j: the farm\'s copy built with its own query, no assetUrl', "const u = '/world/objects/' + a + '.json?farm=1';", 'built'],
    ['4k: the manifest at a fresh address built in src/', "fetch('/world/objects/manifest.json?t=' + Date.now());", 'built'],
  ];
  for (const [name, code, why] of plants) {
    const h = P(code);
    check(`${name} -> red (${why})`, h.some((x) => x.why === why), h);
  }
  const clean = [
    "const u = '/sfx/ui/chime.mp3';",
    "const u = '/sfx/ui/chime.mp3?v=2';",
    "const u = '/sfx/monster/Monster%20death-bony.mp3';",
    "const u = assetUrl('/sfx/ui/' + n + '.mp3');",
    'const u = assetUrl(`/sfx/${g}/${n}.mp3`);',
    "B.loadSample(k, '/sfx/ui/' + n + '.mp3');",
    "const u = assetUrl('/sfx/monster/Monster death-bony.mp3');",
    "// '/sfx/x y.mp3' + n\nconst t = 'Plays /sfx/ui/chime.mp3 now';",
    "if (url.startsWith('/sfx/')) y();",
    "const M = { '/sfx/ui/chime.mp3': 1 };",
    "const u = assetUrl(cond ? '/icons/items/' + k + '.webp' : null);",
    "const u = assetUrl(SRC[k] || ('/icons/popups/' + k + '.webp'));",
    "const u = assetUrl('/icons/achievements/' + id + '.webp?v=' + K);",
    "const DIR = '/icons/ui/points/'; const u = assetUrl(`${DIR}gold-${d}.png?v=${V}`); const d2 = DIR;",
    "const u = '/icons/items/bow.webp?v=2.3.4222';",
    "const BASE = '/world/objects/'; const s = assetUrl(BASE + a.sheet); const i = assetUrl(BASE + (a.image || a.sheet.replace(/\\.json$/, '.png')));",
    "const OBJ_BASE = '/world/objects/'; const u = farmCopy(assetUrl(OBJ_BASE + a + '.json'));",
    "w.postMessage({ type: 'objects', manifest: assetUrl('/world/objects/manifest.json') });",
  ];
  const noisy = clean.map((c) => [c, P(c)]).filter(([, h]) => h.length);
  check('3-4 clean: a stamped literal, assetUrl or loadSample around a built one, a comment, a sentence, a prefix test, a key: none flagged', noisy.length === 0, noisy);
}

/* ---- the real source ----------------------------------------------------------- */
const files = [];
(function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules') continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (/\.(?:js|jsx|mjs)$/.test(e.name)) files.push(full);
  }
})(join(ROOT, 'src'));
const texts = new Map();
const allText = new Map(files.map((f) => [f, readFileSync(f, 'utf8')]));
for (const [f, t] of allText) if (FAMILIES.some((x) => t.includes(x.prefix))) texts.set(f, t);
/* v2.3.6743: and a file that imports a folder const of one of them
   (xpBarArt.js's POINTS_ART_DIR, from data/pointsHeadArt.js) */
const exportedDirs = new Set();
for (const t of texts.values()) for (const m of t.matchAll(/export const ([A-Za-z_$][\w$]*) = ['`](\/[^'`]*\/)['`]/g)) {
  if (FAMILIES.some((x) => m[2].startsWith(x.prefix))) exportedDirs.add(m[1]);
}
for (const [f, t] of allText) if (!texts.has(f) && [...exportedDirs].some((n) => new RegExp('\\b' + n + '\\b').test(t))) texts.set(f, t);
const alike = new Set();
for (const t of texts.values()) for (const a of alikeOf(t)) alike.add(a);
const real = [];
for (const [f, t] of texts) for (const h of holes(t, alike, undefined, f)) real.push({ file: relative(ROOT, f).split(sep).join('/'), ...h });
const leftIs = (l, h) => (h.file === l.file || h.file.endsWith('/' + l.file)) && l.value === h.value && (!l.why || l.why === h.why);
const isLeft = (h) => LEFT.some((l) => leftIs(l, h));
const open_ = real.filter((h) => !isLeft(h));
if (process.env.KEEP_HOLES) for (const h of open_) console.log('hole', h.file + ':' + h.line, h.why, h.value);   /* the whole list, for the session moving a family */
const stale = LEFT.filter((l) => !real.some((h) => leftIs(l, h)));
check(`3-4 real: every ${FAMILIES.map((x) => x.folder).join(' and ')} address in src/ (${texts.size} files) reaches the page with its version, but the ${LEFT.length} LEFT rows`, open_.length === 0, open_);
check('3-4 LEFT only falls: every row still names a built address in its file (strike a row once its address moved)', stale.length === 0, stale);
{
  /* the break proof on the real code: the space put back in the death cut */
  const gd = join(ROOT, 'src', 'data', 'gameDisplay.js');
  const t = texts.get(gd) || '';
  const back = t.replace("'/sfx/monster/Monster%20death-bony.mp3'", "'/sfx/monster/Monster death-bony.mp3'");
  check('3 break proof: gameDisplay.js with the space put back in Monster death-bony.mp3 -> red', back !== t && holes(back, alike).some((h) => h.why === 'unreadable'));
  const door = /BT_AUDIO\.loadSample = function \(key, url\) \{[\s\S]{0,2000}?var tag = \(url = assetUrl\(url\)\) \+/;
  check('4 door: BT_AUDIO.loadSample gives a built address its version before its tag and its fetch (var tag = (url = assetUrl(url)) + ...)',
    door.test(t) && !door.test(t.replace('(url = assetUrl(url))', 'url')));
}

{
  /* v2.3.6743: the icons' break proofs on the real code: the bag's cape icon
     built again without assetUrl, and the shard icon's hand key put back in
     its own file; and the 256-colour twins' door (p256.js p256Twin) */
  const inv = join(ROOT, 'src', 'ui', 'mobile', 'dash', 'InventoryPanel.jsx');
  const t = allText.get(inv) || '';
  const cape = "return assetUrl(`/icons/items/${k.replace('cape_', 'cape-')}.webp`);";
  const back = t.replace(cape, "return `/icons/items/${k.replace('cape_', 'cape-')}.webp`;");
  check('4 break proof (icons): InventoryPanel.jsx\'s cape icon built without assetUrl -> red', t.includes(cape) && holes(back, alike, undefined, inv).some((h) => h.why === 'built' && h.value === '/icons/items/'));
  const sh = join(ROOT, 'src', 'data', 'shards.js');
  const st = allText.get(sh) || '';
  const shard = 'assetUrl(`/icons/shards/${shardKey}.webp`)';
  check('4 break proof (icons): shards.js\'s icon with its hand key back and no assetUrl -> red (hand)',
    st.includes(shard) && holes(st.replace(shard, '`/icons/shards/${shardKey}.webp?v=2.3.4222`'), alike, undefined, sh).some((h) => h.why === 'hand'));
  const p = readFileSync(join(ROOT, 'src', 'rendering', 'p256.js'), 'utf8');
  const door = /if \(e\.twin\.startsWith\('\/icons\/'\)\) \{\s*const own = assetUrl\(e\.twin\.split\('\?'\)\[0\]\);/;
  check('4 door (icons): p256Twin asks for an /icons twin at its own version (assetUrl), not its original\'s query joined on', door.test(p) && !door.test(p.replace("assetUrl(e.twin.split('?')[0])", "e.twin.split('?')[0]")));
}

/* ---- 6. the objects' sheets: each page at its OWN version (v2.3.6744) ---------- */
{
  const rd = (r) => readFileSync(join(ROOT, r), 'utf8');
  const pw = rd('src/rendering/png8Worker.js');
  const pwDoor = 'const image = ownPage ? new URL(ownPage, jr.url).href : imageUrlOf(m.url, data.meta.image);';
  const pwKeep = "if (m.pageOf != null && typeof m.image === 'string') { _pageAt.set(m.pageOf, m.image); return; }";
  check('6a door: png8Worker.js asks for a sheet\'s page at the address it is handed ({ pageOf, image }), not the sheet\'s query copied on',
    pw.includes(pwDoor) && pw.includes(pwKeep) && !pw.replace(pwDoor, 'const image = imageUrlOf(m.url, data.meta.image);').includes(pwDoor));
  const wo = rd('src/rendering/wheelObjects.js');
  const woPost = 'if (image) w.postMessage({ pageOf: id, image });   /* v2.3.6744: first, the page\'s own address (png8Worker.js) */\n      w.postMessage({ id, url, bases: _basesWay() });';
  const woImages = "images: man.atlases.map((a) => assetUrl(BASE + (a.image || a.sheet.replace(/\\.json$/, '.png'))))";
  check('6b door: wheelObjects.js builds each page\'s own address (assetUrl) and hands it to the worker that reads it',
    wo.includes(woPost) && wo.includes(woImages) && wo.includes('loadPalettePage(url, image)'), { post: wo.includes(woPost), images: wo.includes(woImages) });
  /* every Assets.load of a sheet (an object with a cachePrefix) in the family's files is handed its page */
  const sheetLoads = (code) => {
    const bad = [];
    (function walk(n) {
      if (!n || typeof n.type !== 'string') return;
      if (n.type === 'CallExpression' && n.callee.type === 'MemberExpression' && n.callee.object.name === 'Assets' && calleeName(n.callee) === 'load'
        && n.arguments[0] && n.arguments[0].type === 'ObjectExpression') {
        const data = n.arguments[0].properties.find((q) => q.key && (q.key.name || q.key.value) === 'data');
        const keys = data && data.value.type === 'ObjectExpression' ? data.value.properties.map((q) => q.key && (q.key.name || q.key.value)) : [];
        if (keys.includes('cachePrefix') && !keys.includes('texture')) bad.push(n.loc ? n.loc.start.line : 0);
      }
      for (const k of Object.keys(n)) {
        if (k === 'loc') continue;
        const v = n[k];
        if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v.type === 'string') walk(v);
      }
    })(parse(code).program);
    return bad;
  };
  const fw = rd('src/rendering/farmWorld.js');
  /* the break proofs on the real code: a sheet's address, and the farm's, built again without assetUrl */
  const woF = join(ROOT, 'src', 'rendering', 'wheelObjects.js'), fwF = join(ROOT, 'src', 'rendering', 'farmWorld.js');
  check('6 break proof: wheelObjects.js\'s sheet built without assetUrl -> red (built)', wo.includes('assetUrl(BASE + a.sheet)')
    && holes(wo.replace('assetUrl(BASE + a.sheet)', 'BASE + a.sheet'), alike, undefined, woF).some((h) => h.why === 'built' && h.value === '/world/objects/'));
  check('6 break proof: farmWorld.js\'s page built without assetUrl -> red (built)', fw.includes("farmCopy(assetUrl(OBJ_BASE + a + '.png'))")
    && holes(fw.replace("farmCopy(assetUrl(OBJ_BASE + a + '.png'))", "farmCopy(OBJ_BASE + a + '.png')"), alike, undefined, fwF).some((h) => h.why === 'built'));
  const fam = [...texts].filter(([, t]) => t.includes('/world/objects/'));
  const unhanded = fam.map(([f, t]) => [relative(ROOT, f), sheetLoads(t)]).filter(([, b]) => b.length);
  check(`6c: every Assets.load of a sheet in the /world/objects files (${fam.length}) is handed its page (data.texture: sheetPage.js)`, fam.length >= 3 && unhanded.length === 0, unhanded);
  check('6c plant: wheelObjects.js\'s page load without its texture -> red',
    sheetLoads(wo.replace('data: { cachePrefix: CACHE_PREFIX, texture }', 'data: { cachePrefix: CACHE_PREFIX }')).length === 1);
  check('6c plant: farmWorld.js\'s sheet load without its texture -> red',
    sheetLoads(fw.replace('data: { cachePrefix: OBJ_PREFIX, texture }', 'data: { cachePrefix: OBJ_PREFIX }')).length === 1);
  const farmPage = "page = farmCopy(assetUrl(OBJ_BASE + a + '.png'))";
  check('6d door: the farm\'s copy asks for each page at its own version (farmCopy(assetUrl(...)))', fw.includes(farmPage) && fw.includes("const farmCopy = (u) => u + (u.indexOf('?') >= 0 ? '&' : '?') + 'farm=1';"));
  const wt = rd('src/game/wheelTrial.js');
  const post = "w.postMessage({ type: 'objects', manifest: assetUrl('/world/objects/manifest.json') });\n      w.postMessage({ type: 'init',";
  check('6e door: wheelTrial.js posts the objects\' manifest at its version (assetUrl) just before init', wt.includes(post));
  const gw = rd('public/tools/world/core/ground-worker.js');
  const gwDoor = /if \(m\.type === 'objects'\) \{ objectsAt = keptManifest\(m\.manifest\); return null; \}\s*[^\n]*\n\s*if \(m\.type === 'init'\)/;
  const gwAsk = 'const man = objectsAt ? await startFetch(objectsAt, jsonOrNull)';
  check('6f door: the ground worker keeps the manifest\'s address the page posts (before init) and asks for it there',
    gwDoor.test(gw) && gw.includes(gwAsk) && !gwDoor.test(gw.replace("objectsAt = keptManifest(m.manifest)", 'objectsAt = null')));
  /* the form it keeps: one exact address, the version's 10 hex; anything else asks fresh */
  const km = /const KEPT_MANIFEST = (\/.*\/);/.exec(gw);
  const KM = km ? eval(km[1]) : null;
  const mv = versionOf('/world/objects/manifest.json');
  check('6g: the worker keeps only /world/objects/manifest.json?v=<10 hex> (a bare one, another query, another file: a fresh address)',
    !!KM && !!mv && KM.test('/world/objects/manifest.json?v=' + mv) && !KM.test('/world/objects/manifest.json') && !KM.test('/world/objects/manifest.json?v=2')
      && !KM.test('/world/objects/manifest.json?t=1') && !KM.test('/world/ground/manifest.json?v=' + mv) && !KM.test('//x/world/objects/manifest.json?v=' + mv));
  /* every atlas names its page as its sheet does (the page the loader builds is the one the sheet cuts) */
  const pageFaults = (man, sheetOf) => (man.atlases || []).filter((a) => {
    const j = sheetOf(a.sheet);
    return !a.image || a.image !== a.sheet.replace(/\.json$/, '.png') || !j || !j.meta || j.meta.image !== a.image;
  }).map((a) => a.name);
  const objDir = join(ROOT, 'public', 'world', 'objects');
  const man = JSON.parse(readFileSync(join(objDir, 'manifest.json'), 'utf8'));
  const sheetOf = (f) => { try { return JSON.parse(readFileSync(join(objDir, f), 'utf8')); } catch { return null; } };
  const pf = pageFaults(man, sheetOf);
  check(`6h: every atlas of the objects' manifest (${(man.atlases || []).length}) names its page as its sheet does (x.json cuts x.png)`, (man.atlases || []).length > 0 && pf.length === 0, pf);
  check('6h plant: a sheet whose page is another file -> red',
    pageFaults(man, (f) => { const j = sheetOf(f); return f === man.atlases[0].sheet ? { ...j, meta: { ...j.meta, image: 'other.png' } } : j; }).length === 1);
}

/* ---- 5. _headers and the census ---------------------------------------------- */
function blocks(text) {
  const out = new Map();
  let cur = null;
  for (const line of text.split('\n')) {
    if (/^\S/.test(line) && !line.startsWith('#')) { cur = line.trim(); out.set(cur, []); }
    else if (cur && /^\s+\S/.test(line)) out.get(cur).push(line.trim());
    else if (!line.trim()) cur = null;
  }
  return out;
}
function censusRow(text, folder) {
  const m = new RegExp('^\\| `' + folder.replace(/[/]/g, '\\/') + '` \\| (\\d+) \\| (\\d+) \\| (\\d+) \\| (\\d+) \\| (\\d+) \\|', 'm').exec(text);
  return m ? { requests: +m[1], files: +m[2], table: +m[3], hand: +m[4], bare: +m[5] } : null;
}
/** the faults of a `_headers` text against a census text, for one folder */
export function keepFaults(headers, census, folder) {
  const b = blocks(headers);
  const mine = b.get(folder + '/*');
  if (!mine) return [];
  const faults = [];
  const like = b.get('/world/placed5/*');
  if (!like || JSON.stringify(like) !== JSON.stringify(mine)) faults.push(`${folder}/* is not /world/placed5/*'s text`);
  const row = censusRow(census, folder);
  if (!row) faults.push(`the census has no row for ${folder}`);
  else if (row.hand + row.bare !== 0) faults.push(`${folder} is kept a year while the census reads ${row.hand} hand and ${row.bare} bare requests to it`);
  return faults;
}
{
  const headers = readFileSync(join(ROOT, 'public', '_headers'), 'utf8');
  const censusFile = join(ROOT, 'docs', 'plan', 'census', 'KEEP-requests.md');
  const census = existsSync(censusFile) ? readFileSync(censusFile, 'utf8') : '';
  for (const f of FAMILIES) {
    const has = blocks(headers).has(f.folder + '/*');
    const row = censusRow(census, f.folder);
    if (f.kept) check(`5: public/_headers keeps ${f.folder}/* a year`, has);
    /* v2.3.6743: a family not kept yet has no block (rule 2: its census first) */
    else check(`5: ${f.folder}/* is not kept yet (no block) while the census reads ${row ? row.hand + ' hand, ' + row.bare + ' bare' : 'no row'}`,
      !has || (row && row.hand + row.bare === 0), row);
    const faults = keepFaults(headers, census, f.folder);
    check(`5: ${f.folder}/*, where present, is /world/placed5/*'s text, and the census reads 0 hand and 0 bare for it`, faults.length === 0, faults);
    /* the plants run on the sounds' block, the one kept: the same text a family */
    const kept = FAMILIES.find((x) => x.kept);
    const like = headers.replace(kept.folder + '/*', f.folder + '/*');
    const withBlock = has ? headers : like;
    const clean = '| `' + f.folder + '` | 96 | 96 | 95 | 0 | 0 | yes |';
    const plantBare = clean.replace('| 95 | 0 | 0 |', '| 95 | 0 | 1 |');
    const plantHand = clean.replace('| 95 | 0 | 0 |', '| 95 | 1 | 0 |');
    check(`5 plant (${f.folder}): the block present while the census reads 1 bare -> red`, keepFaults(withBlock, plantBare, f.folder).length > 0);
    check(`5 plant (${f.folder}): the block present while the census reads 1 by hand -> red`, keepFaults(withBlock, plantHand, f.folder).length > 0);
    check(`5 plant (${f.folder}): the census reads 1 bare and there is no block -> ok (the block waits)`,
      keepFaults(withBlock.replace(f.folder + '/*', f.folder + '-gone/*'), plantBare, f.folder).length === 0);
    check(`5 plant (${f.folder}): the block without immutable -> red`,
      keepFaults(withBlock.replace(new RegExp(`(${f.folder.replace('/', '\\/')}\\/\\*\\n\\s+Cache-Control: public, max-age=31536000), immutable`), '$1'), clean, f.folder).length > 0);
    check(`5 plant (${f.folder}): the census has no row for ${f.folder} -> red`, keepFaults(withBlock, '', f.folder).length > 0);
  }
  check('5: the `/*` block (the site\'s protection) is still the first block', [...blocks(headers).keys()][0] === '/*');
}

process.exit(failed ? 1 : 0);
