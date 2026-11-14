/* THE WORKER'S SOURCE, IN DEPTH -- v2.3.5060 (grand plan step 4.1, card N).
 *
 * Every suite that reads `server/src/` to hold a door ("nothing but gold.js
 * writes `.coins`", "only three files call _applyDamage") lists its files
 * here.  Each used to list the folder flat (`readdirSync(dir)`), so a file in
 * a folder under `server/src/` was invisible to every door: a new folder
 * (card N's `server/src/wire/`, the next one after it) could write a purse
 * and no test would see it.
 *
 * A file in a folder is read like one at the top.  Its name is its path from
 * `server/src/` (`zz/x.js`), so `new URL(f, SRC_DIR)` and `join(SRC_PATH, f)`
 * still find it, and a failure names the folder.
 *
 * LEFT OUT, by name, with the reason:
 *   - `vendor/`: the vendored secp256k1 signer (`noble-secp256k1.js`, MIT,
 *     its licence beside it), imported by `chainwriter.js`.  Not our code: it
 *     is copied in whole and never edited, so no door of ours can hold it,
 *     and its own words would be read as ours.
 * Anything else left out is a new line here, with its reason. */

import { readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const SRC_DIR = new URL('../src/', import.meta.url);
export const SRC_PATH = fileURLToPath(SRC_DIR);

export const LEFT_OUT = Object.freeze({
  vendor: 'the vendored secp256k1 signer (chainwriter.js imports it): copied in whole, never edited, not ours',
});

/* Every `.js` file under `root` (server/src by default), in depth, as a path
   from it with `/` between folders, sorted.  A folder named in LEFT_OUT is
   skipped at the top only: `zz/vendor/` is ours and is read. */
export function srcFiles(root = SRC_DIR, { ext = /\.js$/ } = {}) {
  const base = root instanceof URL ? root : pathToFileURL(root.endsWith('/') ? root : root + '/');
  const out = [];
  (function walk(rel) {
    for (const d of readdirSync(new URL(rel, base), { withFileTypes: true })) {
      if (d.isDirectory()) {
        if (rel === '' && Object.prototype.hasOwnProperty.call(LEFT_OUT, d.name)) continue;
        walk(rel + d.name + '/');
      } else if (d.isFile() && ext.test(d.name)) out.push(rel + d.name);
    }
  })('');
  return out.sort();
}
