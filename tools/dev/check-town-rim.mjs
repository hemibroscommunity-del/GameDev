#!/usr/bin/env node
/* ═══ v2.3.2896: TOWN'S ROCK RING -- EVERYTHING STILL INSIDE IT ═══
 *
 * Owner: "can you make it so the player can't walk over the giant gray rocks
 * surrounding the town?  Watch the borders for detecting walkability since
 * there have been issues before with that."
 *
 * The issues before were all one shape: a wall where a player needed to be.
 * The hue mask put rock on the stairs and a 32 px slot that trapped you
 * (v2.3.1777); the World View's arrival landed on its wall (v2.3.2075) and its
 * trail-head sent you straight home (v2.3.2094); a spoke's return put you
 * 8 px from a blocked cell (v2.3.2122).  Each was found by a player.
 *
 * So this builds town's collision grid the way the game does -- the rim
 * (src/data/townRim.js townRimGrid) with the building footprints stamped on
 * (a copy of spriteSheets.js stampPropFootprints) -- and walks it the way the
 * movement step does (a 20 px box round the body centre, every corner in an
 * open cell), and asks, from the spawn:
 *
 *   - can you STAND at the spawn and at the World View arrival?
 *   - can you REACH the exit trigger at the top of the stairs?
 *   - can you REACH every townsperson's talk radius and every door's prompt?
 *   - is every rock sample -- all round the ring, the outcrop, the column
 *     tops, the forest -- still a wall?
 *
 * It runs with the boots offset at 44, 52 and 60 px: 52 is what the game
 * measures in town (playerGroundDy), and the slack either side means a small
 * change to the character art cannot quietly turn a pass into a trap.
 *
 * Node only, ~1 s.  Wired into tools/dev/precheck.mjs for any change to the
 * rim, the props, the NPCs, the spawn, the exits or the zone's size.
 */
import { TOWN_RIM, TOWN_RIM_HOLES, TOWN_RIM_MAP_V, TOWN_RIM_WORLD, townRimGrid, townRimInside } from '../../src/data/townRim.js';
import { propsForZone, propFootprint, TOWN_MAP_V } from '../../src/data/worldProps.js';
import { NPC_DATA } from '../../src/data/gameDisplay.js';
import { TOWN_SPAWN, TILE } from '../../src/data/constants.js';
import { TOWN_EXITS } from '../../src/data/effects.js';
import { ZONES } from '../../src/data/zones.js';

const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); return !!cond; };

const zone = ZONES.town;
const mw = zone.w * TILE, mh = zone.h * TILE;
const CELL = 16, HS = 10;                          /* spriteSheets CELL; BroTown's hs */
const gw = Math.max(1, Math.round(mw / CELL)), gh = Math.max(1, Math.round(mh / CELL));

/* The rim only switches on for the map it was traced on (spriteSheets
   townRimFor).  A mismatch is not a failure of the rim -- it is off, and the
   game is back to walk-anywhere -- but it IS a to-do worth failing on, or the
   ring silently stops being a wall the day the art is re-fused. */
ok(TOWN_RIM_MAP_V === TOWN_MAP_V, `the rim was traced on town_v${TOWN_RIM_MAP_V} but TOWN_MAP_V is ${TOWN_MAP_V} -- re-run tools/maps/build_town_rim.py --write for the new art`);
ok(TOWN_RIM_WORLD.w === mw && TOWN_RIM_WORLD.h === mh, `the rim was traced at ${TOWN_RIM_WORLD.w}x${TOWN_RIM_WORLD.h} but town is ${mw}x${mh} -- re-run the builder`);

/* A closed ring that never reaches the map edge: the edge is not a wall the
   rim can lean on, it is where the camera stops. */
const margin = Math.min(...TOWN_RIM.map(([x, y]) => Math.min(x, y, mw - x, mh - y)));
ok(margin >= 24, `the rim comes within ${margin} px of the map edge`);

/* ── building footprints, exactly as spriteSheets.stampPropFootprints ── */
function stamp(grid) {
  const out = grid.map((r) => r.slice());
  for (const p of propsForZone('town')) {
    const f = propFootprint(p);
    if (!f) continue;
    const gx0 = Math.max(0, Math.floor(f.x0 * gw / mw)), gx1 = Math.min(gw - 1, Math.floor(f.x1 * gw / mw));
    const gy0 = Math.max(0, Math.floor(f.y0 * gh / mh)), gy1 = Math.min(gh - 1, Math.floor(f.y1 * gh / mh));
    for (let gy = gy0; gy <= gy1; gy++) for (let gx = gx0; gx <= gx1; gx++) out[gy][gx] = false;
  }
  return out;
}

function checkAt(feetDy) {
  const grid = stamp(townRimGrid(gw, gh, mw, mh, feetDy));
  const cellOpen = (x, y) => {
    const gx = Math.floor(x * gw / mw), gy = Math.floor(y * gh / mh);
    return gy >= 0 && gy < gh && gx >= 0 && gx < gw && grid[gy][gx] !== false;
  };
  /* isSolid's four corners, at a body centre */
  const stands = (x, y) => cellOpen(x - HS, y - HS) && cellOpen(x + HS, y - HS)
    && cellOpen(x - HS, y + HS) && cellOpen(x + HS, y + HS);
  const tag = `[feet ${feetDy}px]`;

  /* Flood the body centre over cell centres, 4-connected, from the spawn. */
  const reach = new Uint8Array(gw * gh);
  const c = (v) => (v + 0.5) * CELL;
  const sgx = Math.floor(TOWN_SPAWN.x / CELL), sgy = Math.floor(TOWN_SPAWN.y / CELL);
  if (!ok(stands(TOWN_SPAWN.x, TOWN_SPAWN.y), `${tag} you cannot stand at TOWN_SPAWN (${TOWN_SPAWN.x}, ${TOWN_SPAWN.y})`)) return;
  const q = [sgy * gw + sgx];
  reach[q[0]] = 1;
  for (let h = 0; h < q.length; h++) {
    const i = q[h], gx = i % gw, gy = (i / gw) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = gx + dx, ny = gy + dy;
      if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
      const j = ny * gw + nx;
      if (reach[j] || !stands(c(nx), c(ny))) continue;
      reach[j] = 1;
      q.push(j);
    }
  }
  const reachable = [];
  for (let i = 0; i < reach.length; i++) if (reach[i]) reachable.push({ x: c(i % gw), y: c((i / gw) | 0) });
  const within = (x, y, r) => reachable.some((p) => (p.x - x) ** 2 + (p.y - y) ** 2 <= r * r);

  /* The World View arrival: 4 tiles from the exit marker toward the hub
     centre, as zoneTransitions computes it.  nudgeSpawnToWalkable would move
     a bad one, but a nudge is a repair -- the point itself should stand. */
  for (const ex of TOWN_EXITS) {
    const hdx = zone.w / 2 - ex.tx, hdy = zone.h / 2 - ex.ty;
    const hl = Math.max(0.001, Math.hypot(hdx, hdy));
    const ax = (ex.tx + hdx / hl * 4) * TILE, ay = (ex.ty + hdy / hl * 4) * TILE;
    ok(stands(ax, ay) && within(ax, ay, CELL), `${tag} the arrival from ${ex.zoneId} (${ax.toFixed(0)}, ${ay.toFixed(0)}) is not open, reachable ground`);
    /* The exit trigger: manhattan <= 2 TILES from the marker, measured on the
       body centre's tile (zoneTransitions TOWN_EXIT_R). */
    const hit = reachable.some((p) => Math.abs(Math.floor(p.x / TILE) - ex.tx) + Math.abs(Math.floor(p.y / TILE) - ex.ty) <= 2);
    ok(hit, `${tag} the ${ex.zoneId} exit at tile (${ex.tx}, ${ex.ty}) cannot be walked into`);
  }
  /* Townsfolk: NPC_PROX_OPEN (90) from the body centre to their feet. */
  for (const n of NPC_DATA) {
    if (n.zone && n.zone !== 'town') continue;
    ok(within(n.x, n.y, 80), `${tag} ${n.id} at (${n.x}, ${n.y}) is out of talking reach`);
  }
  /* Doors: buildingPropNear's 95 px from the body centre to the prop anchor. */
  for (const p of propsForZone('town')) {
    if (!p.action) continue;
    ok(within(p.x, p.y, 85), `${tag} the ${p.id} door at (${p.x}, ${p.y}) is out of reach`);
  }
  return reachable.length;
}

/* ── the rocks are rock ──
   Sample points ON the ring (feet positions, world px), read off the art all
   the way round: north wall, the alcove's walls, the outcrop, east and west
   faces, the tops of the south columns, either side of the stairs, and the
   forest past it all. */
const ROCK = [
  [760, 140, 'north wall, west'], [1450, 200, 'north wall, east'], [300, 450, 'north-west wall'],
  [820, 760, 'the rock west of the alcove mouth'], [1360, 400, 'outcrop east of the alcove'], [1180, 660, 'outcrop south tip'],
  [1850, 650, 'north-east wall'], [2100, 1150, 'east wall'], [120, 1100, 'west wall'],
  [200, 1650, 'south-west column tops'], [520, 1920, 'south column tops, west'], [820, 2040, 'beside the stairs, west'],
  [1180, 2060, 'beside the stairs, east'], [1500, 1950, 'south-east column tops'], [1940, 1640, 'east column tops'],
  [60, 60, 'forest'], [2140, 2260, 'forest'], [300, 2250, 'forest below the cliff'],
];
for (const [x, y, what] of ROCK) ok(!townRimInside(x, y), `the rim takes in the rock at (${x}, ${y}) -- ${what}`);
/* ...and the ground is ground */
const GROUND = [
  [1190, 1531, 'the spawn'], [1060, 1940, 'the World View arrival'], [1000, 2080, 'the stairs'],
  [500, 700, 'the pine grove, north-west'], [1500, 450, 'the pine grove, north-east'], [1020, 300, 'the alcove'],
  [300, 1250, 'the west plaza'], [1950, 1250, 'the east plaza'],
];
for (const [x, y, what] of GROUND) ok(townRimInside(x, y), `the rim shuts out ${what} at (${x}, ${y})`);

const counts = [44, 52, 60].map((d) => checkAt(d));

if (fails.length) {
  console.log(`town-rim: ${fails.length} problem(s)`);
  for (const f of fails) console.log('  ' + f);
  process.exit(1);
}
console.log(`town-rim: ${TOWN_RIM.length}-point outline + ${TOWN_RIM_HOLES.length} hole(s); `
  + `spawn, arrival, exit, ${NPC_DATA.filter((n) => !n.zone || n.zone === 'town').length} townsfolk and every door reachable `
  + `(${counts.join(' / ')} standable cells at feet 44 / 52 / 60 px); ${ROCK.length} rock samples blocked`);
