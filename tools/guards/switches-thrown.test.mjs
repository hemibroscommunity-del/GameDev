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
 * WHICH ROWS.  v2.3.6420 (card CK PR 1): THE WHOLE SET is the rows born
 * from tag 5301 on (the switches added since the table: 89 rows, 2,418 suite
 * runs, 894 s of a 979 s suite on 2026-11-23, every push paying it).  It runs
 * once a sitting, in the gatekeeper's rehearsal (tools/dev/gatekeeper.mjs
 * runs `--whole` as its own step; its result is on the list).  On a PR
 * (cd server && npm test, and precheck) it throws, of the whole set:
 *   - TOUCHED: each row the branch changed against `main` -- its line in
 *     tools/guards/lib/switches.mjs, a file of its system (or of a system
 *     whose row needs it: what suitesFor runs), a file that reads it
 *     (the scanner's), or a suite it runs;
 *   - THE FEW: a fixed few chosen by the commit (FEW_RUNS suite runs, a
 *     window of the rows in name order starting where the commit's id
 *     points), so every switch is still thrown over time, also where the
 *     branch touched none;
 *   - all of them where this machinery itself changed (MACHINERY).
 * "Changed against `main`" (changedFiles below):
 *   - on GitHub the checkout is one commit, the PR merged into main (or, on
 *     main, the merge): its first parent IS main, fetched by its id at depth
 *     1 (actions/checkout keeps the token for it), then git diff;
 *   - on a session's box: the merge base with origin/main, the working tree
 *     and new files with it;
 *   - BT_THROWN_CHANGED=a,b (the plants, by hand) names the files;
 *   - where none of these can tell: THE FEW only, and the line says so.
 * By hand:
 *   node tools/guards/switches-thrown.test.mjs --whole     the whole set
 *                                                          (the rehearsal's)
 *   ...and --list: the rows it would throw and why, no suite run
 *   node tools/guards/switches-thrown.test.mjs --all       every worker switch
 *   node tools/guards/switches-thrown.test.mjs --sample    in each system, one
 *                                                          switch of each risk
 *   node tools/guards/switches-thrown.test.mjs --only farm  one row
 *   ...and --baseline: each suite run unthrown first, its FAIL lines set
 *   aside (on by itself with --all, --sample and --only; v2.3.5305)
 *   node tools/guards/switches-thrown.test.mjs --none      every server suite
 *                                                          with a flag nothing
 *                                                          reads (v2.3.5307)
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
import { spawn, spawnSync } from 'node:child_process';
import { SWITCHES } from './lib/switches.mjs';
import { describe, mappedFiles, placeFiles } from './lib/systems.mjs';
import { ROOT, scanWorker } from './lib/switchScan.mjs';

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
const NO_PLAY_LINE = 76;   /* its first count, v2.3.5304: it only falls */

const PRELOAD = join(ROOT, 'tools/guards/lib/thrown.mjs');
const SERVER = join(ROOT, 'server');
const argv = process.argv.slice(2);
const ALL = argv.includes('--all');
const WHOLE = argv.includes('--whole');
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
  const whole = worker.filter((r) => typeof r.born === 'number' && r.born >= BORN_FROM);
  if (WHOLE) return whole;
  return pickForPr(whole);
}

/* ── v2.3.6420 (card CK PR 1): on a PR, what the PR can break ── */

/* this guard's own machinery: a change to it throws the whole set */
const MACHINERY = Object.freeze([
  'tools/guards/switches-thrown.test.mjs', 'tools/guards/lib/thrown.mjs',
  'tools/guards/lib/thrown-hooks.mjs', 'tools/guards/lib/thrown-patch.mjs',
]);
/* the few, in suite runs: one row at least, then rows while they fit (a
   world row is 76 runs, a wire row 21: about 25 s here at three at a time) */
const FEW_RUNS = 60;
const SWITCH_TABLE = 'tools/guards/lib/switches.mjs';

const gitOut = (args, timeout = 60000) => {
  const r = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', timeout, maxBuffer: 64 * 1024 * 1024 });
  return r.status === 0 ? r.stdout : null;
};
const lines = (t) => (t || '').split('\n').map((l) => l.trim()).filter(Boolean);

/* the files the branch changed against main, the base they were read
   against, and how: { files: [...] | null, base, how } */
function changedFiles() {
  if (process.env.BT_THROWN_CHANGED !== undefined) {
    return { files: lines(process.env.BT_THROWN_CHANGED.replace(/,/g, '\n')), base: null, how: 'BT_THROWN_CHANGED' };
  }
  if (process.env.GITHUB_ACTIONS === 'true') {
    /* one commit checked out (depth 1): its parents are only names in it,
       so main (the first) is fetched by its id */
    const head = gitOut(['cat-file', '-p', 'HEAD']);
    const parent = head && (/^parent ([0-9a-f]{40})$/m.exec(head) || [])[1];
    if (!parent) return { files: null, base: null, how: 'GitHub: HEAD names no parent' };
    if (gitOut(['cat-file', '-e', parent + '^{commit}']) === null) {
      gitOut(['fetch', '--no-tags', '--quiet', '--depth=1', 'origin', parent], 120000);
    }
    const d = gitOut(['diff', '--name-only', parent, 'HEAD']);
    return d === null ? { files: null, base: parent, how: 'GitHub: main (' + parent.slice(0, 10) + ') could not be fetched' }
      : { files: lines(d), base: parent, how: 'GitHub: the merge against its first parent, main ' + parent.slice(0, 10) };
  }
  const main = gitOut(['rev-parse', '--verify', '--quiet', 'origin/main']);
  if (!main) return { files: null, base: null, how: 'no origin/main here' };
  const mb = gitOut(['merge-base', 'HEAD', 'origin/main']);
  const base = (mb && mb.trim()) || main.trim();
  const d = gitOut(['diff', '--name-only', base]);
  const n = gitOut(['ls-files', '--others', '--exclude-standard']);
  if (d === null) return { files: null, base, how: 'git diff against ' + base.slice(0, 10) + ' failed' };
  return { files: [...new Set([...lines(d), ...lines(n)])].sort(), base, how: (mb ? 'the merge base with origin/main, ' : 'origin/main (no merge base in this shallow clone), ') + base.slice(0, 10) + ', and the working tree' };
}

/* the switch table's rows whose line the branch changed */
function rowsChangedInTable(base) {
  if (!base) return null;
  const d = gitOut(['diff', '-U0', base, '--', SWITCH_TABLE]);
  if (d === null) return null;
  const out = new Set();
  for (const l of d.split('\n')) {
    if (!/^[+-](?![+-])/.test(l)) continue;
    const m = /^\s*\{\s*name:\s*'([^']+)'/.exec(l.slice(1));
    if (m) out.add(m[1]);
  }
  return out;
}

let PICKED = null;   /* what pickForPr chose, and why: for the line */
function pickForPr(whole) {
  const ch = changedFiles();
  const sorted = whole.slice().sort((a, b) => a.name.localeCompare(b.name));
  const touched = new Map();   /* name -> why */
  if (ch.files) {
    const changed = new Set(ch.files);
    if (MACHINERY.some((f) => changed.has(f))) {
      PICKED = { how: ch.how, changed: ch.files.length, touched: whole.length, few: 0, why: 'this guard\'s machinery changed: the whole set' };
      return whole;
    }
    const bySystem = placeFiles(mappedFiles()).bySystem;
    const readers = scanWorker().names;
    const inTable = changed.has(SWITCH_TABLE) ? rowsChangedInTable(ch.base) : new Set();
    for (const row of whole) {
      const systemsOf = new Set([row.system]);
      for (const r of SWITCHES) if (r.needs.includes(row.name)) systemsOf.add(r.system);
      let why = null;
      if (inTable === null) why = 'the switch table changed (its rows could not be told apart)';
      else if (inTable.has(row.name)) why = 'its row';
      if (!why) for (const sys of systemsOf) { const f = (bySystem[sys] || []).find((x) => changed.has(x)); if (f) { why = f + ' (system ' + sys + ')'; break; } }
      if (!why) { const f = (readers.get(row.name) || []).map((x) => x.file).find((x) => changed.has(x)); if (f) why = f + ' (reads it)'; }
      if (!why) { const s = suitesFor(row).find((x) => changed.has('server/test/' + x)); if (s) why = 'server/test/' + s + ' (a suite it runs)'; }
      if (why) touched.set(row.name, why);
    }
  }
  /* the few: from the commit's id, a window of the rows in name order */
  const head = (gitOut(['rev-parse', 'HEAD']) || '0').trim();
  const start = sorted.length ? parseInt(head.slice(0, 8), 16) % sorted.length : 0;
  const few = [];
  let runs = 0;
  for (let k = 0; k < sorted.length; k++) {
    const row = sorted[(start + k) % sorted.length];
    const n = suitesFor(row).length;
    if (few.length && runs + n > FEW_RUNS) break;
    few.push(row.name); runs += n;
  }
  PICKED = { how: ch.how, changed: ch.files ? ch.files.length : null, touched: touched.size, few: few.length, head: head.slice(0, 10), touchedWhy: [...touched].map(([n, w]) => n + ': ' + w), fewNames: few };
  const keep = new Set([...touched.keys(), ...few]);
  return whole.filter((r) => keep.has(r.name));
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
      /* a line that says FAIL, but never one that PASSes or is `ok`
         (picture-door's `PASS 2g. ... are each a FAIL`: v2.3.5307, found by
         --none) */
      const fails = out.split('\n').map((l) => l.trim()).filter((l) => /\bFAIL\b/.test(l) && !/^(?:PASS|ok)\b/.test(l) && !/^\d+ FAIL|FAILURE\(S\)|FAILED\b|^\s*$/.test(l)).map((l) => l.slice(0, 200));
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

/* v2.3.5307: THE PRELOAD CHANGES NOTHING BY ITSELF.  With a flag nothing
   reads (`__bt_none__`) a suite must run as it does plain: the run's whole
   claim is that the one flag is the only difference.  On every PR the
   canaries run so (the suites the v2.3.5304 preload broke: a room's cold
   start, cold-flags.test; a global set before a module loads,
   tick-pace.test); `--none` runs every server suite so, by hand (the
   planning session's finding, 2026-11-15). */
const CANARIES = Object.freeze(['cold-flags.test.mjs', 'tick-pace.test.mjs']);
const NONE = argv.includes('--none');
if (NONE) {
  const { readdirSync: rd } = await import('node:fs');
  const all = rd(join(SERVER, 'test')).filter((f) => f.endsWith('.test.mjs')).sort();
  const t1 = Date.now();
  const res = await pool(all.map((f) => async () => ({ f, r: await run(f, null) })));
  const red = res.filter((x) => x.r.fails.length || x.r.code !== 0).map((x) => `${x.f}: ${x.r.fails[0] || 'exit ' + x.r.code}`);
  check(`--none: every server suite runs as it does plain with a flag nothing reads thrown (${all.length} suites, ${Math.round((Date.now() - t1) / 1000)} s)`, red.length === 0, red);
  console.log(failed ? `\n${failed} FAILED` : '\nall green');
  process.exit(failed ? 1 : 0);
}

const rows = pick();
const label = ONLY ? `--only ${ONLY}` : ALL ? '--all' : SAMPLE ? '--sample' : WHOLE ? `--whole: rows born from ${BORN_FROM} on`
  : `on a PR, of the rows born from ${BORN_FROM} on: ${PICKED.touched} touched, ${PICKED.few} of the few (commit ${PICKED.head || '?'})`;
if (PICKED) {
  console.log(`     changed against main: ${PICKED.changed === null ? 'UNKNOWN (' + PICKED.how + '): the few only' : PICKED.changed + ' file(s), ' + PICKED.how}`);
  if (PICKED.why) console.log('     ' + PICKED.why);
  for (const l of PICKED.touchedWhy || []) console.log('     touched  ' + l);
  if (PICKED.fewNames) console.log('     the few  ' + PICKED.fewNames.join(', ') + '  (the whole set: the gatekeeper\'s rehearsal, --whole)');
}
/* --list: the rows it would throw, and why, then stop (no suite runs) */
if (argv.includes('--list')) {
  console.log(`${label}: ${rows.length} row(s), ${rows.reduce((n, r) => n + suitesFor(r).length, 0)} suite run(s)`);
  process.exit(0);
}
const t0 = Date.now();

/* the baseline: each suite once, unthrown.  v2.3.5305 (the gatekeeper,
   sitting 14: the run's 30 s on every PR are paid minutes): only by hand
   (--all, --sample, --only, --baseline), where the base may be red.  On a
   PR, `npm test` runs every one of these suites plain in the same job and
   fails on any FAIL, so a line that fails unthrown has already turned it
   red: here it reads as an unexpected one, and nothing is let through.  A
   fault of the preload's own (a suite it breaks unthrown) is red too.
   Measured: 97 thrown runs and 67 baseline runs, 30 s; without, 18 s. */
const allSuites = [...new Set(rows.flatMap(suitesFor))];
const BASELINE = ALL || SAMPLE || !!ONLY || argv.includes('--baseline');
const base = new Map(allSuites.map((s) => [s, new Set()]));
if (BASELINE) await pool(allSuites.map((s) => async () => { base.set(s, new Set((await run(s, null)).fails)); }));

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

check(`thrown (${label}): ${rows.length} switch(es), ${jobs.length} suite run(s), ${BASELINE ? allSuites.length + ' suite(s) unthrown' : 'no baseline (npm test runs them plain)'}, ${Math.round((Date.now() - t0) / 1000)} s`, true);
check('every check that fails with one switch thrown is the switch\'s own (its row\'s thrownFails) or a known second configuration (KNOWN)', unexpected.length === 0, unexpected);
if (rows.length) check('every listed fail still fails (a mended one comes off its list)', stale.length === 0, stale);
if (argv.includes('--verbose')) for (const l of ownFound) console.log('     own: ' + l);
const di = argv.indexOf('--dump');
if (di >= 0) (await import('node:fs')).writeFileSync(argv[di + 1], JSON.stringify({ unexpected, stale, own: ownFound }, null, 1));

{
  const res = await pool(CANARIES.map((f) => async () => ({ f, r: await run(f, null) })));
  const red = res.filter((x) => x.r.fails.length || x.r.code !== 0).map((x) => `${x.f}: ${x.r.fails[0] || 'exit ' + x.r.code}`);
  check(`the preload alone changes nothing: ${CANARIES.join(', ')} pass with a flag nothing reads (--none: every suite, by hand)`, red.length === 0, red);
}

const plays = playsOfPage();
const none = [...plays].filter(([, f]) => !f.length).map(([n]) => n);
check(`page switches with no node suite or phone scenario that plays them thrown: ${none.length}, the line ${NO_PLAY_LINE} (it only falls)`, none.length <= NO_PLAY_LINE, none.slice(0, 40));
if (none.length < NO_PLAY_LINE) console.log(`     (room: ${none.length} under the line ${NO_PLAY_LINE}; the gatekeeper may lower it)`);

console.log(failed ? `\n${failed} FAILED` : '\nall green');
process.exit(failed ? 1 : 0);
