/* ═══ v2.3.5015: A LOOK SHEET'S BYTES FROM ITS PICTURE, ON EITHER THREAD ═══
 *
 * A sheet of colour numbers ships as an opaque PNG (lookPalette.js buildSheet):
 * the numbers in red (and green, at 16 bits), the table two pixels an entry
 * below them.  The bytes the graphics chip and the bake worker read are those
 * numbers, then the table, then a header written into the last row(s).
 * lookPalette.js's `make` drew the <img> on a canvas and read it back on the
 * PAGE whenever the bytes were wanted -- for the chip (the sheet's first
 * upload) and for the masked bake's worker (lookArmour.js lookSheetForWorker),
 * the first time a pose's body is baked under armour: 38 ms held at once on
 * the stutter sweep's armour station (prewarmMaskedBodyFrames >
 * lookArmourPrewarm > make: getImageData, drawImage).  The worker now fetches
 * the file and decodes it itself (maskedBakeWorker.js 'lookSheetUrl'), and
 * both threads turn the picture's pixels into the bytes with this one function.
 *
 * No imports, so the worker and node can both use it.
 */

/** The sheet's bytes from its picture's RGBA pixels.
 *  px    the picture's pixels, W x (n + tableRows), straight RGBA
 *  spec  { W, n, E, rows, bits, head }  (head: the header's values, the
 *        sheet's book offset already in it) */
export function unpackLookSheet(px, spec) {
  const { W, n, E, rows, bits, head } = spec;
  const bpt = bits === 8 ? 1 : 2;
  const out = new Uint8Array(W * rows * bpt);
  for (let q = 0; q < W * n; q++) { out[q * bpt] = px[q * 4]; if (bpt === 2) out[q * 2 + 1] = px[q * 4 + 1]; }
  const t0 = W * n * bpt;
  for (let e = 0; e < E; e++) {
    const s = (W * n + 2 * e) * 4;
    out[t0 + e * 4] = px[s]; out[t0 + e * 4 + 1] = px[s + 1];
    out[t0 + e * 4 + 2] = px[s + 4]; out[t0 + e * 4 + 3] = px[s + 5];
  }
  const per = bits === 8 ? 2 : 1;
  for (let i = 0; i < head.length; i++) {
    const v = head[i];
    for (let b = 0; b < per; b++) {
      const p = i * per + b, x = p % W, y = rows - 1 - Math.floor(p / W);
      if (bits === 8) out[y * W + x] = b ? (v >> 8) & 255 : v & 255;
      else { out[(y * W + x) * 2] = v & 255; out[(y * W + x) * 2 + 1] = (v >> 8) & 255; }
    }
  }
  return out;
}

/* ═══ v2.3.5015: ...AND ITS HEADER ROWS ALONE ═══
   A sheet's header (its last rows) carries its offset in the armour's book
   of masks (head[68-69]), which changes the first time a pose's body is
   baked under armour (lookPalette.js setLookSheetBook).  The upload then sent
   the WHOLE sheet again, its bytes made again from the picture on the page
   (lookPalette.js make): 38 to 40 ms held at once on the stutter sweep's
   armour station (lookArmourFrame > setLookSheetBook > the upload > make).
   The header rows hold nothing but the header (the numbers end at row n, the
   table before the header rows: lookPalette.js sheetRows), so they are made
   here from the header alone, and only they are sent. */
/** The sheet's last rows that hold its header: { y0, hr, bytes } (bytes:
 *  W x hr texels, the header written exactly as unpackLookSheet writes it). */
export function lookHeadRows(spec) {
  const { W, rows, bits, head } = spec;
  const bpt = bits === 8 ? 1 : 2;
  const per = bits === 8 ? 2 : 1;
  const hr = Math.ceil((head.length * per) / W);
  const y0 = rows - hr;
  const out = new Uint8Array(W * hr * bpt);
  for (let i = 0; i < head.length; i++) {
    const v = head[i];
    for (let b = 0; b < per; b++) {
      const p = i * per + b, x = p % W, y = rows - 1 - Math.floor(p / W) - y0;
      if (bits === 8) out[y * W + x] = b ? (v >> 8) & 255 : v & 255;
      else { out[(y * W + x) * 2] = v & 255; out[(y * W + x) * 2 + 1] = (v >> 8) & 255; }
    }
  }
  return { y0, hr, bytes: out };
}

/** FNV-1a of the bytes (QA: the worker's and the page's compared). */
export function lookBytesHash(b) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < b.length; i++) { h ^= b[i]; h = Math.imul(h, 16777619) >>> 0; }
  return h;
}
