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
 *
 * v2.3.5236 (card O PR 14b): the look program, the sharp read, the shine in
 * the frame, the shadows' shade and the moving water, each tested where it
 * is warmed and falling back alone:
 *   5. EACH ANSWER CAN TELL: the sharp read's against the plain smooth read;
 *      the shine's against no shine; the shade's against the texel alone;
 *      the water's against a piece read a texel off; the look's sheet read
 *      as its program reads its header, and its row's recolour against none.
 *   6. ONE ANSWER A PICTURE, AND AN ALLOWANCE A PICTURE (`{ want, tol }`);
 *      selfPending while a program waits for its verdict.
 *   7. THE WIRING: each program's way back (sharp: the plain read; sheen: its
 *      pass; look: each look baked, its choices waiting; shadow: the filter;
 *      water: still), and every name tested one the worker's `self` takes.
 * BREAK PROOF, 14b, each tried by hand, 2026-11-15:
 *   - sharpPixels.js: the route without `!_selfOff`                   -> FAIL 7
 *   - lookPalette.js: lookSheenState not waiting (no selfPending)     -> FAIL 7
 *   - selfQueue dropping `tol` (every allowance 2)                    -> FAIL 6
 *   - selfSheenWant without the lift                                  -> FAIL 5
 *   - wheelWater.js: stillNow without `_ok === false`                 -> FAIL 7
 *   - shadows.js: the shade's 0.36 made 0.30, its copy here unchanged  -> FAIL 5 (the mirror)
 *   - paletteTex.js: the one's fallback without sharpSelfTest (sitting 20) -> FAIL 7
 *   - lightFx.js: the shade's test without lightFxOn() (sitting 20)  -> FAIL 7
 * AND ON THE REAL GPU PATH (a scratch scenario, each program broken in the
 * built page, 2026-11-15): the sharp read made plain -> `one` fails (252 of
 * 256 px), and with `onebatch=0` `sharp` (252); the shade's 0.36 -> 0.30:
 * `shadow` (192); the look's 0.299 -> 0.399: `look` (128); the water's
 * smoothstep(0.3 -> 0.2): `water` (128); the shine's highlight start 0.55 ->
 * 0.50: `sheen` (64) and `look` (64: its shine picture, the same lines);
 * each time every other program passed.
 */
import { readFileSync } from 'node:fs';
import * as S from '../../src/rendering/selfTest.js';
import { runBeforeDraw } from '../../src/game/framePacer.js';
import { unpackLookSheet, lookSheetSpec } from '../../src/rendering/lookUnpack.js';

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
    && /const rts = \[plain\], wants = \[want\];\s*if \(tps\) \{ rts\.push\(nums\); wants\.push\(want\); \}/.test(one)
    && /selfQueue\('one', r, rts, wants, \(\) => \{\s*_oneOk = false;[\s\S]*?setOneBatchLive\(false\);[\s\S]*?\}, tMs\);/.test(one));
  const rep = code(src('src/debug/report.js'));
  check('4. the report says each failed program in `self` once a sitting (v2.3.5236: by name, so a verdict after the first report is said too), to a worker that takes lanes',
    /if \(takesLanes\(_S\)\) \{ try \{ const sf = selfFailures\(\)\.filter\(\(n\) => !_selfSaid\.has\(n\)\); if \(sf\.length\) r\.self = sf;/.test(rep) && /if \(r\.self\) for \(const n of r\.self\) _selfSaid\.add\(n\);/.test(rep));
  check('4. the palette is not "decided" while its verdict is pending: an effect\'s twin or a tree waits for it (p256.js whenPaletteDecided; the gatekeeper\'s sitting 20)',
    /export function paletteDecided\(\) \{ return _ok !== null && !selfPending\('palette'\); \}/.test(pt));
  check('4. the loading screen registers the group (the preloading law)', /selfTest: selfTestReady\(\),/.test(code(src('src/rendering/preloadAnimations.js'))));
  check('4. the lever has its switch row', /name: '\?selftest', side: 'page'/.test(src('tools/guards/lib/switches.mjs')));
}

/* ── 5. v2.3.5236 (14b): the other programs' answers, each able to tell ── */
{
  const n = S.SELF_SIZE;
  const differ = (a, b, tol = 2) => S.selfDiff(a, b, tol);
  /* the sharp read: each texel twice each way; the plain smooth read (a
     quarter of the neighbour at every pixel, worked here) is another picture */
  const sharpSrc = S.selfSharpRgba(), want = S.selfSharpWant(), m = S.SHARP_SRC;
  const each = [...Array(n * n).keys()].every((i) => { const x = i % n, y = (i / n) | 0; return [0, 1, 2, 3].every((c) => want[i * 4 + c] === sharpSrc[((y >> 1) * m + (x >> 1)) * 4 + c]); });
  const lin = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const sx = Math.min(m - 1, Math.max(0, (x + 0.5) / 2 - 0.5)), sy = Math.min(m - 1, Math.max(0, (y + 0.5) / 2 - 0.5));
    const x0 = Math.floor(sx), y0 = Math.floor(sy), x1 = Math.min(m - 1, x0 + 1), y1 = Math.min(m - 1, y0 + 1), fx = sx - x0, fy = sy - y0;
    for (let c = 0; c < 4; c++) {
      const g = (xx, yy) => sharpSrc[(yy * m + xx) * 4 + c];
      lin[(y * n + x) * 4 + c] = Math.round((g(x0, y0) * (1 - fx) + g(x1, y0) * fx) * (1 - fy) + (g(x0, y1) * (1 - fx) + g(x1, y1) * fx) * fy);
    }
  }
  check('5. the sharp read\'s answer is each texel twice each way; the plain smooth read differs in many pixels (the test tells them apart)', each && differ(lin, want) >= 40, differ(lin, want));
  /* the shine: the dark colour as drawn, three lifted past the allowance; no shine at all is another picture */
  const pic = S.selfSheenRgba(), lifted = S.selfSheenWant();
  const byColour = new Map();
  for (let i = 0; i < pic.length; i += 4) byColour.set(pic.slice(i, i + 3).join(','), lifted.slice(i, i + 3));
  const moved = [...byColour.entries()].map(([k, v]) => Math.max(...k.split(',').map((x, c) => Math.abs(Number(x) - v[c]))));
  check('5. the shine\'s answer: the dark colour as drawn, the other three lifted by more than its allowance of 4; no shine is another picture',
    moved.filter((d) => d === 0).length === 1 && moved.filter((d) => d > 4).length === 3 && differ(pic, lifted, 4) > 100, moved);
  const L = S.SHEEN_LINES;
  const tells = { start: { ...L, e0: 0.50 }, end: { ...L, e1: 0.90 }, ceiling: { ...L, ceil: 0.95 } };
  const told = Object.fromEntries(Object.entries(tells).map(([k, l]) => [k, differ(S.sheenLiftCpu(pic, S.SELF_SHEEN, l), lifted, 4)]));
  check('5. ...and it tells the highlight\'s start, its end or the ceiling moved (each moves pixels past the allowance)', Object.values(told).every((v) => v > 0), told);
  /* THE CPU COPIES HELD TO THE PROGRAMS' OWN TEXT: a shader's number changed
     without its copy here would fail every phone's test (and quietly fall
     each program back): this fails first */
  const lift = src('src/rendering/lightfx/sheenLift.js'), sbt = src('src/rendering/lightfx/sheenBatch.js');
  const shd = src('src/rendering/lightfx/shadows.js'), wtr = src('src/rendering/wheelWater.js'), lkp = src('src/rendering/lookPalette.js');
  const mirror = {
    'sheen: the highlight': lift.includes(`smoothstep(${L.e0}, ${L.e1}, dot(art, vec3(0.299, 0.587, 0.114)))`),
    'sheen: the side\'s weight': lift.includes(`float s = uSheen * hi * (${L.w} + ${1 - L.w} * side);`),
    'sheen: the roll-off': lift.includes('col += head * (vec3(1.0) - exp(-(uColor * s) / max(head, vec3(0.001))));') && lift.includes('vec3 head = max(uColor * SHEEN_CEIL - col, vec3(0.0));'),
    'sheen: the ceiling': sbt.includes(`const float SHEEN_CEIL = ${L.ceil};`),
    'shade: its five reads': /float a = texture\(uTexture, uv\)\.a \* 0\.36;(\s*a \+= texture\(uTexture, uv [+-] vec2\([^)]*\)\)\.a \* 0\.16;){4}\s*a = min\(a, 1\.0\) \* uAlpha;\s*finalColor = vec4\(uColor \* a, a\);/.test(shd),
    'water: its wetness': wtr.includes('float d = f.r * 10.625;') && wtr.includes('float wet = smoothstep(0.3, 0.9, d);') && wtr.includes('finalColor = vec4(col * wet, wet);'),
    'look: the recolour': lkp.includes('highp float lum = (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / (float(ref) / float(sRefScale));') && lkp.includes('return min(vec3(255.0), floor(T.rgb * lum + 0.5));'),
  };
  check('5. the CPU\'s copies match each program\'s own lines (shine, shade, water, look): a shader changed without its copy fails here, not on every phone',
    Object.values(mirror).every(Boolean), mirror);
  /* the shade: a blur, not the texel alone; capped by uAlpha; its colour uColor */
  const sh = S.selfShadeWant(), salpha = S.selfShadeRgba();
  let maxA = 0; const alone = new Uint8Array(n * n * 4);
  for (let i = 0; i < n * n; i++) {
    maxA = Math.max(maxA, sh[i * 4 + 3]);
    const a = Math.min(salpha[i * 4 + 3] / 255, 1) * S.SELF_SHADE.alpha;
    alone[i * 4] = Math.round(S.SELF_SHADE.color[0] * a * 255); alone[i * 4 + 1] = Math.round(S.SELF_SHADE.color[1] * a * 255); alone[i * 4 + 2] = Math.round(S.SELF_SHADE.color[2] * a * 255); alone[i * 4 + 3] = Math.round(a * 255);
  }
  check('5. the shade\'s answer is the five reads blended (the texel alone is another picture), never past uAlpha', differ(alone, sh) > 50 && maxA <= Math.round(S.SELF_SHADE.alpha * 255), { off: differ(alone, sh), maxA });
  /* the water: dry is nothing, the wettest the piece itself, between them partly; read at the wrong place, another picture */
  const piece = S.selfRgba(), ww = S.selfWaterWant(piece), field = S.selfWaterField();
  let dry = 0, full = 0, part = 0, fine = true;
  for (let i = 0; i < n * n; i++) {
    const r = field[i * 4];
    if (r === 0) { dry++; fine = fine && ww[i * 4 + 3] === 0 && ww[i * 4] === 0; }
    else if (r === 24) { full++; fine = fine && ww[i * 4 + 3] === 255 && [0, 1, 2].every((c) => ww[i * 4 + c] === piece[i * 4 + c]); }
    else { part++; fine = fine && ww[i * 4 + 3] > 0 && ww[i * 4 + 3] < 255; }
  }
  const shifted = S.selfWaterWant(Uint8Array.from([...piece.slice(4), 0, 0, 0, 0]));
  check('5. the water\'s answer: dry nothing, the wettest the piece itself, the rest partly; a piece read a texel off is another picture', fine && dry > 0 && full > 0 && part > 0 && differ(shifted, ww) > 20, { dry, full, part, off: differ(shifted, ww) });
  /* the look: its sheet's header as the program reads it (lookPalette.js readSheet), and the row's recolour another picture than none */
  const { m: man, roles } = S.selfLookManifest();
  const spec = lookSheetSpec(man, roles, 0);
  const bytes = unpackLookSheet(S.selfLookPicture(), spec);
  const W = spec.W, rows = spec.rows;
  const at = (x, y) => bytes[y * W + x];
  const hdr = (i) => { const p = i * 2; return at(p % W, rows - 1 - ((p / W) | 0)) + 256 * at((p + 1) % W, rows - 1 - (((p + 1) / W) | 0)); };
  const b0 = at(0, rows - 1);
  const numsOk = S.selfIdx().every((k, i) => bytes[i] === k + 1);
  const tableOk = S.SELF_LOOK.table.every((t, e) => [0, 1, 2, 3].every((c) => bytes[W * n + e * 4 + c] === t[c]));
  check('5. the look\'s sheet as its program reads it: 8 bits, scale 1, no mip, 16 rows of numbers (1 to 4), its table, one role from entry 3, its ref',
    b0 === (128 | 64 | 1) && hdr(1) === n && hdr(2) === n && hdr(4) === 1 && hdr(5) === 3 && hdr(6) === 5 && hdr(21) === S.SELF_LOOK.entry && hdr(22) === S.SELF_LOOK.ref && numsOk && tableOk,
    { b0, n: hdr(1), roles: hdr(4), e0: hdr(5), e1: hdr(6), entry: hdr(21), ref: hdr(22), numsOk, tableOk });
  const withRow = S.selfLookWant(true), noRow = S.selfLookWant(false);
  check('5. the look\'s answer with its row recolours the role (another picture than without a row); the shine over it lifts some of it', differ(withRow, noRow) > 50 && differ(S.sheenLiftCpu(withRow), withRow, 4) > 20, { row: differ(withRow, noRow), shine: differ(S.sheenLiftCpu(withRow), withRow, 4) });
}

/* ── 6. v2.3.5236 (14b): answers a picture, allowances a picture, the wait ── */
{
  const a = S.selfRgba(), b = S.selfSharpWant();
  const bOff3 = b.map((v, i) => (i % 4 === 3 ? v : Math.max(0, v - 3)));
  const destroyed = [];
  const mkRt = (name, pixels) => ({ name, pixels, destroy() { destroyed.push(name); } });
  const gl = {
    PIXEL_PACK_BUFFER: 1, FRAMEBUFFER: 2, FRAMEBUFFER_BINDING: 3, STREAM_READ: 4, RGBA: 5, UNSIGNED_BYTE: 6, SYNC_GPU_COMMANDS_COMPLETE: 7,
    TIMEOUT_EXPIRED: 10, CONDITION_SATISFIED: 11, WAIT_FAILED: 13, _fb: null, _pack: null,
    getParameter() { return 'screen'; }, createBuffer() { return { data: null }; }, bindBuffer(t, x) { this._pack = x; }, bufferData() {},
    bindFramebuffer(t, f) { this._fb = f; }, readPixels() { this._pack.data = this._fb.pixels; },
    fenceSync() { return {}; }, flush() {}, clientWaitSync() { return this.CONDITION_SATISFIED; },
    getBufferSubData(t, off, out) { out.set(this._pack.data); }, deleteSync() {}, deleteBuffer() {},
  };
  const renderer = { gl, renderTarget: { getRenderTarget: (rt) => rt, getGpuRenderTarget: (rt) => ({ resolveTargetFramebuffer: rt }) } };
  const fails = [];
  S.selfQueue('w-each', renderer, [mkRt('p', a), mkRt('q', b)], [a, b], () => fails.push('w-each'));
  S.selfQueue('w-swapped', renderer, [mkRt('r', a), mkRt('s', b)], [b, a], () => fails.push('w-swapped'));
  S.selfQueue('w-loose', renderer, [mkRt('t', bOff3)], { want: b, tol: 4 }, () => fails.push('w-loose'));
  S.selfQueue('w-tight', renderer, [mkRt('u', bOff3)], b, () => fails.push('w-tight'));
  check('6. queued: each program says it waits for its verdict (selfPending: the look\'s choices wait on it)', S.selfPending('w-each') && S.selfPending('w-loose') && !S.selfPending('nothing'));
  runBeforeDraw();
  await new Promise((res) => setTimeout(res, 0));
  const r = S.selfResults().results;
  check('6. each picture held to its own answer (right in order passes, swapped fails); `{ want, tol }` allows its channels 4 (3 off passes there, fails at the usual 2)',
    r['w-each'].result === 'pass' && r['w-swapped'].result === 'fail' && r['w-loose'].result === 'pass' && r['w-tight'].result === 'fail'
    && JSON.stringify(fails.sort()) === '["w-swapped","w-tight"]' && !S.selfPending('w-each'), { r, fails });
}

/* ── 7. v2.3.5236 (14b): the wiring, read from the source ── */
{
  const sp = code(src('src/rendering/sharpPixels.js'));
  check('7. sharp: its route asks the self-test (`!_selfOff`); wrong, the plain read and every draw list rebuilt',
    /const on = !_liveOff\.on && !_selfOff && wantsSharp\(obj\.renderable\);/.test(sp) && /selfQueue\('sharp', renderer, rt, selfSharpWant\(\), \(\) => \{\s*_selfOff = true;\s*rebuildDrawLists\(\);/.test(sp));
  const pt = code(src('src/rendering/paletteTex.js'));
  const one = pt.slice(pt.indexOf('export function setOneBatchRenderer('), pt.indexOf('window.__btOneBatch ='));
  check('7. sharp: tested by the one program where it draws (its picture in the one\'s test), by its own batcher where the three draw (not chosen; not built)',
    /sharp = sharpSelfPicture\(r\);/.test(one) && /if \(sharp\) \{ rts\.push\(sharp\); wants\.push\(selfSharpWant\(\)\); \}/.test(one)
    && (one.match(/sharpSelfTest\(r\)/g) || []).length === 3 && /if \(!_oneOk\) \{ try \{ sharpSelfTest\(r\);/.test(one));
  check('7. sharp: the one program falling back by its test queues the sharp batcher\'s own (the same read; the gatekeeper\'s sitting 20)',
    /selfQueue\('one', r, rts, wants, \(\) => \{\s*_oneOk = false;[^}]*?setOneBatchLive\(false\);\s*try \{ sharpSelfTest\(r\); \}/.test(one));
  const sb = code(src('src/rendering/lightfx/sheenBatch.js'));
  check('7. sheen: tested where it is built; wrong, every shine in its pass (`_selfOff` in sheenBatchOn), and so with the sharp read found wrong',
    /return !_urlOff && !_passAll && !_selfOff && sharpMaxTextures\(\) > 0[\s\S]{0,120}&& !sharpSelfOff\(\);/.test(sb) && /if \(_built\) sheenSelfTest\(renderer\);/.test(sb)
    && /selfQueue\('sheen', renderer, rt, \{ want: selfSheenWant\(\), tol: 4 \}, \(\) => \{ _selfOff = true; \}/.test(sb));
  const lp = code(src('src/rendering/lookPalette.js'));
  check('7. look: tested once built; wrong, every look baked (`_ok` and its shine false); its choices wait while the verdict is pending (TRAPS §340)',
    /if \(_ok\) lookSelfTest\(r\);/.test(lp) && /selfQueue\('look', r, rts, wants, \(\) => \{\s*_ok = false;\s*_okSheen = false;/.test(lp)
    && /if \(selfPending\('look'\)\) return null;\s*return _ok === false \? false : _okSheen;/.test(lp));
  const sh = code(src('src/rendering/lightfx/shadows.js'));
  check('7. shadow: tested once a renderer as its system is made, where the light is on (lightFx.js; sitting 20\'s low); wrong, the filter (`_selfOff` in _wantsCast), every system moved over',
    /if \(!renderer \|\| !_prepassOn \|\| _selfTested\.has\(renderer\)\) return;\s*_selfTested\.add\(renderer\);/.test(sh)
    && /if \(this\.shadows && renderer && lightFxOn\(\)\) \{ try \{ shadeSelfTest\(renderer\);/.test(code(src('src/rendering/lightfx/lightFx.js')))
    && /_wantsCast\(\) \{ return _prepassOn && !_selfOff && /.test(sh) && /selfQueue\('shadow', renderer, rt, selfShadeWant\(\), \(\) => \{\s*_selfOff = true;\s*for \(const sys of _systems\) \{ try \{ sys\._rehome\(\);/.test(sh));
  const ww = code(src('src/rendering/wheelWater.js'));
  check('7. water: tested once built; wrong, the sea still (`_ok` false: stillNow), the ground worker told',
    /if \(_ok\) waterSelfTest\(\);/.test(ww) && /function stillNow\(\) \{ return _liveOff \|\| _ok === false \|\| waterKnobStill\(\); \}/.test(ww)
    && /selfQueue\('water', _renderer, rts, wants, \(\) => \{\s*_ok = false;[\s\S]{0,140}setWheelWaterMoves\(false\);\s*\}/.test(ww));
  /* every name the page tests or skips is a program the worker's `self` takes */
  const files = ['src/rendering/paletteTex.js', 'src/rendering/sharpPixels.js', 'src/rendering/lightfx/sheenBatch.js', 'src/rendering/lookPalette.js', 'src/rendering/lightfx/shadows.js', 'src/rendering/wheelWater.js',
    'src/rendering/fillBatch.js', 'src/rendering/lightfx/glint.js',   /* v2.3.5237: + 14c's */
    'src/rendering/hairClip.js'];   /* v2.3.5238: + 14d's */
  const names = new Set();
  for (const f of files) for (const mm of code(src(f)).matchAll(/self(?:Queue|Skip)\('([a-z]+)'/g)) names.add(mm[1]);
  const progs = src('src/game/drawLanes.js').match(/\{ name: '([a-z]+)', file:/g).map((x) => x.split("'")[1]);
  const stray = [...names].filter((x) => !progs.includes(x));
  check('7. every program the page tests is one of drawLanes.js PROGRAMS (the worker\'s SELF_PROGRAMS): ' + [...names].sort().join(', '), stray.length === 0 && names.size === 10, { names: [...names], stray });
  check('7. the lever\'s row names them', /fail:<name>\[,<name>...\] \(one, palette, look, sharp, sheen, shadow, water, fill, glint, clip\)/.test(src('tools/guards/lib/switches.mjs')));
}

/* ── 8. v2.3.5237 (14c): the fill and the glint -- no way back, named ── */
{
  const n = S.SELF_SIZE;
  const differ = (a, b, tol = 2) => S.selfDiff(a, b, tol);
  /* the fill: a grey of each pixel's brightness, tinted: its own colours gone;
     the tint alone, or the picture's own colours, are other pictures */
  const fw = S.selfFillWant(), pic = S.selfRgba();
  const tintOnly = new Uint8Array(n * n * 4);
  for (let i = 0; i < n * n; i++) { for (let c = 0; c < 3; c++) tintOnly[i * 4 + c] = S.SELF_FILL_TINT_BYTES[c]; tintOnly[i * 4 + 3] = 255; }
  const greys = new Set(); for (let i = 0; i < n * n; i++) greys.add(fw[i * 4]);
  check('8. the fill\'s answer: four shades of the tint (one a colour of the picture), not the tint alone, not the picture\'s own colours',
    greys.size === 4 && differ(fw, tintOnly) > 100 && differ(fw, pic) > 200, { shades: [...greys], tint: differ(fw, tintOnly) });
  /* the glint: with no grade, the sheen batcher's shine to the byte (one text,
     SHEEN_LIFT); a grade's highlights another picture */
  const sp = S.selfSheenRgba();
  check('8. the glint\'s answer with no grade is the shine\'s own (SHEEN_LIFT, one text); with a rare grade its highlights are lit another colour (past the allowance)',
    differ(S.glintCpu(sp), S.selfSheenWant(), 0) === 0 && differ(S.glintCpu(sp, S.SELF_SHEEN, S.SELF_GRADE), S.selfSheenWant(), 4) > 50,
    differ(S.glintCpu(sp, S.SELF_SHEEN, S.SELF_GRADE), S.selfSheenWant(), 4));
  const fb = src('src/rendering/fillBatch.js'), gl = src('src/rendering/lightfx/glint.js');
  const mirror = {
    'fill: its grey': fb.includes('float btL = clamp(0.5 + 0.8 * dot(btC, vec3(0.299, 0.587, 0.114)), 0.0, 1.0);') && fb.includes('outColor = vec4(vec3(btL * btA), btA);'),
    'glint: the shine is SHEEN_LIFT': gl.includes('${SHEEN_LIFT}') && gl.includes('col = min(col + uColor * k, vec3(1.0));') && gl.includes('float k = band * uStrength * (0.3 + 0.7 * lum);'),
    'glint: the grade\'s highlights': gl.includes('float l = dot(col, vec3(0.299, 0.587, 0.114));') && gl.includes('vec3 lit = gc * clamp(l * 1.3 + 0.2, 0.0, 1.0);') && gl.includes('col = mix(col, lit, hi * 0.6 * ga);'),
    'glint: the glow only where alpha < 1': gl.includes('if (c.a < 0.999 && ga > 0.0) {'),
  };
  check('8. the CPU\'s copies match the fill\'s and the glint\'s own lines', Object.values(mirror).every(Boolean), mirror);
  const fbc = code(fb), glc = code(gl);
  check('8. the fill: tested once built, in the whirlwind\'s amber; v2.3.5239: wrong, it falls back alone as `?fill=0` (fillBatchOn false: no one-colour glow)',
    /if \(_built\) fillSelfTest\(renderer\);/.test(fbc) && /selfQueue\('fill', renderer, rt, selfFillWant\(\), \(\) => \{ _selfOff = true; \}/.test(fbc)
    && /export const fillBatchOn = \(\) => _on && !_selfOff;/.test(fbc));
  check('8. the glint: tested once a renderer where its filter is warmed, alone and with a grade (allowed 4); v2.3.5239: wrong, every piece it filtered drawn plain (the shine in the frame kept)',
    /if \(ok && !_selfTested\.has\(renderer\)\) \{ _selfTested\.add\(renderer\); glintSelfTest\(renderer\); \}/.test(glc)
    && /wants\.push\(\{ want: glintCpu\(pic, SELF_SHEEN, grade\), tol: 4 \}\);/.test(glc) && /selfQueue\('glint', renderer, rts, wants, \(\) => \{ _selfOff = true; \}/.test(glc)
    && /if \(_selfOff\) \{ const f1 = this\._on\.get\(spr\); if \(f1\) \{ this\._release\(spr, f1\); this\._on\.delete\(spr\); \} continue; \}/.test(glc));
  const progs = src('src/game/drawLanes.js');
  check('8. v2.3.5239: the fill and the glint have their way back in drawLanes.js PROGRAMS', /name: 'fill',[^\n]*back: 'no one-colour glow'/.test(progs) && /name: 'glint',[^\n]*back: 'the filtered pieces plain'/.test(progs));
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);

/* ── 9. v2.3.5238 (14d): the clip -- its two programs, no way back, named ── */
{
  const n = S.SELF_SIZE, pic = S.selfClipRgba();
  const kept = (w) => { let k = 0; for (let i = 3; i < w.length; i += 4) if (w[i]) k++; return k; };
  const hat = S.selfClipWant(false), mon = S.selfClipWant(true);
  /* each colour of the four sits clear of its line (0.5) by a tenth */
  const clear = [0, 1, 2, 3].every((c) => { const a = S.SELF_CLIP_PAL[c * 4 + 3] / 255, r = S.SELF_CLIP_PAL[c * 4] / 255; return Math.abs(a - 0.5) > 0.1 && Math.abs(a * r - 0.5) > 0.1; });
  check('9. the clip\'s answers: the hat\'s keeps fewer than the monsters\', each keeps some and drops some, and what it keeps is the picture itself; no colour near a line',
    clear && kept(hat) > 0 && kept(hat) < kept(mon) && kept(mon) < n * n
    && [hat, mon].every((w) => { for (let i = 0; i < w.length; i += 4) if (w[i + 3] && [0, 1, 2, 3].some((c) => w[i + c] !== pic[i + c])) return false; return true; }),
    { hat: kept(hat), mon: kept(mon) });
  const hc = src('src/rendering/hairClip.js');
  check('9. the CPU\'s lines are the programs\' own (alpha x red; alpha)',
    hc.includes('if (outColor.a * outColor.r < 0.5) discard;') && hc.includes('if (outColor.a < 0.5) discard;'));
  const hcc = code(hc);
  check('9. the clip: tested once installed, each program through its sprite\'s own batcher; v2.3.5239: wrong, it falls back alone to the alpha mask (as `?alphaclip`)',
    /_installed = true;\s*try \{ clipSelfTest\(r\); \}/.test(hcc)
    && /if \(alpha\) spr\._btClipAlpha = true; else spr\._btClipMask = true;/.test(hcc)
    && /selfQueue\('clip', renderer, rts, wants, \(\) => \{ setHairClipStencil\(false\); \}/.test(hcc));
  check('9. v2.3.5239: the clip\'s way back in drawLanes.js PROGRAMS', /name: 'clip',[^\n]*back: 'the alpha mask'/.test(src('src/game/drawLanes.js')));
}
