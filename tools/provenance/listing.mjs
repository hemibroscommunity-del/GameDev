#!/usr/bin/env node
/* ═══ v2.3.3308: A FINGERPRINT OF EVERY FILE IN A VERSION, FOR ITS TIMESTAMP ═══
 *
 * The owner: "make something that can prove ownership of my game because I
 * suspect others will clone my game engine or game entirely and try to pass
 * it off as their own. They'll use AI to remove any kind of detection".
 *
 * A mark hidden INSIDE the code is the first thing such a pass removes.  So the
 * proof lives OUTSIDE any copy: each version of main is fingerprinted here and
 * the fingerprint is timestamped in Bitcoin by OpenTimestamps
 * (.github/workflows/provenance.yml), on the `provenance` branch.  A timestamp
 * cannot be made later than it was, by anyone -- the owner included -- so it
 * says "these exact files existed no later than this block".
 *
 * The fingerprint is a LISTING: one line per file in the commit, its SHA-256
 * and its path, sorted by the path's bytes -- then the SHA-256 of that listing.
 * Read from git's own objects (`git ls-tree -r`, `git cat-file --batch`), never
 * the working tree, so it is the committed content exactly and anyone with the
 * repository can make it again for any commit and get the same number.
 *
 *   node tools/provenance/listing.mjs [commit]               the digest
 *   node tools/provenance/listing.mjs [commit] --listing     every line
 *   node tools/provenance/listing.mjs [commit] --manifest F  write F (stamped)
 *   node tools/provenance/listing.mjs --verify F             make F's again
 *   node tools/provenance/listing.mjs [commit] --has FILE..  which of these
 *        files (a suspect's, say) are byte for byte one of the commit's
 *
 * The listing's lines are exactly what `sha256sum` prints, so a checkout of the
 * commit can be checked with no code of ours at all (docs/specs/provenance.md
 * "Checking without our code").  No dependencies: node and git.
 */
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

/* `--listing | head` closes the pipe early: that is the reader being done */
process.stdout.on('error', (e) => { if (e && e.code === 'EPIPE') process.exit(0); throw e; });

export const FORMAT = 'brotown-provenance/1';

const git = (args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 28 }).trim();

/* Every blob in the commit's tree: [{ mode, oid, path (Buffer) }] */
function treeEntries(commit) {
  const out = execFileSync('git', ['ls-tree', '-r', '-z', '--full-tree', commit], { maxBuffer: 1 << 30 });
  const entries = [];
  let i = 0;
  while (i < out.length) {
    const end = out.indexOf(0, i);
    const rec = out.subarray(i, end < 0 ? out.length : end);
    i = end < 0 ? out.length : end + 1;
    if (!rec.length) continue;
    const tab = rec.indexOf(9);
    const [mode, type, oid] = rec.subarray(0, tab).toString('utf8').split(' ');
    if (type !== 'blob') continue;   /* a submodule's commit is not content of this repository */
    entries.push({ mode, oid, path: Buffer.from(rec.subarray(tab + 1)) });
  }
  entries.sort((a, b) => Buffer.compare(a.path, b.path));
  return entries;
}

/* The SHA-256 of every blob, streamed through one `git cat-file --batch`.
   A run fingerprints many commits that share nearly every file, so what was
   read once is kept by git's own id for the rest of the process. */
const seen = new Map();   /* blob oid -> { hash, size } */

async function blobHashes(oids) {
  const todo = [...new Set(oids.filter((o) => !seen.has(o)))];
  if (todo.length) await readBlobs(todo);
  let bytes = 0;
  const hashes = oids.map((o) => { const b = seen.get(o); bytes += b.size; return b.hash; });
  return { hashes, bytes };
}

function readBlobs(oids) {
  return new Promise((resolve, reject) => {
    const proc = spawn('git', ['cat-file', '--batch'], { stdio: ['pipe', 'pipe', 'inherit'] });
    let done = 0;
    let buf = Buffer.alloc(0);
    let need = -1;         /* bytes of content still to read, -1 while reading a header */
    let hash = null, size = 0;
    proc.stdout.on('data', (chunk) => {
      buf = buf.length ? Buffer.concat([buf, chunk]) : chunk;
      for (;;) {
        if (need < 0) {
          const nl = buf.indexOf(10);
          if (nl < 0) return;
          const header = buf.subarray(0, nl).toString('utf8').split(' ');
          buf = buf.subarray(nl + 1);
          if (header[1] === 'missing') { reject(new Error('missing object ' + header[0])); proc.kill(); return; }
          need = size = Number(header[2]);
          hash = createHash('sha256');
        }
        if (need > 0) {
          if (!buf.length) return;
          const take = Math.min(need, buf.length);
          hash.update(buf.subarray(0, take));
          buf = buf.subarray(take);
          need -= take;
          if (need > 0) return;
        }
        /* the content's own trailing newline */
        if (!buf.length) return;
        buf = buf.subarray(1);
        seen.set(oids[done++], { hash: hash.digest('hex'), size });
        need = -1;
      }
    });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error('git cat-file exited ' + code));
      if (done !== oids.length) return reject(new Error('read ' + done + ' of ' + oids.length + ' files'));
      resolve();
    });
    proc.stdin.end(oids.join('\n') + '\n');
  });
}

/* The listing of a commit, and its digest */
export async function listingOf(commitish) {
  const commit = git(['rev-parse', '--verify', commitish + '^{commit}']);
  const tree = git(['rev-parse', '--verify', commit + '^{tree}']);
  const entries = treeEntries(commit);
  const { hashes, bytes } = await blobHashes(entries.map((e) => e.oid));
  const lines = entries.map((e, k) => Buffer.concat([Buffer.from(hashes[k] + '  '), e.path, Buffer.from('\n')]));
  const listing = Buffer.concat(lines);
  return {
    commit, tree, files: entries.length, bytes, listing,
    listingSha256: createHash('sha256').update(listing).digest('hex'),
  };
}

export async function manifestOf(commitish, repo) {
  const L = await listingOf(commitish);
  return {
    format: FORMAT,
    repo: repo || null,
    commit: L.commit,
    tree: L.tree,
    committedAt: git(['log', '-1', '--format=%cI', L.commit]),
    subject: git(['log', '-1', '--format=%s', L.commit]),
    files: L.files,
    bytes: L.bytes,
    listingSha256: L.listingSha256,
    howToCheck: 'docs/specs/provenance.md -- node tools/provenance/listing.mjs --verify <this file>',
  };
}

async function main(argv) {
  const opts = { listing: false, manifest: null, verify: null, has: null, repo: process.env.GITHUB_REPOSITORY || null };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--listing') opts.listing = true;
    else if (a === '--manifest') opts.manifest = argv[++i];
    else if (a === '--verify') opts.verify = argv[++i];
    else if (a === '--repo') opts.repo = argv[++i];
    else if (a === '--has') { opts.has = argv.slice(i + 1); break; }
    else rest.push(a);
  }
  if (opts.verify) {
    const m = JSON.parse(readFileSync(opts.verify, 'utf8'));
    if (m.format !== FORMAT) throw new Error('not a ' + FORMAT + ' manifest: ' + m.format);
    const L = await listingOf(m.commit);
    const ok = L.tree === m.tree && L.listingSha256 === m.listingSha256 && L.files === m.files && L.bytes === m.bytes;
    console.log((ok ? 'MATCH' : 'NO MATCH') + '  commit ' + m.commit);
    console.log('  listing ' + L.listingSha256 + (L.listingSha256 === m.listingSha256 ? '' : '  (manifest says ' + m.listingSha256 + ')'));
    console.log('  ' + L.files + ' files, ' + L.bytes + ' bytes, tree ' + L.tree);
    process.exit(ok ? 0 : 1);
  }
  const commitish = rest[0] || 'HEAD';
  if (opts.has) {
    const L = await listingOf(commitish);
    const byHash = new Map();
    for (const line of L.listing.toString('utf8').split('\n')) {
      if (!line) continue;
      const h = line.slice(0, 64);
      if (!byHash.has(h)) byHash.set(h, []);
      byHash.get(h).push(line.slice(66));
    }
    let hit = 0;
    for (const f of opts.has) {
      const h = createHash('sha256').update(readFileSync(f)).digest('hex');
      const at = byHash.get(h);
      if (at) hit++;
      console.log((at ? 'SAME AS ' + at.join(', ') : 'not in it') + '  <-  ' + f);
    }
    console.log(hit + ' of ' + opts.has.length + ' files are byte for byte files of ' + L.commit);
    return;
  }
  if (opts.listing) {
    const L = await listingOf(commitish);
    process.stdout.write(L.listing);
    return;
  }
  if (opts.manifest) {
    const m = await manifestOf(commitish, opts.repo);
    writeFileSync(opts.manifest, JSON.stringify(m, null, 2) + '\n');
    console.log('wrote ' + opts.manifest + ': ' + m.commit + ', ' + m.files + ' files, listing ' + m.listingSha256);
    return;
  }
  const L = await listingOf(commitish);
  console.log(L.listingSha256 + '  ' + L.commit + '  (' + L.files + ' files, ' + L.bytes + ' bytes)');
}

if (process.argv[1] && process.argv[1].endsWith('listing.mjs')) {
  main(process.argv.slice(2)).catch((e) => { console.error(String(e && e.stack || e)); process.exit(2); });
}
