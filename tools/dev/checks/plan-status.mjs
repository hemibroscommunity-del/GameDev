/* v2.3.5022: A SESSION'S STATUS FILE KEEPS ITS FORM (the example check).
 *
 * docs/plan/README.md: a status file (docs/plan/status/<letter>.md) is at
 * most 40 lines and opens with four lines -- card, branch, prs, state -- the
 * state one of working, ready, done, stalled.  The gatekeeper reads every
 * status file at each sitting and must be able to: long output goes in a
 * census (docs/plan/census/), never here.
 *
 * It reads every status file in the working tree, changed or not: there are
 * a handful, and one broken on main should be seen by whoever runs precheck.
 */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const HEAD = ['card', 'branch', 'prs', 'state'];
const STATES = ['working', 'ready', 'done', 'stalled'];
const MAX_LINES = 40;

export default async function check({ root, read, pass, fail }) {
  let files = [];
  try { files = readdirSync(join(root, 'docs/plan/status')).filter((f) => f.endsWith('.md')).sort(); } catch { /* none yet */ }
  const bad = [];
  for (const f of files) {
    const lines = read('docs/plan/status/' + f).replace(/\n+$/, '').split('\n');
    const letter = f.replace(/\.md$/, '');
    if (lines.length > MAX_LINES) bad.push(`${f}: ${lines.length} lines (at most ${MAX_LINES}: long output goes in docs/plan/census/)`);
    HEAD.forEach((k, i) => { if (!new RegExp('^' + k + ': \\S').test(lines[i] || '')) bad.push(`${f}: line ${i + 1} must be "${k}: ..."`); });
    if (/^card: /.test(lines[0] || '') && lines[0].slice(6).trim() !== letter) bad.push(`${f}: its card line says "${lines[0].slice(6).trim()}", its file name "${letter}"`);
    const state = /^state: (\S+)/.exec(lines[3] || '');
    if (state && !STATES.includes(state[1])) bad.push(`${f}: state "${state[1]}" is not one of ${STATES.join(', ')}`);
  }
  if (bad.length) fail('a status file is off the form in docs/plan/README.md:\n    ' + bad.join('\n    '));
  else pass(`${files.length} status file(s) in docs/plan/status/ keep their form (four opening lines, at most ${MAX_LINES} lines)`);
}
