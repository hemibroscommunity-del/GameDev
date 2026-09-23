/* ═══ v2.3.2742: THE TEE HUGS THE BODY'S OUTER SILHOUETTE ═══
 *
 * Owner: "The characters shoulder outline on idle south is very thick and I
 * think it's the result of keyed changes on the shirt, not the original art."
 *
 * WHAT IT MEASURED AS.  On stand-south the tee is drawn exactly ONE texel
 * inside the body's silhouette along the top and both sides of the shoulders:
 * the body's own black outline at column 48 (sides) and row 43 (tops), the
 * tee's keyline at column 49 / row 44.  Two 1px black lines side by side read
 * as one 2px line -- twice the weight of every other outline on the figure,
 * and exactly on the shoulders.  seal-shirt-edges.mjs never touches it: it
 * writes only INSIDE the tee's bounding box on purpose (v2.3.1995), and this
 * seam is the one row and column just outside that box.
 *
 * THE RULE.  Wherever the tee's outer edge (its top, or either side) has 1-2
 * texels of the BODY'S DARK OUTLINE beyond it and then empty space -- the
 * literal shape of "the body's silhouette line, just past the shirt" -- the
 * tee's edge is shifted outward over it: the keyline lands on the body's
 * outline and the texel it vacates takes the shirt colour from behind it.
 * One line, at the true silhouette.  What it protects:
 *   - openings (neck hole, a cut-out crossing arm): beyond those edges is
 *     SKIN, not dark outline, so the run fails at its first texel;
 *   - lines inside the figure: the dark run must END in transparency, so
 *     only the figure's OUTER contour is ever a candidate;
 *   - the edges of OTHER parts (a neck's side outline): the run must have no
 *     bare skin beside it, across the direction it is hugged;
 *   - the silhouette: only texels that are already body get written, so the
 *     tee never overhangs the figure (mp-shirtarm's measure);
 *   - the hem: not hugged downward -- below it are trousers, not outline.
 *
 * WHY A SEPARATE PASS OVER THE SHIPPED SHEETS.  seal-shirt-edges.mjs rebuilds
 * from the pre-seal art at da249882^, and later tools (draw-crossing-sleeve,
 * draw-trailing-sleeve, raise-east-collar) have edited a few jog frames since,
 * so re-running the seal would quietly undo them (measured: 2-8 px per jog
 * sheet).  This reads the sheets as they are on disk instead, and it is
 * IDEMPOTENT: once the keyline sits on the body's outline there is no dark
 * texel beyond it, so a second run finds nothing (checked: it reports 0).
 * If the seal is ever re-run, run this after it.
 *
 * PNG ONLY, and the .webp beside it is deleted (same reason as the seal tool:
 * webpImage.js asks for the .webp first, and the WebPs are rebuilt by
 * .github/workflows/optimize-assets.yml).  BUMP GEAR_VERSION in
 * src/rendering/gearSheets.js and the shirt ?v= in characterPortrait.js.
 *
 * Run: node tools/gear/hug-shirt-silhouette.mjs [--dry]
 */
import { chromium } from 'playwright-core';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DRY = process.argv.includes('--dry');
const DIRS = ['south', 'southwest', 'east', 'northeast', 'north'];
const SHEETS = [];
for (const pose of ['stand', 'jog']) for (const dir of DIRS) {
  /* jog-east is PINNED to the artist's pixels by checksum (mp-shirtarm
     ARTIST_SHEET_SUM, after four reverted bakes of that sheet); the profile
     view is not where the doubled shoulder line shows, so it is left alone
     rather than re-opening that argument */
  if (pose === 'jog' && dir === 'east') continue;
  SHEETS.push({ pose, dir });
}

const pinned = process.env.BT_CHROMIUM || '/opt/pw-browsers/chromium';
const browser = await chromium.launch(existsSync(pinned) ? { executablePath: pinned } : {});
const page = await browser.newPage();
const enc = (buf) => 'data:image/png;base64,' + buf.toString('base64');

let total = 0;
for (const { pose, dir } of SHEETS) {
  const shirtPath = `${REPO}/public/sprites/gear/shirt/tshirt/${pose}-${dir}.png`;
  const bodyPath = `${REPO}/public/sprites/player/${pose}-${dir}.png`;
  if (!existsSync(shirtPath) || !existsSync(bodyPath)) { console.log(`  skip ${pose}-${dir}`); continue; }
  const out = await page.evaluate(async (o) => {
    const load = async (src) => {
      const i = new Image();
      await new Promise((r, j) => { i.onload = r; i.onerror = j; i.src = src; });
      const c = document.createElement('canvas');
      c.width = i.width; c.height = i.height;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(i, 0, 0);
      return { c, g, im: g.getImageData(0, 0, c.width, c.height) };
    };
    const S = await load(o.shirt);
    let B = await load(o.body);
    /* the body point-sampled to the shirt's size, exactly as the seal tool
       compares them (smoothing off: this is a mask comparison) */
    if (S.c.width !== B.c.width || S.c.height !== B.c.height) {
      if (B.c.width % S.c.width !== 0 || B.c.height % S.c.height !== 0) {
        return { error: `unscalable size shirt ${S.c.width}x${S.c.height} vs body ${B.c.width}x${B.c.height}` };
      }
      const c2 = document.createElement('canvas');
      c2.width = S.c.width; c2.height = S.c.height;
      const g2 = c2.getContext('2d', { willReadFrequently: true });
      g2.imageSmoothingEnabled = false;
      g2.drawImage(B.c, 0, 0, c2.width, c2.height);
      B = { c: c2, g: g2, im: g2.getImageData(0, 0, c2.width, c2.height) };
    }
    const W = S.c.width, H = S.c.height, fw = H;
    const nF = Math.round(W / fw);
    const sd = S.im.data, bd = B.im.data;
    const isShirt = (x, y) => sd[(y * W + x) * 4 + 3] > 40;
    const bodyDark = (x, y) => {
      const i = (y * W + x) * 4;
      return bd[i + 3] > 60 && (0.299 * bd[i] + 0.587 * bd[i + 1] + 0.114 * bd[i + 2]) < 70;
    };
    const empty = (x, y) => bd[(y * W + x) * 4 + 3] <= 60 && !isShirt(x, y);
    /* bare body beside a texel: opaque, not outline, not already under the tee */
    const skin = (x, y) => x >= 0 && x < W && y >= 0 && y < H
      && bd[(y * W + x) * 4 + 3] > 60 && !bodyDark(x, y) && !isShirt(x, y);
    const HUG_MAX = 2, SEG = 6;
    const px = (x, y) => { const i = (y * W + x) * 4; return [sd[i], sd[i + 1], sd[i + 2], sd[i + 3]]; };
    const put = (x, y, c) => { const i = (y * W + x) * 4; sd[i] = c[0]; sd[i + 1] = c[1]; sd[i + 2] = c[2]; sd[i + 3] = c[3]; };
    let hugged = 0;
    const perFrame = new Array(nF).fill(0);
    /* one direction at a time, collecting first and writing after, so a
       shift can never seed another within the same pass */
    const pass = (dx, dy) => {
      const moves = [];
      for (let f = 0; f < nF; f++) {
        const x0 = f * fw, x1 = x0 + fw;
        const inF = (x, y) => x >= x0 && x < x1 && y >= 0 && y < H;
        for (let y = 0; y < H; y++) for (let x = x0; x < x1; x++) {
          if (!isShirt(x, y)) continue;
          if (!inF(x + dx, y + dy) || isShirt(x + dx, y + dy)) continue;   /* not an outward edge */
          let k = 0;
          while (k < HUG_MAX) {
            const qx = x + dx * (k + 1), qy = y + dy * (k + 1);
            if (!inF(qx, qy) || !bodyDark(qx, qy) || isShirt(qx, qy)) break;
            /* a silhouette line runs ALONG the edge being hugged, so the texels
               beside it (across the direction of travel) are outline or empty
               -- never skin.  Skin beside it means it is the edge of something
               else: on the jog-north back view a column of the NECK's outline
               ends in empty space above the collar, and the first cut of this
               nudged the collar up into it (a white tick through the neck
               line).  That run has neck skin beside it, so it stops here. */
            if (dy !== 0 ? (skin(qx - 1, qy) || skin(qx + 1, qy)) : (skin(qx, qy - 1) || skin(qx, qy + 1))) break;
            k++;
          }
          if (!k) continue;
          const ex = x + dx * (k + 1), ey = y + dy * (k + 1);
          if (inF(ex, ey) && !empty(ex, ey)) continue;   /* not the outer contour */
          const seg = [];
          for (let j = 0; j < SEG; j++) {
            const sx = x - dx * j, sy = y - dy * j;
            if (!inF(sx, sy) || !isShirt(sx, sy)) break;
            seg.push(px(sx, sy));
          }
          moves.push({ x, y, k, seg, f });
        }
      }
      for (const m of moves) {
        /* shift the edge segment out by k: seg[0] (the keyline) lands on the
           body's outline, the rest follows, and the innermost k texels keep
           their colour -- the shirt simply reaches k texels further */
        for (let j = 0; j < m.seg.length; j++) put(m.x + dx * (m.k - j), m.y + dy * (m.k - j), m.seg[j]);
        /* a tee edge thinner than k+1 texels: fill what the shift left with
           the colour just inside the keyline (or the keyline itself) */
        for (let t = 0; t < m.k; t++) {
          const j = m.k - t;
          if (j >= m.seg.length) put(m.x + dx * t, m.y + dy * t, m.seg[m.seg.length - 1]);
        }
        hugged += m.k; perFrame[m.f] += m.k;
      }
    };
    pass(0, -1);   /* shoulder tops */
    pass(-1, 0);   /* left side */
    pass(1, 0);    /* right side */
    S.g.putImageData(S.im, 0, 0);
    return { hugged, nF, worst: Math.max(...perFrame), dataUrl: S.c.toDataURL('image/png') };
  }, { shirt: enc(readFileSync(shirtPath)), body: enc(readFileSync(bodyPath)) });

  if (out.error) { console.log(`  !! ${pose}-${dir}: ${out.error}`); continue; }
  total += out.hugged;
  console.log(`  ${pose}-${dir}: hugged ${out.hugged} texels over ${out.nF} frames (worst frame ${out.worst})`);
  if (!DRY && out.hugged > 0) {
    writeFileSync(shirtPath, Buffer.from(out.dataUrl.split(',')[1], 'base64'));
    const webp = shirtPath.replace(/\.png$/, '.webp');
    if (existsSync(webp)) { unlinkSync(webp); console.log(`     removed stale ${webp.split('/').pop()}`); }
  }
}
console.log(`\n${DRY ? '[dry] ' : ''}${total} texels hugged`);
await browser.close();
