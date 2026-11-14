/* ═══ v2.3.5107: PINS (grand plan step 5.9; card B PR 8) ═══
 *
 * The game patches PixiJS's inside in 29 places (tools/guards/lib/
 * pixiPatches.mjs), each written against one version of Pixi's private
 * methods.  A caret range (`^8.6.6`) let any 8.x in on an install, and a new
 * minor version can change the inside without a word.  So:
 *
 *   1. PixiJS is pinned at an exact version in package.json, the one the
 *      lockfile holds, and the lockfile's own copy of package.json says the
 *      same (npm ci refuses a lockfile that disagrees);
 *   2. every patch the finder sees in src/ is a row of PIXI_PATCHES, or of
 *      NOT_PIXI (with why it is not Pixi's): a NEW patch fails until it is
 *      written in the table;
 *   3. every row's patch is still there (a gone patch's row comes off), as
 *      many times as it has rows.
 *
 * Moving Pixi to a new version is a change of its own: the version here and
 * in the lockfile, and every patch in the table read against the new inside.
 *
 * BREAK PROOF (rule 8), each tried by hand, 2026-11-14:
 *   1. package.json `"pixi.js": "^8.17.1"`                               -> FAIL 1
 *   2. `GlTextureSystem.prototype.bind = function () {}` in a src/rendering file -> FAIL 2
 *   3. delete pixiApp.js's TextureSource.prototype.destroy patch          -> FAIL 3
 *
 * Run from the repository's root: node tools/guards/pixi-pins.test.mjs
 * (cd server && npm test runs it with every other guard and suite).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/fourLines.mjs';
import { codeOf } from './lib/codeOnly.mjs';
import { PIXI_PATCHES, NOT_PIXI, patchesIn, keyCovers } from './lib/pixiPatches.mjs';

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 900)));
};

/* ── 1. the pin ── */
{
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const lock = JSON.parse(readFileSync(join(ROOT, 'package-lock.json'), 'utf8'));
  const want = pkg.dependencies && pkg.dependencies['pixi.js'];
  const locked = lock.packages && lock.packages['node_modules/pixi.js'] && lock.packages['node_modules/pixi.js'].version;
  const lockRoot = lock.packages && lock.packages[''] && lock.packages[''].dependencies && lock.packages[''].dependencies['pixi.js'];
  check(`1: package.json pins PixiJS at an exact version (${want})`, /^\d+\.\d+\.\d+$/.test(String(want)), want);
  check(`1: ...the version the lockfile holds (${locked})`, want === locked, { packageJson: want, lockfile: locked });
  check('1: ...and the lockfile\'s copy of package.json says the same', lockRoot === want, { lockRoot });
}

/* ── 2 and 3. the patches, against the table ── */
{
  const code = codeOf(['src']);
  const found = [];   /* { file, key } */
  for (const [file, c] of code) for (const key of patchesIn(c)) found.push({ file, key });
  const rows = [...PIXI_PATCHES.map((r) => ({ ...r, pixi: true })), ...NOT_PIXI];
  /* a wildcard row covers any number; an exact row covers one patch each */
  const left = new Map();   /* row index -> patches still to meet */
  rows.forEach((r, i) => left.set(i, 1));
  const unlisted = [];
  for (const f of found) {
    let i = rows.findIndex((r, k) => r.file === f.file && !r.key.includes('*') && keyCovers(r.key, f.key) && left.get(k) > 0);
    if (i >= 0) { left.set(i, 0); continue; }
    i = rows.findIndex((r) => r.file === f.file && r.key.includes('*') && keyCovers(r.key, f.key));
    if (i >= 0) { left.set(i, 0); continue; }
    unlisted.push(`${f.file}: ${f.key}`);
  }
  check(`2: every patch of an object not the game's own is in the table (${found.length} found; ${PIXI_PATCHES.length} Pixi's, the rest not Pixi's)`
    + ': write a new one in tools/guards/lib/pixiPatches.mjs', unlisted.length === 0, unlisted);
  const gone = rows.filter((r, i) => left.get(i) > 0).map((r) => `${r.file}: ${r.key}`);
  check('3: every row\'s patch is still in its file (a gone one\'s row comes off)', gone.length === 0, gone);
}

/* ── 4. the finder reads as pinned ── */
{
  const keys = patchesIn('X.prototype.m=function(){};P.a=async function(){};o.b=(x)=>x;q.c=y=>y;this.d=function(){};window.e=()=>1;img.onload=function(){};S.f=()=>1;Object.defineProperty(proto,"style",{});if(a.g==function(){}){}');
  check('4: the finder takes a patch and leaves the game\'s own, a DOM handler and a comparison',
    JSON.stringify(keys) === JSON.stringify(['X.prototype.m', 'P.a', 'o.b', 'q.c', 'Object.defineProperty(proto,style)']), keys);
}

console.log(failed ? `\n${failed} FAILED` : '\nall green');
process.exit(failed ? 1 : 0);
