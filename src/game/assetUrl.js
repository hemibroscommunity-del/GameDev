/* ═══ v2.3.6742: A FILE'S ADDRESS, WITH ITS FILE'S VERSION (card KEEP, PR 3) ═══
 *
 * The owner, 2026-11-26: "Keeping pictures a long time or indefinitely will
 * be a big boost how do I do that", and, told what it takes: "Yes do it".
 *
 * A folder is kept a year (public/_headers, `immutable`) only when every
 * request to it carries its file's version: the first 10 characters of the
 * SHA-256 of the file's bytes (tools/assets/versions.mjs), so a changed file
 * is a new address.  An address WRITTEN OUT in src/ gets it from the build
 * (tools/assets/keepVersions.mjs, card KEEP PR 2).  An address BUILT from
 * parts ('/sfx/' + group + '/' + name + '.mp3') cannot: the loader that
 * fetches it calls this.
 *
 *   assetUrl('/sfx/ui/chime.mp3')          -> '/sfx/ui/chime.mp3?v=<10>'
 *   assetUrl('/sfx/ui/chime.mp3?v=2')      -> the same (a hand key replaced)
 *   assetUrl('/sfx/ui/chime.mp3?v=<10>')   -> unchanged (twice is once)
 *   a file the table does not hold, another query, a '#': as written
 *
 * The table (./assetTable.js) is written by the build and holds only the
 * families a built address can name (versions.mjs PAGE_FAMILIES); in node and
 * `npm run dev` it is empty and every address is returned as written.
 * No imports but the table: node tests it (tools/guards/keep-sfx.test.mjs).
 * v2.3.6743: the icons are a family of the table too (PR 3b, '/icons/').
 */
import TABLE from './assetTable.js';

export function assetUrl(path) {
  if (typeof path !== 'string' || path[0] !== '/' || path[1] === '/' || path.indexOf('#') >= 0) return path;
  const q = path.indexOf('?');
  const base = q >= 0 ? path.slice(0, q) : path;
  /* one `v=` (a hand key, or the table's own) is replaced; any other query
     is a loader's own and is left as written */
  if (q >= 0 && !/^v=[^&=?]*$/.test(path.slice(q + 1))) return path;
  let address = base;
  try { address = decodeURIComponent(base); } catch (e) { /* kept as written */ }
  const v = TABLE[address];
  return v ? base + '?v=' + v : path;
}
