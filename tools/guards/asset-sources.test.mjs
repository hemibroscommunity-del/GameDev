/* ═══ v2.3.5106: sources.json HELD TO assets/ (card B PR 7; card F's Needs) ═══
 *
 * Card F wrote tools/assets/sources.json (v2.3.5027): one row for every file
 * git tracks under assets/, its bytes and the SHA-256 of its bytes, so a
 * source can one day leave the repository named by its hash (grand plan
 * step 9.0).  tools/assets/weights.mjs --sources only REPORTS how the two
 * compare.  This guard fails:
 *
 *   1. a file under assets/ with no row (a source added and not written down);
 *   2. a row with no file (a source removed and its row left);
 *   3. a row whose bytes or hash no longer match its file (a source changed);
 *   4. a sources.json whose own totals (`files`, `bytes`) are not its rows'.
 *
 * The mend for each is card F's command: node tools/assets/weights.mjs --write-sources
 *
 * It reads what weights.mjs reads, the same way: `git ls-files assets`
 * (what git tracks; a stray local file is not a source), each file's bytes
 * from the working tree, SHA-256.  A tracked file deleted from the working
 * tree is "no file".
 *
 * BREAK PROOF (rule 8), each tried by hand, 2026-11-14:
 *   1. `cp assets/items/<a png> assets/items/zz.png && git add` it      -> FAIL 1
 *   2. delete a row from sources.json                                  -> FAIL 1 and 4
 *   3. change one hex digit of a row's sha256                          -> FAIL 3
 *
 * v2.3.6421 (card CK PR 2): it hashed all 393 MB on every run.  Now a file
 * whose git id is main's, and whose row is main's (sources.json as main
 * holds it), was checked when main took it: its size is read, never its
 * bytes (tools/guards/lib/sinceMain.mjs).  Every other file is hashed: one
 * changed on the branch, in the working tree, or whose row changed.  Where
 * no main is found, and in the gatekeeper's rehearsal (BT_ASSETS_WHOLE=1,
 * once a sitting), every file is hashed, as before.
 * BREAK PROOF (rule 8), 2026-11-23, each by hand:
 *   4. one byte of an assets/ picture changed, its size the same
 *      (not committed; then committed on a branch)                    -> FAIL 3
 *   5. 3 again, with only that row changed against main               -> FAIL 3
 *
 * Run from the repository's root: node tools/guards/asset-sources.test.mjs
 * (cd server && npm test runs it with every other guard and suite).
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { statSync } from 'node:fs';
import { ROOT } from './lib/fourLines.mjs';
import { mainBase, idsAt, idsNow, textAt } from './lib/sinceMain.mjs';

const SOURCES = 'tools/assets/sources.json';
let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 900)));
};
const MEND = ' (node tools/assets/weights.mjs --write-sources)';

const doc = JSON.parse(readFileSync(join(ROOT, SOURCES), 'utf8'));
const rows = new Map(doc.rows.map((r) => [r.path, r]));
const tracked = execFileSync('git', ['ls-files', '-z', '--', 'assets'], { cwd: ROOT, maxBuffer: 256 << 20 })
  .toString('utf8').split('\0').filter(Boolean);
const present = tracked.filter((p) => existsSync(join(ROOT, p)));

/* ── 1. every file has its row ── */
{
  const noRow = present.filter((p) => !rows.has(p));
  check(`1: every file git tracks under assets/ has a row in ${SOURCES} (${present.length} files)` + MEND, noRow.length === 0, noRow);
}

/* ── 2. every row has its file ── */
{
  const have = new Set(present);
  const noFile = [...rows.keys()].filter((p) => !have.has(p));
  check(`2: every row has its file (${rows.size} rows)` + MEND, noFile.length === 0, noFile);
}

/* ── 3. every row matches its file, byte for byte ── */
{
  /* v2.3.6421: by git's ids against main (the header); the rest hashed */
  const { base, how } = mainBase();
  const was = base && idsAt(base, 'assets');
  const ids = base && idsNow('assets');
  const mainText = base && textAt(base, SOURCES);
  const mainRows = new Map(mainText ? JSON.parse(mainText).rows.map((r) => [r.path, r]) : []);
  const trusted = (p, r) => {
    if (!was || !ids || !mainText) return false;
    const m = mainRows.get(p);
    return !!(ids.get(p) && ids.get(p) === was.get(p) && m && m.bytes === r.bytes && m.sha256 === r.sha256);
  };
  const changed = [];
  let bytes = 0, hashed = 0, byId = 0;
  for (const p of present) {
    const r = rows.get(p);
    if (!r) continue;
    if (trusted(p, r) && statSync(join(ROOT, p)).size === r.bytes) { byId++; bytes += r.bytes; continue; }
    const buf = readFileSync(join(ROOT, p));
    bytes += buf.length;
    hashed += buf.length;
    if (buf.length !== r.bytes || createHash('sha256').update(buf).digest('hex') !== r.sha256) changed.push(p);
  }
  check(`3: every row's bytes and SHA-256 match its file (${(bytes / 1048576).toFixed(1)} MB: ${byId} files main's by git's id, ${(hashed / 1048576).toFixed(1)} MB hashed; ${how})` + MEND, changed.length === 0, changed);
}

/* ── 4. the file's own totals ── */
{
  const sum = doc.rows.reduce((a, r) => a + r.bytes, 0);
  check(`4: ${SOURCES}'s totals are its rows' (files ${doc.files}, bytes ${doc.bytes})` + MEND,
    doc.files === doc.rows.length && doc.bytes === sum && rows.size === doc.rows.length, { files: doc.rows.length, bytes: sum, distinct: rows.size });
}

console.log(failed ? `\n${failed} FAILED` : '\nall green');
process.exit(failed ? 1 : 0);
