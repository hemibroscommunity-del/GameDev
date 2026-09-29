/* ═══ v2.3.2931: THE WORLD BUILDER PAGE ═══
 *
 * Owner: "I'm wanting one seamless map and to have chatGPT draw it into
 * squares.  I'll need to fuse them together but have some type of grid and
 * prompt system to construct the entire thing."
 *
 * The loop, per square:
 *   1. pick a square on the map (the page suggests which);
 *   2. save its TEMPLATE -- the blueprint sketch for that square with the
 *      finished art of its neighbours (and the town) pasted along its edges;
 *   3. copy its PROMPT and ask ChatGPT, attaching the template;
 *   4. bring ChatGPT's picture back: the page lines it up, matches its colour,
 *      cuts the least visible seam through the overlap, and shows the join
 *      with a plain-words grade; Keep it or Try again.
 *
 * Everything runs in this page -- no server, no account, nothing uploaded
 * anywhere.  Work is kept in this browser (store.js) and in backup .zip
 * files.  docs/WORLD-MAP-PIPELINE.md is the full write-up.
 *
 * window.__world is the handle tools/qa/world-page.mjs drives.
 */
import { PLAN } from './plan.js';
import { gridInfo, cellName, parseCell, cellRect, allCells, neighbours, SIDES } from './core/grid.js';
import { buildBlueprint, colorTable, renderSketch, renderOverview, coverage, placeAnchors } from './core/layout.js';
import { buildPrompt } from './core/prompt.js';
import { makeImg, resample, centreSquare } from './core/image.js';
import { fuseSquare } from './core/fuse.js';
import { zipStore, unzip } from './core/zip.js';
import { openStore } from './store.js';
import { fnv1a } from './core/rng.js';

const CH = 512;                 /* chunk size of the stored world, art px */
const PREVIEW_MARGIN = 160;     /* how much of the neighbours the join preview shows */
const BACKUP_NAG_EVERY = 5;     /* squares kept since the last backup before the page asks */
const $ = (id) => document.getElementById(id);
const enc = new TextEncoder();

/* ── canvas / blob helpers ── */

function newCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}
async function blobToImg(blob) {
  let src;
  try {
    src = await createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
  } catch (e) {
    src = await new Promise((resolve, reject) => {
      const im = new Image(); const url = URL.createObjectURL(blob);
      im.onload = () => { URL.revokeObjectURL(url); resolve(im); };
      im.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That file is not a picture this browser can read.')); };
      im.src = url;
    });
  }
  const w = src.width || src.naturalWidth, h = src.height || src.naturalHeight;
  const c = newCanvas(w, h), g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(src, 0, 0);
  if (src.close) src.close();
  return { w, h, data: g.getImageData(0, 0, w, h).data };
}
function imgToCanvas(img) {
  const c = newCanvas(img.w, img.h);
  c.getContext('2d').putImageData(new ImageData(img.data, img.w, img.h), 0, 0);
  return c;
}
async function canvasToBlob(c, type = 'image/png', q) {
  if (c.convertToBlob) return c.convertToBlob({ type, quality: q });
  return new Promise((resolve) => c.toBlob(resolve, type, q));
}
const imgToBlob = (img, type, q) => canvasToBlob(imgToCanvas(img), type, q);
function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
function stamp() {
  const d = new Date(), p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

/* ── the fused world, stored in 512 px chunks ── */

class Layer {
  constructor(store, W, H) { this.store = store; this.W = W; this.H = H; this.cache = new Map(); this.dirty = new Set(); }
  key(cx, cy) { return cx + ',' + cy; }
  async chunk(cx, cy) {
    const k = this.key(cx, cy);
    let img = this.cache.get(k);
    if (img) { this.cache.delete(k); this.cache.set(k, img); return img; }
    const blob = await this.store.get('chunks', k);
    img = blob ? await blobToImg(blob) : makeImg(CH, CH);
    this.cache.set(k, img);
    while (this.cache.size > 48) {
      const old = this.cache.keys().next().value;
      if (this.dirty.has(old)) break;
      this.cache.delete(old);
    }
    return img;
  }
  async read(x, y, w, h) {
    const out = makeImg(w, h);
    const cx0 = Math.floor(Math.max(0, x) / CH), cy0 = Math.floor(Math.max(0, y) / CH);
    const cx1 = Math.floor(Math.min(this.W - 1, x + w - 1) / CH), cy1 = Math.floor(Math.min(this.H - 1, y + h - 1) / CH);
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      const ch = await this.chunk(cx, cy);
      const ox = cx * CH, oy = cy * CH;
      const ax = Math.max(x, ox), ay = Math.max(y, oy), bx = Math.min(x + w, ox + CH), by = Math.min(y + h, oy + CH);
      for (let yy = ay; yy < by; yy++) {
        const s = ((yy - oy) * CH + (ax - ox)) * 4, d = ((yy - y) * w + (ax - x)) * 4;
        out.data.set(ch.data.subarray(s, s + (bx - ax) * 4), d);
      }
    }
    return out;
  }
  async write(x, y, img) {
    const cx0 = Math.floor(Math.max(0, x) / CH), cy0 = Math.floor(Math.max(0, y) / CH);
    const cx1 = Math.floor(Math.min(this.W - 1, x + img.w - 1) / CH), cy1 = Math.floor(Math.min(this.H - 1, y + img.h - 1) / CH);
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      const ch = await this.chunk(cx, cy);
      const ox = cx * CH, oy = cy * CH;
      const ax = Math.max(x, ox), ay = Math.max(y, oy), bx = Math.min(x + img.w, ox + CH), by = Math.min(y + img.h, oy + CH);
      for (let yy = ay; yy < by; yy++) {
        const s = ((yy - y) * img.w + (ax - x)) * 4, d = ((yy - oy) * CH + (ax - ox)) * 4;
        ch.data.set(img.data.subarray(s, s + (bx - ax) * 4), d);
      }
      this.dirty.add(this.key(cx, cy));
    }
  }
  async flush() {
    for (const k of this.dirty) {
      const img = this.cache.get(k);
      if (img) await this.store.put('chunks', k, await imgToBlob(img));
    }
    this.dirty.clear();
  }
  async clear() { this.cache.clear(); this.dirty.clear(); await this.store.clear('chunks'); }
}

/* ── state ── */

const S = {
  plan: PLAN, g: gridInfo(PLAN), bp: null, table: null, anchors: [], info: Object.create(null),
  store: null, layer: null,
  project: null,
  selected: null, pending: null, busy: false,
  view: 'art', zoom: 1,
  bpCanvas: null, artCanvas: null, anchorThumb: null,
  templateUrl: null,
};

function planHash() {
  const p = S.plan;
  return fnv1a(S.bp.hash, JSON.stringify({
    grid: p.grid, square: p.square, scale: p.worldPxPerArtPx, bs: p.blueprintScale,
    anchors: (p.anchors || []).map((a) => [a.src, a.size, a.at, a.inset, a.feather]),
  }));
}
const doneList = () => Object.values(S.project.squares).sort((a, b) => a.order - b.order);
const isDone = (id) => !!S.project.squares[id];

/* ── anchors (the town painting) ── */

function anchorAlpha(a, x, y) {
  const k = a.keep;
  if (x < k.x0 || x >= k.x1 || y < k.y0 || y >= k.y1) return 0;
  const d = Math.min(x - k.x0, k.x1 - 1 - x, y - k.y0, k.y1 - 1 - y);
  if (d >= a.feather) return 1;
  const t = d / a.feather;
  return t * t * (3 - 2 * t);
}
/* lay the anchors over a squares-layer region, in place */
function applyAnchors(img, x0, y0) {
  for (const a of S.anchors) {
    if (!a.img) continue;
    const k = a.keep;
    const ax = Math.max(x0, k.x0), ay = Math.max(y0, k.y0), bx = Math.min(x0 + img.w, k.x1), by = Math.min(y0 + img.h, k.y1);
    for (let y = ay; y < by; y++) for (let x = ax; x < bx; x++) {
      const al = anchorAlpha(a, x, y);
      if (al <= 0) continue;
      const s = ((y - a.y0) * a.img.w + (x - a.x0)) * 4, d = ((y - y0) * img.w + (x - x0)) * 4;
      const da = img.data[d + 3] / 255;
      const oa = al + da * (1 - al);
      for (let c = 0; c < 3; c++) img.data[d + c] = oa > 0 ? (a.img.data[s + c] * al + img.data[d + c] * da * (1 - al)) / oa : 0;
      img.data[d + 3] = oa * 255;
    }
  }
  return img;
}
async function worldRect(x, y, w, h) { return applyAnchors(await S.layer.read(x, y, w, h), x, y); }

/* ── per-square facts (sea share, town cover, what it touches) ── */

function computeInfo() {
  for (const cell of allCells(S.g)) {
    const rect = cellRect(S.g, cell.c, cell.r);
    const cov = coverage(S.plan, S.bp, rect);
    const sea = cov.classes.filter((k) => k.cls === 'ocean').reduce((s, k) => s + k.frac, 0);
    let covered = 0;
    for (const a of S.anchors) {
      const c = a.core;
      const ix = Math.max(0, Math.min(rect.x + rect.w, c.x1) - Math.max(rect.x, c.x0));
      const iy = Math.max(0, Math.min(rect.y + rect.h, c.y1) - Math.max(rect.y, c.y0));
      covered = Math.max(covered, (ix * iy) / (rect.w * rect.h));
    }
    const touchesAnchor = S.anchors.some((a) => a.keep.x1 > rect.x && a.keep.x0 < rect.x + rect.w && a.keep.y1 > rect.y && a.keep.y0 < rect.y + rect.h);
    const land = cov.classes.filter((k) => k.cls !== 'ocean' && k.cls !== 'anchor');
    const regs = new Map();
    for (const k of land) regs.set(k.region, (regs.get(k.region) || 0) + k.n);
    const names = [...regs.entries()].sort((a, b) => b[1] - a[1]).filter(([, n]) => n / cov.total > 0.05).map(([r]) => S.plan.regions[r].name);
    S.info[cell.id] = { ...cell, rect, sea, covered, touchesAnchor, names, optional: sea > 0.9, skip: covered > 0.97 };
  }
}

function suggestions(limit = 6) {
  const out = [];
  const c0 = S.g.cols / 2, r0 = S.g.rows / 2;
  for (const id in S.info) {
    const f = S.info[id];
    if (isDone(id) || f.skip || f.optional) continue;
    const nb = neighbours(S.g, f.c, f.r);
    const sides = SIDES.filter((s) => nb.sides[s] && isDone(nb.sides[s])).length;
    const corners = Object.values(nb.corners).filter(isDone).length;
    if (!sides && !corners && !f.touchesAnchor) continue;
    const dist = Math.hypot(f.c + 0.5 - c0, f.r + 0.5 - r0);
    out.push({ id, score: sides * 10 + corners * 2 + (f.touchesAnchor ? 6 : 0) - dist });
  }
  if (!out.length && !doneList().length) {
    /* nothing painted and no anchor: start in the middle */
    const id = cellName(Math.floor(c0), Math.floor(r0));
    if (S.info[id] && !S.info[id].skip) out.push({ id, score: 0 });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit).map((s) => s.id);
}

/* ── the map ── */

function buildOverviewLayers() {
  const bp = S.bp;
  const px = renderOverview(S.plan, bp, S.table);
  S.bpCanvas = imgToCanvas({ w: bp.w, h: bp.h, data: px });
  S.artCanvas = newCanvas(bp.w, bp.h);
  /* anchors at 1/scale with their feathered edge */
  S.anchorThumb = newCanvas(bp.w, bp.h);
  const g = S.anchorThumb.getContext('2d');
  for (const a of S.anchors) {
    if (!a.img) continue;
    const s = S.plan.blueprintScale;
    const w = Math.ceil(a.w / s), h = Math.ceil(a.h / s);
    const small = resample(a.img, w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) small.data[(y * w + x) * 4 + 3] = 255 * anchorAlpha(a, a.x0 + (x + 0.5) * s, a.y0 + (y + 0.5) * s);
    g.drawImage(imgToCanvas(small), Math.round(a.x0 / s), Math.round(a.y0 / s));
  }
}

async function paintArtThumb(rect, img) {
  const s = S.plan.blueprintScale;
  const small = resample(img, Math.round(img.w / s), Math.round(img.h / s));
  S.artCanvas.getContext('2d').drawImage(imgToCanvas(small), Math.round(rect.x / s), Math.round(rect.y / s));
}
async function saveArtThumb() { await S.store.put('misc', 'overview', await canvasToBlob(S.artCanvas)); }

function drawMap() {
  const cv = $('map'), bp = S.bp, s = S.plan.blueprintScale, g = S.g;
  if (cv.width !== bp.w) { cv.width = bp.w; cv.height = bp.h; }
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.globalAlpha = 1;
  ctx.drawImage(S.bpCanvas, 0, 0);
  if (S.view === 'art') {
    ctx.fillStyle = 'rgba(12,18,22,0.35)';
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.drawImage(S.artCanvas, 0, 0);
    ctx.drawImage(S.anchorThumb, 0, 0);
  }
  const step = g.P / s;
  /* sea squares: faint hatch */
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 1;
  for (const id in S.info) {
    const f = S.info[id];
    if (!f.optional || isDone(id)) continue;
    const x = f.c * step, y = f.r * step;
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, step, step); ctx.clip();
    ctx.beginPath();
    for (let k = -step; k < step; k += 12) { ctx.moveTo(x + k, y + step); ctx.lineTo(x + k + step, y); }
    ctx.stroke(); ctx.restore();
  }
  ctx.restore();
  /* grid + labels */
  ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let c = 0; c <= g.cols; c++) { const x = Math.round(c * step) + 0.5; ctx.moveTo(x, 0); ctx.lineTo(x, g.rows * step); }
  for (let r = 0; r <= g.rows; r++) { const y = Math.round(r * step) + 0.5; ctx.moveTo(0, y); ctx.lineTo(g.cols * step, y); }
  ctx.stroke();
  const next = new Set(suggestions());
  ctx.font = '700 19px system-ui,-apple-system,sans-serif';
  ctx.textBaseline = 'top';
  for (const id in S.info) {
    const f = S.info[id];
    const x = f.c * step, y = f.r * step;
    if (next.has(id)) { ctx.strokeStyle = '#D8A85F'; ctx.lineWidth = 4; ctx.strokeRect(x + 3, y + 3, step - 6, step - 6); }
    if (isDone(id)) {
      ctx.fillStyle = 'rgba(89,191,145,0.95)';
      ctx.beginPath(); ctx.arc(x + step - 16, y + 16, 9, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#10261c'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x + step - 21, y + 16); ctx.lineTo(x + step - 17, y + 20); ctx.lineTo(x + step - 11, y + 12); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x + 4, y + 4, ctx.measureText(id).width + 10, 24);
    ctx.fillStyle = f.optional ? 'rgba(255,255,255,0.55)' : '#F7F2E7';
    ctx.fillText(id, x + 9, y + 7);
  }
  if (S.selected) {
    const f = S.info[S.selected];
    const r = f.rect;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.setLineDash([10, 6]);
    ctx.strokeRect(r.x / s + 1.5, r.y / s + 1.5, r.w / s - 3, r.h / s - 3);
    ctx.setLineDash([]);
  }
  cv.style.width = (100 * S.zoom) + '%';
}

function progressText() {
  const total = Object.values(S.info).filter((f) => !f.optional && !f.skip).length;
  const done = Object.values(S.info).filter((f) => !f.optional && !f.skip && isDone(f.id)).length;
  const sea = Object.values(S.info).filter((f) => f.optional).length;
  const extra = doneList().length - done;
  return `${done} of ${total} land squares painted${extra ? ` (+${extra} sea)` : ''} · ${sea} open-sea squares are optional`;
}

function refreshHeader() {
  $('progress').textContent = progressText();
  const since = doneList().filter((r) => r.keptAt > (S.project.lastBackupAt || 0)).length;
  const nag = $('nag');
  if (since >= BACKUP_NAG_EVERY) {
    nag.hidden = false;
    nag.textContent = `${since} painted squares are only in this browser. Download a backup so they cannot be lost.`;
  } else nag.hidden = true;
  const f = S.plan;
  $('proj-info').textContent = `${S.g.cols} × ${S.g.rows} squares · ${S.g.N} px each with ${S.g.O} px overlap · world ${Math.round(S.g.W * f.worldPxPerArtPx).toLocaleString()} game px across · plan ${S.project.planHash}`;
}

/* ── the square panel ── */

function show(el, on) { $(el).hidden = !on; }

function finishedSides(squaresImg) {
  const N = S.g.N, O = S.g.O, out = {};
  const frac = (x0, y0, w, h) => {
    let n = 0, k = 0;
    for (let y = y0; y < y0 + h; y += 4) for (let x = x0; x < x0 + w; x += 4) { n++; if (squaresImg.data[(y * N + x) * 4 + 3] > 127) k++; }
    return k / n;
  };
  out.top = frac(0, 0, N, O) > 0.25;
  out.bottom = frac(0, N - O, N, O) > 0.25;
  out.left = frac(0, 0, O, N) > 0.25;
  out.right = frac(N - O, 0, O, N) > 0.25;
  return out;
}

async function templateFor(id) {
  const f = S.info[id], rect = f.rect, N = S.g.N;
  const sketch = renderSketch(S.plan, S.bp, rect, N, N, S.table);
  const sq = await S.layer.read(rect.x, rect.y, N, N);
  const world = applyAnchors({ w: N, h: N, data: new Uint8ClampedArray(sq.data) }, rect.x, rect.y);
  const out = makeImg(N, N);
  for (let i = 0; i < N * N; i++) {
    const a = world.data[i * 4 + 3] / 255;
    for (let c = 0; c < 3; c++) out.data[i * 4 + c] = world.data[i * 4 + c] * a + sketch[i * 4 + c] * (1 - a);
    out.data[i * 4 + 3] = 255;
  }
  const anchorsIn = S.anchors.filter((a) => a.keep.x1 > rect.x && a.keep.x0 < rect.x + N && a.keep.y1 > rect.y && a.keep.y0 < rect.y + N).map((a) => a.name);
  const prompt = buildPrompt(S.plan, S.bp, f.c, f.r, finishedSides(sq), anchorsIn, { first: !doneList().length && !S.anchors.length });
  return { img: out, prompt };
}

/* iPhone Safari often reloads a tab left in the background while you are in
   the ChatGPT app, so the square you were working on is remembered. */
const LAST_KEY = 'bt-world-last-square';
function remember(id) { try { localStorage.setItem(LAST_KEY, id); } catch (e) { /* private mode */ } }
function recalled() { try { return localStorage.getItem(LAST_KEY); } catch (e) { return null; } }

/* The finished neighbours a template was made against, so a picture brought
   back after one of them changed can be flagged. */
function doneAround(id) {
  const f = S.info[id], nb = neighbours(S.g, f.c, f.r);
  return [...Object.values(nb.sides), ...Object.values(nb.corners)].filter(isDone).sort().join(',');
}

async function select(id) {
  if (!S.info[id]) return;
  S.selected = id;
  S.pending = null;
  remember(id);
  drawMap();
  const f = S.info[id];
  show('square', true);
  $('sq-title').textContent = `${id}${f.names.length ? ' · ' + f.names.join(' → ') : ''}`;
  $('sq-sub').textContent = f.skip ? 'Covered by the town painting.'
    : isDone(id) ? `Painted (square ${S.project.squares[id].order} of the build).`
      : f.optional ? 'Almost all open sea. Optional — the game will never let you walk far enough out to see it up close.'
        : suggestions().includes(id) ? 'Ready to paint: its neighbours are finished, so ChatGPT will see their edges.'
          : 'Not touching any finished art yet. You can paint it, but squares next to finished ones join better.';
  show('sq-covered', f.skip);
  show('sq-steps', !f.skip && !isDone(id));
  show('sq-result', false);
  show('sq-done', isDone(id));
  if (f.skip) return;
  if (isDone(id)) { await showDone(id); return; }
  $('tpl-img').removeAttribute('src');
  $('prompt').value = 'Building the template…';
  const t = await templateFor(id);
  const blob = await imgToBlob(t.img);
  if (S.templateUrl) URL.revokeObjectURL(S.templateUrl);
  S.templateUrl = URL.createObjectURL(blob);
  S.templateBlob = blob;
  $('tpl-img').src = S.templateUrl;
  $('tpl-save').href = S.templateUrl;
  $('tpl-save').download = `brotown-${id}-template.png`;
  $('prompt').value = t.prompt.text;
  S.templateAround = { id, around: doneAround(id) };
  const file = new File([blob], `brotown-${id}-template.png`, { type: 'image/png' });
  $('tpl-share').hidden = !(navigator.canShare && navigator.canShare({ files: [file] }));
  S.templateFile = file;
  if (window.matchMedia('(max-width: 900px)').matches) $('square').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function previewImage(id, pending) {
  const f = S.info[id], r = f.rect, M = PREVIEW_MARGIN, N = S.g.N;
  const x = r.x - M, y = r.y - M, w = N + 2 * M, h = N + 2 * M;
  const img = await S.layer.read(x, y, w, h);
  if (pending) {
    for (let yy = 0; yy < N; yy++) img.data.set(pending.out.data.subarray(yy * N * 4, (yy + 1) * N * 4), ((yy + M) * w + M) * 4);
  }
  applyAnchors(img, x, y);
  /* unpainted surroundings: the plan, dimmed */
  const sk = renderSketch(S.plan, S.bp, { x, y, w, h }, w, h, S.table);
  for (let i = 0; i < w * h; i++) {
    const a = img.data[i * 4 + 3] / 255;
    for (let c = 0; c < 3; c++) img.data[i * 4 + c] = img.data[i * 4 + c] * a + sk[i * 4 + c] * 0.45 * (1 - a);
    img.data[i * 4 + 3] = 255;
  }
  if (pending && $('show-seam').checked) {
    const m = pending.newMask;
    for (let yy = 1; yy < N - 1; yy++) for (let xx = 1; xx < N - 1; xx++) {
      const i = yy * N + xx, v = m[i] > 0.5;
      if (v !== (m[i + 1] > 0.5) || v !== (m[i + N] > 0.5)) {
        for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
          const o = ((yy + M + dy) * w + xx + M + dx) * 4;
          img.data[o] = 255; img.data[o + 1] = 40; img.data[o + 2] = 40;
        }
      }
    }
  }
  const small = resample(img, Math.round(w / 2), Math.round(h / 2));
  /* the square's outline */
  const c = imgToCanvas(small), g = c.getContext('2d');
  g.strokeStyle = 'rgba(255,255,255,0.8)'; g.setLineDash([8, 6]); g.lineWidth = 2;
  g.strokeRect(M / 2, M / 2, N / 2, N / 2);
  return c;
}

function blit(target, source) {
  const cv = $(target);
  cv.width = source.width; cv.height = source.height;
  cv.getContext('2d').drawImage(source, 0, 0);
}

async function showDone(id) {
  const rec = S.project.squares[id];
  blit('done-preview', await previewImage(id, null));
  $('done-rating').textContent = rec.rating ? rec.rating.text : '';
  $('done-rating').dataset.grade = rec.rating ? rec.rating.grade : '';
  const raw = await S.store.get('raw', id);
  if (raw) {
    const a = $('raw-save');
    if (a.dataset.url) URL.revokeObjectURL(a.dataset.url);
    a.dataset.url = URL.createObjectURL(raw.blob);
    a.href = a.dataset.url;
    a.download = `brotown-${id}-chatgpt.${raw.ext || 'png'}`;
  }
}

/* ChatGPT's picture -> N x N, square, ready to fuse */
async function prepareGen(blob) {
  let img = await blobToImg(blob);
  const aspect = img.w / img.h;
  const warn = Math.abs(aspect - 1) > 0.03 ? `ChatGPT's picture is ${img.w} × ${img.h}, not square — the middle square of it was used.` : '';
  img = centreSquare(img);
  return { gen: resample(img, S.g.N, S.g.N), warn, size: [img.w, img.h] };
}

async function fuseAt(id, gen) {
  const f = S.info[id], r = f.rect, N = S.g.N;
  /* the square plus a 1 px ring: the ring says which edges must stay continuous */
  const big = await S.layer.read(r.x - 1, r.y - 1, N + 2, N + 2);
  const squares = makeImg(N, N);
  for (let y = 0; y < N; y++) squares.data.set(big.data.subarray(((y + 1) * (N + 2) + 1) * 4, ((y + 1) * (N + 2) + 1 + N) * 4), y * N * 4);
  const ring = { top: new Uint8Array(N), bottom: new Uint8Array(N), left: new Uint8Array(N), right: new Uint8Array(N) };
  const A = (x, y) => big.data[(y * (N + 2) + x) * 4 + 3] > 127 ? 1 : 0;
  for (let u = 0; u < N; u++) { ring.top[u] = A(u + 1, 0); ring.bottom[u] = A(u + 1, N + 1); ring.left[u] = A(0, u + 1); ring.right[u] = A(N + 1, u + 1); }
  const world = applyAnchors({ w: N, h: N, data: new Uint8ClampedArray(squares.data) }, r.x, r.y);
  return fuseSquare({ world, squares, gen, ring, feather: 12 });
}

async function busy(text, fn) {
  S.busy = true; $('busy-text').textContent = text; $('busy').hidden = false;
  await nextFrame();
  try { return await fn(); } finally { S.busy = false; $('busy').hidden = true; }
}

function toast(msg, bad) {
  const t = $('toast');
  t.textContent = msg; t.dataset.bad = bad ? '1' : ''; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, bad ? 9000 : 4000);
}

async function acceptPicture(blob, name) {
  const id = S.selected;
  if (!id || isDone(id) || S.busy) return;
  try {
    await busy('Lining it up with its neighbours…', async () => {
      const prep = await prepareGen(blob);
      const res = await fuseAt(id, prep.gen);
      let warn = prep.warn;
      if (S.templateAround && S.templateAround.id === id && S.templateAround.around !== doneAround(id)) {
        warn = (warn ? warn + ' ' : '') + 'A neighbour was finished after this template was saved, so ChatGPT never saw it — if the join shows, save the new template and ask again.';
      }
      S.pending = { id, blob, name: name || 'chatgpt.png', res, warn };
      show('sq-result', true);
      $('rating').textContent = res.rating.text + (warn ? ' ' + warn : '');
      $('rating').dataset.grade = res.rating.grade;
      blit('preview', await previewImage(id, res));
      $('sq-result').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  } catch (e) { toast(String(e.message || e), true); }
}

async function keep() {
  const p = S.pending;
  if (!p || S.busy) return;
  await busy('Saving…', async () => {
    const r = S.info[p.id].rect;
    await S.layer.write(r.x, r.y, p.res.out);
    await S.layer.flush();
    const ext = (p.blob.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
    await S.store.put('raw', p.id, { blob: p.blob, ext, name: p.name });
    S.project.squares[p.id] = {
      id: p.id, order: S.project.nextOrder++, keptAt: Date.now(),
      transform: p.res.transform, colour: p.res.colour, rating: p.res.rating,
      seamCost: p.res.seamCost, bandDiff: p.res.bandDiff,
    };
    await saveProject();
    await paintArtThumb(r, p.res.out);
    await saveArtThumb();
    S.pending = null;
  });
  refreshHeader();
  await select(S.selected);
}

async function saveProject() { await S.store.put('meta', 'project', S.project); }

/* Rebuild the fused world from the stored pictures, in build order.  Used by
   Redo (a square's removal changes every later square that touched it) and
   by Restore (a backup carries pictures, not fused pixels). */
async function rebuild(progress = () => {}) {
  await S.layer.clear();
  S.artCanvas.getContext('2d').clearRect(0, 0, S.artCanvas.width, S.artCanvas.height);
  const recs = doneList();
  let i = 0;
  for (const rec of recs) {
    progress(i++, recs.length, rec.id);
    await nextFrame();
    const raw = await S.store.get('raw', rec.id);
    if (!raw) { delete S.project.squares[rec.id]; continue; }
    const prep = await prepareGen(raw.blob);
    const res = await fuseAt(rec.id, prep.gen);
    const r = S.info[rec.id].rect;
    await S.layer.write(r.x, r.y, res.out);
    Object.assign(rec, { transform: res.transform, colour: res.colour, rating: res.rating, seamCost: res.seamCost, bandDiff: res.bandDiff });
    await paintArtThumb(r, res.out);
    if (i % 6 === 0) await S.layer.flush();
  }
  await S.layer.flush();
  await saveArtThumb();
  await saveProject();
}

async function redo(id, { confirmFirst = true } = {}) {
  if (!isDone(id)) return;
  const nb = neighbours(S.g, S.info[id].c, S.info[id].r);
  const touching = new Set([...Object.values(nb.sides), ...Object.values(nb.corners)]);
  const later = doneList().filter((r) => r.order > S.project.squares[id].order && touching.has(r.id)).map((r) => r.id);
  if (confirmFirst) {
    const msg = `Redo ${id}? Its picture is removed and the world is re-fused without it.` +
      (later.length ? `\n\n${later.join(', ')} ${later.length > 1 ? 'were' : 'was'} painted to match it and may need redoing too.` : '');
    if (!window.confirm(msg)) return;
  }
  await busy(`Re-fusing the world without ${id}…`, async () => {
    delete S.project.squares[id];
    await S.store.del('raw', id);
    await rebuild((i, n) => { $('busy-text').textContent = `Re-fusing the world without ${id}… ${i + 1}/${n}`; });
  });
  refreshHeader();
  await select(id);
}

async function backupBlob() {
  const recs = doneList();
  const files = [{
    name: 'backup.json',
    data: enc.encode(JSON.stringify({
      kind: 'brotown-world-backup', version: 1, planId: S.plan.id, planHash: S.project.planHash,
      createdAt: new Date().toISOString(),
      squares: recs.map((r) => ({ id: r.id, order: r.order, keptAt: r.keptAt })),
    }, null, 2)),
  }];
  for (const r of recs) {
    const raw = await S.store.get('raw', r.id);
    if (raw) files.push({ name: `squares/${r.id}.${raw.ext || 'png'}`, data: new Uint8Array(await raw.blob.arrayBuffer()) });
  }
  return new Blob([zipStore(files)], { type: 'application/zip' });
}

async function doBackup() {
  const blob = await busy('Packing the backup…', backupBlob);
  download(blob, `brotown-world-backup-${stamp()}.zip`);
  S.project.lastBackupAt = Date.now();
  await saveProject();
  refreshHeader();
}

async function restoreBlob(blob, { confirmFirst = true } = {}) {
  const entries = await unzip(new Uint8Array(await blob.arrayBuffer()));
  const metaEntry = entries.find((e) => e.name === 'backup.json');
  if (!metaEntry) throw new Error('That zip is not a World Builder backup (no backup.json inside).');
  const meta = JSON.parse(new TextDecoder().decode(metaEntry.data));
  if (meta.kind !== 'brotown-world-backup') throw new Error('That zip is not a World Builder backup.');
  if (confirmFirst) {
    let msg = `Restore ${meta.squares.length} squares from this backup? Everything in this browser is replaced.`;
    if (meta.planHash !== S.project.planHash) msg += '\n\nWARNING: the backup was made with a different world plan. Squares may not line up with the current blueprint.';
    if (!window.confirm(msg)) return false;
  }
  await busy('Restoring…', async () => {
    await S.store.clearAll();
    S.project = { planId: S.plan.id, planHash: planHash(), squares: {}, nextOrder: 1, lastBackupAt: Date.now(), createdAt: Date.now() };
    const byName = new Map(entries.map((e) => [e.name, e]));
    for (const sq of meta.squares.sort((a, b) => a.order - b.order)) {
      const e = [...byName.keys()].find((n) => n.startsWith(`squares/${sq.id}.`));
      if (!e || !S.info[sq.id]) continue;
      const ext = e.split('.').pop();
      const type = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'image/png';
      await S.store.put('raw', sq.id, { blob: new Blob([byName.get(e).data], { type }), ext, name: e.slice(8) });
      S.project.squares[sq.id] = { id: sq.id, order: S.project.nextOrder++, keptAt: sq.keptAt || Date.now() };
    }
    await rebuild((i, n) => { $('busy-text').textContent = `Restoring… fusing ${i + 1}/${n}`; });
  });
  refreshHeader();
  drawMap();
  return true;
}

async function exportPreview() {
  const c = newCanvas(S.bp.w, S.bp.h), g = c.getContext('2d');
  g.drawImage(S.bpCanvas, 0, 0);
  g.fillStyle = 'rgba(12,18,22,0.35)'; g.fillRect(0, 0, c.width, c.height);
  g.drawImage(S.artCanvas, 0, 0);
  g.drawImage(S.anchorThumb, 0, 0);
  download(await canvasToBlob(c), `brotown-world-preview-${stamp()}.png`);
}

/* ── wiring ── */

function cellAtEvent(ev) {
  const cv = $('map'), rect = cv.getBoundingClientRect();
  const x = ((ev.clientX - rect.left) / rect.width) * cv.width * S.plan.blueprintScale;
  const y = ((ev.clientY - rect.top) / rect.height) * cv.height * S.plan.blueprintScale;
  const c = Math.min(S.g.cols - 1, Math.max(0, Math.floor(x / S.g.P)));
  const r = Math.min(S.g.rows - 1, Math.max(0, Math.floor(y / S.g.P)));
  return cellName(c, r);
}

function wire() {
  $('map').addEventListener('click', (ev) => { if (!S.busy) select(cellAtEvent(ev)); });
  document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
    S.view = b.dataset.view;
    document.querySelectorAll('[data-view]').forEach((o) => o.classList.toggle('on', o === b));
    drawMap();
  }));
  document.querySelectorAll('[data-zoom]').forEach((b) => b.addEventListener('click', () => {
    S.zoom = Math.max(1, Math.min(4, S.zoom * (b.dataset.zoom === '+' ? 1.5 : 1 / 1.5)));
    drawMap();
  }));
  $('next-btn').addEventListener('click', () => { const s = suggestions(1)[0]; if (s) select(s); else toast('Nothing is waiting — every reachable square is painted.'); });
  $('prompt-copy').addEventListener('click', async () => {
    const text = $('prompt').value;
    try { await navigator.clipboard.writeText(text); toast('Prompt copied.'); } catch (e) {
      $('prompt').select(); document.execCommand('copy'); toast('Prompt copied.');
    }
  });
  $('tpl-share').addEventListener('click', async () => {
    try { await navigator.share({ files: [S.templateFile], text: $('prompt').value }); } catch (e) { /* cancelled */ }
  });
  $('file').addEventListener('change', (ev) => { const f = ev.target.files[0]; ev.target.value = ''; if (f) acceptPicture(f, f.name); });
  const drop = $('drop');
  drop.addEventListener('dragover', (ev) => { ev.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (ev) => {
    ev.preventDefault(); drop.classList.remove('over');
    const f = [...(ev.dataTransfer.files || [])].find((x) => x.type.startsWith('image/'));
    if (f) acceptPicture(f, f.name);
  });
  document.addEventListener('paste', (ev) => {
    if (!S.selected || isDone(S.selected) || ev.target === $('prompt')) return;
    const item = [...(ev.clipboardData ? ev.clipboardData.items : [])].find((i) => i.type.startsWith('image/'));
    if (item) { ev.preventDefault(); acceptPicture(item.getAsFile(), 'pasted.png'); }
  });
  $('show-seam').addEventListener('change', async () => { if (S.pending) blit('preview', await previewImage(S.pending.id, S.pending.res)); });
  $('keep').addEventListener('click', keep);
  $('retry').addEventListener('click', () => { S.pending = null; show('sq-result', false); $('drop').scrollIntoView({ behavior: 'smooth', block: 'center' }); });
  $('redo').addEventListener('click', () => redo(S.selected));
  $('backup').addEventListener('click', doBackup);
  $('nag').addEventListener('click', doBackup);
  $('restore').addEventListener('change', async (ev) => {
    const f = ev.target.files[0]; ev.target.value = '';
    if (!f) return;
    try { if (await restoreBlob(f)) toast('Backup restored.'); } catch (e) { toast(String(e.message || e), true); }
  });
  $('export-preview').addEventListener('click', exportPreview);
  $('rebuild').addEventListener('click', async () => {
    if (!window.confirm('Re-fuse every square from its original picture? Nothing is lost; it takes a moment per square.')) return;
    await busy('Re-fusing…', () => rebuild((i, n) => { $('busy-text').textContent = `Re-fusing ${i + 1}/${n}…`; }));
    drawMap();
  });
}

/* ── start ── */

async function loadAnchors() {
  const placed = placeAnchors(S.plan);
  S.anchors = [];
  for (const a of placed) {
    try {
      const res = await fetch(a.src);
      if (!res.ok) throw new Error(res.status);
      a.img = await blobToImg(await res.blob());
      if (a.img.w !== a.w || a.img.h !== a.h) a.img = resample(a.img, a.w, a.h);
      S.anchors.push(a);
    } catch (e) {
      toast(`Could not load ${a.name} (${a.src}) — building without it.`, true);
    }
  }
}

async function start() {
  $('progress').textContent = 'Building the world plan…';
  await nextFrame();
  S.bp = buildBlueprint(S.plan);
  S.table = colorTable(S.plan, S.bp);
  await loadAnchors();
  computeInfo();
  S.store = await openStore();
  S.layer = new Layer(S.store, S.g.W, S.g.H);
  const hash = planHash();
  S.project = (await S.store.get('meta', 'project')) || { planId: S.plan.id, planHash: hash, squares: {}, nextOrder: 1, lastBackupAt: 0, createdAt: Date.now() };
  if (S.project.planHash !== hash) {
    $('nag').hidden = false;
    $('nag').textContent = 'The world plan changed since these squares were painted. They may not line up with the new blueprint — see Project below.';
  }
  buildOverviewLayers();
  const art = await S.store.get('misc', 'overview');
  if (art) S.artCanvas.getContext('2d').drawImage(await createImageBitmap(art), 0, 0);
  await saveProject();
  wire();
  drawMap();
  refreshHeader();
  const last = recalled();
  if (last && S.info[last]) await select(last);
}

const ready = start().catch((e) => {
  console.error(e);
  $('progress').textContent = 'The World Builder could not start: ' + (e.message || e);
  throw e;
});

window.__world = {
  ready, S,
  api: {
    select, templateFor, acceptPicture, keep, redo, rebuild, backupBlob, restoreBlob, suggestions,
    worldRect, squaresRect: (x, y, w, h) => S.layer.read(x, y, w, h), applyAnchors, parseCell, cellRect: (id) => S.info[id] && S.info[id].rect,
  },
};
