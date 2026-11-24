#!/usr/bin/env node
/* ═══ v2.3.5024: THE GATEKEEPER'S REHEARSAL (the grand plan's wave 0) ═══
 *
 * "No PR merges on its own green" (docs/GRAND-PLAN.md part 11).  Each
 * sitting the gatekeeper (card Z) merges every ready branch together in a
 * scratch copy and runs the checks on the WHOLE, because two PRs that are
 * each green can be red together.  This is that rehearsal, as one command:
 *
 *   node tools/dev/gatekeeper.mjs <branch> [<branch> ...]
 *
 * In the order given it:
 *   1. makes a scratch worktree at origin/main (fetched first);
 *   2. merges each branch into it (origin/<branch>; a branch only this
 *      machine has is used and SAID to be local);
 *   3. runs, in the merged tree:   node tools/dev/precheck.mjs
 *                                    (v2.3.6421: with BT_ASSETS_WHOLE=1,
 *                                    the asset guards hash every file,
 *                                    once a sitting; a PR hashes only
 *                                    what is not main's by git's ids)
 *                                  node tools/guards/switches-thrown.test.mjs --whole
 *                                    (v2.3.6420: every switch born since
 *                                    5301 thrown, once a sitting; a PR
 *                                    throws only what it can break)
 *                                  npm run build
 *                                  node tools/qa/mp/run.mjs questline
 *                                  the sweep's unminified build, and
 *                                  mp-heldsweep's stand, town and ride
 *                                    (v2.3.6505, card PH PR 6: the held-
 *                                    page budget judged every sitting)
 *   4. prints each command's result and the merged tree's hash, and takes
 *      the worktree away.
 *
 * IT MERGES NOTHING FOR REAL.  The merges are commits on no branch, in a
 * worktree of their own, never pushed; nothing here writes to a branch, to
 * main, or to GitHub.  It prints a list for a person to act on.
 *
 * A conflict stops it at that branch (the files are named): drop the branch
 * or change the order, and run again.  A command that fails does not stop
 * the ones after it, so one sitting sees everything that is red.
 *
 *   --until=precheck|build   stop after that command (a red build needs no browser)
 *   --keep                   leave the worktree, to look at a failure in it
 *
 * v2.3.6504 (card PH PR 5): THE HEAP AS A TREND, once a sitting, apart from
 * the rehearsal (it takes no branches):
 *
 *   node tools/dev/gatekeeper.mjs --heap --sitting=N [--trim]
 *
 * builds origin/main in a scratch worktree, runs mp-membudget three times,
 * and adds the three highest heap readings and their middle as a row of
 * docs/plan/baseline.md's "The heap at each sitting" (in THIS checkout: the
 * sitting commits it with its notes).  A rise of over 1.0 MB since the last
 * row marked `trim` is printed for the list with the PRs merged between
 * (`--trim` marks this row: the sitting after a trim landed).  The heap line
 * is no longer raised to follow main (tools/dev/heap-trend.mjs).
 *
 * The tree's hash is git's name for the merged files themselves: two orders
 * that print the same hash made the same tree.  Exit code: 0 all green, 1 a
 * command failed, 2 a merge conflicted or a branch was not found.
 *
 * One heavy browser job at a time (CLAUDE.md §3): do not run this beside
 * another phone test.
 */
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const args = process.argv.slice(2);
const branches = args.filter((a) => !a.startsWith('--'));
const keep = args.includes('--keep');
const untilArg = (args.find((a) => a.startsWith('--until=')) || '').slice(8);
const heapMode = args.includes('--heap');
const sittingArg = (args.find((a) => a.startsWith('--sitting=')) || '').slice(10);
const STEPS = [
  /* v2.3.6307 (card RR PR 3): 15 minutes was under precheck's own run (it
     timed out at sittings 47 and 48 with nothing red).  Precheck now caps its
     two slow parts itself (server-tests 20 min, switches-thrown run apart 40
     min: tools/dev/precheck.mjs) and its other checks take a few minutes, so
     this cap is above their sum: a precheck stopped here is a hang, never
     a slow box's honest run. */
  /* v2.3.6420 (card CK PR 1): precheck leaves switches-thrown to the step
     after it (BT_THROWN_BY_GATEKEEPER), which throws the WHOLE set once a
     sitting: on a PR it throws only what the PR can break and a few chosen by
     the commit (tools/guards/switches-thrown.test.mjs, its header). */
  /* v2.3.6423 (card CK PR 4): so precheck here is its other checks and the
     rest of the suite (capped at 20 min there, v2.3.6425): the whole of it took 151 s
     on a session's box, 2026-11-24 (`BT_THROWN_BY_GATEKEEPER=1
     BT_ASSETS_WHOLE=1 node tools/dev/precheck.mjs`).  35 minutes is above
     the sum of every cap precheck holds (the rest 20, its other checks'
     4 + 2 + 7 x 1), so a precheck stopped here is still a hang, never a
     slow box's honest run; it was 70, when precheck ran the slow guard
     itself. */
  { id: 'precheck', say: 'node tools/dev/precheck.mjs', cmd: 'node', argv: ['tools/dev/precheck.mjs'], mins: 35, env: { BT_THROWN_BY_GATEKEEPER: '1', BT_ASSETS_WHOLE: '1' } },
  { id: 'thrown', say: 'node tools/guards/switches-thrown.test.mjs --whole', cmd: 'node', argv: ['tools/guards/switches-thrown.test.mjs', '--whole'], mins: 40, withPrecheck: true },
  { id: 'claims', say: 'node server/test/claims-gain.test.mjs --whole', cmd: 'node', argv: ['server/test/claims-gain.test.mjs', '--whole'], mins: 20, withPrecheck: true },   /* v2.3.6462 (card BK PR 3): the six seeds and every disturbance; a PR runs one seed's gains (the suite's header) */
  { id: 'build', say: 'npm run build', cmd: 'npm', argv: ['run', 'build'], mins: 15 },
  { id: 'questline', say: 'node tools/qa/mp/run.mjs questline', cmd: 'node', argv: ['tools/qa/mp/run.mjs', 'questline'], mins: 40 },
  /* v2.3.6505 (card PH PR 6): THE DEBT LIST AT THE GATE.  The held-page budget (tools/qa/mp/held-budget.mjs) was
     judged only when someone ran the whole sweep, for hours, by hand: a new hold past its line could sit on main
     for days.  Each sitting now plays a short sample of the sweep on the merged tree -- standing in the town, the
     ride through it, the board's ring round the safe ground (mp-heldsweep's `stand`, `town`, `ride`) -- held to
     the same lines.  It wants the sweep's own unminified build (every function read by its name), made beside the
     tree's `dist` in `dist-prof` (about 20 s on a session's box, 2026-11-24); the sample about ten minutes.  The
     two pages' stations (`peer`, `armour`, where `screen-check` is the box's) are not in it. */
  { id: 'profbuild', say: 'npx vite build --minify false --outDir ../dist-prof --emptyOutDir (the sweep\'s unminified build)', cmd: 'npx', argv: ['vite', 'build', '--minify', 'false', '--outDir', '../dist-prof', '--emptyOutDir'], mins: 15, env: { NODE_OPTIONS: '--max-old-space-size=8192' } },
  { id: 'heldsample', say: 'BT_HS_STATIONS=stand,town,ride QA_DIST=dist-prof node tools/qa/mp/run.mjs heldsweep', cmd: 'node', argv: ['tools/qa/mp/run.mjs', 'heldsweep'], mins: 40, env: { BT_HS_STATIONS: 'stand,town,ride', QA_DIST: 'dist-prof' } },
];
if (heapMode ? (branches.length || !sittingArg) : (!branches.length || (untilArg && !['precheck', 'build'].includes(untilArg)))) {
  console.error('usage: node tools/dev/gatekeeper.mjs <branch> [<branch> ...] [--until=precheck|build] [--keep]\n'
    + '  merges the branches, in that order, in a scratch worktree from origin/main and runs the checks on the whole.\n'
    + '  It merges nothing for real.\n'
    + '       node tools/dev/gatekeeper.mjs --heap --sitting=N [--trim]\n'
    + '  main\'s heap, three mp-membudget runs, a row of docs/plan/baseline.md (v2.3.6504).');
  process.exit(2);
}
/* v2.3.6420: a step `withPrecheck` runs whenever precheck does (--until=precheck
   included): it is the part of precheck's checks the gatekeeper runs whole */
let upTo = untilArg ? STEPS.findIndex((s) => s.id === untilArg) + 1 : STEPS.length;
while (upTo < STEPS.length && STEPS[upTo].withPrecheck) upTo++;
const steps = STEPS.slice(0, upTo);

/* v2.3.6307 (card RR PR 3): a step as the leader of its own process group,
   stopped whole at its cap (SIGTERM, then SIGKILL 10 s on), and whatever of
   the group outlived the step stopped at its end; the groups still running
   are stopped too if this script is (Ctrl-C). */
const _groups = new Set();
for (const sig of ['SIGTERM', 'SIGINT', 'SIGHUP']) process.on(sig, () => { for (const pid of _groups) { try { process.kill(-pid, 'SIGKILL'); } catch { /* gone */ } } process.exit(130); });
function runGroup(cmd, args, { cwd, capS, env }) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd, env: { ...process.env, ...(env || {}) }, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
    _groups.add(child.pid);
    let out = '';
    const take = (d) => { if (out.length < 256 * 1024 * 1024) out += d; };
    child.stdout.on('data', take);
    child.stderr.on('data', take);
    let timedOut = false;
    const stop = (sig) => { try { process.kill(-child.pid, sig); } catch { /* gone */ } };
    const timer = setTimeout(() => { timedOut = true; stop('SIGTERM'); setTimeout(() => stop('SIGKILL'), 10000).unref(); }, capS * 1000);
    child.on('error', (e) => { out += '\n' + String(e && e.message || e); });
    child.on('close', (code) => { clearTimeout(timer); stop('SIGKILL'); _groups.delete(child.pid); resolve({ status: code, timedOut, out }); });
  });
}

const git = (argv, cwd) => execFileSync('git', argv, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();
const tryGit = (argv, cwd) => { try { return git(argv, cwd); } catch { return ''; } };
const root = tryGit(['rev-parse', '--show-toplevel'], process.cwd());
if (!root) { console.error('gatekeeper: not in a git repository'); process.exit(2); }
if (heapMode) await recordHeap();

/* v2.3.6504 (card PH PR 5): main's heap, the middle of three runs, one row a
   sitting; the rise since the last trim named with the PRs between */
async function recordHeap() {
  const T = await import('./heap-trend.mjs');
  console.log('=== main\'s heap at sitting ' + sittingArg + ' (the test box) ===');
  spawnSync('git', ['fetch', 'origin', 'main', '--quiet'], { cwd: root, timeout: 60000, stdio: 'ignore' });
  const main = tryGit(['rev-parse', '--verify', '--quiet', 'origin/main'], root);
  if (!main) { console.error('gatekeeper: there is no origin/main here'); process.exit(2); }
  console.log(`origin/main is ${main.slice(0, 10)}`);
  const work = mkdtempSync(join(tmpdir(), 'gatekeeper-heap-'));
  const tree = join(work, 'tree');
  git(['worktree', 'add', '--detach', '--quiet', tree, main], root);
  const done = (code) => { try { git(['worktree', 'remove', '--force', tree], root); } catch { /* best effort */ } rmSync(work, { recursive: true, force: true }); process.exit(code); };
  for (const dir of ['', 'server']) {
    const have = join(root, dir, 'node_modules');
    if (existsSync(have)) symlinkSync(have, join(tree, dir, 'node_modules'), 'dir');
  }
  const b = await runGroup('npm', ['run', 'build'], { cwd: tree, capS: 15 * 60 });
  if (b.status !== 0) { console.log('FAIL  npm run build on main: no heap recorded\n' + b.out.trim().split('\n').slice(-8).join('\n')); done(1); }
  const json = join(tree, 'tools', 'qa', 'mp', 'out', 'membudget.json');
  const reads = [];
  for (let i = 1; i <= 3; i++) {
    rmSync(json, { force: true });
    const r = await runGroup('node', ['tools/qa/mp/run.mjs', 'membudget'], { cwd: tree, capS: 40 * 60 });
    let v = null;
    try { v = JSON.parse(readFileSync(json, 'utf8')).peaks.heap.v; } catch { /* unread */ }
    console.log(`  run ${i}: heap ${v == null ? 'NOT READ' : v + ' MB'} (mp-membudget exit ${r.status})`);
    if (typeof v === 'number') reads.push(v);
  }
  if (reads.length !== 3) { console.log('FAIL  three heap readings wanted: no row recorded'); done(1); }
  const middle = T.middleOf(reads);
  const file = join(root, 'docs', 'plan', 'baseline.md');
  const md = readFileSync(file, 'utf8');
  const v = T.verdict(T.parseRows(md), middle, args.includes('--trim'));   /* v2.3.6506: a trim only where it fell */
  const base = v.base && tryGit(['rev-parse', '--verify', '--quiet', v.base.main + '^{commit}'], root);
  const prs = base ? T.prsIn(tryGit(['log', '--first-parent', '--format=%s', `${base}..${main}`], root)) : [];
  writeFileSync(file, T.addRow(md, { sitting: sittingArg, date: new Date().toISOString().slice(0, 10), main, reads, middle, trim: v.trim }));
  console.log('\n' + T.say(v, middle, prs));
  console.log('row added to docs/plan/baseline.md: commit it with the sitting\'s notes.');
  done(0);
}

console.log('=== the gatekeeper\'s rehearsal: nothing here is merged for real ===');
const fetched = spawnSync('git', ['fetch', 'origin', '--prune', '--quiet'], { cwd: root, timeout: 60000, stdio: 'ignore' }).status === 0;
console.log(fetched ? 'fetched origin' : 'COULD NOT FETCH origin: the branches and main below are this machine\'s copies and may be old');
const main = tryGit(['rev-parse', '--verify', '--quiet', 'origin/main'], root);
if (!main) { console.error('gatekeeper: there is no origin/main here'); process.exit(2); }
console.log(`origin/main is ${main.slice(0, 10)}  ${tryGit(['log', '-1', '--format=%s', main], root).slice(0, 90)}`);

/* each name to a commit: GitHub's copy first */
const refs = [];
for (const b of branches) {
  const name = b.replace(/^origin\//, '');
  const remote = tryGit(['rev-parse', '--verify', '--quiet', 'refs/remotes/origin/' + name], root);
  const local = remote ? '' : tryGit(['rev-parse', '--verify', '--quiet', 'refs/heads/' + name], root);
  if (!remote && !local) { console.error(`gatekeeper: no branch "${name}" on origin or on this machine`); process.exit(2); }
  refs.push({ name, sha: remote || local, local: !remote });
}

const work = mkdtempSync(join(tmpdir(), 'gatekeeper-'));
const tree = join(work, 'tree');
const logs = join(work, 'logs');
execFileSync('mkdir', ['-p', logs]);
git(['worktree', 'add', '--detach', '--quiet', tree, main], root);
let cleaned = false;
const cleanup = () => {
  if (cleaned) return; cleaned = true;
  if (keep) { console.log(`\nthe worktree is kept: ${tree}\n  take it away with: git worktree remove --force ${tree}`); return; }
  try { git(['worktree', 'remove', '--force', tree], root); } catch { /* best effort */ }
  /* the commands' logs stay only when one was red (their path is printed) */
  if (!keepLogs) try { rmSync(work, { recursive: true, force: true }); } catch { /* best effort */ }
};
let keepLogs = false;
process.on('SIGINT', () => { cleanup(); process.exit(130); });
process.on('SIGTERM', () => { cleanup(); process.exit(143); });

/* ── the merges ── */
console.log('\n-- merging, in this order --');
const ident = ['-c', 'user.name=gatekeeper rehearsal', '-c', 'user.email=rehearsal@localhost'];
let conflict = null;
for (const r of refs) {
  const res = spawnSync('git', [...ident, 'merge', '--no-ff', '--no-edit', '-m', 'rehearsal: ' + r.name, r.sha], { cwd: tree, encoding: 'utf8' });
  if (res.status === 0) {
    console.log(`  merged    ${r.name}  (${r.sha.slice(0, 10)}${r.local ? ', a LOCAL branch: not what GitHub has' : ''})`);
    continue;
  }
  const files = tryGit(['diff', '--name-only', '--diff-filter=U'], tree).split('\n').filter(Boolean);
  conflict = { name: r.name, files, out: (res.stdout + res.stderr).trim().split('\n').slice(-6).join('\n    ') };
  console.log(`  CONFLICT  ${r.name}  (${r.sha.slice(0, 10)})` + (files.length ? ' in:\n    ' + files.join('\n    ') : ':\n    ' + conflict.out));
  spawnSync('git', ['merge', '--abort'], { cwd: tree });
  break;
}
if (conflict) {
  console.log(`\nRESULT: CONFLICT at ${conflict.name}.  Nothing was run.  Drop it or change the order, and run again; the branch that merges second takes main in first.`);
  cleanup();
  process.exit(2);
}
const treeHash = git(['rev-parse', 'HEAD^{tree}'], tree);
const changed = git(['diff', '--name-only', main, 'HEAD'], tree).split('\n').filter(Boolean);
console.log(`  the merged tree: ${treeHash}  (${changed.length} file(s) differ from main)`);

/* ── what the commands need: the packages.  This checkout's are lent when
   the merged tree asks for the very same ones (its lock file is this
   checkout's); otherwise they are installed fresh in the scratch tree. ── */
const same = (f) => { try { return readFileSync(join(root, f), 'utf8') === readFileSync(join(tree, f), 'utf8'); } catch { return false; } };
for (const [dir, lock] of [['', 'package-lock.json'], ['server', 'server/package-lock.json']]) {
  const have = join(root, dir, 'node_modules');
  if (existsSync(have) && same(lock)) { symlinkSync(have, join(tree, dir, 'node_modules'), 'dir'); continue; }
  console.log(`  installing ${dir || 'the client'}'s packages in the scratch tree (npm ci) ...`);
  const r = spawnSync('npm', ['ci', '--no-audit', '--no-fund'], { cwd: join(tree, dir), encoding: 'utf8', timeout: 15 * 60000, maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) console.log('  npm ci FAILED there: the commands below will say so');
}

/* ── the commands, each on the whole ── */
console.log('\n-- the checks, on the merged tree --');
const results = [];
for (const s of steps) {
  const t0 = Date.now();
  process.stdout.write(`  running   ${s.say} ...\n`);
  /* v2.3.6307: run in a process group of its own and, at the cap, the whole
     group stopped -- spawnSync killed only the command, and a precheck's
     run.mjs (or a scenario's worker and browser) ran on after it */
  const r = await runGroup(s.cmd, s.argv, { cwd: tree, capS: s.mins * 60, env: s.env });
  const out = r.out;
  const log = join(logs, s.id + '.log');
  writeFileSync(log, out);
  const ok = r.status === 0;
  const secs = Math.round((Date.now() - t0) / 1000);
  const lines = out.trim().split('\n');
  /* the lines a person needs: precheck's FAILs and verdict, a scenario's FAILs and count, else the tail */
  const telling = lines.filter((l) => /^FAIL\b|^\s+FAIL\s|BLOCKED|OK TO PUSH|assertions, |✓ built|error during build|^ok\s+thrown \(/.test(l));
  results.push({ ...s, ok, code: r.status, timedOut: r.timedOut, secs, log, show: (ok ? telling.slice(-2) : (telling.length ? telling.slice(0, 25) : lines.slice(-15))) });
  console.log(`  ${ok ? 'PASS' : 'FAIL'}      ${s.say}   (${secs} s${ok ? '' : r.timedOut ? `, stopped at its ${s.mins}-minute cap (the run's processes with it)` : r.status === null ? ', killed' : ', exit ' + r.status})`);
  for (const l of results[results.length - 1].show) console.log('              ' + l.slice(0, 300));
}

/* ── the result ── */
const red = results.filter((r) => !r.ok);
console.log('\n=== RESULT ===');
console.log(`main:    ${main.slice(0, 10)}`);
console.log(`merged:  ${refs.map((r) => r.name).join(', ')}`);
console.log(`tree:    ${treeHash}`);
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}     ${r.say}`);
for (const s of STEPS.slice(steps.length)) console.log(`not run  ${s.say}   (--until=${untilArg})`);
console.log(red.length
  ? `\n${red.length} command(s) RED on the whole.  Drop one branch and run again to find whose it is.`
  : `\nall green on the whole${steps.length < STEPS.length ? ' (as far as it was run)' : ''}.  Nothing was merged: the list is the owner's to merge.`);
if (red.length || keep) { keepLogs = true; console.log(`the commands' whole output: ${logs}`); }
cleanup();
process.exit(red.length ? 1 : 0);
