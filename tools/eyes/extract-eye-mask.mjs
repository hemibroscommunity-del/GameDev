/* ═══ v2.3.1928: FIND THE IRIS IN EVERY BODY FRAME, ONCE, OFFLINE ═══
 *
 * Owner: "maybe you could also do an eye recolor?"
 *
 * The eyes are not a layer.  They are painted into the body sheets themselves —
 * 82 sheets, 823 frames — so anything that recolours them has to know which
 * pixels they are.  Doing that search at RUNTIME is the obvious approach and it
 * is the wrong one: the eye's signature is "a short white run with a dark run
 * beside it", and that also describes a highlight on a steel pauldron.  A first
 * pass of exactly that rule reported eyes on all 13 frames of
 * sword-north-weapon, a sheet with no face in it.
 *
 * So the search happens HERE, the result is reviewed as a contact sheet, and
 * the runtime only ever applies a list someone has looked at.  Same shape as
 * the hair-clip masks: derive offline, ship as data, no guessing in the frame
 * loop.
 *
 * ── WHAT AN EYE LOOKS LIKE ──
 * Measured on stand-south, each eye is 3 columns of white (the sclera), one
 * transition column, then 3 columns of near-black (the iris), 7 rows tall:
 *
 *     ssssWWW?###ssss        s skin   W white   # near-black   ? blend
 *
 * The iris is the part that carries a colour.  The white stays white and the
 * brow above it stays black, exactly as with the hats.
 *
 * ── WHAT KEEPS ARMOUR OUT ──
 * The discriminator is SKIN, not shape: an eye is set into a face, so the run
 * has skin on its outer side and skin under it.  `isSkin` here is character for
 * character the predicate playerSkins.js recolours with, so "what counts as
 * face" cannot drift between the two files.  A pauldron highlight has steel
 * around it and fails.
 *
 *   node tools/eyes/extract-eye-mask.mjs [--out src/rendering/eyeMask.json]
 */
import fs from 'node:fs';
import path from 'node:path';
import { decode } from '../png.mjs';

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const DIR = path.join(REPO, 'public/sprites/player');

/* playerSkins.js _isSkin, verbatim. */
const isSkin = (r, g, b, a) => a > 40 && r > g && g >= b && (r - b) > 30 && r > 90 && (r - g) > 25;
const isWhite = (r, g, b, a) => a > 40 && r > 200 && g > 200 && b > 190;
const isDark = (r, g, b, a) => a > 40 && r < 70 && g < 70 && b < 70;

/* THRESHOLDS SCALE WITH THE FRAME.  The sheets are not one resolution: stand is
   a 256 frame and jog is 128, so the same eye is 3 columns wide in one and 2 in
   the other, and its iris drops to a single column on some rows where the blend
   eats it.  Fixed pixel counts tuned on stand-south found 3 of jog-south's 26
   frames and none of jog-southwest's.  Everything below is expressed against
   the 256 frame and scaled by the sheet's own size. */
function limits(fw) {
  const k = fw / 256;
  return {
    minRun: Math.max(1, Math.round(2 * k)),
    maxRun: Math.max(2, Math.round(6 * k)),
    minRows: Math.max(3, Math.round(4 * k)),
    maxGap: Math.max(1, Math.round(2 * k)),
    /* v2.3.1929: how many ANTI-ALIASED columns may sit between the eye and the
       skin around it.  See skinBeside below for why one is needed at all. */
    blend: Math.max(1, Math.round(1 * k)),
  };
}

/** Iris pixels in one frame, as [x,y] in FRAME-LOCAL coordinates. */
export function irisIn(px, x0, x1, h) {
  const { minRun: MIN_RUN, maxRun: MAX_RUN, minRows: MIN_ROWS, maxGap: MAX_GAP, blend: BLEND } = limits(x1 - x0);
  /* v2.3.1929: OUT OF BOUNDS READS AS THE NEXT ROW.  The data is one flat array,
     so an x past the right edge silently returns a pixel from the row below
     instead of nothing -- and the scan below used to run to (i+1)*fw even when
     the sheet ended sooner.  bow-south is 390 wide with fw=234, so chunk 1 ran
     to 468 and "found" an eye at x=442, 52px off the end of the image, out of
     wrapped-around pixels.  It shipped in v2.3.1928 and painted nothing visible
     only because those coordinates fall outside the canvas at runtime too.
     Both ends are clamped now, and x1 is clamped by the caller as well. */
  const at = (x, y) => {
    if (x < 0 || y < 0 || x >= px.width || y >= px.height) return [0, 0, 0, 0];
    const i = (y * px.width + x) * 4;
    return [px.data[i], px.data[i + 1], px.data[i + 2], px.data[i + 3]];
  };
  /* ── v2.3.1929: SKIN BESIDE THE EYE, ACROSS THE BLEND ──
   *
   * Owner: "On Southwest one eye is still black (the other colored correctly)."
   *
   * Both tests below used to demand skin in the pixel IMMEDIATELY beside the
   * eye.  That holds for the near eye of a three-quarter view and fails for the
   * far one, because the far eye is drawn against the curve of the cheek and
   * the artist anti-aliased the join.  stand-southwest, rows 45-50: the near
   * eye reads `sssssWWW?###ssss` and passes, the far eye reads
   * `ssss?WWW?###ssss` -- one blend column at the sclera's outer edge -- and
   * was thrown out on four of its six rows.  Two surviving rows are not a
   * contiguous column of MIN_ROWS, so the whole eye vanished and shipped black
   * while its twin recoloured.  Nothing was wrong with the eye; the test was
   * asking the art to be aliased.
   *
   * Crossing ONE blend column costs nothing that keeps armour out.  The
   * discriminator was never the distance, it was that the neighbour is SKIN --
   * and a pixel that is neither white, dark, nor transparent is the only thing
   * allowed in between, so a steel plate (whose neighbours are more steel)
   * still fails on the first step. */
  const skinBeside = (from, step, y) => {
    for (let o = 0; o <= BLEND; o++) {
      const p = from + step * o;
      if (p < x0 || p >= x1) return false;
      const c = at(p, y);
      if (isSkin(...c)) return true;
      /* only an anti-aliased column may be crossed: white, dark or transparent
         means this is not a face edge and the walk stops here */
      if (isWhite(...c) || isDark(...c) || c[3] <= 40) return false;
    }
    return false;
  };
  /* rows first: collect candidate iris runs with skin on the far side */
  const rows = new Map();   /* y -> [[from,to], ...] */
  for (let y = 0; y < h; y++) {
    let run = 0;
    for (let x = x0; x < x1; x++) {
      if (isWhite(...at(x, y))) { run++; continue; }
      if (run >= MIN_RUN && run <= MAX_RUN) {
        /* skin OUTSIDE the sclera — a face, not a plate (v2.3.1929: across at
           most one anti-aliased column; see skinBeside) */
        if (skinBeside(x - run - 1, -1, y)) {
          let s = -1;
          for (let g = 0; g <= MAX_GAP && x + g < x1; g++) if (isDark(...at(x + g, y))) { s = x + g; break; }
          if (s >= 0) {
            let e = s;
            while (e + 1 < x1 && isDark(...at(e + 1, y)) && e - s + 1 < MAX_RUN) e++;
            if (e - s + 1 >= MIN_RUN) {
              if (skinBeside(e + 1, 1, y)) {
                if (!rows.has(y)) rows.set(y, []);
                rows.get(y).push([s, e]);
              }
            }
          }
        }
      }
      run = 0;
    }
  }
  /* an eye is a COLUMN of those runs, not one stray row */
  const out = [];
  const ys = [...rows.keys()].sort((a, b) => a - b);
  const used = new Set();
  for (const y of ys) {
    for (const [s, e] of rows.get(y)) {
      const k = y + ':' + s;
      if (used.has(k)) continue;
      const stack = [[y, s, e]];
      let yy = y;
      while (rows.has(yy + 1)) {
        const nxt = rows.get(yy + 1).find(([s2, e2]) => Math.abs(s2 - s) <= 1 && Math.abs(e2 - e) <= 1 && !used.has((yy + 1) + ':' + s2));
        if (!nxt) break;
        yy++; used.add(yy + ':' + nxt[0]); stack.push([yy, nxt[0], nxt[1]]);
      }
      used.add(k);
      if (stack.length >= MIN_ROWS) for (const [ry, rs, re] of stack) for (let x = rs; x <= re; x++) out.push([x, ry]);
    }
  }
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const outAt = process.argv.indexOf('--out');
  const outPath = outAt > 0 ? process.argv[outAt + 1] : path.join(REPO, 'src/rendering/eyeMask.json');
  const mask = {};
  let sheets = 0, frames = 0, pixels = 0;
  const report = [];
  for (const f of fs.readdirSync(DIR).filter((n) => n.endsWith('.png')).sort()) {
    const px = decode(fs.readFileSync(path.join(DIR, f)));
    /* v2.3.1929: CEIL, not round, and the last chunk is short.
       These sheets are NOT all an integer number of square frames: bow-southwest
       is 462x233 and holds THREE 154px poses, bow-south 390x234.  The chunking
       here is not the animation's frame grid and does not need to be -- it only
       has to agree with _paintEyes, which walks the UPSCALED canvas in 256px
       steps while `f * 256 < width`.  That is ceil(width/fw) chunks, with the
       final one running only to the image edge. */
    const fw = px.height, n = Math.max(1, Math.ceil(px.width / fw));
    const base = f.replace(/\.png$/, '');
    const per = [];
    let hit = 0;
    for (let i = 0; i < n; i++) {
      const pts = irisIn(px, i * fw, Math.min((i + 1) * fw, px.width), px.height).map(([x, y]) => [x - i * fw, y]);
      if (pts.length) { hit++; pixels += pts.length; }
      per.push(pts);
    }
    if (hit) {
      sheets++; frames += hit;
      /* EMIT IN 256-SPACE, as runs.  The sheets are 128 or 256 on disk but the
         recolour always runs on a 256 frame (recolorBodyToCanvas upscales
         first), so storing disk coordinates would make every consumer redo
         this conversion and get it wrong once.  A 128-sheet pixel becomes a
         2x2 block.  Runs rather than points because an iris is a solid
         rectangle and [x,y,w,h] is a quarter of the bytes. */
      const k = 256 / fw;
      mask[base] = per.map((pts) => {
        const set = new Set(pts.map(([x, y]) => x + ',' + y));
        const runs = [];
        for (const [x, y] of pts.slice().sort((a, b) => a[1] - b[1] || a[0] - b[0])) {
          if (runs.some((r) => r._y === y && x >= r._x0 && x <= r._x1)) continue;
          let x1 = x;
          while (set.has((x1 + 1) + ',' + y)) x1++;
          runs.push({ _y: y, _x0: x, _x1: x1 });
        }
        return runs.map((r) => [Math.round(r._x0 * k), Math.round(r._y * k),
          Math.round((r._x1 - r._x0 + 1) * k), Math.round(k)]);
      });
      report.push(`${base.padEnd(26)} ${hit}/${n} frames, ${per.reduce((s, p) => s + p.length, 0)} px`);
    }
  }
  fs.writeFileSync(outPath, JSON.stringify(mask));
  console.log(report.join('\n'));
  console.log(`\n${sheets} sheets, ${frames} frames, ${pixels} iris pixels`);
  console.log('wrote', path.relative(REPO, outPath), (fs.statSync(outPath).size / 1024).toFixed(1) + ' KB');
}
