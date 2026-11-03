/* ═══ v2.3.4038: THE TOWNSFOLK WALK AROUND AND WORK ═══
 *
 * The owner, 2026-11-02: "Make NPCs walk around and do stuff now since it
 * doesn't make much memory anymore."  (His list of 2026-10-26, item 22: "the
 * blacksmith hammering, a cook at the fire ... chopping, fishing, farming",
 * made the way players are drawn.)  Since v2.3.3809 a townsperson is drawn
 * live from his look, as another player is (rendering/lookFolk.js), so a
 * stroll is the jog every player has and a job is one of the player's own
 * work poses, from the body sheets every phone already holds: nothing new
 * is loaded for it.
 *
 * WHO DOES WHAT (FOLK_DAYS, one row a townsperson of the Wheel's BroTown):
 *   - a QUEST GIVER stays findable: "A quest giver is pinned on purpose: one
 *     who wanders is one you have to hunt for" (docs/UI-DESIGN-NOTES.md) still
 *     holds, so he keeps his spot and only shifts a step or two round it
 *     (`tether`: every stop within FOLK_TETHER_PX), and turns to face you and
 *     stops when you come within FOLK_GIVER_NEAR;
 *   - a KEEPER or a LOCAL walks a short loop from his own spot, by his door,
 *     and pauses at a stop, now and then to WORK there (`work`: the mining
 *     swing for a hammer, a cleaver, an axe, a gavel or a hoe; the pickup for
 *     coins, a gem, a sign, a parcel or luggage; the cast by the river).
 *   Every stop is an OFFSET from his own spot ([dx, dy], +y south), never a
 *   Wheel coordinate; tools/world/test-world-core.mjs walks every leg of every
 *   loop against the town's footprints and ground, on both Wheels, so nobody
 *   walks through a building, a prop or off the town into the water.
 *
 * THE SAME ON EVERY PHONE: where he is on his loop is a pure function of the
 * clock and a seed from his name (folkAt) -- no message, no server.  Two
 * phones with their clocks a second apart see him a second apart.  What one
 * phone does on its own -- a giver stopping for you, a walker waiting while
 * you stand in his way, the cap below -- holds HIM where he is, and he walks
 * back onto his loop after (folkStep: at most a walk's pace, a little
 * quicker while he is behind), never a jump.
 *
 * AT MOST FOLK_MAX_WALKERS WALK NEAR THE SCREEN AT ONCE: the nearest to the
 * view's middle walk, the rest stand till one stops (a phone's frame is the
 * budget).  Far from the screen a townsperson has no figure at all (v2.3.3809:
 * entityRenderer _updateNPCs destroys it), and his place on the loop costs a
 * few sums a frame.
 *
 * Only while he is drawn live (lookFolkOn: the look palette, so not on a
 * computer, which draws the photographs -- lookPaletteChoice.js): a
 * photograph cannot step or work, so with them he stands at his spot, as
 * before.  `?folkwalk=0` keeps them at their spots on one phone; the Test
 * panel's "Townsfolk drawn live" off (game/clientOff.js `lookfolk`) stands
 * them back at their spots on every phone, live, with their photographs.
 *
 * No imports, so node can test it (server/test/townsfolk-walk.test.mjs);
 * the frame's own work, on the game's state, is game/townsfolkDay.js. */

/* a stroll, world px a second (the jog's frames go by the distance covered,
   entityRenderer _drawFolk, so the feet never skate at any pace) */
export const FOLK_WALK_PX_S = 80;
/* while he is behind his loop (a stop for you, the cap), this much quicker */
export const FOLK_CATCH_UP = 1.6;
/* further behind than this (a first sight, the race's end far off): placed */
export const FOLK_SNAP_PX = 420;
/* a quest giver's stops are all within this of his spot */
export const FOLK_TETHER_PX = 30;
/* a quest giver stops and faces you within this (world px, feet to feet) */
export const FOLK_GIVER_NEAR = 200;
/* with a window or dialogue open, any townsperson this near stops and faces
   you (the tap's own reach, BroTown.jsx NPC_TAP_REACH) */
export const FOLK_TALK_NEAR = 300;
/* a walker waits rather than walk into you */
export const FOLK_BUMP_PX = 22;
/* walkers near the screen at once */
export const FOLK_MAX_WALKERS = 6;
/* the work poses: each a body sheet of the player's own, south only, from
   the look palette's numbers (lookSets/body.js POSE_DIRS) */
export const FOLK_WORK_POSES = Object.freeze(['mine', 'fish', 'pickup']);

/* A giver's default day: his spot, a step either side and back (four stops,
   about 22 s round). */
const TETHER = [[0, 0, 7000], [16, 6, 4000], [0, 0, 6000], [-14, 8, 4000]];

/* name -> { tether?, stops: [[dx, dy, pauseMs, work?], ...] }.  He walks
   from each stop to the next in turn, the last back to the first, pausing
   pauseMs at each (working, if it says).  Spots: data/wheelBuildingDoors.js
   WHEEL_TOWNSFOLK (Mayor Bro: placing.js mayorSpot). */
export const FOLK_DAYS = Object.freeze({
  /* the quest givers: their spots, a step or two */
  'Mayor Bro': { tether: true, stops: TETHER },
  'Lil Bro': { tether: true, stops: [[0, 0, 6000], [-14, 6, 4000], [0, 0, 5000], [14, 10, 4000]] },
  'Beastmaster Bro': { tether: true, stops: [[0, 0, 7000], [14, 8, 4000], [0, 0, 6000], [-16, 6, 4000]] },
  /* the forge's hammer at his anvil: the mining swing */
  'Blacksmith Bro': { tether: true, stops: [[0, 0, 8000, 'mine'], [18, 8, 4000], [0, 0, 7000, 'mine'], [-16, 10, 4000]] },
  /* the store's shelves: the pickup */
  'Diego': { tether: true, stops: [[0, 0, 7000], [14, 8, 5000, 'pickup'], [0, 0, 6000], [-12, 10, 4000]] },
  /* chopping at his bench: the swing */
  'Woodworker Bro': { tether: true, stops: [[0, 0, 8000, 'mine'], [16, 8, 4000], [0, 0, 6000, 'mine'], [-14, 8, 4000]] },
  /* hoeing by the Feed & Seed: the swing */
  'Farmer Bro': { tether: true, stops: [[0, 0, 6000], [18, 10, 8000, 'mine'], [0, 0, 5000], [-12, 12, 4000]] },
  /* the keepers: a short loop by the door */
  'Ace': { stops: [[0, 0, 7000], [-120, 40, 5000], [-40, 90, 4000], [60, 40, 5000]] },
  'Sterling': { stops: [[0, 0, 6000], [-150, 50, 5000], [-70, 90, 7000, 'pickup'], [60, 40, 4000]] },   /* stacking his coins */
  'Slim': { stops: [[0, 0, 7000], [120, 40, 5000], [60, 90, 5000], [-80, 50, 4000]] },
  'Chef Blaze': { stops: [[0, 0, 8000, 'mine'], [140, 30, 4000], [60, 80, 4000], [-60, 40, 5000]] },   /* his cleaver */
  'Glint': { stops: [[0, 0, 6000], [120, 30, 6000, 'pickup'], [40, 60, 4000], [-110, 30, 5000]] },   /* a gem held up to the light */
  'Postmaster Pete': { stops: [[0, 0, 7000, 'pickup'], [-120, 60, 4000], [-40, 120, 5000], [80, 60, 4000]] },   /* a parcel */
  'Deed Dave': { stops: [[0, 0, 6000], [-150, 40, 7000, 'pickup'], [-70, 60, 4000], [110, 30, 5000]] },   /* planting a SOLD sign */
  'Benny': { stops: [[0, 0, 6000], [140, 40, 5000, 'pickup'], [60, 110, 4000], [-80, 40, 5000]] },   /* luggage */
  'Guildmaster Gary': { stops: [[0, 0, 6000], [140, 60, 5000], [40, 140, 6000], [-80, 60, 4000]] },
  'Sheriff Buck': { stops: [[0, 0, 5000], [160, 50, 4000], [160, 140, 4000], [-40, 140, 4000], [-60, 40, 4000]] },   /* his beat */
  'Gavel Greg': { stops: [[0, 0, 8000, 'mine'], [-140, 30, 5000], [-60, 80, 5000], [50, 10, 4000]] },   /* the gavel */
  /* the locals */
  'Old Man Reel': { stops: [[0, 0, 10000, 'fish'], [30, -110, 6000], [10, -50, 3000]] },   /* by the river */
  'Bean': { stops: [[0, 0, 5000], [-100, -40, 4000], [-160, 60, 5000], [-40, 120, 4000]] },   /* the square, toward where you arrive (on an upright phone's screen there) */
  'Tourist Terry': { stops: [[0, 0, 4000], [-120, -80, 4000], [120, -120, 5000], [200, 20, 4000], [60, 60, 4000]] },
});

/** His row's stops, or the givers' default when he gives quests but his row
 *  walks (a quest given to a keeper later keeps him findable), or null. */
export function folkStops(name, giver) {
  const has = typeof name === 'string' && Object.prototype.hasOwnProperty.call(FOLK_DAYS, name);
  const row = has ? FOLK_DAYS[name] : null;
  if (!row) return giver ? TETHER : null;
  if (giver && !row.tether) return TETHER;
  return row.stops;
}

/** A number from his name (FNV-1a), the same on every phone. */
export function folkSeed(name) {
  let h = 2166136261;
  const s = String(name || '');
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

/* each loop's legs and pauses, worked out once (keyed by the stops array) */
const _loops = new WeakMap();
function loopOf(stops) {
  let L = _loops.get(stops);
  if (L) return L;
  const segs = [];
  let t = 0;
  for (let i = 0; i < stops.length; i++) {
    const a = stops[i], b = stops[(i + 1) % stops.length];
    const pause = Math.max(0, a[2] || 0);
    segs.push({ kind: 'pause', t0: t, t1: t + pause, x: a[0], y: a[1], work: a[3] || null });
    t += pause;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const ms = len / FOLK_WALK_PX_S * 1000;
    if (ms > 0) segs.push({ kind: 'walk', t0: t, t1: t + ms, ax: a[0], ay: a[1], bx: b[0], by: b[1] });
    t += ms;
  }
  L = { segs, period: t };
  _loops.set(stops, L);
  return L;
}

/** Where he is on his loop at `nowMs` (the clock): { dx, dy, walking, work }
 *  -- offsets from his spot, whether that is a leg between stops, and the
 *  work pose at a stop that has one.  Pure: every phone works out the same. */
export function folkAt(stops, seed, nowMs) {
  if (!stops || !stops.length) return { dx: 0, dy: 0, walking: false, work: null };
  const L = loopOf(stops);
  if (!(L.period > 0)) return { dx: stops[0][0], dy: stops[0][1], walking: false, work: stops[0][3] || null };
  const t = (((nowMs + (seed % L.period)) % L.period) + L.period) % L.period;
  for (const s of L.segs) {
    if (t >= s.t1) continue;
    if (s.kind === 'pause') return { dx: s.x, dy: s.y, walking: false, work: s.work };
    const k = (t - s.t0) / (s.t1 - s.t0);
    return { dx: s.ax + (s.bx - s.ax) * k, dy: s.ay + (s.by - s.ay) * k, walking: true, work: null };
  }
  const s0 = stops[0];
  return { dx: s0[0], dy: s0[1], walking: false, work: s0[3] || null };
}

/** The eight facings by a step (dx, dy), +y south -- the renderer's names
 *  (entityRenderer NPC_DIRS_8). */
const DIRS8 = ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'];
export function folkFacing(dx, dy) {
  const oct = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
  return DIRS8[((oct % 8) + 8) % 8];
}

/** One frame's move toward where his loop has him: at most a walk's pace
 *  (quicker while far behind), placed outright from further than
 *  FOLK_SNAP_PX.  Returns the distance still to go. */
export function folkStep(npc, tx, ty, dtMs) {
  const dx = tx - npc.x, dy = ty - npc.y;
  const d = Math.hypot(dx, dy);
  if (d > FOLK_SNAP_PX || !(dtMs > 0)) { if (d > FOLK_SNAP_PX) { npc.x = tx; npc.y = ty; } return d > FOLK_SNAP_PX ? 0 : d; }
  if (d < 0.01) return 0;
  const v = FOLK_WALK_PX_S * (d > 24 ? FOLK_CATCH_UP : 1);
  const step = Math.min(d, v * dtMs / 1000);
  npc.x += dx / d * step; npc.y += dy / d * step;
  return d - step;
}

/** Is a townsperson's FEET at (x, y) somewhere he must not walk: a wall or
 *  the water in the Wheel's walk grid (rows of bytes or booleans, 0 / false a
 *  wall, over worldW x worldH world px), or inside a footprint ({x0, y0, x1,
 *  y1}, the walk test's: worldProps.zoneBlockers)?  The loops are checked
 *  against the plan's footprints by test-world-core; this is the second
 *  line, near the screen, against what is really placed there. */
export function folkGroundBlocked(grid, worldW, worldH, boxes, x, y) {
  if (boxes && boxes.length) {
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      if (b && x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1) return true;
    }
  }
  if (grid && grid.length && worldW > 0 && worldH > 0) {
    const gh = grid.length, gw = (grid[0] && grid[0].length) || 0;
    if (gw > 0) {
      const gx = Math.floor(x * gw / worldW), gy = Math.floor(y * gh / worldH);
      if (gy < 0 || gx < 0 || gy >= gh || gx >= gw) return true;
      const v = grid[gy][gx];
      if (v === false || v === 0) return true;
    }
  }
  return false;
}

/** Which of `walkers` ({ id, d }: d his distance from the view's middle) may
 *  walk this frame: the FOLK_MAX_WALKERS nearest, then by id so a tie is the
 *  same every frame.  A Set of ids. */
export function folkWalkersAllowed(walkers, max) {
  const n = typeof max === 'number' ? max : FOLK_MAX_WALKERS;
  const list = walkers.slice().sort((a, b) => (a.d - b.d) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return new Set(list.slice(0, Math.max(0, n)).map((w) => w.id));
}
