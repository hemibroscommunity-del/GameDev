/* ═══ v2.3.6693: A PLANTED COPY OF A MODULE, IMPORTED AS ITSELF (card UI2-codex) ═══
 * A suite that plants a one-line change in a real module (the card's dodges,
 * each seen red) imports the changed text as a data: module, its relative
 * imports turned into the real files' absolute addresses, so the copy runs
 * against the real tables beside it and nothing is written to disk.
 * Its callers: tools/guards/codex-view.test.mjs, entity-inspect.test.mjs,
 * loot-rows.test.mjs. */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/** The text of `rel` with `from` swapped for `to` once, or null when `from`
    is not found exactly once (the plant's line moved). */
export function plantText(root, rel, from, to) {
  const s = fs.readFileSync(path.join(root, rel), 'utf8');
  if (s.split(from).length !== 2) return null;
  return s.replace(from, to);
}

/** Import `text` as if it were the file `rel` under `root`. */
export function importAs(root, rel, text) {
  const dir = path.dirname(path.join(root, rel));
  const fixed = text.replace(/(from\s+|import\s*\(\s*)'(\.\.?\/[^']+)'/g, (m, head, spec) => head + "'" + pathToFileURL(path.join(dir, spec)).href + "'");
  return import('data:text/javascript;base64,' + Buffer.from(fixed).toString('base64'));
}
