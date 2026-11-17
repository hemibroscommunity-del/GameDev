/* ═══ v2.3.5782: A PICTURE MADE ON A CANVAS GOES THROUGH THE MEMORY LAW (card U2 PR 3; CLAUDE.md §8 row "a picture made on a canvas") ═══
 *
 * CLAUDE.md §8: a picture made on a canvas -> `keepOnGpuOnly`, `keepAsImage`
 * or colour numbers (the memory law).  gpu-only and keep-as-image hold the
 * helpers themselves; nothing held their callers.  A census (the plan's
 * rule 3; tools/guards/lib/canvasPictures.mjs says the reading):
 *
 *   1. the textures made from a canvas under src/ that name no helper near
 *      them are no more than the census's total
 *      (lib/canvasPicturesKnown.mjs: 50 of 70 on 2026-11-17);
 *   2. the reader read: over 50 sites, and tells one that goes through a
 *      helper from one that does not, and a file's texture from a canvas's.
 *
 *   node tools/guards/canvas-pictures.test.mjs --write   lowers the census, never raises it
 *
 * BREAK PROOF (rule 8), tried by hand 2026-11-17:
 *   src/rendering/traits/hairColorCatalog.js: its `keepAsImage(t.source, Cache)`
 *   call taken out (a canvas texture with no helper near it)              -> FAIL 1 (51 > 50)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/fourLines.mjs';
import { canvasPictures, sitesIn } from './lib/canvasPictures.mjs';
import { KNOWN } from './lib/canvasPicturesKnown.mjs';

const sum = (o) => Object.values(o).reduce((a, x) => a + x, 0);
const { all, bare } = canvasPictures();
const byFile = Object.create(null);
for (const s of bare) byFile[s.file] = (byFile[s.file] || 0) + 1;

if (process.argv.includes('--write')) {
  const kept = Object.create(null);
  for (const [f, n] of Object.entries(KNOWN)) { const m = Math.min(n, byFile[f] || 0); if (m) kept[f] = m; }
  const path = join(ROOT, 'tools/guards/lib/canvasPicturesKnown.mjs');
  const head = readFileSync(path, 'utf8').split('export const KNOWN')[0];
  writeFileSync(path, head + 'export const KNOWN = Object.freeze({\n' + Object.keys(kept).sort().map((f) => `  '${f}': ${kept[f]},`).join('\n') + '\n});\n');
  console.log(`census: ${sum(KNOWN)} -> ${sum(kept)} (nothing added)`);
  process.exit(0);
}

let failed = 0;
function check(name, ok, detail) {
  if (ok) console.log('ok   ' + name);
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '\n     ' + JSON.stringify(detail).slice(0, 900))); }
}

const over = Object.entries(byFile).filter(([f, n]) => n > (KNOWN[f] || 0)).map(([f, n]) => `${f}: ${n} (census ${KNOWN[f] || 0})`);
check(`1. every texture made from a canvas (${all.length}) goes through the memory law's helpers, past the census (${bare.length} do not, census ${sum(KNOWN)})`,
  bare.length <= sum(KNOWN), bare.length > sum(KNOWN) ? over : undefined);
if (bare.length < sum(KNOWN)) console.log(`     room: ${sum(KNOWN)} -> ${bare.length} (run --write to take it down)`);

const a = sitesIn('const t=Texture.from(cv);keepOnGpuOnly(r,t.source);');
const b = sitesIn('const t=Texture.from(cv);');
const c = sitesIn('const t=Texture.from(img);const u=Texture.from("/a.png");const v=new Texture({source:new CanvasSource({resource:c})});');
check(`2. the reader read (${all.length} sites) and tells a site through a helper, one not, and a file's texture`,
  all.length > 50 && a.length === 1 && a[0].through && b.length === 1 && !b[0].through && c.length === 1 && !c[0].through);

console.log(failed ? `\n${failed} check(s) failed` : '\nall checks pass');
process.exit(failed ? 1 : 0);
