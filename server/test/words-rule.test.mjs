/* THE WORDS RULE -- v2.3.5197 (server/src/words.js, src/data/words.js; grand
 * plan step 11.4; card K PR 12; docs/specs/words-rule.md).
 *
 * A sentence the worker builds around a player's words (a name, a clan's tag)
 * goes out as a template and its parts, the page filling it from the game's
 * own table; what a player reads stays word for word the same.
 *   1. THE TWO TABLES are one: the worker's WORDS and the page's are equal.
 *   2. WORD FOR WORD: each converted sentence reads exactly as it did (the
 *      store's "sold to", the trade's "trade from", the clan war's).
 *   3. WORDS STAY WORDS: a part is put in as text -- a name that looks like a
 *      template ("{price}") is never filled.
 *   4. THROUGH THE MAIL: a store sale's mail carries the note AND its template
 *      (an older phone reads the note), and the page's mail line fills it.
 *   5. THE CENSUS (rule 3: its line only falls): a server string joined with a
 *      field the wire table marks `words`, or a stored name, outside words.js
 *      (v2.3.5197, sitting 30: read as the parser reads strings, a join over
 *      lines, a template, a spaced list join).  KNOWN lists the sites that
 *      are not a player's words, each by its file and words, with why.
 * Break proof (tried by hand): the store's note put back as a joined string ->
 * 4 and 5 red; trade2.js's "trade with" put back -> 5 red. */
import { readdirSync, readFileSync } from 'node:fs';
import { WORDS as W_SERVER, wordsFill, wordsNote } from '../src/words.js';
import { WORDS as W_PAGE, fillWords } from '../../src/data/words.js';
import { mailLine } from '../../src/game/postOffice.js';
import { findIn } from '../../tools/guards/lib/filesOf.mjs';
import { WIRE_IN } from '../src/wire/in.js';
import { WIRE_HTTP } from '../src/wire/http.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS ' + name);
  else { failures++; console.log('FAIL ' + name + ' ' + JSON.stringify(detail === undefined ? {} : detail).slice(0, 400)); }
}

/* ── 1. one table ── */
check('1: the worker\'s sentences and the page\'s are one table', JSON.stringify(W_SERVER) === JSON.stringify(W_PAGE), { s: Object.keys(W_SERVER), p: Object.keys(W_PAGE) });

/* ── 2. word for word ── */
{
  const label = 'Mythic Axe', buyerName = 'Bro99', price = 120;
  const old1 = label + ' sold to ' + (buyerName || 'someone') + ' for ' + price;
  const old2 = 'trade from ' + 'Bro99';
  const old3 = 'clan war vs [' + 'IRON' + ']' + ' — victory';
  const old4 = 'trade with ' + 'Bro99';
  check('2: "sold to", "trade from", "trade with" and the clan war read exactly as before',
    wordsFill('sold_to', { item: label, buyer: buyerName, price }) === old1
    && wordsFill('trade_from', { from: 'Bro99' }) === old2
    && wordsFill('clan_war', { tag: 'IRON', outcome: ' — victory' }) === old3
    && wordsFill('trade_with', { from: 'Bro99' }) === old4,
    [wordsFill('sold_to', { item: label, buyer: buyerName, price }), wordsFill('trade_from', { from: 'Bro99' }), wordsFill('clan_war', { tag: 'IRON', outcome: ' — victory' })]);
}

/* ── 3. words stay words ── */
{
  const n = wordsNote('sold_to', { item: 'Axe', buyer: '{price} (admin)', price: 5 });
  check('3: a name that looks like a template is put in as text, never filled', n.note === 'Axe sold to {price} (admin) for 5' && fillWords(n.noteT) === n.note, n);
}

/* ── 4. through the mail ── */
{
  const src = readFileSync(new URL('../src/store.js', import.meta.url), 'utf8');
  check('4: the store\'s sale mail is made by wordsNote (its note and its template)', /\.\.\.wordsNote\('sold_to'/.test(src));
  const e = { kind: 'gold', source: 'market', payload: { amount: 120 }, ...wordsNote('sold_to', { item: 'Mythic Axe', buyer: 'Bro99', price: 120 }) };
  const line = typeof mailLine === 'function' ? mailLine(e) : null;
  check('4: the page\'s mail line fills the template, word for word the note', line && line.note === 'Mythic Axe sold to Bro99 for 120', line);
  /* v2.3.5197 (the gatekeeper, sitting 30): the page's other two readers of
     a delivery's note -- its chat line and the market's toast -- fill it too */
  /* found by system (tools/guards/lib/filesOf.mjs), never by the file's path */
  const said = findIn('wire', /const _said = \(_e\.noteT && fillWords\(_e\.noteT\)\) \|\| _e\.note;/);
  const joined = findIn('wire', /_e\.note \?/);
  check('4: the chat line and the market\'s toast read the note from its template', said.length === 1 && joined.length === 0, { said, joined });
  const older = typeof mailLine === 'function' ? mailLine({ kind: 'gold', source: 'market', payload: { amount: 1 }, note: 'Axe sold to X for 1', noteT: { t: 'no_such', p: {} } }) : null;
  check('4: a template the page\'s table lacks keeps the worker\'s own sentence', older && older.note === 'Axe sold to X for 1', older);
}

/* ── 5. the census ── */
/* v2.3.5197 (the gatekeeper, sitting 30): the words are the TABLE's -- every
   field a row of server/src/wire/ marks `words` (its last name: `name`,
   `text`, `tag`, `note`, ...) -- and a stored name (a name ending `Name` or
   `Tag`, and STORED).  A sentence (a string with a word and a space) joined to
   one with `+` (either side, over lines, a bracketed operand whole), a
   template literal holding one, or a list holding one joined with a spaced
   separator: each a site, outside words.js.  Strings and comments are read as
   the parser reads them, never by line. */
const STORED = Object.freeze(['who', 'buyer', 'seller']);
const FIELDS = new Set(STORED);
for (const r of [...WIRE_IN, ...WIRE_HTTP]) for (const [k, v] of Object.entries(r.trust || {})) if (v === 'words') FIELDS.add(k.split('.').pop());
const isW = (id) => FIELDS.has(id) || /[a-z0-9](Name|Tag)$/.test(id);
const idsOf = (s) => s.match(/[A-Za-z_$][\w$]*/g) || [];
/* the file as a skeleton: comments blanked, each string literal one token
   `S<n>_` (its text and a template's parts kept aside) */
function skeleton(src) {
  const lits = []; let out = ''; let i = 0;
  while (i < src.length) {
    const c = src[i], n = src[i + 1];
    if (c === '/' && n === '*') { const j = src.indexOf('*/', i + 2); const e = j < 0 ? src.length : j + 2; out += src.slice(i, e).replace(/[^\n]/g, ' '); i = e; continue; }
    if (c === '/' && n === '/') { const j = src.indexOf('\n', i); const e = j < 0 ? src.length : j; out += ' '.repeat(e - i); i = e; continue; }
    if (c === "'" || c === '"' || c === '`') {
      let j = i + 1, text = '';
      const parts = [];
      while (j < src.length && src[j] !== c) {
        if (src[j] === '\\') { text += src[j + 1]; j += 2; continue; }
        if (c === '`' && src[j] === '$' && src[j + 1] === '{') { let d = 1, k = j + 2; while (k < src.length && d) { if (src[k] === '{') d++; else if (src[k] === '}') d--; k++; } parts.push(src.slice(j + 2, k - 1)); text += '\u0000'; j = k; continue; }
        text += src[j]; j++;
      }
      const tok = 'S' + lits.length + '_';
      lits.push({ text, parts, tpl: c === '`' });
      out += tok + src.slice(i, j + 1).replace(/[^\n]/g, ' ').slice(tok.length);
      i = j + 1; continue;
    }
    out += c; i++;
  }
  return { out, lits };
}
const sentence = (s) => /[A-Za-z]\s+\S|\S\s+[A-Za-z]/.test(s.replace(/\u0000/g, 'x'));
const OPER = /^[\w$.\[\]?:|!]+/;
/* the sites in one file's text: [{ line, text }] */
function wordsSites(src) {
  const { out: sk, lits } = skeleton(src);
  const lines = src.split('\n');
  const at = new Map();
  const add = (i) => { const line = sk.slice(0, i).split('\n').length; at.set(line, lines[line - 1].trim()); };
  const lit = (t) => lits[Number(t.slice(1, -1))];
  const opW = (o) => idsOf(o.replace(/S\d+_/g, '')).some(isW);
  const group = (j, open, close, step) => { let d = 0, k = j; do { if (sk[k] === open) d++; else if (sk[k] === close) d--; k += step; } while (k >= 0 && k < sk.length && d); return step > 0 ? sk.slice(j, k) : sk.slice(k + 1, j + 1); };
  const after = (i) => { let j = i; while (/\s/.test(sk[j])) j++; if (sk[j] === '(') return group(j, '(', ')', 1); const r = OPER.exec(sk.slice(j)); return r ? r[0] : ''; };
  const before = (i) => { let j = i - 1; while (j >= 0 && /\s/.test(sk[j])) j--; if (sk[j] === ')') return group(j, ')', '(', -1); const r = /[\w$.\[\]?:|!]+$/.exec(sk.slice(Math.max(0, j - 200), j + 1)); return r ? r[0] : ''; };
  const plus = /(S\d+_)\s*\+|\+\s*(S\d+_)/g;
  let m;
  while ((m = plus.exec(sk))) {
    const s = m[1] || m[2];
    const o = m[1] ? after(m.index + m[0].length) : before(m.index);
    if (sentence(lit(s).text) && opW(o)) add(m.index);
    plus.lastIndex = m.index + 1;
  }
  lits.forEach((L, k) => { if (L.tpl && L.parts.length && sentence(L.text) && L.parts.some((p) => idsOf(p).some(isW))) add(sk.indexOf('S' + k + '_')); });
  const join = /\[([^\[\]]*)\]\s*(?:\.filter\([^)]*\)\s*)?\.join\(\s*(S\d+_)\s*\)/g;
  while ((m = join.exec(sk))) if (/\s/.test(lit(m[2]).text) && opW(m[1])) add(m.index);
  return [...at].map(([line, text]) => ({ line, text }));
}
/* the scan's own forms (the gatekeeper's, sitting 30): each must be a site */
{
  const forms = [
    "const a = 'gift from ' + who;",
    'const b = `sold to ${buyer}`;',
    "const c = ['a gift from', p.name].join(' ');",
    "const d = 'trade with '\n  + (x === s.a ? s.aName : s.bName);",
    "const e = ps.name + ' joined the clan';",
  ];
  const missed = forms.filter((f) => wordsSites(f).length !== 1);
  const quiet = ["const f = 'no name here' + count;", "// 'gift from ' + who", "const g = 'a ' + 'b';", "const h = [a, b].join('|') + ' x' + n;"].filter((f) => wordsSites(f).length);
  check('5: the scan finds a join over `+` either side and over lines, a template, a spaced join; none in a comment or with no player\'s words', !missed.length && !quiet.length, { missed, quiet });
}
/* the sites that are not a player's words, each by its file and its words */
const KNOWN = Object.freeze([
  { f: 'gold.js', has: 'bad.push(name', why: 'GOLD_ROADS\' own check: a road\'s name in the worker\'s refusal of its own table, never a player\'s' },
  { f: 'risechest.js', has: "'The chest on ' + (r.name", why: 'the rise\'s name, a place of the game\'s (wheel plan), not a player\'s' },
]);
const LINE = 4;   /* v2.3.5197: clans.js's four refusals that say the tag the player asked for back to them (clan_error) */
{
  const found = [];
  for (const f of readdirSync(new URL('../src/', import.meta.url)).filter((x) => x.endsWith('.js') && x !== 'words.js')) {
    for (const s of wordsSites(readFileSync(new URL('../src/' + f, import.meta.url), 'utf8'))) {
      if (!KNOWN.some((k) => k.f === f && s.text.includes(k.has))) found.push(f + ':' + s.line);
    }
  }
  check(`5: server strings joined with a player's words (the table's \`words\` fields, a stored name) outside words.js (${found.length}) are at or under the line (${LINE})`, found.length <= LINE, found);
}

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
