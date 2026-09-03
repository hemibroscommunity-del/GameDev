/* Import the owner's fire-trail sheet into the repo's 8x256 strip contract.
 * v2.3.2239.  Run: node tools/import_fire_trail.mjs [src] [dest]
 *
 * WHY THIS IS NOT tools/import_fx_sheet.mjs.  That one normalises a sheet
 * that is ALREADY one row of N cells.  This art cannot arrive that way: the
 * engine wants 8 frames side by side (an 8:1 image) and no image generator
 * will produce that aspect, so the owner's sheet is a 4x2 GRID and the first
 * job here is to unwrap it into a row.
 *
 * THE TWO MEASUREMENTS THAT MAKE THAT SAFE (both taken from the sheet, not
 * assumed -- the numbers printed on every run are the audit):
 *
 *   1. THE ROWS SIT AT DIFFERENT HEIGHTS IN THEIR CELLS.  Measured on the
 *      delivered sheet: row 0's art ends at y=555 within its 627px cell,
 *      row 1's at y=374.  Cut naively on the grid lines, frame 4 -> frame 5
 *      would jump 180px and the loop would look broken.  So each ROW gets
 *      its own vertical offset, derived from that row's own baseline.
 *
 *   2. WITHIN a row, everything is already pinned.  Horizontal centres agree
 *      to 1px and baselines to 1px across the delivered sheet, which is what
 *      lets one transform serve a whole row.  ONE TRANSFORM PER ROW, never
 *      per frame: fitting each frame to its own bounding box would re-centre
 *      a flame that is supposed to be flickering, and the fire would breathe
 *      in place instead of licking.  (import_fx_sheet.mjs learned this the
 *      hard way on the stun ring; same rule, stated again because this file
 *      re-implements the crop rather than sharing it.)
 *
 * THE ANCHOR IS THE SCORCH PLATE, NOT THE SPRITE.  The flame is much taller
 * than it is wide (~281 vs ~237 on the delivered sheet) but only the plate
 * on the ground corresponds to the radius the worker tests.  Centring the
 * whole sprite on the patch would float the fire above the ground it burns
 * and break the "drawn at the radius the server tests" promise in
 * docs/specs/fire-trail.md.  So each cell is composed with the PLATE's
 * centre at the cell centre (128,128), and the renderer anchors 0.5/0.5 and
 * scales by PLATE_FRAC (printed below, baked into src/rendering/fxStrips.js).
 * The flame simply overflows upward inside its cell, which is free.
 *
 * The plate's own centre is measured as the WIDEST SCANLINE of the art: this
 * is a 3/4-view isometric plate, so its widest row is its middle, and that
 * is the point the patch's (x,y) means.
 *
 * Chromium is the only image decoder in this sandbox (no PIL / sharp /
 * ImageMagick), so Playwright does the pixel work -- same as every other
 * importer here.
 */
import { chromium } from 'playwright-core';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const src = process.argv[2] || 'assets/fx-source/fire-trail-grid.png';
const dest = process.argv[3] || 'public/sprites/fx/fire-trail-v1.png';
const COLS = 4, ROWS = 2, FRAMES = COLS * ROWS, CELL = 256;

const pinned = process.env.BT_CHROMIUM || '/opt/pw-browsers/chromium';
const browser = await chromium.launch(existsSync(pinned) ? { executablePath: pinned } : {});
const page = await browser.newPage();
const b64 = readFileSync(src).toString('base64');

const result = await page.evaluate(async ({ dataUrl, COLS, ROWS, FRAMES, CELL }) => {
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUrl; });
  const sc = document.createElement('canvas');
  sc.width = img.width; sc.height = img.height;
  const sctx = sc.getContext('2d', { willReadFrequently: true });
  sctx.drawImage(img, 0, 0);
  const d = sctx.getImageData(0, 0, sc.width, sc.height).data;
  const A = (x, y) => d[(y * sc.width + x) * 4 + 3];

  /* This art carries TRUE transparency (verified before writing this: 204631
     opaque px, every corner alpha 0, and not one pixel above 230 on its
     darkest channel -- so there is no white to key and no bright core a
     luminance key would have eaten).  Alpha alone is therefore the right
     content test, and a sheet that arrives flattened should be keyed before
     it gets here rather than guessed at in this file. */
  let anyAlpha = false;
  for (let i = 3; i < d.length; i += 4) { if (d[i] > 8) { anyAlpha = true; break; } }
  if (!anyAlpha) return { error: 'sheet has no transparency — key it before importing' };

  const CW = sc.width / COLS, CH = sc.height / ROWS;
  const boxes = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const x0 = Math.round(c * CW), y0 = Math.round(r * CH);
    const x1 = Math.round((c + 1) * CW), y1 = Math.round((r + 1) * CH);
    let minX = 1e9, maxX = -1, minY = 1e9, maxY = -1;
    /* widest scanline = the isometric plate's middle = the anchor row */
    let bestW = -1, bestY = -1;
    for (let y = y0; y < y1; y++) {
      let rowMin = 1e9, rowMax = -1;
      for (let x = x0; x < x1; x++) {
        if (A(x, y) > 8) { if (x < rowMin) rowMin = x; if (x > rowMax) rowMax = x; }
      }
      if (rowMax < 0) continue;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (rowMin < minX) minX = rowMin;
      if (rowMax > maxX) maxX = rowMax;
      const w = rowMax - rowMin + 1;
      if (w > bestW) { bestW = w; bestY = y; }
    }
    if (maxY < 0) return { error: 'empty cell at row ' + r + ' col ' + c };
    boxes.push({ r, c, x0, y0, minX, maxX, minY, maxY,
      plateW: bestW, plateY: bestY, plateCX: (minX + maxX) / 2 });
  }

  /* ONE transform per ROW (rule 2 above): take that row's widest plate and
     its mean anchor, so every frame in the row shares a scale and an origin
     and only the flame moves between them. */
  /* ANCHORS ARE MEASURED RELATIVE TO THEIR OWN GRID CELL, then averaged per
     row.  The first cut averaged ABSOLUTE sheet coordinates, which is
     meaningless across four columns that each sit at a different x -- the
     mean landed near the middle of the sheet and four output cells came out
     empty.  Relative first, average second; the per-frame audit caught it. */
  const rowStats = [];
  for (let r = 0; r < ROWS; r++) {
    const inRow = boxes.filter((b) => b.r === r);
    rowStats.push({
      plateW: Math.max(...inRow.map((b) => b.plateW)),
      ax: inRow.reduce((s, b) => s + (b.plateCX - b.x0), 0) / inRow.length,
      ay: inRow.reduce((s, b) => s + (b.plateY - b.y0), 0) / inRow.length,
      headRoom: Math.max(...inRow.map((b) => b.plateY - b.minY)),
    });
  }

  /* ONE scale for the WHOLE sheet, so the two rows cannot end up different
     sizes -- the plate must be the same width in every frame or the hazard
     would appear to grow and shrink under the player's feet. */
  const plateW = Math.max(...rowStats.map((s) => s.plateW));
  const headRoom = Math.max(...rowStats.map((s) => s.headRoom));
  const belowRoom = Math.max(...boxes.map((b) => b.maxY - b.plateY));
  /* The cell's half-height must hold the tallest flame above the anchor, and
     its half-width the widest half-plate.  Whichever binds, wins -- the art
     is never cropped to make a number nicer. */
  const scale = Math.min(
    (CELL / 2) / (headRoom + 1),
    (CELL / 2) / (belowRoom + 1),
    (CELL / 2) / (plateW / 2 + 1),
  );

  const out = document.createElement('canvas');
  out.width = CELL * FRAMES; out.height = CELL;
  const octx = out.getContext('2d');
  octx.imageSmoothingEnabled = false;          /* pixel art: never resample soft */

  for (let i = 0; i < FRAMES; i++) {
    const b = boxes[i];
    const rs = rowStats[b.r];
    const cellX = i * CELL;
    /* Blit ONLY this grid cell.  The first cut of this drew the whole sheet
       offset-and-clipped, which quietly pulled the NEIGHBOURING frames into
       every cell -- the output was 8 cells of solid art, and the per-frame
       audit below is what caught it.  A source rect is the fix and the
       clip stays as a second line of defence. */
    const sx = b.x0, sy = b.y0;
    const sw = Math.round(CW), sh = Math.round(CH);
    /* rs.ax/ax are already cell-relative, so this is the row's shared origin
       applied inside each cell. */
    const dx = cellX + CELL / 2 - rs.ax * scale;
    const dy = CELL / 2 - rs.ay * scale;
    octx.save();
    octx.beginPath();
    octx.rect(cellX, 0, CELL, CELL);
    octx.clip();
    octx.drawImage(sc, sx, sy, sw, sh, dx, dy, sw * scale, sh * scale);
    octx.restore();
  }

  /* Report what actually landed, per frame, from the OUTPUT — the audit that
     catches a transform that looked right and was not. */
  const octx2 = out.getContext('2d', { willReadFrequently: true });
  const od = octx2.getImageData(0, 0, out.width, out.height).data;
  const OA = (x, y) => od[(y * out.width + x) * 4 + 3];
  const frames = [];
  for (let i = 0; i < FRAMES; i++) {
    let minX = 1e9, maxX = -1, minY = 1e9, maxY = -1, bestW = -1, bestY = -1;
    for (let y = 0; y < CELL; y++) {
      let rmn = 1e9, rmx = -1;
      for (let x = i * CELL; x < (i + 1) * CELL; x++) {
        if (OA(x, y) > 8) { if (x < rmn) rmn = x; if (x > rmx) rmx = x; }
      }
      if (rmx < 0) continue;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (rmn < minX) minX = rmn; if (rmx > maxX) maxX = rmx;
      const w = rmx - rmn + 1;
      if (w > bestW) { bestW = w; bestY = y; }
    }
    frames.push({ i, top: minY, bot: maxY, plateW: bestW, plateY: bestY,
      plateCX: Math.round((minX + maxX) / 2) - i * CELL });
  }
  return {
    png: out.toDataURL('image/png'),
    srcW: sc.width, srcH: sc.height,
    scale, plateW, plateWOut: Math.round(plateW * scale), frames,
  };
}, { dataUrl: 'data:image/png;base64,' + b64, COLS, ROWS, FRAMES, CELL });

await browser.close();
if (result.error) { console.error('FAIL:', result.error); process.exit(1); }

mkdirSync(dirname(dest), { recursive: true });
writeFileSync(dest, Buffer.from(result.png.split(',')[1], 'base64'));

console.log(`source ${result.srcW}x${result.srcH} -> ${dest} ${CELL * FRAMES}x${CELL}`);
console.log(`scale ${result.scale.toFixed(4)}  plate ${result.plateW}px -> ${result.plateWOut}px in a ${CELL}px cell`);
console.log(`PLATE_FRAC = ${(result.plateWOut / CELL).toFixed(4)}   <- bake this into fxStrips.js`);
console.log('\nframe  top  bot  plateY  plateW  plateCX(should be 128)');
for (const f of result.frames) {
  console.log(`${String(f.i).padStart(4)}  ${String(f.top).padStart(4)} ${String(f.bot).padStart(4)}  ${String(f.plateY).padStart(6)}  ${String(f.plateW).padStart(6)}  ${String(f.plateCX).padStart(6)}`);
}
const py = result.frames.map((f) => f.plateY), pw = result.frames.map((f) => f.plateW);
const pcx = result.frames.map((f) => f.plateCX);
const bots = result.frames.map((f) => f.bot);
/* THE line that proves the two rows were reconciled: if the grid had been cut
   naively, the delivered sheet's rows would land 180px apart here. */
console.log(`\nart BOTTOM spread ${Math.min(...bots)}-${Math.max(...bots)} (want <=2 — the loop's footing)`);
console.log(`plate centre x   spread ${Math.min(...pcx)}-${Math.max(...pcx)} (want 128 exactly)`);
console.log(`plate width      spread ${Math.min(...pw)}-${Math.max(...pw)} (want <=2)`);
/* plateY is the widest SCANLINE and is deliberately not held to 1px: on a
   frame whose flame flares wide, the widest scanline can be the flame rather
   than the plate.  It is a diagnostic, not an acceptance bar -- `bot` above
   is what actually pins the footing. */
console.log(`(widest-scanline y ${Math.min(...py)}-${Math.max(...py)} — diagnostic only)`);
const flameTops = result.frames.map((f) => f.top);
console.log(`flame top range  ${Math.min(...flameTops)}-${Math.max(...flameTops)} (the flicker; want a real range)`);
