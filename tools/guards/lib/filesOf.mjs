/* ═══ v2.3.5103: TESTS FIND CODE BY SYSTEM (grand plan step 5.2b, card B PR 4) ═══
 *
 * A suite that reads `src/ui/BroTown.jsx` by its path breaks the day
 * BroTown.jsx is split (step 5.5: the two renderers split along the system
 * map).  A suite that asks for "the files of system ui" and searches them
 * does not.  This is that one helper, for the guards (tools/guards/) and
 * the server's suites (server/test/) alike:
 *
 *   import { filesOf, readSystem, findIn } from '../../tools/guards/lib/filesOf.mjs';
 *   filesOf('economy')                 -> ['server/src/bag.js', ...]  (paths from the root)
 *   readSystem('ui')                   -> Map(path -> source)
 *   findIn('ui', /swallowTapClick\(/)  -> [{ file, line, text }]     (every match, by line)
 *
 * A system's files are the map's (tools/guards/lib/systems.mjs,
 * docs/SYSTEMS.md); `unsorted` is a name too.  An unknown name throws: a
 * typo must never read as "no files, nothing found, green".
 *
 * It reads the working tree from the repository's root, found by this
 * file's own place, so it works from any directory.  It imports nothing
 * outside node: (a suite under server/test/ runs on GitHub with only
 * server/'s packages installed).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SYSTEMS, ROOT, placeFiles } from './systems.mjs';

let _placed = null;
const placed = () => (_placed || (_placed = placeFiles()));

/** The names a suite may ask for: every system's, and `unsorted`. */
export function systemNames() {
  return [...Object.keys(SYSTEMS), 'unsorted'];
}

/** The files of a system, as paths from the repository's root, sorted. */
export function filesOf(system) {
  if (system === 'unsorted') return [...placed().unsorted];
  if (!Object.hasOwn(SYSTEMS, system)) throw new Error(`filesOf: no system "${system}" (have: ${systemNames().join(', ')})`);
  return [...placed().bySystem[system]];
}

/** Every file of a system with its source: Map(path -> text).  `only` keeps
    the files whose path matches it (a RegExp), e.g. /\.jsx?$/. */
export function readSystem(system, { only = null } = {}) {
  const out = new Map();
  for (const f of filesOf(system)) {
    if (only && !only.test(f)) continue;
    out.set(f, readFileSync(join(ROOT, f), 'utf8'));
  }
  return out;
}

/** Every line of a system's files that a pattern matches: [{ file, line, text }]. */
export function findIn(system, pattern, opts) {
  const re = new RegExp(pattern.source, pattern.flags.replace('g', ''));
  const out = [];
  for (const [file, src] of readSystem(system, opts)) {
    const lines = src.split('\n');
    for (let i = 0; i < lines.length; i++) if (re.test(lines[i])) out.push({ file, line: i + 1, text: lines[i] });
  }
  return out;
}
