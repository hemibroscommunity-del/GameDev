/* ═══ v2.3.3257: THE LAB'S OWN CHECK, WITH NO CLOUDFLARE ═══
 *
 * run.mjs runs whole against a fake lab worker and a fake Cloudflare API
 * (selftest-fake.mjs, preloaded), twice:
 *   - a quiet day: every part runs -- the day so far, side by side, the round
 *     trips, the floods (the call flood under Cloudflare's 1,000 calls a
 *     request: the fake refuses more, as Cloudflare did), the bill and the
 *     game's 7 days -- and it exits 0;
 *   - a day 89% used: it stops before starting, says so, still writes its
 *     report, and exits 3;
 *   - THE LIMIT TEST (--limit), on a fake clock and a fake daily limit: one
 *     that counts every message (refused near 100,000, then the reset at
 *     midnight answered), one that counts 20 to 1 (never refused, past the
 *     line), one that counts late (refused while it watches), and three it
 *     must refuse to run: too late, far too early, a game address that is not
 *     the auction listing.  None of those may send a single message.
 * The lab's third run on Cloudflare died on a helper used before its line ran
 * ("Cannot access 'baseType' before initialization"), and its call flood
 * asked for more calls than one request may make: this check catches both.
 * The workflow runs it before deploying anything.
 *
 *   node tools/lab/selftest.mjs
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
let failed = 0;
/* a value for a failure's line: never throws, whatever the run left */
const js = (v) => String(JSON.stringify(v === undefined ? null : v));
const check = (name, ok, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok || detail === undefined ? '' : '  ' + String(detail).slice(0, 300)}`);
  if (!ok) failed++;
};

function run(day, extra = [], env = {}) {
  const out = mkdtempSync(join(tmpdir(), 'lab-selftest-'));
  const r = spawnSync(process.execPath, ['--import', join(here, 'selftest-fake.mjs'), join(here, 'run.mjs'),
    '--base', 'https://brotown-lab.test.workers.dev', '--key', 'k', '--rounds', '2', '--out', out, ...extra],
  { env: Object.assign({}, process.env, { CLOUDFLARE_API_TOKEN: 'fake', FAKE_DAY: day }, env), encoding: 'utf8', timeout: 120000 });
  const md = readdirSync(out).filter((f) => f.endsWith('.md')).map((f) => readFileSync(join(out, f), 'utf8'))[0] || '';
  const json = readdirSync(out).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(join(out, f), 'utf8')))[0] || null;
  return { code: r.status, md, json, stderr: r.stderr || '' };
}

/* a quiet day: the whole run */
{
  const r = run('quiet');
  check('quiet day: exits 0', r.code === 0, r.stderr.slice(-500));
  check('quiet day: the day so far read (1,500 billed, 1.5%)', /about 1,500 billed requests \(1\.5%/.test(r.md), r.md.slice(0, 600));
  check('quiet day: side by side, 5 rows (K = 1..16)', (r.json && r.json.burn && r.json.burn.rows.length) === 5);
  check('quiet day: three round trips', !!(r.json && r.json.rtt && Object.keys(r.json.rtt).length === 3));
  check('quiet day: four floods, the call flood within one request\'s calls', !!(r.json && r.json.flood && r.json.flood.length === 4
    && r.json.flood.every((f) => f.got === f.n) && r.json.flood.some((f) => f.name.startsWith('call') && f.n + 3 <= 1000)));
  check('quiet day: the bill read', !!(r.json && r.json.billing && r.json.billing.usage && r.json.billing.usage.billed > 0), js(r.json && r.json.billing));
  check('quiet day: the game\'s 7 days', !!(r.json && r.json.game && r.json.game.days && r.json.game.days.length === 7), js(r.json && r.json.game));
  check('quiet day: each flood\'s World and its own CPU', !!(r.json && r.json.billing && Array.isArray(r.json.billing.perFlood)
    && r.json.billing.perFlood.length === 4 && r.json.billing.perFlood.every((f) => f.found && f.cpuUsPerMsg > 0)) && /CPU a message/.test(r.md), js(r.json && r.json.billing && r.json.billing.perFlood));
  check('quiet day: no error', !!(r.json && !r.json.error), r.json && r.json.error);
  check('quiet day: the budget under 3% of a day', !!(r.json && r.json.plan && r.json.plan.budget > 0 && r.json.plan.budget < 3000), r.json && r.json.plan && r.json.plan.budget);
}

/* a day near the limit: stopped before starting */
{
  const r = run('busy');
  check('busy day: exits 3', r.code === 3, `exit ${r.code} ${r.stderr.slice(-300)}`);
  check('busy day: says it stopped, and why', /Stopped before starting/.test(r.md) && /89,000/.test(r.md), r.md.slice(0, 600));
  check('busy day: ran nothing', !!(r.json && !r.json.burn && !r.json.flood));
}

/* v2.3.3257: the limit test */
const LIMIT_ARGS = ['--limit', '--game-probe', 'https://api.brotown.net/api/store/browse'];
{
  const r = run('quiet', LIMIT_ARGS, { FAKE_CLOCK: '23:54:30', FAKE_COUNT: 'raw' });
  const x = r.json && r.json.limit;
  check('limit, every message counts: exits 0', r.code === 0, r.stderr.slice(-500));
  check('limit, every message counts: refused, and called "every-message"', !!(x && x.tripped && x.verdict === 'every-message'), js(x && { verdict: x.verdict, tripped: x.tripped, sent: x.sent }));
  check('limit, every message counts: refused near 100,000 (95,000-110,000 by its own count)', !!(x && x.tripped && x.tripped.rawAbout >= 95000 && x.tripped.rawAbout <= 110000), js(x && x.tripped));
  check('limit, every message counts: nothing sent before 23:55:00 or after 23:58:30', !!(x && x.steps.length && x.steps.every((s) => s.at.slice(11, 19) >= '23:55:00' && s.at.slice(11, 19) <= '23:58:30')), js(x && x.steps.map((s) => s.at.slice(11, 19))));
  check('limit, every message counts: it stopped at the refusal (no step after it)', !!(x && x.tripped && x.steps.length === x.tripped.afterStep), js(x && { steps: x.steps.length, after: x.tripped && x.tripped.afterStep }));
  check('limit, every message counts: the game\'s listing was refused too, and answered again after midnight', !!(x && x.tripped && x.tripped.game && x.tripped.game.ok === false && x.recovered && x.recovered.secondsPastMidnight < 120), js(x && { game: x.tripped && x.tripped.game, recovered: x.recovered }));
  check('limit, every message counts: the report says so in plain words', /\*\*Every message counts\.\*\*/.test(r.md) && /Exceeded allowed volume/.test(r.md), r.md.slice(0, 900));
}
{
  const r = run('quiet', LIMIT_ARGS, { FAKE_CLOCK: '23:54:30', FAKE_COUNT: 'billed' });
  const x = r.json && r.json.limit;
  check('limit, 20 to 1: exits 0, never refused, called "not-every-message"', r.code === 0 && !!(x && !x.tripped && x.verdict === 'not-every-message'), js(x && { verdict: x.verdict, sent: x.sent, rawAbout: x.rawAbout, stoppedBy: x.stoppedBy }));
  check('limit, 20 to 1: sent past the line but no more than 25,000 over it (150,000 at most)', !!(x && x.rawAbout >= 105000 && x.sent <= x.target && x.target <= 125000), js(x && { sent: x.sent, target: x.target, rawAbout: x.rawAbout }));
  check('limit, 20 to 1: it watched for a late refusal until 23:59:40', !!(x && x.watchedUntil && x.watchedUntil.slice(11, 19) >= '23:59:40'), js(x && x.watchedUntil));
  check('limit, 20 to 1: the report says so in plain words', /\*\*Not every message counts\.\*\*/.test(r.md), r.md.slice(0, 900));
}
{
  const r = run('quiet', LIMIT_ARGS, { FAKE_CLOCK: '23:54:30', FAKE_COUNT: 'late' });
  const x = r.json && r.json.limit;
  check('limit, counted late: the refusal is caught while it watches', r.code === 0 && !!(x && x.tripped && x.tripped.late && x.verdict === 'every-message' && x.recovered), js(x && { verdict: x.verdict, tripped: x.tripped, recovered: x.recovered }));
}
for (const [name, env, extra] of [
  ['too late (23:59:10)', { FAKE_CLOCK: '23:59:10' }, LIMIT_ARGS],
  ['far too early (12:00)', { FAKE_CLOCK: '12:00:00' }, LIMIT_ARGS],
  ['a game address that is not the auction listing', { FAKE_CLOCK: '23:54:30' }, ['--limit', '--game-probe', 'https://api.brotown.net/api/market/place']],
  ['a window across midnight', { FAKE_CLOCK: '23:54:30' }, [...LIMIT_ARGS, '--window', '23:58:00-00:02:00']],
]) {
  const r = run('quiet', extra, Object.assign({ FAKE_COUNT: 'raw' }, env));
  const x = r.json && r.json.limit;
  check(`limit refused, ${name}: exits 4, sends nothing, says why`, r.code === 4 && !!(x && x.refused && !x.steps.length) && /\*\*Not run:\*\*/.test(r.md), js({ code: r.code, refused: x && x.refused, steps: x && x.steps.length, err: r.stderr.slice(-300) }));
}

console.log(failed ? `\n${failed} failed` : '\nall lab self-test checks passed');
process.exit(failed ? 1 : 0);
