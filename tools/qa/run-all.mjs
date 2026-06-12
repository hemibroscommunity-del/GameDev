/* v2.3.782: one-command QA runner.
 *
 * Runs every harness in this directory sequentially and stops on the first
 * failure.  Prereqs (each script assumes these, see any header):
 *   - built client served at :4173   (npm run build && npm run preview)
 *   - local worker at :8787          (cd server && npx wrangler dev --port 8787)
 *   - chrome-headless-shell at /tmp/chrome-headless-shell-linux64/
 *
 * Usage:  node tools/qa/run-all.mjs            # full suite
 *         node tools/qa/run-all.mjs husk gl    # only scripts matching a term
 */
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const filters = process.argv.slice(2);
const scripts = readdirSync(dir)
  .filter((f) => f.startsWith('qa-') && f.endsWith('.mjs'))
  .filter((f) => !filters.length || filters.some((t) => f.includes(t)))
  .sort();

if (!scripts.length) { console.error('no qa scripts match', filters); process.exit(1); }
console.log(`running ${scripts.length} harness(es): ${scripts.join(', ')}\n`);

const results = [];
for (const s of scripts) {
  const t0 = Date.now();
  console.log(`━━━ ${s} ━━━`);
  const r = spawnSync('node', [join(dir, s)], { stdio: 'inherit', timeout: 10 * 60 * 1000 });
  const ok = r.status === 0;
  results.push({ s, ok, secs: Math.round((Date.now() - t0) / 1000) });
  if (!ok) break; // fail fast -- later harnesses share the same servers
}

console.log('\n━━━ summary ━━━');
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.s}  (${r.secs}s)`);
const failed = results.some((r) => !r.ok);
if (failed || results.length < scripts.length) {
  console.log(`stopped after first failure; ${scripts.length - results.length} not run`);
}
process.exit(failed ? 1 : 0);
