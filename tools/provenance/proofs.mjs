#!/usr/bin/env node
/* ═══ v2.3.3306: WHAT THE PROVENANCE RUN STILL HAS TO DO ═══
 *
 * .github/workflows/provenance.yml keeps a folder of proofs on the
 * `provenance` branch, three files for each commit of main:
 *
 *   proofs/<yyyy-mm>/<commit>.json            the fingerprint (listing.mjs)
 *   proofs/<yyyy-mm>/<commit>.json.ots        its Bitcoin timestamp
 *   proofs/<yyyy-mm>/<commit>.sigstore.json   GitHub's signature of it
 *
 * (the month is the commit's, in UTC).  Every run CATCHES UP rather than doing
 * "this commit": a run can fail half-way, or be replaced in the queue by a newer
 * one, and the next must finish what it left.  So this file only looks at the
 * folder and says what is missing; the workflow does the stamping and signing.
 *
 *   node tools/provenance/proofs.mjs plan --prov DIR --out PLAN [--depth N] [--commit C]
 *       writes the fingerprints main's last N commits (or C) do not have yet,
 *       then PLAN/stamp.txt (fingerprints with no timestamp), PLAN/upgrade.txt
 *       (timestamps Bitcoin has not confirmed yet), PLAN/attest.txt and a copy
 *       of each in PLAN/attest/ (fingerprints GitHub has not signed)
 *   node tools/provenance/proofs.mjs keep --prov DIR --plan PLAN --bundle B
 *       puts the signature B beside each fingerprint it signed -- and only
 *       those: one it does not name is left for the next run
 *   node tools/provenance/proofs.mjs message --prov DIR
 *       the commit message for what is staged in DIR
 *
 * Paths in the .txt files are relative to DIR, one a line.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, appendFileSync, rmSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { manifestOf } from './listing.mjs';

/* the OpenTimestamps attestation tags (opentimestamps/core/notary.py) */
export const OTS_BITCOIN = Buffer.from('0588960d73d71901', 'hex');
export const OTS_PENDING = Buffer.from('83dfe30d2ef90c8e', 'hex');

/* a run never takes on more than this many of each (newest first) */
export const CAP = { stamp: 200, upgrade: 200, attest: 50 };

const git = (args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 26 }).trim();

export function proofPath(commit) {
  const month = new Date(Number(git(['log', '-1', '--format=%ct', commit])) * 1000).toISOString().slice(0, 7);
  return 'proofs/' + month + '/' + commit + '.json';
}

/* every fingerprint in the folder, newest month first, then by name */
function manifests(prov) {
  const root = join(prov, 'proofs');
  if (!existsSync(root)) return [];
  const out = [];
  for (const month of readdirSync(root).sort().reverse()) {
    if (!/^\d{4}-\d{2}$/.test(month)) continue;
    for (const f of readdirSync(join(root, month)).sort()) {
      if (/^[0-9a-f]{40}\.json$/.test(f)) out.push('proofs/' + month + '/' + f);
    }
  }
  return out;
}

export const otsComplete = (buf) => buf.includes(OTS_BITCOIN);

export async function plan({ prov, out, depth = 30, commit = null, repo = null }) {
  const commits = commit
    ? [git(['rev-parse', '--verify', commit + '^{commit}'])]
    : git(['rev-list', '--first-parent', '-n', String(depth), 'HEAD']).split('\n').filter(Boolean).reverse();
  const made = [];
  for (const c of commits) {
    const rel = proofPath(c);
    if (existsSync(join(prov, rel))) continue;
    const m = await manifestOf(c, repo);
    mkdirSync(dirname(join(prov, rel)), { recursive: true });
    writeFileSync(join(prov, rel), JSON.stringify(m, null, 2) + '\n');
    made.push(rel);
  }
  const all = manifests(prov);
  const stamp = all.filter((p) => !existsSync(join(prov, p + '.ots'))).slice(0, CAP.stamp);
  const upgrade = all.filter((p) => existsSync(join(prov, p + '.ots')) && !otsComplete(readFileSync(join(prov, p + '.ots'))))
    .map((p) => p + '.ots').slice(0, CAP.upgrade);
  const attest = all.filter((p) => !existsSync(join(prov, p.replace(/\.json$/, '.sigstore.json')))).slice(0, CAP.attest);

  rmSync(out, { recursive: true, force: true });
  mkdirSync(join(out, 'attest'), { recursive: true });
  const list = (a) => a.map((p) => p + '\n').join('');
  writeFileSync(join(out, 'stamp.txt'), list(stamp));
  writeFileSync(join(out, 'upgrade.txt'), list(upgrade));
  writeFileSync(join(out, 'attest.txt'), list(attest));
  for (const p of attest) copyFileSync(join(prov, p), join(out, 'attest', basename(p)));
  const counts = { made: made.length, stamp: stamp.length, upgrade: upgrade.length, attest: attest.length };
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(counts).map(([k, v]) => k + '=' + v + '\n').join(''));
  }
  return { ...counts, lists: { made, stamp, upgrade, attest } };
}

/* the subjects a Sigstore bundle signed: { sha256 hex -> name } */
export function bundleSubjects(bundle) {
  const env = bundle && bundle.dsseEnvelope;
  if (!env || typeof env.payload !== 'string') return null;
  const statement = JSON.parse(Buffer.from(env.payload, 'base64').toString('utf8'));
  const out = new Map();
  for (const s of statement.subject || []) {
    if (s && s.digest && typeof s.digest.sha256 === 'string') out.set(s.digest.sha256, s.name);
  }
  return out;
}

/* The action writes ONE bundle naming every subject; an older one wrote a
   bundle a subject, a line each (JSON Lines).  Either way: [{ text, subjects }] */
export function bundlesIn(text) {
  let parts;
  try { parts = [[text, JSON.parse(text)]]; }
  catch (_) { parts = text.split('\n').filter((l) => l.trim()).map((l) => [l + '\n', JSON.parse(l)]); }
  return parts.map(([t, b]) => ({ text: t, subjects: bundleSubjects(b) })).filter((b) => b.subjects);
}

export function keep({ prov, planDir, bundlePath }) {
  const bundles = bundlesIn(readFileSync(bundlePath, 'utf8'));
  if (!bundles.length) throw new Error('no DSSE Sigstore bundle in ' + bundlePath);
  const kept = [], skipped = [];
  for (const p of readFileSync(join(planDir, 'attest.txt'), 'utf8').split('\n').filter(Boolean)) {
    const digest = createHash('sha256').update(readFileSync(join(prov, p))).digest('hex');
    const b = bundles.find((x) => x.subjects.has(digest));
    if (!b) { skipped.push(p); continue; }
    writeFileSync(join(prov, p.replace(/\.json$/, '.sigstore.json')), b.text);
    kept.push(p);
  }
  return { kept, skipped };
}

export function message(prov) {
  const lines = execFileSync('git', ['-C', prov, 'diff', '--cached', '--name-status'], { encoding: 'utf8' }).split('\n').filter(Boolean);
  const n = { made: 0, stamped: 0, finished: 0, signed: 0 };
  let newest = null, newestAt = -Infinity;
  for (const line of lines) {
    const [st, p] = line.split('\t');
    if (/^proofs\/.*\/[0-9a-f]{40}\.json$/.test(p) && st === 'A') {
      n.made++;
      const at = Date.parse(JSON.parse(readFileSync(join(prov, p), 'utf8')).committedAt);
      if (at > newestAt) { newestAt = at; newest = basename(p, '.json'); }
    }
    else if (p.endsWith('.json.ots')) { if (st === 'A') n.stamped++; else n.finished++; }
    else if (p.endsWith('.sigstore.json') && st === 'A') n.signed++;
  }
  const parts = [];
  if (n.made) parts.push(n.made + ' fingerprinted' + (newest ? ' (newest ' + newest.slice(0, 9) + ')' : ''));
  if (n.stamped) parts.push(n.stamped + ' stamped');
  if (n.finished) parts.push(n.finished + ' timestamp' + (n.finished > 1 ? 's' : '') + ' finished');
  if (n.signed) parts.push(n.signed + ' signed');
  /* Cloudflare Pages builds a preview of every branch pushed unless the
     message STARTS with this (TRAPS §192); this branch has no site */
  return '[CF-Pages-Skip] proofs: ' + (parts.join(', ') || 'housekeeping');
}

function args(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) o[argv[i].slice(2)] = argv[++i];
    else o._.push(argv[i]);
  }
  return o;
}

async function main(argv) {
  const o = args(argv);
  const cmd = o._[0];
  if (cmd === 'plan') {
    const r = await plan({ prov: o.prov, out: o.out, depth: Number(o.depth) || 30, commit: o.commit || null, repo: o.repo || process.env.GITHUB_REPOSITORY || null });
    for (const p of r.lists.made) console.log('fingerprinted ' + p);
    console.log('to stamp ' + r.stamp + ', to finish ' + r.upgrade + ', to sign ' + r.attest);
  } else if (cmd === 'keep') {
    const r = keep({ prov: o.prov, planDir: o.plan, bundlePath: o.bundle });
    for (const p of r.kept) console.log('signed ' + p);
    for (const p of r.skipped) console.log('::warning::the signature does not name ' + p + ' (left for the next run)');
  } else if (cmd === 'message') {
    console.log(message(o.prov));
  } else {
    console.error('usage: proofs.mjs plan|keep|message ... (see the header)');
    process.exit(2);
  }
}

if (process.argv[1] && process.argv[1].endsWith('proofs.mjs')) {
  main(process.argv.slice(2)).catch((e) => { console.error(String(e && e.stack || e)); process.exit(2); });
}
