/* ═══ v2.3.3302: EVERY SUITE, EVERY FAILURE, IN ONE RUN ═══
 *
 * `npm test` was one && chain of 132 suites (package.json), found by the
 * architecture review (2026-10-17):
 *   - one at a time, ~69 s on a 4-core box;
 *   - it stopped at the FIRST failure, which hid on average half the suites
 *     behind it: each run reported one failure, and a second one surfaced
 *     only after the first was fixed and the whole chain run again;
 *   - a suite on disk and not in the chain never ran: eventcapes.test.mjs,
 *     written with v2.3.2026, ran in no workflow and no script;
 *   - every new suite added its own `&& node test/x.test.mjs` to that one
 *     line, so any two PRs that each added a suite conflicted there, and a
 *     branch stacked on another failed CI on a file it did not have.
 *
 * This runs EVERY test/*.test.mjs -- a new suite needs no line anywhere --
 * a few at a time, each in its own process exactly as the chain ran it (cwd
 * server/, `node <file>`, its exit code the verdict), and reports every
 * failure with its FAIL lines, then exits 1 if any failed.
 *
 *   npm test                         every suite
 *   npm test -- relay hit-door       only those (a name, or part of one)
 *   npm test -- --jobs=1             one at a time, as the chain did
 *   npm test -- --verbose            every suite's whole output
 *
 * `TEST_JOBS` sets the number at a time too.  The suites already ran side by
 * side safely (the review ran them so): each builds its own room on its own
 * mock storage, and the two that time themselves (spawn-scale, wheelzone)
 * have 14x and more headroom on this box.
 */
import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { availableParallelism, cpus } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SERVER = join(HERE, '..');

/* The slowest suites, started first so the run does not end on one of them
   alone (measured 2026-10-17, ms): the rest take under two seconds each.  A
   stale list only costs the tail a few seconds. */
const SLOW_FIRST = [
  'aggro-grid',    // 12,151 (4 at a time on the QA box; 8,262 alone)
  'cost-guard',    // 10,959
  'near-join',     //  7,432
  'slim-roster',   //  6,475
  'presence2',     //  6,359
  'tick-share',    //  3,272
  'quiet-phone',   //  2,970
  'look-relay',    //  2,581
  'steady-movers', //  2,404
  'far-players',   //  2,235
  'move-diet',     //  2,110
  'farm',          //  2,094
];

const args = process.argv.slice(2);
const flag = (name) => args.some((a) => a === '--' + name);
const opt = (name) => { const a = args.find((x) => x.startsWith('--' + name + '=')); return a ? a.slice(name.length + 3) : null; };
const want = args.filter((a) => !a.startsWith('--'));
const verbose = flag('verbose');
const cores = typeof availableParallelism === 'function' ? availableParallelism() : cpus().length;
const jobs = Math.max(1, Math.min(16, Number(opt('jobs') || process.env.TEST_JOBS) || Math.min(4, cores)));

const all = readdirSync(HERE).filter((f) => f.endsWith('.test.mjs')).sort();
const nameOf = (f) => f.replace(/\.test\.mjs$/, '');
let files = all;
if (want.length) {
  files = all.filter((f) => want.some((w) => nameOf(f) === w || f === w || nameOf(f).includes(w)));
  if (!files.length) {
    console.error('no suite matches ' + want.join(' ') + ' (test/*.test.mjs)');
    process.exit(2);
  }
}
const rank = (f) => { const i = SLOW_FIRST.indexOf(nameOf(f)); return i < 0 ? SLOW_FIRST.length : i; };
const queue = files.slice().sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));

/* Node's own notice that server/package.json names no module type, once per
   process -- 132 copies of it hid the lines that matter */
const NOISE = /MODULE_TYPELESS_PACKAGE_JSON|Reparsing as ES module because module syntax was detected|To eliminate this warning, add "type": "module"|Use `node --trace-warnings \.\.\.` to show where the warning was created/;

function runOne(file) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const child = spawn(process.execPath, [join('test', file)], { cwd: SERVER, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    child.on('error', (e) => { out += '\n' + String(e && e.stack || e); });
    child.on('close', (code, signal) => resolve({ file, code: code === null ? 1 : code, signal, ms: Date.now() - t0, out }));
  });
}

const results = [];
const started = Date.now();
let next = 0;
async function worker() {
  while (next < queue.length) {
    const file = queue[next++];
    const r = await runOne(file);
    results.push(r);
    const ok = r.code === 0;
    console.log((ok ? 'ok   ' : 'FAIL ') + nameOf(file).padEnd(28) + String(r.ms).padStart(6) + ' ms' + (r.signal ? '  (' + r.signal + ')' : ''));
    if (verbose || !ok) {
      const lines = r.out.split('\n').filter((l) => l && !NOISE.test(l));
      const show = verbose ? lines : (lines.filter((l) => /\bFAIL(ED)?\b|Error|error:|^\s+at /.test(l)).slice(0, 40));
      for (const l of (show.length ? show : lines.slice(-20))) console.log('       ' + l);
    }
  }
}
await Promise.all(Array.from({ length: Math.min(jobs, queue.length) }, worker));

const failed = results.filter((r) => r.code !== 0).sort((a, b) => a.file.localeCompare(b.file));
const secs = ((Date.now() - started) / 1000).toFixed(1);
console.log('');
console.log(`${results.length} suites, ${jobs} at a time, ${secs} s: ` + (failed.length ? `${failed.length} FAILED` : 'all green'));
for (const r of failed) console.log('  FAILED ' + nameOf(r.file) + '  (node test/' + r.file + ')');
process.exit(failed.length ? 1 : 0);
