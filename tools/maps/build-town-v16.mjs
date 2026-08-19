/* Build the stitched town map + its walkability grid (v2.3.1777).
 *
 *   node tools/maps/build-town-v16.mjs
 *
 * Owner: "I want the first 2 images to be the town map ... Not walkable."
 *
 * The two source images are NOT a matched pair — different framings, and the
 * right-hand one is drawn at a smaller zoom (measured off the cliff blocks,
 * ~1.4x).  So the join is: scale the right piece up, slide it vertically until
 * its cobble line meets the left piece's at the seam (measured per-column, not
 * eyeballed), and cross-fade over a wide overlap.  Cobble is a near-uniform
 * texture, which is why a feathered blend disappears into it.
 *
 * The WALK GRID is derived from the finished art rather than hand-painted, and
 * that is the whole point: v2.3.1693 turned every walk mask off because the
 * painted masks had drifted out of alignment with the art they were traced
 * from.  A mask computed FROM the art cannot drift — re-run this and it is
 * correct by construction.
 *
 * Blocked = anything that is not the cobblestone plateau: the cliff walls,
 * the treeline and grass fringe, and the painted valley beyond.  The fountain
 * and lamp posts fall out as blocked too, which is correct — you should not
 * walk through them.
 */
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(ROOT, 'tools/maps/src-art');
const OUT_IMG = path.join(ROOT, 'public/maps/town_v16.webp');
const OUT_WALK = path.join(ROOT, 'public/maps/town_v16.walk.json');

/* Measured, not guessed — see the header. */
const RATIO = 1.4;      /* right piece -> left piece zoom */
const OVERLAP = 260;    /* px of cross-fade */
const GRID_W = 192, GRID_H = 60;

const PAGE = `<!doctype html><meta charset="utf-8"><body><script>
const load = (src) => new Promise((res, rej) => {
  const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src;
});
/* Ground vs everything else, keyed on HUE rather than brightness.
   Measured medians on the finished map:
     cobble 225,164,62 (r-b 163)   alcove floor 233,177,76 (156)
     STAIRS 123,94,32  (r-b  85)   grass fringe 153,119,30 (126)
     cliff  155,161,111 (r-b 44)   valley 123,138,99 (25)   trees (17)
   The first rule brightness-gated on r>150 and therefore called the STAIRS
   blocked — they are the same ochre as the cobble, just in the shadow between
   the cliff walls — which walled the upper courtyard off as an island you
   could see and never reach.  r-b separates ground (>=85) from not-ground
   (<=44) with room to spare, and r>g rejects the cliff and the valley, which
   are both green-dominant. */
function cobbleAt(d, i) {
  const r = d[i], g = d[i+1], b = d[i+2];
  return (r - b) > 65 && r > 90 && r > g;
}
/* The SEAM alignment asks a different question from walkability: where does
   the bright open plateau begin?  It wants the lit cobble only — feeding it
   the walkability rule above pulled in the shadowed fringe and slid the two
   halves 120px out of register. */
function litCobbleAt(d, i) {
  const r = d[i], g = d[i+1], b = d[i+2];
  return r > 150 && g > 110 && b < 140 && (r - b) > 60;
}
window.__build = async (ratio, overlap, gw, gh) => {
  const a = await load('/map1.png');
  const b = await load('/map2.png');
  const H = a.height;
  const bw = Math.round(b.width * ratio), bh = Math.round(b.height * ratio);

  /* the right piece, scaled */
  const bc = document.createElement('canvas'); bc.width = bw; bc.height = bh;
  bc.getContext('2d').drawImage(b, 0, 0, bw, bh);

  /* topmost cobble row at each seam edge, median over a 160px band */
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
     the first time this ran. */
  const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H;
  const tc = tmp.getContext('2d', { willReadFrequently: true });
  tc.drawImage(bc, a.width - overlap, shift);
  const td = tc.getImageData(0, 0, W, H);
  const tp = td.data;
  const x0 = a.width - overlap;
  for (let y = 0; y < H; y++) {
    const row = y * W * 4;
    for (let x = x0; x < a.width; x++) {
      tp[row + x * 4 + 3] = Math.round(tp[row + x * 4 + 3] * (x - x0) / overlap);
    }
    for (let x = 0; x < x0; x++) tp[row + x * 4 + 3] = 0;
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
      const x0 = Math.floor(gx * cellW), x1 = Math.floor((gx + 1) * cellW);
      const y0 = Math.floor(gy * cellH), y1 = Math.floor((gy + 1) * cellH);
      for (let y = y0; y < y1; y += 2) {
        for (let x = x0; x < x1; x += 2) { n++; if (cobbleAt(d, (y * W + x) * 4)) hit++; }
      }
      /* A cell is walkable when it is mostly ground.  0.6 was the first
         choice and it made the STAIRS a 32px-wide slot: their outer treads sit
         in the cliff's shadow and fell just under the bar, so a player walking
         dead up the middle caught a blocked cell with one shoulder and stuck
         (measured — they stopped at y=444 every time).  0.45 opens the treads
         without opening the cliff foot, which is nowhere near half ground.
         The cliff still stops you; mp-townmap walks into it to prove that. */
      row.push(n > 0 && hit / n >= 0.45);
    }
    grid.push(row);
  }
  /* WebP, not PNG: this map is 3303x1024 of painterly gradient, which PNG
     stores in 7.4 MB and WebP in ~0.6 MB — the same order as the town map it
     replaces.  Chromium's encoder is right here, so the size decision does not
     need a second tool. */
  /* ── CONNECTIVITY: every walkable cell must be reachable ──
     The stairs bug was not a wrong colour so much as an unreachable ROOM: the
     upper courtyard stayed walkable while the steps up to it did not, so the
     grid was 'correct' cell by cell and broken as a place.  A flood fill from
     the largest region reports any island, which is the shape of that whole
     class of mistake. */
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
  /* A walkable cell you cannot reach is not walkable.  The offcuts here are
     dry patches in the PAINTED VALLEY that share the ground hue, and slivers
     of fringe on the far side of the cliff — reachable by nothing, and every
     one of them a place the player could be teleported or knocked into.
     Blocking all but the main region is the honest reading of the art. */
  for (const r of regions.slice(1)) {
    for (const [cx, cy] of r.cells) grid[cy][cx] = false;
  }
  return { png: out.toDataURL('image/webp', 0.88), w: W, h: H, shift, grid,
    main: regions[0].n, dropped: regions.slice(1).reduce((a, r) => a + r.n, 0),
    islands: regions.length - 1 };
};
</script></body>`;

const http = await import('http');
const files = {
  '/map1.png': readFileSync(path.join(SRC, 'town-west.png')),
  '/map2.png': readFileSync(path.join(SRC, 'town-east.png')),
};
const srv = http.createServer((req, res) => {
  const u = req.url.split('?')[0];
  if (u === '/build.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(PAGE); }
  if (files[u]) { res.writeHead(200, { 'content-type': 'image/png' }); return res.end(files[u]); }
  res.writeHead(404); res.end('no');
});
await new Promise((r) => srv.listen(4273, r));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
await page.goto('http://127.0.0.1:4273/build.html');
const got = await page.evaluate(([r, o, gw, gh]) => window.__build(r, o, gw, gh),
  [RATIO, OVERLAP, GRID_W, GRID_H]);
writeFileSync(OUT_IMG, Buffer.from(got.png.split(',')[1], 'base64'));
const walkable = got.grid.flat().filter(Boolean).length;  /* after unreachable islands are blocked */
writeFileSync(OUT_WALK, JSON.stringify({ width: GRID_W, height: GRID_H, grid: got.grid }));
console.log(`map  ${got.w}x${got.h}  (seam shift ${got.shift}px)`);
console.log(`walk ${GRID_W}x${GRID_H}  ${walkable}/${GRID_W * GRID_H} cells walkable (${Math.round(100 * walkable / (GRID_W * GRID_H))}%)`);
console.log(`reachable ${got.main} cells in one region; ${got.dropped} cell(s) in ${got.islands} unreachable island(s) blocked`);
await browser.close(); srv.close();
