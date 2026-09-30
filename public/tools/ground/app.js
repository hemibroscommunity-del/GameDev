/* ═══ v2.3.2937: THE GROUND STUDIO PAGE ═══
 *
 * Owner: "Yes definitely do the swatches."  The loop, per swatch:
 *   1. copy its prompt (prompts.js) into a new ChatGPT chat, with the style
 *      key attached (only the key since v2.3.2939: the bro is simpler pixel
 *      art than the world, so he is the size check here, not the reference);
 *   2. bring the picture back: it is made seamless, kept as one 1024 px tile
 *      covering 512 game px -- 2 px per game px, about the phone's own
 *      sharpness (style/bible.js, v2.3.2942: it used to be shrunk onto a
 *      1.5 game px grid and stretched back, which the owner saw as "soft and
 *      gritty at the same time") -- and moved onto the one palette the whole
 *      ground shares (style/process.js), the same steps the game's pipeline
 *      takes;
 *   3. look at it laid on the Wheel at game size next to the bro
 *      (world/core/ground.js composes it, exactly as the game will);
 *   4. download everything as one zip for GitHub.
 *
 * Everything stays in this browser: the pictures as uploaded in IndexedDB
 * ('raw', the real asset), the seamless tiles before the palette ('prep', so
 * a reload does not redo them), and the palette ('misc').  The style key is
 * read from the World Builder's own storage on this site.
 *
 * MEMORY, FOR THE PHONE.  A full set is 48 swatches in two versions, and at
 * 1024 px a swatch unpacked is 4 MB: all of them would be 400 MB, far more
 * than iPhone Safari allows a page.  So a finished swatch is kept as its PNG
 * and a 96 px copy for its card; only the few the preview has on screen are
 * unpacked (pixelsOf, the last DECODED_KEEP); the seamless tile before the
 * palette stays a PNG too, decoded only while the colours are redone; a
 * 128 px sample of it is what the palette is made from.
 *
 * window.__ground is the handle tools/qa/ground-studio.mjs drives.
 */
import { PLAN } from '../world/plan.js';
import { buildBlueprint } from '../world/core/layout.js';
import { gridInfo } from '../world/core/grid.js';
import { spokePoint, arcPoint } from '../world/core/wheel.js';
import { groundCatalog, materialMap, composeGround, groundOverview, swatchesUnder, groundContacts, pieceMap, edgePiecesOn } from '../world/core/ground.js';
import { openStore } from '../world/store.js';
import { zipStore, unzip } from '../world/core/zip.js';
import { PIXEL } from '../style/bible.js';
import { blobToCanvas, seamless, resize, buildPalette, hardenAndMap, mk, keyOut } from '../style/process.js';
import { loadSprites, EFFECT_PALETTE } from '../style/scene.js';
import { promptFor, edgePromptFor, hasEdgePieces } from './prompts.js';

const TILE = PIXEL.groundTile, GPA = PIXEL.gamePxPerArtPx;   /* 1024 px a swatch, 0.5 game px a px */
const K = Math.round(PLAN.worldPxPerArtPx / GPA);               /* ground px per plan art px: 3 */
const DB = 'brotown-ground-studio', STORES = ['raw', 'prep', 'misc'];
const VERS = ['A', 'B'];
/* v2.3.2947: a swatch's third picture, its loose EDGE PIECES on magenta */
const EDGE = 'E';
/* v2.3.2948: put away, since the owner saw no difference (world/core/
   ground.js, EDGE_PIECES): none of it shows unless the address says
   ?edgepieces.  Pictures already made stay saved, go in the zip and
   restore; they are just not shown, laid in the preview or counted in the
   colours. */
const PIECES = edgePiecesOn(location.search);
const VIEW_H = 1024;          /* game px of height on the phone, as the game shows (worldViewport.js) */
const FOOT = 0.56;            /* where the bro stands, as a share of the screen's height */
const MARGIN = 48;            /* plan art px composed beyond the view, so a short drag needs no new ground */
const THUMB = 96;             /* the card's copy of a finished swatch, drawn 2 x 2 */
const DECODED_KEEP = 16;      /* finished swatches (and edge pieces) kept unpacked for the preview, 4 MB each */
const KEY_WEIGHT = 8;         /* the style key counts this many times when the colours are made */
const SAMPLE = 128;           /* the size of the copy of each tile the palette is made from */
const KEY_SAMPLE = 256;       /* ... and of the style key */
const POOL_BUDGET = 200000;   /* about the most pixels the colours are made from (a few MB on a phone) */

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const kv = (id, ver) => `${id}|${ver}`;
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

const S = {
  plan: PLAN, g: null, bp: null, mm: null, cat: [], byId: Object.create(null),
  store: null, key: null,
  raw: new Map(), prep: new Map(),
  tiles: Object.create(null), means: Object.create(null), decoded: new Map(),
  /* v2.3.2947: id -> { w, h, png, thumb, pieces } for each swatch's edge pieces;
     every pair of swatches that touch (groundContacts); id -> the grounds it lies over */
  edges: Object.create(null), contacts: [], over: Object.create(null),
  palette: null, frozen: false,
  sprites: null,
  view: { x: 0, y: 0, name: '' }, pv: null, pvDirty: false, drag: null,
  stats: { previewDraws: 0 },
  ready: null,
};

/* ── little helpers ── */
let toastTimer = 0;
function toast(msg, bad) {
  const t = $('toast');
  t.textContent = msg; t.dataset.bad = bad ? '1' : '0'; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, bad ? 7000 : 3500);
}
async function busy(text, fn) {
  const b = $('busy');
  b.textContent = text; b.hidden = false;
  await nextFrame();
  try { return await fn(); } finally { b.hidden = true; }
}
function canvasToBlob(c, type = 'image/png') { return new Promise((res) => c.toBlob(res, type)); }
async function blobToImg(blob) {
  const c = await blobToCanvas(blob, 4096);
  return c;
}
function extOf(name, type) {
  const m = /\.([a-z0-9]+)$/i.exec(name || '');
  if (m) return m[1].toLowerCase();
  return (type || '').includes('jpeg') ? 'jpg' : (type || '').includes('webp') ? 'webp' : 'png';
}
function mimeOf(ext) { return ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'image/png'; }

/* ── the picture pipeline ── */

/* A ChatGPT picture -> the swatch's seamless tile, before the palette:
   squared, made to repeat, and shrunk to one 512 art px tile. */
async function prepare(blob) {
  const src = await blobToCanvas(blob, 1600);
  const n = Math.min(src.width, src.height);
  const sq = mk(n, n);
  sq.getContext('2d').drawImage(src, (src.width - n) / 2, (src.height - n) / 2, n, n, 0, 0, n, n);
  return resize(seamless(sq), TILE, TILE, true);
}
/* v2.3.2947: an edge-pieces picture -> its tile before the palette: squared,
   the flat magenta background cut away (keyOut, which also takes the
   magenta back out of the pieces' edge pixels), shrunk to one 1024 px tile.
   Never made seamless: the pieces stand apart on nothing, and a piece the
   picture's edge cuts in half is left out by the game (pieceMap). */
async function prepareEdge(blob) {
  const src = await blobToCanvas(blob, 1600);
  const n = Math.min(src.width, src.height);
  const sq = mk(n, n);
  sq.getContext('2d').drawImage(src, (src.width - n) / 2, (src.height - n) / 2, n, n, 0, 0, n, n);
  release(src);
  const k = keyOut(sq);
  /* only a magenta background is cut away: anything else (a swatch put in
     here by mistake) stays whole, so no pieces are found and the card says
     why, rather than a texture being cut into hundreds of crumbs */
  const bg = k.background;
  const magenta = k.keyed && bg && bg[0] > 170 && bg[2] > 170 && bg[1] < 110;
  const out = resize(magenta ? k.canvas : sq, TILE, TILE, true);
  release(sq);
  if (k.canvas !== sq) release(k.canvas);
  return out;
}
const prepareFor = (ver, blob) => (ver === EDGE ? prepareEdge(blob) : prepare(blob));

/* What is kept of a seamless tile: its PNG, and a small copy for the palette.
   The copy takes every fourth pixel as it is (no smoothing): averaging would
   pull the brightest and darkest pixels toward the middle, and the colours
   made from it would lose them. */
async function keepPrep(canvas, blob) {
  const png = blob || await canvasToBlob(canvas);
  const sample = resize(canvas, SAMPLE, SAMPLE, false);
  canvas.width = canvas.height = 0;
  return { png, sample };
}
const release = (c) => { c.width = c.height = 0; };

/* The palette: made from the style key and every swatch so far, unless
   frozen; the game's own effect colours always kept (style/scene.js).
   The swatches go in by name, not in the order they were added, so the
   same pictures always make the same colours (after a reload or a restore
   too); and each picture gives fewer pixels as the set grows, so a full set
   of a hundred pictures still makes its colours from about POOL_BUDGET. */
function rebuildPalette() {
  if (S.frozen && S.palette) return false;
  const pool = [];
  if (S.key && S.key.sample) for (let k = 0; k < KEY_WEIGHT; k++) pool.push(S.key.sample);
  for (const k of [...S.prep.keys()].sort()) if (PIECES || !k.endsWith(`|${EDGE}`)) pool.push(S.prep.get(k).sample);
  const before = JSON.stringify(S.palette);
  const per = Math.max(1024, Math.floor(POOL_BUDGET / Math.max(1, pool.length)));
  S.palette = pool.length ? buildPalette(pool, Math.max(2, PIXEL.palette - EFFECT_PALETTE.length), per).concat(EFFECT_PALETTE) : null;
  return JSON.stringify(S.palette) !== before;
}

/* The swatch as the game will use it: on the palette, stray pixels gone.
   Kept as its PNG and a small copy for its card (see MEMORY above); the
   preview unpacks the ones it needs with pixelsOf. */
async function finalize(id) {
  const byVer = Object.create(null);
  let mean = null;
  for (const ver of VERS) {
    S.decoded.delete(kv(id, ver));
    const p = S.prep.get(kv(id, ver));
    if (!p) continue;
    const c = await blobToCanvas(p.png, TILE);
    hardenAndMap(c, S.palette);
    const thumb = resize(c, THUMB, THUMB, true);
    if (!mean) mean = meanOf(thumb);
    const png = await canvasToBlob(c);
    release(c);
    byVer[ver] = { w: TILE, h: TILE, png, thumb };
  }
  if (byVer.A || byVer.B) {
    S.tiles[id] = { byVer };
    S.means[id] = mean;
  } else {
    delete S.tiles[id];
    delete S.means[id];
  }
  /* v2.3.2947: the edge pieces, on the palette, keeping only what the game
     lays -- whole pieces, not crumbs and not ones the picture's edge cuts */
  S.decoded.delete(kv(id, EDGE));
  const pe = S.prep.get(kv(id, EDGE));
  if (pe) {
    const c = await blobToCanvas(pe.png, TILE);
    hardenAndMap(c, S.palette);
    const g = c.getContext('2d', { willReadFrequently: true });
    const img = g.getImageData(0, 0, c.width, c.height);
    const pm = pieceMap({ w: c.width, h: c.height, data: img.data });
    for (let k = 0; k < c.width * c.height; k++) if (!pm.id[k]) img.data[k * 4 + 3] = 0;
    g.putImageData(img, 0, 0);
    const thumb = resize(c, THUMB, THUMB, true);
    const png = await canvasToBlob(c);
    release(c);
    S.edges[id] = { w: TILE, h: TILE, png, thumb, pieces: pm.pieces.length };
  } else delete S.edges[id];
}
async function finalizeAll() { for (const e of S.cat) await finalize(e.id); }

function meanOf(c) {
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
}

/* A finished swatch's pixels, unpacked, for the preview (and the test).
   Only the last DECODED_KEEP stay: a full set unpacked would be 400 MB. */
async function pixelsOf(id, ver) {
  const k = kv(id, ver);
  const hit = S.decoded.get(k);
  if (hit) { S.decoded.delete(k); S.decoded.set(k, hit); return hit; }
  const t = ver === EDGE ? S.edges[id] : S.tiles[id] && S.tiles[id].byVer[ver];
  if (!t) return null;
  const c = await blobToCanvas(t.png, TILE);
  const px = { w: c.width, h: c.height, data: c.getContext('2d').getImageData(0, 0, c.width, c.height).data };
  release(c);
  S.decoded.set(k, px);
  while (S.decoded.size > DECODED_KEEP) S.decoded.delete(S.decoded.keys().next().value);
  return px;
}

/* ── storage ── */

async function savePalette() {
  await S.store.put('misc', 'palette', { colours: S.palette, frozen: S.frozen });
}

async function addPicture(id, ver, blob, name) {
  const kept = await keepPrep(await prepareFor(ver, blob));
  const k = kv(id, ver);
  /* v2.3.2944: the brief it was made from, so a later rewrite of that brief
     can say "make this one again" (renderSwatch) */
  const brief = S.byId[id] ? S.byId[id].brief : '';
  const at = Date.now();   /* v2.3.2946: when, for "Saved on this phone" */
  S.raw.set(k, { blob, name: name || '', brief, at });
  S.prep.set(k, kept);
  await S.store.put('raw', k, { blob, name: name || '', type: blob.type || '', brief, at });
  await S.store.put('prep', k, kept.png);
  if (rebuildPalette()) { await finalizeAll(); await savePalette(); } else await finalize(id);
}

async function removePicture(id, ver) {
  const k = kv(id, ver);
  S.raw.delete(k); S.prep.delete(k);
  await S.store.del('raw', k); await S.store.del('prep', k);
  if (rebuildPalette()) { await finalizeAll(); await savePalette(); } else await finalize(id);
}

async function loadAll() {
  const keys = await S.store.keys('raw');
  for (const k of keys) {
    const rec = await S.store.get('raw', k);
    if (!rec || !rec.blob) continue;
    S.raw.set(k, { blob: rec.blob, name: rec.name || '', brief: rec.brief || null, at: rec.at || null });
    const pb = await S.store.get('prep', k);
    let kept = null;
    if (pb) {
      try { const c = await blobToImg(pb); if (c.width === TILE) kept = await keepPrep(c, pb); else release(c); } catch (e) { kept = null; }
    }
    if (!kept) {
      kept = await keepPrep(await prepareFor(String(k).split('|')[1], rec.blob));
      await S.store.put('prep', k, kept.png);
    }
    S.prep.set(k, kept);
  }
  const pal = await S.store.get('misc', 'palette');
  if (pal && pal.frozen && pal.colours) { S.palette = pal.colours; S.frozen = true; } else rebuildPalette();
  await finalizeAll();
}

async function loadStyleKey() {
  try {
    const wb = await openStore('brotown-world-builder');
    const rec = await wb.get('misc', 'styleKey');
    wb.close();
    if (!rec || !rec.blob) return;
    /* only a small copy is kept, for the colours (every fourth pixel as it
       is, like the swatches' copies); the page shows the key from its blob */
    const full = await blobToCanvas(rec.blob, 1024);
    const sample = resize(full, KEY_SAMPLE, KEY_SAMPLE, false);
    release(full);
    S.key = { blob: rec.blob, ext: rec.ext || 'png', url: URL.createObjectURL(rec.blob), sample };
  } catch (e) { S.key = null; }
}

/* ── where each swatch can be seen ── */

function spots() {
  const W = S.bp.wheel, R = S.plan.regions, out = [];
  const add = (group, name, p) => out.push({ group, name, x: S.g.cx + p[0] * S.g.P, y: S.g.cy + p[1] * S.g.P });
  add('Brotown', 'The town square', [0, 0.25]);
  add('Brotown', 'The Mill Bridge, by the west gate', [-2.02, 0]);
  add('Brotown', 'Railhead Junction (the mine railway)', spokePoint(W.byId.hollows, W.tierMid(4) - 0.25, 0.5));
  for (const s of W.spokes) {
    const rd = R[s.id];
    rd.stages.forEach((st, k) => add(rd.name, `Levels ${k * 20 + 1}–${(k + 1) * 20}: ${st.name}`, spokePoint(s, W.tierMid(k * 4 + 2), 0.45)));
    add(rd.name, `The gate: ${rd.gate.name}`, spokePoint(s, W.gateR - 0.3));
  }
  for (const [a, b] of W.pairs) {
    const br = S.plan.borders[[a.id, b.id].sort().join('|')];
    S.plan.wheel.passes.forEach((t, k) => add('The passes', (br && br.passes[k]) || 'a pass', arcPoint(a, b, W.tierMid(t) + 0.2, 0.5)));
  }
  /* v2.3.2947: the longest edges, one a ground on top, nearest the town */
  const tops = new Set();
  for (const c of S.contacts) {
    if (!c.recipe || tops.has(c.recipe.up) || tops.size >= 12) continue;
    tops.add(c.recipe.up);
    const r = c.recipe;
    out.push({ group: 'Where grounds meet', name: r.even ? `${S.byId[r.up].name} and ${S.byId[r.lo].name}` : `${S.byId[r.up].name} over ${S.byId[r.lo].name}`, x: c.at.x, y: c.at.y });
  }
  return out;
}

/* A place where a swatch is used, to preview it there. */
function spotFor(id) {
  const W = S.bp.wheel;
  const at = (p) => ({ x: S.g.cx + p[0] * S.g.P, y: S.g.cy + p[1] * S.g.P });
  const m = /^([a-z]+)-(\d)$/.exec(id);
  if (m && W.byId[m[1]]) return at(spokePoint(W.byId[m[1]], W.tierMid((+m[2] - 1) * 4 + 2), 0.45));
  const b = /^border-([a-z]+)-([a-z]+)$/.exec(id);
  if (b) {
    const pair = W.pairs.find(([p, q]) => [p.id, q.id].sort().join('-') === `${b[1]}-${b[2]}`);
    if (pair) return at(arcPoint(pair[0], pair[1], W.tierMid(4) + 0.2, 0.5));
  }
  if (id === 'road') return at([-1.55, 0]);
  if (id === 'gravel') return at(spokePoint(W.byId.hollows, W.tierMid(4) - 0.25, 0.5));
  if (id === 'lava') return at(spokePoint(W.byId.ember, W.tierMid(10), 0.45));
  if (id === 'commons') return at([1.7, 1.1]);
  return at([0, 0.25]);
}

/* ── the preview ── */

function pvMetrics() {
  const cv = $('pv'), box = $('phone').getBoundingClientRect();
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const W = Math.max(1, Math.round(box.width * dpr)), H = Math.max(1, Math.round(box.height * dpr));
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  const s = H / VIEW_H;                  /* device px per game px */
  const ap = s * PLAN.worldPxPerArtPx;   /* device px per plan art px (the view's unit) */
  return { cv, W, H, s, ap, wArt: W / ap, hArt: H / ap, dpr };
}

function viewRect(m) {
  return { x: S.view.x - m.wArt / 2, y: S.view.y - m.hArt * FOOT, w: m.wArt, h: m.hArt };
}

/* The swatches whose ground can reach into `rect` (plan art px): what the
   compositor will ask for, so only those are unpacked. */
/* v2.3.2943: the same list the game's ground worker unpacks (ground.js) */
const swatchesIn = (rect) => swatchesUnder(S.bp, S.mm, rect);

/* The ground round the view, at the swatches' own sharpness (K ground px
   per plan art px, 2 per game px). */
async function composeView(m) {
  const v = viewRect(m);
  const rect = { x: Math.floor(v.x - MARGIN), y: Math.floor(v.y - MARGIN), w: Math.ceil(v.w + 2 * MARGIN), h: Math.ceil(v.h + 2 * MARGIN) };
  const tiles = Object.create(null);
  for (const id of swatchesIn(rect)) {
    const t = S.tiles[id], ed = PIECES ? S.edges[id] : null;
    if (!t && !ed) continue;
    const A = t && t.byVer.A ? await pixelsOf(id, 'A') : null, B = t && t.byVer.B ? await pixelsOf(id, 'B') : null;
    const E = ed && ed.pieces ? await pixelsOf(id, EDGE) : null;
    if (A || B || E) tiles[id] = { A: A || B, B: A && B ? B : null, E };
  }
  const out = composeGround(S.plan, S.bp, S.mm, rect, tiles, { scale: K });
  const c = mk(out.w, out.h);
  c.getContext('2d').putImageData(new ImageData(out.data, out.w, out.h), 0, 0);
  const old = S.pv;
  S.pv = { rect, canvas: c, mat: out.mat };
  if (old && old.canvas) release(old.canvas);
}

function needsCompose(m) {
  const v = viewRect(m), P = S.pv;
  return !P || v.x < P.rect.x || v.y < P.rect.y || v.x + v.w > P.rect.x + P.rect.w || v.y + v.h > P.rect.y + P.rect.h;
}

/* Draw the preview; lay new ground first when the view has left what was
   laid, or when asked (a swatch changed).  Laying is async (swatches are
   unpacked on the way), so a drag keeps showing the last ground, moved,
   until the new one is ready. */
let composing = null;
async function drawPreview(recompose) {
  if (!S.bp) return;
  if (recompose) S.pvDirty = true;
  if (S.pvDirty || needsCompose(pvMetrics())) {
    if (!composing) {
      composing = (async () => {
        try {
          do { S.pvDirty = false; await composeView(pvMetrics()); } while (S.pvDirty || needsCompose(pvMetrics()));
        } finally { composing = null; }
      })();
    }
    if (S.pv) paint(pvMetrics());
    await composing;
  }
  paint(pvMetrics());
}

function paint(m) {
  const P = S.pv;
  if (!P) return;
  const v = viewRect(m), R = P.rect;
  const g = m.cv.getContext('2d');
  g.fillStyle = '#0c1216';
  g.fillRect(0, 0, m.W, m.H);
  /* the ground is about the phone's own sharpness (2 px per game px against
     ~2.5 device px): drawn smooth, as the game will, not doubled pixels */
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(P.canvas, Math.round((R.x - v.x) * m.ap), Math.round((R.y - v.y) * m.ap), Math.round(R.w * m.ap), Math.round(R.h * m.ap));
  g.imageSmoothingEnabled = false;
  /* the bro, standing, at the game's own size */
  const sp = S.sprites;
  if (sp) {
    const St = sp.stand.south, k = sp.standScale * m.s;
    const w = Math.round(St.fw * k), h = Math.round(St.c.height * k), fy = Math.round(St.bot * k);
    const x = Math.round(m.W / 2), y = Math.round(m.H * FOOT);
    g.fillStyle = 'rgba(0,0,0,0.28)';
    g.beginPath(); g.ellipse(x, y, 22 * m.s, 7 * m.s, 0, 0, Math.PI * 2); g.fill();
    g.drawImage(St.c, 0, 0, St.fw, St.c.height, x - Math.round(w / 2), y - fy, w, h);
  }
  /* what is on screen (the laid ground has K pixels to the art px) */
  const seen = new Map(), OW = R.w * K, OH = R.h * K;
  const x0 = Math.max(0, Math.floor((v.x - R.x) * K)), y0 = Math.max(0, Math.floor((v.y - R.y) * K));
  const x1 = Math.min(OW, Math.ceil((v.x + v.w - R.x) * K)), y1 = Math.min(OH, Math.ceil((v.y + v.h - R.y) * K));
  for (let y = y0; y < y1; y += 12) for (let x = x0; x < x1; x += 12) {
    const q = P.mat[y * OW + x];
    seen.set(q, (seen.get(q) || 0) + 1);
  }
  const parts = [...seen.entries()].sort((a, b) => b[1] - a[1]).map(([q]) => S.mm.ids[q]).filter((id) => id !== 'water');
  const box = $('inview');
  box.textContent = '';
  box.appendChild(el('b', null, S.view.name || 'Here'));
  box.appendChild(document.createTextNode(' · '));
  parts.forEach((id, i) => {
    const e = S.byId[id];
    const span = el('span', S.tiles[id] ? null : 'missing', `${e.name}${S.tiles[id] ? '' : ' (not made yet)'}`);
    box.appendChild(span);
    if (i < parts.length - 1) box.appendChild(document.createTextNode(', '));
  });
  S.stats.previewDraws++;
}

function setSpot(x, y, name) {
  S.view = { x, y, name: name || '' };
  return drawPreview(true);
}

function wirePreview() {
  const phone = $('phone');
  phone.addEventListener('pointerdown', (e) => {
    try { phone.setPointerCapture(e.pointerId); } catch (_e) { /* not capturable */ }
    S.drag = { x: e.clientX, y: e.clientY };
  });
  phone.addEventListener('pointermove', (e) => {
    if (!S.drag) return;
    const m = pvMetrics();
    const dx = (e.clientX - S.drag.x) * m.dpr / m.ap, dy = (e.clientY - S.drag.y) * m.dpr / m.ap;
    S.drag = { x: e.clientX, y: e.clientY };
    S.view.x -= dx; S.view.y -= dy; S.view.name = '';
    drawPreview(false);
  });
  const up = () => { S.drag = null; };
  phone.addEventListener('pointerup', up);
  phone.addEventListener('pointercancel', up);
  $('spot').addEventListener('change', () => {
    const sp = S.spots[Number($('spot').value)];
    if (sp) setSpot(sp.x, sp.y, sp.name);
  });
  window.addEventListener('resize', () => drawPreview(false));
}

/* ── the map ── */

function renderMap() {
  const cv = $('map'), bp = S.bp;
  if (cv.width !== bp.w) { cv.width = bp.w; cv.height = bp.h; }
  const px = groundOverview(S.plan, bp, S.mm, S.means);
  cv.getContext('2d').putImageData(new ImageData(px, bp.w, bp.h), 0, 0);
}

function wireMap() {
  $('map').addEventListener('click', (ev) => {
    const r = $('map').getBoundingClientRect();
    const x = S.bp.x0 + ((ev.clientX - r.left) / r.width) * S.bp.w * S.bp.scale;
    const y = S.bp.y0 + ((ev.clientY - r.top) / r.height) * S.bp.h * S.bp.scale;
    setSpot(x, y, 'The spot you tapped');
    $('preview').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

/* ── the list of swatches ── */

const GROUPS = () => {
  const out = [['hub', 'Brotown and the commons'], ['routes', 'Roads and special ground']];
  for (const id of Object.keys(S.plan.regions)) {
    const rd = S.plan.regions[id];
    if (rd.dir) out.push([id, `${rd.name} (${rd.element})`]);
  }
  out.push(['borders', 'Where two spokes meet']);
  return out;
};

/* a 2 x 2 repeat of the swatch, so a seam would show (an empty slot stays
   a one-pixel canvas: fifty swatches' thumbnails add up on a phone) */
function drawThumb(cv, entry) {
  const n = entry ? 2 * THUMB : 1;
  cv.width = n; cv.height = n;
  const g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.fillStyle = '#0c1216'; g.fillRect(0, 0, n, n);
  if (!entry) return;
  for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) g.drawImage(entry.thumb, x * THUMB, y * THUMB, THUMB, THUMB);
}

function renderSwatch(e) {
  const box = S.cards[e.id];
  box.textContent = '';
  const t = S.tiles[e.id];
  const head = el('div', 'sw-head');
  const name = el('span', 'sw-name', e.name);
  const vers = VERS.filter((v) => S.prep.has(kv(e.id, v)));
  const chip = el('span', vers.length ? 'chip ok' : 'chip', vers.length ? vers.join(' + ') : 'not made');
  chip.dataset.chip = e.id;
  name.appendChild(chip);
  head.appendChild(name);
  box.appendChild(head);
  box.appendChild(el('div', 'sw-where', `Used for ${e.where}.`));
  /* v2.3.2944: a picture made from an older brief than today's.  A picture
     from before briefs were recorded counts as older when the brief has been
     rewritten since (e.revised) -- the Main Street ruts that tiled sideways. */
  const stale = vers.filter((v) => {
    const r = S.raw.get(kv(e.id, v));
    return r && (r.brief ? r.brief !== e.brief : !!e.revised);
  });
  if (stale.length) {
    const note = el('div', 'sw-stale', `Made from an older prompt. It was rewritten${e.revised ? ` in ${e.revised}` : ''} so that nothing in it runs one way (ruts, long planks, ripples look wrong wherever the road turns). Make ${stale.length > 1 ? 'these' : 'this one'} again with the prompt below.`);
    note.dataset.stale = e.id;
    box.appendChild(note);
  }
  const det = el('details');
  det.appendChild(el('summary', null, 'The prompt'));
  const ta = el('textarea');
  ta.readOnly = true; ta.value = promptFor(e); ta.dataset.prompt = e.id;
  det.appendChild(ta);
  const copyBtn = el('button', null, 'Copy prompt');
  copyBtn.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(ta.value); toast('Prompt copied. Attach the style key in the chat.'); }
    catch (err) { ta.select(); toast('Select the prompt and copy it.'); }
  });
  const r0 = el('div', 'row'); r0.appendChild(copyBtn); det.appendChild(r0);
  box.appendChild(det);
  const grid = el('div', 'vers');
  for (const ver of VERS) {
    const v = el('div', 'ver');
    v.appendChild(el('div', 'lbl', ver === 'A' ? 'Version A' : 'Version B (a fresh chat, same prompt)'));
    const cv = el('canvas'); cv.dataset.thumb = kv(e.id, ver);
    drawThumb(cv, t ? t.byVer[ver] : null);
    v.appendChild(cv);
    const row = el('div', 'row');
    const lab = el('label', 'btn', S.prep.has(kv(e.id, ver)) ? 'Replace…' : 'Add picture');
    const inp = el('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.dataset.file = kv(e.id, ver);
    inp.addEventListener('change', async () => {
      const f = inp.files && inp.files[0];
      inp.value = '';
      if (!f) return;
      try {
        await busy('Making it seamless and moving it onto the colours…', () => addPicture(e.id, ver, f, f.name));
        refreshAll();
        const sp = spotFor(e.id);
        setSpot(sp.x, sp.y, `${e.name}, on the map`);
        toast(`${e.name} ${ver} is in. The preview shows it on the map.`);
      } catch (err) { toast(`That picture could not be read: ${err.message || err}`, true); }
    });
    lab.appendChild(inp);
    row.appendChild(lab);
    if (S.prep.has(kv(e.id, ver))) {
      const rm = el('button', 'danger', 'Remove');
      rm.dataset.remove = kv(e.id, ver);
      rm.addEventListener('click', async () => { await busy('Removing…', () => removePicture(e.id, ver)); refreshAll(); });
      row.appendChild(rm);
    }
    v.appendChild(row);
    grid.appendChild(v);
  }
  box.appendChild(grid);
  const see = el('button', null, 'See it on the map');
  see.addEventListener('click', () => { const sp = spotFor(e.id); setSpot(sp.x, sp.y, `${e.name}, on the map`); $('preview').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  const r1 = el('div', 'row'); r1.appendChild(see); box.appendChild(r1);
  if (PIECES && hasEdgePieces(e)) box.appendChild(edgeBlock(e));
}

/* v2.3.2947: a swatch's EDGE PIECES -- its third, optional picture: the
   prompt, the picture, and where on the Wheel this ground lies over others */
function edgeBlock(e) {
  const k = kv(e.id, EDGE), ed = S.edges[e.id], over = S.over[e.id] || [];
  const wrap = el('div', 'edge');
  wrap.dataset.edge = e.id;
  wrap.appendChild(el('div', 'lbl', 'Edge pieces (optional)'));
  const names = over.slice(0, 3).map((o) => S.byId[o.lo].name);
  wrap.appendChild(el('div', 'sw-where', over.length
    ? `It lies over ${names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0]}${over.length > 3 ? ` (and ${over.length - 3} more)` : ''}. The game scatters its loose pieces along those edges.`
    : 'The game scatters its loose pieces where it lies over another ground.'));
  const raw = S.raw.get(k);
  if (raw && raw.brief && raw.brief !== e.brief) {
    const note = el('div', 'sw-stale', 'Made for an older version of this ground. Make them again with the prompt below.');
    note.dataset.stale = k;
    wrap.appendChild(note);
  }
  const det = el('details');
  det.appendChild(el('summary', null, 'The edge pieces prompt'));
  const ta = el('textarea');
  ta.readOnly = true; ta.value = edgePromptFor(e); ta.dataset.edgePrompt = e.id;
  det.appendChild(ta);
  const copyBtn = el('button', null, 'Copy prompt');
  copyBtn.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(ta.value); toast("Copied. Send it in this swatch's own chat, or attach the style key and the swatch."); }
    catch (err) { ta.select(); toast('Select the prompt and copy it.'); }
  });
  const r0 = el('div', 'row'); r0.appendChild(copyBtn); det.appendChild(r0);
  wrap.appendChild(det);
  const row = el('div', 'edge-row');
  const cv = el('canvas'); cv.dataset.thumb = k;
  drawEdgeThumb(cv, ed);
  row.appendChild(cv);
  const right = el('div');
  right.appendChild(el('div', 'sw-where', ed ? `${ed.pieces} piece${ed.pieces === 1 ? '' : 's'} found.` : 'Not made yet.'));
  if (ed && !ed.pieces) right.appendChild(el('div', 'edge-bad', 'No separate pieces found. The background must be one flat magenta, and the pieces must not touch each other or the picture\'s edge.'));
  const btns = el('div', 'row');
  const lab = el('label', 'btn', S.prep.has(k) ? 'Replace…' : 'Add picture');
  const inp = el('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.dataset.file = k;
  inp.addEventListener('change', async () => {
    const f = inp.files && inp.files[0];
    inp.value = '';
    if (!f) return;
    try {
      await busy('Cutting out the pieces and moving them onto the colours…', () => addPicture(e.id, EDGE, f, f.name));
      refreshAll();
      showEdge(e.id);
      const n = S.edges[e.id] ? S.edges[e.id].pieces : 0;
      toast(n ? `${e.name}: ${n} edge pieces are in. The preview shows an edge.` : `${e.name}: no separate pieces found in that picture.`, !n);
    } catch (err) { toast(`That picture could not be read: ${err.message || err}`, true); }
  });
  lab.appendChild(inp);
  btns.appendChild(lab);
  if (S.prep.has(k)) {
    const rm = el('button', 'danger', 'Remove');
    rm.dataset.remove = k;
    rm.addEventListener('click', async () => { await busy('Removing…', () => removePicture(e.id, EDGE)); refreshAll(); });
    btns.appendChild(rm);
  }
  right.appendChild(btns);
  if (over.length) {
    const see = el('button', null, 'See an edge on the map');
    see.addEventListener('click', () => { showEdge(e.id); $('preview').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    const r2 = el('div', 'row'); r2.appendChild(see); right.appendChild(r2);
  }
  row.appendChild(right);
  wrap.appendChild(row);
  return wrap;
}
/* the pieces on a dark ground, one copy (an empty slot stays one pixel) */
function drawEdgeThumb(cv, ed) {
  const n = ed ? THUMB : 1;
  cv.width = n; cv.height = n;
  const g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.fillStyle = '#0c1216'; g.fillRect(0, 0, n, n);
  if (ed) g.drawImage(ed.thumb, 0, 0, THUMB, THUMB);
}
/* the preview on the longest edge where this ground lies over another */
function showEdge(id) {
  const o = (S.over[id] || [])[0];
  if (!o) { const sp = spotFor(id); return setSpot(sp.x, sp.y, `${S.byId[id].name}, on the map`); }
  return setSpot(o.at.x, o.at.y, `${S.byId[id].name} over ${S.byId[o.lo].name}`);
}

function renderList() {
  const list = $('list');
  list.textContent = '';
  S.cards = Object.create(null);
  for (const [gid, title] of GROUPS()) {
    const items = S.cat.filter((e) => e.group === gid);
    if (!items.length) continue;
    list.appendChild(el('h3', null, title));
    for (const e of items) {
      const box = el('div', 'sw');
      box.id = `sw-${e.id}`;
      S.cards[e.id] = box;
      list.appendChild(box);
      renderSwatch(e);
    }
  }
}

/* v2.3.2947: the numbers the "Where two grounds meet" card quotes */
function renderEdgeCounts() {
  const land = S.contacts.filter((c) => c.a !== 'water' && c.b !== 'water');
  $('pair-count').textContent = String(land.length);
  $('road-count').textContent = String(land.filter((c) => c.a === 'road' || c.b === 'road').length);
  const can = S.cat.filter(hasEdgePieces), made = can.filter((e) => S.edges[e.id]).length;
  $('edge-count').textContent = `${made} of ${can.length} made.`;
}

function renderCount() {
  const made = S.cat.filter((e) => S.tiles[e.id]).length;
  const both = S.cat.filter((e) => S.prep.has(kv(e.id, 'A')) && S.prep.has(kv(e.id, 'B'))).length;
  $('count').textContent = `${made} of ${S.cat.length}`;
  $('count').className = made ? 'chip ok' : 'chip';
  $('status').textContent = made ? `${made} of ${S.cat.length} swatches made${both ? `, ${both} with a second version` : ''}.` : `${S.cat.length} swatches to make. Start with the commons, a road and one spoke's first stage.`;
  renderSaved();
}

/* v2.3.2946, owner: "I can't tell if the ground studio has saved what I put
   in earlier."  The answer, at the top of the page: what this browser has,
   by name, and when the last picture went in. */
function renderSaved() {
  const pieces = (id) => PIECES && S.edges[id];
  const names = S.cat.filter((e) => S.tiles[e.id] || pieces(e.id)).map((e) => {
    const vers = VERS.filter((v) => S.prep.has(kv(e.id, v)));
    const parts = [];
    if (vers.length > 1) parts.push('A and B');
    if (pieces(e.id)) parts.push(vers.length ? 'edge pieces' : 'edge pieces only');
    return parts.length ? `${e.name} (${parts.join(', ')})` : e.name;
  });
  let last = 0;
  for (const r of S.raw.values()) if (r && r.at > last) last = r.at;
  const chip = $('saved-chip'), line = $('saved-line'), list = $('saved-list'), when = $('saved-when');
  chip.textContent = names.length ? `${names.length} saved` : 'none yet';
  chip.className = names.length ? 'chip ok' : 'chip';
  list.textContent = '';
  list.hidden = !names.length;
  when.hidden = !(names.length && last);
  if (!names.length) {
    line.textContent = 'Nothing is saved in this browser yet. If you made swatches before, they are in the other browser (see below).';
    return;
  }
  line.textContent = `${names.length === 1 ? 'This swatch is' : `These ${names.length} swatches are`} saved here:`;
  /* a list, not a sentence: some names have "and" in them */
  for (const n of names) list.appendChild(el('li', null, n));
  if (last) when.textContent = `The last picture went in ${whenText(last)}.`;
}
function whenText(t) {
  const d = new Date(t), now = new Date();
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return `today at ${time}`;
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return `yesterday at ${time}`;
  return `on ${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${time}`;
}

/* Ask the browser to keep this site's storage rather than clear it when
   space runs low (Safari can clear a site's storage).  Said on the page
   only when it agrees. */
async function keepStorage() {
  try {
    if (!navigator.storage || !navigator.storage.persist) return;
    const kept = (await navigator.storage.persisted()) || (await navigator.storage.persist());
    if (kept) { $('saved-keep').textContent = 'This browser has agreed to keep them, even when the phone is short of space.'; $('saved-keep').hidden = false; }
  } catch (e) { /* not offered here */ }
}

function renderPalette() {
  const box = $('pal');
  box.textContent = '';
  for (const c of S.palette || []) {
    const sw = el('span');
    sw.style.background = `rgb(${c[0]},${c[1]},${c[2]})`;
    box.appendChild(sw);
  }
  $('pal-n').textContent = String(PIXEL.palette);
  $('pal-chip').textContent = S.frozen ? 'frozen' : 'automatic';
  $('pal-chip').className = S.frozen ? 'chip ok' : 'chip';
  $('freeze').textContent = S.frozen ? 'Unfreeze' : 'Freeze these colours';
  $('freeze').disabled = !S.palette;
}

function renderKey() {
  const has = !!S.key;
  $('key-chip').textContent = has ? 'found' : 'not found';
  $('key-chip').className = has ? 'chip ok' : 'chip';
  $('key-none').hidden = has; $('key-has').hidden = !has;
  $('key-img').hidden = !has; $('key-save').hidden = !has;
  if (has) { $('key-img').src = S.key.url; $('key-save').href = S.key.url; $('key-save').download = `brotown-style-key.${S.key.ext}`; }
  const file = has && typeof File !== 'undefined' ? new File([S.key.blob], `brotown-style-key.${S.key.ext}`, { type: S.key.blob.type || mimeOf(S.key.ext) }) : null;
  $('key-share').hidden = !(file && navigator.canShare && navigator.canShare({ files: [file] }));
  $('key-share').onclick = () => navigator.share({ files: [file] }).catch(() => {});
}

function refreshAll() {
  for (const e of S.cat) renderSwatch(e);
  renderCount();
  renderEdgeCounts();
  renderMap();
  renderPalette();
  drawPreview(true);
}

/* ── save and restore ── */

async function exportZip() {
  const files = [];
  const enc = new TextEncoder();
  const made = [];
  for (const e of S.cat) {
    const t = S.tiles[e.id], ed = S.edges[e.id];
    if (!t && !ed) continue;
    const vers = [];
    /* v2.3.2947: and its edge pieces, as version E */
    for (const ver of [...VERS, EDGE]) {
      const k = kv(e.id, ver);
      const raw = S.raw.get(k);
      if (!raw || !S.prep.has(k)) continue;
      const tile = ver === EDGE ? ed : t && t.byVer[ver];
      if (!tile) continue;
      vers.push(ver);
      files.push({ name: `ground/${e.id}-${ver}.png`, data: new Uint8Array(await tile.png.arrayBuffer()) });
      const ext = extOf(raw.name, raw.blob.type);
      files.push({ name: `originals/${e.id}-${ver}.${ext}`, data: new Uint8Array(await raw.blob.arrayBuffer()) });
    }
    /* v2.3.2944: and the brief the pictures were made from (null when they
       predate the record), so a restore still knows which to make again */
    const from = vers.map((v) => S.raw.get(kv(e.id, v))).find((r) => r && r.brief);
    if (vers.length) made.push({ id: e.id, name: e.name, group: e.group, versions: vers, brief: e.brief, madeFrom: from ? from.brief : null });
  }
  const manifest = {
    tool: 'brotown-ground-studio', version: 1, made: new Date().toISOString(),
    plan: { id: S.plan.id, version: S.plan.version },
    tile: TILE, gamePxPerArtPx: GPA, tileGamePx: TILE * GPA, palette: S.palette, frozen: S.frozen,
    swatches: made,
  };
  files.unshift({ name: 'manifest.json', data: enc.encode(JSON.stringify(manifest, null, 1)) });
  return zipStore(files);
}

async function restoreZip(bytes) {
  const entries = await unzip(bytes);
  const byName = new Map(entries.map((f) => [f.name, f]));
  const mf = byName.get('manifest.json');
  const manifest = mf ? JSON.parse(new TextDecoder().decode(mf.data)) : null;
  let n = 0;
  /* v2.3.2944: the brief each swatch was made from, as the zip recorded it */
  const briefOf = Object.create(null);
  for (const sw of (manifest && manifest.swatches) || []) {
    if (!sw || !sw.id) continue;
    /* a zip from before v2.3.2944 has only `brief`: the one current when it
       was downloaded, which is what its pictures were made from */
    const from = 'madeFrom' in sw ? sw.madeFrom : sw.brief;
    if (typeof from === 'string') briefOf[sw.id] = from;
  }
  for (const f of entries) {
    const m = /^originals\/(.+)-([ABE])\.([a-z0-9]+)$/i.exec(f.name);
    if (!m || !S.byId[m[1]]) continue;
    const blob = new Blob([f.data], { type: mimeOf(m[3].toLowerCase()) });
    const k = kv(m[1], m[2].toUpperCase());
    const kept = await keepPrep(await prepareFor(m[2].toUpperCase(), blob));
    const brief = briefOf[m[1]] || null, at = Date.now();
    S.raw.set(k, { blob, name: f.name.split('/').pop(), brief, at });
    S.prep.set(k, kept);
    await S.store.put('raw', k, { blob, name: f.name.split('/').pop(), type: blob.type, brief, at });
    await S.store.put('prep', k, kept.png);
    n++;
  }
  if (manifest && manifest.frozen && manifest.palette) { S.palette = manifest.palette; S.frozen = true; }
  else { S.frozen = false; rebuildPalette(); }
  await savePalette();
  await finalizeAll();
  return n;
}

function wireSave() {
  $('export').addEventListener('click', async () => {
    const bytes = await busy('Packing the zip…', exportZip);
    const d = new Date(), p = (x) => String(x).padStart(2, '0');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([bytes], { type: 'application/zip' }));
    a.download = `brotown-ground-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.zip`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    toast('Downloaded. Upload it to GitHub (see "Putting the swatches in the game").');
  });
  $('restore').addEventListener('change', async (ev) => {
    const f = ev.target.files && ev.target.files[0];
    ev.target.value = '';
    if (!f) return;
    try {
      const n = await busy('Restoring…', async () => restoreZip(new Uint8Array(await f.arrayBuffer())));
      refreshAll();
      toast(`Restored ${n} picture${n === 1 ? '' : 's'}.`);
    } catch (err) { toast(`That zip could not be restored: ${err.message || err}`, true); }
  });
  $('freeze').addEventListener('click', async () => {
    S.frozen = !S.frozen;
    if (!S.frozen && rebuildPalette()) await busy('Redoing the colours…', finalizeAll);
    await savePalette();
    refreshAll();
    toast(S.frozen ? 'Colours frozen: new swatches are moved onto exactly these.' : 'Colours are automatic again.');
  });
}

/* ── start ── */

async function start() {
  /* v2.3.2948: the edge pieces' step and paragraphs, only if they are on */
  for (const n of document.querySelectorAll('[data-pieces]')) n.hidden = !PIECES;
  await nextFrame();
  S.g = gridInfo(S.plan);
  S.bp = buildBlueprint(S.plan);
  S.mm = materialMap(S.plan, S.bp);
  S.cat = groundCatalog(S.plan);
  for (const e of S.cat) S.byId[e.id] = e;
  /* v2.3.2947: every pair of grounds that touch, and what each lies over */
  S.contacts = groundContacts(S.plan, S.bp, S.mm);
  for (const c of S.contacts) {
    if (!c.recipe || c.recipe.even) continue;
    (S.over[c.recipe.up] = S.over[c.recipe.up] || []).push({ lo: c.recipe.lo, n: c.n, at: c.at });
  }
  S.store = await openStore(DB, STORES);
  keepStorage();
  await loadStyleKey();
  $('status').textContent = 'Loading your swatches…';
  await loadAll();
  try { S.sprites = await loadSprites(); } catch (e) { S.sprites = null; }
  S.spots = spots();
  renderEdgeCounts();
  const sel = $('spot');
  let group = null, og = null;
  S.spots.forEach((sp, i) => {
    if (sp.group !== group) { group = sp.group; og = el('optgroup'); og.label = group; sel.appendChild(og); }
    const o = el('option', null, sp.name); o.value = String(i); og.appendChild(o);
  });
  renderKey();
  renderList();
  renderCount();
  renderMap();
  renderPalette();
  wirePreview();
  wireMap();
  wireSave();
  const first = S.spots[1];
  sel.value = '1';
  await setSpot(first.x, first.y, first.name);
}

S.ready = start().catch((e) => { $('status').textContent = `Something went wrong: ${e.message || e}`; throw e; });

window.__ground = {
  S, pieces: PIECES,
  api: { addPicture, removePicture, exportZip, restoreZip, setSpot, spotFor, drawPreview, promptFor, edgePromptFor, pixelsOf, showEdge },
};
