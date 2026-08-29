/* ═══ SUPERSEDED — DO NOT RUN (v2.3.2140) ═══
 * Never applied, and now never should be. This chased the bare shoulder into
 * the ARTWORK; it is not there. The renderer's upper-arm capsule was stamping
 * a bare-skin body clone over the tee (v2.3.2134). The sheet needed nothing.
 *
 * Kept because the head-ceiling machinery and the two failed axis rules below
 * are a real record of what does not work on this sheet, and because the
 * measurement critique in its header is what led to looking at the renderer
 * at all.
 */
/* ═══ v2.3.2133: A SLEEVE ON THE ARM THAT CROSSES THE CHEST (jog-east) ═══
 *
 * Owner, a sixth time: "East shoulder is still bare during jog."
 *
 * ── WHAT IS ACTUALLY THERE, LOOKED AT ──
 * Render body-only beside body+tee for frame 3 and frame 10 at 13x. Frame 3
 * reads as a t-shirt: white across the torso, a cap on the near shoulder.
 * Frame 10 reads as a bare chest with a white strip down the back of it. The
 * difference is not the collar and it is not the tee shrinking: the tee is
 * still there on frame 10, BEHIND a near arm that has swung up across the
 * chest, and the artist cut the tee away along that arm so the arm draws in
 * front (seal-shirt-edges.mjs says so). What the owner is seeing is a large
 * bare arm lying over the chest, from the shoulder joint down, for half the
 * stride. v2.3.1986 read it the same way in the first place.
 *
 * ── WHY FIVE SETS OF MEASUREMENTS SAID THESE FRAMES WERE FINE ──
 * Because area is the wrong statistic here, and it hid it twice over. Bare
 * skin in the chest band comes out 259,281,261,282,263,282,277 on frames 0-6
 * against 245,211,185,135,180,218,244 on 7-13 -- the BAD frames score better.
 * Most of that magenta is forearm and neck, which a tee is meant to leave
 * bare, and the whole figure shrinks as the torso turns (1958 px on frame 5
 * against 1483 on frame 10), so there is less of everything including the
 * bare part. v2.3.2093 ran five independent measurements off that shape and
 * concluded the frames were fine. The frames are not fine; the metric was.
 *
 * ── AND WHY THE OBVIOUS TOOL FINDS NOTHING ──
 * draw-trailing-sleeve.mjs with its edge test flipped to the FRONT (its rule
 * already carries an `o.back` sign) writes exactly zero pixels on every frame
 * of this sheet. Measured, the reason is invariant (b): that tool excludes any
 * COLUMN with body above the shirt's topmost row, which is the cheap head test
 * it was given after v2.3.1986 painted a shirt-coloured blob on the
 * character's FACE. On an east profile with the torso turned the head sits
 * directly above the chest, so the front region loses 54 px to 4 on frame 10
 * and 217 to 64 on frame 3, and the limb never reaches the 12-pixel floor.
 * The invariant that keeps the tool off the face is the same one that forbids
 * this fix. That is why it has survived six reports.
 *
 * ── SO THE HEAD TEST HAS TO BE THE PRECISE ONE ──
 * v2.3.2093 built one and proved it, then had no use for it because its own
 * target turned out not to exist. It is used here:
 *
 *   - HEADCOMP(f): uncovered body skin flooded 8-connected from the top nine
 *     rows of the figure. Those rows are pure head on every frame of this
 *     sheet -- the tee's topmost row is 20 rows below the crown -- so the seed
 *     cannot start anywhere but the skull.
 *   - HEAD_UNION: the good frames' floods, registered by crown row (the head
 *     only TRANSLATES through this cycle -- registering the top 16 rows frame
 *     against frame gives dx=0) and unioned.
 *   - CEILING(f) = HEAD_UNION translated onto f, UNION f's own HEADCOMP.
 *     Union, not intersection: the ceiling must OVER-estimate the head. An
 *     eroded head mask is how you end up on the chin.
 *
 * A per-PIXEL ceiling instead of a per-COLUMN one is the whole difference
 * between this and the tool that finds nothing, and it is strictly safer than
 * what v2.3.1986 had, which was nothing at all.
 *
 * ── THE RULE ──
 * draw-trailing-sleeve.mjs's, with the edge test dropped and the head test
 * upgraded. Read that file's header for why each clause is shaped this way;
 * every one of them is scar tissue from a failed attempt.
 *
 *   - REGION: uncovered body skin inside the tee's own row band, not in the
 *     CEILING, not pants. The body's near-black keyline joins the region for
 *     connectivity but is NEVER painted, so the arm keeps the outline the pine
 *     bow lost (v2.3.2010).
 *   - LIMB: the part of REGION connected to the tee. A detached speck is not a
 *     limb.
 *   - ANCHOR: the TOP ROWS of the LARGEST cluster of pixels where the limb
 *     touches the tee. Largest, because one stray pixel behind the collar is
 *     on the seam too; top rows, because a shoulder is the top of an arm and a
 *     centroid anchor put a white slab across the middle of a forearm the
 *     first time the sibling tool ran.
 *   - AXIS: the limb's principal component, pointed away from the anchor.
 *   - SLEEVE: limb pixels whose distance ALONG that axis from the anchor is in
 *     [-2, REACH], ending in the tee's own keyline value so the sleeve stops
 *     in a line across the arm instead of fading out.
 *
 * The band is cut PERPENDICULAR TO THE ARM'S AXIS. That is the part v2.3.2016
 * could not get and the reason it was thrown away: every rule that grows the
 * shirt sideways gives a roughly vertical band, and a sleeve on a swung arm is
 * a band across it (TRAPS §30).
 *
 * ── INVARIANTS, asserted on every written pixel; any failure writes nothing ──
 *   (a) nothing above the tee's own topmost row;
 *   (b) nothing inside the head CEILING;
 *   (c) nothing where the body is transparent, so the silhouette is unchanged;
 *   (d) nothing where the tee already has a pixel.
 *
 * ── NO FRAME GATE ──
 * draw-trailing-sleeve's own first run tried one and recorded the lesson: "The
 * anchor was the bug, not the frames." A rule needing a frame list is firing
 * for the wrong reason somewhere. On frames 0-6 the near arm is also in front
 * of the tee, so this caps that arm too -- which is what a sleeve is. Whether
 * it READS right is a question for the render and not the arithmetic: --dry
 * prints per-frame counts and writes nothing, and --contact=PATH writes a
 * before/after strip.
 *
 * ── SCOPE: jog-east ONLY ──
 * Which is also jog-west (mirrored). "The arm across the chest" is only
 * meaningful on a profile, and this subsystem has already had one fix reverted
 * in play for generalising past its report.
 *
 * IDEMPOTENT: the source is the sheet at SRC_REV, never what is on disk.
 * PNG ONLY -- any .webp beside it is DELETED, because webpImage.js asks for
 * the .webp first and a regenerated PNG next to a stale WebP never loads.
 *
 * BUMP GEAR_VERSION in src/rendering/gearSheets.js after running with --write.
 *
 * Run: node tools/gear/draw-crossing-sleeve.mjs [--write] [--reach=6]
 *                                               [--contact=PATH]
 */
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decode, encode } from './lib/png.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ARG = (k, d) => {
  const a = process.argv.find((s) => s.startsWith(`--${k}=`));
  return a === undefined ? d : a.split('=').slice(1).join('=');
};
const WRITE = process.argv.includes('--write');
const REACH = +ARG('reach', 6);
/* The widest band that still reads as a sleeve rather than a slab, measured
   ACROSS the limb's own axis. Set from the render: see the note at the guard. */
const ACROSS_MAX = +ARG('across', 14);
/* 'pca' (default) or 'distal' — both were tried; see the note beside the axis
   for what each does and why neither closes frames 11-13. */
const AXIS = ARG('axis', 'pca');
const CONTACT = ARG('contact', '');

/* v2.3.2078 (3a8099c8) is the sheet that SHIPS: the artist's art, sealed
   (v2.3.1995), the trailing sleeve (v2.3.2066), and the reseal after it
   (v2.3.2078). This adds the front cap to that, rather than re-deriving it. */
const SRC_REV = '3a8099c8';
const REL = 'public/sprites/gear/shirt/tshirt/jog-east.png';
const OUT_PATH = `${REPO}/${REL}`;
const BODY_PATH = `${REPO}/public/sprites/player/jog-east.png`;

/* The frames whose tee reads correct, used ONLY to build the head reference --
   never as a gate on where the sleeve may be drawn. */
const GOOD = [0, 1, 2, 3, 4, 5, 6, 14, 15, 16, 17, 18, 19, 20];

function sheetAtRev(rel) {
  try {
    return execFileSync('git', ['show', `${SRC_REV}:${rel}`], { cwd: REPO, maxBuffer: 64 << 20 });
  } catch {
    console.error(`\n!! cannot read ${rel} at ${SRC_REV} — this clone does not have that history.`);
    process.exit(2);
  }
}

const shirt = decode(sheetAtRev(REL));
const body = decode(readFileSync(BODY_PATH));
if (shirt.width !== body.width || shirt.height !== body.height) {
  console.error(`!! size mismatch shirt ${shirt.width}x${shirt.height} vs body ${body.width}x${body.height}`);
  process.exit(1);
}
const F = shirt.height;
const W = shirt.width;
const NF = Math.round(W / F);
const KEY_T = 70;                 /* body luminance below this is its own keyline */
const HEM = [26, 20, 18];         /* the tee's own outline value */
const before = Uint8Array.from(shirt.data);   /* for the contact sheet */

const at = (f, x, y) => (y * W + f * F + x) * 4;
const bodyA = (f, x, y) => body.data[at(f, x, y) + 3];
const shirtA = (f, x, y) => shirt.data[at(f, x, y) + 3];
const bodyLum = (f, x, y) => {
  const i = at(f, x, y);
  return 0.299 * body.data[i] + 0.587 * body.data[i + 1] + 0.114 * body.data[i + 2];
};
const isPants = (f, x, y) => { const i = at(f, x, y); return body.data[i + 1] > body.data[i]; };
const isShirt = (f, x, y) => shirtA(f, x, y) > 24;
const isBareSkin = (f, x, y) =>
  bodyA(f, x, y) > 24 && !isShirt(f, x, y) && !isPants(f, x, y) && bodyLum(f, x, y) >= KEY_T;

function crownRow(f) {
  for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) if (bodyA(f, x, y) > 24) return y;
  return -1;
}
function shirtBand(f) {
  let top = F, bot = -1;
  for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) {
    if (isShirt(f, x, y)) { if (y < top) top = y; if (y > bot) bot = y; break; }
  }
  return [top, bot];
}

/* ── the head ceiling (v2.3.2093's, proved there) ─────────────────────────── */
function headComp(f, seedRows = 9) {
  const top = crownRow(f);
  const m = new Uint8Array(F * F), st = [];
  for (let y = top; y < top + seedRows && y < F; y++) for (let x = 0; x < F; x++) {
    if (isBareSkin(f, x, y)) { const p = y * F + x; if (!m[p]) { m[p] = 1; st.push(p); } }
  }
  while (st.length) {
    const p = st.pop(), y = (p / F) | 0, x = p % F;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= F || ny >= F) continue;
      const n = ny * F + nx;
      if (m[n] || !isBareSkin(f, nx, ny)) continue;
      m[n] = 1; st.push(n);
    }
  }
  return m;
}
const REF_CROWN = crownRow(GOOD[0]);
const HEAD_UNION = (() => {
  const u = new Uint8Array(F * F);
  for (const f of GOOD) {
    const d = crownRow(f) - REF_CROWN, m = headComp(f);
    for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) {
      if (!m[y * F + x]) continue;
      const yy = y - d;
      if (yy >= 0 && yy < F) u[yy * F + x] = 1;
    }
  }
  return u;
})();
function headCeiling(f) {
  const d = crownRow(f) - REF_CROWN, m = headComp(f);
  for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) {
    if (!HEAD_UNION[y * F + x]) continue;
    const yy = y + d;
    if (yy >= 0 && yy < F) m[yy * F + x] = 1;
  }
  return m;
}

/* ── the rule ─────────────────────────────────────────────────────────────── */
function sleeveFor(f) {
  const [top, bot] = shirtBand(f);
  if (bot < 0) return { f, n: 0, why: 'no shirt' };
  const ceil = headCeiling(f);

  /* REGION: 1 = paintable skin, 2 = the body's own keyline (connects, never painted) */
  const reg = new Uint8Array(F * F);
  const pts = [];
  for (let y = top; y <= bot; y++) for (let x = 0; x < F; x++) {
    if (bodyA(f, x, y) <= 24 || isShirt(f, x, y)) continue;
    if (ceil[y * F + x]) continue;                        /* (b) */
    if (bodyLum(f, x, y) < KEY_T) { reg[y * F + x] = 2; continue; }
    if (isPants(f, x, y)) continue;
    reg[y * F + x] = 1; pts.push([x, y]);
  }
  if (pts.length < 12) return { f, n: 0, why: 'no uncovered skin' };

  const seam = [];
  for (const [x, y] of pts) {
    let touch = false;
    for (let dy = -1; dy <= 1 && !touch; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < F && ny < F && isShirt(f, nx, ny)) { touch = true; break; }
    }
    if (touch) seam.push([x, y]);
  }
  if (!seam.length) return { f, n: 0, why: 'no seam' };

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

  /* ANCHOR: top rows of the largest seam cluster */
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
  if (!bestCl) return { f, n: 0, why: 'no seam cluster' };
  let clTop = F;
  for (const p of bestCl) { const y = (p / F) | 0; if (y < clTop) clTop = y; }
  let ax = 0, ay = 0, na = 0;
  for (const p of bestCl) { const y = (p / F) | 0; if (y <= clTop + 1) { ax += p % F; ay += y; na++; } }
  ax /= na; ay /= na;

  /* AXIS: principal component of the limb, pointed away from the anchor */
  let cx = 0, cy = 0, n = 0;
  for (let y = top; y <= bot; y++) for (let x = 0; x < F; x++) {
    if (keep[y * F + x] && reg[y * F + x] === 1) { cx += x; cy += y; n++; }
  }
  if (n < 12) return { f, n: 0, why: 'limb too small' };
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

  /* ── THE AXIS HAS TO BE THE ARM'S, NOT THE REGION'S ──
     PCA takes the long direction of the WHOLE limb, and where the uncovered
     region merges the arm with a patch of chest that direction is the chest's.
     Measured, frames 11 and 13 come out with a near-horizontal axis (0.98,0.18)
     and (1,-0.03) while the arm on those frames hangs vertically, so the band
     -- correctly cut perpendicular to that axis -- runs DOWN the arm instead of
     across it. Rendered at 8x it is a hard white bar, the same thing that got
     v2.3.2016 thrown away.
     Note it is NOT a width problem: those bands measure 8.8 and 10.1 px across
     against 7.1 on frame 0, which is why a width guard was tried first and
     rejected -- it cannot tell them apart because they are the same width.
     DISTAL was the second attempt (--axis=distal): the direction from the
     anchor (the shoulder seam) to the limb's farthest pixel from it, on the
     reasoning that an arm runs from its shoulder to its hand by definition.
     IT DOES NOT WORK EITHER, and the numbers say why: frames 11 and 13 come
     back at (0.93,0.36) and (0.98,0.17), still near-horizontal, because the
     limb's farthest point from the shoulder is across the CHEST rather than
     down the arm -- the region genuinely merges the two, so no direction
     derived from it as a whole can be the arm's. It also breaks frame 9
     (26.5px across, refused by the guard below) where PCA was fine.
     Left runnable because it is the obvious second idea and the next session
     should be able to see it fail rather than rebuild it. */
  if (AXIS === 'distal') {
    let fx = ax, fy = ay, fd = -1;
    for (let y = top; y <= bot; y++) for (let x = 0; x < F; x++) {
      if (!keep[y * F + x] || reg[y * F + x] !== 1) continue;
      const d2 = (x - ax) * (x - ax) + (y - ay) * (y - ay);
      if (d2 > fd) { fd = d2; fx = x; fy = y; }
    }
    if (fd > 4) {
      const mm = Math.hypot(fx - ax, fy - ay) || 1;
      ux = (fx - ax) / mm; uy = (fy - ay) / mm;
    }
  }

  /* ── IS THIS A SLEEVE OR A SLAB? ──
     The band is cut perpendicular to the limb's principal axis, which is the
     right shape only while that axis IS the arm's. Where the uncovered region
     merges the arm with a broad patch of chest, the principal component is the
     CHEST's long direction, and a band perpendicular to it lands as a hard
     rectangle down the arm -- rendered at 8x on frames 11 and 13 that is
     exactly what it looks like, and it is the same failure that got v2.3.2016
     thrown away.
     A sleeve caps an arm, so it can be no wider than an arm: measure the
     painted band ACROSS its own axis and refuse the frame when it exceeds a
     limb's width. This measures the defect itself rather than proxying it
     through a frame list -- the thing draw-trailing-sleeve's first run got
     wrong ("The anchor was the bug, not the frames"). */
  let pMinS = 1e9, pMaxS = -1e9, cand = 0;
  for (let y = top; y <= bot; y++) for (let x = 0; x < F; x++) {
    const p = y * F + x;
    if (!keep[p] || reg[p] !== 1) continue;
    const t = (x - ax) * ux + (y - ay) * uy;
    if (t < -2 || t > REACH) continue;
    const sAcross = (x - ax) * -uy + (y - ay) * ux;
    if (sAcross < pMinS) pMinS = sAcross;
    if (sAcross > pMaxS) pMaxS = sAcross;
    cand++;
  }
  const across = cand ? +(pMaxS - pMinS).toFixed(1) : 0;
  if (cand && across > ACROSS_MAX) {
    return { f, n: 0, across, why: `band ${across}px across — wider than an arm, would read as a slab` };
  }

  const paint = [], hem = [];
  for (let y = top; y <= bot; y++) for (let x = 0; x < F; x++) {
    const p = y * F + x;
    if (!keep[p] || reg[p] !== 1) continue;
    const t = (x - ax) * ux + (y - ay) * uy;
    if (t < -2 || t > REACH) continue;
    if (y < top) return { f, error: `sleeve above the tee's top row` };            /* (a) */
    if (ceil[p]) return { f, error: `sleeve inside the head ceiling at ${x},${y}` };/* (b) */
    if (bodyA(f, x, y) <= 24) return { f, error: `sleeve outside the body` };       /* (c) */
    if (isShirt(f, x, y)) return { f, error: `sleeve over existing tee` };          /* (d) */
    (t > REACH - 1.2 ? hem : paint).push(p);
  }
  return { f, n: paint.length + hem.length, paint, hem, across,
    ax: +ax.toFixed(1), ay: +ay.toFixed(1), ux: +ux.toFixed(2), uy: +uy.toFixed(2) };
}

let wrote = 0, hemPx = 0, bad = 0;
const results = [];
for (let f = 0; f < NF; f++) results.push(sleeveFor(f));
for (const r of results) if (r.error) { console.error(`!! frame ${r.f}: ${r.error}`); bad++; }
if (bad) { console.error(`\n${bad} frame(s) failed an invariant — nothing written.`); process.exit(1); }

console.log(`jog-east  (${NF} frames, reach=${REACH})`);
console.log('  frame  sleevePx  hem   across  anchor        axis');
for (const r of results) {
  if (r.why) { console.log(`  ${String(r.f).padStart(5)}  ${String(r.n).padStart(8)}  —     ${r.why}`); continue; }
  console.log(`  ${String(r.f).padStart(5)}  ${String(r.n).padStart(8)}  ${String(r.hem.length).padStart(3)}   `
    + `${String(r.across).padStart(5)}   (${String(r.ax).padStart(5)},${String(r.ay).padStart(5)})  (${r.ux}, ${r.uy})`);
}

for (const r of results) {
  if (!r.paint) continue;
  for (const p of r.paint) {
    const py = (p / F) | 0, px = p % F, i = at(r.f, px, py);
    shirt.data[i] = 255; shirt.data[i + 1] = 255; shirt.data[i + 2] = 255;
    shirt.data[i + 3] = body.data[i + 3]; wrote++;
  }
  for (const p of r.hem) {
    const py = (p / F) | 0, px = p % F, i = at(r.f, px, py);
    shirt.data[i] = HEM[0]; shirt.data[i + 1] = HEM[1]; shirt.data[i + 2] = HEM[2];
    shirt.data[i + 3] = body.data[i + 3]; hemPx++;
  }
}
console.log(`  total: ${wrote} sleeve px + ${hemPx} hem px`);

/* A before/after strip of the composite, because on this sheet the arithmetic
   has been right and the picture wrong twice (v2.3.2016, v2.3.2093). */
if (CONTACT) {
  const SEL = [0, 3, 7, 9, 10, 11, 13];
  const Z = 6, CW = F * Z, CH = F * Z;
  const out = { width: CW * SEL.length, height: CH * 2, data: new Uint8Array(CW * SEL.length * CH * 2 * 4) };
  const put = (col, row, sheetData) => {
    for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
      const sx = (x / Z) | 0, sy = (y / Z) | 0;
      const f = SEL[col];
      const bi = at(f, sx, sy);
      let R = body.data[bi], G = body.data[bi + 1], B = body.data[bi + 2], A = body.data[bi + 3];
      const sa = sheetData[bi + 3];
      if (sa > 0) {                                  /* composite the tee over it */
        const a = sa / 255;
        R = Math.round(sheetData[bi] * a + R * (1 - a));
        G = Math.round(sheetData[bi + 1] * a + G * (1 - a));
        B = Math.round(sheetData[bi + 2] * a + B * (1 - a));
        A = Math.max(A, sa);
      }
      const o = ((row * CH + y) * out.width + col * CW + x) * 4;
      const bg = 28;
      const a = A / 255;
      out.data[o] = Math.round(R * a + bg * (1 - a));
      out.data[o + 1] = Math.round(G * a + bg * (1 - a));
      out.data[o + 2] = Math.round(B * a + bg * (1 - a));
      out.data[o + 3] = 255;
    }
  };
  for (let c = 0; c < SEL.length; c++) { put(c, 0, before); put(c, 1, shirt.data); }
  writeFileSync(CONTACT, encode(out));
  console.log(`  contact sheet: ${CONTACT}  (top row before, bottom after; frames ${SEL.join(',')})`);
}

if (WRITE) {
  writeFileSync(OUT_PATH, encode(shirt));
  const webp = OUT_PATH.replace(/\.png$/, '.webp');
  if (existsSync(webp)) { unlinkSync(webp); console.log(`  deleted stale ${webp.split('/').pop()}`); }
  console.log(`  wrote ${REL}`);
  console.log('\nDone.  Bump GEAR_VERSION in src/rendering/gearSheets.js.');
} else {
  console.log('\n(no --write — nothing written to the sheet)');
}
