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
 * DECODED_KEEP.  The blueprint (13 MB) is dropped as soon as the swatch map
 * (3 MB) is made from it.  Each piece goes to the game as its colours and is
 * not kept here.
 *
 * MESSAGES (all answered in order, one at a time):
 *   { type: 'init', search }     -> { type: 'ready', ... } (see init below;
 *                                   v2.3.2947: `edges`, the grounds with edge pieces;
 *                                   v2.3.2951: `blends`, the pairs with a blend;
 *                                   v2.3.2948: `search`, the page's address query:
 *                                   edge pieces are put away and loaded only when
 *                                   it says `edgepieces` -- ground.js, EDGE_PIECES;
 *                                   v2.3.2955: and blends only when it says
 *                                   `blends` -- ground.js, BLENDS)
 *   { type: 'chunk', id, i, j }  -> { type: 'chunk', id, i, j, w, h, data, ms, under }
 *                                   (v2.3.2967: `under`, the swatch DRAWN at every
 *                                   UNDER art px of the piece, for the footsteps)
 *   { type: 'where', id, x, y }  -> { type: 'where', id, q, reg, tier, words }
 *                                   (answered at once; v2.3.2966: the region
 *                                   and tier there, and in words for the map)
 *   anything that fails          -> { type: 'error', id, message }
 */
import { PLAN } from '../plan.js';
import { buildBlueprint } from './layout.js';
import { gridInfo } from './grid.js';
import { materialMap, composeGround, swatchesUnder, walkBits, overviewPixels, EDGE_CLEAR, edgePiecesOn, blendsOn, blendPair, blendsUnder } from './ground.js';
import { PIXEL } from '../../style/bible.js';
import { mapPixels, nearestIn, ownPalette, coloursOf } from '../../style/process.js';
import { wheelMap, whereWords } from './wheelmap.js';
import { stepOf, cleanSteps } from './footsteps.js';

const TILE = PIXEL.groundTile;                                    /* 1024 px a swatch */
const K = Math.round(PLAN.worldPxPerArtPx / PIXEL.gamePxPerArtPx); /* 3 ground px a plan art px: 2 a game px */
const WPA = PLAN.worldPxPerArtPx;                                 /* 1.5 game px a plan art px */
const CHUNK = 128;          /* plan art px a piece: 192 game px, 384 ground px */
const APRON = 1;            /* art px laid past each edge, so smooth scaling reads the true neighbour at a join */
const UNDER = 2;            /* v2.3.2967: art px (3 game px) a byte of a piece's `under` -- 4 KB a piece */
const OVERVIEW_CELLS = 4;   /* blueprint cells an overview pixel */
const DECODED_KEEP = 16;    /* swatch pictures kept unpacked, 1 MB each (v2.3.2947: edge pieces too; v2.3.2951: and blends -- the town's busiest piece needs about 13) */
const GAME_BASE = '/world/ground/';
const STUDIO_DB = 'brotown-ground-studio';

let W = null;               /* { bp, mm } once ready: bp is the light copy (no per-cell layers) --
                               v2.3.2966: and the region and tier of every cell, and the map */
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
  const { bp, mm } = W;
  const rect = { x: bp.x0 + (i - PREFETCH) * CHUNK, y: bp.y0 + (j - PREFETCH) * CHUNK, w: (2 * PREFETCH + 1) * CHUNK, h: (2 * PREFETCH + 1) * CHUNK };
  for (const id of swatchesUnder(bp, mm, rect)) {
    const s = swatches[id];
    if (!s) continue;
    for (const v of ['A', 'B', 'E']) if (s.vers[v] && !decoded.has(`${id}|${v}`)) want(`${id}|${v}`, false);
  }
}

const post = (msg, transfer) => self.postMessage(msg, transfer || []);
let queue = Promise.resolve();
self.onmessage = (ev) => {
  const m = ev.data || {};
  /* where you stand is answered at once, not behind the pieces being laid */
  if (m.type === 'where') { post({ type: 'where', id: m.id, ...whereIs(m.x, m.y) }); return; }
  queue = queue.then(() => handle(m)).catch((e) => post({ type: 'error', id: m.id, message: String((e && e.message) || e) }));
};

async function handle(m) {
  if (m.type === 'init') return init(m);
  if (m.type === 'chunk') return chunk(m);
  return null;
}

/* ── init: the plan, where you cannot walk, the overview, the swatches ── */

async function init(m) {
  const t0 = performance.now();
  const g = gridInfo(PLAN);
  const full = buildBlueprint(PLAN);
  const mm = materialMap(PLAN, full);
  const bp = { w: full.w, h: full.h, scale: full.scale, x0: full.x0, y0: full.y0 };
  const planMs = Math.round(performance.now() - t0);
  const bits = walkBits(bp, mm);
  const ov = overviewPixels(bp, mm, OVERVIEW_CELLS);
  /* v2.3.2966: the map the minimap and the world map draw (wheelmap.js),
     and each cell's region and tier, kept for "where am I" (6 MB) */
  const map = wheelMap(PLAN, full);
  W = { bp, mm, reg: full.reg, tier: full.tier, regionIds: full.regionIds, map };
  const t1 = performance.now();
  await findSwatches(mm, edgePiecesOn(m && m.search), blendsOn(m && m.search));
  const swatchMs = Math.round(performance.now() - t1);
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
    worldW: bp.w * bp.scale * WPA, worldH: bp.h * bp.scale * WPA,
    walk: { cols: bp.w, rows: bp.h, bits },
    overview: ov,
    chunk: { artPx: CHUNK, gamePx: CHUNK * WPA, px: CHUNK * K, apronPx: APRON * K, cols: Math.ceil(bp.w * bp.scale / CHUNK), rows: Math.ceil(bp.h * bp.scale / CHUNK),
      under: CHUNK / UNDER },
    arrival: { x: Math.round((ax - bp.x0) * WPA), y: Math.round((ay - bp.y0) * WPA) },
    /* v2.3.2967: and what each sounds like underfoot (footsteps.js) */
    catalog: mm.ids.map((id, q) => ({ id, name: q === mm.water ? 'Water' : mm.catalog[q].name, step: q === mm.water ? null : stepChoices[id] || stepOf(id) })),
    water: mm.water,
    made, edges, blends: blends.sort(),
    map,
    planMs, swatchMs,
  }, [bits.buffer, ov.data.buffer]);
}

/* The swatch under a game position, by its index in `catalog` -- and
   v2.3.2966: the region and tier there, and where that is in words. */
function whereIs(x, y) {
  if (!W) return { q: null };
  const { bp, mm } = W;
  const bx = Math.floor(x / WPA / bp.scale), by = Math.floor(y / WPA / bp.scale);
  if (!(bx >= 0 && by >= 0 && bx < bp.w && by < bp.h)) return { q: null };
  const c = by * bp.w + bx, region = W.regionIds[W.reg[c]] || null, tier = W.tier[c];
  return { q: mm.mat[c], reg: region, tier, words: whereWords(W.map, region, tier) };
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
  const { bp, mm } = W;
  const rect = { x: bp.x0 + m.i * CHUNK - APRON, y: bp.y0 + m.j * CHUNK - APRON, w: CHUNK + 2 * APRON, h: CHUNK + 2 * APRON };
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
  const out = composeGround(PLAN, bp, mm, rect, tiles, { scale: K, blends });
  const under = underOf(out.mat, out.w);
  trim(keep);
  post({ type: 'chunk', id: m.id, i: m.i, j: m.j, w: out.w, h: out.h, data: out.data, under,
    ms: Math.round(performance.now() - t0), unpacked: decoded.size, unreadable: failed.size,
    /* v2.3.2959: laid without some of its pictures (lay it again later), and
       how the downloads stand */
    partial: lacking.size > 0, lacking: [...lacking], downloading: dlJobs.size, dlFails }, [out.data.buffer, under.buffer]);
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
