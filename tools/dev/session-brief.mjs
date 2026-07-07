#!/usr/bin/env node
/* v2.3.1201: session-start briefing for AI sessions.
 *
 * Usage:  node tools/dev/session-brief.mjs
 * Wired to run automatically via the SessionStart hook in
 * .claude/settings.json, so every Claude Code session opens with it.
 *
 * ZERO dependencies, git-only, completes in <10s, tolerates being
 * offline (fetch is time-boxed; falls back to local refs). Why it
 * exists: parallel sessions can't see each other's in-flight work —
 * on 2026-07-07 five sessions claimed the same version tag and two
 * built the same feature. This prints the collision surface up front.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function git(args) {
  try { return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: 8000 }).trim(); }
  catch { return ''; }
}
const root = git(['rev-parse', '--show-toplevel']);
if (!root) { console.log('session-brief: not in a git repo — skipping'); process.exit(0); }

// 1. freshen refs, but never hang a session start on a dead network
const fetched = spawnSync('git', ['fetch', 'origin', '--prune', '--quiet'],
  { cwd: root, timeout: 7000, stdio: 'ignore' }).status === 0;

// 2. main version high-water: package.json + recent log subjects
const mainRef = git(['rev-parse', '--verify', '--quiet', 'origin/main']) ? 'origin/main' : 'HEAD';
let high = 0;
try {
  const m = (JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version || '').match(/^2\.3\.(\d+)$/);
  if (m) high = Math.max(high, +m[1]);
} catch { /* ignore */ }
for (const m of git(['log', mainRef, '-300', '--format=%s']).matchAll(/v2\.3\.(\d+)/g)) high = Math.max(high, +m[1]);

// 3. in-flight remote claude/* branches, last 72h
const now = Date.now() / 1000;
const inflight = git(['for-each-ref', '--sort=-committerdate', 'refs/remotes/origin/claude',
  '--format=%(committerdate:unix)\t%(refname:short)\t%(subject)'])
  .split('\n').filter(Boolean).map((l) => l.split('\t'))
  .filter(([ts]) => now - +ts < 72 * 3600);

console.log('=== BroTown session brief ===');
console.log(`refs: ${fetched ? 'fetched origin just now' : 'OFFLINE/slow — using local refs (may be stale)'}`);
console.log(`version high-water on ${mainRef}: v2.3.${high}`);
console.log(`SUGGESTED next free tag: v2.3.${high + 1}  (parallel sessions get the same suggestion — check the branches below, and renumber before merge if someone beat you to it)`);
if (inflight.length) {
  console.log(`\nIN-FLIGHT work — remote claude/* branches pushed in the last 72h (${inflight.length}). Someone may already be building your feature or holding your tag:`);
  for (const [ts, ref, subj] of inflight.slice(0, 15)) {
    console.log(`  ${String(Math.round((now - +ts) / 3600)).padStart(3)}h  ${ref.replace('origin/', '')}  —  ${subj}`);
  }
  if (inflight.length > 15) console.log(`  … ${inflight.length - 15} more (git for-each-ref refs/remotes/origin/claude)`);
} else {
  console.log('\nno claude/* branches pushed in the last 72h (or offline — verify before claiming a tag).');
}
console.log(`
Protocol (5 lines):
  1. ONE system per PR; check open PRs + the branches above before claiming a backlog item.
  2. Run \`node tools/dev/precheck.mjs\` before EVERY push (the sandbox blocks npm install — this is your local gate).
  3. Read docs/ARCHITECTURE-HANDOFF.md before ANY server change; it is load-bearing.
  4. Objects keyed by client-supplied ids: Object.create(null) or Map — plain {} no-ops on '__proto__' (3 incidents on 2026-07-07).
  5. Claim a v2.3.N tag ABOVE the high-water and tag every change with it (rule 25).`);
