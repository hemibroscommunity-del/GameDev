/* ═══ v2.3.5022: THE RAILS HOLD (the example guard) ═══
 *
 * The grand plan's wave 0 put guards and precheck's checks in files of their
 * own, each found by its file name, so that two sessions side by side never
 * meet on one shared list.  That only works while the finding works.  This
 * guard holds it:
 *
 *   1. every file in tools/guards/ is a guard (`*.test.mjs`) or the README:
 *      a guard saved as `x.mjs` or `x.test.js` would never run, and nothing
 *      else would say so;
 *   2. server/test/run.mjs still runs tools/guards/*.test.mjs;
 *   3. every file in tools/dev/checks/ is a check (`*.mjs` with a default
 *      export) or the README, and precheck still loads that folder.
 *
 * BREAK PROOF (rule 8), each tried by hand, 2026-11-13:
 *   1. `touch tools/guards/x.mjs`                          -> FAIL 1
 *   2. run.mjs: `guardFiles = []` in place of its readdir  -> FAIL 2
 *   3. a tools/dev/checks/x.mjs holding only `export const a = 1;` -> FAIL 3
 *
 * Run from the repository's root: node tools/guards/rails.test.mjs
 * (cd server && npm test runs it with every other guard and suite).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const read = (f) => readFileSync(join(ROOT, f), 'utf8');
let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail)));
};

/* ── 1. nothing in tools/guards/ that would never run ── */
{
  const files = readdirSync(join(ROOT, 'tools/guards'));
  const stray = files.filter((f) => f !== 'README.md' && !f.endsWith('.test.mjs'));
  check('1: every file in tools/guards/ is a *.test.mjs guard or the README', stray.length === 0, stray);
  check('1: this guard is among them (the folder is the one read)', files.includes('rails.test.mjs'));
}

/* ── 2. npm test runs the guards ── */
{
  const run = read('server/test/run.mjs');
  check('2: server/test/run.mjs lists tools/guards/*.test.mjs',
    /join\(REPO, 'tools', 'guards'\)/.test(run) && /guardFiles = readdirSync\(GUARDS\)\.filter\(\(f\) => f\.endsWith\('\.test\.mjs'\)\)/.test(run));
  check('2: and adds them to the suites it runs', /\.concat\(guardFiles\.map\(/.test(run));
}

/* ── 3. precheck's checks in files of their own ── */
{
  const dir = 'tools/dev/checks';
  const files = readdirSync(join(ROOT, dir));
  const stray = files.filter((f) => f !== 'README.md' && !f.endsWith('.mjs'));
  check('3: every file in tools/dev/checks/ is a *.mjs check or the README', stray.length === 0, stray);
  const noDefault = files.filter((f) => f.endsWith('.mjs')).filter((f) => !/^export default (?:async )?function\b/m.test(read(dir + '/' + f)));
  check('3: every check has a default export for precheck to run', noDefault.length === 0, noDefault);
  const pre = read('tools/dev/precheck.mjs');
  check('3: precheck loads tools/dev/checks/*.mjs by file name',
    /join\(root, 'tools\/dev\/checks'\)/.test(pre) && /await mod\.default\(\{/.test(pre));
}

console.log(failed ? `\n${failed} FAILED` : '\nall green');
process.exit(failed ? 1 : 0);
