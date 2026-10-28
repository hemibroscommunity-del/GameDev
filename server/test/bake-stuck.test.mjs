/* ═══ v2.3.3742: A BAKE WORKER THAT STOPS ANSWERING NO LONGER STOPS EVERY BAKE ═══
 *
 * mp-armourflash's equip measure: 90 s after putting copper on, the masked
 * bake worker had taken one job and never answered (busy 1, pending 1), and
 * the one-at-a-time queue held every later bake behind it -- 34 of the set's
 * 177 frames (docs/specs/worn-first.md).  entityRenderer.js:
 *   1. a job posted to the worker starts a _BAKE_REPLY_MS timer, cleared when
 *      the answer comes; at the timer, a job still waiting retires the worker;
 *   2. retiring fails every job the worker holds (each takes the inline bake,
 *      as a failed job always has), terminates it, lets the next job start a
 *      fresh one, sends the rod again, counts it, and after _BAKE_STUCK_MAX in
 *      a row (an answer resets the run) gives the worker up (the inline path);
 *   3. a late answer finds no job and is dropped (never placed twice), and a
 *      retired worker's onerror touches nothing;
 *   4. the worker's state is the rod alone, so a fresh one needs nothing else.
 */
import { readFileSync } from 'node:fs';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}
const root = new URL('../../', import.meta.url);
const er = readFileSync(new URL('src/rendering/systems/entityRenderer.js', root), 'utf8');
const body = (sig) => { const i = er.indexOf(sig); return i < 0 ? '' : er.slice(i, er.indexOf('\n}\n', i)); };

/* ── 1. the timer ── */
{
  const m = /const _BAKE_REPLY_MS = (\d+), _BAKE_STUCK_MAX = (\d+);/.exec(er);
  check('1a the reply timeout and the most stuck workers are set', !!m, m && m[0]);
  check('1b ...10 s or so: past a slow worker on a loaded phone (4 s retired working ones), far short of the stall it is for', !!m && +m[1] >= 8000 && +m[1] <= 20000, m && m[1]);
  const rb = body('async function _runBake(job) {');
  const post = rb.indexOf('wk.postMessage({ id, body, belt');
  const timer = rb.indexOf('_stuckT = setTimeout(() => { if (_bakeJobs.has(id)) _retireStuckWorker(wk); }, _BAKE_REPLY_MS);');
  check('1c the timer starts once the job is posted, and only a job still waiting retires the worker', post > 0 && timer > post, { post, timer });
  check('1d ...and is cleared when the answer comes', /\}\);\s*if \(_stuckT\) clearTimeout\(_stuckT\);/.test(rb));
  check('1e a failed job takes the inline bake (the err path)', /if \(reply\.err\) \{ _bakeWorkerStats\.failed\+\+; _maskedBodyFrame\(/.test(rb));
}

/* ── 2. retiring ── */
{
  const fn = body('function _retireStuckWorker(wk) {');
  check('2a every job the worker holds fails, and the list is emptied', /for \(const \[, job\] of _bakeJobs\) job\(\{ err: 'worker stuck' \}\);\s*_bakeJobs\.clear\(\);/.test(fn));
  check('2b the worker is terminated and the next job starts a fresh one', /wk\.terminate\(\)/.test(fn) && /if \(_bakeWorker === wk\) _bakeWorker = null;/.test(fn));
  check('2c the rod is sent again to the fresh worker', /_rodSent = null;/.test(fn));
  check('2d counted on the QA probe', /_bakeWorkerStats\.stuck = _bakeStuck;/.test(fn) && /stuck: 0/.test(er));
  check('2e after _BAKE_STUCK_MAX in a row the worker is given up (the inline path)', /if \(_bakeStuckRun >= _BAKE_STUCK_MAX\) _bakeWorkerDead = true;/.test(fn));
  check('2f ...an answered job resets the run', /if \(!job\) return;[^\n]*\n\s*_bakeStuckRun = 0;/.test(er));
}

/* ── 3. late answers and a retired worker's error ── */
{
  const gw = body('function _getBakeWorker() {');
  check('3a an answer whose job is gone is dropped', /const job = _bakeJobs\.get\(d\.id\);\s*if \(!job\) return;/.test(gw));
  check('3b a retired worker\'s onerror touches nothing', /w\.onerror = \(\) => \{\s*if \(_bakeWorker !== w\) return;/.test(gw));
}

/* ── 4. the worker keeps nothing but the rod ── */
{
  const wk = readFileSync(new URL('src/rendering/maskedBakeWorker.js', root), 'utf8');
  const lets = (wk.match(/^let \w+/gm) || []);
  check('4a the worker\'s only state between jobs is the rod', lets.length === 1 && lets[0] === 'let rod', lets);
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) { console.log(failed + ' FAILURE(S)'); process.exit(1); }
console.log('ALL PASS');
