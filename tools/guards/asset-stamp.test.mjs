/* ═══ v2.3.6741: THE BUILD STAMPS A WRITTEN-OUT ADDRESS WITH ITS FILE'S VERSION, AND ONLY THAT (card KEEP, PR 2) ═══
 *
 * tools/assets/stamp.mjs (what is stamped, what is left) and the build's
 * plugin tools/assets/keepVersions.mjs (vite.config.js) give every address
 * WRITTEN OUT in src/ the first 10 characters of the SHA-256 of its file's
 * bytes: '/ui/x.png' -> '/ui/x.png?v=<10>'.  The card's plants (KEEP.md, PR
 * 2), each a fixture here, read through a syntax tree as the build reads it:
 *
 *   1. a literal that names a shipped file gains its version (a string, a
 *      template with no `${}`, a JSX attribute, a CSS url(), a preload);
 *   2. one that names no file of the table is left, and LISTED ('no-file');
 *   3. a hand-kept `?v=` is replaced by the file's own;
 *   4. a string that merely looks like a path, in a comment or a message, is
 *      untouched and not listed; so are an object's key and an import's
 *      source;
 *   5. a literal that is part of a built address ('+'), compared or looked
 *      up (===, a case, endsWith, .has), or the object of a method call is
 *      left and listed: stamping it would break the address or the match;
 *   6. a query that is not one `v=` (or a '#') is left and listed;
 *   7. a literal a loader later joins its own key to is stamped all the same
 *      (nothing is held back by hand: keepVersions.mjs says why);
 *   8. CSS: a url() in a comment or a quoted string is untouched;
 *   9. index.html: a tag's href / src / poster is stamped, a comment and a
 *      <script> are not, and the REAL page's addresses all gain theirs (its
 *      preloads match the scripts that ask for the same pictures, TRAPS §52);
 *  11. ONE ADDRESS, ONE FORM: an address any script builds ('+'), compares
 *      or derives is stamped NOWHERE, in a script, a style sheet or the
 *      page (stamp.mjs 'alike'; the census found four icons downloaded twice
 *      without it), through the plugin's own first pass where esbuild loads;
 *  10. THE BYTES WIN: a file whose bytes are not its row's is stamped with
 *      the bytes' version, and the build says so (never immutable on a file
 *      that quietly changes).
 *
 * The tree: rollup's own parser (what the build hands the plugin) when it
 * loads from the root, else @babel/parser from server/ (what CI's suite has);
 * the walk reads both.  Neither: FAIL.
 *
 * BREAK PROOF (rule 8), each tried by hand, 2026-11-26 (and put back):
 *   1. stampValue's hand-key branch keeping the old query          -> FAIL 3
 *   2. placeOf without the '+' rule                                 -> FAIL 5
 *   3. placeOf without the object-key rule                          -> FAIL 4
 *   4. stampCss not passing over comments                           -> FAIL 8
 *   5. stampHtml not skipping comments                              -> FAIL 9
 *   6. keepVersions trusting the table over the bytes               -> FAIL 10
 *   7. stampValue without the 'alike' rule                          -> FAIL 11
 *
 * Run from the repository's root: node tools/guards/asset-stamp.test.mjs
 * (cd server && npm test runs it with every other guard and suite).
 */
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { stampScript, stampCss, stampHtml, stampValue, topFolders, unstampable } from '../assets/stamp.mjs';
import { keepVersions } from '../assets/keepVersions.mjs';
import { ROOT, versionTable } from '../assets/versions.mjs';

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600)));
};
const sha = (s) => createHash('sha256').update(s).digest('hex');

/* ---- the parsers: rollup's (the build's), else Babel's (CI's) ------------- */
const parsers = [];
for (const pkg of ['package.json', 'server/package.json']) {
  const req = createRequire(join(ROOT, pkg));
  try {
    const { parseAst } = req('rollup/parseAst');
    if (!parsers.some((p) => p.name === 'rollup')) parsers.push({ name: 'rollup', jsx: false, parse: (c) => parseAst(c) });
  } catch { /* not here */ }
  try {
    const babel = req('@babel/parser');
    if (!parsers.some((p) => p.name === 'babel')) parsers.push({ name: 'babel', jsx: true, parse: (c) => babel.parse(c, { sourceType: 'module', plugins: ['jsx'] }) });
  } catch { /* not here */ }
}
check('0: a parser loads (rollup from the root, or @babel/parser from server/)', parsers.length > 0,
  'npm install in the root or in server/');

/* ---- the fixture's table ------------------------------------------------ */
const V = { '/ui/x.png': 'a1b2c3d4e5', '/icons/y.svg': '0f0f0f0f0f', '/sfx/hit.mp3': '1234567890', '/ui/welcome/bg.webp': 'bbbbbbbbbb', '/sprites/npc/z.webp': 'cccccccccc', '/ui/a b.png': 'dddddddddd' };
const table = new Map(Object.entries(V));
const versionOf = (a) => table.get(a) || null;
const folders = topFolders(table);

const JS = `
// a comment that names '/ui/x.png' and /icons/y.svg
/* and "/ui/x.png" in a block */
const a = '/ui/x.png';
const b = "/icons/y.svg?v=2.3.1331";
const c = \`/sfx/hit.mp3\`;
const d = '/ui/missing.png';
const e = 'the file /ui/x.png is missing';
const f = { '/ui/x.png': 1, icon: '/ui/x.png' };
const g = '/ui/x.png' + '?v=' + K;
const h = url === '/ui/x.png';
const i = url.endsWith('/icons/y.svg');
const j = '/ui/x.png'.replace('.png', '.webp');
const k = '/ui/x.png?lane=2';
const l = '/ui/x.png#frag';
const m = 'url("/ui/welcome/bg.webp")';
const n = '/sprites/npc/z.webp';
const o = '/api/report';
const p = tag\`/ui/x.png\`;
const q = new Set(['/ui/x.png']).has('/ui/x.png');
const r = '/ui/a%20b.png';
switch (s) { case '/ui/x.png': break; }
import('/ui/x.png');
`;

const pick = (code, name) => { const m = new RegExp(`const ${name} = (.*);`).exec(code); return m ? m[1] : null; };

for (const P of parsers) {
  const t = `[${P.name}] `;
  let r;
  try { r = stampScript(JS, P.parse(JS), versionOf, folders); } catch (err) { check(t + 'the fixture parses', false, String(err)); continue; }
  const out = r.code;
  const left = (addr, why) => r.left.some((l) => l.address === addr && l.why === why);
  /* 1 */
  check(t + '1: a literal naming a shipped file gains its version', pick(out, 'a') === "'/ui/x.png?v=a1b2c3d4e5'", pick(out, 'a'));
  check(t + '1: ...a template with no ${} too', pick(out, 'c') === '`/sfx/hit.mp3?v=1234567890`', pick(out, 'c'));
  check(t + '1: ...a CSS url() written in a string, whole', pick(out, 'm') === `'url("/ui/welcome/bg.webp?v=bbbbbbbbbb")'`, pick(out, 'm'));
  check(t + '1: ...an object\'s VALUE', /icon: '\/ui\/x\.png\?v=a1b2c3d4e5'/.test(pick(out, 'f') || ''), pick(out, 'f'));
  check(t + '1: ...an address written encoded (%20), kept as written', pick(out, 'r') === "'/ui/a%20b.png?v=dddddddddd'", pick(out, 'r'));
  /* 2 */
  check(t + '2: a literal naming no file of the table is left', pick(out, 'd') === "'/ui/missing.png'", pick(out, 'd'));
  check(t + '2: ...and listed', left('/ui/missing.png', 'no-file'), r.left);
  check(t + '2: a string that is no address of the site is neither (an API route)', pick(out, 'o') === "'/api/report'" && !r.left.some((l) => l.address === '/api/report'));
  /* 3 */
  check(t + '3: a hand ?v= is replaced by the file\'s own', pick(out, 'b') === '"/icons/y.svg?v=0f0f0f0f0f"', pick(out, 'b'));
  /* 4 */
  check(t + '4: the comments are untouched', out.includes("// a comment that names '/ui/x.png' and /icons/y.svg") && out.includes('/* and "/ui/x.png" in a block */'));
  check(t + '4: a message that mentions a path is untouched, not listed', pick(out, 'e') === "'the file /ui/x.png is missing'");
  check(t + '4: an object\'s key is untouched', /\{ '\/ui\/x\.png': 1/.test(pick(out, 'f') || ''), pick(out, 'f'));
  check(t + '4: an import\'s source is untouched', out.includes("import('/ui/x.png')"));
  check(t + '4: a tagged template is untouched', pick(out, 'p') === 'tag`/ui/x.png`', pick(out, 'p'));
  /* 5 */
  check(t + '5: an operand of + (a built address) is left, listed "joined"', pick(out, 'g') === "'/ui/x.png' + '?v=' + K" && left('/ui/x.png', 'joined'), pick(out, 'g'));
  check(t + '5: a side of === is left, listed "compared"', pick(out, 'h') === "url === '/ui/x.png'" && left('/ui/x.png', 'compared'));
  check(t + '5: an endsWith argument is left', pick(out, 'i') === "url.endsWith('/icons/y.svg')" && left('/icons/y.svg', 'compared'));
  check(t + '5: a Set\'s .has argument is left (its array\'s element is stamped: the guard lists the pair)', /\.has\('\/ui\/x\.png'\)/.test(pick(out, 'q') || ''));
  check(t + '5: a case is left', out.includes("case '/ui/x.png':"));
  check(t + '5: the object of a method call is left, listed "derived"', pick(out, 'j') === "'/ui/x.png'.replace('.png', '.webp')" && left('/ui/x.png', 'derived'));
  /* 6 */
  check(t + '6: a query that is not one v= is left, listed', pick(out, 'k') === "'/ui/x.png?lane=2'" && left('/ui/x.png', 'query'));
  check(t + '6: a #fragment is left', pick(out, 'l') === "'/ui/x.png#frag'");
  /* 7 */
  check(t + '7: an address a loader later joins a key to is stamped all the same', pick(out, 'n') === "'/sprites/npc/z.webp?v=cccccccccc'", pick(out, 'n'));
  /* JSX, where the parser reads it (the build turns it into an object first) */
  if (P.jsx) {
    const jsx = 'const el = <img src="/ui/x.png" alt="/ui/x.png is a picture" />;';
    const rj = stampScript(jsx, P.parse(jsx), versionOf, folders);
    check(t + '1: a JSX attribute gains its version', rj.code === 'const el = <img src="/ui/x.png?v=a1b2c3d4e5" alt="/ui/x.png is a picture" />;', rj.code);
  }
}

const real = versionTable();

/* 8: CSS */
const CSS = `/* url('/ui/x.png') in a comment */
.a { background: url('/ui/x.png') no-repeat; }
.b { background-image: url(/icons/y.svg?v=2.3.1331); }
.c { content: "url(/ui/x.png)"; }
.d { background: url("/ui/nope.png"); }
.e { mask: url(#clip); }
`;
const rc = stampCss(CSS, versionOf, folders);
check('8: CSS url() gains its version, quoted', rc.code.includes(".a { background: url('/ui/x.png?v=a1b2c3d4e5') no-repeat; }"), rc.code);
check('8: ...unquoted, a hand ?v= replaced', rc.code.includes('.b { background-image: url(/icons/y.svg?v=0f0f0f0f0f); }'), rc.code);
check('8: a url() in a comment is untouched', rc.code.startsWith("/* url('/ui/x.png') in a comment */"));
check('8: a url() inside a quoted string is untouched', rc.code.includes('.c { content: "url(/ui/x.png)"; }'));
check('8: a url() naming no file is left, listed', rc.code.includes('url("/ui/nope.png")') && rc.left.some((l) => l.address === '/ui/nope.png' && l.why === 'no-file'));
check('8: a url(#id) is untouched', rc.code.includes('mask: url(#clip)'));

/* 9: index.html */
const HTML = `<!doctype html><html><head>
<!-- <link rel="preload" href="/ui/x.png"> in a comment -->
<link rel="preload" as="image" href="/ui/welcome/bg.webp">
<link rel="icon" href='/icons/y.svg'>
<script>var s = "/ui/x.png";</script>
<video poster="/ui/x.png"></video>
<a href="/ui/missing.png">x</a>
</head></html>`;
const rh = stampHtml(HTML, versionOf, folders);
check('9: a preload\'s href gains its version', rh.html.includes('href="/ui/welcome/bg.webp?v=bbbbbbbbbb"'), rh.html);
check('9: ...single-quoted too', rh.html.includes("href='/icons/y.svg?v=0f0f0f0f0f'"));
check('9: ...a poster too', rh.html.includes('poster="/ui/x.png?v=a1b2c3d4e5"'));
check('9: a comment is untouched', rh.html.includes('<!-- <link rel="preload" href="/ui/x.png"> in a comment -->'));
check('9: a <script> is untouched', rh.html.includes('<script>var s = "/ui/x.png";</script>'));
check('9: an href naming no file is left, listed', rh.html.includes('href="/ui/missing.png"') && rh.left.some((l) => l.address === '/ui/missing.png'));
{
  const page = readFileSync(join(ROOT, 'src/index.html'), 'utf8');
  const realOf = (a) => real.get(a) || null;
  const rp = stampHtml(page, realOf, topFolders(real));
  const bare = [...rp.html.matchAll(/\s(?:href|src|poster)="(\/(?!\/)[^"?#]+)"/g)].map((m) => m[1]).filter((a) => real.has(a));
  check('9: the real index.html: every address of a shipped file carries its version', rp.stamped.length > 0 && bare.length === 0, { stamped: rp.stamped.length, bare });
}

/* 10: the bytes win, through the plugin itself, on its own disk */
const root = mkdtempSync(join(tmpdir(), 'keep-stamp-'));
try {
  const put = (p, body) => { mkdirSync(join(root, p, '..'), { recursive: true }); writeFileSync(join(root, p), body); };
  put('public/ui/x.png', 'the bytes now');
  put('public/ui/y.png', 'y bytes');
  put('tools/assets/shipped.json', JSON.stringify({ rows: [
    { path: 'public/ui/x.png', sha256: sha('the bytes BEFORE') },
    { path: 'public/ui/y.png', sha256: sha('y bytes') },
  ] }));
  const plugins = keepVersions({ root, report: '', on: true });
  const main = plugins.find((p) => p.name === 'keep-versions');
  const html = main.transformIndexHtml.handler('<link rel="preload" href="/ui/x.png"><link rel="preload" href="/ui/y.png">', { filename: join(root, 'src/index.html') });
  const warns = [];
  const log = console.log; console.log = () => {};
  try { main.buildEnd.call({ warn: (w) => warns.push(w) }); } finally { console.log = log; }
  check('10: a file whose bytes are not its row\'s is stamped with the BYTES\' version', html.includes(`/ui/x.png?v=${sha('the bytes now').slice(0, 10)}`) && !html.includes(sha('the bytes BEFORE').slice(0, 10)), html);
  check('10: ...and the build says so', warns.some((w) => w.includes('/ui/x.png')), warns);
  check('10: a file that agrees is stamped with its row\'s', html.includes(`/ui/y.png?v=${sha('y bytes').slice(0, 10)}`), html);
  check('10: KEEP_STAMP=0 turns the plugin off (the census\'s "before")', keepVersions({ root, on: false }).length === 0);
  const rollupP = parsers.find((p) => p.name === 'rollup');
  let esb = null;
  try { esb = createRequire(join(ROOT, 'package.json'))('esbuild'); } catch { /* CI's suite has server/'s packages only */ }
  if (rollupP && esb) {
    put('src/a.jsx', "export const A = () => <img src={'/ui/y.png' + K} />;");
    const pl = keepVersions({ root, report: '', on: true });
    await pl.find((p) => p.name === 'keep-versions-css').buildStart.call({ parse: rollupP.parse });
    const h2 = pl.find((p) => p.name === 'keep-versions').transformIndexHtml.handler('<link rel="preload" href="/ui/y.png">', { filename: join(root, 'src/index.html') });
    check('11: the plugin\'s first pass reads src/ (JSX too): an address a script joins is not stamped in the page', h2 === '<link rel="preload" href="/ui/y.png">', h2);
  } else console.log('note 11: the plugin\'s own first pass is tried where esbuild and rollup load (the root\'s packages); the rule itself is tried above');
} finally { rmSync(root, { recursive: true, force: true }); }

/* 11: one address, one form */
for (const P of parsers) {
  const t = `[${P.name}] `;
  const A = "const g = '/ui/x.png' + ITEMS_V; const h = s === '/icons/y.svg';";
  const B = "const icon = '/ui/x.png'; const tip = '/icons/y.svg'; const ok = '/sfx/hit.mp3';";
  const alike = unstampable(A, P.parse(A), versionOf, folders);
  check(t + '11: the first pass finds what a script joins or compares', alike.has('/ui/x.png') && alike.has('/icons/y.svg') && alike.size === 2, [...alike]);
  const rb = stampScript(B, P.parse(B), versionOf, folders, alike);
  check(t + '11: ...and another script leaves those, listed "alike", and stamps the rest',
    rb.code === "const icon = '/ui/x.png'; const tip = '/icons/y.svg'; const ok = '/sfx/hit.mp3?v=1234567890';"
    && rb.left.filter((l) => l.why === 'alike').length === 2, rb);
  const rcss = stampCss(".a{background:url(/ui/x.png)}", versionOf, folders, alike);
  const rhtml = stampHtml('<link rel="preload" href="/ui/x.png">', versionOf, folders, alike);
  check(t + '11: ...a style sheet and the page leave them too', rcss.code === '.a{background:url(/ui/x.png)}' && rhtml.html === '<link rel="preload" href="/ui/x.png">');
}

/* the one value, alone */
check('3: stampValue reads a v= of any form as a hand key', stampValue('/ui/x.png?v=v2.3.3737', versionOf, folders).to === '/ui/x.png?v=a1b2c3d4e5');

console.log(failed ? `\n${failed} FAIL` : '\nall ok');
process.exit(failed ? 1 : 0);
