/* ═══ v2.3.5103: THE SUITES THAT NAME A BIG FILE BY ITS PATH (card B PR 4) ═══
 *
 * Step 5.2b: "a suite that names a big file is listed, and the list only
 * falls.  No file moves before the suites that read it are converted."  The
 * list is KNOWN, in ./bigFileSuitesKnown.mjs (a census, rule 3: it fails
 * only on a NEW pair; the gatekeeper alone makes it strict).
 *
 * THE RULES, PINNED:
 *   - A BIG FILE is a file with a line of its own in the four lines' table
 *     (./fourLines.mjs LINES.FILE: the eight files over 1,500 code lines).
 *   - A SUITE is a server/test/*.test.mjs or a tools/guards/*.test.mjs.
 *   - A suite NAMES a big file BY ITS PATH when its text holds the file's
 *     folder and name (`ui/BroTown.jsx`, `systems/effectsRenderer.js`): a
 *     read, an import, or a path in a message, any of which breaks when the
 *     file moves.  The name alone (`BroTown.jsx`, as a comment says it) does
 *     not count.
 *   - A converted suite asks ./filesOf.mjs for a system's files instead.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, LINES } from './fourLines.mjs';

export const SUITE_DIRS = ['server/test', 'tools/guards'];

/** The big files: the four lines' files with a line of their own. */
export function bigFiles() {
  return Object.keys(LINES.FILE).sort();
}

/** Today's readers: { 'server/test/x.test.mjs': ['src/ui/BroTown.jsx', ...] } */
export function readersOfBigFiles(root = ROOT) {
  const big = bigFiles();
  const out = Object.create(null);
  for (const d of SUITE_DIRS) {
    let files = [];
    try { files = readdirSync(join(root, d)).filter((f) => f.endsWith('.test.mjs')).sort(); } catch { continue; }
    for (const f of files) {
      const src = readFileSync(join(root, d, f), 'utf8');
      const named = big.filter((b) => src.includes(b.split('/').slice(-2).join('/')));
      if (named.length) out[d + '/' + f] = named;
    }
  }
  return out;
}

/** The census file's text, from a { suite: [big files] } map. */
export function renderKnown(map) {
  const L = [];
  L.push('/* v2.3.5103: THE CENSUS of the suites that name a big file by its path');
  L.push('   (./bigFileSuites.mjs says the rules).  A census: it only falls.  Take a');
  L.push('   suite off by converting it to ./filesOf.mjs, then run');
  L.push('   `node tools/guards/tests-by-system.test.mjs --write`, which only ever');
  L.push('   REMOVES pairs that are gone; it never adds one.  Never add a line by');
  L.push('   hand: a new suite reads code by system. */');
  L.push('export const KNOWN = Object.freeze({');
  for (const s of Object.keys(map).sort()) L.push(`  '${s}': [${map[s].map((b) => `'${b}'`).join(', ')}],`);
  L.push('});');
  L.push('');
  return L.join('\n');
}
