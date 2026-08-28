/* ═══ v2.3.2093: RAISE THE TEE'S COLLAR ON jog-east frames 7-13 / 21-27 ═══
 *
 * Owner, a fifth time: "East shoulder is still bare during jog."
 *
 * ── WHAT THIS TOOL IS FOR ──
 * The report says the tee's NECKLINE is cut several pixels too low on frames
 * 7-13 and 21-27 (the sheet is two identical 14-frame cycles, so those are the
 * same seven drawings twice): a band of bare skin from under the jaw down over
 * the top of the chest and the near shoulder, while frames 0-6 / 14-20 draw the
 * collar right up under the jaw.  This tool closes that gap by raising the
 * collar on the named frames until it meets the head, taking the good frames'
 * own collar line as the reference rather than inventing a neckline.
 *
 * ── AND WHAT IT MEASURED, WHICH IS THE PART TO READ FIRST ──
 * Run as briefed, the rule below finds 6 pixels to write across all fourteen
 * named frames.  Not because the rule is timid — it is the same shape as
 * v2.3.2066's sleeve and fires happily when there is a gap — but because on
 * this sheet the collar on 7-13 is NOT lower than on 0-6.  Four independent
 * measurements, printed by --measure, say so:
 *
 *  1. THE COLLAR SITS AT A CONSTANT HEIGHT ABOVE THE CROWN.  shirtTop minus
 *     bodyTop (the topmost opaque row of each) is 20 on 24 of the 28 frames and
 *     21 on the other four (5, 13, 19, 27).  The head is a RIGID shape that
 *     only translates vertically through this cycle — registering the top 16
 *     rows of the figure frame against frame gives dx=0 and a mismatch of 11-24
 *     px against ~420 head px — so "rows below the crown" IS "height on the
 *     neck".  A neckline cut several pixels too low on half the frames cannot
 *     produce a constant.
 *  2. WALKING UP FROM THE SHIRT MEETS THE HEAD IMMEDIATELY.  That is the rule
 *     below, and per frame it finds 0,3,0,0,0,0,0 pixels on 7-13 against
 *     0,1,0,3,0,2,3 on 0-6 — three pixels against nine, per cycle.  The tee's top edge is already against the jaw
 *     keyline or the neck skin the artist leaves bare, in almost every column.
 *  3. BARE SKIN IN THE COLLAR BAND IS LOWER ON 7-13, NOT HIGHER.  Uncovered
 *     non-head skin in the ten rows below the shirt's top row: 2,18,33,69,29,
 *     30,4 on frames 0-6 against 2,3,1,0,0,0,1 on 7-13.  (The big numbers on
 *     1-5 are the raised forearm and fist, which a tee is meant to leave bare.)
 *  4. jog-east HAS THE TIGHTEST COLLAR OF ANY FACING.  Exposed neck — head-
 *     connected uncovered skin at or below crown+19 — is 35-61 px on jog-east
 *     against 70-101 on jog-south, 108-129 on jog-southwest, 79-105 on
 *     jog-north.  Measured against the sheet the report names as the standard,
 *     east's neckline is HIGHER, not lower.
 *
 *  5. AND THE TEE COVERS MORE OF THE TORSO THERE, NOT LESS.  Of the body
 *     pixels in the shirt's own row band that are neither head nor trousers,
 *     the tee covers 56-74% on frames 7-13 against 51-57% on frames 0-6.
 *
 * So the tool is left here, correct and runnable, and it was NOT run in --write
 * mode: six pixels do not justify a GEAR_VERSION bump, which refetches the
 * sheet for every player, and a bake that writes six pixels while the report
 * describes a broad band is a bake aimed at the wrong thing.
 *
 * What frames 7-13 really differ in is POSE.  The torso turns away and the far
 * arm goes behind it, so the FIGURE is 1485-1833 px against 1877-1966 on 0-6,
 * and the tee shrinks with it — 249-357 px against 362-412 — losing the
 * shoulder cap that makes the 0-6 silhouette read as a t-shirt.  Less white,
 * same collar.  There is no body under the missing cap to take an alpha from,
 * so drawing one would paint over transparent background: invariant (c) forbids
 * it and it would change the figure's silhouette, which is the one thing the
 * owner said would get this rejected.
 *
 * The near arm is the other half of the illusion, and it has burned this
 * subsystem before.  On 7-13 that arm swings up across the chest and the artist
 * cuts the tee away so it draws in front (seal-shirt-edges.mjs says so
 * explicitly).  At game size, half a stride of bare arm over the chest reads as
 * a bare chest.  v2.3.1986 believed that reading, built a "crossing arm"
 * detector for frames 8-11, found the jaw instead and painted a blob on the
 * character's FACE; v2.3.1999 re-measured and moved the target to the TRAILING
 * arm on 0-6, which is what v2.3.2066 actually fixed.  TRAPS §30 is that whole
 * story.  This measurement lands in the same place a third time.
 *
 * ── THE RULE ──
 * Per frame, per COLUMN — a column walk, never a row cut.  §37 and the jaw
 * warning are the same lesson: on an east-facing figure the jaw overhangs the
 * neck, so any horizontal cut through the collar band severs the wrong thing.
 * A column walk cannot: it starts at the tee and stops at whatever it meets.
 *
 *   - For each column x, find the shirt's TOPMOST pixel, then step UP one row
 *     at a time, writing while the pixel is uncovered body SKIN.
 *   - The walk stops, and the column is finished, at the first pixel that is:
 *     transparent (ran off the body) · inside the HEAD CEILING · the body's own
 *     near-black keyline · pants · already shirt.  It also stops at REACH rows,
 *     so a column can never run away down an arm.
 *   - Because both ends are anchored — the tee below, the head above — the fill
 *     is a gap closure, not a growth.  There is no depth to tune and no hem to
 *     draw: the collar rises exactly until it touches the head and stops.
 *
 * ── THE HEAD CEILING, AND HOW IT IS PROVED ──
 * Whatever the ceiling is, it has to be shown per frame, not asserted in a
 * comment: v2.3.1986 painted a shirt-coloured blob on the character's FACE
 * because head, neck, torso and arms are one connected skin region and a
 * horizontal cut does not sever the head (TRAPS §30, and the postmortem above
 * it).  This one is built from the GOOD frames' own art:
 *
 *   - HEADCOMP(f): flood the uncovered body SKIN 8-connected from the top nine
 *     rows of the figure.  Those rows are pure head on every frame of this
 *     sheet — the shirt's topmost row is 20 rows below the crown, measurement
 *     (1) above — so the seed cannot start anywhere but the skull.  On a GOOD
 *     frame the tee seals the neck, so the flood is head + the neck the artist
 *     leaves bare, and it stops AT THE COLLAR LINE.  That is the reference the
 *     report asks for, taken from the frames the report calls correct.
 *   - HEAD_UNION: those seven good-frame floods, registered by crown row (the
 *     head only translates, so this is exact) and unioned.  405 px, and every
 *     good frame's own flood lies entirely inside it; the bad frames' floods
 *     lie inside it but for 0-20 px of jaw at the back of the skull.
 *   - CEILING(f) = HEAD_UNION translated back onto frame f, UNION frame f's own
 *     HEADCOMP.  Union, not intersection: the ceiling must OVER-estimate the
 *     head.  An eroded head mask is how you end up on the chin.
 *
 * INVARIANTS, checked on every written pixel; any failure aborts the sheet:
 *   (a) BODY ALPHA ONLY.  Every written pixel takes the body's own alpha at
 *       that pixel.  The shirt draws over the body, so a written pixel
 *       composites to exactly the body's coverage in a different colour: the
 *       silhouette is bit-for-bit unchanged and the antialiased fringe stays a
 *       fringe instead of turning into detached pips (v2.3.2016's failure).
 *   (b) NEVER ON THE HEAD.  No written pixel is inside CEILING(f).
 *   (c) NEVER OFF THE BODY.  No written pixel is where the body is transparent.
 *   (d) NEVER THE KEYLINE.  The body's near-black outline stops the walk and is
 *       never written, so the figure keeps its ink (v2.3.2010 lost a bow's
 *       outline exactly this way).
 *   (e) ADDITIVE ONLY.  Pixels removed and pixels recoloured must both be 0;
 *       the tool counts them and fails if either is not.
 *
 * ── SCOPE: jog-east, frames 7-13 and 21-27 ──
 * Which is also jog-WEST, mirrored (playerSkins MIRRORED_SOURCE_DIRS).  No
 * other sheet and no other frame: this subsystem has had two fixes reverted in
 * play for reaching past its report, and the frame gate here is the report's
 * own, not one this tool inferred.
 *
 * ── NO BROWSER ──
 * Every other tool in tools/gear/ decodes its sheets through headless Chromium
 * and a canvas.  This one reads the PNGs directly (tools/gear/lib/png.mjs), so
 * it can run while the QA harness has the browser.  Same pixels, fewer moving
 * parts.
 *
 * ── IDEMPOTENT ──
 * The source is the sheet at SRC_REV, never whatever is on disk.  Raising the
 * collar makes the pixel above it newly adjacent to shirt, so a second pass
 * over its own output would walk the collar up the neck.  Running this ten
 * times gives the same file.
 *
 * PNG ONLY.  Any .webp beside it is DELETED — webpImage.js asks for the .webp
 * first, so a regenerated PNG left next to a stale WebP never loads.
 *
 * If --write ever does something, BUMP GEAR_VERSION in
 * src/rendering/gearSheets.js and re-run tools/gear/seal-shirt-edges.mjs with
 * --src pointing at the baked sheet (the sealer's own source predates the
 * sleeve, so its default revision would undo v2.3.2066).
 *
 * Run: node tools/gear/raise-east-collar.mjs [--measure] [--write]
 *                                            [--reach=6] [--contact=PATH]
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
/* How far up a column may walk before it gives up.  Six is the whole neck on
   this sheet (the collar sits 20 rows below the crown and the jaw ends 22-24
   rows below it), so it is a runaway guard rather than a tuned depth: the walk
   stops at the head long before it stops at REACH on every frame measured. */
const REACH = +ARG('reach', 6);
const CONTACT = ARG('contact', '');

/* v2.3.2078 (3a8099c8) is the last commit that touched this sheet: the artist's
   art, plus the v2.3.2066 sleeve, plus the reseal that followed it.  That is
   this tool's input, forever. */
const SRC_REV = '3a8099c8';
const REL = 'public/sprites/gear/shirt/tshirt/jog-east.png';
const OUT_PATH = `${REPO}/${REL}`;
const BODY_PATH = `${REPO}/public/sprites/player/jog-east.png`;

/* The report's own frame list.  Not inferred — v2.3.2066 tried inferring a
   frame gate from shape statistics and the measurement killed it. */
const TARGET = new Set([7, 8, 9, 10, 11, 12, 13, 21, 22, 23, 24, 25, 26, 27]);
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
const F = shirt.height;            /* square frames */
const W = shirt.width;
const NF = Math.round(W / F);
const KEY_T = 70;                  /* body luminance below this is its own keyline */

/* ── per-frame pixel accessors ────────────────────────────────────────────── */
const at = (f, x, y) => (y * W + f * F + x) * 4;
const bodyA = (f, x, y) => body.data[at(f, x, y) + 3];
const shirtA = (f, x, y) => shirt.data[at(f, x, y) + 3];
const bodyLum = (f, x, y) => {
  const i = at(f, x, y);
  return 0.299 * body.data[i] + 0.587 * body.data[i + 1] + 0.114 * body.data[i + 2];
};
/* pants read greener than they read red; skin never does */
const isPants = (f, x, y) => { const i = at(f, x, y); return body.data[i + 1] > body.data[i]; };
const isShirt = (f, x, y) => shirtA(f, x, y) > 24;
const isBareSkin = (f, x, y) =>
  bodyA(f, x, y) > 24 && !isShirt(f, x, y) && !isPants(f, x, y) && bodyLum(f, x, y) >= KEY_T;

function crownRow(f) {
  for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) if (bodyA(f, x, y) > 24) return y;
  return -1;
}
function shirtTopRow(f) {
  for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) if (isShirt(f, x, y)) return y;
  return -1;
}

/* ── HEADCOMP: uncovered skin flooded from the top nine rows of the figure ── */
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

/* ── HEAD_UNION: the good frames' heads, crown-registered and unioned ─────── */
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
/** The ceiling for frame f: the canonical head put back on this frame, UNION
 *  this frame's own head flood.  Over-estimating the head is the safe error. */
function headCeiling(f) {
  const d = crownRow(f) - REF_CROWN, m = headComp(f);
  for (let y = 0; y < F; y++) for (let x = 0; x < F; x++) {
    if (!HEAD_UNION[y * F + x]) continue;
    const yy = y + d;
    if (yy >= 0 && yy < F) m[yy * F + x] = 1;
  }
  return m;
}

/* ── THE RULE ─────────────────────────────────────────────────────────────── */
function collarWalk(f) {
  const ceil = headCeiling(f), paint = [], stops = {};
  for (let x = 0; x < F; x++) {
    let st = -1;
    for (let y = 0; y < F; y++) if (isShirt(f, x, y)) { st = y; break; }
    if (st < 0) continue;
    for (let k = 1; k <= REACH; k++) {
      const y = st - k;
      if (y < 0) { stops.edge = (stops.edge || 0) + 1; break; }
      if (bodyA(f, x, y) <= 24) { stops.transparent = (stops.transparent || 0) + 1; break; }
      if (isShirt(f, x, y)) { stops.shirt = (stops.shirt || 0) + 1; break; }
      if (ceil[y * F + x]) { stops.head = (stops.head || 0) + 1; break; }
      if (bodyLum(f, x, y) < KEY_T) { stops.keyline = (stops.keyline || 0) + 1; break; }
      if (isPants(f, x, y)) { stops.pants = (stops.pants || 0) + 1; break; }
      paint.push([x, y]);
      if (k === REACH) stops.reach = (stops.reach || 0) + 1;
    }
  }
  return { paint, stops, ceil };
}

/* ── measurements, printed whatever the mode ──────────────────────────────── */
function measure() {
  console.log(`\njog-east: ${NF} frames of ${F}px, reach=${REACH}, source ${SRC_REV}`);
  console.log('\n  (1) the collar sits at a constant height above the crown');
  let line = '      frame ';
  for (let f = 0; f < NF; f++) line += String(f).padStart(4);
  console.log(line);
  const rows = { crown: [], shirtTop: [], delta: [] };
  for (let f = 0; f < NF; f++) {
    const c = crownRow(f), s = shirtTopRow(f);
    rows.crown.push(c); rows.shirtTop.push(s); rows.delta.push(s - c);
  }
  for (const k of ['crown', 'shirtTop', 'delta']) {
    console.log('      ' + k.padEnd(6) + rows[k].map((v) => String(v).padStart(4)).join(''));
  }
  console.log('\n  (2)-(3) per frame: collar walk, and bare non-head skin in the 10 rows'
    + '\n          below the shirt\'s top row');
  console.log('      frame  target  walkPx  stops                              top10Bare  exposedNeck');
  const per = [];
  for (let f = 0; f < NF; f++) {
    const { paint, stops, ceil } = collarWalk(f);
    const top = shirtTopRow(f), crown = crownRow(f);
    let top10 = 0;
    for (let y = top; y < top + 10 && y < F; y++) for (let x = 0; x < F; x++) {
      if (isBareSkin(f, x, y) && !ceil[y * F + x]) top10++;
    }
    const hc = headComp(f);
    let neck = 0;
    for (let y = crown + 19; y < F; y++) for (let x = 0; x < F; x++) if (hc[y * F + x]) neck++;
    per.push({ f, paint, stops, top10, neck });
    const s = Object.entries(stops).map(([k, v]) => `${k}:${v}`).join(' ');
    console.log(`      ${String(f).padStart(5)}  ${TARGET.has(f) ? '  yes ' : '   -  '}  `
      + `${String(paint.length).padStart(6)}  ${s.padEnd(34)} ${String(top10).padStart(9)}  ${String(neck).padStart(11)}`);
  }
  return per;
}

const per = measure();
const targetPx = per.filter((p) => TARGET.has(p.f)).reduce((a, p) => a + p.paint.length, 0);
const goodPx = per.filter((p) => !TARGET.has(p.f)).reduce((a, p) => a + p.paint.length, 0);
console.log(`\n  collar walk finds ${targetPx}px on the reported frames (7-13, 21-27)`
  + ` and ${goodPx}px on the frames the report calls correct.`);

/* ── the bake ─────────────────────────────────────────────────────────────── */
const out = { width: W, height: F, data: Uint8ClampedArray.from(shirt.data) };
let added = 0, removed = 0, recoloured = 0, bad = 0;
for (const { f, paint, ceil } of per.map((p) => ({ ...p, ceil: headCeiling(p.f) }))) {
  if (!TARGET.has(f)) continue;
  for (const [x, y] of paint) {
    const i = at(f, x, y);
    if (ceil[y * F + x]) { console.error(`!! frame ${f}: (${x},${y}) is inside the head ceiling`); bad++; continue; }   /* (b) */
    if (bodyA(f, x, y) <= 24) { console.error(`!! frame ${f}: (${x},${y}) is off the body`); bad++; continue; }         /* (c) */
    if (bodyLum(f, x, y) < KEY_T) { console.error(`!! frame ${f}: (${x},${y}) is the body's keyline`); bad++; continue; } /* (d) */
    if (shirt.data[i + 3] > 24) { console.error(`!! frame ${f}: (${x},${y}) already has shirt`); bad++; continue; }
    out.data[i] = 255; out.data[i + 1] = 255; out.data[i + 2] = 255;
    out.data[i + 3] = body.data[i + 3];        /* (a) the body's own alpha */
    added++;
  }
}
/* (e) additive only — counted against the source, not asserted in a comment */
for (let i = 0; i < shirt.data.length; i += 4) {
  const was = shirt.data[i + 3] > 24, now = out.data[i + 3] > 24;
  if (was && !now) removed++;
  else if (was && now && (shirt.data[i] !== out.data[i] || shirt.data[i + 1] !== out.data[i + 1]
    || shirt.data[i + 2] !== out.data[i + 2] || shirt.data[i + 3] !== out.data[i + 3])) recoloured++;
}
console.log(`\n  pixels added ${added}, removed ${removed}, recoloured ${recoloured}`);
if (bad) { console.error(`\n${bad} pixel(s) failed an invariant — nothing written.`); process.exit(1); }
if (removed || recoloured) { console.error('\nNOT additive — nothing written.'); process.exit(1); }

if (WRITE) {
  if (!added) {
    console.log('\n  --write: nothing to write (0 px).  Sheet left alone, GEAR_VERSION not bumped.');
  } else {
    writeFileSync(OUT_PATH, encode(out));
    const webp = OUT_PATH.replace(/\.png$/, '.webp');
    if (existsSync(webp)) { unlinkSync(webp); console.log(`  deleted stale ${webp.split('/').pop()}`); }
    console.log(`\n  wrote ${REL}.  Bump GEAR_VERSION in src/rendering/gearSheets.js,`
      + '\n  then re-seal: node tools/gear/seal-shirt-edges.mjs --src=<dir with the baked sheet>');
  }
} else {
  console.log('\n  (measure only — pass --write to bake)');
}

/* ── the contact sheet ────────────────────────────────────────────────────── *
 * All 28 frames, BEFORE and AFTER, composited body over shirt, cropped to the
 * shoulder band, at 8x, frame-numbered, with the jog-south equivalent beneath
 * as the standard.  Verified against the WHOLE collar band and not a crop
 * chosen to make a change legible: the v2.3.1986 blob landed inside a crop that
 * was cut to show off the sleeve.                                             */
function buildContactSheet(baked) {
  const southS = decode(readFileSync(`${REPO}/public/sprites/gear/shirt/tshirt/jog-south.png`));
  const southB = decode(readFileSync(`${REPO}/public/sprites/player/jog-south.png`));
  const Z = 8, COLS = 7;
  const EX0 = 40, EX1 = 92, SX0 = 34, SX1 = 96;   /* east / south crop columns */
  const BAND_UP = 7, BAND_DN = 41;                /* rows below the crown: jaw, collar, shoulder, upper chest */
  const CW = Math.max(EX1 - EX0 + 1, SX1 - SX0 + 1), CH = BAND_DN - BAND_UP + 1;
  const cellW = CW * Z + 6, cellH = CH * Z + 5;
  const LBL = 13, BANDH = LBL + cellH * 3 + 10;
  const OW = cellW * COLS + 34, OH = BANDH * Math.ceil(NF / COLS) + 4;
  const px = new Uint8ClampedArray(OW * OH * 4);
  for (let i = 0; i < px.length; i += 4) { px[i] = 16; px[i + 1] = 17; px[i + 2] = 20; px[i + 3] = 255; }

  const put = (S, B, f, x0, x1, cy, ox, oy) => {
    const w = S.width;
    for (let dy = 0; dy < CH; dy++) for (let dx = 0; dx <= x1 - x0; dx++) {
      const x = x0 + dx, y = cy + BAND_UP + dy;
      let r = ((dx >> 2) + (dy >> 2)) & 1 ? 58 : 44, g = r, b = r + 4;
      if (y >= 0 && y < S.height) {
        const i = (y * w + f * (S.height) + x) * 4;
        const ba = B.data[i + 3] / 255;
        if (ba > 0) { r = B.data[i] * ba + r * (1 - ba); g = B.data[i + 1] * ba + g * (1 - ba); b = B.data[i + 2] * ba + b * (1 - ba); }
        const sa = S.data[i + 3] / 255;
        if (sa > 0) { r = S.data[i] * sa + r * (1 - sa); g = S.data[i + 1] * sa + g * (1 - sa); b = S.data[i + 2] * sa + b * (1 - sa); }
      }
      for (let zy = 0; zy < Z; zy++) for (let zx = 0; zx < Z; zx++) {
        const X = ox + dx * Z + zx, Y = oy + dy * Z + zy;
        if (X < 0 || Y < 0 || X >= OW || Y >= OH) continue;
        const di = (Y * OW + X) * 4;
        px[di] = r; px[di + 1] = g; px[di + 2] = b;
      }
    }
  };
  const southCrown = (f) => {
    for (let y = 0; y < southB.height; y++) for (let x = 0; x < southB.height; x++) {
      if (southB.data[(y * southB.width + f * southB.height + x) * 4 + 3] > 24) return y;
    }
    return 0;
  };
  const bakedSheet = { width: W, height: F, data: baked.data };
  for (let f = 0; f < NF; f++) {
    const band = (f / COLS) | 0, col = f % COLS;
    const ox = 32 + col * cellW, oy0 = 2 + band * BANDH + LBL;
    const cy = crownRow(f);
    put(shirt, body, f, EX0, EX1, cy, ox, oy0);
    put(bakedSheet, body, f, EX0, EX1, cy, ox, oy0 + cellH);
    const sf = f % (southS.width / southS.height);
    put(southS, southB, sf, SX0, SX1, southCrown(sf), ox, oy0 + cellH * 2);
    text(px, OW, OH, ox + 3, 2 + band * BANDH + 3, `F${f}`, [255, 210, 60], 2);
    if (col === 0) {
      text(px, OW, OH, 2, oy0 + cellH / 2 - 5, 'BEF', [150, 160, 175], 1);
      text(px, OW, OH, 2, oy0 + cellH + cellH / 2 - 5, 'AFT', [150, 160, 175], 1);
      text(px, OW, OH, 2, oy0 + cellH * 2 + cellH / 2 - 5, 'STH', [110, 200, 130], 1);
    }
  }
  writeFileSync(CONTACT, encode({ width: OW, height: OH, data: px }));
  console.log(`\n  contact sheet -> ${CONTACT}  (${OW}x${OH}, ${Z}x, BEF/AFT jog-east + STH jog-south)`);
}

/* a 3x5 bitmap alphabet, so the sheet can label itself without a font file */
const GLYPH = {
  A: '111101111101101', B: '110101110101110', C: '111100100100111', D: '110101101101110',
  E: '111100110100111', F: '111100110100100', G: '111100101101111', H: '101101111101101',
  I: '111010010010111', J: '001001001101111', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '101111111111101', O: '111101101101111', P: '111101111100100',
  Q: '111101101111011', R: '111101110101101', S: '111100111001111', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111',
  0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111',
  4: '101101111001001', 5: '111100111001111', 6: '111100111101111', 7: '111001001001001',
  8: '111101111101111', 9: '111101111001111', ' ': '000000000000000', '-': '000000111000000',
};
function text(px, OW, OH, tx, ty, s, col, scale = 1) {
  let cx = Math.round(tx);
  for (const ch of String(s).toUpperCase()) {
    const g = GLYPH[ch] || GLYPH[' '];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) {
      if (g[r * 3 + c] !== '1') continue;
      for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) {
        const X = cx + c * scale + sx, Y = Math.round(ty) + r * scale + sy;
        if (X < 0 || Y < 0 || X >= OW || Y >= OH) continue;
        const i = (Y * OW + X) * 4;
        px[i] = col[0]; px[i + 1] = col[1]; px[i + 2] = col[2]; px[i + 3] = 255;
      }
    }
    cx += 4 * scale;
  }
}

/* The contact sheet is emitted last: its labeller lives at the bottom of this
   file and a const is not hoisted. */
if (CONTACT) buildContactSheet(out);
