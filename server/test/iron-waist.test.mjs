/* ═══ v2.3.3645: NO TROUSERS AT THE WAIST OF A FULL IRON SET ═══
 *
 * The owner, 2026-10-27: "check all the animations for ghost remnants".  In
 * full iron, jogging north-east or north-west, the trousers showed at the
 * waist (mp-ghostaudit, mp-ironwaist; docs/specs/iron-waist.md):
 *   1. the chain belt meets the greaves: tools/gear/bridge-ne-belt.mjs's own
 *      dry run finds no seam of one or two rows left;
 *   2. the armour bake's fishing-rod restore asks for the fishing pose: pink
 *      trousers and a pink skin pass its colour test, so on any other pose it
 *      put back what the erase had cut;
 *   3. phones fetch the mended belt: GEAR_VERSION is 2.3.3645 or later.
 */
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}
const root = new URL('../../', import.meta.url);

/* ── 1. the belt meets the greaves ── */
{
  const r = spawnSync(process.execPath, [new URL('tools/gear/bridge-ne-belt.mjs', root).pathname], { encoding: 'utf8' });
  check('1a the bridge tool runs (a dry run, nothing written)', r.status === 0, (r.stderr || '').slice(0, 300));
  check('1b ...and finds no seam between the belt and the greaves: "0 px would be written"', /^0 px would be written/m.test(r.stdout || ''), (r.stdout || '').slice(0, 300));
}

/* ── 2. the rod restore is the fishing pose's ── */
{
  const src = readFileSync(new URL('src/rendering/maskedBake.js', root), 'utf8');
  const i = src.indexOf('the fishing rod is baked into the fish-pose body sprite');
  const gate = i < 0 ? null : /if \(([^)]*)\) \{/.exec(src.slice(i));
  check('2a the rod restore is found (its v2.3.1123 comment)', i >= 0);
  check('2b ...and runs only for the fishing pose (poseInfo.pose === \'fish\')', !!gate && /poseInfo\.pose === 'fish'/.test(gate[1]), gate && gate[1]);
}

/* ── 3. the phones fetch it again ── */
{
  const m = /const GEAR_VERSION = '2\.3\.(\d+)'/.exec(readFileSync(new URL('src/rendering/gearSheets.js', root), 'utf8'));
  check('3a GEAR_VERSION is 2.3.3645 or later, so every phone fetches the mended belt', !!m && +m[1] >= 3645, m && m[0]);
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) { console.log(failed + ' FAILURE(S)'); process.exit(1); }
console.log('ALL PASS');
