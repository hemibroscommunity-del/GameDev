/* ═══ v2.3.5248: WHAT THE artCache LINE COUNTS (card P's backlog, tree-tiers) ═══
 *
 * The memory check's `artCache` line reads __btTex (src/rendering/pixiApp.js):
 * the pictures Pixi's asset cache holds in the page.  It counted a picture
 * kept as colour NUMBERS at four bytes a pixel, though its page copy is its
 * numbers, one byte a pixel, which the `buffers` line already counts: the
 * five trees as numbers read 5.6 MB that held nothing (the planning
 * session's yes to mending it, 2026-11-14).  One rule now,
 * src/rendering/cacheBytes.js cacheSourceBytes.  This guard fails:
 *
 *   1. a picture not counted at its size, four bytes a pixel (a canvas at
 *      its own size now);
 *   2. a colour-numbers source (`_btPal`) counted at all;
 *   3. a destroyed source, or one whose page copy was let go of
 *      (`__btReleased`), counted;
 *   4. __btTex counting by a rule of its own: its total and its list call
 *      cacheSourceBytes and multiply no size by four; it hands the page the
 *      same rule (window.__btCacheBytes);
 *   5. the census's page rows (tools/qa/mp/memprobe.mjs) counting by a rule
 *      of their own, not window.__btCacheBytes.
 *
 * BREAK PROOF (rule 8), each tried by hand, 2026-11-14 (and put back):
 *   1. cacheBytes.js: `return w * h * 4` -> `return w * h`                    -> FAIL 1
 *   2. cacheBytes.js: the `if (src._btPal) return 0;` line removed (the double
 *      count back)                                                            -> FAIL 2
 *   3. cacheBytes.js: the `res.__btReleased` test removed                      -> FAIL 3
 *   4. pixiApp.js: `bytes += cacheSourceBytes(src);` -> `bytes += w * h * 4;`  -> FAIL 4
 *   5. memprobe.mjs: its page rows' `bytesOf(s)` -> `(s.width * s.height * 4)` -> FAIL 5
 *
 * The chip's copy of a numbers texture is counted where the chip is
 * (__btGpuTex, one byte a pixel by its format); this guard holds only the
 * page's count.
 *
 * Run from the repository's root: node tools/guards/cache-bytes.test.mjs
 * (cd server && npm test runs it with every other guard and suite).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/fourLines.mjs';
import { cacheSourceBytes } from '../../src/rendering/cacheBytes.js';

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600)));
};

/* sources shaped as Pixi's are: a picture, a canvas, colour numbers */
const picture = (w, h, more = {}) => ({ uid: 1, width: w, height: h, pixelWidth: w, pixelHeight: h, destroyed: false, resource: { src: '/x.png' }, ...more });
const canvas = (w, h, now) => ({ uid: 2, width: w, height: h, pixelWidth: w, pixelHeight: h, destroyed: false, resource: { width: now[0], height: now[1], getContext() { return null; } } });
const numbers = (w, h) => ({ uid: 3, width: w, height: h, pixelWidth: w, pixelHeight: h, destroyed: false, format: 'r8unorm', resource: new Uint8Array(w * h), _btPal: { row: 7, w, h, stride: w } });

/* ── 1. a picture: its size, four bytes a pixel ── */
{
  const got = [cacheSourceBytes(picture(171, 318)), cacheSourceBytes(canvas(512, 512, [512, 512])), cacheSourceBytes(canvas(512, 512, [0, 0]))];
  check('1: a picture counts its size at four bytes a pixel; a canvas its own size now (an emptied one nothing)',
    got[0] === 171 * 318 * 4 && got[1] === 512 * 512 * 4 && got[2] === 0, got);
}

/* ── 2. colour numbers: nothing (they are `buffers`') ── */
{
  const got = cacheSourceBytes(numbers(855, 847));
  check('2: a colour-numbers source counts nothing in artCache (its numbers are the buffers line\'s)', got === 0, got);
}

/* ── 3. gone, or let go of ── */
{
  const got = [cacheSourceBytes(picture(64, 64, { destroyed: true })), cacheSourceBytes(picture(64, 64, { resource: { __btReleased: true } })), cacheSourceBytes(null)];
  check('3: a destroyed source, one let go of, and none count nothing', got.every((n) => n === 0), got);
}

/* ── 4. __btTex counts by the one rule ── */
{
  const src = readFileSync(join(ROOT, 'src/rendering/pixiApp.js'), 'utf8');
  const at = src.indexOf('window.__btTex = function');
  const end = src.indexOf('window.__btGpuTexSources', at);
  const body = at >= 0 && end > at ? src.slice(at, end) : '';
  const calls = (body.match(/cacheSourceBytes\(src\)/g) || []).length;
  const fours = body.split('\n').filter((l) => !/^\s*(\/\*|\*|\/\/)/.test(l) && /\*\s*4\b/.test(l));
  check(`4: __btTex's total and its list count by cacheBytes.js (${calls} calls) and multiply no size by four of their own`,
    !!body && calls >= 2 && fours.length === 0 && /import \{ cacheSourceBytes \} from '\.\/cacheBytes\.js'/.test(src) && /window\.__btCacheBytes = cacheSourceBytes;/.test(src),
    { found: !!body, calls, fours });
}

/* ── 5. the census's page rows read the page's own rule ── */
{
  const src = readFileSync(join(ROOT, 'tools/qa/mp/memprobe.mjs'), 'utf8');
  const at = src.indexOf('the page\'s copies');
  const block = at >= 0 ? src.slice(at, src.indexOf('} catch', at)) : '';
  const fours = block.split('\n').filter((l) => !/^\s*(\/\*|\*|\/\/)/.test(l) && /\*\s*4\b/.test(l));
  check('5: memprobe.mjs\'s page rows count by window.__btCacheBytes, with no rule of their own',
    /window\.__btCacheBytes/.test(block) && /bytesOf\(s\)/.test(block) && fours.length === 0, { found: !!block, fours });
}

console.log(failed ? `\n${failed} FAILED` : '\nall green');
process.exit(failed ? 1 : 0);
