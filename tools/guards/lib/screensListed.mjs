/* ═══ v2.3.5782: THE SCREENS THE UI REVIEW VISITS, READ WITHOUT A BROWSER (card U2 PR 3; CLAUDE.md §8 row "a screen or window") ═══
 *
 * tools/qa/ui-review/states.mjs lists the screens the UI review visits; its
 * one import is the phone harness, which needs Playwright (not on GitHub's
 * `test` job: server/'s packages only).  The states' ids, titles and order
 * are plain data, and only their `run` reads the harness, so this loads the
 * file with that one import replaced by a stand-in that throws if called,
 * from a data: URL: STATES exactly as capture.mjs gets them, no run() run.
 *
 * statesIds() throws when the import line is not there as written: a moved
 * or renamed import must fail the guard, never read as "no screens".
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', '..');
export const STATES_PATH = 'tools/qa/ui-review/states.mjs';
const HARNESS_IMPORT = "import * as H from '../mp/harness.mjs';";
const STAND_IN = "const H = new Proxy({}, { get: () => () => { throw new Error('screensListed: no harness here'); } });";

export async function statesIds(root = ROOT) {
  const src = readFileSync(join(root, STATES_PATH), 'utf8');
  if (!src.includes(HARNESS_IMPORT)) throw new Error(`${STATES_PATH}: its harness import is not \`${HARNESS_IMPORT}\` any more: teach tools/guards/lib/screensListed.mjs the new one`);
  const rest = src.replace(HARNESS_IMPORT, STAND_IN);
  if (/^\s*import\s/m.test(rest)) throw new Error(`${STATES_PATH} imports more than the harness now: teach tools/guards/lib/screensListed.mjs`);
  const mod = await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(rest));
  return mod.STATES.map((s) => s.id);
}
