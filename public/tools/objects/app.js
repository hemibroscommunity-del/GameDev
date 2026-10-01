/* ═══ v2.3.2964: THE OBJECT STUDIO PAGE ═══
 *
 * Owner: "Yes make object studio.  I'll also want to redo all the buildings
 * again using more specific prompts."  The loop, per object:
 *   1. copy its prompt (prompts.js) into a new ChatGPT chat, with the style
 *      key attached -- only the key: the bro is simpler pixel art than the
 *      world, so he is the size check here, not the reference;
 *   2. bring the picture back (makePieces): its flat background is cut away
 *      (style/process.js keyOut), a set is cut apart (four barrels, four
 *      pictures: splitObjects), each is made exactly its size in the game at
 *      2 px a game px (the middle of a set at the catalog's size, the rest
 *      in proportion, so a set keeps its big and small ones), and they
 *      share their own 64 colours with hard edges and no stray pixels (the
 *      ground's own-colours rule, v2.3.2961, style/bible.js);
 *   3. see it standing on its land's ground next to the bro, as big as it
 *      will be on a phone held upright (the stage);
 *   4. download it all: the backup, and the small zip for the game.
 *
 * Everything stays in this browser: the pictures as uploaded in IndexedDB
 * ('raw', the real asset), the finished pieces as PNGs ('fin', remade from
 * 'raw' whenever MADE changes), and each object's size choice ('misc').  The
 * style key is read from the World Builder's own storage on this site.
 *
 * MEMORY, FOR THE PHONE.  Finished pieces are kept as PNGs; the cards show
 * small copies; only the one object on the stage is unpacked at full size.
 *
 * window.__objects is the handle tools/qa/object-studio.mjs drives.
 */
import { PLAN } from '../world/plan.js';
import { openStore } from '../world/store.js';
import { zipStore, unzip } from '../world/core/zip.js';
import { encodePalettePng } from '../world/core/png8.js';
import { PIXEL } from '../style/bible.js';
import { blobToCanvas, keyOut, partsOf, cropTo, splitObjects, resize, ownPalette, hardenAndMap, mk, trim } from '../style/process.js';
import { loadSprites } from '../style/scene.js';
import { objectCatalog, GROUPS } from './catalog.js';
import { promptFor, sizeWords, FRAME_GAME_PX } from './prompts.js';

const GPA = PIXEL.gamePxPerArtPx;      /* 0.5 game px a picture px */
const PX = 1 / GPA;                    /* 2 picture px a game px */
const OWN = PIXEL.ownColours || 64;    /* each object's own colours, shared by its set */
const DB = 'brotown-object-studio', STORES = ['raw', 'fin', 'misc'];
/* How the finished pieces were made; pieces made any other way are made
   again from the pictures as uploaded, on load. */
const MADE = 'object-studio v2.3.2964';
const SIZES = [0.7, 0.8, 0.9, 1, 1.1, 1.25, 1.4];
/* CSS px a game px on a phone held upright: the game shows 1024 game px of
   height (src/game/worldViewport.js) on an 844 px tall screen */
const PHONE = 844 / 1024;
const THUMB = 120;                     /* the most px a card's copy of a piece is, either way */
/* how far a picture's pixels may be from the ground's before the card says so */
const PIXELS_OK = [0.7, 1.45];
/* a single object keeps the loose bits round it at least this share of its
   biggest part (a sign on its own post, a barrel at the porch's end) */
const LOOSE_MIN = 0.08;
/* a picture whose border is less than this share one flat colour was drawn
   on a scene, not on the background the prompt asks for */
const FLAT_MIN = 0.6;

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

const S = {
  cat: [], byId: Object.create(null),
  store: null, key: null,
  /* id -> { blob, name, type, at, promptId } */
  raw: new Map(),
  /* id -> { pieces: [{ png, w, h, thumb }], ratio, found, flat, colours, size, made, at } */
  fin: new Map(),
  sizes: Object.create(null),
  sprites: null,
  ground: { made: '', imgs: Object.create(null) },
  cards: Object.create(null),
  stage: { id: null, cv: null, draws: 0 },
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
function extOf(name, type) {
  const m = /\.([a-z0-9]+)$/i.exec(name || '');
  if (m) return m[1].toLowerCase();
  return type === 'image/jpeg' ? 'jpg' : type === 'image/webp' ? 'webp' : 'png';
}
function mimeOf(ext) { return ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'image/png'; }
const release = (c) => { if (c) c.width = c.height = 0; };
/* a short fingerprint of a prompt, so a picture made from an older one can
   be told (the Ground Studio keeps a swatch's whole brief; a building's
   prompt is long) */
function promptId(text) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/* ═══ the pipeline: a ChatGPT picture -> the object's pieces ═══ */
async function makePieces(entry, blob, mul = 1) {
  const src = await blobToCanvas(blob, 2048);
  /* ChatGPT sometimes draws the object on a scene, not one flat colour */
  const flat = flatBorder(src);
  const { canvas: cut } = keyOut(src);
  let pieces;
  if (entry.count === 1) {
    /* one object: its biggest part and the loose bits round it */
    const parts = partsOf(cut);
    pieces = [];
    if (parts.length) {
      const big = Math.max(...parts.map((p) => p.n));
      const keep = parts.filter((p) => p.n >= big * LOOSE_MIN);
      const x0 = Math.min(...keep.map((p) => p.x)), y0 = Math.min(...keep.map((p) => p.y));
      const x1 = Math.max(...keep.map((p) => p.x + p.w)), y1 = Math.max(...keep.map((p) => p.y + p.h));
      const t = cropTo(cut, { x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
      if (t) pieces.push(t);
    }
  } else pieces = splitObjects(cut, entry.count);
  const frameH = src.height;
  release(src); release(cut);
  if (!pieces.length) throw new Error('nothing was left once the background was cut away');
  /* the middle of the set made the catalog's size (of four, the two in the
     middle, averaged); the rest in step */
  const dims = pieces.map((p) => (entry.fit === 'w' ? p.width : p.height)).sort((a, b) => a - b);
  const mid = (dims[(dims.length - 1) >> 1] + dims[dims.length >> 1]) / 2;
  const k = (entry.size * mul * PX) / mid;
  /* the ground's own scale: a picture as tall as a swatch covers (512 game
     px) made 1024 px.  1 = this object's pixels are the ground's size. */
  const ratio = k / ((FRAME_GAME_PX * PX) / frameH);
  /* shrunk smoothly, as the ground is; never blown up smoothly (blurred
     pixel art), only by repeating its pixels */
  const outs = pieces.map((p) => resize(p, p.width * k, p.height * k, k < 1));
  for (const p of pieces) release(p);
  /* one set of colours for the whole set, so its pieces match */
  const sheet = mk(Math.max(...outs.map((c) => c.width)), outs.reduce((s, c) => s + c.height, 0));
  const sg = sheet.getContext('2d', { willReadFrequently: true });
  let y = 0;
  for (const c of outs) { sg.drawImage(c, 0, y); y += c.height; }
  const pal = ownPalette(sg.getImageData(0, 0, sheet.width, sheet.height).data, sheet.width, sheet.height, OWN);
  release(sheet);
  const fin = [];
  for (const c of outs) {
    hardenAndMap(c, pal);
    const t = trim(c) || c;
    if (t !== c) release(c);
    fin.push(t);
  }
  return { canvases: fin, ratio, found: pieces.length, flat, colours: pal.length };
}

/* How much of the picture's border is one flat colour, its background: all
   of it, but where the object reaches the edge, on a picture made as the
   prompt asks (a see-through PNG's border is one colour too). */
function flatBorder(c) {
  const w = c.width, h = c.height;
  const d = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
  const at = [];
  for (let x = 0; x < w; x += 3) at.push(x * 4, ((h - 1) * w + x) * 4);
  for (let y = 0; y < h; y += 3) at.push(y * w * 4, (y * w + w - 1) * 4);
  const bucket = (i) => ((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3);
  const counts = new Map();
  let best = -1, bestN = 0;
  for (const i of at) { const b = bucket(i), m = (counts.get(b) || 0) + 1; counts.set(b, m); if (m > bestN) { bestN = m; best = b; } }
  let r = 0, g = 0, bl = 0, n = 0;
  for (const i of at) if (bucket(i) === best) { r += d[i]; g += d[i + 1]; bl += d[i + 2]; n++; }
  r /= n; g /= n; bl /= n;
  let near = 0;
  /* (40: ChatGPT's flat colour can shade a little toward the corners) */
  for (const i of at) if ((d[i] - r) ** 2 + (d[i + 1] - g) ** 2 + (d[i + 2] - bl) ** 2 < 40 * 40) near++;
  return near / at.length;
}

/* the card's small copy of a piece */
function thumbOf(c) {
  const k = Math.min(1, THUMB / c.width, THUMB / c.height);
  const t = mk(c.width * k, c.height * k), g = t.getContext('2d');
  g.imageSmoothingEnabled = k < 1;
  g.imageSmoothingQuality = 'high';
  g.drawImage(c, 0, 0, t.width, t.height);
  return t;
}

/* made pieces -> what is kept: PNGs, sizes, the card's copies */
async function keepPieces(made, mul) {
  const pieces = [];
  for (const c of made.canvases) {
    pieces.push({ png: await canvasToBlob(c), w: c.width, h: c.height, thumb: thumbOf(c) });
    release(c);
  }
  return { pieces, ratio: made.ratio, found: made.found, flat: made.flat, colours: made.colours, size: mul, made: MADE, at: Date.now() };
}
const storedFin = (f) => ({ ...f, pieces: f.pieces.map(({ png, w, h }) => ({ png, w, h })) });

async function finish(id) {
  const e = S.byId[id], raw = S.raw.get(id), mul = S.sizes[id] || 1;
  const f = await keepPieces(await makePieces(e, raw.blob, mul), mul);
  S.fin.set(id, f);
  await S.store.put('fin', id, storedFin(f));
  return f;
}

async function addPicture(id, blob, name) {
  const e = S.byId[id];
  if (!e) throw new Error(`no object ${id}`);
  const rec = { blob, name: name || '', type: blob.type, at: Date.now(), promptId: promptId(promptFor(e)) };
  /* made before anything is saved: a picture that will not read changes nothing */
  const mul = S.sizes[id] || 1;
  const f = await keepPieces(await makePieces(e, blob, mul), mul);
  S.raw.set(id, rec);
  S.fin.set(id, f);
  await S.store.put('raw', id, rec);
  await S.store.put('fin', id, storedFin(f));
  return f;
}

async function removePicture(id) {
  S.raw.delete(id); S.fin.delete(id);
  await S.store.del('raw', id); await S.store.del('fin', id);
  if (S.stage.id === id) hideStage();
}

async function setSize(id, mul) {
  if (mul === 1) delete S.sizes[id]; else S.sizes[id] = mul;
  await S.store.put('misc', 'sizes', { ...S.sizes });
  if (S.raw.has(id)) await finish(id);
}

async function loadAll() {
  const sizes = await S.store.get('misc', 'sizes');
  if (sizes && typeof sizes === 'object') for (const [k, v] of Object.entries(sizes)) if (S.byId[k] && SIZES.includes(v)) S.sizes[k] = v;
  const keys = await S.store.keys('raw');
  let n = 0;
  for (const id of keys) {
    if (!S.byId[id]) continue;
    const rec = await S.store.get('raw', id);
    if (!rec || !rec.blob) continue;
    S.raw.set(id, rec);
    const f = await S.store.get('fin', id);
    const mul = S.sizes[id] || 1;
    if (f && f.made === MADE && f.size === mul && Array.isArray(f.pieces) && f.pieces.length) {
      const pieces = [];
      for (const p of f.pieces) {
        const c = await blobToCanvas(p.png, 4096);
        pieces.push({ png: p.png, w: p.w, h: p.h, thumb: thumbOf(c) });
        release(c);
      }
      S.fin.set(id, { ...f, pieces });
    } else {
      $('status').textContent = `Making your objects again with this version, once: ${++n}…`;
      try { await finish(id); } catch (err) { S.fin.delete(id); }
    }
  }
}

async function loadStyleKey() {
  try {
    const wb = await openStore('brotown-world-builder');
    const rec = await wb.get('misc', 'styleKey');
    wb.close();
    if (!rec || !rec.blob) return;
    S.key = { blob: rec.blob, ext: rec.ext || 'png', url: URL.createObjectURL(rec.blob) };
  } catch (e) { S.key = null; }
}

/* ═══ the stage: the object on its land's ground, next to the bro, as big
   as it will be on a phone ═══ */

/* the land's ground, from the game's own swatches (public/world/ground) */
async function groundImg(id) {
  if (!id) return null;
  if (!(id in S.ground.imgs)) {
    S.ground.imgs[id] = new Promise((res) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => res(null);
      im.src = `/world/ground/${id}-A.png${S.ground.made ? `?v=${encodeURIComponent(S.ground.made)}` : ''}`;
    });
  }
  return S.ground.imgs[id];
}

async function showStage(id) {
  const e = S.byId[id], f = S.fin.get(id);
  if (!e || !f) return;
  const card = S.cards[id];
  const slot = card && card.querySelector('[data-stage]');
  if (!slot) return;
  if (S.stage.id && S.stage.id !== id) hideStage();
  S.stage.id = id;
  const imgs = await Promise.all(f.pieces.map((p) => blobToCanvas(p.png, 4096)));
  const ground = await groundImg(e.ground);
  /* everything in game px, drawn at PX picture px a game px */
  const sp = S.sprites, bro = sp && sp.stand.south, bs = sp ? sp.standScale : 1;
  const broW = bro ? bro.fw * bs : 40, broH = bro ? (bro.bot - bro.top + 1) * bs : PIXEL.personGamePx;
  const M = 36, GAP = 28, building = e.kind === 'building';
  const ws = imgs.map((c) => c.width / PX), hs = imgs.map((c) => c.height / PX);
  const rowW = ws.reduce((s, w) => s + w, 0) + GAP * (ws.length - 1);
  const W = Math.ceil(building ? Math.max(rowW, broW) + 2 * M : M + broW + GAP + rowW + M);
  const tall = Math.max(broH, ...hs);
  const base = M + tall;                       /* where they stand */
  const H = Math.ceil(base + (building ? 70 : 44));
  const cv = S.stage.cv || (S.stage.cv = el('canvas'));
  cv.width = W * PX; cv.height = H * PX;
  const g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;
  if (ground) for (let y = 0; y < cv.height; y += ground.height) for (let x = 0; x < cv.width; x += ground.width) g.drawImage(ground, x, y);
  else { g.fillStyle = '#5d6b4a'; g.fillRect(0, 0, cv.width, cv.height); }
  let x = building ? (W - rowW) / 2 : M + broW + GAP;
  imgs.forEach((c, i) => { g.drawImage(c, Math.round(x * PX), Math.round((base - hs[i]) * PX)); x += ws[i] + GAP; });
  /* the bro: beside a set, or at a building's steps, just in front */
  if (bro) {
    const fx = building ? W / 2 : M + broW / 2, fy = building ? base + 26 : base;
    g.drawImage(bro.c, 0, 0, bro.fw, bro.c.height,
      Math.round((fx - (bro.fw * bs) / 2) * PX), Math.round((fy - (bro.bot + 1) * bs) * PX), Math.round(bro.fw * bs * PX), Math.round(bro.c.height * bs * PX));
  }
  for (const c of imgs) release(c);
  cv.style.width = `${Math.round(W * PHONE)}px`;
  cv.style.height = `${Math.round(H * PHONE)}px`;
  cv.dataset.stageCanvas = id;
  /* its group opened, so the stage is on screen */
  const group = card.closest('details');
  if (group) group.open = true;
  slot.textContent = '';
  slot.hidden = false;
  const wrap = el('div', 'stage-wrap');
  wrap.appendChild(cv);
  slot.appendChild(wrap);
  const fits = W * PHONE <= wrap.clientWidth + 1;
  slot.appendChild(el('div', 'stage-cap', `As big as on your phone held upright${fits ? '' : ' (swipe sideways to see it all)'}${ground ? `, on ${groundName(e.ground)}` : ''}. Your bro is the size check.`));
  S.stage.draws++;
}
function hideStage() {
  const id = S.stage.id;
  S.stage.id = null;
  const card = id && S.cards[id];
  const slot = card && card.querySelector('[data-stage]');
  if (slot) { slot.textContent = ''; slot.hidden = true; }
  if (S.stage.cv) { S.stage.cv.width = S.stage.cv.height = 1; }
}
const GROUND_NAMES = { commons: 'the commons grass', 'town-yard': "the town's yards", street: 'Main Street', plaza: 'the town square', road: 'the road' };
function groundName(id) { return GROUND_NAMES[id] || 'its ground'; }

/* ═══ the cards ═══ */

/* where a building's plot is, in words (plan.js town.lots) */
function plotOf(id) {
  const T = PLAN.town;
  if (T.hallLot && T.hallLot.id === id) return 'In the middle of the town square.';
  const ARM = { north: 'the north end', south: 'the south end', west: 'the west end', east: 'the east end' };
  const STREET = { north: 'Main Street', south: 'Main Street', west: 'Market Row', east: 'Market Row' };
  for (const [arm, sides] of Object.entries(T.lots)) {
    for (const [side, lots] of Object.entries(sides)) {
      const i = lots.findIndex((l) => l.id === id);
      if (i >= 0) return `At ${ARM[arm]} of town, on the ${side} side of ${STREET[arm]}, ${i === 0 ? 'nearer the square' : 'nearer the gate'}.`;
    }
  }
  return '';
}

function whereLine(e) {
  const size = sizeWords(e);
  if (e.kind === 'building') return `${plotOf(e.id)} The building is ${size}.`;
  return `${e.count === 1 ? 'One' : `${e.count} different ones`} in one picture, each ${size}.`;
}

function pixelNote(f, e) {
  const notes = [];
  if (f.flat < FLAT_MIN) notes.push({ warn: true, text: `The background is not one flat colour, so it could not be cut out cleanly. Ask for it on one flat ${e.key === 'green' ? 'bright green' : 'magenta'} background, with nothing else in the picture.` });
  if (f.found < e.count) notes.push({ warn: true, text: `Found ${f.found} of ${e.count}. Two that touch count as one: ask for them "side by side, not touching, with space between".` });
  if (f.ratio < PIXELS_OK[0]) notes.push({ warn: true, text: `ChatGPT drew it about ${(1 / f.ratio).toFixed(1)} times too big for the picture, so it was shrunk more than the ground is and its pixels are finer than the ground's. It still works; for a closer match, ask for it smaller in the picture.` });
  else if (f.ratio > PIXELS_OK[1]) notes.push({ warn: true, text: `ChatGPT drew it small in the picture, so it was made ${f.ratio.toFixed(1)} times bigger and its pixels are bigger than the ground's. Ask for it bigger, filling more of the picture.` });
  else notes.push({ warn: false, text: `Its pixels match the ground's. ${f.colours} colours of its own.` });
  return notes;
}

function renderCard(e) {
  const box = S.cards[e.id];
  box.textContent = '';
  const f = S.fin.get(e.id), raw = S.raw.get(e.id);
  const head = el('div', 'ob-head');
  const name = el('span', 'ob-name', e.name);
  const chip = el('span', f ? 'chip ok' : 'chip', f ? (e.count > 1 ? `${f.pieces.length} made` : 'made') : 'not made');
  chip.dataset.chip = e.id;
  name.appendChild(chip);
  head.appendChild(name);
  box.appendChild(head);
  box.appendChild(el('div', 'ob-where', whereLine(e)));
  if (e.key === 'green') box.appendChild(el('div', 'ob-where', 'Drawn on a green background, not magenta: it is pink or purple itself.'));
  if (raw && raw.promptId && raw.promptId !== promptId(promptFor(e))) {
    const note = el('div', 'ob-note warn', 'Made from an older prompt. Make it again with the prompt below whenever you like.');
    note.dataset.stale = e.id;
    box.appendChild(note);
  }
  const det = el('details');
  det.appendChild(el('summary', null, 'The prompt'));
  const ta = el('textarea');
  ta.readOnly = true; ta.value = promptFor(e); ta.dataset.prompt = e.id;
  det.appendChild(ta);
  box.appendChild(det);
  const row = el('div', 'row');
  const copyBtn = el('button', null, 'Copy prompt');
  copyBtn.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(ta.value); toast('Prompt copied. Attach the style key in the chat.'); }
    catch (err) { det.open = true; ta.select(); toast('Select the prompt and copy it.'); }
  });
  row.appendChild(copyBtn);
  const lab = el('label', f ? 'btn' : 'btn brass', f ? 'Replace…' : 'Add picture');
  const inp = el('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.dataset.file = e.id;
  inp.addEventListener('change', async () => {
    const file = inp.files && inp.files[0];
    inp.value = '';
    if (!file) return;
    try {
      await busy('Cutting it out and sizing it for the game…', () => addPicture(e.id, file, file.name));
      renderCard(e); renderCounts(); renderSaved();
      await showStage(e.id);
      toast(`${e.name} is in. It is shown at game size below its picture.`);
    } catch (err) { toast(`That picture could not be used: ${err.message || err}`, true); }
  });
  lab.appendChild(inp);
  row.appendChild(lab);
  box.appendChild(row);
  if (!f) return;
  const strip = el('div', 'ob-strip');
  for (const p of f.pieces) { p.thumb.dataset.piece = e.id; strip.appendChild(p.thumb); }
  box.appendChild(strip);
  for (const n of pixelNote(f, e)) {
    const p = el('div', n.warn ? 'ob-note warn' : 'ob-note mut', n.text);
    if (n.warn) p.dataset.warn = e.id;
    box.appendChild(p);
  }
  const r2 = el('div', 'row');
  const see = el('button', 'brass', 'See it at game size');
  see.dataset.see = e.id;
  see.addEventListener('click', () => (S.stage.id === e.id ? hideStage() : showStage(e.id)));
  r2.appendChild(see);
  const sel = el('select');
  sel.setAttribute('aria-label', 'Size in the game');
  sel.dataset.size = e.id;
  for (const m of SIZES) { const o = el('option', null, m === 1 ? 'Size: as planned' : `Size: ${Math.round(m * 100)}%`); o.value = String(m); sel.appendChild(o); }
  sel.value = String(S.sizes[e.id] || 1);
  sel.addEventListener('change', async () => {
    const m = Number(sel.value);
    await busy('Sizing it again…', () => setSize(e.id, m));
    const shown = S.stage.id === e.id;
    renderCard(e);
    if (shown) await showStage(e.id);
  });
  r2.appendChild(sel);
  const rm = el('button', 'danger', 'Remove');
  rm.dataset.remove = e.id;
  rm.addEventListener('click', async () => { await busy('Removing…', () => removePicture(e.id)); renderCard(e); renderCounts(); renderSaved(); });
  r2.appendChild(rm);
  box.appendChild(r2);
  const slot = el('div');
  slot.dataset.stage = e.id;
  slot.hidden = true;
  box.appendChild(slot);
}

function renderGroups() {
  const root = $('groups');
  root.textContent = '';
  for (const gr of GROUPS) {
    const list = S.cat.filter((e) => e.group === gr.id);
    if (!list.length) continue;
    const det = el('details', 'group');
    det.dataset.group = gr.id;
    if (gr.id === 'buildings') det.open = true;
    const sum = el('summary', null, gr.name);
    const chip = el('span', 'chip');
    chip.dataset.groupCount = gr.id;
    sum.appendChild(chip);
    det.appendChild(sum);
    for (const e of list) {
      const box = el('div', 'ob');
      box.id = `ob-${e.id}`;
      S.cards[e.id] = box;
      det.appendChild(box);
      renderCard(e);
    }
    root.appendChild(det);
  }
  renderCounts();
}

function renderCounts() {
  let total = 0;
  for (const gr of GROUPS) {
    const list = S.cat.filter((e) => e.group === gr.id);
    const n = list.filter((e) => S.fin.has(e.id)).length;
    total += n;
    const chip = document.querySelector(`[data-group-count="${gr.id}"]`);
    if (chip) { chip.textContent = `${n} of ${list.length}`; chip.className = n ? 'chip ok' : 'chip'; }
  }
  $('count').textContent = `${total} of ${S.cat.length} made`;
  $('count').className = total ? 'chip ok' : 'chip';
}

function renderSaved() {
  const names = S.cat.filter((e) => S.fin.has(e.id)).map((e) => e.name);
  let last = 0;
  for (const r of S.raw.values()) if (r && r.at > last) last = r.at;
  const chip = $('saved-chip'), line = $('saved-line'), list = $('saved-list'), when = $('saved-when');
  chip.textContent = names.length ? `${names.length} saved` : 'none yet';
  chip.className = names.length ? 'chip ok' : 'chip';
  list.textContent = '';
  list.hidden = !names.length;
  when.hidden = !(names.length && last);
  if (!names.length) {
    line.textContent = 'Nothing is saved in this browser yet. If you made objects before, they are in the other browser (see below).';
    return;
  }
  line.textContent = `${names.length === 1 ? 'This object is' : `These ${names.length} objects are`} saved here:`;
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
async function keepStorage() {
  try {
    if (!navigator.storage || !navigator.storage.persist) return;
    const kept = (await navigator.storage.persisted()) || (await navigator.storage.persist());
    if (kept) { $('saved-keep').textContent = 'This browser has agreed to keep them, even when the phone is short of space.'; $('saved-keep').hidden = false; }
  } catch (e) { /* not offered here */ }
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

/* ═══ saving: the backup, and the game's zip ═══ */

async function pixelsOfBlob(blob) {
  const c = await blobToCanvas(blob, 4096);
  const data = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height).data;
  const out = { data, w: c.width, h: c.height };
  release(c);
  return out;
}

/* `small`: each piece as palette numbers with number 0 see-through
   (world/core/png8.js), about half the bytes; the full-colour PNG when
   that cannot be (never a wrong picture) */
async function exportFiles({ originals = true, small = false } = {}) {
  const files = [], made = [];
  for (const e of S.cat) {
    const f = S.fin.get(e.id), raw = S.raw.get(e.id);
    if (!f || !raw) continue;
    const pieces = [];
    for (let i = 0; i < f.pieces.length; i++) {
      const p = f.pieces[i], file = `${e.id}-${i + 1}.png`;
      let data = null;
      if (small) { const px = await pixelsOfBlob(p.png); data = await encodePalettePng(px.data, px.w, px.h, { clear: true }); }
      if (!data) data = new Uint8Array(await p.png.arrayBuffer());
      files.push({ name: `objects/${file}`, data });
      /* `foot`: where it touches the ground, in its own px -- the middle of
         its bottom row, until the placing round gives each a footprint */
      pieces.push({ file, w: p.w, h: p.h, gameW: p.w * GPA, gameH: p.h * GPA, foot: [Math.round(p.w / 2), p.h] });
    }
    if (originals) files.push({ name: `originals/${e.id}.${extOf(raw.name, raw.blob.type)}`, data: new Uint8Array(await raw.blob.arrayBuffer()) });
    made.push({
      id: e.id, name: e.name, group: e.group, kind: e.kind, count: e.count, fit: e.fit, size: e.size,
      sizeMul: f.size, pixelRatio: Math.round(f.ratio * 100) / 100, madeFrom: raw.promptId || null, pieces,
    });
  }
  const manifest = {
    tool: 'brotown-object-studio', version: 1, made: new Date().toISOString(),
    plan: { id: PLAN.id, version: PLAN.version },
    gamePxPerArtPx: GPA, ownColours: OWN, objects: made,
  };
  return { files, manifest, enc: new TextEncoder() };
}

async function exportZip() {
  const { files, manifest, enc } = await exportFiles();
  files.unshift({ name: 'manifest.json', data: enc.encode(JSON.stringify(manifest, null, 1)) });
  return zipStore(files);
}

/* the zips for GitHub: only what the game reads, each under GAME_PART
   (GitHub's website takes files of up to 25 MB), each with the manifest */
const GAME_PART = 24e6;
async function exportGameZips(limit = GAME_PART) {
  const { files, manifest, enc } = await exportFiles({ originals: false, small: true });
  const head = (n, of) => enc.encode(JSON.stringify({ ...manifest, forGame: true, part: n, parts: of }, null, 1));
  const room = limit - head(99, 99).length - 4096;
  const groups = [[]];
  let size = 0;
  for (const f of files) {
    const cost = f.data.length + 2 * f.name.length + 80;
    if (size + cost > room && groups[groups.length - 1].length) { groups.push([]); size = 0; }
    groups[groups.length - 1].push(f);
    size += cost;
  }
  return groups.map((g, i) => ({ part: i + 1, parts: groups.length, bytes: zipStore([{ name: 'manifest.json', data: head(i + 1, groups.length) }, ...g]) }));
}

async function restoreZip(bytes) {
  const entries = await unzip(bytes);
  const byName = new Map(entries.map((f) => [f.name, f]));
  const mf = byName.get('manifest.json');
  const manifest = mf ? JSON.parse(new TextDecoder().decode(mf.data)) : null;
  const info = Object.create(null);
  for (const o of (manifest && manifest.objects) || []) if (o && typeof o.id === 'string') info[o.id] = o;
  let n = 0;
  for (const f of entries) {
    const m = /^originals\/([a-z0-9-]+)\.([a-z0-9]+)$/i.exec(f.name);
    if (!m || !S.byId[m[1]]) continue;
    const id = m[1], o = info[id];
    if (o && SIZES.includes(o.sizeMul) && o.sizeMul !== 1) S.sizes[id] = o.sizeMul; else delete S.sizes[id];
    const blob = new Blob([f.data], { type: mimeOf(m[2].toLowerCase()) });
    const rec = { blob, name: f.name.split('/').pop(), type: blob.type, at: Date.now(), promptId: (o && o.madeFrom) || null };
    S.raw.set(id, rec);
    await S.store.put('raw', id, rec);
    await finish(id);
    n++;
  }
  await S.store.put('misc', 'sizes', { ...S.sizes });
  return n;
}

function stamp() {
  const d = new Date(), p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

function wireSave() {
  $('export').addEventListener('click', async () => {
    const bytes = await busy('Packing the zip…', exportZip);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([bytes], { type: 'application/zip' }));
    a.download = `brotown-objects-${stamp()}.zip`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    toast('Downloaded. Keep it safe as your backup (iCloud or Google Drive).');
  });
  $('export-game').addEventListener('click', async () => {
    if (!S.fin.size) { toast('Make an object first.', true); return; }
    const zips = await busy('Packing the game\'s zip…', () => exportGameZips());
    const box = $('game-parts');
    for (const a of box.querySelectorAll('a')) URL.revokeObjectURL(a.href);
    box.textContent = '';
    const at = stamp();
    for (const z of zips) {
      const a = el('a', 'btn brass', `Save part ${z.part} of ${z.parts} (${(z.bytes.length / 1e6).toFixed(1)} MB)`);
      a.href = URL.createObjectURL(new Blob([z.bytes], { type: 'application/zip' }));
      a.download = `brotown-objects-game-${at}-part${z.part}of${z.parts}.zip`;
      a.dataset.part = String(z.part);
      box.appendChild(a);
    }
    box.hidden = false;
    toast(zips.length > 1 ? `Ready in ${zips.length} parts: tap each to save it, then upload them all to GitHub.` : 'Ready: tap it to save it, then upload it to GitHub.');
  });
  $('restore').addEventListener('change', async (ev) => {
    const f = ev.target.files && ev.target.files[0];
    ev.target.value = '';
    if (!f) return;
    try {
      const n = await busy('Restoring…', async () => restoreZip(new Uint8Array(await f.arrayBuffer())));
      hideStage();
      for (const e of S.cat) renderCard(e);
      renderCounts(); renderSaved();
      toast(n ? `Restored ${n} object${n === 1 ? '' : 's'}.` : 'Nothing to restore in that zip: it needs the backup from Download all.', !n);
    } catch (err) { toast(`That zip could not be restored: ${err.message || err}`, true); }
  });
}

/* ── start ── */

async function start() {
  await nextFrame();
  S.cat = objectCatalog();
  for (const e of S.cat) S.byId[e.id] = e;
  S.store = await openStore(DB, STORES);
  keepStorage();
  await loadStyleKey();
  try {
    const r = await fetch(`/world/ground/manifest.json?t=${Date.now()}`);
    if (r.ok) S.ground.made = (await r.json()).made || '';
  } catch (e) { /* the stage falls back to a plain colour */ }
  $('status').textContent = 'Loading your objects…';
  await loadAll();
  try { S.sprites = await loadSprites(); } catch (e) { S.sprites = null; }
  renderKey();
  renderGroups();
  renderSaved();
  wireSave();
  $('status').textContent = `${S.cat.length} objects, ${S.cat.filter((e) => e.kind === 'building').length} of them buildings.`;
}

S.ready = start().catch((e) => { $('status').textContent = `Something went wrong: ${e.message || e}`; throw e; });

window.__objects = {
  S,
  api: { addPicture, removePicture, setSize, showStage, hideStage, exportZip, exportGameZips, restoreZip, promptFor, makePieces, promptId },
};
