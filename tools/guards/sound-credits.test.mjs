/* ═══ v2.3.5782: EVERY RECORDING HAS ITS CREDITS ROW (card U2 PR 3; CLAUDE.md §8 row "a sound") ═══
 *
 * CLAUDE.md §8: a sound -> its Sound Studio label (sound-cues §12 holds it)
 * and its CREDITS.md row.  The row was held only for the recordings
 * sound-cues lists.  This holds it for every audio file under public/
 * (tools/guards/lib/soundCredits.mjs says what covers one):
 *
 *   1. every recording has a CREDITS.md row, or is on the list
 *      (lib/soundCreditsKnown.mjs: the owner's own, each with why; one on
 *      2026-11-17, wind-dunes.mp3, found with no row).  A census: the list only falls;
 *   2. the list names no file that is gone or that has its row now;
 *   3. the reader read: over 100 recordings, and a file named by path, by
 *      name in its folder's row, and by none, each read so.
 *
 * Whether a row's licence is CC0 or CC BY (NonCommercial is out) is the
 * row's words: a judgment, not a scan.
 *
 * BREAK PROOF (rule 8), tried by hand 2026-11-17:
 *   CREDITS.md: the music row's `village` taken out (both places)      -> FAIL 1 (public/audio/music/village.mp3)
 *   a copy of public/audio/wood-chop.mp3 as public/audio/wood-chop-2.mp3   -> FAIL 1
 */
import { soundCredits, coveredBy } from './lib/soundCredits.mjs';
import { KNOWN } from './lib/soundCreditsKnown.mjs';

let failed = 0;
function check(name, ok, detail) {
  if (ok) console.log('ok   ' + name);
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '\n     ' + JSON.stringify(detail).slice(0, 900))); }
}

const { all, uncredited, how } = soundCredits();
const unlisted = uncredited.filter((f) => !Object.hasOwn(KNOWN, f));
check(`1. every recording under public/ (${all.length}: ${how.path} by path, ${how.named} by name in its folder's row, ${how.folder} by a whole folder) has its CREDITS.md row, or is listed with why (${Object.keys(KNOWN).length})`,
  unlisted.length === 0, unlisted);
const stale = Object.keys(KNOWN).filter((f) => !all.includes(f) || !uncredited.includes(f));
check('2. the list names no file that is gone or has its row now', stale.length === 0, stale);
const rows = [['`public/audio/music/` (`village`, `forest`)'], ['`public/sfx/ui/chime.mp3`']].map((r) => [...r[0].matchAll(/`([^`]+)`/g)].map((m) => m[1]));
const reads = coveredBy('public/audio/music/village.mp3', rows) === 'named' && coveredBy('public/sfx/ui/chime.mp3', rows) === 'path'
  && coveredBy('public/audio/music/rock.mp3', rows) === null;
check(`3. the reader read (${all.length} recordings) and tells a credited file from one with no row`, all.length > 100 && reads);

console.log(failed ? `\n${failed} check(s) failed` : '\nall checks pass');
process.exit(failed ? 1 : 0);
