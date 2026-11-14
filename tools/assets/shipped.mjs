#!/usr/bin/env node
/* v2.3.5241: the record of what ships (grand plan step 9.1, card P).
 *
 * Usage:
 *   node tools/assets/shipped.mjs               how tools/assets/shipped.json compares with public/ today
 *   node tools/assets/shipped.mjs --families    one line a family: kind, draw path, files, MB, over its bar
 *   node tools/assets/shipped.mjs --write       write tools/assets/shipped.json again
 *
 * THE REACH is every file git tracks under public/ that is a picture, a
 * sound, a video or data (families.mjs ASSET_REACH: png webp jpeg/jpg svg mp3 m4a
 * mp4 json bin tmx).  Code is out (.js, .html, the Tiled .tsx sets,
 * _headers, the manifest).  Each file in reach is matched to ONE family of
 * tools/assets/families.mjs by its path, and gets one row here: its path,
 * its bytes, the SHA-256 of its bytes, its family and its kind (supplied,
 * made or data).  A file no family matches is `unsorted`: a census, whose
 * count may only fall (rule 3 of the plan's part 5).
 *
 * A file the door itself made (tools/assets/finish.mjs, PR 3 on) carries a
 * `door` field: its sources' hashes, its recipe and the tool's tag, written
 * through recordRows below (v2.3.5243) and never by --write, which keeps it
 * while the file's bytes are the ones the door wrote, and drops it (and says
 * so) when they are not.
 *
 * It REPORTS: every run exits 0, a stale shipped.json included.  The gate
 * is tools/guards/asset-door.test.mjs (card P, PR 4), which imports the
 * functions below rather than a second copy of them.
 *
 * "Over its bar" (--families) is read by the game's own reader: a picture is
 * within the bar of 256 colours when src/rendering/png8Decode.js reads its
 * chunks (an 8-bit palette PNG, not interlaced).  Recorded for every family;
 * held by the gate for supplied families only.  Nothing is decoded or made
 * again here: the record is of bytes, never of a re-made file (two
 * machines' encoders differ).
 *
 * It moves, renames and rewrites no file but shipped.json.
 * ZERO dependencies: node and git.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ASSET_REACH, ASSET_KINDS, ASSET_DRAWS, ASSET_FAMILIES } from './families.mjs';
import { readPng8Chunks } from '../../src/rendering/png8Decode.js';

export const ROOT = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
export const OUT = 'tools/assets/shipped.json';
export const UNSORTED = 'unsorted';

/* ---- the reach ---------------------------------------------------------- */

const reachRe = new RegExp(`^${ASSET_REACH.under.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*\\.(?:${ASSET_REACH.ext.join('|')})$`, 'i');

/** every path git tracks in reach, sorted by its bytes (the same order on
 *  every machine).  v2.3.5243: a tracked file deleted in the working tree is
 *  not in reach (weights.mjs's way: it weighs nothing), so its row reads as
 *  a row with no file, never a crash. */
export function inReach(root = ROOT) {
  const out = execFileSync('git', ['ls-files', '-z', '--', ASSET_REACH.under], { cwd: root, maxBuffer: 256 * 1024 * 1024 });
  return out.toString('utf8').split('\0').filter((p) => p && reachRe.test(p) && existsSync(join(root, p)))
    .sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)));
}

/* ---- a family's path pattern ------------------------------------------- */

/** A glob as a RegExp over the whole path: `**` any run of folders (none
 *  too), `*` within one name, `?` one character, `{a,b}` either. */
export function globRe(glob) {
  let re = '';
  let depth = 0;
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') {
      i++;
      if (glob[i + 1] === '/') { i++; re += '(?:.*/)?'; } else re += '.*';
    } else if (c === '*') re += '[^/]*';
    else if (c === '?') re += '[^/]';
    else if (c === '{') { depth++; re += '(?:'; }
    else if (c === '}' && depth) { depth--; re += ')'; }
    else if (c === ',' && depth) re += '|';
    else re += c.replace(/[.+^$()|[\]\\]/g, '\\$&');
  }
  return new RegExp('^' + re + '$');
}

const listOf = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const famRes = ASSET_FAMILIES.map((fam) => ({ fam, res: listOf(fam.pattern).map(globRe), not: listOf(fam.not).map(globRe) }));

/** every family whose pattern matches `path` and whose `not` does not (one,
 *  when the table is right) */
export function familiesOf(path) {
  return famRes.filter(({ res, not }) => res.some((r) => r.test(path)) && !not.some((r) => r.test(path))).map(({ fam }) => fam);
}

/** the table's own faults: a name twice, a kind or draw path off its closed
 *  list, a made family with no tool.  (The gate's holds start here.) */
export function tableFaults() {
  const faults = [];
  const seen = new Set();
  for (const f of ASSET_FAMILIES) {
    if (!f.name || seen.has(f.name)) faults.push(`family name missing or twice: ${f.name}`);
    seen.add(f.name);
    if (f.name === UNSORTED) faults.push(`"${UNSORTED}" is the census, never a family`);
    if (!ASSET_KINDS.includes(f.kind)) faults.push(`${f.name}: kind ${f.kind} is not one of ${ASSET_KINDS.join(', ')}`);
    if (!Object.hasOwn(ASSET_DRAWS, f.draw)) faults.push(`${f.name}: draw path ${f.draw} is not one of ${Object.keys(ASSET_DRAWS).join(', ')}`);
    if (f.kind === 'made' && !f.tool) faults.push(`${f.name}: a made family names its tool (or 'unknown')`);
    if (f.kind === 'supplied' && f.tool) faults.push(`${f.name}: a supplied family has no tool (made by a tool is 'made')`);
  }
  return faults;
}

/* ---- the rows ------------------------------------------------------------ */

export function rowOf(path, root = ROOT) {
  const buf = readFileSync(join(root, path));
  const fams = familiesOf(path);
  const fam = fams.length === 1 ? fams[0] : null;
  return {
    path,
    bytes: buf.length,
    sha256: createHash('sha256').update(buf).digest('hex'),
    family: fam ? fam.name : UNSORTED,
    kind: fam ? fam.kind : UNSORTED,
    ...(fams.length > 1 ? { twice: fams.map((f) => f.name) } : {}),
  };
}

/** the head's totals, made from the rows (the gate holds them equal) */
export function totalsOf(rows) {
  const kinds = Object.fromEntries([...ASSET_KINDS, UNSORTED].map((k) => [k, 0]));
  for (const r of rows) kinds[r.kind] = (kinds[r.kind] || 0) + 1;
  return {
    files: rows.length,
    bytes: rows.reduce((n, r) => n + r.bytes, 0),
    families: new Set(rows.map((r) => r.family).filter((f) => f !== UNSORTED)).size,
    kinds,
    unsorted: kinds[UNSORTED],
  };
}

export function readShipped(root = ROOT) {
  if (!existsSync(join(root, OUT))) return null;
  return JSON.parse(readFileSync(join(root, OUT), 'utf8'));
}

/* one row a line, so a changed file is a one-line diff */
function text(rows) {
  const head = {
    about: 'v2.3.5241: one row for each file git tracks under public/ that is a picture, a sound, a video or data (grand plan step 9.1): its bytes, the SHA-256 of its bytes, its family (tools/assets/families.mjs) and its kind. Written by node tools/assets/shipped.mjs --write; never by hand. A row with a "door" field was made by tools/assets/finish.mjs.',
    ...totalsOf(rows),
  };
  return '{\n'
    + Object.entries(head).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},\n`).join('')
    + '  "rows": [\n'
    + rows.map((r) => '    ' + JSON.stringify(r)).join(',\n')
    + '\n  ]\n}\n';
}

/** v2.3.5243: the door's own rows (tools/assets/finish.mjs): each { path,
 *  door } is written as the file now is (its bytes, hash, family, kind) with
 *  its `door` field, every other row kept, the totals made again. */
export function recordRows(doorRows, root = ROOT) {
  const file = readShipped(root);
  const by = new Map((file ? file.rows : []).map((r) => [r.path, r]));
  for (const d of doorRows) {
    const r = rowOf(d.path, root);
    delete r.twice;
    r.door = d.door;
    by.set(d.path, r);
  }
  const rows = [...by.values()].sort((a, b) => Buffer.compare(Buffer.from(a.path), Buffer.from(b.path)));
  writeFileSync(join(root, OUT), text(rows));
  return rows.length;
}

/* ---- over its bar -------------------------------------------------------- */

/** within the bar when the game's reader reads the picture's chunks (8-bit
 *  palette, not interlaced); null for what is not a picture the bar holds */
export function withinBar(path, root = ROOT) {
  if (!/\.png$/i.test(path)) return /\.(webp|jpe?g)$/i.test(path) ? false : null;
  const c = readPng8Chunks(readFileSync(join(root, path)));
  return !!c;
}

/* ---- the reports --------------------------------------------------------- */

const mb = (n) => (n / 1048576).toFixed(2);

function compare() {
  const file = readShipped();
  const paths = inReach();
  const faults = tableFaults();
  for (const f of faults) console.log(`  table: ${f}`);
  if (!file) { console.log(`${OUT} is not written yet: run with --write (${paths.length} files in reach).`); return; }
  const was = new Map(file.rows.map((r) => [r.path, r]));
  const lines = [];
  const now = paths.map((p) => rowOf(p));
  for (const r of now) {
    const old = was.get(r.path);
    if (r.twice) lines.push(`  two families match: ${r.path} (${r.twice.join(', ')})`);
    if (!old) { lines.push(`  no row yet:         ${r.path}`); continue; }
    if (old.sha256 !== r.sha256 || old.bytes !== r.bytes) lines.push(`  bytes changed:      ${r.path}${old.door ? ' (the door made it: run its tool again)' : ''}`);
    if (old.family !== r.family) lines.push(`  family changed:     ${r.path} (${old.family} -> ${r.family})`);
  }
  const here = new Set(paths);
  for (const r of file.rows) if (!here.has(r.path)) lines.push(`  row with no file:   ${r.path}`);
  const t = totalsOf(now);
  console.log(`In reach today: ${t.files} files, ${t.bytes} bytes (${mb(t.bytes)} MB), ${t.families} families.`);
  console.log(`  ${ASSET_KINDS.map((k) => `${k} ${t.kinds[k]}`).join(', ')}, ${UNSORTED} ${t.unsorted} (on file: ${file.unsorted}).`);
  const head = totalsOf(file.rows);
  if (head.files !== file.files || head.bytes !== file.bytes || head.unsorted !== file.unsorted) lines.push(`  ${OUT}'s totals are not its rows' (files ${file.files}/${head.files}, bytes ${file.bytes}/${head.bytes}, unsorted ${file.unsorted}/${head.unsorted})`);
  for (const l of lines) console.log(l);
  console.log(lines.length ? `${lines.length} differ. This is a report, not a gate: --write writes the record again.` : 'Every file in reach has its row, and every row its file, byte for byte.');
}

function families() {
  const rows = inReach().map((p) => rowOf(p));
  const barOf = new Map(ASSET_FAMILIES.map((f) => [f.name, f.bar]));
  const by = new Map();
  for (const r of rows) {
    const e = by.get(r.family) || { files: 0, bytes: 0, over: 0 };
    e.files++; e.bytes += r.bytes;
    /* only a family with a bar (no data, sound, video or vector) */
    if (barOf.get(r.family) && withinBar(r.path) === false) e.over++;
    by.set(r.family, e);
  }
  const wide = Math.max(10, ...ASSET_FAMILIES.map((f) => f.name.length));
  console.log(`${'family'.padEnd(wide)}  ${'kind'.padEnd(8)}  ${'draw'.padEnd(7)}  ${'files'.padStart(5)}  ${'MB'.padStart(7)}  over bar (not read by png8Decode.js; the size is the gate's)`);
  const list = [...ASSET_FAMILIES].sort((a, b) => ((by.get(b.name) || {}).bytes || 0) - ((by.get(a.name) || {}).bytes || 0));
  for (const f of list) {
    const e = by.get(f.name) || { files: 0, bytes: 0, over: 0 };
    console.log(`${f.name.padEnd(wide)}  ${f.kind.padEnd(8)}  ${f.draw.padEnd(7)}  ${String(e.files).padStart(5)}  ${mb(e.bytes).padStart(7)}  ${e.over}${e.files ? '' : '   (matches no file)'}`);
  }
  const u = by.get(UNSORTED);
  if (u) console.log(`${UNSORTED.padEnd(wide)}  ${''.padEnd(8)}  ${''.padEnd(7)}  ${String(u.files).padStart(5)}  ${mb(u.bytes).padStart(7)}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const args = process.argv.slice(2);
  if (args.includes('--write')) {
    const old = readShipped();
    const was = new Map(old ? old.rows.map((r) => [r.path, r]) : []);
    let dropped = 0;
    const rows = inReach().map((p) => {
      const r = rowOf(p);
      delete r.twice;
      const o = was.get(p);
      if (o && o.door) {
        if (o.sha256 === r.sha256) r.door = o.door;
        else { dropped++; console.log(`  ${p}: its bytes are not the ones the door wrote; its door field is dropped`); }
      }
      return r;
    });
    writeFileSync(join(ROOT, OUT), text(rows));
    const t = totalsOf(rows);
    console.log(`${OUT}: ${rows.length} rows written (${ASSET_KINDS.map((k) => `${k} ${t.kinds[k]}`).join(', ')}, ${UNSORTED} ${t.unsorted}).`);
    if (dropped) console.log(`${dropped} door fields dropped.`);
    for (const f of tableFaults()) console.log(`  table: ${f}`);
  } else if (args.includes('--families')) {
    families();
  } else {
    compare();
  }
}
