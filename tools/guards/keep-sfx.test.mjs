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

/* the families this card has kept so far: their folder (a `_headers` block)
   and the census's row for it */
const FAMILIES = [{ folder: '/sfx', prefix: '/sfx/' }];

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
function wrapped(path, i) {
  const node = path[i], parent = path[i - 1];
  if (!parent || parent.type !== 'CallExpression') return false;
  const name = calleeName(parent.callee);
  return (name === 'assetUrl' && parent.arguments[0] === node) || (name === 'loadSample' && parent.arguments[1] === node);
}
/** Every /sfx address in `code` that would reach the page without its
 *  version: [{ line, why, value }] */
export function holes(code, alike, prefixes = FAMILIES.map((f) => f.prefix)) {
  const ast = parse(code);
  const found = [];
  const starts = (s) => typeof s === 'string' && prefixes.some((p) => s.startsWith(p));
  (function walk(node, path) {
    if (!node || typeof node.type !== 'string') return;
    path.push(node);
    const parent = path[path.length - 2];
    let s = stringOf(node);
    const isTpl = node.type === 'TemplateLiteral' && node.expressions.length > 0;
    if (isTpl) s = node.quasis[0].value.cooked;
    const skip = parent && ((parent.type === 'ObjectProperty' || parent.type === 'Property') && parent.key === node && !parent.computed
      || parent.type === 'ImportDeclaration' || parent.type === 'ExportNamedDeclaration' || parent.type === 'ExportAllDeclaration');
    if (starts(s) && !skip) {
      const { top, i } = builtTop(path);
      const built = isTpl || top !== node;
      const line = node.loc ? node.loc.start.line : 0;
      if (wrapped(path, built ? i : path.length - 1)) { /* assetUrl gives it its version */ }
      else if (built) found.push({ line, why: 'built', value: s });
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
for (const f of files) {
  const t = readFileSync(f, 'utf8');
  if (FAMILIES.some((x) => t.includes(x.prefix))) texts.set(f, t);
}
const alike = new Set();
for (const t of texts.values()) for (const a of alikeOf(t)) alike.add(a);
const real = [];
for (const [f, t] of texts) for (const h of holes(t, alike)) real.push({ file: relative(ROOT, f).split(sep).join('/'), ...h });
check(`3-4 real: every /sfx address in src/ (${texts.size} files) reaches the page with its version`, real.length === 0, real);
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
    check(`5: public/_headers keeps ${f.folder}/* a year`, blocks(headers).has(f.folder + '/*'));
    const faults = keepFaults(headers, census, f.folder);
    check(`5: ${f.folder}/* is /world/placed5/*'s text, and the census reads 0 hand and 0 bare for it`, faults.length === 0, faults);
    const row = '| `' + f.folder + '` | 96 | 96 | 95 | 0 | 0 | yes |';
    const plantBare = row.replace('| 95 | 0 | 0 |', '| 95 | 0 | 1 |');
    check(`5 plant: the block present while the census reads 1 bare -> red`, keepFaults(headers, plantBare, f.folder).length > 0);
    check(`5 plant: the census reads 1 bare and there is no block -> ok (the block waits)`,
      keepFaults(headers.replace(f.folder + '/*', f.folder + '-gone/*'), plantBare, f.folder).length === 0);
    check(`5 plant: the block without immutable -> red`,
      keepFaults(headers.replace(new RegExp(`(${f.folder.replace('/', '\\/')}\\/\\*\\n\\s+Cache-Control: public, max-age=31536000), immutable`), '$1'), row, f.folder).length > 0);
    check(`5 plant: the census has no row for ${f.folder} -> red`, keepFaults(headers, '', f.folder).length > 0);
  }
  check('5: the `/*` block (the site\'s protection) is still the first block', [...blocks(headers).keys()][0] === '/*');
}

process.exit(failed ? 1 : 0);
