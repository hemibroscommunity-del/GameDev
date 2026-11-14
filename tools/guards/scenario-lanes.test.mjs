/* ═══ v2.3.5223: EVERY PHONE TEST NAMES ITS LANE (card O PR 3; the grand plan's 2.1, its last sentence) ═══
 *
 * The game draws with a LANE (src/game/drawLanes.js, docs/LANES.md), picked
 * from the device's facts unless `?lane=<name>` picks it (and holds the
 * governor's ladder still, unless `?govern=1`).  So a test names the lane it
 * plays (tools/qa/lane.mjs), and GitHub fails one that does not before a run
 * does (rule 1):
 *   1. every tools/qa/mp/mp-*.mjs exports `lane`, one of the lanes' table;
 *      `govern`, where exported, is `true` (the harness adds `govern=1`);
 *   2. tools/dev/name-lanes.mjs (which writes the line) changes nothing:
 *      run twice, the second run writes nothing;
 *   3. run.mjs refuses a scenario with no lane, or one not in the table,
 *      before anything boots, and fails a game page a scenario loaded with
 *      no `lane=`; the harness puts the scenario's lane on every page
 *      newPlayer opens;
 *   4. every page of the game a tool under tools/ opens by its address goes
 *      through withLane (`H.withLane` in a scenario: its own lane);
 *   5. withLane itself: the lane added once, never twice, a named one kept,
 *      no parameter re-spelled (`?nospawn` stays bare), the hash kept.
 *
 * BREAK PROOF (rule 8), tried by hand 2026-11-14:
 *   1. `export const lane = 'full';` taken out of mp-questline.mjs   -> FAIL 1 and 2 (naming the file)
 *      ...`export const lane = 'fast';` there                          -> FAIL 1 (not in the table)
 *   3. run.mjs's refusal (`if (bad.length) { ... process.exit(2); }`) taken out -> FAIL 3
 *   4. mp-viewport.mjs's `page.goto(H.withLane(...))` as `page.goto(...)`      -> FAIL 4 (naming the line)
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LANE_NAMES } from '../../src/game/drawLanes.js';
import { withLane, laneParts, TEST_LANE } from '../qa/lane.mjs';
import { withLaneLine, scenarioFiles } from '../dev/name-lanes.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MP = join(ROOT, 'tools/qa/mp');
let failed = 0;
function check(name, ok, detail) {
  if (ok) console.log('ok   ' + name);
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '\n     ' + JSON.stringify(detail).slice(0, 700))); }
}

/* 1. every scenario names a lane of the table */
{
  const files = scenarioFiles();
  const none = [], unknown = [], badGovern = [];
  for (const f of files) {
    const text = readFileSync(join(MP, f), 'utf8');
    const m = /^export\s+const\s+lane\s*=\s*['"]([^'"]*)['"]\s*;/m.exec(text);
    if (!m) { none.push(f); continue; }
    if (!LANE_NAMES.includes(m[1])) unknown.push(`${f}: '${m[1]}'`);
    const g = /^export\s+const\s+govern\s*=\s*([^;]+);/m.exec(text);
    if (g && g[1].trim() !== 'true') badGovern.push(`${f}: ${g[1].trim()}`);
  }
  check(`1. every scenario file (${files.length}) names its lane: \`export const lane = 'full';\` (node tools/dev/name-lanes.mjs writes it)`, files.length > 300 && none.length === 0, none);
  check(`1. ...a lane of the table (${LANE_NAMES.join(', ')})`, unknown.length === 0, unknown);
  check('1. ...and `govern`, where a scenario asks for the governor, is `true`', badGovern.length === 0, badGovern);
}

/* 2. the script that writes the line changes nothing now */
{
  const would = scenarioFiles().filter((f) => { const t = readFileSync(join(MP, f), 'utf8'); return withLaneLine(t) !== t; });
  check('2. tools/dev/name-lanes.mjs would write nothing (every file has its line; a second run changes nothing)', would.length === 0, would);
  const sample = "/* a header */\nimport * as H from './harness.mjs';\nimport {\n  a,\n  b,\n} from 'x';\n\nconst PHONE = 1;\nexport async function run() {}\n";
  const once = withLaneLine(sample), twice = withLaneLine(once);
  check('2. ...it writes the line after the last import (a multi-line one too), and a second run is the first\'s',
    once === sample.replace("} from 'x';\n", "} from 'x';\nexport const lane = 'full';\n") && twice === once, once);
  const bare = "/* only a header\n * on two lines */\nconst x = 1;\n";
  check('2. ...with no import, after the header', withLaneLine(bare) === "/* only a header\n * on two lines */\nexport const lane = 'full';\nconst x = 1;\n", withLaneLine(bare));
}

/* 3. run.mjs refuses; the harness puts the lane on every page */
{
  const run = readFileSync(join(MP, 'run.mjs'), 'utf8');
  check('3. run.mjs reads the lanes\' table and refuses a scenario with no lane, or one not in it, before anything boots',
    /import \{ LANE_NAMES \} from '\.\.\/\.\.\/\.\.\/src\/game\/drawLanes\.js';/.test(run)
    && /typeof mod\.lane !== 'string'/.test(run) && /!LANE_NAMES\.includes\(mod\.lane\)/.test(run)
    && /if \(bad\.length\) \{[\s\S]{0,200}process\.exit\(2\);/.test(run)
    && run.indexOf('typeof mod.lane') < run.indexOf('const srv = await H.serveDist(WEB);'));
  check('3. ...hands the harness the scenario\'s lane and its `govern`, and fails a game page it loaded with no `lane=`',
    /H\.setScenario\(name, \{ lane: mod\.lane, govern: mod\.govern === true \}\);/.test(run) && /H\.takeLoadedPages\(\)/.test(run) && /!\/\[\?&\]lane=\/\.test\(u\)/.test(run));
  const h = readFileSync(join(MP, 'harness.mjs'), 'utf8');
  check('3. the harness puts the lane (and `govern=1` where asked) on every page newPlayer opens, unless its query names one',
    /const _laneQ = laneParts\(\[query, _env\]\.filter\(Boolean\)\.join\('&'\), _lane, _govern\);/.test(h)
    && /const _q = \[guest \? 'guest=1' : '', query, _env, _laneQ,/.test(h) && /export function withLane\(url\) \{ return _withLane\(url, _lane, _govern\); \}/.test(h));
}

/* 4. every page of the game a tool opens by its address names its lane */
{
  const files = [];
  (function walk(dir) {
    for (const n of readdirSync(dir)) {
      if (n === 'node_modules' || n.startsWith('.')) continue;
      const p = join(dir, n);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.m?js$/.test(n)) files.push(p);
    }
  })(join(ROOT, 'tools'));
  /* the game's page: the root of the page server (the scenarios' webPort, a script's WEB, the preview's 4173) */
  const GAME = /(?:\$\{(?:webPort|WEB)\}|:4173)\/(?:[`'"?]|$)/;
  const bad = [];
  let seen = 0;
  for (const f of files) {
    const text = readFileSync(f, 'utf8');
    const urlIsGame = /const URL\s*=[^;\n]*:4173\//.test(text);
    text.split('\n').forEach((l, i) => {
      const at = l.indexOf('.goto(');
      if (at < 0) return;
      const arg = l.slice(at);
      if (!(GAME.test(arg) || (urlIsGame && /\.goto\([^)]*\bURL\b/.test(arg)))) return;
      seen++;
      if (!/\.goto\((?:H\.)?withLane\(/.test(arg)) bad.push(`${relative(ROOT, f)}:${i + 1}`);
    });
  }
  check(`4. every page of the game a tool opens by its address (${seen}) goes through withLane (H.withLane in a scenario)`, seen > 20 && bad.length === 0, bad);
}

/* 5. withLane */
{
  const cases = [
    ['http://localhost:4173/', 'http://localhost:4173/?lane=full'],
    ['http://localhost:4173/?noresume=1', 'http://localhost:4173/?noresume=1&lane=full'],
    ['http://localhost:4173/?nospawn', 'http://localhost:4173/?nospawn&lane=full'],
    ['http://x/?a=1#h', 'http://x/?a=1&lane=full#h'],
    ['http://x/?lane=light', 'http://x/?lane=light'],
    ['http://x/?a&', 'http://x/?a&lane=full'],
  ];
  const off = cases.filter(([a, b]) => withLane(a) !== b || withLane(withLane(a)) !== b);
  check('5. withLane adds the lane once (never twice), keeps a named one and every parameter as written, and the hash', off.length === 0, off.map(([a, b]) => [a, withLane(a), b]));
  check('5. ...and `govern=1` where asked, not where named', withLane('http://x/', 'full', true) === 'http://x/?lane=full&govern=1'
    && withLane('http://x/?govern=0', 'full', true) === 'http://x/?govern=0&lane=full' && laneParts('lane=full&govern=1', 'full', true) === '' && TEST_LANE === 'full');
}

console.log(failed ? `\n${failed} check(s) failed` : '\nall checks pass');
process.exit(failed ? 1 : 0);
