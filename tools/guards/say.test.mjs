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
 *      case; no key in two files (the spec's "ONE table"); every row is
 *      words or a { phone, desk } / { one, other } form of words;
 *   7. THE READERS: a screen that imports a table reads only keys that table
 *      has (every `'<screen>.<what>'` literal in the file, v2.3.6321: a key
 *      a ternary chooses too), and reads it through say.js.
 *
 * BREAK PROOF (rule 8), tried by hand on scratch edits, 2026-11-18:
 *   - src/ui/panels/ClanInviteCard.jsx: 'clanInvite.accept' -> 'clanInvite.acept'  -> FAIL 7
 *   - src/data/say/clanInvite.js: a key 'smithy.title'                             -> FAIL 6
 *   - src/game/say.js: `const t = text;` for `plain ? deskWords(text) : text`       -> FAIL 2
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
  const owner = new Map();
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
      if (!new RegExp('^' + screen + '\\.[a-z][A-Za-z0-9]*$').test(k)) bad.push(rel + ': key ' + k + ' is not ' + screen + '.<what>');
      if (owner.has(k)) bad.push(rel + ': key ' + k + ' also in ' + owner.get(k));
      owner.set(k, rel);
      if (!okRow(v)) bad.push(rel + ': row ' + k + ' is not words or a { phone, desk } / { one, other } form');
    }
  }
  check('6. the table: ' + files.length + ' screen file(s), ' + owner.size + ' rows, each `<screen>.<what>`, once, in a leaf file', bad.length === 0, bad);
}

/* 7. the readers */
{
  const walk = (d, out) => {
    for (const e of readdirSync(join(ROOT, d)).sort()) {
      if (e === 'node_modules') continue;
      const p = d + '/' + e;
      if (statSync(join(ROOT, p)).isDirectory()) walk(p, out);
      else if (/\.(js|jsx|mjs)$/.test(e)) out.push(p);
    }
    return out;
  };
  const bad = [];
  let readers = 0, reads = 0;
  for (const f of walk('src', [])) {
    if (f.startsWith(SAY_DIR + '/') || f === 'src/game/say.js') continue;   // the table itself, and the reader's own header
    const src = readFileSync(join(ROOT, f), 'utf8');
    const m = /import\s*\{\s*SAY\s*\}\s*from\s*['"][^'"]*data\/say\/(\w+)\.js['"]/.exec(src);
    if (!m) continue;
    readers++;
    const table = tables[m[1]];
    if (!table) { bad.push(f + ': imports a table that is not there (' + m[1] + ')'); continue; }
    if (!/from\s*['"][^'"]*game\/say\.js['"]/.test(src)) bad.push(f + ': reads its table without say.js');
    /* v2.3.6321: every '<screen>.<what>' written in the file, not only the
       first argument of a call: a key chosen by a ternary
       (`say(SAY, on ? 'x.unequip' : 'x.equip')`) is read all the same */
    const keys = new Set([...src.matchAll(new RegExp("'(" + m[1] + "\\.[A-Za-z0-9]+)'", 'g'))].map((k) => k[1]));
    for (const k of keys) {
      reads++;
      if (!Object.prototype.hasOwnProperty.call(table, k)) bad.push(f + ': reads ' + k + ', not in ' + SAY_DIR + '/' + m[1] + '.js');
    }
  }
  check('7. the readers: ' + readers + ' screen(s), ' + reads + ' keys named, each one its table has', bad.length === 0 && readers > 0, bad);
}

process.exit(failed ? 1 : 0);
