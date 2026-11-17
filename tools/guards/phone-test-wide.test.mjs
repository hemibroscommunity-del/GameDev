/* ═══ v2.3.5781: EVERY PHONE TEST NAMES ITS SCREEN: TOUCH OR WIDE (card U2 PR 2; CLAUDE.md §8 row "a phone test") ═══
 *
 * CLAUDE.md §6 and §8: a phone test passes `world: 'wheel'` (held by
 * precheck `old-map` and the harness) "and `wide: true` on a computer".  The
 * second half was held by nothing: a call with neither `touch` nor `wide`
 * plays the old upright column on a computer, a layout no player gets.
 * tools/guards/lib/phoneTestWide.mjs says the rule.  A census (the plan's
 * rule 3), on tools/guards/lib/phoneTestWideKnown.mjs:
 *
 *   1. no file has more calls naming neither than the census lists (a new
 *      file with one fails, naming the file);
 *   2. the census lists no file whose count fell or went (printed as room:
 *      `--write` takes it down; never a failure);
 *   3. the reader read the tests (over 300 files, over 400 calls), and
 *      tells a call that names the screen from one that does not.
 *
 *   node tools/guards/phone-test-wide.test.mjs --write   lowers the census, never raises it
 *
 * BREAK PROOF (rule 8), tried by hand 2026-11-17:
 *   tools/qa/mp/mp-deskwide.mjs: its newPlayer's `wide: true` taken out   -> FAIL 1 (naming mp-deskwide.mjs)
 *   ...the same as `wide: false`                                          -> FAIL 1
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, screenlessCalls, namesScreen, renderKnown } from './lib/phoneTestWide.mjs';
import { KNOWN } from './lib/phoneTestWideKnown.mjs';

const now = screenlessCalls();

if (process.argv.includes('--write')) {
  const kept = Object.create(null);
  for (const [f, n] of Object.entries(KNOWN)) {
    const m = Math.min(n, now.byFile[f] || 0);
    if (m) kept[f] = m;
  }
  writeFileSync(join(ROOT, 'tools/guards/lib/phoneTestWideKnown.mjs'), renderKnown(kept));
  const sum = (o) => Object.values(o).reduce((a, x) => a + x, 0);
  console.log(`census: ${sum(KNOWN)} -> ${sum(kept)} calls (nothing raised)`);
  process.exit(0);
}

let failed = 0;
function check(name, ok, detail) {
  if (ok) console.log('ok   ' + name);
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '\n     ' + JSON.stringify(detail).slice(0, 900))); }
}
const sum = (o) => Object.values(o).reduce((a, x) => a + x, 0);

const over = Object.entries(now.byFile).filter(([f, n]) => n > (KNOWN[f] || 0)).map(([f, n]) => `tools/qa/mp/${f}: ${n} call(s) name neither touch nor wide (census ${KNOWN[f] || 0})`);
check(`1. every newPlayer / joinPair names its screen (\`touch\` or \`wide: true\`), past the census (${sum(now.byFile)} of ${now.calls} calls listed, census ${sum(KNOWN)})`,
  over.length === 0, over);

const room = Object.entries(KNOWN).filter(([f, n]) => (now.byFile[f] || 0) < n).map(([f, n]) => `${f}: ${n} -> ${now.byFile[f] || 0}`);
console.log(room.length ? `     room: ${room.join(', ')} (run --write to take it down)` : '     room: none');
check('2. (the census only falls: room is printed, never a failure)', true);

const reads = namesScreen("browser, { name, wide: true }") && namesScreen("browser, { touch, name }") && namesScreen('browser, {\n  touch\n}')
  && !namesScreen("browser, { wide: false }") && !namesScreen("browser, { name: 'Widest', world: 'wheel' }") && !namesScreen('browser, { ...opts }');
check(`3. the reader read the tests (${now.files} files, ${now.calls} calls) and tells a named screen from none`, now.files > 300 && now.calls > 400 && reads);

console.log(failed ? `\n${failed} check(s) failed` : '\nall checks pass');
process.exit(failed ? 1 : 0);
