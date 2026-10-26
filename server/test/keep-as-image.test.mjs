/* YOUR HAIR AND HAT STAY ON -- v2.3.3606 (docs/specs/head-pieces-stay.md).
 *
 * The owner, 2026-10-26: "Some traits will disappear.  It seems after combat
 * or interacting in the world a while.  Screenshots of hair missing."  Every
 * head piece is a picture the game made on a canvas, and an emptied canvas or
 * a graphics rebuild drew it blank (TRAPS §253).  The page's rule
 * (src/rendering/keepAsImage.js) runs here in node on stand-in canvases,
 * blobs and images, and the files that use it are read for what they promise:
 *   1. a canvas is copied AT THE CALL (before anything can empty it), its
 *      texture's source swapped to the image once loaded, sent again, the
 *      canvas let go of (width 0, out of Pixi's Cache);
 *   2. a source let go of while its image loads keeps nothing, and the bytes
 *      are given back;
 *   3. an image of another size, a failed encode, a failed load: the canvas
 *      is kept;
 *   4. a source that is no canvas (a file's <img>), or a canvas of no size:
 *      nothing asked;
 *   5. the bytes behind a kept image are given back when its picture goes;
 *   6. `?keepimage=0`: nothing kept;
 *   7. the wiring: the trait loader keeps every piece it cuts, the six colour
 *      catalogs and the species builds every piece they recolour, and a piece
 *      given up on is tried again later while worn. */
import { readFileSync } from 'fs';
import { Cache } from 'pixi.js';

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('PASS', name);
  else { failures++; console.log('FAIL', name, detail !== undefined ? JSON.stringify(detail) : ''); }
}
const tick = () => new Promise((r) => setTimeout(r, 0));

/* ── stand-ins: a canvas whose pixels are a string, a blob of a copy of it,
   an object URL a name for the blob, and an image that loads it ── */
let encodes = 0, revoked = [];
const blobs = new Map();
function fakeCanvas(w, h, pixels) {
  const cv = {
    width: w, height: h, pixels,
    getContext() { return {}; },
    toBlob(cb, type) {
      encodes++;
      if (cv.failEncode) { setTimeout(() => cb(null), 0); return; }
      const copy = { pixels: cv.pixels, w: cv.width, h: cv.height, type };   /* the copy is taken now */
      setTimeout(() => cb(copy), 0);
    },
  };
  return cv;
}
let urlN = 0;
globalThis.URL.createObjectURL = (blob) => { const u = 'blob:qa/' + (++urlN); blobs.set(u, blob); return u; };
globalThis.URL.revokeObjectURL = (u) => { revoked.push(u); blobs.delete(u); };
globalThis.Image = class {
  constructor() { this.onload = null; this.onerror = null; this.naturalWidth = 0; this.naturalHeight = 0; this.tagName = 'IMG'; }
  set src(u) {
    this._src = u;
    setTimeout(() => {
      const b = blobs.get(u);
      if (!b || globalThis.__failImage) { if (this.onerror) this.onerror(); return; }
      this.pixels = b.pixels;
      this.naturalWidth = globalThis.__imgW || b.w; this.naturalHeight = b.h;
      if (this.onload) this.onload();
    }, 0);
  }
  get src() { return this._src; }
};
function fakeSource(cv) {
  const s = {
    resource: cv, destroyed: false, updates: 0, _l: {},
    update() { this.updates++; },
    once(ev, fn) { (this._l[ev] || (this._l[ev] = [])).push(fn); },
    destroy() { this.destroyed = true; for (const fn of (this._l.destroy || [])) fn(); this._l = {}; },
  };
  return s;
}

const K = await import('../../src/rendering/keepAsImage.js?on');

/* ── 1 ── */
{
  const cv = fakeCanvas(32, 24, 'hair-southwest');
  Cache.set(cv, { qa: 1 });
  const src = fakeSource(cv);
  const p = K.keepAsImage(src);
  cv.pixels = '';   /* Safari empties it right after the call */
  const ok = await p;
  check('1a: kept as an image', ok === true && src.resource && src.resource.tagName === 'IMG', { ok, res: src.resource && src.resource.tagName });
  check('1b: the copy was taken AT THE CALL, before the canvas was emptied', src.resource && src.resource.pixels === 'hair-southwest', src.resource && src.resource.pixels);
  check('1c: sent again from the image (update)', src.updates === 1, src.updates);
  check('1d: the canvas let go of: width 0, out of Pixi\'s Cache', cv.width === 0 && cv.height === 0 && !Cache.has(cv), { w: cv.width, cached: Cache.has(cv) });
  check('1e: the image is the canvas\'s size', src.resource.naturalWidth === 32 && src.resource.naturalHeight === 24, { w: src.resource.naturalWidth, h: src.resource.naturalHeight });
  /* ── 5 ── */
  const url = src.resource.src;
  src.destroy();
  check('5: the bytes behind a kept image are given back when its picture goes', revoked.indexOf(url) >= 0, { url, revoked });
}

/* ── 2 ── */
{
  const cv = fakeCanvas(16, 16, 'hat');
  const src = fakeSource(cv);
  const p = K.keepAsImage(src);
  await tick();                    /* encoded; the image is loading */
  src.destroyed = true;            /* let go of meanwhile */
  const before = revoked.length;
  const ok = await p;
  check('2: a source let go of while its image loads keeps nothing, and its bytes are given back',
    ok === false && src.resource === cv && revoked.length === before + 1, { ok, revoked: revoked.length - before });
}

/* ── 3 ── */
{
  const cv = fakeCanvas(16, 16, 'eyes');
  const src = fakeSource(cv);
  globalThis.__imgW = 17;
  const ok1 = await K.keepAsImage(src);
  globalThis.__imgW = 0;
  check('3a: an image of another size: the canvas is kept', ok1 === false && src.resource === cv && cv.width === 16, { ok1 });
  cv.failEncode = true;
  const ok2 = await K.keepAsImage(src);
  cv.failEncode = false;
  check('3b: a failed encode: the canvas is kept', ok2 === false && src.resource === cv, { ok2 });
  globalThis.__failImage = true;
  const ok3 = await K.keepAsImage(src);
  globalThis.__failImage = false;
  check('3c: a failed load: the canvas is kept', ok3 === false && src.resource === cv, { ok3 });
}

/* ── 4 ── */
{
  const n0 = encodes;
  const img = new Image();
  const a = await K.keepAsImage(fakeSource(img));
  const b = await K.keepAsImage(fakeSource(fakeCanvas(0, 0, '')));
  const c = await K.keepAsImage(null);
  check('4: a file\'s <img>, a canvas of no size or nothing: nothing asked', !a && !b && !c && encodes === n0, { a, b, c, encodes: encodes - n0 });
}
{
  const st = K.keptImageStats();
  check('the counts: 5 asked, 1 kept, 4 kept their canvas, nothing waiting', !!st && st.asked === 5 && st.kept === 1 && st.failed === 4 && st.pending === 0 && st.off === false, st);
}

/* ── 6 ── */
{
  globalThis.location = { search: '?keepimage=0' };
  const Off = await import('../../src/rendering/keepAsImage.js?off');
  delete globalThis.location;
  const cv = fakeCanvas(8, 8, 'x');
  const n0 = encodes;
  const ok = await Off.keepAsImage(fakeSource(cv));
  check('6: ?keepimage=0 keeps nothing', ok === false && encodes === n0 && Off.keepAsImageOn() === false, { ok });
}

/* ── 7: the wiring ── */
const src = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
const ER = src('src/rendering/systems/entityRenderer.js');
{
  const load = ER.slice(ER.indexOf('function _loadTraitDir('), ER.indexOf('function _ensureHeadwearLoaded('));
  check('7a: the trait loader keeps every piece it cuts as an image', /keepAsImage\(t\.source\)/.test(load) && /^import \{ keepAsImage \} from '\.\.\/keepAsImage\.js'/m.test(ER), null);
  check('7b: a facing given up on is marked and tried again later', /\(e\.gaveUp \|\| \(e\.gaveUp = Object\.create\(null\)\)\)\[dir\] = true/.test(load) && /_traitGaveUp\(e\)/.test(load), null);
  const ens = ER.slice(ER.indexOf('function _ensureTraitLoaded('), ER.indexOf('function _fetchTraitMeta('));
  check('7c: _ensureTraitLoaded starts the later round when its time comes, meta and facings', /e\.retryAt && Date\.now\(\) >= e\.retryAt/.test(ens) && /_fetchTraitMeta\(e, category, id, 0, e\.retries\)/.test(ens) && /_loadTraitDir\(e, category, id, dir, 0, e\.retries\)/.test(ens), null);
  const meta = ER.slice(ER.indexOf('function _fetchTraitMeta('), ER.indexOf('/* v2.3.1305: per-direction trait load'));
  check('7d: a meta.json given up on is marked too, and a later round is never answered from a cache', /e\.metaGaveUp = true; _traitGaveUp\(e\)/.test(meta) && /&g=\$\{round\}/.test(meta) && /&g=\$\{round\}/.test(load), null);
  const sched = /const TRAIT_RETRY_LATER_MS = \[5000, 10000, 20000, 40000, 60000\]/.test(ER);
  check('7e: the later rounds: 5 s, 10, 20, 40, then every minute; ?traitretry=0 the game as it was', sched && /traitretry=0/.test(ER), null);
}
for (const f of ['hairColorCatalog', 'hatColorCatalog', 'facialHairColorCatalog', 'eyewearColorCatalog', 'eyeStyleColorCatalog', 'shirtColorCatalog']) {
  const s = src(`src/rendering/traits/${f}.js`);
  const at = s.indexOf('const t = Texture.from(cv);');
  check(`7f: ${f} keeps every piece it recolours as an image`, at > 0 && /keepAsImage\(t\.source\)/.test(s.slice(at, at + 260)) && /^import \{ keepAsImage \} from '\.\.\/keepAsImage\.js'/m.test(s), null);
}
{
  const s = src('src/rendering/traits/speciesArt.js');
  const at = s.indexOf('function _texFrom(cv)');
  check('7g: the species builds keep their pieces as images', at > 0 && /keepAsImage\(t\.source\)/.test(s.slice(at, at + 400)), null);
}

if (failures) { console.log(`\n${failures} failure(s)`); process.exit(1); }
console.log('\nall keep-as-image checks passed');
