/* v2.3.6524 (card WL PR 5): the suites that read the page's source by its
   path (step 5.2b: "a feature converts its own slice"; a file that moves
   breaks every one).  The rule, pinned: lib/bigFileSuites.mjs's, over every
   file of the client instead of the eight big ones -- a SUITE is a
   server/test/*.test.mjs; it NAMES a client file BY ITS PATH when its text
   holds the file's folder and name (`game/farmWalk.js`, `ui/BroTown.jsx`);
   BY PATH ONLY when it does not ask lib/filesOf.mjs for a system's files
   too.  The shape review's 237 of 518 (2026-11-23, part 3 item 12) was
   counted by hand with no rule written; this rule reads 250 of 518 at the
   same commit, 0aec6482: the difference is the review's, not the code's.
   Text, not a tree: a path in a message or a comment breaks on a move too. */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

export default function suitesByPath({ root }) {
  const walk = (d) => readdirSync(join(root, d)).flatMap((n) => {
    const p = d + '/' + n;
    if (statSync(join(root, p)).isDirectory()) return n === 'public' ? [] : walk(p);
    return /\.(js|jsx|mjs)$/.test(n) ? [p] : [];
  });
  const tails = [...new Set(walk('src').map((f) => f.split('/').slice(-2).join('/')))];
  const suites = readdirSync(join(root, 'server/test')).filter((f) => f.endsWith('.test.mjs'));
  let named = 0, only = 0;
  for (const s of suites) {
    const text = readFileSync(join(root, 'server/test', s), 'utf8');
    if (!tails.some((t) => text.includes(t))) continue;
    named++;
    if (!/\bfilesOf\b/.test(text)) only++;
  }
  return { say: `${only} of ${suites.length}`, note: `${named} name a client file by its folder and name, ${named - only} of them ask filesOf too` };
}
