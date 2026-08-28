/* ═══ v2.3.2066: A SLEEVE ON THE TRAILING ARM, jog-east frames 0-6 ═══
 *
 * Owner, four times now: "The bare arm showing while jogging east wearing t
 * shirt is still an issue."
 *
 * ── WHAT IS ACTUALLY WRONG ──
 * The tee is a separate sheet drawn straight over the body (v2.3.756 retired
 * the baked shirt).  On jog-east the artist drew a sleeve on the NEAR arm and
 * none on the FAR one: on frames 0-6 the trailing arm swings back and down and
 * leaves the shirt's back edge as a hard vertical cut with bare skin butted
 * against it, while the leading arm on the same frame carries a correct sleeve.
 * Measured on the sealed sheets — bare skin, behind the shirt's rear edge, in
 * the 8 rows below the shirt's own top row, head columns excluded (this is
 * v2.3.1999's window, widened past the shirt's bounding box because that is
 * where the bare arm actually is):
 *
 *     frame  0   1   2   3   4   5   6  |  7  8  9 10 11 12 13
 *     bare  13  28  30  39  22  19  14  |  0  3  0  0  0  2  6
 *
 * That split IS the report, it reproduces v2.3.1999's independently, and it
 * says the defect is in the SHEET rather than in the compositor.
 *
 * ── WHY THIS IS THE THIRD ATTEMPT, AND WHAT THE FIRST TWO LEFT ──
 * v2.3.1986 built a "crossing arm" detector, aimed it at frames 8-11, found
 * the jaw instead (head, neck and arms are one connected skin region) and
 * painted a shirt-coloured blob on the character's FACE.  Reverted in play.
 * v2.3.1999 re-measured and named the real target: the TRAILING arm, frames
 * 0-6.  v2.3.2016 then built the fix that diagnosis asks for — breadth-first
 * distance from the shirt's edge, filled to depth 4-5 with a black hem — and
 * threw it away because it looked WORSE than the bug: a ragged spiky left edge
 * with detached white pips out on the arm's antialiased fringe.  It is written
 * up as TRAPS §30, and it leaves two conditions that this tool is built to:
 *
 *   1. "A sleeve on an arm swung back-and-down is a band running PERPENDICULAR
 *      TO THE ARM'S AXIS, and every cheap rule available here produces a band
 *      that is roughly vertical instead."  So the cut here is taken along the
 *      limb's own principal axis, not along the shirt's edge.  The shirt edge
 *      and the arm axis happen to agree on the frames that were never broken,
 *      which is exactly why a rule tuned on those frames flatters itself.
 *
 *   2. The pips.  v2.3.2016 filled at full opacity wherever the body was
 *      "solid enough", so every half-covered pixel on the arm's antialiased
 *      fringe became either a hard white dot or a hard hole.  Here each written
 *      pixel takes THE BODY'S OWN ALPHA at that pixel.  The shirt draws over
 *      the body, so a sleeve pixel at the body's coverage composites to exactly
 *      the body's coverage in a different colour: the figure's silhouette is
 *      bit-for-bit what it was, the fringe stays a fringe, and no pip can form
 *      because nothing is ever drawn where the body is not already there.
 *      This is also why "most of the bare arm lies OUTSIDE the shirt's bounding
 *      box" (v2.3.1999) stops being the dangerous direction it looked like:
 *      the sleeve adds pixels to the SHIRT, never to the CHARACTER.
 *
 * ── THE RULE ──
 * Per frame, and never crossing any of the invariants below:
 *
 *   - backEdge(y): the shirt's rearmost pixel on row y (rearmost = smallest x
 *     on an east-facing sheet).
 *   - REGION: uncovered body inside the shirt's own row band and strictly
 *     behind backEdge(y) on its row.  Skin only — the body's own near-black
 *     keyline joins the region for connectivity but is NEVER painted, so the
 *     arm keeps the outline the pine bow lost (v2.3.2010).
 *   - LIMB: the part of REGION connected to the shirt.  A detached hip speck
 *     is not a limb.
 *   - ANCHOR: the TOP ROWS of the LARGEST cluster of seam pixels (where the
 *     limb touches the shirt).  Both halves of that are scar tissue.
 *     LARGEST, not topmost single pixel: one stray skin pixel behind the
 *     collar is on the seam too, and anchoring on it put the sleeve up on the
 *     trapezius with the arm still bare underneath.
 *     TOP ROWS of it, not its centroid: a shoulder is the top of an arm, and
 *     on frames 11-13 the trailing arm has swung down and hangs PARALLEL to
 *     the shirt's back edge, touching it for its whole length — so the seam
 *     there is the entire arm, its centroid is halfway down the limb, and the
 *     first run of this tool painted a white SLAB across the middle of the
 *     forearm on all three.  Anchoring on the seam's top rows fixes those
 *     frames without a frame list, which matters: a frame gate was tried
 *     first (reject the frame when the limb extends too far back past the
 *     anchor) and the measurement killed it — the separation it assumed does
 *     not exist, frame 1 sits at -3.4 against frame 13's -2.9.  The anchor was
 *     the bug, not the frames.
 *   - AXIS: the limb's principal component, oriented away from the anchor.
 *   - SLEEVE: limb pixels whose distance ALONG the axis from the anchor is in
 *     [-2, REACH].  The hem is the last pixel of that span, in the tee's own
 *     keyline value, so the sleeve ends in a line across the arm rather than
 *     fading out.
 *
 * INVARIANTS, asserted per frame — the tool exits non-zero if any fails:
 *   (a) nothing is written above the shirt's own topmost row;
 *   (b) nothing is written on a column whose body continues up out of the
 *       collar (the v2.3.1986 head test — the one it did not have);
 *   (c) nothing is written where the body is transparent, so the composite
 *       silhouette is unchanged;
 *   (d) nothing is written where the shirt already has a pixel.
 *
 * ── SCOPE: jog-east ONLY ──
 * Which also fixes jog-WEST, because west is east mirrored (playerSkins
 * MIRRORED_SOURCE_DIRS).  The other facings are deliberately NOT swept:
 * "trailing arm" is only meaningful on a profile, and this subsystem has
 * already had one fix reverted in play for generalising past its report.  The
 * other jog sheets are MEASURED instead of guessed at, by the same metric, in
 * tools/qa/mp/mp-shirtarm.mjs — a number, not an assumption.
 *
 * ── IDEMPOTENT, LIKE THE SEAL ──
 * The source is the sheet at SRC_REV, not whatever is on disk.  Painting the
 * sleeve makes the pixel beside it newly adjacent to shirt, so a second pass
 * over its own output would walk the sleeve down the arm.  Running this ten
 * times gives the same file.
 *
 * PNG ONLY, and any .webp beside it is DELETED — webpImage.js asks for the
 * .webp first, so a regenerated PNG left next to a stale WebP never loads.
 *
 * BUMP GEAR_VERSION in src/rendering/gearSheets.js after running this.
 *
 * Run: node tools/gear/draw-trailing-sleeve.mjs [--dry] [--reach=6]
 */
import { chromium } from 'playwright-core';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DRY = process.argv.includes('--dry');
/* How far the sleeve runs down the arm, in px ALONG the axis.  6 was chosen by
   rendering 3/4/5/6/7/8 at 20x and looking: below 5 the cap is a sliver on the
   frames where the shoulder sits high (3 and 4), and at 7+ it passes the
   LEADING arm's own sleeve and the tee starts to read as short-sleeved rather
   than a tee.  The bare-shoulder metric agrees without settling it — 31 px
   residual at 5, 19 at 6, 14 at 7 — which is why the number came from the
   picture and the metric only has to confirm the direction. */
const REACH = +((process.argv.find((a) => a.startsWith('--reach=')) || '--reach=6').split('=')[1]);

/* v2.3.1995 (c20c6ec5) is the last commit that touched these sheets: the
   artist's art, sealed.  That is this tool's input, forever. */
const SRC_REV = 'c20c6ec5';

/* east only.  See the scope note in the header. */
const SHEETS = [{ pose: 'jog', dir: 'east', back: -1 }];

function originalSheet(pose, dir) {
  const rel = `public/sprites/gear/shirt/tshirt/${pose}-${dir}.png`;
  try {
    return execFileSync('git', ['show', `${SRC_REV}:${rel}`], { cwd: REPO, maxBuffer: 64 << 20 });
  } catch (e) {
    console.error(`\n!! cannot read ${rel} at ${SRC_REV} — this clone does not have that history.`);
    process.exit(2);
  }
}

const pinned = process.env.BT_CHROMIUM || '/opt/pw-browsers/chromium';
const browser = await chromium.launch(existsSync(pinned) ? { executablePath: pinned } : {});
const page = await browser.newPage();
const enc = (buf) => 'data:image/png;base64,' + buf.toString('base64');

let bad = 0;
for (const { pose, dir, back } of SHEETS) {
  const outPath = `${REPO}/public/sprites/gear/shirt/tshirt/${pose}-${dir}.png`;
  const bodyPath = `${REPO}/public/sprites/player/${pose}-${dir}.png`;
  if (!existsSync(bodyPath)) { console.log(`  skip ${pose}-${dir} (no body sheet)`); continue; }

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
    const B = await load(o.body);
    if (S.c.width !== B.c.width || S.c.height !== B.c.height) {
      return { error: `size mismatch shirt ${S.c.width}x${S.c.height} vs body ${B.c.width}x${B.c.height}` };
    }
    const W = S.c.width, H = S.c.height, F = H;      /* square frames */
    const nF = Math.round(W / F);
    const sd = S.im.data, bd = B.im.data;
    const KEY_T = 70;      /* body luminance below this is its own keyline */
    const HEM = [26, 20, 18];   /* the tee's own outline value */

    const perFrame = [];
    let wrote = 0, hemPx = 0;

    for (let f = 0; f < nF; f++) {
      const x0 = f * F;
      const idx = (x, y) => (y * W + x0 + x) * 4;
      const isShirt = (x, y) => sd[idx(x, y) + 3] > 24;
      const isBody = (x, y) => bd[idx(x, y) + 3] > 24;
      const lumB = (x, y) => { const i = idx(x, y); return 0.299 * bd[i] + 0.587 * bd[i + 1] + 0.114 * bd[i + 2]; };
      const isPants = (x, y) => { const i = idx(x, y); return bd[i + 1] > bd[i]; };

      /* the shirt's row band and its rear edge per row */
      let top = F, bot = -1;
      const backEdge = new Int32Array(F).fill(-1);
      for (let y = 0; y < F; y++) {
        let e = -1;
        for (let x = 0; x < F; x++) if (isShirt(x, y)) { if (e < 0 || (o.back < 0 ? x < e : x > e)) e = x; }
        backEdge[y] = e;
        if (e >= 0) { if (y < top) top = y; if (y > bot) bot = y; }
      }
      if (bot < 0) { perFrame.push({ f, n: 0, why: 'no shirt' }); continue; }

      /* (b) columns whose body continues up out of the collar are HEAD */
      const headCol = new Uint8Array(F);
      for (let x = 0; x < F; x++) for (let y = 0; y < top; y++) if (isBody(x, y)) { headCol[x] = 1; break; }

      /* REGION: uncovered body, in the shirt's row band, behind its rear edge */
      const reg = new Uint8Array(F * F);      /* 1 = skin, 2 = keyline (never painted) */
      const pts = [];
      for (let y = top; y <= bot; y++) {
        const e = backEdge[y];
        if (e < 0) continue;
        for (let x = 0; x < F; x++) {
          if (o.back < 0 ? x >= e : x <= e) continue;
          if (headCol[x] || !isBody(x, y) || isShirt(x, y)) continue;
          if (lumB(x, y) < KEY_T) { reg[y * F + x] = 2; continue; }
          if (isPants(x, y)) continue;
          reg[y * F + x] = 1; pts.push([x, y]);
        }
      }
      if (pts.length < 12) { perFrame.push({ f, n: 0, why: 'no trailing skin' }); continue; }

      /* seam = region pixels touching the shirt; LIMB = what is connected to it */
      const seam = [];
      for (const [x, y] of pts) {
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < F && ny < F && isShirt(nx, ny)) { seam.push([x, y]); dy = 2; break; }
        }
      }
      if (!seam.length) { perFrame.push({ f, n: 0, why: 'no seam' }); continue; }
      const keep = new Uint8Array(F * F);
      const st = [];
      for (const [x, y] of seam) { const p = y * F + x; if (!keep[p]) { keep[p] = 1; st.push(p); } }
      while (st.length) {
        const p = st.pop(), py = (p / F) | 0, px = p % F;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = px + dx, ny = py + dy;
          if (nx < 0 || ny < 0 || nx >= F || ny >= F) continue;
          const n = ny * F + nx;
          if (reg[n] && !keep[n]) { keep[n] = 1; st.push(n); }
        }
      }

      /* ANCHOR: the LARGEST cluster of seam pixels... */
      const seamSet = new Uint8Array(F * F);
      for (const [x, y] of seam) if (keep[y * F + x]) seamSet[y * F + x] = 1;
      const seen = new Uint8Array(F * F);
      let bestCl = null;
      for (const [x, y] of seam) {
        const s0 = y * F + x;
        if (!seamSet[s0] || seen[s0]) continue;
        const cl = [s0]; seen[s0] = 1;
        for (let k = 0; k < cl.length; k++) {
          const p = cl[k], py = (p / F) | 0, px = p % F;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const nx = px + dx, ny = py + dy;
            if (nx < 0 || ny < 0 || nx >= F || ny >= F) continue;
            const n = ny * F + nx;
            if (seamSet[n] && !seen[n]) { seen[n] = 1; cl.push(n); }
          }
        }
        if (!bestCl || cl.length > bestCl.length) bestCl = cl;
      }
      if (!bestCl) { perFrame.push({ f, n: 0, why: 'no seam cluster' }); continue; }
      /* ...and within that cluster, its TOPMOST rows.  A shoulder is the top of
         an arm.  Averaging the whole cluster works only while the seam IS a
         shoulder; on the frames where the trailing arm has swung down and hangs
         PARALLEL to the shirt's back edge it touches the shirt for its whole
         length, the cluster runs ~18px, and the average lands halfway down the
         limb — which put a white slab across the middle of the forearm on
         frames 11-13 the first time this tool ran.  The figure is upright in
         every jog frame, so "topmost rows" is the shoulder on all of them. */
      let clTop = F;
      for (const p of bestCl) { const y = (p / F) | 0; if (y < clTop) clTop = y; }
      let ax = 0, ay = 0, na = 0;
      for (const p of bestCl) { const y = (p / F) | 0; if (y <= clTop + 1) { ax += p % F; ay += y; na++; } }
      ax /= na; ay /= na;

      /* AXIS: the limb's principal component, pointed away from the anchor */
      let cx = 0, cy = 0, n = 0;
      for (let y = top; y <= bot; y++) for (let x = 0; x < F; x++) {
        if (keep[y * F + x] && reg[y * F + x] === 1) { cx += x; cy += y; n++; }
      }
      if (n < 12) { perFrame.push({ f, n: 0, why: 'limb too small' }); continue; }
      cx /= n; cy /= n;
      let sxx = 0, syy = 0, sxy = 0;
      for (let y = top; y <= bot; y++) for (let x = 0; x < F; x++) {
        if (!keep[y * F + x] || reg[y * F + x] !== 1) continue;
        const dx = x - cx, dy = y - cy; sxx += dx * dx; syy += dy * dy; sxy += dx * dy;
      }
      sxx /= n; syy /= n; sxy /= n;
      const tr = sxx + syy, det = sxx * syy - sxy * sxy;
      const lam = tr / 2 + Math.sqrt(Math.max(0, tr * tr / 4 - det));
      let ux, uy;
      if (Math.abs(sxy) < 1e-9) { ux = sxx >= syy ? 1 : 0; uy = sxx >= syy ? 0 : 1; }
      else { ux = sxy; uy = lam - sxx; }
      const m = Math.hypot(ux, uy) || 1; ux /= m; uy /= m;
      if ((cx - ax) * ux + (cy - ay) * uy < 0) { ux = -ux; uy = -uy; }

      /* extent along the axis and across it, reported so the shape of every
         limb this fires on is on the record rather than assumed. */
      let tMin = 1e9, tMax = -1e9, sMin = 1e9, sMax = -1e9;
      for (let y = top; y <= bot; y++) for (let x = 0; x < F; x++) {
        if (!keep[y * F + x] || reg[y * F + x] !== 1) continue;
        const t = (x - ax) * ux + (y - ay) * uy, s = (x - ax) * -uy + (y - ay) * ux;
        if (t < tMin) tMin = t; if (t > tMax) tMax = t;
        if (s < sMin) sMin = s; if (s > sMax) sMax = s;
      }
      const along = tMax - tMin, across = sMax - sMin;

      /* SLEEVE, and the four invariants on every pixel of it */
      const paint = [], hem = [];
      let bare = 0;
      for (let y = top; y <= bot; y++) for (let x = 0; x < F; x++) {
        const p = y * F + x;
        if (!keep[p] || reg[p] !== 1) continue;
        const t = (x - ax) * ux + (y - ay) * uy;
        if (t < -2 || t > o.reach) continue;
        bare++;
        if (y < top) return { error: `frame ${f}: sleeve above the shirt's top row` };          /* (a) */
        if (headCol[x]) return { error: `frame ${f}: sleeve on a head column (${x})` };          /* (b) */
        if (!isBody(x, y)) return { error: `frame ${f}: sleeve outside the body` };              /* (c) */
        if (isShirt(x, y)) return { error: `frame ${f}: sleeve over existing shirt` };           /* (d) */
        (t > o.reach - 1.2 ? hem : paint).push(p);
      }

      perFrame.push({ f, n: bare, hem: hem.length, ax: +ax.toFixed(1), ay: +ay.toFixed(1),
        ux: +ux.toFixed(2), uy: +uy.toFixed(2), along: +along.toFixed(1), across: +across.toFixed(1),
        tMin: +tMin.toFixed(1) });

      if (!o.dry) {
        for (const p of paint) {
          const py = (p / F) | 0, px = p % F, i = idx(px, py);
          sd[i] = 255; sd[i + 1] = 255; sd[i + 2] = 255; sd[i + 3] = bd[i + 3]; wrote++;
        }
        for (const p of hem) {
          const py = (p / F) | 0, px = p % F, i = idx(px, py);
          sd[i] = HEM[0]; sd[i + 1] = HEM[1]; sd[i + 2] = HEM[2]; sd[i + 3] = bd[i + 3]; hemPx++;
        }
      }
    }

    if (!o.dry) S.g.putImageData(S.im, 0, 0);
    return { perFrame, wrote, hemPx, nF, png: o.dry ? null : S.c.toDataURL('image/png') };
  }, { shirt: enc(originalSheet(pose, dir)), body: enc(readFileSync(bodyPath)), back, reach: REACH, dry: DRY });

  if (out.error) { console.error(`!! ${pose}-${dir}: ${out.error}`); bad++; continue; }

  console.log(`\n${pose}-${dir}  (${out.nF} frames, reach=${REACH})`);
  console.log('  frame  sleevePx  hem   anchor        axis           along/across  tMin');
  for (const r of out.perFrame) {
    if (r.why) { console.log(`  ${String(r.f).padStart(5)}  ${String(r.n).padStart(8)}  —     ${r.why}`); continue; }
    console.log(`  ${String(r.f).padStart(5)}  ${String(r.n).padStart(8)}  ${String(r.hem).padStart(3)}   `
      + `(${String(r.ax).padStart(5)},${String(r.ay).padStart(5)})  (${r.ux}, ${r.uy})`
      + `   ${r.along}/${r.across}  tMin ${r.tMin}`);
  }
  console.log(`  total: ${out.wrote} sleeve px + ${out.hemPx} hem px`);

  if (!DRY) {
    writeFileSync(outPath, Buffer.from(out.png.split(',')[1], 'base64'));
    const webp = outPath.replace(/\.png$/, '.webp');
    if (existsSync(webp)) { unlinkSync(webp); console.log(`  deleted stale ${webp.split('/').pop()}`); }
    console.log(`  wrote ${outPath.split('/').pop()}`);
  }
}

await browser.close();
if (bad) { console.error(`\n${bad} sheet(s) failed an invariant — nothing written for them.`); process.exit(1); }
console.log(DRY ? '\n(dry run — nothing written)' : '\nDone.  Bump GEAR_VERSION in src/rendering/gearSheets.js.');
