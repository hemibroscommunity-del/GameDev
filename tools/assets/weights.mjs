#!/usr/bin/env node
/* v2.3.5027: the repository's weight, and the hash of every source under
 * assets/ (grand plan step 9.0, card F).
 *
 * Usage:
 *   node tools/assets/weights.mjs                 the bytes git tracks under each top folder
 *   node tools/assets/weights.mjs --under public  the same, one level down inside a folder
 *   node tools/assets/weights.mjs --sources       how tools/assets/sources.json compares with assets/ today
 *   node tools/assets/weights.mjs --write-sources write tools/assets/sources.json again
 *
 * Why it exists: the checkout is close to a gigabyte, and nobody had the
 * number by folder.  The plan's asset door (pillar 9) starts with papers:
 * before a source can move out of the repository it is named by the hash of
 * its bytes, so whatever holds it later can be checked against this list.
 *
 * It REPORTS.  It fails nothing: every run exits 0, a stale sources.json
 * included.  A gate is a test GitHub runs (rule 1 of the plan's part 5), and
 * the guards folder is another card's.
 *
 * "The bytes git tracks" are the sizes of the files in git's index as they
 * sit in the working tree: what a fresh checkout puts on the disk, without
 * .git itself, node_modules or a build.
 *
 * It moves, renames and rewrites no file but sources.json.
 * ZERO dependencies: node and git.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, lstatSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const SOURCES = 'tools/assets/sources.json';
const TOP = '(files at the top)';

/* every path git tracks under `prefix` ('' for all of it), sorted by the
 * path's bytes so the order is the same on every machine */
function tracked(prefix) {
  const args = ['ls-files', '-z'];
  if (prefix) args.push('--', prefix);
  const out = execFileSync('git', args, { cwd: root, maxBuffer: 256 * 1024 * 1024 });
  const paths = out.toString('utf8').split('\0').filter(Boolean);
  return paths.sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)));
}

/* a tracked path that is deleted in the working tree weighs nothing here */
function bytesOf(path) {
  try { return lstatSync(join(root, path)).size; } catch { return 0; }
}

const mb = (n) => (n / 1048576).toFixed(1).padStart(9) + ' MB';

/* group the tracked files by the first folder below `prefix` */
function weigh(prefix) {
  const base = prefix ? prefix.replace(/\/+$/, '') + '/' : '';
  const rows = new Map();
  let files = 0, total = 0;
  for (const path of tracked(prefix)) {
    const rest = path.slice(base.length);
    const cut = rest.indexOf('/');
    const key = cut < 0 ? TOP : rest.slice(0, cut);
    const size = bytesOf(path);
    const row = rows.get(key) || { files: 0, bytes: 0 };
    row.files++; row.bytes += size;
    rows.set(key, row);
    files++; total += size;
  }
  return { rows, files, total };
}

function printWeights(prefix) {
  const { rows, files, total } = weigh(prefix);
  const list = [...rows.entries()].sort((a, b) => b[1].bytes - a[1].bytes);
  const wide = Math.max(12, ...list.map(([k]) => k.length));
  console.log(`The bytes git tracks under ${prefix ? prefix.replace(/\/+$/, '') + '/' : 'each top folder'}`);
  console.log(`${'folder'.padEnd(wide)}  ${'files'.padStart(6)}  ${'bytes'.padStart(13)}  ${''.padStart(12)}  share`);
  for (const [key, row] of list) {
    const share = total ? (100 * row.bytes / total).toFixed(1) : '0.0';
    console.log(`${key.padEnd(wide)}  ${String(row.files).padStart(6)}  ${String(row.bytes).padStart(13)}  ${mb(row.bytes)}  ${share.padStart(5)}%`);
  }
  console.log(`${'total'.padEnd(wide)}  ${String(files).padStart(6)}  ${String(total).padStart(13)}  ${mb(total)}`);
}

/* one row for each file under assets/: its path, its bytes, the SHA-256 of
 * its bytes.  Read from the working tree, which is what git checked out:
 * the repository has no .gitattributes, so no file's bytes are changed on
 * the way. */
function sourceRows() {
  return tracked('assets').map((path) => {
    const buf = readFileSync(join(root, path));
    return { path, bytes: buf.length, sha256: createHash('sha256').update(buf).digest('hex') };
  });
}

/* one row a line, so a changed source is a one-line diff */
function sourcesText(rows) {
  const bytes = rows.reduce((n, r) => n + r.bytes, 0);
  const head = {
    about: 'v2.3.5027: every file git tracks under assets/, named by the SHA-256 of its bytes (grand plan step 9.0). Written by tools/assets/weights.mjs --write-sources; never by hand.',
    files: rows.length,
    bytes,
  };
  return '{\n'
    + Object.entries(head).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},\n`).join('')
    + '  "rows": [\n'
    + rows.map((r) => '    ' + JSON.stringify(r)).join(',\n')
    + '\n  ]\n}\n';
}

function compareSources() {
  const now = sourceRows();
  if (!existsSync(join(root, SOURCES))) {
    console.log(`${SOURCES} is not written yet: run with --write-sources (${now.length} files under assets/).`);
    return;
  }
  const file = JSON.parse(readFileSync(join(root, SOURCES), 'utf8'));
  const was = new Map(file.rows.map((r) => [r.path, r]));
  const seen = new Set();
  const added = [], changed = [];
  for (const r of now) {
    seen.add(r.path);
    const old = was.get(r.path);
    if (!old) added.push(r.path);
    else if (old.sha256 !== r.sha256 || old.bytes !== r.bytes) changed.push(r.path);
  }
  const gone = file.rows.filter((r) => !seen.has(r.path)).map((r) => r.path);
  const bytes = now.reduce((n, r) => n + r.bytes, 0);
  console.log(`assets/ today: ${now.length} files, ${bytes} bytes (${mb(bytes).trim()}).`);
  console.log(`${SOURCES}: ${file.rows.length} rows, ${file.bytes} bytes.`);
  if (!added.length && !changed.length && !gone.length) {
    console.log('Every file under assets/ has its row, and every row its file, byte for byte.');
    return;
  }
  for (const p of added) console.log(`  no row yet:      ${p}`);
  for (const p of changed) console.log(`  bytes changed:   ${p}`);
  for (const p of gone) console.log(`  row with no file: ${p}`);
  console.log(`${added.length + changed.length + gone.length} differ. This is a report, not a gate: --write-sources writes the list again.`);
}

const args = process.argv.slice(2);
if (args.includes('--write-sources')) {
  const rows = sourceRows();
  writeFileSync(join(root, SOURCES), sourcesText(rows));
  console.log(`${SOURCES}: ${rows.length} rows written.`);
} else if (args.includes('--sources')) {
  compareSources();
} else {
  const at = args.indexOf('--under');
  printWeights(at >= 0 ? (args[at + 1] || '') : '');
}
