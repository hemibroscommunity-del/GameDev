/* ═══ v2.3.5103: TESTS FIND CODE BY SYSTEM (grand plan step 5.2b, card B PR 4) ═══
 *
 * Two holds:
 *
 *   1. the helper (tools/guards/lib/filesOf.mjs) gives every system's files,
 *      as the map places them: every system has files, every mapped file is
 *      given by exactly one name, an unknown name throws, and findIn finds
 *      by line;
 *   2. the suites that name a big file by its path only fall: a suite
 *      (server/test/, tools/guards/) naming a big file (the four lines'
 *      files with a line of their own) that is not on the census
 *      (lib/bigFileSuitesKnown.mjs) fails.  A census (rule 3): a pair gone is
 *      room, printed; `--write` takes the gone pairs off and never adds one.
 *      No big file moves before the suites that read it are converted.
 *
 * BREAK PROOF (rule 8), each tried by hand, 2026-11-14:
 *   1. filesOf: `return [...placed().bySystem[system]].slice(1);`   -> FAIL 1
 *   2. a server/test/zz.test.mjs that reads BroTown.jsx by its path from the
 *      repository's root (no line on the census)                    -> FAIL 2
 *
 * Run from the repository's root:
 *   node tools/guards/tests-by-system.test.mjs           the checks
 *   node tools/guards/tests-by-system.test.mjs --write   take the gone pairs off the census
 * (cd server && npm test runs it with every other guard and suite).
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { filesOf, readSystem, findIn, systemNames } from './lib/filesOf.mjs';
import { placeFiles, ROOT } from './lib/systems.mjs';
import { readersOfBigFiles, renderKnown, bigFiles } from './lib/bigFileSuites.mjs';
import { KNOWN } from './lib/bigFileSuitesKnown.mjs';

const now = readersOfBigFiles();

if (process.argv.includes('--write')) {
  /* only ever REMOVES: the pairs both on the census and still true */
  const kept = Object.create(null);
  for (const [s, files] of Object.entries(KNOWN)) {
    const still = files.filter((b) => (now[s] || []).includes(b));
    if (still.length) kept[s] = still;
  }
  writeFileSync(join(ROOT, 'tools/guards/lib/bigFileSuitesKnown.mjs'), renderKnown(kept));
  const n = (m) => Object.values(m).reduce((a, x) => a + x.length, 0);
  console.log(`census: ${n(KNOWN)} -> ${n(kept)} pairs (nothing added)`);
  process.exit(0);
}

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 900)));
};

/* ── 1. the helper ── */
{
  const placed = placeFiles();
  const all = [...Object.values(placed.bySystem).flat(), ...placed.unsorted];
  const given = new Map();
  for (const n of systemNames()) for (const f of filesOf(n)) given.set(f, (given.get(f) || 0) + 1);
  const empty = systemNames().filter((n) => n !== 'unsorted' && filesOf(n).length === 0);
  check(`1: every system has files (${systemNames().length - 1} systems)`, empty.length === 0, empty);
  const off = all.filter((f) => given.get(f) !== 1);
  check(`1: every mapped file (${all.length}) is given by exactly one name`, off.length === 0 && given.size === all.length, off.slice(0, 20));
  let threw = false;
  try { filesOf('ecnomy'); } catch { threw = true; }
  check('1: an unknown name throws (a typo never reads as "no files, green")', threw);
  /* (by the name alone: this guard names no big file by its path, as it asks of the rest) */
  check('1: the big files are where the map puts them (BroTown.jsx in ui, wsClient.js in wire)',
    filesOf('ui').some((f) => f.endsWith('/BroTown.jsx')) && filesOf('wire').some((f) => f.endsWith('/wsClient.js')));
  const hit = findIn('economy', /export function _goldGive|_goldGive\s*\(/);
  check('1: findIn finds by line (_goldGive in economy\'s gold.js)', hit.some((h) => h.file === 'server/src/gold.js' && h.line > 0), hit.slice(0, 3));
  const js = readSystem('desktop', { only: /\.js$/ });
  check('1: readSystem reads the files, and `only` keeps some', js.size > 0 && [...js.keys()].every((f) => f.endsWith('.js')) && [...js.values()].every((s) => s.length > 0));
}

/* ── 2. the suites that name a big file by its path only fall ── */
{
  const added = [];
  const gone = [];
  for (const [s, files] of Object.entries(now)) for (const b of files) if (!(KNOWN[s] || []).includes(b)) added.push(`${s} names ${b}`);
  for (const [s, files] of Object.entries(KNOWN)) for (const b of files) if (!(now[s] || []).includes(b)) gone.push(`${s}: ${b}`);
  const pairs = Object.values(now).reduce((a, x) => a + x.length, 0);
  check(`2: no new suite names a big file by its path (${pairs} pairs in ${Object.keys(now).length} suites, over ${bigFiles().length} big files): `
    + 'read code by system (tools/guards/lib/filesOf.mjs)', added.length === 0, added);
  if (gone.length) console.log(`     (room: ${gone.length} pair(s) on the census are gone: node tools/guards/tests-by-system.test.mjs --write)\n       ${gone.slice(0, 10).join('\n       ')}`);
}

console.log(failed ? `\n${failed} FAILED` : '\nall green');
process.exit(failed ? 1 : 0);
