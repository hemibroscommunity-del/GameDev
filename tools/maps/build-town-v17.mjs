/* Build the stitched town map + its walkability grid (v2.3.1813).
 *
 *   node tools/maps/build-town-v17.mjs [--preview]
 *
 * Owner: "I have a better map of Brotown that I want you to use.  The fusion
 * should be better.  You can just keep the buildings and NPCS removed for now."
 *
 * WHY THE OLD FUSION LOOKED POOR, measured rather than guessed.  v16's two
 * source images were not a matched pair: the right-hand one was drawn at a
 * smaller zoom, so the builder had to scale it up ~1.4x.  Upscaling painted
 * art by 40% softens it, and the seam then joined a sharp half to a blurry
 * one — no amount of blending hides that, because the mismatch is in the
 * detail frequency, not the alignment.
 *
 * This pair is very nearly matched: both pieces are 887x1774, same lighting.
 * MEASURED, after an earlier draft of this comment simply asserted "same
 * zoom": the east half's cobbles are 5.8% smaller (stone-edge density 251.6
 * vs 237.8, with a within-image spread of 0.8 and 8.3 respectively, so the
 * difference is real and the metric is stable).  5.8% is left UNCORRECTED
 * deliberately — resampling one half to fix it would soften it, which is
 * precisely what made v16 look bad at 40%.  Below the eye's threshold and
 * sharp beats exactly-matched-and-blurry.  RATIO is therefore 1.0 and
 * neither half is resampled at all.
 *
 * ORDER, established by looking rather than by a score.  town17-west is
 * bounded by cliff down its LEFT edge and opens to the right; town17-east
 * opens to the left and is bounded by cliff down its RIGHT edge.  So west is
 * the left piece.  Two automated scorers were tried first and BOTH were
 * junk: a per-pixel overlap search preferred whatever sampled fewest pixels
 * (its "best" sat at the smallest overlap offered, at the edge of the offset
 * range), and a structural search's control — image A matched against
 * itself, which must score 0 — came back 0.29, so it was measuring nothing.
 * The pieces are independently generated, so their COBBLE CANNOT ALIGN
 * pixel-wise: adjacent columns inside one image differ by ~12/channel, the
 * best cross-piece butt join by ~34, unrelated columns by ~65.  That is the
 * real reason a cross-fade is the right technique here and a hunt for the
 * "true" seam was never going to converge.  See docs/TRAPS.md §23.
 *
 * The join therefore hides in the texture instead of matching it: both
 * pieces are open cobble at the seam, cobble is near-uniform, and a wide
 * smoothstep fade across it is invisible.  The pieces are still slid
 * vertically to put their cobble lines on the same row — that part IS
 * measurable, because the cobble/cliff BOUNDARY is structure, not texture.
 *
 * The WALK GRID is derived from the finished art rather than hand-painted,
 * for v16's reason and unchanged: v2.3.1693 turned every walk mask off
 * because the painted masks had drifted out of alignment with the art they
 * were traced from.  A mask computed FROM the art cannot drift.
 */
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(ROOT, 'tools/maps/src-art');
const PREVIEW = process.argv.includes('--preview');
const OUT_IMG = path.join(ROOT, 'public/maps/town_v17.webp');
const OUT_WALK = path.join(ROOT, 'public/maps/town_v17.walk.json');

/* Matched pair — see the header.  Neither half is resampled. */
const RATIO = 1.0;
/* 100, not 240 — chosen by looking at both.  The wider fade ghosted the
   top-centre cliff, where the two halves genuinely disagree about where the
   rock is: blending 240px of "cliff" with 240px of "open cobble" averages
   them into a smear.  At 100 the cobble seam is still invisible (uniform
   texture hides it) while the cliff stays sharp and reads as a notch between
   two buttresses.  Wider is not smoother when the halves disagree. */
const OVERLAP = +(process.env.BT_OVERLAP || 100);
/* The finished map is ~1534x1774, so the grid is near-square unlike v16's
   wide plateau.  Cell size lands at ~10px, the same order v16 used. */
const GRID_W = 164, GRID_H = 174;

const PAGE = `<!doctype html><meta charset="utf-8"><body><script>
const load = (src) => new Promise((res, rej) => {
  const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src;
});
/* Ground vs everything else, keyed on HUE rather than brightness — lifted
   unchanged from build-town-v16.mjs, where the thresholds were measured.
   A brightness gate called the STAIRS blocked (same ochre as the cobble,
   just in the cliff's shadow) and walled the upper courtyard off as an
   island you could see and never reach.  r-b separates ground (>=85) from
   not-ground (<=44); r>g rejects the cliff and the valley, both of which
   are green-dominant. */
function cobbleAt(d, i) {
  const r = d[i], g = d[i+1], b = d[i+2];
  return (r - b) > 65 && r > 90 && r > g;
}
/* Seam alignment asks a different question from walkability: where does the
   bright OPEN plateau begin?  Feeding it the walkability rule pulls in the
   shadowed fringe and slides the halves out of register. */
function litCobbleAt(d, i) {
  const r = d[i], g = d[i+1], b = d[i+2];
  return r > 150 && g > 110 && b < 140 && (r - b) > 60;
}
function smoothstep(t) { return t * t * (3 - 2 * t); }
/* ═══ WHY THIS IS AN IRREGULAR CUT AND NOT A CROSS-FADE ═══
   A wide fade was tried first and measured: across the seam the brightness
   is flat (max column-to-column step 3.98 inside the band vs 4.81 in the
   cobble beside it — i.e. smoother than the texture's own variation), and
   it STILL looked wrong at 1:1.  Brightness was never the problem.
   Cross-fading two UNCORRELATED textures averages two different random
   stone patterns, and half of one plus half of another is low-contrast
   mush — a blurred bar the eye finds instantly even though no edge exists.
   Widening the fade makes the mush wider, which is why 240 looked worse
   than 100 rather than smoother.

   So: cut hard, and hide the cut by making it not a line.  Each side keeps
   its full contrast, and the boundary wanders on a low-frequency wobble
   (+/-46px) with only a few px of feather to kill aliasing.  The eye finds
   straight lines, not irregular ones.

   Deterministic on purpose — fixed sines, no Math.random — so re-running
   the build produces the identical map rather than a new one each time. */
function seamOffsetAt(y, amp) {
  const t = y / 140;
  const n = 0.55 * Math.sin(t) + 0.28 * Math.sin(t * 2.17 + 1.3)
          + 0.17 * Math.sin(t * 4.31 + 2.7);
  return n * amp;
}

window.__build = async (ratio, overlap, gw, gh) => {
  const a = await load('/west.png');   /* left piece */
  const b = await load('/east.png');   /* right piece */
  const H = a.height;
  const bw = Math.round(b.width * ratio), bh = Math.round(b.height * ratio);

  const bc = document.createElement('canvas'); bc.width = bw; bc.height = bh;
  bc.getContext('2d').drawImage(b, 0, 0, bw, bh);

  /* topmost lit-cobble row at each seam edge, median over a 160px band */
  const topRow = (cv, x0, x1) => {
    const c = cv.getContext('2d', { willReadFrequently: true });
    const d = c.getImageData(0, 0, cv.width, cv.height).data;
    const rows = [];
    for (let x = x0; x < x1; x++) {
      for (let y = 0; y < cv.height; y++) {
        if (litCobbleAt(d, (y * cv.width + x) * 4)) { rows.push(y); break; }
      }
    }
    rows.sort((p, q) => p - q);
    return rows.length ? rows[rows.length >> 1] : 0;
  };
  const ac = document.createElement('canvas'); ac.width = a.width; ac.height = a.height;
  ac.getContext('2d').drawImage(a, 0, 0);
  const shift = topRow(ac, a.width - 160, a.width) - topRow(bc, 0, 160);

  const W = a.width + bw - overlap;
  const out = document.createElement('canvas'); out.width = W; out.height = H;
  const o = out.getContext('2d', { willReadFrequently: true });
  o.drawImage(a, 0, 0);
  /* The right piece, slid to meet the cobble line, cross-faded in.  The ramp
     is applied to the PIECE'S OWN alpha channel rather than by compositing a
     gradient: the obvious destination-in route erases everything outside the
     region it fills, which silently blanked the entire right half of the map
     the first time v16 ran.  Same trap, same avoidance. */
  const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H;
  const tc = tmp.getContext('2d', { willReadFrequently: true });
  tc.drawImage(bc, a.width - overlap, shift);
  const td = tc.getImageData(0, 0, W, H);
  const tp = td.data;
  const x0 = a.width - overlap;
  const AMP = Math.min(46, overlap * 0.42);   /* wobble, inside the shared band */
  const FEATHER = 3;                          /* just enough to kill the stair-step */
  const mid = x0 + overlap / 2;
  for (let y = 0; y < H; y++) {
    const row = y * W * 4;
    const cut = mid + seamOffsetAt(y, AMP);
    for (let x = 0; x < a.width; x++) {
      const t = Math.max(0, Math.min(1, (x - (cut - FEATHER)) / (2 * FEATHER)));
      tp[row + x * 4 + 3] = Math.round(tp[row + x * 4 + 3] * smoothstep(t));
    }
  }
  tc.putImageData(td, 0, 0);
  o.drawImage(tmp, 0, 0);

  /* ── the walk grid, from the finished pixels ── */
  const d = o.getImageData(0, 0, W, H).data;
  const cellW = W / gw, cellH = H / gh;
  const grid = [];
  for (let gy = 0; gy < gh; gy++) {
    const row = [];
    for (let gx = 0; gx < gw; gx++) {
      let hit = 0, n = 0;
      const cx0 = Math.floor(gx * cellW), cx1 = Math.floor((gx + 1) * cellW);
      const cy0 = Math.floor(gy * cellH), cy1 = Math.floor((gy + 1) * cellH);
      for (let y = cy0; y < cy1; y += 2) {
        for (let x = cx0; x < cx1; x += 2) { n++; if (cobbleAt(d, (y * W + x) * 4)) hit++; }
      }
      /* 0.45, not 0.6 — v16 measured this.  At 0.6 the STAIRS became a 32px
         slot (their outer treads sit in the cliff's shadow and fell under the
         bar) and a player walking dead up the middle stuck with one shoulder
         in a blocked cell.  0.45 opens the treads without opening the cliff
         foot, which is nowhere near half ground. */
      row.push(n > 0 && hit / n >= 0.45);
    }
    grid.push(row);
  }
  /* ── CONNECTIVITY: every walkable cell must be reachable ──
     The v16 stairs bug was not a wrong colour so much as an unreachable ROOM:
     the upper courtyard stayed walkable while the steps up to it did not, so
     the grid was 'correct' cell by cell and broken as a place.  A flood fill
     from the largest region reports any island. */
  const seen = grid.map((row) => row.map(() => false));
  const regions = [];
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
    if (!grid[y][x] || seen[y][x]) continue;
    let n = 0; const stack = [[x, y]]; seen[y][x] = true;
    const cells = [];
    while (stack.length) {
      const [cx, cy] = stack.pop(); n++; cells.push([cx, cy]);
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx<0||ny<0||nx>=gw||ny>=gh) continue;
        if (grid[ny][nx] && !seen[ny][nx]) { seen[ny][nx] = true; stack.push([nx, ny]); }
      }
    }
    regions.push({ n, cells });
  }
  regions.sort((p, q) => q.n - p.n);
  /* A walkable cell you cannot reach is not walkable — dry patches in the
     painted valley that share the ground hue, slivers of fringe beyond the
     cliff.  Every one of them is a place a player could be knocked into. */
  for (const r of regions.slice(1)) {
    for (const [cx, cy] of r.cells) grid[cy][cx] = false;
  }
  /* A PREVIEW that shows the seam and the mask, because "it built" is not
     "it looks right" and the only way to know is to look. */
  let preview = null;
  {
    const P = 0.42;
    const pc = document.createElement('canvas');
    pc.width = Math.round(W * P); pc.height = Math.round(H * P);
    const px = pc.getContext('2d');
    px.drawImage(out, 0, 0, pc.width, pc.height);
    /* blocked cells tinted red, so a bad mask is visible at a glance.
       --nomask turns it off: judging the ART needs the art, and judging the
       MASK needs the tint, and one picture cannot do both well. */
    px.fillStyle = window.__noMask ? 'rgba(0,0,0,0)' : 'rgba(255,40,40,0.42)';
    for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
      if (grid[gy][gx]) continue;
      px.fillRect(gx * cellW * P, gy * cellH * P, cellW * P + 1, cellH * P + 1);
    }
    /* the seam band, so a visible join has somewhere to be caught */
    px.strokeStyle = 'rgba(80,180,255,0.9)'; px.lineWidth = 1;
    px.beginPath();
    for (let y = 0; y < H; y += 4) {
      const cx2 = (x0 + overlap / 2 + seamOffsetAt(y, Math.min(46, overlap * 0.42))) * P;
      if (y === 0) px.moveTo(cx2, 0); else px.lineTo(cx2, y * P);
    }
    px.stroke();
    preview = pc.toDataURL('image/png');
  }
  /* WebP, not PNG: painterly gradient stores an order of magnitude smaller,
     and this map is resident in memory for the whole session. */
  return { png: out.toDataURL('image/webp', 0.90), preview, w: W, h: H, shift, grid,
    main: regions[0].n, dropped: regions.slice(1).reduce((s, r) => s + r.n, 0),
    islands: regions.length - 1 };
};
</script></body>`;

const http = await import('http');
const files = {
  '/west.png': readFileSync(path.join(SRC, 'town17-west.png')),
  '/east.png': readFileSync(path.join(SRC, 'town17-east.png')),
};
const srv = http.createServer((req, res) => {
  const u = req.url.split('?')[0];
  if (u === '/build.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(PAGE); }
  if (files[u]) { res.writeHead(200, { 'content-type': 'image/png' }); return res.end(files[u]); }
  res.writeHead(404); res.end('no');
});
await new Promise((r) => srv.listen(4274, r));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
await page.goto('http://127.0.0.1:4274/build.html');
await page.evaluate((n) => { window.__noMask = n; }, process.argv.includes('--nomask'));
const got = await page.evaluate(([r, o, gw, gh]) => window.__build(r, o, gw, gh),
  [RATIO, OVERLAP, GRID_W, GRID_H]);
if (PREVIEW) {
  const p = path.join(ROOT, `tools/maps/.preview-town-v17-${OVERLAP}${process.argv.includes('--nomask') ? '-art' : ''}.png`);
  writeFileSync(p, Buffer.from(got.preview.split(',')[1], 'base64'));
  console.log(`preview -> ${p}`);
} else {
  writeFileSync(OUT_IMG, Buffer.from(got.png.split(',')[1], 'base64'));
  writeFileSync(OUT_WALK, JSON.stringify({ width: GRID_W, height: GRID_H, grid: got.grid }));
}
const walkable = got.grid.flat().filter(Boolean).length;
console.log(`map  ${got.w}x${got.h}  (aspect ${(got.w / got.h).toFixed(3)}, seam shift ${got.shift}px)`);
console.log(`walk ${GRID_W}x${GRID_H}  ${walkable}/${GRID_W * GRID_H} cells walkable (${Math.round(100 * walkable / (GRID_W * GRID_H))}%)`);
console.log(`reachable ${got.main} in one region; ${got.dropped} cell(s) in ${got.islands} island(s) blocked`);
await browser.close(); srv.close();
