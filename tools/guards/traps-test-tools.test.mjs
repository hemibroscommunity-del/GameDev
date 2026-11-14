/* ═══ v2.3.5323: TRAPS INTO GUARDS, THE TESTS AND THE TOOLS THAT RUN THEM (card V PR 4) ═══
 *
 * Grand plan step 8.2, card V's fourth batch (the form: tools/guards/README.md,
 * "A trap held").  The census of what holds each trap:
 * docs/plan/census/traps.md.  Every check here reads files; none runs a
 * browser or a worker.
 *
 * TRAPS §29 (the rule): label selectors (clickText, :has-text, text=, getByText, hasText, [title=], [aria-label=]...) in tools/qa/mp/'s code only fall, file by file (lib/labelSelectorsKnown.mjs: 120 in 66 files today). Break: tools/qa/mp/mp-desktrade.mjs: a third `await H.clickText(A, 'Trade');` -> FAIL (tried 2026-11-14).
 * TRAPS §69 (the rule): every `window.WebSocket = X` under tools/qa/ gives X the real one's statics (CONNECTING, OPEN, CLOSING, CLOSED: copied, set, or inherited by `extends`). Break: tools/qa/mp/mp-farpeer.mjs: the line copying the four statics onto Counted gone -> FAIL (tried 2026-11-14).
 * TRAPS §136 (the rule): no file under tools/qa/ empties S.dmgNumbers by hand (`.length = 0`, `= []`, `.splice(0`); a census, two stepped in today. Break: tools/qa/mp/mp-dmgsize.mjs: `S.dmgNumbers.length = 0;` in place of its clearPops -> FAIL (tried 2026-11-14).
 * TRAPS §181 (the rule): every `wrangler dev` a tool under tools/ starts passes --local-upstream; a census, two of their own workers known. Break: tools/qa/load/load.mjs: the `'--local-upstream', ...` line gone from its spawn -> FAIL (tried 2026-11-14).
 * TRAPS §169 (the rule): server/wrangler.toml keeps the runtime's web_socket_compression on: its compatibility_date is past 2023-08-15 and no `no_web_socket_compression` flag. Read, never changed. Break: server/wrangler.toml: `compatibility_flags = ["no_web_socket_compression"]` in a scratch worktree -> FAIL (tried 2026-11-14).
 * TRAPS §199 (the rule): each folder under public/world/ has its own rule in public/_headers, or is listed with why it has none; a folder the page addresses beside a `?v=` with no rule is stepped in (arena, today). Break: public/_headers: the `/world/placed5/*` rule gone -> FAIL (tried 2026-11-14).
 * TRAPS §230 (the rule): no tool under tools/audio/ decodes a sound file to fewer channels with ffmpeg's `-ac` (an `-ac` after a file's `-i`); a census, one stepped in today. Break: tools/audio/cut_owner_sounds.py: its load() decoding with `'-i', path, '-ac', '1'` -> FAIL (tried 2026-11-14).
 *
 * THE CENSUSES (rule 3: a count only falls; the gatekeeper alone makes one
 * strict).  The places stepped in today are each a line under Found in
 * docs/plan/status/V.md, with the card whose file it is; this card fixes
 * none of them (they are not its files).
 *
 * BREAK PROOF (rule 8), each tried by hand in a scratch copy, then undone:
 *   §29   mp-desktrade.mjs: a third clickText(A, 'Trade')                    -> FAIL §29 (2 > 2 known)
 *         a new scenario file with `[aria-label="Close"]`                     -> FAIL §29 (not on the census)
 *   §69   mp-farpeer.mjs: its `for (const k of [...]) Counted[k] = Native[k]` gone -> FAIL §69
 *   §136  mp-dmgsize.mjs: `S.dmgNumbers.length = 0`                           -> FAIL §136 (3 > 2)
 *   §181  load.mjs: `'--local-upstream', ...` gone                             -> FAIL §181
 *   §169  wrangler.toml (a scratch worktree, never this one): the flag        -> FAIL §169
 *   §199  _headers: `/world/placed5/*` gone                                   -> FAIL §199
 *   §230  cut_owner_sounds.py load(): `'-i', path, '-ac', '1'`                 -> FAIL §230 (2 > 1)
 *
 * Run from the repository's root: node tools/guards/traps-test-tools.test.mjs
 *   --write   lower lib/labelSelectorsKnown.mjs to what is there (never raises)
 * (cd server && npm test runs it with every other guard and suite).
 */
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/fourLines.mjs';
import { codeOf } from './lib/codeOnly.mjs';
import { maskCode } from './lib/maskCode.mjs';
import { labelSelectors, renderKnown } from './lib/labelSelectors.mjs';
import { KNOWN as LABEL_KNOWN } from './lib/labelSelectorsKnown.mjs';

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 900)));
};
const read = (f) => readFileSync(join(ROOT, f), 'utf8');

const qa = codeOf(['tools']);   /* every .js/.mjs under tools/, comments dropped */

/* ── §29: label selectors only fall ── */
{
  const now = labelSelectors(qa);
  if (process.argv.includes('--write')) {
    const kept = Object.create(null);
    for (const [f, n] of Object.entries(LABEL_KNOWN)) if (now[f]) kept[f] = Math.min(n, now[f]);
    writeFileSync(join(ROOT, 'tools/guards/lib/labelSelectorsKnown.mjs'), renderKnown(kept));
    console.log('lib/labelSelectorsKnown.mjs lowered (nothing raised or added)');
    process.exit(0);
  }
  const over = Object.entries(now).filter(([f, n]) => n > (LABEL_KNOWN[f] || 0)).map(([f, n]) => `${f}: ${n} > ${LABEL_KNOWN[f] || 0}`);
  const total = Object.values(now).reduce((a, b) => a + b, 0);
  const line = Object.values(LABEL_KNOWN).reduce((a, b) => a + b, 0);
  check(`§29: label selectors in tools/qa/mp/ only fall, file by file (${total} in ${Object.keys(now).length} files; the census ${line}): select by a class or a data- hook`,
    over.length === 0, over);
  const room = Object.entries(LABEL_KNOWN).filter(([f, n]) => (now[f] || 0) < n).length;
  if (room) console.log(`     (room: ${room} file(s) under their count; --write lowers the census)`);
}

/* ── §69: a WebSocket wrapper carries the constructor's statics ── */
{
  const STATICS = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];
  const wrappers = [];
  for (const [f, c] of qa) {
    if (!f.startsWith('tools/qa/')) continue;
    const m = maskCode(c);
    for (const x of m.matchAll(/window\.WebSocket=(?!=)/g)) {
      const rhs = c.slice(x.index + x[0].length, x.index + x[0].length + 40);
      const name = (/^([A-Za-z_$][\w$]*)\s*(?:[;,)}]|$)/.exec(rhs) || [])[1] || null;
      const holder = name ? [name, 'window.WebSocket'] : ['window.WebSocket'];
      const ok = /^class\s*(?:[\w$]+\s*)?extends/.test(rhs)                                   /* inherits them */
        || (name && new RegExp('class ' + name + ' extends').test(c))
        || /^new Proxy\(/.test(rhs)
        || holder.some((h) => {
          const H = h.replace(/[.$]/g, (ch) => '\\' + ch);
          if (new RegExp('Object\\.assign\\(' + H + ',(?:[A-Za-z_$][\\w$.]*)\\)').test(c)) return true;   /* Object.assign(W, RealWS) */
          const lit = new RegExp('Object\\.assign\\(' + H + ',\\{([^}]*)\\}').exec(c);
          if (lit && STATICS.every((k) => new RegExp('(?:^|,)' + k + ':').test(lit[1]))) return true;
          if (STATICS.every((k) => new RegExp(H + '\\.' + k + '=(?!=)').test(c))) return true;
          const loop = new RegExp('for\\(const ([\\w$]+) of\\[([^\\]]*)\\]\\)' + H + '\\[\\1\\]=').exec(c);
          return !!(loop && STATICS.every((k) => loop[2].includes('"' + k + '"')));
        });
      wrappers.push({ f, name, ok });
    }
  }
  const bad = wrappers.filter((w) => !w.ok).map((w) => `${w.f}: window.WebSocket = ${w.name || '(an expression)'}`);
  check(`§69: every window.WebSocket wrapper under tools/qa/ carries CONNECTING, OPEN, CLOSING and CLOSED (${wrappers.length} wrappers)`,
    wrappers.length >= 10 && bad.length === 0, bad);
}

/* ── §136: popups are aged out, never emptied ── */
{
  const KNOWN = { 'tools/qa/mp/mp-rollhit.mjs': 1, 'tools/qa/mp/mp-blockcost.mjs': 1 };
  const LINE = 2;
  const hits = [];
  for (const [f, c] of qa) {
    if (!f.startsWith('tools/qa/')) continue;
    const n = (c.match(/dmgNumbers(?:\.length=0(?![\d.])|=\[\]|\.splice\(0[,)])/g) || []).length;
    if (n) hits.push({ f, n });
  }
  const total = hits.reduce((a, h) => a + h.n, 0);
  check(`§136: S.dmgNumbers emptied by hand under tools/qa/: ${total}, at or under the line ${LINE} (age them out: d.ts = 0, mp-dmgsize's clearPops)`,
    total <= LINE && hits.every((h) => h.n <= (KNOWN[h.f] || 0)), hits);
  if (total < LINE) console.log(`     (room: ${total} under the line ${LINE}; the gatekeeper may lower it)`);
}

/* ── §181: a local worker is told its own address ── */
{
  /* their own workers (their own wrangler.toml, no route: wrangler's default
     host is their address today) -- stepped in by the rule's letter */
  const KNOWN = { 'tools/lab/run.mjs': 1, 'tools/qa/load/dobench/drive.mjs': 1 };
  const LINE = 2;
  const spawns = [];
  for (const [f, c] of qa) {
    if (f.startsWith('tools/guards/')) continue;   /* the guards start no worker (this one names the pattern) */
    const m = maskCode(c);
    for (const x of c.matchAll(/\["wrangler","dev"/g)) {
      let d = 0, k = x.index;
      for (; k < m.length; k++) { if (m[k] === '[') d++; else if (m[k] === ']' && --d === 0) break; }
      spawns.push({ f, up: /"--local-upstream"/.test(c.slice(x.index, k)) });
    }
    for (const x of c.matchAll(/["'`][^"'`\n]*wrangler dev[^"'`\n]*["'`]/g)) {
      if (/\b(?:exec|execSync|spawn|spawnSync)\(\s*$/.test(c.slice(Math.max(0, x.index - 20), x.index))) spawns.push({ f, up: /--local-upstream/.test(x[0]) });
    }
  }
  const without = spawns.filter((s) => !s.up);
  check(`§181: every wrangler dev a tool starts passes --local-upstream: ${spawns.length} spawns, ${without.length} without, at or under the line ${LINE}`,
    spawns.length >= 3 && without.length <= LINE && without.every((s) => KNOWN[s.f]), without.map((s) => s.f));
  for (const f of ['tools/qa/mp/harness.mjs', 'tools/qa/load/load.mjs']) {
    check(`§181: ...the game's worker as the phone tests and the load test start it (${f.slice(f.lastIndexOf('/') + 1)})`,
      spawns.some((s) => s.f === f && s.up), spawns.filter((s) => s.f === f));
  }
}

/* ── §169: the room's messages stay compressed ── */
{
  const toml = read('server/wrangler.toml');
  const lines = toml.split('\n').map((l) => l.replace(/#.*$/, ''));
  const date = (lines.join('\n').match(/^\s*compatibility_date\s*=\s*"(\d{4}-\d{2}-\d{2})"/m) || [])[1];
  const flagged = lines.some((l) => /no_web_socket_compression/.test(l));
  check(`§169: server/wrangler.toml's compatibility_date (${date}) is past 2023-08-15, which turns web_socket_compression on`,
    !!date && date >= '2023-08-15', date);
  check('§169: ...and no `no_web_socket_compression` turns it off (each phone would download about thirteen times as much)', !flagged);
}

/* ── §199: a folder of baked files gets its own cache rule ── */
{
  const headers = read('public/_headers').split('\n').filter((l) => /^\/\S/.test(l)).map((l) => l.trim());
  const folders = readdirSync(join(ROOT, 'public/world'), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  const page = codeOf(['src']);
  const addressedAtV = (d) => {
    for (const [, c] of page) for (const x of c.matchAll(new RegExp('/world/' + d + '/', 'g'))) {
      if (/[?]v=/.test(c.slice(Math.max(0, x.index - 160), x.index + 240))) return true;
    }
    return false;
  };
  /* folders with no rule of their own, each with why; one stepped in */
  const NO_RULE = {
    objects: 'addressed with no ?v= (wheelObjects.js BASE + the manifest\'s sheet; farmWorld.js ?farm=1): the default caching',
  };
  const KNOWN = { arena: 'arenaArt.js addresses it at ?v=2.3.3730, and _headers has no /world/arena/ rule (stepped in)' };
  const rows = folders.map((d) => ({ d, rule: headers.some((h) => h.startsWith('/world/' + d + '/')), atV: addressedAtV(d) }));
  const bad = rows.filter((r) => !r.rule && !Object.hasOwn(NO_RULE, r.d) && !Object.hasOwn(KNOWN, r.d)).map((r) => r.d);
  check(`§199: every folder under public/world/ has its own rule in public/_headers, or is listed (${rows.map((r) => r.d + (r.rule ? '' : r.atV ? ' (no rule, ?v=)' : ' (no rule)')).join(', ')})`,
    folders.length >= 5 && bad.length === 0, bad);
  const atVNoRule = rows.filter((r) => r.atV && !r.rule).map((r) => r.d);
  check('§199: a folder the page addresses at ?v= with no rule only falls (arena, today)',
    atVNoRule.every((d) => Object.hasOwn(KNOWN, d)) && atVNoRule.length <= Object.keys(KNOWN).length, atVNoRule);
  const listedNowRuled = [...Object.keys(NO_RULE), ...Object.keys(KNOWN)].filter((d) => !folders.includes(d) || rows.find((r) => r.d === d).rule);
  check('§199: ...and a listed folder still has no rule (one given a rule, or gone, comes off the list)', listedNowRuled.length === 0, listedNowRuled);
}

/* ── §230: a sound is measured from its own channels ── */
{
  const KNOWN = { 'tools/audio/cut_monster_noises.py': 1 };
  const LINE = 1;
  const files = existsSync(join(ROOT, 'tools/audio')) ? readdirSync(join(ROOT, 'tools/audio')).filter((f) => /\.(py|mjs|js|sh)$/.test(f)) : [];
  const folds = [];
  for (const name of files) {
    const f = 'tools/audio/' + name;
    const src = read(f).split('\n').filter((l) => !/^\s*(#|\/\/)/.test(l)).join('\n');
    for (const x of src.matchAll(/["']ffmpeg["']\s*,/g)) {
      /* the argument list: to where its bracket closes */
      let d = 0, k = x.index, seen = false;
      for (; k < src.length; k++) {
        const ch = src[k];
        if (ch === '[' || ch === '(') { d++; seen = true; } else if (ch === ']' || ch === ')') { if (--d < 0 || (seen && d === 0)) break; }
      }
      const toks = src.slice(x.index, k).split(',').map((t) => t.trim());
      const i = toks.findIndex((t) => /^["']-i["']$/.test(t));
      if (i < 0) continue;
      const input = toks[i + 1] || '';
      if (/^["']-["']$/.test(input) || /^["']pipe:/.test(input)) continue;   /* raw samples on stdin: `-ac` before it names them */
      if (toks.slice(i + 2).some((t) => /^["']-ac["']$/.test(t))) folds.push(f);
    }
  }
  const counts = {};
  for (const f of folds) counts[f] = (counts[f] || 0) + 1;
  check(`§230: decodes of a sound file folded with ffmpeg's -ac under tools/audio/: ${folds.length}, at or under the line ${LINE} (average the file's own channels: cut_owner_sounds.py load)`,
    folds.length <= LINE && Object.entries(counts).every(([f, n]) => n <= (KNOWN[f] || 0)), counts);
  check(`§230: ...the tools are read (${files.length} under tools/audio/)`, files.length >= 3, files);
}

process.exit(failed ? 1 : 0);
