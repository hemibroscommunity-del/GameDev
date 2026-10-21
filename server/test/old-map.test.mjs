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
 *      world, one with, joinPair's, the function's own definition left out). */
import { readFileSync } from 'fs';
import { OLD_MAP_LEGACY, OLD_MAP_LEGACY_FROZEN_AT, callsWithoutWorld, playerCalls, oldMapRefusal } from '../../tools/qa/mp/oldMap.mjs';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail).slice(0, 600) : ''); }
}

const mp = (f) => readFileSync(new URL('../../tools/qa/mp/' + f, import.meta.url), 'utf8');
const runSrc = mp('run.mjs');
const scenarios = [...runSrc.matchAll(/^\s+([A-Za-z0-9_]+): \(\) => import\('\.\/([^']+)'\)/gm)].map((m) => [m[1], m[2]]);

/* ── 1. every scenario off the list names its world ── */
{
  check('1: run.mjs lists its scenarios (guard)', scenarios.length > 500, scenarios.length);
  const bad = [];
  let named = 0;
  for (const [name, file] of scenarios) {
    if (OLD_MAP_LEGACY.has(name)) continue;
    let src = '';
    try { src = mp(file); } catch { continue; }
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

if (failures) { console.log(`\n${failures} TEST(S) FAILED`); process.exit(1); }
console.log('\nold-map: all passed');
