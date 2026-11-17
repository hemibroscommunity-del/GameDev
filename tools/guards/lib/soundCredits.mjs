/* ═══ v2.3.5782: EVERY RECORDING THE GAME SHIPS HAS ITS CREDITS ROW (card U2 PR 3; CLAUDE.md §8 row "a sound") ═══
 *
 * CLAUDE.md §7 (Sound): "a recording's licence goes in CREDITS.md (CC0 or
 * CC BY; NonCommercial is out)".  A recording the game ships is an audio
 * file under public/.  A row of a CREDITS.md table covers it when one of the
 * row's `code` spans is
 *   - its path (`public/sfx/ui/chime.mp3`);
 *   - its folder (`public/audio/music/`) or a pattern over it
 *     (`public/audio/*.mp3`), with its name in the same row (`village`,
 *     `chime.mp3`): the rows that list a folder's files by name;
 *   - a folder over it, as a whole (`public/sfx/`): the row claims every
 *     file in it.  The Pixabay row does that for public/sfx/ today, so a new
 *     file there is covered by it: whether that row is still true of a new
 *     file is the PR's to say (the row's words), not a scan's.
 * Node only (the guards run on GitHub with server/'s packages).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..');
export const AUDIO = /\.(mp3|ogg|wav|m4a|opus|aac|flac)$/i;

/** Every audio file under public/, as paths from the root, sorted. */
export function shippedRecordings(root = ROOT) {
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(join(root, dir), { withFileTypes: true })) {
      const rel = dir + '/' + e.name;
      if (e.isDirectory()) walk(rel);
      else if (AUDIO.test(e.name)) out.push(rel);
    }
  };
  walk('public');
  return out.sort();
}

/** CREDITS.md's table rows, each as its `code` spans. */
export function creditRows(text) {
  return String(text).split('\n').filter((l) => l.startsWith('|'))
    .map((l) => [...l.matchAll(/`([^`]+)`/g)].map((m) => m[1].trim()));
}

const globRe = (g) => new RegExp('^' + g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*') + '$');

/** How a row covers a file: 'path', 'named', 'folder', or null. */
export function coveredBy(file, rows) {
  const dir = file.slice(0, file.lastIndexOf('/') + 1);
  const name = file.slice(dir.length), base = name.replace(/\.[^.]+$/, '');
  let how = null;
  for (const toks of rows) {
    if (toks.includes(file)) return 'path';
    const overDir = toks.some((t) => t === dir || t === dir.slice(0, -1) || (t.includes('*') && globRe(t).test(file)));
    if (overDir && toks.some((t) => t === base || t === name)) return 'named';
    if (!how && toks.some((t) => t.endsWith('/') && t.startsWith('public/') && file.startsWith(t) && t !== dir)) how = 'folder';
    if (!how && toks.some((t) => t === dir) && !toks.some((t) => /^[a-z0-9-]+(\.mp3)?$/.test(t))) how = 'folder';
  }
  return how;
}

/** { all, uncredited: [file], how: { path, named, folder } } */
export function soundCredits(root = ROOT) {
  const rows = creditRows(readFileSync(join(root, 'CREDITS.md'), 'utf8'));
  const all = shippedRecordings(root);
  const how = { path: 0, named: 0, folder: 0 };
  const uncredited = [];
  for (const f of all) { const h = coveredBy(f, rows); if (h) how[h]++; else uncredited.push(f); }
  return { all, uncredited, how };
}
