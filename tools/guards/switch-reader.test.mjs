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
 *   4. The page's reader follows its address: a page may change its own
 *      (history.replaceState), and the reader answers for it as it is now.
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
 *   - the reader made to keep its first address (`if (_page) return _page`)
 *                                        -> FAIL 4 (true,true,true)
 *   - `?gearretry` (it needs `?retrylooks`) listed as moved
 *                                        -> FAIL 1 (?retrylooks=0: old false,
 *                                           reader true)
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
const OUTSIDE_LINE = 204;   /* its first count, v2.3.5306: 228 with sitting 17's `?slimewalk` (card P's slimeSprites.js, P still running: not moved), 221 after the first seven reads moved; 212 after v2.3.5309's nine; 204 after v2.3.5232's eight (card O PR 12: the lanes' off-ramps) */

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
  /* v2.3.5309: quests, skills, economy, townsfolk, audio (the systems with the fewest reads, their files held by no running card) */
  { name: 'questpath', call: 'sw', file: 'src/game/questTrailStyle.js', old: (S) => new URLSearchParams(S).has('questpath') },
  { name: 'treefade', call: 'sw', file: 'src/game/tierTrees.js', old: (S) => /(^|[?&])treefade=0(&|$)/.test(S || '') },
  { name: 'droplines', call: 'sw', file: 'src/game/dropLines.js', old: (S) => /[?&]droplines=0\b/.test(S || '') },
  { name: 'equipredraw', call: 'sw', file: 'src/game/gearWornSync.js', old: (S) => /[?&]equipredraw=0\b/.test(S || '') },
  { name: 'townchat', call: 'sw', file: 'src/game/townChatter.js', old: (S) => /[?&]townchat=0(?:&|$)/.test(S) },
  { name: 'folkwalk', call: 'sw', file: 'src/game/townsfolkDay.js', old: (S) => /(^|[?&])folkwalk=0(&|$)/.test(S || '') },
  { name: 'nobeds', call: 'sw', file: 'src/game/ambientBeds.js', old: (S) => /[?&]nobeds(?:[&=]|$)/.test(S) },
  { name: 'noforge', call: 'sw', file: 'src/game/townAmbience.js', old: (S) => /[?&]noforge(?:[&=]|$)/.test(S) },
  { name: 'sounds', call: 'swHas', file: 'src/game/soundStudio.js', old: (S) => /[?&]sounds(=|&|$)/.test(S) },
  /* v2.3.5232 (card O PR 12): the lanes' off-ramps (the values -- ?lane, ?govern, ?crowd, ?onebatch, ?lookpalette, ?pixbudget, ?res, ?zoom -- read by swValue, their old patterns held to the value) */
  { name: 'ladderrate', call: 'sw', file: 'src/game/drawLanes.js', old: (S) => /(^|[?&])ladderrate=(0|off|false)(&|$)/.test(typeof S === 'string' ? S : '') },
  { name: 'ladderpix', call: 'sw', file: 'src/game/drawLanes.js', old: (S) => /(^|[?&])ladderpix=(0|off|false)(&|$)/.test(typeof S === 'string' ? S : '') },
  { name: 'ladderpass', call: 'sw', file: 'src/game/drawLanes.js', old: (S) => /(^|[?&])ladderpass=(0|off|false)(&|$)/.test(typeof S === 'string' ? S : '') },
  { name: 'laddercrowd', call: 'sw', file: 'src/game/drawLanes.js', old: (S) => /(^|[?&])laddercrowd=(0|off|false)(&|$)/.test(typeof S === 'string' ? S : '') },
  { name: 'pace', call: 'sw', file: 'src/game/framePacer.js', old: (S) => /(^|[?&])pace=(0|off|false)(&|$)/.test(typeof S === 'string' ? S : '') },
  { name: 'nowaves', call: 'sw', file: 'src/rendering/wheelWater.js', old: (S) => /(^|[?&])nowaves(=|&|$)/.test(S || '') },
  { name: 'shadowpass', call: 'sw', file: 'src/rendering/lightfx/shadows.js', old: (S) => /[?&]shadowpass\b/.test(S || '') },
  { name: 'sheenpass', call: 'sw', file: 'src/rendering/lightfx/sheenBatch.js', old: (S) => /[?&]sheenpass(=|&|$)/.test(S || '') },
]);

/* v2.3.5306 (the gatekeeper's low, sitting 18): and each switch its row
   needs, thrown alone and beside it -- the old test never saw a need, so a
   moved read whose row has one is held to answer as it did (a move that
   would add a need's meaning is a change of meaning, and fails) */
const neededWords = (n) => {
  const r = SWITCHES.find((x) => x.name.replace(/^\?/, '') === n && x.side !== 'worker');
  return r ? r.needs.map((m) => m.replace(/^\?/, '')).filter((m) => SWITCHES.some((x) => x.side !== 'worker' && x.name.replace(/^\?/, '') === m))
    .map((m) => { const f = pageForm(SWITCHES.find((x) => x.name.replace(/^\?/, '') === m)); return f === '*' ? null : `${m}${f === '' ? '' : '=' + f.split('|')[0]}`; }).filter(Boolean) : [];
};
const ADDRESSES = (n) => ['', `?${n}`, `?${n}=`, `?${n}=0`, `?${n}=1`, `?${n}=off`, `?${n}=false`, `?${n}=7`,
  `?x${n}=0`, `?${n}x=0`, `?a=1&${n}=0`, `?${n}=0&b=2`, `?a=1&${n}`,
  ...neededWords(n).flatMap((w) => [`?${w}`, `?${n}=1&${w}`])];

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
      if (!/from\s+['"](?:@|\.{1,2})?(?:\/(?:[\w-]+|\.\.))*\/switches(?:\.js)?['"]/.test(code)) continue;   /* v2.3.5232: and `../../` */
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

/* 4. the page's reader follows its address when the page changes it
   (v2.3.5306, the gatekeeper's medium: history.replaceState drops `create`,
   `login`, `noresume`; tests flip a switch mid-page) */
{
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'location');
  const mod = await import(pathToFileURL(join(ROOT, READER_FILE)).href + '?follow');
  const seen = [];
  try {
    Object.defineProperty(globalThis, 'location', { value: { search: '?starcue=0' }, configurable: true, writable: true });
    seen.push(mod.sw('starcue'));
    globalThis.location.search = '';
    seen.push(mod.sw('starcue'));
    globalThis.location.search = '?a=1&starcue=0';
    seen.push(mod.sw('starcue'));
  } finally {
    if (saved) Object.defineProperty(globalThis, 'location', saved); else delete globalThis.location;
  }
  check('4: the page\'s reader answers for the address as it is now (a page that changes its own address is read again)', seen.join() === 'true,false,true', seen);
}

console.log(failed ? `\n${failed} FAILED` : '\nall green');
process.exit(failed ? 1 : 0);
