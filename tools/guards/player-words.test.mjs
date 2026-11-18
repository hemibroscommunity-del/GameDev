/* ═══ v2.3.6141: THE WORDS WRITTEN IN PLACE ONLY FALL (GRAND-PLAN 8.8 part 2; card WD PR 2) ═══
 *
 * tools/dev/words-census.mjs counts every string a player can read (its page:
 * docs/plan/census/words.md).  The plan's rule 3: a table lands as a census,
 * and its count of unlisted things may only fall.  Here the unlisted things
 * are the words written IN PLACE (not in a table: `src/data/*`, `deskWords()`)
 * until a later card moves them into the one table (docs/specs/player-words.md).
 * This guard holds:
 *
 *   1. the words written in place on the page are no more than PAGE_LINE;
 *   2. the words written in place on the worker are no more than SERVER_LINE;
 *   3. a player-facing "Wheel" (a capital W: the world's code name) or
 *      "remnant(s)" fails ALWAYS, the rows the census found aside (KNOWN,
 *      matched by their words, never by line or by a big file's path
 *      (tests-by-system), so an edit above them does
 *      not trip it).  CLAUDE.md §1: players read "BroTown", "the world",
 *      "Remains";
 *   4. its own break proof, played every run: a scratch file with a new
 *      in-place word, and one with "Wheel" and "remnants", must fail 1 and 3.
 *
 * Only the gatekeeper lowers the lines (rule 3: it alone makes a census
 * strict).  A count over its line names the one command to re-run.
 *
 * BREAK PROOF (rule 8), tried by hand on scratch edits, 2026-11-18:
 *   1. src/ui/panels/ClanInviteCard.jsx:55: `<span>Say hello</span>` before
 *      its `<button`                                               -> FAIL 1
 *   2. the same line: `title="Back to the Wheel"` on the button    -> FAIL 1, 3
 *   3. server/src/shop.js:719: `message: 'Come back with more coins'`
 *      beside its `error:`                                         -> FAIL 2
 *   (and check 4 plays 1 and 2 on a scratch file every run.)
 *
 * Run from the repository's root: node tools/guards/player-words.test.mjs
 * (cd server && npm test runs it with every other guard and suite).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { census, ROOT } from '../dev/words-census.mjs';

/* The census's counts on main 891b850c, 2026-11-18 09:20 UTC (card WD PR 1, #2171; re-landed after CS #2152 and RV #2164, as gatekeeper sitting 46 asked). */
export const PAGE_LINE = 2987;   /* v2.3.6351: card WD3 moved AchievementsPanel, StatsPanel, JourneyPanel, T2Panel, SelfPanel's words into src/data/say (was 3050) */
export const SERVER_LINE = 385;

/* The "Wheel" / "remnant" rows the census found: `node tools/dev/words-census.mjs --lines`. */
export const KNOWN = [
  { value: "the Wheel's ground gone, " },   // the game page's dark-screen watchdog, its crash note (`?`: most likely never shown)
];

const RERUN = 'node tools/dev/words-census.mjs --write (the page\'s diff names each new row)';

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + detail));
};

/** The guard's verdict on a census: [check number, ok, words][]. */
export function verdict(c, lines = { page: PAGE_LINE, server: SERVER_LINE }) {
  const t = c.totals;
  const PL = lines.page, SL = lines.server;
  const known = (r) => KNOWN.some((k) => k.value === r.value);
  const bad = c.rows.filter((r) => (r.wheel || r.remnant) && !known(r));
  return [
    [1, t.place <= PL, 'words written in place on the page: ' + t.place + ' (line ' + PL + ')'
      + (t.place > PL ? '. A new word a player reads goes in a table (docs/specs/player-words.md); re-run: ' + RERUN : '')],
    [2, t.server <= SL, 'words written in place on the worker: ' + t.server + ' (line ' + SL + ')'
      + (t.server > SL ? '. Re-run: ' + RERUN : '')],
    [3, bad.length === 0, bad.length
      ? 'a player reads "Wheel"/"remnant" (CLAUDE.md §1: "BroTown", "the world", "Remains"): '
        + bad.map((r) => r.file + ':' + r.line + ' ' + JSON.stringify(r.value)).join('; ') + '. Re-run: ' + RERUN
      : 'no new player-facing "Wheel" or "remnant" (' + KNOWN.length + ' known)'],
  ];
}

const c = census();
for (const [n, ok, words] of verdict(c)) check(n + '. ' + words, ok);

/* 4. The break proof, every run: a scratch file beside the real ones, judged
 * against lines set to today's counts (so it fails even when main has fallen
 * below the lines). */
{
  const scratch = 'src/ui/panels/ScratchProof.jsx';
  const body = 'export default function P(){ return <div title="Back to the Wheel"><span>Say hello</span>{toast(\'Collect the remnants\')}</div>; }\n';
  const c2 = census({
    clientFiles: c.clientFiles.concat([scratch]),
    read: (f) => (f === scratch ? body : readFileSync(join(ROOT, f), 'utf8')),
  });
  const v = verdict(c2, { page: c.totals.place, server: c.totals.server });
  const grew = c2.totals.place - c.totals.place;
  check('4. the break proof: a scratch file with 3 new words in place fails 1 and 3 (' + grew + ' more)',
    grew === 3 && !v[0][1] && v[1][1] && !v[2][1], JSON.stringify(v.map((x) => [x[0], x[1]])));
}

process.exit(failed ? 1 : 0);
