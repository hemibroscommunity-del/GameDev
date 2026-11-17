/* ═══ v2.3.5782: WHAT THE DRAWING LOADS IS REACHED FROM THE LOADING SCREEN (card U2 PR 3; CLAUDE.md §8 row "an animation or sprite") ═══
 *
 * CLAUDE.md §8: an animation or sprite -> its loader in
 * preloadWorldAnimations (per zone: preloadZoneAssets, freed on exit).
 * Nothing held it: a new first-use load passed every test.  A census (the
 * plan's rule 3; tools/guards/lib/preloadCensus.mjs says the reading):
 *
 *   1. the drawing's loads the name graph does not reach from
 *      preloadWorldAnimations, preloadZoneAssets or wheelMonsterArt.js are
 *      no more than the census's total (lib/preloadCensusKnown.mjs: 31 of 87
 *      on 2026-11-17, each file with why);
 *   2. the census's counts add up to its total, and each file says why;
 *   3. the graph found both roots and read the drawing (over 50 loads).
 *
 * The other half of the row (a body pose through mp-ghostaudit) is a phone
 * scenario, run by hand.
 *
 *   node tools/guards/preload-census.test.mjs --write   lowers the census, never raises it
 *
 * BREAK PROOF (rule 8), tried by hand 2026-11-17:
 *   preloadAnimations.js: `traits: preloadTraits(),` as `traits: null,` (the
 *   trait art no longer on the loading screen)                    -> FAIL 1 (34 > 31)
 *   ...`npcArt: loadNpcSprites(),` as `npcArt: null,`             -> FAIL 1 (32 > 31)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/fourLines.mjs';
import { preloadCensus } from './lib/preloadCensus.mjs';
import { KNOWN } from './lib/preloadCensusKnown.mjs';

const total = Object.values(KNOWN).reduce((a, [n]) => a + n, 0);
const { loads, bare, roots } = preloadCensus();
const byFile = Object.create(null);
for (const l of bare) byFile[l.file] = (byFile[l.file] || 0) + 1;

if (process.argv.includes('--write')) {
  const path = join(ROOT, 'tools/guards/lib/preloadCensusKnown.mjs');
  let text = readFileSync(path, 'utf8');
  let after = 0;
  for (const [f, [n]] of Object.entries(KNOWN)) {
    const m = Math.min(n, byFile[f] || 0);
    after += m;
    const esc = f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    text = m ? text.replace(new RegExp(`('${esc}': \\[)${n},`), `$1${m},`) : text.replace(new RegExp(`\\n  '${esc}': \\[.*\\],`), '');
  }
  writeFileSync(path, text);
  console.log(`census: ${total} -> ${after} (nothing added)`);
  process.exit(0);
}

let failed = 0;
function check(name, ok, detail) {
  if (ok) console.log('ok   ' + name);
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '\n     ' + JSON.stringify(detail).slice(0, 900))); }
}

const over = Object.entries(byFile).filter(([f, n]) => n > ((KNOWN[f] || [0])[0])).map(([f, n]) => `${f}: ${n} not reached (census ${(KNOWN[f] || [0])[0]})`);
check(`1. the drawing's loads (${loads.length}) are reached from the loading screen, a zone's overlay or wheelMonsterArt.js, past the census (${bare.length} not, census ${total})`,
  bare.length <= total, bare.length > total ? over : undefined);
if (bare.length < total) console.log(`     room: ${total} -> ${bare.length} (run --write to take it down)`);
const noWhy = Object.entries(KNOWN).filter(([, [n, why]]) => !(n > 0) || !(typeof why === 'string' && why.length > 8)).map(([f]) => f);
check('2. each file on the census has its count and says why', noWhy.length === 0, noWhy);
check(`3. the graph found both roots (${roots.join(', ')}) and read the drawing (over 50 loads)`, roots.length === 2 && loads.length > 50);

console.log(failed ? `\n${failed} check(s) failed` : '\nall checks pass');
process.exit(failed ? 1 : 0);
