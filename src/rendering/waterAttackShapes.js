/* ═══ v2.3.4359: THE WATER ATTACK'S PIXELS ═══
 *
 * The owner, 2026-11-10: "avoid marking cartoonish shapes. Make water effects
 * with pixelation similar to how you made the flame effects (burning log
 * fire, burning buildings, etc)".
 *
 * The first cut (v2.3.4355) drew smooth outlined shapes on a canvas -- drops
 * with bezier sides, a curling crest -- and turned and scaled them freely:
 * vector cartoons over a pixel-art world.  This is the campfire's way
 * (campfireArt.js) and the monsters' shots' (monsterShotArt.js smallPieces):
 * every piece a few HARD pixels written one by one from a map of letters, on
 * a stepped ramp of the frog's own sac's colours, sampled nearest so each
 * stays a square, and never turned or scaled off the grid (waterAttackFx.js
 * only places them, on whole art pixels).
 *
 * No imports: the node suite reads the maps as they are.
 *
 *   WATER_RAMP    letter -> [rgb, alpha]: O the deep edge, D and M the water's
 *                 body, L its shine, W foam ('.' is see-through)
 *   WATER_PIXELS  name -> rows of letters, one a pixel
 *     d2, d3     a speck of spray, 2 and 3 px
 *     g5a..g17b  a GOUT of water, 5 to 17 px across, two cuts of each (a
 *                piece flickers between them).  Made as the campfire's
 *                flame is: a mass whose EDGE is broken by eight uneven
 *                lobes, never a round ball, its inside the ramp -- foam
 *                white at its heart, the body's blues round it, the deep
 *                step only along its lower right (the world is lit from the
 *                upper left).  No outline: the rim IS the edge, so gouts
 *                laid over one another run together into one torrent.
 *     k1..k4     the splash where a spray comes down, a crown of tongues
 *                thrown up off the ground: rising, at its height, breaking
 *                (its tips come away), falling
 *     f3, f5     foam: a puff of white
 *     r1..r3     a ring spreading flat on the ground, three sizes
 */
export const WATER_RAMP = Object.freeze({
  O: [0x17477e, 255], D: [0x2b78c8, 255], M: [0x3f9be0, 255], L: [0xa9e0ff, 255], W: [0xf2fbff, 255],
});

const TAU = Math.PI * 2;
/* the same numbers every time, from a seed (campfireArt.js's) */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* a gout: n px across.  Eight lobes round it, each its own length, say how
   far the water reaches that way (the broken edge); inside, a pixel's step of
   the ramp is how deep in the mass it is, pushed lighter to the upper left
   and darker to the lower right, with a little grain. */
function gout(n, seed) {
  const r = rng(seed);
  const c = (n - 1) / 2;
  const lobes = [];
  for (let i = 0; i < 8; i++) lobes.push(0.56 + 0.44 * r());
  const rows = [];
  for (let y = 0; y < n; y++) {
    let row = '';
    for (let x = 0; x < n; x++) {
      const dx = x - c, dy = y - c;
      const a = ((Math.atan2(dy, dx) / TAU) * 8 + 8) % 8;
      const i0 = Math.floor(a) % 8, f = a - Math.floor(a);
      const edge = (n / 2) * (lobes[i0] * (1 - f) + lobes[(i0 + 1) % 8] * f);
      const d = Math.hypot(dx, dy) / edge;
      const grain = r();
      if (d > 1) { row += '.'; continue; }
      const v = (1 - d) * 0.74 - ((dx + dy) / n) * 0.86 + (grain - 0.5) * 0.2;
      row += v > 0.64 ? 'W' : v > 0.4 ? 'L' : v > 0.14 ? 'M' : v > -0.1 ? 'D' : 'O';
    }
    rows.push(row);
  }
  return rows;
}

/* the splash's crown, CROWN_W x CROWN_H, its foot on the bottom row: three
   tongues of water (the middle one and one a side, the outer two the
   tallest: a crown), each column white at its tip, then the shine, the body,
   and the deep step where it meets the ground.  `amp` is how high it stands,
   `spread` how wide; from `gap` up its tips have come away from it. */
export const CROWN_W = 29;
export const CROWN_H = 17;
function crown(amp, spread, gap, seed) {
  const r = rng(seed);
  const c = (CROWN_W - 1) / 2;
  const grid = [];
  for (let y = 0; y < CROWN_H; y++) grid.push(new Array(CROWN_W).fill('.'));
  for (let x = 0; x < CROWN_W; x++) {
    const u = (x - c) / c / spread;
    const jit = r();
    if (Math.abs(u) > 1) continue;
    const tongue = 0.5 + 0.5 * Math.cos(u * Math.PI * 2.5);
    const lean = 0.55 + 0.45 * Math.abs(u);
    const hgt = Math.max(1, Math.min(CROWN_H, Math.round((CROWN_H - 1) * amp * (0.2 + 0.8 * tongue) * lean + (jit - 0.5) * 0.9)));
    for (let k = 0; k < hgt; k++) {
      const y = CROWN_H - 1 - k;
      const top = hgt - 1 - k;   /* 0 at the tip */
      /* a tall tongue's tip comes away: a gap under its top two pixels */
      if (gap > 0 && hgt >= 6 && top >= 2 && top < 2 + gap) continue;
      grid[y][x] = top === 0 ? 'W' : top <= (hgt >= 5 ? 2 : 1) ? 'L' : k === 0 ? 'D' : 'M';
    }
  }
  return grid.map((row) => row.join(''));
}

/* a flat ring seen from above and in front: an ellipse one pixel thick, its
   far side the shine and its near side the body, a deep edge under it */
function ring(w, h) {
  const rows = [];
  const cx = (w - 1) / 2, cy = (h - 2) / 2, rx = cx, ry = cy;
  for (let y = 0; y < h; y++) {
    let row = '';
    for (let x = 0; x < w; x++) {
      const on = (yy) => { const d = ((x - cx) / (rx + 0.5)) ** 2 + ((yy - cy) / (ry + 0.5)) ** 2, e = ((x - cx) / Math.max(0.5, rx - 0.6)) ** 2 + ((yy - cy) / Math.max(0.5, ry - 0.6)) ** 2; return d <= 1 && e > 1; };
      row += on(y) ? (y <= cy ? 'L' : 'M') : (y > 0 && on(y - 1) && y > cy ? 'O' : '.');
    }
    rows.push(row);
  }
  return rows;
}

export const WATER_PIXELS = Object.freeze({
  d2: ['LM', 'MD'],
  d3: ['.L.', 'LMD', '.D.'],
  g5a: gout(5, 51), g5b: gout(5, 52),
  g9a: gout(9, 91), g9b: gout(9, 92),
  g13a: gout(13, 131), g13b: gout(13, 132),
  g17a: gout(17, 171), g17b: gout(17, 172),
  k1: crown(0.5, 0.55, 0, 1),
  k2: crown(1, 0.8, 0, 2),
  k3: crown(0.9, 1, 2, 3),
  k4: crown(0.5, 1, 3, 4),
  f3: ['.W.', 'WWL', '.L.'],
  f5: ['.WW..', 'WWWW.', 'LWWWW', '.LWWL', '..LL.'],
  r1: ring(9, 5),
  r2: ring(15, 7),
  r3: ring(21, 9),
});
