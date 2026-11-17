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
 * v2.3.5714 (card SEC PR 15): and EVERY `server/wrangler.*` file is read,
 * not only wrangler.toml -- wrangler reads a `wrangler.json` or
 * `wrangler.jsonc` beside it FIRST, so one planted there was a second, unread
 * config: parts 1 and 2 hold each file, and
 *   3. each file names the worker `brotown-server`, its `main` is
 *      `src/index.js`, and each Durable Object binding has its own class
 *      (BINDINGS below), no binding of another worker's (`script_name`) and
 *      no other binding -- a binding pointed at a new class is the room's
 *      data left behind as surely as a deleted class.
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
 * v2.3.5714, each on a scratch folder (--dir, a copy of server/'s wrangler.toml), 2026-11-17:
 *   5. a wrangler.jsonc beside the toml, a v2 block `deleted_classes`    -> FAIL 1, 2, 3 (the jsonc's)
 *   6. GAME_ROOM's class_name "GameRoom2"                                -> FAIL 3
 *   7. main = "src/other.js"                                             -> FAIL 3
 *   8. name = "brotown-server-2"                                         -> FAIL 3
 *
 * Run from the repository's root:
 *   node tools/guards/do-migrations.test.mjs                 the checks
 *   node tools/guards/do-migrations.test.mjs --file <path>   the same checks on another
 *                                                            copy (a break proof's scratch copy)
 *   node tools/guards/do-migrations.test.mjs --dir <folder>  every wrangler.* in that folder
 * (cd server && npm test runs it with every other guard and suite).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/fourLines.mjs';

/* The migrations the live worker has run, oldest first (wrangler.toml). */
const KNOWN = [
  { tag: 'v1', new_sqlite_classes: ['GameRoom', 'Marketplace', 'Leaderboard', 'Arena', 'Feedback'] },
];
const FORBIDDEN = ['deleted_classes', 'renamed_classes', 'transferred_classes'];
/* v2.3.5714: the worker, and each Durable Object binding's class */
const WORKER = { name: 'brotown-server', main: 'src/index.js' };
const BINDINGS = { GAME_ROOM: 'GameRoom', MARKETPLACE: 'Marketplace', LEADERBOARD: 'Leaderboard', ARENA: 'Arena', FEEDBACK: 'Feedback' };

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 900)));
};

const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : null; };
const one = arg('--file');
const dir = arg('--dir') || join(ROOT, 'server');
/* v2.3.5714: every wrangler.* in the folder (or the one --file) */
const files = one ? [one] : readdirSync(dir).filter((f) => /^wrangler\./.test(f)).sort().map((f) => join(dir, f));
check('0: there is a wrangler config to read', files.length > 0, dir);

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

/* TOML, enough of it for this file: each table's keys (a value is a string or
   an array of strings; an array may run over several lines). */
function readToml(text) {
  const lines = text.split(/\r?\n/).map(uncomment);
  const tables = [];   /* { header, array, keys } in order; the top level first */
  let cur = { header: '', array: false, keys: {} };
  tables.push(cur);
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t) continue;
    const h = t.match(/^\[\[?\s*([^\]]+?)\s*\]\]?$/);
    if (h) { cur = { header: h[1], array: t.startsWith('[['), keys: {} }; tables.push(cur); continue; }
    const kv = t.match(/^([A-Za-z0-9_.-]+)\s*=\s*(.*)$/);
    if (!kv) { cur.keys['?' + i] = t; continue; }
    let v = kv[2];
    let depth = (v.match(/\[/g) || []).length - (v.match(/\]/g) || []).length;
    while (depth > 0 && i + 1 < lines.length) {
      i++;
      v += ' ' + lines[i].trim();
      depth = (v.match(/\[/g) || []).length - (v.match(/\]/g) || []).length;
    }
    v = v.trim();
    const strs = [...v.matchAll(/"((?:[^"\\]|\\.)*)"|'([^']*)'/g)].map((m) => (m[1] !== undefined ? m[1] : m[2]));
    cur.keys[kv[1]] = v.startsWith('[') ? strs : (strs.length === 1 ? strs[0] : v);
  }
  const top = tables[0].keys;
  return {
    lines,
    headers: tables.slice(1).map((t) => t.header),
    migrations: tables.filter((t) => t.array && t.header === 'migrations').map((t) => t.keys),
    bindings: tables.filter((t) => t.array && t.header === 'durable_objects.bindings').map((t) => t.keys),
    name: top.name, main: top.main,
    inline: lines.some((l) => /^\s*migrations\s*=/.test(l) || /(^|[\s.])migrations\s*=/.test(l.trim())),
  };
}

/* JSON / JSONC: comments out (outside strings), trailing commas out, parsed */
function readJson(text) {
  let out = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { out += c; if (c === '\\') { out += text[++i] || ''; } else if (c === '"') q = false; continue; }
    if (c === '"') { q = true; out += c; continue; }
    if (c === '/' && text[i + 1] === '/') { while (i < text.length && text[i] !== '\n') i++; out += '\n'; continue; }
    if (c === '/' && text[i + 1] === '*') { i += 2; while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++; i++; continue; }
    out += c;
  }
  let j = null;
  try { j = JSON.parse(out.replace(/,(\s*[}\]])/g, '$1')); } catch (e) { j = null; }
  const envs = j && j.env && typeof j.env === 'object' ? Object.keys(j.env).filter((e) => j.env[e] && j.env[e].migrations) : [];
  return {
    lines: out.split(/\r?\n/), parsed: !!j,
    headers: envs.map((e) => 'env.' + e + '.migrations'),
    migrations: j && Array.isArray(j.migrations) ? j.migrations : [],
    bindings: j && j.durable_objects && Array.isArray(j.durable_objects.bindings) ? j.durable_objects.bindings : [],
    name: j && j.name, main: j && j.main, inline: false,
  };
}

for (const file of files) {
  const short = file.split(/[\\/]/).pop();
  const text = readFileSync(file, 'utf8');
  const cfg = /\.toml$/.test(file) ? readToml(text) : readJson(text);
  if (cfg.parsed === false) { check(`${short}: reads as JSON`, false); continue; }
  const blocks = cfg.migrations;

  /* ── 1. the blocks are the known ones ── */
  check(`1: ${short} has ${KNOWN.length} [[migrations]] block(s), as KNOWN does`, blocks.length === KNOWN.length,
    { found: blocks.length, known: KNOWN.length });
  KNOWN.forEach((want, n) => {
    const got = blocks[n] || {};
    const same = JSON.stringify(Object.keys(got).sort()) === JSON.stringify(Object.keys(want).sort())
      && Object.keys(want).every((k) => JSON.stringify(got[k]) === JSON.stringify(want[k]));
    check(`1: ${short}: block ${n + 1} is tag "${want.tag}" with exactly its classes and no other key`, same, { found: got, known: want });
  });
  check(`1: ${short}: no [[migrations]] block past the known ones (a new class is appended to KNOWN in the same PR)`,
    blocks.length <= KNOWN.length, blocks.slice(KNOWN.length));

  /* ── 2. nothing deletes, renames or moves a class, anywhere ── */
  const said = FORBIDDEN.filter((w) => cfg.lines.some((l) => l.includes(w)));
  check(`2: ${short}: no deleted_classes, renamed_classes or transferred_classes outside a comment`, said.length === 0, said);
  const otherHeaders = cfg.headers.filter((h) => /(^|\.)migrations$/.test(h) && h !== 'migrations');
  check(`2: ${short}: no migrations under another table ([[env.<name>.migrations]])`, otherHeaders.length === 0, otherHeaders);
  check(`2: ${short}: no migrations written inline (migrations = [...])`, !cfg.inline);

  /* ── 3. v2.3.5714: the worker, and each binding's class ── */
  check(`3: ${short}: the worker is "${WORKER.name}", main "${WORKER.main}"`, cfg.name === WORKER.name && cfg.main === WORKER.main, { name: cfg.name, main: cfg.main });
  const got = Object.fromEntries(cfg.bindings.map((b) => [b && b.name, b && b.class_name]));
  check(`3: ${short}: each Durable Object binding has its own class, and no other binding`, Object.keys(got).length === Object.keys(BINDINGS).length && Object.keys(BINDINGS).every((k) => got[k] === BINDINGS[k]), { found: got, known: BINDINGS });
  check(`3: ${short}: no binding names another worker's class (script_name)`, !cfg.bindings.some((b) => b && b.script_name), cfg.bindings.filter((b) => b && b.script_name));
}

console.log(failed ? `\n${failed} FAILED` : '\nall green');
process.exit(failed ? 1 : 0);
