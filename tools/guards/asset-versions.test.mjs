/* ═══ v2.3.6740: A FILE'S VERSION IS MADE FROM ITS BYTES (card KEEP, PR 1) ═══
 *
 * tools/assets/versions.mjs is the one place that says what a file's version
 * is: the first 10 characters of the SHA-256 of its bytes, read from
 * tools/assets/shipped.json (the asset door's record), and for the sprite
 * bot's .webp twins (no row, by design) from the twin's own bytes.  The
 * build's plugin, the page's table and the census read it.  This holds what
 * they lean on:
 *
 *   1. a version is the hash's first 10 characters, and nothing else is one
 *      (a short, upper-case or missing hash gives none);
 *   2. an address is the file's path under public/ ('public/ui/x.png' ->
 *      '/ui/x.png'), and a path outside public/ has none;
 *   3. the table is a Map from the rows (what the plugin and the page look
 *      up by address), and a twin is hashed from its OWN bytes, beside its
 *      PNG's row only, never over a row of its own;
 *   4. a request is read the census's way: its v= equal to the table's is
 *      'table'; any other query (a hand key, a stale or short v=, a date) is
 *      'hand'; none (or an empty '?') is 'bare'; an address the table does not
 *      know is 'none'; the address decoded ('%20'), a whole URL or a path;
 *   5. folderOf names the folder a `_headers` block keeps ('/sprites', and
 *      under /world the second name too);
 *   6. the real record: every row has a version and an address, the twins
 *      found are the bot's (beside a PNG row under sprites/player or gear),
 *      and no two DIFFERENT files share a version (the same bytes twice do,
 *      rightly).
 *
 * BREAK PROOF (rule 8), each tried by hand, 2026-11-26 (and put back):
 *   1. VERSION_CHARS 10 -> 9                                   -> FAIL 1 (and 3)
 *   2. addressOf keeping the 'public' in front                 -> FAIL 2 (and 3, 6)
 *   3. versionTable a plain {} instead of a Map                -> FAIL 3
 *   3. a twin hashed as its PNG's version (r.sha256)           -> FAIL 3
 *   4. classify taking any v= as the table's (v != null)       -> FAIL 4 (a stale v= read 'table')
 *   4. splitUrl not decoding                                   -> FAIL 4
 *   5. folderOf giving '/world' for /world/objects             -> FAIL 5
 *
 * Run from the repository's root: node tools/guards/asset-versions.test.mjs
 * (cd server && npm test runs it with every other guard and suite).
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import {
  VERSION_CHARS, versionOfHash, addressOf, versionTable, readRows, splitUrl, classify, folderOf, KINDS, NONE,
} from '../assets/versions.mjs';

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600)));
};
const sha = (s) => createHash('sha256').update(s).digest('hex');

/* 1 */
const h = sha('a picture');
check('1: a version is the hash\'s first 10 characters', VERSION_CHARS === 10 && versionOfHash(h) === h.slice(0, 10), versionOfHash(h));
check('1: ...and a short, upper-case or missing hash gives none',
  versionOfHash(h.slice(0, 63)) === null && versionOfHash(h.toUpperCase()) === null && versionOfHash(undefined) === null);

/* 2 */
check('2: public/ui/x.png is asked for as /ui/x.png', addressOf('public/ui/x.png') === '/ui/x.png');
check('2: ...and a path outside public/ has no address', addressOf('assets/ui/x.png') === null && addressOf('publicity/x.png') === null);

/* 3: a fixture, on its own disk */
const root = mkdtempSync(join(tmpdir(), 'keep-versions-'));
try {
  const put = (p, body) => { mkdirSync(join(root, p, '..'), { recursive: true }); writeFileSync(join(root, p), body); };
  put('public/sprites/gear/belt/a/jog-east.png', 'png bytes');
  put('public/sprites/gear/belt/a/jog-east.webp', 'webp bytes');
  put('public/sprites/gear/belt/b/jog-east.png', 'png b');           /* no twin on disk */
  put('public/sprites/gear/belt/c/jog-east.png', 'png c');
  put('public/sprites/gear/belt/c/jog-east.webp', 'twin c on disk'); /* it has a row of its own */
  put('public/ui/beside.webp', 'not the bot\'s');                     /* a .webp beside a PNG outside player/gear */
  put('public/ui/beside.png', 'ui png');
  const rows = [
    { path: 'public/sprites/gear/belt/a/jog-east.png', sha256: sha('png bytes') },
    { path: 'public/sprites/gear/belt/b/jog-east.png', sha256: sha('png b') },
    { path: 'public/sprites/gear/belt/c/jog-east.png', sha256: sha('png c') },
    { path: 'public/sprites/gear/belt/c/jog-east.webp', sha256: sha('its row') },
    { path: 'public/ui/beside.png', sha256: sha('ui png') },
  ];
  const t = versionTable({ root, rows });
  check('3: the table is a Map', t instanceof Map);
  check('3: ...a row\'s address carries its row\'s version', t.get('/sprites/gear/belt/a/jog-east.png') === sha('png bytes').slice(0, 10));
  check('3: ...a bot twin beside its PNG\'s row is hashed from its OWN bytes', t.get('/sprites/gear/belt/a/jog-east.webp') === sha('webp bytes').slice(0, 10), t.get('/sprites/gear/belt/a/jog-east.webp'));
  check('3: ...a twin not on disk has no version', !t.has('/sprites/gear/belt/b/jog-east.webp'));
  check('3: ...a twin with a row of its own keeps its row\'s', t.get('/sprites/gear/belt/c/jog-east.webp') === sha('its row').slice(0, 10));
  check('3: ...a .webp outside sprites/player and gear is no twin (no row, no version)', !t.has('/ui/beside.webp'));
  check('3: ...and { twins: false } leaves every twin out', !versionTable({ root, rows, twins: false }).has('/sprites/gear/belt/a/jog-east.webp'));
} finally { rmSync(root, { recursive: true, force: true }); }

/* 4 */
const T = new Map([['/ui/x.png', 'abcdef0123'], ['/ui/a b.png', '0123456789']]);
const k = (u) => (classify(u, T) || {}).kind;
check('4: the table\'s own v= is \'table\'', k('/ui/x.png?v=abcdef0123') === 'table' && k('https://brotown.net/ui/x.png?v=abcdef0123') === 'table');
check('4: ...a stale or short v=, or a hand key, is \'hand\'', k('/ui/x.png?v=abcdef0124') === 'hand' && k('/ui/x.png?v=abcdef') === 'hand'
  && k('/ui/x.png?v=2.3.1224') === 'hand' && k('/ui/x.png?made=2026-11-01') === 'hand');
check('4: ...no query, or an empty \'?\', is \'bare\'', k('/ui/x.png') === 'bare' && k('/ui/x.png?') === 'bare' && k('http://localhost:5173/ui/x.png#a') === 'bare');
check('4: ...an address the table does not know is \'none\'', k('/assets/index-abc.js') === NONE && k('/') === NONE && k('/ui/y.png?v=1') === NONE);
check('4: ...the address decoded', k('/ui/a%20b.png?v=0123456789') === 'table' && classify('/ui/a%20b.png', T).address === '/ui/a b.png');
check('4: ...data:, blob: and the socket are not requests for a file', classify('data:image/png;base64,AA', T) === null && classify('blob:http://x/1', T) === null && classify('ws://h/ws', T) === null);
check('4: ...and the kinds are the census\'s three columns', KINDS.join() === 'table,hand,bare');
check('4: splitUrl keeps the query whole', splitUrl('http://h:1/a/b.png?v=1&lane=full').query === 'v=1&lane=full');

/* 5 */
check('5: folderOf: the first name, and under /world the second', folderOf('/sprites/gear/x.png') === '/sprites' && folderOf('/ui/x.png') === '/ui'
  && folderOf('/world/objects/a.png') === '/world/objects' && folderOf('/world/x.json') === '/world' && folderOf('/favicon.png') === '/');

/* 6: the real record */
const rows = readRows();
const real = versionTable();
const noVer = rows.filter((r) => !addressOf(r.path) || !versionOfHash(r.sha256));
check(`6: every one of shipped.json's ${rows.length} rows has an address and a version`, noVer.length === 0, noVer.slice(0, 5).map((r) => r.path));
const rowAddr = new Set(rows.map((r) => addressOf(r.path)));
const twins = [...real.keys()].filter((a) => !rowAddr.has(a));
const strayTwin = twins.filter((a) => !/^\/sprites\/(?:player|gear)\/.+\.webp$/.test(a) || !rowAddr.has(a.slice(0, -5) + '.png'));
check(`6: ...the ${twins.length} twins found are the sprite bot's (a .webp beside a PNG row under sprites/player or gear)`, strayTwin.length === 0, strayTwin.slice(0, 5));
const byVer = new Map();
for (const r of rows) {
  const v = versionOfHash(r.sha256);
  const seen = byVer.get(v);
  if (!seen) byVer.set(v, new Set([r.sha256]));
  else seen.add(r.sha256);
}
const shared = [...byVer].filter(([, s]) => s.size > 1).map(([v]) => v);
check('6: ...and no two DIFFERENT files share a version', shared.length === 0, shared);

console.log(failed ? `\n${failed} FAILED` : '\nall green');
process.exit(failed ? 1 : 0);
