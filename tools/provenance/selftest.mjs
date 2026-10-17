#!/usr/bin/env node
/* ═══ v2.3.3306: THE PROVENANCE TOOLS CHECKED, ON A REPOSITORY MADE FOR IT ═══
 *
 * listing.mjs's fingerprint is only worth anything if it is exactly the
 * committed bytes, made the same way every time, and proofs.mjs only if a run
 * that failed half-way is finished by the next.  This makes a small git
 * repository with the awkward cases (an empty file, binary, a big file read in
 * many pieces, hundreds of files, a space and accents in a name, a symlink, a
 * commit whose month is a different one in UTC), and checks both tools against
 * what the bytes really are -- and against `sha256sum`, which is how somebody
 * with none of our code checks a proof.
 *
 *   node tools/provenance/selftest.mjs
 *
 * Run by .github/workflows/provenance.yml on a pull request that changes the
 * workflow or this folder.  No network, nothing outside a temporary folder.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, symlinkSync, chmodSync, existsSync, rmSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const LISTING = join(HERE, 'listing.mjs');
const { listingOf, manifestOf, FORMAT } = await import(LISTING);
const { plan, keep, message, OTS_BITCOIN, OTS_PENDING } = await import(join(HERE, 'proofs.mjs'));

let pass = 0, fail = 0;
const ok = (cond, what) => { if (cond) pass++; else { fail++; console.log('FAIL  ' + what); } };
const sha = (b) => createHash('sha256').update(b).digest('hex');

const tmp = mkdtempSync(join(tmpdir(), 'prov-selftest-'));
const repo = join(tmp, 'repo');
mkdirSync(repo);
process.chdir(repo);
const env = (date) => ({ ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date,
  GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' });
const g = (args, date) => execFileSync('git', args, { encoding: 'utf8', env: date ? env(date) : process.env }).trim();
g(['init', '-q']);
g(['config', 'core.autocrlf', 'false']);

/* ── the files ── */
const files = new Map();   /* path -> content as git stores it */
const put = (p, content) => { mkdirSync(join(repo, p, '..'), { recursive: true }); writeFileSync(join(repo, p), content); files.set(p, Buffer.from(content)); };
put('a.txt', 'hello\n');
put('empty', '');
put('bin.dat', Buffer.concat([Buffer.from([0, 10, 13, 255, 0]), randomBytes(300 * 1024)]));   /* many 64 KB reads */
put('dir/sub/deep.js', 'export const x = 1;\n');
put('sp ace/ünï.txt', 'accents\n');
put('exe.sh', '#!/bin/sh\necho hi\n');
chmodSync(join(repo, 'exe.sh'), 0o755);
for (let i = 0; i < 400; i++) put('many/f' + String(i).padStart(3, '0'), 'n' + (i % 37) + '\n');   /* repeated contents */
put('Z-upper.txt', 'sorted by bytes: Z before a\n');
symlinkSync('a.txt', join(repo, 'link'));
files.set('link', Buffer.from('a.txt'));   /* git keeps a symlink as its target's name */
g(['add', '-A']);
/* 23:30 at UTC-2 on Sept 30 is Oct 1 in UTC: the proof's month folder is October */
g(['commit', '-q', '-m', 'first: every awkward case'], '2026-09-30T23:30:00-02:00');
const c1 = g(['rev-parse', 'HEAD']);

/* ── 1. the listing is the committed bytes ── */
const L = await listingOf('HEAD');
const want = [...files.keys()].map((p) => Buffer.from(p)).sort(Buffer.compare)
  .map((p) => sha(files.get(p.toString())) + '  ' + p.toString() + '\n').join('');
ok(L.files === files.size, '1a every blob listed: ' + L.files + ' of ' + files.size);
ok(L.listing.toString() === want, '1b each line is the file\'s own SHA-256 and path, sorted by the path\'s bytes');
ok(L.listingSha256 === sha(L.listing), '1c the digest is the listing\'s SHA-256');
ok(L.bytes === [...files.values()].reduce((s, b) => s + b.length, 0), '1d bytes counted: ' + L.bytes);
ok(L.commit === c1 && L.tree === g(['rev-parse', 'HEAD^{tree}']), '1e commit and tree');
ok((await listingOf(c1)).listingSha256 === L.listingSha256, '1f the same number again');

/* ── 2. somebody with none of our code gets the same number ── */
rmSync(join(repo, 'link'));
files.delete('link');
g(['add', '-A']);
g(['commit', '-q', '-m', 'second: no symlink (sha256sum follows one)'], '2026-10-05T12:00:00Z');
const c2 = g(['rev-parse', 'HEAD']);
const L2 = await listingOf('HEAD');
const hasSum = spawnSync('sha256sum', ['--version']).status === 0;
if (hasSum) {
  const viaGit = execFileSync('sh', ['-c', 'git ls-files -z | LC_ALL=C sort -z | xargs -0 sha256sum | sha256sum'], { encoding: 'utf8' }).split(' ')[0];
  ok(viaGit === L2.listingSha256, '2a git ls-files | sort | sha256sum | sha256sum is the digest');
  const viaFind = execFileSync('sh', ['-c', "find . -type f ! -path './.git/*' -printf '%P\\0' | LC_ALL=C sort -z | xargs -0 sha256sum | sha256sum"], { encoding: 'utf8' }).split(' ')[0];
  ok(viaFind === L2.listingSha256, '2b so is a plain folder\'s (a downloaded ZIP of the commit), no git');
} else console.log('skip  2: no sha256sum here');

/* ── 3. a manifest checks out, and a changed one does not ── */
const cli = (args) => spawnSync(process.execPath, [LISTING, ...args], { encoding: 'utf8' });
const mf = join(tmp, 'm.json');
ok(cli([c1, '--manifest', mf]).status === 0, '3a --manifest');
const m = JSON.parse(readFileSync(mf, 'utf8'));
ok(m.format === FORMAT && m.commit === c1 && m.listingSha256 === L.listingSha256 && m.files === L.files
  && m.subject === 'first: every awkward case' && m.committedAt === '2026-09-30T23:30:00-02:00', '3b the manifest says what it fingerprinted');
const v = cli(['--verify', mf]);
ok(v.status === 0 && /^MATCH/.test(v.stdout), '3c --verify: MATCH');
writeFileSync(mf, JSON.stringify({ ...m, listingSha256: m.listingSha256.replace(/^./, (ch) => ch === '0' ? '1' : '0') }));
const bad = cli(['--verify', mf]);
ok(bad.status === 1 && /^NO MATCH/.test(bad.stdout), '3d a changed fingerprint: NO MATCH, exit 1');

/* ── 4. --has finds a copied file, not an edited one ── */
const copy = join(tmp, 'their-copy.dat'), edited = join(tmp, 'their-edit.dat');
copyFileSync(join(repo, 'bin.dat'), copy);
writeFileSync(edited, Buffer.concat([readFileSync(join(repo, 'bin.dat')), Buffer.from('x')]));
const has = cli([c1, '--has', copy, edited]);
ok(has.status === 0 && /SAME AS bin\.dat\s+<-\s+.*their-copy/.test(has.stdout) && /not in it\s+<-\s+.*their-edit/.test(has.stdout), '4a --has: the copy found, the edit not');

/* ── 5. a run writes what is missing, and only that ── */
const prov = join(tmp, 'prov'), out = join(tmp, 'plan');
mkdirSync(prov);
const r1 = await plan({ prov, out, depth: 5 });
const p1 = 'proofs/2026-10/' + c1 + '.json', p2 = 'proofs/2026-10/' + c2 + '.json';
ok(r1.made === 2 && existsSync(join(prov, p1)) && existsSync(join(prov, p2)), '5a both commits fingerprinted, in their UTC month');
ok(JSON.parse(readFileSync(join(prov, p1), 'utf8')).listingSha256 === L.listingSha256, '5b the first one\'s is the listing\'s');
const lines = (f) => readFileSync(join(out, f), 'utf8').split('\n').filter(Boolean);
ok(lines('stamp.txt').length === 2 && lines('upgrade.txt').length === 0 && lines('attest.txt').length === 2, '5c both to stamp and sign, nothing to finish');
ok(existsSync(join(out, 'attest', c1 + '.json')) && readFileSync(join(out, 'attest', c1 + '.json')).equals(readFileSync(join(prov, p1))), '5d the copy to sign is the same bytes');
const r2 = await plan({ prov, out, depth: 5 });
ok(r2.made === 0, '5e run again: nothing new');
writeFileSync(join(prov, p1 + '.ots'), Buffer.concat([Buffer.from('fake '), OTS_PENDING]));
writeFileSync(join(prov, p2 + '.ots'), Buffer.concat([Buffer.from('fake '), OTS_PENDING, OTS_BITCOIN]));
await plan({ prov, out, depth: 5 });
ok(lines('stamp.txt').length === 0, '5f a fingerprint with a timestamp is not stamped again');
ok(lines('upgrade.txt').join() === p1 + '.ots', '5g only the one Bitcoin has not confirmed is finished');
const r3 = await plan({ prov, out, commit: c1 });
ok(r3.made === 0, '5h --commit: an old commit already done is left alone');

/* ── 6. a signature is kept beside what it signed, only that ── */
const bundle = (paths) => ({ mediaType: 'application/vnd.dev.sigstore.bundle.v0.3+json',
  dsseEnvelope: { payloadType: 'application/vnd.in-toto+json', signatures: [{ sig: 'x' }],
    payload: Buffer.from(JSON.stringify({ _type: 'https://in-toto.io/Statement/v1',
      subject: paths.map((p) => ({ name: p.split('/').pop(), digest: { sha256: sha(readFileSync(join(prov, p))) } })) })).toString('base64') } });
const bf = join(tmp, 'bundle.json');
writeFileSync(bf, JSON.stringify(bundle([p1]), null, 2));
const k = keep({ prov, planDir: out, bundlePath: bf });
ok(k.kept.join() === p1 && k.skipped.join() === p2, '6a kept for the one it names, the other left');
ok(readFileSync(join(prov, p1.replace('.json', '.sigstore.json')), 'utf8') === readFileSync(bf, 'utf8'), '6b the bundle kept byte for byte');
await plan({ prov, out, depth: 5 });
ok(lines('attest.txt').join() === p2, '6c next run signs only the one left');
writeFileSync(bf, JSON.stringify(bundle([p2])) + '\n' + JSON.stringify(bundle([p1])) + '\n');   /* one a line */
const k2 = keep({ prov, planDir: out, bundlePath: bf });
ok(k2.kept.join() === p2 && JSON.parse(readFileSync(join(prov, p2.replace('.json', '.sigstore.json')), 'utf8')).dsseEnvelope, '6d a bundle a line: each kept with its own');

/* ── 7. the commit message: what happened, and never a site build ── */
g(['-C', prov, 'init', '-q']);
g(['-C', prov, 'add', '-A']);
const msg = message(prov);
ok(/^\[CF-Pages-Skip\] /.test(msg), '7a starts with [CF-Pages-Skip]: ' + msg);
ok(/2 fingerprinted/.test(msg) && /2 stamped/.test(msg) && /2 signed/.test(msg), '7b says what was added');
ok(msg.includes('newest ' + c2.slice(0, 9)), '7c names the newest commit');
const prov2 = join(tmp, 'prov2');
mkdirSync(join(prov2, 'proofs/2026-10'), { recursive: true });
writeFileSync(join(prov2, 'proofs/2026-10/' + 'f'.repeat(40) + '.json'), JSON.stringify({ committedAt: '2026-10-01T00:00:00Z' }));
writeFileSync(join(prov2, 'proofs/2026-10/' + '0'.repeat(40) + '.json'), JSON.stringify({ committedAt: '2026-10-09T00:00:00Z' }));
g(['-C', prov2, 'init', '-q']);
g(['-C', prov2, 'add', '-A']);
ok(message(prov2).includes('newest 000000000'), '7d by its date, not by its id\'s order');

rmSync(tmp, { recursive: true, force: true });
console.log((fail ? 'FAILED' : 'ok') + '  provenance selftest: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
