/* ═══ v2.3.6421: WHAT CHANGED SINCE MAIN, BY GIT'S OWN IDS (card CK PR 2) ═══
 *
 * The asset guards (asset-door, asset-sources) hashed every file they hold
 * on every run: 143 MB under public/ and 393 MB under assets/, 30 s of a
 * suite run 4-wide on a session's box (docs/plan/census/shape-cost.md).
 * Git already names every file's content: the blob id, kept in the index
 * for the working tree and in a commit's tree for main.  A file whose id is
 * main's, and whose row is main's, was checked when main took it: it is
 * trusted without being read.  Everything else is hashed as before.
 *
 * Where main is (mainBase):
 *   - on GitHub the checkout is one commit, the PR merged into main (or, on
 *     main, the merge): its first parent IS main, fetched by its id at depth
 *     1 (actions/checkout keeps the token for it; switches-thrown's way);
 *   - on a session's box: the merge base with origin/main;
 *   - BT_ASSETS_BASE=<commit> (the plants, by hand) names main's commit;
 *   - BT_ASSETS_WHOLE=1 (the gatekeeper's rehearsal, once a sitting), or
 *     no main to be found: no base, every file hashed (the old run).
 * A file's id now (idsNow): the index's, unless the working tree differs
 * from the index by git's own stat check (git diff-files): then null, and
 * the guard hashes it.  Nothing here writes the index (suites run 4-wide).
 */
import { spawnSync } from 'node:child_process';
import { ROOT } from './fourLines.mjs';

const git = (args, timeout = 60000) => {
  const r = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', timeout, maxBuffer: 256 * 1024 * 1024 });
  return r.status === 0 ? r.stdout : null;
};
const zsplit = (t) => (t || '').split('\0').filter(Boolean);

/** main's commit to compare with: { base: '<sha>' | null, how } */
export function mainBase() {
  if (process.env.BT_ASSETS_WHOLE === '1') return { base: null, how: 'BT_ASSETS_WHOLE=1 (the gatekeeper\'s rehearsal): every file hashed' };
  if (process.env.BT_ASSETS_BASE) {
    const b = git(['rev-parse', '--verify', '--quiet', process.env.BT_ASSETS_BASE + '^{commit}']);
    return b ? { base: b.trim(), how: 'BT_ASSETS_BASE, ' + b.trim().slice(0, 10) } : { base: null, how: 'BT_ASSETS_BASE names no commit: every file hashed' };
  }
  if (process.env.GITHUB_ACTIONS === 'true') {
    const head = git(['cat-file', '-p', 'HEAD']);
    const parent = head && (/^parent ([0-9a-f]{40})$/m.exec(head) || [])[1];
    if (!parent) return { base: null, how: 'GitHub: HEAD names no parent: every file hashed' };
    /* two guards may fetch it at once (suites run 4-wide): one may lose the
       shallow file's lock, so it looks again and tries once more */
    for (let i = 0; i < 2 && git(['cat-file', '-e', parent + '^{commit}']) === null; i++) {
      git(['fetch', '--no-tags', '--quiet', '--depth=1', 'origin', parent], 120000);
    }
    return git(['cat-file', '-e', parent + '^{commit}']) === null
      ? { base: null, how: 'GitHub: main (' + parent.slice(0, 10) + ') could not be fetched: every file hashed' }
      : { base: parent, how: 'GitHub: the merge\'s first parent, main ' + parent.slice(0, 10) };
  }
  const mb = git(['merge-base', 'HEAD', 'origin/main']);
  return mb && mb.trim()
    ? { base: mb.trim(), how: 'the merge base with origin/main, ' + mb.trim().slice(0, 10) }
    : { base: null, how: 'no origin/main here: every file hashed' };
}

/** path -> blob id in `base`'s tree, under `under` (null: git failed) */
export function idsAt(base, under) {
  const t = git(['ls-tree', '-r', '-z', base, '--', under]);
  if (t === null) return null;
  const m = new Map();
  for (const e of zsplit(t)) { const tab = e.indexOf('\t'); const [, type, id] = e.slice(0, tab).split(' '); if (type === 'blob') m.set(e.slice(tab + 1), id); }
  return m;
}

/** path -> blob id of the working tree's file, by the index; null where
 *  the working tree differs from the index (hash it).  null: git failed */
export function idsNow(under) {
  const s = git(['ls-files', '-s', '-z', '--', under]);
  const d = git(['diff-files', '--name-only', '-z', '--', under]);
  if (s === null || d === null) return null;
  const m = new Map();
  for (const e of zsplit(s)) { const tab = e.indexOf('\t'); m.set(e.slice(tab + 1), e.slice(0, tab).split(' ')[1]); }
  for (const p of zsplit(d)) m.set(p, null);
  return m;
}

/** a file's text in `base` (null: not there) */
export const textAt = (base, path) => git(['show', base + ':' + path]);

/** a blob's bytes by its id (null: not there) */
export function blobBytes(id) {
  const r = spawnSync('git', ['cat-file', 'blob', id], { cwd: ROOT, timeout: 60000, maxBuffer: 256 * 1024 * 1024 });
  return r.status === 0 ? r.stdout : null;
}

/** the paths among `paths` whose content in the working tree is not
 *  `base`'s (one git diff; null: git failed) */
export function changedSince(base, paths) {
  const d = git(['diff', '--name-only', '-z', base, '--', ...paths]);
  return d === null ? null : new Set(zsplit(d));
}
