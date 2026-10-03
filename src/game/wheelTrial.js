/* ═══ v2.3.2943: THE WHEEL TRIAL — the game's side of the ground worker ═══
 *
 * `?trial=wheel` (src/game/worldTrial.js) turns the World View into the whole
 * Wheel at full size, its ground laid on the phone from the owner's swatches
 * by public/tools/world/core/ground-worker.js.  This module is the one place
 * that talks to that worker: it starts it, asks it for pieces of ground, and
 * keeps what the rest of the game needs from it --
 *
 *   the walk grid   where the sea and the rivers stop you, as the rows of
 *                   booleans isSolid() reads (false = blocked) -- but made a
 *                   row at a time as they are read: the Wheel is 1792 x 1792
 *                   cells, and as plain rows that is 3.2 million booleans,
 *                   ~26 MB on iPhone Safari.  Held as bits it is 400 KB.
 *   the overview    the whole Wheel, small, in the plan's colours: the
 *                   underlay for ground still being laid, and the Map panel.
 *   the numbers     for the trial's readout.
 *
 * The worker lives only while you are in (or walking into) the Wheel:
 * worldTrial.syncWorldTrial stops it a few seconds after you leave, which
 * frees the plan and every unpacked swatch with it (the ZONE-ASSET rule in
 * CLAUDE.md: what a zone loads, it frees on the way out).
 *
 * No pixi here: tiledMaps.js reaches this module through worldTrial.js, and
 * tools/qa/qa-mapfree-race.mjs loads that straight into Node.
 */

/* Served as-is from public/, never bundled: it imports the World Builder's
   own modules, which live there too. */
const WORKER_URL = '/tools/world/core/ground-worker.js';
const ROW_KEEP = 160;          /* walk-grid rows kept made, ~14 KB each on iPhone */
const UNDER_KEEP = 160;        /* v2.3.2967: pieces whose ground-underfoot is kept, 4 KB each */

let _w = null;
let _initP = null;
let _info = null;
let _grid = null;
let _overview = null;
let _seq = 0;
const _pending = new Map();    /* request id -> { resolve, reject } */
const _warm = new Map();       /* "i,j" -> a piece laid ahead by the zone gate, not yet shown */
let _here = null;              /* the swatch under your feet: { q, x, y } */
let _hereAsked = null;
const _gotFns = new Set();     /* v2.3.2959: told when a picture some piece went without has come */
const _under = new Map();      /* v2.3.2967: "i,j" -> the swatch drawn at every 3 game px of that piece */

export const wheelStats = {
  entryMs: null,       /* the way in: the plan, then the first screen of ground */
  planMs: null,        /* the worker's plan build */
  swatchMs: null,      /* finding the swatches */
  resident: 0,         /* pieces in memory now */
  loading: 0,          /* pieces asked for and not back yet */
  loads: 0,            /* pieces laid since entering */
  lastMs: 0,           /* the last piece's time in the worker */
  maxMs: 0,
  sumMs: 0,
  popIns: 0,           /* came on screen before its ground was laid */
  pieceBytes: 0,       /* the colours of one piece */
  unpacked: 0,         /* swatch pictures unpacked in the worker now */
  unreadable: 0,       /* swatch pictures this browser could not unpack (drawn in plan colour) */
  /* v2.3.2959: the downloads (ground-worker.js, DOWNLOADS THAT CANNOT STOP THE
     GROUND) -- pictures on their way now, tries that failed and will be made
     again, pieces laid without some of their pictures, and laid again */
  downloading: 0,
  dlFails: 0,
  partial: 0,          /* pieces laid short of a picture */
  relaid: 0,           /* ...laid again when one came */
  mended: 0,           /* ...and whole at last */
  short: 0,            /* pieces in memory now still short of one */
  failures: 0,         /* pieces the worker could not lay */
  lastFailure: null,
  error: null,
};

export function wheelInfo() { return _info; }

/* ═══ v2.3.2975: THE WHEEL'S OBJECTS ═══
   Where every building, tree, rock and prop stands comes with the worker's
   'ready' (`objects`, public/tools/world/core/placing.js); the renderer that
   draws them is src/rendering/wheelObjects.js.  Its numbers live here so the
   readout (worldTrial.js) can show them without loading pixi, and it is told
   when the worker stops, so it lets go of its sprite sheets with it. */
export const wheelObjectStats = {
  placed: 0,        /* objects on the Wheel with a picture */
  drawn: 0,         /* sprites now */
  pages: 0,         /* sprite sheets in memory */
  pagesOf: 0,       /* ...of how many */
  mb: 0,            /* their colours, decoded (w x h x 4) */
  loading: 0,
  loads: 0,         /* pages loaded since entering */
  failed: 0,
  lateDraws: 0,     /* objects that came on screen before their page */
  blockers: 0,      /* footprints the walk test is looking at */
  placeMs: null,    /* the worker's placing */
  version: null,    /* v2.3.2999: which placing (PLACING, or PLACING_V2 with `?placing=2`) */
  warmMs: null,     /* the way in's wait for the pages round the arrival */
  alive: 0,         /* v2.3.2983: buildings drawn with their life (smoke, lamps...) */
  lifeMs: null,     /* ...and what moving it costs a frame, smoothed */
  seeThrough: 0,    /* v2.3.2999: trees see-through because you stand behind them (`?placing=2`/`?fade`) */
};
export function wheelObjectsInfo() { return _info ? _info.objects || null : null; }
/* `?noobjects` in the address leaves the Wheel bare, as before v2.3.2975 --
   the ground alone -- so its cost can be told from theirs on a phone */
export function wheelObjectsOn() {
  try { return !/(^|[?&])noobjects(=|&|$)/.test(window.location.search || ''); } catch (e) { return true; }
}
/* v2.3.2983: `?nolife` leaves the buildings still -- no smoke, lamps,
   sparks or glints (src/rendering/wheelLife.js) -- to tell their cost */
export function wheelLifeOn() {
  try { return !/(^|[?&])nolife(=|&|$)/.test(window.location.search || ''); } catch (e) { return true; }
}
const _stopFns = new Set();
export function wheelOnStop(fn) {
  _stopFns.add(fn);
  return () => { _stopFns.delete(fn); };
}
export function wheelWalkGrid() { return _grid; }
export function wheelOverview() { return _overview; }
export function wheelRunning() { return !!_w; }
/* which swatches were found, and where: { id: 'studio' | 'game' } */
export function wheelMade() { return _info ? _info.made : null; }
/* v2.3.2947: which grounds have edge pieces (their loose tufts, scattered
   where they lie over another ground).  v2.3.2948: none unless the address
   says `edgepieces` -- they are put away */
export function wheelEdges() { return _info && _info.edges ? _info.edges : []; }
/* v2.3.2951: which pairs of alike grounds have a BLEND picture, laid through
   the middle of the zone where they mix (their keys, as ground.js blendKey) */
export function wheelBlends() { return _info && _info.blends ? _info.blends : []; }
/* v2.3.2982: the big-town preview's building size (`?trial=wheel&bigtown`,
   public/tools/world/plan.js bigTownPlan): 1 without it */
export function wheelBigTown() { return _info && _info.bigTown > 1 ? _info.bigTown : 1; }

/* Start the worker (once) and build the plan.  Resolves with its 'ready'
   message; rejects, and leaves the trial on flat sea, if this browser cannot
   run it. */
export function wheelStart() {
  if (_initP) return _initP;
  if (typeof Worker === 'undefined') return Promise.reject(new Error('no workers'));
  wheelStats.error = null;
  _initP = new Promise((resolve, reject) => {
    let w;
    try { w = new Worker(WORKER_URL, { type: 'module' }); } catch (e) { reject(e); return; }
    _w = w;
    w.onmessage = (ev) => onMessage(ev.data, resolve, reject);
    w.onerror = (ev) => {
      const msg = (ev && ev.message) || 'the ground worker failed to start';
      wheelStats.error = msg;
      reject(new Error(msg));
      for (const p of _pending.values()) p.reject(new Error(msg));
      _pending.clear();
    };
    /* v2.3.2948: the address, so `?trial=wheel&edgepieces` can bring back
       the edge pieces, put away (public/tools/world/core/ground.js) --
       v2.3.2955: and `?trial=wheel&blends` the blends, put away too */
    let search = '';
    try { search = window.location.search || ''; } catch (e) { /* no page */ }
    w.postMessage({ type: 'init', search });
  });
  _initP.catch((e) => { wheelStats.error = String((e && e.message) || e); });
  return _initP;
}

function onMessage(m, resolveInit, rejectInit) {
  if (!m) return;
  /* a failure with no request of its own is the plan build's */
  if (m.type === 'error' && m.id == null) { wheelStats.error = m.message; rejectInit(new Error(m.message)); return; }
  if (m.type === 'ready') {
    _info = m;
    _grid = lazyGrid(m.walk.bits, m.walk.cols, m.walk.rows);
    _overview = overviewCanvas(m.overview);
    wheelStats.planMs = m.planMs;
    wheelStats.swatchMs = m.swatchMs;
    wheelStats.pieceBytes = (m.chunk.px + 2 * m.chunk.apronPx) ** 2 * 4;
    resolveInit(m);
    return;
  }
  if (m.type === 'where') {
    _hereAsked = null;
    /* v2.3.2966: with the region and tier there, and in words (the map) */
    if (m.q != null) _here = { q: m.q, x: m.id.x, y: m.id.y, region: m.reg || null, tier: m.tier || 0, words: m.words || null };
    return;
  }
  /* v2.3.2959: a picture some piece went without has come ('id|version') */
  if (m.type === 'got') {
    for (const fn of _gotFns) { try { fn(m.k); } catch (e) { /* one listener's trouble */ } }
    return;
  }
  const p = _pending.get(m.id);
  if (!p) return;
  _pending.delete(m.id);
  if (m.type === 'error') { p.reject(new Error(m.message)); return; }
  p.resolve(m);
}

/* One piece of ground: { i, j, w, h, data (RGBA), ms, partial, lacking }.
   v2.3.2959: `partial` -- laid without some pictures still on their way,
   `lacking` their keys; wheelOnGot() says when each comes.  `relay` -- such
   a piece asked for again: the worker waits for nothing this time, and it
   counts as neither a piece laid nor a short one. */
export function wheelOnGot(fn) {
  _gotFns.add(fn);
  return () => { _gotFns.delete(fn); };
}
export function wheelChunk(i, j, relay) {
  const warm = relay ? null : _warm.get(i + ',' + j);
  if (warm) { _warm.delete(i + ',' + j); return Promise.resolve(warm); }
  if (!_w || !_info) return Promise.reject(new Error('not ready'));
  const id = ++_seq;
  return new Promise((resolve, reject) => {
    _pending.set(id, { resolve, reject });
    _w.postMessage({ type: 'chunk', id, i, j, relay: !!relay });
  }).then((m) => {
    /* v2.3.2967: what the feet are on there (a piece laid again replaces it:
       a picture that came may move where one ground gives way to another) */
    if (m.under) {
      const k = i + ',' + j;
      _under.delete(k);
      _under.set(k, m.under);
      if (_under.size > UNDER_KEEP) _under.delete(_under.keys().next().value);
    }
    if (!relay) {
      wheelStats.loads++;
      wheelStats.lastMs = m.ms;
      wheelStats.maxMs = Math.max(wheelStats.maxMs, m.ms);
      wheelStats.sumMs += m.ms;
      if (m.partial) wheelStats.partial++;
    }
    wheelStats.unpacked = m.unpacked;
    wheelStats.unreadable = m.unreadable || 0;
    wheelStats.downloading = m.downloading || 0;
    wheelStats.dlFails = m.dlFails || 0;
    return m;
  }, (e) => {
    /* 'stopped' is the worker being let go on the way out, not a failure */
    const msg = String((e && e.message) || e);
    if (msg !== 'stopped' && msg !== 'not ready') { wheelStats.failures++; wheelStats.lastFailure = msg; }
    throw e;
  });
}

/* The zone gate's half: lay every piece a phone screen round (x, y) needs
   -- `rx`, `ry` game px either way -- before the loading overlay lifts. */
export async function wheelWarm(x, y, rx, ry) {
  const info = _info;
  if (!info) return;
  const cs = info.chunk.gamePx;
  const i0 = Math.max(0, Math.floor((x - rx) / cs)), i1 = Math.min(info.chunk.cols - 1, Math.floor((x + rx) / cs));
  const j0 = Math.max(0, Math.floor((y - ry) / cs)), j1 = Math.min(info.chunk.rows - 1, Math.floor((y + ry) / cs));
  const jobs = [];
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    if (_warm.has(i + ',' + j)) continue;
    jobs.push(wheelChunk(i, j).then((m) => { _warm.set(i + ',' + j, m); }).catch(() => {}));
  }
  await Promise.all(jobs);
}
export function wheelIsWarm(i, j) { return _warm.has(i + ',' + j); }
/* The readout's counts start again on each way in: they describe this visit. */
export function wheelResetCounts() {
  Object.assign(wheelStats, { loads: 0, lastMs: 0, maxMs: 0, sumMs: 0, popIns: 0, failures: 0, lastFailure: null, partial: 0, relaid: 0, mended: 0 });
}
/* Pieces laid ahead that were never shown (you walked in somewhere else). */
export function wheelDropWarm() { _warm.clear(); }

/* The swatch under your feet, for the readout: asks the worker when you have
   moved a cell, answers with the last reply. */
export function wheelHere(x, y) {
  const info = _info;
  if (!_w || !info) return null;
  const cell = info.worldW / info.walk.cols;
  const cx = Math.floor(x / cell), cy = Math.floor(y / cell);
  if (!_hereAsked && (!_here || _here.x !== cx || _here.y !== cy)) {
    _hereAsked = { x: cx, y: cy };
    _w.postMessage({ type: 'where', id: _hereAsked, x, y });
  }
  if (!_here) return null;
  const c = info.catalog[_here.q];
  return c ? { id: c.id, name: c.name, water: _here.q === info.water, made: info.made[c.id] || null,
    region: _here.region, tier: _here.tier, words: _here.words } : null;
}

/* ═══ v2.3.2967: THE GROUND UNDER YOUR FEET, for the footstep sound ═══
   The swatch DRAWN at a game position -- read from the piece of ground laid
   there (the worker's `under`, a byte every 3 game px), so where two
   grounds meet or mix the sound changes exactly where the picture does,
   not at the plan's cell edge.  { id, name, step } from the worker's
   catalog, or null where no piece has been laid (the caller keeps the last
   sound).  Synchronous: it is read at every foot plant. */
export function wheelGroundAt(x, y) {
  const info = _info;
  if (!info || !info.chunk || !info.chunk.under) return null;
  const cs = info.chunk.gamePx, n = info.chunk.under;
  const i = Math.floor(x / cs), j = Math.floor(y / cs);
  const g = _under.get(i + ',' + j);
  if (!g) return null;
  const u = Math.min(n - 1, Math.max(0, Math.floor(((x - i * cs) / cs) * n)));
  const v = Math.min(n - 1, Math.max(0, Math.floor(((y - j * cs) / cs) * n)));
  return info.catalog[g[v * n + u]] || null;
}
/* ...and what it sounds like (public/tools/world/core/footsteps.js): a
   footstep sound's name, or null where nobody walks (water, lava) or
   nothing is laid yet. */
export function wheelStepAt(x, y) {
  const c = wheelGroundAt(x, y);
  return c ? c.step || null : null;
}

/* ═══ v2.3.2966: THE WHEEL'S MAP ═══
   What the minimap and the world map draw (public/tools/world/core/
   wheelmap.js, built by the worker from the blueprint): the lands and
   their stages with their levels, the town, the camps, passes, gates and
   landmarks, and the roads, the river and the railway as lines, in game
   px.  null until the worker is ready. */
export function wheelMapInfo() { return _info ? _info.map || null : null; }

/* Stop the worker and let go of everything it gave. */
export function wheelStop() {
  /* v2.3.2975: the objects' sprite sheets first, while the index is there */
  for (const fn of _stopFns) { try { fn(); } catch (e) { /* one listener's trouble */ } }
  if (_w) { try { _w.terminate(); } catch (e) { /* gone */ } }
  _w = null;
  _initP = null;
  _info = null;
  _grid = null;
  if (_overview) { _overview.width = _overview.height = 0; _overview = null; }
  for (const p of _pending.values()) p.reject(new Error('stopped'));
  _pending.clear();
  _warm.clear();
  _under.clear();
  _here = null;
  _hereAsked = null;
}

/* ── the walk grid, a row at a time ── */

/* What isSolid(), nudgeSpawnToWalkable() and the trail's route finder read:
   `grid.length` rows, `grid[y][x]` false where you cannot walk.  A row is
   made from the bits when first read and the last ROW_KEEP kept -- every
   reader only ever looks at the rows round the player.

   v2.3.2999: `grid.atFeet` is true.  These are the GROUND's own cells (where
   the plan's water is), not where a body's centre may go, so a reader that
   tests a character reads them where its BOOTS are: S.player.y is the body's
   centre, playerGroundDy (52 px) above them.  Read at the centre, walking
   south put your boots ~45 px into the water before you stopped, and walking
   north stopped you 52 px short of a shore.  Town's grid bakes the same
   offset into its rim instead (spriteSheets.js townRimFor), so it has no flag
   and is read as it always was. */
function lazyGrid(bits, cols, rows) {
  const made = new Map();
  const rowAt = (y) => {
    let r = made.get(y);
    if (r) return r;
    r = new Array(cols);
    for (let x = 0, k = y * cols; x < cols; x++, k++) r[x] = !(bits[k >> 3] & (1 << (k & 7)));
    made.set(y, r);
    if (made.size > ROW_KEEP) made.delete(made.keys().next().value);
    return r;
  };
  return new Proxy([], {
    get(t, key) {
      if (key === 'length') return rows;
      if (key === 'atFeet') return true;
      if (typeof key === 'string' && key !== '') {
        const y = +key;
        if (y >= 0 && y < rows && y === Math.floor(y)) return rowAt(y);
      }
      return undefined;
    },
  });
}

function overviewCanvas(ov) {
  if (typeof document === 'undefined' || !ov) return null;
  const c = document.createElement('canvas');
  c.width = ov.w; c.height = ov.h;
  const g = c.getContext('2d');
  g.putImageData(new ImageData(new Uint8ClampedArray(ov.data.buffer), ov.w, ov.h), 0, 0);
  return c;
}
