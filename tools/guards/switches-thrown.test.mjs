/* ═══ v2.3.5304: EACH SWITCH THROWN, ONE AT A TIME (rule 4, card T PR 4) ═══
 *
 * The grand plan's rule 4: two configurations, all new or exactly one switch
 * thrown.  For a worker row of kind `switch` (tools/guards/lib/switches.mjs),
 * its system's suites (card B's map finds them, by their words) and those of
 * every row that needs it run once with that ONE flag thrown on every room
 * (tools/guards/lib/thrown.mjs, a preload: no line of game code and no suite
 * changes).  A check that passes unthrown and fails thrown is:
 *   - the switch's OWN check (one that asserts what the switch turns off):
 *     expected, and the row lists it by the check's words (`thrownFails`,
 *     'suite.test.mjs: words');
 *   - anything else: a second configuration that breaks.  Listed as known
 *     here (KNOWN: a census, it only falls), and written under Found in card
 *     T's status file with the card whose files it is in.  This guard fixes
 *     none.
 *
 * WHICH ROWS.  On every PR (cd server && npm test): only the rows born from
 * tag 5301 on (the switches added since the table), so its share stays under
 * about 30 s.  By hand:
 *   node tools/guards/switches-thrown.test.mjs --all       every worker switch
 *   node tools/guards/switches-thrown.test.mjs --sample    in each system, one
 *                                                          switch of each risk
 *   node tools/guards/switches-thrown.test.mjs --only farm  one row
 * (`--all` is hours on a 4-core box: CLAUDE.md §6, the sample, and the full
 * run offered to the owner.)
 *
 * PAGE ROWS: no browser run.  For each page switch the guard finds the node
 * suite or phone scenario that plays it thrown (one whose text holds the
 * switch's address, `<name>=0`, `?<name>` ...): found, never typed.  The
 * count of page switches with none only falls (NO_PLAY_LINE).
 *
 * BREAK PROOF (rule 8), tried by hand once, 2026-11-14:
 *   - `--only farm` before the `farm` row listed its thrownFails
 *                         -> FAIL (farm.test's and farmorders.test's five,
 *                            unexpected)
 *   - `bandbeat` renamed in server/test/held-sweep.test.mjs, its only play
 *                         -> FAIL (page switches with no play: one over)
 *
 * THE SAMPLE (2026-11-14, `--sample`: 17 switches, one of each risk in each
 * system; 278 suite runs, about 140 s here).  Nine showed fails, all their
 * own checks (now on their rows), but one two-switch case (KNOWN).  The full
 * run (`--all`: 230 switches, about 5,200 suite runs, about 45 minutes here)
 * is the owner's to ask for (CLAUDE.md §6).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { SWITCHES } from './lib/switches.mjs';
import { describe } from './lib/systems.mjs';
import { ROOT } from './lib/switchScan.mjs';

/* the second configurations known to break (rule 3: a census, it only
   falls): flag -> ['suite.test.mjs: words of the failing check'] */
export const KNOWN = Object.freeze({
  /* not a broken second configuration: this check throws `storehealwait:
     false` itself, to show the hole that switch closes, so with ahonewrite
     thrown beside it TWO switches are off, outside rule 4's one (the sample
     of 2026-11-14).  Off the list when either switch goes. */
  ahonewrite: Object.freeze(['store-heal-wait.test.mjs: FAIL 2. `storehealwait: false`: the prune goes first']),
});

/* page switches with no node suite or phone scenario that plays them thrown */
const NO_PLAY_LINE = 77;   /* its first count, v2.3.5304: it only falls */

const PRELOAD = join(ROOT, 'tools/guards/lib/thrown.mjs');
const SERVER = join(ROOT, 'server');
const argv = process.argv.slice(2);
const ALL = argv.includes('--all');
const SAMPLE = argv.includes('--sample');
const oi = argv.indexOf('--only');
const ONLY = oi >= 0 ? argv[oi + 1] : null;
const BORN_FROM = 5301;
const JOBS = 3;
const SUITE_MS = 180000;

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 1400)));
};

/* ── the rows, and their suites ── */
const systems = describe().systems;
const suitesOf = (sys) => ((systems.find((s) => s.name === sys) || {}).suites || []);
const worker = SWITCHES.filter((r) => r.side === 'worker' && r.kind === 'switch');
function pick() {
  if (ONLY) return worker.filter((r) => r.name === ONLY);
  if (ALL) return worker;
  if (SAMPLE) {
    const seen = new Set(), out = [];
    for (const r of worker) { const k = r.system + '|' + r.risk; if (!seen.has(k)) { seen.add(k); out.push(r); } }
    return out;
  }
  return worker.filter((r) => typeof r.born === 'number' && r.born >= BORN_FROM);
}
function suitesFor(row) {
  const set = new Set(suitesOf(row.system));
  for (const r of SWITCHES) if (r.needs.includes(row.name)) for (const s of suitesOf(r.system)) set.add(s);
  return [...set].sort();
}

/* ── a suite, run: the lines that hold FAIL ── */
function run(suite, thrown) {
  return new Promise((resolve) => {
    /* the baseline through the same preload, a flag nothing reads thrown:
       the only difference between the two runs is the one flag */
    const args = ['--import', PRELOAD, join('test', suite)];
    const env = { ...process.env, BT_THROWN: thrown || '__bt_none__=false' };
    const p = spawn(process.execPath, args, { cwd: SERVER, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { out += d; });
    const t = setTimeout(() => { p.kill('SIGKILL'); out += '\nFAIL (the suite ran past ' + SUITE_MS + ' ms)'; }, SUITE_MS);
    p.on('close', (code) => {
      clearTimeout(t);
      const fails = out.split('\n').map((l) => l.trim()).filter((l) => /\bFAIL\b/.test(l) && !/^\d+ FAIL|FAILURE\(S\)|FAILED\b|^\s*$/.test(l)).map((l) => l.slice(0, 200));
      resolve({ code, fails });
    });
  });
}
async function pool(jobs) {
  const out = new Array(jobs.length);
  let i = 0;
  await Promise.all(Array.from({ length: JOBS }, async () => { while (i < jobs.length) { const k = i++; out[k] = await jobs[k](); } }));
  return out;
}

/* ── the page rows: a test that plays each thrown ── */
function playsOfPage() {
  const files = [];
  /* a play is a test: a server suite or a phone scenario (never run.mjs's
     list or a helper) */
  for (const f of readdirSync(join(ROOT, 'server/test'))) if (/\.test\.mjs$/.test(f)) files.push('server/test/' + f);
  for (const f of readdirSync(join(ROOT, 'tools/qa/mp'))) if (/^mp-.+\.mjs$/.test(f)) files.push('tools/qa/mp/' + f);
  const text = files.map((f) => [f, readFileSync(join(ROOT, f), 'utf8')]);
  const out = new Map();
  for (const r of SWITCHES) {
    if (r.side === 'worker' || r.kind !== 'switch') continue;
    const n = r.name.replace(/^\?/, '');
    const re = new RegExp('[?&]' + n.replace(/[$]/g, '\\$') + '(?:=|[&\'"`\\s]|$)');
    out.set(r.name, text.filter(([, s]) => re.test(s)).map(([f]) => f));
  }
  return out;
}

const rows = pick();
const label = ONLY ? `--only ${ONLY}` : ALL ? '--all' : SAMPLE ? '--sample' : `rows born from ${BORN_FROM} on`;
const t0 = Date.now();

/* the baseline: each suite once, unthrown */
const allSuites = [...new Set(rows.flatMap(suitesFor))];
const base = new Map();
await pool(allSuites.map((s) => async () => { base.set(s, new Set((await run(s, null)).fails)); }));

const unexpected = [];
const stale = [];
const ownFound = [];
const jobs = [];
for (const row of rows) {
  const value = row.thrown === 'true' ? 'true' : 'false';
  for (const s of suitesFor(row)) jobs.push(async () => ({ row, s, r: await run(s, row.name + '=' + value) }));
}
const results = await pool(jobs);
for (const row of rows) {
  const listed = row.thrownFails || [];
  const known = KNOWN[row.name] || [];
  const seen = new Set();
  for (const { s, r } of results.filter((x) => x.row === row)) {
    for (const line of r.fails) {
      if (base.get(s).has(line)) continue;
      const tag = `${s}: ${line}`;
      const own = listed.find((w) => tag.includes(w));
      const kn = known.find((w) => tag.includes(w));
      if (own) { seen.add(own); ownFound.push(`${row.name} | ${tag}`); continue; }
      if (kn) { seen.add(kn); continue; }
      unexpected.push(`${row.name} thrown | ${tag}`);
    }
  }
  for (const w of [...listed, ...known]) if (!seen.has(w)) stale.push(`${row.name}: ${w}`);
}

check(`thrown (${label}): ${rows.length} switch(es), ${jobs.length} suite run(s), ${allSuites.length} suite(s) unthrown, ${Math.round((Date.now() - t0) / 1000)} s`, true);
check('every check that fails with one switch thrown is the switch\'s own (its row\'s thrownFails) or a known second configuration (KNOWN)', unexpected.length === 0, unexpected);
if (rows.length) check('every listed fail still fails (a mended one comes off its list)', stale.length === 0, stale);
if (argv.includes('--verbose')) for (const l of ownFound) console.log('     own: ' + l);
const di = argv.indexOf('--dump');
if (di >= 0) (await import('node:fs')).writeFileSync(argv[di + 1], JSON.stringify({ unexpected, stale, own: ownFound }, null, 1));

const plays = playsOfPage();
const none = [...plays].filter(([, f]) => !f.length).map(([n]) => n);
check(`page switches with no node suite or phone scenario that plays them thrown: ${none.length}, the line ${NO_PLAY_LINE} (it only falls)`, none.length <= NO_PLAY_LINE, none.slice(0, 40));
if (none.length < NO_PLAY_LINE) console.log(`     (room: ${none.length} under the line ${NO_PLAY_LINE}; the gatekeeper may lower it)`);

console.log(failed ? `\n${failed} FAILED` : '\nall green');
process.exit(failed ? 1 : 0);
