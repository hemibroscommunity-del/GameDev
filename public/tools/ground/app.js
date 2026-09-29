/* ═══ v2.3.2937: THE GROUND STUDIO PAGE ═══
 *
 * Owner: "Yes definitely do the swatches."  The loop, per swatch:
 *   1. copy its prompt (prompts.js) into a new ChatGPT chat, with the style
 *      key and the bro attached;
 *   2. bring the picture back: it is made seamless, shrunk to one 512 art px
 *      tile on the 1.5 game px grid (style/bible.js), and moved onto the one
 *      palette the whole ground shares (style/process.js) -- the same steps
 *      the game's pipeline takes;
 *   3. look at it laid on the Wheel at game size next to the bro
 *      (world/core/ground.js composes it, exactly as the game will);
 *   4. download everything as one zip for GitHub.
 *
 * Everything stays in this browser: the pictures as uploaded in IndexedDB
 * ('raw', the real asset), the seamless 512 px tiles before the palette
 * ('prep', so a reload does not redo them), and the palette ('misc').  The
 * style key is read from the World Builder's own storage on this site.
 *
 * MEMORY, FOR THE PHONE.  A full set is 48 swatches in two versions: held
 * as full-size canvases, the seamless tiles and the finished ones would come
 * to nearly 200 MB of canvas, near what iPhone Safari allows a page.  So
 * the only full-size things kept are the finished tiles' pixels (plain
 * arrays, which the compositor reads); the seamless tile before the palette
 * stays a PNG in memory and in storage, decoded only while the colours are
 * redone; a 128 px sample of it is what the palette is made from; and every
 * canvas that draws a thumbnail or packs the zip is let go at once.
 *
 * window.__ground is the handle tools/qa/ground-studio.mjs drives.
 */
import { PLAN } from '../world/plan.js';
import { buildBlueprint } from '../world/core/layout.js';
import { gridInfo } from '../world/core/grid.js';
import { spokePoint, arcPoint } from '../world/core/wheel.js';
import { groundCatalog, materialMap, composeGround, groundOverview } from '../world/core/ground.js';
import { openStore } from '../world/store.js';
import { zipStore, unzip } from '../world/core/zip.js';
import { PIXEL } from '../style/bible.js';
import { blobToCanvas, seamless, resize, buildPalette, hardenAndMap, mk } from '../style/process.js';
import { loadSprites, EFFECT_PALETTE } from '../style/scene.js';
import { promptFor } from './prompts.js';

const TILE = PIXEL.groundTile, GPA = PIXEL.gamePxPerArtPx;
const DB = 'brotown-ground-studio', STORES = ['raw', 'prep', 'misc'];
const VERS = ['A', 'B'];
const VIEW_H = 1024;          /* game px of height on the phone, as the game shows (worldViewport.js) */
const FOOT = 0.56;            /* where the bro stands, as a share of the screen's height */
const MARGIN = 96;            /* art px composed beyond the view, so a short drag needs no new ground */
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
  tiles: Object.create(null), means: Object.create(null),
  palette: null, frozen: false,
  sprites: null,
  view: { x: 0, y: 0, name: '' }, pv: null, drag: null,
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
  for (const k of [...S.prep.keys()].sort()) pool.push(S.prep.get(k).sample);
  const before = JSON.stringify(S.palette);
  const per = Math.max(1024, Math.floor(POOL_BUDGET / Math.max(1, pool.length)));
  S.palette = pool.length ? buildPalette(pool, Math.max(2, PIXEL.palette - EFFECT_PALETTE.length), per).concat(EFFECT_PALETTE) : null;
  return JSON.stringify(S.palette) !== before;
}

/* The swatch as the game will use it: on the palette, stray pixels gone.
   The compositor takes A (and B when both exist); `byVer` keeps each
   version as the owner made it, for the thumbnails and the zip. */
async function finalize(id) {
  const byVer = Object.create(null);
  for (const ver of VERS) {
    const p = S.prep.get(kv(id, ver));
    if (!p) continue;
    const c = await blobToCanvas(p.png, TILE);
    hardenAndMap(c, S.palette);
    byVer[ver] = { w: TILE, h: TILE, data: c.getContext('2d').getImageData(0, 0, TILE, TILE).data };
    release(c);
  }
  if (byVer.A || byVer.B) {
    const t = { A: byVer.A || byVer.B, B: byVer.A && byVer.B ? byVer.B : null, byVer };
    S.tiles[id] = t;
    const d = t.A.data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 4 * 17) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
    S.means[id] = [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
  } else {
    delete S.tiles[id];
    delete S.means[id];
  }
}
async function finalizeAll() { for (const e of S.cat) await finalize(e.id); }

/* A finished tile back on a canvas, for a moment (the caller lets it go). */
function tileCanvas(tile) {
  const c = mk(tile.w, tile.h);
  c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(tile.data), tile.w, tile.h), 0, 0);
  return c;
}

/* ── storage ── */

async function savePalette() {
  await S.store.put('misc', 'palette', { colours: S.palette, frozen: S.frozen });
}

async function addPicture(id, ver, blob, name) {
  const kept = await keepPrep(await prepare(blob));
  const k = kv(id, ver);
  S.raw.set(k, { blob, name: name || '' });
  S.prep.set(k, kept);
  await S.store.put('raw', k, { blob, name: name || '', type: blob.type || '' });
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
    S.raw.set(k, { blob: rec.blob, name: rec.name || '' });
    const pb = await S.store.get('prep', k);
    let kept = null;
    if (pb) {
      try { const c = await blobToImg(pb); if (c.width === TILE) kept = await keepPrep(c, pb); else release(c); } catch (e) { kept = null; }
    }
    if (!kept) {
      kept = await keepPrep(await prepare(rec.blob));
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
  const a = s * GPA;                     /* device px per art px */
  return { cv, W, H, s, a, wArt: W / a, hArt: H / a, dpr };
}

function viewRect(m) {
  return { x: S.view.x - m.wArt / 2, y: S.view.y - m.hArt * FOOT, w: m.wArt, h: m.hArt };
}

function composeView(m) {
  const v = viewRect(m);
  const rect = { x: Math.floor(v.x - MARGIN), y: Math.floor(v.y - MARGIN), w: Math.ceil(v.w + 2 * MARGIN), h: Math.ceil(v.h + 2 * MARGIN) };
  const out = composeGround(S.plan, S.bp, S.mm, rect, S.tiles);
  const c = mk(out.w, out.h);
  c.getContext('2d').putImageData(new ImageData(out.data, out.w, out.h), 0, 0);
  S.pv = { rect, canvas: c, mat: out.mat };
}

function drawPreview(recompose) {
  if (!S.bp) return;
  const m = pvMetrics();
  const v = viewRect(m);
  const P = S.pv;
  if (recompose || !P || v.x < P.rect.x || v.y < P.rect.y || v.x + v.w > P.rect.x + P.rect.w || v.y + v.h > P.rect.y + P.rect.h) composeView(m);
  const g = m.cv.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.fillStyle = '#0c1216';
  g.fillRect(0, 0, m.W, m.H);
  const R = S.pv.rect;
  g.drawImage(S.pv.canvas, Math.round((R.x - v.x) * m.a), Math.round((R.y - v.y) * m.a), Math.round(R.w * m.a), Math.round(R.h * m.a));
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
  /* what is on screen */
  const seen = new Map();
  const x0 = Math.max(0, Math.floor(v.x - R.x)), y0 = Math.max(0, Math.floor(v.y - R.y));
  const x1 = Math.min(R.w, Math.ceil(v.x + v.w - R.x)), y1 = Math.min(R.h, Math.ceil(v.y + v.h - R.y));
  for (let y = y0; y < y1; y += 4) for (let x = x0; x < x1; x += 4) {
    const q = S.pv.mat[y * R.w + x];
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
  drawPreview(true);
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
    const dx = (e.clientX - S.drag.x) * m.dpr / m.a, dy = (e.clientY - S.drag.y) * m.dpr / m.a;
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

/* a 2 x 2 repeat of the tile, so a seam would show (an empty slot stays a
   one-pixel canvas: fifty swatches' thumbnails add up on a phone) */
function drawThumb(cv, tile) {
  const n = tile ? 192 : 1;
  cv.width = n; cv.height = n;
  const g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.fillStyle = '#0c1216'; g.fillRect(0, 0, n, n);
  if (!tile) return;
  const c = tileCanvas(tile);
  for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) g.drawImage(c, x * 96, y * 96, 96, 96);
  release(c);
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
  const det = el('details');
  det.appendChild(el('summary', null, 'The prompt'));
  const ta = el('textarea');
  ta.readOnly = true; ta.value = promptFor(e); ta.dataset.prompt = e.id;
  det.appendChild(ta);
  const copyBtn = el('button', null, 'Copy prompt');
  copyBtn.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(ta.value); toast('Prompt copied. Attach the style key and your bro in the chat.'); }
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

function renderCount() {
  const made = S.cat.filter((e) => S.tiles[e.id]).length;
  const both = S.cat.filter((e) => S.prep.has(kv(e.id, 'A')) && S.prep.has(kv(e.id, 'B'))).length;
  $('count').textContent = `${made} of ${S.cat.length}`;
  $('count').className = made ? 'chip ok' : 'chip';
  $('status').textContent = made ? `${made} of ${S.cat.length} swatches made${both ? `, ${both} with a second version` : ''}.` : `${S.cat.length} swatches to make. Start with the commons, a road and one spoke's first stage.`;
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
    const t = S.tiles[e.id];
    if (!t) continue;
    const vers = [];
    for (const ver of VERS) {
      const k = kv(e.id, ver);
      const raw = S.raw.get(k);
      if (!raw || !S.prep.has(k)) continue;
      const tile = t.byVer[ver];
      if (!tile) continue;
      vers.push(ver);
      const tc = tileCanvas(tile);
      files.push({ name: `ground/${e.id}-${ver}.png`, data: new Uint8Array(await (await canvasToBlob(tc)).arrayBuffer()) });
      release(tc);
      const ext = extOf(raw.name, raw.blob.type);
      files.push({ name: `originals/${e.id}-${ver}.${ext}`, data: new Uint8Array(await raw.blob.arrayBuffer()) });
    }
    if (vers.length) made.push({ id: e.id, name: e.name, group: e.group, versions: vers, brief: e.brief });
  }
  const manifest = {
    tool: 'brotown-ground-studio', version: 1, made: new Date().toISOString(),
    plan: { id: S.plan.id, version: S.plan.version },
    tile: TILE, gamePxPerArtPx: GPA, palette: S.palette, frozen: S.frozen,
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
  for (const f of entries) {
    const m = /^originals\/(.+)-([AB])\.([a-z0-9]+)$/i.exec(f.name);
    if (!m || !S.byId[m[1]]) continue;
    const blob = new Blob([f.data], { type: mimeOf(m[3].toLowerCase()) });
    const k = kv(m[1], m[2]);
    const kept = await keepPrep(await prepare(blob));
    S.raw.set(k, { blob, name: f.name.split('/').pop() });
    S.prep.set(k, kept);
    await S.store.put('raw', k, { blob, name: f.name.split('/').pop(), type: blob.type });
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
  await nextFrame();
  S.g = gridInfo(S.plan);
  S.bp = buildBlueprint(S.plan);
  S.mm = materialMap(S.plan, S.bp);
  S.cat = groundCatalog(S.plan);
  for (const e of S.cat) S.byId[e.id] = e;
  S.store = await openStore(DB, STORES);
  await loadStyleKey();
  $('status').textContent = 'Loading your swatches…';
  await loadAll();
  try { S.sprites = await loadSprites(); } catch (e) { S.sprites = null; }
  S.spots = spots();
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
  setSpot(first.x, first.y, first.name);
}

S.ready = start().catch((e) => { $('status').textContent = `Something went wrong: ${e.message || e}`; throw e; });

window.__ground = {
  S,
  api: { addPicture, removePicture, exportZip, restoreZip, setSpot, spotFor, drawPreview, promptFor },
};
