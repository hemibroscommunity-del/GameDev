#!/usr/bin/env node
/* WHERE CAN YOU ACTUALLY WALK IN TOWN? (v2.3.2078)
 *
 * Ground is walkable only if BOTH halves agree: the zone's walk grid
 * (public/maps/town_v17.walk.json, `grid[ty][tx] === false` blocks) and the
 * prop footprints (src/data/worldProps.js, since v2.3.2073 all twelve block).
 * Every QA scenario that walks a measured lane has to sit inside both, and
 * three of them did not:
 *
 *   mp-movespeed  walked east from the spawn into bench-e and measured 129px
 *                 on one sample and 0 on the next (v2.3.2078).
 *   mp-potions    sprinted from (1000,1600), which the GRID marks unwalkable.
 *                 It passed anyway — isSolid's never-trap hatch lets a player
 *                 standing in a solid cell move out of it, so collision was
 *                 off for the whole measurement. Its own header records
 *                 checking propFootprint and NPC wander radii, and not the
 *                 grid (v2.3.2078).
 *   mp-cosmpose   looked for gather nodes in a zone that has none by design.
 *
 * Run this after moving a prop or re-cutting a map:
 *     node tools/dev/town-lanes.mjs            # the longest clear lanes
 *     node tools/dev/town-lanes.mjs 1070 1470  # is this spot clear?
 *
 * The body width matters and is why this samples across ±22px rather than
 * down a centre line: a lane clear at its centre and blocked at the
 * shoulders stops a player just the same.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MAP_W = 1674, MAP_H = 1774;        /* town_v17.webp */
const HALF = 22;                          /* half a body */
const MARGIN = 14;                        /* keep off a footprint's edge */

/* ═══ v2.3.2078: THE TOWN DOES NOT USE ITS .walk.json ═══
   The first cut of this tool read public/maps/town_v17.walk.json and called
   any `false` cell a wall. The client does not load that file: tiledMaps.js
   has WALK_MASK_ZONES = new Set(['worldview']), so town's terrain mask is
   generated and ignored, and collision in town comes from the PROP
   footprints alone — spriteSheets.js installPropOnlyGrids stamps them into a
   16px grid.

   That mattered: the tool reported mp-potions' sprint lane as "BLOCKED by
   grid" against a file the game never reads, and the real reason that lane
   was wrong is a different one (it is not, on the grid that counts). Mirror
   what the game does instead — same CELL, same floor()-based stamping — so
   this answers the question the player's legs ask. */
const CELL = 16;

/* IMPORTED, not regex-scraped.  The first cut of this tool matched prop
   literals with a `[^{}]*?` pattern and silently lost the FOUNTAIN — whose
   entry carries a nested `anim: { frames: 8, fps: 12 }` — then cheerfully
   reported a 965px clear lane at x=900, which runs straight through the
   basin.  It also counted the bank and the enchanter, which belong to
   another zone entirely.  worldProps.js has no imports of its own, so it
   loads directly and there is nothing left to get wrong. */
/* The zone is 52x55 TILEs; the MAP art is a hair larger and is not what
   collision is measured in. */
const ZONE_W = 52 * 32, ZONE_H = 55 * 32;
const GW = Math.round(ZONE_W / CELL), GH = Math.round(ZONE_H / CELL);
const propGrid = Array.from({ length: GH }, () => new Array(GW).fill(true));
const { propsForZone } = await import(join(REPO, 'src/data/worldProps.js'));
/* propsForZone, not a filter of my own: it applies propIsPlaced, which holds
   back the four buildings still carrying town_v16 coordinates (the bank and
   the enchanter among them, off the right-hand edge of a 1674px map — a
   documented to-do, not a deletion). A tool that counted them would report
   obstacles the game does not draw. */
const { propFootprint } = await import(join(REPO, 'src/data/worldProps.js'));
const PROPS = propsForZone('town')
  .filter((p) => propFootprint(p))
  .map((p) => ({ id: p.id, x: p.x, y: p.y, bw: p.blockW, bd: p.blockD, f: propFootprint(p) }));
/* Stamped exactly as installPropOnlyGrids does — floor() on both ends, so a
   footprint that starts 2px into a cell blocks the whole cell. That
   quantisation is not a detail: it is why TOWN_SPAWN at y 1010 shared a cell
   with a fountain whose footprint starts at y 1018 (v2.3.2078). */
for (const p of PROPS) {
  const x0 = Math.max(0, Math.floor(p.f.x0 * GW / ZONE_W));
  const x1 = Math.min(GW - 1, Math.floor(p.f.x1 * GW / ZONE_W));
  const y0 = Math.max(0, Math.floor(p.f.y0 * GH / ZONE_H));
  const y1 = Math.min(GH - 1, Math.floor(p.f.y1 * GH / ZONE_H));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) propGrid[y][x] = false;
}

const gridBlocked = (x, y) => {
  const gx = Math.floor(x * GW / ZONE_W), gy = Math.floor(y * GH / ZONE_H);
  if (!(gx >= 0 && gx < GW && gy >= 0 && gy < GH)) return 'off-map';
  return propGrid[gy][gx] === false ? 'prop-grid' : null;
};
/* `m` separates the two questions this tool answers.  m=0 is COLLISION —
   propFootprint's own box, what actually stops a player.  m=MARGIN is
   PLANNING — keep a lane off a footprint's edge, because a body has width
   and a measured walk that grazes a bench is a measurement of the bench.
   Reporting the second as the first is how a first cut of this called the
   spawn "blocked": TOWN_SPAWN is 8px clear of the fountain, which is tight,
   but it is clear. */
const propAt = (x, y, m) => {
  for (const p of PROPS) {
    if (x >= p.x - p.bw / 2 - m && x <= p.x + p.bw / 2 + m
     && y >= p.y - p.bd - m && y <= p.y + m) return p;
  }
  return null;
};
export function blockedAt(x, y, m = MARGIN) {
  for (const xx of [x - HALF, x, x + HALF]) {
    const g = gridBlocked(xx, y); if (g) return g;
    const p = propAt(xx, y, m); if (p) return p.id;
  }
  return null;
}

const args = process.argv.slice(2).map(Number).filter((n) => !Number.isNaN(n));
if (args.length >= 2) {
  const [x, y] = args;
  const solid = blockedAt(x, y, 0);
  const tight = blockedAt(x, y);
  if (solid) console.log(`(${x}, ${y}) -> SOLID: ${solid}`);
  else if (tight) console.log(`(${x}, ${y}) -> walkable, but within ${MARGIN}px of ${tight} `
    + `— fine to stand on, too tight to measure a walk through`);
  else console.log(`(${x}, ${y}) -> clear`);
  process.exit(solid ? 1 : 0);
}

console.log(`town: a ${GW}x${GH} prop grid (${CELL}px cells) over ${ZONE_W}x${ZONE_H} world px, `
  + `${PROPS.length} blocking props, sampled across a ${HALF * 2}px body.`);
console.log(`(town_v17.walk.json is NOT loaded by the client — see the note at the top.)\n`);

/* A PLACED prop that is nonetheless off the map would be a real error — the
   held-back v16 ones are already excluded above. */
const offMap = PROPS.filter((p) => p.x > MAP_W || p.y > MAP_H || p.x < 0 || p.y < 0);
if (offMap.length) {
  console.log(`!! ${offMap.length} PLACED prop(s) sit outside the ${MAP_W}x${MAP_H} `
    + `map and can never be reached:`);
  for (const p of offMap) console.log(`     ${p.id} at (${p.x}, ${p.y})`);
  console.log('');
}

const longest = (fixed, vary, axis) => {
  let run = 0, start = null, best = 0, bestStart = null;
  for (const v of vary) {
    const [x, y] = axis === 'ns' ? [fixed, v] : [v, fixed];
    if (!blockedAt(x, y)) {
      if (run === 0) start = v;
      run += 5;
      if (run > best) { best = run; bestStart = start; }
    } else run = 0;
  }
  return { len: best, from: bestStart, to: bestStart == null ? null : bestStart + best };
};
const range = (a, b) => { const o = []; for (let v = a; v < b; v += 5) o.push(v); return o; };

for (const [label, axis, fixedRange, varyRange] of [
  ['north-south', 'ns', range(200, 1500), range(300, 1740)],
  ['east-west', 'ew', range(300, 1740), range(150, 1550)],
]) {
  const rows = fixedRange.map((f) => ({ f, ...longest(f, varyRange, axis) }))
    .sort((a, b) => b.len - a.len).slice(0, 5);
  console.log(`longest clear ${label} lanes:`);
  for (const r of rows) {
    console.log(`  ${axis === 'ns' ? 'x' : 'y'}=${String(r.f).padStart(4)}  `
      + `clear ${axis === 'ns' ? 'y' : 'x'} ${r.from}..${r.to}  (${r.len}px)`);
  }
  console.log('');
}
