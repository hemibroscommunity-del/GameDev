/* ═══ v2.3.3685: THE ANGLER'S FOREARM IN FRONT OF HIS T-SHIRT, NO PALE SLITS ═══
 *
 * The owner, 2026-10-27: "the hand for fishing should be in front of the t
 * shirt.  Right now it looks like it's going into his waistband", and earlier,
 * "a flickering grey or see-through hole near the waist and the reel hand".
 * The T-shirt's fishing strip is frame 12's picture moved a pixel or two a
 * frame, cut along frame 12's forearm; on 20 of the 32 frames the forearm
 * crosses higher and the shirt was drawn over it.
 * tools/gear/fish-forearm-front.mjs cuts the shirt along each frame's own
 * forearm, and closes 24 pale pixels sitting alone between two outline pixels
 * of the body (the white the art was cut out of).
 *   1. the fix is in and whole: the tool's own dry run finds nothing to do;
 *   2. both sheets are still thirty-two 128 px frames, the tee the body's size;
 *   3. the shirt is only ever taken away: every frame is frame 12's picture
 *      moved by its offset, less the cut -- and the cut is on exactly the
 *      frames where the forearm crosses higher, never on frame 12 itself;
 *   4. no pale slit is left in the body;
 *   5. phones fetch both new sheets: GEAR_VERSION and the body's VERSION.
 */
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 600))); }
}

const root = new URL('../../', import.meta.url);
const { decode } = await import('../../tools/gear/lib/png.mjs');

/* ── 1. the tool finds nothing left to do ── */
{
  const r = spawnSync(process.execPath, [new URL('tools/gear/fish-forearm-front.mjs', root).pathname], { encoding: 'utf8' });
  check('1a the tool runs (a dry run, nothing written; its invariants hold)', r.status === 0, (r.stderr || '').slice(0, 300));
  check('1b ...and finds no shirt over a forearm and no slit left: "0 px would be written"', /^0 px would be written/m.test(r.stdout || ''), (r.stdout || '').slice(0, 300));
}

/* ── 2. the sheets ── */
const FW = 128, N = 32, REF = 12;
const T = decode(readFileSync(new URL('public/sprites/gear/shirt/tshirt/fish-south.png', root)));
const B = decode(readFileSync(new URL('public/sprites/player/fish-south.png', root)));
check('2a the tee is the body\'s size, thirty-two 128 px frames', T.width === B.width && T.height === B.height && T.width === FW * N && T.height === FW,
  { tee: [T.width, T.height], body: [B.width, B.height] });

/* ── 3. the shirt is only ever taken away, and where the forearm crosses higher ──
   OFFSETS is tools/rebake_fish_gear.py's (and the tool's): each frame's shift
   of frame 12's picture. */
{
  const OFFSETS = [
    [-1, -1], [-1, -1], [-1, -2], [0, -2], [0, -2], [0, -2], [1, -2], [1, -2],
    [1, -2], [1, -1], [1, -1], [0, 0], [0, 0], [-2, 0], [-2, 0], [-5, 1],
    [-5, 1], [-5, 1], [-4, 1], [-4, 1], [-4, 1], [-4, 1], [-4, 1], [-4, 1],
    [-3, 1], [0, 0], [1, -1], [1, -2], [1, -2], [2, -2], [2, -2], [2, -2],
  ];
  const A = (f, x, y) => (x < 0 || y < 0 || x >= FW || y >= FW) ? 0 : T.data[((y * T.width) + f * FW + x) * 4 + 3];
  const [rx, ry] = OFFSETS[REF];
  const cut = [], added = [];
  for (let f = 0; f < N; f++) {
    const [dx, dy] = OFFSETS[f];
    let m = 0, e = 0;
    for (let y = 0; y < FW; y++) for (let x = 0; x < FW; x++) {
      const s = A(REF, x - (dx - rx), y - (dy - ry));
      const t = A(f, x, y);
      if (s > 0 && t === 0) m++;
      if (t > 0 && s === 0) e++;
    }
    cut.push(m); added.push(e);
  }
  check('3a no frame draws shirt where frame 12\'s picture, moved by its offset, has none', added.every((n) => n === 0), added);
  /* measured on the art: the forearm crosses higher than frame 12's on 3-10,
     13-20 and 27-30 (69-183 px of shirt over it each), and as frame 12's
     elsewhere */
  const HIGH = new Set([3, 4, 5, 6, 7, 8, 9, 10, 13, 14, 15, 16, 17, 18, 19, 20, 27, 28, 29, 30]);
  const wrong = cut.map((n, f) => [f, n]).filter(([f, n]) => (HIGH.has(f) ? !(n >= 40) : n !== 0));
  check('3b the shirt is cut on each of the 20 frames where the forearm crosses higher, and nowhere else (frame 12 untouched)', wrong.length === 0, { cut, wrong });
  check('3c ...about 2,700 px of shirt in all, never most of a frame\'s shirt', cut.reduce((a, b) => a + b, 0) > 2000 && cut.reduce((a, b) => a + b, 0) < 3500 && Math.max(...cut) < 400, cut);
}

/* ── 4. no pale slit left in the body ──
   A pale, grey or cream pixel alone between two dark outline pixels (rows
   40-119, where the figure's middle is): the white the art was cut out of,
   which showed as a dot that came and went with the frames. */
{
  const lum = (i) => B.data[i] * 0.299 + B.data[i + 1] * 0.587 + B.data[i + 2] * 0.114;
  const at = (f, x, y) => ((y * B.width) + f * FW + x) * 4;
  const left = [];
  for (let f = 0; f < N; f++) {
    for (let y = 40; y < 120; y++) for (let x = 1; x < FW - 1; x++) {
      const i = at(f, x, y);
      if (B.data[i + 3] === 0) continue;
      const r = B.data[i], g = B.data[i + 1], b = B.data[i + 2];
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      if (lum(i) <= 110 || (mx - mn) / Math.max(mx, 1) >= 0.35) continue;
      const dark = (j) => B.data[j + 3] > 200 && lum(j) < 60;
      if ((dark(at(f, x - 1, y)) && dark(at(f, x + 1, y))) || (dark(at(f, x, y - 1)) && dark(at(f, x, y + 1)))) left.push(`f${f} ${x},${y}`);
    }
  }
  check('4a no pale pixel sits alone between two outline pixels in the body\'s middle', left.length === 0, left);
}

/* ── 5. the phones fetch both again ── */
{
  const g = /const GEAR_VERSION = '2\.3\.(\d+)'/.exec(readFileSync(new URL('src/rendering/gearSheets.js', root), 'utf8'));
  check('5a GEAR_VERSION is 2.3.3685 or later, so every phone fetches the cut shirt', !!g && +g[1] >= 3685, g && g[0]);
  const v = /const VERSION = (\d+);/.exec(readFileSync(new URL('src/rendering/playerSprites.js', root), 'utf8'));
  check('5b the body sheets\' VERSION is 102 or later, so every phone fetches the closed slits', !!v && +v[1] >= 102, v && v[0]);
}

console.log(`\nfish-forearm: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
