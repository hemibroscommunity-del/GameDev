/* ═══ v2.3.5587: THE DATA'S ONE LINE (red team RT-2, finding F5) ═══
 *
 * Every player's record lives in the GameRoom Durable Object, and Cloudflare
 * deletes an object's storage when its class is deleted.  The command for
 * that is one line in server/wrangler.toml's `[[migrations]]`:
 * `deleted_classes = ["GameRoom"]`.  A `renamed_classes` or
 * `transferred_classes` line moves the data to another class (a typo there
 * loses it the same way).  Every merge touching server/** deploys
 * (deploy-worker.yml), so such a line, added by mistake, would take every
 * character at the next merge, and nothing read that block before this
 * guard.  Whether Cloudflare's 30-day history survives a deleted class is not
 * documented: treat it as gone (docs/security/rt2-findings.md, F5).
 *
 * This guard READS wrangler.toml (never writes it) and holds:
 *
 *   1. its `[[migrations]]` blocks are exactly KNOWN below: the same tags, the
 *      same classes, in the same order, and no other key;
 *   2. `deleted_classes`, `renamed_classes` and `transferred_classes` appear
 *      nowhere in the file outside a comment, and no migrations are written
 *      any other way (an inline `migrations = [...]`, or an environment's
 *      own `[[env.<name>.migrations]]`), which part 1 would not read.
 *
 * It runs in the deploy's own `test` job (cd server && npm test runs every
 * guard), so a bad line fails that job and nothing deploys; and it is a
 * guard, not a server suite, so merging it deploys nothing (TRAPS §277).
 *
 * A NEW Durable Object class is a new block appended to KNOWN, in the same PR
 * as its block in wrangler.toml (which changes only on the owner's word:
 * CLAUDE.md, REPO-SAFETY).  Never delete, rename or transfer a class here to
 * make this green: that is the change this guard exists to stop.
 *
 * BREAK PROOF (rule 8), each tried by hand on a scratch copy (--file), 2026-11-15:
 *   1. `deleted_classes = ["Arena"]` added to the [[migrations]] block   -> FAIL 1, 2
 *   2. a second block `tag = "v2"`, `renamed_classes = [...]`            -> FAIL 1, 2
 *   3. "Feedback" taken out of new_sqlite_classes                       -> FAIL 1
 *   4. `[[env.staging.migrations]]` with `deleted_classes`               -> FAIL 2
 *
 * Run from the repository's root:
 *   node tools/guards/do-migrations.test.mjs                 the checks
 *   node tools/guards/do-migrations.test.mjs --file <path>   the same checks on another
 *                                                            copy (a break proof's scratch copy)
 * (cd server && npm test runs it with every other guard and suite).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/fourLines.mjs';

/* The migrations the live worker has run, oldest first (wrangler.toml). */
const KNOWN = [
  { tag: 'v1', new_sqlite_classes: ['GameRoom', 'Marketplace', 'Leaderboard', 'Arena', 'Feedback'] },
];
const FORBIDDEN = ['deleted_classes', 'renamed_classes', 'transferred_classes'];

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 900)));
};

const fi = process.argv.indexOf('--file');
const file = fi > 0 && process.argv[fi + 1] ? process.argv[fi + 1] : join(ROOT, 'server', 'wrangler.toml');
const text = readFileSync(file, 'utf8');

/* A line without its comment: a `#` outside a quoted string ends it. */
function uncomment(line) {
  let q = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '\\' && q === '"') i++; else if (c === q) q = null; }
    else if (c === '"' || c === "'") q = c;
    else if (c === '#') return line.slice(0, i);
  }
  return line;
}
const lines = text.split(/\r?\n/).map(uncomment);

/* The [[migrations]] blocks: each key's value as written (an array may run
   over several lines until its brackets close).  Enough TOML for this file:
   a value is a string or an array of strings. */
const blocks = [];
const headers = [];
let cur = null;
for (let i = 0; i < lines.length; i++) {
  const t = lines[i].trim();
  if (!t) continue;
  const h = t.match(/^\[\[?\s*([^\]]+?)\s*\]\]?$/);
  if (h) {
    headers.push(h[1]);
    cur = (t.startsWith('[[') && h[1] === 'migrations') ? {} : null;
    if (cur) blocks.push(cur);
    continue;
  }
  if (!cur) continue;
  const kv = t.match(/^([A-Za-z0-9_.-]+)\s*=\s*(.*)$/);
  if (!kv) { cur['?' + i] = t; continue; }
  let v = kv[2];
  let depth = (v.match(/\[/g) || []).length - (v.match(/\]/g) || []).length;
  while (depth > 0 && i + 1 < lines.length) {
    i++;
    v += ' ' + lines[i].trim();
    depth = (v.match(/\[/g) || []).length - (v.match(/\]/g) || []).length;
  }
  v = v.trim();
  const strs = [...v.matchAll(/"((?:[^"\\]|\\.)*)"|'([^']*)'/g)].map((m) => (m[1] !== undefined ? m[1] : m[2]));
  cur[kv[1]] = v.startsWith('[') ? strs : (strs.length === 1 ? strs[0] : v);
}

/* ── 1. the blocks are the known ones ── */
check(`1: wrangler.toml has ${KNOWN.length} [[migrations]] block(s), as KNOWN does`, blocks.length === KNOWN.length,
  { found: blocks.length, known: KNOWN.length });
KNOWN.forEach((want, n) => {
  const got = blocks[n] || {};
  const same = JSON.stringify(Object.keys(got).sort()) === JSON.stringify(Object.keys(want).sort())
    && Object.keys(want).every((k) => JSON.stringify(got[k]) === JSON.stringify(want[k]));
  check(`1: block ${n + 1} is tag "${want.tag}" with exactly its classes and no other key`, same, { found: got, known: want });
});
check('1: no [[migrations]] block past the known ones (a new class is appended to KNOWN in the same PR)',
  blocks.length <= KNOWN.length, blocks.slice(KNOWN.length));

/* ── 2. nothing deletes, renames or moves a class, anywhere ── */
const said = FORBIDDEN.filter((w) => lines.some((l) => l.includes(w)));
check('2: no deleted_classes, renamed_classes or transferred_classes outside a comment', said.length === 0, said);
const otherHeaders = headers.filter((h) => /(^|\.)migrations$/.test(h) && h !== 'migrations');
check('2: no migrations under another table ([[env.<name>.migrations]])', otherHeaders.length === 0, otherHeaders);
const inline = lines.some((l) => /^\s*migrations\s*=/.test(l) || /(^|[\s.])migrations\s*=/.test(l.trim()));
check('2: no migrations written inline (migrations = [...])', !inline);

console.log(failed ? `\n${failed} FAILED` : '\nall green');
process.exit(failed ? 1 : 0);
