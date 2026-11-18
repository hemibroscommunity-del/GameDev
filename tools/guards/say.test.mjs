/* ═══ v2.3.6320: THE WORDS TABLE AND ITS ONE READER (GRAND-PLAN 8.8; card WD2, wave W0) ═══
 *
 * src/game/say.js reads the one table of the words a player reads
 * (`src/data/say/<screen>.js`, docs/specs/player-words.md).  This holds the
 * reader and the table's shape.  It lives here, not in server/test/, because
 * it tests the page's code and reads source: a new file in server/test/
 * deploys the worker (TRAPS §277).
 *
 *   1. say(): a plain row; a template filled as text in one pass (a part
 *      holding "{x}" stays, a missing or null part is '', 0 is '0'); a
 *      missing key shows the key;
 *   2. on a computer a plain row's "tap" reads "click" and a part's does not
 *      (a player's own words are never changed); on a phone all as written;
 *   3. { phone, desk } by the device, { one, other } by parts.n, nested;
 *   4. sayPieces(): the row cut at its parts, an object part (a React
 *      element) kept whole, a number as text, empty pieces dropped;
 *   5. say.js imports nothing but deskWords.js (node tests it);
 *   6. THE TABLE: each src/data/say/*.js imports nothing and exports a
 *      frozen SAY; every key is `<file's screen>.<what>` in lower camel
 *      case, so no key can sit in two files (v2.3.6340: the old "no key in
 *      two files" check could never fire, and is gone); no key written twice
 *      in one file (read from its source: the module keeps only the last);
 *      every row is words or a { phone, desk } / { one, other } form of
 *      words;
 *   7. THE READERS (v2.3.6340, gatekeeper sitting 50's mends): a file that
 *      imports say.js or a table (`import { SAY }`, `import { SAY as X }`,
 *      more than one) calls say()/sayPieces() (by whatever names it imports
 *      them) with a table it imported as the first argument and, as the key,
 *      a single-quoted '<screen>.<what>' or a ternary choosing among them
 *      (a key in double quotes, a backtick, built with `+` or held in a
 *      variable fails: the guard could not see it); each key in the table
 *      that call reads; every other '<screen>.<what>' written in the file
 *      too;
 *   8. THE PARTS (v2.3.6340): a call whose parts are an object written in
 *      place gives every `{name}` its row (each row the key may choose, each
 *      form) asks for, and passes no part no row uses (`n`, the count, aside);
 *      a row with a `{name}` and no parts fails.  Parts handed over whole (a
 *      variable, a spread) are not read.
 *
 * BREAK PROOF (rule 8), tried by hand on scratch edits, 2026-11-18:
 *   - src/ui/panels/ClanInviteCard.jsx: 'clanInvite.accept' -> 'clanInvite.acept'  -> FAIL 7
 *   - src/data/say/clanInvite.js: a key 'smithy.title'                             -> FAIL 6
 *   - src/game/say.js: `const t = text;` for `plain ? deskWords(text) : text`       -> FAIL 2
 *   v2.3.6340:
 *   - src/data/say/clanInvite.js: its 'clanInvite.title' row written twice         -> FAIL 6
 *   - src/ui/panels/ClanInviteCard.jsx: say(SAY, "clanInvite.accept") (double quotes) -> FAIL 7
 *   - src/ui/panels/ClanInviteCard.jsx: `import { SAY as T }` and say(T, 'clanInvite.acept') -> FAIL 7
 *   - src/ui/mobile/dash/ClanPanel.jsx:51: `n,` -> `count: n,` in 'clan.partyLine''s parts -> FAIL 8
 *   (checks 7 and 8 also play a scratch screen every run: see 9.)
 *
 * Run from the repository's root: node tools/guards/say.test.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail)));
};

/* a fake device: deviceProfile keeps the MediaQueryList it is given, so one
   object, its `matches` flipped, is the mouse coming and going */
const mq = { matches: false };
globalThis.window = { matchMedia: () => mq };
const computer = (on) => { mq.matches = !!on; };

const { say, sayPieces } = await import(pathToFileURL(join(ROOT, 'src/game/say.js')).href);

const T = Object.freeze({
  'demo.title': 'Clan invite',
  'demo.join': 'Joining [{tag}]...',
  'demo.two': '{a} and {b}',
  'demo.tap': 'Tap {who} to trade.',
  'demo.key': { phone: 'Tap Bank to fetch some.', desk: 'Press B for the Bank.' },
  'demo.left': { one: '{n} more to forge', other: '{n} more to forge, all of them' },
  'demo.nest': { phone: { one: 'one tap', other: '{n} taps' }, desk: { one: 'one click', other: '{n} clicks' } },
  'demo.sentence': '{from} invites you to join {clan}.',
});

/* 1. say() */
computer(false);
check('1. a plain row', say(T, 'demo.title') === 'Clan invite');
check('1. a template, filled', say(T, 'demo.join', { tag: 'HB' }) === 'Joining [HB]...', say(T, 'demo.join', { tag: 'HB' }));
check('1. a part holding "{b}" is put in as text, in one pass', say(T, 'demo.two', { a: '{b}', b: 'x' }) === '{b} and x', say(T, 'demo.two', { a: '{b}', b: 'x' }));
check('1. a missing or null part is empty, 0 is "0"', say(T, 'demo.two', { a: null }) === ' and ' && say(T, 'demo.two', { a: 0, b: 0 }) === '0 and 0');
check('1. a missing key shows the key', say(T, 'demo.nope') === 'demo.nope' && say(null, 'demo.title') === 'demo.title');
check('1. a key on the prototype is missing', say(T, 'toString') === 'toString' && say(T, '__proto__') === '__proto__');

/* 2. tap and click */
computer(true);
check('2. on a computer a plain row says "click"', say(T, 'demo.tap', { who: 'Bro' }) === 'Click Bro to trade.', say(T, 'demo.tap', { who: 'Bro' }));
check('2. ...and a part keeps its own words', say(T, 'demo.tap', { who: 'Tap Dancer' }) === 'Click Tap Dancer to trade.', say(T, 'demo.tap', { who: 'Tap Dancer' }));
computer(false);
check('2. on a phone, as written', say(T, 'demo.tap', { who: 'Bro' }) === 'Tap Bro to trade.');

/* 3. the forms */
check('3. { phone, desk } on a phone', say(T, 'demo.key') === 'Tap Bank to fetch some.');
computer(true);
check('3. { phone, desk } on a computer (its own words, no swap)', say(T, 'demo.key') === 'Press B for the Bank.', say(T, 'demo.key'));
computer(false);
check('3. { one, other } by n', say(T, 'demo.left', { n: 1 }) === '1 more to forge' && say(T, 'demo.left', { n: 3 }) === '3 more to forge, all of them');
check('3. nested, on a phone', say(T, 'demo.nest', { n: 1 }) === 'one tap' && say(T, 'demo.nest', { n: 2 }) === '2 taps');
computer(true);
check('3. nested, on a computer', say(T, 'demo.nest', { n: 2 }) === '2 clicks', say(T, 'demo.nest', { n: 2 }));
computer(false);

/* 4. sayPieces() */
{
  const from = { type: 'b', key: 'from' }, clan = { type: 'b', key: 'clan' };
  const p = sayPieces(T, 'demo.sentence', { from, clan });
  check('4. the row cut at its parts, elements kept whole', p.length === 4 && p[0] === from && p[1] === ' invites you to join ' && p[2] === clan && p[3] === '.', p);
  const q = sayPieces(T, 'demo.join', { tag: 7 });
  check('4. a number part as text', q.join('') === 'Joining [7]...' && q.length === 3, q);
  check('4. empty pieces dropped', sayPieces(T, 'demo.two', { b: 'x' }).join('|') === ' and |x');
  check('4. a missing key shows the key', sayPieces(T, 'demo.nope').join('') === 'demo.nope');
}

/* 5. say.js's imports */
{
  const src = readFileSync(join(ROOT, 'src/game/say.js'), 'utf8');
  const imps = [...src.matchAll(/^\s*import\b[^;]*?from\s*['"]([^'"]+)['"]/gm)].map((m) => m[1]);
  check('5. say.js imports nothing but deskWords.js', imps.length === 1 && imps[0] === './deskWords.js', imps);
}

/* 6. the table */
const SAY_DIR = 'src/data/say';
const tables = Object.create(null);   // screen -> SAY
{
  const files = readdirSync(join(ROOT, SAY_DIR)).filter((f) => f.endsWith('.js')).sort();
  let rows = 0;
  const bad = [];
  const okRow = (r, d = 0) => typeof r === 'string'
    || (d < 3 && r && typeof r === 'object' && !Array.isArray(r) && Object.keys(r).length > 0
      && (Object.keys(r).every((k) => k === 'phone' || k === 'desk') || Object.keys(r).every((k) => k === 'one' || k === 'other'))
      && Object.values(r).every((v) => okRow(v, d + 1)));
  for (const f of files) {
    const rel = SAY_DIR + '/' + f;
    const src = readFileSync(join(ROOT, rel), 'utf8');
    const screen = f.replace(/\.js$/, '');
    if (/^\s*import\b/m.test(src)) bad.push(rel + ': imports (a leaf file has none)');
    const mod = await import(pathToFileURL(join(ROOT, rel)).href);
    if (!mod.SAY || !Object.isFrozen(mod.SAY)) { bad.push(rel + ': no frozen SAY'); continue; }
    tables[screen] = mod.SAY;
    for (const [k, v] of Object.entries(mod.SAY)) {
      rows++;
      if (!new RegExp('^' + screen + '\\.[a-z][A-Za-z0-9]*$').test(k)) bad.push(rel + ': key ' + k + ' is not ' + screen + '.<what>');
      if (!okRow(v)) bad.push(rel + ': row ' + k + ' is not words or a { phone, desk } / { one, other } form');
    }
    /* v2.3.6340: a key written twice keeps only its last row in the module,
       so it is read from the source: each `'<key>':` that opens a row */
    const seen = new Set();
    for (const m of src.matchAll(/^\s*['"]([A-Za-z0-9_.]+)['"]\s*:/gm)) {
      if (seen.has(m[1])) bad.push(rel + ': key ' + m[1] + ' written twice');
      seen.add(m[1]);
    }
  }
  check('6. the table: ' + files.length + ' screen file(s), ' + rows + ' rows, each `<screen>.<what>`, once, in a leaf file', bad.length === 0, bad);
}

/* 7. the readers, and 8. the parts (v2.3.6340: read from the calls
   themselves, gatekeeper sitting 50's mends 1 and 3) */

/* A small scanner of the page's source: enough of JavaScript and JSX to cut
   a call into its arguments.  A string in ' or " ends at its line (so an
   apostrophe in JSX text spoils one line at most); a template's ${...} is
   scanned as code; comments are blanked to spaces (a say() named in a comment
   is not a call). */
function skipQuoted(t, j) {
  const q = t[j];
  for (let k = j + 1; k < t.length; k++) {
    if (t[k] === '\\') { k++; continue; }
    if (t[k] === q) return k + 1;
    if (q !== '`' && t[k] === '\n') return k;
    if (q === '`' && t[k] === '$' && t[k + 1] === '{') k = closeOf(t, k + 1) - 1;
  }
  return t.length;
}
/* the index just past the bracket that closes t[j] ('(', '[' or '{') */
function closeOf(t, j) {
  let depth = 0;
  for (let k = j; k < t.length; k++) {
    const c = t[k];
    if (c === '\'' || c === '"' || c === '`') { k = skipQuoted(t, k) - 1; continue; }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') { depth--; if (depth === 0) return k + 1; }
  }
  return t.length;
}
function blankComments(t) {
  let out = '';
  for (let k = 0; k < t.length;) {
    const c = t[k];
    if (c === '\'' || c === '"' || c === '`') { const e = skipQuoted(t, k); out += t.slice(k, e); k = e; continue; }
    if (c === '/' && t[k + 1] === '*') { const e = t.indexOf('*/', k + 2); const end = e < 0 ? t.length : e + 2; out += t.slice(k, end).replace(/[^\n]/g, ' '); k = end; continue; }
    if (c === '/' && t[k + 1] === '/' && t[k - 1] !== ':') { const e = t.indexOf('\n', k); const end = e < 0 ? t.length : e; out += ' '.repeat(end - k); k = end; continue; }
    out += c; k++;
  }
  return out;
}
/* split t at the top-level characters `at` matches (outside brackets and strings) */
function topLevel(t, at) {
  const cuts = [];
  let depth = 0;
  for (let k = 0; k < t.length; k++) {
    const c = t[k];
    if (c === '\'' || c === '"' || c === '`') { k = skipQuoted(t, k) - 1; continue; }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    else if (depth === 0 && at(t, k)) cuts.push(k);
  }
  return cuts;
}
const argsOf = (t, open) => {
  const inner = t.slice(open + 1, closeOf(t, open) - 1);
  const cuts = topLevel(inner, (u, k) => u[k] === ',');
  const out = [];
  let a = 0;
  for (const c of cuts.concat([inner.length])) { out.push(inner.slice(a, c).trim()); a = c + 1; }
  return out.length === 1 && out[0] === '' ? [] : out;
};
const unwrap = (e) => { e = e.trim(); while (e[0] === '(' && closeOf(e, 0) === e.length) e = e.slice(1, -1).trim(); return e; };
/* the keys a key argument may read: a single-quoted literal, or a ternary
   whose two arms are such keys; null when it is anything else */
function keysOf(e) {
  e = unwrap(e);
  const lit = /^'([A-Za-z0-9_.]+)'$/.exec(e);
  if (lit) return [lit[1]];
  const isQ = (u, k) => u[k] === '?' && u[k + 1] !== '.' && u[k + 1] !== '?' && u[k - 1] !== '?';
  const q = topLevel(e, isQ)[0];
  if (q === undefined) return null;
  const rest = e.slice(q + 1);
  /* the ':' that closes this '?': nested ternaries in the first arm count */
  let open = 0, colon = -1;
  for (const k of topLevel(rest, (u, j) => isQ(u, j) || u[j] === ':')) {
    if (rest[k] === '?') open++;
    else if (open === 0) { colon = k; break; } else open--;
  }
  if (colon < 0) return null;
  const a = keysOf(rest.slice(0, colon)), b = keysOf(rest.slice(colon + 1));
  return a && b ? a.concat(b) : null;
}
/* the parts an object literal names; null when it is not one, or spreads */
function partsOf(e) {
  e = unwrap(e);
  if (e[0] !== '{' || closeOf(e, 0) !== e.length) return null;
  const inner = e.slice(1, -1);
  const names = [];
  let a = 0;
  for (const c of topLevel(inner, (u, k) => u[k] === ',').concat([inner.length])) {
    const ent = inner.slice(a, c).trim(); a = c + 1;
    if (!ent) continue;
    if (ent.startsWith('...')) return null;
    const m = /^(['"]?)([A-Za-z_$][\w$]*)\1\s*(:|$)/.exec(ent);
    if (!m) return null;
    names.push(m[2]);
  }
  return names;
}
const wordsIn = (row, out = []) => {
  if (typeof row === 'string') out.push(row);
  else if (row && typeof row === 'object') for (const v of Object.values(row)) wordsIn(v, out);
  return out;
};
const namesIn = (row) => new Set(wordsIn(row).flatMap((w) => [...w.matchAll(/\{(\w+)\}/g)].map((m) => m[1])));
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

/** The faults of one file that reads the table: [check, words][]; `null`
 *  when the file neither imports say.js nor a table. */
function readerFaults(f, raw, tbls) {
  const src = blankComments(raw);
  const out = [];
  const sayImp = /import\s*\{([^}]*)\}\s*from\s*['"][^'"]*game\/say\.js['"]/.exec(src);
  const imps = [...src.matchAll(/import\s*\{\s*SAY(?:\s+as\s+([A-Za-z_$][\w$]*))?\s*\}\s*from\s*['"][^'"]*data\/say\/(\w+)\.js['"]/g)];
  const anyTable = [...src.matchAll(/from\s*['"][^'"]*data\/say\/[^'"]*['"]/g)];
  if (!sayImp && !anyTable.length) return null;
  if (anyTable.length !== imps.length) out.push([7, f + ': imports a table some other way than `import { SAY } from` / `import { SAY as X } from`']);
  if (imps.length && !sayImp) out.push([7, f + ': reads its table without say.js']);
  const table = Object.create(null);   // the name it is read by -> [screen, SAY]
  for (const m of imps) {
    if (!tbls[m[2]]) { out.push([7, f + ': imports a table that is not there (' + m[2] + ')']); continue; }
    table[m[1] || 'SAY'] = [m[2], tbls[m[2]]];
    /* v2.3.6321: every '<screen>.<what>' written in the file is in its table */
    for (const k of new Set([...src.matchAll(new RegExp("'(" + m[2] + "\\.[A-Za-z0-9]+)'", 'g'))].map((x) => x[1]))) {
      if (!has(tbls[m[2]], k)) out.push([7, f + ': names ' + k + ', not in ' + SAY_DIR + '/' + m[2] + '.js']);
    }
  }
  const readers = sayImp ? sayImp[1].split(',').map((x) => x.trim()).filter(Boolean)
    .map((x) => { const p = x.split(/\s+as\s+/); return p[p.length - 1]; }) : [];
  let calls = 0;
  for (const name of readers) {
    for (const m of src.matchAll(new RegExp('(?<![\\w$.])' + name.replace(/\$/g, '\\$') + '\\s*\\(', 'g'))) {
      calls++;
      const line = src.slice(0, m.index).split('\n').length;
      const at = f + ':' + line + ' ' + name + '(';
      const a = argsOf(src, m.index + m[0].length - 1);
      const t = table[a[0]];
      if (!t) { out.push([7, at + a[0] + ', ...): its first argument is not a table this file imports']); continue; }
      const keys = keysOf(a[1] || '');
      if (!keys) { out.push([7, at + a[0] + ', ' + (a[1] || '') + '): the key is not a single-quoted \'' + t[0] + '.<what>\' or a ternary of them']); continue; }
      const rows = [];
      for (const k of keys) {
        if (!has(t[1], k)) out.push([7, at + 'SAY, ' + k + '): not in ' + SAY_DIR + '/' + t[0] + '.js']);
        else rows.push([k, t[1][k]]);
      }
      /* 8. the parts */
      const parts = a.length > 2 ? partsOf(a[2]) : [];
      if (parts === null) continue;   // handed over whole: not read
      const used = new Set();
      for (const [k, row] of rows) {
        for (const n of namesIn(row)) {
          used.add(n);
          if (!parts.includes(n)) out.push([8, at + 'SAY, ' + k + '): its row asks for {' + n + '}, not passed']);
        }
      }
      for (const p of parts) if (p !== 'n' && rows.length && !used.has(p)) out.push([8, at + 'SAY, ' + keys.join(' / ') + '): part ' + p + ' is in no row']);
    }
  }
  return { faults: out, calls };
}

const walk = (d, out) => {
  for (const e of readdirSync(join(ROOT, d)).sort()) {
    if (e === 'node_modules') continue;
    const p = d + '/' + e;
    if (statSync(join(ROOT, p)).isDirectory()) walk(p, out);
    else if (/\.(js|jsx|mjs)$/.test(e)) out.push(p);
  }
  return out;
};
{
  const bad7 = [], bad8 = [];
  let readers = 0, calls = 0;
  for (const f of walk('src', [])) {
    if (f.startsWith(SAY_DIR + '/') || f === 'src/game/say.js') continue;   // the table itself, and the reader's own header
    const r = readerFaults(f, readFileSync(join(ROOT, f), 'utf8'), tables);
    if (!r) continue;
    readers++; calls += r.calls;
    for (const [n, w] of r.faults) (n === 7 ? bad7 : bad8).push(w);
  }
  check('7. the readers: ' + readers + ' file(s), ' + calls + ' calls, each a table it imports and a key that table has', bad7.length === 0 && readers > 0 && calls > 0, bad7);
  check('8. the parts: every {name} a row asks for is passed, and nothing else', bad8.length === 0, bad8);
}

/* 9. the break proof of 7 and 8, every run: a scratch screen's faults */
{
  const T9 = { demo: Object.freeze({ 'demo.a': 'A', 'demo.b': 'B {who}', 'demo.c': { one: '{n} C', other: '{n} Cs' } }) };
  const ok = `import { SAY } from '@/data/say/demo.js';
import { say, sayPieces as pieces } from '@/game/say.js';
/* say(SAY, "not a call") */
const x = say(SAY, on ? 'demo.a' : (y?.z ?? 1) ? 'demo.c' : 'demo.b', { who: <b key="w">{name}</b>, n });
const p = pieces(SAY, 'demo.b', { 'who': f(a, b) });
const q = say(SAY, 'demo.c', opts);
`;
  const r0 = readerFaults('ok.jsx', ok, T9);
  check('9. a scratch screen that reads well passes 7 and 8', r0 && r0.faults.length === 0 && r0.calls === 3, r0);
  const breaks = [
    [7, 'a double-quoted key', `say(SAY, "demo.a")`],
    [7, 'a key built with +', `say(SAY, 'demo.' + w)`],
    [7, 'a key in a variable', `say(SAY, k)`],
    [7, 'a key the table lacks', `say(SAY, on ? 'demo.a' : 'demo.zz')`],
    [7, 'a table it did not import', `say(OTHER, 'demo.a')`],
    [8, 'a part a row asks for, not passed', `say(SAY, 'demo.b', { whom: 1 })`],
    [8, 'a row asking for a part, no parts', `pieces(SAY, 'demo.b')`],
    [8, 'a part no row uses', `say(SAY, 'demo.a', { who: 1 })`],
  ];
  const head = `import { SAY as T } from '@/data/say/demo.js';\nimport { say, sayPieces as pieces } from '@/game/say.js';\n`;
  const missed = [];
  for (const [n, what, line] of breaks) {
    const r = readerFaults('scratch.jsx', head + line.replace(/\bSAY\b/, 'T') + ';\n', T9);
    if (!r || !r.faults.some((x) => x[0] === n)) missed.push(n + ': ' + what);
  }
  check('9. the break proof: ' + breaks.length + ' scratch calls each fail their check', missed.length === 0, missed);
}

process.exit(failed ? 1 : 0);
