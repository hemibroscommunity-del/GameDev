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
 *                                  npm run build
 *                                  node tools/qa/mp/run.mjs questline
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
 * The tree's hash is git's name for the merged files themselves: two orders
 * that print the same hash made the same tree.  Exit code: 0 all green, 1 a
 * command failed, 2 a merge conflicted or a branch was not found.
 *
 * One heavy browser job at a time (CLAUDE.md §3): do not run this beside
 * another phone test.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const args = process.argv.slice(2);
const branches = args.filter((a) => !a.startsWith('--'));
const keep = args.includes('--keep');
const untilArg = (args.find((a) => a.startsWith('--until=')) || '').slice(8);
const STEPS = [
  { id: 'precheck', say: 'node tools/dev/precheck.mjs', cmd: 'node', argv: ['tools/dev/precheck.mjs'], mins: 15 },
  { id: 'build', say: 'npm run build', cmd: 'npm', argv: ['run', 'build'], mins: 15 },
  { id: 'questline', say: 'node tools/qa/mp/run.mjs questline', cmd: 'node', argv: ['tools/qa/mp/run.mjs', 'questline'], mins: 40 },
];
if (!branches.length || (untilArg && !['precheck', 'build'].includes(untilArg))) {
  console.error('usage: node tools/dev/gatekeeper.mjs <branch> [<branch> ...] [--until=precheck|build] [--keep]\n'
    + '  merges the branches, in that order, in a scratch worktree from origin/main and runs the checks on the whole.\n'
    + '  It merges nothing for real.');
  process.exit(2);
}
const steps = untilArg ? STEPS.slice(0, STEPS.findIndex((s) => s.id === untilArg) + 1) : STEPS;

const git = (argv, cwd) => execFileSync('git', argv, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();
const tryGit = (argv, cwd) => { try { return git(argv, cwd); } catch { return ''; } };
const root = tryGit(['rev-parse', '--show-toplevel'], process.cwd());
if (!root) { console.error('gatekeeper: not in a git repository'); process.exit(2); }

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
  const r = spawnSync(s.cmd, s.argv, { cwd: tree, encoding: 'utf8', timeout: s.mins * 60000, maxBuffer: 256 * 1024 * 1024, env: process.env });
  const out = (r.stdout || '') + (r.stderr || '');
  const log = join(logs, s.id + '.log');
  writeFileSync(log, out);
  const ok = r.status === 0;
  const secs = Math.round((Date.now() - t0) / 1000);
  const lines = out.trim().split('\n');
  /* the lines a person needs: precheck's FAILs and verdict, a scenario's FAILs and count, else the tail */
  const telling = lines.filter((l) => /^FAIL\b|^\s+FAIL\s|BLOCKED|OK TO PUSH|assertions, |✓ built|error during build/.test(l));
  results.push({ ...s, ok, code: r.status, timedOut: r.error && r.error.code === 'ETIMEDOUT', secs, log, show: (ok ? telling.slice(-2) : (telling.length ? telling.slice(0, 25) : lines.slice(-15))) });
  console.log(`  ${ok ? 'PASS' : 'FAIL'}      ${s.say}   (${secs} s${ok ? '' : r.status === null ? ', timed out or killed' : ', exit ' + r.status})`);
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
