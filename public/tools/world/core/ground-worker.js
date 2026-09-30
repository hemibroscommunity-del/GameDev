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
 * shows it.
 *
 * MEMORY.  A swatch is 1024 x 1024; unpacked as colours that is 4 MB, so the
 * worker keeps them as one palette index a pixel (1 MB) and only the last
 * DECODED_KEEP.  The blueprint (13 MB) is dropped as soon as the swatch map
 * (3 MB) is made from it.  Each piece goes to the game as its colours and is
 * not kept here.
 *
 * MESSAGES (all answered in order, one at a time):
 *   { type: 'init' }             -> { type: 'ready', ... } (see init below;
 *                                   v2.3.2947: `edges`, the grounds with edge pieces)
 *   { type: 'chunk', id, i, j }  -> { type: 'chunk', id, i, j, w, h, data, ms }
 *   { type: 'where', id, x, y }  -> { type: 'where', id, q }  (answered at once)
 *   anything that fails          -> { type: 'error', id, message }
 */
import { PLAN } from '../plan.js';
import { buildBlueprint } from './layout.js';
import { gridInfo } from './grid.js';
import { materialMap, composeGround, swatchesUnder, walkBits, overviewPixels, EDGE_CLEAR } from './ground.js';
import { PIXEL } from '../../style/bible.js';
import { mapPixels, nearestIn } from '../../style/process.js';

const TILE = PIXEL.groundTile;                                    /* 1024 px a swatch */
const K = Math.round(PLAN.worldPxPerArtPx / PIXEL.gamePxPerArtPx); /* 3 ground px a plan art px: 2 a game px */
const WPA = PLAN.worldPxPerArtPx;                                 /* 1.5 game px a plan art px */
const CHUNK = 128;          /* plan art px a piece: 192 game px, 384 ground px */
const APRON = 1;            /* art px laid past each edge, so smooth scaling reads the true neighbour at a join */
const OVERVIEW_CELLS = 4;   /* blueprint cells an overview pixel */
const DECODED_KEEP = 16;    /* swatch pictures kept unpacked, 1 MB each (v2.3.2947: edge pieces too) */
const GAME_BASE = '/world/ground/';
const STUDIO_DB = 'brotown-ground-studio';

let W = null;               /* { bp, mm } once ready: bp is the light copy (no per-cell layers) */
let swatches = Object.create(null);   /* id -> { from: 'studio'|'game', vers: { A?, B?, E? }, pal, mapped } */
const decoded = new Map();            /* 'id|ver' -> tile ({w, h, idx, pal} or {w, h, data}) */
const failed = new Set();             /* 'id|ver' that could not be unpacked: drawn in plan colour */

const post = (msg, transfer) => self.postMessage(msg, transfer || []);
let queue = Promise.resolve();
self.onmessage = (ev) => {
  const m = ev.data || {};
  /* where you stand is answered at once, not behind the pieces being laid */
  if (m.type === 'where') { post({ type: 'where', id: m.id, q: whereIs(m.x, m.y) }); return; }
  queue = queue.then(() => handle(m)).catch((e) => post({ type: 'error', id: m.id, message: String((e && e.message) || e) }));
};

async function handle(m) {
  if (m.type === 'init') return init();
  if (m.type === 'chunk') return chunk(m);
  return null;
}

/* ── init: the plan, where you cannot walk, the overview, the swatches ── */

async function init() {
  const t0 = performance.now();
  const g = gridInfo(PLAN);
  const full = buildBlueprint(PLAN);
  const mm = materialMap(PLAN, full);
  const bp = { w: full.w, h: full.h, scale: full.scale, x0: full.x0, y0: full.y0 };
  const planMs = Math.round(performance.now() - t0);
  const bits = walkBits(bp, mm);
  const ov = overviewPixels(bp, mm, OVERVIEW_CELLS);
  W = { bp, mm };
  const t1 = performance.now();
  await findSwatches(mm);
  const swatchMs = Math.round(performance.now() - t1);
  /* you arrive in the town square, as the Ground Studio's first spot */
  const ax = g.cx, ay = g.cy + 0.25 * g.P;
  const made = Object.create(null), edges = [];
  for (const id of Object.keys(swatches)) {
    const v = swatches[id].vers;
    if (v.A || v.B) made[id] = swatches[id].from;
    /* v2.3.2947: which grounds have their edge pieces */
    if (v.E) edges.push(id);
  }
  post({
    type: 'ready',
    worldW: bp.w * bp.scale * WPA, worldH: bp.h * bp.scale * WPA,
    walk: { cols: bp.w, rows: bp.h, bits },
    overview: ov,
    chunk: { artPx: CHUNK, gamePx: CHUNK * WPA, px: CHUNK * K, apronPx: APRON * K, cols: Math.ceil(bp.w * bp.scale / CHUNK), rows: Math.ceil(bp.h * bp.scale / CHUNK) },
    arrival: { x: Math.round((ax - bp.x0) * WPA), y: Math.round((ay - bp.y0) * WPA) },
    catalog: mm.ids.map((id, q) => ({ id, name: q === mm.water ? 'Water' : mm.catalog[q].name })),
    water: mm.water,
    made, edges,
    planMs, swatchMs,
  }, [bits.buffer, ov.data.buffer]);
}

/* The swatch under a game position, by its index in `catalog`. */
function whereIs(x, y) {
  if (!W) return null;
  const { bp, mm } = W;
  const bx = Math.floor(x / WPA / bp.scale), by = Math.floor(y / WPA / bp.scale);
  if (!(bx >= 0 && by >= 0 && bx < bp.w && by < bp.h)) return null;
  return mm.mat[by * bp.w + bx];
}

/* ── the swatches ── */

async function findSwatches(mm) {
  const known = new Set(mm.ids);
  const out = Object.create(null);
  /* the game's copy */
  try {
    const r = await fetch(GAME_BASE + 'manifest.json', { cache: 'no-cache' });
    if (r.ok) {
      const man = await r.json();          /* throws on a site's "page not found" HTML: no copy yet */
      const pal = man.palette || null;
      for (const s of man.swatches || []) {
        if (!known.has(s.id)) continue;
        const vers = Object.create(null);
        /* v2.3.2947: E, the swatch's edge pieces (see-through round them) */
        for (const v of s.versions || []) if (v === 'A' || v === 'B' || v === 'E') vers[v] = { url: `${GAME_BASE}${s.id}-${v}.png` };
        if (vers.A || vers.B || vers.E) out[s.id] = { from: 'game', vers, pal, mapped: true };
      }
    }
  } catch (e) { /* no copy in the game yet */ }
  /* the Ground Studio's, on this site */
  const db = await openIfThere(STUDIO_DB);
  if (db) {
    try {
      const keys = await ask(db, 'prep', (s) => s.getAllKeys());
      const palRec = await ask(db, 'misc', (s) => s.get('palette'));
      const pal = (palRec && palRec.colours) || null;
      const mine = Object.create(null);
      for (const k of keys || []) {
        const mk = /^(.+)\|([ABE])$/.exec(String(k));
        if (!mk || !known.has(mk[1])) continue;
        const blob = await ask(db, 'prep', (s) => s.get(k));
        if (!blob || !blob.size) continue;
        (mine[mk[1]] = mine[mk[1]] || Object.create(null))[mk[2]] = { blob };
      }
      for (const id of Object.keys(mine)) out[id] = { from: 'studio', vers: mine[id], pal, mapped: false };
    } finally { db.close(); }
  }
  swatches = out;
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

/* A swatch picture, unpacked (least recently used ones let go). */
async function tileOf(id, ver) {
  const k = `${id}|${ver}`;
  const hit = decoded.get(k);
  if (hit) { decoded.delete(k); decoded.set(k, hit); return hit; }
  if (failed.has(k)) return null;
  const s = swatches[id], src = s && s.vers[ver];
  if (!src) return null;
  let tile = null;
  try {
    const blob = src.blob || await (await fetch(src.url)).blob();
    const bm = await createImageBitmap(blob);
    const c = new OffscreenCanvas(TILE, TILE);
    const g = c.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingQuality = 'high';
    g.drawImage(bm, 0, 0, TILE, TILE);        /* the same size: a straight copy */
    if (bm.close) bm.close();
    const d = g.getImageData(0, 0, TILE, TILE).data;
    c.width = c.height = 1;
    if (!s.mapped) mapPixels(d, TILE, TILE, s.pal);   /* the studio's finalize, verbatim */
    tile = indexed(d, TILE, s.pal);
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
  const tiles = Object.create(null), keep = new Set();
  for (const id of swatchesUnder(bp, mm, rect)) {
    const s = swatches[id];
    if (!s) continue;
    const A = s.vers.A ? await tileOf(id, 'A') : null;
    const B = s.vers.B ? await tileOf(id, 'B') : null;
    const E = s.vers.E ? await tileOf(id, 'E') : null;
    keep.add(`${id}|A`); keep.add(`${id}|B`); keep.add(`${id}|E`);
    if (A || B || E) tiles[id] = { A: A || B, B: A && B ? B : null, E };
  }
  const out = composeGround(PLAN, bp, mm, rect, tiles, { scale: K, withMaterials: false });
  trim(keep);
  post({ type: 'chunk', id: m.id, i: m.i, j: m.j, w: out.w, h: out.h, data: out.data,
    ms: Math.round(performance.now() - t0), unpacked: decoded.size, unreadable: failed.size }, [out.data.buffer]);
}
