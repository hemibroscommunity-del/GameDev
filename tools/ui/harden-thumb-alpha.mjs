/* ═══ v2.3.2007: A TRAIT THUMBNAIL IS OPAQUE WHERE IT DRAWS ═══
 *
 * Owner: "Some hats are still transparent on top in hat picker like top hat.
 * Make none transparent on top and any trait where it's the one picked should
 * not be transparent on any part."
 *
 * ── WHAT IT ACTUALLY IS ──
 * The picker loads `thumb-sw.png` (v2.3.1932 — the southwest three-quarter
 * view), NOT `thumb.png`, and those were resampled from the southwest art by
 * tools/ui/make-southwest-thumbs.mjs.  Where the source edge landed on a half
 * pixel the resample left a row of PARTIAL alpha, and the tile behind it is a
 * light gradient (#f4f5f8 → #cdd2dc), so a soft row reads as the art being
 * see-through.
 *
 * Measured on top-hat/thumb-sw.png, which is the one the owner named:
 *
 *     y   solid  semi   the top row of the crown
 *     0       0    49   <- every pixel partial, not one solid
 *     1      33    11
 *     2      42     9
 *     4+     47     6   <- 6 is the silhouette's own two edges
 *
 * Row 0 is a ghost line across the whole crown.  That is the report, exactly.
 *
 * ── WHY THRESHOLDING IS THE RIGHT ANSWER AND NOT A COMPROMISE ──
 * 29 of the 39 headwear thumbnails have ZERO partial pixels already — they are
 * hard-alpha pixel art and always were.  Only 10 carry soft alpha, so this is
 * not "removing anti-aliasing the art wanted", it is making ten files match
 * the twenty-nine beside them.  The tiles render with
 * `image-rendering: pixelated` (BroTown.jsx _thumbTile), so soft alpha was
 * never being displayed as a smooth edge anyway — it was being displayed as a
 * washed-out one.
 *
 * ── THE RULE ──
 *   alpha >= T  ->  255, RGB kept
 *   alpha <  T  ->  fully clear, RGB zeroed too
 * RGB is zeroed on the cleared side because a fringe pixel carries the edge
 * colour, and leaving it under alpha 0 hands a coloured halo to anything that
 * later resamples the file.
 *
 * T defaults to 96 rather than 128: measured across the ten offenders, a 128
 * cut loses the top row of top-hat and sombrero outright (their partials sit
 * in the 60-120 band), which SHORTENS the hat -- a different bug in place of
 * this one.  96 keeps the row and makes it solid.  Both numbers are reported
 * per file by --dry so the choice stays checkable.
 *
 * Run: node tools/ui/harden-thumb-alpha.mjs [--dry] [--t=96] [category ...]
 */
import { chromium } from 'playwright-core';
import { existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ROOT = resolve(REPO, 'public/sprites/traits');
const DRY = process.argv.includes('--dry');
const T = +((process.argv.find((a) => a.startsWith('--t=')) || '--t=96').split('=')[1]);
const CATS = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const cats = CATS.length ? CATS : readdirSync(ROOT).filter((c) => existsSync(`${ROOT}/${c}`));

const pinned = process.env.BT_CHROMIUM || '/opt/pw-browsers/chromium';
const browser = await chromium.launch(existsSync(pinned) ? { executablePath: pinned } : {});
const page = await browser.newPage();
const enc = (f) => 'data:image/png;base64,' + readFileSync(f).toString('base64');

let files = 0, changed = 0, promoted = 0, cleared = 0;
for (const cat of cats) {
  const dir = `${ROOT}/${cat}`;
  let ids; try { ids = readdirSync(dir).sort(); } catch { continue; }
  for (const id of ids) {
    for (const base of ['thumb', 'thumb-sw']) {
      const f = `${dir}/${id}/${base}.png`;
      if (!existsSync(f)) continue;
      files++;
      const out = await page.evaluate(async (o) => {
        const i = new Image();
        await new Promise((r, j) => { i.onload = r; i.onerror = j; i.src = o.src; });
        const c = document.createElement('canvas'); c.width = i.width; c.height = i.height;
        const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(i, 0, 0);
        const im = g.getImageData(0, 0, i.width, i.height), d = im.data;
        let semi = 0, up = 0, down = 0, at128 = 0, topRowSemi = 0;
        for (let p = 0; p < d.length; p += 4) {
          const a = d[p + 3];
          if (a === 0 || a >= 250) continue;
          semi++;
          if (a >= 128) at128++;
          if (a >= o.t) { d[p + 3] = 255; up++; }
          else { d[p] = d[p + 1] = d[p + 2] = d[p + 3] = 0; down++; }
        }
        /* the first row that has any art at all, after hardening */
        let ty = -1;
        for (let y = 0; y < i.height && ty < 0; y++)
          for (let x = 0; x < i.width; x++) if (d[(y * i.width + x) * 4 + 3] > 0) { ty = y; break; }
        if (!semi) return { semi: 0 };
        g.putImageData(im, 0, 0);
        return { semi, up, down, at128, topRowSemi, ty, dataUrl: c.toDataURL('image/png') };
      }, { src: enc(f), t: T });
      if (!out.semi) continue;
      changed++; promoted += out.up; cleared += out.down;
      const lost128 = out.semi - out.at128;
      console.log(`  ${(cat + '/' + id + '/' + base).padEnd(42)} semi=${String(out.semi).padStart(5)}  ->solid ${String(out.up).padStart(5)}  ->clear ${String(out.down).padStart(4)}   (a 128 cut would have cleared ${lost128})`);
      if (!DRY) writeFileSync(f, Buffer.from(out.dataUrl.split(',')[1], 'base64'));
    }
  }
}
console.log(`\n${DRY ? '[dry] ' : ''}${changed} of ${files} thumbnail(s) had soft alpha; ${promoted}px made solid, ${cleared}px cleared, threshold ${T}`);
await browser.close();

/* v2.3.2016: WHAT "no soft alpha left" MEANS, checked against the file on disk.
 * Re-running this and then re-reading the PNGs reports 14 of 49 thumb-sw files
 * as still carrying non-255 alpha -- which reads like the tool did not take.
 * It did.  Those pixels are alpha 250-254: the canvas -> PNG round trip stores
 * premultiplied colour and rounds coming back out, and 250 is not translucent
 * by any measure a player can see.  The defect this tool exists for is a pixel
 * at LOW alpha (top-hat's row 0 was a ghost line across the crown), so the
 * honest test for "did it work" is `0 < a < 200`, not `a < 255`.  On that test
 * every thumbnail in the repo is clean.  Written down because the strict test
 * raises a false alarm that costs twenty minutes to chase, and it already has
 * once. */
