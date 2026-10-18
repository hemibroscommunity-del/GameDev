/* ═══ v2.3.3440: THE FARM'S PICTURES KEPT AS COLOUR NUMBERS ═══
 *
 * The owner, 2026-10-18, offered "the farm's 22 MB ground picture uses only
 * 246 colours ... It could be stored the smaller way BroTown's ground is":
 * "Yes do the separate PR".  BroTown's ground and objects have been kept as
 * one byte a pixel -- each pixel its colour's number, the colours a row of
 * one shared atlas, looked up on the graphics chip as it draws -- since
 * v2.3.3190 (paletteTex.js).  The farm was still full colour, four bytes a
 * pixel on the chip AND in the page: its ground (2048 x 2816), the owner's 76
 * farm pictures (the barn, the beds, every crop's every stage) and the six
 * BroTown sheets it borrows trees and fences from -- every one of them drawn
 * on 256 colours or fewer.
 *
 * This is a loader in Pixi's own asset loader, ahead of its picture loader,
 * so nothing that loads, finds or frees these pictures changes: the farm's
 * map is still `Assets.load('/maps/farm_v2.webp')` (tiledMaps.js), freed by
 * `Assets.unload` of the same address; a farm picture still
 * `Assets.load(farmArtUrl(n))`; a borrowed sheet still its `.json?farm=1`,
 * whose page Pixi's sheet loader asks for as `.png?farm=1`.  Where pictures
 * are drawn as colour numbers (paletteOn: WebGL2, the programs built, no
 * `?nopalette`), those addresses -- and only those -- are read here instead:
 *
 *   the ground    its palette twin, /maps/farm_v2.png (bake_farm_ground.py
 *                 writes both; server/test/palette.test.mjs holds them to
 *                 the same pixels)
 *   a picture     /world/farm/*.png itself (already a palette PNG)
 *   a sheet page  /world/objects/*.png?farm=1 itself (the farm's own copy of
 *                 the page, farmWorld.js; the Wheel reads its own copies
 *                 through wheelObjects.js)
 *
 * fetched and read as their numbers on a core of their own (png8Worker.js,
 * png8Decode.js) and kept as an R8 texture (makePaletteSource).  Anything
 * that is not a palette PNG, will not read, or finds the atlas full is loaded
 * as a picture, exactly as before.  Unloading destroys the texture, which
 * gives its colours' row back.
 *
 * WHO READS THESE ON THE CPU.  A picture kept as numbers has no <img>: its
 * `source.resource` is the numbers.  The dashboard's map (MapPanel.jsx) drew
 * the ground's <img> and draws a small copy from the numbers instead
 * (paletteDraw.js paletteThumb); a tree's sway and a shadow's base read
 * through drawSourceRect already (propGround.readArtBottoms); the barn's
 * shadow reads no pixels (farmWorld.js farmCasters).
 *
 * The probe: window.__btPalette() counts these as livefarm.
 */
import { extensions, ExtensionType, LoaderParserPriority, Texture, Rectangle, Cache, loadTextures } from 'pixi.js';
import { paletteOn, makePaletteSource, isPaletteSource } from './paletteTex.js';

/* the farm's ground and its palette twin (the address the game asks for ->
   the file read as numbers) */
const TWINS = Object.freeze({ '/maps/farm_v2.webp': '/maps/farm_v2.png' });

function split(url) {
  const s = String(url || '');
  const q = s.indexOf('?');
  return q < 0 ? { path: s, query: '' } : { path: s.slice(0, q), query: s.slice(q) };
}
/* the path without an origin (the loader may hand an absolute address) */
function pathOf(url) {
  const p = split(url).path;
  const m = /^[a-z]+:\/\/[^/]+(\/.*)$/i.exec(p);
  return m ? m[1] : p;
}

/** What this reads for `url` -- { file, opaque } -- or null: not one of the
 *  farm's, or pictures are not drawn as numbers here. */
export function paletteFileFor(url) {
  if (!paletteOn()) return null;
  const { query } = split(url);
  const p = pathOf(url);
  if (TWINS[p]) return { file: TWINS[p] + query, opaque: true, kind: 'ground' };
  if (/^\/world\/farm\/[^/]+\.png$/.test(p)) return { file: String(url), opaque: false, kind: 'picture' };
  if (/^\/world\/objects\/[^/]+\.png$/.test(p) && /[?&]farm=1(&|$)/.test(query)) return { file: String(url), opaque: false, kind: 'page' };
  return null;
}

/* ── the reader: one worker, gone when it has nothing to read ── */
let _w = null, _seq = 0, _idle = 0;
const _wait = new Map();
const IDLE_MS = 3000;
function worker() {
  if (_w) return _w;
  if (typeof Worker === 'undefined') return null;
  try { _w = new Worker(new URL('./png8Worker.js', import.meta.url), { type: 'module' }); } catch (e) { _w = null; return null; }
  _w.onmessage = (ev) => {
    const m = ev.data || {};
    const done = _wait.get(m.id);
    if (!done) return;
    _wait.delete(m.id);
    done(m);
    if (!_wait.size) restIdle();
  };
  _w.onerror = () => stop();
  return _w;
}
function stop() {
  if (_idle) { clearTimeout(_idle); _idle = 0; }
  if (_w) { try { _w.terminate(); } catch (e) { /* gone */ } _w = null; }
  for (const done of _wait.values()) done({ ok: false, error: 'stopped' });
  _wait.clear();
}
/* a worker holds a thread and a heap of its own: let it go once the farm's
   pictures are in (it comes back for the next load) */
function restIdle() {
  if (_idle) clearTimeout(_idle);
  _idle = setTimeout(() => { _idle = 0; if (!_wait.size) stop(); }, IDLE_MS);
}
function readPng8(file) {
  const w = worker();
  if (!w) return Promise.resolve(null);
  if (_idle) { clearTimeout(_idle); _idle = 0; }
  const id = ++_seq;
  return new Promise((resolve) => {
    _wait.set(id, resolve);
    try { w.postMessage({ id, png: file }); } catch (e) { _wait.delete(id); resolve(null); }
  });
}

/* the colours as the atlas keeps them: premultiplied, as Pixi premultiplies a
   picture it uploads (an opaque ground's are the same either way) */
function coloursOf(m) {
  const rgba = new Uint8Array(1024);
  for (let c = 0; c < m.n; c++) {
    const a = m.alpha[c];
    rgba[c * 4] = Math.round(m.rgb[c * 3] * a / 255);
    rgba[c * 4 + 1] = Math.round(m.rgb[c * 3 + 1] * a / 255);
    rgba[c * 4 + 2] = Math.round(m.rgb[c * 3 + 2] * a / 255);
    rgba[c * 4 + 3] = a;
  }
  return rgba;
}

/* Pixi's createTexture, with the picture's own frame: its rows are padded to
   4 bytes (paletteStride), and a texture with no frame of its own takes its
   source's padded width -- and takes it again on every resize */
function textureOf(src, loader, url, w, h) {
  src.label = url;
  src._sourceOrigin = url;   /* what a sheet unloads its page by (spritesheetAsset) */
  const tex = new Texture({ source: src, frame: new Rectangle(0, 0, w, h), label: url });
  const forget = () => {
    delete loader.promiseCache[url];
    if (Cache.has(url)) Cache.remove(url);
  };
  src.once('destroy', () => { if (loader.promiseCache[url]) forget(); });
  tex.once('destroy', () => { if (!src.destroyed) forget(); });
  return tex;
}

/* (`ms`: from the first read asked for to the last one in, the reads
   overlapping -- the time they took the farm's loading screen) */
export const stats = { ground: 0, pictures: 0, pages: 0, asPictures: 0, ms: 0 };
let _t0 = 0;

export const paletteLoadParser = {
  name: 'btPaletteLoad',
  id: 'bt-palette',
  extension: { type: ExtensionType.LoadParser, priority: LoaderParserPriority.High + 1, name: 'btPaletteLoad' },
  test(url) { return !!paletteFileFor(url); },
  async load(url, asset, loader) {
    const want = paletteFileFor(url);
    const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
    if (!_wait.size) _t0 = now();
    const m = want ? await readPng8(want.file) : null;
    const src = m && m.ok ? makePaletteSource({
      idx: m.idx, w: m.w, h: m.h, stride: m.stride, rgba: coloursOf(m),
      alphaMode: want.opaque ? 'no-premultiply-alpha' : 'premultiplied-alpha',
      label: String(url), autoGarbageCollect: true,
    }) : null;
    if (!src) {
      /* not a palette PNG, did not read, or no atlas row: the picture, as before */
      stats.asPictures++;
      return loadTextures.load(url, asset, loader);
    }
    if (want.kind === 'ground') stats.ground++;
    else if (want.kind === 'page') stats.pages++;
    else stats.pictures++;
    stats.ms = Math.round(now() - _t0);
    return textureOf(src, loader, String(url), m.w, m.h);
  },
  unload(texture, asset, loader) {
    if (texture && texture.source && isPaletteSource(texture.source)) { texture.destroy(true); return; }
    return loadTextures.unload(texture, asset, loader);
  },
};
extensions.add(paletteLoadParser);

/* QA probe, house style: what was read as numbers, what fell back to a
   picture, the time spent reading, and whether the reader is alive */
if (typeof window !== 'undefined') {
  window.__btPaletteLoad = () => ({ ...stats, reader: !!_w, reading: _wait.size });
}
