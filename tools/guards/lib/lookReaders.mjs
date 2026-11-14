/* ═══ v2.3.5325: WHO READS A TEXTURE'S `.frame`, AND WHO CALLS getBounds() (card V PR 6) ═══
 *
 * TRAPS §106: a cropped texture's `frame` is the crop, not the frame (size
 * from `tex.orig`, copy through gearSheets.drawGearFrame, cut through
 * gearSheets.subTexture).  TRAPS §119: a cropped sprite's getBounds() is its
 * art, not its frame (size from gearSheets.frameBounds).  Both are closed
 * lists here: a new reader fails until it is listed, after its author has
 * read the trap.  Counted in the CODE (comments dropped: ./codeOnly.mjs) of
 * every file under src/rendering/, keyed by the file's NAME alone (a suite
 * never names a big file by its folder: card B's tests-by-system):
 *
 *   §106  `.frame.x/.y/.width/.height`, `<a texture>.frame` read whole
 *         (`tex.frame`, `texture.frame`, `bodyTex.frame`...), never a write,
 *         and `const { frame } = ...` (a rename must not dodge it)
 *   §119  `.getBounds(`
 *
 * The census is ./lookReadersKnown.mjs (rule 3: a file's count only falls;
 * `node tools/guards/traps-look-tables.test.mjs --write` lowers it and never
 * raises or adds a line; a new reader's author adds its line by hand, the
 * act of listing it).
 */
import { codeOf } from './codeOnly.mjs';

const FRAME = /\.frame\.(?:x|y|width|height)(?![\w$])|(?:[Tt]ex(?:ture)?|[\w$]*Tex|texture)\.frame(?![\w$.])(?!=[^=])|\{(?:[\w$]+(?::[\w$]+)?,)*frame(?::[\w$]+)?(?:,[\w$]+(?::[\w$]+)?)*\}=(?!=)/g;
const BOUNDS = /\.getBounds\(/g;

/** { frame: { name: n }, bounds: { name: n } } for src/rendering/'s code. */
export function lookReaders(code = null) {
  const out = { frame: Object.create(null), bounds: Object.create(null) };
  for (const [f, c] of code || codeOf(['src/rendering'])) {
    if (!f.startsWith('src/rendering/')) continue;
    const name = f.slice(f.lastIndexOf('/') + 1);
    const a = (c.match(FRAME) || []).length, b = (c.match(BOUNDS) || []).length;
    if (a) out.frame[name] = (out.frame[name] || 0) + a;
    if (b) out.bounds[name] = (out.bounds[name] || 0) + b;
  }
  return out;
}

export function renderKnown(k) {
  const L = ['/* v2.3.5325: THE CENSUS of the readers of a texture\'s `.frame` (TRAPS §106) and',
    '   of getBounds() (TRAPS §119) in src/rendering/, by file name (./lookReaders.mjs',
    '   says the rules).  Each count only falls; `--write` lowers it.  A new reader:',
    '   read the trap, then add its line by hand. */'];
  for (const key of ['frame', 'bounds']) {
    L.push(`export const KNOWN_${key.toUpperCase()} = Object.freeze({`);
    for (const n of Object.keys(k[key]).sort()) L.push(`  '${n}': ${k[key][n]},`);
    L.push('});');
  }
  L.push('');
  return L.join('\n');
}
