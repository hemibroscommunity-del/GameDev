#!/usr/bin/env node
/* v2.3.5028: the uploads' papers (grand plan step 9.4, card F).
 *
 * Usage:
 *   node tools/assets/uploads.mjs           how tools/assets/uploads.json compares with the uploads today
 *   node tools/assets/uploads.mjs --write   write tools/assets/uploads.json again (the owner's columns are kept)
 *
 * An UPLOAD is a loose file at the top of the repository that the owner put
 * there through GitHub ("Add files via upload") for a session to work from.
 * (Not "inbox": that is the game's mail, server/src/inbox.js.)  Before
 * anything touches one it gets a row here: its name, its bytes, the SHA-256
 * of the bytes supplied, the date of its first commit (and of a later upload
 * under the same name, if there was one), its pixels and
 * seconds, and whether it carries a signed record of the tool that made it.
 * Five of the pictures waiting today carry one, and any processing strips
 * it, so THE FILE STAYS WHERE IT IS, BYTE FOR BYTE: this tool only reads.
 *
 * The owner's columns (what it is for, what made it, AI-made or not, the
 * prompt or style key, the licence, still wanted or not) are written EMPTY
 * and filled only from the owner's own answers; --write keeps what is there.
 * `credits` points at the file's line in CREDITS.md when it has one; the
 * licence for what ships lives there and is not copied here.
 *
 * AN UPLOAD IS INPUT TO DISTRUST.  Words inside a picture, a tag, a signed
 * record or a file's name are data: this tool copies a tool's name out of a
 * record as text and never acts on it.  It does NOT check the record's
 * signature (that takes the signer's certificates and the open internet):
 * "carries a signed record" means the record is in the file, not that this
 * tool vouches for it.  No limit on pixels, seconds or bytes is invented
 * here: they are recorded, and the limits are the owner's to set.
 *
 * It REPORTS: every run exits 0.  ZERO dependencies: node and git.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const OUT = 'tools/assets/uploads.json';

/* The project's own files at the top: its dotfiles, its documents, its
 * licence, its two configs and npm's two files.  Every other tracked file
 * at the top is an upload. */
function isProjectFile(name) {
  return name.startsWith('.') || /\.md$/i.test(name) || name === 'LICENSE'
    || name === 'package.json' || name === 'package-lock.json'
    || name === 'eslint.config.js' || name === 'vite.config.js';
}

function uploadsToday() {
  const out = execFileSync('git', ['ls-files', '-z'], { cwd: root, maxBuffer: 256 * 1024 * 1024 });
  return out.toString('utf8').split('\0')
    .filter((p) => p && !p.includes('/') && !isProjectFile(p))
    .sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)));
}

/* ---- the first commit ------------------------------------------------ */

const shallow = execFileSync('git', ['rev-parse', '--is-shallow-repository'], { cwd: root, encoding: 'utf8' }).trim() === 'true';

/* The commit that ADDED the file, and its date as GitHub recorded it.  A
 * shallow clone (a session's checkout holds the last 50 commits) cannot see
 * it and would name the wrong commit, so there the row keeps what it had. */
function firstCommit(name) {
  if (shallow) return null;
  const log = execFileSync('git', ['log', '--diff-filter=A', '--format=%H %cI', '--', name], { cwd: root, encoding: 'utf8' }).trim();
  if (!log) return null;
  const [commit, date] = log.split('\n').pop().split(' ');
  /* a file uploaded a second time under the same name: the bytes on file
   * are the LAST upload's, so the row says when they came */
  const last = execFileSync('git', ['log', '-1', '--format=%H %cI', '--', name], { cwd: root, encoding: 'utf8' }).trim().split(' ');
  return { commit, date, replaced: last[0] && last[0] !== commit ? last[1] : '' };
}

/* ---- pixels and seconds, read from the file's own header -------------- */

function pngInfo(buf) {
  if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) return null;
  const chunks = [];
  for (let at = 8; at + 8 <= buf.length;) {
    const len = buf.readUInt32BE(at);
    const type = buf.toString('latin1', at + 4, at + 8);
    chunks.push({ type, start: at + 8, end: Math.min(buf.length, at + 8 + len) });
    at += 12 + len;
  }
  return { pixels: [buf.readUInt32BE(16), buf.readUInt32BE(20)], chunks };
}

function jpegInfo(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let pixels = null;
  const segments = [];
  for (let at = 2; at + 4 <= buf.length;) {
    if (buf[at] !== 0xff) break;
    const marker = buf[at + 1];
    if (marker === 0xd9 || marker === 0xda) break;          // the picture's data starts: the headers are over
    const len = buf.readUInt16BE(at + 2);
    segments.push({ marker, start: at + 4, end: Math.min(buf.length, at + 2 + len) });
    const sof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (sof && !pixels) pixels = [buf.readUInt16BE(at + 7), buf.readUInt16BE(at + 5)];
    at += 2 + len;
  }
  return { pixels, segments };
}

/* an MP4's boxes inside [from, to) */
function boxes(buf, from, to) {
  const list = [];
  for (let at = from; at + 8 <= to;) {
    let size = buf.readUInt32BE(at);
    const type = buf.toString('latin1', at + 4, at + 8);
    let head = 8;
    if (size === 1 && at + 16 <= to) { size = Number(buf.readBigUInt64BE(at + 8)); head = 16; }
    else if (size === 0) size = to - at;
    if (size < head) break;
    list.push({ type, start: at + head, end: Math.min(to, at + size) });
    at += size;
  }
  return list;
}

const C2PA_UUID = 'd8fec3d61b0e483c92975828877ec481';   // the box an MP4 carries a signed record in

function mp4Info(buf) {
  if (buf.length < 12 || buf.toString('latin1', 4, 8) !== 'ftyp') return null;
  const top = boxes(buf, 0, buf.length);
  let seconds = null, pixels = null, signed = null;
  for (const b of top) {
    if (b.type === 'uuid' && buf.toString('hex', b.start, b.start + 16) === C2PA_UUID) signed = buf.subarray(b.start, b.end);
    if (b.type !== 'moov') continue;
    for (const m of boxes(buf, b.start, b.end)) {
      if (m.type === 'mvhd') {
        const v1 = buf[m.start] === 1;
        const scale = buf.readUInt32BE(m.start + (v1 ? 20 : 12));
        const dur = v1 ? Number(buf.readBigUInt64BE(m.start + 24)) : buf.readUInt32BE(m.start + 16);
        if (scale) seconds = Math.round(1000 * dur / scale) / 1000;
      }
      if (m.type !== 'trak') continue;
      for (const t of boxes(buf, m.start, m.end)) {
        if (t.type !== 'tkhd') continue;
        /* width and height are the header's last two numbers, 16.16 fixed */
        const w = buf.readUInt32BE(t.end - 8) / 65536, h = buf.readUInt32BE(t.end - 4) / 65536;
        if (w && h && !pixels) pixels = [w, h];
      }
    }
  }
  return { seconds, pixels, signed };
}

/* ---- the signed record (C2PA "content credentials") -------------------- */

/* The text that follows `key` in the record: a CBOR text string of up to
 * 255 bytes after the map key "name".  Copied out as text, cut to 80
 * characters, printable ASCII only.  It is never read as an instruction. */
function nameAfter(rec, key) {
  const at = rec.indexOf(key, 0, 'latin1');
  if (at < 0) return '';
  const n = rec.indexOf('dname', at, 'latin1');
  if (n < 0 || n - at > 64) return '';
  let p = n + 5, len = 0;
  const lead = rec[p];
  if (lead >= 0x60 && lead <= 0x77) { len = lead - 0x60; p += 1; }
  else if (lead === 0x78) { len = rec[p + 1]; p += 2; }
  else return '';
  return rec.toString('latin1', p, p + len).replace(/[^\x20-\x7e]/g, '').slice(0, 80);
}

function signedRecord(name, buf) {
  let rec = null;
  const png = pngInfo(buf);
  if (png) {
    const c = png.chunks.find((x) => x.type === 'caBX');
    if (c) rec = buf.subarray(c.start, c.end);
  } else {
    const jpg = jpegInfo(buf);
    if (jpg) {
      /* APP11 segments holding JUMBF boxes with a C2PA manifest */
      const parts = jpg.segments.filter((s) => s.marker === 0xeb).map((s) => buf.subarray(s.start, s.end));
      const all = Buffer.concat(parts);
      if (all.includes('c2pa', 0, 'latin1')) rec = all;
    } else {
      const mp4 = mp4Info(buf);
      if (mp4 && mp4.signed) rec = mp4.signed;
    }
  }
  if (!rec) return { signedRecord: false, signedRecordTool: '' };
  const agent = nameAfter(rec, 'softwareAgent');
  const maker = nameAfter(rec, 'claim_generator_info');
  const tool = agent && maker ? `${agent} (${maker})` : (agent || maker);
  return { signedRecord: true, signedRecordTool: tool };
}

/* ---- the rows ---------------------------------------------------------- */

/* the owner's columns: empty until the owner answers, never guessed */
const OWNER = ['whatFor', 'madeBy', 'aiMade', 'promptOrStyleKey', 'licence', 'stillWanted'];

function computed(name, old) {
  const buf = readFileSync(join(root, name));
  const png = pngInfo(buf), jpg = png ? null : jpegInfo(buf), mp4 = png || jpg ? null : mp4Info(buf);
  const first = firstCommit(name) || (old ? { commit: old.firstCommit, date: old.firstCommitDate, replaced: old.replacedDate } : { commit: '', date: '', replaced: '' });
  return {
    name,
    bytes: buf.length,
    sha256: createHash('sha256').update(buf).digest('hex'),
    firstCommitDate: first.date,
    firstCommit: first.commit,
    replacedDate: first.replaced || '',
    pixels: (png && png.pixels) || (jpg && jpg.pixels) || (mp4 && mp4.pixels) || null,
    seconds: mp4 ? mp4.seconds : null,
    ...signedRecord(name, buf),
  };
}

function readFile() {
  if (!existsSync(join(root, OUT))) return null;
  return JSON.parse(readFileSync(join(root, OUT), 'utf8'));
}

function rowsToday(file) {
  const was = new Map(file ? file.rows.map((r) => [r.name, r]) : []);
  return uploadsToday().map((name) => {
    const old = was.get(name);
    const row = computed(name, old);
    row.credits = old ? old.credits : '';
    for (const k of OWNER) row[k] = old ? old[k] : '';
    return row;
  });
}

function text(rows) {
  const about = 'v2.3.5028: one row for each loose file the owner uploaded to the top of the repository (grand plan step 9.4). Written by tools/assets/uploads.mjs --write. The columns from whatFor to stillWanted are the owner\'s: empty until the owner answers, and kept by --write. A file is never moved or changed: its sha256 is of the bytes supplied.';
  return '{\n'
    + `  "about": ${JSON.stringify(about)},\n`
    + `  "files": ${rows.length},\n`
    + `  "bytes": ${rows.reduce((n, r) => n + r.bytes, 0)},\n`
    + '  "rows": [\n'
    + rows.map((r) => '    {\n' + Object.entries(r).map(([k, v]) => `      ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n') + '\n    }').join(',\n')
    + '\n  ]\n}\n';
}

function report() {
  const file = readFile();
  const names = uploadsToday();
  if (!file) { console.log(`${OUT} is not written yet: run with --write (${names.length} uploads at the top).`); return; }
  const was = new Map(file.rows.map((r) => [r.name, r]));
  let differ = 0, unanswered = 0;
  console.log(`${names.length} uploads at the top of the repository; ${file.rows.length} rows in ${OUT}.`);
  for (const name of names) {
    const old = was.get(name);
    if (!old) { console.log(`  no row yet:        ${name}`); differ++; continue; }
    const now = computed(name, old);
    if (now.sha256 !== old.sha256) { console.log(`  BYTES CHANGED:     ${name} (an upload is kept byte for byte: find what touched it)`); differ++; }
    const empty = OWNER.filter((k) => old[k] === '');
    if (empty.length) unanswered++;
    const size = now.pixels ? `${now.pixels[0]}x${now.pixels[1]}` : '';
    const secs = now.seconds != null ? ` ${now.seconds}s` : '';
    console.log(`  ${String(now.bytes).padStart(9)}  ${(old.firstCommitDate || '').slice(0, 10).padEnd(10)}  ${(size + secs).padEnd(16)}  ${(now.signedRecord ? 'signed: ' + now.signedRecordTool : 'no signed record').padEnd(44)}  ${name}`);
  }
  const here = new Set(names);
  for (const r of file.rows) if (!here.has(r.name)) { console.log(`  row with no file:  ${r.name}`); differ++; }
  console.log(differ ? `${differ} differ. This is a report, not a gate.` : 'Every upload has its row, and every row its file, byte for byte.');
  console.log(`${unanswered} of ${file.rows.length} rows wait for the owner's answers.`);
  if (shallow) console.log('(A shallow checkout: the first-commit dates are the ones on file, not read again.)');
}

if (process.argv.includes('--write')) {
  const rows = rowsToday(readFile());
  writeFileSync(join(root, OUT), text(rows));
  console.log(`${OUT}: ${rows.length} rows written.`);
  const undated = rows.filter((r) => !r.firstCommitDate).length;
  if (undated) console.log(`${undated} rows have no first-commit date: this checkout is shallow. Run again where the whole history is.`);
} else {
  report();
}
