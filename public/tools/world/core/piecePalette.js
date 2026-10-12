/* ═══ v2.3.3190: A PIECE AS COLOUR NUMBERS ═══
   Where the game draws pictures as colour numbers (rendering/paletteTex.js),
   a piece goes to it as one byte a pixel -- each pixel's number among the
   piece's colours, in the order they first appear -- and its colours, four
   bytes each, instead of four bytes a pixel: a quarter of the memory on the
   graphics chip for the same picture.  Every pixel of a piece is a pixel of
   one of its swatches (laid by a cut, never a blend: ground.js), and each
   swatch keeps its own 64 colours, so a piece has a few hundred colours at
   the very most; past 256 this answers null and the piece goes as colours,
   as before.  Rows are padded to 4 bytes (WebGL unpacks rows 4-aligned) with
   copies of the row's last pixel.
   The ground worker's (ground-worker.js); no imports, Node-tested by
   server/test/palette.test.mjs. */
export function piecePalette(data, w, h) {
  const st = (w + 3) & ~3;
  const idx = new Uint8Array(st * h);
  const pal = new Uint8Array(1024);
  const px = data.byteOffset % 4 === 0
    ? new Uint32Array(data.buffer, data.byteOffset, w * h)
    : new Uint32Array(new Uint8Array(data).buffer);
  const at = new Map();
  let n = 0, last = -1, lastK = 0;
  for (let y = 0; y < h; y++) {
    const ro = y * w, wo = y * st;
    for (let x = 0; x < w; x++) {
      const c = px[ro + x];
      if (c !== last) {
        let k = at.get(c);
        if (k === undefined) {
          if (n === 256) return null;
          k = n++;
          at.set(c, k);
          const s = (ro + x) * 4, o = k * 4;
          pal[o] = data[s]; pal[o + 1] = data[s + 1]; pal[o + 2] = data[s + 2]; pal[o + 3] = data[s + 3];
        }
        last = c; lastK = k;
      }
      idx[wo + x] = lastK;
    }
    for (let x = w; x < st; x++) idx[wo + x] = idx[wo + w - 1];
  }
  return { idx, pal, stride: st, n };
}
