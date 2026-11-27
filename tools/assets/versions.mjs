/* ═══ v2.3.6740: A FILE'S VERSION, MADE FROM ITS OWN BYTES (card KEEP, PR 1) ═══
 *
 * The owner, 2026-11-26: "Keeping pictures a long time or indefinitely will
 * be a big boost how do I do that", and, told what it takes: "Yes do it".
 *
 * Most of the game's pictures are asked for with no version in their
 * address, so the browser cannot be told "keep this for good" (it would keep
 * a CHANGED picture for good too), and Cloudflare's own default for the
 * domain fills the gap with 4 hours (`max-age=14400, must-revalidate`,
 * measured on brotown.net 2026-11-26: docs/plan/cards/KEEP.md).  So a
 * returning phone asks again about every picture after 4 hours away, and a
 * changed picture can show its old self for up to 4 hours after a merge.
 *
 * The answer (the card's rule 1): every file's address carries a version
 * MADE FROM THE FILE'S BYTES, never typed, never the build's number (the game
 * is built several times a day: a build's number in every address would make
 * every phone download everything again at every merge).  The bytes' hash is
 * already recorded: tools/assets/shipped.json (the asset door, v2.3.5241)
 * holds the SHA-256 of every file under public/ that is a picture, a sound, a
 * video or data.  A file's version is the FIRST 10 CHARACTERS of that hash
 * (40 bits: two of the game's ~3,300 files share one by chance about once in
 * 300 million builds, and a share would only ever cost one stale picture).
 *
 * THIS FILE IS THE ONE PLACE THAT SAYS SO.  The build's plugin (PR 2, in
 * vite.config.js), the page's table (PR 3, src/game/assetUrl.js) and the
 * census (tools/qa/mp/mp-keepcensus.mjs) all read their versions here.
 *
 *   - versionTable()   address -> its 10 characters ('/ui/x.png' -> 'a4873d8684')
 *   - classify(url)    a request: versioned by the TABLE (its `v=` is the
 *                      table's), versioned BY HAND (any other query: a
 *                      GEAR_VERSION, a TRAIT_VER, a manifest's date), BARE (no
 *                      query), or NONE (no file of the table: the build's own
 *                      hashed scripts, the page, the server)
 *   - folderOf(addr)   the folder a `_headers` block keeps ('/sprites',
 *                      '/ui', '/world/objects')
 *
 * THE SPRITE BOT'S TWINS.  A .webp beside a .png under public/sprites/player/
 * or gear/ is made by the bot (optimize-assets.yml) and has NO row in
 * shipped.json (shipped.mjs inReach, by design: a twin the bot puts on main
 * after a merge would turn every PR's gate red).  The game asks for it all the
 * same (webpImage.js swaps the PATH only).  The card's reading: the twin's
 * own hash is its version.  So a twin on disk beside its PNG's row is hashed
 * here, from its own bytes ({ twins: false } leaves them out).
 *
 * Usage:
 *   node tools/assets/versions.mjs                  the table's size, by folder
 *   node tools/assets/versions.mjs /ui/x.png ...    each address's version
 *
 * ZERO dependencies: node only (no git: the build reads it too).
 * v2.3.6741: no `#!` line: the build bundles vite.config.js and its imports
 * with esbuild, which refuses one in a file it did not start from.  Its test is
 * tools/guards/asset-versions.test.mjs.
 */
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const SHIPPED = 'tools/assets/shipped.json';
/* how many characters of the SHA-256 a version keeps (the header) */
export const VERSION_CHARS = 10;
/* the query field a version rides in: `?v=` is what 423 of the game's
   written-out addresses already carry, by hand (the card's measure) */
export const VERSION_FIELD = 'v';
/* the three ways a request to a file of the table is asked for (the census's
   columns), and the fourth for a request to no file of the table */
export const KINDS = Object.freeze(['table', 'hand', 'bare']);
export const NONE = 'none';

/* the sprite bot's twins (shipped.mjs BOT_TWIN): a .png's row under these
   may have a .webp beside it that has no row of its own */
const TWIN_OF_PNG = /^public\/sprites\/(?:player|gear)\/.+\.png$/;

/** 'public/ui/x.png' -> '/ui/x.png' (the address the page asks for) */
export function addressOf(path) {
  return path.startsWith('public/') ? path.slice('public'.length) : null;
}

/** a SHA-256 in hex -> its version */
export function versionOfHash(sha256) {
  return /^[0-9a-f]{64}$/.test(sha256 || '') ? sha256.slice(0, VERSION_CHARS) : null;
}

/** shipped.json's rows ({ path, sha256, ... }) */
export function readRows(root = ROOT) {
  const file = join(root, SHIPPED);
  if (!existsSync(file)) throw new Error(`${SHIPPED} is not there (node tools/assets/shipped.mjs --write makes it)`);
  return JSON.parse(readFileSync(file, 'utf8')).rows;
}

/** Every address the table knows -> its version (a Map, so an address like
 *  '/__proto__' is only ever a key).  `rows` defaults to shipped.json's;
 *  `twins` adds the sprite bot's .webp twins, hashed from their own bytes
 *  (the header); a twin is never allowed to replace a row of its own. */
export function versionTable({ root = ROOT, rows = null, twins = true } = {}) {
  const table = new Map();
  const list = rows || readRows(root);
  for (const r of list) {
    const a = addressOf(r.path), v = versionOfHash(r.sha256);
    if (a && v) table.set(a, v);
  }
  if (twins) {
    for (const r of list) {
      if (!TWIN_OF_PNG.test(r.path)) continue;
      const twin = r.path.slice(0, -4) + '.webp';
      const a = addressOf(twin);
      if (table.has(a)) continue;
      const file = join(root, twin);
      if (!existsSync(file)) continue;
      table.set(a, createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, VERSION_CHARS));
    }
  }
  return table;
}

/* ═══ v2.3.6742: THE PAGE'S TABLE (card KEEP, PR 3) ═══
   src/game/assetUrl.js gives an address BUILT from parts its version, from
   a table the build writes into src/game/assetTable.js (keepVersions.mjs's
   `load`).  It holds ONLY the families a built address can name (the card's
   reading: "the page's table holds only the files a BUILT address can name";
   the plugin has written the others into the script already): the whole
   table, ~3,300 rows, would be about 0.25 MB of script for nothing.  A
   family's PR 3 adds its prefix here, with the loader that calls assetUrl.
     '/sfx/'   the sounds (97 files, 4.2 KB of script)
     '/icons/' v2.3.6743: the icons (582 files, 26.5 KB more of script; PR 3b:
               the item icons' ITEMS_V / ICON_V and the rest of the hand keys
               that joined an /icons address went to assetUrl)
     '/world/objects/' v2.3.6744: the world's object sheets (81 files, their
               JSON, their pages and the manifest; PR 3c: wheelObjects.js,
               farmWorld.js and the ground worker's manifest ask through it) */
export const PAGE_FAMILIES = Object.freeze(['/sfx/', '/icons/', '/world/objects/']);

/** The page's rows: [address, version], sorted, for the addresses of
 *  `table` (a Map, versionTable's) under `prefixes`; `versionOf` (the
 *  plugin's, the bytes winning over a stale row) defaults to the table's. */
export function pageTable(table, { prefixes = PAGE_FAMILIES, versionOf = (a) => table.get(a) } = {}) {
  const rows = [];
  for (const a of table.keys()) {
    if (!prefixes.some((p) => a.startsWith(p))) continue;
    const v = versionOf(a);
    if (v) rows.push([a, v]);
  }
  return rows.sort((x, y) => (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0));
}

/** src/game/assetTable.js's text for those rows (a table with no prototype:
 *  an address is only ever a key) */
export function pageTableModule(rows) {
  const body = rows.map(([a, v]) => `${JSON.stringify(a)}:${JSON.stringify(v)}`).join(',\n');
  return '/* GENERATED by tools/assets/keepVersions.mjs at build (card KEEP PR 3): a file -> its version */\n'
    + `export default Object.freeze(Object.assign(Object.create(null), {\n${body}\n}));\n`;
}

/** A request's address and query, from a whole URL ('http://h/ui/x.png?v=1')
 *  or a path ('/ui/x.png'); the address decoded ('%20' -> ' ', as the files
 *  are named).  null for what is not an address on the game's own site
 *  (data:, blob:, ws:). */
export function splitUrl(url) {
  const s = String(url || '');
  if (/^(?:data|blob|ws|wss|about|chrome-extension):/i.test(s)) return null;
  const m = /^(?:https?:\/\/[^/?#]+)?(\/[^?#]*)(?:\?([^#]*))?/.exec(s);
  if (!m) return null;
  let address = m[1];
  try { address = decodeURIComponent(address); } catch { /* a stray '%': kept as written */ }
  return { address, query: m[2] == null ? null : m[2] };
}

/** How a request names its file: { address, kind, v, want }.
 *    kind 'table' -- its `v=` is the table's version for that file;
 *    kind 'hand'  -- any other query (a hand-kept key, a date, a stale v=);
 *    kind 'bare'  -- no query at all;
 *    kind 'none'  -- no file of the table (the build's hashed scripts in
 *                    /assets/, the page itself, the server, a 404).
 *  `v` is the request's own v= (or null), `want` the table's. */
export function classify(url, table) {
  const u = splitUrl(url);
  if (!u) return null;
  const want = table.get(u.address) || null;
  const params = u.query == null ? null : new URLSearchParams(u.query);
  const v = params ? params.get(VERSION_FIELD) : null;
  if (!want) return { address: u.address, kind: NONE, v, want };
  if (v != null && v === want) return { address: u.address, kind: 'table', v, want };
  /* an empty '?' carries nothing: it is bare */
  if (u.query != null && u.query !== '') return { address: u.address, kind: 'hand', v, want };
  return { address: u.address, kind: 'bare', v, want };
}

/** The folder a `_headers` block would keep: the first name under the site's
 *  root ('/sprites', '/ui', '/sfx'), and under /world the second as well
 *  ('/world/objects', '/world/ground'), where the bakes and the pictures
 *  are different families kept differently today (public/_headers). */
export function folderOf(address) {
  const seg = String(address || '').split('/').filter(Boolean);
  if (seg.length <= 1) return '/';
  if (seg[0] === 'world' && seg.length > 2) return `/world/${seg[1]}`;
  return '/' + seg[0];
}

/* ---- the report ---------------------------------------------------------- */

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const args = process.argv.slice(2);
  const table = versionTable();
  if (args.length) {
    let missing = 0;
    for (const a of args) {
      const u = splitUrl(a);
      const v = u ? table.get(u.address) : null;
      if (!v) missing++;
      console.log(`${a}  ${v || '(no file of the table)'}`);
    }
    process.exit(missing ? 1 : 0);
  }
  const rows = readRows();
  const twins = table.size - rows.filter((r) => addressOf(r.path)).length;
  const by = new Map();
  for (const a of table.keys()) by.set(folderOf(a), (by.get(folderOf(a)) || 0) + 1);
  console.log(`${table.size} addresses with a version (${rows.length} rows of ${SHIPPED}, ${twins} sprite-bot twins hashed from their bytes); ${VERSION_CHARS} characters each.`);
  for (const [f, n] of [...by].sort((a, b) => b[1] - a[1])) console.log(`  ${f.padEnd(20)} ${String(n).padStart(5)}`);
}
