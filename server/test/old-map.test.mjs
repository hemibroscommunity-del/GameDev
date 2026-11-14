/* THE OLD MAP IS RETIRED: NO PHONE TEST LANDS THERE BY ACCIDENT -- v2.3.3552
 * (tools/qa/mp/oldMap.mjs).
 *
 * The owner, 2026-10-21, seeing a test's screenshot of today's town: "Hold on
 * you're in the old map (this was retired).  You keep making that mistake so
 * flag it in a way you won't accidentally do that anymore."  This runs with
 * the server suites, so it holds on every PR, not only before a push:
 *
 *   1. every phone scenario not on the frozen old-map list names its world on
 *      every newPlayer / joinPair call (`world: 'wheel'`, or `'old'` to test
 *      the retired map itself);
 *   2. the list only ever shrinks: never more names than when it was frozen,
 *      and every name on it is a real scenario;
 *   3. the harness refuses a scenario off the list that opens a player with no
 *      `world`, run.mjs tells it which scenario is running, and a picture saved
 *      from the old map is stamped;
 *   4. the finder reads calls as the harness writes them (a call with no
 *      world, one with, joinPair's, the function's own definition left out);
 *   5. (v2.3.5100) no file hides behind a table line: an mp-<name>.mjs whose
 *      <name> is a line importing another file would never run by its name.
 *
 * v2.3.5100 (grand plan card B, PR 1): §1 reads the FILES.  Since v2.3.5021
 * a scenario needs no line in run.mjs's table (run.mjs finds
 * ./mp-<name>.mjs by its name), and §1 read only the table, so a new
 * scenario that named no world passed GitHub's check (precheck and the
 * harness still refused it).  It now reads every tools/qa/mp/mp-*.mjs and
 * every file the table names, keeping those that export `run`, as precheck
 * does.
 *
 * BREAK PROOF (rule 8), tried by hand 2026-11-14:
 *   §1: a tools/qa/mp/mp-zzz.mjs holding
 *       `export async function run(){ await H.newPlayer(b, { name: 'Z' }); }`
 *       and no line in run.mjs                                -> FAIL 1
 *   §5: `touch tools/qa/mp/mp-landview.mjs`                    -> FAIL 5 */
import { readFileSync, readdirSync } from 'fs';
import { OLD_MAP_LEGACY, OLD_MAP_LEGACY_FROZEN_AT, callsWithoutWorld, playerCalls, oldMapRefusal,
  scenarioTable, scenarioFiles, shadowedFiles } from '../../tools/qa/mp/oldMap.mjs';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 600) : ''); }
}

const mp = (f) => readFileSync(new URL('../../tools/qa/mp/' + f, import.meta.url), 'utf8');
const runSrc = mp('run.mjs');
const scenarios = scenarioTable(runSrc);
const mpFiles = readdirSync(new URL('../../tools/qa/mp/', import.meta.url));
/* v2.3.5100: every scenario, by its file (the table's and the ones with no line) */
const byFile = scenarioFiles(scenarios, mpFiles, mp);

/* ── 1. every scenario off the list names its world ── */
{
  /* v2.3.4674: 362 once the 397 old-map scenarios were deleted (docs/OLD-MAP-TESTS.md) */
  check('1: run.mjs lists its scenarios (guard)', scenarios.length > 300, scenarios.length);
  /* v2.3.5100: the files, not the table: at least every line's file, plus those with none */
  const listed = new Set(scenarios.map(([, f]) => f));
  const unlisted = byFile.filter(([, f]) => !listed.has(f)).map(([n]) => n);
  check(`1: the scenarios are read by their files (${byFile.length}, of which ${unlisted.length} have no line in the table)`,
    byFile.length >= scenarios.length - 5 && byFile.some(([n]) => n === 'questline'), { files: byFile.length, table: scenarios.length });
  const bad = [];
  let named = 0;
  for (const [name, file, src] of byFile) {
    if (OLD_MAP_LEGACY.has(name)) continue;
    const n = callsWithoutWorld(src).length;
    if (n) bad.push(name + ' (' + file + ')');
    else if (playerCalls(src).length) named++;
  }
  check(`1: every scenario off the old-map list names its world (${named} do)`, bad.length === 0, bad);
}

/* ── 2. the list only shrinks ── */
{
  /* 419 when it was frozen, 2026-10-21.  Lower this as names come off; never
     raise it.  A new scenario plays the world. */
  const FROZEN = 419;
  check('2: the frozen count is the one it was frozen at', OLD_MAP_LEGACY_FROZEN_AT === FROZEN, OLD_MAP_LEGACY_FROZEN_AT);
  check(`2: the list has no more names than when it was frozen (${OLD_MAP_LEGACY.size} <= ${FROZEN})`, OLD_MAP_LEGACY.size <= FROZEN, OLD_MAP_LEGACY.size);
  const names = new Set(scenarios.map(([n]) => n));
  const stale = [...OLD_MAP_LEGACY].filter((n) => !names.has(n));
  check('2: every name on it is a real scenario (take a deleted one off)', stale.length === 0, stale);
  check('2: today\'s own old-map tests came off it (pointsreset, gearlevel)', !OLD_MAP_LEGACY.has('pointsreset') && !OLD_MAP_LEGACY.has('gearlevel'));
  check('2: the scenarios that run on every PR play the world', !OLD_MAP_LEGACY.has('questline') && !OLD_MAP_LEGACY.has('membudget'));
  /* v2.3.4674: the owner, 2026-11-11, of the old map's tests: "Delete, keep a list" */
  check('2: the list is empty: every old-map scenario is deleted (docs/OLD-MAP-TESTS.md)', OLD_MAP_LEGACY.size === 0, [...OLD_MAP_LEGACY]);
}

/* ── 3. the harness refuses, run.mjs names the scenario, the old map is stamped ── */
{
  const h = mp('harness.mjs');
  check('3: newPlayer refuses a scenario off the list that names no world',
    /if \(_scenario && !OLD_MAP_LEGACY\.has\(_scenario\)\) throw new Error\(oldMapRefusal\(_scenario\)\);/.test(h));
  check('3: ...and a `world` that is neither \'wheel\' nor \'old\'', /world !== 'wheel' && world !== 'old'/.test(h));
  check('3: ...before any browser context is made',
    h.indexOf('throw new Error(oldMapRefusal(_scenario))') > 0 && h.indexOf('throw new Error(oldMapRefusal(_scenario))') < h.indexOf('browser.newContext', h.indexOf('export async function newPlayer')));
  check('3: joinPair passes `world` to both players', /joinPair\(browser, \{[^}]*world = null \}\)/.test(h)
    && (h.match(/chestOffer, world \}\)/g) || []).length === 2);
  check('3: a saved picture of the old map is stamped (a screenshot with a path)', /if \(_oldMap\) \{[\s\S]{0,400}stampOn, OLD_MAP_STAMP_ID/.test(h));
  check('3: run.mjs tells the harness which scenario runs, and forgets it after', /H\.setScenario\(name\);/.test(runSrc) && /H\.setScenario\(null\);/.test(runSrc));
  const words = oldMapRefusal('demo');
  check('3: the refusal names the fix in words', /RETIRED/.test(words) && /world: 'wheel'/.test(words) && /demo/.test(words), words);
  const pre = readFileSync(new URL('../../tools/dev/precheck.mjs', import.meta.url), 'utf8');
  check('3: the pre-push check asks it too', /'old-map'/.test(pre) && /callsWithoutWorld/.test(pre));
}

/* ── 4. the finder ── */
{
  const src = [
    "export async function newPlayer(browser, { name, world = null }) {}",
    "const A = await H.newPlayer(browser, { name: 'A', wsPort, webPort });",
    "const B = await H.newPlayer(browser, { name: 'B', wsPort, webPort, world: 'wheel', init: f(1, (2)) });",
    "const { A: C, B: D } = await H.joinPair(browser, { wsPort, webPort, nameA: 'C' });",
    "const E = await newPlayer(browser, { ...opts, world: 'old' });",
  ].join('\n');
  const calls = playerCalls(src);
  check('4: four calls found, the definition left out', calls.length === 4, calls);
  const none = callsWithoutWorld(src);
  check('4: the two with no world (a newPlayer and a joinPair)', none.length === 2 && /name: 'A'/.test(none[0]) && /nameA: 'C'/.test(none[1]), none);
}

/* ── 5. no file hides behind a table line (v2.3.5100) ── */
{
  const hidden = shadowedFiles(scenarios, mpFiles);
  check('5: no mp-<name>.mjs shares its name with a table line that imports another file (rename the file)', hidden.length === 0, hidden);
  const demo = shadowedFiles([['landview', 'mp-landscape-view.mjs'], ['farm', 'mp-farm.mjs']], ['mp-landview.mjs', 'mp-farm.mjs', 'mp-new.mjs']);
  check('5: the finder names a hidden file, and only that one', demo.length === 1 && /^mp-landview\.mjs /.test(demo[0]), demo);
  const found = scenarioFiles([['thumbbtn', 'shot-thumbbtn.mjs']], ['mp-a.mjs', 'mp-script.mjs', 'shot-thumbbtn.mjs'],
    (f) => ({ 'mp-a.mjs': 'export async function run() {}', 'mp-script.mjs': 'await main();', 'shot-thumbbtn.mjs': 'export const run = 1;' })[f]);
  check('5: a scenario is a file that exports run, by its file or its line', JSON.stringify(found.map(([n, f]) => n + ':' + f)) === '["a:mp-a.mjs","thumbbtn:shot-thumbbtn.mjs"]', found.map(([n, f]) => n + ':' + f));
}

if (failures) { console.log(`\n${failures} TEST(S) FAILED`); process.exit(1); }
console.log('\nold-map: all passed');
