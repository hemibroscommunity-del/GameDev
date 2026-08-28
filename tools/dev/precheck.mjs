#!/usr/bin/env node
/* v2.3.1201: pre-push gate for AI sessions.
 *
 * Usage:  node tools/dev/precheck.mjs [baseRef=origin/main]
 *
 * ZERO dependencies (node + git only) — it must run in the build sandbox,
 * which has no node_modules and a blocked npm registry (handoff rule 26).
 * Run it before EVERY push. Exit 0 = no FAILs (WARNs don't block).
 *
 * Checks (each reports PASS/FAIL/WARN with file:line):
 *   1. syntax        — `node --check` every changed .js/.mjs (copied to a
 *                      temp .mjs so ESM sources parse regardless of the
 *                      nearest package.json); .jsx gets a string/comment-
 *                      aware brace/paren/bracket balance check.
 *   2. dup-case      — duplicate `case` labels inside one switch (the
 *                      v2.3.1176 arena_bet shadowing class; eslint
 *                      no-duplicate-case can't run in the sandbox).
 *   3. version-tag   — the tag CLAIMED by this diff (max added v2.3.N)
 *                      must be > the base's high-water. Deliberate
 *                      deviation from "fail any added tag ≤ high-water":
 *                      rule-25 comments back-reference old tags
 *                      constantly, so only the claim (max) is gated;
 *                      older added tags are listed as info. Also WARNs
 *                      with remote branches pushed in the last 48h so the
 *                      session can spot tag/topic collisions (five
 *                      sessions claimed one tag on 2026-07-07).
 *   4. dmg-popup     — raw `S.dmgNumbers.push(` in changed client files;
 *                      must use pushDmgPopup (v2.3.1188 sweep). The
 *                      helper's own home (src/game/combatHelpers.js) is
 *                      exempt.
 *   5. storage-keys  — every literal `storage.put/get('<prefix>:` in
 *                      changed server/src files must appear in the
 *                      ARCHITECTURE-HANDOFF rule-2 registry table.
 *                      Literal-only by design (computed keys can't be
 *                      extracted reliably); non-GameRoom DOs
 *                      (marketplace/arena/leaderboard/feedback) are
 *                      exempt — the registry covers GameRoom storage.
 *   6. proto-safety  — WARN: `= {}` / `: {}` literals in changed server
 *                      files whose neighborhood indexes them with an
 *                      id-shaped bracket variable. A client id like
 *                      '__proto__' silently no-ops on a plain object —
 *                      this bit three times in ONE day (duel.away
 *                      v2.3.1175, party meta v2.3.1185, amulet tiers
 *                      v2.3.1192). Use Object.create(null) or Map. A
 *                      site triaged SAFE (server-generated key,
 *                      join-gate-protected player id, or not-a-map)
 *                      carries an inline `proto-ok:<reason>` marker and
 *                      is skipped (item H, v2.3.1214).
 *   7. server-tests  — if server/ changed, runs `cd server && npm test`
 *                      (zero-dep, sandbox-safe).
 *   7. worker-entry-exports — FAIL: server/src/index.js is the Worker's
 *                      ENTRY module; workerd registers every named export as
 *                      a handler, so a PRIMITIVE export refuses to boot the
 *                      whole service (v2.3.1945 cost a red `playable` to
 *                      find). Sets/objects are fine — they coerce to a
 *                      handler with no handlers in it.
 *   8. shim-allowlist — WARN: repo-wide. Every `.send({ type: 'x' })` in
 *                      src/ must have a passthrough line in
 *                      `channelShim.send` (src/networking/wsClient.js),
 *                      which is an ALLOWLIST, not a transport. A type
 *                      with no line there never leaves the browser and
 *                      the failure is silent in both directions —
 *                      TRAPS #18. Ate `firemaking_request` (v2.3.1702)
 *                      and `extraction_start` (v2.3.1704, dead since
 *                      v2.3.229, which is why "monsters ignore you while
 *                      harvesting" never worked once).
 *   9. hairmask-parity — if a trait-placement file changed, runs
 *                      tools/dev/check-hairmask-parity.mjs: a `clipsHair`
 *                      hat's hair mask must be placed with everything the
 *                      HAT was placed with. Two hair-dependent adjustments
 *                      (v2.3.1561 float lift, v2.3.1943 band refit) were
 *                      added to the hat in both renderers and left off the
 *                      mask in both. No shipped hat combination reaches
 *                      the mismatch, so the probe manufactures the case
 *                      (v2.3.1959).
 *  10. hairmask-rule  — FAIL: if the headwear art, a hair-clip mask or
 *                      tools/make_hairmask.py changed, every committed
 *                      hairmask/<dir>.png must still be the v2.3.1957
 *                      width rule applied to the hat art beside it
 *                      (tools/dev/check-hairmask-rule.mjs). Catches both
 *                      an edit to the rule and art recut without a
 *                      rebuild — neither of which anything else sees.
 *
 * Output is terse and actionable on purpose — the reader is usually an
 * AI session deciding whether it may push.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const baseRef = process.argv[2] || 'origin/main';
const results = []; // {level:'PASS'|'FAIL'|'WARN'|'INFO', check, msg}
const add = (level, check, msg) => results.push({ level, check, msg });

function git(args, opts = {}) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts });
}
let root;
try { root = git(['rev-parse', '--show-toplevel']).trim(); }
catch { console.error('precheck: not a git repo'); process.exit(2); }

let mergeBase;
try { mergeBase = git(['merge-base', baseRef, 'HEAD'], { cwd: root }).trim(); }
catch {
  console.error(`precheck: cannot resolve ${baseRef} (run \`git fetch origin\` or pass a baseRef)`);
  process.exit(2);
}

/* Changed files = merge-base(baseRef, HEAD)..working tree (committed on the
 * branch AND uncommitted edits both count — this runs pre-push). */
const changed = git(['diff', '--name-only', '--diff-filter=ACMR', mergeBase, '--'], { cwd: root })
  .split('\n').filter(Boolean)
  .filter((f) => existsSync(join(root, f)));
const changedCode = changed.filter((f) => /\.(js|mjs|cjs|jsx)$/.test(f));
const changedServer = changed.filter((f) => f.startsWith('server/'));
const changedServerSrc = changedCode.filter((f) => f.startsWith('server/src/'));
const changedClient = changedCode.filter((f) => f.startsWith('src/'));

const lineOf = (text, idx) => text.slice(0, idx).split('\n').length;
const read = (f) => readFileSync(join(root, f), 'utf8');

/* ---------------------------------------------------------------- *
 * Tokenizer: returns a same-length copy of src where comments and the
 * INTERIORS of strings / template chunks / regex literals are blanked
 * to spaces (newlines preserved, quotes preserved). Template `${...}`
 * interpolations stay live code. Structural scans (brace balance,
 * switch/case discovery) run on this; label text is recovered by
 * slicing the ORIGINAL source at the same indices.
 *
 * jsxText mode: a bare `'` / `"` with no closing quote on the same
 * line is treated as prose (JSX "don't"-style apostrophes), not as an
 * unterminated string.
 * ---------------------------------------------------------------- */
function sanitize(src, { jsxText = false } = {}) {
  const out = src.split('');
  const n = src.length;
  const blank = (i) => { if (out[i] !== '\n') out[i] = ' '; };
  // stack frames: {mode:'code',depth} | {mode:'tpl'}
  const stack = [{ mode: 'code', depth: 0 }];
  let lastCode = ''; // last significant char in code mode (regex heuristic)
  let lastWord = '';
  const regexPrev = new Set(['(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '~', '^', '<', '>', '']);
  const regexWords = new Set(['return', 'case', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'do', 'else', 'yield', 'await', 'throw']);
  let i = 0;
  while (i < n) {
    const top = stack[stack.length - 1];
    const c = src[i];
    if (top.mode === 'tpl') {
      if (c === '\\') { blank(i); if (i + 1 < n) blank(i + 1); i += 2; continue; }
      if (c === '`') { stack.pop(); i++; continue; } // closing tick kept, back to code
      if (c === '$' && src[i + 1] === '{') { stack.push({ mode: 'code', depth: 0 }); i += 2; continue; } // keep `${` live
      blank(i); i++; continue;
    }
    // code mode
    if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') { blank(i); i++; } continue; }
    if (c === '/' && src[i + 1] === '*') {
      blank(i); blank(i + 1); i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { blank(i); i++; }
      if (i < n) { blank(i); blank(i + 1); i += 2; }
      continue;
    }
    if (c === "'" || c === '"') {
      // find closing quote on the same line
      let j = i + 1, closed = -1;
      while (j < n && src[j] !== '\n') {
        if (src[j] === '\\') { j += 2; continue; }
        if (src[j] === c) { closed = j; break; }
        j++;
      }
      if (closed === -1) {
        if (jsxText) { i++; lastCode = c; continue; } // prose apostrophe
        i = j; continue; // unterminated string: skip line, syntax check owns it
      }
      for (let k = i + 1; k < closed; k++) blank(k);
      i = closed + 1; lastCode = c; lastWord = ''; continue;
    }
    if (c === '`') { stack.push({ mode: 'tpl' }); i++; lastCode = c; lastWord = ''; continue; }
    if (c === '/' && !jsxText) {
      // regex literal vs division (heuristic on preceding code)
      if (regexPrev.has(lastCode) || regexWords.has(lastWord)) {
        blank(i); i++;
        let inClass = false;
        while (i < n && src[i] !== '\n') {
          if (src[i] === '\\') { blank(i); if (i + 1 < n) blank(i + 1); i += 2; continue; }
          if (src[i] === '[') inClass = true;
          else if (src[i] === ']') inClass = false;
          else if (src[i] === '/' && !inClass) { blank(i); i++; break; }
          blank(i); i++;
        }
        while (i < n && /[a-z]/i.test(src[i])) { blank(i); i++; } // flags
        lastCode = ')'; lastWord = ''; continue;
      }
    }
    if (c === '{') top.depth++;
    else if (c === '}') {
      if (top.depth === 0 && stack.length > 1) { stack.pop(); i++; continue; } // end of ${...} — keep the brace, its `${` twin was kept
      top.depth--;
    }
    if (/\s/.test(c)) { i++; continue; }
    if (/[A-Za-z0-9_$]/.test(c)) {
      let j = i; while (j < n && /[A-Za-z0-9_$]/.test(src[j])) j++;
      lastWord = src.slice(i, j); lastCode = /[0-9]/.test(lastWord[0]) ? '0' : 'w';
      i = j; continue;
    }
    lastCode = c; lastWord = ''; i++;
  }
  return out.join('');
}

/* ---- 1. syntax ------------------------------------------------- */
{
  const tmp = mkdtempSync(join(tmpdir(), 'precheck-'));
  let fails = 0, count = 0;
  for (const f of changedCode) {
    const srcText = read(f);
    count++;
    if (f.endsWith('.jsx')) {
      // balance check on sanitized text (jsx prose-aware)
      const s = sanitize(srcText, { jsxText: true });
      const stack2 = [];
      const open = { '{': '}', '(': ')', '[': ']' };
      let bad = null;
      for (let i = 0; i < s.length && !bad; i++) {
        const c = s[i];
        if (open[c]) stack2.push({ c, i });
        else if (c === '}' || c === ')' || c === ']') {
          const t = stack2.pop();
          if (!t || open[t.c] !== c) bad = { i, msg: `unmatched '${c}'` };
        }
      }
      if (!bad && stack2.length) {
        const t = stack2[stack2.length - 1];
        bad = { i: t.i, msg: `unclosed '${t.c}'` };
      }
      if (bad) { fails++; add('FAIL', 'syntax', `${f}:${lineOf(s, bad.i)} — ${bad.msg} (brace/paren/bracket balance)`); }
    } else {
      const tf = join(tmp, 'chk.mjs'); // .mjs: ESM sources parse regardless of package.json "type"
      writeFileSync(tf, srcText);
      const r = spawnSync('node', ['--check', tf], { encoding: 'utf8' });
      if (r.status !== 0) {
        fails++;
        const errLines = (r.stderr || '').split('\n');
        const errText = errLines.find((l) => /(Syntax)?Error/.test(l)) || errLines.find((l) => l.trim()) || 'parse error';
        const m = errLines.map((l) => l.match(/chk\.mjs:(\d+)/)).find(Boolean);
        add('FAIL', 'syntax', `${f}${m ? ':' + m[1] : ''} — ${errText.trim()}`);
      }
    }
  }
  rmSync(tmp, { recursive: true, force: true });
  if (!fails) add('PASS', 'syntax', `${count} changed js/jsx file(s) parse`);
}

/* ---- 2. dup-case ------------------------------------------------ */
{
  let fails = 0;
  for (const f of changedCode) {
    const srcText = read(f);
    const s = sanitize(srcText, { jsxText: f.endsWith('.jsx') });
    const re = /\bswitch\s*\(/g;
    let m;
    while ((m = re.exec(s))) {
      // find matching ')' then the switch body '{'
      let i = m.index + m[0].length, pd = 1;
      while (i < s.length && pd > 0) { if (s[i] === '(') pd++; else if (s[i] === ')') pd--; i++; }
      while (i < s.length && /\s/.test(s[i])) i++;
      if (s[i] !== '{') continue;
      i++;
      let depth = 1;
      const seen = new Map(); // label -> first line
      while (i < s.length && depth > 0) {
        const c = s[i];
        if (c === '{') { depth++; i++; continue; }
        if (c === '}') { depth--; i++; continue; }
        if (depth === 1 && /[a-z]/.test(c) && /\b(case|default)\b/y.test(s.slice(i, i + 8)) && !/[A-Za-z0-9_$]/.test(s[i - 1] || '')) {
          const isDefault = s.startsWith('default', i);
          let label = 'default', start = i;
          i += isDefault ? 7 : 4;
          if (!isDefault) {
            start = i;
            let tern = 0;
            while (i < s.length) {
              const d = s[i];
              if (d === '?') tern++;
              else if (d === ':' && tern === 0) break;
              else if (d === ':' && tern > 0) tern--;
              else if (d === '{' || d === '(') { let dd = 1; const oc = d, cc = d === '{' ? '}' : ')'; i++; while (i < s.length && dd > 0) { if (s[i] === oc) dd++; else if (s[i] === cc) dd--; i++; } continue; }
              i++;
            }
            label = srcText.slice(start, i).replace(/\s+/g, ' ').trim();
          }
          if (seen.has(label)) {
            fails++;
            add('FAIL', 'dup-case', `${f}:${lineOf(s, start)} — duplicate \`case ${label}\` (first at line ${seen.get(label)}); the later case is DEAD (v2.3.1176 arena_bet class)`);
          } else seen.set(label, lineOf(s, start));
          continue;
        }
        i++;
      }
    }
  }
  if (!fails) add('PASS', 'dup-case', `no duplicate switch-case labels in ${changedCode.length} changed file(s)`);
}

/* ---- 3. version-tag --------------------------------------------- */
{
  // base high-water: baseRef package.json + recent baseRef log subjects + tags in baseRef tree
  let high = 0, highSrc = '';
  try {
    const v = JSON.parse(git(['show', `${baseRef}:package.json`], { cwd: root })).version || '';
    const mv = v.match(/^2\.3\.(\d+)$/);
    if (mv && +mv[1] > high) { high = +mv[1]; highSrc = `${baseRef}:package.json`; }
  } catch { /* no package.json at base */ }
  try {
    const subjects = git(['log', baseRef, '-500', '--format=%s'], { cwd: root });
    for (const mm of subjects.matchAll(/v2\.3\.(\d+)/g)) if (+mm[1] > high) { high = +mm[1]; highSrc = `${baseRef} log`; }
  } catch { /* ignore */ }
  try {
    const treeTags = git(['grep', '-h', '-oE', 'v2\\.3\\.[0-9]+', baseRef, '--', '*.js', '*.jsx', '*.mjs', '*.md'], { cwd: root });
    for (const mm of treeTags.matchAll(/v2\.3\.(\d+)/g)) if (+mm[1] > high) { high = +mm[1]; highSrc = `${baseRef} tree`; }
  } catch { /* git grep exits 1 on no match */ }

  // tags ADDED by this diff, with file:line via unified=0 hunk headers
  const diff = git(['diff', '--unified=0', mergeBase, '--'], { cwd: root });
  const addedTags = []; // {n, file, line}
  let curFile = null, curLine = 0;
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ b/')) { curFile = line.slice(6); continue; }
    if (line.startsWith('@@')) { const h = line.match(/\+(\d+)/); curLine = h ? +h[1] : 0; continue; }
    if (line.startsWith('+') && !line.startsWith('+++')) {
      for (const mm of line.matchAll(/v2\.3\.(\d+)/g)) addedTags.push({ n: +mm[1], file: curFile, line: curLine });
      curLine++;
    }
  }
  if (!addedTags.length) {
    add('PASS', 'version-tag', `no v2.3.N tags added (base high-water v2.3.${high}); tag your changes per rule 25`);
  } else {
    const max = addedTags.reduce((a, b) => (b.n > a.n ? b : a));
    const older = addedTags.filter((t) => t.n < max.n && t.n <= high).length;
    if (max.n <= high) {
      add('FAIL', 'version-tag', `claimed tag v2.3.${max.n} (${max.file}:${max.line}) ≤ base high-water v2.3.${high} (${highSrc}) — already shipped; renumber to ≥ v2.3.${high + 1}`);
    } else {
      add('PASS', 'version-tag', `claimed v2.3.${max.n} > base high-water v2.3.${high}${older ? ` (${older} back-reference(s) to older tags: fine, not gated)` : ''}`);
    }
  }

  // in-flight remote branches (last 48h) — collision awareness, WARN only
  try {
    const refs = git(['for-each-ref', '--sort=-committerdate', 'refs/remotes',
      '--format=%(committerdate:unix)\t%(refname:short)\t%(subject)'], { cwd: root });
    const now = Date.now() / 1000;
    const fresh = refs.split('\n').filter(Boolean).map((l) => l.split('\t')).filter(([ts, ref]) =>
      now - +ts < 48 * 3600 && !/\/(main|HEAD)$/.test(ref));
    if (fresh.length) {
      const list = fresh.slice(0, 12).map(([ts, ref, subj]) =>
        `    ${Math.round((now - +ts) / 3600)}h  ${ref}  ${subj}`).join('\n');
      add('WARN', 'version-tag', `${fresh.length} remote branch(es) pushed in the last 48h — check none claims your tag or your topic:\n${list}`);
    }
  } catch { /* offline: skip */ }
}

/* ---- 4. dmg-popup ------------------------------------------------ */
{
  let fails = 0;
  for (const f of changedClient) {
    if (f === 'src/game/combatHelpers.js') continue; // pushDmgPopup's own home
    const srcText = read(f);
    let idx = -1;
    while ((idx = srcText.indexOf('S.dmgNumbers.push(', idx + 1)) !== -1) {
      fails++;
      add('FAIL', 'dmg-popup', `${f}:${lineOf(srcText, idx)} — raw S.dmgNumbers.push(); use pushDmgPopup from src/game/combatHelpers.js (v2.3.1188 sweep — it owns the cap/shape)`);
    }
  }
  if (!fails) add('PASS', 'dmg-popup', `no raw S.dmgNumbers.push( in ${changedClient.length} changed client file(s)`);
}

/* ---- 5. storage-keys --------------------------------------------- */
{
  // registry covers GameRoom DO storage (handoff rule 2); other DOs exempt
  const EXEMPT = new Set(['server/src/marketplace.js', 'server/src/arena.js',
    'server/src/leaderboard.js', 'server/src/feedback.js']);
  let registry = new Set();
  try {
    const handoff = read('docs/ARCHITECTURE-HANDOFF.md');
    for (const mm of handoff.matchAll(/`([a-zA-Z_][a-zA-Z0-9_]*):/g)) registry.add(mm[1]);
  } catch { add('WARN', 'storage-keys', 'docs/ARCHITECTURE-HANDOFF.md unreadable — registry check skipped'); registry = null; }
  let fails = 0, scanned = 0;
  if (registry) {
    for (const f of changedServerSrc) {
      if (EXEMPT.has(f)) continue;
      scanned++;
      const srcText = read(f);
      for (const mm of srcText.matchAll(/storage\s*\.\s*(?:put|get)\s*\(\s*[`'"]([a-zA-Z_][a-zA-Z0-9_]*):/g)) {
        if (!registry.has(mm[1])) {
          fails++;
          add('FAIL', 'storage-keys', `${f}:${lineOf(srcText, mm.index)} — storage prefix '${mm[1]}:' not in the ARCHITECTURE-HANDOFF rule-2 registry table; register it there (same PR)`);
        }
      }
    }
    if (!fails) add('PASS', 'storage-keys', `all literal storage prefixes in ${scanned} changed server/src file(s) are registered`);
  }
}

/* ---- 6. proto-safety (WARN) --------------------------------------- */
{
  const idIndex = /\[\s*(?:\w*[iI]d\w*|pid|playerId|session\.id)\s*\]/;
  const perFile = new Map(); // file -> [lines]
  for (const f of changedServerSrc) {
    const lines = read(f).split('\n');
    for (let li = 0; li < lines.length; li++) {
      if (!/(?:=|:)\s*\{\s*\}/.test(lines[li])) continue;
      // A site triaged SAFE (server-generated key, join-gate-protected
      // player id, or not-a-map) carries an inline `proto-ok:<reason>`
      // marker so the sweep can go quiet without churning a safe map
      // (item H, v2.3.1214).  Genuinely client-id-keyed maps get
      // Object.create(null)/Map instead (which this regex won't match).
      if (/proto-ok\b/.test(lines[li])) continue;
      const lo = Math.max(0, li - 5), hi = Math.min(lines.length, li + 6);
      if (lines.slice(lo, hi).some((l) => idIndex.test(l))) {
        if (!perFile.has(f)) perFile.set(f, []);
        perFile.get(f).push(li + 1);
      }
    }
  }
  if (perFile.size) {
    for (const [f, ls] of perFile) add('WARN', 'proto-safety', `${f}:${ls.join(',')} — plain {} literal(s) indexed nearby by an id-shaped key`);
    add('WARN', 'proto-safety', `heuristic, review each: a client-supplied id like '__proto__' silently no-ops on a plain object — use Object.create(null) or Map. This recurred 3× on 2026-07-07 alone (duel.away v2.3.1175, party meta v2.3.1185, amulet tiers v2.3.1192)`);
  } else add('PASS', 'proto-safety', `no plain-{} id-keyed map pattern in ${changedServerSrc.length} changed server file(s)`);
}

/* ---- 7. worker-entry-exports (FAIL) -------------------------------- */
/* v2.3.1945: server/src/index.js is the Worker's ENTRY module, and workerd
   registers every named export as a handler.  A primitive export is not one,
   so it refuses to boot the whole service:

     Uncaught TypeError: Incorrect type for map entry 'TRACK_BLOB_MAX_BYTES':
     the provided value is not of type 'function or ExportedHandler'

   That is a total server outage on deploy, from a line that looks like an
   ordinary constant -- and the node suite cannot see it, because importing the
   module in node is not booting a worker.  It cost a red `playable` to find.
   The Sets already exported here are fine: an object coerces to a handler with
   no handlers in it, a number cannot. */
{
  const entry = 'server/src/index.js';
  const bad = [];
  if (existsSync(entry)) {
    const lines = sanitize(read(entry)).split('\n');
    for (let li = 0; li < lines.length; li++) {
      const m = /^\s*export\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(.+)$/.exec(lines[li]);
      if (!m) continue;
      const rhs = m[2].trim();
      /* primitives only -- anything object-shaped (new X, {, [, (, function,
         class, an identifier, a call) is left alone. */
      if (/^(?:-?\d[\d_.eE+-]*|0x[\da-fA-F_]+|'|"|`|true\b|false\b|null\b|undefined\b)/.test(rhs)) {
        bad.push(`${li + 1}: export const ${m[1]} = ${rhs.slice(0, 40)}`);
      }
    }
  }
  if (bad.length) {
    add('FAIL', 'worker-entry-exports', `${entry} exports ${bad.length} primitive(s) — workerd will refuse to boot the service`);
    for (const b of bad) add('FAIL', 'worker-entry-exports', `  ${b}`);
    add('FAIL', 'worker-entry-exports', '  drop the `export` (module-local const) or move it to a non-entry module such as server/src/join.js');
  } else add('PASS', 'worker-entry-exports', `${entry} exports no primitives`);
}

/* ---- 8. shim-allowlist (WARN) -------------------------------------- */
/* v2.3.1704: TRAPS #18, mechanised.
 *
 * `channelShim.send` (src/networking/wsClient.js) is an ALLOWLIST, not a
 * transport: a `S.channel.send({ type: 'x' })` whose type has no passthrough
 * line there never leaves the browser, and the failure is SILENT in both
 * directions — the send returns normally, the worker never hears it, and any
 * assertion on the client's own local prediction passes happily.
 *
 * It has bitten repeatedly and quietly: `firemaking_request` (v2.3.1702,
 * one log lit unlimited fires) and then `extraction_start` (v2.3.1704), which
 * had been dead since v2.3.229 — it took out BOTH the swipe-timing anticheat
 * and the whole "monsters ignore you while harvesting" shield, and the owner
 * reported the latter twice before anyone looked at the wire.
 *
 * WARN, not FAIL, and repo-wide rather than diff-scoped: the point is to make
 * the standing gap list VISIBLE to every session, not to block a push on a
 * pre-existing one that this diff never touched.  A type listed here is either
 * a real dead send or a deliberate no-op — either way it should be a decision,
 * not an accident. */
{
  let shimTypes = null;
  try {
    const ws = read('src/networking/wsClient.js');
    const from = ws.indexOf('var channelShim = {');
    const to = ws.indexOf('track: function track(', from);
    if (from !== -1 && to > from) {
      shimTypes = new Set([...ws.slice(from, to).matchAll(/msg\.type === '([a-z_0-9]+)'/g)].map((m) => m[1]));
    }
  } catch { /* unreadable — fall through to the skip below */ }
  if (!shimTypes || !shimTypes.size) {
    add('WARN', 'shim-allowlist', 'could not locate channelShim.send in src/networking/wsClient.js — check skipped');
  } else {
    /* Every client file that calls .send({ type: '…' }).  wsClient itself is
       exempt: it talks to the raw socket, it is not a caller of the shim. */
    const senders = new Map(); // type -> 'file:line'
    const walk = (dir) => {
      for (const ent of readdirSync(join(root, dir), { withFileTypes: true })) {
        const p = `${dir}/${ent.name}`;
        if (ent.isDirectory()) walk(p);
        else if (/\.(js|jsx|mjs)$/.test(ent.name) && p !== 'src/networking/wsClient.js') {
          const srcText = read(p);
          for (const mm of srcText.matchAll(/\.send\(\s*\{\s*type:\s*'([a-z_0-9]+)'/g)) {
            if (mm[1] === 'broadcast') continue; // the shim's own event tail
            if (!senders.has(mm[1])) senders.set(mm[1], `${p}:${lineOf(srcText, mm.index)}`);
          }
        }
      }
    };
    try { walk('src'); } catch { /* best effort */ }
    const missing = [...senders].filter(([t]) => !shimTypes.has(t));
    if (missing.length) {
      for (const [t, where] of missing) {
        add('WARN', 'shim-allowlist', `'${t}' is sent at ${where} but has no passthrough in channelShim.send — it never reaches the worker (TRAPS #18)`);
      }
    } else add('PASS', 'shim-allowlist', `all ${senders.size} client->server message type(s) have a channelShim passthrough`);
  }
}

/* ---- 8b. town-gate (FAIL) ------------------------------------------ */
/* v2.3.2077: the FOURTH instance of one mistake, mechanised.
 *
 * `S._serverMonsters` means "this zone has server-managed monsters".  wsClient
 * sets it FALSE whenever the zone's monster list comes back empty, and says so
 * in its own comment: "town, or a dungeon the server doesn't model".  So a
 * client->server send gated on it is a send that NEVER HAPPENS IN TOWN — and
 * town is where the shops, the forge, the campfire and the vendor are.
 *
 * The failure is silent in exactly the way TRAPS #18 describes: the client
 * predicts locally, the screen looks right, and the worker's blob — which owns
 * inventory, coins and HP — reconciles the whole thing away on the next
 * player_state.  It has shipped four times:
 *   v2.3.1702  ability_use      (specials did nothing server-side)
 *   v2.3.2063  shop_purchase    (no purchase in the game's history reached it)
 *   v2.3.2077  eat_request x3, cook_recipe x2
 *   v2.3.2077  forge_weapon x2  (the blacksmith stands in town — forging had
 *                                never reached the worker at all)
 *
 * COMBAT MESSAGES ARE THE LEGITIMATE EXCEPTION and are allowlisted by name:
 * you cannot damage a server monster in a zone that has none, so there the
 * flag is the correct precondition rather than an accident.  Anything else
 * wanting this gate should be asking "am I connected", which is `S.channel`.
 *
 * FAIL rather than WARN: the standing set is empty as of v2.3.2077, so this
 * can only fire on something newly written. */
{
  const ALLOWED = new Set(['monster_damage']);
  const hits = [];
  const walk = (dir) => {
    for (const ent of readdirSync(join(root, dir), { withFileTypes: true })) {
      const p2 = `${dir}/${ent.name}`;
      if (ent.isDirectory()) walk(p2);
      else if (/\.(js|jsx|mjs)$/.test(ent.name) && p2 !== 'src/networking/wsClient.js') {
        const lines = read(p2).split('\n');
        for (let i = 0; i < lines.length; i++) {
          /* The type can sit several lines below the `.send(` — two of the
             game's sends are written that way (prog3_allocate, stats_update),
             and a single-line regex silently skips them. Scan a window. */
          if (!lines[i].includes('.send(')) continue;
          /* The type can sit several lines below the `.send(` — two of the
             game's sends are written that way (prog3_allocate, stats_update)
             — and three more pass a msg OBJECT built elsewhere, where no type
             is resolvable from the call site at all. Find the guard first, so
             a gated send is never skipped merely because its type is not
             visible here. */
          let guard = null;
          for (let j = i; j > Math.max(-1, i - 12); j--) {
            const g = /if \(([^)]*channel[^)]*)\)/.exec(lines[j]);
            if (g) { guard = g[1]; break; }
          }
          if (!guard || !/_serverMonsters/.test(guard)) continue;
          const m = /type:\s*'([a-z_0-9]+)'/.exec(lines.slice(i, i + 7).join('\n'));
          if (m && (m[1] === 'broadcast' || ALLOWED.has(m[1]))) continue;
          hits.push(m ? `'${m[1]}' at ${p2}:${i + 1}`
            : `an unnamed send at ${p2}:${i + 1} (the type is built elsewhere — check it by hand)`);
        }
      }
    }
  };
  try { walk('src'); } catch { /* best effort */ }
  if (hits.length) {
    for (const h of hits) {
      add('FAIL', 'town-gate', `${h} is gated on _serverMonsters, which is false in TOWN — this send cannot happen there (see the note in tools/dev/precheck.mjs; use S.channel)`);
    }
  } else add('PASS', 'town-gate', 'no client->server send is gated on _serverMonsters (combat damage excepted)');
}

/* ---- 8c. qa-handles (FAIL) ------------------------------------------ */
/* v2.3.2078: a QA scenario that calls a handle the game does not define
 * asserts nothing, silently, forever.
 *
 * Every one of these was written inside a try/catch or behind a `||` fallback,
 * so nothing ever threw and nothing ever failed:
 *   mp-shirtarm    window.__btGear.setEquip(...)   -- the handle is __btGearSet.
 *                  The scenario is about a character wearing a tee; it wore
 *                  whatever it spawned in, for as long as the file existed.
 *   mp-cosmpose    window.__broTapWorld(x, y)      -- never existed. The walk
 *                  that was supposed to reach a resource node moved nobody.
 *   mp-southshirt  window.__btShirtId              -- never existed. Printed
 *                  nulls where the loadout should have been.
 *
 * The rule: a `window.__X` a scenario READS must be defined in the shipped
 * client (src/ or public/), or assigned by that same scenario (the harness's
 * own scratch pins -- __pin, __fa, __qRaf and friends -- are legitimate and
 * are the overwhelming majority of matches, which is why self-assignment is
 * the exemption rather than a name allowlist).
 *
 * Comments are stripped before scanning so a v2.3.2078-style note recording a
 * retired handle does not re-flag the fix that removed it.
 *
 * FAIL rather than WARN: the standing set is empty as of v2.3.2078. */
{
  const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const defined = new Set();
  const collect = (dir, re) => {
    let ents = [];
    try { ents = readdirSync(join(root, dir), { withFileTypes: true }); } catch { return; }
    for (const ent of ents) {
      const p2 = `${dir}/${ent.name}`;
      if (ent.isDirectory()) collect(p2, re);
      else if (re.test(ent.name)) {
        for (const m of read(p2).matchAll(/window\.(__[A-Za-z0-9_]+)/g)) defined.add(m[1]);
      }
    }
  };
  /* .html too, both trees: src/belt-harness.html sets __done and
     public/tools/draw.html sets __draw — a scenario driving a standalone
     harness page is reading a handle that page defines, not a missing one. */
  collect('src', /\.(js|jsx|html)$/);
  collect('public', /\.(html|js)$/);

  const hits = [];
  const scan = (dir) => {
    let ents = [];
    try { ents = readdirSync(join(root, dir), { withFileTypes: true }); } catch { return; }
    for (const ent of ents) {
      const p2 = `${dir}/${ent.name}`;
      if (ent.isDirectory()) scan(p2);
      else if (/\.mjs$/.test(ent.name)) {
        const t = strip(read(p2));
        const used = new Set([...t.matchAll(/window\.(__[A-Za-z0-9_]+)/g)].map((m) => m[1]));
        for (const h of used) {
          if (defined.has(h)) continue;
          /* assigned by this scenario itself -> a scratch pin, which is fine */
          if (new RegExp(`window\\.${h}\\s*(=[^=]|\\|\\|=)`).test(t)) continue;
          hits.push(`window.${h} at ${p2}`);
        }
      }
    }
  };
  scan('tools/qa');
  if (hits.length) {
    for (const h of hits) {
      add('FAIL', 'qa-handles', `${h} is read but nothing defines it — the client offers no such handle, so whatever it guards is not being tested (see the note in tools/dev/precheck.mjs)`);
    }
  } else add('PASS', 'qa-handles', 'every window.__ handle a QA scenario reads is defined by the client or by that scenario');
}

/* ---- 8d. audio-mix (FAIL) -------------------------------------------- */
/* v2.3.2079: the ambience plays UNDERNEATH the score, and that is a number
 * relationship, not a comment.
 *
 * ZONE_AMBIENT_VOL is documented as sitting "just under the zone score,
 * because it plays UNDERNEATH it rather than instead of it — wind you notice
 * but do not listen to". When the owner asked for the music to be halved
 * (v2.3.2079) the two music constants moved and the ambience did not, which
 * would have left the wind as the LOUDEST layer in the zone, in front of the
 * thing it is meant to sit beneath. Caught by reading the file; nothing would
 * have caught it in play except an owner wondering why the wind got louder.
 *
 * Both music volumes are the CEILING — there is no slider and no mute — so a
 * tuning pass touches exactly these three numbers and this is where they can
 * disagree. */
{
  const rel = 'src/data/gameDisplay.js';
  const num = (k, t) => {
    const m = new RegExp('\\b' + k + ':\\s*([0-9.]+)').exec(t);
    return m ? +m[1] : null;
  };
  let t = '';
  try { t = read(rel); } catch { t = ''; }
  const zone = num('ZONE_MUSIC_VOL', t);
  const amb = num('ZONE_AMBIENT_VOL', t);
  const glob = num('GLOBAL_MUSIC_VOL', t);
  if (zone == null || amb == null || glob == null) {
    add('WARN', 'audio-mix', `could not read the three volume constants out of ${rel} — check the shapes`);
  } else if (amb >= zone) {
    add('FAIL', 'audio-mix', `ZONE_AMBIENT_VOL (${amb}) is not under ZONE_MUSIC_VOL (${zone}) — `
      + 'the wind would play in FRONT of the score it is meant to sit beneath '
      + '(see the note in gameDisplay.js)');
  } else {
    add('PASS', 'audio-mix', `the ambience sits under the score `
      + `(${amb} < ${zone}; session track ${glob})`);
  }
}

/* ---- 7. server tests ----------------------------------------------- */
if (changedServer.length) {
  const r = spawnSync('npm', ['test'], { cwd: join(root, 'server'), encoding: 'utf8', timeout: 5 * 60 * 1000, maxBuffer: 64 * 1024 * 1024 });
  if (r.status === 0) add('PASS', 'server-tests', 'cd server && npm test — all suites green');
  else {
    const tail = ((r.stdout || '') + (r.stderr || '')).trim().split('\n').slice(-12).join('\n    ');
    add('FAIL', 'server-tests', `cd server && npm test exited ${r.status ?? 'timeout'}:\n    ${tail}`);
  }
} else {
  add('PASS', 'server-tests', 'no server/ changes — suite skipped');
}

/* ---- 8. prog3 blob-vs-cap ------------------------------------------
   v2.3.1902.  A tiny unit check, run whenever src/data/prog3.js or a panel
   that reads a trained level changes.  It exists because the v2.3.1901 fix
   for "combat skills say 0" was gated on caps.prog3 and therefore could not
   reach the owner, whose session had the cap OFF — a test that never runs is
   how that ships twice. */
{
  const touched = changed.filter((f) => f === 'src/data/prog3.js'
    || f === 'src/ui/panels/StatScreenPanel.jsx'
    || f === 'src/ui/mobile/dash/T2Panel.jsx');
  if (touched.length) {
    const r = spawnSync('node', ['tools/dev/check-prog3-blob.mjs'],
      { cwd: root, encoding: 'utf8', timeout: 60 * 1000 });
    if (r.status === 0) add('PASS', 'prog3-blob', 'the trained level reads the blob, not caps.prog3');
    else {
      const tail = ((r.stdout || '') + (r.stderr || '')).trim().split('\n').slice(-8).join('\n    ');
      add('FAIL', 'prog3-blob', `check-prog3-blob.mjs exited ${r.status ?? 'timeout'}:\n    ${tail}`);
    }
  } else add('PASS', 'prog3-blob', 'no prog3 / trained-level panel changes — check skipped');
}

/* ---- 9. hairmask-parity ---------------------------------------------
   v2.3.1959.  A `clipsHair` hat masks the hair to its own silhouette, so the
   mask has to be placed with everything the HAT was placed with.  Twice now a
   hair-dependent adjustment was added to the hat's placement in both renderers
   and left out of the mask's in both (the v2.3.1561 float lift, then the
   v2.3.1943 band refit).  No shipped hat combination reaches either mismatch
   today, so nobody would see it fail — the probe manufactures the case, which
   is the only way to test a trap that content has not sprung yet. */
{
  const touched = changed.filter((f) => f === 'src/rendering/characterPortrait.js'
    || f === 'src/rendering/systems/entityRenderer.js'
    || f === 'src/rendering/traits/hatHairFit.js'
    || f === 'src/rendering/traits/bandFit.js');
  if (touched.length) {
    const r = spawnSync('node', ['tools/dev/check-hairmask-parity.mjs'],
      { cwd: root, encoding: 'utf8', timeout: 60 * 1000 });
    if (r.status === 0) add('PASS', 'hairmask-parity', 'the hair mask is placed exactly where the hat is');
    else {
      const tail = ((r.stdout || '') + (r.stderr || '')).trim().split('\n').slice(-10).join('\n    ');
      add('FAIL', 'hairmask-parity', `check-hairmask-parity.mjs exited ${r.status ?? 'timeout'}:\n    ${tail}`);
    }
  } else add('PASS', 'hairmask-parity', 'no trait-placement changes — check skipped');
}

/* ---- 10. hairmask rule ----------------------------------------------
   v2.3.1960.  The hair-clip masks are a LOOK decision baked into 155 PNGs and
   nothing on the PR path ever looked at them, so both ways they rot were
   silent: someone edits the width rule in make_hairmask.py, or someone recuts
   a hat's art and forgets to rebuild the mask beside it.  Gated on the three
   inputs the masks are a function of — the generator, the headwear folder, and
   the body/crown table the "does this shave the head" measurement stands on.
   ~1s, node-only; the generator itself needs python + numpy + Pillow, which
   this gate deliberately does not. */
{
  const touched = changed.filter((f) => f === 'tools/make_hairmask.py'
    || f.startsWith('public/sprites/traits/headwear/')
    || f.startsWith('public/sprites/player/stand-')
    || f === 'public/sprites/player/body-tops.json'
    || f === 'tools/dev/check-hairmask-rule.mjs');
  if (touched.length) {
    const r = spawnSync('node', ['tools/dev/check-hairmask-rule.mjs'],
      { cwd: root, encoding: 'utf8', timeout: 120 * 1000 });
    if (r.status === 0) add('PASS', 'hairmask-rule', 'every hair-clip mask is the width rule applied to the hat art on disk');
    else {
      const tail = ((r.stdout || '') + (r.stderr || '')).trim().split('\n').slice(-10).join('\n    ');
      add('FAIL', 'hairmask-rule', `check-hairmask-rule.mjs exited ${r.status ?? 'timeout'}:\n    ${tail}`);
    }
  } else add('PASS', 'hairmask-rule', 'no headwear art / hairmask / generator changes — check skipped');
}

/* ---- report -------------------------------------------------------- */
console.log(`precheck vs ${baseRef} (merge-base ${mergeBase.slice(0, 8)}) — ${changed.length} changed file(s)\n`);
for (const r of results) console.log(`${r.level.padEnd(4)} [${r.check}] ${r.msg}`);
const nFail = results.filter((r) => r.level === 'FAIL').length;
const nWarn = results.filter((r) => r.level === 'WARN').length;
console.log(`\n${nFail ? 'BLOCKED' : 'OK TO PUSH'} — ${nFail} FAIL, ${nWarn} WARN`);
process.exit(nFail ? 1 : 0);
