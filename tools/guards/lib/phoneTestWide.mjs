/* ═══ v2.3.5781: A PHONE TEST SAYS WHICH SCREEN IT PLAYS (card U2 PR 2; CLAUDE.md §8 row "a phone test") ═══
 *
 * CLAUDE.md §6: "a new computer test passes `wide: true` (a computer plays
 * the whole window, the band at the bottom)".  A newPlayer with neither
 * `touch` nor `wide` plays the OLD upright column on a computer (the
 * harness adds `narrow`, tools/qa/mp/harness.mjs v2.3.3687): a layout no
 * player gets.  Nothing held it.
 *
 * THE RULE: every `newPlayer(...)` / `joinPair(...)` call in
 * tools/qa/mp/mp-*.mjs names `touch` or `wide` in its own argument text
 * (`touch: true`, `wide: true`, or the shorthand; `touch: false`, `null` or
 * `0` do not count).  A call whose options come in a spread or a variable
 * cannot be read, so it is listed like one that names neither.  joinPair
 * takes neither today (harness.mjs), so every joinPair is listed: the day it
 * takes them, those calls come off.
 *
 * The calls read are oldMap.mjs playerCalls's (the old-map check's own
 * reader).  A census (the plan's rule 3): ./phoneTestWideKnown.mjs lists,
 * per file, how many calls named neither on 2026-11-17; a file's count only
 * falls.  `node tools/guards/phone-test-wide.test.mjs --write` lowers it
 * and never raises one.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { playerCalls } from '../../qa/mp/oldMap.mjs';

export const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..');
export const MP_DIR = 'tools/qa/mp';

/** `touch` or `wide` named in a call's argument text, and not as false. */
export function namesScreen(argText) {
  return ['touch', 'wide'].some((k) => new RegExp(`\\b${k}\\s*(?:[,}\\n]|:(?!\\s*(?:false|null|0|undefined)\\b))`).test(argText));
}

/** Today's calls that name neither, per file: { 'mp-x.mjs': n } (files with none left out). */
export function screenlessCalls(root = ROOT) {
  const out = Object.create(null);
  let calls = 0, files = 0;
  for (const f of readdirSync(join(root, MP_DIR)).filter((n) => /^mp-.+\.mjs$/.test(n)).sort()) {
    files++;
    const c = playerCalls(readFileSync(join(root, MP_DIR, f), 'utf8'));
    calls += c.length;
    const n = c.filter((a) => !namesScreen(a)).length;
    if (n) out[f] = n;
  }
  return { byFile: out, calls, files };
}

/** ./phoneTestWideKnown.mjs's text. */
export function renderKnown(map) {
  const L = [];
  L.push('/* v2.3.5781: THE CENSUS of the phone tests\' newPlayer / joinPair calls that');
  L.push('   name neither `touch` nor `wide` (./phoneTestWide.mjs says the rule), per');
  L.push('   file.  A census: a count only falls.  Name the screen in the call, then run');
  L.push('   `node tools/guards/phone-test-wide.test.mjs --write`, which only LOWERS a');
  L.push('   count; it never adds a file or raises one.  Never add a line by hand: a');
  L.push('   new test names its screen. */');
  L.push('export const KNOWN = Object.freeze({');
  for (const f of Object.keys(map).sort()) L.push(`  '${f}': ${map[f]},`);
  L.push('});');
  L.push('');
  return L.join('\n');
}
