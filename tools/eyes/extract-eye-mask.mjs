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
    minRows: Math.max(2, Math.round(4 * k)),
    maxGap: Math.max(1, Math.round(2 * k)),
  };
}

/** Iris pixels in one frame, as [x,y] in FRAME-LOCAL coordinates. */
export function irisIn(px, x0, x1, h) {
  const { minRun: MIN_RUN, maxRun: MAX_RUN, minRows: MIN_ROWS, maxGap: MAX_GAP } = limits(x1 - x0);
  const at = (x, y) => { const i = (y * px.width + x) * 4; return [px.data[i], px.data[i + 1], px.data[i + 2], px.data[i + 3]]; };
  /* rows first: collect candidate iris runs with skin on the far side */
  const rows = new Map();   /* y -> [[from,to], ...] */
  for (let y = 0; y < h; y++) {
    let run = 0;
    for (let x = x0; x < x1; x++) {
      if (isWhite(...at(x, y))) { run++; continue; }
      if (run >= MIN_RUN && run <= MAX_RUN) {
        /* skin immediately OUTSIDE the sclera — a face, not a plate */
        const outer = x - run - 1;
        if (outer >= x0 && isSkin(...at(outer, y))) {
          let s = -1;
          for (let g = 0; g <= MAX_GAP && x + g < x1; g++) if (isDark(...at(x + g, y))) { s = x + g; break; }
          if (s >= 0) {
            let e = s;
            while (e + 1 < x1 && isDark(...at(e + 1, y)) && e - s + 1 < MAX_RUN) e++;
            if (e - s + 1 >= MIN_RUN) {
              const beyond = e + 1;
              if (beyond < x1 && isSkin(...at(beyond, y))) {
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
    const fw = px.height, n = Math.max(1, Math.round(px.width / fw));
    const base = f.replace(/\.png$/, '');
    const per = [];
    let hit = 0;
    for (let i = 0; i < n; i++) {
      const pts = irisIn(px, i * fw, (i + 1) * fw, px.height).map(([x, y]) => [x - i * fw, y]);
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
