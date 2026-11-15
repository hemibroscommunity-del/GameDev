/* ═══ v2.3.5234: THE SELF-TEST AT THE DOOR (card O PR 14a; src/rendering/selfTest.js) ═══
 *
 * Each of the game's own drawing programs draws a known 16 x 16 picture where
 * it is warmed, behind the loading screen; the picture is copied behind a
 * fence and judged at the top of a later frame against the CPU's answer; a
 * program that drew it wrong falls back alone.  Held here (the phone half is
 * tools/qa/mp/mp-selftest.mjs):
 *
 *   1. THE PICTURE: four colour numbers, a pattern a flipped row, a flipped
 *      column or a swapped half each draws differently; the answer is the
 *      palette at each number.
 *   2. THE JUDGE: a channel may round by 2, no more; a program the address
 *      makes fail (`?selftest=fail:<name>`) fails; a picture never read back
 *      is `unread`, its program KEPT (a failed read says nothing of the
 *      program, and whole colours cost an iPhone's memory); a skipped or
 *      unread one is never in the report's `self`; `?selftest=0` runs none.
 *   3. THE READ NEVER HOLDS THE PAGE: with a WebGL 2 stand-in, the copy goes
 *      into a pixel buffer behind a fence, the fence is asked without waiting
 *      at the top of each later frame, and the verdict comes once it has
 *      passed: a right picture passes, a wrong one falls its program back
 *      (once), one not copied keeps its program, the textures are destroyed
 *      at once, the loading screen's group waits for every verdict.
 *   4. THE WIRING, read from the source: each 14a program draws its picture
 *      before its prewarm's full screen and falls back alone (the colour
 *      numbers to whole colours and the ground worker told; the one program
 *      to the three, every draw list rebuilt); the report says `self` once a
 *      sitting; the loading screen registers the group; the lever's row.
 *
 * BREAK PROOF (rule 8), each tried by hand, 2026-11-15:
 *   - selfDiff with no tolerance (`> -1`)                          -> FAIL 2 and 3 (a right picture judged wrong)
 *   - _poll taking the pixels while the fence still waits          -> FAIL 3 (a verdict at the first poll, no pixels)
 *   - paletteTex.js: the palette's onFail without setWheelPalette(false) -> FAIL 4
 *   - selfCheck judging nothing read back a failure (the `unread` branch gone) -> FAIL 2 and 3
 *   - paletteDecided without `!selfPending('palette')` (sitting 20)  -> FAIL 4
 */
import { readFileSync } from 'node:fs';
import * as S from '../../src/rendering/selfTest.js';
import { runBeforeDraw } from '../../src/game/framePacer.js';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}
const src = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
const code = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1');

/* ── 1. the picture ── */
{
  const n = S.SELF_SIZE, idx = S.selfIdx(), rgba = S.selfRgba();
  const seen = new Set(idx);
  const flipRows = (a) => { const o = new Uint8Array(a.length); for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) o[y * n + x] = a[(n - 1 - y) * n + x]; return o; };
  const flipCols = (a) => { const o = new Uint8Array(a.length); for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) o[y * n + x] = a[y * n + (n - 1 - x)]; return o; };
  const same = (a, b) => a.every((v, i) => v === b[i]);
  check('1. 16 x 16, all four colour numbers, and a flipped row or column draws a different picture',
    idx.length === 256 && seen.size === 4 && !same(idx, flipRows(idx)) && !same(idx, flipCols(idx)));
  check('1. the answer is the palette at each number, opaque (premultiplied and straight the same)',
    rgba.length === 1024 && [...idx].every((v, i) => [0, 1, 2, 3].every((c) => rgba[i * 4 + c] === S.SELF_PAL[v * 4 + c])) && [...idx].every((v, i) => rgba[i * 4 + 3] === 255));
}

/* ── 2. the judge ── */
{
  const want = S.selfRgba();
  const near = want.map((v, i) => (i % 4 === 3 ? v : Math.max(0, v - 2)));
  const far = want.slice(); far[4 * 37] = (far[4 * 37] + 3) % 256;
  check('2. a channel rounded by 2 is the same picture; by 3, a pixel wrong', S.selfDiff(near, want) === 0 && S.selfDiff(far, want) === 1 && S.selfDiff(null, want) === Infinity);
  check('2. the lever: `?selftest=fail:one,palette` names both; nothing else does', JSON.stringify(S.selfForcedFrom('?x=1&selftest=fail:one,palette')) === '["one","palette"]'
    && S.selfForcedFrom('?selftest=1').length === 0 && S.selfForcedFrom('').length === 0);
  check('2. `?selftest=0` (or off, false) runs none; anything else runs them', !S.selfTestOnFrom('?selftest=0') && !S.selfTestOnFrom('?a=1&selftest=off') && S.selfTestOnFrom('?selftest=fail:one') && S.selfTestOnFrom(''));
  const okA = S.selfCheck('t-right', want, want, 1);
  const okB = S.selfCheck('t-wrong', far, want, 1);
  const okC = S.selfCheck('t-unread', null, want, 1);
  S.selfSkip('t-skipped', 'switched off');
  const r = S.selfResults();
  check('2. a right picture passes, a wrong one fails (and says how many pixels), a skipped one is never in `self`',
    okA && !okB && r.results['t-right'].result === 'pass' && r.results['t-wrong'].result === 'fail' && r.results['t-wrong'].off === 1
    && r.results['t-skipped'].result === 'skipped' && JSON.stringify(S.selfFailures()) === '["t-wrong"]', r);
  check('2. nothing read back: `unread`, the program KEPT (true), never in `self`', okC && r.results['t-unread'].result === 'unread', r.results['t-unread']);
}

/* ── 3. the read never holds the page (a WebGL 2 stand-in) ── */
{
  const want = S.selfRgba();
  const wrong = want.slice(); wrong[0] ^= 0xff;
  const destroyed = [];
  const mkRt = (name, pixels) => ({ name, pixels, destroy() { destroyed.push(name); } });
  let waits = 0;
  const fences = [];
  const gl = {
    PIXEL_PACK_BUFFER: 1, FRAMEBUFFER: 2, FRAMEBUFFER_BINDING: 3, STREAM_READ: 4, RGBA: 5, UNSIGNED_BYTE: 6, SYNC_GPU_COMMANDS_COMPLETE: 7,
    TIMEOUT_EXPIRED: 10, CONDITION_SATISFIED: 11, ALREADY_SIGNALED: 12, WAIT_FAILED: 13,
    _fb: null, _pack: null,
    getParameter() { return 'screen'; },
    createBuffer() { return { data: null }; }, bindBuffer(t, b) { this._pack = b; }, bufferData() {},
    bindFramebuffer(t, f) { this._fb = f; },
    readPixels() { this._pack.data = this._fb.pixels; },
    fenceSync() { const f = { left: 2 }; fences.push(f); return f; }, flush() {},
    clientWaitSync(f, flags, timeout) { if (timeout !== 0) throw new Error('waited'); if (f.left > 0) { f.left--; waits++; return this.TIMEOUT_EXPIRED; } return this.CONDITION_SATISFIED; },
    getBufferSubData(t, off, out) { out.set(this._pack.data); },
    deleteSync() {}, deleteBuffer() {},
  };
  const renderer = { gl, renderTarget: { getRenderTarget: (rt) => rt, getGpuRenderTarget: (rt) => ({ resolveTargetFramebuffer: rt }) } };
  const fails = [];
  S.selfQueue('q-right', renderer, [mkRt('a', want), mkRt('b', want)], want, () => fails.push('q-right'), 2);
  S.selfQueue('q-wrong', renderer, [mkRt('c', want), mkRt('d', wrong)], want, () => fails.push('q-wrong'), 2);
  S.selfQueue('q-unread', renderer, [mkRt('e', want), null], want, () => fails.push('q-unread'), 2);   /* a picture not made */
  const ready = S.selfTestReady();
  let settled = false; ready.then(() => { settled = true; });
  const waiting = S.selfPending('q-right') && S.selfPending('q-wrong') && !S.selfPending('nothing');
  check('3. the textures are destroyed as the copies are made (nothing kept for the verdict)', destroyed.join() === 'a,b,c,d,e', destroyed);
  runBeforeDraw();   /* the top of a frame: the fences still waiting */
  await Promise.resolve();
  const early = S.selfResults().results;
  check('3. at the top of the first frame the copies are not done: no verdict, no fallback, the page not held (the fence asked with no wait)',
    !early['q-right'] && !early['q-wrong'] && fails.length === 0 && waits > 0 && !settled, { early, fails });
  for (let i = 0; i < 4; i++) runBeforeDraw();
  await new Promise((res) => setTimeout(res, 0));
  const late = S.selfResults().results;
  check('3. once the fences have passed: the right program passes, the wrong one falls back alone, once; one with a picture not made is kept (unread)',
    late['q-right'] && late['q-right'].result === 'pass' && late['q-wrong'] && late['q-wrong'].result === 'fail' && late['q-unread'] && late['q-unread'].result === 'unread'
    && JSON.stringify(fails) === '["q-wrong"]' && !S.selfFailures().includes('q-unread'), { late, fails });
  check('3. ...and the loading screen\'s group waited for every verdict', settled);
  check('3. each program says it waits while its verdict is pending (selfPending), and not after', waiting && !S.selfPending('q-right') && !S.selfPending('q-wrong'));
}

/* ── 4. the wiring ── */
{
  const pt = code(src('src/rendering/paletteTex.js'));
  const pal = pt.slice(pt.indexOf('export function setPaletteRenderer('), pt.indexOf('export function setOneBatchRenderer('));
  const one = pt.slice(pt.indexOf('export function setOneBatchRenderer('), pt.indexOf('window.__btOneBatch ='));
  check('4. the colour numbers: the picture drawn BEFORE the prewarm\'s full screen, judged once linked, and on a wrong picture whole colours with the ground worker told',
    pal.indexOf('selfDraw(_renderer') > 0 && pal.indexOf('selfDraw(_renderer') < pal.indexOf('_renderer.render({ container: box })')
    && /selfQueue\('palette', _renderer, testRt, selfRgba\(\), \(\) => \{\s*_ok = false;[\s\S]*?setWheelPalette\(false\);\s*\}/.test(pal));
  check('4. the one program: both pictures (plain and colour numbers) drawn before its prewarm, and on a wrong one the three programs at once',
    one.indexOf('selfDraw(r, sp') > 0 && one.indexOf('selfDraw(r, sp') < one.indexOf('r.render({ container: box })')
    && /selfQueue\('one', r, tps \? \[plain, nums\] : \[plain\], want, \(\) => \{\s*_oneOk = false;[\s\S]*?setOneBatchLive\(false\);\s*\}/.test(one));
  const rep = code(src('src/debug/report.js'));
  check('4. the report says `self` once a sitting, to a worker that takes lanes', /if \(_selfOwed && takesLanes\(_S\)\) \{ try \{ const sf = selfFailures\(\); if \(sf\.length\) r\.self = sf;/.test(rep) && /if \(r\.self\) _selfOwed = false;/.test(rep));
  check('4. the palette is not "decided" while its verdict is pending: an effect\'s twin or a tree waits for it (p256.js whenPaletteDecided; the gatekeeper\'s sitting 20)',
    /export function paletteDecided\(\) \{ return _ok !== null && !selfPending\('palette'\); \}/.test(pt));
  check('4. the loading screen registers the group (the preloading law)', /selfTest: selfTestReady\(\),/.test(code(src('src/rendering/preloadAnimations.js'))));
  check('4. the lever has its switch row', /name: '\?selftest', side: 'page'/.test(src('tools/guards/lib/switches.mjs')));
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
