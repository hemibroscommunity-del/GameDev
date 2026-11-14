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
 *
 * v2.3.4470: and a STRIP of frames (a monster's: zoneTextures.js
 * loadTrackedStrip, stripRead.js) -- read as its numbers and cropped and
 * packed here too (stripPack.js), so the page's share of a strip that loads
 * while you play is making its texture:
 *
 *   { id, strip, fw, fh, n } -> { id, ok: true, w, h, idx, pal, cells, n,
 *                   fileW, fileH } or { id, ok: false, error } -- unpacked on
 *                   the page then, as before
 *
 * v2.3.5004: and a palette PNG the page holds as a Blob (no fetch: the
 * level-up burst's frames, stripRead.js readPaletteBlob):
 *
 *   { id, pngBlob } -> { id, ok: true, w, h, stride (= w), n, idx, rgb, alpha }
 *                   or { id, ok: false, error }
 */
import { decodePng8 } from './png8Decode.js';
import { packStripNumbers } from './stripPack.js';   /* v2.3.4470: a monster's strip, cropped and packed from its own numbers */
import { planOnRows, remapToRow } from './stripRows.js';   /* v2.3.5044: ...and numbered for its bundle's row of colours */
import { retintPalette } from './retintPalette.js';   /* v2.3.5044: ...a colour variant's palette retinted first (the page's own rule) */
import { bottomsOfNumbers } from './artBottoms.js';   /* v2.3.4470: each frame's ground line, read here from the page's numbers */

function imageUrlOf(sheetUrl, image) {
  const base = new URL(sheetUrl, self.location.href);
  const u = new URL(image, base);
  u.search = base.search;   /* as Pixi's own loader copies the sheet's query (copySearchParams) */
  return u.href;
}

self.onmessage = async (ev) => {
  const m = ev.data || {};
  try {
    if (m.strip) {
      const pr = await fetch(new URL(m.strip, self.location.href).href);
      if (!pr.ok) throw new Error('strip ' + pr.status);
      const dec = await decodePng8(new Uint8Array(await pr.arrayBuffer()), undefined, 1);
      if (!dec) throw new Error('not a palette PNG');
      const out = packStripNumbers(dec, m.fw, m.fh, m.n || 0);
      if (!out) throw new Error('not a strip of ' + m.fw + ' x ' + m.fh + ' frames');
      /* v2.3.5044: the page sent its bundle's rows of colours (picsNumbers.js
         stripRowsAsk): the strip numbered for its row here (stripRows.js),
         its own numbers kept beside it for the page's way if the rows changed */
      let onRow = null, palTint = null;
      /* a colour variant (zoneTextures.js loadTrackedStripRetinted): its
         palette retinted here, as the page would, and numbered as that */
      if (m.rgb) palTint = retintPalette(out.pal, out.idx, m.rgb);
      if (m.rows) {
        const plan = planOnRows(palTint || out.pal, m.rows);
        const st = (out.w + 3) & ~3;   /* paletteTex.js paletteStride */
        onRow = { ri: plan.ri, n0: plan.n0, added: plan.added, st, out: remapToRow(out.idx, out.w, out.h, plan.to, st) };
      }
      self.postMessage({ id: m.id, ok: true, w: out.w, h: out.h, idx: out.idx, pal: out.pal, cells: out.cells, n: out.n, fileW: dec.w, fileH: dec.h, onRow, palTint },
        [out.idx.buffer, out.pal.buffer].concat(onRow ? [onRow.out.buffer, onRow.added.buffer] : [], palTint ? [palTint.buffer] : []));
      return;
    }
    /* v2.3.5004: a palette PNG the page already holds, as a Blob (the level-up
       burst's frames, kept packed between bursts: levelUpBurstNumbers.js) */
    if (m.pngBlob) {
      const dec = await decodePng8(new Uint8Array(await m.pngBlob.arrayBuffer()), undefined, 1);
      if (!dec) throw new Error('not a palette PNG');
      const rgb = dec.rgb.slice(), alpha = dec.alpha;
      self.postMessage({ id: m.id, ok: true, w: dec.w, h: dec.h, stride: dec.stride, n: dec.n,
        idx: dec.idx, rgb, alpha }, [dec.idx.buffer, rgb.buffer, alpha.buffer]);
      return;
    }
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
    /* v2.3.4470: `bases` -- each frame's ground line worked out HERE from the numbers (artBottoms.js), so the page
       does not decode the file a second time and read every frame back off a canvas (wheelObjects.js).  The file's
       own bytes then stay here (they were sent only for that read).  A frame laid on its side is left to the page. */
    if (m.bases) {
      const bottoms = Object.create(null);
      let all = true;
      for (const name of Object.keys(data.frames || {})) {
        const fr = data.frames[name];
        const f = fr && fr.frame;
        if (!f || fr.rotated) { all = false; continue; }
        bottoms[name] = bottomsOfNumbers(dec.idx, dec.stride, alpha, f.x, f.y, f.w, f.h);
      }
      if (all) {
        self.postMessage({ id: m.id, ok: true, data, image, w: dec.w, h: dec.h, stride: dec.stride, n: dec.n,
          idx: dec.idx, rgb, alpha, bottoms, bytes: m.bases === 'both' ? bytes : null },
          m.bases === 'both' ? [dec.idx.buffer, rgb.buffer, alpha.buffer, bytes.buffer] : [dec.idx.buffer, rgb.buffer, alpha.buffer]);
        return;
      }
    }
    self.postMessage({ id: m.id, ok: true, data, image, w: dec.w, h: dec.h, stride: dec.stride, n: dec.n,
      idx: dec.idx, rgb, alpha, bytes }, [dec.idx.buffer, rgb.buffer, alpha.buffer, bytes.buffer]);
  } catch (e) {
    self.postMessage({ id: m.id, ok: false, error: String((e && e.message) || e) });
  }
};
