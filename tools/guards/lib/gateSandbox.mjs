/* ═══ v2.3.6506 (card PH, the sitting-59 mend): THE GATE, RUN FOR REAL ON A STAND-IN REPOSITORY ═══
 *
 * Sitting 59 planted in the gatekeeper's own code -- the held sample filtered
 * out of the steps it runs (gatekeeper.mjs `const steps = ...`), a red step
 * counted green (`const ok = ...`), the heap's rise taken from the last row
 * (`.slice(-1)`), the lowest reading for the middle (`Math.min`), the list's
 * line deleted -- and gate-steps / heap-trend stayed green: they read the
 * STEPS table and heap-trend.mjs's parts, never the gatekeeper's run.  Each
 * mend of a planted spelling has met a new spelling (sittings 57 to 59), so
 * these suites now RUN the real tools/dev/gatekeeper.mjs and read what it did.
 *
 * The gatekeeper takes its repository from the directory it is run in (git's
 * top level) and runs each step's command in a scratch worktree of origin/main
 * merged with the branches.  Here that repository is a small one made in a
 * temporary directory: its origin a bare repository beside it, its main and
 * one branch real commits, and every command a step can run (`node
 * tools/dev/precheck.mjs`, `node tools/qa/mp/run.mjs heldsweep`, `npm run
 * build`, `npx vite build ...`) a stand-in that writes one line -- the step it
 * is, its arguments, the env the gatekeeper gave it -- to a log OUTSIDE the
 * tree, and exits red where the test asks.  `npm` and `npx` are stand-ins on
 * the PATH (no network, no packages), so a gate run takes a few seconds.
 *
 * `mp-membudget` (the heap mode's three runs) writes the membudget.json the
 * gatekeeper reads, its heap the next of `heaps` (null: no file written).
 *
 * Pure node and git: the server's CI has no client packages (no Playwright).
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const GATEKEEPER = fileURLToPath(new URL('../../dev/gatekeeper.mjs', import.meta.url));

/* the stand-in every step's command is: the step's id from its own path and
   arguments, written to GATE_FAKE_LOG; red where GATE_FAKE_RED names it */
const RECORDER = `import { appendFileSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const [who, ...argv] = process.argv.slice(2);
const id = who === 'npm' && argv[0] === 'run' && argv[1] === 'build' ? 'build'
  : who === 'npx' && argv[0] === 'vite' ? 'profbuild'
  : who === 'precheck' ? 'precheck' : who === 'thrown' ? 'thrown' : who === 'claims' ? 'claims'
  : who === 'run' && argv[0] === 'questline' ? 'questline'
  : who === 'run' && argv[0] === 'heldsweep' ? 'heldsample'
  : who === 'run' && argv[0] === 'membudget' ? 'membudget'
  : 'unknown:' + who + ':' + argv.join(' ');
const log = process.env.GATE_FAKE_LOG;
appendFileSync(log, JSON.stringify({ id, argv, stations: process.env.BT_HS_STATIONS || null, dist: process.env.QA_DIST || null }) + '\\n');
if (id === 'membudget') {
  const n = readFileSync(log, 'utf8').split('\\n').filter((l) => l.includes('"id":"membudget"')).length;
  const heaps = JSON.parse(process.env.GATE_FAKE_HEAPS || '[]');
  const out = join(process.cwd(), 'tools', 'qa', 'mp', 'out');
  mkdirSync(out, { recursive: true });
  /* a heap of null: the run wrote nothing (a run that died before its report) */
  if (heaps[n - 1] !== null) writeFileSync(join(out, 'membudget.json'), JSON.stringify({ peaks: { heap: { v: heaps[n - 1], at: 'stand-in' } } }));
}
const red = (process.env.GATE_FAKE_RED || '').split(',').filter(Boolean);
if (red.includes(id)) { console.log('FAIL  the stand-in ' + id + ' (asked red)'); process.exit(1); }
console.log('the stand-in ' + id + ': passed');
`;

const sh = (cwd, cmd, args) => execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const GIT_ID = ['-c', 'user.name=stand-in', '-c', 'user.email=stand-in@localhost', '-c', 'commit.gpgsign=false', '-c', 'init.defaultBranch=main'];

/** A stand-in repository with the gatekeeper's commands.  `baseline` is
 *  baseline.md's text, `(hashes) => text`: hashes of the commits named
 *  { start, mid, main } so its rows can name them.  Returns the sandbox. */
export function makeSandbox({ baseline } = {}) {
  const top = mkdtempSync(join(tmpdir(), 'gate-sandbox-'));
  const origin = join(top, 'origin.git'), repo = join(top, 'repo'), bin = join(top, 'bin'), log = join(top, 'steps.log');
  mkdirSync(repo); mkdirSync(bin);
  const git = (...a) => sh(repo, 'git', [...GIT_ID, ...a]);
  sh(top, 'git', [...GIT_ID, 'init', '--quiet', '--bare', origin]);
  git('init', '--quiet');
  const put = (rel, text) => { mkdirSync(dirname(join(repo, rel)), { recursive: true }); writeFileSync(join(repo, rel), text); };
  put('.gitignore', 'node_modules\n');
  put('recorder.mjs', RECORDER);
  for (const [rel, who] of [['tools/dev/precheck.mjs', 'precheck'], ['tools/guards/switches-thrown.test.mjs', 'thrown'],
    ['server/test/claims-gain.test.mjs', 'claims'], ['tools/qa/mp/run.mjs', 'run']]) {
    const up = '../'.repeat(rel.split('/').length - 1);
    put(rel, `import { spawnSync } from 'node:child_process';\nimport { fileURLToPath } from 'node:url';\n`
      + `const r = spawnSync(process.execPath, [fileURLToPath(new URL('${up}recorder.mjs', import.meta.url)), '${who}', ...process.argv.slice(2)], { stdio: 'inherit' });\nprocess.exit(r.status);\n`);
  }
  put('package.json', '{ "name": "gate-stand-in", "private": true }\n');
  put('package-lock.json', '{ "lockfileVersion": 3 }\n');
  put('server/package-lock.json', '{ "lockfileVersion": 3 }\n');
  put('docs/plan/baseline.md', '# baseline\n');
  git('add', '-A'); git('commit', '--quiet', '-m', 'the start');
  const start = git('rev-parse', 'HEAD');
  put('a.txt', 'one\n'); git('add', '-A'); git('commit', '--quiet', '-m', 'v2.3.1: a change');
  const mid = git('rev-parse', 'HEAD');
  /* two PRs merged since the middle row, as GitHub's merge subjects */
  for (const [n, f] of [[21, 'b.txt'], [22, 'c.txt']]) {
    git('checkout', '--quiet', '-b', 'pr' + n);
    put(f, String(n) + '\n'); git('add', '-A'); git('commit', '--quiet', '-m', 'v2.3.2: pr ' + n);
    git('checkout', '--quiet', 'main');
    git('merge', '--quiet', '--no-ff', '-m', `Merge pull request #${n} from stand-in/pr${n}`, 'pr' + n);
  }
  const main = git('rev-parse', 'HEAD');
  /* the branch the rehearsal merges */
  git('checkout', '--quiet', '-b', 'claude/stand-in');
  put('d.txt', 'branch\n'); git('add', '-A'); git('commit', '--quiet', '-m', 'v2.3.3: the branch');
  git('checkout', '--quiet', 'main');
  git('remote', 'add', 'origin', origin);
  git('push', '--quiet', 'origin', 'main', 'claude/stand-in');
  git('fetch', '--quiet', 'origin');
  /* the packages the gatekeeper lends the tree: present, the lock files alike */
  mkdirSync(join(repo, 'node_modules')); mkdirSync(join(repo, 'server', 'node_modules'));
  /* npm and npx on the PATH: the recorder */
  for (const who of ['npm', 'npx']) {
    writeFileSync(join(bin, who), `#!/bin/sh\nexec "${process.execPath}" "${join(repo, 'recorder.mjs')}" ${who} "$@"\n`);
    chmodSync(join(bin, who), 0o755);
  }
  const hashes = { start, mid, main };
  if (baseline) writeFileSync(join(repo, 'docs/plan/baseline.md'), baseline(hashes));
  return {
    top, repo, hashes,
    /** the real gatekeeper, run in the stand-in: { status, out, steps } */
    run(args, { red = [], heaps = [] } = {}) {
      rmSync(log, { force: true }); writeFileSync(log, '');
      const r = spawnSync(process.execPath, [GATEKEEPER, ...args], {
        cwd: repo, encoding: 'utf8', timeout: 120000,
        env: { ...process.env, PATH: bin + ':' + process.env.PATH, GATE_FAKE_LOG: log, GATE_FAKE_RED: red.join(','), GATE_FAKE_HEAPS: JSON.stringify(heaps) },
      });
      const steps = existsSync(log) ? readFileSync(log, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
      return { status: r.status, out: (r.stdout || '') + (r.stderr || ''), steps };
    },
    /** a commit merged on origin's main from ANOTHER clone (this checkout's
     *  origin/main is then behind until it fetches): its hash */
    advanceOrigin(n) {
      const other = join(top, 'other' + n);
      sh(top, 'git', [...GIT_ID, 'clone', '--quiet', origin, other]);
      writeFileSync(join(other, 'e' + n + '.txt'), String(n) + '\n');
      sh(other, 'git', [...GIT_ID, 'add', '-A']);
      sh(other, 'git', [...GIT_ID, 'commit', '--quiet', '-m', `Merge pull request #${n} from stand-in/late`]);
      sh(other, 'git', [...GIT_ID, 'push', '--quiet', 'origin', 'main']);
      return sh(other, 'git', ['rev-parse', 'HEAD']);
    },
    baselineText() { return readFileSync(join(repo, 'docs/plan/baseline.md'), 'utf8'); },
    close() {
      try { sh(repo, 'git', ['worktree', 'prune']); } catch { /* best effort */ }
      rmSync(top, { recursive: true, force: true });
    },
  };
}
