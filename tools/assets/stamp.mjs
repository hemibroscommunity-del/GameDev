/* ═══ v2.3.6741: THE BUILD GIVES EVERY WRITTEN-OUT ADDRESS ITS VERSION (card KEEP, PR 2) ═══
 *
 * The owner, 2026-11-26: "Keeping pictures a long time or indefinitely will
 * be a big boost how do I do that", and, told what it takes: "Yes do it".
 *
 * A picture can be kept a year only when its address changes whenever its
 * bytes do (the card's rule 1).  The version is the first 10 characters of
 * the SHA-256 of the file's bytes (tools/assets/versions.mjs, the one place
 * that says so).  This file gives it to every address WRITTEN OUT in src/, at
 * build, so no source file is edited and no number is ever typed:
 *
 *     '/ui/quest/scroll.png'          -> '/ui/quest/scroll.png?v=3f9c0a1b22'
 *     '/icons/x.svg?v=2.3.1331'       -> '/icons/x.svg?v=<its 10>'   (a hand key replaced)
 *     'url("/ui/welcome/bg.webp")'    -> 'url("/ui/welcome/bg.webp?v=<its 10>")'
 *
 * WHAT IT TOUCHES: only a string that IS a shipped file's address, whole
 * (or a CSS `url(...)` of one, whole).  It finds them by the SYNTAX TREE (a
 * string literal, or a template with no `${}`), never by a pattern over the
 * text, so a path in a comment is never seen, and a message that merely
 * mentions one ('missing /ui/x.png') is not an address.  In CSS it reads the
 * `url(...)` tokens outside comments and strings; in index.html, the
 * href/src/poster of a tag outside a comment.  The three agree, so a
 * preload in index.html still matches the script that asks for the same
 * picture (TRAPS §52: a preload that misses its consumer is a second
 * download, not a saved one).
 *
 * WHAT IT LEAVES, AND LISTS (the build prints the count; KEEP_STAMP_REPORT=
 * <file> writes the list), each a string that is an address:
 *   - 'no-file'  : a folder of the site, a file's name, and no file of the
 *                  table (a file that does not ship, or is not tracked);
 *   - 'query'    : a query other than one `v=` (or a '#'): not ours to rewrite;
 *   - 'joined'   : an operand of `+` ('/ui/x.png' + '?v=' + K): a BUILT
 *                  address, the card's PR 3 (assetUrl);
 *   - 'compared' : compared or looked up (===, a case, endsWith, includes,
 *                  .has/.get of a Map): stamping one side of a comparison
 *                  would break it;
 *   - 'derived'  : the object of a method call ('/ui/x.png'.replace(...)):
 *                  what it makes is an address of its own;
 *   - 'alike'    : an address that ANY script of the build leaves for one of
 *                  the three reasons above is stamped NOWHERE (`alike`, made
 *                  by unstampable() over every script first): every place
 *                  then asks for it as it did before, so a file is never
 *                  downloaded twice under two addresses, nor a comparison
 *                  broken (measured: the census of 2026-11-26 found four
 *                  icons asked twice, '/icons/items/mining-pickaxe.webp' +
 *                  a key in gesturePose.js beside the same address stamped in
 *                  nodeLabels.js).
 *   An object's key, an import's source and a tagged template are not
 *   addresses the page asks for: skipped, not listed.
 *
 * ZERO DEPENDENCIES.  The plugin (vite.config.js, `keep-versions`) hands in
 * the build's own parser (rollup's `this.parse`, ESTree); the guard
 * (tools/guards/asset-stamp.test.mjs) hands in rollup's parseAst or
 * @babel/parser, whichever loads: the walk reads both trees' strings
 * (`Literal` and `StringLiteral`).
 */

const VERSION_FIELD = 'v';

/* comparisons: one side stamped, the other not, is a comparison broken */
const COMPARE_OPS = new Set(['===', '!==', '==', '!=', '<', '>', '<=', '>=', 'in', 'instanceof']);
/* a string handed to one of these is looked up, not loaded */
const LOOKUP_METHODS = new Set([
  'endsWith', 'startsWith', 'includes', 'indexOf', 'lastIndexOf', 'replace', 'replaceAll', 'split',
  'match', 'matchAll', 'search', 'localeCompare', 'has', 'get', 'delete',
]);
const KEY_PARENTS = new Set(['Property', 'ObjectProperty', 'ObjectMethod', 'PropertyDefinition',
  'ClassProperty', 'ClassPrivateProperty', 'MethodDefinition', 'ClassMethod']);
const SOURCE_PARENTS = new Set(['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration',
  'ImportExpression', 'ImportAttribute', 'ImportSpecifier', 'ExportSpecifier']);

/** The folders of the site (public/'s top names, from the table), to tell an
 *  address that names no file ('no-file', listed) from a string that is not
 *  an address at all (a route, a word: left alone, not listed). */
export function topFolders(table) {
  const s = new Set();
  for (const a of table.keys()) {
    const seg = a.split('/');
    if (seg.length > 2) s.add(seg[1]);
  }
  return s;
}

/** Read one string's value as an address.  Returns null when it is not an
 *  address of the site at all; else { address, query, hash, css, quote }
 *  (`css`: the string is `url(...)` whole). */
export function readAddress(value) {
  if (typeof value !== 'string' || value.length < 3 || value.length > 400) return null;
  let s = value, css = false, quote = '';
  const u = /^url\(\s*(["']?)(.*?)\1\s*\)$/s.exec(s);
  if (u) { css = true; quote = u[1]; s = u[2]; }
  if (s[0] !== '/' || s[1] === '/') return null;               /* not a path, or '//host' */
  if (/[\s"'`\\<>()]/.test(s)) return null;                     /* a sentence, markup, a pattern */
  const hashAt = s.indexOf('#');
  const hash = hashAt >= 0 ? s.slice(hashAt) : '';
  if (hashAt >= 0) s = s.slice(0, hashAt);
  const q = s.indexOf('?');
  const path = q >= 0 ? s.slice(0, q) : s;
  const query = q >= 0 ? s.slice(q + 1) : null;
  let address = path;
  try { address = decodeURIComponent(path); } catch { /* kept as written */ }
  return { address, path, query, hash, css, quote };
}

/** One string's fate: { to } (its new value), { left: why } or null (not an
 *  address).  `versionOf(address)` gives the version, or null for no file. */
export function stampValue(value, versionOf, folders, alike = null) {
  const a = readAddress(value);
  if (!a) return null;
  if (alike && alike.has(a.address)) return versionOf(a.address) ? { left: 'alike', address: a.address } : null;
  const v = versionOf(a.address);
  if (!v) {
    /* an address-like string: a folder of the site and a file's name */
    const seg = a.address.split('/');
    if (seg.length > 2 && folders.has(seg[1]) && /\.[A-Za-z0-9]{2,5}$/.test(a.address)) return { left: 'no-file', address: a.address };
    return null;
  }
  if (a.hash) return { left: 'query', address: a.address };
  let query;
  if (a.query == null || a.query === '') query = `${VERSION_FIELD}=${v}`;
  else if (new RegExp(`^${VERSION_FIELD}=[^&=]+$`).test(a.query)) query = `${VERSION_FIELD}=${v}`;  /* a hand key: replaced */
  else return { left: 'query', address: a.address };
  const url = `${a.path}?${query}`;
  const to = a.css ? `url(${a.quote}${url}${a.quote})` : url;
  return { to, address: a.address, was: a.query == null || a.query === '' ? 'bare' : (a.query === query ? 'table' : 'hand') };
}

/* ---- JavaScript: the syntax tree ----------------------------------------- */

function stringOf(node) {
  if (!node || typeof node !== 'object') return null;
  if ((node.type === 'Literal' && typeof node.value === 'string') || node.type === 'StringLiteral') {
    return { value: node.value, start: node.start, end: node.end, template: false };
  }
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0 && node.quasis.length === 1) {
    const cooked = node.quasis[0].value && node.quasis[0].value.cooked;
    if (typeof cooked !== 'string') return null;
    return { value: cooked, start: node.start, end: node.end, template: true };
  }
  return null;
}

/** Why a string in this place is not stamped (or '' when it is), or 'skip'
 *  when the place is not an address the page asks for at all. */
function placeOf(node, parent, grand) {
  /* a JSX attribute's string (Babel's tree, before the build turns it into
     an object's value) is a value like any other */
  if (!parent) return '';
  if (KEY_PARENTS.has(parent.type) && parent.key === node && !parent.computed) return 'skip';
  if (SOURCE_PARENTS.has(parent.type)) return 'skip';
  if (parent.type === 'CallExpression' && parent.callee && parent.callee.type === 'Import') return 'skip';   /* Babel's import() */
  if (parent.type === 'TaggedTemplateExpression') return 'skip';
  if (parent.type === 'ExpressionStatement' && parent.directive) return 'skip';
  if (parent.type === 'Directive' || parent.type === 'DirectiveLiteral') return 'skip';
  if (parent.type === 'BinaryExpression') {
    if (parent.operator === '+') return 'joined';
    if (COMPARE_OPS.has(parent.operator)) return 'compared';
  }
  if (parent.type === 'AssignmentExpression' && parent.operator === '+=') return 'joined';
  if (parent.type === 'SwitchCase' && parent.test === node) return 'compared';
  if ((parent.type === 'MemberExpression' || parent.type === 'OptionalMemberExpression') && parent.object === node) return 'derived';
  if ((parent.type === 'CallExpression' || parent.type === 'OptionalCallExpression') && parent.arguments.includes(node)) {
    const c = parent.callee;
    const name = c && (c.type === 'MemberExpression' || c.type === 'OptionalMemberExpression') && !c.computed && c.property
      ? (c.property.name || c.property.value) : null;
    if (name && LOOKUP_METHODS.has(name)) return 'compared';
  }
  void grand;
  return '';
}

/** Walk any ESTree or Babel tree, calling visit(node, parent, grand). */
function walk(root, visit) {
  const stack = [[root, null, null]];
  while (stack.length) {
    const [node, parent, grand] = stack.pop();
    if (!node || typeof node !== 'object') continue;
    if (Array.isArray(node)) { for (let i = node.length - 1; i >= 0; i--) stack.push([node[i], parent, grand]); continue; }
    if (typeof node.type !== 'string') continue;
    visit(node, parent, grand);
    for (const k of Object.keys(node)) {
      if (k === 'loc' || k === 'range' || k === 'extra' || k === 'leadingComments' || k === 'trailingComments'
        || k === 'innerComments' || k === 'comments' || k === 'tokens') continue;
      const ch = node[k];
      if (ch && typeof ch === 'object') stack.push([ch, node, parent]);
    }
  }
}

/* a line number from a position (a binary search over the line starts,
   made once a file: BroTown.jsx has thousands of strings) */
function linesOf(code) {
  const starts = [0];
  for (let i = 0; i < code.length; i++) if (code.charCodeAt(i) === 10) starts.push(i + 1);
  return (at) => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= at) lo = mid; else hi = mid - 1; } return lo + 1; };
}

/** Stamp a script.  `ast` is its tree (ESTree or Babel), positions into
 *  `code`.  Returns { code, stamped: [{ address, was, line }], left: [{
 *  address, why, line }] }; `code` is the same string when nothing changed. */
export function stampScript(code, ast, versionOf, folders, alike = null) {
  const edits = [], stamped = [], left = [];
  const lineAt = linesOf(code);
  walk(ast, (node, parent, grand) => {
    const s = stringOf(node);
    if (!s) return;
    const r = stampValue(s.value, versionOf, folders, alike);
    if (!r) return;
    const place = placeOf(node, parent, grand);
    if (place === 'skip') return;
    const line = lineAt(s.start);
    /* where it stands says why first ('joined' over 'alike': PR 3's list) */
    if (place) { left.push({ address: r.address, why: place, line }); return; }
    if (r.left) { left.push({ address: r.address, why: r.left, line }); return; }
    if (r.to === s.value) { stamped.push({ address: r.address, was: 'table', line }); return; }
    const q = code[s.start];
    if (r.to.includes(q) || r.to.includes('\\') || (s.template && r.to.includes('${'))) {
      left.push({ address: r.address, why: 'query', line });
      return;
    }
    edits.push([s.start + 1, s.end - 1, r.to]);
    stamped.push({ address: r.address, was: r.was, line });
  });
  return { code: applyEdits(code, edits), stamped, left };
}

/* the reasons a PLACE leaves an address (not the value's own) */
const PLACE_WHYS = new Set(['joined', 'compared', 'derived']);

/** The addresses a script leaves because of where they stand ('joined',
 *  'compared', 'derived'): the build gathers them over every script before
 *  it stamps any, and stamps them nowhere (the 'alike' rule). */
export function unstampable(code, ast, versionOf, folders) {
  return new Set(stampScript(code, ast, versionOf, folders).left.filter((l) => PLACE_WHYS.has(l.why)).map((l) => l.address));
}

function applyEdits(code, edits) {
  if (!edits.length) return code;
  edits.sort((a, b) => a[0] - b[0]);
  let out = '', at = 0;
  for (const [s, e, t] of edits) { out += code.slice(at, s) + t; at = e; }
  return out + code.slice(at);
}

/* ---- CSS: its url(...) tokens ------------------------------------------- */

/** Stamp a style sheet's `url(...)` tokens.  A small reader of CSS's own
 *  tokens: a comment and a quoted string are passed over whole, so a path in
 *  either is never read; only a `url(` token is. */
export function stampCss(code, versionOf, folders, alike = null) {
  const edits = [], stamped = [], left = [];
  const lineAt = linesOf(code);
  let i = 0;
  const n = code.length;
  while (i < n) {
    const c = code[i];
    if (c === '/' && code[i + 1] === '*') { const e = code.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue; }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && code[j] !== c) { if (code[j] === '\\') j++; if (code[j] === '\n') break; j++; }
      i = j + 1;
      continue;
    }
    if ((c === 'u' || c === 'U') && /^url\(/i.test(code.slice(i, i + 4)) && !/[\w-]/.test(code[i - 1] || '')) {
      const close = code.indexOf(')', i + 4);
      if (close < 0) break;
      const token = code.slice(i, close + 1);
      const r = stampValue('url(' + token.slice(4), versionOf, folders, alike);
      const line = lineAt(i);
      if (r && r.left) left.push({ address: r.address, why: r.left, line });
      else if (r) {
        if (r.to !== token) edits.push([i, close + 1, r.to]);
        stamped.push({ address: r.address, was: r.was, line });
      }
      i = close + 1;
      continue;
    }
    i++;
  }
  return { code: applyEdits(code, edits), stamped, left };
}

/* ---- the page: index.html's href / src / poster -------------------------- */

/** Stamp the page's own addresses: the href, src and poster of a tag (a
 *  preload, an icon), outside comments, and inside no <script> or <style>. */
export function stampHtml(html, versionOf, folders, alike = null) {
  const edits = [], stamped = [], left = [];
  const lineAt = linesOf(html);
  const tag = /<!--[\s\S]*?-->|<(script|style)\b[\s\S]*?<\/\1\s*>|<[a-zA-Z][^>]*>/g;
  let m;
  while ((m = tag.exec(html))) {
    if (m[0].startsWith('<!--') || m[1]) continue;
    const attr = /\s(href|src|poster)\s*=\s*("([^"]*)"|'([^']*)')/g;
    let a;
    while ((a = attr.exec(m[0]))) {
      const value = a[3] != null ? a[3] : a[4];
      const r = stampValue(value, versionOf, folders, alike);
      if (!r) continue;
      const line = lineAt(m.index);
      if (r.left) { left.push({ address: r.address, why: r.left, line }); continue; }
      const at = m.index + a.index + a[0].length - 1 - value.length;
      if (r.to !== value) edits.push([at, at + value.length, r.to]);
      stamped.push({ address: r.address, was: r.was, line });
    }
  }
  return { html: applyEdits(html, edits), stamped, left };
}
