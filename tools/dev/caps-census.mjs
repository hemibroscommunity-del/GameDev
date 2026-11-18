#!/usr/bin/env node
/* ═══ v2.3.6100: THE CAPS CENSUS (card CAP PR 1; grand plan step 7.5, step 1) ═══
 *
 * A cap ("the worker does X": `state_sync.caps`, CAP_GATES in
 * src/ui/panels/DevPanel.jsx) keeps the page's old way for a worker without
 * it.  Step 7.5 takes those old ways out, in 7.3's batches, by 7.2's rule
 * (four weeks deployed with no override); an old way that settles value on
 * the page (coins, loot, xp, hp, a bag) goes first, as 4.2's.  Step 1 is this
 * census: ONE row a cap in CAP_GATES, with
 *
 *   born     the change that put the cap in the worker's caps literal: the
 *            first commit (oldest first, merges aside) whose server/src/join.js
 *            or, before v2.3.1173 split it out, server/src/index.js holds the
 *            name in a `caps: {` literal; its v2.3.N tag (the subject's, else
 *            the body's) and short hash;
 *   switch   its row in the switch table (tools/guards/lib/switches.mjs), if
 *            it has one: a worker (or both-sides) row named the cap, or the cap
 *            in lower case (a row whose switch leaves the cap as
 *            it is, `disable_weapon_drops` for `weaponDrops`, is not its row);
 *   reads    where the page reads it (src/**, comments stripped):
 *              `_serverCaps.x`, `_serverCaps?.x`, `_serverCaps['x']` (the
 *              caps audit's reads), and through the caps object under another
 *              name (`caps`, `_caps`, `SC`, `_betCaps`: `caps.x`, `caps['x']`)
 *              or by name in a row (`cap: 'x'`, `needsCap: 'x'`) -- the last
 *              two only for a name in CAP_GATES;
 *   counts   a number or a list the page reads as such (rows, crops, a
 *            version), judged by hand below (COUNTS): it stays, it is not an
 *            old way;
 *   settles  whether its old page way settles value ON THE PAGE, judged by
 *            hand below (SETTLES): `value`, `no`, or `?` where it is unclear
 *            (never guessed);
 *   old way  `yes` where the page still reads it and it does not count:
 *            each read is a branch kept for a worker without the cap.  This
 *            is the column card CAP's PR 2 guard counts (it only falls).
 *
 * Nothing is removed here: no cap, no old way, no read.
 *
 *   node tools/dev/caps-census.mjs           writes docs/plan/census/caps.md
 *   node tools/dev/caps-census.mjs --check   fails (exit 1) when that file is
 *                                            not what this would write
 *
 * Births read git history: a shallow clone cannot say them (`git fetch
 * --unshallow` first); the guard (tools/guards/caps-census.test.mjs) imports
 * only the scanner below and never needs git.  Node only, no packages.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

export const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
export const CENSUS = 'docs/plan/census/caps.md';
const ALIASES = ['caps', '_caps', 'SC', '_betCaps'];

/* ── the hand-judged columns ────────────────────────────────────────────── */

/* A cap the page reads as a number or a list (TRAPS §9: a cap that grows gates
   by its count).  It stays: it is a number, not an old way. */
export const COUNTS = Object.freeze({
  bagWeapons: 'the weapon bag\'s size',
  clientoff: 'the list of memory savers the worker turned off',
  cookRows: 'how many recipes the worker cooks',
  dungeonLands: 'how many lands have a dungeon',
  farmCrops: 'how many crops the farm grows',
  power: 'the power index\'s version',
  rejoinResend: 'how many slots the worker says again after state_sync',
  report: 'the field report\'s version',
  statboards: 'how many stat boards',
  wheelsize: 'which Wheel the worker plays (its length)',
});

/* Whether the page's old way (a worker without the cap) settles value on the
   page: SETTLES, at the end of this file (a long table). */

/* ── the scanner (the guard imports it) ─────────────────────────────────── */

/* The text with its comments blanked to spaces (newlines kept, so line
   numbers hold).  Strings and template text are kept as they are. */
export function stripComments(t) {
  let out = '';
  let i = 0;
  const n = t.length;
  while (i < n) {
    const c = t[i], d = t[i + 1];
    if (c === '/' && d === '*') {
      const e = t.indexOf('*/', i + 2);
      const end = e < 0 ? n : e + 2;
      out += t.slice(i, end).replace(/[^\n]/g, ' ');
      i = end;
      continue;
    }
    if (c === '/' && d === '/') {
      const e = t.indexOf('\n', i);
      const end = e < 0 ? n : e;
      out += ' '.repeat(end - i);
      i = end;
      continue;
    }
    if (c === '\'' || c === '"' || c === '`') {
      let j = i + 1;
      while (j < n && t[j] !== c) {
        if (t[j] === '\\') j++;
        else if (c !== '`' && t[j] === '\n') break;
        j++;
      }
      out += t.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

export function capGates(root = ROOT) {
  const panel = readFileSync(join(root, 'src/ui/panels/DevPanel.jsx'), 'utf8');
  const m = panel.match(/const CAP_GATES = \[([\s\S]*?)\];/);
  if (!m) throw new Error('CAP_GATES not found in src/ui/panels/DevPanel.jsx');
  return [...new Set([...stripComments(m[1]).matchAll(/'([A-Za-z0-9_]+)'/g)].map((x) => x[1]))];
}

function srcFiles(root, dir = 'src', out = []) {
  for (const e of readdirSync(join(root, dir), { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const rel = dir + '/' + e.name;
    if (e.isDirectory()) srcFiles(root, rel, out);
    else if (/\.(js|jsx|mjs)$/.test(e.name)) out.push(rel);
  }
  return out.sort();
}

/* Every read of a cap on the page: Map cap -> [{ file, line }], in file and
   line order.  `files` (optional) is { path: text }, in place of src/ (the
   guard's break proof). */
export function pageReads(root = ROOT, gates = capGates(root), files = null) {
  const known = new Set(gates);
  const reads = new Map();
  const add = (cap, file, text, idx) => {
    if (!reads.has(cap)) reads.set(cap, []);
    reads.get(cap).push({ file, line: text.slice(0, idx).split('\n').length });
  };
  const list = files ? Object.keys(files).sort() : srcFiles(root);
  const al = ALIASES.join('|');
  const RES = [
    [/_serverCaps\??\.\s*([A-Za-z0-9_$]+)/g, false],
    [/_serverCaps\??\.?\[\s*['"]([A-Za-z0-9_$]+)['"]\s*\]/g, false],
    [new RegExp('(?<![A-Za-z0-9_$.])(?:' + al + ')\\??\\.\\s*([A-Za-z0-9_$]+)', 'g'), true],
    [new RegExp('(?<![A-Za-z0-9_$.])(?:' + al + ')\\??\\.?\\[\\s*[\'"]([A-Za-z0-9_$]+)[\'"]\\s*\\]', 'g'), true],
    [/(?<![A-Za-z0-9_$])(?:cap|needsCap)\s*:\s*['"]([A-Za-z0-9_$]+)['"]/g, true],
  ];
  for (const f of list) {
    const raw = files ? files[f] : readFileSync(join(root, f), 'utf8');
    if (!/_serverCaps|caps|SC|Cap/.test(raw)) continue;
    const t = stripComments(raw);
    const hits = [];
    for (const [re, onlyKnown] of RES) {
      re.lastIndex = 0;
      for (const m of t.matchAll(re)) {
        if (onlyKnown && !known.has(m[1])) continue;
        hits.push([m.index, m[1]]);
      }
    }
    hits.sort((a, b) => a[0] - b[0]);
    for (const [idx, cap] of hits) add(cap, f, t, idx);
  }
  return reads;
}

/* The caps whose old page way is still there: read on the page, not a count.
   The guard's number (it only falls). */
export function oldWays(reads, gates) {
  /* a name read straight off `_serverCaps` counts even before it is in
     CAP_GATES (the cap-gates guard asks for that line; this one for the
     census's row) */
  const names = new Set([...gates, ...reads.keys()]);
  return [...names].filter((c) => (reads.get(c) || []).length > 0 && !COUNTS[c]).sort();
}

/* The census file's own list of them (the guard reads the file, not git). */
export function censusOldWays(root = ROOT) {
  const t = readFileSync(join(root, CENSUS), 'utf8');
  const out = [];
  for (const line of t.split('\n')) {
    const m = line.match(/^\| `([A-Za-z0-9_$]+)` \|(.*)\|\s*$/);
    if (!m) continue;
    const cells = m[2].split('|').map((s) => s.trim());
    if (cells[cells.length - 1] === 'yes') out.push(m[1]);
  }
  return out.sort();
}

/* ── the switch table and the births (writing only) ────────────────────── */

async function switchRows(root) {
  const mod = await import(pathToFileURL(join(root, 'tools/guards/lib/switches.mjs')).href);
  return mod.SWITCHES.filter((r) => r.side === 'worker' || r.side === 'both');
}

function switchFor(cap, rows) {
  const lc = cap.toLowerCase();
  const by = rows.find((r) => r.name === cap) || rows.find((r) => r.name === lc);
  return by ? by.name : null;
}

/* The keys of every `caps: {` literal in a file's text. */
export function capsLiteralKeys(text) {
  const keys = new Set();
  const t = stripComments(text);
  let from = 0;
  for (;;) {
    const at = t.indexOf('caps: {', from);
    if (at < 0) break;
    let i = at + 'caps: {'.length;
    let depth = 1;
    let seg = i;
    const segs = [];
    while (i < t.length && depth > 0) {
      const c = t[i];
      if (c === '\'' || c === '"' || c === '`') {
        let j = i + 1;
        while (j < t.length && t[j] !== c) { if (t[j] === '\\') j++; j++; }
        i = j + 1;
        continue;
      }
      if (c === '{' || c === '(' || c === '[') depth++;
      else if (c === '}' || c === ')' || c === ']') { depth--; if (!depth) break; }
      else if (c === ',' && depth === 1) { segs.push(t.slice(seg, i)); seg = i + 1; }
      i++;
    }
    segs.push(t.slice(seg, i));
    for (const s of segs) {
      const m = s.trim().match(/^([A-Za-z0-9_$]+)\s*:/);
      if (m) keys.add(m[1]);
    }
    from = i;
  }
  return keys;
}

function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28 });
}

function births(root, gates) {
  if (git(root, ['rev-parse', '--is-shallow-repository']).trim() === 'true') {
    throw new Error('a shallow clone cannot say when each cap was born: run `git fetch --unshallow` first');
  }
  const want = new Set(gates);
  const born = new Map();
  const log = git(root, ['log', '--reverse', '--topo-order', '--no-merges', '--format=%H',
    'HEAD', '--', 'server/src/join.js', 'server/src/index.js']).split('\n').filter(Boolean);
  for (const h of log) {
    if (born.size === want.size) break;
    const names = git(root, ['ls-tree', '--name-only', h, 'server/src/join.js', 'server/src/index.js'])
      .split('\n').filter(Boolean);
    let fresh = null;
    for (const f of names) {
      const keys = capsLiteralKeys(git(root, ['show', h + ':' + f]));
      for (const k of keys) {
        if (want.has(k) && !born.has(k)) (fresh || (fresh = [])).push(k);
      }
    }
    if (!fresh) continue;
    const msg = git(root, ['log', '-1', '--format=%s%n%b', h]);
    const tag = (msg.match(/v2\.3\.(\d+)/) || [])[1] || 'untagged';
    for (const k of fresh) born.set(k, `${tag} (${h.slice(0, 9)})`);
  }
  return born;
}

/* ── the file ──────────────────────────────────────────────────────────── */

const SETTLES_ORDER = { value: 0, '?': 1, no: 2 };

export async function build(root = ROOT) {
  const gates = capGates(root);
  const reads = pageReads(root, gates);
  const rows = await switchRows(root);
  const born = births(root, gates);
  const row = (cap) => {
    const r = reads.get(cap) || [];
    const files = new Map();
    for (const x of r) files.set(x.file, (files.get(x.file) || 0) + 1);
    const counts = !!COUNTS[cap];
    const j = SETTLES[cap];
    const settles = counts ? 'no' : (j ? j[0] : '?');
    return {
      cap, settles, why: counts ? 'counts: ' + COUNTS[cap] : (j ? j[1] : 'not judged yet'),
      sw: switchFor(cap, rows), born: born.get(cap) || 'unknown', n: r.length,
      files: [...files].map(([f, k]) => (k > 1 ? `${f.replace(/^src\//, '')} ×${k}` : f.replace(/^src\//, ''))),
      counts, old: r.length > 0 && !counts,
    };
  };
  const all = gates.map(row).sort((a, b) =>
    (SETTLES_ORDER[a.settles] - SETTLES_ORDER[b.settles])
    || ((a.sw ? 1 : 0) - (b.sw ? 1 : 0))
    || (a.cap.toLowerCase() < b.cap.toLowerCase() ? -1 : a.cap.toLowerCase() > b.cap.toLowerCase() ? 1 : 0)
    || (a.cap < b.cap ? -1 : a.cap > b.cap ? 1 : 0));
  const tot = {
    caps: all.length,
    value: all.filter((r) => r.settles === 'value').length,
    unclear: all.filter((r) => r.settles === '?').length,
    noSwitch: all.filter((r) => !r.sw).length,
    counts: all.filter((r) => r.counts).length,
    old: all.filter((r) => r.old).length,
    unread: all.filter((r) => !r.n).length,
    reads: all.reduce((s, r) => s + r.n, 0),
    unborn: all.filter((r) => r.born === 'unknown').length,
  };
  const esc = (s) => String(s).replace(/\|/g, '\\|');
  const L = [];
  L.push('# The caps census (grand plan 7.5, step 1; card CAP, tag 6100)');
  L.push('');
  L.push('Written by `node tools/dev/caps-census.mjs`; never by hand. `--check` fails when this file is');
  L.push('not what it would write. What each column means, and how it is read: the generator\'s header.');
  L.push('Nothing is removed by this census: no cap, no old way, no read.');
  L.push('');
  L.push('## Totals');
  L.push('');
  L.push(`- caps in \`CAP_GATES\`: **${tot.caps}**`);
  L.push(`- whose old page way settles value (they go first, as 4.2's): **${tot.value}**`);
  L.push(`- unclear whether they settle value (\`?\`, never guessed): **${tot.unclear}**`);
  L.push(`- with no row in the switch table (no \`on\` day, no end): **${tot.noSwitch}**`);
  L.push(`- that count (a number or a list: they stay): **${tot.counts}**`);
  L.push(`- **whose old page way is still there (old way \`yes\`): ${tot.old}** -- the count that only falls (\`tools/guards/caps-census.test.mjs\`)`);
  L.push(`- not read on the page at all: **${tot.unread}**`);
  L.push(`- reads on the page, all caps: **${tot.reads}**`);
  L.push(`- births git could not find: **${tot.unborn}**`);
  L.push('');
  L.push('## The caps');
  L.push('');
  L.push('Sorted: settles value first, then unclear, then the rest; in each, no switch row first; then by name.');
  L.push('');
  L.push('| cap | settles | why | switch row | born | reads | read in | old way |');
  L.push('|---|---|---|---|---|---|---|---|');
  for (const r of all) {
    L.push(`| \`${r.cap}\` | ${r.settles} | ${esc(r.why)} | ${r.sw ? '`' + r.sw + '`' : '--'} | ${r.born} | ${r.n} | ${r.files.length ? esc(r.files.join(', ')) : '--'} | ${r.counts ? 'count' : r.old ? 'yes' : 'no'} |`);
  }
  L.push('');
  return { text: L.join('\n'), tot };
}

/* ── SETTLES: judged by hand, reading each read ─────────────────────────── */
export const SETTLES = Object.freeze({
});

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const { text, tot } = await build();
  const path = join(ROOT, CENSUS);
  if (process.argv.includes('--check')) {
    let have = '';
    try { have = readFileSync(path, 'utf8'); } catch { /* missing */ }
    if (have !== text) {
      console.log(`FAIL ${CENSUS} is out of date: run  node tools/dev/caps-census.mjs  and commit it`);
      process.exit(1);
    }
    console.log(`ok   ${CENSUS} is up to date (${tot.caps} caps, ${tot.old} old ways)`);
  } else {
    writeFileSync(path, text);
    console.log(`wrote ${CENSUS}: ${JSON.stringify(tot)}`);
  }
}
