/* ═══ v2.3.5782: EVERY SCREEN HAS ITS NOTES, EVERY ✕ ITS ESC (card U2 PR 3; CLAUDE.md §8 row "a screen or window") ═══
 *
 * CLAUDE.md §8: a screen or window -> `states.mjs` and `UI-DESIGN-NOTES.md`;
 * `data-esc` on its ✕.  The notes half ran only as
 * `capture.mjs --check-notes`, by hand, with a browser; the ✕ half per
 * window, in its own suites.  Nothing held either across the page.
 *
 *   1. every screen tools/qa/ui-review/states.mjs visits is named by a
 *      section of docs/UI-DESIGN-NOTES.md, and no section names a screen
 *      that is gone (notes.mjs notesCoverage, what --check-notes runs; the
 *      states read with no browser: lib/screensListed.mjs).  Strict: none
 *      is bare or stale on main at 2026-11-17;
 *   2. every ✕ under src/ is pressed by Esc (`data-esc`, or
 *      `.bt-inspect-close`: deskKeys.js ESC_SEL), past the census
 *      (lib/closeButtonsKnown.mjs, 18 on 2026-11-17): the total only falls;
 *   3. the readers read: over 100 screens; over 40 ✕, with the ones Esc
 *      presses told from the ones it does not.
 *
 *   node tools/guards/screens-listed.test.mjs --write   lowers the ✕ census, never raises it
 *
 * The `states.mjs` half of the row (a new screen goes in it) is a judgment:
 * this holds what follows once it is there.  The key half is desk-keys'.
 *
 * BREAK PROOF (rule 8), tried by hand 2026-11-17:
 *   docs/UI-DESIGN-NOTES.md: the login door's `Screens:` line without `login-door` -> FAIL 1 (login-door bare)
 *   src/ui/panels/ShopkeeperPanel.jsx: its ✕'s `data-esc=""` taken out           -> FAIL 2 (19 > 18)
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { statesIds, ROOT } from './lib/screensListed.mjs';
import { readNotes, notesCoverage } from '../qa/ui-review/notes.mjs';
import { closeButtons, closeButtonsIn } from './lib/closeButtons.mjs';
import { KNOWN } from './lib/closeButtonsKnown.mjs';

const sum = (o) => Object.values(o).reduce((a, x) => a + x, 0);
const { all, bare } = closeButtons();
const byFile = Object.create(null);
for (const c of bare) byFile[c.file] = (byFile[c.file] || 0) + 1;

if (process.argv.includes('--write')) {
  const kept = Object.create(null);
  for (const [f, n] of Object.entries(KNOWN)) { const m = Math.min(n, byFile[f] || 0); if (m) kept[f] = m; }
  const L = Object.keys(kept).sort().map((f) => `  '${f}': ${kept[f]},`);
  const { readFileSync } = await import('node:fs');
  const path = join(ROOT, 'tools/guards/lib/closeButtonsKnown.mjs');
  const head = readFileSync(path, 'utf8').split('export const KNOWN')[0];
  writeFileSync(path, head + 'export const KNOWN = Object.freeze({\n' + L.join('\n') + '\n});\n');
  console.log(`census: ${sum(KNOWN)} -> ${sum(kept)} (nothing added)`);
  process.exit(0);
}

let failed = 0;
function check(name, ok, detail) {
  if (ok) console.log('ok   ' + name);
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '\n     ' + JSON.stringify(detail).slice(0, 900))); }
}

let ids = [];
try { ids = await statesIds(); } catch (e) { check('1. the UI review\'s screens read', false, String(e && e.message || e)); }
const { topics } = readNotes(ROOT);
const cov = notesCoverage(topics, ids);
check(`1. every screen the UI review visits (${ids.length}) has its section in docs/UI-DESIGN-NOTES.md (${topics.length} sections), and none names a screen that is gone`,
  ids.length > 0 && cov.bare.length === 0 && cov.stale.length === 0, cov);

check(`2. every ✕ (${all.length}) is pressed by Esc (data-esc or .bt-inspect-close), past the census (${bare.length} not, census ${sum(KNOWN)})`,
  bare.length <= sum(KNOWN), bare.length > sum(KNOWN) ? bare.map((c) => `${c.file}:${c.line}`) : undefined);
if (bare.length < sum(KNOWN)) console.log(`     room: ${sum(KNOWN)} -> ${bare.length} (run --write to take it down)`);

const reads = closeButtonsIn('React.createElement("button", { "data-esc": "" }, "\\u2715")')[0]?.esc === true
  && closeButtonsIn('React.createElement("button", { onClick: f }, "✕")')[0]?.esc === false
  && closeButtonsIn('<button className="bt-inspect-close" onClick={f}>{\'×\'}</button>')[0]?.esc === true
  && closeButtonsIn('<button onClick={f}>✕</button>')[0]?.esc === false;
check(`3. the readers read (${ids.length} screens, ${all.length} ✕) and tell a ✕ Esc presses from one it does not`, ids.length > 100 && all.length > 40 && reads);

console.log(failed ? `\n${failed} check(s) failed` : '\nall checks pass');
process.exit(failed ? 1 : 0);
