/* ═══ v2.3.1873: SEAL THE SHIRT'S EDGE SLIVERS ═══
 *
 * Owner: "South jog the shirt is slivering skin through it."
 *
 * The shirt is drawn straight over the bare body with no mask.  ARMOUR gets
 * one — v2.3.611 added the masked-body bake precisely because "the body pokes
 * past the plate edges" — but the shirt has never been in that list, so
 * wherever the tee's art is a pixel or two narrower than the body underneath,
 * skin shows along its edge.  It differs per frame, so on the run it shimmers.
 * Measured before writing this: all 26 jog-south frames have body visible
 * inside the shirt's own span.
 *
 * WHY THE ART AND NOT A RUNTIME MASK.  Adding the shirt to the masked-body
 * bake would fix it in ten lines, and it was rejected on cost: that bake
 * caches a texture per frame per loadout, and unlike armour EVERY player wears
 * a shirt, so it would add ~1.6MB of baked textures per pose-and-direction —
 * order 25-30MB across the walking set, on the platform where zone loading was
 * just split apart to save RAM (CLAUDE.md).  Sealing the sheet costs nothing
 * at runtime.
 *
 * THE RULE, and what protects the art that is SUPPOSED to show skin.  A tee is
 * meant to leave the neck, the forearms and the belly bare (v2.3.1480 says so
 * explicitly, which is why these sheets ship unsealed), and the artist also
 * cuts the crossing arm out of the shirt so it draws in front.  So this cannot
 * simply fill every gap.  It fills only THIN RUNS:
 *
 *   - scan each row (then each column) inside the shirt's own bounding box;
 *   - take maximal runs of "body visible, shirt absent";
 *   - fill a run only if it is at most MAXW px wide AND touches a shirt pixel
 *     at one end.
 *
 * The neck opening, the cut-out arm and the bare belly are all WIDE, so none
 * of them is eligible at MAXW=2 — the rule separates them by size rather than
 * by a hand-drawn region, which is what keeps it honest across ten sheets.
 * Filled pixels take the colour of the shirt pixel they touch, so they inherit
 * its shading and tint with the player's chosen colour (the same principle as
 * v2.3.1559's hem fill) instead of introducing a flat invented value.
 *
 * PNG ONLY, and the .webp beside it is DELETED by this tool.  webpImage.js
 * asks for the .webp first and falls back to the .png, and the WebPs are built
 * by .github/workflows/optimize-assets.yml — which triggers on the converter
 * changing, NOT on sprite changes.  So a regenerated PNG left next to its old
 * WebP would never be seen.  Deleting it makes the fresh PNG the file that
 * loads; re-run that workflow to put the WebP back.
 *
 * ONE PASS, DELIBERATELY, and this is the thing to know before re-running it.
 * Filling a run makes the pixel beside it newly adjacent to shirt, so a second
 * pass finds fresh candidates the first could not see — measured at 442px
 * against the first pass's 6267.  That is a cascade, not a remainder: run it
 * enough times and the shirt creeps over the arm and closes the neck, which is
 * exactly the art it is written to protect.  The shipped sheets are the result
 * of EXACTLY ONE pass over the original art (in git history if it is ever
 * wanted back).  Re-running this on the already-sealed sheets compounds; seal
 * from the original instead.
 *
 * Run: node tools/gear/seal-shirt-edges.mjs [--dry] [--maxw=2]
 */
import { chromium } from 'playwright-core';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DRY = process.argv.includes('--dry');
const MAXW = +((process.argv.find((a) => a.startsWith('--maxw=')) || '--maxw=2').split('=')[1]);

/* stand + jog only: the poses you move around in, the same scope v2.3.1559
   used for the hem fill.  The attack/gather poses composite through their own
   stand-in art and are a separate question. */
const DIRS = ['south', 'southwest', 'east', 'northeast', 'north'];
const SHEETS = [];
for (const pose of ['stand', 'jog']) for (const dir of DIRS) SHEETS.push({ pose, dir });

const pinned = process.env.BT_CHROMIUM || '/opt/pw-browsers/chromium';
const browser = await chromium.launch(existsSync(pinned) ? { executablePath: pinned } : {});
const page = await browser.newPage();
const enc = (f) => 'data:image/png;base64,' + readFileSync(f).toString('base64');

let totalFilled = 0, totalFrames = 0, sheetsChanged = 0;
for (const { pose, dir } of SHEETS) {
  const shirtPath = `${REPO}/public/sprites/gear/shirt/tshirt/${pose}-${dir}.png`;
  const bodyPath = `${REPO}/public/sprites/player/${pose}-${dir}.png`;
  if (!existsSync(shirtPath) || !existsSync(bodyPath)) {
    console.log(`  skip ${pose}-${dir} (missing sheet)`);
    continue;
  }
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
    /* The stand sheets ship at half the body's resolution (shirt 128px frames
       against a 256px body), so the body is point-sampled down to the shirt's
       size before the two are compared.  Smoothing off: this is a MASK
       comparison, and an interpolated edge would invent half-covered pixels
       that are neither body nor background. */
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
    const W = S.c.width, H = S.c.height, fw = H;      /* square frames */
    const nF = Math.round(W / fw);
    const sd = S.im.data, bd = B.im.data;
    const A = (d, x, y) => d[(y * W + x) * 4 + 3];
    const isShirt = (x, y) => A(sd, x, y) > 40;
    const isBody = (x, y) => A(bd, x, y) > 60;
    let filled = 0;
    const perFrame = [];

    for (let f = 0; f < nF; f++) {
      const x0 = f * fw, x1 = x0 + fw;
      /* the shirt's own bounding box — nothing outside it is ever touched */
      let bx0 = x1, bx1 = x0 - 1, by0 = H, by1 = -1;
      for (let y = 0; y < H; y++) for (let x = x0; x < x1; x++) {
        if (isShirt(x, y)) { if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; }
      }
      let fFilled = 0;
      if (bx1 < bx0) { perFrame.push(0); continue; }
      /* collect first, write after, so a fill can never seed another fill
         within the same pass (which would creep across the neck one px at a
         time on successive rows) */
      const todo = [];
      const scan = (runs) => {
        for (const r of runs) {
          if (r.len > o.maxw) continue;
          if (!r.touchesShirt) continue;
          for (const p of r.px) todo.push(p);
        }
      };
      /* rows */
      for (let y = by0; y <= by1; y++) {
        const runs = []; let cur = null;
        for (let x = bx0; x <= bx1; x++) {
          const vis = isBody(x, y) && !isShirt(x, y);
          if (vis) { if (!cur) cur = { px: [], len: 0, a: x }; cur.px.push({ x, y, src: null }); cur.len++; }
          else if (cur) { cur.b = x - 1; runs.push(cur); cur = null; }
        }
        if (cur) { cur.b = bx1; runs.push(cur); }
        for (const r of runs) {
          const ls = r.a - 1 >= x0 && isShirt(r.a - 1, y);
          const rs = r.b + 1 < x1 && isShirt(r.b + 1, y);
          r.touchesShirt = ls || rs;
          const sx = ls ? r.a - 1 : (rs ? r.b + 1 : -1);
          if (sx >= 0) for (const p of r.px) p.src = { x: sx, y };
        }
        scan(runs);
      }
      /* columns — catches the horizontal slivers along a shoulder top that a
         row scan cannot see */
      for (let x = bx0; x <= bx1; x++) {
        const runs = []; let cur = null;
        for (let y = by0; y <= by1; y++) {
          const vis = isBody(x, y) && !isShirt(x, y);
          if (vis) { if (!cur) cur = { px: [], len: 0, a: y }; cur.px.push({ x, y, src: null }); cur.len++; }
          else if (cur) { cur.b = y - 1; runs.push(cur); cur = null; }
        }
        if (cur) { cur.b = by1; runs.push(cur); }
        for (const r of runs) {
          const ts = r.a - 1 >= 0 && isShirt(x, r.a - 1);
          const bs = r.b + 1 < H && isShirt(x, r.b + 1);
          r.touchesShirt = ts || bs;
          const sy = ts ? r.a - 1 : (bs ? r.b + 1 : -1);
          if (sy >= 0) for (const p of r.px) p.src = { x, y: sy };
        }
        scan(runs);
      }
      for (const p of todo) {
        if (!p.src) continue;
        const di = (p.y * W + p.x) * 4, si = (p.src.y * W + p.src.x) * 4;
        if (sd[di + 3] > 40) continue;            /* already written this pass */
        sd[di] = sd[si]; sd[di + 1] = sd[si + 1]; sd[di + 2] = sd[si + 2]; sd[di + 3] = 255;
        filled++; fFilled++;
      }
      perFrame.push(fFilled);
    }
    S.g.putImageData(S.im, 0, 0);
    return { filled, nF, perFrame, dataUrl: S.c.toDataURL('image/png') };
  }, { shirt: enc(shirtPath), body: enc(bodyPath), maxw: MAXW });

  if (out.error) { console.log(`  !! ${pose}-${dir}: ${out.error}`); continue; }
  totalFilled += out.filled; totalFrames += out.nF;
  const max = Math.max(...out.perFrame), avg = (out.filled / out.nF).toFixed(1);
  console.log(`  ${pose}-${dir}: ${out.filled}px over ${out.nF} frames (avg ${avg}, worst frame ${max})`);
  if (out.filled > 0) sheetsChanged++;
  if (!DRY && out.filled > 0) {
    writeFileSync(shirtPath, Buffer.from(out.dataUrl.split(',')[1], 'base64'));
    const webp = shirtPath.replace(/\.png$/, '.webp');
    if (existsSync(webp)) { unlinkSync(webp); console.log(`     removed stale ${webp.split('/').pop()}`); }
  }
}
console.log(`\n${DRY ? '[dry] ' : ''}${totalFilled}px sealed over ${totalFrames} frames in ${sheetsChanged} sheet(s), MAXW=${MAXW}`);
await browser.close();
