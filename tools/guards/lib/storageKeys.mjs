/* ═══ v2.3.5781: THE STORAGE KEY RULE, ONE COPY (card U2 PR 2; CLAUDE.md §8 row "a storage key") ═══
 *
 * Moved here from tools/dev/precheck.mjs's check 5 (`storage-keys`), word
 * for word: every literal `storage.put/get('<prefix>:` in server/src/ names
 * a prefix that is in ARCHITECTURE-HANDOFF's rule-2 registry table.
 * Literal-only by design (computed keys cannot be read reliably); the other
 * Durable Objects (marketplace, arena, leaderboard, feedback) are exempt:
 * the registry covers GameRoom's storage.
 *
 * Precheck runs it over the files a branch changed; the guard
 * (tools/guards/storage-keys.test.mjs) over every server/src/ file.
 * storageKeyRows(root, files, label) gives precheck's rows exactly as it
 * printed them.  Node only (the guards run on GitHub with server/'s packages).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..');
/* registry covers GameRoom DO storage (handoff rule 2); other DOs exempt */
export const STORAGE_EXEMPT = new Set(['server/src/marketplace.js', 'server/src/arena.js',
  'server/src/leaderboard.js', 'server/src/feedback.js']);
const lineOf = (text, idx) => text.slice(0, idx).split('\n').length;

/** The prefixes the rule-2 table names, or null when the file cannot be read. */
export function registeredPrefixes(root = ROOT) {
  try {
    const handoff = readFileSync(join(root, 'docs/ARCHITECTURE-HANDOFF.md'), 'utf8');
    return new Set([...handoff.matchAll(/`([a-zA-Z_][a-zA-Z0-9_]*):/g)].map((mm) => mm[1]));
  } catch { return null; }
}

/** Every code file under server/src/, as paths from the root, sorted. */
export function serverSrcFiles(root = ROOT) {
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(join(root, dir), { withFileTypes: true })) {
      const rel = dir + '/' + e.name;
      if (e.isDirectory()) walk(rel);
      else if (/\.(js|mjs|cjs|jsx)$/.test(e.name)) out.push(rel);
    }
  };
  walk('server/src');
  return out.sort();
}

/** The literal prefixes a file's source reads or writes: [{ prefix, line }]. */
export function literalPrefixes(srcText) {
  return [...srcText.matchAll(/storage\s*\.\s*(?:put|get)\s*\(\s*[`'"]([a-zA-Z_][a-zA-Z0-9_]*):/g)]
    .map((mm) => ({ prefix: mm[1], line: lineOf(srcText, mm.index) }));
}

/** precheck's rows for these server/src files; `label` names them in the PASS line. */
export function storageKeyRows(root = ROOT, files = serverSrcFiles(root), label = 'changed server/src') {
  const rows = [];
  const add = (level, check, msg) => rows.push({ level, check, msg });
  const registry = registeredPrefixes(root);
  let fails = 0, scanned = 0, seen = 0;
  if (!registry) add('WARN', 'storage-keys', 'docs/ARCHITECTURE-HANDOFF.md unreadable — registry check skipped');
  else {
    for (const f of files) {
      if (STORAGE_EXEMPT.has(f)) continue;
      scanned++;
      for (const { prefix, line } of literalPrefixes(readFileSync(join(root, f), 'utf8'))) {
        seen++;
        if (!registry.has(prefix)) {
          fails++;
          add('FAIL', 'storage-keys', `${f}:${line} — storage prefix '${prefix}:' not in the ARCHITECTURE-HANDOFF rule-2 registry table; register it there (same PR)`);
        }
      }
    }
    if (!fails) add('PASS', 'storage-keys', `all literal storage prefixes in ${scanned} ${label} file(s) are registered`);
  }
  return { rows, scanned, seen, fails };
}
