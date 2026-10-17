/* ═══ v2.3.2943: THE GROUND WORKER — the Wheel's ground, laid on the phone ═══
 *
 * Owner, 2026-09-29, after the swatches came out sharp: "I want to continue
 * on."  The next step was walking on them in the game.  With `?trial=wheel`
 * the World View becomes the whole Wheel at full size -- 43,008 game px
 * square -- and its ground is never downloaded as pictures.  This worker
 * builds the plan (the same blueprint and swatch map the World Builder and
 * the Ground Studio build) and lays the swatches on it one piece at a time,
 * as the game asks (src/game/wheelTrial.js), on another core so walking
 * never waits for it.
 *
 * WHERE THE SWATCHES COME FROM, the newest winning:
 *   1. the Ground Studio's own storage on this site (IndexedDB) -- the
 *      pictures the owner made, exactly as the studio keeps them, put on its
 *      palette here the way the studio does (style/process.js, mapPixels).
 *      No upload, no waiting for a build: make a swatch, open the game.
 *   2. the game's copy, /world/ground/ (the studio's "Download all" zip,
 *      unpacked into the repo) -- what every other player will see.
 * A swatch in neither is drawn in its plan colour, chequered, as the studio
 * shows it.  v2.3.2951: the same two places give the BLENDS -- a pair of
 * alike grounds' third picture, laid through the middle of the zone where
 * they mix (ground.js, BLEND PICTURES): the studio's 'prep' key
 * '<pair key>|M', the game's manifest `blends` and <pair key>-M.png.  Each
 * is kept here like a swatch, under its pair's key, version M.
 *
 * MEMORY.  A swatch is 1024 x 1024; unpacked as colours that is 4 MB, so the
 * worker keeps them as one palette index a pixel (1 MB) and only the last
 * DECODED_KEEP.  v2.3.3298: no blueprint or swatch map of the whole Wheel
 * any more (13 MB and 3 MB, and 25 times that five times bigger): the blocks
 * round you (worldblocks.js, ~50 KB each, the 48 nearest kept).  Each piece
 * goes to the game as its colours and is not kept here.
 *
 * MESSAGES (all answered in order, one at a time):
 *   { type: 'init', search }     -> { type: 'ready', ... } (see init below;
 *                                   v2.3.2975: `objects`, where every object stands --
 *                                   core/placing.js -- and `objects.mayor`, Mayor Bro's spot;
 *                                   v2.3.3032: `objects.doors`, each standing building's door;
 *                                   v2.3.2947: `edges`, the grounds with edge pieces;
 *                                   v2.3.2951: `blends`, the pairs with a blend;
 *                                   v2.3.2948: `search`, the page's address query:
 *                                   edge pieces are put away and loaded only when
 *                                   it says `edgepieces` -- ground.js, EDGE_PIECES;
 *                                   v2.3.2955: and blends only when it says
 *                                   `blends` -- ground.js, BLENDS)
 *   { type: 'chunk', id, i, j }  -> { type: 'chunk', id, i, j, w, h, data, ms, under, wf }
 *                                   (v2.3.3190: with `palette` on init, a piece on
 *                                   256 colours or fewer comes as `idx`, one colour
 *                                   number a pixel in rows of `stride` bytes, and
 *                                   `pal`, its colours, 4 bytes each -- no `data`;
 *                                   the game draws it so, rendering/paletteTex.js)
 *                                   (v2.3.2967: `under`, the swatch DRAWN at every
 *                                   UNDER art px of the piece, for the footsteps;
 *                                   v2.3.3019: `wf`, the piece's WATER FIELD -- how
 *                                   far from the shore, which water, which way a
 *                                   river runs -- for the water's motion, or null:
 *                                   ground.js WATER THAT MOVES)
 *   { type: 'where', id, x, y }  -> { type: 'where', id, q, reg, tier, words }
 *                                   (answered at once; v2.3.2966: the region
 *                                   and tier there, and in words for the map)
 *   { type: 'blocks', id, x0, y0, x1, y1 } -> a 'block' for each block under that
 *                                   rectangle (game px), then { type: 'blocks', id, n }
 *                                   (v2.3.3298)
 *   (unasked)                    -> { type: 'block', I, J, x, y, w, h, walk, swim }
 *                                   (v2.3.3298: a block of the Wheel built --
 *                                   for a piece, or for 'where' -- and its walls:
 *                                   one bit a cell of it, row by row, where you
 *                                   cannot walk and where you may swim; `x`, `y`
 *                                   its corner in cells, `w`, `h` its size)
 *   anything that fails          -> { type: 'error', id, message }
 */
import { PLAN as BASE_PLAN, planFor } from '../plan.js';
import { buildBlueprint, planFeatures } from './layout.js';
import { gridInfo } from './grid.js';
/* v2.3.3298: the Wheel a block at a time (worldblocks.js), and what is baked */
import { wheelBlocks, BLOCK, PIECE_MARGIN, overviewCells, planFingerprint } from './worldblocks.js';
import { decodePlaced } from './placedfile.js';
import { objectCatalog } from '../../objects/catalog.js';   /* v2.3.3300: emptyObjects */
import { PLACED_SETS } from './placed.js';
import { materialMap, composeGround, swatchesUnder, overviewPixels, overviewLands, EDGE_CLEAR, edgePiecesOn, blendsOn, blendPair, blendsUnder, waterRivers, wavesOn, calmWater, WATER_SWATCHES } from './ground.js';
import { PIXEL } from '../../style/bible.js';
import { piecePalette } from './piecePalette.js';   /* v2.3.3190: a piece as colour numbers */
import { mapPixels, nearestIn, ownPalette, coloursOf } from '../../style/process.js';
import { wheelMap, whereWords } from './wheelmap.js';
import { stepOf, cleanSteps } from './footsteps.js';
import { placeObjects, mayorSpot, doorSpots, objectFootprints, placingOpts } from './placing.js';

const TILE = PIXEL.groundTile;                                    /* 1024 px a swatch */
/* v2.3.2982: the plan this worker lays -- the plan itself, or the big-town
   preview's (`?trial=wheel&bigtown`, plan.js bigTownPlan), chosen on init */
let PLAN = BASE_PLAN;
const K = Math.round(PLAN.worldPxPerArtPx / PIXEL.gamePxPerArtPx); /* 3 ground px a plan art px: 2 a game px */
const WPA = PLAN.worldPxPerArtPx;                                 /* 1.5 game px a plan art px */
const CHUNK = 128;          /* plan art px a piece: 192 game px, 384 ground px */
const APRON = 3;            /* art px laid past each edge, so smooth scaling reads the true neighbour at a join.
                               v2.3.3019: 3, was 1 -- the water's swell (rendering/wheelWater.js) draws
                               each water px from up to 4 game px away, and at a piece's edge that is
                               the apron: with 1 (1.5 game px) it would read past the picture's edge.
                               6% more ground laid and kept a piece. */
const UNDER = 2;            /* v2.3.2967: art px (3 game px) a byte of a piece's `under` -- 4 KB a piece */
const DECODED_KEEP = 16;    /* swatch pictures kept unpacked, 1 MB each (v2.3.2947: edge pieces too; v2.3.2951: and blends -- the town's busiest piece needs about 13) */
const GAME_BASE = '/world/ground/';
const PLACED_BASE = '/world/';            /* v2.3.3298: tools/world/bake-wheel-world.mjs (v2.3.3300: + each set's dir) */
const OBJECTS_BASE = '/world/objects/';   /* v2.3.2975: the Object Studio's "Download for the game", repacked */
const STUDIO_DB = 'brotown-ground-studio';

let W = null;               /* once ready: v2.3.3298: `blocks`, the Wheel a block at a time (worldblocks.js:
                               each block's swatch map, region and tier, built as the pieces round you
                               are asked for), `F` the plan's features, `mm` the swatch catalog
                               (ids, water...), the map (v2.3.2966) and the pieces' options */
let swatches = Object.create(null);   /* id -> { from: 'studio'|'game', vers: { A?, B?, E? }, pal, mapped }; v2.3.2951: a pair's key -> { ..., vers: { M } } */
let stepChoices = Object.create(null); /* v2.3.2968: id -> the footstep sound the owner chose (the studio's, else the game copy's) */
const decoded = new Map();            /* 'id|ver' -> tile ({w, h, idx, pal} or {w, h, data}) */
const failed = new Set();             /* 'id|ver' that could not be unpacked: drawn in plan colour */

/* ═══ v2.3.2959: DOWNLOADS THAT CANNOT STOP THE GROUND ═══
   The owner, 2026-10-01, walking the Wheel on a phone with their own 96
   tiles in the game: "the ground wasn't loading fast enough to keep up with
   me walking across it to the next area sometimes".  Their readout: 177 ms
   a piece on average, the worst 6.5 s, pop-ins 52 and then 118 -- and then
   no ground at all, 3 pieces waiting and one swatch "unreadable".  A picture
   was fetched only when a piece first needed it, one at a time, with no time
   limit, and the pieces are laid one after another: one download that hung
   on a slow connection stopped every piece behind it for good, and one that
   failed was never tried again.  Now:
   - DOWNLOADS run apart from the laying, DL_PARALLEL at a time, each given
     DL_TIMEOUT_MS; one that fails or runs out of time is tried again after a
     wait that grows from DL_RETRY_MS to DL_RETRY_MAX_MS;
   - a piece waits for its pictures at most PIECE_WAIT_MS -- counted from
     when a piece FIRST waited for that download, so one stuck download holds
     up one piece, not each piece after it in turn; a picture that has not
     come is laid in the plan's colour and the piece goes back marked
     `partial`, with the pictures it went without (`lacking`);
   - those pictures are tried again until they come, piece or no piece, and
     when one does the worker says so ('got'): the game lays again, without
     waiting, just the pieces that went without it (wheelGround.js) -- never
     on a timer, so a picture that never comes costs nothing but its tries;
   - every piece asked for starts the downloads for the swatches PREFETCH
     pieces round it, so a walk finds them already here -- in all but one of
     the DL_PARALLEL lines, the last kept for a piece being laid now;
   - the game's pictures are asked for at ?v=<their manifest's date>, which
     public/_headers lets the phone keep: a second visit reads them from the
     phone, with no trip to the server at all. */
const DL_PARALLEL = 4;
const DL_TIMEOUT_MS = 15000;
const DL_RETRY_MS = 3000;
const DL_RETRY_MAX_MS = 30000;
const PIECE_WAIT_MS = 4000;
const PREFETCH = 2;
/* downloaded pictures kept as their files (about 0.25 MB each) -- the phone's
   own cache holds the rest, and this many cover a walk's next few screens */
const FILES_KEEP = 32;
const files = new Map();              /* 'id|ver' -> Blob, the picture as downloaded */
const dlJobs = new Map();             /* 'id|ver' -> { k, p, resolve, urgentAt } waiting or downloading */
const dlLine = [];                    /* the waiting ones, most wanted first */
const dlRetry = new Map();            /* 'id|ver' -> { at, wait } after a failed try */
let dlActive = 0, dlFails = 0;
const lacking = new Set();            /* pictures the piece being laid went without */
const owed = new Set();               /* every picture some piece went without: tried until it comes, then 'got' */
const chasing = new Set();            /* owed pictures with a try already set for when their wait is over */

/* The picture's file: at once if it is here; else a promise of it -- or of
   null, when it cannot be had (yet).  `urgent`: a piece is waiting for it. */
function want(k, urgent) {
  const f = files.get(k);
  if (f) { files.delete(k); files.set(k, f); return Promise.resolve(f); }
  const job = dlJobs.get(k);
  if (job) {
    if (urgent) {
      if (job.urgentAt == null) job.urgentAt = performance.now();
      const n = dlLine.indexOf(job);
      if (n > 0) { dlLine.splice(n, 1); dlLine.unshift(job); }
    }
    return job.p;
  }
  const r = dlRetry.get(k);
  if (r && performance.now() < r.at) return Promise.resolve(null);
  let resolve;
  const p = new Promise((res) => { resolve = res; });
  const fresh = { k, p, resolve, urgentAt: urgent ? performance.now() : null };
  dlJobs.set(k, fresh);
  if (urgent) dlLine.unshift(fresh); else dlLine.push(fresh);
  pump();
  return p;
}
function pump() {
  while (dlActive < DL_PARALLEL && dlLine.length) {
    /* the wanted-now ones are at the front; the rest leave a line free */
    if (dlLine[0].urgentAt == null && dlActive >= DL_PARALLEL - 1) break;
    const job = dlLine.shift();
    dlActive++;
    fetchFile(job.k).then((blob) => {
      dlActive--;
      dlJobs.delete(job.k);
      if (blob) {
        dlRetry.delete(job.k);
        files.set(job.k, blob);
        while (files.size > FILES_KEEP) files.delete(files.keys().next().value);
        if (owed.delete(job.k)) post({ type: 'got', k: job.k });
      } else {
        dlFails++;
        const prev = dlRetry.get(job.k), wait = prev ? Math.min(DL_RETRY_MAX_MS, prev.wait * 2) : DL_RETRY_MS;
        dlRetry.set(job.k, { at: performance.now() + wait, wait });
        chase(job.k);
      }
      job.resolve(blob);
      pump();
    });
  }
}
/* A picture some piece went without: on its way, or tried again when its
   wait is over -- asked for or not -- until it comes and 'got' is said. */
function chase(k) {
  if (!owed.has(k) || dlJobs.has(k) || chasing.has(k)) return;
  if (files.has(k)) { owed.delete(k); post({ type: 'got', k }); return; }
  const r = dlRetry.get(k), left = r ? r.at - performance.now() : 0;
  if (left > 0) { chasing.add(k); setTimeout(() => { chasing.delete(k); chase(k); }, left + 20); return; }
  want(k, false);
}
/* one download, given DL_TIMEOUT_MS from start to the last byte; null on
   any failure (a phone's connection drops, a server's error, a hang) */
async function fetchFile(k) {
  const cut = k.lastIndexOf('|'), s = swatches[k.slice(0, cut)], src = s && s.vers[k.slice(cut + 1)];
  if (!src) return null;
  if (src.blob) return src.blob;      /* the Ground Studio's: already on the phone */
  const ac = typeof AbortController === 'function' ? new AbortController() : null;
  let timer = null;
  const late = new Promise((res) => { timer = setTimeout(() => { if (ac) ac.abort(); res(null); }, DL_TIMEOUT_MS); });
  const get = (async () => {
    const r = await fetch(src.url, ac ? { signal: ac.signal } : undefined);
    return r.ok ? await r.blob() : null;
  })().catch(() => null);
  try { return await Promise.race([get, late]); } finally { clearTimeout(timer); }
}
/* the pictures under the pieces round (i, j), downloading quietly */
function prefetchRound(i, j) {
  const rect = { x: W.F.x0 + (i - PREFETCH) * CHUNK, y: W.F.y0 + (j - PREFETCH) * CHUNK, w: (2 * PREFETCH + 1) * CHUNK, h: (2 * PREFETCH + 1) * CHUNK };
  const { bp, mm } = windowFor(rect, 6);
  for (const id of swatchesUnder(bp, mm, rect)) {
    const s = swatches[id];
    if (!s) continue;
    for (const v of ['A', 'B', 'E']) if (s.vers[v] && !decoded.has(`${id}|${v}`)) want(`${id}|${v}`, false);
  }
}

const post = (msg, transfer) => self.postMessage(msg, transfer || []);
/* v2.3.3021: the water pictures calmed so far, and the time it took; and
   the calm pictures themselves, kept apart from `decoded` (which lets
   pictures go as you walk), so none is worked out twice: four at most, the
   water's A and B versions, 1 MB each */
const calmStats = { n: 0, ms: 0 };
const calmed = new Map();
let queue = Promise.resolve();
/* v2.3.3298: messages asked for and not yet answered; when none is, the
   blocks round you not built yet are built, one at a time (idleBlock) */
let busy = 0, idleTimer = 0;
self.onmessage = (ev) => {
  const m = ev.data || {};
  /* where you stand is answered at once, not behind the pieces being laid */
  if (m.type === 'where') { post({ type: 'where', id: m.id, ...whereIs(m.x, m.y) }); idleSoon(); return; }
  busy++;
  queue = queue.then(() => handle(m)).catch((e) => post({ type: 'error', id: m.id, message: String((e && e.message) || e) }))
    .then(() => { busy--; if (!busy) idleSoon(); });
};
/* v2.3.3298: the blocks next to yours built while nothing is asked of the
   worker, nearest first, so the ground beyond the next edge is laid from
   blocks already there -- a block is ~30-60 ms on a phone, which a piece
   asked for at a block's edge would otherwise wait for */
const IDLE_MS = 40;
function idleSoon() {
  if (idleTimer || !W) return;
  idleTimer = setTimeout(idleBlock, IDLE_MS);
}
function idleBlock() {
  idleTimer = 0;
  if (busy || !W) return;
  const next = W.blocks.missingNear(1);
  if (!next) return;
  W.blocks.ground(next[0], next[1]);
  idleSoon();
}

async function handle(m) {
  if (m.type === 'init') return init(m);
  if (m.type === 'chunk') return chunk(m);
  if (m.type === 'blocks') return blocksIn(m);
  return null;
}

/* v2.3.3298: the blocks under a rectangle of game px built, and each one's
   walls sent ('block') -- again for one built before, which the game may
   have let go -- for whoever needs the walls far from any piece laid (a
   test's search, an arrival far from where you were) */
function blocksIn(m) {
  if (!W) throw new Error('not ready');
  const cell = W.F.S * WPA, B = BLOCK;
  const I0 = Math.max(0, Math.floor(m.x0 / cell / B)), I1 = Math.min(W.blocks.cols - 1, Math.floor(m.x1 / cell / B));
  const J0 = Math.max(0, Math.floor(m.y0 / cell / B)), J1 = Math.min(W.blocks.rows - 1, Math.floor(m.y1 / cell / B));
  let n = 0;
  for (let J = J0; J <= J1; J++) for (let I = I0; I <= I1; I++) {
    const had = W.blocks.has(I, J);
    const b = W.blocks.ground(I, J);
    if (had) postBlock(b);
    n++;
  }
  post({ type: 'blocks', id: m.id, n });
}

/* ── init: the plan, the objects, the overview, the swatches ──
   v2.3.3298: no longer the whole Wheel.  The owner chose to make the map 5x
   bigger ("Rebuild for 5x"), and this built the blueprint, the swatch map,
   the walls and the objects for the whole of it on the way in -- ~2 s and
   ~50 MB at its peak today, ~23 s and ~600 MB five times bigger.  Now:
     - the ground and the walls are built a BLOCK at a time, the blocks round
       the pieces asked for (worldblocks.js), each block's walls sent to the
       game as it is built ('block');
     - the objects and the overview are BAKED from the standard plan
       (tools/world/bake-wheel-world.mjs, public/world/placed/) and read here,
       when the plan is the one they were baked from (planFingerprint);
     - the map, the doors, Mayor Bro's spot and the rivers come from the
       plan's features (layout.js planFeatures), as cheap as they always were.
   The previews (`?bigtown=`, `?plaintown`, `?placing=2`) and a plan changed
   without a re-bake still build the whole Wheel for their objects and
   overview, as before -- and lay their ground from blocks like the rest. */

async function init(m) {
  const t0 = performance.now();
  const search = (m && m.search) || '';
  /* v2.3.3022: the standard plan, or the one `?bigtown` asks for (plan.js planFor)
     -- v2.3.3300: of the size the room plays (caps.wheelsize, worldTrial.js) */
  PLAN = planFor(search, (m && m.size) | 0 || 1);
  const g = gridInfo(PLAN);
  const F = planFeatures(PLAN);
  const blocks = wheelBlocks(PLAN, { onBuilt: postBlock });
  const mm = blocks.catalog();
  /* the whole blueprint's outline, without its cells: what the map, the
     doors, Mayor Bro and the rivers read */
  const view = { w: F.bw, h: F.bh, scale: F.S, x0: F.x0, y0: F.y0, wheel: F.W, regionIds: F.regionIds,
    pois: F.pois, routes: F.routes, lots: F.lots, decks: F.decks };
  /* v2.3.2966: the map the minimap and the world map draw (wheelmap.js) */
  const map = wheelMap(PLAN, view);
  const planMs = Math.round(performance.now() - t0);
  /* v2.3.2975: where every object stands (placing.js), and the overview --
     baked for the standard plan (v2.3.3298), else worked out here from the
     whole blueprint, once, as before */
  const tp0 = performance.now();
  const placing = placingOpts(search);
  let objects = null, ov = null, ovLands = null, baked = null;
  /* v2.3.3300: the baked set whose plan this is (placed.js: one a Wheel) */
  const fp = planFingerprint(PLAN), set = placing.v ? null : PLACED_SETS.find((p) => p.plan === fp) || null;
  if (set) {
    try {
      const got = await readPlaced(set);
      objects = got.objects; ov = got.ov; ovLands = got.ovLands;
      baked = { v: set.v, dir: set.dir, ms: Math.round(performance.now() - tp0) };
    } catch (e) { baked = { error: String((e && e.message) || e) }; }
  }
  if (!objects && PLAN.wheel.tierZones > 1) {
    /* v2.3.3300: never the whole long Wheel on a phone (~600 MB): with no bake
       for its plan (a plan changed without running bake-wheel-world.mjs, which
       test-world-core catches) the land is laid without its objects, the
       overview blank, and the readout says why */
    objects = emptyObjects(F.bw * F.S * WPA, F.bh * F.S * WPA);
    const k = overviewCells(PLAN), w = Math.ceil(F.bw / k), h = Math.ceil(F.bh / k);
    ov = { w, h, data: new Uint8ClampedArray(w * h * 4) };
    ovLands = { w, h, data: new Uint8Array(w * h).fill(255) };
    baked = { error: (baked && baked.error) || `no bake for plan ${fp}: run node tools/world/bake-wheel-world.mjs` };
  }
  if (!objects) {
    const full = buildBlueprint(PLAN);
    const fm = materialMap(PLAN, full);
    const k = overviewCells(PLAN);
    ov = overviewPixels(full, fm, k);
    /* v2.3.3024: and the land under each of its pixels, for the flat colours */
    ovLands = overviewLands(full, fm, full.reg, k);
    /* v2.3.2999: `?placing=2`, placing v2 (placing.js PLACING v2) */
    objects = placeObjects(PLAN, full, placing);
  }
  objects.placeMs = Math.round(performance.now() - tp0);
  objects.baked = baked;
  objects.mayor = mayorSpot(PLAN, view);
  W = { blocks, F, mm, regionIds: F.regionIds, map,
    /* v2.3.3019: the rivers' lines, for the way each piece's water runs, and
       whether to lay the water's fields at all (`?nowaves` keeps it still) */
    rivers: waterRivers(PLAN, view), waves: wavesOn(search),
    /* v2.3.3021: and whether to take the light's frozen web out of the water
       pictures (ground.js CALM WATER) -- only where the game says it draws
       the water moving (WebGL2, not `?nowaves`), whose web of light moves */
    calm: wavesOn(search) && !!(m && m.moving),
    /* v2.3.3190: and whether to send each piece as colour numbers (the game
       draws pictures so where it can: rendering/paletteTex.js) */
    palette: !!(m && m.palette) };
  const t1 = performance.now();
  const objMan = objectsManifest();
  await findSwatches(mm, edgePiecesOn(search), blendsOn(search));
  const swatchMs = Math.round(performance.now() - t1);
  /* v2.3.2975: each object's footprint from its picture's size, and which
     have pictures (an object with none is not drawn and stops nobody) */
  objects.manifest = await objMan;
  const foot = objectFootprints(objects, objects.manifest);
  objects.present = foot.present; objects.boxOf = foot.boxOf; objects.boxes = foot.boxes;
  /* v2.3.3032: and the doors of the buildings that have a picture
     (placing.js doorSpots) -- what the game opens at each is its table's
     (src/data/wheelBuildingDoors.js) */
  objects.doors = doorSpots(PLAN, view, objects);
  /* you arrive in the town square, as the Ground Studio's first spot */
  const ax = g.cx, ay = g.cy + 0.25 * g.P;
  const made = Object.create(null), edges = [], blends = [];
  for (const id of Object.keys(swatches)) {
    const v = swatches[id].vers;
    if (v.A || v.B) made[id] = swatches[id].from;
    /* v2.3.2947: which grounds have their edge pieces */
    if (v.E) edges.push(id);
    /* v2.3.2951: which pairs have a blend */
    if (v.M) blends.push(id);
  }
  post({
    type: 'ready',
    /* v2.3.3190: pieces come as colour numbers (piecePalette) */
    palette: !!W.palette,
    worldW: F.bw * F.S * WPA, worldH: F.bh * F.S * WPA,
    /* v2.3.3298: the walls come a block at a time ('block'), BLOCK cells a
       side, as the worker builds the blocks round the pieces asked for */
    walk: { cols: F.bw, rows: F.bh, block: BLOCK },
    overview: ov,
    /* v2.3.3024: the land under each overview pixel (index into `regionIds`,
       255 water), for the minimap's and world map's flat land colours */
    overviewLands: { w: ovLands.w, h: ovLands.h, data: ovLands.data, ids: F.regionIds.slice() },
    chunk: { artPx: CHUNK, gamePx: CHUNK * WPA, px: CHUNK * K, apronPx: APRON * K, cols: Math.ceil(F.bw * F.S / CHUNK), rows: Math.ceil(F.bh * F.S / CHUNK),
      under: CHUNK / UNDER },
    arrival: { x: Math.round((ax - F.x0) * WPA), y: Math.round((ay - F.y0) * WPA) },
    /* v2.3.2967: and what each sounds like underfoot (footsteps.js) */
    catalog: mm.ids.map((id, q) => ({ id, name: q === mm.water ? 'Water' : mm.catalog[q].name, step: q === mm.water ? null : stepChoices[id] || stepOf(id),
      /* v2.3.3000: its colour, for the dust a foot kicks up off it (rendering/
         worldFx.js), and whether it is water, which kicks up none */
      color: q === mm.water ? null : (mm.catalog[q].color || null), water: q === mm.water })),
    water: mm.water,
    made, edges, blends: blends.sort(),
    map,
    planMs, swatchMs,
    /* v2.3.2975: the objects, as placing.js gives them (typed arrays, moved
       not copied) */
    objects,
    /* v2.3.2982: the big-town preview's building size (1 without it) --
       v2.3.3022: the size the town is LAID for, and its pictures' own
       (plan.js bigTownPlan: 1.5 and 1.15 as standard) */
    bigTown: PLAN.bigTown || 1,
    buildings: (PLAN.town && PLAN.town.buildingScale) || 1,
  }, [ov.data.buffer, ovLands.data.buffer, objects.kind.buffer, objects.piece.buffer, objects.flip.buffer, objects.x.buffer, objects.y.buffer,
    objects.boxOf.buffer, objects.boxes.buffer]);
}

/* v2.3.3300: no objects at all, in placeObjects' shape (the long Wheel with no
   bake for its plan: init) */
function emptyObjects(worldW, worldH) {
  const cat = objectCatalog();
  return { version: 0, kinds: cat.map((e) => e.id), kindScale: new Float32Array(cat.length).fill(1), n: 0, worldW, worldH,
    buildings: 0, buildingsOf: cat.filter((e) => e.kind === 'building').length,
    kind: new Uint8Array(0), piece: new Uint8Array(0), flip: new Uint8Array(0), x: new Float32Array(0), y: new Float32Array(0),
    town: null, fences: 0, counts: {}, ms: 0 };
}

/* v2.3.3298: the baked objects and overview (tools/world/bake-wheel-world.mjs),
   at their fingerprint's address -- a new bake is a new address, which
   public/_headers lets the phone keep */
async function readPlaced(PLACED) {
  const at = (f) => `${PLACED_BASE}${PLACED.dir}/${f}?v=${encodeURIComponent(PLACED.v)}`;
  const bytes = async (f) => {
    const r = await fetch(at(f));
    if (!r.ok) throw new Error(`${f}: ${r.status}`);
    return new Uint8Array(await r.arrayBuffer());
  };
  const pixels = async (f) => {
    const r = await fetch(at(f));
    if (!r.ok) throw new Error(`${f}: ${r.status}`);
    const bm = await createImageBitmap(await r.blob(), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
    const c = new OffscreenCanvas(bm.width, bm.height);
    const g2 = c.getContext('2d', { willReadFrequently: true });
    g2.drawImage(bm, 0, 0);
    const d = g2.getImageData(0, 0, bm.width, bm.height).data;
    const out = { w: bm.width, h: bm.height, data: d };
    if (bm.close) bm.close();
    c.width = c.height = 1;
    return out;
  };
  const [bin, ov, lands] = await Promise.all([bytes(PLACED.objects), pixels(PLACED.overview), pixels(PLACED.lands)]);
  const objects = decodePlaced(bin);
  if (!objects || objects.n !== PLACED.n) throw new Error('objects.bin: not the baked file');
  if (ov.w !== PLACED.w || ov.h !== PLACED.h || lands.w !== PLACED.w || lands.h !== PLACED.h) throw new Error('overview: not the baked size');
  /* the land's index is the red of each lands pixel (255 on water) */
  const ld = new Uint8Array(lands.w * lands.h);
  for (let i = 0; i < ld.length; i++) ld[i] = lands.data[i * 4];
  return { objects, ov, ovLands: { w: lands.w, h: lands.h, data: ld } };
}

/* v2.3.3298: a block's walls -- where you cannot walk and where you may swim
   -- to the game, as the block is built (a copy: the block keeps its own) */
function postBlock(b) {
  const walk = b.walls.walk.slice(), swim = b.walls.swim.slice();
  /* v2.3.3300: and the block's lands at the minimap's own detail, a pixel
     every LANDS_CELLS cells (each land's index, 255 water: ground.js
     overviewLands' rule) -- the long Wheel's whole-map picture is four times
     coarser (worldblocks.js overviewCells), and the minimap draws the blocks
     round you over it (wheelMinimap.js) */
  const lands = blockLands(b);
  post({ type: 'block', I: b.I, J: b.J, x: b.x, y: b.y, w: b.w, h: b.h, walk, swim, lands }, [walk.buffer, swim.buffer, lands.data.buffer]);
}
const LANDS_CELLS = 4;
function blockLands(b) {
  const k = LANDS_CELLS, w = Math.ceil(b.w / k), h = Math.ceil(b.h / k), data = new Uint8Array(w * h);
  const water = W ? W.mm.water : -1;
  for (let ty = 0; ty < h; ty++) {
    const cy = Math.min(b.h - 1, ty * k + (k >> 1));
    for (let tx = 0; tx < w; tx++) {
      const c = cy * b.w + Math.min(b.w - 1, tx * k + (k >> 1));
      data[ty * w + tx] = b.mat[c] === water ? 255 : Math.min(254, b.reg[c]);
    }
  }
  return { w, h, k, data };
}

/* v2.3.3298: the swatch map of a rectangle (art px) and `margin` cells round
   it, stitched from the blocks under it (worldblocks.js window) */
function windowFor(rect, margin) {
  const S = W.F.S, X0 = W.F.x0, Y0 = W.F.y0;
  const cx = Math.floor((rect.x - X0) / S), cy = Math.floor((rect.y - Y0) / S);
  const cw = Math.ceil((rect.x + rect.w - X0) / S) - cx, ch = Math.ceil((rect.y + rect.h - Y0) / S) - cy;
  return W.blocks.window({ x: cx - margin, y: cy - margin, w: cw + 2 * margin, h: ch + 2 * margin });
}

/* The swatch under a game position, by its index in `catalog` -- and
   v2.3.2966: the region and tier there, and where that is in words.
   v2.3.3298: read from the block there (built if it is not), which is also
   where you are -- the blocks furthest from it are the first let go. */
function whereIs(x, y) {
  if (!W) return { q: null };
  const S = W.F.S;
  const bx = Math.floor(x / WPA / S), by = Math.floor(y / WPA / S);
  if (!(bx >= 0 && by >= 0 && bx < W.F.bw && by < W.F.bh)) return { q: null };
  const I = Math.floor(bx / BLOCK), J = Math.floor(by / BLOCK);
  W.blocks.near(I, J);
  const b = W.blocks.ground(I, J);
  const c = (by - b.y) * b.w + (bx - b.x), region = W.regionIds[b.reg[c]] || null, tier = b.tier[c];
  return { q: b.mat[c], reg: region, tier, words: whereWords(W.map, region, tier) };
}

/* v2.3.2975: the game's objects manifest -- which pictures there are, and
   on which sprite sheet; null when there is none (nothing is drawn) */
async function objectsManifest() {
  try {
    const r = await fetch(OBJECTS_BASE + 'manifest.json?t=' + Date.now(), { cache: 'no-cache' });
    if (!r.ok) return null;
    const man = await r.json();
    return man && Array.isArray(man.objects) && Array.isArray(man.atlases) ? man : null;
  } catch (e) { return null; }
}

/* ── the swatches ── */

/* v2.3.2948: `pieces` false (the default) leaves every edge-pieces picture
   (version E) where it is, unread, so no piece is laid and no margin is
   widened for one.  v2.3.2955: `withBlends` false (the default) does the
   same for every blend (version M): each pair mixes as if it had none. */
async function findSwatches(mm, pieces, withBlends) {
  const known = new Set(mm.ids);
  const out = Object.create(null);
  /* v2.3.2968: the footstep sounds the owner changed in the Ground Studio --
     the game copy's (the manifest's `steps`), then this site's studio's over
     them, the newest winning as for the pictures (world/core/footsteps.js) */
  const isSwatch = (id) => known.has(id) && id !== 'water';
  let gameSteps = null, studioSteps = null;
  /* the game's copy */
  try {
    /* v2.3.2959: at a fresh address every time -- public/_headers lets the
       phone keep everything under /world/ground/, which must never include
       an old list of what is there */
    const r = await fetch(GAME_BASE + 'manifest.json?t=' + Date.now(), { cache: 'no-cache' });
    if (r.ok) {
      const man = await r.json();          /* throws on a site's "page not found" HTML: no copy yet */
      const pal = man.palette || null;
      gameSteps = cleanSteps(man.steps, isSwatch);
      /* v2.3.2959: each picture at ?v=<the manifest's date>: a new upload is a
         new address, so the phone may keep the old one for good */
      const ver = man.made ? '?v=' + encodeURIComponent(man.made) : '';
      for (const s of man.swatches || []) {
        if (!known.has(s.id)) continue;
        const vers = Object.create(null);
        /* v2.3.2947: E, the swatch's edge pieces (see-through round them) */
        for (const v of s.versions || []) if (v === 'A' || v === 'B' || (v === 'E' && pieces)) vers[v] = { url: `${GAME_BASE}${s.id}-${v}.png${ver}` };
        if (vers.A || vers.B || vers.E) out[s.id] = { from: 'game', vers, pal, mapped: true };
      }
      /* v2.3.2951: and the blends, each under its pair's key */
      for (const b of withBlends ? man.blends || [] : []) {
        const pr = b && typeof b.key === 'string' ? blendPair(b.key) : null;
        if (!pr || !known.has(pr[0]) || !known.has(pr[1])) continue;
        out[b.key] = { from: 'game', vers: { M: { url: `${GAME_BASE}${b.key}-M.png${ver}` } }, pal, mapped: true };
      }
    }
  } catch (e) { /* no copy in the game yet */ }
  /* the Ground Studio's, on this site */
  const db = await openIfThere(STUDIO_DB);
  if (db) {
    try {
      const keys = await ask(db, 'prep', (s) => s.getAllKeys());
      const palRec = await ask(db, 'misc', (s) => s.get('palette'));
      studioSteps = cleanSteps(await ask(db, 'misc', (s) => s.get('steps')), isSwatch);
      const pal = (palRec && palRec.colours) || null;
      const mine = Object.create(null);
      for (const k of keys || []) {
        const mk = /^(.+)\|([ABEM])$/.exec(String(k));
        if (!mk || (mk[2] === 'E' && !pieces) || (mk[2] === 'M' && !withBlends)) continue;
        /* a swatch's A, B or E -- or (v2.3.2951) a pair's blend, M */
        const pr = mk[2] === 'M' ? blendPair(mk[1]) : null;
        if (mk[2] === 'M' ? !pr || !known.has(pr[0]) || !known.has(pr[1]) : !known.has(mk[1])) continue;
        const blob = await ask(db, 'prep', (s) => s.get(k));
        if (!blob || !blob.size) continue;
        (mine[mk[1]] = mine[mk[1]] || Object.create(null))[mk[2]] = { blob };
      }
      for (const id of Object.keys(mine)) out[id] = { from: 'studio', vers: mine[id], pal, mapped: false };
    } finally { db.close(); }
  }
  swatches = out;
  stepChoices = Object.assign(Object.create(null), gameSteps, studioSteps);
}

/* Open a database only if the Ground Studio made it: opening one that is not
   there would create it empty, and the studio -- which makes its stores only
   when it creates the database -- would then find none. */
function openIfThere(name) {
  return new Promise((resolve) => {
    let r;
    try { r = indexedDB.open(name); } catch (e) { resolve(null); return; }
    r.onupgradeneeded = () => { try { r.transaction.abort(); } catch (e) { /* ignore */ } };
    r.onsuccess = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains('prep') || !db.objectStoreNames.contains('misc')) { db.close(); resolve(null); return; }
      resolve(db);
    };
    r.onerror = () => resolve(null);
    r.onblocked = () => resolve(null);
  });
}
function ask(db, store, fn) {
  return new Promise((resolve, reject) => {
    const q = fn(db.transaction(store, 'readonly').objectStore(store));
    q.onsuccess = () => resolve(q.result);
    q.onerror = () => reject(q.error);
  });
}

/* A swatch picture, unpacked (least recently used ones let go).
   v2.3.2959: its file from want(), waited for -- when `wait` -- until
   PIECE_WAIT_MS after a piece first waited for that download; one not here
   by then is drawn in plan colour this time (`lacking`), and the piece goes
   back marked partial. */
async function tileOf(id, ver, wait) {
  const k = `${id}|${ver}`;
  const hit = decoded.get(k);
  if (hit) { decoded.delete(k); decoded.set(k, hit); return hit; }
  if (failed.has(k)) return null;
  const s = swatches[id], src = s && s.vers[ver];
  if (!src) return null;
  let blob = files.get(k) || src.blob || null;     /* the studio's are on the phone already */
  if (!blob) {
    const p = want(k, true), job = dlJobs.get(k);
    const left = wait && job ? job.urgentAt + PIECE_WAIT_MS - performance.now() : 0;
    if (left > 0) {
      let timer = null;
      blob = await Promise.race([p, new Promise((res) => { timer = setTimeout(() => res(null), left); })]);
      clearTimeout(timer);
    } else if (!job) {
      blob = await p;          /* here after all, or in its wait to be tried again (null) */
    }
    blob = blob || files.get(k) || null;
  }
  if (!blob) {
    /* still downloading, or waiting to be tried again: 'got' when it comes */
    lacking.add(k);
    owed.add(k);
    chase(k);
    return null;
  }
  /* v2.3.3021: a water picture calmed before (and let go from `decoded`
     since, as you walked inland): the same file, so the same calm picture --
     never worked out twice */
  const wasCalmed = calmed.get(k);
  if (wasCalmed && wasCalmed.blob === blob) { decoded.set(k, wasCalmed.tile); return wasCalmed.tile; }
  let tile = null;
  try {
    const bm = await createImageBitmap(blob);
    const c = new OffscreenCanvas(TILE, TILE);
    const g = c.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingQuality = 'high';
    g.drawImage(bm, 0, 0, TILE, TILE);        /* the same size: a straight copy */
    if (bm.close) bm.close();
    const d = g.getImageData(0, 0, TILE, TILE).data;
    c.width = c.height = 1;
    /* the studio's finalize, verbatim -- v2.3.2961: onto the picture's own
       colours (PIXEL.ownColours), not the palette all the ground shared */
    if (!s.mapped) mapPixels(d, TILE, TILE, PIXEL.ownColours ? ownPalette(d, TILE, TILE, PIXEL.ownColours) : s.pal);
    /* v2.3.2961: kept as numbers into the colours it has (EDGE_CLEAR, 255,
       is a see-through pixel's, so 255 at most); a game picture made on the
       old shared palette has fewer, and comes out the same */
    tile = indexed(d, TILE, coloursOf(d, 255) || s.pal);
    /* v2.3.3021: a water picture without its frozen web of light, where the
       game draws its own, moving (ground.js CALM WATER) */
    if (W && W.calm && WATER_SWATCHES.includes(id) && tile.idx) {
      const tc = performance.now();
      tile = calmWater(tile);
      calmStats.n++;
      calmStats.ms += Math.round(performance.now() - tc);
      calmed.set(k, { blob, tile });
    }
  } catch (e) {
    failed.add(k);               /* this browser cannot unpack it: plan colour, and the readout says so */
    return null;
  }
  decoded.set(k, tile);
  return tile;
}
function trim(keep) {
  for (const k of decoded.keys()) {
    if (decoded.size <= DECODED_KEEP) break;
    if (!keep.has(k)) decoded.delete(k);
  }
}

/* RGBA already on `pal` -> one index a pixel.  A colour not on it (a picture
   made before its palette froze) takes the nearest.  v2.3.2947: a see-through
   pixel (the space round edge pieces) is EDGE_CLEAR. */
function indexed(d, T, pal) {
  if (!pal || !pal.length || pal.length > 256) return { w: T, h: T, data: d };
  const P = new Uint8Array(pal.length * 3);
  const at = new Map();
  pal.forEach((c, i) => {
    P[i * 3] = c[0]; P[i * 3 + 1] = c[1]; P[i * 3 + 2] = c[2];
    const key = (c[0] << 16) | (c[1] << 8) | c[2];
    if (!at.has(key)) at.set(key, i);
  });
  const near = nearestIn(pal);
  const idx = new Uint8Array(T * T);
  let lastKey = -1, last = 0;
  for (let i = 0, p = 0; p < idx.length; i += 4, p++) {
    if (d[i + 3] < 128) { idx[p] = EDGE_CLEAR; continue; }
    const key = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
    if (key !== lastKey) {
      let v = at.get(key);
      if (v === undefined) {
        const c = near(d[i], d[i + 1], d[i + 2]);
        v = at.get((c[0] << 16) | (c[1] << 8) | c[2]);
        at.set(key, v);
      }
      lastKey = key; last = v;
    }
    idx[p] = last;
  }
  return { w: T, h: T, idx, pal: P };
}

/* ── one piece ── */

async function chunk(m) {
  if (!W) throw new Error('not ready');
  const t0 = performance.now();
  const rect = { x: W.F.x0 + m.i * CHUNK - APRON, y: W.F.y0 + m.j * CHUNK - APRON, w: CHUNK + 2 * APRON, h: CHUNK + 2 * APRON };
  /* v2.3.3298: the swatch map round the piece, from the blocks there --
     built now if they are not (each block's walls go to the game as it is) */
  const { bp, mm } = windowFor(rect, PIECE_MARGIN);
  const tiles = Object.create(null), keep = new Set(), ids = swatchesUnder(bp, mm, rect);
  /* v2.3.2959: every picture this piece needs asked for at once (they come
     DL_PARALLEL at a time), then those for the pieces round it */
  for (const id of ids) {
    const s = swatches[id];
    if (s) for (const v of ['A', 'B', 'E']) if (s.vers[v] && !decoded.has(`${id}|${v}`) && !failed.has(`${id}|${v}`)) want(`${id}|${v}`, true);
  }
  prefetchRound(m.i, m.j);
  /* a piece laid again (`relay`, it went back partial) waits for nothing:
     it takes what has come since, and the rest is still on its way */
  const wait = !m.relay;
  lacking.clear();
  for (const id of ids) {
    const s = swatches[id];
    if (!s) continue;
    const A = s.vers.A ? await tileOf(id, 'A', wait) : null;
    const B = s.vers.B ? await tileOf(id, 'B', wait) : null;
    const E = s.vers.E ? await tileOf(id, 'E', wait) : null;
    keep.add(`${id}|A`); keep.add(`${id}|B`); keep.add(`${id}|E`);
    if (A || B || E) tiles[id] = { A: A || B, B: A && B ? B : null, E };
  }
  /* v2.3.2951: the blends between them -- every one blendsUnder names, so
     each piece over a place is given the same ones and they meet with no seam */
  const blends = Object.create(null);
  for (const k of blendsUnder(ids, (k) => !!(swatches[k] && swatches[k].vers.M))) {
    keep.add(`${k}|M`);
    const t = await tileOf(k, 'M', wait);
    if (t) blends[k] = t;
  }
  /* v2.3.3019: and the piece's water field, for the water's motion */
  const out = composeGround(PLAN, bp, mm, rect, tiles, { scale: K, blends, waterField: W.waves ? { rivers: W.rivers } : null });
  const under = underOf(out.mat, out.w);
  trim(keep);
  const wf = out.waterField || null;
  /* v2.3.3190: as colour numbers, where the game draws them so and the piece
     has 256 colours or fewer (every one measured has far fewer) */
  const np = W.palette ? piecePalette(out.data, out.w, out.h) : null;
  const moved = np ? [np.idx.buffer, np.pal.buffer, under.buffer] : [out.data.buffer, under.buffer];
  if (wf && wf.data) moved.push(wf.data.buffer);
  post({ type: 'chunk', id: m.id, i: m.i, j: m.j, w: out.w, h: out.h, under, wf,
    ...(np ? { idx: np.idx, pal: np.pal, stride: np.stride, colours: np.n } : { data: out.data, overPalette: !!W.palette }),
    ms: Math.round(performance.now() - t0), unpacked: decoded.size, unreadable: failed.size,
    /* v2.3.2959: laid without some of its pictures (lay it again later), and
       how the downloads stand */
    partial: lacking.size > 0, lacking: [...lacking], downloading: dlJobs.size, dlFails,
    /* v2.3.3021: the water pictures calmed (ground.js CALM WATER) */
    calm: W.calm ? { n: calmStats.n, ms: calmStats.ms } : null }, moved);
}

/* v2.3.2967: the swatch DRAWN under the piece's own square (not its apron),
   one byte every UNDER art px, read at the middle of each: what the bro's
   feet are on, for the footstep sound.  The plan's cell (whereIs) is only
   the ground meant there; where two grounds meet or mix, the pictures
   decide, patch by patch, and this is what they decided -- so the sound
   changes where the ground you see does. */
function underOf(mat, ow) {
  const n = CHUNK / UNDER, out = new Uint8Array(n * n);
  const a = APRON * K, h = (UNDER * K) >> 1;
  for (let v = 0; v < n; v++) {
    const row = (a + v * UNDER * K + h) * ow + a + h;
    for (let u = 0; u < n; u++) out[v * n + u] = mat[row + u * UNDER * K];
  }
  return out;
}
