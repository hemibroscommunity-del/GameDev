/* ═══ v2.3.3252: THE LAB'S OWN CHECK, WITH NO CLOUDFLARE ═══
 *
 * run.mjs runs whole against a fake lab worker and a fake Cloudflare API
 * (selftest-fake.mjs, preloaded), twice:
 *   - a quiet day: every part runs -- the day so far, side by side, the round
 *     trips, the floods (the call flood under Cloudflare's 1,000 calls a
 *     request: the fake refuses more, as Cloudflare did), the bill and the
 *     game's 7 days -- and it exits 0;
 *   - a day 89% used: it stops before starting, says so, still writes its
 *     report, and exits 3.
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

function run(day) {
  const out = mkdtempSync(join(tmpdir(), 'lab-selftest-'));
  const r = spawnSync(process.execPath, ['--import', join(here, 'selftest-fake.mjs'), join(here, 'run.mjs'),
    '--base', 'https://brotown-lab.test.workers.dev', '--key', 'k', '--rounds', '2', '--out', out],
  { env: Object.assign({}, process.env, { CLOUDFLARE_API_TOKEN: 'fake', FAKE_DAY: day }), encoding: 'utf8', timeout: 120000 });
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

console.log(failed ? `\n${failed} failed` : '\nall lab self-test checks passed');
process.exit(failed ? 1 : 0);
