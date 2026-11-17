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
 *      name or a tag outside words.js.  KNOWN lists the joins that are not a
 *      player's words, each with why.
 * Break proof (tried by hand): the store's note put back as a joined string ->
 * 4 and 5 red. */
import { readdirSync, readFileSync } from 'node:fs';
import { WORDS as W_SERVER, wordsFill, wordsNote } from '../src/words.js';
import { WORDS as W_PAGE, fillWords } from '../../src/data/words.js';
import { mailLine } from '../../src/game/postOffice.js';

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
  check('2: "sold to", "trade from" and the clan war read exactly as before',
    wordsFill('sold_to', { item: label, buyer: buyerName, price }) === old1
    && wordsFill('trade_from', { from: 'Bro99' }) === old2
    && wordsFill('clan_war', { tag: 'IRON', outcome: ' — victory' }) === old3,
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
  const older = typeof mailLine === 'function' ? mailLine({ kind: 'gold', source: 'market', payload: { amount: 1 }, note: 'Axe sold to X for 1', noteT: { t: 'no_such', p: {} } }) : null;
  check('4: a template the page\'s table lacks keeps the worker\'s own sentence', older && older.note === 'Axe sold to X for 1', older);
}

/* ── 5. the census ── */
const RE = /'[^'\n]*[A-Za-z] [^'\n]*'\s*\+\s*\(?\s*[\w.\[\]'?: ]*?(?:[Nn]ame|[Tt]ag)\b|(?:[Nn]ame|[Tt]ag)\b[\w.\]\)]*\s*\+\s*'[^'\n]*[A-Za-z] [^'\n]*'|`[^`\n]*[A-Za-z] [^`\n]*\$\{[^}]*(?:[Nn]ame|[Tt]ag)\b[^}]*\}[^`\n]*`/;
const KNOWN = Object.freeze({
  'gold.js': 'GOLD_ROADS\' own check: a road\'s name in the worker\'s refusal of its own table, never a player\'s',
  'risechest.js': 'the rise\'s name, a place of the game\'s (wheel plan), not a player\'s',
});
const LINE = 3;   /* v2.3.5197: clans.js's three refusals that say the tag the player asked for back to them (clan_error) */
{
  const found = [];
  for (const f of readdirSync(new URL('../src/', import.meta.url)).filter((x) => x.endsWith('.js') && x !== 'words.js')) {
    readFileSync(new URL('../src/' + f, import.meta.url), 'utf8').split('\n').forEach((l, i) => {
      const t = l.trim();
      if (t.startsWith('*') || t.startsWith('//') || t.startsWith('/*') || /console\.|throw |new Error/.test(l)) return;
      if (RE.test(l) && !KNOWN[f]) found.push(f + ':' + (i + 1));
    });
  }
  check(`5: server strings joined with a name or a tag outside words.js (${found.length}) are at or under the line (${LINE})`, found.length <= LINE, found);
}

console.log(failures ? `\n${failures} FAILED` : '\nALL PASS');
process.exit(failures ? 1 : 0);
