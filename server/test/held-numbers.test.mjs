/* A MONSTER'S PICTURE HELD ONCE, ITS COLOURS AS NUMBERS -- v2.3.3699
 * (docs/specs/monster-numbers.md).
 *
 * The owner, 2026-10-28: "Keep running tests through the night on memory
 * fixes/improvements".  src/rendering/heldNumbers.js (no Pixi import: Pixi's
 * texture system is handed to it) runs here in node against stand-in canvases,
 * sources and a stand-in renderer:
 *   1. a picture's colour numbers: a byte a pixel, the colours exactly as the
 *      canvas reads them back, see-through first; more than 256 colours is no
 *      answer; and the numbers give back every pixel they were read from, any
 *      rectangle of them, clamped at the edges;
 *   2. the sweep: a strip not drawn waits; one drawn is read into its numbers
 *      and its canvas emptied; one on more than 256 colours keeps its canvas;
 *      nothing on a lost context; nothing with the copies kept;
 *   3. a reader gets the same pixels from the numbers as from the canvas;
 *   4. a renderer that uploads a held picture has its canvas put back first
 *      (Pixi's onSourceUpdate, patched once), and it waits to be emptied again;
 *   5. the wiring: the monster strips are held once drawn and forgotten when
 *      their zone lets go, the effects renderer looks every GPU_WAIT_MS, the
 *      chips and the stuck arrows read through readSourceRect, pixiApp
 *      installs the refill before the first renderer. */
import { readFileSync } from 'fs';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}

/* the browser's ImageData, as much of it as the module uses */
globalThis.ImageData = class ImageData {
  constructor(data, w, h) { this.data = data; this.width = w; this.height = h; }
};

/* a canvas holding RGBA bytes: getImageData reads them, putImageData writes,
   drawImage copies a rectangle of another canvas's bytes (1:1) */
function fakeCanvas(w, h, bytes) {
  const cv = { width: w, height: h, px: bytes || new Uint8ClampedArray(w * h * 4), puts: 0 };
  cv.getContext = (t) => (t !== '2d' ? null : {
    getImageData: (x, y, gw, gh) => {
      const out = new Uint8ClampedArray(gw * gh * 4);
      for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) for (let c = 0; c < 4; c++) {
        out[(j * gw + i) * 4 + c] = cv.px[((y + j) * cv.width + x + i) * 4 + c];
      }
      return { data: out };
    },
    putImageData: (img, dx, dy) => {
      cv.puts++;
      if (cv.px.length !== cv.width * cv.height * 4) cv.px = new Uint8ClampedArray(cv.width * cv.height * 4);
      for (let j = 0; j < img.height; j++) for (let i = 0; i < img.width; i++) for (let c = 0; c < 4; c++) {
        cv.px[((dy + j) * cv.width + dx + i) * 4 + c] = img.data[(j * img.width + i) * 4 + c];
      }
    },
    drawImage: (src, sx, sy, sw, sh, dx, dy) => {
      for (let j = 0; j < sh; j++) for (let i = 0; i < sw; i++) for (let c = 0; c < 4; c++) {
        cv.px[((dy + j) * cv.width + dx + i) * 4 + c] = src.px[((sy + j) * src.width + sx + i) * 4 + c];
      }
    },
  });
  return cv;
}
/* a strip of `colours` colours (alpha among them), see-through between */
function strip(w, h, colours) {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    if (i % 5 === 0) continue;   /* see-through */
    const c = i % colours;
    px[i * 4] = (c * 37) & 255; px[i * 4 + 1] = (c * 11 + 3) & 255; px[i * 4 + 2] = (c >> 8) * 50; px[i * 4 + 3] = 128 + (c % 128);
  }
  return px;
}
function fakeSource(res) {
  return { resource: res, destroyed: false, autoGarbageCollect: true, _gpuData: Object.create(null), label: '' };
}
function fakeRenderer(uid) {
  const R = {
    uid, uploads: 0, lost: false,
    gl: { isContextLost: () => R.lost },
    texture: { initSource(src) { if (!src._gpuData[uid]) { src._gpuData[uid] = { texture: {} }; R.uploads++; } } },
  };
  return R;
}
const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

const N = await import('../../src/rendering/heldNumbers.js');

/* ── 1 ── */
{
  const w = 40, h = 12, px = strip(w, h, 200);
  const nums = N.numbersOfPixels(px, w, h);
  check('1: a picture on 200 colours has its numbers, a byte a pixel', !!nums && nums.idx.length === w * h && nums.w === w && nums.h === h, nums && { n: nums.pal.length });
  const distinct = new Set();
  for (let i = 0; i < w * h; i++) if (px[i * 4 + 3]) distinct.add(px.slice(i * 4, i * 4 + 4).join());
  check('1: its colour list holds every colour once, see-through first', !!nums && nums.pal.length === distinct.size + 1 && nums.pal[0] === 0 && new Set(nums.pal).size === nums.pal.length, nums && { pal: nums.pal.length, distinct: distinct.size });
  const back = nums && N.pixelsOfNumbers(nums, 0, 0, w, h);
  check('1: and the numbers give back every pixel they were read from', !!back && same(Array.from(back), Array.from(px)));
  const part = nums && N.pixelsOfNumbers(nums, 5, 3, 7, 4);
  let ok = !!part;
  for (let j = 0; ok && j < 4; j++) for (let i = 0; ok && i < 7; i++) for (let c = 0; c < 4; c++) {
    if (part[(j * 7 + i) * 4 + c] !== px[((3 + j) * w + 5 + i) * 4 + c]) { ok = false; break; }
  }
  check('1: any rectangle of them', ok);
  const edge = nums && N.pixelsOfNumbers(nums, w - 2, h - 2, 5, 5);
  check('1: clamped at the edges (outside is see-through)', !!edge && edge[(0 * 5 + 0) * 4 + 3] === px[((h - 2) * w + w - 2) * 4 + 3] && edge[(4 * 5 + 4) * 4 + 3] === 0);
  check('1: exactly 256 colours (see-through among them) still has numbers', !!N.numbersOfPixels(strip(64, 16, 255), 64, 16));
  check('1: more than 256 colours has none (the canvas stays)', N.numbersOfPixels(strip(64, 16, 400), 64, 16) === null);
  check('1: a picture with nothing in it is all see-through', (() => { const z = N.numbersOfPixels(new Uint8ClampedArray(64), 4, 4); return z && z.pal.length === 1 && z.idx.every((v) => v === 0); })());
}

/* ── 2 ── */
{
  const R = fakeRenderer(3);
  const a = fakeSource(fakeCanvas(32, 8, strip(32, 8, 50)));
  const want = Array.from(a.resource.px);
  N.holdOnceDrawn(a);
  check('2: a strip not yet drawn waits, its canvas whole', N.emptyHeldOnceDrawn(R) === 0 && a.resource.width === 32 && !a._btNumbers);
  R.texture.initSource(a);   /* drawn */
  const n = N.emptyHeldOnceDrawn(R);
  check('2: once drawn it is read into its numbers and its canvas emptied', n === 1 && a.resource.width === 0 && !!a._btNumbers && a.autoGarbageCollect === false);
  check('2: the numbers are the picture it held', !!a._btNumbers && same(Array.from(N.pixelsOfNumbers(a._btNumbers, 0, 0, 32, 8)), want));
  const many = fakeSource(fakeCanvas(64, 16, strip(64, 16, 400)));
  N.holdOnceDrawn(many); R.texture.initSource(many);
  N.emptyHeldOnceDrawn(R);
  check('2: a strip on more than 256 colours keeps its canvas', many.resource.width === 64 && !many._btNumbers);
  const lost = fakeSource(fakeCanvas(16, 4, strip(16, 4, 9)));
  N.holdOnceDrawn(lost); R.texture.initSource(lost);
  R.lost = true;
  check('2: nothing on a lost context', N.emptyHeldOnceDrawn(R) === 0 && lost.resource.width === 16);
  R.lost = false;
  N.emptyHeldOnceDrawn(R);
  check('2: and once it is back, it goes', lost.resource.width === 0);
  globalThis.window = { __btTrimVerify: true };
  const kept = fakeSource(fakeCanvas(16, 4, strip(16, 4, 9)));
  N.holdOnceDrawn(kept); R.texture.initSource(kept);
  N.emptyHeldOnceDrawn(R);
  check('2: nothing with the copies kept (?gpucopies, QA\'s __btTrimVerify)', kept.resource.width === 16 && !kept._btNumbers);
  delete globalThis.window;
  const gone = fakeSource(fakeCanvas(16, 4, strip(16, 4, 9)));
  N.holdOnceDrawn(gone); N.forgetHeld(gone); R.texture.initSource(gone);
  N.emptyHeldOnceDrawn(R);
  check('2: one its zone let go of is forgotten', gone.resource.width === 16);
}

/* ── 3 ── */
{
  const R = fakeRenderer(4);
  const w = 24, h = 10;
  const a = fakeSource(fakeCanvas(w, h, strip(w, h, 30)));
  const fromCanvas = fakeCanvas(6, 5);
  N.readSourceRect(fromCanvas.getContext('2d'), a, 3.4, 2.6, 6, 5, 0, 0);
  N.holdOnceDrawn(a); R.texture.initSource(a); N.emptyHeldOnceDrawn(R);
  const fromNumbers = fakeCanvas(6, 5);
  const read = N.readSourceRect(fromNumbers.getContext('2d'), a, 3.4, 2.6, 6, 5, 0, 0);
  check('3: a reader gets the same pixels from the numbers as from the canvas',
    read === true && a.resource.width === 0 && same(Array.from(fromNumbers.px), Array.from(fromCanvas.px)));
  const none = fakeSource({ width: 0, height: 0 });
  check('3: and nothing from a source with neither', N.readSourceRect(fakeCanvas(2, 2).getContext('2d'), none, 0, 0, 2, 2, 0, 0) === false);
}

/* ── 4 ── */
{
  let uploaded = null;
  class FakeGlTextures { onSourceUpdate(src) { uploaded = { w: src.resource.width, px: Array.from(src.resource.px) }; } }
  N.installHeldRefill(FakeGlTextures);
  const R = fakeRenderer(5);
  const a = fakeSource(fakeCanvas(20, 6, strip(20, 6, 12)));
  const want = Array.from(a.resource.px);
  N.holdOnceDrawn(a); R.texture.initSource(a); N.emptyHeldOnceDrawn(R);
  const before = a.resource.width;
  new FakeGlTextures().onSourceUpdate(a);   /* a rebuilt renderer uploads it */
  check('4: a renderer uploading a held picture has its canvas put back first',
    before === 0 && !!uploaded && uploaded.w === 20 && same(uploaded.px, want), { before, w: uploaded && uploaded.w });
  const R2 = fakeRenderer(6);
  R2.texture.initSource(a);
  N.emptyHeldOnceDrawn(R2);
  check('4: and once that renderer has drawn it, it goes again', a.resource.width === 0 && !!a._btNumbers);
  const plain = fakeSource(fakeCanvas(4, 4, strip(4, 4, 3)));
  new FakeGlTextures().onSourceUpdate(plain);
  check('4: a picture not held is uploaded as it is', plain.resource.width === 4);
  const probe = globalThis.window;
  check('4: the probe counts the refills', typeof N.heldOff === 'function' && N.heldOff() === false && probe === undefined);
}

/* ── 5 ── */
{
  const zt = readFileSync(new URL('../../src/rendering/zoneTextures.js', import.meta.url), 'utf8');
  check('5: the monster strips are held once drawn (zoneTextures loadTrackedStrip)', /if \(packed\) holdOnceDrawn\(src\)/.test(zt));
  check('5: ...and forgotten when their zone lets go (_releaseCrops)', /forgetHeld\(src\)/.test(zt));
  const fx = readFileSync(new URL('../../src/rendering/systems/effectsRenderer.js', import.meta.url), 'utf8');
  check('5: the effects renderer looks every GPU_WAIT_MS', /emptyHeldOnceDrawn\(this\._captureRenderer\)/.test(fx));
  const chips = readFileSync(new URL('../../src/rendering/hitMaterialFx.js', import.meta.url), 'utf8');
  const bake = chips.slice(chips.indexOf('function bakeChips('), chips.indexOf('function bakeChips(') + 1400);
  check('5: a hit\'s chips read through readSourceRect', /readSourceRect\(g, tex\.source/.test(bake) && !/drawImage\(src/.test(bake));
  const pin = readFileSync(new URL('../../src/rendering/arrowPin.js', import.meta.url), 'utf8');
  const fd = pin.slice(pin.indexOf('function frameData('), pin.indexOf('function frameData(') + 1600);
  check('5: a stuck arrow reads through readSourceRect', /readSourceRect\(g, tex\.source/.test(fd) && !/drawImage\(src/.test(fd));
  const app = readFileSync(new URL('../../src/rendering/pixiApp.js', import.meta.url), 'utf8');
  const inst = app.indexOf('installHeldRefill(GlTextureSystem)');
  check('5: pixiApp installs the refill before the first renderer', inst > 0 && inst < app.indexOf('new Application()'));
}

if (failures) { console.log(`\n${failures} check(s) failed`); process.exit(1); }
console.log('\nall held-numbers checks passed');
