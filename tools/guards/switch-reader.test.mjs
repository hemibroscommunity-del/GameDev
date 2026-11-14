/* ═══ v2.3.5306: THE PAGE'S ONE READER HOLDS (grand plan step 7.1, card T PR 6) ═══
 *
 * src/game/switches.js reads the page's address once and answers every
 * switch by its name (`sw`, `swHas`, `swValue`).  This guard holds:
 *
 *   1. A MOVE CHANGES NO ADDRESS'S MEANING.  Each read moved into the reader
 *      (MOVED below: its old test, kept here word for word) gives the same
 *      answer as the reader on a fixed set of addresses: the name absent;
 *      present; `=` empty; `=0`, `=1`, `=off`, `=false`; a value; the name
 *      inside a longer name (before and after); beside another name.  And
 *      its file asks the reader as the row says (the call is there).
 *   2. Every ask of the reader in src/ names a row of the switch table on the
 *      page's side, and `sw` only a row with a form (`swValue` reads a
 *      value's): an ask that can never be thrown is a mistake.
 *   3. THE OUTSIDE READS (a census, only falls; the gatekeeper's): the reads
 *      of `location.search` in src/ outside the reader, code only (comments
 *      blanked).  Card T's PRs 7 on lower it as reads move in.
 *
 * BREAK PROOF (rule 8), tried by hand once, 2026-11-14:
 *   - `?nmlask`'s old test made to also take `off` (/[?&]nmlask=(0|off)/):
 *     a moved read that answers `=off` differently
 *                                        -> FAIL 1 (nmlask: ?nmlask=off old
 *                                           true, reader false)
 *   - a `location.search` read added to src/game/dice.js
 *                                        -> FAIL 3 (one over the line)
 *   - `sw('lane')` in a moved file (`?lane` is a value)
 *                                        -> FAIL 2
 *
 * Run from the repository's root: node tools/guards/switch-reader.test.mjs
 * (cd server && npm test runs it with every other guard and suite).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { SWITCHES } from './lib/switches.mjs';
import { blankComments, pageFiles, pageForm, READER_FILE, ROOT } from './lib/switchScan.mjs';

/* the outside reads: only falls */
const OUTSIDE_LINE = 220;   /* its first count, v2.3.5306 (227 before the first seven reads moved) */

/* ── the reads moved into the reader: each old test word for word, as a
   function of the address (S) ── */
const MOVED = Object.freeze([
  { name: 'starcue', call: 'sw', file: 'src/ui/starCue.js', old: (S) => new URLSearchParams(S).get('starcue') === '0' },
  { name: 'guidearrow', call: 'sw', file: 'src/ui/guideArrow.js', old: (S) => new URLSearchParams(S).get('guidearrow') === '0' },
  { name: 'guidearrow', call: 'sw', file: 'src/ui/deskTeach.js', old: (S) => new URLSearchParams(S).get('guidearrow') === '0' },
  { name: 'nmlask', call: 'sw', file: 'src/game/nmlAsk.js', old: (S) => /[?&]nmlask=0(?:&|$)/.test(S || '') },
  { name: 'loginspin', call: 'sw', file: 'src/ui/mobile/LoginSpinWindow.jsx', old: (S) => /(?:^|[?&])loginspin=0(?:&|$)/.test(S) },
  { name: 'nomapdetail', call: 'swHas', file: 'src/ui/worldMapDetail.js', old: (S) => /[?&]nomapdetail(?:[=&]|$)/.test(S) },
  { name: 'tapthrough', call: 'swHas', file: 'src/ui/swallowTapClick.js', old: (S) => /[?&]tapthrough(=|&|$)/.test(S || '') },
]);

const ADDRESSES = (n) => ['', `?${n}`, `?${n}=`, `?${n}=0`, `?${n}=1`, `?${n}=off`, `?${n}=false`, `?${n}=7`,
  `?x${n}=0`, `?${n}x=0`, `?a=1&${n}=0`, `?${n}=0&b=2`, `?a=1&${n}`];

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 900)));
};

const { readerFor } = await import(pathToFileURL(join(ROOT, READER_FILE)).href);
const files = pageFiles();
const src = new Map(files.map((f) => [f, readFileSync(join(ROOT, f), 'utf8')]));

/* 1. each moved read answers as it did */
{
  const differ = [];
  const missing = [];
  for (const m of MOVED) {
    for (const S of ADDRESSES(m.name)) {
      const was = m.old(S);
      const now = readerFor(S)[m.call](m.name);
      if (was !== now) differ.push(`${m.name} (${m.file}): ${S || '(none)'} old ${was}, reader ${now}`);
    }
    const code = src.has(m.file) ? blankComments(src.get(m.file)) : '';
    if (!new RegExp(`(?<![\\w$.])${m.call}\\(\\s*['"]\\??${m.name}['"]`).test(code)) missing.push(`${m.file}: no ${m.call}('${m.name}')`);
  }
  check(`1: every moved read answers each fixed address as its old test did (${MOVED.length} reads, ${ADDRESSES('x').length} addresses each)`, differ.length === 0, differ);
  check('1: ...and its file asks the reader for it', missing.length === 0, missing);
}

/* 2. every ask names a page row, with a form for sw */
{
  const forms = new Map(SWITCHES.filter((r) => r.side !== 'worker').map((r) => [r.name.replace(/^\?/, ''), pageForm(r)]));
  const bad = [];
  let asks = 0;
  for (const [f, s] of src) {
    if (f === READER_FILE) continue;
    const code = blankComments(s);
    for (const m of code.matchAll(/(?<![\w$.])(sw|swHas|swValue)\(\s*(['"])\??([A-Za-z][\w-]*)\2/g)) {
      if (!/from\s+['"](?:@|\.{1,2})?(?:\/[\w-]+)*\/switches(?:\.js)?['"]/.test(code)) continue;
      asks++;
      const [, fn, , n] = m;
      if (!forms.has(n)) bad.push(`${f}: ${fn}('${n}') names no page row`);
      else if (fn === 'sw' && forms.get(n) === '*') bad.push(`${f}: sw('${n}'), but ?${n} is a value (swValue reads it)`);
    }
  }
  check(`2: every ask of the reader names a page row, sw only one with a form (${asks} asks)`, bad.length === 0, bad);
}

/* 3. the outside reads: only fall */
{
  let n = 0;
  const where = [];
  for (const [f, s] of src) {
    if (f === READER_FILE) continue;
    const k = (blankComments(s).match(/location\.search/g) || []).length;
    if (k) { n += k; where.push(`${f}: ${k}`); }
  }
  check(`3: reads of location.search outside the reader: ${n}, the line ${OUTSIDE_LINE} (it only falls: a read moves into src/game/switches.js)`, n <= OUTSIDE_LINE, where.slice(-12));
  if (n < OUTSIDE_LINE) console.log(`     (room: ${n} under the line ${OUTSIDE_LINE}; the gatekeeper may lower it)`);
}

console.log(failed ? `\n${failed} FAILED` : '\nall green');
process.exit(failed ? 1 : 0);
