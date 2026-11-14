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

/* ═══ v2.3.5244: A SHEET'S SHAPE FROM ITS MANIFEST, IN ONE PLACE ═══
   Moved here from lookPalette.js (buildSheet, sheetRows) unchanged, so that
   the asset door's gate (tools/guards/asset-door.test.mjs, card P) reads a
   sheet the way the game does -- this file has no imports, and GitHub's test
   job has no pixi.js -- and there is still one copy (the plan's rule 2).

   The header's 16-bit values: 0 scale (| 128 for 8 bits, | 64 drawn without
   mipmaps), 1 number rows, 2 the table's first row, 3 bits, 4 roles, 5-20
   each role's end, 21-65 each role's entry / ref / under, 66 the refs' scale
   (ref / refScale, P4's fractional refs), 67 the kind (LOOK_KIND_IDS), 68-69
   the sheet's offset in a book (P3's masks, setLookSheetBook), low and high. */
/* a kind's number in the header (the shader's per-kind hook, registerLookKind) */
export const LOOK_KIND_IDS = Object.freeze({ body: 0, shirt: 1, armour: 2, head: 3, 'shirt-drawing': 4 });
export const LOOK_MAX_ROLES = 15;
const HEAD_VALUES = 5 + 16 + 3 * LOOK_MAX_ROLES + 4;
/** A sheet's rows on the chip: its numbers, its table (two RG texels an
 *  entry at 16 bits, four R texels at 8), its header in the last row(s); the
 *  stand's texture (resolution 2) an even number of rows. */
export function lookSheetRows(W, n, E, bits, ds) {
  const bpt = bits === 8 ? 1 : 2;
  const tRows = Math.ceil((E * 4 / bpt) / W);
  const hRows = Math.ceil((HEAD_VALUES * 2 / bpt) / W);
  let rows = n + tRows + hRows;
  if (ds === 2 && (rows & 1)) rows++;
  return rows;
}
/** The spec unpackLookSheet takes, from the sheet's manifest row `m` (w, h,
 *  tableRows, entries, bits, ds, mip, ends, refScale, kind), its set's
 *  `roles` and its offset in the armour's book. */
export function lookSheetSpec(m, roles, book = 0) {
  const W = m.w, n = m.h, T = m.tableRows, E = m.entries;
  const bits = m.bits === 8 ? 8 : 16;
  const rows = lookSheetRows(W, n, E, bits, m.ds);
  const head = new Array(HEAD_VALUES).fill(0);
  head[0] = m.ds | (bits === 8 ? 128 : 0) | (m.mip === false ? 64 : 0);   /* v2.3.3757: 64, a sheet drawn without mipmaps (the stand-ins) */ head[1] = n; head[2] = n; head[3] = bits; head[4] = roles.length;
  const ends = m.ends || [];
  for (let r = 0; r < 16; r++) head[5 + r] = ends[Math.min(r, ends.length - 1)] != null ? ends[Math.min(r, ends.length - 1)] : E;
  roles.forEach((ro, i) => { head[21 + 3 * i] = ro.entry; head[22 + 3 * i] = Math.round(ro.ref || 0); head[23 + 3 * i] = ro.under || 0; });
  head[66] = Math.max(1, Math.round(m.refScale || 1));
  head[67] = LOOK_KIND_IDS[m.kind] || 0;
  head[68] = book & 65535; head[69] = Math.floor(book / 65536) & 65535;
  return { W, n, T, E, rows, bits, head };
}
