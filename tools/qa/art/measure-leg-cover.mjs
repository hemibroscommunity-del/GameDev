/* DOES THE LEG ARMOUR COVER THE BODY'S BOOTS? (v2.3.2473)
 *
 * Owner (backlog triage 2026-09-14 §5.8): the COPPER leggings have "bluish
 * feet" on a jog east, and the answer is already settled -- "the body's SHOES
 * poke out beneath the copper leggings".  Copper is the steel art under a
 * MULTIPLY tint (0xFF9E58), and a multiply cannot ADD blue: out = texel x tint
 * and the tint's blue channel is 88/255, so every copper pixel is LESS blue
 * than the steel it came from.  Blue at the feet is therefore not the tint and
 * not the sheet -- it is the body's own blue-grey boot showing through.
 *
 * WHICH OF THE TWO FIXES IS RIGHT is what this measures, and they are very
 * different pieces of work:
 *
 *   (a) THE ERASE.  The renderer rubs the body out wherever worn armour covers
 *       it, dilated by 6px to swallow the art's misalignment (_maskedBodyFrame,
 *       v2.3.611).  If the boot pixels that show lie WITHIN 6px of the greaves'
 *       silhouette, the erase should already have taken them and something in
 *       the renderer is wrong -- a code fix.
 *   (b) THE ART.  If they lie well outside it, no dilation that is safe can
 *       reach them (widening it eats the bare body elsewhere), and the greaves'
 *       own boot rows have to be drawn further down -- an art fix.
 *
 * So this reports, per frame, how far past the greaves each visible boot pixel
 * is.  A distance histogram, not a count: "there are 40 boot pixels showing"
 * cannot tell (a) from (b), and that is the whole question.
 *
 * Chromium because it is the only image decoder in this sandbox (CLAUDE.md --
 * no PIL, no sharp).
 *
 *   node tools/qa/art/measure-leg-cover.mjs [--item=steelgreaves] [--pose=jog]
 *                                           [--dirs=east,south,...] [--dilate=6]
 */
import { chromium } from 'playwright-core';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const ITEM = arg('item', 'steelgreaves');
const POSE = arg('pose', 'jog');
const DIRS = arg('dirs', 'east,south,southwest,northeast,north').split(',');
const DILATE = +arg('dilate', '6');

const pinned = process.env.BT_CHROMIUM || '/opt/pw-browsers/chromium';
const browser = await chromium.launch(existsSync(pinned) ? { executablePath: pinned } : {});
const page = await browser.newPage();
const dataUrl = (p) => `data:image/png;base64,${readFileSync(p).toString('base64')}`;

for (const dir of DIRS) {
  const bodyP = `${REPO}/public/sprites/player/${POSE}-${dir}.png`;
  const legsP = `${REPO}/public/sprites/gear/legs/${ITEM}/${POSE}-${dir}.png`;
  if (!existsSync(bodyP) || !existsSync(legsP)) { console.log(`${dir}: sheet missing`); continue; }
  const out = await page.evaluate(async (o) => {
    const load = async (u) => {
      const i = new Image();
      await new Promise((res, rej) => { i.onload = res; i.onerror = rej; i.src = u; });
      const c = document.createElement('canvas');
      c.width = i.width; c.height = i.height;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(i, 0, 0);
      return { w: c.width, h: c.height, d: g.getImageData(0, 0, c.width, c.height).data };
    };
    const B = await load(o.body), L = await load(o.legs);
    if (B.h !== L.h) return { error: `frame heights differ ${B.h} vs ${L.h}` };
    const F = B.h, nB = Math.round(B.w / F), nL = Math.round(L.w / F);
    /* The SHOE test is playerSkins' own: a flat mid grey.  Copied rather than
       imported because this runs on raw sheets outside the app, and a drifted
       copy is caught by the control below -- a frame with no boots at all. */
    const isShoe = (d, i) => {
      const a = d[i + 3]; if (a <= 180) return false;
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      return (mx - mn) < 28 && mx >= 45 && mx < 140;
    };
    const rows = [];
    for (let f = 0; f < nB; f++) {
      const bx = f * F, lx = (f % nL) * F;
      /* ONLY THE BOOT BAND.  The flat-grey test above is playerSkins' own and
         it is right about boots; it is also true of a few shaded pixels on the
         upper body, and those sit 40+px from any greaves pixel, which turned a
         "how far past the armour" histogram into a report about the character's
         shoulders.  Measured before adding this: the grey bbox on jog-east ran
         y25..105 while the greaves ran y67..106.  So the band is the bottom
         quarter of THIS frame's figure -- derived from the art, not a
         constant, because the figure's height moves through the stride. */
      let fy0 = F, fy1 = -1;
      for (let y = 0; y < F; y++) {
        for (let x = 0; x < F; x++) {
          if (B.d[((y * B.w) + bx + x) * 4 + 3] > 20) { if (y < fy0) fy0 = y; if (y > fy1) fy1 = y; break; }
        }
      }
      const bandTop = (fy1 > fy0) ? Math.round(fy0 + 0.75 * (fy1 - fy0)) : 0;
      /* greaves alpha for this frame, as a flat mask */
      const cov = new Uint8Array(F * F);
      for (let y = 0; y < F; y++) {
        for (let x = 0; x < F; x++) if (L.d[((y * L.w) + lx + x) * 4 + 3] > 20) cov[y * F + x] = 1;
      }
      /* distance (Chebyshev, capped) from each shoe pixel to the nearest
         greaves pixel -- how far past the armour it is. */
      const hist = {}; let shoes = 0, uncovered = 0, worst = 0;
      const CAP = 24;
      for (let y = 0; y < F; y++) {
        for (let x = 0; x < F; x++) {
          if (y < bandTop) continue;
          const i = ((y * B.w) + bx + x) * 4;
          if (!isShoe(B.d, i)) continue;
          shoes++;
          if (cov[y * F + x]) continue;
          uncovered++;
          let dmin = CAP;
          for (let r = 1; r <= CAP && r < dmin; r++) {
            let hit = false;
            for (let dy = -r; dy <= r && !hit; dy++) {
              const yy = y + dy; if (yy < 0 || yy >= F) continue;
              for (let dx = -r; dx <= r; dx++) {
                if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
                const xx = x + dx; if (xx < 0 || xx >= F) continue;
                if (cov[yy * F + xx]) { hit = true; break; }
              }
            }
            if (hit) { dmin = r; break; }
          }
          hist[dmin] = (hist[dmin] || 0) + 1;
          if (dmin > worst) worst = dmin;
        }
      }
      const within = Object.entries(hist).reduce((a, [k, v]) => a + (+k <= o.dilate ? v : 0), 0);
      rows.push({ f, bandTop, shoes, uncovered, within, beyond: uncovered - within, worst, hist });
    }
    return { frames: nB, F, rows };
  }, { body: dataUrl(bodyP), legs: dataUrl(legsP), dilate: DILATE });

  if (out.error) { console.log(`${dir}: ${out.error}`); continue; }
  const tot = out.rows.reduce((a, r) => ({
    shoes: a.shoes + r.shoes, uncovered: a.uncovered + r.uncovered,
    within: a.within + r.within, beyond: a.beyond + r.beyond,
    worst: Math.max(a.worst, r.worst),
  }), { shoes: 0, uncovered: 0, within: 0, beyond: 0, worst: 0 });
  console.log(`\n${POSE}-${dir}  (${out.frames} frames, ${out.F}px)`);
  console.log(`  boot pixels on the body        : ${tot.shoes}`);
  console.log(`  NOT covered by the greaves     : ${tot.uncovered}`);
  console.log(`    ...within ${DILATE}px of them (the erase should take these): ${tot.within}`);
  console.log(`    ...FURTHER than ${DILATE}px   (only new art reaches these): ${tot.beyond}`);
  console.log(`  worst distance past the armour : ${tot.worst}px`);
  const bad = out.rows.filter((r) => r.beyond > 0).slice(0, 8);
  if (bad.length) console.log('  worst frames: ' + bad.map((r) => `f${r.f}:${r.beyond}px@≤${r.worst}`).join('  '));
}
await browser.close();
