/* ═══ v2.3.3190: THE WHEEL'S OBJECT SHEETS READ OFF THE MAIN THREAD ═══
 *
 * A sheet kept as colour numbers (wheelObjects.js, paletteTex.js) is fetched
 * and read as its numbers (png8Decode.js) here, on a core of its own: the
 * browser's DecompressionStream unpacks in many small steps, and on a busy
 * main thread each step waits for a frame -- a sheet took 17-35 s to come in
 * the first time this was measured (the picture way, 8-10 s), and the town's
 * buildings would have been late for the way in's loading screen.
 *
 *   { id, url }  -> { id, ok: true, data (the sheet), image (its url), w, h,
 *                     stride, n, idx, rgb, alpha, bytes (the PNG's own bytes,
 *                     for the one <img> its frames' bases are read off) }
 *                   or { id, ok: false, error } -- the page then loads as a
 *                   picture, as before
 *
 * v2.3.3464: and one palette PNG on its own (the farm's ground, its pictures
 * and the pages of the sheets it borrows: paletteLoad.js):
 *
 *   { id, png }  -> { id, ok: true, w, h, stride, n, idx, rgb, alpha }
 *                   or { id, ok: false, error } -- loaded as a picture then
 */
import { decodePng8 } from './png8Decode.js';

function imageUrlOf(sheetUrl, image) {
  const base = new URL(sheetUrl, self.location.href);
  const u = new URL(image, base);
  u.search = base.search;   /* as Pixi's own loader copies the sheet's query (copySearchParams) */
  return u.href;
}

self.onmessage = async (ev) => {
  const m = ev.data || {};
  try {
    if (m.png) {
      const pr = await fetch(new URL(m.png, self.location.href).href);
      if (!pr.ok) throw new Error('picture ' + pr.status);
      const dec = await decodePng8(new Uint8Array(await pr.arrayBuffer()), undefined, 4);
      if (!dec) throw new Error('not a palette PNG');
      const rgb = dec.rgb.slice(), alpha = dec.alpha;
      self.postMessage({ id: m.id, ok: true, w: dec.w, h: dec.h, stride: dec.stride, n: dec.n,
        idx: dec.idx, rgb, alpha }, [dec.idx.buffer, rgb.buffer, alpha.buffer]);
      return;
    }
    const jr = await fetch(new URL(m.url, self.location.href).href);
    if (!jr.ok) throw new Error('sheet ' + jr.status);
    const data = await jr.json();
    if (!data || !data.meta || !data.meta.image) throw new Error('no image');
    const image = imageUrlOf(m.url, data.meta.image);
    const pr = await fetch(image);
    if (!pr.ok) throw new Error('page ' + pr.status);
    const bytes = new Uint8Array(await pr.arrayBuffer());
    const dec = await decodePng8(bytes, undefined, 4);
    if (!dec) throw new Error('not a palette PNG');
    const rgb = dec.rgb.slice(), alpha = dec.alpha;
    self.postMessage({ id: m.id, ok: true, data, image, w: dec.w, h: dec.h, stride: dec.stride, n: dec.n,
      idx: dec.idx, rgb, alpha, bytes }, [dec.idx.buffer, rgb.buffer, alpha.buffer, bytes.buffer]);
  } catch (e) {
    self.postMessage({ id: m.id, ok: false, error: String((e && e.message) || e) });
  }
};
